import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

describe('Suite 4: Wallet Ledger & Withdrawal Settlement', () => {
  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  it('T4.1: should reject withdrawal requests below the minimum threshold (₹500)', async () => {
    const partnerId = 'part_test_w1';
    await partnerRepo.creditDirectBalance(partnerId, 1000);

    expect(async () => {
      await partnerRepo.requestPayout({
        partnerId,
        amount: 400,
        payoutMethod: 'UPI',
        payoutTarget: 'test@upi',
      });
    }).toThrow('Minimum withdrawal amount is ₹500');
  });

  it('T4.2: should reject withdrawal requests exceeding available balance', async () => {
    const partnerId = 'part_test_w2';
    await partnerRepo.creditDirectBalance(partnerId, 600);

    expect(async () => {
      await partnerRepo.requestPayout({
        partnerId,
        amount: 800,
        payoutMethod: 'UPI',
        payoutTarget: 'test@upi',
      });
    }).toThrow('Insufficient available balance');
  });

  it('T4.3 & T4.4: should debit wallet and record UTR when Super Admin marks as PAID', async () => {
    const partnerId = 'part_test_w3';
    await partnerRepo.creditDirectBalance(partnerId, 2500);

    const req = await partnerRepo.requestPayout({
      partnerId,
      amount: 1500,
      payoutMethod: 'UPI',
      payoutTarget: 'partner@okhdfc',
    });

    expect(req.status).toBe('REQUESTED');
    let wallet = await partnerRepo.getWalletBalance(partnerId);
    expect(wallet.availableBalance).toBe(1000); // 2500 - 1500

    // Admin Settle
    const settled = await partnerRepo.settlePayout(req.id, {
      utrReference: 'HDFC-UPI-8899001122',
      adminNotes: 'Transferred successfully',
    });

    expect(settled.status).toBe('PAID');
    expect(settled.utrReference).toBe('HDFC-UPI-8899001122');
  });

  it('T4.5: should refund debited amount to Available balance when Admin rejects payout', async () => {
    const partnerId = 'part_test_w4';
    await partnerRepo.creditDirectBalance(partnerId, 1200);

    const req = await partnerRepo.requestPayout({
      partnerId,
      amount: 1000,
      payoutMethod: 'UPI',
      payoutTarget: 'wrong@upi',
    });

    let wallet = await partnerRepo.getWalletBalance(partnerId);
    expect(wallet.availableBalance).toBe(200);

    // Admin Rejection
    await partnerRepo.rejectPayout(req.id, 'Invalid UPI VPA handle');

    // Balance must be restored
    wallet = await partnerRepo.getWalletBalance(partnerId);
    expect(wallet.availableBalance).toBe(1200);
  });
});
