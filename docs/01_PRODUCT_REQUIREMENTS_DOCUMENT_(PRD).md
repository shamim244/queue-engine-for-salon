# Product Requirements Document (PRD)
## Project Name: Engine Que System for Salons
**Document Version:** 2.0.0  
**Status:** Approved & Living Blueprint  
**Target Runtime:** Bun v1.4.3 | ElysiaJS | MySQL 8.0/9.1 | Next.js 15  

---

## 1. Executive Summary & Vision

**Engine Que System** is an enterprise-grade, high-concurrency B2B SaaS queue engine and operational platform built for the salon and personal grooming industry.

The platform solves the global salon waiting problem: **customers waste 1.5 to 3 hours sitting idly in cramped waiting rooms on weekends**, while salon owners suffer chaotic walk-ins, lost walk-outs, uncalibrated barber speeds, and inefficient chair utilization.

Unlike traditional salon software designed exclusively for luxury Beverly Hills spas with dedicated receptionists and high-speed Wi-Fi, **Engine Que System is engineered around a strict Dual-Market Reality**:
1. **The Rural / Semi-Urban Solo Barber Shop:** Single chair, zero receptionist, zero TV screens, 2G/3G connectivity, cash transactions, flexible chair pricing, and shared budget mirror tablets.
2. **The Modern Urban Multi-Station Salon:** Multi-station styling bays, dedicated reception desk, digital waiting lounge TV departure board, online UPI/card payments, fixed catalogs with upselling, and multi-branch chains.

In the future, the exact same underlying queue engine will expand into **clinics/doctors, restaurant dining queues, and banking teller counters**.

---

## 2. Core Problem Statements

### Problem A: The Rural & Semi-Urban Solo Barber ("Ramesh" Reality)
* **No Front Desk:** Ramesh cannot type on a keyboard while cutting hair with scissors and wet, greasy hands.
* **No TV Hardware:** Ramesh will never spend ₹20,000 on a smart TV for a 1-chair shop. His mirror is his only display.
* **No Fixed Price Lists:** In village and tier-3 markets, a haircut might be ₹80 for a college student, ₹100 for a businessman, and ₹60 for an elderly uncle. Pricing is negotiated at the chair.
* **The "Chai / Paan" Problem:** A customer checks in, sees 4 people ahead, and leaves for 20 minutes to drink tea nearby. If their turn comes and they are absent, the barber loses money if they cannot easily bump them by 3 minutes without losing their place.

### Problem B: The Modern Multi-Station Chain ("Aura Salon" Reality)
* **Chair Hopping Chaos:** Stylists move between washing stations, cutting mirrors, and spa rooms. They need to rapidly take over tablets with a 1-second 4-digit PIN.
* **Waiting Room Congestion:** Clients crowd the lobby asking *"How much longer?"* every 5 minutes, distracting stylists and receptionists.
* **Staff Pacing Variance:** Master Stylist Leo finishes a haircut in 20 minutes; Junior Stylist Maria takes 40 minutes. Fixed static wait calculators fail completely.
* **Tenant Scaling:** Chain owners manage 3–10 branches and need consolidated oversight over revenue, staff accounts, and subscription tiers.

### Problem C: The Consumer Experience
* **The "App Fatigue" Wall:** Customers standing outside a salon in the heat will **abandon check-in immediately** if forced to download a 60MB native app, verify an OTP, and create an alphanumeric password.
* **Lack of Transparency:** Customers have no idea if "you're next" means 3 minutes or 35 minutes.

---

## 3. User Personas & Core Journeys

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE USER PERSONAS                              │
├─────────────────┬────────────────────┬─────────────────────────────────┤
│ Persona         │ Real-World Context │ Primary Need                    │
├─────────────────┼────────────────────┼─────────────────────────────────┤
│ Ramesh Kumar    │ Solo Barber Shop   │ 1-tap operation, voice callout, │
│ (Solo Barber)   │ (Village / Semi)   │ cash flexibility, mirror poster │
├─────────────────┼────────────────────┼─────────────────────────────────┤
│ Aura Owner      │ 4-Chair Modern Hub │ Multi-branch metrics, staff IDs,│
│ (Salon Owner)   │ (Urban Commercial) │ tier quotas, session kill-switch│
├─────────────────┼────────────────────┼─────────────────────────────────┤
│ Leo & Maria     │ Master Stylists    │ 4-digit PIN chair switch, speed │
│ (Salon Staff)   │ (Aura Salon)       │ calibration, call-next audio    │
├─────────────────┼────────────────────┼─────────────────────────────────┤
│ Amit Sharma     │ Walk-In Customer   │ Zero-app QR scan, live tracker, │
│ (Consumer)      │ (Smartphone/Guest) │ WhatsApp arrival alerts         │
├─────────────────┼────────────────────┼─────────────────────────────────┤
│ Platform Admin  │ Super Admin        │ Tenant health, billing tiers,   │
│ (SaaS Operator) │ (Engine Que SaaS)  │ sponsored ads, zero-downtime ops│
└─────────────────┴────────────────────┴─────────────────────────────────┘
```

---

## 4. Functional Specifications & Modules

### Module 1: Frictionless Customer Door QR Check-in (`/s/:slug`)
* **Zero-Download Web Experience:** Customer scans QR code printed on the door or mirror. Instant load time ($<25\text{KB}$, zero hydration lag on 2G/3G).
* **Frictionless Entry:** Client enters Name and optional Mobile Phone number, selects a primary service (e.g. Haircut), selects optional add-ons (e.g. Beard trim, Hair spa), and optionally picks a preferred stylist or "Fastest Available".
* **Instant Ticket Generation:** Client receives an atomic, sequentially incremented ticket number (e.g. `#101`) with real-time calculated wait time and queue position.
* **Live Animated Progress Tracker:** Real-time web page with animated queue bar, dynamic minute countdown, and browser audio chime when chair is ready.
* **Automated WhatsApp Dispatches:**
  * *On Check-in:* Confirmation message with Ticket # and estimated wait.
  * *On Summon:* *"CHAIR READY: Please step inside within 3 minutes!"*
  * *On Soft Bump:* *"We held your spot! You are next in line."*
* **Optional 1-Tap Profile Save:** Non-blocking card at the bottom allows frequent customers to save haircut preferences and phone for 1-tap future check-ins.

### Module 2: Minimalist Printable Mirror QR Poster (`/s/:slug/poster`)
* **English Minimalist Aesthetic:** High-contrast typography designed specifically for barber mirrors.
* **Zero Distraction:** Large scannable QR code centered, salon name, clean instructions ("Scan QR to hold your spot. Relax nearby, we alert your phone").
* **Print-Ready CSS:** Automatic browser print stylesheets (`@media print`) that hide page margins and headers for instant A4 printing.

### Module 3: Modern High-Contrast Lobby TV Departure Board (`/s/:slug/tv`)
* **Airport Departure Board Paradigm:** Displays "NOW SERVING" (Chairs with Stylist Name, Ticket Number, and Client Name) and "NEXT IN LINE" (Tickets in waiting sequence with countdown).
* **Privacy Phone Masking:** Customer phone numbers are automatically masked (`+91 98765 ***10`) to protect customer privacy on public screens.
* **Low-Memory Smart TV Optimization:** Continuous zero-memory-leak WebSocket listener; renders flawlessly on budget Android TVs and older WebKit browsers.

### Module 4: Stylist Working Station with 4-Digit Mirror PIN (`/s/:slug/staff`)
* **Shared Mirror Tablet Keypad:** Stylists on shared mirror-mounted tablets tap their name and key in a **4-digit PIN** on an on-screen tactile numpad (`1..9`, `0`, `⌫`, `Clear`). Unlocks chair control in $<200\text{ms}$.
* **🔄 Rapid Chair Switch Overlay:** Barbers sharing a single mirror tablet swap sessions with a 2-second tap without logging out or reloading the page.
* **Working Panel Controls:**
  * 🟢 *Currently Serving Box:* Client name, service, and live editable bill amount (`₹[editable]`).
  * 📢 *Giant Call Next Button:* Summons next ticket in line and triggers browser **Web Speech API** voice announcement: *"Ticket Number 102, Rahul, please step to chair"*.
  * 💺 *Seat In Chair:* Transitions ticket state from `SUMMONED` to `IN_CHAIR`.
  * 💵 *Flexible Payment Checkout:* Supports 1-tap cash or UPI checkout with final adjusted price.
* **Speed Calibration Slider:** Stylists adjust their personal average service pace (15 to 60 mins). The queue engine automatically recalculates all downstream wait times across all customer screens in real time.

### Module 5: 3-Minute Soft Bump Protocol (The Paan / Tea Stall Hold)
* **The Grace Period Mechanism:** When a customer is summoned but is absent (grabbing tea), the barber taps `⏳ 3m Hold`.
* **Non-Destructive Reordering:** The ticket is NOT cancelled. It transitions to `SOFT_BUMPED` and is held at the top of the queue for 3 minutes while the barber calls the next person.
* **Automated Notification:** A WhatsApp alert is instantly dispatched: *"Late Arrival Notice: We held your place and placed you next in line. Please let the barber know when you arrive!"*

### Module 6: Receptionist Front Desk Command Panel (`/s/:slug/desk`)
* **Multi-Station Overview:** Receptionist views all styling chairs simultaneously, tracks queue backlog, and assigns specific walk-ins to requested stylists.
* **1-Tap Non-Smartphone Walk-In Quick Add:** Receptionist or solo barber can add walk-in clients (e.g. elderly uncles without smartphones) with a single tap using default placeholders.

### Module 7: Salon Owner Command Hub (`/s/:slug/owner`)
* **Multi-Identifier Login:** Authenticate using Username, Mobile Phone Number, or Email Address.
* **Subscription Tier & Quota Bar:** Visual indicators showing active plan (`SOLO`, `PRO`, `ENTERPRISE`), current branches used vs allowed, and stylists allowed per branch.
* **1-Click Plan Upgrades:** Upgrade tier dynamically without schema downtime.
* **Stylist User Accounts Panel:**
  * View active stylists, phone numbers, and PIN status (`●●●● PIN Active` or `No PIN`).
  * Set/Change 4-digit PIN for rapid mirror tablet chair switching.
  * **🚨 Emergency Kill Switch:** 1-tap revokes all active tablet and phone sessions for a terminated or compromised stylist across all devices (`POST /api/auth/staff/revoke-all`).
  * **+ Add Stylist:** Create new stylist stations (automatically gated by tier limits).
  * **+ Create Staff Login:** Generate login credentials with optional mobile phone and 4-digit PIN.
* **Service Catalog & Pricing Engine:**
  * `FIXED`: Fixed standard price.
  * `STARTING_AT`: Base price, upsellable in chair.
  * `FLEXIBLE_CHAIR`: Rural flexible pricing, finalized at the chair.

### Module 8: SuperAdmin SaaS Platform (`/admin.html`)
* **Multi-Tenant Oversight:** View all registered salon tenants, their active queue volume, stylist count, and revenue metrics.
* **Zero-Downtime Operating Mode Switcher:** Toggle any salon between `RURAL_SOLO` and `MODERN_MULTI` in 1 click.
* **Subscription Tier Gating:** Cycle tenant organizations between `SOLO` $\leftrightarrow$ `PRO` $\leftrightarrow$ `ENTERPRISE` with immediate quota adjustment.

### Module 9: Future Hybrid Appointment + Walk-in Booking Engine
* **The Interleaving Algorithm:** Online bookings (e.g. 3:00 PM appointment) are reserved with a dynamic buffer block on the stylist's timeline. Walk-ins arriving at 2:20 PM are routed to free stylists or given an estimated wait time that accounts for the reserved slot.
* **Customer Self-Service Rescheduling:** Customers can reschedule or cancel appointments up to 1 hour before their slot, automatically opening the slot to the walk-in queue.

### Module 10: In-App Sponsored Advertising Network
* **Ad Placements:**
  * Banner slot on the Customer Door QR Live Tracking Page (high attention, customer stares at it for 20+ minutes).
  * Lower-third ticker on the Lobby TV Departure Board.
* **Targeting:** Localized grooming brand promotions (e.g. beard grooming kits, hair care products) or salon cross-promotions.

---

## 5. Business Model & Subscription Tiers

```
┌────────────────────────────────────────────────────────────────────────┐
│                      SAAS SUBSCRIPTION TIERS                           │
├─────────────────┬──────────────┬───────────────┬───────────────────────┤
│ Tier            │ Price (INR)  │ Max Branches  │ Max Stylists / Branch │
├─────────────────┼──────────────┼───────────────┼───────────────────────┤
│ SOLO            │ ₹499 / month │ 1 Branch      │ 1 Stylist (Solo)      │
│ PRO             │ ₹1,499/ month│ 3 Branches    │ 10 Stylists / Branch  │
│ ENTERPRISE      │ ₹4,999/ month│ Unlimited     │ Unlimited             │
└─────────────────┴──────────────┴───────────────┴───────────────────────┘
```

### Additional Revenue Streams
1. **WhatsApp Messaging Packs:** Tier plans include 250 free WhatsApp alerts/month. Additional alerts billed at ₹0.35 per message.
2. **Platform Sponsored Ads:** Grooming brands pay CPM / CPC to display product ads on customer tracking screens and lobby TVs.
3. **Transaction Fee on Online UPI Payments:** Optional 1.0% convenience fee on online customer pre-payments.

---

## 6. Non-Functional Requirements (NFRs)

* **Performance & Concurrency:** Core queue state transitions must complete in $<15\text{ms}$. Backend must sustain 10,000+ concurrent WebSocket connections per server instance using Bun native WebSockets.
* **Payload Footprint:** Customer Door QR check-in page initial load must be $<25\text{KB}$ with zero heavy hydration lag.
* **Availability & Downtime:** Zero downtime for schema upgrades. All migrations must be non-blocking and additive (`ADD COLUMN IF NOT EXISTS`).
* **Security & Zero-Trust:** All sessions are validated statefully with token revocation. Sensitive phone numbers are masked on public displays. Password hashing uses native bcrypt (work factor 10).
* **Hardware Resilience:** Mirror station and TV screens must self-reconnect via WebSocket within 3 seconds of a network drop.
