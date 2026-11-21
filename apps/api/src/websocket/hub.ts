import type { QueueEventPayload } from '../engine/types';
import type {
  ClientSubscriber,
  EventEnvelope,
  PubSubAdapter,
  WebSocketHubOptions,
  WebSocketHubStats,
  WebSocketHubStatus,
} from './types';
import { safeJsonParse, validateEnvelope, isSalonAuthorized } from './security';
import { RedisPubSubAdapter, InMemoryPubSubAdapter } from './redis-adapter';

export class WebSocketHub {
  readonly instanceId: string;
  private subscribers = new Map<string, ClientSubscriber>();
  private aliasMap = new Map<string, Set<string>>([
    ['salon-rural-01', new Set(['salon-rural-01', 'ramesh-barber'])],
    ['ramesh-barber', new Set(['salon-rural-01', 'ramesh-barber'])],
    ['salon-modern-02', new Set(['salon-modern-02', 'aura-salon'])],
    ['aura-salon', new Set(['salon-modern-02', 'aura-salon'])],
  ]);

  private adapter: PubSubAdapter;
  private channel: string;
  private dedupCache = new Map<string, number>();
  private dedupTtlMs: number;
  private dedupMaxSize: number;
  private heartbeatInterval: any = null;

  private stats: WebSocketHubStats = {
    publishedCount: 0,
    receivedCount: 0,
    localDeliveredCount: 0,
    dedupDroppedCount: 0,
    echoDroppedCount: 0,
    errorCount: 0,
  };

  constructor(options?: WebSocketHubOptions) {
    this.instanceId = options?.instanceId || `inst_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    this.channel = options?.channel || 'salon:events';
    this.dedupTtlMs = options?.dedupTtlMs || 60 * 1000; // 60s TTL
    this.dedupMaxSize = options?.dedupMaxSize || 5000;

    if (options?.adapter) {
      this.adapter = options.adapter;
    } else if (process.env.NODE_ENV === 'test' && !process.env.REDIS_URL) {
      this.adapter = new InMemoryPubSubAdapter();
    } else {
      this.adapter = new RedisPubSubAdapter(process.env.REDIS_URL, this.instanceId);
    }

    this.initPubSub();

    if (process.env.NODE_ENV !== 'test') {
      this.startHeartbeat(options?.heartbeatIntervalMs || 30000, options?.heartbeatTimeoutMs || 60000);
    }
  }

  private initPubSub() {
    this.adapter.subscribe(this.channel, (_chan, message) => {
      this.handleRemoteMessage(message);
    }).catch((err) => {
      console.warn(`[WebSocket Hub] Initial pub/sub subscription error on ${this.channel}:`, err.message);
    });

    if (typeof this.adapter.psubscribe === 'function') {
      this.adapter.psubscribe(`${this.channel}:*`, (_pattern, _chan, message) => {
        this.handleRemoteMessage(message);
      }).catch(() => {});
    }
  }

  public async setPubSubAdapter(adapter: PubSubAdapter): Promise<void> {
    try {
      await this.adapter.disconnect();
    } catch {}
    this.adapter = adapter;
    this.initPubSub();
  }

  public registerAlias(id: string, slug: string): void {
    if (!this.aliasMap.has(id)) this.aliasMap.set(id, new Set([id]));
    if (!this.aliasMap.has(slug)) this.aliasMap.set(slug, new Set([slug]));
    this.aliasMap.get(id)!.add(slug);
    this.aliasMap.get(slug)!.add(id);
  }

  public addClient(
    id: string,
    salonId: string,
    send: (data: string) => void,
    isAdmin: boolean = false,
    close?: () => void,
    isSocketAlive?: () => boolean,
    ping?: () => void
  ): void {
    const isGlobal = salonId === 'GLOBAL' || salonId === 'ADMIN';
    const effectiveSalonId = isGlobal && !isAdmin ? '' : salonId;
    const effectiveIsAdmin = Boolean(isAdmin);

    this.subscribers.set(id, {
      id,
      salonId: effectiveSalonId,
      send,
      isAdmin: effectiveIsAdmin,
      close,
      isSocketAlive,
      ping,
      lastSeenAt: Date.now(),
      isAlive: true,
    });
  }

  public getClient(id: string): ClientSubscriber | undefined {
    return this.subscribers.get(id);
  }

  public recordHeartbeat(id: string): void {
    const client = this.subscribers.get(id);
    if (client) {
      client.lastSeenAt = Date.now();
      client.isAlive = true;
    }
  }

  /**
   * Proactively sweeps and prunes dead, half-open mobile sockets exceeding maxIdleMs.
   */
  public sweepDeadConnections(maxIdleMs: number = 60 * 1000): number {
    const now = Date.now();
    const deadClientIds: string[] = [];

    for (const sub of this.subscribers.values()) {
      const isSocketDead = typeof sub.isSocketAlive === 'function' && !sub.isSocketAlive();
      const isIdleTimeout = now - sub.lastSeenAt > maxIdleMs;
      if (isSocketDead || isIdleTimeout) {
        deadClientIds.push(sub.id);
      }
    }

    for (const id of deadClientIds) {
      const sub = this.subscribers.get(id);
      if (sub) {
        try {
          sub.close?.();
        } catch {}
        this.subscribers.delete(id);
      }
    }

    return deadClientIds.length;
  }

  /**
   * Proactively pings all connected clients and prunes any dead sockets where send() throws or readyState is closed.
   */
  public pingClients(): void {
    const pingPayload = JSON.stringify({ type: 'PING', timestamp: Date.now() });
    const deadClientIds: string[] = [];

    for (const sub of this.subscribers.values()) {
      if (typeof sub.isSocketAlive === 'function' && !sub.isSocketAlive()) {
        deadClientIds.push(sub.id);
        continue;
      }
      try {
        if (typeof sub.ping === 'function') {
          sub.ping();
        }
        sub.send(pingPayload);
      } catch {
        deadClientIds.push(sub.id);
      }
    }

    for (const id of deadClientIds) {
      const sub = this.subscribers.get(id);
      try {
        sub.close?.();
      } catch {}
      this.subscribers.delete(id);
    }
  }

  public startHeartbeat(intervalMs: number = 30000, maxIdleMs: number = 60000): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sweepDeadConnections(maxIdleMs);
      this.pingClients();
    }, intervalMs);
    if (this.heartbeatInterval?.unref) {
      this.heartbeatInterval.unref();
    }
  }

  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public removeClient(id: string): void {
    this.subscribers.delete(id);
  }

  public getClientCount(): number {
    return this.subscribers.size;
  }

  public clearClients(): void {
    this.subscribers.clear();
  }

  /**
   * Broadcasts an event to a salon across all cluster nodes and local clients.
   *
   * Flow:
   * 1. Delivers immediately to local clients (zero-latency in-memory path).
   * 2. Registers eventId in local dedup cache (Anti-Echo / Loop Protection).
   * 3. Publishes envelope to Redis Pub/Sub adapter (Multi-PM2 / Multi-Node Distribution).
   * 4. If Redis is offline or fails, local delivery is completely unaffected (Zero-Crash Fallback).
   */
  public async broadcastToSalon(
    salonId: string,
    event: QueueEventPayload | any,
    alternateId?: string
  ): Promise<void> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 1. Record in dedup cache to prevent local echo when Redis publishes back
    this.recordEventId(eventId);

    // 2. Deliver optimistically to local clients (resilient against serialization failure)
    try {
      this.deliverLocally(salonId, event, alternateId);
    } catch (err: any) {
      console.error(`[WebSocket Hub] Local delivery error:`, err.message);
    }

    // 3. Construct hardened envelope for distributed broadcast
    const envelope: EventEnvelope = {
      eventId,
      sourceInstanceId: this.instanceId,
      timestamp: Date.now(),
      salonId,
      alternateId,
      event,
    };

    const envelopeString = this.serializePayload(envelope);
    if (!envelopeString) {
      this.stats.errorCount++;
      return;
    }

    // 4. Publish to namespaced Redis Pub/Sub channel
    // Target channel format: salon:events:<salonId> (if psubscribe supported) or salon:events
    const targetChannel = typeof this.adapter.psubscribe === 'function'
      ? `${this.channel}:${salonId}`
      : this.channel;

    try {
      this.stats.publishedCount++;
      await this.adapter.publish(targetChannel, envelopeString);
    } catch (err: any) {
      this.stats.errorCount++;
      // Zero-Crash: Redis publish error never crashes the server or blocks callers
      console.warn(`⚠️ [WebSocket Hub] Redis broadcast failed: ${err.message}. Local delivery preserved.`);
    }
  }

  /**
   * Handles incoming Pub/Sub message from another cluster node.
   */
  private handleRemoteMessage(rawMessage: string): void {
    this.stats.receivedCount++;

    // 1. Safe JSON parsing with active prototype-pollution guard
    const parsed = safeJsonParse(rawMessage);
    if (!parsed.success || !parsed.data) {
      this.stats.errorCount++;
      console.warn(`[WebSocket Hub] Discarding invalid Pub/Sub message: ${parsed.error}`);
      return;
    }

    // 2. Validate Envelope Structure
    const validation = validateEnvelope(parsed.data);
    if (!validation.valid || !validation.envelope) {
      this.stats.errorCount++;
      console.warn(`[WebSocket Hub] Discarding malformed envelope: ${validation.error}`);
      return;
    }

    const envelope = validation.envelope;

    // 3. Anti-Echo Protection: Discard messages originating from THIS instance
    if (envelope.sourceInstanceId === this.instanceId) {
      this.stats.echoDroppedCount++;
      return;
    }

    // 4. Deduplication: Discard if this event was already delivered
    if (this.isEventDuplicate(envelope.eventId)) {
      this.stats.dedupDroppedCount++;
      return;
    }
    this.recordEventId(envelope.eventId);

    // 5. Deliver to local connected subscribers matching salon & alias boundaries
    try {
      this.deliverLocally(envelope.salonId, envelope.event, envelope.alternateId);
    } catch (err: any) {
      console.error(`[WebSocket Hub] Remote message local delivery error:`, err.message);
    }
  }

  /**
   * Safely serializes payload to JSON without throwing on non-primitive objects.
   */
  private serializePayload(data: any): string | null {
    try {
      return JSON.stringify(data, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );
    } catch (err: any) {
      console.error(`[WebSocket Hub] JSON serialization failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Dispatches payload to locally connected WebSocket clients.
   * Strictly enforces multi-tenant boundary authorization and prunes dead connections.
   */
  private deliverLocally(salonId: string, event: any, alternateId?: string): number {
    const payloadString = this.serializePayload(event);
    if (!payloadString) return 0;

    let count = 0;
    const deadClientIds: string[] = [];

    for (const sub of this.subscribers.values()) {
      if (isSalonAuthorized(sub.salonId, salonId, alternateId, this.aliasMap, sub.isAdmin)) {
        try {
          sub.send(payloadString);
          count++;
        } catch (e) {
          console.error(`[WebSocket Hub] Error sending to client ${sub.id}:`, e);
          deadClientIds.push(sub.id);
        }
      }
    }

    // Prune any dead client subscribers
    for (const id of deadClientIds) {
      this.subscribers.delete(id);
    }

    this.stats.localDeliveredCount += count;

    if (process.env.NODE_ENV !== 'test') {
      const ticketInfo = (event as any).ticket?.ticketNumber
        ? `for ticket #${(event as any).ticket.ticketNumber}`
        : '';
      console.log(`[WebSocket Broadcast] Sent ${event.type || 'EVENT'} ${ticketInfo} to ${count} clients in salon ${salonId}`);
    }

    return count;
  }

  private isEventDuplicate(eventId: string): boolean {
    const expiry = this.dedupCache.get(eventId);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.dedupCache.delete(eventId);
      return false;
    }
    return true;
  }

  private recordEventId(eventId: string): void {
    const now = Date.now();
    if (this.dedupCache.has(eventId)) {
      this.dedupCache.delete(eventId);
    }
    this.dedupCache.set(eventId, now + this.dedupTtlMs);

    // O(1) eviction of the oldest entry when exceeding dedupMaxSize
    while (this.dedupCache.size > this.dedupMaxSize) {
      const oldestKey = this.dedupCache.keys().next().value;
      if (oldestKey === undefined) break;
      this.dedupCache.delete(oldestKey);
    }
  }

  public getDedupCacheSize(): number {
    return this.dedupCache.size;
  }

  public hasDedupEvent(eventId: string): boolean {
    return this.dedupCache.has(eventId);
  }

  public getStatus(): WebSocketHubStatus {
    const uniqueSalons = new Set<string>();
    for (const sub of this.subscribers.values()) {
      uniqueSalons.add(sub.salonId);
    }

    return {
      instanceId: this.instanceId,
      adapterName: this.adapter.name,
      isPubSubConnected: this.adapter.isAvailable(),
      clientCount: this.subscribers.size,
      uniqueSalonsCount: uniqueSalons.size,
      stats: { ...this.stats },
    };
  }

  public async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.clearClients();
    this.dedupCache.clear();
    await this.adapter.disconnect();
  }
}

// Global Singleton Export (Maintains 100% backward compatibility for all existing imports)
export const websocketHub = new WebSocketHub();
