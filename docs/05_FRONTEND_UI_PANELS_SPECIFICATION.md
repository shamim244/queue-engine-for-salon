# Frontend UI Panels & Component Specification
## Project: Engine Que System for Salons
**Document Version:** 1.0.0  
**Status:** Living Engineering Standard  
**Framework:** Next.js 15 (App Router) | Tailwind CSS | shadcn/ui  

---

## 1. Frontend Architecture Overview

The Engine Que System frontend is structured into **6 distinct panels** built with **Next.js 15 App Router**, utilizing React Server Components (RSC) for initial page loads and Client Components (`"use client"`) for real-time interactive panels.

```
apps/web/
├── app/
│   ├── (admin)/                  # Panel 1: Super Admin Platform
│   │   └── admin/
│   │       ├── page.tsx          # Platform KPIs & Overview
│   │       ├── tenants/          # Multi-Tenant Directory & Modes
│   │       ├── billing/          # Subscription Tiers & Quota Overrides
│   │       └── ads/              # Sponsored Ads & Ticker Manager
│   │
│   ├── (owner)/                  # Panel 2: Salon Owner Command Hub
│   │   └── owner/
│   │       ├── page.tsx          # Live Salon Metrics & Quick Actions
│   │       ├── branches/         # Multi-Branch Switcher
│   │       ├── staff/            # Stylist Logins, 4-Digit PINs & Kill-Switch
│   │       ├── services/         # Service Catalog & Flexible Pricing
│   │       └── reports/          # Payouts & Commission Analytics
│   │
│   ├── (staff)/                  # Panel 3: Staff Account & Preferences
│   │   └── staff/
│   │       └── preferences/      # Speed Calibration & Shift Status
│   │
│   ├── (station)/                # Panel 4: Staff Working Station (Chair UI)
│   │   └── s/[slug]/station/
│   │       └── page.tsx          # PIN Numpad, Call Next, Chair Control
│   │
│   ├── (customer)/               # Panels 5A & 5B: Customer Touchpoints
│   │   ├── s/[slug]/             # Panel 5A: Door QR Check-in & Live Tracker
│   │   │   ├── page.tsx          # Ultra-light Check-in & Waiting Progress
│   │   │   └── tv/page.tsx       # Lobby TV Departure Board
│   │   └── me/                   # Panel 5B: Customer Account & History
│   │       ├── page.tsx          # Grooming Profile & Past Receipts
│   │       └── appointments/     # Bookings & Rescheduling
│   │
│   ├── layout.tsx                # Root layout with theme & font providers
│   └── globals.css               # Tailwind CSS theme tokens
│
├── components/
│   ├── ui/                       # shadcn/ui components (Button, Dialog, Table, etc.)
│   ├── admin/                    # Admin-specific components
│   ├── owner/                    # Owner-specific components
│   ├── station/                  # Tactile PIN keypad, Audio Voice Callout
│   └── customer/                 # Live progress bar, ticket cards
│
└── lib/
    ├── api.ts                    # Type-safe client connecting to Bun engine
    ├── socket.ts                 # Real-time WebSocket hook (auto-reconnect)
    └── auth.ts                   # Session token & cookie helpers
```

---

## 2. Detailed Specification of the 6 Panels

### Panel 1: Super Admin Platform (`/admin/*`)
* **Role Gate:** `SUPER_ADMIN`
* **Layout:** Sidebar navigation with persistent global KPI status bar.
* **Core Views:**
  1. **Platform Overview (`/admin`):**
     * Total registered salons, active customer tickets nationwide, platform GMV volume, WebSocket connection health.
  2. **Tenant Directory (`/admin/tenants`):**
     * Data table powered by `TanStack Table` with instant search, multi-column sorting, and pagination.
     * 1-click operating mode switcher: Toggle any salon between `RURAL_SOLO` $\leftrightarrow$ `MODERN_MULTI`.
     * Direct launch links to salon's TV, Door QR, and Owner hub.
  3. **Subscription Billing (`/admin/billing`):**
     * Organization tier management (`SOLO`, `PRO`, `ENTERPRISE`).
     * Manual override for custom branch and stylist limits.
  4. **Ad Network Manager (`/admin/ads`):**
     * Upload sponsored grooming brand banners and configure lower-third TV tickers.

---

### Panel 2: Salon Owner Command Hub (`/owner/*`)
* **Role Gate:** `SALON_OWNER`, `BRANCH_MANAGER`, `SUPER_ADMIN`
* **Layout:** Top bar with **Multi-Branch Switcher dropdown** and active subscription badge (`SOLO` / `PRO` / `ENTERPRISE`).
* **Core Views:**
  1. **Command Dashboard (`/owner`):**
     * Real-time metrics: Served today, revenue today, active queue count, average wait time.
     * Quick action shortcuts (Add walk-in, print poster, launch station).
  2. **Stylist Accounts & Security (`/owner/staff`):**
     * Stylist roster showing active working status and speed pace.
     * Credentials manager: Create username/password.
     * **4-Digit Quick Mirror PIN:** Assign or update 4-digit PIN for rapid tablet chair access.
     * **🚨 Emergency Kill-Switch:** 1-tap button revokes all active login sessions for any staff member across all devices instantly.
  3. **Service Catalog & Pricing Engine (`/owner/services`):**
     * Configure service name, base duration, and icon.
     * Pricing model selection:
       * `FIXED`: Standard exact price.
       * `STARTING_AT`: Base price, upsell in chair.
       * `FLEXIBLE_CHAIR`: Rural negotiable pricing finalized in chair.
  4. **Posters & Vanity Links (`/owner/links`):**
     * Print-ready minimalist mirror poster generator with embedded QR code.
     * Direct vanity URL links (`/s/:slug`, `/s/:slug/tv`, `/s/:slug/station`).

---

### Panel 3: Staff Account & Preferences Portal (`/staff/preferences`)
* **Role Gate:** `STAFF`
* **Layout:** Clean mobile-responsive single-page preferences card.
* **Core Views:**
  1. **Speed Calibration:**
     * Visual pace calibration slider (15m to 60m).
     * Adjusting personal speed automatically signals the queue engine to recalculate downstream wait times for waiting clients.
  2. **Shift Status:**
     * Clock in, start break, or end shift.
  3. **Credentials Management:**
     * Update alphanumeric password or reset 4-digit mirror PIN.
  4. **Personal History:**
     * List of services completed today with recorded earnings.

---

### Panel 4: Staff Working Station Panel (Chair UI) (`/s/:slug/station`)
* **Role Gate:** `STAFF` (Unlocked via 4-Digit PIN or Password)
* **Target Surface:** Shared mirror-mounted tablet or barber smartphone.
* **Core Features:**
  1. **Touch-Optimized 4-Digit PIN Keypad:**
     * Tactile numpad (`1..9`, `0`, `⌫`, `Clear`) designed for fast input with wet/greasy hands.
     * Station unlocks in $<200\text{ms}$.
  2. **🔄 Rapid Chair Switcher Modal:**
     * Stylists sharing a chair/tablet swap active sessions in 2 taps without logging out or reloading.
  3. **🟢 Currently Serving Box:**
     * Client name, ticket number, service, and **live editable bill amount (`₹[editable]`)**.
     * 1-tap checkout buttons: `💵 ₹ Paid (Cash) & Done` or `📱 Online UPI`.
  4. **📢 Giant Call Next Button:**
     * Calls next ticket in sequence.
     * Triggers browser **Web Speech API voice callout**: *"Ticket Number 102, Rahul, please step to chair"*.
  5. **Summoned Card Controls:**
     * `💺 Seat in Chair`: Transitions ticket to `IN_CHAIR`.
     * `⏳ 3m Hold`: Triggers the 3-minute soft bump protocol for absent clients grabbing tea.
  6. **Live Queue Order:**
     * Ordered list of waiting clients with estimated wait times and soft-bump flags.

---

### Panel 5A-1: Customer Door QR Scan & Live "Pocket TV" Queue Screen (`/s/:slug`)
* **Role Gate:** Public / Guest (Zero friction, no login required)
* **Footprint:** Ultra-lightweight ($<25\text{KB}$ initial bundle, zero hydration lag on 2G/3G).
* **Dual-View Screen Architecture:**
  1. **Self-Service Check-In Form (Before Joining):**
     * Inputs: Name and optional mobile phone number.
     * Service selection chips with price and duration indicators.
     * Optional stylist selection ("Fastest Available" or specific stylist).
     * Instant ticket issuance upon submission.
  2. **Top Card: Personal Live Ticket Tracker (After Joining):**
     * Big ticket number badge (e.g. `🎟️ Your Ticket: #104 (Amit Sharma)`).
     * People ahead counter (`👥 2 clients ahead of you`).
     * Real-time countdown timer (`⏳ Estimated Wait: ~20 mins`).
     * Animated visual progress bar.
     * Chime alert sound when summoned + WhatsApp arrival notification.
     * Reassuring prompt: *"Feel free to grab tea or relax nearby! We will alert you on WhatsApp and chime when you're next."*
  3. **Bottom Card: Live Salon Queue Board (Pocket TV View):**
     * Shows the live status of the whole salon right in their pocket:
       * **💺 Currently in Chair:** Chair 1 (Ramesh serving #101), Chair 2 (Leo serving #102).
       * **⏳ Next in Line:** Full waiting sequence (#103, #104 [YOU 👈], #105...).
     * Enables clients to leave the cramped waiting lounge and monitor their queue position advancing while sipping tea across the street.
  4. **Save Profile Shortcut:**
     * 1-tap non-blocking prompt at the bottom: *"Save this haircut to my profile for 1-tap future check-ins"*.

---

### Panel 5A-2: Public Salon Lobby TV Departure Board (`/s/:slug/tv`)
* **Audience:** The **ENTIRE SALON LOUNGE** (All waiting clients and visitors).
* **Hardware Surface:** 32" to 55" Smart TV mounted high on the lounge wall.
* **Core Display Paradigm:**
  * Airport departure board layout:
    * Left Column: **NOW SERVING** (All active chairs with Stylist name, Ticket number, and Client name).
    * Right Column: **NEXT IN LINE** (Ordered waiting tickets with dynamic wait times).
  * **Privacy Phone Masking:** Client phone numbers masked automatically (`+91 98765 ***10`).
  * Continuous low-memory self-healing WebSocket connection (<15MB RAM footprint on Android TV).

---

### Panel 5B: Registered Customer Account & History Portal (`/me` or `/customer`)
* **Role Gate:** `CUSTOMER` (Authenticated via Mobile Phone / OTP / Password)
* **Core Comprehensive Features:**
  1. **My Grooming Profile & Haircut Specs:**
     * Preferred stylist (e.g. Ramesh).
     * Detailed haircut & beard specs (e.g. "Zero fade on sides, scissor cut on top, beard trim with #2 guard").
     * Haircut reference photos and barber notes.
  2. **Complete Visit History & Digital Receipts:**
     * Chronological log of all salon visits.
     * Dates, salon branch visited, services performed, barber name, and amount paid.
     * 1-click download of digital tax receipt / bill.
  3. **Loyalty Rewards & Stamp Cards:**
     * Digital stamp card tracker (e.g. "Visit 4 of 6: 2 more cuts for a free beard trim!").
  4. **Upcoming Appointments & Bookings (Phase 3 Integration):**
     * View, reschedule, or cancel future pre-booked appointment slots.
     * Stamp card tracker (e.g. "Visit 4 of 6 to earn a free beard trim").
  4. **Upcoming Appointments (Phase 3 Integration):**
     * View, reschedule, or cancel future pre-booked appointments.

---

## 3. Technology Stack & Component Library

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Server components, edge routing, clean layout nesting |
| **Styling** | Tailwind CSS v3.4 | Utility-first, responsive, dark-mode styling |
| **Component Kit** | shadcn/ui (Radix UI) | Accessible, unstyled primitives (Dialog, Tabs, Dropdowns) |
| **Data Tables** | TanStack Table v8 | High-performance sorting, filtering, and pagination |
| **Form Validation**| react-hook-form + Zod | Type-safe form validation with zero manual DOM bugs |
| **Charts** | Recharts / Tremor | Revenue trends and queue turnover graphs |
| **Icons** | Lucide React | Consistent, lightweight vector iconography |
| **Voice Synthesis**| Browser Web Speech API | Client-side queue ticket voice announcements |
| **Real-time Client**| Native WebSockets | Connects to Bun `/ws` broadcast hub with auto-reconnect |
