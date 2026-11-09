# Product Requirements Document (PRD): Universal Pluggable Payment Gateway Engine

## 1. Document Overview
- **Feature Name:** Universal Pluggable Payment Gateway Engine
- **Target Subsystem:** Multi-Provider Payment Settlement & Checkout Processing
- **Target Users:** Salon Owners (Subscribing to SaaS Plans) & Salon Customers (Paying for Services)
- **Status:** Approved for Implementation

---

## 2. Problem Statement & Motivation
Currently, billing changes in `/owner/billing` immediately mutate organization tiers without collecting payment or creating an auditable ledger. Furthermore:
1. **No Real Settlement Infrastructure:** Salon owners cannot purchase subscriptions via India's ubiquitous UPI rail or test online cards.
2. **Coupling Risk:** Hardcoding a single gateway (e.g. Razorpay or Stripe) directly into UI routes makes future gateway migration or multi-gateway failover expensive and error-prone.
3. **Counter/Cash Realities:** Rural and semi-urban Indian salons operate heavily on cash and direct merchant UPI; an online-only payment flow fails in these environments.
4. **Client-Compute Requirement:** Server loops for checking payment timers violate Rule 1 (Zero Server Waste). QR code generation and session countdowns must run on client hardware.

---

## 3. Goals & Success Metrics
- **Pluggable Architecture:** Strict Adapter Pattern (`PaymentGatewayAdapter`) allowing new providers (PhonePe, Cashfree, Stripe, PayU) to be plugged in with zero route or UI rewrites.
- **Three Supported Core Methods:**
  1. **Dynamic NPCI UPI QR & Intent:** Client-side HTML5 canvas QR generation with prefilled VPA, exact order amount, and 1-tap Android UPI intent launcher.
  2. **Cash / Counter Pay:** 1-tap manual settlement with audit verification.
  3. **Razorpay Sandbox / Test Mode:** Standard online card/netbanking flow pre-configured with test credentials (`rzp_test_...`), instantly toggleable to live mode.
- **Audit-Proof Order Lifecycle:** Every payment creates a persistent `payment_orders` record (`PENDING` $\rightarrow$ `COMPLETED` / `FAILED` / `EXPIRED`).
- **Unified Checkout Experience:** Universal responsive modal supporting both B2B SaaS subscriptions and ready for salon customer service tickets.
- **Client-Compute Adherence:** 100% client-side QR rendering, client-side session countdowns, and client Web Audio celebration chimes.

---

## 4. User Personas & Core Workflows

### 4.1 Persona 1: Salon Owner Subscribing to a Plan
- **Goal:** Upgrade to a 3-month or 1-year subscription package and pay seamlessly using their UPI app (PhonePe / GooglePay / Paytm) on their smartphone.
- **Workflow:**
  1. Salon owner selects a plan and billing cycle (e.g., Growth Studio Pro - 3 Months at ₹2,157) on `/owner/billing`.
  2. Clicks **"Select Plan"** $\rightarrow$ Universal Payment Modal opens.
  3. Default tab **"UPI QR & App"** generates a dynamic NPCI QR code and shows order summary.
  4. On Android smartphone, owner taps **"Open UPI App (GPay / PhonePe / Paytm)"** $\rightarrow$ Deep-links directly into UPI app with exact amount.
  5. On desktop or tablet, owner scans the QR code with their phone.
  6. Owner taps **"Verify & Complete Payment"** (or enters transaction ref/UTR) $\rightarrow$ Backend verifies order.
  7. Modal shows success receipt with celebratory chime, and owner's subscription is activated immediately.

### 4.2 Persona 2: Admin or Salon Desk Operator (Cash / Counter Settlement)
- **Goal:** Record offline subscription payment or cash transaction.
- **Workflow:**
  1. Operator opens Universal Payment Modal and switches to **"Cash / Counter Pay"** tab.
  2. Reviews order details and enters optional note/receipt number.
  3. Taps **"Confirm Cash Settlement"**.
  4. Backend marks order `COMPLETED` with audit log, activating the subscription.

### 4.3 Persona 3: Tester / Developer (Razorpay Sandbox Mode)
- **Goal:** Validate card, netbanking, and simulated gateway failure/success flows.
- **Workflow:**
  1. Switches to **"Card / NetBanking"** tab.
  2. Taps **"Pay via Razorpay Sandbox"** $\rightarrow$ Standard checkout launches with dummy credentials.
  3. Successful response returns `razorpay_payment_id` and `razorpay_signature` $\rightarrow$ Backend verifies HMAC SHA256 and activates plan.

---

## 5. Functional Requirements

### 5.1 Pluggable Adapter Contracts
Every payment adapter must implement:
- `getProviderName()`: Returns `'UPI_QR' | 'CASH' | 'RAZORPAY'`.
- `createOrder(payload)`: Generates internal and provider-specific order details.
- `verifyPayment(payload)`: Validates payment completion, signature, or manual verification.

### 5.2 Order State Machine
- `PENDING`: Order created, awaiting user payment.
- `COMPLETED`: Payment verified, downstream fulfillment executed.
- `FAILED`: Payment failed or rejected.
- `EXPIRED`: Order not paid within 10 minutes.
- `REFUNDED`: Payment returned to customer/owner.

### 5.3 Automated Plan Activation Hook
When a payment order with `target_type: 'SUBSCRIPTION'` is verified:
1. Fetch target organization.
2. Calculate subscription period:
   - `1m`: 30 days from now (or extends from existing `expires_at` if currently active).
   - `3m`: 90 days.
   - `6m`: 180 days.
   - `1y`: 365 days.
3. Update `organizations.plan_id` and quotas.
4. Insert or update `organization_subscriptions` record.

---

## 6. Non-Functional Requirements
- **Mobile Touch Targets:** All action buttons and tab switches $\ge 48\text{px}$ touch target height.
- **Zero Server Waste:** No polling loops on the server. Client initiates verification request upon completion or timeout.
- **Sub-100ms Order Generation:** Fast order initialization with database connection pooling.
