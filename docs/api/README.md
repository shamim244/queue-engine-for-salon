# API & WebSocket Contract Specifications

This directory defines the headless API contracts for the **Engine Que System**. All REST endpoints and WebSocket protocols are headless and strictly adhere to pure JSON schemas, ensuring complete cross-platform parity across Web, Tablet Mirror Kiosks, and future Flutter Mobile applications.

---

## Documentation Index

| Specification | Purpose & Scope |
| :--- | :--- |
| [**websocket-protocol.md**](./websocket-protocol.md) | **Real-Time WebSocket Protocol**<br>• Room-based subscriptions (`salon:{salonId}`)<br>• Event payloads: `TICKET_CREATED`, `QUEUE_UPDATED`, `TICKET_SUMMONED`, `HEARTBEAT`<br>• Sub-3s automatic reconnect and backoff |
| **REST OpenAPI Contracts** | Accessible interactively at `http://localhost:3001/swagger` when the Bun backend is running. |

---

## Core Endpoint Catalog

### 1. Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate with username, phone, or email + password. Returns session token & user profile.
- `POST /api/auth/pin-login`: Rapid 4-digit PIN authentication for chair mirror tablets (`salonId`, `staffId`, `pin`).
- `GET /api/auth/me`: Resolve current active session profile, assigned salon branch, and organization.
- `POST /api/auth/logout`: Revoke active session token.

### 2. Salon Catalog (`/api/salons`)
- `GET /api/salons/:slug`: Retrieve cached salon storefront details, active stylists, services, and amenities.
- `POST /api/salons`: Onboard new salon branch under active organization.
- `PATCH /api/salons/:id`: Update salon profile, operating hours, and announcement.

### 3. Live Queue Engine (`/api/queue`)
- `GET /api/queue/active/:salonId`: Fetch active queue tickets with real-time wait estimations.
- `POST /api/queue/check-in`: Customer walk-in registration. Atomic sequence numbering.
- `POST /api/queue/summon`: Stylist summons next client to chairbay (soft-bumps absent clients).
- `POST /api/queue/start-service`: Mark ticket as `IN_CHAIR` / `IN_SERVICE`.
- `POST /api/queue/complete`: Conclude service with payment details (CASH or NPCI UPI).
- `POST /api/queue/hold`: Soft-bump client to 3-minute grace hold.
- `POST /api/queue/cancel`: Customer self-leave or stylist cancellation.

### 4. Platform Administration (`/api/admin`)
- `GET /api/admin/stats`: System-wide telemetry (active sockets, active chairs, queue volume).
- `GET /api/admin/settings` / `POST /api/admin/settings`: Platform SLAs, timezones, currency configurations.
- `GET /api/admin/tenants`: Multi-tenant organization and salon branch directory.
- `POST /api/admin/kill-switch`: Emergency platform or salon maintenance lockdown toggle.
