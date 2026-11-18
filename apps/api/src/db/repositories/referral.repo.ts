import { isMySqlConnected, getDb } from '../mysql';
import type { ReferralAttribution, ReferralType, ReferralStatus } from '../../engine/types';
import { memoryStore, toMySqlDatetime } from './store';

function mapRowToAttribution(r: any): ReferralAttribution {
  return {
    id: r.id,
    referralType: r.referral_type,
    referrerCode: r.referrer_code,
    referrerOrgId: r.referrer_org_id || null,
    referrerOrgName: r.referrer_org_name || null,
    referrerOrgSlug: r.referrer_org_slug || null,
    referrerPhone: r.referrer_phone || null,
    referredOrgId: r.referred_org_id || null,
    referredOrgName: r.referred_org_name || null,
    referredOrgSlug: r.referred_org_slug || null,
    referredPhone: r.referred_phone || null,
    salonId: r.salon_id || null,
    rewardAmount: Number(r.reward_amount || 0),
    originalAmount: Number(r.original_amount || 0),
    subscriptionDiscount: Number(r.subscription_discount || 0),
    friendDiscount: Number(r.friend_discount || 0),
    netEligibleAmount: Number(r.net_eligible_amount || 0),
    rewardPercentage: Number(r.reward_percentage || 0),
    friendDiscountPercentage: Number(r.friend_discount_percentage || 0),
    calculationBasis: (r.calculation_basis as 'NET_PAID' | 'ORIGINAL_PRICE') || 'NET_PAID',
    status: r.status,
    conversionReferenceId: r.conversion_reference_id || null,
    convertedAt: r.converted_at || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface CreateAttributionPayload {
  referralType: ReferralType;
  referrerCode: string;
  referrerOrgId?: string | null;
  referrerPhone?: string | null;
  referredOrgId?: string | null;
  referredPhone?: string | null;
  salonId?: string | null;
  rewardAmount: number;
}

export interface ReferralStatsResult {
  totalReferred: number;
  convertedCount: number;
  pendingCount: number;
  totalEarned: number;
  totalFriendDiscounts: number;
  recentAttributions: ReferralAttribution[];
}

export const referralRepo = {
  async recordAttribution(payload: CreateAttributionPayload): Promise<ReferralAttribution> {
    const id = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const record: ReferralAttribution = {
      id,
      referralType: payload.referralType,
      referrerCode: payload.referrerCode.trim().toUpperCase(),
      referrerOrgId: payload.referrerOrgId || null,
      referrerPhone: payload.referrerPhone || null,
      referredOrgId: payload.referredOrgId || null,
      referredPhone: payload.referredPhone || null,
      salonId: payload.salonId || null,
      rewardAmount: payload.rewardAmount,
      status: 'PENDING',
      conversionReferenceId: null,
      convertedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO referral_attributions (
            id, referral_type, referrer_code, referrer_org_id, referrer_phone,
            referred_org_id, referred_phone, salon_id, reward_amount, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
          [
            record.id,
            record.referralType,
            record.referrerCode,
            record.referrerOrgId,
            record.referrerPhone,
            record.referredOrgId,
            record.referredPhone,
            record.salonId,
            record.rewardAmount,
          ]
        );
      } catch (err: any) {
        console.warn(`[referralRepo.recordAttribution] MySQL error: ${err.message}`);
      }
    }

    memoryStore.referralAttributions.set(record.id, record);
    return record;
  },

  async getPendingAttributionForOrg(referredOrgId: string): Promise<ReferralAttribution | null> {
    const cleanId = referredOrgId.trim();
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT * FROM referral_attributions 
           WHERE referral_type = 'B2B_OWNER' AND referred_org_id = ? AND status = 'PENDING'
           ORDER BY created_at DESC LIMIT 1`,
          [cleanId]
        );
        if (rows && rows.length > 0) {
          const attr = mapRowToAttribution(rows[0]);
          memoryStore.referralAttributions.set(attr.id, attr);
          return attr;
        }
        return null;
      } catch (err: any) {
        console.warn(`[referralRepo.getPendingAttributionForOrg] MySQL error: ${err.message}`);
      }
    }

    for (const attr of memoryStore.referralAttributions.values()) {
      if (
        attr.referralType === 'B2B_OWNER' &&
        attr.referredOrgId === cleanId &&
        attr.status === 'PENDING'
      ) {
        return attr;
      }
    }
    return null;
  },

  async getConvertedReferralCountForOrg(referredOrgId: string): Promise<number> {
    const cleanId = referredOrgId.trim();
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT COUNT(*) as cnt FROM referral_attributions 
           WHERE referral_type = 'B2B_OWNER' AND referred_org_id = ? AND status = 'CONVERTED'`,
          [cleanId]
        );
        if (rows && rows.length > 0) return Number(rows[0].cnt || 0);
      } catch (err: any) {
        console.warn(`[referralRepo.getConvertedReferralCountForOrg] MySQL error: ${err.message}`);
      }
    }

    let count = 0;
    for (const attr of memoryStore.referralAttributions.values()) {
      if (
        attr.referralType === 'B2B_OWNER' &&
        attr.referredOrgId === cleanId &&
        attr.status === 'CONVERTED'
      ) {
        count++;
      }
    }
    return count;
  },

  async hasPriorPaidSubscription(orgId: string): Promise<boolean> {
    const cleanId = orgId.trim();
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [subRows] = await db.query<any[]>(
          `SELECT id FROM organization_subscriptions 
           WHERE organization_id = ? AND (net_amount_paid > 0 OR base_price > 0)
           LIMIT 1`,
          [cleanId]
        );
        if (subRows && subRows.length > 0) return true;

        const [orderRows] = await db.query<any[]>(
          `SELECT id FROM payment_orders 
           WHERE organization_id = ? AND target_type = 'SUBSCRIPTION' AND status = 'COMPLETED' AND amount > 0
           LIMIT 1`,
          [cleanId]
        );
        if (orderRows && orderRows.length > 0) return true;
      } catch (err: any) {
        console.warn(`[referralRepo.hasPriorPaidSubscription] MySQL error: ${err.message}`);
      }
    }

    for (const sub of memoryStore.organizationSubscriptions.values()) {
      if (sub.organizationId === cleanId && (sub.netAmountPaid > 0 || sub.basePrice > 0)) {
        return true;
      }
    }
    for (const ord of memoryStore.paymentOrders.values()) {
      if (
        ord.organizationId === cleanId &&
        ord.targetType === 'SUBSCRIPTION' &&
        ord.status === 'COMPLETED' &&
        ord.amount > 0
      ) {
        return true;
      }
    }
    return false;
  },

  async getPendingAttributionForConsumer(
    referredPhone: string,
    salonId: string
  ): Promise<ReferralAttribution | null> {
    const cleanPhone = referredPhone.trim();
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT * FROM referral_attributions 
           WHERE referral_type = 'B2C_CONSUMER' AND referred_phone = ? AND salon_id = ? AND status = 'PENDING'
           ORDER BY created_at DESC LIMIT 1`,
          [cleanPhone, salonId]
        );
        if (rows && rows.length > 0) {
          const attr = mapRowToAttribution(rows[0]);
          memoryStore.referralAttributions.set(attr.id, attr);
          return attr;
        }
        return null;
      } catch (err: any) {
        console.warn(`[referralRepo.getPendingAttributionForConsumer] MySQL error: ${err.message}`);
      }
    }

    for (const attr of memoryStore.referralAttributions.values()) {
      if (
        attr.referralType === 'B2C_CONSUMER' &&
        attr.referredPhone === cleanPhone &&
        attr.salonId === salonId &&
        attr.status === 'PENDING'
      ) {
        return attr;
      }
    }
    return null;
  },

  async markConverted(
    attributionId: string,
    conversionReferenceId: string,
    rewardAmount?: number | null,
    breakdown?: {
      originalAmount?: number;
      subscriptionDiscount?: number;
      friendDiscount?: number;
      netEligibleAmount?: number;
      rewardPercentage?: number;
      friendDiscountPercentage?: number;
      calculationBasis?: 'NET_PAID' | 'ORIGINAL_PRICE';
    }
  ): Promise<ReferralAttribution | null> {
    const now = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [result]: any = await db.query(
          `UPDATE referral_attributions 
           SET status = 'CONVERTED', 
               conversion_reference_id = ?, 
               reward_amount = COALESCE(?, reward_amount), 
               original_amount = COALESCE(?, original_amount),
               subscription_discount = COALESCE(?, subscription_discount),
               friend_discount = COALESCE(?, friend_discount),
               net_eligible_amount = COALESCE(?, net_eligible_amount),
               reward_percentage = COALESCE(?, reward_percentage),
               friend_discount_percentage = COALESCE(?, friend_discount_percentage),
               calculation_basis = COALESCE(?, calculation_basis),
               converted_at = ?, 
               updated_at = ?
           WHERE id = ? AND status = 'PENDING'`,
          [
            conversionReferenceId,
            rewardAmount ?? null,
            breakdown?.originalAmount ?? null,
            breakdown?.subscriptionDiscount ?? null,
            breakdown?.friendDiscount ?? null,
            breakdown?.netEligibleAmount ?? null,
            breakdown?.rewardPercentage ?? null,
            breakdown?.friendDiscountPercentage ?? null,
            breakdown?.calculationBasis ?? null,
            toMySqlDatetime(now),
            toMySqlDatetime(now),
            attributionId,
          ]
        );

        if (result && result.affectedRows === 0) {
          return null;
        }

        const [rows] = await db.query<any[]>(
          `SELECT ra.*, o.name AS referred_org_name, o.slug AS referred_org_slug,
                  ro.name AS referrer_org_name, ro.slug AS referrer_org_slug
           FROM referral_attributions ra
           LEFT JOIN organizations o ON ra.referred_org_id = o.id
           LEFT JOIN organizations ro ON ra.referrer_org_id = ro.id
           WHERE ra.id = ? LIMIT 1`,
          [attributionId]
        );
        if (rows && rows.length > 0) {
          const updated = mapRowToAttribution(rows[0]);
          memoryStore.referralAttributions.set(updated.id, updated);
          return updated;
        }
      } catch (err: any) {
        console.warn(`[referralRepo.markConverted] MySQL error: ${err.message}`);
      }
    }

    const existing = memoryStore.referralAttributions.get(attributionId);
    if (!existing || existing.status !== 'PENDING') return null;

    const updated: ReferralAttribution = {
      ...existing,
      status: 'CONVERTED',
      rewardAmount: rewardAmount !== undefined && rewardAmount !== null ? rewardAmount : existing.rewardAmount,
      originalAmount: breakdown?.originalAmount ?? existing.originalAmount ?? 0,
      subscriptionDiscount: breakdown?.subscriptionDiscount ?? existing.subscriptionDiscount ?? 0,
      friendDiscount: breakdown?.friendDiscount ?? existing.friendDiscount ?? 0,
      netEligibleAmount: breakdown?.netEligibleAmount ?? existing.netEligibleAmount ?? 0,
      rewardPercentage: breakdown?.rewardPercentage ?? existing.rewardPercentage ?? 0,
      friendDiscountPercentage: breakdown?.friendDiscountPercentage ?? existing.friendDiscountPercentage ?? 0,
      calculationBasis: breakdown?.calculationBasis ?? existing.calculationBasis ?? 'NET_PAID',
      conversionReferenceId,
      convertedAt: now,
      updatedAt: now,
    };
    memoryStore.referralAttributions.set(updated.id, updated);
    return updated;
  },

  async rollbackToPending(attributionId: string): Promise<boolean> {
    const now = new Date();
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE referral_attributions 
           SET status = 'PENDING', conversion_reference_id = NULL, converted_at = NULL, updated_at = ?
           WHERE id = ?`,
          [toMySqlDatetime(now), attributionId]
        );
      } catch (err: any) {
        console.warn(`[referralRepo.rollbackToPending] MySQL error: ${err.message}`);
      }
    }

    const existing = memoryStore.referralAttributions.get(attributionId);
    if (existing) {
      existing.status = 'PENDING';
      existing.conversionReferenceId = null;
      existing.convertedAt = null;
      existing.updatedAt = now;
      return true;
    }
    return false;
  },

  async getReferralStats(params: {
    referrerOrgId?: string | null;
    referrerPhone?: string | null;
    salonId?: string | null;
  }): Promise<ReferralStatsResult> {
    const { referrerOrgId, referrerPhone, salonId } = params;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        let query = `
          SELECT ra.*, o.name AS referred_org_name, o.slug AS referred_org_slug,
                 ro.name AS referrer_org_name, ro.slug AS referrer_org_slug
          FROM referral_attributions ra
          LEFT JOIN organizations o ON ra.referred_org_id = o.id
          LEFT JOIN organizations ro ON ra.referrer_org_id = ro.id
          WHERE 1=1
        `;
        const queryParams: any[] = [];

        if (referrerOrgId) {
          query += ' AND ra.referrer_org_id = ?';
          queryParams.push(referrerOrgId);
        }
        if (referrerPhone) {
          query += ' AND ra.referrer_phone = ?';
          queryParams.push(referrerPhone);
        }
        if (salonId) {
          query += ' AND ra.salon_id = ?';
          queryParams.push(salonId);
        }

        query += ' ORDER BY ra.created_at DESC';

        const [rows] = await db.query<any[]>(query, queryParams);
        const all = (rows || []).map(mapRowToAttribution);

        let convertedCount = 0;
        let pendingCount = 0;
        let totalEarned = 0;
        let totalFriendDiscounts = 0;

        for (const item of all) {
          if (item.status === 'CONVERTED') {
            convertedCount++;
            totalEarned += item.rewardAmount;
            totalFriendDiscounts += (item.friendDiscount || 0);
          } else if (item.status === 'PENDING') {
            pendingCount++;
          }
        }

        return {
          totalReferred: all.length,
          convertedCount,
          pendingCount,
          totalEarned,
          totalFriendDiscounts,
          recentAttributions: all.slice(0, 50),
        };
      } catch (err: any) {
        console.warn(`[referralRepo.getReferralStats] MySQL error: ${err.message}`);
      }
    }

    // In-memory fallback
    const all: ReferralAttribution[] = [];
    for (const attr of memoryStore.referralAttributions.values()) {
      if (referrerOrgId && attr.referrerOrgId !== referrerOrgId) continue;
      if (referrerPhone && attr.referrerPhone !== referrerPhone) continue;
      if (salonId && attr.salonId !== salonId) continue;
      const enriched = { ...attr };
      if (attr.referredOrgId) {
        const org = memoryStore.organizations?.get(attr.referredOrgId);
        if (org) {
          enriched.referredOrgName = org.name;
          enriched.referredOrgSlug = org.slug;
        }
      }
      if (attr.referrerOrgId) {
        const rorg = memoryStore.organizations?.get(attr.referrerOrgId);
        if (rorg) {
          enriched.referrerOrgName = rorg.name;
          enriched.referrerOrgSlug = rorg.slug;
        }
      }
      all.push(enriched);
    }

    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let convertedCount = 0;
    let pendingCount = 0;
    let totalEarned = 0;
    let totalFriendDiscounts = 0;

    for (const item of all) {
      if (item.status === 'CONVERTED') {
        convertedCount++;
        totalEarned += item.rewardAmount;
        totalFriendDiscounts += (item.friendDiscount || 0);
      } else if (item.status === 'PENDING') {
        pendingCount++;
      }
    }

    return {
      totalReferred: all.length,
      convertedCount,
      pendingCount,
      totalEarned,
      totalFriendDiscounts,
      recentAttributions: all.slice(0, 50),
    };
  },
};
