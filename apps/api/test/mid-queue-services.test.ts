import { describe, it, expect, beforeEach } from 'bun:test';
import { queueEngine } from '../src/engine/queue-engine';
import { repository, seedDemoData } from '../src/db/repository';

describe('Mid-Queue Add-On Services & Dynamic Downstream Recalculation Suite', () => {
  let salonId: string;
  let haircutServiceId: string;
  let beardServiceId: string;
  let headMassageServiceId: string;

  beforeEach(async () => {
    seedDemoData();
    let testSalon = await repository.getSalonBySlug('aura-salon');
    if (!testSalon) {
      testSalon = await repository.createSalon({
        name: 'Aura Studio',
        slug: 'aura-salon',
        phone: '+91 98888 00000',
        stylists: [
          { name: 'Rahul', phone: '+91 98888 00001' },
          { name: 'Leo', phone: '+91 98888 00002' },
        ],
        services: [
          { name: 'Haircut', basePrice: 100, estimatedDurationMinutes: 20 },
          { name: 'Beard Trim', basePrice: 60, estimatedDurationMinutes: 15 },
          { name: 'Head Massage', basePrice: 80, estimatedDurationMinutes: 10 },
        ],
      });
    } else {
      // Ensure test salon has required services
      if (!testSalon.services.find((s) => s.name === 'Beard Trim')) {
        testSalon.services.push({
          id: 'srv-beard',
          name: 'Beard Trim',
          basePrice: 60,
          estimatedDurationMinutes: 15,
        });
      }
      if (!testSalon.services.find((s) => s.name === 'Head Massage')) {
        testSalon.services.push({
          id: 'srv-massage',
          name: 'Head Massage',
          basePrice: 80,
          estimatedDurationMinutes: 10,
        });
      }
    }

    salonId = testSalon.id;
    haircutServiceId = testSalon.services[0].id;
    beardServiceId = testSalon.services.find((s) => s.name === 'Beard Trim')?.id || 'srv-beard';
    headMassageServiceId = testSalon.services.find((s) => s.name === 'Head Massage')?.id || 'srv-massage';
  });

  it('allows customer to add grooming add-ons mid-queue with instant price and duration recalculation', async () => {
    // 1. Customer A checks in for basic Haircut (₹100, 20m)
    const ticketA = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Customer A',
      customerPhone: '9888811111',
      serviceId: haircutServiceId,
    });

    expect(ticketA.totalPrice).toBe(100);
    expect(ticketA.totalDurationMinutes).toBe(20);
    expect(ticketA.selectedAddOns).toHaveLength(0);

    // 2. Customer A decides while waiting to add Beard Trim (₹60, 15m)
    const updatedA = await queueEngine.updateTicketServices(ticketA.id, {
      addOnIds: [beardServiceId],
    });

    expect(updatedA.totalPrice).toBe(160);
    expect(updatedA.totalDurationMinutes).toBe(35);
    expect(updatedA.selectedAddOns).toHaveLength(1);
    expect(updatedA.selectedAddOns[0].name).toBe('Beard Trim');

    // 3. Verify database persistence
    const fetchedA = await repository.getTicketById(ticketA.id);
    expect(fetchedA?.totalPrice).toBe(160);
    expect(fetchedA?.totalDurationMinutes).toBe(35);
    expect(fetchedA?.selectedAddOns[0].name).toBe('Beard Trim');
  });

  it('dynamically increases wait time for downstream clients when preceding client adds services', async () => {
    // Single barber to test direct sequential queue impact
    const modernSalon = await repository.createSalon({
      name: 'Single Chair Salon',
      slug: 'single-chair-salon',
      phone: '+91 99999 00000',
      stylists: [{ name: 'Solo Barber', phone: '+91 99999 00001' }],
      services: [
        { name: 'Standard Cut', basePrice: 100, estimatedDurationMinutes: 20 },
        { name: 'Luxury Facial', basePrice: 200, estimatedDurationMinutes: 30 },
      ],
    });

    const standardCutId = modernSalon.services[0].id;
    const luxuryFacialId = modernSalon.services[1].id;

    // Customer 1 joins (20 mins)
    const ticket1 = await queueEngine.checkIn({
      salonSlug: 'single-chair-salon',
      customerName: 'Preceding Customer',
      customerPhone: '9999900011',
      serviceId: standardCutId,
    });

    // Customer 2 joins behind Customer 1
    const ticket2 = await queueEngine.checkIn({
      salonSlug: 'single-chair-salon',
      customerName: 'Downstream Customer',
      customerPhone: '9999900022',
      serviceId: standardCutId,
    });

    // Initial wait time for ticket2 should be 20 mins + 3 mins chair buffer = 23 mins
    expect(ticket2.estimatedWaitMinutes).toBe(23);

    // Customer 1 adds Luxury Facial (+30 mins)
    await queueEngine.updateTicketServices(ticket1.id, {
      addOnIds: [luxuryFacialId],
    });

    // Fetch refreshed Ticket 2 - wait time must have dynamically stretched by exactly 30 mins (23 -> 53 mins)!
    const refreshedTicket2 = await repository.getTicketById(ticket2.id);
    expect(refreshedTicket2?.estimatedWaitMinutes).toBe(53);
  });

  it('rejects mid-queue modifications if customer is already seated in chair', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug: 'aura-salon',
      customerName: 'Seated Customer',
      customerPhone: '9888822222',
      serviceId: haircutServiceId,
    });

    // Call and seat customer
    await queueEngine.seatCustomer(ticket.id);

    expect(
      queueEngine.updateTicketServices(ticket.id, {
        addOnIds: [beardServiceId],
      })
    ).rejects.toThrow('Cannot modify services while ticket is in status: IN_CHAIR');
  });
});
