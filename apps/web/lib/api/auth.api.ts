import { request } from "./client";
import type { AuthSessionResponse, AuthUser, Stylist } from "./types";

export const authApi = {
  login: (identifier: string, password: string) =>
    request<AuthSessionResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    }),

  pinSwitch: (salonId: string, staffId: string, pin: string) =>
    request<{ success: boolean; token: string; user: AuthUser; staff: Stylist }>(
      "/api/auth/pin-switch",
      {
        method: "POST",
        body: JSON.stringify({ salonId, staffId, pin }),
      }
    ),

  getMe: () => request<AuthSessionResponse>("/api/auth/me"),

  logout: () =>
    request<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
    }),

  setPin: (userId: string, pin: string) =>
    request<{ success: boolean; message: string }>("/api/auth/set-pin", {
      method: "POST",
      body: JSON.stringify({ userId, pin }),
    }),

  changePassword: (userId: string, newPassword: string) =>
    request<{ success: boolean }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ userId, newPassword }),
    }),

  createStaff: (data: {
    salonId: string;
    staffId?: string;
    fullName?: string;
    username: string;
    password: string;
    email?: string;
    phone?: string;
    pin?: string;
    avgDurationMinutes?: number;
  }) =>
    request<{ success: boolean; user: Partial<AuthUser> }>("/api/auth/staff/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStaff: (
    userId: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      pin?: string;
      avgDurationMinutes?: number;
      status?: "ACTIVE" | "SUSPENDED";
    }
  ) =>
    request<{ success: boolean; user: AuthUser }>(`/api/auth/staff/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  resetStaffPassword: (userId: string, newPassword: string) =>
    request<{ success: boolean; message: string }>(
      `/api/auth/staff/${userId}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      }
    ),

  deleteStaff: (userId: string) =>
    request<{ success: boolean; message: string }>(`/api/auth/staff/${userId}`, {
      method: "DELETE",
    }),

  listStaff: (salonId: string) =>
    request<{ staffUsers: any[] }>(`/api/auth/staff/${salonId}`),

  revokeAll: (userId: string) =>
    request<{ success: boolean; message: string }>("/api/auth/staff/revoke-all", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  updateStaffPreference: (data: {
    staffId: string;
    customAvgDurationMinutes?: number;
    isActive?: boolean;
  }) =>
    request<{ success: boolean; message: string }>("/api/auth/staff/preference", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  registerCustomer: (data: {
    name: string;
    phone: string;
    username?: string;
    email?: string;
    password?: string;
  }) =>
    request<{
      success: boolean;
      token?: string;
      user?: AuthUser;
      customer?: { id: string; name: string; phone: string };
      message?: string;
    }>("/api/auth/customer/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
