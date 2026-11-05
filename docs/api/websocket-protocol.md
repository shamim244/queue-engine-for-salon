# WebSocket Protocol Specification

**Protocol Version:** 2.0.0  
**Transport:** Raw WebSocket (`ws://` / `wss://`) over Bun native WebSocket engine  
**Endpoint:** `/ws`  

---

## 1. Connection & Room Lifecycle

Clients connect to `/ws` and issue a room subscription payload. Rooms isolate queue updates per salon.

### Client Subscription Request
```json
{
  "action": "subscribe",
  "salonId": "salon-rural-01"
}
```

### Server Subscription Confirmation
```json
{
  "type": "SUBSCRIBED",
  "room": "salon:salon-rural-01",
  "timestamp": "2026-11-05T06:55:00.000Z"
}
```

---

## 2. Server Event Broadcasts

Whenever an atomic mutation occurs on the queue state machine, the server dispatches a broadcast to all active sockets in `salon:{salonId}`:

### 1. `QUEUE_UPDATED`
Dispatched on check-in, queue re-order, cancellation, or hold.
```json
{
  "type": "QUEUE_UPDATED",
  "salonId": "salon-rural-01",
  "activeCount": 3,
  "estimatedWaitMinutes": 25,
  "timestamp": "2026-11-05T06:55:05.000Z"
}
```

### 2. `TICKET_SUMMONED`
Dispatched when a barber or receptionist calls a customer to the chair.
```json
{
  "type": "TICKET_SUMMONED",
  "salonId": "salon-rural-01",
  "ticketId": "tkt-1020",
  "ticketNumber": 1020,
  "customerName": "Vikram Sharma",
  "stylistName": "Ramesh Kumar",
  "chairNumber": 1
}
```
*Note: Clients listen to this event to trigger the client-side audio chime (`Web Audio API`) and display the summon banner.*

### 3. `TICKET_COMPLETED`
Dispatched when checkout finishes and the chair re-opens.
```json
{
  "type": "TICKET_COMPLETED",
  "salonId": "salon-rural-01",
  "ticketId": "tkt-1020",
  "chairNumber": 1
}
```

---

## 3. Client Reconnection & Heartbeat
- **Heartbeat:** Clients send ping every 30 seconds:
  ```json
  { "action": "ping" }
  ```
  Server replies with `{ "type": "pong" }`.
- **Reconnection SLA:** If dropped, clients reconnect within 3 seconds using exponential backoff with jitter (max 10s).
