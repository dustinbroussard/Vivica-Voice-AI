const CACHE_NAME = 'vivica-v1';
const STATIC_CACHE = 'vivica-static-v1';
const DYNAMIC_CACHE = 'vivica-dynamic-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For same-origin requests
  if (url.origin === self.location.origin) {
    // Cache-first strategy for static assets (images, icons, manifest)
    if (request.destination === 'image' || 
        request.destination === 'manifest' ||
        url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/)) {
      event.respondWith(cacheFirst(request));
      return;
    }

    // Stale-while-revalidate for HTML and JS/CSS files
    if (request.destination === 'document' || 
        request.destination === 'script' ||
        request.destination === 'style') {
      event.respondWith(staleWhileRevalidate(request));
      return;
    }

    // Network-first for API calls and dynamic content
    event.respondWith(networkFirst(request));
    return;
  }

  // For cross-origin requests, use network-only
  event.respondWith(fetch(request));
});

// Cache-first strategy: Serve from cache, fall back to network
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[Service Worker] Serving from cache:', request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache-first error:', error);
    throw error;
  }
}

// Stale-while-revalidate: Serve from cache, update from network in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.error('[Service Worker] Network fetch failed:', error);
    return cachedResponse;
  });

  return cachedResponse || fetchPromise;
}

// Network-first strategy: Try network, fall back to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Handle background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  // Add custom sync logic here if needed
});

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  // Add custom push notification logic here if needed
});
