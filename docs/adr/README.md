# Architectural Decision Records (ADR) Index

This directory captures significant architectural, technical, and structural decisions made across the lifecycle of the **Engine Que System**.

---

## Records Directory

| Record | Title | Status | Context & Rationale |
| :--- | :--- | :--- | :--- |
| [**001**](./001-bun-and-elysia-runtime.md) | **Bun Runtime & ElysiaJS Backend** | `Accepted` | Selected Bun v1.4.3 + ElysiaJS over Node.js/Express for microsecond response times (<15ms ticket check-ins) and native WebSocket clustering. |
| [**002**](./002-client-compute-architecture.md) | **Zero Server Timers & Client Hardware Offloading** | `Accepted` | Strict rule prohibiting background ticking timer loops on the server. Clients render live clocks from anchor timestamps (`started_time`). |
| [**003**](./003-unified-subscription-plan-model.md) | **Unified Salon Model vs Solo/Multi Codebase Branching** | `Accepted` | Eliminated separate SOLO vs MULTI code forks. 1-chair rural shops and 10-chair urban salons run the identical unified codebase governed by subscription tier quotas (`maxBranches`, `maxStylistsPerBranch`). |
