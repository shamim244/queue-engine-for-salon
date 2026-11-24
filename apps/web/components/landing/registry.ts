import React from "react";
import type {
  LandingPageConfig,
  SectionId,
  SectionProps,
  TemplateId,
  TemplateDefinition,
} from "./types";
import { Hero2Point5D } from "./hero-2point5d";
import { HeroBento } from "./hero-bento";
import { HeroMinimalist } from "./hero-minimalist";
import { QueueSimulator } from "./queue-simulator";
import { TvMirrorPreview } from "./tv-mirror-preview";
import { UpiShowcase } from "./upi-showcase";
import { RoiCalculator } from "./roi-calculator";
import { PricingSection } from "./pricing-section";
import { PartnerBanner } from "./partner-banner";
import { FaqAccordion } from "./faq-accordion";
import { SalonWorkflowCircuit } from "./salon-workflow-circuit";
import { SalonServicesMarquee } from "./salon-services-marquee";

export type {
  LandingPageConfig,
  SectionId,
  SectionProps,
  TemplateId,
  TemplateDefinition,
};

export const SECTION_REGISTRY: Record<SectionId, React.ComponentType<SectionProps>> = {
  hero: Hero2Point5D, // Fallback default hero in registry
  workflow_circuit: SalonWorkflowCircuit,
  services_marquee: SalonServicesMarquee,
  simulator: QueueSimulator,
  tv_mirror: TvMirrorPreview,
  upi_showcase: UpiShowcase,
  roi_calculator: RoiCalculator,
  pricing: PricingSection,
  partner_banner: PartnerBanner,
  faq: FaqAccordion,
};

export const TEMPLATE_DEFINITIONS: Record<TemplateId, TemplateDefinition> = {
  "2_5D_SCROLL": {
    id: "2_5D_SCROLL",
    name: "2.5D Isometric Scrollytelling",
    description:
      "Hardware-accelerated CSS perspective depth, floating ticket #104, and live TV screen preview.",
    heroComponent: Hero2Point5D,
    defaultSections: [
      "workflow_circuit",
      "services_marquee",
      "simulator",
      "tv_mirror",
      "upi_showcase",
      "roi_calculator",
      "pricing",
      "partner_banner",
      "faq",
    ],
  },
  "BENTO_OBSIDIAN": {
    id: "BENTO_OBSIDIAN",
    name: "Dark Obsidian Bento Grid",
    description:
      "High-contrast Linear/Vercel styling with telemetry cards, micro-glows, and status badges.",
    heroComponent: HeroBento,
    defaultSections: [
      "workflow_circuit",
      "simulator",
      "roi_calculator",
      "services_marquee",
      "tv_mirror",
      "upi_showcase",
      "pricing",
      "partner_banner",
      "faq",
    ],
  },
  "MINIMALIST_LUXE": {
    id: "MINIMALIST_LUXE",
    name: "Minimalist Luxe",
    description:
      "Typography-first layout prioritizing sub-second load times and concise value propositions.",
    heroComponent: HeroMinimalist,
    defaultSections: [
      "simulator",
      "pricing",
      "roi_calculator",
      "partner_banner",
      "faq",
    ],
  },
};
