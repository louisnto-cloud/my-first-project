/* Hunt Map first time tour and Help (MAP-FRIENDLY-PROMPT.md Part 1). Plugin: core.js PLUGINS calls the default export with window.HuntMap.
   1. Tour: 5 coach marks the first time the map opens. Each one cuts a spotlight around the real button, with one short
      sentence and Back, Next and Skip (44 px). Steps: find a place, layer sets and the key, tap a spot, Can I hunt here now?,
      save for no signal. Seen once (prefs.tourDone, in hm.map.v1 and the app backup). Replay: Help, "Show me the tour again".
      This replaces the old one shot "These are the map buttons" overlay (tools-main.js buttonNames): this module marks that
      hint as seen when it loads, so a phone gets one first time experience, not two. Button tooltips (title) are kept.
   2. Help: a "?" round button in the right stack (H.addButton, id hm-help-btn) opens a plain words sheet: every map button
      and what it does (names read from the live buttons, so new buttons show up), what the colours mean (opens the
      What am I looking at? key), gestures, offline basics and the legal banner.
   Styles live here (injected <style id="hm-tour-css">); colours come from the map tokens (--hmm-*) so map.css themes them.
   API: HuntMap.tour = { start(), help(), done() }. Deep link: #/map then tap "?". No network calls. */
import { esc } from './util.js';
import { TOOLS } from './tools-hunt.js';

const BANNER = 'Study aid only. The official regulations are the law.';
const TOUR_V = 1; // bump to show a changed tour again once
let H, root, ov = null, step = 0, steps = [], lastFocus = null;

const Q_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4.1"/><circle cx="12" cy="17.6" r=".6" fill="currentColor"/></svg>';
const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

export default function init(api) {
  H = api; root = H.els.bar.parentNode;
  // one first time experience: the old button names overlay (tools-main.js) stays off; its key is shared through prefs.seenHints
  const seen = H.prefs.seenHints || (H.prefs.seenHints = {});
  if (!seen['button-names']) { seen['button-names'] = 1; H.savePrefs(); }
  document.querySelectorAll('.hmt-names').forEach((n) => n.remove()); // in case it already drew
  injectCss();
  // last in the right stack (CSS order), below Weather, Ask the mentor and Analyze area: clear of the Basemap and 3D pill at 360 by 640
  H.addButton({ id: 'hm-help-btn', icon: Q_ICON, label: 'Help and map tour', where: 'right', onClick: () => help() });
  H.tour = { start, help, done: () => (H.prefs.tourDone || 0) >= TOUR_V };
  if (!H.tour.done()) {
    waitToStart();
    H.on('open', () => { if (!H.tour.done()) waitToStart(); });
  }
}

// ---------- when to start: map on screen, nothing open over it, the main buttons drawn ----------
let waiting = false;
function waitToStart() {
  if (waiting || ov) return;
  waiting = true;
  const t0 = Date.now();
  const tick = () => {
    if (H.tour.done() || ov) { waiting = false; return; }
    const searchOpen = !!root.querySelector('.hmm-search:not([hidden])');
    const free = H.isOpen && /^#\/map/.test(location.hash) && H.els.sheet.hidden && !searchOpen && !root.classList.contains('framing');
    const keyIn = !!root.querySelector('.hmm-keybtn'), waited = Date.now() - t0;
    if (free && (keyIn || waited > 6000)) { waiting = false; start(); return; }
    if (waited > 30000) { waiting = false; return; } // a tool or sheet stayed open: try again the next time the map opens
    setTimeout(tick, 400);
  };
  setTimeout(tick, 300);
}

// ---------- steps (button names read from the live buttons) ----------
const vis = (el) => !!(el && !el.hidden && el.offsetParent !== null && el.getBoundingClientRect().width > 0);
const label = (sel, fb) => { const b = root.querySelector(sel); const s = b && b.querySelector('span'); return (s && s.textContent.trim()) || fb; };
function buildSteps() {
  const sets = (H.presets && H.presets.list || []).map((p) => p.name).filter(Boolean);
  const setsTxt = sets.length ? `${sets.slice(0, -1).join(', ')} or ${sets[sets.length - 1]}` : 'a layer set';
  const can = (TOOLS.find((t) => t[0] === 'canhunt') || [])[1] || 'Can I hunt here now?';
  const tools = label('[data-bar="tools"]', 'Tools'), off = label('[data-bar="offline"]', 'Offline');
  return [
    { sel: ['[data-act="search"]'], title: 'Find a place', text: 'Tap the magnifying glass and type a town or lake, like Harrison.' },
    { sel: ['.hmm-layers', '.hmm-keybtn'], title: 'Layer sets', text: `Tap Layers and pick ${setsTxt}; "What am I looking at?" explains every colour.` },
    { spot: 'centre', title: 'Tap any spot', text: 'Tap anywhere on the map for a card about that spot; press and hold for more choices.' },
    { sel: ['[data-bar="tools"]'], title: can, text: `Open ${tools}, then "${can}" for a quick check of any spot.`, banner: true },
    { sel: ['[data-bar="offline"]'], title: 'Save for no signal', text: `Before you lose signal, open ${off} and save your hunt area so the map still works out there.` },
  ];
}
function targetRect(s) {
  if (s.spot === 'centre') {
    const r = root.getBoundingClientRect(), d = Math.min(130, r.width * 0.36);
    return { left: r.left + r.width / 2 - d / 2, top: r.top + r.height / 2 - d / 2, width: d, height: d, round: true };
  }
  const rs = (s.sel || []).map((q) => root.querySelector(q)).filter(vis).map((el) => el.getBoundingClientRect());
  if (!rs.length) return null;
  const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
  const rr = Math.max(...rs.map((r) => r.right)), b = Math.max(...rs.map((r) => r.bottom));
  return { left: l, top: t, width: rr - l, height: b - t };
}

// ---------- tour ----------
export function start() {
  if (ov) return;
  if (!H.isOpen) return;
  H.closeSheet();
  steps = buildSteps(); step = 0; lastFocus = document.activeElement;
  ov = document.createElement('div');
  ov.className = 'hmtour'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'hmtour-t');
  ov.innerHTML = `<div class="hmtour-hole" aria-hidden="true"></div>
    <div class="hmtour-card">
      <p class="hmtour-n" aria-hidden="true"></p>
      <h2 id="hmtour-t"></h2>
      <p class="hmtour-x" aria-live="polite"></p>
      <p class="hmtour-banner" hidden>${esc(BANNER)}</p>
      <div class="hmtour-btns">
        <button type="button" class="hmtour-skip" data-tour="skip">Skip tour</button>
        <span class="hmtour-sp"></span>
        <button type="button" class="hmtour-back" data-tour="back">Back</button>
        <button type="button" class="hmtour-next" data-tour="next">Next</button>
      </div>
    </div>`;
  copyTokens(ov);
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tour]'); if (!b) return;
    const a = b.dataset.tour;
    if (a === 'skip') finish(true); else if (a === 'back') go(step - 1); else if (step >= steps.length - 1) finish(false); else go(step + 1);
  });
  ov.addEventListener('keydown', onKey);
  document.body.appendChild(ov);
  window.addEventListener('resize', relayout);
  window.addEventListener('hashchange', onHash);
  go(0);
}
function onHash() { if (ov && !/^#\/map/.test(location.hash)) finish(true, true); }
function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(true); return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); if (step < steps.length - 1) go(step + 1); return; }
  if (e.key === 'ArrowLeft') { e.preventDefault(); if (step > 0) go(step - 1); return; }
  if (e.key === 'Tab') { // keep focus inside the card
    const bs = [...ov.querySelectorAll('button')].filter((b) => !b.hidden);
    const i = bs.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); bs[bs.length - 1].focus(); } else if (!e.shiftKey && i === bs.length - 1) { e.preventDefault(); bs[0].focus(); }
  }
}
function go(i) {
  step = Math.max(0, Math.min(steps.length - 1, i));
  const s = steps[step];
  ov.querySelector('.hmtour-n').textContent = `${step + 1} of ${steps.length}`;
  ov.querySelector('#hmtour-t').textContent = s.title;
  ov.querySelector('.hmtour-x').textContent = s.text;
  ov.querySelector('.hmtour-banner').hidden = !s.banner;
  ov.querySelector('.hmtour-back').hidden = step === 0;
  const next = ov.querySelector('.hmtour-next');
  next.textContent = step === steps.length - 1 ? 'Done' : 'Next';
  ov.dataset.step = String(step + 1);
  relayout();
  next.focus({ preventScroll: true });
}
function relayout() {
  if (!ov) return;
  const s = steps[step], hole = ov.querySelector('.hmtour-hole'), card = ov.querySelector('.hmtour-card');
  const r = targetRect(s), W = window.innerWidth, Hh = window.innerHeight, pad = 6;
  if (!r) { // button not on screen (for example hidden in this mode): no cut out, card in the middle
    hole.hidden = true; ov.classList.add('dim');
    card.style.top = `${Math.max(16, (Hh - card.offsetHeight) / 2)}px`; return;
  }
  hole.hidden = false; ov.classList.remove('dim');
  const box = { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
  Object.assign(hole.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, borderRadius: r.round ? '50%' : '18px' });
  ov.dataset.hole = [box.left, box.top, box.width, box.height].map(Math.round).join(',');
  // the card goes where there is more room: above or below the spotlight, never over it
  const ch = card.offsetHeight, gap = 14, above = box.top - gap, below = Hh - (box.top + box.height) - gap;
  let top = below >= above ? box.top + box.height + gap : box.top - gap - ch;
  top = Math.max(8, Math.min(top, Hh - ch - 8));
  card.style.top = `${Math.round(top)}px`;
  card.style.left = `${Math.max(16, Math.round((W - card.offsetWidth) / 2))}px`;
}
function finish(skipped, quiet) {
  if (!ov) return;
  H.prefs.tourDone = TOUR_V; H.savePrefs();
  window.removeEventListener('resize', relayout); window.removeEventListener('hashchange', onHash);
  ov.remove(); ov = null;
  const hb = document.getElementById('hm-help-btn');
  if (hb && vis(hb)) hb.focus({ preventScroll: true }); else if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  // short (2.2 s) so it does not cover the chips under the search bar for long (clean room test 2026-10-23: 4.5 s)
  if (!quiet) H.toast(skipped ? 'Tour skipped. Tap ? to see it again.' : 'Tap ? any time for help or the tour.', 2200);
}
/** The overlay sits outside .hmm (above the Ask the mentor button), so it takes the map colour tokens with it. */
function copyTokens(el) {
  const cs = getComputedStyle(root);
  for (const k of ['--hmm-card', '--hmm-ink', '--hmm-muted', '--hmm-accent', '--hmm-line', '--hmm-warn-bg', '--st', '--sb']) {
    const v = cs.getPropertyValue(k); if (v) el.style.setProperty(k, v.trim());
  }
}

// ---------- Help sheet ----------
// plain words for each button, by its data-act, data-bar, id or class. Names come from the live button.
const DESC = {
  menu: 'Back to Hunt Mentor, units (metres or feet), coordinate format and map credits.',
  profile: 'Elevation profile: the climb and drop along a line or a recorded track.',
  search: 'Find a town, lake or place by name.',
  centre: 'Elevation at the cross in the middle of the map. Tap for its coordinates, to copy them, or for directions.',
  weather: 'Wind arrows, temperature, rain and a short forecast for this spot. New forecasts need signal.',
  north: 'Shows when the map is turned. Tap to put north back at the top.',
  'hma-btn': 'Analyze area: how well the land in view matches what an animal needs, by month and time of day. A guide, not a prediction.',
  'ter-btn': 'Terrain tools: slope steepness, slope direction, what you can see from a spot, and sun and shade.',
  'hh-btn': 'Hunt helpers: Can I hunt here now?, Where can I hunt?, glassing, scent and sightings.',
  'hm-help-btn': 'This help. It can also replay the map tour.',
  'hm-ask': 'Ask the mentor: copies what is on screen and opens the mentor in a new tab. Needs signal.',
  base: 'Choose the base map: Topo, Satellite or Hybrid. Also 3D and contour line settings.',
  '3d': 'Tilt the land in 3D. Tap again for a flat map.',
  locate: 'Show where you are. GPS (Global Positioning System) works with no signal. Tap again and the map turns the way you face; again for north up.',
  layers: 'All hunting layers, one by one, plus the one tap layer sets.',
  keybtn: 'The map key: what each colour and line on screen right now means.',
  light: 'Legal light: minutes of legal shooting light left where you stand. Tap for the times and the rule.',
  turn: 'Turnaround: your safety turnaround time and the time left. Shows once you set one.',
  truck: 'Mark my truck: one tap saves where you parked. Then an arrow points back to it.',
  reset3d: 'North up and flat: back to a flat 2D map.',
  tiltup: 'Tilt the view more.', tiltdown: 'Tilt the view less.', rotl: 'Turn the map left.', rotr: 'Turn the map right.',
  offline: 'Save an area before you go, so the map works with no signal. Check, update or delete saved areas.',
  content: 'Your waypoints, lines, areas and tracks, in folders. Import and export map files.',
  tools: 'Can I hunt here now? and the other hunt helpers, waypoints, lines, measure and range rings.',
  insights: 'The MU (Management Unit) and legal light times at the map centre.',
  track: 'Record your route with distance, time and climb.',
  chip: 'Shown on the map: things you switched on, like range rings. Tap one to clear it.',
};
const NAMES = { light: 'Legal light chip', turn: 'Turnaround chip', truck: 'Mark my truck', keybtn: 'What am I looking at?', layers: 'Hunt Map Layers', centre: 'Elevation readout', locate: 'Show my location', '3d': '3D', base: 'Basemap', chip: 'Shown on the map chips' };
function keyOf(b) {
  if (b.dataset.act) return b.dataset.act;
  if (b.dataset.bar) return b.dataset.bar;
  if (b.dataset.f) return b.dataset.f;
  if (b.id && DESC[b.id]) return b.id;
  if (b.classList.contains('hmm-keybtn')) return 'keybtn';
  if (b.classList.contains('hm-ask')) return 'hm-ask';
  if (b.classList.contains('hmt-chip')) return 'chip';
  return '';
}
function rowHtml(b) {
  const k = keyOf(b), al = b.getAttribute('aria-label') || '', short = b.dataset.bar ? (b.querySelector('span') || {}).textContent : '';
  const name = NAMES[k] || al || b.textContent.trim();
  const svg = b.querySelector('svg'), txt = !svg ? (b.textContent.trim().split(/\s/)[0] || '').slice(0, 5) : '';
  const ic = svg ? svg.outerHTML.replace(/\s(width|height)="[^"]*"/g, '') : `<i>${esc(txt)}</i>`;
  const desc = DESC[k] || (al && al !== name ? al : '');
  return `<li class="hmh-row"><span class="hmh-ic" aria-hidden="true">${ic}</span><span><b>${esc(name)}${short && short !== name ? ` <small>(${esc(short)})</small>` : ''}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span></li>`;
}
function groupsHtml() {
  const all = (sel, scope = root) => [...scope.querySelectorAll(sel)];
  const used = new Set();
  const pick = (list) => list.filter((b) => { if (used.has(b)) return false; used.add(b); return true; });
  const ask = document.querySelector('.hm-ask'); // Ask the mentor (app.js), on the right while the map is open
  const groups = [
    ['Top of the map', pick(all('.hmm-row [data-act], .hmm-readout [data-act]'))],
    ['Right side', pick([...all('#hmm-stack-r button').filter((b) => !b.hidden), ...(ask && !ask.hidden ? [ask] : [])])],
    ['Bottom right', pick(all('.hmm-lowr button'))],
    ['Left side', pick([...all('.hmf-chip').filter((b) => !b.hidden), ...all('#hmm-stack-l button'), ...all('.hmm-keybtn, .hmm-layers')])],
    ['3D buttons (left side, only in 3D)', pick(all('.hmm-3d button'))],
    ['Bottom bar', pick(all('.hmm-bar [data-bar]'))],
    ['Shown on the map', pick(all('.hmt-chip').slice(0, 1))],
  ];
  return groups.filter(([, l]) => l.length).map(([t, l]) => `<h3 class="hmm-h">${esc(t)}</h3><ul class="hmh-list">${l.map(rowHtml).join('')}</ul>`).join('');
}
export function help() {
  if (ov) finish(true, true);
  const sets = (H.presets && H.presets.list) || [];
  const body = H.openSheet({ title: 'Help', tall: true, html: `
    <div class="hmm-banner">${esc(BANNER)}</div>
    <button type="button" class="hmh-tour" data-help="tour">Show me the tour again</button>
    <h3 class="hmm-h">The map buttons</h3>
    ${groupsHtml()}
    <h3 class="hmm-h">What the colours mean</h3>
    <p>Each hunting layer has its own colour. The key lists only what is on screen right now, in plain words.</p>
    ${sets.length ? `<ul class="hmh-sets">${sets.map((p) => `<li><b>${esc(p.name)}</b>${p.what ? `: ${esc(p.what)}` : ''}</li>`).join('')}</ul>` : ''}
    <button type="button" class="hmh-key" data-help="key">What am I looking at?</button>
    <h3 class="hmm-h">Gestures</h3>
    <ul class="hmh-sets">
      <li><b>Move</b>: drag with one finger.</li>
      <li><b>Zoom</b>: pinch two fingers apart or together, or double tap to zoom in.</li>
      <li><b>Tilt</b>: drag two fingers up or down together to tilt the land in 3D.</li>
      <li><b>Rotate</b>: twist two fingers. The north button puts north back at the top.</li>
      <li><b>Tap a spot</b>: a card about that spot.</li>
      <li><b>Press and hold</b>: choices for that spot: drop a waypoint, range rings, measure, Can I hunt here?</li>
    </ul>
    <h3 class="hmm-h">No signal (offline)</h3>
    <ul class="hmh-sets">
      <li>Before you go, open Offline Maps and save your hunt area. A saved hunt plan can also save its area in one tap.</li>
      <li>Saved areas keep the Topo map and terrain. Satellite pictures you have looked at stay for a while only.</li>
      <li>GPS (Global Positioning System), your blue dot, works with no signal. Your waypoints and tracks stay on this phone.</li>
      <li>Weather, Ask the mentor and new map areas need signal.</li>
      <li>Test it: turn on airplane mode at home and open your saved area.</li>
    </ul>
    <h3 class="hmm-h">The law</h3>
    <p>Can I hunt here now? and the layers are a study aid. They never give a certain yes. Check the BC Hunting and Trapping Regulations Synopsis and any closures before you hunt.</p>
    <div class="hmm-banner">${esc(BANNER)}</div>` });
  body.querySelector('[data-help="tour"]').onclick = () => { H.closeSheet(); setTimeout(start, 50); };
  body.querySelector('[data-help="key"]').onclick = () => { if (H.presets && H.presets.openKey) H.presets.openKey(); else H.toast('The map key is still loading. Try again in a moment.'); };
  return body;
}

// ---------- styles (this file only; colours from the map tokens) ----------
function injectCss() {
  if (document.getElementById('hm-tour-css')) return;
  const s = document.createElement('style'); s.id = 'hm-tour-css';
  s.textContent = `
#hmm-stack-r #hm-help-btn{order:9}
body.map-open:has(.hm-ask:not([hidden])) #hmm-stack-r:not(:has(.hma-btn)) #hm-help-btn{margin-top:52px}
.hmtour{position:fixed;inset:0;z-index:40;font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
.hmtour.dim{background:rgba(0,0,0,.62)}
.hmtour-hole{position:absolute;box-shadow:0 0 0 200vmax rgba(0,0,0,.62);outline:3px solid var(--hmm-accent,#e8590c);outline-offset:2px;pointer-events:none}
.hmtour-hole[hidden]{display:none}
.hmtour-card{position:absolute;left:16px;width:calc(100% - 32px);max-width:420px;box-sizing:border-box;padding:14px 14px 10px;border-radius:18px;background:var(--hmm-card,#fbfaf5);color:var(--hmm-ink,#1f211b);box-shadow:0 6px 24px rgba(0,0,0,.35)}
.hmtour-n{margin:0;font-size:14px;font-weight:700;color:var(--hmm-muted,#5d6152)}
.hmtour-card h2{margin:2px 0 4px;font-size:19px;line-height:1.25}
.hmtour-x{margin:0 0 8px;font-size:16px}
.hmtour-banner{margin:0 0 8px;padding:6px 10px;border-radius:10px;background:var(--hmm-warn-bg,#fff1e0);font-size:14px;font-weight:700}
.hmtour-banner[hidden]{display:none}
.hmtour-btns{display:flex;align-items:center;gap:8px}
.hmtour-sp{flex:1}
.hmtour button{min-height:44px;min-width:44px;padding:0 14px;border-radius:22px;font-weight:700;font-size:16px;line-height:1;font-family:inherit;cursor:pointer}
.hmtour button[hidden]{display:none}
.hmtour-skip{border:0;background:none;color:var(--hmm-ink,#1f211b);text-decoration:underline;padding:0 6px !important}
.hmtour-back{border:1.5px solid var(--hmm-line,#ddd6c4);background:var(--hmm-card,#fbfaf5);color:var(--hmm-ink,#1f211b)}
.hmtour-next{border:0;background:var(--hmm-accent,#e8590c);color:#fff;min-width:88px !important}
.hmtour button:focus-visible{outline:3px solid var(--hmm-ink,#1f211b);outline-offset:2px}
@media (prefers-reduced-motion:no-preference){.hmtour-hole{transition:left .25s ease,top .25s ease,width .25s ease,height .25s ease,border-radius .25s ease}.hmtour-card{transition:top .25s ease}}
.hmh-tour,.hmh-key{width:100%;min-height:48px;margin:10px 0 4px;border-radius:12px;font-weight:800;font-size:16px}
.hmm .hmh-tour{border:0;background:var(--hmm-accent);color:#fff}
.hmm .hmh-key{border:1.5px solid var(--hmm-accent);background:var(--hmm-card);color:var(--hmm-ink)}
.hmh-list{list-style:none;margin:4px 0;padding:0}
.hmh-row{display:grid;grid-template-columns:40px minmax(0,1fr);column-gap:12px;align-items:start;padding:9px 0;border-bottom:1px solid var(--hmm-line)}
.hmh-ic{width:40px;height:40px;border-radius:50%;background:var(--hmm-soft);display:grid;place-items:center;font-size:14px;overflow:hidden}
.hmh-ic svg{width:22px;height:22px}
.hmh-row b{display:block;font-size:16px;line-height:1.25}
.hmh-row small{display:block;font-size:14px;line-height:1.4;color:var(--hmm-muted);font-weight:400}
.hmh-row b small{display:inline;color:var(--hmm-muted)}
.hmh-sets{margin:4px 0 8px;padding-left:20px}.hmh-sets li{margin:5px 0;font-size:15px;line-height:1.4}`;
  document.head.appendChild(s);
}
