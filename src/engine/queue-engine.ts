import { repository } from '../db/repository';
import { websocketHub } from '../websocket/hub';
import { notificationService } from '../notifications/whatsapp';
import { calculateWaitTimes } from './wait-time';
import type { QueueTicket, TicketSource, PaymentStatus } from './types';

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

    await repository.createTicket(ticket);

    // Recalculate wait times
    await this.recalculateQueue(salon.id);

    // Retrieve updated ticket with calculated wait time
    const updatedTicket = (await repository.getTicketById(ticketId)) || ticket;

    // Send WhatsApp confirmation
    await notificationService.sendWhatsApp({
      salonId: salon.id,
      salonName: salon.name,
      ticketId: updatedTicket.id,
      recipientPhone: updatedTicket.customerPhone,
      recipientName: updatedTicket.customerName,
      type: 'TICKET_CONFIRMATION',
      ticketNumber: updatedTicket.ticketNumber,
      estimatedWaitMinutes: updatedTicket.estimatedWaitMinutes,
    });

    const activeTickets = await repository.getActiveTickets(salon.id);
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
  async callNext(salonId: string, stylistId?: string): Promise<QueueTicket | null> {
    const activeTickets = await repository.getActiveTickets(salonId);
    
    // Priority: 1. SOFT_BUMPED clients returning, 2. WAITING clients in chronological order
    const nextTicket = activeTickets.find((t) => t.status === 'SOFT_BUMPED') ||
                       activeTickets.find((t) => t.status === 'WAITING');

    if (!nextTicket) return null;

    const salon = (await repository.getAllSalons()).find((s) => s.id === salonId);
    const stylist = salon?.stylists.find((s) => s.id === stylistId) || salon?.stylists[0];

    const updated = await repository.updateTicketStatus(nextTicket.id, 'SUMMONED', {
      stylistId: stylist?.id,
      summonedTime: new Date().toISOString(),
    });

    if (!updated) return null;

    // Send WhatsApp Chair Ready Alert
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

    await this.recalculateQueue(salonId);

    websocketHub.broadcastToSalon(salonId, {
      type: 'TICKET_SUMMONED',
      salonId,
      ticket: updated,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },

  // 4. Seated in chair
  async seatCustomer(ticketId: string, stylistId?: string): Promise<QueueTicket | null> {
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) return null;

    const updated = await repository.updateTicketStatus(ticketId, 'IN_CHAIR', {
      stylistId: stylistId || ticket.stylistId || undefined,
      startedTime: new Date().toISOString(),
    });

    if (!updated) return null;

    await this.recalculateQueue(ticket.salonId);

    const activeTickets = await repository.getActiveTickets(ticket.salonId);
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

    const amount = paymentAmount !== undefined ? paymentAmount : ticket.totalPrice;

    const updated = await repository.updateTicketStatus(ticketId, 'COMPLETED', {
      completedTime: new Date().toISOString(),
      paymentStatus,
      paymentAmount: amount,
    });

    if (!updated) return null;

    await this.recalculateQueue(ticket.salonId);

    const activeTickets = await repository.getActiveTickets(ticket.salonId);
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

    const updated = await repository.updateTicketStatus(ticketId, 'SOFT_BUMPED');
    if (!updated) return null;

    const salon = (await repository.getAllSalons()).find((s) => s.id === ticket.salonId);
    if (salon) {
      await notificationService.sendWhatsApp({
        salonId: salon.id,
        salonName: salon.name,
        ticketId: updated.id,
        recipientPhone: updated.customerPhone,
        recipientName: updated.customerName,
        type: 'SOFT_BUMP_ALERT',
        ticketNumber: updated.ticketNumber,
      });
    }

    await this.recalculateQueue(ticket.salonId);

    const activeTickets = await repository.getActiveTickets(ticket.salonId);
    websocketHub.broadcastToSalon(ticket.salonId, {
      type: 'TICKET_SOFT_BUMPED',
      salonId: ticket.salonId,
      ticket: updated,
      activeQueueCount: activeTickets.length,
      timestamp: new Date().toISOString(),
    });

    return updated;
  },

  // 7. Recalculate dynamic wait times for all active tickets
  async recalculateQueue(salonId: string) {
    const salon = (await repository.getAllSalons()).find((s) => s.id === salonId);
    if (!salon) return;

    const activeTickets = await repository.getActiveTickets(salonId);
    const calculations = calculateWaitTimes(activeTickets, salon.stylists);

    for (const ticket of activeTickets) {
      const calc = calculations.get(ticket.id);
      if (calc) {
        ticket.estimatedWaitMinutes = calc.estimatedMinutes;
        ticket.positionInQueue = calc.position;
      }
    }
  },
};
