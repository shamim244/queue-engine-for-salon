# Integration Blueprint: Partner System with Existing Codebase

| Scope | Existing Files Impacted | New Modules Integrated |
| :--- | :--- | :--- |
| **Tenant Onboarding** | `apps/web/lib/onboarding.ts`<br>`apps/web/app/admin/onboarding/page.tsx`<br>`apps/web/components/admin/onboarding/step-salon-identity.tsx`<br>`apps/api/src/db/repositories/salon.repo.ts` | Partner attribution capture & 30-day cookie detection |
| **Queue & Ticket Lifecycle** | `apps/api/src/db/repositories/queue.repo.ts`<br>`apps/api/src/engine/queue-engine.ts` | 15-Ticket Qualification Milestone tracking |
| **Billing & Subscription** | `apps/api/src/db/repositories/plan.repo.ts`<br>`apps/api/src/routes/plan.routes.ts` | Net-Amount Commission calculation & Wallet Ledger credit |
| **Navigation & Auth** | `apps/web/components/header.tsx`<br>`apps/api/src/routes/auth.routes.ts` | `/partner` and `/admin/partners` route guards |

---

## 1. Onboarding Integration (`apps/web` & `apps/api`)

### 1.1 Data Contract Evolution
In `apps/web/lib/onboarding.ts` and `apps/api/src/engine/types.ts`:

```typescript
export interface OnboardingFormData {
  // Existing fields
  name: string;
  slug: string;
  phone: string;
  tier?: "STARTER" | "PRO" | "ENTERPRISE";
  ownerUser: OwnerUserInput;
  stylists: StylistInput[];
  services: ServiceInput[];

  // NEW: Partner Attribution Extension
  partnerCode?: string; // Captured from ?ref= or manual entry
}

export interface OnboardSalonPayload {
  // Existing fields
  salonName?: string;
  name?: string;
  slug?: string;
  phone: string;
  tier?: SubscriptionTier;
  ownerUser: any;
  stylists: any[];
  services: any[];

  // NEW: Partner Attribution Extension
  partnerCode?: string;
}
```

### 1.2 Frontend Wizard Integration (`apps/web/app/admin/onboarding/page.tsx`)
1. **Query Param & Cookie Extraction:**
   When the onboarding wizard mounts, it checks for a referral attribution tag:
   ```typescript
   useEffect(() => {
     const refCode = searchParams.get("ref") || searchParams.get("partner") || getCookie("partner_ref");
     if (refCode) {
       setFormData((prev) => ({ ...prev, partnerCode: refCode.trim().toUpperCase() }));
     }
   }, [searchParams]);
   ```
2. **Step 1 (Salon Identity) UI Extension:**
   In `StepSalonIdentity`, an optional collapsible or visible field:
   `"Partner / Referral Code (Optional)"`
   - If pre-filled via link: Displays a locked badge `🎟️ Referred by Partner: [CODE]`.
   - If entered manually: Calls `GET /api/v1/partners/verify-code?code=...` to display `✅ Verified Partner: Amit Verma (Bareilly)`.

### 1.3 Backend Atomic Attribution (`apps/api/src/db/repositories/salon.repo.ts`)
Inside `onboardSalon()`, immediately after creating the salon:
```typescript
// Existing salon creation:
const salon = await this.createSalon({ ... });

// NEW: Partner Attribution Hook
if (payload.partnerCode) {
  const { partnerRepo } = await import('./partner.repo');
  const partner = await partnerRepo.getPartnerByCode(payload.partnerCode);
  if (partner && partner.status === 'ACTIVE') {
    await partnerRepo.createAttribution({
      partnerId: partner.id,
      salonId: salon.id,
      source: 'PROMO_CODE',
      qualificationStatus: 'UNQUALIFIED'
    });

    // Notify Partner via in-app notification
    await partnerRepo.createNotification({
      partnerId: partner.id,
      title: 'New Salon Onboarded!',
      message: `${salon.name} has registered using your partner code.`,
      type: 'SALON_JOINED'
    });
  }
}
```

---

## 2. Queue Engine Qualification Integration (`queue.repo.ts`)

To prevent fake salon abuse, a partner's bounty and commission remain locked until the salon completes **15 real customer tickets**.

### 2.1 Hooking into Ticket Completion
Inside `apps/api/src/db/repositories/queue.repo.ts`, when `completeService(ticketId)` or `updateTicketStatus(ticketId, 'COMPLETED')` is called:

```typescript
// Existing logic:
ticket.status = 'COMPLETED';
ticket.completedAt = new Date();

// NEW: Trigger Milestone Evaluator
const { partnerRepo } = await import('./partner.repo');
await partnerRepo.incrementSalonTicketCount(ticket.salonId);
```

### 2.2 Milestone Unlocking Logic in `partner.repo.ts`
```typescript
async incrementSalonTicketCount(salonId: string): Promise<void> {
  const attribution = await this.getAttributionBySalonId(salonId);
  if (!attribution || attribution.qualificationStatus === 'QUALIFIED') return;

  attribution.ticketsCompletedCount += 1;

  if (attribution.ticketsCompletedCount >= 15) {
    attribution.qualificationStatus = 'QUALIFIED';
    await this.updateAttribution(attribution);

    // Release all PENDING_LOCK ledger entries to AVAILABLE balance
    await this.unlockPendingLedgerEntries(attribution.partnerId, salonId);

    // Notify partner
    await this.createNotification({
      partnerId: attribution.partnerId,
      title: 'Milestone Unlocked! 🚀',
      message: `A salon you referred just completed 15 tickets. All locked earnings are now available for withdrawal!`,
      type: 'QUALIFIED'
    });
  }
}
```

---

## 3. Subscription Billing & Commission Integration (`plan.repo.ts`)

Whenever a salon purchases or renews an organization plan (`STARTER`, `PRO`, `ENTERPRISE`):

### 3.1 Net-Revenue Formula Enforcement
Inside the plan payment handler:
```typescript
export async function processPlanPayment(payload: {
  salonId: string;
  grossAmount: number;
  discountAmount: number;
  paymentReference: string;
}) {
  const netPaidAmount = Math.max(0, payload.grossAmount - payload.discountAmount);

  // 1. If 100% discount, zero commission generated
  if (netPaidAmount <= 0) {
    return { commissionEarned: 0, reason: "100% Free / Discounted Plan" };
  }

  // 2. Lookup attribution
  const { partnerRepo } = await import('./partner.repo');
  const attribution = await partnerRepo.getAttributionBySalonId(payload.salonId);
  if (!attribution) return { commissionEarned: 0, reason: "No partner attribution" };

  const partner = await partnerRepo.getPartnerById(attribution.partnerId);
  if (!partner || partner.status !== 'ACTIVE' || partner.isCommissionPaused) {
    return { commissionEarned: 0, reason: "Partner inactive or paused" };
  }

  // 3. Check Duration Window
  if (attribution.commissionExpiresAt && new Date() > attribution.commissionExpiresAt) {
    return { commissionEarned: 0, reason: "Recurring commission period expired" };
  }

  // 4. Calculate Net Commission
  const commission = Number((netPaidAmount * (partner.commissionPercent / 100)).toFixed(2));

  // 5. If this is first paid plan, immediately qualify the salon!
  if (attribution.qualificationStatus === 'UNQUALIFIED') {
    attribution.qualificationStatus = 'QUALIFIED';
    attribution.firstPaidPlanAt = new Date();
    await partnerRepo.updateAttribution(attribution);
    await partnerRepo.unlockPendingLedgerEntries(partner.id, payload.salonId);
  }

  // 6. Record in Ledger
  await partnerRepo.addLedgerEntry({
    partnerId: partner.id,
    salonId: payload.salonId,
    transactionType: 'COMMISSION_CREDIT',
    grossPlanAmount: payload.grossAmount,
    discountAmount: payload.discountAmount,
    netPaidAmount: netPaidAmount,
    commissionAmount: commission,
    balanceType: 'AVAILABLE',
    description: `Subscription Commission (${partner.commissionPercent}%)`,
    referenceId: payload.paymentReference
  });

  // 7. In-App Notification
  await partnerRepo.createNotification({
    partnerId: partner.id,
    title: 'Commission Credited! 💰',
    message: `₹${commission} credited to your wallet from subscription payment.`,
    type: 'EARNING_CREDITED'
  });
}
```

---

## 4. Zero Server Waste & Performance Standards (Rule 1 & Rule 2)

1. **Client-Side QR Code Generation:**  
   The Partner Panel will render referral QR codes on client `<canvas>` using `qrcode` or inline SVGs. The server never generates or streams image files.
2. **Sub-50ms Dashboard Response:**  
   Partner wallet summaries and referred salon counts are cached in-memory with instant cache invalidation on ledger writes.
3. **No Polling Loops:**  
   In-app notifications and wallet updates use existing WebSockets or standard client-side revalidation. No background server timer loops.
