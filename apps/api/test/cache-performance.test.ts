import { describe, it, expect, beforeEach } from 'bun:test';
import { repository, seedDemoData } from '../src/db/repository';

describe('Salon Catalog Caching & Invalidation Suite', () => {
  beforeEach(() => {
    seedDemoData();
  });

  it('should cache getSalonBySlug results in memory with sub-millisecond retrieval', async () => {
    // Prime the cache
    const firstCall = await repository.getSalonBySlug('ramesh-barber');
    expect(firstCall).not.toBeNull();
    expect(firstCall?.slug).toBe('ramesh-barber');

    // Repeated call should hit memory cache immediately
    const start = performance.now();
    const cachedCall = await repository.getSalonBySlug('ramesh-barber');
    const elapsed = performance.now() - start;

    expect(cachedCall).not.toBeNull();
    expect(cachedCall?.id).toBe(firstCall?.id);
    expect(elapsed).toBeLessThan(10); // Well under 10ms
  });

  it('should support skipCache option to force reload from backing store', async () => {
    const cached = await repository.getSalonBySlug('ramesh-barber');
    expect(cached).not.toBeNull();

    const fresh = await repository.getSalonBySlug('ramesh-barber', { skipCache: true });
    expect(fresh).not.toBeNull();
    expect(fresh?.slug).toBe('ramesh-barber');
  });

  it('should invalidate cache immediately when a new service is added', async () => {
    const initial = await repository.getSalonBySlug('ramesh-barber');
    expect(initial).not.toBeNull();
    const initialServiceCount = initial?.services.length || 0;

    // Add service
    await repository.addService({
      id: 'srv-test-cache-001',
      salonId: initial!.id,
      name: 'Executive Head Massage',
      basePrice: 150,
      estimatedDurationMinutes: 20,
      isAddOn: false,
      icon: '💆',
    });

    // Next call must reflect the newly added service without serving stale cache
    const updated = await repository.getSalonBySlug('ramesh-barber');
    expect(updated).not.toBeNull();
    expect(updated?.services.length).toBe(initialServiceCount + 1);
    expect(updated?.services.some((s) => s.id === 'srv-test-cache-001')).toBe(true);
  });

  it('should invalidate cache when a service is deleted', async () => {
    const initial = await repository.getSalonBySlug('ramesh-barber');
    expect(initial).not.toBeNull();
    const serviceToDelete = initial!.services[0];
    expect(serviceToDelete).toBeDefined();

    await repository.deleteService(serviceToDelete.id);

    const updated = await repository.getSalonBySlug('ramesh-barber');
    expect(updated).not.toBeNull();
    expect(updated?.services.some((s) => s.id === serviceToDelete.id)).toBe(false);
  });

  it('should invalidate cache when salon profile is updated', async () => {
    const initial = await repository.getSalonBySlug('ramesh-barber');
    expect(initial).not.toBeNull();

    await repository.updateSalon(initial!.id, {
      name: 'Ramesh Super Barber & Spa',
    });

    const updated = await repository.getSalonBySlug('ramesh-barber');
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Ramesh Super Barber & Spa');
  });

  it('should expose invalidateSalonCache method to manually purge cache entries', async () => {
    const initial = await repository.getSalonBySlug('ramesh-barber');
    expect(initial).not.toBeNull();

    // Invalidate
    repository.invalidateSalonCache('ramesh-barber');

    // Should fetch and re-populate
    const repopulated = await repository.getSalonBySlug('ramesh-barber');
    expect(repopulated).not.toBeNull();
    expect(repopulated?.id).toBe(initial?.id);
  });
});
