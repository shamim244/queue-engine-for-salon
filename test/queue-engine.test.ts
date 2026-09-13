import { describe, it, expect, beforeEach } from 'bun:test';
import { repository, seedDemoData } from '../src/db/repository';
import { queueEngine } from '../src/engine/queue-engine';

describe('Engine Que System - Core Queue State Machine Tests', () => {
  beforeEach(() => {
    seedDemoData();
  });

  it('should seed default rural and modern demo salons', async () => {
    const salons = await repository.getAllSalons();
    expect(salons.length).toBeGreaterThanOrEqual(2);

    const rural = await repository.getSalonBySlug('ramesh-barber');
    expect(rural).not.toBeNull();
    expect(rural?.operatingMode).toBe('RURAL_SOLO');
    expect(rural?.stylists.length).toBe(1);

    const modern = await repository.getSalonBySlug('aura-salon');
    expect(modern).not.toBeNull();
    expect(modern?.operatingMode).toBe('MODERN_MULTI');
    expect(modern?.stylists.length).toBe(4);
  });

  it('should process customer QR check-in and calculate wait time', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Amit Sharma',
      customerPhone: '9876543210',
      serviceId: 'srv-r-1', // Haircut ₹80, 20m
      addOnIds: ['srv-r-4'], // Beard styling +₹30, 10m
    });

    expect(ticket).toBeDefined();
    expect(ticket.ticketNumber).toBeGreaterThanOrEqual(101);
    expect(ticket.customerName).toBe('Amit Sharma');
    expect(ticket.totalPrice).toBe(110); // 80 + 30
    expect(ticket.totalDurationMinutes).toBe(30); // 20 + 10
    expect(ticket.status).toBe('WAITING');
    expect(ticket.positionInQueue).toBe(1);
  });

  it('should handle rapid concurrent check-ins without duplicate ticket numbers', async () => {
    const promises = [
      queueEngine.checkIn({ salonSlug: 'ramesh-barber', customerName: 'Client 1', customerPhone: '111', serviceId: 'srv-r-1' }),
      queueEngine.checkIn({ salonSlug: 'ramesh-barber', customerName: 'Client 2', customerPhone: '222', serviceId: 'srv-r-1' }),
      queueEngine.checkIn({ salonSlug: 'ramesh-barber', customerName: 'Client 3', customerPhone: '333', serviceId: 'srv-r-1' }),
      queueEngine.checkIn({ salonSlug: 'ramesh-barber', customerName: 'Client 4', customerPhone: '444', serviceId: 'srv-r-1' }),
    ];

    const results = await Promise.all(promises);
    const ticketNumbers = results.map(t => t.ticketNumber);
    const uniqueNumbers = new Set(ticketNumbers);

    // Verify all ticket numbers are distinct and non-overlapping
    expect(uniqueNumbers.size).toBe(4);
  });

  it('should support 1-tap quick add for non-smartphone clients', async () => {
    const quickTicket = await queueEngine.barberQuickAdd({
      salonSlug: 'ramesh-barber',
      customerName: 'Elderly Uncle Ji',
    });

    expect(quickTicket.customerName).toBe('Elderly Uncle Ji');
    expect(quickTicket.source).toBe('BARBER_QUICK_ADD');
    expect(quickTicket.status).toBe('WAITING');
  });

  it('should progress through complete queue lifecycle (Summon -> Seat -> Finish & Pay)', async () => {
    // 1. Check in
    const ticket = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Deepak Verma',
      customerPhone: '9998887776',
      serviceId: 'srv-r-3', // Combo ₹110
    });

    const salon = await repository.getSalonBySlug('ramesh-barber');
    expect(salon).not.toBeNull();

    // 2. Call Next
    const summoned = await queueEngine.callNext(salon!.id);
    expect(summoned).not.toBeNull();
    expect(summoned?.status).toBe('SUMMONED');
    expect(summoned?.summonedTime).toBeDefined();

    // 3. Seat customer
    const seated = await queueEngine.seatCustomer(summoned!.id);
    expect(seated?.status).toBe('IN_CHAIR');
    expect(seated?.startedTime).toBeDefined();

    // 4. Finish & Cash Checkout
    const completed = await queueEngine.finishService(seated!.id, 'CASH_PAID', 110);
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.completedTime).toBeDefined();
    expect(completed?.paymentStatus).toBe('CASH_PAID');
    expect(completed?.paymentAmount).toBe(110);
  });

  it('should execute 3-minute soft bump protocol when summoned client is not present', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Late Arrival',
      customerPhone: '9870000000',
      serviceId: 'srv-r-1',
    });

    const salon = await repository.getSalonBySlug('ramesh-barber');
    await queueEngine.callNext(salon!.id);

    // Trigger soft bump
    const bumped = await queueEngine.softBump(ticket.id);
    expect(bumped?.status).toBe('SOFT_BUMPED');

    // Verify soft-bumped client is prioritized when chair opens up again
    const reSummoned = await queueEngine.callNext(salon!.id);
    expect(reSummoned?.id).toBe(ticket.id);
    expect(reSummoned?.status).toBe('SUMMONED');
  });
});
