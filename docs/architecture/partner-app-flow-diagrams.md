# Complete Application Flow & Architecture Blueprint (v2.0)
## Universal Onboarding & Partner Platform

| Document Type | Target | Status |
| :--- | :--- | :--- |
| **App Flow & Sequence Architecture** | Web (`apps/web`), API (`apps/api`) | Complete & Verified |

---

## 1. URL Architecture & Namespace Segregation

1. **Salon Business Portal (Owners & Stylists):**
   - Moved to a dedicated **`/salon/login`** (and accessible via **`/owner/login`** and **`/staff/login`**).
   - Dedicated exclusively to salon operations, chair management, appointments, and billing.

2. **Affiliate & Promoter Network (100% Reserved at `/partner`):**
   - The entire **`/partner/*`** namespace is reclaimed exclusively for Field Partners, Online Creators, and Growth Affiliates:
     - `/partner/join` ──► Public application form
     - `/partner/login` ──► Enterprise multi-identifier partner login (Email/Phone/Username + Password)
     - `/partner` ──► Executive partner dashboard & wallet
     - `/partner/onboard` ──► Universal Onboarding Wizard in `PARTNER` mode
     - `/partner/salons` ──► Referred salons directory & live ticket milestones
     - `/partner/wallet` ──► Double-entry earnings ledger & instant 1-tap withdrawal
     - `/partner/marketing` ──► Pitch decks, scripts, and printable QR standees
     - `/partner/profile` ──► 360° profile & saved payout methods (UPI + full Bank details)

---

## 2. Universal Onboarding Sequence (`<UniversalSalonOnboardingWizard />`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Salon Owner / Field Partner
    participant Wizard as Universal Wizard UI
    participant API as Core Engine API (:3001)
    participant DB as Persistence Authority (MySQL)

    Note over User,Wizard: Step 1: Salon Information
    User->>Wizard: Enters Salon Name ("Aura Salon"), Phone, City
    Wizard->>Wizard: Auto-generates clean slug ("aura-salon")

    Note over User,Wizard: Step 2: Owner Credentials
    User->>Wizard: Enters Owner Name, Username ("aura_owner"), Password
    Wizard->>Wizard: Validates password strength (min 6 chars)

    Note over User,Wizard: Step 3: Plan Selection & Partner Discount
    User->>Wizard: Selects Plan (e.g., PRO Plan @ ₹999/mo)
    alt Arrived via ?ref= or Mode == PARTNER
        Wizard->>Wizard: Pre-fills and locks Partner Code (e.g., AMIT20)
    else Direct Public Registration
        User->>Wizard: Enters Referral Code (e.g., AMIT20)
    end
    Wizard->>API: GET /api/v1/partners/verify-code?code=AMIT20&plan=PRO
    API-->>Wizard: Returns Partner Name + 10% Discount Quote (Save ₹99.90)
    Wizard->>Wizard: Displays "Special 10% Partner Discount applied!"

    Note over User,Wizard: Step 4: Summary & Launch
    Wizard->>Wizard: Renders Net Bill: Gross ₹999 - Discount ₹99.90 = Net ₹899.10
    User->>Wizard: Clicks "Complete Onboarding & Launch Salon"
    Wizard->>API: POST /api/admin/onboard (Payload includes ownerUser, planTier, partnerCode)
    API->>DB: Atomically provisions Organization, Salon, Stylists, Services, & Owner Account
    API->>DB: Attaches partner attribution (Status: UNQUALIFIED)
    API-->>Wizard: Success: Salon & Owner Provisioned!
    Wizard->>User: Renders Instant Door QR Standee & Redirects to /owner/login
```

---

## 3. Enterprise Multi-Identifier Partner Login Flow

```mermaid
sequenceDiagram
    autonumber
    actor Partner as Field Partner / Creator
    participant LoginUI as Partner Login (/partner/login)
    participant AuthAPI as Partner Auth Route
    participant DB as MySQL Database

    Partner->>LoginUI: Inputs Identifier (Email / Phone / Username) + Password
    LoginUI->>AuthAPI: POST /api/v1/partners/login { identifier, password }
    AuthAPI->>DB: SELECT * FROM partners WHERE email = ? OR phone = ? OR referral_code = ?
    alt Partner not found
        AuthAPI-->>LoginUI: 401 Unauthorized ("Invalid credentials")
    else Partner found but status == PENDING_REVIEW
        AuthAPI-->>LoginUI: 403 Forbidden ("Account is pending Super Admin review")
    else Partner found & status == ACTIVE
        AuthAPI->>AuthAPI: Bun.password.verify(password, partner.password_hash)
        alt Password Mismatch
            AuthAPI-->>LoginUI: 401 Unauthorized ("Invalid credentials")
        else Password Valid
            AuthAPI->>AuthAPI: Generate Secure Session Token
            AuthAPI-->>LoginUI: 200 OK { token, partner }
            LoginUI->>Partner: Redirects to /partner Dashboard
        end
    end
```

---

## 4. Separation of Payout Profiles vs Withdrawal Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor Partner as Partner
    participant ProfileUI as Profile Settings (/partner/profile)
    participant WalletUI as Payout Desk (/partner/wallet)
    participant API as Core API Engine
    participant Admin as Super Admin

    Note over Partner,ProfileUI: 1. Setup Phase (Profile Settings)
    Partner->>ProfileUI: Configures Payout Methods:
    ProfileUI->>ProfileUI: Validates IFSC Regex: ^[A-Z]{4}0[A-Z0-9]{6}$
    ProfileUI->>API: PUT /api/v1/partners/me/payout-methods
    API->>API: Updates Bank Name, Holder Name, Acc No, IFSC, Acc Type, UPI ID
    API-->>ProfileUI: 200 OK ("Payout methods saved successfully")

    Note over Partner,WalletUI: 2. Execution Phase (Wallet Withdrawal)
    Partner->>WalletUI: Clicks "Request Withdrawal"
    WalletUI->>API: GET /api/v1/partners/me/wallet
    API-->>WalletUI: Returns Available Balance (₹2,500) + Saved Payout Methods
    WalletUI->>WalletUI: Renders Method Selector (● UPI: amit@upi | ○ Bank: HDFC ...5678)
    Partner->>WalletUI: Selects Option & Inputs Amount (₹1,000)
    WalletUI->>API: POST /api/v1/partners/me/payout { amount: 1000, payoutMethod: "UPI" }
    Note over API: Backend fetches verified UPI ID from database (No client account injection!)
    API->>API: Atomic Balance Check & Debit Wallet (Available drops from ₹2,500 to ₹1,500)
    API-->>WalletUI: 201 Created (Payout Status: REQUESTED)

    Note over Admin,API: 3. Settlement Phase (Super Admin)
    Admin->>API: POST /api/v1/admin/partners/payouts/:id/settle { utrReference: "HDFC-998877" }
    API->>API: Payout Status -> PAID (Logged in Immutable Ledger)
```

---

## 5. Screen Navigation & Component Hierarchy Map

```
apps/web/
├── app/
│   ├── (Public Self-Serve)
│   │   ├── /register ───────────────► Universal Onboarding Wizard (mode="PUBLIC")
│   │   ├── /login ──────────────────► Customer Login
│   │   └── /salon/login ────────────► Dedicated Salon Business Login (Owner & Stylists)
│   │
│   ├── partner/ (Affiliate & Growth Panel)
│   │   ├── layout.tsx ──────────────► Enterprise Panel Shell (Sidebar, Topbar, Wallet Pill)
│   │   ├── page.tsx ────────────────► Executive Dashboard (KPIs, Referral Link, QR Card)
│   │   ├── join/page.tsx ───────────► Public Partner Application with Password Setup
│   │   ├── login/page.tsx ──────────► Enterprise Multi-Identifier Login (AuthCardLayout)
│   │   ├── onboard/page.tsx ────────► Universal Onboarding Wizard (mode="PARTNER")
│   │   ├── salons/page.tsx ─────────► Referred Salons Directory & Ticket Milestones
│   │   ├── wallet/page.tsx ─────────► Real-time Ledger & 1-Tap Option-Based Withdrawal
│   │   ├── marketing/page.tsx ──────► Pitch Decks, 60s Script & Printable Counter Standees
│   │   └── profile/page.tsx ────────► Profile & Saved Payout Methods (UPI + Full Bank)
│   │
│   └── admin/ (Super Admin Governance)
│       ├── onboarding/page.tsx ─────► Universal Onboarding Wizard (mode="ADMIN")
│       └── partners/ ───────────────► Partner Directory, Contract Editor, & Payout Desk
│
└── components/
    └── onboarding/
        ├── universal-onboarding-wizard.tsx ──► The Core 4-Step Universal Engine
        ├── step-salon-info.tsx ──────────────► Step 1: Salon Identity & Location
        ├── step-owner-account.tsx ───────────► Step 2: Owner User Credentials
        ├── step-plan-selection.tsx ──────────► Step 3: Plans + Live Partner Discount
        └── step-launch-summary.tsx ──────────► Step 4: Net Bill & Instant Activation
```
