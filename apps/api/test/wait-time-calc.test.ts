import { describe, it, expect, beforeEach } from 'bun:test';
import { queueEngine } from '../src/engine/queue-engine';
import { repository, seedDemoData } from '../src/db/repository';

describe('Estimated Wait Time Calculation & Persistence Suite', () => {
  beforeEach(() => {
    seedDemoData();
  });

  it('should calculate non-zero buffer for position 1 and progressive wait for subsequent tickets', async () => {
    // Ticket 1
    const t1 = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client First',
      customerPhone: '9876543201',
      serviceId: 'srv-r-1', // Haircut (20 mins)
    });

    // Position 1 should have a chair prep buffer (>= 3 mins), never 0m
    expect(t1.estimatedWaitMinutes).toBeGreaterThanOrEqual(3);

    // Ticket 2
    const t2 = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client Second',
      customerPhone: '9876543202',
      serviceId: 'srv-r-1', // Haircut (20 mins)
    });

    expect(t2.estimatedWaitMinutes).toBeGreaterThan(t1.estimatedWaitMinutes);
    expect(t2.estimatedWaitMinutes).toBeGreaterThanOrEqual(20);

    // Verify persistence in repository / getTicketById
    const fetchedT1 = await repository.getTicketById(t1.id);
    expect(fetchedT1).not.toBeNull();
    expect(fetchedT1?.estimatedWaitMinutes).toBe(t1.estimatedWaitMinutes);

    const activeTickets = await repository.getActiveTickets(t1.salonId);
    const activeT2 = activeTickets.find((t) => t.id === t2.id);
    expect(activeT2).toBeDefined();
    expect(activeT2?.estimatedWaitMinutes).toBe(t2.estimatedWaitMinutes);
  });

  it('should update and persist wait time via repository.updateTicketWaitTime', async () => {
    const t = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client Custom',
      customerPhone: '9876543203',
      serviceId: 'srv-r-1',
    });

    await repository.updateTicketWaitTime(t.id, 45);

    const reloaded = await repository.getTicketById(t.id);
    expect(reloaded?.estimatedWaitMinutes).toBe(45);
  });

  it('should maintain realistic backlog for waiting tickets when a ticket is SUMMONED', async () => {
    // Ticket 1: 20 mins service
    const t1 = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client 1',
      customerPhone: '9876543210',
      serviceId: 'srv-r-1',
    });

    // Ticket 2: 20 mins service
    const t2 = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Client 2',
      customerPhone: '9876543211',
      serviceId: 'srv-r-1',
    });

    // Before summon: t2 wait time is >= 20 mins
    expect(t2.estimatedWaitMinutes).toBeGreaterThanOrEqual(20);

    // Summon Ticket 1
    await queueEngine.callNext(t1.salonId);

    // Reload Ticket 2
    const t2AfterSummon = await repository.getTicketById(t2.id);
    expect(t2AfterSummon).not.toBeNull();
    // Ticket 2 wait time MUST NOT drop to 3m just because Ticket 1 is summoned!
    // Ticket 1 is about to take a 20 min cut, so Ticket 2 still has ~20m backlog!
    expect(t2AfterSummon!.estimatedWaitMinutes).toBeGreaterThanOrEqual(20);
  });
});

