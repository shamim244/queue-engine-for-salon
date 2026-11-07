import { describe, it, expect, beforeEach } from 'bun:test';
import { queueEngine } from '../src/engine/queue-engine';
import { repository, seedDemoData } from '../src/db/repository';

describe('Dynamic Mid-Queue Barber Preference Switching & FIFO Fairness Suite', () => {
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
    rahulId = modernSalon.stylists[0].id;
    leoId = modernSalon.stylists[1]?.id || modernSalon.stylists[0].id;
    serviceId = modernSalon.services[0].id;
  });

  it('allows a customer who joined with Fastest Available to switch to a specific barber mid-queue', async () => {
    // 1. Customer joins queue with null stylistId (Fastest Available)
    const ticket = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Aarav Switcher',
      customerPhone: '9888877771',
      serviceId,
      stylistId: null,
    });

    expect(ticket.stylistId).toBeNull();
    expect(ticket.status).toBe('WAITING');

    // 2. Customer changes mind and selects Rahul
    const updated = await queueEngine.switchStylistPreference(ticket.id, rahulId);
    expect(updated).not.toBeNull();
    expect(updated.stylistId).toBe(rahulId);

    // Verify persistence
    const fetched = await repository.getTicketById(ticket.id);
    expect(fetched?.stylistId).toBe(rahulId);
  });

  it('allows a customer who requested a specific barber to switch back to Fastest Available', async () => {
    // 1. Customer joins requesting Leo
    const ticket = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Pooja Switcher',
      customerPhone: '9888877772',
      serviceId,
      stylistId: leoId,
    });

    expect(ticket.stylistId).toBe(leoId);

    // 2. Customer notices Leo is busy and switches back to Fastest Available (null)
    const updated = await queueEngine.switchStylistPreference(ticket.id, null);
    expect(updated).not.toBeNull();
    expect(updated.stylistId).toBeNull();

    // Verify persistence
    const fetched = await repository.getTicketById(ticket.id);
    expect(fetched?.stylistId).toBeNull();
  });

  it('preserves strict FIFO arrival ordering when switching preferences', async () => {
    // Customer 1: Arrives at 10:00 (Universal)
    const ticket1 = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Early Customer 1',
      customerPhone: '9888877773',
      serviceId,
      stylistId: null,
    });

    // Customer 2: Arrives at 10:05 (Requested Rahul)
    const ticket2 = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Later Customer 2',
      customerPhone: '9888877774',
      serviceId,
      stylistId: rahulId,
    });

    // Customer 1 decides at 10:10 to switch to Rahul!
    await queueEngine.switchStylistPreference(ticket1.id, rahulId);

    // Both Customer 1 and Customer 2 now want Rahul.
    // BUT Customer 1 arrived earlier (#101 vs #102).
    // When Rahul calls next, Customer 1 MUST be summoned first!
    const calledByRahul = await queueEngine.callNext(salonId, rahulId);
    expect(calledByRahul).not.toBeNull();
    expect(calledByRahul?.id).toBe(ticket1.id);
    expect(calledByRahul?.customerName).toBe('Early Customer 1');

    // Customer 2 is called on Rahul's second call
    const secondCall = await queueEngine.callNext(salonId, rahulId);
    expect(secondCall).not.toBeNull();
    expect(secondCall?.id).toBe(ticket2.id);
    expect(secondCall?.customerName).toBe('Later Customer 2');
  });

  it('rejects preference switching if customer is already seated or completed', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Seated Customer',
      customerPhone: '9888877775',
      serviceId,
      stylistId: null,
    });

    // Seat ticket in chair
    await queueEngine.callNext(salonId, rahulId);
    await queueEngine.seatCustomer(ticket.id, rahulId);

    // Attempting to change preference while in chair must throw error
    expect(async () => {
      await queueEngine.switchStylistPreference(ticket.id, leoId);
    }).toThrow();
  });
});
