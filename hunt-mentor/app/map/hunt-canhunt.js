/* Hunt Map tool: "Can I hunt here now?" One big light (YES, NO or CHECK) for a tapped point, the chosen species and right now.
   Everything is worked out on the phone from cached files, so it works offline once the area was opened or saved:
     MU (Management Unit): point in polygon on the MU layer (layers.muAt)
     Open today: data/seasons/region*.json (synopsis rows) and data/seasons/migratory.json (federal ducks and geese), like Home "Open today"
     Legal light now: app sun times (window.HuntMentor.sunEvent) and the hours in data/regs.json (window.HM.regs.hours)
     Land: private land, reserves, parks, city limits, WMAs, motor vehicle closures (manifest layers, tools-insights.js nearLayer)
     Buildings and roads near the point: OpenStreetMap map detail tiles (hunt-osm.js)
   Rule: any NO gives NO; else anything unknown or needing a check gives CHECK; YES only when every check the app can do passes.
   No Shooting Areas are not mapped in the app, so they are always listed under "Still check yourself". */
import { esc, haversine } from './util.js';
import * as layers from './layers.js';
import { nearLayer } from './tools-insights.js';
import { osmArea, isRoad, toLngLat } from './hunt-osm.js';
import { intro, here, peek, BANNER } from './hunt-ui.js';

let H, map, active = false, tok = 0, mk = null, lastP = null;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TITLE = 'Can I hunt here now?';
// season: names in data/seasons rows; fed: federal migratory.json species (ducks and geese, like Home "Open today")
export const SPECIES = [
  { k: 'muledeer', l: 'Mule deer', s: ['mule deer'] },
  { k: 'whitetail', l: 'White tailed deer', s: ['white tailed deer'] },
  { k: 'moose', l: 'Moose', s: ['moose'] },
  { k: 'elk', l: 'Elk', s: ['elk'] },
  { k: 'blackbear', l: 'Black bear', s: ['black bear'] },
  { k: 'sheep', l: 'Mountain sheep', s: ['bighorn sheep', 'thinhorn sheep'] },
  { k: 'goat', l: 'Mountain goat', s: ['mountain goat'] },
  { k: 'cougar', l: 'Cougar', s: ['cougar'] },
  { k: 'wolf', l: 'Wolf', s: ['wolf'] },
  { k: 'coyote', l: 'Coyote', s: ['coyote'] },
  { k: 'grouse', l: 'Grouse (dusky, ruffed, spruce)', s: ['grouse'] },
  { k: 'sharptail', l: 'Sharp tailed grouse', s: ['sharp tailed grouse'] },
  { k: 'ptarmigan', l: 'Ptarmigan', s: ['ptarmigan'] },
  { k: 'quail', l: 'Quail', s: ['quail', 'california quail'] },
  { k: 'turkey', l: 'Wild turkey', s: ['turkey'] },
  { k: 'pheasant', l: 'Pheasant', s: ['pheasant'] },
  { k: 'chukar', l: 'Chukar', s: ['chukar'] },
  { k: 'hare', l: 'Snowshoe hare', s: ['snowshoe hare'] },
  { k: 'ducks', l: 'Ducks', fed: /^ducks$/, mig: true },
  { k: 'geese', l: 'Geese', fed: /geese/, mig: true },
];
const SYN = 'BC Hunting and Trapping Regulations Synopsis 2026 to 2028';
const SYN_URL = 'https://www2.gov.bc.ca/assets/gov/sports-recreation-arts-and-culture/outdoor-recreation/fishing-and-hunting/hunting/regulations/2026-2028/hunting-trapping-synopsis.pdf';
// Rules quoted in the app lessons (content/phase3/49-build-your-hunting-map.md, content/phase1/12-legal-to-shoot.md), synopsis read directly 2026-10-02.
const RULE = {
  private: { t: 'Private land: no hunting without the owner’s permission.', page: 9, cert: 99 },
  reserve: { t: 'Indian Reserves are private land. Permission must be obtained (from the Nation).', page: 9, cert: 99 },
  m100: { t: 'No hunting or shooting within 100 m (109 yd) of a dwelling, or a farm or ranch building occupied by people or animals.', page: 10, cert: 99 },
  road15: { t: 'Not within 15 m (16 yd) of the centre of a numbered highway or 2 lane public road, and no shooting across a road allowance.', page: 10, cert: 99 },
  noShoot: { t: 'No Shooting Areas and closed areas are drawn on the synopsis maps for each region. They are not on this map yet.', page: 10, cert: 99 },
};

export function init(api) {
  H = api; map = H.map;
  H.onClick((e) => {
    if (!active || !H.els || H.els.sheet.hidden || H.els.sheetT.textContent !== TITLE) return false;
    check([e.lngLat.lng, e.lngLat.lat]);
    return true;
  });
  H.canHunt = { open, check, evaluate };
}

const spOf = (k) => SPECIES.find((s) => s.k === k) || SPECIES[0];
const pref = () => spOf(H.prefs.chSp || 'muledeer');
const cert = (v) => (H.ui && H.ui.cert ? H.ui.cert(v) : `${v}%`);
const fmtMD = (md) => { const [m, d] = String(md).split('-').map(Number); return m && d ? `${d} ${MON[m - 1]}` : String(md); };
const jsonCache = new Map();
function getJSON(u) {
  if (!jsonCache.has(u)) { const p = fetch(u).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }); jsonCache.set(u, p); p.catch(() => jsonCache.delete(u)); }
  return jsonCache.get(u);
}
const safe = (p) => Promise.resolve(p).catch(() => null);
function todayPacific(now = new Date()) {
  const tz = (window.HuntMentor && window.HuntMentor.TZ) || 'America/Vancouver';
  const iso = now.toLocaleDateString('en-CA', { timeZone: tz });
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, iso, md: iso.slice(5), t: Date.UTC(y, m - 1, d) };
}
export function openOn(r, md) {
  if (r.allYear) return true;
  if (!r.open || !r.close) return false;
  return r.open <= r.close ? md >= r.open && md <= r.close : md >= r.open || md <= r.close;
}
function daysTo(mmdd, today) { // days from today to the next mmdd (0 = today)
  const [m, d] = mmdd.split('-').map(Number);
  let t = Date.UTC(today.y, m - 1, d); if (t < today.t) t = Date.UTC(today.y + 1, m - 1, d);
  return Math.round((t - today.t) / 864e5);
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const RESTRICT = /youth only|bow only|private land only|archery only|LEH/i;

// ---------- sheet ----------
export function open(p) {
  const sp = pref();
  active = true;
  const body = H.openSheet({ title: TITLE, modal: false, bar: 'tools',
    onClose: peek(() => { active = false; setMarker(null); }),
    html: `${intro('a quick YES, NO or CHECK for one spot, one animal, right now.',
      ['Pick the animal.', 'Tap any point on the map (the sheet stays open), or use the buttons below.', 'It checks the MU (Management Unit), the season today, legal light, and land layers (private land, parks, reserves, city limits, closures).', 'Read every line, not just the light. CHECK means the app cannot be sure: the reason is shown.'])}
    <label class="hmm-field">Animal<select data-ch="sp" class="hh-select">${SPECIES.map((s) => `<option value="${s.k}" ${s.k === sp.k ? 'selected' : ''}>${esc(s.l)}</option>`).join('')}</select></label>
    <div data-out="ch">${lastP ? '' : '<p class="hh-tapnow">Tap any point on the map.</p>'}</div>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-ch="centre">Check the map centre</button><button class="hmm-btn2" data-ch="gps">Check my location</button></div>
    ${BANNER}` });
  const sel = body.querySelector('[data-ch="sp"]');
  sel.onchange = () => { H.prefs.chSp = sel.value; H.savePrefs(); if (lastP) check(lastP); };
  body.querySelector('[data-ch="centre"]').onclick = () => check(here('centre'));
  body.querySelector('[data-ch="gps"]').onclick = () => { const q = here('gps'); if (q) check(q); };
  if (p) check(p); else if (lastP && haversine(lastP, [map.getCenter().lng, map.getCenter().lat]) < 20000) check(lastP);
  return body;
}

export async function check(p) {
  if (!p) return null;
  lastP = p;
  const my = ++tok, body = H.els.sheetB;
  if (H.els.sheet.hidden || H.els.sheetT.textContent !== TITLE) { open(p); return null; }
  setMarker(p);
  const out = body.querySelector('[data-out="ch"]');
  if (out) { out.innerHTML = `<p class="hh-tapnow">Checking ${esc(H.units.coord(p[0], p[1]))}</p>`; toTop(body, out); }
  const R = await evaluate(p, pref());
  if (my !== tok || H.els.sheetB !== body || H.els.sheet.hidden) return R;
  const o = body.querySelector('[data-out="ch"]');
  if (o) { o.innerHTML = render(R); toTop(body, o); } // the light at the top of the sheet
  return R;
}

const toTop = (body, el) => { body.scrollTop = Math.max(0, body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - 6); };

// ---------- the checks ----------
/** Every check for point p and species sp, now. Returns { light: 'yes' | 'no' | 'check', items: [{ st: ok | no | check | info, h, t, src }], ... }. */
export async function evaluate(p, sp, now = new Date()) {
  const items = [], today = todayPacific(now);
  const add = (st, h, t, src) => items.push({ st, h, t, src: src || '' });
  const synSrc = (page, c) => `${SYN}, page ${page}. ${cert(c)} <a href="${SYN_URL}" target="_blank" rel="noopener">Synopsis PDF</a>`;
  const [mu, priv, res, park, city, wma, clos, osm] = await Promise.all([
    safe(layers.muAt(p)), safe(nearLayer('private_land', p, 0)), safe(nearLayer('reserves', p, 0)), safe(nearLayer('parks', p, 0)),
    safe(nearLayer('city_limits', p, 0)), safe(nearLayer('wma', p, 0)), safe(nearLayer('closures', p, 0)),
    safe(osmArea(map, bboxAround(p, 160), ['building', 'transportation'])),
  ]);
  // 1. MU
  const muId = mu && mu.state === 'ok' && mu.id ? mu.id : null;
  if (muId) add('ok', `MU (Management Unit) ${esc(muId)}`, `${esc(mu.region || '')}`, `${esc(mu.source || '')} ${cert(95)}`);
  else if (mu && mu.state === 'outside') add('check', 'MU (Management Unit) not found', 'This point is not inside a BC MU in the map data (out of BC, or in water at the edge). The app cannot check seasons here.');
  else add('check', 'MU (Management Unit) unknown', 'The MU layer could not be read here. Open the map once with signal, or save this area in Offline Maps.');

  // 2. season today
  const region = muId ? muId.split('-')[0] : null;
  if (muId) {
    if (sp.mig) await fedSeason(sp, muId, today, add);
    else {
      const files = region === '7' ? ['region7a', 'region7b'] : [`region${region}`];
      const regs = (await Promise.all(files.map((f) => safe(getJSON(`data/seasons/${f}.json`))))).filter(Boolean);
      if (!regs.length) add('check', `Season for ${esc(sp.l.toLowerCase())}: unknown`, 'The season table for this region is not saved on this phone yet. Open the app once with signal.');
      else seasonItems(sp, muId, regs, today, add, synSrc);
    }
  } else add('check', `Season for ${esc(sp.l.toLowerCase())}: unknown`, 'No MU (Management Unit), so the app cannot look up the season.');

  // 3. legal light now
  lightItem(p, sp, now, add);

  // 4. land status layers
  const lay = (x) => (x && x.layer ? `${esc(x.layer.source || '')}, data ${esc(x.layer.dataDate || '')}. Layer ${cert(x.layer.cert)}` : '');
  const inside = (x) => x && x.hits && x.hits.find((h) => h.dist === 0);
  const read = (x) => x && x.state === 'ok';
  const pv = inside(priv), rv = inside(res), pk = inside(park), ct = inside(city), wm = inside(wma), cl = clos && clos.hits ? clos.hits.filter((h) => h.dist === 0) : [];
  if (pv) add('no', 'Private land', `${RULE.private.t} If you have permission, the other lines still apply.`, `${synSrc(RULE.private.page, RULE.private.cert)}<br>Map: ${lay(priv)}`);
  if (rv) add('no', `First Nations reserve${rv.props.name ? `: ${esc(rv.props.name)}` : ''}`, RULE.reserve.t, `${synSrc(RULE.reserve.page, RULE.reserve.cert)}<br>Map: ${lay(res)}`);
  if (pk) add('check', `${esc(pk.props.designation || 'Park or protected area')}${pk.props.name ? `: ${esc(pk.props.name)}` : ''}`, 'Hunting rules differ by park. Some allow hunting, some do not. Check BC Parks and the synopsis before you hunt here.', `Synopsis page 9 (parks and ecological reserves). Map: ${lay(park)}`);
  if (ct) add('check', `Inside ${esc(ct.props.name || ct.props.abbr || 'city or town limits')}`, 'Most cities and towns ban shooting inside their limits by bylaw. Check the local bylaw.', `Map: ${lay(city)}`);
  if (wm) add('check', `Wildlife Management Area (WMA)${wm.props.name ? `: ${esc(wm.props.name)}` : ''}`, 'Hunting is often allowed, but some WMAs have their own rules. “Before hunting in a Conservation Land, please contact your regional office.”', `${synSrc(9, 99)}<br>Map: ${lay(wma)}`);
  for (const h of cl) add('check', `Motor vehicle closure${h.props.name ? `: ${esc(h.props.name)}` : ''}`, `Limits driving, not always hunting. ${esc(h.props.dates || '')}${h.props.map ? ` Synopsis map ${esc(h.props.map)}.` : ''} Read the closure before you drive in.`, `Map: ${lay(clos)}`);
  const covers = (id) => { const st = layers.stateOf(id); return !!(st && st.files.some((f) => !f.box || (p[0] >= f.box[0] && p[0] <= f.box[2] && p[1] >= f.box[1] && p[1] <= f.box[3]))); };
  const LAND = [['private land', 'private_land', priv], ['reserves', 'reserves', res], ['parks', 'parks', park], ['city limits', 'city_limits', city]];
  const noData = LAND.filter(([, id, x]) => !read(x) && !covers(id)).map(([n]) => n);
  const unread = LAND.filter(([, id, x]) => !read(x) && covers(id)).map(([n]) => n);
  if (noData.length) add('check', 'No land data for this area in the app', `Not checked here: ${noData.join(', ')}. The app has this layer only for the hunting areas it covers. Check a land status map or ask the land owner.`);
  if (unread.length) add('check', 'Some land layers are not on this phone here', `Not checked: ${unread.join(', ')}. Open the map with signal, or save this area in Offline Maps.`);
  if (!noData.length && !unread.length && !pv && !rv && !pk && !ct && !wm && !cl.length) add('ok', 'Land status layers', 'No private land, reserve, park, city limits, WMA or motor vehicle closure at this point in the loaded layers. Signs on the ground still rule.');

  // 5. buildings and roads near the point (OpenStreetMap: not every building is mapped)
  const remind = [];
  if (osm && osm.got) {
    let bd = Infinity, rd = Infinity;
    for (const f of osm.feats) {
      if (f.layer === 'building') bd = Math.min(bd, featDist(f, p));
      else if (isRoad(f) && f.layer === 'transportation' && ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'].includes(f.props.class)) rd = Math.min(rd, featDist(f, p));
    }
    if (bd <= 100) add('check', `Building ${bd < 5 ? 'right here' : `${Math.round(bd)} m away`} on the map`, `${RULE.m100.t} Is it a dwelling or an occupied farm building? Move at least 100 m away to be sure.`, `${synSrc(RULE.m100.page, RULE.m100.cert)}<br>Map: OpenStreetMap buildings (not every building is mapped)`);
    else remind.push(RULE.m100);
    if (rd <= 15) add('check', `Road ${Math.round(rd)} m away on the map`, RULE.road15.t, `${synSrc(RULE.road15.page, RULE.road15.cert)}<br>Map: OpenStreetMap roads`);
    else remind.push(RULE.road15);
  } else remind.push(RULE.m100, RULE.road15);
  remind.unshift(RULE.noShoot);

  const light = items.some((i) => i.st === 'no') ? 'no' : items.some((i) => i.st === 'check') ? 'check' : 'yes';
  return { p, sp, light, items, remind, muId, osm: !!(osm && osm.got), when: now };
}

function seasonItems(sp, muId, regs, today, add, synSrc) {
  const closed = regs.flatMap((R) => R.closedMus || []).find((c) => c.mu === muId);
  if (closed) { add('no', `MU ${esc(muId)} is closed`, esc(closed.notes), synSrc(closed.page, closed.cert)); return; }
  const R0 = regs[0];
  const rows = regs.flatMap((R) => (R.rows || []).filter((r) => (r.mus || []).includes(muId) && sp.s.includes(r.species)));
  const leh = regs.flatMap((R) => (R.leh || []).filter((x) => sp.s.includes(x.species)));
  const lehNote = leh.length ? ` LEH (Limited Entry Hunting) draw only: ${leh.map((x) => esc(x.class || '')).join(', ')} (page ${esc(leh[0].page)}).` : '';
  const name = sp.l.toLowerCase();
  if (!rows.length) {
    const nr = regs.map((R) => R.noRow).find((x) => x && (x.species || []).some((s) => sp.s.includes(s)));
    add('no', `No general open season for ${esc(name)} in MU ${esc(muId)}`, `${nr ? esc(nr.notes) : 'No row for this animal and MU in the season table.'}${lehNote}`, nr ? synSrc(nr.page, nr.cert) : `${esc(R0.source || SYN)}, checked ${esc(R0.checked || '')}.`);
    return;
  }
  const open = rows.filter((r) => openOn(r, today.md));
  const line = (r) => {
    const left = r.allYear ? 'open all year' : `${fmtMD(r.open)} to ${fmtMD(r.close)}, ${daysTo(r.close, today) === 0 ? 'closes today' : `closes in ${plural(daysTo(r.close, today), 'day')}`}`;
    return `<li><b>${esc(r.class || 'Any')}</b>: ${left}${r.notes ? `<br><small>${esc(r.notes)}</small>` : ''}<br><small>${esc(SYN)}, page ${esc(r.page)}. ${cert(r.cert)}</small></li>`;
  };
  if (open.length) {
    const free = open.filter((r) => !RESTRICT.test(`${r.notes || ''} ${r.class || ''}`));
    if (free.length) add('ok', `Open today for ${esc(name)} in MU ${esc(muId)}`, `<ul class="hh-rows">${open.map(line).join('')}</ul>Only the classes listed are open (for example “4 point bucks”).${lehNote}`, `${esc(R0.source || SYN)}, checked ${esc(R0.checked || '')}. General open seasons only.`);
    else add('check', `Open today for ${esc(name)}, with a condition`, `<ul class="hh-rows">${open.map(line).join('')}</ul>Every open row has a condition (for example bow only or youth only). Check that it fits you.${lehNote}`, `${esc(R0.source || SYN)}, checked ${esc(R0.checked || '')}.`);
    return;
  }
  // closed today: next opening
  let next = null;
  for (const r of rows) { if (!r.open) continue; const n = daysTo(r.open, today); if (!next || n < next.n) next = { n, r }; }
  add('no', `Closed today for ${esc(name)} in MU ${esc(muId)}`, `${next ? `Next general open season: ${esc(next.r.class || '')} from ${fmtMD(next.r.open)} (in ${plural(next.n, 'day')}).` : 'No general open season row opens later.'}${lehNote}`, `${esc(R0.source || SYN)}, page ${esc((next && next.r.page) || rows[0].page)}. ${cert((next && next.r.cert) || rows[0].cert)}`);
}

async function fedSeason(sp, muId, today, add) {
  const M = await safe(getJSON('data/seasons/migratory.json'));
  if (!M) { add('check', `Season for ${esc(sp.l.toLowerCase())}: unknown`, 'The federal migratory bird table is not saved on this phone yet. Open the app once with signal.'); return; }
  const src = `${esc(M.source || 'Migratory Birds Regulations, 2022')}, checked ${esc(M.checked || '')}. <a href="${esc(M.url || '')}" target="_blank" rel="noopener">Regulations</a>`;
  const dk = Object.keys(M.districts || {}).find((k) => (M.districts[k].mus || []).includes(muId));
  if (!dk) {
    if (M.noDistrict && (M.noDistrict.mus || []).includes(muId)) add('check', 'No federal district for this MU', `${esc(M.noDistrict.notes)} ${cert(M.noDistrict.cert)}`, src);
    else add('check', 'Federal district unknown', 'This MU is not in the federal district list in the app. VERIFY with the Canadian Wildlife Service.', src);
    return;
  }
  const rows = (M.rows || []).filter((r) => r.district === dk && (!r.mus || r.mus.includes(muId)) && sp.fed.test(r.species));
  const open = rows.filter((r) => openOn(r, today.md));
  const dn = `federal district ${esc(dk)} ${esc((M.districts[dk] || {}).name || '')}`;
  const line = (r) => `<li><b>${esc(r.species)}</b>: ${fmtMD(r.open)} to ${fmtMD(r.close)}${r.daily != null ? `, ${r.daily} a day, ${r.possession} in possession` : ''}${r.notes ? `<br><small>${esc(r.notes)}</small>` : ''}<br><small>${esc(r.item || '')} ${cert(r.cert)}</small></li>`;
  if (open.length) add('ok', `Open today for ${esc(sp.l.toLowerCase())}, ${dn}`, `<ul class="hh-rows">${open.map(line).join('')}</ul>You also need the federal MGBHP (Migratory Game Bird Hunting Permit) on top of your BC licence (synopsis page 3, ${cert(99)}). BC closed areas and No Shooting Areas still apply.`, src);
  else if (rows.length) {
    let next = null; for (const r of rows) { const n = daysTo(r.open, today); if (!next || n < next.n) next = { n, r }; }
    add('no', `Closed today for ${esc(sp.l.toLowerCase())}, ${dn}`, next ? `Next: ${esc(next.r.species)} from ${fmtMD(next.r.open)} (in ${plural(next.n, 'day')}).` : '', src);
  } else add('no', `No federal season for ${esc(sp.l.toLowerCase())} in ${dn}`, '', src);
}

function lightItem(p, sp, now, add) {
  const S = window.HuntMentor || {}, hours = window.HM && window.HM.regs && window.HM.regs.hours;
  const h = hours && (sp.mig ? hours.migratory : hours.bigGame);
  if (!S.sunEvent || !h || h.beforeSunriseMin == null) { add('check', 'Legal light: unknown', 'The app hours data is not loaded. Open the app once with signal.'); return; }
  const t = todayPacific(now), day = new Date(t.y, t.m - 1, t.d, 12);
  const rise = S.sunEvent(day, p[1], p[0], true), set = S.sunEvent(day, p[1], p[0], false);
  if (!rise || !set) { add('check', 'Legal light: unknown', 'The sun does not rise or set here today.'); return; }
  const a = new Date(+rise - h.beforeSunriseMin * 6e4), b = new Date(+set + h.afterSunsetMin * 6e4), hh = S.hhmm;
  const span = `Today here: ${hh(a)} to ${hh(b)} (sunrise ${hh(rise)}, sunset ${hh(set)}).`;
  const src = `${esc(h.text || '')} ${cert(h.certainty)}`;
  if (now >= a && now <= b) add('ok', `Legal light now (${sp.mig ? 'ducks and geese' : 'game other than migratory birds'})`, `${span} Hours left: ${fmtLeft(b - now)}.`, src);
  else add('no', 'Outside legal hunting hours now', `${span} ${now < a ? `Starts in ${fmtLeft(a - now)}.` : 'Ended for today.'}`, src);
}
const fmtLeft = (ms) => { const m = Math.max(0, Math.round(ms / 6e4)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };

// ---------- geometry ----------
function bboxAround(p, m) {
  const dy = m / 110574, dx = m / (111320 * Math.cos((p[1] * Math.PI) / 180));
  return [p[0] - dx, p[1] - dy, p[0] + dx, p[1] + dy];
}
function featDist(f, p) { // metres from p to a feature in world units (zoom 14): parts are lines, rings or points
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
  yes: 'Every check the app can do passes. Still read the list below.',
  no: 'At least one line below says no.',
  check: 'The app cannot be sure. Read why below.',
};
const ST = { ok: ['OK', 'ok'], no: ['NO', 'no'], check: ['CHECK', 'check'], info: ['Note', 'info'] };
function render(R) {
  const t = R.when.toLocaleString('en-CA', { timeZone: (window.HuntMentor && window.HuntMentor.TZ) || 'America/Vancouver', hour: 'numeric', minute: '2-digit', weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="hh-light ${R.light}" role="status" aria-live="polite"><b>${WORD[R.light]}</b><span>${esc(R.sp.l)}, ${esc(t)}<br>${SAY[R.light]}</span></div>
    <p class="hmm-muted">At ${esc(H.units.coord(R.p[0], R.p[1]))}</p>
    <ul class="hh-checks">${R.items.map((i) => `<li class="${ST[i.st][1]}"><em>${ST[i.st][0]}</em><div><b>${i.h}</b>${i.t ? `<p>${i.t}</p>` : ''}${i.src ? `<small>${i.src}</small>` : ''}</div></li>`).join('')}</ul>
    <h3 class="hmm-h">Still check yourself</h3>
    <ul class="hh-remind">${R.remind.map((x) => `<li>${esc(x.t)} <small>${esc(SYN)}, page ${x.page}. ${cert(x.cert)}</small></li>`).join('')}
      <li>Carry your hunting licence and the species licence for this animal. <small>${esc(SYN)}, pages 5 and 8. ${cert(99)}</small></li></ul>`;
}

function setMarker(p) {
  if (mk) { mk.remove(); mk = null; }
  if (!p) return;
  const el = document.createElement('div'); el.className = 'hmm-tap';
  mk = new H.maplibregl.Marker({ element: el }).setLngLat(p).addTo(map);
}
