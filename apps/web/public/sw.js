// Engine Que Enterprise Service Worker
// Version: eq-pwa-v9 (Zero-maintenance Progressive Web App Shell - Auto Cache Invalidation)

const CACHE_NAME = 'eq-pwa-v9';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install Event: Pre-cache offline shell and core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Purge older cache versions and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests, WebSockets, dev/local hosts, and HMR / Turbopack requests
  const isDevHost =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]' ||
    url.hostname === '0.0.0.0' ||
    url.hostname.endsWith('.local') ||
    url.hostname.endsWith('.test') ||
    url.port === '3000' ||
    url.port === '3001';

  if (
    request.method !== 'GET' ||
    url.protocol.startsWith('ws') ||
    isDevHost ||
    url.pathname.includes('webpack') ||
    url.pathname.includes('turbopack') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // 2. Next.js Static Bundles & Assets (Cache-First Strategy with Cache-Control validation)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheControl = networkResponse.headers.get('cache-control') || '';
            // Never store dynamic dev chunks or responses explicitly flagged no-store/no-cache
            if (!cacheControl.includes('no-store') && !cacheControl.includes('no-cache')) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. API Requests (Network-First Strategy with In-Memory / Offline Grace)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              message: 'Device is currently offline. Showing cached status if available.',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503,
            }
          );
        });
      })
    );
    return;
  }

  // 4. Navigation Requests / HTML Pages (Network-First Strategy with Offline HTML fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }
});
