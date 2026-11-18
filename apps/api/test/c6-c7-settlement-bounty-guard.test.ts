import { describe, it, expect, beforeEach } from 'bun:test';
import { runDailySettlement } from '../src/worker/payout-worker';
import { repository } from '../src/db/repository';
import { partnerRepo } from '../src/db/repositories/partner.repo';
import { appointmentRepo } from '../src/db/repositories/appointment.repo';
import type { Appointment } from '../src/engine/types';

describe('ADR 005 - C6 & C7: Daily Settlement Idempotency & Partner Bounty Rules', () => {
  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  describe('C6: Daily Settlement Idempotency & Double-Settlement Guard', () => {
    it('C6.1: should produce exactly one payout record when settlement runs multiple times on the same date', async () => {
      const targetDate = '2026-11-10';

      // 1. Create test salon with active stylist
      const salon = await repository.createSalon({
        name: 'Settlement Test Salon',
        phone: '9888877777',
        upiPaymentId: 'testowner@upi',
        stylists: [
          { name: 'Master Barber', phone: '9888877701' },
          { name: 'Senior Barber', phone: '9888877702' },
        ],
        services: [
          { name: 'Haircut', basePrice: 200, estimatedDurationMinutes: 30 },
          { name: 'Beard Trim', basePrice: 150, estimatedDurationMinutes: 30 },
        ],
      });

      const stylist1 = salon.stylists[0].id;
      const stylist2 = salon.stylists[1]?.id || stylist1;

      // 2. Create completed appointments with released escrow
      const appt1: Appointment = {
        id: `appt-c6-1-${Date.now()}`,
        salonId: salon.id,
        stylistId: stylist1,
        customerName: 'Customer One',
        customerPhone: '9111122222',
        serviceId: 'srv-1',
        serviceName: 'Haircut',
        scheduledDate: targetDate,
        slotStartTime: '10:00',
        slotEndTime: '10:30',
        durationMinutes: 30,
        advanceAmount: 100,
        totalPrice: 200,
        paymentMethod: 'ONLINE_UPI',
        escrowStatus: 'RELEASED_TO_OWNER',
        status: 'COMPLETED',
      };
      const appt2: Appointment = {
        id: `appt-c6-2-${Date.now()}`,
        salonId: salon.id,
        stylistId: stylist2,
        customerName: 'Customer Two',
        customerPhone: '9111122223',
        serviceId: 'srv-2',
        serviceName: 'Beard Trim',
        scheduledDate: targetDate,
        slotStartTime: '11:00',
        slotEndTime: '11:30',
        durationMinutes: 30,
        advanceAmount: 150,
        totalPrice: 150,
        paymentMethod: 'ONLINE_UPI',
        escrowStatus: 'RELEASED_TO_OWNER',
        status: 'NO_SHOW', // Released to owner on no-show
      };

      await appointmentRepo.createAppointment(appt1);
      await appointmentRepo.createAppointment(appt2);

      // 3. First settlement run
      const firstRun = await runDailySettlement({
        salonId: salon.id,
        date: targetDate,
      });

      expect(firstRun.length).toBe(1);
      const payout1 = firstRun[0];
      expect(payout1.salonId).toBe(salon.id);
      expect(payout1.grossAmount).toBe(250); // 100 + 150
      expect(payout1.netPayout).toBe(242.5); // 97% of 250
      expect(payout1.status).toBe('SETTLED');

      // 4. Verify appointments were tagged with payoutId
      const a1Updated = await appointmentRepo.getAppointmentById(appt1.id);
      const a2Updated = await appointmentRepo.getAppointmentById(appt2.id);
      expect(a1Updated?.payoutId).toBe(payout1.id);
      expect(a2Updated?.payoutId).toBe(payout1.id);

      // 5. Second settlement run on same salon and date (Simulate repeat cron / duplicate job)
      const secondRun = await runDailySettlement({
        salonId: salon.id,
        date: targetDate,
      });

      expect(secondRun.length).toBe(1);
      expect(secondRun[0].id).toBe(payout1.id); // Returns the existing payout, does not create a new one!

      // 6. Check total payouts created in repository
      const allPayouts = await appointmentRepo.getPayoutRecords({ salonId: salon.id });
      expect(allPayouts.length).toBe(1);
    });
  });

  describe('C7: Flat-Bounty and Hybrid Partner Commission Rules', () => {
    it('C7.1: should award configured bounty amount to FLAT_BOUNTY partner on qualifying subscription payment', async () => {
      const salonId = `salon-c7-flat-${Date.now()}`;

      // 1. Create FLAT_BOUNTY partner with ₹500 bounty
      const partner = await partnerRepo.createPartnerApplication({
        fullName: 'Flat Bounty Partner',
        phone: `98888${Math.floor(10000 + Math.random() * 90000)}`,
        email: `flat_${Date.now()}@partner.com`,
        city: 'Mumbai',
      });
      await partnerRepo.updateCommissionTerms(partner.id, {
        commissionModel: 'FLAT_BOUNTY',
        commissionPercent: 0,
        bountyAmount: 500,
      });
      await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

      // 2. Create salon attribution
      await partnerRepo.createAttribution({
        partnerId: partner.id,
        salonId,
        source: 'LINK',
        qualificationStatus: 'UNQUALIFIED',
      });

      // 3. Process first paid subscription payment of ₹1,000
      const result = await partnerRepo.processSubscriptionPayment({
        salonId,
        grossAmount: 1000,
        discountAmount: 0,
        paymentReference: `pay_sub_1_${Date.now()}`,
      });

      expect(result.commissionEarned).toBe(500);

      // 4. Verify ledger has BOUNTY_CREDIT of ₹500
      const ledger = await partnerRepo.getLedgerByPartnerId(partner.id);
      expect(ledger.length).toBe(1);
      expect(ledger[0].transactionType).toBe('BOUNTY_CREDIT');
      expect(ledger[0].commissionAmount).toBe(500);

      // 5. Verify wallet balance has ₹500
      const balance = await partnerRepo.getWalletBalance(partner.id);
      expect(balance.availableBalance).toBe(500);
    });

    it('C7.2: should not award duplicate bounty to FLAT_BOUNTY partner on subsequent subscription renewals', async () => {
      const salonId = `salon-c7-repeat-${Date.now()}`;

      // 1. Create FLAT_BOUNTY partner
      const partner = await partnerRepo.createPartnerApplication({
        fullName: 'No Duplicate Bounty Partner',
        phone: `98888${Math.floor(10000 + Math.random() * 90000)}`,
        email: `repeat_${Date.now()}@partner.com`,
        city: 'Delhi',
      });
      await partnerRepo.updateCommissionTerms(partner.id, {
        commissionModel: 'FLAT_BOUNTY',
        commissionPercent: 0,
        bountyAmount: 750,
      });
      await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

      await partnerRepo.createAttribution({
        partnerId: partner.id,
        salonId,
        source: 'PROMO_CODE',
        qualificationStatus: 'UNQUALIFIED',
      });

      // 2. Month 1 payment
      const res1 = await partnerRepo.processSubscriptionPayment({
        salonId,
        grossAmount: 1200,
        discountAmount: 0,
        paymentReference: `pay_month_1_${Date.now()}`,
      });
      expect(res1.commissionEarned).toBe(750);

      // 3. Month 2 renewal payment
      const res2 = await partnerRepo.processSubscriptionPayment({
        salonId,
        grossAmount: 1200,
        discountAmount: 0,
        paymentReference: `pay_month_2_${Date.now()}`,
      });
      // Flat bounty was already paid, so month 2 earns 0
      expect(res2.commissionEarned).toBe(0);

      const ledger = await partnerRepo.getLedgerByPartnerId(partner.id);
      expect(ledger.length).toBe(1); // Only 1 bounty credit
    });

    it('C7.3: should award one-time bounty plus recurring percent to HYBRID partner', async () => {
      const salonId = `salon-c7-hybrid-${Date.now()}`;

      // 1. Create HYBRID partner: ₹300 one-time bounty + 10% recurring
      const partner = await partnerRepo.createPartnerApplication({
        fullName: 'Hybrid Partner',
        phone: `98888${Math.floor(10000 + Math.random() * 90000)}`,
        email: `hybrid_${Date.now()}@partner.com`,
        city: 'Bengaluru',
      });
      await partnerRepo.updateCommissionTerms(partner.id, {
        commissionModel: 'HYBRID',
        commissionPercent: 10,
        bountyAmount: 300,
      });
      await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

      await partnerRepo.createAttribution({
        partnerId: partner.id,
        salonId,
        source: 'LINK',
        qualificationStatus: 'UNQUALIFIED',
      });

      // 2. Month 1 payment of ₹1,000 (Earns ₹300 bounty + ₹100 recurring = ₹400)
      const res1 = await partnerRepo.processSubscriptionPayment({
        salonId,
        grossAmount: 1000,
        discountAmount: 0,
        paymentReference: `pay_hyb_m1_${Date.now()}`,
      });
      expect(res1.commissionEarned).toBe(400);

      // Check ledger has both entries
      const ledger1 = await partnerRepo.getLedgerByPartnerId(partner.id);
      expect(ledger1.length).toBe(2);
      const bountyEntry = ledger1.find((e) => e.transactionType === 'BOUNTY_CREDIT');
      const commissionEntry = ledger1.find((e) => e.transactionType === 'COMMISSION_CREDIT');
      expect(bountyEntry?.commissionAmount).toBe(300);
      expect(commissionEntry?.commissionAmount).toBe(100);

      // 3. Month 2 renewal of ₹1,000 (Earns 10% recurring only = ₹100)
      const res2 = await partnerRepo.processSubscriptionPayment({
        salonId,
        grossAmount: 1000,
        discountAmount: 0,
        paymentReference: `pay_hyb_m2_${Date.now()}`,
      });
      expect(res2.commissionEarned).toBe(100);

      const ledger2 = await partnerRepo.getLedgerByPartnerId(partner.id);
      expect(ledger2.length).toBe(3); // 1 BOUNTY_CREDIT + 2 COMMISSION_CREDIT
    });
  });
});
