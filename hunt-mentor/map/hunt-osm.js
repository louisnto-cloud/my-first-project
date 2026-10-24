/* Hunt Map: read map detail (OpenStreetMap through OpenFreeMap vector tiles, zoom 14) and the BC Forest Service road
   tiles for an area, for the hunt tools (walk in zones, glassing spots, buildings near a point).
   Same tile URLs as the map, so the service worker answers from Offline Maps when there is no signal.
   Coordinates come back as world tile units at zoom 14 (X, Y: tile number plus the fraction inside the tile). */
import { decodeTile, pmTile, pmHeader } from './mvt.js';
import { lon2x, lat2y } from './util.js';
import { OFM_TILEJSON } from './style.js';
import * as layers from './layers.js';

export const Z = 14;
export const ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track', 'unclassified', 'residential', 'busway'];
const MAX_TILES = 90;
const cache = new Map(); // url -> Promise<features>
let tplP = null;

function template(map) {
  const s = map && map.getSource && map.getSource('omt');
  if (s && s.tiles && s.tiles[0]) return Promise.resolve(s.tiles[0]);
  if (!tplP) { tplP = fetch(OFM_TILEJSON).then((r) => r.json()).then((j) => j.tiles[0]); tplP.catch(() => { tplP = null; }); }
  return tplP;
}
function fetchT(u, ms) {
  const c = typeof AbortController === 'function' ? new AbortController() : null;
  const t = c && setTimeout(() => c.abort(), ms);
  return fetch(u, { credentials: 'omit', signal: c && c.signal }).finally(() => clearTimeout(t));
}
/** Tile range at zoom z for a bbox [w, s, e, n]. */
export function tileRange(b, z) {
  return { x0: Math.floor(lon2x(b[0], z)), x1: Math.floor(lon2x(b[2], z)), y0: Math.floor(lat2y(b[3], z)), y1: Math.floor(lat2y(b[1], z)) };
}
const toWorld = (f, tx, ty, z) => {
  const ext = f.extent || 4096, k = 2 ** (Z - z);
  return f.parts.map((part) => part.map(([x, y]) => [(tx + x / ext) * k, (ty + y / ext) * k]));
};

/** Vector map detail for a bbox. want: source layer names to keep (for example ['transportation', 'building', 'landcover', 'water']).
    Resolves { feats, tiles, got, failed, covered: Set of 'x/y' tiles read }. Never rejects. */
export async function osmArea(map, bbox, want, onProgress) {
  const r = tileRange(bbox, Z), out = { feats: [], tiles: 0, got: 0, failed: 0, covered: new Set(), tooMany: false };
  const n = (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
  out.tiles = n;
  if (n > MAX_TILES) { out.tooMany = true; return out; }
  let tpl;
  try { tpl = await template(map); } catch (err) { out.failed = n; return out; }
  const keep = new Set(want), list = [];
  for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) list.push([x, y]);
  const one = async ([x, y]) => {
    const u = tpl.replace('{z}', Z).replace('{x}', x).replace('{y}', y);
    if (!cache.has(u)) {
      const get = () => fetchT(u, 15000).then((res) => { if (!res.ok) throw new Error(`tile ${res.status}`); return res.arrayBuffer(); });
      const p = get().catch(() => (navigator.onLine === false ? Promise.reject(new Error('offline')) : get())).then((buf) => decodeTile(buf)); // one retry online
      cache.set(u, p); p.catch(() => cache.delete(u));
      if (cache.size > 160) cache.delete(cache.keys().next().value);
    }
    try {
      const feats = await cache.get(u);
      out.got++; out.covered.add(`${x}/${y}`);
      for (const f of feats) if (keep.has(f.layer)) out.feats.push({ layer: f.layer, props: f.props, type: f.type, parts: toWorld(f, x, y, Z) });
    } catch (err) { out.failed++; }
    if (onProgress) onProgress(out.got + out.failed, n);
  };
  // 6 at a time: a phone on weak signal does better with a few requests than with 50 at once
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(6, list.length) }, async () => { while (i < list.length) await one(list[i++]); }));
  return out;
}

/** BC Forest Service road lines (data/layers, manifest layer forest_roads) for a bbox, same coordinates. Never rejects. */
export const forestRoads = (bbox) => pmArea('forest_roads', bbox, 2);
/** Features of one geometry type (1 point, 2 line, 3 polygon) of a PMTiles manifest layer for a bbox. { feats, ok }. Never rejects. */
export async function pmArea(id, bbox, type) {
  const out = { feats: [], ok: false };
  try {
    await layers.loadManifest();
    const st = layers.stateOf(id); if (!st) return out;
    const files = st.files.filter((f) => /\.pmtiles(\?|$)/i.test(f.url) && (!f.box || (bbox[0] <= f.box[2] && bbox[2] >= f.box[0] && bbox[1] <= f.box[3] && bbox[3] >= f.box[1])));
    for (const f of files) {
      const url = new URL(f.url, location.href).href;
      const h = await pmHeader(url);
      const z = Math.max(h.minZoom || 0, Math.min(12, h.maxZoom || 12)), r = tileRange(bbox, z);
      if ((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) > 40) continue;
      const jobs = [];
      for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) {
        jobs.push(pmTile(url, z, x, y).then((feats) => { out.ok = true; for (const ft of feats) if (ft.type === type) out.feats.push({ layer: id, props: ft.props, type, parts: toWorld(ft, x, y, z) }); }, () => {}));
      }
      await Promise.all(jobs);
    }
  } catch (err) { /* offline and not saved: nothing from this layer */ }
  return out;
}

/** World units (zoom 14) to [lng, lat]. */
export function toLngLat(X, Y) {
  const n = 2 ** Z, lng = (X / n) * 360 - 180, lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * Y) / n))) * 180) / Math.PI;
  return [lng, lat];
}
export const isRoad = (f) => f.layer === 'forest_roads' || (f.layer === 'transportation' && f.type === 2 && ROAD_CLASSES.includes(f.props.class));
