import { request } from "./client";
import type { Ticket } from "./types";

export const queueApi = {
  checkIn: (data: {
    salonSlug: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    addOnIds?: string[];
    stylistId?: string | null;
  }) =>
    request<{ success: boolean; ticket: Ticket }>("/api/queue/checkin", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  quickAdd: (data: {
    salonSlug: string;
    customerName: string;
    customerPhone?: string;
    serviceId?: string;
  }) =>
    request<{ success: boolean; ticket: Ticket }>("/api/queue/quick-add", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getActive: (salonId: string) =>
    request<{ count: number; tickets: Ticket[] }>(`/api/queue/active/${salonId}`),

  getStaffReport: (salonId: string, stylistId?: string) =>
    request<{
      success: boolean;
      totalServedToday: number;
      totalRevenueToday: number;
      avgActualMinutes: number;
      servicesCountMap: Record<string, number>;
      completedTickets: any[];
    }>(`/api/queue/staff-report/${salonId}${stylistId ? `?stylistId=${stylistId}` : ""}`),

  getTicket: (ticketId: string) => request<Ticket>(`/api/queue/ticket/${ticketId}`),

  callNext: (salonId: string, stylistId?: string) =>
    request<{ success: boolean; ticket?: Ticket; message?: string }>(
      "/api/queue/call-next",
      {
        method: "POST",
        body: JSON.stringify({ salonId, stylistId }),
      }
    ),

  seat: (ticketId: string, stylistId?: string) =>
    request<{ success: boolean; ticket: Ticket }>("/api/queue/seat", {
      method: "POST",
      body: JSON.stringify({ ticketId, stylistId }),
    }),

  finish: (
    ticketId: string,
    paymentStatus: "CASH_PAID" | "ONLINE_PAID",
    paymentAmount?: number
  ) =>
    request<{ success: boolean; ticket: Ticket }>("/api/queue/finish", {
      method: "POST",
      body: JSON.stringify({ ticketId, paymentStatus, paymentAmount }),
    }),

  softBump: (ticketId: string) =>
    request<{ success: boolean; ticket: Ticket }>("/api/queue/soft-bump", {
      method: "POST",
      body: JSON.stringify({ ticketId }),
    }),

  holdAndCallNext: (data: { salonId: string; currentTicketId: string; stylistId?: string }) =>
    request<{ success: boolean; bumpedTicket: Ticket; nextTicket: Ticket | null }>(
      "/api/queue/hold-and-call-next",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  summon: (ticketId: string, stylistId?: string) =>
    request<{ success: boolean; ticket: Ticket }>("/api/queue/summon", {
      method: "POST",
      body: JSON.stringify({ ticketId, stylistId }),
    }),

  cancel: (ticketId: string, reason?: string) =>
    request<{ success: boolean; ticket: Ticket }>("/api/queue/cancel", {
      method: "POST",
      body: JSON.stringify({ ticketId, reason }),
    }),

  getNotifications: (salonId?: string) =>
    request<any[]>(
      `/api/queue/notifications${salonId ? `?salonId=${salonId}` : ""}`
    ),

  getCustomerTickets: (phone: string) =>
    request<{
      success: boolean;
      phone: string;
      activeTicket: Ticket | null;
      history: Ticket[];
      totalVisits: number;
      stampsCount: number;
      totalSpent: number;
    }>(`/api/queue/customer/${encodeURIComponent(phone)}`),
};
