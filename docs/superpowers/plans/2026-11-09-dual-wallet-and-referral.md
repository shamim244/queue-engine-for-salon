# Dual-Wallet & Referral Commission Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a double-entry dual-wallet and viral referral engine for B2B Salon Owners and B2C Consumers with atomic ledger transactions, fraud-proof payment/service conversion hooks, and 1-tap checkout deduction.

**Architecture:** Double-entry passbook ledger (`wallet_transactions`) with atomic balance updates in `wallets`. Attribution engine tracks PENDING referrals until first verified transaction (SaaS subscription payment for B2B; completed salon visit for B2C). Integrated into `UniversalPaymentModal` with a 1-tap wallet switch allowing owners to pay down to ₹0 using accumulated credits.

**Tech Stack:** Bun, Elysia, TypeScript, TypeBox, MySQL 8.0, Next.js 16 (React 19), Tailwind CSS, Lucide icons.

**Spec:** `docs/prd/07_dual_wallet_and_referral_prd.md` & `docs/trd/07_dual_wallet_and_referral_trd.md`

## Global Constraints

- Never use browser-blocking `alert()` or `confirm()` dialogs.
- Zero server timers or polling loops; client handles real-time deduction math.
- Mobile touch targets must be $\ge 48\text{px}$ for Android one-handed thumb interaction.
- Strict TypeBox validation on all Elysia API routes.
- Balance debits must enforce anti-overdraft protection; wallet balance can never fall below 0.
- Full offline / in-memory fallback resilience if MySQL is temporarily disconnected.

## Review Focus

1. **Anti-Overdraft Guard:** Debit request exceeding spendable balance must fail immediately and atomically.
2. **Double-Spending Prevention:** Parallel concurrent checkout requests cannot spend the same wallet balance twice.
3. **Zero-Fraud Attribution:** Referral reward must only trigger when referred organization completes payment, not at registration.
4. **Checkout Net Payable Formula:**
   $$\text{Net Payable} = \max(0, \text{Base Price} - \text{Coupon Discount} - \text{Wallet Deduction})$$
   If Net Payable = 0, order settles immediately with method `'WALLET'`.
5. **Ledger Immutability:** Every balance change must have a corresponding record in `wallet_transactions` with `balance_after`.

---

## Tasks

### Task 1: Database Migration & Persistence Schema
**Files:**
- Modify: `apps/api/src/db/mysql.ts`
- Modify: `apps/api/src/engine/types.ts`
- Modify: `apps/api/src/db/repositories/store.ts`

- [x] Add `wallets` table to `runMigrations` in `apps/api/src/db/mysql.ts`.
- [x] Add `wallet_transactions` table to `runMigrations` in `apps/api/src/db/mysql.ts`.
- [x] Add `referral_attributions` table to `runMigrations` in `apps/api/src/db/mysql.ts`.
- [x] Define `WalletType`, `WalletTransactionType`, `ReferralType`, `ReferralStatus`, `Wallet`, `WalletTransaction`, `ReferralAttribution` in `apps/api/src/engine/types.ts`.
- [x] Add `wallets`, `walletTransactions`, `referralAttributions` maps to `memoryStore` in `apps/api/src/db/repositories/store.ts`.

---

### Task 2: Wallet Ledger Repository & Service Core
**Files:**
- Create: `apps/api/src/wallet/types.ts`
- Create: `apps/api/src/db/repositories/wallet.repo.ts`
- Create: `apps/api/src/wallet/wallet.service.ts`

- [x] Create `apps/api/src/wallet/types.ts`.
- [x] Implement `wallet.repo.ts` (`getOrCreateWallet`, `creditWallet`, `debitWallet`, `getPassbook`).
- [x] Implement `wallet.service.ts` (`getBalance`, `creditBonus`, `deductForCheckout`, `getPassbookHistory`).

---

### Task 3: Referral Attribution Engine & Conversion Hooks
**Files:**
- Create: `apps/api/src/db/repositories/referral.repo.ts`
- Create: `apps/api/src/wallet/referral.service.ts`
- Modify: `apps/api/src/payment/payment.service.ts`

- [x] Implement `referral.repo.ts` (`recordAttribution`, `getPendingAttribution`, `markConverted`, `getReferralStats`).
- [x] Implement `referral.service.ts` with referral code generation and conversion processing.
- [x] Wire B2B referral conversion hook into `payment.service.ts` upon verified subscription payment.

---

### Task 4: Elysia Wallet & Referral REST Endpoints
**Files:**
- Create: `apps/api/src/routes/wallet.routes.ts`
- Create: `apps/api/src/routes/referral.routes.ts`
- Modify: `apps/api/index.ts`

- [x] Implement `GET /api/wallets/balance` and `GET /api/wallets/passbook`.
- [x] Implement `GET /api/referrals/stats` and `POST /api/referrals/attribute`.
- [x] Mount routes in `apps/api/index.ts`.

---

### Task 5: Automated Backend Unit & Integration Tests
**Files:**
- Create: `apps/api/test/wallet-referral.test.ts`

- [x] Write tests verifying wallet credit and balance tracking.
- [x] Write tests verifying anti-overdraft protection on debit.
- [x] Write tests verifying B2B referral conversion and automatic wallet credit when subscription payment verifies.
- [x] Write tests verifying REST endpoints (`/api/wallets/*`, `/api/referrals/*`).
- [x] Run `bun test apps/api/test/wallet-referral.test.ts` and verify 100% pass rate.

---

### Task 6: Universal Payment Modal 1-Tap Wallet Switch
**Files:**
- Modify: `apps/web/components/checkout/universal-payment-modal.tsx`
- Modify: `apps/api/src/payment/payment.service.ts`

- [x] Add wallet balance fetch and `[✓] Apply Wallet Credits (Available: ₹X)` switch in `UniversalPaymentModal`.
- [x] Recalculate net payable: $\text{Net} = \max(0, \text{Base} - \text{Coupon} - \text{Wallet})$.
- [x] Support ₹0 settlement when wallet balance covers entire total.
- [x] Deduct wallet atomically on payment verification.

---

### Task 7: Salon Owner Referral & Passbook Portal Upgrade & End-to-End Verification
**Files:**
- Modify: `apps/web/app/owner/referrals/page.tsx`
- Modify: `apps/web/lib/api.ts`

- [x] Add wallet and referral methods to `apps/web/lib/api.ts` (`api.wallets.*`, `api.referrals.*`).
- [x] Upgrade `OwnerReferralsContent` to show live wallet balance, shareable WhatsApp referral link, verified referral stats, and recent passbook transactions.
- [x] Run all test suites and `bun run build:web` to verify complete system integration.
