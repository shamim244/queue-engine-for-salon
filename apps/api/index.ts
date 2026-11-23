import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import path from 'path';
import { config } from './src/config';
import { initDatabase } from './src/db/mysql';
import { seedDemoData, repository, defaultPlatformSettings } from './src/db/repository';
import { authService } from './src/auth/auth-service';
import { websocketHub } from './src/websocket/hub';
import {
  safeJsonParse,
  SAFE_SALON_ID_REGEX,
  verifyAdminAccess,
  checkWsConnectionRateLimit,
} from './src/websocket/security';
import { rateLimiter } from './src/security/rate-limiter';
import { jobQueue } from './src/worker/job-queue';
import { registerNotificationHandler } from './src/worker/handlers/notification.handler';
import { registerResetHandler } from './src/worker/handlers/reset.handler';
import { registerPayoutHandler } from './src/worker/payout-worker';
import { salonRoutes } from './src/routes/salon.routes';
import { queueRoutes } from './src/routes/queue.routes';
import { authRoutes } from './src/routes/auth.routes';
import { adminRoutes } from './src/routes/admin.routes';
import { planRoutes } from './src/routes/plan.routes';
import { paymentRoutes } from './src/routes/payment.routes';
import { couponRoutes } from './src/routes/coupon.routes';
import { walletRoutes } from './src/routes/wallet.routes';
import { referralRoutes } from './src/routes/referral.routes';
import { appointmentRoutes } from './src/routes/appointments';
import { partnerRoutes, adminPartnerRoutes } from './src/routes/partner.routes';
import { securityRoutes } from './src/routes/security.routes';
import { loyaltyRoutes } from './src/routes/loyalty.routes';
import { compressionManager } from './src/engine/compression-manager';
import { isAllowedOrigin } from './src/security/cors-validator';
import { applySecurityHeaders } from './src/security/headers';
import { memoryStore } from './src/db/repositories/store';
import { cacheService } from './src/cache/cache.service';

console.log(`\n======================================================`);
console.log(`🚀 ENGINE QUE SYSTEM FOR SALONS (BUN RUNTIME)`);
console.log(`======================================================\n`);

// Initialize SaaS Background Worker Pipeline Handlers
registerNotificationHandler();
registerResetHandler();
registerPayoutHandler();

// Initialize Database & Seeds (skip MySQL connection & background worker polling in test environment)
if (process.env.NODE_ENV !== 'test') {
  await initDatabase();
  seedDemoData();
  await authService.seedDefaultUsers();
  jobQueue.startWorker(2000);
} else {
  seedDemoData();
  await authService.seedDefaultUsers();
}

const publicDir = path.resolve(import.meta.dir, 'src/public');

export { isAllowedOrigin };

const app = new Elysia()
  .onRequest(({ set }) => {
    applySecurityHeaders(set);
    const cacheStatus = cacheService.getStatus();
    if (set.headers && typeof (set.headers as any).set === 'function') {
      (set.headers as any).set('X-Cache-Engine', cacheStatus.activeMode);
    } else if (set.headers) {
      (set.headers as any)['X-Cache-Engine'] = cacheStatus.activeMode;
    }
  })
  .use(
    cors({
      origin: (request) => isAllowedOrigin(request.headers.get('origin'), memoryStore.securitySettings?.allowedCustomOrigins),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'x-partner-id',
        'x-admin-key',
        'X-Requested-With',
        'Accept-Encoding',
      ],
      exposeHeaders: ['Content-Length', 'Content-Encoding', 'X-Cache-Engine'],
      maxAge: 86400,
      preflight: true,
    })
  )
  // Multi-Tier Adaptive Response Compression (zstd -> br -> gzip -> raw fallback)
  .mapResponse(({ response, request, set }) => {
    if (response instanceof Response) return;

    let bodyStr: string;
    let contentType = 'application/json; charset=utf-8';
    if (typeof response === 'object' && response !== null) {
      bodyStr = JSON.stringify(response);
    } else if (typeof response === 'string') {
      bodyStr = response;
      contentType = 'text/plain; charset=utf-8';
    } else {
      return;
    }

    const inputBuffer = Buffer.from(bodyStr, 'utf-8');
    const minThreshold = compressionManager.getSettings().minThresholdBytes;
    if (inputBuffer.byteLength <= minThreshold) return;

    const acceptEncoding = request.headers.get('accept-encoding') || '';
    const result = compressionManager.compressWithFallback(inputBuffer, acceptEncoding);

    if (!result.encoding) {
      // Uncompressed raw response
      return;
    }

    const responseHeaders = new Headers(set.headers as any);
    responseHeaders.set('Content-Type', (set.headers?.['content-type'] as string) || contentType);
    responseHeaders.set('Content-Encoding', result.encoding);
    responseHeaders.set('Vary', 'Accept-Encoding');
    responseHeaders.set('Content-Length', String(result.compressedBytes));
    applySecurityHeaders({ headers: responseHeaders });

    return new Response(result.data as any, {
      status: (typeof set.status === 'number' ? set.status : 200),
      headers: responseHeaders,
    });
  })
  .get('/api/health', () => ({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
  }))
  // Public Dynamic Landing Page Configuration (Sub-10ms Cached)
  .get('/api/public/landing-config', async () => {
    return await cacheService.getOrSet(
      'landing_page_config',
      async () => {
        const settings = repository.getPlatformSettings();
        const landingConfig = settings.landingPageConfig || defaultPlatformSettings.landingPageConfig;
        return {
          success: true,
          data: landingConfig,
        };
      },
      60
    );
  })
  .get('/api/v1/public/landing-config', async () => {
    return await cacheService.getOrSet(
      'landing_page_config',
      async () => {
        const settings = repository.getPlatformSettings();
        const landingConfig = settings.landingPageConfig || defaultPlatformSettings.landingPageConfig;
        return {
          success: true,
          data: landingConfig,
        };
      },
      60
    );
  })
  .get('/api/system/cache', async ({ headers, query }) => {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    const adminKey = (headers as any)['x-admin-key'] || (query as any)?.adminKey;
    const isAuth = await verifyAdminAccess(token, adminKey);
    const status = cacheService.getStatus();
    if (!isAuth) {
      return {
        success: true,
        activeMode: status.activeMode,
        isHealthy: true,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      success: true,
      ...status,
      timestamp: new Date().toISOString(),
    };
  })
  .get('/api/system/websocket', async ({ headers, query }) => {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    const adminKey = (headers as any)['x-admin-key'] || (query as any)?.adminKey;
    const isAuth = await verifyAdminAccess(token, adminKey);
    const status = websocketHub.getStatus();
    if (!isAuth) {
      return {
        success: true,
        instanceId: 'inst_sanitized',
        adapterName: status.adapterName,
        isPubSubConnected: status.isPubSubConnected,
        clientCount: status.clientCount,
        uniqueSalonsCount: status.uniqueSalonsCount,
        stats: {
          localDeliveredCount: status.stats.localDeliveredCount,
        },
        timestamp: new Date().toISOString(),
      };
    }
    return {
      success: true,
      ...status,
      timestamp: new Date().toISOString(),
    };
  })
  .use(swagger({
    path: '/swagger',
    documentation: {
      info: {
        title: 'Engine Que System API',
        description: 'Real-time Queue Engine for Salons (Universal Standard Architecture)',
        version: '1.0.0',
      },
    },
  }))
  .use(staticPlugin({
    assets: publicDir,
    prefix: '',
  }))
  .use(salonRoutes)
  .use(queueRoutes)
  .use(authRoutes)
  .use(adminRoutes)
  .use(planRoutes)
  .use(paymentRoutes)
  .use(couponRoutes)
  .use(walletRoutes)
  .use(referralRoutes)
  .use(appointmentRoutes)
  .use(partnerRoutes)
  .use(adminPartnerRoutes)
  .use(securityRoutes)
  .use(loyaltyRoutes)

  // Subdirectory Shortcuts (/s/:slug)
  .get('/s/:slug', ({ params, redirect }) => redirect(`/customer.html?salon=${params.slug}`))
  .get('/s/:slug/poster', ({ params, redirect }) => redirect(`/poster.html?salon=${params.slug}`))
  .get('/s/:slug/tv', ({ params, redirect }) => redirect(`/tv.html?salon=${params.slug}`))
  .get('/s/:slug/station', ({ params, redirect }) => redirect(`/desk.html?salon=${params.slug}`))
  .get('/s/:slug/desk', ({ params, redirect }) => redirect(`/desk.html?salon=${params.slug}`))
  .get('/s/:slug/barber', ({ params, redirect }) => redirect(`/barber.html?salon=${params.slug}`))
  .get('/s/:slug/staff', ({ params, redirect }) => redirect(`/staff.html?salon=${params.slug}`))
  .get('/s/:slug/owner', ({ params, redirect }) => redirect(`/owner.html?salon=${params.slug}`))

  // Real-time WebSocket Endpoint
  .ws('/ws', {
    async open(ws) {
      const headers = (ws.data?.headers || {}) as any;
      const clientIp = rateLimiter.getClientIp(headers) || '127.0.0.1';

      // 1. Connection Rate Limiting (SEC-02)
      const rateResult = checkWsConnectionRateLimit(clientIp);
      if (!rateResult.allowed) {
        try {
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many connection attempts. Please try again later.',
            retryAfter: rateResult.retryAfter,
          }));
          ws.close(1008, 'Rate limit exceeded');
        } catch {}
        return;
      }

      // 2. Validate salonId & Admin Authorization (SEC-01 & SEC-06)
      const rawSalonId = typeof ws.data.query?.salonId === 'string' ? ws.data.query.salonId.trim() : '';
      const token = typeof ws.data.query?.token === 'string' ? ws.data.query.token.trim() : undefined;
      const adminKey = typeof ws.data.query?.adminKey === 'string'
        ? ws.data.query.adminKey.trim()
        : (typeof headers['x-admin-key'] === 'string' ? headers['x-admin-key'].trim() : undefined);

      let isAdmin = false;
      let salonId = 'salon-rural-01';

      if (rawSalonId && SAFE_SALON_ID_REGEX.test(rawSalonId)) {
        if (rawSalonId === 'GLOBAL' || rawSalonId === 'ADMIN') {
          isAdmin = await verifyAdminAccess(token, adminKey);
          if (isAdmin) {
            salonId = rawSalonId;
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: 'UNAUTHORIZED_SUBSCRIPTION',
              message: 'Public subscription to GLOBAL or ADMIN channels is prohibited.',
            }));
            salonId = '';
          }
        } else {
          salonId = rawSalonId;
        }
      }

      websocketHub.addClient(
        ws.id,
        salonId,
        (data) => ws.send(data),
        isAdmin,
        () => ws.close(),
        () => ws.readyState === 1,
        () => {
          try {
            ws.ping();
          } catch {}
        }
      );
    },
    async message(ws, message) {
      // 1. Message rate limiting per socket
      const msgRate = rateLimiter.checkLimit(`ws:msg:${ws.id}`, 60, 10);
      if (!msgRate.allowed) {
        try {
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Message rate limit exceeded.',
            retryAfter: msgRate.retryAfter,
          }));
        } catch {}
        return;
      }

      let parsed: any = message;
      if (typeof message === 'string') {
        const result = safeJsonParse(message);
        if (!result.success) {
          // Reject malformed or prototype-polluting payloads
          return;
        }
        parsed = result.data;
      }

      if (parsed && typeof parsed === 'object') {
        // Record heartbeat on every message received (SEC-04)
        websocketHub.recordHeartbeat(ws.id);

        if (parsed.action === 'subscribe' || parsed.type === 'JOIN_SALON') {
          const reqSalonId = parsed.salonId;
          if (reqSalonId && typeof reqSalonId === 'string' && SAFE_SALON_ID_REGEX.test(reqSalonId)) {
            let isAdmin = false;
            if (reqSalonId === 'GLOBAL' || reqSalonId === 'ADMIN') {
              isAdmin = await verifyAdminAccess(parsed.token, parsed.adminKey);
              if (!isAdmin) {
                ws.send(JSON.stringify({
                  type: 'ERROR',
                  error: 'UNAUTHORIZED_SUBSCRIPTION',
                  message: 'Public subscription to GLOBAL or ADMIN channels is prohibited.',
                }));
                return;
              }
            }
            websocketHub.addClient(
              ws.id,
              reqSalonId,
              (data) => ws.send(data),
              isAdmin,
              () => ws.close(),
              () => ws.readyState === 1,
              () => {
                try {
                  ws.ping();
                } catch {}
              }
            );
          }
        }

        if (parsed.type === 'PING' || parsed.action === 'ping') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }

        if (parsed.type === 'PONG' || parsed.action === 'pong') {
          // Heartbeat acknowledged
        }
      }
    },
    close(ws) {
      websocketHub.removeClient(ws.id);
    },
  });

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, ({ hostname, port }) => {
    console.log(`\n✨ Engine Que Server running at: http://${hostname}:${port}`);
    console.log(`📖 Swagger API Docs available at: http://${hostname}:${port}/swagger`);
    console.log(`💈 Salon Portal: http://${hostname}:${port}/index.html`);
    console.log(`📱 Station / Barber Live Desk: http://${hostname}:${port}/s/ramesh-barber/station`);
    console.log(`🚪 Customer Door QR Check-in: http://${hostname}:${port}/s/ramesh-barber`);
    console.log(`📺 Lobby Live TV Display: http://${hostname}:${port}/s/aura-salon/tv\n`);
  });
}

export type App = typeof app;
export { app };
