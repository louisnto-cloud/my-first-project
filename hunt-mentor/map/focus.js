/* Hunt Map focus: #/map/mu/3-27, #/map/region/3, #/map/place/<id> (from the "Open on Hunt Map" button in app/places.js).
   Fits the view, draws the MU or region outline (exact line from data/layers/bc/mu when it loads, else the small
   outline from data/places/mu.json, so it also works offline), and drops a pin for a place. Called by core.js open(). */
const SRC = 'hm-focus';
const IDS = ['hm-focus-fill', 'hm-focus-case', 'hm-focus-line'];
let marker = null, last = null;

function clear(map) {
  if (marker) { marker.remove(); marker = null; }
  for (const id of IDS) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(SRC)) map.removeSource(SRC);
}

const timeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
async function exactMu(regionId) {
  const r = await timeout(fetch(`data/layers/bc/mu/region_${String(regionId).toLowerCase()}.geojson`), 3000);
  if (!r.ok) throw new Error('mu file ' + r.status);
  const fc = await r.json();
  if (!fc.features || !fc.features.length) throw new Error('empty');
  return fc;
}
const ringFeature = (rings, props) => ({ type: 'Feature', properties: props, geometry: { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) } });

function draw(H, fc, opts) {
  const map = H.map;
  clear(map);
  map.addSource(SRC, { type: 'geojson', data: fc });
  const before = H.anchors && H.anchors.symbols && map.getLayer(H.anchors.symbols) ? H.anchors.symbols : undefined;
  map.addLayer({ id: IDS[0], type: 'fill', source: SRC, filter: ['==', ['get', 'hm'], 'focus'], paint: { 'fill-color': '#e8590c', 'fill-opacity': opts.place ? 0.05 : 0.12 } }, before);
  map.addLayer({ id: IDS[1], type: 'line', source: SRC, filter: ['==', ['get', 'hm'], 'focus'], paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.85 } }, before);
  const paint = { 'line-color': ['case', ['==', ['get', 'hm'], 'focus'], '#e8590c', '#6b3fa0'], 'line-width': ['case', ['==', ['get', 'hm'], 'focus'], opts.place ? 3 : 4, 1.5] };
  if (opts.place) paint['line-dasharray'] = [2, 1.5];
  map.addLayer({ id: IDS[2], type: 'line', source: SRC, paint }, before);
}

function pin(H, lng, lat, name) {
  const el = document.createElement('div');
  el.setAttribute('aria-label', name);
  el.innerHTML = '<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43C14 34 2 27 2 16a15 15 0 0 1 30 0c0 11-12 18-15 27Z" fill="#e8590c" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>';
  marker = new H.maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(H.map);
}

export default async function focus(H, param) {
  const [kind, id] = String(param).split('/');
  const P = window.HMPlaces;
  if (!P) return;
  const D = await P.load();
  const map = H.map;
  last = param;
  const pad = { top: 130, bottom: 190, left: 30, right: 30 };
  if (kind === 'mu' || kind === 'place') {
    const p = kind === 'place' ? D.placeById[id] : null;
    const m = D.muById[p ? p.mu : id];
    if (!m) { H.toast('That place is not in the map data.'); return; }
    const reg = D.regById[m.r];
    if (p) map.jumpTo({ center: [p.lon, p.lat], zoom: 11 });
    else map.fitBounds([[m.b[0], m.b[1]], [m.b[2], m.b[3]]], { padding: pad, duration: 0, maxZoom: 13 });
    const simple = { type: 'FeatureCollection', features: [ringFeature(P.outline('mu', m.id), { hm: 'focus', MU: m.id })] };
    draw(H, simple, { place: !!p });
    if (p) pin(H, p.lon, p.lat, p.name);
    H.toast(p ? `${p.name}, MU ${m.id}, Region ${reg.id} ${reg.name}` : `MU ${m.id}, Region ${reg.id} ${reg.name}. Orange line: the unit.`, 5000);
    // the exact line (and the units next to it) when the layer file loads; the small outline stays when it cannot
    try {
      const fc = await exactMu(m.r);
      if (last !== param) return;
      const near = new Set([m.id, ...m.nb]);
      const feats = fc.features.filter((f) => near.has(f.properties.MU)).map((f) => ({ ...f, properties: { ...f.properties, hm: f.properties.MU === m.id ? 'focus' : 'next' } }));
      if (feats.length) map.getSource(SRC) && map.getSource(SRC).setData({ type: 'FeatureCollection', features: feats });
    } catch (err) { /* offline and not saved: the small outline is already drawn */ }
  } else if (kind === 'region') {
    const r = D.regById[id];
    if (!r) return;
    map.fitBounds([[r.b[0], r.b[1]], [r.b[2], r.b[3]]], { padding: pad, duration: 0 });
    const feats = [ringFeature(P.outline('region', r.id), { hm: 'focus' })];
    for (const m of D.mu.mus) if (m.r === r.id) feats.push(ringFeature(P.outline('mu', m.id), { hm: 'next', MU: m.id }));
    draw(H, { type: 'FeatureCollection', features: feats }, {});
    H.toast(`Region ${r.id} ${r.name}: ${r.mus} MUs (Management Units).`, 5000);
  }
}
