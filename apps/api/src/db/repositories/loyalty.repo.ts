import { isMySqlConnected, getDb } from '../mysql';
import type { LoyaltyCard, LoyaltyVoucher, CustomerGroomingProfile } from '../../engine/types';
import { memoryStore, toMySqlDatetime } from './store';

function normalizePhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.trim().replace(/[^0-9]/g, '');
  return cleaned.slice(-10);
}

function mapRowToCard(r: any): LoyaltyCard {
  return {
    id: r.id,
    salonId: r.salon_id,
    customerPhone: r.customer_phone,
    customerName: r.customer_name || null,
    currentStamps: Number(r.current_stamps || 0),
    totalLifetimeStamps: Number(r.total_lifetime_stamps || 0),
    completedMilestones: Number(r.completed_milestones || 0),
    lastStampAwardedAt: r.last_stamp_awarded_at || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapRowToVoucher(r: any): LoyaltyVoucher {
  return {
    id: r.id,
    voucherCode: r.voucher_code,
    salonId: r.salon_id,
    customerPhone: r.customer_phone,
    rewardServiceId: r.reward_service_id,
    rewardServiceName: r.reward_service_name,
    rewardServicePrice: Number(r.reward_service_price || 0),
    status: r.status,
    unlockedAt: r.unlocked_at,
    expiresAt: r.expires_at || null,
    redeemedAt: r.redeemed_at || null,
    redeemedTicketId: r.redeemed_ticket_id || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const loyaltyRepo = {
  async getCard(salonId: string, customerPhone: string): Promise<LoyaltyCard | null> {
    const cleanPhone = normalizePhone(customerPhone);
    if (!cleanPhone || !salonId) return null;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT * FROM loyalty_cards 
           WHERE salon_id = ? AND customer_phone = ? 
           LIMIT 1`,
          [salonId, cleanPhone]
        );
        if (rows && rows.length > 0) {
          const card = mapRowToCard(rows[0]);
          memoryStore.loyaltyCards.set(`${salonId}:${cleanPhone}`, card);
          return card;
        }
        return null;
      } catch (err: any) {
        console.warn(`[loyaltyRepo.getCard] MySQL error: ${err.message}`);
      }
    }

    return memoryStore.loyaltyCards.get(`${salonId}:${cleanPhone}`) || null;
  },

  async getCardsByPhone(customerPhone: string): Promise<LoyaltyCard[]> {
    const cleanPhone = normalizePhone(customerPhone);
    if (!cleanPhone) return [];

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT * FROM loyalty_cards 
           WHERE customer_phone = ?
           ORDER BY updated_at DESC`,
          [cleanPhone]
        );
        if (rows) {
          const cards = rows.map(mapRowToCard);
          for (const c of cards) {
            memoryStore.loyaltyCards.set(`${c.salonId}:${cleanPhone}`, c);
          }
          return cards;
        }
      } catch (err: any) {
        console.warn(`[loyaltyRepo.getCardsByPhone] MySQL error: ${err.message}`);
      }
    }

    const cards: LoyaltyCard[] = [];
    for (const card of memoryStore.loyaltyCards.values()) {
      if (normalizePhone(card.customerPhone) === cleanPhone) {
        cards.push(card);
      }
    }
    cards.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return cards;
  },

  async upsertCard(card: LoyaltyCard): Promise<LoyaltyCard> {
    const cleanPhone = normalizePhone(card.customerPhone);
    card.customerPhone = cleanPhone;
    const now = new Date();
    card.updatedAt = now;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO loyalty_cards (
            id, salon_id, customer_phone, customer_name, current_stamps,
            total_lifetime_stamps, completed_milestones, last_stamp_awarded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            customer_name = VALUES(customer_name),
            current_stamps = VALUES(current_stamps),
            total_lifetime_stamps = VALUES(total_lifetime_stamps),
            completed_milestones = VALUES(completed_milestones),
            last_stamp_awarded_at = VALUES(last_stamp_awarded_at),
            updated_at = NOW()`,
          [
            card.id,
            card.salonId,
            cleanPhone,
            card.customerName || null,
            card.currentStamps,
            card.totalLifetimeStamps,
            card.completedMilestones,
            card.lastStampAwardedAt ? toMySqlDatetime(new Date(card.lastStampAwardedAt)) : null,
          ]
        );
      } catch (err: any) {
        console.warn(`[loyaltyRepo.upsertCard] MySQL error: ${err.message}`);
      }
    }

    memoryStore.loyaltyCards.set(`${card.salonId}:${cleanPhone}`, card);
    return card;
  },

  async createVoucher(voucher: LoyaltyVoucher): Promise<LoyaltyVoucher> {
    const cleanPhone = normalizePhone(voucher.customerPhone);
    voucher.customerPhone = cleanPhone;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO loyalty_vouchers (
            id, voucher_code, salon_id, customer_phone, reward_service_id,
            reward_service_name, reward_service_price, status, unlocked_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            voucher.id,
            voucher.voucherCode,
            voucher.salonId,
            cleanPhone,
            voucher.rewardServiceId,
            voucher.rewardServiceName,
            voucher.rewardServicePrice,
            voucher.status,
            toMySqlDatetime(new Date(voucher.unlockedAt)),
            voucher.expiresAt ? toMySqlDatetime(new Date(voucher.expiresAt)) : null,
          ]
        );
      } catch (err: any) {
        console.warn(`[loyaltyRepo.createVoucher] MySQL error: ${err.message}`);
      }
    }

    memoryStore.loyaltyVouchers.set(voucher.id, voucher);
    return voucher;
  },

  async getVouchersByPhone(customerPhone: string, salonId?: string): Promise<LoyaltyVoucher[]> {
    const cleanPhone = normalizePhone(customerPhone);
    if (!cleanPhone) return [];

    if (isMySqlConnected) {
      try {
        const db = getDb();
        let query = `
          SELECT * FROM loyalty_vouchers 
          WHERE customer_phone = ?
        `;
        const params: any[] = [cleanPhone];
        if (salonId) {
          query += ' AND salon_id = ?';
          params.push(salonId);
        }
        query += ' ORDER BY unlocked_at DESC';

        const [rows] = await db.query<any[]>(query, params);
        if (rows) {
          const vouchers = rows.map(mapRowToVoucher);
          for (const v of vouchers) {
            memoryStore.loyaltyVouchers.set(v.id, v);
          }
          return vouchers;
        }
      } catch (err: any) {
        console.warn(`[loyaltyRepo.getVouchersByPhone] MySQL error: ${err.message}`);
      }
    }

    const result: LoyaltyVoucher[] = [];
    for (const v of memoryStore.loyaltyVouchers.values()) {
      if (normalizePhone(v.customerPhone) === cleanPhone) {
        if (!salonId || v.salonId === salonId) {
          result.push(v);
        }
      }
    }
    result.sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());
    return result;
  },

  async getVoucherByCode(voucherCode: string, salonId?: string): Promise<LoyaltyVoucher | null> {
    const cleanCode = voucherCode.trim().toUpperCase();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        let query = 'SELECT * FROM loyalty_vouchers WHERE voucher_code = ?';
        const params: any[] = [cleanCode];
        if (salonId) {
          query += ' AND salon_id = ?';
          params.push(salonId);
        }
        query += ' LIMIT 1';

        const [rows] = await db.query<any[]>(query, params);
        if (rows && rows.length > 0) {
          const v = mapRowToVoucher(rows[0]);
          memoryStore.loyaltyVouchers.set(v.id, v);
          return v;
        }
        return null;
      } catch (err: any) {
        console.warn(`[loyaltyRepo.getVoucherByCode] MySQL error: ${err.message}`);
      }
    }

    for (const v of memoryStore.loyaltyVouchers.values()) {
      if (v.voucherCode.toUpperCase() === cleanCode) {
        if (!salonId || v.salonId === salonId) {
          return v;
        }
      }
    }
    return null;
  },

  async redeemVoucher(voucherCode: string, salonId: string, ticketId: string): Promise<LoyaltyVoucher | null> {
    const cleanCode = voucherCode.trim().toUpperCase();
    const now = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [result]: any = await db.query(
          `UPDATE loyalty_vouchers 
           SET status = 'REDEEMED', redeemed_at = ?, redeemed_ticket_id = ? 
           WHERE voucher_code = ? AND salon_id = ? AND status = 'ACTIVE'`,
          [toMySqlDatetime(now), ticketId, cleanCode, salonId]
        );

        if (result && result.affectedRows > 0) {
          const [rows] = await db.query<any[]>(
            'SELECT * FROM loyalty_vouchers WHERE voucher_code = ? LIMIT 1',
            [cleanCode]
          );
          if (rows && rows.length > 0) {
            const updated = mapRowToVoucher(rows[0]);
            memoryStore.loyaltyVouchers.set(updated.id, updated);
            return updated;
          }
        }
        return null;
      } catch (err: any) {
        console.warn(`[loyaltyRepo.redeemVoucher] MySQL error: ${err.message}`);
      }
    }

    for (const v of memoryStore.loyaltyVouchers.values()) {
      if (v.voucherCode.toUpperCase() === cleanCode && v.salonId === salonId && v.status === 'ACTIVE') {
        v.status = 'REDEEMED';
        v.redeemedAt = now;
        v.redeemedTicketId = ticketId;
        v.updatedAt = now;
        return v;
      }
    }
    return null;
  },

  async getCustomerGroomingProfile(phone: string): Promise<CustomerGroomingProfile | null> {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return null;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT id, name, phone, grooming_specs, preferred_barber_id, preferred_barber_name, notes
           FROM customers
           WHERE phone LIKE ? OR phone LIKE ?
           LIMIT 1`,
          [`%${cleanPhone}`, `+91${cleanPhone}`]
        );
        if (rows && rows.length > 0) {
          const r = rows[0];
          const profile: CustomerGroomingProfile = {
            id: r.id,
            name: r.name,
            phone: r.phone,
            groomingSpecs: r.grooming_specs || null,
            preferredBarberId: r.preferred_barber_id || null,
            preferredBarberName: r.preferred_barber_name || null,
            notes: r.notes || null,
          };
          memoryStore.customerProfiles.set(cleanPhone, profile);
          return profile;
        }
      } catch (err: any) {
        console.warn(`[loyaltyRepo.getCustomerGroomingProfile] MySQL error: ${err.message}`);
      }
    }

    return memoryStore.customerProfiles.get(cleanPhone) || null;
  },

  async updateCustomerGroomingProfile(
    phoneOrData: string | ({ phone: string } & Partial<CustomerGroomingProfile>),
    updatesArg?: Partial<CustomerGroomingProfile>
  ): Promise<CustomerGroomingProfile | null> {
    const rawPhone = typeof phoneOrData === 'string' ? phoneOrData : phoneOrData.phone;
    const updates = typeof phoneOrData === 'string' ? (updatesArg || {}) : phoneOrData;
    const cleanPhone = normalizePhone(rawPhone);
    if (!cleanPhone) return null;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE customers 
           SET grooming_specs = COALESCE(?, grooming_specs),
               preferred_barber_id = COALESCE(?, preferred_barber_id),
               preferred_barber_name = COALESCE(?, preferred_barber_name),
               notes = COALESCE(?, notes)
           WHERE phone LIKE ? OR phone LIKE ?`,
          [
            updates.groomingSpecs !== undefined ? updates.groomingSpecs : null,
            updates.preferredBarberId !== undefined ? updates.preferredBarberId : null,
            updates.preferredBarberName !== undefined ? updates.preferredBarberName : null,
            updates.notes !== undefined ? updates.notes : null,
            `%${cleanPhone}`,
            `+91${cleanPhone}`,
          ]
        );
      } catch (err: any) {
        console.warn(`[loyaltyRepo.updateCustomerGroomingProfile] MySQL error: ${err.message}`);
      }
    }

    const existing = memoryStore.customerProfiles.get(cleanPhone) || {
      id: `cust_${cleanPhone}`,
      name: updates.name || 'Valued Customer',
      phone: cleanPhone,
    };

    const updated: CustomerGroomingProfile = {
      ...existing,
      ...updates,
      phone: cleanPhone,
    };
    memoryStore.customerProfiles.set(cleanPhone, updated);
    return updated;
  },

  async getSalonLoyaltyStats(salonId: string) {
    let totalCards = 0;
    let totalStamps = 0;
    let activeVouchers = 0;
    let redeemedVouchers = 0;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [cardStats]: any = await db.query(
          `SELECT COUNT(*) as total_cards, SUM(current_stamps) as total_stamps 
           FROM loyalty_cards WHERE salon_id = ?`,
          [salonId]
        );
        if (cardStats && cardStats.length > 0) {
          totalCards = Number(cardStats[0].total_cards || 0);
          totalStamps = Number(cardStats[0].total_stamps || 0);
        }

        const [voucherStats]: any = await db.query(
          `SELECT 
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_vouchers,
            SUM(CASE WHEN status = 'REDEEMED' THEN 1 ELSE 0 END) as redeemed_vouchers
           FROM loyalty_vouchers WHERE salon_id = ?`,
          [salonId]
        );
        if (voucherStats && voucherStats.length > 0) {
          activeVouchers = Number(voucherStats[0].active_vouchers || 0);
          redeemedVouchers = Number(voucherStats[0].redeemed_vouchers || 0);
        }

        return { totalCards, totalStamps, activeVouchers, redeemedVouchers };
      } catch (err: any) {
        console.warn(`[loyaltyRepo.getSalonLoyaltyStats] MySQL error: ${err.message}`);
      }
    }

    for (const card of memoryStore.loyaltyCards.values()) {
      if (card.salonId === salonId) {
        totalCards++;
        totalStamps += card.currentStamps;
      }
    }
    for (const v of memoryStore.loyaltyVouchers.values()) {
      if (v.salonId === salonId) {
        if (v.status === 'ACTIVE') activeVouchers++;
        if (v.status === 'REDEEMED') redeemedVouchers++;
      }
    }
    return { totalCards, totalStamps, activeVouchers, redeemedVouchers };
  },

  async getPlatformLoyaltyStats() {
    let totalCards = 0;
    let totalStamps = 0;
    let activeVouchers = 0;
    let redeemedVouchers = 0;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [cardStats]: any = await db.query(
          `SELECT COUNT(*) as total_cards, SUM(total_lifetime_stamps) as total_stamps 
           FROM loyalty_cards`
        );
        if (cardStats && cardStats.length > 0) {
          totalCards = Number(cardStats[0].total_cards || 0);
          totalStamps = Number(cardStats[0].total_stamps || 0);
        }

        const [voucherStats]: any = await db.query(
          `SELECT 
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_vouchers,
            SUM(CASE WHEN status = 'REDEEMED' THEN 1 ELSE 0 END) as redeemed_vouchers
           FROM loyalty_vouchers`
        );
        if (voucherStats && voucherStats.length > 0) {
          activeVouchers = Number(voucherStats[0].active_vouchers || 0);
          redeemedVouchers = Number(voucherStats[0].redeemed_vouchers || 0);
        }

        return { totalCards, totalStamps, activeVouchers, redeemedVouchers };
      } catch (err: any) {
        console.warn(`[loyaltyRepo.getPlatformLoyaltyStats] MySQL error: ${err.message}`);
      }
    }

    for (const card of memoryStore.loyaltyCards.values()) {
      totalCards++;
      totalStamps += card.totalLifetimeStamps;
    }
    for (const v of memoryStore.loyaltyVouchers.values()) {
      if (v.status === 'ACTIVE') activeVouchers++;
      if (v.status === 'REDEEMED') redeemedVouchers++;
    }
    return { totalCards, totalStamps, activeVouchers, redeemedVouchers };
  },
};
