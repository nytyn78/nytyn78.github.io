const CACHE = 'health-tracker-v2.27';
const ASSETS = ['/', '/index.html', '/manifest.json', '/foods.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' })))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always fetch index.html fresh from network — never serve stale app shell
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // foods.json: network-first so food database updates reach users immediately
  if (url.pathname === '/foods.json') {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else (icons, manifest): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
