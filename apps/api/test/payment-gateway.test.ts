import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { upiQrAdapter } from '../src/payment/adapters/upi-qr.adapter';
import { cashAdapter } from '../src/payment/adapters/cash.adapter';
import { razorpayAdapter } from '../src/payment/adapters/razorpay.adapter';
import { paymentService } from '../src/payment/payment.service';
import { paymentRepo } from '../src/db/repositories/payment.repo';
import { planRepo } from '../src/db/repositories/plan.repo';
import { organizationRepo } from '../src/db/repositories/organization.repo';
import { isMySqlConnected, getDb } from '../src/db/mysql';
import type { PaymentOrder, CreatePlanPayload } from '../src/engine/types';

describe('Universal Pluggable Payment Gateway Engine - Unit & Integration Tests', () => {
  beforeEach(async () => {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('DELETE FROM payment_orders WHERE id LIKE "po_test_%" OR id LIKE "po_%"');
        await db.query('DELETE FROM organization_subscriptions WHERE organization_id LIKE "org_test_%"');
      } catch {}
    }
  });

  // 1. UPI QR Adapter Tests
  describe('UPI QR Adapter (NPCI Dynamic QR)', () => {
    it('should generate an NPCI-compliant UPI URI with correct parameters', async () => {
      const orderPayload = {
        targetType: 'SUBSCRIPTION' as const,
        targetId: 'plan-test-01',
        amount: 1499.5,
        currency: 'INR',
        provider: 'UPI_QR' as const,
        metadata: { planName: 'Studio Pro' },
      };

      const result = await upiQrAdapter.createOrder(orderPayload, 'po_test_123');

      expect(result.qrType).toBe('DYNAMIC_NPCI');
      expect(result.upiString).toBeDefined();
      expect(result.upiString).toContain('upi://pay?');
      expect(result.upiString).toContain('pa=salonpayments@icici');
      expect(result.upiString).toContain('am=1499.50');
      expect(result.upiString).toContain('cu=INR');
      expect(result.upiString).toContain('tr=po_test_123');
      expect(result.upiString).toContain('tn=Subscription%3A%20Studio%20Pro');
    });

    it('should require a transaction reference to verify UPI payment', async () => {
      const mockOrder: PaymentOrder = {
        id: 'po_test_upi_01',
        targetType: 'SUBSCRIPTION',
        targetId: 'plan-test-01',
        amount: 500,
        currency: 'INR',
        provider: 'UPI_QR',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const failResult = await upiQrAdapter.verifyPayment(mockOrder, {
        orderId: mockOrder.id,
        provider: 'UPI_QR',
        transactionRef: '',
      });
      expect(failResult.verified).toBe(false);

      const successResult = await upiQrAdapter.verifyPayment(mockOrder, {
        orderId: mockOrder.id,
        provider: 'UPI_QR',
        transactionRef: 'UTR-987654321012',
      });
      expect(successResult.verified).toBe(true);
      expect(successResult.transactionRef).toBe('UTR-987654321012');
    });
  });

  // 2. Cash Adapter Tests
  describe('Cash / Counter Settlement Adapter', () => {
    it('should return counter settlement instructions and verify with audit reference', async () => {
      const orderPayload = {
        targetType: 'SUBSCRIPTION' as const,
        targetId: 'plan-test-01',
        amount: 2000,
        provider: 'CASH' as const,
      };

      const result = await cashAdapter.createOrder(orderPayload, 'po_test_cash_01');
      expect(result.settlementType).toBe('COUNTER_CASH');
      expect(result.cashInstructions).toContain('reception desk');

      const mockOrder: PaymentOrder = {
        id: 'po_test_cash_01',
        targetType: 'SUBSCRIPTION',
        targetId: 'plan-test-01',
        amount: 2000,
        currency: 'INR',
        provider: 'CASH',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const verifyResult = await cashAdapter.verifyPayment(mockOrder, {
        orderId: mockOrder.id,
        provider: 'CASH',
      });
      expect(verifyResult.verified).toBe(true);
      expect(verifyResult.transactionRef).toContain('CASH-');
    });
  });

  // 3. Razorpay Sandbox Adapter Tests
  describe('Razorpay Sandbox Adapter', () => {
    it('should generate order payload in paise subunit', async () => {
      const result = await razorpayAdapter.createOrder(
        {
          targetType: 'SUBSCRIPTION',
          targetId: 'plan-test-01',
          amount: 799,
          provider: 'RAZORPAY',
          metadata: { planName: 'Growth Tier' },
        },
        'po_test_rzp_01'
      );

      expect(result.razorpayOrderId).toContain('order_test_');
      expect(result.amount).toBe(79900); // 799 * 100 paise
      expect(result.isSandbox).toBe(true);
    });

    it('should verify valid HMAC signature and reject invalid/tampered signature', async () => {
      const razorpayOrderId = 'order_test_12345';
      const paymentId = 'pay_test_998877';
      const validSig = razorpayAdapter.generateTestSignature(razorpayOrderId, paymentId);

      const mockOrder: PaymentOrder = {
        id: 'po_test_rzp_sig',
        targetType: 'SUBSCRIPTION',
        targetId: 'plan-test-01',
        amount: 799,
        currency: 'INR',
        provider: 'RAZORPAY',
        providerOrderId: razorpayOrderId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Valid signature
      const validRes = await razorpayAdapter.verifyPayment(mockOrder, {
        orderId: mockOrder.id,
        provider: 'RAZORPAY',
        razorpayPaymentId: paymentId,
        razorpaySignature: validSig,
      });
      expect(validRes.verified).toBe(true);

      // Tampered signature
      const invalidRes = await razorpayAdapter.verifyPayment(mockOrder, {
        orderId: mockOrder.id,
        provider: 'RAZORPAY',
        razorpayPaymentId: paymentId,
        razorpaySignature: 'tampered_fake_signature',
      });
      expect(invalidRes.verified).toBe(false);
      expect(invalidRes.message).toContain('Invalid Razorpay signature');
    });
  });

  // 4. PaymentService End-to-End & Fulfillment Tests
  describe('PaymentService & Subscription Fulfillment', () => {
    it('should reject checkout when requested billing cycle is disabled', async () => {
      // Create a plan where 6m cycle is disabled
      const planPayload: CreatePlanPayload = {
        name: 'Strict 1M Plan',
        price1m: 499,
        cycle1mEnabled: true,
        cycle3mEnabled: false,
        cycle6mEnabled: false,
        cycle1yEnabled: false,
        maxBranches: 1,
        maxStylistsPerBranch: 2,
        features: ['loyalty_stamp_cards'],
      };
      const plan = await planRepo.createPlan(planPayload);

      // Attempt to checkout 6m cycle
      expect(
        paymentService.createPaymentOrder({
          targetType: 'SUBSCRIPTION',
          targetId: plan.id,
          amount: 2500,
          provider: 'UPI_QR',
          metadata: { cycle: '6m' },
        })
      ).rejects.toThrow('6-Month billing cycle is disabled');
    });

    it('should create order, verify UPI payment, activate subscription and update organization quotas', async () => {
      // 1. Create a test organization
      const testOrg = await organizationRepo.createOrganization({
        name: 'Glow Unisex Studio',
        tier: 'STARTER',
      });

      // 2. Create a 3-branch enterprise plan
      const plan = await planRepo.createPlan({
        name: 'Franchise Gold',
        price1m: 2999,
        maxBranches: 5,
        maxStylistsPerBranch: 8,
        features: ['staff_leave_management', 'whatsapp_ready'],
      });

      // 3. Create payment order for 3-month cycle
      const orderResult = await paymentService.createPaymentOrder({
        targetType: 'SUBSCRIPTION',
        targetId: plan.id,
        amount: 8000,
        provider: 'UPI_QR',
        organizationId: testOrg.id,
        metadata: { cycle: '3m' },
      });

      expect(orderResult.orderId).toBeDefined();
      expect(orderResult.provider).toBe('UPI_QR');
      expect(orderResult.paymentData.upiString).toBeDefined();

      // 4. Verify payment with UTR
      const verifyResult = await paymentService.verifyPayment({
        orderId: orderResult.orderId,
        provider: 'UPI_QR',
        transactionRef: 'UTR-TEST-11223344',
      });

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.status).toBe('COMPLETED');
      expect(verifyResult.subscription).toBeDefined();
      expect(verifyResult.subscription?.organizationId).toBe(testOrg.id);
      expect(verifyResult.subscription?.planId).toBe(plan.id);
      expect(verifyResult.subscription?.cycle).toBe('3m');

      // 5. Verify organization quotas were updated dynamically
      const updatedOrg = await organizationRepo.getOrganizationById(testOrg.id);
      expect(updatedOrg?.planId).toBe(plan.id);
      expect(updatedOrg?.maxBranches).toBe(5);
      expect(updatedOrg?.maxStylistsPerBranch).toBe(8);
    });

    it('should rollover expiration date if an active subscription already exists', async () => {
      const testOrg = await organizationRepo.createOrganization({
        name: 'Rollover Test Salon',
        tier: 'STARTER',
      });

      const plan = await planRepo.createPlan({
        name: 'Rollover Plan',
        price1m: 999,
        maxBranches: 2,
        maxStylistsPerBranch: 3,
        features: [],
      });

      // Purchase first 1-month subscription
      const order1 = await paymentService.createPaymentOrder({
        targetType: 'SUBSCRIPTION',
        targetId: plan.id,
        amount: 999,
        provider: 'CASH',
        organizationId: testOrg.id,
        metadata: { cycle: '1m' },
      });
      const verify1 = await paymentService.verifyPayment({
        orderId: order1.orderId,
        provider: 'CASH',
      });
      const sub1 = verify1.subscription!;
      const firstExpiresAt = new Date(sub1.expiresAt).getTime();

      // Purchase second 3-month subscription before first expires
      const order2 = await paymentService.createPaymentOrder({
        targetType: 'SUBSCRIPTION',
        targetId: plan.id,
        amount: 2700,
        provider: 'CASH',
        organizationId: testOrg.id,
        metadata: { cycle: '3m' },
      });
      const verify2 = await paymentService.verifyPayment({
        orderId: order2.orderId,
        provider: 'CASH',
      });
      const sub2 = verify2.subscription!;
      const secondExpiresAt = new Date(sub2.expiresAt).getTime();

      // The second expiration should extend 90 days from the FIRST expiration date
      const expectedExtensionMs = 90 * 24 * 60 * 60 * 1000;
      expect(secondExpiresAt).toBeGreaterThanOrEqual(firstExpiresAt + expectedExtensionMs - 2000);
    });
  });

  // 5. REST Endpoints Tests (/api/payments)
  describe('Elysia REST Endpoints (/api/payments)', () => {
    it('POST /api/payments/create-order should create order with TypeBox validation', async () => {
      const plan = await planRepo.createPlan({
        name: 'REST API Plan',
        price1m: 899,
        maxBranches: 1,
        maxStylistsPerBranch: 2,
        features: [],
      });

      const res = await app.handle(
        new Request('http://localhost/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetType: 'SUBSCRIPTION',
            targetId: plan.id,
            amount: 899,
            provider: 'UPI_QR',
            metadata: { cycle: '1m' },
          }),
        })
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.orderId).toBeDefined();
      expect(json.order.paymentData.upiString).toBeDefined();
    });

    it('POST /api/payments/verify should verify payment and update order status', async () => {
      // First create order
      const plan = await planRepo.createPlan({
        name: 'Verify REST Plan',
        price1m: 600,
        maxBranches: 1,
        maxStylistsPerBranch: 2,
        features: [],
      });

      const org = await organizationRepo.createOrganization({
        name: 'Verify Org REST',
      });

      const createRes = await app.handle(
        new Request('http://localhost/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetType: 'SUBSCRIPTION',
            targetId: plan.id,
            amount: 600,
            provider: 'CASH',
            organizationId: org.id,
            metadata: { cycle: '1m' },
          }),
        })
      );
      const createJson = await createRes.json();
      const orderId = createJson.order.orderId;

      // Now verify
      const verifyRes = await app.handle(
        new Request('http://localhost/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            provider: 'CASH',
            notes: 'Counter payment received by receptionist',
          }),
        })
      );

      expect(verifyRes.status).toBe(200);
      const verifyJson = await verifyRes.json();
      expect(verifyJson.success).toBe(true);
      expect(verifyJson.status).toBe('COMPLETED');
      expect(verifyJson.transactionRef).toContain('CASH-');

      // Check order via GET /api/payments/:id
      const getOrderRes = await app.handle(
        new Request(`http://localhost/api/payments/${orderId}`, {
          method: 'GET',
        })
      );
      expect(getOrderRes.status).toBe(200);
      const getOrderJson = await getOrderRes.json();
      expect(getOrderJson.order.status).toBe('COMPLETED');

      // Check active subscription via GET /api/payments/subscriptions/:orgId
      const getSubRes = await app.handle(
        new Request(`http://localhost/api/payments/subscriptions/${org.id}`, {
          method: 'GET',
        })
      );
      expect(getSubRes.status).toBe(200);
      const getSubJson = await getSubRes.json();
      expect(getSubJson.success).toBe(true);
      expect(getSubJson.subscription.planId).toBe(plan.id);
    });
  });
});
