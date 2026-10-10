/* Hunt Map tools (Phase 2), plugin entry. Loaded by core.js after the map is ready.
   Draws the user's waypoints, lines, areas and tracks (tools-store.js, IndexedDB), the Tools sheet, waypoint and item sheets,
   line, area and measure drawing, range rings, the elevation profile, and long press. My Content, import and export: tools-content.js.
   Wind, weather and Insights (tools-wind.js, tools-insights.js) and Go & Track (tools-track.js) are separate plugins.
   Hooks they may set on HuntMap, used here when present: H.scentCone([lng, lat]), H.insightsAt([lng, lat], name).
   Exposed for them: H.tools (this ctx: items, refresh(), openItem(id), drawOverlays(), profileHtml(coords, el)). */
import * as store from './store.js';
import { WPT, WPT_BY, COLORS, wptSvg, glyphImage, lineLength, ringArea, perimeter, sampleLine, climb, fmtDur } from './tools-geo.js';
import { esc, circleRing, haversine, bearingTo, compass8, bboxOf, debounce, firstTime } from './util.js';
import * as content from './tools-content.js';
import * as search from './search.js';
import * as offline from './offline.js';

const SRC = 'hm-user', TOOL = 'hm-tool';
const USER_LAYERS = ['hm-u-area', 'hm-u-area-line', 'hm-u-line', 'hm-u-wpt', 'hm-u-wpt-ic', 'hm-u-wpt-t'];
const ctx = { H: null, map: null, items: [], folders: [], overlays: { rings: null, draft: null, marker: null } };
const KIND = { wpt: 'Waypoint', line: 'Line', area: 'Area', track: 'Track' };
ctx.KIND = KIND;

export default async function init(H) {
  ctx.H = H; ctx.map = H.map;
  Object.assign(ctx, { refresh, saveAny, deleteAny, openItem, drawOverlays, dropWaypoint, itemStats, profileHtml, fitItem, here, fieldRows, toolsSheet });
  loadCss();
  // Layers and icon images are added on first use (lazy), so an empty map carries no tool layers.
  H.on('units', () => drawOverlays());
  H.on('tracks', () => refresh()); // Go & Track saved or removed a track
  H.setBarAction('tools', toolsSheet);
  H.setBarAction('profile', profilePicker);
  H.onClick(onMapClick);
  longPress();
  content.init(ctx);
  H.tools = ctx;
  H.overlayChip = chip;
  H.hintOnce = hintOnce;
  backGuard();
  buttonNames();
  await refresh();
}

// ---------- names for the round icon buttons: a tooltip, and labels beside them the first time the map opens ----------
function buttonNames() {
  const H = ctx.H, root = H.els.bar.parentNode;
  const icons = () => [...root.querySelectorAll('.hmm-btn[aria-label]')].filter((b) => !b.hidden && b.offsetParent);
  for (const b of root.querySelectorAll('button[aria-label]:not([title])')) if (!b.textContent.trim()) b.title = b.getAttribute('aria-label');
  const list = icons();
  if (!list.length || !H.isOpen || !firstTime('button-names')) return; // shown once, only when the map is on screen
  const box = document.createElement('div'); box.className = 'hmt-names'; box.setAttribute('aria-hidden', 'true');
  const W = root.clientWidth;
  const menu = root.querySelector('[data-act="menu"]'), rowBottom = menu ? menu.getBoundingClientRect().bottom : 70;
  for (const b of list) {
    const r = b.getBoundingClientRect(), left = r.left + r.width / 2 < W / 2, t = document.createElement('span');
    t.textContent = b.getAttribute('aria-label');
    if (r.top < rowBottom - 10) { // top row: labels go below, stepped down so neighbours do not overlap
      t.style.top = `${Math.round(r.bottom + 22)}px`;
      if (left) t.style.left = `${Math.round(r.left)}px`; else t.style.right = `${Math.round(W - r.right)}px`;
    } else {
      t.style.top = `${Math.round(r.top + r.height / 2)}px`;
      if (left) t.style.left = `${Math.round(r.right + 8)}px`; else t.style.right = `${Math.round(W - r.left + 8)}px`;
    }
    box.appendChild(t);
  }
  root.appendChild(box);
  // move labels down until none overlap (narrow phones)
  const placed = [];
  for (const t of [...box.children].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)) {
    for (let k = 0; k < 6; k++) {
      const r = t.getBoundingClientRect();
      if (!placed.some((q) => r.left < q.right && r.right > q.left && r.top < q.bottom + 4 && r.bottom > q.top - 4)) break;
      t.style.top = `${parseFloat(t.style.top) + 34}px`;
    }
    placed.push(t.getBoundingClientRect());
  }
  const p = document.createElement('p'); p.className = 'hmt-names-tip'; p.textContent = 'These are the map buttons. Tap anywhere to start.';
  box.appendChild(p);
  const done = () => { box.remove(); root.removeEventListener('pointerdown', done, true); };
  root.addEventListener('pointerdown', done, true);
  setTimeout(done, 9000);
}

/** One line hint the first time a tool is used on this phone. */
function hintOnce(key, text, ms = 5000) { if (firstTime(key)) ctx.H.toast(text, ms); }

// ---------- chips on the map for things you switched on (range rings, scent cone, wind arrows): tap to clear ----------
let chipBox = null;
const chips = new Map();
function chip(id, label, onClear) {
  const H = ctx.H;
  if (!chipBox) { chipBox = document.createElement('div'); chipBox.className = 'hmt-chips'; chipBox.setAttribute('aria-label', 'Shown on the map'); H.els.bar.parentNode.appendChild(chipBox); }
  const old = chips.get(id); if (old) { old.remove(); chips.delete(id); }
  if (!label) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'hmt-chip'; b.title = `Clear ${label.toLowerCase()} from the map`;
  b.setAttribute('aria-label', `Clear ${label.toLowerCase()} from the map`);
  b.innerHTML = `<span>${esc(label)}</span>${H.icons.close}`;
  b.onclick = () => { b.remove(); chips.delete(id); onClear(); };
  chips.set(id, b); chipBox.appendChild(b);
}

// ---------- phone back button: closes the open sheet, search or offline frame first, instead of leaving the map ----------
function backGuard() {
  const H = ctx.H;
  if (H.backGuard) return; // core.js or another module already handles it
  H.backGuard = 'tools';
  const root = H.els.bar.parentNode, sheet = H.els.sheet;
  let mine = null, pushed = false;
  const searchOpen = () => { const s = root.querySelector('.hmm-search'); return !!(s && !s.hidden); };
  const anyOpen = () => !sheet.hidden || searchOpen() || !!root.querySelector('.hmm-fpanel');
  const onMine = () => !!(history.state && history.state.hmSheet && history.state.hmSheet === mine);
  const mapUrl = () => { const c = ctx.map.getCenter(); return `#/map/@${c.lat.toFixed(5)},${c.lng.toFixed(5)},${ctx.map.getZoom().toFixed(2)}`; };
  const sync = () => {
    if (!H.isOpen || !/^#\/map/.test(location.hash)) return;
    const open = anyOpen();
    if (open && !onMine() && !pushed) { mine = Date.now(); pushed = true; history.pushState(Object.assign({}, history.state, { hmSheet: mine }), '', location.href); }
    else if (!open && onMine()) { pushed = false; history.back(); }
  };
  const obs = new MutationObserver(() => queueMicrotask(sync));
  obs.observe(sheet, { attributes: true, attributeFilter: ['hidden'] });
  obs.observe(root, { childList: true });
  const watchSearch = new MutationObserver(() => { const s = root.querySelector('.hmm-search'); if (s && !s.dataset.watched) { s.dataset.watched = '1'; obs.observe(s, { attributes: true, attributeFilter: ['hidden'] }); } });
  watchSearch.observe(root, { childList: true });
  window.addEventListener('popstate', (e) => {
    if (!pushed || (e.state && e.state.hmSheet === mine)) return;
    pushed = false; mine = null;
    if (!H.isOpen || !/^#\/map/.test(location.hash)) return;
    if (offline.busy && offline.busy()) { // a download is running: stay, and say how to stop it
      mine = Date.now(); pushed = true; history.pushState(Object.assign({}, history.state, { hmSheet: mine }), '', location.href);
      H.toast('Download in progress. Tap Cancel to stop it.'); return;
    }
    history.replaceState(history.state, '', mapUrl()); // keep the view: the entry we came back to may hold an older map position
    search.close(); offline.cancelFrame(); H.closeSheet();
  });
}

function loadCss() {
  const href = new URL('./tools.css', import.meta.url).href;
  if ([...document.styleSheets].some((s) => s.href === href)) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
}

// ---------- map layers (added on first use) ----------
function ensureImage(icon, dark) {
  const m = ctx.map, k = `wg-${icon}-${dark}`;
  if (!m.hasImage(k)) { const g = glyphImage(icon, dark); m.addImage(k, g.img, { pixelRatio: g.pixelRatio }); }
}
const EMPTY = { type: 'FeatureCollection', features: [] };
const col = ['coalesce', ['get', 'color'], '#e8590c'];
function ensureUserLayers() {
  const m = ctx.map;
  if (m.getSource(SRC)) return;
  m.addSource(SRC, { type: 'geojson', data: EMPTY });
  const below = m.getLayer('hm-t-fill') ? 'hm-t-fill' : undefined; // lines and areas sit under the drawing overlays, waypoints on top
  m.addLayer({ id: 'hm-u-area', type: 'fill', source: SRC, filter: ['==', ['get', 'kind'], 'area'], paint: { 'fill-color': col, 'fill-opacity': 0.18 } }, below);
  m.addLayer({ id: 'hm-u-area-line', type: 'line', source: SRC, filter: ['==', ['get', 'kind'], 'area'], paint: { 'line-color': col, 'line-width': 2.5 } }, below);
  m.addLayer({ id: 'hm-u-line-case', type: 'line', source: SRC, filter: ['in', ['get', 'kind'], ['literal', ['line', 'track']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 6.5, 'line-opacity': 0.85 } }, below);
  m.addLayer({ id: 'hm-u-line', type: 'line', source: SRC, filter: ['in', ['get', 'kind'], ['literal', ['line', 'track']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': col, 'line-width': 3.5, 'line-dasharray': ['case', ['==', ['get', 'kind'], 'line'], ['literal', [2, 1]], ['literal', [1, 0]]] } }, below);
  m.addLayer({ id: 'hm-u-wpt', type: 'circle', source: SRC, filter: ['==', ['get', 'kind'], 'wpt'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 9, 13, 14], 'circle-color': col, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
  m.addLayer({ id: 'hm-u-wpt-ic', type: 'symbol', source: SRC, filter: ['==', ['get', 'kind'], 'wpt'], layout: { 'icon-image': ['concat', 'wg-', ['get', 'icon'], '-', ['get', 'dark']], 'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.62, 13, 0.92], 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
  m.addLayer({ id: 'hm-u-wpt-t', type: 'symbol', source: SRC, filter: ['==', ['get', 'kind'], 'wpt'], minzoom: 11.5, layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-anchor': 'top', 'text-offset': [0, 1.35], 'text-optional': true, 'text-max-width': 9 }, paint: { 'text-color': '#1f211b', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.8 } });
}
function ensureToolLayers() {
  const m = ctx.map;
  if (m.getSource(TOOL)) return;
  m.addSource(TOOL, { type: 'geojson', data: EMPTY });
  const below = m.getLayer('hm-u-wpt') ? 'hm-u-wpt' : undefined;
  m.addLayer({ id: 'hm-t-fill', type: 'fill', source: TOOL, filter: ['==', ['get', 't'], 'fill'], paint: { 'fill-color': ['coalesce', ['get', 'color'], '#e8590c'], 'fill-opacity': ['coalesce', ['get', 'op'], 0.2] } }, below);
  m.addLayer({ id: 'hm-t-line', type: 'line', source: TOOL, filter: ['==', ['get', 't'], 'line'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['coalesce', ['get', 'color'], '#e8590c'], 'line-width': ['coalesce', ['get', 'w'], 3], 'line-dasharray': [2, 1.2] } }, below);
  m.addLayer({ id: 'hm-t-pt', type: 'circle', source: TOOL, filter: ['==', ['get', 't'], 'pt'], paint: { 'circle-radius': ['coalesce', ['get', 'r'], 6], 'circle-color': ['coalesce', ['get', 'color'], '#e8590c'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 } }, below);
  m.addLayer({ id: 'hm-t-label', type: 'symbol', source: TOOL, filter: ['==', ['get', 't'], 'label'], layout: { 'text-field': ['get', 'text'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-max-width': 12, 'text-padding': 4, 'text-anchor': ['coalesce', ['get', 'anchor'], 'center'], 'text-offset': ['case', ['==', ['get', 'anchor'], 'left'], ['literal', [1.1, 0]], ['literal', [0, 0]]] }, paint: { 'text-color': '#1f211b', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 2 } }, below);
}

const isDark = (c) => (/^#f/i.test(c || '') && String(c).toLowerCase() !== '#f2c12e' ? 1 : 0);
function feature(it) {
  const props = { id: it.id, kind: it.kind, name: it.name || '', color: it.color || (it.kind === 'wpt' ? (WPT_BY[it.icon] || WPT_BY.other).color : '#e8590c') };
  if (it.kind === 'wpt') { props.icon = WPT_BY[it.icon] ? it.icon : 'other'; props.dark = isDark(props.color); return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: it.coords.slice(0, 2) } }; }
  const cs = it.coords.map((c) => c.slice(0, 2));
  if (it.kind === 'area') return { type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [[...cs, cs[0]]] } };
  return { type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: cs } };
}
// Go & Track saves to the 'tracks' store (tools-track.js). Read those too, whatever the point shape.
const ptOf = (p) => (Array.isArray(p) ? p : [p.lng ?? p.lon ?? p.longitude, p.lat ?? p.latitude, p.ele ?? p.alt ?? p.altitude].filter((v, i) => i < 2 || v != null));
const timeOf = (p) => (Array.isArray(p) ? null : (p.t ?? p.time ?? p.timestamp ?? null));
function fromTrackStore(r) {
  const raw = r.coords || r.points || r.pts || (r.geometry && r.geometry.coordinates) || [];
  const coords = raw.map(ptOf).filter((c) => c && isFinite(c[0]) && isFinite(c[1]));
  const times = r.times || (raw.some((p) => timeOf(p) != null) ? raw.map(timeOf).map((t) => (typeof t === 'string' ? Date.parse(t) : t)) : undefined);
  return { id: r.id, kind: 'track', _store: 'tracks', name: r.name || 'Track', note: r.note || '', color: r.color || '#d62828', folder: r.folder || '', hidden: !!r.hidden,
    coords, times, moving: r.moving ?? (r.stats && r.stats.moving) ?? r.movingMs, created: r.created ?? r.start ?? r.started ?? (times && times[0]) ?? 0, photo: r.photo || '' };
}
const EDITABLE = ['name', 'note', 'color', 'folder', 'hidden', 'icon', 'coords', 'photo'];
/** Save an item to the store it came from. Tracks from Go & Track keep their own record shape: only the user fields change. */
async function saveAny(it) {
  if (it._store) {
    const rec = (await store.get(it._store, it.id)) || { id: it.id };
    for (const k of EDITABLE) if (k !== 'coords' && it[k] !== undefined) rec[k] = it[k];
    rec.updated = Date.now();
    return store.put(it._store, rec);
  }
  return store.saveItem(it);
}
async function deleteAny(it) {
  if (it.photo) await store.del('photos', it.photo).catch(() => {});
  return store.del(it._store || 'items', it.id);
}
async function refresh() {
  try {
    const [items, folders, tracks] = await Promise.all([store.list('items'), store.list('folders'), store.list('tracks').catch(() => [])]);
    ctx.folders = folders;
    ctx.items = items.concat(tracks.filter((r) => r && r.id != null && !r.recording && !r.active).map(fromTrackStore).filter((t) => t.coords.length > 1));
  } catch (err) { ctx.items = []; ctx.folders = []; ctx.H.toast('Saving is blocked in this browser, so your map items will not stay.', 5000); }
  ctx.items.sort((a, b) => (b.created || 0) - (a.created || 0));
  const hiddenF = new Set(ctx.folders.filter((f) => f.hidden).map((f) => f.id));
  const features = ctx.items.filter((i) => !i.hidden && !hiddenF.has(i.folder) && i.coords && (i.kind === 'wpt' || i.coords.length > 1)).map(feature);
  if (features.length || ctx.map.getSource(SRC)) {
    ensureUserLayers();
    for (const f of features) if (f.properties.kind === 'wpt') ensureImage(f.properties.icon, f.properties.dark); // only the icons in use
    ctx.map.getSource(SRC).setData({ type: 'FeatureCollection', features });
  }
  return ctx.items;
}

// ---------- overlays: draft drawing, range rings, profile marker ----------
const YD = 1.09361;
function drawOverlays() {
  const f = [], o = ctx.overlays;
  const line = (cs, p = {}) => f.push({ type: 'Feature', properties: Object.assign({ t: 'line' }, p), geometry: { type: 'LineString', coordinates: cs } });
  const pt = (c, p = {}) => f.push({ type: 'Feature', properties: Object.assign({ t: 'pt' }, p), geometry: { type: 'Point', coordinates: c } });
  const label = (c, text, anchor) => f.push({ type: 'Feature', properties: { t: 'label', text, anchor: anchor || 'center' }, geometry: { type: 'Point', coordinates: c } });
  if (o.rings) {
    for (const r of [100, 200, 300]) {
      const ring = circleRing(o.rings, r, 72); line(ring, { color: '#d62828', w: 2.5 });
      label(ring[Math.round(72 * 0.25)], `${r} m (${Math.round(r * YD)} yd)`);
    }
    pt(o.rings, { color: '#d62828', r: 5 });
  }
  const d = o.draft;
  if (d && d.pts.length) {
    const cs = d.pts;
    if (d.kind === 'area' && cs.length > 2) f.push({ type: 'Feature', properties: { t: 'fill', color: '#e8590c', op: 0.2 }, geometry: { type: 'Polygon', coordinates: [[...cs, cs[0]]] } });
    if (cs.length > 1) line(d.kind === 'area' && cs.length > 2 ? [...cs, cs[0]] : cs, { color: d.kind === 'measure' ? '#1a73e8' : '#e8590c' });
    cs.forEach((c, i) => pt(c, { r: i === cs.length - 1 ? 7 : 5, color: d.kind === 'measure' ? '#1a73e8' : '#e8590c' }));
    if (d.kind === 'measure' && cs.length > 1) label(cs[cs.length - 1], ctx.H.units.dist(lineLength(cs)), 'left');
  }
  if (o.marker) pt(o.marker, { color: '#1f211b', r: 7 });
  if (!f.length && !ctx.map.getSource(TOOL)) return;
  ensureToolLayers();
  ctx.map.getSource(TOOL).setData({ type: 'FeatureCollection', features: f });
}
ctx.drawOverlays = drawOverlays;

/** Map centre or GPS position as [lng, lat]. which: 'centre' | 'gps'. Returns null (with a toast) when GPS is not ready. */
function here(which) {
  if (which === 'gps') {
    const p = ctx.H.lastPosition;
    if (!p) { ctx.H.toast('No GPS fix yet. Tap the location button first, then try again.', 4000); return null; }
    return [p.lng, p.lat];
  }
  const c = ctx.map.getCenter(); return [c.lng, c.lat];
}
function setRings(p) {
  ctx.overlays.rings = p; drawOverlays();
  chip('rings', p ? 'Range rings' : '', () => setRings(null));
  if (p) ctx.H.toast('Range rings: 100, 200 and 300 m (109, 219, 328 yd). Tap the chip at the top to clear them.', 4000);
}
ctx.setRings = setRings;

// ---------- Tools sheet ----------
function tile(act, icon, label, sub = '') { return `<button class="hmt-tile" data-t="${act}">${icon}<span>${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`; }
const I = {
  line: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M6.5 16.5 10 11l4 2 3.5-5.5" stroke-dasharray="3 2.5"/></svg>',
  area: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 8l7-4 9 5-2 10-11 1Z" fill="currentColor" fill-opacity=".2"/></svg>',
  ruler: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6 8v3.5M9.5 8v2M13 8v3.5M16.5 8v2"/></svg>',
  rings: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="10"/></svg>',
  cone: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 19 19 7l-2 11Z" fill="currentColor" fill-opacity=".25"/><circle cx="5" cy="19" r="2" fill="currentColor"/></svg>',
  wind: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/></svg>',
  clear: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5 5 19"/></svg>',
};
function toolsSheet() {
  const H = ctx.H, o = ctx.overlays, wind = typeof H.scentCone === 'function';
  const body = H.openSheet({ title: 'Tools', bar: 'tools', html: `
    <h3 class="hmm-h">Waypoint</h3>
    <div class="hmt-tiles">${tile('wpt-c', wptSvg('other', '#e8590c', 26), 'At map centre', 'Under the cross')}${tile('wpt-g', wptSvg('stand', '#1a73e8', 26), 'At my location', 'GPS (Global Positioning System)')}</div>
    <p class="hmm-muted">Tip: press and hold on the map to drop a waypoint right there.</p>
    <h3 class="hmm-h">Draw and measure</h3>
    <div class="hmt-tiles">${tile('line', I.line, 'Line or route', 'Distance and climb')}${tile('area', I.area, 'Area', 'Hectares, perimeter')}${tile('measure', I.ruler, 'Measure', 'Quick ruler')}${tile('rings', I.rings, 'Range rings', '100, 200, 300 m')}${tile('profile', H.icons.profile, 'Elevation profile', 'Climb on a line')}</div>
    ${wind ? `<h3 class="hmm-h">Wind</h3>
    <div class="hmt-tiles">${tile('cone', I.cone, 'Scent cone', 'From map centre')}${tile('cone-g', I.cone, 'Scent cone', 'From my location')}${tile('weather', H.icons.weather, 'Weather', 'Wind and forecast')}</div>` : ''}
    <h3 class="hmm-h">Map files</h3>
    <div class="hmt-tiles">${tile('files', H.icons.content, 'Import or export', 'GPX, KML, GeoJSON')}${tile('track', H.icons.track, 'Record a track', 'Go & Track')}</div>
    ${o.rings ? `<div class="hmm-btnrow"><button class="hmm-btn2" data-t="clear">${I.clear}<span>Clear range rings</span></button></div>` : ''}` });
  body.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => {
    const t = b.dataset.t;
    if (t === 'wpt-c' || t === 'wpt-g') { const p = here(t === 'wpt-g' ? 'gps' : 'centre'); if (p) dropWaypoint(p); }
    else if (t === 'line' || t === 'area' || t === 'measure') startDraw(t);
    else if (t === 'rings') { const p = here('centre'); H.closeSheet(); setRings(p); }
    else if (t === 'profile') profilePicker();
    else if (t === 'cone' || t === 'cone-g') { const p = here(t === 'cone-g' ? 'gps' : 'centre'); if (p) { H.closeSheet(); H.scentCone(p); } }
    else if (t === 'weather') { H.closeSheet(); H.els.stackR.querySelector('[data-act="weather"]').click(); }
    else if (t === 'files') ctx.contentSheet();
    else if (t === 'track') H.els.bar.querySelector('[data-bar="track"]').click();
    else if (t === 'clear') { setRings(null); H.closeSheet(); }
  });
}

// ---------- waypoints ----------
async function dropWaypoint(p, extra = {}) {
  const n = ctx.items.filter((i) => i.kind === 'wpt').length + 1;
  const it = Object.assign({ kind: 'wpt', name: `Waypoint ${n}`, note: '', icon: 'other', color: '', folder: '', coords: [+p[0].toFixed(6), +p[1].toFixed(6)] }, extra);
  try { await store.saveItem(it); } catch (err) { ctx.H.toast('Could not save. Storage is blocked in this browser.', 4000); return null; }
  await refresh();
  openItem(it.id, { fresh: true });
  hintOnce('wpt', 'Waypoint saved. Pick an icon and a name: changes save by themselves.');
  return it;
}

// ---------- tapping items ----------
function onMapClick(e) {
  if (ctx.overlays.draft) { addDraftPoint([e.lngLat.lng, e.lngLat.lat]); return true; }
  const b = 8, layers = USER_LAYERS.filter((l) => ctx.map.getLayer(l));
  const hits = ctx.map.queryRenderedFeatures([[e.point.x - b, e.point.y - b], [e.point.x + b, e.point.y + b]], { layers });
  if (!hits.length) return false;
  const order = ['wpt', 'track', 'line', 'area'];
  hits.sort((a, c) => order.indexOf(a.properties.kind) - order.indexOf(c.properties.kind));
  openItem(hits[0].properties.id);
  return true;
}

// ---------- item sheet (view and edit) ----------
function itemStats(it) {
  const u = ctx.H.units;
  if (it.kind === 'wpt') return '';
  if (it.kind === 'area') return `${u.area(ringArea(it.coords))}, ${u.dist(perimeter(it.coords))} around`;
  const d = u.dist(lineLength(it.coords));
  if (it.kind === 'track' && it.times && it.times.length > 1) { const t0 = it.times.find((x) => x), t1 = [...it.times].reverse().find((x) => x); if (t0 && t1) return `${d}, ${fmtDur(it.moving || t1 - t0)}`; }
  return d;
}
/** Map pixels hidden under the open sheet at the bottom (at most 60% of the screen, so the item still gets room). */
function sheetCover() {
  const H = ctx.H, c = ctx.map.getContainer(), h = c.clientHeight;
  const top = H.els.sheet.hidden ? h : H.els.sheet.offsetTop; // offsetTop ignores the slide in animation
  return Math.round(Math.min(h * 0.6, Math.max(90, h - top + 16)));
}
function fitItem(it) {
  const cover = sheetCover();
  if (it.kind === 'wpt') { ctx.map.easeTo({ center: it.coords, zoom: Math.max(ctx.map.getZoom(), 14), offset: [0, -Math.round(cover / 2)], duration: 700 }); return; } // offset, not padding: padding would stay on the map
  const b = bboxOf({ type: 'LineString', coordinates: it.coords });
  if (b) ctx.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: 120, bottom: cover, left: 40, right: 40 }, maxZoom: 16, duration: 700 });
}
function fieldRows(it) {
  const folders = ctx.folders.slice().sort((a, b) => a.name.localeCompare(b.name));
  return `<label class="hmm-field">Name<input data-f="name" maxlength="80" value="${esc(it.name)}"></label>
    <label class="hmm-field">Note<textarea data-f="note" rows="3" maxlength="2000">${esc(it.note || '')}</textarea></label>
    <div class="hmm-field">Colour<div class="hmt-colors" role="radiogroup" aria-label="Colour">${COLORS.map(([c, l]) => `<button role="radio" aria-checked="${(it.color || '') === c}" aria-label="${l}" data-color="${c}" style="--c:${c}"></button>`).join('')}</div></div>
    <label class="hmm-field">Folder<select data-f="folder"><option value="">No folder</option>${folders.map((f) => `<option value="${esc(f.id)}" ${it.folder === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label>`;
}
async function openItem(id, { fresh = false } = {}) {
  const H = ctx.H, it = ctx.items.find((i) => i.id === id) || await store.get('items', id);
  if (!it) return;
  const u = H.units, isW = it.kind === 'wpt';
  const save = async (fit) => { try { await saveAny(it); } catch (err) { H.toast('Could not save.'); } await refresh(); if (fit) drawOverlays(); };
  const saveSoon = debounce(save, 350);
  const iconGrid = isW ? `<div class="hmm-field">Icon<div class="hmt-icons" role="radiogroup" aria-label="Icon">${WPT.map(([k, l]) => `<button role="radio" aria-checked="${it.icon === k}" data-icon="${k}" aria-label="${esc(l)}">${wptSvg(k, it.color || null, 34)}<span>${esc(l)}</span></button>`).join('')}</div></div>` : '';
  const coordTxt = isW ? u.coord(it.coords[0], it.coords[1]) : '';
  const body = H.openSheet({ title: it.name || KIND[it.kind], tall: isW, html: `
    <p class="hmm-muted">${esc(KIND[it.kind])}${it.created ? `, added ${new Date(it.created).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</p>
    ${isW ? `<dl class="hmm-dl"><dt>Coordinates</dt><dd><span>${esc(coordTxt)}</span>${H.ui.copyBtn(coordTxt)}</dd><dt>Elevation</dt><dd data-out="elev">Checking</dd></dl>` : `<div class="hmm-stats" data-out="stats"></div>`}
    ${it.kind === 'line' || it.kind === 'track' ? '<h3 class="hmm-h">Elevation profile</h3><div data-out="profile" class="hmt-prof"><p class="hmm-muted">Reading the terrain</p></div>' : ''}
    ${isW ? `<div class="hmt-photo" data-out="photo"></div>` : ''}
    ${isW ? iconGrid + fieldRows(it) : `<details class="hmt-edit" ${fresh ? 'open' : ''}><summary>Name, note, colour and folder</summary>${fieldRows(it)}</details>`}
    ${isW ? `<div class="hmm-btnrow">
      <button class="hmm-btn2" data-a="rings">Range rings here</button>${typeof H.scentCone === 'function' ? '<button class="hmm-btn2" data-a="cone">Scent cone here</button>' : ''}
      ${typeof H.insightsAt === 'function' ? '<button class="hmm-btn2" data-a="insights">Insights here</button>' : ''}<button class="hmm-btn2" data-a="move">Move to map centre</button></div>${H.ui.linksHtml(it.coords[1], it.coords[0], it.name)}` : `<div class="hmm-btnrow"><button class="hmm-btn2" data-a="fit">Show on map</button></div>`}
    <div class="hmm-btnrow"><button class="hmm-btn2" data-a="share">Share or export</button><button class="hmm-btn2 danger" data-a="del">${H.icons.trash}<span>Delete</span></button></div>
    <button class="hmm-primary block" data-a="done">Done</button>
    <p class="hmm-muted">Changes save by themselves.</p>` });
  H.ui.wireCopy(body);
  const q = (s) => body.querySelector(s);
  body.querySelectorAll('[data-f]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
    it[el.dataset.f] = el.value;
    if (el.dataset.f === 'name') H.els.sheetT.textContent = el.value || KIND[it.kind];
    saveSoon();
  }));
  body.querySelectorAll('[data-color]').forEach((b) => b.onclick = () => {
    it.color = it.color === b.dataset.color ? '' : b.dataset.color;
    body.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.color === it.color)));
    if (isW) body.querySelectorAll('[data-icon]').forEach((x) => { x.querySelector('svg').outerHTML = wptSvg(x.dataset.icon, it.color || null, 34); });
    save();
  });
  body.querySelectorAll('[data-icon]').forEach((b) => b.onclick = () => {
    const prevDefault = (it.name || '').match(/^(Waypoint|Parking|Camp|Stand|Glassing point|Bed|Rub|Scrape|Tracks|Scat|Water|Gate|Trail camera|Kill|Blood|Other)( \d+)?$/);
    it.icon = b.dataset.icon;
    if (prevDefault) { it.name = `${WPT_BY[it.icon].label}${prevDefault[2] || ''}`; q('[data-f="name"]').value = it.name; H.els.sheetT.textContent = it.name; }
    body.querySelectorAll('[data-icon]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    save();
  });
  body.querySelectorAll('[data-a]').forEach((b) => b.onclick = async () => {
    const a = b.dataset.a;
    if (a === 'del') { if (!confirm(`Delete "${it.name}"? This cannot be undone.`)) return; await deleteAny(it); await refresh(); H.closeSheet(); H.toast('Deleted'); }
    else if (a === 'rings') { H.closeSheet(); setRings(it.coords); }
    else if (a === 'cone') { H.closeSheet(); H.scentCone(it.coords); }
    else if (a === 'insights') H.insightsAt(it.coords, it.name);
    else if (a === 'move') { const c = here('centre'); it.coords = [+c[0].toFixed(6), +c[1].toFixed(6)]; await save(); openItem(it.id); H.toast('Moved to the map centre'); }
    else if (a === 'fit') fitItem(it);
    else if (a === 'done') H.closeSheet();
    else if (a === 'share') content.exportSheet([it], it.name);
  });
  if (fresh) { const n = q('[data-f="name"]'); if (n && !matchMedia('(pointer: coarse)').matches) n.select(); }
  if (isW) {
    if (!fresh) fitItem(it);
    photoBox(it, q('[data-out="photo"]'), save);
    const out = q('[data-out="elev"]'); // held now: after the wait the sheet may show something else
    const e = await H.elevationAt(it.coords).catch(() => null);
    if (out && out.isConnected) out.textContent = e == null ? 'Not available offline here' : u.elev(Math.round(e));
  } else {
    const st = q('[data-out="stats"]');
    st.innerHTML = statBoxes(it);
    fitItem(it);
    if (it.kind !== 'area') profileHtml(it.coords, q('[data-out="profile"]'), it).then((r) => { if (r && st.isConnected) st.innerHTML = statBoxes(it, r); });
  }
}
function statBoxes(it, prof) {
  const u = ctx.H.units, box = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
  if (it.kind === 'area') return box('Area', u.area(ringArea(it.coords))) + box('Perimeter', u.dist(perimeter(it.coords))) + box('Corners', it.coords.length);
  let s = box('Distance', u.dist(lineLength(it.coords)));
  if (prof) s += box('Climb', u.elev(Math.round(prof.up))) + box('Drop', u.elev(Math.round(prof.down)));
  if (it.kind === 'track' && it.times) {
    const t0 = it.times.find((x) => x), t1 = [...it.times].reverse().find((x) => x);
    if (it.moving) s += box('Moving time', fmtDur(it.moving));
    if (t0 && t1) s += box('Total time', fmtDur(t1 - t0));
  }
  return s;
}

// ---------- photo (IndexedDB blob, resized to 1600 px) ----------
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.82));
  } catch (err) { return file; }
}
let photoUrl = null;
async function photoBox(it, box, save) {
  if (!box) return;
  if (photoUrl) { URL.revokeObjectURL(photoUrl); photoUrl = null; }
  const rec = it.photo ? await store.get('photos', it.photo).catch(() => null) : null;
  if (rec && rec.blob) photoUrl = URL.createObjectURL(rec.blob);
  box.innerHTML = `${photoUrl ? `<img src="${photoUrl}" alt="Photo for ${esc(it.name)}">` : ''}
    <div class="hmm-btnrow"><label class="hmm-btn2">${photoUrl ? 'Replace photo' : 'Add a photo'}<input type="file" accept="image/*" hidden data-p="file"></label>${photoUrl ? '<button class="hmm-btn2" data-p="rm">Remove photo</button>' : ''}</div>`;
  box.querySelector('[data-p="file"]').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const blob = await shrink(f), id = it.photo || store.uid('p');
    try { await store.put('photos', { id, blob }); it.photo = id; await save(); } catch (err) { ctx.H.toast('Could not save the photo. Storage may be full.', 4000); }
    photoBox(it, box, save);
  };
  const rm = box.querySelector('[data-p="rm"]');
  if (rm) rm.onclick = async () => { await store.del('photos', it.photo).catch(() => {}); it.photo = ''; await save(); photoBox(it, box, save); };
}

// ---------- elevation profile (terrain tiles, so it works offline for saved areas) ----------
async function profileHtml(coords, box, it) {
  if (!box || coords.length < 2) return null;
  const H = ctx.H, u = H.units, n = Math.min(160, Math.max(40, coords.length * 4));
  const pts = sampleLine(coords, n);
  const eles = await Promise.all(pts.map((p) => H.elevationAt([p[0], p[1]]).catch(() => null)));
  if (!box.isConnected) return null; // the sheet moved on while the terrain loaded
  const ok = eles.filter((e) => e != null);
  if (ok.length < n * 0.6) {
    const rec = coords.map((c) => c[2]).filter((e) => e != null);
    if (rec.length < 2) { box.innerHTML = '<p class="hmm-muted">Terrain is not available here offline. Save this area in Offline Maps to see the profile.</p>'; return null; }
  }
  for (let i = 0; i < eles.length; i++) if (eles[i] == null) eles[i] = eles[i - 1] ?? ok[0];
  const total = pts[pts.length - 1][2], lo = Math.min(...eles), hi = Math.max(...eles), span = Math.max(20, hi - lo);
  const W = 320, Hh = 130, pl = 4, pb = 4, x = (d) => pl + (d / total) * (W - pl * 2), y = (e) => Hh - pb - ((e - lo) / span) * (Hh - 26);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[2]).toFixed(1)} ${y(eles[i]).toFixed(1)}`).join('');
  const c = climb(eles), grade = Math.max(...pts.slice(1).map((p, i) => Math.abs(eles[i + 1] - eles[i]) / Math.max(1, p[2] - pts[i][2]))) * 100;
  box.innerHTML = `<div class="hmt-chart"><svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="Elevation profile from ${u.elev(Math.round(lo))} to ${u.elev(Math.round(hi))}">
      <path d="${path}L${x(total)} ${Hh}L${pl} ${Hh}Z" class="hmt-area"/><path d="${path}" class="hmt-ln"/><line class="hmt-cur" x1="-10" x2="-10" y1="0" y2="${Hh}"/></svg>
      <span class="hmt-hi">${u.elev(Math.round(hi))}</span><span class="hmt-lo">${u.elev(Math.round(lo))}</span><output class="hmt-read" hidden></output></div>
    <div class="hmt-axis"><span>0</span><span>${u.dist(total / 2)}</span><span>${u.dist(total)}</span></div>
    <p class="hmm-muted">Climb ${u.elev(Math.round(c.up))}, drop ${u.elev(Math.round(c.down))}, steepest stretch about ${Math.round(Math.min(grade, 150))}% grade. Drag on the chart to see the spot on the map.</p>`;
  const svg = box.querySelector('svg'), cur = box.querySelector('.hmt-cur'), read = box.querySelector('.hmt-read');
  const scrub = (ev) => {
    const r = svg.getBoundingClientRect(), fx = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), i = Math.round(fx * (pts.length - 1));
    cur.setAttribute('x1', x(pts[i][2])); cur.setAttribute('x2', x(pts[i][2]));
    read.hidden = false; read.textContent = `${u.dist(pts[i][2])}: ${u.elev(Math.round(eles[i]))}`;
    ctx.overlays.marker = [pts[i][0], pts[i][1]]; drawOverlays();
  };
  svg.addEventListener('pointerdown', (ev) => { svg.setPointerCapture(ev.pointerId); scrub(ev); });
  svg.addEventListener('pointermove', (ev) => { if (ev.buttons || ev.pointerType === 'mouse') scrub(ev); });
  const clear = () => { if (ctx.overlays.marker) { ctx.overlays.marker = null; drawOverlays(); } };
  watchClose(clear);
  return { up: c.up, down: c.down, lo, hi, it };
}
function watchClose(fn) { // run fn once the sheet closes or its content is replaced
  const H = ctx.H, b = H.els.sheetB, obs = new MutationObserver(() => { if (H.els.sheet.hidden || !b.firstChild || !b.querySelector('.hmt-chart')) { obs.disconnect(); fn(); } });
  obs.observe(b, { childList: true }); obs.observe(H.els.sheet, { attributes: true, attributeFilter: ['hidden'] });
}

function profilePicker() {
  const H = ctx.H, list = ctx.items.filter((i) => i.kind === 'line' || i.kind === 'track');
  const body = H.openSheet({ title: 'Elevation profile', html: `
    <p class="hmm-muted">See the climb and drop along a line or a recorded track.</p>
    <div class="hmm-btnrow"><button class="hmm-primary" data-a="draw">Draw a line</button></div>
    ${list.length ? `<h3 class="hmm-h">Your lines and tracks</h3>${list.map((i) => `<button class="hmt-row" data-id="${esc(i.id)}"><span class="hmt-sw" style="background:${esc(i.color || '#e8590c')}"></span><span class="hmt-rn">${esc(i.name)}<small>${esc(KIND[i.kind])}, ${esc(itemStats(i))}</small></span></button>`).join('')}` : ''}` });
  body.querySelector('[data-a="draw"]').onclick = () => startDraw('line');
  body.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => openItem(b.dataset.id));
}

// ---------- drawing: line, area, measure ----------
let redrawing = false;
const DRAW_T = { line: 'Draw a line', area: 'Draw an area', measure: 'Measure' };
const DRAW_HINT = {
  line: 'Tap the map to add points along your route. Save when done.',
  area: 'Tap the map around the area, at least 3 corners. Save when done.',
  measure: 'Tap two or more points on the map to measure the distance.',
};
function startDraw(kind) {
  ctx.overlays.draft = { kind, pts: [] };
  drawOverlays(); drawPanel();
  hintOnce(`draw-${kind}`, DRAW_HINT[kind]);
}
function addDraftPoint(p) { const d = ctx.overlays.draft; if (!d) return; d.pts.push([+p[0].toFixed(6), +p[1].toFixed(6)]); drawOverlays(); drawPanel(); }
function drawPanel() {
  const H = ctx.H, d = ctx.overlays.draft, u = H.units; if (!d) return;
  const n = d.pts.length, len = lineLength(d.pts);
  let stats;
  if (d.kind === 'area') stats = n > 2 ? `${u.area(ringArea(d.pts))}, perimeter ${u.dist(perimeter(d.pts))}` : `${n} of 3 points needed`;
  else if (n > 1) {
    const last = d.pts.slice(-2), brg = bearingTo(last[0], last[1]);
    stats = `${u.dist(len)}${d.kind === 'measure' ? `, last leg ${u.dist(haversine(last[0], last[1]))} toward ${compass8(brg)} (${Math.round(brg)}°)` : ''}`;
  } else stats = n ? 'Add the next point' : 'Add the first point';
  const canSave = d.kind === 'area' ? n > 2 : n > 1;
  redrawing = true; // openSheet runs the previous panel's onClose: keep the draft while we only re-render
  const body = H.openSheet({ title: DRAW_T[d.kind], modal: false, onClose: () => { if (!redrawing && ctx.overlays.draft === d) { ctx.overlays.draft = null; drawOverlays(); } }, html: `
    <p class="hmt-drawstat" aria-live="polite"><b>${esc(stats)}</b></p>
    ${n < 2 ? `<p class="hmm-muted hmt-hint">${esc(DRAW_HINT[d.kind])} Or move the map and tap Add centre point.</p>` : ''}
    <div class="hmt-drawbtns">
      <button class="hmm-btn2" data-d="add">${H.icons.target}<span>Add centre point</span></button>
      <button class="hmm-btn2" data-d="undo" ${n ? '' : 'disabled'}>Undo</button>
      ${d.kind === 'measure' ? `<button class="hmm-btn2" data-d="clear" ${n ? '' : 'disabled'}>Clear</button><button class="hmm-primary" data-d="save" ${canSave ? '' : 'disabled'}>Save as line</button>`
    : `<button class="hmm-primary" data-d="save" ${canSave ? '' : 'disabled'}>Save</button>`}
    </div>` });
  redrawing = false;
  body.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
    const a = b.dataset.d;
    if (a === 'add') addDraftPoint(here('centre'));
    else if (a === 'undo') { d.pts.pop(); drawOverlays(); drawPanel(); }
    else if (a === 'clear') { d.pts = []; drawOverlays(); drawPanel(); }
    else if (a === 'save') {
      const kind = d.kind === 'area' ? 'area' : 'line', count = ctx.items.filter((i) => i.kind === kind).length + 1;
      const it = { kind, name: `${kind === 'area' ? 'Area' : 'Line'} ${count}`, note: '', color: '', folder: '', coords: d.pts.slice() };
      ctx.overlays.draft = null; drawOverlays();
      await store.saveItem(it); await refresh(); openItem(it.id, { fresh: true });
    }
  });
}

// ---------- long press (touch) and right click (mouse): menu for that spot ----------
function longPress() {
  const cv = ctx.map.getCanvasContainer(); let t = null, x0 = 0, y0 = 0;
  const cancel = () => { clearTimeout(t); t = null; };
  cv.addEventListener('touchstart', (e) => {
    cancel(); if (e.touches.length !== 1) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    t = setTimeout(() => { t = null; const r = cv.getBoundingClientRect(); spotMenu(ctx.map.unproject([x0 - r.left, y0 - r.top])); if (navigator.vibrate) navigator.vibrate(15); }, 600);
  }, { passive: true });
  cv.addEventListener('touchmove', (e) => { if (t && Math.hypot(e.touches[0].clientX - x0, e.touches[0].clientY - y0) > 10) cancel(); }, { passive: true });
  cv.addEventListener('touchend', cancel); cv.addEventListener('touchcancel', cancel);
  ctx.map.on('movestart', cancel);
  ctx.map.on('contextmenu', (e) => { if (!('ontouchstart' in window)) spotMenu(e.lngLat); });
}
function spotMenu(ll) {
  const H = ctx.H, p = [ll.lng, ll.lat], txt = H.units.coord(p[0], p[1]);
  ctx.overlays.marker = p; drawOverlays();
  const body = H.openSheet({ title: 'This spot', onClose: () => { ctx.overlays.marker = null; drawOverlays(); }, html: `
    <p class="hmm-muted">${esc(txt)}</p>
    <div class="hmt-tiles">${tile('wpt', wptSvg('other', '#e8590c', 26), 'Drop waypoint')}${tile('rings', I.rings, 'Range rings')}${tile('measure', I.ruler, 'Measure from here')}${typeof H.scentCone === 'function' ? tile('cone', I.cone, 'Scent cone') : ''}${typeof H.insightsAt === 'function' ? tile('insights', H.icons.insights, 'Insights') : ''}</div>` });
  body.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => {
    const t = b.dataset.t; ctx.overlays.marker = null;
    if (t === 'wpt') dropWaypoint(p);
    else if (t === 'rings') { H.closeSheet(); setRings(p); }
    else if (t === 'measure') { startDraw('measure'); addDraftPoint(p); }
    else if (t === 'cone') { H.closeSheet(); H.scentCone(p); }
    else if (t === 'insights') H.insightsAt(p);
  });
}
