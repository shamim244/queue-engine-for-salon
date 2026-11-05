import { repository } from '../db/repository';
import { websocketHub } from '../websocket/hub';
import { notificationService } from '../notifications/whatsapp';
import { calculateWaitTimes } from './wait-time';
import { selectNextTicketCandidate } from './routing';
import { validateTicketTransition } from './state-machine';
import { jobQueue } from '../worker/job-queue';
import { registerNotificationHandler } from '../worker/handlers/notification.handler';
import type { QueueTicket, TicketSource, PaymentStatus } from './types';

// Ensure standard background workers are registered
registerNotificationHandler();

// Per-salon recalculation serializer to prevent concurrent race conditions
const recalculationQueues = new Map<string, Promise<QueueTicket[]>>();

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
  }): Promise<QueueTicket> {
    const salon = await repository.getSalonBySlug(params.salonSlug);
    if (!salon) throw new Error('Salon not found');

    const service = salon.services.find((s) => s.id === params.serviceId);
    if (!service) throw new Error('Selected service not found');

    // Resolve add-ons
    const selectedAddOns = (params.addOnIds || [])
      .map((id) => salon.services.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({
        id: s.id,
        name: s.name,
        price: s.basePrice,
        durationMinutes: s.estimatedDurationMinutes,
      }));

    const totalPrice = service.basePrice + selectedAddOns.reduce((sum, a) => sum + a.price, 0);
    const totalDurationMinutes = service.estimatedDurationMinutes + selectedAddOns.reduce((sum, a) => sum + a.durationMinutes, 0);

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

    // Asynchronously dispatch WhatsApp confirmation via background worker
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
      customerPhone: params.customerPhone || '0000000000',
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
    const assignedStylistId = stylistId || nextTicket.stylistId || salon?.stylists[0]?.id;
    const stylist = salon?.stylists.find((s) => s.id === assignedStylistId) || salon?.stylists[0];

    // If chair already had another SUMMONED ticket, gracefully soft-bump it to avoid stranded states
    const currentlySummoned = rawActive.filter(
      (t) =>
        (t.status === 'SUMMONED' || t.status === 'CALLED') &&
        t.id !== nextTicket!.id &&
        (!stylist?.id || !t.stylistId || t.stylistId === stylist.id)
    );
    for (const prev of currentlySummoned) {
      await repository.updateTicketStatus(prev.id, 'SOFT_BUMPED');
    }

    const finalStylistId = stylistId || nextTicket.stylistId || stylist?.id;
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

    const updated = await repository.updateTicketStatus(ticketId, 'IN_CHAIR', {
      stylistId: stylistId || ticket.stylistId || undefined,
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
    paymentAmount?: number
  ): Promise<QueueTicket | null> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) return null;

    const validation = validateTicketTransition(ticket, 'COMPLETED');
    if (!validation.allowed) {
      throw new Error(validation.reason || `Cannot transition ticket from ${ticket.status} to COMPLETED`);
    }

    const amount = paymentAmount !== undefined ? paymentAmount : ticket.totalPrice;

    const updated = await repository.updateTicketStatus(ticketId, 'COMPLETED', {
      completedTime: new Date().toISOString(),
      paymentStatus,
      paymentAmount: amount,
    });

    if (!updated) return null;

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

    const finalStylistId = stylistId || ticket.stylistId || stylist?.id;
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
  async cancelTicket(ticketId: string, reason?: string): Promise<QueueTicket | null> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) return null;

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

  // 9. Recalculate dynamic wait times for all active tickets (serialized per salon)
  async recalculateQueue(salonId: string): Promise<QueueTicket[]> {
    const previous = recalculationQueues.get(salonId) || Promise.resolve([] as QueueTicket[]);
    const current = previous
      .catch(() => [] as QueueTicket[])
      .then(async () => {
        return this._executeRecalculateQueue(salonId);
      });
    recalculationQueues.set(salonId, current);
    return current;
  },

  async _executeRecalculateQueue(salonId: string): Promise<QueueTicket[]> {
    const salon = await repository.getSalonById(salonId);
    if (!salon) return [];

    const activeTickets = await repository.getActiveTickets(salonId);
    const calculations = calculateWaitTimes(activeTickets, salon.stylists);

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
};
