# TRD-014: Environment Inversion & Direct Socket Authority Architecture

## 1. Context & Motivation
Previous deployment attempts created friction between local Windows development (running directly on ports 3000 and 3001 without Nginx) and the EC2 Linux production environment (running behind an Nginx dual-gateway on port 80 and port 8000). Specifically:
1. `apps/web/lib/api.ts` contained hardcoded `if (hostname !== 'localhost')` conditions that bypassed `.env` variables (`NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_API_URL`).
2. `apps/web/next.config.ts` had temporary deployment targets (`http://127.0.0.1:8000`) that caused `HTTP 502 Bad Gateway` errors and reload loops on local Windows machines.

## 2. Architectural Principles (12-Factor App)
1. **Config Authority**: The application code must never hardcode deployment assumptions. All environment differences must be driven by `.env` / environment variables.
2. **Self-Sufficient Local Development**: The local environment runs cleanly on `localhost:3000` (Next.js) and `localhost:3001` (Bun Elysia) with zero Nginx dependency.
3. **Production Multi-Tier Gateway**: In production, Nginx serves as a Layer 7 Load Balancer and SSL/WebSocket bridge across frontend nodes and backend workers.
4. **Zero Server Waste & Resilient Client Fallback**: Client hooks must handle connection anomalies gracefully, falling back to sub-second HTTP polling if WebSocket upgrades are blocked, and pausing when background tabs are inactive.

## 3. Configuration Contract

### A. Local Development (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
INTERNAL_API_URL=http://localhost:3001
```

### B. Production VPS (`ecosystem.config.cjs` / `.env.production`)
```env
NEXT_PUBLIC_API_URL=https://web.nexgentech.site
NEXT_PUBLIC_WS_URL=wss://web.nexgentech.site/ws
INTERNAL_API_URL=http://127.0.0.1:8000
```

## 4. URL Resolution Logic
`getWsBaseUrl()` and `getApiBaseUrl()` must adhere to:
1. If `NEXT_PUBLIC_WS_URL` is set and valid, honor it directly.
2. If running locally on `localhost` or `127.0.0.1`, default to `ws://localhost:3001/ws`.
3. If running over HTTPS on a remote domain and no explicit URL is provided, automatically construct `wss://${window.location.host}/ws` to prevent mixed-content security blocks.
