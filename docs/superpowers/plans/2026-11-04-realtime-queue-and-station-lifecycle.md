# Real-Time Queue, Stylist Selection & Station Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate service loading latency with sub-50ms caching, implement Universal Fast Line vs. Preferred Barber selection, fix estimated wait time calculation, organize the staff station into a clear 4-stage lifecycle (Idle $\to$ Calling with "CHAIR" vs "WAIT/HOLD" $\to$ In-Chair $\to$ Checkout), and implement dynamic amount UPI QR code generation.

**Architecture:** 
1. **Caching & Delivery:** In-memory stale-while-revalidate repository cache on Elysia backend + frontend localStorage pre-warming to load salon catalogs under 50ms.
2. **Queue Engine:** Persist dynamic wait times to MySQL in `recalculateQueue()` and broadcast updates; support Universal Line (`stylistId: null`) vs. Preferred Stylist dispatching.
3. **Station State Machine:** Refactor Staff Station (`/s/[slug]/station`) into distinct, uncluttered operational states: Idle, Calling (`CHAIR` vs `WAIT`), In-Chair (live timer), and Checkout with dynamic UPI QR code generation via NPCI standard deep-links.

**Tech Stack:** ElysiaJS, Next.js 15 (React 19), MySQL 8.0, WebSockets, `qrcode` library, TailwindCSS.

**Spec:** User Operational Requirements from Live Testing on `web.nexgentech.site` (Points 1–6).

## Global Constraints
- Zero browser native `alert()` or `confirm()` dialogs; use existing accessible UI `<Dialog>` and toast banners.
- Preserve 100% test compatibility across the 109 automated tests.
- Support both mobile viewports (smartphones) and tablet/desktop viewports on the mirror station.
- NPCI UPI QR standard: `upi://pay?pa=<UPI_ID>&pn=<SALON_NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>`.

## Review Focus
1. First ticket in queue with empty chairs must show a realistic minimal wait (~2-5m chair prep) rather than 0m when someone is walking in.
2. If customer stepped out ("WAIT"), ticket must remain at the top of the queue with a `SOFT_BUMPED` badge while the next client is summoned.
3. If salon has no custom UPI ID set, fallback gracefully to salon phone UPI (e.g. `<phone>@upi`) or cash checkout.
4. When switching between Universal Line and Specific Barber, the estimated wait time must reflect the selected choice accurately.
5. In-memory cache must immediately invalidate whenever salon services or stylists are created, updated, or deleted.

---

### Task 1: Sub-50ms Salon Catalog & Services Caching (Backend & Frontend)

**Files:**
- Modify: `apps/api/src/db/repository.ts`
- Modify: `apps/web/app/s/[slug]/page.tsx`
- Test: `apps/api/test/cache-performance.test.ts`

**Interfaces:**
- Produces: `repository.getSalonBySlug(slug: string, options?: { skipCache?: boolean }): Promise<Salon | null>` with in-memory TTL caching.
- Produces: Cache invalidator `repository.invalidateSalonCache(salonIdOrSlug: string): void`.
- Frontend: Pre-warms `localStorage.getItem('salon_cache_' + slug)` on initial render so services show up in <10ms.

- [ ] **Step 1: Write unit test for salon repository caching & invalidation**
Create `apps/api/test/cache-performance.test.ts` verifying that repeated calls to `getSalonBySlug` hit cache without re-querying MySQL, and that adding/updating services invalidates cache immediately.

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test apps/api/test/cache-performance.test.ts`
Expected: FAIL (cache methods and TTL not implemented yet).

- [ ] **Step 3: Implement in-memory cache with TTL and invalidation in `repository.ts`**
Add an in-memory `Map<string, { salon: Salon; cachedAt: number }>` with 60-second TTL.
Invalidate entry on `addService`, `deleteService`, `updateSalon`, `createSalon`, `updateStylistPreference`.

- [ ] **Step 4: Update `apps/web/app/s/[slug]/page.tsx` with Stale-While-Revalidate local cache**
Read from `localStorage.getItem('salon_cache_' + slug)` on component mount to populate `salon` state immediately. Fetch latest from API in background and update cache silently.

- [ ] **Step 5: Run tests and verify performance**
Run: `bun test apps/api/test/cache-performance.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/db/repository.ts apps/api/test/cache-performance.test.ts apps/web/app/s/[slug]/page.tsx
git commit -m "perf(cache): add in-memory salon caching and client SWR pre-warming"
```

---

### Task 2: Stylist Selection — Universal Fast Line vs. Preferred Barber

**Files:**
- Modify: `apps/web/app/s/[slug]/page.tsx`
- Modify: `apps/api/src/engine/queue-engine.ts`
- Test: `apps/api/test/stylist-preference-queue.test.ts`

**Interfaces:**
- Check-in payload: `stylistId: string | null` (`null` = Universal Fast Line).
- Dispatch logic: When stylist calls next client, `queueEngine.callNext(salonId, stylistId)` prioritizes tickets matching `t.stylistId === stylistId`, then falls back to Universal tickets (`t.stylistId === null`).

- [ ] **Step 1: Write integration test for Universal vs Preferred Stylist queue ordering**
Create `apps/api/test/stylist-preference-queue.test.ts` testing that:
1. Customer A chooses Universal Line (`stylistId = null`).
2. Customer B chooses Rahul (`stylistId = 'stylist-rahul'`).
3. If Rahul calls next, Customer B is called first if preferred, or Customer A is called if earlier and universal.

- [ ] **Step 2: Run test to verify queue behavior**
Run: `bun test apps/api/test/stylist-preference-queue.test.ts`
Expected: Verify current vs expected matching behavior.

- [ ] **Step 3: Update `queueEngine.callNext` in `apps/api/src/engine/queue-engine.ts`**
Refine candidate selection:
Find waiting tickets where `t.stylistId === stylistId` OR `t.stylistId === null` (Universal), ordered by `checkInTime ASC`.

- [ ] **Step 4: Redesign Stylist Selection UI on `apps/web/app/s/[slug]/page.tsx`**
Replace the hidden `<select>` dropdown with a card-based toggle:
- Card 1: **⚡ Universal Fast Line** ("Fastest Available Chair - Jump in whichever barber opens first")
- Card 2..N: **✂️ Preferred Barbers** (shows barber name, active status, pace duration).
Ensure it is always visible and defaulted to Universal Fast Line.

- [ ] **Step 5: Run tests and verify**
Run: `bun test apps/api/test/stylist-preference-queue.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/engine/queue-engine.ts apps/api/test/stylist-preference-queue.test.ts apps/web/app/s/[slug]/page.tsx
git commit -m "feat(queue): implement universal fast line vs preferred barber selection"
```

---

### Task 3: Fix Estimated Wait Time Calculation & MySQL Persistence

**Files:**
- Modify: `apps/api/src/engine/queue-engine.ts`
- Modify: `apps/api/src/engine/wait-time.ts`
- Modify: `apps/api/src/db/repository.ts`
- Modify: `apps/web/app/s/[slug]/page.tsx`
- Modify: `apps/web/app/me/page.tsx`
- Test: `apps/api/test/wait-time-calc.test.ts`

**Interfaces:**
- Produces: `repository.updateTicketWaitTime(ticketId: string, estimatedMinutes: number): Promise<void>`
- MySQL query: `UPDATE queue_tickets SET estimated_wait_minutes = ? WHERE id = ?`

- [ ] **Step 1: Write test for wait time calculation & database persistence**
Create `apps/api/test/wait-time-calc.test.ts` ensuring that after creating 3 tickets, `ticket.estimatedWaitMinutes` is calculated, stored in MySQL, and returned on `getTicketById` and `getActiveTickets`.

- [ ] **Step 2: Run test to verify failure**
Run: `bun test apps/api/test/wait-time-calc.test.ts`
Expected: FAIL (MySQL wait time currently remains 0).

- [ ] **Step 3: Implement `updateTicketWaitTime` in `repository.ts`**
Add repository method executing:
`UPDATE queue_tickets SET estimated_wait_minutes = ? WHERE id = ?`

- [ ] **Step 4: Update `recalculateQueue()` in `apps/api/src/engine/queue-engine.ts`**
In the loop over `activeTickets`, persist `calc.estimatedMinutes` to MySQL via `repository.updateTicketWaitTime(ticket.id, calc.estimatedMinutes)`.
For position 1 with available chair, calculate ~3-5m buffer rather than 0m so clients know to get ready.

- [ ] **Step 5: Update Frontend Wait Time Display on `/s/[slug]` and `/me`**
Add fallback computation on frontend:
`const displayWait = myTicket.estimatedWaitMinutes > 0 ? myTicket.estimatedWaitMinutes : Math.max(5, peopleAhead * 15);`
Ensures customer never sees 0 minutes when multiple people are ahead.

- [ ] **Step 6: Run tests and verify**
Run: `bun test apps/api/test/wait-time-calc.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/engine/queue-engine.ts apps/api/src/engine/wait-time.ts apps/api/src/db/repository.ts apps/web/app/s/[slug]/page.tsx apps/web/app/me/page.tsx apps/api/test/wait-time-calc.test.ts
git commit -m "fix(engine): persist calculated wait times to MySQL and ensure realistic estimates"
```

---

### Task 4: Station State Machine — "CHAIR" vs "WAIT / HOLD" & Direct Summon

**Files:**
- Modify: `apps/api/src/routes/queue.routes.ts`
- Modify: `apps/api/src/engine/queue-engine.ts`
- Modify: `apps/web/app/s/[slug]/station/page.tsx`
- Test: `apps/api/test/station-hold-callnext.test.ts`

**Interfaces:**
- Produces: `POST /api/queue/hold-and-call-next`
  - Body: `{ salonId: string, currentTicketId: string, stylistId?: string }`
  - Action: Sets `currentTicketId` to `SOFT_BUMPED` (holding spot, grace hold) and calls the next waiting ticket to chair in one atomic step.
- Frontend: Waiting list cards gain 1-tap **"Call to Chair"** button so barber can summon any specific client directly.

- [ ] **Step 1: Write test for Hold & Call Next endpoint**
Create `apps/api/test/station-hold-callnext.test.ts` testing that calling `hold-and-call-next` with Ticket #101 marks #101 as `SOFT_BUMPED` and immediately summons Ticket #102.

- [ ] **Step 2: Run test to verify failure**
Run: `bun test apps/api/test/station-hold-callnext.test.ts`
Expected: FAIL (endpoint not created yet).

- [ ] **Step 3: Implement `holdAndCallNext` in `queueEngine` and route in `queue.routes.ts`**
Atomically:
1. `queueEngine.softBump(currentTicketId)`
2. `queueEngine.callNext(salonId, stylistId)`
Returns both the bumped ticket and newly summoned ticket.

- [ ] **Step 4: Update Station Calling UI on `/s/[slug]/station`**
When a client is summoned, display two prominent actions:
1. **`💺 In Chair (Customer Arrived)`** -> Calls `/api/queue/seat`.
2. **`⏳ WAIT (Not Here Yet - Hold Spot & Call Next)`** -> Calls `/api/queue/hold-and-call-next`.
In Waiting Clients list, add a 1-tap **"Call"** button on each card for manual pick.

- [ ] **Step 5: Run tests and verify**
Run: `bun test apps/api/test/station-hold-callnext.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/routes/queue.routes.ts apps/api/src/engine/queue-engine.ts apps/web/app/s/[slug]/station/page.tsx apps/api/test/station-hold-callnext.test.ts
git commit -m "feat(station): implement CHAIR vs WAIT hold-and-call-next workflow"
```

---

### Task 5: Organized In-Chair Workspace & Checkout Screen

**Files:**
- Modify: `apps/web/app/s/[slug]/station/page.tsx`
- Test: Manual UI validation & unit test check

**Interfaces:**
- State: `IN_CHAIR` shows only service in progress, client name, ticket #, elapsed timer, and a single prominent button **"Complete Service -> Proceed to Payment"**.
- State: `CHECKOUT` modal / view unlocks the bill editor and payment options (Cash vs. UPI).

- [ ] **Step 1: Refactor station `currentlyServing` UI into In-Chair Workspace**
Remove the inline checkout and cash/UPI buttons from the active chair card.
Display clean service card:
- Client Name & Ticket #
- Service Name & Add-ons
- Live Elapsed Timer (`mm:ss`)
- Primary button: **"✅ Complete Service -> Proceed to Payment"**

- [ ] **Step 2: Create Checkout Panel State**
Clicking "Complete Service" transitions to the Checkout Panel / Dialog:
- Editable Final Bill (`₹[amount]`)
- Two clear payment methods: **Cash** vs **Online UPI QR**.

- [ ] **Step 3: Verify state transition in station**
Ensure completing service does not clear the chair until payment is confirmed (Cash or UPI).

- [ ] **Step 4: Commit**
```bash
git add apps/web/app/s/[slug]/station/page.tsx
git commit -m "feat(station): separate in-chair active service from checkout panel"
```

---

### Task 6: Dynamic Amount UPI QR Code Generation

**Files:**
- Modify: `apps/web/app/s/[slug]/station/page.tsx`
- Modify: `apps/web/lib/utils.ts`
- Test: `apps/web/test/upi-qr.test.ts`

**Interfaces:**
- Produces: `generateUpiUri(params: { upiId: string, payeeName: string, amount: number, note?: string }): string`
- Produces: Dynamic QR code rendered using `QRCode.toDataURL(upiUri)` when UPI payment is selected.

- [ ] **Step 1: Write unit test for UPI URI generator**
Create `apps/web/test/upi-qr.test.ts` verifying that `generateUpiUri({ upiId: 'royal@upi', payeeName: 'Royal Salon', amount: 150, note: 'Ticket #101' })` conforms to NPCI standard:
`upi://pay?pa=royal@upi&pn=Royal%20Salon&am=150.00&cu=INR&tn=Ticket%20%23101`.

- [ ] **Step 2: Run test to verify failure**
Run: `bun test apps/web/test/upi-qr.test.ts`
Expected: FAIL (helper not defined).

- [ ] **Step 3: Implement `generateUpiUri` in `apps/web/lib/utils.ts`**
Format parameters into standard NPCI UPI URI with proper URI encoding and 2-decimal amount.

- [ ] **Step 4: Integrate Dynamic QR display in Checkout Dialog on Station**
When barber selects "Online UPI", render a large, scannable QR code using `QRCode.toDataURL(upiUri)`:
- Prominently displays: "Scan & Pay ₹[editableBill]"
- Shows Salon UPI ID & Customer Name
- Primary button: **"✅ Payment Received (Confirm & Free Chair)"** -> calls `/api/queue/finish` with `paymentStatus: 'ONLINE_PAID'` and `paymentAmount: editableBill`.

- [ ] **Step 5: Run tests and verify**
Run: `bun test apps/web/test/upi-qr.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add apps/web/lib/utils.ts apps/web/app/s/[slug]/station/page.tsx apps/web/test/upi-qr.test.ts
git commit -m "feat(payment): implement dynamic amount UPI QR code generation for station checkout"
```

---

### Task 7: Full Verification & Live Test Run

**Files:**
- All modified files
- Verification commands

- [ ] **Step 1: Run complete test suite**
Run: `bun test`
Expected: All tests pass (109 existing + new tests).

- [ ] **Step 2: Run Next.js production build**
Run: `bun run build:web`
Expected: Build succeeds with 0 errors across all routes.

- [ ] **Step 3: End-to-end integration test with live API**
Verify:
1. Customer check-in with Universal Line vs Stylist Preference.
2. Estimated wait time non-zero in database.
3. Barber calls next, selects "WAIT" (hold) -> ticket #1 holds spot, ticket #2 is called.
4. Barber completes service -> Checkout modal opens with dynamic UPI QR.
5. Payment confirmed -> Chair resets to idle.
