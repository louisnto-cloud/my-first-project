/* Hunt Map place cards: campgrounds (the "camping" layer, card: 'camp') and the extra parts of a spot card
   (free photo, mini map, popularity, party tags, nearest camp, quick legal check, best times, action buttons).
   Photos: only Wikimedia Commons files under CC0, public domain, CC BY or CC BY-SA, with the credit under the picture.
   Camps carry a matched photo from the build (data/spots/camping, metadata only); spots search Commons live (within 1 km)
   when online. Pictures are thumbnails loaded from upload.wikimedia.org (the service worker keeps viewed ones). */
import { esc, units, haversine } from './util.js';
import { ESRI } from './style.js';

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const FREE = /^(cc0|public domain|pd\b|pd-|cc by( |-)?(sa )?\d|cc by( |-)sa|cc by\b|cc-by)/i;
const NOT_LAND = /\b(map|logo|sign|diagram|plaque|portrait|people|interior|museum|church|house|store|shop|train|locomotive|truck|car|bus|aircraft|menu|poster|document|screenshot|selfie|wedding)\b/i;
const CSS = `.hpc-photo{margin:8px 0 4px}.hpc-photo img{display:block;width:100%;max-height:260px;object-fit:cover;border-radius:12px;background:#ddd}
.hpc-photo figcaption{font-size:13px;line-height:1.35;color:var(--hmm-muted);margin-top:4px}
.hpc-mini{position:relative;height:170px;overflow:hidden;border-radius:12px;background:#cfd8c4;margin:8px 0 2px}
.hpc-mini .t{position:absolute;width:256px;height:256px;image-rendering:auto}.hpc-mini i{position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#e8590c;border:3px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.35)}
.hpc-mini-bar{display:flex;gap:6px;align-items:center;line-height:1.25;font-size:12.5px;color:var(--hmm-muted);margin-bottom:6px}.hpc-mini-bar button{white-space:nowrap;flex:none;min-height:36px;padding:0 10px;border-radius:10px;border:1.5px solid var(--hmm-line);background:var(--hmm-card);color:var(--hmm-ink);font-weight:700}
.hpc-mini-bar button.on{border-color:var(--hmm-accent)}
.hpc-type{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:14px}.hpc-type b{width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.3)}
.hpc-closed{background:#fdecea;color:#b71c1c;border:2px solid #d32f2f;border-radius:12px;padding:10px 12px;font-weight:800;margin:8px 0;font-size:15px;line-height:1.35}
.hpc-dl{display:grid;grid-template-columns:minmax(96px,34%) 1fr;gap:6px 10px;margin:8px 0;font-size:14.5px}.hpc-dl dt{font-weight:800}.hpc-dl dd{margin:0}.hpc-dl small{display:block;color:var(--hmm-muted);font-size:12.5px}
.hpc-tags{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.hpc-tag{display:inline-flex;align-items:center;min-height:30px;padding:0 10px;border-radius:15px;font-weight:800;font-size:13.5px;border:2px solid currentColor}
.hpc-pop{border-radius:12px;padding:10px 12px;margin:8px 0;font-size:14.5px;line-height:1.4;border:2px solid}.hpc-pop.popular{border-color:#ff1744;background:rgba(255,23,68,.07)}.hpc-pop.quiet{border-color:#00c853;background:rgba(0,230,118,.08)}
.hpc-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.hpc-btns .hmm-btn2{width:100%;font-size:14px;line-height:1.2;text-align:center}
.hpc-light{font-weight:800}.hpc-light.yes{color:#1b5e20}.hpc-light.no{color:#b71c1c}.hpc-light.check{color:#a15c00}`;
function css() { if (!document.getElementById('hpc-css')) { const s = document.createElement('style'); s.id = 'hpc-css'; s.textContent = CSS; document.head.appendChild(s); } }
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const NL = '<span class="hmm-muted">not listed</span>';
const plain = (h) => { const d = document.createElement('div'); d.innerHTML = String(h || '').replace(/<[^>]+>/g, ' '); return d.textContent.replace(/\s+/g, ' ').trim(); };

// ---------- mini map (satellite or topo tiles around the point; no stored image) ----------
const TOPO = 'https://tile.opentopomap.org/{z}/{x}/{y}.png';
export function miniMapHtml(lng, lat, id) {
  return `<div class="hpc-mini-bar"><button type="button" class="on" data-mini="sat" data-for="${id}">Satellite</button><button type="button" data-mini="topo" data-for="${id}">Topo</button><span data-mini-attr="${id}">Imagery: Esri, Maxar, Earthstar Geographics</span></div>
    <div class="hpc-mini" id="${id}" data-ll="${lng},${lat}" role="img" aria-label="Small map of the place"></div>`;
}
function drawMini(el, kind) {
  const [lng, lat] = el.dataset.ll.split(',').map(Number), z = 15, n = 2 ** z;
  const px = ((lng + 180) / 360) * n * 256, py = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n * 256;
  const W = el.clientWidth || 320, Hh = el.clientHeight || 170, x0 = px - W / 2, y0 = py - Hh / 2;
  let html = '';
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W) / 256); tx++) {
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + Hh) / 256); ty++) {
      const u = (kind === 'topo' ? TOPO : ESRI).replace('{z}', kind === 'topo' ? 15 : z).replace('{x}', tx).replace('{y}', ty);
      html += `<img class="t" alt="" crossorigin="anonymous" loading="lazy" src="${u}" style="left:${Math.round(tx * 256 - x0)}px;top:${Math.round(ty * 256 - y0)}px" onerror="this.style.visibility='hidden'">`;
    }
  }
  el.innerHTML = `${html}<i></i>`;
}
export function wireMini(body) {
  body.querySelectorAll('.hpc-mini').forEach((el) => drawMini(el, 'sat'));
  body.querySelectorAll('[data-mini]').forEach((b) => b.onclick = () => {
    const el = body.querySelector(`#${b.dataset.for}`); if (!el) return;
    drawMini(el, b.dataset.mini);
    body.querySelectorAll(`[data-for="${b.dataset.for}"]`).forEach((x) => x.classList.toggle('on', x === b));
    const a = body.querySelector(`[data-mini-attr="${b.dataset.for}"]`);
    if (a) a.textContent = b.dataset.mini === 'topo' ? 'Map: OpenTopoMap (CC BY-SA), OpenStreetMap contributors' : 'Imagery: Esri, Maxar, Earthstar Geographics';
  });
}

// ---------- photos ----------
function photoFig(ph, note) {
  const lic = ph.licenceUrl ? `<a href="${esc(ph.licenceUrl)}" target="_blank" rel="noopener">${esc(ph.licence)}</a>` : esc(ph.licence);
  return `<figure class="hpc-photo"><img crossorigin="anonymous" src="${esc(ph.thumb)}" alt="${esc(ph.file || 'Photo')}" loading="lazy" onerror="this.closest('figure').innerHTML='<p class=hmm-muted>The photo did not load. You may be offline.</p>'">
    <figcaption>Photo: ${esc(ph.author || 'unknown')}, ${lic}, <a href="${esc(ph.page)}" target="_blank" rel="noopener">Wikimedia Commons</a>.${note ? ` ${esc(note)}` : ''}</figcaption></figure>`;
}
const liveCache = new Map();
/** Free landscape photo within radius m from Commons (live, online only). Resolves to a photo object or null. */
// words: when given (a camp name), the file title or description must contain them (the photo must be of that place)
export function commonsNear(lng, lat, radius = 1000, words = null) {
  const k = `${lat.toFixed(4)},${lng.toFixed(4)},${radius},${(words || []).join(' ')}`;
  if (liveCache.has(k)) return liveCache.get(k);
  const p = (async () => {
    if (!navigator.onLine) return { offline: true };
    const gs = await fetch(`${COMMONS}?action=query&format=json&origin=*&list=geosearch&gscoord=${lat}|${lng}&gsradius=${radius}&gsnamespace=6&gslimit=25`).then((r) => r.json());
    const hits = ((gs.query && gs.query.geosearch) || []).filter((g) => /\.jpe?g$/i.test(g.title) && !NOT_LAND.test(g.title));
    if (!hits.length) return null;
    const ii = await fetch(`${COMMONS}?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=480&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|ImageDescription&titles=${encodeURIComponent(hits.slice(0, 12).map((h) => h.title).join('|'))}`).then((r) => r.json());
    const pages = Object.values((ii.query && ii.query.pages) || {});
    const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    for (const h of hits) {
      const pg = pages.find((x) => x.title === h.title); const inf = pg && pg.imageinfo && pg.imageinfo[0]; if (!inf) continue;
      const md = inf.extmetadata || {}, lic = strip(md.LicenseShortName && md.LicenseShortName.value);
      const desc = strip(md.ImageDescription && md.ImageDescription.value);
      if (!FREE.test(lic) || inf.width < inf.height * 0.95 || NOT_LAND.test(desc)) continue; // landscape photos only
      if (words && words.length) { const txt = `${h.title} ${desc}`.toLowerCase(); if (words.filter((w) => txt.includes(w)).length < Math.max(1, words.length - 1)) continue; }
      return { thumb: inf.thumburl, page: inf.descriptionurl, licence: lic, licenceUrl: md.LicenseUrl && md.LicenseUrl.value, author: strip(md.Artist && md.Artist.value).slice(0, 120) || 'unknown', file: h.title, dist: h.dist };
    }
    return null;
  })().catch(() => ({ failed: true }));
  liveCache.set(k, p); p.then((v) => { if (v && (v.offline || v.failed)) liveCache.delete(k); });
  return p;
}
export function fillLivePhoto(body, lng, lat, radius, words) {
  const box = body.querySelector('[data-photo]'); if (!box) return;
  commonsNear(lng, lat, radius, words).then((ph) => {
    if (!box.isConnected) return;
    if (ph && ph.thumb) box.innerHTML = photoFig(ph, words ? `Named for this place, taken about ${units.dist(ph.dist || 0)} from the point.` : `Taken about ${units.dist(ph.dist || 0)} away: it may not show this exact spot.`);
    else if (ph && ph.offline) box.innerHTML = '<p class="hmm-muted">Photos need a connection. No free photo saved for offline.</p>';
    else box.innerHTML = `<p class="hmm-muted">No free photo found (Wikimedia Commons, within ${units.dist(radius)}).</p>`;
  });
}

// ---------- shared actions ----------
export function actionsHtml(kind) {
  const b = (k, t) => `<button type="button" class="hmm-btn2" data-pa="${k}">${t}</button>`;
  return `<div class="hpc-btns">${b('canhunt', 'Can I hunt here now?')}${b('wpt', 'Save as waypoint')}
    ${kind === 'spot' ? `${b('view', 'What can I see from here')}${b('glass', 'Glassing spots near here')}${b('sight', 'Log a sighting')}` : ''}</div>`;
}
export function wireActions(H, body, ll, name, icon) {
  const on = (k, fn) => { const x = body.querySelector(`[data-pa="${k}"]`); if (x) x.onclick = fn; };
  on('canhunt', () => (H.canHunt ? H.canHunt.open(ll) : H.toast('Can I hunt here now? is not loaded yet.', 3000)));
  on('wpt', () => { if (H.tools && H.tools.dropWaypoint) { H.tools.dropWaypoint(ll, { name, icon }); } else H.toast('Waypoints are not loaded yet.', 3000); });
  on('view', () => { if (H.terrain && H.terrain.viewshed) { H.closeSheet(); H.terrain.viewshed(ll); } else H.toast('This needs the terrain tools.', 3000); });
  on('glass', () => { if (!H.glass) { H.toast('Glassing spots are not loaded yet.', 3000); return; } H.map.jumpTo({ center: ll, zoom: Math.max(H.map.getZoom(), 13.5) }); H.glass.open(); H.glass.run(); });
  on('sight', () => (H.sightings ? H.sightings.logAt(ll) : H.toast('Sightings are not loaded yet.', 3000)));
}

// ---------- camp card ----------
const row = (k, v, src) => `<dt>${esc(k)}</dt><dd>${v == null || v === '' ? NL : v}${src ? `<small>${esc(src)}</small>` : ''}</dd>`;
export function openCamp(H, l, f) {
  css();
  const p = f.properties, [lng, lat] = f.geometry.coordinates;
  const src = `${p.src || 'Source not listed'}, data ${p.srcDate || 'date not listed'}`;
  const yes = (v) => (v == null ? null : esc(v));
  const closed = p.closure || (p.isOpen === false ? 'Closed (BC Parks listing)' : '');
  const color = (l.legend || []).find((x) => x[0] === p.typeLabel);
  const town = p.town ? `${esc(p.town.name)}, about ${esc(units.dist(p.town.km * 1000))} straight line (road distance not computed)` : null;
  const html = `${closed ? `<div class="hpc-closed">${esc(closed)}<br><small>Official closure note. ${esc(p.src || '')}, data ${esc(p.srcDate || '')}.</small></div>` : ''}
    <div class="hpc-type"><b style="background:${esc(color ? color[1] : '#888')}"></b>${esc(p.typeLabel || 'Camp')}</div>
    ${p.kind ? `<p class="hmm-muted hmm-tight">${esc(p.kind)}</p>` : ''}
    ${p.t === 'osm' ? '<p><b>Unofficial listing (OpenStreetMap), verify.</b> Not in the official rec site or BC Parks data.</p>' : ''}
    ${p.t === 'crown' ? '<p><b>Candidate, scout it first.</b> A computer pick from open data: flat, near water, not private, park or reserve. Not an official campsite.</p>' : ''}
    <div data-photo>${p.photo ? photoFig(p.photo, 'Matched by name, within 500 m.') : '<p class="hmm-muted">Looking for a free photo of this place</p>'}</div>
    ${miniMapHtml(lng, lat, 'hpc-mini-camp')}
    ${H.ui.linksHtml(lat, lng, p.name)}
    <dl class="hpc-dl">
      ${row('Name', esc(p.name))}
      ${row('Type', esc(p.typeLabel), `Certainty ${p.cert || 50}%`)}
      ${row('Position', `${esc(units.coord(lng, lat))}`, `${p.pos || ''} (certainty ${p.posCert || 50}%)`)}
      ${row('Operator', yes(p.operator), p.t !== 'crown' ? src : '')}
      ${row('Campsites', yes(p.sites), src)}
      ${p.rv ? row('RV sites', yes(p.rv), src) : ''}
      ${row('Fee or free', yes(p.fee), p.fee ? src : 'Check the official page')}
      ${row('Reservable', yes(p.reserve), p.reserve ? src : '')}
      ${row('Season or open dates', yes(p.season), p.season ? src : 'Check the official page')}
      ${p.offSeason ? row('Off season', esc(p.offSeason), src) : ''}
      ${row('Toilets', yes(p.toilets), p.toilets ? src : '')}
      ${row('Drinking water', p.t === 'crown' ? null : yes(p.water), p.water && p.t !== 'crown' ? src : '')}
      ${p.t === 'crown' && p.water ? row('Water nearby', esc(p.water), 'Freshwater Atlas, spot pipeline. Treat all water.') : ''}
      ${row('Fire rings', yes(p.fire), p.fire ? src : '')}
      ${p.campfireBan ? row('Campfire ban', 'Yes, listed for this park', src) : ''}
      ${row('Boat launch', yes(p.boat), p.boat ? src : '')}
      ${row('Max RV or trailer length', yes(p.maxLength), p.maxLength ? src : '')}
      ${row('Road access', yes(p.road), p.road ? src : '')}
      ${p.directions ? row('Directions', esc(p.directions), src) : ''}
      ${row('Nearest town', town, 'ABMS_MUNICIPALITIES_SP (BC Data Catalogue)')}
      ${row('MU (Management Unit)', p.mu ? `${esc(p.mu)}, Region ${esc(p.region)} ${esc(p.regionName || '')}` : null, `WAA_WILDLIFE_MGMT_UNITS_SVW, data ${p.muDate || ''}`)}
      ${row('Elevation', p.elev != null ? esc(units.elev(p.elev)) : null, 'Terrain tiles (estimate)')}
      ${p.inPark ? row('Inside', esc(p.inPark), 'TA_PARK_ECORES_PA_SVW') : ''}
      ${p.desc ? row('Official description', esc(p.desc), src) : ''}
    </dl>
    ${p.rule ? `<div class="hmm-banner">Study aid only. The official regulations are the law.</div><p><b>Firearms:</b> ${esc(p.rule.t)} <small class="hmm-muted">(${esc(p.rule.cert)}%, ${esc(p.rule.src)})</small> <a href="${esc(p.rule.link)}">Open the Rule Book</a></p>` : ''}
    ${p.t === 'park' ? '<p><b>Firearms:</b> park rules differ. Check the park page and the Rule Book before you carry a firearm here (Tip). <a href="#/s/rb-where-you-can-hunt">Open the Rule Book</a></p>' : ''}
    <p><span class="hmm-cert tip">Tip</span> Hunting season: many campgrounds close after Thanksgiving. Call or check before you go.</p>
    <div class="hmm-btnrow">${p.page ? `<a class="hmm-btn2" href="${esc(p.page)}" target="_blank" rel="noopener">${p.t === 'rec' ? 'Official site page (Recreation Sites and Trails BC)' : p.t === 'park' ? 'Official park page (BC Parks)' : 'Website listed'}</a>` : ''}${p.osmUrl ? `<a class="hmm-btn2" href="${esc(p.osmUrl)}" target="_blank" rel="noopener">OpenStreetMap entry</a>` : ''}</div>
    ${actionsHtml('camp')}
    <p class="hmm-muted">Every line shows its source and data date. Anything not in the data says "not listed": we never fill it in. Sources: ${esc(l.attribution || l.source || '')}</p>`;
  const body = H.openSheet({ title: p.name || 'Camp', html, modal: false, tall: true });
  wireMini(body);
  wireActions(H, body, [lng, lat], p.name || 'Camp', 'camp');
  if (!p.photo) {
    const words = String(p.name || '').toLowerCase().replace(/\b(recreation|rec|site|campground|camp|provincial|park|the|and|of|no name in openstreetmap)\b/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
    if (words.length && p.t !== 'crown') fillLivePhoto(body, lng, lat, 500, words);
    else { const b = body.querySelector('[data-photo]'); if (b) b.innerHTML = '<p class="hmm-muted">No free photo found.</p>'; }
  }
  return body;
}

// ---------- spot card extras ----------
const TAG_COL = { beginner: '#2962ff', two: '#6a1b9a', solo: '#00695c' };
export function spotExtrasHtml(p, lng, lat) {
  css();
  const pop = p.pop ? `<div class="hpc-pop ${esc(p.pop)}"><b>${esc(p.popLabel || (p.pop === 'popular' ? 'Popular (more hunters)' : 'Less popular (quieter)'))}</b> <span class="hmm-cert">${esc(p.popCert || 50)}%</span><br>${esc(String(p.popWhy || '').replace(/^[^:]*:\s*/, ''))}<br><small class="hmm-muted">Estimate: how it is worked out is in the layer guide (Candidate spots). Source: Big Game Harvest Statistics (BC Data Catalogue) and road access.</small></div>` : '';
  const tags = (p.tags || []).length ? `<div class="hpc-tags">${p.tags.map((t) => `<span class="hpc-tag" style="color:${TAG_COL[t.k] || '#333'}">${esc(t.label)}</span>`).join('')}</div>
    <ul class="hmm-evid">${p.tags.map((t) => `<li><b>${esc(t.label)}:</b> ${esc(t.why)}</li>`).join('')}</ul>` : '';
  return `${pop}${tags}
    <div data-photo><p class="hmm-muted">Looking for a free photo nearby</p></div>
    ${miniMapHtml(lng, lat, 'hpc-mini-spot')}
    <h3 class="hmm-h">Here now</h3><div data-quick><p class="hmm-muted">Checking the MU, the season today and the land layers</p></div>
    <h3 class="hmm-h">Nearest camping</h3><div data-camp><p class="hmm-muted">Looking</p></div>
    ${actionsHtml('spot')}`;
}
const SPMAP = { deer: 'muledeer', bear: 'blackbear', moose: 'moose', elk: 'elk', grouse: 'grouse', duck: 'ducks', quail: 'quail', turkey: 'turkey', camp: 'muledeer' };
export async function fillSpotExtras(H, body, p, lng, lat) {
  wireMini(body);
  wireActions(H, body, [lng, lat], p._name || p.name || 'Spot', 'stand');
  fillLivePhoto(body, lng, lat, 1000);
  // quick legal check: the same checks as Can I hunt here now?
  const q = body.querySelector('[data-quick]');
  if (q && H.canHunt && H.canHunt.evaluate) {
    try {
      const k = SPMAP[p.primary || (p._sp || [])[0]] || 'muledeer';
      const CH_SP = (await import('./hunt-canhunt.js')).SPECIES;
      const R = await H.canHunt.evaluate([lng, lat], CH_SP.find((x) => x.k === k) || CH_SP[0]);
      if (q.isConnected && R) {
        const W = { yes: 'YES', no: 'NO', check: 'CHECK' };
        q.innerHTML = `<p class="hpc-light ${esc(R.light)}">${esc(W[R.light] || String(R.light).toUpperCase())} for ${esc((R.sp && R.sp.l) || 'this animal')} right now (study aid)</p>
          <ul class="hmm-evid">${(R.items || []).filter((x) => x.st !== 'info').slice(0, 6).map((x) => `<li><b>${esc(plain(x.h))}</b> ${esc(plain(x.t))}${x.src ? `<small>${esc(plain(x.src))}</small>` : ''}</li>`).join('')}</ul>
          <p class="hmm-muted">Tap "Can I hunt here now?" for every line. Study aid only. The official regulations are the law.</p>`;
      }
    } catch (e) { if (q.isConnected) q.innerHTML = '<p class="hmm-muted">The quick check did not run here. Use "Can I hunt here now?".</p>'; }
  } else if (q) q.innerHTML = '<p class="hmm-muted">Use "Can I hunt here now?" below.</p>';
  // nearest camp of any type (camping layer, loaded for this point only)
  const c = body.querySelector('[data-camp]');
  if (c) {
    try {
      const fc = await H.getLayerData('camping', { near: [lng, lat] });
      const near = ((fc && fc.features) || []).map((f) => ({ f, m: haversine([lng, lat], f.geometry.coordinates) })).sort((a, b) => a.m - b.m || (a.f.properties.rank - b.f.properties.rank));
      const best = near.slice(0, 3);
      if (c.isConnected) c.innerHTML = best.length ? `<ul class="hmm-evid">${best.map(({ f, m }) => `<li><b>${esc(f.properties.name)}</b>, ${esc(f.properties.typeLabel || '')}, ${esc(units.dist(m))} straight line${f.properties.closure ? ` <span style="color:#b71c1c;font-weight:800">${esc(f.properties.closure.slice(0, 60))}</span>` : ''} <button type="button" class="hmm-btn2" data-campgo="${f.geometry.coordinates.join(',')}">Map</button></li>`).join('')}</ul><p class="hmm-muted">Straight line, not road distance. Turn on Campgrounds and camp spots to see them all.</p>` : '<p class="hmm-muted">No camp in the app data near here.</p>';
      c.querySelectorAll('[data-campgo]').forEach((b) => b.onclick = () => { const [x, y] = b.dataset.campgo.split(',').map(Number); H.map.flyTo({ center: [x, y], zoom: 14 }); });
    } catch (e) { if (c.isConnected) c.innerHTML = '<p class="hmm-muted">Camps did not load (offline and not saved?).</p>'; }
  }
}
