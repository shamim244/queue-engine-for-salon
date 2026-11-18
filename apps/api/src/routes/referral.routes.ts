import { Elysia, t } from 'elysia';
import { referralService } from '../wallet/referral.service';
import { uniquenessService } from '../security/uniqueness.service';

export const referralRoutes = new Elysia({ prefix: '/api/referrals' })
  // 0. Universal Referral Code Uniqueness & Collision Check
  .get('/check-code', async ({ query, set }) => {
    const rawCode = (query.code || '').trim();
    if (!rawCode) {
      set.status = 400;
      return {
        available: false,
        code: '',
        reason: 'Referral code parameter is required.',
        suggestions: [],
      };
    }
    const result = await uniquenessService.checkReferralCode(rawCode, query.excludeId);
    return {
      success: true,
      ...result,
      code: result.value,
    };
  })
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

        const { repository } = await import('../db/repository');
        const settings = repository.getPlatformSettings();
        const commissionPercent = settings.b2bReferral?.commissionPercent ?? 30;
        const friendDiscountPercent = settings.b2bReferral?.refereeDiscountPercent ?? 20;
        const rewardCalculationBasis = settings.b2bReferral?.rewardCalculationBasis ?? 'NET_PAID';

        return {
          success: true,
          code,
          commissionPercent,
          friendDiscountPercent,
          rewardCalculationBasis,
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
  )

  // 4. Get Client Loyalty & Customer Advocates
  .get(
    '/client-loyalty',
    async ({ query, set }) => {
      try {
        const { salonRepo } = await import('../db/repositories/salon.repo');
        const { getDb, isMySqlConnected } = await import('../db/mysql');
        const { memoryStore } = await import('../db/repositories/store');

        const salon = await salonRepo.getSalonById(query.salonId);
        if (!salon) {
          set.status = 404;
          return { success: false, message: 'Salon not found.' };
        }

        const loyaltySettings = {
          enabled: salon.loyaltyEnabled ?? true,
          stampGoal: salon.loyaltyStampGoal ?? 6,
          referrerBonus: salon.loyaltyReferrerBonus ?? 50,
          refereeDiscount: salon.loyaltyRefereeDiscount ?? 50,
          rewardDescription: salon.loyaltyRewardDescription || 'Free Haircut or Beard Grooming',
        };

        let advocates: Array<{
          name: string;
          phone: string;
          referredCount: number;
          totalEarned: number;
          completedVisits: number;
        }> = [];

        let totalCompletedVisits = 0;
        let totalLoyalClients = 0;
        let totalReferrals = 0;
        let totalRewardsDisbursed = 0;

        if (isMySqlConnected) {
          const db = getDb();
          // Fetch completed tickets aggregated by customer_phone
          const [clientRows]: any = await db.query(
            `SELECT 
              customer_name, 
              customer_phone, 
              COUNT(*) AS completed_visits 
             FROM queue_tickets 
             WHERE (salon_id = ? OR salon_id = ?) 
               AND customer_phone IS NOT NULL 
               AND TRIM(customer_phone) != ''
             GROUP BY customer_phone, customer_name
             ORDER BY completed_visits DESC
             LIMIT 30`,
            [salon.id, salon.slug]
          );

          // Fetch consumer referrals for this salon
          const [refRows]: any = await db.query(
            `SELECT 
              referrer_phone, 
              COUNT(*) AS referred_count, 
              SUM(CASE WHEN status = 'CONVERTED' THEN reward_amount ELSE 0 END) AS total_earned
             FROM referral_attributions 
             WHERE referral_type = 'B2C_CONSUMER' AND (salon_id = ? OR salon_id = ?)
             GROUP BY referrer_phone`,
            [salon.id, salon.slug]
          );

          const refMap = new Map<string, { count: number; earned: number }>();
          for (const r of (refRows || [])) {
            const cleanPhone = (r.referrer_phone || '').replace(/[^0-9]/g, '').slice(-10);
            refMap.set(cleanPhone, {
              count: Number(r.referred_count || 0),
              earned: Number(r.total_earned || 0),
            });
            totalReferrals += Number(r.referred_count || 0);
            totalRewardsDisbursed += Number(r.total_earned || 0);
          }

          const seenPhones = new Set<string>();
          for (const c of (clientRows || [])) {
            const cleanPhone = (c.customer_phone || '').replace(/[^0-9]/g, '').slice(-10);
            if (!cleanPhone || seenPhones.has(cleanPhone)) continue;
            seenPhones.add(cleanPhone);

            const refData = refMap.get(cleanPhone) || { count: 0, earned: 0 };
            const visits = Number(c.completed_visits || 0);
            totalCompletedVisits += visits;

            advocates.push({
              name: c.customer_name || 'Valued Client',
              phone: `+91 ${cleanPhone.slice(0, 5)} ***${cleanPhone.slice(-2)}`,
              referredCount: refData.count,
              totalEarned: refData.earned,
              completedVisits: visits,
            });
          }

          totalLoyalClients = seenPhones.size;

          // Also add any referrers who haven't completed a visit yet
          for (const [phone, refData] of refMap.entries()) {
            if (!seenPhones.has(phone)) {
              advocates.push({
                name: 'Client Advocate',
                phone: `+91 ${phone.slice(0, 5)} ***${phone.slice(-2)}`,
                referredCount: refData.count,
                totalEarned: refData.earned,
                completedVisits: 0,
              });
            }
          }
        } else {
          // In-memory fallback
          for (const t of memoryStore.tickets.values()) {
            if ((t.salonId === salon.id || t.salonId === salon.slug) && t.customerPhone) {
              totalCompletedVisits++;
            }
          }
        }

        // Sort advocates by referrals first, then completed visits
        advocates.sort((a, b) => {
          if (b.referredCount !== a.referredCount) return b.referredCount - a.referredCount;
          return b.completedVisits - a.completedVisits;
        });

        // Limit to top 20
        advocates = advocates.slice(0, 20);

        return {
          success: true,
          salonId: salon.id,
          salonName: salon.name,
          loyaltySettings,
          customerAdvocates: advocates,
          stats: {
            totalCompletedVisits,
            totalLoyalClients,
            totalReferrals,
            totalRewardsDisbursed,
          },
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message || 'Failed to retrieve client loyalty statistics.',
        };
      }
    },
    {
      query: t.Object({
        salonId: t.String({ minLength: 1 }),
      }),
    }
  );
