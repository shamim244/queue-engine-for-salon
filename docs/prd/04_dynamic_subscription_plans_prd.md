# Product Requirements Document (PRD): Dynamic Subscription Plans & Feature Quota Engine

## 1. Document Overview
- **Feature Name:** Dynamic Subscription Plans & Feature Quota Engine
- **Target Subsystem:** SaaS Monetization & Tenant Access Control
- **Target Users:** SuperAdmin (Plan Creator) & Salon Owners (Plan Subscribers)
- **Status:** Approved for Implementation

---

## 2. Problem Statement & User Pain Points
In the legacy codebase, subscription tiers were locked to static string constants (`STARTER`, `PRO`, `ENTERPRISE`) inside TypeScript code:
1. **Zero Admin Autonomy:** An administrator could not launch a festive campaign (e.g. "Diwali Special"), create a single-chair micro plan, or offer a 10-chair franchise tier without modifying source code and redeploying.
2. **Fixed Duration Constraints:** All tiers assumed monthly billing, preventing the platform from offering high-retention quarterly or annual packages with upfront cash flow.
3. **Coarse-Grained Quotas:** Quotas were hardcoded rather than dynamically calibrated per tier.

---

## 3. Goals & Success Metrics
- **100% Dynamic Plan Catalog:** SuperAdmin can create, edit, reorder, and archive subscription plans via the Admin UI in under 60 seconds without code changes.
- **Two-Way Price & Discount Calibrator:** Enables smart price calculations where entering a discount % updates the multi-month prices automatically, or entering a custom price computes the savings badge.
- **Selective Cycle Offering:** SuperAdmin can pick and choose which billing durations (1m, 3m, 6m, 1y) are valid for any individual plan.
- **Clean Tenant Experience:** Salon owners on `/owner/billing` see clean, responsive pricing cards with an interactive cycle toggle matching the exact active plans configured by the Admin.

---

## 4. User Personas & Workflows

### 4.1 Persona 1: Platform SuperAdmin
- **Goal:** Launch and manage subscription plans, calibrate pricing for emerging market tiers, and bundle features strategically.
- **Workflow:**
  1. SuperAdmin navigates to `/admin/billing`.
  2. Clicks **"+ Create New Plan"**.
  3. Enters Plan Name (e.g., "Growth Studio Pro"), slug, badge (e.g., "Most Popular"), and brief description.
  4. Enters Base 1-Month Price (e.g. ₹799).
  5. Selects which cycles to enable (`[✓] 1 Month`, `[✓] 3 Months`, `[✓] 6 Months`, `[✓] 1 Year`).
  6. Calibrates multi-cycle discounts:
     - Enters 10% for 3 Months $\rightarrow$ System computes ₹2,157 (`₹799 × 3 - 10%`).
     - Or manually overrides price to ₹1,999 $\rightarrow$ System displays 16.6% discount badge.
  7. Sets branch quota (e.g., 2 branches) and stylist quota (e.g., 4 chairs/branch).
  8. Checks off bundled features (WhatsApp alerts, TV lounge mirror, staff shift analytics, staff leave recovery).
  9. Clicks **"Publish Plan"**. The plan is immediately visible to all prospective and existing salon owners.

### 4.2 Persona 2: Salon Owner (Buyer)
- **Goal:** Choose an appropriate subscription package for their barbershop, evaluate quarterly/annual savings, and activate access.
- **Workflow:**
  1. Salon owner logs in and opens `/owner/billing`.
  2. Toggles duration switch: `[ 1 Month | 3 Months (Save 10%) | 6 Months | 1 Year ]`.
  3. All plan cards reactively update prices, savings badges, and per-month breakdowns.
  4. Owner clicks **"Select Plan"** to proceed to payment settlement.

---

## 5. Functional Requirements

### 5.1 Plan Definition & Attributes
Every subscription plan must support the following attributes:
- `name`: Display title (e.g. "Solo Traditional Barber", "Multi-Chair Studio").
- `slug`: Unique URL-safe identifier (e.g. `solo-barber`, `multi-chair-studio`).
- `badge`: Optional visual banner (e.g. "Best for Walk-ins", "Franchise Scale").
- `description`: Value proposition.
- `price_1m`: Base price for 30 days.
- `price_3m`, `price_6m`, `price_1y`: Multi-cycle prices (nullable if cycle is disabled).
- `discount_pct_3m`, `discount_pct_6m`, `discount_pct_1y`: Configured or calculated savings percentages.
- `cycle_1m_enabled`, `cycle_3m_enabled`, `cycle_6m_enabled`, `cycle_1y_enabled`: Boolean flags controlling which duration tabs appear for this plan.
- `max_branches`: Maximum branch locations permitted under this organization.
- `max_stylists_per_branch`: Maximum barber chairs / active stylists allowed per branch.
- `features`: Array of string keys representing enabled capabilities.
- `status`: Lifecycle state (`ACTIVE`, `DRAFT`, `ARCHIVED`).
- `is_featured`: Boolean determining visual card highlight / elevated border.
- `sort_order`: Integer determining display rank.

### 5.2 Two-Way Smart Calibrator Mechanics
- When `price_1m` changes:
  - If a cycle has a configured `discount_pct`, the system automatically suggests:
    $$\text{Cycle Price} = \text{Round}\left(\text{price\_1m} \times N \times \left(1 - \frac{\text{discount\_pct}}{100}\right)\right)$$
- If the admin directly edits the `price_Nm` field:
  - The system dynamically calculates:
    $$\text{Discount \%} = \text{Round}\left(\left(1 - \frac{\text{price\_Nm}}{\text{price\_1m} \times N}\right) \times 100, 1\right)$$

### 5.3 Exhaustive Feature Checklist
The plan creation form must provide accessible checkboxes for all current platform capabilities:
1. `station_chair_transfers`: Handover clients between barber chairs mid-queue.
2. `station_soft_bump`: 3-minute grace period management and hold protocol.
3. `station_hold_pause`: Customer errand / chai pause ticket holding.
4. `tv_departure_mirror`: Airport Departure lounge TV mirror display.
5. `whatsapp_sms_notifications`: Automated client queue status messaging.
6. `staff_shift_analytics`: Revenue, cash vs. UPI breakdown, and shift pacing.
7. `stylist_duration_overrides`: Custom service speeds calibrated per barber.
8. `staff_leave_recovery`: 1-tap absence redistribution to Universal Fast Line.
9. `customer_loyalty_stamps`: Digital visit stamp card rewards.
10. `consumer_referrals`: Customer-to-customer referral credit engine.
11. `digital_storefront`: Public salon web storefront with photos and UPI QR.
12. `custom_coupons`: Salon-created client discount vouchers.

---

## 6. Non-Functional & Architectural Requirements
- **Rule 1 (Zero Server Waste):** Multi-cycle calculations and discount badge updates execute strictly on the client using reactive React state without API polling.
- **Rule 2 (Sub-50ms Catalog Caching):** Plans are cached in Elysia backend RAM with TTL (60s) and immediate invalidation on any mutation.
- **Rule 7 (Android Mobile-First):** Plan cards and switches must feature touch targets $\ge 44\text{px}$–$48\text{px}$ and adapt cleanly to smartphone viewports.
