// Unit tests for the Area analysis scoring maths (app/map/analyze-score.js). Run: node --test scripts/analyze-score.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  trapezoid, aspectWeight, incidence, sunFactor, elevFactor, waterFactor, roadFactor, terrainFactor, combine, normalise,
  blockModel, blockWindows, distanceField, terrain, shadowed, topZones, analyse, areaStats, FLOOR,
} from '../app/map/analyze-score.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('slope trapezoid: 0 outside, 1 in the best range, linear on the shoulders', () => {
  const t = [5, 10, 25, 40];
  assert.equal(trapezoid(2, t), 0);
  assert.equal(trapezoid(45, t), 0);
  assert.equal(trapezoid(5, t), 0);
  near(trapezoid(7.5, t), 0.5);
  assert.equal(trapezoid(10, t), 1);
  assert.equal(trapezoid(18, t), 1);
  assert.equal(trapezoid(25, t), 1);
  near(trapezoid(32.5, t), 0.5);
  assert.equal(trapezoid(40, t), 0);
  // vertical shoulders and missing data
  assert.equal(trapezoid(0, [0, 0, 8, 20]), 1);
  assert.equal(trapezoid(12, null), 1);
  assert.equal(trapezoid(NaN, t), 1);
});

test('aspect weights: exact directions, interpolation, wrap, flat ground uses the mean', () => {
  const w = { N: 0.4, NE: 0.5, E: 0.7, SE: 0.9, S: 1, SW: 0.9, W: 0.6, NW: 0.2 };
  near(aspectWeight(180, 20, w), 1);
  near(aspectWeight(0, 20, w), 0.4);
  near(aspectWeight(360, 20, w), 0.4);
  near(aspectWeight(22.5, 20, w), 0.45); // halfway N to NE
  near(aspectWeight(337.5, 20, w), 0.3); // halfway NW to N (wraps)
  near(aspectWeight(90, 2, w), (0.4 + 0.5 + 0.7 + 0.9 + 1 + 0.9 + 0.6 + 0.2) / 8); // flat
  assert.equal(aspectWeight(45, 20, null), 1);
  near(aspectWeight(90, 20, { S: 0.5 }), 1); // missing keys count as neutral 1
});

test('sun and shade: incidence and preference', () => {
  near(incidence(0, 0, 90, 0), 1); // flat ground, sun overhead
  near(incidence(30, 180, 30, 180), Math.cos(30 * Math.PI / 180) * 0.5 + 0.5 * Math.cos(30 * Math.PI / 180));
  assert.ok(incidence(40, 0, 20, 180) < 0); // north face, low south sun: shade
  assert.equal(incidence(10, 90, -5, 90), 0); // sun down
  assert.equal(sunFactor('any', 0.8, false), 1);
  near(sunFactor('sun', 1, false), 1);
  near(sunFactor('sun', 0, false), 0.2); // not lit
  near(sunFactor('sun', 0.9, true), 0.2); // lit face but a ridge throws shadow
  near(sunFactor('shade', 0, false), 1);
  near(sunFactor('shade', 0.9, true), 1);
  near(sunFactor('shade', 0.5, false), 0.5);
  near(sunFactor('shade', 1, false), 0.2);
});

test('ridge shadow: a wall toward the sun shades the cell', () => {
  const nx = 20, ny = 1, e = new Float32Array(nx).fill(100);
  for (let i = 10; i < 20; i++) e[i] = 400; // high ground to the east
  assert.equal(shadowed(e, nx, ny, 30, 2, 0, 10, 90), true); // sun low in the east
  assert.equal(shadowed(e, nx, ny, 30, 2, 0, 80, 90), false); // sun high
  assert.equal(shadowed(e, nx, ny, 30, 2, 0, 10, 270), false); // sun in the west, open ground
});

test('elevation, water, road and landform factors', () => {
  assert.equal(elevFactor(1200, [900, 1500]), 1);
  near(elevFactor(750, [900, 1500]), 0.5);
  assert.equal(elevFactor(500, [900, 1500]), 0);
  assert.equal(waterFactor(50, [100, 800]), 1);
  near(waterFactor(450, [100, 800]), 0.65);
  assert.equal(waterFactor(5000, [100, 800]), 0.1);
  assert.equal(waterFactor(5000, null), 1);
  assert.equal(roadFactor(600, 500), 1);
  near(roadFactor(0, 500), 0.3);
  near(roadFactor(250, 500), 0.65);
  assert.equal(roadFactor(10, null), 1);
  assert.equal(terrainFactor(2, 'bench'), 1);
  assert.equal(terrainFactor(4, 'bench'), 0.45);
  assert.equal(terrainFactor(4, 'any'), 1);
});

test('combine: weighted geometric mean with a floor', () => {
  near(combine([{ f: 1, w: 1 }, { f: 1, w: 2 }]), 1);
  near(combine([{ f: 0.25, w: 1 }, { f: 1, w: 1 }]), 0.5);
  near(combine([{ f: 0, w: 1 }]), FLOOR);
  near(combine([{ f: 0.5, w: 0 }]), 1); // zero weight: ignored
  assert.equal(combine([]), 1);
});

test('normalisation: 0 to 100 within the area, NaN kept, flat input', () => {
  const n = normalise(new Float32Array([0.2, 0.6, 1.0, NaN]));
  near(n[0], 0); near(n[1], 50, 1e-4); near(n[2], 100); assert.ok(Number.isNaN(n[3]));
  const same = normalise([0.4, 0.4]);
  assert.equal(same[0], 100);
  const zero = normalise([0, 0]);
  assert.equal(zero[0], 0);
});

test('month overrides merge into the block, aspect key by key', () => {
  const sp = { months: { 11: { elev_m: [900, 1500] } }, blocks: { midday: { doing: 'bedded', sun: 'shade', aspect: { N: 1, S: 0.4 } } },
    month_overrides: { 11: { blocks: { midday: { doing: 'moving', aspect: { S: 0.8 } } }, note: 'rut' } } };
  const m = blockModel(sp, 11);
  assert.equal(m.blocks.midday.doing, 'moving');
  assert.equal(m.blocks.midday.sun, 'shade');
  assert.deepEqual(m.blocks.midday.aspect, { N: 1, S: 0.8 });
  assert.equal(m.note, 'rut');
  assert.deepEqual(m.month.elev_m, [900, 1500]);
  const o = blockModel(sp, 10);
  assert.equal(o.blocks.midday.doing, 'bedded');
  assert.equal(o.month, null);
});

test('time blocks follow the sun', () => {
  const H = 36e5, rise = 7 * H, set = 18 * H;
  const w = blockWindows(rise, set, rise - 0.5 * H, set + 0.5 * H);
  assert.equal(w.dawn.start, rise - 0.5 * H);
  assert.equal(w.dawn.end, rise + H);
  assert.equal(w.midday.start, 11 * H);
  assert.equal(w.midday.end, 14 * H);
  assert.equal(w.afternoon.end, set - H);
  assert.equal(w.dusk.end, set + 0.5 * H);
  assert.equal(w.dawn.mid, rise + 0.5 * H);
  // a short winter day keeps every block in order
  const s = blockWindows(8 * H, 15.5 * H);
  for (const [a, b] of [['dawn', 'morning'], ['morning', 'midday'], ['midday', 'afternoon'], ['afternoon', 'dusk']]) assert.ok(s[a].end <= s[b].end && s[a].end === s[b].start);
  assert.ok(s.morning.end > s.morning.start);
});

test('distance field: chamfer distance in metres', () => {
  const nx = 5, ny = 5, m = new Uint8Array(25); m[12] = 1; // centre
  const d = distanceField(m, nx, ny, 30);
  assert.equal(d[12], 0);
  assert.equal(d[13], 30);
  near(d[18], 30 * Math.SQRT2, 1e-3);
  assert.equal(d[14], 60);
  const none = distanceField(new Uint8Array(4), 2, 2, 30);
  assert.equal(none[0], Infinity);
});

test('terrain: slope and aspect of a plane, landforms, and the whole analysis', () => {
  // plane rising to the north at 30 m per 30 m cell (45 degrees), so it faces south
  const nx = 30, ny = 30, cell = 30, e = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) e[j * nx + i] = 1000 + (ny - j) * 30;
  const T = terrain(e, nx, ny, cell), k = 15 * nx + 15;
  near(T.slope[k], 45, 1e-3);
  near(T.aspect[k], 180, 1e-3);
  // a south face scores higher than a north face for a sun loving block
  const two = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) two[j * nx + i] = 1000 + Math.abs(j - 15) * -10; // ridge along row 15
  const r = analyse({ elev: two, nx, ny, cell, blocks: { midday: { aspect: { N: 0.2, NE: 0.3, E: 0.6, SE: 0.9, S: 1, SW: 0.9, W: 0.6, NW: 0.3 }, slope_deg: [0, 5, 30, 45], sun: 'sun' } },
    sun: { midday: { alt: 30, az: 180 } }, band: [700, 1100] });
  const b = r.blocks.midday, south = b.pct[22 * nx + 15], north = b.pct[8 * nx + 15];
  assert.ok(south > north, `south ${south} should beat north ${north}`);
  assert.equal(b.used.water, false);
  assert.equal(b.zones.length, 3);
  assert.ok(b.zones[0].pct >= b.zones[1].pct);
  assert.equal(r.area.inBand, 1);
  assert.equal(b.best.aspect, 'S');
});

test('top zones are spread out', () => {
  const nx = 40, ny = 40, p = new Float32Array(nx * ny);
  for (let k = 0; k < p.length; k++) p[k] = (k % nx) * 2; // best on the east edge
  const z = topZones(p, nx, ny, 30, 3, 400);
  for (let a = 0; a < z.length; a++) for (let c = a + 1; c < z.length; c++) assert.ok(Math.hypot(z[a].i - z[c].i, z[a].j - z[c].j) * 30 >= 400);
});

test('area stats: slope classes and band share', () => {
  const s = areaStats(new Float32Array([500, 900, 1200, NaN]), new Float32Array([5, 20, 50, NaN]), [800, 1300]);
  assert.equal(s.min, 500); assert.equal(s.max, 1200);
  near(s.inBand, 2 / 3);
  near(s.slopeShare[0], 1 / 3); near(s.slopeShare[1], 1 / 3); near(s.slopeShare[4], 1 / 3);
});
