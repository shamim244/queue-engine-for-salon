import { isMySqlConnected, getDb } from '../mysql';
import type {
  Coupon,
  CouponRedemption,
  CouponTargetType,
  CouponStatus,
  CreateCouponPayload,
} from '../../engine/types';
import { memoryStore, toMySqlDatetime } from './store';
import { uniquenessService } from '../../security/uniqueness.service';

function mapRowToCoupon(r: any): Coupon {
  return {
    id: r.id,
    code: r.code,
    targetType: r.target_type,
    organizationId: r.organization_id || null,
    salonId: r.salon_id || null,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    maxDiscountAmount:
      r.max_discount_amount !== null && r.max_discount_amount !== undefined
        ? Number(r.max_discount_amount)
        : null,
    minOrderAmount: Number(r.min_order_amount ?? 0),
    maxUses: r.max_uses !== null && r.max_uses !== undefined ? Number(r.max_uses) : null,
    usedCount: Number(r.used_count ?? 0),
    maxUsesPerUser: Number(r.max_uses_per_user ?? 1),
    isFirstTimeOnly: Boolean(r.is_first_time_only),
    validFrom: r.valid_from,
    validUntil: r.valid_until || null,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapRowToRedemption(r: any): CouponRedemption {
  return {
    id: r.id,
    couponId: r.coupon_id,
    targetType: r.target_type,
    targetOrderId: r.target_order_id,
    userId: r.user_id || null,
    discountApplied: Number(r.discount_applied),
    redeemedAt: r.redeemed_at,
  };
}

export const couponRepo = {
  async createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
    const code = payload.code.trim().toUpperCase();

    // Check code uniqueness across all ecosystem namespaces
    const uniqueness = await uniquenessService.checkReferralCode(code);
    if (!uniqueness.available) {
      throw new Error(uniqueness.reason || `Coupon with code "${code}" cannot be used due to collision.`);
    }

    const existing = await this.getCouponByCode(code);
    if (existing) {
      throw new Error(`Coupon with code "${code}" already exists.`);
    }

    const id = (payload as any).id || `cp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const coupon: Coupon = {
      id,
      code,
      targetType: payload.targetType,
      organizationId: payload.organizationId || null,
      salonId: payload.salonId || null,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      maxDiscountAmount: payload.maxDiscountAmount ?? null,
      minOrderAmount: payload.minOrderAmount ?? 0,
      maxUses: payload.maxUses ?? null,
      usedCount: 0,
      maxUsesPerUser: payload.maxUsesPerUser ?? 1,
      isFirstTimeOnly: Boolean(payload.isFirstTimeOnly),
      validFrom: payload.validFrom ? new Date(payload.validFrom) : now,
      validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
      status: payload.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    memoryStore.coupons.set(coupon.id, coupon);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO coupons (
            id, code, target_type, organization_id, salon_id,
            discount_type, discount_value, max_discount_amount, min_order_amount,
            max_uses, used_count, max_uses_per_user, is_first_time_only, valid_from, valid_until, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            coupon.id,
            coupon.code,
            coupon.targetType,
            coupon.organizationId,
            coupon.salonId,
            coupon.discountType,
            coupon.discountValue,
            coupon.maxDiscountAmount,
            coupon.minOrderAmount,
            coupon.maxUses,
            coupon.usedCount,
            coupon.maxUsesPerUser,
            coupon.isFirstTimeOnly ? 1 : 0,
            toMySqlDatetime(coupon.validFrom),
            toMySqlDatetime(coupon.validUntil),
            coupon.status,
          ]
        );
      } catch (err: any) {
        console.warn(`[couponRepo.createCoupon] MySQL error: ${err.message}`);
      }
    }

    return coupon;
  },

  async getCouponByCode(code: string): Promise<Coupon | null> {
    const normalized = code.trim().toUpperCase();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          'SELECT * FROM coupons WHERE UPPER(code) = ? LIMIT 1',
          [normalized]
        );
        if (rows && rows.length > 0) {
          const coupon = mapRowToCoupon(rows[0]);
          memoryStore.coupons.set(coupon.id, coupon);
          return coupon;
        }
      } catch (err: any) {
        console.warn(`[couponRepo.getCouponByCode] MySQL error: ${err.message}`);
      }
    }

    for (const c of memoryStore.coupons.values()) {
      if (c.code.toUpperCase() === normalized) {
        return c;
      }
    }
    return null;
  },

  async getCouponById(id: string): Promise<Coupon | null> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>('SELECT * FROM coupons WHERE id = ?', [id]);
        if (rows && rows.length > 0) {
          const coupon = mapRowToCoupon(rows[0]);
          memoryStore.coupons.set(coupon.id, coupon);
          return coupon;
        }
      } catch (err: any) {
        console.warn(`[couponRepo.getCouponById] MySQL error: ${err.message}`);
      }
    }

    return memoryStore.coupons.get(id) || null;
  },

  async getAllCoupons(filter?: {
    targetType?: CouponTargetType;
    salonId?: string;
    organizationId?: string;
    status?: CouponStatus;
  }): Promise<Coupon[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const conditions: string[] = [];
        const params: any[] = [];

        if (filter?.targetType) {
          conditions.push('target_type = ?');
          params.push(filter.targetType);
        }
        if (filter?.salonId) {
          conditions.push('(salon_id = ? OR salon_id IS NULL)');
          params.push(filter.salonId);
        }
        if (filter?.organizationId) {
          conditions.push('(organization_id = ? OR organization_id IS NULL)');
          params.push(filter.organizationId);
        }
        if (filter?.status) {
          conditions.push('status = ?');
          params.push(filter.status);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const [rows] = await db.query<any[]>(
          `SELECT * FROM coupons ${whereClause} ORDER BY created_at DESC`,
          params
        );

        if (rows) {
          return rows.map((r) => mapRowToCoupon(r));
        }
      } catch (err: any) {
        console.warn(`[couponRepo.getAllCoupons] MySQL fallback: ${err.message}`);
      }
    }

    let list = Array.from(memoryStore.coupons.values());
    if (filter?.targetType) {
      list = list.filter((c) => c.targetType === filter.targetType);
    }
    if (filter?.salonId) {
      list = list.filter((c) => !c.salonId || c.salonId === filter.salonId);
    }
    if (filter?.organizationId) {
      list = list.filter((c) => !c.organizationId || c.organizationId === filter.organizationId);
    }
    if (filter?.status) {
      list = list.filter((c) => c.status === filter.status);
    }
    return list;
  },

  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    const existing = await this.getCouponById(id);
    if (!existing) return null;

    const updated: Coupon = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    memoryStore.coupons.set(id, updated);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE coupons SET
            status = ?, discount_type = ?, discount_value = ?, max_discount_amount = ?,
            min_order_amount = ?, max_uses = ?, max_uses_per_user = ?, is_first_time_only = ?,
            valid_from = ?, valid_until = ?, updated_at = NOW()
           WHERE id = ?`,
          [
            updated.status,
            updated.discountType,
            updated.discountValue,
            updated.maxDiscountAmount,
            updated.minOrderAmount,
            updated.maxUses,
            updated.maxUsesPerUser,
            updated.isFirstTimeOnly ? 1 : 0,
            toMySqlDatetime(updated.validFrom),
            toMySqlDatetime(updated.validUntil),
            id,
          ]
        );
      } catch (err: any) {
        console.warn(`[couponRepo.updateCoupon] MySQL error: ${err.message}`);
      }
    }

    return updated;
  },

  async deleteCoupon(id: string): Promise<boolean> {
    memoryStore.coupons.delete(id);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('DELETE FROM coupons WHERE id = ?', [id]);
        return true;
      } catch (err: any) {
        console.warn(`[couponRepo.deleteCoupon] MySQL error: ${err.message}`);
      }
    }

    return true;
  },

  async recordRedemption(redemption: {
    couponId: string;
    targetType: CouponTargetType;
    targetOrderId: string;
    userId?: string | null;
    discountApplied: number;
  }): Promise<CouponRedemption> {
    const id = `red_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    // Handle Partner / B2B Referral Coupon redemptions
    if (redemption.couponId.startsWith('partner_') || redemption.couponId.startsWith('b2b_')) {
      const record: CouponRedemption = {
        id,
        couponId: redemption.couponId,
        targetType: redemption.targetType,
        targetOrderId: redemption.targetOrderId,
        userId: redemption.userId || null,
        discountApplied: redemption.discountApplied,
        redeemedAt: now,
      };

      memoryStore.couponRedemptions.set(id, record);

      if (isMySqlConnected) {
        try {
          const db = getDb();
          await db.query(
            `INSERT INTO coupon_redemptions (id, coupon_id, target_type, target_order_id, user_id, discount_applied)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              record.id,
              record.couponId,
              record.targetType,
              record.targetOrderId,
              record.userId,
              record.discountApplied,
            ]
          );
        } catch (err: any) {
          console.warn(`[couponRepo.recordRedemption] Partner/B2B redemption log note: ${err.message}`);
        }
      }

      return record;
    }

    const coupon = memoryStore.coupons.get(redemption.couponId);
    if (!coupon) {
      throw new Error(`Coupon not found: ${redemption.couponId}`);
    }

    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new Error(`Coupon usage limit reached (max: ${coupon.maxUses})`);
    }

    if (coupon.maxUsesPerUser != null) {
      if (!redemption.userId) {
        throw new Error('User identifier is required for coupons with per-user limits');
      }
      let userCount = 0;
      for (const r of memoryStore.couponRedemptions.values()) {
        if (r.couponId === redemption.couponId && r.userId === redemption.userId) {
          userCount++;
        }
      }
      if (userCount >= coupon.maxUsesPerUser) {
        throw new Error(`You have already redeemed this coupon the maximum allowed times (${coupon.maxUsesPerUser})`);
      }
    }

    // Atomically reserve use count synchronously before any await
    coupon.usedCount += 1;

    const record: CouponRedemption = {
      id,
      couponId: redemption.couponId,
      targetType: redemption.targetType,
      targetOrderId: redemption.targetOrderId,
      userId: redemption.userId || null,
      discountApplied: redemption.discountApplied,
      redeemedAt: now,
    };

    memoryStore.couponRedemptions.set(id, record);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO coupon_redemptions (id, coupon_id, target_type, target_order_id, user_id, discount_applied)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            record.id,
            record.couponId,
            record.targetType,
            record.targetOrderId,
            record.userId,
            record.discountApplied,
          ]
        );

        await db.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [
          redemption.couponId,
        ]);
      } catch (err: any) {
        console.warn(`[couponRepo.recordRedemption] MySQL error: ${err.message}`);
      }
    }

    return record;
  },

  async getUserRedemptionCount(couponId: string, userId: string): Promise<number> {
    if (!userId) return 0;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          'SELECT COUNT(*) as cnt FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?',
          [couponId, userId]
        );
        if (rows && rows[0]) {
          return Number(rows[0].cnt || 0);
        }
      } catch (err: any) {
        console.warn(`[couponRepo.getUserRedemptionCount] MySQL error: ${err.message}`);
      }
    }

    let count = 0;
    for (const r of memoryStore.couponRedemptions.values()) {
      if (r.couponId === couponId && r.userId === userId) {
        count++;
      }
    }
    return count;
  },

  async getCustomerCompletedVisitsCount(salonId: string, phone: string): Promise<number> {
    if (!salonId || !phone) return 0;
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const last10 = cleanDigits.slice(-10);
    if (!last10) return 0;

    let count = 0;
    if (isMySqlConnected) {
      try {
        const db = getDb();
        // 1. Check completed queue tickets
        const [ticketRows] = await db.query<any[]>(
          `SELECT COUNT(*) as cnt FROM queue_tickets
           WHERE salon_id = ?
             AND (customer_phone LIKE ? OR customer_phone = ?)
             AND status IN ('COMPLETED', 'IN_CHAIR')`,
          [salonId, `%${last10}`, phone]
        );
        if (ticketRows && ticketRows[0]) {
          count += Number(ticketRows[0].cnt || 0);
        }

        // 2. Check completed appointments
        const [appRows] = await db.query<any[]>(
          `SELECT COUNT(*) as cnt FROM appointments
           WHERE salon_id = ?
             AND (customer_phone LIKE ? OR customer_phone = ?)
             AND status = 'COMPLETED'`,
          [salonId, `%${last10}`, phone]
        );
        if (appRows && appRows[0]) {
          count += Number(appRows[0].cnt || 0);
        }
        return count;
      } catch (err: any) {
        console.warn(`[couponRepo.getCustomerCompletedVisitsCount] MySQL error: ${err.message}`);
      }
    }

    // In-memory fallback
    if (memoryStore.tickets) {
      for (const t of memoryStore.tickets.values()) {
        if (
          t.salonId === salonId &&
          t.customerPhone &&
          t.customerPhone.replace(/[^0-9]/g, '').endsWith(last10) &&
          (t.status === 'COMPLETED' || t.status === 'IN_CHAIR')
        ) {
          count++;
        }
      }
    }
    if (memoryStore.appointments) {
      for (const a of memoryStore.appointments.values()) {
        if (
          a.salonId === salonId &&
          a.customerPhone &&
          a.customerPhone.replace(/[^0-9]/g, '').endsWith(last10) &&
          a.status === 'COMPLETED'
        ) {
          count++;
        }
      }
    }
    return count;
  },
};
