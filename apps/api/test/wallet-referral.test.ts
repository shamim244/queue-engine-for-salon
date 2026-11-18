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

      // Verify Referrer (testOrg1) wallet received dynamic admin commission (30% of ₹500 = ₹150)
      const updatedBalance = await walletService.getBalance('OWNER', testOrg1);
      expect(updatedBalance.balance).toBe(150);

      // Verify transaction record in passbook
      const passbook = await walletService.getPassbook('OWNER', testOrg1);
      expect(passbook.length).toBe(1);
      expect(passbook[0].amount).toBe(150);
      expect(passbook[0].reason).toContain('subscription');
    });

    it('should support dynamic Admin percentage adjustments (e.g. 40% commission)', async () => {
      const { repository } = await import('../src/db/repository');
      repository.updatePlatformSettings({
        b2bReferral: { commissionPercent: 40, refereeDiscountPercent: 20, enabled: true },
      });

      const testOrgA = 'org_test_wallet_ref_3';
      const testOrgB = 'org_test_wallet_ref_4';
      const plans = await planRepo.getAllPlans();
      const plan = plans[0];

      await referralRepo.recordAttribution({
        referralType: 'B2B_OWNER',
        referrerCode: `REF_${testOrgA.slice(-6).toUpperCase()}`,
        referrerOrgId: testOrgA,
        referredOrgId: testOrgB,
        rewardAmount: 500,
      });

      const order = await paymentService.createPaymentOrder({
        targetType: 'SUBSCRIPTION',
        targetId: plan.id,
        amount: 2000,
        provider: 'CASH',
        organizationId: testOrgB,
      });

      await paymentService.verifyPayment({
        orderId: order.orderId,
        provider: 'CASH',
      });

      // 40% of 2000 = 800
      const balance = await walletService.getBalance('OWNER', testOrgA);
      expect(balance.balance).toBe(800);
    });

    it('should calculate owner reward strictly on net-eligible amount after subscription & friend discounts', async () => {
      const { repository } = await import('../src/db/repository');
      // Admin configures 10% owner reward, 20% friend discount
      repository.updatePlatformSettings({
        b2bReferral: { commissionPercent: 10, refereeDiscountPercent: 20, enabled: true },
      });

      const referrerOrg = 'org_test_wallet_ref_5';
      const referredOrg = 'org_test_wallet_ref_6';

      await referralRepo.recordAttribution({
        referralType: 'B2B_OWNER',
        referrerCode: `REF_${referrerOrg.slice(-6).toUpperCase()}`,
        referrerOrgId: referrerOrg,
        referredOrgId: referredOrg,
        rewardAmount: 500,
      });

      // User specification example: Original: 1000, Sub discount: 250, Friend discount: 0 -> Net: 750 -> 10% reward: 75
      const conversion = await referralService.processConversion(
        'B2B_OWNER',
        referredOrg,
        'order_test_calc_123',
        null,
        750,
        {
          originalAmount: 1000,
          subscriptionDiscount: 250,
          friendDiscount: 0,
        }
      );

      expect(conversion).not.toBeNull();
      expect(conversion?.rewardAmount).toBe(75);
      expect(conversion?.originalAmount).toBe(1000);
      expect(conversion?.subscriptionDiscount).toBe(250);
      expect(conversion?.netEligibleAmount).toBe(750);
      expect(conversion?.rewardPercentage).toBe(10);

      // Verify wallet credit of 75
      const balance = await walletService.getBalance('OWNER', referrerOrg);
      expect(balance.balance).toBe(75);
    });

    it('should support dual-engine reward calculation: NET_PAID vs ORIGINAL_PRICE', async () => {
      const { repository } = await import('../src/db/repository');

      // --- Engine 1: NET_PAID (Default: 40% commission on Net ₹800 = ₹320) ---
      repository.updatePlatformSettings({
        b2bReferral: {
          commissionPercent: 40,
          refereeDiscountPercent: 20,
          rewardCalculationBasis: 'NET_PAID',
          enabled: true,
        },
      });

      const refOrgA = 'org_dual_ref_a';
      const refOrgB = 'org_dual_ref_b';

      await referralRepo.recordAttribution({
        referralType: 'B2B_OWNER',
        referrerCode: `REF_${refOrgA.slice(-6).toUpperCase()}`,
        referrerOrgId: refOrgA,
        referredOrgId: refOrgB,
        rewardAmount: 500,
      });

      const convNet = await referralService.processConversion(
        'B2B_OWNER',
        refOrgB,
        'order_dual_net_paid',
        null,
        800,
        {
          originalAmount: 1000,
          subscriptionDiscount: 0,
          friendDiscount: 200,
        }
      );

      expect(convNet).not.toBeNull();
      expect(convNet?.calculationBasis).toBe('NET_PAID');
      expect(convNet?.rewardAmount).toBe(320); // 40% of (1000 - 200) = 320
      expect(convNet?.originalAmount).toBe(1000);
      expect(convNet?.friendDiscount).toBe(200);
      expect(convNet?.netEligibleAmount).toBe(800);

      const balA = await walletService.getBalance('OWNER', refOrgA);
      expect(balA.balance).toBe(320);

      // --- Engine 2: ORIGINAL_PRICE (40% commission on Full ₹1,000 = ₹400) ---
      repository.updatePlatformSettings({
        b2bReferral: {
          commissionPercent: 40,
          refereeDiscountPercent: 20,
          rewardCalculationBasis: 'ORIGINAL_PRICE',
          enabled: true,
        },
      });

      const refOrgC = 'org_dual_ref_c';
      const refOrgD = 'org_dual_ref_d';

      await referralRepo.recordAttribution({
        referralType: 'B2B_OWNER',
        referrerCode: `REF_${refOrgC.slice(-6).toUpperCase()}`,
        referrerOrgId: refOrgC,
        referredOrgId: refOrgD,
        rewardAmount: 500,
      });

      const convOrig = await referralService.processConversion(
        'B2B_OWNER',
        refOrgD,
        'order_dual_orig_price',
        null,
        800,
        {
          originalAmount: 1000,
          subscriptionDiscount: 0,
          friendDiscount: 200,
        }
      );

      expect(convOrig).not.toBeNull();
      expect(convOrig?.calculationBasis).toBe('ORIGINAL_PRICE');
      expect(convOrig?.rewardAmount).toBe(400); // 40% of 1000 = 400
      expect(convOrig?.originalAmount).toBe(1000);
      expect(convOrig?.friendDiscount).toBe(200);

      const balC = await walletService.getBalance('OWNER', refOrgC);
      expect(balC.balance).toBe(400);
    });

    it('should verify salon owner referral codes (e.g. REF_GETSALON) during onboarding plan quotation', async () => {
      const { partnerRepo } = await import('../src/db/repositories/partner.repo');
      const { organizationRepo } = await import('../src/db/repositories/organization.repo');
      
      const testOwnerOrg = await organizationRepo.createOrganization({
        name: 'GetSalon Test',
        slug: `getsalon-test-${Date.now()}`,
        tier: 'PRO',
        maxBranches: 3,
        maxStylistsPerBranch: 5,
      });

      // Quote PRO plan (1499) with REF_<SLUG>
      const referralCode = `REF_${testOwnerOrg.slug.toUpperCase()}`;
      const quote = await partnerRepo.quoteReferralDiscount({
        partnerCode: referralCode,
        planTier: 'PRO',
        basePrice: 1499,
      });

      expect(quote.isValid).toBe(true);
      expect(quote.discountPercent).toBe(20); // 20% friend discount
      expect(quote.discountAmount).toBe(299.8);
      expect(quote.netPayableAmount).toBe(1199.2);
      expect(quote.partnerName).toBe(testOwnerOrg.name);

      // Also verify without REF_ prefix
      const quoteRaw = await partnerRepo.quoteReferralDiscount({
        partnerCode: testOwnerOrg.slug,
        planTier: 'PRO',
        basePrice: 1499,
      });
      expect(quoteRaw.isValid).toBe(true);
      expect(quoteRaw.discountPercent).toBe(20);
    });
  });

  describe('Wallet Checkout Settlement (Net Payable = 0)', () => {
    it('should support instant WALLET provider settlement', async () => {
      const plans = await planRepo.getAllPlans();
      const plan = plans[0];
      if (!plan) return;

      await walletService.creditBonus({
        walletType: 'OWNER',
        identifier: testOrg1,
        amount: 500,
        reason: 'Seed wallet for checkout test',
      });

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

    it('GET /api/referrals/client-loyalty should return loyalty settings and advocates', async () => {
      const { salonRepo } = await import('../src/db/repositories/salon.repo');
      const allSalons = await salonRepo.getAllSalons();
      const targetSalon = allSalons.length > 0 ? allSalons[0] : null;
      if (!targetSalon) return;

      const res = await app.handle(
        new Request(`http://localhost/api/referrals/client-loyalty?salonId=${targetSalon.id || targetSalon.slug}`)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.loyaltySettings).toBeDefined();
      expect(typeof data.loyaltySettings.stampGoal).toBe('number');
      expect(Array.isArray(data.customerAdvocates)).toBe(true);
      expect(data.stats).toBeDefined();
    });

    it('B2B Referral Upgrade: auto-referral and coupon apply should grant 20% discount to referred salon', async () => {
      const { organizationRepo } = await import('../src/db/repositories/organization.repo');
      const referrerOrg = await organizationRepo.createOrganization({
        name: 'Salon Alpha',
        slug: 'salon-alpha-test',
        tier: 'PRO',
        maxBranches: 2,
        maxStylistsPerBranch: 3,
      });

      const referredOrg = await organizationRepo.createOrganization({
        name: 'Salon Beta Free',
        slug: 'salon-beta-free-test',
        tier: 'FREE',
        maxBranches: 1,
        maxStylistsPerBranch: 1,
      });

      const referrerCode = referralService.getOrgReferralCode(referrerOrg.id, referrerOrg.slug);

      // 2. Salon Beta onboards on FREE plan with Salon Alpha's code
      await referralService.attributeReferral({
        referralType: 'B2B_OWNER',
        referrerCode,
        referredOrgId: referredOrg.id,
      });

      // 3. Query /api/coupons/auto-referral for Salon Beta
      const autoRes = await app.handle(
        new Request(`http://localhost/api/coupons/auto-referral?organizationId=${referredOrg.id}`)
      );
      expect(autoRes.status).toBe(200);
      const autoData = await autoRes.json();
      expect(autoData.success).toBe(true);
      expect(autoData.hasReferralDiscount).toBe(true);
      expect(autoData.partnerCode).toBe(referrerCode);
      expect(autoData.discountPercent).toBe(20);

      // 4. Salon Beta enters referral code manually at checkout
      const applyRes = await app.handle(
        new Request('http://localhost/api/coupons/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: referrerCode,
            targetType: 'SUBSCRIPTION',
            orderAmount: 1499,
            organizationId: referredOrg.id,
          }),
        })
      );
      expect(applyRes.status).toBe(200);
      const applyData = await applyRes.json();
      expect(applyData.valid).toBe(true);
      expect(applyData.discountAmount).toBe(299.8);
      expect(applyData.netPayable).toBe(1199.2);

      // 5. Self-referral prevention: Salon Alpha tries to use their own code
      const selfApplyRes = await app.handle(
        new Request('http://localhost/api/coupons/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: referrerCode,
            targetType: 'SUBSCRIPTION',
            orderAmount: 1499,
            organizationId: referrerOrg.id,
          }),
        })
      );
      expect(selfApplyRes.status).toBe(400);
      const selfApplyData = await selfApplyRes.json();
      expect(selfApplyData.valid).toBe(false);
      expect(selfApplyData.message).toContain('cannot use your own referral code');
    });

    it('One-Time Referral Limit: strictly blocks referral discount and rewards on 2nd, 3rd, and subsequent purchases', async () => {
      const { organizationRepo } = await import('../src/db/repositories/organization.repo');
      const referrerOrg = await organizationRepo.createOrganization({
        name: 'Salon Alpha OneTime',
        slug: 'salon-alpha-onetime',
        tier: 'PRO',
        maxBranches: 2,
        maxStylistsPerBranch: 3,
      });

      const referredOrg = await organizationRepo.createOrganization({
        name: 'Salon Beta OneTime',
        slug: 'salon-beta-onetime',
        tier: 'FREE',
        maxBranches: 1,
        maxStylistsPerBranch: 1,
      });

      const referrerCode = referralService.getOrgReferralCode(referrerOrg.id, referrerOrg.slug);

      // 1. Initial attribution during onboarding on Free plan
      await referralService.attributeReferral({
        referralType: 'B2B_OWNER',
        referrerCode,
        referredOrgId: referredOrg.id,
      });

      // 2. First Purchase (Eligible)
      const firstCheck = await referralService.isOrgEligibleForReferral(referredOrg.id);
      expect(firstCheck.eligible).toBe(true);

      const firstApply = await app.handle(
        new Request('http://localhost/api/coupons/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: referrerCode,
            targetType: 'SUBSCRIPTION',
            orderAmount: 1499,
            organizationId: referredOrg.id,
          }),
        })
      );
      expect(firstApply.status).toBe(200);
      const firstApplyData = await firstApply.json();
      expect(firstApplyData.valid).toBe(true);
      expect(firstApplyData.discountAmount).toBe(299.8);

      // Fulfill First Subscription Purchase Order
      const plans = await planRepo.getAllPlans();
      const planId = plans.length > 0 ? plans[0].id : 'plan-starter-01';

      const firstOrder = await paymentService.createPaymentOrder({
        targetType: 'SUBSCRIPTION',
        targetId: planId,
        amount: 1199.2,
        provider: 'CASH',
        organizationId: referredOrg.id,
        metadata: {
          basePrice: 1499,
          originalAmount: 1499,
          subscriptionDiscount: 0,
          friendDiscount: 299.8,
          couponId: `b2b_ref_${referrerOrg.id}`,
          couponDiscount: 299.8,
          couponCode: referrerCode,
          partnerCode: referrerCode,
        },
      });

      await paymentService.verifyPayment({
        orderId: firstOrder.orderId,
        provider: 'CASH',
      });

      // Verify referrer wallet credited once
      const refWalletAfterFirst = await walletService.getBalance('OWNER', referrerOrg.id);
      expect(refWalletAfterFirst.balance).toBeGreaterThan(0);
      const firstReward = refWalletAfterFirst.balance;

      // Verify attribution is converted
      const pendingAfter = await referralRepo.getPendingAttributionForOrg(referredOrg.id);
      expect(pendingAfter).toBeNull(); // No longer pending

      const convertedCount = await referralRepo.getConvertedReferralCountForOrg(referredOrg.id);
      expect(convertedCount).toBe(1);

      // 3. Second Purchase Attempt (MUST BE BLOCKED)
      const secondCheck = await referralService.isOrgEligibleForReferral(referredOrg.id);
      expect(secondCheck.eligible).toBe(false);
      expect(secondCheck.reason).toContain('first subscription purchase only');

      // Auto-referral must return false
      const autoRes2 = await app.handle(
        new Request(`http://localhost/api/coupons/auto-referral?organizationId=${referredOrg.id}`)
      );
      expect(autoRes2.status).toBe(200);
      const autoData2 = await autoRes2.json();
      expect(autoData2.hasReferralDiscount).toBe(false);

      // Manual coupon apply must be rejected
      const secondApply = await app.handle(
        new Request('http://localhost/api/coupons/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: referrerCode,
            targetType: 'SUBSCRIPTION',
            orderAmount: 1499,
            organizationId: referredOrg.id,
          }),
        })
      );
      expect(secondApply.status).toBe(400);
      const secondApplyData = await secondApply.json();
      expect(secondApplyData.valid).toBe(false);
      expect(secondApplyData.message).toContain('first subscription purchase only');

      // Attempting to re-attribute referral directly must throw
      let reAttrError = false;
      try {
        await referralService.attributeReferral({
          referralType: 'B2B_OWNER',
          referrerCode,
          referredOrgId: referredOrg.id,
        });
      } catch (err: any) {
        reAttrError = true;
        expect(err.message).toContain('first subscription purchase only');
      }
      expect(reAttrError).toBe(true);

      // 4. Third Purchase Attempt (MUST BE BLOCKED)
      const thirdApply = await app.handle(
        new Request('http://localhost/api/coupons/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: referrerCode,
            targetType: 'SUBSCRIPTION',
            orderAmount: 4999,
            organizationId: referredOrg.id,
          }),
        })
      );
      expect(thirdApply.status).toBe(400);
      const thirdApplyData = await thirdApply.json();
      expect(thirdApplyData.valid).toBe(false);
      expect(thirdApplyData.message).toContain('first subscription purchase only');

      // Referrer wallet balance must remain unchanged (no duplicate commission rewards)
      const refWalletFinal = await walletService.getBalance('OWNER', referrerOrg.id);
      expect(refWalletFinal.balance).toBe(firstReward);
    });
  });
});
