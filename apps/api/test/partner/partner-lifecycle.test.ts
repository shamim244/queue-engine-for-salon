import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

describe('Suite 1: Partner Lifecycle & Governance', () => {
  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  it('T1.1: should create a new partner in PENDING_REVIEW state with clean referral code', async () => {
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Rahul Sharma',
      phone: '+919876543210',
      email: 'rahul@example.com',
      city: 'Meerut',
      persona: 'GROUND_HUSTLER',
      payoutUpiId: 'rahul@okhdfc',
    });

    expect(partner.id).toMatch(/^part_/);
    expect(partner.status).toBe('PENDING_REVIEW');
    expect(partner.referralCode).toBe('RAHULSHARMA');
    expect(partner.commissionPercent).toBe(10.0);
    expect(partner.isCommissionPaused).toBe(false);
  });

  it('T1.2: should sanitize referral codes removing accents and special symbols', async () => {
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: "Dr. Élodie O'Connor-Smith!",
      phone: '+919876543211',
      email: 'elodie@example.com',
      city: 'Mumbai',
      persona: 'CREATOR',
    });

    expect(partner.referralCode).toBe('ELODIEOCONNORSMITH');
  });

  it('T1.3: should reject duplicate phone registrations', async () => {
    await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Partner A',
      phone: '+919876543212',
      email: 'parta@example.com',
      city: 'Delhi',
      persona: 'GROUND_HUSTLER',
    });

    expect(async () => {
      await partnerRepo.createPartnerApplication({
        password: 'Test@1234',
        fullName: 'Partner B',
        phone: '+919876543212',
        email: 'partb@example.com',
        city: 'Delhi',
        persona: 'GROUND_HUSTLER',
      });
    }).toThrow('Phone number already registered');
  });

  it('T1.4 & T1.5: should allow Super Admin to approve or reject a partner', async () => {
    const p1 = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Vikram Singh',
      phone: '+919811122233',
      email: 'vikram.singh@example.com',
      city: 'Delhi',
      persona: 'CREATOR',
    });
    const approved = await partnerRepo.updatePartnerStatus(p1.id, 'ACTIVE');
    expect(approved.status).toBe('ACTIVE');

    const p2 = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Spam Applicant',
      phone: '+919811122234',
      email: 'spam@example.com',
      city: 'Delhi',
      persona: 'GROUND_HUSTLER',
    });
    const rejected = await partnerRepo.updatePartnerStatus(p2.id, 'REJECTED');
    expect(rejected.status).toBe('REJECTED');
  });

  it('T1.6 & T1.7: should pause and resume commission accrual', async () => {
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Karan Johar',
      phone: '+919844455566',
      email: 'karan@example.com',
      city: 'Mumbai',
      persona: 'DEDICATED',
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

    const paused = await partnerRepo.setCommissionPaused(partner.id, true);
    expect(paused.isCommissionPaused).toBe(true);

    const resumed = await partnerRepo.setCommissionPaused(partner.id, false);
    expect(resumed.isCommissionPaused).toBe(false);
  });

  it('T1.8: should allow Super Admin to modify commission terms (rate to 15%, duration to 3_MONTHS)', async () => {
    const partner = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Rohit Shetty',
      phone: '+919855566677',
      email: 'rohit@example.com',
      city: 'Pune',
      persona: 'CREATOR',
    });
    await partnerRepo.updatePartnerStatus(partner.id, 'ACTIVE');

    const updated = await partnerRepo.updateCommissionTerms(partner.id, {
      commissionPercent: 15.0,
      durationType: '3_MONTHS',
      commissionModel: 'HYBRID',
      bountyAmount: 350.0,
    });

    expect(updated.commissionPercent).toBe(15.0);
    expect(updated.durationType).toBe('3_MONTHS');
    expect(updated.commissionModel).toBe('HYBRID');
    expect(updated.bountyAmount).toBe(350.0);

    const fetched = await partnerRepo.getPartnerById(partner.id);
    expect(fetched?.commissionPercent).toBe(15.0);
    expect(fetched?.durationType).toBe('3_MONTHS');
  });
});
