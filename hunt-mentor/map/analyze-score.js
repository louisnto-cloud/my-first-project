/* Area analysis: pure scoring maths (no DOM, no network). Used by tools-analyze.js on the main thread or in
   analyze-worker.js, and by the node unit tests (scripts/analyze-score.test.mjs).
   It is a habitat scoring model, not a prediction: each cell of the view gets a "habitat match" from how well its
   terrain fits what the species model (data/analyze/species-model.json) says for a month and a time block.
   Factors (each 0 to 1): elevation band for the month, slope trapezoid, aspect weights, sun or shade at the block's
   sun position (with simple horizon shading), landform from relative elevation (TPI, topographic position index),
   distance to water and to roads (only when the map's vector tiles are loaded). Combined with a weighted geometric
   mean, then normalised 0 to 100 within the view (relative, never absolute). */

export const BLOCKS = ['dawn', 'morning', 'midday', 'afternoon', 'dusk'];
export const DIR8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const LANDFORMS = ['valley', 'draw', 'bench', 'slope', 'ridge']; // 'slope' (open hillside) only matches "any"
export const FACTOR_W = { elev: 1.5, slope: 1, aspect: 1, sun: 0.8, water: 1, road: 0.6, terrain: 0.8 };
export const FLOOR = 0.03; // a factor of 0 still leaves a trace, so a cell is ranked, not erased
export const FLAT_DEG = 5; // below this the ground has no real facing
export const ELEV_SOFT = 300; // metres outside the band where the elevation match fades to 0
const D2R = Math.PI / 180, R2D = 180 / Math.PI;

/** Slope trapezoid [lo_ok, best_lo, best_hi, hi_ok]: 0 outside lo_ok..hi_ok, 1 inside best_lo..best_hi, linear between. */
export function trapezoid(x, t) {
  if (!Array.isArray(t) || t.length !== 4 || !(x === x)) return 1;
  const [a, b, c, d] = t;
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return b === a ? 1 : (x - a) / (b - a);
  return d === c ? 1 : (d - x) / (d - c);
}

/** Aspect weight from the 8 direction weights, linear between neighbours. Flat ground: the mean weight. */
export function aspectWeight(aspectDeg, slopeDeg, w) {
  if (!w) return 1;
  const v = DIR8.map((k) => (typeof w[k] === 'number' ? w[k] : 1));
  if (!(slopeDeg >= FLAT_DEG) || !(aspectDeg === aspectDeg)) return v.reduce((s, x) => s + x, 0) / 8;
  const a = (((aspectDeg % 360) + 360) % 360) / 45, i = Math.floor(a) % 8, f = a - Math.floor(a);
  return v[i] * (1 - f) + v[(i + 1) % 8] * f;
}

/** Cosine of the sun's angle to the ground's normal (0 or less: the slope faces away or the sun is down). */
export function incidence(slopeDeg, aspectDeg, sunAlt, sunAz) {
  if (!(sunAlt > 0)) return 0;
  const s = slopeDeg * D2R, al = sunAlt * D2R, asp = (aspectDeg === aspectDeg ? aspectDeg : 0) * D2R;
  return Math.cos(s) * Math.sin(al) + Math.sin(s) * Math.cos(al) * Math.cos(sunAz * D2R - asp);
}

/** Sun or shade preference. inc: incidence; shadow: true when a ridge blocks the sun. */
export function sunFactor(pref, inc, shadow) {
  if (pref !== 'sun' && pref !== 'shade') return 1;
  const lit = inc > 0.05 && !shadow, k = Math.max(0, Math.min(1, inc));
  if (pref === 'sun') return lit ? 0.5 + 0.5 * k : 0.2;
  return lit ? Math.max(0.2, 1 - k) : 1;
}

/** Elevation band [min, max] in metres: 1 inside, fading to 0 at ELEV_SOFT outside. */
export function elevFactor(e, band) {
  if (!Array.isArray(band) || band.length !== 2 || !(e === e)) return 1;
  const d = e < band[0] ? band[0] - e : e > band[1] ? e - band[1] : 0;
  return Math.max(0, 1 - d / ELEV_SOFT);
}

/** Distance to water [best_max, ok_max]: 1 up to best_max, down to 0.3 at ok_max, 0.1 beyond. */
export function waterFactor(d, wm) {
  if (!Array.isArray(wm) || wm.length !== 2 || !(d === d)) return 1;
  const [best, ok] = wm;
  if (d <= best) return 1;
  if (d >= ok) return 0.1;
  return 1 - 0.7 * ((d - best) / Math.max(1, ok - best));
}

/** Roads (hunting pressure): 1 at or beyond the preferred minimum distance, 0.3 right on a road. */
export function roadFactor(d, minM) {
  if (!(minM > 0) || !(d === d)) return 1;
  return d >= minM ? 1 : 0.3 + 0.7 * (d / minM);
}

/** Landform preference: 1 for a match, "any" or no preference; 0.45 otherwise. */
export function terrainFactor(cls, pref) {
  if (!pref || pref === 'any') return 1;
  return LANDFORMS[cls] === pref ? 1 : 0.45;
}

/** Weighted geometric mean of [{ f, w }]; each f floored at FLOOR. No factors: 1. */
export function combine(parts) {
  let s = 0, ws = 0;
  for (const p of parts) { if (!(p.w > 0)) continue; s += p.w * Math.log(Math.max(FLOOR, Math.min(1, p.f))); ws += p.w; }
  return ws ? Math.exp(s / ws) : 1;
}

/** Min to max normalisation to 0..100 over finite values (NaN stays NaN). All equal and above 0: 100. */
export function normalise(arr) {
  let lo = Infinity, hi = -Infinity;
  for (const v of arr) { if (v === v) { if (v < lo) lo = v; if (v > hi) hi = v; } }
  const out = new Float32Array(arr.length);
  const span = hi - lo;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    out[i] = !(v === v) ? NaN : span > 1e-9 ? ((v - lo) / span) * 100 : hi > 0 ? 100 : 0;
  }
  return out;
}

/** Block settings for a month: base blocks merged with month_overrides[month].blocks (aspect weights merged key by key). */
export function blockModel(sp, month) {
  const m = String(month), ov = (sp.month_overrides && sp.month_overrides[m]) || null, out = {};
  for (const b of Object.keys(sp.blocks || {})) {
    const base = sp.blocks[b] || {}, part = ov && ov.blocks && ov.blocks[b];
    out[b] = part ? Object.assign({}, base, part, base.aspect || part.aspect ? { aspect: Object.assign({}, base.aspect || {}, part.aspect || {}) } : {}) : Object.assign({}, base);
    if (part) out[b].overridden = true;
  }
  return { month: (sp.months && sp.months[m]) || null, blocks: out, note: ov && ov.note ? ov.note : '' };
}

/** Time blocks from sun times (Date or ms). firstLight and lastLight: sun 6° under the horizon (civil twilight).
    Returns { id: { start, end, mid } } in ms. Dawn: first light to 1 h after sunrise. Dusk: 1 h before sunset to last light.
    Midday: solar noon plus or minus 90 min. Morning and afternoon fill the gaps. */
export function blockWindows(rise, set, firstLight, lastLight) {
  const r = +rise, s = +set, fl = firstLight ? +firstLight : r - 30 * 6e4, ll = lastLight ? +lastLight : s + 30 * 6e4;
  const noon = (r + s) / 2, H = 6e4 * 60;
  const dawnEnd = r + H, duskStart = s - H;
  let midS = noon - 1.5 * H, midE = noon + 1.5 * H;
  if (midS < dawnEnd) midS = dawnEnd + (noon - dawnEnd) / 2; // very short days: keep some morning
  if (midE > duskStart) midE = duskStart - (duskStart - noon) / 2;
  const w = { dawn: [fl, dawnEnd], morning: [dawnEnd, midS], midday: [midS, midE], afternoon: [midE, duskStart], dusk: [duskStart, ll] };
  const out = {};
  for (const [k, [a, b]] of Object.entries(w)) {
    // the sun position for dawn and dusk is taken in daylight (30 min after sunrise, 30 min before sunset): that is when sun or shade differs
    const mid = k === 'dawn' ? r + 30 * 6e4 : k === 'dusk' ? s - 30 * 6e4 : (a + b) / 2;
    out[k] = { start: a, end: b, mid };
  }
  return out;
}

/** Two pass chamfer distance (metres) to the nearest set cell of mask (Uint8Array nx*ny). Nothing set: all Infinity. */
export function distanceField(mask, nx, ny, cell) {
  const d = new Float32Array(nx * ny), D1 = cell, D2 = cell * Math.SQRT2;
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : Infinity;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i; let v = d[k];
    if (i > 0 && d[k - 1] + D1 < v) v = d[k - 1] + D1;
    if (j > 0) {
      if (d[k - nx] + D1 < v) v = d[k - nx] + D1;
      if (i > 0 && d[k - nx - 1] + D2 < v) v = d[k - nx - 1] + D2;
      if (i < nx - 1 && d[k - nx + 1] + D2 < v) v = d[k - nx + 1] + D2;
    }
    d[k] = v;
  }
  for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) {
    const k = j * nx + i; let v = d[k];
    if (i < nx - 1 && d[k + 1] + D1 < v) v = d[k + 1] + D1;
    if (j < ny - 1) {
      if (d[k + nx] + D1 < v) v = d[k + nx] + D1;
      if (i < nx - 1 && d[k + nx + 1] + D2 < v) v = d[k + nx + 1] + D2;
      if (i > 0 && d[k + nx - 1] + D2 < v) v = d[k + nx - 1] + D2;
    }
    d[k] = v;
  }
  return d;
}

/** Box mean of a grid over radius r cells (integral image), ignoring NaN. */
function boxMean(a, nx, ny, r) {
  const W = nx + 1, S = new Float64Array(W * (ny + 1)), C = new Float64Array(W * (ny + 1)), out = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = a[j * nx + i], ok = v === v, k = (j + 1) * W + i + 1;
    S[k] = (ok ? v : 0) + S[k - 1] + S[k - W] - S[k - W - 1];
    C[k] = (ok ? 1 : 0) + C[k - 1] + C[k - W] - C[k - W - 1];
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x0 = Math.max(0, i - r), x1 = Math.min(nx, i + r + 1), y0 = Math.max(0, j - r), y1 = Math.min(ny, j + r + 1);
    const s = S[y1 * W + x1] - S[y0 * W + x1] - S[y1 * W + x0] + S[y0 * W + x0];
    const c = C[y1 * W + x1] - C[y0 * W + x1] - C[y1 * W + x0] + C[y0 * W + x0];
    out[j * nx + i] = c ? s / c : NaN;
  }
  return out;
}

/** Slope (degrees), aspect (degrees from north, the way the ground faces downhill) and landform class per cell.
    elev: Float32Array nx*ny (row 0 = north), cell: metres. */
export function terrain(elev, nx, ny, cell) {
  const n = nx * ny, slope = new Float32Array(n), aspect = new Float32Array(n), land = new Uint8Array(n);
  const at = (i, j) => elev[Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    const iL = Math.max(0, i - 1), iR = Math.min(nx - 1, i + 1), jU = Math.max(0, j - 1), jD = Math.min(ny - 1, j + 1);
    const gx = (at(iR, j) - at(iL, j)) / ((iR - iL || 1) * cell); // rise per metre going east
    const gs = (at(i, jD) - at(i, jU)) / ((jD - jU || 1) * cell); // rise per metre going south
    if (!(gx === gx && gs === gs)) { slope[k] = NaN; aspect[k] = NaN; continue; }
    slope[k] = Math.atan(Math.sqrt(gx * gx + gs * gs)) * R2D;
    aspect[k] = (Math.atan2(-gx, gs) * R2D + 360) % 360;
  }
  const rS = Math.max(2, Math.round(300 / cell)), rL = Math.max(rS + 1, Math.round(900 / cell));
  const mS = boxMean(elev, nx, ny, rS), mL = boxMean(elev, nx, ny, rL);
  const tpi = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const e = elev[k], t = e - mS[k], tl = e - mL[k], s = slope[k];
    tpi[k] = t;
    if (!(e === e)) { land[k] = 255; continue; }
    if (t > 12) land[k] = 4; // ridge
    else if (t < -12) land[k] = s < 6 ? 0 : 1; // valley floor or draw
    else if (s < 10) land[k] = tl < -30 ? 0 : 2; // flat: valley floor when low in the big picture, else a bench
    else land[k] = 3; // open hillside
  }
  return { slope, aspect, land, tpi };
}

/** Ridge shadow: walks toward the sun up to maxSteps cells; true when the ground ahead rises above the sun's angle. */
export function shadowed(elev, nx, ny, cell, i, j, alt, az, maxSteps = 60) {
  if (!(alt > 0)) return true;
  const e0 = elev[j * nx + i], tanA = Math.tan(alt * D2R), dx = Math.sin(az * D2R), dy = -Math.cos(az * D2R);
  for (let k = 2; k <= maxSteps; k++) {
    const x = Math.round(i + dx * k), y = Math.round(j + dy * k);
    if (x < 0 || y < 0 || x >= nx || y >= ny) return false;
    const e = elev[y * nx + x];
    if (e === e && (e - e0) / (k * cell) > tanA) return true;
  }
  return false;
}

/** Top zones: highest 3 by 3 mean, at least minDist metres apart. Returns [{ i, j, pct }]. */
export function topZones(pct, nx, ny, cell, count = 3, minDist = 400, allow = null) {
  const sm = boxMean(pct, nx, ny, 1), order = [];
  for (let k = 0; k < sm.length; k++) if (sm[k] === sm[k] && pct[k] === pct[k] && (!allow || allow[k])) order.push(k);
  order.sort((a, b) => sm[b] - sm[a]);
  const out = [], md2 = (minDist / cell) ** 2;
  for (const k of order) {
    const i = k % nx, j = (k - i) / nx;
    if (out.some((z) => (z.i - i) ** 2 + (z.j - j) ** 2 < md2)) continue;
    out.push({ i, j, pct: Math.round(sm[k]) });
    if (out.length >= count) break;
  }
  return out;
}

const pctl = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))] : NaN);

/** The whole area: per block scores (0 to 100), top zones, and what the best cells look like.
    input: { elev, nx, ny, cell, water (distance m or null), road (distance m or null), blocks: { id: params }, sun: { id: { alt, az } }, band: [min, max] or null,
      openWater (Uint8Array, 1 = lake or river surface) and landOnly (true: those cells get no score), zoneMask (Uint8Array, 1 = a top zone may sit here) } */
export function analyse(input) {
  const { elev, nx, ny, cell, blocks, sun } = input, n = nx * ny;
  const band = Array.isArray(input.band) ? input.band : null;
  const T = terrain(elev, nx, ny, cell);
  const out = { nx, ny, cell, slope: T.slope, aspect: T.aspect, land: T.land, blocks: {}, area: areaStats(elev, T.slope, band) };
  for (const id of Object.keys(blocks)) {
    const p = blocks[id] || {}, s = sun && sun[id], raw = new Float32Array(n), lit = new Uint8Array(n);
    const used = { elev: !!band, slope: Array.isArray(p.slope_deg), aspect: !!p.aspect, sun: (p.sun === 'sun' || p.sun === 'shade') && !!s,
      water: Array.isArray(p.water_m) && !!input.water, road: p.road_m > 0 && !!input.road, terrain: !!p.terrain && p.terrain !== 'any' };
    // a factor the model marks with certainty 0 (no source) stays neutral
    if (p.factors) for (const f of ['slope', 'aspect', 'sun', 'water', 'road', 'terrain']) if (p.factors[f] === 0) used[f] = false;
    for (let k = 0; k < n; k++) {
      const e = elev[k];
      if (!(e === e) || !(T.slope[k] === T.slope[k]) || (input.landOnly && input.openWater && input.openWater[k])) { raw[k] = NaN; continue; }
      const i = k % nx, j = (k - i) / nx, parts = [];
      let inc = 0, sh = true;
      if (s) { inc = incidence(T.slope[k], T.aspect[k], s.alt, s.az); sh = inc <= 0.05 || shadowed(elev, nx, ny, cell, i, j, s.alt, s.az); if (!sh) lit[k] = 1; }
      if (used.elev) parts.push({ f: elevFactor(e, band), w: FACTOR_W.elev });
      if (used.slope) parts.push({ f: trapezoid(T.slope[k], p.slope_deg), w: FACTOR_W.slope });
      if (used.aspect) parts.push({ f: aspectWeight(T.aspect[k], T.slope[k], p.aspect), w: FACTOR_W.aspect });
      if (used.sun) parts.push({ f: sunFactor(p.sun, inc, sh), w: FACTOR_W.sun });
      if (used.water) parts.push({ f: waterFactor(input.water[k], p.water_m), w: FACTOR_W.water });
      if (used.road) parts.push({ f: roadFactor(input.road[k], p.road_m), w: FACTOR_W.road });
      if (used.terrain) parts.push({ f: terrainFactor(T.land[k], p.terrain), w: FACTOR_W.terrain });
      raw[k] = combine(parts);
    }
    const pct = normalise(raw);
    out.blocks[id] = { pct, used, zones: topZones(pct, nx, ny, cell, 3, 400, input.zoneMask || null), best: describe(pct, elev, T, lit), litShare: share(lit, raw) };
  }
  return out;
}
const share = (lit, raw) => { let a = 0, b = 0; for (let k = 0; k < raw.length; k++) if (raw[k] === raw[k]) { b++; a += lit[k]; } return b ? a / b : 0; };

/** What the top 10% of cells look like: elevation range, main facing, main landform, sunlit share. */
export function describe(pct, elev, T, lit) {
  const idx = [];
  for (let k = 0; k < pct.length; k++) if (pct[k] === pct[k]) idx.push(k);
  idx.sort((a, b) => pct[b] - pct[a]);
  const top = idx.slice(0, Math.max(1, Math.round(idx.length * 0.1)));
  if (!top.length || !(pct[top[0]] === pct[top[0]])) return null;
  const el = top.map((k) => elev[k]).sort((a, b) => a - b);
  const asp = new Array(8).fill(0), lf = new Array(LANDFORMS.length).fill(0); let flat = 0, sl = 0, li = 0;
  for (const k of top) {
    if (T.slope[k] < FLAT_DEG) flat++; else asp[Math.round(T.aspect[k] / 45) % 8]++;
    if (T.land[k] < LANDFORMS.length) lf[T.land[k]]++;
    sl += T.slope[k]; li += lit ? lit[k] : 0;
  }
  const ai = asp.indexOf(Math.max(...asp)), li2 = lf.indexOf(Math.max(...lf));
  return { elev: [pctl(el, 0.1), pctl(el, 0.9)], aspect: flat > top.length / 2 ? 'flat' : DIR8[ai], aspectShare: asp[ai] / top.length,
    landform: LANDFORMS[li2], landShare: lf[li2] / top.length, slope: sl / top.length, lit: li / top.length };
}

/** Area facts: elevation min, max, share inside the month band, and share per slope class. */
export function areaStats(elev, slope, band) {
  let lo = Infinity, hi = -Infinity, n = 0, inBand = 0;
  const cls = [0, 0, 0, 0, 0]; // under 15, 15 to 25, 25 to 30, 30 to 45, over 45 (tools-terrain.js SLOPE_CLASSES)
  for (let k = 0; k < elev.length; k++) {
    const e = elev[k]; if (!(e === e)) continue;
    n++; if (e < lo) lo = e; if (e > hi) hi = e;
    if (band && e >= band[0] && e <= band[1]) inBand++;
    const s = slope[k]; if (s === s) cls[s < 15 ? 0 : s < 25 ? 1 : s < 30 ? 2 : s < 45 ? 3 : 4]++;
  }
  const tot = cls.reduce((a, b) => a + b, 0) || 1;
  return { min: lo, max: hi, cells: n, inBand: band && n ? inBand / n : null, slopeShare: cls.map((c) => c / tot) };
}

/** analyse() with water and road masks drawn on a padded grid ({ mask, nx, ny, pad }): distance fields first, cropped to the view. */
export function analyseWithMasks(input) {
  const crop = (d, M) => {
    const out = new Float32Array(input.nx * input.ny);
    for (let j = 0; j < input.ny; j++) for (let i = 0; i < input.nx; i++) out[j * input.nx + i] = d[(j + M.pad) * M.nx + i + M.pad];
    return out;
  };
  const W = input.wm, R = input.rm;
  if (W) input.water = crop(distanceField(W.mask, W.nx, W.ny, input.cell), W);
  if (R) input.road = crop(distanceField(R.mask, R.nx, R.ny, input.cell), R);
  return analyse(input);
}

/** Certainty of one block's match (0 to 100), from the model's per factor certainty ("factors": 0 = no source, left neutral).
    Weighted mean of the sourced factors (elevation band included), scaled down when few factors are sourced
    (0.6 + 0.4 x the sourced share of the weight), and never above the block's own cert. Without "factors": the block cert. */
export function blockCertainty(p, elevCert) {
  if (!p || !(p.cert > 0)) return 0;
  if (!p.factors) return Math.round(Math.min(p.cert, elevCert > 0 ? elevCert : p.cert));
  const keys = ['slope', 'aspect', 'sun', 'water', 'road', 'terrain'];
  const list = keys.map((k) => ({ c: +p.factors[k] || 0, w: FACTOR_W[k] })).concat([{ c: elevCert > 0 ? elevCert : 0, w: FACTOR_W.elev }]);
  const all = list.reduce((s, x) => s + x.w, 0), src = list.filter((x) => x.c > 0);
  if (!src.length) return 0;
  const sw = src.reduce((s, x) => s + x.w, 0), mean = src.reduce((s, x) => s + x.c * x.w, 0) / sw;
  return Math.round(Math.min(p.cert, mean * (0.6 + 0.4 * (sw / all))));
}
