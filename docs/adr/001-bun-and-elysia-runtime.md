# ADR 001: Bun Runtime & ElysiaJS Backend Framework

**Status:** Accepted  
**Date:** 2026-11-01  
**Decision Maker:** Core Engineering  

---

## Context
Salon queues experience rapid bursts: dozens of customers scan door QR codes simultaneously on weekend peak hours. Traditional Node.js + Express setups suffer from CPU throttling, slower event loops, and significant memory overhead when maintaining hundreds of concurrent WebSocket connections on budget server hardware.

## Decision
We adopted **Bun v1.4.3** as the JavaScript/TypeScript runtime and **ElysiaJS** as the HTTP & WebSocket server framework.

## Consequences & Benefits
1. **Sub-15ms Latency:** Native Bun performance handles QR check-ins and state machine recalculations in single-digit milliseconds.
2. **Native Response Compression:** Elysia integrates directly with `Bun.gzipSync` for low-overhead response compression.
3. **Built-in WebSockets:** High-performance raw WebSocket server handles salon room subscriptions without third-party broker bloat.
4. **Unified Toolchain:** Direct execution of TypeScript without compilation overhead during development and testing.
