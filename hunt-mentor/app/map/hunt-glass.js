/* Hunt Map tool: glassing spots and walk in zones, for the map view. Worked out on the phone:
     Terrain: the shared terrain tiles (tools-terrain.js demGrid, zoom 12, about 24 m apart here). Works offline where saved.
     Roads and tracks: OpenStreetMap map detail tiles (zoom 14, hunt-osm.js) plus the BC Forest Service road layer.
     Forest and water: OpenStreetMap landcover "wood" and water (not every forest is mapped).
   Walk in zone: land more than 1 km (0.6 mi) from any road or track on the map. Tip, not a rule: hunters rarely walk far from roads.
   Glassing spots: high points (higher than the land around them) that see the most open slope within 2 km.
   Both are estimates. Sets H.glass = { open, run, clear, last }. */
import { esc, lon2x, lat2y, fmtNum, compass8, haversine } from './util.js';
import { demGrid } from './tools-terrain.js';
import { distanceField } from './analyze-score.js';
import { osmArea, forestRoads, pmArea, isRoad, Z as OZ } from './hunt-osm.js';
import { intro, peek, TIP, BANNER } from './hunt-ui.js';

let H, map, last = null, busy = 0;
const DEMZ = 12, EARTH = 40075016.686, D2R = Math.PI / 180, R2D = 180 / Math.PI;
const WALK_M = 1000, MAX_M = 6000, VIEW_R = 2000, EYE = 1.7, TARGET = 1;
const SRC = 'hh-glass', IMG = 'hh-walkin';
const TITLE = 'Glassing and walk in';

export function init(api) {
  H = api; map = H.map;
  H.onClick((e) => {
    if (!last || !map.getLayer('hh-glass-dot') || otherTool()) return false; // a tap for another open tool is that tool's tap
    const pt = e.point, hit = map.queryRenderedFeatures([[pt.x - 14, pt.y - 14], [pt.x + 14, pt.y + 14]], { layers: ['hh-glass-dot', 'hh-glass-n'] });
    if (!hit.length) return false;
    spotSheet(+hit[0].properties.i);
    return true;
  });
  H.on('units', () => { if (last && H.els.sheetT.textContent === TITLE) open(); });
  H.glass = { open, run, clear, get last() { return last; } };
}

export function open() {
  const body = H.openSheet({ title: TITLE, bar: 'tools', modal: false, onClose: peek(), html: `
    ${intro('high points that see lots of open slope, and land far from roads where fewer hunters go.',
      ['Move the map to the area you want to hunt. Zoom in so the screen shows about 2 to 6 km across.', 'Tap “Find spots in this view”. It takes a few seconds.', 'Shaded green land is the walk in zone. Numbered dots are glassing spots: tap one for details.', 'Scout before you trust it. Check land status and access first.'])}
    <button class="hmm-primary block" data-g="run">Find spots in this view</button>
    <div data-out="g">${last ? summaryHtml(last) : ''}</div>
    ${last ? '<div class="hmm-btnrow"><button class="hmm-btn2" data-g="clear">Clear from the map</button></div>' : ''}
    <p class="hmm-muted">${TIP} Both are estimates from terrain and map data, not animal counts and not rules.</p>` });
  wire(body);
  return body;
}
function wire(body) {
  const on = (k, fn) => body.querySelectorAll(`[data-g="${k}"]`).forEach((b) => { b.onclick = fn; });
  on('run', () => run());
  on('clear', () => { clear(); open(); });
  body.querySelectorAll('[data-gs]').forEach((b) => b.onclick = () => spotSheet(+b.dataset.gs));
}

// ---------- grid over the view ----------
function viewGrid() {
  const b = map.getBounds(), c = map.getCenter(), scale = 256 * 2 ** DEMZ;
  let w = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth();
  // keep at most MAX_M across, around the centre
  const kx = MAX_M / (111320 * Math.cos(c.lat * D2R)) / 2, ky = MAX_M / 110574 / 2;
  const cut = (e - w) > 2 * kx || (n - s) > 2 * ky;
  w = Math.max(w, c.lng - kx); e = Math.min(e, c.lng + kx); s = Math.max(s, c.lat - ky); n = Math.min(n, c.lat + ky);
  const gx0v = lon2x(w, DEMZ) * 256, gx1v = lon2x(e, DEMZ) * 256, gy0v = lat2y(n, DEMZ) * 256, gy1v = lat2y(s, DEMZ) * 256;
  const mpp = (EARTH * Math.cos(c.lat * D2R)) / scale, wM = (gx1v - gx0v) * mpp, hM = (gy1v - gy0v) * mpp;
  const cellM = Math.max(30, Math.max(wM, hM) / 200), step = cellM / mpp;
  const pad = Math.ceil(VIEW_R / cellM) + 1;
  const vnx = Math.max(8, Math.ceil((gx1v - gx0v) / step)), vny = Math.max(8, Math.ceil((gy1v - gy0v) / step));
  const nx = vnx + 2 * pad, ny = vny + 2 * pad, gx0 = gx0v - pad * step, gy0 = gy0v - pad * step;
  const g2ll = (gx, gy) => { const X = gx / scale, Y = gy / scale; return [X * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * Y))) * R2D]; };
  const cellLL = (i, j) => g2ll(gx0 + (i + 0.5) * step, gy0 + (j + 0.5) * step);
  const nw = g2ll(gx0, gy0), se = g2ll(gx0 + nx * step, gy0 + ny * step);
  return { gx0, gy0, step, nx, ny, pad, vnx, vny, cellM, wM, hM, mpp, cut, g2ll, cellLL, bbox: [nw[0], se[1], se[0], nw[1]] };
}

// ---------- rasterize map features on the grid ----------
function raster(G, feats, mode) {
  const cv = document.createElement('canvas'); cv.width = G.nx; cv.height = G.ny;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const k = 256 * 2 ** (DEMZ - OZ);
  const xy = (q) => [(q[0] * k - G.gx0) / G.step, (q[1] * k - G.gy0) / G.step];
  for (const f of feats) {
    ctx.beginPath();
    for (const part of f.parts) part.forEach((q, i) => { const [x, y] = xy(q); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    if (mode === 'fill') ctx.fill('evenodd'); else ctx.stroke();
  }
  const px = ctx.getImageData(0, 0, G.nx, G.ny).data, m = new Uint8Array(G.nx * G.ny);
  for (let i = 0; i < m.length; i++) if (px[i * 4 + 3] > 60) m[i] = 1;
  return m;
}
/** Cells whose map detail tile could not be read (offline and not saved). */
function uncovered(G, covered) {
  const m = new Uint8Array(G.nx * G.ny), k = 256 * 2 ** (DEMZ - OZ);
  for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
    const X = Math.floor((G.gx0 + (i + 0.5) * G.step) / k), Y = Math.floor((G.gy0 + (j + 0.5) * G.step) / k);
    if (!covered.has(`${X}/${Y}`)) m[j * G.nx + i] = 1;
  }
  return m;
}

// ---------- the run ----------
/** Another tool's sheet is on screen (this tool's own sheets are the list and "Glassing spot N"). */
function otherTool() {
  const t = H.els.sheetT.textContent;
  return !H.els.sheet.hidden && t !== TITLE && !/^Glassing spot \d+$/.test(t);
}
export async function run() {
  if (map.getZoom() < 11) { H.toast('Zoom in closer first: the tool reads up to about 6 by 6 km.', 4000); return null; }
  const my = ++busy, t0 = performance.now();
  // stale: a newer run or Clear started, or the user opened another tool while this one was working (slow network).
  // A stale run stops and draws nothing, so it never covers the tool the user moved on to. Closing the sheet to watch the map is fine.
  const stale = () => my !== busy || otherTool();
  const say = (t) => { const o = H.els.sheetB.querySelector('[data-out="g"]'); if (o && H.els.sheetT.textContent === TITLE) o.innerHTML = `<p class="hmm-muted">${t}</p>`; };
  if (H.els.sheet.hidden || H.els.sheetT.textContent !== TITLE) open();
  say('Reading the terrain and the roads');
  const G = viewGrid();
  const cx = G.gx0 + (G.nx * G.step) / 2, cy = G.gy0 + (G.ny * G.step) / 2;
  const [at, osm, fsr, cuts, burns] = await Promise.all([
    demGrid(cx, cy, (Math.max(G.nx, G.ny) * G.step) / 2 + 2),
    osmArea(map, G.bbox, ['transportation', 'landcover', 'water'], (k, n) => say(`Reading the terrain and the roads: map tile ${k} of ${n}`)),
    forestRoads(G.bbox), pmArea('cutblocks', G.bbox, 3), pmArea('burns', G.bbox, 3),
  ]);
  if (stale()) return null;
  // elevation
  const N = G.nx * G.ny, e = new Float32Array(N); let bad = 0;
  for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
    const v = at(G.gx0 + (i + 0.5) * G.step, G.gy0 + (j + 0.5) * G.step);
    const ok = v === v && v > -500 && v < 9000; e[j * G.nx + i] = ok ? v : NaN; if (!ok) bad++;
  }
  const terrainOk = bad / N < 0.5;
  // roads, forest, water
  const roads = osm.feats.filter(isRoad).concat(fsr.feats);
  const haveMap = osm.got > 0;
  const roadM = raster(G, roads, 'line');
  const woodM = raster(G, osm.feats.filter((f) => f.layer === 'landcover' && f.type === 3 && f.props.class === 'wood'), 'fill');
  // logged openings (25 years or less) and burns up to 15 years old are open ground even where the map shows forest
  const yr = new Date().getFullYear();
  const openM = raster(G, cuts.feats.concat(burns.feats.filter((f) => +f.props.year && yr - f.props.year <= 15)), 'fill');
  for (let k = 0; k < woodM.length; k++) if (openM[k]) woodM[k] = 0;
  const waterM = raster(G, osm.feats.filter((f) => f.layer === 'water' && f.type === 3), 'fill');
  const dist = distanceField(roadM, G.nx, G.ny, G.cellM);
  const unc = uncovered(G, osm.covered), dUnc = distanceField(unc, G.nx, G.ny, G.cellM);
  say('Looking for high points with a view');
  await new Promise((r) => setTimeout(r, 0));
  if (stale()) return null;
  const spots = terrainOk ? findSpots(G, e, woodM, waterM, dist) : [];
  if (stale()) return null;
  // walk in zone overlay (view part only)
  let walkCells = 0, viewCells = 0, unknownCells = 0;
  const cv = document.createElement('canvas'); cv.width = G.vnx; cv.height = G.vny;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(G.vnx, G.vny), px = img.data;
  if (haveMap) {
    for (let j = 0; j < G.vny; j++) for (let i = 0; i < G.vnx; i++) {
      const k = (j + G.pad) * G.nx + i + G.pad, o = (j * G.vnx + i) * 4;
      if (waterM[k]) continue;
      viewCells++;
      if (dUnc[k] < WALK_M && dist[k] > WALK_M - 0.5 * G.cellM) { unknownCells++; continue; } // a road could hide in a tile that is not saved
      if (dist[k] > WALK_M) { walkCells++; px[o] = 27; px[o + 1] = 158; px[o + 2] = 119; px[o + 3] = 92; }
    }
    ctx.putImageData(img, 0, 0);
  }
  const L = G.gx0 + G.pad * G.step, T = G.gy0 + G.pad * G.step, Rr = L + G.vnx * G.step, B = T + G.vny * G.step;
  drawWalk(haveMap ? cv.toDataURL('image/png') : null, [G.g2ll(L, T), G.g2ll(Rr, T), G.g2ll(Rr, B), G.g2ll(L, B)]);
  drawSpots(spots);
  last = { spots, walkPct: viewCells ? Math.round((walkCells / viewCells) * 100) : 0, unknownPct: viewCells ? Math.round((unknownCells / viewCells) * 100) : 0,
    haveMap, terrainOk, cut: G.cut, cellM: G.cellM, osm: { got: osm.got, failed: osm.failed, tooMany: osm.tooMany, roads: osm.feats.filter(isRoad).length, wood: osm.feats.some((f) => f.layer === 'landcover' && f.props.class === 'wood') },
    fsr: { ok: fsr.ok, n: fsr.feats.length }, cuts: cuts.ok || burns.ok, ms: Math.round(performance.now() - t0), centre: [map.getCenter().lng, map.getCenter().lat] };
  H.overlayChip && H.overlayChip('hh-glass', 'Glassing and walk in', clear);
  if (H.els.sheetT.textContent === TITLE && !H.els.sheet.hidden) {
    const o = H.els.sheetB.querySelector('[data-out="g"]');
    if (o) { o.innerHTML = summaryHtml(last); wire(H.els.sheetB); }
    if (!H.els.sheetB.querySelector('[data-g="clear"]')) { const d = document.createElement('div'); d.className = 'hmm-btnrow'; d.innerHTML = '<button class="hmm-btn2" data-g="clear">Clear from the map</button>'; o.after(d); wire(H.els.sheetB); }
  }
  return last;
}

function findSpots(G, e, woodM, waterM, dist) {
  const { nx, ny, cellM } = G;
  // slope (degrees) per cell
  const slope = new Float32Array(nx * ny);
  for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const k = j * nx + i, gx = (e[k + 1] - e[k - 1]) / (2 * cellM), gy = (e[k + nx] - e[k - nx]) / (2 * cellM);
    slope[k] = Math.atan(Math.hypot(gx, gy)) * R2D;
  }
  // open slope: not mapped as forest or water, 8 to 45 degrees (hillsides animals feed and bed on, and you can see into)
  const open = new Uint8Array(nx * ny);
  for (let k = 0; k < open.length; k++) open[k] = !woodM[k] && !waterM[k] && slope[k] >= 8 && slope[k] <= 45 && e[k] === e[k] ? 1 : 0;
  // candidates in the view: highest within 300 m, and at least 15 m above the average ground within 1 km
  const r1 = Math.max(2, Math.round(300 / cellM)), r2 = Math.max(4, Math.round(1000 / cellM)), cands = [];
  for (let j = G.pad; j < G.pad + G.vny; j += 1) for (let i = G.pad; i < G.pad + G.vnx; i += 1) {
    const k = j * nx + i, h = e[k]; if (!(h === h) || waterM[k]) continue;
    let top = true;
    for (let dj = -r1; dj <= r1 && top; dj++) for (let di = -r1; di <= r1; di++) { const v = e[(j + dj) * nx + i + di]; if (v > h) { top = false; break; } }
    if (!top) continue;
    let s = 0, n = 0;
    for (let dj = -r2; dj <= r2; dj += 2) for (let di = -r2; di <= r2; di += 2) { const jj = j + dj, ii = i + di; if (jj < 0 || ii < 0 || jj >= ny || ii >= nx) continue; const v = e[jj * nx + ii]; if (v === v) { s += v; n++; } }
    const relief = n ? h - s / n : 0;
    if (relief >= 15) cands.push({ i, j, h, relief });
  }
  cands.sort((a, b) => b.relief - a.relief);
  const pick = [];
  for (const c of cands) { if (pick.length >= 30) break; if (pick.every((q) => Math.hypot(q.i - c.i, q.j - c.j) * cellM > 400)) pick.push(c); }
  // how much open slope each one sees within 2 km (line of sight over the terrain grid)
  const seen = new Uint8Array(nx * ny), rays = 180, steps = Math.floor(VIEW_R / cellM);
  for (const c of pick) {
    seen.fill(0);
    const eye = c.h + EYE, sect = new Float32Array(8); let n = 0;
    for (let r = 0; r < rays; r++) {
      const a = (r / rays) * 2 * Math.PI, dx = Math.sin(a), dy = -Math.cos(a);
      let maxG = -Infinity;
      for (let s = 1; s <= steps; s++) {
        const ii = Math.round(c.i + dx * s), jj = Math.round(c.j + dy * s);
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) break;
        const k = jj * nx + ii, h = e[k]; if (!(h === h)) break;
        const d = s * cellM, g = (h - eye) / d;
        if ((h + TARGET - eye) / d >= maxG && d > 150 && open[k] && !seen[k]) { seen[k] = 1; n++; sect[Math.round(a / (Math.PI / 4)) % 8]++; }
        if (g > maxG) maxG = g;
      }
    }
    c.ha = (n * cellM * cellM) / 1e4;
    let best = 0; for (let s = 1; s < 8; s++) if (sect[s] > sect[best]) best = s;
    c.look = best * 45;
    c.road = dist[c.j * nx + c.i];
    c.ll = G.cellLL(c.i, c.j);
    c.wood = !!woodM[c.j * nx + c.i];
  }
  pick.sort((a, b) => b.ha - a.ha);
  const out = [];
  for (const c of pick) { if (out.length >= 5) break; if (c.ha < 1) continue; if (out.every((q) => haversine(q.ll, c.ll) > 600)) out.push(c); }
  return out.map((c, i) => ({ n: i + 1, ll: c.ll, elev: c.h, relief: c.relief, ha: c.ha, look: c.look, road: c.road, wood: c.wood }));
}

// ---------- drawing ----------
const empty = () => ({ type: 'FeatureCollection', features: [] });
function drawWalk(url, coords) {
  if (!url) { if (map.getLayer(IMG)) map.removeLayer(IMG); if (map.getSource(IMG)) map.removeSource(IMG); return; }
  const src = map.getSource(IMG);
  if (src && src.updateImage) src.updateImage({ url, coordinates: coords });
  else {
    map.addSource(IMG, { type: 'image', url, coordinates: coords });
    map.addLayer({ id: IMG, type: 'raster', source: IMG, paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 } }, map.getLayer(H.anchors.lines) ? H.anchors.lines : undefined);
  }
}
function drawSpots(spots) {
  const fc = { type: 'FeatureCollection', features: spots.map((s, i) => ({ type: 'Feature', properties: { i, n: String(s.n) }, geometry: { type: 'Point', coordinates: s.ll } })) };
  if (map.getSource(SRC)) { map.getSource(SRC).setData(fc); return; }
  map.addSource(SRC, { type: 'geojson', data: fc });
  map.addLayer({ id: 'hh-glass-dot', type: 'circle', source: SRC, paint: { 'circle-radius': 15, 'circle-color': '#1d4e89', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
  map.addLayer({ id: 'hh-glass-n', type: 'symbol', source: SRC, layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 16, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#fff' } });
}
export function clear() {
  busy++; last = null;
  for (const id of ['hh-glass-n', 'hh-glass-dot', IMG]) if (map.getLayer(id)) map.removeLayer(id);
  for (const id of [SRC, IMG]) if (map.getSource(id)) map.removeSource(id);
  H.overlayChip && H.overlayChip('hh-glass', '', () => {});
}

// ---------- text ----------
const ha = (v) => (H.units.system === 'imperial' ? `${fmtNum(v * 2.471)} acres` : `${fmtNum(v)} ha (hectares)`);
function summaryHtml(R) {
  const gaps = [];
  if (!R.terrainOk) gaps.push('Terrain tiles are not on this phone for this view (offline and not saved), so no glassing spots. Go online or save the area in Offline Maps.');
  if (!R.haveMap) gaps.push(R.osm.tooMany ? 'The view is too big for the road check. Zoom in.' : 'Map detail tiles (roads) are not on this phone for this view, so no walk in zone. Go online or save the area in Offline Maps at full detail.');
  else if (R.osm.failed) gaps.push(`${R.osm.failed} of ${R.osm.got + R.osm.failed} map detail tiles were not available. Land near them is left unshaded (${R.unknownPct}% of the view).`);
  if (!R.fsr.ok) gaps.push('The BC Forest Service road layer could not be read here, so only OpenStreetMap roads count.');
  if (R.haveMap && !R.osm.wood) gaps.push('No forest is mapped here, so every slope counts as open. Real views may be blocked by trees.');
  if (!R.cuts) gaps.push('The cutblock and burn layers could not be read here, so logged and burned openings inside mapped forest are not counted.');
  if (R.cut) gaps.push('The view was bigger than 6 km, so only the middle 6 by 6 km was checked.');
  const list = R.spots.length ? R.spots.map((s, i) => `<button class="hh-spot" data-gs="${i}"><b>${s.n}</b><span>Sees about ${ha(s.ha)} of open slope<small>${H.units.elev(Math.round(s.elev))}, ${Math.round(s.relief)} m above the land around it, best view to the ${compass8(s.look)}</small></span></button>`).join('')
    : `<p class="hmm-muted">${R.terrainOk ? 'No high point with a wide view over open slope in this view. Thick forest hides most slopes here. Try an area with grassland, cutblocks or burns.' : ''}</p>`;
  return `
    <h3 class="hmm-h">Walk in zone</h3>
    ${R.haveMap ? `<p class="hh-big"><i class="hh-sw walk"></i> ${R.walkPct}% of the view is more than 1 km (0.6 mi) from any road or track on the map.</p>` : ''}
    ${R.haveMap && !R.fsr.ok ? '<p class="hh-gap"><b>Forest Service roads are missing from this check</b> (not on this phone, or no data here), so some shaded land may be close to a logging road.</p>' : ''}
    <p>${TIP} <b>Walk in zone: less pressure.</b> Most hunters stay close to roads, so land a long walk from any road usually sees fewer people and calmer animals. 1 km is a rule of thumb, not a rule.</p>
    <p class="hmm-muted">Roads: ${R.osm.roads} road and track lines from OpenStreetMap${R.fsr.ok ? ` and ${R.fsr.n} BC Forest Service road lines` : ''}. A road on the map can be gated, closed or gone, and some tracks are missing. Walk in land can still be private land or closed: check the land status layers and use “Can I hunt here now?”.</p>
    <h3 class="hmm-h">Glassing spots</h3>
    <p class="hmm-muted">${TIP} High points with the widest view over open slope within 2 km (1.2 mi). Open slope: 8 to 45° steep, not mapped as forest or water; cutblocks and burns up to 15 years old count as open. Tap a number for details.</p>
    ${list}
    ${gaps.length ? `<div class="hh-gaps"><b>What the app could not check</b><ul>${gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>` : ''}
    <p class="hmm-muted">Terrain from Terrain Tiles (Mapzen, AWS (Amazon Web Services) Open Data), about ${Math.round(R.cellM)} m grid. Roads, forest and water from OpenStreetMap contributors (OpenFreeMap) and the BC Data Catalogue. Done on your phone in ${fmtNum(R.ms / 1000, 1)} s.</p>`;
}
function spotSheet(i) {
  const s = last && last.spots[i]; if (!s) return;
  const body = H.openSheet({ title: `Glassing spot ${s.n}`, bar: 'tools', modal: false, onClose: peek(), html: `
    <div class="hmm-kv"><span>Elevation</span><b>${H.units.elev(Math.round(s.elev))}</b></div>
    <div class="hmm-kv"><span>Above the land around it (1 km)</span><b>${H.units.elev(Math.round(s.relief))}</b></div>
    <div class="hmm-kv"><span>Open slope it can see (2 km)</span><b>${ha(s.ha)}</b></div>
    <div class="hmm-kv"><span>Best view</span><b>To the ${compass8(s.look)}</b></div>
    <div class="hmm-kv"><span>Nearest road or track on the map</span><b>${isFinite(s.road) ? H.units.dist(s.road) : 'More than 2 km'}</b></div>
    ${s.wood ? '<p class="hmm-muted">Mapped as forest on top: trees may block the view. Look for a rock or opening.</p>' : ''}
    <ul class="hh-tips">
      <li>${TIP} Sit just below the top, not on the skyline, with something behind you.</li>
      <li>${TIP} Glass at first and last light, when animals feed in the open.</li>
      <li>Thermals: air rises uphill in the morning and sinks in the evening (75%, lesson <a href="#/s/wind-thermals/0">Wind and thermals</a>). In the morning a high seat keeps your scent above animals below you.</li>
    </ul>
    <div class="hmm-btnrow">
      ${H.terrain && H.terrain.viewshed ? '<button class="hmm-btn2" data-s="view">What can I see from here</button>' : ''}
      ${H.canHunt ? '<button class="hmm-btn2" data-s="can">Can I hunt here now?</button>' : ''}
      ${H.tools && H.tools.dropWaypoint ? '<button class="hmm-btn2" data-s="wpt">Save as a waypoint</button>' : ''}
      <button class="hmm-btn2" data-s="back">Back to the list</button></div>
    <p class="hmm-muted">${TIP} An estimate from terrain and map data. Scout it first.</p>${BANNER}` });
  map.easeTo({ center: s.ll, duration: 500 });
  const on = (k, fn) => { const b = body.querySelector(`[data-s="${k}"]`); if (b) b.onclick = fn; };
  on('view', () => { H.closeSheet(); H.terrain.viewshed(s.ll); });
  on('can', () => H.canHunt.open(s.ll));
  on('wpt', () => H.tools.dropWaypoint(s.ll, { name: `Glassing spot ${s.n}`, icon: 'glassing' }));
  on('back', () => open());
}
