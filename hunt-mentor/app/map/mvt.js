/* Tiny Mapbox Vector Tile reader for point queries on our PMTiles layers (area report, tools-insights.js).
   Reads one zoom level tile by tile with the vendored pmtiles.js (byte ranges, cached by the service worker),
   decodes features and answers: which polygons hold the point, and how far the nearest features are.
   Spec: github.com/mapbox/vector-tile-spec (version 2). No dependencies. */
import { lon2x, lat2y } from './util.js';

let pmP = null;
function loadPm() {
  if (window.pmtiles) return Promise.resolve(window.pmtiles);
  if (pmP) return pmP;
  pmP = new Promise((res, rej) => {
    // layers.js may already be loading the same script: wait for that tag instead of adding a second copy
    let sc = document.getElementById('hm-pmtiles');
    const add = !sc;
    if (add) { sc = document.createElement('script'); sc.id = 'hm-pmtiles'; sc.src = new URL('../vendor/pmtiles.js', import.meta.url).href; }
    sc.addEventListener('load', () => (window.pmtiles ? res(window.pmtiles) : rej(new Error('pmtiles missing'))));
    sc.addEventListener('error', () => { pmP = null; sc.remove(); rej(new Error('pmtiles did not load')); });
    if (add) document.head.appendChild(sc);
  });
  return pmP;
}

// ---------- protobuf ----------
function reader(buf) {
  const b = new Uint8Array(buf); let pos = 0;
  const varint = () => { let v = 0, s = 0, x; do { x = b[pos++]; v += (x & 0x7f) * 2 ** s; s += 7; } while (x >= 0x80); return v; };
  return {
    get pos() { return pos; }, set pos(v) { pos = v; }, len: b.length, b, varint,
    skip(t) { if (t === 0) varint(); else if (t === 1) pos += 8; else if (t === 2) pos += varint(); else if (t === 5) pos += 4; },
  };
}
const zz = (n) => (n % 2 ? -(n + 1) / 2 : n / 2);
const td = new TextDecoder();

function readValue(r, end) {
  let v = null;
  const dv = new DataView(r.b.buffer, r.b.byteOffset);
  while (r.pos < end) {
    const tag = r.varint(), f = tag >> 3, t = tag & 7;
    if (f === 1) { const l = r.varint(); v = td.decode(r.b.subarray(r.pos, r.pos + l)); r.pos += l; }
    else if (f === 2) { v = dv.getFloat32(r.pos, true); r.pos += 4; }
    else if (f === 3) { v = dv.getFloat64(r.pos, true); r.pos += 8; }
    else if (f === 4 || f === 5) v = r.varint();
    else if (f === 6) v = zz(r.varint());
    else if (f === 7) v = !!r.varint();
    else r.skip(t);
  }
  return v;
}
function readLayer(r, end) {
  const L = { name: '', extent: 4096, keys: [], values: [], feats: [] };
  while (r.pos < end) {
    const tag = r.varint(), f = tag >> 3, t = tag & 7;
    if (f === 1) { const l = r.varint(); L.name = td.decode(r.b.subarray(r.pos, r.pos + l)); r.pos += l; }
    else if (f === 2) { const l = r.varint(); L.feats.push([r.pos, r.pos + l]); r.pos += l; }
    else if (f === 3) { const l = r.varint(); L.keys.push(td.decode(r.b.subarray(r.pos, r.pos + l))); r.pos += l; }
    else if (f === 4) { const l = r.varint(); L.values.push(readValue(r, r.pos + l)); }
    else if (f === 5) L.extent = r.varint();
    else r.skip(t);
  }
  return L;
}
function readFeature(r, [s, e], L) {
  r.pos = s; let tags = [], type = 0, geom = [];
  const packed = () => { const l = r.varint(), end = r.pos + l, out = []; while (r.pos < end) out.push(r.varint()); return out; };
  while (r.pos < e) {
    const tag = r.varint(), f = tag >> 3, t = tag & 7;
    if (f === 2) tags = packed(); else if (f === 3) type = r.varint(); else if (f === 4) geom = packed(); else r.skip(t);
  }
  const props = {};
  for (let i = 0; i + 1 < tags.length; i += 2) props[L.keys[tags[i]]] = L.values[tags[i + 1]];
  // geometry: list of parts (rings or lines or points), tile coordinates
  const parts = []; let x = 0, y = 0, cur = null, i = 0;
  while (i < geom.length) {
    const c = geom[i++], id = c & 7, n = c >> 3;
    if (id === 1) { for (let k = 0; k < n; k++) { x += zz(geom[i++]); y += zz(geom[i++]); cur = [[x, y]]; parts.push(cur); } }
    else if (id === 2) { for (let k = 0; k < n; k++) { x += zz(geom[i++]); y += zz(geom[i++]); cur.push([x, y]); } }
    else if (id === 7) { if (cur && cur.length) cur.push(cur[0]); }
    else break;
  }
  return { props, type, parts };
}
function decodeTile(buf) {
  const r = reader(buf), layers = [];
  while (r.pos < r.len) {
    const tag = r.varint(), f = tag >> 3, t = tag & 7;
    if (f === 3) { const l = r.varint(), end = r.pos + l; const L = readLayer(r, end); r.pos = end; layers.push(L); }
    else r.skip(t);
  }
  const feats = [];
  for (const L of layers) for (const fr of L.feats) { const ft = readFeature(r, fr, L); ft.extent = L.extent; ft.layer = L.name; feats.push(ft); }
  return feats;
}

// ---------- geometry in tile units ----------
function inRings(px, py, parts) { // even odd over every ring: right for holes and multipolygons
  let ins = false;
  for (const ring of parts) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}
function partsDist(px, py, parts, type) {
  let d = Infinity;
  for (const p of parts) {
    if (type === 1 || p.length === 1) { for (const q of p) d = Math.min(d, Math.hypot(px - q[0], py - q[1])); continue; }
    for (let i = 1; i < p.length; i++) d = Math.min(d, segDist(px, py, p[i - 1], p[i]));
  }
  return d;
}

// ---------- cache ----------
const files = new Map(); // url -> { pm, header }
const tiles = new Map(); // url|z/x/y -> Promise<features[]>
const TILE_CAP = 120;
async function file(url) {
  let f = files.get(url);
  if (!f) {
    f = loadPm().then(async (pm) => { const p = new pm.PMTiles(url); return { p, header: await p.getHeader() }; });
    files.set(url, f); f.catch(() => files.delete(url));
  }
  return f;
}
function tile(url, z, x, y) {
  const k = `${url}|${z}/${x}/${y}`;
  if (tiles.has(k)) return tiles.get(k);
  const pr = file(url).then(({ p }) => p.getZxy(z, x, y)).then((r) => (r && r.data ? decodeTile(r.data) : []));
  tiles.set(k, pr); pr.catch(() => tiles.delete(k));
  if (tiles.size > TILE_CAP) tiles.delete(tiles.keys().next().value);
  return pr;
}

/** Features of a PMTiles file near a point. Returns [{ props, type (1 point, 2 line, 3 polygon), inside, dist (m) }],
    only those inside or within radiusM. Reads zoom min(12, file max zoom). */
export async function queryPm(url, lng, lat, radiusM = 0) {
  const { header } = await file(url);
  const z = Math.max(header.minZoom || 0, Math.min(12, header.maxZoom || 12));
  const fx = lon2x(lng, z), fy = lat2y(lat, z);
  const tileM = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / 2 ** z, r = radiusM / tileM; // radius in tiles
  const out = [];
  const jobs = [];
  for (let tx = Math.floor(fx - r); tx <= Math.floor(fx + r); tx++) for (let ty = Math.floor(fy - r); ty <= Math.floor(fy + r); ty++) {
    jobs.push(tile(url, z, tx, ty).then((feats) => {
      for (const f of feats) {
        const ext = f.extent || 4096, px = (fx - tx) * ext, py = (fy - ty) * ext, mPer = tileM / ext;
        const inside = f.type === 3 && inRings(px, py, f.parts);
        const dist = inside ? 0 : partsDist(px, py, f.parts, f.type) * mPer;
        if (inside || dist <= radiusM) out.push({ props: f.props, type: f.type, inside, dist });
      }
    }).catch(() => null));
  }
  await Promise.all(jobs);
  return out;
}
