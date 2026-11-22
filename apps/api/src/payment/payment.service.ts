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
  SubmitManualPaymentInput,
  ApprovePaymentInput,
  RejectPaymentInput,
} from './types';
import { upiQrAdapter } from './adapters/upi-qr.adapter';
import { cashAdapter } from './adapters/cash.adapter';
import { razorpayAdapter } from './adapters/razorpay.adapter';
import { walletPaymentAdapter } from './adapters/wallet.adapter';
import { paymentRepo } from '../db/repositories/payment.repo';
import { planRepo } from '../db/repositories/plan.repo';
import { organizationRepo } from '../db/repositories/organization.repo';
import { couponRepo } from '../db/repositories/coupon.repo';
import { walletService } from '../wallet/wallet.service';
import { referralService } from '../wallet/referral.service';

export class PaymentService {
  private adapters: Map<PaymentProvider, PaymentGatewayAdapter> = new Map();

  constructor() {
    this.registerAdapter(upiQrAdapter);
    this.registerAdapter(cashAdapter);
    this.registerAdapter(razorpayAdapter);
    this.registerAdapter(walletPaymentAdapter);
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
    if (input.amount < 0 || (input.amount === 0 && input.provider !== 'WALLET' && input.provider !== 'CASH')) {
      throw new Error('Order amount must be greater than zero for external payment gateways.');
    }

    const settings = await paymentRepo.getGatewaySettings();
    if (input.provider === 'UPI_QR' && !settings.upiManualEnabled) {
      throw new Error('UPI QR manual payments are currently disabled by administrator.');
    }
    if (input.provider === 'CASH' && !settings.cashEnabled) {
      throw new Error('Cash counter payments are currently disabled by administrator.');
    }
    if (input.provider === 'RAZORPAY' && !settings.razorpayEnabled) {
      throw new Error('Razorpay gateway is currently disabled by administrator.');
    }

    input.metadata = {
      ...input.metadata,
      vpa: settings.upiVpa,
      payeeName: settings.upiMerchantName,
      cashInstructions: settings.cashInstructions,
    };

    const adapter = this.getAdapter(input.provider);

    // If target is SUBSCRIPTION, validate plan and cycle availability
    if (input.targetType === 'SUBSCRIPTION') {
      let plan = await planRepo.getPlanById(input.targetId);
      if (!plan) {
        plan = await planRepo.getPlanBySlug(input.targetId);
      }
      if (!plan) {
        const allPlans = await planRepo.getAllPlans({ status: 'ACTIVE' });
        const targetLower = (input.targetId || '').toLowerCase();
        plan = allPlans.find(
          (p) =>
            p.id.toLowerCase() === targetLower ||
            p.slug.toLowerCase() === targetLower ||
            (p.badge && p.badge.toLowerCase().includes(targetLower)) ||
            p.name.toLowerCase().includes(targetLower)
        ) || null;
      }
      if (!plan) {
        throw new Error(`Subscription plan not found: ${input.targetId}`);
      }

      input.targetId = plan.id;

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

      // Calculate authoritative plan base price (prevent client price tampering DISC-02)
      let basePrice = Number(plan.price1m ?? (plan as any).price ?? 0);
      if (cycle === '1m') basePrice = Number(plan.price1m ?? (plan as any).cycle1mPrice ?? (plan as any).price ?? 0);
      else if (cycle === '3m') basePrice = Number(plan.price3m ?? (plan as any).cycle3mPrice ?? (basePrice * 3));
      else if (cycle === '6m') basePrice = Number(plan.price6m ?? (plan as any).cycle6mPrice ?? (basePrice * 6));
      else if (cycle === '1y') basePrice = Number(plan.price1y ?? (plan as any).cycle1yPrice ?? (basePrice * 12));

      let authoritativeAmount = basePrice;

      // Validate coupon if supplied in metadata
      if (input.metadata?.couponCode && String(input.metadata.couponCode).trim()) {
        const { couponService } = await import('../coupon/coupon.service');
        const couponRes = await couponService.validateAndApplyCoupon({
          code: String(input.metadata.couponCode).trim(),
          targetType: 'SUBSCRIPTION',
          orderAmount: basePrice,
          organizationId: input.organizationId || undefined,
        });

        if (!couponRes.valid) {
          throw new Error(couponRes.message || 'Invalid coupon code for subscription plan');
        }

        authoritativeAmount = couponRes.netPayable;
        input.metadata.couponId = couponRes.coupon?.id;
        input.metadata.couponDiscount = couponRes.discountAmount;
      }

      // Enforce authoritative server amount
      input.amount = authoritativeAmount;
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

  async submitManualPayment(input: SubmitManualPaymentInput): Promise<{
    success: boolean;
    orderId: string;
    status: string;
    utrNumber?: string | null;
    message: string;
  }> {
    const order = await paymentRepo.getOrderById(input.orderId);
    if (!order) {
      throw new Error(`Payment order not found: ${input.orderId}`);
    }

    if (order.status !== 'PENDING') {
      if (order.status === 'COMPLETED') {
        return {
          success: true,
          orderId: order.id,
          status: 'COMPLETED',
          utrNumber: order.utrNumber,
          message: 'Order already completed and active.',
        };
      }
      throw new Error(`Cannot submit payment for order in ${order.status} state. Only PENDING orders can be submitted.`);
    }

    if (input.provider === 'UPI_QR') {
      const utr = (input.utrNumber || '').trim();
      if (!utr || utr.length < 6) {
        throw new Error('Valid 12-digit UPI Reference / UTR Number is required.');
      }
    }

    const updated = await paymentRepo.submitManualPayment(
      input.orderId,
      input.utrNumber?.trim(),
      input.notes?.trim()
    );

    return {
      success: true,
      orderId: updated?.id || input.orderId,
      status: 'PENDING_APPROVAL',
      utrNumber: updated?.utrNumber || input.utrNumber || null,
      message:
        input.provider === 'UPI_QR'
          ? 'UTR submitted successfully! Your plan will activate once Admin verifies the payment.'
          : 'Cash payment request submitted! Admin will activate your plan upon cash receipt.',
    };
  }

  async approvePaymentOrder(input: ApprovePaymentInput): Promise<{
    success: boolean;
    orderId: string;
    status: string;
    subscription: OrganizationSubscription | null;
    message: string;
  }> {
    const order = await paymentRepo.getOrderById(input.orderId);
    if (!order) {
      throw new Error(`Payment order not found: ${input.orderId}`);
    }

    if (order.status !== 'PENDING_APPROVAL') {
      if (order.status === 'COMPLETED') {
        const activeSub = order.organizationId
          ? await paymentRepo.getActiveSubscriptionByOrgId(order.organizationId)
          : null;
        return {
          success: true,
          orderId: order.id,
          status: 'COMPLETED',
          subscription: activeSub,
          message: 'Order already approved and completed.',
        };
      }
      throw new Error(`Cannot approve order in ${order.status} state. Only PENDING_APPROVAL orders can be approved.`);
    }

    // Atomic Concurrency Claim: Claim order from PENDING_APPROVAL to PROCESSING
    const claimed = await paymentRepo.claimOrderForProcessing(order.id, 'PENDING_APPROVAL');
    if (!claimed) {
      // Recheck if another concurrent worker completed it
      const current = await paymentRepo.getOrderById(order.id);
      if (current?.status === 'COMPLETED') {
        const activeSub = order.organizationId
          ? await paymentRepo.getActiveSubscriptionByOrgId(order.organizationId)
          : null;
        return {
          success: true,
          orderId: order.id,
          status: 'COMPLETED',
          subscription: activeSub,
          message: 'Order already approved and completed.',
        };
      }
      throw new Error('Order is currently being processed by another administrator.');
    }

    const transactionRef =
      order.utrNumber || order.transactionRef || `APPROVE_${Date.now()}`;

    // Fulfill subscription downstream
    let subscription: OrganizationSubscription | null = null;
    try {
      if (order.targetType === 'SUBSCRIPTION') {
        subscription = await this.fulfillSubscription(order, transactionRef);
      }

      // Update order status to COMPLETED
      await paymentRepo.approvePaymentOrder(order.id, input.adminId || 'admin', transactionRef);
    } catch (fulfillErr: any) {
      // Roll back claim to PENDING_APPROVAL on failure so admin can inspect and retry
      await paymentRepo.updateOrderStatus(order.id, 'PENDING_APPROVAL');
      throw fulfillErr;
    }

    return {
      success: true,
      orderId: order.id,
      status: 'COMPLETED',
      subscription,
      message: 'Payment order approved and subscription activated successfully.',
    };
  }

  async rejectPaymentOrder(input: RejectPaymentInput): Promise<{
    success: boolean;
    orderId: string;
    status: string;
    message: string;
  }> {
    const order = await paymentRepo.getOrderById(input.orderId);
    if (!order) {
      throw new Error(`Payment order not found: ${input.orderId}`);
    }

    if (order.status === 'COMPLETED') {
      throw new Error('Cannot reject an order that has already been completed.');
    }

    const reason = (input.reason || '').trim() || 'Payment verification rejected by admin';
    await paymentRepo.rejectPaymentOrder(order.id, reason, input.adminId || 'admin');

    return {
      success: true,
      orderId: order.id,
      status: 'REJECTED',
      message: `Payment order rejected: ${reason}`,
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
      const allPlans = await planRepo.getAllPlans({ status: 'ACTIVE' });
      const targetLower = order.targetId.toLowerCase();
      plan = allPlans.find(
        (p) =>
          p.id.toLowerCase() === targetLower ||
          p.slug.toLowerCase() === targetLower ||
          (p.badge && p.badge.toLowerCase().includes(targetLower)) ||
          p.name.toLowerCase().includes(targetLower)
      ) || null;
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
    const basePrice = Number(order.metadata?.basePrice ?? order.amount);
    const couponDiscount = Number(order.metadata?.couponDiscount || 0);
    const couponId = order.metadata?.couponId || null;

    // ADR 005 C2: Debit wallet FIRST if credits were applied. Must not swallow errors!
    const walletDeducted = Number(order.metadata?.walletDeducted || 0);
    if (walletDeducted > 0) {
      await walletService.deductForCheckout({
        walletType: 'OWNER',
        identifier: orgId,
        amount: walletDeducted,
        reason: `Applied wallet credits to subscription order ${order.id}`,
        referenceId: order.id,
      });
    }

    const subscription: OrganizationSubscription = {
      id: subId,
      organizationId: orgId,
      planId: plan.id,
      cycle,
      startsAt,
      expiresAt,
      basePrice,
      couponId,
      couponDiscount,
      walletDeducted,
      netAmountPaid: order.amount,
      paymentMethod: order.provider,
      paymentOrderId: order.id,
      transactionRef,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    await paymentRepo.createSubscription(subscription);

    // Record coupon redemption if a coupon was used
    if (couponId) {
      await couponRepo.recordRedemption({
        couponId,
        targetType: 'SUBSCRIPTION',
        targetOrderId: order.id,
        userId: orgId,
        discountApplied: couponDiscount,
      });
    }

    // Process B2B referral conversion if this org was referred
    try {
      const isReferralCoupon = couponId?.startsWith('b2b_') || couponId?.startsWith('partner_') || !!order.metadata?.partnerCode;
      const originalAmount = Number(order.metadata?.originalAmount || basePrice || order.amount);
      const subscriptionDiscount = Number(
        order.metadata?.subscriptionDiscount ?? (isReferralCoupon ? 0 : (couponDiscount || 0))
      );
      const friendDiscount = Number(
        order.metadata?.friendDiscount ?? (isReferralCoupon ? (order.metadata?.couponDiscount ?? order.metadata?.discountApplied ?? couponDiscount ?? 0) : 0)
      );

      await referralService.processConversion(
        'B2B_OWNER',
        orgId,
        order.id,
        null,
        order.amount,
        {
          originalAmount,
          subscriptionDiscount,
          friendDiscount,
        }
      );
    } catch (err: any) {
      console.warn(`[paymentService] Referral conversion error: ${err.message}`);
    }

    // Process Partner Network Commission & Qualification Unlock
    try {
      const { partnerRepo } = await import('../db/repositories/partner.repo');
      const { salonRepo } = await import('../db/repositories/salon.repo');
      let targetSalonId = order.salonId;
      if (!targetSalonId && orgId) {
        const salons = await salonRepo.getAllSalons();
        const match = salons.find((s) => s.organizationId === orgId);
        if (match) targetSalonId = match.id;
      }
      if (targetSalonId) {
        await partnerRepo.processSubscriptionPayment({
          salonId: targetSalonId,
          grossAmount: basePrice,
          discountAmount: couponDiscount,
          paymentReference: order.id,
        });
      }
    } catch (err: any) {
      console.warn(`[paymentService] Partner subscription commission warning: ${err.message}`);
    }

    // Update organization's active plan and quotas
    await organizationRepo.updateOrganizationPlan(orgId, plan.id);

    return subscription;
  }
}

export const paymentService = new PaymentService();
