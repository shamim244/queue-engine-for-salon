import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { app } from '../index';
import { couponRepo } from '../src/db/repositories/coupon.repo';
import { couponService } from '../src/coupon/coupon.service';
import { authService } from '../src/auth/auth-service';
import { isMySqlConnected, getDb } from '../src/db/mysql';
import type { CreateCouponPayload } from '../src/engine/types';

describe('Omni-Channel Coupon Code System - Unit & Integration Tests', () => {
  let adminToken: string;

  beforeEach(async () => {
    await authService.seedDefaultUsers();
    const adminAuth = await authService.authenticateUser('admin', 'Admin@123');
    if (adminAuth) {
      adminToken = adminAuth.session.token;
    }

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('DELETE FROM coupon_redemptions WHERE coupon_id LIKE "cp_test_%"');
        await db.query('DELETE FROM coupons WHERE id LIKE "cp_test_%" OR code LIKE "TEST%" OR code LIKE "REST%"');
      } catch {}
    }
  });

  afterAll(async () => {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('DELETE FROM coupon_redemptions WHERE coupon_id LIKE "cp_test_%"');
        await db.query('DELETE FROM coupons WHERE id LIKE "cp_test_%" OR code LIKE "TEST%" OR code LIKE "REST%"');
      } catch {}
    }
  });

  describe('Coupon Validation & Discount Math', () => {
    it('should calculate correct Flat ₹ discount and net payable', async () => {
      const coupon = await couponRepo.createCoupon({
        code: 'TESTFLAT100',
        targetType: 'SUBSCRIPTION',
        discountType: 'FLAT',
        discountValue: 100,
        minOrderAmount: 200,
      });

      const res = await couponService.validateAndApplyCoupon({
        code: 'testflat100', // Test case-insensitive
        targetType: 'SUBSCRIPTION',
        orderAmount: 500,
      });

      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(100);
      expect(res.netPayable).toBe(400);
      expect(res.coupon?.code).toBe('TESTFLAT100');
    });

    it('should calculate Percentage % discount with max discount cap', async () => {
      // 50% discount up to max ₹200
      const coupon = await couponRepo.createCoupon({
        code: 'TESTHALF200',
        targetType: 'SUBSCRIPTION',
        discountType: 'PERCENT',
        discountValue: 50,
        maxDiscountAmount: 200,
        minOrderAmount: 300,
      });

      // On order of ₹1000, 50% is ₹500, but cap is ₹200
      const res = await couponService.validateAndApplyCoupon({
        code: 'TESTHALF200',
        targetType: 'SUBSCRIPTION',
        orderAmount: 1000,
      });

      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(200);
      expect(res.netPayable).toBe(800);
    });

    it('should reject application if order amount is below minimum bill threshold', async () => {
      await couponRepo.createCoupon({
        code: 'TESTMIN500',
        targetType: 'SUBSCRIPTION',
        discountType: 'FLAT',
        discountValue: 150,
        minOrderAmount: 500,
      });

      const res = await couponService.validateAndApplyCoupon({
        code: 'TESTMIN500',
        targetType: 'SUBSCRIPTION',
        orderAmount: 499,
      });

      expect(res.valid).toBe(false);
      expect(res.message).toContain('Minimum order amount of ₹500 required');
      expect(res.discountAmount).toBe(0);
      expect(res.netPayable).toBe(499);
    });

    it('should cap discount to order amount so net payable never goes negative', async () => {
      // ₹1,000 flat discount on a ₹400 bill
      await couponRepo.createCoupon({
        code: 'TESTMEGA1000',
        targetType: 'SALON_SERVICE',
        discountType: 'FLAT',
        discountValue: 1000,
        minOrderAmount: 100,
      });

      const res = await couponService.validateAndApplyCoupon({
        code: 'TESTMEGA1000',
        targetType: 'SALON_SERVICE',
        orderAmount: 400,
      });

      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(400); // capped at bill amount
      expect(res.netPayable).toBe(0); // never negative
    });

    it('should prevent target scoping leaks (reject SUBSCRIPTION coupon on SALON_SERVICE)', async () => {
      await couponRepo.createCoupon({
        code: 'TESTSAASONLY',
        targetType: 'SUBSCRIPTION',
        discountType: 'PERCENT',
        discountValue: 20,
      });

      const res = await couponService.validateAndApplyCoupon({
        code: 'TESTSAASONLY',
        targetType: 'SALON_SERVICE',
        orderAmount: 300,
      });

      expect(res.valid).toBe(false);
      expect(res.message).toContain('valid only for subscription plans');
    });

    it('should reject expired or inactive coupons', async () => {
      // Inactive coupon
      await couponRepo.createCoupon({
        code: 'TESTINACTIVE',
        targetType: 'SUBSCRIPTION',
        discountType: 'FLAT',
        discountValue: 50,
        status: 'INACTIVE',
      });

      const inactiveRes = await couponService.validateAndApplyCoupon({
        code: 'TESTINACTIVE',
        targetType: 'SUBSCRIPTION',
        orderAmount: 300,
      });
      expect(inactiveRes.valid).toBe(false);
      expect(inactiveRes.message).toContain('inactive');

      // Expired coupon
      await couponRepo.createCoupon({
        code: 'TESTEXPIRED',
        targetType: 'SUBSCRIPTION',
        discountType: 'FLAT',
        discountValue: 50,
        validUntil: new Date(Date.now() - 3600000), // 1 hour ago
      });

      const expiredRes = await couponService.validateAndApplyCoupon({
        code: 'TESTEXPIRED',
        targetType: 'SUBSCRIPTION',
        orderAmount: 300,
      });
      expect(expiredRes.valid).toBe(false);
      expect(expiredRes.message).toContain('expired');
    });

    it('should strictly isolate coupons by salon (reject cross-salon coupon usage)', async () => {
      await couponRepo.createCoupon({
        code: 'TESTSALONONLY',
        targetType: 'SALON_SERVICE',
        salonId: 'salon-rural-01',
        discountType: 'FLAT',
        discountValue: 40,
        minOrderAmount: 100,
      });

      // 1. Rejected if no salonId provided
      const noSalonRes = await couponService.validateAndApplyCoupon({
        code: 'TESTSALONONLY',
        targetType: 'SALON_SERVICE',
        orderAmount: 150,
      });
      expect(noSalonRes.valid).toBe(false);
      expect(noSalonRes.message).toContain('valid only at its issuing salon location');

      // 2. Rejected if different salonId provided
      const wrongSalonRes = await couponService.validateAndApplyCoupon({
        code: 'TESTSALONONLY',
        targetType: 'SALON_SERVICE',
        orderAmount: 150,
        salonId: 'other-salon-999',
      });
      expect(wrongSalonRes.valid).toBe(false);
      expect(wrongSalonRes.message).toContain('another salon');

      // 3. Approved if correct salonId provided
      const correctSalonRes = await couponService.validateAndApplyCoupon({
        code: 'TESTSALONONLY',
        targetType: 'SALON_SERVICE',
        orderAmount: 150,
        salonId: 'salon-rural-01',
        userId: '9876543210',
      });
      expect(correctSalonRes.valid).toBe(true);
      expect(correctSalonRes.discountAmount).toBe(40);
      expect(correctSalonRes.netPayable).toBe(110);
    });

    it('should enforce per-user usage limit and overall usage cap', async () => {
      const coupon = await couponRepo.createCoupon({
        code: 'TESTONEPERUSER',
        targetType: 'SUBSCRIPTION',
        discountType: 'FLAT',
        discountValue: 50,
        maxUses: 2,
        maxUsesPerUser: 1,
      });

      const userId = 'org_user_abc123';

      // First check passes
      const firstCheck = await couponService.validateAndApplyCoupon({
        code: 'TESTONEPERUSER',
        targetType: 'SUBSCRIPTION',
        orderAmount: 500,
        userId,
      });
      expect(firstCheck.valid).toBe(true);

      // Record first redemption
      await couponRepo.recordRedemption({
        couponId: coupon.id,
        targetType: 'SUBSCRIPTION',
        targetOrderId: 'po_test_01',
        userId,
        discountApplied: 50,
      });

      // Second check for SAME user must be blocked
      const secondCheck = await couponService.validateAndApplyCoupon({
        code: 'TESTONEPERUSER',
        targetType: 'SUBSCRIPTION',
        orderAmount: 500,
        userId,
      });
      expect(secondCheck.valid).toBe(false);
      expect(secondCheck.message).toContain('already redeemed this coupon');

      // But a DIFFERENT user can redeem until maxUses is reached
      const otherUserCheck = await couponService.validateAndApplyCoupon({
        code: 'TESTONEPERUSER',
        targetType: 'SUBSCRIPTION',
        orderAmount: 500,
        userId: 'org_user_other456',
      });
      expect(otherUserCheck.valid).toBe(true);

      // Record second redemption
      await couponRepo.recordRedemption({
        couponId: coupon.id,
        targetType: 'SUBSCRIPTION',
        targetOrderId: 'po_test_02',
        userId: 'org_user_other456',
        discountApplied: 50,
      });

      // Third user should be blocked by overall maxUses
      const thirdUserCheck = await couponService.validateAndApplyCoupon({
        code: 'TESTONEPERUSER',
        targetType: 'SUBSCRIPTION',
        orderAmount: 500,
        userId: 'org_user_third789',
      });
      expect(thirdUserCheck.valid).toBe(false);
      expect(thirdUserCheck.message).toContain('maximum usage limit');
    });
  });

  describe('Elysia REST Endpoints (/api/coupons)', () => {
    it('POST /api/coupons should create new coupon with status 201', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/coupons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            code: 'RESTPROMO25',
            targetType: 'SUBSCRIPTION',
            discountType: 'PERCENT',
            discountValue: 25,
            minOrderAmount: 1000,
            maxDiscountAmount: 300,
          }),
        })
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.coupon.code).toBe('RESTPROMO25');
      expect(json.coupon.discountValue).toBe(25);
    });

    it('POST /api/coupons/apply should calculate discount via REST', async () => {
      // First create
      await app.handle(
        new Request('http://localhost/api/coupons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            code: 'RESTAPPLY50',
            targetType: 'SUBSCRIPTION',
            discountType: 'FLAT',
            discountValue: 50,
            minOrderAmount: 200,
          }),
        })
      );

      // Now apply
      const res = await app.handle(
        new Request('http://localhost/api/coupons/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: 'RESTAPPLY50',
            targetType: 'SUBSCRIPTION',
            orderAmount: 400,
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.discountAmount).toBe(50);
      expect(json.netPayable).toBe(350);
    });

    it('GET /api/coupons should return filtered list of coupons', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/coupons?targetType=SUBSCRIPTION', {
          method: 'GET',
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.coupons)).toBe(true);
    });

    it('PATCH /api/coupons/:id should update coupon status', async () => {
      const coupon = await couponRepo.createCoupon({
        code: 'TESTPATCHME',
        targetType: 'SUBSCRIPTION',
        discountType: 'FLAT',
        discountValue: 20,
      });

      const res = await app.handle(
        new Request(`http://localhost/api/coupons/${coupon.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            status: 'INACTIVE',
            discountValue: 30,
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.coupon.status).toBe('INACTIVE');
      expect(json.coupon.discountValue).toBe(30);
    });
  });

  describe('Consumer Queue Check-In & Staff Checkout with Coupons', () => {
    it('should allow customer to check into live queue with coupon, save it on ticket, and preserve for staff checkout', async () => {
      const { repository } = await import('../src/db/repository');
      const { queueEngine } = await import('../src/engine/queue-engine');

      const allSalons = await repository.getAllSalons();
      const salon = (await repository.getSalonBySlug('getsalon')) || allSalons[0];
      expect(salon).toBeDefined();

      const coupon = await couponRepo.createCoupon({
        code: 'TESTQUEUE50',
        targetType: 'SALON_SERVICE',
        discountType: 'FLAT',
        discountValue: 50,
        minOrderAmount: 50,
        salonId: salon.id,
      });

      // 1. Check in with coupon code
      const ticket = await queueEngine.checkIn({
        salonSlug: salon.slug,
        customerName: 'Test Customer With Coupon',
        customerPhone: '9876543210',
        serviceId: salon.services[0].id,
        couponCode: 'TESTQUEUE50',
      });

      expect(ticket.couponCode).toBe('TESTQUEUE50');
      expect(ticket.couponDiscount).toBe(50);
      expect(ticket.couponId).toBe(coupon.id);

      // Verify fetched from repo
      const fetched = await repository.getTicketById(ticket.id);
      expect(fetched?.couponCode).toBe('TESTQUEUE50');
      expect(fetched?.couponDiscount).toBe(50);

      // 2. Staff finishes service and payment - coupon redemption is recorded
      await queueEngine.summonTicket(salon.id, ticket.id);
      await queueEngine.seatCustomer(ticket.id);
      const completed = await queueEngine.finishService(ticket.id, 'CASH_PAID', ticket.totalPrice - 50);

      expect(completed?.status).toBe('COMPLETED');
      expect(completed?.couponCode).toBe('TESTQUEUE50');

      // Verify coupon used_count incremented
      const updatedCoupon = await couponRepo.getCouponById(coupon.id);
      expect(updatedCoupon?.usedCount).toBe(1);
    });

    it('should reject queue check-in if coupon belongs to a different salon', async () => {
      const { repository } = await import('../src/db/repository');
      const { queueEngine } = await import('../src/engine/queue-engine');

      const allSalons = await repository.getAllSalons();
      const salon = (await repository.getSalonBySlug('getsalon')) || allSalons[0];

      // Create coupon for a fake/other salon
      await couponRepo.createCoupon({
        code: 'TESTOTHERSALON',
        targetType: 'SALON_SERVICE',
        discountType: 'FLAT',
        discountValue: 40,
        salonId: 'other-salon-id-999',
      });

      expect(
        queueEngine.checkIn({
          salonSlug: salon.slug,
          customerName: 'Cross Salon Attempter',
          customerPhone: '9876543210',
          serviceId: salon.services[0].id,
          couponCode: 'TESTOTHERSALON',
        })
      ).rejects.toThrow('This coupon belongs to another salon');
    });

    it('should dynamically recalculate coupon discount when services are added or removed mid-queue', async () => {
      const { repository } = await import('../src/db/repository');
      const { queueEngine } = await import('../src/engine/queue-engine');

      const allSalons = await repository.getAllSalons();
      const salon = (await repository.getSalonBySlug('getsalon')) || allSalons[0];

      // Create a 20% coupon
      await couponRepo.createCoupon({
        code: 'TESTDYNAMIC20',
        targetType: 'SALON_SERVICE',
        discountType: 'PERCENT',
        discountValue: 20,
        minOrderAmount: 50,
        salonId: salon.id,
      });

      // 1. Initial check-in with base service
      const baseService = salon.services[0];
      const initialTicket = await queueEngine.checkIn({
        salonSlug: salon.slug,
        customerName: 'Dynamic Service Consumer',
        customerPhone: '9876543210',
        serviceId: baseService.id,
        couponCode: 'TESTDYNAMIC20',
      });

      const initialExpectedDiscount = Math.round((initialTicket.totalPrice * 20) / 100);
      expect(initialTicket.couponDiscount).toBe(initialExpectedDiscount);

      // 2. Consumer or barber adds an add-on service mid-queue
      const addOn = salon.services.length > 1 ? salon.services[1] : salon.services[0];
      const updatedTicket = await queueEngine.updateTicketServices(initialTicket.id, {
        serviceId: baseService.id,
        addOnIds: [addOn.id],
      });

      // Verify that coupon discount was recalculated dynamically!
      const newExpectedDiscount = Math.round((updatedTicket.totalPrice * 20) / 100);
      expect(updatedTicket.totalPrice).toBe(baseService.basePrice + (salon.services.length > 1 ? addOn.basePrice : baseService.basePrice));
      expect(updatedTicket.couponDiscount).toBe(newExpectedDiscount);
      expect(updatedTicket.couponDiscount).toBeGreaterThanOrEqual(initialExpectedDiscount);

      // 3. Remove add-on service back to base service
      const revertedTicket = await queueEngine.updateTicketServices(initialTicket.id, {
        serviceId: baseService.id,
        addOnIds: [],
      });

      expect(revertedTicket.totalPrice).toBe(baseService.basePrice);
      expect(revertedTicket.couponDiscount).toBe(initialExpectedDiscount);
    });
  });

  describe('First-Time Customer Verification & Multi-Use Frequency Limits', () => {
    it('requires customer mobile phone number to apply first-time or limited-use coupons', async () => {
      const code = ('FST_' + Math.random().toString(36).substring(2, 8)).toUpperCase();
      await couponRepo.createCoupon({
        code,
        targetType: 'SALON_SERVICE',
        salonId: 'salon-rural-01',
        discountType: 'FLAT',
        discountValue: 50,
        isFirstTimeOnly: true,
        maxUsesPerUser: 1,
      });

      // Attempt to apply without userId / phone
      const resWithoutPhone = await couponService.validateAndApplyCoupon({
        code,
        targetType: 'SALON_SERVICE',
        orderAmount: 200,
        salonId: 'salon-rural-01',
      });

      expect(resWithoutPhone.valid).toBe(false);
      expect(resWithoutPhone.message).toContain('mobile number is required');
    });

    it('allows a genuine first-time customer (0 prior visits) to redeem first-visit coupon', async () => {
      const code = ('WEL_' + Math.random().toString(36).substring(2, 8)).toUpperCase();
      await couponRepo.createCoupon({
        code,
        targetType: 'SALON_SERVICE',
        salonId: 'salon-rural-01',
        discountType: 'FLAT',
        discountValue: 60,
        isFirstTimeOnly: true,
        maxUsesPerUser: 1,
      });

      const freshPhone = `9199977${Date.now().toString().slice(-5)}`;

      const res = await couponService.validateAndApplyCoupon({
        code,
        targetType: 'SALON_SERVICE',
        orderAmount: 250,
        salonId: 'salon-rural-01',
        userId: freshPhone,
      });

      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(60);
      expect(res.netPayable).toBe(190);
    });

    it('rejects first-visit coupon if customer has prior completed visits at this salon', async () => {
      const code = ('NEW_' + Math.random().toString(36).substring(2, 8)).toUpperCase();
      await couponRepo.createCoupon({
        code,
        targetType: 'SALON_SERVICE',
        salonId: 'salon-rural-01',
        discountType: 'PERCENT',
        discountValue: 30,
        isFirstTimeOnly: true,
        maxUsesPerUser: 1,
      });

      const returningPhone = `9199966${Date.now().toString().slice(-5)}`;

      // Simulate a prior completed visit in queue_tickets
      const { repository } = await import('../src/db/repository');
      const salon = await repository.getSalonBySlug('ramesh-barber');
      const service = salon?.services?.[0];

      const { queueEngine } = await import('../src/engine/queue-engine');
      const ticket = await queueEngine.checkIn({
        salonSlug: 'ramesh-barber',
        customerName: 'Returning Regular',
        customerPhone: returningPhone,
        serviceId: service!.id,
      });
      await queueEngine.seatCustomer(ticket.id);
      await queueEngine.finishService(ticket.id, 'CASH_PAID', 200);

      // Now customer tries to claim the first-visit coupon
      const res = await couponService.validateAndApplyCoupon({
        code,
        targetType: 'SALON_SERVICE',
        orderAmount: 200,
        salonId: 'salon-rural-01',
        userId: returningPhone,
      });

      expect(res.valid).toBe(false);
      expect(res.message).toContain('valid only on your first visit to this salon');
    });

    it('allows a customer to use a multi-use coupon up to N times (e.g. 3 times) and blocks on N+1', async () => {
      const code = ('MLT_' + Math.random().toString(36).substring(2, 8)).toUpperCase();
      const coupon = await couponRepo.createCoupon({
        code,
        targetType: 'SALON_SERVICE',
        salonId: 'salon-rural-01',
        discountType: 'FLAT',
        discountValue: 30,
        isFirstTimeOnly: false,
        maxUsesPerUser: 3, // Owner gave 3 uses per customer!
      });

      const customerPhone = `9199955${Date.now().toString().slice(-5)}`;

      // 1st Use: Valid
      const use1 = await couponService.validateAndApplyCoupon({
        code,
        targetType: 'SALON_SERVICE',
        orderAmount: 150,
        salonId: 'salon-rural-01',
        userId: customerPhone,
      });
      expect(use1.valid).toBe(true);
      await couponRepo.recordRedemption({
        couponId: coupon.id,
        targetType: 'SALON_SERVICE',
        targetOrderId: `order_1_${Date.now()}`,
        userId: customerPhone,
        discountApplied: 30,
      });

      // 2nd Use: Valid
      const use2 = await couponService.validateAndApplyCoupon({
        code,
        targetType: 'SALON_SERVICE',
        orderAmount: 150,
        salonId: 'salon-rural-01',
        userId: customerPhone,
      });
      expect(use2.valid).toBe(true);
      await couponRepo.recordRedemption({
        couponId: coupon.id,
        targetType: 'SALON_SERVICE',
        targetOrderId: `order_2_${Date.now()}`,
        userId: customerPhone,
        discountApplied: 30,
      });

      // 3rd Use: Valid
      const use3 = await couponService.validateAndApplyCoupon({
        code,
        targetType: 'SALON_SERVICE',
        orderAmount: 150,
        salonId: 'salon-rural-01',
        userId: customerPhone,
      });
      expect(use3.valid).toBe(true);
      await couponRepo.recordRedemption({
        couponId: coupon.id,
        targetType: 'SALON_SERVICE',
        targetOrderId: `order_3_${Date.now()}`,
        userId: customerPhone,
        discountApplied: 30,
      });

      // 4th Use: REJECTED (exceeded 3 uses limit)
      const use4 = await couponService.validateAndApplyCoupon({
        code,
        targetType: 'SALON_SERVICE',
        orderAmount: 150,
        salonId: 'salon-rural-01',
        userId: customerPhone,
      });
      expect(use4.valid).toBe(false);
      expect(use4.message).toContain('maximum allowed times (3 times)');
    });
  });
});
