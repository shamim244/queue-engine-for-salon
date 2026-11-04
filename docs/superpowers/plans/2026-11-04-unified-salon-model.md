# Unified Salon Model & Operating Mode Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the artificial bifurcation between "Solo Salon" and "Multi-Station Salon" (`RURAL_SOLO` vs `MODERN_MULTI`), unifying the entire platform into a single intelligent queue engine where any salon is dynamically characterized by its active station/stylist count ($N = 1$ is naturally single-chair/solo, and $N > 1$ is multi-chair/multi-station).

**Architecture:**
1. **Dynamic Capacity ($N \ge 1$):** Instead of static mode enums, station UI, ticket candidate routing, and customer options adapt dynamically from `stylists.length`. When $N = 1$, the station view hides chair switchers, and the door check-in skips stylist selection. When $N > 1$, station switching and preferred stylist routing unlock automatically.
2. **Zero-Friction Salon Growth:** Salons never need to "switch modes" or migrate. Adding a second stylist instantly transitions the salon from 1-chair to multi-chair.
3. **Headless & Flutter Readiness:** One unified API contract, one queue state machine, and one station UI path (`/s/[slug]/station`) for both web and future Flutter apps.

**Tech Stack:** Bun, ElysiaJS, Next.js 15, TypeScript, MySQL, WebSockets.

## Global Constraints
- Preserve backward compatibility for existing database records and API endpoints (`operatingMode` remains as an optional legacy field).
- Zero browser `alert()` or `confirm()` dialogs.
- Maintain client-compute principles (live timers in RAM, client QR rendering, client audio chime).
- All unit and integration test suites must pass (`bun test`).
- Next.js web application must compile cleanly (`bun run build:web`).

---

### Task 1: Unify Domain Types & Database Repository Logic

**Files:**
- Modify: `apps/api/src/engine/types.ts`
- Modify: `apps/api/src/db/repository.ts`
- Test: `apps/api/test/unified-salon-model.test.ts`

**Interfaces:**
- `Salon`: deprecate `operatingMode`, make it optional.
- `createSalon` / `onboardSalon`: remove mandatory `operatingMode`. Default template generation adapts based on initial `stylists` array length (1 stylist $\to$ solo setup; $>1$ $\to$ multi setup).

- [ ] **Step 1: Write unit tests for unified salon model**
Create `apps/api/test/unified-salon-model.test.ts` verifying:
- A salon with 1 stylist functions with single-chair auto-routing.
- A salon with $>1$ stylists functions with multi-station routing.
- Adding a stylist seamlessly transitions the salon from 1 chair to 2 chairs without altering any mode flag.

- [ ] **Step 2: Update `apps/api/src/engine/types.ts`**
Mark `SalonOperatingMode` as deprecated; make `operatingMode` optional on `Salon` and `CreateSalonPayload`.

- [ ] **Step 3: Update `apps/api/src/db/repository.ts`**
Make `operatingMode` optional in `createSalon` and default to dynamic detection. Keep `updateSalonOperatingMode` as a backward-compatible no-op.

- [ ] **Step 4: Run tests**
Run: `bun test apps/api/test/unified-salon-model.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/engine/types.ts apps/api/src/db/repository.ts apps/api/test/unified-salon-model.test.ts
git commit -m "refactor(api): unify salon domain model and deprecate artificial operatingMode"
```

---

### Task 2: Streamline API Routes & Shortcuts

**Files:**
- Modify: `apps/api/src/routes/salon.routes.ts`
- Modify: `apps/api/src/routes/admin.routes.ts`
- Modify: `apps/api/index.ts`

**Interfaces:**
- Direct all station shortcuts (`/s/:slug/barber`, `/s/:slug/desk`, `/s/:slug/staff`) to the unified `/s/:slug/station`.
- Make `operatingMode` optional in validation schemas for onboarding and salon updates.

- [ ] **Step 1: Update `apps/api/src/routes/salon.routes.ts`**
Make `/s/:slug/station` the primary station link in salon metadata. Maintain `/barber.html` and `/desk.html` as legacy static fallbacks.

- [ ] **Step 2: Update `apps/api/src/routes/admin.routes.ts`**
Make `operatingMode` optional in Elysia validation schemas.

- [ ] **Step 3: Run existing API tests**
Run: `bun test apps/api/test/admin-api.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/routes/salon.routes.ts apps/api/src/routes/admin.routes.ts apps/api/index.ts
git commit -m "refactor(api): route all station traffic through unified station endpoint"
```

---

### Task 3: Streamline Onboarding & Registration Wizards

**Files:**
- Modify: `apps/web/lib/onboarding.ts`
- Modify: `apps/web/app/register/page.tsx`
- Modify: `apps/web/app/admin/onboarding/page.tsx`
- Modify: `apps/web/test/onboarding.test.ts`

**Interfaces:**
- Remove the "Choose Operating Mode (Rural Solo vs Modern Multi)" step.
- Registration wizard asks for:
  1. Salon Details (Name, Phone, City, UPI ID).
  2. Owner & Chairs (Owner Name, Password, number of initial chairs/stylists).
  3. Services (Pre-fills popular salon catalog with customizable prices).

- [ ] **Step 1: Update `apps/web/lib/onboarding.ts`**
Update form data and template generator to build a unified catalog based on stylist count rather than mode flag.

- [ ] **Step 2: Update `apps/web/app/register/page.tsx`**
Remove the dual mode selection card from customer self-service registration.

- [ ] **Step 3: Update `apps/web/app/admin/onboarding/page.tsx`**
Remove the mode selection card from the admin tenant onboarding wizard.

- [ ] **Step 4: Update onboarding unit tests in `apps/web/test/onboarding.test.ts`**
Verify the streamlined wizard generates valid payloads without requiring `operatingMode`.

- [ ] **Step 5: Run tests**
Run: `bun test apps/web/test/onboarding.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add apps/web/lib/onboarding.ts apps/web/app/register/page.tsx apps/web/app/admin/onboarding/page.tsx apps/web/test/onboarding.test.ts
git commit -m "feat(onboarding): streamline registration wizard to unified salon model"
```

---

### Task 4: Synchronize Owner & Admin Panels

**Files:**
- Modify: `apps/web/app/owner/page.tsx`
- Modify: `apps/web/app/owner/layout.tsx`
- Modify: `apps/web/app/owner/staff/page.tsx`
- Modify: `apps/web/app/admin/tenants/page.tsx`
- Modify: `apps/web/app/admin/users/page.tsx`

**Interfaces:**
- Remove the mode toggle button from the owner dashboard.
- Remove artificial `tierQuotaMax = 1` restriction on staff creation; allow owners to freely add chairs/stylists as their business grows.
- In Admin Tenants table, display "Stations: X Active Chairs" instead of "Mode: Solo / Multi".

- [ ] **Step 1: Update `apps/web/app/owner/page.tsx` and `layout.tsx`**
Remove the "Toggle Mode" button and "Solo / Multi" badges. Display active chair count.

- [ ] **Step 2: Update `apps/web/app/owner/staff/page.tsx`**
Remove the 1-stylist quota cap so any salon owner can add more chairs as they expand.

- [ ] **Step 3: Update `apps/web/app/admin/tenants/page.tsx` and `users/page.tsx`**
Replace the static "Operating Mode" filter/field with live station count.

- [ ] **Step 4: Verify web routes compile**
Run: `bun run build:web`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/web/app/owner/page.tsx apps/web/app/owner/layout.tsx apps/web/app/owner/staff/page.tsx apps/web/app/admin/tenants/page.tsx apps/web/app/admin/users/page.tsx
git commit -m "refactor(owner-admin): display dynamic station capacity and eliminate mode toggle"
```

---

### Task 5: Adapt Station UI & Landing Page

**Files:**
- Modify: `apps/web/app/s/[slug]/station/page.tsx`
- Modify: `apps/web/app/page.tsx`

**Interfaces:**
- In `/s/[slug]/station`: Replace `isRural = salon?.operatingMode === "RURAL_SOLO"` with `isSolo = !stylists || stylists.length <= 1`. The UI seamlessly renders as a single-chair phone view when $N = 1$ and a multi-chair station when $N > 1$.
- In `/`: Update the landing page hero and features to showcase a single, adaptable platform for barbers, salons, and beauty studios of any size.

- [ ] **Step 1: Update `apps/web/app/s/[slug]/station/page.tsx`**
Remove `isRural` check. Drive all single vs multi chair layout decisions from `stylists.length <= 1`.

- [ ] **Step 2: Update `apps/web/app/page.tsx`**
Transform the landing page mode toggle into a live preview showing how the UI automatically scales from 1 chair to 10+ chairs.

- [ ] **Step 3: Verify build**
Run: `bun run build:web`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add apps/web/app/s/[slug]/station/page.tsx apps/web/app/page.tsx
git commit -m "feat(web): adapt station view dynamically by stylist count and unify landing page"
```

---

### Task 6: Full Suite Verification & Final Polish

- [ ] **Step 1: Run all tests in monorepo**
Run: `bun run test`
Expected: All 155+ tests pass.

- [ ] **Step 2: Run Next.js production build**
Run: `bun run build:web`
Expected: 25/25 routes compile cleanly.

- [ ] **Step 3: Final git status check and verification summary**
Verify repository is clean on `master`.
