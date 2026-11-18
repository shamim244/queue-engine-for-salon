# Universal Onboarding & Partner Panel Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the unified `<UniversalSalonOnboardingWizard />` component (reused across Public Registration, Partner Hub, and Admin Hub) and implement the 6 enterprise partner enhancements (multi-identifier login, win-win referral discount, standardized panel shell, separated payout profiles, and full Indian banking schema).

**Specifications & Architectures:**
- **PRD (v2.0):** [`docs/prd/partner-host-affiliate-prd.md`](file:///v:/salon/queue-engine-for-salon/docs/prd/partner-host-affiliate-prd.md)
- **Technical Requirements Document (TRD) & Security Architecture:** [`docs/architecture/universal-onboarding-and-partner-trd.md`](file:///v:/salon/queue-engine-for-salon/docs/architecture/universal-onboarding-and-partner-trd.md)
- **Application Flow & Sequence Diagrams:** [`docs/architecture/partner-app-flow-diagrams.md`](file:///v:/salon/queue-engine-for-salon/docs/architecture/partner-app-flow-diagrams.md)
- **TDD Master Test Specification (38 Scenarios):** [`docs/testing/partner-system-tdd-spec.md`](file:///v:/salon/queue-engine-for-salon/docs/testing/partner-system-tdd-spec.md)

**Tech Stack:** Bun, ElysiaJS, TypeScript, MySQL, Next.js 16 (App Router), Tailwind CSS, Lucide Icons, bcrypt.

---

## Phased Execution Roadmap

### Phase 1: Database & Backend Engine Upgrades
- [x] Task 1.1: Add `password_hash`, `payout_holder_name`, `payout_bank_name`, and `payout_account_type` to MySQL schema and in-memory store (`partner.repo.ts`).
- [x] Task 1.2: Implement `authenticatePartner({ identifier, password })` supporting Email, Mobile (+91), or Username/Referral Code with `Bun.password.verify`.
- [x] Task 1.3: Implement `updatePayoutMethods(partnerId, bankData)` with Indian IFSC regex validation (`^[A-Z]{4}0[A-Z0-9]{6}$`).
- [x] Task 1.4: Implement `requestPayoutByOption(partnerId, amount, option)` reading verified bank/UPI details directly from the database (no client injection).
- [x] Task 1.5: Implement `quoteReferralDiscount({ partnerCode, planTier, basePrice })` returning gross price, partner discount (10%), and net payable.
- [x] Task 1.6: Run and verify Test Suites 6, 7, and 8 (`bun test apps/api/test/partner`).

### Phase 2: API Endpoints & Contract Wire-up
- [x] Task 2.1: Update `POST /api/v1/partners/login` to accept `{ identifier, password }` and authenticate via `partnerRepo.authenticatePartner`.
- [x] Task 2.2: Implement `PUT /api/v1/partners/me/payout-methods` in `partner.routes.ts`.
- [x] Task 2.3: Update `POST /api/v1/partners/me/payout` to execute option-based withdrawal without accepting raw client account numbers.
- [x] Task 2.4: Implement `GET /api/v1/partners/verify-code` to quote live discounts to the onboarding wizard.
- [x] Task 2.5: Update `POST /api/v1/partners/apply` to accept password during join application.

### Phase 3: The Universal Multi-Step Salon Onboarding Wizard
- [x] Task 3.1: Create modular wizard component `<UniversalSalonOnboardingWizard />` under `apps/web/components/onboarding/universal-onboarding-wizard.tsx` supporting `PUBLIC`, `PARTNER`, and `ADMIN` modes.
- [x] Task 3.2: Build Step 1: Salon Information (Name, Phone, City, Auto-slug).
- [x] Task 3.3: Build Step 2: Owner Account Credentials (Username, Password, Full Name, WhatsApp).
- [x] Task 3.4: Build Step 3: Plan Selection & Partner Discount (Interactive plan cards + live partner code quote showing 10% discount).
- [x] Task 3.5: Build Step 4: Final Summary & Launch Kit (Net bill calculation, atomic onboarding submission, door QR generation).

### Phase 4: Integration Across All 3 Portals (Zero Code Duplication)
- [x] Task 4.1: Integrate `<UniversalSalonOnboardingWizard mode="PUBLIC" />` into `apps/web/app/register/page.tsx`.
- [x] Task 4.2: Integrate `<UniversalSalonOnboardingWizard mode="PARTNER" />` into `apps/web/app/partner/onboard/page.tsx` with partner code pre-locked.
- [x] Task 4.3: Integrate `<UniversalSalonOnboardingWizard mode="ADMIN" />` into `apps/web/app/admin/onboarding/page.tsx` with administrative overrides.

### Phase 5: Partner Panel UI Standardization & Payout Separation
- [x] Task 5.1: Refactor `apps/web/app/partner/login/page.tsx` using `AuthCardLayout` with identifier (Email/Phone/Username) + password.
- [x] Task 5.2: Update `apps/web/app/partner/profile/page.tsx` with dedicated Payout Methods configuration (UPI VPA + complete Bank Account form with Bank Name, Holder Name, Acc No, Confirm Acc No, IFSC, and Account Type).
- [x] Task 5.3: Update `apps/web/app/partner/wallet/page.tsx` withdrawal modal to render radio selection of saved payout methods instead of raw inputs.
- [x] Task 5.4: Align `apps/web/app/partner/layout.tsx` to standardized dashboard shell layout matching Admin and Owner panels.

### Phase 6: Full-Stack Verification & Production Build
- [x] Task 6.1: Run full TDD test suite (`bun test`) asserting 0 failures across all 38 scenarios.
- [x] Task 6.2: Run production compilation (`bun --cwd apps/web build`) confirming 64/64 routes compile with 0 TypeScript errors.
