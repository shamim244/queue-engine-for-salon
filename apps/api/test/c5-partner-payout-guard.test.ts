import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../src/db/repositories/partner.repo';

describe('ADR 005 - C5: Partner Payout Concurrency & Double-Settlement Guard', () => {
  let partnerId: string;

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
    const partner = await partnerRepo.createPartnerApplication({
      fullName: 'Payout Tester',
      phone: '9888877777',
      email: 'payout.tester@example.com',
      persona: 'GROUND_HUSTLER',
      city: 'Delhi',
      password: 'Password123!',
    });
    partnerId = partner.id;
    await partnerRepo.updatePartnerStatus(partnerId, 'ACTIVE');

    // Credit ₹1,000 to partner wallet
    await partnerRepo.creditDirectBalance(partnerId, 1000);
  });

  it('C5.1: should prevent overdraft when concurrent withdrawal requests exceed balance', async () => {
    // Partner has ₹1,000 balance. Request ₹600 twice concurrently (total ₹1,200 > ₹1,000)
    const results = await Promise.allSettled([
      partnerRepo.requestPayout({
        partnerId,
        amount: 600,
        payoutMethod: 'UPI',
        payoutTarget: 'test@upi',
      }),
      partnerRepo.requestPayout({
        partnerId,
        amount: 600,
        payoutMethod: 'UPI',
        payoutTarget: 'test@upi',
      }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Exactly one should succeed and one must fail with insufficient balance
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    if (failures[0].status === 'rejected') {
      expect(failures[0].reason.message).toContain('Insufficient available balance');
    }

    // Verify remaining balance is ₹400
    const balance = await partnerRepo.getWalletBalance(partnerId);
    expect(balance.availableBalance).toBe(400);
  });

  it('C5.2: should reject settling an already PAID payout request', async () => {
    const payout = await partnerRepo.requestPayout({
      partnerId,
      amount: 500,
      payoutMethod: 'UPI',
      payoutTarget: 'test@upi',
    });

    // Settle once: Should succeed
    await partnerRepo.settlePayout(payout.id, { utrReference: 'UTR_TEST_111' });

    // Settle second time: Should fail
    await expect(
      partnerRepo.settlePayout(payout.id, { utrReference: 'UTR_TEST_222' })
    ).rejects.toThrow('Cannot settle payout in PAID state');
  });

  it('C5.3: should reject rejecting an already PAID payout request', async () => {
    const payout = await partnerRepo.requestPayout({
      partnerId,
      amount: 500,
      payoutMethod: 'UPI',
      payoutTarget: 'test@upi',
    });

    // Settle payout
    await partnerRepo.settlePayout(payout.id, { utrReference: 'UTR_TEST_111' });

    // Attempt to reject already PAID payout
    await expect(
      partnerRepo.rejectPayout(payout.id, 'Fraudulent claim attempt')
    ).rejects.toThrow('Cannot reject payout in PAID state');

    // Balance should remain correct (withdrawn, not refunded)
    const balance = await partnerRepo.getWalletBalance(partnerId);
    expect(balance.totalWithdrawn).toBe(500);
    expect(balance.availableBalance).toBe(500);
  });
});
