/* Hunt Map shared helpers: preferences, units, coordinates, tile maths, geometry. No DOM state. */

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmtNum = (n, d = 0) => Number(n).toLocaleString('en-CA', { maximumFractionDigits: d, minimumFractionDigits: d });

// ---------- preferences (localStorage key hm.map.v1, separate from the app's hm.v1) ----------
export const PREFS_KEY = 'hm.map.v1';
export const prefs = {};
export function loadPrefs() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { p = {}; }
  Object.keys(prefs).forEach((k) => delete prefs[k]);
  Object.assign(prefs, { base: 'topo', is3d: false, exag: 1.3, units: 'metric', coords: 'dd', satContours: true, hillshade: true, layers: {}, month: 0, species: 'all', offline: [] }, p);
  return prefs;
}
export function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* storage blocked */ } }
loadPrefs();

// ---------- tiny event hub ----------
export function hub() {
  const fns = {};
  return {
    on(ev, fn) { (fns[ev] = fns[ev] || []).push(fn); return () => { fns[ev] = fns[ev].filter((f) => f !== fn); }; },
    emit(ev, ...a) { (fns[ev] || []).slice().forEach((f) => { try { f(...a); } catch (err) { console.warn(err); } }); },
  };
}

export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function throttle(fn, ms) {
  let last = 0, t = null;
  return (...a) => {
    const now = Date.now(), wait = ms - (now - last);
    if (wait <= 0) { last = now; fn(...a); } else if (!t) t = setTimeout(() => { t = null; last = Date.now(); fn(...a); }, wait);
  };
}

// ---------- units ----------
const FT = 3.28084;
export const units = {
  get system() { return prefs.units === 'imperial' ? 'imperial' : 'metric'; },
  get coords() { return prefs.coords || 'dd'; },
  /** Distance in metres to text: "850 m", "2.4 km" or "2,790 ft", "1.5 mi". */
  dist(m) {
    if (m == null || isNaN(m)) return '';
    if (units.system === 'imperial') { const ft = m * FT; return ft < 1000 ? `${fmtNum(ft)} ft` : `${fmtNum(m / 1609.344, m < 16093 ? 2 : 1)} mi`; }
    return m < 1000 ? `${fmtNum(m)} m` : `${fmtNum(m / 1000, m < 10000 ? 2 : 1)} km`;
  },
  /** Elevation in metres to text: "1,234 m" or "4,049 ft". */
  elev(m) { if (m == null || isNaN(m)) return ''; return units.system === 'imperial' ? `${fmtNum(m * FT)} ft` : `${fmtNum(m)} m`; },
  /** Area in square metres to text: "12.4 ha" or "30.6 acres". */
  area(m2) { if (m2 == null || isNaN(m2)) return ''; return units.system === 'imperial' ? `${fmtNum(m2 / 4046.856, 1)} acres` : `${fmtNum(m2 / 1e4, 1)} ha`; },
  /** Coordinates in the chosen format (decimal, degrees minutes seconds, UTM). */
  coord(lng, lat, fmt) { return formatCoord(lng, lat, fmt || units.coords); },
};

// ---------- coordinates ----------
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export function formatCoord(lng, lat, fmt) {
  if (fmt === 'dms') return `${dms(lat, 'N', 'S')}, ${dms(lng, 'E', 'W')}`;
  if (fmt === 'utm') { const u = toUTM(lat, lng); return `${u.zone}${u.band} ${Math.round(u.easting)} E ${Math.round(u.northing)} N`; }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
function dms(v, pos, neg) {
  const h = v < 0 ? neg : pos; v = Math.abs(v);
  let d = Math.floor(v), m = Math.floor((v - d) * 60), s = Math.round(((v - d) * 60 - m) * 600) / 10;
  if (s >= 60) { s = 0; m += 1; } if (m >= 60) { m = 0; d += 1; }
  return `${d}°${String(m).padStart(2, '0')}′${s.toFixed(1).padStart(4, '0')}″ ${h}`;
}

// UTM on WGS84 (Snyder). Good to about a metre, plenty for the field.
const A = 6378137, F = 1 / 298.257223563, K0 = 0.9996, E2 = F * (2 - F), EP2 = E2 / (1 - E2);
export function toUTM(lat, lon) {
  const zone = Math.floor((lon + 180) / 6) + 1, lon0 = (zone - 1) * 6 - 180 + 3;
  const p = lat * D2R, l = (lon - lon0) * D2R, sp = Math.sin(p), cp = Math.cos(p), tp = Math.tan(p);
  const N = A / Math.sqrt(1 - E2 * sp * sp), T = tp * tp, C = EP2 * cp * cp, a = cp * l;
  const M = A * ((1 - E2 / 4 - 3 * E2 * E2 / 64 - 5 * E2 ** 3 / 256) * p - (3 * E2 / 8 + 3 * E2 * E2 / 32 + 45 * E2 ** 3 / 1024) * Math.sin(2 * p)
    + (15 * E2 * E2 / 256 + 45 * E2 ** 3 / 1024) * Math.sin(4 * p) - (35 * E2 ** 3 / 3072) * Math.sin(6 * p));
  const easting = K0 * N * (a + (1 - T + C) * a ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * EP2) * a ** 5 / 120) + 500000;
  let northing = K0 * (M + N * tp * (a * a / 2 + (5 - T + 9 * C + 4 * C * C) * a ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * EP2) * a ** 6 / 720));
  if (lat < 0) northing += 1e7;
  const band = 'CDEFGHJKLMNPQRSTUVWXX'[clamp(Math.floor((lat + 80) / 8), 0, 20)];
  return { zone, band, easting, northing };
}
export function fromUTM(zone, easting, northing, south) {
  const x = easting - 500000, y = south ? northing - 1e7 : northing, lon0 = (zone - 1) * 6 - 180 + 3;
  const mu = y / K0 / (A * (1 - E2 / 4 - 3 * E2 * E2 / 64 - 5 * E2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const s1 = Math.sin(p1), c1 = Math.cos(p1), t1 = Math.tan(p1);
  const N1 = A / Math.sqrt(1 - E2 * s1 * s1), T1 = t1 * t1, C1 = EP2 * c1 * c1, R1 = A * (1 - E2) / (1 - E2 * s1 * s1) ** 1.5, D = x / (N1 * K0);
  const lat = p1 - (N1 * t1 / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6 / 720);
  const lon = (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5 / 120) / c1;
  return { lat: lat * R2D, lon: lon0 + lon * R2D };
}

/** Parse typed coordinates. Returns { lat, lon, kind, note } or null. Handles decimal, DMS, degrees and decimal minutes, UTM. */
export function parseCoords(input) {
  const s = String(input).trim().toUpperCase();
  if (!s) return null;
  // UTM: "10U 699000 5637000", "10 699000E 5637000N"
  const u = s.match(/^(\d{1,2})\s*([C-HJ-NP-X])?\s*[, ]\s*(\d{6}(?:\.\d+)?)\s*M?\s*E?\s*[, ]\s*(\d{7}(?:\.\d+)?)\s*M?\s*N?$/);
  if (u) {
    const zone = +u[1]; if (zone < 1 || zone > 60) return null;
    const south = u[2] ? u[2] < 'N' : false;
    const r = fromUTM(zone, +u[3], +u[4], south);
    if (!isFinite(r.lat) || !isFinite(r.lon)) return null;
    return { lat: r.lat, lon: r.lon, kind: 'UTM (Universal Transverse Mercator)' };
  }
  if (!/^[\d\sNSEW.,;:°º˚'′’"″+-]+$/.test(s)) return null;
  const tokens = s.replace(/([NSEW])/g, ' $1 ').replace(/[°º˚'′’"″,;:]/g, ' ').trim().split(/\s+/);
  const groups = []; let g = null;
  for (const t of tokens) {
    if (/^[NSEW]$/.test(t)) {
      if (g && g.nums.length && !g.hemi) { g.hemi = t; g = null; } else { g = { nums: [], hemi: t }; groups.push(g); }
    } else if (/^[+-]?\d+(\.\d+)?$/.test(t)) {
      if (!g) { g = { nums: [], hemi: null }; groups.push(g); }
      g.nums.push(parseFloat(t));
    } else return null;
  }
  let parts = groups.filter((x) => x.nums.length);
  if (parts.length === 1 && !parts[0].hemi && [2, 4, 6].includes(parts[0].nums.length)) {
    const n = parts[0].nums, h = n.length / 2;
    parts = [{ nums: n.slice(0, h), hemi: null }, { nums: n.slice(h), hemi: null }];
  }
  if (parts.length !== 2 || parts.some((p) => p.nums.length > 3)) return null;
  const val = (p) => {
    const [d, m = 0, sec = 0] = p.nums; if (m >= 60 || sec >= 60) return NaN;
    if (p.nums.length > 1 && !Number.isInteger(d)) return NaN;
    let v = Math.abs(d) + m / 60 + sec / 3600; if (d < 0 || p.hemi === 'S' || p.hemi === 'W') v = -v; return v;
  };
  let a = parts[0], b = parts[1];
  if ((a.hemi === 'E' || a.hemi === 'W') || (b.hemi === 'N' || b.hemi === 'S')) [a, b] = [b, a];
  let lat = val(a), lon = val(b), note = '';
  if (!a.hemi && !b.hemi && Math.abs(lat) > 90 && Math.abs(lon) <= 90) [lat, lon] = [lon, lat];
  // BC habit: "50.86 120.27" means west longitude
  if (!b.hemi && lon > 110 && lon < 140 && lat > 47 && lat < 61) { lon = -lon; note = 'Assumed west longitude.'; }
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const kind = a.nums.length === 1 ? 'Decimal degrees' : a.nums.length === 2 ? 'Degrees and decimal minutes' : 'Degrees, minutes, seconds';
  return { lat, lon, kind, note };
}

// ---------- tile maths (Web Mercator, XYZ) ----------
export const lon2x = (lon, z) => ((lon + 180) / 360) * 2 ** z;
export const lat2y = (lat, z) => { const r = lat * D2R; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z; };
export function tileRange(bbox, z) {
  const [w, s, e, n] = bbox, max = 2 ** z - 1;
  return { x0: clamp(Math.floor(lon2x(w, z)), 0, max), x1: clamp(Math.floor(lon2x(e, z)), 0, max), y0: clamp(Math.floor(lat2y(n, z)), 0, max), y1: clamp(Math.floor(lat2y(s, z)), 0, max) };
}
export function countTiles(bbox, z0, z1) {
  let n = 0;
  for (let z = z0; z <= z1; z++) { const r = tileRange(bbox, z); n += (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1); }
  return n;
}

// ---------- geometry ----------
export function haversine(a, b) {
  const dLat = (b[1] - a[1]) * D2R, dLon = (b[0] - a[0]) * D2R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
}
export function bearingTo(a, b) {
  const y = Math.sin((b[0] - a[0]) * D2R) * Math.cos(b[1] * D2R);
  const x = Math.cos(a[1] * D2R) * Math.sin(b[1] * D2R) - Math.sin(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.cos((b[0] - a[0]) * D2R);
  return (Math.atan2(y, x) * R2D + 360) % 360;
}
export const compass8 = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((deg % 360) + 360) % 360 / 45) % 8];
/** Circle polygon (GeoJSON ring) around [lon, lat] with radius in metres. */
export function circleRing(c, r, n = 64) {
  const out = [], lat = c[1] * D2R, dLat = r / 6371008.8 * R2D, dLon = dLat / Math.cos(lat);
  for (let i = 0; i <= n; i++) { const t = (i / n) * 2 * Math.PI; out.push([c[0] + dLon * Math.cos(t), c[1] + dLat * Math.sin(t)]); }
  return out;
}
function inRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Point in Polygon or MultiPolygon geometry. */
export function pointInGeom(pt, g) {
  if (!g) return false;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return polys.some((rings) => rings.length && inRing(pt, rings[0]) && !rings.slice(1).some((h) => inRing(pt, h)));
}
export function bboxOf(geojson) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (c) => { if (typeof c[0] === 'number') { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); } else c.forEach(walk); };
  const geoms = geojson.type === 'FeatureCollection' ? geojson.features.map((f) => f.geometry) : geojson.type === 'Feature' ? [geojson.geometry] : [geojson];
  geoms.forEach((g) => { if (!g) return; if (g.type === 'GeometryCollection') g.geometries.forEach((x) => walk(x.coordinates)); else walk(g.coordinates); });
  return isFinite(b[0]) ? b : null;
}
export const bboxIntersects = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
export function padBbox(b, f) { const dx = (b[2] - b[0]) * f, dy = (b[3] - b[1]) * f; return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy]; }

// ---------- months ----------
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Months as numbers 1 to 12 from [11,12,1], ["Nov","Dec"], "11-4", "Nov to Apr" or "11,12,1". Empty array when unknown. */
export function parseMonths(v) {
  if (v == null || v === '') return [];
  if (typeof v === 'string' && v.trim().startsWith('[')) { try { v = JSON.parse(v); } catch (e) { /* plain text */ } }
  const one = (t) => { t = String(t).trim().toLowerCase(); if (/^\d{1,2}$/.test(t)) return +t; const i = MONTHS.indexOf(t.slice(0, 3)); return i >= 0 ? i + 1 : 0; };
  const out = new Set();
  const add = (a, b) => { if (!a) return; if (!b) { out.add(a); return; } for (let m = a, k = 0; k < 12; k++) { out.add(m); if (m === b) break; m = (m % 12) + 1; } };
  const list = Array.isArray(v) ? v : String(v).split(/[,;/]|\band\b/i);
  for (const part of list) {
    if (typeof part === 'number') { add(part); continue; }
    const r = String(part).split(/\s*(?:-|–|\bto\b)\s*/i);
    if (r.length === 2) add(one(r[0]), one(r[1])); else add(one(r[0]));
  }
  return [...out].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
}
