# Omni-Channel Coupon Code System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an omni-channel coupon code discount engine supporting SaaS subscriptions and salon services, with Flat/Percentage discounts, max caps, minimum bill thresholds, usage caps, per-user limits, and seamless integration into the Universal Payment Modal.

**Architecture:** Dual-target validation engine with persistent MySQL ledger (`coupons` & `coupon_redemptions`) and in-memory caching. Coupons validate target scoping (`SUBSCRIPTION` vs `SALON_SERVICE`), date validity, spend thresholds, and user usage limits. The `UniversalPaymentModal` and checkout pipelines seamlessly recalculate net payable amounts before payment settlement and record redemptions atomically upon payment verification.

**Tech Stack:** Bun, Elysia, TypeScript, TypeBox, MySQL 8.0, Next.js 16 (React 19), Tailwind CSS, Lucide icons.

**Spec:** `docs/prd/06_coupon_code_system_prd.md` & `docs/trd/06_coupon_code_system_trd.md`

## Global Constraints

- Never use browser-blocking `alert()` or `confirm()` dialogs.
- Zero server timers or polling loops; client-compute for discount math rendering.
- Mobile touch targets must be $\ge 48\text{px}$ for Android one-handed thumb interaction.
- Coupon codes are normalized to uppercase and trimmed for case-insensitive matching.
- Strict TypeBox validation on all Elysia API routes.
- Full offline / in-memory fallback resilience if MySQL is temporarily disconnected.

## Review Focus

1. **Percentage discount cap enforcement:** If a coupon gives 50% discount with `max_discount_amount = 200`, an order of ₹1,000 must discount exactly ₹200 (not ₹500).
2. **Minimum order threshold barrier:** If `min_order_amount = 500`, an order of ₹499 must be rejected with an informative error.
3. **Per-user redemption throttling:** If `max_uses_per_user = 1`, a subsequent application attempt by the same user/org must be blocked.
4. **Target scoping leak prevention:** A `SALON_SERVICE` coupon for a haircut cannot discount a SaaS plan, and vice versa.
5. **Over-discount floor:** Discount cannot exceed the total order amount; `netPayable` must never be negative.

---

## Tasks

### Task 1: Database Migration & Persistence Schema
**Files:**
- Modify: `apps/api/src/db/mysql.ts`
- Modify: `apps/api/src/engine/types.ts`
- Modify: `apps/api/src/db/repositories/store.ts`

- [ ] Add `coupons` table to `runMigrations` in `apps/api/src/db/mysql.ts`.
- [ ] Add `coupon_redemptions` table to `runMigrations` in `apps/api/src/db/mysql.ts`.
- [ ] Define `CouponTargetType`, `CouponDiscountType`, `CouponStatus`, `Coupon`, `CouponRedemption`, `ApplyCouponInput`, `ApplyCouponResult` in `apps/api/src/engine/types.ts`.
- [ ] Add `coupons: Map<string, Coupon>` and `couponRedemptions: Map<string, CouponRedemption>` to `memoryStore` in `apps/api/src/db/repositories/store.ts`.

---

### Task 2: Coupon Repository & Validation Service
**Files:**
- Create: `apps/api/src/coupon/types.ts`
- Create: `apps/api/src/db/repositories/coupon.repo.ts`
- Create: `apps/api/src/coupon/coupon.service.ts`

- [ ] Create `apps/api/src/coupon/types.ts`.
- [ ] Implement `coupon.repo.ts` (`createCoupon`, `getCouponByCode`, `getCouponById`, `getAllCoupons`, `updateCoupon`, `deleteCoupon`, `recordRedemption`, `getUserRedemptionCount`).
- [ ] Implement `coupon.service.ts` (`validateAndApplyCoupon` enforcing target scoping, expiry, min spend, max uses, per-user limits, and discount cap math).

---

### Task 3: Elysia Coupon REST Endpoints
**Files:**
- Create: `apps/api/src/routes/coupon.routes.ts`
- Modify: `apps/api/index.ts`

- [ ] Implement `POST /api/coupons/apply` with TypeBox schema validation.
- [ ] Implement `GET /api/coupons` with query filters (`targetType`, `salonId`, `status`).
- [ ] Implement `POST /api/coupons` for coupon creation.
- [ ] Implement `PATCH /api/coupons/:id` for editing and status toggling.
- [ ] Implement `DELETE /api/coupons/:id` for deactivation.
- [ ] Mount `couponRoutes` in `apps/api/index.ts`.

---

### Task 4: Automated Backend Unit & Integration Tests
**Files:**
- Create: `apps/api/test/coupon-system.test.ts`

- [ ] Write tests verifying flat and percentage discount calculations.
- [ ] Write tests verifying `max_discount_amount` cap on high-value orders.
- [ ] Write tests verifying `min_order_amount` rejection.
- [ ] Write tests verifying target scoping isolation (`SUBSCRIPTION` vs `SALON_SERVICE`).
- [ ] Write tests verifying `max_uses` and `max_uses_per_user` limits.
- [ ] Write tests verifying REST endpoints (`POST /apply`, `GET /`, `POST /`).
- [ ] Run `bun test apps/api/test/coupon-system.test.ts` and verify 100% pass rate.

---

### Task 5: Frontend API Client Extension
**Files:**
- Modify: `apps/web/lib/api.ts`

- [ ] Add `Coupon`, `CouponRedemption`, `ApplyCouponInput`, `ApplyCouponResult` interfaces.
- [ ] Add `api.coupons.apply(payload)`.
- [ ] Add `api.coupons.getAll(params)`.
- [ ] Add `api.coupons.create(data)`.
- [ ] Add `api.coupons.update(id, data)`.
- [ ] Add `api.coupons.delete(id)`.

---

### Task 6: Universal Payment Modal Coupon Integration
**Files:**
- Modify: `apps/web/components/checkout/universal-payment-modal.tsx`
- Modify: `apps/api/src/payment/payment.service.ts`

- [ ] Add coupon input box and "Apply" button inside `UniversalPaymentModal`.
- [ ] Dynamically compute and display discount breakdown (Original Price, Coupon Discount, Net Payable).
- [ ] Update order generation to pass `couponId` and `couponDiscount` into payment order metadata.
- [ ] In `payment.service.ts` fulfill hook, record coupon redemption in `coupon_redemptions` upon verified payment.

---

### Task 7: Salon Owner Coupon Suite Upgrade & End-to-End Verification
**Files:**
- Modify: `apps/web/app/owner/coupons/page.tsx`

- [ ] Upgrade `OwnerCouponsContent` from static dummy state to live backend data (`api.coupons.getAll`, `create`, `update`, `delete`).
- [ ] Add active/expired filters and status toggles.
- [ ] Run `bun run build:web` to ensure clean TypeScript and Next.js production build.
