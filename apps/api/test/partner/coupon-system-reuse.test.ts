import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';
import { couponService } from '../../src/coupon/coupon.service';
import { couponRepo } from '../../src/db/repositories/coupon.repo';
import { salonRepo } from '../../src/db/repositories/salon.repo';

describe('Partner Referral Code Coupon System Reuse & Admin Configuration', () => {
  let activePartnerCode: string;
  let activePartnerId: string;

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
    const p = await partnerRepo.createPartnerApplication({
      fullName: 'Ramesh Patel',
      phone: '+919876543210',
      email: 'ramesh@example.com',
      city: 'Ahmedabad',
      persona: 'CREATOR',
      password: 'SecurePassword123!',
    });
    activePartnerId = p.id;
    activePartnerCode = p.referralCode;
    await partnerRepo.updatePartnerStatus(p.id, 'ACTIVE');

    // Reset default settings
    await partnerRepo.updateProgramSettings({
      defaultReferralDiscountPercent: 10,
    });
  });

  it('1. should seamlessly resolve partner referral code via couponService for SUBSCRIPTION', async () => {
    const res = await couponService.validateAndApplyCoupon({
      code: activePartnerCode,
      targetType: 'SUBSCRIPTION',
      orderAmount: 999,
    });

    expect(res.valid).toBe(true);
    expect(res.coupon?.code).toBe(activePartnerCode);
    expect(res.coupon?.discountType).toBe('PERCENT');
    expect(res.coupon?.discountValue).toBe(10);
    expect(res.discountAmount).toBe(99.9);
    expect(res.netPayable).toBe(899.1);
  });

  it('2. should reject partner referral code for SALON_SERVICE targetType (Security Guard)', async () => {
    const res = await couponService.validateAndApplyCoupon({
      code: activePartnerCode,
      targetType: 'SALON_SERVICE',
      orderAmount: 500,
    });

    expect(res.valid).toBe(false);
    expect(res.discountAmount).toBe(0);
    expect(res.message).toContain('subscription plans');
  });

  it('3. should reject inactive partner referral code', async () => {
    await partnerRepo.updatePartnerStatus(activePartnerId, 'SUSPENDED');

    const res = await couponService.validateAndApplyCoupon({
      code: activePartnerCode,
      targetType: 'SUBSCRIPTION',
      orderAmount: 1000,
    });

    expect(res.valid).toBe(false);
    expect(res.discountAmount).toBe(0);
  });

  it('4. should reflect admin customization of defaultReferralDiscountPercent dynamically', async () => {
    // Admin configures 20% discount in admin panel
    await partnerRepo.updateProgramSettings({
      defaultReferralDiscountPercent: 20,
    });

    const res = await couponService.validateAndApplyCoupon({
      code: activePartnerCode,
      targetType: 'SUBSCRIPTION',
      orderAmount: 1000,
    });

    expect(res.valid).toBe(true);
    expect(res.coupon?.discountValue).toBe(20);
    expect(res.discountAmount).toBe(200);
    expect(res.netPayable).toBe(800);
  });

  it('5. should auto-apply discount when code is PARTNER_AUTO for an attributed salon', async () => {
    const testSalon = await salonRepo.onboardSalon({
      salonName: 'Modern Cut Studio',
      slug: 'modern-cut-' + Date.now(),
      phone: '+919988776655',
      partnerCode: activePartnerCode,
      stylists: [{ name: 'Stylist A' }],
      services: [{ name: 'Haircut', price: 200, durationMinutes: 30 }],
    });

    const res = await couponService.validateAndApplyCoupon({
      code: 'PARTNER_AUTO',
      targetType: 'SUBSCRIPTION',
      orderAmount: 2499,
      salonId: testSalon.salon.id,
    });

    expect(res.valid).toBe(true);
    expect(res.coupon?.code).toBe(activePartnerCode);
    expect(res.discountAmount).toBe(249.9);
    expect(res.netPayable).toBe(2249.1);
  });

  it('6. should record redemption for partner coupon without throwing', async () => {
    const redemption = await couponRepo.recordRedemption({
      couponId: `partner_${activePartnerId}`,
      targetType: 'SUBSCRIPTION',
      targetOrderId: 'po_test_12345',
      userId: 'org_test_1',
      discountApplied: 99.9,
    });

    expect(redemption).toBeDefined();
    expect(redemption.couponId).toBe(`partner_${activePartnerId}`);
    expect(redemption.discountApplied).toBe(99.9);
  });
});
