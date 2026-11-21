import { describe, it, expect, afterEach } from 'bun:test';
import { WebSocketHub } from '../../src/websocket/hub';
import { RedisPubSubAdapter } from '../../src/websocket/redis-adapter';
import type { QueueEventPayload } from '../../src/engine/types';

describe('Real Redis Pub/Sub Adapter & Multi-Worker Integration Suite', () => {
  let hubA: WebSocketHub | null = null;
  let hubB: WebSocketHub | null = null;
  let brokenAdapter: RedisPubSubAdapter | null = null;

  afterEach(async () => {
    if (hubA) {
      await hubA.disconnect();
      hubA = null;
    }
    if (hubB) {
      await hubB.disconnect();
      hubB = null;
    }
    if (brokenAdapter) {
      await brokenAdapter.disconnect();
      brokenAdapter = null;
    }
  });

  it('should connect to Redis and distribute events across two separate Hub instances', async () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const adapterA = new RedisPubSubAdapter(redisUrl, 'test-a');
    const adapterB = new RedisPubSubAdapter(redisUrl, 'test-b');

    // Wait for Redis connection handshake with explicit readiness check
    const isReadyA = await adapterA.waitForReady(4000);
    const isReadyB = await adapterB.waitForReady(4000);

    if (!isReadyA || !isReadyB) {
      console.warn('Skipping live Redis cross-worker test: Redis not responding');
      await adapterA.disconnect();
      await adapterB.disconnect();
      return;
    }

    hubA = new WebSocketHub({
      instanceId: 'inst_live_worker_a',
      adapter: adapterA,
    });

    hubB = new WebSocketHub({
      instanceId: 'inst_live_worker_b',
      adapter: adapterB,
    });

    // Give subscription registration a moment
    await new Promise((r) => setTimeout(r, 200));

    const receivedOnB: string[] = [];
    hubB.addClient('client-b-live', 'salon-rural-01', (msg) => {
      receivedOnB.push(msg);
    });

    const event: QueueEventPayload = {
      type: 'TICKET_CREATED',
      salonId: 'salon-rural-01',
      timestamp: new Date().toISOString(),
    };

    // Broadcast from Hub A
    await hubA.broadcastToSalon('salon-rural-01', event);

    // Give Redis Pub/Sub network message a brief propagation window
    await new Promise((r) => setTimeout(r, 400));

    expect(receivedOnB.length).toBe(1);
    const parsed = JSON.parse(receivedOnB[0]);
    expect(parsed.type).toBe('TICKET_CREATED');
    expect(parsed.salonId).toBe('salon-rural-01');
  }, 10000);

  it('should gracefully handle invalid Redis URL without throwing unhandled exceptions', async () => {
    brokenAdapter = new RedisPubSubAdapter('redis://127.0.0.1:9999', 'broken');
    expect(brokenAdapter.isAvailable()).toBe(false);

    hubA = new WebSocketHub({
      instanceId: 'inst_broken_test',
      adapter: brokenAdapter,
    });

    const received: string[] = [];
    hubA.addClient('client-broken-test', 'salon-rural-01', (msg) => {
      received.push(msg);
    });

    const event: QueueEventPayload = {
      type: 'TICKET_SUMMONED',
      salonId: 'salon-rural-01',
      timestamp: new Date().toISOString(),
    };

    // Should not throw
    await hubA.broadcastToSalon('salon-rural-01', event);
    expect(received.length).toBe(1);
  }, 10000);

  it('should support multiple concurrent handlers per channel on RedisPubSubAdapter', async () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const adapter = new RedisPubSubAdapter(redisUrl, 'multi-handler-test');

    const isReady = await adapter.waitForReady(3000);
    if (!isReady) {
      await adapter.disconnect();
      return;
    }

    const messagesH1: string[] = [];
    const messagesH2: string[] = [];

    const h1 = (_chan: string, msg: string) => messagesH1.push(msg);
    const h2 = (_chan: string, msg: string) => messagesH2.push(msg);

    await adapter.subscribe('test:multi-redis', h1);
    await adapter.subscribe('test:multi-redis', h2);

    await new Promise((r) => setTimeout(r, 200));

    await adapter.publish('test:multi-redis', 'ping-multi');
    const startWait = Date.now();
    while ((!messagesH1.includes('ping-multi') || !messagesH2.includes('ping-multi')) && Date.now() - startWait < 3000) {
      await new Promise((r) => setTimeout(r, 50));
    }

    expect(messagesH1).toContain('ping-multi');
    expect(messagesH2).toContain('ping-multi');

    await adapter.disconnect();
  }, 10000);
});
