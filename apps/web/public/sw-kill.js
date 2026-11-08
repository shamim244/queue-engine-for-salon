// Emergency Service Worker Self-Destruct / Purge Script
// Use this if clients need an immediate unregistration of all service workers and caches.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Unregister this and all service workers
      const registrations = await self.registration.unregister();

      // 2. Delete all client Cache Storage keys
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));

      // 3. Take control and force clean reload on all open tabs
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if ('navigate' in client) {
          client.navigate(client.url);
        }
      }
    })()
  );
});
