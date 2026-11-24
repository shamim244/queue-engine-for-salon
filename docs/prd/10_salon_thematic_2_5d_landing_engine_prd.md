# Product Requirements Document (PRD): Salon Thematic 2.5D Landing Engine & Workflow Pipeline

## 1. Executive Summary & Document Overview
- **Document ID:** PRD-010
- **Feature Name:** Salon Thematic 2.5D Landing Engine & Interactive Operational Pipeline
- **Target Platform:** SalonView (`queue-engine-for-salon`)
- **Document Version:** 1.0.0
- **Status:** Approved for Implementation
- **Author:** Principal AI Systems & AppSec Specialist
- **Target Subsystems:**
  1. **Salon Thematic 2.5D Unfolding Hero (`Hero2Point5D`):** Immersive scroll-driven perspective unfolding of the Barber Chair Cutting Station tablet with multi-plane physical ticket depth.
  2. **Interactive Salon Workflow Circuit (`SalonWorkflowCircuit`):** Animated SVG telemetry light-beam illustrating the real-world 5-node salon queue loop (*Entrance QR ➔ Core Bun Engine ➔ Chair Station Touchpad ➔ WhatsApp Summon ➔ Lobby TV Departure Mirror*).
  3. **3D Salon Grooming Marquee (`SalonServicesMarquee`):** 3D perspective infinite stream of authentic Indian salon services (Fade Cut, Beard Sculpting, De-Tan Facial, Keratin Treatment, Royal Shave) and customer satisfaction proof.
  4. **Tactile 3D Salon Cards & Ticket Stubs:** Physical ticket notches, realistic barcodes, floating scissor/clipper silhouettes, and cursor-reactive tilt.
  5. **Dynamic Rolling ROI Economics:** Scroll-triggered counting counters demonstrating recovered monthly cash from walkout bench prevention.
  6. **Android Mobile-First Adaptation:** Strict compliance with Rule 7 of `GEMINI.md` ($95\%+$ mobile traffic, minimum $48\text{px}$ touch targets, zero horizontal overflow on $360\text{px}$ screens).

---

## 2. Problem Statement: Why Generic SaaS Fails Indian Salons

### 2.1 The Visual & Relatable Disconnect
- **The Generic Tech Trap:** Most salon software landing pages show abstract purple/blue SaaS dashboards, charts, and generic B2B copy. Indian barbers and salon owners (e.g. Ramesh Barber, modern unisex studios, luxury grooming lounges) cannot see their daily reality in these interfaces.
- **The Missing Physical Atmosphere:** A salon is an inherently sensory, tactile environment—leather styling chairs, LED ring mirror reflections, stainless steel shears, paper token slips, Saturday evening bench crowds, and customers stepping out for chai.
- **The "Heavy 3D" Fallacy:** Traditional agencies attempt to solve this with 15MB+ Three.js WebGL 3D meshes that cause battery drain, long loading screens, and layout jank on Android 4G networks.
- **The "Reinventing the Wheel" Waste:** Writing raw complex physics matrices, bezier curves, and perspective transforms from scratch takes weeks and introduces cross-browser regressions.

### 2.2 The "Middle Path" Solution
Instead of heavy WebGL or custom scratch-coded boilerplate, we leverage **lightweight, hardware-accelerated 2.5D component primitives** (curated from Aceternity UI, Magic UI, and React Bits):
- Built on top of **Tailwind CSS + Framer Motion** (already in `apps/web/package.json`).
- Ultra-lightweight footprint ($<25\text{KB}$ combined gzipped).
- **100% Client-Side GPU Compute:** Zero server loops or polling (Rule 1 of `GEMINI.md`).
- **Authentic Barbershop DNA:** Leather textures, brushed brass/emerald accents, physical ticket stubs, and localized real-world scenarios.

---

## 3. The 5 Core Physical Salon Touchpoints (The Operational Pipeline)

Every visual and interactive section of the landing page must map directly to one of the **5 physical salon touchpoints**:

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                         5-NODE SALON OPERATIONAL PIPELINE                              │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                        │
 │   [Node 1: Door QR Stand] ──────────► [Node 2: Bun Queue Engine]                      │
 │   • Acrylic A4 counter stand           • In-memory atomic FIFO                         │
 │   • 1-scan check-in (no app)           • Sub-15ms WebSocket dispatch                   │
 │                                                   │                                    │
 │                                                   ▼                                    │
 │                                       [Node 3: Chair Touchpad]                         │
 │                                       • Stylist mirror tablet                          │
 │                                       • PIN 1234, 1-tap "Next"                         │
 │                                       • Live chair bill ₹140                           │
 │                                                   │                                    │
 │                         ┌─────────────────────────┴────────────────────────┐           │
 │                         ▼                                                  ▼           │
 │              [Node 4: WhatsApp Ping]                            [Node 5: Lobby TV Mirror] │
 │              • Meta API <180ms                                  • Airport departure    │
 │              • "Chair #1 ready for Amit"                        • Phone privacy mask   │
 │              • 3-minute grace window                            • Ambient LED glow     │
 │                                                                                        │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Touchpoint 1: Front Door QR Stand (Acrylic A4 Station)**
   - Customer scans printed QR code with standard phone camera upon arriving.
   - Instantly issues digital pocket ticket `#104` with live wait-time countdown.
   - Customer is free to wait inside, sit in their car, or step out for tea.

2. **Touchpoint 2: Bun Real-Time Queue Engine**
   - High-throughput, zero-poll state authority.
   - Sub-15ms atomic dispatch over WebSockets.

3. **Touchpoint 3: Barber Chair Station Touchpad**
   - Mounted beside each styling chair mirror.
   - Barber enters quick PIN (e.g. `1234`), views active service duration, and taps "Call Next Customer".

4. **Touchpoint 4: Automated WhatsApp Summon Dispatch**
   - Dispatches instant WhatsApp notification to customer `#104`:  
     *"Namaste Amit! Your chair is ready with Ramesh Kumar. Please step in within 3 minutes! ✂️"*

5. **Touchpoint 5: Waiting Lounge TV Departure Mirror & UPI Checkout**
   - High-contrast flight departure screen on any smart TV or Firestick.
   - Customer checks out at chair with dynamic NPCI UPI QR code (0% gateway fees).

---

## 4. User Personas & Value Propositions

| Persona | Real-World Scenario | Primary Objection | Feature That Converts Them |
| :--- | :--- | :--- | :--- |
| **Traditional Barbershop Owner** (e.g., Ramesh Barber, 2–4 chairs) | Loses 6–10 clients every Saturday/Sunday when the waiting bench gets full and people walk out. | *"My staff and customers aren't tech-savvy; we can't manage complicated apps."* | **Zero App Install QR + WhatsApp ping.** Shows that customers only need their existing phone camera and WhatsApp. |
| **Modern Unisex Salon Studio** (e.g., Aura Salon, 6–10 chairs) | Chaotic reception, customers arguing about who arrived first, front desk overwhelmed with phone calls. | *"Is it fast enough during peak hours? Will my customer phone numbers leak?"* | **Lobby TV Departure Board + Phone Masking (+91 98\*\*\* 12345).** Brings airport-grade order to the lounge. |
| **Stylist / Barber** | Needs to cut hair without typing on keyboards or filling out complex forms. | *"I don't have time to fiddle with computers while holding scissors."* | **Chair Touchscreen with 1-Tap Numpad & PIN.** Takes $<2$ seconds between haircut sessions. |
| **Reseller / Channel Partner** | Local tech consultant, salon equipment supplier, or distributor seeking monthly recurring revenue. | *"Is this hard to sell to salon owners?"* | **Dedicated `/partners` Hub.** 25%–35% lifetime recurring commissions with instant ROI demo. |

---

## 5. Functional & Visual Specifications

### 5.1 The 2.5D Unfolding Hero (`Hero2Point5D`)
- **Scroll Unfolding:** Uses Aceternity's `ContainerScroll` component. As the visitor scrolls down, the hero card tilts from a 3D isometric angle (`rotateX: 20deg -> 0deg`) while scaling up to reveal the live **Barber Cutting Station Mirror Tablet**.
- **Multi-Plane 3D Depth (`3D Card`):**
  - **Layer 0 (Workstation):** Dark salon granite / leather background with subtle LED ring backlight.
  - **Layer 1 (Ticket Stub):** Pocket Ticket `#104` with serrated cutouts, SVG barcode, and live ticking clock (`12m 24s`).
  - **Layer 2 (Barber Tools):** Chrome shears, comb, and hair clipper vector silhouettes elevated in 3D perspective (`translateZ(40px)`).
  - **Layer 3 (WhatsApp Summon):** WhatsApp verified bubble floating at `translateZ(60px)` with delivery timestamp and double checks.
- **Mobile Responsive Fallback:** On screens $\le 768\text{px}$, rotation is capped to safe angles ($0^\circ - 10^\circ$) and scales cleanly to prevent horizontal overflow.

### 5.2 The Interactive Salon Workflow Circuit (`SalonWorkflowCircuit`)
- **Animated Beam Telemetry:** Implements Magic UI's `AnimatedBeam` component to render continuous animated light packets traveling along SVG bezier paths between the 5 physical salon nodes.
- **Interactive Node Inspection:** Tapping or hovering on any node displays a contextual operational tooltip (e.g., tapping *Door QR Stand* explains how A4 acrylic stands eliminate front desk queues).

### 5.3 3D Salon Services Marquee (`SalonServicesMarquee`)
- **Perspective 3D Stream:** Infinite looping marquee cards tilted at an angle showcasing high-margin salon services:
  - *Classic Fade & Beard Sculpt* (₹250 · 30m)
  - *De-Tan Facial + Head Massage* (₹450 · 45m)
  - *Keratin Hair Spa Treatment* (₹999 · 60m)
  - *Royal Wedding Grooming Combo* (₹1,499 · 90m)
- **Ambient Spotlight Reflection:** Individual service cards feature dynamic cursor-following spotlight glows mimicking overhead salon lighting.

### 5.4 Live Queue Sandbox & Web Audio Chimes (`QueueSimulator`)
- **Synthesized Audio Chime:** Preserves the client-side `AudioContext` dual-tone chime ($587.33\text{ Hz}\rightarrow 880\text{ Hz}$) when summoning customers.
- **Live Event Ticker:** Bun WebSocket event stream simulation logging chair calls and bill settlements.

---

## 6. Non-Functional Requirements & Performance Budget

1. **Zero Server Compute Waste (Rule 1):** All scroll transformations, countdown tickers, and audio synthesis must run in client browser memory and GPU.
2. **Android Mobile-First Standards (Rule 7):**
   - Minimum touch target: $48\text{px}\times 48\text{px}$ for all primary buttons.
   - Zero horizontal overflow on $360\text{px}$ viewports.
   - Smooth 60fps scrolling on budget Android chipsets (e.g. MediaTek Helio G85 / Snapdragon 680).
3. **Bundle Size Budget:** Component primitives must add $<30\text{KB}$ combined gzipped code, relying entirely on existing `framer-motion` and Tailwind dependencies.
4. **Accessibility (WCAG 2.1 AA):** All text elements must maintain $\ge 4.5:1$ contrast against dark backgrounds; respect `prefers-reduced-motion` for scroll transforms.

---

## 7. Success Criteria & KPIs

- **Visual Authenticity Score:** 100% of landing page visuals explicitly reflect salon equipment, barbershop workflows, and grooming services.
- **Test Coverage:** $\ge 240$ passing unit and integration tests across web components.
- **Production Build:** Next.js compiles all 73 routes cleanly with 0 TypeScript or lint errors.
- **Sub-50ms Response Time:** Dynamic config delivery from Bun in-memory cache remains $<10\text{ms}$.
