// Service worker for 대천여행 (PWA app shell).
//
// Strategy:
//  - /api/*            → never handled (always live network; sync must be fresh).
//  - cross-origin      → never handled (Google Fonts, Open-Meteo weather API).
//  - navigations       → network-first, fall back to the cached shell when offline.
//  - /assets, /icons   → cache-first (Vite hashes these filenames, so they are
//                        immutable; a new deploy ships new URLs, avoiding staleness).
const CACHE = 'paros-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts, weather → network
  if (url.pathname.startsWith('/api/')) return; // live sync → always network

  // App navigations: network-first with an offline shell fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put('/', net.clone());
          return net;
        } catch {
          const cached = await caches.match('/');
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Hashed static assets and icons: cache-first.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const net = await fetch(req);
        if (net.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, net.clone());
        }
        return net;
      })(),
    );
  }
});
