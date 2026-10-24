/* Hunt Map: small shared helpers for the hunt tools (tools-hunt.js and hunt-*.js). No imports of the tools, so no import cycles. */
import { esc } from './util.js';

let H = null, map = null;
export function setH(api) { H = api; map = api.map; }
// ---------- shared: "what this tells you" and "how to use it" ----------
export function intro(what, steps) {
  return `<p class="hh-what"><b>What this tells you:</b> ${what}</p>
    <details class="hh-how"><summary>How to use it</summary><ol>${steps.map((s) => `<li>${s}</li>`).join('')}</ol></details>`;
}

// ---------- shared: pick a point by tapping the map ----------
let picking = null, pickChip = null;
export function pick(msg) {
  cancelPick();
  return new Promise((res) => {
    picking = res;
    H.closeSheet();
    pickChip = document.createElement('div'); pickChip.className = 'hh-pick'; pickChip.setAttribute('role', 'status');
    pickChip.innerHTML = `<span>${esc(msg)}</span><button type="button" class="hmm-btn2">Cancel</button>`;
    pickChip.querySelector('button').onclick = () => { const f = picking; cancelPick(); if (f) f(null); };
    H.els.bar.parentNode.appendChild(pickChip);
  });
}
function cancelPick() { picking = null; if (pickChip) { pickChip.remove(); pickChip = null; } }
export function onPickTap(e) {
  if (!picking) return false;
  const f = picking; cancelPick(); f([e.lngLat.lng, e.lngLat.lat]);
  return true;
}
export function here(which) {
  if (which === 'gps') {
    const p = H.lastPosition;
    if (!p) { H.toast('No GPS (Global Positioning System) fix yet. Tap the locate button first, then try again.', 4500); return null; }
    return [p.lng, p.lat];
  }
  const c = map.getCenter(); return [c.lng, c.lat];
}
/** Short sheet (55% of the screen) so the map stays tappable above it. Cleared when the sheet closes. */
export function peek(onClose) {
  queueMicrotask(() => H.els.sheet.classList.add('hh-peek')); // after openSheet, which first runs the previous sheet's onClose
  return () => { H.els.sheet.classList.remove('hh-peek'); if (onClose) onClose(); };
}
export const TIP = '<span class="hmm-cert tip">Tip</span>';
export const BANNER = '<div class="hmm-banner">Study aid only. The official regulations are the law.</div>';
