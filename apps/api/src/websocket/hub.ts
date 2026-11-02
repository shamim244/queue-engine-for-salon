import type { QueueEventPayload } from '../engine/types';

interface ClientSubscriber {
  id: string;
  salonId: string;
  send: (data: string) => void;
}

const subscribers = new Map<string, ClientSubscriber>();

const aliasMap = new Map<string, Set<string>>([
  ['salon-rural-01', new Set(['salon-rural-01', 'ramesh-barber'])],
  ['ramesh-barber', new Set(['salon-rural-01', 'ramesh-barber'])],
  ['salon-modern-02', new Set(['salon-modern-02', 'aura-salon'])],
  ['aura-salon', new Set(['salon-modern-02', 'aura-salon'])],
]);

export const websocketHub = {
  registerAlias(id: string, slug: string) {
    if (!aliasMap.has(id)) aliasMap.set(id, new Set([id]));
    if (!aliasMap.has(slug)) aliasMap.set(slug, new Set([slug]));
    aliasMap.get(id)!.add(slug);
    aliasMap.get(slug)!.add(id);
  },

  addClient(id: string, salonId: string, send: (data: string) => void) {
    subscribers.set(id, { id, salonId, send });
    console.log(`[WebSocket] Client connected: ${id} to salon: ${salonId} (Total: ${subscribers.size})`);
  },

  removeClient(id: string) {
    subscribers.delete(id);
    console.log(`[WebSocket] Client disconnected: ${id} (Remaining: ${subscribers.size})`);
  },

  getClientCount(): number {
    return subscribers.size;
  },

  broadcastToSalon(salonId: string, event: QueueEventPayload, alternateId?: string) {
    const payloadString = JSON.stringify(event);
    let count = 0;

    const matchedAliases = new Set<string>([salonId]);
    if (alternateId) matchedAliases.add(alternateId);
    if (aliasMap.has(salonId)) {
      for (const a of aliasMap.get(salonId)!) matchedAliases.add(a);
    }
    if (alternateId && aliasMap.has(alternateId)) {
      for (const a of aliasMap.get(alternateId)!) matchedAliases.add(a);
    }

    for (const sub of subscribers.values()) {
      if (
        matchedAliases.has(sub.salonId) ||
        sub.salonId === 'GLOBAL' ||
        sub.salonId === 'ADMIN'
      ) {
        try {
          sub.send(payloadString);
          count++;
        } catch (e) {
          console.error(`[WebSocket] Error broadcasting to client ${sub.id}:`, e);
        }
      }
    }
    const ticketInfo = (event as any).ticket?.ticketNumber ? `for ticket #${(event as any).ticket.ticketNumber}` : '';
    console.log(`[WebSocket Broadcast] Sent ${event.type} ${ticketInfo} to ${count} clients in salon ${salonId}`);
  },
};

