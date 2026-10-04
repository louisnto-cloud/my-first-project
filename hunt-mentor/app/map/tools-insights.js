/* Hunt Map plugin: Insights for the map centre or any point (H.insightsAt([lng, lat], name)).
   MU (Management Unit) and region by point in polygon on the MU layer, legal light today from the app's sun times
   (window.HuntMentor.sunEvent, the same NOAA method as Field Mode), moon phase, wind for the next 12 hours (tools-wind.js),
   an approach tip (opinion), and the regs.json rows for that region with certainty badges.
   Load after tools-wind.js (it uses H.wx). Everything but the wind works offline. */
import { esc, compass8 } from './util.js';
import * as layers from './layers.js';

let H, map;
const MENTOR = () => (window.HuntMentor && window.HuntMentor.mentorUrl) || ''; // app.js MENTOR_URL
const BANNER = '<div class="hmm-banner">Study aid only. The official regulations are the law.</div>';

export default function init(api) {
  H = api; map = H.map;
  H.insightsAt = insightsAt;
  H.setBarAction('insights', () => insightsAt());
}

// ---------- moon (mean synodic month from the new moon of 6 January 2000, 18:14 UTC; good to about a day) ----------
export function moon(date = new Date()) {
  const syn = 29.530588853, age = ((((date - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % syn) + syn) % syn;
  const lit = Math.round(((1 - Math.cos((2 * Math.PI * age) / syn)) / 2) * 100);
  const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  return { age, lit, name: names[Math.round((age / syn) * 8) % 8] };
}

// ---------- legal light (reuses the app's sun times and the hours in regs.json) ----------
function lightHtml(lat, lng) {
  const S = window.HuntMentor || {}, hours = window.HM && window.HM.regs && window.HM.regs.hours, cert = H.ui.cert;
  if (!S.sunEvent || !hours) return '<p><span class="hmm-verify">VERIFY</span> Legal light needs the app data. Open the app once with signal.</p>';
  const tz = S.TZ || 'America/Vancouver';
  // today's date where the map is (Pacific time), as a local noon Date, the way Field Mode calls sunEvent
  const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: tz }).split('-').map(Number);
  const day = new Date(y, m - 1, d, 12);
  const rise = S.sunEvent(day, lat, lng, true), set = S.sunEvent(day, lat, lng, false), hhmm = S.hhmm;
  const add = (t, min) => (t ? new Date(+t + min * 6e4) : null);
  const row = (label, h) => (h && h.beforeSunriseMin != null && rise && set
    ? `<div class="hmm-kv"><span>${label}</span><b>${hhmm(add(rise, -h.beforeSunriseMin))} to ${hhmm(add(set, h.afterSunsetMin))}</b>${cert(h.certainty)}</div>`
    : `<div class="hmm-kv"><span>${label}</span><span class="hmm-verify">VERIFY</span></div>`);
  return `<div class="hmm-kv"><span>Sunrise</span><b>${hhmm(rise)}</b></div><div class="hmm-kv"><span>Sunset</span><b>${hhmm(set)}</b></div>
    ${row('Big game and upland birds', hours.bigGame)}${row('Ducks and geese', hours.migratory)}
    <p class="hmm-muted">Worked out on your phone for this spot, Pacific time. ${esc((hours.bigGame && hours.bigGame.text) || '')} ${esc((hours.migratory && hours.migratory.text) || '')}</p>`;
}

// ---------- regs.json rows for a region ----------
function regionRows(n, muId) {
  const R = window.HM && window.HM.regs, cert = H.ui.cert;
  if (!R) return '<p><span class="hmm-verify">VERIFY</span> The rules data is not loaded.</p>';
  const re = new RegExp(`\\bRegions? (?:[\\d ,]*(?:and|to) )?[\\d ,]*\\b${n}\\b`, 'i');
  const rows = R.items.filter((r) => re.test(r.label) || new RegExp(`R${n}$`).test(r.group) || new RegExp(`^r${n}[a-z]`).test(r.key)
    || (muId && `${r.label} ${r.value || ''}`.includes(`MU ${muId}`)));
  if (!rows.length) return '<p class="hmm-muted">No rows for this region in the app data yet. Check the official synopsis for this region.</p>';
  return rows.map((r) => `<div class="hmw-reg"><b>${esc(r.label)}</b><p>${r.value ? esc(r.value) : '<span class="hmm-verify">VERIFY</span>'}</p>${r.note ? `<p class="hmm-muted">${esc(r.note)}</p>` : ''}
    <small>${cert(r.certainty)} ${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.source)}</a>` : esc(r.source || '')}${r.page ? `, ${esc(r.page)}` : ''}. Checked ${esc(r.checked || R.lastChecked || '')}.</small></div>`).join('');
}

/** Insights for a point (default: the map centre). */
export async function insightsAt(p, name) {
  if (!p) { const c = map.getCenter(); p = [c.lng, c.lat]; }
  const [lng, lat] = p;
  const body = H.openSheet({ title: name ? `Insights: ${name}` : 'Insights', bar: 'insights', tall: true, html: '<p class="hmm-muted">Checking this spot</p>' });
  const [elev, mu] = await Promise.all([H.elevationAt(p).catch(() => null), layers.muAt(p).catch(() => ({ state: 'error' }))]);
  if (H.els.sheetB !== body || H.els.sheet.hidden) return;
  let muHtml, n = null;
  if (mu && mu.state === 'ok') {
    n = (String(mu.id).match(/^(\d{1,2})-/) || String(mu.region || '').match(/Region (\d{1,2})/) || [])[1] || null;
    muHtml = `<div class="hmm-kv"><span>MU (Management Unit)</span><b>${esc(mu.id || 'not listed')}</b></div>${mu.region ? `<div class="hmm-kv"><span>Region</span><b>${esc(mu.region)}</b></div>` : ''}
      <p class="hmm-muted">${esc(mu.source || '')} Near a boundary? Check the official MU map.</p>`;
  } else if (mu && mu.state === 'outside') muHtml = '<p>Not inside a MU (Management Unit) in the map data.</p>';
  else muHtml = '<p>The MU (Management Unit) layer could not be read here. Check the Rule Book for this area.</p>';
  const sessions = (window.HM && window.HM.sessions) || [];
  const rb = (n === '3' || n === '8') && sessions.find((s) => s.id === `rb-region-${n}`);
  const mo = moon();
  body.innerHTML = `
    <p class="hmm-muted">${name ? '' : 'Map centre, '}${esc(H.units.coord(lng, lat))}${elev != null ? `, ${H.units.elev(Math.round(elev))}` : ''}</p>
    ${BANNER}
    <h3 class="hmm-h">Where you are</h3>${muHtml}
    <h3 class="hmm-h">Legal light today</h3>${lightHtml(lat, lng)}
    <div class="hmm-kv"><span>Moon</span><b>${mo.name}, ${mo.lit}% lit</b></div>
    <h3 class="hmm-h">Wind and weather</h3><div data-out="wx"><p class="hmm-muted">Getting the forecast</p></div>
    <h3 class="hmm-h">${n ? `Rules for Region ${esc(n)}` : 'Rules for this area'}</h3>
    ${n ? regionRows(n, mu.id) : '<p class="hmm-muted">Once the MU is found, the rules for its region show here.</p>'}
    <div class="hmm-btnrow">${rb ? `<a class="hmm-btn2" href="#/s/${esc(rb.id)}">${esc(rb.title)}</a>` : ''}<a class="hmm-btn2" href="#/field/light">Full legal light table</a><a class="hmm-btn2" href="#/sources">All rules data</a>${MENTOR() ? `<a class="hmm-btn2" data-ask-mentor href="${esc(MENTOR())}" target="_blank" rel="noopener">Ask the mentor</a>` : ''}</div>`;
  wind(body, lng, lat);
}

async function wind(body, lng, lat) {
  const out = () => { const o = body.querySelector('[data-out="wx"]'); return o && H.els.sheetB === body ? o : null; };
  const W = H.wx;
  if (!W) { const o = out(); if (o) o.innerHTML = '<p class="hmm-muted">Wind is not available.</p>'; return; }
  let f;
  try { f = await W.forecast(lng, lat); } catch (err) { const o = out(); if (o) o.innerHTML = `<p class="hmm-muted">${W.failMsg()}</p>`; return; }
  const o = out(); if (!o) return;
  const v = f.v, cu = v.current, h = v.hourly, i = W.hourIndex(v), hrs = [];
  for (let k = i; k < Math.min(h.time.length, i + 12); k++) {
    const hr = Number(h.time[k].slice(11, 13)), lab = k === i ? 'Now' : `${hr % 12 || 12} ${hr < 12 ? 'am' : 'pm'}`;
    hrs.push(`<div><small>${lab}</small>${W.arrow(h.wind_direction_10m[k], 22)}<b>${compass8(h.wind_direction_10m[k])}</b><small>${W.speed(h.wind_speed_10m[k])}</small><small>${W.temp(h.temperature_2m[k])}</small></div>`);
  }
  const from = cu.wind_direction_10m, calm = cu.wind_speed_10m < 2;
  o.innerHTML = `${W.staleNote(f)}
    <div class="hmw-now">${W.arrow(from, 40)}<div><b class="hmw-big">${W.windWords(from, cu.wind_speed_10m)}</b>
      <span>Gusts ${W.speed(cu.wind_gusts_10m)}. ${W.temp(cu.temperature_2m)}, ${esc(W.sky(cu.weather_code))}. Rain chance ${h.precipitation_probability[i] ?? 0}% this hour.</span><span>${W.pressureTrend(v)}</span></div></div>
    <p class="hmw-tip"><span class="hmm-cert tip">Tip</span> <b>${calm ? 'Calm now: thermals decide where your scent goes' : `Wind from ${compass8(from)}: approach from the ${compass8(from + 180)}`}</b><br>
      <small>Opinion. Walk into the wind so your scent blows away from the animals. Thermals rise as the sun warms a slope and sink in the evening, so check again on the slope.</small></p>
    <h3 class="hmm-h">Wind, next 12 hours</h3>
    <div class="hmw-hours" role="list" aria-label="Wind for the next 12 hours">${hrs.join('')}</div>
    <p class="hmm-muted">Arrows point the way the wind blows. ${W.ATTRIB}</p>`;
}
