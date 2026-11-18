import { describe, it, expect, beforeEach } from 'bun:test';
import { referralService } from '../src/wallet/referral.service';
import { referralRepo } from '../src/db/repositories/referral.repo';
import { walletRepo } from '../src/db/repositories/wallet.repo';
import { walletService } from '../src/wallet/wallet.service';
import type { ReferralAttribution } from '../src/engine/types';

describe('ADR 005 - C3: Atomic Referral Conversion & Wallet Credit Integrity', () => {
  const referrerOrgId = 'org-referrer-c3';
  const targetOrgId = 'org-referred-c3';

  beforeEach(async () => {
    // Seed initial pending attribution
    await referralRepo.recordAttribution({
      referralType: 'B2B_OWNER',
      referrerCode: 'REFC3B2B',
      referrerOrgId,
      referredOrgId: targetOrgId,
      rewardAmount: 100,
    });
  });

  it('C3.1: should handle concurrent conversions atomically and only credit wallet once', async () => {
    const refId = 'order_ref_c3_001';

    // Execute two concurrent conversions for the exact same org
    const [res1, res2] = await Promise.all([
      referralService.processConversion('B2B_OWNER', targetOrgId, refId),
      referralService.processConversion('B2B_OWNER', targetOrgId, refId),
    ]);

    // Exactly one should succeed, the other returns null
    const successes = [res1, res2].filter(Boolean);
    expect(successes.length).toBe(1);

    // Verify wallet of referrer received exactly one credit of ₹100
    const wallet = await walletRepo.getOrCreateWallet('OWNER', referrerOrgId);
    expect(wallet?.balance).toBe(100);
  });

  it('C3.2: should rollback attribution to PENDING if wallet credit fails', async () => {
    const brokenTargetOrg = 'org-broken-c3';

    await referralRepo.recordAttribution({
      referralType: 'B2B_OWNER',
      referrerCode: 'BROKENREF',
      referrerOrgId: 'non-existent-org-should-fail',
      referredOrgId: brokenTargetOrg,
      rewardAmount: 100,
    });

    // Temporarily mock walletService.creditBonus to throw
    const originalCredit = walletService.creditBonus;
    walletService.creditBonus = async () => {
      throw new Error('Database connection failure during wallet credit');
    };

    try {
      await expect(
        referralService.processConversion('B2B_OWNER', brokenTargetOrg, 'ref_err_001')
      ).rejects.toThrow('Database connection failure');

      // Verify attribution rolled back to PENDING and was not lost in CONVERTED state
      const attr = await referralRepo.getPendingAttributionForOrg(brokenTargetOrg);
      expect(attr).not.toBeNull();
      expect(attr?.status).toBe('PENDING');
    } finally {
      walletService.creditBonus = originalCredit;
    }
  });
});
