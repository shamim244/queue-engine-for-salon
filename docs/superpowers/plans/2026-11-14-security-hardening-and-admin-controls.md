# Security Hardening, Dynamic Admin Controls & Input Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive application security fixes across `queue-engine-for-salon`, introducing dynamic admin-manageable rate limits and origin controls, strict subdomain CORS matching, input character limits, standardized 10-digit mobile phone normalization with multi-country code support (`+91` default, expandable to global codes), portal XSS neutralization, security headers, and CSPRNG identifiers.

**Architecture:** 
- A persistent `security_settings` table (with MySQL schema + fast in-memory fallback) allows administrators to dynamically adjust rate limits (attempts and window duration), custom allowed origins, and default/allowed country codes without redeploying code.
- Dynamic sliding-window rate limiters guard `/api/auth/pin-switch`, `/api/auth/login`, and `/api/queue/checkin`.
- CORS origin validator cleanly supports `nexgentech.site` and all subdomains (`*.nexgentech.site`) via strict anchored regex, alongside admin-configured origins.
- A centralized **Multi-Country Phone Engine** validates and normalizes phone numbers into:
  1. `countryCode` (e.g., `+91` for India, expandable to `+1`, `+44`, `+971`, `+65`, etc.)
  2. `nationalNumber` (strictly 10 digits: `[0-9]{10}`)
  3. `fullE164` (e.g., `+919876543210`)
- Frontend portals provide a clean country code selector with strict 10-digit input masks (`maxlength="10"`, `pattern="[0-9]{10}"`, `inputmode="numeric"`).
- Reusable HTML escaping and DOM binding eliminate Stored XSS in public/staff portals.

**Tech Stack:** Bun Runtime, ElysiaJS, TypeBox (`@sinclair/typebox`), MySQL 8.0, Next.js 16 / React 19, Web Crypto API (`crypto.randomUUID()`).

**Spec:** [SECURITY_AUDIT_REPORT.md](file:///V:/salon/queue-engine-for-salon/docs/security/SECURITY_AUDIT_REPORT.md) and User Requirements.

---

## Global Constraints

- **Dynamic Admin Power:** Zero hardcoded limits for rate limiting or country codes. Admin can view and mutate limits and country options via `GET/PUT /api/admin/security/settings`.
- **Subdomain Security:** `nexgentech.site` and all subdomains (`*.nexgentech.site`) must be allowed, but malicious permutations (`evil-nexgentech.site`, `attacker.com?nexgentech.site`) must be strictly rejected.
- **Mobile Number Standard:** Core mobile national number must be strictly **10 digits** (`[0-9]{10}`).
- **Multi-Country Code Support:** The system defaults to `+91` (India) while cleanly architecting support for future international expansion (`+1`, `+44`, `+971`, `+65`, etc.).
- **Character Boundaries:** Every input field across backend schemas and frontend forms must enforce strict `maxLength` and type validation.
- **Client-Compute Rule (GEMINI.md):** No recurring ticking loops on backend; client-side rendering must remain fast and secure without blocking dialogs (`alert()`).

---

## Review Focus

1. **Multi-Country Phone Normalization:** Verify that inputs like `9876543210` (no code), `+91 9876543210`, `+91-9876543210`, and `09876543210` all resolve to `+91` with national number `9876543210`. Verify international format like `+1 2025550143` resolves to country code `+1` with 10-digit national number `2025550143`.
2. **Phone Rejection Edge Cases:** Numbers with 9 digits, 11 digits (non-prefixed), or letters must be rejected with a user-friendly validation error.
3. **Subdomain Regex Validation:** Ensure `test.nexgentech.site`, `nexgentech.site`, and `staging.nexgentech.site:3000` pass, while `notnexgentech.site` and `evil-nexgentech.site` fail.
4. **Dynamic Admin Rate Limiting:** Verify that changing `pinMaxAttempts` from 5 to 2 in admin settings immediately blocks the 3rd attempt without restarting the server.
5. **Portal Stored XSS Neutralization:** Ensure `<img src=x onerror=alert(1)>` in customer name renders as literal text in `tv.html`, `desk.html`, and `barber.html` with zero script execution.
6. **CSPRNG Generation:** Verify that session and user IDs use `crypto.randomUUID()` with high entropy instead of `Math.random()`.

---

## Task Decomposition

### Task 1: Dynamic Security Settings & Admin Control API

**Files:**
- Modify: `apps/api/src/db/mysql.ts` (add `security_settings` table migration with country code fields)
- Create: `apps/api/src/db/repositories/security.repo.ts`
- Modify: `apps/api/src/db/repository.ts` (export `securityRepo`)
- Create: `apps/api/src/routes/security.routes.ts`
- Modify: `apps/api/index.ts` (mount `securityRoutes`)
- Test: `apps/api/tests/security-settings.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  interface SecuritySettings {
    id: string;
    pinMaxAttempts: number;
    pinWindowSeconds: number;
    loginMaxAttempts: number;
    loginWindowSeconds: number;
    checkinMaxAttempts: number;
    checkinWindowSeconds: number;
    allowedCustomOrigins: string[];
    defaultCountryCode: string; // Defaults to '+91'
    allowedCountryCodes: string[]; // e.g. ['+91', '+1', '+44', '+971', '+65']
    updatedAt: string;
  }
  securityRepo.getSettings(): Promise<SecuritySettings>
  securityRepo.updateSettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings>
  ```

- [ ] **Step 1: Write test for Security Settings Repository & Admin Routes**
  Test default retrieval, updating limits, updating country codes, and custom origin persistence in `apps/api/tests/security-settings.test.ts`.
- [ ] **Step 2: Run test to verify failure**
  Run `bun test apps/api/tests/security-settings.test.ts`.
- [ ] **Step 3: Implement `security_settings` table in `apps/api/src/db/mysql.ts` and `security.repo.ts`**
  Implement in-memory defaults with MySQL table creation, seed record, and persistence.
- [ ] **Step 4: Implement `security.routes.ts` (`GET/PUT /api/admin/security/settings`)**
  Allow authenticated admins to view and update rate limits, allowed origins, and country codes dynamically.
- [ ] **Step 5: Verify tests pass**
  Run `bun test apps/api/tests/security-settings.test.ts`.
- [ ] **Step 6: Commit**
  `git commit -m "feat(security): add dynamic admin security settings with multi-country configuration"`

---

### Task 2: Subdomain-Safe CORS Validator & HTTP Security Headers

**Files:**
- Modify: `apps/api/index.ts`
- Create: `apps/api/src/security/cors-validator.ts`
- Create: `apps/api/src/security/headers.ts`
- Test: `apps/api/tests/cors-and-headers.test.ts`

**Interfaces:**
- Consumes: `securityRepo.getSettings()`
- Produces:
  ```typescript
  function isAllowedOrigin(origin: string | null | undefined, customOrigins?: string[]): boolean
  function applySecurityHeaders(set: { headers: Record<string, string | undefined> }): void
  ```

- [ ] **Step 1: Write tests for CORS origin validation & security headers**
  Test valid subdomains (`app.nexgentech.site`), apex (`nexgentech.site`), ports (`localhost:3000`), evil domains (`evil-nexgentech.site` -> false), and presence of `X-Frame-Options`, `X-Content-Type-Options`.
- [ ] **Step 2: Run test to verify failure**
  Run `bun test apps/api/tests/cors-and-headers.test.ts`.
- [ ] **Step 3: Implement `cors-validator.ts` with strict subdomain anchor regex**
  Regex: `/^https?:\/\/([a-zA-Z0-9-]+\.)*nexgentech\.site(:\d+)?$/` plus dynamic check against `securityRepo.getSettings().allowedCustomOrigins`.
- [ ] **Step 4: Implement `headers.ts` for Elysia**
  Attach `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] **Step 5: Mount in `apps/api/index.ts`**
  Wire into Elysia CORS config and `onRequest` hook.
- [ ] **Step 6: Verify tests pass & commit**
  Run `bun test apps/api/tests/cors-and-headers.test.ts` and commit.

---

### Task 3: Dynamic Rate Limiter for PIN Switch, Login, and Queue Check-in

**Files:**
- Create: `apps/api/src/security/rate-limiter.ts`
- Modify: `apps/api/src/routes/auth.routes.ts`
- Modify: `apps/api/src/routes/queue.routes.ts`
- Test: `apps/api/tests/rate-limiter.test.ts`

**Interfaces:**
- Consumes: `securityRepo.getSettings()`
- Produces:
  ```typescript
  rateLimiter.checkLimit(key: string, maxAttempts: number, windowSeconds: number): { allowed: boolean; remaining: number; retryAfter?: number }
  rateLimiter.reset(key: string): void
  ```

- [ ] **Step 1: Write unit tests for sliding-window rate limiter**
  Test attempt counting, sliding window expiration, dynamic limit changes, and IP/key tracking.
- [ ] **Step 2: Run test to verify failure**
  Run `bun test apps/api/tests/rate-limiter.test.ts`.
- [ ] **Step 3: Implement in-memory sliding-window `rate-limiter.ts`**
  Track timestamps in memory per key, clean up expired entries, and query dynamic limits from `securityRepo`.
- [ ] **Step 4: Integrate rate limiter into `/api/auth/pin-switch`, `/api/auth/login`, and `/api/queue/checkin`**
  Return HTTP 429 with `{ error: 'Too many attempts', retryAfter }` when limit is exceeded.
- [ ] **Step 5: Verify tests pass & commit**
  Run `bun test apps/api/tests/rate-limiter.test.ts` and commit.

---

### Task 4: Standardized 10-Digit Mobile Phone Engine & Multi-Country Support

**Files:**
- Create: `apps/api/src/security/phone-validator.ts`
- Modify: `apps/api/src/routes/queue.routes.ts` (constrain checkin/quick-add schemas)
- Modify: `apps/api/src/routes/salon.routes.ts` (constrain stylist/salon schemas)
- Modify: `apps/api/src/routes/auth.routes.ts` (constrain user registration schemas)
- Test: `apps/api/tests/phone-and-input-validation.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  interface PhoneValidationResult {
    isValid: boolean;
    normalizedPhone: string; // e.g. "+919876543210" (full E.164)
    countryCode: string;     // e.g. "+91"
    nationalNumber: string;  // strictly 10 digits: "9876543210"
    error?: string;
  }
  function parseAndValidateMobile(input: string, preferredCountryCode?: string): PhoneValidationResult
  function getSupportedCountryCodes(): Array<{ code: string; country: string; flag: string }>
  ```

- [ ] **Step 1: Write comprehensive test for 10-digit phone parser & multi-country codes**
  Test:
  - India (`+91`): `9876543210`, `+919876543210`, `+91 98765 43210`, `09876543210`.
  - Future International (`+1`, `+44`, `+971`): `+1 2025550143`, `+44 7911123456`.
  - Rejections: 9 digits, 11 digits without prefix, alphabetic characters, empty input.
  - Boundary limits: Schema tests ensuring `customerName` rejects strings $>80$ characters.
- [ ] **Step 2: Run test to verify failure**
  Run `bun test apps/api/tests/phone-and-input-validation.test.ts`.
- [ ] **Step 3: Implement `phone-validator.ts`**
  Implement regex-based country code extractor + strict 10-digit validator, stripping leading `0`, spaces, and punctuation.
- [ ] **Step 4: Update Elysia TypeBox schemas across API routes**
  Enforce `maxLength: 80` on names, `maxLength: 25` on phone, `maxLength: 100` on slugs, and call `parseAndValidateMobile` to guarantee clean data storage in MySQL.
- [ ] **Step 5: Verify tests pass & commit**
  Run `bun test apps/api/tests/phone-and-input-validation.test.ts` and commit.

---

### Task 5: Client Portal Input Boundaries, Country Code Selectors & Stored XSS Neutralization

**Files:**
- Create: `apps/api/src/public/security-utils.js` (shared `escapeHtml`, `validateMobile10Digit`, country code lists)
- Modify: `apps/api/src/public/customer.html`
- Modify: `apps/api/src/public/desk.html`
- Modify: `apps/api/src/public/barber.html`
- Modify: `apps/api/src/public/staff.html`
- Modify: `apps/api/src/public/tv.html`
- Modify: `apps/api/src/public/admin.html`
- Test: `apps/api/tests/portal-xss.test.ts`

- [ ] **Step 1: Create `security-utils.js`**
  Implement `escapeHtml(str)`, `sanitizeInput(str, maxLength)`, and `format10DigitMobileInput(inputElement, countrySelectElement)` with unit tests.
- [ ] **Step 2: Include `security-utils.js` in all portal HTML files**
  Include in `tv.html`, `desk.html`, `barber.html`, `staff.html`, `customer.html`, `admin.html`.
- [ ] **Step 3: Add Country Code Selectors & 10-Digit Phone Inputs**
  In check-in and desk forms, add `<select id="countryCode">` (with `+91 🇮🇳` pre-selected, plus `+1 🇺🇸`, `+44 🇬🇧`, `+971 🇦🇪`) and phone input with `maxlength="10"`, `inputmode="numeric"`, `pattern="[0-9]{10}"`.
- [ ] **Step 4: Neutralize DOM `.innerHTML` interpolation**
  Wrap all dynamic fields (`customerName`, `serviceName`, `ticketNumber`, `id`) in `escapeHtml()`. Replace inline `onclick="seatTicket('${t.id}')"` with `data-id="${escapeHtml(t.id)}"`.
- [ ] **Step 5: Add HTML form input restrictions**
  Add `maxlength="80"` on name inputs across all portal forms.
- [ ] **Step 6: Verify portal XSS immunity & commit**
  Run `bun test apps/api/tests/portal-xss.test.ts` and commit.

---

### Task 6: CSPRNG Entity IDs & Zod Supply Chain Patch

**Files:**
- Modify: `apps/api/src/auth/auth-service.ts`
- Modify: `package.json` / `bun.lock`
- Test: `bun audit` & `bun test`

- [ ] **Step 1: Replace `Math.random()` in `auth-service.ts`**
  Use `crypto.randomUUID()` for user IDs (`usr-${crypto.randomUUID().slice(0,8)}`) and session IDs (`sess-${crypto.randomUUID()}`).
- [ ] **Step 2: Run `bun audit fix` or update Zod in monorepo**
  Resolve `GHSA-mrhx-c7xc-m3w5`.
- [ ] **Step 3: Run full regression tests**
  Run `bun test`.
- [ ] **Step 4: Run Semgrep SAST scan to verify clean baseline**
  Run `uvx semgrep scan --config "p/owasp-top-ten" --config "p/typescript" --config "p/react" apps`.
- [ ] **Step 5: Final commit**
  `git commit -m "security: finalize CSPRNG migration, supply chain patches, and full audit pass"`

---
