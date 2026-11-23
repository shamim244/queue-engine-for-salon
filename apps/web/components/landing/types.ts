import React from "react";

export type TemplateId = "2_5D_SCROLL" | "BENTO_OBSIDIAN" | "MINIMALIST_LUXE";

export type SectionId =
  | "hero"
  | "simulator"
  | "tv_mirror"
  | "upi_showcase"
  | "roi_calculator"
  | "pricing"
  | "partner_banner"
  | "faq";

export interface LandingPageConfig {
  activeTemplate: TemplateId;
  enabledSections?: string[];
  brandName: string;
  tagline: string;
  heroBadge: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroCtaText: string;
  pricingStarterMonthly: number;
  pricingProMonthly: number;
  pricingEliteMonthly: number;
  partnerCommissionPct: number;
  supportWhatsapp: string;
  supportEmail: string;
  socialInstagram: string;
  socialTwitter: string;
  socialLinkedin: string;
}

export interface SectionProps {
  config: LandingPageConfig;
}

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  heroComponent: React.ComponentType<SectionProps>;
  defaultSections: SectionId[];
}
