const CACHE_NAME = 'rsu-eoms-cache-v2';
const DYNAMIC_CACHE_NAME = 'rsu-eoms-dynamic-v2';

// Core assets to pre-cache
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
      // Use cache.addAll but handle individual failures gracefully so install doesn't fail
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
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First with Fallback-to-Cache Strategy for same-origin GET requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Only handle same-origin requests (portal assets, page chunks, RSC calls)
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // 2. Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 3. Skip chrome-extension, edge-extension, etc.
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // 4. Do not cache Firestore, Authentication, or other cloud endpoints if they happen to match origin (which they don't, but just in case)
  if (requestUrl.pathname.startsWith('/__/auth') || requestUrl.pathname.startsWith('/api/auth')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If request is successful, clone and store in cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch((error) => {
        // Offline: attempt to retrieve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Fallback if navigating to page that isn't in cache
          if (event.request.mode === 'navigate') {
            return caches.match('/dashboard');
          }
          
          // Return a failing response if not found
          throw error;
        });
      })
  );
});
