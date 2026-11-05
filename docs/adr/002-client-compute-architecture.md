# ADR 002: Zero Server Timers & Client Hardware Offloading

**Status:** Accepted  
**Date:** 2026-11-04  
**Decision Maker:** Core Engineering  

---

## Context
Displaying countdown timers (e.g. "Wait Time: 18m", "Haircut elapsed: 12m 40s") across thousands of active clients would overwhelm server CPU and database I/O if the server ran continuous ticking intervals or database writes every second.

## Decision
We adopted the **Client-Compute Architecture**:
1. The server operates strictly as an **Atomic State Authority** storing anchor timestamps (`check_in_time`, `summoned_time`, `started_time`).
2. Client devices (customer phones, receptionist screens, lobby TVs, stylist tablets) execute continuous math and clock rendering locally in their own RAM/CPU using `requestAnimationFrame` and local intervals.
3. UPI QR codes and sound alert chimes are generated entirely on the client side using `<canvas>` and the browser Web Audio API (`AudioContext`).

## Consequences & Benefits
- Zero server background timer loops.
- Server CPU usage remains at $<2\%$ even with thousands of connected displays.
- Network bandwidth is conserved for actual transactional state changes.
