# Modular Queue Engine & SaaS Background Worker Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modularize the queue engine into decoupled domain layers (state machine, routing algorithm, wait-time math) and implement a zero-cost, persistent, asynchronous background worker pipeline (MySQL-backed + in-memory event dispatch) for non-blocking notifications, midnight queue resets, and telemetry aggregation.

**Architecture:**
1. **Decoupled Queue Domain:** Pure state machine (`state-machine.ts`) and candidate selection engine (`routing.ts`) decoupled from database queries and network calls for testability and cross-platform Flutter reusability.
2. **Persistent SaaS Worker Queue:** Zero-cost MySQL `queue_jobs` table with in-memory execution loop handling async WhatsApp/SMS dispatches, exponential backoff retries, and dead-letter safety without blocking HTTP latency ($<5\text{ms}$ check-in response).
3. **Automated Maintenance Workers:** Background tasks for midnight queue auto-resets (clearing abandoned tickets and resetting ticket numbers) and daily revenue/stylist telemetry snapshots.

**Tech Stack:** Bun runtime, ElysiaJS, MySQL 8.0, TypeScript, WebSockets.

---

### Task 1: Background Job Worker Pipeline Core & DB Migrations

**Files:**
- Modify: `apps/api/src/db/mysql.ts` (add `queue_jobs` table)
- Create: `apps/api/src/worker/types.ts`
- Create: `apps/api/src/worker/job-queue.ts`
- Create: `apps/api/src/worker/handlers/notification.handler.ts`
- Test: `apps/api/test/worker-queue.test.ts`

**Interfaces:**
```ts
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type JobType = 'SEND_WHATSAPP' | 'SEND_SMS' | 'MIDNIGHT_RESET' | 'DAILY_TELEMETRY';

export interface QueueJob<T = any> {
  id: string;
  salonId?: string;
  type: JobType;
  payload: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  scheduledFor: string;
  createdAt: string;
  updatedAt: string;
}
```

- [x] **Step 1: Write integration test for worker job queue**
Create `apps/api/test/worker-queue.test.ts` verifying:
- Enqueueing a job persists it to database / queue.
- Job processor executes the registered handler.
- Failed job automatically increments `attempts` and retries with backoff.
- Exhausted retries mark job as `FAILED` with error log.

- [x] **Step 2: Run test to verify failure**
Run: `bun test apps/api/test/worker-queue.test.ts`
Expected: FAIL (worker queue not yet implemented).

- [x] **Step 3: Add `queue_jobs` table in `apps/api/src/db/mysql.ts`**
Add migration for `queue_jobs`:
- `id VARCHAR(36) PRIMARY KEY`
- `salon_id VARCHAR(36) NULL`
- `type VARCHAR(50) NOT NULL`
- `payload JSON NOT NULL`
- `status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING'`
- `attempts INT DEFAULT 0`
- `max_attempts INT DEFAULT 3`
- `last_error TEXT NULL`
- `scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
- `INDEX idx_jobs_pending (status, scheduled_for)`

- [x] **Step 4: Implement `jobQueue` in `apps/api/src/worker/job-queue.ts`**
Implement enqueueing, handler registration, processing loop, and retry backoff logic.

- [x] **Step 5: Implement `notification.handler.ts`**
Hook into `notificationService` to dispatch WhatsApp notifications asynchronously.

- [x] **Step 6: Run test to verify it passes**
Run: `bun test apps/api/test/worker-queue.test.ts`
Expected: PASS.

- [x] **Step 7: Commit**
```bash
git add apps/api/src/db/mysql.ts apps/api/src/worker/ apps/api/test/worker-queue.test.ts
git commit -m "feat(worker): implement persistent background job queue pipeline"
```

---

### Task 2: Modular Queue Domain State Machine & Routing Algorithms

**Files:**
- Create: `apps/api/src/engine/state-machine.ts`
- Create: `apps/api/src/engine/routing.ts`
- Test: `apps/api/test/queue-modular-domain.test.ts`

**Interfaces:**
```ts
// Pure functions with zero side effects:
export function canTransitionTicket(currentStatus: TicketStatus, targetStatus: TicketStatus): boolean;
export function validateTicketTransition(ticket: QueueTicket, targetStatus: TicketStatus): { allowed: boolean; reason?: string };

export function selectNextTicketCandidate(
  tickets: QueueTicket[],
  callingStylistId?: string,
  options?: { excludeTicketId?: string; preferWaiting?: boolean }
): QueueTicket | null;
```

- [x] **Step 1: Write unit tests for pure state machine and candidate routing**
Create `apps/api/test/queue-modular-domain.test.ts` verifying:
- Valid transitions (`WAITING` -> `SUMMONED`, `SUMMONED` -> `IN_CHAIR`, etc.).
- Invalid transitions (`COMPLETED` -> `WAITING`, `CANCELLED` -> `IN_CHAIR`) return `{ allowed: false }`.
- Stylist routing prioritization: Preferred stylist tickets prioritized before falling back to Universal Fast Line.

- [x] **Step 2: Run test to verify failure**
Run: `bun test apps/api/test/queue-modular-domain.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `state-machine.ts` and `routing.ts`**
Pure TypeScript functions without database or HTTP coupling.

- [x] **Step 4: Run test to verify it passes**
Run: `bun test apps/api/test/queue-modular-domain.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**
```bash
git add apps/api/src/engine/state-machine.ts apps/api/src/engine/routing.ts apps/api/test/queue-modular-domain.test.ts
git commit -m "feat(engine): modularize queue state machine and routing domain logic"
```

---

### Task 3: Integrate Worker Pipeline & Modular Domain into `queue-engine.ts`

**Files:**
- Modify: `apps/api/src/engine/queue-engine.ts`

**Interfaces:**
- Replace inline `await notificationService.sendWhatsApp` with non-blocking `jobQueue.enqueue('SEND_WHATSAPP', ...)`.
- Use `validateTicketTransition` and `selectNextTicketCandidate` inside `checkIn`, `callNext`, `seat`, `finishService`, and `softBump`.
- API responses complete in $<5\text{ms}$.

- [x] **Step 1: Update `queue-engine.ts`**
Integrate modular domain logic and asynchronous job enqueueing.

- [x] **Step 2: Run all queue tests to verify backward compatibility**
Run: `bun test apps/api/test/queue-engine.test.ts apps/api/test/consumer-staff-sync.test.ts apps/api/test/station-hold-callnext.test.ts`
Expected: PASS.

- [x] **Step 3: Commit**
```bash
git add apps/api/src/engine/queue-engine.ts
git commit -m "refactor(engine): wire modular domain and async notification worker"
```

---

### Task 4: Midnight Queue Auto-Reset & Stale Ticket Cleanup Worker

**Files:**
- Create: `apps/api/src/worker/handlers/reset.handler.ts`
- Test: `apps/api/test/midnight-reset-worker.test.ts`

**Interfaces:**
- Handler: `resetHandler.process({ salonId?: string, cutoffHours?: number })`
- Closes stale `WAITING` or `SUMMONED` tickets older than cutoff hours to `NO_SHOW` / `EXPIRED_NO_SHOW`.
- Broadcasts `QUEUE_UPDATED` event to connected clients.

- [x] **Step 1: Write test for midnight reset handler**
Create `apps/api/test/midnight-reset-worker.test.ts` verifying that tickets older than the daily cutoff are automatically marked as `NO_SHOW` and active queue count drops to 0.

- [x] **Step 2: Implement `reset.handler.ts`**
Add clean cancellation and reset logic.

- [x] **Step 3: Run test to verify it passes**
Run: `bun test apps/api/test/midnight-reset-worker.test.ts`
Expected: PASS.

- [x] **Step 4: Commit**
```bash
git add apps/api/src/worker/handlers/reset.handler.ts apps/api/test/midnight-reset-worker.test.ts
git commit -m "feat(worker): implement midnight queue reset and stale ticket cleanup handler"
```

---

### Task 5: Worker Telemetry & Admin Endpoints

**Files:**
- Modify: `apps/api/src/routes/admin.routes.ts`
- Test: `apps/api/test/admin-api.test.ts`

**Interfaces:**
- `GET /api/admin/workers/stats`: Returns worker throughput, active jobs, pending, completed, and failed counts.
- `POST /api/admin/workers/retry-failed`: Re-enqueues all failed jobs for another processing attempt.

- [x] **Step 1: Add worker telemetry endpoints to `apps/api/src/routes/admin.routes.ts`**
Expose worker queue health and retry controls.

- [x] **Step 2: Add test cases to `apps/api/test/admin-api.test.ts`**
Verify retrieval of worker telemetry and successful retry triggers.

- [x] **Step 3: Run test to verify it passes**
Run: `bun test apps/api/test/admin-api.test.ts`
Expected: PASS.

- [x] **Step 4: Commit**
```bash
git add apps/api/src/routes/admin.routes.ts apps/api/test/admin-api.test.ts
git commit -m "feat(admin): expose background worker telemetry and retry endpoints"
```

---

### Task 6: Full Verification & Complete Monorepo Test

- [x] **Step 1: Run complete test suite**
Run: `bun run test`
Expected: All 140+ tests pass cleanly.

- [x] **Step 2: Run production web build**
Run: `bun run build:web`
Expected: 25/25 routes compile cleanly.

- [x] **Step 3: Final commit & status check**
Verify clean git tree.
