# Technical Requirements Documentation (TRD) Index

Welcome to the Technical Requirements Documentation directory for the **Engine Que System for Salons**.

---

## Document Directory

| Document | Purpose & Description |
| :--- | :--- |
| [**01_system_architecture_tech_spec.md**](./01_system_architecture_tech_spec.md) | **System Architecture & Technical Specifications**<br>• Core Architectural Topology: Bun v1.4.3 runtime, ElysiaJS REST API, WebSocket Room Dispatch, MySQL 8.0/9.1 schema<br>• Queue State Machine (WAITING, SUMMONED, IN_CHAIR, SOFT_BUMPED, COMPLETED)<br>• Anti-Starvation & Soft-Bump Algorithm<br>• Dynamic Wait Time Formula & Barber Pacing Variance<br>• OpenAPI / Swagger Documentation Contracts |
| [**02_mobile_cross_platform_strategy.md**](./02_mobile_cross_platform_strategy.md) | **Mobile & Headless Cross-Platform Architecture**<br>• Headless API-first contracts for Web & Flutter Mobile / Tablet clients<br>• PWA offline caching strategy for rural 3G/4G connectivity<br>• Zero browser-blocking dialogs, non-intrusive connection indicators (`🟢 Live Sync`, `🟡 Reconnecting`, `⚪ Offline Cache`) |
| [**03_client_compute_and_performance_spec.md**](./03_client_compute_and_performance_spec.md) | **Client-Compute & Performance Optimization Mandates**<br>• Zero Server Timer Loops mandate (clients calculate elapsed/remaining durations from anchor timestamps)<br>• Native Gzip response compression for all responses $>1\text{KB}$<br>• In-memory catalog caching with 60s TTL and immediate mutation purge<br>• Client-side NPCI-compliant UPI QR canvas rendering and Web Audio API chime synthesis |

---

## Upstream References

For architectural decision records and tech stack details, refer to the parent workspace:
- [`tech/architecture/`](file:///v:/salon/tech/architecture)
- [`tech/decisions/`](file:///v:/salon/tech/decisions)
- [`tech/stack/`](file:///v:/salon/tech/stack)
