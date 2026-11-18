# Independent Deployment & Environment Variables Guide

This guide explains how to deploy the **Backend API** and **Frontend Web** on separate servers, domains, or cloud hosts without confusion.

---

## 1. Architectural Separation Overview

In a separate production deployment, the monorepo splits into two independent services:

```
[ Customer / Staff Browsers ]
             │
             ▼
┌────────────────────────────────────────┐
│ SERVER B: FRONTEND WEB (Next.js 16)     │
│ Domain: https://salon.yourdomain.com   │
│ Target Folder: apps/web                │
│ Config: apps/web/.env.example          │
└──────────────────┬─────────────────────┘
                   │ REST API & WebSockets
                   ▼
┌────────────────────────────────────────┐
│ SERVER A: BACKEND API (Bun + Elysia)   │
│ Domain: https://api.yourdomain.com     │
│ Target Folder: apps/api                │
│ Config: apps/api/.env.example          │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ DATABASE: MySQL 8.0 (InnoDB)           │
│ Host: 127.0.0.1 or Cloud DB (AWS/Aiven)│
└────────────────────────────────────────┘
```

---

## 2. Server A: Deploying Backend API (`apps/api`)

### Where to Deploy:
VPS (Ubuntu/Debian), Railway, Render, Fly.io, DigitalOcean, or Hostinger VPS with Bun runtime.

### What `.env` File to Use:
Copy `apps/api/.env.example` $\rightarrow$ `apps/api/.env` (or enter these into your cloud provider's Environment Variables dashboard):

```ini
# Server Binding
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# MySQL 8.0 Database Connection
DB_HOST=your-mysql-host.rds.amazonaws.com # or 127.0.0.1
DB_PORT=3306
DB_USER=salon_admin
DB_PASSWORD=your_strong_mysql_password
DB_NAME=engine_que_salon

# Authentication
JWT_SECRET=generate_a_random_64_character_hex_string

# Notification Gateway (Meta WhatsApp Cloud API or Mock)
WHATSAPP_MOCK_MODE=false
WHATSAPP_API_KEY=your_meta_whatsapp_cloud_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# Localization
DEFAULT_CURRENCY=INR
DEFAULT_COUNTRY_CODE=+91

# CRITICAL: Whitelist Frontend Server B Domain for CORS
# Add the exact production domain(s) of Server B
CORS_ALLOWED_ORIGINS=https://salon.yourdomain.com,https://web.yourdomain.com

# Payment Gateway (Optional / Mock)
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_live_key_secret
```

> [!IMPORTANT]
> **CORS Security**: You MUST put Frontend Server B's domain in `CORS_ALLOWED_ORIGINS`. Otherwise, browser security will block API calls from Server B.

---

## 3. Server B: Deploying Frontend Web (`apps/web`)

### Where to Deploy:
Vercel, Cloudflare Pages, Netlify, or Node/Bun VPS.

### What `.env` File to Use:
Copy `apps/web/.env.example` $\rightarrow$ `apps/web/.env.local` (or enter these into Vercel/Netlify Environment Variables dashboard):

```ini
# Public API Gateway (Must point to Server A)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Public WebSocket Gateway (Must point to Server A with wss://)
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws

# Optional Internal Network URL (Only if using Docker Compose / Kubernetes network)
INTERNAL_API_URL=http://backend-api:3001
```

> [!CAUTION]
> **Zero Database Credentials on Server B**:
> Never put `DB_PASSWORD`, `DB_USER`, `DB_HOST`, or `JWT_SECRET` on Server B!
> In Next.js, any variable prefixed with `NEXT_PUBLIC_` is baked into the JavaScript bundle sent to public browser users. Server B needs **only** `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`.

---

## 4. Quick Rule of Thumb: "Who Uses What?"

| Question | Answer |
|---|---|
| **Does it touch MySQL?** | Put it in **Server A (`apps/api`) ONLY**. |
| **Is it a secret key / password?** | Put it in **Server A (`apps/api`) ONLY**. |
| **Is it a public URL that the user's mobile browser calls?** | Put it in **Server B (`apps/web`)** prefixed with `NEXT_PUBLIC_`. |
| **How does Server A know Server B is allowed to talk to it?** | Add Server B's URL to `CORS_ALLOWED_ORIGINS` in Server A. |

---

## 5. Instant Pre-Flight Validator Tool

Before pushing or after deploying, run our pre-flight environment validator:

```bash
# Validate both servers
bun run env:check

# Validate only Backend Server A
bun scripts/validate-env.ts api

# Validate only Frontend Server B
bun scripts/validate-env.ts web
```

If any variable is missing or if any private secret is accidentally leaked into the frontend, the validator will immediately flag it with a ❌ or 🚨 alert.
