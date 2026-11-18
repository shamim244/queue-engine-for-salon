import { isMySqlConnected, getDb } from '../mysql';
import type { ServiceDefinition } from '../../engine/types';
import { memoryStore, invalidateSalonCache } from './store';

export const serviceRepo = {
  async addService(service: ServiceDefinition): Promise<ServiceDefinition> {
    memoryStore.services.set(service.id, service);
    for (const salon of memoryStore.salons.values()) {
      if (salon.id === service.salonId) {
        salon.services.push(service);
        break;
      }
    }

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO services (id, salon_id, name, base_price, estimated_duration_minutes, pricing_type, is_add_on, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          service.id,
          service.salonId,
          service.name,
          service.basePrice,
          service.estimatedDurationMinutes,
          service.pricingType || 'FIXED',
          service.isAddOn ? 1 : 0,
          service.icon || '✂️',
        ]
      );
    }
    invalidateSalonCache(service.salonId);
    return service;
  },

  async deleteService(serviceId: string): Promise<boolean> {
    const srv = memoryStore.services.get(serviceId);
    const targetSalonId = srv?.salonId;

    memoryStore.services.delete(serviceId);
    for (const salon of memoryStore.salons.values()) {
      salon.services = salon.services.filter((s) => s.id !== serviceId);
    }

    if (isMySqlConnected) {
      const db = getDb();
      await db.query('DELETE FROM services WHERE id = ?', [serviceId]);
    }

    if (targetSalonId) {
      invalidateSalonCache(targetSalonId);
    } else {
      invalidateSalonCache();
    }
    return true;
  },

  async updateService(
    serviceId: string,
    updates: Partial<Omit<ServiceDefinition, 'id' | 'salonId'>>
  ): Promise<boolean> {
    const srv = memoryStore.services.get(serviceId);
    let targetSalonId = srv?.salonId;

    if (srv) {
      if (updates.name !== undefined) srv.name = updates.name;
      if (updates.basePrice !== undefined) srv.basePrice = updates.basePrice;
      if (updates.estimatedDurationMinutes !== undefined) srv.estimatedDurationMinutes = updates.estimatedDurationMinutes;
      if (updates.pricingType !== undefined) srv.pricingType = updates.pricingType;
      if (updates.isAddOn !== undefined) srv.isAddOn = updates.isAddOn;
      if (updates.icon !== undefined) srv.icon = updates.icon;
    }

    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT salon_id FROM services WHERE id = ? LIMIT 1', [serviceId]);
      if (rows && rows.length > 0) {
        targetSalonId = rows[0].salon_id;
      }

      await db.query(
        `UPDATE services
         SET name = COALESCE(?, name),
             base_price = COALESCE(?, base_price),
             estimated_duration_minutes = COALESCE(?, estimated_duration_minutes),
             pricing_type = COALESCE(?, pricing_type),
             is_add_on = COALESCE(?, is_add_on),
             icon = COALESCE(?, icon)
         WHERE id = ?`,
        [
          updates.name !== undefined ? updates.name : null,
          updates.basePrice !== undefined ? updates.basePrice : null,
          updates.estimatedDurationMinutes !== undefined ? updates.estimatedDurationMinutes : null,
          updates.pricingType !== undefined ? updates.pricingType : null,
          updates.isAddOn !== undefined ? (updates.isAddOn ? 1 : 0) : null,
          updates.icon !== undefined ? updates.icon : null,
          serviceId,
        ]
      );
    }

    if (targetSalonId) {
      invalidateSalonCache(targetSalonId);
    } else {
      invalidateSalonCache();
    }
    return true;
  },
};
