import React from "react";
import { getLandingConfig } from "@/lib/landing-config";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import {
  TEMPLATE_DEFINITIONS,
  SECTION_REGISTRY,
  type TemplateId,
  type SectionId,
} from "@/components/landing/registry";

export default async function MarketingHomePage() {
  const config = await getLandingConfig();

  // Validate active template or fallback safely
  const templateKey = config.activeTemplate as TemplateId;
  const template = TEMPLATE_DEFINITIONS[templateKey] || TEMPLATE_DEFINITIONS["2_5D_SCROLL"];
  const HeroComponent = template.heroComponent;

  // Resolve enabled modular sections (preserves admin selection or template defaults)
  const enabledSections = new Set<string>(
    config.enabledSections && config.enabledSections.length > 0
      ? config.enabledSections
      : template.defaultSections
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Global Navigation Header */}
      <LandingNavbar config={config} />

      {/* 2. Dynamic Modular Main Flow */}
      <main className="flex-1">
        {/* Dynamic Hero based on Active Template */}
        <HeroComponent config={config} />

        {/* Modular Section Pipeline */}
        {enabledSections.has("simulator") && (
          <SECTION_REGISTRY.simulator config={config} />
        )}

        {enabledSections.has("tv_mirror") && (
          <SECTION_REGISTRY.tv_mirror config={config} />
        )}

        {enabledSections.has("upi_showcase") && (
          <SECTION_REGISTRY.upi_showcase config={config} />
        )}

        {enabledSections.has("roi_calculator") && (
          <SECTION_REGISTRY.roi_calculator config={config} />
        )}

        {enabledSections.has("pricing") && (
          <SECTION_REGISTRY.pricing config={config} />
        )}

        {enabledSections.has("partner_banner") && (
          <SECTION_REGISTRY.partner_banner config={config} />
        )}

        {enabledSections.has("faq") && (
          <SECTION_REGISTRY.faq config={config} />
        )}
      </main>

      {/* 3. Global Brand Footer */}
      <LandingFooter config={config} />
    </div>
  );
}
