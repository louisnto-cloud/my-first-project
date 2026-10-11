// Hunt Mentor service worker.
// App shell (and the map code and libraries): cached on install, served cache first (offline first).
// Map tiles, terrain, fonts: cache first. Offline areas live in hm-offline-* caches, viewed tiles in hm-tiles (size capped).
// Our layer files (data/layers, data/spots): cache first per ?v= version. The layers manifest and the OpenFreeMap
// tile index: network first with a short wait, then the saved copy. PMTiles byte ranges are cut from a saved whole file
// or from the saved range chunks of an offline area (keys "<file>?v=..&hmr=<start>-<end>&hmt=<size>", map/offline.js).
// No signal: navigator.onLine false, or a network request failed or hung in the last few seconds, means "down".
// While down nothing waits on the network: saved copies answer at once and anything not saved fails at once.
const CACHE = '__VERSION__';
const TILES = 'hm-tiles';
const DATA = 'hm-data';
const TILE_CAP = 4000;
// CORE must all load or the install fails (the old version keeps running). EXTRA files are added one by one:
// a missing photo or map file is skipped (fetched on demand later) instead of breaking the whole install.
const CORE = ['./', 'index.html', 'style.css', 'app.js', 'content.js'];
const EXTRA = ['home.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', ...__CONTENT__, ...__MAP__, ...__PHOTOS__, 'hunt-mentor-offline.html']; // content: lesson screens and search text (lessons/*.json)
const fresh = (u) => new Request(u, { cache: 'reload' }); // skip the browser HTTP cache so one version never mixes with another

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(CORE.map(fresh));
    let i = 0;
    const worker = async () => { while (i < EXTRA.length) { const u = EXTRA[i++]; try { await c.add(fresh(u)); } catch (err) { /* skipped, loads on demand */ } } };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== TILES && k !== DATA && !k.startsWith('hm-offline-')).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => caches.open(TILES)).then(trim));
});

// One cache key for every OpenFreeMap tile set version, so saved areas keep working after the weekly update (same rule in map/offline.js).
const normKey = (u) => u.replace(/^(https:\/\/tiles\.openfreemap\.org\/[a-z0-9_]+)\/[^/]+\/(\d+\/\d+\/\d+\.pbf)(\?.*)?$/, '$1/_/$2');
const MATCH = { ignoreVary: true };

self.addEventListener('message', (e) => { if (e.data && e.data.hm === 'offline-changed') pmIdx = null; });

// ---------- no signal detection ----------
// Down when the phone says offline, or when a request got nothing back for NET_QUIET while no other request came back
// either (a phone with no signal often says "online" and lets requests hang for a minute). Then every waiting request
// stops at once and for DOWN_MS nothing waits on the network. One slow request on a working link is allowed NET_WAIT.
const DOWN_MS = 12000, NET_WAIT = 15000, NET_QUIET = 3000;
let downUntil = 0, lastNetOk = 0;
const inflight = new Set();
const isDown = () => (self.navigator && self.navigator.onLine === false) || Date.now() < downUntil;
function markDown() { downUntil = Date.now() + DOWN_MS; for (const c of inflight) c.abort(); inflight.clear(); }
function net(req, ms = NET_WAIT) {
  const ctrl = new AbortController(), started = Date.now();
  inflight.add(ctrl);
  const quiet = setTimeout(() => { if (lastNetOk < started) markDown(); }, NET_QUIET);
  const hard = setTimeout(() => { inflight.delete(ctrl); ctrl.abort(); }, ms);
  const end = () => { clearTimeout(quiet); clearTimeout(hard); inflight.delete(ctrl); };
  return fetch(req, { signal: ctrl.signal }).then((res) => { end(); lastNetOk = Date.now(); downUntil = 0; return res; }, (err) => {
    end(); if (!ctrl.signal.aborted || Date.now() - started >= NET_QUIET) downUntil = Math.max(downUntil, Date.now() + DOWN_MS);
    throw err;
  });
}
const fail = () => Response.error();

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Offline Maps downloads: straight to the network (byte range header kept), the page stores them itself
  if (url.searchParams.has('hmdl')) {
    url.searchParams.delete('hmdl');
    const h = new Headers(); const r = req.headers.get('range'); if (r) h.set('range', r);
    e.respondWith(fetch(url.href, { mode: 'cors', credentials: 'omit', headers: h, cache: req.cache === 'reload' ? 'reload' : 'default' }));
    return;
  }
  if (url.origin === self.location.origin) {
    if (/\/data\/layers\/manifest\.json$/.test(url.pathname)) { e.respondWith(networkFirst(req, DATA, 1500)); return; }
    if (/\.pmtiles$/.test(url.pathname)) { e.respondWith(pmtiles(req)); return; }
    if (/\/data\/(layers|spots)\//.test(url.pathname)) { e.respondWith(dataFirst(req)); return; }
    e.respondWith(shell(req));
    return;
  }
  if (url.hostname === 'tiles.openfreemap.org') {
    if (/\.pbf$/.test(url.pathname) || url.pathname.startsWith('/sprites/')) e.respondWith(tileFirst(req));
    else e.respondWith(networkFirst(req, TILES, 1000)); // tile index (TileJSON) and styles: a saved copy after 1 s
    return;
  }
  if ((url.hostname === 's3.amazonaws.com' && url.pathname.startsWith('/elevation-tiles-prod/'))
    || (url.hostname === 'server.arcgisonline.com' && url.pathname.includes('/tile/'))
    || url.hostname === 'tile.opentopomap.org') { e.respondWith(tileFirst(req)); return; }
  // everything else (place search, weather): network only
});

async function shell(req) {
  const hit = await caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }));
  if (hit) return hit;
  try {
    if (isDown() && req.mode !== 'navigate') { const any = await caches.match(req, { ignoreSearch: true, ignoreVary: true }); if (any) return any; }
    const res = await net(req);
    // a precache file that was skipped at install: keep it now (map code, vendor libraries, photos)
    if (res.ok && /\/(map|vendor|photos|seasons|harvest|lessons)\/[^/]+$|\/home\.js$|\/data\/migration\.json$/.test(new URL(req.url).pathname)) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
    return res;
  } catch (err) {
    if (req.mode === 'navigate') { const idx = await caches.match('index.html'); if (idx) return idx; }
    throw err;
  }
}

let puts = 0;
async function tileFirst(req) {
  const key = normKey(req.url);
  const hit = await caches.match(key, MATCH);
  if (hit) return hit;
  if (isDown()) return fail(); // no signal: answer now, do not wait for a network that is not there
  let res;
  try { res = await net(req); } catch (err) { return fail(); }
  if (res.ok) {
    const copy = res.clone();
    caches.open(TILES).then((c) => c.put(key, copy).then(() => { if (++puts % 100 === 0) trim(c); })).catch(() => {});
  }
  return res;
}
async function trim(c) {
  const keys = await c.keys();
  if (keys.length > TILE_CAP) await Promise.all(keys.slice(0, keys.length - TILE_CAP + 300).map((k) => c.delete(k)));
}

async function dataFirst(req) {
  const hit = await caches.match(req, MATCH);
  if (hit) return hit;
  const older = () => caches.match(req, { ignoreSearch: true, ignoreVary: true }); // an older version beats nothing offline
  // No signal and never saved (a file next to a saved area): an empty layer, the same as what the map can show there.
  const none = () => (/\.(geo)?json$/.test(new URL(req.url).pathname)
    ? new Response('{"type":"FeatureCollection","features":[]}', { status: 200, headers: { 'Content-Type': 'application/json', 'X-Hm-Offline': 'not-saved' } }) : fail());
  if (isDown()) { const old = await older(); return old || none(); }
  try {
    const res = await net(req);
    if (res.ok) {
      const copy = res.clone(), path = new URL(req.url).pathname;
      caches.open(DATA).then(async (c) => {
        await c.put(req, copy);
        for (const k of await c.keys()) if (new URL(k.url).pathname === path && k.url !== req.url) c.delete(k); // older versions
      }).catch(() => {});
    }
    return res;
  } catch (err) {
    const old = await older();
    return old || none();
  }
}

/** Network first, but never a long wait: down means the saved copy at once; otherwise the saved copy after ms. */
async function networkFirst(req, cacheName, ms) {
  const fromCache = () => caches.match(req, MATCH);
  if (isDown()) { const hit = await fromCache(); if (hit) return hit; }
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(async () => { const hit = await fromCache(); if (hit && !done) { done = true; resolve(hit); } }, ms);
    net(req).then(async (res) => {
      if (res.ok) { const copy = res.clone(); caches.open(cacheName).then((c) => c.put(req, copy)).catch(() => {}); }
      else if (!done) { const hit = await fromCache(); if (hit) { done = true; clearTimeout(timer); resolve(hit); return; } }
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }, async (err) => {
      clearTimeout(timer); if (done) return;
      const hit = await fromCache(); done = true;
      if (hit) resolve(hit); else reject(err);
    });
  });
}

// ---------- PMTiles: byte ranges ----------
// Saved whole: cut the range from the saved file. Saved as range chunks (big files, map/offline.js): cut it from the chunk
// that holds it. Not saved: network (or fail at once when there is no signal).
const plain = (u) => { const x = new URL(u); x.searchParams.delete('hmr'); x.searchParams.delete('hmt'); x.searchParams.delete('hmdl'); return x.href; };
let pmIdx = null;
async function pmIndex() {
  if (pmIdx) return pmIdx;
  const idx = new Map(); // path -> [{ file, s, e, t, key, cache }]
  for (const name of (await caches.keys()).filter((k) => k.startsWith('hm-offline-'))) {
    const c = await caches.open(name);
    for (const k of await c.keys()) {
      const m = /[?&]hmr=(\d+)-(\d+)(?:&hmt=(\d+))?/.exec(k.url); if (!m) continue;
      const file = plain(k.url), path = new URL(file).pathname;
      if (!idx.has(path)) idx.set(path, []);
      idx.get(path).push({ file, s: +m[1], e: +m[2], t: +m[3] || 0, key: k.url, cache: name });
    }
  }
  pmIdx = idx;
  return idx;
}
const sliceRes = (blob, s, e, total, etag) => {
  const part = blob.slice(0, e - s + 1), h = { 'Content-Type': 'application/octet-stream', 'Content-Length': String(part.size), 'Content-Range': `bytes ${s}-${s + part.size - 1}/${total || '*'}` };
  if (etag) h.ETag = etag;
  return new Response(part, { status: 206, headers: h });
};
async function pmtiles(req) {
  const range = req.headers.get('range');
  const hit = await caches.match(req.url, MATCH) || (isDown() && await caches.match(plain(req.url), { ignoreSearch: true, ignoreVary: true }));
  const m = range && /bytes=(\d+)-(\d*)/.exec(range);
  if (hit && !hit.headers.get('x-hm-range')) { // a whole saved file
    if (!range) return hit;
    const blob = await hit.blob();
    if (!m) return new Response(blob, { status: 200, headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(blob.size) } });
    const start = +m[1], end = m[2] ? Math.min(+m[2], blob.size - 1) : blob.size - 1;
    if (start >= blob.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
    return sliceRes(blob.slice(start), start, end, blob.size);
  }
  if (m) {
    const s = +m[1], e = m[2] ? +m[2] : Infinity, file = plain(req.url), down = isDown();
    const list = (await pmIndex()).get(new URL(file).pathname) || [];
    const ok = (c) => c.s <= s && (c.e >= e || (c.t && c.e >= c.t - 1 && c.e >= s));
    const c = list.find((x) => x.file === file && ok(x)) || (down && list.find(ok));
    if (c) {
      const res = await caches.open(c.cache).then((x) => x.match(c.key));
      if (res) { const blob = await res.blob(); return sliceRes(blob.slice(s - c.s), s, Math.min(e, c.e), c.t, res.headers.get('etag')); }
      pmIdx = null; // the area was deleted: rebuild the index next time
    }
  }
  if (isDown()) return fail();
  try { return await net(req); } catch (err) { return fail(); }
}
