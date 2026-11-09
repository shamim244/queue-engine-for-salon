import { Elysia, t } from 'elysia';
import { referralService } from '../wallet/referral.service';

export const referralRoutes = new Elysia({ prefix: '/api/referrals' })
  // 1. Get Referral Code & Share Link
  .get(
    '/code',
    async ({ query, set }) => {
      try {
        if (query.orgId) {
          const code = referralService.getOrgReferralCode(query.orgId, query.slug);
          return {
            success: true,
            referralType: 'B2B_OWNER',
            code,
            shareUrl: `/signup?ref=${code}`,
          };
        } else if (query.phone) {
          const code = referralService.getConsumerReferralCode(query.phone);
          return {
            success: true,
            referralType: 'B2C_CONSUMER',
            code,
            shareUrl: `?ref=${code}`,
          };
        } else {
          set.status = 400;
          return {
            success: false,
            message: 'Either orgId or phone must be provided.',
          };
        }
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message,
        };
      }
    },
    {
      query: t.Object({
        orgId: t.Optional(t.String()),
        slug: t.Optional(t.String()),
        phone: t.Optional(t.String()),
      }),
    }
  )

  // 2. Get Referral Performance Stats
  .get(
    '/stats',
    async ({ query, set }) => {
      try {
        const stats = await referralService.getStats({
          referrerOrgId: query.referrerOrgId,
          referrerPhone: query.referrerPhone,
          salonId: query.salonId,
        });

        let code = '';
        if (query.referrerOrgId) {
          code = referralService.getOrgReferralCode(query.referrerOrgId);
        } else if (query.referrerPhone) {
          code = referralService.getConsumerReferralCode(query.referrerPhone);
        }

        return {
          success: true,
          code,
          ...stats,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message || 'Failed to retrieve referral statistics.',
        };
      }
    },
    {
      query: t.Object({
        referrerOrgId: t.Optional(t.String()),
        referrerPhone: t.Optional(t.String()),
        salonId: t.Optional(t.String()),
      }),
    }
  )

  // 3. Record Attribution (e.g. at signup or visit)
  .post(
    '/attribute',
    async ({ body, set }) => {
      try {
        const attribution = await referralService.attributeReferral({
          referralType: body.referralType as any,
          referrerCode: body.referrerCode,
          referredOrgId: body.referredOrgId,
          referredPhone: body.referredPhone,
          salonId: body.salonId,
        });

        return {
          success: true,
          attribution,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message || 'Failed to attribute referral.',
        };
      }
    },
    {
      body: t.Object({
        referralType: t.Union([t.Literal('B2B_OWNER'), t.Literal('B2C_CONSUMER')]),
        referrerCode: t.String({ minLength: 1 }),
        referredOrgId: t.Optional(t.Union([t.String(), t.Null()])),
        referredPhone: t.Optional(t.Union([t.String(), t.Null()])),
        salonId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  );
