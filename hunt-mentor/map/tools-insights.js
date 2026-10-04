/* Hunt Map plugin: Area report (INSIGHTS.md). H.insightsAt([lng, lat], name) opens it for any point.
   Opens from the long press menu, the Insights bar (map centre), waypoint and wind cards, and by tapping empty map
   while the report is open. Everything is worked out on the phone from cached files: MU (Management Unit) layer,
   habitat zones, winter ranges, wetlands, cutblocks, burns, land status layers, data/migration.json,
   data/seasons/*.json, data/harvest/bc-harvest.json and the species lessons (area-lessons.js). Wind needs signal.
   Likelihood is an estimate (habitat based), never a fact: the rule is in INSIGHTS.md. */
import { esc, compass8, pointInGeom, haversine, bboxOf, monthsText, MONTH_NAMES, fmtNum } from './util.js';
import * as layers from './layers.js';
import * as spots from './spots.js';
import { queryPm } from './mvt.js';
import { LESSONS } from './area-lessons.js';

let H, map, active = false, tapMk = null, tok = 0;
const MENTOR = () => (window.HuntMentor && window.HuntMentor.mentorUrl) || ''; // app.js MENTOR_URL
const BANNER_TXT = 'Study aid only. The official regulations are the law.';
const BANNER = `<div class="hmm-banner">${BANNER_TXT}</div>`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LEVELS = ['Unlikely', 'Low', 'Medium', 'High'];
const LCLS = ['un', 'lo', 'me', 'hi'];
const ZONES = { BG: 'Bunchgrass', PP: 'Ponderosa Pine', IDF: 'Interior Douglas fir', MS: 'Montane Spruce', ESSF: 'Engelmann Spruce Subalpine fir', ICH: 'Interior Cedar Hemlock', SBS: 'Sub Boreal Spruce', SBPS: 'Sub Boreal Pine Spruce', CWH: 'Coastal Western Hemlock', CDF: 'Coastal Douglas fir', MH: 'Mountain Hemlock', IMA: 'Interior Mountain heather Alpine', CMA: 'Coastal Mountain heather Alpine', BAFA: 'Boreal Altai Fescue Alpine', BWBS: 'Boreal White and Black Spruce' };
const HARVEST_SRC = 'BC Big Game Harvest Statistics 1976 to 2024, BC Data Catalogue, updated 2026-09-14';

// Species in the report. mig: keys in data/migration.json; season: names in data/seasons; harvest: name in bc-harvest.json.
const SPECIES = [
  { key: 'muledeer', label: 'Mule deer', mig: ['muledeer'], season: ['mule deer'], harvest: 'mule deer', uwr: 'uwr_mule_deer', boost: ['cut', 'burn'] },
  { key: 'whitetail', label: 'White tailed deer', mig: ['whitetail'], season: ['white tailed deer'], harvest: 'white tailed deer', uwr: 'uwr_wt_deer', boost: ['cut', 'burn'] },
  { key: 'moose', label: 'Moose', mig: ['moose'], season: ['moose'], harvest: 'moose', uwr: 'uwr_moose', boost: ['cut', 'burn', 'wet'] },
  { key: 'elk', label: 'Elk', mig: ['elk'], season: ['elk'], harvest: 'elk', uwr: 'uwr_elk', boost: ['cut', 'burn'] },
  { key: 'blackbear', label: 'Black bear', mig: ['blackbear'], season: ['black bear'], harvest: 'black bear', boost: ['cut', 'burn'] },
  { key: 'sheep', label: 'Mountain sheep', mig: ['bighorn'], season: ['bighorn sheep', 'thinhorn sheep', 'mountain sheep'], harvest: 'mountain sheep', uwr: 'uwr_sheep', cliffs: true },
  { key: 'goat', label: 'Mountain goat', mig: ['goat'], season: ['mountain goat'], harvest: 'mountain goat', uwr: 'uwr_goat', cliffs: true },
  { key: 'grouse', label: 'Grouse', mig: ['ruffed', 'dusky', 'spruce'], season: ['grouse', 'sharp tailed grouse', 'ptarmigan'], boost: ['cut'] },
  { key: 'ducks', label: 'Ducks', mig: ['ducks'], season: ['ducks'], fed: /^(ducks|coot|snipe)$/, water: true },
  { key: 'geese', label: 'Geese', mig: ['geese'], season: ['canada and cackling geese', 'snow and ross geese', 'white fronted geese'], fed: /geese|brant/, water: true },
  { key: 'quail', label: 'Quail', mig: ['quail'], season: ['quail', 'california quail'] },
  { key: 'turkey', label: 'Wild turkey', mig: [], season: ['turkey'] },
];

export default function init(api) {
  H = api; map = H.map;
  H.insightsAt = insightsAt;
  H.setBarAction('insights', () => insightsAt());
  addStyle();
  // Insights tool active (report open): a tap on empty map moves the report there. Spot markers still open their card.
  H.onClick((e) => {
    if (!active || !H.els || H.els.sheet.hidden) return false;
    const ids = layers.layerList().map((l) => layers.stateOf(l.id)).filter((st) => st && st.spot && st.added).flatMap((st) => st.mapIds).filter((id) => map.getLayer(id));
    if (ids.length) { const pt = e.point; if (map.queryRenderedFeatures([[pt.x - 12, pt.y - 12], [pt.x + 12, pt.y + 12]], { layers: ids }).length) return false; }
    insightsAt([e.lngLat.lng, e.lngLat.lat]);
    return true;
  });
}

// ---------- moon (mean synodic month from the new moon of 6 January 2000, 18:14 UTC; good to about a day) ----------
export function moon(date = new Date()) {
  const syn = 29.530588853, age = ((((date - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % syn) + syn) % syn;
  const lit = Math.round(((1 - Math.cos((2 * Math.PI * age) / syn)) / 2) * 100);
  const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  return { age, lit, name: names[Math.round((age / syn) * 8) % 8] };
}

// ---------- small helpers ----------
const cert = (v) => H.ui.cert(v);
const tip = '<span class="hmm-cert tip">Tip</span>';
const jsonCache = new Map();
function getJSON(u) {
  if (!jsonCache.has(u)) {
    const p = fetch(u).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    jsonCache.set(u, p); p.catch(() => jsonCache.delete(u));
  }
  return jsonCache.get(u);
}
const safe = (p) => Promise.resolve(p).catch(() => null);
function todayPacific() {
  const tz = (window.HuntMentor && window.HuntMentor.TZ) || 'America/Vancouver';
  const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: tz }).split('-').map(Number);
  return { y, m, d, t: Date.UTC(y, m - 1, d) };
}
const fmtMD = (md) => { const [m, d] = String(md).split('-').map(Number); return m && d ? `${d} ${MON[m - 1]}` : String(md); };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const bandTxt = (b) => `${fmtNum(b[0])} to ${fmtNum(b[1])} m`;
const cap = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);
const zoneTxt = (z) => (ZONES[z] ? `${z} (${ZONES[z]})` : z);

// ---------- geometry for GeoJSON features ----------
const fbox = new WeakMap();
function boxOf(f) { let b = fbox.get(f); if (!b) { b = bboxOf(f) || [0, 0, 0, 0]; fbox.set(f, b); } return b; }
function geoDist(f, p, radius) {
  const b = boxOf(f), k = Math.cos((p[1] * Math.PI) / 180), dx = (radius / 111320) / k, dy = radius / 110574;
  if (p[0] < b[0] - dx || p[0] > b[2] + dx || p[1] < b[1] - dy || p[1] > b[3] + dy) return null;
  const g = f.geometry; if (!g) return null;
  if ((g.type === 'Polygon' || g.type === 'MultiPolygon') && pointInGeom(p, g)) return 0;
  const X = (c) => (c[0] - p[0]) * 111320 * k, Y = (c) => (c[1] - p[1]) * 110574;
  let d = Infinity;
  const seg = (a, c) => {
    const ax = X(a), ay = Y(a), bx = X(c), by = Y(c), vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    let t = l2 ? -(ax * vx + ay * vy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    d = Math.min(d, Math.hypot(ax + t * vx, ay + t * vy));
  };
  const line = (cs) => { if (cs.length === 1) d = Math.min(d, Math.hypot(X(cs[0]), Y(cs[0]))); for (let i = 1; i < cs.length; i++) seg(cs[i - 1], cs[i]); };
  if (g.type === 'Point') d = Math.hypot(X(g.coordinates), Y(g.coordinates));
  else if (g.type === 'LineString') line(g.coordinates);
  else if (g.type === 'MultiLineString' || g.type === 'Polygon') g.coordinates.forEach(line);
  else if (g.type === 'MultiPolygon') g.coordinates.forEach((poly) => poly.forEach(line));
  return d <= radius ? d : null;
}

/** Features of a manifest layer inside or within radius (m) of p. { state: ok | nodata | missing, layer, hits: [{ props, dist }] } */
async function nearLayer(id, p, radius = 0) {
  await layers.loadManifest();
  const st = layers.stateOf(id); if (!st || st.unsupported) return { state: 'missing', hits: [] };
  const k = Math.cos((p[1] * Math.PI) / 180), pad = radius / 111000 / k + 0.005;
  const files = st.files.filter((f) => !f.box || (p[0] >= f.box[0] - pad && p[0] <= f.box[2] + pad && p[1] >= f.box[1] - pad && p[1] <= f.box[3] + pad));
  if (!files.length) return { state: 'nodata', layer: st.l, hits: [] };
  const hits = []; let ok = 0;
  await Promise.all(files.map(async (f) => {
    try {
      if (/\.pmtiles(\?|$)/i.test(f.url)) {
        for (const h of await queryPm(new URL(f.url, location.href).href, p[0], p[1], radius)) hits.push({ props: h.props, dist: h.dist });
      } else {
        const fc = st.pm ? await getJSON(f.url) : await layers.getLayerData(id, { near: p }).then((x) => x || getJSON(f.url));
        for (const ft of (fc && fc.features) || []) { const d = geoDist(ft, p, radius); if (d != null) hits.push({ props: ft.properties || {}, dist: d, f: ft }); }
      }
      ok++;
    } catch (err) { /* offline and not saved: counted as no data */ }
  }));
  hits.sort((a, b) => a.dist - b.dist);
  return { state: ok ? 'ok' : 'nodata', layer: st.l, hits };
}

// ---------- gather everything for a point ----------
async function gather(p) {
  const t0 = performance.now();
  const L = (id, r) => safe(nearLayer(id, p, r));
  const [elev, mu, mig, harvest, mf, hab, wet, duck, cut, burn, roads, parks, reserves, city, wma, priv, clos, leh, spotsR,
    uMd, uWt, uMo, uEl, uSh, uGo] = await Promise.all([
    safe(H.elevationAt(p)), safe(layers.muAt(p)), safe(getJSON('data/migration.json')), safe(getJSON('data/harvest/bc-harvest.json')),
    safe(getJSON('data/seasons/migratory.json')),
    L('habitat_zones', 0), L('wetlands', 1000), L('duck_waters', 1000), L('cutblocks', 1000), L('burns', 3000), L('forest_roads', 6000),
    L('parks', 0), L('reserves', 0), L('city_limits', 0), L('wma', 0), L('private_land', 0), L('closures', 0), L('leh', 0), L('spots', 5000),
    L('uwr_mule_deer', 5000), L('uwr_wt_deer', 5000), L('uwr_moose', 5000), L('uwr_elk', 5000), L('uwr_sheep', 5000), L('uwr_goat', 5000),
  ]);
  const muId = mu && mu.state === 'ok' ? mu.id : null;
  const region = muId ? muId.split('-')[0] : null;
  const regFiles = !region ? [] : region === '7' ? ['region7a', 'region7b'] : [`region${region}`];
  const regs = (await Promise.all(regFiles.map((f) => safe(getJSON(`data/seasons/${f}.json`))))).filter(Boolean);
  const t1 = performance.now();
  return { p, elev, mu, muId, region, mig, harvest, mf, regs, hab, wet, duck, cut, burn, roads, parks, reserves, city, wma, priv, clos, leh, spotsR,
    uwr: { uwr_mule_deer: uMd, uwr_wt_deer: uWt, uwr_moose: uMo, uwr_elk: uEl, uwr_sheep: uSh, uwr_goat: uGo }, tLoad: t1 - t0 };
}

// ---------- likelihood (estimate, habitat based; the rule is in INSIGHTS.md) ----------
function bandLevel(band, zone, elev) {
  const zIn = zone ? band.zones.includes(zone) : null;
  const eIn = elev == null ? null : elev >= band.elevM[0] && elev <= band.elevM[1];
  const eNear = elev == null ? null : !eIn && elev >= band.elevM[0] - 200 && elev <= band.elevM[1] + 200;
  let lvl;
  if (zIn != null && eIn != null) { const s = (zIn ? 2 : 0) + (eIn ? 2 : eNear ? 1 : 0); lvl = s >= 4 ? 3 : s === 3 ? 2 : s === 2 ? 1 : 0; }
  else if (zIn != null) lvl = zIn ? 2 : 0;
  else if (eIn != null) lvl = eIn ? 2 : eNear ? 1 : 0;
  else lvl = 1;
  return { lvl, zIn, eIn, eNear };
}
const uwrMonths = (props, layer) => {
  const k = props.monthsKey || (Array.isArray(props.months) ? `,${props.months.join(',')},` : typeof props.months === 'string' ? props.months : '');
  const m = String(k).split(/[^\d]+/).filter(Boolean).map(Number).filter((x) => x >= 1 && x <= 12);
  return m.length ? m : (layer && layer.months) || [];
};

function assess(sp, D) {
  const zone = D.zone, elev = D.elev, month = D.month, out = { sp, months: [], ev: [], caps: [] };
  const M = D.mig && D.mig.species;
  const rowsHere = D.seasonRows.filter((r) => sp.season.includes(r.species));
  const regionHas = D.regs.some((R) => (R.rows || []).some((r) => sp.season.includes(r.species)));
  const fedHas = sp.fed && D.fedRows.some((r) => sp.fed.test(r.species) && r.open);
  // base level per month
  const base = [];
  if (sp.mig.length && M) {
    for (let m = 1; m <= 12; m++) {
      let best = { lvl: 0 };
      for (const k of sp.mig) { const b = M[k] && M[k].months && M[k].months[m]; if (b) { const r = bandLevel(b, zone, elev); if (r.lvl > best.lvl || !best.band) best = { ...r, band: b, k }; } }
      base.push(best);
    }
    const cur = base[month - 1];
    for (const k of sp.mig) {
      const b = M[k] && M[k].months && M[k].months[month]; if (!b) continue;
      const r = bandLevel(b, zone, elev), name = sp.mig.length > 1 ? `${M[k].label}: h` : 'H';
      if (zone) out.ev.push({ ok: r.zIn, t: `${name}abitat zone ${zoneTxt(zone)} is ${r.zIn ? '' : 'not '}in the ${MONTH_NAMES[month - 1]} band (${b.zones.join(', ')})`, c: b.cert });
      if (elev != null) out.ev.push({ ok: r.eIn, t: `${name.replace(/[hH]$/, (c) => (c === 'H' ? 'E' : 'e'))}levation ${fmtNum(Math.round(elev))} m is ${r.eIn ? 'inside' : r.eNear ? 'within 200 m of' : 'outside'} the ${MONTH_NAMES[month - 1]} band (${bandTxt(b.elevM)})`, c: b.cert });
    }
    if (!zone) out.ev.push({ ok: null, t: 'Habitat zone unknown here (layer not loaded or no data), so only elevation counts' });
    if (elev == null) out.ev.push({ ok: null, t: 'Elevation unknown (terrain tiles not available offline here)' });
    out.where = cur.band && { t: cur.band.where, c: cur.band.cert, label: M[cur.k] && M[cur.k].label };
  } else {
    // turkey: no month band in the data. The lesson: valleys and foothill forest edges (75%), so not subalpine or alpine zones.
    const high = zone && /^(ESSF|IMA|CMA|BAFA|MH)$/.test(zone);
    for (let m = 1; m <= 12; m++) base.push({ lvl: regionHas && !high ? 1 : 0 });
    out.ev.push({ ok: null, t: 'No month band for this species in the app data. Level comes from the region season table and the lesson only.' });
    out.ev.push({ ok: !high, t: `Lesson (Wild turkey): valleys and foothill forest edges; roosts in large pines on ridges${zone ? `. Habitat zone here: ${zoneTxt(zone)}` : ''}`, c: 75 });
  }
  // boosts (raise one level at most, only from Low or better)
  const boosts = [];
  if (sp.uwr) {
    const u = D.uwr[sp.uwr];
    const h = u && u.hits.find((x) => x.dist <= 2000);
    if (h) { const ms = uwrMonths(h.props, u.layer); boosts.push({ months: ms, t: `Official ${u.layer.label.toLowerCase()} ${h.dist ? `${H.units.dist(h.dist)} away` : 'here'}${h.props.uwr ? ` (${h.props.uwr})` : ''}, used ${monthsText(ms) || 'in winter'}`, c: u.layer.cert }); }
    else if (u && u.state === 'ok' && u.hits.length) out.ev.push({ ok: null, t: `Official ${u.layer.label.toLowerCase()} ${H.units.dist(u.hits[0].dist)} away`, c: u.layer.cert });
  }
  const has = (b) => (sp.boost || []).includes(b);
  if (has('wet') && D.wetNear) boosts.push({ t: `Wetland ${D.wetNear.dist ? `${H.units.dist(D.wetNear.dist)} away` : 'here'}`, c: D.wet.layer.cert });
  if (has('cut') && D.cutNear) boosts.push({ t: `Young cutblock (${esc(D.cutNear.props.ageClass)}) ${D.cutNear.dist ? `${H.units.dist(D.cutNear.dist)} away` : 'here'}`, c: D.cut.layer.cert });
  if (has('burn') && D.burnNear && !sp.water) boosts.push({ t: `Burn from ${D.burnNear.props.year} (${D.year - D.burnNear.props.year} years old) ${D.burnNear.dist ? `${H.units.dist(D.burnNear.dist)} away` : 'here'}`, c: D.burn.layer.cert });
  for (const b of boosts) out.ev.push({ ok: true, t: `${b.t}: raises the level one step${b.months ? ' in those months' : ''}`, c: b.c });
  // caps (Low at most)
  if (!regionHas && !fedHas) out.caps.push(D.region ? `No general open season row for this species in Region ${D.region}, so the level stays Low or under (it can still live here)` : 'No MU (Management Unit) found here, so no season table to check');
  if (sp.water && !D.wetNear && !D.duckNear) out.caps.push('No mapped wetland or duck water within 1 km');
  if (sp.cliffs) { const u = D.uwr[sp.uwr]; if (!(u && u.hits.length)) out.caps.push('Sheep and goats need cliffs and escape terrain. The app cannot see that, and no mapped winter range is within 5 km'); }
  for (const c of out.caps) out.ev.push({ ok: false, t: c });
  if (sp.water && (D.wetNear || D.duckNear)) out.ev.push({ ok: true, t: D.duckNear ? `Duck water ${esc(D.duckNear.props.name || '')} ${D.duckNear.dist ? `${H.units.dist(D.duckNear.dist)} away` : 'here'} (${esc(D.duckNear.props.band || 'general pattern')})` : `Wetland ${D.wetNear.dist ? `${H.units.dist(D.wetNear.dist)} away` : 'here'}`, c: D.duckNear ? D.duck.layer.cert : D.wet.layer.cert });
  if (rowsHere.length || fedHas) out.ev.push({ ok: true, t: `${sp.fed ? 'Federal district' : `MU ${D.muId}`} has open season rows for this species`, c: 99 });
  for (let m = 1; m <= 12; m++) {
    let l = base[m - 1].lvl;
    if (l >= 1 && boosts.some((b) => !b.months || !b.months.length || b.months.includes(m))) l = Math.min(3, l + 1);
    if (out.caps.length) l = Math.min(l, 1);
    out.months.push(l);
  }
  out.level = out.months[month - 1];
  return out;
}

// ---------- seasons ----------
function seasonStatus(open, close, today) {
  const [om, od] = String(open).split('-').map(Number), [cm, cd] = String(close).split('-').map(Number);
  if (!om || !cm) return null;
  const Y = new Date(today).getUTCFullYear(); let best = null;
  for (const y of [Y - 1, Y, Y + 1]) {
    const s = Date.UTC(y, om - 1, od); let e = Date.UTC(y, cm - 1, cd); if (e < s) e = Date.UTC(y + 1, cm - 1, cd);
    if (e >= today && (!best || s < best.s)) best = { s, e };
  }
  if (!best) return { open: false, txt: 'Closed' };
  if (best.s <= today) { const n = Math.round((best.e - today) / 864e5); return { open: true, txt: n === 0 ? 'Open now, closes today' : `Open now, closes in ${plural(n, 'day')}` }; }
  const n = Math.round((best.s - today) / 864e5); return { open: false, soon: n <= 30, txt: `Opens in ${plural(n, 'day')}` };
}

let TODAY_T = 0;
function byStatus(rs) { // open now first, then the soonest to open
  const key = (r) => { const s = seasonStatus(r.open, r.close, TODAY_T); if (!s) return 1e9; const n = +((s.txt.match(/\d+/) || [0])[0]); return s.open ? n - 1e6 : s.txt === 'Closed' ? 1e8 : n; };
  rs.sort((a, b) => key(a) - key(b));
}

// ---------- harvest statistics ----------
function harvestFor(sp, D) {
  const Hv = D.harvest; if (!Hv || !sp.harvest || !D.muId) return null;
  const rows = (Hv.rows || []).filter((r) => r.mu === D.muId && r.species === sp.harvest && r.resident === true).sort((a, b) => a.year - b.year);
  if (!rows.length) return null;
  const use = rows.filter((r) => r.hunters != null && r.kills != null);
  const hunters = use.reduce((s, r) => s + r.hunters, 0), kills = use.reduce((s, r) => s + r.kills, 0);
  const last = rows[rows.length - 1];
  return { rows, years: [rows[0].year, last.year], hunters, kills, pct: hunters >= 20 ? (kills / hunters) * 100 : null, last, ci: rows.some((r) => r.killsFromCI) };
}

// ---------- render ----------
const sec = (id, title, body, open) => `<details class="hmi-sec" data-sec="${id}"${open ? ' open' : ''}><summary>${title}</summary><div class="hmi-in">${body}</div></details>`;
const chip = (l) => `<span class="hmi-chip ${LCLS[l]}">${LEVELS[l]}</span>`;
const strip = (ms, cur) => `<div class="hmi-strip" role="img" aria-label="Likelihood by month: ${ms.map((l, i) => `${MON[i]} ${LEVELS[l]}`).join(', ')}">${ms.map((l, i) => `<i class="${LCLS[l]}${i + 1 === cur ? ' cur' : ''}"><b>${MON[i][0]}</b></i>`).join('')}</div>`;
const evLi = (e) => `<li class="${e.ok === true ? 'ok' : e.ok === false ? 'no' : 'na'}">${e.t}${e.c != null ? ` ${cert(e.c)}` : ''}</li>`;

/** Area report for a point (default: the map centre). */
export async function insightsAt(p, name) {
  const fromCentre = !p;
  if (!p) { const c = map.getCenter(); p = [c.lng, c.lat]; }
  const [lng, lat] = p, my = ++tok;
  setMarker(p);
  const body = H.openSheet({ title: name ? `Area report: ${name}` : 'Area report', bar: 'insights', tall: true, modal: false,
    onClose: () => { if (my === tok) { active = false; setMarker(null); } },
    html: `<p class="hmm-muted">${fromCentre ? 'Map centre, ' : ''}${esc(H.units.coord(lng, lat))}</p>${BANNER}<p class="hmm-muted">Checking this spot: habitat, seasons, winter ranges and spots.</p>` });
  active = true;
  const D = await gather(p);
  if (my !== tok || H.els.sheetB !== body || H.els.sheet.hidden) return;
  const t0 = performance.now();
  const html = render(D, name, fromCentre);
  body.innerHTML = html.html;
  wire(body, D, html.text);
  H.lastReport = { load: Math.round(D.tLoad), render: Math.round(performance.now() - t0) };
}

function render(D, name, fromCentre) {
  const [lng, lat] = D.p, today = todayPacific(), month = today.m, T = [];
  const ln = (s) => T.push(String(s).replace(/<[^>]+>/g, ''));
  D.month = month; D.year = today.y; TODAY_T = today.t;
  D.zone = D.hab && D.hab.hits[0] ? String(D.hab.hits[0].props.zone || '') || null : null;
  D.elev = D.elev != null && isFinite(D.elev) ? D.elev : null;
  D.wetNear = D.wet && D.wet.hits[0]; D.duckNear = D.duck && D.duck.hits[0];
  D.cutNear = D.cut && D.cut.hits.find((h) => /5 to 20/.test(h.props.ageClass || ''));
  D.burnNear = D.burn && D.burn.hits.find((h) => h.props.year && today.y - h.props.year >= 3 && today.y - h.props.year <= 15);
  const allRows = D.regs.flatMap((R) => (R.rows || []).map((r) => ({ ...r, _R: R })));
  D.seasonRows = D.muId ? allRows.filter((r) => (r.mus || []).includes(D.muId)) : [];
  const M = D.mf; let dist = null;
  if (M && D.muId) { const e = Object.entries(M.districts || {}).find(([, d]) => (d.mus || []).includes(D.muId)); if (e) dist = { k: e[0], ...e[1] }; }
  D.fedRows = M && dist ? (M.rows || []).filter((r) => r.district === dist.k) : [];

  ln(`Hunt Mentor area report, ${today.y}-${String(today.m).padStart(2, '0')}-${String(today.d).padStart(2, '0')}`);
  ln(`Point: ${H.units.coord(lng, lat)} (${lat.toFixed(5)}, ${lng.toFixed(5)})${name ? `, ${name}` : ''}`);

  // 1. Where
  const zoneProps = D.hab && D.hab.hits[0] && D.hab.hits[0].props;
  const kv = (k, v) => `<div class="hmm-kv"><span>${k}</span><b>${v}</b></div>`;
  let where = '';
  if (D.muId) where += kv('MU (Management Unit)', esc(D.muId)) + (D.mu.region ? kv('Region', esc(D.mu.region)) : '');
  else where += `<p>${D.mu && D.mu.state === 'outside' ? 'Not inside a MU (Management Unit) in the map data.' : 'The MU (Management Unit) layer could not be read here.'}</p>`;
  where += kv('Elevation', D.elev != null ? `${H.units.elev(Math.round(D.elev))}` : 'Unknown offline here');
  where += kv('BEC (Biogeoclimatic Ecosystem Classification) habitat zone', zoneProps ? `${esc(zoneProps.zoneName || ZONES[D.zone] || D.zone)} <small>${esc(zoneProps.label || D.zone)}</small> ${cert(D.hab.layer.cert)}` : 'Unknown (habitat zone data not loaded here)');
  const rd = D.roads && D.roads.hits[0];
  where += kv('Nearest forest road', rd ? `${H.units.dist(rd.dist)}${rd.props.name ? ` <small>${esc(rd.props.name)}</small>` : ''}` : D.roads && D.roads.state === 'ok' ? 'None within 6 km in the forest road data' : 'Not available here');
  ln(`MU: ${D.muId || 'not found'}${D.mu && D.mu.region ? `, ${D.mu.region}` : ''}. Elevation: ${D.elev != null ? `${Math.round(D.elev)} m` : 'unknown'}. Habitat zone: ${zoneProps ? `${zoneProps.zoneName} (${zoneProps.label})` : 'unknown'}. Nearest forest road: ${rd ? H.units.dist(rd.dist) : 'not found'}.`);
  // land status flags
  const flags = [];
  const flag = (lvl, txt, layer) => flags.push(`<li class="${lvl}"><b>${lvl === 'stop' ? 'Stop' : lvl === 'warn' ? 'Check' : 'OK'}</b> ${txt}${layer ? ` <small>${esc(layer.about || '')} ${cert(layer.cert)} ${esc(layer.source || '')}, data ${esc(layer.dataDate || '')}</small>` : ''}</li>`);
  const inside = (r) => r && r.hits.find((h) => h.dist === 0);
  const pv = inside(D.priv), pk = inside(D.parks), rs = inside(D.reserves), ct = inside(D.city), wm = inside(D.wma);
  if (pv) flag('stop', 'Private land here. You need the owner’s permission.', D.priv.layer);
  if (pk) flag('warn', `${esc(pk.props.designation || 'Park')}: ${esc(pk.props.name || '')}.`, D.parks.layer);
  if (rs) flag('stop', `First Nations reserve: ${esc(rs.props.name || '')}.`, D.reserves.layer);
  if (ct) flag('warn', `Inside ${esc(ct.props.abbr || ct.props.name || 'city limits')}.`, D.city.layer);
  if (wm) flag('warn', `Wildlife Management Area (WMA): ${esc(wm.props.name || '')}.`, D.wma.layer);
  for (const h of (D.clos && D.clos.hits.filter((x) => x.dist === 0)) || []) flag('warn', `${esc(h.props.type || 'Closure')}: ${esc(h.props.name || '')}. ${esc(h.props.dates || '')}${h.props.map ? `, synopsis map ${esc(h.props.map)}` : ''}.`, D.clos.layer);
  const lehZ = (D.leh && D.leh.hits.filter((x) => x.dist === 0)) || [];
  if (lehZ.length) flag('warn', `LEH (Limited Entry Hunting) zones here: ${lehZ.map((h) => `${esc(h.props.species)} ${esc(h.props.label)}`).join('; ')}. Some seasons need a draw.`, D.leh.layer);
  for (const R of D.regs) {
    if (D.muId && R.cwdZone && (R.cwdZone.mus || []).includes(D.muId)) flag('warn', `CWD (Chronic Wasting Disease) Management Zone: ${esc(String(R.cwdZone.notes).replace(/^CWD Management Zone:\s*/, ''))}. Page ${esc(R.cwdZone.page)}. ${cert(R.cwdZone.cert)}`);
    const cl = D.muId && (R.closedMus || []).find((c) => c.mu === D.muId);
    if (cl) flag('stop', `MU ${esc(cl.mu)}: ${esc(cl.notes)}. Page ${esc(cl.page)}. ${cert(cl.cert)}`);
  }
  if (!flags.length) flags.push(`<li class="ok"><b>OK</b> No private land, park, reserve, city limits, closure or LEH zone found in the loaded layers. Signs on the ground still rule.</li>`);
  where += `<h4 class="hmi-h4">Land status</h4><ul class="hmi-flags">${flags.join('')}</ul>`;
  flags.forEach((f) => ln(`Land: ${f.replace(/<small>.*?<\/small>/g, '')}`));

  // 2. Animals
  const A = SPECIES.map((sp) => assess(sp, D)).sort((a, b) => b.level - a.level || SPECIES.indexOf(a.sp) - SPECIES.indexOf(b.sp));
  const cards = A.map((a) => `<details class="hmi-sp"><summary><span class="hmi-sph">${chip(a.level)}<b>${esc(a.sp.label)}</b></span>${strip(a.months, month)}</summary>
    <div class="hmi-in"><p class="hmm-muted">${LEVELS[a.level]} in ${MONTH_NAMES[month - 1]} (estimate, habitat based).</p>
    ${a.where ? `<p class="hmi-where">${a.sp.mig.length > 1 ? `${esc(a.where.label)}: ` : ''}${esc(a.where.t)} ${cert(a.where.c)}</p>` : ''}
    <ul class="hmi-ev">${a.ev.map(evLi).join('')}</ul></div></details>`).join('');
  ln('');
  ln(`Animals likely here in ${MONTH_NAMES[month - 1]} (estimate, habitat based):`);
  A.forEach((a) => ln(`- ${a.sp.label}: ${LEVELS[a.level]}. By month: ${a.months.map((l, i) => `${MON[i]} ${LEVELS[l][0]}`).join(' ')}`));
  const animals = `<p class="hmm-muted">Level for ${MONTH_NAMES[month - 1]} <b>(estimate, habitat based)</b>. Tap a species for the evidence. Strip: January to December, this month outlined.</p>
    <div class="hmi-legend">${[3, 2, 1, 0].map(chip).join('')}</div>${cards}
    <p class="hmm-muted">How it works: habitat zone and elevation against the month bands in the app data (cited studies), plus winter ranges, wetlands, cutblocks and burns nearby. My rule, not a count of animals.</p>`;

  // 3. Success
  let succ = ''; ln(''); ln('Chance of success (official harvest statistics, resident hunters):');
  for (const a of A) {
    const sp = a.sp; if (!sp.harvest) continue;
    const h = harvestFor(sp, D);
    if (!h) { succ += `<div class="hmi-row"><b>${esc(sp.label)}</b><span class="hmm-muted">No official success rate loaded for this MU</span></div>`; ln(`- ${sp.label}: no official success rate loaded for this MU`); continue; }
    const last = h.last, lastTxt = last.lowConfidence || last.hunters == null ? `${last.year}: too few hunters reported` : `${last.year}: ${fmtNum(last.successPct, 1)}% (${fmtNum(last.kills)} of ${fmtNum(last.hunters)})`;
    const allTxt = h.pct == null ? `${h.years[0]} to ${h.years[1]}: too few hunters reported` : `${h.years[0]} to ${h.years[1]}: ${fmtNum(h.pct, 1)}% (${fmtNum(h.kills)} kills of ${fmtNum(h.hunters)} hunters)`;
    succ += `<div class="hmi-row"><b>${esc(sp.label)}</b><span><b class="hmi-big">${h.pct == null ? 'Too few hunters reported' : `${fmtNum(h.pct, 1)}%`}</b> <small>${esc(allTxt)}</small><br><small>Latest year ${esc(lastTxt)}${h.ci ? '. Kills from compulsory inspection' : ''}</small></span></div>`;
    ln(`- ${sp.label}: ${allTxt}; latest ${lastTxt}`);
  }
  succ = D.muId ? `${succ}<div class="hmi-row"><b>Birds</b><span class="hmm-muted">Grouse, ducks, geese, quail, turkey: no official success rate loaded</span></div>
    <p class="hmm-muted">Resident hunters only. Hunters and kills are survey estimates; general open season and LEH (Limited Entry Hunting) draws are combined, so moose and elk numbers may include draw hunts. Hidden under 20 hunters. Source: ${esc(HARVEST_SRC)}${D.harvest && D.harvest.url ? `, <a href="${esc(D.harvest.url)}" target="_blank" rel="noopener">data page</a>` : ''}.</p>`
    : '<p class="hmm-muted">No MU (Management Unit) found here, so no official success rate.</p>';
  if (D.muId && !D.harvest) succ = '<p class="hmm-muted">The harvest statistics file is not loaded (offline and not saved yet). No official success rate shown.</p>';

  // 4. When
  let when = ''; ln(''); ln(`Open seasons, MU ${D.muId || 'unknown'} (check the synopsis):`);
  const rowHtml = (r, label, srcTxt) => {
    const s = seasonStatus(r.open, r.close, today.t);
    const txt = `${fmtMD(r.open)} to ${fmtMD(r.close)}`;
    ln(`- ${label}${r.class ? `, ${r.class}` : ''}: ${txt}${s ? ` (${s.txt})` : ''}. ${srcTxt}`);
    return `<li><div><b>${esc(txt)}</b>${r.class ? ` <span>${esc(r.class)}</span>` : ''}${s ? ` <em class="hmi-st ${s.open ? 'open' : s.soon ? 'soon' : ''}">${esc(s.txt)}</em>` : ''}</div>
      ${r.notes ? `<small>${esc(r.notes)}</small>` : ''}<small>${esc(srcTxt)} ${cert(r.cert)}</small></li>`;
  };
  if (!D.muId) when = '<p class="hmm-muted">No MU (Management Unit) found here, so no season rows.</p>';
  else {
    for (const a of A) {
      const sp = a.sp;
      if (sp.fed) {
        const rs = D.fedRows.filter((r) => sp.fed.test(r.species) && r.open);
        if (!rs.length) continue;
        byStatus(rs);
        when += `<h4 class="hmi-h4">${esc(sp.label)} <small>federal district ${esc(dist.k)} ${esc(dist.name || '')}</small></h4><ul class="hmi-rows">${rs.map((r) => rowHtml({ ...r, class: `${cap(r.species)}${r.daily != null ? `, daily ${r.daily}, possession ${r.possession}` : ''}` }, sp.label, `${r.item || ''}, ${M.source || 'Migratory Birds Regulations'}`)).join('')}</ul>`;
        continue;
      }
      const rs = D.seasonRows.filter((r) => sp.season.includes(r.species)).map((r) => ({ ...r, class: sp.season.length > 1 && r.species !== sp.season[0] ? [cap(r.species), r.class].filter(Boolean).join(', ') : r.class }));
      if (!rs.length) continue;
      byStatus(rs);
      when += `<h4 class="hmi-h4">${esc(sp.label)}</h4><ul class="hmi-rows">${rs.map((r) => rowHtml(r, sp.label, `Synopsis page ${r.page}`)).join('')}</ul>`;
    }
    if (M && M.noDistrict && (M.noDistrict.mus || []).includes(D.muId)) when += `<p><b>Ducks and geese:</b> ${esc(M.noDistrict.notes)} ${cert(M.noDistrict.cert)}</p>`;
    if (!when) when = '<p class="hmm-muted">No general open season rows for these species in this MU in the app data. Check the official synopsis and the LEH synopsis.</p>';
    const R0 = D.regs[0];
    when = `${BANNER}${when}<p class="hmm-muted">General open seasons only; LEH (Limited Entry Hunting) hunts are in the LEH synopsis. ${R0 ? `${esc(R0.source)}, checked ${esc(R0.checked)}.` : ''} ${R0 && R0.url ? `<a href="${esc(R0.url)}" target="_blank" rel="noopener">Synopsis PDF</a>` : ''}</p>`;
  }

  // 5. How they move
  let move = ''; ln(''); ln('How they move (general pattern):');
  const MS = D.mig && D.mig.species;
  for (const a of A) {
    if (a.level < 1 || !MS) continue;
    for (const k of a.sp.mig) {
      const s = MS[k]; if (!s || !s.months) continue;
      const certs = Object.values(s.months).map((b) => b.cert).filter((c) => c != null);
      const lo = Math.min(...certs), hi = Math.max(...certs);
      let here = '';
      if (D.elev != null) {
        const inM = [], above = [], below = [];
        for (let m = 1; m <= 12; m++) { const b = s.months[m]; if (!b) continue; if (D.elev < b.elevM[0]) above.push(m); else if (D.elev > b.elevM[1]) below.push(m); else inM.push(m); }
        const mt = (m) => monthsText(m).replace('All year', 'all year');
        here = `At ${fmtNum(Math.round(D.elev))} m: in their band ${mt(inM) || 'in no month'}${above.length ? `; higher up ${mt(above)}` : ''}${below.length ? `; lower down ${mt(below)}` : ''}.`;
      }
      const j = s.months[7], w = s.months[1], o = s.months[10];
      const line = `${s.label} (${s.pattern}): Summer (July) ${bandTxt(j.elevM)}, October ${bandTxt(o.elevM)}, winter (January) ${bandTxt(w.elevM)}. ${here}`;
      move += `<li><b>${esc(s.label)}</b> <span class="hmm-muted">${esc(s.pattern)}</span><br>${esc(line.slice(line.indexOf(':') + 2))} <small>General pattern ${lo === hi ? cert(lo) : `${cert(lo)} to ${cert(hi)}`}</small></li>`;
      ln(`- ${line} General pattern, certainty ${lo} to ${hi}%.`);
    }
  }
  move = move ? `<ul class="hmi-move">${move}</ul><p class="hmm-muted">From data/migration.json: habitat zone and elevation bands from cited studies, not mapped corridors. Snow and cold set the timing each year.</p>` : '<p class="hmm-muted">No species with a habitat band is likely here.</p>';

  // 6. How to hunt
  const likely = A.filter((a) => a.level >= 2);
  const pick = likely.length ? likely : A.filter((a) => a.level === 1).slice(0, 3);
  const ctx = { month, elev: D.elev, zone: D.zone, wet: !!D.wetNear, cut: !!D.cutNear, burn: !!D.burnNear };
  ln(''); ln('How to hunt it (from the lessons; tips are opinion):');
  const how = pick.map((a) => {
    const Ls = LESSONS[a.sp.key === 'quail' ? 'quail' : a.sp.key]; if (!Ls) return '';
    const bs = Ls.b.filter((b) => !b.when || b.when(ctx)).slice(0, 4);
    bs.forEach((b) => ln(`- ${a.sp.label}: ${b.t} (${b.c != null ? `${b.c}%` : 'Tip'})`));
    return `<details class="hmi-sp"><summary><span class="hmi-sph">${chip(a.level)}<b>${esc(a.sp.label)}</b></span></summary><div class="hmi-in"><ul class="hmi-how">
      ${bs.map((b) => `<li>${b.c != null ? cert(b.c) : tip} ${esc(b.t)}</li>`).join('')}
      <li>${tip} Wind: keep it in your face or quartering as you close in. Check today's wind below before you walk in.</li></ul>
      <p class="hmm-muted">From the lesson: <a href="#/s/${esc(Ls.id)}">${esc(Ls.title)}</a></p></div></details>`;
  }).join('');

  // 7. Spots
  const sl = layers.stateOf('spots');
  const sps = ((D.spotsR && D.spotsR.hits) || []).filter((h) => h.f && h.f.geometry && h.f.geometry.type === 'Point')
    .sort((a, b) => ((b.props._score ?? 0) - (a.props._score ?? 0)) || a.dist - b.dist).slice(0, 3);
  const spotHtml = sps.length ? sps.map((h, i) => `<button class="hmi-spot" data-spot="${i}">${spots.iconHtml(h.props._cat, 24)}<span><b>${esc(h.props._name)}</b><small>${esc(spots.subtitle(h.props))}</small></span><em>${H.units.dist(h.dist)}${h.props._score != null ? `<br>score ${esc(h.props._score)}` : ''}</em></button>`).join('')
    + '<p class="hmm-muted">Candidate spots (my pick, estimate). Scout first.</p>'
    : '<p class="hmm-muted">No candidate spot within 5 km in the spot data.</p>';
  ln(''); sps.forEach((h) => ln(`Spot nearby: ${h.props._name}, ${H.units.dist(h.dist)}`));
  ln(''); ln(BANNER_TXT);

  const mo = moon();
  const html = `
    <p class="hmm-muted">${fromCentre ? 'Map centre, ' : ''}${esc(H.units.coord(lng, lat))}${D.elev != null ? `, ${H.units.elev(Math.round(D.elev))}` : ''}</p>
    ${BANNER}
    ${sec('where', 'Where you are', where, true)}
    ${sec('animals', 'Animals likely here', animals, true)}
    ${sec('success', 'Chance of success', succ, true)}
    ${sec('when', 'When: open seasons', when, true)}
    ${sec('move', 'How they move', move, false)}
    ${sec('how', 'How to hunt it', pick.length ? `<p class="hmm-muted">For the species most likely here this month.</p>${how}` : '<p class="hmm-muted">No species stands out here this month.</p>', false)}
    ${sec('spots', 'Nearby candidate spots', spotHtml, false)}
    ${sec('today', 'Today: light, moon, wind', `${lightHtml(lat, lng)}<div class="hmm-kv"><span>Moon</span><b>${mo.name}, ${mo.lit}% lit</b></div><h4 class="hmi-h4">Wind and weather</h4><div data-out="wx"><p class="hmm-muted">Getting the forecast</p></div>`, false)}
    <div class="hmm-btnrow">${MENTOR() ? '<button class="hmm-btn2" data-hmi-ask>Ask the mentor about this area</button>' : ''}<a class="hmm-btn2" href="https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}" target="_blank" rel="noopener">Directions</a><a class="hmm-btn2" href="#/sources">All rules data</a></div>
    ${BANNER}`;
  D._spots = sps; D._spotLayer = sl && sl.l;
  return { html, text: T.join('\n') };
}

function wire(body, D, text) {
  const ask = body.querySelector("[data-hmi-ask]");
  if (ask) ask.onclick = () => {
    const done = () => H.toast('Report copied. Paste it into the mentor chat.', 3500);
    const legacy = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; } ta.remove(); if (ok) done(); else H.toast('Could not copy the report. Type your question in the mentor.', 3500); };
    try { (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject()).then(done, legacy); } catch (err) { legacy(); }
    window.open(MENTOR(), '_blank', 'noopener');
  };
  body.querySelectorAll('[data-spot]').forEach((b) => b.onclick = () => {
    const h = D._spots[+b.dataset.spot]; if (!h || !D._spotLayer) return;
    spots.openCard(H, D._spotLayer, h.f);
  });
  const today = body.querySelector('[data-sec="today"]');
  if (today) today.addEventListener('toggle', () => { if (today.open && !today.dataset.wx) { today.dataset.wx = '1'; wind(body, D.p[0], D.p[1]); } });
}

function setMarker(p) {
  if (tapMk) { tapMk.remove(); tapMk = null; }
  if (!p) return;
  const el = document.createElement('div'); el.className = 'hmm-tap';
  tapMk = new H.maplibregl.Marker({ element: el }).setLngLat(p).addTo(map);
}

// ---------- legal light (reuses the app's sun times and the hours in regs.json) ----------
function lightHtml(lat, lng) {
  const S = window.HuntMentor || {}, hours = window.HM && window.HM.regs && window.HM.regs.hours;
  if (!S.sunEvent || !hours) return '<p><span class="hmm-verify">VERIFY</span> Legal light needs the app data. Open the app once with signal.</p>';
  const { y, m, d } = todayPacific(), day = new Date(y, m - 1, d, 12);
  const rise = S.sunEvent(day, lat, lng, true), set = S.sunEvent(day, lat, lng, false), hhmm = S.hhmm;
  const add = (t, min) => (t ? new Date(+t + min * 6e4) : null);
  const row = (label, h) => (h && h.beforeSunriseMin != null && rise && set
    ? `<div class="hmm-kv"><span>${label}</span><b>${hhmm(add(rise, -h.beforeSunriseMin))} to ${hhmm(add(set, h.afterSunsetMin))}</b>${cert(h.certainty)}</div>`
    : `<div class="hmm-kv"><span>${label}</span><span class="hmm-verify">VERIFY</span></div>`);
  return `<div class="hmm-kv"><span>Sunrise</span><b>${hhmm(rise)}</b></div><div class="hmm-kv"><span>Sunset</span><b>${hhmm(set)}</b></div>
    ${row('Big game and upland birds', hours.bigGame)}${row('Ducks and geese', hours.migratory)}
    <p class="hmm-muted">Worked out on your phone for this spot, Pacific time. ${esc((hours.bigGame && hours.bigGame.text) || '')} ${esc((hours.migratory && hours.migratory.text) || '')}</p>`;
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
      <small>Opinion. Walk into the wind so your scent blows away from the animals. Thermals rise as the sun warms a slope and sink in the evening.</small></p>
    <div class="hmw-hours" role="list" aria-label="Wind for the next 12 hours">${hrs.join('')}</div>
    <p class="hmm-muted">Arrows point the way the wind blows. ${W.ATTRIB}</p>`;
}

// ---------- styles (scoped to the report) ----------
function addStyle() {
  if (document.getElementById('hmi-style')) return;
  const s = document.createElement('style'); s.id = 'hmi-style';
  s.textContent = `
.hmi-sec { border-top: 1px solid var(--hmm-line); }
.hmi-sec > summary { list-style: none; cursor: pointer; min-height: 44px; display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--hmm-muted); }
.hmi-sec > summary::-webkit-details-marker, .hmi-sp > summary::-webkit-details-marker { display: none; }
.hmi-sec > summary::after { content: '+'; font-size: 20px; font-weight: 600; }
.hmi-sec[open] > summary::after { content: '\\2212'; }
.hmi-in { padding: 0 0 12px; overflow-wrap: anywhere; }
.hmi-h4 { margin: 14px 0 4px; font-size: 15px; } .hmi-h4 small { font-weight: 500; color: var(--hmm-muted); }
.hmi-chip { display: inline-block; min-width: 70px; text-align: center; font-size: 12px; font-weight: 800; padding: 3px 8px; border-radius: 99px; color: #fff; }
.hmi-chip.hi, .hmi-strip i.hi { background: #2e7d32; } .hmi-chip.me, .hmi-strip i.me { background: #8d6e00; }
.hmi-chip.lo, .hmi-strip i.lo { background: #c2571a; } .hmi-chip.un, .hmi-strip i.un { background: #757575; }
.hmi-legend { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 8px; }
.hmi-sp { border: 1px solid var(--hmm-line); border-radius: 12px; margin: 8px 0; background: var(--hmm-soft); }
.hmi-sp > summary { list-style: none; cursor: pointer; padding: 10px 12px; min-height: 44px; }
.hmi-sp > .hmi-in { padding: 0 12px 10px; }
.hmi-sph { display: flex; align-items: center; gap: 10px; } .hmi-sph b { font-size: 16px; }
.hmi-strip { display: grid; grid-template-columns: repeat(12, 1fr); gap: 2px; margin-top: 8px; }
.hmi-strip i { display: grid; place-items: center; height: 20px; border-radius: 4px; font-style: normal; }
.hmi-strip i b { font-size: 10px; color: #fff; font-weight: 700; }
.hmi-strip i.cur { outline: 2.5px solid var(--hmm-ink); outline-offset: 1px; }
.hmi-ev, .hmi-how, .hmi-move, .hmi-rows, .hmi-flags { list-style: none; padding: 0; margin: 6px 0; }
.hmi-ev li { position: relative; padding: 4px 0 4px 20px; font-size: 14px; }
.hmi-ev li::before { position: absolute; left: 0; top: 4px; font-weight: 800; }
.hmi-ev li.ok::before { content: '+'; color: #2e7d32; } .hmi-ev li.no::before { content: '\\2212'; color: #c2571a; } .hmi-ev li.na::before { content: '?'; color: var(--hmm-muted); }
.hmi-where { font-size: 14px; margin: 6px 0; }
.hmi-how li, .hmi-move li { padding: 6px 0; border-bottom: 1px solid var(--hmm-line); font-size: 15px; }
.hmi-rows li { padding: 7px 0; border-bottom: 1px solid var(--hmm-line); } .hmi-rows small { display: block; color: var(--hmm-muted); font-size: 13px; }
.hmi-st { font-style: normal; font-size: 12px; font-weight: 800; padding: 1px 7px; border-radius: 6px; background: var(--hmm-soft); white-space: nowrap; }
.hmi-st.open { background: #2e7d32; color: #fff; } .hmi-st.soon { background: #8d6e00; color: #fff; }
.hmi-row { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--hmm-line); } .hmi-row > b { flex: 0 0 104px; }
.hmi-row small { color: var(--hmm-muted); } .hmi-big { font-size: 18px; }
.hmi-flags li { padding: 6px 0; border-bottom: 1px solid var(--hmm-line); font-size: 14px; } .hmi-flags li > b { margin-right: 4px; }
.hmi-flags li { background: transparent !important; color: var(--hmm-ink) !important; border-left: 4px solid #2e7d32; padding: 6px 8px; margin: 4px 0; } .hmi-flags li.stop { border-left-color: #c62828; } .hmi-flags li.warn { border-left-color: #b26a00; } .hmi-flags li.stop > b { color: #c62828; } .hmi-flags li.warn > b { color: #b26a00; } .hmi-flags li.ok > b { color: #2e7d32; }
.hmi-flags small { display: block; color: var(--hmm-muted); font-size: 12px; }
.hmi-spot { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 56px; margin: 6px 0; padding: 8px 10px; border: 1.5px solid var(--hmm-line); border-radius: 12px; background: var(--hmm-card); color: var(--hmm-ink); text-align: left; }
.hmi-spot span { flex: 1; min-width: 0; } .hmi-spot small { display: block; color: var(--hmm-muted); } .hmi-spot em { font-style: normal; font-size: 13px; text-align: right; color: var(--hmm-muted); }
`;
  document.head.appendChild(s);
}
