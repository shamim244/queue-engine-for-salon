import { describe, it, expect, beforeEach } from 'bun:test';
import { repository, seedDemoData } from '../src/db/repository';
import { queueEngine } from '../src/engine/queue-engine';

describe('Stylist Custom Service Durations', () => {
  beforeEach(() => {
    seedDemoData();
  });

  it('should save and retrieve custom service durations for a stylist', async () => {
    const stylistId = 'stylist-ramesh-01';
    const salonId = 'salon-rural-01';

    // Verify initially empty overrides
    const initial = await repository.getStylistServiceDurations(stylistId);
    expect(initial).toBeDefined();

    // Save custom durations (e.g. srv-haircut takes 35 mins instead of default 25 mins)
    await repository.saveStylistServiceDurations(salonId, stylistId, {
      'srv-haircut': 35,
      'srv-beard': 15,
    });

    const updated = await repository.getStylistServiceDurations(stylistId);
    expect(updated['srv-haircut']).toBe(35);
    expect(updated['srv-beard']).toBe(15);
  });

  it('should use stylist custom duration when checking in with that stylist', async () => {
    const salon = (await repository.getAllSalons())[0];
    const stylistId = salon.stylists[0].id;
    const service = salon.services[0]; // e.g. Haircut default 25 min

    // Override service duration to 45 mins
    await repository.saveStylistServiceDurations(salon.id, stylistId, {
      [service.id]: 45,
    });

    // CheckIn specifying this stylist
    const ticket = await queueEngine.checkIn({
      salonSlug: salon.slug,
      customerName: 'Sandy Test Client',
      customerPhone: '9876543210',
      serviceId: service.id,
      stylistId,
    });

    expect(ticket.stylistId).toBe(stylistId);
    expect(ticket.totalDurationMinutes).toBe(45);
  });

  it('should fall back to default catalog duration when stylist has no override', async () => {
    const salon = (await repository.getAllSalons())[0];
    const stylistId = salon.stylists[0].id;
    const service = salon.services[0];

    // Reset override (null)
    await repository.saveStylistServiceDurations(salon.id, stylistId, {
      [service.id]: null,
    });

    const ticket = await queueEngine.checkIn({
      salonSlug: salon.slug,
      customerName: 'Default Client',
      customerPhone: '9876543210',
      serviceId: service.id,
      stylistId,
    });

    expect(ticket.totalDurationMinutes).toBe(service.estimatedDurationMinutes);
  });
});
