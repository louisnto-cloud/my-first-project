/* Hunt Map tap card (MAP-FRIENDLY-PROMPT.md Part 3): one calm card for a tap or a long press anywhere on the map.
     Here: coordinates (copy), elevation, MU (Management Unit), land status line and legal light now.
       All worked out on the phone from files the map already has (works offline where the area was opened or saved):
       MU: layers.muAt. Land: tools-insights.js nearLayer on the land layers. Legal light: hunt-field.js legalLight (sun times from
       app.js and the hours in data/regs.json). Anything the app cannot read here says CHECK, never a sure yes.
     What is on the map here: each drawn layer area under the finger in plain words, its colour swatch, and More (the detailed layer sheet).
     Do: Can I hunt here now? (the one blaze orange action), Save point, Directions (Apple Maps, Google Maps), Log sighting,
       Glassing near here, Mark my truck here, What can I see from here (when the terrain tool is in), More tools here (the old long press menu).
   Spots, camps, waypoints and sightings keep their own cards: those taps are handled before this card (layers.js handleClick,
   tools-main.js onMapClick, hunt-sightings.js onTap). Hooks: layers.js handleClick calls open(); tools-main.js long press calls H.tapCard.open().
   Close: swipe down (header or the card body at the top), the X, or Back (tools-main.js backGuard).
   API: HuntMap.tapCard = { open(H, lngLat, { items, press }), close(), isOpen() } */
import { esc } from './util.js';
import * as layers from './layers.js';

export const TITLE = 'Here on the map';
const BANNER = '<div class="hmm-banner">Study aid only. The official regulations are the law.</div>';
const SYN = 'BC Hunting and Trapping Regulations Synopsis 2026 to 2028';
const SYN_URL = 'https://www2.gov.bc.ca/assets/gov/sports-recreation-arts-and-culture/outdoor-recreation/fishing-and-hunting/hunting/regulations/2026-2028/hunting-trapping-synopsis.pdf';
const WORD = { ok: 'OK', likely: 'LIKELY', no: 'NO', check: 'CHECK', info: 'NOTE' };

let tok = 0, mk = null, cur = null, swipeOn = false, insightsP = null;

/** Called once by layers.js init: puts the API on HuntMap so tools-main.js (long press) can reach it. */
export function init(H) {
  H.tapCard = { open, close, isOpen: () => isMine(H) };
  css();
}

const isMine = (H) => !!(H.els && H.els.sheet && !H.els.sheet.hidden && H.els.sheetT.textContent === TITLE);
export function close() { const H = window.HuntMap; if (H && isMine(H)) H.closeSheet(); }

/** Open the card at lngLat. items: [{ st, f }] layer features under the finger (layers.itemsAt); a long press reads them here. Returns true. */
export function open(H, ll, opts = {}) {
  H = window.HuntMap || H;
  const map = H.map, p = [+(+ll.lng).toFixed(6), +(+ll.lat).toFixed(6)];
  let items = opts.items;
  if (!items) { try { items = layers.itemsAt(map.project([p[0], p[1]])); } catch (err) { items = []; } }
  // a plain tap on empty map while another card or tool is open just closes it (one calm step at a time)
  if (!opts.press && !opts.reopen && !items.length && H.els && !H.els.sheet.hidden && !isMine(H)) { H.closeSheet(); return true; }
  const my = ++tok;
  cur = { p, items, ll: { lng: p[0], lat: p[1] } };
  setMarker(H, p);
  const body = H.openSheet({ title: TITLE, modal: false, onClose: () => { if (my === tok) { setMarker(H, null); cur = null; } }, html: html(H, p, items) });
  wire(H, body, p, items);
  swipe(H);
  fill(H, body, p, my);
  return true;
}

// ---------- the card ----------
function html(H, p, items) {
  const coord = H.units.coord(p[0], p[1]);
  const off = !navigator.onLine;
  const hasView = !!(H.terrain && typeof H.terrain.viewshed === 'function');
  const btn = (k, label, sub, icon) => `<button class="tc-btn" data-tc="${k}">${icon || ''}<span>${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
  const lat = p[1].toFixed(6), lng = p[0].toFixed(6);
  return `<div class="tc">
    <h3 class="tc-h">Here</h3>
    <div class="tc-coord"><span class="tc-c" data-tc-out="coord">${esc(coord)}</span><button class="tc-copy" data-tc="copy" aria-label="Copy the coordinates ${esc(coord)}">${IC.copy}<span>Copy</span></button></div>
    <dl class="tc-kv">
      <div><dt>Elevation</dt><dd data-tc-out="elev">Checking</dd></div>
      <div><dt>MU (Management Unit)</dt><dd data-tc-out="mu">Checking</dd></div>
    </dl>
    <ul class="tc-lines">
      <li class="check" data-tc-out="land"><em>CHECK</em><div><b>Land status</b><p>Checking the land layers on this phone</p></div></li>
      <li class="check" data-tc-out="light"><em>CHECK</em><div><b>Legal light now</b><p>Checking</p></div></li>
    </ul>
    <p class="tc-note">A quick look, not a yes. Tap Can I hunt here now? for every check: season, buildings, roads and more.</p>

    <h3 class="tc-h">What is on the map here</h3>
    ${items.length ? `<ul class="tc-list">${items.map((r, i) => itemHtml(r, i)).join('')}</ul>`
    : `<p class="tc-empty">No hunting layer is drawn under your finger. Turn layers on to see land status here.</p>
       ${H.presets ? '<button class="tc-btn tc-wide" data-tc="huntday"><span>Show the Hunt day layers<small>No shooting areas, Crown land, MU lines</small></span></button>' : ''}`}

    <h3 class="tc-h">Do</h3>
    <button class="tc-main" data-tc="canhunt">${IC.canhunt}<span>Can I hunt here now?</span></button>
    <div class="tc-grid">
      ${btn('save', 'Save point', 'A waypoint here', IC.pin)}
      ${btn('sight', 'Log sighting', 'Saw an animal here', IC.eye)}
      <a class="tc-btn" data-tc="apple" href="https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d" target="_blank" rel="noopener">${IC.car}<span>Directions<small>Apple Maps${off ? ', needs signal' : ''}</small></span></a>
      <a class="tc-btn" data-tc="google" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener">${IC.car}<span>Directions<small>Google Maps${off ? ', needs signal' : ''}</small></span></a>
      ${btn('glass', 'Glassing near here', 'High points that see far', IC.glass)}
      ${btn('truck', 'Mark my truck here', 'An arrow back to it', IC.truck)}
      ${hasView ? btn('view', 'What can I see from here', 'Line of sight', IC.view) : ''}
      ${btn('more', 'More tools here', 'Range rings, measure, wind', IC.more)}
    </div>
    ${BANNER}
  </div>`;
}

function itemHtml(r, i) {
  const { t, s } = plain(r.st, (r.f && r.f.properties) || {});
  let sw = '';
  try { sw = layers.swatchHtml(r.st); } catch (err) { sw = '<span class="hmm-sw"></span>'; }
  return `<li class="tc-item">${sw}<div><b>${esc(t)}</b>${s ? `<small>${esc(s)}</small>` : ''}</div><button class="tc-more" data-tc-more="${i}" aria-label="More about ${esc(t)}">More</button></li>`;
}

/** The layer feature in plain words: { t: main line, s: second line }. Never states a rule as a sure thing. */
function plain(st, p) {
  const l = st.l, id = l.id, name = val(p[l.labelField]) || val(p.name) || val(p.NAME) || '';
  const named = (a) => (name ? `${a}: ${name}` : a);
  switch (id) {
    case 'crown_land': return p.cls === 'crown' ? { t: 'Crown land (public land)', s: 'Usually open to hunt in season. Closures, parks and signs still apply.' }
      : p.cls === 'federal' ? { t: 'Federal land', s: 'Has its own rules. CHECK before you hunt.' }
      : { t: 'Likely Crown land', s: 'No titled parcel here in the official data. Watch for fences and signs.' };
    case 'hunt_likely': return p.cls === 'open' ? { t: 'Likely open to hunt', s: 'A first look, worked out by the app. Check the season, MU and signs.' } : { t: 'Check first', s: 'A tenure, federal land or a park where rules differ.' };
    case 'private_land': return { t: 'Private land', s: 'You need the owner’s permission to hunt or cross.' };
    case 'reserves': return { t: named('First Nations reserve'), s: 'Treated like private land: ask the Nation first.' };
    case 'parks': return { t: named(val(p.designation) || 'Park or protected area'), s: 'Hunting rules differ by park. CHECK before you hunt.' };
    case 'city_limits': return { t: named('Town limits'), s: 'Most towns ban shooting by bylaw.' };
    case 'wma': return { t: named('WMA (Wildlife Management Area)'), s: 'Some have their own rules. Call the regional office.' };
    case 'no_hunting': return { t: name ? `No shooting area: ${name}` : 'No shooting or no hunting area', s: val(p.ban) || 'Read the rule before you shoot.' };
    case 'crown_tenures': return { t: 'Crown land tenure', s: [val(p.type) || val(p.TENURE_TYPE), val(p.purpose) || val(p.TENURE_PURPOSE)].filter(Boolean).join(', ') || 'A lease, licence or permit on Crown land. CHECK.' };
    case 'range_tenures': return { t: 'Grazing or hay cutting tenure', s: 'Cattle may be out. Ask before you hunt near livestock.' };
    case 'mu': { const m = muText(p); return { t: m ? `MU (Management Unit) ${m}` : 'MU (Management Unit) line', s: val(p.regionName) ? `Region ${val(p.region) ? `${val(p.region)} ` : ''}${val(p.regionName)}` : 'Seasons and limits are set by MU.' }; }
    case 'mu_labels': { const m = muText(p); return { t: m ? `MU (Management Unit) number ${m}` : 'MU (Management Unit) number', s: '' }; }
    case 'leh': return { t: named('LEH (Limited Entry Hunting) zone'), s: 'Some seasons here need a draw permit.' };
    case 'closures': return { t: named('Motor vehicle closure'), s: val(p.dates) || 'Limits driving here, often part of the year.' };
    case 'closure_routes': return { t: named('Road inside a closure'), s: val(p.status) || 'Tap More for its status and dates.' };
    case 'forest_roads': return { t: named('Forest road'), s: 'Can be gated, washed out or deactivated.' };
    case 'rec_sites': return { t: named('Recreation site'), s: 'No shooting near its campsites and buildings.' };
    case 'rec_trails': return { t: named('Recreation trail'), s: '' };
    case 'ranges': return { t: named('Shooting range'), s: 'A legal place to sight in. Fees may apply.' };
    default: break;
  }
  if (/^uwr_/.test(id)) return { t: l.label || 'Winter range', s: 'Where animals spend winter (official ungulate winter range).' };
  if (/^season_/.test(id)) return { t: l.label || 'Seasonal range', s: 'Where the animal tends to be this month. A general pattern.' };
  return { t: name ? `${l.label || id}: ${name}` : (l.label || id), s: '' };
}
const val = (v) => { if (v == null || v === '') return ''; try { return String(layers.fmtValue(v)).trim(); } catch (err) { return String(v).trim(); } };
function muText(p) {
  for (const k of ['MU', 'mu', 'WILDLIFE_MGMT_UNIT_ID', 'MU_ID', 'mu_id', 'unit', 'code']) {
    if (p[k] == null) continue;
    const m = String(p[k]).match(/(\d{1,2})\s*-\s*0*(\d{1,2})/); if (m) return `${+m[1]}-${+m[2]}`;
  }
  return '';
}

// ---------- buttons ----------
function wire(H, body, p, items) {
  const later = (what) => H.toast(`${what} is still loading. Try again in a moment.`, 3500);
  const on = (k, fn) => body.querySelectorAll(`[data-tc="${k}"]`).forEach((b) => { b.onclick = fn; });
  on('copy', () => copy(H, H.units.coord(p[0], p[1])));
  on('huntday', () => { H.presets.apply('hunt'); H.toast('Hunt day layers on. Tap the map again to see them here.', 3500); });
  on('canhunt', () => { if (H.hunt) H.hunt.open('canhunt', p); else later('Can I hunt here now?'); });
  on('save', () => { if (H.tools && H.tools.dropWaypoint) H.tools.dropWaypoint(p); else later('Saving points'); });
  on('sight', () => { if (H.sightings && H.sightings.logAt) H.sightings.logAt(p); else later('The sightings log'); });
  on('glass', () => {
    if (!H.glass || !H.glass.run) { if (H.hunt) H.hunt.open('glass'); else later('Glassing spots'); return; }
    H.closeSheet();
    const z = Math.min(Math.max(H.map.getZoom(), 13.5), 14.5);
    H.map.once('moveend', () => H.glass.run());
    H.map.easeTo({ center: p, zoom: z, duration: 600 });
  });
  on('truck', () => { if (H.field && H.field.markTruck) H.field.markTruck(p); else later('Mark my truck'); });
  on('view', async () => {
    H.closeSheet(); H.toast('Checking the lines of sight', 2500);
    let r = null;
    try { r = await H.terrain.viewshed(p); } catch (err) { console.warn('Viewshed', err); H.toast('Could not check here. Terrain data is missing.', 4000); }
    if (!r) return;
    H.toast(`Pink is what you can likely see: ${r.pct}% of the circle. Trees not included.`, 4500);
    if (H.emit) H.emit('terrain', { tool: 'view', result: r });
  });
  on('more', () => { if (H.tools && H.tools.spotMenu) H.tools.spotMenu(cur ? cur.ll : { lng: p[0], lat: p[1] }); else later('More tools'); });
  body.querySelectorAll('[data-tc-more]').forEach((b) => b.onclick = () => {
    const r = items[+b.dataset.tcMore]; if (!r) return;
    const ll = { lng: p[0], lat: p[1] };
    layers.openDetail([r], ll, () => open(H, ll, { items, reopen: true }));
  });
}
function copy(H, t) {
  const done = () => H.toast('Copied', 1800);
  const legacy = () => {
    try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); if (ok) { done(); return; } } catch (err) { /* fall through */ }
    H.toast(t, 6000);
  };
  try { (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(done, legacy); } catch (err) { legacy(); }
}

// ---------- Here: elevation, MU, land, legal light (each fills in as it is ready) ----------
const safe = (x) => Promise.resolve(x).catch(() => null);
const cert = (H, v) => (H.ui && H.ui.cert ? H.ui.cert(v) : `${v}%`);
function fill(H, body, p, my) {
  const live = () => my === tok && isMine(H) && H.els.sheetB === body;
  const put = (k, v) => { if (!live()) return; const o = body.querySelector(`[data-tc-out="${k}"]`); if (o) o.innerHTML = v; };
  const line = (k, st, h, t, src) => {
    if (!live()) return;
    const o = body.querySelector(`[data-tc-out="${k}"]`); if (!o) return;
    o.className = st; o.innerHTML = `<em>${WORD[st]}</em><div><b>${h}</b>${t ? `<p>${t}</p>` : ''}${src ? `<small>${src}</small>` : ''}</div>`;
  };
  // legal light: no network, no files
  lightLine(H, p, line);
  // elevation from the terrain tiles
  safe(H.elevationAt({ lng: p[0], lat: p[1] })).then((e) => put('elev', e == null || !isFinite(e) ? 'Not on this phone here' : esc(H.units.elev(Math.round(e)))));
  // MU
  safe(layers.muAt(p)).then((mu) => {
    if (mu && mu.state === 'ok' && mu.id) put('mu', `<b>${esc(mu.id)}</b>${mu.region ? ` <small>${esc(mu.region)}</small>` : ''}`);
    else if (mu && mu.state === 'outside') put('mu', '<span class="tc-chk">CHECK</span> <small>Not found here, or the MU map for this area is not on this phone yet</small>');
    else put('mu', '<span class="tc-chk">CHECK</span> <small>The MU map is not on this phone here</small>');
  });
  // land status
  // a layer file that is still loading reads as no data: try once more while the card is open
  const land = (n) => landLine(H, p).then((r) => {
    if (!r || !live()) return;
    if (r.retry && n < 2) { setTimeout(() => { if (live()) land(n + 1); }, 1500 * (n + 1)); if (n) return; }
    line('land', r.st, r.h, r.t, r.src);
  });
  land(0);
}

function lightLine(H, p, line) {
  const L = H.field && typeof H.field.legalLight === 'function' ? H.field.legalLight(p, 'big') : null;
  const S = window.HuntMentor || {};
  if (!L || !S.hhmm) { line('light', 'check', 'Legal light now: not known', 'The sun times or hours data is not loaded yet. Open the app once with signal.'); return; }
  const now = Date.now(), hh = (t) => S.hhmm(new Date(t)), span = `Today here: ${hh(L.start)} to ${hh(L.end)}`.replace(/\.?$/, '.');
  const src = `${esc((L.h && L.h.text) || SYN)} ${cert(H, L.h && L.h.certainty != null ? L.h.certainty : null)}`;
  const left = (ms) => { const m = Math.max(0, Math.floor(ms / 6e4)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  if (now < L.start) line('light', 'no', `Before legal light (big game)`, `${span} Starts in ${left(L.start - now)}.`, src);
  else if (now > L.end) line('light', 'no', 'Legal light is over for today', `${span}`, src);
  else line('light', 'ok', `Legal light now: ${left(L.end - now)} left`, `${span} Big game hours. Ducks and geese differ: see Can I hunt here now?`, src);
}

/** One land line from the land layers at p (worst first: NO, then CHECK, then LIKELY). */
async function landLine(H, p) {
  if (!insightsP) insightsP = import('./tools-insights.js').catch((err) => { insightsP = null; throw err; });
  let nearLayer;
  try { ({ nearLayer } = await insightsP); } catch (err) { return { st: 'check', h: 'Land status: not checked', t: 'This part of the map did not load. Reload the app with signal.' }; }
  const ids = ['no_hunting', 'private_land', 'reserves', 'parks', 'city_limits', 'wma', 'crown_land'];
  const R = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await safe(nearLayer(id, p, 0))])));
  const inside = (id) => { const x = R[id]; return x && x.hits ? x.hits.find((h) => h.dist === 0) : null; };
  const read = (id) => !!(R[id] && R[id].state === 'ok');
  // short map source: the plain name in brackets when the source has one ("WHSE_... (ParcelMap BC)"), else the layer name
  const lay = (id) => { const l = R[id] && R[id].layer; if (!l) return ''; const m = String(l.source || '').match(/\(([^)]+)\)\s*$/); const nm = m ? m[1] : (/^[A-Z0-9_.]+$/.test(l.source || '') ? `${l.label || id} layer, BC Data Catalogue` : (l.source || l.label || id)); return `Map: ${esc(nm.length > 60 ? `${l.label || id} layer` : nm)}${l.dataDate ? `, data ${esc(l.dataDate)}` : ''}. ${cert(H, l.cert != null ? l.cert : null)}`; };
  const syn = (page) => `${esc(SYN)}, page ${page}. ${cert(H, 99)} <a href="${SYN_URL}" target="_blank" rel="noopener">Synopsis PDF</a>`;
  const out = [];
  const method = (H.prefs && H.prefs.chMethod) || 'rifle';
  const ns = inside('no_hunting');
  if (ns) { const x = ns.props || {}, v = x[method] || 'check'; out.push({ st: v === 'no' ? 'no' : 'check', h: `${esc(x.ban ? 'No shooting or no hunting area' : 'No shooting area')}${x.name ? `: ${esc(x.name)}` : ''}`, t: esc(x.ban || x.rule || 'Read the rule before you shoot.'), src: lay('no_hunting') }); }
  const pv = inside('private_land'); if (pv) out.push({ st: 'no', h: 'Private land', t: 'No hunting without the owner’s permission.', src: `${syn(9)}<br>${lay('private_land')}` });
  const rv = inside('reserves'); if (rv) out.push({ st: 'no', h: `First Nations reserve${rv.props && rv.props.name ? `: ${esc(rv.props.name)}` : ''}`, t: 'Treated like private land. Permission must be obtained from the Nation.', src: `${syn(9)}<br>${lay('reserves')}` });
  const pk = inside('parks'); if (pk) out.push({ st: 'check', h: `${esc((pk.props && pk.props.designation) || 'Park or protected area')}${pk.props && pk.props.name ? `: ${esc(pk.props.name)}` : ''}`, t: 'Hunting rules differ by park. Check BC Parks and the synopsis.', src: lay('parks') });
  const ct = inside('city_limits'); if (ct) out.push({ st: 'check', h: `Inside ${esc((ct.props && (ct.props.name || ct.props.abbr)) || 'town limits')}`, t: 'Most towns ban shooting by bylaw. Check the local bylaw.', src: lay('city_limits') });
  const wm = inside('wma'); if (wm) out.push({ st: 'check', h: `WMA (Wildlife Management Area)${wm.props && wm.props.name ? `: ${esc(wm.props.name)}` : ''}`, t: 'Some WMAs have their own rules. Call the regional office.', src: lay('wma') });
  const c = inside('crown_land'), cls = c && c.props && c.props.cls;
  if (cls === 'crown') out.push({ st: 'likely', h: 'Crown land (public land)', t: 'Usually open to hunt in an open season, unless a closure, park, no shooting area, sign or bylaw says no.', src: `${syn(11)}<br>${lay('crown_land')}` });
  else if (cls === 'likely') out.push({ st: 'check', h: 'Likely Crown land', t: 'No titled parcel here in the official data. Watch for fences and signs.', src: lay('crown_land') });
  else if (cls === 'federal') out.push({ st: 'check', h: 'Federal land', t: 'Has its own rules. VERIFY before you hunt.', src: `${syn(9)}<br>${lay('crown_land')}` });
  const RANK = { no: 0, check: 1, likely: 2 };
  if (out.length) {
    out.sort((a, b) => RANK[a.st] - RANK[b.st]);
    const top = out[0], rest = out.slice(1).map((x) => x.h);
    return { st: top.st, h: top.h, t: `${top.t}${rest.length ? ` Also here: ${rest.join('; ')}.` : ''}`, src: top.src };
  }
  if (!['private_land', 'crown_land', 'parks', 'reserves'].some(read)) return { st: 'check', h: 'Land status: not on this phone here', t: 'The land layers for this spot are not saved. Open the map here with signal, or save this area in Offline Maps.', retry: navigator.onLine };
  return { st: 'check', h: 'Land owner: not known here', t: 'Not Crown land and not private land in the map data. Find out who owns it before you hunt.', src: lay('crown_land') || lay('private_land') };
}

// ---------- marker, swipe to close, styles ----------
function setMarker(H, p) {
  if (mk) { mk.remove(); mk = null; }
  if (!p || !H.maplibregl) return;
  const el = document.createElement('div'); el.className = 'hmm-tap';
  mk = new H.maplibregl.Marker({ element: el }).setLngLat(p).addTo(H.map);
}
/** Swipe down on the card body (when it is scrolled to the top) closes it, like the header grip does in core.js. */
function swipe(H) {
  if (swipeOn || !H.els || !H.els.sheetB) return; swipeOn = true;
  const s = H.els.sheet, b = H.els.sheetB; let y0 = null, dy = 0, moved = false;
  b.addEventListener('touchstart', (e) => {
    y0 = null;
    if (!isMine(H) || b.scrollTop > 2 || e.touches.length !== 1 || e.target.closest('input,select,textarea')) return;
    y0 = e.touches[0].clientY; dy = 0; moved = false;
  }, { passive: true });
  b.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (dy < 0 || b.scrollTop > 2) { y0 = null; s.style.transition = ''; s.style.transform = ''; return; }
    if (dy > 8) { moved = true; s.style.transition = 'none'; s.style.transform = `translateY(${dy}px)`; }
  }, { passive: true });
  const end = () => { if (y0 == null) return; y0 = null; s.style.transition = ''; if (moved && dy > 90) H.closeSheet(); else s.style.transform = ''; };
  b.addEventListener('touchend', end); b.addEventListener('touchcancel', end);
}

const sv = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const IC = {
  copy: sv('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
  canhunt: sv('<rect x="7" y="2" width="10" height="20" rx="4"/><circle cx="12" cy="7" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="17" r="1.8" fill="currentColor"/>'),
  pin: sv('<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>'),
  eye: sv('<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>'),
  car: sv('<path d="M3 11l9-8 9 8"/><path d="M12 3v18"/><path d="M8 21h8"/>'),
  glass: sv('<circle cx="7" cy="15" r="4"/><circle cx="17" cy="15" r="4"/><path d="M11 15h2M5 11l2-6h2M19 11l-2-6h-2"/>'),
  truck: sv('<path d="M2 16V7h11v9"/><path d="M13 10h4l4 4v2h-8"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>'),
  view: sv('<path d="M3 20l6-9 4 5 3-4 5 8Z"/><circle cx="17" cy="6" r="2"/>'),
  more: sv('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
};

// styles live here (map.css is owned by the design work); colours come from the map tokens with fallbacks
function css() {
  if (document.getElementById('tc-css')) return;
  const st = document.createElement('style'); st.id = 'tc-css';
  st.textContent = `
.tc{font-size:15px;line-height:1.4;color:var(--hmm-ink,#1f211b)}
.tc-h{margin:14px 0 6px;font-size:14px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--hmm-muted,#5d6152)}
.tc-h:first-child{margin-top:2px}
.tc-coord{display:flex;align-items:center;gap:10px;min-height:44px}
.tc-c{flex:1;min-width:0;font-weight:800;font-size:16px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.tc .tc-copy{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:44px;min-width:44px;padding:0 14px;border-radius:12px;border:1.5px solid var(--hmm-line,#ddd6c4);background:var(--hmm-card,#fbfaf5);color:var(--hmm-ink,#1f211b);font:700 14px/1 -apple-system,system-ui,sans-serif}
.tc-copy svg{width:20px;height:20px}
.tc-kv{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin:6px 0}
.tc-kv>div{padding:8px 10px;border-radius:10px;background:var(--hmm-soft,#efede4);min-width:0}
.tc-kv dt{font-size:14px;color:var(--hmm-muted,#5d6152)}
.tc-kv dd{margin:2px 0 0;font-size:16px;font-weight:700;overflow-wrap:anywhere}
.tc-kv dd small{display:block;font-size:14px;font-weight:400;color:var(--hmm-muted,#5d6152)}
.tc-chk{display:inline-block;padding:1px 6px;border-radius:6px;background:#b26a00;color:#fff;font-size:14px;font-weight:800}
.tc-lines{list-style:none;margin:8px 0 4px;padding:0}
.tc-lines li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;padding:8px 0;border-bottom:1px solid var(--hmm-line,#ddd6c4)}
.tc-lines em{font-style:normal;font-weight:800;font-size:14px;min-width:64px;text-align:center;padding:4px 6px;border-radius:8px;color:#fff;background:#b26a00}
.tc-lines li.ok em{background:#2e7d32}.tc-lines li.likely em{background:#558b2f}.tc-lines li.no em{background:#c62828}.tc-lines li.info em{background:#546e7a}
.tc-lines b{display:block;font-size:15px;line-height:1.3}
.tc-lines p{margin:2px 0 0;font-size:14px}
.tc-lines small{display:block;margin-top:3px;font-size:14px;color:var(--hmm-muted,#5d6152)}
.tc-note,.tc-empty{margin:6px 0;font-size:14px;color:var(--hmm-muted,#5d6152)}
.tc-list{list-style:none;margin:0;padding:0}
.tc-item{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--hmm-line,#ddd6c4)}
.tc-item b{display:block;font-size:15px;line-height:1.3}
.tc-item small{display:block;font-size:14px;color:var(--hmm-muted,#5d6152)}
.tc .tc-more{min-height:44px;min-width:64px;padding:0 12px;border-radius:12px;border:1.5px solid var(--hmm-line,#ddd6c4);background:var(--hmm-card,#fbfaf5);color:var(--hmm-ink,#1f211b);font:700 14px/1 -apple-system,system-ui,sans-serif}
.tc .tc-main{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:56px;margin:4px 0 10px;padding:0 16px;border:0;border-radius:14px;background:var(--hmm-accent,#e8590c);color:#fff;font:800 17px/1.2 -apple-system,system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.18)}
.tc-main svg{width:26px;height:26px;flex:none}
.tc-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}
.tc .tc-btn{display:flex;align-items:center;gap:8px;min-height:56px;padding:6px 10px;border-radius:12px;border:1.5px solid var(--hmm-line,#ddd6c4);background:var(--hmm-card,#fbfaf5);color:var(--hmm-ink,#1f211b);font:700 14.5px/1.2 -apple-system,system-ui,sans-serif;text-align:left;text-decoration:none;min-width:0}
.tc-btn svg{flex:none;width:22px;height:22px;color:var(--hmm-accent,#e8590c)}
.tc-btn span{min-width:0;overflow-wrap:anywhere}
.tc-btn small{display:block;margin-top:2px;font-weight:400;font-size:14px;color:var(--hmm-muted,#5d6152)}
.tc .tc-wide{width:100%;margin:4px 0}
.tc-back{width:100%;min-height:48px;margin:10px 0 4px}
`;
  document.head.appendChild(st);
}
