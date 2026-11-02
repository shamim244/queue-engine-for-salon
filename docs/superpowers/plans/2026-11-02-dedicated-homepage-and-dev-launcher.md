# Dedicated Home Page & Developer Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a high-conversion, production-grade B2B SaaS Home Page for "Engine Que System" at `/`, relocate the developer multi-panel testing launcher to `/dev`, and implement a self-service salon owner registration page at `/register`.

**Architecture:** Next.js 15 App Router (`apps/web`) with Tailwind CSS, Lucide icons, and shadcn/ui base primitives. The root `/` becomes a marketing landing page showcasing the dual-engine architecture (Rural Solo-Barber vs Modern Multi-Station), live queue simulator card, 6-pillar feature grid, pricing tiers, and testimonials. The existing multi-panel launcher is preserved at `/dev`, and new salon signups are supported via `/register`.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v3.4, Lucide React, Bun v1.4.3.

**Spec:** PRD (`docs/01_PRODUCT_REQUIREMENTS_DOCUMENT_(PRD).md`) and UI Specification (`docs/05_FRONTEND_UI_PANELS_SPECIFICATION.md`).

## Global Constraints

- Preserve all existing 76 tests across the monorepo.
- Next.js 15 App Router strict SSR compliance: any client component reading `useSearchParams` must be wrapped in `<Suspense>`.
- Dark-mode first aesthetics matching `bg-slate-950` with high contrast and smooth micro-interactions.
- Seamless bi-directional navigation between `/` (Marketing Home), `/login` (Unified Auth), `/register` (Salon Onboarding), and `/dev` (Testing Launcher).

## Review Focus

1. **Launcher Preservation**: All 6 original panel links, demo login credentials, and station shortcuts must remain fully accessible at `/dev`.
2. **Dual-Architecture Representation**: The landing page must clearly communicate both operational modes (Rural Solo-Barber vs Modern Multi-Station) without favoring one over the other.
3. **Hero Live Simulation**: The hero queue simulator must realistically display ticket progression, wait time estimation, and WhatsApp preview.
4. **Self-Service Registration**: `/register` must validate required inputs (name, slug, phone, owner credentials) and correctly call `api.admin.onboard()`.
5. **Zero-Error Prerendering**: Production build (`bun run build:web`) must generate static pages for `/`, `/dev`, and `/register` with 0 type or lint errors.

---

### Task 1: Relocate Developer Multi-Panel Launcher to `/dev`

**Files:**
- Create: `apps/web/app/dev/page.tsx`
- Test: `apps/web/test/homepage.test.ts`

**Interfaces:**
- Consumes: `PanelCard` data, routes to `/admin`, `/owner`, `/staff/preferences`, `/s/:slug/station`, `/s/:slug`, `/s/:slug/tv`, `/me`
- Produces: Dedicated developer testing hub at `/dev` with banner link back to `/`

- [ ] **Step 1: Write failing test for launcher relocation**

Create `apps/web/test/homepage.test.ts` testing:
- `/dev` exports a default component `DevLauncherPage` that renders:
  - "Engine Que System" header with "Enterprise Multi-Role Launcher"
  - Quick action buttons to all 6 panels
  - Demo user credentials list (`admin / Admin@123`, `aura_owner / Aura@123`, `ramesh / Ramesh@123`)
  - Link pointing back to marketing Home (`/`)

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/test/homepage.test.ts`
Expected: FAIL (`Cannot find module '../app/dev/page'`)

- [ ] **Step 3: Implement `apps/web/app/dev/page.tsx`**

Move the current contents of `apps/web/app/page.tsx` to `apps/web/app/dev/page.tsx`, adding a prominent top notification banner:
- "🧪 Developer & QA Testing Launcher — You are viewing the multi-panel testing console. [Visit Public Marketing Home &rarr;](/)"
- Add navigation pills for quick access to `/login`, `/register`, `/admin`, `/owner`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/test/homepage.test.ts`
Expected: PASS for `/dev` tests

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dev/page.tsx apps/web/test/homepage.test.ts
git commit -m "feat(web): move multi-panel developer launcher to /dev"
```

---

### Task 2: Build the High-Conversion Platform Home Page (`apps/web/app/page.tsx`)

**Files:**
- Create: `apps/web/app/page.tsx`
- Modify: `apps/web/test/homepage.test.ts`

**Interfaces:**
- Consumes: `Button`, `Badge`, `Card` from `@/components/ui/*`, Lucide icons
- Produces: Complete marketing landing page at `/`

- [ ] **Step 1: Write failing test for marketing Home Page**

Add tests to `apps/web/test/homepage.test.ts` verifying:
- `/` renders headline "Real-Time Queue Engine for Modern Salons & Solo Barbers"
- Renders navigation bar with links: Features, Architecture, Pricing, Sign In (`/login`), Register (`/register`), Dev Launcher (`/dev`)
- Renders interactive dual-architecture showcase for `Rural Solo Barber` and `Modern Multi-Station`
- Renders 6-pillar feature grid (Door QR, WhatsApp Alerts, Chair Station PINs, Lobby TV, Speed Calibration, Super Admin)
- Renders pricing tiers (Solo Barber ₹0, Pro Salon ₹999, Enterprise Chain ₹2,999)
- Renders barber and salon owner testimonials

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/test/homepage.test.ts`
Expected: FAIL (Marketing home elements not present on current `/`)

- [ ] **Step 3: Implement `apps/web/app/page.tsx`**

Build the full landing page:
1. **Sticky Glassmorphic Header**:
   - Brand mark `EQ` with pulsing emerald live indicator.
   - Links: Architecture, Features, How It Works, Pricing.
   - Right actions: "Dev Launcher" pill (`/dev`), "Sign In" (`/login`), and primary CTA "Launch Salon Free" (`/register`).
2. **Hero Section**:
   - Badge: "⚡ Next-Gen Salon Operations Engine · Bun + Real-Time WebSocket".
   - Headline: "The Real-Time Queue Engine for Modern Salons & Solo Barbers".
   - Subhead: "Eliminate crowded benches and lost walk-ins. Zero-app QR check-in, automated WhatsApp chair alerts, and tactile mirror stations—built to scale from village barbers to luxury multi-chair chains."
   - Dual Primary CTAs: "Start Free Salon Trial" (`/register`) and "Explore Live Station Demo" (`/s/ramesh-barber/station`).
   - Interactive Live Queue Simulator Card:
     - Real-time ticket preview (`#104`, Amit Sharma, 12 mins wait, Status: "Chair Ready in 2 mins").
     - WhatsApp notification alert bubble.
     - Chair station status widget with Ramesh Kumar.
   - Social proof metric chips: "500+ Active Chairs", "<15ms Socket Dispatch", "99.9% Uptime".
3. **Dual-Architecture Mode Switcher (Core Differentiator)**:
   - Interactive tabs or split view comparing:
     - *Rural Solo Barber Edition*: 1 chair, 2G resilience, flexible cash pricing ₹[editable], 1-tap non-smartphone check-in, Hindi voice alerts.
     - *Modern Multi-Station Enterprise*: Multi-chair routing, airport departure lobby TV board, 4-digit mirror PINs, split UPI billing.
4. **Bento Feature Grid**:
   - 6 high-impact feature cards with visual diagrams and capability pills.
5. **Interactive 3-Step Walkthrough**:
   - Step 1: Door QR Scan -> Step 2: Live WhatsApp Wait Telemetry -> Step 3: Barber Summons & 1-Tap Checkout.
6. **Transparent Pricing Matrix**:
   - Solo Barber (₹0 Free Forever), Salon Pro (₹999/mo), Enterprise Chain (₹2,999/mo).
7. **Barber & Salon Owner Testimonials**:
   - Rural barber Ramesh Kumar and luxury salon owner Vikram Sethi testimonials.
8. **Final CTA & Footer**:
   - Direct launch links, system status indicator (Bun Core 3001, WebSocket Live), documentation and copyright.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/test/homepage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/page.tsx apps/web/test/homepage.test.ts
git commit -m "feat(web): build modern high-conversion marketing home page"
```

---

### Task 3: Build Self-Service Salon Registration Page (`apps/web/app/register/page.tsx`)

**Files:**
- Create: `apps/web/app/register/page.tsx`
- Modify: `apps/web/test/homepage.test.ts`

**Interfaces:**
- Consumes: `api.admin.onboard()` from `@/lib/api`, `useAuth()`
- Produces: Self-service salon onboarding portal at `/register`

- [ ] **Step 1: Write failing test for registration page**

Add tests to `apps/web/test/homepage.test.ts` verifying:
- `/register` renders "Start Your Salon with Engine Que"
- Form fields: Salon Name, Salon Slug, Contact Phone, Operating Mode (Rural Solo vs Modern Multi), Owner Username, Password
- Form validation requires all mandatory fields
- Submitting successfully calls `api.admin.onboard()` and directs to `/owner?salon=:slug`

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/test/homepage.test.ts`
Expected: FAIL (`Cannot find module '../app/register/page'`)

- [ ] **Step 3: Implement `apps/web/app/register/page.tsx`**

Client component wrapped in `<Suspense>`:
- Header with Engine Que branding and "Join 500+ Salons Modernizing Their Queues".
- Step 1: Salon Brand & Mode (Name, auto-slug, phone, Rural Solo vs Modern Multi picker).
- Step 2: Owner Account (Full Name, Username, Secure Password with eye toggle).
- Quick Test Preset button: "Autofill Demo Salon" for 1-click test creation.
- Submits atomically to `api.admin.onboard()` and stores auth session token.
- On success: shows success celebration card with direct links to:
  - 👑 Launch Owner Hub (`/owner?salon=:slug`)
  - 💺 Cutting Station (`/s/:slug/station`)
  - 🚪 Door QR (`/s/:slug`)
  - 📺 Lobby TV (`/s/:slug/tv`)

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/test/homepage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/register/page.tsx apps/web/test/homepage.test.ts
git commit -m "feat(web): add self-service salon owner registration page"
```

---

### Task 4: Complete Monorepo Test Suite & Production Build Verification

**Files:**
- Modify: `package.json` (if needed)
- Run: `bun test` and `bun run build:web`

- [ ] **Step 1: Run full test suite across monorepo**

Run: `bun test`
Expected: All 76+ tests pass with 0 failures

- [ ] **Step 2: Run Next.js production build**

Run: `bun run build:web`
Expected: Clean static page generation for all routes including `/`, `/dev`, `/register`, `/login`, `/admin`, `/owner`, etc.

- [ ] **Step 3: Commit and Tag**

```bash
git commit -m "chore(release): complete dedicated home page, dev launcher, and self-registration"
```
