import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { partnerRoutes, adminPartnerRoutes } from '../../src/routes/partner.routes';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

const app = new Elysia().use(partnerRoutes).use(adminPartnerRoutes);

describe('Phase 2 API Endpoints: Partner & Admin Governance', () => {
  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  it('should apply, verify, login, and fetch profile', async () => {
    // 1. Apply
    const applyRes = await app.handle(
      new Request('http://localhost/api/v1/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Mohit Bansal',
          phone: '+919988776655',
          email: 'mohit@example.com',
          city: 'Agra',
          persona: 'GROUND_HUSTLER',
          payoutUpiId: 'mohit@upi',
        }),
      })
    );
    expect(applyRes.status).toBe(200);
    const applyData = await applyRes.json();
    expect(applyData.success).toBe(true);
    expect(applyData.partner.status).toBe('PENDING_REVIEW');
    const partnerId = applyData.partner.id;
    const referralCode = applyData.partner.referralCode;

    // 2. Login before approval should be forbidden
    const loginPendingRes = await app.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919988776655' }),
      })
    );
    expect(loginPendingRes.status).toBe(403);

    // 3. Admin Approves Partner
    const approveRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/partners/${partnerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
    );
    expect(approveRes.status).toBe(200);

    // 4. Login after approval succeeds
    const loginActiveRes = await app.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919988776655' }),
      })
    );
    expect(loginActiveRes.status).toBe(200);
    const loginData = await loginActiveRes.json();
    expect(loginData.success).toBe(true);
    expect(loginData.partner.status).toBe('ACTIVE');

    // 5. Verify Referral Code
    const verifyRes = await app.handle(
      new Request(`http://localhost/api/v1/partners/verify-code?code=${referralCode}`)
    );
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.valid).toBe(true);
    expect(verifyData.partner.fullName).toBe('Mohit Bansal');

    // 6. Fetch /me Profile with x-partner-id
    const meRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me', {
        headers: { 'x-partner-id': partnerId },
      })
    );
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.success).toBe(true);
    expect(meData.partner.id).toBe(partnerId);
    expect(meData.wallet.availableBalance).toBe(0);

    // 7. Fetch /me Profile strictly using Bearer Token (no x-partner-id)
    const meBearerRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me', {
        headers: { Authorization: `Bearer ${loginData.token}` },
      })
    );
    expect(meBearerRes.status).toBe(200);
    const meBearerData = await meBearerRes.json();
    expect(meBearerData.success).toBe(true);
    expect(meBearerData.partner.id).toBe(partnerId);
    expect(meBearerData.partner.fullName).toBe('Mohit Bansal');
  });

  it('should support assisted onboarding and wallet withdrawal workflow', async () => {
    // 1. Setup active partner with hybrid terms
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Ramesh Field Agent',
      phone: '+919876500001',
      email: 'ramesh.agent@example.com',
      city: 'Bhopal',
      persona: 'GROUND_HUSTLER',
      payoutUpiId: 'ramesh@upi',
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');
    await partnerRepo.updateCommissionTerms(partner.id, {
      commissionModel: 'HYBRID',
      commissionPercent: 15.0,
      bountyAmount: 500.0,
    });

    // 2. Assisted Onboarding
    const onboardRes = await app.handle(
      new Request('http://localhost/api/v1/partners/assisted-onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-partner-id': partner.id,
        },
        body: JSON.stringify({
          salonName: 'Royal Bhopal Gents Salon',
          ownerPhone: '+919876599999',
          ownerName: 'Shahid Khan',
        }),
      })
    );
    expect(onboardRes.status).toBe(200);
    const onboardData = await onboardRes.json();
    expect(onboardData.success).toBe(true);
    const salonId = onboardData.salon.id;

    // 3. Check referred salons API
    const salonsRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me/salons', {
        headers: { 'x-partner-id': partner.id },
      })
    );
    expect(salonsRes.status).toBe(200);
    const salonsData = await salonsRes.json();
    expect(salonsData.salons.length).toBe(1);
    expect(salonsData.salons[0].salonName).toBe('Royal Bhopal Gents Salon');
    expect(salonsData.salons[0].source).toBe('ASSISTED_ONBOARDING');

    // 4. Trigger subscription payment to unlock bounty + add commission
    await partnerRepo.processSubscriptionPayment({
      salonId,
      grossAmount: 2000,
      discountAmount: 0,
      paymentReference: 'PAY_BHOPAL_001',
    });

    // Bounty ₹500 + 15% of ₹2000 (₹300) = ₹800 Available
    const wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.availableBalance).toBe(800);

    // 5. Request Payout via API
    const payoutRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-partner-id': partner.id,
        },
        body: JSON.stringify({
          amount: 600,
          payoutMethod: 'UPI',
          payoutTarget: 'ramesh@upi',
        }),
      })
    );
    expect(payoutRes.status).toBe(200);
    const payoutData = await payoutRes.json();
    expect(payoutData.payout.amount).toBe(600);
    expect(payoutData.wallet.availableBalance).toBe(200);
    const payoutId = payoutData.payout.id;

    // 6. Admin lists payouts
    const adminPayoutsRes = await app.handle(
      new Request('http://localhost/api/v1/admin/partners/payouts')
    );
    expect(adminPayoutsRes.status).toBe(200);
    const adminPayoutsData = await adminPayoutsRes.json();
    expect(adminPayoutsData.payouts.some((p: any) => p.id === payoutId)).toBe(true);

    // 7. Admin settles payout with UTR
    const settleRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/partners/payouts/${payoutId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utrReference: 'BHOPAL-UTR-112233',
          adminNotes: 'Direct UPI Settled',
        }),
      })
    );
    expect(settleRes.status).toBe(200);
    const settleData = await settleRes.json();
    expect(settleData.payout.status).toBe('PAID');
    expect(settleData.payout.utrReference).toBe('BHOPAL-UTR-112233');

    // 8. Partner Ledger Endpoint
    const ledgerRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me/ledger', {
        headers: { 'x-partner-id': partner.id },
      })
    );
    expect(ledgerRes.status).toBe(200);
    const ledgerData = await ledgerRes.json();
    expect(ledgerData.wallet.totalWithdrawn).toBe(600);
    expect(ledgerData.wallet.availableBalance).toBe(200);
  });

  it('should support Phase 2 multi-identifier login, live discount quote, and payout method profile setup', async () => {
    // 1. Apply with password
    const applyRes = await app.handle(
      new Request('http://localhost/api/v1/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Ananya Sharma',
          phone: '+919876501234',
          email: 'ananya@creator.in',
          city: 'Jaipur',
          persona: 'CREATOR',
          password: 'AnanyaPassword@123',
        }),
      })
    );
    expect(applyRes.status).toBe(200);
    const applyData = await applyRes.json();
    const partnerId = applyData.partner.id;
    const refCode = applyData.partner.referralCode;

    // Approve partner
    await partnerRepo.updatePartnerStatus(partnerId, 'ACTIVE');

    // 2. Login using Email + Password
    const emailLoginRes = await app.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'ananya@creator.in',
          password: 'AnanyaPassword@123',
        }),
      })
    );
    expect(emailLoginRes.status).toBe(200);
    const emailLoginData = await emailLoginRes.json();
    expect(emailLoginData.success).toBe(true);
    expect(emailLoginData.partner.id).toBe(partnerId);

    // 3. Login using Referral Code + Password is now REJECTED for security
    const codeLoginRes = await app.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: refCode,
          password: 'AnanyaPassword@123',
        }),
      })
    );
    expect(codeLoginRes.status).toBe(401);

    // 3b. Login using Phone + Password succeeds
    const phoneLoginRes = await app.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: '+919876501234',
          password: 'AnanyaPassword@123',
        }),
      })
    );
    expect(phoneLoginRes.status).toBe(200);

    // 4. Login with Wrong Password -> 401
    const badLoginRes = await app.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: refCode,
          password: 'WrongPassword!',
        }),
      })
    );
    expect(badLoginRes.status).toBe(401);

    // 5. Verify code with live discount quote
    const quoteRes = await app.handle(
      new Request(`http://localhost/api/v1/partners/verify-code?code=${refCode}&plan=PRO`)
    );
    expect(quoteRes.status).toBe(200);
    const quoteData = await quoteRes.json();
    expect(quoteData.isValid).toBe(true);
    expect([999, 1499]).toContain(quoteData.discount.grossPlanPrice);
    if (quoteData.discount.grossPlanPrice === 1499) {
      expect(quoteData.discount.discountAmount).toBe(149.9);
      expect(quoteData.discount.netPayableAmount).toBe(1349.1);
    } else {
      expect(quoteData.discount.discountAmount).toBe(99.9);
      expect(quoteData.discount.netPayableAmount).toBe(899.1);
    }

    // 6. Update Payout Methods profile (PUT /api/v1/partners/me/payout-methods)
    const updateBankRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me/payout-methods', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-partner-id': partnerId,
        },
        body: JSON.stringify({
          payoutUpiId: 'ananya@okaxis',
          payoutHolderName: 'Ananya Sharma',
          payoutBankName: 'ICICI Bank',
          payoutBankAccount: '001122334455',
          payoutBankIfsc: 'ICIC0001234',
          payoutAccountType: 'SAVINGS',
        }),
      })
    );
    expect(updateBankRes.status).toBe(200);
    const updateBankData = await updateBankRes.json();
    expect(updateBankData.partner.payoutBankName).toBe('ICICI Bank');
    expect(updateBankData.partner.payoutBankIfsc).toBe('ICIC0001234');

    // 7. Reject Invalid IFSC on update
    const badIfscRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me/payout-methods', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-partner-id': partnerId,
        },
        body: JSON.stringify({
          payoutBankIfsc: '123_INVALID',
        }),
      })
    );
    expect(badIfscRes.status).toBe(400);

    // 8. Credit balance and request payout by option (BANK_TRANSFER without target)
    await partnerRepo.creditDirectBalance(partnerId, 2000);
    const payoutOptionRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-partner-id': partnerId,
        },
        body: JSON.stringify({
          amount: 1000,
          payoutMethod: 'BANK_TRANSFER',
        }),
      })
    );
    expect(payoutOptionRes.status).toBe(200);
    const payoutOptionData = await payoutOptionRes.json();
    expect(payoutOptionData.payout.payoutTarget).toContain('001122334455');
    expect(payoutOptionData.payout.payoutTarget).toContain('ICIC0001234');
    expect(payoutOptionData.wallet.availableBalance).toBe(1000);
  });

  it('should support Admin setting partner password and secure password login workflow', async () => {
    // 1. Partner applies WITH password
    const applyRes = await app.handle(
      new Request('http://localhost/api/v1/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Ananya Sharma',
          phone: '+919777666555',
          email: 'ananya@creators.in',
          city: 'Mumbai',
          persona: 'CREATOR',
          password: 'InitialPassword@2026',
        }),
      })
    );
    expect(applyRes.status).toBe(200);
    const applyData = await applyRes.json();
    expect(applyData.success).toBe(true);
    expect(applyData.partner.hasPassword).toBe(true);
    // Crucial: passwordHash must NOT be leaked
    expect(applyData.partner.passwordHash).toBeUndefined();
    const partnerId = applyData.partner.id;

    // 2. Admin approves partner
    await app.handle(
      new Request(`http://localhost/api/v1/admin/partners/${partnerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
    );

    // 3. Partner logs in with initial password
    const loginRes = await app.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'ananya@creators.in',
          password: 'InitialPassword@2026',
        }),
      })
    );
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.success).toBe(true);
    expect(loginData.partner.hasPassword).toBe(true);
    expect(loginData.partner.passwordHash).toBeUndefined();

    // 4. Admin resets/sets new password for partner
    const adminSetPwdRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/partners/${partnerId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'AdminGeneratedPwd#999',
        }),
      })
    );
    expect(adminSetPwdRes.status).toBe(200);
    const adminSetPwdData = await adminSetPwdRes.json();
    expect(adminSetPwdData.success).toBe(true);

    // 5. Old password now fails
    const oldLoginRes = await app.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: '+919777666555',
          password: 'InitialPassword@2026',
        }),
      })
    );
    expect(oldLoginRes.status).toBe(401);

    // 6. New password succeeds
    const newLoginRes = await app.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: '+919777666555',
          password: 'AdminGeneratedPwd#999',
        }),
      })
    );
    expect(newLoginRes.status).toBe(200);
    const newLoginData = await newLoginRes.json();
    expect(newLoginData.success).toBe(true);

    // 7. Verify /admin/partners lists partners with hasPassword and without passwordHash
    const listRes = await app.handle(new Request('http://localhost/api/v1/admin/partners'));
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    const found = listData.partners.find((p: any) => p.id === partnerId);
    expect(found.hasPassword).toBe(true);
    expect(found.passwordHash).toBeUndefined();
  });

  it('should support Admin Program Settings, Marketing CMS, and Attribution management', async () => {
    // 1. Program Settings GET & PUT
    const getSettingsRes = await app.handle(new Request('http://localhost/api/v1/admin/partners/settings'));
    expect(getSettingsRes.status).toBe(200);
    const settingsData = await getSettingsRes.json();
    expect(settingsData.success).toBe(true);
    expect(settingsData.settings.defaultReferralDiscountPercent).toBe(10);

    const updateSettingsRes = await app.handle(
      new Request('http://localhost/api/v1/admin/partners/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultReferralDiscountPercent: 15,
          minPayoutThreshold: 1000,
          qualificationTicketsThreshold: 20,
        }),
      })
    );
    expect(updateSettingsRes.status).toBe(200);
    const updatedSettingsData = await updateSettingsRes.json();
    expect(updatedSettingsData.success).toBe(true);
    expect(updatedSettingsData.settings.defaultReferralDiscountPercent).toBe(15);
    expect(updatedSettingsData.settings.minPayoutThreshold).toBe(1000);

    // 2. Marketing Content CMS GET & PUT
    const getMktRes = await app.handle(new Request('http://localhost/api/v1/admin/partners/marketing-content'));
    expect(getMktRes.status).toBe(200);
    const mktData = await getMktRes.json();
    expect(mktData.success).toBe(true);
    expect(mktData.content.pitchScriptHindi).toBeDefined();

    const updateMktRes = await app.handle(
      new Request('http://localhost/api/v1/admin/partners/marketing-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posterHeadline: 'Next-Gen Salon Queue',
        }),
      })
    );
    expect(updateMktRes.status).toBe(200);
    const updatedMktData = await updateMktRes.json();
    expect(updatedMktData.success).toBe(true);
    expect(updatedMktData.content.posterHeadline).toBe('Next-Gen Salon Queue');

    // 3. Attribution Management
    const p1 = await partnerRepo.createPartnerApplication({
      fullName: 'Agent Alpha',
      phone: '+919111222333',
      email: 'alpha@example.com',
      city: 'Delhi',
      persona: 'GROUND_HUSTLER',
    });
    const p2 = await partnerRepo.createPartnerApplication({
      fullName: 'Agent Beta',
      phone: '+919222333444',
      email: 'beta@example.com',
      city: 'Noida',
      persona: 'GROUND_HUSTLER',
    });

    // Manual Attribution
    const manualAttrRes = await app.handle(
      new Request('http://localhost/api/v1/admin/partners/attributions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: 'salon-delhi-01',
          partnerId: p1.id,
        }),
      })
    );
    expect(manualAttrRes.status).toBe(200);
    const manualAttrData = await manualAttrRes.json();
    expect(manualAttrData.success).toBe(true);
    expect(manualAttrData.attribution.partnerId).toBe(p1.id);
    const attrId = manualAttrData.attribution.id;

    // List Attributions
    const listAttrRes = await app.handle(new Request('http://localhost/api/v1/admin/partners/attributions'));
    expect(listAttrRes.status).toBe(200);
    const listAttrData = await listAttrRes.json();
    expect(listAttrData.attributions.length).toBeGreaterThanOrEqual(1);

    // Reassign Attribution
    const reassignRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/partners/attributions/${attrId}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPartnerId: p2.id,
        }),
      })
    );
    expect(reassignRes.status).toBe(200);
    const reassignData = await reassignRes.json();
    expect(reassignData.success).toBe(true);
    expect(reassignData.attribution.partnerId).toBe(p2.id);
  });
});
