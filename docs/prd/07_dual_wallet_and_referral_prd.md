# Product Requirements Document (PRD): Dual-Wallet & Referral Commission Engine

## 1. Document Overview
- **Feature Name:** Dual-Wallet & Referral Commission Engine
- **Target Subsystem:** Viral Growth, B2B Referral Incentives, and Double-Entry Wallet Ledger
- **Target Users:** 
  1. **B2B Salon Owners:** Earning recurring platform subscription credits by referring other salon owners.
  2. **B2C Salon Consumers:** Earning visit discounts by referring neighborhood friends via WhatsApp links.
- **Status:** Approved for Implementation

---

## 2. Problem Statement & Motivation
Currently, salon owner acquisition depends purely on direct outreach, and salon customer acquisition relies on physical foot traffic:
1. **No Referral Attribution System:** Salon owners who advocate for the platform have no mechanism to share their referral link or track signups.
2. **Disconnected Retention & Rewards:** Without a digital wallet passbook, rewards are vague promises instead of concrete financial credits.
3. **Double-Spend & Negative Balance Vulnerability:** Loose balance counters can lead to race conditions where two simultaneous transactions cause negative balances or unearned credits.
4. **Checkout Disconnect:** In checkout, owners must pay full price even when they have earned referral commissions.

---

## 3. Goals & Success Metrics
- **Dual-Audience Architecture:**
  - **B2B Owner Wallets (`wallet_type: 'OWNER'`):** Tied to `organization_id`. Earns ₹500 (or configured bonus) whenever a referred salon owner subscribes to their first plan.
  - **B2C Consumer Wallets (`wallet_type: 'CONSUMER'`):** Tied to `(salon_id, consumer_phone)`. Earns ₹50 whenever a referred friend completes their first salon visit.
- **Strict Double-Entry Ledger (`wallet_transactions`):**
  - No loose balance mutations. Every credit and debit appends an immutable record with `balance_after` snapshots.
  - Atomic row-locking prevents negative balances and concurrent double-spending.
- **1-Tap Checkout Deduction:**
  - In `UniversalPaymentModal`: Salon owner can check `[✓] Apply Wallet Balance (Available: ₹500)`.
  - Recalculates net payable:
    $$\text{Net Payable} = \max(0, \text{Base Price} - \text{Coupon Discount} - \text{Wallet Deduction})$$
  - If wallet balance $\ge$ amount, owner pays ₹0 with 1 tap!
- **Fraud Prevention Hook:**
  - Referral bonuses are only credited upon **first verified paid transaction** (SaaS plan payment for owners; completed ticket service for consumers), completely eliminating fake signup spam.

---

## 4. User Personas & Workflows

### 4.1 Persona 1: Salon Owner (Arun) Referring Colleague (Vikas)
- **Goal:** Share referral link to earn platform credits and reduce next month's subscription bill to ₹0.
- **Workflow:**
  1. Arun opens `/owner/referrals`.
  2. Copies personal referral link: `owner.queue.in/register?ref=OWNER_ARUN` or WhatsApp share text.
  3. Sends WhatsApp message to Vikas: *"Hey Vikas, use Engine Que for your salon queue management! Register with my code OWNER_ARUN."*
  4. Vikas registers and subscribes to a 3-month plan via UPI QR.
  5. The moment payment is verified:
     - ₹500 is credited to Arun's B2B wallet.
     - Arun receives instant notification / passbook transaction.
  6. When Arun's plan expires, Arun selects a 1-month plan (₹500), checks **"Use Wallet Balance"**, and pays ₹0!

### 4.2 Persona 2: Salon Customer (Rahul) Referring Friend (Amit)
- **Goal:** Get a ₹50 haircut discount by sharing their local salon link with friends.
- **Workflow:**
  1. Rahul gets hair cut at Ramesh Traditional Barber and receives WhatsApp receipt with share link: `salon.com/s/ramesh-barber?ref=RAHUL20`.
  2. Rahul shares link with friend Amit.
  3. Amit visits Ramesh Barber, joins queue, and completes haircut.
  4. Barber marks ticket `COMPLETED` $\rightarrow$ System credits ₹50 to Rahul's consumer wallet.
  5. On Rahul's next visit, his ₹150 haircut bill automatically discounts to ₹100.

---

## 5. Functional Requirements

### 5.1 Referral Codes & Links
- Organizations automatically receive a unique referral code upon creation (e.g. `REF_ORG_<SLUG>`).
- Customers receive phone-derived referral codes (e.g. `REF_<PHONE_LAST4>`).
- Referral attribution stored in `referral_attributions` (`referrer_id`, `referred_id`, `status: 'PENDING' | 'CONVERTED' | 'EXPIRED'`).

### 5.2 Wallet Ledger Operations
- `getCreditBalance(walletType, identifier)`: Returns current live spendable balance.
- `creditWallet(walletType, identifier, amount, reason, referenceId)`: Adds credits, updates ledger.
- `debitWallet(walletType, identifier, amount, reason, referenceId)`: Checks sufficiency, deducts funds, updates ledger. Throws error if `amount > current_balance`.
- `getWalletPassbook(walletType, identifier)`: Returns list of historical transactions.

---

## 6. Non-Functional Requirements
- **Atomic Concurrency Protection:** Guaranteed zero double-debit under parallel concurrent checkout requests.
- **Mobile-First UX:** 1-tap WhatsApp share button and thumb-friendly wallet switch ($\ge 48\text{px}$).
- **Audit Compliance:** Every transaction references the originating order or queue ticket ID.
