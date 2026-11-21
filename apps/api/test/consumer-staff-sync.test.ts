import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { authRoutes } from '../src/routes/auth.routes';
import { queueRoutes } from '../src/routes/queue.routes';
import { salonRoutes } from '../src/routes/salon.routes';
import { adminRoutes } from '../src/routes/admin.routes';
import { repository, seedDemoData } from '../src/db/repository';
import { authService } from '../src/auth/auth-service';
import { websocketHub } from '../src/websocket/hub';
import { queueEngine } from '../src/engine/queue-engine';

describe('Staff Station, Consumer Lifecycle, and 4-Way Synchronization Suite', () => {
  const app = new Elysia()
    .use(authRoutes)
    .use(queueRoutes)
    .use(salonRoutes)
    .use(adminRoutes);

  beforeEach(async () => {
    seedDemoData();
    await authService.seedDefaultUsers();

    // Test fixture: Customer Vikram Sharma with 4 visits
    const vikram = await authService.getUserByUsername('vikram_sharma');
    if (!vikram) {
      await authService.createUser({
        username: 'vikram_sharma',
        password: 'Customer@123',
        fullName: 'Vikram Sharma',
        phone: '9876500001',
        email: 'vikram@example.com',
        role: 'CUSTOMER',
      });
    }

    const tickets = await repository.getTicketsByCustomer('9876500001');
    if (tickets.length < 4) {
      const fixtures: any[] = [
        { id: 'tkt-v-1', salonId: 'salon-rural-01', customerName: 'Vikram Sharma', customerPhone: '9876500001', status: 'COMPLETED', totalPrice: 150, paymentAmount: 150, serviceName: 'Haircut', ticketNumber: 1, checkInTime: new Date(Date.now() - 86400000 * 4).toISOString() },
        { id: 'tkt-v-2', salonId: 'salon-rural-01', customerName: 'Vikram Sharma', customerPhone: '9876500001', status: 'COMPLETED', totalPrice: 180, paymentAmount: 180, serviceName: 'Shave', ticketNumber: 2, checkInTime: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 'tkt-v-3', salonId: 'salon-rural-01', customerName: 'Vikram Sharma', customerPhone: '9876500001', status: 'COMPLETED', totalPrice: 160, paymentAmount: 160, serviceName: 'Combo', ticketNumber: 3, checkInTime: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 'tkt-v-4', salonId: 'salon-rural-01', customerName: 'Vikram Sharma', customerPhone: '9876500001', status: 'COMPLETED', totalPrice: 200, paymentAmount: 200, serviceName: 'Trim', ticketNumber: 4, checkInTime: new Date(Date.now() - 86400000 * 1).toISOString() },
      ];
      for (const t of fixtures) {
        await repository.createTicket(t);
      }
    }
  });

  describe('1. Consumer Registration and Authentication Flow', () => {
    it('POST /api/auth/customer/register should create a CUSTOMER user with hashed password and session token', async () => {
      const payload = {
        name: 'Arjun Verma',
        phone: '+91 91234 11111',
        username: 'arjun_verma',
        email: 'arjun@verma.com',
        password: 'Password@123',
      };

      const res = await app.handle(
        new Request('http://localhost/api/auth/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.token.length).toBeGreaterThanOrEqual(32);
      expect(data.user).toBeDefined();
      expect(data.user.role).toBe('CUSTOMER');
      expect(data.user.username).toBe('arjun_verma');
      expect(data.user.fullName).toBe('Arjun Verma');
      expect(data.user.phone).toBe('+919123411111');

      // Verify user can now log in via standard /api/auth/login
      const loginRes = await app.handle(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: 'arjun_verma',
            password: 'Password@123',
          }),
        })
      );

      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();
      expect(loginData.success).toBe(true);
      expect(loginData.user.role).toBe('CUSTOMER');
    });

    it('POST /api/auth/customer/register should enforce strict validation on required fields and phone numbers', async () => {
      // Empty name
      const res1 = await app.handle(
        new Request('http://localhost/api/auth/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '', phone: '9876543210' }),
        })
      );
      expect(res1.status).toBe(400);

      // Single-character name
      const resNameShort = await app.handle(
        new Request('http://localhost/api/auth/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'A', phone: '9876543210' }),
        })
      );
      expect(resNameShort.status).toBe(400);

      // Empty phone
      const res2 = await app.handle(
        new Request('http://localhost/api/auth/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Rohit', phone: '   ' }),
        })
      );
      expect(res2.status).toBe(400);

      // Non-digit garbage phone
      const resGarbagePhone = await app.handle(
        new Request('http://localhost/api/auth/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Rohit', phone: 'not-a-phone-number' }),
        })
      );
      expect(resGarbagePhone.status).toBe(400);

      // Phone too short (< 7 digits)
      const resShortPhone = await app.handle(
        new Request('http://localhost/api/auth/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Rohit', phone: '+91 123' }),
        })
      );
      expect(resShortPhone.status).toBe(400);
    });

    it('should support customer login via phone number, username, and email', async () => {
      // 1. By username
      const byUser = await authService.authenticateUser('vikram_sharma', 'Customer@123');
      expect(byUser).not.toBeNull();
      expect(byUser?.role).toBe('CUSTOMER');

      // 2. By phone number
      const byPhone = await authService.authenticateUser('9876500001', 'Customer@123');
      expect(byPhone).not.toBeNull();
      expect(byPhone?.username).toBe('vikram_sharma');

      // 3. By email
      const byEmail = await authService.authenticateUser('vikram@example.com', 'Customer@123');
      expect(byEmail).not.toBeNull();
      expect(byEmail?.username).toBe('vikram_sharma');
    });
  });

  describe('2. Consumer Queue Ticket Lifecycle, History, and IDOR Security', () => {
    it('GET /api/queue/customer/:phone should retrieve real seeded tickets, visit count, and loyalty stamps', async () => {
      // Vikram Sharma (9876500001) is pre-seeded with 4 completed visits
      const res = await app.handle(
        new Request('http://localhost/api/queue/customer/9876500001')
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.totalVisits).toBe(4);
      expect(data.stampsCount).toBe(4);
      expect(data.totalSpent).toBe(690);
      expect(data.history.length).toBe(4);
      expect(data.history[0].customerName).toBe('Vikram Sharma');
      expect(data.history[0].salonName).toBeDefined();
    });

    it('GET /api/queue/customer/:phone should reject invalid or empty phone queries with 400 Bad Request', async () => {
      // Query with spaces or symbols only
      const resEmpty = await app.handle(
        new Request('http://localhost/api/queue/customer/%20%20')
      );
      expect(resEmpty.status).toBe(400);

      // Query with letters only
      const resLetters = await app.handle(
        new Request('http://localhost/api/queue/customer/guest-client')
      );
      expect(resLetters.status).toBe(400);

      // Query with fewer than 4 digits
      const resShort = await app.handle(
        new Request('http://localhost/api/queue/customer/12')
      );
      expect(resShort.status).toBe(400);
    });

    it('should enforce IDOR protection: Customer A cannot access Customer B tickets', async () => {
      // 1. Authenticate Customer A (Vikram Sharma, phone 9876500001)
      const authA = await authService.authenticateUser('vikram_sharma', 'Customer@123');
      expect(authA).not.toBeNull();
      const tokenA = authA!.session.token;

      // 2. Customer A attempts to query Customer B's phone (9888877777)
      const resIdor = await app.handle(
        new Request('http://localhost/api/queue/customer/9888877777', {
          headers: { Authorization: `Bearer ${tokenA}` },
        })
      );
      expect(resIdor.status).toBe(403);
      const idorData = await resIdor.json();
      expect(idorData.success).toBe(false);
      expect(idorData.message).toContain('Forbidden');

      // 3. Customer A can query their OWN phone
      const resOwn = await app.handle(
        new Request('http://localhost/api/queue/customer/9876500001', {
          headers: { Authorization: `Bearer ${tokenA}` },
        })
      );
      expect(resOwn.status).toBe(200);
      const ownData = await resOwn.json();
      expect(ownData.success).toBe(true);
    });

    it('GET /api/queue/customer/:phone should update dynamically across ticket checkin and completion', async () => {
      const testPhone = '+91 98888 77777';

      // Check-in customer into rural salon
      const checkInRes = await app.handle(
        new Request('http://localhost/api/queue/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonSlug: 'ramesh-barber',
            customerName: 'Anand Sharma',
            customerPhone: testPhone,
            serviceId: 'srv-r-1',
          }),
        })
      );
      expect(checkInRes.status).toBe(200);
      const checkInData = await checkInRes.json();
      const ticketId = checkInData.ticket.id;

      // Query customer tickets endpoint
      const custRes = await app.handle(
        new Request(`http://localhost/api/queue/customer/${encodeURIComponent(testPhone)}`)
      );
      expect(custRes.status).toBe(200);
      const custData = await custRes.json();
      expect(custData.success).toBe(true);
      expect(custData.activeTicket).not.toBeNull();
      expect(custData.activeTicket.id).toBe(ticketId);
      expect(custData.activeTicket.customerName).toBe('Anand Sharma');
      expect(custData.activeTicket.status).toBe('WAITING');
      expect(custData.activeTicket.salonName).toBe('Ramesh Traditional Barber');

      // Complete the ticket
      await queueEngine.finishService(ticketId, 'CASH_PAID', 80);

      // Re-query customer tickets: activeTicket should be null, history should contain 1 completed visit
      const custRes2 = await app.handle(
        new Request(`http://localhost/api/queue/customer/${encodeURIComponent(testPhone)}`)
      );
      const custData2 = await custRes2.json();
      expect(custData2.activeTicket).toBeNull();
      expect(custData2.history.length).toBe(1);
      expect(custData2.history[0].id).toBe(ticketId);
      expect(custData2.history[0].status).toBe('COMPLETED');
      expect(custData2.totalVisits).toBe(1);
      expect(custData2.stampsCount).toBe(1);
      expect(custData2.totalSpent).toBe(80);
    });
  });

  describe('3. Staff Station, Concurrency, and 4-Way Synchronization', () => {
    it('POST /api/auth/staff/preference should enforce duration pace bounds and reject invalid values', async () => {
      // Pacing too fast (< 5 mins)
      const resTooLow = await app.handle(
        new Request('http://localhost/api/auth/staff/preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: 'stylist-ramesh-01',
            customAvgDurationMinutes: 2,
          }),
        })
      );
      expect(resTooLow.status).toBe(400);

      // Pacing too long (> 120 mins)
      const resTooHigh = await app.handle(
        new Request('http://localhost/api/auth/staff/preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: 'stylist-ramesh-01',
            customAvgDurationMinutes: 180,
          }),
        })
      );
      expect(resTooHigh.status).toBe(400);
    });

    it('POST /api/auth/staff/preference should calibrate stylist speed pace and broadcast QUEUE_UPDATED', async () => {
      let broadcastReceived: any = null;
      websocketHub.addClient('client-admin', 'ADMIN', (msg) => {
        broadcastReceived = JSON.parse(msg);
      }, true);

      const res = await app.handle(
        new Request('http://localhost/api/auth/staff/preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: 'stylist-ramesh-01',
            customAvgDurationMinutes: 15,
            isActive: true,
          }),
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify broadcast was delivered to subscribers
      expect(broadcastReceived).not.toBeNull();
      expect(broadcastReceived.type).toBe('QUEUE_UPDATED');
      expect(broadcastReceived.salonId).toBe('salon-rural-01');

      websocketHub.removeClient('client-admin');
    });

    it('websocketHub should bi-directionally resolve salon ID and slug aliases for all clients', async () => {
      let receivedOnSlug: any = null;
      // Client connects using salon slug (ramesh-barber)
      websocketHub.addClient('slug-listener', 'ramesh-barber', (msg) => {
        receivedOnSlug = JSON.parse(msg);
      });

      // Backend broadcasts using internal salon ID (salon-rural-01)
      websocketHub.broadcastToSalon('salon-rural-01', {
        type: 'QUEUE_UPDATED',
        salonId: 'salon-rural-01',
        timestamp: new Date().toISOString(),
      });

      expect(receivedOnSlug).not.toBeNull();
      expect(receivedOnSlug.type).toBe('QUEUE_UPDATED');

      websocketHub.removeClient('slug-listener');
    });

    it('POST /api/queue/quick-add should allow staff to 1-tap add walk-in clients without QR scan', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/queue/quick-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonSlug: 'ramesh-barber',
            customerName: 'Elderly Uncle Ji',
          }),
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.ticket).toBeDefined();
      expect(data.ticket.customerName).toBe('Elderly Uncle Ji');
      expect(data.ticket.source).toBe('BARBER_QUICK_ADD');
    });

    it('should complete full 4-way lifecycle: checkin -> summon -> seat -> bump -> finish', async () => {
      const events: string[] = [];
      websocketHub.addClient('test-listener', 'salon-rural-01', (msg) => {
        const parsed = JSON.parse(msg);
        events.push(parsed.type);
      });

      // 1. Check-in (WAITING)
      const ticket = await queueEngine.checkIn({
        salonSlug: 'ramesh-barber',
        customerName: 'Kunal Kapoor',
        customerPhone: '9998887776',
        serviceId: 'srv-r-1',
      });
      expect(ticket.status).toBe('WAITING');
      expect(events).toContain('TICKET_CREATED');

      // 2. Call Next (SUMMONED)
      const summoned = await queueEngine.callNext('salon-rural-01', 'stylist-ramesh-01');
      expect(summoned).not.toBeNull();
      expect(summoned?.status).toBe('SUMMONED');
      expect(events).toContain('TICKET_SUMMONED');

      // 3. 3-Minute Soft Bump (SOFT_BUMPED)
      const bumped = await queueEngine.softBump(ticket.id);
      expect(bumped?.status).toBe('SOFT_BUMPED');
      expect(events).toContain('TICKET_SOFT_BUMPED');

      // 4. Seated in Chair (IN_CHAIR)
      const seated = await queueEngine.seatCustomer(ticket.id, 'stylist-ramesh-01');
      expect(seated?.status).toBe('IN_CHAIR');
      expect(events).toContain('TICKET_SEATED');

      // 5. Finished & Paid (COMPLETED)
      const finished = await queueEngine.finishService(ticket.id, 'CASH_PAID', 80);
      expect(finished?.status).toBe('COMPLETED');
      expect(finished?.paymentStatus).toBe('CASH_PAID');
      expect(events).toContain('TICKET_COMPLETED');

      websocketHub.removeClient('test-listener');
    });
  });

  describe('4. Security Audit, Role-Based Access Control & Privilege Escalation Checks', () => {
    it('should prevent CUSTOMER role from executing staff station operations (call-next, seat, finish)', async () => {
      const auth = await authService.authenticateUser('vikram_sharma', 'Customer@123');
      const token = auth!.session.token;

      // 1. Customer attempts to call next
      const resCallNext = await app.handle(
        new Request('http://localhost/api/queue/call-next', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ salonId: 'salon-rural-01' }),
        })
      );
      expect(resCallNext.status).toBe(403);

      // 2. Customer attempts to seat a customer
      const resSeat = await app.handle(
        new Request('http://localhost/api/queue/seat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ticketId: 'tkt-test' }),
        })
      );
      expect(resSeat.status).toBe(403);

      // 3. Customer attempts to finish service
      const resFinish = await app.handle(
        new Request('http://localhost/api/queue/finish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ticketId: 'tkt-test', paymentStatus: 'CASH_PAID' }),
        })
      );
      expect(resFinish.status).toBe(403);
    });

    it('should prevent CUSTOMER role from cancelling another user queue ticket', async () => {
      // Create a ticket for user Rohit (phone: 9876543210)
      const ticket = await queueEngine.checkIn({
        salonSlug: 'ramesh-barber',
        customerName: 'Rohit Verma',
        customerPhone: '9876543210',
        serviceId: 'srv-r-1',
      });

      // Customer Vikram (phone: 9876500001) tries to cancel Rohit's ticket
      const auth = await authService.authenticateUser('vikram_sharma', 'Customer@123');
      const token = auth!.session.token;

      const resCancel = await app.handle(
        new Request('http://localhost/api/queue/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ticketId: ticket.id }),
        })
      );
      expect(resCancel.status).toBe(403);
      const data = await resCancel.json();
      expect(data.message).toContain('Forbidden');
    });

    it('should prevent CUSTOMER from changing other user passwords or setting mirror PINs', async () => {
      const auth = await authService.authenticateUser('vikram_sharma', 'Customer@123');
      const token = auth!.session.token;

      // Customer attempts to change admin's password
      const resPwd = await app.handle(
        new Request('http://localhost/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: 'usr-admin-01', newPassword: 'HackedPassword123' }),
        })
      );
      expect(resPwd.status).toBe(403);

      // Customer attempts to set mirror PIN for staff
      const resPin = await app.handle(
        new Request('http://localhost/api/auth/set-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: 'usr-staff-01', pin: '9999' }),
        })
      );
      expect(resPin.status).toBe(403);
    });

    it('should securely hash customer passwords and never store plaintext', async () => {
      const user = await authService.getUserByUsername('vikram_sharma');
      expect(user).not.toBeNull();
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe('Customer@123');
      expect(user?.passwordHash.startsWith('$2')).toBe(true); // bcrypt hash prefix

      // Verify bcrypt validation
      const valid = await authService.verifyPassword('Customer@123', user!.passwordHash);
      expect(valid).toBe(true);
      const invalid = await authService.verifyPassword('WrongPass', user!.passwordHash);
      expect(invalid).toBe(false);
    });

    it('should validate 64-character crypto session tokens and reject tampered tokens', async () => {
      const session = await authService.createSession('usr-test');
      expect(session.token).toBeDefined();
      expect(session.token.length).toBe(64);

      // Validate invalid token
      const invalid = await authService.validateSession('fake_tampered_token');
      expect(invalid).toBeNull();
    });
  });

  describe('5. Phase 2: Client Intelligence & 1-Tap Grooming Notes', () => {
    it('POST /api/queue/update-notes should allow staff to update grooming tags and client notes', async () => {
      // 1. Create a ticket
      const ticket = await queueEngine.checkIn({
        salonSlug: 'ramesh-barber',
        customerName: 'Kavita Singh',
        customerPhone: '9870099887',
        serviceId: 'srv-r-1',
      });

      // 2. Login as staff ramesh
      const loginRes = await app.handle(
        new Request('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'ramesh', password: 'Ramesh@123' }),
        })
      );
      const loginData = await loginRes.json();
      const token = loginData.token;

      // 3. Update grooming tags as staff
      const updateRes = await app.handle(
        new Request('http://localhost:3000/api/queue/update-notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ticketId: ticket.id,
            notes: 'Prefers scissors on crown, gentle trimmer on neck',
            groomingTags: ['Sensitive Skin', 'Scissor Only', 'Low Fade'],
          }),
        })
      );

      expect(updateRes.status).toBe(200);
      const updateData = await updateRes.json();
      expect(updateData.success).toBe(true);
      expect(updateData.ticket.notes).toBe('Prefers scissors on crown, gentle trimmer on neck');
      expect(updateData.ticket.groomingTags).toEqual(['Sensitive Skin', 'Scissor Only', 'Low Fade']);
    });

    it('should enrich ticket intelligence with visit count and past services', async () => {
      const phone = '9879998877';
      // Ticket 1: completed visit
      const t1 = await queueEngine.checkIn({
        salonSlug: 'ramesh-barber',
        customerName: 'Rahul Verma',
        customerPhone: phone,
        serviceId: 'srv-r-1',
      });
      await queueEngine.summonTicket(t1.id, 'stylist-ramesh-01');
      await queueEngine.seatCustomer(t1.id, 'stylist-ramesh-01');
      await queueEngine.finishService(t1.id, 'CASH_PAID', 120);

      // Ticket 2: current active visit
      const t2 = await queueEngine.checkIn({
        salonSlug: 'ramesh-barber',
        customerName: 'Rahul Verma',
        customerPhone: phone,
        serviceId: 'srv-r-1',
      });

      const fetched = await repository.getTicketById(t2.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.visitCount).toBe(2); // 1 completed + 1 current = 2nd visit
      expect(fetched?.lastServiceName).toBeDefined();
    });
  });
});
