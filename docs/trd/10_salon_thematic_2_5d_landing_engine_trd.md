# Technical Requirements Document (TRD): Salon Thematic 2.5D Landing Engine & TDD Testing Architecture

## 1. Document Overview
- **Document ID:** TRD-010
- **Feature Name:** Salon Thematic 2.5D Landing Engine & TDD Testing Architecture
- **Target Platform:** SalonView (`queue-engine-for-salon`)
- **Document Version:** 1.0.0
- **Status:** Approved for Implementation
- **Author:** Principal AI Systems & AppSec Specialist
- **Parent PRD:** [`PRD-010: Salon Thematic 2.5D Landing Engine & Workflow Pipeline`](file:///v:/salon/queue-engine-for-salon/docs/prd/10_salon_thematic_2_5d_landing_engine_prd.md)
- **Compliance Rules:** Rule 1 (*Zero Server Waste*), Rule 7 (*Android Mobile-First*), Rule 8 (*Security Enforcement*) of `GEMINI.md`.

---

## 2. Technical Architecture & Component Tree

```
apps/web/
├── components/
│   ├── ui/
│   │   ├── container-scroll-animation.tsx   # [Aceternity Primitive] Scroll perspective unfolding
│   │   ├── 3d-card.tsx                      # [Aceternity Primitive] Multi-layer translateZ depth
│   │   ├── animated-beam.tsx                # [Magic UI Primitive] SVG bezier telemetry pulses
│   │   ├── marquee.tsx                      # [Magic UI Primitive] Infinite 3D service carousel
│   │   └── spotlight-card.tsx               # [React Bits Primitive] Salon mirror lighting
│   └── landing/
│       ├── types.ts                         # Registry & Section interfaces
│       ├── registry.ts                      # SECTION_REGISTRY & Template manifests
│       ├── hero-2point5d.tsx                # Unfolding 2.5D Salon Mirror Station Hero
│       ├── salon-workflow-circuit.tsx       # 5-Node Animated Beam Pipeline Section
│       ├── salon-services-marquee.tsx       # 3D Tilted Grooming Combo Showcase
│       ├── queue-simulator.tsx              # AudioContext summon & live event ticker
│       ├── tv-mirror-preview.tsx            # 4K Ambilight Departure Display
│       ├── upi-showcase.tsx                 # Dynamic NPCI UPI QR code + laser scan
│       ├── roi-calculator.tsx               # Dynamic walkout revenue recovery model
│       └── ...
└── test/
    ├── salon-landing-thematic.test.tsx      # TDD Unit & Integration test suite
    ├── container-scroll.test.tsx            # Scroll transforms & mobile clamp tests
    └── homepage.test.ts                     # Dispatcher integration test
```

---

## 3. Mathematical Foundations: 2.5D Scroll Physics & Hardware Offloading

### 3.1 Scroll-Driven Rotation & Scaling Matrix (`ContainerScroll`)
The unfolding hero uses Framer Motion’s `useScroll` target bound to the section container element:

$$\text{scrollYProgress} \in [0.0, 1.0]$$

Transformations applied across the progress range:

$$\text{rotateX}(p) = 20^\circ \times (1 - p)$$

$$\text{scale}(p) = 
\begin{cases} 
0.85 + 0.15 \cdot p & \text{if } w_{\text{viewport}} \le 768\text{px (Mobile)} \\
1.05 - 0.05 \cdot p & \text{if } w_{\text{viewport}} > 768\text{px (Desktop)}
\end{cases}$$

$$\text{translateY}(p) = -100\text{px} \cdot p$$

- **GPU Offloading Guarantee:** Handled strictly via CSS `transform` and `will-change: transform`. No layout reflows (`width`/`height`/`top`/`left` remain static).

### 3.2 Multi-Plane Z-Axis Separation (`3D Card`)
The Barber Mirror Station uses CSS perspective to elevate physical layers:

$$\text{Perspective} = 1000\text{px}, \quad \text{transformStyle} = \text{preserve-3d}$$

$$\text{Layer Depth Configuration:}$$
- **Layer 0 (Mirror Frame & Stand):** $\text{translateZ}(0\text{px})$
- **Layer 1 (Pocket Ticket Stub #104):** $\text{translateZ}(35\text{px})$
- **Layer 2 (Chrome Scissors & Clippers):** $\text{translateZ}(60\text{px})$
- **Layer 3 (WhatsApp Summon Pill):** $\text{translateZ}(85\text{px})$
- **Layer 4 (Live Timer Badge):** $\text{translateZ}(100\text{px})$

### 3.3 Animated SVG Telemetry Pathing (`AnimatedBeam`)
The light pulse travels along a cubic bezier curve connecting two DOM elements (`fromRef` to `toRef`):

$$\mathbf{B}(t) = (1-t)^3 \mathbf{P}_0 + 3(1-t)^2 t \mathbf{P}_1 + 3(1-t) t^2 \mathbf{P}_2 + t^3 \mathbf{P}_3, \quad t \in [0, 1]$$

Where:
- $\mathbf{P}_0 = (x_{\text{start}}, y_{\text{start}})$
- $\mathbf{P}_1 = (x_{\text{start}} + \Delta x \cdot 0.5, y_{\text{start}} + \text{curvature})$
- $\mathbf{P}_2 = (x_{\text{end}} - \Delta x \cdot 0.5, y_{\text{end}} - \text{curvature})$
- $\mathbf{P}_3 = (x_{\text{end}}, y_{\text{end}})$

Light packet motion is animated via SVG `<linearGradient>` with stop offsets looping infinitely in client RAM.

---

## 4. Test-Driven Development (TDD) Strategy & Specifications

In strict adherence to the project testing standards, test suites will be authored **before and alongside implementation**:

### 4.1 Test Suite 1: `apps/web/test/container-scroll.test.tsx`
- **Test Case 1.1:** Verifies `ContainerScroll` renders children within a `preserve-3d` viewport without crashing.
- **Test Case 1.2:** Verifies responsive viewport scaling clamps `rotateX` to $0^\circ$ on mobile viewports ($\le 768\text{px}$).
- **Test Case 1.3:** Verifies header title component and inner content card are rendered cleanly with accessible DOM nodes.

### 4.2 Test Suite 2: `apps/web/test/salon-landing-thematic.test.tsx`
- **Test Case 2.1 (`Hero2Point5D`):** 
  - Verifies presence of authentic salon thematic elements: `Pocket Ticket`, `Haircut`, `Beard Trim`, `Scissors`, and `Ramesh Traditional Barber`.
  - Verifies presence of client-side ticking countdown without throwing during SSR / static rendering.
- **Test Case 2.2 (`SalonWorkflowCircuit`):**
  - Verifies rendering of the 5 physical salon nodes:
    1. `Door QR Stand`
    2. `Bun Queue Engine`
    3. `Chair Touchpad`
    4. `WhatsApp Summon`
    5. `Lobby TV Mirror`
  - Verifies animated SVG beam connectors and container dimensions.
- **Test Case 2.3 (`SalonServicesMarquee`):**
  - Verifies 3D perspective infinite carousel rendering with service cards (*Classic Fade*, *De-Tan Facial*, *Keratin Treatment*).
- **Test Case 2.4 (`QueueSimulator`):**
  - Verifies Web Audio API initialization gracefully handles missing audio contexts or locked browser policies without crashing.
  - Verifies "Call Next Customer" increments tickets and logs to the live salon event stream.

---

## 5. Security & Multi-Tenant Data Isolation (Rule 8 Compliance)

1. **Phone Masking Protection:** All telephone numbers displayed in mockups or preview cards must conform to the phone masking protocol:  
   `+91 98*** 12345`  
   Zero plain customer PII may be rendered in client templates.
2. **Zero Plaintext Credentials:** Demo station shortcuts use client-scoped PINs (`1234`) without transmitting sensitive salon owner credentials.
3. **No Direct WebGL Shader Injection:** Avoid third-party arbitrary WebGL shader scripts; all animations use verified declarative CSS and SVG properties.

---

## 6. Android Mobile-First Performance Matrix (Rule 7 Compliance)

| Metric | Target Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Minimum Touch Target** | $\ge 48\text{px} \times 48\text{px}$ | Tailwind `min-h-[48px]`, `px-6`, `py-3` on all CTA buttons |
| **Zero Horizontal Overflow** | $0\text{px}$ overflow on $360\text{px}$ viewport | `overflow-hidden` on section containers, dynamic scale clamp |
| **Frame Rate** | Locked 60fps on mid-range Android | CSS `will-change: transform`, GPU compositing layers |
| **Client Audio** | Fallback on strict autoplay policy | `try/catch` wrapper around `AudioContext` resumption |

---

## 7. Rollback & Verification Procedures

- **Active Rollback Base:** Tag `landing-engine-visual-v2` at commit `15287bb`.
- **Pre-Implementation Backup:** Tag `pre-thematic-2-5d-redesign`.
- **Validation Commands:**
  ```bash
  bun test apps/web/test
  bun test apps/api/test/landing-config.test.ts
  bun --cwd apps/web build
  graphify update .
  ```
