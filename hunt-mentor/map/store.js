/* Hunt Map shared IndexedDB helper (database "hm-map"). No DOM, no map: app.js imports it for the backup even when the map is closed.
   Any module can use any object store by name. A store that does not exist yet is created on first use (the database
   version goes up by one). Every record needs an "id" (the key path).

   API (all return Promises):
     put(store, record)      save (insert or replace) a record with an id; resolves with the record
     get(store, id)          one record or undefined
     list(store)             every record in the store (array)
     del(store, id)          delete one record
     putMany(store, records), clear(store)
     ensure(...stores)       create stores now (optional; put/get/list do it for you)
     uid(prefix)             new unique id
     exportAll() / importAll(obj)   whole database as JSON (Blobs as data URLs) for the app backup

   Stores used by the tools so far: items (waypoints, lines, areas, imported tracks), folders, photos ({ id, blob }), meta,
   tracks (Go & Track). Add yours freely: the backup includes every store automatically. */
const DB = 'hm-map';
let dbp = null, cur = null;

function openDb(version, add = []) {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') { rej(new Error('IndexedDB is not available')); return; }
    const r = version ? indexedDB.open(DB, version) : indexedDB.open(DB);
    r.onupgradeneeded = () => { const d = r.result; for (const s of add) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); };
    r.onsuccess = () => { const d = r.result; cur = d; d.onversionchange = () => { d.close(); if (cur === d) { cur = null; dbp = null; } }; res(d); };
    r.onerror = () => rej(r.error);
    // onblocked is not an error: an older connection is finishing its transactions (or another tab must close); the open continues after.
  });
}
function db() {
  if (!dbp) { dbp = openDb(0); dbp.catch(() => { dbp = null; }); }
  return dbp;
}
let chain = Promise.resolve();
/** Make sure these object stores exist. Upgrades are queued so two modules cannot race. */
export function ensure(...names) {
  chain = chain.then(async () => {
    const d = await db();
    const missing = names.filter((n) => !d.objectStoreNames.contains(n));
    if (!missing.length) return d;
    const v = d.version + 1; d.close(); dbp = openDb(v, missing); dbp.catch(() => { dbp = null; });
    return dbp;
  });
  return chain;
}
async function tx(names, mode, fn) {
  const list = Array.isArray(names) ? names : [names];
  let d = await db();
  if (list.some((n) => !d.objectStoreNames.contains(n))) d = await ensure(...list);
  return new Promise((res, rej) => {
    const t = d.transaction(list, mode);
    let out;
    const r = fn(Array.isArray(names) ? list.map((n) => t.objectStore(n)) : t.objectStore(names));
    if (r && typeof r === 'object' && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out);
    t.onerror = t.onabort = () => rej(t.error || new Error('Storage failed'));
  });
}

export const uid = (p = 'u') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const list = (store) => tx(store, 'readonly', (s) => s.getAll()).then((v) => v || []);
export const all = list;
export const get = (store, id) => tx(store, 'readonly', (s) => s.get(id));
export const put = (store, v) => tx(store, 'readwrite', (s) => s.put(v)).then(() => v);
export const del = (store, id) => tx(store, 'readwrite', (s) => s.delete(id));
export const clear = (store) => tx(store, 'readwrite', (s) => s.clear());
export const putMany = (store, recs) => tx(store, 'readwrite', (s) => { recs.forEach((v) => s.put(v)); });

// ---------- tools helpers ----------
export async function saveItem(it, store = 'items') {
  it.updated = Date.now(); if (!it.created) it.created = it.updated; if (!it.id) it.id = uid(it.kind || 'i');
  return put(store, it);
}
export async function deleteItem(id, store = 'items') {
  const it = await get(store, id);
  if (it && it.photo) await del('photos', it.photo).catch(() => {});
  return del(store, id);
}
export const getMeta = (key) => get('meta', key).then((r) => (r ? r.value : null));
export const setMeta = (key, value) => (value == null ? del('meta', key) : put('meta', { id: key, value }));

// ---------- backup: every store, Blobs as data URLs ----------
const blobToData = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
function dataToBlob(u) {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(u || ''); if (!m) return null;
  const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: m[1] || 'application/octet-stream' });
}
async function enc(v) {
  if (v instanceof Blob) return { $blob: await blobToData(v) };
  if (Array.isArray(v)) return Promise.all(v.map(enc));
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await enc(x); return o; }
  return v;
}
function dec(v) {
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === 'object') { if (typeof v.$blob === 'string') return dataToBlob(v.$blob); const o = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v;
}
/** The whole database as plain JSON: { v: 2, stores: { name: [records] } }. Skips the 'meta' store (temporary state). */
export async function exportAll() {
  const d = await db(), out = { v: 2, stores: {} };
  for (const n of [...d.objectStoreNames]) { if (n === 'meta') continue; out.stores[n] = await enc(await list(n)); }
  return out;
}
/** Replace user map data with a backup made by exportAll. Returns the number of records restored. */
export async function importAll(o) {
  if (!o || typeof o.stores !== 'object') return 0;
  const names = Object.keys(o.stores).filter((n) => Array.isArray(o.stores[n]));
  if (!names.length) return 0;
  await ensure(...names);
  let n = 0;
  await tx(names, 'readwrite', (ss) => { ss.forEach((s, i) => { s.clear(); for (const r of o.stores[names[i]]) if (r && r.id != null) { s.put(dec(r)); n++; } }); });
  return n;
}
