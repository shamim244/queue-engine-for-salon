import { Elysia, t } from 'elysia';
import { loyaltyService } from '../loyalty/loyalty.service';
import { loyaltyRepo } from '../db/repositories/loyalty.repo';
import { salonRepo } from '../db/repositories/salon.repo';

export const loyaltyRoutes = new Elysia({ prefix: '/api/loyalty' })
  // 1. Get Multi-Salon Loyalty Hub for Consumer (/me)
  .get(
    '/customer-cards',
    async ({ query, set }) => {
      try {
        const phone = (query.phone || '').trim();
        if (!phone) {
          set.status = 400;
          return { success: false, message: 'Phone number is required.' };
        }
        return await loyaltyService.getCustomerLoyaltyHub(phone);
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      query: t.Object({
        phone: t.String(),
      }),
    }
  )

  // 2. Get Single Salon Card & Active Vouchers
  .get(
    '/card',
    async ({ query, set }) => {
      try {
        const { salonId, phone } = query;
        if (!salonId || !phone) {
          set.status = 400;
          return { success: false, message: 'Both salonId and phone are required.' };
        }
        const [card, vouchers, salon] = await Promise.all([
          loyaltyRepo.getCard(salonId, phone),
          loyaltyRepo.getVouchersByPhone(phone, salonId),
          salonRepo.getSalonById(salonId),
        ]);

        const goal = salon?.loyaltyStampGoal && salon.loyaltyStampGoal > 0 ? salon.loyaltyStampGoal : 6;
        let rewardServiceName = salon?.loyaltyRewardServiceName || salon?.loyaltyRewardDescription || 'Free Haircut';
        let rewardServicePrice = 0;

        if (salon?.loyaltyRewardServiceId && salon.services) {
          const found = salon.services.find((s) => s.id === salon.loyaltyRewardServiceId);
          if (found) {
            rewardServiceName = found.name;
            rewardServicePrice = found.basePrice;
          }
        }

        const activeVouchers = (vouchers || []).filter((v) => v.status === 'ACTIVE');

        return {
          success: true,
          card: card || {
            salonId,
            customerPhone: phone,
            currentStamps: 0,
            totalLifetimeStamps: 0,
            completedMilestones: 0,
          },
          stampGoal: goal,
          rewardServiceName,
          rewardServicePrice,
          activeVouchers,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      query: t.Object({
        salonId: t.String(),
        phone: t.String(),
      }),
    }
  )

  // 3. Redeem Loyalty Voucher at Station / Checkout
  .post(
    '/redeem',
    async ({ body, set }) => {
      try {
        const { voucherCode, salonId, ticketId } = body;
        const redeemed = await loyaltyService.redeemVoucher(voucherCode, salonId, ticketId);
        return {
          success: true,
          voucher: redeemed,
          message: `Voucher "${voucherCode}" successfully redeemed for Free ${redeemed.rewardServiceName}!`,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        voucherCode: t.String(),
        salonId: t.String(),
        ticketId: t.String(),
      }),
    }
  )

  // 4. Get Salon Loyalty Configuration, Services Dropdown & Advocates (/owner/loyalty)
  .get(
    '/salon-settings',
    async ({ query, set }) => {
      try {
        const salon = await salonRepo.getSalonById(query.salonId);
        if (!salon) {
          set.status = 404;
          return { success: false, message: 'Salon not found.' };
        }

        // Available catalog services for owner selection
        const availableServices = (salon.services || []).map((s) => ({
          id: s.id,
          name: s.name,
          basePrice: s.basePrice,
          estimatedDurationMinutes: s.estimatedDurationMinutes,
          isAddOn: s.isAddOn,
        }));

        const stats = await loyaltyRepo.getSalonLoyaltyStats(salon.id);

        return {
          success: true,
          salon: {
            id: salon.id,
            name: salon.name,
            slug: salon.slug,
            loyaltyEnabled: salon.loyaltyEnabled !== false,
            loyaltyStampGoal: salon.loyaltyStampGoal || 6,
            loyaltyRewardServiceId: salon.loyaltyRewardServiceId || (availableServices[0]?.id || null),
            loyaltyRewardServiceName: salon.loyaltyRewardServiceName || (availableServices[0]?.name || 'Free Haircut'),
            loyaltyCooldownHours: salon.loyaltyCooldownHours ?? 4,
            loyaltyVoucherValidityDays: salon.loyaltyVoucherValidityDays ?? 90,
            loyaltyReferrerBonus: salon.loyaltyReferrerBonus ?? 50,
            loyaltyRefereeDiscount: salon.loyaltyRefereeDiscount ?? 50,
            loyaltyRewardDescription: salon.loyaltyRewardDescription || 'Free Haircut or Beard Grooming',
          },
          availableServices,
          stats,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      query: t.Object({
        salonId: t.String(),
      }),
    }
  )

  // 5. Update Salon Loyalty Settings (/owner/loyalty)
  .post(
    '/salon-settings',
    async ({ body, set }) => {
      try {
        const {
          salonId,
          enabled,
          stampGoal,
          rewardServiceId,
          rewardServiceName,
          cooldownHours,
          voucherValidityDays,
          referrerBonus,
          refereeDiscount,
          rewardDescription,
        } = body;

        const updated = await salonRepo.updateSalon(salonId, {
          loyaltyEnabled: enabled,
          loyaltyStampGoal: stampGoal,
          loyaltyRewardServiceId: rewardServiceId,
          loyaltyRewardServiceName: rewardServiceName,
          loyaltyCooldownHours: cooldownHours,
          loyaltyVoucherValidityDays: voucherValidityDays,
          loyaltyReferrerBonus: referrerBonus,
          loyaltyRefereeDiscount: refereeDiscount,
          loyaltyRewardDescription: rewardDescription,
        });

        if (!updated) {
          set.status = 404;
          return { success: false, message: 'Failed to update salon loyalty configuration.' };
        }

        return {
          success: true,
          salon: updated,
          message: 'Salon loyalty rules & reward service updated successfully!',
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        salonId: t.String(),
        enabled: t.Optional(t.Boolean()),
        stampGoal: t.Optional(t.Number()),
        rewardServiceId: t.Optional(t.String()),
        rewardServiceName: t.Optional(t.String()),
        cooldownHours: t.Optional(t.Number()),
        voucherValidityDays: t.Optional(t.Number()),
        referrerBonus: t.Optional(t.Number()),
        refereeDiscount: t.Optional(t.Number()),
        rewardDescription: t.Optional(t.String()),
      }),
    }
  )

  // 6. Platform-Wide Super Admin Loyalty Statistics (/admin/loyalty)
  .get('/admin/stats', async () => {
    const stats = await loyaltyRepo.getPlatformLoyaltyStats();
    return {
      success: true,
      stats,
    };
  })

  // 7. Customer Grooming Profile & Haircut Specs (/me)
  .get(
    '/customer/profile',
    async ({ query, set }) => {
      try {
        const phone = (query.phone || '').trim();
        if (!phone) {
          set.status = 400;
          return { success: false, message: 'Phone is required.' };
        }
        const profile = await loyaltyRepo.getCustomerGroomingProfile(phone);
        return {
          success: true,
          profile: profile || {
            phone,
            name: 'Valued Client',
            groomingSpecs: '',
            preferredBarberName: '',
            notes: '',
          },
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      query: t.Object({
        phone: t.String(),
      }),
    }
  )

  // 8. Save Customer Grooming Profile & Haircut Specs (/me)
  .put(
    '/customer/profile',
    async ({ body, set }) => {
      try {
        const { phone, groomingSpecs, preferredBarberId, preferredBarberName, notes } = body;
        const updated = await loyaltyRepo.updateCustomerGroomingProfile(phone, {
          groomingSpecs,
          preferredBarberId,
          preferredBarberName,
          notes,
        });
        return {
          success: true,
          profile: updated,
          message: 'Your grooming specifications & barber notes have been saved!',
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        phone: t.String(),
        groomingSpecs: t.Optional(t.String()),
        preferredBarberId: t.Optional(t.String()),
        preferredBarberName: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  );
