# Partner & Host Affiliate Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated, full-lifecycle Host & Partner Affiliate Portal (`/host` or `/partner`) and Super Admin Management Suite (`/admin/partners`) empowering online creators, ground door-to-door sales agents, peer salon owners, and dedicated partners to onboard salons, track recurring commissions calculated strictly on net paid revenue, request UPI/bank payouts, and perform assisted in-shop onboarding.

**Architecture & Specifications:**
- **PRD:** [`docs/prd/partner-host-affiliate-prd.md`](file:///v:/salon/queue-engine-for-salon/docs/prd/partner-host-affiliate-prd.md)
- **Architecture & System Design:** [`docs/architecture/partner-system-architecture.md`](file:///v:/salon/queue-engine-for-salon/docs/architecture/partner-system-architecture.md)
- **App Flow & Sequence Diagrams:** [`docs/architecture/partner-app-flow-diagrams.md`](file:///v:/salon/queue-engine-for-salon/docs/architecture/partner-app-flow-diagrams.md)
- **Existing System Integration Blueprint:** [`docs/architecture/partner-existing-system-integration.md`](file:///v:/salon/queue-engine-for-salon/docs/architecture/partner-existing-system-integration.md)
- **TDD Master Test Specification (28 Scenarios):** [`docs/testing/partner-system-tdd-spec.md`](file:///v:/salon/queue-engine-for-salon/docs/testing/partner-system-tdd-spec.md)

**Tech Stack:** Bun, ElysiaJS, TypeScript, MySQL, Next.js 16 (App Router), Tailwind CSS, Lucide Icons.

---

## 1. Specification & Business Rules

### 1.1 Partner Personas
1. **Online Creators:** YouTubers, Instagram influencers, bloggers sharing links and promo codes.
2. **Local Ground Hustlers:** Door-to-door field agents onboarding neighborhood salons in person.
3. **Salon Owners (Peer Referral):** Existing onboarded salon owners inviting neighboring shops (Admin toggleable).
4. **Dedicated / Full-Time Partners:** Internal team, co-founders, business associates with custom contract terms.

### 1.2 Commission Engine Rules
- **Primary Model — Model B (Recurring SaaS Subscription Share):**
  - Partner receives $X\%$ (e.g., 10%–20%) of recurring plan renewals.
  - **Net-Amount Enforcement:** Commission is strictly computed on the **Net Paid Amount** after discounts/coupons.  
    $$\text{Commission} = (\text{Plan Price} - \text{Discount}) \times \text{Partner Percentage}$$
    If 100% discount is applied ($\text{Paid} = ₹0$), $\text{Commission} = ₹0$.
- **Secondary Model — Model A (Promotional Activation Bounty):**
  - Flat bounty (e.g., ₹500) per salon to drive rapid sales push.
- **Qualification Milestones (Anti-Fraud Lock):**
  - Bounty/recurring credits remain in `PENDING` lock until one of two conditions is met:
    1. Salon completes $N$ real customer queue/booking tickets (e.g., 15 tickets), OR
    2. Salon purchases a paid subscription plan with actual monetary payment ($\text{Net Paid} > 0$).
- **Configurable Recurring Duration:**
  - `LIFETIME` OR time-bounded (`3_MONTHS`, `6_MONTHS`, `12_MONTHS`).
  - Super Admin can **Pause** or **Resume** commission anytime and adjust the rate.

### 1.3 Assisted In-Shop Onboarding Mode
- Ground partners can open `/partner/onboard` on their phone.
- Partner enters Salon Name, Owner Name, and Owner WhatsApp/Mobile.
- Generates a rapid verification code / confirmation to lock attribution to that partner on the spot.

### 1.4 In-App Notifications
- In-app notification bell & feed inside the Partner Panel:
  - Salon registered via referral.
  - Milestone achieved (Bounty unlocked).
  - Commission credited to wallet.
  - Payout approved / processed.

---

## 2. Database Schema Design (`schema.sql`)

```sql
-- 1. Partners Table
CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL, -- Optional link to auth user
  full_name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(128) NULL,
  city VARCHAR(64) NOT NULL,
  persona ENUM('CREATOR', 'GROUND_HUSTLER', 'SALON_OWNER', 'DEDICATED') NOT NULL DEFAULT 'GROUND_HUSTLER',
  referral_code VARCHAR(32) NOT NULL UNIQUE,
  status ENUM('PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  commission_model ENUM('RECURRING_PERCENT', 'FLAT_BOUNTY', 'HYBRID') NOT NULL DEFAULT 'RECURRING_PERCENT',
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  bounty_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration_type ENUM('LIFETIME', '3_MONTHS', '6_MONTHS', '12_MONTHS') NOT NULL DEFAULT '6_MONTHS',
  duration_end_date DATETIME NULL,
  is_commission_paused BOOLEAN NOT NULL DEFAULT FALSE,
  payout_upi_id VARCHAR(128) NULL,
  payout_bank_account VARCHAR(64) NULL,
  payout_bank_ifsc VARCHAR(32) NULL,
  pitch_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Partner Salon Attributions
CREATE TABLE IF NOT EXISTS partner_salon_attributions (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  salon_id VARCHAR(64) NOT NULL UNIQUE,
  source ENUM('LINK', 'PROMO_CODE', 'ASSISTED_ONBOARDING', 'ADMIN_ASSIGNED') NOT NULL DEFAULT 'LINK',
  qualification_status ENUM('UNQUALIFIED', 'QUALIFIED') NOT NULL DEFAULT 'UNQUALIFIED',
  tickets_completed_count INT NOT NULL DEFAULT 0,
  first_paid_plan_at DATETIME NULL,
  commission_expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- 3. Partner Wallet Ledger
CREATE TABLE IF NOT EXISTS partner_wallet_ledger (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  salon_id VARCHAR(64) NULL,
  transaction_type ENUM('COMMISSION_CREDIT', 'BOUNTY_CREDIT', 'WITHDRAWAL_DEBIT', 'ADJUSTMENT') NOT NULL,
  gross_plan_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  commission_amount DECIMAL(10,2) NOT NULL,
  balance_type ENUM('PENDING_LOCK', 'AVAILABLE') NOT NULL DEFAULT 'PENDING_LOCK',
  description VARCHAR(255) NOT NULL,
  reference_id VARCHAR(128) NULL, -- Subscription payment ID or Payout ID
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- 4. Partner Payout Requests
CREATE TABLE IF NOT EXISTS partner_payout_requests (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payout_method ENUM('UPI', 'BANK_TRANSFER') NOT NULL DEFAULT 'UPI',
  payout_target VARCHAR(128) NOT NULL,
  status ENUM('REQUESTED', 'APPROVED', 'PAID', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
  utr_reference VARCHAR(128) NULL,
  admin_notes TEXT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME NULL,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- 5. Partner In-App Notifications
CREATE TABLE IF NOT EXISTS partner_notifications (
  id VARCHAR(64) PRIMARY KEY,
  partner_id VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('SALON_JOINED', 'EARNING_CREDITED', 'QUALIFIED', 'PAYOUT_STATUS', 'SYSTEM') NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);
```

---

## 3. Modular Architecture Breakdown

### 3.1 Backend Modules (`apps/api/src/`)
- `db/repositories/partner.repo.ts`: Partner CRUD, commission calculation from net payments, qualification verification ($N$ tickets vs paid plan), wallet balance computation, and payout states.
- `routes/partner.routes.ts`:
  - `POST /api/v1/partners/apply`: Public partner signup form.
  - `GET /api/v1/partners/me`: Authenticated partner profile, referral links, and wallet balance.
  - `GET /api/v1/partners/me/salons`: List of salons onboarded by partner with live stats.
  - `GET /api/v1/partners/me/ledger`: Detailed earnings ledger and payout history.
  - `POST /api/v1/partners/me/payout`: Request withdrawal to UPI/Bank.
  - `POST /api/v1/partners/assisted-onboard`: Assisted in-shop salon creation on partner device.
  - `GET /api/v1/partners/me/notifications`: Partner in-app notifications.
- `routes/admin.partner.routes.ts`:
  - `GET /api/v1/admin/partners`: List all partners with filtering by persona & status.
  - `PATCH /api/v1/admin/partners/:id/status`: Approve, reject, or pause partner.
  - `PATCH /api/v1/admin/partners/:id/commission`: Update rate, duration, or model.
  - `GET /api/v1/admin/partners/payouts`: List all payout requests.
  - `POST /api/v1/admin/partners/payouts/:id/settle`: Settle payout with UTR reference.

### 3.2 Frontend Modules (`apps/web/`)
- Public / Landing:
  - `app/partner/join/page.tsx`: Modern application form for Creators, Ground Agents, and Partners.
- Partner Cockpit (`app/partner/`):
  - `app/partner/layout.tsx`: Navigation sidebar/header with in-app notification bell and wallet pill.
  - `app/partner/page.tsx`: Main Dashboard (KPI cards, referral link copier, QR code display, active tier).
  - `app/partner/onboard/page.tsx`: 2-Minute Assisted In-Shop Onboarding Wizard for door-to-door visits.
  - `app/partner/salons/page.tsx`: Referred Salons list with qualification badges and ticket counts.
  - `app/partner/wallet/page.tsx`: Real-time ledger + 1-Tap Withdrawal Request modal.
  - `app/partner/marketing/page.tsx`: Downloadable pitch deck, 60s script, printable counter standees.
  - `app/partner/profile/page.tsx`: 360° Profile & Payout UPI/Bank settings.
- Super Admin Suite (`app/admin/partners/`):
  - `app/admin/partners/page.tsx`: Partner directory with persona filter, status toggle, and approve/pause actions.
  - `app/admin/partners/[id]/page.tsx`: Detailed partner contract editor (adjust %, pause/resume, change duration).
  - `app/admin/partners/payouts/page.tsx`: Withdrawal request approval & UTR settlement modal.

---

## 4. Execution Plan (Phased Tasks)

### Phase 1: Database & Repository Foundation
- [x] Task 1.1: Add partner tables to MySQL schema and in-memory fallback store (`apps/api/src/db/repositories/partner.repo.ts`).
- [x] Task 1.2: Implement Net-Revenue Commission math engine (ensuring coupons/discounts reduce commission base).
- [x] Task 1.3: Implement Qualification Milestone evaluator ($N$ tickets completed or paid plan $> 0$).
- [x] Task 1.4: Unit test commission calculations and milestone unlocking.

### Phase 2: API Endpoints & Admin Governance
- [x] Task 2.1: Implement Partner public signup & profile APIs (`apps/api/src/routes/partner.routes.ts`).
- [x] Task 2.2: Implement Assisted Onboarding endpoint locking attribution on creation.
- [x] Task 2.3: Implement Admin Partner Management & Commission Editor endpoints.
- [x] Task 2.4: Implement Wallet ledger, withdrawal request, and payout settlement endpoints.

### Phase 3: Partner Portal Frontend (`/partner`)
- [x] Task 3.1: Build Partner Join Application page (`/partner/join`).
- [x] Task 3.2: Build Partner Dashboard cockpit with real-time KPI cards and referral QR card.
- [x] Task 3.3: Build Door-to-Door Assisted Onboarding Wizard (`/partner/onboard`).
- [x] Task 3.4: Build Wallet & Payouts page with instant UPI withdrawal request.
- [x] Task 3.5: Build In-App Notification Center for partner events.

### Phase 4: Super Admin Suite Frontend (`/admin/partners`)
- [x] Task 4.1: Build Admin Partner Directory with approve/reject/pause controls.
- [x] Task 4.2: Build Partner Contract Editor (rate adjust, duration select, pause commission).
- [x] Task 4.3: Build Admin Payout Processing screen with UTR reference entry.

### Phase 5: Verification & Full-Flow Audit
- [x] Task 5.1: Run automated unit and integration tests for referral tracking and net commission calculation.
- [x] Task 5.2: Verify complete simulated flow: Partner signup -> Admin approval -> Assisted salon onboard -> Ticket completion qualification -> Subscription purchase with discount -> Net commission credit -> Withdrawal request -> Admin settlement.
