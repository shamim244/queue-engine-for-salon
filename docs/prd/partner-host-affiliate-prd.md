# Product Requirements Document (PRD) — Version 2.0
## Universal Salon Onboarding & Enterprise Partner Panel Ecosystem

| Status | Version | Author | Target Systems | Date |
| :--- | :--- | :--- | :--- | :--- |
| **APPROVED (Ready for Implementation)** | 2.0.0 | Lead Enterprise Architect | Web (`apps/web`), API (`apps/api`), Database (MySQL) | 2026-11-12 |

---

## 1. Executive Summary & Objective

In rural, semi-urban, and tier-2/3 Indian markets, salon owners do not adopt software through passive self-serve marketing. Physical door-to-door visits, peer word-of-mouth, and creator recommendations drive 95%+ of salon technology onboarding.

This document establishes the product requirements for an **enterprise-grade growth platform** uniting two core engines:
1. **The Universal Multi-Step Salon Onboarding Wizard (`<UniversalSalonOnboardingWizard />`)**: A single, clutter-free, responsive 4-step wizard reused across Public Self-Serve Registration ([`/register`](file:///v:/salon/queue-engine-for-salon/apps/web/app/register/page.tsx)), Partner Assisted Onboarding ([`/partner/onboard`](file:///v:/salon/queue-engine-for-salon/apps/web/app/partner/onboard/page.tsx)), and Super Admin Provisioning ([`/admin/onboarding`](file:///v:/salon/queue-engine-for-salon/apps/web/app/admin/onboarding/page.tsx)).
2. **The Enterprise Partner Panel (`/partner/*`)**: An affiliate and field partner cockpit with multi-identifier authentication, bilateral win-win referral discounts, separated payout method management, complete Indian banking validation, and strict anti-fraud qualification milestones.

---

## 2. Core Functional Requirements (The 7 Pillars)

### Pillar 1: Enterprise Multi-Identifier Partner Login
- **Identifiers Accepted:** Email address, 10-digit Mobile Phone Number (with optional +91), or Username / Referral Code.
- **Authentication:** Verified against salted bcrypt `password_hash`.
- **UI Architecture:** Reuses the enterprise [`AuthCardLayout`](file:///v:/salon/queue-engine-for-salon/apps/web/components/auth/auth-card-layout.tsx) component used by Salon Owners, maintaining visual consistency and zero redundant code.
- **Security:** Rate-limited to max 5 failed attempts per IP per minute. Constant-time password verification prevents timing attacks.

---

### Pillar 2: Win-Win Referral Loop (Salon Owner Signup Discount)
- **The Hook:** When a salon owner signs up (either online or with a field agent), entering a valid partner code gives the salon owner an **upfront discount** (e.g., 10% or ₹200 off their first subscription plan, configured by Super Admin).
- **The Value Exchange:**
  - **Salon Owner:** Gets a verified financial incentive to use the code rather than leaving it blank.
  - **Partner:** Gains permanent attribution and lifetime recurring commission.
  - **Platform:** Acquires an active, motivated paying tenant.
- **Real-Time Code Verification:** As the owner types `AMIT20`, the wizard calls `GET /api/v1/partners/verify-code?code=AMIT20&plan=PRO` and renders:  
  `"✅ Partner Code Applied! You get 10% OFF (Save ₹99.90) thanks to Partner Amit Verma."`

---

### Pillar 3: First-Class "Partner Panel" Shell
- **Structure:** Standardizes `/partner/*` into a dedicated dashboard panel matching the prestige and layout hierarchy of the Admin Panel and Owner Panel.
- **Component Reuse:** Inherits the standard dashboard shell:
  - Collapsible responsive sidebar with route highlights.
  - Sticky topbar with breadcrumbs, notification bell, and wallet balance pill.
  - Mobile bottom navigation bar for single-thumb access on Android smartphones.
  - Standardized metric stat cards, transaction ledgers, and modal dialogs.

---

### Pillar 4: Separation of Payout Profiles from Withdrawal Execution
- **The Security & UX Problem:** Asking users to manually enter bank accounts or UPI handles during every withdrawal causes typos, failed bank transfers, and payload injection risks.
- **The Enterprise Two-Phase Flow:**
  1. **Configuration Phase ([`/partner/profile`](file:///v:/salon/queue-engine-for-salon/apps/web/app/partner/profile/page.tsx)):** Partners manage and verify their payout destinations in advance:
     - Primary UPI VPA (`user@okhdfcbank`)
     - Primary Bank Account (with complete IFSC and branch details)
  2. **Execution Phase ([`/partner/wallet`](file:///v:/salon/queue-engine-for-salon/apps/web/app/partner/wallet/page.tsx)):** When clicking *"Request Withdrawal"*, the partner **only selects** from their saved methods:
     - `(●) Instant UPI: user@okhdfcbank`
     - `(○) Bank Transfer: HDFC Bank (A/C ending in 5678)`
  - Direct account editing is restricted to Profile Settings.

---

### Pillar 5: Complete Indian Banking Schema Validation
Withdrawal to bank accounts requires a full, compliant banking schema:
* **Account Holder Name:** Must match bank passbook records.
* **Bank Name:** (e.g., State Bank of India, HDFC Bank, ICICI Bank).
* **Account Number:** Minimum 9 to 18 digits.
* **Confirm Account Number:** Client-side match assertion prevents transcription mistakes.
* **IFSC Code:** Enforces RBI 11-character regex: `^[A-Z]{4}0[A-Z0-9]{6}$` (4 letters, literal zero, 6 alphanumeric characters) with auto-capitalization.
* **Account Type:** Selectable `SAVINGS` or `CURRENT`.

---

### Pillar 6: In-Shop Assisted Onboarding (`/partner/onboard`)
When a ground hustler visits a salon:
* Step-by-step guidance on mobile/tablet.
* Creates the salon owner's account with username and password so the barber can immediately log in to `/owner/login`.
* Lets the barber choose their plan (`STARTER`, `PRO`, `ENTERPRISE`) with the **partner discount automatically pre-applied**.
* Immediately generates their customer door QR standee.

---

### Pillar 7: The Universal Multi-Step Salon Onboarding Wizard
A single, modular wizard component `<UniversalSalonOnboardingWizard />` with 4 clutter-free steps:

1. **Step 1: Salon Information**
   - Salon Name & Auto-generated Slug
   - Mobile Phone Number (+91)
   - City & Full Address
   - Primary Salon Category & Operating Mode
2. **Step 2: Owner Account Credentials**
   - Owner Full Name
   - Owner Username (unique alphanumeric)
   - Owner Mobile (for WhatsApp dispatch)
   - Password & Confirm Password (minimum 6 characters)
3. **Step 3: Plan Selection & Partner Discount**
   - Interactive Plan Cards: `STARTER` (₹499), `PRO` (₹999), `ENTERPRISE` (₹1,999)
   - Partner / Referral Code Input Box
   - Real-time Discount Breakdown (Gross Price, Partner Discount, Net Payable)
4. **Step 4: Review, Billing & Launch Kit**
   - Itemized Bill Summary
   - One-Click Activation (or UPI Payment Gateway)
   - Launch Kit: Station Link, Customer Door QR, and Reception Mirror URL

---

## 3. Financial & Commission Rules

### 3.1 Dual-Model Strategy
* **Model B (Primary Priority — Recurring SaaS Revenue Share):**
  - Partner receives $X\%$ (default 10%–20%) on every monthly/annual plan renewal.
  - **Net-Paid Revenue Rule:**
    $$\text{Commission} = (\text{Plan Base Price} - \text{Discount}) \times \text{Partner } \%$$
    *(100% free trials yield ₹0.00 commission).*
* **Model A (Secondary / Promotional Booster — Fixed Activation Bounty):**
  - Flat cash bounty (e.g., ₹300–₹500) credited once the salon qualifies.

### 3.2 Anti-Fraud Qualification Milestones
Earnings remain locked in `PENDING_LOCK` until:
1. Salon completes **15 real customer tickets** in the queue engine, **OR**
2. Salon purchases a subscription plan with **Net Paid $> ₹0$**.

---

## 4. Security & Compliance Requirements

1. **Password Security:** Bcyrpt hashing with work factor $\ge 10$.
2. **Server-Side Price Authority:** The frontend never transmits monetary amounts for plans or discounts. It only sends `planTier` and `partnerCode`; the backend calculates the exact gross, discount, and net amounts.
3. **Double-Withdrawal Prevention:** Atomic balance check and mutex/transaction lock prevents concurrent requests from double-spending available balances.
4. **Role Isolation:** `HOST_PARTNER` tokens cannot invoke `/api/admin/*` routes; `SUPER_ADMIN` tokens cannot perform partner wallet withdrawals.
