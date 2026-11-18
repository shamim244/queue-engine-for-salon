import { apiClient, getApiBaseUrl } from "./api";

export interface PartnerSession {
  token: string;
  partner: any;
}

const PARTNER_TOKEN_KEY = "engine_partner_token";
const PARTNER_DATA_KEY = "engine_partner_data";

export function getStoredPartnerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PARTNER_TOKEN_KEY);
}

export function getStoredPartner(): any | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PARTNER_DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setPartnerSession(token: string, partner: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PARTNER_TOKEN_KEY, token);
  localStorage.setItem(PARTNER_DATA_KEY, JSON.stringify(partner));
}

export function clearPartnerSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PARTNER_TOKEN_KEY);
  localStorage.removeItem(PARTNER_DATA_KEY);
}

function getPartnerHeaders(): HeadersInit {
  const token = getStoredPartnerToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    const partner = getStoredPartner();
    if (partner?.id) {
      headers["x-partner-id"] = partner.id;
    }
  }
  return headers;
}

export const partnerApi = {
  async apply(payload: {
    fullName: string;
    phone: string;
    city: string;
    persona: string;
    email?: string;
    password?: string;
    payoutUpiId?: string;
    payoutHolderName?: string;
    payoutBankName?: string;
    payoutBankAccount?: string;
    payoutBankIfsc?: string;
    payoutAccountType?: string;
    pitchNotes?: string;
    referralCode?: string;
  }) {
    return apiClient.post<{ success: boolean; partner: any; message: string }>("/api/v1/partners/apply", payload);
  },

  async login(loginInput: string | { identifier: string; password?: string; phone?: string }, otp?: string) {
    let payload: any;
    if (typeof loginInput === "string") {
      payload = { phone: loginInput, otp };
    } else {
      payload = loginInput;
    }

    const res = await apiClient.post<{ success: boolean; token: string; partner: any; message?: string }>("/api/v1/partners/login", payload);
    if (res.success && res.token && res.partner) {
      setPartnerSession(res.token, res.partner);
    }
    return res;
  },

  async verifyCode(code: string, planTier: string = "PRO") {
    return apiClient.get<{
      success: boolean;
      valid: boolean;
      isValid?: boolean;
      partner?: any;
      discount?: {
        type: string;
        value: number;
        grossPlanPrice: number;
        discountAmount: number;
        netPayableAmount: number;
        message: string;
      };
      message?: string;
    }>(`/api/v1/partners/verify-code?code=${encodeURIComponent(code)}&plan=${encodeURIComponent(planTier)}`);
  },

  async checkReferralCode(code: string, excludeId?: string) {
    const url = `/api/v1/partners/check-code?code=${encodeURIComponent(code)}${excludeId ? `&excludeId=${encodeURIComponent(excludeId)}` : ""}`;
    return apiClient.get<{
      success: boolean;
      available: boolean;
      code: string;
      collisionType?: string;
      reason?: string;
      suggestions: string[];
    }>(url);
  },

  async getMe() {
    return apiClient.get<{ success: boolean; partner: any; wallet: any; stats: any }>("/api/v1/partners/me", {
      headers: getPartnerHeaders(),
    });
  },

  async updatePayoutMethods(payload: {
    payoutUpiId?: string;
    payoutHolderName?: string;
    payoutBankName?: string;
    payoutBankAccount?: string;
    payoutBankIfsc?: string;
    payoutAccountType?: string;
  }) {
    return apiClient.put<{ success: boolean; partner: any; message: string }>("/api/v1/partners/me/payout-methods", payload, {
      headers: getPartnerHeaders(),
    });
  },

  async updateProfile(updates: any) {
    return apiClient.patch<{ success: boolean; partner: any }>("/api/v1/partners/me/profile", updates, {
      headers: getPartnerHeaders(),
    });
  },

  async changePassword(payload: { currentPassword?: string; newPassword: string }) {
    return apiClient.put<{ success: boolean; partner: any; message: string }>("/api/v1/partners/me/password", payload, {
      headers: getPartnerHeaders(),
    });
  },

  async updateReferralCode(referralCode: string) {
    const res = await apiClient.put<{ success: boolean; partner: any; message: string }>("/api/v1/partners/me/referral-code", {
      referralCode: referralCode.trim().toUpperCase(),
    }, {
      headers: getPartnerHeaders(),
    });
    if (res.success && res.partner) {
      const currentToken = getStoredPartnerToken();
      if (currentToken) {
        setPartnerSession(currentToken, res.partner);
      }
    }
    return res;
  },

  async checkCodeAvailability(
    code: string,
    options?: { excludeSelf?: boolean; excludeId?: string }
  ) {
    const params = new URLSearchParams({ code: code.trim().toUpperCase() });
    if (options?.excludeSelf) params.set("excludeSelf", "true");
    if (options?.excludeId) params.set("excludeId", options.excludeId);
    return apiClient.get<{
      success: boolean;
      available: boolean;
      message: string;
      collisionType?: string;
      suggestions?: string[];
    }>(
      `/api/v1/partners/check-code-availability?${params.toString()}`,
      options?.excludeSelf ? { headers: getPartnerHeaders() } : undefined
    );
  },

  async getSalons() {
    return apiClient.get<{ success: boolean; salons: any[] }>("/api/v1/partners/me/salons", {
      headers: getPartnerHeaders(),
    });
  },

  async getLedger() {
    return apiClient.get<{ success: boolean; wallet: any; ledger: any[]; payouts: any[] }>("/api/v1/partners/me/ledger", {
      headers: getPartnerHeaders(),
    });
  },

  async requestPayout(payload: { amount: number; payoutMethod: string; payoutTarget?: string }) {
    return apiClient.post<{ success: boolean; payout: any; wallet: any; message: string }>("/api/v1/partners/me/payout", payload, {
      headers: getPartnerHeaders(),
    });
  },

  async assistedOnboard(payload: {
    salonName: string;
    ownerPhone: string;
    ownerName: string;
    address?: string;
    currency?: string;
    stylists?: any[];
    services?: any[];
  }) {
    return apiClient.post<{ success: boolean; salon: any; attribution: any; message: string }>(
      "/api/v1/partners/assisted-onboard",
      payload,
      {
        headers: getPartnerHeaders(),
      }
    );
  },

  async getNotifications() {
    return apiClient.get<{ success: boolean; notifications: any[] }>("/api/v1/partners/me/notifications", {
      headers: getPartnerHeaders(),
    });
  },

  async markNotificationRead(id: string) {
    return apiClient.patch<{ success: boolean }>(`/api/v1/partners/me/notifications/${id}/read`, {}, {
      headers: getPartnerHeaders(),
    });
  },

  async getMarketingContent() {
    return apiClient.get<{ success: boolean; content: any }>("/api/v1/partners/marketing-content");
  },

  logout() {
    clearPartnerSession();
  },
};

export const adminPartnerApi = {
  async onboardPartner(payload: {
    fullName: string;
    phone: string;
    city: string;
    persona?: string;
    email?: string;
    password?: string;
    referralCode?: string;
    commissionModel?: string;
    commissionPercent?: number;
    bountyAmount?: number;
    durationType?: string;
    payoutUpiId?: string;
    pitchNotes?: string;
    countryCode?: string;
  }) {
    return apiClient.post<{ success: boolean; partner: any; message: string }>(
      "/api/v1/admin/partners/onboard",
      payload
    );
  },

  async checkCodeAvailability(code: string, excludeId?: string) {
    const params = new URLSearchParams({ code: code.trim().toUpperCase() });
    if (excludeId) params.set("excludeId", excludeId);
    return apiClient.get<{
      success: boolean;
      available: boolean;
      message: string;
      collisionType?: string;
      suggestions?: string[];
    }>(
      `/api/v1/partners/check-code-availability?${params.toString()}`
    );
  },

  async listPartners(filter?: { persona?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filter?.persona) params.set("persona", filter.persona);
    if (filter?.status) params.set("status", filter.status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ success: boolean; partners: any[] }>(`/api/v1/admin/partners${qs}`);
  },

  async getPartner(id: string) {
    return apiClient.get<{
      success: boolean;
      partner: any;
      wallet: any;
      attributions: any[];
      ledger: any[];
      payouts: any[];
    }>(`/api/v1/admin/partners/${id}`);
  },

  async updateStatus(id: string, status: string) {
    return apiClient.patch<{ success: boolean; partner: any; message: string }>(`/api/v1/admin/partners/${id}/status`, {
      status,
    });
  },

  async updateCommission(id: string, terms: any) {
    return apiClient.patch<{ success: boolean; partner: any; message: string }>(`/api/v1/admin/partners/${id}/commission`, terms);
  },

  async setPassword(id: string, password: string) {
    return apiClient.post<{ success: boolean; partner?: any; message: string }>(`/api/v1/admin/partners/${id}/password`, {
      password,
    });
  },

  async updateReferralCode(id: string, referralCode: string) {
    return apiClient.patch<{ success: boolean; partner: any; message: string }>(`/api/v1/admin/partners/${id}/referral-code`, {
      referralCode: referralCode.trim().toUpperCase(),
    });
  },

  async listPayouts() {
    return apiClient.get<{ success: boolean; payouts: any[] }>("/api/v1/admin/partners/payouts");
  },

  async settlePayout(id: string, payload: { utrReference: string; adminNotes?: string }) {
    return apiClient.post<{ success: boolean; payout: any; message: string }>(`/api/v1/admin/partners/payouts/${id}/settle`, payload);
  },

  async rejectPayout(id: string, reason: string) {
    return apiClient.post<{ success: boolean; payout: any; message: string }>(`/api/v1/admin/partners/payouts/${id}/reject`, {
      reason,
    });
  },

  async getSettings() {
    return apiClient.get<{ success: boolean; settings: any }>("/api/v1/admin/partners/settings");
  },

  async updateSettings(payload: any) {
    return apiClient.put<{ success: boolean; settings: any; message: string }>("/api/v1/admin/partners/settings", payload);
  },

  async getMarketingContent() {
    return apiClient.get<{ success: boolean; content: any }>("/api/v1/admin/partners/marketing-content");
  },

  async updateMarketingContent(payload: any) {
    return apiClient.put<{ success: boolean; content: any; message: string }>("/api/v1/admin/partners/marketing-content", payload);
  },

  async listAttributions() {
    return apiClient.get<{ success: boolean; attributions: any[] }>("/api/v1/admin/partners/attributions");
  },

  async manualAttribution(salonId: string, partnerId: string) {
    return apiClient.post<{ success: boolean; attribution: any; message: string }>("/api/v1/admin/partners/attributions/manual", {
      salonId,
      partnerId,
    });
  },

  async reassignAttribution(id: string, newPartnerId: string) {
    return apiClient.patch<{ success: boolean; attribution: any; message: string }>(`/api/v1/admin/partners/attributions/${id}/reassign`, {
      newPartnerId,
    });
  },
};
