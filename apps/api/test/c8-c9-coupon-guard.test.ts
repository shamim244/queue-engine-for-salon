import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { couponRepo } from '../src/db/repositories/coupon.repo';
import { authService } from '../src/auth/auth-service';
import type { Coupon } from '../src/engine/types';

describe('ADR 005 - C8 & C9: Coupon Limits & Management Auth Security', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(async () => {
    await authService.seedDefaultUsers();

    // Authenticate Super Admin
    const adminAuth = await authService.authenticateUser('admin', 'Admin@123');
    if (!adminAuth) throw new Error('Admin auth failed');
    adminToken = adminAuth.session.token;

    // Create and authenticate customer user
    const existing = await authService.getUserByUsername('cust_coupon_test');
    if (!existing) {
      await authService.createUser({
        username: 'cust_coupon_test',
        phone: '9777766666',
        password: 'Customer@123',
        role: 'CUSTOMER',
      });
    }
    const customerAuth = await authService.authenticateUser('cust_coupon_test', 'Customer@123');
    if (!customerAuth) throw new Error('Customer auth failed');
    customerToken = customerAuth.session.token;
  });

  describe('C8: Atomic Coupon Redemptions & Limit Guards', () => {
    it('C8.1: should prevent exceeding maxUses under concurrent redemptions', async () => {
      const couponId = `coupon-c8-max-${Date.now()}`;
      await couponRepo.createCoupon({
        id: couponId,
        code: `LIMIT2_${Date.now()}`,
        targetType: 'SUBSCRIPTION',
        discountType: 'FLAT',
        discountValue: 100,
        maxUses: 2, // Max 2 uses overall
        maxUsesPerUser: 5,
        minOrderAmount: 50,
      } as any);

      // Attempt 4 concurrent redemptions
      const results = await Promise.allSettled([
        couponRepo.recordRedemption({
          couponId,
          targetType: 'SUBSCRIPTION',
          targetOrderId: 'ord_1',
          userId: 'user_1',
          discountApplied: 100,
        }),
        couponRepo.recordRedemption({
          couponId,
          targetType: 'SUBSCRIPTION',
          targetOrderId: 'ord_2',
          userId: 'user_2',
          discountApplied: 100,
        }),
        couponRepo.recordRedemption({
          couponId,
          targetType: 'SUBSCRIPTION',
          targetOrderId: 'ord_3',
          userId: 'user_3',
          discountApplied: 100,
        }),
        couponRepo.recordRedemption({
          couponId,
          targetType: 'SUBSCRIPTION',
          targetOrderId: 'ord_4',
          userId: 'user_4',
          discountApplied: 100,
        }),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      // Exactly 2 must succeed, and 2 must fail with limit reached
      expect(successes.length).toBe(2);
      expect(failures.length).toBe(2);

      const coupon = await couponRepo.getCouponById(couponId);
      expect(coupon?.usedCount).toBe(2);
    });

    it('C8.2: should reject anonymous redemptions for coupons with per-user limits', async () => {
      const couponId = `coupon-c8-peruser-${Date.now()}`;
      await couponRepo.createCoupon({
        id: couponId,
        code: `PERUSER_${Date.now()}`,
        targetType: 'SUBSCRIPTION',
        discountType: 'FLAT',
        discountValue: 50,
        maxUses: 100,
        maxUsesPerUser: 1, // Requires 1 use per user
        minOrderAmount: 50,
      } as any);

      // Anonymous redemption (no userId)
      await expect(
        couponRepo.recordRedemption({
          couponId,
          targetType: 'SUBSCRIPTION',
          targetOrderId: 'ord_anon',
          userId: null,
          discountApplied: 50,
        })
      ).rejects.toThrow('User identifier is required');
    });

    it('C8.3: should enforce maxUsesPerUser limit for the same user', async () => {
      const couponId = `coupon-c8-singleuser-${Date.now()}`;
      await couponRepo.createCoupon({
        id: couponId,
        code: `SINGLEUSER_${Date.now()}`,
        targetType: 'SUBSCRIPTION',
        discountType: 'FLAT',
        discountValue: 50,
        maxUses: 100,
        maxUsesPerUser: 1, // Only 1 use per user
        minOrderAmount: 50,
      } as any);

      // First use: Should succeed
      await couponRepo.recordRedemption({
        couponId,
        targetType: 'SUBSCRIPTION',
        targetOrderId: 'ord_user1_1',
        userId: 'user_repeat_1',
        discountApplied: 50,
      });

      // Second use by same user: Should reject
      await expect(
        couponRepo.recordRedemption({
          couponId,
          targetType: 'SUBSCRIPTION',
          targetOrderId: 'ord_user1_2',
          userId: 'user_repeat_1',
          discountApplied: 50,
        })
      ).rejects.toThrow('maximum allowed times');
    });
  });

  describe('C9: Coupon Route Authentication & Authorization', () => {
    it('C9.1: should reject unauthenticated coupon creation with 401', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: 'NOAUTH50',
            targetType: 'SUBSCRIPTION',
            discountType: 'FLAT',
            discountValue: 50,
          }),
        })
      );

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('C9.2: should reject customer role coupon creation with 403', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/coupons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
          body: JSON.stringify({
            code: 'HACKER50',
            targetType: 'SUBSCRIPTION',
            discountType: 'FLAT',
            discountValue: 50,
          }),
        })
      );

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('C9.3: should allow admin coupon creation with 201', async () => {
      const res = await app.handle(
        new Request('http://localhost/api/coupons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            code: `ADMINVALID_${Date.now()}`,
            targetType: 'SUBSCRIPTION',
            discountType: 'FLAT',
            discountValue: 150,
          }),
        })
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.coupon).toBeDefined();
    });
  });
});
