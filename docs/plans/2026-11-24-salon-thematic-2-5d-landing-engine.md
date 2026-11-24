# Execution Plan: Salon Thematic 2.5D Landing Engine & Workflow Pipeline

- **Date:** 2026-11-24
- **Branch:** `main`
- **Rollback Base Tag:** `landing-engine-visual-v2` (`15287bb`)
- **Target Specification Documents:**
  - PRD: [`docs/prd/10_salon_thematic_2_5d_landing_engine_prd.md`](file:///v:/salon/queue-engine-for-salon/docs/prd/10_salon_thematic_2_5d_landing_engine_prd.md)
  - TRD: [`docs/trd/10_salon_thematic_2_5d_landing_engine_trd.md`](file:///v:/salon/queue-engine-for-salon/docs/trd/10_salon_thematic_2_5d_landing_engine_trd.md)
- **Methodology:** Strict Test-Driven Development (TDD) + Ponytail Lazy Senior Dev Mode + Zero Server Waste Architecture.

---

## Proposed Execution Phases

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           TDD & IMPLEMENTATION TIMELINE                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 1: Git Rollback Tagging & Safety Anchor                                              │
│  • Tag pre-implementation checkpoint: `pre-thematic-2-5d-redesign`                          │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 2: TDD Test Suites (Write Failing Tests First)                                       │
│  • Create `apps/web/test/container-scroll.test.tsx`                                         │
│  • Create `apps/web/test/salon-landing-thematic.test.tsx`                                   │
│  • Verify test runner captures failures before implementation                               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 3: Lightweight Component Primitives (`apps/web/components/ui/`)                      │
│  • `container-scroll-animation.tsx` (Aceternity UI: 2.5D scroll unfolding)                  │
│  • `3d-card.tsx` (Aceternity UI: multi-plane translateZ depth)                              │
│  • `animated-beam.tsx` (Magic UI via magicuidesign-mcp: SVG telemetry pulses)               │
│  • `marquee.tsx` (Magic UI: infinite 3D service carousel)                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 4: Salon Thematic Component Assembly (`apps/web/components/landing/`)                │
│  • Refactor `hero-2point5d.tsx` with unfolding Barber Station & physical ticket stub        │
│  • Create `salon-workflow-circuit.tsx` (5-node interactive queue pipeline)                  │
│  • Create `salon-services-marquee.tsx` (3D angled grooming combos)                          │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 5: Section Registry & Template Manifest Integration                                  │
│  • Register `workflow_circuit` and `services_marquee` in `SECTION_REGISTRY`                 │
│  • Update template manifests in `registry.ts`                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 6: Verification, Full Test Suites & Next.js Build                                     │
│  • Run `bun test apps/web/test` (Target: 100% passing)                                      │
│  • Run `bun test apps/api/test/landing-config.test.ts`                                      │
│  • Run `bun --cwd apps/web build` (Target: 73/73 routes compiled cleanly)                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 7: Knowledge Graph Sync & Milestone Checkpoint                                       │
│  • Run `graphify update .`                                                                  │
│  • Commit and tag `landing-engine-thematic-v3`                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Task Breakdown

### Phase 1: Git Rollback Checkpoint
- Tag current clean HEAD:
  ```bash
  git tag pre-thematic-2-5d-redesign
  ```

### Phase 2: TDD Test Suites
1. **`apps/web/test/container-scroll.test.tsx`:**
   - Test rendering of `ContainerScroll`, `Header`, and `Card` components.
   - Test mobile viewport resize and rotation clamping.
   - Test style declarations (`preserve-3d`, `perspective: 1000px`).
2. **`apps/web/test/salon-landing-thematic.test.tsx`:**
   - Test `Hero2Point5D` with authentic salon tokens (`Ramesh Traditional Barber`, `Pocket Ticket #104`, `Haircut + Beard Trim`, `PIN: 1234`).
   - Test `SalonWorkflowCircuit` with 5 operational nodes (`Door QR Stand`, `Bun Queue Engine`, `Chair Touchpad`, `WhatsApp Summon`, `Lobby TV Mirror`).
   - Test `SalonServicesMarquee` with grooming packages and pricing.

### Phase 3: Lightweight Component Primitives
- Add `container-scroll-animation.tsx` in `apps/web/components/ui/` using existing `framer-motion` (`useScroll`, `useTransform`).
- Add `3d-card.tsx` in `apps/web/components/ui/` using CSS perspective and context.
- Add `animated-beam.tsx` in `apps/web/components/ui/` using SVG path and gradient animations.
- Add `marquee.tsx` in `apps/web/components/ui/` supporting 3D perspective orientation.

### Phase 4: Salon Thematic Component Assembly
- Refactor `hero-2point5d.tsx`:
  - Integrate `ContainerScroll` so scrolling down unfolds the chair tablet.
  - Apply `3D Card` depth layers to ticket `#104`, scissors, and WhatsApp notification.
- Build `salon-workflow-circuit.tsx`:
  - 5 interactive nodes with animated light pulses connecting them.
  - Contextual tooltips explaining each salon touchpoint.
- Build `salon-services-marquee.tsx`:
  - Infinite angled carousel displaying authentic Indian grooming packages with prices and durations.

### Phase 5: Section Registry Integration
- Update `apps/web/components/landing/types.ts` with new section IDs: `'workflow_circuit'` and `'services_marquee'`.
- Register the components in `SECTION_REGISTRY` in `apps/web/components/landing/registry.ts`.
- Insert into the default `2_5D_SCROLL` template definition.

### Phase 6: Verification & Build
- Verify unit tests pass:
  ```bash
  bun test apps/web/test
  bun test apps/api/test/landing-config.test.ts
  ```
- Verify production Next.js build:
  ```bash
  bun --cwd apps/web build
  ```

### Phase 7: Knowledge Graph & Git Commit
- Update graphify:
  ```bash
  graphify update .
  ```
- Commit and tag `landing-engine-thematic-v3`.
