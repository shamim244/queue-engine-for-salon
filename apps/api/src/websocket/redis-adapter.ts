import Redis from 'ioredis';
import type { PubSubAdapter } from './types';

/**
 * 1. Resilient In-Memory Pub/Sub Adapter (Zero-Dependency Primary / Fallback)
 * Simulates distributed Pub/Sub semantics within local memory or shared test networks.
 */
export class InMemoryPubSubAdapter implements PubSubAdapter {
  readonly name = 'IN_MEMORY_PUBSUB';
  private subscriptions = new Map<string, Set<(channel: string, message: string) => void>>();
  private patternSubscriptions = new Map<string, Set<(pattern: string, channel: string, message: string) => void>>();

  isAvailable(): boolean {
    return true;
  }

  async publish(channel: string, message: string): Promise<number> {
    let delivered = 0;

    // Exact channel match
    const directHandlers = this.subscriptions.get(channel);
    if (directHandlers) {
      for (const handler of directHandlers) {
        try {
          handler(channel, message);
          delivered++;
        } catch (err) {
          console.error(`[InMemoryPubSub] Handler error on channel ${channel}:`, err);
        }
      }
    }

    // Pattern matches (e.g. 'salon:events:*' matches 'salon:events:123')
    for (const [pattern, handlers] of this.patternSubscriptions.entries()) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp('^' + escaped + '$');
      if (regex.test(channel)) {
        for (const handler of handlers) {
          try {
            handler(pattern, channel, message);
            delivered++;
          } catch (err) {
            console.error(`[InMemoryPubSub] Pattern handler error on pattern ${pattern}:`, err);
          }
        }
      }
    }

    return delivered;
  }

  async subscribe(channel: string, handler: (channel: string, message: string) => void): Promise<void> {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(handler);
  }

  async psubscribe(pattern: string, handler: (pattern: string, channel: string, message: string) => void): Promise<void> {
    if (!this.patternSubscriptions.has(pattern)) {
      this.patternSubscriptions.set(pattern, new Set());
    }
    this.patternSubscriptions.get(pattern)!.add(handler);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.subscriptions.delete(channel);
  }

  async punsubscribe(pattern: string): Promise<void> {
    this.patternSubscriptions.delete(pattern);
  }

  async disconnect(): Promise<void> {
    this.subscriptions.clear();
    this.patternSubscriptions.clear();
  }
}

/**
 * 2. Enterprise Redis Pub/Sub Adapter
 * Maintains dedicated publisher and subscriber connections to adhere strictly
 * to Redis pub/sub protocol constraints, with exponential backoff and zero-crash fault tolerance.
 */
export class RedisPubSubAdapter implements PubSubAdapter {
  readonly name = 'REDIS_PUBSUB';
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isPublisherReady = false;
  private isSubscriberReady = false;
  private hasLoggedWarning = false;
  private channelHandlers = new Map<string, Set<(channel: string, message: string) => void>>();
  private patternHandlers = new Map<string, Set<(pattern: string, channel: string, message: string) => void>>();

  constructor(redisUrl?: string, private instanceTag: string = 'default') {
    const url = redisUrl || process.env.REDIS_URL?.trim();
    if (!url) return;

    try {
      const retryStrategy = (times: number) => {
        if (times > 5) {
          if (!this.hasLoggedWarning) {
            console.warn(`⚠️ [WebSocket Pub/Sub] Redis connection offline for [${instanceTag}]. Operating on In-Memory fallback.`);
            this.hasLoggedWarning = true;
          }
          return Math.min(times * 500, 3000);
        }
        return Math.min(times * 200, 1500);
      };

      // 1. Publisher Client (regular commands)
      this.publisher = new Redis(url, {
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy,
      });

      // 2. Subscriber Client (dedicated subscription mode)
      this.subscriber = new Redis(url, {
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy,
      });

      this.setupPublisherEvents();
      this.setupSubscriberEvents();

      // Non-blocking initialization
      this.publisher.connect().catch(() => {
        this.isPublisherReady = false;
      });
      this.subscriber.connect().catch(() => {
        this.isSubscriberReady = false;
      });
    } catch (err: any) {
      this.isPublisherReady = false;
      this.isSubscriberReady = false;
      console.warn(`⚠️ [WebSocket Pub/Sub] Initialization error for [${instanceTag}]:`, err.message);
    }
  }

  private setupPublisherEvents() {
    if (!this.publisher) return;

    this.publisher.on('ready', () => {
      this.isPublisherReady = true;
      this.hasLoggedWarning = false;
    });

    this.publisher.on('error', (err) => {
      this.isPublisherReady = false;
      if (!this.hasLoggedWarning) {
        console.warn(`⚠️ [WebSocket Pub/Sub] Publisher error: ${err.message}`);
        this.hasLoggedWarning = true;
      }
    });

    this.publisher.on('close', () => {
      this.isPublisherReady = false;
    });
  }

  private setupSubscriberEvents() {
    if (!this.subscriber) return;

    this.subscriber.on('ready', () => {
      this.isSubscriberReady = true;
      this.hasLoggedWarning = false;
      // Re-register all existing subscriptions on reconnect
      this.reapplySubscriptions();
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      const handlers = this.channelHandlers.get(channel);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(channel, message);
          } catch (err) {
            console.error(`[WebSocket Pub/Sub] Message handler error on channel ${channel}:`, err);
          }
        }
      }
    });

    this.subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
      const handlers = this.patternHandlers.get(pattern);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(pattern, channel, message);
          } catch (err) {
            console.error(`[WebSocket Pub/Sub] Pattern handler error on pattern ${pattern}:`, err);
          }
        }
      }
    });

    this.subscriber.on('error', (err) => {
      this.isSubscriberReady = false;
      if (!this.hasLoggedWarning) {
        console.warn(`⚠️ [WebSocket Pub/Sub] Subscriber error: ${err.message}`);
        this.hasLoggedWarning = true;
      }
    });

    this.subscriber.on('close', () => {
      this.isSubscriberReady = false;
    });
  }

  private async reapplySubscriptions() {
    if (!this.isSubscriberAvailable() || !this.subscriber) return;

    for (const channel of this.channelHandlers.keys()) {
      try {
        await this.subscriber.subscribe(channel);
      } catch (err: any) {
        console.warn(`⚠️ [WebSocket Pub/Sub] Error subscribing to ${channel}:`, err.message);
      }
    }
    for (const pattern of this.patternHandlers.keys()) {
      try {
        await this.subscriber.psubscribe(pattern);
      } catch (err: any) {
        console.warn(`⚠️ [WebSocket Pub/Sub] Error psubscribing to ${pattern}:`, err.message);
      }
    }
  }

  isPublisherAvailable(): boolean {
    return this.isPublisherReady && this.publisher !== null;
  }

  isSubscriberAvailable(): boolean {
    return this.isSubscriberReady && this.subscriber !== null;
  }

  isAvailable(): boolean {
    return this.isPublisherAvailable() && this.isSubscriberAvailable();
  }

  async waitForReady(timeoutMs = 3000): Promise<boolean> {
    if (this.isAvailable()) return true;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.isAvailable()) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return this.isAvailable();
  }

  async publish(channel: string, message: string): Promise<number> {
    // Decoupled: publishing only requires publisher connection to be ready
    if (!this.isPublisherAvailable() || !this.publisher) {
      return 0;
    }

    try {
      return await this.publisher.publish(channel, message);
    } catch (err: any) {
      this.isPublisherReady = false;
      if (!this.hasLoggedWarning) {
        console.warn(`⚠️ [WebSocket Pub/Sub] Publish failed (${err.message}). Falling back to local broadcast.`);
        this.hasLoggedWarning = true;
      }
      return 0;
    }
  }

  async subscribe(channel: string, handler: (channel: string, message: string) => void): Promise<void> {
    if (!this.channelHandlers.has(channel)) {
      this.channelHandlers.set(channel, new Set());
    }
    this.channelHandlers.get(channel)!.add(handler);

    if (this.isSubscriberAvailable() && this.subscriber) {
      try {
        await this.subscriber.subscribe(channel);
      } catch (err: any) {
        console.warn(`⚠️ [WebSocket Pub/Sub] Subscribe error for ${channel}:`, err.message);
      }
    }
  }

  async psubscribe(pattern: string, handler: (pattern: string, channel: string, message: string) => void): Promise<void> {
    if (!this.patternHandlers.has(pattern)) {
      this.patternHandlers.set(pattern, new Set());
    }
    this.patternHandlers.get(pattern)!.add(handler);

    if (this.isSubscriberAvailable() && this.subscriber) {
      try {
        await this.subscriber.psubscribe(pattern);
      } catch (err: any) {
        console.warn(`⚠️ [WebSocket Pub/Sub] Psubscribe error for ${pattern}:`, err.message);
      }
    }
  }

  async unsubscribe(channel: string, handler?: (channel: string, message: string) => void): Promise<void> {
    if (handler && this.channelHandlers.has(channel)) {
      this.channelHandlers.get(channel)!.delete(handler);
      if (this.channelHandlers.get(channel)!.size > 0) return;
    }
    this.channelHandlers.delete(channel);
    if (this.isSubscriberAvailable() && this.subscriber) {
      try {
        await this.subscriber.unsubscribe(channel);
      } catch {}
    }
  }

  async punsubscribe(pattern: string, handler?: (pattern: string, channel: string, message: string) => void): Promise<void> {
    if (handler && this.patternHandlers.has(pattern)) {
      this.patternHandlers.get(pattern)!.delete(handler);
      if (this.patternHandlers.get(pattern)!.size > 0) return;
    }
    this.patternHandlers.delete(pattern);
    if (this.isSubscriberAvailable() && this.subscriber) {
      try {
        await this.subscriber.punsubscribe(pattern);
      } catch {}
    }
  }

  async disconnect(): Promise<void> {
    this.channelHandlers.clear();
    this.patternHandlers.clear();
    this.isPublisherReady = false;
    this.isSubscriberReady = false;

    if (this.publisher) {
      try {
        this.publisher.disconnect();
      } catch {}
      this.publisher = null;
    }

    if (this.subscriber) {
      try {
        this.subscriber.disconnect();
      } catch {}
      this.subscriber = null;
    }
  }
}
