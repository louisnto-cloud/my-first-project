/* Hunt Map plugin: Area analysis ("Analyze area"). Offline habitat scoring for the map view, by animal, month and time block.
   Not AI and not a prediction: it matches terrain to what the research says (data/analyze/species-model.json) and shows
   a relative "habitat match" (0 to 100 within the view) plus the model certainty from the data.
   Works with no signal where the area's terrain tiles are saved (Offline Maps). No network requests of its own:
   the model file is precached by the service worker; terrain comes from the shared DEM cache (tools-terrain.js demGrid);
   water and roads come from the map's own loaded vector tiles (querySourceFeatures), so that factor is skipped and
   said so when they are not loaded; land checks reuse the area report's layer reader (tools-insights.js nearLayer).
   Maths: analyze-score.js (pure, unit tested), run in analyze-worker.js (module worker) or on the main thread.
   Sets HuntMap.analyze = { open(), run(species, month), last (timings), clear() }. */
import { esc, clamp, lon2x, lat2y, fmtNum, MONTH_NAMES } from './util.js';
import { BLOCKS, DIR8, blockModel, blockWindows, analyseWithMasks } from './analyze-score.js';
import { demGrid, sunAt, SLOPE_CLASSES } from './tools-terrain.js';
import { nearLayer } from './tools-insights.js';

const MODEL_URL = 'data/analyze/species-model.json';
const SPECIES = [['mule-deer', 'Mule deer'], ['white-tailed-deer', 'White tailed deer'], ['moose', 'Moose'], ['elk', 'Elk'], ['black-bear', 'Black bear'],
  ['grouse', 'Grouse'], ['quail', 'California quail'], ['ducks', 'Ducks'], ['geese', 'Geese']];
const BLOCK_NAMES = { dawn: 'Dawn', morning: 'Morning', midday: 'Midday', afternoon: 'Afternoon', dusk: 'Dusk', night: 'Night' };
const DOING = { feeding: 'Feeding', moving: 'Moving', bedded: 'Bedded', loafing: 'Resting (loafing)', roosting: 'Roosting' };
const DIRW = { N: 'north', NE: 'northeast', E: 'east', SE: 'southeast', S: 'south', SW: 'southwest', W: 'west', NW: 'northwest' };
const LANDW = { valley: 'valley floors', draw: 'draws', bench: 'benches', slope: 'open hillsides', ridge: 'ridges' };
const LAND1 = { valley: 'valley floor', draw: 'draw', bench: 'bench', slope: 'open hillside', ridge: 'ridge' };
const GAPW = { aspect: 'slope direction', slope: 'slope', sun: 'sun or shade', water: 'water', road: 'roads', terrain: 'landform' };
const HONEST = 'Matches terrain to what the research says. Animals may not be there.';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_M = 4500; // view cap (about 4 by 4 km)
const CELL_M = 30, MAX_CELLS = 150, PAD_M = 600, DEMZ = 12, EARTH = 40075016.686, D2R = Math.PI / 180, R2D = 180 / Math.PI;
const SRC = 'hma-heat';
const ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track', 'unclassified', 'residential'];
// heat ramp (one colour ramp, light to dark): stops at match % -> [r, g, b, alpha 0..1]
const RAMP = [[35, [255, 236, 150, 0]], [55, [254, 196, 79, 0.42]], [75, [240, 120, 30, 0.6]], [100, [176, 22, 62, 0.75]]];

let H, map, model = null, modelErr = '', state = null, panel = null, markers = [], worker = null, wseq = 0;
const waits = new Map();

export default function init(api) {
  H = api; map = H.map;
  loadCss();
  hookTools();
  const btn = H.addButton({ id: 'hma-btn', icon: ICON, label: 'Analyze area', where: 'right', onClick: () => open() });
  btn.classList.add('hma-btn');
  H.analyze = { open, run, clear, get last() { return state && state.t; }, get state() { return state; } };
}

const ICON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5" stroke-dasharray="3.2 2.6"/><path d="M6.5 16.5 10 12l2.6 2.6L17.5 8"/><circle cx="17.5" cy="8" r="1.6" fill="currentColor"/></svg>';
const cert = (v) => (H.ui && H.ui.cert ? H.ui.cert(v) : `${v}%`);
const TIP = '<span class="hmm-cert tip">Tip</span>';
const hhmm = (t) => (window.HuntMentor && window.HuntMentor.hhmm ? window.HuntMentor.hhmm(new Date(t)) : new Date(t).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }));
const elevTxt = (a, b) => (H.units.system === 'imperial' ? `${fmtNum(a * 3.28084)} to ${fmtNum(b * 3.28084)} ft` : `${fmtNum(a)} to ${fmtNum(b)} m`);
const round10 = (v) => Math.round(v / 10) * 10;

function loadCss() {
  const href = new URL('./analyze.css', import.meta.url).href;
  if ([...document.styleSheets].some((s) => s.href === href)) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
}

// ---------- entry in the Tools sheet (wraps the current Tools sheet, like tools-terrain.js) ----------
function hookTools() {
  const tools = H.tools, orig = tools && tools.toolsSheet;
  if (typeof orig !== 'function') return; // the round map button still opens it
  const wrapped = (...a) => {
    const r = orig.apply(tools, a);
    const body = H.els && H.els.sheetB;
    if (body && !body.querySelector('.hma-tools')) {
      const box = document.createElement('div'); box.className = 'hma-tools';
      box.innerHTML = `<h3 class="hmm-h">Area analysis</h3><div class="hmt-tiles"><button class="hmt-tile" data-hma="open">${ICON}<span>Analyze area<small>Habitat match by time of day</small></span></button></div>`;
      body.insertBefore(box, body.firstChild);
      box.querySelector('[data-hma]').onclick = () => open();
    }
    return r;
  };
  tools.toolsSheet = wrapped;
  H.setBarAction('tools', wrapped);
}

// ---------- model ----------
async function loadModel() {
  if (model) return model;
  try {
    const r = await fetch(MODEL_URL);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (!j || !j.species || typeof j.species !== 'object') throw new Error('no species in the file');
    model = j; modelErr = '';
  } catch (err) { modelErr = String(err.message || err); model = null; }
  return model;
}

// ---------- picker sheet ----------
function todayParts() {
  const tz = (window.HuntMentor && window.HuntMentor.TZ) || 'America/Vancouver';
  const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: tz }).split('-').map(Number);
  return { y, m, d };
}
/** The date the analysis uses: today in this month, else the 15th of the next time that month comes round. */
function dateFor(month) {
  const t = todayParts();
  if (month === t.m) return { y: t.y, m: month, d: t.d, today: true };
  return { y: month < t.m ? t.y + 1 : t.y, m: month, d: 15, today: false };
}

export async function open() {
  const body = H.openSheet({ title: 'Area analysis', bar: 'tools', html: '<p class="hmm-muted">Loading the species model</p>' });
  const M = await loadModel();
  if (H.els.sheetB !== body) return;
  if (!M) {
    body.innerHTML = `<p class="hma-honest">${HONEST}</p>
      <div class="hmm-banner"><b>The species model is not on this phone yet.</b><br>File: ${esc(MODEL_URL)} (${esc(modelErr)}). Open the app once with signal to update it. Nothing else needs the network.</div>`;
    return;
  }
  const t = todayParts();
  let sp = H.prefs.anaSpecies && M.species[H.prefs.anaSpecies] ? H.prefs.anaSpecies : M.species['mule-deer'] ? 'mule-deer' : Object.keys(M.species)[0];
  let month = state && state.pickMonth ? state.pickMonth : t.m;
  const known = SPECIES.map(([id, n]) => [id, (M.species[id] && M.species[id].name) || n]);
  for (const id of Object.keys(M.species)) if (!known.some(([k]) => k === id)) known.push([id, M.species[id].name || id]);
  body.innerHTML = `
    <p class="hma-honest">${HONEST}</p>
    <h3 class="hmm-h">Animal</h3>
    <div class="hma-species" role="radiogroup" aria-label="Animal">${known.map(([id, n]) => `<button role="radio" data-sp="${esc(id)}" aria-checked="${id === sp}" ${M.species[id] ? '' : 'disabled'}>${esc(n)}${M.species[id] ? '' : '<small>No data yet</small>'}</button>`).join('')}</div>
    <h3 class="hmm-h">Month</h3>
    <div class="hma-months" role="radiogroup" aria-label="Month">${MON.map((m, i) => `<button role="radio" data-m="${i + 1}" aria-checked="${i + 1 === month}">${m}</button>`).join('')}</div>
    <p class="hmm-muted" data-out="date"></p>
    <button class="hmm-primary hma-go" data-go>Analyze this view</button>
    <p class="hmm-muted">Uses the map view, up to about 4 by 4 km. Worked out on your phone from the saved terrain. Works offline in areas you saved in Offline Maps.</p>`;
  const dateOut = body.querySelector('[data-out="date"]');
  const showDate = () => { const d = dateFor(month); dateOut.textContent = d.today ? `Date: today, ${d.d} ${MONTH_NAMES[d.m - 1]}.` : `Date: ${d.d} ${MONTH_NAMES[d.m - 1]} ${d.y} (middle of the month).`; };
  showDate();
  body.querySelectorAll('[data-sp]').forEach((b) => b.onclick = () => { sp = b.dataset.sp; body.querySelectorAll('[data-sp]').forEach((x) => x.setAttribute('aria-checked', x === b)); });
  body.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { month = +b.dataset.m; body.querySelectorAll('[data-m]').forEach((x) => x.setAttribute('aria-checked', x === b)); showDate(); });
  body.querySelector('[data-go]').onclick = () => { H.prefs.anaSpecies = sp; H.savePrefs(); run(sp, month); };
}

// ---------- the view grid ----------
function viewGrid() {
  const b = map.getBounds(), c = map.getCenter(), scale = 256 * 2 ** DEMZ;
  const gx0 = lon2x(b.getWest(), DEMZ) * 256, gx1 = lon2x(b.getEast(), DEMZ) * 256, gy0 = lat2y(b.getNorth(), DEMZ) * 256, gy1 = lat2y(b.getSouth(), DEMZ) * 256;
  const mpp = (EARTH * Math.cos(c.lat * D2R)) / scale, wM = (gx1 - gx0) * mpp, hM = (gy1 - gy0) * mpp;
  const cellM = Math.max(CELL_M, Math.max(wM, hM) / MAX_CELLS), step = cellM / mpp;
  const nx = Math.max(8, Math.ceil((gx1 - gx0) / step)), ny = Math.max(8, Math.ceil((gy1 - gy0) / step));
  const g2ll = (gx, gy) => { const X = gx / scale, Y = gy / scale; return [X * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * Y))) * R2D]; };
  return { gx0, gy0, step, nx, ny, cellM, wM, hM, mpp, centre: [c.lng, c.lat], g2ll, cellLL: (i, j) => g2ll(gx0 + (i + 0.5) * step, gy0 + (j + 0.5) * step) };
}

async function sampleElev(G) {
  const cx = G.gx0 + (G.nx * G.step) / 2, cy = G.gy0 + (G.ny * G.step) / 2, r = (Math.max(G.nx, G.ny) * G.step) / 2 + 2;
  const at = await demGrid(cx, cy, r);
  const e = new Float32Array(G.nx * G.ny); let bad = 0;
  for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
    const v = at(G.gx0 + (i + 0.5) * G.step, G.gy0 + (j + 0.5) * G.step);
    const ok = v === v && v > -500 && v < 9000;
    e[j * G.nx + i] = ok ? v : NaN; if (!ok) bad++;
  }
  return { e, bad: bad / e.length };
}

/** Water and road masks from the map's loaded vector tiles, drawn on a canvas grid with a margin. null when not loaded. */
function vectorMasks(G) {
  const out = { water: null, road: null, why: '' };
  if (!map.getSource('omt')) { out.why = 'the base map has no vector data'; return out; }
  const q = (sourceLayer, filter) => { try { return map.querySourceFeatures('omt', filter ? { sourceLayer, filter } : { sourceLayer }); } catch (err) { return []; } };
  const water = [...q('water'), ...q('waterway'), ...q('landcover', ['==', ['get', 'class'], 'wetland'])];
  const roads = q('transportation', ['match', ['get', 'class'], ROAD_CLASSES, true, false]);
  const any = water.length + roads.length + q('landcover').length + q('place').length + q('boundary').length;
  if (!any) { out.why = map.getZoom() < 11 ? 'zoomed out too far for map detail' : 'map detail tiles are not loaded here (Satellite view, or not saved offline)'; return out; }
  const pad = Math.round(PAD_M / G.cellM), W = G.nx + 2 * pad, Hh = G.ny + 2 * pad;
  const toXY = ([lng, lat]) => [(lon2x(lng, DEMZ) * 256 - G.gx0) / G.step + pad, (lat2y(lat, DEMZ) * 256 - G.gy0) / G.step + pad];
  const draw = (feats) => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    const path = (cs) => cs.forEach((c, k) => { const [x, y] = toXY(c); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    for (const f of feats) {
      const g = f.geometry; if (!g) continue;
      if (g.type === 'LineString') { ctx.beginPath(); path(g.coordinates); ctx.stroke(); }
      else if (g.type === 'MultiLineString') { ctx.beginPath(); g.coordinates.forEach(path); ctx.stroke(); }
      else if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
        ctx.beginPath(); (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).forEach((poly) => poly.forEach((ring) => { path(ring); ctx.closePath(); }));
        ctx.fill('evenodd'); ctx.stroke();
      }
    }
    const px = ctx.getImageData(0, 0, W, Hh).data, mask = new Uint8Array(W * Hh); let n = 0;
    for (let k = 0; k < mask.length; k++) if (px[k * 4 + 3] > 60) { mask[k] = 1; n++; }
    return { mask, nx: W, ny: Hh, pad, n };
  };
  out.water = draw(water); out.road = draw(roads);
  out.counts = { water: water.length, roads: roads.length };
  return out;
}

// ---------- worker ----------
function getWorker() {
  if (worker !== null) return worker;
  try {
    worker = new Worker(new URL('./analyze-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (ev) => { const f = waits.get(ev.data.id); if (f) { waits.delete(ev.data.id); f(ev.data); } };
    worker.onerror = (err) => { console.warn('Area analysis worker failed, using the main thread', err.message || err); worker = false; for (const f of waits.values()) f({ err: 'worker' }); waits.clear(); };
  } catch (err) { worker = false; }
  return worker;
}
async function compute(input) {
  const w = getWorker();
  if (w) {
    const id = ++wseq;
    const tr = [input.elev.buffer]; if (input.wm) tr.push(input.wm.mask.buffer); if (input.rm) tr.push(input.rm.mask.buffer);
    const r = await new Promise((res) => { waits.set(id, res); w.postMessage({ id, input }, tr); });
    if (!r.err) return { res: r.res, where: 'worker' };
    if (r.err !== 'worker') throw new Error(r.err);
    throw new Error('worker lost the input'); // transferred buffers are gone: the caller runs again on the main thread
  }
  const t0 = performance.now(), res = analyseWithMasks(input); res.ms = performance.now() - t0;
  return { res, where: 'main' };
}

// ---------- sun ----------
function sunDay(d, lng, lat) {
  const noon = new Date(d.y, d.m - 1, d.d, 12), HM = window.HuntMentor;
  let rise = null, set = null;
  if (HM && HM.sunEvent) { rise = HM.sunEvent(noon, lat, lng, true); set = HM.sunEvent(noon, lat, lng, false); }
  if (!rise || !set) { // fallback: scan the day for the sun crossing -0.833 degrees
    let prev = null;
    for (let m = 0; m <= 1440; m += 2) { const t = new Date(d.y, d.m - 1, d.d, 0, m), a = sunAt(t, lng, lat).alt + 0.833; if (prev != null) { if (prev < 0 && a >= 0 && !rise) rise = t; if (prev >= 0 && a < 0) set = t; } prev = a; }
  }
  if (!rise || !set) return null;
  const civil = (from, dir) => { for (let k = 0; k <= 120; k++) { const t = +from + dir * k * 6e4; if (sunAt(new Date(t), lng, lat).alt <= -6) return t; } return +from + dir * 35 * 6e4; };
  return { rise: +rise, set: +set, first: civil(rise, -1), last: civil(set, 1) };
}

// ---------- run ----------
export async function run(spId, month) {
  const t0 = performance.now(), t = {};
  const M = await loadModel(); t.model = performance.now() - t0;
  if (!M || !M.species[spId]) { open(); return null; }
  const sp = M.species[spId], G = viewGrid();
  if (G.wM > MAX_M || G.hM > MAX_M) { zoomAsk(spId, month, G); return null; }
  const body = H.openSheet({ title: `Area analysis: ${sp.name || spId}`, bar: 'tools', html: `<p class="hma-honest">${HONEST}</p><p class="hmm-muted">Working out the habitat match for this view</p>` });
  // elevation
  let E;
  try { E = await sampleElev(G); } catch (err) { E = { bad: 1 }; }
  t.dem = performance.now() - t0 - t.model;
  if (E.bad > 0.3) {
    if (H.els.sheetB === body) body.innerHTML = `<p class="hma-honest">${HONEST}</p><div class="hmm-banner">No terrain data for most of this view. Go online once, or save this area in Offline Maps, then try again.</div>`;
    return null;
  }
  // month and blocks
  const d = dateFor(month), mb = blockModel(sp, month), mon = mb.month || {};
  const bandOk = Array.isArray(mon.elev_m) && mon.elev_cert > 0 && !/no data/i.test(mon.note || '');
  const sunD = sunDay(d, G.centre[0], G.centre[1]);
  const win = sunD ? blockWindows(sunD.rise, sunD.set, sunD.first, sunD.last) : null;
  const blocks = {}, sun = {};
  for (const b of BLOCKS) {
    if (!mb.blocks[b]) continue;
    blocks[b] = mb.blocks[b];
    if (win) { const s = sunAt(new Date(win[b].mid), G.centre[0], G.centre[1]); sun[b] = { alt: s.alt, az: s.az }; }
  }
  // water and roads
  const t1 = performance.now(), V = vectorMasks(G); t.vector = performance.now() - t1;
  const needWater = Object.values(blocks).some((p) => Array.isArray(p.water_m)), needRoad = Object.values(blocks).some((p) => p.road_m > 0);
  const input = { elev: E.e, nx: G.nx, ny: G.ny, cell: G.cellM, blocks, sun, band: bandOk ? mon.elev_m : null,
    wm: needWater && V.water ? V.water : null, rm: needRoad && V.road ? V.road : null };
  // keep copies so a lost worker can still run on the main thread
  const backup = { elev: E.e.slice(), wm: input.wm && { ...input.wm, mask: input.wm.mask.slice() }, rm: input.rm && { ...input.rm, mask: input.rm.mask.slice() } };
  const t2 = performance.now();
  let R;
  try { R = await compute(input); } catch (err) {
    console.warn('Area analysis', err);
    const res = analyseWithMasks(Object.assign(input, backup)); R = { res, where: 'main' };
  }
  t.calc = performance.now() - t2; t.calcInside = R.res.ms;
  state = { spId, sp, month, d, mb, mon, bandOk, G, R: R.res, where: R.where, win, sun, V, needWater, needRoad, elevBackup: backup.elev, block: pickBlock(d, win, blocks), t, pickMonth: month };
  const t3 = performance.now();
  drawBlock(state.block);
  if (H.els.sheetB === body) renderSheet(body);
  else if (!H.els.sheet.hidden) { /* another sheet opened meanwhile: leave it */ }
  t.draw = performance.now() - t3; t.total = performance.now() - t0; t.where = R.where; t.cells = G.nx * G.ny; t.cellM = Math.round(G.cellM);
  const tl = body.querySelector('[data-out="time"]'); if (tl) tl.textContent = timeLine();
  landCheck(body);
  H.emit && H.emit('analyze', { species: spId, month, t });
  return state;
}
function pickBlock(d, win, blocks) {
  if (d.today && win) { const now = Date.now(); for (const b of BLOCKS) if (blocks[b] && now >= win[b].start && now < win[b].end) return b; }
  return blocks.dawn ? 'dawn' : Object.keys(blocks)[0];
}
function zoomAsk(spId, month, G) {
  const body = H.openSheet({ title: 'Area analysis', bar: 'tools', html: `<p class="hma-honest">${HONEST}</p>
    <p>This view is about ${fmtNum(G.wM / 1000, 1)} by ${fmtNum(G.hM / 1000, 1)} km. Area analysis works on up to about 4 by 4 km.</p>
    <p>Zoom in on the ground you want to hunt, then tap Analyze again.</p>
    <button class="hmm-primary hma-go" data-z>Zoom in for me and analyze</button>` });
  body.querySelector('[data-z]').onclick = () => {
    const k = Math.max(G.wM, G.hM) / 3800;
    H.closeSheet();
    map.once('moveend', () => setTimeout(() => run(spId, month), 250));
    map.easeTo({ zoom: map.getZoom() + Math.log2(k), duration: 600 });
  };
}

// ---------- map: heat overlay, pins, panel ----------
function rampAt(p) {
  if (!(p === p) || p < RAMP[0][0]) return null;
  for (let k = 1; k < RAMP.length; k++) {
    const [p1, c1] = RAMP[k]; const [p0, c0] = RAMP[k - 1];
    if (p <= p1) { const f = (p - p0) / (p1 - p0); return c0.map((v, i) => v + (c1[i] - v) * f); }
  }
  return RAMP[RAMP.length - 1][1];
}
function drawBlock(b) {
  const S = state; if (!S || !S.R.blocks[b]) return;
  S.block = b;
  const { G } = S, B = S.R.blocks[b], cv = document.createElement('canvas'); cv.width = G.nx; cv.height = G.ny;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(G.nx, G.ny), px = img.data;
  for (let k = 0; k < B.pct.length; k++) { const c = rampAt(B.pct[k]); if (!c) continue; const o = k * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = Math.round(c[3] * 255); }
  ctx.putImageData(img, 0, 0);
  const L = G.gx0, T = G.gy0, Rr = L + G.nx * G.step, Bt = T + G.ny * G.step;
  const coords = [G.g2ll(L, T), G.g2ll(Rr, T), G.g2ll(Rr, Bt), G.g2ll(L, Bt)], url = cv.toDataURL('image/png');
  const src = map.getSource(SRC);
  if (src && src.updateImage) src.updateImage({ url, coordinates: coords });
  else {
    map.addSource(SRC, { type: 'image', url, coordinates: coords });
    map.addLayer({ id: SRC, type: 'raster', source: SRC, paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, map.getLayer(H.anchors.lines) ? H.anchors.lines : undefined);
  }
  pins(B.zones);
  showPanel();
}
function zoneInfo(z) {
  const S = state, k = z.j * S.G.nx + z.i, e = S.elevBackup[k], s = S.R.slope[k], a = S.R.aspect[k], lf = S.R.land[k];
  return { ll: S.G.cellLL(z.i, z.j), elev: e, slope: s, aspect: s < 5 ? 'flat' : DIR8[Math.round(a / 45) % 8], land: ['valley', 'draw', 'bench', 'slope', 'ridge'][lf] };
}
function zoneTxt(zi) {
  return `${H.units.elev(round10(zi.elev))}, ${zi.aspect === 'flat' ? 'flat ground' : `faces ${DIRW[zi.aspect]}`}, ${Math.round(zi.slope)}° slope, ${LAND1[zi.land] || 'hillside'}`;
}
function pins(zones) {
  for (const m of markers) m.remove();
  markers = [];
  zones.forEach((z, n) => {
    const zi = zoneInfo(z), el = document.createElement('button');
    el.type = 'button'; el.className = 'hma-pin';
    el.setAttribute('aria-label', `Zone ${n + 1}: ${z.pct}% habitat match. ${zoneTxt(zi)}`);
    el.innerHTML = `<b>${n + 1}</b><small>${z.pct}%</small>`;
    el.onclick = (e) => { e.stopPropagation(); H.toast(`Zone ${n + 1}, best match for ${BLOCK_NAMES[state.block].toLowerCase()}: ${z.pct}%. ${zoneTxt(zi)}.`, 5000); };
    markers.push(new H.maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(zi.ll).addTo(map));
  });
}
function showPanel() {
  const S = state;
  H.overlayChip && H.overlayChip('hma', `Area analysis: ${S.sp.name || S.spId}`, clear);
  const box = H.els.bar.parentNode.querySelector('.hmt-chips') || H.els.bar.parentNode;
  if (!panel) { panel = document.createElement('div'); panel.className = 'hma-panel'; }
  if (panel.parentNode !== box) box.appendChild(panel);
  panel.innerHTML = `<div class="hma-lg"><span>Low match</span><i></i><span>High match</span><button type="button" data-r aria-label="Area analysis results">Results</button></div>
    <div class="hma-seg" role="radiogroup" aria-label="Time block">${BLOCKS.filter((b) => S.R.blocks[b]).map((b) => `<button type="button" role="radio" data-b="${b}" aria-checked="${b === S.block}"><b>${BLOCK_NAMES[b]}</b><small>${S.win ? hhmm(S.win[b].start) : ''}</small></button>`).join('')}</div>`;
  panel.querySelectorAll('[data-b]').forEach((x) => x.onclick = () => { drawBlock(x.dataset.b); syncSheetBlock(); });
  panel.querySelector('[data-r]').onclick = () => { const body = H.openSheet({ title: `Area analysis: ${S.sp.name || S.spId}`, bar: 'tools', html: '' }); renderSheet(body); landCheck(body); };
}
function syncSheetBlock() {
  const body = H.els.sheetB; if (!body || H.els.sheet.hidden) return;
  body.querySelectorAll('[data-show]').forEach((x) => x.classList.toggle('on', x.dataset.show === state.block));
}
export function clear() {
  for (const m of markers) m.remove();
  markers = [];
  if (map.getLayer(SRC)) map.removeLayer(SRC);
  if (map.getSource(SRC)) map.removeSource(SRC);
  if (panel) { panel.remove(); panel = null; }
  H.overlayChip && H.overlayChip('hma', '', () => {});
  state = state ? { pickMonth: state.pickMonth } : null;
}

// ---------- result sheet ----------
function modelCert(S) {
  const c = BLOCKS.map((b) => S.mb.blocks[b] && S.mb.blocks[b].cert).filter((v) => v > 0);
  if (S.bandOk) c.push(S.mon.elev_cert);
  return c.length ? Math.min(...c) : 0;
}
function whereTxt(B, sunUp) {
  const d = B.best; if (!d) return 'No clear pattern';
  const lit = sunUp ? (d.lit > 0.6 ? 'sunny ' : d.lit < 0.3 ? 'shaded ' : '') : '';
  const face = d.aspect === 'flat' ? 'flat' : `${DIRW[d.aspect]} facing`;
  const s = `${lit}${face} ${LANDW[d.landform] || 'ground'}, ${elevTxt(round10(d.elev[0]), round10(d.elev[1]))}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function factorList(S) {
  const used = [], skipped = [];
  const anyB = (k) => BLOCKS.some((b) => S.R.blocks[b] && S.R.blocks[b].used[k]);
  if (S.bandOk) used.push('elevation band'); else skipped.push('elevation band (no data for this month)');
  if (anyB('slope')) used.push('slope'); if (anyB('aspect')) used.push('slope direction');
  if (anyB('sun')) used.push('sun and shade'); if (anyB('terrain')) used.push('landform (ridge, bench, draw, valley)');
  if (S.needWater) { if (anyB('water')) used.push(`distance to water (map data, ${S.V.counts.water} features)`); else skipped.push(`distance to water (${S.V.why || 'no map data'})`); }
  if (S.needRoad) { if (anyB('road')) used.push(`distance from roads (map data, ${S.V.counts.roads} features)`); else skipped.push(`distance from roads (${S.V.why || 'no map data'})`); }
  return { used, skipped };
}
function timeLine() {
  const t = state && state.t; if (!t || !t.total) return '';
  return `Worked out on your phone in ${fmtNum(t.total / 1000, 1)} s (${fmtNum(t.cells)} cells of about ${t.cellM} m, ${t.where === 'worker' ? 'in the background' : 'on the main thread'}). No signal needed.`;
}
function renderSheet(body) {
  const S = state, G = S.G, A = S.R.area, sp = S.sp, mc = modelCert(S), F = factorList(S);
  const dTxt = `${S.d.d} ${MONTH_NAMES[S.d.m - 1]} ${S.d.y}${S.d.today ? ' (today)' : ''}`;
  const kv = (k, v) => `<div class="hmm-kv"><span>${k}</span><b>${v}</b></div>`;
  // elevation bar
  let elevHtml;
  const lo = A.min, hi = A.max, span = Math.max(1, hi - lo);
  if (S.bandOk) {
    const [b0, b1] = S.mon.elev_m, l = clamp((b0 - lo) / span, 0, 1) * 100, r = clamp((b1 - lo) / span, 0, 1) * 100;
    const inside = Math.round((A.inBand || 0) * 100), unsourced = S.mon.elev_cert < 60;
    elevHtml = `<div class="hma-ebar" role="img" aria-label="Elevation band ${elevTxt(b0, b1)} against this area, ${elevTxt(round10(lo), round10(hi))}. ${inside}% of the area is inside the band.">
        <i style="left:${l}%;width:${Math.max(r - l, b1 < lo || b0 > hi ? 0 : 1.5)}%"></i></div>
      <div class="hma-eaxis"><span>${H.units.elev(round10(lo))}</span><span>this area</span><span>${H.units.elev(round10(hi))}</span></div>
      ${kv('Band this month', `${elevTxt(b0, b1)} ${cert(S.mon.elev_cert)}`)}${kv('Area inside the band', `${inside}%`)}
      ${S.mon.activity ? `<p>${esc(cap(S.mon.activity))}${S.mon.note ? `: ${esc(S.mon.note)}` : ''}</p>` : ''}
      ${unsourced ? '<p><span class="hmm-verify">VERIFY</span> Low certainty for this band. Check it against the lesson and what you see on the ground.</p>' : ''}
      ${b1 < lo || b0 > hi ? `<p><b>None of this view is inside the band.</b> Matches here are the closest the area has.</p>` : ''}`;
  } else {
    elevHtml = `<p><span class="hmm-verify">VERIFY</span> No sourced elevation band for ${MONTH_NAMES[S.month - 1]} in the model${S.mon.note ? ` (${esc(S.mon.note)})` : ''}. Elevation is not used.</p>
      <p class="hmm-muted">This area: ${elevTxt(round10(lo), round10(hi))}.</p>`;
  }
  // blocks
  const blocksHtml = BLOCKS.filter((b) => S.R.blocks[b]).map((b) => {
    const p = S.mb.blocks[b] || {}, B = S.R.blocks[b], z = B.zones[0], sunUp = S.sun[b] && S.sun[b].alt > 0;
    const noData = !(p.cert > 0) || /no data/i.test(p.note || '');
    return `<div class="hma-blk${b === S.block ? ' on' : ''}" data-show="${b}">
      <div class="hma-bh"><b>${BLOCK_NAMES[b]}</b><span>${S.win ? `${hhmm(S.win[b].start)} to ${hhmm(S.win[b].end)}` : ''}</span></div>
      <ul>
        <li><span>Doing</span> ${esc(DOING[p.doing] || cap(p.doing || 'unknown'))}${p.overridden ? ' <small>(this month)</small>' : ''}</li>
        <li><span>Best match</span> ${esc(whereTxt(B, sunUp))}</li>
        ${z ? `<li><span>Zone 1</span> ${z.pct}% habitat match: ${esc(zoneTxt(zoneInfo(z)))}</li>` : ''}
        ${p.tip ? `<li><span>Tip</span> ${esc(p.tip)} ${p.cert > 0 ? cert(p.cert) : TIP}</li>` : ''}
        ${noData ? '<li><span class="hmm-verify">VERIFY</span> No data in the research for this block: neutral settings used.</li>' : ''}
        ${!noData && Array.isArray(p.gaps) && p.gaps.length ? `<li><span>No source</span> ${esc(p.gaps.map((g) => GAPW[g] || g).join(', '))}: left neutral</li>` : ''}
      </ul>
      <button class="hmm-btn2" data-b2="${b}">Show ${BLOCK_NAMES[b].toLowerCase()} on the map</button></div>`;
  }).join('');
  const night = S.mb.blocks.night ? `<p class="hmm-muted"><b>Night</b> (not legal shooting; for understanding movement): ${esc(DOING[S.mb.blocks.night.doing] || S.mb.blocks.night.doing || '')}. ${esc(S.mb.blocks.night.tip || '')}</p>` : '';
  // slope classes
  const sh = A.slopeShare, rows = [{ label: 'Under 15°', say: 'Easy walking', color: 'transparent' }, ...SLOPE_CLASSES].map((c, k) => `<div class="hma-srow"><i style="background:${c.color}"></i><span>${c.label}<small>${esc(c.say)}</small></span><b>${Math.round(sh[k] * 100)}%</b><em><u style="width:${Math.round(sh[k] * 100)}%"></u></em></div>`).join('');
  // tips
  const tips = (sp.tips || []).filter((t) => !t.months || !t.months.length || t.months.includes(S.month));
  const tipsHtml = tips.length ? `<ul class="hma-tips">${tips.map((t) => `<li>${esc(t.text)} ${t.cert >= 60 ? cert(t.cert) : TIP}</li>`).join('')}</ul>` : '<p class="hmm-muted">No area tips for this month in the model.</p>';
  const hasLesson = sp.lesson && window.HM && Array.isArray(window.HM.sessions) && window.HM.sessions.some((s) => s.id === sp.lesson);
  body.innerHTML = `
    <p class="hma-honest">${HONEST}</p>
    <h3 class="hmm-h">Summary</h3>
    ${kv('Animal', esc(sp.name || S.spId))}${kv('Date', esc(dTxt))}
    ${kv('Area', `${fmtNum(G.wM / 1000, 1)} by ${fmtNum(G.hM / 1000, 1)} km, the map view`)}
    ${kv('Model certainty', `${mc > 0 ? cert(mc) : '<span class="hmm-verify">VERIFY</span>'}`)}
    ${S.mb.note ? `<p><b>This month:</b> ${esc(S.mb.note)}</p>` : ''}
    <p class="hmm-muted">Habitat match is relative within this view: 100% is the best ground here, not a sure thing. Model certainty is the lowest certainty of the research behind it.</p>
    <h3 class="hmm-h">Elevation this month</h3>${elevHtml}
    <h3 class="hmm-h">By time of day</h3>
    <p class="hmm-muted">Clock times for ${esc(dTxt)} at the map centre, Pacific time. Numbered pins on the map show the 3 best zones for the block you pick.</p>
    ${blocksHtml}${night}
    <h3 class="hmm-h">Slope in this area</h3><div class="hma-slopes">${rows}</div>
    <h3 class="hmm-h">Area tips</h3>${tipsHtml}
    <h3 class="hmm-h">Land check</h3><div data-out="land"><p class="hmm-muted">Checking the top zones against private land and parks</p></div>
    <h3 class="hmm-h">What went in</h3>
    <ul class="hma-tips"><li><b>Used:</b> ${esc(F.used.join(', ') || 'none')}</li>${F.skipped.length ? `<li><b>Not used:</b> ${esc(F.skipped.join('; '))}</li>` : ''}
      <li>Terrain about ${Math.round(G.cellM)} m apart: small benches, cliffs and timber edges do not show. Trees, food and snow are not in the model.</li></ul>
    <div class="hmm-btnrow">${hasLesson ? `<a class="hmm-btn2" href="#/s/${esc(sp.lesson)}">Masterclass: where they are</a>` : sp.lesson ? `<span class="hmm-muted">Masterclass lesson ${esc(sp.lesson)} is not published yet.</span>` : ''}<a class="hmm-btn2" href="#/s/rb-where-you-can-hunt">Rule Book: where you can hunt</a></div>
    <p class="hmm-muted">Sources: ${esc((sp.sources || []).join('; ') || 'see the species model')}. Model checked ${esc(model.checked || '')}.</p>
    <p class="hmm-muted" data-out="time">${timeLine()}</p>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-again>Pick another animal or month</button><button class="hmm-btn2" data-clear>Clear from the map</button></div>`;
  body.querySelectorAll('[data-b2]').forEach((x) => x.onclick = () => { drawBlock(x.dataset.b2); H.closeSheet(); });
  body.querySelector('[data-again]').onclick = () => open();
  body.querySelector('[data-clear]').onclick = () => { clear(); H.closeSheet(); };
}
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/** Private land and parks at the top zones of every block, from the saved layers (no network when offline). */
async function landCheck(body) {
  const S = state; if (!S || !S.R) return;
  const out = () => body.isConnected && body.querySelector('[data-out="land"]');
  const pts = [];
  for (const b of BLOCKS) (S.R.blocks[b] ? S.R.blocks[b].zones : []).forEach((z, n) => pts.push({ b, n: n + 1, ll: zoneInfo(z).ll }));
  if (S.land) { const o = out(); if (o) o.innerHTML = S.land; return; }
  const look = async (id) => Promise.all(pts.map((p) => nearLayer(id, p.ll, 0).catch(() => ({ state: 'nodata', hits: [] }))));
  const timeout = new Promise((r) => setTimeout(() => r(null), 6000));
  const res = await Promise.race([Promise.all([look('private_land'), look('parks')]), timeout]);
  if (state !== S) return;
  let html;
  if (!res) html = '<p class="hmm-muted">Land layers did not answer in time. Turn on Private land and Parks in Hunt Map Layers to see them.</p>';
  else {
    const [pv, pk] = res, flags = [];
    const checked = pv.some((r) => r.state === 'ok') || pk.some((r) => r.state === 'ok');
    pts.forEach((p, k) => {
      if (pv[k].hits.some((h) => h.dist === 0)) flags.push(`<li class="stop"><b>Private land</b> ${BLOCK_NAMES[p.b]} zone ${p.n}. You need the owner’s permission.</li>`);
      const park = pk[k].hits.find((h) => h.dist === 0);
      if (park) flags.push(`<li class="warn"><b>Park</b> ${BLOCK_NAMES[p.b]} zone ${p.n}: ${esc(park.props.name || park.props.designation || '')}. Check the park rules.</li>`);
    });
    if (flags.length) html = `<ul class="hma-flags">${flags.join('')}</ul>`;
    else if (checked) html = '<p>No private land or park found at the top zones in the saved layers. Signs on the ground still rule.</p>';
    else html = '<p class="hmm-muted">Not checked: the private land and park layers are not saved for this area. Save it in Offline Maps with signal.</p>';
  }
  S.land = `${html}<p class="hmm-muted">Study aid only. The official regulations are the law.</p>`;
  const o = out(); if (o) o.innerHTML = S.land;
}
