/* Hunt Map user data in IndexedDB (database hm-map): waypoints, lines, areas, tracks, folders, photos.
   No DOM and no map: app.js imports this file for the backup export and import even when the map is closed.
   Item: { id, kind: 'wpt' | 'line' | 'area' | 'track', name, note, color, icon (wpt), folder (folder id or ''), hidden,
           coords ([lng, lat] for wpt, [[lng, lat, ele?], ...] for the others), times (track, ms), photo (photo id), created, updated }
   Folder: { id, name, hidden, created }. Photo: { id, blob }. Meta: { key, value } (the track being recorded). */
const DB = 'hm-map', VER = 1;
const STORES = ['items', 'folders', 'photos', 'meta'];
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (!('indexedDB' in self)) { rej(new Error('IndexedDB is not available')); return; }
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('items')) d.createObjectStore('items', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('folders')) d.createObjectStore('folders', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('Database blocked'));
  });
  dbp.catch(() => { dbp = null; });
  return dbp;
}
function tx(store, mode, fn) {
  return open().then((d) => new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    let out;
    const s = Array.isArray(store) ? store.map((n) => t.objectStore(n)) : t.objectStore(store);
    const r = fn(s);
    if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out);
    t.onerror = t.onabort = () => rej(t.error || new Error('Storage failed'));
  }));
}

export const uid = (p = 'u') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const all = (store) => tx(store, 'readonly', (s) => s.getAll()).then((v) => v || []);
export const get = (store, id) => tx(store, 'readonly', (s) => s.get(id));
export const put = (store, v) => tx(store, 'readwrite', (s) => s.put(v)).then(() => v);
export const del = (store, id) => tx(store, 'readwrite', (s) => s.delete(id));
export function putMany(store, list) { return tx(store, 'readwrite', (s) => { list.forEach((v) => s.put(v)); }); }

export async function saveItem(it) {
  it.updated = Date.now(); if (!it.created) it.created = it.updated; if (!it.id) it.id = uid(it.kind || 'i');
  return put('items', it);
}
export async function deleteItem(id) {
  const it = await get('items', id);
  if (it && it.photo) await del('photos', it.photo).catch(() => {});
  return del('items', id);
}
export const getMeta = (key) => get('meta', key).then((r) => (r ? r.value : null));
export const setMeta = (key, value) => (value == null ? del('meta', key) : put('meta', { key, value }));

// ---------- backup ----------
const blobToData = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
function dataToBlob(u) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(u || ''); if (!m) return null;
  const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: m[1] || 'image/jpeg' });
}
/** Everything as plain JSON (photos as data URLs) for the app backup file. */
export async function exportAll() {
  const [items, folders, photos] = await Promise.all([all('items'), all('folders'), all('photos')]);
  const ph = {};
  for (const p of photos) { try { ph[p.id] = await blobToData(p.blob); } catch (e) { /* unreadable photo skipped */ } }
  return { v: 1, items, folders, photos: ph };
}
/** Replace all user map data with a backup made by exportAll. */
export async function importAll(o) {
  if (!o || !Array.isArray(o.items)) return 0;
  const photos = Object.entries(o.photos || {}).map(([id, u]) => ({ id, blob: dataToBlob(u) })).filter((p) => p.blob);
  await tx(['items', 'folders', 'photos'], 'readwrite', ([si, sf, sp]) => {
    si.clear(); sf.clear(); sp.clear();
    o.items.forEach((v) => v && v.id && si.put(v));
    (o.folders || []).forEach((v) => v && v.id && sf.put(v));
    photos.forEach((v) => sp.put(v));
  });
  return o.items.length;
}
