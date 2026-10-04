/* Hunt Map tools: Go & Track. Records a GPS track while the screen stays on (Screen Wake Lock).
   iPhone web apps get no GPS with the screen off, so the sheet says so. The track in progress is saved to IndexedDB
   every few points, so a reload or a crash does not lose it. */
import * as store from './tools-store.js';
import { haversine, esc } from './util.js';
import { lineLength, climb, fmtDur } from './tools-geo.js';

let ctx, H, map;
let rec = null; // { pts: [[lng, lat, ele]], times: [], moving: ms, state: 'on' | 'paused', started, lastT }
let watchId = null, wake = null, chip = null, tick = null;
const MAX_ACC = 50, MIN_STEP = 4, MOVING = 0.4; // metres, metres, metres per second

export function init(c) {
  ctx = c; H = c.H; map = c.map;
  H.setBarAction('track', sheet);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && rec && rec.state === 'on') { lock(); if (watchId == null) watch(); } });
  store.getMeta('rec').then((r) => { if (r && r.pts) { rec = Object.assign(r, { state: 'paused' }); ctx.overlays.live = rec.pts; ctx.drawOverlays(); showChip(); H.toast('Your unsaved track is back. Open Go & Track to resume or save it.', 5000); } }).catch(() => {});
}

async function lock() {
  if (!('wakeLock' in navigator)) return false;
  try { if (!wake || wake.released) { wake = await navigator.wakeLock.request('screen'); } return true; } catch (err) { return false; }
}
function unlock() { if (wake) { wake.release().catch(() => {}); wake = null; } }
function watch() {
  if (!('geolocation' in navigator)) { H.toast('This browser cannot share your location.'); return; }
  watchId = navigator.geolocation.watchPosition(onPos, (e) => { if (e.code === 1) { H.toast('Location is blocked. Allow location for this app in Settings, then try again.', 6000); pause(); } }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
}
function unwatch() { if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; } }

async function onPos(p) {
  if (!rec || rec.state !== 'on') return;
  const c = p.coords; if (c.accuracy > MAX_ACC) return;
  const pt = [+c.longitude.toFixed(6), +c.latitude.toFixed(6)], last = rec.pts[rec.pts.length - 1], t = p.timestamp || Date.now();
  if (last) {
    const d = haversine(last, pt); if (d < MIN_STEP) return;
    const dt = t - rec.lastT;
    if (dt > 0 && dt < 120000 && d / (dt / 1000) > MOVING) rec.moving += dt;
  }
  let ele = c.altitude != null && isFinite(c.altitude) ? c.altitude : null;
  if (ele == null) ele = await H.elevationAt(pt).catch(() => null);
  if (ele != null) pt.push(+ele.toFixed(1));
  rec.pts.push(pt); rec.times.push(t); rec.lastT = t;
  ctx.overlays.live = rec.pts; ctx.drawOverlays(); update();
  if (rec.pts.length % 5 === 1) persist();
}
const persist = () => store.setMeta('rec', rec ? { pts: rec.pts, times: rec.times, moving: rec.moving, started: rec.started, lastT: rec.lastT } : null).catch(() => {});

async function start() {
  rec = { pts: [], times: [], moving: 0, state: 'on', started: Date.now(), lastT: Date.now() };
  ctx.overlays.live = rec.pts;
  const ok = await lock();
  watch(); showChip(); sheet();
  if (!ok) H.toast('This browser cannot keep the screen on. Keep it awake yourself or the track stops.', 6000);
}
function pause() { if (!rec) return; rec.state = 'paused'; unwatch(); unlock(); persist(); update(); }
async function resume() { if (!rec) return; rec.state = 'on'; rec.lastT = Date.now(); await lock(); watch(); update(); }
function stopAll() { unwatch(); unlock(); rec = null; ctx.overlays.live = null; ctx.drawOverlays(); store.setMeta('rec', null).catch(() => {}); hideChip(); }
async function save() {
  if (!rec || rec.pts.length < 2) { H.toast('Not enough points to save yet. Walk a little further.'); return; }
  const n = ctx.items.filter((i) => i.kind === 'track').length + 1;
  const d = new Date(rec.started).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  const it = { kind: 'track', name: `Track ${n}, ${d}`, note: '', color: '#d62828', folder: '', coords: rec.pts.slice(), times: rec.times.slice(), moving: rec.moving };
  await store.saveItem(it); stopAll(); await ctx.refresh(); ctx.openItem(it.id);
  H.toast('Track saved in My Content');
}

function stats() {
  const dist = lineLength(rec.pts), c = climb(rec.pts.map((p) => p[2]), 4);
  const total = (rec.state === 'on' ? Date.now() : rec.lastT) - rec.started;
  return { dist, up: c.up, down: c.down, moving: rec.moving, total };
}
function statHtml() {
  const s = stats(), u = H.units, box = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
  return box('Distance', u.dist(s.dist) || '0 m') + box('Moving time', fmtDur(s.moving)) + box('Climb', u.elev(Math.round(s.up))) + box('Points', rec.pts.length);
}
function update() {
  if (chip) { chip.querySelector('b').textContent = rec ? `${rec.state === 'on' ? 'Recording' : 'Paused'}, ${H.units.dist(lineLength(rec.pts)) || '0 m'}` : ''; chip.classList.toggle('paused', !!rec && rec.state !== 'on'); }
  const box = H.els.sheetB && H.els.sheetB.querySelector('[data-out="trk"]');
  if (box && rec) box.innerHTML = statHtml();
}
function showChip() {
  if (!chip) {
    chip = document.createElement('button'); chip.className = 'hmt-chip'; chip.setAttribute('aria-label', 'Go & Track: open the recording');
    chip.innerHTML = '<i></i><b></b>'; chip.onclick = sheet;
    H.els.bar.parentNode.appendChild(chip);
  }
  chip.hidden = false; update();
  clearInterval(tick); tick = setInterval(update, 1000);
}
function hideChip() { if (chip) chip.hidden = true; clearInterval(tick); }

function sheet() {
  const body = H.openSheet({ title: 'Go & Track', bar: 'track', modal: false, html: rec ? `
    <div class="hmm-stats" data-out="trk">${statHtml()}</div>
    <div class="hmm-banner"><b>Keep the screen on.</b> iPhone web apps cannot record with the screen off. The screen stays awake while you record; plug in a battery pack on long days.</div>
    <div class="hmt-drawbtns">
      ${rec.state === 'on' ? '<button class="hmm-btn2" data-k="pause">Pause</button>' : '<button class="hmm-btn2" data-k="resume">Resume</button>'}
      <button class="hmm-primary" data-k="save">Save track</button>
      <button class="hmm-btn2 danger" data-k="discard">Discard</button>
    </div>` : `
    <p>Record where you walk or ride: distance, moving time and climb.</p>
    <div class="hmm-banner"><b>The screen must stay on.</b> iPhone web apps cannot use GPS (Global Positioning System) with the screen off or the app in the background. Hunt Mentor keeps the screen awake while you record. Dim it to save battery.</div>
    <button class="hmm-primary block" data-k="start">Start recording</button>
    <p class="hmm-muted">Your tracks are saved on this phone in My Content. Export them as GPX (GPS Exchange Format) for other apps.</p>` });
  body.querySelectorAll('[data-k]').forEach((b) => b.onclick = async () => {
    const k = b.dataset.k;
    if (k === 'start') start();
    else if (k === 'pause') { pause(); sheet(); }
    else if (k === 'resume') { await resume(); sheet(); }
    else if (k === 'save') save();
    else if (k === 'discard') { if (confirm('Discard this track? It will be gone.')) { stopAll(); H.closeSheet(); } }
  });
}
export const recording = () => !!rec;
export const _test = { onPos, stats: () => rec && stats(), esc };
