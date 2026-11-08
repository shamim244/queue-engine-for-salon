export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined" && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "";
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  }

  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

export function getWsBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL && !process.env.NEXT_PUBLIC_WS_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  if (typeof window !== "undefined" && window.location?.host) {
    const { protocol, host, hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${host}/ws`;
    }
    return process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";
  }

  return process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";
}

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
  userId?: string;
  isAvailable?: boolean;
  isActive?: boolean;
  isOwner?: boolean;
  currentTicketId?: string | null;
  avgDurationMinutes?: number;
  historicalAvgDurationMinutes?: number;
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
  operatingMode?: string;
  currency: string;
  countryCode: string;
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
  status?: "ACTIVE" | "SUSPENDED" | "MAINTENANCE";
  wifiSsid?: string;
  wifiPassword?: string;
  enableLoungeWifi?: boolean;
  enableScreenWakeLock?: boolean;
  stylists: Stylist[];
  services: Service[];
  createdAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: "STARTER" | "PRO" | "ENTERPRISE";
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
  serviceName?: string;
  salonName?: string;
  salonSlug?: string;
  stylistName?: string;
  addOnIds?: string[];
  stylistId?: string | null;
  status:
    | "WAITING"
    | "CALLED"
    | "IN_SERVICE"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW"
    | "SUMMONED"
    | "IN_CHAIR"
    | "SOFT_BUMPED"
    | "PAUSED";
  positionInQueue: number;
  estimatedWaitMinutes: number;
  servedByStylistId?: string | null;
  callCount?: number;
  calledAt?: string | null;
  seatedAt?: string | null;
  completedAt?: string | null;
  totalPrice?: number;
  totalDurationMinutes?: number;
  selectedAddOns?: Array<{ id: string; name: string; price: number; durationMinutes: number }>;
  paymentStatus?: "UNPAID" | "CASH_PAID" | "ONLINE_PAID";
  createdAt: string;
  checkInTime?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string | null;
  role: "SUPER_ADMIN" | "SALON_OWNER" | "STAFF" | "CUSTOMER";
  organizationId?: string | null;
  salonId?: string | null;
  staffId?: string | null;
  phone?: string | null;
  email?: string | null;
  pin?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED" | "INACTIVE";
  salonName?: string | null;
  organizationName?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
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

export interface PlatformSettings {
  general: {
    platformName: string;
    supportEmail: string;
    supportPhone: string;
    defaultCurrency: string;
    defaultTimezone: string;
    defaultGracePeriodMinutes: number;
    defaultBufferMinutes: number;
  };
  appearance: {
    themeAccent: string;
    whiteLabelEnabled: boolean;
    customCssEnabled: boolean;
    tvDisplayMode: string;
  };
  engine: {
    heartbeatIntervalSeconds: number;
    watchdogTimeoutSeconds: number;
    autoSummonThresholdSeconds: number;
    ticketRetentionHours: number;
  };
  gateway: {
    provider: string;
    senderPhone: string;
  };
}

export interface AdminStats {
  totalSalons: number;
  totalStylists: number;
  totalTicketsToday: number;
  socketClientsCount: number;
  uptimeSeconds: number;
  systemHealth: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  category: string;
}

export interface MaintenanceMode {
  active: boolean;
  message: string;
  activatedAt?: string | null;
}

export interface OnboardSalonPayload {
  salonName?: string;
  name?: string;
  slug?: string;
  operatingMode?: string;
  phone: string;
  address?: string;
  currency?: string;
  countryCode?: string;
  upiPaymentId?: string;
  organizationName?: string;
  organizationSlug?: string;
  tier?: "STARTER" | "PRO" | "ENTERPRISE";
  ownerUser?: {
    username: string;
    password: string;
    phone?: string;
    email?: string;
  };
  stylists?: Array<{
    name: string;
    phone?: string;
    avgDurationMinutes?: number;
    pin?: string;
  }>;
  services?: Array<{
    name: string;
    basePrice: number;
    estimatedDurationMinutes: number;
    isAddOn?: boolean;
    icon?: string;
  }>;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const local = localStorage.getItem("engine_token") || localStorage.getItem("engine_session");
  if (local) return local;
  const match = document.cookie.match(/(?:^|;\s*)(?:engine_session|engine_token|auth_token)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("engine_token", token);
    document.cookie = `engine_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
  } else {
    localStorage.removeItem("engine_token");
    localStorage.removeItem("engine_session");
    document.cookie = "engine_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "engine_session=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
  }
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url =
    endpoint.startsWith("http://") || endpoint.startsWith("https://")
      ? endpoint
      : `${base}${path}`;

  const token = getAuthToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
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
      else if (errJson.error) errorMsg = errJson.error;
    } catch {}
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

function serializeBody(body: any): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof body === "string") return body;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  return JSON.stringify(body);
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: serializeBody(body),
    }),
  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: serializeBody(body),
    }),
  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: serializeBody(body),
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
  request,
};

export async function markTicketNoShow(ticketId: string, reason?: string) {
  return request<{ success: boolean; ticket: Ticket }>("/api/queue/no-show", {
    method: "POST",
    body: JSON.stringify({ ticketId, reason }),
  });
}

export async function getCompressionStatus(): Promise<any> {
  return request<any>("/api/admin/compression");
}

export async function updateCompressionSettings(settings: any): Promise<any> {
  return request<any>("/api/admin/compression", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

export async function runCompressionBenchmark(payload?: string): Promise<any> {
  return request<any>("/api/admin/compression/benchmark", {
    method: "POST",
    body: JSON.stringify({ payload }),
  });
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
      email?: string;
      username?: string;
      phone?: string;
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
  wifiSsid?: string;
  wifiPassword?: string;
  enableLoungeWifi?: boolean;
  enableScreenWakeLock?: boolean;
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
  },

  queue: {
    checkIn: (data: {
      salonSlug: string;
      customerName: string;
      customerPhone?: string;
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

    switchPreference: (ticketId: string, stylistId: string | null) =>
      request<{ success: boolean; ticket: Ticket }>("/api/queue/switch-preference", {
        method: "POST",
        body: JSON.stringify({ ticketId, stylistId }),
      }),

    updateServices: (ticketId: string, addOnIds: string[], serviceId?: string) =>
      request<{ success: boolean; ticket: Ticket }>("/api/queue/update-services", {
        method: "POST",
        body: JSON.stringify({ ticketId, addOnIds, serviceId }),
      }),

    pause: (ticketId: string, reason?: string) =>
      request<{ success: boolean; ticket: Ticket }>("/api/queue/pause", {
        method: "POST",
        body: JSON.stringify({ ticketId, reason }),
      }),

    resume: (ticketId: string) =>
      request<{ success: boolean; ticket: Ticket }>("/api/queue/resume", {
        method: "POST",
        body: JSON.stringify({ ticketId }),
      }),

    noShow: (ticketId: string, reason?: string) => markTicketNoShow(ticketId, reason),

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
  },


  admin: {
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
    getCompressionStatus: () => getCompressionStatus(),
    updateCompressionSettings: (settings: any) => updateCompressionSettings(settings),
    runCompressionBenchmark: (payload?: string) => runCompressionBenchmark(payload),
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
  },
};
