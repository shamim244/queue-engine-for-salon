export interface ClientSubscriber {
  id: string;
  salonId: string;
  send: (data: string) => void;
}

/**
 * Enterprise Pub/Sub Message Envelope
 * Guarantees traceability, multi-tenant boundaries, and loop protection across cluster nodes.
 */
export interface EventEnvelope<T = any> {
  eventId: string;
  sourceInstanceId: string;
  timestamp: number;
  salonId: string;
  alternateId?: string;
  event: T;
}

export interface PubSubAdapter {
  readonly name: string;
  isAvailable(): boolean;
  isPublisherAvailable?(): boolean;
  isSubscriberAvailable?(): boolean;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, handler: (channel: string, message: string) => void): Promise<void>;
  psubscribe?(pattern: string, handler: (pattern: string, channel: string, message: string) => void): Promise<void>;
  unsubscribe(channel: string, handler?: (channel: string, message: string) => void): Promise<void>;
  punsubscribe?(pattern: string, handler?: (pattern: string, channel: string, message: string) => void): Promise<void>;
  disconnect(): Promise<void>;
}

export interface WebSocketHubOptions {
  instanceId?: string;
  adapter?: PubSubAdapter;
  channel?: string;
  channelPattern?: string;
  dedupTtlMs?: number;
  dedupMaxSize?: number;
}

export interface WebSocketHubStats {
  publishedCount: number;
  receivedCount: number;
  localDeliveredCount: number;
  dedupDroppedCount: number;
  echoDroppedCount: number;
  errorCount: number;
}

export interface WebSocketHubStatus {
  instanceId: string;
  adapterName: string;
  isPubSubConnected: boolean;
  clientCount: number;
  uniqueSalonsCount: number;
  stats: WebSocketHubStats;
}
