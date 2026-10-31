export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

export interface Stylist {
  id: string;
  salonId: string;
  name: string;
  phone?: string;
  pin?: string;
  isAvailable: boolean;
  isOwner?: boolean;
  currentTicketId?: string | null;
  avgDurationMinutes?: number;
}

export interface Service {
  id: string;
  salonId: string;
  name: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  pricingType: "FIXED" | "STARTING_AT" | "FLEXIBLE_CHAIR";
  isAddOn: boolean;
  icon?: string;
}

export interface Salon {
  id: string;
  organizationId?: string | null;
  name: string;
  slug: string;
  phone: string;
  address?: string;
  operatingMode: "RURAL_SOLO" | "MODERN_MULTI";
  currency: string;
  countryCode: string;
  upiPaymentId?: string;
  stylists: Stylist[];
  services: Service[];
  createdAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: "SOLO" | "PRO" | "ENTERPRISE";
  maxBranches: number;
  maxStylistsPerBranch: number;
  allowCustomSmsGateway: boolean;
  allowWhiteLabeling: boolean;
  branchCount?: number;
  branches?: { id: string; name: string; slug: string; stylistsCount: number }[];
}

export interface Ticket {
  id: string;
  salonId: string;
  ticketNumber: number;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  addOnIds?: string[];
  stylistId?: string | null;
  status: "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  positionInQueue: number;
  estimatedWaitMinutes: number;
  servedByStylistId?: string | null;
  callCount?: number;
  calledAt?: string | null;
  seatedAt?: string | null;
  completedAt?: string | null;
  totalPrice?: number;
  paymentStatus?: "UNPAID" | "CASH_PAID" | "ONLINE_PAID";
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: "SUPER_ADMIN" | "SALON_OWNER" | "STAFF" | "CUSTOMER";
  organizationId?: string | null;
  salonId?: string | null;
  staffId?: string | null;
  phone?: string | null;
  email?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
}

export interface AuthSessionResponse {
  success: boolean;
  token: string;
  user: AuthUser;
  organization?: Organization;
  salon?: Salon;
  staff?: Stylist;
  branches?: Salon[];
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("engine_token");
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("engine_token", token);
  } else {
    localStorage.removeItem("engine_token");
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  auth: {
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
      staffId: string;
      username: string;
      password: string;
      phone?: string;
      pin?: string;
    }) =>
      request<{ success: boolean; user: Partial<AuthUser> }>("/api/auth/staff/create", {
        method: "POST",
        body: JSON.stringify(data),
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
  },

  salons: {
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

    updateTier: (orgId: string, tier: "SOLO" | "PRO" | "ENTERPRISE") =>
      request<{ success: boolean; organization: Organization }>(
        `/api/salons/organizations/${orgId}/tier`,
        {
          method: "POST",
          body: JSON.stringify({ tier }),
        }
      ),

    updateMode: (salonId: string, mode: "RURAL_SOLO" | "MODERN_MULTI") =>
      request<{ success: boolean; mode: string }>(`/api/salons/${salonId}/mode`, {
        method: "POST",
        body: JSON.stringify({ mode }),
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
  },

  queue: {
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

    getNotifications: (salonId?: string) =>
      request<any[]>(
        `/api/queue/notifications${salonId ? `?salonId=${salonId}` : ""}`
      ),
  },
};
