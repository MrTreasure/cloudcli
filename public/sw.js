// Service Worker for CloudCLI PWA
// Cache only manifest (needed for PWA install). HTML and JS are never pre-cached
// so a rebuild + refresh always picks up the latest assets.
const CACHE_NAME = 'c137-ui-a6353f89';
// Keep the resource-cache policy separate from the icon generator's brand key.
// A no-cors response cached by an older worker cannot satisfy a later CORS
// stylesheet/module request, even when the resource URL itself is unchanged.
const RESOURCE_CACHE_NAME = `${CACHE_NAME}-readable-assets-v3`;
const urlsToCache = [
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(RESOURCE_CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(() => {})
  );
  self.skipWaiting();
});

function usableAssetResponse(response, request) {
  if (!response || response.status !== 200 || !response.ok
    || !['basic', 'cors', 'default'].includes(response.type)) return false;
  if (request.mode === 'same-origin' && response.type === 'cors') return false;
  const pathname = new URL(request.url).pathname;
  const mime = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (pathname.endsWith('.css')) return mime === 'text/css';
  if (/\.m?js$/.test(pathname)) {
    return ['text/javascript', 'application/javascript', 'application/x-javascript',
      'text/ecmascript', 'application/ecmascript'].includes(mime);
  }
  return true;
}

async function loadAsset(event) {
  const request = event.request;
  // Storage restrictions or quota failures must not prevent a healthy network
  // response from loading. Only inspect this worker's current resource cache.
  const cache = await caches.open(RESOURCE_CACHE_NAME).catch(() => null);
  const cached = cache ? await cache.match(request).catch(() => undefined) : undefined;
  if (usableAssetResponse(cached, request)) return cached;
  if (cached) await cache.delete(request).catch(() => {});
  const response = await fetch(request, cached ? { cache: 'reload' } : undefined);
  if (cache && usableAssetResponse(response, request)) {
    event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
  }
  return response;
}

// Fetch event — network-first for everything except hashed assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  // Never intercept API requests or WebSocket upgrades
  if (url.includes('/api/') || url.includes('/ws')) {
    return;
  }

  // Navigation requests (HTML) — always go to network, no caching
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('<h1>Offline</h1><p>Please check your connection.</p>', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
        })
      )
    );
    return;
  }

  // Hashed assets (JS/CSS in /assets/) — cache-first since filenames change per build
  if (url.includes('/assets/')) {
    event.respondWith(loadAsset(event));
    return;
  }

  // Other requests use the browser's network handling. Business data and
  // third-party calls must not fall back to an unrelated or missing cache entry.
});

// Activate event — purge old caches
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys().catch(() => []);
    await Promise.all(cacheNames
      .filter(name => name.startsWith('c137-ui-') && name !== RESOURCE_CACHE_NAME)
      .map(name => caches.delete(name).catch(() => {})));
    await self.clients.claim();
  })());
});

// Push notification event
self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'C137控制台', body: event.data.text() };
  }

  const options = {
    body: payload.body || '',
    icon: '/icons/c137-a6353f89-192.png',
    badge: '/icons/c137-a6353f89-96.png',
    data: payload.data || {},
    tag: payload.data?.tag || `${payload.data?.sessionId || 'global'}:${payload.data?.code || 'default'}`,
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'CloudCLI', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const sessionId = event.notification.data?.sessionId;
  const provider = event.notification.data?.provider || null;
  const urlPath = sessionId ? `/session/${sessionId}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          await client.focus();
          client.postMessage({
            type: 'notification:navigate',
            sessionId: sessionId || null,
            provider,
            urlPath
          });
          return;
        }
      }
      return self.clients.openWindow(urlPath);
    })
  );
});
