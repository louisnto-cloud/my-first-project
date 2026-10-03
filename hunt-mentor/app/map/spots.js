/* Hunt Map spots: candidate spots from data/spots/<area>/spots.geojson (SPOTS.md), listed in the manifest under group "Spots".
   Clustered, with category icons (drive, atv, walk, backcountry, camp) and species filter chips. Tap a spot for its card.
   Property names read (first found wins): name | title; category | cat | type | access; species (array or "deer, moose");
   score, score_max; busy | pressure | busier; months; plan (object with drive, park, walk or walk_or_ride, camp, hunt, use,
   legal, verify, or an array); legal | legal_flags | flags (objects { level: ok | warn | stop, text, source, cert, date });
   evidence (strings or objects { text, source, cert, dist_m }); park_lat and park_lon (or park: [lon, lat]); dates | data_dates. */
import { esc, prefs, units, parseMonths, monthsText, fmtNum, haversine } from './util.js';
import { SPOT_CATS, spotIconSvg } from './style.js';

export const SPECIES = ['deer', 'moose', 'elk', 'bear', 'grouse', 'duck', 'goose', 'quail', 'chukar', 'sheep', 'goat'];
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
export function filter(feats) {
  const sp = prefs.species || 'all';
  return sp === 'all' ? feats : feats.filter((f) => (f.properties._sp || []).includes(sp));
}
export function subtitle(p) {
  return [(SPOT_CATS[p._cat] || SPOT_CATS.other).label, (p._sp || []).map(cap).join(', ')].filter(Boolean).join(', ');
}
export function chipsHtml(feats) {
  const found = new Set(); for (const f of feats) (f.properties._sp || []).forEach((s) => found.add(s));
  const list = found.size ? [...found].sort((a, b) => SPECIES.indexOf(a) - SPECIES.indexOf(b)) : ['deer', 'moose', 'elk', 'bear', 'grouse', 'duck', 'quail'];
  const cur = prefs.species || 'all';
  return `<div class="hmm-chiprow" role="group" aria-label="Species"><span class="hmm-chiplabel">Species</span>
    ${['all', ...list].map((s) => `<button class="hmm-chip ${cur === s ? 'on' : ''}" data-sp="${esc(s)}">${s === 'all' ? 'All' : esc(cap(s))}</button>`).join('')}</div>`;
}

export function addLayers(H, l, src) {
  const map = H.map, before = H.anchors.symbols, id = `hm-l-${l.id}`;
  map.addSource(src, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 46, clusterMaxZoom: 11, attribution: 'Candidate spots: Hunt Mentor, from BC open data' });
  map.addLayer({ id: `${id}-cluster`, type: 'circle', source: src, filter: ['has', 'point_count'], paint: {
    'circle-color': '#e8590c', 'circle-opacity': 0.92, 'circle-radius': ['step', ['get', 'point_count'], 15, 10, 18, 50, 22, 200, 27],
    'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5,
  } }, before);
  map.addLayer({ id: `${id}-count`, type: 'symbol', source: src, filter: ['has', 'point_count'], layout: {
    'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true, 'text-ignore-placement': true,
  }, paint: { 'text-color': '#ffffff' } }, before);
  map.addLayer({ id, type: 'symbol', source: src, filter: ['!', ['has', 'point_count']], layout: {
    'icon-image': ['concat', 'spot-', ['coalesce', ['get', '_cat'], 'other']], 'icon-allow-overlap': true,
    'symbol-sort-key': ['-', 100, ['coalesce', ['get', '_score'], 0]],
    'text-field': ['step', ['zoom'], '', 12.5, ['get', '_name']], 'text-font': ['Noto Sans Bold'], 'text-size': 11.5,
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
  const lines = Array.isArray(t) ? t.map((x) => (typeof x === 'object' ? x.text || JSON.stringify(x) : x)) : String(t).split(/\n+/);
  const clean = lines.map((x) => String(x).trim()).filter(Boolean);
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
function datesText(v) {
  v = parseMaybe(v); if (v == null || v === '') return '';
  if (typeof v === 'object') return Object.entries(v).map(([k, d]) => `${k.replace(/_/g, ' ')} ${d}`).join(', ');
  return String(v);
}

let selMk = null;
export function openCard(H, l, f) {
  const map = H.map, p = f.properties, [lng, lat] = f.geometry.coordinates;
  const cat = SPOT_CATS[p._cat] || SPOT_CATS.other, park = parkPoint(p);
  const plan = planSections(p.plan ?? p.PLAN), flags = flagsList(p.legal_flags ?? p.flags ?? p.legal);
  const evid = evidenceList(p.evidence ?? p.EVIDENCE), months = p._m || parseMonths(p.months);
  const busy = p.busy ?? p.pressure ?? p.busier ?? p.crowd;
  const max = num(p.score_max ?? p.scoreMax ?? p.scoreOf);
  const flagSrc = (x) => [x.source, x.cert != null ? `${x.cert}%` : '', x.date ? `data ${x.date}` : ''].filter(Boolean).join(', ');
  const dates = datesText(p.dates ?? p.data_dates ?? p.dataDates);
  const hasLegalWords = flags.length || plan.some(([t]) => t === 'Legal');
  const html = `<div class="hmm-spot">
    <div class="hmm-spot-h"><span class="hmm-spot-ic" style="border-color:${cat.color}">${spotIconSvg(p._cat, 28)}</span>
      <div><div class="hmm-spot-cat" style="color:${cat.color}">${esc(cat.label)}</div><div class="hmm-muted">Candidate spot. Scout it first.</div></div></div>
    ${(p._sp || []).length ? `<div class="hmm-chiprow static">${p._sp.map((s) => `<span class="hmm-chip on">${esc(cap(s))}</span>`).join('')}</div>` : ''}
    <div class="hmm-stats">
      ${p._score != null ? `<div><small>Score</small><b>${esc(fmtNum(p._score, Number.isInteger(p._score) ? 0 : 1))}${max ? ` of ${esc(max)}` : ''}</b><em>my pick</em></div>` : ''}
      ${busy ? `<div><small>Hunters</small><b>${esc(cap(String(busy)))}</b><em>estimate</em></div>` : ''}
      ${months.length ? `<div><small>Months</small><b>${esc(monthsText(months))}</b></div>` : ''}
    </div>
    ${H.ui.linksHtml(lat, lng, p._name, park)}
    <p class="hmm-coord">${esc(units.coord(lng, lat))}${park ? `<br><span class="hmm-muted">Park at ${esc(units.coord(park[1], park[0]))}, ${esc(units.dist(haversine([lng, lat], [park[1], park[0]])))} away</span>` : ''}</p>
    ${plan.length ? `<h3 class="hmm-h">Plan</h3><ol class="hmm-plan">${plan.map(([t, x]) => `<li><b>${esc(t)}</b>${linesHtml(x)}</li>`).join('')}</ol>` : ''}
    ${hasLegalWords ? '<h3 class="hmm-h">Legal</h3><div class="hmm-banner">Study aid only. The official regulations are the law.</div>' : ''}
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
