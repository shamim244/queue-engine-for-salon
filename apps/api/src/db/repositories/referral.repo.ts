import { isMySqlConnected, getDb } from '../mysql';
import type { ReferralAttribution, ReferralType, ReferralStatus } from '../../engine/types';
import { memoryStore, toMySqlDatetime } from './store';

function mapRowToAttribution(r: any): ReferralAttribution {
  return {
    id: r.id,
    referralType: r.referral_type,
    referrerCode: r.referrer_code,
    referrerOrgId: r.referrer_org_id || null,
    referrerPhone: r.referrer_phone || null,
    referredOrgId: r.referred_org_id || null,
    referredPhone: r.referred_phone || null,
    salonId: r.salon_id || null,
    rewardAmount: Number(r.reward_amount),
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
    conversionReferenceId: string
  ): Promise<ReferralAttribution | null> {
    const now = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE referral_attributions 
           SET status = 'CONVERTED', conversion_reference_id = ?, converted_at = ?, updated_at = ?
           WHERE id = ?`,
          [conversionReferenceId, toMySqlDatetime(now), toMySqlDatetime(now), attributionId]
        );

        const [rows] = await db.query<any[]>(
          'SELECT * FROM referral_attributions WHERE id = ? LIMIT 1',
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
    if (!existing) return null;

    const updated: ReferralAttribution = {
      ...existing,
      status: 'CONVERTED',
      conversionReferenceId,
      convertedAt: now,
      updatedAt: now,
    };
    memoryStore.referralAttributions.set(updated.id, updated);
    return updated;
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
        let query = 'SELECT * FROM referral_attributions WHERE 1=1';
        const queryParams: any[] = [];

        if (referrerOrgId) {
          query += ' AND referrer_org_id = ?';
          queryParams.push(referrerOrgId);
        }
        if (referrerPhone) {
          query += ' AND referrer_phone = ?';
          queryParams.push(referrerPhone);
        }
        if (salonId) {
          query += ' AND salon_id = ?';
          queryParams.push(salonId);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await db.query<any[]>(query, queryParams);
        const all = (rows || []).map(mapRowToAttribution);

        let convertedCount = 0;
        let pendingCount = 0;
        let totalEarned = 0;

        for (const item of all) {
          if (item.status === 'CONVERTED') {
            convertedCount++;
            totalEarned += item.rewardAmount;
          } else if (item.status === 'PENDING') {
            pendingCount++;
          }
        }

        return {
          totalReferred: all.length,
          convertedCount,
          pendingCount,
          totalEarned,
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
      all.push(attr);
    }

    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let convertedCount = 0;
    let pendingCount = 0;
    let totalEarned = 0;

    for (const item of all) {
      if (item.status === 'CONVERTED') {
        convertedCount++;
        totalEarned += item.rewardAmount;
      } else if (item.status === 'PENDING') {
        pendingCount++;
      }
    }

    return {
      totalReferred: all.length,
      convertedCount,
      pendingCount,
      totalEarned,
      recentAttributions: all.slice(0, 50),
    };
  },
};
