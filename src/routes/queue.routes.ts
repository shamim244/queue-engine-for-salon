import { Elysia, t } from 'elysia';
import { queueEngine } from '../engine/queue-engine';
import { repository } from '../db/repository';
import { notificationService } from '../notifications/whatsapp';

export const queueRoutes = new Elysia({ prefix: '/api/queue' })
  // 1. Customer Check-in via Door QR
  .post('/checkin', async ({ body, set }) => {
    try {
      const ticket = await queueEngine.checkIn(body as any);
      return { success: true, ticket };
    } catch (err: any) {
      set.status = 400;
      return { message: err.message };
    }
  }, {
    body: t.Object({
      salonSlug: t.String(),
      customerName: t.String(),
      customerPhone: t.String(),
      serviceId: t.String(),
      addOnIds: t.Optional(t.Array(t.String())),
      stylistId: t.Optional(t.Nullable(t.String())),
    })
  })

  // 2. Barber 1-Tap Quick Add (for zero-tech or elderly walk-ins)
  .post('/quick-add', async ({ body, set }) => {
    try {
      const ticket = await queueEngine.barberQuickAdd(body as any);
      return { success: true, ticket };
    } catch (err: any) {
      set.status = 400;
      return { message: err.message };
    }
  }, {
    body: t.Object({
      salonSlug: t.String(),
      customerName: t.String(),
      customerPhone: t.Optional(t.String()),
      serviceId: t.Optional(t.String()),
    })
  })

  // 3. Get Active Queue for a Salon
  .get('/active/:salonId', async ({ params }) => {
    const tickets = await repository.getActiveTickets(params.salonId);
    return {
      count: tickets.length,
      tickets,
    };
  })

  // 4. Get Ticket Details by ID
  .get('/ticket/:ticketId', async ({ params, set }) => {
    const ticket = await repository.getTicketById(params.ticketId);
    if (!ticket) {
      set.status = 404;
      return { message: 'Ticket not found' };
    }
    return ticket;
  })

  // 5. Barber 1-Tap [CALL NEXT]
  .post('/call-next', async ({ body }) => {
    const { salonId, stylistId } = body as { salonId: string; stylistId?: string };
    const ticket = await queueEngine.callNext(salonId, stylistId);
    if (!ticket) {
      return { success: false, message: 'No waiting clients in queue' };
    }
    return { success: true, ticket };
  }, {
    body: t.Object({
      salonId: t.String(),
      stylistId: t.Optional(t.String()),
    })
  })

  // 6. Seat Customer in Chair
  .post('/seat', async ({ body, set }) => {
    const { ticketId, stylistId } = body as { ticketId: string; stylistId?: string };
    const ticket = await queueEngine.seatCustomer(ticketId, stylistId);
    if (!ticket) {
      set.status = 404;
      return { message: 'Ticket not found' };
    }
    return { success: true, ticket };
  }, {
    body: t.Object({
      ticketId: t.String(),
      stylistId: t.Optional(t.String()),
    })
  })

  // 7. Finish Service & Log Payment (Cash or Online)
  .post('/finish', async ({ body, set }) => {
    const { ticketId, paymentStatus, paymentAmount } = body as {
      ticketId: string;
      paymentStatus: 'CASH_PAID' | 'ONLINE_PAID';
      paymentAmount?: number;
    };
    const ticket = await queueEngine.finishService(ticketId, paymentStatus, paymentAmount);
    if (!ticket) {
      set.status = 404;
      return { message: 'Ticket not found' };
    }
    return { success: true, ticket };
  }, {
    body: t.Object({
      ticketId: t.String(),
      paymentStatus: t.Union([t.Literal('CASH_PAID'), t.Literal('ONLINE_PAID')]),
      paymentAmount: t.Optional(t.Number()),
    })
  })

  // 8. 3-Minute Soft Bump (No-show grace hold)
  .post('/soft-bump', async ({ body, set }) => {
    const { ticketId } = body as { ticketId: string };
    const ticket = await queueEngine.softBump(ticketId);
    if (!ticket) {
      set.status = 404;
      return { message: 'Ticket not found' };
    }
    return { success: true, ticket };
  }, {
    body: t.Object({
      ticketId: t.String(),
    })
  })

  // 9. Inspect WhatsApp Notifications Simulator
  .get('/notifications', ({ query }) => {
    return notificationService.getRecentNotifications(query.salonId as string | undefined);
  });
