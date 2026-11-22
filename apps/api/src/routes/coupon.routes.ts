import { Elysia, t } from 'elysia';
import { couponService } from '../coupon/coupon.service';
import { authService } from '../auth/auth-service';

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

  // 1b. Query Auto Referral Discount for Salon / Organization
  .get(
    '/auto-referral',
    async ({ query }) => {
      try {
        const { partnerRepo } = await import('../db/repositories/partner.repo');
        const { salonRepo } = await import('../db/repositories/salon.repo');
        const { referralRepo } = await import('../db/repositories/referral.repo');
        const { referralService } = await import('../wallet/referral.service');
        const { organizationRepo } = await import('../db/repositories/organization.repo');
        const { repository } = await import('../db/repository');
        const platformSettings = repository.getPlatformSettings();
        const b2bDiscountPercent = Math.max(0, Math.min(100, platformSettings.b2bReferral?.refereeDiscountPercent ?? 20));

        let partner: any = null;
        let b2bReferral: { code: string; name: string; discountPercent: number } | null = null;

        let targetOrgId = query.organizationId;
        if (!targetOrgId && query.salonId) {
          const salon = await salonRepo.getSalonById(query.salonId);
          if (salon?.organizationId) targetOrgId = salon.organizationId;
        }

        // Check if organization is eligible for B2B referral discount (one-time rule)
        let isEligibleForB2B = true;
        if (targetOrgId) {
          const eligibility = await referralService.isOrgEligibleForReferral(targetOrgId);
          if (!eligibility.eligible) {
            isEligibleForB2B = false;
          }
        }

        // 1. Direct cookie / query code check for B2B Salon Referral
        if (isEligibleForB2B && query.cookieCode) {
          const referrerOrgId = await referralService.resolveReferrerOrg(query.cookieCode);
          if (referrerOrgId && (!query.organizationId || referrerOrgId !== query.organizationId)) {
            const org = await organizationRepo.getOrganizationById(referrerOrgId);
            b2bReferral = {
              code: query.cookieCode.trim().toUpperCase(),
              name: org?.name || 'Referred Salon',
              discountPercent: b2bDiscountPercent,
            };
          }
        }

        // 2. Direct cookie / query code check for Affiliate Partner
        if (!b2bReferral && query.cookieCode) {
          const directPartner = await partnerRepo.getPartnerByCode(query.cookieCode);
          if (directPartner && directPartner.status === 'ACTIVE') {
            partner = directPartner;
          }
        }

        // 3. Organization / Salon attribution check for B2B Referral (e.g. Free plan onboarding)
        if (isEligibleForB2B && !b2bReferral && !partner) {
          if (targetOrgId) {
            const pendingAttr = await referralRepo.getPendingAttributionForOrg(targetOrgId);
            if (pendingAttr && pendingAttr.referrerOrgId) {
              const org = await organizationRepo.getOrganizationById(pendingAttr.referrerOrgId);
              b2bReferral = {
                code: pendingAttr.referrerCode,
                name: org?.name || 'Referred Salon',
                discountPercent: b2bDiscountPercent,
              };
            }
          }
        }

        // 4. Salon attribution check for Affiliate Partner
        if (!b2bReferral && !partner) {
          let targetSalonId = query.salonId;
          if (!targetSalonId && query.organizationId) {
            const salons = await salonRepo.getAllSalons();
            const match = salons.find((s) => s.organizationId === query.organizationId);
            if (match) targetSalonId = match.id;
          }
          if (targetSalonId) {
            const attribution = await partnerRepo.getAttributionBySalonId(targetSalonId);
            if (attribution) {
              const attrPartner = await partnerRepo.getPartnerById(attribution.partnerId);
              if (attrPartner && attrPartner.status === 'ACTIVE') {
                partner = attrPartner;
              }
            }
          }
        }

        if (b2bReferral) {
          return {
            success: true,
            hasReferralDiscount: true,
            partnerCode: b2bReferral.code,
            partnerName: b2bReferral.name,
            discountPercent: b2bReferral.discountPercent,
            message: `Special ${b2bReferral.discountPercent}% Salon Referral Discount applied from ${b2bReferral.name}!`,
          };
        }

        if (partner) {
          const settings = await partnerRepo.getProgramSettings();
          const discountPercent = Math.max(0, Math.min(100, settings.defaultReferralDiscountPercent ?? 10));
          return {
            success: true,
            hasReferralDiscount: true,
            partnerCode: partner.referralCode,
            partnerName: partner.fullName,
            discountPercent,
            message: `Special ${discountPercent}% Partner Discount applied from ${partner.fullName}!`,
          };
        }

        return {
          success: true,
          hasReferralDiscount: false,
          partnerCode: null,
          discountPercent: 0,
        };
      } catch (err: any) {
        return {
          success: false,
          hasReferralDiscount: false,
          partnerCode: null,
          discountPercent: 0,
          message: err.message,
        };
      }
    },
    {
      query: t.Object({
        salonId: t.Optional(t.String()),
        organizationId: t.Optional(t.String()),
        cookieCode: t.Optional(t.String()),
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
    async ({ headers, cookie: { engine_session }, body, set }) => {
      const token =
        (headers as any).authorization?.replace(/^Bearer\s+/i, '') ||
        (engine_session ? (engine_session as any).value : null);

      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authentication required to create coupons',
        };
      }
      const user = await authService.validateSession(token);
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired session token',
        };
      }
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'SALON_OWNER') {
        set.status = 403;
        return {
          success: false,
          message: 'Forbidden: Insufficient privileges to create coupons',
        };
      }

      if (user.role === 'SALON_OWNER') {
        if ((body as any).targetType === 'SUBSCRIPTION') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: Salon owners cannot create subscription coupons',
          };
        }
        const ownerSalonId = user.salonId || user.salon?.id;
        const ownerOrgId = user.organizationId || user.organization?.id;
        if (!ownerSalonId && !ownerOrgId) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: Salon owner is not associated with any salon',
          };
        }
        if ((body as any).salonId && (body as any).salonId !== ownerSalonId) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: Cannot create coupons for other salons',
          };
        }
        if ((body as any).organizationId && (body as any).organizationId !== ownerOrgId) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: Cannot create coupons for other organizations',
          };
        }
        (body as any).salonId = ownerSalonId;
        (body as any).organizationId = ownerOrgId;
        (body as any).targetType = 'SALON_SERVICE';
      }

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
        isFirstTimeOnly: t.Optional(t.Union([t.Boolean(), t.Null()])),
        validFrom: t.Optional(t.Union([t.String(), t.Null()])),
        validUntil: t.Optional(t.Union([t.String(), t.Null()])),
        status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('EXPIRED')])),
      }),
    }
  )

  // 4. Update Coupon
  .patch(
    '/:id',
    async ({ headers, cookie: { engine_session }, params, body, set }) => {
      const token =
        (headers as any).authorization?.replace(/^Bearer\s+/i, '') ||
        (engine_session ? (engine_session as any).value : null);

      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authentication required to update coupons',
        };
      }
      const user = await authService.validateSession(token);
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired session token',
        };
      }
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'SALON_OWNER') {
        set.status = 403;
        return {
          success: false,
          message: 'Forbidden: Insufficient privileges to update coupons',
        };
      }

      const existingCoupon = await couponService.getCouponById(params.id);
      if (!existingCoupon) {
        set.status = 404;
        return {
          success: false,
          message: `Coupon not found: ${params.id}`,
        };
      }

      if (user.role === 'SALON_OWNER') {
        const ownerSalonId = user.salonId || user.salon?.id;
        const ownerOrgId = user.organizationId || user.organization?.id;
        if (!existingCoupon.salonId && !existingCoupon.organizationId) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: Cannot modify global platform coupons',
          };
        }
        if (existingCoupon.targetType === 'SUBSCRIPTION') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: Cannot modify subscription coupons',
          };
        }
        if (
          (existingCoupon.salonId && existingCoupon.salonId !== ownerSalonId) ||
          (existingCoupon.organizationId && existingCoupon.organizationId !== ownerOrgId)
        ) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only modify coupons for your own salon',
          };
        }
      }

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
        isFirstTimeOnly: t.Optional(t.Union([t.Boolean(), t.Null()])),
        validFrom: t.Optional(t.Union([t.String(), t.Null()])),
        validUntil: t.Optional(t.Union([t.String(), t.Null()])),
        status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('EXPIRED')])),
      }),
    }
  )

  // 5. Delete / Archive Coupon
  .delete(
    '/:id',
    async ({ headers, cookie: { engine_session }, params, set }) => {
      const token =
        (headers as any).authorization?.replace(/^Bearer\s+/i, '') ||
        (engine_session ? (engine_session as any).value : null);

      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Authentication required to delete coupons',
        };
      }
      const user = await authService.validateSession(token);
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired session token',
        };
      }
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'SALON_OWNER') {
        set.status = 403;
        return {
          success: false,
          message: 'Forbidden: Insufficient privileges to delete coupons',
        };
      }

      const existingCoupon = await couponService.getCouponById(params.id);
      if (!existingCoupon) {
        set.status = 404;
        return {
          success: false,
          message: `Coupon not found: ${params.id}`,
        };
      }

      if (user.role === 'SALON_OWNER') {
        const ownerSalonId = user.salonId || user.salon?.id;
        const ownerOrgId = user.organizationId || user.organization?.id;
        if (!existingCoupon.salonId && !existingCoupon.organizationId) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: Cannot delete global platform coupons',
          };
        }
        if (existingCoupon.targetType === 'SUBSCRIPTION') {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: Cannot delete subscription coupons',
          };
        }
        if (
          (existingCoupon.salonId && existingCoupon.salonId !== ownerSalonId) ||
          (existingCoupon.organizationId && existingCoupon.organizationId !== ownerOrgId)
        ) {
          set.status = 403;
          return {
            success: false,
            message: 'Forbidden: You can only delete coupons for your own salon',
          };
        }
      }

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
