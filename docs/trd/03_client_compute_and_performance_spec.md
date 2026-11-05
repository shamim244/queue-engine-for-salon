# Technical Requirements Document (TRD): Client-Compute, Performance & Architecture

**Document Version:** 2.0.0  
**Scope:** Performance Mandates, Client-Compute Architecture, Response Optimization & Storage  
**Target Runtime:** Bun v1.4.3 | ElysiaJS | MySQL 8.0/9.1 | Next.js 15 App Router | Flutter Mobile  

---

## 1. Zero Server Waste & Client Hardware Offloading (Core Mandate)
- **Role of the Backend:** The Elysia/Bun server + MySQL database is strictly an **Atomic State Authority and Persistence Layer**.
- **No Server Timer Loops:** Never run continuous loops, synthetic countdown intervals, or recurring ticking tasks on the server to update wait times or elapsed service durations.
- **Client Device Offloading:** Always delegate continuous math and rendering to the client's local RAM and CPU (mobile phones, salon tablets, desktop reception, lobby TVs):
  - **Live Service Timers:** Run in-memory client clocks (`requestAnimationFrame` or `setInterval`) calculating elapsed and remaining times from anchor timestamps (`started_time`, `created_at`).
  - **Dynamic QR Code Generation:** Render NPCI-compliant UPI QR codes client-side onto HTML5 `<canvas>` using `qrcode` or inline SVGs. The server only validates and stores transaction references.
  - **Audio Synthesis:** Generate call chimes and alert sounds client-side using the browser Web Audio API (`AudioContext`) without streaming audio files from the server.
  - **Optimistic State & Client Cache:** Cache salon catalogs and static metadata in client RAM / `localStorage` / SWR to eliminate redundant database roundtrips.

---

## 2. Self-Sufficient Application Compression & Caching
- **No Proxy Dependency:** Cloudflare is utilized strictly as a network tunnel (`cloudflared`). The application itself must be 100% self-sufficient for compression, caching, and payload optimization.
- **API Response Compression:** All Elysia API responses $>1\text{KB}$ (`1024` bytes) must be compressed with native Gzip (`Bun.gzipSync` / `Content-Encoding: gzip`, `Vary: Accept-Encoding`) whenever the client sends `Accept-Encoding: gzip`.
- **Static Asset Immutable Headers:** Next.js static bundles (`/_next/static/:path*`) must be served with immutable cache headers (`Cache-Control: public, max-age=31536000, immutable`).
- **Sub-50ms Catalog Caching:** Catalog and salon details must be cached in backend memory with TTL (60s) and immediate invalidation on mutation to deliver sub-50ms responses.

---

## 3. Headless Cross-Platform & Flutter Readiness
- **Headless API Contracts:** All REST endpoints and WebSocket payloads must remain clean, predictable, pure JSON adhering to OpenAPI/Swagger standards.
- **Zero Web Coupling:** Never couple backend logic or response schemas to web-specific or browser-specific constraints.
- **Mobile/Flutter Architecture:** The client-compute paradigm applies equally to future Flutter mobile/tablet applications, which will consume the same REST/WebSocket endpoints and run local timers/chimes natively on mobile hardware.

---

## 4. User Experience & Reliability
- **Zero Browser Dialogs:** Never use browser-blocking `alert()` or `confirm()` dialogs. Use accessible, non-blocking UI components (modals, sheets, toast notifications).
- **Non-Intrusive Connection States:** Display live connection health via unobtrusive UI indicators (`🟢 Live Sync`, `🟡 Reconnecting`, `⚪ Offline Cache`).
- **Low-Bandwidth Resilience:** Design for rural Indian salon environments where 4G/3G connections fluctuate. Ticket state and salon catalogs must remain viewable offline from local client cache.
