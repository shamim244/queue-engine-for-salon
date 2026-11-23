import { SITE_CONFIG } from "@/config/site";
import type { LandingPageConfig } from "@/components/landing/types";

export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  activeTemplate: "2_5D_SCROLL",
  enabledSections: [
    "hero",
    "simulator",
    "tv_mirror",
    "upi_showcase",
    "roi_calculator",
    "pricing",
    "partner_banner",
    "faq",
  ],
  brandName: SITE_CONFIG.name,
  tagline: SITE_CONFIG.tagline,
  heroBadge: "💈 The Real-Time Salon Operating Engine",
  heroHeadline: "Turn Weekend Walk-Outs Into Daily Cash.",
  heroSubheadline:
    "Zero-app QR waitlists, live TV lounge mirrors, and instant 0% fee UPI payouts. Built to scale from local barbershops to luxury multi-chair chains.",
  heroCtaText: "Start Free 14-Day Trial",
  pricingStarterMonthly: SITE_CONFIG.pricing.starter.monthly,
  pricingProMonthly: SITE_CONFIG.pricing.pro.monthly,
  pricingEliteMonthly: SITE_CONFIG.pricing.elite.monthly,
  partnerCommissionPct: 30,
  supportWhatsapp: SITE_CONFIG.support.whatsapp,
  supportEmail: SITE_CONFIG.support.email,
  socialInstagram: SITE_CONFIG.social.instagram,
  socialTwitter: SITE_CONFIG.social.twitter,
  socialLinkedin: SITE_CONFIG.social.linkedin,
};

export async function getLandingConfig(): Promise<LandingPageConfig> {
  const apiUrl =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001";

  try {
    const res = await fetch(`${apiUrl}/api/public/landing-config`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return DEFAULT_LANDING_CONFIG;
    }

    const json = await res.json();
    if (json?.success && json?.data) {
      return {
        ...DEFAULT_LANDING_CONFIG,
        ...json.data,
      };
    }
    return DEFAULT_LANDING_CONFIG;
  } catch {
    return DEFAULT_LANDING_CONFIG;
  }
}
