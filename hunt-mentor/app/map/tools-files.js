/* Hunt Map tools: read and write map files. GPX (GPS Exchange Format), KML (Keyhole Markup Language) and GeoJSON.
   onX exports GPX and KML. parse() returns items in the tools-store shape (without id). */
import { WPT_BY } from './tools-geo.js';

const xmlEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const kids = (el, name) => [...el.getElementsByTagName(name)];
const kid = (el, name) => { for (const c of el.children) if (c.localName === name) return c; return null; };
const txt = (el, name) => { const c = el && kid(el, name); return c ? c.textContent.trim() : ''; };
const num = (v) => (v == null || v === '' || isNaN(+v) ? null : +v);

// Map a symbol name from another app to our icon set.
const SYM = [[/park|car|truck|trailhead/i, 'parking'], [/camp|tent/i, 'camp'], [/stand|blind|tree ?stand/i, 'stand'], [/glass|lookout|view|binoc|optic/i, 'glassing'],
  [/bed/i, 'bed'], [/rub/i, 'rub'], [/scrape/i, 'scrape'], [/track/i, 'tracks'], [/scat|dropping|poop/i, 'scat'], [/water|spring|creek|lake|drink/i, 'water'],
  [/gate|fence/i, 'gate'], [/cam/i, 'camera'], [/kill|harvest|shot/i, 'kill'], [/blood/i, 'blood']];
export const symToIcon = (s) => { if (!s) return 'other'; if (WPT_BY[s]) return s; const m = SYM.find(([re]) => re.test(s)); return m ? m[1] : 'other'; };

function kmlColor(abgr) { // KML colours are aabbggrr
  const m = /^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(abgr || ''); return m ? `#${m[4]}${m[3]}${m[2]}`.toLowerCase() : '';
}
const okColor = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.toLowerCase() : '');

/** Parse a file's text. name helps pick the format. Returns { items, folderName, kind }. */
export function parse(text, name = '') {
  const t = String(text).replace(/^﻿/, '').trim();
  const base = name.replace(/\.[^.]+$/, '') || 'Imported';
  if (t.startsWith('{') || t.startsWith('[') || /\.(geo)?json$/i.test(name)) return { items: fromGeoJSON(JSON.parse(t)), folderName: base, kind: 'GeoJSON' };
  const doc = new DOMParser().parseFromString(t, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('That file is not valid GPX, KML or GeoJSON.');
  const root = doc.documentElement.localName;
  if (root === 'gpx') return { items: fromGPX(doc), folderName: base, kind: 'GPX' };
  if (root === 'kml' || doc.getElementsByTagName('Placemark').length) return { items: fromKML(doc), folderName: base, kind: 'KML' };
  throw new Error('That file is not GPX, KML or GeoJSON.');
}

function fromGPX(doc) {
  const out = [];
  for (const w of kids(doc, 'wpt')) {
    const lat = num(w.getAttribute('lat')), lon = num(w.getAttribute('lon')); if (lat == null || lon == null) continue;
    out.push({ kind: 'wpt', name: txt(w, 'name') || 'Waypoint', note: txt(w, 'desc') || txt(w, 'cmt'), icon: symToIcon(txt(w, 'sym') || txt(w, 'type') || txt(w, 'name')), coords: [lon, lat] });
  }
  const pts = (list) => list.map((p) => { const e = num(txt(p, 'ele')); const c = [num(p.getAttribute('lon')), num(p.getAttribute('lat'))]; if (e != null) c.push(e); return c; }).filter((c) => c[0] != null && c[1] != null);
  for (const r of kids(doc, 'rte')) { const cs = pts(kids(r, 'rtept')); if (cs.length > 1) out.push({ kind: 'line', name: txt(r, 'name') || 'Route', note: txt(r, 'desc'), coords: cs }); }
  for (const tr of kids(doc, 'trk')) {
    const segs = kids(tr, 'trkseg'), all = [], times = [];
    for (const s of segs) for (const p of kids(s, 'trkpt')) {
      const lat = num(p.getAttribute('lat')), lon = num(p.getAttribute('lon')); if (lat == null || lon == null) continue;
      const e = num(txt(p, 'ele')), tm = Date.parse(txt(p, 'time'));
      all.push(e != null ? [lon, lat, e] : [lon, lat]); times.push(isNaN(tm) ? null : tm);
    }
    if (all.length < 2) continue;
    const closed = all.length > 3 && all[0][0] === all[all.length - 1][0] && all[0][1] === all[all.length - 1][1] && /area|polygon|boundary/i.test(txt(tr, 'type') + txt(tr, 'name'));
    const it = { kind: closed ? 'area' : times.some((x) => x) ? 'track' : 'line', name: txt(tr, 'name') || 'Track', note: txt(tr, 'desc'), coords: closed ? all.slice(0, -1) : all };
    if (it.kind === 'track') it.times = times;
    out.push(it);
  }
  return out;
}

function kmlCoords(s) { return String(s || '').trim().split(/\s+/).map((p) => p.split(',').map(Number)).filter((c) => c.length >= 2 && isFinite(c[0]) && isFinite(c[1])).map((c) => (c.length > 2 && c[2] ? [c[0], c[1], c[2]] : [c[0], c[1]])); }
function fromKML(doc) {
  const styles = {};
  for (const s of kids(doc, 'Style')) {
    const id = s.getAttribute('id'); if (!id) continue;
    const ic = kid(s, 'IconStyle'), ls = kid(s, 'LineStyle'), ps = kid(s, 'PolyStyle');
    styles[id] = kmlColor(txt(ic, 'color') || txt(ls, 'color') || txt(ps, 'color'));
  }
  for (const m of kids(doc, 'StyleMap')) { const p = kids(m, 'Pair').find((x) => txt(x, 'key') === 'normal'); if (p) styles[m.getAttribute('id')] = styles[txt(p, 'styleUrl').replace(/^#/, '')] || ''; }
  const out = [];
  for (const pm of kids(doc, 'Placemark')) {
    const name = txt(pm, 'name'), note = (txt(pm, 'description') || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const color = styles[txt(pm, 'styleUrl').replace(/^#/, '')] || '';
    const add = (it) => out.push(Object.assign({ name, note }, color ? { color } : {}, it));
    for (const p of kids(pm, 'Point')) { const c = kmlCoords(txt(p, 'coordinates'))[0]; if (c) add({ kind: 'wpt', name: name || 'Waypoint', icon: symToIcon(name + ' ' + txt(pm, 'styleUrl')), coords: [c[0], c[1]] }); }
    for (const l of kids(pm, 'LineString')) { const cs = kmlCoords(txt(l, 'coordinates')); if (cs.length > 1) add({ kind: 'line', name: name || 'Line', coords: cs }); }
    for (const g of kids(pm, 'Polygon')) {
      const ob = kids(g, 'outerBoundaryIs')[0], lr = ob && kids(ob, 'LinearRing')[0];
      let cs = kmlCoords(lr ? txt(lr, 'coordinates') : ''); if (cs.length > 3 && cs[0][0] === cs[cs.length - 1][0] && cs[0][1] === cs[cs.length - 1][1]) cs = cs.slice(0, -1);
      if (cs.length > 2) add({ kind: 'area', name: name || 'Area', coords: cs });
    }
    for (const tr of [...kids(pm, 'gx:Track'), ...kids(pm, 'Track')]) {
      const cs = [...tr.children].filter((c) => c.localName === 'coord').map((c) => c.textContent.trim().split(/\s+/).map(Number)).filter((c) => c.length >= 2 && isFinite(c[0])).map((c) => (c[2] ? [c[0], c[1], c[2]] : [c[0], c[1]]));
      const times = [...tr.children].filter((c) => c.localName === 'when').map((c) => Date.parse(c.textContent.trim()) || null);
      if (cs.length > 1 && !out.some((o) => o._tr === tr)) add({ kind: 'track', name: name || 'Track', coords: cs, times: times.length === cs.length ? times : undefined });
    }
  }
  return out;
}

function fromGeoJSON(g) {
  const feats = g.type === 'FeatureCollection' ? g.features : g.type === 'Feature' ? [g] : Array.isArray(g) ? g : [{ type: 'Feature', properties: {}, geometry: g }];
  const out = [];
  for (const f of feats) {
    if (!f || !f.geometry) continue;
    const p = f.properties || {}, name = p.name || p.title || p.Name || '', note = p.note || p.desc || p.description || '';
    const color = okColor(p.color || p.stroke || p['marker-color']), base = Object.assign({ name, note }, color ? { color } : {});
    const g2 = f.geometry, C = g2.coordinates;
    const one = (type, c) => {
      if (type === 'Point') out.push(Object.assign({}, base, { kind: 'wpt', name: name || 'Waypoint', icon: symToIcon(p.icon || p.sym || p['marker-symbol'] || name), coords: [c[0], c[1]] }));
      else if (type === 'LineString' && c.length > 1) out.push(Object.assign({}, base, { kind: p.kind === 'track' ? 'track' : 'line', name: name || 'Line', coords: c.map((x) => x.slice(0, 3)) }, Array.isArray(p.times) ? { times: p.times } : {}));
      else if (type === 'Polygon' && c[0] && c[0].length > 3) out.push(Object.assign({}, base, { kind: 'area', name: name || 'Area', coords: c[0].slice(0, -1).map((x) => x.slice(0, 2)) }));
    };
    if (/^Multi/.test(g2.type)) C.forEach((c) => one(g2.type.slice(5), c));
    else if (g2.type === 'GeometryCollection') g2.geometries.forEach((x) => one(x.type, x.coordinates));
    else one(g2.type, C);
  }
  return out;
}

// ---------- write ----------
const iso = (t) => (t ? new Date(t).toISOString() : '');
export function toGPX(items) {
  const w = items.filter((i) => i.kind === 'wpt'), l = items.filter((i) => i.kind !== 'wpt');
  const pt = (tag, c, t) => `<${tag} lat="${c[1].toFixed(7)}" lon="${c[0].toFixed(7)}">${c[2] != null ? `<ele>${(+c[2]).toFixed(1)}</ele>` : ''}${t ? `<time>${iso(t)}</time>` : ''}</${tag}>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Hunt Mentor" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>Hunt Mentor export</name><time>${iso(Date.now())}</time></metadata>
${w.map((i) => `<wpt lat="${i.coords[1].toFixed(7)}" lon="${i.coords[0].toFixed(7)}"><name>${xmlEsc(i.name)}</name>${i.note ? `<desc>${xmlEsc(i.note)}</desc>` : ''}<sym>${xmlEsc((WPT_BY[i.icon] || WPT_BY.other).label)}</sym><type>${xmlEsc(i.icon || 'other')}</type></wpt>`).join('\n')}
${l.map((i) => {
    const cs = i.kind === 'area' ? [...i.coords, i.coords[0]] : i.coords;
    return `<trk><name>${xmlEsc(i.name)}</name>${i.note ? `<desc>${xmlEsc(i.note)}</desc>` : ''}<type>${i.kind === 'area' ? 'area' : i.kind}</type><trkseg>${cs.map((c, k) => pt('trkpt', c, i.times && i.times[k])).join('')}</trkseg></trk>`;
  }).join('\n')}
</gpx>
`;
}
const abgr = (hex) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '#e8590c') || [0, 'e8', '59', '0c']; return `ff${m[3]}${m[2]}${m[1]}`.toLowerCase(); };
export function toKML(items, folders = []) {
  const fname = (id) => (folders.find((f) => f.id === id) || {}).name || 'Hunt Mentor';
  const groups = {};
  for (const i of items) (groups[i.folder || ''] = groups[i.folder || ''] || []).push(i);
  const c3 = (c) => `${c[0].toFixed(7)},${c[1].toFixed(7)}${c[2] != null ? ',' + (+c[2]).toFixed(1) : ''}`;
  const pm = (i) => {
    const st = `<Style><IconStyle><color>${abgr(i.color)}</color></IconStyle><LineStyle><color>${abgr(i.color)}</color><width>3</width></LineStyle><PolyStyle><color>${abgr(i.color).replace(/^ff/, '55')}</color></PolyStyle></Style>`;
    const g = i.kind === 'wpt' ? `<Point><coordinates>${c3(i.coords)}</coordinates></Point>`
      : i.kind === 'area' ? `<Polygon><outerBoundaryIs><LinearRing><coordinates>${[...i.coords, i.coords[0]].map(c3).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon>`
        : `<LineString><tessellate>1</tessellate><coordinates>${i.coords.map(c3).join(' ')}</coordinates></LineString>`;
    return `<Placemark><name>${xmlEsc(i.name)}</name>${i.note ? `<description>${xmlEsc(i.note)}</description>` : ''}${st}${g}</Placemark>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Hunt Mentor export</name>
${Object.entries(groups).map(([f, list]) => `<Folder><name>${xmlEsc(f ? fname(f) : 'Hunt Mentor')}</name>\n${list.map(pm).join('\n')}\n</Folder>`).join('\n')}
</Document></kml>
`;
}
export function toGeoJSON(items, folders = []) {
  const fname = (id) => (folders.find((f) => f.id === id) || {}).name || '';
  return JSON.stringify({
    type: 'FeatureCollection',
    features: items.map((i) => ({
      type: 'Feature',
      properties: Object.assign({ name: i.name, note: i.note || '', kind: i.kind, color: i.color || '', folder: fname(i.folder) }, i.kind === 'wpt' ? { icon: i.icon } : {}, i.times ? { times: i.times } : {}),
      geometry: i.kind === 'wpt' ? { type: 'Point', coordinates: i.coords } : i.kind === 'area' ? { type: 'Polygon', coordinates: [[...i.coords, i.coords[0]]] } : { type: 'LineString', coordinates: i.coords },
    })),
  }, null, 1);
}
