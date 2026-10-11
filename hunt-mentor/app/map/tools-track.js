/* Hunt Map Go & Track: record a GPS track (start, pause, resume, stop, save).
   Plugin: core.js PLUGINS calls the default export with window.HuntMap after the map is ready.
   GPS: navigator.geolocation.watchPosition, fixes worse than 30 m dropped, moves under 3 m ignored (jitter).
   Screen Wake Lock keeps the screen on (taken again when the app comes back to the front). iPhone web apps get no GPS with the screen off.
   The track in progress is saved every 30 s (and on pause or when the app is hidden) to the store.js 'meta' store, key 'track.rec',
   so a reload or a crash keeps it. Saved tracks go to the store.js 'tracks' store (database hm-map), or to the database hm-tracks
   when store.js is missing.

   Saved track record (GeoJSON LineString form, for My Content, export and backup):
     { id, kind: 'track', name, date (ISO start time), color, note, folder, hidden,
       geometry: { type: 'LineString', coordinates: [[lng, lat, ele?], ...] }, coords (same array as geometry.coordinates),
       times: [ms per point], moving (ms),
       stats: { distance (m), moving (ms), elapsed (ms), gain (m), loss (m), points, maxSpeed (m/s) }, created, updated }
   API: window.HuntMap.tracks = { list(), get(id), remove(id), save(record), toGeoJSON(record), recording() }
     list() resolves newest first. toGeoJSON gives a Feature with name, date and stats in its properties.
   Fires HuntMap.emit('tracks') after a save or a remove so lists can refresh. */
import { esc, haversine, bearingTo, compass8, fmtNum } from './util.js';

const MAX_ACC = 30, MIN_STEP = 3, MOVING = 0.3, GOOD_ALT = 10, CLIMB_STEP = 3; // m, m, m/s, m, m
const AUTOSAVE = 30000, DRAFT = 'track.rec', STORE = 'tracks', COLOR = '#d62828';
const SRC = 'hm-trk';
const WARN = 'Keep the screen on. iPhone web apps cannot record with the screen off.';

let H = null, map = null, store = null, rec = null, cur = null, done = null;
let watchId = null, wake = null, chip = null, tick = null, saver = null, q = Promise.resolve();

export default async function init(api) {
  if (H) return; // once
  H = api; map = api.map;
  store = await openStore();
  H.tracks = { list: listTracks, get: getTrack, remove: removeTrack, save: putTrack, toGeoJSON, recording: () => !!rec };
  H.setBarAction('track', sheet);
  map.on('dragstart', () => { dragged = Date.now(); }); // the track line layers are added on first use (draw)
  document.addEventListener('visibilitychange', () => {
    if (!rec || rec.state !== 'on') return;
    if (document.visibilityState === 'visible') { lock(); if (watchId == null) watch(); } else persist();
  });
  window.addEventListener('pagehide', () => { if (rec) persist(); });
  try {
    const r = await store.getMeta(DRAFT);
    if (r && Array.isArray(r.pts)) {
      rec = Object.assign(r, { state: 'paused', gap: true });
      draw(); showChip();
      H.toast('Your unsaved track is back. Open Go & Track to resume or save it.', 5000);
    }
  } catch (err) { /* no saved draft */ }
}

// ---------- storage: store.js when present, else a small database of our own ----------
async function openStore() {
  try {
    const s = await import('./store.js');
    if (s.put && s.get && s.list && s.del && s.getMeta && s.setMeta) {
      if (s.ensure) await s.ensure(STORE, 'meta'); // one upgrade up front, so parallel reads never race to create stores
      return { put: (v) => s.put(STORE, v), get: (id) => s.get(STORE, id), list: () => s.list(STORE), del: (id) => s.del(STORE, id), getMeta: s.getMeta, setMeta: s.setMeta };
    }
  } catch (err) { /* fall back below */ }
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') { rej(new Error('IndexedDB is not available')); return; }
    const r = indexedDB.open('hm-tracks', 1);
    r.onupgradeneeded = () => { const d = r.result; ['tracks', 'meta'].forEach((n) => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: 'id' }); }); };
    r.onsuccess = () => res(r.result); r.onerror = () => { dbp = null; rej(r.error); };
  }));
  const tx = (n, mode, fn) => open().then((d) => new Promise((res, rej) => {
    const t = d.transaction(n, mode), r = fn(t.objectStore(n)); let out;
    if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error);
  }));
  return {
    put: (v) => tx('tracks', 'readwrite', (s) => s.put(v)).then(() => v), get: (id) => tx('tracks', 'readonly', (s) => s.get(id)),
    list: () => tx('tracks', 'readonly', (s) => s.getAll()).then((v) => v || []), del: (id) => tx('tracks', 'readwrite', (s) => s.delete(id)),
    getMeta: (k) => tx('meta', 'readonly', (s) => s.get(k)).then((r) => (r ? r.value : null)),
    setMeta: (k, v) => (v == null ? tx('meta', 'readwrite', (s) => s.delete(k)) : tx('meta', 'readwrite', (s) => s.put({ id: k, value: v }))),
  };
}
const listTracks = () => store.list().then((a) => a.filter((t) => t && t.geometry).sort((a, b) => (b.created || 0) - (a.created || 0)));
const getTrack = (id) => store.get(id);
async function removeTrack(id) { await store.del(id); H.emit('tracks'); }
async function putTrack(t) { t.updated = Date.now(); if (!t.created) t.created = t.updated; if (t.geometry) t.coords = t.geometry.coordinates; await store.put(t); H.emit('tracks'); return t; }
const toGeoJSON = (t) => ({ type: 'Feature', properties: { name: t.name, date: t.date, color: t.color, times: t.times, ...t.stats }, geometry: t.geometry });

// ---------- screen wake lock and GPS ----------
async function lock() {
  if (!('wakeLock' in navigator)) return false;
  try { if (!wake || wake.released) wake = await navigator.wakeLock.request('screen'); return true; } catch (err) { return false; }
}
function unlock() { if (wake) { wake.release().catch(() => {}); wake = null; } }
function watch() {
  if (!('geolocation' in navigator)) { H.toast('This browser cannot share your location.'); return; }
  watchId = navigator.geolocation.watchPosition((p) => { q = q.then(() => onPos(p)).catch(() => {}); }, onErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
}
function unwatch() { if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; } }
function onErr(e) {
  if (e.code === 1) { H.toast('Location is blocked. Allow location for Safari or Hunt Mentor in Settings, Privacy, then press Resume.', 6000); pause(); refresh(); }
}

async function onPos(p) {
  if (!rec || rec.state !== 'on') return;
  const c = p.coords, t = Date.now(); // wall clock: cached or emulated fixes can carry an old timestamp
  if (!(c.accuracy <= MAX_ACC)) { cur = Object.assign(cur || {}, { weak: c.accuracy, t }); return update(); }
  const pt = [+c.longitude.toFixed(6), +c.latitude.toFixed(6)];
  const last = rec.pts[rec.pts.length - 1], lastT = rec.times[rec.times.length - 1];
  cur = { pt, t, acc: c.accuracy, speed: c.speed != null && c.speed >= 0 ? c.speed : (cur && cur.speed) || 0, weak: null };
  let d = 0;
  if (last) {
    d = haversine(last, pt);
    if (d < MIN_STEP) { if (c.speed == null && t - lastT > 10000) cur.speed = 0; return update(); }
    const dt = (t - lastT) / 1000;
    if (c.speed == null || c.speed < 0) cur.speed = dt > 0 ? d / dt : 0;
    if (!rec.gap) {
      rec.dist += d;
      if (dt > 0 && dt < 120 && d / dt > MOVING) rec.moving += dt * 1000;
      if (d / dt < 70) rec.maxSpeed = Math.max(rec.maxSpeed, cur.speed || 0);
    }
  }
  rec.gap = false;
  let ele = c.altitude != null && isFinite(c.altitude) && c.altitudeAccuracy != null && c.altitudeAccuracy <= GOOD_ALT ? c.altitude : null;
  if (ele == null) { try { ele = await H.elevationAt(pt); } catch (err) { ele = null; } }
  if (ele != null && isFinite(ele)) {
    pt.push(Math.round(ele * 10) / 10);
    if (rec.ref == null) rec.ref = ele;
    else if (ele - rec.ref >= CLIMB_STEP) { rec.gain += ele - rec.ref; rec.ref = ele; }
    else if (rec.ref - ele >= CLIMB_STEP) { rec.loss += rec.ref - ele; rec.ref = ele; }
  }
  rec.pts.push(pt); rec.times.push(t);
  draw(); update(); keepInView(pt);
  if (rec.pts.length % 10 === 0) persist();
}
let dragged = 0;
/** Bottom of the clear map above the open sheet, in map pixels. */
function clearBottom() {
  const c = map.getContainer(), sh = document.querySelector('.hmm-sheet:not([hidden])');
  return sh ? Math.max(120, sh.getBoundingClientRect().top - c.getBoundingClientRect().top) : c.clientHeight;
}
function keepInView(pt) {
  if (Date.now() - dragged < 20000) return; // the user is looking around
  const c = map.getContainer(), b = clearBottom(), p = map.project(pt);
  if (p.x < 40 || p.x > c.clientWidth - 40 || p.y < 110 || p.y > b - 30) map.easeTo({ center: pt, offset: [0, (b - c.clientHeight) / 2 + 30], duration: 600 });
}
function fitTrack(cs) {
  if (!cs || !cs.length) return;
  const lng = cs.map((c) => c[0]), lat = cs.map((c) => c[1]), bottom = map.getContainer().clientHeight - clearBottom();
  map.fitBounds([[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]], { padding: { top: 120, left: 40, right: 70, bottom: bottom + 30 }, maxZoom: 16, duration: 600 });
}

// ---------- recording state ----------
const elapsed = () => rec.elapsed + (rec.state === 'on' && rec.since ? Date.now() - rec.since : 0);
function persist() {
  if (!rec) return Promise.resolve();
  const { state, since, ...keep } = rec;
  return store.setMeta(DRAFT, Object.assign(keep, { elapsed: elapsed() })).catch(() => {});
}
async function start() {
  done = null;
  rec = { pts: [], times: [], started: Date.now(), elapsed: 0, since: Date.now(), state: 'on', dist: 0, moving: 0, gain: 0, loss: 0, ref: null, maxSpeed: 0, gap: false };
  cur = null;
  const ok = await lock();
  watch(); draw(); showChip(); sheet(); persist();
  if (!ok) H.toast('This browser cannot keep the screen on by itself. Keep it awake or the track stops.', 6000);
}
function pause() {
  if (!rec || rec.state !== 'on') return;
  rec.elapsed = elapsed(); rec.since = null; rec.state = 'paused'; rec.gap = true;
  unwatch(); unlock(); persist(); update();
}
async function resume() {
  if (!rec) return;
  rec.state = 'on'; rec.since = Date.now(); rec.gap = true;
  const ok = await lock(); watch(); update();
  if (!ok) H.toast('This browser cannot keep the screen on by itself. Keep it awake or the track stops.', 6000);
}
function finish() { unwatch(); unlock(); rec = null; cur = null; store.setMeta(DRAFT, null).catch(() => {}); hideChip(); draw(); }
function statsOf(r) {
  return { distance: Math.round(r.dist), moving: Math.round(r.moving), elapsed: Math.round(r.state ? elapsed() : r.elapsed), gain: Math.round(r.gain), loss: Math.round(r.loss), points: r.pts.length, maxSpeed: Math.round(r.maxSpeed * 10) / 10 };
}
async function save(name) {
  if (!rec || rec.pts.length < 2) { H.toast('Not enough points to save yet. Walk a little further.'); return; }
  pause();
  const coordinates = rec.pts.slice();
  const t = { id: `trk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind: 'track', name: name || defaultName(), date: new Date(rec.started).toISOString(),
    color: COLOR, note: '', folder: '', hidden: false, geometry: { type: 'LineString', coordinates }, times: rec.times.slice(), moving: Math.round(rec.moving), stats: statsOf(rec) };
  try { await putTrack(t); } catch (err) { H.toast('Could not save on this phone. Your track is still here: try again.', 5000); return; }
  finish(); done = t; draw();
  savedSheet(t); fitTrack(coordinates);
}
const defaultName = () => `Track, ${new Date(rec ? rec.started : Date.now()).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;

// ---------- map line ----------
function addLayers() {
  if (!map || map.getSource(SRC)) return; // plugins start after the style is ready (isStyleLoaded is false while tiles load)
  map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  const before = map.getLayer(H.anchors.symbols) ? H.anchors.symbols : undefined;
  map.addLayer({ id: SRC + '-case', type: 'line', source: SRC, filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.9 } }, before);
  map.addLayer({ id: SRC + '-line', type: 'line', source: SRC, filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4 } }, before);
  map.addLayer({ id: SRC + '-pt', type: 'circle', source: SRC, filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } }, before);
}
function draw() {
  if (!map) return;
  const f = [], pts = rec ? rec.pts : done ? done.geometry.coordinates : [];
  const col = rec ? COLOR : '#9c2f2f';
  if (pts.length > 1) f.push({ type: 'Feature', properties: { color: col }, geometry: { type: 'LineString', coordinates: pts.map((p) => [p[0], p[1]]) } });
  if (pts.length) f.push({ type: 'Feature', properties: { color: '#2b8a3e' }, geometry: { type: 'Point', coordinates: pts[0].slice(0, 2) } });
  if (rec && cur && cur.pt) f.push({ type: 'Feature', properties: { color: COLOR }, geometry: { type: 'Point', coordinates: cur.pt } });
  if (!f.length && !map.getSource(SRC)) return;
  addLayers();
  const s = map.getSource(SRC); if (!s) return;
  s.setData({ type: 'FeatureCollection', features: f });
}

// ---------- panel ----------
function fmtDur(ms) {
  const m = Math.floor((ms || 0) / 60000), h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min ${String(Math.floor((ms || 0) / 1000) % 60).padStart(2, '0')} s`;
}
const km = (m) => (H.units.system === 'imperial' ? `${fmtNum(m / 1609.344, 2)} mi` : `${fmtNum(m / 1000, 2)} km`);
const speed = (ms) => (H.units.system === 'imperial' ? `${fmtNum(ms * 2.23694, 1)} mph` : `${fmtNum(ms * 3.6, 1)} km/h`);
const box = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
function statHtml() {
  const fresh = rec.state === 'on' && cur && cur.pt && Date.now() - cur.t < 20000;
  return box('Distance', km(rec.dist)) + box('Moving time', fmtDur(rec.moving)) + box('Climb', H.units.elev(Math.round(rec.gain)) || '0 m') + box('Speed', fresh ? speed(cur.speed || 0) : rec.state === 'on' ? 'No fix' : 'Paused');
}
function backHtml() {
  if (!rec || !rec.pts.length) return '<b>Back to start:</b> waiting for the first GPS fix.';
  const here = cur && cur.pt ? cur.pt : rec.pts[rec.pts.length - 1], s = rec.pts[0], d = haversine(here, s);
  if (d < 15) return '<b>Back to start:</b> you are at the start.';
  const b = Math.round(bearingTo(here, s));
  return `<b>Back to start:</b> ${esc(H.units.dist(d))}, heading ${b}&deg; (${compass8(b)}). The green dot marks the start.`;
}
function gpsHtml() {
  if (!rec || rec.state !== 'on') return 'Paused. GPS is off.';
  if (!cur) return 'Looking for GPS. Open sky helps.';
  if (cur.weak) return `GPS is weak (${Math.round(cur.weak)} m). Points are skipped until it improves.`;
  return `GPS good (${Math.round(cur.acc)} m). ${rec.pts.length} points.`;
}
function update() {
  if (chip && rec) {
    const t = chip.querySelector('span'); if (t) t.textContent = km(rec.dist);
    chip.classList.add('hmk-rec'); chip.classList.toggle('paused', rec.state !== 'on');
    chip.setAttribute('aria-label', `Go & Track: ${rec.state === 'on' ? 'recording' : 'paused'}, ${km(rec.dist)}`);
  }
  const root = document.querySelector('.hmk[data-live]');
  if (!root || !rec) return;
  root.querySelector('[data-out="stats"]').innerHTML = statHtml();
  root.querySelector('[data-out="back"]').innerHTML = backHtml();
  root.querySelector('[data-out="gps"]').textContent = gpsHtml();
  root.querySelector('[data-out="time"]').textContent = `Total time ${fmtDur(elapsed())}`;
}
function showChip() {
  chip = document.querySelector('.hmm-bar [data-bar="track"]');
  if (chip && !chip.querySelector('.hmk-dot')) chip.insertAdjacentHTML('afterbegin', '<i class="hmk-dot" aria-hidden="true"></i>');
  update();
  clearInterval(tick); tick = setInterval(update, 1000);
  clearInterval(saver); saver = setInterval(() => { if (rec && rec.state === 'on') persist(); }, AUTOSAVE);
}
function hideChip() {
  clearInterval(tick); clearInterval(saver);
  if (!chip) return;
  chip.classList.remove('hmk-rec', 'paused'); chip.removeAttribute('aria-label');
  const d = chip.querySelector('.hmk-dot'); if (d) d.remove();
  const t = chip.querySelector('span'); if (t) t.textContent = 'Go & Track';
}

const WARN_HTML = `<div class="hmm-banner hmk-warn" role="note"><b>${WARN}</b> The app keeps the screen awake while you record. Dim it and carry a battery pack on long days.</div>`;
function sheet() {
  if (!rec) {
    const body = H.openSheet({ title: 'Go & Track', bar: 'track', modal: false, onClose: clearDone, html: `<div class="hmk">
      <p>Record where you walk or ride with GPS (Global Positioning System): distance, moving time, climb and a way back to the truck.</p>
      ${WARN_HTML}
      <button type="button" class="hmm-primary block" data-k="start">Start recording</button>
      <p class="hmm-muted">Tracks stay on this phone. Find them in My Content to export as GPX (GPS Exchange Format), KML (Keyhole Markup Language) or GeoJSON.</p>
      <div data-out="list"></div></div>` });
    body.querySelector('[data-k="start"]').onclick = start;
    recentList(body.querySelector('[data-out="list"]'));
    return;
  }
  const on = rec.state === 'on';
  const body = H.openSheet({ title: on ? 'Recording' : 'Paused', bar: 'track', modal: false, html: `<div class="hmk" data-live>
    <div class="hmm-stats hmk-stats" data-out="stats"></div>
    <p class="hmk-back" data-out="back"></p>
    <p class="hmm-muted hmk-gps"><span data-out="gps"></span> <span data-out="time"></span></p>
    <div class="hmm-banner hmk-warn" role="note"><b>${WARN}</b></div>
    <div class="hmk-btns">
      ${on ? '<button type="button" class="hmm-btn2" data-k="pause">Pause</button>' : '<button type="button" class="hmm-primary" data-k="resume">Resume</button>'}
      <button type="button" class="hmm-btn2" data-k="stop">Stop and save</button>
    </div></div>` });
  update();
  body.querySelectorAll('[data-k]').forEach((b) => b.onclick = async () => {
    const k = b.dataset.k;
    if (k === 'pause') { pause(); sheet(); } else if (k === 'resume') { await resume(); sheet(); } else if (k === 'stop') stopSheet();
  });
}
function stopSheet() {
  pause();
  const s = statsOf(rec);
  const body = H.openSheet({ title: 'Save track', bar: 'track', modal: false, html: `<div class="hmk">
    <div class="hmm-stats hmk-stats">${box('Distance', km(s.distance))}${box('Moving time', fmtDur(s.moving))}${box('Climb', H.units.elev(s.gain) || '0 m')}${box('Points', s.points)}</div>
    <label class="hmk-lbl" for="hmk-name">Name</label>
    <input id="hmk-name" class="hmk-in" type="text" maxlength="80" autocomplete="off" value="${esc(defaultName())}">
    <div class="hmk-btns">
      <button type="button" class="hmm-primary" data-k="save">Save track</button>
      <button type="button" class="hmm-btn2" data-k="resume">Keep recording</button>
    </div>
    <button type="button" class="hmm-btn2 danger hmk-wide" data-k="discard">Discard this track</button></div>` });
  body.querySelectorAll('[data-k]').forEach((b) => b.onclick = async () => {
    const k = b.dataset.k;
    if (k === 'save') save(body.querySelector('#hmk-name').value.trim());
    else if (k === 'resume') { await resume(); sheet(); }
    else if (k === 'discard' && confirm('Discard this track? It cannot be brought back.')) { finish(); H.closeSheet(); H.toast('Track discarded'); }
  });
}
function savedSheet(t) {
  const s = t.stats;
  const body = H.openSheet({ title: 'Track saved', bar: 'track', modal: false, onClose: clearDone, html: `<div class="hmk">
    <p><b>${esc(t.name)}</b></p>
    <div class="hmm-stats hmk-stats">${box('Distance', km(s.distance))}${box('Moving time', fmtDur(s.moving))}${box('Climb', H.units.elev(s.gain) || '0 m')}${box('Total time', fmtDur(s.elapsed))}</div>
    <p class="hmm-muted">Saved on this phone. Open My Content to rename, export or share it.</p>
    <button type="button" class="hmm-primary block" data-k="new">Record another track</button></div>` });
  body.querySelector('[data-k="new"]').onclick = start;
}
function clearDone() { if (done) { done = null; draw(); } }
async function recentList(el) {
  let a = [];
  try { a = (await listTracks()).slice(0, 5); } catch (err) { return; }
  if (!a.length || !el.isConnected) return;
  el.innerHTML = `<h3 class="hmm-h">Recent tracks</h3>${a.map((t) => `<button type="button" class="hmk-row" data-id="${esc(t.id)}"><span>${esc(t.name)}</span><small>${esc(km((t.stats && t.stats.distance) || 0))}, ${esc(fmtDur(t.stats && t.stats.moving))}</small></button>`).join('')}`;
  el.querySelectorAll('[data-id]').forEach((b) => b.onclick = async () => {
    const t = await getTrack(b.dataset.id); if (!t) return;
    done = t; draw(); fitTrack(t.geometry.coordinates);
  });
}

export const recording = () => !!rec;
export const _test = { state: () => rec && { ...statsOf(rec), state: rec.state, n: rec.pts.length }, persist };
