import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

describe('Suite 7: Indian Bank Schema & Option-Based Payouts', () => {
  let partnerId: string;

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
    const p = await partnerRepo.createPartnerApplication({
      fullName: 'Sunita Rao',
      phone: '+919811223344',
      email: 'sunita@example.com',
      city: 'Bengaluru',
      persona: 'DEDICATED',
      password: 'Password123',
    });
    partnerId = p.id;
    await partnerRepo.updatePartnerStatus(partnerId, 'ACTIVE');
    await partnerRepo.creditDirectBalance(partnerId, 3000);
  });

  it('T7.1: should validate and save complete Indian banking details into profile', async () => {
    const updated = await partnerRepo.updatePayoutMethods(partnerId, {
      payoutUpiId: 'sunita@okaxis',
      payoutHolderName: 'Sunita Rao',
      payoutBankName: 'State Bank of India',
      payoutBankAccount: '302010405060',
      payoutBankIfsc: 'SBIN0001234',
      payoutAccountType: 'SAVINGS',
    });

    expect(updated.payoutBankName).toBe('State Bank of India');
    expect(updated.payoutBankIfsc).toBe('SBIN0001234');
    expect(updated.payoutAccountType).toBe('SAVINGS');
  });

  it('T7.2: should reject invalid IFSC code format', async () => {
    expect(async () => {
      await partnerRepo.updatePayoutMethods(partnerId, {
        payoutBankIfsc: 'INVALID_IFSC_123',
      });
    }).toThrow('Invalid IFSC Code format');
  });

  it('T7.3: should execute withdrawal by selecting saved Bank Account without client account injection', async () => {
    // Setup saved bank account
    await partnerRepo.updatePayoutMethods(partnerId, {
      payoutHolderName: 'Sunita Rao',
      payoutBankName: 'HDFC Bank',
      payoutBankAccount: '501009988776',
      payoutBankIfsc: 'HDFC0000456',
      payoutAccountType: 'CURRENT',
    });

    // Execute payout by selecting option
    const payout = await partnerRepo.requestPayoutByOption({
      partnerId,
      amount: 1500,
      payoutMethod: 'BANK_TRANSFER',
    });

    expect(payout.status).toBe('REQUESTED');
    expect(payout.payoutTarget).toContain('HDFC0000456');
    expect(payout.payoutTarget).toContain('501009988776');

    const wallet = await partnerRepo.getWalletBalance(partnerId);
    expect(wallet.availableBalance).toBe(1500); // 3000 - 1500
  });
});
