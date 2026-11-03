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
import { salonRoutes } from './src/routes/salon.routes';
import { queueRoutes } from './src/routes/queue.routes';
import { authRoutes } from './src/routes/auth.routes';
import { adminRoutes } from './src/routes/admin.routes';

console.log(`\n======================================================`);
console.log(`🚀 ENGINE QUE SYSTEM FOR SALONS (BUN RUNTIME)`);
console.log(`======================================================\n`);

// Initialize Database & Seeds
await initDatabase();
seedDemoData();
await authService.seedDefaultUsers();

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
  .use(swagger({
    path: '/swagger',
    documentation: {
      info: {
        title: 'Engine Que System API',
        description: 'Real-time Hybrid Queue Engine for Salons (Rural Solo-Barber & Modern Multi-Station)',
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

  // Subdirectory Shortcuts (/s/:slug)
  .get('/s/:slug', ({ params, redirect }) => redirect(`/customer.html?salon=${params.slug}`))
  .get('/s/:slug/poster', ({ params, redirect }) => redirect(`/poster.html?salon=${params.slug}`))
  .get('/s/:slug/tv', ({ params, redirect }) => redirect(`/tv.html?salon=${params.slug}`))
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
  })

  .listen(config.port, ({ hostname, port }) => {
    console.log(`\n✨ Engine Que Server running at: http://${hostname}:${port}`);
    console.log(`📖 Swagger API Docs available at: http://${hostname}:${port}/swagger`);
    console.log(`💈 Salon Portal: http://${hostname}:${port}/index.html`);
    console.log(`📱 Rural Solo-Barber Phone: http://${hostname}:${port}/barber.html?salon=ramesh-barber`);
    console.log(`🚪 Customer Door QR Check-in: http://${hostname}:${port}/customer.html?salon=ramesh-barber`);
    console.log(`💻 Modern Reception Desk: http://${hostname}:${port}/desk.html?salon=aura-salon`);
    console.log(`📺 Modern Lobby TV: http://${hostname}:${port}/tv.html?salon=aura-salon\n`);
  });

export type App = typeof app;
export { app };
