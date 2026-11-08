import { describe, expect, it } from "bun:test";
import { calculateQueueLoadMetrics, calculatePeopleAhead, calculateArrivalWindow } from "../components/queue/queue-helpers";
import type { Stylist, Ticket } from "@/lib/api";

describe("Queue Helpers & Fair FIFO Allocation Suite", () => {
  const mockStylists: Stylist[] = [
    { id: "stylist-1", name: "Rahul Sharma", salonId: "salon-1", isActive: true, avgDurationMinutes: 20 },
    { id: "stylist-2", name: "Amit Verma", salonId: "salon-1", isActive: true, avgDurationMinutes: 20 },
  ];

  it("should prevent false 'Chair Ready (0 wait)' when 2 universal walk-ins are already waiting in the queue", () => {
    // Both chairs occupied + 2 universal walk-ins waiting in lounge
    const activeTickets: Ticket[] = [
      {
        id: "t-chair-1",
        ticketNumber: 101,
        customerName: "Client A",
        serviceId: "s-1",
        serviceName: "Haircut",
        stylistId: "stylist-1",
        status: "IN_CHAIR",
        totalPrice: 150,
        totalDurationMinutes: 20,
        createdAt: "2026-11-08T05:00:00Z",
      },
      {
        id: "t-chair-2",
        ticketNumber: 102,
        customerName: "Client B",
        serviceId: "s-1",
        serviceName: "Haircut",
        stylistId: "stylist-2",
        status: "IN_CHAIR",
        totalPrice: 150,
        totalDurationMinutes: 20,
        createdAt: "2026-11-08T05:05:00Z",
      },
      {
        id: "t-wait-1",
        ticketNumber: 103,
        customerName: "Waiting Client 1",
        serviceId: "s-1",
        serviceName: "Haircut",
        stylistId: null, // Universal walk-in
        status: "WAITING",
        totalPrice: 150,
        totalDurationMinutes: 20,
        createdAt: "2026-11-08T05:10:00Z",
      },
      {
        id: "t-wait-2",
        ticketNumber: 104,
        customerName: "Waiting Client 2",
        serviceId: "s-1",
        serviceName: "Haircut",
        stylistId: null, // Universal walk-in
        status: "WAITING",
        totalPrice: 150,
        totalDurationMinutes: 20,
        createdAt: "2026-11-08T05:12:00Z",
      },
    ];

    const metrics = calculateQueueLoadMetrics(mockStylists, activeTickets);

    // General line calculation
    expect(metrics.totalWaiting).toBe(2);
    expect(metrics.automated.estWaitMin).toBeGreaterThan(0);

    // Specific barbers MUST NOT show 0 wait or isFreeNow: true
    for (const st of mockStylists) {
      const stMetric = metrics.byStylist[st.id];
      expect(stMetric.isFreeNow).toBe(false);
      expect(stMetric.estWaitMin).toBeGreaterThan(0);
      expect(stMetric.waitingCount).toBeGreaterThan(0);
    }
  });

  it("should calculate people ahead correctly for a specific barber when earlier universal clients exist (no 0 ahead glitch)", () => {
    const waitingTickets: Ticket[] = [
      {
        id: "t-1",
        ticketNumber: 101,
        customerName: "First Universal Arrival",
        serviceId: "s-1",
        serviceName: "Haircut",
        stylistId: null, // Universal
        status: "WAITING",
        totalPrice: 150,
        totalDurationMinutes: 20,
        createdAt: "2026-11-08T05:10:00Z",
      },
      {
        id: "t-2",
        ticketNumber: 102,
        customerName: "Second Universal Arrival",
        serviceId: "s-1",
        serviceName: "Haircut",
        stylistId: null, // Universal
        status: "WAITING",
        totalPrice: 150,
        totalDurationMinutes: 20,
        createdAt: "2026-11-08T05:15:00Z",
      },
      {
        id: "t-3",
        ticketNumber: 103,
        customerName: "Third Client choosing Rahul specifically",
        serviceId: "s-1",
        serviceName: "Haircut",
        stylistId: "stylist-1", // Rahul
        status: "WAITING",
        totalPrice: 150,
        totalDurationMinutes: 20,
        createdAt: "2026-11-08T05:20:00Z",
      },
    ];

    const myTicket = waitingTickets[2];
    const { peopleAhead, myBarberSpecificAhead } = calculatePeopleAhead(myTicket, waitingTickets);

    // Client 3 arrived third, so there are 2 clients ahead in the shop
    expect(peopleAhead).toBe(2);
    // Since the first 2 clients are universal, they can sit with Rahul too, so they are ahead of Client 3 for Rahul's chair
    expect(myBarberSpecificAhead).toBe(2);
    expect(myBarberSpecificAhead).not.toBe(0);
  });

  it("should report chair ready and 0 wait only when shop is truly empty", () => {
    const metrics = calculateQueueLoadMetrics(mockStylists, []);
    expect(metrics.totalWaiting).toBe(0);
    expect(metrics.automated.estWaitMin).toBe(0);
    expect(metrics.byStylist["stylist-1"].isFreeNow).toBe(true);
    expect(metrics.byStylist["stylist-1"].estWaitMin).toBe(0);

    const eta = calculateArrivalWindow(Date.now(), 0, null);
    expect(eta.isReady).toBe(true);
    expect(eta.exactTarget).toBe("Now");
  });
});
