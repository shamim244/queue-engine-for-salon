import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { partnerRoutes } from '../../src/routes/partner.routes';
import { partnerRepo } from '../../src/db/repositories/partner.repo';
import { repository } from '../../src/db/repository';
import { organizationRepo } from '../../src/db/repositories/organization.repo';
import { paymentRepo } from '../../src/db/repositories/payment.repo';

describe('Partner Salons Telemetry & Visibility Flow', () => {
  const app = new Elysia().use(partnerRoutes);

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  it('should return enriched telemetry including plan tier, payment status, and earned commission', async () => {
    // 1. Create active partner
    const partner = await partnerRepo.createPartnerApplication({
      fullName: 'Vikram Telemetry Partner',
      phone: '+919876543210',
      email: 'vikram.telemetry@example.com',
      city: 'Indore',
      persona: 'GROUND_HUSTLER',
      status: 'ACTIVE',
      referralCode: 'VIKRAM20',
      commissionModel: 'RECURRING_PERCENT',
      commissionPercent: 10,
    });

    // 2. Create organization and salon onboarded by this partner
    const org = await organizationRepo.createOrganization({
      name: 'Indore Grooming Lounge',
      slug: 'indore-grooming',
      tier: 'FREE',
    });

    const salon = await repository.createSalon({
      organizationId: org.id,
      name: 'Indore Grooming Lounge',
      slug: 'indore-grooming',
      phone: '+919876500001',
      operatingMode: 'HAIR_SALON',
      countryCode: '+91',
      currency: 'INR',
    });

    // Record attribution
    await partnerRepo.createAttribution({
      partnerId: partner.id,
      salonId: salon.id,
      source: 'ASSISTED_ONBOARDING',
      referralCodeUsed: 'VIKRAM20',
    });

    // 3. Test initial state (FREE testing)
    const initialRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me/salons', {
        headers: { 'x-partner-id': partner.id },
      })
    );
    expect(initialRes.status).toBe(200);
    const initialData = await initialRes.json();
    expect(initialData.success).toBe(true);
    expect(initialData.salons.length).toBe(1);

    const s1 = initialData.salons[0];
    expect(s1.salonName).toBe('Indore Grooming Lounge');
    expect(s1.currentTier).toBe('FREE');
    expect(s1.paymentStatus).toBe('FREE_TESTING');
    expect(s1.pendingUtr).toBeNull();
    expect(s1.earnedCommission).toBe(0);

    // 4. Salon submits manual UPI payment (PENDING_APPROVAL)
    const order = await paymentRepo.createOrder({
      organizationId: org.id,
      salonId: salon.id,
      targetType: 'SUBSCRIPTION',
      targetId: 'plan-pro-01',
      amount: 1349,
      provider: 'UPI_QR',
      currency: 'INR',
      status: 'PENDING_APPROVAL',
      utrNumber: '998877665544',
      metadata: {
        planTier: 'PRO',
        planName: 'Growth Studio Pro',
        billingCycle: '1m',
        partnerCode: 'VIKRAM20',
        utrNumber: '998877665544',
      },
    });

    const pendingRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me/salons', {
        headers: { 'x-partner-id': partner.id },
      })
    );
    const pendingData = await pendingRes.json();
    const s2 = pendingData.salons[0];
    expect(s2.paymentStatus).toBe('PENDING_APPROVAL');
    expect(s2.pendingAmount).toBe(1349);
    expect(s2.pendingUtr).toBe('998877665544');

    // 5. Admin approves payment & commission is credited to partner
    await paymentRepo.updateOrderStatus(order.id, 'COMPLETED');
    await organizationRepo.updateOrganizationTier(org.id, 'PRO');
    await paymentRepo.createSubscription({
      id: `sub_${Date.now()}`,
      organizationId: org.id,
      planId: 'plan-pro-01',
      cycle: '1m',
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      basePrice: 1499,
      netAmountPaid: 1349,
      paymentMethod: 'UPI_QR',
      paymentOrderId: order.id,
      status: 'ACTIVE',
    });

    // Credit partner commission to ledger
    await partnerRepo.addLedgerEntry({
      partnerId: partner.id,
      salonId: salon.id,
      transactionType: 'SUBSCRIPTION_RECURRING',
      grossPlanAmount: 1499,
      discountAmount: 150,
      netPaidAmount: 1349,
      commissionAmount: 135,
      balanceType: 'AVAILABLE',
      description: '10% recurring commission for Indore Grooming Lounge',
      referenceId: order.id,
    });

    // 6. Check updated partner telemetry
    const approvedRes = await app.handle(
      new Request('http://localhost/api/v1/partners/me/salons', {
        headers: { 'x-partner-id': partner.id },
      })
    );
    const approvedData = await approvedRes.json();
    const s3 = approvedData.salons[0];
    expect(s3.paymentStatus).toBe('ACTIVE_PAID');
    expect(s3.currentTier).toBe('PRO');
    expect(s3.currentPlanName.toUpperCase()).toContain('PRO');
    expect(s3.earnedCommission).toBe(135);
  });
});
