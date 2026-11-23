# Technical Requirements Document (TRD): Dynamic Modular Landing Engine & Headless Brand CMS

## 1. Executive Summary & Architecture Overview
- **Subsystem:** Dynamic Modular Landing Engine, In-Memory Headless CMS, and Admin Template Switcher
- **Runtime:** Bun + Elysia (API backend) with MySQL 8.0 (InnoDB)
- **Frontend:** Next.js 16 App Router (React 19) + Tailwind CSS + Framer Motion
- **Key Design Objective:** Maintain zero server waste while providing 100% modular component reusability, sub-10ms cached configuration delivery, 1-click admin template switching with fallback, and a dedicated partner acquisition funnel.

---

## 2. Database Schema (MySQL 8.0 DDL)

We extend the platform settings persistence layer to store the dynamic landing page configuration as a structured JSON document:

```sql
-- Migration: Add landing_page_config to platform_settings if not present
CREATE TABLE IF NOT EXISTS platform_settings (
  id VARCHAR(64) PRIMARY KEY,
  settings JSON NOT NULL,
  landing_page_config JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default JSON payload structure:
/*
{
  "active_template": "2_5D_SCROLL",
  "enabled_sections": [
    "hero",
    "simulator",
    "tv_mirror",
    "upi_showcase",
    "roi_calculator",
    "pricing",
    "partner_banner",
    "faq"
  ],
  "brand_name": "SalonView",
  "tagline": "Total Clarity. Effortless Operations.",
  "hero_badge": "💈 The Real-Time Salon Operating Engine",
  "hero_headline": "Turn Weekend Walk-Outs Into Daily Cash.",
  "hero_subheadline": "Zero-app QR waitlists, live TV lounge mirrors, and instant 0% fee UPI payouts. Built to scale from local barbershops to luxury multi-chair chains.",
  "hero_cta_text": "Start Free 14-Day Trial",
  "pricing_starter_monthly": 699,
  "pricing_pro_monthly": 1499,
  "pricing_elite_monthly": 3499,
  "partner_commission_pct": 30,
  "support_whatsapp": "+919876543210",
  "support_email": "support@salonview.in",
  "social_instagram": "salonviewapp",
  "social_twitter": "salonviewapp",
  "social_linkedin": "salonviewapp"
}
*/
```

---

## 3. Elysia / Bun Backend API Specifications

### 3.1 Public Endpoint: Fetch Cached Landing Configuration
* **Endpoint:** `GET /api/v1/public/landing-config`
* **Access:** Public (Unauthenticated, CORS-enabled)
* **Performance SLA:** $< 10\text{ms}$ response time via Bun in-memory cache.
* **Response Schema:**
```json
{
  "success": true,
  "data": {
    "activeTemplate": "2_5D_SCROLL",
    "enabledSections": [
      "hero",
      "simulator",
      "tv_mirror",
      "upi_showcase",
      "roi_calculator",
      "pricing",
      "partner_banner",
      "faq"
    ],
    "brandName": "SalonView",
    "tagline": "Total Clarity. Effortless Operations.",
    "heroBadge": "💈 The Real-Time Salon Operating Engine",
    "heroHeadline": "Turn Weekend Walk-Outs Into Daily Cash.",
    "heroSubheadline": "Zero-app QR waitlists, live TV lounge mirrors, and instant 0% fee UPI payouts.",
    "heroCtaText": "Start Free 14-Day Trial",
    "pricing": {
      "starter": 699,
      "pro": 1499,
      "elite": 3499
    },
    "partnerCommissionPct": 30,
    "support": {
      "whatsapp": "+919876543210",
      "email": "support@salonview.in"
    },
    "social": {
      "instagram": "salonviewapp",
      "twitter": "salonviewapp",
      "linkedin": "salonviewapp"
    }
  }
}
```

### 3.2 Admin Endpoint: Update Landing Configuration & Invalidate Cache
* **Endpoint:** `POST /api/admin/settings` (or `PUT /api/admin/landing-config`)
* **Access:** Admin JWT Authenticated (`requireAdminAuth`)
* **Behavior:**
  1. Validates input schema via Elysia `t.Object` with strict string bounds.
  2. Updates `platform_settings.landing_page_config` in MySQL and memory store.
  3. Evicts the cached memory key in Bun (`cacheService.del('landing_page_config')`).
  4. Returns the updated configuration.

---

## 4. Frontend Component Modularization & Section Registry Pattern

To eliminate monolithic landing page files and enforce **Rule 6 (High Modularity & DRY Reusable Components)**, components are organized under `apps/web/components/landing/`:

```
apps/web/
├── config/
│   └── site.ts                           <-- Centralized Site & Brand Configuration
├── lib/
│   └── landing-config.ts                 <-- Client fetcher with offline SITE_CONFIG fallback
├── components/
│   └── landing/
│       ├── types.ts                      <-- Shared TypeScript Interfaces & Prop Types
│       ├── registry.ts                   <-- SECTION_REGISTRY & Template Manifests
│       ├── navbar.tsx                    <-- Global Navigation with /partners link
│       ├── footer.tsx                    <-- Global Footer with White-Label Notice
│       ├── hero-2point5d.tsx             <-- 2.5D Isometric Scrollytelling Hero
│       ├── hero-bento.tsx                <-- Dark Obsidian Bento-Grid Hero
│       ├── hero-minimalist.tsx           <-- Minimalist Luxe Hero
│       ├── queue-simulator.tsx           <-- Interactive Telemetry Queue Card
│       ├── tv-mirror-preview.tsx         <-- Fullscreen Ambient TV Mirror Showcase
│       ├── upi-showcase.tsx              <-- Dynamic NPCI UPI QR Showcase
│       ├── roi-calculator.tsx            <-- Tactile Lost Walk-Out Cash Calculator
│       ├── pricing-section.tsx           <-- Dynamic Tier Cards from Config
│       ├── partner-banner.tsx            <-- Pre-Footer Reseller Callout Banner
│       └── faq-accordion.tsx             <-- Collapsible Owner FAQ
└── app/
    ├── page.tsx                          <-- Dynamic Template Dispatcher & Orchestrator
    ├── partners/
    │   └── page.tsx                      <-- Dedicated Channel Partner Marketing Hub
    └── admin/settings/appearance/
        └── page.tsx                      <-- Admin Template Switcher & CMS Form
```

### 4.1 Section Registry Architecture (`registry.ts`)

```typescript
import React from "react";
import type { LandingPageConfig } from "./types";
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

export type SectionId =
  | "hero"
  | "simulator"
  | "tv_mirror"
  | "upi_showcase"
  | "roi_calculator"
  | "pricing"
  | "partner_banner"
  | "faq";

export interface SectionProps {
  config: LandingPageConfig;
}

export type TemplateId = "2_5D_SCROLL" | "BENTO_OBSIDIAN" | "MINIMALIST_LUXE";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  heroComponent: React.ComponentType<SectionProps>;
  defaultSections: SectionId[];
}

export const TEMPLATE_DEFINITIONS: Record<TemplateId, TemplateDefinition> = {
  "2_5D_SCROLL": {
    id: "2_5D_SCROLL",
    name: "2.5D Isometric Scrollytelling",
    description: "Hardware-accelerated CSS perspective depth, tilted ticket #104, and live TV screen preview.",
    heroComponent: Hero2Point5D,
    defaultSections: ["simulator", "tv_mirror", "upi_showcase", "roi_calculator", "pricing", "partner_banner", "faq"],
  },
  "BENTO_OBSIDIAN": {
    id: "BENTO_OBSIDIAN",
    name: "Dark Obsidian Bento Grid",
    description: "High-contrast Linear/Vercel styling with telemetry cards, micro-glows, and status badges.",
    heroComponent: HeroBento,
    defaultSections: ["simulator", "roi_calculator", "tv_mirror", "upi_showcase", "pricing", "partner_banner", "faq"],
  },
  "MINIMALIST_LUXE": {
    id: "MINIMALIST_LUXE",
    name: "Minimalist Luxe",
    description: "Typography-first layout prioritizing sub-second load times and concise value propositions.",
    heroComponent: HeroMinimalist,
    defaultSections: ["simulator", "pricing", "roi_calculator", "partner_banner", "faq"],
  },
};
```

---

## 5. Dynamic Template Dispatcher Implementation (`apps/web/app/page.tsx`)

The root `page.tsx` acts strictly as an orchestrator, importing and composing modular components based on the active template:

```tsx
import React from "react";
import { getLandingConfig } from "@/lib/landing-config";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { TEMPLATE_DEFINITIONS, type TemplateId } from "@/components/landing/registry";
import { QueueSimulator } from "@/components/landing/queue-simulator";
import { TvMirrorPreview } from "@/components/landing/tv-mirror-preview";
import { UpiShowcase } from "@/components/landing/upi-showcase";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { PricingSection } from "@/components/landing/pricing-section";
import { PartnerBanner } from "@/components/landing/partner-banner";
import { FaqAccordion } from "@/components/landing/faq-accordion";

export default async function MarketingHomePage() {
  const config = await getLandingConfig();
  const templateId: TemplateId = config.activeTemplate in TEMPLATE_DEFINITIONS 
    ? config.activeTemplate 
    : "2_5D_SCROLL";
  
  const template = TEMPLATE_DEFINITIONS[templateId];
  const HeroComponent = template.heroComponent;

  // Determine which sections to render based on config or template defaults
  const enabled = new Set(config.enabledSections || template.defaultSections);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      <LandingNavbar config={config} />
      
      <main className="flex-1">
        <HeroComponent config={config} />
        {enabled.has("simulator") && <QueueSimulator config={config} />}
        {enabled.has("tv_mirror") && <TvMirrorPreview config={config} />}
        {enabled.has("upi_showcase") && <UpiShowcase config={config} />}
        {enabled.has("roi_calculator") && <RoiCalculator config={config} />}
        {enabled.has("pricing") && <PricingSection config={config} />}
        {enabled.has("partner_banner") && <PartnerBanner config={config} />}
        {enabled.has("faq") && <FaqAccordion config={config} />}
      </main>

      <LandingFooter config={config} />
    </div>
  );
}
```

---

## 6. Dedicated Partner Acquisition Hub (`/partners`)

Located at `apps/web/app/partners/page.tsx`:
* **Zero Auth Required:** Fully public marketing page.
* **Recurring Revenue Calculator:** Interactive earning projections ($25\%\text{--}35\%$ recurring monthly split).
* **Direct Routing:** Primary CTAs link directly to `apps/web/app/partner/join/page.tsx` (passing `?source=partners_landing`).
* **Existing Partner Gateway:** Secondary link to `/partner/login`.

---

## 7. Performance & Optimization Architecture

1. **Client Hardware Offloading (Rule 1 of GEMINI.md):**
   * The 2.5D visual effects are rendered using native CSS transforms (`perspective: 1000px`, `transform-style: preserve-3d`) and Framer Motion.
   * Total animation library footprint: $< 35\text{KB}$ gzipped.
   * Zero Three.js/WebGL runtime overhead.
2. **Sub-50ms Catalog Caching (Rule 2 of GEMINI.md):**
   * Landing page configuration cached in memory via `memoirist` / LRU cache with an immediate eviction hook on settings update.
3. **PWA & Offline Resilience (Rule 4 of GEMINI.md):**
   * The landing page supports fallback to `SITE_CONFIG` if the API is momentarily offline or slow.

---

## 8. Security & Trust Boundaries (Rule 8 of GEMINI.md)

1. **Strict Input Sanitization:**
   * All dynamic text inputs from the admin CMS are validated through Elysia schemas and sanitized against XSS vectors before persistence.
2. **Rate Limiting:**
   * The public configuration endpoint `GET /api/v1/public/landing-config` is protected by rate limiting (120 req/min) to prevent scraping or cache exhaustion attacks.
3. **Admin Role Isolation:**
   * Modifying landing page templates or CMS copy strictly requires the `SUPER_ADMIN` RBAC role.
