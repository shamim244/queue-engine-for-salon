import { describe, it, expect } from "bun:test";
import { api } from "../lib/api";

describe("Staff Analytics Web Client Suite", () => {
  it("should correctly serialize date query parameter in api.queue.getStaffReport", async () => {
    let capturedUrl = "";
    const originalFetch = globalThis.fetch;
    try {
      const mockPayload = {
        success: true,
        timeframe: "day",
        selectedDate: "2026-11-07",
        totalServedToday: 5,
        totalRevenueToday: 500,
        cashRevenue: 200,
        onlineRevenue: 300,
        avgActualMinutes: 20,
        servicesCountMap: {},
        dailyTrends: [],
        completedTickets: [],
      };

      globalThis.fetch = (async (url: any) => {
        capturedUrl = String(url);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockPayload),
          json: async () => mockPayload,
        } as any;
      }) as any;

      const res = await api.queue.getStaffReport("salon-01", "stylist-01", "day", { date: "2026-11-07" });
      expect(capturedUrl).toContain("/api/queue/staff-report/salon-01");
      expect(capturedUrl).toContain("stylistId=stylist-01");
      expect(capturedUrl).toContain("timeframe=day");
      expect(capturedUrl).toContain("date=2026-11-07");
      expect(res.selectedDate).toBe("2026-11-07");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should support timeframe queries for week and month", async () => {
    let capturedUrl = "";
    const originalFetch = globalThis.fetch;
    try {
      const mockPayload = {
        success: true,
        timeframe: "week",
        totalServedToday: 15,
        totalRevenueToday: 1500,
        avgActualMinutes: 25,
        servicesCountMap: {},
        dailyTrends: [],
        completedTickets: [],
      };

      globalThis.fetch = (async (url: any) => {
        capturedUrl = String(url);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockPayload),
          json: async () => mockPayload,
        } as any;
      }) as any;

      await api.queue.getStaffReport("salon-01", undefined, "week");
      expect(capturedUrl).toContain("timeframe=week");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
