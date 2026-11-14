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
          headers: { 'Content-Type': 'application/json' },
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
});
