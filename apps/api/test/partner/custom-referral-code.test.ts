import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';
import { couponService } from '../../src/coupon/coupon.service';

describe('Suite 9: Custom Referral Code Engine & Uniqueness Validation', () => {
  let partnerA: any;
  let partnerB: any;

  beforeEach(async () => {
    await partnerRepo.resetForTesting();

    partnerA = await partnerRepo.createPartnerApplication({
      fullName: 'Vikram Malhotra',
      email: 'vikram.malhotra@example.com',
      phone: '+919111222333',
      city: 'Delhi',
      persona: 'BARBER_CHAMPION',
      password: 'Password123!',
    });
    await partnerRepo.updatePartnerStatus(partnerA.id, 'ACTIVE');

    partnerB = await partnerRepo.createPartnerApplication({
      fullName: 'Sunil Gavaskar',
      email: 'sunil.gavaskar@example.com',
      phone: '+919444555666',
      city: 'Mumbai',
      persona: 'CREATOR',
      password: 'Password123!',
    });
    await partnerRepo.updatePartnerStatus(partnerB.id, 'ACTIVE');
  });

  it('T9.1: should allow partner to customize auto-generated code to a unique custom identifier', async () => {
    const updated = await partnerRepo.updatePartnerReferralCode(partnerA.id, 'VIKRAM10');

    expect(updated.referralCode).toBe('VIKRAM10');

    const fetched = await partnerRepo.getPartnerById(partnerA.id);
    expect(fetched?.referralCode).toBe('VIKRAM10');
  });

  it('T9.2: should reject updating to a referral code already owned by another partner', async () => {
    // Partner A sets VIKRAM10
    await partnerRepo.updatePartnerReferralCode(partnerA.id, 'VIKRAM10');

    // Partner B attempts to set VIKRAM10
    expect(
      partnerRepo.updatePartnerReferralCode(partnerB.id, 'VIKRAM10')
    ).rejects.toThrow(/already taken by another partner/i);
  });

  it('T9.3: should reject invalid formatting (too short, too long, special characters)', async () => {
    // Too short (< 3 chars)
    expect(
      partnerRepo.updatePartnerReferralCode(partnerA.id, 'AB')
    ).rejects.toThrow(/3-20 characters/i);

    // Too long (> 20 chars)
    expect(
      partnerRepo.updatePartnerReferralCode(partnerA.id, 'VERYLONGREFERRALCODEEXCEEDING20')
    ).rejects.toThrow(/3-20 characters/i);

    // Special characters
    expect(
      partnerRepo.updatePartnerReferralCode(partnerA.id, 'CODE@123!')
    ).rejects.toThrow(/uppercase letters, numbers/i);
  });

  it('T9.4: should reject reserved system codes like ADMIN or SYSTEM', async () => {
    expect(
      partnerRepo.updatePartnerReferralCode(partnerA.id, 'ADMIN')
    ).rejects.toThrow(/reserved/i);

    expect(
      partnerRepo.updatePartnerReferralCode(partnerA.id, 'SYSTEM')
    ).rejects.toThrow(/reserved/i);
  });

  it('T9.5: new custom code should immediately be valid for coupon discounts', async () => {
    await partnerRepo.updatePartnerReferralCode(partnerA.id, 'DELHI_VIP');

    const res = await couponService.validateAndApplyCoupon({
      code: 'DELHI_VIP',
      targetType: 'SUBSCRIPTION',
      orderAmount: 999,
    });

    expect(res.valid).toBe(true);
    expect(res.coupon?.code).toBe('DELHI_VIP');
    expect(res.discountAmount).toBe(99.9);
    expect(res.netPayable).toBe(899.1);
  });

  it('T9.6: should allow partner to re-save their own identical code without error', async () => {
    const currentCode = partnerA.referralCode;
    const res = await partnerRepo.updatePartnerReferralCode(partnerA.id, currentCode);
    expect(res.referralCode).toBe(currentCode);
  });

  it('T9.7: check-code-availability API endpoint must reject taken code for new applicants even if caller header is present', async () => {
    const { partnerRoutes } = await import('../../src/routes/partner.routes');
    const { Elysia } = await import('elysia');
    const app = new Elysia().use(partnerRoutes);

    await partnerRepo.updatePartnerReferralCode(partnerA.id, 'ZAKIR');

    // Call check-code-availability with partnerA's headers BUT without excludeSelf
    // Simulates visiting /partner/join while previously logged in as Zakir
    const res = await app.handle(
      new Request('http://localhost/api/v1/partners/check-code-availability?code=ZAKIR', {
        headers: {
          'x-partner-id': partnerA.id,
        },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.available).toBe(false);
    expect(data.collisionType).toBe('PARTNER');
    expect(data.suggestions.length).toBeGreaterThan(0);
  });

  it('T9.8: check-code-availability API endpoint with excludeSelf=true should allow partner to verify own code', async () => {
    const { partnerRoutes } = await import('../../src/routes/partner.routes');
    const { Elysia } = await import('elysia');
    const app = new Elysia().use(partnerRoutes);

    await partnerRepo.updatePartnerReferralCode(partnerA.id, 'ZAKIR');

    // Call check-code-availability with partnerA's headers WITH excludeSelf=true
    // Simulates partner editing their own profile
    const res = await app.handle(
      new Request('http://localhost/api/v1/partners/check-code-availability?code=ZAKIR&excludeSelf=true', {
        headers: {
          'x-partner-id': partnerA.id,
        },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.available).toBe(true);
  });

  it('T9.9: partner login should succeed via Email or Phone, but MUST FAIL when using Referral Code', async () => {
    // 1. Login with Email should succeed
    const byEmail = await partnerRepo.authenticatePartner({
      identifier: 'vikram.malhotra@example.com',
      password: 'Password123!',
    });
    expect(byEmail.success).toBe(true);
    expect(byEmail.partner.id).toBe(partnerA.id);

    // 2. Login with Phone should succeed
    const byPhone = await partnerRepo.authenticatePartner({
      identifier: '+919111222333',
      password: 'Password123!',
    });
    expect(byPhone.success).toBe(true);
    expect(byPhone.partner.id).toBe(partnerA.id);

    // 3. Login with Public Referral Code MUST FAIL for security
    expect(
      partnerRepo.authenticatePartner({
        identifier: partnerA.referralCode,
        password: 'Password123!',
      })
    ).rejects.toThrow(/Invalid credentials/i);
  });

  it('T9.10: partner application must mandate email and reject duplicate email', async () => {
    // Missing email
    expect(
      partnerRepo.createPartnerApplication({
        fullName: 'Ravi Shastri',
        phone: '+919999888877',
        city: 'Pune',
        persona: 'CREATOR',
        password: 'Password123!',
      } as any)
    ).rejects.toThrow(/email address is mandatory/i);

    // Duplicate email
    expect(
      partnerRepo.createPartnerApplication({
        fullName: 'Ravi Shastri',
        email: 'vikram.malhotra@example.com', // already owned by partnerA
        phone: '+919999888877',
        city: 'Pune',
        persona: 'CREATOR',
        password: 'Password123!',
      })
    ).rejects.toThrow(/already registered/i);
  });
});
