# Engine Que System - Master Documentation Suite

> **The Definitive Source of Truth for the Engine Que Multi-Tenant Queue & Salon Management Platform.**

This directory contains the complete product, architectural, operational, and roadmap specifications for the **Engine Que System**. Any new engineer, product manager, or AI assistant can read these documents to understand every architectural decision, business rule, and technical pattern established for this project.

---

## Documentation Index

| File | Purpose | Key Topics Covered |
|---|---|---|
| [**01_PRODUCT_REQUIREMENTS_DOCUMENT_(PRD).md**](./01_PRODUCT_REQUIREMENTS_DOCUMENT_(PRD).md) | **Product Requirements & Business Strategy** | Problem statement, Dual-Mode paradigm (Rural Solo vs Modern Multi-Station), User Personas, Feature Matrix, Business Model & Subscription Tiers, Monetization Streams, Devil's Advocate mitigations. |
| [**02_SYSTEM_ARCHITECTURE_AND_TECH_SPEC.md**](./02_SYSTEM_ARCHITECTURE_AND_TECH_SPEC.md) | **Technical Architecture & Engineering Spec** | Decoupled Hybrid Architecture (Bun + Elysia backend + Next.js 15 frontend), MySQL schema & ERD, WebSocket protocol, Auth & Session Matrix, 4-Digit Quick PIN Keypad, and the Walk-in + Appointment Interleaving Algorithm. |
| [**03_MOBILE_AND_CROSS_PLATFORM_STRATEGY.md**](./03_MOBILE_AND_CROSS_PLATFORM_STRATEGY.md) | **Mobile & Hardware Integration Blueprint** | PWA vs Flutter vs React Native decision matrix, Shared Mirror Tablet UX, Lobby TV constraints, Bluetooth thermal printer POS support, and offline resilience. |
| [**04_EXECUTION_ROADMAP_AND_MILESTONES.md**](./04_EXECUTION_ROADMAP_AND_MILESTONES.md) | **Project Roadmap & Implementation Phases** | Current status (Phase 1 & 1.5 Complete), Phase 2 Next.js Web Portals, Phase 3 Appointment Booking Engine, Phase 4 Native Mobile App, and Phase 5 Vertical Expansion (Clinics, Restaurants). |
| [**05_FRONTEND_UI_PANELS_SPECIFICATION.md**](./05_FRONTEND_UI_PANELS_SPECIFICATION.md) | **Frontend UI Panels & Component Specification** | Comprehensive breakdown of the 6 core panels: Super Admin, Salon Owner Hub, Staff Preferences, Staff Chair Working Station (with 4-digit PIN), Customer Live Queue / TV, and Customer Profile & History Portal. |

---

## Core Principles to Never Forget

1. **Dual-Mode Operational Reality:**
   * Never sacrifice the **Rural Solo-Barber** (Ramesh: no receptionist, no TV, cash & flexible pricing, wet/dirty hands, shared mirror tablet) for the sake of the **Modern Multi-Station Salon** (Aura: reception desk, TV departure board, online UPI payments, fixed pricing). The system MUST natively support both without code forks.
2. **Headless API-First Architecture:**
   * The core queue state machine, wait-time prediction, sessions, and WebSocket broadcasts run on **Bun v1.4.3 + ElysiaJS** for microsecond performance (<15ms ticket turnaround).
   * The rich management dashboards (SuperAdmin, Salon Owner, Multi-Station Desk) run on **Next.js 15 + Tailwind CSS + shadcn/ui** to maximize development velocity and eliminate raw DOM boilerplate.
   * Future Android mobile apps (Flutter) will connect to the exact same REST & WebSocket endpoints without touching backend code.
3. **Frictionless Customer Door Check-In:**
   * Customers standing outside on 2G/3G networks must NEVER be blocked by mandatory app downloads, account creation, or password setups. Scan QR $\to$ Pick Service $\to$ Instant Ticket issued in $<3$ seconds.
4. **Zero-Trust Stateful Sessions with 4-Digit Quick PIN:**
   * Stylists on shared mirror tablets authenticate with a rapid **4-digit PIN on a touch numpad** in $<200\text{ms}$.
   * Salon owners maintain an instant **Emergency Kill-Switch** (`revokeAllUserSessions`) to instantly revoke all active logins for any compromised or terminated staff member.
5. **Dynamic Zero-Downtime Subscription Tiers:**
   * `SOLO` (1 branch, 1 stylist), `PRO` (3 branches, 10 stylists/branch), `ENTERPRISE` (unlimited). Upgrading or downgrading dynamically adjusts limits without locking tables or interrupting active customer queues.
