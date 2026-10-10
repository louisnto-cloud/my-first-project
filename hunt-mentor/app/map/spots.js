/* Hunt Map spots: candidate spots (SPOTS.md), listed in the manifest under group "Spots".
   Files (phone friendly): data/spots/<area>/index.geojson holds light points (id, name, cat, species, score, busy, mu, months)
   for markers and clusters; the full card for a tapped spot comes from the manifest "detail" template
   (data/spots/<area>/detail/<tile>.json, keyed by id, tile = floor(lon / tileDeg)_floor(lat / tileDeg), same rule as the
   pipeline), fetched once and kept in memory. Routes are their own layer, split in tiles too (layers.js, loadMinzoom).
   Clustered, with category icons (drive, atv, walk, backcountry, camp) and species filter chips. Tap a spot for its card.
   Property names read (first found wins): name | title; category | cat | type | access; species (array or "deer, moose");
   score, score_max; busy | pressure | busier; months; plan (object with drive, park, walk or walk_or_ride, camp, hunt, use,
   legal, verify, or an array); legal | legal_flags | flags (objects { level: ok | warn | stop, text, source, cert, date });
   evidence (strings or objects { text, source, cert, dist_m }); park_lat and park_lon (or park: [lon, lat]); dates | data_dates. */
import { esc, prefs, units, parseMonths, monthsText, fmtNum, haversine } from './util.js';
import { SPOT_CATS, spotIconSvg } from './style.js';

export const SPECIES = ['deer', 'moose', 'elk', 'bear', 'grouse', 'duck', 'goose', 'quail', 'turkey', 'chukar', 'sheep', 'goat'];
export const isSpotLayer = (l) => l.group === 'Spots' && (l.kind === 'spots' || l.type === 'circle' || l.type === 'symbol');
export const iconHtml = (cat, size) => spotIconSvg(cat, size);

const CAT_SYN = [[/^drive|road|car|truck/, 'drive'], [/atv|quad|ride|ohv|utv|side by side/, 'atv'], [/walk|hike|foot/, 'walk'], [/back ?country|backpack|multi|overnight/, 'backcountry'], [/camp/, 'camp']];
const num = (v) => (v == null || v === '' || isNaN(+v) ? null : +v);
export function prep(p) {
  const c = String(p.category ?? p.cat ?? p.type ?? p.access ?? '').toLowerCase().trim();
  p._cat = SPOT_CATS[c] && c !== 'other' ? c : ((CAT_SYN.find(([re]) => re.test(c)) || [0, 'other'])[1]);
  p._name = String(p.name ?? p.NAME ?? p.title ?? p.label ?? 'Candidate spot');
  p._score = num(p.score ?? p.SCORE);
  p._sp = speciesList(p.species ?? p.SPECIES ?? p.tags);
}
function parseMaybe(v) { if (typeof v === 'string' && /^\s*[[{]/.test(v)) { try { return JSON.parse(v); } catch (e) { return v; } } return v; }
function speciesList(v) {
  v = parseMaybe(v); if (v == null) return [];
  const out = new Set();
  for (let s of Array.isArray(v) ? v : String(v).split(/[,;/]/)) {
    s = String(s).toLowerCase().trim(); if (!s) continue;
    out.add(SPECIES.find((t) => s.includes(t)) || (s.includes('whitetail') ? 'deer' : s));
  }
  return [...out];
}
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
export const CATS = ['drive', 'atv', 'walk', 'backcountry', 'camp'];
const CAT_CHIP = { drive: 'Drive', atv: 'ATV', walk: 'Walk', backcountry: 'Backcountry', camp: 'Camp' };
export function filter(feats) {
  const sp = prefs.species || 'all', cat = prefs.spotCat || 'all';
  if (sp === 'all' && cat === 'all') return feats;
  return feats.filter((f) => (sp === 'all' || (f.properties._sp || []).includes(sp)) && (cat === 'all' || f.properties._cat === cat));
}
export function subtitle(p) {
  return [(SPOT_CATS[p._cat] || SPOT_CATS.other).label, (p._sp || []).map(cap).join(', ')].filter(Boolean).join(', ');
}
export function chipsHtml(feats) {
  const found = new Set(); for (const f of feats) (f.properties._sp || []).forEach((s) => found.add(s));
  const list = found.size ? [...found].sort((a, b) => SPECIES.indexOf(a) - SPECIES.indexOf(b)) : ['deer', 'moose', 'elk', 'bear', 'grouse', 'duck', 'quail'];
  const cur = prefs.species || 'all', cc = prefs.spotCat || 'all';
  return `<div class="hmm-chiprow" role="group" aria-label="How you get there"><span class="hmm-chiplabel">Access</span>
    ${['all', ...CATS].map((c) => `<button class="hmm-chip ${cc === c ? 'on' : ''}" data-cat="${c}" ${c === 'atv' ? 'aria-label="ATV (all terrain vehicle)"' : ''}>${c === 'all' ? 'All' : `${spotIconSvg(c, 16)} ${CAT_CHIP[c]}`}</button>`).join('')}</div>
    <div class="hmm-chiprow" role="group" aria-label="Species"><span class="hmm-chiplabel">Species</span>
    ${['all', ...list].map((s) => `<button class="hmm-chip ${cur === s ? 'on' : ''}" data-sp="${esc(s)}">${s === 'all' ? 'All' : esc(cap(s))}</button>`).join('')}</div>
    <p class="hmm-muted hmm-tight">ATV means all terrain vehicle. Filters change the spots on the map.</p>`;
}

export function addLayers(H, l, src) {
  const map = H.map, before = H.anchors.symbols, id = `hm-l-${l.id}`;
  // Clutter: clusters up to zoom 12 (radius wider than the biggest bubble, so bubbles never stack); single pins below
  // zoom 14 hide when they would cover a better scored pin (symbol-sort-key), and names show from zoom 13 only where they fit.
  map.addSource(src, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 80, clusterMaxZoom: 12, maxzoom: 14, tolerance: 0.5, attribution: 'Candidate spots: Hunt Mentor, from BC open data' });
  map.addLayer({ id: `${id}-cluster`, type: 'circle', source: src, filter: ['has', 'point_count'], paint: {
    'circle-color': '#e8590c', 'circle-opacity': 0.92, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 19, 50, 23, 200, 27],
    'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5,
  } }, before);
  map.addLayer({ id: `${id}-count`, type: 'symbol', source: src, filter: ['has', 'point_count'], layout: {
    'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true, 'text-ignore-placement': true,
  }, paint: { 'text-color': '#ffffff' } }, before);
  map.addLayer({ id, type: 'symbol', source: src, filter: ['!', ['has', 'point_count']], layout: {
    'icon-image': ['concat', 'spot-', ['coalesce', ['get', '_cat'], 'other']], 'icon-overlap': ['step', ['zoom'], 'never', 14, 'always'], 'icon-padding': 1,
    'symbol-sort-key': ['-', 100, ['coalesce', ['get', '_score'], 0]],
    'text-field': ['step', ['zoom'], '', 13, ['get', '_name']], 'text-font': ['Noto Sans Bold'], 'text-size': 11.5, 'text-padding': 4,
    'text-anchor': 'top', 'text-offset': [0, 1.4], 'text-optional': true, 'text-max-width': 9,
  }, paint: { 'text-color': '#24261f', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.6 } }, before);
  return [`${id}-cluster`, `${id}-count`, id];
}

export function onHit(H, feat, getRaw) {
  const map = H.map, p = feat.properties;
  if (p.cluster_id != null) {
    const src = map.getSource(feat.source);
    Promise.resolve(src.getClusterExpansionZoom(p.cluster_id)).then((z) => map.easeTo({ center: feat.geometry.coordinates, zoom: Math.min(z + 0.3, 16), duration: 600 })).catch(() => {});
    return;
  }
  const r = getRaw(p._hid);
  if (r) openCard(H, r.st.l, r.f);
}

// ---------- spot card ----------
const PLAN = [['drive', 'Drive', ['drive', 'Drive']], ['park', 'Park', ['park', 'Park', 'parking']], ['walk', 'Walk or ride', ['walk', 'walk_or_ride', 'walkOrRide', 'walk_ride', 'ride', 'Walk']],
  ['camp', 'Camp', ['camp', 'Camp']], ['hunt', 'Hunt', ['hunt', 'Hunt']], ['use', 'Use', ['use', 'gear', 'Use']], ['legal', 'Legal', ['legal', 'Legal']], ['verify', 'Verify', ['verify', 'Verify']]];
function planSections(v) {
  v = parseMaybe(v);
  if (v == null || v === '') return [];
  if (typeof v === 'string') return [['Plan', v]];
  if (Array.isArray(v)) {
    return v.map((x, i) => {
      if (typeof x !== 'string') return [x.title || x.name || x.step || (PLAN[i] ? PLAN[i][1] : ''), x.text ?? x.t ?? x.lines ?? x.body ?? ''];
      const m = x.match(/^\s*(Drive|Park|Walk or ride|Walk|Ride|Walk or drive slowly|Camp|Hunt|Use|Legal|Verify)\s*:\s*([\s\S]*)$/i); // "Drive: from Heffley Creek, ..."
      return m ? [cap(m[1]), m[2]] : [PLAN[i] ? PLAN[i][1] : `Step ${i + 1}`, x];
    });
  }
  const out = [], used = new Set();
  for (const [, title, keys] of PLAN) { const k = keys.find((a) => v[a] != null && v[a] !== ''); if (k) { out.push([title, v[k]]); used.add(k); } }
  for (const [k, t] of Object.entries(v)) if (!used.has(k) && t != null && t !== '') out.push([cap(k.replace(/_/g, ' ')), t]);
  return out;
}
function linesHtml(t) {
  t = parseMaybe(t);
  const lines = Array.isArray(t) ? t.map((x) => (typeof x === 'object' ? x.text || JSON.stringify(x) : x)) : String(t).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split(/\n+/);
  const clean = lines.flatMap((x) => String(x).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split(/\n+/)).map((x) => x.trim()).filter(Boolean);
  return clean.length > 1 ? `<ul>${clean.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(clean[0] || '')}</p>`;
}
const LEVEL = (s) => { s = String(s || '').toLowerCase(); return /stop|red|no\b|closed|illegal|not allowed/.test(s) ? 'stop' : /warn|amber|yellow|caution|check|maybe/.test(s) ? 'warn' : 'ok'; };
function flagsList(v) {
  v = parseMaybe(v); if (v == null) return [];
  return (Array.isArray(v) ? v : [v]).map((x) => {
    if (typeof x === 'string') { const m = x.match(/^\s*(ok|warn|stop)\s*[:\-]\s*(.*)$/i); return { level: m ? m[1].toLowerCase() : 'warn', text: m ? m[2] : x }; }
    const text = x.text ?? x.t ?? x.label ?? x.msg ?? x.message ?? '';
    const lv = x.level ?? x.lvl ?? x.status ?? x.flag ?? x.light;
    return { level: lv != null ? LEVEL(lv) : guessLevel(text), text, source: x.source ?? x.src, cert: num(x.cert ?? x.certainty), date: x.date ?? x.dataDate };
  });
}
// No level given: stop for no hunting or no firearms words, check for closures, private land, parks, bylaws and edges, else ok.
function guessLevel(t) {
  t = String(t).toLowerCase();
  if (/no hunting|no shooting|no firing|not allowed|prohibited|ecological reserve|spot is inside a motor vehicle closed area|inside city limits/.test(t)) return 'stop';
  if (/closed|closure|private|park|reserve|bylaw|near the|check|permission|crosses|enters|highway|rule|limit/.test(t)) return 'warn';
  return 'ok';
}
function evidenceList(v) {
  v = parseMaybe(v); if (v == null) return [];
  return (Array.isArray(v) ? v : [v]).map((x) => (typeof x === 'string' ? { text: x } : { text: x.text ?? x.t ?? x.label ?? x.what ?? '', source: x.source ?? x.src, cert: num(x.cert ?? x.certainty), dist: num(x.dist_m ?? x.dist ?? x.distance_m), date: x.date ?? x.dataDate, pts: num(x.pts ?? x.points) }));
}
function parkPoint(p) {
  const pk = parseMaybe(p.parkLL ?? p.park_ll ?? p.park_point ?? p.parking ?? (Array.isArray(parseMaybe(p.park)) ? p.park : null));
  if (Array.isArray(pk) && pk.length >= 2 && !isNaN(+pk[0])) return [+pk[1], +pk[0]]; // [lon, lat] to [lat, lon]
  const la = num(p.park_lat ?? p.parkLat), lo = num(p.park_lon ?? p.park_lng ?? p.parkLon);
  return la != null && lo != null ? [la, lo] : null;
}
// Season rows from data/seasons (pipeline): { sp, cls, open, close (MM-DD), dates, limit, notes, page or src, cert, leh, none }.
// Duck and goose rows carry src (federal Migratory Birds Regulations) and limit (daily and possession).
function seasonList(v) { v = parseMaybe(v); return Array.isArray(v) ? v.filter((r) => r && typeof r === 'object' && (r.sp || r.dates)) : []; }
function openToday(r) {
  if (!r.open || !r.close) return r.dates === 'No closed season';
  const d = new Date(), t = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return r.open <= r.close ? t >= r.open && t <= r.close : t >= r.open || t <= r.close;
}
function seasonsHtml(rows, mu) {
  if (!rows.length) return '';
  return `<h3 class="hmm-h">Seasons${mu ? ` for MU ${esc(mu)}` : ''}</h3><ul class="hmm-evid hmm-seas">${rows.map((r) => {
    const on = !r.none && !r.leh && openToday(r);
    const src = [r.src || (r.page != null ? `Synopsis page ${r.page}` : ''), r.cert != null ? `${r.cert}%` : ''].filter(Boolean).join(', ');
    return `<li><b>${esc(cap(r.sp || ''))}${r.cls ? `, ${esc(String(r.cls).toLowerCase())}` : ''}</b> ${esc(r.dates || '')}${r.limit ? `, ${esc(r.limit)}` : ''}${on ? ' <span class="hmm-open">Open today</span>' : ''}<small>${esc([r.notes ? cap(r.notes) : '', src].filter(Boolean).join('. '))}</small></li>`;
  }).join('')}</ul><p class="hmm-muted">Source: ${rows.some((r) => r.src) ? 'federal Migratory Birds Regulations, 2022 (ducks, geese, coots, snipe) and ' : ''}BC Hunting and Trapping Regulations Synopsis 2026 to 2028. Youth, bow and LEH (Limited Entry Hunting) rows need the right hunter or a draw.</p>`;
}
function datesText(v) {
  v = parseMaybe(v); if (v == null || v === '') return '';
  if (typeof v === 'object') return Object.entries(v).map(([k, d]) => `${k.replace(/_/g, ' ')} ${d}`).join(', ');
  return String(v);
}

// ---------- detail tiles ----------
const detailCache = new Map(); // url -> Promise of { id: properties }
const tileKey = (l, lon, lat) => { const d = +l.tileDeg || 0.25; return `${Math.floor(lon / d)}_${Math.floor(lat / d)}`; };
function detailUrl(l, p, c) {
  if (!l.detail || !p._area || !c) return null;
  return `${l.detail.replace(/\{area\}/g, p._area).replace(/\{tile\}/g, tileKey(l, c[0], c[1]))}?v=${encodeURIComponent(l.dataDate || '1')}`;
}
function getDetail(url) {
  if (!detailCache.has(url)) {
    const pr = fetch(url).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    pr.catch(() => detailCache.delete(url)); // try again on the next tap
    detailCache.set(url, pr);
  }
  return detailCache.get(url);
}
/** Detail tile URLs of a spots layer for a bbox (Offline Maps). */
export function detailFiles(l, bbox) {
  if (!l.detail || !l.detailTiles) return [];
  const d = +l.tileDeg || 0.25, out = [];
  for (const [area, keys] of Object.entries(l.detailTiles)) {
    for (const k of keys || []) {
      const [x, y] = k.split('_').map(Number), b = [x * d, y * d, (x + 1) * d, (y + 1) * d];
      if (b[0] <= bbox[2] && b[2] >= bbox[0] && b[1] <= bbox[3] && b[3] >= bbox[1]) out.push(`${l.detail.replace(/\{area\}/g, area).replace(/\{tile\}/g, k)}?v=${encodeURIComponent(l.dataDate || '1')}`);
    }
  }
  return out;
}
const withDetail = (f, d) => (d ? { type: 'Feature', geometry: f.geometry, properties: Object.assign({}, f.properties, d, pick(f.properties)) } : f);
const pick = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => k.startsWith('_')));

let selMk = null, cardTok = 0;
export function openCard(H, l, f) {
  const p = f.properties, url = p.plan == null ? detailUrl(l, p, f.geometry.coordinates) : null;
  if (!url) { renderCard(H, l, f); return; }
  const tok = ++cardTok;
  H.openSheet({ title: p._name, html: '<p class="hmm-muted">Loading spot details</p>', modal: false, tall: true, onClose: () => { if (tok === cardTok) cardTok++; } });
  getDetail(url).then((d) => { if (tok === cardTok) renderCard(H, l, withDetail(f, d && d[p.id])); })
    .catch(() => { if (tok === cardTok) renderCard(H, l, f, true); });
}
function renderCard(H, l, f, failed) {
  const map = H.map, p = f.properties, [lng, lat] = f.geometry.coordinates;
  const cat = SPOT_CATS[p._cat] || SPOT_CATS.other, park = parkPoint(p);
  const plan = planSections(p.plan ?? p.PLAN), flags = flagsList(p.legal_flags ?? p.flags ?? p.legal);
  const evid = evidenceList(p.evidence ?? p.EVIDENCE), months = p._m || parseMonths(p.months);
  const busy = p.busy ?? p.pressure ?? p.busier ?? p.crowd;
  const max = num(p.score_max ?? p.scoreMax ?? p.scoreOf);
  const flagSrc = (x) => [x.source, x.cert != null ? `${x.cert}%` : '', x.date ? `data ${x.date}` : ''].filter(Boolean).join(', ');
  const dates = datesText(p.dates ?? p.data_dates ?? p.dataDates);
  const seas = seasonList(p.seasonRows);
  const hasLegalWords = flags.length || seas.length || plan.some(([t]) => t === 'Legal');
  const html = `<div class="hmm-spot">
    <div class="hmm-spot-h"><span class="hmm-spot-ic" style="border-color:${cat.color}">${spotIconSvg(p._cat, 28)}</span>
      <div><div class="hmm-spot-cat" style="color:${cat.color}">${esc(cat.label)}</div><div class="hmm-muted">Candidate spot. Scout it first.</div></div></div>
    ${(p._sp || []).length ? `<div class="hmm-chiprow static">${p._sp.map((s) => `<span class="hmm-chip on">${esc(cap(s))}</span>`).join('')}</div>` : ''}
    <div class="hmm-stats">
      ${p._score != null ? `<div><small>Score</small><b>${esc(fmtNum(p._score, Number.isInteger(p._score) ? 0 : 1))}${max ? ` of ${esc(max)}` : ''}</b><em>my pick</em></div>` : ''}
      ${busy ? `<div><small>Hunters</small><b>${esc(cap(String(busy)))}</b><em>estimate</em></div>` : ''}
      ${months.length ? `<div><small>Months</small><b>${esc(monthsText(months))}</b></div>` : ''}
    </div>
    ${failed ? `<p class="hmm-muted">The full plan did not load. ${navigator.onLine ? 'Try again in a moment.' : 'You are offline and this area is not saved.'}</p>` : ''}
    ${H.ui.linksHtml(lat, lng, p._name, park)}
    <p class="hmm-coord">${esc(units.coord(lng, lat))}${park ? `<br><span class="hmm-muted">Park at ${esc(units.coord(park[1], park[0]))}, ${esc(units.dist(haversine([lng, lat], [park[1], park[0]])))} away</span>` : ''}</p>
    ${plan.length ? `<h3 class="hmm-h">Plan</h3><ol class="hmm-plan">${plan.map(([t, x]) => `<li><b>${esc(t)}</b>${linesHtml(x)}</li>`).join('')}</ol>` : ''}
    ${hasLegalWords ? '<h3 class="hmm-h">Legal</h3><div class="hmm-banner">Study aid only. The official regulations are the law.</div>' : ''}
    ${seasonsHtml(seas, p.mu)}
    ${flags.length ? `<ul class="hmm-flags">${flags.map((x) => `<li class="${x.level}"><i aria-hidden="true"></i><span><b class="hmm-fl">${x.level === 'ok' ? 'OK' : x.level === 'warn' ? 'Check' : 'Stop'}</b> ${esc(x.text)}${flagSrc(x) ? `<small>${esc(flagSrc(x))}</small>` : ''}</span></li>`).join('')}</ul>` : ''}
    ${evid.length ? `<h3 class="hmm-h">Evidence</h3><ul class="hmm-evid">${evid.map((x) => `<li>${esc(x.text)}${x.pts ? ` <b class="hmm-pts">+${esc(x.pts)}</b>` : ''}${x.dist != null ? ` <span class="hmm-muted">(${esc(units.dist(x.dist))})</span>` : ''}${x.source || x.cert != null ? `<small>${esc([x.source, x.cert != null ? `${x.cert}%` : '', x.date].filter(Boolean).join(', '))}</small>` : ''}</li>`).join('')}</ul>` : ''}
    <p class="hmm-verify-line">Candidate only. Check posted signs. Private land can be unsigned.${dates ? ` Data dates: ${esc(dates)}.` : ''}</p>
  </div>`;
  if (selMk) selMk.remove();
  const el = document.createElement('div'); el.className = 'hmm-sel';
  selMk = new H.maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
  H.openSheet({ title: p._name, html, modal: false, tall: true, onClose: () => { if (selMk) { selMk.remove(); selMk = null; } } });
  const b = map.getBounds(); if (!b.contains([lng, lat])) map.easeTo({ center: [lng, lat], duration: 500 });
}
