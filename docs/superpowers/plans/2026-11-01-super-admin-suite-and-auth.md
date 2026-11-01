# Super Admin Suite & Unified Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, enterprise-grade Super Admin Panel suite (Overview Telemetry, Guided Onboarding Wizard, General/Appearance/System/Security Settings) and a unified Authentication system (Login, Logout, Role-based Redirection, Route Guards) connecting Next.js 15 (`apps/web`) and Bun/Elysia (`apps/api`).

**Architecture:** A decoupled full-stack architecture where `apps/api` provides dedicated admin routes (`/api/admin/*`) for settings, telemetry, and atomic onboarding, while `apps/web` provides a dedicated `/login` page with role-based routing, an auth guard wrapper for `/admin/*`, an onboarding wizard (`/admin/onboarding`), and modular settings pages (`/admin/settings`, `/admin/settings/appearance`, `/admin/settings/system`, `/admin/security`).

**Tech Stack:** Bun v1.4.3, ElysiaJS, Next.js 15 (App Router), React 19, Tailwind CSS v3.4, Lucide React, Zod, React Hook Form, shadcn/ui.

**Spec:** `docs/01_PRODUCT_REQUIREMENTS_DOCUMENT_(PRD).md` and `docs/05_FRONTEND_UI_PANELS_SPECIFICATION.md` (Panel 1).

## Global Constraints

- Backend runtime must remain Bun v1.4.3 on port 3001 (`apps/api`).
- Frontend runtime must remain Next.js 15 App Router on port 3000 (`apps/web`).
- All existing 29 tests (14 API + 15 Web) must continue to pass cleanly (`bun test`).
- Zero-trust token authentication via Bearer header and `engine_session` / `engine_token` cookies.
- All client pages using `useSearchParams()` must be wrapped in `<Suspense>` boundaries.
- Full TypeScript strict type safety without `any` regressions on shared interfaces.

## Review Focus

1. **Multi-Identifier Login (Username, Phone, Email)**: Verify user can authenticate with raw phone (e.g. `9876543210` or `+91 98765 43210`), email (`admin@engineque.com`), or username (`admin`).
2. **Unauthenticated Admin Interception**: Direct navigation to `/admin/*` without an active `SUPER_ADMIN` session redirects to `/login?redirect=...` without flashing administrative content.
3. **Emergency Platform Kill-Switch**: Admin triggering maintenance mode immediately invalidates sessions and broadcasts lockdown status.
4. **Onboarding Slug Collision Protection**: Onboarding a salon with an existing slug automatically validates uniqueness and offers available alternatives.
5. **Dynamic Platform Configuration Persistence**: Saving appearance branding, notification gateways, and business defaults immediately updates backend state and reflects across panels.

---

### Task 1: Enterprise Unified Authentication & Protected Route Guard System

**Files:**
- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/components/auth-guard.tsx`
- Modify: `apps/web/app/admin/layout.tsx`
- Test: `apps/web/test/auth-guard.test.ts`

**Interfaces:**
- Consumes: `useAuth()` from `@/lib/auth-context`, `api.auth.login()`, `api.auth.logout()`
- Produces: `AuthGuard` component, unified `/login` page with 1-click role presets (`SUPER_ADMIN`, `SALON_OWNER`, `STAFF`, `CUSTOMER`)

- [ ] **Step 1: Write failing frontend auth guard and login test**

Create `apps/web/test/auth-guard.test.ts` verifying:
- Successful login sets token and redirects to correct panel based on role (`SUPER_ADMIN` -> `/admin`, `SALON_OWNER` -> `/owner`, `STAFF` -> `/s/ramesh-barber/station`, `CUSTOMER` -> `/me`).
- Preserves `?redirect=/admin/settings` URL query upon successful authentication.
- Invalid credentials render user-friendly error message.
- Logout cleans cookies and localStorage, redirecting to `/login`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/test/auth-guard.test.ts`
Expected: FAIL (files do not exist yet)

- [ ] **Step 3: Implement `apps/web/components/auth-guard.tsx`**

Implement `AuthGuard({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "SUPER_ADMIN" | "SALON_OWNER" | "STAFF" })`:
- Inspects `user` and `isLoading` from `useAuth()`.
- While loading, displays an elegant skeleton/pulsing loader.
- If not logged in or role does not match, redirects to `/login?redirect=${currentPath}` and shows an access-denied unlock card.

- [ ] **Step 4: Implement `apps/web/app/login/page.tsx`**

Implement glassmorphic unified login page:
- Form fields: Identifier (Username/Phone/Email) + Password (with Show/Hide toggle) + Remember Me.
- Demo Quick-Fill Buttons:
  - 👑 Super Admin (`admin / Admin@123`)
  - 💈 Salon Owner (`aura_owner / Aura@123`)
  - ✂️ Stylist/Barber (`ramesh / Ramesh@123`)
  - 👤 Customer Demo
- Proper validation via React Hook Form / Zod.
- Smooth redirect upon successful login.

- [ ] **Step 5: Update `apps/web/app/admin/layout.tsx` with `AuthGuard`**

Wrap admin layout content with `<AuthGuard requiredRole="SUPER_ADMIN">`, add user avatar chip with role badge, and hook up the "Sign Out" button to `logout()`.

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test apps/web/test/auth-guard.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/login/page.tsx apps/web/components/auth-guard.tsx apps/web/app/admin/layout.tsx apps/web/test/auth-guard.test.ts
git commit -m "feat(auth): add unified login page with role presets and admin route guard"
```

---

### Task 2: Backend Admin Configuration, Telemetry & Onboarding API

**Files:**
- Create: `apps/api/src/routes/admin.routes.ts`
- Modify: `apps/api/src/db/repository.ts`
- Modify: `apps/api/index.ts`
- Modify: `apps/web/lib/api.ts`
- Test: `apps/api/test/admin-api.test.ts`

**Interfaces:**
- Consumes: `repository`, `authService`, `websocketHub`
- Produces:
  - `GET /api/admin/stats`: `{ totalSalons, totalStylists, totalTicketsToday, socketClientsCount, uptime, systemHealth }`
  - `GET /api/admin/settings`: Platform settings (General, Appearance, Engine, Gateways)
  - `POST /api/admin/settings`: Updates platform configuration
  - `GET /api/admin/audit-logs`: Administrative event trail
  - `POST /api/admin/onboard`: Atomic registration of salon + owner credentials + stylists + services
  - `POST /api/admin/kill-switch`: Global maintenance lockdown toggle
  - `apiClient.admin.*` in `apps/web/lib/api.ts`

- [ ] **Step 1: Write failing backend admin routes test**

Create `apps/api/test/admin-api.test.ts` testing:
- Fetching admin telemetry stats returns correct count of salons and stylists.
- Reading and updating platform settings persists changes in repository.
- Calling `/api/admin/onboard` creates a new salon with owner user credentials and initial service catalog.
- Emergency kill-switch toggles maintenance lockdown state.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/api/test/admin-api.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `apps/api/src/db/repository.ts`**

Add in-memory & MySQL storage for:
- `platformSettings`: General, Appearance, Engine, and Gateway configuration with defaults.
- `auditLogs`: Recorded admin events (login, tenant onboarding, tier upgrade, kill-switch).
- `maintenanceMode`: Boolean flag and custom announcement banner.
- `onboardTenant(payload)`: Atomic creation of organization, salon, owner user, stylists, and services.

- [ ] **Step 4: Implement `apps/api/src/routes/admin.routes.ts` and mount in `apps/api/index.ts`**

Implement Elysia endpoints with type schemas and authentication validation. Mount via `.use(adminRoutes)`.

- [ ] **Step 5: Extend `apps/web/lib/api.ts` with `api.admin` client**

Export `api.admin.getStats()`, `api.admin.getSettings()`, `api.admin.updateSettings()`, `api.admin.getAuditLogs()`, `api.admin.onboard()`, and `api.admin.toggleKillSwitch()`.

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test apps/api/test/admin-api.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/admin.routes.ts apps/api/src/db/repository.ts apps/api/index.ts apps/web/lib/api.ts apps/api/test/admin-api.test.ts
git commit -m "feat(api): add admin telemetry, settings, atomic onboarding, and kill-switch routes"
```

---

### Task 3: Guided Multi-Step Tenant Onboarding Wizard

**Files:**
- Create: `apps/web/app/admin/onboarding/page.tsx`
- Test: `apps/web/test/onboarding.test.ts`

**Interfaces:**
- Consumes: `api.admin.onboard()`, `api.salons.getAll()`
- Produces: Interactive 5-step onboarding wizard at `/admin/onboarding`

- [ ] **Step 1: Write failing test for onboarding wizard**

Create `apps/web/test/onboarding.test.ts` verifying:
- Auto-generates slug from salon name (e.g., "Royal Barber & Spa" -> "royal-barber-spa").
- Step progression from Salon Identity -> Architecture Model -> Owner Credentials -> Stylists -> Services -> Success Launch Kit.
- Prevents submission if required fields (name, phone, owner username, password) are empty.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/test/onboarding.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `apps/web/app/admin/onboarding/page.tsx`**

Build full multi-step wizard:
- Step 1: Salon Name, Slug with instant availability check, Business Phone, Address, City.
- Step 2: Architecture mode picker (Rural Solo Barber vs Modern Multi-Station) with visual comparison cards.
- Step 3: Owner Account creation (Owner Name, Username, Secure Password, Contact Email).
- Step 4: Stylists & Chairs Roster (Add team members with custom names and 4-digit PINs).
- Step 5: Service Menu Setup (Pre-filled templates: Classic Grooming vs Luxury Spa with prices and durations).
- Step 6: Instant Launch Kit (Live links to `/s/:slug`, `/s/:slug/tv`, `/s/:slug/station`, `/owner?salon=:slug`, and printable A4 QR poster download preview).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/test/onboarding.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/onboarding/page.tsx apps/web/test/onboarding.test.ts
git commit -m "feat(web): add comprehensive multi-step salon onboarding wizard"
```

---

### Task 4: Complete Admin Settings Suite (General, Appearance, System, Security)

**Files:**
- Create: `apps/web/app/admin/settings/page.tsx` (General Settings)
- Create: `apps/web/app/admin/settings/appearance/page.tsx` (Appearance & Themes)
- Create: `apps/web/app/admin/settings/system/page.tsx` (System Engine & Gateways)
- Create: `apps/web/app/admin/security/page.tsx` (Security & Audit Logs)
- Test: `apps/web/test/admin-settings.test.ts`

**Interfaces:**
- Consumes: `api.admin.getSettings()`, `api.admin.updateSettings()`, `api.admin.getAuditLogs()`, `api.admin.toggleKillSwitch()`
- Produces: Four fully featured administration configuration panels

- [ ] **Step 1: Write failing test for admin settings**

Create `apps/web/test/admin-settings.test.ts` verifying:
- Loading and saving General Settings (platform name, support email, default currency).
- Updating Appearance theme accent (Corporate Blue, Deep Obsidian, Emerald Pro, Amber).
- System Gateway simulator test trigger returns success.
- Security kill-switch triggers confirmation state and updates audit trail.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/test/admin-settings.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement General Settings (`apps/web/app/admin/settings/page.tsx`)**

- Platform identity: Platform Title, Support Email, Hotline Phone, Organization Registration No.
- Business defaults: Default Currency (INR ₹, USD $, EUR €), Timezone (Asia/Kolkata), Default Grace Period (3 mins), Auto-bump timer.

- [ ] **Step 4: Implement Appearance Settings (`apps/web/app/admin/settings/appearance/page.tsx`)**

- Visual Theme selector with live preview swatches (Corporate Blue, Deep Obsidian, Emerald Pro, Classic Barber Amber).
- White-labeling policy toggle, Custom CSS support, Custom domain routing toggle.
- Public display departure board style preferences (Airport Grid vs Clean Minimalist).

- [ ] **Step 5: Implement System & Engine Settings (`apps/web/app/admin/settings/system/page.tsx`)**

- Engine WebSocket heartbeat frequency (10s), auto-reconnect watchdog (3s).
- Notification Gateway configuration: Meta Cloud API (WhatsApp WABA), Twilio SMS, Gupshup, Simulator.
- Live test notification trigger button.
- Database & storage pool telemetry status indicator.

- [ ] **Step 6: Implement Security & Audit Center (`apps/web/app/admin/security/page.tsx`)**

- Active sessions metrics, token revocation engine status, bcrypt strength indicator.
- Emergency Platform Kill-Switch / Lockdown toggle with confirmation dialog.
- Administrative audit log feed with search, category filtering, and timestamp.

- [ ] **Step 7: Run test to verify it passes**

Run: `bun test apps/web/test/admin-settings.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/admin/settings/page.tsx apps/web/app/admin/settings/appearance/page.tsx apps/web/app/admin/settings/system/page.tsx apps/web/app/admin/security/page.tsx apps/web/test/admin-settings.test.ts
git commit -m "feat(web): build comprehensive admin settings suite and security audit center"
```

---

### Task 5: Admin Command Center Overview & Navigation Layout Refinement

**Files:**
- Modify: `apps/web/app/admin/page.tsx`
- Modify: `apps/web/app/admin/layout.tsx`
- Test: All tests across monorepo (`bun test`)

**Interfaces:**
- Consumes: All `api.admin.*` and `api.salons.*` endpoints
- Produces: Polished, production-ready Super Admin Command Center navigation and dashboard

- [ ] **Step 1: Upgrade `/admin` Overview Dashboard (`apps/web/app/admin/page.tsx`)**

- Connect to `api.admin.getStats()` for live engine telemetry.
- Add quick action toolbar: "🚀 Onboard Salon", "⚙️ General Settings", "🎨 Appearance", "💳 Subscription Tiers".
- Add Recent Audit Activity snippet and live engine socket health badge.
- Enhance Tenant Quick Cards with direct launch buttons.

- [ ] **Step 2: Upgrade `/admin/layout.tsx` Sidebar Navigation**

Organize sidebar into clean functional sections:
- **DASHBOARD**: Overview (`/admin`)
- **TENANTS**: Tenant Directory (`/admin/tenants`), Onboard Salon (`/admin/onboarding`)
- **MONETIZATION**: Subscription Tiers (`/admin/billing`)
- **SYSTEM SETTINGS**: General (`/admin/settings`), Appearance (`/admin/settings/appearance`), Engine & Gateways (`/admin/settings/system`), Security & Audit (`/admin/security`)
- User Profile Chip with role badge (`SUPER_ADMIN`) and working Logout button.
- Real-time Bun Engine status pill.

- [ ] **Step 3: Run complete monorepo test suite & Next.js production build**

Run: `bun test`
Expected: All tests pass (original 29 + new admin & auth tests)
Run: `bun run build:web`
Expected: Clean build with 0 prerender or lint errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/page.tsx apps/web/app/admin/layout.tsx
git commit -m "feat(web): upgrade super admin command center overview and structured sidebar navigation"
```
