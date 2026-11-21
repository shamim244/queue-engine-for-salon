import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../../index';
import { websocketHub } from '../../src/websocket/hub';

describe('Elysia WebSocket Server & Diagnostics Integration', () => {
  let server: any;
  let serverPort: number;

  beforeAll(async () => {
    // Spin up an ephemeral test server on a free port
    server = app.listen(0);
    serverPort = server.server?.port || 3099;
  });

  afterAll(async () => {
    if (server) {
      server.stop();
    }
    await websocketHub.disconnect();
  });

  it('GET /api/system/websocket should return real-time hub diagnostics', async () => {
    const res = await app.handle(new Request('http://localhost/api/system/websocket'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.instanceId).toBeDefined();
    expect(body.adapterName).toBeDefined();
    expect(typeof body.isPubSubConnected).toBe('boolean');
    expect(typeof body.clientCount).toBe('number');
    expect(body.stats).toBeDefined();
    expect(typeof body.stats.localDeliveredCount).toBe('number');
  });

  it('should accept client WebSocket connection, register salon, and receive broadcasts', async () => {
    const wsUrl = `ws://localhost:${serverPort}/ws?salonId=salon-rural-01`;
    const ws = new WebSocket(wsUrl);

    const receivedMessages: any[] = [];
    let isOpened = false;

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        isOpened = true;
        resolve();
      };
      ws.onerror = (e) => reject(e);
      ws.onmessage = (event) => {
        try {
          receivedMessages.push(JSON.parse(event.data.toString()));
        } catch {}
      };
      setTimeout(() => reject(new Error('WebSocket connection timed out')), 3000);
    });

    expect(isOpened).toBe(true);
    // Give hub registration a tick
    await new Promise((r) => setTimeout(r, 100));

    // Send PING
    ws.send(JSON.stringify({ type: 'PING' }));
    await new Promise((r) => setTimeout(r, 100));

    const pong = receivedMessages.find((m) => m.type === 'PONG');
    expect(pong).toBeDefined();

    // Broadcast an event to salon-rural-01
    await websocketHub.broadcastToSalon('salon-rural-01', {
      type: 'TICKET_CREATED',
      salonId: 'salon-rural-01',
      ticket: { ticketNumber: 999 } as any,
      timestamp: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 200));

    const ticketMsg = receivedMessages.find((m) => m.type === 'TICKET_CREATED');
    expect(ticketMsg).toBeDefined();
    expect(ticketMsg.ticket?.ticketNumber).toBe(999);

    ws.close();
  });

  it('should reject prototype pollution injection over WebSocket message stream', async () => {
    const wsUrl = `ws://localhost:${serverPort}/ws?salonId=salon-rural-01`;
    const ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(e);
      setTimeout(() => reject(new Error('Timeout')), 2000);
    });

    // Send malicious message attempting prototype pollution
    ws.send('{"__proto__": {"polluted": true}, "action": "subscribe", "salonId": "hacked-salon"}');
    await new Promise((r) => setTimeout(r, 150));

    // Verify global Object prototype was not polluted
    expect((Object.prototype as any).polluted).toBeUndefined();

    ws.close();
  });

  it('should sanitize unsafe query parameter salonId on websocket open', async () => {
    // Attempt connecting with injection characters
    const wsUrl = `ws://localhost:${serverPort}/ws?salonId=<script>alert(1)</script>`;
    const ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(e);
      setTimeout(() => reject(new Error('Timeout')), 2000);
    });

    // Check status diagnostics - should NOT contain any unsafe salonId
    const status = websocketHub.getStatus();
    expect(status.clientCount).toBeGreaterThan(0);

    // Broadcast to safe default salon-rural-01
    const received: any[] = [];
    ws.onmessage = (e) => received.push(JSON.parse(e.data.toString()));

    await websocketHub.broadcastToSalon('salon-rural-01', {
      type: 'QUEUE_UPDATED',
      salonId: 'salon-rural-01',
      timestamp: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 150));
    // The client should have received it because unsafe salonId was sanitized to 'salon-rural-01'
    expect(received.length).toBeGreaterThan(0);
    expect(received[0].type).toBe('QUEUE_UPDATED');

    ws.close();
  });
});
