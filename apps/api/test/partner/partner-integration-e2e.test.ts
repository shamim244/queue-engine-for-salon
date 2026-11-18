import { describe, it, expect, beforeEach } from 'bun:test';
import { repository } from '../../src/db/repository';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

describe('Suite 5: Complete End-to-End Existing System Integration', () => {
  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  it('T5.1: End-to-End Flow: Partner Signup -> Admin Approval -> Onboard Salon with Code -> 15 Tickets Qualification -> Plan Payment with Coupon -> Wallet Credit -> UPI Payout Settlement', async () => {
    // 1. Host registers
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Ajay Devgan',
      phone: '+919900011122',
      email: 'ajay@example.com',
      city: 'Kanpur',
      persona: 'GROUND_HUSTLER',
      payoutUpiId: 'ajay@okaxis',
    });

    // 2. Admin approves host with Model B (12%) + Model A Promotional Bounty (₹400)
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');
    await partnerRepo.updateCommissionTerms(partner.id, {
      commissionModel: 'HYBRID',
      commissionPercent: 12.0,
      bountyAmount: 400.0,
      durationType: '6_MONTHS',
    });

    // 3. Salon is onboarded via existing system with partner referral code
    const onboardResult = await repository.onboardSalon({
      name: 'Singhania Hair Lounge',
      phone: '+919933445566',
      partnerCode: partner.referralCode,
      stylists: [{ name: 'Stylist 1', pin: '1111' }],
      services: [{ name: 'Cut', basePrice: 120, estimatedDurationMinutes: 20 }],
    });

    expect(onboardResult.success).toBe(true);
    const salon = onboardResult.salon;

    // Verify attribution created
    const attr = await partnerRepo.getAttributionBySalonId(salon.id);
    expect(attr).toBeDefined();
    expect(attr?.partnerId).toBe(partner.id);
    expect(attr?.qualificationStatus).toBe('UNQUALIFIED');

    // Verify bounty is currently locked in PENDING_LOCK
    let wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.pendingLockedBalance).toBe(400);
    expect(wallet.availableBalance).toBe(0);

    // 4. Salon takes 15 customer tickets in Queue Engine
    for (let i = 1; i <= 15; i++) {
      await partnerRepo.incrementSalonTicketCount(salon.id);
    }

    // Verify milestone unlocked
    const attrQualified = await partnerRepo.getAttributionBySalonId(salon.id);
    expect(attrQualified?.qualificationStatus).toBe('QUALIFIED');

    // Bounty of ₹400 moved to AVAILABLE
    wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.pendingLockedBalance).toBe(0);
    expect(wallet.availableBalance).toBe(400);

    // 5. Salon purchases subscription: ₹1,500 gross - ₹300 coupon = ₹1,200 net paid
    await partnerRepo.processSubscriptionPayment({
      salonId: salon.id,
      grossAmount: 1500,
      discountAmount: 300,
      paymentReference: 'SUB_PAY_KANPUR_1',
    });

    // Commission: 12% of ₹1,200 = ₹144.00
    // Total Available = ₹400 (Bounty) + ₹144 (Commission) = ₹544.00
    wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.availableBalance).toBe(544.00);

    // 6. Host requests payout of ₹500 via UPI
    const payout = await partnerRepo.requestPayout({
      partnerId: partner.id,
      amount: 500.00,
      payoutMethod: 'UPI',
      payoutTarget: 'ajay@okaxis',
    });

    expect(payout.status).toBe('REQUESTED');
    wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.availableBalance).toBe(44.00);

    // 7. Super Admin settles payout with UTR
    const settled = await partnerRepo.settlePayout(payout.id, {
      utrReference: 'AXIS-UPI-9988776655',
      adminNotes: 'Settled by Superadmin',
    });

    expect(settled.status).toBe('PAID');
    expect(settled.utrReference).toBe('AXIS-UPI-9988776655');

    // Final balance check: ₹44 remains available
    wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.availableBalance).toBe(44.00);
    expect(wallet.totalWithdrawn).toBe(500.00);
    expect(wallet.lifetimeEarnings).toBe(544.00);
  });
});
