/* Hunt Map Offline Maps: save an area once at home on wifi, then the map works with no signal.
   Pick: "My base area" (Heffley Creek, 25 km around), "This view" (the box on screen) or "Draw a box".
   Shows the size per part before download, a progress bar, Stop and Resume (a stopped or interrupted download picks up
   where it left off), a storage meter, and asks the phone to keep the saved maps (navigator.storage.persist).
   Saved into Cache Storage "hm-offline-<id>":
   - Topo: OpenFreeMap vector tiles, zoom 0 to 14 (keys drop the weekly version so saved areas keep working).
   - Terrain: terrarium tiles zoom 0 to DEM_MAXZOOM (style.js), one tile margin so hillshade, contours and 3D have edges.
   - Map text: the fonts the style uses (the style draws its icons on a canvas, so it has no sprite to save).
   - Hunting layers from data/layers/manifest.json, GeoJSON or PMTiles alike. A PMTiles file up to PM_WHOLE_MAX is saved
     whole; a bigger one saves only the byte ranges this area needs (header, directories and the area's tiles, merged
     into chunks, key "<file>?v=..&hmr=<start>-<end>"). sw.js cuts any range MapLibre asks for out of those chunks.
   - Spots: the area index and the spot card detail tiles for the box.
   - Satellite (Esri World Imagery) is not bulk saved: its terms for bulk offline use are unclear. Viewed tiles are cached normally.
   Window API (added): HuntMap.offline = { openSheet, save({ preset: 'base'|'view', bbox?, name?, maxZ? }), list() }. */
import { esc, prefs, savePrefs, tileRange, fmtNum, throttle } from './util.js';
import { OFM_TILEJSON, OFM_GLYPHS, FONTS, TERRARIUM, DEM_MAXZOOM } from './style.js';
import * as layers from './layers.js';
import * as spots from './spots.js';

// Heffley Creek base (same point as core.js DEFAULT_VIEW and SPOTS.md). Radius per the owner: about 25 km around.
const BASE = { name: 'My base area (Heffley Creek)', lng: -120.2687, lat: 50.8581, km: 25 };
const MAX_TILES = 30000;
const PM_WHOLE_MAX = 1048576; // PMTiles files up to 1 MB are saved whole; bigger ones save only the byte ranges the area needs
const CHUNK_GAP = 32 * 1024, CHUNK_MAX = 2 * 1048576;
const GLYPH_RANGES = ['0-255', '256-511', '512-767', '768-1023', '7680-7935', '8192-8447'];
// Average stored tile size, from the Heffley Creek preset download (2026-10-11: topo 1,766 tiles 24.5 MB, terrain 282 tiles
// 14.8 MB). Only for the estimate; the saved list shows the real size.
const VEC_B = (z) => (z >= 13 ? 12.5e3 : z === 12 ? 16e3 : z === 11 ? 20e3 : z >= 9 ? 40e3 : 80e3);
const DEM_B = (z) => (z >= 12 ? 35e3 : z === 11 ? 46e3 : z === 10 ? 58e3 : 80e3);
const FONT_B = 70e3;
// Same rule as sw.js: one cache key for every OpenFreeMap tile set version.
export const normKey = (u) => u.replace(/^(https:\/\/tiles\.openfreemap\.org\/[a-z0-9_]+)\/[^/]+\/(\d+\/\d+\/\d+\.pbf)(\?.*)?$/, '$1/_/$2');
const mb = (b) => `${fmtNum((b || 0) / 1048576, b >= 1048576 * 100 ? 0 : 1)} MB`;
const gbmb = (b) => (b >= 1073741824 ? `${fmtNum(b / 1073741824, 1)} GB` : mb(b));
const dl = (u) => `${u}${u.includes('?') ? '&' : '?'}hmdl=1`; // sw.js sends these straight to the network
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const baseUrl = () => location.href.split('#')[0];
const abs = (u) => new URL(u, baseUrl()).href;

let H, map, ui = null, job = null;
export function init(api) {
  H = api; map = api.map;
  api.offline = { openSheet, save: apiSave, estimate: (bbox, maxZ) => estimateFor(bbox || baseArea(), maxZ), base: () => baseArea(), list: () => (prefs.offline || []).slice() };
  injectCss();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && job) holdWake(); });
  if (api.ready && api.ready.then) api.ready.then(() => setTimeout(resumeOnOpen, 5000));
  // No signal: saved tiles answer at once and missing ones fail at once, so the map can finish loading without a new frame:
  // MapLibre then never fires 'load' or 'idle', and core.js (ready, first idle) and layers.js wait for them. A few cheap repaints in the first
  // 20 seconds give it those events. Only while the map is already loaded (one frame each, nothing when it is busy).
  let n = 0; const t = setInterval(() => { if (++n > 30) clearInterval(t); else if (map.loaded()) map.triggerRepaint(); }, 700);
}
/** True while a download runs (the phone back button then stays on the map). */
export const busy = () => !!job;

// ---------- list sheet ----------
export function openSheet() {
  const list = prefs.offline || [];
  const body = H.openSheet({ title: 'Offline Maps', bar: 'offline', tall: true, onClose: () => outlines(false), html: `
    <p class="hmm-muted">Save your hunting area at home on wifi. The map then works with no signal: Topo, contours, hillshade, 3D terrain, hunting layers and spots.</p>
    <div class="hmo-presets">
      <button class="hmm-primary block" data-o="base">${H.icons.download}<span>My base area<small>Heffley Creek, about 25 km around</small></span></button>
      <button class="hmm-btn2" data-o="view">${H.icons.target}<span>This view</span></button>
      <button class="hmm-btn2" data-o="draw">${H.icons.edit}<span>Draw a box</span></button>
    </div>
    <h3 class="hmm-h">Saved areas</h3>
    <div class="hmm-olist">${list.length ? list.map(itemHtml).join('') : '<p class="hmm-muted">No saved areas yet.</p>'}</div>
    <h3 class="hmm-h">Storage on this phone</h3><div data-o="storage"><p class="hmm-muted">Checking</p></div>
    <h3 class="hmm-h">Satellite</h3>
    <ul class="hmo-ul"><li>Satellite photos are not saved for offline use.</li><li>Esri (the satellite provider) terms are unclear about bulk downloads, so Hunt Mentor does not bulk save them.</li><li>Satellite tiles you already looked at stay on the phone for a while and may still show with no signal.</li><li>Topo works fully offline in saved areas.</li></ul>` });
  outlines(true);
  // The sheet body element is reused by every sheet: wire the click handler once.
  if (!body.dataset.offlineWired) { body.dataset.offlineWired = '1'; body.addEventListener('click', onClick); }
  storage(body);
}
function itemHtml(a) {
  const state = a.partial ? `<span class="hmm-warn">${job && job.id === a.id ? 'Downloading' : 'Stopped part way'}: ${Math.round(((a.done || 0) / (a.total || 1)) * 100)}%</span>. `
    : a.failed ? `<span class="hmm-warn">${fmtNum(a.failed)} files missing</span>. ` : '';
  return `<div class="hmm-oitem" data-id="${esc(a.id)}">
    <div class="hmm-oname"><b>${esc(a.name)}</b><small>${state}${mb(a.bytes)}, saved ${esc(String(a.updated || a.created).slice(0, 10))}, zoom up to ${a.maxZ}</small></div>
    <div class="hmm-obtns">
      ${a.partial ? `<button class="hmm-btn2" data-o="resume" ${job ? 'disabled' : ''}>${H.icons.download}<span>Resume</span></button>`
    : `<button class="hmm-btn2" data-o="update" ${job ? 'disabled' : ''} aria-label="Update ${esc(a.name)}">${H.icons.download}<span>${a.failed ? 'Fix and update' : 'Update'}</span></button>`}
      <button class="hmm-btn2" data-o="show">${H.icons.target}<span>Show on map</span></button>
      <button class="hmm-btn2" data-o="rename" aria-label="Rename ${esc(a.name)}">${H.icons.edit}<span>Rename</span></button>
      <button class="hmm-btn2 danger" data-o="del" aria-label="Delete ${esc(a.name)}">${H.icons.trash}<span>Delete</span></button>
    </div></div>`;
}
async function storage(body) {
  const el = body.querySelector('[data-o="storage"]'); if (!el) return;
  let html = '';
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate(), used = e.usage || 0, q = e.quota || 0;
      const pct = q ? Math.min(100, Math.max(1, (used / q) * 100)) : 0;
      html += `<div class="hmo-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Storage used"><i style="width:${pct}%"></i></div>
        <div class="hmm-kv"><span>Used by Hunt Mentor</span><b>${gbmb(used)}</b></div>${q ? `<div class="hmm-kv"><span>Room left for the app</span><b>${gbmb(Math.max(0, q - used))}</b></div>` : ''}`;
    }
    const kept = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
    html += kept ? '<p class="hmm-muted">Saved maps are protected from automatic clean up.</p>'
      : '<p class="hmm-muted">The phone can clear saved maps when space runs low or the app goes unused for weeks. Adding Hunt Mentor to your Home Screen helps.</p><button class="hmm-btn2" data-o="persist">Keep my saved maps</button>';
  } catch (err) { html += '<p class="hmm-muted">Storage details are not available here.</p>'; }
  el.innerHTML = html;
}
const askPersist = () => (navigator.storage && navigator.storage.persist ? navigator.storage.persist().catch(() => false) : Promise.resolve(false));
async function onClick(e) {
  const b = e.target.closest('[data-o]'); if (!b || !H.els.sheetB.querySelector('.hmm-olist')) return; // only while Offline Maps shows
  const act = b.dataset.o, row = b.closest('.hmm-oitem'), list = prefs.offline || [];
  const a = row && list.find((x) => x.id === row.dataset.id);
  if (act === 'base') startPlan('base');
  else if (act === 'view') startPlan('view');
  else if (act === 'draw') startDraw();
  else if (act === 'persist') {
    const ok = await askPersist();
    H.toast(ok ? 'Saved maps are protected.' : 'The phone did not allow it. Add Hunt Mentor to your Home Screen and try again.', 4500);
    storage(H.els.sheetB);
  } else if (a && act === 'show') { H.closeSheet(); outlines(true); map.fitBounds([[a.bbox[0], a.bbox[1]], [a.bbox[2], a.bbox[3]]], { padding: 40, duration: 1000 }); setTimeout(() => outlines(false), 6000); }
  else if (a && act === 'del') {
    if (job && job.id === a.id) job.cancelled = true;
    if (!confirm(`Delete "${a.name}" from this phone?`)) return;
    await caches.delete(`hm-offline-${a.id}`).catch(() => {});
    prefs.offline = list.filter((x) => x !== a); savePrefs(); tellSw(); openSheet(); H.toast('Deleted');
  } else if (a && act === 'rename') {
    const name = row.querySelector('.hmm-oname b');
    name.outerHTML = `<span class="hmm-rename"><input type="text" maxlength="40" value="${esc(a.name)}" aria-label="New name"><button class="hmm-btn2" data-o="save">Save</button></span>`;
    const inp = row.querySelector('input'); inp.focus(); inp.select();
  } else if (a && act === 'save') {
    const v = row.querySelector('input').value.trim(); if (v) { a.name = v; savePrefs(); } openSheet();
  } else if (a && (act === 'resume' || act === 'update') && !job) {
    if (!navigator.onLine) { H.toast('Connect to the internet first.'); return; }
    H.closeSheet(); runDownload(a, act === 'update' ? 'update' : 'resume');
  }
}

function rectFc(boxes) {
  return { type: 'FeatureCollection', features: boxes.map((b) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]] } })) };
}
function setRects(id, boxes, color = '#e8590c') {
  if (!map.style) return;
  if (!boxes) { if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`); if (map.getLayer(`${id}-fill`)) map.removeLayer(`${id}-fill`); if (map.getSource(id)) map.removeSource(id); return; }
  if (map.getSource(id)) { map.getSource(id).setData(rectFc(boxes)); return; }
  map.addSource(id, { type: 'geojson', data: rectFc(boxes) });
  map.addLayer({ id: `${id}-fill`, type: 'fill', source: id, paint: { 'fill-color': color, 'fill-opacity': 0.08 } });
  map.addLayer({ id: `${id}-line`, type: 'line', source: id, paint: { 'line-color': color, 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
}
function outlines(on) { setRects('hm-offline-areas', on ? (prefs.offline || []).map((a) => a.bbox) : null); }

// ---------- planning an area ----------
function bboxAround(lng, lat, km) {
  const dy = km / 111.32, dx = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [lng - dx, lat - dy, lng + dx, lat + dy].map((v) => +v.toFixed(5));
}
function baseArea() {
  const b = (window.HM && Array.isArray(window.HM.bases) && window.HM.bases.find((x) => x.id === 'heffley')) || null;
  const lng = b && Number.isFinite(+b.lon) ? +b.lon : BASE.lng, lat = b && Number.isFinite(+b.lat) ? +b.lat : BASE.lat;
  return bboxAround(lng, lat, BASE.km);
}
/** Cancel framing or drawing. A running download stops and stays resumable. */
export function cancelFrame() {
  if (drawUi) { drawUi.remove(); drawUi = null; }
  if (!ui) return;
  if (job) job.cancelled = true;
  if (ui.onMove) map.off('move', ui.onMove);
  if (ui.frame) ui.frame.remove();
  ui.panel.remove(); H.els.bar.parentNode.classList.remove('framing'); ui = null;
  setRects('hm-offline-plan', null);
  releaseWake();
}
function defaultName() {
  const ids = ['tp-city', 'tp-town', 'tp-village', 'tp-hamlet'].filter((id) => map.getLayer(id));
  const c = map.project(map.getCenter()); let best = null, bd = Infinity;
  try {
    for (const f of map.queryRenderedFeatures({ layers: ids })) {
      const g = f.geometry; if (g.type !== 'Point' || !f.properties.name) continue;
      const p = map.project(g.coordinates), d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; best = f.properties.name; }
    }
  } catch (err) { /* style not ready */ }
  return best ? `Near ${best}` : `Area ${(prefs.offline || []).length + 1}`;
}
/** kind: 'base' | 'view' | 'box'. For 'box', bbox is the drawn box. */
function startPlan(kind, bbox) {
  H.closeSheet(); cancelFrame();
  if (map.getPitch() > 0 || map.getBearing()) map.jumpTo({ pitch: 0, bearing: 0 });
  const host = H.els.bar.parentNode; host.classList.add('framing');
  let frame = null, fixed = null;
  if (kind === 'view') {
    frame = document.createElement('div'); frame.className = 'hmm-frame';
    frame.innerHTML = '<div class="hmm-frame-box"><span>Move and zoom the map to fit your area in the box</span></div>';
  } else {
    fixed = kind === 'base' ? baseArea() : bbox;
    map.fitBounds([[fixed[0], fixed[1]], [fixed[2], fixed[3]]], { padding: { top: 120, bottom: 360, left: 24, right: 24 }, duration: 0 });
  }
  const panel = document.createElement('div'); panel.className = 'hmm-fpanel';
  panel.innerHTML = `<header class="hmm-fhead"><h2>${kind === 'base' ? 'Save my base area' : 'Save an offline area'}</h2><button class="hmm-x" data-f="x" aria-label="Close" title="Close">${H.icons.close}</button></header>
    <label class="hmm-field"><span>Name</span><input type="text" maxlength="40" data-f="name" value="${esc(kind === 'base' ? BASE.name : defaultName())}"></label>
    <label class="hmm-field"><span>Detail</span><select data-f="max">
      <option value="14" selected>Most: every trail and contour (zoom 14)</option><option value="13">Less: about a third of the size (zoom 13)</option><option value="12">Least: big areas (zoom 12)</option></select></label>
    <div class="hmo-est" data-f="est"></div>
    <div class="hmm-prog" hidden><i></i></div><p class="hmm-muted hmm-progt" hidden aria-live="polite"></p>
    <div class="hmm-btnrow">${kind === 'box' ? '<button class="hmm-btn2" data-f="redraw">Redraw</button>' : ''}<button class="hmm-btn2" data-f="cancel">Cancel</button><button class="hmm-primary" data-f="go">${H.icons.download}<span>Download</span></button></div>`;
  if (frame) host.append(frame);
  host.append(panel);
  ui = { kind, frame, panel, fixed, onMove: frame ? throttle(estimate, 400) : null };
  if (fixed) setRects('hm-offline-plan', [fixed]);
  if (ui.onMove) map.on('move', ui.onMove);
  panel.querySelector('[data-f="cancel"]').onclick = panel.querySelector('[data-f="x"]').onclick = () => cancelFrame();
  const rd = panel.querySelector('[data-f="redraw"]'); if (rd) rd.onclick = () => { cancelFrame(); startDraw(); };
  panel.querySelector('[data-f="max"]').onchange = estimate;
  panel.querySelector('[data-f="go"]').onclick = () => {
    const name = panel.querySelector('[data-f="name"]').value.trim() || defaultName();
    const maxZ = +panel.querySelector('[data-f="max"]').value;
    runDownload({ id: Date.now().toString(36), name, kind, bbox: planBbox(), minZ: 6, maxZ }, 'new');
  };
  setTimeout(estimate, 300);
}
function planBbox() {
  if (ui.fixed) return ui.fixed.slice();
  const r = ui.frame.querySelector('.hmm-frame-box').getBoundingClientRect(), c = map.getContainer().getBoundingClientRect();
  const a = map.unproject([r.left - c.left, r.top - c.top]), b = map.unproject([r.right - c.left, r.bottom - c.top]);
  return [Math.min(a.lng, b.lng), Math.min(a.lat, b.lat), Math.max(a.lng, b.lng), Math.max(a.lat, b.lat)].map((v) => +v.toFixed(5));
}

// ---------- draw a box ----------
let drawUi = null;
function startDraw() {
  H.closeSheet(); cancelFrame();
  if (map.getPitch() > 0 || map.getBearing()) map.jumpTo({ pitch: 0, bearing: 0 });
  const host = H.els.bar.parentNode;
  const el = document.createElement('div'); el.className = 'hmo-draw';
  el.innerHTML = `<p>Drag your finger over the map to draw a box around your area</p><button class="hmm-btn2" data-d="x">Cancel</button>`;
  host.append(el); drawUi = el;
  let start = null;
  const ll = (ev) => { const c = map.getContainer().getBoundingClientRect(); return map.unproject([ev.clientX - c.left, ev.clientY - c.top]); };
  const boxOf = (a, b) => [Math.min(a.lng, b.lng), Math.min(a.lat, b.lat), Math.max(a.lng, b.lng), Math.max(a.lat, b.lat)].map((v) => +v.toFixed(5));
  el.querySelector('[data-d="x"]').onclick = (ev) => { ev.stopPropagation(); setRects('hm-offline-plan', null); cancelFrame(); };
  el.addEventListener('pointerdown', (ev) => { if (ev.target.closest('button')) return; start = { ev: ll(ev), x: ev.clientX, y: ev.clientY }; el.setPointerCapture(ev.pointerId); });
  el.addEventListener('pointermove', (ev) => { if (start) setRects('hm-offline-plan', [boxOf(start.ev, ll(ev))]); });
  el.addEventListener('pointerup', (ev) => {
    if (!start) return;
    const big = Math.abs(ev.clientX - start.x) > 30 && Math.abs(ev.clientY - start.y) > 30, box = boxOf(start.ev, ll(ev)); start = null;
    if (!big) { setRects('hm-offline-plan', null); H.toast('Drag a bigger box.'); return; }
    el.remove(); drawUi = null; startPlan('box', box);
  });
}

// ---------- estimate ----------
/** Tile lists for an area. Zoom 0 to 5 always (small), then minZ up. Terrain keeps a one tile margin. */
function tileSets(bbox, minZ, maxZ) {
  const vec = [], dem = [];
  for (let z = 0; z <= Math.min(maxZ, 14); z++) {
    if (z > 5 && z < minZ) continue;
    const r = tileRange(bbox, z), n = 2 ** z - 1, m = z < Math.min(maxZ, 14) ? 1 : 0; // a one tile margin below the top zoom: a tilted view sees past the edge
    vec.push([z, Math.max(0, r.x0 - m), Math.min(n, r.x1 + m), Math.max(0, r.y0 - m), Math.min(n, r.y1 + m)]);
  }
  for (let z = 0; z <= Math.min(maxZ, DEM_MAXZOOM); z++) {
    if (z > 5 && z < minZ - 1) continue;
    const r = tileRange(bbox, z), n = 2 ** z - 1;
    dem.push([z, Math.max(0, r.x0 - 1), Math.min(n, r.x1 + 1), Math.max(0, r.y0 - 1), Math.min(n, r.y1 + 1)]);
  }
  return { vec, dem };
}
function countParts(bbox, minZ, maxZ) {
  const t = tileSets(bbox, minZ, maxZ);
  const sum = (sets, f) => sets.reduce((s, [z, x0, x1, y0, y1]) => { const k = (x1 - x0 + 1) * (y1 - y0 + 1); s.n += k; s.bytes += k * f(z); return s; }, { n: 0, bytes: 0 });
  return { topo: sum(t.vec, VEC_B), dem: sum(t.dem, DEM_B), fonts: { n: FONTS.length * GLYPH_RANGES.length, bytes: FONTS.length * GLYPH_RANGES.length * FONT_B } };
}
const sizeCache = new Map();
async function fileSize(u) {
  if (sizeCache.has(u)) return sizeCache.get(u);
  const p = fetch(abs(u), { method: 'HEAD', cache: 'no-store' }).then((r) => (r.ok ? +r.headers.get('content-length') || 0 : 0)).catch(() => 0);
  sizeCache.set(u, p); p.then((v) => { if (!v) sizeCache.delete(u); });
  return p;
}
const overlap = (a, b) => { if (!b) return 1; const w = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), h = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])); const ab = (b[2] - b[0]) * (b[3] - b[1]); return ab > 0 ? Math.min(1, (w * h) / ab) : 1; };
/** Layer and spot files for a box: [{ url, box, pm, part }] from the manifest, GeoJSON and PMTiles alike. */
async function areaFiles(bbox) {
  await layers.loadManifest();
  const out = new Map();
  const hit = (b) => !b || (b[0] <= bbox[2] && b[2] >= bbox[0] && b[1] <= bbox[3] && b[3] >= bbox[1]);
  for (const l of layers.layerList()) {
    const st = layers.stateOf(l.id);
    if (!st || st.unsupported) continue;
    const part = st.spot || l.group === 'Spots' ? 'spots' : 'layers';
    for (const f of st.files) if (hit(f.box)) out.set(f.url, { url: f.url, box: f.box, pm: /\.pmtiles(\?|$)/i.test(f.url), part, minzoom: l.minzoom });
    if (st.spot) for (const u of spots.detailFiles(l, bbox)) out.set(u, { url: u, box: null, pm: false, part: 'spots' });
  }
  return [...out.values()];
}
async function fileParts(bbox) {
  const files = await areaFiles(bbox);
  const sizes = await Promise.all(files.map((f) => fileSize(f.url)));
  const r = { layers: { n: 0, bytes: 0 }, spots: { n: 0, bytes: 0 }, unknown: 0 };
  files.forEach((f, i) => {
    const s = sizes[i]; if (!s) r.unknown++;
    const est = f.pm && s > PM_WHOLE_MAX ? Math.min(s, s * overlap(bbox, f.box) * 1.8 + 65536) : s;
    r[f.part].n++; r[f.part].bytes += est;
  });
  return r;
}
let estTok = 0;
async function estimate() {
  if (!ui || job) return;
  const tok = ++estTok, bbox = planBbox(), maxZ = +ui.panel.querySelector('[data-f="max"]').value;
  if (ui.frame) setRects('hm-offline-plan', null);
  const p = countParts(bbox, 6, maxZ), n = p.topo.n + p.dem.n;
  const est = ui.panel.querySelector('[data-f="est"]'), go = ui.panel.querySelector('[data-f="go"]');
  const tooBig = n > MAX_TILES, off = !navigator.onLine;
  const row = (label, x, extra = '') => `<tr><td>${label}</td><td>${x ? fmtNum(x.n) : ''}${extra}</td><td>${x ? mb(x.bytes) : 'Checking'}</td></tr>`;
  const draw = (fp) => {
    const total = p.topo.bytes + p.dem.bytes + p.fonts.bytes + (fp ? fp.layers.bytes + fp.spots.bytes : 0);
    const w = (bbox[2] - bbox[0]) * 111.32 * Math.cos((((bbox[1] + bbox[3]) / 2) * Math.PI) / 180), h = (bbox[3] - bbox[1]) * 111.32;
    est.innerHTML = tooBig ? `<p><b class="hmm-warn">Too big: ${fmtNum(n)} tiles.</b> Make the area smaller, or pick less detail.</p>`
      : `<p class="hmo-area">Area about ${fmtNum(w, 0)} km by ${fmtNum(h, 0)} km</p>
      <table class="hmo-tbl"><thead><tr><th>Part</th><th>Files</th><th>Size</th></tr></thead><tbody>
      ${row('Topo map', p.topo, ' tiles')}${row('Terrain (3D, hillshade, contours)', p.dem, ' tiles')}${row('Map text (fonts)', p.fonts)}
      ${row('Hunting layers', fp && fp.layers)}${row('Spots', fp && fp.spots)}
      <tr class="hmo-total"><td>Total (estimate)</td><td></td><td>${fp ? '' : 'about '}${mb(total)}</td></tr></tbody></table>
      ${off ? '<p><b class="hmm-warn">Connect to the internet to download.</b></p>' : ''}`;
  };
  draw(null);
  go.disabled = tooBig || off;
  if (tooBig || off) return;
  const fp = await fileParts(bbox).catch(() => null);
  if (tok === estTok && ui && !job) draw(fp);
}

// ---------- download ----------
let wake = null;
async function holdWake() { try { if (navigator.wakeLock && (!wake || wake.released)) wake = await navigator.wakeLock.request('screen'); } catch (err) { wake = null; } }
function releaseWake() { try { if (wake) wake.release(); } catch (err) { /* already released */ } wake = null; }
function tellSw() { try { const c = navigator.serviceWorker && navigator.serviceWorker.controller; if (c) c.postMessage({ hm: 'offline-changed' }); } catch (err) { /* no worker */ } }

async function vectorTemplate() {
  const s = map.getSource('omt');
  if (s && s.tiles && s.tiles[0]) return s.tiles[0];
  const tj = await (await fetch(dl(OFM_TILEJSON))).json();
  return tj.tiles[0];
}
/** Waits while the phone is offline or the screen is locked (iPhone pauses the page), so a pause is not a failure. */
async function waitUsable() {
  while ((!navigator.onLine || document.hidden) && job && !job.cancelled) await sleep(1000);
}
async function fetchRetry(url, opts = {}) {
  for (let i = 0; ; i++) {
    await waitUsable();
    if (job && job.cancelled) throw new Error('cancelled');
    try {
      const r = await fetch(url, { mode: 'cors', credentials: 'omit', signal: job && job.ctrl.signal, ...opts });
      if (r.ok || r.status === 404 || i >= 3) return r;
    } catch (err) {
      if (job && job.cancelled) throw err;
      if (!navigator.onLine || document.hidden) { i--; continue; } // paused, not failed: try again once back
      if (i >= 3) throw err;
    }
    await sleep(700 * (i + 1));
  }
}

// PMTiles: read the header and directories, list the byte ranges this area needs, merge them into chunks.
let pmLib = null;
function loadPmtilesLib() {
  if (window.pmtiles) return Promise.resolve(window.pmtiles);
  if (pmLib) return pmLib;
  pmLib = new Promise((res, rej) => {
    let sc = document.getElementById('hm-pmtiles'); const add = !sc;
    if (add) { sc = document.createElement('script'); sc.id = 'hm-pmtiles'; sc.src = new URL('../vendor/pmtiles.js', import.meta.url).href; }
    const done = () => (window.pmtiles ? res(window.pmtiles) : null);
    sc.addEventListener('load', () => (window.pmtiles ? res(window.pmtiles) : rej(new Error('pmtiles missing'))));
    sc.addEventListener('error', () => rej(new Error('pmtiles did not load')));
    if (add) document.head.appendChild(sc); else setTimeout(done, 0);
  });
  pmLib.catch(() => { pmLib = null; });
  return pmLib;
}
const SKIP = new Error('skip');
async function pmRanges(url, bbox, minzoom) {
  const pm = await loadPmtilesLib();
  const ranges = [];
  const src = {
    total: 0, dataStart: Infinity, etag: null,
    getKey: () => url,
    async getBytes(offset, length, signal) {
      ranges.push([offset, offset + length - 1]);
      if (offset >= this.dataStart) throw SKIP; // tile data: only note the range here, the chunks fetch it
      const r = await fetchRetry(dl(url), { headers: { range: `bytes=${offset}-${offset + length - 1}` } });
      if (r.status !== 206 && r.status !== 200) throw new Error(`HTTP ${r.status}`);
      const cr = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
      let data = await r.arrayBuffer();
      if (r.status === 200) { this.total = data.byteLength; data = data.slice(offset, offset + length); } else if (cr) this.total = +cr[1];
      this.etag = r.headers.get('etag');
      return { data, etag: this.etag || undefined };
    },
  };
  const p = new pm.PMTiles(src);
  const h = await p.getHeader();
  src.dataStart = h.tileDataOffset;
  await p.getMetadata().catch(() => null);
  const z0 = Math.max(h.minZoom, Math.max(0, (minzoom || 0) - 1)), z1 = h.maxZoom;
  for (let z = z0; z <= z1; z++) {
    const r = tileRange(bbox, z), n = 2 ** z - 1, m = z < z1 ? 1 : 0; // same margin rule as the topo tiles
    for (let x = Math.max(0, r.x0 - m); x <= Math.min(n, r.x1 + m); x++) for (let y = Math.max(0, r.y0 - m); y <= Math.min(n, r.y1 + m); y++) {
      try { await p.getZxy(z, x, y); } catch (err) { if (err !== SKIP) throw err; }
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const chunks = [];
  for (const [s, e] of ranges) {
    const c = chunks[chunks.length - 1];
    if (c && s <= c[1] + CHUNK_GAP && e - c[0] < CHUNK_MAX) c[1] = Math.max(c[1], e); else if (!c || e > c[1]) chunks.push([s, e]);
  }
  if (src.total) for (const c of chunks) c[1] = Math.min(c[1], src.total - 1);
  return { chunks, total: src.total, etag: src.etag };
}
// key: <file>?v=..&hmr=<start>-<end>&hmt=<file size>. sw.js reads these keys to cut ranges (same format there).
const rangeKey = (url, s, e, t) => `${url}${url.includes('?') ? '&' : '?'}hmr=${s}-${e}&hmt=${t || 0}`;

/** Every file the area needs: [{ url, key, part, range? }]. */
async function buildItems(area, onStep) {
  const items = [];
  const tpl = await vectorTemplate();
  const t = tileSets(area.bbox, area.minZ, area.maxZ);
  items.push({ url: OFM_TILEJSON, key: OFM_TILEJSON, part: 'topo', always: true });
  for (const [z, x0, x1, y0, y1] of t.vec) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const u = tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y); items.push({ url: u, key: normKey(u), part: 'topo' }); }
  for (const [z, x0, x1, y0, y1] of t.dem) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const u = TERRARIUM.replace('{z}', z).replace('{x}', x).replace('{y}', y); items.push({ url: u, key: u, part: 'dem' }); }
  for (const f of FONTS) for (const r of GLYPH_RANGES) { const u = OFM_GLYPHS.replace('{fontstack}', f).replace('{range}', r); items.push({ url: u, key: u, part: 'fonts' }); }
  const man = abs('data/layers/manifest.json');
  items.push({ url: man, key: man, part: 'layers', always: true });
  const files = await areaFiles(area.bbox);
  let i = 0;
  for (const f of files) {
    const u = abs(f.url);
    onStep(`Reading hunting layers ${++i} of ${files.length}`);
    if (f.pm) {
      const size = await fileSize(f.url);
      if (size && size <= PM_WHOLE_MAX) { items.push({ url: u, key: u, part: f.part }); continue; }
      try {
        const r = await pmRanges(u, area.bbox, f.minzoom);
        for (const [s, e] of r.chunks) items.push({ url: u, key: rangeKey(u, s, e, r.total), part: f.part, range: [s, e], total: r.total, etag: r.etag });
      } catch (err) { items.push({ url: u, key: u, part: f.part }); } // could not read the index: save the whole file
    } else items.push({ url: u, key: u, part: f.part });
  }
  return items;
}

function progressUi(area) {
  if (!ui) {
    const host = H.els.bar.parentNode; host.classList.add('framing');
    const panel = document.createElement('div'); panel.className = 'hmm-fpanel';
    panel.innerHTML = `<header class="hmm-fhead"><h2>Saving ${esc(area.name)}</h2></header><div class="hmm-prog"><i></i></div><p class="hmm-muted hmm-progt" aria-live="polite"></p><div class="hmm-btnrow"><button class="hmm-primary" data-f="go" disabled hidden></button></div>`;
    host.append(panel); ui = { kind: 'progress', panel, fixed: area.bbox };
    setRects('hm-offline-plan', [area.bbox]);
  }
  const panel = ui.panel;
  panel.querySelectorAll('input,select,[data-f="redraw"]').forEach((x) => { x.disabled = true; });
  const go = panel.querySelector('[data-f="go"]'); go.style.display = 'none';
  let stop = panel.querySelector('[data-f="stop"]');
  if (!stop) { stop = document.createElement('button'); stop.className = 'hmm-btn2'; stop.dataset.f = 'stop'; stop.textContent = 'Stop (resume later)'; panel.querySelector('.hmm-btnrow').prepend(stop); }
  // while saving, only the progress and Stop show (the panel stays short enough for a small phone)
  panel.querySelectorAll('[data-f="cancel"],[data-f="redraw"],.hmm-field,[data-f="est"]').forEach((x) => { x.style.display = 'none'; });
  stop.onclick = () => { if (job) job.cancelled = true; };
  const x = panel.querySelector('[data-f="x"]'); if (x) x.onclick = stop.onclick;
  const bar = panel.querySelector('.hmm-prog'), txt = panel.querySelector('.hmm-progt');
  bar.hidden = false; txt.hidden = false;
  return { bar, txt };
}

/** mode: 'new' | 'resume' (skip what is saved) | 'update' (fresh manifest and layer files, missing tiles, drop old versions). */
async function runDownload(area, mode) {
  if (job) { H.toast('A download is already running.'); return; }
  const { bar, txt } = progressUi(area);
  txt.textContent = 'Getting ready';
  job = { id: area.id, cancelled: false, ctrl: new AbortController() };
  holdWake(); askPersist();
  const list = prefs.offline || (prefs.offline = []);
  let rec = list.find((x) => x.id === area.id);
  if (!rec) { rec = { id: area.id, name: area.name, kind: area.kind, bbox: area.bbox, minZ: area.minZ, maxZ: area.maxZ, created: new Date().toISOString().slice(0, 10), bytes: 0 }; list.push(rec); }
  rec.partial = true; rec.done = rec.done || 0; savePrefs();
  const cacheName = `hm-offline-${area.id}`, cache = await caches.open(cacheName);
  let items;
  try { items = await buildItems(rec, (s) => { txt.textContent = s; }); } catch (err) {
    job = null; releaseWake();
    txt.textContent = 'Could not start. Check your connection and try again. Tap Resume in Offline Maps later.';
    setTimeout(() => { if (!job) cancelFrame(); }, 4000); return;
  }
  const total = items.length, queue = items.slice(), parts = {};
  let done = 0, bytes = 0, failed = 0, lastSave = 0;
  const t0 = Date.now();
  const show = throttle(() => {
    bar.firstElementChild.style.width = `${(done / total) * 100}%`;
    txt.textContent = `${Math.round((done / total) * 100)}%: ${fmtNum(done)} of ${fmtNum(total)} files${bytes ? `, ${mb(bytes)} new` : ''}. ${document.hidden ? '' : 'Keep the app open. The screen stays on.'}`;
    if (Date.now() - lastSave > 2000) { lastSave = Date.now(); rec.done = done; rec.total = total; savePrefs(); }
  }, 200);
  const sizeOf = (res) => +res.headers.get('content-length') || 0;
  const work = async () => {
    while (queue.length && !job.cancelled) {
      const it = queue.shift();
      const pt = parts[it.part] || (parts[it.part] = { n: 0, bytes: 0 });
      try {
        const have = !(it.always && mode !== 'resume') && await cache.match(it.key, { ignoreVary: true });
        if (have) { pt.n++; pt.bytes += sizeOf(have); done++; show(); continue; }
        let res = null;
        if (!it.range && !it.always && mode !== 'update') res = await caches.match(it.key, { ignoreVary: true }); // already viewed or in another area
        let size = 0;
        if (it.range) {
          const r = await fetchRetry(dl(it.url), { headers: { range: `bytes=${it.range[0]}-${it.range[1]}` } });
          if (r.status !== 206 && r.status !== 200) throw new Error(`HTTP ${r.status}`);
          let buf = await r.arrayBuffer();
          if (r.status === 200) buf = buf.slice(it.range[0], it.range[1] + 1);
          const hd = { 'Content-Type': 'application/octet-stream', 'Content-Length': String(buf.byteLength), 'X-Hm-Range': `${it.range[0]}-${it.range[1]}/${it.total || ''}` };
          if (it.etag) hd.ETag = it.etag;
          res = new Response(buf, { status: 200, headers: hd }); size = buf.byteLength;
        } else {
          if (!res) res = await fetchRetry(dl(it.url), it.always ? { cache: 'reload' } : {});
          if (res.status === 404) { done++; show(); continue; } // nothing there (a font range the font lacks): not a failure
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          // store with its real size (Content-Length), so Resume and the saved area list can add sizes without reading bodies
          const blob = await res.blob(), hd = new Headers(res.headers); size = blob.size;
          hd.delete('content-encoding'); hd.set('content-length', String(size));
          res = new Response(blob, { status: 200, headers: hd });
        }
        await cache.put(it.key, res);
        bytes += size; pt.n++; pt.bytes += size;
      } catch (err) { if (!job.cancelled) failed++; }
      done++; show();
    }
  };
  await Promise.all(Array.from({ length: 6 }, work));
  const cancelled = job.cancelled;
  if (!cancelled && mode === 'update') { // drop old versions of our files that the fresh plan no longer uses
    const keep = new Set(items.map((x) => x.key)), here = location.origin;
    for (const k of await cache.keys()) if (k.url.startsWith(here) && !keep.has(k.url)) await cache.delete(k);
  }
  job = null; releaseWake(); tellSw();
  rec.done = done; rec.total = total; rec.failed = failed; rec.parts = parts;
  rec.bytes = Object.values(parts).reduce((s, x) => s + x.bytes, 0);
  if (cancelled) { rec.done = Math.max(0, done - 6); savePrefs(); cancelFrame(); H.toast('Download stopped. Open Offline Maps and tap Resume to finish it.', 5000); return; }
  rec.partial = false; rec.updated = new Date().toISOString().slice(0, 10); rec.secs = Math.round((Date.now() - t0) / 1000);
  savePrefs(); cancelFrame();
  H.toast(failed ? `Saved "${area.name}" with ${fmtNum(failed)} files missing. Tap Fix and update later with a connection.` : `Saved "${area.name}" for offline use.`, 5000);
  openSheet();
}

// A download that was stopped by closing the app or the map: offer to finish it (or finish it if it was running).
let resumeOffered = false;
function resumeOnOpen() {
  if (resumeOffered || job || ui) return;
  const a = (prefs.offline || []).find((x) => x.partial);
  if (!a) return;
  resumeOffered = true;
  if (navigator.onLine && !document.hidden) { H.toast(`Finishing the download of "${a.name}".`, 3500); runDownload(a, 'resume'); }
}

/** For tests and other modules: save an area without the planning screen. */
async function apiSave({ preset = 'view', bbox = null, name = '', maxZ = 14, minZ = 6 } = {}) {
  const b = bbox || (preset === 'base' ? baseArea() : (() => { const v = map.getBounds(); return [v.getWest(), v.getSouth(), v.getEast(), v.getNorth()].map((x) => +x.toFixed(5)); })());
  const area = { id: Date.now().toString(36), name: name || (preset === 'base' ? BASE.name : defaultName()), kind: bbox ? 'box' : preset, bbox: b, minZ, maxZ };
  await runDownload(area, 'new');
  return (prefs.offline || []).find((x) => x.id === area.id);
}
/** Size estimate per part (for tests): { topo, dem, fonts, layers, spots }. */
export async function estimateFor(bbox, maxZ = 14) { const p = countParts(bbox, 6, maxZ); const f = await fileParts(bbox); return { ...p, layers: f.layers, spots: f.spots }; }

function injectCss() {
  if (document.getElementById('hmo-css')) return;
  const s = document.createElement('style'); s.id = 'hmo-css';
  s.textContent = `
.hmo-presets { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0 4px; }
.hmo-presets .hmm-primary { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; justify-content: center; text-align: left; }
.hmo-presets .hmm-primary small { display: block; font-weight: 600; font-size: 13px; opacity: 0.92; }
.hmo-presets .hmm-btn2 { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; font-weight: 700; }
.hmo-ul { margin: 4px 0 8px; padding-left: 20px; font-size: 14px; color: var(--hmm-muted); }
.hmo-ul li { margin: 2px 0; }
.hmo-meter { height: 12px; border-radius: 6px; background: var(--hmm-line); overflow: hidden; margin: 6px 0 2px; }
.hmo-meter i { display: block; height: 100%; background: var(--hmm-accent); }
.hmo-est { font-size: 14px; margin: 6px 0; }
.hmo-est p { margin: 4px 0; }
.hmo-area { color: var(--hmm-muted); }
.hmo-tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.hmo-tbl th { text-align: left; font-size: 12px; color: var(--hmm-muted); font-weight: 700; padding: 2px 4px 2px 0; }
.hmo-tbl td { padding: 3px 4px 3px 0; border-top: 1px solid var(--hmm-line); vertical-align: top; }
.hmo-tbl td:nth-child(2), .hmo-tbl td:nth-child(3), .hmo-tbl th:nth-child(2), .hmo-tbl th:nth-child(3) { text-align: right; white-space: nowrap; }
.hmo-total td { font-weight: 800; }
.hmo-draw { position: absolute; inset: 0; z-index: 5; touch-action: none; cursor: crosshair; }
.hmo-draw p { position: absolute; left: 16px; right: 16px; top: calc(var(--st, 0px) + 80px); margin: 0; padding: 10px 14px; border-radius: 14px; background: var(--hmm-card); color: var(--hmm-ink); font-weight: 700; text-align: center; box-shadow: var(--hmm-shadow); pointer-events: none; }
.hmo-draw button { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(var(--sb, 0px) + 110px); box-shadow: var(--hmm-shadow); }
.hmm-fpanel { max-height: 62%; overflow-y: auto; }
`;
  document.head.appendChild(s);
}
