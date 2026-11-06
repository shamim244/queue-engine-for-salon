import { request } from "./client";
import type { AdminStats, PlatformSettings, AuditLog, OnboardSalonPayload, Salon, Organization, AuthUser } from "./types";

export const adminApi = {
  getStats: () => request<AdminStats>("/api/admin/stats"),
  getSettings: () => request<PlatformSettings>("/api/admin/settings"),
  updateSettings: (data: Partial<PlatformSettings>) =>
    request<{ success: boolean; settings: PlatformSettings }>("/api/admin/settings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAuditLogs: () => request<AuditLog[]>("/api/admin/audit-logs"),
  toggleKillSwitch: (active: boolean, message?: string) =>
    request<{ success: boolean; active: boolean; message: string; activatedAt?: string | null }>(
      "/api/admin/kill-switch",
      {
        method: "POST",
        body: JSON.stringify({ active, message }),
      }
    ),
  onboard: (payload: OnboardSalonPayload) =>
    request<{
      success: boolean;
      salon: Salon;
      organization?: Organization | null;
      ownerUser?: any;
      message?: string;
    }>("/api/admin/onboard", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  testNotification: (phone?: string, message?: string) =>
    request<{ success: boolean; provider: string; notificationId?: string; timestamp?: string }>(
      "/api/admin/test-notification",
      {
        method: "POST",
        body: JSON.stringify({ phone, message }),
      }
    ),

  users: {
    list: (params?: { role?: string; salonId?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.role) q.set("role", params.role);
      if (params?.salonId) q.set("salonId", params.salonId);
      if (params?.search) q.set("search", params.search);
      const queryStr = q.toString();
      return request<{ success: boolean; users: AuthUser[] }>(
        `/api/admin/users${queryStr ? `?${queryStr}` : ""}`
      );
    },

    create: (data: {
      username: string;
      password: string;
      role: "SUPER_ADMIN" | "SALON_OWNER" | "STAFF";
      fullName?: string;
      email?: string;
      phone?: string;
      salonId?: string;
      organizationId?: string;
    }) =>
      request<{ success: boolean; user: AuthUser }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (
      id: string,
      data: {
        fullName?: string;
        email?: string;
        phone?: string;
        role?: "SUPER_ADMIN" | "SALON_OWNER" | "STAFF";
        status?: "ACTIVE" | "SUSPENDED" | "TERMINATED" | "INACTIVE";
        salonId?: string;
      }
    ) =>
      request<{ success: boolean; user: AuthUser }>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    resetPassword: (id: string, newPassword: string) =>
      request<{ success: boolean; message: string }>(
        `/api/admin/users/${id}/reset-password`,
        {
          method: "POST",
          body: JSON.stringify({ newPassword }),
        }
      ),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/admin/users/${id}`, {
        method: "DELETE",
      }),
  },
};
