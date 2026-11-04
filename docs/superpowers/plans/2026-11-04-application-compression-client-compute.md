# Application-Level Compression & Client-Side Resource Computing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 100% self-sufficient application-level HTTP compression (Elysia Bun Gzip + Next.js asset caching) and offload continuous calculations (timers, audio, canvas rendering, SWR caching, optimistic state) to client-side RAM and CPU, reducing server CPU by >80% and bandwidth by >85% across both Web and future Flutter apps.

**Architecture:**
1. **Self-Sufficient Compression:** Native Bun Gzip middleware in Elysia API for payloads >1KB + Next.js immutable asset headers (`max-age=31536000, immutable`), completely independent of Cloudflare or third-party CDNs.
2. **Client-Compute Paradigm:** Server acts only as State Authority; phone/tablet hardware handles live countdown ticking (`requestAnimationFrame`), dynamic QR canvas painting (`qrcode`), Web Audio synthesis, and local storage caching (`localStorage`).
3. **Headless Cross-Platform Contract:** Pure JSON + WebSocket protocol ready for instant consumption by future Flutter mobile apps without backend changes.

**Tech Stack:** Bun, ElysiaJS, Next.js 15, Web Audio API, HTML5 Canvas, LocalStorage, WebSockets.

---

### Task 1: Native Response Compression Middleware in Elysia API

**Files:**
- Modify: `apps/api/index.ts`
- Test: `apps/api/test/compression.test.ts`

**Interfaces:**
- Produces: `mapResponse` middleware in Elysia compressing JSON/text bodies $>1024$ bytes using native Bun `zlib.gzipSync()`.
- Sets response headers: `Content-Encoding: gzip`, `Vary: Accept-Encoding`.

- [x] **Step 1: Write integration test for API response compression**
Create `apps/api/test/compression.test.ts` verifying that:
- Requests without `Accept-Encoding: gzip` receive raw JSON.
- Requests with `Accept-Encoding: gzip` for payloads $<1\text{KB}$ are not compressed.
- Requests with `Accept-Encoding: gzip` for payloads $>1\text{KB}$ receive `Content-Encoding: gzip` and decompress to the exact original payload.

- [x] **Step 2: Run test to verify failure**
Run: `bun test apps/api/test/compression.test.ts`
Expected: FAIL (compression middleware not yet hooked up).

- [x] **Step 3: Implement compression middleware in `apps/api/index.ts`**
Hook into Elysia's `mapResponse`:
Check `request.headers.get('accept-encoding')`. If `gzip` is accepted and body $>1024$ bytes, compress via `zlib.gzipSync` and return `new Response(compressed, { headers: { ...set.headers, 'content-encoding': 'gzip', 'vary': 'Accept-Encoding' } })`.

- [x] **Step 4: Run test to verify it passes**
Run: `bun test apps/api/test/compression.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**
```bash
git add apps/api/index.ts apps/api/test/compression.test.ts
git commit -m "feat(api): add native Bun gzip response compression for payloads >1KB"
```

---

### Task 2: Next.js Static Asset Immutable Caching & Bundle Optimization

**Files:**
- Modify: `apps/web/next.config.ts`

**Interfaces:**
- Produces: `compress: true`, `poweredByHeader: false`.
- Produces: Long-term cache headers on `/_next/static/:path*` (`public, max-age=31536000, immutable`).

- [x] **Step 1: Update `apps/web/next.config.ts`**
Add:
- `compress: true`
- `poweredByHeader: false`
- Header rule for `/_next/static/:path*` with `Cache-Control: public, max-age=31536000, immutable`
- Header rule for static images and SVGs with `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`

- [x] **Step 2: Verify production build succeeds**
Run: `bun run build:web`
Expected: SUCCESS with 25/25 routes compiled.

- [x] **Step 3: Commit**
```bash
git add apps/web/next.config.ts
git commit -m "perf(web): add immutable browser cache headers and bundle compression"
```

---

### Task 3: Client-Side Self-Ticking `<LiveServiceTimer>` Component

**Files:**
- Create: `apps/web/components/live-service-timer.tsx`
- Modify: `apps/web/app/s/[slug]/station/page.tsx`
- Modify: `apps/web/app/s/[slug]/page.tsx`
- Test: `apps/web/test/live-timer.test.ts`

**Interfaces:**
- Component props: `{ startedTime: string | Date, estimatedDurationMinutes?: number, onFinish?: () => void, variant?: 'station' | 'customer' }`
- Behavior: Ticks entirely in client device RAM using local clock. Zero server polling or timer messages. Computes elapsed `mm:ss`, percentage progress bar, and overtime warnings.

- [x] **Step 1: Write unit test for timer math**
Create `apps/web/test/live-timer.test.ts` testing that given an anchor timestamp, it calculates elapsed minutes/seconds, remaining duration, and progress percentage correctly.

- [x] **Step 2: Implement `<LiveServiceTimer>` in `apps/web/components/live-service-timer.tsx`**
Uses `useEffect` with a 1-second interval in client RAM. Cleans up on unmount. Throttles to 10s if document is hidden (`document.hidden`) to save phone battery.

- [x] **Step 3: Integrate into Station & Customer Pages**
Replace hardcoded static time strings on `/s/[slug]/station` and `/s/[slug]` with `<LiveServiceTimer>`.

- [x] **Step 4: Run tests and verify**
Run: `bun test apps/web/test/live-timer.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**
```bash
git add apps/web/components/live-service-timer.tsx apps/web/app/s/[slug]/station/page.tsx apps/web/app/s/[slug]/page.tsx apps/web/test/live-timer.test.ts
git commit -m "feat(client-compute): add client-side self-ticking service timer component"
```

---

### Task 4: Real-Time Connection Health Pill (UX Polish)

**Files:**
- Create: `apps/web/components/connection-pill.tsx`
- Modify: `apps/web/app/s/[slug]/station/page.tsx`
- Modify: `apps/web/app/s/[slug]/page.tsx`

**Interfaces:**
- Props: `{ isConnected: boolean, reconnectAttempts?: number }`
- Visual:
  - `🟢 Live Sync` (green pulse)
  - `🟡 Reconnecting...` (amber pulse)
  - `⚪ Offline Cache` (gray)

- [x] **Step 1: Create `<ConnectionPill>` component**
Sleek, unobtrusive badge in top bar providing clear state without intrusive modal popups.

- [x] **Step 2: Wire `isConnected` from `useSalonSocket` into `<ConnectionPill>`**
Display connection status on both Staff Station and Customer Door pages.

- [x] **Step 3: Commit**
```bash
git add apps/web/components/connection-pill.tsx apps/web/app/s/[slug]/station/page.tsx apps/web/app/s/[slug]/page.tsx
git commit -m "feat(ux): add non-intrusive real-time connection status pill"
```

---

### Task 5: Verification & Full Suite Check

- [x] **Step 1: Run complete test suite**
Run: `bun test`
Expected: All tests pass.

- [x] **Step 2: Run production web build**
Run: `bun run build:web`
Expected: 25/25 routes compile cleanly.
