const CACHE_NAME = 'rsu-eoms-cache-v3';
const DYNAMIC_CACHE_NAME = 'rsu-eoms-dynamic-v3';
const STATIC_CHUNKS_CACHE = 'rsu-eoms-chunks-v3';

// Core assets to pre-cache on install
const urlsToCache = [
  '/',
  '/dashboard',
  '/audit',
  '/globals.css',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        urlsToCache.map(url =>
          cache.add(url).catch(err => console.warn(`Pre-cache failed for ${url}:`, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== DYNAMIC_CACHE_NAME &&
            cacheName !== STATIC_CHUNKS_CACHE
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (requestUrl.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Skip auth endpoints
  if (
    requestUrl.pathname.startsWith('/__/auth') ||
    requestUrl.pathname.startsWith('/api/auth')
  ) return;

  // ─── Strategy 1: CACHE-FIRST for Next.js static chunks & immutable assets ───
  // These files have content hashes in their names, so they never change.
  // If they're in cache, serve instantly. This is the key fix for offline chunk loading.
  const isStaticChunk = 
    requestUrl.pathname.startsWith('/_next/static/') ||
    requestUrl.pathname.startsWith('/_next/media/');

  if (isStaticChunk) {
    event.respondWith(
      caches.open(STATIC_CHUNKS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          // Serve from cache instantly, update in background when online
          return cached;
        }
        // Not cached — fetch from network and store
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Offline and not cached — this is the chunk-load failure scenario.
          // Return a special response that tells the client we're offline
          // instead of throwing, which crashes the app.
          console.warn('[SW] Chunk not available offline:', requestUrl.pathname);
          // Return empty JS module so the app doesn't fully crash
          return new Response('/* offline - chunk unavailable */', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
      })
    );
    return;
  }

  // ─── Strategy 2: NETWORK-FIRST with cache fallback for pages & RSC ───
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          // For page navigations, fallback to /dashboard (which is pre-cached)
          if (event.request.mode === 'navigate') {
            return caches.match('/dashboard');
          }

          // For everything else (RSC calls etc.), return an offline JSON stub
          if (requestUrl.pathname.startsWith('/_next/data/') || requestUrl.searchParams.has('_rsc')) {
            return new Response(JSON.stringify({ offline: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // Return a generic offline response
          return new Response('', { status: 503 });
        });
      })
  );
});

// ─── Message handler: pre-cache a list of URLs sent from the app ───
// The Deep Mirroring process sends chunk URLs here to cache them proactively.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(STATIC_CHUNKS_CACHE).then((cache) => {
        return Promise.allSettled(
          urls.map(url =>
            fetch(url).then(res => {
              if (res && res.status === 200) cache.put(url, res);
            }).catch(() => console.warn('[SW] Pre-cache failed for:', url))
          )
        );
      })
    );
  }
});
