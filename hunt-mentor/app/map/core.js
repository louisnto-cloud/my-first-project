/* Hunt Map core: an onX style map inside Hunt Mentor.
   Loaded on demand by app.js when the route #/map (or #/map/@lat,lon,zoom) opens.

   API for other modules and the next agent: window.HuntMap (also exported as default)
     map                 the maplibregl.Map (null until the map opens the first time)
     maplibregl          the MapLibre GL JS module namespace
     ready               Promise, resolves with the map once the style has loaded
     addButton(opts)     round map button. opts: { id, icon (svg string), label, where: 'right' | 'left', onClick }. Returns the element.
     openSheet(opts)     bottom sheet. opts: { title, html (string or Node), onClose, modal (default true), tall, bar (bottom bar key to highlight) }. Returns the body element.
     closeSheet()        closes the open sheet (runs its onClose)
     toast(msg, ms)      short message at the top of the map
     units               { system: 'metric' | 'imperial', coords: 'dd' | 'dms' | 'utm', dist(m), elev(m), area(m2), coord(lng, lat, fmt?) }
     getLayerData(id, { all })  Promise of the GeoJSON FeatureCollection for a manifest layer (loads areas near the view, or every area with all: true)
     elevationAt(lngLat) Promise of metres above sea level from the terrain tiles (works offline for downloaded areas)
     anchors             { fills, lines, symbols }: layer ids to insert your layers before (keeps roads and labels in the right order)
     icons               inline SVG strings (see icons.js)
     prefs, savePrefs()  map preferences in localStorage key hm.map.v1 (included in the app backup)
     on(event, fn)       events: 'open', 'close', 'base' (mode), '3d' (on), 'units', 'layers', 'click' is separate (see onClick)
     onClick(fn)         map tap interceptor for tools: fn(e) returning true stops the default (spot card, feature card)
     setBarAction(key, fn)  replace a bottom bar action: 'offline', 'content', 'tools', 'insights', 'track'; also 'weather', 'profile'
     setBase(mode), set3d(on), flyTo(lng, lat, zoom)
     afterFirstIdle      Promise, resolves once the first view has drawn and the browser is idle (plugins, layer data and contours wait for it)
     setExaggeration(x)  3D height boost (1 to 2.5)
   Phase 2 modules: add their paths to PLUGINS below; each default export is called with HuntMap after the map is ready. */

import * as maplibregl from '../vendor/maplibre-gl.mjs';
import '../vendor/mlcontour.min.js';
import { prefs, savePrefs, loadPrefs, units, esc, hub, debounce, fmtNum, lon2x, lat2y, clamp, formatCoord } from './util.js';
import { buildStyle, applyMode, setContourUnits, makeImage, ANCHORS, TERRARIUM, DEM_MAXZOOM, DECLUTTER_PITCH } from './style.js';
import { ICONS } from './icons.js';
import * as geo from './location.js';
import * as search from './search.js';
import * as layers from './layers.js';
import * as offline from './offline.js';

const PLUGINS = ['./tools-main.js', './tools-track.js', './tools-wind.js', './tools-insights.js']; // for example './tools.js', './track.js'
const DEFAULT_VIEW = { lng: -120.2687, lat: 50.8581, zoom: 12, bearing: 0, pitch: 0 }; // Heffley Creek base (SPOTS.md)
const EXAG = 1.5; // default 3D height boost
const exag = () => clamp(+prefs.exag || EXAG, 1, 2.5);
// first view drawn, then wait for the browser to be idle: everything not needed for the first view loads after this
let resolveIdle;
const afterFirstIdle = new Promise((r) => { resolveIdle = r; });
const whenIdle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 120));

const mlcontour = globalThis.mlcontour;
mlcontour.workerUrl = new URL('../vendor/mlcontour-worker.js', import.meta.url).href; // same origin, so the service worker can answer offline
const dem = new mlcontour.DemSource({ url: TERRARIUM, encoding: 'terrarium', maxzoom: DEM_MAXZOOM, worker: true, cacheSize: 160, timeoutMs: 15000 });
dem.setupMaplibre(maplibregl);

const ev = hub();
let resolveReady;
const clickHandlers = [];
const barActions = {};
const HuntMap = {
  map: null, maplibregl, dem, units, prefs, savePrefs, anchors: ANCHORS, icons: ICONS, isOpen: false,
  ready: new Promise((r) => { resolveReady = r; }),
  addButton, openSheet, closeSheet, toast, elevationAt, setBase, set3d, flyTo, afterFirstIdle, setExaggeration,
  getLayerData: (id, opts) => layers.getLayerData(id, opts),
  on: ev.on, emit: ev.emit,
  onClick(fn) { clickHandlers.push(fn); return () => { const i = clickHandlers.indexOf(fn); if (i >= 0) clickHandlers.splice(i, 1); }; },
  setBarAction(key, fn) { barActions[key] = fn; },
};
window.HuntMap = HuntMap;
export default HuntMap;

let root, map, els = {};

// ---------- open and close (called by app.js) ----------
let initP = null, wanted = false;
export async function open(param) {
  const v = parseParam(param);
  const first = !initP;
  wanted = true;
  if (first) initP = init(v);
  await initP;
  if (!wanted) { root.hidden = true; return HuntMap; } // left the map while it was loading
  const wasHidden = root.hidden;
  root.hidden = false;
  HuntMap.isOpen = true;
  if (!first) {
    if (wasHidden) { map.resize(); geo.resume(); }
    if (v) map.jumpTo({ center: [v.lng, v.lat], zoom: v.zoom ?? map.getZoom() });
  }
  ev.emit('open');
  return HuntMap;
}
export function close() {
  wanted = false;
  if (!root) return;
  closeSheet(); search.close(); offline.cancelFrame();
  root.hidden = true; HuntMap.isOpen = false;
  geo.pause();
  ev.emit('close');
}

function parseParam(param) {
  const m = String(param || '').match(/^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?)z?)?/);
  if (!m) return null;
  const lat = +m[1], lng = +m[2];
  if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return null;
  return { lat, lng, zoom: m[3] != null ? clamp(+m[3], 2, 18.5) : undefined };
}

async function init(v) {
  loadPrefs();
  if (prefs.exagV !== 2) { if (!prefs.exag || prefs.exag === 1.3) prefs.exag = EXAG; prefs.exagV = 2; savePrefs(); } // old default 1.3 becomes 1.5
  await loadCss();
  buildChrome();
  const start = Object.assign({}, DEFAULT_VIEW, prefs.view || {}, v || {});
  if (v && v.zoom == null) start.zoom = Math.max(prefs.view?.zoom || 12, 12);
  createMap(start);
  geo.init(HuntMap); search.init(HuntMap); offline.init(HuntMap);
  // layer data (manifest, saved layers, spots) waits for the first view: same API, only 'ready' is later
  layers.init(Object.create(HuntMap, { ready: { value: afterFirstIdle } }));
  afterFirstIdle.then(async () => {
    // plugins load one at a time, each in its own idle slot, so a pan right after opening stays smooth
    for (const p of PLUGINS) {
      await new Promise((r) => whenIdle(r));
      try { const m = await import(p); if (m.default) m.default(HuntMap); } catch (err) { console.warn('Hunt Map plugin failed', p, err); }
    }
  });
}

function loadCss() {
  const hrefs = [new URL('../vendor/maplibre-gl.css', import.meta.url).href, new URL('./map.css', import.meta.url).href];
  return Promise.all(hrefs.map((href) => new Promise((res) => {
    if ([...document.styleSheets].some((s) => s.href === href)) return res();
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
    l.onload = l.onerror = () => res(); document.head.appendChild(l); setTimeout(res, 5000);
  })));
}

// ---------- chrome ----------
const BAR = [
  ['offline', 'offline', 'Offline Maps'], ['content', 'content', 'My Content'], ['tools', 'tools', 'Tools'],
  ['insights', 'insights', 'Insights'], ['track', 'track', 'Go & Track'],
];
const BASES = { topo: 'Topo', satellite: 'Satellite', hybrid: 'Hybrid' };
const sv = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I3D = {
  tiltUp: sv('<path d="M3 20h17M3 20 12.5 7"/><path d="M8.5 20a6 6 0 0 0-1.4-4"/><path d="M17 3.5v6M14 6.5h6"/>'),
  tiltDown: sv('<path d="M3 20h17M3 20l15-5.5"/><path d="M9 20a6 6 0 0 0-.4-2.4"/><path d="M14 6.5h6"/>'),
  rotL: sv('<path d="M8 4H3.5v4.5"/><path d="M3.8 8.2A8.5 8.5 0 1 1 5 17"/>'),
  rotR: sv('<path d="M16 4h4.5v4.5"/><path d="M20.2 8.2A8.5 8.5 0 1 0 19 17"/>'),
};

function buildChrome() {
  root = document.createElement('div');
  root.className = 'hmm'; root.id = 'hm-map';
  root.innerHTML = `
    <div class="hmm-canvas" id="hmm-canvas"></div>
    <div class="hmm-fade" aria-hidden="true"></div>
    <div class="hmm-cross" aria-hidden="true"></div>
    <div class="hmm-top">
      <div class="hmm-row">
        <button class="hmm-btn" data-act="menu" aria-label="Menu">${ICONS.menu}</button>
        <button class="hmm-btn" data-act="profile" aria-label="Elevation profile">${ICONS.profile}</button>
        <div class="hmm-title" aria-hidden="true"><span>HUNT</span><i>${ICONS.target}</i><span>MAP</span></div>
        <button class="hmm-btn" data-act="search" aria-label="Search the map">${ICONS.search}</button>
      </div>
      <div class="hmm-readout">
        <div class="hmm-scale"><span class="hmm-scale-t"></span><i class="hmm-scale-bar"></i></div>
        <button class="hmm-elev" data-act="centre" aria-label="Map centre details"></button>
      </div>
    </div>
    <div class="hmm-stack hmm-stack-l" id="hmm-stack-l"></div>
    <div class="hmm-3d" role="group" aria-label="3D view controls" hidden>
      <button class="hmm-btn hmm-3d-n" data-act="reset3d" aria-label="North up and flat (back to 2D)"><span class="hmm-north-i">${ICONS.compass}</span></button>
      <button class="hmm-btn" data-act="tiltup" aria-label="Tilt more">${I3D.tiltUp}</button>
      <button class="hmm-btn" data-act="tiltdown" aria-label="Tilt less">${I3D.tiltDown}</button>
      <button class="hmm-btn" data-act="rotl" aria-label="Rotate left">${I3D.rotL}</button>
      <button class="hmm-btn" data-act="rotr" aria-label="Rotate right">${I3D.rotR}</button>
    </div>
    <div class="hmm-stack hmm-stack-r" id="hmm-stack-r">
      <button class="hmm-btn" data-act="weather" aria-label="Weather and wind">${ICONS.weather}</button>
      <button class="hmm-btn hmm-north" data-act="north" aria-label="Point the map north" hidden><span class="hmm-north-i">${ICONS.compass}</span></button>
    </div>
    <div class="hmm-lowr">
      <div class="hmm-pill" role="group" aria-label="Basemap and 3D">
        <button data-act="base" class="hmm-pill-base" aria-label="Choose basemap"></button>
        <button data-act="3d" class="hmm-pill-3d" aria-label="3D view" aria-pressed="false">3D</button>
      </div>
      <button class="hmm-btn hmm-locate" data-act="locate" aria-label="Show my location">${ICONS.locate}</button>
    </div>
    <button class="hmm-layers" data-act="layers" aria-label="Hunt Map Layers">
      <span class="hmm-layers-ic">${ICONS.layers}</span><span class="hmm-layers-t"><small>Hunt Map</small><b>Layers</b></span><i class="hmm-badge" hidden></i>
    </button>
    <nav class="hmm-bar" aria-label="Map tools">
      ${BAR.map(([k, ic, label]) => `<button data-bar="${k}">${ICONS[ic]}<span>${esc(label)}</span></button>`).join('')}
    </nav>
    <div class="hmm-scrim" hidden></div>
    <section class="hmm-sheet" role="dialog" aria-modal="false" hidden>
      <div class="hmm-grip" aria-hidden="true"></div>
      <header class="hmm-sheet-h"><h2></h2><button class="hmm-x" aria-label="Close">${ICONS.close}</button></header>
      <div class="hmm-sheet-b"></div>
    </section>
    <div class="hmm-toast" role="status" aria-live="polite"></div>`;
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  els = {
    scaleT: q('.hmm-scale-t'), scaleBar: q('.hmm-scale-bar'), elev: q('.hmm-elev'), north: q('.hmm-north'), northI: q('.hmm-north-i'),
    base: q('.hmm-pill-base'), d3: q('.hmm-pill-3d'), locate: q('.hmm-locate'), badge: q('.hmm-badge'),
    sheet: q('.hmm-sheet'), sheetT: q('.hmm-sheet-h h2'), sheetB: q('.hmm-sheet-b'), scrim: q('.hmm-scrim'), toast: q('.hmm-toast'),
    stackR: q('#hmm-stack-r'), stackL: q('#hmm-stack-l'), bar: q('.hmm-bar'), d3box: q('.hmm-3d'), d3n: q('.hmm-3d-n .hmm-north-i'),
  };
  HuntMap.els = els;
  root.addEventListener('click', onChromeClick);
  q('.hmm-x').onclick = () => closeSheet();
  els.scrim.onclick = () => closeSheet();
  dragToClose();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && HuntMap.isOpen) { if (!search.close()) closeSheet(); } });
  updatePill();
}

function onChromeClick(e) {
  const b = e.target.closest('[data-act],[data-bar]');
  if (!b || !root.contains(b)) return;
  const act = b.dataset.act, bar = b.dataset.bar;
  if (bar) { (barActions[bar] || defaultBar[bar])(); return; }
  const fn = barActions[act] || ({
    menu: openMenu, profile: () => comingNext('Elevation profile', 'Draw a line or pick a track to see its climb and drop on a chart.'),
    search: () => search.open(), weather: () => comingNext('Weather and wind', 'Wind arrows on the map, temperature, rain, pressure trend and a 3 day forecast for this spot, from Open-Meteo.'),
    north: () => map.easeTo({ bearing: 0, duration: 400 }), base: openBasePicker, '3d': () => set3d(!prefs.is3d), locate: () => geo.onButton(),
    reset3d: () => set3d(false, false, true),
    tiltup: () => map.easeTo({ pitch: Math.min(map.getPitch() + 15, 75), duration: 350 }),
    tiltdown: () => map.easeTo({ pitch: Math.max(map.getPitch() - 15, 0), duration: 350 }),
    rotl: () => map.easeTo({ bearing: map.getBearing() - 30, duration: 350 }),
    rotr: () => map.easeTo({ bearing: map.getBearing() + 30, duration: 350 }),
    layers: () => layers.openPanel(), centre: openCentre,
  })[act];
  if (fn) fn(e);
}

const defaultBar = {
  offline: () => offline.openSheet(),
  content: () => comingNext('My Content', 'Your waypoints, lines, areas and tracks in folders. Show or hide them, and import or export map files from onX and other apps.', 'content'),
  tools: () => comingNext('Tools', 'Waypoints with hunting icons, lines and routes, areas, measure, range rings and a scent cone from the wind.', 'tools'),
  insights: () => openInsights(),
  track: () => comingNext('Go & Track', 'Record your route with distance, moving time and climb. The screen stays on while you record.', 'track'),
};

function comingNext(title, text, bar) {
  openSheet({ title, bar, html: `<p>${esc(text)}</p><p class="hmm-muted">Still loading this tool. Try again in a moment.</p>` }); // shown only until the tools plugins load
}

/** Round map button for other modules. */
function addButton({ id, icon = ICONS.target, label = '', where = 'right', onClick } = {}) {
  const b = document.createElement('button');
  b.className = 'hmm-btn'; if (id) b.id = id; b.setAttribute('aria-label', label); b.innerHTML = icon;
  if (onClick) b.addEventListener('click', onClick);
  (where === 'left' ? els.stackL : els.stackR).appendChild(b);
  return b;
}

// ---------- sheet ----------
let sheetClose = null;
function openSheet({ title = '', html = '', onClose = null, modal = true, tall = false, bar = null } = {}) {
  const prev = sheetClose; sheetClose = null;
  if (prev) { try { prev(); } catch (err) { console.warn(err); } }
  const s = els.sheet;
  els.sheetT.textContent = title;
  els.sheetB.innerHTML = '';
  if (typeof html === 'string') els.sheetB.innerHTML = html; else if (html) els.sheetB.appendChild(html);
  s.classList.toggle('tall', !!tall); s.classList.toggle('withbar', !!bar); els.bar.classList.toggle('over', !!bar);
  s.setAttribute('aria-modal', modal ? 'true' : 'false');
  s.style.transform = '';
  els.scrim.hidden = !modal;
  s.hidden = false; els.sheetB.scrollTop = 0;
  requestAnimationFrame(() => s.classList.add('on'));
  root.querySelectorAll('[data-bar]').forEach((b) => b.classList.toggle('on', b.dataset.bar === bar));
  sheetClose = onClose || (() => {});
  return els.sheetB;
}
function closeSheet() {
  if (!els.sheet || els.sheet.hidden) return false;
  const fn = sheetClose; sheetClose = null;
  els.sheet.classList.remove('on'); els.sheet.hidden = true; els.scrim.hidden = true; els.bar.classList.remove('over');
  root.querySelectorAll('[data-bar]').forEach((b) => b.classList.remove('on'));
  if (fn) { try { fn(); } catch (err) { console.warn(err); } }
  return true;
}
function dragToClose() {
  const s = els.sheet; let y0 = null, dy = 0;
  const start = (e) => { if (!e.target.closest('.hmm-grip,.hmm-sheet-h') || e.target.closest('button')) return; y0 = e.touches[0].clientY; dy = 0; s.style.transition = 'none'; };
  const move = (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); s.style.transform = `translateY(${dy}px)`; };
  const end = () => { if (y0 == null) return; s.style.transition = ''; y0 = null; if (dy > 90) closeSheet(); else s.style.transform = ''; };
  s.addEventListener('touchstart', start, { passive: true }); s.addEventListener('touchmove', move, { passive: true }); s.addEventListener('touchend', end);
}

let toastT;
function toast(msg, ms = 2800) {
  if (!els.toast) return;
  els.toast.textContent = msg; els.toast.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => els.toast.classList.remove('on'), ms);
}

// ---------- map ----------
function createMap(v) {
  map = new maplibregl.Map({
    container: 'hmm-canvas', style: buildStyle({ dem, prefs, deferContours: true }),
    center: [v.lng, v.lat], zoom: v.zoom, bearing: v.bearing || 0, pitch: prefs.is3d ? (v.pitch || 55) : 0,
    minZoom: 2, maxZoom: 18.5, maxPitch: 80, attributionControl: false, pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    // fadeDuration 0: no label fade animation (fewer frames). Tile cache capped for phone memory. Expired tiles are not refetched mid session.
    fadeDuration: 0, maxTileCacheSize: 160, refreshExpiredTiles: false, dragRotate: true, touchPitch: true, pitchWithRotate: true, localIdeographFontFamily: 'sans-serif',
  });
  HuntMap.map = map;
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  const attrib = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
  if (attrib) map.once('load', () => attrib.classList.remove('maplibregl-compact-show')); // start folded: tap (i) to read
  // canvas drawn icons (no sprite): MapLibre 6 awaits this resolver, older versions fire styleimagemissing
  const resolveImg = (id) => { const img = makeImage(id); if (img && !map.hasImage(id)) map.addImage(id, img[0], img[1]); };
  if (map.setMissingStyleImageResolver) map.setMissingStyleImageResolver(async (id) => resolveImg(id));
  else map.on('styleimagemissing', (e) => resolveImg(e.id));
  // 'load' waits for the first tiles. Offline with nothing saved it can take a long time, so also go ready once the style is in.
  let isReady = false;
  const onReady = () => {
    if (isReady) return; isReady = true;
    if (prefs.is3d) map.setTerrain({ source: 'dem-terrain', exaggeration: exag() });
    styleIn = true; applyView();
    updatePill(); updateScale(); updateElev(); updateNorth();
    resolveReady(map);
  };
  map.on('load', onReady);
  // contours, layer data and plugins wait until the first view has drawn
  let idled = false;
  const onFirstIdle = () => {
    if (idled) return; idled = true;
    whenIdle(() => { contoursReady = true; applyView(); resolveIdle(map); });
  };
  map.once('idle', onFirstIdle);
  HuntMap.ready.then(() => setTimeout(onFirstIdle, 8000)); // slow or offline first tiles: do not wait forever
  const fallback = () => { if (isReady) return; if (map.isStyleLoaded()) onReady(); else setTimeout(fallback, 1500); };
  setTimeout(fallback, 6000);
  map.on('error', onMapError);
  // at most one DOM update per frame while moving; the elevation lookup runs when the map stops
  let raf = 0;
  const frame = () => { raf = 0; updateScale(); updateNorth(); checkDeclutter(); };
  map.on('move', () => { if (!raf) raf = requestAnimationFrame(frame); });
  map.on('moveend', () => { updateScale(); updateNorth(); checkDeclutter(); updateElev(); saveView(); layers.onMove(); });
  map.on('click', (e) => {
    for (const fn of clickHandlers.slice()) { try { if (fn(e) === true) return; } catch (err) { console.warn(err); } }
    layers.handleClick(e);
  });
  map.on('pitchend', () => { if (!prefs.is3d && map.getPitch() > 20 && styleIn) set3d(true, true); });
  window.addEventListener('resize', () => { if (HuntMap.isOpen) map.resize(); });
}

let offlineNoted = false;
function onMapError(e) {
  const msg = String((e && e.error && (e.error.message || e.error)) || '');
  if (/fetch|network|ajax|load failed|cancel|abort|status 0|timed out|timeout/i.test(msg)) {
    if (!navigator.onLine && !offlineNoted) { offlineNoted = true; toast('You are offline. Areas saved in Offline Maps still work.', 4000); }
    return;
  }
  console.warn('Hunt Map:', msg);
}

const saveView = debounce(() => {
  if (!map) return;
  const c = map.getCenter();
  prefs.view = { lng: +c.lng.toFixed(6), lat: +c.lat.toFixed(6), zoom: +map.getZoom().toFixed(2), bearing: +map.getBearing().toFixed(1), pitch: +map.getPitch().toFixed(1) };
  savePrefs();
  if (HuntMap.isOpen && /^#\/map/.test(location.hash)) {
    history.replaceState(history.state, '', `#/map/@${c.lat.toFixed(5)},${c.lng.toFixed(5)},${map.getZoom().toFixed(2)}`);
  }
}, 500);

function flyTo(lng, lat, zoom) { map.flyTo({ center: [lng, lat], zoom: zoom ?? Math.max(map.getZoom(), 13), essential: true }); }

// ---------- base and 3D ----------
let contoursReady = false, decluttered = false, styleIn = false;
/** Layer visibility for the base mode, prefs and tilt. Only changed layers are touched. */
function applyView() {
  if (!map || !styleIn) return; // isStyleLoaded() is false while tiles load, so it is not used here
  decluttered = !!prefs.is3d && map.getPitch() > DECLUTTER_PITCH;
  applyMode(map, prefs.base || 'topo', prefs, { declutter: decluttered, deferContours: !contoursReady });
}
/** Hide minor contours and small labels when tilted past DECLUTTER_PITCH. Runs at most once per frame and does work only when the state flips. */
function checkDeclutter() {
  const want = !!prefs.is3d && map.getPitch() > DECLUTTER_PITCH;
  if (want !== decluttered) applyView();
}
function setBase(mode) {
  if (!BASES[mode]) return;
  prefs.base = mode; savePrefs();
  applyView(); // before the style is in, onReady applies it
  updatePill(); ev.emit('base', mode);
}
function set3d(on, keepPitch, north) {
  prefs.is3d = !!on; savePrefs();
  if (on) {
    map.setTerrain({ source: 'dem-terrain', exaggeration: exag() });
    if (!keepPitch) map.easeTo({ pitch: Math.max(map.getPitch(), 60), duration: 900 });
  } else {
    map.setTerrain(null);
    map.easeTo(north ? { pitch: 0, bearing: 0, duration: 700 } : { pitch: 0, duration: 700 }); // one ease: a second one would cancel the first
  }
  updatePill(); updateNorth(); ev.emit('3d', prefs.is3d);
}
function setExaggeration(x) {
  prefs.exag = clamp(+x || EXAG, 1, 2.5); savePrefs();
  if (prefs.is3d && map) map.setTerrain({ source: 'dem-terrain', exaggeration: prefs.exag });
}
function updatePill() {
  if (!els.base) return;
  els.base.textContent = BASES[prefs.base] || 'Topo';
  els.d3.classList.toggle('on', !!prefs.is3d);
  els.d3.setAttribute('aria-pressed', prefs.is3d ? 'true' : 'false');
  els.d3.setAttribute('aria-label', prefs.is3d ? '3D view is on. Tap for flat 2D' : '3D view is off. Tap to tilt the land in 3D');
  els.d3box.hidden = !prefs.is3d;
}

function openBasePicker() {
  const body = openSheet({ title: 'Basemap', html: `
    <div class="hmm-bases">${Object.entries(BASES).map(([k, l]) => `<button class="hmm-base ${prefs.base === k ? 'on' : ''}" data-base="${k}"><i class="th-${k}"></i><span>${l}</span></button>`).join('')}</div>
    <div class="hmm-set">
      <label class="hmm-sw-row"><span>3D terrain<small>Tilt with two fingers, or use the tilt and rotate buttons on the left.</small></span><input type="checkbox" data-set="3d" ${prefs.is3d ? 'checked' : ''}><i class="hmm-switch"></i></label>
      <label class="hmm-range"><span>3D height boost <b data-out="exag">${exag().toFixed(1)} times</b></span><input type="range" min="1" max="2.5" step="0.1" value="${exag()}" data-set="exag"></label>
      <label class="hmm-sw-row"><span>Contours on satellite<small>Brown lines on Topo are always on.</small></span><input type="checkbox" data-set="satc" ${prefs.satContours !== false ? 'checked' : ''}><i class="hmm-switch"></i></label>
      <label class="hmm-sw-row"><span>Shade hills on satellite<small>Adds soft shadows so ridges and draws stand out.</small></span><input type="checkbox" data-set="sats" ${prefs.satShade !== false ? 'checked' : ''}><i class="hmm-switch"></i></label>
    </div>
    <p class="hmm-muted">Satellite imagery from Esri is for viewing. Offline Maps saves Topo and terrain; satellite tiles you have looked at stay saved for a while.</p>` });
  body.querySelectorAll('[data-base]').forEach((b) => b.onclick = () => { setBase(b.dataset.base); body.querySelectorAll('[data-base]').forEach((x) => x.classList.toggle('on', x === b)); });
  body.querySelector('[data-set="3d"]').onchange = (e) => set3d(e.target.checked);
  body.querySelector('[data-set="satc"]').onchange = (e) => { prefs.satContours = e.target.checked; savePrefs(); applyView(); };
  body.querySelector('[data-set="sats"]').onchange = (e) => { prefs.satShade = e.target.checked; savePrefs(); applyView(); };
  wireExag(body);
}

// ---------- scale bar, elevation, north ----------
const niceNum = (v) => { const p = 10 ** Math.floor(Math.log10(v)); const f = v / p; return (f >= 5 ? 5 : f >= 2 ? 2 : 1) * p; };
function updateScale() {
  if (!map || !els.scaleT) return;
  const c = map.getCenter(), mpp = 40075016.686 * Math.cos(c.lat * Math.PI / 180) / (512 * 2 ** map.getZoom()), maxW = 96;
  let label, w;
  if (units.system === 'imperial') {
    const ftpp = mpp * 3.28084, maxFt = ftpp * maxW;
    if (maxFt < 5280) { const d = niceNum(maxFt); label = `${fmtNum(d)} ft`; w = d / ftpp; } else { const mi = niceNum(maxFt / 5280); label = `${fmtNum(mi, mi < 1 ? 1 : 0)} mi`; w = (mi * 5280) / ftpp; }
  } else {
    const maxM = mpp * maxW;
    if (maxM < 1000) { const d = niceNum(maxM); label = `${fmtNum(d)} m`; w = d / mpp; } else { const km = niceNum(maxM / 1000); label = `${fmtNum(km, km < 1 ? 1 : 0)} km`; w = (km * 1000) / mpp; }
  }
  els.scaleT.textContent = label; els.scaleBar.style.width = `${Math.round(w)}px`;
}
let elevSeq = 0;
async function updateElev() {
  if (!map) return;
  const my = ++elevSeq;
  try {
    const e = await elevationAt(map.getCenter());
    if (my !== elevSeq) return;
    els.elev.textContent = e == null ? '' : `${units.elev(Math.round(e))} elevation`;
  } catch (err) { if (my === elevSeq) els.elev.textContent = ''; }
}
let lastBearing = null;
function updateNorth() {
  const b = Math.round(map.getBearing() * 2) / 2;
  els.north.hidden = !!prefs.is3d || Math.abs(b) < 0.5; // in 3D the compass sits in the 3D controls
  if (b === lastBearing) return;
  lastBearing = b;
  els.northI.style.transform = els.d3n.style.transform = `rotate(${-b}deg)`;
}

/** Elevation in metres at a point from decoded terrarium pixels at full detail (bilinear). Same in 2D and 3D:
   the 3D mesh is coarser and reads 0 until its tile loads. */
async function elevationAt(ll) {
  const { lng, lat } = maplibregl.LngLat.convert(ll);
  const z = DEM_MAXZOOM, fx = lon2x(lng, z), fy = lat2y(lat, z), tx = Math.floor(fx), ty = Math.floor(fy);
  const tile = await dem.getDemTile(z, tx, ty);
  const W = tile.width, Hh = tile.height, d = tile.data;
  const px = clamp((fx - tx) * W - 0.5, 0, W - 1), py = clamp((fy - ty) * Hh - 0.5, 0, Hh - 1);
  const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(x0 + 1, W - 1), y1 = Math.min(y0 + 1, Hh - 1), ax = px - x0, ay = py - y0;
  const v = (x, y) => d[y * W + x];
  const e = (v(x0, y0) * (1 - ax) + v(x1, y0) * ax) * (1 - ay) + (v(x0, y1) * (1 - ax) + v(x1, y1) * ax) * ay;
  return isFinite(e) && e > -500 && e < 9000 ? e : null;
}

// ---------- menu ----------
function openMenu() {
  const nav = [['#/', 'Home'], ['#/learn', 'Learn'], ['#/field', 'Field Mode'], ['#/lists', 'Lists'], ['#/more', 'More']];
  const seg = (key, opts) => `<div class="hmm-seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${(prefs[key] || opts[0][0]) === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const body = openSheet({ title: 'Hunt Map', tall: true, html: `
    <h3 class="hmm-h">Back to Hunt Mentor</h3>
    <div class="hmm-nav">${nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</div>
    <h3 class="hmm-h">Units</h3>${seg('units', [['metric', 'Metric (m, km)'], ['imperial', 'Feet and miles']])}
    <h3 class="hmm-h">Coordinates</h3>${seg('coords', [['dd', 'Decimal'], ['dms', 'Deg min sec'], ['utm', 'UTM']])}
    <p class="hmm-muted">Decimal degrees, or degrees minutes seconds, or UTM (Universal Transverse Mercator), the metre grid on most paper topo maps.</p>
    <h3 class="hmm-h">Relief</h3>
    <label class="hmm-sw-row"><span>Hillshade<small>Soft shadows that show slopes on Topo.</small></span><input type="checkbox" data-set="hill" ${prefs.hillshade !== false ? 'checked' : ''}><i class="hmm-switch"></i></label>
    <label class="hmm-range"><span>3D height boost <b data-out="exag">${exag().toFixed(1)} times</b></span><input type="range" min="1" max="2.5" step="0.1" value="${exag()}" data-set="exag"></label>
    <h3 class="hmm-h">About this map</h3>
    <p class="hmm-muted">Map data from OpenStreetMap contributors and OpenFreeMap. Terrain from Terrain Tiles (Mapzen, Amazon Web Services Open Data). Satellite imagery from Esri. Hunting layers from the BC Data Catalogue. <a href="#/credits">All credits</a></p>
    <div class="hmm-banner">Study aid only. The official regulations are the law.</div>` });
  body.querySelectorAll('[data-seg]').forEach((g) => g.querySelectorAll('button').forEach((b) => b.onclick = () => {
    const key = g.dataset.seg; prefs[key] = b.dataset.v; savePrefs();
    g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    if (key === 'units') { setContourUnits(map, dem, units.system); updateScale(); updateElev(); }
    ev.emit('units', units);
  }));
  body.querySelector('[data-set="hill"]').onchange = (e) => { prefs.hillshade = e.target.checked; savePrefs(); applyView(); };
  wireExag(body);
}
/** Height boost slider: label updates as you slide, the terrain changes once per frame at most. */
function wireExag(body) {
  const inp = body.querySelector('[data-set="exag"]'), out = body.querySelector('[data-out="exag"]');
  if (!inp) return;
  let raf = 0;
  inp.oninput = () => {
    out.textContent = `${(+inp.value).toFixed(1)} times`;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; setExaggeration(inp.value); });
  };
}

// ---------- centre details and insights ----------
function copyBtn(text) { return `<button class="hmm-copy" data-copy="${esc(text)}" aria-label="Copy ${esc(text)}">${ICONS.copy}</button>`; }
function wireCopy(body) {
  body.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => {
    const t = b.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copied'), () => toast(t, 5000));
  });
}
/** Open in Google Maps, Directions (to dest, for example the parking point) and Open in Apple Maps. */
export function linksHtml(lat, lng, name, dest) {
  const q = `${lat.toFixed(6)},${lng.toFixed(6)}`, d = dest ? `${dest[0].toFixed(6)},${dest[1].toFixed(6)}` : q;
  return `<div class="hmm-actions">
    <a class="hmm-act" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">${ICONS.google}<span>Open in Google Maps</span></a>
    <a class="hmm-act" href="https://www.google.com/maps/dir/?api=1&destination=${d}" target="_blank" rel="noopener">${ICONS.directions}<span>Directions</span></a>
    <a class="hmm-act" href="https://maps.apple.com/?ll=${q}&q=${encodeURIComponent(name || 'Hunt Map pin')}" target="_blank" rel="noopener">${ICONS.apple}<span>Open in Apple Maps</span></a></div>`;
}
async function openCentre() {
  const c = map.getCenter();
  const fm = [['Decimal', 'dd'], ['Degrees minutes seconds', 'dms'], ['UTM (Universal Transverse Mercator)', 'utm']];
  const body = openSheet({ title: 'Map centre', html: `
    <dl class="hmm-dl">${fm.map(([l, f]) => { const t = formatCoord(c.lng, c.lat, f); return `<dt>${l}</dt><dd><span>${esc(t)}</span>${copyBtn(t)}</dd>`; }).join('')}
    <dt>Elevation</dt><dd data-out="elev">Checking</dd></dl>${linksHtml(c.lat, c.lng)}` });
  wireCopy(body);
  const e = await elevationAt(c).catch(() => null);
  const out = body.querySelector('[data-out="elev"]'); if (out) out.textContent = e == null ? 'Not available offline here' : units.elev(Math.round(e));
}

async function openInsights() {
  const c = map.getCenter();
  const body = openSheet({ title: 'Insights', bar: 'insights', html: '<p class="hmm-muted">Checking this spot</p>' });
  const [elev, mu] = await Promise.all([elevationAt(c).catch(() => null), layers.muAt([c.lng, c.lat]).catch(() => ({ state: 'error' }))]);
  if (els.sheetB !== body || els.sheet.hidden) return;
  const HMs = window.HuntMentor || {}, hours = window.HM && window.HM.regs && window.HM.regs.hours;
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  let light = '<p><span class="hmm-verify">VERIFY</span> Legal light needs the app data.</p>';
  if (HMs.sunEvent && hours) {
    const rise = HMs.sunEvent(today, c.lat, c.lng, true), set = HMs.sunEvent(today, c.lat, c.lng, false), hhmm = HMs.hhmm;
    const add = (d, m) => (d ? new Date(+d + m * 6e4) : null);
    const row = (label, h) => (h && h.beforeSunriseMin != null
      ? `<div class="hmm-kv"><span>${label}</span><b>${hhmm(add(rise, -h.beforeSunriseMin))} to ${hhmm(add(set, h.afterSunsetMin))}</b>${cert(h.certainty)}</div>`
      : `<div class="hmm-kv"><span>${label}</span><span class="hmm-verify">VERIFY</span></div>`);
    light = `<div class="hmm-kv"><span>Sunrise and sunset</span><b>${hhmm(rise)} and ${hhmm(set)}</b></div>
      ${row('Big game and upland birds', hours.bigGame)}${row('Ducks and geese', hours.migratory)}
      <p class="hmm-muted">Calculated on your phone for the map centre, Pacific time. Rules: ${esc(hours.bigGame && hours.bigGame.text || '')} ${esc(hours.migratory && hours.migratory.text || '')}</p>`;
  }
  let muHtml;
  if (mu && mu.state === 'ok') muHtml = `<div class="hmm-kv"><span>MU (Management Unit)</span><b>${esc(mu.id)}</b></div>${mu.region ? `<div class="hmm-kv"><span>Region</span><b>${esc(mu.region)}</b></div>` : ''}<p class="hmm-muted">${esc(mu.source || '')}</p>`;
  else if (mu && mu.state === 'outside') muHtml = '<p>Not inside a MU (Management Unit) in the loaded data.</p>';
  else muHtml = '<p>The MU (Management Unit) layer is being built. Check the Rule Book for this area.</p>';
  body.innerHTML = `
    <p class="hmm-muted">At the map centre: ${esc(units.coord(c.lng, c.lat))}${elev != null ? `, ${units.elev(Math.round(elev))}` : ''}</p>
    <div class="hmm-banner">Study aid only. The official regulations are the law.</div>
    <h3 class="hmm-h">Where you are</h3>${muHtml}
    <h3 class="hmm-h">Legal light today</h3>${light}
    <div class="hmm-btnrow"><a class="hmm-btn2" href="#/field/light">Full legal light table</a><a class="hmm-btn2" href="#/sources">Rules data</a></div>
    <p class="hmm-soon">Coming next</p><p class="hmm-muted">What is open today here, wind and a plain approach tip, moon phase and a 3 day forecast.</p>`;
}
export function cert(v) {
  if (v == null) return '<span class="hmm-verify">VERIFY</span>';
  return `<span class="hmm-cert ${v >= 95 ? 'hi' : v >= 80 ? 'mid' : v >= 60 ? 'lo' : 'tip'}">${v}%</span>`;
}
export function setBadge(n) { if (els.badge) { els.badge.hidden = !n; els.badge.textContent = n || ''; } }
HuntMap.ui = { cert, linksHtml, setBadge, copyBtn, wireCopy };
