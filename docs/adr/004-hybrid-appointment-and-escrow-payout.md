# ADR 004: Hybrid Appointment Interleaving, Platform Escrow & Daily Payout Architecture

## Status
**ACCEPTED** (2026-11-09)

---

## Context
Neighborhood salons in India experience severe friction when attempting to support advance appointments alongside high-volume walk-in traffic:
1. **Walk-in Alienation:** If an advance appointment customer cuts the line when 3 walk-ins have been waiting for 45 minutes, walk-in customers feel disrespected and leave negative reviews.
2. **High No-Show Rates:** Without upfront payment, advance appointment no-show rates hover between 35%–50%, leaving stylists with unpaid idle time.
3. **Manual UPI Approval Bottlenecks:** Direct P2P UPI transfers to the salon owner require manual UTR verification. Stylists with scissors in hand cannot verify payments in real time, causing consumer payment anxiety.
4. **Salon Owner Cash-Flow Sensitivities:** Salon owners resist high platform commissions and delayed weekly payouts.

---

## Decision

1. **Hybrid Interleaving with Time-Window Buffers:**
   - Rather than creating two competing queues, scheduled appointments are injected into the [`queueEngine`](file:///v:/salon/queue-engine-for-salon/apps/api/src/engine/queue-engine.ts) timeline as immovable time anchors.
   - Walk-in wait-time estimators automatically compute chair availability around these anchors. Walk-ins see transparent ETAs before sitting down.
2. **Platform Escrow for Prepaid Bookings:**
   - All appointment advance deposits (₹50 token or 100% full service) are collected via the platform gateway into escrow.
   - Instant automated webhook confirmation (<2 seconds). Zero manual UTR review required.
3. **10-Minute Grace Window & No-Show Auto-Release:**
   - Appointment holders must check in within 10 minutes of their slot start time.
   - At minute 11, the slot automatically forfeits to the top walk-in ticket in the waiting pool, completely eliminating barber idle time.
4. **Automated $T+1$ Daily Midnight Payouts:**
   - At 00:05 AM daily, the platform aggregates all completed appointments from the prior operating day.
   - Platform automatically deducts 2% gateway processing fee + 1% platform commission (total 3%) and transfers the net 97% to the salon owner's bank account or UPI VPA via automated payout gateway.
5. **Self-Service Rescheduling Window:**
   - Consumers can reschedule up to 1 hour before their slot at ₹0 penalty, smoothly sliding their reservation to any open slot in the next 7 days.

---

## Consequences & Trade-offs

### Positive:
- **Zero Line Collisions:** Walk-ins are never surprised or bumped by hidden arrivals.
- **<5% No-Show Rate:** Financial commitment via token advance virtually eliminates ghost bookings.
- **Instant Booking Confirmation:** Users receive WhatsApp confirmation and QR passes in seconds.
- **Predictable Daily Liquidity:** Salon owners receive their earnings every morning without having to raise manual withdrawal tickets.

### Negative / Mitigations:
- **3% Transaction Cost:** Salon owners bear 3% (2% PG + 1% Platform).  
  *Mitigation:* Salon owners gladly accept this minimal cost because it guarantees zero no-shows and saves hours of manual reconciliation.
- **Payout Gateway Overhead:** Requires automated payout infrastructure (Razorpay Route, Cashfree Payouts, or IMPS).  
  *Mitigation:* Supported with an admin retry switchboard and manual fallback for failed bank transfers.
