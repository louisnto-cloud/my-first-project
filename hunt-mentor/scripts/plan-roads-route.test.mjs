// Road notices "On your route" sorting (app/addons/plan-live.js roadsCard, using HMPlanDays._noticesFor).
// Run: node --test scripts/plan-roads-route.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const here = new URL('..', import.meta.url);
const src = (p) => readFileSync(new URL(p, here), 'utf8');

function load() {
  const el = () => ({ set textContent(v) {}, appendChild() {}, classList: { add() {}, remove() {} } });
  const window = {};
  const sandbox = {
    window, console, setTimeout, clearTimeout, Date, Math, JSON, Intl, URL,
    document: { createElement: el, head: el(), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    fetch: () => Promise.reject(new Error('offline in test')),
    navigator: { onLine: false },
  };
  sandbox.self = sandbox.globalThis = window;
  Object.assign(window, sandbox);
  vm.createContext(sandbox);
  vm.runInContext(src('app/addons/plan-days.js'), sandbox, { filename: 'plan-days.js' });
  vm.runInContext(src('app/addons/plan-live.js'), sandbox, { filename: 'plan-live.js' });
  return window;
}

// Spot 1 of the Harrison deer plan: By Harrison Lake (B-deer-drive-0001), parking on the Harrison East FSR
const spot1Park = [-121.80903, 49.57216];
const spot1 = {
  id: 'B-deer-drive-0001', name: 'By Harrison Lake', lat: 49.5720, lon: -121.8100,
  detail: { park: spot1Park, driveVia: ['Hwy 7 (Lougheed Hwy)', 'Hwy 9 (Hot Springs Rd)', 'Rockwell Dr', 'Harrison East FSR'] },
};
const liveWith = (items) => ({
  center: { lat: 49.40, lon: -121.95 }, route: [spot1], days: [], perPoint: [],
  roads: { live: true, asOf: '2026-10-24T08:00:00-07:00', cert: 95, items },
});

test('a notice on the Harrison East FSR near spot 1 sorts first, ahead of closer notices off the route', () => {
  const W = load();
  assert.equal(typeof W.HMPlanLive.html, 'function');
  const items = [
    { road: 'Chehalis FSR', kind: 'warning', t: 'TEST far road: grading at 4 km.', km: 5, lat: 49.42, lon: -121.97 },
    { road: "Sts'ailes (West) FSR", kind: 'warning', t: 'TEST west road: washout at 9 km.', km: 9, lat: 49.45, lon: -121.99 },
    // fake: on spot 1's road, about 0.3 km from its parking, but farthest from the plan point
    { road: 'Harrison East FSR', kind: 'warning', t: 'TEST FAKE: rock on road near 7 km.', km: 22, lat: 49.5745, lon: -121.8080 },
  ];
  const out = W.HMPlanLive.html(liveWith(items), {});
  const iRoute = out.indexOf('On or near your route (1)');
  const iFake = out.indexOf('TEST FAKE');
  const iFar = out.indexOf('TEST far road');
  const iWest = out.indexOf('TEST west road');
  assert.ok(iRoute > 0, 'route block shown');
  assert.ok(iFake > iRoute, 'fake notice is inside the route block');
  assert.ok(iFake < iFar && iFake < iWest, 'fake notice sorts before the closer off route notices');
  assert.match(out.slice(iFake, iFake + 400), /On your route<\/b>: within 2 km, By Harrison Lake/);
  assert.match(out, /2 other notices within 40 km, not on your route/);
});

test('a Harrison East FSR notice with no point still counts as on the drive in', () => {
  const W = load();
  const items = [
    { road: 'Chehalis FSR', kind: 'warning', t: 'TEST far road.', km: 5, lat: 49.42, lon: -121.97 },
    { road: 'Harrison East FSR', kind: 'warning', t: 'TEST FAKE no point.', km: 30 },
  ];
  const out = W.HMPlanLive.html(liveWith(items), {});
  const iFake = out.indexOf('TEST FAKE no point');
  assert.ok(iFake > 0 && iFake < out.indexOf('TEST far road'), 'route notice first');
  assert.match(out.slice(iFake, iFake + 400), /on your drive in, By Harrison Lake/);
});
