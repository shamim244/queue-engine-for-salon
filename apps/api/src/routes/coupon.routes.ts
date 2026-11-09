import { Elysia, t } from 'elysia';
import { couponService } from '../coupon/coupon.service';

export const couponRoutes = new Elysia({ prefix: '/api/coupons' })
  // 1. Validate & Apply Coupon Code
  .post(
    '/apply',
    async ({ body, set }) => {
      try {
        const result = await couponService.validateAndApplyCoupon(body as any);
        if (!result.valid) {
          set.status = 400;
        }
        return {
          success: result.valid,
          ...result,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          valid: false,
          message: err.message,
          discountAmount: 0,
          netPayable: (body as any)?.orderAmount || 0,
        };
      }
    },
    {
      body: t.Object({
        code: t.String(),
        targetType: t.Union([t.Literal('SUBSCRIPTION'), t.Literal('SALON_SERVICE')]),
        orderAmount: t.Number({ minimum: 0.01 }),
        userId: t.Optional(t.Union([t.String(), t.Null()])),
        organizationId: t.Optional(t.Union([t.String(), t.Null()])),
        salonId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )

  // 2. List All Coupons
  .get(
    '/',
    async ({ query }) => {
      const coupons = await couponService.getAllCoupons(query as any);
      return {
        success: true,
        coupons,
      };
    },
    {
      query: t.Object({
        targetType: t.Optional(t.String()),
        salonId: t.Optional(t.String()),
        organizationId: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  )

  // 3. Create Coupon
  .post(
    '/',
    async ({ body, set }) => {
      try {
        const coupon = await couponService.createCoupon(body as any);
        set.status = 201;
        return {
          success: true,
          coupon,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message,
        };
      }
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2, maxLength: 50 }),
        targetType: t.Union([t.Literal('SUBSCRIPTION'), t.Literal('SALON_SERVICE')]),
        organizationId: t.Optional(t.Union([t.String(), t.Null()])),
        salonId: t.Optional(t.Union([t.String(), t.Null()])),
        discountType: t.Union([t.Literal('PERCENT'), t.Literal('FLAT')]),
        discountValue: t.Number({ minimum: 0.01 }),
        maxDiscountAmount: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        minOrderAmount: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        maxUses: t.Optional(t.Union([t.Number({ minimum: 1 }), t.Null()])),
        maxUsesPerUser: t.Optional(t.Union([t.Number({ minimum: 1 }), t.Null()])),
        validFrom: t.Optional(t.Union([t.String(), t.Null()])),
        validUntil: t.Optional(t.Union([t.String(), t.Null()])),
        status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('EXPIRED')])),
      }),
    }
  )

  // 4. Update Coupon
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      try {
        const coupon = await couponService.updateCoupon(params.id, body as any);
        if (!coupon) {
          set.status = 404;
          return {
            success: false,
            message: `Coupon not found: ${params.id}`,
          };
        }
        return {
          success: true,
          coupon,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message,
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        discountType: t.Optional(t.Union([t.Literal('PERCENT'), t.Literal('FLAT')])),
        discountValue: t.Optional(t.Number({ minimum: 0.01 })),
        maxDiscountAmount: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        minOrderAmount: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        maxUses: t.Optional(t.Union([t.Number({ minimum: 1 }), t.Null()])),
        maxUsesPerUser: t.Optional(t.Union([t.Number({ minimum: 1 }), t.Null()])),
        validFrom: t.Optional(t.Union([t.String(), t.Null()])),
        validUntil: t.Optional(t.Union([t.String(), t.Null()])),
        status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('EXPIRED')])),
      }),
    }
  )

  // 5. Delete / Archive Coupon
  .delete(
    '/:id',
    async ({ params, set }) => {
      try {
        const deleted = await couponService.deleteCoupon(params.id);
        return {
          success: deleted,
          message: deleted ? 'Coupon deleted successfully.' : 'Failed to delete coupon.',
        };
      } catch (err: any) {
        set.status = 500;
        return {
          success: false,
          message: err.message,
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
