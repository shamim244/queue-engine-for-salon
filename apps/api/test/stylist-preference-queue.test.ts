import { describe, it, expect, beforeEach } from 'bun:test';
import { queueEngine } from '../src/engine/queue-engine';
import { repository, seedDemoData } from '../src/db/repository';

describe('Stylist Preference & Universal Fast Line Queue Suite', () => {
  let salonId: string;
  let rahulId: string;
  let leoId: string;
  let serviceId: string;

  beforeEach(async () => {
    seedDemoData();
    let modernSalon = await repository.getSalonBySlug('aura-salon');
    if (!modernSalon) {
      modernSalon = await repository.createSalon({
        name: 'Aura Studio',
        slug: 'aura-salon',
        phone: '+91 98888 00000',
        stylists: [
          { name: 'Rahul', phone: '+91 98888 00001' },
          { name: 'Leo', phone: '+91 98888 00002' },
        ],
        services: [
          { name: 'Master Haircut', basePrice: 200, estimatedDurationMinutes: 25 },
        ],
      });
    }
    salonId = modernSalon.id;
    rahulId = modernSalon.stylists[0].id; // Rahul / First stylist
    leoId = modernSalon.stylists[1]?.id || modernSalon.stylists[0].id;
    serviceId = modernSalon.services[0].id;
  });

  it('should preserve strict chronological FIFO order so earlier walk-ins are not jumped by late preferred arrivals', async () => {
    // Ticket 1: Universal Fast Line (stylistId: null) checked in first at earlier timestamp
    const ticketUniversal = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Anand Universal',
      customerPhone: '9888811111',
      serviceId,
      stylistId: null,
    });

    // Ticket 2: Preferred Leo (stylistId: leoId) checked in second
    const ticketLeo = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Rohit Preferred Leo',
      customerPhone: '9888822222',
      serviceId,
      stylistId: leoId,
    });

    // Fair Chronological Rule: Anand arrived first and is eligible for any chair (including Leo).
    // Rohit arrived second and cannot jump ahead of Anand.
    const firstCall = await queueEngine.callNext(salonId, leoId);
    expect(firstCall).not.toBeNull();
    expect(firstCall?.id).toBe(ticketUniversal.id);
    expect(firstCall?.customerName).toBe('Anand Universal');

    // Second call: now Rohit (Preferred Leo) gets called in fair arrival sequence.
    const secondCall = await queueEngine.callNext(salonId, leoId);
    expect(secondCall).not.toBeNull();
    expect(secondCall?.id).toBe(ticketLeo.id);
    expect(secondCall?.customerName).toBe('Rohit Preferred Leo');
  });

  it('should not allow Leo to steal tickets that explicitly preferred Rahul', async () => {
    // Ticket requesting Rahul only
    const ticketRahulOnly = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Suresh Wants Rahul',
      customerPhone: '9888844444',
      serviceId,
      stylistId: rahulId,
    });

    // Leo calls next, but there are no universal tickets and no Leo tickets
    const calledByLeo = await queueEngine.callNext(salonId, leoId);
    // Leo should NOT steal Suresh who asked specifically for Rahul
    expect(calledByLeo).toBeNull();
  });

  it('should fall back to Universal Line tickets when calling stylist has no direct preferences', async () => {
    const ticketUniversal = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Karan FastLine',
      customerPhone: '9888833333',
      serviceId,
      stylistId: null,
    });

    const called = await queueEngine.callNext(salonId, rahulId);
    expect(called).not.toBeNull();
    expect(called?.id).toBe(ticketUniversal.id);
  });
});
