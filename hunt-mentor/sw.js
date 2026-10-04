// Hunt Mentor service worker.
// App shell (and the map code and libraries): cached on install, served cache first (offline first).
// Map tiles, terrain, fonts: cache first. Offline areas live in hm-offline-* caches, viewed tiles in hm-tiles (size capped).
// Our layer files (data/layers, data/spots): cache first per ?v= version. The layers manifest and the OpenFreeMap
// tile index: network first with a cache fallback. PMTiles byte ranges are cut from a saved copy when offline.
const CACHE = 'hm-4159a73076-2026-10-04';
const TILES = 'hm-tiles';
const DATA = 'hm-data';
const TILE_CAP = 4000;
// CORE must all load or the install fails (the old version keeps running). EXTRA files are added one by one:
// a missing photo or map file is skipped (fetched on demand later) instead of breaking the whole install.
const CORE = ['./', 'index.html', 'style.css', 'app.js', 'content.js'];
const EXTRA = ['home.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', ...["ask.js","vendor/maplibre-gl-shared.mjs","vendor/maplibre-gl-worker.mjs","vendor/maplibre-gl.css","vendor/maplibre-gl.mjs","vendor/mlcontour-worker.js","vendor/mlcontour.min.js","vendor/pmtiles.js","map/area-lessons.js","map/core.js","map/icons.js","map/layers.js","map/location.js","map/map.css","map/mvt.js","map/offline.js","map/search.js","map/spots.js","map/store.js","map/style.js","map/tools-content.js","map/tools-files.js","map/tools-geo.js","map/tools-insights.js","map/tools-main.js","map/tools-track.js","map/tools-wind.js","map/tools.css","map/util.js","data/seasons/migratory.json","data/seasons/region1.json","data/seasons/region2.json","data/seasons/region3.json","data/seasons/region4.json","data/seasons/region5.json","data/seasons/region6.json","data/seasons/region7a.json","data/seasons/region7b.json","data/seasons/region8.json","data/harvest/bc-harvest.json","data/migration.json"], ...["photos/caribou-bull.jpg","photos/wood-bison.jpg","photos/plains-bison-bulls.jpg","photos/cougar.jpg","photos/cougar-kitten.jpg","photos/grey-wolf.jpg","photos/coyote.jpg","photos/canada-lynx.jpg","photos/bobcat.jpg","photos/wolverine.jpg","photos/snowshoe-hare-summer.jpg","photos/snowshoe-hare-winter.jpg","photos/surf-scoter.jpg","photos/white-winged-scoter.jpg","photos/black-scoter.jpg","photos/long-tailed-duck.jpg","photos/harlequin-duck.jpg","photos/common-eider.jpg","photos/bighorn-ewe.jpg","photos/bighorn-ram-full-curl.jpg","photos/dalls-sheep-ram.jpg","photos/stones-sheep-ram.jpg","photos/stones-sheep-young-ram.jpg","photos/mountain-goat-billy.jpg","photos/mountain-goat-nanny-kid.jpg","photos/mule-deer-buck.jpg","photos/g-md-buck-front.jpg","photos/g-md-buck-sage.jpg","photos/g-md-doe-sage-snow.jpg","photos/g-md-doe-front.jpg","photos/g-md-radium.jpg","photos/g-wt-buck-flag.jpg","photos/g-wt-doe-flag.jpg","photos/g-wt-doe.jpg","photos/g-md-buck-cover.jpg","photos/g-md-doe-fawns-rear.jpg","photos/g-md-doe-fawn-cover.jpg","photos/g-md-distance.jpg","photos/g-md-fawn-bedded.jpg","photos/g-md-fawn.jpg","photos/g-wt-buck-side.jpg","photos/g-wt-buck-front.jpg","photos/g-wt-run.jpg","photos/g-moose-bull-side.jpg","photos/g-moose-bull-front.jpg","photos/g-moose-young-bull.jpg","photos/g-moose-cow.jpg","photos/g-moose-cow-head.jpg","photos/g-moose-cow-calf.jpg","photos/g-moose-calf.jpg","photos/g-moose-calf-winter.jpg","photos/g-elk-bull-side.jpg","photos/g-elk-bull-rear.jpg","photos/g-elk-bulls-distance.jpg","photos/g-elk-cow.jpg","photos/g-elk-cow-rear.jpg","photos/g-elk-herd.jpg","photos/g-bb-side.jpg","photos/g-bb-face.jpg","photos/g-bb-tofino.jpg","photos/g-bb-brown.jpg","photos/g-bb-cinnamon.jpg","photos/g-bb-blonde.jpg","photos/g-bb-sow-cubs.jpg","photos/g-griz-front.jpg","photos/g-griz-side.jpg","photos/g-griz-profile.jpg","photos/g-griz-face.jpg","photos/g-griz-sow.jpg","photos/g-md-run-away.jpg","photos/g-bighorn-pair.jpg","photos/g-md-buck-side.jpg","photos/g-md-buck-rear.jpg","photos/g-md-buck-4pt.jpg","photos/g-md-buck-open.jpg","photos/g-md-bound.jpg","photos/g-md-buck-small.jpg","photos/g-md-forkhorn.jpg","photos/g-bt-buck-velvet.jpg","photos/g-bt-victoria.jpg","photos/g-bt-doe.jpg","photos/g-bt-bedded.jpg","photos/g-bt-buck.jpg","photos/g-md-young-bucks.jpg","photos/g-wigeon-flight.jpg","photos/g-gwt-flight.jpg","photos/g-shoveler-flight.jpg","photos/g-shoveler-flock.jpg","photos/g-wood-duck-flight.jpg","photos/g-scaup-flight.jpg","photos/g-bufflehead-flight.jpg","photos/g-goldeneye-flight.jpg","photos/g-canada-goose-flight.jpg","photos/g-snow-geese-skagit.jpg","photos/g-snow-geese-flock.jpg","photos/g-loon.jpg","photos/g-western-grebe.jpg","photos/g-redhead-flight.jpg","photos/g-trumpeter-swan.jpg","photos/g-tundra-swans-flight.jpg","photos/g-horned-grebe.jpg","photos/g-quail-male-vernon.jpg","photos/g-quail-pair.jpg","photos/g-quail-female.jpg","photos/g-chukar.jpg","photos/g-ruffed-snow.jpg","photos/g-spruce-male.jpg","photos/g-sooty-male.jpg","photos/g-sooty-hen.jpg","photos/g-ptarmigan-summer.jpg","photos/g-ptarmigan-winter.jpg","photos/g-pheasant-rooster.jpg","photos/g-pheasant-hen.jpg","photos/g-turkey-tom.jpg","photos/g-turkey-hen.jpg","photos/g-turkey-flock.jpg","photos/g-sage-grouse.jpg","photos/g-ruffed-grey.jpg","photos/g-ruffed-tree.jpg","photos/g-md-does-bedded.jpg","photos/g-md-buck-bedded.jpg","photos/g-goat-radium.jpg","photos/g-goat-face.jpg","photos/g-wolf-grey.jpg","photos/g-wolf-black.jpg","photos/g-coyote-snow.jpg","photos/g-coyote-howl.jpg","photos/g-lynx.jpg","photos/g-cougar-glacier.jpg","photos/g-bighorn-ram.jpg","photos/wigeon-drake.jpg","photos/wigeon-hen.jpg","photos/green-winged-teal-drake.jpg","photos/green-winged-teal-hen.jpg","photos/blue-winged-teal-drake.jpg","photos/blue-winged-teal-hen.jpg","photos/gadwall-drake.jpg","photos/gadwall-drake-flight.jpg","photos/gadwall-hen.jpg","photos/shoveler-drake.jpg","photos/shoveler-hen.jpg","photos/wood-duck-drake.jpg","photos/wood-duck-hen.jpg","photos/common-goldeneye-drake.jpg","photos/common-goldeneye-hen.jpg","photos/barrows-goldeneye-drake.jpg","photos/barrows-goldeneye-hen.jpg","photos/bufflehead-drake.jpg","photos/bufflehead-hen.jpg","photos/ring-necked-duck-drake.jpg","photos/ring-necked-duck-hen.jpg","photos/lesser-scaup-drake.jpg","photos/lesser-scaup-hen.jpg","photos/canvasback-drake.jpg","photos/canvasback-hen.jpg","photos/redhead-drake.jpg","photos/redhead-hen.jpg","photos/common-merganser-drake.jpg","photos/common-merganser-hen.jpg","photos/hooded-merganser-drake.jpg","photos/hooded-merganser-hen.jpg","photos/divers-taking-off.jpg","photos/mallards-flushing.jpg","photos/mallards-flying.jpg","photos/pintail-hen.jpg","photos/canada-goose.jpg","photos/cackling-goose.jpg","photos/cackling-and-canada-geese.jpg","photos/snow-goose.jpg","photos/ross-goose.jpg","photos/snow-and-ross-geese.jpg","photos/white-fronted-goose.jpg","photos/brant.jpg","photos/hab-aspen-grove-snow.jpg","photos/hab-bear-berry-patch.jpg","photos/hab-bear-claw-aspen.jpg","photos/hab-bear-scat-berries.jpg","photos/hab-bear-scat-okanagan.jpg","photos/hab-bear-track-front.jpg","photos/hab-bear-track-mud.jpg","photos/hab-beaver-lodge.jpg","photos/hab-bitterbrush-leaf.jpg","photos/hab-bitterbrush-slope.jpg","photos/hab-blackberry.jpg","photos/hab-bracken.jpg","photos/hab-cattail-head.jpg","photos/hab-cattail-marsh.jpg","photos/hab-ceanothus-leaf.jpg","photos/hab-ceanothus-patch.jpg","photos/hab-chokecherry.jpg","photos/hab-deer-pellets-fresh.jpg","photos/hab-deer-pellets-old.jpg","photos/hab-deer-rub.jpg","photos/hab-deer-track-dirt.jpg","photos/hab-deer-track-foothills.jpg","photos/hab-deer-trail-reeds.jpg","photos/hab-deer-trail-snow.jpg","photos/hab-dogwood-flowers.jpg","photos/hab-dogwood-stems.jpg","photos/hab-douglas-fir-stand.jpg","photos/hab-douglas-fir-tree.jpg","photos/hab-duck-tracks.jpg","photos/hab-elk-pellets.jpg","photos/hab-elk-rub.jpg","photos/hab-elk-tracks-shore.jpg","photos/hab-elk-trail-snow.jpg","photos/hab-elk-wallow.jpg","photos/hab-geese-stubble.jpg","photos/hab-grass-fir-edge.jpg","photos/hab-grouse-snow-roost.jpg","photos/hab-grouse-track-line.jpg","photos/hab-grouse-tracks-snow.jpg","photos/hab-grouse-wing-prints.jpg","photos/hab-huckleberry-berry.jpg","photos/hab-huckleberry-bush.jpg","photos/hab-kamloops-pond-farm.jpg","photos/hab-kamloops-sagebrush.jpg","photos/hab-kinnikinnick.jpg","photos/hab-lac-du-bois-grassland.jpg","photos/hab-lac-du-bois-potholes.jpg","photos/hab-moose-tracks-mud.jpg","photos/hab-moose-trail-snow.jpg","photos/hab-moose-willows.jpg","photos/hab-north-thompson-burn.jpg","photos/hab-osoyoos-wetland.jpg","photos/hab-pondweed.jpg","photos/hab-quail-vernon.jpg","photos/hab-sagebrush-bush.jpg","photos/hab-salal.jpg","photos/hab-salmonberry.jpg","photos/hab-saskatoon-berries.jpg","photos/hab-saskatoon-flowers.jpg","photos/hab-skunk-cabbage.jpg","photos/hab-snowberry.jpg","photos/hab-soopolallie.jpg","photos/hab-subalpine-forest.jpg","photos/hab-wells-gray-cutblock.jpg","photos/hab-willow-shrub.jpg","photos/hab-woods-rose-hips.jpg","photos/hab-woods-rose-slope.jpg","photos/dusky-grouse-hen.jpg","photos/dusky-grouse-male.jpg","photos/ruffed-grouse-hen.jpg","photos/sharp-tailed-grouse.jpg","photos/sharp-tailed-grouse-snow.jpg","photos/spruce-grouse-hen.jpg","photos/mallard-drake.jpg","photos/mallard-drake-flight.jpg","photos/mallard-hen.jpg","photos/pintail-drake.jpg","photos/pintail-drake-flight.jpg"], 'hunt-mentor-offline.html'];
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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Offline Maps downloads: straight to the network, the page stores them itself
  if (url.searchParams.has('hmdl')) { url.searchParams.delete('hmdl'); e.respondWith(fetch(url.href, { mode: 'cors', credentials: 'omit' })); return; }
  if (url.origin === self.location.origin) {
    if (/\/data\/layers\/manifest\.json$/.test(url.pathname)) { e.respondWith(networkFirst(req, DATA, 4000)); return; }
    if (/\.pmtiles$/.test(url.pathname)) { e.respondWith(pmtiles(req)); return; }
    if (/\/data\/(layers|spots)\//.test(url.pathname)) { e.respondWith(dataFirst(req)); return; }
    e.respondWith(shell(req));
    return;
  }
  if (url.hostname === 'tiles.openfreemap.org') {
    if (/\.pbf$/.test(url.pathname) || url.pathname.startsWith('/sprites/')) e.respondWith(tileFirst(req));
    else e.respondWith(networkFirst(req, TILES, 3500)); // tile index (TileJSON) and styles
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
    const res = await fetch(req);
    // a precache file that was skipped at install: keep it now (map code, vendor libraries, photos)
    if (res.ok && /\/(map|vendor|photos|seasons|harvest)\/[^/]+$|\/home\.js$|\/data\/migration\.json$/.test(new URL(req.url).pathname)) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
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
  const res = await fetch(req);
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
  try {
    const res = await fetch(req);
    if (res.ok) {
      const copy = res.clone(), path = new URL(req.url).pathname;
      caches.open(DATA).then(async (c) => {
        await c.put(req, copy);
        for (const k of await c.keys()) if (new URL(k.url).pathname === path && k.url !== req.url) c.delete(k); // older versions
      }).catch(() => {});
    }
    return res;
  } catch (err) {
    const old = await caches.match(req, { ignoreSearch: true, ignoreVary: true }); // an older version beats nothing offline
    if (old) return old;
    throw err;
  }
}

function networkFirst(req, cacheName, ms) {
  return new Promise((resolve, reject) => {
    let done = false;
    const fromCache = () => caches.match(req, MATCH);
    const timer = setTimeout(async () => { const hit = await fromCache(); if (hit && !done) { done = true; resolve(hit); } }, ms);
    fetch(req).then(async (res) => {
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

// PMTiles: byte ranges. Online and not saved: network. Saved (Offline Maps): cut the range from the saved file.
async function pmtiles(req) {
  const range = req.headers.get('range');
  const hit = await caches.match(req.url, MATCH) || (!navigator.onLine && await caches.match(req.url, { ignoreSearch: true, ignoreVary: true }));
  if (!hit) return fetch(req);
  if (!range) return hit;
  const m = /bytes=(\d+)-(\d*)/.exec(range);
  const blob = await hit.blob();
  if (!m) return new Response(blob, { status: 200, headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(blob.size) } });
  const start = +m[1], end = m[2] ? Math.min(+m[2], blob.size - 1) : blob.size - 1;
  if (start >= blob.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  const part = blob.slice(start, end + 1);
  return new Response(part, { status: 206, headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(part.size), 'Content-Range': `bytes ${start}-${end}/${blob.size}` } });
}
