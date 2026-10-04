/* Hunt Map styles: one MapLibre style holds Topo, Satellite and Hybrid; modes switch layer visibility.
   Topo palette follows the onX look: sage land, pale forest tint, brown contours with labels, white roads, blue water. */

export const OFM_TILEJSON = 'https://tiles.openfreemap.org/planet';
export const OFM_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
export const FONTS = ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic'];
export const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const DEM_MAXZOOM = 12;
export const ANCHORS = { fills: 'hm-anchor-fills', lines: 'hm-anchor-lines', symbols: 'hm-anchor-symbols' };

const R = ['Noto Sans Regular'], B = ['Noto Sans Bold'], I = ['Noto Sans Italic'];
const P = {
  land: '#d4d9c3', open: '#e2e4d4', farm: '#e4e3d2', town: '#dddcd2', ice: '#f4f6f5', rock: '#d8d5c9', sand: '#e7e1c9', wetland: '#c9d8cc',
  water: '#a6bfcc', waterLine: '#84a7b9', waterText: '#47708a',
  contour: '#857f62', contourIdx: '#756e50', contourText: '#625c43',
  road: '#ffffff', casing: '#a3a596', major: '#f7e7b4', majorCase: '#bfa66e', motor: '#f2cf86', motorCase: '#b98b3e',
  path: '#6b6656', rail: '#9a988e', text: '#26281f', halo: '#f3f4ec', park: '#6f9256',
};
const z = (stops) => ['interpolate', ['exponential', 1.5], ['zoom'], ...stops.flat()];
const cls = (...c) => ['match', ['get', 'class'], c, true, false];
const notTunnel = ['!=', ['get', 'brunnel'], 'tunnel'];
const name = ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']];
const meta = (modes) => ({ 'hm:modes': modes });

/** Contour tile URL for the chosen unit system. Metres: 20 m lines, 100 m index. Feet: 40 ft lines, 200 ft index. */
export function contourTiles(dem, system) {
  const imperial = system === 'imperial';
  return [dem.contourProtocolUrl({
    multiplier: imperial ? 3.28084 : 1,
    thresholds: imperial
      ? { 9: [500, 2500], 10: [200, 1000], 11: [100, 500], 12: [40, 200], 14: [20, 100] }
      : { 9: [200, 1000], 10: [100, 500], 11: [50, 250], 12: [20, 100], 14: [10, 50] },
    elevationKey: 'ele', levelKey: 'level', contourLayer: 'contours', buffer: 1,
  })];
}

export function buildStyle({ dem, prefs }) {
  const sys = prefs.units === 'imperial' ? 'imperial' : 'metric';
  const L = [];
  const add = (modes, l) => { l.metadata = meta(modes); L.push(l); };
  const T = ['topo'], S = ['satellite', 'hybrid'], H = ['hybrid'], ALL = ['topo', 'satellite', 'hybrid'];

  // ---------- land ----------
  add(T, { id: 'land', type: 'background', paint: { 'background-color': P.land } });
  add(T, { id: 'lc-open', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: cls('grass', 'farmland'), paint: { 'fill-color': ['match', ['get', 'class'], 'farmland', P.farm, P.open], 'fill-opacity': z([[6, 0.5], [12, 0.85]]) } });
  add(T, { id: 'lc-wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: cls('wood'), paint: { 'fill-color': '#c7d1b5', 'fill-opacity': z([[6, 0.3], [12, 0.45]]) } });
  add(T, { id: 'lc-wetland', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: cls('wetland'), paint: { 'fill-color': P.wetland, 'fill-opacity': 0.7 } });
  add(T, { id: 'lc-ice', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: cls('ice'), paint: { 'fill-color': P.ice, 'fill-opacity': 0.9 } });
  add(T, { id: 'lc-rock', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: cls('rock', 'sand'), paint: { 'fill-color': ['match', ['get', 'class'], 'sand', P.sand, P.rock], 'fill-opacity': 0.6 } });
  add(T, { id: 'lu-town', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: cls('residential', 'suburb', 'neighbourhood', 'commercial', 'industrial', 'retail'), paint: { 'fill-color': P.town, 'fill-opacity': z([[8, 0.5], [13, 0.8]]) } });

  // ---------- relief ----------
  add(T, { id: 'hillshade', type: 'hillshade', source: 'dem-hill', layout: { visibility: prefs.hillshade === false ? 'none' : 'visible' }, paint: {
    'hillshade-method': 'standard', 'hillshade-exaggeration': ['interpolate', ['linear'], ['zoom'], 6, 0.55, 12, 0.42, 16, 0.3],
    'hillshade-shadow-color': '#4e5843', 'hillshade-highlight-color': 'rgba(255,255,255,0.45)', 'hillshade-accent-color': '#6d725c', 'hillshade-illumination-direction': 315,
  } });

  // ---------- water ----------
  add(T, { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', filter: notTunnel, paint: { 'fill-color': P.water, 'fill-outline-color': '#8fb0c1' } });
  add(T, { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', filter: notTunnel, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
    'line-color': P.waterLine,
    'line-width': ['interpolate', ['exponential', 1.5], ['zoom'],
      8, ['match', ['get', 'class'], 'river', 1, 0.3], 12, ['match', ['get', 'class'], 'river', 2, 'canal', 1.4, 0.9],
      14, ['match', ['get', 'class'], 'river', 3.2, 'canal', 2, 1.5], 16, ['match', ['get', 'class'], 'river', 5, 'canal', 3, 2.4]],
    'line-dasharray': ['case', ['==', ['get', 'intermittent'], 1], ['literal', [3, 2]], ['literal', [1, 0]]],
  } });

  // ---------- satellite ----------
  add(S, { id: 'sat', type: 'raster', source: 'esri', paint: { 'raster-fade-duration': 150 } });

  // ---------- contours ----------
  const cModes = ALL; // shown on satellite and hybrid only when prefs.satContours is not false
  add(cModes, { id: 'contour-minor', type: 'line', source: 'contours', 'source-layer': 'contours', filter: ['==', ['get', 'level'], 0], minzoom: 9, paint: { 'line-color': P.contour, 'line-opacity': z([[9, 0.3], [12, 0.55], [15, 0.62]]), 'line-width': z([[9, 0.45], [14, 0.8], [17, 1.1]]) } });
  add(cModes, { id: 'contour-index', type: 'line', source: 'contours', 'source-layer': 'contours', filter: ['>', ['get', 'level'], 0], minzoom: 9, paint: { 'line-color': P.contourIdx, 'line-opacity': z([[9, 0.45], [12, 0.72], [15, 0.8]]), 'line-width': z([[9, 0.75], [14, 1.3], [17, 1.7]]) } });

  // ---------- boundaries and parks ----------
  add(T, { id: 'park-line', type: 'line', source: 'omt', 'source-layer': 'park', minzoom: 8, paint: { 'line-color': P.park, 'line-opacity': 0.55, 'line-width': z([[8, 0.6], [14, 1.6]]), 'line-dasharray': [3, 2] } });
  add(ALL, { id: 'admin-prov', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['>=', ['to-number', ['get', 'admin_level'], 0], 3], ['<=', ['to-number', ['get', 'admin_level'], 0], 4], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': '#8c8a80', 'line-width': z([[4, 0.6], [10, 1.4]]), 'line-dasharray': [4, 2, 1, 2] } });
  add(ALL, { id: 'admin-country', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['==', ['to-number', ['get', 'admin_level'], 0], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': '#86ad72', 'line-width': z([[3, 1], [10, 2.5]]), 'line-opacity': 0.85 } });
  add(T, { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 13, paint: { 'fill-color': '#cbc8bd', 'fill-outline-color': '#b7b3a6' } });

  L.push({ id: ANCHORS.fills, type: 'background', layout: { visibility: 'none' }, paint: {} });

  // ---------- roads (topo) ----------
  const isLine = ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false];
  const roadW = {
    motor: [[5, 0.8], [10, 2.2], [14, 5], [18, 14]], major: [[6, 0.6], [10, 1.8], [14, 4.2], [18, 12]], mid: [[8, 0.5], [11, 1.2], [14, 3.2], [18, 10]],
    minor: [[11, 0.6], [14, 2.4], [18, 8]], track: [[11, 0.5], [14, 1.6], [18, 4]],
  };
  const road = (id, filter, color, caseColor, w, minzoom) => {
    add(T, { id: id + '-case', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom, filter: ['all', isLine, filter], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': caseColor, 'line-width': z(w.map(([k, v]) => [k, v + (k < 11 ? 0.8 : 1.6)])) } });
    L.push({ id, type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom, filter: ['all', isLine, filter], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': z(w) }, metadata: meta(T) });
  };
  // paths go under roads so road casings stay clean
  add(T, { id: 'path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['all', isLine, cls('path')], layout: { 'line-join': 'round' }, paint: { 'line-color': P.path, 'line-opacity': 0.85, 'line-width': z([[12, 0.8], [16, 1.8]]), 'line-dasharray': [3, 2] } });
  add(T, { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 9, filter: ['all', isLine, cls('rail', 'transit')], paint: { 'line-color': P.rail, 'line-width': z([[9, 0.8], [16, 2]]), 'line-dasharray': [5, 3] } });
  road('road-track', cls('track'), P.road, '#9c9e8f', roadW.track, 11);
  road('road-minor', cls('minor', 'service', 'unclassified', 'residential'), P.road, P.casing, roadW.minor, 11);
  road('road-mid', cls('secondary', 'tertiary'), P.road, P.casing, roadW.mid, 8);
  road('road-major', cls('primary', 'trunk'), P.major, P.majorCase, roadW.major, 5);
  road('road-motor', cls('motorway'), P.motor, P.motorCase, roadW.motor, 5);

  // ---------- roads (hybrid) ----------
  add(H, { id: 'hy-road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: ['all', isLine, cls('minor', 'service', 'track')], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-opacity': 0.55, 'line-width': z([[11, 0.6], [14, 1.6], [18, 5]]) } });
  add(H, { id: 'hy-path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['all', isLine, cls('path')], paint: { 'line-color': '#ffffff', 'line-opacity': 0.7, 'line-width': z([[12, 0.8], [16, 1.6]]), 'line-dasharray': [3, 2] } });
  add(H, { id: 'hy-road-major', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 5, filter: ['all', isLine, cls('motorway', 'trunk', 'primary', 'secondary', 'tertiary')], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#f6e3a1', 'line-opacity': 0.8, 'line-width': z([[5, 0.6], [10, 1.4], [14, 3], [18, 9]]) } });

  L.push({ id: ANCHORS.lines, type: 'background', layout: { visibility: 'none' }, paint: {} });

  // ---------- contour labels ----------
  const unit = sys === 'imperial' ? 'ft' : ' m';
  add(cModes, { id: 'contour-label', type: 'symbol', source: 'contours', 'source-layer': 'contours', filter: ['>', ['get', 'level'], 0], minzoom: 11, layout: {
    'symbol-placement': 'line', 'text-field': ['concat', ['number-format', ['get', 'ele'], { locale: 'en-CA' }], unit], 'text-font': I,
    'text-size': z([[11, 10], [15, 12]]), 'symbol-spacing': 260, 'text-max-angle': 25, 'text-padding': 2, 'text-pitch-alignment': 'viewport',
  }, paint: { 'text-color': P.contourText, 'text-halo-color': 'rgba(222,226,206,0.85)', 'text-halo-width': 1.4 } });

  // ---------- labels (topo and hybrid variants) ----------
  labels(add, 'tp', T, { text: P.text, halo: P.halo, water: P.waterText, waterHalo: 'rgba(225,233,236,0.9)', road: '#3a3c34', peak: '#4b4737' });
  labels(add, 'hy', H, { text: '#ffffff', halo: 'rgba(0,0,0,0.75)', water: '#d6ecff', waterHalo: 'rgba(0,30,50,0.7)', road: '#ffffff', peak: '#ffffff' });

  L.push({ id: ANCHORS.symbols, type: 'background', layout: { visibility: 'none' }, paint: {} });

  // ---------- set mode visibility ----------
  const mode = prefs.base || 'topo';
  for (const l of L) {
    const modes = l.metadata && l.metadata['hm:modes'];
    if (!modes) continue;
    l.layout = l.layout || {};
    const hidden = (l.id === 'hillshade' && prefs.hillshade === false) || (l.id.startsWith('contour') && mode !== 'topo' && prefs.satContours === false);
    l.layout.visibility = modes.includes(mode) && !hidden ? 'visible' : 'none';
  }
  return {
    version: 8, name: 'Hunt Map', glyphs: OFM_GLYPHS,
    sources: {
      omt: { type: 'vector', url: OFM_TILEJSON },
      'dem-hill': { type: 'raster-dem', tiles: [dem.sharedDemProtocolUrl], encoding: 'terrarium', tileSize: 256, maxzoom: DEM_MAXZOOM, attribution: '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles</a> (Mapzen, AWS Open Data)' },
      'dem-terrain': { type: 'raster-dem', tiles: [dem.sharedDemProtocolUrl], encoding: 'terrarium', tileSize: 256, maxzoom: DEM_MAXZOOM },
      contours: { type: 'vector', tiles: contourTiles(dem, sys), minzoom: 9, maxzoom: 15 },
      esri: { type: 'raster', tiles: [ESRI], tileSize: 256, maxzoom: 18, attribution: 'Imagery: Esri, Maxar, Earthstar Geographics and the GIS User Community' },
    },
    sky: { 'sky-color': '#9cc3e4', 'horizon-color': '#e6edf0', 'fog-color': '#dfe3d6', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.85, 'atmosphere-blend': 0 },
    layers: L,
  };
}

function labels(add, p, modes, c) {
  const isLine = ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false];
  const isPoint = ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false];
  add(modes, { id: `${p}-waterway-name`, type: 'symbol', source: 'omt', 'source-layer': 'waterway', minzoom: 12, filter: ['all', isLine, ['has', 'name']], layout: {
    'symbol-placement': 'line', 'text-field': name, 'text-font': I, 'text-size': z([[12, 11], [16, 13]]), 'symbol-spacing': 400, 'text-max-angle': 30, 'text-letter-spacing': 0.04,
  }, paint: { 'text-color': c.water, 'text-halo-color': c.waterHalo, 'text-halo-width': 1.3 } });
  add(modes, { id: `${p}-water-name`, type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 9, filter: ['all', isPoint, ['has', 'name']], layout: {
    'text-field': name, 'text-font': I, 'text-size': z([[9, 11], [14, 14]]), 'text-max-width': 7, 'text-letter-spacing': 0.04,
  }, paint: { 'text-color': c.water, 'text-halo-color': c.waterHalo, 'text-halo-width': 1.3 } });
  add(modes, { id: `${p}-water-name-line`, type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 9, filter: ['all', isLine, ['has', 'name']], layout: {
    'symbol-placement': 'line', 'text-field': name, 'text-font': I, 'text-size': z([[9, 11], [14, 14]]), 'text-letter-spacing': 0.04,
  }, paint: { 'text-color': c.water, 'text-halo-color': c.waterHalo, 'text-halo-width': 1.3 } });
  add(modes, { id: `${p}-road-name`, type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 11, filter: ['all', isLine, ['has', 'name'], ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk', 'minor', 'track', 'service', 'unclassified', 'residential'], true, false]], layout: {
    'symbol-placement': 'line', 'text-field': name, 'text-font': R, 'text-size': z([[11, 10.5], [16, 13]]), 'symbol-spacing': 350, 'text-max-angle': 30,
  }, paint: { 'text-color': c.road, 'text-halo-color': c.halo, 'text-halo-width': 1.6 } });
  add(modes, { id: `${p}-shield`, type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 7, filter: ['all', isLine, ['has', 'ref'], ['<=', ['get', 'ref_length'], 5], ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false]], layout: {
    'symbol-placement': 'line', 'symbol-spacing': 500, 'text-field': ['get', 'ref'], 'text-font': B, 'text-size': 10.5, 'text-rotation-alignment': 'viewport', 'icon-rotation-alignment': 'viewport',
    'icon-image': 'hm-shield', 'icon-text-fit': 'both', 'icon-text-fit-padding': [2, 4, 1, 4],
  }, paint: { 'text-color': '#2a2a2a' } });
  add(modes, { id: `${p}-park-name`, type: 'symbol', source: 'omt', 'source-layer': 'park', minzoom: 9, filter: ['all', isPoint, ['has', 'name']], layout: {
    'text-field': name, 'text-font': I, 'text-size': 11, 'text-max-width': 8, 'text-padding': 6,
  }, paint: { 'text-color': p === 'tp' ? '#4f6b3c' : '#e6f5d6', 'text-halo-color': c.halo, 'text-halo-width': 1.3 } });
  const ele = ['case', ['has', 'ele'], ['concat', ['number-format', ['get', 'ele'], { locale: 'en-CA' }], ' m'], ''];
  add(modes, { id: `${p}-peak`, type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 10, filter: ['all', ['has', 'name'], ['match', ['get', 'class'], ['peak', 'volcano'], true, false]], layout: {
    'icon-image': p === 'tp' ? 'hm-peak' : 'hm-peak-w', 'text-field': ['format', name, {}, '\n', {}, ['to-string', ele], { 'font-scale': 0.85 }],
    'text-font': R, 'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 0.5], 'text-max-width': 8, 'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'ele'], 0]],
  }, paint: { 'text-color': c.peak, 'text-halo-color': c.halo, 'text-halo-width': 1.4 } });
  const place = (id, classes, minzoom, size, font) => add(modes, { id: `${p}-${id}`, type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom, filter: ['match', ['get', 'class'], classes, true, false], layout: {
    'text-field': name, 'text-font': font, 'text-size': size, 'text-max-width': 8,
    'icon-image': ['step', ['zoom'], p === 'tp' ? 'hm-dot' : 'hm-dot-w', 13, ''],
    'text-anchor': ['step', ['zoom'], 'left', 13, 'center'], 'text-offset': ['step', ['zoom'], ['literal', [0.55, 0]], 13, ['literal', [0, 0]]],
    'text-padding': 3, 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
  }, paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 1.6 } });
  place('hamlet', ['hamlet', 'locality', 'isolated_dwelling'], 11, z([[11, 10.5], [15, 13]]), R);
  place('village', ['village', 'suburb'], 9, z([[9, 11], [14, 14]]), R);
  place('town', ['town'], 7, z([[7, 12], [13, 16]]), R);
  place('city', ['city'], 4, z([[4, 12], [12, 18]]), B);
  add(modes, { id: `${p}-state`, type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 7, filter: ['==', ['get', 'class'], 'state'], layout: {
    'text-field': name, 'text-font': B, 'text-size': 12, 'text-transform': 'uppercase', 'text-letter-spacing': 0.15,
  }, paint: { 'text-color': p === 'tp' ? '#6b6d60' : '#ffffff', 'text-halo-color': c.halo, 'text-halo-width': 1.2 } });
}

/** Switch base mode: topo, satellite or hybrid. */
export function applyMode(map, mode, prefs) {
  for (const l of map.getStyle().layers) {
    const modes = l.metadata && l.metadata['hm:modes'];
    if (!modes) continue;
    let on = modes.includes(mode);
    if (l.id === 'hillshade' && prefs.hillshade === false) on = false;
    if (l.id.startsWith('contour') && mode !== 'topo' && prefs.satContours === false) on = false;
    map.setLayoutProperty(l.id, 'visibility', on ? 'visible' : 'none');
  }
  const sat = mode !== 'topo';
  map.setPaintProperty('contour-minor', 'line-color', sat ? 'rgba(255,255,255,0.9)' : P.contour);
  map.setPaintProperty('contour-index', 'line-color', sat ? 'rgba(255,255,255,1)' : P.contourIdx);
  map.setPaintProperty('contour-label', 'text-color', sat ? '#ffffff' : P.contourText);
  map.setPaintProperty('contour-label', 'text-halo-color', sat ? 'rgba(0,0,0,0.6)' : 'rgba(222,226,206,0.85)');
}

/** Change contour units (metres or feet). */
export function setContourUnits(map, dem, system) {
  const src = map.getSource('contours');
  if (src && src.setTiles) src.setTiles(contourTiles(dem, system));
  map.setLayoutProperty('contour-label', 'text-field', ['concat', ['number-format', ['get', 'ele'], { locale: 'en-CA' }], system === 'imperial' ? 'ft' : ' m']);
}

// ---------- images drawn on a canvas (no sprite needed, works offline) ----------
const PR = 2;
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w * PR; c.height = h * PR; const x = c.getContext('2d'); x.scale(PR, PR); return [c, x]; }
function roundRect(x, l, t, w, h, r) {
  x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
}
const imageData = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height);

export const SPOT_CATS = {
  drive: { label: 'Drive to', color: '#2d6a9f' },
  atv: { label: 'ATV (all terrain vehicle)', color: '#a3620a' },
  walk: { label: 'Walk in', color: '#2f7d32' },
  backcountry: { label: 'Backcountry', color: '#6a3d9a' },
  camp: { label: 'Camp', color: '#c2410c' },
  other: { label: 'Spot', color: '#4a4a4a' },
};
const GLYPHS = {
  drive(x) {
    x.fill(new Path2D('M3 13.2 5.1 8.4Q5.7 7 7.3 7h9.4q1.6 0 2.2 1.4l2.1 4.8V17q0 1-1 1h-1v1.3q0 .7-.7.7h-1.6q-.7 0-.7-.7V18H8v1.3q0 .7-.7.7H5.7q-.7 0-.7-.7V18H4q-1 0-1-1Z'));
    x.save(); x.fillStyle = '#fff'; x.fill(new Path2D('M6.4 12.4h11.2L16.3 9H7.7Z')); x.beginPath(); x.arc(6.6, 15.2, 1.1, 0, 7); x.arc(17.4, 15.2, 1.1, 0, 7); x.fill(); x.restore();
  },
  atv(x) {
    x.fill(new Path2D('M3.5 12.5h7.2l2.2-3h3.4l3.8 3.2v1.8H3.5Z'));
    x.lineWidth = 1.7; x.lineCap = 'round'; x.beginPath(); x.moveTo(15.4, 9.6); x.lineTo(16.6, 6.4); x.moveTo(14.8, 6.4); x.lineTo(18.4, 6.4); x.stroke();
    x.beginPath(); x.arc(6.5, 16.6, 3.3, 0, 7); x.arc(17.5, 16.6, 3.3, 0, 7); x.fill();
    x.save(); x.fillStyle = '#fff'; x.beginPath(); x.arc(6.5, 16.6, 1.2, 0, 7); x.arc(17.5, 16.6, 1.2, 0, 7); x.fill(); x.restore();
  },
  walk(x) {
    x.beginPath(); x.arc(13.2, 4.3, 2.1, 0, 7); x.fill();
    x.lineWidth = 2.3; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(12.6, 7.6); x.lineTo(10.8, 13.2); x.lineTo(13.6, 16.4); x.lineTo(14.2, 21);
    x.moveTo(10.8, 13.2); x.lineTo(8.6, 21); x.moveTo(12.2, 9.2); x.lineTo(15.6, 11.6); x.moveTo(11.8, 9.4); x.lineTo(8.8, 12); x.stroke();
    x.lineWidth = 1.5; x.beginPath(); x.moveTo(17.2, 10.2); x.lineTo(18.4, 21); x.stroke();
  },
  backcountry(x) {
    x.fill(new Path2D('M1.8 19.5 9 6.8l4.1 7 2.6-3.6 6.5 9.3Z'));
    x.save(); x.fillStyle = '#fff'; x.fill(new Path2D('M9 6.8 11.3 10.7 9.9 10 8.7 11.3 7.3 10.5Z')); x.restore();
  },
  camp(x) {
    x.fill(new Path2D('M12 4.2 21.6 19.6H2.4Z'));
    x.save(); x.fillStyle = '#fff'; x.fill(new Path2D('M12 11.2 15.1 19.6H8.9Z')); x.restore();
    x.lineWidth = 1.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(12, 4.5); x.lineTo(10, 1.8); x.moveTo(12, 4.5); x.lineTo(14, 1.8); x.stroke();
  },
  other(x) { x.beginPath(); x.arc(12, 12, 6.5, 0, 7); x.fill(); x.save(); x.fillStyle = '#fff'; x.beginPath(); x.arc(12, 12, 2.6, 0, 7); x.fill(); x.restore(); },
};

/** Images used by the style and the spot layers. Returns { id: [ImageData, options] }. */
export function makeImage(id) {
  if (id === 'hm-dot' || id === 'hm-dot-w') {
    const [c, x] = canvas(12, 12); x.beginPath(); x.arc(6, 6, 3.6, 0, 7); x.fillStyle = id === 'hm-dot' ? '#ffffff' : 'rgba(0,0,0,0.35)'; x.fill();
    x.lineWidth = 1.6; x.strokeStyle = id === 'hm-dot' ? '#3a3c34' : '#ffffff'; x.stroke(); return [imageData(c), { pixelRatio: PR }];
  }
  if (id === 'hm-peak' || id === 'hm-peak-w') {
    const [c, x] = canvas(12, 10); x.beginPath(); x.moveTo(6, 1); x.lineTo(11, 9); x.lineTo(1, 9); x.closePath();
    x.fillStyle = id === 'hm-peak' ? '#5d5846' : '#ffffff'; x.fill(); if (id === 'hm-peak-w') { x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1; x.stroke(); } return [imageData(c), { pixelRatio: PR }];
  }
  if (id === 'hm-shield') {
    const [c, x] = canvas(20, 20); x.fillStyle = '#ffffff'; x.strokeStyle = '#3d3d3d'; x.lineWidth = 1.4;
    roundRect(x, 1.2, 1.2, 17.6, 17.6, 3.5); x.fill(); x.stroke();
    return [imageData(c), { pixelRatio: PR, stretchX: [[10, 30]], stretchY: [[10, 30]], content: [8, 6, 32, 34] }];
  }
  const m = id.match(/^spot-(\w+)$/);
  if (m) {
    const cat = SPOT_CATS[m[1]] || SPOT_CATS.other, g = GLYPHS[m[1]] || GLYPHS.other;
    const [c, x] = canvas(34, 34);
    x.beginPath(); x.arc(17, 17, 15, 0, 7); x.fillStyle = 'rgba(0,0,0,0.28)'; x.fill();
    x.beginPath(); x.arc(17, 16.2, 14.2, 0, 7); x.fillStyle = '#ffffff'; x.fill(); x.lineWidth = 2.6; x.strokeStyle = cat.color; x.stroke();
    x.save(); x.translate(7.4, 6.6); x.scale(0.8, 0.8); x.fillStyle = cat.color; x.strokeStyle = cat.color; g(x); x.restore();
    return [imageData(c), { pixelRatio: PR }];
  }
  return null;
}

/** Small SVG of a spot category glyph for HTML (cards, chips). */
export function spotIconSvg(cat, size = 26) {
  const c = document.createElement('canvas'); c.width = c.height = size * 2;
  const x = c.getContext('2d'); x.scale(size * 2 / 24, size * 2 / 24);
  const k = SPOT_CATS[cat] ? cat : 'other'; x.fillStyle = x.strokeStyle = SPOT_CATS[k].color; GLYPHS[k](x);
  return `<img alt="" src="${c.toDataURL()}" width="${size}" height="${size}">`;
}
