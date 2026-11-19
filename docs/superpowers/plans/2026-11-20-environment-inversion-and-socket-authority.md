# Environment Inversion & Direct Socket Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish complete 12-factor environment decoupling between Windows local development and EC2 VPS production, enforcing `.env` authority for API and WebSocket URLs with resilient sub-second fallbacks.

**Architecture:** Frontend and Backend ports are 100% environment-driven. Local dev runs self-sufficiently on ports 3000 and 3001 without Nginx. VPS production uses Nginx dual-gateway on ports 80/443 and 8000 via PM2 injection. URL resolution in `api.ts` prioritizes `.env` values while preventing mobile mixed-content errors.

**Tech Stack:** Next.js 16 (Turbopack), Bun 1.4, ElysiaJS, Nginx, PM2, TypeScript.

**Spec:** [docs/trd/TRD-014-environment-inversion-and-socket-authority.md](file:///v:/salon/queue-engine-for-salon/docs/trd/TRD-014-environment-inversion-and-socket-authority.md)

## Global Constraints
- Zero hardcoded port 8000 in repository configuration defaults.
- Zero server-side timer loops; continuous timers and math offloaded to client RAM per `GEMINI.md`.
- No disruption to local Windows development running `bun dev`.
- Rollback tag `rollback-v2-architecture-unification` exists and is pushed on GitHub remote origin.

## Review Focus
1. `NEXT_PUBLIC_WS_URL` defined in `.env.local`: client connects directly to configured WebSocket address.
2. `NEXT_PUBLIC_WS_URL` unset or relative: client dynamically resolves against `window.location`.
3. Remote mobile access over HTTPS: unencrypted `ws://localhost` prevented from triggering browser mixed-content block.
4. Next.js rewrite target: server proxies `/api/*` to `INTERNAL_API_URL` (defaulting to `http://localhost:3001` locally).
5. All 70 Next.js routes compile cleanly in production mode with zero TypeScript errors.

---

### Task 1: Refactor URL Resolution Helpers with Strict `.env` Authority
- [ ] Refactor `getApiBaseUrl()` and `getWsBaseUrl()` in `apps/web/lib/api.ts` to respect `.env` variables while preventing remote mixed-content failures.
- [ ] Add unit tests in `apps/web/test/api-url-resolution.test.ts` testing localhost, explicit remote `.env`, relative `.env`, and fallback states.
- [ ] Verify test suite passes with `bun test apps/web/test/api-url-resolution.test.ts`.

### Task 2: Next.js Rewrites & Environment Port Decoupling
- [ ] Verify `apps/web/next.config.ts` uses `process.env.INTERNAL_API_URL || "http://localhost:3001"`.
- [ ] Verify `apps/web/.env.local` and `apps/web/.env.example` specify ports 3000 and 3001 cleanly.
- [ ] Verify `ecosystem.config.cjs` injects `INTERNAL_API_URL: "http://127.0.0.1:8000"` for PM2 production mode.

### Task 3: Comprehensive Verification & Build
- [ ] Run full test suite: `bun test apps/web`.
- [ ] Run production Next.js build: `bun run build:frontend`.
- [ ] Update knowledge graph: `graphify update .`.
- [ ] Commit verified changes with descriptive message and push to GitHub `main`.
