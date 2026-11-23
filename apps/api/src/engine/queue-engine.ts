import { repository } from '../db/repository';
import { websocketHub } from '../websocket/hub';
import { notificationService } from '../notifications/whatsapp';
import { calculateWaitTimes } from './wait-time';
import { selectNextTicketCandidate } from './routing';
import { validateTicketTransition } from './state-machine';
import { jobQueue } from '../worker/job-queue';
import { registerNotificationHandler } from '../worker/handlers/notification.handler';
import type { QueueTicket, TicketSource, PaymentStatus, Appointment } from './types';

// Ensure standard background workers are registered
registerNotificationHandler();

// Per-salon recalculation coalescer to prevent concurrent race conditions & DB write spikes
const inFlightRecalculations = new Map<string, Promise<QueueTicket[]>>();
const pendingRecalculations = new Map<
  string,
  {
    promise: Promise<QueueTicket[]>;
    resolve: (v: QueueTicket[]) => void;
    reject: (err: any) => void;
  }
>();

export const queueEngine = {
  // 1. Customer Self-Check-in via Door QR
  async checkIn(params: {
    salonSlug: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    addOnIds?: string[];
    stylistId?: string | null;
    source?: TicketSource;
    couponCode?: string;
  }): Promise<QueueTicket> {
    const salon = await repository.getSalonBySlug(params.salonSlug);
    if (!salon) throw new Error('Salon not found');

    const service = salon.services.find((s) => s.id === params.serviceId);
    if (!service) throw new Error('Selected service not found');

    // Check if assigned stylist has service duration overrides
    let stylistOverrides: Record<string, number> = {};
    if (params.stylistId) {
      try {
        stylistOverrides = await repository.getStylistServiceDurations(params.stylistId);
      } catch (err) {
        console.warn('[QueueEngine] Failed to load stylist overrides:', err);
      }
    }

    const baseDuration = (params.stylistId && stylistOverrides[service.id])
      ? stylistOverrides[service.id]
      : service.estimatedDurationMinutes;

    // Resolve add-ons
    const selectedAddOns = (params.addOnIds || [])
      .map((id) => salon.services.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({
        id: s.id,
        name: s.name,
        price: s.basePrice,
        durationMinutes: (params.stylistId && stylistOverrides[s.id])
          ? stylistOverrides[s.id]
          : s.estimatedDurationMinutes,
      }));

    const totalPrice = service.basePrice + selectedAddOns.reduce((sum, a) => sum + a.price, 0);
    const totalDurationMinutes = baseDuration + selectedAddOns.reduce((sum, a) => sum + a.durationMinutes, 0);

    // Optional Coupon Validation during Queue Check-in
    let couponCode: string | null = null;
    let couponDiscount = 0;
    let couponId: string | null = null;
    let couponDiscountType: any = null;
    let couponDiscountValue: number | null = null;
    let couponMaxDiscount: number | null = null;

    if (params.couponCode && params.couponCode.trim()) {
      try {
        const { couponService } = await import('../coupon/coupon.service');
        const couponResult = await couponService.validateAndApplyCoupon({
          code: params.couponCode.trim(),
          targetType: 'SALON_SERVICE',
          orderAmount: totalPrice,
          salonId: salon.id,
          userId: params.customerPhone ? params.customerPhone.trim() : undefined,
        });

        if (couponResult.valid && couponResult.coupon) {
          couponCode = couponResult.coupon.code;
          couponDiscount = couponResult.discountAmount;
          couponId = couponResult.coupon.id;
          couponDiscountType = couponResult.coupon.discountType;
          couponDiscountValue = couponResult.coupon.discountValue;
          couponMaxDiscount = couponResult.coupon.maxDiscountAmount ?? null;
        } else {
          throw new Error(couponResult.message || 'Invalid coupon code for this salon.');
        }
      } catch (err: any) {
        throw new Error(err.message || 'Failed to apply coupon.');
      }
    }

    const ticketNumber = await repository.getNextTicketNumber(salon.id);
    const ticketId = 'tkt-' + Math.random().toString(36).substring(2, 9);

    const ticket: QueueTicket = {
      id: ticketId,
      salonId: salon.id,
      stylistId: params.stylistId || null,
      ticketNumber,
      customerName: params.customerName.trim(),
      customerPhone: params.customerPhone.trim(),
      serviceId: service.id,
      serviceName: service.name,
      selectedAddOns,
      totalPrice,
      totalDurationMinutes,
      status: 'WAITING',
      source: params.source || 'QR_SCAN',
      estimatedWaitMinutes: 0,
      checkInTime: new Date().toISOString(),
      paymentStatus: 'PENDING',
      positionInQueue: 1,
      couponCode,
      couponDiscount,
      couponId,
      couponDiscountType,
      couponDiscountValue,
      couponMaxDiscount,
    };

    try {
      await repository.createTicket(ticket);
    } catch (err: any) {
      console.error('[QueueEngine] Failed to persist checkIn ticket to database:', err);
      throw new Error(`Failed to create queue ticket: ${err.message || 'Database error'}`);
    }

    // Recalculate wait times (serialized and batch-updated)
    const activeTickets = await this.recalculateQueue(salon.id);

    // Retrieve updated ticket with calculated wait time directly from activeTickets
    const updatedTicket = activeTickets.find((t) => t.id === ticketId) || ticket;

    // Asynchronously dispatch WhatsApp confirmation via background worker if real phone provided
    const digitsOnly = (updatedTicket.customerPhone || '').replace(/[^0-9]/g, '');
    const isRealPhone = digitsOnly.length >= 10 && !/^0+$/.test(digitsOnly) && digitsOnly !== '9876500000' && digitsOnly !== '919876500000';
    if (isRealPhone) {
      jobQueue.enqueue(
        'SEND_WHATSAPP',
        {
          salonId: salon.id,
          salonName: salon.name,
          ticketId: updatedTicket.id,
          recipientPhone: updatedTicket.customerPhone,
          recipientName: updatedTicket.customerName,
          type: 'TICKET_CONFIRMATION',
          ticketNumber: updatedTicket.ticketNumber,
          estimatedWaitMinutes: updatedTicket.estimatedWaitMinutes,
        },
        { salonId: salon.id }
      ).then(() => jobQueue.processNextJob().catch(() => {}));
    }

    websocketHub.broadcastToSalon(salon.id, {
      type: 'TICKET_CREATED',
      salonId: salon.id,
      ticket: updatedTicket,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return updatedTicket;
  },

  // 2. 1-Tap Barber Quick-Add (Zero-Tech Walk-in)
  async barberQuickAdd(params: {
    salonSlug: string;
    customerName: string;
    customerPhone?: string;
    serviceId?: string;
  }): Promise<QueueTicket> {
    const salon = await repository.getSalonBySlug(params.salonSlug);
    if (!salon) throw new Error('Salon not found');

    const defaultService = params.serviceId 
      ? salon.services.find((s) => s.id === params.serviceId) || salon.services[0]
      : salon.services[0];

    return this.checkIn({
      salonSlug: params.salonSlug,
      customerName: params.customerName || 'Walk-in Client',
      customerPhone: params.customerPhone || '',
      serviceId: defaultService.id,
      source: 'BARBER_QUICK_ADD',
    });
  },

  // 3. Barber 1-Tap [CALL NEXT]
  async callNext(
    salonId: string,
    stylistId?: string,
    options?: { excludeTicketId?: string; preferWaiting?: boolean } | string
  ): Promise<QueueTicket | null> {
    const excludeTicketId = typeof options === 'string' ? options : options?.excludeTicketId;
    const preferWaiting = typeof options === 'object' ? options?.preferWaiting : false;

    const rawActive = await repository.getActiveTickets(salonId);
    const activeTickets = excludeTicketId ? rawActive.filter((t) => t.id !== excludeTicketId) : rawActive;
    
    const nextTicket = selectNextTicketCandidate(rawActive, stylistId, {
      excludeTicketId,
      preferWaiting,
    });

    if (!nextTicket) return null;

    const salon = await repository.getSalonById(salonId);
    const assignedStylistId = stylistId || nextTicket.stylistId || (salon?.stylists && salon.stylists.length === 1 ? salon.stylists[0]?.id : undefined);
    const stylist = assignedStylistId ? salon?.stylists.find((s) => s.id === assignedStylistId) : undefined;

    // If chair already had another SUMMONED ticket, gracefully soft-bump it to avoid stranded states
    // Strictly isolate per chair/stylist: NEVER soft-bump another stylist's summoned ticket!
    const currentlySummoned = rawActive.filter(
      (t) =>
        (t.status === 'SUMMONED' || t.status === 'CALLED') &&
        t.id !== nextTicket!.id &&
        (assignedStylistId
          ? t.stylistId === assignedStylistId
          : (!salon?.stylists || salon.stylists.length <= 1))
    );
    for (const prev of currentlySummoned) {
      await repository.updateTicketStatus(prev.id, 'SOFT_BUMPED');
    }

    const finalStylistId = stylistId || nextTicket.stylistId || assignedStylistId;
    const updated = await repository.updateTicketStatus(nextTicket.id, 'SUMMONED', {
      stylistId: finalStylistId,
      summonedTime: new Date().toISOString(),
    });

    if (!updated) return null;

    // Asynchronously dispatch WhatsApp Chair Ready Alert
    if (salon) {
      jobQueue.enqueue(
        'SEND_WHATSAPP',
        {
          salonId: salon.id,
          salonName: salon.name,
          ticketId: updated.id,
          recipientPhone: updated.customerPhone,
          recipientName: updated.customerName,
          type: 'CHAIR_READY',
          ticketNumber: updated.ticketNumber,
          stylistName: stylist?.name,
        },
        { salonId: salon.id }
      ).then(() => jobQueue.processNextJob().catch(() => {}));
    }

    const activeRemaining = await this.recalculateQueue(salonId);

    websocketHub.broadcastToSalon(salonId, {
      type: 'TICKET_SUMMONED',
      salonId,
      ticket: updated,
      activeQueueCount: activeRemaining.length,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },

  // 4. Seated in chair
  async seatCustomer(ticketId: string, stylistId?: string): Promise<QueueTicket | null> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) return null;

    const validation = validateTicketTransition(ticket, 'IN_CHAIR');
    if (!validation.allowed) {
      throw new Error(validation.reason || `Cannot transition ticket from ${ticket.status} to IN_CHAIR`);
    }

    const salon = await repository.getSalonById(ticket.salonId);
    let resolvedStylistId: string | undefined = undefined;

    // Strict Stylist Validation & Chair Binding:
    // 1. If explicit stylistId passed, verify it strictly belongs to THIS salon
    if (stylistId && salon?.stylists?.some((s) => s.id === stylistId)) {
      resolvedStylistId = stylistId;
    } else if (ticket.stylistId && salon?.stylists?.some((s) => s.id === ticket.stylistId)) {
      // 2. Fall back to ticket's existing stylist preference if valid for this salon
      resolvedStylistId = ticket.stylistId;
    } else if (salon?.stylists && salon.stylists.length > 0) {
      // 3. Auto-bind to first active stylist of this salon (single or multi-chair)
      const activeStylist = salon.stylists.find((s) => s.isActive) || salon.stylists[0];
      resolvedStylistId = activeStylist.id;
    }

    const updated = await repository.updateTicketStatus(ticketId, 'IN_CHAIR', {
      stylistId: resolvedStylistId,
      startedTime: new Date().toISOString(),
    });

    if (!updated) return null;

    const activeTickets = await this.recalculateQueue(ticket.salonId);

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_SEATED',
      salonId: ticket.salonId,
      ticket: updated,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },

  // 5. Finished service & Payment
  async finishService(
    ticketId: string,
    paymentStatus: PaymentStatus = 'CASH_PAID',
    paymentAmount?: number,
    appliedCouponCode?: string,
    appliedCouponDiscount?: number
  ): Promise<QueueTicket | null> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) return null;

    const validation = validateTicketTransition(ticket, 'COMPLETED');
    if (!validation.allowed) {
      throw new Error(validation.reason || `Cannot transition ticket from ${ticket.status} to COMPLETED`);
    }

    // Resolve coupon: if staff applied a coupon at checkout or ticket already has one
    let couponCode = ticket.couponCode || null;
    let couponDiscount = ticket.couponDiscount || 0;
    let couponId = ticket.couponId || null;

    if (appliedCouponCode && appliedCouponCode.trim() && appliedCouponCode !== ticket.couponCode) {
      try {
        const { couponService } = await import('../coupon/coupon.service');
        const res = await couponService.validateAndApplyCoupon({
          code: appliedCouponCode.trim(),
          targetType: 'SALON_SERVICE',
          orderAmount: ticket.totalPrice,
          salonId: ticket.salonId,
          userId: ticket.customerPhone ? ticket.customerPhone.trim() : undefined,
        });
        if (res.valid && res.coupon) {
          couponCode = res.coupon.code;
          couponDiscount = res.discountAmount;
          couponId = res.coupon.id;
        } else {
          // Reject invalid coupon code
          throw new Error(res.message || 'Invalid coupon code applied at checkout');
        }
      } catch (err: any) {
        console.warn('[QueueEngine:finishService] Failed to validate checkout coupon:', err.message);
        throw err;
      }
    } else if (appliedCouponDiscount && !appliedCouponCode && !ticket.couponCode) {
      // Reject arbitrary discount injection without valid coupon code (DISC-01)
      throw new Error('Cannot apply arbitrary coupon discount without a valid verified coupon code.');
    }

    const amount = paymentAmount !== undefined ? paymentAmount : Math.max(0, ticket.totalPrice - couponDiscount);

    const updated = await repository.updateTicketStatus(ticketId, 'COMPLETED', {
      completedTime: new Date().toISOString(),
      paymentStatus,
      paymentAmount: amount,
      couponCode,
      couponDiscount,
      couponId,
    });

    if (!updated) return null;

    // Record redemption if coupon was applied
    if (couponId) {
      try {
        const { couponRepo } = await import('../db/repositories/coupon.repo');
        await couponRepo.recordRedemption({
          couponId,
          targetType: 'SALON_SERVICE',
          targetOrderId: ticket.id,
          userId: ticket.customerId || ticket.customerPhone,
          discountApplied: couponDiscount,
        });
      } catch (err) {
        console.warn('[QueueEngine:finishService] Failed to record coupon redemption:', err);
      }
    }

    // Burn loyalty milestone voucher if applied to this ticket
    if (couponCode) {
      try {
        const { loyaltyRepo } = await import('../db/repositories/loyalty.repo');
        await loyaltyRepo.redeemVoucher(couponCode, ticket.salonId, ticket.id);
      } catch (voucherErr: any) {
        console.warn('[QueueEngine:finishService] Loyalty voucher redeem check:', voucherErr?.message);
      }
    }

    // Award digital loyalty stamp and check milestone completion
    if (ticket.customerPhone) {
      try {
        const { loyaltyService } = await import('../loyalty/loyalty.service');
        await loyaltyService.awardStamp({
          salonId: ticket.salonId,
          customerPhone: ticket.customerPhone,
          customerName: ticket.customerName,
          ticketId: ticket.id,
          finalPrice: amount,
        });
      } catch (loyaltyErr: any) {
        console.warn('[QueueEngine:finishService] Loyalty stamp award warning:', loyaltyErr?.message);
      }
    }

    const activeTickets = await this.recalculateQueue(ticket.salonId);

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_COMPLETED',
      salonId: ticket.salonId,
      ticket: updated,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },

  // 6. 3-Minute Soft Bump (No-show grace protocol)
  async softBump(ticketId: string): Promise<QueueTicket | null> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) return null;

    const validation = validateTicketTransition(ticket, 'SOFT_BUMPED');
    if (!validation.allowed) {
      throw new Error(validation.reason || `Cannot transition ticket from ${ticket.status} to SOFT_BUMPED`);
    }

    const updated = await repository.updateTicketStatus(ticketId, 'SOFT_BUMPED');
    if (!updated) return null;

    const salon = await repository.getSalonById(ticket.salonId);
    if (salon) {
      jobQueue.enqueue(
        'SEND_WHATSAPP',
        {
          salonId: salon.id,
          salonName: salon.name,
          ticketId: updated.id,
          recipientPhone: updated.customerPhone,
          recipientName: updated.customerName,
          type: 'SOFT_BUMP_ALERT',
          ticketNumber: updated.ticketNumber,
        },
        { salonId: salon.id }
      ).then(() => jobQueue.processNextJob().catch(() => {}));
    }

    const activeTickets = await this.recalculateQueue(ticket.salonId);

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_SOFT_BUMPED',
      salonId: ticket.salonId,
      ticket: updated,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },

  // 6.1 Atomic Hold spot (soft-bump) & call next client
  async holdAndCallNext(params: {
    salonId: string;
    currentTicketId: string;
    stylistId?: string;
  }): Promise<{ bumpedTicket: QueueTicket | null; nextTicket: QueueTicket | null }> {
    const bumpedTicket = await this.softBump(params.currentTicketId);
    const nextTicket = await this.callNext(params.salonId, params.stylistId, {
      excludeTicketId: params.currentTicketId,
      preferWaiting: true,
    });
    return { bumpedTicket, nextTicket };
  },

  // 7. Summon specific ticket directly (Front Desk / Owner trigger)
  async summonTicket(ticketId: string, stylistId?: string): Promise<QueueTicket | null> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) return null;

    const salon = await repository.getSalonById(ticket.salonId);
    const assignedStylistId = stylistId || ticket.stylistId || salon?.stylists[0]?.id;
    const stylist = salon?.stylists.find((s) => s.id === assignedStylistId) || salon?.stylists[0];

    // Gracefully soft-bump any other ticket currently summoned for this chair/salon
    const active = await repository.getActiveTickets(ticket.salonId);
    const previouslySummoned = active.filter(
      (t) =>
        (t.status === 'SUMMONED' || t.status === 'CALLED') &&
        t.id !== ticketId &&
        (!stylist?.id || !t.stylistId || t.stylistId === stylist.id)
    );
    for (const prev of previouslySummoned) {
      await repository.updateTicketStatus(prev.id, 'SOFT_BUMPED');
    }

    const finalStylistId = stylist?.id || ticket.stylistId;
    const updated = await repository.updateTicketStatus(ticketId, 'SUMMONED', {
      stylistId: finalStylistId,
      summonedTime: new Date().toISOString(),
    });
    if (!updated) return null;

    if (salon) {
      await notificationService.sendWhatsApp({
        salonId: salon.id,
        salonName: salon.name,
        ticketId: updated.id,
        recipientPhone: updated.customerPhone,
        recipientName: updated.customerName,
        type: 'CHAIR_READY',
        ticketNumber: updated.ticketNumber,
        stylistName: stylist?.name,
      });
    }

    const activeTickets = await this.recalculateQueue(ticket.salonId);

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_SUMMONED',
      salonId: ticket.salonId,
      ticket: updated,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },

  // 8. Cancel ticket (Customer left / no-show / desk manual removal)
  async cancelTicket(ticketId: string, reason?: string, isStaffOrOwner: boolean = false): Promise<QueueTicket | null> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) return null;

    if (ticket.status === 'CANCELLED' || ticket.status === 'COMPLETED' || ticket.status === 'NO_SHOW') {
      return ticket;
    }

    if (!isStaffOrOwner && (ticket.status === 'IN_CHAIR' || ticket.status === 'IN_SERVICE')) {
      throw new Error('Cannot cancel ticket: Service is currently in progress in the chair. Please settle checkout with your barber.');
    }

    const updated = await repository.updateTicketStatus(ticketId, 'CANCELLED', {
      completedTime: new Date().toISOString(),
    });
    if (!updated) return null;

    const activeTickets = await this.recalculateQueue(ticket.salonId);

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_CANCELLED',
      salonId: ticket.salonId,
      ticket: updated,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },

  // 8.5 Switch Stylist Preference Mid-Queue (Strict FIFO Fairness Preserved)
  async switchStylistPreference(ticketId: string, stylistId: string | null): Promise<QueueTicket> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status !== 'WAITING' && ticket.status !== 'SOFT_BUMPED') {
      throw new Error(`Cannot change barber preference while ticket is in status: ${ticket.status}`);
    }

    // Validate stylistId if provided
    if (stylistId) {
      const salon = await repository.getSalonById(ticket.salonId);
      const stylistExists = salon?.stylists?.some((s) => s.id === stylistId);
      if (!stylistExists) {
        throw new Error('Selected barber does not exist in this salon');
      }
    }

    // Update stylistId in repository (MySQL & memory)
    const updated = await repository.updateTicketStylist(ticketId, stylistId);
    if (!updated) {
      throw new Error('Failed to update ticket stylist preference');
    }

    // Recalculate wait times and queue positions for the salon
    const activeTickets = await this.recalculateQueue(ticket.salonId);
    const refreshed = activeTickets.find((t) => t.id === ticketId) || updated;

    // Broadcast WebSocket update so live TV, station desks, and customer pocket tickets refresh immediately
    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_UPDATED',
      salonId: ticket.salonId,
      ticket: refreshed,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return refreshed;
  },

  // 8.55 Transfer Active, Summoned, or Waiting Ticket to Another Barber Chair
  async transferChair(params: {
    ticketId: string;
    targetStylistId: string;
    reason?: string;
  }): Promise<QueueTicket> {
    const { ticketId, targetStylistId, reason } = params;
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') {
      throw new Error(`Cannot transfer ticket with status: ${ticket.status}`);
    }

    const salon = await repository.getSalonById(ticket.salonId);
    const targetStylist = salon?.stylists?.find((s) => s.id === targetStylistId);
    if (!targetStylist) {
      throw new Error('Target barber chair does not exist in this salon');
    }

    // Append handover reason to ticket notes if provided
    if (reason && reason.trim()) {
      const handoverNote = `[Transferred to ${targetStylist.name}: ${reason.trim()}]`;
      const updatedNotes = ticket.notes ? `${ticket.notes}\n${handoverNote}` : handoverNote;
      await repository.updateTicketNotes(ticketId, { notes: updatedNotes });
    }

    // Reassign stylistId in repository (MySQL and memory)
    const updated = await repository.updateTicketStylist(ticketId, targetStylistId);
    if (!updated) {
      throw new Error('Failed to update ticket stylist for chair transfer');
    }

    // If ticket was in chair or summoned, ensure servedByStylistId is also aligned
    if (ticket.status === 'IN_CHAIR' || ticket.status === 'SUMMONED') {
      (updated as any).servedByStylistId = targetStylistId;
      await repository.updateTicketStatus(ticketId, ticket.status as any, {
        stylistId: targetStylistId,
      });
    }

    // Recalculate wait times and queue positions
    const activeTickets = await this.recalculateQueue(ticket.salonId);
    const refreshed = activeTickets.find((t) => t.id === ticketId) || updated;

    // Real-time WebSocket dispatch to all station desks, mirror TVs, and pocket trackers
    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_TRANSFERRED',
      salonId: ticket.salonId,
      ticket: refreshed,
      targetStylistId,
      targetStylistName: targetStylist.name,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'QUEUE_UPDATED',
      salonId: ticket.salonId,
      tickets: activeTickets,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return refreshed;
  },

  // 8.6 Pause Ticket (Customer steps out for chai/errand, or staff marks away)
  async pauseTicket(ticketId: string, reason?: string): Promise<QueueTicket> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status !== 'WAITING' && ticket.status !== 'SUMMONED' && ticket.status !== 'SOFT_BUMPED') {
      throw new Error(`Cannot pause ticket in status: ${ticket.status}`);
    }

    const updated = await repository.updateTicketStatus(ticketId, 'PAUSED');
    if (!updated) {
      throw new Error('Failed to update ticket status to PAUSED');
    }

    // Recalculate wait times (excluding this paused customer from blocking active lines)
    const activeTickets = await this.recalculateQueue(ticket.salonId);
    const refreshed = activeTickets.find((t) => t.id === ticketId) || updated;

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_PAUSED',
      salonId: ticket.salonId,
      ticket: refreshed,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return refreshed;
  },

  // 8.7 Resume Ticket (Customer returns from errand / reports back at salon)
  async resumeTicket(ticketId: string): Promise<QueueTicket> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status !== 'PAUSED') {
      throw new Error(`Ticket is not paused (status: ${ticket.status})`);
    }

    // Restore to WAITING so they are eligible for the next available chair with original arrival time
    const updated = await repository.updateTicketStatus(ticketId, 'WAITING');
    if (!updated) {
      throw new Error('Failed to restore ticket status to WAITING');
    }

    const activeTickets = await this.recalculateQueue(ticket.salonId);
    const refreshed = activeTickets.find((t) => t.id === ticketId) || updated;

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_RESUMED',
      salonId: ticket.salonId,
      ticket: refreshed,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return refreshed;
  },

  // 8.8 Mark No-Show (Barber / staff marks customer absent / walkout)
  async markNoShow(ticketId: string, reason?: string): Promise<QueueTicket> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const updated = await repository.updateTicketStatus(ticketId, 'NO_SHOW', {
      completedTime: new Date().toISOString(),
    });
    if (!updated) {
      throw new Error('Failed to mark ticket as NO_SHOW');
    }

    const activeTickets = await this.recalculateQueue(ticket.salonId);

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_CANCELLED',
      salonId: ticket.salonId,
      ticket: updated,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },

  // 8.9 Update Ticket Services & Add-Ons Mid-Queue (Self-Service Upsell & Recalculation)
  async updateTicketServices(
    ticketId: string,
    params: {
      addOnIds: string[];
      serviceId?: string;
    }
  ): Promise<QueueTicket> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const modifiableStatuses = [
      'WAITING',
      'SOFT_BUMPED',
      'PAUSED',
      'SUMMONED',
      'CALLED',
      'IN_CHAIR',
      'IN_SERVICE',
    ];
    if (!modifiableStatuses.includes(ticket.status)) {
      throw new Error(`Cannot modify services while ticket is in status: ${ticket.status}`);
    }

    const salon = await repository.getSalonById(ticket.salonId);
    if (!salon) {
      throw new Error('Salon not found');
    }

    const targetServiceId = params.serviceId || ticket.serviceId;
    const baseService = salon.services.find((s) => s.id === targetServiceId);
    if (!baseService) {
      throw new Error('Base service not found');
    }

    // Check if assigned stylist has service duration overrides
    let stylistOverrides: Record<string, number> = {};
    if (ticket.stylistId) {
      try {
        stylistOverrides = await repository.getStylistServiceDurations(ticket.stylistId);
      } catch (err) {
        console.warn('[QueueEngine] Failed to load stylist overrides:', err);
      }
    }

    const baseDuration = (ticket.stylistId && stylistOverrides[baseService.id])
      ? stylistOverrides[baseService.id]
      : baseService.estimatedDurationMinutes;

    // Resolve add-ons from salon catalog
    const selectedAddOns = (params.addOnIds || [])
      .map((id) => salon.services.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({
        id: s.id,
        name: s.name,
        price: s.basePrice,
        durationMinutes: (ticket.stylistId && stylistOverrides[s.id])
          ? stylistOverrides[s.id]
          : s.estimatedDurationMinutes,
      }));

    const totalPrice = baseService.basePrice + selectedAddOns.reduce((sum, a) => sum + a.price, 0);
    const totalDurationMinutes = baseDuration + selectedAddOns.reduce((sum, a) => sum + a.durationMinutes, 0);

    // Dynamic Coupon Recalculation on Service Mutation (Add or Remove Services)
    let couponDiscount = ticket.couponDiscount || 0;
    let couponDiscountType = ticket.couponDiscountType;
    let couponDiscountValue = ticket.couponDiscountValue;
    let couponMaxDiscount = ticket.couponMaxDiscount;

    if (ticket.couponCode) {
      try {
        const { couponService } = await import('../coupon/coupon.service');
        const recheck = await couponService.validateAndApplyCoupon({
          code: ticket.couponCode,
          targetType: 'SALON_SERVICE',
          orderAmount: totalPrice,
          salonId: ticket.salonId,
          userId: ticket.customerPhone ? ticket.customerPhone.trim() : undefined,
        });
        if (recheck.valid && recheck.coupon) {
          couponDiscount = recheck.discountAmount;
          couponDiscountType = recheck.coupon.discountType;
          couponDiscountValue = recheck.coupon.discountValue;
          couponMaxDiscount = recheck.coupon.maxDiscountAmount ?? null;
        } else {
          // If the new bill falls below minOrderAmount or is no longer valid, zero the discount
          couponDiscount = 0;
        }
      } catch (err) {
        console.warn('[QueueEngine:updateTicketServices] Coupon recalculation error:', err);
      }
    }

    const updated = await repository.updateTicketServices(ticketId, {
      serviceId: baseService.id,
      serviceName: baseService.name,
      selectedAddOns,
      totalPrice,
      totalDurationMinutes,
      couponDiscount,
      couponDiscountType,
      couponDiscountValue,
      couponMaxDiscount,
    });

    if (!updated) {
      throw new Error('Failed to update ticket services');
    }

    // Recalculate wait times for all downstream active clients in salon
    const activeTickets = await this.recalculateQueue(ticket.salonId);
    const refreshed = activeTickets.find((t) => t.id === ticketId) || updated;

    // Broadcast WebSocket update to station desk, waiting lounge TV, and customer pocket tickets
    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_UPDATED',
      salonId: ticket.salonId,
      ticket: refreshed,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return refreshed;
  },

  async updateTicketNotes(
    ticketId: string,
    params: {
      notes?: string | null;
      groomingTags?: string[];
    }
  ): Promise<QueueTicket> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const updated = await repository.updateTicketNotes(ticketId, params);
    if (!updated) {
      throw new Error('Failed to update ticket notes');
    }

    const activeTickets = await repository.getActiveTickets(ticket.salonId);
    const refreshed = activeTickets.find((t) => t.id === ticketId) || updated;

    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_UPDATED',
      salonId: ticket.salonId,
      ticket: refreshed,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return refreshed;
  },

  // 9. Recalculate dynamic wait times for all active tickets (coalesced & micro-batched per salon)
  async recalculateQueue(salonId: string): Promise<QueueTicket[]> {
    const inFlight = inFlightRecalculations.get(salonId);
    if (!inFlight) {
      const execution = this._executeRecalculateQueue(salonId).finally(() => {
        inFlightRecalculations.delete(salonId);
      });
      inFlightRecalculations.set(salonId, execution);
      return execution;
    }

    // A recalculation is already in-flight!
    // Check if a pending coalesced run is already queued
    const existingPending = pendingRecalculations.get(salonId);
    if (existingPending) {
      return existingPending.promise;
    }

    // Schedule a single coalesced pending run that executes after the in-flight run completes
    let resolvePending!: (v: QueueTicket[]) => void;
    let rejectPending!: (err: any) => void;
    const pendingPromise = new Promise<QueueTicket[]>((res, rej) => {
      resolvePending = res;
      rejectPending = rej;
    });

    pendingRecalculations.set(salonId, {
      promise: pendingPromise,
      resolve: resolvePending,
      reject: rejectPending,
    });

    inFlight
      .catch(() => [] as QueueTicket[])
      .then(async () => {
        pendingRecalculations.delete(salonId);
        try {
          const result = await this.recalculateQueue(salonId);
          resolvePending(result);
        } catch (err) {
          rejectPending(err);
        }
      });

    return pendingPromise;
  },

  async _executeRecalculateQueue(salonId: string): Promise<QueueTicket[]> {
    const salon = await repository.getSalonById(salonId);
    if (!salon) return [];

    // Automatically check and forfeit late appointments past 10m grace window without check-in
    await this.checkAppointmentGracePeriod(salonId, undefined, true);

    const activeTickets = await repository.getActiveTickets(salonId);

    // Fetch confirmed, checked-in, and in-chair appointments for today to interleave into wait times
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;

    let appointments: Appointment[] = [];
    try {
      appointments = await repository.getAppointments({
        salonId,
        scheduledDate: today,
        status: ['CONFIRMED', 'CHECKED_IN', 'IN_CHAIR'],
      });
    } catch (err) {
      console.warn('[QueueEngine] Failed to load appointments for recalculation:', err);
    }

    const calculations = calculateWaitTimes(activeTickets, salon.stylists, appointments, now);

    const updates: Array<{ id: string; estimatedWaitMinutes: number }> = [];

    for (const ticket of activeTickets) {
      const calc = calculations.get(ticket.id);
      if (calc) {
        ticket.estimatedWaitMinutes = calc.estimatedMinutes;
        ticket.positionInQueue = calc.position;
        updates.push({ id: ticket.id, estimatedWaitMinutes: calc.estimatedMinutes });
      }
    }

    if (updates.length > 0) {
      await repository.updateTicketWaitTimesBatch(updates);
    }

    return activeTickets;
  },

  // 10. Enforce 10-Minute Grace Window on Appointments:
  // If customer does not check in by slot_start_time + 10m, forfeit slot & auto-summon next walk-in ticket
  async checkAppointmentGracePeriod(
    salonId: string,
    testCurrentTime?: Date,
    skipRecalculate?: boolean
  ): Promise<{
    expiredAppointments: string[];
    autoSummonedTicket: QueueTicket | null;
  }> {
    const now = testCurrentTime || new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let appointments: Appointment[] = [];
    try {
      appointments = await repository.getAppointments({
        salonId,
        scheduledDate: today,
        status: 'CONFIRMED',
      });
    } catch {
      return { expiredAppointments: [], autoSummonedTicket: null };
    }

    const expired: string[] = [];
    let autoSummoned: QueueTicket | null = null;

    for (const appt of appointments) {
      const [startH, startM] = appt.slotStartTime.split(':').map((p) => parseInt(p, 10));
      const startMinutes = (startH || 0) * 60 + (startM || 0);

      // Customer > 10 minutes late without check-in
      if (nowMinutes > startMinutes + 10) {
        await repository.updateAppointment(appt.id, {
          status: 'NO_SHOW',
          escrowStatus: 'RELEASED_TO_OWNER',
        });
        expired.push(appt.id);

        // Auto-summon next walk-in ticket
        const salon = await repository.getSalonById(salonId);
        if (salon && !autoSummoned) {
          const activeTickets = await repository.getActiveTickets(salonId);
          const waitingTickets = activeTickets.filter(
            (t) => t.status === 'WAITING' || t.status === 'SOFT_BUMPED'
          );

          if (waitingTickets.length > 0) {
            const targetStylistId = appt.stylistId || salon.stylists.find((s) => s.isActive)?.id;
            if (targetStylistId) {
              const stylistBusy = activeTickets.find(
                (t) => t.stylistId === targetStylistId && (t.status === 'IN_CHAIR' || t.status === 'SUMMONED')
              );
              if (!stylistBusy) {
                const nextCandidate = selectNextTicketCandidate(waitingTickets, targetStylistId);
                if (nextCandidate) {
                  autoSummoned = await this.summonTicket(nextCandidate.id, targetStylistId);
                }
              }
            }
          }
        }
      }
    }

    if (!skipRecalculate && expired.length > 0) {
      await this.recalculateQueue(salonId);
    }

    return { expiredAppointments: expired, autoSummonedTicket: autoSummoned };
  },
};
