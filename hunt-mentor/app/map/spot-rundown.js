/* Spot "Full rundown": one shared renderer for the map spot card (spots.js) and the plan's spot list (plan.js).
   Everything comes from data the app already has; nothing is invented:
   - the spot detail tile data/spots/<area>/detail/<tile>.json (same file and cache as the spot card)
   - the area index data/spots/<area>/index.geojson (camps nearby)
   - area report sources: habitat zones and motor vehicle closures (PMTiles point query, mvt.js), data/migration.json,
     data/seasons/region<N>.json, data/harvest/bc-harvest.json (big game only), terrain tiles (HuntMap.elevationAt, map only)
   - playbooks data/plans/species*.json (window.HMPlan._load) for the Tips.
   Work happens on open only, and the result is cached per spot (and plan dates).
   API: rundown(spot, ctx) -> Promise<{ html, wire(el) }>
     spot: { id, name, lng, lat, area?, detail? (detail tile props if already loaded) }
     ctx:  { H (HuntMap, map only), plan ({ species, from, to, mu } optional), manifest (optional), getJSON (optional),
             loadIndex(area) (optional, FeatureCollection), hasSession(id) (optional), onBack (optional) } */
import { esc, units, haversine, fmtNum, MONTH_NAMES, formatCoord } from './util.js';
import { queryPm } from './mvt.js';

const BANNER = 'Study aid only. The official regulations are the law.';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']; // same short names as the season data
const TZ = 'America/Vancouver';
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const num = (v) => (v == null || v === '' || isNaN(+v) ? null : +v);

// ---------- shared JSON cache (the spot card uses it too, so a detail tile is fetched once) ----------
const jcache = new Map();
const tiles = new Map(); // url -> resolved tile object, for camps whose detail is already loaded
export function getJSON(u) {
  if (!jcache.has(u)) {
    const p = fetch(u).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    p.then((v) => { if (/\/detail\//.test(u)) tiles.set(u, v); }, () => jcache.delete(u));
    jcache.set(u, p);
  }
  return jcache.get(u);
}
const safe = (p, ms = 8000) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);

let manP = null;
function manifestOf(ctx) {
  if (ctx.manifest) return Promise.resolve(ctx.manifest);
  if (!manP) manP = (ctx.getJSON || getJSON)('data/layers/manifest.json').catch((e) => { manP = null; throw e; });
  return manP;
}
const layerOf = (M, id) => ((M && M.layers) || []).find((l) => l.id === id);
const vq = (l, M) => `v=${encodeURIComponent((l && l.dataDate) || (M && M.updated) || '1')}`;
export function tileKey(l, lon, lat) { const d = +l.tileDeg || 0.25; return `${Math.floor(lon / d)}_${Math.floor(lat / d)}`; }
export function detailUrlFor(l, area, lon, lat) {
  if (!l || !l.detail || !area) return null;
  return `${l.detail.replace(/\{area\}/g, area).replace(/\{tile\}/g, tileKey(l, lon, lat))}?v=${encodeURIComponent(l.dataDate || '1')}`;
}
// PMTiles URL exactly as layers.js resolves it (same cache key in mvt.js as the area report)
function pmUrl(l, M, area) {
  if (!l || !l.file) return null;
  const f = l.file.replace(/\{area\}/g, area).replace(/\{area_lc\}/g, String(area).toLowerCase());
  const path = f.startsWith('data/') ? f : `data/layers/${f}`;
  return new URL(`${path}?${vq(l, M)}`, location.href).href;
}
function areaAt(M, lng, lat) {
  const b = (M && M.areaBoxes) || {};
  return Object.keys(b).find((a) => lng >= b[a][0] && lng <= b[a][2] && lat >= b[a][1] && lat <= b[a][3]) || null;
}

// ---------- dates (Pacific) ----------
const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const dAdd = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const dRange = (a, b) => { const out = []; for (let x = a; x <= b && out.length < 62; x = dAdd(x, 1)) out.push(x); return out; };
const dLabel = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'short', day: 'numeric' });
function openOn(r, mmdd) {
  if (r.allYear || r.dates === 'No closed season') return true;
  if (!r.open || !r.close) return false;
  return r.open <= r.close ? mmdd >= r.open && mmdd <= r.close : mmdd >= r.open || mmdd <= r.close;
}
const mdText = (mmdd) => { const [m, d] = String(mmdd).split('-').map(Number); return m && d ? `${MON[m - 1]} ${d}` : ''; };
// next saved plan from the app's own state (map only; the plan screen passes its plan)
function savedPlan(mu) {
  let S = null; try { S = JSON.parse(localStorage.getItem('hm.v1') || 'null'); } catch (e) { S = null; }
  const t = todayIso(), ps = ((S && S.plans) || []).filter((p) => p && p.from && p.to && p.to >= t);
  ps.sort((a, b) => ((b.where && b.where.mu === mu) - (a.where && a.where.mu === mu)) || (a.from < b.from ? -1 : 1));
  const p = ps[0]; return p ? { species: p.species, from: p.from, to: p.to, mu: p.where && p.where.mu } : null;
}

// ---------- species ----------
// tag: the spot pipeline species; mig: data/migration.json keys; season: data/seasons species names; harvest: bc-harvest.json
const SP = [
  { tag: 'deer', label: 'Mule deer', mig: ['muledeer'], season: ['mule deer'], harvest: 'mule deer', play: 'mule-deer', lesson: 'mule-deer' },
  { tag: 'deer', label: 'White tailed deer', mig: ['whitetail'], season: ['white tailed deer'], harvest: 'white tailed deer', play: 'white-tailed-deer', lesson: 'white-tailed-deer' },
  { tag: 'moose', label: 'Moose', mig: ['moose'], season: ['moose'], harvest: 'moose', play: 'moose', lesson: 'moose' },
  { tag: 'elk', label: 'Elk', mig: ['elk'], season: ['elk'], harvest: 'elk', play: 'elk', lesson: 'elk' },
  { tag: 'bear', label: 'Black bear', mig: ['blackbear'], season: ['black bear'], harvest: 'black bear', play: 'black-bear', lesson: 'black-bear' },
  { tag: 'grouse', label: 'Grouse', mig: ['ruffed', 'dusky', 'spruce'], season: ['grouse'], play: 'forest-grouse', lesson: 'grouse' },
  { tag: 'quail', label: 'California quail', mig: ['quail'], season: ['quail', 'california quail'], play: 'quail', lesson: 'upland-birds' },
  { tag: 'chukar', label: 'Chukar', mig: ['chukar'], season: ['chukar'], play: 'chukar', lesson: 'upland-birds' },
  { tag: 'duck', label: 'Ducks', mig: ['ducks'], season: ['ducks'], play: 'ducks', lesson: 'ducks', water: true },
  { tag: 'goose', label: 'Geese', mig: ['geese'], season: ['canada and cackling geese'], play: 'canada-geese', lesson: 'geese', water: true },
  { tag: 'turkey', label: 'Wild turkey', mig: [], season: ['turkey'], play: 'wild-turkey', lesson: 'wild-turkey' },
  { tag: 'sheep', label: 'Bighorn sheep', mig: ['bighorn'], season: ['bighorn sheep', 'mountain sheep'], harvest: 'mountain sheep', play: 'bighorn-sheep', lesson: 'mountain-sheep', cliffs: true },
  { tag: 'goat', label: 'Mountain goat', mig: ['goat'], season: ['mountain goat'], harvest: 'mountain goat', play: 'mountain-goat', lesson: 'mountain-goat', cliffs: true },
];
const ZONES = { BG: 'Bunchgrass', PP: 'Ponderosa Pine', IDF: 'Interior Douglas fir', MS: 'Montane Spruce', ESSF: 'Engelmann Spruce Subalpine fir', ICH: 'Interior Cedar Hemlock', SBS: 'Sub Boreal Spruce', SBPS: 'Sub Boreal Pine Spruce', CWH: 'Coastal Western Hemlock', CDF: 'Coastal Douglas fir', MH: 'Mountain Hemlock', IMA: 'Interior Mountain heather Alpine', CMA: 'Coastal Mountain heather Alpine', BAFA: 'Boreal Altai Fescue Alpine', BWBS: 'Boreal White and Black Spruce' };

// same rule as the area report (tools-insights.js bandLevel): zone and elevation inside the month band
function bandLevel(band, zone, elev) {
  const zIn = zone ? band.zones.includes(zone) : null;
  const eIn = elev == null ? null : elev >= band.elevM[0] && elev <= band.elevM[1];
  const eNear = elev == null ? null : !eIn && elev >= band.elevM[0] - 200 && elev <= band.elevM[1] + 200;
  if (zIn != null && eIn != null) { const s = (zIn ? 2 : 0) + (eIn ? 2 : eNear ? 1 : 0); return s >= 4 ? 3 : s === 3 ? 2 : s === 2 ? 1 : 0; }
  if (zIn != null) return zIn ? 2 : 0;
  if (eIn != null) return eIn ? 2 : eNear ? 1 : 0;
  return 1;
}

// ---------- gather (once per spot and plan) ----------
const cache = new Map();
export function rundown(spot, ctx = {}) {
  const plan = ctx.plan || savedPlan(spot.mu || (spot.detail && spot.detail.mu));
  const key = `${spot.id || `${spot.name}@${(+spot.lat).toFixed(4)},${(+spot.lng).toFixed(4)}`}|${plan ? `${plan.species}:${plan.from}:${plan.to}` : ''}`;
  if (!cache.has(key)) {
    const p = gather(spot, ctx, plan);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
    if (cache.size > 40) cache.delete(cache.keys().next().value);
  }
  return cache.get(key).then((D) => ({ html: render(D, ctx), wire: (el) => wire(el, D, ctx), data: D }));
}

async function gather(spot, ctx, plan) {
  const t0 = performance.now();
  const gj = ctx.getJSON || getJSON;
  const M = await manifestOf(ctx);
  const sl = layerOf(M, 'spots');
  let lng = +spot.lng, lat = +spot.lat;
  let area = spot.area || (spot.id && /^[A-Z]-/.test(spot.id) ? spot.id.split('-')[0] : null) || areaAt(M, lng, lat);
  const idxP = area ? (ctx.loadIndex ? ctx.loadIndex(area) : gj(`${sl.file.replace(/\{area\}/g, area)}?${vq(sl, M)}`)) : Promise.resolve(null);
  let id = spot.id, d = spot.detail && spot.detail.flags ? spot.detail : null;
  if (!id && !d) { // old saved plan: find the spot by name in the area index
    const fc = await safe(idxP);
    const hit = ((fc && fc.features) || []).filter((f) => (f.properties.name || f.properties._name) === spot.name)
      .sort((a, b) => haversine(a.geometry.coordinates, [lng, lat]) - haversine(b.geometry.coordinates, [lng, lat]))[0];
    if (hit) { id = hit.properties.id; [lng, lat] = hit.geometry.coordinates; }
  }
  if (!d && id) {
    const u = detailUrlFor(sl, area, lng, lat);
    const tile = u ? await gj(u) : null;
    d = tile && tile[id];
  }
  if (!d) throw new Error('No detail for this spot');
  const today = todayIso();
  const month = plan ? +plan.from.slice(5, 7) : +today.slice(5, 7);
  const tags = (Array.isArray(d.species) ? d.species : []).map((s) => String(s).toLowerCase());
  const mu = d.mu || spot.mu || null, region = d.region || (mu ? String(mu).split('-')[0] : null);
  const regFiles = !region ? [] : String(region) === '7' ? ['region7a', 'region7b'] : [`region${region}`];
  const big = SP.filter((s) => s.harvest && tags.includes(s.tag));
  const H = ctx.H && ctx.H.elevationAt ? ctx.H : null;
  const [idx, zoneHits, closeHits, mig, regs, playbook, harvest, steep] = await Promise.all([
    safe(idxP),
    area ? safe(queryPm(pmUrl(layerOf(M, 'habitat_zones'), M, area), lng, lat, 0)) : null,
    safe(queryPm(pmUrl(layerOf(M, 'closures'), M, 'BC'), lng, lat, 3000)),
    safe(gj('data/migration.json')),
    Promise.all(regFiles.map((f) => safe(gj(`data/seasons/${f}.json`)))),
    safe(window.HMPlan && window.HMPlan._load ? window.HMPlan._load() : null),
    big.length && mu ? safe(gj('data/harvest/bc-harvest.json'), 15000) : null,
    H ? safe(steepness(H, lng, lat), 6000) : null,
  ]);
  const zone = zoneHits && zoneHits[0] ? String(zoneHits[0].props.zone || zoneHits[0].props.label || '').replace(/[^A-Z].*$/, '') || null : null;
  const regRows = (regs || []).filter(Boolean).flatMap((R) => (R.rows || []).filter((r) => mu && (r.mus || []).includes(mu)).map((r) => ({ ...r, _src: R.source, _checked: R.checked })));
  return { spot, d, id, lng, lat, area, mu, region, plan, today, month, tags, idx, zone, zoneLayer: layerOf(M, 'habitat_zones'), closeHits, closeLayer: layerOf(M, 'closures'),
    mig, regRows, playbook, harvest, steep, sl, M, ms: Math.round(performance.now() - t0) };
}

// steepest ground around the spot from the terrain tiles: 8 directions at 150 m and 300 m
async function steepness(H, lng, lat) {
  const e0 = await H.elevationAt([lng, lat]); if (e0 == null) return null;
  const k = Math.cos((lat * Math.PI) / 180), pts = [];
  for (const r of [150, 300]) for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; pts.push([r, lng + (r * Math.sin(a)) / (111320 * k), lat + (r * Math.cos(a)) / 110574]); }
  const es = await Promise.all(pts.map(([, x, y]) => H.elevationAt([x, y]).catch(() => null)));
  let max = 0, lo = e0, hi = e0;
  es.forEach((e, i) => { if (e == null) return; max = Math.max(max, (Math.atan(Math.abs(e - e0) / pts[i][0]) * 180) / Math.PI); lo = Math.min(lo, e); hi = Math.max(hi, e); });
  return { deg: Math.round(max), relief: Math.round(hi - lo), e0 };
}

// ---------- small render helpers ----------
const badge = (c) => (c == null ? '' : ` <span class="srd-c ${c >= 95 ? 'hi' : c >= 80 ? 'mid' : c >= 60 ? 'lo' : 'tip'}">${esc(c)}%</span>`);
const TIP = ' <span class="srd-c tip">Tip</span>';
const EST = ' <span class="srd-c est">Estimate</span>';
const srcTxt = (...a) => { const t = a.filter(Boolean).join(', '); return t ? `<small>${esc(t)}</small>` : ''; };
const li = (html) => `<li>${html}</li>`;
// Lesson link: the first published lesson of [id, title] pairs (drafts are not in the app, so they get no link)
const published = (ctx, id) => (ctx.hasSession ? ctx.hasSession(id) : !(window.HM && Array.isArray(window.HM.sessions)) || window.HM.sessions.some((x) => x.id === id));
const lessonA = (ctx, id, title, ...alt) => {
  const pairs = [[id, title]]; for (let i = 0; i < alt.length; i += 2) pairs.push([alt[i], alt[i + 1]]);
  const hit = pairs.find(([x]) => published(ctx, x));
  return hit ? ` <a class="srd-l" href="#/s/${esc(hit[0])}">Lesson: ${esc(hit[1])}</a>` : '';
};
const planLine = (d, re) => { const x = (Array.isArray(d.plan) ? d.plan : []).find((t) => re.test(String(t))); return x ? String(x).replace(/^\s*[A-Za-z ]+:\s*/, '') : ''; };
const ev = (d) => (Array.isArray(d.evidence) ? d.evidence : []).map((e) => (typeof e === 'string' ? e : e.t || e.text || '')).filter(Boolean);
const noDot = (t) => String(t).replace(/\.\s*$/, '');
const CAT_LABEL = { drive: 'Drive to', atv: 'ATV (all terrain vehicle)', walk: 'Walk in', backcountry: 'Backcountry', camp: 'Camp' };
const slopeWords = (s) => (s == null ? '' : s < 5 ? 'flat' : s < 15 ? 'gentle' : s < 25 ? 'moderate' : s < 35 ? 'steep' : 'very steep');
const sec = (n, id, title, body) => `<details class="srd-sec" data-sec="${id}" open><summary><span class="srd-n">${n}</span>${esc(title)}</summary><ul class="srd-ul">${body}</ul></details>`;

function render(D, ctx) {
  const { d, lng, lat, plan, month } = D;
  const pc = D.sl && D.sl.cert != null ? D.sl.cert : 60, pdate = (D.sl && D.sl.dataDate) || '';
  const PIPE = `spot pipeline from BC open data${pdate ? `, ${pdate}` : ''}`;
  const park = Array.isArray(d.park) && d.park.length >= 2 ? [+d.park[0], +d.park[1]] : null;
  const evs = ev(d), cat = String(d.category || '').toLowerCase();
  const flagsTxt = (Array.isArray(d.flags) ? d.flags : []).map((f) => String(f.t || f.text || ''));
  const out = [];
  const planLbl = plan ? `${dLabel(plan.from)} to ${dLabel(plan.to)} ${plan.to.slice(0, 4)}` : '';
  const dec = `${lat.toFixed(5)}, ${lng.toFixed(5)}`, fmt = units.coords;

  // 1. Where exactly
  const drive = planLine(d, /^\s*Drive\s*:/i);
  const dm = drive.match(/from ([^,]+), about ([\d,.]+) km/i);
  const walkL = planLine(d, /^\s*(Walk|Ride|Walk or ride|Walk or drive slowly)\s*:/i);
  const w = [];
  w.push(li(`<b>${esc(d.name)}</b>, ${esc(CAT_LABEL[cat] || cap(cat))} spot${badge(pc)}${srcTxt(PIPE)}`));
  if (d.mu) w.push(li(`MU (Management Unit) ${esc(d.mu)}, Region ${esc(d.region || '')} ${esc(d.regionName || '')}${badge((d.flags || []).find((f) => /^MU/.test(f.t || ''))?.cert ?? 95)}${srcTxt('MU layer WAA_WILDLIFE_MGMT_UNITS_SVW')}`));
  w.push(li(`Coordinates: <b>${esc(dec)}</b> (decimal)${fmt !== 'dd' ? `<br>${esc(formatCoord(lng, lat, fmt))} (${fmt === 'utm' ? 'UTM (Universal Transverse Mercator), your setting' : 'degrees minutes seconds, your setting'})` : ''}`));
  if (d.elev != null) w.push(li(`Elevation ${esc(units.elev(d.elev))}, slope ${esc(d.slope)} degrees (${slopeWords(d.slope)}), ${esc(d.aspect || '')}${badge(pc)}${srcTxt('terrain model, ' + PIPE)}`));
  if (dm) w.push(li(`Drive: from ${esc(dm[1])}, about ${esc(dm[2])} km${EST}${srcTxt('straight line times 1.3, ' + PIPE)}`));
  if (Array.isArray(d.driveVia) && d.driveVia.length) w.push(li(`Route: ${d.driveVia.map(esc).join(', then ')}`));
  if (park) w.push(li(`Park at ${esc(`${park[1].toFixed(5)}, ${park[0].toFixed(5)}`)}: ${esc(d.parkWhat || 'parking point')}${haversine([lng, lat], park) > 30 ? `, ${esc(units.dist(haversine([lng, lat], park)))} straight line from the spot` : ''}`));
  const wk = num(d.walkKm), rk = num(d.rideKm);
  if (wk || rk) w.push(li(`${rk ? `Ride ${esc(fmtNum(rk, 1))} km` : `Walk ${esc(fmtNum(wk, wk < 1 ? 2 : 1))} km`}${num(d.climbM) ? `, climb about ${esc(fmtNum(d.climbM))} m` : ''}${num(d.walkMin) ? `, about ${esc(d.walkMin)} min one way at 3 km/h` : ''}${EST}`));
  if (walkL) w.push(li(`${esc(walkL)}`));
  w.push(`<li class="srd-acts">
    ${ctx.H ? '<button type="button" class="srd-btn" data-rd="fly">Open on Hunt Map</button>' : `<a class="srd-btn" href="#/map/@${lat.toFixed(5)},${lng.toFixed(5)},15">Open on Hunt Map</a>`}
    <a class="srd-btn" href="${esc(d.gdir || `https://www.google.com/maps/dir/?api=1&destination=${park ? `${park[1]},${park[0]}` : dec.replace(' ', '')}`)}" target="_blank" rel="noopener">Google Maps directions</a>
    <a class="srd-btn" href="${esc(d.apple || `https://maps.apple.com/?ll=${lat},${lng}`)}" target="_blank" rel="noopener">Apple Maps</a>
    <button type="button" class="srd-btn" data-rd="copy" data-copy="${esc(fmt !== 'dd' ? `${dec} (${formatCoord(lng, lat, fmt)})` : dec)}">Copy coordinates</button>
    ${ctx.H && ctx.H.insightsAt ? '<button type="button" class="srd-btn" data-rd="report">Area report</button>' : ''}</li>`);
  out.push(sec(1, 'where', 'Where exactly', w.join('')));

  // 2. What animals
  const a = [];
  const mmdd = D.today.slice(5), pdays = plan ? dRange(plan.from, plan.to) : [];
  const rowTxt = (r) => {
    const draw = r.none || r.leh || (!r.open && !r.allYear && r.dates !== 'No closed season');
    const on = !draw && openOn(r, mmdd), inPlan = plan && !draw && pdays.some((x) => openOn(r, x.slice(5)));
    const tag = /youth only/i.test(r.notes || '') ? ' (youth only)' : /bow only/i.test(r.notes || '') ? ' (bow only)' : /private land only/i.test(r.notes || '') ? ' (private land only)' : '';
    const dates = r.dates || (r.allYear ? 'No closed season' : r.open ? `${mdText(r.open)} to ${mdText(r.close)}` : '');
    return `${esc(cap(r.sp || r.species))}${r.cls || r.class ? `, ${esc(String(r.cls || r.class).toLowerCase())}` : ''}: ${esc(dates)}${esc(tag)}${r.limit ? `, ${esc(r.limit)}` : ''}${on && !tag ? ' <span class="srd-open">Open today</span>' : ''}${plan && !draw ? (inPlan && !tag ? ' <span class="srd-open">Open in your dates</span>' : ' <span class="srd-shut">Not in your dates</span>') : ''}${badge(r.cert)}${srcTxt(r.src || (r.page != null ? `Synopsis page ${r.page}` : ''))}`;
  };
  if (plan) a.push(li(`Your plan dates: ${esc(planLbl)}${plan.mu ? `, MU ${esc(plan.mu)}` : ''}`));
  const spRows = Array.isArray(d.seasonRows) ? d.seasonRows : [];
  if (D.tags.length) a.push(li(`This spot was picked for: <b>${esc(D.tags.map(cap).join(', '))}</b>${badge(pc)}${srcTxt(PIPE)}`));
  for (const r of spRows) a.push(li(rowTxt(r)));
  if (d.seasonNote) a.push(li(esc(d.seasonNote)));
  // also likely here (habitat estimate, same rule as the area report), with this MU's general seasons
  const M = D.mig && D.mig.species, likely = [];
  if (M && D.mu) {
    for (const s of SP) {
      if (D.tags.includes(s.tag) || s.cliffs || s.water || !s.mig.length) continue;
      const rows = D.regRows.filter((r) => s.season.includes(String(r.species).toLowerCase()));
      if (!rows.length) continue; // no general season row in this MU: the area report caps it to Low
      let best = 0, cert = null;
      for (const k of s.mig) { const b = M[k] && M[k].months && M[k].months[month]; if (b) { const l = bandLevel(b, D.zone, d.elev); if (l > best) { best = l; cert = b.cert; } } }
      if (best >= 2) likely.push({ s, lvl: best, cert, rows });
    }
  }
  if (likely.length) {
    a.push(li(`<b>Also likely here in ${esc(MONTH_NAMES[month - 1])}</b> (habitat zone and elevation, same rule as the area report)${EST}`));
    for (const x of likely) {
      const gen = x.rows.filter((r) => !/youth only|bow only/i.test(r.notes || ''));
      a.push(`<li class="srd-sub"><b>${esc(x.s.label)}</b>: ${x.lvl === 3 ? 'High' : 'Medium'}${badge(x.cert)}<ul>${(gen.length ? gen : x.rows).map((r) => li(rowTxt(r))).join('')}${gen.length < x.rows.length ? li(`${x.rows.length - gen.length} youth or bow only row${x.rows.length - gen.length === 1 ? '' : 's'} not shown`) : ''}</ul></li>`);
    }
  }
  // official harvest odds (big game) for the MU
  if (D.harvest && D.mu) {
    for (const s of SP.filter((x) => x.harvest && (D.tags.includes(x.tag) || likely.some((l) => l.s === x)))) {
      const rows = (D.harvest.rows || []).filter((r) => r.mu === D.mu && r.species === s.harvest && r.resident && r.year >= 2020 && r.year <= 2024);
      const g = rows.filter((r) => !r.lowConfidence && r.hunters >= 20 && r.kills != null);
      if (g.length >= 3) {
        const pct = (g.reduce((t, r) => t + r.kills, 0) / g.reduce((t, r) => t + r.hunters, 0)) * 100;
        a.push(li(`${esc(s.label)} harvest odds, MU ${esc(D.mu)}: <b>${Math.round(pct)}%</b> of resident hunters got one (2020 to 2024 average, ${g.length} years)${badge(90)}${srcTxt('BC Big Game Harvest Statistics 1976 to 2024, Hunter Sample estimates')}`));
      } else if (rows.length) a.push(li(`${esc(s.label)} harvest odds, MU ${esc(D.mu)}: too few hunters reported (under 20 a year) for a reliable %${srcTxt('BC Big Game Harvest Statistics')}`));
    }
  } else if (SP.some((s) => s.harvest && D.tags.includes(s.tag)) && !D.harvest) a.push(li('Harvest odds: not loaded. Open the app once with signal.'));
  if (!a.length) a.push(li('This is a camp spot. See the hunting spots nearby on the map.'));
  out.push(sec(2, 'animals', 'What animals', a.join('')));

  // 3. About the area
  const ab = [];
  if (D.zone) ab.push(li(`Habitat zone: <b>${esc(ZONES[D.zone] || D.zone)}</b> (${esc(D.zone)}), the plant community here${badge(D.zoneLayer && D.zoneLayer.cert)}${srcTxt('BEC (biogeoclimatic) zones layer')}${lessonA(ctx, 'bec-zones', 'BEC zones')}`));
  else ab.push(li('Habitat zone: not available here (layer not saved, or no signal).'));
  if (d.slope != null) ab.push(li(`Ground: ${slopeWords(d.slope)} (${esc(d.slope)} degrees). ${d.slope < 15 ? 'Easy walking and dragging.' : d.slope < 25 ? 'Steady climbing. Plan the drag downhill.' : 'Hard walking. Take it slow, plan the pack out.'}${TIP}`));
  const asp = String(d.aspect || '').toUpperCase();
  if (/^(S|SW|W|SE)\b/.test(asp)) ab.push(li(`${esc(d.aspect)}: sun warms it first and snow melts early. Mule deer winter range is steep south and west faces${badge(80)}${srcTxt('data/migration.json, mule deer January band')}`));
  else if (/^(N|NE|NW|E)\b/.test(asp)) ab.push(li(`${esc(d.aspect)}: cooler and shadier, often thicker timber. Good bedding cover on warm days${TIP}`));
  else if (asp) ab.push(li(`${esc(cap(d.aspect))} ground: wind and thermals matter more than the slope here${TIP}`));
  const recEv = (t) => /rec site \(official\)|campsites?\b/i.test(t);
  const water = evs.filter((t) => !recEv(t) && !/^Named water/i.test(t) && /^Water:|wetland|\blakes?\b|\bcreek|\briver|\bponds?\b|\bmarsh|\bslough/i.test(t));
  const cover = evs.filter((t) => !recEv(t) && !water.includes(t) && /cutblock|burn|edge|forest|zone|timber|cover|grass|browse|shrub|aspen/i.test(t));
  const other = evs.filter((t) => !recEv(t) && !water.includes(t) && !cover.includes(t));
  water.forEach((t) => ab.push(li(`Water: ${esc(t.replace(/^Water:\s*/i, ''))}${badge(pc)}`)));
  cover.forEach((t) => ab.push(li(`Cover and edges: ${esc(t)}${badge(pc)}`)));
  other.forEach((t) => ab.push(li(`${esc(t)}${badge(pc)}`)));
  if (d.pressure) ab.push(li(`How busy: <b>${esc(cap(d.pressure))}</b>. ${esc(d.pressureWhy || '')}${EST}${lessonA(ctx, 'pressure-push', 'hunting pressure')}`));
  out.push(sec(3, 'area', 'About the area', ab.join('')));

  // 4. What is available (only what the data says)
  const av = [];
  const camps = evs.find((t) => /campsites?/i.test(t));
  if (d.recName) av.push(li(`Official rec site: <b>${esc(d.recName)}</b>${camps ? `. ${esc(camps.replace(/^.*?:\s*/, ''))}` : ''}${badge(90)}${srcTxt('Recreation Sites and Trails BC (rec site layer)')}`));
  if (d.recDirections) av.push(li(`Official directions: ${esc(d.recDirections)}`));
  const campL = planLine(d, /^\s*Camp\s*:/i);
  if (campL) av.push(li(`Camp: ${esc(campL)}`));
  water.forEach((t) => av.push(li(`Water: ${esc(noDot(t.replace(/^Water:\s*/i, '')))}. Treat or filter it${TIP}`)));
  if (walkL) av.push(li(`Trail: ${/no trail/i.test(walkL) ? 'no trail mapped. Cross country.' : esc(walkL)}`));
  evs.filter((t) => /^Road:/i.test(t)).forEach((t) => av.push(li(esc(t))));
  if (d.parkWhat) av.push(li(`Parking: ${esc(d.parkWhat)}`));
  av.push(li(`${d.recName ? 'No other facilities are listed.' : 'No facilities are listed for this spot.'} Bring your own water, toilet kit and garbage bags${TIP}`));
  out.push(sec(4, 'avail', 'What is available', av.join('')));

  // 5. Where to camp
  const cp = [];
  if (cat === 'camp') cp.push(li(`<b>This spot is a camp candidate.</b>${campL ? ` ${esc(campL)}` : ''}${badge(pc)}`));
  else if (campL) cp.push(li(`Near the spot: ${esc(campL)}${badge(pc)}`));
  const near = nearestCamps(D, 3);
  if (near.length) {
    cp.push(li(`<b>Nearest camp spots</b> (straight line):`));
    for (const c of near) cp.push(`<li class="srd-sub">${esc(c.name)}, ${esc(units.dist(c.m))}${c.sites != null ? `, ${esc(c.sites)} campsite${c.sites === 1 ? '' : 's'} (official)` : ''}${c.mu ? `, MU ${esc(c.mu)}` : ''} ${ctx.H ? `<button type="button" class="srd-btn sm" data-rd="flyto" data-ll="${c.lng},${c.lat}">Map</button>` : `<a class="srd-btn sm" href="#/map/@${c.lat.toFixed(5)},${c.lng.toFixed(5)},15">Map</a>`}</li>`);
  } else if (cat !== 'camp') cp.push(li('No camp spots in the app data near here.'));
  cp.push(li(`Camping rules on Crown land and at rec sites: not in the app yet. <span class="srd-verify">VERIFY</span> with Recreation Sites and Trails BC. Check fire bans (BC Wildfire Service) before any fire.${lessonA(ctx, 'rb-where-you-can-hunt', 'Rule Book, where you can hunt')}${lessonA(ctx, 'maps-land-status', 'land status')}`));
  out.push(sec(5, 'camp', 'Where to camp', cp.join('')));

  // 6. Tips (opinion)
  const tp = [];
  const hunt = planLine(d, /^\s*Hunt\s*:/i), use = planLine(d, /^\s*Use\s*:/i);
  if (hunt) tp.push(li(`Hunt: ${esc(hunt)}${/\(Tip\)|my pick/.test(hunt) ? '' : TIP}`));
  if (use) tp.push(li(`Gear: ${esc(use)}`));
  const pb = D.playbook && D.playbook.byId;
  const plays = plan && pb && pb[plan.species] ? [pb[plan.species]] : SP.filter((s) => D.tags.includes(s.tag)).map((s) => pb && pb[s.play]).filter(Boolean).slice(0, 2);
  for (const sp of plays) {
    const ph = (sp.phases || []).find((x) => (x.months || []).includes(month));
    if (ph) {
      tp.push(li(`<b>${esc(sp.name)}, ${esc(ph.label)}</b> (${esc(MONTH_NAMES[month - 1])} playbook)${badge(ph.cert)}`));
      (ph.where || []).slice(0, 3).forEach((t) => tp.push(`<li class="srd-sub">Where: ${esc(t)}</li>`));
      (ph.when || []).slice(0, 4).forEach((t) => tp.push(`<li class="srd-sub">${esc(cap(t))}</li>`));
      (ph.tactics || []).slice(0, 3).forEach((t) => tp.push(`<li class="srd-sub">${esc(t)}</li>`));
    }
    const tac = pickTactic(sp.tactics || [], cat);
    if (tac) tp.push(li(`For ${cat === 'atv' ? 'an ATV (all terrain vehicle)' : `a ${esc(cat)}`} spot: <b>${esc(tac.name)}</b>${tac.best ? `. Best: ${esc(tac.best)}` : ''}${TIP}${(tac.steps || []).length ? `<ul>${tac.steps.slice(0, 4).map((s) => li(esc(s))).join('')}</ul>` : ''}`));
  }
  tp.push(li(`${windTip(d.aspect)}${TIP}${lessonA(ctx, 'wind-thermals', 'wind and thermals')}`));
  out.push(sec(6, 'tips', 'Tips', tp.join('')));

  // 7. Key things to know and legal
  const lg = [`<li class="srd-banner">${BANNER}</li>`];
  for (const f of d.flags || []) lg.push(li(`${esc(f.t || f.text || '')}${badge(num(f.cert))}${srcTxt(f.src || f.source, f.date ? `data ${f.date}` : '')}${f.cwd ? lessonA(ctx, 'cwd', 'CWD (Chronic Wasting Disease)') : ''}`));
  const closures = closureList(D);
  for (const c of closures) lg.push(li(`${c.m === 0 ? 'Inside' : `${esc(units.dist(c.m))} away`}: ${esc(c.name)}${c.type ? ` (${esc(c.type)})` : ''}${c.dates ? `. ${esc(c.dates)}` : ''}${c.exemption ? `. Exemption: ${esc(c.exemption)}` : ''}${badge(D.closeLayer && D.closeLayer.cert)}${srcTxt('Motor vehicle closures layer', D.closeLayer && D.closeLayer.dataDate ? `data ${D.closeLayer.dataDate}` : '')}`));
  if (!flagsTxt.some((t) => /private land/i.test(t))) lg.push(li('No private land flag within the checked distance. Private land can still be unsigned: check posted signs.'));
  const verify = planLine(d, /^\s*Verify\s*:/i);
  if (verify) lg.push(li(esc(verify)));
  lg.push(li(`Seasons above are general open seasons only. LEH (Limited Entry Hunting) draws and in season changes are not all shown.${D.region ? lessonA(ctx, `rb-region-${String(D.region).toLowerCase()}`, `Rule Book, Region ${D.region}`) : ''}`));
  out.push(sec(7, 'legal', 'Key things to know and legal', lg.join('')));

  // 8. Risks and hazards (from data only; each says why and links the lesson)
  out.push(sec(8, 'risks', 'Risks and hazards', hazards(D, ctx, { evs, water, flagsTxt, cat, dm, wk, rk, closures }).join('')));

  return `<div class="srd" data-ms="${D.ms}">
    ${ctx.onBack ? '<button type="button" class="srd-btn srd-back" data-rd="back">Back to the spot card</button>' : ''}
    <p class="srd-muted">Candidate spot, my pick from open data. Scout it first. Facts show certainty and source. Tip means opinion.</p>
    ${out.join('')}
    <p class="srd-muted">${esc(BANNER)}</p></div>`;
}

function nearestCamps(D, n) {
  const feats = (D.idx && D.idx.features) || [], here = [D.lng, D.lat], out = [];
  for (const f of feats) {
    const p = f.properties || {}, c = f.geometry && f.geometry.coordinates;
    if (!c || (p.cat || p._cat) !== 'camp' || p.id === D.id) continue;
    out.push({ id: p.id, name: p.name || p._name, mu: p.mu, lng: c[0], lat: c[1], m: haversine(here, c) });
  }
  out.sort((a, b) => a.m - b.m);
  const top = out.slice(0, n);
  // campsites: only from detail tiles already loaded (no extra download)
  for (const c of top) {
    const u = D.sl && D.area ? detailUrlFor(D.sl, D.area, c.lng, c.lat) : null, t = u && tiles.get(u), cd = t && t[c.id];
    const e = cd && ev(cd).find((x) => /(\d+) campsites?/i.test(x));
    if (e) c.sites = +e.match(/(\d+) campsites?/i)[1];
  }
  return top;
}
function closureList(D) {
  const seen = new Set(), out = [];
  for (const h of (D.closeHits || []).sort((a, b) => a.dist - b.dist)) {
    const p = h.props || {}, name = p.name || p.NAME || 'Closed area';
    if (seen.has(name)) continue; seen.add(name);
    out.push({ name, type: p.type, dates: p.dates, exemption: p.exemption, m: Math.round(h.dist) });
    if (out.length >= 4) break;
  }
  return out;
}
function pickTactic(ts, cat) {
  const re = { drive: /glass|sit|edge|road|field|decoy|pond/i, atv: /ride|glass|edge|walk/i, walk: /still|walk|stalk|edge|jump|decoy/i, backcountry: /backpack|stalk|still|glass|ridge|call/i, camp: /glass|sit/i }[cat];
  return (re && ts.find((t) => re.test(`${t.name} ${t.best || ''}`))) || ts[0] || null;
}
function windTip(aspect) {
  const a = String(aspect || '').toUpperCase();
  const base = 'Thermals: morning sun warms slopes and air drifts uphill; evening slopes cool and air sinks downhill (75%, Wind and thermals lesson). So in the morning hunt from above, in the evening from below';
  if (/^(S|SE|SW)\b/.test(a)) return `${base}. This ${esc(aspect)} slope warms early, so the uphill drift starts sooner in the morning`;
  if (/^(N|NE|NW)\b/.test(a)) return `${base}. This ${esc(aspect)} slope stays cool longer, so the switch comes later`;
  if (/^(E)\b/.test(a)) return `${base}. This east facing slope gets the first sun, so the morning switch is early`;
  if (/^(W)\b/.test(a)) return `${base}. This west facing slope holds afternoon sun, so the evening switch is late`;
  return `${base}. Flat ground: play the steady wind and keep the animals upwind of you`;
}

function hazards(D, ctx, X) {
  const { d } = D, h = [];
  const L = (...a) => lessonA(ctx, ...a);
  const st = D.steep, steepDeg = Math.max(st ? st.deg : 0, num(d.slope) || 0);
  if (steepDeg >= 30) h.push(li(`<b>Steep ground</b>: about ${steepDeg} degrees ${st && st.deg >= (num(d.slope) || 0) ? 'within 300 m (from terrain tiles)' : 'at the spot'}. Slopes of 30 degrees and up are avalanche terrain in snow, and slips hurt${TIP}${L('topo-deep-dive', 'Topo deep dive (slope angles)', 'maps-terrain', 'Maps 1, reading terrain')}`));
  else if (st) h.push(li(`Steepest ground within 300 m: about ${st.deg} degrees, ${st.relief} m up and down${EST}${srcTxt('terrain tiles')}`));
  const elev = num(d.elev), m = D.month;
  if (elev != null && elev >= 1200 && [10, 11].includes(m)) h.push(li(`<b>Snow</b>: at ${esc(units.elev(elev))} in ${esc(MONTH_NAMES[m - 1])}, snow can come early and roads can ice${EST}${TIP} Carry chains and warm layers.${L('cold-injuries', 'cold weather', 'bush-safety', 'bush safety (hypothermia)')}`));
  if (X.water.length || /wetland|lake|river|creek/i.test(d.name || '')) h.push(li(`<b>Water</b>: ${esc(noDot(String(X.water[0] || d.name).replace(/^Water:\s*/i, '')))}. Cold water, soft banks and crossings. Never cross fast water alone${TIP}${L('water-safety', 'water safety')}`));
  const km = X.dm ? +String(X.dm[2]).replace(/,/g, '') : null;
  const remote = d.pressure === 'remote' || (km && km >= 80) || (X.wk && X.wk >= 3) || (X.rk && X.rk >= 5);
  if (remote) h.push(li(`<b>Remote</b>: ${[km ? `about ${km} km drive` : '', X.wk ? `${fmtNum(X.wk, 1)} km walk` : '', X.rk ? `${fmtNum(X.rk, 1)} km ride` : '', d.pressure === 'remote' ? 'far from a drivable road' : ''].filter(Boolean).join(', ')}. Help is hours away. Leave a trip plan with someone at home${TIP}${L('bush-safety', 'bush safety (trip plan)')}${L('field-first-aid', 'first aid')}`));
  const roads = [...(d.driveVia || []), d.parkWhat || '', ...X.evs.filter((t) => /^Road:/i.test(t))].join(' ');
  if (/\bFSR\b|forest service|gravel|main\b/i.test(roads)) h.push(li(`<b>Gravel and FSR (Forest Service Road) driving</b>: logging trucks own the road. Drive slow, lights on, pull over for trucks. Carry a spare tire and know how to change it${TIP}${L('atv-rules', 'ATV rules (FSR section)')}${L('pack-kit', 'pack and car kit')}`));
  if (X.cat === 'atv') h.push(li(`ATV (all terrain vehicle) on an FSR: driver's licence and at least $200,000 liability insurance${badge(98)}${srcTxt('Off Road Vehicle Act, see the ATV rules lesson')}`));
  h.push(li(`<b>Bear country</b>: carry bear spray where you can reach it, make noise in thick cover, keep a clean camp and a clean kill site${TIP}${L('bush-safety', 'bush safety (bears and cougars)')}`));
  h.push(li(`<b>No cell signal</b>: assume none here. Download this area for offline use, carry a paper map and compass, and a satellite messenger if you have one${TIP}${L('gps-phone-battery', 'GPS and phone battery', 'maps-navigation', 'Maps 2, navigation')}`));
  if (d.pressure === 'busier') h.push(li(`<b>Other hunters</b>: ${esc(d.pressureWhy || 'busier spot')}. Wear orange, know where others are, be sure of your target and beyond${TIP}${L('firearm-safety', 'firearm safety')}`));
  const near = X.flagsTxt.filter((t) => /closed area|closure|Route enters|Route crosses|no hunting|no shooting|Hwy/i.test(t));
  if (near.length || X.closures.length) h.push(li(`<b>Closures and no shooting areas nearby</b>: ${near.length + X.closures.length} listed in Key things to know. Check the synopsis map before you drive or shoot${L('maps-land-status', 'land status')}`));
  return h;
}

function wire(el, D, ctx) {
  injectStyle();
  const H = ctx.H;
  el.querySelectorAll('[data-rd]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.rd;
    if (k === 'copy') {
      const t = b.dataset.copy, done = () => { if (H && H.toast) H.toast('Copied'); else b.textContent = 'Copied'; };
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(done, () => { if (H && H.toast) H.toast(t, 5000); else window.prompt('Copy', t); });
    } else if (k === 'fly' && H) { H.closeSheet(); H.flyTo(D.lng, D.lat, 15); } else if (k === 'flyto' && H) { const [x, y] = b.dataset.ll.split(',').map(Number); H.closeSheet(); H.flyTo(x, y, 15); } else if (k === 'report' && H) H.insightsAt([D.lng, D.lat], D.d.name);
    else if (k === 'back' && ctx.onBack) ctx.onBack();
  }));
}

let styled = false;
function injectStyle() {
  if (styled) return; styled = true;
  const s = document.createElement('style'); s.id = 'srd-style';
  s.textContent = `
.srd { --srd-ink: var(--hmm-ink, var(--ink, #1f2a1f)); --srd-muted: var(--hmm-muted, var(--muted, #5d665a)); --srd-line: var(--hmm-line, var(--line, #d5d9cf)); --srd-card: var(--hmm-card, var(--card, #fff)); --srd-accent: var(--hmm-accent, var(--accent, #c4561a)); color: var(--srd-ink); }
.srd-muted { color: var(--srd-muted); font-size: .9em; margin: 6px 0; }
.srd-sec { border-top: 1px solid var(--srd-line); padding: 4px 0; }
.srd-sec > summary { min-height: 44px; display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.05em; cursor: pointer; list-style: none; }
.srd-sec > summary::-webkit-details-marker { display: none; }
.srd-sec > summary::after { content: '\\25BE'; margin-left: auto; color: var(--srd-muted); }
.srd-sec:not([open]) > summary::after { content: '\\25B8'; }
.srd-n { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--srd-accent); color: #fff; font-size: .85em; flex: none; }
.srd-ul { margin: 0 0 8px; padding-left: 20px; }
.srd-ul li { margin: 6px 0; line-height: 1.4; overflow-wrap: anywhere; }
.srd-ul li small { display: block; color: var(--srd-muted); font-size: .82em; }
.srd-ul li.srd-sub { list-style: circle; margin-left: 12px; }
.srd-ul li.srd-acts { list-style: none; margin-left: -20px; display: flex; flex-wrap: wrap; gap: 8px; }
.srd-ul li.srd-banner { list-style: none; margin-left: -20px; padding: 10px 12px; border-radius: 10px; background: var(--hmm-warn-bg, var(--warn-bg, #fff4d6)); font-weight: 700; }
.srd-btn { min-height: 44px; padding: 0 14px; border-radius: 12px; border: 1.5px solid var(--srd-line); background: var(--srd-card); color: var(--srd-ink) !important; font: inherit; font-weight: 600; display: inline-flex; align-items: center; text-decoration: none; cursor: pointer; }
.srd-btn.sm { min-height: 36px; padding: 0 10px; font-size: .9em; margin-left: 4px; vertical-align: middle; }
.srd-back { margin: 0 0 6px; }
.srd-c { display: inline-block; padding: 0 6px; border-radius: 8px; font-size: .78em; font-weight: 700; line-height: 1.6; vertical-align: 1px; white-space: nowrap; }
.srd-c.hi { background: #d8efd9; color: #17501d; } .srd-c.mid { background: #e6efcf; color: #3d5113; } .srd-c.lo { background: #fbe9c6; color: #6a4500; }
.srd-c.tip { background: #e5e1f3; color: #3f2f7a; } .srd-c.est { background: #e3edf5; color: #1d4466; }
.srd-open { display: inline-block; padding: 0 6px; border-radius: 8px; background: #2e7d32; color: #fff; font-size: .78em; font-weight: 700; white-space: nowrap; }
.srd-shut { display: inline-block; padding: 0 6px; border-radius: 8px; background: #eceae4; color: #5d5a50; font-size: .78em; white-space: nowrap; }
.srd-verify { font-weight: 700; color: #a3360f; }
.srd-l { display: inline-block; margin-left: 4px; font-weight: 600; color: var(--srd-accent); }
`;
  document.head.appendChild(s);
}
