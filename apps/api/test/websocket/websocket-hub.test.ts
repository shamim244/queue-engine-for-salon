import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WebSocketHub } from '../../src/websocket/hub';
import { InMemoryPubSubAdapter } from '../../src/websocket/redis-adapter';
import type { QueueEventPayload } from '../../src/engine/types';

describe('Enterprise WebSocket Hub & Redis Pub/Sub Suite', () => {
  let hubA: WebSocketHub;
  let hubB: WebSocketHub;
  let pubsubNetwork: InMemoryPubSubAdapter;

  beforeEach(() => {
    // Shared pubsub bus simulating Redis Pub/Sub between Instance A and Instance B
    pubsubNetwork = new InMemoryPubSubAdapter();

    hubA = new WebSocketHub({
      instanceId: 'inst_pm2_worker_1',
      adapter: pubsubNetwork,
    });

    hubB = new WebSocketHub({
      instanceId: 'inst_pm2_worker_2',
      adapter: pubsubNetwork,
    });
  });

  afterEach(async () => {
    await hubA.disconnect();
    await hubB.disconnect();
  });

  describe('1. Local Client Management & Backward Compatibility', () => {
    it('should add, count, and remove clients correctly', () => {
      expect(hubA.getClientCount()).toBe(0);

      hubA.addClient('client-1', 'salon-rural-01', () => {});
      hubA.addClient('client-2', 'salon-rural-01', () => {});
      expect(hubA.getClientCount()).toBe(2);

      hubA.removeClient('client-1');
      expect(hubA.getClientCount()).toBe(1);

      hubA.removeClient('client-2');
      expect(hubA.getClientCount()).toBe(0);
    });

    it('should deliver events locally to connected clients of the target salon', async () => {
      const messages: string[] = [];
      hubA.addClient('client-1', 'salon-rural-01', (msg) => {
        messages.push(msg);
      });

      const event: QueueEventPayload = {
        type: 'TICKET_CREATED',
        salonId: 'salon-rural-01',
        timestamp: new Date().toISOString(),
      };

      await hubA.broadcastToSalon('salon-rural-01', event);

      expect(messages.length).toBe(1);
      const parsed = JSON.parse(messages[0]);
      expect(parsed.type).toBe('TICKET_CREATED');
      expect(parsed.salonId).toBe('salon-rural-01');
    });

    it('should resolve bi-directional aliases for slug-based clients', async () => {
      const messages: string[] = [];
      hubA.registerAlias('salon-rural-01', 'ramesh-barber');
      hubA.addClient('slug-listener', 'ramesh-barber', (msg) => {
        messages.push(msg);
      });

      const event: QueueEventPayload = {
        type: 'QUEUE_UPDATED',
        salonId: 'salon-rural-01',
        timestamp: new Date().toISOString(),
      };

      await hubA.broadcastToSalon('salon-rural-01', event, 'ramesh-barber');

      expect(messages.length).toBe(1);
    });
  });

  describe('2. Multi-Instance Event Distribution via Pub/Sub', () => {
    it('should distribute broadcast from Node A to clients connected to Node B', async () => {
      const nodeBMessages: string[] = [];

      // Client connected to PM2 Worker 2 (hubB)
      hubB.addClient('client-on-node-b', 'salon-rural-01', (msg) => {
        nodeBMessages.push(msg);
      });

      const event: QueueEventPayload = {
        type: 'TICKET_SUMMONED',
        salonId: 'salon-rural-01',
        timestamp: new Date().toISOString(),
      };

      // Broadcast originates from PM2 Worker 1 (hubA)
      await hubA.broadcastToSalon('salon-rural-01', event);

      // Node B client must have received the distributed event
      expect(nodeBMessages.length).toBe(1);
      const received = JSON.parse(nodeBMessages[0]);
      expect(received.type).toBe('TICKET_SUMMONED');
      expect(received.salonId).toBe('salon-rural-01');
    });
  });

  describe('3. Anti-Echo / Originator Loop Protection', () => {
    it('should NOT duplicate messages on the originating node (Zero Double-Firing)', async () => {
      const nodeAMessages: string[] = [];

      // Client connected to the originating node (hubA)
      hubA.addClient('client-on-node-a', 'salon-rural-01', (msg) => {
        nodeAMessages.push(msg);
      });

      const event: QueueEventPayload = {
        type: 'TICKET_SEATED',
        salonId: 'salon-rural-01',
        timestamp: new Date().toISOString(),
      };

      // Broadcast triggers local optimistic send + Redis publish
      await hubA.broadcastToSalon('salon-rural-01', event);

      // Node A's client should receive the message EXACTLY ONCE (from local send)
      // and NOT a second time when pub/sub message echoes back
      expect(nodeAMessages.length).toBe(1);
    });

    it('should drop duplicate event IDs (Deduplication Protection)', async () => {
      const nodeBMessages: string[] = [];
      hubB.addClient('client-b', 'salon-rural-01', (msg) => {
        nodeBMessages.push(msg);
      });

      // Manually publish same event envelope twice to simulate network retry or cluster duplicate
      const envelope = {
        eventId: 'evt_unique_123',
        sourceInstanceId: 'external_node_x',
        timestamp: Date.now(),
        salonId: 'salon-rural-01',
        event: {
          type: 'TICKET_COMPLETED',
          salonId: 'salon-rural-01',
          timestamp: new Date().toISOString(),
        },
      };

      await pubsubNetwork.publish('salon:events', JSON.stringify(envelope));
      await pubsubNetwork.publish('salon:events', JSON.stringify(envelope));

      // Node B client should receive it only ONCE
      expect(nodeBMessages.length).toBe(1);
    });
  });

  describe('4. Zero-Crash Resilient Fallback', () => {
    it('should seamlessly broadcast locally even if Pub/Sub throws or is unavailable', async () => {
      // Create a faulty adapter that throws on publish
      const failingAdapter = {
        name: 'FAULTY_ADAPTER',
        isAvailable: () => true,
        publish: async () => {
          throw new Error('Redis ECONNREFUSED');
        },
        subscribe: async () => {},
        unsubscribe: async () => {},
        disconnect: async () => {},
      };

      const resilientHub = new WebSocketHub({
        instanceId: 'inst_fault_test',
        adapter: failingAdapter,
      });

      const received: string[] = [];
      resilientHub.addClient('local-client', 'salon-rural-01', (msg) => {
        received.push(msg);
      });

      const event: QueueEventPayload = {
        type: 'TICKET_CREATED',
        salonId: 'salon-rural-01',
        timestamp: new Date().toISOString(),
      };

      // Must not throw an exception!
      expect(async () => {
        await resilientHub.broadcastToSalon('salon-rural-01', event);
      }).not.toThrow();

      // Local client still got the broadcast!
      expect(received.length).toBe(1);

      await resilientHub.disconnect();
    });

    it('should report comprehensive diagnostics via getStatus()', () => {
      const status = hubA.getStatus();
      expect(status.instanceId).toBe('inst_pm2_worker_1');
      expect(status.adapterName).toBe('IN_MEMORY_PUBSUB');
      expect(status.clientCount).toBe(0);
      expect(status.stats).toBeDefined();
      expect(typeof status.stats.publishedCount).toBe('number');
      expect(typeof status.stats.receivedCount).toBe('number');
    });

    it('should serialize BigInt without throwing and deliver locally', async () => {
      const received: string[] = [];
      hubA.addClient('client-bigint', 'salon-rural-01', (msg) => {
        received.push(msg);
      });

      const bigIntPayload = {
        type: 'QUEUE_UPDATED',
        salonId: 'salon-rural-01',
        timestamp: new Date().toISOString(),
        bigNumber: BigInt('9007199254740991000'),
      };

      await expect(hubA.broadcastToSalon('salon-rural-01', bigIntPayload)).resolves.toBeUndefined();
      expect(received.length).toBe(1);
      const parsed = JSON.parse(received[0]);
      expect(parsed.bigNumber).toBe('9007199254740991000');
    });

    it('should automatically prune dead clients when send() throws', async () => {
      hubA.addClient('client-dead', 'salon-rural-01', () => {
        throw new Error('WebSocket is already in CLOSING or CLOSED state');
      });
      hubA.addClient('client-alive', 'salon-rural-01', () => {});
      expect(hubA.getClientCount()).toBe(2);

      await hubA.broadcastToSalon('salon-rural-01', {
        type: 'QUEUE_UPDATED',
        salonId: 'salon-rural-01',
        timestamp: new Date().toISOString(),
      });

      // Dead client must be pruned, leaving only the healthy client
      expect(hubA.getClientCount()).toBe(1);
    });

    it('should support multiple concurrent handlers on the same channel in adapter', async () => {
      const calls: string[] = [];
      const handler1 = (_chan: string, msg: string) => calls.push(`h1:${msg}`);
      const handler2 = (_chan: string, msg: string) => calls.push(`h2:${msg}`);

      await pubsubNetwork.subscribe('test:multi', handler1);
      await pubsubNetwork.subscribe('test:multi', handler2);

      await pubsubNetwork.publish('test:multi', 'hello');
      expect(calls).toEqual(['h1:hello', 'h2:hello']);

      await pubsubNetwork.unsubscribe('test:multi');
    });

    it('should route messages via namespaced channel salon:events:<salonId>', async () => {
      let receivedDirectMessage = '';
      await pubsubNetwork.subscribe('salon:events:salon-special-99', (_chan, msg) => {
        receivedDirectMessage = msg;
      });

      await hubA.broadcastToSalon('salon-special-99', {
        type: 'TICKET_CREATED',
        salonId: 'salon-special-99',
        timestamp: new Date().toISOString(),
      });

      expect(receivedDirectMessage).not.toBe('');
      const envelope = JSON.parse(receivedDirectMessage);
      expect(envelope.salonId).toBe('salon-special-99');
    });
  });
});
