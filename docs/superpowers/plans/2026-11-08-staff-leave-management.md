# Staff Leave Management & Queue Absence Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, end-to-end staff leave management and late-detected absence queue recovery system that prevents stranded customer queues, provides 1-tap reassignments, accurately recalculates wait times, and prevents absent stylists from being selected at check-in.

**Architecture:** 
1. Relational schema in MySQL (`staff_leaves`) with in-memory TTL caching in Elysia/Bun.
2. Queue engine absence recovery protocol that either converts stranded tickets to Universal Fast Line (preserving strict FIFO seniority) or reassigns them to an active colleague.
3. Owner and Station absence modals with automatic WhatsApp/SMS notifications and public storefront booking guards for absent stylists.

**Tech Stack:** Bun, Elysia, TypeScript, TypeBox, MySQL 8.0, Next.js 16 (App Router), Tailwind CSS, shadcn/ui.

**Spec:** Handles two real-world salon situations:
- **Situation 1 (Planned Leave):** Staff applies for leave or owner marks future/today leave; absent staff is excluded from chair capacity and disabled in customer booking.
- **Situation 2 (Late-Detected Absence with Stranded Queue):** Staff was marked active but didn't show up. Customers already queued for them. Owner/barber marks them absent; system detects affected tickets and 1-tap shifts them to the Universal Fast Line or reassigns them to another barber without losing arrival seniority.

## Global Constraints
- **Zero Server Waste:** No server polling loops. Recalculation is event-driven and broadcast via WebSockets.
- **Strict FIFO Seniority:** When moving a ticket from an absent stylist to the Universal Fast Line, the original `checkInTime` and ticket sequence must be strictly preserved.
- **Android Mobile-First:** Touch targets >= 48px, thumb reach friendly, no horizontal cutoffs.
- **Documentation Integrity:** Preserve all existing docstrings, schemas, and repo patterns.

## Review Focus
1. What if a stylist who is marked on leave already has a ticket in `SUMMONED` or `IN_CHAIR` state? (Must gracefully soft-bump or complete without breaking queue state machine).
2. What if all stylists in a salon are on leave? (Virtual chair fallback maintains non-zero wait calculation).
3. What if a customer whose ticket was reassigned opens their pocket tracker? (Pocket tracker displays a reassuring notification that their seniority was preserved).
4. What if the owner switches an on-leave stylist back to active? (Queue recalculates with restored chair capacity).
5. What if concurrent check-ins occur during absence reassignment? (Per-salon coalescing mutex prevents race conditions).

---

## Tasks

### Task 1: Database Schema & In-Memory Store
- [x] Create `staff_leaves` table in `apps/api/src/db/mysql.ts` with columns: `id`, `salon_id`, `stylist_id`, `leave_date`, `end_date`, `reason`, `status`, `applied_by`, `created_at`, `updated_at`.
- [x] Add `staffLeaves` map to `memoryStore` in `apps/api/src/db/repositories/store.ts`.
- [x] Run `bun -e` script to verify table creation in MySQL `engine_que_salon`.

### Task 2: Repository & Queue Engine Absence Handlers
- [x] In `apps/api/src/db/repositories/stylist.repo.ts`:
  - Implement `getStaffLeaves(salonId: string, options?: { stylistId?: string; date?: string })`.
  - Implement `createStaffLeave(params: { salonId: string; stylistId: string; leaveDate: string; endDate?: string; reason?: string; status?: string; appliedBy?: string })`.
  - Implement `updateStaffLeaveStatus(leaveId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED')`.
  - Implement `isStylistOnLeave(stylistId: string, dateStr?: string): Promise<boolean>`.
  - Implement `handleStaffAbsenceRecovery(params: { salonId: string; stylistId: string; action: 'UNIVERSAL_FAST_LINE' | 'REASSIGN_STYLIST'; targetStylistId?: string })`:
    - Queries all active tickets (`WAITING`, `SOFT_BUMPED`, `SUMMONED`) for `stylistId`.
    - If `UNIVERSAL_FAST_LINE`: updates `stylistId = null`.
    - If `REASSIGN_STYLIST`: updates `stylistId = targetStylistId`.
    - If `SUMMONED`: updates status to `SOFT_BUMPED` to prevent chair conflicts.
    - Sets stylist `isActive = false`.
    - Triggers `queueEngine.recalculateQueue(salonId)`.
    - Dispatches WhatsApp alerts to all affected customers via `jobQueue.enqueue`.
- [x] In `apps/api/src/engine/routing.ts`:
  - Update `selectNextTicketCandidate` so active barbers can take over tickets if their preferred stylist is marked inactive/absent.
- [x] Export repository methods in `apps/api/src/db/repositories/index.ts`.

### Task 3: Backend API Endpoints (Elysia)
- [x] In `apps/api/src/routes/salon.routes.ts`:
  - Add `GET /api/salons/:salonId/staff-leaves` to retrieve leave records.
  - Add `POST /api/salons/:salonId/staff-leaves` to add/apply for a leave.
  - Add `PATCH /api/salons/:salonId/staff-leaves/:leaveId` to update leave status.
  - Add `GET /api/salons/:salonId/stylists/:stylistId/stranded-tickets` to count waiting/summoned tickets for a stylist before marking absent.
  - Add `POST /api/salons/:salonId/staff-leaves/handle-absence` to execute 1-tap absence recovery.

### Task 4: Frontend API Client
- [x] In `apps/web/lib/api.ts`:
  - Add TypeScript interfaces: `StaffLeave`, `StaffAbsencePayload`.
  - Add methods under `api.salons`:
    - `getStaffLeaves: (salonId: string, date?: string) => Promise<{ success: boolean; leaves: StaffLeave[] }>`
    - `addStaffLeave: (salonId: string, data: any) => Promise<{ success: boolean; leave: StaffLeave }>`
    - `getStylistStrandedTickets: (salonId: string, stylistId: string) => Promise<{ success: boolean; count: number; tickets: Ticket[] }>`
    - `handleStaffAbsence: (salonId: string, data: StaffAbsencePayload) => Promise<{ success: boolean; affectedCount: number; message: string }>`

### Task 5: Owner Panel - Leave & Attendance UI
- [x] Create `apps/web/components/owner/staff/staff-absence-recovery-modal.tsx`:
  - Modal that pops up when marking a stylist absent who has active waiting customers.
  - Displays count of affected clients.
  - Radio options:
    - "Move to Universal Fast Line (Next Available Barber)" [Recommended]
    - "Reassign to another barber" (Dropdown of available working stylists)
  - Shows preview of automated customer WhatsApp/SMS reassurance message.
  - Confirm button with loading state and haptic feedback.
- [x] In `apps/web/components/owner/staff/staff-roster-card.tsx`:
  - Add quick status toggle / badge: `🟢 On Duty` vs `🏖️ On Leave Today`.
  - Add "Mark On Leave / Absent" button that opens `StaffAbsenceRecoveryModal`.
- [x] Add "Staff Leave Calendar & Requests" section in `apps/web/app/owner/staff/page.tsx` for planned leaves.

### Task 6: Staff Panel - Leave Application
- [x] In `apps/web/app/staff/preferences/page.tsx`:
  - In Tab 1 ("General Profile & Pace"), add "Leave & Absence Management" card:
    - View upcoming approved leaves.
    - 1-tap "Request Leave / Mark Emergency Leave" button with date picker and reason.

### Task 7: Customer Queue Booking Guard
- [x] In `apps/web/components/queue/queue-walkin-form.tsx` and `queue-helpers.ts`:
  - Check whether a stylist is on leave today.
  - If on leave, disable the barber selection button with a prominent badge: `🏖️ On Leave Today`.
  - Display helpful tooltip/note: "This stylist is currently on leave. Please select another barber or choose Fastest Available Chair."

### Task 8: Verification & Automated Tests
- [x] Create `apps/api/test/staff-leave-management.test.ts`:
  - Test 1: Adding a leave record and checking `isStylistOnLeave`.
  - Test 2: Stranded tickets recovery shifts tickets to Universal Fast Line preserving arrival timestamps.
  - Test 3: Reassigning stranded tickets to another active stylist updates durations.
  - Test 4: Queue wait times recalculate dynamically.
- [x] Run `bun test apps/api/test/staff-leave-management.test.ts`.
- [x] Run `bun run build:web` to ensure zero compilation or type errors.
- [ ] Live test in Chrome via `chrome-devtools-mcp`.
