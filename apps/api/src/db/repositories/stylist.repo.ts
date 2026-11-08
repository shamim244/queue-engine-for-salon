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

  async getStylistServiceDurations(stylistId: string): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    if (isMySqlConnected) {
      const db = getDb();
      const [rows] = await db.query(
        'SELECT service_id, duration_minutes FROM stylist_service_durations WHERE stylist_id = ?',
        [stylistId]
      );
      if (Array.isArray(rows)) {
        for (const row of rows as any[]) {
          const duration = Number(row.duration_minutes);
          result[row.service_id] = duration;
          memoryStore.stylistServiceDurations.set(`${stylistId}:${row.service_id}`, duration);
        }
      }
      return result;
    }

    // In-memory fallback
    for (const [key, duration] of memoryStore.stylistServiceDurations.entries()) {
      if (key.startsWith(`${stylistId}:`)) {
        const serviceId = key.substring(stylistId.length + 1);
        result[serviceId] = duration;
      }
    }
    return result;
  },

  async saveStylistServiceDurations(
    salonId: string,
    stylistId: string,
    overrides: Record<string, number | null>
  ): Promise<boolean> {
    const entries = Object.entries(overrides);
    if (isMySqlConnected) {
      const db = getDb();
      for (const [serviceId, duration] of entries) {
        if (duration === null || duration === undefined || duration <= 0) {
          await db.query(
            'DELETE FROM stylist_service_durations WHERE stylist_id = ? AND service_id = ?',
            [stylistId, serviceId]
          );
          memoryStore.stylistServiceDurations.delete(`${stylistId}:${serviceId}`);
        } else {
          const id = `ssd-${stylistId}-${serviceId}`.slice(0, 36);
          const minutes = Math.round(duration);
          await db.query(
            `INSERT INTO stylist_service_durations (id, salon_id, stylist_id, service_id, duration_minutes)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE duration_minutes = VALUES(duration_minutes)`,
            [id, salonId, stylistId, serviceId, minutes]
          );
          memoryStore.stylistServiceDurations.set(`${stylistId}:${serviceId}`, minutes);
        }
      }
    } else {
      for (const [serviceId, duration] of entries) {
        if (duration === null || duration === undefined || duration <= 0) {
          memoryStore.stylistServiceDurations.delete(`${stylistId}:${serviceId}`);
        } else {
          memoryStore.stylistServiceDurations.set(`${stylistId}:${serviceId}`, Math.round(duration));
        }
      }
    }
    invalidateSalonCache(salonId);
    return true;
  },
};
