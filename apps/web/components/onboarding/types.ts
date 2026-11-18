import type { SubscriptionPlan } from "@/lib/api";
import { ALL_PLAN_FEATURES } from "@/components/admin/billing/create-plan-modal";

export type OnboardingWizardMode = "PUBLIC" | "PARTNER" | "ADMIN";

export interface UniversalWizardProps {
  mode: OnboardingWizardMode;
  initialPartnerCode?: string;
  lockPartnerCode?: boolean;
  onSuccessRedirectUrl?: string;
  defaultPlan?: string;
  adminOverridesAllowed?: boolean;
}

export type BillingCycle = "1m" | "3m" | "6m" | "1y";

export interface BillingCycleOption {
  id: BillingCycle;
  label: string;
  badge?: string;
}

export const CYCLE_OPTIONS: BillingCycleOption[] = [
  { id: "1m", label: "1 Month" },
  { id: "3m", label: "3 Months", badge: "Save 10%" },
  { id: "6m", label: "6 Months", badge: "Save 16%" },
  { id: "1y", label: "1 Year", badge: "Save 30%" },
];

export const featureLabelMap: Record<string, string> = {
  station_chair_transfers: "Station Chair Transfers",
  station_soft_bump: "Station Soft Bump Protocol",
  station_hold_pause: "Station Hold & Errand Pause",
  tv_departure_mirror: "TV Departure Lounge Mirror",
  whatsapp_sms_notifications: "WhatsApp & SMS Notifications",
  staff_shift_analytics: "Staff Shift Analytics",
  stylist_duration_overrides: "Stylist Speed Calibration",
  staff_leave_recovery: "Staff Leave Recovery",
  customer_loyalty_stamps: "Customer Loyalty Stamps",
  consumer_referrals: "Consumer Referral Engine",
  digital_storefront: "Digital Salon Storefront",
  custom_coupons: "Custom Discount Coupons",
};

for (const f of ALL_PLAN_FEATURES) {
  featureLabelMap[f.id] = f.label;
}

export function getCyclePrice(p: SubscriptionPlan, cycle: BillingCycle): number {
  if (Number(p.price1m) === 0) return 0;
  if (cycle === "1m") return Number(p.price1m);
  if (cycle === "3m") return Number(p.price3m ?? Math.round(Number(p.price1m) * 3 * (1 - (p.discountPct3m ?? 10) / 100)));
  if (cycle === "6m") return Number(p.price6m ?? Math.round(Number(p.price1m) * 6 * (1 - (p.discountPct6m ?? 16) / 100)));
  if (cycle === "1y") return Number(p.price1y ?? Math.round(Number(p.price1m) * 12 * (1 - (p.discountPct1y ?? 30) / 100)));
  return Number(p.price1m);
}

export const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: "plan-free",
    name: "Free Testing Plan",
    slug: "free",
    badge: "100% Free",
    description: "Test & explore live queue engine with zero payment",
    price1m: 0,
    price3m: 0,
    price6m: 0,
    price1y: 0,
    discountPct3m: 0,
    discountPct6m: 0,
    discountPct1y: 0,
    cycle1mEnabled: true,
    cycle3mEnabled: true,
    cycle6mEnabled: true,
    cycle1yEnabled: true,
    maxBranches: 1,
    maxStylistsPerBranch: 1,
    features: [
      "station_chair_transfers",
      "station_soft_bump",
      "digital_storefront",
    ],
    status: "ACTIVE",
    isFeatured: false,
    sortOrder: 0,
  },
  {
    id: "plan-starter-01",
    name: "Solo Traditional Barber",
    slug: "solo-barber",
    badge: "Starter",
    description: "Perfect for single-chair barbers and independent grooming stations.",
    price1m: 499,
    price3m: 1347,
    price6m: 2515,
    price1y: 4192,
    discountPct3m: 10,
    discountPct6m: 16,
    discountPct1y: 30,
    cycle1mEnabled: true,
    cycle3mEnabled: true,
    cycle6mEnabled: true,
    cycle1yEnabled: true,
    maxBranches: 1,
    maxStylistsPerBranch: 1,
    features: [
      "station_chair_transfers",
      "station_soft_bump",
      "station_hold_pause",
      "digital_storefront",
    ],
    status: "ACTIVE",
    isFeatured: false,
    sortOrder: 1,
  },
  {
    id: "plan-pro-01",
    name: "Growth Studio Pro",
    slug: "growth-studio-pro",
    badge: "Most Popular",
    description: "Ideal for fast-paced multi-chair barbershops with TV departure mirrors.",
    price1m: 1499,
    price3m: 4047,
    price6m: 7555,
    price1y: 12592,
    discountPct3m: 10,
    discountPct6m: 16,
    discountPct1y: 30,
    cycle1mEnabled: true,
    cycle3mEnabled: true,
    cycle6mEnabled: true,
    cycle1yEnabled: true,
    maxBranches: 3,
    maxStylistsPerBranch: 10,
    features: [
      "station_chair_transfers",
      "station_soft_bump",
      "station_hold_pause",
      "tv_departure_mirror",
      "whatsapp_sms_notifications",
      "staff_shift_analytics",
      "stylist_duration_overrides",
      "digital_storefront",
      "custom_coupons",
    ],
    status: "ACTIVE",
    isFeatured: true,
    sortOrder: 2,
  },
  {
    id: "plan-enterprise-01",
    name: "Franchise Scale",
    slug: "franchise-scale",
    badge: "Enterprise",
    description: "Full-featured suite for luxury salon chains and regional grooming centers.",
    price1m: 4999,
    price3m: 13497,
    price6m: 25195,
    price1y: 41992,
    discountPct3m: 10,
    discountPct6m: 16,
    discountPct1y: 30,
    cycle1mEnabled: true,
    cycle3mEnabled: true,
    cycle6mEnabled: true,
    cycle1yEnabled: true,
    maxBranches: 10,
    maxStylistsPerBranch: 20,
    features: [
      "station_chair_transfers",
      "station_soft_bump",
      "station_hold_pause",
      "tv_departure_mirror",
      "whatsapp_sms_notifications",
      "staff_shift_analytics",
      "stylist_duration_overrides",
      "staff_leave_recovery",
      "customer_loyalty_stamps",
      "consumer_referrals",
      "digital_storefront",
      "custom_coupons",
    ],
    status: "ACTIVE",
    isFeatured: false,
    sortOrder: 3,
  },
];

export interface SlugStatus {
  isChecking: boolean;
  available: boolean | null;
  reason?: string;
  suggestions: string[];
}

export interface UsernameStatus {
  isChecking: boolean;
  available: boolean | null;
  reason?: string;
  suggestions: string[];
}

export interface EmailStatus {
  isChecking: boolean;
  available: boolean | null;
  reason?: string;
  checkedEmail?: string;
}

export interface QuoteData {
  isValid: boolean;
  discountPercent: number;
  discountAmount: number;
  netPayableAmount: number;
  partnerName?: string;
  message?: string;
}

export interface LaunchResult {
  salon: any;
  organization?: any;
  ownerUser?: any;
  storeUrl: string;
  queueUrl: string;
  tvUrl: string;
  ownerLoginUrl: string;
  manualPayment?: { submitted: boolean; utr?: string; orderId?: string } | null;
  chosenTier?: string;
  chosenPlan?: any;
}
