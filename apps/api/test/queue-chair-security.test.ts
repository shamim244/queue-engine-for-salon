import { describe, it, expect, beforeAll } from 'bun:test';
import { Elysia } from 'elysia';
import { queueRoutes } from '../src/routes/queue.routes';
import { queueEngine } from '../src/engine/queue-engine';
import { repository } from '../src/db/repositories';
import { authService } from '../src/auth/auth-service';
import { initDatabase } from '../src/db/mysql';

describe('Queue In-Chair Cancellation & Checkout Security Guards', () => {
  let app: Elysia;
  let salonId: string;
  let salonSlug: string;
  let serviceId: string;
  let stylistId: string;
  let staffToken: string;
  let customerToken: string;
  let customerPhone: string;

  beforeAll(async () => {
    await initDatabase();
    app = new Elysia().use(queueRoutes);

    const ts = Date.now();
    salonSlug = `security-salon-${ts}`;
    customerPhone = `91999${ts.toString().slice(-7)}`;

    // Create a test salon with services and stylists
    const salon = await repository.createSalon({
      name: 'Security Test Salon',
      slug: salonSlug,
      phone: '+91 98765 43210',
      ownerName: 'Test Owner',
      services: [
        {
          name: 'Classic Haircut',
          basePrice: 200,
          estimatedDurationMinutes: 30,
        },
      ],
      stylists: [
        {
          name: 'Master Barber Ravi',
          phone: '+91 98765 43211',
        },
      ],
    });
    salonId = salon.id;
    serviceId = salon.services[0].id;
    stylistId = salon.stylists[0].id;

    // Create a staff user & session token
    const staffUser = await authService.createUser({
      username: `barber_${ts}`,
      password: 'Password@123',
      role: 'STAFF',
      fullName: 'Ravi Barber',
      salonId,
    });
    const staffSession = await authService.createSession(staffUser.id);
    staffToken = staffSession.token;

    // Create a customer user & session token
    const customerUser = await authService.createUser({
      username: `cust_${ts}`,
      password: 'Password@123',
      role: 'CUSTOMER',
      fullName: 'Vikram Customer',
      phone: customerPhone,
    });
    const customerSession = await authService.createSession(customerUser.id);
    customerToken = customerSession.token;
  });

  it('allows customer to cancel their own ticket while in WAITING status', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug,
      serviceId,
      customerName: 'Waiting Customer',
      customerPhone,
    });
    expect(ticket.status).toBe('WAITING');

    const res = await app.handle(
      new Request('http://localhost/api/queue/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          reason: 'Had an emergency before service started',
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.ticket.status).toBe('CANCELLED');
  });

  it('rejects customer cancellation when ticket is seated in the chair (IN_CHAIR)', async () => {
    // 1. Join queue with matching customer phone
    const ticket = await queueEngine.checkIn({
      salonSlug,
      serviceId,
      customerName: 'Seated Customer',
      customerPhone,
    });
    expect(ticket.status).toBe('WAITING');

    // 2. Seat customer into chair
    const seated = await queueEngine.seatCustomer(ticket.id, stylistId);
    expect(seated?.status).toBe('IN_CHAIR');

    // 3. Customer attempts to cancel ticket mid-service
    const res = await app.handle(
      new Request('http://localhost/api/queue/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          reason: 'Trying to cancel mid-haircut',
        }),
      })
    );

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Service is currently in progress in the chair');

    // Verify ticket status remains in chair
    const currentTicket = await repository.getTicketById(ticket.id);
    expect(currentTicket?.status).toBe('IN_CHAIR');
  });

  it('blocks unauthenticated checkout requests on /api/queue/finish', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug,
      serviceId,
      customerName: 'Anon Checkout',
      customerPhone: '919998887772',
    });
    await queueEngine.seatCustomer(ticket.id, stylistId);

    const res = await app.handle(
      new Request('http://localhost/api/queue/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          paymentStatus: 'CASH_PAID',
        }),
      })
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Authentication required');
  });

  it('blocks customer-role users from completing checkout on /api/queue/finish', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug,
      serviceId,
      customerName: 'Customer Checkout Try',
      customerPhone,
    });
    await queueEngine.seatCustomer(ticket.id, stylistId);

    const res = await app.handle(
      new Request('http://localhost/api/queue/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          paymentStatus: 'CASH_PAID',
        }),
      })
    );

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Forbidden');
  });

  it('allows authorized staff to finish service and complete checkout', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug,
      serviceId,
      customerName: 'Legit Finished Customer',
      customerPhone: '919998887773',
    });
    await queueEngine.seatCustomer(ticket.id, stylistId);

    const res = await app.handle(
      new Request('http://localhost/api/queue/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          paymentStatus: 'CASH_PAID',
          paymentAmount: 200,
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.ticket.status).toBe('COMPLETED');
    expect(data.ticket.paymentStatus).toBe('CASH_PAID');
  });
});
