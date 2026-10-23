/* Hunt Map search: one box that finds anything. Offline first, then online.
   Order of groups:
     1. Your hunt plans ("Go to my hunt plan area", from the planner's saved plans in localStorage hm.v1 S.plans)
     2. Coordinates: decimal, degrees minutes seconds, degrees decimal minutes, UTM (Universal Transverse Mercator)
     3. MU (Management Unit) like "2-18", "MU 2-18", "3 27", and "Region 2": fly to the outline (map/focus.js,
        small outline from data/places/mu.json works offline, exact line when the MU layer file loads)
     4. Places saved on this phone (data/places/places.json and the town list in mu.json, precached)
     5. Camps and rec sites (camping layer files: the ones saved on this phone, plus the ones around the map, your
        home bases and your plans when there is signal) and the rec site layer
     6. Candidate spots by name
     7. Your waypoints, lines, areas and tracks (My Content and Go & Track)
     8. Online: BC Geographical Names, BC Address Geocoder, then OpenStreetMap Nominatim (on Enter, 1 request a second)
   Inside each group: good name matches first (exact or starts with), then nearest to the map centre.
   Recent searches: last 8, in the map prefs (hm.map.v1), clearable. */
import { esc, parseCoords, units, haversine, bearingTo, compass8, debounce, prefs, savePrefs, formatCoord } from './util.js';
import * as layers from './layers.js';
import * as store from './store.js';
import { openCamp } from './place-card.js';

let H, map, root, input, res, seq = 0, ctrl = null, pin = null, lastNomi = 0, lastSubmit = '';
const RECENT_MAX = 8;
const MU_RE = /^\s*(?:mu|m\.u\.|wmu|management\s+unit|unit)?\s*(\d{1,2})\s*(?:[-–—]|\s)\s*(\d{1,2})\s*$/i;
const REGION_RE = /^\s*region\s*(\d|7\s*[ab])\s*$/i;

export function init(api) { H = api; map = api.map; }

// ---------- icons (inline SVG, 24 by 24, currentColor) ----------
const sv = (b) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
const IC = {
  plan: sv('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  coord: sv('<circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
  mu: sv('<path d="M4 6 10 3l8 3 2 8-6 7-9-3Z"/><path d="M9 12h6" stroke-width="1.6"/>'),
  town: sv('<path d="M4 20V10l6-5 6 5v10M16 20v-7h4v7M2 20h20M8 20v-5h4v5"/>'),
  water: sv('<path d="M3 9c3-2 6 2 9 0s6-2 9 0M3 14c3-2 6 2 9 0s6-2 9 0M3 19c3-2 6 2 9 0s6-2 9 0"/>'),
  mountain: sv('<path d="m2 20 7-13 4 7 2-3 7 9Z"/>'),
  road: sv('<path d="M8 3 5 21M16 3l3 18M12 4v3M12 11v3M12 18v2"/>'),
  park: sv('<path d="m12 2-6 9h3l-4 6h14l-4-6h3Z"/><path d="M12 17v5"/>'),
  camp: sv('<path d="M3 20 12 4l9 16ZM12 20l-3-6h6Z"/>'),
  spot: sv('<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7Z"/>'),
  wpt: sv('<path d="M12 22s7-7.1 7-12.2A7 7 0 0 0 5 9.8C5 14.9 12 22 12 22Z"/><circle cx="12" cy="9.6" r="2.4"/>'),
  line: sv('<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 17c4-1 2-7 6-8s3-2 4-2"/>'),
  area: sv('<path d="M4 7 11 4l9 5-3 10-11-1Z"/>'),
  track: sv('<path d="M5 20c2-6 6-3 7-8s5-5 7-8"/><circle cx="5" cy="20" r="1.6"/>'),
  place: sv('<path d="M12 22s7-7.1 7-12.2A7 7 0 0 0 5 9.8C5 14.9 12 22 12 22Z"/><circle cx="12" cy="9.6" r="2.4"/>'),
  online: sv('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  recent: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
};
// tint per kind: the row icon sits in a soft circle
const TINT = { plan: '#e8590c', coord: '#455a64', mu: '#6b3fa0', town: '#5d4037', water: '#1e6fd9', mountain: '#6d6d5a', road: '#7a6a3a', park: '#2e7d32', camp: '#2e7d32', spot: '#c2185b', wpt: '#d14600', line: '#d14600', area: '#d14600', track: '#d62828', place: '#455a64', online: '#455a64', recent: '#5d6152' };
const WATER = /lake|creek|river|bay|inlet|arm|sound|marsh|slough|spring|pond|cove|channel|falls|reservoir|brook|lagoon/i;
const HILL = /mount|peak|ridge|plateau|range|pass|canyon|valley|hill|summit|bluff|prairie|island|point|spit/i;
const TOWNY = /town|city|community|village|district|municipality|locality|settlement|indian reserve|hamlet|address/i;
function placeIcon(type) {
  const t = String(type || '');
  if (/road|street|fsr|forest service|intersection/i.test(t)) return 'road';
  if (/park|protected|ecological/i.test(t)) return 'park';
  if (WATER.test(t)) return 'water';
  if (HILL.test(t)) return 'mountain';
  if (TOWNY.test(t)) return 'town';
  return 'place';
}

// ---------- styles (kept here so search owns its look) ----------
function css() {
  if (document.getElementById('hmm-search-css')) return;
  const s = document.createElement('style'); s.id = 'hmm-search-css';
  s.textContent = `
.hmm-search .hmm-sitem { flex-direction: row; align-items: center; gap: 12px; min-height: 52px; padding: 6px 2px; cursor: pointer; color: var(--hmm-ink); font: inherit; }
.hmm-search .hmm-sitem:active { background: var(--hmm-soft); }
.hmm-sic { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: var(--c, #455a64); }
.hmm-stxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hmm-search .hmm-sname { font-size: 16px; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.hmm-search .hmm-ssub { font-size: 14px; line-height: 1.3; }
.hmm-sdist { flex: none; font-size: 14px; font-weight: 700; color: var(--hmm-muted); text-align: right; min-width: 56px; }
.hmm-sitem.plan { background: var(--hmm-soft); border-radius: 12px; border-bottom: 0; margin: 8px 0 4px; padding: 8px 10px; }
.hmm-sitem.plan .hmm-sname { color: var(--hmm-accent); }
.hmm-shead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hmm-shead .hmm-h { margin-bottom: 4px; }
.hmm-sclear { border: 0; background: none; color: var(--hmm-accent) !important; font-weight: 700; font-size: 15px; min-height: 44px; min-width: 44px; padding: 0 6px; margin-top: 10px; }
.hmm-snote { margin: 12px 0 4px; padding: 10px 12px; border-radius: 12px; background: var(--hmm-soft); font-size: 14px; line-height: 1.4; color: var(--hmm-ink); border-left: 4px solid var(--hmm-accent); }
.hmm-snote b { font-weight: 800; }
.hmm-sstatus { font-size: 14px; }
.hmm-snone a, .hmm-snote a { color: var(--hmm-accent); font-weight: 700; }
`;
  document.head.appendChild(s);
}

function build() {
  if (root) return;
  css();
  root = document.createElement('div');
  root.className = 'hmm-search'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Search the map');
  root.innerHTML = `<form class="hmm-sbar" action="#" role="search">
      <span class="hmm-sicon">${H.icons.search}</span>
      <input type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Place, unit, camp, point" aria-label="Search the map">
      <button type="button" class="hmm-scancel">Cancel</button></form>
    <div class="hmm-sres" aria-live="polite"></div>`;
  H.els.bar.parentNode.appendChild(root);
  input = root.querySelector('input'); res = root.querySelector('.hmm-sres');
  const live = debounce(() => run(input.value, false), 280);
  input.addEventListener('input', live);
  root.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); lastSubmit = input.value.trim(); run(input.value, true); input.blur(); });
  root.querySelector('.hmm-scancel').onclick = () => close();
  res.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear]')) { prefs.recent = []; savePrefs(); hints(); return; }
    const b = e.target.closest('[data-i]'); if (!b) return;
    const it = shown[+b.dataset.i]; if (it && !it.off) go(it);
  });
}

export function open() {
  build(); H.closeSheet();
  root.hidden = false;
  warm();
  if (!input.value) hints(); else run(input.value, false);
  setTimeout(() => input.focus(), 30);
}
export function close() {
  if (!root || root.hidden) return false;
  root.hidden = true; input.blur(); if (ctrl) ctrl.abort();
  return true;
}

// ---------- offline data: places and MUs (data/places, precached; inline in the single file backup) ----------
let P = null, pLoad = null;
function placesData() {
  if (P) return Promise.resolve(P);
  if (pLoad) return pLoad;
  const hp = window.HMPlaces && window.HMPlaces.load ? window.HMPlaces.load().then((D) => [D.mu, { places: D.places }]) : null;
  const inl = window.HM && window.HM.placesInline;
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); });
  pLoad = (hp || (inl ? Promise.resolve([inl.mu, inl.places]) : Promise.all([get('data/places/mu.json'), get('data/places/places.json')])))
    .then(([mu, pl]) => {
      const regById = {}, muById = {};
      for (const r of mu.regions || []) regById[r.id] = r;
      for (const m of mu.mus || []) muById[m.id] = m;
      const list = (pl.places || []).map((p) => ({ name: p.name, n: norm(p.name), type: p.ft || cap(p.type), mu: p.mu, lng: p.lon, lat: p.lat, id: p.id }));
      const have = new Set(list.map((x) => x.n));
      for (const t of mu.towns || []) { if (!have.has(norm(t[0]))) list.push({ name: t[0], n: norm(t[0]), type: t[3] || 'Town', lng: t[1], lat: t[2] }); }
      return (P = { mu, regById, muById, list });
    })
    .catch((err) => { pLoad = null; throw err; });
  return pLoad;
}
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** 0 exact, 1 starts with, 2 a word starts with, 3 contains, -1 no match. Every query word must be in the name. */
function matchTier(name, qn) {
  const n = norm(name);
  if (!qn || !n) return -1;
  if (n === qn) return 0;
  if (n.startsWith(qn)) return 1;
  const words = qn.split(' ');
  if (!words.every((w) => n.includes(w))) return -1;
  if ((' ' + n).includes(' ' + qn)) return 2;
  return words.every((w) => (' ' + n).includes(' ' + w)) ? 2 : 3;
}

// ---------- camps: the camping layer files on this phone, plus the ones near the map, bases and plans ----------
let campKey = '', campP = null;
async function campFeatures() {
  await layers.loadManifest();
  const st = layers.stateOf('camping'); if (!st || !st.files || !st.files.length) return { feats: [], l: null };
  const c = map.getCenter();
  const pts = [[c.lng, c.lat]];
  for (const b of (window.HM && window.HM.bases) || []) if (b.lat != null) pts.push([b.lon, b.lat]);
  for (const p of planList()) if (p.lat != null) pts.push([p.lng, p.lat]);
  const key = `${Math.round(c.lng)}|${Math.round(c.lat)}|${pts.length}|${navigator.onLine}`;
  if (campP && campKey === key) return campP;
  campKey = key;
  campP = (async () => {
    const inBox = (pt, b) => b && pt[0] >= b[0] && pt[0] <= b[2] && pt[1] >= b[1] && pt[1] <= b[3];
    const want = new Set();
    for (const f of st.files) {
      let saved = false;
      try { saved = typeof caches !== 'undefined' && !!(await caches.match(new URL(f.url, location.href).href, { ignoreVary: true })); } catch (e) { /* no cache API */ }
      if (saved || pts.some((pt) => inBox(pt, f.box))) want.add(f); // no signal: the copy already in memory or saved answers, else it fails at once
    }
    const seen = new Set(), feats = [];
    for (const f of want) {
      const b = f.box; if (!b) continue;
      // getLayerData with "near" loads only the files holding that point: use a point inside this file's box only
      const pt = pts.find((x) => inBox(x, b)) || [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
      const fc = await layers.getLayerData('camping', { near: pt }).catch(() => null);
      for (const ft of (fc && fc.features) || []) { const k = ft.properties && (ft.properties._hid || ft.properties.id); if (!seen.has(k)) { seen.add(k); feats.push(ft); } }
    }
    return { feats, l: st.l };
  })().catch(() => ({ feats: [], l: null }));
  return campP;
}
const CAMP_TYPE = { rec: 'Rec site', park: 'BC Parks campground', osm: 'Other campground (unofficial)', crown: 'Camp candidate, scout it first' };

// ---------- your saved items (My Content and Go & Track) ----------
async function savedItems() {
  if (H.tools && Array.isArray(H.tools.items)) return H.tools.items;
  const [items, tracks] = await Promise.all([store.list('items').catch(() => []), store.list('tracks').catch(() => [])]);
  return [...items, ...tracks.map((t) => ({ id: t.id, kind: 'track', _store: 'tracks', name: t.name || 'Track', coords: (t.coords || t.points || []).map((p) => (Array.isArray(p) ? p : [p.lng ?? p.lon, p.lat])) }))];
}
const KIND_LABEL = { wpt: 'Your waypoint', line: 'Your line', area: 'Your area', track: 'Your track' };

// ---------- hunt plans (planner, localStorage hm.v1, S.plans) ----------
function planList() {
  let S = null;
  try { S = JSON.parse(localStorage.getItem('hm.v1') || 'null'); } catch (e) { S = null; }
  const plans = S && Array.isArray(S.plans) ? S.plans : [];
  return plans.filter((p) => p && p.where && (p.where.mu || p.where.lat != null)).map((p) => {
    const w = p.where;
    const deer = /^2-/.test(w.mu || '') && p.species === 'mule-deer'; // Region 2 deer are black tailed deer (plan.js spName)
    const what = deer ? 'Black tailed deer' : (p.speciesName || 'Hunt');
    const when = p.from ? ` ${dateRange(p.from, p.to)}` : '';
    return { kind: 'plan', icon: 'plan', name: 'Go to my hunt plan area', sub: `${what}${w.mu ? `, MU ${w.mu}` : ''}${when ? `,${when}` : ''}`,
      type: '', match: `${what} ${w.mu || ''} ${w.label || ''}`, mu: w.mu || null, lng: w.lon != null ? +w.lon : null, lat: w.lat != null ? +w.lat : null, label: w.label || 'Hunt plan area', planId: p.id };
  });
}
function dateRange(a, b) {
  const f = (s) => { const d = new Date(`${s}T12:00:00`); return isNaN(d) ? s : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }); };
  return b && b !== a ? `${f(a)} to ${f(b)}` : f(a);
}

// ---------- empty box: plans, recent, tips ----------
let shown = [];
function hints() {
  const plans = planList();
  const recent = (prefs.recent || []).slice(0, RECENT_MAX).map((r) => Object.assign({}, r, { recent: true }));
  shown = [...plans, ...recent];
  let i = 0;
  res.innerHTML = `${plans.length ? plans.map((it) => item(it, i++)).join('') : '<p class="hmm-muted hmm-snone">No saved hunt plan yet. <a href="#/plan">Make a hunt plan</a> and a "Go to my hunt plan area" button shows here.</p>'}
    ${recent.length ? `<div class="hmm-shead"><h3 class="hmm-h">Recent searches</h3><button type="button" class="hmm-sclear" data-clear aria-label="Clear recent searches">Clear</button></div>${recent.map((it) => item(it, i++)).join('')}` : ''}
    <h3 class="hmm-h">You can search for</h3>
    <ul class="hmm-tips">
      <li>Towns and lakes: <b>Harrison Lake</b>, <b>Weaver Lake</b>, <b>Chehalis</b></li>
      <li>MU (Management Unit): <b>2-18</b>, <b>MU 2-19</b> or <b>2 8</b></li>
      <li>Rec sites, campgrounds and candidate spots by name</li>
      <li>Your waypoints, lines and tracks by name</li>
      <li>Coordinates: <b>49.3 -121.78</b> or <b>49°18′00″N 121°46′48″W</b></li>
      <li>UTM (Universal Transverse Mercator): <b>10U 589000 5461000</b></li>
    </ul>
    <p class="hmm-muted">Works with no signal for MUs, coordinates, places in the lessons, saved camps, spots and your own items. Other place names need a connection.</p>`;
}

function distOf(it) {
  if (it.lng == null || it.lat == null || !isFinite(it.lng)) return Infinity;
  const c = map.getCenter(); return haversine([c.lng, c.lat], [it.lng, it.lat]);
}
function rel(it) {
  const d = distOf(it); if (!isFinite(d)) return '';
  const c = map.getCenter();
  return d < 50 ? 'Here' : `${units.dist(d)} ${compass8(bearingTo([c.lng, c.lat], [it.lng, it.lat]))}`;
}
function item(it, i) {
  const ic = it.recent ? 'recent' : (it.icon || 'place');
  const d = it.off || it.kind === 'coord' ? '' : rel(it);
  return `<button type="button" class="hmm-sitem ${it.off ? 'off' : ''} ${it.kind === 'plan' ? 'plan' : ''}" data-i="${i}"${it.off ? ' aria-disabled="true"' : ''}>
    <span class="hmm-sic" style="--c:${TINT[ic] || '#455a64'}">${IC[ic] || IC.place}</span>
    <span class="hmm-stxt"><span class="hmm-sname">${esc(it.name)}</span><span class="hmm-ssub">${esc([it.type, it.sub].filter(Boolean).join('. '))}</span></span>
    ${d ? `<span class="hmm-sdist" aria-label="${esc(d)} from the map centre">${esc(d)}</span>` : ''}</button>`;
}
function render(groups, note, status) {
  shown = [];
  const html = groups.filter((g) => g.items.length).map((g) => `<h3 class="hmm-h">${esc(g.title)}</h3>${g.items.map((it) => { shown.push(it); return item(it, shown.length - 1); }).join('')}`).join('');
  res.innerHTML = html
    + (note ? `<div class="hmm-snote">${note}</div>` : '')
    + (status ? `<p class="hmm-muted hmm-sstatus">${esc(status)}</p>` : '')
    + (!html && !status ? '<p class="hmm-muted hmm-snone">No results. Check the spelling, or try a nearby lake, creek or town.</p>' : '');
}
/** Good name matches first, then nearest to the map centre. */
/** Drop "inside a word" matches (ridge in Bridge) when better ones exist. */
const best = (l) => (l.some((x) => x.tier <= 2) ? l.filter((x) => x.tier <= 2) : l);
const byTierDist = (a, b) => ((a.tier > 1) - (b.tier > 1)) || (distOf(a) - distOf(b));
const near = (a, b, m) => a.lng != null && b.lng != null && haversine([a.lng, a.lat], [b.lng, b.lat]) < m;
function dedupe(list, against, m = 2000) {
  const out = [];
  for (const it of list) if (![...against, ...out].some((o) => norm(o.name) === norm(it.name) && near(o, it, m))) out.push(it);
  return out;
}

// ---------- the search ----------
const OFFLINE_NOTE = '<b>No signal.</b> Online place search was skipped (BC Geographical Names, BC Address Geocoder and OpenStreetMap). The results above are saved on this phone: MUs, coordinates, places in the lessons, saved camps, spots and your own items.';
const NOANSWER_NOTE = '<b>Online place search did not answer</b> (weak or no signal). The results above are saved on this phone. Try again when you have signal.';

async function run(q, submit) {
  const my = ++seq;
  if (ctrl) ctrl.abort();
  ctrl = new AbortController(); const signal = ctrl.signal;
  q = q.trim();
  if (!q) { hints(); return; }
  if (q === lastSubmit) submit = true; // the typing timer must not undo a press of Search
  const qn = norm(q);
  const groups = [];
  const D = await placesData().catch(() => null);
  if (my !== seq) return;

  // plans: shown on top when the query is about them
  const mu = q.match(MU_RE), rg = q.match(REGION_RE);
  const plans = planList().filter((p) => (mu ? p.mu === `${+mu[1]}-${+mu[2]}` : /plan|my hunt/i.test(q) || (!parseCoords(q) && [0, 1, 2].includes(matchTier(p.match, qn)))));
  if (plans.length) groups.push({ title: 'Your hunt plans', items: plans });

  // MU and region
  let muFound = false;
  if (mu) {
    const code = `${+mu[1]}-${+mu[2]}`, m = D && D.muById[code];
    if (m) {
      muFound = true;
      const r = D.regById[m.r];
      groups.push({ title: 'MU (Management Unit)', items: [{ kind: 'mu', icon: 'mu', name: `MU ${code}`, type: 'Management Unit', sub: `Region ${m.r}${r ? ` ${r.name}` : ''}${m.z ? `, ${m.z}` : ''}${m.km2 ? `, about ${Math.round(m.km2).toLocaleString('en-CA')} km²` : ''}`, mu: code, lng: m.c[0], lat: m.c[1], bbox: m.b }] });
    } else if (!D) {
      const r = await layers.findMU(code).catch(() => null);
      if (my !== seq) return;
      if (r && r.bbox) { muFound = true; groups.push({ title: 'MU (Management Unit)', items: [{ kind: 'mu', icon: 'mu', name: `MU ${code}`, type: 'Management Unit', sub: r.region || '', mu: code, bbox: r.bbox, lng: (r.bbox[0] + r.bbox[2]) / 2, lat: (r.bbox[1] + r.bbox[3]) / 2 }] }); }
    }
    if (!muFound && /[-–—]|mu|unit/i.test(q)) groups.push({ title: 'MU (Management Unit)', items: [{ kind: 'mu', icon: 'mu', name: `MU ${code}`, type: 'Management Unit', sub: 'Not a BC Management Unit number. Check the number.', off: true }] });
  }
  if (rg && D) {
    const id = rg[1].replace(/\s+/g, '').toUpperCase(), r = D.regById[id];
    if (r) groups.push({ title: 'Region', items: [{ kind: 'region', icon: 'mu', name: `Region ${r.id} ${r.name}`, type: 'Hunting region', sub: `${r.mus} MUs (Management Units)`, region: r.id, lng: r.c[0], lat: r.c[1], bbox: r.b }] });
  }

  // coordinates (two small whole numbers like "3 27" are an MU, not a point in the ocean)
  const c = parseCoords(q);
  const coordOk = c && !(muFound && /^\s*\d{1,2}\s+\d{1,2}\s*$/.test(q));
  if (coordOk) {
    const inMu = D ? muAtPoint(D, c.lon, c.lat) : null;
    groups.unshift({ title: 'Coordinates', items: [{ kind: 'coord', icon: 'coord', name: formatCoord(c.lon, c.lat, 'dd'), type: c.kind, sub: [c.note, inMu ? `In MU ${inMu} (small outline, check on the map)` : ''].filter(Boolean).join(' '), lng: c.lon, lat: c.lat, zoom: 15 }] });
  }
  if (muFound || coordOk || rg || q.length < 2) { render(groups); return; }

  // places saved on this phone
  let places = [];
  if (D) {
    for (const p of D.list) { const t = matchTier(p.name, qn); if (t >= 0) places.push({ kind: 'place', icon: placeIcon(p.type), name: p.name, type: p.type, sub: p.mu ? `MU ${p.mu}` : '', lng: p.lng, lat: p.lat, zoom: /lake|river|range|plateau/i.test(p.type) ? 12 : 13, tier: t, mu: null, placeMu: p.mu }); }
    places = best(places).sort(byTierDist).slice(0, 8);
    if (places.length) groups.push({ title: 'Places (saved on this phone)', items: places });
  }
  render(groups, '', 'Looking in camps, spots and your saved items');

  // camps, rec sites, spots, saved items
  const [camp, local, mine] = await Promise.all([
    campFeatures().catch(() => ({ feats: [], l: null })),
    layers.searchLocal(q).catch(() => []),
    savedItems().catch(() => []),
  ]);
  if (my !== seq) return;
  let camps = [];
  for (const f of camp.feats) {
    const p = f.properties || {}, t = Math.max(matchTier(p.name, qn), p.park ? matchTier(p.park, qn) : -1);
    if (t < 0 || !f.geometry || f.geometry.type !== 'Point') continue;
    const closed = p.closure || p.isOpen === false;
    camps.push({ kind: 'camp', icon: 'camp', name: p.name, type: CAMP_TYPE[p.t] || p.typeLabel || 'Camp', sub: [p.kind, p.park && p.park !== p.name ? p.park : '', closed ? 'Closure listed' : ''].filter(Boolean).join(', '), lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], zoom: 15, tier: t, feat: f, layer: camp.l });
  }
  const recs = local.filter((x) => !x.onPick).map((x) => ({ kind: 'camp', icon: 'camp', name: x.name, type: 'Rec site or campground', sub: '', lng: x.lng, lat: x.lat, zoom: 15, tier: matchTier(x.name, qn) }));
  camps = best([...camps, ...dedupe(recs, camps, 1500)].filter((x) => x.tier >= 0)).sort(byTierDist).slice(0, 8);
  if (camps.length) groups.push({ title: 'Camps and rec sites', items: camps });
  let spotsHit = local.filter((x) => x.onPick).map((x) => ({ kind: 'spot', icon: 'spot', name: x.name, type: 'Candidate spot', sub: x.sub || 'Scout it first', lng: x.lng, lat: x.lat, zoom: 15, tier: matchTier(x.name, qn), onPick: x.onPick }));
  spotsHit = best(spotsHit.filter((x) => x.tier >= 0)).sort(byTierDist).slice(0, 6);
  if (spotsHit.length) groups.push({ title: 'Candidate spots', items: spotsHit });
  const own = [];
  for (const it of mine) {
    const t = matchTier(it.name, qn); if (t < 0 || !it.coords || !it.coords.length) continue;
    const pt = it.kind === 'wpt' ? it.coords : it.coords[Math.floor(it.coords.length / 2)];
    if (!pt || !isFinite(pt[0])) continue;
    own.push({ kind: 'mine', icon: it.kind === 'wpt' ? 'wpt' : it.kind, name: it.name || KIND_LABEL[it.kind], type: KIND_LABEL[it.kind] || 'Your item', sub: '', lng: pt[0], lat: pt[1], tier: t, itemId: it.id, itemKind: it.kind });
  }
  const ownBest = best(own).sort(byTierDist);
  own.length = 0; own.push(...ownBest);
  if (own.length) groups.push({ title: 'Your waypoints, lines and tracks', items: own.slice(0, 8) });
  // your own exact matches go first: you named it, you want it
  if (own.some((x) => x.tier === 0)) { const g = groups.pop(); groups.splice(plans.length ? 1 : 0, 0, g); }

  if (q.length < 3) { render(groups); return; }
  if (!navigator.onLine) { render(groups, OFFLINE_NOTE); return; }
  render(groups, '', 'Searching BC place names online');
  const [names, addr] = await Promise.all([bcNames(q, signal).catch(() => null), bcGeocoder(q, signal).catch(() => null)]);
  if (my !== seq) return;
  const already = [...places, ...camps];
  // close spellings (Beaver Lake for Weaver Lake) only when nothing spelled like the search came back
  const localN = groups.reduce((n, g) => n + g.items.length, 0);
  const close = (l) => (l.some((x) => x.match >= 0) ? l.filter((x) => x.match >= 0) : localN ? [] : l);
  const n2 = names ? dedupe(close(names), already).sort(byTierDist).slice(0, 8) : [];
  const a2 = addr ? dedupe(close(addr), [...already, ...n2]).slice(0, 5) : [];
  if (n2.length) groups.push({ title: n2.some((x) => x.match >= 0) ? 'More places (online: BC Geographical Names)' : 'Close spellings (online: BC Geographical Names)', items: n2 });
  if (a2.length) groups.push({ title: 'Roads and addresses (online: BC Address Geocoder)', items: a2 });
  const failed = names == null && addr == null;
  if (failed && !navigator.onLine) { render(groups, OFFLINE_NOTE); return; }
  if (!submit && (n2.length + a2.length > 0 || localN > 0)) { render(groups, failed ? NOANSWER_NOTE : '', failed ? '' : 'Press Search (Enter) to also look in OpenStreetMap.'); return; }
  render(groups, failed ? NOANSWER_NOTE : '', 'Searching OpenStreetMap');
  const wait = Math.max(0, lastNomi + 1100 - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  if (my !== seq) return;
  lastNomi = Date.now();
  const osm = await nominatim(q, signal).catch(() => null);
  if (my !== seq) return;
  const o2 = osm ? dedupe(osm, groups.flatMap((g) => g.items)).sort(byTierDist).slice(0, 6) : [];
  if (o2.length) groups.push({ title: 'More places (online: OpenStreetMap)', items: o2 });
  render(groups, failed && osm == null ? (navigator.onLine ? NOANSWER_NOTE : OFFLINE_NOTE) : '');
}

/** Which MU holds this point, from the small outlines (about 1 km). Not for legal boundaries. */
function muAtPoint(D, lng, lat) {
  for (const m of D.mu.mus) {
    const b = m.b; if (lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) continue;
    for (const ring of rings(m.o)) if (inRing(lng, lat, ring)) return m.id;
  }
  return null;
}
function rings(o) {
  return (o || []).map((r) => { const out = []; let x = r[0], y = r[1]; out.push([x / 1000, y / 1000]); for (let i = 2; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; out.push([x / 1000, y / 1000]); } return out; });
}
function inRing(x, y, ring) {
  let ins = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

// ---------- online services ----------
async function getJSON(url, signal, ms = 7000) {
  const t = new AbortController(), stop = () => t.abort();
  signal.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, ms);
  try {
    const r = await fetch(url, { signal: t.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); signal.removeEventListener('abort', stop); }
}
async function bcNames(q, signal) {
  const d = await getJSON(`https://apps.gov.bc.ca/pub/bcgnws/names/search?name=${encodeURIComponent(q)}&outputFormat=json&outputSRS=4326&itemsPerPage=12`, signal);
  const qn = norm(q);
  return (d.features || []).filter((f) => f.geometry && f.geometry.type === 'Point' && f.properties.status !== 'rescinded')
    .sort((a, b) => (b.properties.isOfficial || 0) - (a.properties.isOfficial || 0))
    .slice(0, 10).map((f) => {
      const type = String(f.properties.featureType || 'Place').replace(/\s*\(\d+\)$/, '');
      return { kind: 'online', icon: placeIcon(type), name: f.properties.name, type, sub: 'BC Geographical Names', lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], zoom: WATER.test(type) ? 12 : 13, match: matchTier(f.properties.name, qn), tier: Math.max(0, matchTier(f.properties.name, qn)) };
    });
}
const PREC = { CIVIC_NUMBER: 'Address', BLOCK: 'Address block', STREET: 'Road or street', INTERSECTION: 'Intersection', LOCALITY: 'Community', SITE: 'Site', UNIT: 'Address' };
async function bcGeocoder(q, signal) {
  const d = await getJSON(`https://geocoder.api.gov.bc.ca/addresses.json?addressString=${encodeURIComponent(q)}&maxResults=5&outputSRS=4326&minScore=55`, signal);
  const qn = norm(q);
  return (d.features || []).filter((f) => PREC[f.properties.matchPrecision]).map((f) => ({
    kind: 'online', match: matchTier(String(f.properties.fullAddress || ''), qn), icon: f.properties.matchPrecision === 'LOCALITY' ? 'town' : 'road',
    name: String(f.properties.fullAddress || '').replace(/, BC$/, ''), type: PREC[f.properties.matchPrecision], sub: 'BC Address Geocoder',
    lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], zoom: f.properties.matchPrecision === 'LOCALITY' ? 13 : 16,
  }));
}
async function nominatim(q, signal) {
  const d = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=ca&viewbox=-139.1,60.1,-114,48.2&accept-language=en&q=${encodeURIComponent(q)}`, signal, 9000);
  return d.map((r) => {
    const parts = String(r.display_name || '').split(', ');
    const bb = r.boundingbox ? [+r.boundingbox[2], +r.boundingbox[0], +r.boundingbox[3], +r.boundingbox[1]] : null;
    const type = cap(String(r.type || '').replace(/_/g, ' '));
    return { kind: 'online', icon: placeIcon(`${r.category || ''} ${r.type || ''}`), name: r.name || parts[0], type, sub: `OpenStreetMap. ${parts.slice(1, 3).join(', ')}`, lng: +r.lon, lat: +r.lat, bbox: bb && (bb[2] - bb[0]) > 0.002 ? bb : null, zoom: 14 };
  });
}

// ---------- go there ----------
const PAD = () => ({ top: 140, bottom: 200, left: 40, right: 40 });
async function focusArea(param) {
  try {
    const m = await import('./focus.js');
    await m.default(H, param);
    return true;
  } catch (err) { console.warn('Hunt Map focus', err); return false; }
}
async function go(it) {
  close();
  remember(it);
  if (it.kind === 'mu' && it.mu) {
    if (pin) { pin.remove(); pin = null; }
    if (!(await focusArea(`mu/${it.mu}`)) && it.bbox) map.fitBounds([[it.bbox[0], it.bbox[1]], [it.bbox[2], it.bbox[3]]], { padding: PAD(), maxZoom: 13, duration: 900 });
    return;
  }
  if (it.kind === 'region' && it.region) { if (pin) { pin.remove(); pin = null; } await focusArea(`region/${it.region}`); return; }
  if (it.kind === 'plan') {
    const D = await placesData().catch(() => null);
    if (it.mu && D && D.muById[it.mu]) await focusArea(`mu/${it.mu}`);
    else if (it.lng != null) map.flyTo({ center: [it.lng, it.lat], zoom: 11, essential: true, duration: 1200 });
    if (it.lng != null) dropPin({ name: it.label, sub: it.sub, lng: it.lng, lat: it.lat });
    H.toast(`Your hunt plan area${it.mu ? `: MU ${it.mu}` : ''}. Orange line: the unit.`, 4500);
    return;
  }
  if (it.kind === 'mine' && it.itemId) {
    const tools = H.tools;
    if (tools && tools.openItem) {
      const rec = (tools.items || []).find((x) => x.id === it.itemId);
      if (rec) { await tools.openItem(rec.id); if (tools.fitItem) tools.fitItem(rec); return; }
    }
    map.flyTo({ center: [it.lng, it.lat], zoom: Math.max(map.getZoom(), 14), essential: true, duration: 1200 });
    return;
  }
  if (it.bbox) map.fitBounds([[it.bbox[0], it.bbox[1]], [it.bbox[2], it.bbox[3]]], { padding: PAD(), maxZoom: 15, duration: 1400 });
  else map.flyTo({ center: [it.lng, it.lat], zoom: it.zoom || Math.max(map.getZoom(), 13), essential: true, duration: 1400 });
  if (it.onPick) { it.onPick(); return; }
  dropPin(it);
  if (it.kind === 'camp' && it.feat && it.layer) map.once('moveend', () => { try { openCamp(H, it.layer, it.feat); } catch (err) { console.warn('Hunt Map camp card', err); } });
}
function remember(it) {
  if (it.kind === 'plan' || it.off) return;
  const keep = { name: it.name, type: it.type || '', sub: it.sub || '', icon: it.icon, kind: it.kind === 'spot' || it.kind === 'camp' ? 'place' : it.kind, lng: it.lng, lat: it.lat, zoom: it.zoom || null, bbox: it.bbox || null };
  if (it.mu) keep.mu = it.mu;
  if (it.region) keep.region = it.region;
  if (it.itemId) { keep.itemId = it.itemId; keep.itemKind = it.itemKind; }
  const r = (prefs.recent || []).filter((x) => !(x.name === keep.name && x.kind === keep.kind));
  r.unshift(keep);
  prefs.recent = r.slice(0, RECENT_MAX); savePrefs();
}

/** Red search pin. Tap it for links. */
export function dropPin(it) {
  if (pin) pin.remove();
  const el = document.createElement('button');
  el.className = 'hmm-pin'; el.setAttribute('aria-label', `Search result: ${it.name}`);
  el.innerHTML = `<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 41S30 25.6 30 15.4A14 14 0 0 0 2 15.4C2 25.6 16 41 16 41Z" fill="#e4472b" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="5.2" fill="#fff"/></svg><span>${esc(it.name)}</span>`;
  pin = new H.maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([it.lng, it.lat]).addTo(map);
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    const body = H.openSheet({ title: it.name, modal: false, html: `<p class="hmm-muted">${esc([it.type, it.sub].filter(Boolean).join('. '))}</p>
      <p>${esc(units.coord(it.lng, it.lat))}</p>${H.ui.linksHtml(it.lat, it.lng, it.name)}
      <div class="hmm-btnrow"><button class="hmm-btn2" data-act2="rm">Remove pin</button></div>` });
    body.querySelector('[data-act2="rm"]').onclick = () => { if (pin) { pin.remove(); pin = null; } H.closeSheet(); };
  });
}

/** Start loading the offline data when the box opens, so the first letters answer at once. */
function warm() { placesData().catch(() => {}); }
export const _test = { campFeatures, placesData, planList };
