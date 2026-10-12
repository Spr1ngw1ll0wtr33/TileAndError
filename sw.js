// Offline support for Tile & Error.
// IMPORTANT: other apps share this web address and the same cache storage, so this worker
// only ever touches caches whose names start with its own prefix.

const PREFIX = 'tile-and-error-';
const CACHE = `${PREFIX}v1.0.0`;
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/game.js',
  'js/generator.js',
  'js/layouts.js',
  'js/progress.js',
  'js/rules.js',
  'js/store.js',
  'js/tiles.js',
  'fonts/poiret-one-latin-400-normal.woff2',
  'fonts/josefin-sans-latin-400-normal.woff2',
  'fonts/josefin-sans-latin-600-normal.woff2',
  'fonts/josefin-sans-latin-300-italic.woff2',
  'fonts/noto-serif-sc-tiles.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Serve from the cache straight away, and refresh the cached copy in the background.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) {
        event.waitUntil(fresh);
        return cached;
      }
      return (await fresh) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }),
  );
});
