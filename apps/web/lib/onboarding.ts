import { api, Salon, Organization, OnboardSalonPayload } from "./api";

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
  operatingMode: "RURAL_SOLO" | "MODERN_MULTI";
  organizationName?: string;
  organizationSlug?: string;
  tier?: "SOLO" | "PRO" | "ENTERPRISE";
  ownerUser: OwnerUserInput;
  stylists: StylistInput[];
  services: ServiceInput[];
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
 * Generates the Rural Solo Barber preset catalog and default single owner-stylist.
 */
export function getRuralSoloPreset(
  customSalonName?: string,
  ownerName?: string
): {
  operatingMode: "RURAL_SOLO";
  services: ServiceInput[];
  stylists: StylistInput[];
} {
  return {
    operatingMode: "RURAL_SOLO",
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
 * Generates the Modern Multi-Station preset catalog and default station stylist roster.
 */
export function getModernMultiPreset(customSalonName?: string): {
  operatingMode: "MODERN_MULTI";
  services: ServiceInput[];
  stylists: StylistInput[];
} {
  return {
    operatingMode: "MODERN_MULTI",
    services: [
      { name: "Signature Cut", basePrice: 350, estimatedDurationMinutes: 30, isAddOn: false, icon: "✂️" },
      { name: "Beard Trim", basePrice: 150, estimatedDurationMinutes: 20, isAddOn: false, icon: "🧔" },
      { name: "Hair Spa", basePrice: 450, estimatedDurationMinutes: 40, isAddOn: true, icon: "💆" },
      { name: "Hair Wash", basePrice: 120, estimatedDurationMinutes: 15, isAddOn: true, icon: "🧴" },
    ],
    stylists: [
      { name: "Senior Stylist (Station 1)", avgDurationMinutes: 30, pin: "1001" },
      { name: "Creative Director (Station 2)", avgDurationMinutes: 35, pin: "1002" },
      { name: "Color & Spa Specialist (Station 3)", avgDurationMinutes: 40, pin: "1003" },
    ],
  };
}

/**
 * Validates the full onboarding form payload before submission.
 */
export function validateOnboardingForm(formData: OnboardingFormData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!formData.name || !formData.name.trim()) {
    errors.name = "Salon name is required.";
  }

  if (!formData.phone || !formData.phone.trim()) {
    errors.phone = "Primary contact phone is required.";
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

  return {
    salonName: cleanName,
    name: cleanName,
    slug: cleanSlug,
    phone: formData.phone.trim(),
    address: formData.address?.trim() || undefined,
    currency: formData.currency || "INR",
    countryCode: formData.countryCode || "+91",
    upiPaymentId: formData.upiPaymentId?.trim() || undefined,
    operatingMode: formData.operatingMode || "RURAL_SOLO",
    organizationName: formData.organizationName?.trim() || undefined,
    organizationSlug: formData.organizationSlug?.trim() ? slugify(formData.organizationSlug) : undefined,
    tier: formData.tier || "SOLO",
    ownerUser: {
      username: formData.ownerUser.username.trim().toLowerCase(),
      password: formData.ownerUser.password,
      phone: formData.ownerUser.phone?.trim() || formData.phone.trim(),
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

  const payload = buildOnboardPayload(formData);
  return await client.admin.onboard(payload);
}
