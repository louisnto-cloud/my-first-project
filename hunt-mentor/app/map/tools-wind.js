/* Hunt Map tools: wind arrows for the view, scent cone, Weather sheet (3 day forecast) and the Insights sheet.
   Weather from Open-Meteo (free, no key). Needs a connection; everything else on Insights works offline. */
import { esc, compass8, debounce } from './util.js';
import { forecast, windAt, hourIndex, scentCone, moon, sky } from './tools-geo.js';
import { muAt } from './layers.js';

let ctx, H, map, grid = false;
const WSRC = 'hm-wind';

export function init(c) {
  ctx = c; H = c.H; map = c.map;
  map.addSource(WSRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'hm-wind-arrow', type: 'symbol', source: WSRC, layout: {
    'icon-image': 'hm-arrow', 'icon-rotate': ['get', 'to'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
    'icon-size': ['interpolate', ['linear'], ['get', 'kmh'], 0, 0.7, 30, 1.25],
    'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0, 1.7], 'text-allow-overlap': true,
  }, paint: { 'text-color': '#0b4f8a', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.8 } });
  map.on('moveend', debounce(() => { if (grid) loadGrid(); }, 1200));
  H.setBarAction('weather', weatherSheet);
  H.setBarAction('insights', () => insights());
}

const speed = (kmh) => (H.units.system === 'imperial' ? `${Math.round(kmh / 1.609)} mph` : `${Math.round(kmh)} km/h`);
const temp = (c) => (H.units.system === 'imperial' ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`);
const arrow = (from, size = 22) => `<svg class="hmt-arr" viewBox="0 0 24 24" width="${size}" height="${size}" style="transform:rotate(${(from + 180) % 360}deg)" aria-hidden="true"><path d="M12 2 19 12h-4.5v10h-5V12H5Z" fill="currentColor"/></svg>`;
export const windWords = (from, kmh) => `Wind from the ${compass8(from)} at ${speed(kmh)}`;
const offlineMsg = 'Weather needs a connection. The rest works offline.';

// ---------- wind arrows on a grid over the view ----------
export const gridOn = () => grid;
export function toggleGrid() {
  grid = !grid;
  if (grid) { loadGrid(); H.toast('Wind arrows point the way the wind blows.'); }
  else map.getSource(WSRC).setData({ type: 'FeatureCollection', features: [] });
}
async function loadGrid() {
  const b = map.getBounds(), w = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth(), pts = [];
  for (const fy of [0.25, 0.55, 0.8]) for (const fx of [0.2, 0.5, 0.8]) pts.push([w + (e - w) * fx, n - (n - s) * fy]);
  try {
    const r = await windAt(pts);
    if (!grid) return;
    map.getSource(WSRC).setData({ type: 'FeatureCollection', features: r.map((x) => ({ type: 'Feature', properties: { to: (x.from + 180) % 360, kmh: x.kmh, label: `${compass8(x.from)} ${speed(x.kmh)}` }, geometry: { type: 'Point', coordinates: [x.lng, x.lat] } })) });
  } catch (err) { H.toast(offlineMsg, 4000); grid = false; }
}

// ---------- scent cone ----------
export async function cone(p) {
  H.toast('Checking the wind');
  let w;
  try { w = (await windAt([p]))[0]; } catch (err) { H.toast(offlineMsg, 4000); return; }
  const c = scentCone(p, w.from, w.kmh);
  ctx.overlays.cone = Object.assign(c, { text: `Tip (opinion): your scent drifts this way\n${windWords(w.from, w.kmh)}` });
  ctx.drawOverlays();
  H.toast(`Scent cone, a Tip (opinion). ${windWords(w.from, w.kmh)}. Wind swirls in timber and shifts at dawn and dusk.`, 6000);
}

// ---------- Weather sheet ----------
export async function weatherSheet() {
  const c = map.getCenter();
  const body = H.openSheet({ title: 'Weather', html: '<p class="hmm-muted">Getting the forecast for the map centre</p>' });
  let f;
  try { f = await forecast(c.lng, c.lat); } catch (err) { if (H.els.sheetB === body) body.innerHTML = `<p>${offlineMsg}</p>`; return; }
  if (H.els.sheetB !== body || H.els.sheet.hidden) return;
  const cu = f.current, d = f.daily, i = hourIndex(f.hourly);
  const days = d.time.map((t, k) => {
    const name = k === 0 ? 'Today' : new Date(`${t}T12:00`).toLocaleDateString('en-CA', { weekday: 'long' });
    return `<div class="hmt-day"><b>${name}</b><span>${esc(sky(d.weather_code[k]))}</span><span class="hmt-big">${temp(d.temperature_2m_max[k])} <small>${temp(d.temperature_2m_min[k])}</small></span>
      <span>Rain ${d.precipitation_probability_max[k] ?? 0}%, ${(+d.precipitation_sum[k] || 0).toFixed(1)} mm</span><span>${arrow(d.wind_direction_10m_dominant[k], 16)} ${compass8(d.wind_direction_10m_dominant[k])} up to ${speed(d.wind_speed_10m_max[k])}</span></div>`;
  }).join('');
  body.innerHTML = `
    <p class="hmm-muted">Map centre, ${esc(H.units.coord(c.lng, c.lat))}</p>
    <div class="hmt-now">${arrow(cu.wind_direction_10m, 40)}<div><b class="hmt-big">${temp(cu.temperature_2m)}, ${esc(sky(cu.weather_code))}</b><span>${windWords(cu.wind_direction_10m, cu.wind_speed_10m)}, gusts ${speed(cu.wind_gusts_10m)}</span><span>${pressure(f.hourly, i)}</span></div></div>
    <h3 class="hmm-h">Next 3 days</h3><div class="hmt-days">${days}</div>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-w="grid">${grid ? 'Hide wind arrows' : 'Wind arrows on the map'}</button><button class="hmm-btn2" data-w="cone">Scent cone from map centre</button><button class="hmm-btn2" data-w="ins">Insights</button></div>
    <p class="hmm-muted">Forecast from Open-Meteo, a model, not a measurement. Local wind in draws and timber can differ.</p>`;
  body.querySelector('[data-w="grid"]').onclick = () => { toggleGrid(); H.closeSheet(); };
  body.querySelector('[data-w="cone"]').onclick = () => { H.closeSheet(); cone([c.lng, c.lat]); };
  body.querySelector('[data-w="ins"]').onclick = () => insights();
}
function pressure(h, i) {
  const p = h.pressure_msl; if (!p || p[i] == null) return '';
  const back = p[Math.max(0, i - 3)], dv = p[i] - back, trend = dv > 1 ? 'rising' : dv < -1 ? 'falling' : 'steady';
  return `Pressure ${Math.round(p[i])} hPa (hectopascals), ${trend} over 3 hours`;
}

// ---------- Insights ----------
const certSpan = (v) => H.ui.cert(v);
function regionRows(regionNum, muId) {
  const R = window.HM && window.HM.regs; if (!R || !regionNum) return '';
  const re = new RegExp(`Region ${regionNum}\\b|Regions [\\d ,and]*\\b${regionNum}\\b`, 'i');
  const rows = R.items.filter((r) => re.test(r.label) || r.group.endsWith(`R${regionNum}`) || new RegExp(`^r${regionNum}[a-z]`).test(r.key) || (muId && (r.label + ' ' + (r.value || '')).includes(muId)));
  if (!rows.length) return '<p class="hmm-muted">No rows for this region in the app data yet. Check the official synopsis.</p>';
  return rows.map((r) => `<div class="hmt-reg"><b>${esc(r.label)}</b><p>${r.value ? esc(r.value) : '<span class="hmm-verify">VERIFY</span>'}</p>
    <small>${certSpan(r.certainty)} ${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.source)}</a>` : esc(r.source || '')}${r.page ? `, ${esc(r.page)}` : ''}, checked ${esc(r.checked || R.lastChecked || '')}</small></div>`).join('');
}
function lightHtml(lat, lng) {
  const HMs = window.HuntMentor || {}, hours = window.HM && window.HM.regs && window.HM.regs.hours;
  if (!HMs.sunEvent || !hours) return '<p><span class="hmm-verify">VERIFY</span> Legal light needs the app data.</p>';
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const rise = HMs.sunEvent(today, lat, lng, true), set = HMs.sunEvent(today, lat, lng, false), hhmm = HMs.hhmm, add = (d, m) => (d ? new Date(+d + m * 6e4) : null);
  const row = (label, h) => (h && h.beforeSunriseMin != null
    ? `<div class="hmm-kv"><span>${label}</span><b>${hhmm(add(rise, -h.beforeSunriseMin))} to ${hhmm(add(set, h.afterSunsetMin))}</b>${certSpan(h.certainty)}</div>`
    : `<div class="hmm-kv"><span>${label}</span><span class="hmm-verify">VERIFY</span></div>`);
  return `<div class="hmm-kv"><span>Sunrise</span><b>${hhmm(rise)}</b></div><div class="hmm-kv"><span>Sunset</span><b>${hhmm(set)}</b></div>
    ${row('Big game and upland birds', hours.bigGame)}${row('Ducks and geese', hours.migratory)}
    <p class="hmm-muted">Calculated on your phone for this spot, Pacific time. Rules: ${esc(hours.bigGame && hours.bigGame.text || '')} ${esc(hours.migratory && hours.migratory.text || '')}</p>`;
}

/** Insights for a point (default: map centre). */
export async function insights(p, name) {
  if (!p) { const c = map.getCenter(); p = [c.lng, c.lat]; }
  const [lng, lat] = p;
  const body = H.openSheet({ title: name ? `Insights: ${name}` : 'Insights', bar: name ? null : 'insights', tall: true, html: '<p class="hmm-muted">Checking this spot</p>' });
  const [elev, mu] = await Promise.all([H.elevationAt(p).catch(() => null), muAt(p).catch(() => ({ state: 'error' }))]);
  if (H.els.sheetB !== body || H.els.sheet.hidden) return;
  let muHtml, regionNum = null;
  if (mu && mu.state === 'ok') {
    regionNum = (String(mu.id).match(/^(\d{1,2})-/) || String(mu.region).match(/Region (\d{1,2})/) || [])[1] || null;
    muHtml = `<div class="hmm-kv"><span>MU (Management Unit)</span><b>${esc(mu.id)}</b></div>${mu.region ? `<div class="hmm-kv"><span>Region</span><b>${esc(mu.region)}</b></div>` : ''}<p class="hmm-muted">${esc(mu.source || '')}</p>`;
  } else if (mu && mu.state === 'outside') muHtml = '<p>Not inside a MU (Management Unit) in the loaded data.</p>';
  else muHtml = '<p>The MU (Management Unit) layer is not loaded. Check the Rule Book for this area.</p>';
  const sessions = (window.HM && window.HM.sessions) || [];
  const rb = regionNum && sessions.find((s) => s.id === `rb-region-${regionNum}`);
  const m = moon();
  body.innerHTML = `
    <p class="hmm-muted">${esc(H.units.coord(lng, lat))}${elev != null ? `, ${H.units.elev(Math.round(elev))}` : ''}</p>
    <div class="hmm-banner">Study aid only. The official regulations are the law.</div>
    <h3 class="hmm-h">Where you are</h3>${muHtml}
    <h3 class="hmm-h">Wind and weather</h3><div data-out="wx"><p class="hmm-muted">Getting the forecast</p></div>
    <h3 class="hmm-h">Legal light today</h3>${lightHtml(lat, lng)}
    <div class="hmm-kv"><span>Moon</span><b>${m.name}, ${m.lit}% lit</b></div>
    <h3 class="hmm-h">${regionNum ? `Rules for Region ${esc(regionNum)}` : 'Rules for this area'}</h3>
    ${regionNum ? regionRows(regionNum, mu.id) : '<p class="hmm-muted">Find the MU first, then the rules for its region show here.</p>'}
    <div class="hmm-btnrow">${rb ? `<a class="hmm-btn2" href="#/s/${esc(rb.id)}">${esc(rb.title)}</a>` : ''}<a class="hmm-btn2" href="#/field/light">Full legal light table</a><a class="hmm-btn2" href="#/sources">Rules data</a></div>`;
  let f;
  try { f = await forecast(lng, lat); } catch (err) { const o = body.querySelector('[data-out="wx"]'); if (o) o.innerHTML = `<p class="hmm-muted">${offlineMsg}</p>`; return; }
  const o = body.querySelector('[data-out="wx"]'); if (!o || H.els.sheetB !== body) return;
  const cu = f.current, h = f.hourly, i = hourIndex(h);
  const hours = [];
  for (let k = i; k < Math.min(h.time.length, i + 12); k++) hours.push(`<div><small>${new Date(h.time[k]).toLocaleTimeString('en-CA', { hour: 'numeric' })}</small>${arrow(h.wind_direction_10m[k], 20)}<b>${compass8(h.wind_direction_10m[k])}</b><small>${speed(h.wind_speed_10m[k])}</small><small>${temp(h.temperature_2m[k])}</small></div>`);
  o.innerHTML = `
    <div class="hmt-now">${arrow(cu.wind_direction_10m, 40)}<div><b class="hmt-big">${windWords(cu.wind_direction_10m, cu.wind_speed_10m)}</b><span>Gusts ${speed(cu.wind_gusts_10m)}. ${temp(cu.temperature_2m)}, ${esc(sky(cu.weather_code))}. Rain chance ${h.precipitation_probability[i] ?? 0}% this hour.</span><span>${pressure(h, i)}</span></div></div>
    <p class="hmt-tip"><b>Wind from ${compass8(cu.wind_direction_10m)}: approach from the ${compass8(cu.wind_direction_10m + 180)}</b> <span class="hmm-cert tip">Tip</span><br><small>Opinion. Keep the wind in your face. Thermals rise in the morning sun and sink in the evening, so check again on the slope.</small></p>
    <div class="hmt-hours" aria-label="Wind for the next 12 hours">${hours.join('')}</div>
    <p class="hmm-muted">Forecast from Open-Meteo. Arrows point the way the wind blows.</p>`;
}
