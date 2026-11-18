import { describe, it, expect } from 'bun:test';
import { calculatePartnerCommission } from '../../src/engine/partner-commission';

describe('Suite 2: Net-Revenue Commission Math Engine', () => {
  it('T2.1: should calculate commission strictly on Net Paid Amount when coupon discount is applied', () => {
    const res = calculatePartnerCommission({
      commissionModel: 'RECURRING_PERCENT',
      grossPlanAmount: 1000,
      discountAmount: 200,
      commissionPercent: 10,
    });

    expect(res.netPaidAmount).toBe(800);
    expect(res.commissionAmount).toBe(80.00);
    expect(res.isEligible).toBe(true);
  });

  it('T2.2: should yield ZERO commission when 100% discount / free trial plan is used', () => {
    const res = calculatePartnerCommission({
      commissionModel: 'RECURRING_PERCENT',
      grossPlanAmount: 1000,
      discountAmount: 1000,
      commissionPercent: 10,
    });

    expect(res.netPaidAmount).toBe(0);
    expect(res.commissionAmount).toBe(0);
    expect(res.isEligible).toBe(false);
  });

  it('T2.3: should clamp negative net paid amounts to zero if coupon exceeds plan price', () => {
    const res = calculatePartnerCommission({
      commissionModel: 'RECURRING_PERCENT',
      grossPlanAmount: 500,
      discountAmount: 700,
      commissionPercent: 10,
    });

    expect(res.netPaidAmount).toBe(0);
    expect(res.commissionAmount).toBe(0);
    expect(res.isEligible).toBe(false);
  });

  it('T2.4: should enforce 2-decimal rounded precision on fractional rupee calculations', () => {
    const res = calculatePartnerCommission({
      commissionModel: 'RECURRING_PERCENT',
      grossPlanAmount: 799,
      discountAmount: 100, // Net 699
      commissionPercent: 15, // 15% of 699 = 104.85
    });

    expect(res.netPaidAmount).toBe(699);
    expect(res.commissionAmount).toBe(104.85);
  });

  it('T2.5: should calculate flat bounty under Model A regardless of plan price', () => {
    const res = calculatePartnerCommission({
      commissionModel: 'FLAT_BOUNTY',
      grossPlanAmount: 1500,
      discountAmount: 300,
      commissionPercent: 10,
      bountyAmount: 500,
    });

    expect(res.netPaidAmount).toBe(1200);
    expect(res.commissionAmount).toBe(500.00);
  });

  it('T2.6: should combine Model B recurring and Model A bounty in HYBRID mode', () => {
    const res = calculatePartnerCommission({
      commissionModel: 'HYBRID',
      grossPlanAmount: 1000,
      discountAmount: 200, // Net 800
      commissionPercent: 10, // 80
      bountyAmount: 300,     // 300
    });

    expect(res.netPaidAmount).toBe(800);
    expect(res.commissionAmount).toBe(380.00);
  });

  it('T2.7: should return ZERO commission when partner commission period has expired', () => {
    const expiredDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    const res = calculatePartnerCommission({
      commissionModel: 'RECURRING_PERCENT',
      grossPlanAmount: 1000,
      discountAmount: 0,
      commissionPercent: 10,
      expiresAt: expiredDate,
    });

    expect(res.commissionAmount).toBe(0);
    expect(res.isEligible).toBe(false);
    expect(res.rejectionReason).toBe('DURATION_EXPIRED');
  });

  it('T2.8: should return ZERO commission when partner is paused by Admin', () => {
    const res = calculatePartnerCommission({
      commissionModel: 'RECURRING_PERCENT',
      grossPlanAmount: 1000,
      discountAmount: 0,
      commissionPercent: 10,
      isPaused: true,
    });

    expect(res.commissionAmount).toBe(0);
    expect(res.isEligible).toBe(false);
    expect(res.rejectionReason).toBe('PARTNER_PAUSED');
  });
});
