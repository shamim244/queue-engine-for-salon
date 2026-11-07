import { describe, it, expect, beforeEach } from 'bun:test';
import { queueEngine } from '../src/engine/queue-engine';
import { selectNextTicketCandidate } from '../src/engine/routing';
import { repository, seedDemoData } from '../src/db/repository';
import type { QueueTicket } from '../src/engine/types';

describe('Multi-Perspective Absence & Zero-Staff-Irritation Queue Engine', () => {
  let salonId: string;
  let rahulId: string;
  let leoId: string;
  let serviceId: string;
  const salonSlug = `aura-abs-${Date.now().toString(36)}`;

  beforeEach(async () => {
    seedDemoData();
    const salon = await repository.createSalon({
      name: 'Aura Premium Absence Salon',
      slug: salonSlug,
      phone: '+91 99999 88888',
      stylists: [
        { name: 'Rahul Barber', phone: '+91 99999 88881' },
        { name: 'Leo Barber', phone: '+91 99999 88882' },
      ],
      services: [
        { name: 'Haircut', basePrice: 150, estimatedDurationMinutes: 20 },
      ],
    });

    salonId = salon.id;
    rahulId = salon.stylists[0].id;
    leoId = salon.stylists[1]?.id || salon.stylists[0].id;
    serviceId = salon.services[0].id;
  });

  it('1. Excludes PAUSED clients from "CALL NEXT CLIENT" so barbers never get irritated by absent customers', async () => {
    // Client 1 (#101) arrives at 10:00 AM
    const tkt1 = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Chai Drinker Customer (#101)',
      customerPhone: '9800000001',
      serviceId,
      source: 'QR_SCAN',
    });

    // Client 2 (#102) arrives at 10:05 AM
    const tkt2 = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Present In Lounge (#102)',
      customerPhone: '9800000002',
      serviceId,
      source: 'QR_SCAN',
    });

    // Client 1 steps out for chai and self-service pauses their spot
    const pausedTkt1 = await queueEngine.pauseTicket(tkt1.id, 'Out for chai in market');
    expect(pausedTkt1.status).toBe('PAUSED');

    // Barber Rahul calls next client
    const nextForRahul = await queueEngine.callNext(salonId, rahulId);

    // CRITICAL: Barber is NOT irritated by #101! #101 is skipped, and #102 is summoned immediately!
    expect(nextForRahul).not.toBeNull();
    expect(nextForRahul?.id).toBe(tkt2.id);
    expect(nextForRahul?.ticketNumber).toBe(tkt2.ticketNumber);

    // Another call when no active clients remain returns null (doesn't repeatedly bug barber with paused #101)
    const nextAgain = await queueEngine.callNext(salonId, rahulId);
    expect(nextAgain).toBeNull();
  });

  it('2. Preserves original arrival seniority when customer returns and taps "I\'m Back" (resumes)', async () => {
    // #101 arrives at 10:00 AM
    const tkt1 = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Errand Runner (#101)',
      customerPhone: '9800000011',
      serviceId,
      source: 'QR_SCAN',
    });

    // #101 is paused
    await queueEngine.pauseTicket(tkt1.id, 'Errand');

    // #102 arrives at 10:05 AM
    const tkt2 = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Lounge Patron (#102)',
      customerPhone: '9800000012',
      serviceId,
      source: 'QR_SCAN',
    });

    // #103 arrives at 10:10 AM
    const tkt3 = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Lounge Patron (#103)',
      customerPhone: '9800000013',
      serviceId,
      source: 'QR_SCAN',
    });

    // Barber calls and seats #102 in chair
    await queueEngine.seatCustomer(tkt2.id, rahulId);

    // Now, #101 returns from market and taps "I'm Back" (resume)
    const resumedTkt1 = await queueEngine.resumeTicket(tkt1.id);
    expect(resumedTkt1.status).toBe('WAITING');

    // Barber Leo becomes free and clicks "CALL NEXT CLIENT"
    // Because #101 originally arrived earlier than #103,
    // #101 gets the next free chair immediately without restarting their wait from zero!
    const nextForLeo = await queueEngine.callNext(salonId, leoId);
    expect(nextForLeo).not.toBeNull();
    expect(nextForLeo?.id).toBe(tkt1.id);
  });

  it('3. Barber can mark absent summoned client as Away/Pause or No-Show cleanly', async () => {
    const tkt = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Vanished Walk-in',
      customerPhone: '9800000021',
      serviceId,
      source: 'QR_SCAN',
    });

    // Summoned to chair
    await queueEngine.summonTicket(tkt.id, rahulId);

    // Barber marks as No-Show
    const noShowTkt = await queueEngine.markNoShow(tkt.id, 'Did not show up');
    expect(noShowTkt.status).toBe('NO_SHOW');

    // Active tickets list excludes no-show
    const active = await repository.getActiveTickets(salonId);
    expect(active.find((t) => t.id === tkt.id)).toBeUndefined();
  });

  it('4. selectNextTicketCandidate pure function strictly ignores PAUSED tickets', () => {
    const mockTickets: QueueTicket[] = [
      {
        id: 't-paused-early',
        salonId,
        ticketNumber: 101,
        customerName: 'Paused Early',
        customerPhone: '9800000031',
        serviceId,
        serviceName: 'Haircut',
        totalPrice: 150,
        totalDurationMinutes: 20,
        status: 'PAUSED',
        source: 'QR_SCAN',
        estimatedWaitMinutes: 0,
        checkInTime: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago
        positionInQueue: 0,
      },
      {
        id: 't-waiting-late',
        salonId,
        ticketNumber: 102,
        customerName: 'Waiting Late',
        customerPhone: '9800000032',
        serviceId,
        serviceName: 'Haircut',
        totalPrice: 150,
        totalDurationMinutes: 20,
        status: 'WAITING',
        source: 'QR_SCAN',
        estimatedWaitMinutes: 10,
        checkInTime: new Date().toISOString(), // Just now
        positionInQueue: 1,
      },
    ];

    const selected = selectNextTicketCandidate(mockTickets, rahulId);
    expect(selected).not.toBeNull();
    expect(selected?.id).toBe('t-waiting-late');
  });
});
