import { describe, it, expect } from 'bun:test';
import { repository } from '../src/db/repository';
import { selectNextTicketCandidate } from '../src/engine/routing';
import type { QueueTicket } from '../src/engine/types';

describe('Unified Standard Salon Model', () => {
  it('operates seamlessly with 1 stylist (single-chair salon)', async () => {
    const salon = await repository.createSalon({
      name: 'Solo Barber Studio',
      slug: 'solo-barber-test',
      phone: '+91 91111 22222',
      stylists: [{ name: 'Solo Master', phone: '+91 91111 22222' }],
    });

    expect(salon.id).toBeDefined();
    expect(salon.stylists.length).toBe(1);
    expect(salon.stylists[0].name).toBe('Solo Master');

    // Routing test: all waiting tickets route to the single stylist
    const mockTickets: QueueTicket[] = [
      {
        id: 't-1',
        salonId: salon.id,
        stylistId: null, // Universal line
        ticketNumber: 101,
        customerName: 'Customer One',
        customerPhone: '9999999991',
        serviceId: 'srv-1',
        serviceName: 'Haircut',
        selectedAddOns: [],
        totalPrice: 150,
        totalDurationMinutes: 25,
        status: 'WAITING',
        source: 'QR_SCAN',
        routingPreference: 'AUTO_FASTEST',
        estimatedWaitMinutes: 0,
        checkInTime: new Date().toISOString(),
      },
    ];

    const nextTicket = selectNextTicketCandidate(mockTickets, salon.stylists[0].id);
    expect(nextTicket).not.toBeNull();
    expect(nextTicket?.id).toBe('t-1');
  });

  it('operates seamlessly with multiple stylists (multi-chair salon)', async () => {
    const salon = await repository.createSalon({
      name: 'Multi Chair Studio',
      slug: 'multi-chair-test',
      phone: '+91 93333 44444',
      stylists: [
        { name: 'Chair 1 - Alice', phone: '+91 93333 44441' },
        { name: 'Chair 2 - Bob', phone: '+91 93333 44442' },
      ],
    });

    expect(salon.stylists.length).toBe(2);

    const mockTickets: QueueTicket[] = [
      {
        id: 't-bob-pref',
        salonId: salon.id,
        stylistId: salon.stylists[1].id, // Preferred Bob
        ticketNumber: 102,
        customerName: 'Bob Fan',
        customerPhone: '9999999992',
        serviceId: 'srv-1',
        serviceName: 'Haircut',
        selectedAddOns: [],
        totalPrice: 150,
        totalDurationMinutes: 25,
        status: 'WAITING',
        source: 'QR_SCAN',
        routingPreference: 'SPECIFIC_STYLIST',
        estimatedWaitMinutes: 0,
        checkInTime: new Date().toISOString(),
      },
      {
        id: 't-universal',
        salonId: salon.id,
        stylistId: null, // Universal line
        ticketNumber: 103,
        customerName: 'Anyone Client',
        customerPhone: '9999999993',
        serviceId: 'srv-1',
        serviceName: 'Haircut',
        selectedAddOns: [],
        totalPrice: 150,
        totalDurationMinutes: 25,
        status: 'WAITING',
        source: 'QR_SCAN',
        routingPreference: 'AUTO_FASTEST',
        estimatedWaitMinutes: 10,
        checkInTime: new Date().toISOString(),
      },
    ];

    // When Bob calls: gets his preferred ticket
    const bobTicket = selectNextTicketCandidate(mockTickets, salon.stylists[1].id);
    expect(bobTicket?.id).toBe('t-bob-pref');

    // When Alice calls: gets the universal ticket (does not steal Bob's preferred ticket)
    const aliceTicket = selectNextTicketCandidate(mockTickets, salon.stylists[0].id);
    expect(aliceTicket?.id).toBe('t-universal');
  });

  it('transitions from 1 chair to 2 chairs seamlessly by simply adding a stylist', async () => {
    const salon = await repository.createSalon({
      name: 'Growing Barber',
      slug: 'growing-barber-test',
      phone: '+91 95555 66666',
      stylists: [{ name: 'Owner Barber' }],
    });

    expect(salon.stylists.length).toBe(1);

    // Business grows: Owner adds assistant stylist
    const newStylist = {
      id: `stylist-${salon.id}-2`,
      salonId: salon.id,
      name: 'Assistant Barber',
      phone: '+91 95555 66667',
      isActive: true,
      historicalAvgDurationMinutes: 25,
      currentTicketId: null,
    };
    salon.stylists.push(newStylist);

    expect(salon.stylists.length).toBe(2);
    expect(salon.stylists[1].name).toBe('Assistant Barber');
  });
});
