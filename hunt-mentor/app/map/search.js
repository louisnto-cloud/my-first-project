/* Hunt Map search: one box. Order: coordinates (decimal, degrees minutes seconds, UTM), MU number like 3-27,
   our spots and rec sites, BC Geographical Names, BC Address Geocoder, then Nominatim (throttled, 1 request a second). */
import { esc, parseCoords, units, haversine, bearingTo, compass8, debounce, prefs, savePrefs, formatCoord } from './util.js';
import * as layers from './layers.js';

let H, map, root, input, res, seq = 0, ctrl = null, pin = null, lastNomi = 0;
const MU_RE = /^\s*(?:mu|m\.u\.|management\s+unit)?\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*$/i;

export function init(api) { H = api; map = api.map; }

function build() {
  if (root) return;
  root = document.createElement('div');
  root.className = 'hmm-search'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Search the map');
  root.innerHTML = `<form class="hmm-sbar" action="#">
      <span class="hmm-sicon">${H.icons.search}</span>
      <input type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Places, coordinates or units" aria-label="Search">
      <button type="button" class="hmm-scancel">Cancel</button></form>
    <div class="hmm-sres"></div>`;
  H.els.bar.parentNode.appendChild(root);
  input = root.querySelector('input'); res = root.querySelector('.hmm-sres');
  const live = debounce(() => run(input.value, false), 300);
  input.addEventListener('input', live);
  root.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); run(input.value, true); input.blur(); });
  root.querySelector('.hmm-scancel').onclick = () => close();
  res.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const it = shown[+b.dataset.i]; if (it && !it.off) go(it);
  });
}

export function open() {
  build(); H.closeSheet();
  root.hidden = false;
  if (!input.value) hints();
  setTimeout(() => input.focus(), 30);
}
export function close() {
  if (!root || root.hidden) return false;
  root.hidden = true; input.blur(); if (ctrl) ctrl.abort();
  return true;
}

let shown = [];
function hints() {
  const recent = (prefs.recent || []).slice(0, 5);
  shown = recent;
  res.innerHTML = `${recent.length ? `<h3 class="hmm-h">Recent</h3>${recent.map((it, i) => item(it, i)).join('')}` : ''}
    <h3 class="hmm-h">You can search for</h3>
    <ul class="hmm-tips">
      <li>Places: <b>Pinantan Lake</b>, <b>Louis Creek</b>, a road or a town</li>
      <li>Coordinates: <b>50.858, -120.269</b> or <b>50°51′29″N 120°16′08″W</b></li>
      <li>UTM (Universal Transverse Mercator): <b>10U 699000 5637000</b></li>
      <li>MU (Management Unit): <b>3-27</b></li>
      <li>Candidate spots and rec sites by name, once the layers are built</li>
    </ul>`;
}

function rel(lng, lat) {
  const c = map.getCenter(), d = haversine([c.lng, c.lat], [lng, lat]);
  return d < 50 ? 'here' : `${units.dist(d)} ${compass8(bearingTo([c.lng, c.lat], [lng, lat]))}`;
}
function item(it, i) {
  return `<button class="hmm-sitem ${it.off ? 'off' : ''}" data-i="${i}"><span class="hmm-sname">${esc(it.name)}</span>
    <span class="hmm-ssub">${esc(it.sub || '')}${it.lng != null && !it.off ? ` <i>${esc(rel(it.lng, it.lat))}</i>` : ''}</span></button>`;
}
function render(groups, status) {
  shown = [];
  const html = groups.filter((g) => g.items.length).map((g) => `<h3 class="hmm-h">${esc(g.title)}</h3>${g.items.map((it) => { shown.push(it); return item(it, shown.length - 1); }).join('')}`).join('');
  res.innerHTML = html + (status ? `<p class="hmm-muted hmm-sstatus">${esc(status)}</p>` : '') + (!html && !status ? '<p class="hmm-muted">No results. Check the spelling, or try a nearby lake, creek or town.</p>' : '');
}

async function run(q, submit) {
  const my = ++seq;
  if (ctrl) ctrl.abort();
  ctrl = new AbortController(); const signal = ctrl.signal;
  q = q.trim();
  if (!q) { hints(); return; }
  const groups = [];
  const c = parseCoords(q);
  if (c) groups.push({ title: 'Coordinates', items: [{ name: formatCoord(c.lon, c.lat, 'dd'), sub: `${c.kind}${c.note ? `. ${c.note}` : ''}`, lng: c.lon, lat: c.lat, zoom: 15 }] });
  const mu = q.match(MU_RE);
  if (mu) {
    const code = `${+mu[1]}-${+mu[2]}`;
    const r = await layers.findMU(code).catch(() => null);
    if (my !== seq) return;
    groups.push({ title: 'MU (Management Unit)', items: [r && r.bbox
      ? { name: `MU ${code}`, sub: r.region || 'Management Unit', bbox: r.bbox, lng: (r.bbox[0] + r.bbox[2]) / 2, lat: (r.bbox[1] + r.bbox[3]) / 2, onPick: () => layers.setOn(r.layerId, true) }
      : { name: `MU ${code}`, sub: r && r.state === 'missing' ? 'The Management Unit layer is being built' : 'Not found in the Management Unit layer', off: true }] });
  }
  if (q.length >= 2 && !c) {
    const local = await layers.searchLocal(q).catch(() => []);
    if (my !== seq) return;
    if (local.length) groups.push({ title: 'Spots and rec sites', items: local.slice(0, 8) });
  }
  if (q.length < 3 || c || mu) { render(groups); return; }
  render(groups, 'Searching BC place names');
  const [names, addr] = await Promise.all([bcNames(q, signal).catch(() => null), bcGeocoder(q, signal).catch(() => null)]);
  if (my !== seq) return;
  if (names && names.length) groups.push({ title: 'BC Geographical Names', items: names });
  if (addr && addr.length) groups.push({ title: 'BC places and roads', items: addr });
  // Spots named "1 km SW of Louis Creek" should not push Louis Creek itself down: place names first unless a spot name matches exactly
  const li = groups.findIndex((g) => g.title === 'Spots and rec sites');
  if (li >= 0 && !groups[li].items.some((it) => String(it.name).toLowerCase() === q.toLowerCase())) groups.push(groups.splice(li, 1)[0]);
  const offline = names == null && addr == null;
  if (!submit && ((names || []).length + (addr || []).length) > 0) { render(groups, offline ? 'Offline: place search needs a connection.' : ''); return; }
  if (offline && !navigator.onLine) { render(groups, 'Offline: place search needs a connection. Coordinates and MU numbers still work.'); return; }
  render(groups, 'Searching OpenStreetMap');
  const wait = Math.max(0, lastNomi + 1100 - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  if (my !== seq) return;
  lastNomi = Date.now();
  const osm = await nominatim(q, signal).catch(() => null);
  if (my !== seq) return;
  if (osm && osm.length) groups.push({ title: 'OpenStreetMap', items: osm });
  render(groups);
}

async function getJSON(url, signal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function bcNames(q, signal) {
  const d = await getJSON(`https://apps.gov.bc.ca/pub/bcgnws/names/search?name=${encodeURIComponent(q)}&outputFormat=json&outputSRS=4326&itemsPerPage=12`, signal);
  return (d.features || []).filter((f) => f.geometry && f.geometry.type === 'Point' && f.properties.status !== 'rescinded')
    .sort((a, b) => (b.properties.isOfficial || 0) - (a.properties.isOfficial || 0))
    .slice(0, 8).map((f) => ({ name: f.properties.name, sub: String(f.properties.featureType || 'Place').replace(/\s*\(\d+\)$/, ''), lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], zoom: 13 }));
}
const PREC = { CIVIC_NUMBER: 'Address', BLOCK: 'Address block', STREET: 'Road or street', INTERSECTION: 'Intersection', LOCALITY: 'Community', SITE: 'Site', UNIT: 'Address' };
async function bcGeocoder(q, signal) {
  const d = await getJSON(`https://geocoder.api.gov.bc.ca/addresses.json?addressString=${encodeURIComponent(q)}&maxResults=5&outputSRS=4326&minScore=55`, signal);
  return (d.features || []).filter((f) => PREC[f.properties.matchPrecision]).map((f) => ({
    name: String(f.properties.fullAddress || '').replace(/, BC$/, ''), sub: PREC[f.properties.matchPrecision],
    lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], zoom: f.properties.matchPrecision === 'LOCALITY' ? 13 : 16,
  }));
}
async function nominatim(q, signal) {
  const d = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=ca&accept-language=en&q=${encodeURIComponent(q)}`, signal);
  return d.map((r) => {
    const parts = String(r.display_name || '').split(', ');
    const bb = r.boundingbox ? [+r.boundingbox[2], +r.boundingbox[0], +r.boundingbox[3], +r.boundingbox[1]] : null;
    return { name: r.name || parts[0], sub: [String(r.type || '').replace(/_/g, ' '), parts.slice(1, 3).join(', ')].filter(Boolean).join(', '), lng: +r.lon, lat: +r.lat, bbox: bb && (bb[2] - bb[0]) > 0.002 ? bb : null, zoom: 14 };
  });
}

function go(it) {
  close();
  if (it.bbox) map.fitBounds([[it.bbox[0], it.bbox[1]], [it.bbox[2], it.bbox[3]]], { padding: { top: 140, bottom: 200, left: 40, right: 40 }, maxZoom: 15, duration: 1400 });
  else map.flyTo({ center: [it.lng, it.lat], zoom: it.zoom || Math.max(map.getZoom(), 13), essential: true, duration: 1400 });
  if (it.onPick) { it.onPick(); return; }
  dropPin(it);
  const r = (prefs.recent || []).filter((x) => x.name !== it.name);
  r.unshift({ name: it.name, sub: it.sub, lng: it.lng, lat: it.lat, zoom: it.zoom, bbox: it.bbox || null });
  prefs.recent = r.slice(0, 6); savePrefs();
}

/** Red search pin. Tap it for links. */
export function dropPin(it) {
  if (pin) pin.remove();
  const el = document.createElement('button');
  el.className = 'hmm-pin'; el.setAttribute('aria-label', `Search result: ${it.name}`);
  el.innerHTML = `<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 41S30 25.6 30 15.4A14 14 0 0 0 2 15.4C2 25.6 16 41 16 41Z" fill="#e4472b" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="5.2" fill="#fff"/></svg><span>${esc(it.name)}</span>`;
  pin = new H.maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([it.lng, it.lat]).addTo(map);
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    const body = H.openSheet({ title: it.name, modal: false, html: `<p class="hmm-muted">${esc(it.sub || '')}</p>
      <p>${esc(units.coord(it.lng, it.lat))}</p>${H.ui.linksHtml(it.lat, it.lng, it.name)}
      <div class="hmm-btnrow"><button class="hmm-btn2" data-act2="rm">Remove pin</button></div>` });
    body.querySelector('[data-act2="rm"]').onclick = () => { if (pin) { pin.remove(); pin = null; } H.closeSheet(); };
  });
}
