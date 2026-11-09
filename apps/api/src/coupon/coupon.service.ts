import { couponRepo } from '../db/repositories/coupon.repo';
import type { ApplyCouponInput, ApplyCouponResult, Coupon, CreateCouponPayload } from './types';

export class CouponService {
  async validateAndApplyCoupon(input: ApplyCouponInput): Promise<ApplyCouponResult> {
    if (!input.code || !input.code.trim()) {
      return {
        valid: false,
        message: 'Please enter a coupon code.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    if (!input.orderAmount || input.orderAmount <= 0) {
      return {
        valid: false,
        message: 'Order amount must be greater than zero.',
        discountAmount: 0,
        netPayable: 0,
      };
    }

    const coupon = await couponRepo.getCouponByCode(input.code);
    if (!coupon) {
      return {
        valid: false,
        message: `Coupon code "${input.code.trim().toUpperCase()}" is invalid.`,
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 1. Status Check
    if (coupon.status !== 'ACTIVE') {
      return {
        valid: false,
        message: 'This coupon is inactive.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 2. Date Validity Check
    const now = new Date();
    if (new Date(coupon.validFrom) > now) {
      return {
        valid: false,
        message: 'This coupon is not yet active.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return {
        valid: false,
        message: 'This coupon has expired.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 3. Target Scoping Check (Review Focus #4)
    if (coupon.targetType !== input.targetType) {
      return {
        valid: false,
        message: `This coupon is valid only for ${
          coupon.targetType === 'SUBSCRIPTION' ? 'subscription plans' : 'salon services'
        }.`,
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 4. Salon Scoping Check (if scoped to a specific salon)
    if (coupon.salonId && input.salonId && coupon.salonId !== input.salonId) {
      return {
        valid: false,
        message: 'This coupon is not valid for this salon location.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 5. Minimum Order Threshold Check (Review Focus #2)
    if (input.orderAmount < coupon.minOrderAmount) {
      return {
        valid: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required to use this coupon.`,
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 6. Max Overall Uses Check
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return {
        valid: false,
        message: 'This coupon has reached its maximum usage limit.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 7. Per-User Usage Limit Check (Review Focus #3)
    const effectiveUserId = input.userId || input.organizationId;
    if (effectiveUserId) {
      const priorUses = await couponRepo.getUserRedemptionCount(coupon.id, effectiveUserId);
      if (priorUses >= coupon.maxUsesPerUser) {
        return {
          valid: false,
          message: 'You have already redeemed this coupon the maximum allowed times.',
          discountAmount: 0,
          netPayable: input.orderAmount,
        };
      }
    }

    // 8. Discount Calculation Math (Review Focus #1 & #5)
    let rawDiscount = 0;
    if (coupon.discountType === 'PERCENT') {
      rawDiscount = (input.orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
        rawDiscount = Math.min(rawDiscount, coupon.maxDiscountAmount);
      }
    } else {
      rawDiscount = coupon.discountValue;
    }

    // Cap discount so it never exceeds orderAmount
    const discountAmount = Math.min(Math.round(rawDiscount * 100) / 100, input.orderAmount);
    const netPayable = Math.max(0, Math.round((input.orderAmount - discountAmount) * 100) / 100);

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
      },
      discountAmount,
      netPayable,
    };
  }

  async createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
    return couponRepo.createCoupon(payload);
  }

  async getAllCoupons(filter?: Parameters<typeof couponRepo.getAllCoupons>[0]): Promise<Coupon[]> {
    return couponRepo.getAllCoupons(filter);
  }

  async getCouponById(id: string): Promise<Coupon | null> {
    return couponRepo.getCouponById(id);
  }

  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    return couponRepo.updateCoupon(id, updates);
  }

  async deleteCoupon(id: string): Promise<boolean> {
    return couponRepo.deleteCoupon(id);
  }
}

export const couponService = new CouponService();
