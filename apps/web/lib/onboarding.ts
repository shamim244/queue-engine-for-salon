import { api } from "./api";
import type { Salon, Organization, OnboardSalonPayload } from "./api";
export interface StylistInput {
  name: string;
  phone?: string;
  avgDurationMinutes?: number;
  pin?: string;
}

export interface ServiceInput {
  name: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  isAddOn?: boolean;
  icon?: string;
}

export interface OwnerUserInput {
  username: string;
  password: string;
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface OnboardingFormData {
  name: string;
  slug: string;
  phone: string;
  address?: string;
  currency?: string;
  countryCode?: string;
  upiPaymentId?: string;
  operatingMode?: string;
  organizationName?: string;
  organizationSlug?: string;
  tier?: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  planId?: string;
  billingCycle?: string;
  ownerUser: OwnerUserInput;
  stylists: StylistInput[];
  services: ServiceInput[];
  partnerCode?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Transforms an arbitrary string into a clean lowercase alphanumeric hyphenated slug.
 * Handles accents/diacritics, special symbols, and consecutive separators cleanly.
 */
export function slugify(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, " ")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Standard unified salon starter catalog and initial station.
 */
export function getStandardSalonPreset(
  customSalonName?: string,
  ownerName?: string
): {
  services: ServiceInput[];
  stylists: StylistInput[];
} {
  return {
    services: [
      { name: "Haircut & Styling", basePrice: 150, estimatedDurationMinutes: 25, isAddOn: false, icon: "✂️" },
      { name: "Beard Trim & Sculpt", basePrice: 80, estimatedDurationMinutes: 15, isAddOn: false, icon: "🧔" },
      { name: "Head Massage / Champy", basePrice: 100, estimatedDurationMinutes: 15, isAddOn: true, icon: "💆" },
      { name: "Hair Wash & Conditioning", basePrice: 120, estimatedDurationMinutes: 15, isAddOn: true, icon: "🧴" },
    ],
    stylists: [
      {
        name: ownerName?.trim() || (customSalonName ? `${customSalonName.trim()} Master` : "Main Station #1"),
        avgDurationMinutes: 25,
        pin: "1234",
      },
    ],
  };
}

/**
 * Single-Station Starter preset catalog and default single owner-stylist.
 */
export function getSingleStationPreset(
  customSalonName?: string,
  ownerName?: string
): {
  services: ServiceInput[];
  stylists: StylistInput[];
} {
  return {
    services: [
      { name: "Haircut", basePrice: 70, estimatedDurationMinutes: 20, isAddOn: false, icon: "✂️" },
      { name: "Shave", basePrice: 50, estimatedDurationMinutes: 15, isAddOn: false, icon: "🪒" },
      { name: "Beard Trim", basePrice: 40, estimatedDurationMinutes: 10, isAddOn: true, icon: "🧔" },
      { name: "Head Massage", basePrice: 60, estimatedDurationMinutes: 15, isAddOn: true, icon: "💆" },
    ],
    stylists: [
      {
        name: ownerName?.trim() || (customSalonName ? `${customSalonName.trim()} Master` : "Master Barber"),
        avgDurationMinutes: 20,
        pin: "1234",
      },
    ],
  };
}

/**
 * Multi-Station Growth preset catalog and default initial stations.
 */
export function getMultiStationPreset(customSalonName?: string, ownerName?: string): {
  services: ServiceInput[];
  stylists: StylistInput[];
} {
  return {
    services: [
      { name: "Signature Cut", basePrice: 350, estimatedDurationMinutes: 30, isAddOn: false, icon: "✂️" },
      { name: "Beard Trim", basePrice: 150, estimatedDurationMinutes: 20, isAddOn: false, icon: "🧔" },
      { name: "Hair Spa", basePrice: 450, estimatedDurationMinutes: 40, isAddOn: true, icon: "💆" },
      { name: "Hair Wash", basePrice: 120, estimatedDurationMinutes: 15, isAddOn: true, icon: "🧴" },
    ],
    stylists: [
      {
        name: ownerName?.trim() || "Main Station #1",
        avgDurationMinutes: 30,
        pin: "1001",
      },
      {
        name: "Stylist Station #2",
        avgDurationMinutes: 25,
        pin: "1002",
      },
    ],
  };
}

// Backwards-compatible aliases
export const getRuralSoloPreset = getSingleStationPreset;
export const getModernMultiPreset = getMultiStationPreset;

/**
 * Validates the full onboarding form payload before submission.
 */
export function validateOnboardingForm(formData: OnboardingFormData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!formData.name || !formData.name.trim()) {
    errors.name = "Salon name is required.";
  }

  const allDigits = (formData.phone || "").replace(/\D/g, "");
  const nationalDigits = (allDigits.length === 12 && allDigits.startsWith("91"))
    ? allDigits.slice(2)
    : allDigits;

  if (!formData.phone || !formData.phone.trim()) {
    errors.phone = "Primary contact phone is required.";
  } else if (nationalDigits.length !== 10) {
    errors.phone = "Primary contact phone must be an exact 10-digit mobile number.";
  }

  if (formData.ownerUser?.phone) {
    const allOwnerDigits = formData.ownerUser.phone.replace(/\D/g, "");
    const nationalOwnerDigits = (allOwnerDigits.length === 12 && allOwnerDigits.startsWith("91"))
      ? allOwnerDigits.slice(2)
      : allOwnerDigits;
    if (nationalOwnerDigits.length !== 10) {
      errors.ownerPhone = "Owner WhatsApp phone must be an exact 10-digit mobile number.";
    }
  }

  if (!formData.ownerUser || !formData.ownerUser.username || !formData.ownerUser.username.trim()) {
    errors.ownerUsername = "Owner username is required.";
  }

  if (!formData.ownerUser || !formData.ownerUser.password || formData.ownerUser.password.length < 6) {
    errors.ownerPassword = "Password must be at least 6 characters.";
  }

  if (!formData.stylists || formData.stylists.length === 0) {
    errors.stylists = "At least 1 stylist is required in the roster.";
  }

  if (!formData.services || formData.services.length === 0) {
    errors.services = "At least 1 service is required in the catalog.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Transforms client form data into the exact API payload format.
 */
export function buildOnboardPayload(formData: OnboardingFormData): OnboardSalonPayload {
  const cleanName = formData.name.trim();
  const cleanSlug = formData.slug?.trim() ? slugify(formData.slug) : slugify(cleanName);

  const rawPhone = (formData.phone || "").trim();
  const country = formData.countryCode || "+91";
  let normalizedPhone = rawPhone;
  if (rawPhone && !rawPhone.startsWith("+")) {
    const cleanDigits = rawPhone.replace(/\D/g, "").slice(0, 10);
    normalizedPhone = `${country}${cleanDigits}`;
  }

  let normalizedOwnerPhone = normalizedPhone;
  if (formData.ownerUser?.phone) {
    const rawOwner = formData.ownerUser.phone.trim();
    if (rawOwner.startsWith("+")) {
      normalizedOwnerPhone = rawOwner;
    } else {
      const cleanOwner = rawOwner.replace(/\D/g, "").slice(0, 10);
      normalizedOwnerPhone = `${country}${cleanOwner}`;
    }
  }

  return {
    salonName: cleanName,
    name: cleanName,
    slug: cleanSlug,
    phone: normalizedPhone,
    address: formData.address?.trim() || undefined,
    currency: formData.currency || "INR",
    countryCode: country,
    upiPaymentId: formData.upiPaymentId?.trim() || undefined,
    operatingMode: formData.operatingMode || undefined,
    organizationName: formData.organizationName?.trim() || undefined,
    organizationSlug: formData.organizationSlug?.trim() ? slugify(formData.organizationSlug) : undefined,
    tier: formData.tier || "FREE",
    planId: formData.planId || undefined,
    billingCycle: formData.billingCycle || undefined,
    ownerUser: {
      username: formData.ownerUser.username.trim().toLowerCase(),
      password: formData.ownerUser.password,
      phone: normalizedOwnerPhone,
      email: formData.ownerUser.email?.trim() || undefined,
    },
    stylists: formData.stylists.map((st) => ({
      name: st.name.trim(),
      phone: st.phone?.trim() || undefined,
      avgDurationMinutes: st.avgDurationMinutes ? Number(st.avgDurationMinutes) : 25,
      pin: st.pin?.trim() || undefined,
    })),
    services: formData.services.map((srv) => ({
      name: srv.name.trim(),
      basePrice: Number(srv.basePrice) || 0,
      estimatedDurationMinutes: Number(srv.estimatedDurationMinutes) || 15,
      isAddOn: Boolean(srv.isAddOn),
      icon: srv.icon || undefined,
    })),
    partnerCode: formData.partnerCode?.trim() || undefined,
  };
}

/**
 * Submits the onboarding payload to the backend engine via api.admin.onboard.
 */
export async function submitOnboarding(
  formData: OnboardingFormData,
  client = api
): Promise<{
  success: boolean;
  salon: Salon;
  organization?: Organization | null;
  ownerUser?: any;
}> {
  const validation = validateOnboardingForm(formData);
  if (!validation.isValid) {
    const errorDetails = Object.values(validation.errors).join("; ");
    throw new Error(`Validation failed: ${errorDetails}`);
  }

  if (!formData.partnerCode && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("engine_partner_data");
      if (raw) {
        const parsed = JSON.parse(raw);
        const code = parsed?.referralCode || parsed?.referral_code;
        if (code) {
          formData.partnerCode = String(code).trim().toUpperCase();
        }
      }
    } catch {}
  }

  const payload = buildOnboardPayload(formData);
  return await client.admin.onboard(payload);
}
