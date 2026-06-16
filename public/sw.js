// Offline support via runtime caching. Hashed asset filenames aren't known at
// build time (no build plugin), so we cache on first fetch: navigations fall
// back to the cached app shell, and same-origin GETs use cache-first.
const CACHE = 'speedread-v1';
const SHELL = './index.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.add(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App navigations -> serve cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(SHELL, { ignoreSearch: true }))
    );
    return;
  }

  // Static assets -> cache-first, then populate the cache.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(c => c.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
