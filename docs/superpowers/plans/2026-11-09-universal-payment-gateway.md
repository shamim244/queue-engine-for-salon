# Universal Pluggable Payment Gateway Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an extensible, strategy-based Universal Payment Gateway Engine supporting Dynamic NPCI UPI QR with 1-tap Android intent, Cash/Counter settlement, and Razorpay Sandbox mode, wired to automated subscription activation and quota synchronization.

**Architecture:** Strategy & Adapter pattern with `PaymentGatewayAdapter` interface. Concrete adapters (`UpiQrPaymentAdapter`, `CashPaymentAdapter`, `RazorpaySandboxPaymentAdapter`) handle provider specifics. A central `PaymentService` manages order dispatch, verification, and automated downstream fulfillment (extending subscription validity and synchronizing organization quotas). The frontend features a client-computed Universal Payment Modal with HTML5 canvas QR generation, zero server waste, and Web Audio API chimes.

**Tech Stack:** Bun, Elysia, TypeScript, TypeBox, MySQL 8.0, Next.js 16 (React 19), Tailwind CSS, Lucide icons, HTML5 Canvas QR / Web Audio API.

**Spec:** `docs/prd/05_universal_payment_gateway_prd.md` & `docs/trd/05_universal_payment_gateway_trd.md`

## Global Constraints

- Never use browser-blocking `alert()` or `confirm()` dialogs.
- Zero server timers or polling loops; client handles QR rendering and expiration countdowns.
- Mobile touch targets must be $\ge 48\text{px}$ for Android one-handed thumb interaction.
- All monetary amounts stored as `DECIMAL(10,2)` in INR currency.
- Strict TypeBox validation on all Elysia API routes.
- Full offline / in-memory fallback resilience if MySQL is temporarily disconnected.

## Review Focus

1. **Amount mismatch tamper resistance:** Client cannot tamper with amount during verification; the backend validates against the stored order amount.
2. **Subscription period rollover:** If an organization with an active subscription ending in 15 days renews for 3 months (90 days), the new expiration date must be `existing_expires_at + 90 days`, not `now + 90 days`.
3. **NPCI UPI URI parameter conformance:** UPI string must strictly adhere to NPCI specification (`upi://pay?pa=...&pn=...&am=...&tr=...&cu=INR&tn=...`).
4. **Offline in-memory store parity:** Every operation must work seamlessly in both MySQL and `memoryStore`.
5. **Disabled cycle checkout prevention:** Cannot initiate checkout for a cycle that is marked disabled (`cycle_enabled: false`) in the plan.

---

## Tasks

### Task 1: Database Migration & Persistence Schema
**Files:**
- Modify: `apps/api/src/db/mysql.ts`
- Modify: `apps/api/src/db/repositories/store.ts`
- Modify: `apps/api/src/engine/types.ts`

- [ ] Add `payment_orders` table to `runMigrations` in `apps/api/src/db/mysql.ts`.
- [ ] Add `organization_subscriptions` table to `runMigrations` in `apps/api/src/db/mysql.ts`.
- [ ] Define `PaymentProvider`, `PaymentTargetType`, `PaymentOrderStatus`, `PaymentOrder`, `OrganizationSubscription` in `apps/api/src/engine/types.ts`.
- [ ] Add `paymentOrders: Map<string, PaymentOrder>` and `organizationSubscriptions: Map<string, OrganizationSubscription>` in `apps/api/src/db/repositories/store.ts`.
- [ ] Add safe synchronization to `syncDemoToMySql` in `apps/api/src/db/repositories/store.ts`.

---

### Task 2: Payment Adapters & Service Core
**Files:**
- Create: `apps/api/src/payment/types.ts`
- Create: `apps/api/src/payment/adapter.ts`
- Create: `apps/api/src/payment/adapters/upi-qr.adapter.ts`
- Create: `apps/api/src/payment/adapters/cash.adapter.ts`
- Create: `apps/api/src/payment/adapters/razorpay.adapter.ts`
- Create: `apps/api/src/payment/payment.service.ts`
- Create: `apps/api/src/db/repositories/payment.repo.ts`

- [ ] Create `apps/api/src/payment/types.ts` and `apps/api/src/payment/adapter.ts` defining `PaymentGatewayAdapter`.
- [ ] Implement `UpiQrPaymentAdapter` generating standard NPCI UPI URI strings and handling UTR verification.
- [ ] Implement `CashPaymentAdapter` generating counter settlement references and manual verification.
- [ ] Implement `RazorpaySandboxPaymentAdapter` creating sandbox orders and HMAC-SHA256 signature verification.
- [ ] Implement `payment.repo.ts` with `createOrder`, `getOrderById`, `updateOrderStatus`, `createSubscription`, `getActiveSubscriptionByOrgId`.
- [ ] Implement `PaymentService` with `createPaymentOrder`, `verifyPayment`, and `executeFulfillment` (subscription activation, period calculation, quota update).

---

### Task 3: Elysia Payment REST Endpoints
**Files:**
- Create: `apps/api/src/routes/payment.routes.ts`
- Modify: `apps/api/index.ts`

- [ ] Implement `POST /api/payments/create-order` with TypeBox schema validation.
- [ ] Implement `POST /api/payments/verify` with TypeBox schema validation.
- [ ] Implement `GET /api/payments/:id` retrieving order status.
- [ ] Implement `GET /api/salons/organizations/:id/subscription` retrieving current active subscription and expiration.
- [ ] Mount `paymentRoutes` in `apps/api/index.ts`.

---

### Task 4: Automated Backend Unit & Integration Tests
**Files:**
- Create: `apps/api/test/payment-gateway.test.ts`

- [ ] Write tests verifying `UpiQrPaymentAdapter` generates correct NPCI format.
- [ ] Write tests verifying `CashPaymentAdapter` settles cash orders with audit reference.
- [ ] Write tests verifying `RazorpaySandboxPaymentAdapter` verifies HMAC signatures and detects tampering.
- [ ] Write tests verifying `PaymentService.verifyPayment` triggers subscription activation and extends expiration dates properly.
- [ ] Run `bun test apps/api/test/payment-gateway.test.ts` and ensure 100% tests pass.

---

### Task 5: Frontend API Client Extension
**Files:**
- Modify: `apps/web/lib/api.ts`

- [ ] Add `PaymentOrder`, `PaymentOrderResult`, `PaymentVerificationPayload`, `OrganizationSubscription` interfaces.
- [ ] Add `api.payments.createOrder(payload)`.
- [ ] Add `api.payments.verify(payload)`.
- [ ] Add `api.payments.getOrder(id)`.
- [ ] Add `api.salons.getSubscription(orgId)`.

---

### Task 6: Universal Payment Modal Component
**Files:**
- Create: `apps/web/components/checkout/universal-payment-modal.tsx`

- [ ] Build responsive modal with $\ge 48\text{px}$ touch targets.
- [ ] Implement Tab 1 "UPI QR & App":
  - Client-side QR rendering using HTML5 `<canvas>` or inline SVG.
  - Android 1-tap "Pay with UPI App" deep-link button (`upi://pay?...`).
  - UTR / Transaction Reference verification input with "Verify Payment" button.
- [ ] Implement Tab 2 "Cash / Counter Settlement":
  - Counter payment note/operator input and instant settlement button.
- [ ] Implement Tab 3 "Card / NetBanking (Razorpay Sandbox)":
  - Sandbox test simulation with one-click successful verification.
- [ ] Implement client-side 10-minute session countdown timer (Zero server waste).
- [ ] Implement Web Audio API celebratory chime on payment completion.

---

### Task 7: Salon Owner Billing Integration & End-to-End Verification
**Files:**
- Modify: `apps/web/app/owner/billing/page.tsx`

- [ ] Connect "Select Plan" button on pricing cards to trigger `UniversalPaymentModal` with selected plan and cycle.
- [ ] Display active subscription status banner at the top of `/owner/billing` (Plan Name, Expiration Date, Days Remaining, Quota limits).
- [ ] Verify complete end-to-end checkout flow via UPI QR, Cash, and Sandbox.
- [ ] Run `bun run build:web` to verify zero TypeScript or Next.js build errors.
