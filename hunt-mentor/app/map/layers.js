/* Hunt Map Layers: built from data/layers/manifest.json (contract in MAP.md).
   Layer files load only when the layer is on, only for areas near the view, and only from its minzoom less one.
   File paths: "data/..." from the app root, anything else from data/layers/. "{area}" in a path is replaced by each key in
   "areas" (and "{area_lc}" by its lower case). Or give "files": { "A": "path", "B": "path" }. Files get "?v=<dataDate or updated>". */
import { esc, prefs, savePrefs, bboxIntersects, padBbox, parseMonths, monthsText, MONTH_NAMES, pointInGeom, bboxOf, fmtNum } from './util.js';
import * as spots from './spots.js';

const MANIFEST = 'data/layers/manifest.json';
export const GROUPS = ['Land status', 'Hunting', 'Habitat and migration', 'Access', 'Spots', 'My Content'];
const AREA_BOXES = { A: [-121.6, 50.2, -119.4, 51.9], B: [-122.9, 49.0, -121.3, 49.95], C: [-120.1, 49.0, -119.2, 49.7] };
const AREA_NAMES = { A: 'Kamloops, North Thompson, Bonaparte, Shuswap west', B: 'Mission, Fraser Valley, Harrison, Hope, Fraser Canyon', C: 'South Okanagan and Similkameen', BC: 'Province wide' };
const LEGAL_GROUPS = ['Land status', 'Hunting', 'Access'];
const BANNER = '<div class="hmm-banner">Study aid only. The official regulations are the law.</div>';
const EMPTY = { type: 'FeatureCollection', features: [] };
const DEF_PAINT = {
  fill: { 'fill-color': '#e4472b', 'fill-opacity': 0.4 },
  line: { 'line-color': '#e4472b', 'line-width': 2 },
  circle: { 'circle-color': '#e4472b', 'circle-radius': 5, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 },
  symbol: { 'text-color': '#222222', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
};
const OPACITY = { fill: ['fill-opacity'], line: ['line-opacity'], circle: ['circle-opacity', 'circle-stroke-opacity'], symbol: ['icon-opacity', 'text-opacity'] };

let H, map, M = null, mState = 'idle', mPromise = null, hid = 0;
const L = new Map(); // id -> layer state
const raw = new Map(); // _hid -> { st, f }

export function init(api) {
  H = api; map = api.map;
  H.ready.then(() => loadManifest()).then(() => {
    for (const st of L.values()) if (lp(st.l.id).on) turnOn(st);
    updateBadge();
  });
}
export const manifest = () => M;
export const manifestState = () => mState;
const lp = (id) => { prefs.layers = prefs.layers || {}; return (prefs.layers[id] = prefs.layers[id] || {}); };

export function loadManifest() {
  if (mPromise) return mPromise;
  mState = 'loading';
  mPromise = fetch(MANIFEST, { cache: 'no-cache' }).then(async (r) => {
    if (!r.ok) { mState = r.status === 404 ? 'missing' : 'error'; return null; }
    const m = await r.json();
    if (!m || !Array.isArray(m.layers)) { mState = 'error'; return null; }
    M = m; mState = 'ok';
    for (const l of m.layers) if (l && l.id && !L.has(l.id)) L.set(l.id, newState(l));
    return M;
  }).catch(() => { mState = navigator.onLine ? 'error' : 'offline'; mPromise = null; return null; });
  return mPromise;
}

function newState(l) {
  const st = { l, files: [], loaded: new Map(), loading: new Map(), failed: new Set(), added: false, mapIds: [], base: {}, legal: l.legal != null ? !!l.legal : LEGAL_GROUPS.includes(l.group), spot: spots.isSpotLayer(l) };
  st.files = filesFor(l);
  st.pm = st.files.some((f) => /\.pmtiles(\?|$)/i.test(f.url)); // vector tiles, drawn by MapLibre tile by tile
  if (st.pm) st.spot = false;
  st.layerMonths = parseMonths(l.months);
  return st;
}
function resolve(p, l) {
  if (/^https?:\/\//.test(p)) return p;
  const path = p.startsWith('data/') ? p : `data/layers/${p.replace(/^\.?\//, '')}`;
  const v = l.dataDate || (M && M.updated) || '1';
  return `${path}${path.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}`;
}
function areaBox(a) { return (M && M.areaBoxes && M.areaBoxes[a]) || AREA_BOXES[String(a).toUpperCase()] || null; }
function filesFor(l) {
  const areas = !l.areas || l.areas === 'BC' ? ['BC'] : [].concat(l.areas);
  if (l.files && typeof l.files === 'object' && !Array.isArray(l.files)) return Object.entries(l.files).map(([a, f]) => ({ area: a, url: resolve(f, l), box: areaBox(a) }));
  if (Array.isArray(l.files)) return l.files.map((f) => (typeof f === 'string' ? { area: '', url: resolve(f, l), box: null } : { area: f.area || '', url: resolve(f.file || f.url, l), box: f.bbox || areaBox(f.area) }));
  if (!l.file) return [];
  if (/\{area(_lc)?\}/.test(l.file)) return areas.map((a) => ({ area: a, url: resolve(l.file.replace(/\{area\}/g, a).replace(/\{area_lc\}/g, String(a).toLowerCase()), l), box: areaBox(a) }));
  const boxes = areas.map(areaBox);
  const union = boxes.some((b) => !b) ? null : boxes.reduce((u, b) => [Math.min(u[0], b[0]), Math.min(u[1], b[1]), Math.max(u[2], b[2]), Math.max(u[3], b[3])]);
  return [{ area: areas.join(', '), url: resolve(l.file, l), box: union }];
}

// ---------- on and off ----------
export function setOn(id, on) {
  const st = L.get(id); if (!st) return;
  lp(id).on = !!on; savePrefs();
  if (on) turnOn(st); else setVis(st, false);
  updateBadge(); H.emit('layers', id, !!on);
}
function turnOn(st) {
  if (st.unsupported) return;
  ensureAdded(st); setVis(st, monthOk(st)); loadNear(st);
  // the style can be busy (another layer's source just added): try again when the map is idle, or a second layer never shows
  if (!st.added && !st.adding && !st.error && !st.retry) { st.retry = true; map.once('idle', () => { st.retry = false; if (lp(st.l.id).on) turnOn(st); }); }
}
function updateBadge() { H.ui.setBadge([...L.values()].filter((s) => lp(s.l.id).on && !s.unsupported).length); }
function setVis(st, on) {
  for (const id of st.mapIds) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
}
const monthOk = (st) => !prefs.month || !st.layerMonths.length || st.layerMonths.includes(prefs.month);

function ensureAdded(st) {
  if (st.added || st.adding || st.unsupported || !map.isStyleLoaded()) return;
  const l = st.l;
  try {
    if (st.pm) {
      st.adding = true;
      loadPmtiles().then(async (pm) => {
        st.gj = [];
        for (const [i, f] of st.files.entries()) {
          const src = `hm-src-${l.id}-${i}`, url = new URL(f.url, location.href).href;
          if (!/\.pmtiles(\?|$)/i.test(f.url)) { // mixed layer: this area ships GeoJSON (small areas), loaded when the view is near
            if (!map.getSource(src)) map.addSource(src, { type: 'geojson', data: EMPTY, tolerance: 0.45, attribution: l.attribution || 'BC Data Catalogue (Open Government Licence BC)' });
            st.mapIds.push(...addLayerSet(st, src, `-${i}`, null)); st.gj.push({ src, f, req: false });
            continue;
          }
          let sl = l.sourceLayer;
          if (!sl) { try { const meta = await new pm.PMTiles(url).getMetadata(); sl = meta && meta.vector_layers && meta.vector_layers[0] && meta.vector_layers[0].id; } catch (err) { sl = null; } }
          if (!map.getSource(src)) map.addSource(src, { type: 'vector', url: `pmtiles://${url}`, attribution: l.attribution || 'BC Data Catalogue (Open Government Licence BC)' });
          st.mapIds.push(...addLayerSet(st, src, `-${i}`, sl || l.id));
        }
        finishAdd(st); pmMonthFilter(st); setVis(st, !!lp(l.id).on && monthOk(st)); loadNear(st); refreshRows();
      }).catch((err) => { st.error = String(err && err.message || err); console.warn('Hunt Map layer', l.id, err); refreshRows(); })
        .finally(() => { st.adding = false; });
      return;
    }
    const src = `hm-src-${l.id}`;
    if (st.spot) st.mapIds = spots.addLayers(H, l, src);
    else {
      map.addSource(src, { type: 'geojson', data: EMPTY, tolerance: 0.45, attribution: l.attribution || 'BC Data Catalogue (Open Government Licence BC)' });
      st.mapIds = addLayerSet(st, src, '', null);
    }
    finishAdd(st);
  } catch (err) { st.error = String(err && err.message || err); console.warn('Hunt Map layer', l.id, err); }
}
function addLayerSet(st, src, sfx, sourceLayer) {
  const l = st.l, ids = [];
  const type = ['fill', 'line', 'circle', 'symbol'].includes(l.type) ? l.type : 'line';
  const id = `hm-l-${l.id}${sfx}`, minzoom = l.minzoom || 0, sl = sourceLayer ? { 'source-layer': sourceLayer } : {};
  const paint = Object.assign({}, DEF_PAINT[type], l.paint || {});
  const layout = Object.assign({}, type === 'line' ? { 'line-join': 'round', 'line-cap': 'round' } : {}, l.layout || {});
  if (type === 'symbol' && !layout['text-field'] && !layout['icon-image']) Object.assign(layout, { 'text-field': ['to-string', ['get', l.labelField || 'name']], 'text-font': ['Noto Sans Bold'], 'text-size': 12 });
  const before = type === 'fill' ? H.anchors.fills : type === 'line' ? H.anchors.lines : H.anchors.symbols;
  if (l.filter) sl.filter = l.filter;
  map.addLayer({ id, type, source: src, ...sl, minzoom, layout, paint }, before); ids.push(id);
  if (type === 'fill') {
    map.addLayer({ id: `${id}-line`, type: 'line', source: src, ...sl, minzoom, layout: { 'line-join': 'round' }, paint: { 'line-color': firstColor(paint['fill-outline-color']) || firstColor(paint['fill-color']) || '#e4472b', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 12, 1.5, 16, 2.4], 'line-opacity': 0.9 } }, H.anchors.lines);
    ids.push(`${id}-line`);
  }
  if (l.labelField && type !== 'symbol') {
    map.addLayer({ id: `${id}-label`, type: 'symbol', source: src, ...sl, minzoom: Math.max(minzoom, 7), layout: {
      'text-field': ['to-string', ['get', l.labelField]], 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 14, 14],
      'symbol-placement': type === 'line' ? 'line' : 'point', 'text-max-width': 8, 'text-padding': 10, 'symbol-spacing': 500,
    }, paint: { 'text-color': darken(firstColor(paint[`${type}-color`]) || '#333333'), 'text-halo-color': 'rgba(255,255,255,0.92)', 'text-halo-width': 1.8 } }, H.anchors.symbols);
    ids.push(`${id}-label`);
  }
  return ids;
}
function finishAdd(st) {
  for (const id of st.mapIds) { const t = map.getLayer(id).type; for (const p of OPACITY[t] || []) { const v = map.getPaintProperty(id, p); st.base[`${id}|${p}`] = v == null ? 1 : v; } }
  st.added = true; applyOpacity(st);
}
let pmReady = null;
function loadPmtiles() {
  if (pmReady) return pmReady;
  pmReady = new Promise((res, rej) => {
    if (window.pmtiles) { res(window.pmtiles); return; }
    const sc = document.createElement('script'); sc.src = new URL('../vendor/pmtiles.js', import.meta.url).href;
    sc.onload = () => (window.pmtiles ? res(window.pmtiles) : rej(new Error('pmtiles missing'))); sc.onerror = () => rej(new Error('pmtiles did not load'));
    document.head.appendChild(sc);
  }).then((pm) => { const proto = new pm.Protocol({ metadata: true }); H.maplibregl.addProtocol('pmtiles', proto.tile); return pm; });
  pmReady.catch(() => { pmReady = null; });
  return pmReady;
}
function applyOpacity(st) {
  const k = lp(st.l.id).opacity ?? 1;
  for (const id of st.mapIds) {
    const lyr = map.getLayer(id); if (!lyr) continue;
    for (const p of OPACITY[lyr.type] || []) { const b = st.base[`${id}|${p}`]; if (typeof b === 'number') map.setPaintProperty(id, p, +(b * k).toFixed(3)); }
  }
}
const firstColor = (v) => (typeof v === 'string' ? v : Array.isArray(v) ? v.flat(Infinity).find((x) => typeof x === 'string' && /^(#|rgb|hsl)/i.test(x)) : null);
function darken(c) {
  const m = /^#([0-9a-f]{6})$/i.exec(c || ''); if (!m) return '#333333';
  const n = parseInt(m[1], 16), f = (x) => Math.round(x * 0.62).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

// ---------- loading near the view ----------
function viewBox(pad = 0.5) { const b = map.getBounds(); return padBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], pad); }
function loadNear(st) {
  if (!st.added || !lp(st.l.id).on) return;
  if (map.getZoom() < (st.l.loadMinzoom ?? (st.l.minzoom || 0) - 1)) return; // loadMinzoom: tiled layers (routes) load only from there
  const v = viewBox();
  if (st.pm) { for (const g of st.gj || []) if (!g.req && (!g.f.box || bboxIntersects(v, g.f.box))) { g.req = true; map.getSource(g.src)?.setData(g.f.url); } return; }
  for (const f of st.files) if (!st.loaded.has(f.url) && !st.failed.has(f.url) && (!f.box || bboxIntersects(v, f.box))) loadFile(st, f);
}
export function onMove() { for (const st of L.values()) if (lp(st.l.id).on) loadNear(st); refreshRows(); }

function loadFile(st, f) {
  if (st.loaded.has(f.url)) return Promise.resolve(st.loaded.get(f.url));
  if (st.loading.has(f.url)) return st.loading.get(f.url);
  const p = fetch(f.url).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then((gj) => {
    const feats = (gj && gj.features || []).filter((x) => x && x.geometry);
    for (const ft of feats) prep(st, ft, f.area);
    st.loaded.set(f.url, feats);
    refresh(st);
    return feats;
  }).catch((err) => {
    st.failed.add(f.url); setTimeout(() => st.failed.delete(f.url), 30000);
    if (lp(st.l.id).on && !st.warned) { st.warned = true; H.toast(`Could not load ${st.l.label}. ${navigator.onLine ? 'Try again later.' : 'You are offline and this area is not saved.'}`, 4000); }
    throw err;
  }).finally(() => { st.loading.delete(f.url); refreshRows(); });
  st.loading.set(f.url, p); refreshRows();
  p.catch(() => {});
  return p;
}
function prep(st, ft, area) {
  const p = ft.properties || (ft.properties = {});
  p._hid = ++hid; raw.set(p._hid, { st, f: ft });
  if (st.spot && area) p._area = area; // spots.js finds the detail tile by area
  const m = parseMonths(p.months != null ? p.months : p.MONTHS);
  if (m.length) { p._m = m; st.hasMonths = true; }
  if (st.spot) spots.prep(p);
}
// PMTiles cannot hold arrays: the pipeline writes monthsKey like ",11,12,1,2,3,4," for seasonal features.
function pmMonthFilter(st) {
  const m = prefs.month ? ['any', ['!', ['has', 'monthsKey']], ['in', `,${prefs.month},`, ['to-string', ['get', 'monthsKey']]]] : null;
  const f = st.l.filter && m ? ['all', st.l.filter, m] : (st.l.filter || m);
  for (const id of st.mapIds) if (map.getLayer(id)) map.setFilter(id, f);
}
function refresh(st) {
  if (st.pm) { pmMonthFilter(st); return; }
  const src = map.getSource(`hm-src-${st.l.id}`); if (!src) return;
  let feats = [].concat(...st.loaded.values());
  if (prefs.month) feats = feats.filter((f) => !f.properties._m || f.properties._m.includes(prefs.month));
  if (st.spot) feats = spots.filter(feats);
  src.setData({ type: 'FeatureCollection', features: feats });
}

/** GeoJSON for a manifest layer. opts.all loads every area, opts.near ([lng, lat]) the areas holding that point, else areas near the view. */
export async function getLayerData(id, opts = {}) {
  await loadManifest();
  const st = L.get(id); if (!st || st.unsupported || st.pm) return null;
  let files = st.files;
  if (opts.near) files = files.filter((f) => !f.box || (opts.near[0] >= f.box[0] && opts.near[0] <= f.box[2] && opts.near[1] >= f.box[1] && opts.near[1] <= f.box[3]));
  else if (!opts.all) { const v = viewBox(0.2); files = files.filter((f) => !f.box || bboxIntersects(v, f.box)); }
  await Promise.all(files.map((f) => loadFile(st, f).catch(() => null)));
  return { type: 'FeatureCollection', features: [].concat(...files.map((f) => st.loaded.get(f.url) || [])) };
}
export const layerList = () => [...L.values()].map((s) => s.l);
export const stateOf = (id) => L.get(id);

// ---------- month and species ----------
export function setMonth(m) {
  prefs.month = m; savePrefs();
  for (const st of L.values()) { if (!st.added) continue; refresh(st); if (lp(st.l.id).on) setVis(st, monthOk(st)); }
  H.emit('month', m);
}
export function setSpecies(s) {
  prefs.species = s; savePrefs();
  for (const st of L.values()) if (st.spot && st.added) refresh(st);
}

// ---------- taps ----------
let tapMk = null;
function tapMarker(ll) {
  if (tapMk) { tapMk.remove(); tapMk = null; }
  if (!ll) return;
  const el = document.createElement('div'); el.className = 'hmm-tap';
  tapMk = new H.maplibregl.Marker({ element: el }).setLngLat(ll).addTo(map);
}
export function handleClick(e) {
  const pad = 12, p = e.point, box = [[p.x - pad, p.y - pad], [p.x + pad, p.y + pad]];
  const on = [...L.values()].filter((s) => s.added && lp(s.l.id).on);
  const spotIds = on.filter((s) => s.spot).flatMap((s) => s.mapIds).filter((id) => map.getLayer(id));
  if (spotIds.length) {
    const hit = map.queryRenderedFeatures(box, { layers: spotIds });
    if (hit.length) { spots.onHit(H, hit[0], (k) => raw.get(k)); return true; }
  }
  const ids = on.filter((s) => !s.spot).flatMap((s) => s.mapIds).filter((id) => map.getLayer(id));
  if (!ids.length) return false;
  const seen = new Set(), items = [];
  for (const h of map.queryRenderedFeatures(box, { layers: ids })) {
    let r = null, k = h.properties._hid;
    if (k != null) r = raw.get(k);
    else { const st = [...L.values()].find((x) => x.mapIds.includes(h.layer.id)); k = `${h.layer.id.replace(/-(line|label)$/, '')}|${JSON.stringify(h.properties)}`; if (st) r = { st, f: { properties: h.properties } }; }
    if (!r || seen.has(k)) continue;
    seen.add(k); items.push(r);
    if (items.length >= 6) break;
  }
  if (!items.length) return false;
  tapMarker(e.lngLat);
  const legal = items.some((r) => r.st.legal);
  H.openSheet({ title: items.length > 1 ? 'What is here' : items[0].st.l.label, modal: false, onClose: () => tapMarker(null), html: `${legal ? BANNER : ''}${items.map(featHtml).join('')}` });
  return true;
}

const HIDE = new Set(['_hid', '_area', '_m', '_cat', '_name', '_score', '_sp', 'months', 'MONTHS', 'OBJECTID', 'SE_ANNO_CAD_DATA', 'FEATURE_AREA_SQM', 'FEATURE_LENGTH_M', 'GEOMETRY', 'id']);
const human = (k) => String(k).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
function fmtVal(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return Number.isInteger(v) && v > 1800 && v < 2200 ? String(v) : fmtNum(v, Number.isInteger(v) ? 0 : 2);
  if (Array.isArray(v)) return v.map(fmtVal).filter(Boolean).join(', ');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${human(k)}: ${fmtVal(x)}`).join('; ');
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{8}$/.test(s) && +s.slice(0, 4) > 1800) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}`;
  return s;
}
function featHtml({ st, f }) {
  const l = st.l, p = f.properties;
  const spec = Array.isArray(l.popup) && l.popup.length ? l.popup : Object.keys(p).filter((k) => !HIDE.has(k)).slice(0, 8).map((k) => [human(k), k]);
  const rows = spec.map(([label, key]) => [label, fmtVal(p[key])]).filter(([, v]) => v !== '');
  const title = l.labelField && p[l.labelField] != null && p[l.labelField] !== '' ? fmtVal(p[l.labelField]) : '';
  return `<article class="hmm-feat"><div class="hmm-feat-l">${swatch(st)}<span>${esc(l.label)}</span></div>
    ${title ? `<h3>${esc(title)}</h3>` : ''}
    <dl class="hmm-dl">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}${p._m ? `<dt>Months</dt><dd>${esc(monthsText(p._m))}</dd>` : ''}</dl>
    <p class="hmm-src">${srcLine(l)}</p></article>`;
}
function srcLine(l) {
  const bits = [];
  if (l.source) bits.push(`Source: ${esc(l.source)}${l.licence ? ` (${esc(l.licence)})` : ''}.`);
  if (l.dataDate || (M && M.updated)) bits.push(`Data date ${esc(l.dataDate || M.updated)}.`);
  bits.push(`Certainty ${H.ui.cert(l.cert)}`);
  return bits.join(' ');
}

// ---------- panel ----------
const colorsIn = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flat(Infinity).filter((x) => typeof x === 'string' && /^(#|rgb|hsl)/i.test(x)) : []);
function swatch(st) {
  const l = st.l, p = l.paint || {};
  if (st.spot) return `<span class="hmm-sw spot">${spots.iconHtml('walk', 20)}</span>`;
  const t = l.type, key = t === 'fill' ? 'fill-color' : t === 'circle' ? 'circle-color' : t === 'symbol' ? 'text-color' : 'line-color';
  const cs = [...new Set(colorsIn(p[key]))].slice(0, 4); if (!cs.length) cs.push(DEF_PAINT[t] ? Object.values(DEF_PAINT[t])[0] : '#e4472b');
  const bg = cs.length > 1 ? `linear-gradient(135deg, ${cs.map((c, i) => `${c} ${(i * 100) / cs.length}% ${((i + 1) * 100) / cs.length}%`).join(', ')})` : cs[0];
  const dash = Array.isArray(p['line-dasharray']) ? ' dash' : '';
  return `<span class="hmm-sw ${t}${dash}" style="--c:${esc(cs[0])};background:${t === 'fill' ? esc(bg) : ''}"></span>`;
}
function statusText(st) {
  const l = st.l, on = lp(l.id).on;
  if (st.unsupported) return 'Needs a newer Hunt Map to show';
  if (st.pm && on && !st.added) return 'Loading';
  if (st.error) return 'Could not draw this layer';
  if (!on) return '';
  if (st.loading.size) return 'Loading';
  if (!monthOk(st)) return `Not shown in ${MONTH_NAMES[prefs.month - 1]}`;
  if (map.getZoom() < (l.minzoom || 0)) return 'Zoom in to see it';
  const v = viewBox(0.1);
  if (st.files.length && !st.files.some((f) => !f.box || bboxIntersects(v, f.box))) return 'Not in this area';
  if (st.failed.size && !st.loaded.size) return 'Could not load';
  return '';
}
function refreshRows() {
  const b = H.els.sheetB; if (!b || H.els.sheet.hidden || !b.querySelector('.hmm-layers-panel')) return;
  b.querySelectorAll('.hmm-lrow').forEach((row) => { const st = L.get(row.dataset.id); const s = row.querySelector('[data-st]'); if (st && s) s.textContent = statusText(st); });
}
function rowHtml(st) {
  const l = st.l, p = lp(l.id), on = !!p.on, uid = `hml-${l.id.replace(/[^\w-]/g, '_')}`;
  return `<div class="hmm-lrow ${on ? 'on' : ''}" data-id="${esc(l.id)}">
    ${swatch(st)}
    <label class="hmm-lname" for="${uid}">${esc(l.label || l.id)}<small data-st>${esc(statusText(st))}</small></label>
    <button class="hmm-i" data-l="info" aria-label="About ${esc(l.label || l.id)}">${H.icons.info}</button>
    <label class="hmm-swl"><input type="checkbox" id="${uid}" data-l="toggle" ${on ? 'checked' : ''} ${st.unsupported ? 'disabled' : ''}><i class="hmm-switch"></i></label>
    <div class="hmm-lmore" ${on ? '' : 'hidden'}>
      <label class="hmm-op"><span>Opacity</span><input type="range" min="10" max="100" step="5" value="${Math.round((p.opacity ?? 1) * 100)}" data-l="op" aria-label="Opacity of ${esc(l.label || l.id)}"></label>
      <span class="hmm-meta">${l.dataDate ? `Data ${esc(l.dataDate)} ` : ''}${H.ui.cert(l.cert)}</span>
      ${legendHtml(l)}
    </div></div>`;
}
function legendHtml(l) {
  if (!Array.isArray(l.legend) || !l.legend.length) return '';
  return `<ul class="hmm-legend">${l.legend.map(([t, c]) => `<li><i style="background:${esc(c)}"></i>${esc(t)}</li>`).join('')}</ul>`;
}
function monthsRow() {
  const has = [...L.values()].some((s) => s.layerMonths.length || s.hasMonths || s.l.group === 'Habitat and migration');
  if (!has) return '';
  const m = prefs.month || 0;
  return `<div class="hmm-chiprow" role="group" aria-label="Month"><span class="hmm-chiplabel">Month</span>
    <button class="hmm-chip ${!m ? 'on' : ''}" data-month="0">All</button>${MONTH_NAMES.map((n, i) => `<button class="hmm-chip ${m === i + 1 ? 'on' : ''}" data-month="${i + 1}">${n.slice(0, 3)}</button>`).join('')}</div>
    <p class="hmm-muted hmm-tight">Seasonal layers and spots show what fits the month you pick.</p>`;
}
function basesHtml() {
  const B = { topo: 'Topo', satellite: 'Satellite', hybrid: 'Hybrid' };
  return `<div class="hmm-bases">${Object.entries(B).map(([k, n]) => `<button class="hmm-base ${prefs.base === k ? 'on' : ''}" data-base="${k}"><i class="th-${k}"></i><span>${n}</span></button>`).join('')}</div>`;
}
export async function openPanel() {
  const body = H.openSheet({ title: 'Hunt Map Layers', tall: true, html: `<div class="hmm-layers-panel">${basesHtml()}<p class="hmm-muted">Loading layers</p></div>` });
  wirePanel(body);
  if (mState !== 'ok') await loadManifest();
  if (H.els.sheetB !== body || H.els.sheet.hidden || !body.querySelector('.hmm-layers-panel')) return;
  renderPanel(body);
}
function renderPanel(body) {
  let html = basesHtml();
  if (!M) {
    html += `<div class="hmm-empty"><b>Layers are being built</b><p>Land status, MU (Management Unit) boundaries, closures, habitat and candidate spots will appear here after the next data update.</p>
      ${mState === 'offline' ? '<p class="hmm-muted">You are offline. Open the map once with a connection to get the layers.</p>' : ''}</div>`;
  } else {
    const groups = [...GROUPS, ...new Set(M.layers.map((l) => l.group).filter((g) => g && !GROUPS.includes(g)))];
    html += monthsRow();
    for (const g of groups) {
      const list = [...L.values()].filter((s) => (s.l.group || 'Other') === g);
      if (g === 'My Content') { html += `<section class="hmm-group"><h3 class="hmm-h">My Content</h3><p class="hmm-muted">Coming next: your waypoints, lines, areas and tracks.</p></section>`; continue; }
      if (!list.length) continue;
      html += `<section class="hmm-group"><h3 class="hmm-h">${esc(g)}</h3>${g === 'Spots' ? spots.chipsHtml([...list].flatMap((s) => [].concat(...s.loaded.values()))) : ''}${list.map(rowHtml).join('')}
        ${g === 'Spots' ? '<p class="hmm-muted hmm-tight">Candidate spots from open data, scored by Hunt Mentor (my pick). Scout every spot first.</p>' : ''}</section>`;
    }
    html += `<p class="hmm-muted">Layer data updated ${esc(M.updated || 'date not listed')}. Sources: BC Data Catalogue (Open Government Licence BC). MU means Management Unit.</p>`;
    if ([...L.values()].some((s) => s.legal)) html += BANNER;
  }
  body.querySelector('.hmm-layers-panel').innerHTML = html;
}
function wirePanel(body) {
  body.addEventListener('change', (e) => {
    const t = e.target; const row = t.closest('.hmm-lrow');
    if (t.dataset.l === 'toggle' && row) {
      setOn(row.dataset.id, t.checked);
      row.classList.toggle('on', t.checked); row.querySelector('.hmm-lmore').hidden = !t.checked;
      const s = row.querySelector('[data-st]'); if (s) s.textContent = statusText(L.get(row.dataset.id));
    }
  });
  body.addEventListener('input', (e) => {
    const t = e.target; const row = t.closest('.hmm-lrow');
    if (t.dataset.l === 'op' && row) { const st = L.get(row.dataset.id); lp(st.l.id).opacity = +t.value / 100; savePrefs(); applyOpacity(st); }
  });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.base) { H.setBase(b.dataset.base); body.querySelectorAll('[data-base]').forEach((x) => x.classList.toggle('on', x === b)); return; }
    if (b.dataset.month != null) { setMonth(+b.dataset.month); body.querySelectorAll('[data-month]').forEach((x) => x.classList.toggle('on', x === b)); refreshRows(); return; }
    if (b.dataset.sp) { setSpecies(b.dataset.sp); body.querySelectorAll('[data-sp]').forEach((x) => x.classList.toggle('on', x === b)); return; }
    if (b.dataset.l === 'info') openInfo(b.closest('.hmm-lrow').dataset.id);
  });
}
function openInfo(id) {
  const st = L.get(id); if (!st) return;
  const l = st.l;
  const areas = !l.areas || l.areas === 'BC' ? 'Province wide' : [].concat(l.areas).map((a) => AREA_NAMES[String(a).toUpperCase()] || a).join('; ');
  const certWord = l.cert == null ? '' : l.cert >= 95 ? 'Read directly in the official source.' : l.cert >= 80 ? 'Official source, some interpretation.' : l.cert >= 60 ? 'Reliable secondary source.' : 'Not a fact: treat it as a tip.';
  const body = H.openSheet({ title: l.label || l.id, html: `${st.legal ? BANNER : ''}
    <div class="hmm-info-h">${swatch(st)}<span>${esc(l.group || '')}</span></div>
    <p>${esc(l.about || 'No description yet.')}</p>${legendHtml(l)}
    <dl class="hmm-dl">
      <dt>Source</dt><dd>${esc(l.source || 'Not listed')}</dd>
      <dt>Licence</dt><dd>${esc(l.licence || 'Not listed')}</dd>
      <dt>Data date</dt><dd>${esc(l.dataDate || (M && M.updated) || 'Not listed')}</dd>
      <dt>Certainty</dt><dd>${H.ui.cert(l.cert)} ${esc(certWord)}</dd>
      <dt>Areas</dt><dd>${esc(areas)}</dd>
      ${st.layerMonths.length ? `<dt>Months</dt><dd>${esc(monthsText(st.layerMonths))}</dd>` : ''}
      ${l.minzoom ? `<dt>Shows from</dt><dd>Zoom ${esc(l.minzoom)} and closer</dd>` : ''}
    </dl>
    <p class="hmm-muted">Certainty scale: 95 to 100% read directly in the official source. 80 to 94% official source with some interpretation. 60 to 79% reliable secondary source. Under 60% is a tip, not a fact.</p>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-back>Back to layers</button></div>` });
  body.querySelector('[data-back]').onclick = () => openPanel();
}

// ---------- Management Units, local search ----------
function muLayer() {
  for (const st of L.values()) { const l = st.l; if (l.role === 'mu' || /WAA_WILDLIFE_MGMT_UNITS/i.test(l.source || '') || /^(mu|mus|wmu|management[_ ]?units?)$/i.test(l.id)) return st; }
  return null;
}
const MU_KEYS = ['WILDLIFE_MGMT_UNIT_ID', 'MU', 'mu', 'MU_ID', 'mu_id', 'unit'];
function muCode(p, l) {
  for (const k of [...MU_KEYS, l.labelField]) { if (!k || p[k] == null) continue; const m = String(p[k]).match(/(\d{1,2})\s*-\s*0*(\d{1,2})/); if (m) return `${+m[1]}-${+m[2]}`; }
  return null;
}
const muRegion = (p) => p.REGION_RESPONSIBLE_NAME || p.REGION_NAME || (p.regionName ? `Region ${p.region ? `${p.region} ` : ''}${p.regionName}` : (p.region ? `Region ${p.region}` : ''));
export async function muAt(pt) {
  await loadManifest();
  const st = muLayer(); if (!st || st.unsupported || st.pm) return { state: 'missing' };
  const fc = await getLayerData(st.l.id, { near: pt });
  for (const f of (fc && fc.features) || []) if (pointInGeom(pt, f.geometry)) return { state: 'ok', id: muCode(f.properties, st.l) || '', region: muRegion(f.properties), source: `${st.l.source || 'BC Data Catalogue'}, data date ${st.l.dataDate || (M && M.updated) || 'not listed'}.` };
  return { state: 'outside' };
}
export async function findMU(code) {
  await loadManifest();
  const st = muLayer(); if (!st || st.unsupported || st.pm) return { state: 'missing' };
  const fc = await getLayerData(st.l.id, { all: true });
  const hits = ((fc && fc.features) || []).filter((f) => muCode(f.properties, st.l) === code);
  if (!hits.length) return { state: 'none' };
  return { state: 'ok', bbox: bboxOf({ type: 'FeatureCollection', features: hits }), region: muRegion(hits[0].properties), layerId: st.l.id };
}
const isRec = (st) => st.l.role === 'recsites' || /FTEN_REC_SITE_POINTS/i.test(st.l.source || '') || /rec[_ -]?sites?/i.test(st.l.id);
function centroid(g) {
  if (g.type === 'Point') return g.coordinates;
  const b = bboxOf(g); return b ? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] : null;
}
export async function searchLocal(q) {
  await loadManifest(); if (!M) return [];
  const ql = q.toLowerCase(), out = [];
  for (const st of L.values()) {
    const kind = st.spot ? 'spot' : isRec(st) ? 'rec' : null;
    if (!kind || st.unsupported || st.pm) continue;
    const fc = await getLayerData(st.l.id, { all: true }).catch(() => null);
    for (const f of (fc && fc.features) || []) {
      const p = f.properties, name = kind === 'spot' ? p._name : (p[st.l.labelField] || p.PROJECT_NAME || p.name);
      if (!name || !String(name).toLowerCase().includes(ql)) continue;
      const c = centroid(f.geometry); if (!c) continue;
      out.push({ name: String(name), sub: kind === 'spot' ? spots.subtitle(p) : 'Recreation site', lng: c[0], lat: c[1], zoom: 15, score: String(name).toLowerCase().startsWith(ql) ? 0 : 1,
        onPick: kind === 'spot' ? () => { setOn(st.l.id, true); map.once('moveend', () => spots.openCard(H, st.l, f)); } : null });
      if (out.length >= 40) break;
    }
  }
  return out.sort((a, b) => a.score - b.score);
}
export async function showMU(code) {
  const r = await findMU(code);
  if (r.state === 'ok' && r.layerId && !lp(r.layerId).on) setOn(r.layerId, true);
  return r;
}
