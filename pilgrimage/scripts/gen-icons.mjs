// Generate the app's home-screen icons as real PNGs (iOS ignores SVG icons,
// and Android adaptive icons want a maskable PNG). Pure Node — no image
// libraries — so it runs anywhere. The mark matches the in-app candle:
// a lapis field, a soft gold glow, an ivory candle, a gold flame.

import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';

const LAPIS = [28, 38, 71];
const GOLD = [217, 164, 65];
const IVORY = [243, 236, 221];

// ── tiny PNG encoder (8-bit RGBA) ────────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── the mark, sampled analytically with supersampling for clean edges ────────
function sampleColor(u, v, maskable) {
  // u,v in 0..1. Returns [r,g,b,a] 0..255.
  // Content sits in the centre 80% for maskable so the OS crop never clips it.
  const inset = maskable ? 0.1 : 0;
  const x = (u - inset) / (1 - 2 * inset);
  const y = (v - inset) / (1 - 2 * inset);

  // Background: rounded square (full-bleed for maskable so the crop is clean).
  let out = [0, 0, 0, 0];
  const r = 0.24;
  const inRound =
    maskable ||
    (() => {
      const dx = Math.max(r - u, u - (1 - r), 0);
      const dy = Math.max(r - v, v - (1 - v) - (r - 1) + (1 - r), 0); // simplify below
      return false || roundedRect(u, v, 0, 0, 1, 1, r);
    })();
  if (inRound) out = [...LAPIS, 255];
  else return out;

  if (x < 0 || x > 1 || y < 0 || y > 1) return out;

  // Soft gold glow behind the flame.
  const gx = x - 0.5;
  const gy = y - 0.42;
  const gd = Math.sqrt(gx * gx + gy * gy);
  const glow = Math.max(0, 1 - gd / 0.42);
  out = mix(out, [...GOLD, 255], glow * glow * 0.22);

  // Candle body: ivory rounded rect.
  if (roundedRect(x, y, 0.42, 0.55, 0.58, 0.84, 0.03)) out = [...IVORY, 255];

  // Flame: a bulb plus a tapering tip = a teardrop pointing up.
  const bulbX = 0.5;
  const bulbY = 0.45;
  const bd = Math.hypot(x - bulbX, (y - bulbY) * 1.15);
  const inBulb = bd < 0.1;
  const tipTop = 0.28;
  const coneW = ((y - tipTop) / (bulbY - tipTop)) * 0.1;
  const inCone = y >= tipTop && y <= bulbY && Math.abs(x - bulbX) < coneW;
  if (inBulb || inCone) out = [...GOLD, 255];

  return out;
}

function roundedRect(px, py, x0, y0, x1, y1, rad) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = Math.min(Math.max(px, x0 + rad), x1 - rad);
  const cy = Math.min(Math.max(py, y0 + rad), y1 - rad);
  const dx = px - cx;
  const dy = py - cy;
  const nearX = px < x0 + rad || px > x1 - rad;
  const nearY = py < y0 + rad || py > y1 - rad;
  if (nearX && nearY) return dx * dx + dy * dy <= rad * rad;
  return true;
}

function mix(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

function render(size, maskable) {
  const SS = 4; // supersamples per axis
  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size;
          const v = (py + (sy + 0.5) / SS) / size;
          const c = sampleColor(u, v, maskable);
          r += c[0] * (c[3] / 255);
          g += c[1] * (c[3] / 255);
          b += c[2] * (c[3] / 255);
          a += c[3];
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      const alpha = a / n;
      // un-premultiply for storage
      const af = alpha > 0 ? n / a : 0;
      rgba[i] = Math.round(r * af);
      rgba[i + 1] = Math.round(g * af);
      rgba[i + 2] = Math.round(b * af);
      rgba[i + 3] = Math.round(alpha);
    }
  }
  return encodePNG(size, size, rgba);
}

const pub = new URL('../public/', import.meta.url).pathname;
const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];
for (const [name, size, maskable] of targets) {
  await writeFile(pub + name, render(size, maskable));
  console.log('icon:', name, `${size}x${size}`);
}
