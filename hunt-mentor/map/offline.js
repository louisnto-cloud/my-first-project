/* Hunt Map Offline Maps: frame an area, pick zooms, see the estimate, download into Cache Storage (hm-offline-<id>).
   Saves OpenFreeMap vector tiles (zoom 0 to 14), terrain tiles (zoom 0 to 12, one tile margin for contours),
   the fonts the style uses, the tile index, and our layer files for the area. Satellite is not bulk downloaded (licence).
   The service worker answers these hosts cache first. OpenFreeMap tile keys drop the weekly version so saved areas keep working. */
import { esc, prefs, savePrefs, tileRange, fmtNum, throttle } from './util.js';
import { OFM_TILEJSON, OFM_GLYPHS, FONTS, TERRARIUM, DEM_MAXZOOM } from './style.js';
import * as layers from './layers.js';
import * as spots from './spots.js';

const MAX_TILES = 25000;
const GLYPH_RANGES = ['0-255', '256-511', '512-767', '768-1023', '7680-7935', '8192-8447'];
// Same rule as sw.js: one cache key for every OpenFreeMap tile set version.
export const normKey = (u) => u.replace(/^(https:\/\/tiles\.openfreemap\.org\/[a-z0-9_]+)\/[^/]+\/(\d+\/\d+\/\d+\.pbf)(\?.*)?$/, '$1/_/$2');
const mb = (b) => `${fmtNum((b || 0) / 1048576, b > 1048576 * 100 ? 0 : 1)} MB`;

let H, map, ui = null, job = null;
export function init(api) { H = api; map = api.map; }

// ---------- list sheet ----------
export function openSheet() {
  const list = prefs.offline || [];
  const body = H.openSheet({ title: 'Offline Maps', bar: 'offline', tall: true, onClose: () => outlines(false), html: `
    <p class="hmm-muted">Save an area so the map works with no signal: Topo, contours, terrain and the hunting layers for that area.</p>
    <button class="hmm-primary block" data-o="new">${H.icons.download}<span>Save a new area</span></button>
    <h3 class="hmm-h">Saved areas</h3>
    <div class="hmm-olist">${list.length ? list.map(itemHtml).join('') : '<p class="hmm-muted">No saved areas yet.</p>'}</div>
    <h3 class="hmm-h">Storage</h3><div data-o="storage"><p class="hmm-muted">Checking</p></div>
    <p class="hmm-muted">Satellite imagery is not saved for offline use (Esri licence). Satellite tiles you looked at stay on the phone for a while.</p>` });
  outlines(true);
  body.addEventListener('click', onClick);
  storage(body);
}
function itemHtml(a) {
  return `<div class="hmm-oitem" data-id="${esc(a.id)}">
    <div class="hmm-oname"><b>${esc(a.name)}</b><small>${mb(a.bytes)}, ${fmtNum(a.tiles)} tiles, zoom ${a.minZ} to ${a.maxZ}, saved ${esc(String(a.created).slice(0, 10))}${a.failed ? `. <span class="hmm-warn">${fmtNum(a.failed)} missing</span>` : ''}</small></div>
    <div class="hmm-obtns">
      <button class="hmm-btn2" data-o="show">Show</button>
      <button class="hmm-btn2" data-o="rename" aria-label="Rename ${esc(a.name)}">${H.icons.edit}</button>
      ${a.failed ? '<button class="hmm-btn2" data-o="fix">Fix</button>' : ''}
      <button class="hmm-btn2 danger" data-o="del" aria-label="Delete ${esc(a.name)}">${H.icons.trash}</button>
    </div></div>`;
}
async function storage(body) {
  const el = body.querySelector('[data-o="storage"]'); if (!el) return;
  let html = '';
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      html += `<div class="hmm-kv"><span>Used by Hunt Mentor</span><b>${mb(e.usage)}</b></div>${e.quota ? `<div class="hmm-kv"><span>Room left</span><b>${mb(Math.max(0, e.quota - e.usage))}</b></div>` : ''}`;
    }
    const kept = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
    html += kept ? '<p>Saved maps are protected from automatic clean up.</p>'
      : '<p class="hmm-muted">The phone can clear saved maps when space runs low or the app goes unused for weeks.</p><button class="hmm-btn2" data-o="persist">Keep my saved maps</button>';
  } catch (err) { html += '<p class="hmm-muted">Storage details are not available here.</p>'; }
  el.innerHTML = html;
}
async function onClick(e) {
  const b = e.target.closest('[data-o]'); if (!b) return;
  const act = b.dataset.o, row = b.closest('.hmm-oitem'), list = prefs.offline || [];
  const a = row && list.find((x) => x.id === row.dataset.id);
  if (act === 'new') startFrame();
  else if (act === 'persist') {
    const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist().catch(() => false) : false;
    H.toast(ok ? 'Saved maps are protected.' : 'The phone did not allow it. Add Hunt Mentor to your Home Screen and try again.', 4500);
    storage(H.els.sheetB);
  } else if (a && act === 'show') { H.closeSheet(); map.fitBounds([[a.bbox[0], a.bbox[1]], [a.bbox[2], a.bbox[3]]], { padding: 50, duration: 1000 }); }
  else if (a && act === 'del') {
    if (!confirm(`Delete "${a.name}" from this phone?`)) return;
    await caches.delete(`hm-offline-${a.id}`).catch(() => {});
    prefs.offline = list.filter((x) => x !== a); savePrefs(); openSheet(); H.toast('Deleted');
  } else if (a && act === 'rename') {
    const name = row.querySelector('.hmm-oname b');
    name.outerHTML = `<span class="hmm-rename"><input type="text" maxlength="40" value="${esc(a.name)}" aria-label="New name"><button class="hmm-btn2" data-o="save">Save</button></span>`;
    const inp = row.querySelector('input'); inp.focus(); inp.select();
  } else if (a && act === 'save') {
    const v = row.querySelector('input').value.trim(); if (v) { a.name = v; savePrefs(); } openSheet();
  } else if (a && act === 'fix') { H.closeSheet(); runDownload(a, true); }
}

function outlines(on) {
  const id = 'hm-offline-areas';
  if (!map.isStyleLoaded()) return;
  if (!on) { if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`); if (map.getSource(id)) map.removeSource(id); return; }
  const fc = { type: 'FeatureCollection', features: (prefs.offline || []).map((a) => ({ type: 'Feature', properties: { name: a.name }, geometry: { type: 'Polygon', coordinates: [[[a.bbox[0], a.bbox[1]], [a.bbox[2], a.bbox[1]], [a.bbox[2], a.bbox[3]], [a.bbox[0], a.bbox[3]], [a.bbox[0], a.bbox[1]]]] } })) };
  if (map.getSource(id)) map.getSource(id).setData(fc);
  else { map.addSource(id, { type: 'geojson', data: fc }); map.addLayer({ id: `${id}-line`, type: 'line', source: id, paint: { 'line-color': '#e8590c', 'line-width': 2.5, 'line-dasharray': [2, 1.5] } }); }
}

// ---------- framing a new area ----------
export function cancelFrame() {
  if (!ui) return;
  if (job) job.cancelled = true;
  map.off('move', ui.onMove);
  ui.frame.remove(); ui.panel.remove(); H.els.bar.parentNode.classList.remove('framing'); ui = null;
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
function startFrame() {
  H.closeSheet();
  if (map.getPitch() > 0 || map.getBearing()) map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
  const host = H.els.bar.parentNode; host.classList.add('framing');
  const frame = document.createElement('div'); frame.className = 'hmm-frame';
  frame.innerHTML = '<div class="hmm-frame-box"><span>Move and zoom the map to fit your area in the box</span></div>';
  const opt = (a, b, sel) => Array.from({ length: b - a + 1 }, (_, i) => a + i).map((z) => `<option value="${z}" ${z === sel ? 'selected' : ''}>${z}</option>`).join('');
  const panel = document.createElement('div'); panel.className = 'hmm-fpanel';
  panel.innerHTML = `<h2>Save an offline area</h2>
    <label class="hmm-field"><span>Name</span><input type="text" maxlength="40" data-f="name" value="${esc(defaultName())}"></label>
    <div class="hmm-zooms"><label class="hmm-field"><span>From zoom</span><select data-f="min">${opt(4, 12, 6)}</select></label>
      <label class="hmm-field"><span>To zoom</span><select data-f="max">${opt(10, 14, 14)}</select></label></div>
    <p class="hmm-est" data-f="est"></p>
    <div class="hmm-prog" hidden><i></i></div><p class="hmm-muted hmm-progt" hidden></p>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-f="cancel">Cancel</button><button class="hmm-primary" data-f="go">${H.icons.download}<span>Download</span></button></div>`;
  host.append(frame, panel);
  ui = { frame, panel, onMove: throttle(estimate, 250) };
  map.on('move', ui.onMove);
  panel.querySelector('[data-f="cancel"]').onclick = () => { if (job) { job.cancelled = true; } else cancelFrame(); };
  panel.querySelectorAll('select').forEach((s) => { s.onchange = estimate; });
  panel.querySelector('[data-f="go"]').onclick = () => {
    const name = panel.querySelector('[data-f="name"]').value.trim() || defaultName();
    const minZ = +panel.querySelector('[data-f="min"]').value, maxZ = Math.max(minZ, +panel.querySelector('[data-f="max"]').value);
    runDownload({ id: Date.now().toString(36), name, bbox: frameBbox(), minZ, maxZ }, false);
  };
  setTimeout(estimate, 450);
}
function frameBbox() {
  const r = ui.frame.querySelector('.hmm-frame-box').getBoundingClientRect(), c = map.getContainer().getBoundingClientRect();
  const a = map.unproject([r.left - c.left, r.top - c.top]), b = map.unproject([r.right - c.left, r.bottom - c.top]);
  return [Math.min(a.lng, b.lng), Math.min(a.lat, b.lat), Math.max(a.lng, b.lng), Math.max(a.lat, b.lat)].map((v) => +v.toFixed(5));
}
function plan(bbox, minZ, maxZ) {
  const vec = [], dem = [];
  for (let z = 0; z <= Math.min(maxZ, 14); z++) {
    if (z > 5 && z < minZ) continue;
    const r = tileRange(bbox, z);
    for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) vec.push([z, x, y]);
  }
  for (let z = 0; z <= Math.min(maxZ, DEM_MAXZOOM); z++) {
    if (z > 5 && z < minZ - 1) continue;
    const r = tileRange(bbox, z), n = 2 ** z - 1;
    for (let x = Math.max(0, r.x0 - 1); x <= Math.min(n, r.x1 + 1); x++) for (let y = Math.max(0, r.y0 - 1); y <= Math.min(n, r.y1 + 1); y++) dem.push([z, x, y]);
  }
  const vb = vec.reduce((s, [z]) => s + (z <= 8 ? 30e3 : z <= 11 ? 20e3 : 11e3), 0), db = dem.length * 45e3;
  return { vec, dem, bytes: vb + db + 900e3 };
}
function estimate() {
  if (!ui || job) return;
  const minZ = +ui.panel.querySelector('[data-f="min"]').value, maxZ = +ui.panel.querySelector('[data-f="max"]').value;
  const p = plan(frameBbox(), minZ, Math.max(minZ, maxZ)), n = p.vec.length + p.dem.length;
  const est = ui.panel.querySelector('[data-f="est"]'), go = ui.panel.querySelector('[data-f="go"]');
  const tooBig = n > MAX_TILES, off = !navigator.onLine;
  est.innerHTML = tooBig ? `<b class="hmm-warn">Too big: ${fmtNum(n)} tiles.</b> Zoom the map in, or pick a lower To zoom.`
    : `<b>${fmtNum(n)} tiles, about ${mb(p.bytes)}</b> (estimate), plus hunting layers for this area. ${maxZ >= 14 ? 'Zoom 14 shows every trail and contour.' : 'Lower zooms suit big areas.'}${off ? ' <b class="hmm-warn">Connect to the internet to download.</b>' : ''}`;
  go.disabled = tooBig || off;
}

// ---------- download ----------
let wake = null;
async function holdWake() { try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (err) { wake = null; } }
function releaseWake() { try { if (wake) wake.release(); } catch (err) { /* already released */ } wake = null; }

async function vectorTemplate() {
  const s = map.getSource('omt');
  if (s && s.tiles && s.tiles[0]) return s.tiles[0];
  const tj = await (await fetch(OFM_TILEJSON)).json();
  return tj.tiles[0];
}
async function fetchRetry(url, tries = 3) {
  for (let i = 0; ; i++) {
    try { const r = await fetch(url, { mode: 'cors', signal: job && job.ctrl.signal }); if (r.ok || r.status === 404 || i >= tries - 1) return r; } catch (err) { if (i >= tries - 1 || (job && job.cancelled)) throw err; }
    await new Promise((res) => setTimeout(res, 600 * (i + 1)));
  }
}

async function runDownload(area, fixing) {
  if (!ui) startFrame();
  const panel = ui.panel, bar = panel.querySelector('.hmm-prog'), txt = panel.querySelector('.hmm-progt');
  const go = panel.querySelector('[data-f="go"]');
  panel.querySelectorAll('input,select').forEach((x) => { x.disabled = true; }); go.disabled = true;
  bar.hidden = false; txt.hidden = false; txt.textContent = 'Getting ready';
  job = { cancelled: false, ctrl: new AbortController() };
  holdWake();
  const cacheName = `hm-offline-${area.id}`, cache = await caches.open(cacheName);
  const items = [];
  try {
    const tpl = await vectorTemplate();
    const p = plan(area.bbox, area.minZ, area.maxZ);
    items.push({ url: OFM_TILEJSON, key: OFM_TILEJSON });
    for (const [z, x, y] of p.vec) { const u = tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y); items.push({ url: u, key: normKey(u), flag: true }); }
    for (const [z, x, y] of p.dem) { const u = TERRARIUM.replace('{z}', z).replace('{x}', x).replace('{y}', y); items.push({ url: u, key: u, flag: true }); }
    for (const f of FONTS) for (const r of GLYPH_RANGES) { const u = OFM_GLYPHS.replace('{fontstack}', f).replace('{range}', r); items.push({ url: u, key: u, flag: true }); }
    const base = location.href.split('#')[0];
    items.push({ url: new URL('data/layers/manifest.json', base).href, key: new URL('data/layers/manifest.json', base).href });
    for (const u of await layerFiles(area.bbox)) items.push({ url: new URL(u, base).href, key: new URL(u, base).href });
  } catch (err) {
    txt.textContent = 'Could not start. Check your connection and try again.'; job = null; releaseWake();
    panel.querySelectorAll('input,select').forEach((x) => { x.disabled = false; }); go.disabled = false; return;
  }
  let done = 0, bytes = 0, failed = 0;
  const total = items.length, queue = items.slice();
  const show = throttle(() => { bar.firstElementChild.style.width = `${(done / total) * 100}%`; txt.textContent = `Saving ${fmtNum(done)} of ${fmtNum(total)}, ${mb(bytes)}`; }, 150);
  const work = async () => {
    while (queue.length && !job.cancelled) {
      const it = queue.shift();
      try {
        if (fixing && await cache.match(it.key, { ignoreVary: true })) { done++; show(); continue; }
        let res = await caches.match(it.key, { ignoreVary: true });
        if (!res) res = await fetchRetry(it.flag ? `${it.url}${it.url.includes('?') ? '&' : '?'}hmdl=1` : it.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.clone().blob(); bytes += blob.size;
        await cache.put(it.key, res);
      } catch (err) { if (!job.cancelled) failed++; }
      done++; show();
    }
  };
  await Promise.all(Array.from({ length: 6 }, work));
  const cancelled = job.cancelled; job = null; releaseWake();
  if (cancelled) {
    if (!fixing) await caches.delete(cacheName).catch(() => {});
    cancelFrame(); H.toast('Download cancelled'); return;
  }
  const list = prefs.offline || (prefs.offline = []);
  const old = list.find((x) => x.id === area.id);
  const meta = { id: area.id, name: area.name, bbox: area.bbox, minZ: area.minZ, maxZ: area.maxZ, tiles: total, bytes: fixing && old ? Math.max(old.bytes, bytes) : bytes, failed, created: new Date().toISOString().slice(0, 10) };
  if (old) Object.assign(old, meta); else list.push(meta);
  savePrefs();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  cancelFrame();
  H.toast(failed ? `Saved "${area.name}" with ${fmtNum(failed)} tiles missing. Tap Fix later with a connection.` : `Saved "${area.name}" for offline use.`, 5000);
  openSheet();
}

async function layerFiles(bbox) {
  await layers.loadManifest();
  const out = new Set();
  for (const l of layers.layerList()) {
    const st = layers.stateOf(l.id);
    if (!st || st.unsupported) continue;
    for (const f of st.files) if (!f.box || (f.box[0] <= bbox[2] && f.box[2] >= bbox[0] && f.box[1] <= bbox[3] && f.box[3] >= bbox[1])) out.add(f.url);
    if (st.spot) for (const u of spots.detailFiles(l, bbox)) out.add(u); // spot cards (detail tiles)
  }
  return [...out];
}
