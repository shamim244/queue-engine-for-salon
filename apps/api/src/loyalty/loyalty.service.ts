import { loyaltyRepo } from '../db/repositories/loyalty.repo';
import { salonRepo } from '../db/repositories/salon.repo';
import { jobQueue } from '../worker/job-queue';
import type { LoyaltyCard, LoyaltyVoucher } from '../engine/types';

function normalizePhone(phone: string): string {
  const cleaned = phone.trim().replace(/[^0-9]/g, '');
  return cleaned.slice(-10);
}

export class LoyaltyService {
  /**
   * Awards a digital stamp upon verified service completion.
   * Handles multi-salon isolation, anti-farming cooldown, and milestone voucher minting.
   */
  async awardStamp(params: {
    salonId: string;
    customerPhone: string;
    customerName?: string;
    ticketId: string;
    finalPrice?: number;
  }): Promise<{
    stampAwarded: boolean;
    card?: LoyaltyCard;
    voucherUnlocked?: LoyaltyVoucher | null;
    message?: string;
  }> {
    const { salonId, customerPhone, customerName, ticketId } = params;
    const cleanPhone = normalizePhone(customerPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { stampAwarded: false, message: 'Invalid customer phone number' };
    }

    const salon = await salonRepo.getSalonById(salonId);
    if (!salon) {
      return { stampAwarded: false, message: 'Salon not found' };
    }

    // Check if salon has loyalty enabled (defaults to true)
    if (salon.loyaltyEnabled === false) {
      return { stampAwarded: false, message: 'Loyalty program is disabled for this salon' };
    }

    let card = await loyaltyRepo.getCard(salon.id, cleanPhone);
    const now = new Date();
    const cooldownHours = salon.loyaltyCooldownHours ?? 4;

    if (card && card.lastStampAwardedAt) {
      const lastAwarded = new Date(card.lastStampAwardedAt).getTime();
      const diffHours = (now.getTime() - lastAwarded) / (1000 * 60 * 60);
      if (diffHours < cooldownHours) {
        return {
          stampAwarded: false,
          card,
          message: `Anti-farming cooldown active. Next stamp eligible in ${Math.ceil(cooldownHours - diffHours)}h.`,
        };
      }
    }

    const goal = salon.loyaltyStampGoal && salon.loyaltyStampGoal > 0 ? salon.loyaltyStampGoal : 6;

    if (!card) {
      card = {
        id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        salonId: salon.id,
        customerPhone: cleanPhone,
        customerName: customerName || null,
        currentStamps: 1,
        totalLifetimeStamps: 1,
        completedMilestones: 0,
        lastStampAwardedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      card.currentStamps += 1;
      card.totalLifetimeStamps += 1;
      card.lastStampAwardedAt = now;
      if (customerName) card.customerName = customerName;
    }

    let unlockedVoucher: LoyaltyVoucher | null = null;

    // Check milestone achievement
    if (card.currentStamps >= goal) {
      card.completedMilestones += 1;
      card.currentStamps = Math.max(0, card.currentStamps - goal); // Reset stamps for next cycle

      // Resolve reward service
      let rewardServiceId = salon.loyaltyRewardServiceId;
      let rewardServiceName = salon.loyaltyRewardServiceName || salon.loyaltyRewardDescription || 'Free Haircut';
      let rewardServicePrice = 0;

      if (rewardServiceId && salon.services) {
        const found = salon.services.find((s) => s.id === rewardServiceId);
        if (found) {
          rewardServiceName = found.name;
          rewardServicePrice = found.basePrice;
        }
      } else if (salon.services && salon.services.length > 0) {
        // Fallback to first active service if not explicitly set
        rewardServiceId = salon.services[0].id;
        rewardServiceName = salon.services[0].name;
        rewardServicePrice = salon.services[0].basePrice;
      } else {
        rewardServiceId = 'service_default';
        rewardServicePrice = 150;
      }

      const validityDays = salon.loyaltyVoucherValidityDays ?? 90;
      const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const cleanSlug = salon.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      const voucherCode = `REW_${cleanSlug}_${randomSuffix}`;

      unlockedVoucher = await loyaltyRepo.createVoucher({
        id: `vouch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        voucherCode,
        salonId: salon.id,
        customerPhone: cleanPhone,
        rewardServiceId: rewardServiceId || 'service_default',
        rewardServiceName,
        rewardServicePrice,
        status: 'ACTIVE',
        unlockedAt: now,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });

      // Dispatch celebratory WhatsApp notification
      try {
        jobQueue.enqueue(
          'SEND_WHATSAPP',
          {
            salonId: salon.id,
            salonName: salon.name,
            recipientPhone: cleanPhone,
            recipientName: customerName || 'Valued Customer',
            type: 'LOYALTY_REWARD_UNLOCKED',
            ticketId,
            rewardName: rewardServiceName,
            voucherCode,
            expiresAt: expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          },
          { salonId: salon.id }
        );
      } catch (err) {
        console.warn('[LoyaltyService.awardStamp] Notification dispatch warning:', err);
      }
    }

    const savedCard = await loyaltyRepo.upsertCard(card);

    return {
      stampAwarded: true,
      card: savedCard,
      voucherUnlocked: unlockedVoucher,
      message: unlockedVoucher
        ? `🎉 Milestone reached! Unlocked Free ${unlockedVoucher.rewardServiceName} voucher (${unlockedVoucher.voucherCode})`
        : `Stamp collected (${savedCard.currentStamps}/${goal} cuts)`,
    };
  }

  /**
   * Retrieves all multi-salon stamp cards and active reward vouchers for a consumer phone.
   */
  async getCustomerLoyaltyHub(phone: string) {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      return { success: false, cards: [], activeVouchers: [] };
    }

    const [cards, allVouchers] = await Promise.all([
      loyaltyRepo.getCardsByPhone(cleanPhone),
      loyaltyRepo.getVouchersByPhone(cleanPhone),
    ]);

    const activeVouchers = allVouchers.filter((v) => v.status === 'ACTIVE');

    // Fetch real-time salon settings for the specific salons the customer has cards for
    const uniqueSalonIds = Array.from(new Set(cards.map((c) => c.salonId)));
    const salonsList = await Promise.all(
      uniqueSalonIds.map((id) => salonRepo.getSalonById(id))
    );
    const salonMap = new Map<string, any>();
    for (const s of salonsList) {
      if (s) {
        salonMap.set(s.id, s);
        salonMap.set(s.slug, s);
      }
    }

    const enrichedCards = cards.map((c) => {
      const salon = salonMap.get(c.salonId);
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

      const salonVouchers = activeVouchers.filter((v) => v.salonId === c.salonId);

      return {
        ...c,
        salonName: salon?.name || 'Engine Que Salon',
        salonSlug: salon?.slug || 'salon',
        stampGoal: goal,
        rewardServiceName,
        rewardServicePrice,
        progressPercent: Math.min(100, Math.round((c.currentStamps / goal) * 100)),
        activeVouchers: salonVouchers,
      };
    });

    return {
      success: true,
      phone: cleanPhone,
      totalSalonsVisited: enrichedCards.length,
      cards: enrichedCards,
      activeVouchers,
    };
  }

  /**
   * Validates and applies a voucher to a ticket with atomic state transition.
   */
  async redeemVoucher(voucherCode: string, salonId: string, ticketId: string) {
    const voucher = await loyaltyRepo.getVoucherByCode(voucherCode, salonId);
    if (!voucher) {
      throw new Error(`Invalid or inactive reward voucher "${voucherCode}".`);
    }
    if (voucher.status !== 'ACTIVE') {
      throw new Error(`Reward voucher "${voucherCode}" has already been ${voucher.status.toLowerCase()}.`);
    }
    if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() < Date.now()) {
      throw new Error(`Reward voucher "${voucherCode}" expired on ${new Date(voucher.expiresAt).toLocaleDateString()}.`);
    }

    const redeemed = await loyaltyRepo.redeemVoucher(voucherCode, salonId, ticketId);
    if (!redeemed) {
      throw new Error('Failed to redeem voucher. It may have already been claimed.');
    }
    return redeemed;
  }
}

export const loyaltyService = new LoyaltyService();
