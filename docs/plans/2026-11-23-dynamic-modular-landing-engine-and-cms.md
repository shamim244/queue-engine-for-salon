# Dynamic Modular Landing Engine & Headless Brand CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully modular, multi-template landing page architecture (featuring 2.5D Isometric Scrollytelling, Dark Obsidian Bento Grid, and Minimalist Luxe), backed by a sub-10ms in-memory headless CMS and Admin Template Switcher, with a dedicated `/partners` acquisition funnel.

**Architecture:** A decoupled Headless CMS model where platform branding, dynamic copy, modular section toggles, and the active template selector are persisted in MySQL (`platform_settings`), cached in-memory on the Bun/Elysia backend for sub-10ms delivery, and consumed by a modular Next.js landing page composed of isolated, reusable section components via a Section Registry.

**Tech Stack:** Bun, ElysiaJS, TypeScript, MySQL 8.0, Next.js 16 (App Router), Tailwind CSS, Framer Motion, Lucide Icons.

**Specifications:**
- **PRD:** [`docs/prd/09_dynamic_modular_landing_engine_and_cms_prd.md`](file:///v:/salon/queue-engine-for-salon/docs/prd/09_dynamic_modular_landing_engine_and_cms_prd.md)
- **TRD:** [`docs/trd/09_dynamic_modular_landing_engine_and_cms_trd.md`](file:///v:/salon/queue-engine-for-salon/docs/trd/09_dynamic_modular_landing_engine_and_cms_trd.md)

## Global Constraints

- **Zero Server Waste:** Client hardware offloading for live timers and animations; zero server ticking loops (`GEMINI.md`).
- **Sub-50ms Catalog & Config Delivery:** Dynamic landing configuration must be cached in memory with immediate eviction on admin update (`GEMINI.md`).
- **DRY Reusable Components:** Reusable modular sections under `apps/web/components/landing/`; zero duplicate monolithic page files (`GEMINI.md`).
- **Android Mobile-First:** Touch targets $\ge 44\text{px}$, responsive layout without horizontal overflow on 360px mobile viewports (`GEMINI.md`).
- **Lazy Senior Dev Mode:** Minimalist code, zero unnecessary abstraction, smallest complete diff that solves the requirements (`AGENTS.md`).

## Review Focus

1. **Cache Staleness & Eviction:** Admin saves new headline/pricing, but public API continues serving old cached data. *Test: Verify in-memory cache eviction on admin mutation.*
2. **Template Fallback Resiliency:** Active template set to an unrecognized string or corrupted value. *Test: Assert fallback to default `2_5D_SCROLL` template with zero runtime crash.*
3. **Mobile 2.5D Performance & Overflow:** 2.5D CSS perspective causing horizontal scrollbars on narrow mobile screens (360px–390px). *Test: Assert `overflow-x: hidden` and fluid responsive scaling.*
4. **Partner Lead Redirection:** Partner clicks CTA on `/partners`, arrives on `/partner/join` with attribution parameter intact. *Test: Verify link preserves `?source=partners_landing`.*
5. **Brand Name Decoupling:** Updating brand name in config updates all headers, footers, and meta tags without breaking salon route links (`/s/[slug]`). *Test: Assert `/s/[slug]` routes operate completely independent of brand name.*

---

## Phased Execution Roadmap

### Phase 1: Database Schema & Backend Headless CMS API
- [x] **Task 1.1: Database Migration for Platform Settings & Landing Configuration**
  - Create migration `010_platform_settings_and_landing_config.ts` in `apps/api/src/db/migrations/`.
  - Update `schema.sql` with `platform_settings` table and `landing_page_config JSON NULL`.
  - Extend `PlatformSettings` in `apps/api/src/engine/types.ts` with `landingPageConfig`.
- [x] **Task 1.2: Public Cached Configuration Endpoint**
  - Implement `GET /api/v1/public/landing-config` in `apps/api/src/routes/platform.routes.ts` (or public route in admin/salon routes).
  - Cache response in Bun memory with a 60-second TTL.
- [x] **Task 1.3: Admin Configuration Mutation Endpoint**
  - Update `apps/api/src/routes/admin.routes.ts` (`POST /api/admin/settings`) to accept `landingPageConfig`.
  - Invalidate cache immediately on update.

### Phase 2: Centralized Site Configuration & Client Fetcher
- [x] **Task 2.1: Centralized Site Config Module**
  - Validate and finalize `apps/web/config/site.ts` exporting default `SITE_CONFIG` (brand name, domains, support channels, social handles).
- [x] **Task 2.2: Landing Page Configuration Client**
  - Create `apps/web/lib/landing-config.ts` with `getLandingConfig()` providing fallback to `SITE_CONFIG` if network is offline.

### Phase 3: Modular Landing Page Component Registry
- [x] **Task 3.1: Component Type Definitions & Section Registry**
  - Create `apps/web/components/landing/types.ts` defining `LandingPageConfig`, `SectionId`, `TemplateId`.
  - Create `apps/web/components/landing/registry.ts` mapping section IDs and template manifests (`TEMPLATE_DEFINITIONS`).
- [x] **Task 3.2: Global Navigation Header (`<LandingNavbar />`)**
  - Create `apps/web/components/landing/navbar.tsx` featuring brand logo, live telemetry pulse, nav links, and `/partners` button.
- [x] **Task 3.3: Interactive 2.5D Scrollytelling Hero (`<Hero2Point5D />`)**
  - Create `apps/web/components/landing/hero-2point5d.tsx` with CSS isometric perspective, floating ticket `#104`, and ambient TV screen preview.
- [x] **Task 3.4: Dark Obsidian Bento Grid Hero (`<HeroBento />`)**
  - Create `apps/web/components/landing/hero-bento.tsx` as the alternative high-contrast Linear/Vercel-style template.
- [x] **Task 3.5: Minimalist Luxe Hero (`<HeroMinimalist />`)**
  - Create `apps/web/components/landing/hero-minimalist.tsx` for fast, lightweight typography-driven presentation.
- [x] **Task 3.6: Interactive Queue Telemetry Simulator (`<QueueSimulator />`)**
  - Create `apps/web/components/landing/queue-simulator.tsx` with clickable "Call Next Customer" trigger and mock WhatsApp alert slide-in.
- [x] **Task 3.7: Fullscreen Lounge TV Mirror Showcase (`<TvMirrorPreview />`)**
  - Create `apps/web/components/landing/tv-mirror-preview.tsx` highlighting the `/s/[slug]/tv` mirror with ambient studio styling.
- [x] **Task 3.8: Dynamic NPCI UPI QR Showcase (`<UpiShowcase />`)**
  - Create `apps/web/components/landing/upi-showcase.tsx` highlighting direct-to-bank instant settlements.
- [x] **Task 3.9: Interactive Walk-Out Loss Calculator (`<RoiCalculator />`)**
  - Create `apps/web/components/landing/roi-calculator.tsx` with interactive client-side sliders calculating lost weekend revenue.
- [x] **Task 3.10: Dynamic Pricing & Subscription Table (`<PricingSection />`)**
  - Create `apps/web/components/landing/pricing-section.tsx` rendering Starter (₹699), Pro (₹1,499), and Elite (₹3,499) tiers directly from dynamic config.
- [x] **Task 3.11: Pre-Footer Partner Callout Banner (`<PartnerBanner />`)**
  - Create `apps/web/components/landing/partner-banner.tsx` highlighting 30% recurring commissions and linking to `/partners`.
- [x] **Task 3.12: Accessible FAQ & Global Footer (`<FaqAccordion />`, `<LandingFooter />`)**
  - Create `apps/web/components/landing/faq-accordion.tsx` and `apps/web/components/landing/footer.tsx`.

### Phase 4: Dynamic Template Dispatcher Integration (`apps/web/app/page.tsx`)
- [x] **Task 4.1: Refactor Root Landing Page**
  - Refactor `apps/web/app/page.tsx` from the 890-line monolithic draft into a clean, modular orchestrator reading `activeTemplate` and composing sections dynamically.

### Phase 5: Dedicated Partner Acquisition Hub (`apps/web/app/partners/page.tsx`)
- [x] **Task 5.1: Build Public Partner Landing Page**
  - Finalize `apps/web/app/partners/page.tsx` with recurring commission calculator, benefits grid, starter kit overview, and direct registration CTAs routing to `/partner/join?source=partners_landing`.

### Phase 6: Super Admin Template Switcher & CMS Form
- [x] **Task 6.1: Update Admin Appearance Settings**
  - Upgrade `apps/web/app/admin/settings/appearance/page.tsx` to include visual cards for template selection (`2_5D_SCROLL`, `BENTO_OBSIDIAN`, `MINIMALIST_LUXE`), section toggles, and CMS copy form fields.
- [x] **Task 6.2: 1-Click Save & Instant Eviction**
  - Wire save handler to `/api/admin/settings` with success toast and live preview button.

### Phase 7: Verification, SonarQube & Graphify Sync
- [x] **Task 7.1: Frontend Compilation & Type-Checking**
  - Run `bun --cwd apps/web build` ensuring zero TypeScript/Next.js errors.
- [x] **Task 7.2: Responsive & Mobile Viewport Audit**
  - Verify layout on 360px mobile viewports (zero horizontal overflow, touch targets $\ge 44\text{px}$).
- [x] **Task 7.3: Graphify Knowledge Graph Update**
  - Execute `graphify update .` to synchronize AST and architecture dependencies.
