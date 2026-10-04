/* Hunt Map tools: shared pieces (waypoint icons, colours, geometry, wind and weather from Open-Meteo, moon). No DOM state. */
import { haversine, esc } from './util.js';

const D2R = Math.PI / 180, R2D = 180 / Math.PI, RE = 6371008.8;

// ---------- waypoint icons: SVG path data on a 24 by 24 grid, drawn as white strokes on a coloured disc ----------
export const WPT = [
  ['parking', 'Parking', 'M8.5 19V5h4.6a4.3 4.3 0 0 1 0 8.6H8.5', '#1a73e8'],
  ['camp', 'Camp', 'M3.5 19.5 12 5l8.5 14.5ZM12 19.5l-2.6-5h5.2Z', '#2b9348'],
  ['stand', 'Stand', 'M8 21V9.5M16 21V9.5M8 14h8M8 18h8M5.5 9.5h13V5.5h-13Z', '#e8590c'],
  ['glassing', 'Glassing point', 'M4 15.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M13 15.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M5.5 12.5l2-6.5h2.5v6M18.5 12.5l-2-6.5H14v6M10.5 13h3', '#7b2cbf'],
  ['bed', 'Bed', 'M3.5 15c0-3.3 3.8-5.5 8.5-5.5s8.5 2.2 8.5 5.5-3.8 3.5-8.5 3.5-8.5-.2-8.5-3.5ZM8 14.5h8', '#8a5a2b'],
  ['rub', 'Rub', 'M9.5 3v18M14.5 3v18M9.5 8.5l5 2.5M9.5 12.5l5 2.5', '#8a5a2b'],
  ['scrape', 'Scrape', 'M3.5 18.5h17M6.5 15.5l3-5M11 15.5l3-5M15.5 15.5l3-5M12 4v4', '#8a5a2b'],
  ['tracks', 'Tracks', 'M9.3 4.5c-2.3 3-2.3 7.3 0 9.5 1.3-2.2 1.3-6.7 0-9.5ZM14.7 4.5c2.3 3 2.3 7.3 0 9.5-1.3-2.2-1.3-6.7 0-9.5ZM8 17.5v2M16 17.5v2', '#8a5a2b'],
  ['scat', 'Scat', 'M6.5 15a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M11 10a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M12.5 16.5a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0', '#8a5a2b'],
  ['water', 'Water', 'M12 3.5s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z', '#0b84c6'],
  ['gate', 'Gate', 'M4 4.5v15M20 4.5v15M4 8h16M4 16h16M4 16 20 8', '#5d6152'],
  ['camera', 'Trail camera', 'M4.5 7.5h15v11h-15ZM9 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0M8 7.5V5h3.5v2.5', '#2f3a2b'],
  ['kill', 'Kill', 'M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 3v6M12 15v6M3 12h6M15 12h6', '#d62828'],
  ['blood', 'Blood', 'M11 4.5s5 6 5 9.8a5 5 0 0 1-10 0c0-3.8 5-9.8 5-9.8ZM18 5v3M19.5 11v2', '#b3001b'],
  ['other', 'Other', 'M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8Z', '#e8590c'],
];
export const WPT_BY = Object.fromEntries(WPT.map(([id, label, d, color]) => [id, { id, label, d, color }]));
export const COLORS = [['#e8590c', 'Orange'], ['#d62828', 'Red'], ['#f2c12e', 'Yellow'], ['#2b9348', 'Green'], ['#1a73e8', 'Blue'], ['#7b2cbf', 'Purple'], ['#8a5a2b', 'Brown'], ['#222222', 'Black'], ['#f4f4f4', 'White']];
const ink = (c) => (/^#f/i.test(c) && c.toLowerCase() !== '#f2c12e' ? '#222' : '#fff'); // white disc gets a dark glyph

/** Inline SVG of a waypoint icon on its coloured disc. */
export function wptSvg(icon, color, size = 30) {
  const w = WPT_BY[icon] || WPT_BY.other, c = color || w.color;
  return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="14.5" fill="${esc(c)}" stroke="#fff" stroke-width="2.5"/><g transform="translate(4.6 4.6) scale(.95)" fill="none" stroke="${ink(c)}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="${w.d}"/></g></svg>`;
}
/** Glyph only (white strokes on transparent), drawn on a canvas, for a MapLibre symbol layer. */
export function glyphImage(icon, dark) {
  const w = WPT_BY[icon] || WPT_BY.other, pr = 2, n = 24;
  const c = document.createElement('canvas'); c.width = c.height = n * pr;
  const x = c.getContext('2d'); x.scale(pr, pr);
  x.strokeStyle = dark ? '#222' : '#fff'; x.lineWidth = 2.1; x.lineCap = 'round'; x.lineJoin = 'round';
  x.stroke(new Path2D(w.d));
  return { img: x.getImageData(0, 0, n * pr, n * pr), pixelRatio: pr };
}
/** Arrow pointing up (north), for wind arrows rotated on the map. */
export function arrowImage() {
  const pr = 2, n = 30, c = document.createElement('canvas'); c.width = c.height = n * pr;
  const x = c.getContext('2d'); x.scale(pr, pr);
  x.fillStyle = '#0b4f8a'; x.strokeStyle = '#fff'; x.lineWidth = 2; x.lineJoin = 'round';
  const p = new Path2D('M15 2 24 15h-5.5v13h-7V15H6Z'); x.stroke(p); x.fill(p);
  return { img: x.getImageData(0, 0, n * pr, n * pr), pixelRatio: pr };
}

// ---------- geometry ----------
export function lineLength(cs) { let d = 0; for (let i = 1; i < cs.length; i++) d += haversine(cs[i - 1], cs[i]); return d; }
/** Area of a ring on the sphere, square metres. */
export function ringArea(cs) {
  if (cs.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i], b = cs[(i + 1) % cs.length];
    s += (b[0] - a[0]) * D2R * (2 + Math.sin(a[1] * D2R) + Math.sin(b[1] * D2R));
  }
  return Math.abs(s * RE * RE / 2);
}
export const perimeter = (cs) => (cs.length < 2 ? 0 : lineLength(cs) + (cs.length > 2 ? haversine(cs[cs.length - 1], cs[0]) : 0));
/** Point at a distance (m) and bearing (deg) from [lng, lat]. */
export function dest(p, dist, brg) {
  const d = dist / RE, t = brg * D2R, la = p[1] * D2R, lo = p[0] * D2R;
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(t));
  const lo2 = lo + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [lo2 * R2D, la2 * R2D];
}
/** Scent cone: wedge from p pointing downwind. fromDeg is where the wind comes FROM. Returns { ring, tip, len }. */
export function scentCone(p, fromDeg, kmh) {
  const to = (fromDeg + 180) % 360, len = Math.min(1200, 250 + (kmh || 0) * 35), half = kmh < 5 ? 40 : kmh < 15 ? 25 : 16;
  const ring = [p];
  for (let a = -half; a <= half; a += half / 6) ring.push(dest(p, len, to + a));
  ring.push(p);
  return { ring, tip: dest(p, len * 0.75, to), len, half };
}
/** Evenly spaced samples along a line, n points, each [lng, lat, distanceFromStart]. */
export function sampleLine(cs, n) {
  const total = lineLength(cs), out = [];
  if (cs.length < 2 || !total) return cs.map((c) => [c[0], c[1], 0]);
  let seg = 0, segStart = 0, segLen = haversine(cs[0], cs[1]);
  for (let i = 0; i < n; i++) {
    const want = (total * i) / (n - 1);
    while (seg < cs.length - 2 && segStart + segLen < want) { segStart += segLen; seg++; segLen = haversine(cs[seg], cs[seg + 1]); }
    const f = segLen ? Math.min(1, Math.max(0, (want - segStart) / segLen)) : 0, a = cs[seg], b = cs[seg + 1];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, want]);
  }
  return out;
}
/** Climb and drop in metres with a small dead band so GPS and terrain noise does not add up. */
export function climb(eles, band = 3) {
  let up = 0, down = 0, ref = null;
  for (const e of eles) {
    if (e == null || !isFinite(e)) continue;
    if (ref == null) { ref = e; continue; }
    if (e - ref >= band) { up += e - ref; ref = e; } else if (ref - e >= band) { down += ref - e; ref = e; }
  }
  return { up, down };
}
export function fmtDur(ms) {
  const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min ${String(s % 60).padStart(2, '0')} s`;
}

// ---------- moon (mean synodic month from the new moon of 6 January 2000, 18:14 UTC; good to about a day) ----------
export function moon(date = new Date()) {
  const syn = 29.530588853, age = ((((date - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % syn) + syn) % syn;
  const lit = Math.round(((1 - Math.cos((2 * Math.PI * age) / syn)) / 2) * 100);
  const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  return { age, lit, name: names[Math.round((age / syn) * 8) % 8] };
}

// ---------- Open-Meteo (free, no key, CORS open). Cached for 20 minutes per rounded point. ----------
const cache = new Map();
const TZ = 'America/Vancouver';
export async function forecast(lng, lat) {
  const k = `${lat.toFixed(2)},${lng.toFixed(2)}`, hit = cache.get(k);
  if (hit && Date.now() - hit.t < 20 * 6e4) return hit.v;
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`
    + '&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,pressure_msl,weather_code'
    + '&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,pressure_msl'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant'
    + `&timezone=${encodeURIComponent(TZ)}&forecast_days=3&wind_speed_unit=kmh`;
  const r = await fetch(u, { credentials: 'omit' });
  if (!r.ok) throw new Error(`Weather ${r.status}`);
  const v = await r.json();
  cache.set(k, { t: Date.now(), v });
  return v;
}
/** Current wind at several points in one request: [{ lng, lat, kmh, from }]. */
export async function windAt(points) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${points.map((p) => p[1].toFixed(3)).join(',')}&longitude=${points.map((p) => p[0].toFixed(3)).join(',')}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=${encodeURIComponent(TZ)}`;
  const r = await fetch(u, { credentials: 'omit' });
  if (!r.ok) throw new Error(`Weather ${r.status}`);
  let v = await r.json(); if (!Array.isArray(v)) v = [v];
  return v.map((x, i) => ({ lng: points[i][0], lat: points[i][1], kmh: x.current.wind_speed_10m, from: x.current.wind_direction_10m }));
}
/** Index of the hourly slot for now in an Open-Meteo hourly block (local times). */
export function hourIndex(hourly) {
  const now = new Date().toLocaleString('sv-SE', { timeZone: TZ }).slice(0, 13).replace(' ', 'T');
  const i = hourly.time.findIndex((t) => t.slice(0, 13) === now);
  return i < 0 ? 0 : i;
}
const WMO = [[0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Cloudy'], [45, 'Fog'], [48, 'Fog'], [51, 'Drizzle'], [56, 'Freezing drizzle'], [61, 'Rain'], [66, 'Freezing rain'], [71, 'Snow'], [77, 'Snow grains'], [80, 'Showers'], [85, 'Snow showers'], [95, 'Thunderstorm']];
export function sky(code) { let t = 'Weather'; for (const [c, l] of WMO) if (code >= c) t = l; return t; }
