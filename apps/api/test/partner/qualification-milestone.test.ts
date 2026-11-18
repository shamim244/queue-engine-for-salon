import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

describe('Suite 3: Anti-Fraud Qualification Engine', () => {
  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  it('T3.1: should lock earnings in PENDING_LOCK state until qualification milestone is achieved', async () => {
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Anil Kumar',
      phone: '+919811001122',
      email: 'anil@example.com',
      city: 'Jaipur',
      persona: 'GROUND_HUSTLER',
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

    await partnerRepo.createAttribution({
      partnerId: partner.id,
      salonId: 'salon_jaipur_1',
      source: 'ASSISTED_ONBOARDING',
    });

    await partnerRepo.addLedgerEntry({
      partnerId: partner.id,
      salonId: 'salon_jaipur_1',
      transactionType: 'BOUNTY_CREDIT',
      commissionAmount: 500,
      balanceType: 'PENDING_LOCK',
      description: 'Promotional Bounty',
    });

    const wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.pendingLockedBalance).toBe(500);
    expect(wallet.availableBalance).toBe(0);
  });

  it('T3.2 & T3.3: should increment tickets and transition PENDING_LOCK to AVAILABLE at 15 tickets', async () => {
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Sunil Verma',
      phone: '+919811001133',
      email: 'sunil@example.com',
      city: 'Indore',
      persona: 'GROUND_HUSTLER',
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

    const salonId = 'salon_indore_1';
    await partnerRepo.createAttribution({
      partnerId: partner.id,
      salonId,
      source: 'LINK',
    });

    await partnerRepo.addLedgerEntry({
      partnerId: partner.id,
      salonId,
      transactionType: 'BOUNTY_CREDIT',
      commissionAmount: 300,
      balanceType: 'PENDING_LOCK',
      description: 'Activation Bounty',
    });

    // Increment 1 to 14: Must remain UNQUALIFIED
    for (let i = 1; i <= 14; i++) {
      await partnerRepo.incrementSalonTicketCount(salonId);
      const attr = await partnerRepo.getAttributionBySalonId(salonId);
      expect(attr?.qualificationStatus).toBe('UNQUALIFIED');
    }

    // 15th Ticket: Milestone Achieved!
    await partnerRepo.incrementSalonTicketCount(salonId);
    const attrFinal = await partnerRepo.getAttributionBySalonId(salonId);
    expect(attrFinal?.qualificationStatus).toBe('QUALIFIED');

    // Balance must now be AVAILABLE
    const wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.pendingLockedBalance).toBe(0);
    expect(wallet.availableBalance).toBe(300);
  });

  it('T3.4: should immediately qualify salon and release locked funds upon paid plan purchase', async () => {
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Deepak Chopra',
      phone: '+919811001144',
      email: 'deepak@example.com',
      city: 'Delhi',
      persona: 'CREATOR',
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

    const salonId = 'salon_delhi_1';
    await partnerRepo.createAttribution({
      partnerId: partner.id,
      salonId,
      source: 'PROMO_CODE',
    });

    // Locked bounty
    await partnerRepo.addLedgerEntry({
      partnerId: partner.id,
      salonId,
      transactionType: 'BOUNTY_CREDIT',
      commissionAmount: 500,
      balanceType: 'PENDING_LOCK',
      description: 'Onboarding Bounty',
    });

    // Salon buys ₹1200 plan with ₹200 discount (Net Paid ₹1000)
    await partnerRepo.processSubscriptionPayment({
      salonId,
      grossAmount: 1200,
      discountAmount: 200,
      paymentReference: 'TXN_SUB_9900',
    });

    const attr = await partnerRepo.getAttributionBySalonId(salonId);
    expect(attr?.qualificationStatus).toBe('QUALIFIED');

    // Wallet: ₹500 bounty unlocked + 10% of ₹1000 (₹100) = ₹600 AVAILABLE
    const wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.pendingLockedBalance).toBe(0);
    expect(wallet.availableBalance).toBe(600);
  });

  it('T3.5: should NOT qualify salon and keep earnings in PENDING_LOCK when 100% free / trial plan is purchased', async () => {
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Meera Rajput',
      phone: '+919811001155',
      email: 'meera@example.com',
      city: 'Udaipur',
      persona: 'GROUND_HUSTLER',
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

    const salonId = 'salon_udaipur_1';
    await partnerRepo.createAttribution({
      partnerId: partner.id,
      salonId,
      source: 'PROMO_CODE',
    });

    await partnerRepo.addLedgerEntry({
      partnerId: partner.id,
      salonId,
      transactionType: 'BOUNTY_CREDIT',
      commissionAmount: 400,
      balanceType: 'PENDING_LOCK',
      description: 'Activation Bounty',
    });

    // 100% Free / Trial plan: ₹1000 gross - ₹1000 discount = ₹0 net paid
    const res = await partnerRepo.processSubscriptionPayment({
      salonId,
      grossAmount: 1000,
      discountAmount: 1000,
      paymentReference: 'FREE_TRIAL_123',
    });

    expect(res.commissionEarned).toBe(0);
    expect(res.reason).toBe('100% Free / Discounted Plan');

    // Must remain UNQUALIFIED
    const attr = await partnerRepo.getAttributionBySalonId(salonId);
    expect(attr?.qualificationStatus).toBe('UNQUALIFIED');

    // Bounty must remain LOCKED
    const wallet = await partnerRepo.getWalletBalance(partner.id);
    expect(wallet.pendingLockedBalance).toBe(400);
    expect(wallet.availableBalance).toBe(0);
  });

  it('T3.6: should enforce idempotent ticket counting so duplicate completion events do not double-increment', async () => {
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Gaurav Khanna',
      phone: '+919811001166',
      email: 'gaurav@example.com',
      city: 'Chandigarh',
      persona: 'GROUND_HUSTLER',
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

    const salonId = 'salon_chd_1';
    await partnerRepo.createAttribution({
      partnerId: partner.id,
      salonId,
      source: 'LINK',
    });

    // Send ticket 1 completion twice
    await partnerRepo.incrementSalonTicketCount(salonId, 'tkt_dup_101');
    let attr = await partnerRepo.getAttributionBySalonId(salonId);
    expect(attr?.ticketsCompletedCount).toBe(1);

    // Duplicate call with same ticketId
    await partnerRepo.incrementSalonTicketCount(salonId, 'tkt_dup_101');
    attr = await partnerRepo.getAttributionBySalonId(salonId);
    expect(attr?.ticketsCompletedCount).toBe(1); // Still 1, NOT 2

    // Different ticket
    await partnerRepo.incrementSalonTicketCount(salonId, 'tkt_dup_102');
    attr = await partnerRepo.getAttributionBySalonId(salonId);
    expect(attr?.ticketsCompletedCount).toBe(2);
  });

  it('should NOT credit activation bounty when partner commission is paused', async () => {
    const { repository } = await import('../../src/db/repository');
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Pooja Hegde',
      phone: '+919811001177',
      email: 'pooja@example.com',
      city: 'Bengaluru',
      persona: 'GROUND_HUSTLER',
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');
    await partnerRepo.updateCommissionTerms(partner.id, {
      commissionModel: 'FLAT_BOUNTY',
      bountyAmount: 500,
    });
    // Pause partner commission
    await partnerRepo.setCommissionPaused(partner.id, true);

    const onboardResult = await repository.onboardSalon({
      name: 'Pooja Glam Lounge',
      phone: '+919988771122',
      partnerCode: partner.referralCode,
      stylists: [{ name: 'Stylist P', pin: '2222' }],
      services: [{ name: 'Trim', basePrice: 100, estimatedDurationMinutes: 15 }],
    });

    expect(onboardResult.success).toBe(true);
    const wallet = await partnerRepo.getWalletBalance(partner.id);
    // Since commission is paused, no bounty credit should be awarded
    expect(wallet.pendingLockedBalance).toBe(0);
    expect(wallet.availableBalance).toBe(0);
  });
});
