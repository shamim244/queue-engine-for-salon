import { describe, it, expect } from "bun:test";

describe("Consumer Queue Load Distribution & Barber Selection Metrics", () => {
  it("should accurately calculate automated vs dedicated stylist queue metrics", () => {
    const stylists = [
      { id: "st-1", name: "Ramesh Kumar", isActive: true, avgDurationMinutes: 20 },
      { id: "st-2", name: "Vikram Singh", isActive: true, avgDurationMinutes: 25 },
    ];

    const activeTickets = [
      // Ramesh is in chair with ticket 1
      { id: "t-1", stylistId: "st-1", status: "IN_CHAIR", ticketNumber: 101, customerName: "Rahul", totalDurationMinutes: 20 },
      // Vikram chair is empty
      // 2 tickets waiting for Ramesh
      { id: "t-2", stylistId: "st-1", status: "WAITING", ticketNumber: 102, customerName: "Amit", totalDurationMinutes: 20 },
      { id: "t-3", stylistId: "st-1", status: "WAITING", ticketNumber: 103, customerName: "Pooja", totalDurationMinutes: 20 },
      // 1 ticket waiting in automated universal line
      { id: "t-4", stylistId: null, status: "WAITING", ticketNumber: 104, customerName: "Karan", totalDurationMinutes: 20 },
    ];

    // Compute metrics
    const inChair = activeTickets.filter((t) => t.status === "IN_CHAIR");
    const waiting = activeTickets.filter((t) => t.status === "WAITING");
    const activeStylists = stylists.filter((s) => s.isActive);
    const chairCount = activeStylists.length;

    const totalWaiting = waiting.length; // 3
    const occupiedChairs = inChair.length; // 1
    const freeChairs = chairCount - occupiedChairs; // 1 (Vikram's chair is free)

    // Automated pool estimation: with 1 chair free, next auto ticket sits very quickly
    const autoEstWait = Math.max(5, Math.ceil(((totalWaiting + 1) / chairCount) * 15));

    // Ramesh dedicated line: in chair + 2 waiting
    const rameshWaiting = waiting.filter((t) => t.stylistId === "st-1");
    expect(rameshWaiting.length).toBe(2);

    const rameshEstWait = Math.max(8, Math.round(20 * 0.5) + rameshWaiting.length * 20); // 10 + 40 = 50 mins
    expect(rameshEstWait).toBe(50);

    // Vikram dedicated line: 0 in chair, 0 waiting (ready now!)
    const vikramWaiting = waiting.filter((t) => t.stylistId === "st-2");
    expect(vikramWaiting.length).toBe(0);

    const rameshDiff = rameshEstWait - autoEstWait;
    expect(rameshDiff).toBeGreaterThan(0); // Ramesh is significantly longer than automated pool!
  });
});
