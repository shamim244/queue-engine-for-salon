import type {
  Coupon,
  CouponRedemption,
  CouponTargetType,
  CouponDiscountType,
  CouponStatus,
  CreateCouponPayload,
} from '../engine/types';

export type {
  Coupon,
  CouponRedemption,
  CouponTargetType,
  CouponDiscountType,
  CouponStatus,
  CreateCouponPayload,
};

export interface ApplyCouponInput {
  code: string;
  targetType: CouponTargetType;
  orderAmount: number;
  userId?: string | null;
  organizationId?: string | null;
  salonId?: string | null;
}

export interface ApplyCouponResult {
  valid: boolean;
  message?: string;
  coupon?: {
    id: string;
    code: string;
    discountType: CouponDiscountType;
    discountValue: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number;
    isFirstTimeOnly?: boolean;
    maxUsesPerUser?: number;
  };
  discountAmount: number;
  netPayable: number;
}
