# Execution Roadmap & Implementation Milestones
## Project: Engine Que System for Salons
**Document Version:** 2.0.0  
**Status:** Living Engineering Standard  

---

## 1. Roadmap Overview & Timeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ENGINE QUE ROADMAP PHASES                       │
├───────────────┬───────────────────────────────┬────────────────────────┤
│ Phase         │ Description                   │ Status                 │
├───────────────┼───────────────────────────────┼────────────────────────┤
│ Phase 1       │ Core Real-time Queue Engine   │  COMPLETE              │
│ Phase 1.5     │ Enterprise Auth, PIN & Tiers  │  COMPLETE              │
│ Phase 2       │ Next.js 15 Management Portals │ 🚀 IN PROGRESS (NEXT)  │
│ Phase 3       │ Hybrid Appointment Booking    │ ⏳ PLANNED             │
│ Phase 4       │ Subscriptions & Sponsored Ads │ ⏳ PLANNED             │
│ Phase 5       │ Native Android App (Flutter)  │ ⏳ PLANNED             │
│ Phase 6       │ Multi-Vertical Expansion      │ ⏳ FUTURE HORIZON      │
└───────────────┴───────────────────────────────┴────────────────────────┘
```

---

## 2. Phase Breakdown

###  Phase 1: Core Queue Engine & Dual-Mode State Machine (COMPLETED)
*  High-concurrency Bun v1.4.3 + ElysiaJS backend engine.
*  MySQL 8.0/9.1 relational persistence with in-memory caching fallback.
*  Dual-Mode operational paradigm: `RURAL_SOLO` vs `MODERN_MULTI`.
*  Real-time WebSocket event broadcaster (`/ws`).
*  Frictionless Customer Door QR check-in & live animated progress tracker.
*  Minimalist Printable Mirror QR Poster (`@media print` CSS).
*  High-contrast Lobby TV Departure Board with privacy phone masking.
*  Stylist Working Station with Call-Next, Web Speech API voice callouts, and 3-minute soft bump grace hold.
*  Speed Calibration Slider with dynamic downstream wait time recalculation.
*  WhatsApp notification engine (confirmation, summoned, and soft-bump alerts).

---

###  Phase 1.5: Enterprise Multi-Tenant Auth, PINs & Tier Quotas (COMPLETED)
*  Zero-trust stateful session engine with 30-day token persistence.
*  Multi-identifier authentication: Phone Number, Email, or Alphanumeric Username.
*  Rapid 4-digit PIN authentication (`pin_hash` via native Bun bcrypt) for shared mirror tablets.
*  Tactile touch-optimized numpad keypad and instant chair switcher overlay modal (`<200ms` response).
*  Salon Owner Emergency Kill-Switch (`POST /api/auth/staff/revoke-all`) to instantly revoke all active logins for compromised or terminated staff.
*  Dynamic Subscription Tier Gating (`SOLO`, `PRO`, `ENTERPRISE`) with branch and stylist quota guards.
*  1-Click zero-downtime tier upgrade/downgrade endpoint (`POST /api/salons/organizations/:id/tier`).
*  **Automated Test Suite:** 14 unit tests passing, 79 assertions.

---

### 🚀 Phase 2: Next.js 15 Enterprise Management Dashboards (NEXT PHASE)
* **Goal:** Replace raw vanilla HTML dashboards with modular, type-safe Next.js 15 App Router components, Tailwind CSS, and shadcn/ui.
* **Deliverables:**
  1. **Monorepo / Clean Separation:** Setup `apps/web` (Next.js 15) communicating with `apps/api` (Bun Core Engine).
  2. **Super Admin Platform (`/admin`):**
     * Multi-tenant salon directory with search, filter, and pagination (`TanStack Table`).
     * Live operating mode switcher (`RURAL_SOLO` $\leftrightarrow$ `MODERN_MULTI`).
     * Subscription tier management and quota override.
     * Platform analytics charts (`Recharts` / `Tremor`).
  3. **Salon Owner Hub (`/owner`):**
     * Multi-branch switcher dropdown.
     * Stylist roster management with PIN assignment and Emergency Kill-Switch.
     * Service catalog & flexible pricing manager.
     * Daily revenue and queue efficiency metrics.
  4. **Ultra-Light Touchpoint Optimization:**
     * Ensure Customer Door QR check-in and Lobby TV remain ultra-lean ($<25\text{KB}$) for budget devices and 2G/3G connections.

---

### ⏳ Phase 3: Hybrid Appointment Booking Engine
* **Goal:** Allow salons to accept pre-scheduled online appointments alongside walk-in queues without double-booking.
* **Deliverables:**
  1. **Dynamic Time-Buffer Slot Algorithm:** Interleaves booked appointments into the walk-in queue without starving either customer stream.
  2. **Customer Appointment Booking UI:** Select service, stylist, date, and available 30-minute time slots.
  3. **Salon Calendar View:** Weekly and daily stylist timeline view in the Salon Owner & Receptionist portal.
  4. **WhatsApp Appointment Reminders:** Automatic T-2 hour reminder with 1-click confirmation or reschedule link.

---

### ⏳ Phase 4: Monetization, Billing & Sponsored Ad Network
* **Deliverables:**
  1. **Payment Gateway Integration:** Razorpay (India) & Stripe (Global) for automated recurring SaaS billing (`SOLO` ₹499, `PRO` ₹1,499, `ENTERPRISE` ₹4,999).
  2. **WhatsApp Message Top-Ups:** Self-service pack purchases for WhatsApp notifications.
  3. **Sponsored Ad Management Engine:** Grooming brands can upload banner ads displayed on:
     * Customer Door QR live tracking screen.
     * Lobby TV departure board lower third.

---

### ⏳ Phase 5: Native Android App (Flutter) & POS Hardware
* **Deliverables:**
  1. **Dedicated Flutter App for Salon Owners & Stylists:**
     * Native Android APK with Firebase Cloud Messaging (FCM) background push notifications.
     * Biometric fingerprint / face unlock for owners.
  2. **Hardware Integration:**
     * Direct Bluetooth ESC/POS thermal printer support (58mm/80mm) for paper queue ticket printing.

---

### ⏳ Phase 6: Multi-Vertical Expansion
* **Deliverables:**
  1. **Clinics & Doctor OPDs:** Patients check in for token numbers, track estimated doctor consultation time.
  2. **Restaurants & Cafes:** Dining table waiting lists with SMS/WhatsApp ready alerts.
  3. **Bank & Government Teller Queues:** Multi-counter token routing with specialized service categories.
