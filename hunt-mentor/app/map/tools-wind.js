/* Hunt Map plugin: weather and wind.
   Weather button (3 day mini forecast at the map centre), wind arrows on a small grid over the view, scent cone.
   Weather data by Open-Meteo (CC BY 4.0), free, no key, open to browsers (CORS).
   Offline: the last forecast is kept in localStorage (hm.wx.v1) and shown with the time it was fetched.
   Sets on HuntMap: H.wx (forecast helpers, used by tools-insights.js) and H.scentCone([lng, lat]). */
import { esc, compass8, debounce, haversine } from './util.js';

export const TZ = 'America/Vancouver';
export const ATTRIB = 'Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0)';
const API = 'https://api.open-meteo.com/v1/forecast';
const TTL = 30 * 6e4, LS = 'hm.wx.v1';
const D2R = Math.PI / 180, R2D = 180 / Math.PI, RE = 6371008.8;
const SRC_W = 'hm-wind', SRC_C = 'hm-scent';
let H, map, gridOn = false, coneData = null, picking = null;

// ---------- Open-Meteo ----------
const mem = new Map();
const key = (lng, lat) => `${lat.toFixed(2)},${lng.toFixed(2)}`;
function readLS() { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { return null; } }
function writeLS(o) { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { /* storage full or blocked */ } }

/** Forecast for a point. Resolves { v (Open-Meteo JSON), t (fetch time ms), offline (bool), away (m from the asked point) }.
    Network first (cached 30 min in memory); on failure the last saved forecast. Rejects only when nothing is saved. */
export async function forecast(lng, lat) {
  const k = key(lng, lat), hit = mem.get(k);
  if (hit && Date.now() - hit.t < TTL) return { v: hit.v, t: hit.t, offline: false, away: 0 };
  const u = `${API}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`
    + '&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,weather_code'
    + '&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,pressure_msl'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant'
    + `&past_hours=3&forecast_hours=24&forecast_days=3&wind_speed_unit=kmh&timezone=${encodeURIComponent(TZ)}`;
  try {
    if (navigator.onLine === false) throw new Error('offline');
    const r = await fetchT(u, 12000);
    if (!r.ok) throw new Error(`Weather ${r.status}`);
    const v = await r.json();
    if (!v || !v.current || !v.hourly || !v.daily) throw new Error('Weather data incomplete');
    const t = Date.now();
    mem.set(k, { t, v }); writeLS({ t, lng, lat, v });
    return { v, t, offline: false, away: 0 };
  } catch (err) {
    const s = readLS();
    if (s && s.v) return { v: s.v, t: s.t, offline: true, away: haversine([lng, lat], [s.lng, s.lat]) };
    throw err;
  }
}
/** Current wind at several points in one request: [{ lng, lat, kmh, from }]. Cached 30 min. */
export async function windAt(points) {
  const k = points.map((p) => key(p[0], p[1])).join('|'), hit = mem.get(k);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const u = `${API}?latitude=${points.map((p) => p[1].toFixed(3)).join(',')}&longitude=${points.map((p) => p[0].toFixed(3)).join(',')}`
    + `&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=${encodeURIComponent(TZ)}`;
  if (navigator.onLine === false) throw new Error('offline');
  const r = await fetchT(u, 12000);
  if (!r.ok) throw new Error(`Weather ${r.status}`);
  let j = await r.json(); if (!Array.isArray(j)) j = [j];
  const v = j.map((x, i) => ({ lng: points[i][0], lat: points[i][1], kmh: x.current.wind_speed_10m, from: x.current.wind_direction_10m }));
  mem.set(k, { t: Date.now(), v });
  return v;
}
function fetchT(u, ms) {
  const c = typeof AbortController === 'function' ? new AbortController() : null;
  const t = c && setTimeout(() => c.abort(), ms);
  return fetch(u, { credentials: 'omit', signal: c && c.signal }).finally(() => clearTimeout(t));
}
/** Index of the current hour in an hourly block (matches current.time, local). */
export function hourIndex(v) {
  const now = (v.current && v.current.time) || new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T');
  const i = v.hourly.time.findIndex((t) => t.slice(0, 13) === now.slice(0, 13));
  return i < 0 ? 0 : i;
}
const WMO = [[0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Cloudy'], [45, 'Fog'], [51, 'Drizzle'], [56, 'Freezing drizzle'], [61, 'Rain'], [66, 'Freezing rain'], [71, 'Snow'], [77, 'Snow grains'], [80, 'Rain showers'], [85, 'Snow showers'], [95, 'Thunderstorm']];
export function sky(code) { let t = 'Weather'; for (const [c, l] of WMO) if (code >= c) t = l; return t; }
export function pressureTrend(v) {
  const p = v.hourly.pressure_msl, i = hourIndex(v);
  if (!p || p[i] == null) return '';
  const back = p[Math.max(0, i - 3)], dv = p[i] - back;
  const trend = dv > 1 ? 'rising' : dv < -1 ? 'falling' : 'steady';
  return `Pressure ${Math.round(p[i])} hPa (hectopascals), ${trend} over the last 3 hours`;
}
export const speed = (kmh) => (H.units.system === 'imperial' ? `${Math.round(kmh / 1.609)} mph` : `${Math.round(kmh)} km/h`);
export const temp = (c) => (H.units.system === 'imperial' ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`);
export const windWords = (from, kmh) => (kmh < 2 ? 'Calm, no steady wind' : `Wind from the ${compass8(from)} at ${speed(kmh)}`);
/** Arrow that points where the wind blows TO (downwind). */
export const arrow = (from, size = 22) => `<svg class="hmw-arr" viewBox="0 0 24 24" width="${size}" height="${size}" style="transform:rotate(${(from + 180) % 360}deg)" aria-hidden="true"><path d="M12 2 19 12h-4.5v10h-5V12H5Z" fill="currentColor"/></svg>`;
const when = (t) => new Date(t).toLocaleString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'long' });
/** One line under a sheet when the data came from the saved copy. */
export function staleNote(f) {
  if (!f.offline) return '';
  const away = f.away > 2000 ? ` for a spot ${H.units.dist(f.away)} away` : '';
  return `<p class="hmw-stale">You are offline. This is the last forecast saved, fetched ${esc(when(f.t))}${away}.</p>`;
}
export const OFFLINE_MSG = 'Weather needs a connection, and no forecast is saved yet. Open the weather once with signal and it is kept for offline use.';
const NOANSWER_MSG = 'The weather service did not answer. Try again in a minute.';
export const failMsg = () => (navigator.onLine === false ? OFFLINE_MSG : NOANSWER_MSG);

// ---------- plugin ----------
export default function init(api) {
  H = api; map = H.map;
  // Arrow image and layers are added the first time wind arrows or a scent cone are shown (lazy).
  map.on('moveend', debounce(() => { if (gridOn && H.isOpen) loadGrid(); }, 900));
  H.on('units', () => { if (gridOn) loadGrid(); if (coneData) drawCone(); });
  H.setBarAction('weather', weatherSheet);
  H.onClick(onTap);
  H.scentCone = (p) => cone(p);
  H.wx = { forecast, windAt, hourIndex, sky, pressureTrend, speed, temp, windWords, arrow, staleNote, ATTRIB, failMsg, TZ };
}

function addImage() {
  if (map.hasImage('hm-wind-arrow')) return;
  const pr = 2, n = 32, c = document.createElement('canvas'); c.width = c.height = n * pr;
  const x = c.getContext('2d'); x.scale(pr, pr);
  x.fillStyle = '#0b4f8a'; x.strokeStyle = '#ffffff'; x.lineWidth = 2.2; x.lineJoin = 'round';
  const p = new Path2D('M16 2 25 15h-6v14h-6V15H7Z'); x.stroke(p); x.fill(p);
  map.addImage('hm-wind-arrow', x.getImageData(0, 0, n * pr, n * pr), { pixelRatio: pr });
}
const empty = () => ({ type: 'FeatureCollection', features: [] });
function addLayers() {
  if (map.getSource(SRC_W)) return;
  addImage();
  map.addSource(SRC_C, { type: 'geojson', data: empty() });
  map.addSource(SRC_W, { type: 'geojson', data: empty() });
  map.addLayer({ id: 'hm-wind-arrow', type: 'symbol', source: SRC_W, layout: {
    'icon-image': 'hm-wind-arrow', 'icon-rotate': ['get', 'to'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
    'icon-size': ['interpolate', ['linear'], ['get', 'kmh'], 0, 0.75, 30, 1.3],
    'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0, 1.9], 'text-allow-overlap': true, 'text-ignore-placement': true,
  }, paint: { 'text-color': '#0b4f8a', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.8 } });
  map.addLayer({ id: 'hm-scent-fill', type: 'fill', source: SRC_C, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#7b2cbf', 'fill-opacity': 0.22 } });
  map.addLayer({ id: 'hm-scent-line', type: 'line', source: SRC_C, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': '#7b2cbf', 'line-width': 2, 'line-dasharray': [2, 1.2] } });
  map.addLayer({ id: 'hm-scent-dot', type: 'circle', source: SRC_C, filter: ['==', ['get', 'k'], 'origin'], paint: { 'circle-radius': 6, 'circle-color': '#7b2cbf', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'hm-scent-label', type: 'symbol', source: SRC_C, filter: ['==', ['get', 'k'], 'label'], layout: {
    'text-field': ['get', 'text'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-max-width': 9, 'text-allow-overlap': true, 'text-ignore-placement': true,
  }, paint: { 'text-color': '#4a1677', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 2 } });
}

// ---------- wind arrows on a grid over the view ----------
function setGrid(on) {
  gridOn = on;
  const b = H.els.stackR.querySelector('[data-act="weather"]'); if (b) b.classList.toggle('on', on);
  if (H.overlayChip) H.overlayChip('wind', on ? 'Wind arrows' : '', () => setGrid(false));
  if (on) { addLayers(); loadGrid(); H.toast('Wind arrows point the way the wind blows, now. Labels say where it comes from.', 4500); }
  else if (map.getSource(SRC_W)) map.getSource(SRC_W).setData(empty());
}
async function loadGrid() {
  const cv = map.getCanvas(), w = cv.clientWidth, h = cv.clientHeight, pts = [];
  // a 3 by 4 grid, kept inside the part of the screen not covered by the top bar and the bottom bar
  for (const fy of [0.22, 0.4, 0.58, 0.74]) for (const fx of [0.18, 0.48, 0.76]) { const ll = map.unproject([w * fx, h * fy]); pts.push([ll.lng, ll.lat]); }
  try {
    const r = await windAt(pts);
    if (!gridOn || !map.getSource(SRC_W)) return;
    map.getSource(SRC_W).setData({ type: 'FeatureCollection', features: r.map((x) => ({ type: 'Feature',
      properties: { to: (x.from + 180) % 360, kmh: x.kmh, label: x.kmh < 2 ? 'Calm' : `${compass8(x.from)} ${speed(x.kmh)}` },
      geometry: { type: 'Point', coordinates: [x.lng, x.lat] } })) });
  } catch (err) {
    const has = map.getSource(SRC_W) ? map.querySourceFeatures(SRC_W).length : 0;
    if (!has) { H.toast(navigator.onLine === false ? 'Wind arrows need a connection.' : 'The weather service did not answer. Try the wind arrows again in a minute.', 4500); setGrid(false); }
    else H.toast('Wind arrows could not update here, so they still show the last wind.', 4000);
  }
}

// ---------- scent cone (opinion): 30 degrees wide, 400 m long, pointing downwind ----------
function dest(p, dist, brg) {
  const d = dist / RE, t = brg * D2R, la = p[1] * D2R, lo = p[0] * D2R;
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(t));
  const lo2 = lo + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [lo2 * R2D, la2 * R2D];
}
export async function cone(p) {
  H.toast('Checking the wind here');
  let f;
  try { f = await forecast(p[0], p[1]); } catch (err) { H.toast('The scent cone needs the wind, and the wind needs a connection.', 4500); return; }
  const c = f.v.current;
  coneData = { p, from: c.wind_direction_10m, kmh: c.wind_speed_10m, f };
  drawCone();
  const pad = { top: 120, bottom: 160, left: 50, right: 50 };
  const ring = coneRing(p, coneData.from);
  const xs = ring.map((q) => q[0]), ys = ring.map((q) => q[1]);
  map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: pad, maxZoom: Math.max(map.getZoom(), 15), duration: 600 });
  H.toast(`${windWords(coneData.from, coneData.kmh)}${f.offline ? ' (saved forecast)' : ''}. Tap the cone for details.`, 5000);
  if (H.hintOnce) setTimeout(() => H.hintOnce('cone', 'Tip: keep the shaded wedge off where you expect animals. Tap the Scent cone chip to clear it.'), 5200);
}
function coneRing(p, from) {
  const to = (from + 180) % 360, ring = [p];
  for (let a = -15; a <= 15; a += 2.5) ring.push(dest(p, 400, to + a));
  ring.push(p);
  return ring;
}
function drawCone() {
  if (H.overlayChip) H.overlayChip('cone', coneData ? 'Scent cone' : '', clearCone);
  if (!coneData) { if (map.getSource(SRC_C)) map.getSource(SRC_C).setData(empty()); return; }
  addLayers();
  const { p, from, kmh } = coneData, to = (from + 180) % 360;
  const calm = kmh < 2;
  map.getSource(SRC_C).setData({ type: 'FeatureCollection', features: [
    { type: 'Feature', properties: { k: 'cone' }, geometry: { type: 'Polygon', coordinates: [coneRing(p, from)] } },
    { type: 'Feature', properties: { k: 'origin' }, geometry: { type: 'Point', coordinates: p } },
    { type: 'Feature', properties: { k: 'label', text: calm ? 'Tip: calm air, scent pools around you' : 'Tip: your scent drifts this way' }, geometry: { type: 'Point', coordinates: dest(p, 250, to) } },
  ] });
}
function clearCone() { coneData = null; drawCone(); }
function coneSheet() {
  const { from, kmh, f } = coneData;
  const body = H.openSheet({ title: 'Scent cone', html: `
    <p><span class="hmm-cert tip">Tip</span> Opinion, not a rule. The shaded wedge shows where your scent most likely drifts: 30 degrees wide and 400 m (437 yd) long, downwind of the dot.</p>
    <div class="hmw-now">${arrow(from, 40)}<div><b>${windWords(from, kmh)}</b><span>Forecast wind for this spot, 10 m above the ground.</span></div></div>
    <ul class="hmw-list"><li>Wind swirls in timber and around ridges, so the real cone is wider.</li><li>Thermals rise as the sun warms a slope in the morning and sink in the evening.</li><li>Keep the cone off where you expect the animals to be.</li></ul>
    ${staleNote(f)}
    <div class="hmm-btnrow"><button class="hmm-btn2" data-c="clear">Clear the scent cone</button><button class="hmm-btn2" data-c="pick">Move it: tap the map</button></div>
    <p class="hmm-muted">${ATTRIB}</p>` });
  body.querySelector('[data-c="clear"]').onclick = () => { clearCone(); H.closeSheet(); };
  body.querySelector('[data-c="pick"]').onclick = () => { H.closeSheet(); startPick(); };
}
function fromGps() {
  const g = H.lastPosition;
  if (!g) { H.toast('Turn on your location first: tap the locate button, then try again.', 4500); return; }
  cone([g.lng, g.lat]);
}
function startPick() {
  picking = true;
  H.toast('Tap the map where you will stand. The scent cone starts there.', 6000);
}
function onTap(e) {
  if (picking) { picking = null; cone([e.lngLat.lng, e.lngLat.lat]); return true; }
  if (coneData && map.getLayer('hm-scent-fill')) {
    const hit = map.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ['hm-scent-fill', 'hm-scent-dot', 'hm-scent-label'] });
    if (hit.length) { coneSheet(); return true; }
  }
  return false;
}

// ---------- Weather sheet ----------
export async function weatherSheet() {
  const c = map.getCenter(), lng = c.lng, lat = c.lat;
  const body = H.openSheet({ title: 'Weather and wind', tall: true, html: '<p class="hmm-muted">Getting the forecast for the map centre</p>' });
  let f;
  try { f = await forecast(lng, lat); } catch (err) {
    if (H.els.sheetB === body) body.innerHTML = `<p>${failMsg()}</p><div class="hmm-btnrow"><button class="hmm-btn2" data-w="retry">Try again</button></div>${buttons()}<p class="hmm-muted">${ATTRIB}</p>`;
    wire(body, lng, lat); return;
  }
  if (H.els.sheetB !== body || H.els.sheet.hidden) return;
  const v = f.v, cu = v.current, d = v.daily;
  const days = d.time.map((t, k) => {
    const name = k === 0 ? 'Today' : new Date(`${t}T12:00`).toLocaleDateString('en-CA', { weekday: 'long' });
    return `<div class="hmw-day"><b>${name}</b><span class="hmw-sky">${esc(sky(d.weather_code[k]))}</span>
      <span class="hmw-t">${temp(d.temperature_2m_max[k])} <small>low ${temp(d.temperature_2m_min[k])}</small></span>
      <span>Rain ${d.precipitation_probability_max[k] ?? 0}%, ${(+d.precipitation_sum[k] || 0).toFixed(1)} mm</span>
      <span class="hmw-w">${arrow(d.wind_direction_10m_dominant[k], 18)} From ${compass8(d.wind_direction_10m_dominant[k])}, up to ${speed(d.wind_speed_10m_max[k])}</span>
      <span class="hmm-muted">Gusts ${speed(d.wind_gusts_10m_max[k])}</span></div>`;
  }).join('');
  body.innerHTML = `
    <p class="hmm-muted">Map centre, ${esc(H.units.coord(lng, lat))}</p>${staleNote(f)}
    <div class="hmw-now">${arrow(cu.wind_direction_10m, 44)}<div><b class="hmw-big">${temp(cu.temperature_2m)}, ${esc(sky(cu.weather_code))}</b>
      <span>${windWords(cu.wind_direction_10m, cu.wind_speed_10m)}, gusts ${speed(cu.wind_gusts_10m)}</span><span>${pressureTrend(v)}</span></div></div>
    <h3 class="hmm-h">Next 3 days</h3><div class="hmw-days">${days}</div>
    ${buttons()}
    <p class="hmm-muted">A forecast from a weather model, not a measurement. Wind in draws and timber can differ.</p>
    <p class="hmm-muted">${ATTRIB}</p>`;
  wire(body, lng, lat);
}
function buttons() {
  return `<div class="hmm-btnrow">
    <button class="hmm-btn2" data-w="grid">${gridOn ? 'Hide wind arrows' : 'Wind arrows on the map'}</button>
    <button class="hmm-btn2" data-w="gps">Scent cone from my location</button>
    <button class="hmm-btn2" data-w="pick">Scent cone: tap the map</button>
    ${coneData ? '<button class="hmm-btn2" data-w="clear">Clear the scent cone</button>' : ''}
    ${typeof H.insightsAt === 'function' ? '<button class="hmm-btn2" data-w="ins">Insights here</button>' : ''}</div>`;
}
function wire(body, lng, lat) {
  const on = (k, fn) => { const b = body.querySelector(`[data-w="${k}"]`); if (b) b.onclick = fn; };
  on('grid', () => { H.closeSheet(); setGrid(!gridOn); });
  on('gps', () => { H.closeSheet(); fromGps(); });
  on('pick', () => { H.closeSheet(); startPick(); });
  on('clear', () => { clearCone(); H.closeSheet(); });
  on('ins', () => H.insightsAt([lng, lat]));
  on('retry', () => weatherSheet());
}
