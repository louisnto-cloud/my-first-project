/* Hunt Map hunt day navigation (MAP-IMPROVE-PROMPT.md Part 2). Plugin: core.js PLUGINS calls the default export with window.HuntMap.
   Three chips at the top left of the map, all offline (no network calls):
     1. Legal light: minutes left of legal shooting light where you stand (GPS fix, else the map centre).
        Sun times: window.HuntMentor.sunEvent (app.js). Hours: window.HM.regs.hours (data/regs.json): big game 60 min after sunset
        (synopsis page 11, item 38), ducks and geese 30 min (Migratory Birds Regulations, 2022, s.28). Orange under 30 min, red under 10.
     2. Turnaround: reads and sets the Safety tool's alarm (localStorage 'hm.safety.turn', same record as app/addons/safety.js:
        { on, at (ms), date, time, walk, set, warned, fired, acked }). The Safety add on's global watcher rings it, on any screen.
     3. Mark my truck: one tap saves a waypoint in the store.js 'items' store (kind 'wpt', icon 'parking', truck: true), so it is
        in My Content and in the app backup. Then a big arrow points back to it, with distance and a walk back estimate (Tip:
        4 km/h plus 1 minute per 10 m of net climb, climb from the terrain tiles via HuntMap.elevationAt).
        Arrow: phone compass (DeviceOrientation; iPhone asks on a tap) or GPS course when walking; without them it points on the map.
   API: HuntMap.field = { markTruck(), truck(), open(section), refresh(), legalLight(lngLat, kind, now) } */
import * as store from './store.js';
import { esc, haversine, bearingTo } from './util.js';

const TURN = 'hm.safety.turn';
const KMH = 4; // walking speed for the walk back Tip
const SYN_URL = 'https://www2.gov.bc.ca/assets/gov/sports-recreation-arts-and-culture/outdoor-recreation/fishing-and-hunting/hunting/regulations/2026-2028/hunting-trapping-synopsis.pdf';
const MBR_URL = 'https://www.canada.ca/en/environment-climate-change/services/migratory-game-bird-hunting/regulations-provincial-territorial-summaries/british-columbia.html';
const TZ = () => (window.HuntMentor && window.HuntMentor.TZ) || 'America/Vancouver';
const COMPASS16 = ['north', 'north northeast', 'northeast', 'east northeast', 'east', 'east southeast', 'southeast', 'south southeast', 'south', 'south southwest', 'southwest', 'west southwest', 'west', 'west northwest', 'northwest', 'north northwest'];
const word = (deg) => COMPASS16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
const ARROW = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M24 2 39 45 24 36 9 45Z" fill="currentColor" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 6.5V9M5.4 10.4l1.7 1.7M18.6 10.4l-1.7 1.7"/></svg>';
const CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';

let H = null, map = null, box = null, el = {}, truck = null, pos = null, heading = null, headSrc = '', compassState = 'unknown';
let watchId = null, orientOn = false, tick = null, sheetOn = false, frame = 0, n = 0;
let here = { ll: null, ele: null }; // elevation cache for the current position

export default async function init(api) {
  if (H) return;
  H = api; map = api.map;
  css(); build();
  H.field = { markTruck, truck: () => truck, open: openSheet, refresh: update, legalLight };
  try { truck = await findTruck(); } catch (err) { truck = null; }
  H.on('open', start); H.on('close', stop);
  map.on('rotate', arrowSoon);
  window.addEventListener('storage', (e) => { if (e.key === TURN) update(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && H.isOpen) { update(); if (truck) gps(); } });
  if (H.isOpen) start();
}

// ---------- life cycle ----------
function start() { if (!tick) tick = setInterval(update, 1000); if (truck) gps(); update(); }
function stop() {
  if (tick) { clearInterval(tick); tick = null; }
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (orientOn) { window.removeEventListener('deviceorientationabsolute', onOrient); window.removeEventListener('deviceorientation', onOrient); orientOn = false; }
}
const prefs = () => { H.prefs.field = H.prefs.field || {}; return H.prefs.field; };

// ---------- position and compass ----------
function gps() {
  if (watchId != null || !('geolocation' in navigator)) return;
  watchId = navigator.geolocation.watchPosition(onPos, (e) => {
    if (e.code === 1) { H.toast('Location is blocked, so the truck arrow cannot follow you. Allow location for Safari or Hunt Mentor in Settings, Privacy.', 6000); if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; }
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
}
function onPos(p) {
  const c = p.coords;
  pos = { lng: c.longitude, lat: c.latitude, accuracy: c.accuracy, time: Date.now() };
  if (c.heading != null && !isNaN(c.heading) && c.speed > 0.8 && headSrc !== 'compass') { heading = c.heading; headSrc = 'gps'; }
  update();
}
/** Latest fix from this module or from the map's location button, if under 2 minutes old. */
function fix() {
  const a = pos, b = H.lastPosition && { lng: H.lastPosition.lng, lat: H.lastPosition.lat, accuracy: H.lastPosition.accuracy, time: H.lastPosition.time || 0 };
  const best = [a, b].filter((x) => x && Date.now() - x.time < 120000).sort((x, y) => y.time - x.time)[0];
  return best || null;
}
/** iPhone only lets a web page read the compass after a tap: call this inside a click handler. */
function askCompass() {
  const D = window.DeviceOrientationEvent;
  if (!D) { compassState = 'none'; return; }
  if (typeof D.requestPermission === 'function') {
    D.requestPermission().then((s) => { if (s === 'granted') { compassState = 'on'; listen(); } else { compassState = 'denied'; update(); } }).catch(() => { compassState = 'denied'; update(); });
  } else listen();
}
function listen() {
  if (orientOn || !window.DeviceOrientationEvent) return;
  orientOn = true;
  if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onOrient);
  else window.addEventListener('deviceorientation', onOrient);
}
function onOrient(e) {
  let h = null;
  if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
  else if (e.absolute && e.alpha != null) h = 360 - e.alpha;
  if (h == null) return;
  const so = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  h = (h + so + 360) % 360;
  if (heading == null || headSrc !== 'compass') heading = h;
  else { const d = ((h - heading + 540) % 360) - 180; heading = (heading + d * 0.35 + 360) % 360; }
  headSrc = 'compass'; compassState = 'on';
  arrowSoon();
}

// ---------- truck waypoint (store.js 'items', so My Content and the backup have it) ----------
async function findTruck() {
  const items = await store.list('items');
  return items.filter((i) => i && i.truck && i.kind === 'wpt' && Array.isArray(i.coords)).sort((a, b) => (b.markedAt || b.created || 0) - (a.markedAt || a.created || 0))[0] || null;
}
function currentPosition() {
  return new Promise((res) => {
    const f = fix();
    if (f && f.accuracy != null && f.accuracy <= 50 && Date.now() - f.time < 30000) { res(f); return; }
    if (!('geolocation' in navigator)) { res(null); return; }
    navigator.geolocation.getCurrentPosition((p) => { onPos(p); res(pos); }, () => res(null), { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  });
}
async function markTruck() {
  askCompass(); // inside the tap, for iPhone
  H.toast('Finding where you are...', 20000);
  let p = await currentPosition(), src = 'gps';
  if (!p) {
    H.toast('No GPS fix.', 1500);
    if (!confirm('Your phone could not find your location. Mark the truck at the map centre (the cross) instead?')) return null;
    const c = map.getCenter(); p = { lng: c.lng, lat: c.lat, accuracy: null }; src = 'centre';
  }
  const ll = [+p.lng.toFixed(6), +p.lat.toFixed(6)];
  let ele = null;
  try { ele = await H.elevationAt(ll); } catch (err) { ele = null; }
  const rec = truck ? Object.assign({}, truck) : { kind: 'wpt', name: 'My truck', note: 'Marked with Mark my truck on the Hunt Map.', icon: 'parking', color: '', folder: '', truck: true };
  Object.assign(rec, { coords: ll, ele: ele != null && isFinite(ele) ? Math.round(ele) : null, acc: p.accuracy != null ? Math.round(p.accuracy) : null, from: src, markedAt: Date.now() });
  try { await store.saveItem(rec); } catch (err) { H.toast('Could not save. Storage is blocked in this browser.', 4000); return null; }
  truck = rec;
  if (H.tools && H.tools.refresh) await H.tools.refresh().catch(() => {});
  gps(); update();
  H.toast(src === 'gps' ? `Truck marked${p.accuracy > 30 ? ` (GPS within about ${Math.round(p.accuracy)} m)` : ''}. The arrow points back to it.` : 'Truck marked at the map centre.', 4000);
  if (sheetOn) openSheet('truck');
  return rec;
}
async function clearTruck() {
  if (!truck || !confirm('Remove the "My truck" waypoint?')) return;
  try { await store.deleteItem(truck.id); } catch (err) { /* already gone */ }
  truck = null;
  if (H.tools && H.tools.refresh) await H.tools.refresh().catch(() => {});
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  update(); openSheet('truck');
}

/** Distance, bearing and walk back estimate from the latest fix to the truck. */
function toTruck() {
  if (!truck) return null;
  const f = fix();
  if (!f) return { nofix: true };
  const a = [f.lng, f.lat], b = truck.coords, d = haversine(a, b), brg = bearingTo(a, b);
  if (!here.ll || haversine(here.ll, a) > 25) { // elevation of where you stand, refreshed every 25 m
    here.ll = a; const want = a;
    Promise.resolve().then(() => H.elevationAt(a)).then((e) => { if (here.ll === want) { here.ele = e != null && isFinite(e) ? e : null; update(); } }).catch(() => { if (here.ll === want) here.ele = null; });
  }
  const climb = truck.ele != null && here.ele != null ? Math.max(0, truck.ele - here.ele) : null;
  const mins = (d / 1000 / KMH) * 60 + (climb || 0) / 10;
  return { d, brg, climb, mins, acc: f.accuracy };
}
const fmtDist = (m) => (m < 100 ? `${Math.round(m)} m` : m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);
const fmtMin = (m) => { m = Math.max(1, Math.round(m)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`; };
const dot = (s) => (/\.$/.test(s) ? s : s + '.');
const fmtT = (ms) => new Date(ms).toLocaleTimeString('en-CA', { timeZone: TZ(), hour: 'numeric', minute: '2-digit' });

// ---------- legal light ----------
function todayPacific(now) {
  const iso = now.toLocaleDateString('en-CA', { timeZone: TZ() }); const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, iso };
}
/** Legal light for a point today: { start, end, rise, set, h (hours entry) } or null when the data is not loaded. kind 'big' or 'mig'. */
function legalLight(ll, kind = 'big', now = new Date()) {
  const S = window.HuntMentor, hours = window.HM && window.HM.regs && window.HM.regs.hours;
  const h = hours && (kind === 'mig' ? hours.migratory : hours.bigGame);
  if (!S || !S.sunEvent || !h || h.afterSunsetMin == null) return null;
  const t = todayPacific(now), day = new Date(t.y, t.m - 1, t.d, 12);
  const rise = S.sunEvent(day, ll[1], ll[0], true), set = S.sunEvent(day, ll[1], ll[0], false);
  if (!rise || !set) return null;
  return { rise: +rise, set: +set, start: +rise - h.beforeSunriseMin * 6e4, end: +set + h.afterSunsetMin * 6e4, h };
}
function lightPoint() { const f = fix(); if (f) return { ll: [f.lng, f.lat], where: 'where you stand' }; const c = map.getCenter(); return { ll: [c.lng, c.lat], where: 'the map centre' }; }
function lightState() {
  const kind = prefs().light === 'mig' ? 'mig' : 'big', now = Date.now(), pt = lightPoint(), L = legalLight(pt.ll, kind, new Date(now));
  const who = kind === 'mig' ? 'Legal light (ducks)' : 'Legal light';
  if (!L) return { kind, pt, L, cls: 'off', text: `${who}: not loaded` };
  if (now < L.start) return { kind, pt, L, cls: 'before', text: `${who} in ${fmtLeft(L.start - now)}` };
  if (now > L.end) return { kind, pt, L, cls: 'red', text: `${who} over` };
  const left = L.end - now;
  return { kind, pt, L, left, cls: left < 10 * 6e4 ? 'red' : left < 30 * 6e4 ? 'orange' : 'ok', text: `${who} ${fmtLeft(left)}` };
}
const fmtLeft = (ms) => { const m = Math.max(0, Math.floor(ms / 6e4)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };

// ---------- turnaround (the Safety tool's alarm) ----------
const ldTurn = () => { try { return JSON.parse(localStorage.getItem(TURN) || 'null'); } catch (e) { return null; } };
const svTurn = (v) => { try { localStorage.setItem(TURN, JSON.stringify(v)); } catch (e) { H.toast('Saving is blocked in this browser, so the alarm cannot be set.', 4000); } };
const turnOn = () => { const st = ldTurn(); return st && st.on && !st.acked ? st : null; };
const countdown = (ms) => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
function setTurn(at, walk) {
  if (!(at > Date.now())) { H.toast('That time has already passed. Pick a later time.', 3500); return false; }
  const date = new Date(at).toLocaleDateString('en-CA', { timeZone: TZ() }), time = new Date(at).toLocaleTimeString('en-GB', { timeZone: TZ(), hour: '2-digit', minute: '2-digit', hour12: false });
  const old = ldTurn() || {};
  svTurn({ on: true, at, date, time, walk: walk != null ? String(walk) : (old.walk || ''), set: Date.now() });
  try { if (window.HMSafety && window.HMSafety.unlockAudio) window.HMSafety.unlockAudio(); } catch (e) { /* no sound */ }
  H.toast(`${dot(`Turnaround alarm set for ${fmtT(at)}`)} Keep the app open, and set a phone alarm too.`, 4500);
  update(); return true;
}
function stopTurn() { const s = ldTurn() || {}; s.on = false; svTurn(s); const o = document.getElementById('sf-alarm'); if (o) o.remove(); update(); }

// ---------- chips ----------
function build() {
  box = document.createElement('div'); box.className = 'hmf'; box.setAttribute('aria-label', 'Hunt day');
  box.innerHTML = `
    <button type="button" class="hmf-chip hmf-light" data-f="light">${SUN}<span></span></button>
    <button type="button" class="hmf-chip hmf-turn" data-f="turn" hidden>${CLOCK}<span></span></button>
    <button type="button" class="hmf-chip hmf-truck" data-f="truck"><i class="hmf-arr">${ARROW}</i>${H.icons.car}<span class="hmf-tt"><b></b><small></small></span></button>`;
  H.els.bar.parentNode.appendChild(box);
  el = { light: box.querySelector('.hmf-light'), turn: box.querySelector('.hmf-turn'), truck: box.querySelector('.hmf-truck'), arr: box.querySelector('.hmf-arr') };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    if (b.dataset.f === 'truck' && !truck) { markTruck(); return; }
    if (b.dataset.f === 'truck') askCompass(); // a tap: lets iPhone ask for the compass
    openSheet(b.dataset.f);
  });
}

let lastTruckCheck = 0;
function update() {
  if (!box) return;
  n++;
  // the truck may have been deleted or moved in My Content
  if (truck && Date.now() - lastTruckCheck > 8000) { lastTruckCheck = Date.now(); store.get('items', truck.id).then((r) => { if (!r) { truck = null; update(); } else truck = r; }).catch(() => {}); }
  const L = lightState(), hide = !!prefs().hideLight;
  el.light.hidden = hide;
  el.light.className = `hmf-chip hmf-light hmf-${L.cls}`;
  el.light.querySelector('span').textContent = L.text;
  el.light.setAttribute('aria-label', `${L.text}. Tap for details.`);

  const st = turnOn();
  el.turn.hidden = !st;
  if (st) {
    const left = st.at - Date.now();
    el.turn.className = `hmf-chip hmf-turn hmf-${left <= 0 ? 'red' : left <= 15 * 6e4 ? 'orange' : 'ok'}`;
    el.turn.querySelector('span').textContent = left > 0 ? `Turn around ${countdown(left)}` : 'Turn around now';
    el.turn.setAttribute('aria-label', left > 0 ? `Turnaround at ${fmtT(st.at)}, ${countdown(left)} left. Tap for details.` : 'Turnaround time has passed. Head back.');
  }

  const t = toTruck(), b = el.truck;
  b.classList.toggle('has', !!truck);
  if (!truck) { b.querySelector('b').textContent = 'Mark my truck'; b.querySelector('small').textContent = ''; b.setAttribute('aria-label', 'Mark my truck here, in one tap'); }
  else if (t.nofix) { b.querySelector('b').textContent = 'Truck marked'; b.querySelector('small').textContent = 'Waiting for GPS'; b.setAttribute('aria-label', 'Truck marked. Waiting for GPS. Tap for details.'); }
  else {
    const at = t.d < Math.max(20, t.acc || 0);
    b.querySelector('b').textContent = at ? 'At the truck' : `${fmtDist(t.d)} to truck`;
    b.querySelector('small').textContent = at ? '' : `About ${fmtMin(t.mins)} walk`;
    b.setAttribute('aria-label', at ? 'You are at the truck.' : `Truck ${fmtDist(t.d)} away, bearing ${Math.round(t.brg)} degrees ${word(t.brg)}, about ${fmtMin(t.mins)} walk. Tap for details.`);
    b.classList.toggle('at', at);
  }
  arrowSoon();
  if (sheetOn) live();
}
function arrowSoon() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; drawArrows(); }); }
/** Arrow angle on screen: with a compass (or GPS course) it points the way to walk; without, it points along the map. */
function arrowAngle(t) { return heading != null ? t.brg - heading : t.brg - map.getBearing(); }
function drawArrows() {
  const t = truck && toTruckCached();
  const show = !!(t && !t.nofix && !el.truck.classList.contains('at'));
  el.arr.hidden = !show;
  if (show) el.arr.style.transform = `rotate(${arrowAngle(t)}deg)`;
  const big = sheetOn && document.querySelector('.hmf-big-arr');
  if (big) { big.hidden = !show; if (show) big.style.transform = `rotate(${arrowAngle(t)}deg)`; }
}
let cache = { n: -1, v: null };
function toTruckCached() { if (cache.n !== n) cache = { n, v: toTruck() }; return cache.v; }

// ---------- sheet: legal light, turnaround and truck in one place ----------
function cert(c) { return `<span class="hmf-cert ${c >= 95 ? 'hi' : c >= 80 ? 'mid' : 'lo'}">${c}%</span>`; }
function openSheet(section) {
  const L = lightState(), st = turnOn(), kind = L.kind;
  const hrs = L.L && L.L.h;
  const srcLine = kind === 'mig'
    ? `Migratory Birds Regulations, 2022, s.28. ${hrs ? cert(hrs.certainty) : ''} <a href="${MBR_URL}" target="_blank" rel="noopener">ECCC BC summary</a>`
    : `BC Hunting and Trapping Regulations Synopsis 2026 to 2028, page 11. ${hrs ? cert(hrs.certainty) : ''} <a href="${SYN_URL}" target="_blank" rel="noopener">Synopsis PDF</a>`;
  const t = truck ? toTruck() : null;
  const suggestWalk = st && st.walk ? st.walk : t && !t.nofix ? Math.ceil(t.mins / 5) * 5 : (ldTurn() || {}).walk || '';
  const html = `
    <p class="hmf-banner">Study aid only. The official regulations are the law.</p>
    <section data-sec="light">
      <h3 class="hmf-h">Legal shooting light</h3>
      <div class="hmf-seg" role="group" aria-label="Which hours">
        <button type="button" data-k="big" aria-pressed="${kind === 'big'}">Deer and big game</button>
        <button type="button" data-k="mig" aria-pressed="${kind === 'mig'}">Ducks and geese</button>
      </div>
      <div data-live="light"></div>
      <p class="hmf-small">${kind === 'mig' ? 'Ducks and geese: half an hour before sunrise to half an hour after sunset.' : 'Big game: 1 hour before sunrise to 1 hour after sunset.'} ${srcLine}</p>
      <p class="hmf-small">Sun times are worked out on the phone (no signal needed), within a minute or two. Hills and timber make it darker sooner: be sure of your target. Tip.</p>
      <label class="hmf-check"><input type="checkbox" data-k="hide" ${prefs().hideLight ? 'checked' : ''}> Hide the legal light chip on the map</label>
    </section>
    <section data-sec="turn">
      <h3 class="hmf-h">Turnaround alarm</h3>
      <div data-live="turn"></div>
      ${st ? '<button type="button" class="hmm-btn2 hmf-wide" data-k="stop">Stop the alarm</button>' : ''}
      <label class="hmf-lab" for="hmf-walk">Walk back to the truck (minutes)</label>
      <input class="hmf-in" id="hmf-walk" type="number" inputmode="numeric" min="0" max="600" value="${esc(suggestWalk)}" placeholder="minutes">
      <div data-live="sugg"></div>
      <label class="hmf-lab" for="hmf-time">Or pick a time</label>
      <div class="hmf-row"><input class="hmf-in" id="hmf-time" type="time"><button type="button" class="hmm-btn2" data-k="settime">${st ? 'Change' : 'Start'}</button></div>
      <p class="hmf-small">Same alarm as the Safety tool: it rings on any screen while the app is open. On iPhone a web app cannot ring with the screen locked, so set a Clock app alarm too. <a href="#/safety/turn">Open the full turnaround tool</a></p>
    </section>
    <section data-sec="truck">
      <h3 class="hmf-h">Back to the truck</h3>
      ${truck ? `<div class="hmf-big"><i class="hmf-big-arr">${ARROW}</i><div data-live="truck"></div></div>
        <div data-live="compass"></div>
        <div class="hmf-row2">
          <button type="button" class="hmm-btn2" data-k="show">Show on map</button>
          <button type="button" class="hmm-btn2" data-k="compass">Use the compass</button>
          <button type="button" class="hmm-btn2" data-k="remark">Move truck to here</button>
          <button type="button" class="hmm-btn2 danger" data-k="clear">Remove truck</button>
        </div>
        <p class="hmf-small">The truck is a waypoint called "My truck" in My Content, so it is in your backup. ${esc(dot(`Marked at ${fmtT(truck.markedAt || truck.created)}${truck.from === 'centre' ? ' at the map centre' : truck.acc ? `, GPS within about ${truck.acc} m` : ''}`))}</p>`
    : `<p>Tap once at the truck before you walk in. An arrow then points back to it, with the distance and a walk back time.</p>
        <button type="button" class="hmm-primary hmf-wide" data-k="mark">Mark my truck here</button>`}
    </section>`;
  const body = H.openSheet({ title: 'Hunt day', html, modal: false, onClose: () => { sheetOn = false; } }); // closes the previous sheet first (its onClose runs)
  sheetOn = true;
  body.querySelectorAll('.hmf-seg [data-k]').forEach((b) => { b.onclick = () => { prefs().light = b.dataset.k; H.savePrefs(); update(); openSheet('light'); }; });
  const q = (k) => body.querySelector(`[data-k="${k}"]`);
  q('hide').onchange = (e) => { prefs().hideLight = e.target.checked; H.savePrefs(); update(); };
  if (q('stop')) q('stop').onclick = () => { stopTurn(); openSheet('turn'); };
  body.querySelector('#hmf-walk').oninput = () => live();
  q('settime').onclick = () => {
    const v = body.querySelector('#hmf-time').value; if (!v) { H.toast('Pick a time first.'); return; }
    const [hh, mm] = v.split(':').map(Number), at = vanToday(hh, mm);
    if (setTurn(at, +body.querySelector('#hmf-walk').value || null)) openSheet('turn');
  };
  if (q('mark')) q('mark').onclick = () => markTruck();
  if (q('remark')) q('remark').onclick = () => { if (confirm('Move the truck to where you stand now?')) markTruck(); };
  if (q('clear')) q('clear').onclick = clearTruck;
  if (q('show')) q('show').onclick = () => {
    const f = fix();
    if (f && haversine([f.lng, f.lat], truck.coords) > 30) { const b = [[Math.min(f.lng, truck.coords[0]), Math.min(f.lat, truck.coords[1])], [Math.max(f.lng, truck.coords[0]), Math.max(f.lat, truck.coords[1])]]; map.fitBounds(b, { padding: { top: 200, bottom: 340, left: 60, right: 60 }, maxZoom: 16, duration: 900 }); }
    else map.flyTo({ center: truck.coords, zoom: Math.max(map.getZoom(), 15), duration: 900 });
  };
  if (q('compass')) q('compass').onclick = () => { askCompass(); setTimeout(live, 1500); };
  live();
  const sec = body.querySelector(`[data-sec="${section}"]`);
  if (sec && section !== 'light') sec.scrollIntoView({ block: 'start' });
}
/** Today (BC date) at hh:mm BC time, as a time stamp; tomorrow if that time already passed today. */
function vanToday(hh, mm) {
  const t = todayPacific(new Date());
  let at = Date.UTC(t.y, t.m - 1, t.d, hh, mm);
  for (let i = 0; i < 2; i++) { // shift by the BC offset (handles daylight time)
    const s = new Date(at).toLocaleString('en-GB', { timeZone: TZ(), hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const m = s.match(/(\d+)\/(\d+)\/(\d+),?\s+(\d+):(\d+)/); if (!m) break;
    const got = Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4] % 24, +m[5]);
    at += Date.UTC(t.y, t.m - 1, t.d, hh, mm) - got;
  }
  if (at <= Date.now()) at += 864e5;
  return at;
}
function live() {
  const body = H.els.sheetB; if (!sheetOn || !body) return;
  const put = (k, h) => { const x = body.querySelector(`[data-live="${k}"]`); if (x && x.innerHTML !== h) x.innerHTML = h; };
  const L = lightState(), now = Date.now();
  put('light', !L.L ? '<p>Sun times are not loaded on this screen. Open the app Home page once, then come back.</p>'
    : `<div class="hmf-kv"><span>Now, for ${esc(L.pt.where)}</span><b class="hmf-${L.cls}">${esc(L.cls === 'red' && now > L.L.end ? 'Over for today' : L.cls === 'before' ? `Starts in ${fmtLeft(L.L.start - now)}` : `${fmtLeft(L.left)} left`)}</b></div>
       <div class="hmf-kv"><span>Legal light</span><b>${esc(fmtT(L.L.start))} to ${esc(fmtT(L.L.end))}</b></div>
       <div class="hmf-kv"><span>Sunrise, sunset</span><b>${esc(fmtT(L.L.rise))}, ${esc(fmtT(L.L.set))}</b></div>
       ${L.pt.where === 'the map centre' ? '<p class="hmf-small">No GPS fix yet, so this is for the map centre. Tap the location button for where you stand.</p>' : ''}`);
  const st = turnOn();
  put('turn', st ? `<div class="hmf-kv"><span>Turn around at ${esc(fmtT(st.at))}</span><b class="hmf-${st.at - now <= 0 ? 'red' : st.at - now <= 15 * 6e4 ? 'orange' : 'ok'}">${st.at > now ? esc(countdown(st.at - now)) : 'Now. Head back.'}</b></div>` : '<p>No turnaround alarm is set.</p>');
  const walkEl = body.querySelector('#hmf-walk'), w = walkEl ? +walkEl.value : 0;
  const Lb = legalLight(L.pt.ll, 'big', new Date());
  const sunset = Lb && Lb.set;
  put('sugg', sunset && w > 0 ? (() => { const at = sunset - w * 6e4; return at > now
    ? `<p>Sunset ${esc(fmtT(sunset))} minus ${w} min walk back = <b>${esc(fmtT(at))}</b></p><p class="hmf-small">Plan to be back at the truck by dark. Tip.</p><button type="button" class="hmm-primary hmf-wide" data-k="usesugg" data-at="${at}">${st ? 'Change' : 'Start'} the alarm for ${esc(fmtT(at))}</button>`
    : `<p>Sunset (${esc(fmtT(sunset))}) minus ${w} min is already past. Head back now, or pick a time below.</p>`; })() : '<p class="hmf-small">Enter your walk back time to get a suggested turnaround (sunset minus the walk).</p>');
  const u = body.querySelector('[data-k="usesugg"]'); if (u && !u.onclick) u.onclick = () => { if (setTurn(+u.dataset.at, w)) openSheet('turn'); };
  if (truck) {
    const t = toTruckCached();
    put('truck', t.nofix ? '<p><b>Waiting for GPS.</b> Open sky helps.</p>' : (() => {
      const at = t.d < Math.max(20, t.acc || 0);
      return `<div class="hmf-dist">${at ? 'At the truck' : esc(fmtDist(t.d))}</div>
        <p>Bearing <b>${Math.round(t.brg)}°</b> (${esc(word(t.brg))}) from you.</p>
        <p>About <b>${esc(fmtMin(t.mins))}</b> walk back <span class="hmf-cert tip">Tip</span></p>
        <p class="hmf-small">Straight line at ${KMH} km/h plus 1 minute for every 10 m of climb (Naismith style)${t.climb == null ? '. Climb not known: the terrain for this area is not on the phone' : `, net climb ${Math.round(t.climb)} m from the terrain map`}. Real routes are longer: add time for brush, dark and a deer to pack.</p>`;
    })());
    put('compass', heading != null
      ? `<p class="hmf-small">${headSrc === 'compass' ? 'Arrow follows your phone compass: hold the phone flat and walk where it points.' : 'Arrow uses your walking direction from GPS. Stop and it may drift.'} Phone compasses can be off by 10° or more near metal or the truck. Tip.</p>`
      : `<p class="hmf-small">${compassState === 'denied' ? '<b>Compass is off</b> (motion access not allowed). ' : 'Compass not on yet. '}The arrow points along the map, not the way you face. Use the bearing: face ${t && !t.nofix ? `${Math.round(t.brg)}° (${esc(word(t.brg))})` : 'the bearing'} on a real compass, or turn the map north up and line it up with the land.</p>`);
  }
  drawArrows();
}

// ---------- styles ----------
function css() {
  if (document.getElementById('hmf-css')) return;
  const s = document.createElement('style'); s.id = 'hmf-css';
  s.textContent = `
.hmf{position:absolute;z-index:3;left:calc(var(--sl) + 12px);top:calc(var(--st) + 140px);display:flex;flex-direction:column;align-items:flex-start;gap:8px;max-width:calc(100% - var(--sl) - var(--sr) - 84px);pointer-events:none}
.hmm-3d:not([hidden]) ~ .hmf{top:calc(var(--st) + 330px)}
.framing .hmf{display:none}
.hmf-chip{pointer-events:auto;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px 0 10px;border:0;border-radius:22px;background:var(--hmm-btn);color:var(--hmm-ink);box-shadow:var(--hmm-shadow);font:700 15px/1.15 -apple-system,system-ui,sans-serif;text-align:left;max-width:100%}
.hmf-chip[hidden]{display:none}
.hmf-chip>svg{width:22px;height:22px;flex:none}
.hmf-chip.hmf-orange{background:#c2410c;color:#fff}
.hmf-chip.hmf-red{background:#b3261e;color:#fff}
.hmf-chip.hmf-before,.hmf-chip.hmf-off{color:var(--hmm-muted)}
.hmf-truck{min-height:52px;padding:4px 16px 4px 8px}
.hmf-truck>svg{width:26px;height:26px}
.hmf-truck.has>svg{display:none}
.hmf-truck:not(.has) .hmf-arr{display:none}
.hmf-arr{display:grid;place-items:center;width:44px;height:44px;flex:none;color:#1a73e8;transition:transform .25s}
.hmf-arr[hidden]{display:none}
.hmf-arr svg,.hmf-big-arr svg{width:100%;height:100%}
.hmf-tt{display:flex;flex-direction:column}
.hmf-tt b{font-size:16px}
.hmf-tt small{font-size:14px;font-weight:600;color:var(--hmm-muted)}
.hmf-tt small:empty{display:none}
:root[data-theme="sun"] .hmf-chip{border:2px solid #000}
.hmf-h{margin:18px 0 6px;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--hmm-muted)}
.hmf-banner{font-size:14px;font-weight:700;margin:0 0 6px;padding:8px 10px;border-radius:10px;background:var(--hmm-soft)}
.hmf-seg{display:flex;gap:6px;margin:6px 0 10px}
.hmf-seg button{flex:1;min-height:44px;border-radius:12px;border:1.5px solid var(--hmm-line,#999);background:var(--hmm-card);color:var(--hmm-ink);font-weight:700;font-size:15px}
.hmf-seg button[aria-pressed="true"]{background:#1f6b24;border-color:#1f6b24;color:#fff}
.hmf-kv{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6px 0;border-bottom:1px solid var(--hmm-soft);font-size:15px}
.hmf-kv b{text-align:right}
.hmf-kv b.hmf-orange{color:#c2410c}.hmf-kv b.hmf-red{color:#b3261e}
.hmf-small{font-size:14px;color:var(--hmm-muted);margin:8px 0}
.hmf-small a{color:inherit;text-decoration:underline}
.hmf-cert{font-size:14px;font-weight:700;padding:1px 6px;border-radius:6px;white-space:nowrap;background:rgba(120,120,120,.18)}
.hmf-cert.hi{background:rgba(46,125,50,.15);color:#1f6b24}.hmf-cert.mid{background:rgba(122,143,46,.18);color:#56691c}.hmf-cert.lo{background:rgba(198,138,0,.18);color:#8a5f00}
.hmf-check{display:flex;align-items:center;gap:10px;min-height:44px;font-size:15px}
.hmf-check input{width:22px;height:22px}
.hmf-lab{display:block;font-size:15px;font-weight:700;margin:10px 0 4px}
.hmf-in{min-height:44px;font-size:16px;padding:0 10px;border-radius:10px;border:1.5px solid var(--hmm-line,#999);background:var(--hmm-card);color:var(--hmm-ink);width:100%;box-sizing:border-box}
.hmf-row{display:flex;gap:8px}.hmf-row .hmf-in{flex:1}
.hmf-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
.hmf-wide{width:100%;min-height:48px;margin:8px 0}
.hmf-big{display:flex;align-items:center;gap:14px}
.hmf-big-arr{width:110px;height:110px;flex:none;color:#1a73e8;display:block;transition:transform .25s}
.hmf-big-arr[hidden]{display:none}
.hmf-big p{margin:4px 0;font-size:15px}
.hmf-dist{font-size:30px;font-weight:800}
section[data-sec]{scroll-margin-top:8px}`;
  document.head.appendChild(s);
}
