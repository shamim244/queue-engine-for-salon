# Dynamic Subscription Plans & Feature Quota Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded subscription tiers (`STARTER`, `PRO`, `ENTERPRISE`) with an unconstrained, fully dynamic subscription plan management engine that allows SuperAdmin to create, edit, customize quotas, selectively toggle durations (1M, 3M, 6M, 1Y), calibrate multi-cycle discounts two-ways, and bundle features cleanly.

**Architecture:** 
1. Relational schema in MySQL (`subscription_plans`) with in-memory TTL caching in Elysia/Bun.
2. Headless REST API (`/api/plans`) with TypeBox validation.
3. SuperAdmin Plan Creator Modal (`CreatePlanModal`) with real-time two-way discount calibrator and 12-feature checklist.
4. Tenant Billing Portal (`/owner/billing`) with interactive cycle switcher (`1M | 3M | 6M | 1Y`).

**Tech Stack:** Bun, Elysia, TypeScript, TypeBox, MySQL 8.0, Next.js 16 (App Router, Turbopack), Tailwind CSS, Lucide icons.

**Spec:** Defined in [`docs/architecture/saas-subscription-wallet-payment-architecture.md`](file:///v:/salon/queue-engine-for-salon/docs/architecture/saas-subscription-wallet-payment-architecture.md), [`docs/prd/04_dynamic_subscription_plans_prd.md`](file:///v:/salon/queue-engine-for-salon/docs/prd/04_dynamic_subscription_plans_prd.md), and [`docs/trd/04_dynamic_subscription_plans_trd.md`](file:///v:/salon/queue-engine-for-salon/docs/trd/04_dynamic_subscription_plans_trd.md).

---

## Global Constraints
- **Zero Server Waste (Rule 1):** Two-way calibrator math and cycle switches compute reactively on the client RAM without polling.
- **Sub-50ms Catalog Caching (Rule 2):** Public plan catalog is cached in memory with 60s TTL and invalidated immediately upon mutation.
- **Android Mobile-First (Rule 7):** All cards, inputs, and toggles must feature generous touch targets ($\ge 44\text{px}$–$48\text{px}$).
- **Non-Destructive Archival:** Deleting a plan sets `status = 'ARCHIVED'` so existing tenant organizations with active subscriptions do not break.

---

## Tasks

### Task 1: Database Schema & In-Memory Fallback
- [ ] In `apps/api/src/db/mysql.ts`, add `subscription_plans` table to `safeTables`.
- [ ] In `apps/api/src/engine/types.ts`, add `SubscriptionPlan`, `PlanStatus`, `BillingCycle`, and `CreatePlanPayload` interfaces.
- [ ] In `apps/api/src/db/repositories/store.ts`, add `plans: new Map<string, SubscriptionPlan>()` to `memoryStore` and seed default demo plans.
- [ ] Run `bun -e` script to execute table creation in MySQL `engine_que_salon`.

### Task 2: Plan Repository (`plan.repo.ts`) with Dynamic Quota Resolution
- [ ] Create `apps/api/src/db/repositories/plan.repo.ts`:
  - `getAllPlans(options?: { status?: string })`: Fetches from MySQL or memory fallback.
  - `getPlanById(id: string)` and `getPlanBySlug(slug: string)`: Fast cached lookups.
  - `createPlan(payload: CreatePlanPayload)`: Validates and inserts plan.
  - `updatePlan(id: string, updates: Partial<CreatePlanPayload>)`: Updates plan and invalidates cache.
  - `archivePlan(id: string)`: Sets status to `ARCHIVED`.
- [ ] In `apps/api/src/db/repositories/organization.repo.ts`, update `checkOrganizationBranchQuota` and `checkSalonStylistQuota` to check `org.planId` against dynamic plans.
- [ ] Export `planRepo` methods in `apps/api/src/db/repositories/index.ts`.
- [ ] Write unit test `apps/api/test/dynamic-plans.test.ts` (TDD: verify plan creation, multi-cycle prices, and dynamic quota resolution).

### Task 3: Backend REST Endpoints in Elysia (`plan.routes.ts`)
- [ ] Create `apps/api/src/routes/plan.routes.ts`:
  - `GET /api/plans`: Returns active plans (or all plans for admin).
  - `POST /api/plans`: Creates a new plan (TypeBox schema validation).
  - `GET /api/plans/:id`: Retrieves single plan.
  - `PATCH /api/plans/:id`: Updates an existing plan.
  - `DELETE /api/plans/:id`: Archives plan.
- [ ] Mount `planRoutes` in `apps/api/src/server.ts`.
- [ ] Add API integration test in `apps/api/test/dynamic-plans.test.ts` verifying endpoints and HTTP status codes.

### Task 4: Frontend API Client in `apps/web/lib/api.ts`
- [ ] Add `SubscriptionPlan`, `PlanStatus`, `BillingCycle`, and `CreatePlanPayload` to `apps/web/lib/api.ts`.
- [ ] Add `api.plans` methods:
  - `getAll: (options?: { status?: string }) => Promise<{ success: boolean; plans: SubscriptionPlan[] }>`
  - `get: (idOrSlug: string) => Promise<{ success: boolean; plan: SubscriptionPlan }>`
  - `create: (data: CreatePlanPayload) => Promise<{ success: boolean; plan: SubscriptionPlan }>`
  - `update: (id: string, data: Partial<CreatePlanPayload>) => Promise<{ success: boolean; plan: SubscriptionPlan }>`
  - `archive: (id: string) => Promise<{ success: boolean; message: string }>`

### Task 5: SuperAdmin Plan Creator Modal & Management Suite (`/admin/billing`)
- [ ] Create `apps/web/components/admin/billing/create-plan-modal.tsx`:
  - Form fields: Name, Slug, Badge, Description.
  - Base 1-Month Price input.
  - Duration selective toggles (`1 Month`, `3 Months`, `6 Months`, `1 Year`).
  - Two-Way Smart Calibrator:
    - Inputting discount % auto-computes price.
    - Inputting custom price auto-computes discount % badge.
  - Quotas: `Max Branches`, `Max Stylists per Branch`.
  - 12-Feature Checklist with real platform capabilities.
  - Submit button with validation and loading state.
- [ ] In `apps/web/app/admin/billing/page.tsx`:
  - Replace static `tiers` array with live data from `api.plans.getAll({ status: 'all' })`.
  - Add **"+ Create New Plan"** button in header.
  - Mount `CreatePlanModal`.
  - Add Edit / Archive actions on plan cards.

### Task 6: Salon Owner Multi-Cycle Billing Portal (`/owner/billing`)
- [ ] In `apps/web/app/owner/billing/page.tsx`:
  - Fetch active plans via `api.plans.getAll()`.
  - Add interactive horizontal cycle segmented control: `[ 1 Month | 3 Months | 6 Months | 1 Year ]`.
  - Live client-side price & savings badge calculation based on selected cycle.
  - Render feature checklist and branch/stylist quotas.

### Task 7: Verification & Build
- [ ] Run `bun test apps/api/test/dynamic-plans.test.ts` and confirm all tests pass.
- [ ] Run `bun run build:web` (`next build`) to ensure 0 TypeScript or bundling errors.
- [ ] Commit all changes to git.
