/* Hunt Map plugin: "Hunt helpers", four beginner tools in the Tools sheet.
     canhunt    Can I hunt here now? (hunt-canhunt.js): YES / NO / CHECK for a tapped point
     glass      Glassing spots and walk in zones (hunt-glass.js): from terrain and roads, worked out on the phone
     scent      Wind, scent cone and thermals with an hour slider (tools-wind.js, H.scentPanel)
     sightings  Sightings log and heatmap (hunt-sightings.js): saved on this phone, CSV export
   Deep links: #/map/tool/canhunt, #/map/tool/glass, #/map/tool/scent, #/map/tool/sightings (core.js open()).
   Joins the Tools sheet by wrapping H.tools.toolsSheet (like tools-terrain.js). Sets H.hunt = { open(name, p), pick(msg) }. */
import { esc } from './util.js';
import * as ui from './hunt-ui.js';

// each tool is its own module, loaded here (a tool that fails to load leaves the others working)
const MODS = { canhunt: './hunt-canhunt.js', glass: './hunt-glass.js', sightings: './hunt-sightings.js' };
const mods = {};

let H, map;
const IC = {
  canhunt: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="4"/><circle cx="12" cy="7" r="2" fill="#c62828" stroke="none"/><circle cx="12" cy="12" r="2" fill="#b26a00" stroke="none"/><circle cx="12" cy="17" r="2" fill="#2e7d32" stroke="none"/></svg>',
  glass: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="15" r="4"/><circle cx="17" cy="15" r="4"/><path d="M11 15h2M5 11l2-6h2M19 11l-2-6h-2"/></svg>',
  scent: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><path d="M7 11 21 5v14L7 13" fill="#7b2cbf" fill-opacity=".25"/><path d="M12 20c1-2 3-2 4 0" stroke="#d6336c"/></svg>',
  sightings: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/><path d="M19 3v4M17 5h4"/></svg>',
};
export const TOOLS = [
  ['canhunt', 'Can I hunt here now?', 'Yes, no or check'],
  ['glass', 'Glassing and walk in', 'High points, quiet land'],
  ['scent', 'Scent and thermals', 'Wind by the hour'],
  ['sightings', 'Sightings log', 'Log, heatmap, export'],
];

export default function init(api) {
  H = api; map = H.map;
  loadCss();
  hookTools();
  ui.setH(H);
  H.onClick(ui.onPickTap);
  H.hunt = { open, pick: ui.pick, IC };
  for (const [k, u] of Object.entries(MODS)) {
    mods[k] = import(u).then((m) => { m.init(H); return m; });
    mods[k].catch((err) => console.warn('Hunt helper failed', k, err));
  }
  Promise.allSettled(Object.values(mods)).then(() => H.emit && H.emit('hunt-ready'));
}

function loadCss() {
  const href = new URL('./hunt.css', import.meta.url).href;
  if ([...document.styleSheets].some((s) => s.href === href)) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
}

export async function open(name, p) {
  if (mods[name]) {
    let m; try { m = await mods[name]; } catch (err) { H.toast('This tool did not load. Reload the app with signal.', 4000); return null; }
    return name === 'canhunt' ? m.open(p) : m.open();
  }
  if (name === 'scent') { if (typeof H.scentPanel === 'function') return H.scentPanel(p); H.toast('The wind tool is still loading. Try again in a moment.', 3500); return null; }
  return null;
}

export function sectionHtml() {
  return `<h3 class="hmm-h">Hunt helpers</h3>
    <div class="hmt-tiles hh-tiles">${TOOLS.map(([k, l, s]) => `<button class="hmt-tile" data-hh="${k}">${IC[k]}<span>${esc(l)}<small>${esc(s)}</small></span></button>`).join('')}</div>`;
}
function wire(body) { body.querySelectorAll('[data-hh]').forEach((b) => b.onclick = () => open(b.dataset.hh)); }
function hookTools() {
  const tools = H.tools, orig = tools && tools.toolsSheet;
  if (typeof orig !== 'function') { H.addButton({ id: 'hh-btn', icon: IC.canhunt, label: 'Hunt helpers', where: 'right', onClick: () => { const b = H.openSheet({ title: 'Hunt helpers', html: sectionHtml() }); wire(b); } }); return; }
  const wrapped = (...a) => {
    const r = orig.apply(tools, a);
    const body = H.els && H.els.sheetB;
    if (body && !body.querySelector('.hh-tiles')) {
      const box = document.createElement('div'); box.innerHTML = sectionHtml();
      box.className = 'hh-tools';
      body.insertBefore(box, body.firstChild); // first in the sheet: these are the ones a beginner needs most
      wire(body);
    }
    return r;
  };
  tools.toolsSheet = wrapped;
  H.setBarAction('tools', wrapped);
}

