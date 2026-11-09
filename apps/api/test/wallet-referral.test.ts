import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { app } from '../index';
import { walletRepo } from '../src/db/repositories/wallet.repo';
import { walletService } from '../src/wallet/wallet.service';
import { referralRepo } from '../src/db/repositories/referral.repo';
import { referralService } from '../src/wallet/referral.service';
import { paymentService } from '../src/payment/payment.service';
import { planRepo } from '../src/db/repositories/plan.repo';
import { isMySqlConnected, getDb } from '../src/db/mysql';

import { memoryStore } from '../src/db/repositories/store';

describe('Dual-Wallet & Referral Commission Engine - Tests', () => {
  const testOrg1 = 'org_test_wallet_ref_1';
  const testOrg2 = 'org_test_wallet_ref_2';
  const testPhone1 = '9999000001';
  const testPhone2 = '9999000002';
  const testSalon = 'salon-test-wallet-01';

  beforeEach(async () => {
    // Clear memory store test items
    for (const [id, w] of memoryStore.wallets.entries()) {
      if (w.ownerOrgId?.startsWith('org_test_') || w.consumerPhone?.startsWith('99990000')) {
        memoryStore.wallets.delete(id);
      }
    }
    for (const [id, t] of memoryStore.walletTransactions.entries()) {
      if (t.ownerOrgId?.startsWith('org_test_') || t.consumerPhone?.startsWith('99990000')) {
        memoryStore.walletTransactions.delete(id);
      }
    }
    for (const [id, r] of memoryStore.referralAttributions.entries()) {
      if (r.referrerOrgId?.startsWith('org_test_') || r.referredOrgId?.startsWith('org_test_')) {
        memoryStore.referralAttributions.delete(id);
      }
    }

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('DELETE FROM referral_attributions WHERE referrer_org_id LIKE "org_test_%" OR referred_org_id LIKE "org_test_%" OR referrer_phone LIKE "99990000%"');
        await db.query('DELETE FROM wallet_transactions WHERE owner_org_id LIKE "org_test_%" OR consumer_phone LIKE "99990000%"');
        await db.query('DELETE FROM wallets WHERE owner_org_id LIKE "org_test_%" OR consumer_phone LIKE "99990000%"');
        await db.query('DELETE FROM payment_orders WHERE organization_id LIKE "org_test_%"');
        await db.query('DELETE FROM organization_subscriptions WHERE organization_id LIKE "org_test_%"');
      } catch {}
    }
  });

  afterAll(async () => {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('DELETE FROM referral_attributions WHERE referrer_org_id LIKE "org_test_%" OR referred_org_id LIKE "org_test_%" OR referrer_phone LIKE "99990000%"');
        await db.query('DELETE FROM wallet_transactions WHERE owner_org_id LIKE "org_test_%" OR consumer_phone LIKE "99990000%"');
        await db.query('DELETE FROM wallets WHERE owner_org_id LIKE "org_test_%" OR consumer_phone LIKE "99990000%"');
        await db.query('DELETE FROM payment_orders WHERE organization_id LIKE "org_test_%"');
        await db.query('DELETE FROM organization_subscriptions WHERE organization_id LIKE "org_test_%"');
      } catch {}
    }
  });

  describe('Wallet Ledger & Anti-Overdraft Protection', () => {
    it('should initialize a wallet with ₹0 balance', async () => {
      const wallet = await walletRepo.getOrCreateWallet('OWNER', testOrg1);
      expect(wallet.walletType).toBe('OWNER');
      expect(wallet.ownerOrgId).toBe(testOrg1);
      expect(wallet.balance).toBe(0);

      const balanceRes = await walletService.getBalance('OWNER', testOrg1);
      expect(balanceRes.balance).toBe(0);
      expect(balanceRes.currency).toBe('INR');
    });

    it('should accurately credit balance and append double-entry ledger record', async () => {
      const credit1 = await walletService.creditBonus({
        walletType: 'OWNER',
        identifier: testOrg1,
        amount: 500,
        reason: 'Welcome bonus credit',
      });

      expect(credit1.wallet.balance).toBe(500);
      expect(credit1.transaction.type).toBe('CREDIT');
      expect(credit1.transaction.amount).toBe(500);
      expect(credit1.transaction.balanceAfter).toBe(500);

      // Second credit
      const credit2 = await walletService.creditBonus({
        walletType: 'OWNER',
        identifier: testOrg1,
        amount: 300,
        reason: 'Referral reward',
      });

      expect(credit2.wallet.balance).toBe(800);
      expect(credit2.transaction.balanceAfter).toBe(800);

      const passbook = await walletService.getPassbook('OWNER', testOrg1);
      expect(passbook.length).toBeGreaterThanOrEqual(2);
      expect(passbook[0].balanceAfter).toBe(800); // Most recent first
    });

    it('should debit balance and prevent overdraft when funds are insufficient', async () => {
      await walletService.creditBonus({
        walletType: 'OWNER',
        identifier: testOrg1,
        amount: 400,
        reason: 'Initial top-up',
      });

      // Valid debit
      const debitRes = await walletService.deductForCheckout({
        walletType: 'OWNER',
        identifier: testOrg1,
        amount: 150,
        reason: 'Checkout discount deduction',
      });

      expect(debitRes.wallet.balance).toBe(250);
      expect(debitRes.transaction.type).toBe('DEBIT');
      expect(debitRes.transaction.balanceAfter).toBe(250);

      // Overdraft debit attempt (Available: 250, Requesting: 500)
      let threw = false;
      try {
        await walletService.deductForCheckout({
          walletType: 'OWNER',
          identifier: testOrg1,
          amount: 500,
          reason: 'Excessive debit attempt',
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toContain('Insufficient wallet balance');
      }
      expect(threw).toBe(true);

      // Verify balance did not change
      const current = await walletService.getBalance('OWNER', testOrg1);
      expect(current.balance).toBe(250);
    });
  });

  describe('Referral Attribution & Conversion Hook', () => {
    it('should attribute a referral and prevent self-referral', async () => {
      // Self-referral attempt
      let selfRefError = false;
      try {
        await referralService.attributeReferral({
          referralType: 'B2B_OWNER',
          referrerCode: `REF_${testOrg1.slice(-6).toUpperCase()}`,
          referredOrgId: testOrg1,
        });
      } catch {
        selfRefError = true;
      }
      expect(selfRefError).toBe(true);

      // Valid attribution: testOrg1 refers testOrg2
      const code = referralService.getOrgReferralCode(testOrg1);
      const attribution = await referralRepo.recordAttribution({
        referralType: 'B2B_OWNER',
        referrerCode: code,
        referrerOrgId: testOrg1,
        referredOrgId: testOrg2,
        rewardAmount: 500,
      });

      expect(attribution.status).toBe('PENDING');
      expect(attribution.rewardAmount).toBe(500);

      // Check pending attribution exists
      const pending = await referralRepo.getPendingAttributionForOrg(testOrg2);
      expect(pending).not.toBeNull();
      expect(pending?.referrerOrgId).toBe(testOrg1);
    });

    it('should automatically convert referral and credit ₹500 to referrer when subscription is verified', async () => {
      // Setup pending attribution: testOrg1 referred testOrg2
      await referralRepo.recordAttribution({
        referralType: 'B2B_OWNER',
        referrerCode: `REF_${testOrg1.slice(-6).toUpperCase()}`,
        referrerOrgId: testOrg1,
        referredOrgId: testOrg2,
        rewardAmount: 500,
      });

      // Referrer initial balance is 0
      const initialBalance = await walletService.getBalance('OWNER', testOrg1);
      expect(initialBalance.balance).toBe(0);

      // Get any active plan (or default starter)
      const plans = await planRepo.getAllPlans();
      const plan = plans.length > 0 ? plans[0] : null;
      if (!plan) return;

      // testOrg2 creates payment order for subscription
      const order = await paymentService.createPaymentOrder({
        targetType: 'SUBSCRIPTION',
        targetId: plan.id,
        amount: 500,
        provider: 'CASH',
        organizationId: testOrg2,
      });

      // Verify payment order (simulating payment receipt)
      const verifyRes = await paymentService.verifyPayment({
        orderId: order.orderId,
        provider: 'CASH',
      });

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.status).toBe('COMPLETED');

      // Verify referral converted
      const pendingAfter = await referralRepo.getPendingAttributionForOrg(testOrg2);
      expect(pendingAfter).toBeNull(); // No longer pending

      // Verify Referrer (testOrg1) wallet received ₹500
      const updatedBalance = await walletService.getBalance('OWNER', testOrg1);
      expect(updatedBalance.balance).toBe(500);

      // Verify transaction record in passbook
      const passbook = await walletService.getPassbook('OWNER', testOrg1);
      expect(passbook.length).toBe(1);
      expect(passbook[0].amount).toBe(500);
      expect(passbook[0].reason).toContain('subscription');
    });
  });

  describe('Wallet Checkout Settlement (Net Payable = 0)', () => {
    it('should support instant WALLET provider settlement', async () => {
      const plans = await planRepo.getAllPlans();
      const plan = plans[0];
      if (!plan) return;

      const order = await paymentService.createPaymentOrder({
        targetType: 'SUBSCRIPTION',
        targetId: plan.id,
        amount: 0,
        provider: 'WALLET',
        organizationId: testOrg1,
        metadata: {
          basePrice: 500,
          walletDeducted: 500,
        },
      });

      expect(order.provider).toBe('WALLET');
      expect(order.amount).toBe(0);

      const verification = await paymentService.verifyPayment({
        orderId: order.orderId,
        provider: 'WALLET',
      });

      expect(verification.success).toBe(true);
      expect(verification.status).toBe('COMPLETED');
    });
  });

  describe('Elysia REST Endpoints', () => {
    it('GET /api/wallets/balance should return wallet balance', async () => {
      await walletService.creditBonus({
        walletType: 'OWNER',
        identifier: testOrg1,
        amount: 750,
        reason: 'Promo reward',
      });

      const res = await app.handle(
        new Request(`http://localhost/api/wallets/balance?walletType=OWNER&identifier=${testOrg1}`)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.balance).toBe(750);
      expect(data.currency).toBe('INR');
    });

    it('GET /api/wallets/passbook should return passbook transactions', async () => {
      await walletService.creditBonus({
        walletType: 'OWNER',
        identifier: testOrg1,
        amount: 350,
        reason: 'Passbook seed transaction',
      });

      const res = await app.handle(
        new Request(`http://localhost/api/wallets/passbook?walletType=OWNER&identifier=${testOrg1}`)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.transactions)).toBe(true);
      expect(data.transactions.length).toBeGreaterThan(0);
    });

    it('POST /api/wallets/credit should credit wallet via API', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/wallets/credit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletType: 'OWNER',
            identifier: testOrg1,
            amount: 250,
            reason: 'Support courtesy credit',
          }),
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.wallet.balance).toBe(250);
    });

    it('GET /api/referrals/stats should return referral stats and share code', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/referrals/stats?referrerOrgId=${testOrg1}`)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(typeof data.totalReferred).toBe('number');
      expect(typeof data.totalEarned).toBe('number');
      expect(data.code).toBeDefined();
    });
  });
});
