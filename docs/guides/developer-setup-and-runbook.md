# Developer Setup, Testing & Operational Runbook

**Document Version:** 2.0.0  
**Target Platform:** Windows / macOS / Linux  
**Primary Engine:** Bun v1.4.3 | MySQL 8.0/9.1 | Next.js 15  

---

## 1. Prerequisites
- **Bun Runtime:** Install Bun v1.4.3+ (`powershell -c "irm bun.sh/install.ps1 | iex"`).
- **MySQL Database:** Local MySQL server running on port `3306` with database name `engine_que_salon` (or in-memory fallback will activate automatically).

---

## 2. Quickstart Development Commands

### Start API Core Server (Bun + Elysia on port 3001)
```bash
cd apps/api
bun index.ts
```

### Start Web Client Server (Next.js 15 App Router on port 3000)
```bash
cd apps/web
bun run dev
```

---

## 3. Running Automated Test Suites

Run all frontend auth and unit tests:
```bash
bun test apps/web/test/auth-guard.test.ts apps/web/test/salon-storefront.test.ts
```

Run full static production build:
```bash
bun run build:web
```

---

## 4. Key Endpoints & Routes

| Service | Local URL | Primary Persona |
| :--- | :--- | :--- |
| **Platform Governance HQ** | `http://localhost:3000/admin` | `SUPER_ADMIN` (`admin / Admin@123`) |
| **Enterprise Login Portal** | `http://localhost:3000/login` | All Roles (1-Click & Autofill) |
| **Salon Operations Hub** | `http://localhost:3000/owner?salon=ramesh-barber` | `SALON_OWNER` (`owner / Owner@123`) |
| **Chair Mirror Station** | `http://localhost:3000/s/ramesh-barber/station` | Stylists / Barbers (4-digit PIN) |
| **Lobby Live TV Display** | `http://localhost:3000/s/ramesh-barber/tv` | Waiting Clients & Lobby TV |
| **Customer Door QR Portal** | `http://localhost:3000/s/ramesh-barber` | Walk-in Customers |
| **OpenAPI / Swagger Docs** | `http://localhost:3001/swagger` | Developers & API Consumers |
