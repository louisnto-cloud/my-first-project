/* Hunt plan offline card: "Save this hunt area for no signal" on a saved plan (plan view and the Home study card).
   Loaded by app/plan.js with import(). Works without opening the map: the box, the size estimate, the download and the
   check all run through map/offline.js (the same files and caches as the map's Offline Maps, so the saved area also shows
   in Offline Maps, where it can be updated, renamed or deleted).
   Box: the plan point, the plan's listed spots and its nearest camp, padded about 2 km, full detail (zoom 14), plus a 5 km
   ring at zoom 12 (offline.js planArea). "Check again" reads only the phone's caches, so it works with no signal.
   mount(el, { plan, files }): plan is the saved plan (S.plans entry), files [{ label, urls }] are its lessons and plan data. */
import * as off from './offline.js';
import { esc, fmtNum } from './util.js';

const mounted = new Set(); // cards on screen (the plan view and the Home card can both show one)
let prog = null; // { planId, done, total, bytes, step }

/** The plan's points: where it is, its listed spots, its nearest camp. */
export function planPoints(plan) {
  const pts = [], w = plan && plan.where;
  if (w && w.lat != null && w.lon != null) pts.push({ lat: w.lat, lon: w.lon, name: w.label || 'Plan point' });
  const sp = (plan && plan.spots) || {};
  for (const x of sp.list || []) pts.push({ lat: x.lat, lon: x.lon, name: x.name });
  const camp = (sp.camps || []).slice().sort((a, b) => (a.km || 0) - (b.km || 0))[0];
  if (camp) pts.push({ lat: camp.lat, lon: camp.lon, name: camp.name });
  return pts;
}
const planName = (plan) => `Hunt plan: ${(plan.where && plan.where.label) || 'area'}${plan.where && plan.where.mu ? `, MU ${plan.where.mu}` : ''}`.slice(0, 60);
const day = (iso) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }) : '');
const mapHref = (b) => `#/map/@${((b[1] + b[3]) / 2).toFixed(5)},${((b[0] + b[2]) / 2).toFixed(5)},11`;

export function mount(el, opts) {
  if (!el) return;
  injectCss();
  el._plo = opts; mounted.add(el); if (opts.toast) toastFn = opts.toast;
  el.onclick = (e) => { const b = e.target.closest('[data-plo-a]'); if (b) act(el, b.dataset.ploA); };
  render(el);
}
function live() { for (const el of [...mounted]) if (!el.isConnected) mounted.delete(el); return [...mounted]; }
const sameAll = (planId, fn) => live().filter((el) => el._plo.plan.id === planId).forEach(fn);

async function render(el, check) {
  const { plan } = el._plo, rec = off.findPlanArea(plan.id), pts = planPoints(plan);
  const head = '<h3>Offline for no signal</h3>';
  if (!pts.length) { el.innerHTML = `${head}<p class="muted pl-small">This plan has no map point, so there is no area to save. Pick a place or use your location in the plan.</p>`; return; }
  if (prog && prog.planId === plan.id) { el.innerHTML = `${head}<div class="plo-prog">${progHtml()}</div><div class="plo-btns"><button type="button" class="btn" data-plo-a="stop">Stop (resume later)</button></div>`; return; }
  if (!rec) return renderNew(el, head, pts);
  const parts = `<div class="plo-btns">${rec.partial ? '<button type="button" class="btn primary" data-plo-a="save">Resume the download</button>' : ''}<button type="button" class="btn" data-plo-a="check">Check again</button>${!rec.partial ? '<button type="button" class="btn" data-plo-a="save">Update</button>' : ''}<a class="btn" href="${mapHref(rec.bbox)}">Open the map there</a></div>`;
  el.innerHTML = `${head}<div class="plo-state" role="status"><p class="muted">Checking what is saved on this phone...</p></div>${parts}
    <p class="muted pl-small">${esc(off.sizeText(rec.bytes))} saved${rec.updated ? ` on ${esc(day(rec.updated))}` : ''}. Rename or delete it in Map, Offline Maps.</p>`;
  const r = check || await off.checkArea(rec, { points: pts, files: el._plo.files || [] }).catch(() => null);
  if (!el.isConnected) return;
  const box = el.querySelector('.plo-state');
  if (!r) { box.innerHTML = '<p><b>Could not check.</b> Try again.</p>'; return; }
  const bad = r.rows.filter((x) => !x.ok);
  box.innerHTML = r.ok
    ? `<p class="plo-ok"><b>Ready offline</b> <span>Saved ${esc(day(rec.updated || rec.created))}. Checked just now.</span></p>`
    : `<p class="plo-bad"><b>Not ready offline</b> <span>${bad.length} part${bad.length === 1 ? '' : 's'} missing. ${navigator.onLine ? 'Tap Update on wifi.' : 'Connect to wifi, then tap Update.'}</span></p>`;
  box.innerHTML += `<details class="plo-rows"${r.ok ? '' : ' open'}><summary>What is saved</summary><ul>${r.rows.map((x) => `<li class="${x.ok ? 'ok' : 'no'}"><b>${x.ok ? 'Saved' : 'Missing'}:</b> ${esc(x.label)}. <span class="muted">${esc(x.text)}</span></li>`).join('')}</ul></details>`;
}

async function renderNew(el, head, pts) {
  const { plan } = el._plo, area = off.planArea(pts, { planId: plan.id, name: planName(plan) });
  const sp = (plan.spots && plan.spots.list) || [];
  el.innerHTML = `${head}<p class="plo-bad" role="status"><b>Not ready offline</b> <span>This hunt area is not saved on this phone yet.</span></p>
    <p class="pl-small">Saves the map around your point, ${sp.length ? `${sp.length} spot${sp.length === 1 ? '' : 's'}` : 'no spots yet'}${pts.length > sp.length + 1 ? ' and the nearest camp' : ''}: base map, contours, Crown land, no shooting areas, MU (Management Unit) lines, spots and camps. Then the map and Can I hunt here work with no signal.</p>
    <div class="plo-est" role="status"><p class="muted">Working out the size...</p></div>
    <button type="button" class="btn primary block" data-plo-a="save" disabled>Save this hunt area for no signal</button>
    <p class="muted pl-small">Do it at home on wifi. Keep the app open while it saves; the screen stays on.</p>`;
  const est = await off.estimateArea(area).catch(() => null);
  if (!el.isConnected) return;
  const go = el.querySelector('[data-plo-a="save"]'), box = el.querySelector('.plo-est');
  if (!est) { box.innerHTML = '<p class="muted">Could not work out the size.</p>'; return; }
  const off1 = !navigator.onLine;
  box.innerHTML = `<p><b>${est.exact ? 'About' : 'At least about'} ${esc(off.sizeText(est.bytes))}</b>. Area about ${fmtNum(area.km.w, 0)} km by ${fmtNum(area.km.h, 0)} km at full detail (zoom 14), with less detail (zoom 12) 5 km around it.</p>
    ${area.left.length ? `<p class="pl-small"><b>Too spread out:</b> the area is cut to 45 km. Not inside: ${esc(area.left.map((p) => p.name).join(', '))}. Save that part from the map (Offline Maps).</p>` : ''}
    ${est.tooBig ? '<p class="plo-bad"><b>Too big to save in one go.</b> Save smaller areas from the map.</p>' : ''}
    ${off1 ? '<p class="plo-bad"><b>No connection.</b> Connect to wifi to save it.</p>' : ''}`;
  go.disabled = est.tooBig || off1 || !!off.running();
  el._plo.area = area;
}
const progHtml = () => {
  const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
  return `<div class="bar plo-bar"><i style="width:${pct}%"></i></div><p class="pl-small" aria-live="polite">${prog.total ? `${pct}%: ${fmtNum(prog.done)} of ${fmtNum(prog.total)} files${prog.bytes ? `, ${esc(off.sizeText(prog.bytes))}` : ''}. Keep the app open.` : esc(prog.step || 'Getting ready')}</p>`;
};

async function act(el, a) {
  const { plan } = el._plo;
  if (a === 'stop') { off.stop(); return; }
  if (a === 'check') { const b = el.querySelector('[data-plo-a="check"]'); if (b) b.disabled = true; return render(el); }
  if (a !== 'save') return;
  if (off.running()) { toast('A map download is already running. Wait for it to finish.'); return; }
  if (!navigator.onLine) { toast('Connect to wifi first.'); return; }
  const rec = off.findPlanArea(plan.id);
  let area = rec || el._plo.area;
  if (rec && !rec.partial) { // Update: the plan's spots may have changed, so the box follows them (same saved area)
    const fresh = off.planArea(planPoints(plan), { planId: plan.id, name: rec.name });
    if (fresh) Object.assign(rec, { bbox: fresh.bbox, outer: fresh.outer });
    area = rec;
  }
  if (!area) return;
  prog = { planId: plan.id, done: 0, total: 0, bytes: 0, step: 'Getting ready' };
  const paint = () => sameAll(plan.id, (x) => { const b = x.querySelector('.plo-prog'); if (b) b.innerHTML = progHtml(); else render(x); });
  sameAll(plan.id, (x) => render(x));
  const r = await off.saveArea(area, {
    step: (s) => { if (prog) { prog.step = s; paint(); } }, // a late throttled call can come after the end
    progress: (done, total, bytes) => { if (prog) { Object.assign(prog, { done, total, bytes }); paint(); } },
  });
  prog = null;
  if (r.busy) toast('A map download is already running.');
  else if (r.error) { console.warn('Hunt plan offline save', r.error); toast('Could not start. Check your connection and try again.'); }
  else if (r.cancelled) toast('Stopped. Tap Resume the download to finish it.');
  else toast(r.failed ? `Saved with ${fmtNum(r.failed)} files missing. Tap Update later on wifi.` : 'Saved. Checking it now.');
  sameAll(plan.id, (x) => render(x));
}
let toastFn = null;
const toast = (t) => { if (toastFn) toastFn(t); };

function injectCss() {
  if (document.getElementById('plo-css')) return;
  const s = document.createElement('style'); s.id = 'plo-css';
  s.textContent = `
.plo-ok b, .plo-bad b { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 15px; margin-right: 6px; }
.plo-ok b { background: #1b7f3b; color: #fff; }
.plo-bad b { background: #b3261e; color: #fff; }
.plo-ok span, .plo-bad span { font-size: 14px; }
.plo-rows summary { min-height: 44px; display: flex; align-items: center; font-weight: 700; cursor: pointer; }
.plo-rows ul { margin: 0 0 8px; padding-left: 18px; font-size: 14px; }
.plo-rows li { margin: 4px 0; }
.plo-rows li.no b { color: #b3261e; }
.plo-est p { margin: 6px 0; font-size: 15px; }
.plo-bar { margin: 8px 0 4px; }
[data-plo-a] { min-height: 44px; }
.plo-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }
.plo-btns > * { margin: 0; min-height: 44px; display: flex; align-items: center; justify-content: center; text-align: center; }
.plo-btns > :last-child:nth-child(odd) { grid-column: 1 / -1; }
@media (prefers-color-scheme: dark) { .plo-rows li.no b { color: #ff8a80; } }
`;
  document.head.appendChild(s);
}
