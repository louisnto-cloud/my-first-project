/* Hunt Map location: blue dot, accuracy circle, heading cone, follow and compass modes.
   Button cycle: off, then follow (map stays centred on you), then compass (map turns with you), then show (dot only).
   Dragging the map leaves follow. iPhone asks for compass access on the first tap (needs that tap). */
import { circleRing, throttle } from './util.js';

let H, map, watchId = null, marker = null, el = null;
let mode = 'off', last = null, heading = null, orientOn = false, firstFix = true, errShown = false;
const ACC = 'hm-loc-acc';

export function init(api) {
  H = api; map = api.map;
  map.on('dragstart', () => { if (mode === 'follow' || mode === 'compass') { setMode('show'); } });
}

export function onButton() {
  if (!('geolocation' in navigator)) { H.toast('This browser cannot share your location.'); return; }
  if (mode === 'off') { askCompass(); start(); setMode('follow'); if (last) centre(true); H.toast('Showing your location. The map follows you until you drag it.', 3500); return; }
  if (mode === 'show') { setMode('follow'); if (last) centre(true); H.toast('Following you again.', 2000); return; }
  if (mode === 'follow') { if (heading != null) { setMode('compass'); H.toast('Compass mode: the map turns the way you face. Tap again for north up.', 3500); } else { askCompass(); setMode('show'); H.toast('Compass not available yet. Map stays north up.'); } return; }
  if (mode === 'compass') { setMode('show'); map.easeTo({ bearing: 0, duration: 500 }); H.toast('North up. Tap to follow you again.', 2500); }
}

function setMode(m) {
  mode = m;
  const b = H.els.locate;
  b.classList.toggle('on', m !== 'off');
  b.classList.toggle('follow', m === 'follow' || m === 'compass');
  b.innerHTML = m === 'compass' ? H.icons.follow : H.icons.locate;
  const label = { off: 'Show my location', show: 'Follow my location', follow: 'Turn the map with my compass', compass: 'Stop turning the map' }[m];
  b.setAttribute('aria-label', label); b.title = label;
}

function start() {
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
}
export function pause() {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (orientOn) { window.removeEventListener('deviceorientationabsolute', onOrient); window.removeEventListener('deviceorientation', onOrient); orientOn = false; }
}
export function resume() { if (mode !== 'off') { start(); listenOrient(); } }

/** Position for other modules: { lng, lat, accuracy, heading, speed, time } or null. */
export const where = () => last;

function onPos(p) {
  const c = p.coords;
  last = { lng: c.longitude, lat: c.latitude, accuracy: c.accuracy, heading: c.heading, speed: c.speed, altitude: c.altitude, time: p.timestamp };
  if (H) H.lastPosition = last;
  if (heading == null && c.heading != null && !isNaN(c.heading) && c.speed > 1) setHeading(c.heading);
  draw();
  if (firstFix) { firstFix = false; if (mode === 'follow' || mode === 'compass') centre(true); return; }
  if (mode === 'follow' || mode === 'compass') centre(false);
}

function onErr(e) {
  if (errShown) return;
  errShown = true; setTimeout(() => { errShown = false; }, 15000);
  if (e.code === 1) { H.toast('Location is blocked. Turn on Location Services for Safari or Hunt Mentor in Settings, Privacy.', 6000); pause(); setMode('off'); }
  else H.toast('Looking for your location. Open sky helps.', 4000);
}

function centre(fly) {
  const opt = { center: [last.lng, last.lat], duration: fly ? 1200 : 600, essential: true };
  if (fly) opt.zoom = Math.max(map.getZoom(), 14);
  if (mode === 'compass' && heading != null) opt.bearing = heading;
  map.easeTo(opt);
}

function draw() {
  if (!last) return;
  const ll = [last.lng, last.lat];
  if (!marker) {
    el = document.createElement('div');
    el.className = 'hmm-me';
    el.innerHTML = '<div class="hmm-me-cone"></div><div class="hmm-me-dot"></div>';
    marker = new H.maplibregl.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat(ll).addTo(map);
  } else marker.setLngLat(ll);
  el.classList.toggle('has-heading', heading != null);
  if (heading != null) marker.setRotation(heading);
  const data = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleRing(ll, Math.max(last.accuracy || 0, 3))] } };
  const src = map.getSource(ACC);
  if (src) src.setData(data);
  else if (map.style) { // not isStyleLoaded(): that stays false while tiles load, so the circle never showed while following
    map.addSource(ACC, { type: 'geojson', data });
    map.addLayer({ id: ACC + '-fill', type: 'fill', source: ACC, paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.12 } });
    map.addLayer({ id: ACC + '-line', type: 'line', source: ACC, paint: { 'line-color': '#1a73e8', 'line-opacity': 0.45, 'line-width': 1 } });
  }
}

// ---------- compass ----------
function askCompass() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') {
    // iPhone: must run inside the tap
    D.requestPermission().then((s) => { if (s === 'granted') listenOrient(); else H.toast('Compass is off. Allow Motion and Orientation access to see which way you face.', 5000); }).catch(() => {});
  } else listenOrient();
}
function listenOrient() {
  if (orientOn || !window.DeviceOrientationEvent) return;
  orientOn = true;
  if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onOrient);
  else window.addEventListener('deviceorientation', onOrient);
}
function onOrient(e) {
  let h = null;
  if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
  else if (e.absolute && e.alpha != null) h = 360 - e.alpha;
  if (h == null) return;
  const so = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  setHeading((h + so + 360) % 360);
}
let headFrame = 0;
function setHeading(h) {
  // smooth the needle a little
  if (heading == null) heading = h;
  else { let d = ((h - heading + 540) % 360) - 180; heading = (heading + d * 0.35 + 360) % 360; }
  // The compass sensor fires up to 60 times a second: move the marker at most once per frame
  if (!headFrame) headFrame = requestAnimationFrame(() => { headFrame = 0; if (marker) { el.classList.add('has-heading'); marker.setRotation(heading); } });
  if (mode === 'compass') turn();
}
const turn = throttle(() => { if (mode === 'compass' && heading != null && Math.abs(((map.getBearing() - heading + 540) % 360) - 180) > 2) map.rotateTo(heading, { duration: 180 }); }, 160);
