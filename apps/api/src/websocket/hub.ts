import type { QueueEventPayload } from '../engine/types';

interface ClientSubscriber {
  id: string;
  salonId: string;
  send: (data: string) => void;
}

const subscribers = new Map<string, ClientSubscriber>();

export const websocketHub = {
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

  broadcastToSalon(salonId: string, event: QueueEventPayload) {
    const payloadString = JSON.stringify(event);
    let count = 0;

    for (const sub of subscribers.values()) {
      if (sub.salonId === salonId) {
        try {
          sub.send(payloadString);
          count++;
        } catch (e) {
          console.error(`[WebSocket] Error broadcasting to client ${sub.id}:`, e);
        }
      }
    }
    console.log(`[WebSocket Broadcast] Sent ${event.type} for ticket #${event.ticket.ticketNumber} to ${count} clients in salon ${salonId}`);
  },
};
