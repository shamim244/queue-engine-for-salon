import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import path from 'path';
import { config } from './src/config';
import { initDatabase } from './src/db/mysql';
import { seedDemoData } from './src/db/repository';
import { authService } from './src/auth/auth-service';
import { websocketHub } from './src/websocket/hub';
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
import { compressionManager } from './src/engine/compression-manager';

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

// CORS Allowed Origin Validator
const configuredOrigins = new Set([
  'https://web.nexgentech.site',
  'http://web.nexgentech.site',
  'https://nexgentech.site',
  'http://nexgentech.site',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  ...(config.cors?.allowedOrigins || []),
]);

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return true;
  const clean = origin.trim().replace(/\/+$/, '');
  if (configuredOrigins.has(clean)) return true;
  if (clean.endsWith('.nexgentech.site') || clean.includes('nexgentech.site')) return true;
  if (/^https?:\/\/localhost(:\d+)?$/.test(clean)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(clean)) return true;
  return false;
}

const app = new Elysia()
  .use(
    cors({
      origin: (request) => isAllowedOrigin(request.headers.get('origin')),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      maxAge: 86400,
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
    open(ws) {
      const salonId = (ws.data.query?.salonId as string) || 'salon-rural-01';
      websocketHub.addClient(ws.id, salonId, (data) => ws.send(data));
    },
    message(ws, message) {
      let parsed: any = message;
      if (typeof message === 'string') {
        try {
          parsed = JSON.parse(message);
        } catch {}
      }
      if (parsed && typeof parsed === 'object') {
        if (parsed.action === 'subscribe' || parsed.type === 'JOIN_SALON') {
          const salonId = parsed.salonId;
          if (salonId) {
            websocketHub.addClient(ws.id, salonId, (data) => ws.send(data));
          }
        }
        if (parsed.type === 'PING' || parsed.action === 'ping') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
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
