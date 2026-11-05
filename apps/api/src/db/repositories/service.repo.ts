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
};
