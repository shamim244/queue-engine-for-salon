# Engine Que System - Master Engineering Documentation Suite

> **The Definitive Source of Truth for the Engine Que Multi-Tenant Queue & Salon Management Platform.**

This directory contains the complete, organized product, architectural, operational, and development documentation suite for the **Engine Que System**. All specifications are structured into dedicated, modular folders for rapid developer onboarding and end-to-end execution.

---

## Master Documentation Structure

```
docs/
├── prd/          # Product Requirements, Personas, Features, UI Panels & Roadmap
├── trd/          # Technical Architecture, Headless Specs & Client-Compute Rules
├── api/          # REST OpenAPI Specifications & WebSocket Real-Time Protocols
├── database/     # MySQL 8.0/9.1 Relational Schema, ERD Diagrams & Indexes
├── adr/          # Architectural Decision Records (ADRs) & Trade-off Logs
└── guides/       # Quickstart Setup, Development Workflows & Runbooks
```

---

## Documentation Folders Index

| Folder | Core Scope & Key Documents |
| :--- | :--- |
| [**`docs/prd/`**](./prd/README.md) | **Product Requirements Documentation**<br>• [01_core_prd.md](./prd/01_core_prd.md): Vision, Problem Statements, Personas, Pricing<br>• [02_frontend_ui_spec.md](./prd/02_frontend_ui_spec.md): Specs for all 5 web operational surfaces<br>• [03_roadmap_and_milestones.md](./prd/03_roadmap_and_milestones.md): Multi-phase implementation roadmap |
| [**`docs/trd/`**](./trd/README.md) | **Technical Requirements Documentation**<br>• [01_system_architecture_tech_spec.md](./trd/01_system_architecture_tech_spec.md): Bun, Elysia, Queue State Machine, Soft-Bump<br>• [02_mobile_cross_platform_strategy.md](./trd/02_mobile_cross_platform_strategy.md): Headless API, Flutter parity, PWA offline cache<br>• [03_client_compute_and_performance_spec.md](./trd/03_client_compute_and_performance_spec.md): Zero server timers, Gzip compression, sub-50ms cache |
| [**`docs/api/`**](./api/README.md) | **API & WebSocket Specifications**<br>• [websocket-protocol.md](./api/websocket-protocol.md): Room broadcasts (`TICKET_SUMMONED`, `QUEUE_UPDATED`)<br>• Swagger Docs: `http://localhost:3001/swagger` |
| [**`docs/database/`**](./database/README.md) | **Database Architecture & Data Models**<br>• [schema-and-erd.md](./database/schema-and-erd.md): MySQL tables, Mermaid ERD, and composite indexes |
| [**`docs/adr/`**](./adr/README.md) | **Architectural Decision Records (ADRs)**<br>• [001-bun-and-elysia-runtime.md](./adr/001-bun-and-elysia-runtime.md): Why Bun + Elysia for sub-15ms throughput<br>• [002-client-compute-architecture.md](./adr/002-client-compute-architecture.md): Why client clocks over server timer loops<br>• [003-unified-subscription-plan-model.md](./adr/003-unified-subscription-plan-model.md): Unified model over SOLO vs MULTI code forks |
| [**`docs/guides/`**](./guides/README.md) | **Developer Guides & Runbooks**<br>• [developer-setup-and-runbook.md](./guides/developer-setup-and-runbook.md): Local startup, test runners, ports, routes |

---

## Core Engineering Principles

1. **Zero Server Timer Waste:** Continuous math and countdowns run exclusively on client hardware. The server is strictly an atomic state persistence authority.
2. **Unified Codebase:** 1-chair rural shops and 10-chair urban salons run the identical unified code, governed cleanly by subscription plan quotas.
3. **Headless Cross-Platform Parity:** All REST and WebSocket payloads remain pure JSON adhering to OpenAPI standards for immediate Flutter client readiness.
4. **End-to-End Real Implementation:** No shallow mockups or prototype placeholders. Every feature connects directly to persistent storage and verified live.
