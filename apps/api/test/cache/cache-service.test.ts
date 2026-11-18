import { describe, it, expect, beforeEach } from 'bun:test';
import { cacheService, HybridCacheService, withResilientCache } from '../../src/cache/cache.service';

describe('Suite: Resilient Hybrid Cache Engine with Automatic In-Memory Fallback', () => {
  beforeEach(async () => {
    await cacheService.clear();
  });

  it('T1: should store and retrieve values in In-Memory fallback mode when Redis is not active', async () => {
    await cacheService.set('salon:ramesh-barber', { name: "Ramesh Hair Salon", servicesCount: 8 });

    const cached = await cacheService.get<{ name: string; servicesCount: number }>('salon:ramesh-barber');
    expect(cached).not.toBeNull();
    expect(cached?.name).toBe('Ramesh Hair Salon');
    expect(cached?.servicesCount).toBe(8);

    const status = cacheService.getStatus();
    expect(status.inMemoryKeyCount).toBeGreaterThanOrEqual(1);
  });

  it('T2: should respect TTL expiration in In-Memory fallback mode', async () => {
    // 1 second TTL
    await cacheService.set('temp:otp:9876543210', { otp: '4491' }, 1);

    const immediate = await cacheService.get('temp:otp:9876543210');
    expect(immediate).toEqual({ otp: '4491' });

    // Wait 1.1s for TTL expiry
    await new Promise((r) => setTimeout(r, 1100));

    const expired = await cacheService.get('temp:otp:9876543210');
    expect(expired).toBeNull();
  });

  it('T3: should delete single keys and pattern matching without errors', async () => {
    await cacheService.set('catalog:salon1:services', ['Haircut', 'Beard']);
    await cacheService.set('catalog:salon1:staff', ['Raju', 'Sunil']);
    await cacheService.set('catalog:salon2:services', ['Facial']);

    await cacheService.del('catalog:salon2:services');
    expect(await cacheService.get('catalog:salon2:services')).toBeNull();

    // Pattern delete salon1 keys
    await cacheService.delPattern('catalog:salon1:*');
    expect(await cacheService.get('catalog:salon1:services')).toBeNull();
    expect(await cacheService.get('catalog:salon1:staff')).toBeNull();
  });

  it('T4: should NOT crash or throw if configured with an unreachable Redis URL', async () => {
    const originalUrl = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://127.0.0.1:59999'; // Dead port

    // Instantiate with unreachable Redis
    const brokenRedisCache = new HybridCacheService();

    // Must still work seamlessly on In-Memory fallback without throwing uncaught exceptions!
    await brokenRedisCache.set('offline:key', { test: true });
    const result = await brokenRedisCache.get('offline:key');
    expect(result).toEqual({ test: true });

    const status = brokenRedisCache.getStatus();
    expect(status.isRedisConnected).toBe(false);
    expect(status.activeMode).toBe('IN_MEMORY_FALLBACK');

    await brokenRedisCache.disconnect();
    process.env.REDIS_URL = originalUrl;
  });

  it('T5: centralized getOrSet should cache on miss and return from cache on subsequent calls', async () => {
    let dbQueryCount = 0;
    const fetcher = async () => {
      dbQueryCount++;
      return { id: 'salon-101', name: 'Super Cuts', rating: 4.8 };
    };

    // First call: cache miss -> fetcher executes
    const firstCall = await cacheService.getOrSet('salon:101', fetcher, 60);
    expect(firstCall.name).toBe('Super Cuts');
    expect(dbQueryCount).toBe(1);

    // Second call: cache hit -> fetcher does NOT execute
    const secondCall = await cacheService.getOrSet('salon:101', fetcher, 60);
    expect(secondCall.name).toBe('Super Cuts');
    expect(dbQueryCount).toBe(1); // Still 1! Zero redundant DB roundtrips

    const status = cacheService.getStatus();
    expect(status.stats.hits).toBeGreaterThanOrEqual(1);
  });

  it('T6: centralized withResilientCache wrapper should wrap any function with automatic caching', async () => {
    let fetchCount = 0;
    const fetchPartnerProfile = async (partnerId: string) => {
      fetchCount++;
      return { partnerId, tier: 'GOLD', commission: 15 };
    };

    const cachedPartnerFetcher = withResilientCache(
      (id) => `partner:profile:${id}`,
      fetchPartnerProfile,
      60
    );

    const res1 = await cachedPartnerFetcher('p-77');
    expect(res1.tier).toBe('GOLD');
    expect(fetchCount).toBe(1);

    const res2 = await cachedPartnerFetcher('p-77');
    expect(res2.tier).toBe('GOLD');
    expect(fetchCount).toBe(1); // Cached!
  });

  it('T7: centralized resilience should recover with stale cache if downstream DB fails', async () => {
    // Prime cache with valid data
    await cacheService.set('db:failing-query', { status: 'healthy', count: 42 }, 1);

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 1100));

    // Fetcher throws (simulating MySQL crash / network timeout)
    const failingFetcher = async () => {
      throw new Error('ECONNREFUSED: MySQL server went away');
    };

    // getOrSet should catch the error and recover using stale in-memory cache without crashing!
    const rescuedData = await cacheService.getOrSet<{ status: string; count: number }>(
      'db:failing-query',
      failingFetcher,
      60,
      { allowStaleOnError: true }
    );

    expect(rescuedData).not.toBeNull();
    expect(rescuedData.status).toBe('healthy');
    expect(rescuedData.count).toBe(42);

    const status = cacheService.getStatus();
    expect(status.stats.staleFallbacks).toBeGreaterThanOrEqual(1);
  });
});
