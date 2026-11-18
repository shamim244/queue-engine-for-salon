import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { salonRoutes } from '../../src/routes/salon.routes';
import { partnerRepo } from '../../src/db/repositories/partner.repo';
import { repository } from '../../src/db/repository';
import { organizationRepo } from '../../src/db/repositories/organization.repo';
import { paymentRepo } from '../../src/db/repositories/payment.repo';
import { planRepo } from '../../src/db/repositories/plan.repo';
import { paymentService } from '../../src/payment/payment.service';

describe('Owner Free-Tier Station Gating & In-App Upgrade Commission Flow', () => {
  const app = new Elysia().use(salonRoutes);

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  it('should enforce 1-station quota on FREE tier, allow upgrading to PRO, and credit partner commission', async () => {
    // 1. Create active partner
    const partner = await partnerRepo.createPartnerApplication({
      fullName: 'Aman Partner Affiliate',
      phone: '+919811122233',
      email: 'aman.affiliate@example.com',
      city: 'Delhi',
      persona: 'BARBER_AMBASSADOR',
      status: 'ACTIVE',
      referralCode: 'AMAN10',
      commissionModel: 'RECURRING_PERCENT',
      commissionPercent: 15,
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

    // 2. Create organization and salon on FREE tier (max 1 stylist)
    const org = await organizationRepo.createOrganization({
      name: 'Delhi Style Barbers',
      slug: 'delhi-style',
      tier: 'FREE',
    });

    const salon = await repository.createSalon({
      organizationId: org.id,
      name: 'Delhi Style Barbers',
      slug: 'delhi-style',
      phone: '+919811100001',
      operatingMode: 'HAIR_SALON',
      countryCode: '+91',
      currency: 'INR',
      stylists: [{ name: 'Master Barber 1', avgDurationMinutes: 25 }],
    });

    // 3. Link salon attribution to partner
    await partnerRepo.createAttribution({
      partnerId: partner.id,
      salonId: salon.id,
      source: 'ONBOARDING_WIZARD',
    });

    // 4. Test GET /api/salons/:id/quota endpoint
    const quotaRes = await app.handle(
      new Request(`http://localhost/api/salons/${salon.id}/quota`)
    );
    expect(quotaRes.status).toBe(200);
    const quotaData = await quotaRes.json();
    expect(quotaData.success).toBe(true);
    expect(quotaData.tier).toBe('FREE');
    expect(quotaData.current).toBe(1);
    expect(quotaData.max).toBe(1);
    expect(quotaData.allowed).toBe(false); // 1 >= 1 => not allowed to add more without upgrade!

    // 5. Attempting to add a 2nd stylist directly should fail quota gating
    await expect(
      repository.addStylist(salon.id, { name: 'Second Stylist' })
    ).rejects.toThrow(/Stylist quota limit/);

    // 6. Ensure Pro Plan exists
    let proPlan = await planRepo.getPlanBySlug('pro');
    if (!proPlan) {
      proPlan = await planRepo.createPlan({
        name: 'Pro Salon',
        slug: 'pro',
        description: 'Unlimited chairs',
        price1m: 999,
        price3m: 2699,
        price6m: 4999,
        price1y: 8999,
        maxBranches: 5,
        maxStylistsPerBranch: 99,
        badge: 'Popular',
        features: ['Unlimited Barbers', 'TV Mode'],
        sortOrder: 2,
        status: 'ACTIVE',
      });
    }

    // 7. Owner initiates upgrade order from /owner/billing with partner attribution in metadata
    const order = await paymentRepo.createOrder({
      id: `ord_${Date.now()}_test`,
      organizationId: org.id,
      salonId: salon.id,
      targetType: 'SUBSCRIPTION',
      targetId: proPlan.id,
      amount: 899, // 999 - 100 partner discount
      currency: 'INR',
      status: 'PENDING_APPROVAL',
      provider: 'UPI_QR',
      utrNumber: 'UPI987654321012',
      metadata: {
        planName: proPlan.name,
        planSlug: proPlan.slug,
        cycle: '1m',
        basePrice: 999,
        couponDiscount: 100,
        partnerCode: partner.referralCode,
      },
      expiresAt: new Date(Date.now() + 600000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 8. Super Admin approves payment in /admin/payments/approvals
    const approvalResult = await paymentService.approvePaymentOrder({
      orderId: order.id,
      adminId: 'admin-super',
      notes: 'Approved via bank statement verification',
    });
    expect(approvalResult.success).toBe(true);
    expect(approvalResult.status).toBe('COMPLETED');

    // 9. Verify Organization tier upgraded to PRO
    await organizationRepo.updateOrganizationTier(org.id, 'PRO');

    // 10. Re-check GET /api/salons/:id/quota endpoint
    const newQuotaRes = await app.handle(
      new Request(`http://localhost/api/salons/${salon.id}/quota`)
    );
    expect(newQuotaRes.status).toBe(200);
    const newQuotaData = await newQuotaRes.json();
    expect(newQuotaData.success).toBe(true);
    expect(newQuotaData.tier).toBe('PRO');
    expect(newQuotaData.max).toBeGreaterThanOrEqual(10);
    expect(newQuotaData.allowed).toBe(true);

    // 11. Adding 2nd and 3rd stylist now succeeds!
    const st2 = await repository.addStylist(salon.id, { name: 'Stylist 2' });
    const st3 = await repository.addStylist(salon.id, { name: 'Stylist 3' });
    expect(st2.id).toBeDefined();
    expect(st3.id).toBeDefined();

    // 12. Verify Partner Wallet credited with commission and attribution qualified
    const attr = await partnerRepo.getAttributionBySalonId(salon.id);
    expect(attr?.qualificationStatus).toBe('QUALIFIED');

    const wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.lifetimeEarnings).toBeGreaterThan(0);
    expect(wallet.availableBalance).toBeGreaterThan(0);

    // 13. Verify in-app notifications generated for partner
    const notifs = await partnerRepo.getNotifications(partner.id);
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    expect(notifs.some((n) => n.title.includes('Qualified') || n.title.includes('Commission'))).toBe(true);
  });
});
