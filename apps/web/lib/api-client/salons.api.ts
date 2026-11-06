import { request } from "./client";
import type { Salon, Organization, Stylist, Service } from "./types";

export const salonsApi = {
  getAll: () => request<Salon[]>("/api/salons"),

  get: (slugOrId: string) =>
    request<{ salon: Salon; activeQueueCount: number }>(`/api/salons/${slugOrId}`),

  register: (data: any) =>
    request<{ success: boolean; salon: Salon; links: Record<string, string> }>(
      "/api/salons/register",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getOrganizations: () =>
    request<{ organizations: Organization[] }>("/api/salons/organizations"),

  getOrganization: (id: string) =>
    request<{
      organization: Organization;
      usage: { currentBranches: number; maxBranches: number; tier: string };
      branches: Salon[];
    }>(`/api/salons/organizations/${id}`),

  updateTier: (orgId: string, tier: "STARTER" | "PRO" | "ENTERPRISE") =>
    request<{ success: boolean; organization: Organization }>(
      `/api/salons/organizations/${orgId}/tier`,
      {
        method: "POST",
        body: JSON.stringify({ tier }),
      }
    ),

  updateMode: (salonId: string, mode: string) =>
    request<{ success: boolean; mode: string }>(`/api/salons/${salonId}/mode`, {
      method: "POST",
      body: JSON.stringify({ mode }),
    }),

  update: (
    salonId: string,
    data: {
      name?: string;
      phone?: string;
      address?: string;
      upiPaymentId?: string;
      tagline?: string;
      about?: string;
      email?: string;
      whatsappPhone?: string;
      googleMapsUrl?: string;
      instagramHandle?: string;
      operatingHours?: string;
      amenities?: string[];
      announcement?: string;
      announcementActive?: boolean;
      operatingMode?: string;
      status?: "ACTIVE" | "SUSPENDED" | "MAINTENANCE";
      currency?: string;
    }
  ) =>
    request<{ success: boolean; salon: Salon }>(`/api/salons/${salonId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (salonId: string) =>
    request<{ success: boolean; message: string }>(`/api/salons/${salonId}`, {
      method: "DELETE",
    }),

  addStylist: (
    salonId: string,
    data: { name: string; phone?: string; avgDurationMinutes?: number }
  ) =>
    request<{ success: boolean; stylist: Stylist }>(`/api/salons/${salonId}/stylists`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  addService: (
    salonId: string,
    data: {
      name: string;
      basePrice: number;
      estimatedDurationMinutes: number;
      pricingType?: "FIXED" | "STARTING_AT" | "FLEXIBLE_CHAIR";
      isAddOn?: boolean;
      icon?: string;
    }
  ) =>
    request<{ success: boolean; service: Service }>(`/api/salons/${salonId}/services`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteService: (salonId: string, serviceId: string) =>
    request<{ success: boolean }>(`/api/salons/${salonId}/services/${serviceId}`, {
      method: "DELETE",
    }),

  getMetrics: (salonId: string) =>
    request<{
      todayServedCount: number;
      todayRevenue: number;
      averageServiceDurationMinutes: number;
      stylistBreakdown: Record<string, number>;
    }>(`/api/salons/${salonId}/metrics`),
};
