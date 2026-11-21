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

  it('GET /api/system/websocket should return sanitized diagnostics for public clients and full telemetry for admin (SEC-05)', async () => {
    // 1. Public unauthenticated request
    const pubRes = await app.handle(new Request('http://localhost/api/system/websocket'));
    expect(pubRes.status).toBe(200);
    const pubBody = await pubRes.json();
    expect(pubBody.success).toBe(true);
    expect(pubBody.instanceId).toBe('inst_sanitized'); // Process PID / cluster instanceId hidden
    expect(pubBody.stats.errorCount).toBeUndefined(); // Internal error telemetry hidden
    expect(typeof pubBody.stats.localDeliveredCount).toBe('number');

    // 2. Admin authenticated request with x-admin-key
    const adminRes = await app.handle(
      new Request('http://localhost/api/system/websocket', {
        headers: { 'x-admin-key': 'test-admin-key' },
      })
    );
    expect(adminRes.status).toBe(200);
    const adminBody = await adminRes.json();
    expect(adminBody.success).toBe(true);
    expect(adminBody.instanceId).not.toBe('inst_sanitized');
    expect(typeof adminBody.stats.publishedCount).toBe('number');
  });

  it('GET /api/system/cache should sanitize public responses and expose full metrics to admin (SEC-05)', async () => {
    // 1. Public unauthenticated request
    const pubRes = await app.handle(new Request('http://localhost/api/system/cache'));
    expect(pubRes.status).toBe(200);
    const pubBody = await pubRes.json();
    expect(pubBody.success).toBe(true);
    expect(pubBody.isHealthy).toBe(true);
    expect(pubBody.registeredAdapters).toBeUndefined(); // Hidden from public reconnaissance
    expect(pubBody.stats).toBeUndefined();

    // 2. Admin authenticated request
    const adminRes = await app.handle(
      new Request('http://localhost/api/system/cache', {
        headers: { 'x-admin-key': 'test-admin-key' },
      })
    );
    expect(adminRes.status).toBe(200);
    const adminBody = await adminRes.json();
    expect(adminBody.success).toBe(true);
    expect(adminBody.registeredAdapters).toBeDefined();
    expect(adminBody.stats).toBeDefined();
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

  it('should strictly BLOCK unauthenticated client from subscribing to GLOBAL or ADMIN (SEC-01)', async () => {
    // Unauthenticated attempt to connect to GLOBAL
    const wsUrl = `ws://localhost:${serverPort}/ws?salonId=GLOBAL`;
    const ws = new WebSocket(wsUrl);

    const received: any[] = [];
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(e);
      ws.onmessage = (e) => {
        try {
          received.push(JSON.parse(e.data.toString()));
        } catch {}
      };
      setTimeout(() => reject(new Error('Timeout')), 2000);
    });

    await new Promise((r) => setTimeout(r, 100));

    // Client should have received UNAUTHORIZED_SUBSCRIPTION error frame
    const unauthError = received.find((m) => m.error === 'UNAUTHORIZED_SUBSCRIPTION');
    expect(unauthError).toBeDefined();

    // Now send a cross-tenant event to salon-modern-02
    await websocketHub.broadcastToSalon('salon-modern-02', {
      type: 'TICKET_CREATED',
      salonId: 'salon-modern-02',
      ticket: { ticketNumber: 777 } as any,
      timestamp: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 150));

    // The unauthenticated client MUST NOT receive ticket 777 from another salon!
    const leakedEvent = received.find((m) => m.type === 'TICKET_CREATED' && m.ticket?.ticketNumber === 777);
    expect(leakedEvent).toBeUndefined();

    // Verify unauthenticated client also does NOT leak salon-rural-01 events!
    await websocketHub.broadcastToSalon('salon-rural-01', {
      type: 'TICKET_CREATED',
      salonId: 'salon-rural-01',
      ticket: { ticketNumber: 666 } as any,
      timestamp: new Date().toISOString(),
    });
    await new Promise((r) => setTimeout(r, 150));
    const leakedRural = received.find((m) => m.type === 'TICKET_CREATED' && m.ticket?.ticketNumber === 666);
    expect(leakedRural).toBeUndefined();

    // Now try subscribing to ADMIN via message
    ws.send(JSON.stringify({ action: 'subscribe', salonId: 'ADMIN' }));
    await new Promise((r) => setTimeout(r, 100));

    const secondError = received.filter((m) => m.error === 'UNAUTHORIZED_SUBSCRIPTION');
    expect(secondError.length).toBeGreaterThanOrEqual(2);

    ws.close();
  });

  it('should authorize verified admin to receive global cross-tenant broadcasts (SEC-01)', async () => {
    // Verified admin connecting with adminKey
    const wsUrl = `ws://localhost:${serverPort}/ws?salonId=GLOBAL&adminKey=test-admin-key`;
    const ws = new WebSocket(wsUrl);

    const received: any[] = [];
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(e);
      ws.onmessage = (e) => {
        try {
          received.push(JSON.parse(e.data.toString()));
        } catch {}
      };
      setTimeout(() => reject(new Error('Timeout')), 2000);
    });

    await new Promise((r) => setTimeout(r, 100));

    // Broadcast to any salon
    await websocketHub.broadcastToSalon('salon-modern-02', {
      type: 'TICKET_CREATED',
      salonId: 'salon-modern-02',
      ticket: { ticketNumber: 888 } as any,
      timestamp: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 150));

    const globalEvent = received.find((m) => m.type === 'TICKET_CREATED' && m.ticket?.ticketNumber === 888);
    expect(globalEvent).toBeDefined();

    ws.close();
  });

  it('should reject salonId containing colon character over WebSocket (SEC-06)', async () => {
    // Attempt connecting with colon in salonId (Redis channel collision attempt)
    const wsUrl = `ws://localhost:${serverPort}/ws?salonId=salon:events:admin`;
    const ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(e);
      setTimeout(() => reject(new Error('Timeout')), 2000);
    });

    await new Promise((r) => setTimeout(r, 100));

    // Try sending subscribe with colon
    ws.send(JSON.stringify({ action: 'subscribe', salonId: 'events:all:broadcast' }));
    await new Promise((r) => setTimeout(r, 100));

    // Verify client was NOT registered under the colon salonId
    const status = websocketHub.getStatus();
    expect(status.uniqueSalonsCount).toBeLessThanOrEqual(2);

    ws.close();
  });

  it('should throttle excessive connection attempts via rate limiting (SEC-02)', async () => {
    // Attempt rapid connections from an IP that exceeds the threshold
    const testPort = serverPort;
    const ip = '10.99.88.77';

    // Rate limiter allows 30 per 10s by default. Let's fire connections.
    let rateLimitedEncountered = false;
    const sockets: WebSocket[] = [];

    try {
      for (let i = 0; i < 35; i++) {
        const ws = new WebSocket(`ws://localhost:${testPort}/ws?salonId=salon-rural-01`, {
          headers: { 'x-forwarded-for': ip },
        });
        sockets.push(ws);
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data.toString());
            if (data.error === 'RATE_LIMIT_EXCEEDED') {
              rateLimitedEncountered = true;
            }
          } catch {}
        };
        ws.onclose = (event) => {
          if (event.code === 1008) {
            rateLimitedEncountered = true;
          }
        };
      }

      await new Promise((r) => setTimeout(r, 500));
      expect(rateLimitedEncountered).toBe(true);
    } finally {
      for (const s of sockets) {
        try {
          s.close();
        } catch {}
      }
    }
  });
});
