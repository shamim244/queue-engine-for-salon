# ADR 005: State Machine Audit and Remediation Plan

- **Status:** Open (nothing in this document has been fixed yet)
- **Date:** 2026-11-14
- **Method:** Static reading of source files only. No code, tests, or type checker were run. Every finding must be reproduced or confirmed in the code before it is fixed, because file contents may have changed since the audit.
- **Not yet read (findings in these areas are incomplete):** `apps/api/src/db/repositories/wallet.repo.ts`, `apps/api/src/index.ts`, `apps/web/app/**`, `apps/web/components/**`.

## 1. Purpose

The app has many status-driven flows. Only one (the queue ticket lifecycle) has an explicit transition table, and even that is bypassed. The rest are implicit: status strings set by route handlers and repositories with no central rules. This document lists every problem found, why it matters, and the proposed fix, so that any developer or AI agent can pick up an item and implement it without re-auditing.

## 2. Rules every fix must respect

These come from `GEMINI.md` and the project docs. A fix that breaks them is not acceptable.

- The server is a state authority only. No timer loops, countdowns, or per-ticket intervals on the server. Clients do timers, QR codes, and chimes.
- Responses over 1KB are gzipped. Catalog responses are cached in memory for 60 seconds.
- Android-first UI. No `alert()` or `confirm()` in the web app.
- Deliver fixes as small targeted patches, one issue per patch. No full-file rewrites.
- Every fix updates the change log in section 8 of this file.

## 3. Critical issues (money and access)

Fix these first. Each has an ID so patches and tests can reference it.

### C1. Appointments can be confirmed without verified payment
- **Where:** `apps/api/src/routes/appointments.ts`, `POST /api/v1/appointments/confirm`.
- **Problem:** The handler accepts a `paymentId` from the request body and sets the appointment to `CONFIRMED` without checking it with the payment provider or against a stored payment order. Anyone who knows an appointment ID can confirm it for free. It also doesn't check the appointment's current status or age, so a cancelled or expired `PENDING_PAYMENT` appointment can be confirmed, and a late confirmation can overbook a slot that was released.
- **Fix:** Look up the payment order by `paymentId`, require it to be `COMPLETED` and to belong to this appointment and amount, and require the appointment to be `PENDING_PAYMENT` and within its hold window. Return 4xx otherwise. Move the transition into the appointment state machine (see section 5).
- **Acceptance:** Confirming with an unknown, unpaid, mismatched, or reused `paymentId` fails. Confirming a cancelled or expired appointment fails. A valid confirmation succeeds once and a repeat is a safe no-op or a clear error.

### C2. A failed wallet debit still grants the subscription
- **Where:** `apps/api/src/payment/payment.service.ts`, `fulfillSubscription`.
- **Problem:** The wallet debit is wrapped in a try/catch that only logs a warning. The subscription is created whether or not the debit succeeded.
- **Fix:** Perform the debit first. If it fails, abort fulfillment and leave the order in a retryable or failed state. Prefer a single database transaction covering debit, subscription creation, and order completion.
- **Acceptance:** With an insufficient or failing wallet, no subscription is created and the order is not marked `COMPLETED`.

### C3. Referral conversion is not atomic and errors are swallowed
- **Where:** `apps/api/src/wallet/referral.service.ts` (`processConversion`), called from `fulfillSubscription` in `payment.service.ts`; `markConverted` in `apps/api/src/db/repositories/referral.repo.ts`.
- **Problem:** The attribution is marked `CONVERTED` before the wallet is credited, with no rollback. If the credit fails, the attribution stays converted, a retry finds nothing pending, and the reward is lost. The caller in fulfillment ignores errors. Separately, two concurrent conversions can both pass the `PENDING` check, and `markConverted` doesn't require the current status to be `PENDING`.
- **Fix:** Make `markConverted` conditional on `status = 'PENDING'` and check the affected row count. Credit the wallet and mark converted in one transaction, or credit first with a unique `referenceId` so repeats are rejected. Surface errors to the caller instead of swallowing them.
- **Acceptance:** A failed credit leaves the attribution `PENDING`. Two concurrent conversions produce exactly one wallet credit.

### C4. Payment approval can run twice, or after rejection or expiry
- **Where:** `apps/api/src/payment/payment.service.ts`, `approvePaymentOrder`, `submitManualPayment`.
- **Problem:** `approvePaymentOrder` runs `fulfillSubscription` before marking the order `COMPLETED`, and its only guard is a status check read earlier. Two concurrent approvals can both pass and create two subscriptions. It also doesn't block `REJECTED` or `EXPIRED` orders. A coupon redemption recorded inside fulfillment is counted twice in that case. `submitManualPayment` only blocks `COMPLETED`, so rejected or expired orders can be resubmitted.
- **Fix:** Claim the order first with a conditional update (`PENDING_APPROVAL` → `PROCESSING` or directly `COMPLETED`, where the update checks the old status and the affected row count). Only the caller that wins the claim runs fulfillment. Allow approval only from `PENDING_APPROVAL`. Allow manual submission only from `PENDING`.
- **Acceptance:** Concurrent approvals create one subscription and one coupon redemption. Approving or resubmitting a `REJECTED`, `EXPIRED`, or `COMPLETED` order fails.

### C5. Partner payouts can overdraw or be double-paid
- **Where:** `apps/api/src/db/repositories/partner.repo.ts`: `requestPayout`, `settlePayout`, `rejectPayout`.
- **Problem:** `requestPayout` checks `availableBalance` and then inserts the request in a separate step, so concurrent requests can both pass. `settlePayout` can run on a request that is already `PAID`. `rejectPayout` can run on a `PAID` request, which restores the balance even though the money was sent.
- **Fix:** Wrap balance check plus insert in one transaction with a row lock on the partner's balance. Make `settlePayout` allowed only from `REQUESTED` (or `APPROVED` once that step exists) and `rejectPayout` only from `REQUESTED` or `APPROVED`, using conditional updates that check the affected row count.
- **Acceptance:** Concurrent requests cannot exceed the available balance. Settling twice pays once. A `PAID` request cannot be rejected.

### C6. Daily settlement can pay the same appointments twice
- **Where:** `apps/api/src/worker/payout-worker.ts`, `runDailySettlement`.
- **Problem:** Each run creates a new payout record with a random ID, so a second run for the same salon and date creates another one. The appointments included are not marked as settled, so a second run picks them up again. Auto-settle defaults to on, which sends these payouts straight to `SETTLED`.
- **Fix:** Add a unique constraint on (salon, settlement date) for payouts, or make the worker look up an existing payout first. Mark each included appointment with its payout ID inside the same transaction, and exclude appointments that already have one.
- **Acceptance:** Running settlement twice for the same salon and date produces one payout and pays each appointment once.

### C7. Flat-bounty and hybrid partners earn no bounty on subscriptions
- **Where:** `processSubscriptionPayment` (find it with a search for `bountyAmount: 0`; it calls `calculatePartnerCommission` in `apps/api/src/engine/partner-commission.ts`).
- **Problem:** `bountyAmount` is hard-coded to `0` at the call site, so `FLAT_BOUNTY` partners always earn zero and `HYBRID` partners only earn the percentage part.
- **Fix:** Pass the partner's configured bounty amount. Confirm the intended business rule first (one-time bounty on first paid plan vs. per payment) before changing it.
- **Acceptance:** A flat-bounty partner receives the configured bounty on a qualifying payment, once per the agreed rule.

### C8. Coupon limits can be exceeded
- **Where:** `apps/api/src/coupon/coupon.service.ts` (`validateAndApplyCoupon`), `apps/api/src/db/repositories/coupon.repo.ts` (`recordRedemption`).
- **Problem:** Applying a coupon only previews the discount. The redemption is recorded later with no recheck of `maxUses` or `maxUsesPerUser`, so concurrent redemptions can exceed the limits. `usedCount` is incremented in memory before the database write, and a failed write is logged and ignored, so the two can drift. When no `userId` or `organizationId` is sent, the per-user check is skipped entirely.
- **Fix:** Do the limit check and the increment in one conditional update (`UPDATE ... SET used_count = used_count + 1 WHERE id = ? AND (max_uses IS NULL OR used_count < max_uses)`) and check the affected row count. Enforce the per-user limit inside the same transaction. Require an identifier for coupons that have a per-user limit.
- **Acceptance:** Concurrent redemptions never exceed `maxUses`. Anonymous requests cannot bypass a per-user limit.

### C9. Coupon management endpoints show no auth check
- **Where:** `apps/api/src/routes/coupon.routes.ts` (create, update, delete, list).
- **Problem:** No authentication or role guard appears in this file. It may be applied globally in `apps/api/src/index.ts`, which has not been read.
- **Fix:** Confirm in `index.ts`. If not guarded, require an admin or owner role on create, update, and delete, and scope owner coupons to their own organization or salon.
- **Acceptance:** Unauthenticated and wrong-role requests to create, update, or delete a coupon return 401 or 403.

## 4. Other issues by state machine

### 4.1 Queue ticket (`apps/api/src/engine/state-machine.ts`, `queue-engine.ts`)
- **Q1.** Only `seatCustomer`, `finishService`, and `softBump` check the transition table. `cancelTicket`, `markNoShow`, `callNext`, `summonTicket`, `pauseTicket`, and `resumeTicket` write directly. A `COMPLETED` ticket can be cancelled or marked no-show.
- **Q2.** `PAUSED` is not in `VALID_TRANSITIONS`. The table is typed as `Record<TicketStatus, ...>`, so this should fail type checking. Run `tsc` to confirm.
- **Q3.** `resumeTicket` always returns a ticket to `WAITING`, so a paused `SUMMONED` ticket loses its chair assignment.
- **Q4.** The code uses `CALLED` and `IN_SERVICE`, which are not in the `TicketStatus` type. Decide whether to add them or remove the leftovers.
- **Q5.** `callNext` and `summonTicket` silently move the previous summoned ticket to `SOFT_BUMPED`. The two writes are not atomic.
- **Q6.** `Stylist.currentTicketId` and ticket statuses are two sources of truth, and no update of `currentTicketId` was found.
- **Fix:** Route every status change through one `transition(ticket, event)` function that checks the table, and make multi-ticket changes a single transaction.

### 4.2 Appointment (`apps/api/src/routes/appointments.ts`, `apps/api/src/db/repositories/appointment.repo.ts`)
- **A1.** Confirm, check-in, cancel, no-show, and complete have no status guards. A cancelled appointment can be checked in or confirmed.
- **A2.** `/seat` blocks `COMPLETED`, `CANCELLED`, and `NO_SHOW`, but not `PENDING_PAYMENT`, so an unpaid appointment can be seated.
- **A3.** `PENDING_PAYMENT` appointments stop blocking the slot after 10 minutes but remain in that state in storage. Nothing sets them to `CANCELLED` or `EXPIRED`.
- **A4.** `RESCHEDULED` is in the type, but nothing sets it, even though reschedule logic exists.
- **A5.** The grace-period job only moves `CONFIRMED` to `NO_SHOW`. `CHECKED_IN` appointments are never auto-forfeited.
- **A6.** Seating an appointment does not create or update a queue ticket, so the two `IN_CHAIR` states can disagree.
- **Fix:** Add an appointment transition table (section 5) and one `transitionAppointment` function used by every route and worker.

### 4.3 Escrow (`appointment.repo.ts`, `appointments.ts`)
- **E1.** Escrow status (`HELD`, `RELEASED_TO_OWNER`, `REFUNDED_TO_CUSTOMER`, `PARTIAL_SPLIT`) is set separately from appointment status. `/confirm` resets it to `HELD`.
- **E2.** The cancel handler records `PARTIAL_SPLIT` without an actual refund step.
- **Fix:** Derive escrow changes from appointment transitions, in the same transaction, and add the refund step or document that it is manual.

### 4.4 Payment order (`payment.service.ts`)
- **P1.** `EXPIRED` is only set when someone calls `verifyPayment` after the deadline. No job sweeps old `PENDING` orders.
- **P2.** Nothing sets `REFUNDED`.
- **Fix:** Add a sweep (see GEMINI.md rule: no server timer loops, so use an on-demand check, a cron-style script in `scripts/`, or check at read time) and a refund path, or remove the unused status.

### 4.5 Subscription
- **S1.** `GRACE_PERIOD` and `CANCELLED` exist in the type, but only `ACTIVE` is created. Expiry is inferred from `expiresAt` versus the current time. Decide whether to implement these statuses or remove them.

### 4.6 Coupon (`coupon.repo.ts`)
- **K1.** Nothing sets `EXPIRED` from `validUntil`. Validation checks the date at apply time, which works, but the stored status never changes.

### 4.7 Referral (`referral.repo.ts`, `referral.service.ts`)
- **R1.** `EXPIRED` is never set.
- **R2.** `resolveReferrerOrg` loads all organizations to find a match when the direct lookups fail. This is slow at the 1 lakh salon target.

### 4.8 Partner (`partner.repo.ts`, `partner-commission.ts`)
- **T1.** Partner status (`PENDING_REVIEW`, `ACTIVE`, `PAUSED`, `REJECTED`) has no transition table. Any status can be set to any other.
- **T2.** Attribution moves from `UNQUALIFIED` to `QUALIFIED` in two places (first paid plan, and after 15 tickets), and both run `unlockPendingLedgerEntries`. The ticket counter is an in-memory `Set` that resets on restart.
- **T3.** `PENDING_LOCK` ledger entries appear never to be created, so the lock-to-available rule may be dead code. Confirm by searching for where ledger entries are inserted.
- **T4.** `APPROVED` exists as a payout request status, but no code sets it, so there is no approval step.

### 4.9 Cross-cutting
- **X1.** Several repositories write to the in-memory store before the database and then swallow database errors without rethrowing (appointments, coupons, referrals, partners). The two can drift apart silently.
- **X2.** Almost every multi-step flow is check-then-write with no transaction or lock.
- **X3.** Status values are compared as strings, so a typo fails silently.
- **X4.** The queue recalculation coalescer (per-salon idle / in-flight / in-flight-plus-pending, kept in two `Map`s) is an undocumented state machine.

### 4.10 Web client (`apps/web/lib/socket.ts`)
- **W1.** `offline` is not terminal. After six failed attempts the watchdog (every 2.5 seconds) keeps calling `connect()`, so the status flips between `offline` and `reconnecting`.
- **W2.** Going `offline` (the browser `offline` event or six failures) does not close the socket.
- **W3.** The client's `QueueSocketEvent` type does not match what the server sends. The server sends `TICKET_PAUSED`, `TICKET_RESUMED`, `TICKET_TRANSFERRED`, `TICKET_UPDATED`, and `APPOINTMENT_CONFIRMED`, none of which are in the client union. The client lists `TICKET_CALLED`, `CUSTOMER_SEATED`, `TICKET_BUMPED`, and `QUEUE_RECALCULATED`, which were not found being sent. Share one event type definition between `apps/api` and `apps/web`.
- **W4.** The backoff delay stops growing after the fourth attempt, which caps it at 5 seconds, and the watchdog can start a reconnect while one is already scheduled.

## 5. Target transition tables (proposed)

These are proposals to be confirmed against business rules before coding. Anything not listed is rejected.

**Appointment**

| From | Allowed to |
|---|---|
| `PENDING_PAYMENT` | `CONFIRMED`, `CANCELLED`, `EXPIRED` (new) |
| `CONFIRMED` | `CHECKED_IN`, `CANCELLED`, `NO_SHOW`, `RESCHEDULED` |
| `CHECKED_IN` | `IN_CHAIR`, `CANCELLED`, `NO_SHOW` |
| `IN_CHAIR` | `COMPLETED` |
| `RESCHEDULED` | `CONFIRMED` (the new slot) |
| `COMPLETED`, `CANCELLED`, `NO_SHOW`, `EXPIRED` | none (terminal) |

**Payment order**

| From | Allowed to |
|---|---|
| `PENDING` | `PENDING_APPROVAL`, `COMPLETED`, `EXPIRED` |
| `PENDING_APPROVAL` | `COMPLETED`, `REJECTED` |
| `COMPLETED` | `REFUNDED` |
| `REJECTED`, `EXPIRED`, `REFUNDED` | none (terminal) |

**Partner payout request**

| From | Allowed to |
|---|---|
| `REQUESTED` | `APPROVED`, `REJECTED` |
| `APPROVED` | `PAID`, `REJECTED` |
| `PAID`, `REJECTED` | none (terminal) |

**Queue ticket:** keep the existing table, add `PAUSED` (from `WAITING` or `SUMMONED`, back to the status it came from), and either add or remove `CALLED` and `IN_SERVICE`.

## 6. Recommended fix order

1. C1 (confirm without payment)
2. C4 (payment approval race), then C2 (wallet debit)
3. C3 (referral conversion)
4. C5 (partner payouts), then C6 (daily settlement)
5. C8 (coupon limits), C9 (coupon auth), C7 (bounty, after the business rule is confirmed)
6. Q1 to Q6 and A1 to A6, behind a shared transition function
7. Remaining items in section 4, then W1 to W4

Before step 1, read the three unread files listed at the top and run the existing test suite so the baseline is known.

## 7. Handoff instructions for an implementing agent

1. Pick one issue ID. Re-read the cited files and confirm the problem still exists.
2. Write a failing test first where the test setup allows it (`bun run test`).
3. Make the smallest patch that fixes it. Do not reformat or rewrite unrelated code.
4. Run `bun run test` and the type check. Record the results.
5. Fill in one row of the change log below and set the status of the issue.
6. Do not start the next issue until the log row is filled in.

## 8. Change log

| ID | Status | Date | Files changed | Verified by | Notes |
|---|---|---|---|---|---|
| C1 | Resolved | 2026-11-14 | `engine/state-machine.ts`, `routes/appointments.ts`, `engine/types.ts` | `c1-appointment-payment-guard.test.ts` (6/6 pass) | Enforced hold window expiration, payment order tracking, transition validation, and payment reuse guards |
| C2 | Resolved | 2026-11-14 | `payment/payment.service.ts` | `c4-c2-payment-approval-guard.test.ts` (4/4 pass) | Wallet debit now precedes subscription creation and stops on insufficient funds without swallowing errors |
| C3 | Resolved | 2026-11-14 | `db/repositories/referral.repo.ts`, `wallet/referral.service.ts` | `c3-referral-conversion-guard.test.ts` (2/2 pass) | Atomic `UPDATE ... WHERE status = 'PENDING'` claim with automatic rollback to PENDING on wallet credit failure |
| C4 | Resolved | 2026-11-14 | `db/repositories/payment.repo.ts`, `payment/payment.service.ts`, `engine/types.ts` | `c4-c2-payment-approval-guard.test.ts` (4/4 pass) | Added `PROCESSING` order claim state; blocked manual resubmission or approval of REJECTED/EXPIRED orders |
| C5 | Resolved | 2026-11-14 | `db/repositories/partner.repo.ts` | `c5-partner-payout-guard.test.ts` (3/3 pass) | Partner payout mutex lock prevents concurrent overdraft; blocked re-settling or rejecting already PAID payouts |
| C6 | Resolved | 2026-11-14 | `worker/payout-worker.ts`, `engine/types.ts`, `db/repositories/appointment.repo.ts` | `c6-c7-settlement-bounty-guard.test.ts` (4/4 pass) | Idempotent daily settlement by (salon, date); appointments tagged with payoutId and excluded from re-settlement |
| C7 | Resolved | 2026-11-14 | `db/repositories/partner.repo.ts` | `c6-c7-settlement-bounty-guard.test.ts` (4/4 pass) | Awarded configured one-time bounty on qualifying plan for FLAT_BOUNTY and HYBRID, recurring percent preserved |
| C8 | Resolved | 2026-11-14 | `db/repositories/coupon.repo.ts` | `c8-c9-coupon-guard.test.ts` (8/8 pass) | Atomic mutex & conditional check prevents exceeding maxUses under concurrency; required userId for per-user limits |
| C9 | Resolved | 2026-11-14 | `routes/coupon.routes.ts` | `c8-c9-coupon-guard.test.ts` (8/8 pass) | Added zero-trust session validation; restricted create/update/delete to SUPER_ADMIN and scoped SALON_OWNER |
| Q1 to Q6 | Open | | | | |
| A1 to A6 | Open | | | | |
| E1, E2 | Open | | | | |
| P1, P2 | Open | | | | |
| S1 | Open | | | | |
| K1 | Open | | | | |
| R1, R2 | Open | | | | |
| T1 to T4 | Open | | | | |
| X1 to X4 | Open | | | | |
| W1 to W4 | Open | | | | |
