# Product Requirements Document (PRD): Omni-Channel Coupon Code System

## 1. Document Overview
- **Feature Name:** Omni-Channel Coupon Code System
- **Target Subsystem:** Promotional Pricing & Multi-Tier Discount Layer
- **Target Users:** Platform SuperAdmin, Salon Owners, and Salon Customers
- **Status:** Approved for Implementation

---

## 2. Problem Statement & Motivation
Currently, billing prices and salon ticket amounts are fixed without any promotional discount mechanism:
1. **No Acquisition Campaigns:** SuperAdmins cannot run marketing campaigns (e.g. `WELCOME100`, `DIWALI50`) to incentivize salon owners to purchase quarterly or annual SaaS packages.
2. **No Salon Client Retention Tools:** Salon owners on `/owner/coupons` have only a mock UI without real backend persistence or verification, preventing them from running local promotions (e.g. `FADE20`, `FIRSTCUT`) for walk-in or returning clients.
3. **No Checkout Modification Layer:** Neither the subscription checkout nor the queue payment modal allows applying discount codes before payment order generation.
4. **Vulnerability to Code Abuse:** Without validation rules (minimum spend, max uses, per-user redemption limits, date windows), promo codes can be abused or over-redeemed.

---

## 3. Goals & Success Metrics
- **Omni-Channel Dual-Target Support:**
  - `SUBSCRIPTION`: Admin-managed coupons discounting SaaS subscription plans for salon owners.
  - `SALON_SERVICE`: Salon owner-managed coupons discounting grooming services and haircuts for customers.
- **Robust Discount Mechanics:**
  - Flat (₹) and Percentage (%) discounts with maximum discount caps (e.g. 20% off up to ₹250).
  - Minimum order amount threshold enforcement (e.g. min bill ₹500).
  - Overall usage limits (`max_uses`) and per-user limits (`max_uses_per_user`).
  - Active timeframes (`valid_from` to `valid_until`).
- **Seamless Checkout Integration:** 1-tap coupon input in the `UniversalPaymentModal` dynamically recalculates the payable order amount with strike-through original prices and savings badges.
- **Atomic Double-Redemption Protection:** Redemptions recorded in an auditable `coupon_redemptions` table to guarantee that single-use codes cannot be applied multiple times in parallel.
- **Mobile-First UX:** Touch targets $\ge 48\text{px}$ for one-handed thumb entry on mobile devices.

---

## 4. User Personas & Workflows

### 4.1 Persona 1: Platform SuperAdmin (SaaS Plan Promotion)
- **Goal:** Launch a 20% discount campaign for Diwali to boost 1-year subscription adoption.
- **Workflow:**
  1. SuperAdmin opens Admin Billing Suite.
  2. Creates coupon `DIWALI20` (`target_type: 'SUBSCRIPTION'`, `discount_type: 'PERCENT'`, value `20%`, min spend ₹2,000, valid for 30 days).
  3. Salon owner entering checkout on `/owner/billing` types `DIWALI20` $\rightarrow$ System discounts a ₹2,157 3-month plan down to ₹1,726.

### 4.2 Persona 2: Salon Owner (Local Salon Marketing)
- **Goal:** Offer a ₹50 discount for first-time customers visiting the barbershop.
- **Workflow:**
  1. Salon owner visits `/owner/coupons`.
  2. Creates coupon `FIRST50` (`target_type: 'SALON_SERVICE'`, `discount_type: 'FLAT'`, value ₹50, min bill ₹150).
  3. Customer or front desk receptionist enters `FIRST50` during ticket checkout $\rightarrow$ ₹200 haircut bill is discounted to ₹150.

### 4.3 Persona 3: Customer / Owner at Checkout (Redeemer)
- **Workflow:**
  1. Opens `UniversalPaymentModal`.
  2. Expands "Have a Coupon Code?" section.
  3. Enters code and taps **"Apply"**.
  4. Instant visual validation shows savings badge: `🎉 Applied! Saved ₹200`.
  5. The payable total updates immediately across all payment tabs (UPI QR, Cash, Sandbox).

---

## 5. Functional Requirements

### 5.1 Coupon Attributes
- `code`: Unique, uppercase URL-safe string (e.g., `SAVE30`, `FESTIVAL50`).
- `target_type`: `'SUBSCRIPTION'` | `'SALON_SERVICE'`.
- `organization_id`: Null for platform-wide/admin coupons; salon owner's org ID for salon-specific coupons.
- `salon_id`: Target salon ID for salon-specific service discounts.
- `discount_type`: `'PERCENT'` | `'FLAT'`.
- `discount_value`: Numerical value (e.g. 20 for 20%, 100 for ₹100).
- `max_discount_amount`: Numerical cap for percentage discounts (optional).
- `min_order_amount`: Minimum required order value to qualify.
- `max_uses`: Maximum total redemptions allowed across all users (optional).
- `used_count`: Counter tracking total successful redemptions.
- `max_uses_per_user`: Max redemptions allowed per user/phone (default 1).
- `valid_from` & `valid_until`: Date range for coupon validity.
- `status`: `'ACTIVE'` | `'INACTIVE'` | `'EXPIRED'`.

### 5.2 Validation Rules
A coupon code must fail validation with user-friendly error messages if:
1. Code does not exist or is inactive $\rightarrow$ `"Invalid or inactive coupon code."`
2. Current timestamp is outside `valid_from` and `valid_until` $\rightarrow$ `"Coupon has expired or is not yet active."`
3. Target type mismatches the current order $\rightarrow$ `"This coupon cannot be used for this order type."`
4. Order amount is below `min_order_amount` $\rightarrow$ `"Minimum order of ₹X required to apply this coupon."`
5. Total `used_count` has reached `max_uses` $\rightarrow$ `"This coupon has reached its maximum usage limit."`
6. User has already redeemed the coupon `max_uses_per_user` times $\rightarrow$ `"You have already used this coupon."`

---

## 6. Non-Functional Requirements
- **Sub-50ms Coupon Validation:** In-memory caching and indexed MySQL queries.
- **Client-Compute Presentation:** Net payable calculation and savings tags calculated instantly in client RAM.
- **Touch-Friendly Controls:** Generous touch targets ($\ge 48\text{px}$) for code entry on Android mobile viewports.
