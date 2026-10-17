/* Hunt Map tool: sightings log and heatmap. Log what you saw (animal, how many, sex, time, note) at a point.
   Saved on this phone only: localStorage key hm.sightings.v1, plus a copy in the map database (store.js, object store
   "sightings", record "log") so the app backup (More, Backup) carries it and a restore brings it back.
   Shown as dots (count inside) and a heatmap layer. Export as CSV (comma separated values) for a spreadsheet.
   Sets H.sightings = { open, list(), add(rec), remove(id), csv(), reload() }. */
import * as store from './store.js';
import { esc, fmtNum } from './util.js';
import { intro, here, pick, TIP } from './hunt-ui.js';

const LS = 'hm.sightings.v1', DBS = 'sightings', SRC = 'hh-sight';
const LAYERS = ['hh-sight-heat', 'hh-sight-dot', 'hh-sight-n'];
export const SPECIES = [
  ['mule deer', 'Mule deer', '#8d5a2b'], ['white tailed deer', 'White tailed deer', '#c47f2c'], ['moose', 'Moose', '#4e342e'], ['elk', 'Elk', '#a0522d'],
  ['black bear', 'Black bear', '#222222'], ['grizzly bear', 'Grizzly bear', '#6d4c41'], ['cougar', 'Cougar', '#b08850'], ['wolf', 'Wolf', '#607d8b'],
  ['coyote', 'Coyote', '#9e9d24'], ['mountain sheep', 'Mountain sheep', '#795548'], ['mountain goat', 'Mountain goat', '#9e9e9e'],
  ['grouse', 'Grouse', '#6a8d3a'], ['ducks', 'Ducks', '#1565c0'], ['geese', 'Geese', '#37474f'], ['turkey', 'Wild turkey', '#5d4037'], ['other', 'Other', '#7b1fa2'],
];
const SEX = [['male', 'Male'], ['female', 'Female'], ['young', 'Young'], ['mixed', 'Mixed group'], ['unknown', 'Not sure']];
const spName = (k) => (SPECIES.find((s) => s[0] === k) || [k, k])[1];
const sexName = (k) => (SEX.find((s) => s[0] === k) || [k, k])[1];

let H, map, data = { rev: 0, list: [] }, filter = '';

export function init(api) {
  H = api; map = H.map;
  H.sightings = { open, logAt: (p) => newAt(p), list: () => data.list.slice(), add, remove, csv, reload };
  H.onClick(onTap);
  // after a backup restore app.js calls H.tools.refresh(): reload the sightings too
  const T = H.tools;
  if (T && typeof T.refresh === 'function' && !T.refresh.hhWrapped) {
    const orig = T.refresh;
    T.refresh = async (...a) => { const r = await orig.apply(T, a); await reload(); return r; };
    T.refresh.hhWrapped = true;
  }
  reload();
}

// ---------- storage ----------
function readLS() { try { const v = JSON.parse(localStorage.getItem(LS) || 'null'); return v && Array.isArray(v.list) ? v : null; } catch (e) { return null; } }
function writeLS(v) { try { localStorage.setItem(LS, JSON.stringify(v)); return true; } catch (e) { return false; } }
/** Load: the database copy wins when the two differ (a restored backup changes only the database). */
export async function reload() {
  const ls = readLS();
  let db = null;
  try { db = await store.get(DBS, 'log'); } catch (e) { db = null; }
  if (db && Array.isArray(db.list) && (!ls || db.rev !== ls.rev)) { data = { rev: db.rev, list: db.list }; writeLS(data); }
  else if (ls) { data = ls; if (!db) store.put(DBS, { id: 'log', rev: ls.rev, list: ls.list }).catch(() => {}); }
  else data = { rev: 0, list: [] };
  draw();
  return data.list;
}
async function save() {
  data.rev = Date.now();
  const okLS = writeLS(data);
  let okDB = true;
  try { await store.put(DBS, { id: 'log', rev: data.rev, list: data.list }); } catch (e) { okDB = false; }
  if (!okLS && !okDB) H.toast('Could not save. Storage is blocked in this browser.', 4500);
  draw();
}
export async function add(rec) {
  const r = Object.assign({ id: store.uid('s'), sp: 'mule deer', n: 1, sex: 'unknown', t: Date.now(), note: '', created: Date.now() }, rec);
  r.lng = +(+r.lng).toFixed(6); r.lat = +(+r.lat).toFixed(6);
  data.list.push(r); await save(); return r;
}
export async function remove(id) { data.list = data.list.filter((r) => r.id !== id); await save(); }
async function update(r) { const i = data.list.findIndex((x) => x.id === r.id); if (i >= 0) data.list[i] = r; else data.list.push(r); await save(); }

// ---------- map layers ----------
const shown = () => data.list.filter((r) => !filter || r.sp === filter);
function fc() {
  return { type: 'FeatureCollection', features: shown().map((r) => ({ type: 'Feature', properties: { id: r.id, n: Math.max(1, +r.n || 1), label: String(Math.max(1, +r.n || 1)), color: (SPECIES.find((s) => s[0] === r.sp) || SPECIES[SPECIES.length - 1])[2] }, geometry: { type: 'Point', coordinates: [r.lng, r.lat] } })) };
}
function addLayers() {
  if (map.getSource(SRC)) return;
  map.addSource(SRC, { type: 'geojson', data: fc() });
  const before = map.getLayer(H.anchors.symbols) ? H.anchors.symbols : undefined;
  map.addLayer({ id: 'hh-sight-heat', type: 'heatmap', source: SRC, maxzoom: 17, paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'n'], 1, 0.6, 10, 1],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 15, 2],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 14, 12, 26, 16, 50],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0.75, 17, 0.25],
    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(255,255,178,0)', 0.2, 'rgba(254,217,118,0.6)', 0.45, 'rgb(253,141,60)', 0.7, 'rgb(240,59,32)', 1, 'rgb(189,0,38)'],
  } }, before);
  map.addLayer({ id: 'hh-sight-dot', type: 'circle', source: SRC, minzoom: 10, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 7, 15, 13], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 } });
  map.addLayer({ id: 'hh-sight-n', type: 'symbol', source: SRC, minzoom: 12, layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#fff' } });
}
function draw() {
  if (!map) return;
  const p = H.prefs.sight || {};
  if (!data.list.length && !map.getSource(SRC)) return; // nothing logged: no layers at all
  addLayers();
  map.getSource(SRC).setData(fc());
  const vis = (id, on) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
  vis('hh-sight-heat', p.heat !== false); vis('hh-sight-dot', p.dots !== false); vis('hh-sight-n', p.dots !== false);
}
function onTap(e) {
  if (!map.getLayer('hh-sight-dot') || (H.prefs.sight || {}).dots === false) return false;
  const pt = e.point, hit = map.queryRenderedFeatures([[pt.x - 10, pt.y - 10], [pt.x + 10, pt.y + 10]], { layers: ['hh-sight-dot', 'hh-sight-n'] });
  if (!hit.length) return false;
  const r = data.list.find((x) => x.id === hit[0].properties.id);
  if (r) form(r, false);
  return !!r;
}

// ---------- sheets ----------
const when = (t) => new Date(t).toLocaleString('en-CA', { timeZone: (window.HuntMentor && window.HuntMentor.TZ) || 'America/Vancouver', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export function open() {
  const p = H.prefs.sight || {};
  const list = shown().slice().sort((a, b) => b.t - a.t);
  const counts = {}; for (const r of data.list) counts[r.sp] = (counts[r.sp] || 0) + 1;
  const body = H.openSheet({ title: 'Sightings log', tall: true, bar: 'tools', html: `
    ${intro('where you saw animals, and where sightings bunch up over time.',
      ['Saw an animal? Log it right away: at your location, the map centre, or tap the spot.', 'Pick the animal, how many, male or female, and add a note (what it was doing, which way it went).', 'Over a season, turn on the heatmap to see the hot spots. Export a CSV (comma separated values) file for a spreadsheet.'])}
    <div class="hmm-btnrow"><button class="hmm-primary" data-sg="gps">Log at my location</button><button class="hmm-btn2" data-sg="centre">At the map centre</button><button class="hmm-btn2" data-sg="tap">Tap the map</button></div>
    <h3 class="hmm-h">On the map</h3>
    <label class="hmm-sw-row"><span>Heatmap<small>Warm colours where sightings bunch up</small></span><input type="checkbox" data-sv="heat" ${p.heat !== false ? 'checked' : ''}><i class="hmm-switch"></i></label>
    <label class="hmm-sw-row"><span>Dots<small>One dot per sighting, the number is how many animals. Tap a dot to edit it.</small></span><input type="checkbox" data-sv="dots" ${p.dots !== false ? 'checked' : ''}><i class="hmm-switch"></i></label>
    <label class="hmm-field">Show<select data-sg="filter" class="hh-select"><option value="">Every animal (${data.list.length})</option>${SPECIES.filter((s) => counts[s[0]]).map((s) => `<option value="${s[0]}" ${filter === s[0] ? 'selected' : ''}>${esc(s[1])} (${counts[s[0]]})</option>`).join('')}</select></label>
    <h3 class="hmm-h">Log (${list.length})</h3>
    ${list.length ? `<div class="hh-slist">${list.slice(0, 80).map((r) => `<button class="hh-srow" data-id="${esc(r.id)}"><i style="background:${(SPECIES.find((s) => s[0] === r.sp) || SPECIES[SPECIES.length - 1])[2]}"></i><span><b>${fmtNum(r.n)} ${esc(spName(r.sp))}</b>, ${esc(sexName(r.sex).toLowerCase())}<small>${esc(when(r.t))}${r.note ? `: ${esc(r.note.slice(0, 60))}` : ''}</small></span></button>`).join('')}</div>${list.length > 80 ? `<p class="hmm-muted">Showing the newest 80. The CSV has all ${list.length}.</p>` : ''}`
      : '<p class="hmm-muted">No sightings yet. Your first one starts the map.</p>'}
    <div class="hmm-btnrow"><button class="hmm-btn2" data-sg="csv" ${data.list.length ? '' : 'disabled'}>Export CSV</button></div>
    <p class="hmm-muted">Saved only on this phone and in the app backup (More, Backup). ${TIP} Log empty days too, in the note of a nearby sighting: knowing where animals were not is useful.</p>` });
  const on = (k, fn) => { const b = body.querySelector(`[data-sg="${k}"]`); if (b) b.onclick = fn; };
  on('gps', () => { const q = here('gps'); if (q) newAt(q); });
  on('centre', () => newAt(here('centre')));
  on('tap', async () => { const q = await pick('Tap where the animal was.'); if (q) newAt(q); else open(); });
  on('csv', () => exportCsv());
  body.querySelector('[data-sg="filter"]').onchange = (e) => { filter = e.target.value; draw(); open(); };
  body.querySelectorAll('[data-sv]').forEach((i) => i.onchange = () => { H.prefs.sight = Object.assign({}, H.prefs.sight, { [i.dataset.sv]: i.checked }); H.savePrefs(); draw(); });
  body.querySelectorAll('.hh-srow').forEach((b) => b.onclick = () => { const r = data.list.find((x) => x.id === b.dataset.id); if (r) { map.easeTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 13), duration: 500 }); form(r, false); } });
  return body;
}
function newAt(p) {
  const last = data.list[data.list.length - 1];
  form({ id: null, lng: p[0], lat: p[1], sp: last ? last.sp : 'mule deer', n: 1, sex: 'unknown', t: Date.now(), note: '' }, true);
}
const toLocalInput = (t) => { const d = new Date(t), z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };
function form(r, isNew) {
  const body = H.openSheet({ title: isNew ? 'Log a sighting' : 'Sighting', bar: 'tools', html: `
    <p class="hmm-muted">${esc(H.units.coord(r.lng, r.lat))}</p>
    <label class="hmm-field">Animal<select data-f="sp" class="hh-select">${SPECIES.map((s) => `<option value="${s[0]}" ${s[0] === r.sp ? 'selected' : ''}>${esc(s[1])}</option>`).join('')}</select></label>
    <div class="hmm-field">How many<div class="hh-count"><button type="button" class="hmm-btn2" data-f="minus" aria-label="One less">−</button><input type="number" inputmode="numeric" min="1" max="999" data-f="n" value="${esc(r.n)}" aria-label="How many"><button type="button" class="hmm-btn2" data-f="plus" aria-label="One more">+</button></div></div>
    <div class="hmm-field">Male or female<div class="hh-chips" role="radiogroup" aria-label="Male or female">${SEX.map(([k, l]) => `<button type="button" role="radio" data-sex="${k}" aria-checked="${k === r.sex}">${l}</button>`).join('')}</div></div>
    <label class="hmm-field">When<input type="datetime-local" data-f="t" value="${toLocalInput(r.t)}"></label>
    <label class="hmm-field">Note<textarea data-f="note" placeholder="What it was doing, which way it went, wind">${esc(r.note || '')}</textarea></label>
    <div class="hmm-btnrow"><button class="hmm-primary" data-f="save">${isNew ? 'Save sighting' : 'Save changes'}</button>${isNew ? '' : '<button class="hmm-btn2 danger" data-f="del">Delete</button>'}<button class="hmm-btn2" data-f="cancel">${isNew ? 'Cancel' : 'Back to the log'}</button></div>` });
  const q = (k) => body.querySelector(`[data-f="${k}"]`), n = q('n');
  let sex = r.sex;
  q('minus').onclick = () => { n.value = Math.max(1, (+n.value || 1) - 1); };
  q('plus').onclick = () => { n.value = Math.min(999, (+n.value || 0) + 1); };
  body.querySelectorAll('[data-sex]').forEach((b) => b.onclick = () => { sex = b.dataset.sex; body.querySelectorAll('[data-sex]').forEach((x) => x.setAttribute('aria-checked', x === b)); });
  q('save').onclick = async () => {
    const t = q('t').value ? new Date(q('t').value).getTime() : Date.now();
    const rec = Object.assign({}, r, { sp: q('sp').value, n: Math.max(1, Math.min(999, Math.round(+n.value || 1))), sex, t: isFinite(t) ? t : Date.now(), note: q('note').value.trim().slice(0, 500) });
    if (isNew) { delete rec.id; await add(rec); H.toast('Sighting saved'); } else { await update(rec); H.toast('Saved'); }
    open();
  };
  const del = q('del');
  if (del) del.onclick = async () => { if (!confirm('Delete this sighting?')) return; await remove(r.id); H.toast('Deleted'); open(); };
  q('cancel').onclick = () => open();
}

// ---------- CSV ----------
const cell = (v) => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function csv() {
  const rows = [['date', 'time', 'animal', 'count', 'sex', 'latitude', 'longitude', 'note']];
  const tz = (window.HuntMentor && window.HuntMentor.TZ) || 'America/Vancouver';
  for (const r of data.list.slice().sort((a, b) => a.t - b.t)) {
    const d = new Date(r.t);
    rows.push([d.toLocaleDateString('en-CA', { timeZone: tz }), d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }), spName(r.sp), r.n, sexName(r.sex), r.lat, r.lng, r.note || '']);
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
async function exportCsv() {
  const text = csv(), name = `hunt-mentor-sightings-${new Date().toLocaleDateString('en-CA')}.csv`, type = 'text/csv';
  H.sightings.lastExport = { name, text };
  try {
    const file = new File([text], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Sightings' }); return; }
  } catch (err) { if (err && err.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  H.toast(`Saved ${name}`);
}
