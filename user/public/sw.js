/* Bullet Rani — cache audio / images only (never HTML/JS so Vite stays fresh) */
const CACHE = 'bulletrani-static-v1';

const PRECACHE = [
  '/bike.png',
  '/favicon.svg',
  '/icons.svg',
  '/sounds/bg-music.mp3',
  '/sounds/bike-start.mp3',
  '/sounds/bike-loop.mp3',
  '/sounds/anime-ahh.mp3',
  '/sounds/car-crash.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[sw] precache failed', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isMediaPath(pathname) {
  return (
    pathname.startsWith('/sounds/') ||
    /\.(mp3|png|svg|webp|jpg|jpeg|woff2)$/i.test(pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!isMediaPath(url.pathname)) return;

  // Cache-first for media — fast repeat loads, offline-capable assets
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return hit || Response.error();
      }
    })
  );
});
