/* Hunt Map plugin: terrain tools for hunters, all worked out on the phone from the terrain tiles (AWS terrarium DEM,
   digital elevation model: height = R * 256 + G + B / 256 - 32768). Works offline where the area was downloaded
   (offline.js saves the terrain tiles to zoom 12; these tools never need more).
     1. Slope steepness: raster overlay from the custom protocol hmter://slope/{z}/{x}/{y}
     2. Slope direction (aspect): hmter://aspect/{z}/{x}/{y}
     3. What can I see from here (viewshed): line of sight over terrain samples, drawn as an image overlay
     4. Sun and shade: hillshade lit from the real sun position for a time today, plus sunrise and sunset at the map centre
   Tiles: the decoded terrain comes from the shared contour DEM source (H.dem.getDemTile, same cache as hillshade and contours);
   slope maths and PNG encoding run in a small worker (OffscreenCanvas when the browser has it). Results are cached in memory.
   Only the tiles MapLibre asks for (the visible ones) are made, zoom 10 to 14 (higher zooms reuse zoom 14 tiles).
   The Terrain tiles join the Tools sheet by wrapping H.tools.toolsSheet (tools-main.js); without it a Terrain button is added.
   Sets on HuntMap: H.terrain { open(tool), stats, sunAt(date, lng, lat), viewshed(lngLat) }. */
import { esc, clamp, lon2x, lat2y, debounce, compass8 } from './util.js';

const ZMIN = 10, ZMAX = 14, DEMZ = 12; // overlay zoom range; terrain detail stops at 12 (about 24 m pixels here)
const SCHEME = 'hmter';
const D2R = Math.PI / 180, R2D = 180 / Math.PI, EARTH = 40075016.686;
const TRANSPARENT = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), (c) => c.charCodeAt(0)).buffer;
const TIP = '<span class="hmm-cert tip">Tip</span>';

export const SLOPE_CLASSES = [
  { min: 15, max: 25, color: '#f2c70c', label: '15 to 25°', say: 'Steady climb' },
  { min: 25, max: 30, color: '#f08c00', label: '25 to 30°', say: 'Steep' },
  { min: 30, max: 45, color: '#e03131', label: '30 to 45°', say: 'Very steep, avalanche terrain in snow' },
  { min: 45, max: 90, color: '#8e44d6', label: 'Over 45°', say: 'Cliffy, scrambling' },
];
export const ASPECT_COLORS = [ // N, NE, E, SE, S, SW, W, NW
  '#2f6fd6', '#21a6c7', '#3db36b', '#a8c83a', '#f2c70c', '#f08c00', '#e03131', '#9b4fd1',
];
const DIRS = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];

/* ---------- tile kernel: runs in the worker (as source text) or on the main thread as a fallback. Keep it self contained. ----------
   dem: Float32Array W x Hh of the DEM tile s/sx/sy. Output tile z/x/y (z >= s). Returns RGBA Uint8ClampedArray 256 x 256, or null if nothing is coloured. */
function terKernel(mode, dem, W, Hh, s, sx, sy, z, x, y, colors) {
  const N = 256, k = 2 ** (z - s), fx = x - sx * k, fy = y - sy * k, out = new Uint8ClampedArray(N * N * 4);
  const r2d = 180 / Math.PI, A = mode === 'slope' ? 150 : 125; // overlay alpha (0 to 255)
  const e = (u, v) => { // bilinear, clamped
    if (u < 0) u = 0; else if (u > W - 1) u = W - 1;
    if (v < 0) v = 0; else if (v > Hh - 1) v = Hh - 1;
    const x0 = u | 0, y0 = v | 0, x1 = x0 + 1 < W ? x0 + 1 : x0, y1 = y0 + 1 < Hh ? y0 + 1 : y0, ax = u - x0, ay = v - y0;
    const r0 = y0 * W, r1 = y1 * W;
    return (dem[r0 + x0] * (1 - ax) + dem[r0 + x1] * ax) * (1 - ay) + (dem[r1 + x0] * (1 - ax) + dem[r1 + x1] * ax) * ay;
  };
  const pal = colors.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  let any = false;
  for (let j = 0; j < N; j++) {
    const Y = (y + (j + 0.5) / N) / 2 ** z, lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * Y)));
    const mpp = 40075016.686 * Math.cos(lat) / (W * 2 ** s); // metres per DEM pixel on this row
    const v = ((fy + (j + 0.5) / N) / k) * Hh - 0.5;
    const vU = v - 1 < 0 ? 0 : v - 1, vD = v + 1 > Hh - 1 ? Hh - 1 : v + 1;
    for (let i = 0; i < N; i++) {
      const u = ((fx + (i + 0.5) / N) / k) * W - 0.5;
      const uL = u - 1 < 0 ? 0 : u - 1, uR = u + 1 > W - 1 ? W - 1 : u + 1;
      const gx = (e(uR, v) - e(uL, v)) / ((uR - uL) * mpp); // rise per metre going east
      const gs = (e(u, vD) - e(u, vU)) / ((vD - vU) * mpp); // rise per metre going south
      if (!(gx === gx && gs === gs)) continue; // NaN
      const deg = Math.atan(Math.sqrt(gx * gx + gs * gs)) * r2d;
      let c = -1;
      if (mode === 'slope') c = deg < 15 ? -1 : deg < 25 ? 0 : deg < 30 ? 1 : deg < 45 ? 2 : 3;
      else if (deg >= 8) { // aspect: the way the slope faces (downhill), from north, clockwise
        const az = (Math.atan2(-gx, gs) * r2d + 360) % 360;
        c = Math.round(az / 45) % 8;
      }
      if (c < 0) continue;
      const o = (j * N + i) * 4, p = pal[c];
      out[o] = p[0]; out[o + 1] = p[1]; out[o + 2] = p[2]; out[o + 3] = A; any = true;
    }
  }
  return any ? out : null;
}

const WORKER_SRC = `${terKernel.toString()}
const canOff = typeof OffscreenCanvas !== 'undefined';
onmessage = async (ev) => {
  const m = ev.data, t0 = performance.now();
  let px = null;
  try { px = terKernel(m.mode, m.dem, m.w, m.h, m.s, m.sx, m.sy, m.z, m.x, m.y, m.colors); } catch (err) { postMessage({ id: m.id, err: String(err) }); return; }
  const t1 = performance.now();
  if (!px) { postMessage({ id: m.id, empty: true, ms: t1 - t0, enc: 0 }); return; }
  if (canOff) {
    try {
      const c = new OffscreenCanvas(256, 256);
      c.getContext('2d').putImageData(new ImageData(px, 256, 256), 0, 0);
      const buf = await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer();
      postMessage({ id: m.id, png: buf, ms: t1 - t0, enc: performance.now() - t1 }, [buf]); return;
    } catch (err) { /* fall through: main thread encodes */ }
  }
  postMessage({ id: m.id, rgba: px.buffer, ms: t1 - t0, enc: 0 }, [px.buffer]);
};`;

let H, map;
const ui = { slope: false, aspect: false, sun: false, view: null }; // what is on
const stats = []; // per tile timing, newest last: { key, dem, calc, enc, total, where }

// ---------- workers: two when the phone has the cores, so a screenful of tiles is not queued behind one ----------
let pool = null, wid = 0, rr = 0;
const waits = new Map();
function getPool() {
  if (pool !== null) return pool;
  try {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    const n = (navigator.hardwareConcurrency || 2) >= 4 ? 2 : 1;
    pool = [];
    for (let i = 0; i < n; i++) {
      const w = new Worker(url);
      w.onmessage = (ev) => { const f = waits.get(ev.data.id); if (f) { waits.delete(ev.data.id); f(ev.data); } };
      w.onerror = (err) => { console.warn('Terrain worker failed, using the main thread', err.message || err); pool = false; for (const f of waits.values()) f({ err: 'worker' }); waits.clear(); };
      pool.push(w);
    }
  } catch (err) { pool = false; }
  return pool;
}
function inWorker(msg) {
  const ws = getPool();
  if (!ws) return Promise.resolve({ err: 'worker' });
  const id = ++wid, w = ws[rr++ % ws.length];
  return new Promise((res) => { waits.set(id, res); w.postMessage(Object.assign({ id }, msg)); });
}
function canvasPng(rgba) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), 256, 256), 0, 0);
  return new Promise((res) => c.toBlob((b) => (b ? b.arrayBuffer().then(res) : res(TRANSPARENT)), 'image/png'));
}

// ---------- tile cache and protocol ----------
const cache = new Map(), inflight = new Map(), CACHE_MAX = 220;
function remember(key, buf) { cache.delete(key); cache.set(key, buf); if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value); }

async function makeTile(mode, z, x, y) {
  const key = `${mode}/${z}/${x}/${y}`;
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    const t0 = performance.now();
    const s = Math.min(z, DEMZ), k = 2 ** (z - s), sx = Math.floor(x / k), sy = Math.floor(y / k);
    const tile = await H.dem.getDemTile(s, sx, sy);
    const t1 = performance.now();
    let main = 0, m0 = performance.now();
    const msg = { mode, dem: tile.data, w: tile.width, h: tile.height, s, sx, sy, z, x, y, colors: mode === 'slope' ? SLOPE_CLASSES.map((c) => c.color) : ASPECT_COLORS };
    const rp = inWorker(msg); main += performance.now() - m0;
    let r = await rp, where = 'worker', buf;
    if (r.err) { // no worker: same maths on the main thread (about 5 to 15 ms a tile), PNG made by the browser off the main thread
      where = 'main';
      const a = performance.now(), px = terKernel(mode, msg.dem, msg.w, msg.h, s, sx, sy, z, x, y, msg.colors), b = performance.now();
      r = { ms: b - a, enc: 0 }; main += b - a;
      buf = px ? await canvasPng(px.buffer) : TRANSPARENT;
    } else buf = r.empty ? TRANSPARENT : r.png || await canvasPng(r.rgba);
    stats.push({ key, dem: +(t1 - t0).toFixed(1), calc: +r.ms.toFixed(1), enc: +(r.enc || 0).toFixed(1), main: +main.toFixed(2), total: +(performance.now() - t0).toFixed(1), where, empty: buf === TRANSPARENT });
    if (stats.length > 300) stats.shift();
    remember(key, buf);
    return buf;
  })();
  inflight.set(key, p);
  try { return await p; } finally { inflight.delete(key); }
}

function addProtocol() {
  const ml = H.maplibregl;
  if (addProtocol.done) return; addProtocol.done = true;
  ml.addProtocol(SCHEME, async (params) => {
    const m = /^hmter:\/\/(slope|aspect)\/(\d+)\/(\d+)\/(\d+)/.exec(params.url);
    if (!m) throw new Error('Bad terrain tile URL');
    const z = +m[2];
    if (z < ZMIN || z > ZMAX) return { data: TRANSPARENT.slice(0) };
    try { return { data: (await makeTile(m[1], z, +m[3], +m[4])).slice(0) }; } catch (err) { return { data: TRANSPARENT.slice(0) }; } // no terrain tile here (offline, not downloaded)
  });
}

// ---------- slope and aspect overlays ----------
const beforeFills = () => (map.getLayer(H.anchors.fills) ? H.anchors.fills : undefined);
function setRaster(mode, on) {
  const id = `ter-${mode}`;
  if (on) {
    addProtocol();
    if (!map.getSource(id)) map.addSource(id, { type: 'raster', tiles: [`${SCHEME}://${mode}/{z}/{x}/{y}`], tileSize: 256, minzoom: ZMIN, maxzoom: ZMAX });
    if (!map.getLayer(id)) map.addLayer({ id, type: 'raster', source: id, minzoom: ZMIN, paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, beforeFills());
    if (map.getZoom() < ZMIN) H.toast('Zoom in closer to see this. It shows from zoom 10 and up.', 3500);
  } else {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  }
  ui[mode] = on;
  H.overlayChip && H.overlayChip(id, on ? (mode === 'slope' ? 'Slope steepness' : 'Slope direction') : '', () => { setRaster(mode, false); legend(); });
  legend();
}

/* small key on the map while slope or slope direction is on */
let legendEl = null;
function legend() {
  if (!legendEl) {
    legendEl = document.createElement('div'); legendEl.className = 'ter-legend'; legendEl.setAttribute('aria-hidden', 'true');
    H.els.bar.parentNode.appendChild(legendEl);
  }
  const parts = [];
  if (ui.slope) parts.push(`<div class="ter-lg-row"><b>Slope</b>${SLOPE_CLASSES.map((c) => `<i style="background:${c.color}"></i><span>${c.min === 45 ? '45°+' : `${c.min}°`}</span>`).join('')}</div>`);
  if (ui.aspect) parts.push(`<div class="ter-lg-row"><b>Faces</b>${ASPECT_COLORS.map((c, i) => `<i style="background:${c}"></i><span>${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][i]}</span>`).join('')}</div>`);
  legendEl.innerHTML = parts.join('');
  legendEl.hidden = !parts.length;
  const chips = H.els.bar.parentNode.querySelector('.hmt-chips'); // above the "tap to clear" chips, so it never covers buttons
  if (chips) { legendEl.classList.add('in-chips'); chips.appendChild(legendEl); }
}

// ---------- sun position (compact NOAA / SunCalc method, good to about a degree) ----------
export function sunAt(date, lng, lat) {
  const d = date / 864e5 - 0.5 + 2440588 - 2451545;
  const M = D2R * (357.5291 + 0.98560028 * d);
  const C = D2R * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + D2R * 102.9372 + Math.PI, e = D2R * 23.4397;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)), ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const Hr = D2R * (280.16 + 360.9856235 * d) + D2R * lng - ra, phi = D2R * lat;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(Hr));
  const az = Math.atan2(Math.sin(Hr), Math.cos(Hr) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)); // from south, west positive
  return { alt: alt * R2D, az: ((az * R2D + 180) % 360 + 360) % 360 }; // az from north, clockwise
}
const TZ = () => (window.HuntMentor && window.HuntMentor.TZ) || 'America/Vancouver';
const hhmm = (dt) => (dt ? (window.HuntMentor && window.HuntMentor.hhmm ? window.HuntMentor.hhmm(dt) : dt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })) : 'none');
function sunTimes(lng, lat) {
  const now = new Date(), noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const HM = window.HuntMentor;
  if (HM && HM.sunEvent) { const rise = HM.sunEvent(noon, lat, lng, true), set = HM.sunEvent(noon, lat, lng, false); if (rise && set) return { rise, set }; }
  // fallback: scan today minute by minute for the sun crossing -0.833° (refraction and the sun's half width)
  let rise = null, set = null, prev = null;
  for (let m = 0; m <= 1440; m += 2) {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, m), a = sunAt(t, lng, lat).alt + 0.833;
    if (prev != null) { if (prev < 0 && a >= 0 && !rise) rise = t; if (prev >= 0 && a < 0) set = t; }
    prev = a;
  }
  return rise && set ? { rise, set } : null;
}

let sunTime = null, sunSaved = null, sunRaf = 0;
function setSun(on) {
  const base = ['hillshade', 'sat-shade'].filter((id) => map.getLayer(id));
  if (on) {
    if (!map.getLayer('ter-sun')) {
      map.addLayer({ id: 'ter-sun', type: 'hillshade', source: 'dem-hill', paint: {
        'hillshade-method': 'basic', 'hillshade-illumination-anchor': 'map', 'hillshade-exaggeration': 0.85,
        'hillshade-shadow-color': 'rgba(18,24,48,0.62)', 'hillshade-highlight-color': 'rgba(255,226,140,0.42)', 'hillshade-accent-color': 'rgba(0,0,0,0)',
      } }, beforeFills());
    }
    // the normal relief is lit from the northwest; flatten it while the real sun lights the map, put it back after
    if (!sunSaved) { sunSaved = {}; for (const id of base) { sunSaved[id] = map.getPaintProperty(id, 'hillshade-exaggeration'); map.setPaintProperty(id, 'hillshade-exaggeration', 0); } }
    if (!sunTime) sunTime = defaultSunTime();
    applySun();
  } else {
    if (map.getLayer('ter-sun')) map.removeLayer('ter-sun');
    if (sunSaved) { for (const id of Object.keys(sunSaved)) if (map.getLayer(id)) map.setPaintProperty(id, 'hillshade-exaggeration', sunSaved[id]); sunSaved = null; }
  }
  ui.sun = on;
  H.overlayChip && H.overlayChip('ter-sun', on ? `Sun at ${hhmm(sunTime)}` : '', () => setSun(false));
}
function defaultSunTime() {
  const c = map.getCenter(), t = sunTimes(c.lng, c.lat), now = new Date();
  if (!t) return now;
  return now < t.rise || now > t.set ? new Date(+t.rise + 30 * 6e4) : now;
}
function applySun() {
  if (sunRaf) return;
  sunRaf = requestAnimationFrame(() => {
    sunRaf = 0;
    if (!map.getLayer('ter-sun')) return;
    const c = map.getCenter(), s = sunAt(sunTime, c.lng, c.lat);
    map.setPaintProperty('ter-sun', 'hillshade-illumination-direction', Math.round(s.az) % 360);
    map.setPaintProperty('ter-sun', 'hillshade-illumination-altitude', clamp(Math.round(s.alt), 2, 90)); // a sun right on the horizon still lights the faces turned to it
    H.overlayChip && H.overlayChip('ter-sun', `Sun at ${hhmm(sunTime)}`, () => setSun(false));
  });
}

// ---------- viewshed: what can I see from here ----------
const VS = { src: 'ter-view', img: 'ter-view-img', pick: false, busy: 0 };
const eyeH = () => clamp(+H.prefs.terEye || 1.7, 1, 15);
const radiusM = () => clamp(+H.prefs.terRadius || 2000, 1000, 3000);
const imp = () => H.units.system === 'imperial';
const fmtEye = (m) => (imp() ? `${Math.round(m * 3.28084)} ft` : `${(+m).toFixed(1)} m`);
const fmtR = (m) => (imp() ? `${(m / 1609.344).toFixed(1)} mi` : `${m / 1000} km`);
const TARGET = 1; // what you look for stands about 1 m tall (a deer's back); bare ground counts when 1 m above it shows

/* Terrain sampler over z12 tiles in global pixel coordinates (256 px tiles). */
async function demGrid(cx, cy, rPx) {
  const W = 256, x0 = Math.floor((cx - rPx - 2) / W), x1 = Math.floor((cx + rPx + 2) / W), y0 = Math.floor((cy - rPx - 2) / W), y1 = Math.floor((cy + rPx + 2) / W);
  const tiles = new Map(), jobs = [];
  for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) jobs.push(H.dem.getDemTile(DEMZ, tx, ty).then((t) => tiles.set(`${tx}/${ty}`, t), () => {}));
  await Promise.all(jobs);
  const val = (gx, gy) => {
    const tx = Math.floor(gx / W), ty = Math.floor(gy / W), t = tiles.get(`${tx}/${ty}`);
    if (!t) return NaN;
    return t.data[(gy - ty * W) * t.width + (gx - tx * W)];
  };
  return (px, py) => { // bilinear at pixel centres
    const u = px - 0.5, v = py - 0.5, gx = Math.floor(u), gy = Math.floor(v), ax = u - gx, ay = v - gy;
    return (val(gx, gy) * (1 - ax) + val(gx + 1, gy) * ax) * (1 - ay) + (val(gx, gy + 1) * (1 - ax) + val(gx + 1, gy + 1) * ax) * ay;
  };
}
const yield_ = () => new Promise((r) => setTimeout(r, 0));

export async function viewshed(ll) {
  const run = ++VS.busy, t0 = performance.now();
  const [lng, lat] = ll, Z = DEMZ, scale = 256 * 2 ** Z;
  const cx = lon2x(lng, Z) * 256, cy = lat2y(lat, Z) * 256;
  const mpp = EARTH * Math.cos(lat * D2R) / scale, R = radiusM(), rPx = Math.ceil(R / mpp);
  ui.view = { ll, state: 'busy' };
  drawViewMarker(ll, R);
  const elev = await demGrid(cx, cy, rPx);
  if (run !== VS.busy) return null;
  const h0 = elev(cx, cy);
  if (!isFinite(h0)) { ui.view = null; clearView(); H.toast('No terrain data here. Go online or download this area first.', 4000); return null; }
  const eye = h0 + eyeH();
  // rays one terrain pixel apart at the edge; samples one pixel apart along each ray
  const rays = clamp(Math.ceil(2 * Math.PI * rPx), 360, 1440), steps = rPx;
  const vis = new Uint8Array(rays * (steps + 1));
  let budget = performance.now(), mainMs = 0, longest = 0;
  for (let r = 0; r < rays; r++) {
    const a = (r / rays) * 2 * Math.PI, dx = Math.sin(a), dy = -Math.cos(a);
    let maxG = -Infinity; vis[r * (steps + 1)] = 1;
    for (let k = 1; k <= steps; k++) {
      const d = k * mpp, h = elev(cx + dx * k, cy + dy * k) - (d * d) / (2 * 6371000) * 0.87; // earth curve and light bend
      if (!(h === h)) break;
      const g = (h - eye) / d;
      if ((h + TARGET - eye) / d >= maxG) vis[r * (steps + 1) + k] = 1;
      if (g > maxG) maxG = g;
    }
    if (performance.now() - budget > 30) { const dt = performance.now() - budget; mainMs += dt; longest = Math.max(longest, dt); await yield_(); if (run !== VS.busy) return null; budget = performance.now(); }
  }
  // paint a grid (one cell per terrain pixel, in map pixel space so the image lines up exactly)
  const n = 2 * rPx + 1, c = document.createElement('canvas'); c.width = c.height = n;
  const ctx = c.getContext('2d'), img = ctx.createImageData(n, n), px = img.data;
  let seen = 0, all = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const dx = i - rPx, dy = j - rPx, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rPx) continue;
      let a = Math.atan2(dx, -dy); if (a < 0) a += 2 * Math.PI;
      const r = Math.round((a / (2 * Math.PI)) * rays) % rays, k = Math.round(dist), o = (j * n + i) * 4;
      all++;
      if (vis[r * (steps + 1) + k]) { px[o] = 240; px[o + 1] = 70; px[o + 2] = 150; px[o + 3] = 105; seen++; } // visible: soft pink (no slope or aspect colour uses it)
      else { px[o] = 30; px[o + 1] = 34; px[o + 2] = 60; px[o + 3] = 46; } // hidden: light shadow
    }
    if (performance.now() - budget > 30) { const dt = performance.now() - budget; mainMs += dt; longest = Math.max(longest, dt); await yield_(); if (run !== VS.busy) return null; budget = performance.now(); }
  }
  ctx.putImageData(img, 0, 0);
  const tail = performance.now() - budget; mainMs += tail; longest = Math.max(longest, tail);
  const g2ll = (gx, gy) => { const X = gx / scale, Y = gy / scale; return [X * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * Y))) * R2D]; };
  const L = cx - rPx - 0.5, T = cy - rPx - 0.5, Rr = L + n, B = T + n;
  const coords = [g2ll(L, T), g2ll(Rr, T), g2ll(Rr, B), g2ll(L, B)], url = c.toDataURL('image/png');
  const src = map.getSource(VS.img);
  if (src && src.updateImage) src.updateImage({ url, coordinates: coords });
  else {
    map.addSource(VS.img, { type: 'image', url, coordinates: coords });
    map.addLayer({ id: VS.img, type: 'raster', source: VS.img, paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 } }, map.getLayer(H.anchors.lines) ? H.anchors.lines : undefined);
  }
  const res = { ll, pct: Math.round((seen / Math.max(all, 1)) * 100), ms: Math.round(performance.now() - t0), mainMs: Math.round(mainMs), longest: Math.round(longest), rays, steps, ground: h0 };
  ui.view = Object.assign({ state: 'done' }, res);
  H.overlayChip && H.overlayChip('ter-view', 'What I can see', clearView);
  return res;
}
function drawViewMarker(ll, R) {
  const ring = [];
  for (let i = 0; i <= 96; i++) { // circle of R metres
    const a = (i / 96) * 2 * Math.PI, dLat = (R * Math.cos(a)) / 111320, dLng = (R * Math.sin(a)) / (111320 * Math.cos(ll[1] * D2R));
    ring.push([ll[0] + dLng, ll[1] + dLat]);
  }
  const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { k: 'ring' }, geometry: { type: 'LineString', coordinates: ring } }, { type: 'Feature', properties: { k: 'eye' }, geometry: { type: 'Point', coordinates: ll } }] };
  const src = map.getSource(VS.src);
  if (src) { src.setData(fc); return; }
  map.addSource(VS.src, { type: 'geojson', data: fc });
  const before = map.getLayer(H.anchors.symbols) ? H.anchors.symbols : undefined;
  map.addLayer({ id: 'ter-view-ring', type: 'line', source: VS.src, filter: ['==', ['get', 'k'], 'ring'], paint: { 'line-color': '#d6336c', 'line-width': 2, 'line-dasharray': [2, 1.5] } }, before);
  map.addLayer({ id: 'ter-view-eye', type: 'circle', source: VS.src, filter: ['==', ['get', 'k'], 'eye'], paint: { 'circle-radius': 7, 'circle-color': '#d6336c', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 } }, before);
}
function clearView() {
  VS.busy++; ui.view = null; VS.pick = false;
  for (const id of ['ter-view-eye', 'ter-view-ring', VS.img]) if (map.getLayer(id)) map.removeLayer(id);
  for (const id of [VS.src, VS.img]) if (map.getSource(id)) map.removeSource(id);
  H.overlayChip && H.overlayChip('ter-view', '', () => {});
}

// ---------- sheets ----------
const IC = {
  slope: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2.5 20 20 5.5V20Z" fill="#f08c00" fill-opacity=".35"/><path d="M14 20a6 6 0 0 0-2.3-4.6"/></svg>',
  aspect: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 4.5 14.5 12h-5Z" fill="#2f6fd6" stroke="none"/><path d="M12 19.5 9.5 12h5Z" fill="#f2c70c" stroke="none"/></svg>',
  view: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1.8 12S5.5 5.5 12 5.5 22.2 12 22.2 12 18.5 18.5 12 18.5 1.8 12 1.8 12Z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4" fill="#f2c70c"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
};
const sw = (key, on, title, sub) => `<label class="hmm-sw-row"><span>${title}<small>${sub}</small></span><input type="checkbox" data-ter-sw="${key}" ${on ? 'checked' : ''}><i class="hmm-switch"></i></label>`;
const back = '<div class="hmm-btnrow"><button class="hmm-btn2" data-ter="tools">Back to Tools</button></div>';
const tileBtn = (act, icon, label, sub, on) => `<button class="hmt-tile${on ? ' ter-on' : ''}" data-ter="${act}">${icon}<span>${esc(label)}<small>${esc(sub)}</small></span></button>`;

export function sectionHtml() {
  return `<h3 class="hmm-h">Terrain</h3>
    <div class="hmt-tiles ter-tiles">${tileBtn('slope', IC.slope, 'Slope steepness', ui.slope ? 'On' : 'Colours by angle', ui.slope)}${tileBtn('aspect', IC.aspect, 'Slope direction', ui.aspect ? 'On' : 'Which way it faces', ui.aspect)}${tileBtn('view', IC.view, 'What can I see', ui.view ? 'On' : 'From a spot', !!ui.view)}${tileBtn('sun', IC.sun, 'Sun and shade', ui.sun ? 'On' : 'Light by time today', ui.sun)}</div>`;
}
function wire(body) {
  body.querySelectorAll('[data-ter]').forEach((b) => b.onclick = () => openTool(b.dataset.ter));
}

function openTool(tool) {
  if (tool === 'tools') { (H.tools && H.tools.toolsSheet ? H.tools.toolsSheet : () => H.closeSheet())(); return; }
  if (tool === 'menu') return terrainSheet();
  ({ slope: slopeSheet, aspect: aspectSheet, view: viewSheet, sun: sunSheet })[tool]();
}
function terrainSheet() { // used by the Terrain button when the Tools sheet cannot take the section
  const body = H.openSheet({ title: 'Terrain', html: `${sectionHtml()}<p class="hmm-muted">Worked out on your phone from the terrain tiles. Works offline in areas you downloaded.</p>` });
  wire(body);
}

function slopeSheet() {
  const body = H.openSheet({ title: 'Slope steepness', bar: 'tools', html: `
    ${sw('slope', ui.slope, 'Show slope steepness', 'Colours the map by how steep the ground is')}
    <div class="ter-key">${SLOPE_CLASSES.map((c) => `<div><i style="background:${c.color}"></i><b>${c.label}</b><span>${c.say}</span></div>`).join('')}<div><i class="ter-clear"></i><b>Under 15°</b><span>No colour: easy walking</span></div></div>
    <ul class="ter-list">
      <li>Steep slopes mean hard walking, slow packing out, and a tough drag for an animal you shoot. ${TIP}</li>
      <li>Avalanche terrain in snow is about 30 to 45° (red). Slides can start above you, so stay off and below red slopes after heavy snow. ${TIP}</li>
      <li>Benches and flats (no colour) on a coloured hillside are where animals often bed and feed. ${TIP}</li>
    </ul>
    <p class="hmm-muted">Worked out from terrain about 24 m apart, so small cliffs, cut banks and rock bands do not show. Not an avalanche forecast: check Avalanche Canada before going into snowy mountains.</p>${back}` });
  wireSheet(body);
}
function aspectSheet() {
  const body = H.openSheet({ title: 'Slope direction', bar: 'tools', html: `
    ${sw('aspect', ui.aspect, 'Show slope direction', 'Colours each slope by the way it faces (aspect)')}
    <div class="ter-compass">${compassSvg()}</div>
    <ul class="ter-list">
      <li>South and west faces get the most sun: snow melts first and grass greens up early in spring, which draws bears, deer and elk. ${TIP}</li>
      <li>North faces hold snow and shade longer, stay cooler and often have thicker timber: good bedding cover on hot days. ${TIP}</li>
      <li>East faces get the first morning sun, west faces the last evening sun. ${TIP}</li>
    </ul>
    <p class="hmm-muted">Flat and gentle ground (under 8°) gets no colour. Worked out from terrain about 24 m apart.</p>${back}` });
  wireSheet(body);
}
function compassSvg() {
  const seg = ASPECT_COLORS.map((c, i) => {
    const a0 = (i * 45 - 22.5 - 90) * D2R, a1 = (i * 45 + 22.5 - 90) * D2R, r = 46, cx = 60, cy = 60;
    const p = (a, rr) => `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
    const am = (i * 45 - 90) * D2R;
    return `<path d="M${p(a0, 16)}L${p(a0, r)}A${r} ${r} 0 0 1 ${p(a1, r)}L${p(a1, 16)}A16 16 0 0 0 ${p(a0, 16)}Z" fill="${c}" opacity=".85"/><text x="${(cx + 56 * Math.cos(am)).toFixed(1)}" y="${(cy + 56 * Math.sin(am) + 4).toFixed(1)}" text-anchor="middle">${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][i]}</text>`;
  }).join('');
  return `<svg viewBox="-8 -8 136 136" width="170" height="170" role="img" aria-label="Compass key: ${DIRS.map((d, i) => `${d} faces ${['blue', 'teal', 'green', 'lime', 'yellow', 'orange', 'red', 'purple'][i]}`).join(', ')}">${seg}</svg>`;
}

function viewSheet() {
  const v = ui.view;
  const body = H.openSheet({ title: 'What can I see from here', bar: 'tools', html: `
    <p>Pick where you would stand. Pink shows the ground you can likely see. Shaded ground is hidden behind hills.</p>
    <div class="hmt-tiles">
      <button class="hmt-tile" data-v="tap">${IC.view}<span>Tap the map<small>Pick a spot</small></span></button>
      <button class="hmt-tile" data-v="gps">${H.icons.locate || IC.view}<span>My location<small>GPS (Global Positioning System)</small></span></button>
      <button class="hmt-tile" data-v="centre">${IC.view}<span>Map centre<small>Under the cross</small></span></button>
    </div>
    <label class="hmm-range"><span>Eye height <b data-out="eye">${fmtEye(eyeH())}</b></span><input type="range" min="1" max="15" step="0.1" value="${eyeH()}" data-in="eye" aria-label="Eye height"></label>
    <p class="hmm-muted">Standing eyes are about 1.7 m (5 ft 7 in) up. A tree stand puts you about 4 to 6 m (13 to 20 ft) up.</p>
    <h3 class="hmm-h">How far to check</h3>
    <div class="hmm-seg" data-in="radius">${[1000, 2000, 3000].map((r) => `<button data-v="${r}" class="${radiusM() === r ? 'on' : ''}">${fmtR(r)}</button>`).join('')}</div>
    <div data-out="res">${v && v.state === 'done' ? resultHtml(v) : ''}</div>
    <ul class="ter-list">
      <li>Worked out from bare ground height only: trees, brush and buildings are not included, so you will see less in timber. ${TIP}</li>
      <li>It looks for something about 1 m tall (a deer's back) standing on the ground. ${TIP}</li>
      <li>Use it to pick glassing spots that see a lot of open ground, and to plan a stalk that stays out of sight. ${TIP}</li>
    </ul>
    ${v ? '<div class="hmm-btnrow"><button class="hmm-btn2" data-v="clear">Clear from the map</button></div>' : ''}${back}` });
  wireSheet(body);
  const eye = body.querySelector('[data-in="eye"]'), out = body.querySelector('[data-out="eye"]');
  eye.oninput = () => { out.textContent = fmtEye(+eye.value); };
  eye.onchange = () => { H.prefs.terEye = +(+eye.value).toFixed(1); H.savePrefs(); if (ui.view) runView(ui.view.ll, body); };
  body.querySelectorAll('[data-in="radius"] button').forEach((b) => b.onclick = () => {
    H.prefs.terRadius = +b.dataset.v; H.savePrefs();
    body.querySelectorAll('[data-in="radius"] button').forEach((x) => x.classList.toggle('on', x === b));
    if (ui.view) runView(ui.view.ll, body);
  });
  body.querySelectorAll('[data-v]').forEach((b) => { if (b.closest('[data-in]')) return; b.onclick = () => {
    const a = b.dataset.v;
    if (a === 'clear') { clearView(); viewSheet(); return; }
    if (a === 'tap') { VS.pick = true; H.closeSheet(); H.toast('Tap the map where you would stand.', 4000); return; }
    let ll;
    if (a === 'gps') { const p = H.lastPosition; if (!p) { H.toast('No GPS fix yet. Tap the location button first, then try again.', 4000); return; } ll = [p.lng, p.lat]; }
    else { const c = map.getCenter(); ll = [c.lng, c.lat]; }
    runView(ll, body);
  }; });
}
function resultHtml(v) {
  return `<div class="hmm-kv"><span>You can likely see</span><b>${v.pct}% of the circle</b></div><p class="hmm-muted">From ${esc(H.units.coord(v.ll[0], v.ll[1]))}, ground ${H.units.elev(Math.round(v.ground))}. Worked out in ${(v.ms / 1000).toFixed(1)} s.</p>`;
}
async function runView(ll, body) {
  const out = body && body.querySelector('[data-out="res"]');
  if (out) out.innerHTML = '<p class="hmm-muted">Checking the lines of sight</p>';
  if (!body) H.toast('Checking the lines of sight', 2000);
  let r = null;
  try { r = await viewshed(ll); } catch (err) { console.warn('Viewshed', err); H.toast('Could not check here. Terrain data is missing.', 4000); }
  if (!r) return;
  if (out && out.isConnected) out.innerHTML = resultHtml(r);
  else H.toast(`Pink is what you can likely see: ${r.pct}% of the circle. Trees not included.`, 4500);
  H.emit && H.emit('terrain', { tool: 'view', result: r });
}

function sunSheet() {
  const c = map.getCenter(), t = sunTimes(c.lng, c.lat);
  if (!sunTime) sunTime = defaultSunTime();
  const min = t ? Math.round(t.rise / 6e4) : Math.round(Date.now() / 6e4) - 360, max = t ? Math.round(t.set / 6e4) : min + 720;
  let onMove = null;
  const body = H.openSheet({ title: 'Sun and shade', bar: 'tools', modal: false, onClose: () => { if (onMove) map.off('moveend', onMove); }, html: `
    ${sw('sun', ui.sun, 'Light the map by the real sun', 'Bright slopes face the sun, dark ones are in shade')}
    <label class="hmm-range"><span>Time today <b data-out="time">${sunLabel()}</b></span><input type="range" min="${min}" max="${max}" step="5" value="${clamp(Math.round(sunTime / 6e4), min, max)}" data-in="time" aria-label="Time today"></label>
    <div class="ter-3btn"><button class="hmm-btn2" data-s="rise">Sunrise</button><button class="hmm-btn2" data-s="now">Now</button><button class="hmm-btn2" data-s="set">Sunset</button></div>
    <div data-out="times">${timesHtml(t)}</div>
    <p>On cold mornings deer often bed where the first sun hits, then move into shade as it warms up. ${TIP}</p>
    <details class="ter-more"><summary>More about this tool</summary>
      <ul class="ter-list"><li>Glass sunny faces early and shady timber in the heat of the day. ${TIP}</li>
      <li>Lights each slope by the sun angle. Long shadows thrown by a ridge onto the next valley are not drawn.</li>
      <li>Sun times are for the map centre, Pacific time.</li></ul></details>${back}` });
  wireSheet(body);
  const inp = body.querySelector('[data-in="time"]'), lab = body.querySelector('[data-out="time"]');
  const set = (ms) => { sunTime = new Date(ms); inp.value = clamp(Math.round(ms / 6e4), min, max); lab.textContent = sunLabel(); if (!ui.sun) { setSun(true); body.querySelector('[data-ter-sw="sun"]').checked = true; } else applySun(); };
  inp.oninput = () => set(+inp.value * 6e4);
  body.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => set(b.dataset.s === 'now' ? Date.now() : b.dataset.s === 'rise' ? min * 6e4 : max * 6e4));
  // sun times follow the map centre while this sheet is open (removed by onClose)
  onMove = debounce(() => {
    const out = body.querySelector('[data-out="times"]');
    if (!out) return;
    const cc = map.getCenter(); out.innerHTML = timesHtml(sunTimes(cc.lng, cc.lat)); lab.textContent = sunLabel(); applySun();
  }, 300);
  map.on('moveend', onMove);
}
function sunLabel() {
  const c = map.getCenter(), s = sunAt(sunTime, c.lng, c.lat);
  if (s.alt < -2) return `${hhmm(sunTime)}, sun down`;
  return s.alt < 1 ? `${hhmm(sunTime)}, sun on the horizon in the ${compass8(s.az)}` : `${hhmm(sunTime)}, sun in the ${compass8(s.az)}, ${Math.round(s.alt)}° up`;
}
function timesHtml(t) {
  return t ? `<div class="hmm-kv"><span>Sunrise and sunset at the map centre</span><b>${hhmm(t.rise)} and ${hhmm(t.set)}</b></div>` : '<p class="hmm-muted">The sun does not rise or set here today.</p>';
}

function wireSheet(body) {
  wire(body);
  body.querySelectorAll('[data-ter-sw]').forEach((i) => i.onchange = () => {
    const k = i.dataset.terSw;
    if (k === 'sun') setSun(i.checked); else setRaster(k, i.checked);
  });
}

// ---------- Tools sheet hook ----------
function hookTools() {
  const tools = H.tools, orig = tools && tools.toolsSheet;
  if (typeof orig !== 'function') {
    H.addButton({ id: 'ter-btn', icon: IC.slope, label: 'Terrain tools', where: 'right', onClick: terrainSheet });
    return;
  }
  const wrapped = (...a) => {
    const r = orig.apply(tools, a);
    const body = H.els && H.els.sheetB;
    if (body && !body.querySelector('.ter-tiles')) {
      const box = document.createElement('div'); box.innerHTML = sectionHtml();
      const files = [...body.querySelectorAll('h3.hmm-h')].find((h) => /map files/i.test(h.textContent));
      for (const n of [...box.childNodes]) body.insertBefore(n, files || null);
      wire(body);
    }
    return r;
  };
  tools.toolsSheet = wrapped;
  H.setBarAction('tools', wrapped);
}

function loadCss() {
  const href = new URL('./terrain.css', import.meta.url).href;
  if ([...document.styleSheets].some((s) => s.href === href)) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
}

export default function init(api) {
  H = api; map = H.map;
  loadCss();
  hookTools();
  H.onClick((e) => {
    if (!VS.pick) return false;
    VS.pick = false;
    runView([e.lngLat.lng, e.lngLat.lat], null);
    return true;
  });
  H.on('units', () => { if (ui.view && ui.view.state === 'done') H.overlayChip && H.overlayChip('ter-view', 'What I can see', clearView); });
  H.terrain = { open: openTool, stats, sunAt, viewshed, sunTimes, setSlope: (on) => setRaster('slope', on), setAspect: (on) => setRaster('aspect', on), setSun, clearView, cache };
}
