// Picture how tos for every app feature (prompts/2026-10-23-pictures-for-everything.md, Part 1).
// Writes data/addons/howto/howto.json and one SVG per step in data/addons/howto/svg/ (precached with the add on data).
// Run: node scripts/build-howto.mjs   (zero dependencies; the map button icons come from app/map/icons.js)
//
// Each picture: 400 by 300, a phone drawn at about two thirds of a 360 px wide screen, the real button shapes, icons
// and places, and a numbered blaze circle on the thing to tap. Screen parts are drawn in screen pixels (360 by 760)
// inside a scaled group, so every text is at least 21 screen px = 14 px in the picture.
// Words: only what the app itself says (button labels, screen titles, the feature's own help text).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from '../app/map/icons.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/addons/howto');
const SVG_DIR = path.join(OUT, 'svg');

// ---------- design colours (style.css tokens) ----------
const C = {
  spruce: '#1F3D2B', lichen: '#EEF1EA', blaze: '#FF6A13', ink: '#17201A', muted: '#5B665E', line: '#D5DBD2', white: '#FFFFFF',
  warn: '#FFF1E8', red: '#C62828', ok: '#2E7D32', okBg: '#DCEADF', map: '#E3E8D8', water: '#A8CCDD', contour: '#C9B79A',
  green: '#7BC67E', grey: '#B9BDB5', yellow: '#F2D23C', orange: '#F08A24', sred: '#D63A2F', chromeMuted: '#C3D0C6', btn: '#FFFFFF',
};
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- geometry: phone on a 400 by 300 canvas ----------
const K = 244 / 360; // screen px to canvas px
const PX = 78, PY = 14; // top left of the screen glass on the canvas when the view starts at screen y 0
const VIEW_H = Math.round((300 - PY) / K); // screen px that fit under the top bezel: 422
let OFF = 0; // screen y at the top of the visible window
const cx = (x) => PX + x * K;
const cy = (y) => PY + (y - OFF) * K;

// ---------- text with a width check (estimates; the PNG check is the final word) ----------
const warnings = [];
let CUR = '';
const est = (s, size, bold) => String(s).length * size * (bold ? 0.6 : 0.56);
function T(x, y, s, { size = 21, w = 400, fill = C.ink, anchor = 'start', max = 0, ls = 0 } = {}) {
  if (size < 21) throw new Error(`${CUR}: text under 21 screen px: ${s}`);
  const fit = max && est(s, size, w >= 600) > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${w}" fill="${fill}" text-anchor="${anchor}"${ls ? ` letter-spacing="${ls}"` : ''}${fit}>${esc(s)}</text>`;
}
const R = (x, y, w, h, { r = 0, fill = 'none', stroke = 'none', sw = 2, dash = '' } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
// a map icon from app/map/icons.js at (x, y), size s, colour col
function icon(name, x, y, s = 28, col = C.ink) {
  const src = ICONS[name];
  if (!src) throw new Error('no icon ' + name);
  const inner = src.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const attrs = (src.match(/^<svg([^>]*)>/) || ['', ''])[1].replace(/\s(width|height|aria-hidden|focusable)="[^"]*"/g, '');
  return `<svg x="${x}" y="${y}" width="${s}" height="${s}"${attrs} color="${col}" style="color:${col}">${inner}</svg>`;
}
// small line icons drawn here (24 by 24 grid), for app buttons that use glyphs
const GLYPH = {
  back: '<path d="M20 12H5M11 5l-7 7 7 7"/>',
  pin: '<circle cx="12" cy="9" r="5"/><path d="M12 14v8"/>',
  home: '<path d="M3 11 12 3l9 8M6 9v11h12V9"/>',
  learn: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  field: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
  map: '<path d="M9 4.5 15 7l6-2.5v14.5L15 21.5 9 19l-6 2.5V7Z"/><path d="M9 4.5V19M15 7v14.5"/>',
  lists: '<path d="M5 12.5 10 17l9-10"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  play: '<path d="M7 4v16l13-8Z" fill="currentColor"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/>',
  dots3: '<circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".8" fill="currentColor"/>',
  q: '<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4.1"/><circle cx="12" cy="17.6" r=".6" fill="currentColor"/>',
  sun: '<circle cx="12" cy="14" r="4"/><path d="M12 5v2M5 14H3M21 14h-2M6.5 8.5 5 7M17.5 8.5 19 7M3 19h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M12 3 19 20l-7-3.6L5 20Z" fill="currentColor"/>',
  chat: '<path d="M4 5h16v11H9l-5 4Z"/>',
  analyze: '<rect x="3.5" y="3.5" width="17" height="17" rx="2" stroke-dasharray="3 2"/><path d="M7 16l4-4 3 3 4-5"/>',
  phone: '<path d="M6 3h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2Z"/>',
  check: '<path d="M5 12.5 10 17l9-10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor"/>',
  file: '<path d="M6 2h8l5 5v15H6Z"/><path d="M14 2v5h5"/>',
  speaker: '<path d="M4 9h4l5-4v14l-5-4H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  nosignal: '<path d="M3 3l18 18"/><path d="M5 12.5a10 10 0 0 1 4-2.3M8.5 16a5 5 0 0 1 4.5-1.3M2 9a15 15 0 0 1 6-3.4M16 10a10 10 0 0 1 3 2.5"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor"/>',
};
function glyph(name, x, y, s = 28, col = C.ink, sw = 2.2) {
  return `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" color="${col}" style="color:${col}">${GLYPH[name]}</svg>`;
}

// ---------- app parts (screen px) ----------
function topbar(title) {
  title = title.length > 15 ? title.slice(0, 14).trim() + '…' : title;
  return R(0, 0, 360, 60, { fill: C.spruce }) + glyph('back', 18, 16, 28, C.white) +
    T(62, 39, title.toUpperCase(), { size: 23, w: 700, fill: C.white, max: 240, ls: 0.5 }) + glyph('pin', 314, 16, 28, C.white);
}
const banner = () => R(0, 60, 360, 44, { fill: C.warn }) + T(16, 89, 'Study aid only.', { size: 21, fill: C.ink });
const TABS = [['home', 'Home'], ['learn', 'Learn'], ['field', 'Field'], ['map', 'Map'], ['lists', 'Lists'], ['more', 'More']];
function tabs(active) {
  let s = R(0, 692, 360, 68, { fill: C.spruce });
  TABS.forEach(([k, label], i) => {
    const x = i * 60 + 30, on = k === active;
    if (on) s += R(x - 26, 700, 52, 30, { r: 15, fill: C.lichen });
    s += glyph(k, x - 12, 703, 24, on ? C.spruce : C.chromeMuted, 2.2);
    if (on) s += T(x, 752, label, { size: 21, w: 800, fill: C.white, anchor: 'middle' });
  });
  return s;
}
// an app screen: title bar, legal banner, body, tabs
const app = (title, tab, body, { noBanner = false } = {}) => R(0, 0, 360, 760, { fill: C.lichen }) + body + topbar(title) + (noBanner ? '' : banner()) + tabs(tab);
const card = (x, y, w, h, inner = '', { stroke = C.line, sw = 2, fill = C.white } = {}) => R(x, y, w, h, { r: 14, fill, stroke, sw }) + inner;
// buttons: dark (spruce), outline, blaze (the one next action), light
function btn(x, y, w, h, label, kind = 'outline', { size = 21, sub = '' } = {}) {
  const fill = { dark: C.spruce, outline: C.white, blaze: C.blaze, light: C.white, red: C.red }[kind];
  const ink = { dark: C.white, outline: C.ink, blaze: C.ink, light: C.ink, red: C.white }[kind];
  const stroke = kind === 'outline' ? C.spruce : kind === 'light' ? C.line : 'none';
  const ls = String(label).split('|');
  const ty = sub ? y + h / 2 - 4 : y + h / 2 + size * 0.36 - (ls.length - 1) * size * 0.55;
  return R(x, y, w, h, { r: 12, fill, stroke, sw: 2.5 }) + ls.map((l, i) => T(x + w / 2, ty + i * size * 1.1, l, { size, w: 700, fill: ink, anchor: 'middle', max: w - 12 })).join('') +
    (sub ? T(x + w / 2, y + h / 2 + 22, sub, { size: 21, fill: ink, anchor: 'middle', max: w - 12 }) : '');
}
// a list button with text on the left (Safety hub, Field cards)
function rowBtn(x, y, w, h, label, kind = 'outline', { sub = '', size = 23 } = {}) {
  const fill = { dark: C.spruce, outline: C.white, blaze: C.blaze }[kind];
  const ink = kind === 'dark' ? C.white : C.ink;
  return R(x, y, w, h, { r: 14, fill, stroke: kind === 'outline' ? C.spruce : 'none', sw: 2.5 }) +
    T(x + 18, y + (sub ? 36 : h / 2 + 8), label, { size, w: 700, fill: ink, max: w - 30 }) + (sub ? T(x + 18, y + 66, sub, { size: 21, fill: kind === 'outline' ? C.muted : ink, max: w - 30 }) : '');
}
// grey lines that stand for text the picture does not need
const lines = (x, y, w, n, gap = 24) => Array.from({ length: n }, (_, i) => R(x, y + i * gap, i === n - 1 ? w * 0.6 : w, 10, { r: 5, fill: C.line })).join('');
const H = (x, y, s, size = 24, max = 320, fill = C.ink) => T(x, y, s, { size, w: 700, fill, max });
const P = (x, y, s, max = 320, fill = C.muted) => T(x, y, s, { size: 21, fill, max });
const check = (x, y, on) => R(x, y, 30, 30, { r: 6, fill: on ? C.spruce : C.white, stroke: C.spruce, sw: 2.5 }) + (on ? glyph('check', x + 3, y + 3, 24, C.white, 3) : '');
const toggle = (x, y, on) => R(x, y, 52, 30, { r: 15, fill: on ? C.spruce : C.grey }) + `<circle cx="${on ? x + 37 : x + 15}" cy="${y + 15}" r="12" fill="${C.white}"/>`;
const cert = (x, y, v) => R(x, y, 70, 28, { r: 6, fill: C.spruce }) + T(x + 35, y + 21, `${v}%`, { size: 21, w: 700, fill: C.white, anchor: 'middle' });

// ---------- the Hunt Map (screen px, from the real chrome in app/map/core.js and map.css) ----------
function mapBg() {
  return R(0, 0, 360, 760, { fill: C.map }) +
    `<path d="M-10 250 C 60 220 120 300 200 270 S 330 220 380 260" fill="none" stroke="${C.contour}" stroke-width="2"/>` +
    `<path d="M-10 300 C 70 270 120 350 210 320 S 330 270 380 310" fill="none" stroke="${C.contour}" stroke-width="2"/>` +
    `<path d="M-10 420 C 50 400 140 460 220 430 S 320 400 380 440" fill="none" stroke="${C.contour}" stroke-width="2"/>` +
    `<path d="M150 470 C 190 440 260 450 280 500 S 230 580 180 560 S 120 500 150 470Z" fill="${C.water}"/>` +
    `<path d="M40 330 L 300 360" stroke="${C.ink}" stroke-width="2" stroke-dasharray="10 7" opacity=".5"/>`;
}
const circleBtn = (x, y, inner) => `<circle cx="${x}" cy="${y}" r="23" fill="${C.btn}" stroke="${C.line}" stroke-width="1.5"/>` + inner;
function mapChrome({ chips = true, bar = '', layersBtn = true, key = true } = {}) {
  let s = '';
  s += circleBtn(35, 33, icon('menu', 21, 19, 28)) + circleBtn(91, 33, icon('profile', 77, 19, 28)) + circleBtn(325, 33, icon('search', 311, 19, 28));
  s += T(196, 41, 'HUNT MAP', { size: 21, w: 800, fill: C.spruce, anchor: 'middle', ls: 1 });
  s += circleBtn(325, 107, icon('weather', 311, 93, 28)) + circleBtn(325, 169, glyph('chat', 312, 156, 26)) + circleBtn(325, 219, glyph('analyze', 312, 206, 26)) + circleBtn(325, 279, glyph('q', 311, 265, 28, C.ink, 2.4));
  if (chips) {
    s += R(12, 140, 262, 44, { r: 22, fill: C.btn }) + glyph('sun', 22, 148, 26, C.muted) + T(56, 170, 'Legal light 45 min', { size: 21, w: 700, max: 210 });
    s += R(12, 192, 214, 52, { r: 26, fill: C.btn }) + icon('car', 20, 204, 28) + T(56, 226, 'Mark my truck', { size: 21, w: 700, max: 160 });
  }
  if (key) s += R(12, 534, 262, 44, { r: 22, fill: C.btn }) + glyph('info', 22, 543, 26, C.blaze) + T(54, 564, 'What am I looking at?', { size: 21, w: 400, max: 208 });
  if (layersBtn) s += R(12, 594, 150, 58, { r: 16, fill: C.btn }) + R(19, 601, 44, 44, { r: 10, fill: '#E4572E' }) + icon('layers', 27, 609, 28, C.white) + T(72, 642, 'Layers', { size: 23, w: 700 }) + `<circle cx="152" cy="600" r="14" fill="#E4572E"/>` + T(152, 608, '11', { size: 21, w: 700, fill: C.white, anchor: 'middle' });
  s += R(284, 492, 64, 100, { r: 18, fill: C.btn }) + T(316, 524, 'Topo', { size: 21, w: 700, anchor: 'middle' }) + T(316, 575, '3D', { size: 22, w: 700, anchor: 'middle' });
  s += circleBtn(316, 629, icon('locate', 302, 615, 28));
  s += R(10, 684, 340, 66, { r: 22, fill: C.btn, stroke: C.line, sw: 1.5 });
  [['offline', 48], ['content', 114], ['tools', 180], ['insights', 246], ['track', 312]].forEach(([k, x]) => {
    if (k === bar) s += R(x - 32, 690, 64, 54, { r: 16, fill: C.lichen, stroke: C.spruce, sw: 1.5 });
    s += icon(k, x - 15, 702, 30);
  });
  return s;
}
const mapScreen = (opts = {}, extra = '') => mapBg() + (opts.under || '') + mapChrome(opts) + extra;
// a bottom sheet over the map, from screen y top
function sheet(top, title, body = '', { x = true } = {}) {
  return `<rect x="0" y="${top}" width="360" height="${800 - top}" rx="24" fill="${C.white}" stroke="${C.line}" stroke-width="1.5"/>` + R(158, top + 10, 44, 6, { r: 3, fill: C.line }) +
    T(18, top + 48, title, { size: 24, w: 700, max: 290 }) + (x ? icon('close', 318, top + 26, 28) : '') + body;
}

// ---------- tap marks (canvas px, so they keep their size) ----------
// box: [x, y, w, h] in screen px of the thing to tap; n: step number; at: where the number sits ('tl','tr','bl','br','l','r')
const MARKS = [];
function mark(n, box, o = {}) { MARKS.push([n, box, o]); return `@@M${MARKS.length - 1}@@`; }
function drawMark(n, box, { at = 'tl', round = 0, label = '' } = {}) {
  const [x, y, w, h] = box;
  const X = cx(x), Y = cy(y), W = w * K, Hh = h * K;
  const rr = round ? Math.min(W, Hh) / 2 : 8;
  let s = `<rect x="${(X - 4).toFixed(1)}" y="${(Y - 4).toFixed(1)}" width="${(W + 8).toFixed(1)}" height="${(Hh + 8).toFixed(1)}" rx="${(rr + 4).toFixed(1)}" fill="none" stroke="${C.blaze}" stroke-width="4"/>`;
  const pos = { tl: [X - 6, Y - 6], tr: [X + W + 6, Y - 6], bl: [X - 6, Y + Hh + 6], br: [X + W + 6, Y + Hh + 6], l: [X - 22, Y + Hh / 2], r: [X + W + 22, Y + Hh / 2] }[at];
  const [mx, my] = [Math.max(17, Math.min(383, pos[0])), Math.max(17, Math.min(283, pos[1]))];
  s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="16" fill="${C.blaze}" stroke="${C.white}" stroke-width="3"/>` +
    `<text x="${mx.toFixed(1)}" y="${(my + 6).toFixed(1)}" font-size="18" font-weight="800" fill="${C.ink}" text-anchor="middle">${n}</text>`;
  if (label) s += callout(label, mx, my);
  return s;
}
// a short label beside the phone (canvas px), on the side the number is on
function callout(label, mx, my) {
  const left = mx < 200;
  const parts = String(label).split('|');
  const w = Math.max(...parts.map((p) => p.length)) * 8.4 + 16;
  const x = left ? Math.max(2, Math.min(mx - w / 2, 66 - w)) : Math.min(398 - w, Math.max(mx - w / 2, 334));
  const y = my + 22;
  const hh = parts.length * 18 + 10;
  return R(x.toFixed(1), y.toFixed(1), w.toFixed(1), hh, { r: 8, fill: C.white, stroke: C.blaze, sw: 2 }) +
    parts.map((p, i) => `<text x="${(x + w / 2).toFixed(1)}" y="${(y + 19 + i * 18).toFixed(1)}" font-size="14" font-weight="700" fill="${C.ink}" text-anchor="middle">${esc(p)}</text>`).join('');
}
// a note on the canvas (canvas px), for pictures that show a result rather than a tap
const note = (x, y, s, { anchor = 'start', fill = C.ink, size = 14, w = 700 } = {}) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${w}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;

// ---------- one picture ----------
// screen: screen px drawing; off: screen y at the top of the window ('top' 0, 'bottom' 338, or a number); marks: canvas px drawing
function picture(id, label, screen, { off = 0, marks = '', side = '' } = {}) {
  CUR = id;
  OFF = off === 'bottom' ? 760 - VIEW_H : off === 'mid' ? 170 : off;
  const clip = `${id}-scr`;
  const ph = 760 * K + 16, py = PY - 8 - OFF * K;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" role="img" aria-label="${esc(label)}" font-family="${FONT}">
<title id="${id}-title">${esc(label)}</title>
<defs><clipPath id="${clip}"><rect x="${PX}" y="${(PY - OFF * K).toFixed(1)}" width="244" height="${(760 * K).toFixed(1)}" rx="16"/></clipPath></defs>
<rect width="400" height="300" rx="18" fill="${C.lichen}"/>
<rect x="${PX - 8}" y="${py.toFixed(1)}" width="260" height="${ph.toFixed(1)}" rx="28" fill="${C.ink}"/>
<g clip-path="url(#${clip})"><g transform="translate(${PX} ${(PY - OFF * K).toFixed(2)}) scale(${K.toFixed(5)})">${screen}</g></g>
${side.replace(/@@M(\d+)@@/g, (_, i) => drawMark(...MARKS[+i]))}${marks.replace(/@@M(\d+)@@/g, (_, i) => drawMark(...MARKS[+i]))}
</svg>
`;
}

// ---------- reusable scenes ----------
// Home: top of the screen, with the plan cards and the quick links lower down
function homeTop({ newHere = true, study = false, plan = true } = {}) {
  let b = '';
  b += T(18, 145, 'NEXT HUNT', { size: 21, w: 700, fill: C.muted, ls: 1 }) + H(18, 190, 'Today', 34) + T(196, 145, 'LEGAL LIGHT', { size: 21, w: 700, fill: C.muted, ls: 1 }) + H(196, 190, '7:04 p.m.', 28);
  let y = 214;
  if (newHere) { b += card(16, y, 328, 160, H(34, y + 38, 'New here?') + btn(34, y + 62, 140, 62, 'How to use|this app', 'dark') + btn(186, y + 66, 140, 52, 'Hide', 'outline')); y += 176; }
  if (study) { b += card(16, y, 328, 220, T(34, y + 36, "TODAY'S STUDY", { size: 21, w: 700, fill: C.muted, ls: 1 }) + H(34, y + 74, 'Black tailed deer') + lines(34, y + 96, 280, 2) + btn(34, y + 146, 292, 56, "Read today's 9 screens", 'blaze')); y += 236; }
  if (plan) { b += card(16, y, 328, 250, H(34, y + 42, 'Plan a hunt', 28) + lines(34, y + 64, 280, 2) + btn(34, y + 112, 292, 56, 'Plan a hunt', 'dark') + btn(34, y + 176, 140, 64, 'With my|brother', 'outline') + btn(186, y + 176, 140, 64, 'Solo', 'outline')); y += 266; }
  return app('Hunt Mentor', 'home', b);
}
// Home quick links (lower part of Home)
function homeLinks() {
  const L = [['Map', 'Can I hunt|here?'], ['Field Mode', 'Safety'], ['Practice', 'Ask the|mentor'], ['Checklists', 'My hunt|plans']];
  let b = card(16, 120, 328, 160, H(34, 160, 'Legal light today') + lines(34, 184, 280, 3));
  L.forEach(([a, c], i) => { b += btn(16, 300 + i * 70, 158, 60, a, 'outline') + btn(186, 300 + i * 70, 158, 60, c, 'outline'); });
  return app('Hunt Mentor', 'home', b);
}
const QL = { Map: [16, 300], 'Can I hunt here?': [186, 300], 'Field Mode': [16, 370], Safety: [186, 370], Practice: [16, 440], 'My hunt plans': [186, 510] };
const qlBox = (k) => [QL[k][0], QL[k][1], 158, 60];
// More: list of items
function moreScreen(items, { y0 = 130 } = {}) {
  let b = card(16, y0, 328, items.length * 74 + 10, items.map((t, i) => (i ? R(34, y0 + 5 + i * 74, 292, 1.5, { fill: C.line }) : '') + T(34, y0 + 50 + i * 74, t, { size: 22, max: 292 })).join(''));
  return app('More', 'more', b);
}
const moreBox = (i, y0 = 130) => [20, y0 + 8 + i * 74, 320, 66];
// Safety hub
function safetyHub() {
  let b = R(16, 122, 328, 110, { r: 16, fill: C.red }) + T(180, 172, 'Call 911', { size: 34, w: 800, fill: C.white, anchor: 'middle' }) + T(180, 208, 'Emergency', { size: 21, w: 700, fill: C.white, anchor: 'middle' });
  [['Emergency card', 248], ['Trip plan', 348], ['Turnaround alarm', 448], ['Bears and cougars', 548]].forEach(([t, y]) => { b += rowBtn(16, y, 328, 88, t, 'outline', { sub: '' }); });
  return app('Safety', 'home', b);
}
const SH = { 'Emergency card': 248, 'Trip plan': 348, 'Turnaround alarm': 448, 'Bears and cougars': 548 };
const shBox = (k) => [16, SH[k], 328, 88];
// Field Mode hub
function fieldHub() {
  const cells = [['Shot taken:', 'guide me', 'blaze', 16, 122], ['Legal to', 'shoot?', 'blaze', 186, 122], ['Legal light', '', 'dark', 16, 264], ['Emergency', '', 'blaze', 186, 264], ['Tag it', '', 'dark', 16, 406], ['After the', 'shot', 'dark', 186, 406]];
  let b = '';
  cells.forEach(([a, c, k, x, y]) => { b += R(x, y, 158, 128, { r: 14, fill: k === 'blaze' ? C.blaze : C.spruce }) + T(x + 16, y + 40, a, { size: 23, w: 700, fill: k === 'blaze' ? C.ink : C.white, max: 130 }) + (c ? T(x + 16, y + 70, c, { size: 23, w: 700, fill: k === 'blaze' ? C.ink : C.white, max: 130 }) : ''); });
  return app('Field Mode', 'field', b);
}
// Tools sheet over the map
function toolsSheet() {
  const cells = [['Can I hunt', 'here now?', 18, 300], ['Where can', 'I hunt?', 186, 300], ['Glassing', 'walk in', 18, 410], ['Scent', 'thermals', 186, 410]];
  let b = T(18, 270, 'HUNT HELPERS', { size: 21, w: 700, fill: C.muted, ls: 1 });
  cells.forEach(([a, c, x, y]) => { b += R(x, y, 156, 96, { r: 12, fill: C.white, stroke: C.line, sw: 2 }) + T(x + 14, y + 38, a, { size: 21, w: 700, max: 132 }) + T(x + 14, y + 66, c, { size: 21, w: 700, max: 132 }); });
  return mapScreen({ bar: 'tools', chips: false }, sheet(190, 'Tools', b));
}
const TOOL = { canhunt: [18, 300, 156, 96], where: [186, 300, 156, 96] };
// Hunt Map Layers sheet: basemaps, the 3 sets, the key button
function layersSheet({ set = 'Scouting', rows = false } = {}) {
  let b = '';
  ['Topo', 'Satellite', 'Hybrid'].forEach((t, i) => { const x = 18 + i * 114; b += R(x, 175, 100, 66, { r: 10, fill: i === 0 ? '#DDE6CF' : '#4B5B3E', stroke: i === 0 ? C.blaze : 'none', sw: 3 }) + T(x + 50, 268, t, { size: 21, anchor: 'middle' }); });
  ['Clean', 'Scouting', 'Hunt day'].forEach((t, i) => { const x = 18 + i * 110; const on = t === set; b += R(x, 288, 102, 52, { r: 10, fill: on ? '#E8590C' : C.white, stroke: on ? 'none' : C.line, sw: 2 }) + T(x + 51, 322, t, { size: 21, w: 700, fill: on ? C.white : C.ink, anchor: 'middle' }); });
  b += R(18, 394, 324, 48, { r: 10, fill: C.white, stroke: C.blaze, sw: 2 }) + glyph('info', 34, 405, 26, C.blaze) + T(70, 426, 'What am I looking at?', { size: 21, max: 260 });
  if (rows) b += rows;
  return sheet(106, 'Hunt Map Layers', b);
}
const SETS = { Clean: [18, 288, 102, 52], Scouting: [128, 288, 102, 52], 'Hunt day': [238, 288, 102, 52] };
const layerRow = (y, sw, name, on, { swatch = '' } = {}) => (swatch || R(18, y, 34, 34, { r: 6, fill: sw, stroke: C.ink, sw: 1.5 })) + T(66, y + 25, name, { size: 22, w: 700, max: 170 }) + glyph('info', 240, y + 3, 28) + toggle(286, y + 2, on);
// Hunt day sheet (the chips' sheet, map/hunt-field.js)
function huntDaySheet(part) {
  let b = '';
  if (part === 'truck') {
    b += H(18, 320, 'Back to the truck', 23) + `<g transform="translate(40 340)"><circle cx="40" cy="40" r="40" fill="${C.lichen}"/>` + glyph('arrow', 14, 14, 52, C.spruce) + '</g>' + T(140, 375, '1.2 km', { size: 28, w: 700 }) + P(140, 405, 'walk back time', 190);
    b += btn(18, 440, 156, 52, 'Show on map', 'light') + btn(186, 440, 156, 52, 'Compass', 'light') + btn(18, 504, 156, 52, 'Move truck', 'light') + btn(186, 504, 156, 52, 'Remove', 'light');
  } else {
    b += H(18, 320, 'Turnaround', 23) + P(18, 350, 'Walk out time (minutes)', 320) + R(18, 364, 150, 52, { r: 10, fill: C.white, stroke: C.line, sw: 2 }) + T(36, 399, '60', { size: 23 });
    b += P(18, 440, 'Or pick a time', 320) + R(18, 456, 180, 52, { r: 10, fill: C.white, stroke: C.line, sw: 2 }) + T(36, 491, '4:30 p.m.', { size: 21 }) + btn(212, 456, 130, 52, 'Start', 'light');
  }
  return mapScreen({ chips: true }, sheet(214, 'Hunt day', b));
}
// a lesson screen (Read aloud bar)
function lessonScreen() {
  let b = R(16, 122, 328, 8, { r: 4, fill: C.line }) + R(16, 122, 60, 8, { r: 4, fill: C.spruce });
  b += R(16, 216, 218, 50, { r: 12, fill: C.white, stroke: C.line, sw: 2 }) + glyph('play', 30, 229, 22, C.ink) + T(62, 249, 'Read aloud', { size: 21, w: 700 });
  b += R(244, 216, 48, 50, { r: 12, fill: C.white, stroke: C.line, sw: 2 }) + T(268, 249, '1×', { size: 21, w: 700, anchor: 'middle' });
  b += R(300, 216, 44, 50, { r: 12, fill: C.white, stroke: C.line, sw: 2 }) + glyph('sliders', 309, 228, 26);
  b += R(16, 146, 140, 50, { r: 25, fill: C.white, stroke: C.line, sw: 2 }) + T(36, 179, 'Contents', { size: 21, w: 700 }) + T(180, 179, 'Screen 2 of 12', { size: 21, w: 700, max: 170 });
  b += H(16, 316, 'Your Harrison deer', 28) + H(16, 350, 'hunt', 28) + lines(16, 380, 320, 5, 30);
  b += btn(16, 630, 158, 52, 'Back', 'outline') + btn(186, 630, 158, 52, 'Next', 'blaze');
  return app('Lesson', 'learn', b);
}
// Today's cards
function cardsScreen({ flipped = false } = {}) {
  let b = P(16, 145, 'Card 1 of 10', 320);
  b += R(16, 160, 218, 50, { r: 12, fill: C.white, stroke: C.line, sw: 2 }) + glyph('play', 30, 173, 22) + T(62, 193, 'Read aloud', { size: 21, w: 700 });
  b += card(16, 226, 328, 220, flipped ? H(34, 270, 'ACTS', 26) + lines(34, 300, 280, 4, 28) : H(34, 270, 'ACTS', 26) + P(34, 310, 'Tap to flip', 280));
  b += btn(16, 462, 158, 54, 'Missed it', 'outline') + btn(186, 462, 158, 54, 'Knew it', 'dark') + btn(16, 530, 328, 54, 'Stop for now', 'outline');
  return app("Today's cards", 'home', b);
}
// a plan page (top)
function planTop({ tabsOn = '' } = {}) {
  let b = T(18, 148, 'HUNT IS ON', { size: 21, w: 700, fill: C.muted, ls: 1 }) + H(18, 190, 'Now', 34) + btn(16, 214, 328, 56, 'Study today: 9 screens', 'blaze');
  b += card(16, 290, 328, 230, H(34, 330, 'Black tailed deer', 26) + P(34, 368, 'Where  MU 2-18', 290) + P(34, 404, 'When  7 days', 290) + btn(34, 430, 140, 50, 'Share', 'outline') + btn(186, 430, 140, 50, 'Print', 'outline'));
  return app('Black tailed deer', 'home', b);
}
// plan parts strip: 1 Legal ... 5 Study
function planParts(on = '1 Legal') {
  const parts = [['1', 16, 48], ['2', 72, 48], ['3', 128, 48], ['4', 184, 48], ['5 Study', 240, 104]];
  return parts.map(([t, x, w]) => R(x, 130, w, 50, { r: 10, fill: t === on ? C.spruce : C.white, stroke: C.line, sw: 2 }) + T(x + w / 2, 163, t, { size: 21, w: 700, fill: t === on ? C.white : C.ink, anchor: 'middle' })).join('');
}

// ---------- the features ----------
// [id, title, route, [[step text, picture alt, screen, opts]]]
const F = [];
const add = (id, title, route, steps) => F.push({ id, title, route, steps });

add('home_study', 'Home study card and pace', '#/', [
  ['Make a hunt plan. Tap Plan a hunt on Home.', 'Home screen with the Plan a hunt button marked 1', homeTop({ newHere: false }), { marks: mark(1, [34, 326, 292, 56]) }],
  ["Home now shows Today's study at the top. Tap the orange button.", "Home with the Today's study card and the orange Read today's screens button marked 2", homeTop({ newHere: false, study: true }), { marks: mark(2, [34, 360, 292, 56]) }],
  ['About 10 minutes a day: a few screens plus 10 cards. Must know screens come first.', 'A lesson screen with the Next button marked 3', lessonScreen(), { off: 260, marks: mark(3, [186, 630, 158, 52], { at: 'tr' }) }],
  ['To change the pace, open the plan and tap part 5 Study.', 'Plan page with the 5 Study part marked 4', app('Black tailed deer', 'home', planParts('1') + card(16, 200, 328, 200, H(34, 240, 'Pace') + btn(34, 262, 292, 50, '10 min a day', 'light') + btn(34, 322, 292, 50, 'Must know by the hunt', 'dark'))), { marks: mark(4, [240, 130, 104, 50], { at: 'bl' }) }],
]);

add('daily', 'Daily cards', '#/daily', [
  ["Tap More, then Today's cards.", "More list with Today's cards marked 1", moreScreen(['How to use this app', 'Hunt ready score', "Today's cards", 'Hunt journal']), { marks: mark(1, moreBox(2), { at: 'tr' }) }],
  ['Read the card. Tap it to flip.', 'A flashcard that says Tap to flip, marked 2', cardsScreen(), { marks: mark(2, [16, 226, 328, 220], { at: 'tr' }) }],
  ['Say how well you knew it: Knew it or Missed it.', 'Knew it and Missed it buttons marked 3', cardsScreen({ flipped: true }), { off: 140, marks: mark(3, [16, 462, 328, 54], { at: 'bl' }) }],
  ['Cards you miss come back tomorrow. Cards you know come back later.', 'Two cards: Missed it comes back tomorrow, Knew it comes back in 1 day, then 6 days', app("Today's cards", 'home',
    card(16, 140, 328, 170, H(34, 186, 'Missed it') + T(34, 230, 'Back tomorrow', { size: 23, w: 700, fill: C.blaze }) + P(34, 270, 'Comes back sooner', 290)) +
    card(16, 330, 328, 190, H(34, 376, 'Knew it') + T(34, 420, '1 day, then 6 days', { size: 23, w: 700, fill: C.spruce }) + P(34, 460, 'Then further apart', 290))), {}],
]);

add('plan', 'Hunt plans', '#/plan/new/0', [
  ['On Home, tap Plan a hunt.', 'Home with the Plan a hunt button marked 1', homeTop({ newHere: false }), { marks: mark(1, [34, 326, 292, 56]) }],
  ['Answer 8 short questions: animal, place, dates and more.', 'Plan a hunt, question 1 of 8, What animal?, with Black bear marked 2', app('Plan a hunt', 'home',
    P(16, 145, 'Question 1 of 8', 320) + R(16, 160, 328, 10, { r: 5, fill: C.line }) + R(16, 160, 41, 10, { r: 5, fill: C.spruce }) + H(16, 212, 'What animal?', 30) +
    R(16, 236, 328, 50, { r: 10, fill: C.white, stroke: C.line, sw: 2 }) + P(30, 268, 'Find an animal: deer', 300) + ['Bighorn sheep', 'Black bear', 'Caribou', 'Elk', 'Moose'].map((t, i) => rowBtn(16, 306 + i * 70, 328, 58, t, 'outline', { size: 22 })).join('')), { marks: mark(2, [16, 306, 328, 58], { at: 'tr' }) }],
  ['Your plan: is it open, odds, days, checklist and study, in 5 parts.', 'Plan page with parts 1 Legal to 5 Study and a green Open box', app('Black tailed deer', 'home', planParts('1') +
    H(16, 230, '1. Legal and open') + R(16, 250, 328, 120, { r: 14, fill: C.okBg, stroke: C.ok, sw: 3 }) + H(34, 296, 'Open', 30) + P(34, 334, 'General open season', 290, C.ink) + card(16, 390, 328, 170, H(34, 430, 'Seasons in your dates') + lines(34, 456, 280, 3))), { marks: mark(3, [16, 130, 328, 50], { at: 'bl' }) }],
  ['Share, Print, Change or Delete it any time. Plans stay on this phone.', 'Plan buttons Share, Print, Change and Delete, marked 4', app('Black tailed deer', 'home',
    card(16, 130, 328, 330, H(34, 172, 'Black tailed deer', 26) + P(34, 210, 'Party  Solo', 290) + P(34, 246, 'First hunt  Yes', 290) + btn(34, 280, 140, 52, 'Share', 'outline') + btn(186, 280, 140, 52, 'Print', 'outline') + btn(34, 346, 140, 52, 'Change', 'outline') + btn(186, 346, 140, 52, 'Delete', 'outline'))), { marks: mark(4, [34, 280, 292, 118], { at: 'tr' }) }],
]);

add('presets', 'Harrison presets', '#/plan/preset/harrison-deer-two', [
  ['On Home, under Plan a hunt, tap With my brother or Solo.', 'Home with the two Harrison deer buttons marked 1', homeTop({ newHere: false }), { off: 110, marks: mark(1, [34, 390, 292, 64], { at: 'bl' }) }],
  ['It fills in the animal, place and method. You pick the dates.', 'When? question with This weekend, Next 7 days and Opening week, Next 7 days marked 2', app('Plan a hunt', 'home',
    P(16, 145, 'Question 3 of 8', 320) + R(16, 160, 328, 10, { r: 5, fill: C.line }) + R(16, 160, 123, 10, { r: 5, fill: C.spruce }) + H(16, 212, 'When?', 30) +
    rowBtn(16, 236, 328, 88, 'This weekend', 'outline', { sub: 'Sat to Sun' }) + rowBtn(16, 340, 328, 88, 'Next 7 days', 'outline', { sub: '7 days from today' }) + rowBtn(16, 444, 328, 88, 'Opening week', 'outline', { sub: 'Sep 10, bucks' })), { marks: mark(2, [16, 340, 328, 88], { at: 'tr' }) }],
  ['Answer Staying overnight? Yes or No.', 'Staying overnight? with Yes and No buttons, No marked 3', app('Plan a hunt', 'home',
    P(16, 145, 'Question 6 of 8', 320) + R(16, 160, 328, 10, { r: 5, fill: C.line }) + R(16, 160, 246, 10, { r: 5, fill: C.spruce }) + H(16, 212, 'Staying overnight?', 30) +
    rowBtn(16, 240, 158, 100, 'Yes', 'outline', { sub: 'Camp' }) + rowBtn(186, 240, 158, 100, 'No', 'outline', { sub: 'Home' })), { marks: mark(3, [186, 240, 158, 100], { at: 'tr' }) }],
  ['Read first: Your Harrison deer hunt. The rules that bite there.', 'Plan page Read first card with the Your Harrison deer hunt button marked 4', app('Black tailed deer', 'home',
    card(16, 130, 328, 230, H(34, 174, 'Read first', 26) + P(34, 210, 'The rules, roads and tactics', 290) + P(34, 240, 'for this hunt on one page.', 290) + btn(34, 270, 292, 56, 'Your Harrison deer hunt', 'outline'))), { marks: mark(4, [34, 270, 292, 56], { at: 'bl' }) }],
]);

add('huntweek', 'Hunt week checklist', '#/huntweek', [
  ['From 14 days before a saved plan starts, Home shows a Hunt week card.', 'Home with a Hunt week card marked 1', app('Hunt Mentor', 'home',
    T(18, 145, 'NEXT HUNT', { size: 21, w: 700, fill: C.muted, ls: 1 }) + H(18, 190, 'In 9 days', 34) + card(16, 214, 328, 170, H(34, 254, 'Hunt week') + P(34, 290, 'Licences, rifle, scouting,', 290) + btn(34, 310, 292, 54, 'Open Hunt week', 'dark'))), { marks: mark(1, [34, 310, 292, 54], { at: 'bl' }) }],
  ['Or tap More, then Hunt week checklist.', 'More list with Hunt week checklist marked 2', moreScreen(['How to use this app', 'Hunt ready score', 'Hunt week checklist', 'Hunt journal']), { marks: mark(2, moreBox(2), { at: 'tr' }) }],
  ['Tick each line as you do it. Ticks stay on this phone.', 'Hunt week list, 2 weeks out, with a tick box marked 3', app('Hunt week', 'home',
    card(16, 130, 328, 380, H(34, 172, '2 weeks out') + P(34, 204, '14 to 8 days before', 290) + check(34, 236, true) + lines(80, 244, 240, 2) + check(34, 316, false) + lines(80, 324, 240, 2) + check(34, 396, false) + lines(80, 404, 240, 2))), { marks: mark(3, [34, 316, 30, 30], { at: 'l' }) }],
]);

add('ready', 'Hunt ready score', '#/progress', [
  ['Tap More, then Hunt ready score and your weak spots.', 'More list with Hunt ready score marked 1', moreScreen(['How to use this app', 'Hunt ready score', 'Hunt week checklist', 'Hunt journal']), { marks: mark(1, moreBox(1), { at: 'tr' }) }],
  ['Hunt ready scores one saved plan: its dates, place and study path.', 'Progress screen with the Hunt ready card', app('Progress', 'home',
    card(16, 130, 328, 230, H(34, 172, 'Hunt ready') + T(34, 230, '62', { size: 48, w: 800, fill: C.spruce }) + P(110, 226, 'out of 100', 220) + lines(34, 260, 280, 2) + btn(34, 296, 292, 50, 'Plan a hunt', 'dark'))), { marks: mark(2, [16, 130, 328, 230], { at: 'tr' }) }],
  ["Weak spots come from your quizzes, cards and trainers. Tap one to practise.", "Weak spots card with Today's cards, Lessons and Trainers buttons marked 3", app('Progress', 'home',
    card(16, 130, 328, 300, H(34, 172, 'Weak spots') + lines(34, 196, 280, 3) + btn(34, 276, 140, 62, "Today's|cards", 'dark') + btn(186, 280, 140, 54, 'Lessons', 'outline') + btn(34, 348, 292, 54, 'Trainers', 'outline'))), { marks: mark(3, [34, 280, 292, 122], { at: 'tr' }) }],
]);

add('guide', 'How to use this app', '#/guide', [
  ['On Home, tap How to use this app. Or More, How to use this app.', 'Home with the New here? card and How to use marked 1', homeTop({ newHere: true }), { marks: mark(1, [34, 276, 140, 62], { at: 'bl' }) }],
  ['Tap a topic to jump to it.', 'Guide screen with topic buttons, Hunt Map marked 2', app('How to use this app', 'more',
    card(16, 130, 328, 280, H(34, 172, 'A quick tour') + lines(34, 196, 280, 2) + ['Home', 'Plan', 'Hunt Map', 'Safety', 'Practice', 'Records'].map((t, i) => R(34 + (i % 2) * 150, 250 + Math.floor(i / 2) * 52, 138, 44, { r: 22, fill: C.white, stroke: C.line, sw: 2 }) + T(103 + (i % 2) * 150, 279 + Math.floor(i / 2) * 52, t, { size: 21, anchor: 'middle' })).join(''))), { marks: mark(2, [34, 302, 138, 44], { at: 'l' }) }],
  ['Each part: what it does, picture steps and a button to open it.', 'A guide card with picture steps and an Open button marked 3', app('How to use this app', 'more',
    card(16, 130, 328, 420, H(34, 172, 'Mark my truck') + lines(34, 196, 280, 2) + R(34, 250, 292, 180, { r: 10, fill: C.lichen, stroke: C.line, sw: 2 }) + `<circle cx="70" cy="290" r="20" fill="${C.blaze}"/>` + T(70, 298, '1', { size: 22, w: 800, anchor: 'middle' }) + lines(100, 340, 200, 3) + btn(34, 460, 292, 56, 'Open the map', 'dark'))), { off: 150, marks: mark(3, [34, 460, 292, 56], { at: 'bl' }) }],
  ['Inside a screen, tap How to for its picture steps.', 'Safety screen with the small How to button marked 4', app('Trip plan', 'home',
    R(214, 116, 130, 46, { r: 23, fill: C.white, stroke: C.spruce, sw: 2.5 }) + glyph('q', 226, 126, 26, C.spruce) + T(260, 147, 'How to', { size: 21, w: 700, max: 76 }) + card(16, 176, 328, 300, H(34, 218, '3 steps') + lines(34, 244, 280, 6, 32))), { marks: mark(4, [214, 116, 130, 46], { at: 'bl', round: 1 }) }],
]);

// ---------- Hunt Map ----------
add('layer_sets', 'Map layer sets', '#/map', [
  ['Open the Map tab.', 'App tabs with Map marked 1', homeLinks(), { off: 'bottom', marks: mark(1, [180, 692, 60, 68], { at: 'tl', label: 'Map' }) }],
  ['Tap Layers, bottom left of the map.', 'Hunt Map with the Layers button marked 2', mapScreen(), { off: 'bottom', marks: mark(2, [12, 594, 150, 58], { at: 'tr' }) }],
  ['Tap Clean, Scouting or Hunt day to switch many layers at once.', 'Hunt Map Layers sheet with Clean, Scouting and Hunt day, Hunt day marked 3', mapScreen({}, layersSheet({ set: 'Scouting' })), { off: 60, marks: mark(3, SETS['Hunt day'], { at: 'tr' }) }],
  ['Clean: base map. Scouting: spots, camps, winter range. Hunt day: no shooting areas, Crown land, MU lines.', 'The three set buttons, Hunt day on', mapScreen({}, layersSheet({ set: 'Hunt day' })), { off: 60, marks: mark(4, [18, 288, 322, 52], { at: 'bl' }) }],
]);

add('what_key', 'What am I looking at?', '#/map', [
  ['On the map, tap What am I looking at?', 'Hunt Map with the What am I looking at? button marked 1', mapScreen(), { off: 'bottom', marks: mark(1, [12, 534, 262, 44], { at: 'tr' }) }],
  ['Read the key: every colour on screen and what it means.', 'What am I looking at? sheet with colour swatches', mapScreen({}, sheet(270, 'What am I looking at?',
    [['#F28C28', 'Private land'], ['#5DADE2', 'Crown land'], ['#E74C3C', 'No shooting area'], [C.green, 'Likely open']].map(([c, t], i) => R(18, 340 + i * 64, 40, 40, { r: 8, fill: c, stroke: C.ink, sw: 1.5 }) + T(74, 368 + i * 64, t, { size: 22, w: 700 })).join(''))), { off: 250, marks: mark(2, [18, 340, 300, 232], { at: 'tr' }) }],
  ['In Layers, tap the i button by a layer: what it shows, why it matters, how sure.', 'Layers list with the i button marked 3', mapScreen({}, sheet(106, 'Hunt Map Layers', T(18, 200, 'LAND STATUS', { size: 21, w: 700, fill: C.muted, ls: 1 }) + layerRow(226, '#FFAA55', 'Private land', false) + layerRow(296, '#5DADE2', 'Crown land', true) + layerRow(366, '#E74C3C', 'No shooting', true))), { marks: mark(3, [238, 294, 34, 34], { at: 'tl', round: 1 }) }],
]);

add('search', 'Search the map', '#/map', [
  ['Tap the magnifying glass, top right of the map.', 'Hunt Map with the search button marked 1', mapScreen(), { marks: mark(1, [302, 10, 46, 46], { at: 'bl', round: 1 }) }],
  ['Type a town, lake, MU, camp or coordinates.', 'Search box with Harrison Lake typed, marked 2', R(0, 0, 360, 760, { fill: C.white }) + R(12, 10, 264, 46, { r: 23, fill: C.lichen, stroke: C.blaze, sw: 3 }) + icon('search', 24, 19, 28, C.muted) + T(62, 41, 'Harrison Lake', { size: 21 }) + T(292, 41, 'Cancel', { size: 21, fill: '#C2410C' }) +
    H(16, 120, 'YOU CAN SEARCH FOR', 21, 320, C.muted) + ['Towns and lakes', 'MU: 2-18', 'Rec sites and spots', 'Your waypoints', 'Coordinates'].map((t, i) => T(30, 170 + i * 46, '• ' + t, { size: 22 })).join(''), { marks: mark(2, [12, 10, 264, 46], { at: 'bl' }) }],
  ['Tap a result to go there.', 'A list of results with the first one marked 3', R(0, 0, 360, 760, { fill: C.white }) + R(12, 10, 264, 46, { r: 23, fill: C.lichen, stroke: C.line, sw: 2 }) + icon('search', 24, 19, 28, C.muted) + T(62, 41, 'Harrison Lake', { size: 21 }) +
    [['Harrison Lake', 'Lake'], ['Harrison Hot Springs', 'Town'], ['MU 2-18', 'Management Unit']].map(([a, b], i) => R(0, 76 + i * 86, 360, 1.5, { fill: C.line }) + T(18, 112 + i * 86, a, { size: 22, w: 700 }) + P(18, 142 + i * 86, b, 320)).join(''), { marks: mark(3, [6, 82, 348, 76], { at: 'br' }) }],
  ['Works with no signal for MUs, coordinates and your saved places.', 'Hunt Map centred on the place found', mapScreen({}, `<circle cx="180" cy="380" r="14" fill="${C.blaze}" stroke="${C.white}" stroke-width="4"/>`), { off: 170, side: R(332, 110, 64, 70, { r: 8, fill: C.white, stroke: C.line, sw: 1.5 }) + glyph('nosignal', 344, 120, 40, C.muted) }],
]);

add('tap_card', 'Tap card: Here on the map', '#/map', [
  ['Tap anywhere on the map, or press and hold.', 'Hunt Map with a tap point marked 1', mapScreen({}, `<circle cx="180" cy="380" r="16" fill="none" stroke="${C.ink}" stroke-width="4"/>`), { off: 'mid', marks: mark(1, [160, 360, 40, 40], { round: 1, at: 'tr' }) }],
  ['Read the card: MU, land, legal light now, and what is on the map here.', 'Here on the map card with MU, Land and Legal light lines', mapScreen({}, sheet(300, 'Here on the map',
    [['MU', '2-18'], ['Land', 'CHECK'], ['Legal light', '45 min left']].map(([a, b], i) => P(18, 390 + i * 46, a, 120, C.muted) + T(150, 390 + i * 46, b, { size: 22, w: 700 })).join('') + btn(18, 540, 324, 56, 'Can I hunt here now?', 'blaze'))), { off: 280, marks: mark(2, [18, 362, 324, 140], { at: 'tr' }) }],
  ['Tap Can I hunt here now? for a yes, no or check.', 'The orange Can I hunt here now? button marked 3', mapScreen({}, sheet(300, 'Here on the map',
    lines(18, 380, 320, 4, 30) + btn(18, 540, 324, 56, 'Can I hunt here now?', 'blaze'))), { off: 280, marks: mark(3, [18, 540, 324, 56], { at: 'tl' }) }],
  ['Or Save point, Directions, Log sighting or Mark my truck here.', 'Card buttons Save point, Directions, Log sighting and Mark my truck here', mapScreen({}, sheet(300, 'Here on the map',
    btn(18, 380, 156, 54, 'Save point', 'light') + btn(186, 380, 156, 54, 'Directions', 'light') + btn(18, 446, 156, 54, 'Log sighting', 'light') + btn(186, 446, 156, 54, 'Truck here', 'light'))), { off: 280, marks: mark(4, [18, 380, 324, 120], { at: 'tr' }) }],
]);

add('can_hunt', 'Can I hunt here now?', '#/map/tool/canhunt', [
  ['Tap Tools, at the bottom of the map.', 'Hunt Map bottom bar with Tools marked 1', mapScreen(), { off: 'bottom', marks: mark(1, [148, 690, 64, 54], { at: 'tr', label: 'Tools' }) }],
  ['Tap Can I hunt here now?', 'Tools sheet with Can I hunt here now? marked 2', toolsSheet(), { off: 140, marks: mark(2, TOOL.canhunt, { at: 'tr' }) }],
  ['Pick the animal and how you will shoot.', 'Can I hunt here now? sheet with Animal and How you will shoot boxes marked 3', mapScreen({ bar: 'tools', chips: false }, sheet(300, 'Can I hunt here now?',
    P(18, 380, 'Animal', 320, C.ink) + R(18, 394, 324, 52, { r: 10, fill: C.white, stroke: C.line, sw: 2 }) + T(34, 428, 'Mule deer', { size: 21 }) + P(18, 486, 'How you will shoot', 320, C.ink) + R(18, 500, 324, 52, { r: 10, fill: C.white, stroke: C.line, sw: 2 }) + T(34, 534, 'Rifle', { size: 21 }))), { off: 250, marks: mark(3, [18, 394, 324, 158], { at: 'tr' }) }],
  ['Tap a point on the map. It checks the MU, season today, legal light and land.', 'A point on the map with a YES, NO or CHECK answer', mapScreen({ chips: false }, `<circle cx="180" cy="300" r="16" fill="none" stroke="${C.ink}" stroke-width="4"/>` + sheet(420, 'Can I hunt here now?',
    R(18, 480, 120, 52, { r: 10, fill: C.okBg, stroke: C.ok, sw: 3 }) + T(78, 515, 'YES', { size: 24, w: 800, fill: C.ok, anchor: 'middle' }) + R(150, 480, 92, 52, { r: 10, fill: '#F8DEDB', stroke: C.red, sw: 3 }) + T(196, 515, 'NO', { size: 24, w: 800, fill: C.red, anchor: 'middle' }) + R(254, 480, 88, 52, { r: 10, fill: C.warn, stroke: C.orange, sw: 3 }) + T(298, 515, 'CHECK', { size: 21, w: 800, fill: '#9A4A00', anchor: 'middle' }))), { off: 190, marks: mark(4, [160, 280, 40, 40], { round: 1, at: 'tr' }) }],
  ['Always read the Still check yourself lines. The map is a study aid, not the law.', 'Still check yourself list under the answer', mapScreen({ chips: false }, sheet(300, 'Can I hunt here now?',
    H(18, 380, 'Still check yourself', 23) + [0, 1, 2].map((i) => glyph('check', 18, 400 + i * 54, 26, C.spruce, 3) + lines(56, 410 + i * 54, 280, 1)).join('') + R(18, 572, 324, 50, { r: 8, fill: C.warn }) + T(30, 604, 'Study aid only.', { size: 21, w: 700 }))), { off: 280, marks: mark(5, [18, 352, 324, 210], { at: 'tr' }) }],
]);

add('where_hunt', 'Where can I hunt?', '#/map/tool/where', [
  ['Tap Tools, at the bottom of the map.', 'Hunt Map bottom bar with Tools marked 1', mapScreen(), { off: 'bottom', marks: mark(1, [148, 690, 64, 54], { at: 'tr', label: 'Tools' }) }],
  ['Tap Where can I hunt?', 'Tools sheet with Where can I hunt? marked 2', toolsSheet(), { off: 140, marks: mark(2, TOOL.where, { at: 'tr' }) }],
  ['Bright green: likely open. Grey: check first.', 'Map with bright green and grey areas', mapBg() + `<path d="M20 180 L 200 150 L 240 330 L 60 360Z" fill="${C.green}" opacity=".85"/><path d="M200 150 L 340 170 L 330 300 L 240 330Z" fill="${C.grey}" opacity=".9"/>` + mapChrome({ chips: false }),
    { off: 100, side: R(4, 120, 64, 70, { r: 8, fill: C.white, stroke: C.line, sw: 1.5 }) + R(14, 130, 44, 20, { r: 4, fill: C.green }) + note(36, 176, 'Likely', { anchor: 'middle' }) + R(332, 120, 64, 70, { r: 8, fill: C.white, stroke: C.line, sw: 1.5 }) + R(342, 130, 44, 20, { r: 4, fill: C.grey }) + note(364, 176, 'Check', { anchor: 'middle' }) }],
  ['A first look only. Before you hunt, use Can I hunt here now?', 'Tools sheet with Can I hunt here now? marked 4', toolsSheet(), { off: 140, marks: mark(4, TOOL.canhunt, { at: 'tr' }) }],
]);

add('spots', 'Spots and camp cards', '#/map', [
  ['In Layers, tap Scouting: it shows spots and camps.', 'Layers sheet with Scouting marked 1', mapScreen({}, layersSheet({ set: 'Scouting' })), { off: 60, marks: mark(1, SETS.Scouting, { at: 'tr' }) }],
  ['Tap a spot or a camp on the map for its card.', 'Hunt Map with a spot dot marked 2', mapScreen({ chips: false }, `<circle cx="120" cy="300" r="12" fill="${C.blaze}" stroke="${C.white}" stroke-width="3"/><circle cx="250" cy="420" r="12" fill="${C.blaze}" stroke="${C.white}" stroke-width="3"/>` + R(60, 380, 30, 30, { r: 6, fill: '#2E7D9A', stroke: C.white, sw: 3 })), { off: 140, marks: mark(2, [104, 284, 32, 32], { round: 1, at: 'tr' }) }],
  ['Spot tags: Good for 2, Good solo, Beginner friendly, and popular or quieter (an estimate).', 'Spot card with tags', mapScreen({ chips: false }, sheet(250, 'A spot',
    [['Good for 2', 18, 300, 150], ['Good solo', 180, 300, 140], ['Beginner friendly', 18, 352, 220]].map(([t, x, y, w]) => R(x, y, w, 40, { r: 20, fill: C.lichen, stroke: C.spruce, sw: 2 }) + T(x + w / 2, y + 28, t, { size: 21, w: 700, anchor: 'middle', max: w - 20 })).join('') + P(18, 430, 'Hunters  Quieter (estimate)', 320, C.ink))), { off: 220, marks: mark(3, [18, 300, 300, 92], { at: 'tr' }) }],
  ['Every spot is a candidate. Scout it first. Tap Full rundown for more.', 'Spot card with the Full rundown button marked 4', mapScreen({ chips: false }, sheet(250, 'A spot',
    lines(18, 300, 320, 3, 30) + btn(18, 400, 324, 56, 'Full rundown', 'light') + P(18, 500, 'Candidate only. Check signs.', 324, C.ink))), { off: 220, marks: mark(4, [18, 400, 324, 56], { at: 'tr' }) }],
]);

add('truck', 'Mark my truck', '#/map', [
  ['At the truck, tap Mark my truck, top left of the map.', 'Hunt Map with the Mark my truck chip marked 1', mapScreen(), { marks: mark(1, [12, 192, 214, 52], { at: 'r' }) }],
  ['An arrow then points back to the truck, with the distance and a walk back time (Tip).', 'Truck chip with an arrow and the distance', mapBg() + mapChrome({ chips: false }) + R(12, 192, 200, 60, { r: 30, fill: C.btn }) + glyph('arrow', 22, 204, 34, C.spruce) + icon('car', 62, 208, 28) + T(100, 230, '1.2 km', { size: 23, w: 800 }), { marks: mark(2, [12, 192, 200, 60], { at: 'r' }) }],
  ['Tap the chip again: Show on map, Use the compass, Move truck or Remove truck.', 'Hunt day sheet, Back to the truck, with the buttons marked 3', huntDaySheet('truck'), { off: 200, marks: mark(3, [18, 440, 324, 116], { at: 'tr' }) }],
]);

add('light_chips', 'Legal light and turnaround chips', '#/map', [
  ['Top left: minutes of legal shooting light left where you stand.', 'Legal light chip marked 1', mapScreen(), { marks: mark(1, [12, 140, 262, 44], { at: 'bl' }) }],
  ['Orange under 30 minutes. Red under 10.', 'Three legal light chips: normal, orange and red', mapBg() + mapChrome({ chips: false }) +
    R(12, 140, 262, 44, { r: 22, fill: C.btn }) + glyph('sun', 22, 148, 26, C.muted) + T(56, 170, 'Legal light 45 min', { size: 21, w: 700 }) +
    R(12, 200, 262, 44, { r: 22, fill: '#C2410C' }) + glyph('sun', 22, 208, 26, C.white) + T(56, 230, 'Legal light 25 min', { size: 21, w: 700, fill: C.white }) +
    R(12, 260, 262, 44, { r: 22, fill: '#B3261E' }) + glyph('sun', 22, 268, 26, C.white) + T(56, 290, 'Legal light 8 min', { size: 21, w: 700, fill: C.white }), {}],
  ['Tap the chip to set a turnaround: walk out minutes, then Start.', 'Hunt day sheet, Turnaround, with Start marked 3', huntDaySheet('turn'), { off: 200, marks: mark(3, [212, 456, 130, 52], { at: 'tr' }) }],
  ['A turnaround chip then counts down. It rings on any screen while the app is open.', 'Turnaround chip with a countdown under the legal light chip', mapBg() + mapChrome({ chips: false }) +
    R(12, 140, 262, 44, { r: 22, fill: C.btn }) + glyph('sun', 22, 148, 26, C.muted) + T(56, 170, 'Legal light 45 min', { size: 21, w: 700 }) +
    R(12, 192, 200, 44, { r: 22, fill: C.btn }) + glyph('clock', 22, 201, 26) + T(56, 222, 'Turn 0:42:10', { size: 21, w: 700 }), { marks: mark(4, [12, 192, 200, 44], { at: 'r' }) }],
]);

add('offline_area', 'Save this hunt area for no signal', '#/plan', [
  ['Open your saved plan: More, or Home, My hunt plans.', 'Home quick links with My hunt plans marked 1', homeLinks(), { off: 140, marks: mark(1, qlBox('My hunt plans'), { at: 'tr' }) }],
  ['Find the Offline for no signal box. Red means not saved yet.', 'Offline for no signal card with Not ready offline in red', app('Black tailed deer', 'home',
    card(16, 130, 328, 360, H(34, 174, 'Offline for no signal', 26) + R(34, 196, 210, 40, { r: 20, fill: C.red }) + T(139, 224, 'Not ready offline', { size: 21, w: 700, fill: C.white, anchor: 'middle' }) + lines(34, 262, 280, 3) + btn(34, 360, 292, 60, 'Save this hunt area', 'dark'))), { marks: mark(2, [34, 196, 210, 40], { at: 'r' }) }],
  ['On wifi, tap Save this hunt area for no signal. Keep the app open.', 'Save this hunt area button marked 3, with wifi', app('Black tailed deer', 'home',
    card(16, 130, 328, 360, H(34, 174, 'Offline for no signal', 26) + lines(34, 200, 280, 3) + btn(34, 300, 292, 60, 'Save this hunt area', 'dark') + glyph('wifi', 150, 390, 56, C.spruce))), { marks: mark(3, [34, 300, 292, 60], { at: 'tr' }) }],
  ['Then tap Check again. It should say ready.', 'Check again button marked 4 and a ready message', app('Black tailed deer', 'home',
    card(16, 130, 328, 300, H(34, 174, 'Offline for no signal', 26) + R(34, 196, 200, 40, { r: 20, fill: C.ok }) + T(134, 224, 'Ready offline', { size: 21, w: 700, fill: C.white, anchor: 'middle' }) + lines(34, 262, 280, 2) + btn(34, 330, 292, 56, 'Check again', 'outline'))), { marks: mark(4, [34, 330, 292, 56], { at: 'tr' }) }],
]);

add('steep', 'Steep ground', '#/map', [
  ['Tap Layers, bottom left of the map.', 'Hunt Map with the Layers button marked 1', mapScreen(), { off: 'bottom', marks: mark(1, [12, 594, 150, 58], { at: 'tr' }) }],
  ['Scroll to the Terrain group. Turn on Steep ground. It is off at first.', 'Terrain group with the Steep ground switch marked 2', mapScreen({}, sheet(106, 'Hunt Map Layers', T(18, 210, 'TERRAIN', { size: 21, w: 700, fill: C.muted, ls: 1 }) +
    layerRow(236, '', 'Steep ground', true, { swatch: R(18, 236, 34, 34, { r: 6, fill: C.yellow, stroke: C.ink, sw: 1.5 }) + R(30, 236, 11, 34, { fill: C.orange }) + R(41, 236, 11, 34, { fill: C.sred }) }) + layerRow(306, '#C9B79A', 'Contours', false))), { marks: mark(2, [286, 238, 52, 30], { at: 'tr', round: 1 }) }],
  ['Yellow 25 to 30 degrees. Orange 30 to 35. Red over 35. An estimate.', 'Map with yellow, orange and red slope bands', mapBg() + `<path d="M40 140 C 120 120 220 130 320 160 L 320 230 C 220 200 120 200 40 220Z" fill="${C.yellow}" opacity=".85"/><path d="M60 230 C 140 210 220 215 300 240 L 300 290 C 220 270 140 270 60 290Z" fill="${C.orange}" opacity=".9"/><path d="M90 300 C 160 285 220 290 270 305 L 270 340 C 220 330 160 330 90 345Z" fill="${C.sred}" opacity=".9"/>` + mapChrome({ chips: false, key: false }),
    { side: R(6, 60, 60, 40, { r: 6, fill: C.yellow }) + note(36, 86, '25 to 30', { anchor: 'middle', w: 400 }) + R(6, 110, 60, 40, { r: 6, fill: C.orange }) + note(36, 136, '30 to 35', { anchor: 'middle', w: 400 }) + R(6, 160, 60, 40, { r: 6, fill: C.sred }) + note(36, 186, 'over 35', { anchor: 'middle', fill: C.white, w: 400 }) }],
  ['Plan the shot around the pack out: red ground is a hard, risky carry (Tip).', 'Map with a red slope and a pack out path to the truck', mapBg() + `<path d="M90 200 C 160 185 220 190 270 205 L 270 260 C 220 250 160 250 90 265Z" fill="${C.sred}" opacity=".9"/><path d="M180 230 C 170 330 120 420 80 520" fill="none" stroke="${C.spruce}" stroke-width="6" stroke-dasharray="12 10"/>` + mapChrome({ chips: false, key: false }) + icon('car', 64, 520, 34),
    { side: note(332, 120, 'Tip', { size: 16 }) }],
]);

add('help_tour', 'Map help and tour', '#/map', [
  ['Tap the ? button on the right of the map.', 'Hunt Map with the help button marked 1', mapScreen(), { marks: mark(1, [302, 256, 46, 46], { round: 1, at: 'l' }) }],
  ['Read what every map button does, top, side and bottom.', 'Help sheet listing map buttons with icons', mapScreen({}, sheet(106, 'Help',
    T(18, 200, 'THE MAP BUTTONS', { size: 21, w: 700, fill: C.muted, ls: 1 }) + [['menu', 'Menu'], ['profile', 'Elevation profile'], ['search', 'Search the map']].map(([k, t], i) => `<circle cx="40" cy="${246 + i * 70}" r="22" fill="${C.lichen}"/>` + icon(k, 26, 232 + i * 70, 28) + T(80, 254 + i * 70, t, { size: 22, w: 700 })).join(''))), {}],
  ['Tap Show me the tour again for the 5 step tour.', 'Help sheet with the orange Show me the tour again button marked 3', mapScreen({}, sheet(106, 'Help',
    R(18, 170, 324, 50, { r: 8, fill: C.warn }) + T(30, 202, 'Study aid only.', { size: 21, w: 700 }) + btn(18, 236, 324, 56, 'Show me the tour again', 'blaze'))), { marks: mark(3, [18, 236, 324, 56], { at: 'bl' }) }],
]);

// ---------- Safety ----------
const homeToSafety = (n, text) => [text, 'Home quick links with Safety marked ' + n, homeLinks(), { off: 140, marks: mark(n, qlBox('Safety'), { at: 'tr' }) }];
add('trip_plan', 'Trip plan', '#/safety/trip', [
  homeToSafety(1, 'On Home, tap Safety.'),
  ['Tap Trip plan.', 'Safety screen with Trip plan marked 2', safetyHub(), { off: 100, marks: mark(2, shBox('Trip plan'), { at: 'tr' }) }],
  ['Fill in who, where and when back. It saves on this phone as you type.', 'Trip plan form with Who, Where and Back by boxes', app('Trip plan', 'home',
    card(16, 130, 328, 420, [['Who', 'Me and my brother'], ['Where', 'Harrison, MU 2-18'], ['Back by', 'Sat 7 p.m.']].map(([a, b], i) => P(34, 176 + i * 116, a, 290, C.ink) + R(34, 190 + i * 116, 292, 52, { r: 10, fill: C.white, stroke: C.line, sw: 2 }) + T(48, 224 + i * 116, b, { size: 21 })).join(''))), { marks: mark(3, [34, 190, 292, 284], { at: 'tr' }) }],
  ['Tap Send. Your phone opens Messages or Mail. You press send.', 'Send, Copy, Text message and Email buttons, Send marked 4', app('Trip plan', 'home',
    card(16, 130, 328, 260, H(34, 172, 'Send it') + btn(34, 196, 140, 54, 'Send', 'dark') + btn(186, 196, 140, 54, 'Copy', 'outline') + btn(34, 262, 140, 54, 'Text', 'outline') + btn(186, 262, 140, 54, 'Email', 'outline'))), { marks: mark(4, [34, 196, 140, 54], { at: 'bl' }) }],
  ['Back home? Tap Send "I am back safe". Nothing is sent without your tap.', 'Send I am back safe button marked 5', app('Trip plan', 'home',
    card(16, 130, 328, 200, H(34, 172, 'Back safe') + btn(34, 196, 292, 58, 'Send "I am back safe"', 'dark') + btn(34, 264, 292, 50, 'Clear the plan', 'outline'))), { marks: mark(5, [34, 196, 292, 58], { at: 'tr' }) }],
]);

add('turnaround', 'Turnaround alarm', '#/safety/turn', [
  homeToSafety(1, 'On Home, tap Safety.'),
  ['Tap Turnaround alarm.', 'Safety screen with Turnaround alarm marked 2', safetyHub(), { off: 200, marks: mark(2, shBox('Turnaround alarm'), { at: 'tr' }) }],
  ['Type your walk out time, or tap 30, 60, 90 or 120 min.', 'Walk out time box and 30, 60, 90, 120 minute buttons, 60 marked 3', app('Turnaround alarm', 'home',
    card(16, 130, 328, 300, H(34, 172, 'Pick your turnaround') + P(34, 208, 'Walk out time (minutes)', 290, C.ink) + R(34, 222, 140, 52, { r: 10, fill: C.white, stroke: C.line, sw: 2 }) + T(50, 256, '60', { size: 23 }) +
      [30, 60, 90, 120].map((m, i) => btn(34 + i * 74, 292, 66, 52, String(m), 'outline')).join(''))), { marks: mark(3, [108, 292, 66, 52], { at: 'bl' }) }],
  ['Tap Start the alarm. It counts down while the app is open.', 'Start the alarm button marked 4', app('Turnaround alarm', 'home',
    card(16, 130, 328, 220, lines(34, 160, 280, 3) + btn(34, 250, 292, 58, 'Start the alarm', 'dark'))), { marks: mark(4, [34, 250, 292, 58], { at: 'tr' }) }],
  ['iPhone pauses web apps when locked. Tap Set a phone alarm too.', 'Make sure it rings card with Set a phone alarm too marked 5', app('Turnaround alarm', 'home',
    card(16, 130, 328, 220, H(34, 172, 'Make sure it rings') + btn(34, 196, 140, 64, 'Allow alerts', 'outline') + btn(186, 196, 140, 64, 'Phone alarm', 'outline') + glyph('lock', 160, 280, 40, C.muted))), { marks: mark(5, [186, 196, 140, 64], { at: 'tr' }) }],
]);

add('emergency', 'Emergency card', '#/safety/sos', [
  homeToSafety(1, 'On Home, tap Safety. Or the Field tab, Emergency.'),
  ['Tap Emergency card.', 'Safety screen with Emergency card marked 2', safetyHub(), { off: 100, marks: mark(2, shBox('Emergency card'), { at: 'tr' }) }],
  ['1. Call 911.', 'Red Call 911 button marked 3', app('Emergency card', 'home', R(16, 122, 328, 110, { r: 16, fill: C.red }) + T(180, 172, '1. Call 911', { size: 32, w: 800, fill: C.white, anchor: 'middle' }) + T(180, 208, 'Police, ambulance', { size: 21, fill: C.white, anchor: 'middle' }) +
    card(16, 250, 328, 200, H(34, 292, '2. Your location') + btn(34, 316, 140, 60, 'Get my GPS', 'dark') + btn(186, 316, 140, 60, 'Copy', 'outline'))), { marks: mark(3, [16, 122, 328, 110], { at: 'tr' }) }],
  ['2. Tap Get my GPS location. Read it out. GPS works with no signal.', 'Get my GPS location button marked 4', app('Emergency card', 'home', R(16, 122, 328, 110, { r: 16, fill: C.red }) + T(180, 172, '1. Call 911', { size: 32, w: 800, fill: C.white, anchor: 'middle' }) +
    card(16, 250, 328, 260, H(34, 292, '2. Your location') + btn(34, 316, 140, 60, 'Get my GPS', 'dark') + btn(186, 316, 140, 60, 'Copy', 'outline') + T(34, 420, '49.30000, -121.78500', { size: 21, w: 700 }))), { marks: mark(4, [34, 316, 140, 60], { at: 'bl' }) }],
  ['3. Tell dispatch, in the order on the card.', 'Tell dispatch card with numbered lines', app('Emergency card', 'home',
    card(16, 130, 328, 330, H(34, 172, '3. Tell dispatch') + [1, 2, 3, 4].map((n, i) => `<circle cx="50" cy="${214 + i * 60}" r="16" fill="${C.spruce}"/>` + T(50, 221 + i * 60, String(n), { size: 21, w: 700, fill: C.white, anchor: 'middle' }) + lines(80, 208 + i * 60, 240, 1)).join(''))), {}],
]);

add('wildlife', 'Bears and cougars', '#/safety/wildlife', [
  homeToSafety(1, 'On Home, tap Safety.'),
  ['Tap Bears and cougars.', 'Safety screen with Bears and cougars marked 2', safetyHub(), { off: 'bottom', marks: mark(2, shBox('Bears and cougars'), { at: 'tr' }) }],
  ['Jump to what you need: Bear, Attack, Cougar or Spray.', 'Bear, Attack, Cougar and Spray buttons, Bear marked 3', app('Bears and cougars', 'home',
    card(16, 130, 328, 160, H(34, 172, 'Jump to') + ['Bear', 'Attack', 'Cougar', 'Spray'].map((t, i) => btn(34 + i * 74, 196, 68, 54, t, 'outline', { size: 21 })).join(''))), { marks: mark(3, [34, 196, 68, 54], { at: 'bl' }) }],
  ['Never run from a bear or a cougar (75%, WildSafeBC).', 'A rule card: never run from a bear or a cougar, 75%', app('Bears and cougars', 'home',
    card(16, 130, 328, 220, H(34, 176, 'Never run', 30) + P(34, 214, 'from a bear or a cougar', 290, C.ink) + cert(34, 236, 75) + P(116, 258, 'WildSafeBC', 200))), {}],
]);

add('conditions', 'Conditions check', '#/safety/live', [
  homeToSafety(1, 'On Home, tap Safety.'),
  ['Scroll down. Tap Conditions check.', 'Safety screen with Conditions check marked 2', app('Safety', 'home', rowBtn(16, 140, 328, 100, 'Conditions check', 'outline', { sub: 'Weather, wildfires' }) + rowBtn(16, 256, 328, 88, 'Bears and cougars', 'outline')), { marks: mark(2, [16, 140, 328, 100], { at: 'tr' }) }],
  ['Choose where, then tap Check now while you have signal.', 'Check now button marked 3', app('Conditions check', 'home',
    card(16, 130, 328, 200, H(34, 172, 'Where') + btn(34, 196, 140, 56, 'Trip plan', 'outline', { size: 21 }) + btn(186, 196, 140, 56, 'My GPS', 'outline')) + btn(16, 350, 328, 60, 'Check now', 'dark')), { marks: mark(3, [16, 350, 328, 60], { at: 'bl' }) }],
  ['Read the results. They stay saved for when you lose signal.', 'Results card with Last checked time', app('Conditions check', 'home',
    card(16, 130, 328, 360, H(34, 172, 'Last checked 6:10 a.m.') + [['weather', 'Weather'], ['sun', 'Fire bans'], ['nosignal', 'Saved for no signal']].map(([g, t], i) => (g === 'weather' ? icon('weather', 34, 200 + i * 70, 34) : glyph(g, 34, 200 + i * 70, 34)) + T(84, 226 + i * 70, t, { size: 22, w: 700 })).join(''))), {}],
]);

// ---------- Practice and the field ----------
add('trainers', 'Trainers', '#/train', [
  ['On Home, tap Practice.', 'Home quick links with Practice marked 1', homeLinks(), { off: 140, marks: mark(1, qlBox('Practice'), { at: 'tl' }) }],
  ['Pick a trainer. Four trainers, 10 rounds each.', 'Practice screen with trainer cards, Shot placement marked 2', app('Practice', 'home',
    ['Shoot or don\'t shoot', 'Shot placement', 'Legal buck', 'Guess the range'].map((t, i) => card(16, 130 + i * 136, 328, 120, H(34, 172 + i * 136, t) + lines(34, 196 + i * 136, 280, 2))).join('')), { marks: mark(2, [16, 266, 328, 120], { at: 'tr' }) }],
  ['Shot placement: tap where you would aim, or pass when it is not a good shot.', 'A deer outline with a tap point and a Pass button', app('Shot placement', 'home',
    `<g fill="${C.white}" stroke="${C.ink}" stroke-width="3"><path d="M70 330 C 90 280 230 270 270 300 L 300 250 L 318 258 L 300 320 C 300 360 280 380 260 380 L 250 460 L 236 460 L 236 390 L 120 392 L 112 460 L 98 460 L 96 380 C 76 372 66 350 70 330Z"/></g><circle cx="120" cy="340" r="14" fill="${C.blaze}"/>` + btn(16, 520, 328, 56, 'Pass: not a good shot', 'outline')), { off: 140, marks: mark(3, [100, 320, 40, 40], { round: 1, at: 'tr' }) }],
  ['Every answer is explained from the lessons.', 'Answer card with the rule, certainty and the lesson', app('Shot placement', 'home',
    card(16, 130, 328, 300, H(34, 174, 'Why') + lines(34, 200, 280, 3) + cert(34, 286, 99) + btn(34, 340, 292, 56, 'Open the lesson', 'outline'))), {}],
]);

add('decide', "Shoot or don't shoot", '#/train/decide', [
  ["On Home, tap Practice. Then Shoot or don't shoot.", "Practice screen with Shoot or don't shoot marked 1", app('Practice', 'home',
    ['Shoot or don\'t shoot', 'Shot placement', 'Legal buck'].map((t, i) => card(16, 130 + i * 136, 328, 120, H(34, 172 + i * 136, t) + lines(34, 196 + i * 136, 280, 2))).join('')), { marks: mark(1, [16, 130, 328, 120], { at: 'tr' }) }],
  ['Tap Start 10 rounds. Harrison deer scenarios come first.', 'Start 10 rounds button marked 2', app("Shoot or don't shoot", 'home',
    card(16, 130, 328, 330, H(34, 172, "Shoot or don't shoot") + lines(34, 196, 280, 4) + btn(34, 310, 292, 56, 'Start 10 rounds', 'dark') + btn(34, 380, 140, 60, 'Harrison', 'outline') + btn(186, 380, 140, 60, 'Missed', 'outline'))), { marks: mark(2, [34, 310, 292, 56], { at: 'tr' }) }],
  ['Read the situation, look at the picture, make the call.', 'A scenario picture with answer buttons, one marked 3', app("Shoot or don't shoot", 'home',
    R(16, 130, 328, 170, { r: 12, fill: '#D9E2CF', stroke: C.line, sw: 2 }) + `<path d="M120 250 C 130 220 210 215 230 232 L 246 205 L 256 210 L 246 245 C 246 265 236 275 226 275 L 220 290 M 140 275 L 136 290" fill="none" stroke="${C.ink}" stroke-width="3"/>` + lines(16, 320, 320, 2) + [0, 1, 2].map((i) => R(16, 380 + i * 70, 328, 58, { r: 12, fill: C.white, stroke: C.spruce, sw: 2.5 }) + lines(36, 404 + i * 70, 260, 1)).join('')), { off: 120, marks: mark(3, [16, 450, 328, 58], { at: 'tr' }) }],
  ['Each answer shows the rule, how sure the app is, the source and the lesson to reopen.', 'Answer with the rule, a certainty badge and the lesson', app("Shoot or don't shoot", 'home',
    card(16, 130, 328, 330, H(34, 174, 'The rule') + lines(34, 200, 280, 3) + cert(34, 280, 99) + P(116, 302, 'Synopsis', 200) + btn(34, 330, 292, 54, 'Reopen the lesson', 'outline') + btn(34, 394, 292, 54, 'Next round', 'dark'))), {}],
]);

add('aftershot', 'After the shot', '#/aftershot', [
  ['Tap the Field tab. Then Shot taken: guide me.', 'Field Mode with Shot taken: guide me marked 1', fieldHub(), { marks: mark(1, [16, 122, 158, 128], { at: 'tr' }) }],
  ['Tap I just shot. Start. One step at a time, 10 steps.', 'After the shot with I just shot. Start marked 2 and the step list', app('After the shot', 'field',
    btn(16, 130, 328, 66, 'I just shot. Start', 'dark') + ['Mark the spot', 'What did you see?', 'Track it', 'Approach and confirm', 'Cancel the licence'].map((t, i) => R(16, 212 + i * 70, 328, 58, { r: 12, fill: C.white, stroke: C.line, sw: 2 }) + `<circle cx="44" cy="${241 + i * 70}" r="16" fill="${C.spruce}"/>` + T(44, 248 + i * 70, String(i + 1), { size: 21, w: 700, fill: C.white, anchor: 'middle' }) + T(74, 249 + i * 70, t, { size: 22, w: 700 })).join('')), { marks: mark(2, [16, 130, 328, 66], { at: 'tr' }) }],
  ['Step 1: tap Save my spot. Your phone finds you with GPS, no signal needed.', 'Step 1 of 10, Mark the spot, with Save my spot marked 3', app('After the shot 1/10', 'field',
    `<circle cx="44" cy="160" r="24" fill="${C.spruce}"/>` + T(44, 168, '1', { size: 24, w: 700, fill: C.white, anchor: 'middle' }) + H(80, 172, 'Mark the spot', 28) + card(16, 210, 328, 220, H(34, 252, 'Where you shot from') + lines(34, 276, 280, 2) + btn(34, 340, 292, 60, 'Save my spot', 'dark'))), { marks: mark(3, [34, 340, 292, 60], { at: 'tr' }) }],
  ['Tap Done for the next step. Back goes one step back.', 'Back and Done buttons, Done marked 4', app('After the shot 1/10', 'field',
    lines(16, 140, 320, 6, 34) + btn(16, 600, 110, 70, 'Back', 'outline') + btn(138, 600, 206, 70, 'Done', 'dark', { sub: 'Next step' })), { off: 'bottom', marks: mark(4, [138, 600, 206, 70], { at: 'tr' }) }],
]);

add('read_aloud', 'Read aloud', '#/learn', [
  ["Open a lesson or Today's cards.", 'Learn tab marked 1', homeLinks(), { off: 'bottom', marks: mark(1, [60, 692, 60, 68], { at: 'tl', label: 'Learn' }) }],
  ['Tap Read aloud, above the screen. It reads the title, then the text.', 'Lesson screen with the Read aloud button marked 2', lessonScreen(), { marks: mark(2, [16, 216, 218, 50], { at: 'bl' }) }],
  ['Tap 1× to change the speed. The slider button: voice and keep going.', 'Speed and settings buttons marked 3', lessonScreen(), { marks: mark(3, [244, 216, 100, 50], { at: 'bl' }) }],
  ["It uses the phone's own voice, so it works offline with the voices on the phone.", 'Phone speaker with no signal', app('Lesson', 'learn', card(16, 140, 328, 300, glyph('speaker', 70, 190, 110, C.spruce) + glyph('nosignal', 210, 210, 80, C.muted))), {}],
]);

add('field_mode', 'Field Mode', '#/field', [
  ['Tap the Field tab.', 'App tabs with Field marked 1', fieldHub(), { off: 'bottom', marks: mark(1, [120, 692, 60, 68], { at: 'tl', label: 'Field' }) }],
  ['Big buttons for the bush: Legal to shoot?, Legal light, Tag it, After the shot.', 'Field Mode buttons, Legal to shoot? marked 2', fieldHub(), { marks: mark(2, [186, 122, 158, 128], { at: 'tl' }) }],
  ['Legal to shoot?: one check at a time. Tap YES or NO.', 'Legal to shoot? check 1 of 9 with YES and NO, YES marked 3', app('Legal to shoot?', 'field',
    P(16, 145, 'Check 1 of 9', 320) + R(16, 160, 328, 96, { r: 12, fill: C.white, stroke: C.ink, sw: 3 }) + H(34, 200, 'Do I have my', 26) + H(34, 234, 'licences on me?', 26) + lines(16, 280, 320, 3) + btn(16, 380, 158, 64, 'YES', 'dark', { size: 26 }) + btn(186, 380, 158, 64, 'NO', 'outline', { size: 26 })), { off: 60, marks: mark(3, [16, 380, 158, 64], { at: 'bl' }) }],
  ['Field Mode works with no signal.', 'Field Mode with a no signal sign', fieldHub(), { side: R(336, 40, 60, 60, { r: 12, fill: C.white, stroke: C.line, sw: 1.5 }) + glyph('nosignal', 344, 48, 44, C.muted) }],
]);

// ---------- your records ----------
add('journal', 'Hunt journal', '#/journal', [
  ['Tap More, then Hunt journal.', 'More list with Hunt journal marked 1', moreScreen(['How to use this app', 'Hunt ready score', "Today's cards", 'Hunt journal']), { marks: mark(1, moreBox(3), { at: 'tr' }) }],
  ['Tap New entry. Log every trip, even blank ones.', 'Hunt journal with New entry marked 2', app('Hunt journal', 'more', btn(16, 130, 158, 54, 'New entry', 'dark') + btn(186, 130, 158, 54, 'Export CSV', 'outline') + card(16, 204, 328, 120, lines(34, 240, 280, 2))), { marks: mark(2, [16, 130, 158, 54], { at: 'bl' }) }],
  ['Fill in date, place, weather and what you saw. Tap Save.', 'Journal form with Save marked 3', app('Hunt journal', 'more',
    card(16, 130, 328, 480, [['Date'], ['Place or MU'], ['Weather and wind'], ['What you saw']].map(([a], i) => P(34, 170 + i * 92, a, 290, C.ink) + R(34, 182 + i * 92, 292, 50, { r: 10, fill: C.white, stroke: C.line, sw: 2 })).join('') + btn(34, 540, 140, 54, 'Cancel', 'outline') + btn(186, 540, 140, 54, 'Save', 'dark'))), { off: 'bottom', marks: mark(3, [186, 540, 140, 54], { at: 'tr' }) }],
  ['Tap Export CSV for a spreadsheet file.', 'Export CSV button marked 4', app('Hunt journal', 'more', btn(16, 130, 158, 54, 'New entry', 'dark') + btn(186, 130, 158, 54, 'Export CSV', 'outline') + card(16, 204, 328, 120, lines(34, 240, 280, 2)) + glyph('file', 150, 360, 60, C.spruce)), { marks: mark(4, [186, 130, 158, 54], { at: 'bl' }) }],
]);

add('backup', 'Backup and restore', '#/more', [
  ['Everything lives on this phone only. Tap More.', 'App tabs with More marked 1', homeLinks(), { off: 'bottom', marks: mark(1, [300, 692, 60, 68], { at: 'tl', label: 'More' }) }],
  ['Scroll to Backup. Tap Export backup. It saves one file.', 'Backup card with Export backup marked 2', app('More', 'more', card(16, 130, 328, 190, H(34, 172, 'Backup') + lines(34, 196, 280, 2) + btn(34, 246, 160, 54, 'Export backup', 'outline') + btn(206, 246, 120, 54, 'Import', 'outline'))), { marks: mark(2, [34, 246, 160, 54], { at: 'bl' }) }],
  ['Keep the file in your files or email. Export one before the hunt.', 'A backup file going to Files or email', app('More', 'more', card(16, 140, 328, 300, glyph('file', 60, 200, 90, C.spruce) + `<path d="M170 245 H 230" stroke="${C.ink}" stroke-width="4"/><path d="M220 232 L 236 245 L 220 258" fill="none" stroke="${C.ink}" stroke-width="4"/>` + glyph('share', 246, 200, 80, C.spruce) + T(180, 380, 'Files or email', { size: 22, w: 700, anchor: 'middle' }))), {}],
  ['New phone or cleared app? Tap Import and pick the file. Map items come back too.', 'Import button marked 4', app('More', 'more', card(16, 130, 328, 190, H(34, 172, 'Backup') + lines(34, 196, 280, 2) + btn(34, 246, 160, 54, 'Export backup', 'outline') + btn(206, 246, 120, 54, 'Import', 'outline'))), { marks: mark(4, [206, 246, 120, 54], { at: 'bl' }) }],
]);

add('install', 'Add to Home Screen', '#/install', [
  ['iPhone: open the app in Safari (not Chrome).', 'Safari address bar at the bottom of the phone', R(0, 0, 360, 760, { fill: C.lichen }) + topbar('Hunt Mentor') + R(0, 640, 360, 120, { fill: '#F2F2F2' }) + R(16, 652, 328, 46, { r: 12, fill: C.white, stroke: C.line, sw: 1.5 }) + T(180, 683, 'louisnto-cloud.github.io', { size: 21, anchor: 'middle', max: 300 }) + glyph('share', 160, 712, 34, '#1E6FD9'), { off: 'bottom', marks: mark(1, [16, 652, 328, 46], { at: 'tr' }) }],
  ['Tap the Share button: a square with an arrow up.', 'Safari Share button marked 2', R(0, 0, 360, 760, { fill: C.lichen }) + topbar('Hunt Mentor') + R(0, 640, 360, 120, { fill: '#F2F2F2' }) + R(16, 652, 328, 46, { r: 12, fill: C.white, stroke: C.line, sw: 1.5 }) + T(180, 683, 'louisnto-cloud.github.io', { size: 21, anchor: 'middle', max: 300 }) + glyph('share', 160, 712, 34, '#1E6FD9'), { off: 'bottom', marks: mark(2, [156, 708, 42, 42], { at: 'tr' }) }],
  ['Scroll down. Tap Add to Home Screen, then Add.', 'Share sheet with Add to Home Screen marked 3', R(0, 0, 360, 760, { fill: '#9AA39C' }) + R(0, 300, 360, 470, { r: 20, fill: '#F2F2F2' }) + ['Copy', 'Add to Home Screen', 'Find on Page'].map((t, i) => R(16, 340 + i * 72, 328, 60, { r: 12, fill: C.white }) + T(34, 378 + i * 72, t, { size: 22 })).join('') + glyph('plus', 300, 426, 30, C.ink), { off: 'bottom', marks: mark(3, [16, 412, 328, 60], { at: 'tr' }) }],
  ['Open it once from the home screen with signal. Then it works offline.', 'Phone home screen with the Hunt Mentor icon marked 4', R(0, 0, 360, 760, { fill: '#5B7A66' }) + [0, 1, 2, 3].map((i) => R(30 + i * 80, 80, 60, 60, { r: 14, fill: '#DDE3DA' })).join('') + R(30, 180, 60, 60, { r: 14, fill: C.spruce }) + glyph('field', 42, 192, 36, C.blaze) + T(60, 268, 'Hunt', { size: 21, w: 700, fill: C.white, anchor: 'middle' }), { marks: mark(4, [30, 180, 60, 60], { at: 'r' }) }],
  ['Android: open it in Chrome. Tap the three dots, then Install app or Add to Home screen.', 'Chrome three dots menu marked 5', R(0, 0, 360, 760, { fill: C.lichen }) + R(0, 0, 360, 64, { fill: '#F2F2F2' }) + R(12, 10, 290, 44, { r: 22, fill: C.white, stroke: C.line, sw: 1.5 }) + T(30, 40, 'louisnto-cloud.github.io', { size: 21, max: 260 }) + glyph('dots3', 316, 16, 32) + R(150, 70, 200, 200, { r: 10, fill: C.white, stroke: C.line, sw: 1.5 }) + T(166, 110, 'New tab', { size: 21 }) + T(166, 160, 'Install app', { size: 21, w: 700 }) + T(166, 210, 'Settings', { size: 21 }), { marks: mark(5, [312, 12, 40, 40], { round: 1, at: 'bl' }) + mark(5, [156, 136, 188, 40], { at: 'l' }) }],
]);

// ---------- write ----------
fs.mkdirSync(SVG_DIR, { recursive: true });
for (const f of fs.readdirSync(SVG_DIR)) if (f.endsWith('.svg')) fs.unlinkSync(path.join(SVG_DIR, f));
const out = [];
for (const f of F) {
  const steps = f.steps.map(([text, alt, screen, opts], i) => {
    const file = `${f.id.replace(/_/g, '-')}-${i + 1}.svg`;
    const id = `hw-${f.id.replace(/_/g, '-')}-${i + 1}`;
    const label = `Step ${i + 1}: ${alt}`;
    fs.writeFileSync(path.join(SVG_DIR, file), picture(id, label, screen, opts || {}));
    return { svg: `svg/${file}`, text, alt: label };
  });
  if (steps.length < 3 || steps.length > 5) warnings.push(`${f.id}: ${steps.length} steps`);
  out.push({ id: f.id, title: f.title, route: f.route, steps });
}
fs.writeFileSync(path.join(OUT, 'howto.json'), JSON.stringify({ note: 'Picture how tos for every app feature. Made by scripts/build-howto.mjs: edit there, then run it.', features: out }, null, 1) + '\n');
console.log(`${out.length} features, ${out.reduce((n, f) => n + f.steps.length, 0)} pictures -> ${path.relative(ROOT, OUT)}`);
if (warnings.length) console.log('Check:\n  ' + warnings.join('\n  '));
