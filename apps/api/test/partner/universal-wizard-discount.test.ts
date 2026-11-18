import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { partnerRepo } from '../../src/db/repositories/partner.repo';
import { adminRoutes } from '../../src/routes/admin.routes';

const app = new Elysia().use(adminRoutes);

describe('Suite 8: Universal Wizard Bilateral Discount Engine', () => {
  let partnerId: string;
  let referralCode: string;

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
    const p = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Kishore Kumar',
      phone: '+919988112233',
      email: 'kishore@example.com',
      city: 'Bhopal',
      persona: 'CREATOR',
    });
    partnerId = p.id;
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

  it('T8.3: should calculate 10% discount for STARTER and ENTERPRISE tiers accurately', async () => {
    const starterQuote = await partnerRepo.quoteReferralDiscount({
      partnerCode: referralCode,
      planTier: 'STARTER',
      basePrice: 499,
    });
    expect(starterQuote.isValid).toBe(true);
    expect(starterQuote.discountAmount).toBe(49.90);
    expect(starterQuote.netPayableAmount).toBe(449.10);

    const enterpriseQuote = await partnerRepo.quoteReferralDiscount({
      partnerCode: referralCode,
      planTier: 'ENTERPRISE',
      basePrice: 2499,
    });
    expect(enterpriseQuote.isValid).toBe(true);
    expect(enterpriseQuote.discountAmount).toBe(249.90);
    expect(enterpriseQuote.netPayableAmount).toBe(2249.10);
  });

  it('T8.4: should auto-resolve partner code from session headers when partnerCode is omitted and mark attribution as ASSISTED_ONBOARDING', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/admin/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-partner-id': partnerId,
          'Authorization': `Bearer part_sess_${partnerId}_${Date.now()}`,
        },
        body: JSON.stringify({
          name: 'Assisted Test Salon',
          phone: '+919876543210',
          tier: 'PRO',
          ownerUser: {
            username: `assisted_test_${Date.now()}`,
            email: `assisted_owner_${Date.now()}@example.com`,
            password: 'Password123',
          },
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.salon).toBeDefined();

    // Verify attribution was automatically linked to partner with ASSISTED_ONBOARDING source
    const attr = await partnerRepo.getAttributionBySalonId(data.salon.id);
    expect(attr).not.toBeNull();
    expect(attr?.partnerId).toBe(partnerId);
    expect(attr?.source).toBe('ASSISTED_ONBOARDING');
  });
});
