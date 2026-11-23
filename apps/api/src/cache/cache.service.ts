import Redis from 'ioredis';

/**
 * Standard Cache Adapter Interface.
 * Any future caching provider (Redis, DragonFly, Cloudflare KV, Memcached, DynamoDB)
 * implements this interface to plug seamlessly into the centralized cache manager.
 */
export interface CacheAdapter {
  readonly name: string;
  isAvailable(): boolean;
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  clear(): Promise<void>;
  disconnect?(): Promise<void>;
}

interface MemoryCacheEntry {
  value: any;
  expiresAt: number | null; // null = persistent
  savedAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  staleFallbacks: number;
}

/**
 * 1. Resilient In-Memory Adapter (Zero-Dependency Primary / Fallback)
 * Operates in local RAM with TTL expiration, stale recovery, and deep clone isolation.
 */
export class InMemoryCacheAdapter implements CacheAdapter {
  readonly name = 'IN_MEMORY_FALLBACK';
  private store = new Map<string, MemoryCacheEntry>();

  isAvailable(): boolean {
    return true; // Always available in RAM
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      // Expired: return null but retain value for stale fallback recovery
      return null;
    }

    try {
      return structuredClone(entry.value) as T;
    } catch {
      return entry.value as T;
    }
  }

  /**
   * Retrieves stale / expired value during emergency downstream outages
   */
  getStale<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    try {
      return structuredClone(entry.value) as T;
    } catch {
      return entry.value as T;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const now = Date.now();
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? now + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt, savedAt: now });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/**
 * 2. Enterprise Redis Cache Adapter
 * Handles network connections, automatic retries, and offline degradation.
 */
export class RedisCacheAdapter implements CacheAdapter {
  readonly name = 'REDIS';
  private client: Redis | null = null;
  private isConnected = false;
  private hasLoggedWarning = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL?.trim();
    if (!url) return;

    try {
      this.client = new Redis(url, {
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            if (!this.hasLoggedWarning) {
              console.warn('⚠️ [Cache Engine] Redis connection failed. Operating seamlessly on In-Memory fallback cache.');
              this.hasLoggedWarning = true;
            }
            return null;
          }
          return Math.min(times * 300, 1500);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.hasLoggedWarning = false;
        console.log('⚡ [Cache Engine] Connected to Redis successfully.');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        if (!this.hasLoggedWarning) {
          console.warn(`⚠️ [Cache Engine] Redis error: ${err.message}. Seamlessly falling back to In-Memory cache.`);
          this.hasLoggedWarning = true;
        }
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      this.client.connect().catch((err) => {
        this.isConnected = false;
        if (!this.hasLoggedWarning) {
          console.warn(`⚠️ [Cache Engine] Redis offline (${err.message}). Using In-Memory fallback.`);
          this.hasLoggedWarning = true;
        }
      });
    } catch (err: any) {
      this.isConnected = false;
      console.warn(`⚠️ [Cache Engine] Failed to initialize Redis (${err.message}).`);
    }
  }

  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable() || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
      return null;
    } catch {
      this.isConnected = false;
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, payload, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, payload);
      }
    } catch {
      this.isConnected = false;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      this.isConnected = false;
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      this.isConnected = false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.flushdb();
    } catch {
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }
}

/**
 * 3. Centralized, Future-Proof Pluggable Cache Engine
 * Manages cache adapters with automatic priority routing, multi-tier fallback,
 * stale data rescue, and single-point integration.
 */
export class CentralizedCacheManager {
  private inMemoryFallback: InMemoryCacheAdapter;
  private adapters: CacheAdapter[] = [];
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    staleFallbacks: 0,
  };

  constructor() {
    this.inMemoryFallback = new InMemoryCacheAdapter();
    // Default distributed adapter: Redis
    this.registerAdapter(new RedisCacheAdapter());
  }

  /**
   * Extensible: Register any new caching adapter dynamically in priority order.
   * Enables 1-line integration of new caching providers in the future without modifying codebase.
   */
  registerAdapter(adapter: CacheAdapter): void {
    this.adapters.unshift(adapter); // Newest/registered adapters take precedence
  }

  /**
   * Returns the currently active operational primary adapter
   */
  getActiveAdapter(): CacheAdapter {
    for (const adapter of this.adapters) {
      if (adapter.isAvailable()) {
        return adapter;
      }
    }
    return this.inMemoryFallback;
  }

  async get<T>(key: string): Promise<T | null> {
    const active = this.getActiveAdapter();
    if (active !== this.inMemoryFallback) {
      return await active.get<T>(key);
    }
    // Fallback to in-memory store only when no distributed cache adapter is active
    return this.inMemoryFallback.get<T>(key);
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    this.stats.sets++;
    // Write to in-memory store immediately
    await this.inMemoryFallback.set(key, value, ttlSeconds);

    // Also write to active distributed adapter
    const active = this.getActiveAdapter();
    if (active !== this.inMemoryFallback) {
      await active.set(key, value, ttlSeconds).catch(() => {});
    }
  }

  async del(key: string): Promise<void> {
    this.stats.deletes++;
    await this.inMemoryFallback.del(key);
    for (const adapter of this.adapters) {
      if (adapter.isAvailable()) {
        await adapter.del(key).catch(() => {});
      }
    }
  }

  async delPattern(pattern: string): Promise<void> {
    this.stats.deletes++;
    await this.inMemoryFallback.delPattern(pattern);
    for (const adapter of this.adapters) {
      if (adapter.isAvailable()) {
        await adapter.delPattern(pattern).catch(() => {});
      }
    }
  }

  async clear(): Promise<void> {
    await this.inMemoryFallback.clear();
    for (const adapter of this.adapters) {
      if (adapter.isAvailable()) {
        await adapter.clear().catch(() => {});
      }
    }
  }

  /**
   * Centralized Resilient Wrapper:
   * Single-line cache-or-compute wrapper with automatic fallback and zero crash risk.
   * Eliminates boilerplate try/catch and manual cache calls everywhere.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60,
    options?: { skipCache?: boolean; allowStaleOnError?: boolean }
  ): Promise<T> {
    const allowStale = options?.allowStaleOnError ?? true;

    if (!options?.skipCache) {
      try {
        const cached = await this.get<T>(key);
        if (cached !== null && cached !== undefined) {
          this.stats.hits++;
          return cached;
        }
      } catch {
        // Ignored, proceed to fetcher
      }
    }

    this.stats.misses++;

    try {
      const fresh = await fetcher();
      if (fresh !== null && fresh !== undefined) {
        await this.set(key, fresh, ttlSeconds).catch(() => {});
      }
      return fresh;
    } catch (err: any) {
      // Resilience Guard: If DB or fetcher fails, rescue the request with stale cached data
      if (allowStale) {
        const stale = this.inMemoryFallback.getStale<T>(key);
        if (stale !== null && stale !== undefined) {
          this.stats.staleFallbacks++;
          console.warn(`🛡️ [ResilientCache] Fetcher failed for "${key}". Recovered seamlessly with stale cache.`);
          return stale;
        }
      }
      throw err;
    }
  }

  getStatus() {
    const active = this.getActiveAdapter();
    return {
      activeMode: active.name,
      isRedisConfigured: Boolean(process.env.REDIS_URL),
      isRedisConnected: active.name === 'REDIS',
      inMemoryKeyCount: this.inMemoryFallback.size,
      registeredAdapters: this.adapters.map((a) => a.name),
      stats: { ...this.stats },
    };
  }

  async disconnect(): Promise<void> {
    for (const adapter of this.adapters) {
      if (adapter.disconnect) {
        await adapter.disconnect().catch(() => {});
      }
    }
  }
}

// Global Singleton Export
export const cacheService = new CentralizedCacheManager();
export const HybridCacheService = CentralizedCacheManager; // Backward compatibility alias

/**
 * Higher-Order Function: Centralized Component Wrapper for Repositories & Services
 * Usage:
 *   export const getSalon = withResilientCache(
 *     (slug) => `salon:catalog:${slug}`,
 *     async (slug) => db.query(...),
 *     60
 *   );
 */
export function withResilientCache<TArgs extends any[], TReturn>(
  keyFn: (...args: TArgs) => string,
  fetcher: (...args: TArgs) => Promise<TReturn>,
  ttlSeconds: number = 60,
  options?: { skipCacheCheck?: (...args: TArgs) => boolean; allowStaleOnError?: boolean }
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const key = keyFn(...args);
    const skipCache = options?.skipCacheCheck ? options.skipCacheCheck(...args) : false;
    return cacheService.getOrSet(
      key,
      () => fetcher(...args),
      ttlSeconds,
      { skipCache, allowStaleOnError: options?.allowStaleOnError }
    );
  };
}
