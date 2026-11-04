import { Elysia, t } from 'elysia';
import { queueEngine } from '../engine/queue-engine';
import { repository } from '../db/repository';
import { notificationService } from '../notifications/whatsapp';
import { authService } from '../auth/auth-service';

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
  .post('/call-next', async ({ body, headers, cookie: { engine_session }, set }) => {
    try {
      const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
      if (token) {
        const auth = await authService.validateSession(token);
        if (auth && auth.role === 'CUSTOMER') {
          set.status = 403;
          return { success: false, message: 'Forbidden: Customers cannot execute barber station operations' };
        }
      }
      const { salonId, stylistId } = body as { salonId: string; stylistId?: string };
      const ticket = await queueEngine.callNext(salonId, stylistId);
      if (!ticket) {
        return { success: false, message: 'No waiting clients in queue' };
      }
      return { success: true, ticket };
    } catch (err: any) {
      console.error('[queueRoutes:call-next] Error:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      salonId: t.String(),
      stylistId: t.Optional(t.String()),
    })
  })

  // 6. Seat Customer in Chair
  .post('/seat', async ({ body, headers, cookie: { engine_session }, set }) => {
    try {
      const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
      if (token) {
        const auth = await authService.validateSession(token);
        if (auth && auth.role === 'CUSTOMER') {
          set.status = 403;
          return { success: false, message: 'Forbidden: Customers cannot execute barber station operations' };
        }
      }
      const { ticketId, stylistId } = body as { ticketId: string; stylistId?: string };
      const ticket = await queueEngine.seatCustomer(ticketId, stylistId);
      if (!ticket) {
        set.status = 404;
        return { success: false, message: 'Ticket not found' };
      }
      return { success: true, ticket };
    } catch (err: any) {
      console.error('[queueRoutes:seat] Error:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      ticketId: t.String(),
      stylistId: t.Optional(t.String()),
    })
  })

  // 7. Finish Service & Log Payment (Cash or Online)
  .post('/finish', async ({ body, headers, cookie: { engine_session }, set }) => {
    try {
      const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
      if (token) {
        const auth = await authService.validateSession(token);
        if (auth && auth.role === 'CUSTOMER') {
          set.status = 403;
          return { success: false, message: 'Forbidden: Customers cannot execute barber station operations' };
        }
      }
      const { ticketId, paymentStatus, paymentAmount } = body as {
        ticketId: string;
        paymentStatus: 'CASH_PAID' | 'ONLINE_PAID';
        paymentAmount?: number;
      };
      const ticket = await queueEngine.finishService(ticketId, paymentStatus, paymentAmount);
      if (!ticket) {
        set.status = 404;
        return { success: false, message: 'Ticket not found' };
      }
      return { success: true, ticket };
    } catch (err: any) {
      console.error('[queueRoutes:finish] Error:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      ticketId: t.String(),
      paymentStatus: t.Union([t.Literal('CASH_PAID'), t.Literal('ONLINE_PAID')]),
      paymentAmount: t.Optional(t.Number()),
    })
  })

  // 8. 3-Minute Soft Bump (No-show grace hold)
  .post('/soft-bump', async ({ body, headers, cookie: { engine_session }, set }) => {
    try {
      const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
      if (token) {
        const auth = await authService.validateSession(token);
        if (auth && auth.role === 'CUSTOMER') {
          set.status = 403;
          return { success: false, message: 'Forbidden: Customers cannot execute barber station operations' };
        }
      }
      const { ticketId } = body as { ticketId: string };
      const ticket = await queueEngine.softBump(ticketId);
      if (!ticket) {
        set.status = 404;
        return { success: false, message: 'Ticket not found' };
      }
      return { success: true, ticket };
    } catch (err: any) {
      console.error('[queueRoutes:soft-bump] Error:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      ticketId: t.String(),
    })
  })

  // 8.05 Hold Spot & Call Next Ticket (Atomic)
  .post('/hold-and-call-next', async ({ body, headers, cookie: { engine_session }, set }) => {
    try {
      const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
      if (token) {
        const auth = await authService.validateSession(token);
        if (auth && auth.role === 'CUSTOMER') {
          set.status = 403;
          return { success: false, message: 'Forbidden: Customers cannot execute barber station operations' };
        }
      }
      const { salonId, currentTicketId, stylistId } = body as {
        salonId: string;
        currentTicketId: string;
        stylistId?: string;
      };
      const result = await queueEngine.holdAndCallNext({ salonId, currentTicketId, stylistId });
      return { success: true, ...result };
    } catch (err: any) {
      console.error('[queueRoutes:hold-and-call-next] Error:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      salonId: t.String(),
      currentTicketId: t.String(),
      stylistId: t.Optional(t.String()),
    })
  })

  // 8.1 Summon Specific Ticket (Front Desk 1-Tap)
  .post('/summon', async ({ body, headers, cookie: { engine_session }, set }) => {
    try {
      const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
      if (token) {
        const auth = await authService.validateSession(token);
        if (auth && auth.role === 'CUSTOMER') {
          set.status = 403;
          return { success: false, message: 'Forbidden: Customers cannot execute barber station operations' };
        }
      }
      const { ticketId, stylistId } = body as { ticketId: string; stylistId?: string };
      const ticket = await queueEngine.summonTicket(ticketId, stylistId);
      if (!ticket) {
        set.status = 404;
        return { success: false, message: 'Ticket not found' };
      }
      return { success: true, ticket };
    } catch (err: any) {
      console.error('[queueRoutes:summon] Error:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      ticketId: t.String(),
      stylistId: t.Optional(t.String()),
    })
  })

  // 8.2 Cancel / Remove Ticket (Front Desk Manual Removal / Customer Cancellation)
  .post('/cancel', async ({ body, headers, cookie: { engine_session }, set }) => {
    const { ticketId, reason } = body as { ticketId: string; reason?: string };
    const existing = await repository.getTicketById(ticketId);
    if (!existing) {
      set.status = 404;
      return { message: 'Ticket not found' };
    }

    const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
    if (token) {
      const auth = await authService.validateSession(token);
      if (auth && auth.role === 'CUSTOMER') {
        const userDigits = (auth.phone || '').replace(/[^0-9]/g, '');
        const ticketDigits = (existing.customerPhone || '').replace(/[^0-9]/g, '');
        const isOwner =
          (userDigits && ticketDigits && (userDigits.endsWith(ticketDigits.slice(-10)) || ticketDigits.endsWith(userDigits.slice(-10)))) ||
          auth.username === existing.customerName ||
          auth.fullName === existing.customerName;
        if (!isOwner) {
          set.status = 403;
          return { success: false, message: 'Forbidden: Customers can only cancel their own queue ticket' };
        }
      }
    }

    const ticket = await queueEngine.cancelTicket(ticketId, reason);
    return { success: true, ticket };
  }, {
    body: t.Object({
      ticketId: t.String(),
      reason: t.Optional(t.String()),
    })
  })

  // 9. Inspect WhatsApp Notifications Simulator
  .get('/notifications', ({ query }) => {
    return notificationService.getRecentNotifications(query.salonId as string | undefined);
  })

  // 10. Get Customer Tickets, Active Waiting Ticket & Visit History (/me portal)
  .get('/customer/:phone', async ({ params, headers, cookie: { engine_session }, set }) => {
    const rawPhone = decodeURIComponent(params.phone || '').trim();
    const cleanDigits = rawPhone.replace(/[^0-9]/g, '');

    if (!cleanDigits || cleanDigits.length < 4) {
      set.status = 400;
      return { success: false, message: 'Valid phone number with at least 4 digits required' };
    }

    // Role verification / Session checking
    const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
    let isAuthenticatedOwner = false;
    if (token) {
      const auth = await authService.validateSession(token);
      if (auth) {
        if (auth.role === 'CUSTOMER') {
          const userDigits = (auth.phone || '').replace(/[^0-9]/g, '');
          const queryDigits = cleanDigits;
          const matches =
            (userDigits && (userDigits.endsWith(queryDigits.slice(-10)) || queryDigits.endsWith(userDigits.slice(-10)))) ||
            auth.username === rawPhone;
          if (!matches) {
            set.status = 403;
            return { success: false, message: 'Forbidden: Customers cannot access ticket records belonging to other customers' };
          }
          isAuthenticatedOwner = true;
        } else {
          // Staff, Owner, Admin have access
          isAuthenticatedOwner = true;
        }
      }
    }

    const tickets = await repository.getTicketsByCustomer(rawPhone);
    const allSalons = await repository.getAllSalons();

    // Map tickets with salon details and stylist names
    const enrichedTickets = tickets.map((t) => {
      const salon = allSalons.find((s) => s.id === t.salonId);
      const stylist = salon?.stylists.find((st) => st.id === t.stylistId);
      return {
        ...t,
        salonName: salon?.name || 'Engine Que Salon',
        salonSlug: salon?.slug || 'salon',
        stylistName: stylist?.name || 'Master Barber',
      };
    });

    let active = enrichedTickets.find((t) =>
      ['WAITING', 'SUMMONED', 'IN_CHAIR', 'SOFT_BUMPED'].includes(t.status)
    ) || null;

    if (active) {
      const activeSalonTickets = await repository.getActiveTickets(active.salonId);
      const waitingList = activeSalonTickets.filter((t) =>
        ['WAITING', 'SUMMONED', 'SOFT_BUMPED'].includes(t.status)
      );
      const idx = waitingList.findIndex((t) => t.id === active!.id);
      if (idx >= 0) {
        active.positionInQueue = idx + 1;
      }
    }

    const history = enrichedTickets.filter((t) =>
      ['COMPLETED', 'CANCELLED'].includes(t.status)
    );

    const completed = enrichedTickets.filter((t) => t.status === 'COMPLETED');
    const totalSpent = completed.reduce((sum, t) => sum + (t.paymentAmount || t.totalPrice || 0), 0);

    return {
      success: true,
      phone: rawPhone,
      activeTicket: active,
      history,
      totalVisits: completed.length,
      stampsCount: completed.length % 6,
      totalSpent,
    };
  });

