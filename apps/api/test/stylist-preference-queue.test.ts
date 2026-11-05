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

  it('should prioritize tickets that explicitly selected the calling stylist over universal tickets', async () => {
    // Ticket 1: Universal Fast Line (stylistId: null) checked in first
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

    // When Leo calls next, he should summon Rohit (who specifically asked for him)
    const calledByLeo = await queueEngine.callNext(salonId, leoId);
    expect(calledByLeo).not.toBeNull();
    expect(calledByLeo?.id).toBe(ticketLeo.id);
    expect(calledByLeo?.customerName).toBe('Rohit Preferred Leo');

    // Next time Leo calls next, he falls back to Anand (Universal Fast Line)
    const secondCall = await queueEngine.callNext(salonId, leoId);
    expect(secondCall).not.toBeNull();
    expect(secondCall?.id).toBe(ticketUniversal.id);
    expect(secondCall?.customerName).toBe('Anand Universal');
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
