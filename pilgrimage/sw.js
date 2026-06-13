// The Pilgrimage service worker.
//
// On install it reads precache-manifest.json (written at build time) and caches
// the entire app, so every world, lesson, font, and image works offline from
// the first launch — built to be opened mid-flight. At runtime, pages are
// network-first (so updates arrive when online) and assets are cache-first.

const FALLBACK_CACHE = 'pilgrimage-runtime';

async function precache() {
  try {
    const res = await fetch(new URL('precache-manifest.json', self.registration.scope), {
      cache: 'no-cache',
    });
    if (!res.ok) return;
    const { version, files } = await res.json();
    const cache = await caches.open(version);
    // Resolve every manifest path against the SW scope so this works both
    // locally (scope "/") and under a hosting subpath (e.g. /app/).
    const urls = files.map((p) => new URL(p, self.registration.scope).toString());
    // Add the directory root too, so a bare "/" navigation is covered.
    urls.push(self.registration.scope);
    // Cache individually so one unexpected miss cannot abort the whole
    // install — being mostly-cached offline beats being not-installed.
    await Promise.allSettled(urls.map((u) => cache.add(u)));
  } catch {
    // If the manifest is missing (e.g. dev), fall back to lazy runtime caching.
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Keep only the newest precache version plus the runtime cache.
      let keep = FALLBACK_CACHE;
      try {
        const res = await fetch(new URL('precache-manifest.json', self.registration.scope), {
          cache: 'no-cache',
        });
        if (res.ok) keep = (await res.json()).version;
      } catch {
        /* offline on activate: keep everything */
      }
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== keep && k !== FALLBACK_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(FALLBACK_CACHE);
    cache.put(request, res.clone());
  }
  return res;
}

async function navigate(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(FALLBACK_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    // Offline: try the exact page, then its index.html, then the app root.
    const url = new URL(request.url);
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match(url.pathname.replace(/\/$/, '') + '/index.html')) ||
      (await caches.match(self.registration.scope)) ||
      Response.error()
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? navigate(request) : cacheFirst(request));
});
