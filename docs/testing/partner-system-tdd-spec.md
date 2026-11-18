# Test-Driven Development (TDD) Master Specification (v2.0)
## Universal Onboarding & Enterprise Partner Platform

| Test Runner | Engine | Assertions Framework | Total Test Cases |
| :--- | :--- | :--- | :--- |
| `bun test` | Bun Native Runtime | `describe`, `it`, `expect`, `beforeEach` | **38 Distinct Verification Scenarios** |

---

## 1. TDD Verification Matrix (Expanded)

| Test ID | Module / File | Scenario | Input / Precondition | Expected Output / Assertion |
| :--- | :--- | :--- | :--- | :--- |
| **T1.1** | `partner.repo.ts` | Partner Public Application | Valid details (`fullName`, `phone`, `city`, `password`) | Status = `PENDING_REVIEW`, Auto-generated unique `referralCode`, bcrypt `passwordHash` |
| **T1.2** | `partner.repo.ts` | Referral Code Sanitization | Name with spaces, special chars ("Amit K. Verma!") | Clean uppercase alphanumeric code (`AMITKVERMA`) |
| **T1.3** | `partner.repo.ts` | Duplicate Phone Check | Apply with existing phone number | Throws `400 Phone number already registered` |
| **T1.4** | `partner.repo.ts` | Super Admin Approval | Status `PENDING_REVIEW` -> Admin Approves | Status = `ACTIVE`, `updatedAt` updated |
| **T1.5** | `partner.repo.ts` | Super Admin Rejection | Status `PENDING_REVIEW` -> Admin Rejects | Status = `REJECTED`, Cannot log in or attribute salons |
| **T1.6** | `partner.repo.ts` | Commission Pause | Admin toggles pause ON | `isCommissionPaused = true`, subsequent transactions yield ₹0 |
| **T1.7** | `partner.repo.ts` | Commission Resume | Admin toggles pause OFF | `isCommissionPaused = false`, subsequent transactions accrue |
| **T1.8** | `partner.repo.ts` | Terms Modification | Update rate to 15%, duration to `3_MONTHS` | Updated parameters applied to future transactions only |
| **T2.1** | `commission-engine.ts` | Net Paid Calculation (Standard) | Gross ₹1,000, Coupon ₹200 (Net ₹800), Rate 10% | Commission = **₹80.00** |
| **T2.2** | `commission-engine.ts` | Net Paid Calculation (100% Free) | Gross ₹1,000, Coupon ₹1,000 (Net ₹0), Rate 10% | Commission = **₹0.00**, `isEligible = false` |
| **T2.3** | `commission-engine.ts` | Coupon Exceeds Gross Price | Gross ₹500, Coupon ₹600 (Negative) | Net Paid clamped to ₹0.00, Commission = **₹0.00** |
| **T2.4** | `commission-engine.ts` | Fractional Rupee Precision | Gross ₹799, Coupon ₹100 (Net ₹699), Rate 15% | Commission = **₹104.85** (Exact 2-decimal rounded) |
| **T2.5** | `commission-engine.ts` | Model A Flat Bounty Alone | Mode: `FLAT_BOUNTY`, Bounty ₹500, Net Paid ₹800 | Commission = **₹500.00** (Fixed, ignore percentage) |
| **T2.6** | `commission-engine.ts` | Hybrid Model (Model B + Model A) | Mode: `HYBRID`, Rate 10%, Bounty ₹300, Net ₹800 | Commission = ₹80.00 (Recurring) + ₹300.00 (Bounty) = **₹380.00** |
| **T2.7** | `commission-engine.ts` | Duration Expiry Enforcement | Current Date > `commissionExpiresAt` | Commission = **₹0.00**, Reason: "Duration expired" |
| **T2.8** | `commission-engine.ts` | Paused Partner Enforcement | `isCommissionPaused = true` | Commission = **₹0.00**, Reason: "Partner commission paused" |
| **T3.1** | `qualification.ts` | Unqualified Initial State | New salon onboarded via partner code | `qualificationStatus = 'UNQUALIFIED'`, tickets = 0 |
| **T3.2** | `qualification.ts` | Ticket Counter Increments | Customer completes ticket in queue | `ticketsCompletedCount` increments from $N$ to $N+1$ |
| **T3.3** | `qualification.ts` | Milestone 15-Ticket Unlock | Ticket count reaches 15 | `qualificationStatus = 'QUALIFIED'`, all `PENDING_LOCK` -> `AVAILABLE` |
| **T3.4** | `qualification.ts` | Milestone Paid Plan Unlock | Salon purchases paid plan with Net Paid > 0 | Immediately `QUALIFIED`, all `PENDING_LOCK` -> `AVAILABLE` |
| **T3.5** | `qualification.ts` | No Milestone on Free Trial | Salon claims 100% free / trial plan | Remains `UNQUALIFIED`, earnings remain in `PENDING_LOCK` |
| **T3.6** | `qualification.ts` | Idempotent Ticket Counting | Complete ticket twice (duplicate event) | Ticket counted only once, counter does not double-increment |
| **T4.1** | `wallet.repo.ts` | Minimum Withdrawal Threshold | Request payout of ₹300 (Threshold is ₹500) | Throws `400 Minimum withdrawal amount is ₹500` |
| **T4.2** | `wallet.repo.ts` | Insufficient Available Balance | Balance: Available ₹400, Locked ₹1,000. Req: ₹600 | Throws `400 Insufficient available balance` |
| **T4.3** | `wallet.repo.ts` | Payout Request Debit | Available ₹1,500. Request ₹1,000 | Available balance drops to ₹500, Payout Status: `REQUESTED` |
| **T4.4** | `wallet.repo.ts` | Admin Settle Payout | Super Admin inputs UTR reference | Payout Status: `PAID`, `utrReference` saved, `settledAt` logged |
| **T4.5** | `wallet.repo.ts` | Admin Reject Payout | Super Admin rejects payout request | Payout Status: `REJECTED`, ₹1,000 refunded to Available balance |
| **T5.1** | `e2e-integration.ts` | Complete End-to-End Flow | Full lifecycle from signup to UTR payout | All subsystems coordinate with zero balance drift |
| **T6.1** | `partner-auth.test.ts`| Login via Mobile Phone + Password | Identifier: `+919876543210` + valid password | 200 OK + Bearer session token |
| **T6.2** | `partner-auth.test.ts`| Login via Email + Password | Identifier: `amit@example.com` + valid password | 200 OK + Bearer session token |
| **T6.3** | `partner-auth.test.ts`| Login via Referral Code + Password | Identifier: `AMIT20` + valid password | 200 OK + Bearer session token |
| **T6.4** | `partner-auth.test.ts`| Login with Invalid Password | Identifier: `AMIT20` + wrong password | 401 Unauthorized ("Invalid credentials") |
| **T6.5** | `partner-auth.test.ts`| Login while Pending Approval | Partner status is `PENDING_REVIEW` | 403 Forbidden ("Account is pending Super Admin review") |
| **T7.1** | `bank-schema.test.ts` | Valid Indian Bank Account Setup | Complete details (HDFC, Holder, Acc, IFSC, Savings) | 200 OK, saved to partner profile |
| **T7.2** | `bank-schema.test.ts` | Invalid IFSC Code Rejection | IFSC: `HDFC000` (Too short) | Throws `400 Invalid IFSC Code format` |
| **T7.3** | `bank-schema.test.ts` | Option-Based Payout Selection | User chooses `payoutMethod: 'BANK_TRANSFER'` | Reads verified details from DB; rejects if bank account not configured |
| **T8.1** | `wizard-discount.test.ts`| Verify Valid Code & Quote Discount | Query `code=AMIT20&plan=PRO` (₹999) | `isValid: true`, discount: 10% (₹99.90), net: ₹899.10 |
| **T8.2** | `wizard-discount.test.ts`| Verify Inactive/Fake Code | Query `code=FAKE99` | `isValid: false`, discount: 0, error message returned |

---

## 2. Executable TDD Suites for the 7 Enhancements

### 2.1 Test Suite 6: Multi-Identifier Partner Authentication
File: `apps/api/test/partner/partner-multi-auth.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

describe('Suite 6: Multi-Identifier Partner Authentication', () => {
  let partnerId: string;
  const rawPassword = 'SecretPassword@123';

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
    const p = await partnerRepo.createPartnerApplication({
      fullName: 'Vikram Malhotra',
      phone: '+919876543210',
      email: 'vikram@growth.in',
      city: 'Delhi',
      persona: 'GROUND_HUSTLER',
      password: rawPassword,
    });
    partnerId = p.id;
    // Approve for login testing
    await partnerRepo.updatePartnerStatus(partnerId, 'ACTIVE');
  });

  it('T6.1: should authenticate successfully using 10-digit mobile phone and password', async () => {
    const res = await partnerRepo.authenticatePartner({
      identifier: '+919876543210',
      password: rawPassword,
    });
    expect(res.success).toBe(true);
    expect(res.partner?.id).toBe(partnerId);
  });

  it('T6.2: should authenticate successfully using email address and password', async () => {
    const res = await partnerRepo.authenticatePartner({
      identifier: 'vikram@growth.in',
      password: rawPassword,
    });
    expect(res.success).toBe(true);
    expect(res.partner?.id).toBe(partnerId);
  });

  it('T6.3: should authenticate successfully using referral code and password', async () => {
    const partner = await partnerRepo.getPartnerById(partnerId);
    const res = await partnerRepo.authenticatePartner({
      identifier: partner!.referralCode,
      password: rawPassword,
    });
    expect(res.success).toBe(true);
    expect(res.partner?.id).toBe(partnerId);
  });

  it('T6.4: should reject login when password is incorrect', async () => {
    expect(async () => {
      await partnerRepo.authenticatePartner({
        identifier: 'vikram@growth.in',
        password: 'WrongPassword',
      });
    }).toThrow('Invalid credentials');
  });

  it('T6.5: should reject login if partner account is still in PENDING_REVIEW', async () => {
    const pendingP = await partnerRepo.createPartnerApplication({
      fullName: 'Pending Applicant',
      phone: '+919876543299',
      email: 'pending@growth.in',
      city: 'Pune',
      persona: 'CREATOR',
      password: rawPassword,
    });

    expect(async () => {
      await partnerRepo.authenticatePartner({
        identifier: 'pending@growth.in',
        password: rawPassword,
      });
    }).toThrow('Account is pending Super Admin review');
  });
});
```

---

### 2.2 Test Suite 7: Indian Bank Schema & Option-Based Payouts
File: `apps/api/test/partner/partner-bank-payout.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

describe('Suite 7: Indian Bank Schema & Option-Based Payouts', () => {
  let partnerId: string;

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
    const p = await partnerRepo.createPartnerApplication({
      fullName: 'Sunita Rao',
      phone: '+919811223344',
      city: 'Bengaluru',
      persona: 'DEDICATED',
      password: 'Password123',
    });
    partnerId = p.id;
    await partnerRepo.updatePartnerStatus(partnerId, 'ACTIVE');
    await partnerRepo.creditDirectBalance(partnerId, 3000);
  });

  it('T7.1: should validate and save complete Indian banking details into profile', async () => {
    const updated = await partnerRepo.updatePayoutMethods(partnerId, {
      payoutUpiId: 'sunita@okaxis',
      payoutHolderName: 'Sunita Rao',
      payoutBankName: 'State Bank of India',
      payoutBankAccount: '302010405060',
      payoutBankIfsc: 'SBIN0001234',
      payoutAccountType: 'SAVINGS',
    });

    expect(updated.payoutBankName).toBe('State Bank of India');
    expect(updated.payoutBankIfsc).toBe('SBIN0001234');
    expect(updated.payoutAccountType).toBe('SAVINGS');
  });

  it('T7.2: should reject invalid IFSC code format', async () => {
    expect(async () => {
      await partnerRepo.updatePayoutMethods(partnerId, {
        payoutBankIfsc: 'INVALID_IFSC_123',
      });
    }).toThrow('Invalid IFSC Code format');
  });

  it('T7.3: should execute withdrawal by selecting saved Bank Account without client account injection', async () => {
    // Setup saved bank account
    await partnerRepo.updatePayoutMethods(partnerId, {
      payoutHolderName: 'Sunita Rao',
      payoutBankName: 'HDFC Bank',
      payoutBankAccount: '501009988776',
      payoutBankIfsc: 'HDFC0000456',
      payoutAccountType: 'CURRENT',
    });

    // Execute payout by selecting option
    const payout = await partnerRepo.requestPayoutByOption({
      partnerId,
      amount: 1500,
      payoutMethod: 'BANK_TRANSFER',
    });

    expect(payout.status).toBe('REQUESTED');
    expect(payout.payoutTarget).toContain('HDFC0000456');
    expect(payout.payoutTarget).toContain('501009988776');

    const wallet = await partnerRepo.getWalletBalance(partnerId);
    expect(wallet.availableBalance).toBe(1500); // 3000 - 1500
  });
});
```

---

### 2.3 Test Suite 8: Universal Wizard Bilateral Discount Engine
File: `apps/api/test/partner/universal-wizard-discount.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

describe('Suite 8: Universal Wizard Bilateral Discount Engine', () => {
  let referralCode: string;

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
    const p = await partnerRepo.createPartnerApplication({
      fullName: 'Kishore Kumar',
      phone: '+919988112233',
      city: 'Bhopal',
      persona: 'CREATOR',
      password: 'Password123',
    });
    referralCode = p.referralCode;
    await partnerRepo.updatePartnerStatus(p.id, 'ACTIVE');
  });

  it('T8.1: should verify valid partner code and quote exact 10% discount on PRO plan', async () => {
    const quote = await partnerRepo.quoteReferralDiscount({
      partnerCode: referralCode,
      planTier: 'PRO',
      basePrice: 999,
    });

    expect(quote.isValid).toBe(true);
    expect(quote.discountPercent).toBe(10);
    expect(quote.discountAmount).toBe(99.90);
    expect(quote.netPayableAmount).toBe(899.10);
    expect(quote.partnerName).toBe('Kishore Kumar');
  });

  it('T8.2: should return invalid response for fake or non-existent partner code', async () => {
    const quote = await partnerRepo.quoteReferralDiscount({
      partnerCode: 'NONEXISTENT99',
      planTier: 'PRO',
      basePrice: 999,
    });

    expect(quote.isValid).toBe(false);
    expect(quote.discountAmount).toBe(0);
    expect(quote.netPayableAmount).toBe(999);
  });
});
```
