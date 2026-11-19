export function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const hostname = window.location.hostname;
    // When running locally on localhost or 127.0.0.1, always target local Elysia backend directly
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    }

    // On remote domains, if an explicit remote API URL is specified, honor it
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    // In production behind reverse proxy, use relative URL so Nginx/Next handles /api/
    return "";
  }

  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

export function getWsBaseUrl(): string {
  if (typeof window !== "undefined" && window.location) {
    const { protocol, host, hostname } = window.location;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    // 1. If explicit NEXT_PUBLIC_WS_URL is provided:
    if (process.env.NEXT_PUBLIC_WS_URL) {
      const explicitWsUrl = process.env.NEXT_PUBLIC_WS_URL.trim();

      // If client is on localhost, always honor explicit WS URL
      if (isLocalhost) {
        return explicitWsUrl;
      }

      // If client is on a remote domain and NEXT_PUBLIC_WS_URL points to a real remote host (not localhost), honor it directly
      if (!explicitWsUrl.includes("localhost") && !explicitWsUrl.includes("127.0.0.1")) {
        return explicitWsUrl;
      }
    }

    // 2. On localhost without explicit override, default to local Bun backend
    if (isLocalhost) {
      return "ws://localhost:3001/ws";
    }

    // 3. On remote domain behind SSL (prevents mobile mixed-content block)
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${host}/ws`;
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

export interface StaffLeave {
  id: string;
  salonId: string;
  stylistId: string;
  leaveDate: string;
  endDate?: string | null;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  appliedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAbsencePayload {
  stylistId: string;
  action: "UNIVERSAL_FAST_LINE" | "REASSIGN_STYLIST";
  targetStylistId?: string;
  reason?: string;
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
  loyaltyEnabled?: boolean;
  loyaltyStampGoal?: number;
  loyaltyReferrerBonus?: number;
  loyaltyRefereeDiscount?: number;
  loyaltyRewardDescription?: string;
  stylists: Stylist[];
  services: Service[];
  createdAt?: string;
}

export type BillingCycle = '1m' | '3m' | '6m' | '1y';

export type PlanStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  badge?: string | null;
  description?: string | null;
  price1m: number;
  price3m?: number | null;
  price6m?: number | null;
  price1y?: number | null;
  discountPct3m: number;
  discountPct6m: number;
  discountPct1y: number;
  cycle1mEnabled: boolean;
  cycle3mEnabled: boolean;
  cycle6mEnabled: boolean;
  cycle1yEnabled: boolean;
  maxBranches: number;
  maxStylistsPerBranch: number;
  features: string[];
  status: PlanStatus;
  isFeatured: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlanPayload {
  name: string;
  slug?: string;
  badge?: string | null;
  description?: string | null;
  price1m: number;
  price3m?: number | null;
  price6m?: number | null;
  price1y?: number | null;
  discountPct3m?: number | null;
  discountPct6m?: number | null;
  discountPct1y?: number | null;
  cycle1mEnabled?: boolean;
  cycle3mEnabled?: boolean;
  cycle6mEnabled?: boolean;
  cycle1yEnabled?: boolean;
  maxBranches: number;
  maxStylistsPerBranch: number;
  features: string[];
  status?: PlanStatus;
  isFeatured?: boolean;
  sortOrder?: number;
}

export type PaymentProvider = "UPI_QR" | "CASH" | "RAZORPAY" | "WALLET";

export type PaymentTargetType = "SUBSCRIPTION" | "QUEUE_TICKET" | "WALLET_TOPUP";

export type PaymentOrderStatus =
  | "PENDING"
  | "PENDING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"
  | "REJECTED";

export interface PaymentGatewayConfig {
  upiManualEnabled: boolean;
  upiVpa: string;
  upiMerchantName: string;
  cashEnabled: boolean;
  cashInstructions: string;
  razorpayEnabled: boolean;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  appointmentAdvanceType?: "FREE" | "FIXED_TOKEN" | "PERCENTAGE" | "FULL";
  appointmentTokenAmount?: number;
  appointmentPercentage?: number;
  appointmentConvenienceFee?: number;
  appointmentAllowFreeBooking?: boolean;
}

export interface PaymentOrder {
  id: string;
  targetType: PaymentTargetType;
  targetId: string;
  organizationId?: string | null;
  organizationName?: string | null;
  salonId?: string | null;
  customerId?: string | null;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerOrderId?: string | null;
  transactionRef?: string | null;
  utrNumber?: string | null;
  paymentProofNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  status: PaymentOrderStatus;
  paymentData?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  expiresAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrderResult {
  orderId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  expiresAt: string;
  paymentData: {
    upiString?: string;
    upiIntentUrl?: string;
    vpa?: string;
    payeeName?: string;
    razorpayOrderId?: string;
    razorpayKeyId?: string;
    cashInstructions?: string;
    [key: string]: any;
  };
}

export interface OrganizationSubscription {
  id: string;
  organizationId: string;
  planId: string;
  cycle: BillingCycle | "custom";
  startsAt: string;
  expiresAt: string;
  basePrice: number;
  couponId?: string | null;
  couponDiscount: number;
  walletDeducted: number;
  netAmountPaid: number;
  paymentMethod: string;
  paymentOrderId?: string | null;
  transactionRef?: string | null;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "GRACE_PERIOD";
  createdAt: string;
  updatedAt: string;
}

export type CouponTargetType = "SUBSCRIPTION" | "SALON_SERVICE";
export type CouponDiscountType = "PERCENT" | "FLAT";
export type CouponStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface Coupon {
  id: string;
  code: string;
  targetType: CouponTargetType;
  organizationId?: string | null;
  salonId?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  maxUses?: number | null;
  usedCount: number;
  maxUsesPerUser: number;
  isFirstTimeOnly?: boolean;
  validFrom: string;
  validUntil?: string | null;
  status: CouponStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplyCouponInput {
  code: string;
  targetType: CouponTargetType;
  orderAmount: number;
  userId?: string | null;
  organizationId?: string | null;
  salonId?: string | null;
}

export interface ApplyCouponResult {
  valid: boolean;
  message?: string;
  coupon?: {
    id: string;
    code: string;
    discountType: CouponDiscountType;
    discountValue: number;
    maxDiscountAmount?: number | null;
  };
  discountAmount: number;
  netPayable: number;
}

export interface CreateCouponPayload {
  code: string;
  targetType: CouponTargetType;
  organizationId?: string | null;
  salonId?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  maxUses?: number | null;
  maxUsesPerUser?: number;
  isFirstTimeOnly?: boolean;
  validFrom?: string;
  validUntil?: string | null;
  status?: CouponStatus;
}

export type WalletType = "OWNER" | "CONSUMER";
export type WalletTransactionType = "CREDIT" | "DEBIT";

export interface WalletTransaction {
  id: string;
  walletId: string;
  walletType: WalletType;
  ownerOrgId?: string | null;
  consumerPhone?: string | null;
  salonId?: string | null;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId?: string | null;
  createdAt: string;
}

export interface WalletBalanceResult {
  success: boolean;
  walletId: string;
  walletType: WalletType;
  balance: number;
  currency: string;
}

export interface ReferralStatsResult {
  success: boolean;
  code: string;
  commissionPercent?: number;
  friendDiscountPercent?: number;
  rewardCalculationBasis?: "NET_PAID" | "ORIGINAL_PRICE";
  totalReferred: number;
  convertedCount: number;
  pendingCount: number;
  totalEarned: number;
  totalFriendDiscounts: number;
  recentAttributions: Array<{
    id: string;
    referralType: string;
    referrerCode: string;
    referrerOrgId?: string | null;
    referrerOrgName?: string | null;
    referrerOrgSlug?: string | null;
    referredOrgId?: string | null;
    referredOrgName?: string | null;
    referredOrgSlug?: string | null;
    rewardAmount: number;
    originalAmount?: number;
    subscriptionDiscount?: number;
    friendDiscount?: number;
    netEligibleAmount?: number;
    rewardPercentage?: number;
    friendDiscountPercentage?: number;
    calculationBasis?: "NET_PAID" | "ORIGINAL_PRICE";
    status: string;
    createdAt: string;
  }>;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: "FREE" | "STARTER" | "PRO" | "ENTERPRISE" | "SOLO";
  planId?: string | null;
  maxBranches: number;
  maxStylistsPerBranch: number;
  allowCustomSmsGateway?: boolean;
  allowWhiteLabeling?: boolean;
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
  notes?: string | null;
  groomingTags?: string[];
  visitCount?: number;
  lastVisitedAt?: string | null;
  lastServiceName?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  couponId?: string | null;
  couponDiscountType?: "PERCENT" | "FLAT" | null;
  couponDiscountValue?: number | null;
  couponMaxDiscount?: number | null;
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
  b2bReferral?: {
    commissionPercent: number;
    refereeDiscountPercent: number;
    rewardCalculationBasis?: "NET_PAID" | "ORIGINAL_PRICE";
    maxUsesPerReferee?: number;
    enabled: boolean;
  };
  pwa?: {
    autoInstallPrompt: boolean;
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
  tier?: "FREE" | "STARTER" | "PRO" | "ENTERPRISE" | "SOLO";
  planId?: string;
  billingCycle?: string;
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
  partnerCode?: string;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const local = localStorage.getItem("engine_token") || localStorage.getItem("engine_session");
  if (local) return local;
  const partnerToken = localStorage.getItem("engine_partner_token");
  if (partnerToken) return partnerToken;
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

  if (typeof window !== "undefined" && !headers["x-partner-id"]) {
    try {
      const rawPartner = localStorage.getItem("engine_partner_data");
      if (rawPartner) {
        const p = JSON.parse(rawPartner);
        if (p?.id) headers["x-partner-id"] = p.id;
      }
    } catch {}
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

export interface SecuritySettings {
  id?: string;
  pinMaxAttempts: number;
  pinWindowSeconds: number;
  loginMaxAttempts: number;
  loginWindowSeconds: number;
  checkinMaxAttempts: number;
  checkinWindowSeconds: number;
  allowedCustomOrigins: string[];
  defaultCountryCode: string;
  allowedCountryCodes: string[];
  updatedAt?: string;
}

export const api = {
  auth: {
    checkUsername: (username: string) =>
      request<{
        success: boolean;
        available: boolean;
        username: string;
        reason?: string;
        suggestions: string[];
      }>(`/api/auth/check-username?username=${encodeURIComponent(username)}`),

    checkEmail: (email: string) =>
      request<{
        success: boolean;
        available: boolean;
        email: string;
        reason?: string;
      }>(`/api/auth/check-email?email=${encodeURIComponent(email)}`),

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

    getStaffMember: (userId: string) =>
      request<{ success: boolean; user: AuthUser & { hasPin?: boolean } }>(
        `/api/auth/staff/member/${userId}`
      ),

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

    getStaffServiceDurations: (stylistId: string) =>
      request<{ success: boolean; overrides: Record<string, number> }>(
        `/api/auth/staff/service-durations/${stylistId}`
      ),

    updateStaffServiceDurations: (data: {
      salonId: string;
      stylistId: string;
      overrides: Record<string, number | null>;
    }) =>
      request<{ success: boolean; overrides: Record<string, number>; message: string }>(
        "/api/auth/staff/service-durations",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),

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
    checkSlug: (slug: string) =>
      request<{
        success: boolean;
        available: boolean;
        slug: string;
        reason?: string;
        suggestions: string[];
      }>(`/api/salons/check-slug?slug=${encodeURIComponent(slug)}`),

    getAll: () => request<Salon[]>("/api/salons"),

    get: (slugOrId: string) =>
      request<{ salon: Salon; activeQueueCount: number }>(`/api/salons/${slugOrId}`),

    getQuota: (slugOrId: string) =>
      request<{
        success: boolean;
        allowed: boolean;
        current: number;
        max: number;
        tier: string;
        planId?: string | null;
      }>(`/api/salons/${slugOrId}/quota`),

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

    updatePlan: (orgId: string, planId: string) =>
      request<{ success: boolean; organization: Organization; message: string }>(
        `/api/salons/organizations/${orgId}/plan`,
        {
          method: "POST",
          body: JSON.stringify({ planId }),
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
  loyaltyEnabled?: boolean;
  loyaltyStampGoal?: number;
  loyaltyReferrerBonus?: number;
  loyaltyRefereeDiscount?: number;
  loyaltyRewardDescription?: string;
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

    updateService: (
      salonId: string,
      serviceId: string,
      data: {
        name?: string;
        basePrice?: number;
        estimatedDurationMinutes?: number;
        pricingType?: "FIXED" | "STARTING_AT" | "FLEXIBLE_CHAIR";
        isAddOn?: boolean;
        icon?: string;
      }
    ) =>
      request<{ success: boolean }>(`/api/salons/${salonId}/services/${serviceId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    getMetrics: (salonId: string) =>
      request<{
        todayServedCount: number;
        todayRevenue: number;
        averageServiceDurationMinutes: number;
        stylistBreakdown: Record<string, number>;
      }>(`/api/salons/${salonId}/metrics`),

    getStaffLeaves: (salonId: string, options?: { stylistId?: string; date?: string }) => {
      const q = new URLSearchParams();
      if (options?.stylistId) q.set("stylistId", options.stylistId);
      if (options?.date) q.set("date", options.date);
      const queryStr = q.toString() ? `?${q.toString()}` : "";
      return request<{ success: boolean; leaves: StaffLeave[] }>(`/api/salons/${salonId}/staff-leaves${queryStr}`);
    },

    createStaffLeave: (
      salonId: string,
      data: {
        stylistId: string;
        leaveDate: string;
        endDate?: string;
        reason?: string;
        status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
        appliedBy?: string;
      }
    ) =>
      request<{ success: boolean; leave: StaffLeave }>(`/api/salons/${salonId}/staff-leaves`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateStaffLeaveStatus: (
      salonId: string,
      leaveId: string,
      status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
    ) =>
      request<{ success: boolean; leave: StaffLeave }>(`/api/salons/${salonId}/staff-leaves/${leaveId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    getStylistStrandedTickets: (salonId: string, stylistId: string) =>
      request<{ success: boolean; count: number; tickets: Ticket[] }>(
        `/api/salons/${salonId}/stylists/${stylistId}/stranded-tickets`
      ),

    handleStaffAbsence: (salonId: string, data: StaffAbsencePayload) =>
      request<{ success: boolean; affectedCount: number; message: string; tickets: Ticket[] }>(
        `/api/salons/${salonId}/staff-leaves/handle-absence`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),
  },

  queue: {
    checkIn: (data: {
      salonSlug: string;
      customerName: string;
      customerPhone?: string;
      serviceId: string;
      addOnIds?: string[];
      stylistId?: string | null;
      couponCode?: string;
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

    getStaffReport: (
      salonId: string,
      stylistId?: string,
      timeframe?: string,
      options?: { date?: string; startDate?: string; endDate?: string }
    ) => {
      const queryParams = new URLSearchParams();
      if (stylistId) queryParams.set("stylistId", stylistId);
      if (timeframe) queryParams.set("timeframe", timeframe);
      if (options?.date) queryParams.set("date", options.date);
      if (options?.startDate) queryParams.set("startDate", options.startDate);
      if (options?.endDate) queryParams.set("endDate", options.endDate);
      const qs = queryParams.toString();
      return request<{
        success: boolean;
        timeframe?: string;
        selectedDate?: string;
        totalServedToday: number;
        totalRevenueToday: number;
        cashRevenue?: number;
        onlineRevenue?: number;
        avgActualMinutes: number;
        servicesCountMap: Record<string, number>;
        dailyTrends?: Array<{ date: string; served: number; revenue: number; cash: number; online: number }>;
        completedTickets: any[];
      }>(`/api/queue/staff-report/${salonId}${qs ? `?${qs}` : ""}`);
    },

    getStaffDailyReport: (salonId: string, stylistId?: string) =>
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
      paymentAmount?: number,
      couponCode?: string,
      couponDiscount?: number
    ) =>
      request<{ success: boolean; ticket: Ticket }>("/api/queue/finish", {
        method: "POST",
        body: JSON.stringify({ ticketId, paymentStatus, paymentAmount, couponCode, couponDiscount }),
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

    transferChair: (data: { ticketId: string; targetStylistId: string; reason?: string }) =>
      request<{ success: boolean; ticket: Ticket }>("/api/queue/transfer-chair", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateServices: (ticketId: string, addOnIds: string[], serviceId?: string) =>
      request<{ success: boolean; ticket: Ticket }>("/api/queue/update-services", {
        method: "POST",
        body: JSON.stringify({ ticketId, addOnIds, serviceId }),
      }),

    updateNotes: (ticketId: string, params: { notes?: string; groomingTags?: string[] }) =>
      request<{ success: boolean; ticket: Ticket }>("/api/queue/update-notes", {
        method: "POST",
        body: JSON.stringify({ ticketId, ...params }),
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
    getPaymentConfig: () =>
      request<{ success: boolean; config: PaymentGatewayConfig }>("/api/payments/admin/config"),
    updatePaymentConfig: (payload: Partial<PaymentGatewayConfig>) =>
      request<{ success: boolean; config: PaymentGatewayConfig; message: string }>(
        "/api/payments/admin/config",
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      ),
    getPendingPayments: () =>
      request<{ success: boolean; orders: PaymentOrder[] }>("/api/payments/admin/pending"),
    getAllTransactions: (options?: { status?: string; provider?: string; limit?: number }) => {
      const params = new URLSearchParams();
      if (options?.status && options.status !== "ALL") params.set("status", options.status);
      if (options?.provider && options.provider !== "ALL") params.set("provider", options.provider);
      if (options?.limit) params.set("limit", String(options.limit));
      const qs = params.toString() ? `?${params.toString()}` : "";
      return request<{ success: boolean; orders: PaymentOrder[] }>(`/api/payments/admin/transactions${qs}`);
    },
    approvePayment: (orderId: string, adminId?: string) =>
      request<{
        success: boolean;
        orderId: string;
        status: PaymentOrderStatus;
        subscription?: OrganizationSubscription | null;
        message: string;
      }>("/api/payments/admin/approve", {
        method: "POST",
        body: JSON.stringify({ orderId, adminId }),
      }),
    rejectPayment: (orderId: string, reason: string, adminId?: string) =>
      request<{
        success: boolean;
        orderId: string;
        status: PaymentOrderStatus;
        message: string;
      }>("/api/payments/admin/reject", {
        method: "POST",
        body: JSON.stringify({ orderId, reason, adminId }),
      }),
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
    getSecuritySettings: () =>
      request<{ success: boolean; settings: SecuritySettings }>("/api/admin/security/settings"),
    updateSecuritySettings: (payload: Partial<SecuritySettings>) =>
      request<{ success: boolean; settings: SecuritySettings }>("/api/admin/security/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),

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

  plans: {
    getAll: (options?: { status?: string }) => {
      const q = new URLSearchParams();
      if (options?.status) q.set("status", options.status);
      const queryStr = q.toString();
      return request<{ success: boolean; plans: SubscriptionPlan[] }>(
        `/api/plans${queryStr ? `?${queryStr}` : ""}`
      );
    },
    get: (idOrSlug: string) =>
      request<{ success: boolean; plan: SubscriptionPlan }>(`/api/plans/${idOrSlug}`),
    create: (data: CreatePlanPayload) =>
      request<{ success: boolean; plan: SubscriptionPlan }>("/api/plans", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<CreatePlanPayload>) =>
      request<{ success: boolean; plan: SubscriptionPlan }>(`/api/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    archive: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/plans/${id}`, {
        method: "DELETE",
      }),
    subscribe: (organizationId: string, planId: string) =>
      request<{ success: boolean; organization: Organization; message: string }>(
        `/api/salons/organizations/${organizationId}/plan`,
        {
          method: "POST",
          body: JSON.stringify({ planId }),
        }
      ),
  },

  payments: {
    getConfig: () =>
      request<{ success: boolean; config: PaymentGatewayConfig }>("/api/payments/config"),

    createOrder: (payload: {
      targetType: PaymentTargetType;
      targetId: string;
      amount: number;
      provider: PaymentProvider;
      currency?: string;
      organizationId?: string | null;
      salonId?: string | null;
      customerId?: string | null;
      metadata?: Record<string, any>;
    }) =>
      request<{ success: boolean; order: PaymentOrderResult }>("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    submitManual: (payload: {
      orderId: string;
      provider: "UPI_QR" | "CASH";
      utrNumber?: string;
      notes?: string;
    }) =>
      request<{
        success: boolean;
        orderId: string;
        status: PaymentOrderStatus;
        utrNumber?: string | null;
        message: string;
      }>("/api/payments/submit-manual", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    verify: (payload: {
      orderId: string;
      provider: PaymentProvider;
      transactionRef?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      notes?: string;
    }) =>
      request<{
        success: boolean;
        orderId: string;
        status: PaymentOrderStatus;
        transactionRef: string;
        message?: string;
        subscription?: OrganizationSubscription | null;
      }>("/api/payments/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getOrder: (id: string) =>
      request<{ success: boolean; order: PaymentOrder }>(`/api/payments/${id}`),

    getSubscription: (orgId: string) =>
      request<{ success: boolean; subscription: OrganizationSubscription | null }>(
        `/api/payments/subscriptions/${orgId}`
      ),

    getOrders: (params?: { organizationId?: string; salonId?: string; status?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.organizationId) q.set("organizationId", params.organizationId);
      if (params?.salonId) q.set("salonId", params.salonId);
      if (params?.status) q.set("status", params.status);
      if (params?.limit) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<{ success: boolean; orders: PaymentOrder[] }>(`/api/payments/orders${qs ? `?${qs}` : ""}`);
    },
  },

  coupons: {
    getAutoReferral: (params?: { salonId?: string; organizationId?: string; cookieCode?: string }) => {
      const q = new URLSearchParams();
      if (params?.salonId) q.set("salonId", params.salonId);
      if (params?.organizationId) q.set("organizationId", params.organizationId);
      if (params?.cookieCode) q.set("cookieCode", params.cookieCode);
      const qs = q.toString();
      return request<{
        success: boolean;
        hasReferralDiscount: boolean;
        partnerCode?: string | null;
        partnerName?: string | null;
        discountPercent: number;
        message?: string;
      }>(`/api/coupons/auto-referral${qs ? `?${qs}` : ""}`);
    },

    apply: (payload: ApplyCouponInput) =>
      request<{
        success: boolean;
        valid: boolean;
        message?: string;
        coupon?: {
          id: string;
          code: string;
          discountType: CouponDiscountType;
          discountValue: number;
          maxDiscountAmount?: number | null;
        };
        discountAmount: number;
        netPayable: number;
      }>("/api/coupons/apply", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getAll: (params?: {
      targetType?: CouponTargetType;
      salonId?: string;
      organizationId?: string;
      status?: CouponStatus;
    }) => {
      const q = new URLSearchParams();
      if (params?.targetType) q.set("targetType", params.targetType);
      if (params?.salonId) q.set("salonId", params.salonId);
      if (params?.organizationId) q.set("organizationId", params.organizationId);
      if (params?.status) q.set("status", params.status);
      const qs = q.toString();
      return request<{ success: boolean; coupons: Coupon[] }>(`/api/coupons${qs ? `?${qs}` : ""}`);
    },

    create: (data: CreateCouponPayload) =>
      request<{ success: boolean; coupon: Coupon }>("/api/coupons", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<CreateCouponPayload>) =>
      request<{ success: boolean; coupon: Coupon }>(`/api/coupons/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/coupons/${id}`, {
        method: "DELETE",
      }),
  },

  wallets: {
    getBalance: (walletType: WalletType, identifier: string, salonId?: string) => {
      const q = new URLSearchParams({ walletType, identifier });
      if (salonId) q.set("salonId", salonId);
      return request<WalletBalanceResult>(`/api/wallets/balance?${q.toString()}`);
    },

    getPassbook: (walletType: WalletType, identifier: string, salonId?: string, limit?: number) => {
      const q = new URLSearchParams({ walletType, identifier });
      if (salonId) q.set("salonId", salonId);
      if (limit) q.set("limit", limit.toString());
      return request<{ success: boolean; transactions: WalletTransaction[] }>(
        `/api/wallets/passbook?${q.toString()}`
      );
    },

    credit: (data: {
      walletType: WalletType;
      identifier: string;
      amount: number;
      reason: string;
      salonId?: string;
      referenceId?: string;
    }) =>
      request<{ success: boolean; wallet: any; transaction: WalletTransaction }>(
        "/api/wallets/credit",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),
  },

  referrals: {
    getCode: (params: { orgId?: string; slug?: string; phone?: string }) => {
      const q = new URLSearchParams();
      if (params.orgId) q.set("orgId", params.orgId);
      if (params.slug) q.set("slug", params.slug);
      if (params.phone) q.set("phone", params.phone);
      return request<{ success: boolean; code: string; shareUrl: string }>(
        `/api/referrals/code?${q.toString()}`
      );
    },

    getStats: (params: { referrerOrgId?: string; referrerPhone?: string; salonId?: string }) => {
      const q = new URLSearchParams();
      if (params.referrerOrgId) q.set("referrerOrgId", params.referrerOrgId);
      if (params.referrerPhone) q.set("referrerPhone", params.referrerPhone);
      if (params.salonId) q.set("salonId", params.salonId);
      return request<ReferralStatsResult>(`/api/referrals/stats?${q.toString()}`);
    },

    attribute: (data: {
      referralType: "B2B_OWNER" | "B2C_CONSUMER";
      referrerCode: string;
      referredOrgId?: string;
      referredPhone?: string;
      salonId?: string;
    }) =>
      request<{ success: boolean; attribution: any }>("/api/referrals/attribute", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    getClientLoyalty: (salonId: string) =>
      request<{
        success: boolean;
        salonId: string;
        salonName: string;
        loyaltySettings: {
          enabled: boolean;
          stampGoal: number;
          referrerBonus: number;
          refereeDiscount: number;
          rewardDescription: string;
        };
        customerAdvocates: Array<{
          name: string;
          phone: string;
          referredCount: number;
          totalEarned: number;
          completedVisits: number;
        }>;
        stats: {
          totalCompletedVisits: number;
          totalLoyalClients: number;
          totalReferrals: number;
          totalRewardsDisbursed: number;
        };
      }>(`/api/referrals/client-loyalty?salonId=${encodeURIComponent(salonId)}`),
  },

  loyalty: {
    getCustomerCards: (phone: string) =>
      request<{
        success: boolean;
        phone: string;
        totalSalonsVisited: number;
        cards: Array<{
          id: string;
          salonId: string;
          salonName: string;
          salonSlug: string;
          currentStamps: number;
          stampGoal: number;
          totalLifetimeStamps: number;
          completedMilestones: number;
          rewardServiceName: string;
          rewardServicePrice: number;
          progressPercent: number;
          activeVouchers: Array<{
            id: string;
            voucherCode: string;
            salonId: string;
            rewardServiceId: string;
            rewardServiceName: string;
            rewardServicePrice: number;
            status: string;
            unlockedAt: string;
            expiresAt?: string | null;
          }>;
        }>;
        activeVouchers: Array<{
          id: string;
          voucherCode: string;
          salonId: string;
          rewardServiceId: string;
          rewardServiceName: string;
          rewardServicePrice: number;
          status: string;
          unlockedAt: string;
          expiresAt?: string | null;
        }>;
      }>(`/api/loyalty/customer-cards?phone=${encodeURIComponent(phone)}`),

    getCard: (salonId: string, phone: string) =>
      request<{
        success: boolean;
        card: {
          salonId: string;
          customerPhone: string;
          currentStamps: number;
          totalLifetimeStamps: number;
          completedMilestones: number;
        };
        stampGoal: number;
        rewardServiceName: string;
        rewardServicePrice: number;
        activeVouchers: Array<any>;
      }>(`/api/loyalty/card?salonId=${encodeURIComponent(salonId)}&phone=${encodeURIComponent(phone)}`),

    redeem: (data: { voucherCode: string; salonId: string; ticketId: string }) =>
      request<{ success: boolean; voucher: any; message: string }>("/api/loyalty/redeem", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    getSalonSettings: (salonId: string) =>
      request<{
        success: boolean;
        salon: {
          id: string;
          name: string;
          slug: string;
          loyaltyEnabled: boolean;
          loyaltyStampGoal: number;
          loyaltyRewardServiceId?: string | null;
          loyaltyRewardServiceName?: string | null;
          loyaltyCooldownHours: number;
          loyaltyVoucherValidityDays: number;
          loyaltyReferrerBonus: number;
          loyaltyRefereeDiscount: number;
          loyaltyRewardDescription: string;
        };
        availableServices: Array<{
          id: string;
          name: string;
          basePrice: number;
          estimatedDurationMinutes: number;
          isAddOn: boolean;
        }>;
        stats: {
          totalCards: number;
          totalStamps: number;
          activeVouchers: number;
          redeemedVouchers: number;
        };
      }>(`/api/loyalty/salon-settings?salonId=${encodeURIComponent(salonId)}`),

    updateSalonSettings: (data: {
      salonId: string;
      enabled?: boolean;
      stampGoal?: number;
      rewardServiceId?: string;
      rewardServiceName?: string;
      cooldownHours?: number;
      voucherValidityDays?: number;
      referrerBonus?: number;
      refereeDiscount?: number;
      rewardDescription?: string;
    }) =>
      request<{ success: boolean; salon: any; message: string }>("/api/loyalty/salon-settings", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    getAdminStats: () =>
      request<{
        success: boolean;
        stats: {
          totalCards: number;
          totalStamps: number;
          activeVouchers: number;
          redeemedVouchers: number;
        };
      }>("/api/loyalty/admin/stats"),
  },

  customer: {
    getProfile: (phone: string) =>
      request<{
        success: boolean;
        profile: {
          phone: string;
          name: string;
          groomingSpecs?: string | null;
          preferredBarberId?: string | null;
          preferredBarberName?: string | null;
          notes?: string | null;
        };
      }>(`/api/loyalty/customer/profile?phone=${encodeURIComponent(phone)}`),

    updateProfile: (data: {
      phone: string;
      groomingSpecs?: string;
      preferredBarberId?: string;
      preferredBarberName?: string;
      notes?: string;
    }) =>
      request<{ success: boolean; profile: any; message: string }>("/api/loyalty/customer/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  appointments: {
    getPolicy: (slug: string) =>
      request<{
        success: boolean;
        salonId: string;
        salonName: string;
        policy: {
          enabled: boolean;
          policyType: "FREE" | "FIXED_TOKEN" | "PERCENTAGE" | "FULL";
          tokenAmount: number;
          percentage?: number;
          convenienceFee: number;
          allowFreeBooking: boolean;
          cancellationCutoffHours: number;
          isCustomized?: boolean;
        };
      }>(`/api/v1/salons/${slug}/appointments/policy`),

    updatePolicy: (slug: string, policy: any) =>
      request<{
        success: boolean;
        message: string;
        policy: any;
      }>(`/api/v1/salons/${slug}/appointments/policy`, {
        method: "PUT",
        body: JSON.stringify(policy),
      }),

    resetPolicyToDefault: (slug: string) =>
      request<{
        success: boolean;
        message: string;
        policy: any;
      }>(`/api/v1/salons/${slug}/appointments/policy/reset`, {
        method: "POST",
      }),

    getSlots: (slug: string, date: string, stylistId?: string) => {
      const q = new URLSearchParams({ date });
      if (stylistId) q.set("stylistId", stylistId);
      return request<{ date: string; slots: AppointmentSlot[] }>(
        `/api/v1/salons/${slug}/appointments/slots?${q.toString()}`
      );
    },

    list: (slug: string, params?: { date?: string; status?: string; stylistId?: string }) => {
      const q = new URLSearchParams();
      if (params?.date) q.set("date", params.date);
      if (params?.status) q.set("status", params.status);
      if (params?.stylistId) q.set("stylistId", params.stylistId);
      return request<{ success: boolean; count: number; appointments: Appointment[] }>(
        `/api/v1/salons/${slug}/appointments?${q.toString()}`
      );
    },

    getByCustomer: (phone: string) =>
      request<{
        success: boolean;
        count: number;
        appointments: (Appointment & {
          salonName: string;
          salonSlug: string;
          salonAddress?: string;
        })[];
      }>(`/api/v1/customer/appointments?phone=${encodeURIComponent(phone)}`),

    getById: (id: string) =>
      request<{ success: boolean; appointment: Appointment; salon: Salon }>(
        `/api/v1/appointments/${id}`
      ),

    initiate: (data: {
      salonSlug: string;
      serviceId: string;
      addOnIds?: string[];
      stylistId?: string | null;
      date: string;
      slotTime: string;
      customerName: string;
      customerPhone: string;
      advanceType?: "PARTIAL" | "MINIMUM" | "TOKEN" | "FULL" | "FREE" | "CUSTOM" | "PAY_AT_SALON";
      customAdvanceAmount?: number;
      couponCode?: string;
    }) =>
      request<{
        success: boolean;
        appointment: Appointment;
        appointmentId: string;
        advanceAmount: number;
        policy?: any;
        minRequiredAdvance?: number;
        isFree?: boolean;
        razorpayOrderId: string;
        upiQrString: string;
      }>("/api/v1/appointments/initiate", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    confirm: (data: { appointmentId: string; paymentId?: string; signature?: string }) =>
      request<{ success: boolean; appointment: Appointment }>("/api/v1/appointments/confirm", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    reschedule: (
      id: string,
      data: { newDate: string; newSlotTime: string; newStylistId?: string | null }
    ) =>
      request<{ success: boolean; appointment: Appointment }>(
        `/api/v1/appointments/${id}/reschedule`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),

    checkIn: (id: string) =>
      request<{ success: boolean; appointment: Appointment }>(
        `/api/v1/appointments/${id}/check-in`,
        {
          method: "POST",
        }
      ),

    cancel: (id: string) =>
      request<{ success: boolean; appointment: Appointment; refundPercentage: number }>(
        `/api/v1/appointments/${id}/cancel`,
        {
          method: "POST",
        }
      ),

    noShow: (id: string) =>
      request<{ success: boolean; appointment: Appointment }>(
        `/api/v1/appointments/${id}/no-show`,
        {
          method: "POST",
        }
      ),

    seat: (id: string, stylistId?: string) =>
      request<{ success: boolean; appointment: Appointment }>(
        `/api/v1/appointments/${id}/seat`,
        {
          method: "POST",
          body: JSON.stringify({ stylistId }),
        }
      ),

    complete: (id: string) =>
      request<{ success: boolean; appointment: Appointment }>(
        `/api/v1/appointments/${id}/complete`,
        {
          method: "POST",
        }
      ),

    getPayouts: (slug: string, status?: string) => {
      const q = new URLSearchParams();
      if (status) q.set("status", status);
      return request<{
        success: boolean;
        salonId: string;
        salonName: string;
        payoutVpa: string;
        summary: {
          grossTotal: number;
          netTotal: number;
          gatewayTotal: number;
          platformTotal: number;
          payoutCount: number;
        };
        payouts: PayoutRecord[];
      }>(`/api/v1/salons/${slug}/payouts?${q.toString()}`);
    },

    getAdminPayouts: (status?: string) => {
      const q = new URLSearchParams();
      if (status) q.set("status", status);
      return request<{
        success: boolean;
        summary: {
          grossTotal: number;
          netDisbursed: number;
          pendingDisbursal: number;
          platformRevenue: number;
          gatewayFees: number;
          totalBatches: number;
        };
        payouts: PayoutRecord[];
      }>(`/api/v1/admin/payouts?${q.toString()}`);
    },

    settleDaily: (date?: string, salonId?: string) =>
      request<{ success: boolean; settledBatchesCount: number; batches: PayoutRecord[] }>(
        "/api/v1/admin/payouts/settle-daily",
        {
          method: "POST",
          body: JSON.stringify({ date, salonId }),
        }
      ),

    releasePayout: (id: string) =>
      request<{ success: boolean; payout: PayoutRecord }>(
        `/api/v1/admin/payouts/${id}/release`,
        {
          method: "POST",
        }
      ),
  },
};

export type AppointmentStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_CHAIR"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "RESCHEDULED";

export type EscrowStatus = "HELD" | "RELEASED_TO_OWNER" | "REFUNDED_TO_CUSTOMER" | "PARTIAL_SPLIT";

export interface Appointment {
  id: string;
  salonId: string;
  stylistId?: string | null;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  scheduledDate: string;
  slotStartTime: string;
  slotEndTime: string;
  durationMinutes: number;
  advanceAmount: number;
  totalPrice: number;
  paymentMethod: string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  escrowStatus: EscrowStatus;
  status: AppointmentStatus;
  rescheduledFromId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppointmentSlot {
  time: string;
  available: boolean;
  reason?: string;
  stylistId?: string;
}

export interface PayoutRecord {
  id: string;
  salonId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  gatewayFee: number;
  platformFee: number;
  netPayout: number;
  payoutVpa?: string | null;
  payoutReferenceId?: string | null;
  status: "PENDING" | "PROCESSING" | "SETTLED" | "FAILED";
  settledAt?: string | null;
  createdAt?: string;
}
