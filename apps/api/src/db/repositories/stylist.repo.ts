import { isMySqlConnected, getDb } from '../mysql';
import type { Stylist } from '../../engine/types';
import { memoryStore, invalidateSalonCache } from './store';
import { organizationRepo } from './organization.repo';
import { salonRepo } from './salon.repo';

export const stylistRepo = {
  async addStylist(salonId: string, params: { name: string; phone?: string; avgDurationMinutes?: number }): Promise<Stylist> {
    const quota = await organizationRepo.checkSalonStylistQuota(salonId, () => salonRepo.getAllSalons());
    if (!quota.allowed) {
      throw new Error(`Stylist quota limit (${quota.max}) reached for tier ${quota.tier}. Please upgrade your organization tier.`);
    }

    const stylistId = 'stylist-' + Math.random().toString(36).substring(2, 9);
    const stylist: Stylist = {
      id: stylistId,
      salonId,
      name: params.name.trim(),
      phone: params.phone || '',
      isActive: true,
      historicalAvgDurationMinutes: params.avgDurationMinutes || 25,
    };

    memoryStore.stylists.set(stylistId, stylist);
    for (const s of memoryStore.salons.values()) {
      if (s.id === salonId) {
        s.stylists.push(stylist);
        break;
      }
    }

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO stylists (id, salon_id, name, phone, is_active, historical_avg_duration_minutes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [stylist.id, stylist.salonId, stylist.name, stylist.phone, stylist.isActive, stylist.historicalAvgDurationMinutes]
      );
    }
    invalidateSalonCache(salonId);
    return stylist;
  },

  async updateStylistPreference(
    stylistId: string,
    updates: { customAvgDurationMinutes?: number; isActive?: boolean }
  ): Promise<boolean> {
    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `UPDATE stylists 
         SET custom_avg_duration_minutes = COALESCE(?, custom_avg_duration_minutes),
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [
          updates.customAvgDurationMinutes !== undefined ? updates.customAvgDurationMinutes : null,
          updates.isActive !== undefined ? updates.isActive : null,
          stylistId,
        ]
      );
    }

    const stylist = memoryStore.stylists.get(stylistId);
    if (stylist) {
      if (updates.customAvgDurationMinutes !== undefined) {
        stylist.customAvgDurationMinutes = updates.customAvgDurationMinutes;
      }
      if (updates.isActive !== undefined) {
        stylist.isActive = updates.isActive;
      }
      if (stylist.salonId) {
        invalidateSalonCache(stylist.salonId);
      }
    } else {
      invalidateSalonCache();
    }
    return true;
  },
};
