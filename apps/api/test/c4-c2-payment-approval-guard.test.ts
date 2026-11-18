import { describe, it, expect, beforeEach } from 'bun:test';
import { paymentService } from '../src/payment/payment.service';
import { paymentRepo } from '../src/db/repositories/payment.repo';
import { planRepo } from '../src/db/repositories/plan.repo';
import { organizationRepo } from '../src/db/repositories/organization.repo';
import { walletRepo } from '../src/db/repositories/wallet.repo';
import { memoryStore } from '../src/db/repositories/store';
import type { PaymentOrder, Organization, SubscriptionPlan } from '../src/engine/types';

describe('ADR 005 - C4 & C2: Atomic Payment Approval & Wallet Debit Integrity', () => {
  const orgId = 'org-test-c4';
  let planId: string;

  beforeEach(async () => {
    // Seed test plan
    const plan = await planRepo.createPlan({
      name: 'Pro Plan',
      description: 'Test Pro',
      tier: 'PRO',
      priceMonthly: 999,
      priceQuarterly: 2499,
      priceSemiAnnual: 4499,
      priceAnnual: 7999,
      isActive: true,
      maxStaff: 5,
      maxServices: 20,
      features: ['all'],
    });
    planId = plan.id;

    // Seed test organization
    const org: Organization = {
      id: orgId,
      name: 'C4 Test Salon Org',
      slug: 'c4-test-salon-org',
      tier: 'STARTER',
      ownerUserId: 'user-c4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await organizationRepo.createOrganization(org);
  });

  it('C4.1: should reject submitManualPayment when order is REJECTED or EXPIRED', async () => {
    const orderRejected: PaymentOrder = {
      id: 'order-c4-rejected',
      amount: 999,
      currency: 'INR',
      provider: 'UPI_QR',
      targetType: 'SUBSCRIPTION',
      targetId: planId,
      organizationId: orgId,
      status: 'REJECTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await paymentRepo.createOrder(orderRejected);

    expect(
      paymentService.submitManualPayment({
        orderId: orderRejected.id,
        utrNumber: '123456789012',
        provider: 'UPI_QR',
      })
    ).rejects.toThrow('Cannot submit payment for order in REJECTED state');
  });

  it('C4.2: should reject approvePaymentOrder when order is REJECTED or EXPIRED', async () => {
    const orderExpired: PaymentOrder = {
      id: 'order-c4-expired',
      amount: 999,
      currency: 'INR',
      provider: 'UPI_QR',
      targetType: 'SUBSCRIPTION',
      targetId: planId,
      organizationId: orgId,
      status: 'EXPIRED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await paymentRepo.createOrder(orderExpired);

    expect(
      paymentService.approvePaymentOrder({
        orderId: orderExpired.id,
      })
    ).rejects.toThrow('Cannot approve order in EXPIRED state');
  });

  it('C4.3: should handle concurrent approvePaymentOrder calls atomically without duplicate fulfillment', async () => {
    const order: PaymentOrder = {
      id: 'order-c4-concurrent',
      amount: 999,
      currency: 'INR',
      provider: 'UPI_QR',
      targetType: 'SUBSCRIPTION',
      targetId: planId,
      organizationId: orgId,
      status: 'PENDING_APPROVAL',
      utrNumber: '998877665544',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await paymentRepo.createOrder(order);

    // Call approvePaymentOrder concurrently
    const results = await Promise.allSettled([
      paymentService.approvePaymentOrder({ orderId: order.id }),
      paymentService.approvePaymentOrder({ orderId: order.id }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // Verify only ONE subscription exists for this order
    const allSubs = Array.from(memoryStore.organizationSubscriptions.values());
    const subsForOrder = allSubs.filter((s) => s.paymentOrderId === order.id);
    expect(subsForOrder.length).toBe(1);
  });

  it('C2.1: should abort fulfillment and create NO subscription when wallet debit fails', async () => {
    const order: PaymentOrder = {
      id: 'order-c2-wallet-fail',
      amount: 500,
      currency: 'INR',
      provider: 'WALLET',
      targetType: 'SUBSCRIPTION',
      targetId: planId,
      organizationId: orgId,
      status: 'PENDING_APPROVAL',
      metadata: {
        walletDeducted: 499, // User claims ₹499 wallet credit, but wallet has 0 balance!
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await paymentRepo.createOrder(order);

    // Approve should fail because wallet balance is 0
    await expect(
      paymentService.approvePaymentOrder({ orderId: order.id })
    ).rejects.toThrow('Insufficient wallet balance');

    // Verify order was not completed and NO subscription was created
    const storedOrder = await paymentRepo.getOrderById(order.id);
    expect(storedOrder?.status).not.toBe('COMPLETED');

    const allSubs = Array.from(memoryStore.organizationSubscriptions.values());
    const subsForOrder = allSubs.filter((s) => s.paymentOrderId === order.id);
    expect(subsForOrder.length).toBe(0);
  });
});
