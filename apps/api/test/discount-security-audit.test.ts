import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { couponRepo } from '../src/db/repositories/coupon.repo';
import { couponService } from '../src/coupon/coupon.service';
import { authService } from '../src/auth/auth-service';
import { repository } from '../src/db/repository';
import { queueEngine } from '../src/engine/queue-engine';
import { paymentService } from '../src/payment/payment.service';
import { planRepo } from '../src/db/repositories/plan.repo';

describe('Discount & Coupon Security Vulnerabilities Suite (DISC-01 to DISC-07)', () => {
  let adminToken: string;
  let ownerToken: string;
  let salon: any;

  beforeEach(async () => {
    await authService.seedDefaultUsers();

    const adminAuth = await authService.authenticateUser('admin', 'Admin@123');
    if (!adminAuth) throw new Error('Admin auth failed');
    adminToken = adminAuth.session.token;

    const ownerAuth = await authService.authenticateUser('owner', 'Owner@123');
    if (!ownerAuth) throw new Error('Owner auth failed');
    ownerToken = ownerAuth.session.token;

    const allSalons = await repository.getAllSalons();
    salon = (await repository.getSalonBySlug('getsalon')) || allSalons[0];
  });

  // DISC-01: Arbitrary Unvalidated Discount Injection during Queue Checkout
  it('DISC-01: should reject arbitrary discount injection and only honor valid validated coupons at checkout', async () => {
    const baseService = salon.services[0];
    const ticket = await queueEngine.checkIn({
      salonSlug: salon.slug,
      customerName: 'Test Inject Customer',
      customerPhone: '9888877771',
      serviceId: baseService.id,
    });

    await queueEngine.summonTicket(salon.id, ticket.id);
    await queueEngine.seatCustomer(ticket.id);

    // 1. Attempt to inject arbitrary appliedCouponDiscount without a valid coupon code
    expect(
      queueEngine.finishService(
        ticket.id,
        'CASH_PAID',
        ticket.totalPrice - 9999,
        undefined,
        9999 // Fraudulent discount
      )
    ).rejects.toThrow('Cannot apply arbitrary coupon discount without a valid verified coupon code.');

    // 2. Now create a valid coupon
    const validCode = `VALID_${Date.now()}`;
    await couponRepo.createCoupon({
      id: `c_valid_${Date.now()}`,
      code: validCode,
      targetType: 'SALON_SERVICE',
      discountType: 'FLAT',
      discountValue: 50,
      salonId: salon.id,
      minOrderAmount: 0,
      maxUsesPerUser: 5,
    } as any);

    // 3. Finish service with the valid coupon code
    const completed = await queueEngine.finishService(
      ticket.id,
      'CASH_PAID',
      ticket.totalPrice - 50,
      validCode
    );

    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.couponCode).toBe(validCode);
    expect(completed?.couponDiscount).toBe(50);
  });

  // DISC-02: Client-side Price Tampering on Subscription Order Creation
  it('DISC-02: should calculate subscription order amount authoritatively and ignore client-tampered prices', async () => {
    const plans = await planRepo.getAllPlans();
    const testPlan = plans.find((p) => (p.price1m && p.price1m > 100) || (p.price && p.price > 100)) || plans[0];
    const expectedPrice = testPlan.price1m ?? (testPlan as any).price;

    // Attacker sends amount: 1 for an expensive subscription plan
    const forgedOrder = await paymentService.createPaymentOrder({
      provider: 'CASH',
      targetType: 'SUBSCRIPTION',
      targetId: testPlan.id,
      amount: 1, // Tampered price
      currency: 'INR',
      organizationId: 'org_test_123',
      metadata: { cycle: '1m' },
    });

    // Authoritative amount must match plan.price1m, not the tampered 1
    expect(forgedOrder.amount).toBe(expectedPrice);
    expect(forgedOrder.amount).not.toBe(1);
  });

  // DISC-03: Scope Isolation on Coupon Creation & Modification
  it('DISC-03: should prevent salon owners from creating SUBSCRIPTION coupons or altering global coupons', async () => {
    // Salon owner attempts to create a SUBSCRIPTION coupon
    const subRes = await app.handle(
      new Request('http://localhost/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          code: `OWNER_SUB_${Date.now()}`,
          targetType: 'SUBSCRIPTION',
          discountType: 'PERCENT',
          discountValue: 50,
        }),
      })
    );
    expect(subRes.status).toBe(403);

    // Admin creates a global platform coupon
    const globalCode = `GLOBAL_${Date.now()}`;
    const globalCoupon = await couponRepo.createCoupon({
      id: `c_global_${Date.now()}`,
      code: globalCode,
      targetType: 'SUBSCRIPTION',
      discountType: 'PERCENT',
      discountValue: 20,
      salonId: null,
      organizationId: null,
    } as any);

    // Salon owner attempts to modify the global coupon
    const patchRes = await app.handle(
      new Request(`http://localhost/api/coupons/${globalCoupon.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          discountValue: 90,
        }),
      })
    );
    expect(patchRes.status).toBe(403);

    // Salon owner attempts to delete the global coupon
    const delRes = await app.handle(
      new Request(`http://localhost/api/coupons/${globalCoupon.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      })
    );
    expect(delRes.status).toBe(403);
  });

  // DISC-04: Appointment Booking Customer Tracking
  it('DISC-04: should enforce per-user usage limits and first-time only restrictions using customerPhone', async () => {
    const limitedCode = `FIRST_${Date.now()}`;
    await couponRepo.createCoupon({
      id: `c_first_${Date.now()}`,
      code: limitedCode,
      targetType: 'SALON_SERVICE',
      discountType: 'FLAT',
      discountValue: 30,
      salonId: salon.id,
      maxUsesPerUser: 1,
      minOrderAmount: 0,
    } as any);

    // First attempt with user phone succeeds
    const check1 = await couponService.validateAndApplyCoupon({
      code: limitedCode,
      targetType: 'SALON_SERVICE',
      orderAmount: 200,
      salonId: salon.id,
      userId: '9998887771',
    });
    expect(check1.valid).toBe(true);

    // Record redemption
    await couponRepo.recordRedemption({
      couponId: check1.coupon!.id,
      targetType: 'SALON_SERVICE',
      targetOrderId: 'appt_1',
      userId: '9998887771',
      discountApplied: 30,
    });

    // Second attempt with same user phone must be rejected (maxUsesPerUser: 1)
    const check2 = await couponService.validateAndApplyCoupon({
      code: limitedCode,
      targetType: 'SALON_SERVICE',
      orderAmount: 200,
      salonId: salon.id,
      userId: '9998887771',
    });
    expect(check2.valid).toBe(false);
    expect(check2.message).toContain('already redeemed');
  });

  // DISC-05 & DISC-06: Concurrency and Race Condition Safety
  it('DISC-05 & DISC-06: should atomically prevent over-redemption under concurrent requests', async () => {
    const raceCouponId = `c_race_${Date.now()}`;
    await couponRepo.createCoupon({
      id: raceCouponId,
      code: `RACE_${Date.now()}`,
      targetType: 'SALON_SERVICE',
      discountType: 'FLAT',
      discountValue: 20,
      maxUses: 3,
      salonId: salon.id,
      minOrderAmount: 0,
    } as any);

    const redemptions = Array.from({ length: 6 }).map((_, i) =>
      couponRepo.recordRedemption({
        couponId: raceCouponId,
        targetType: 'SALON_SERVICE',
        targetOrderId: `order_race_${i}`,
        userId: `user_race_${i}`,
        discountApplied: 20,
      })
    );

    const outcomes = await Promise.allSettled(redemptions);
    const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
    const rejected = outcomes.filter((o) => o.status === 'rejected');

    expect(fulfilled.length).toBe(3);
    expect(rejected.length).toBe(3);
  });

  // DISC-07: Bounds Clamping & Rounding Consistency
  it('DISC-07: should clamp percentage values to 100%, prevent negative discounts, and round to 2 decimals', async () => {
    const badMathCode = `MATH_${Date.now()}`;
    await couponRepo.createCoupon({
      id: `c_math_${Date.now()}`,
      code: badMathCode,
      targetType: 'SALON_SERVICE',
      discountType: 'PERCENT',
      discountValue: 150, // Erroneous 150%
      salonId: salon.id,
      minOrderAmount: 0,
      maxUsesPerUser: 5,
    } as any);

    const mathCheck = await couponService.validateAndApplyCoupon({
      code: badMathCode,
      targetType: 'SALON_SERVICE',
      orderAmount: 333.333,
      salonId: salon.id,
      userId: '9888877771',
    });

    expect(mathCheck.valid).toBe(true);
    // 100% of 333.333 capped at orderAmount and rounded to 333.33
    expect(mathCheck.discountAmount).toBe(333.33);
    expect(mathCheck.netPayable).toBe(0);
  });
});
