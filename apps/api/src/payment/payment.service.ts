import type { PaymentGatewayAdapter } from './adapter';
import type {
  CreateOrderInput,
  PaymentOrderResult,
  PaymentVerificationInput,
  PaymentVerificationResult,
  PaymentOrder,
  PaymentProvider,
  OrganizationSubscription,
  BillingCycle,
} from './types';
import { upiQrAdapter } from './adapters/upi-qr.adapter';
import { cashAdapter } from './adapters/cash.adapter';
import { razorpayAdapter } from './adapters/razorpay.adapter';
import { paymentRepo } from '../db/repositories/payment.repo';
import { planRepo } from '../db/repositories/plan.repo';
import { organizationRepo } from '../db/repositories/organization.repo';

export class PaymentService {
  private adapters: Map<PaymentProvider, PaymentGatewayAdapter> = new Map();

  constructor() {
    this.registerAdapter(upiQrAdapter);
    this.registerAdapter(cashAdapter);
    this.registerAdapter(razorpayAdapter);
  }

  registerAdapter(adapter: PaymentGatewayAdapter): void {
    this.adapters.set(adapter.getProviderName(), adapter);
  }

  getAdapter(provider: PaymentProvider): PaymentGatewayAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Unsupported payment provider: ${provider}`);
    }
    return adapter;
  }

  async createPaymentOrder(input: CreateOrderInput): Promise<PaymentOrderResult> {
    if (!input.amount || input.amount <= 0) {
      throw new Error('Order amount must be greater than zero.');
    }

    const adapter = this.getAdapter(input.provider);

    // If target is SUBSCRIPTION, validate plan and cycle availability
    if (input.targetType === 'SUBSCRIPTION') {
      let plan = await planRepo.getPlanById(input.targetId);
      if (!plan) {
        plan = await planRepo.getPlanBySlug(input.targetId);
      }
      if (!plan) {
        throw new Error(`Subscription plan not found: ${input.targetId}`);
      }

      const cycle = (input.metadata?.cycle || '1m') as BillingCycle;
      const cycleKey = `cycle${cycle.toUpperCase()}Enabled` as keyof typeof plan;
      // Also check specific enabled flags
      if (cycle === '1m' && !plan.cycle1mEnabled) {
        throw new Error(`1-Month billing cycle is disabled for plan "${plan.name}".`);
      }
      if (cycle === '3m' && !plan.cycle3mEnabled) {
        throw new Error(`3-Month billing cycle is disabled for plan "${plan.name}".`);
      }
      if (cycle === '6m' && !plan.cycle6mEnabled) {
        throw new Error(`6-Month billing cycle is disabled for plan "${plan.name}".`);
      }
      if (cycle === '1y' && !plan.cycle1yEnabled) {
        throw new Error(`1-Year billing cycle is disabled for plan "${plan.name}".`);
      }

      // Add plan name to metadata if not present
      input.metadata = {
        ...input.metadata,
        planName: plan.name,
        planSlug: plan.slug,
        cycle,
      };
    }

    const internalOrderId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paymentData = await adapter.createOrder(input, internalOrderId);

    // Set expiration to 10 minutes from now (600 seconds)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const order: PaymentOrder = {
      id: internalOrderId,
      targetType: input.targetType,
      targetId: input.targetId,
      organizationId: input.organizationId || null,
      salonId: input.salonId || null,
      customerId: input.customerId || null,
      amount: input.amount,
      currency: input.currency || 'INR',
      provider: input.provider,
      providerOrderId: paymentData.razorpayOrderId || null,
      transactionRef: null,
      status: 'PENDING',
      paymentData,
      metadata: input.metadata || null,
      expiresAt,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await paymentRepo.createOrder(order);

    return {
      orderId: order.id,
      provider: order.provider,
      amount: order.amount,
      currency: order.currency,
      expiresAt: expiresAt.toISOString(),
      paymentData,
    };
  }

  async verifyPayment(input: PaymentVerificationInput): Promise<PaymentVerificationResult> {
    const order = await paymentRepo.getOrderById(input.orderId);
    if (!order) {
      throw new Error(`Payment order not found: ${input.orderId}`);
    }

    if (order.status === 'COMPLETED') {
      const activeSub = order.organizationId
        ? await paymentRepo.getActiveSubscriptionByOrgId(order.organizationId)
        : null;

      return {
        success: true,
        orderId: order.id,
        status: 'COMPLETED',
        transactionRef: order.transactionRef || '',
        message: 'Order already completed.',
        subscription: activeSub,
      };
    }

    // Check expiration
    if (new Date(order.expiresAt) < new Date()) {
      await paymentRepo.updateOrderStatus(order.id, 'EXPIRED');
      return {
        success: false,
        orderId: order.id,
        status: 'EXPIRED',
        transactionRef: '',
        message: 'Payment session has expired. Please create a new order.',
      };
    }

    const adapter = this.getAdapter(input.provider || order.provider);
    const verification = await adapter.verifyPayment(order, input);

    if (!verification.verified) {
      return {
        success: false,
        orderId: order.id,
        status: order.status,
        transactionRef: '',
        message: verification.message || 'Payment verification failed.',
      };
    }

    // Mark order as COMPLETED
    const completedOrder = await paymentRepo.updateOrderStatus(
      order.id,
      'COMPLETED',
      verification.transactionRef,
      new Date()
    );

    // Execute downstream fulfillment
    let subscription: OrganizationSubscription | null = null;
    if (completedOrder && completedOrder.targetType === 'SUBSCRIPTION') {
      subscription = await this.fulfillSubscription(completedOrder, verification.transactionRef);
    }

    return {
      success: true,
      orderId: order.id,
      status: 'COMPLETED',
      transactionRef: verification.transactionRef,
      message: verification.message || 'Payment successfully verified.',
      subscription,
    };
  }

  private async fulfillSubscription(
    order: PaymentOrder,
    transactionRef: string
  ): Promise<OrganizationSubscription> {
    const orgId = order.organizationId;
    if (!orgId) {
      throw new Error('Organization ID is missing for subscription order.');
    }

    let plan = await planRepo.getPlanById(order.targetId);
    if (!plan) {
      plan = await planRepo.getPlanBySlug(order.targetId);
    }
    if (!plan) {
      throw new Error(`Plan not found for fulfillment: ${order.targetId}`);
    }

    const cycle = (order.metadata?.cycle || '1m') as BillingCycle;
    const durationDaysMap: Record<BillingCycle, number> = {
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
    };
    const daysToAdd = durationDaysMap[cycle] || 30;

    // Check existing active subscription to handle rollover (Review Focus #2)
    const existingSub = await paymentRepo.getActiveSubscriptionByOrgId(orgId);
    const now = new Date();
    let startsAt = now;
    let expiresAt: Date;

    if (existingSub && new Date(existingSub.expiresAt) > now) {
      // Extend from existing expiration date
      startsAt = new Date(existingSub.startsAt);
      const existingExpires = new Date(existingSub.expiresAt);
      expiresAt = new Date(existingExpires.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    } else {
      // Fresh subscription starts now
      expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    }

    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const subscription: OrganizationSubscription = {
      id: subId,
      organizationId: orgId,
      planId: plan.id,
      cycle,
      startsAt,
      expiresAt,
      basePrice: order.amount,
      couponId: order.metadata?.couponId || null,
      couponDiscount: Number(order.metadata?.couponDiscount || 0),
      walletDeducted: Number(order.metadata?.walletDeducted || 0),
      netAmountPaid: order.amount,
      paymentMethod: order.provider,
      paymentOrderId: order.id,
      transactionRef,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    await paymentRepo.createSubscription(subscription);

    // Update organization's active plan and quotas
    await organizationRepo.updateOrganizationPlan(orgId, plan.id);

    return subscription;
  }
}

export const paymentService = new PaymentService();
