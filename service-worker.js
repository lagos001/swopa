const CACHE_NAME = 'swopa-pwa-v31';
const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './logo.png',
  './manifest.webmanifest',
  './data/americanino_women_app.inline.js',
  './assets/pwa/icon-192.png',
  './assets/pwa/icon-512.png',
  './assets/pwa/apple-touch-icon.png',
  './assets/pwa/favicon-32.png',
  './icons/accesories.png',
  './icons/bag.png',
  './icons/bottoms.png',
  './icons/closet.png',
  './icons/filter.png',
  './icons/noti.png',
  './icons/pj.png',
  './icons/profile.png',
  './icons/search.png',
  './icons/shoes.png',
  './icons/swimwear.png',
  './icons/tops.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
