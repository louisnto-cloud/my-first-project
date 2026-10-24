/* Hunt Map tools: My Content. Folders, list, show or hide, edit, delete. Import GPX, KML, GeoJSON (onX exports GPX and KML).
   Export GPX, KML, GeoJSON, shared with the Web Share API when the phone allows files, else downloaded. */
import * as store from './store.js';
import { parse, toGPX, toKML, toGeoJSON } from './tools-files.js';
import { wptSvg } from './tools-geo.js';
import { esc, bboxOf } from './util.js';

let ctx, H;
let filter = 'all';
const open = new Set(); // folder ids folded open; all start open except when many

export function init(c) {
  ctx = c; H = c.H;
  H.setBarAction('content', sheet);
  ctx.exportSheet = exportSheet; ctx.importFile = importFile; ctx.contentSheet = sheet;
}

const EYE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.2 3.9M6.6 6.7C3.7 8.5 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.3-1"/></svg>';
const FOLDER = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 7.3c0-.9.7-1.6 1.6-1.6h4.2l1.9 2h8.7c.9 0 1.6.7 1.6 1.6v8.6c0 .9-.7 1.6-1.6 1.6H4.6c-.9 0-1.6-.7-1.6-1.6Z"/></svg>';
const FILTERS = [['all', 'All'], ['wpt', 'Waypoints'], ['line', 'Lines'], ['area', 'Areas'], ['track', 'Tracks']];

function rowHtml(it) {
  const ic = it.kind === 'wpt' ? wptSvg(it.icon, it.color || null, 30) : `<span class="hmt-sw ${it.kind}" style="--c:${esc(it.color || '#e8590c')}"></span>`;
  const sub = [ctx.KIND[it.kind], ctx.itemStats(it)].filter(Boolean).join(', ');
  return `<div class="hmt-item ${it.hidden ? 'off' : ''}"><button class="hmt-row" data-open="${esc(it.id)}">${ic}<span class="hmt-rn">${esc(it.name || ctx.KIND[it.kind])}<small>${esc(sub)}</small></span></button>
    <button class="hmm-i" data-eye="${esc(it.id)}" aria-pressed="${!it.hidden}" title="${it.hidden ? 'Show on the map' : 'Hide from the map'}" aria-label="${it.hidden ? 'Show' : 'Hide'} ${esc(it.name)} on the map">${it.hidden ? EYE_OFF : EYE}</button></div>`;
}

export async function sheet() {
  await ctx.refresh();
  const items = ctx.items.filter((i) => filter === 'all' || i.kind === filter);
  const folders = ctx.folders.slice().sort((a, b) => a.name.localeCompare(b.name));
  const groups = folders.map((f) => ({ f, list: items.filter((i) => i.folder === f.id) }));
  const known = new Set(folders.map((f) => f.id)), loose = items.filter((i) => !i.folder || !known.has(i.folder));
  const counts = Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? ctx.items.length : ctx.items.filter((i) => i.kind === k).length]));
  const body = H.openSheet({ title: 'My Content', bar: 'content', tall: true, html: `
    <div class="hmm-btnrow hmt-top">
      <label class="hmm-btn2">Import<input type="file" accept=".gpx,.kml,.geojson,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/geo+json,application/json" data-c="import" hidden></label>
      <button class="hmm-btn2" data-c="export" ${ctx.items.length ? '' : 'disabled'}>Export all</button>
      <button class="hmm-btn2" data-c="folder">${FOLDER}<span>New folder</span></button>
    </div>
    <div class="hmm-chiprow" role="group" aria-label="Show">${FILTERS.map(([k, l]) => `<button class="hmm-chip ${filter === k ? 'on' : ''}" data-filter="${k}">${l} ${counts[k]}</button>`).join('')}</div>
    ${!ctx.items.length ? `<div class="hmm-empty"><b>Nothing saved yet</b><p>Drop a waypoint from Tools, press and hold on the map, draw a line, or record a track with Go & Track.</p><p class="hmm-muted">Coming from onX? Export your waypoints and tracks there as GPX (GPS Exchange Format, GPS meaning Global Positioning System) or KML (Keyhole Markup Language), then tap Import.</p></div>` : ''}
    ${groups.map(({ f, list }) => `<section class="hmt-folder ${f.hidden ? 'off' : ''}">
      <div class="hmt-fh"><button class="hmt-fname" data-fold="${esc(f.id)}" aria-expanded="${!open.has('x' + f.id)}">${FOLDER}<span>${esc(f.name)} <small>${list.length}</small></span></button>
        <button class="hmm-i" data-feye="${esc(f.id)}" aria-pressed="${!f.hidden}" title="${f.hidden ? 'Show folder on the map' : 'Hide folder from the map'}" aria-label="${f.hidden ? 'Show' : 'Hide'} folder ${esc(f.name)}">${f.hidden ? EYE_OFF : EYE}</button>
        <button class="hmm-i" data-fedit="${esc(f.id)}" title="Rename, export or delete the folder" aria-label="Folder ${esc(f.name)}: rename, export or delete">${H.icons.edit}</button></div>
      <div class="hmt-flist" ${open.has('x' + f.id) ? 'hidden' : ''}>${list.map(rowHtml).join('') || '<p class="hmm-muted">Empty folder. Pick it in an item\'s Folder box to move things here.</p>'}</div></section>`).join('')}
    ${loose.length ? `${groups.length ? '<h3 class="hmm-h">Not in a folder</h3>' : ''}${loose.map(rowHtml).join('')}` : ''}
    <p class="hmm-muted">Saved on this phone only. Your backup in More includes it.</p>` });
  body.querySelectorAll('[data-filter]').forEach((b) => b.onclick = () => { filter = b.dataset.filter; sheet(); });
  body.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => { const it = ctx.items.find((i) => i.id === b.dataset.open); if (it) ctx.openItem(it.id); }); // the item sheet zooms to it, above the sheet
  body.querySelectorAll('[data-eye]').forEach((b) => b.onclick = async () => {
    const it = ctx.items.find((i) => i.id === b.dataset.eye); if (!it) return;
    it.hidden = !it.hidden; await ctx.saveAny(it); await ctx.refresh();
    b.innerHTML = it.hidden ? EYE_OFF : EYE; b.setAttribute('aria-pressed', String(!it.hidden)); b.parentNode.classList.toggle('off', !!it.hidden);
  });
  body.querySelectorAll('[data-fold]').forEach((b) => b.onclick = () => {
    const k = 'x' + b.dataset.fold, l = b.closest('.hmt-folder').querySelector('.hmt-flist');
    if (open.has(k)) open.delete(k); else open.add(k);
    l.hidden = open.has(k); b.setAttribute('aria-expanded', String(!l.hidden));
  });
  body.querySelectorAll('[data-feye]').forEach((b) => b.onclick = async () => {
    const f = ctx.folders.find((x) => x.id === b.dataset.feye); if (!f) return;
    f.hidden = !f.hidden; await store.put('folders', f); await ctx.refresh();
    b.innerHTML = f.hidden ? EYE_OFF : EYE; b.closest('.hmt-folder').classList.toggle('off', !!f.hidden);
  });
  body.querySelectorAll('[data-fedit]').forEach((b) => b.onclick = () => folderSheet(b.dataset.fedit));
  body.querySelector('[data-c="import"]').onchange = (e) => { const f = e.target.files[0]; if (f) importFile(f); };
  body.querySelector('[data-c="export"]').onclick = () => exportSheet(ctx.items, 'Hunt Mentor map items');
  body.querySelector('[data-c="folder"]').onclick = async () => {
    const name = (prompt('Folder name', 'New folder') || '').trim(); if (!name) return;
    await store.put('folders', { id: store.uid('f'), name: name.slice(0, 60), hidden: false, created: Date.now() }); sheet();
  };
}

function folderSheet(id) {
  const f = ctx.folders.find((x) => x.id === id); if (!f) return;
  const list = ctx.items.filter((i) => i.folder === id);
  const body = H.openSheet({ title: f.name, html: `
    <div class="hmm-rename"><input data-x="name" value="${esc(f.name)}" maxlength="60" aria-label="Folder name"><button class="hmm-btn2" data-x="save">Rename</button></div>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-x="fit" ${list.length ? '' : 'disabled'}>Show on map</button><button class="hmm-btn2" data-x="export" ${list.length ? '' : 'disabled'}>Export folder</button></div>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-x="unfile">Delete folder, keep items</button><button class="hmm-btn2 danger" data-x="del">${H.icons.trash}<span>Delete folder and its ${list.length} items</span></button></div>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-x="back">${H.icons.back}<span>Back to My Content</span></button></div>` });
  const q = (s) => body.querySelector(`[data-x="${s}"]`);
  q('save').onclick = async () => { const n = q('name').value.trim(); if (!n) return; f.name = n; await store.put('folders', f); sheet(); };
  q('fit').onclick = () => { const b = bboxOf({ type: 'GeometryCollection', geometries: list.map((i) => ({ type: 'LineString', coordinates: i.kind === 'wpt' ? [i.coords] : i.coords })) }); if (b) { H.closeSheet(); fitBox(b); } };
  q('export').onclick = () => exportSheet(list, f.name);
  q('unfile').onclick = async () => { for (const i of list) { i.folder = ''; await ctx.saveAny(i); } await store.del('folders', f.id); sheet(); };
  q('del').onclick = async () => { if (!confirm(`Delete "${f.name}" and its ${list.length} items? This cannot be undone.`)) return; for (const i of list) await ctx.deleteAny(i); await store.del('folders', f.id); sheet(); };
  q('back').onclick = sheet;
}
function fitBox(b) {
  if (b[0] === b[2] && b[1] === b[3]) { ctx.map.easeTo({ center: [b[0], b[1]], zoom: 14 }); return; }
  ctx.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 60, maxZoom: 16, duration: 700 });
}

// ---------- import ----------
export async function importFile(file) {
  let r;
  try { r = parse(await file.text(), file.name); } catch (err) { H.toast(err.message && /not/.test(err.message) ? err.message : 'Could not read that file. Use GPX, KML or GeoJSON.', 5000); return; }
  if (!r.items.length) { H.toast('No waypoints, lines, areas or tracks found in that file.', 4000); return; }
  let name = r.folderName.slice(0, 60), k = 2;
  while (ctx.folders.some((f) => f.name === name)) name = `${r.folderName.slice(0, 55)} ${k++}`;
  const folder = { id: store.uid('f'), name, hidden: false, created: Date.now() };
  const now = Date.now();
  const recs = r.items.map((it, i) => Object.assign({ note: '', color: '', hidden: false }, it, { id: store.uid(it.kind), folder: folder.id, created: now + i, updated: now }));
  try { await store.put('folders', folder); await store.putMany('items', recs); } catch (err) { H.toast('Could not save. Storage is blocked or full.', 5000); return; }
  await ctx.refresh();
  const b = bboxOf({ type: 'GeometryCollection', geometries: recs.map((i) => ({ type: 'LineString', coordinates: i.kind === 'wpt' ? [i.coords] : i.coords })) });
  const n = (k2) => recs.filter((x) => x.kind === k2).length;
  const parts = [[n('wpt'), 'waypoint'], [n('line'), 'line'], [n('area'), 'area'], [n('track'), 'track']].filter(([c]) => c).map(([c, l]) => `${c} ${l}${c > 1 ? 's' : ''}`);
  H.toast(`Imported ${parts.join(', ')} from ${r.kind} into folder ${name}`, 5000);
  await sheet();
  if (b) fitBox(b);
}

// ---------- export and share ----------
export function exportSheet(items, title) {
  const body = H.openSheet({ title: 'Share or export', html: `
    <p><b>${esc(title)}</b>, ${items.length} item${items.length === 1 ? '' : 's'}</p>
    <div class="hmt-tiles">
      <button class="hmt-tile" data-fmt="gpx"><b>GPX</b><span>GPS Exchange Format<small>onX, Gaia, Garmin, most apps</small></span></button>
      <button class="hmt-tile" data-fmt="kml"><b>KML</b><span>Keyhole Markup Language<small>onX, Google Earth</small></span></button>
      <button class="hmt-tile" data-fmt="geojson"><b>GeoJSON</b><span>Geographic JSON<small>Mapping and GIS (Geographic Information System) tools</small></span></button>
    </div>
    <p class="hmm-muted">GPS: Global Positioning System. JSON: JavaScript Object Notation.</p>
    <p class="hmm-muted">On a phone this opens the share menu (Messages, Mail, Files, AirDrop). Otherwise the file downloads. Photos stay in the app backup.</p>` });
  body.querySelectorAll('[data-fmt]').forEach((b) => b.onclick = () => share(items, title, b.dataset.fmt));
}
const FMT = { gpx: ['application/gpx+xml', toGPX], kml: ['application/vnd.google-earth.kml+xml', toKML], geojson: ['application/geo+json', toGeoJSON] };
export async function share(items, title, fmt) {
  const [type, fn] = FMT[fmt], text = fn(items, ctx.folders);
  const safe = (title || 'hunt-mentor').replace(/[^\w ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'hunt-mentor';
  const name = `${safe}.${fmt}`;
  ctx.lastExport = { name, type, text }; // for tests
  try {
    const file = new File([text], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
  } catch (err) { if (err && err.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  H.toast(`Saved ${name}`);
}
