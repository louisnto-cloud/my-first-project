/* Hunt Map tool: "Where can I practise?" Practice shooting (sight in a rifle, pattern a shotgun, practise with a bow), all of BC.
   A sibling of "Can I hunt here now?" (hunt-canhunt.js), but about target practice, not seasons. Three parts in one sheet:
     1. Can I shoot for practice here? YES / NO / CHECK for a tapped point, from the app's data only:
        private land, reserves, parks, city limits, WMAs (Wildlife Management Areas), the no shooting / no hunting layer (no_hunting),
        recreation sites (rec_sites, 100 m developed part), buildings within 100 m and roads within 15 m (OpenStreetMap map detail, hunt-osm.js),
        a range nearby (ranges layer), and the closures not drawn for this MU (data/addons/noshoot/unmapped.json).
        Rule: any NO gives NO; anything unknown or needing a check gives CHECK; otherwise "YES, from the app's data" (never a certain yes).
     2. Shooting ranges and clubs near the map centre: data/addons/practice/ranges.geojson (scripts/build-ranges.py, OpenStreetMap, ODbL).
     3. The rules card and the safe backstop checklist: data/addons/practice/rules.json and backstop.svg (the lessons' hf-backstop diagram).
   All files are precached (data/addons), so the sheet works offline; the building and road check needs map detail saved in Offline Maps.
   Deep link: #/map/tool/practice (handled here, from the hash). Loaded by tools-main.js; sets H.practice = { open, check, evaluate }. */
import { esc, haversine } from './util.js';
import * as layers from './layers.js';
import { nearLayer } from './tools-insights.js';
import { osmArea, isRoad, toLngLat } from './hunt-osm.js';
import * as ui from './hunt-ui.js';

let H, map, active = false, tok = 0, mk = null, lastP = null;
export const TITLE = 'Where can I practise?';
const RANGES = 'data/addons/practice/ranges.geojson', RULES = 'data/addons/practice/rules.json', UNMAPPED = 'data/addons/noshoot/unmapped.json';
const SYN = 'BC Hunting and Trapping Regulations Synopsis 2026 to 2028';
const SYN_URL = 'https://www2.gov.bc.ca/assets/gov/sports-recreation-arts-and-culture/outdoor-recreation/fishing-and-hunting/hunting/regulations/2026-2028/hunting-trapping-synopsis.pdf';
const FA_URL = 'https://laws-lois.justice.gc.ca/eng/acts/F-11.6/section-17.html';
const BCWS_URL = 'https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions';
const FVRD_URL = 'https://news.gov.bc.ca/releases/2017FLNR0073-001092';
const BCWF_URL = 'https://bcwf.bc.ca/our-clubs/';
export const METHODS = [
  { k: 'rifle', l: 'Rifle (sight in)', f: 'rifle' },
  { k: 'shot', l: 'Shotgun (pattern or clays)', f: 'shot' },
  { k: 'bow', l: 'Bow or crossbow', f: 'bow' },
  { k: 'pistol', l: 'Handgun (restricted firearm)', f: 'rifle' },
];
const KIND = { rifle: ['Rifle', '#ffab00'], shotgun: ['Shotgun', '#6200ea'], archery: ['Archery', '#00bfa5'], pistol: ['Pistol', '#3e2723'], mixed: ['More than one type', '#3e2723'], unknown: ['Type not in the data', '#3e2723'] };
const NEAR_RANGE_M = 300;

export function init(api) {
  H = api; map = H.map;
  ui.setH(H);
  loadCss();
  H.onClick((e) => {
    if (!active || !H.els || H.els.sheet.hidden || H.els.sheetT.textContent !== TITLE) return false;
    check([e.lngLat.lng, e.lngLat.lat]);
    return true;
  });
  H.practice = { open, check, evaluate, TITLE };
  // deep link #/map/tool/practice (core.js opens the map; this opens the tool)
  const fromHash = () => {
    if (!/^#\/map\/tool\/practice\b/.test(location.hash)) return;
    try { history.replaceState(history.state, '', location.href.replace(/#\/map\/tool\/practice.*$/, '#/map')); } catch (err) { /* old browser: the link stays */ }
    setTimeout(() => open(), 0); // after the map's own open() (closing the sheet later must not reopen it from the link)
  };
  fromHash();
  if (H.on) H.on('open', fromHash);
  window.addEventListener('hashchange', () => { if (H.isOpen) fromHash(); });
}

function loadCss() {
  const href = new URL('./hunt.css', import.meta.url).href;
  if (![...document.styleSheets].some((s) => s.href === href) && !document.querySelector(`link[href="${href}"]`)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }
  if (document.getElementById('hp-css')) return;
  const s = document.createElement('style'); s.id = 'hp-css';
  s.textContent = `.hp-list{list-style:none;margin:6px 0;padding:0}.hp-list>li{padding:10px 0;border-bottom:1px solid rgba(127,127,127,.25);font-size:15px;line-height:1.4}
.hp-list small{display:block;font-size:14px;opacity:.8}.hp-dot{display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35);vertical-align:-2px;margin-right:6px}
.hp-sec{margin:12px 0}.hp-sec>summary{min-height:44px;display:flex;align-items:center;font-weight:700;font-size:16px;cursor:pointer}
.hp-rule b{display:block}.hp-verify{color:#b26a00;font-weight:700}.hp-fig svg{width:100%;height:auto;max-height:340px}.hp-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.hp-out small{font-size:14px}.hp-row a,.hp-row button{min-height:44px;display:inline-flex;align-items:center}.hp-off{background:rgba(255,171,0,.15);border-left:4px solid #ffab00;padding:8px 10px;font-size:14px}`;
  document.head.appendChild(s);
}

const jsonCache = new Map();
function getJSON(u) {
  if (!jsonCache.has(u)) { const p = fetch(u).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }); jsonCache.set(u, p); p.catch(() => jsonCache.delete(u)); }
  return jsonCache.get(u);
}
const safe = (p) => Promise.resolve(p).catch(() => null);
/** nearLayer, tried once more after a short wait when a read fails online (a tile read can time out while the map is busy loading). */
async function near(id, p, r) {
  const a = await safe(nearLayer(id, p, r));
  if ((a && a.state === 'ok') || (a && a.state === 'missing') || navigator.onLine === false) return a;
  await new Promise((res) => setTimeout(res, 900));
  return (await safe(nearLayer(id, p, r))) || a;
}
const cert = (v) => (v == null ? '<span class="hp-verify">VERIFY</span>' : H.ui && H.ui.cert ? H.ui.cert(v) : `${v}%`);
const methodOf = (k) => METHODS.find((m) => m.k === k) || METHODS[0];
const prefMethod = () => methodOf(H.prefs.prMethod || 'rifle');
const km = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);

// ---------- sheet ----------
export function open(p) {
  active = true;
  const m = prefMethod();
  const body = H.openSheet({ title: TITLE, modal: false, bar: 'tools',
    onClose: ui.peek(() => { active = false; setMarker(null); }),
    html: `${ui.intro('where you can shoot for practice: a range near you, and a YES, NO or CHECK for one spot on Crown land (public land owned by the province).',
      ['Easiest and safest: use a range or club (list below). Membership or day fees may apply: call first (Tip).',
        'To check a spot: pick how you will shoot, then tap the map (the sheet stays open), or use the buttons.',
        'The check reads the app\'s own map layers. It never gives a certain yes: read every line and the “Still check yourself” list.'])}
    ${navigator.onLine === false ? '<p class="hp-off">You are offline. The check uses what is saved on this phone: the ranges, rules and land layers you opened before, and map detail saved in Offline Maps.</p>' : ''}
    <h3 class="hmm-h">Can I shoot for practice here?</h3>
    <label class="hmm-field">How you will shoot<select data-pr="method" class="hh-select">${METHODS.map((x) => `<option value="${x.k}" ${x.k === m.k ? 'selected' : ''}>${esc(x.l)}</option>`).join('')}</select></label>
    <div data-out="pr" class="hp-out">${lastP ? '' : '<p class="hh-tapnow">Tap any point on the map.</p>'}</div>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-pr="centre">Check the map centre</button><button class="hmm-btn2" data-pr="gps">Check my location</button></div>
    <details class="hp-sec" open data-sec="ranges"><summary>Shooting ranges and clubs near the map centre</summary><div data-out="ranges"><p class="hmm-muted">Loading…</p></div></details>
    <details class="hp-sec" data-sec="rules"><summary>Target shooting on Crown land: the rules</summary><div data-out="rules"><p class="hmm-muted">Loading…</p></div></details>
    <details class="hp-sec" data-sec="backstop"><summary>Safe backstop checklist</summary><div data-out="backstop"><p class="hmm-muted">Loading…</p></div></details>
    <p class="hmm-muted">Lessons: <a href="#/s/season-practice/0">A season practice plan</a> · <a href="#/s/legal-to-shoot/0">Is it legal to shoot?</a> · <a href="#/s/rb-where-you-can-hunt/0">Rule Book: where you can and cannot hunt</a></p>
    ${ui.BANNER}` });
  const sel = body.querySelector('[data-pr="method"]');
  sel.onchange = () => { H.prefs.prMethod = sel.value; H.savePrefs(); if (lastP) check(lastP); };
  body.querySelector('[data-pr="centre"]').onclick = () => check(ui.here('centre'));
  body.querySelector('[data-pr="gps"]').onclick = () => { const q = ui.here('gps'); if (q) check(q); };
  fillRanges(body); fillRules(body); fillBackstop(body);
  if (p) check(p); else if (lastP && haversine(lastP, [map.getCenter().lng, map.getCenter().lat]) < 20000) check(lastP);
  return body;
}

async function fillRanges(body) {
  const out = body.querySelector('[data-out="ranges"]');
  const fc = await safe(getJSON(RANGES));
  if (!out.isConnected) return;
  if (!fc) { out.innerHTML = '<p>The range list is not on this phone yet. Open the app once with signal.</p>'; return; }
  const c = map.getCenter(), at = [c.lng, c.lat];
  const near = fc.features.map((f) => ({ f, d: haversine(at, f.geometry.coordinates) })).sort((a, b) => a.d - b.d).slice(0, 6);
  out.innerHTML = `<ul class="hp-list">${near.map(({ f, d }, i) => { const p = f.properties, k = KIND[p.kind] || KIND.unknown;
    return `<li><span class="hp-dot" style="background:${k[1]}"></span><b>${esc(p.name)}</b> <span class="hmm-muted">${km(d)} away, MU (Management Unit) ${esc(p.mu || '')}</span>
      <small>${esc(p.types)}${p.access ? `. ${esc(p.access)}` : ''}${p.indoor ? '. Indoor' : ''}</small>
      ${p.parts ? `<small>Parts: ${esc(p.parts)}</small>` : ''}
      <div class="hp-row"><button class="hmm-btn2" data-go="${i}">Show on map</button>${p.website ? `<a class="hmm-btn2" href="${esc(p.website)}" target="_blank" rel="noopener">Website</a>` : ''}${p.phone ? `<a class="hmm-btn2" href="tel:${esc(p.phone.replace(/[^\d+]/g, ''))}">Call ${esc(p.phone)}</a>` : ''}</div>
      <small>${esc(p.note || 'Membership or day fees may apply. Call first (Tip).')}${!p.website && !p.phone ? ' No website or phone in the data.' : ''}</small></li>`; }).join('')}</ul>
    <p class="hmm-muted">${fc.features.length} sites across BC from OpenStreetMap (map data ${esc(fc.osmDate || '')}, © OpenStreetMap contributors, ODbL: Open Database Licence). Volunteer mapped: some clubs are missing and some may have closed. Certainty ${cert(70)}.</p>
    <p class="hmm-muted">More clubs: <a href="${BCWF_URL}" target="_blank" rel="noopener">BC Wildlife Federation club list</a> (by region; not copied into the app).</p>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-pr="layer">Show all ranges on the map</button></div>`;
  out.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => { const f = near[+b.dataset.go].f; showRanges(); map.flyTo({ center: f.geometry.coordinates, zoom: Math.max(map.getZoom(), 13) }); });
  out.querySelector('[data-pr="layer"]').onclick = () => { showRanges(); H.toast && H.toast('Ranges layer on: amber rifle, violet shotgun, aqua archery, brown other.', 3500); };
}
function showRanges() { try { layers.setOn('ranges', true); } catch (err) { console.warn('ranges layer', err); } }

async function fillRules(body) {
  const out = body.querySelector('[data-out="rules"]');
  const R = await safe(getJSON(RULES));
  if (!out.isConnected) return;
  if (!R) { out.innerHTML = '<p>The rules card is not on this phone yet. Open the app once with signal.</p>'; return; }
  const S = R.sources || {};
  out.innerHTML = `<p>${esc(R.note || '')}</p><ul class="hp-list">${R.rules.map((r) => { const s = S[r.src];
    return `<li class="hp-rule"><b>${esc(r.h)}</b>${esc(r.t).replace(/VERIFY/g, '<span class="hp-verify">VERIFY</span>')}
      <small>${s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>${r.where ? `, ${esc(r.where)}` : ''}. ` : ''}${cert(r.cert)}. Checked ${esc(r.checked || R.checked)}.</small></li>`; }).join('')}</ul>`;
}

async function fillBackstop(body) {
  const out = body.querySelector('[data-out="backstop"]');
  const R = await safe(getJSON(RULES));
  const svg = await safe(fetch('data/addons/practice/backstop.svg').then((r) => (r.ok ? r.text() : null)));
  if (!out.isConnected) return;
  if (!R) { out.innerHTML = '<p>The checklist is not on this phone yet. Open the app once with signal.</p>'; return; }
  const B = R.backstop;
  out.innerHTML = `${svg && /^\s*<svg/.test(svg) ? `<figure class="hp-fig">${svg}</figure>` : ''}
    <ul class="hp-list">${B.items.map((x) => `<li>☐ ${esc(x.t)} <small>${esc(x.tag)}</small></li>`).join('')}</ul>
    <p class="hmm-muted">${esc(B.from)}.</p>`;
}

// ---------- the check ----------
export async function check(p) {
  if (!p) return null;
  lastP = p;
  const my = ++tok, body = H.els.sheetB;
  if (H.els.sheet.hidden || H.els.sheetT.textContent !== TITLE) { open(p); return null; }
  setMarker(p);
  const out = body.querySelector('[data-out="pr"]');
  if (out) { out.innerHTML = `<p class="hh-tapnow">Checking ${esc(H.units.coord(p[0], p[1]))}</p>`; toTop(body, out); }
  const R = await evaluate(p, prefMethod().k);
  if (my !== tok || H.els.sheetB !== body || H.els.sheet.hidden) return R;
  const o = body.querySelector('[data-out="pr"]');
  if (o) { o.innerHTML = render(R); toTop(body, o); }
  return R;
}
const toTop = (body, el) => { body.scrollTop = Math.max(0, body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - 6); };

/** Every practice check for point p and method (rifle | shot | bow | pistol). Returns { light: 'yes' | 'no' | 'check', items, remind, ... }. */
export async function evaluate(p, method) {
  const meth = methodOf(method);
  const items = [], remind = [];
  const add = (st, h, t, src) => items.push({ st, h, t, src: src || '' });
  const syn = (page, c, extra) => `${SYN}, page ${page}${extra ? ` ${extra}` : ''}. ${cert(c)} <a href="${SYN_URL}" target="_blank" rel="noopener">Synopsis PDF</a>`;
  const [mu, priv, res, park, city, wma, nsh, rec, unm, rng, osm] = await Promise.all([
    safe(layers.muAt(p)), near('private_land', p, 0), near('reserves', p, 0), near('parks', p, 0),
    near('city_limits', p, 0), near('wma', p, 0), near('no_hunting', p, 0), near('rec_sites', p, 200),
    safe(getJSON(UNMAPPED)), safe(getJSON(RANGES)),
    safe(osmArea(map, bboxAround(p, 160), ['building', 'transportation'])),
  ]);
  const muId = mu && mu.state === 'ok' && mu.id ? mu.id : null;
  const region = muId ? muId.split('-')[0] : null;
  if (muId) add('info', `MU (Management Unit) ${esc(muId)}`, 'Seasons do not matter for practice. The MU is used to list the closures not drawn on the map.', '');
  else add('check', 'MU (Management Unit) unknown', 'The MU map for this spot is not on this phone, or the point is outside BC. The app cannot list the No Shooting Areas that are not drawn. Open the map once with signal, or save this area in Offline Maps.');

  // a range at this spot: the club's rules decide
  let range = null;
  if (rng && rng.features) for (const f of rng.features) { const d = haversine(p, f.geometry.coordinates); if (d <= NEAR_RANGE_M && (!range || d < range.d)) range = { f, d }; }
  if (range) add('info', `Range in the data ${km(range.d)} away: ${esc(range.f.properties.name)}`, `${esc(range.f.properties.types)}. On a range, shoot only as a member or guest, by the club's rules and range officer. ${esc(range.f.properties.note || '')}`, 'OpenStreetMap contributors (ODbL). Certainty 70%');
  // handguns: approved range only
  if (meth.k === 'pistol') {
    const t = 'A restricted or prohibited firearm (most handguns) may be kept only at your home or at a place a chief firearms officer authorizes, such as an approved range.';
    const src = `Firearms Act (Canada), section 17. ${cert(95)} <a href="${FA_URL}" target="_blank" rel="noopener">Firearms Act</a>`;
    if (range) add('check', 'Handgun: only at an approved range', `${t} Ask the club if this range is approved for handguns.`, src);
    else add('no', 'Handgun: not here', `${t} No handgun practice on Crown land.`, src);
  }

  // land status
  const lay = (x) => (x && x.layer ? `${esc(x.layer.source || '')}, data ${esc(x.layer.dataDate || '')}. Layer ${cert(x.layer.cert)}` : '');
  const inside = (x) => x && x.hits && x.hits.find((h) => h.dist === 0);
  const read = (x) => x && x.state === 'ok';
  const pv = inside(priv), rv = inside(res), pk = inside(park), ct = inside(city), wm = inside(wma);
  if (pv) add(range ? 'check' : 'no', 'Private land', `You need the owner's permission to shoot here${range ? ' (a club range is usually on its own land: shoot there only as a member or guest)' : ''}. Town bylaws and the 100 m rule still apply on private land.`, `${syn(9, 90, '(private land; my reading for target practice)')}<br>Map: ${lay(priv)}`);
  if (rv) add('no', `First Nations reserve${rv.props.name ? `: ${esc(rv.props.name)}` : ''}`, 'A reserve is treated like private land. Ask the Nation for permission.', `${syn(9, 95)}<br>Map: ${lay(res)}`);
  if (pk) add('no', `${esc(pk.props.designation || 'Park or protected area')}${pk.props.name ? `: ${esc(pk.props.name)}` : ''}`, 'When a park is closed to hunting or no season is open, carrying and firing a firearm or bow are banned unless a park officer allows it. Hunting is the only shooting the synopsis allows in a park: no target practice (my reading).', `${syn(9, 85)}<br>Map: ${lay(park)}`);
  if (ct) add('check', `Inside ${esc(ct.props.name || ct.props.abbr || 'city or town limits')}`, 'Most municipalities restrict firearms and bows by bylaw, and bylaws are not in the synopsis. Ask the municipal clerk before you shoot.', `${syn(9, 99)}<br>Map: ${lay(city)}`);
  if (wm) add('check', `Wildlife Management Area (WMA)${wm.props.name ? `: ${esc(wm.props.name)}` : ''}`, 'Some WMAs limit shooting. Call the regional office before you shoot here.', `${syn(9, 99)}<br>Map: ${lay(wma)}`);
  for (const h of nsh && nsh.hits ? nsh.hits.filter((x) => x.dist === 0) : []) {
    const x = h.props, v = x[meth.f] || 'check', head = `${esc(x.ban || 'No shooting or hunting area')} ${esc(x.name || '')}`;
    const src = `${esc(x.src || SYN)}${x.map ? `, Map ${esc(x.map)}` : ''}. ${x.page ? `<a href="${SYN_URL}" target="_blank" rel="noopener">Synopsis PDF</a>. ` : ''}Area ${cert(x.cert || 80)}<br>Boundary: ${esc(x.boundary || '')}`;
    const why = `${esc(x.rule || '')}<br>${esc(x.methods || '')}<br>You picked: ${esc(meth.l.toLowerCase())}.`;
    if (v === 'no') add('no', head, `${why} Not allowed here.`, src);
    else if (v === 'check') add('check', head, `${why} ${x.kind === 'noshoot' ? 'Bows: read the synopsis map for a restriction first.' : 'The app cannot tell if this exact spot is closed. Read the rule and the map.'}`, src);
    else add('info', head, `${why} This rule does not ban it.`, src);
  }
  if (!nsh || nsh.state !== 'ok') add('check', 'No shooting areas: not checked', 'The no shooting layer is not on this phone here. Open the map with signal, or save this area in Offline Maps.');
  // recreation sites: the developed part is 100 m from a structure, campsite or staging area; the map has one point per site
  const rs = rec && rec.hits ? rec.hits[0] : null;
  if (rs) add('check', `Recreation site ${km(rs.dist)} away${rs.props.name ? `: ${esc(rs.props.name)}` : ''}`, 'No firing a firearm, bow or crossbow on or into the developed part of a recreation site: 100 m (109 yd) from any structure, day use area, campsite or trail staging area. The map shows one point per site, so the developed part may reach further. Move well away.', `${syn(9, 99, '(Recreation Sites and Trails)')}<br>Map: ${lay(rec)}`);
  else if (!rec || rec.state !== 'ok') remind.push({ t: 'Recreation sites were not checked here (no data on this phone for this area). No shooting within 100 m (109 yd) of a site\'s structures, campsites or staging area.', page: 9, cert: 99 });

  const covers = (id) => { const st = layers.stateOf(id); return !!(st && st.files.some((f) => !f.box || (p[0] >= f.box[0] && p[0] <= f.box[2] && p[1] >= f.box[1] && p[1] <= f.box[3]))); };
  const LAND = [['private land', 'private_land', priv], ['reserves', 'reserves', res], ['parks', 'parks', park], ['city limits', 'city_limits', city]];
  const noData = LAND.filter(([, id, x]) => !read(x) && !covers(id)).map(([n]) => n);
  const unread = LAND.filter(([, id, x]) => !read(x) && covers(id)).map(([n]) => n);
  if (noData.length) add('check', 'No land data for this area in the app', `Not checked here: ${noData.join(', ')}. The app has this layer only for the areas it covers. Check a land status map or ask the land owner.`);
  if (unread.length) add('check', 'Some land layers are not on this phone here', `Not checked: ${unread.join(', ')}. Open the map with signal, or save this area in Offline Maps.`);
  if (!noData.length && !unread.length && !pv && !rv && !pk && !ct && !wm) add('ok', 'Land status layers', 'No private land, reserve, park, city limits, WMA or mapped no shooting area at this point in the loaded layers. Looks like Crown land in the app\'s data. Signs on the ground still rule.');

  // buildings and roads (OpenStreetMap: not every building is mapped)
  if (osm && osm.got) {
    let bd = Infinity, rd = Infinity;
    for (const f of osm.feats) {
      if (f.layer === 'building') bd = Math.min(bd, featDist(f, p));
      else if (isRoad(f) && f.layer === 'transportation' && ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'].includes(f.props.class)) rd = Math.min(rd, featDist(f, p));
    }
    if (bd <= 100) add('check', `Building ${bd < 5 ? 'right here' : `${Math.round(bd)} m away`} on the map`, 'No firing a firearm within 100 m (109 yd) of a dwelling, or a farm or ranch building with people or animals in it (also churches, schools, playgrounds and regional district parks). Move at least 100 m away to be sure.', `${syn(10, 95)}<br>Map: OpenStreetMap buildings (not every building is mapped)`);
    else add('ok', 'No building within 100 m (109 yd) on the map', 'OpenStreetMap does not map every cabin or barn. Look around before you shoot.', `${syn(10, 95)}<br>Map: OpenStreetMap buildings`);
    if (rd <= 15) add('check', `Road ${Math.round(rd)} m away on the map`, 'No firing across, or within, the road allowance of a numbered highway or 2 lane public road: 15 m (16 yd) each side of the middle of the road. Never shoot across any road.', `${syn(10, 99)}<br>Map: OpenStreetMap roads`);
    else add('ok', 'No public road within 15 m (16 yd) on the map', 'Never shoot toward or across any road, including forest roads.', `${syn(10, 99)}<br>Map: OpenStreetMap roads`);
  } else add('check', 'Buildings and roads: not checked', navigator.onLine === false ? 'You are offline and the map detail for this spot is not saved. Save this area in Offline Maps to check offline.' : 'The map detail for this spot could not be read. Try again with signal.');

  // closures in this MU that are not drawn, and the region's own notes
  const RG = region ? region.toUpperCase() : '';
  const inRegion = (x) => RG && String(x.region).startsWith(RG);
  const um = ((unm && unm.items) || []).filter((x) => (muId && (x.mus || []).includes(muId)) || (!(x.mus || []).length && inRegion(x)));
  remind.unshift(...um.map((x) => ({ t: `${[x.map && `Map ${x.map}`, x.name].filter(Boolean).join(' ')}: ${x.text} Not drawn on this map: ${x.page ? `check the synopsis map, page ${x.page}` : 'read the regulation'}.`, page: x.page, cert: x.cert, src: x.page ? '' : x.src })));
  if (RG && unm && !(unm.items || []).some(inRegion)) remind.unshift({ t: `The app has no list of No Shooting Areas for Region ${RG} yet. Check that region's synopsis map pages.`, page: 10, cert: 99 });
  if (RG === '2') remind.push({ t: 'Fraser Valley Regional District: no shooting zones for target practice within 400 m (437 yd) of select roads on Crown land outside towns (2017). Check the current maps.', html: `<a href="${FVRD_URL}" target="_blank" rel="noopener">BC Gov News, 5 April 2017</a>. ${cert(85)}` });
  remind.push(
    { t: 'Town and regional district bylaws: ask the municipal clerk or regional district.', page: 9, cert: 99 },
    { t: 'Posted signs on the ground: a sign beats the map.', tip: true },
    { t: 'Fire bans: when a campfire ban is on, binary exploding targets are often banned too. Check the bans for your fire centre today. Tracer ammunition: VERIFY.', html: `<a href="${BCWS_URL}" target="_blank" rel="noopener">BC Wildfire Service: fire bans and restrictions</a>. ${cert(95)}` },
    { t: 'Safe backstop: a solid earth bank behind the target, nothing past it, no rocks or water to skip off. See the checklist below.', tip: true },
    { t: 'Not from a vehicle or motorboat, and never careless: Wildlife Act section 27 and Criminal Code section 86.', html: cert(99) },
  );
  const light = items.some((i) => i.st === 'no') ? 'no' : items.some((i) => i.st === 'check') ? 'check' : 'yes';
  return { p, method: meth.k, light, items, remind, muId, range: range ? range.f.properties.name : null, osm: !!(osm && osm.got), when: new Date() };
}

// ---------- geometry (as in hunt-canhunt.js) ----------
function bboxAround(p, m) {
  const dy = m / 110574, dx = m / (111320 * Math.cos((p[1] * Math.PI) / 180));
  return [p[0] - dx, p[1] - dy, p[0] + dx, p[1] + dy];
}
function featDist(f, p) {
  let d = Infinity;
  const k = Math.cos((p[1] * Math.PI) / 180), X = (q) => { const ll = toLngLat(q[0], q[1]); return [(ll[0] - p[0]) * 111320 * k, (ll[1] - p[1]) * 110574]; };
  let inside = false;
  for (const part of f.parts) {
    const pts = part.map(X);
    if (pts.length === 1) { d = Math.min(d, Math.hypot(pts[0][0], pts[0][1])); continue; }
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
      let t = l2 ? -(ax * vx + ay * vy) / l2 : 0; t = Math.max(0, Math.min(1, t));
      d = Math.min(d, Math.hypot(ax + t * vx, ay + t * vy));
      if (f.type === 3 && (ay > 0) !== (by > 0) && 0 < ((bx - ax) * (0 - ay)) / (by - ay) + ax) inside = !inside;
    }
  }
  return inside ? 0 : d;
}

// ---------- render ----------
const WORD = { yes: 'YES', no: 'NO', check: 'CHECK' };
const SAY = {
  yes: 'From the app\'s data: no problem found. That is not a guarantee. Read the list and check yourself.',
  no: 'From the app\'s data: at least one line below says no.',
  check: 'From the app\'s data: the app cannot be sure. Read why below.',
};
const ST = { ok: ['OK', 'ok'], no: ['NO', 'no'], check: ['CHECK', 'check'], info: ['Note', 'info'] };
function render(R) {
  const m = methodOf(R.method);
  return `<div class="hh-light ${R.light}" role="status" aria-live="polite"><b>${WORD[R.light]}</b><span>Target practice, ${esc(m.l.toLowerCase())}<br>${SAY[R.light]}</span></div>
    <p class="hmm-muted">At ${esc(H.units.coord(R.p[0], R.p[1]))}. Practice only: hunting seasons are not checked here (use Can I hunt here now?).</p>
    <ul class="hh-checks">${R.items.map((i) => `<li class="${ST[i.st][1]}"><em>${ST[i.st][0]}</em><div><b>${i.h}</b>${i.t ? `<p>${i.t}</p>` : ''}${i.src ? `<small>${i.src}</small>` : ''}</div></li>`).join('')}</ul>
    <h3 class="hmm-h">Still check yourself</h3>
    <ul class="hh-remind">${R.remind.map((x) => `<li>${esc(x.t).replace(/VERIFY/g, '<span class="hp-verify">VERIFY</span>')} <small>${x.tip ? ui.TIP : x.html ? x.html : `${x.src ? esc(x.src) : `${esc(SYN)}, page ${x.page}`}. ${cert(x.cert)}`}</small></li>`).join('')}</ul>`;
}

function setMarker(p) {
  if (mk) { mk.remove(); mk = null; }
  if (!p) return;
  const el = document.createElement('div'); el.className = 'hmm-tap';
  mk = new H.maplibregl.Marker({ element: el }).setLngLat(p).addTo(map);
}
