// Checks data/analyze/species-model.json against the "Analyze this area" data contract.
// Usage: node scripts/check-species-model.mjs [path]   (no dependencies; exits 1 on any error)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || path.join(ROOT, 'data/analyze/species-model.json');
const SPECIES = ['mule-deer', 'white-tailed-deer', 'moose', 'elk', 'black-bear', 'grouse', 'quail', 'ducks', 'geese'];
const BLOCKS = ['dawn', 'morning', 'midday', 'afternoon', 'dusk'];
const ASPECTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const DOING = ['feeding', 'moving', 'bedded', 'loafing', 'roosting'];
const SUN = ['sun', 'shade', 'any'];
const TERRAIN = ['ridge', 'bench', 'draw', 'valley', 'any'];
const FACTORS = ['aspect', 'slope', 'sun', 'water', 'road', 'terrain'];

const errors = [];
const warns = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const num = (x) => typeof x === 'number' && Number.isFinite(x);
const isCert = (x) => num(x) && x >= 0 && x <= 100;

let m;
try { m = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(1); }

if (m.version !== 1) err('root', 'version must be 1');
if (!/^\d{4}-\d{2}-\d{2}$/.test(m.checked || '')) err('root', 'checked must be YYYY-MM-DD');
if (typeof m.factors_doc !== 'string' || !m.factors_doc) err('root', 'factors_doc missing');
if (!m.species || typeof m.species !== 'object') { err('root', 'species missing'); }

// Checks one block. partial = month override (fields optional).
function checkBlock(w, b, partial) {
  const has = (k) => b[k] !== undefined;
  const need = (k) => { if (!partial && !has(k)) err(w, `missing ${k}`); return has(k); };
  if (need('doing') && !DOING.includes(b.doing)) err(w, `doing "${b.doing}" not in ${DOING.join('|')}`);
  if (need('aspect')) {
    const a = b.aspect;
    if (!a || typeof a !== 'object') err(w, 'aspect must be an object');
    else {
      for (const k of ASPECTS) if (!num(a[k]) || a[k] < 0 || a[k] > 1) err(w, `aspect.${k} must be 0..1 (got ${a[k]})`);
      for (const k of Object.keys(a)) if (!ASPECTS.includes(k)) err(w, `aspect has unknown key ${k}`);
    }
  }
  if (need('slope_deg')) {
    const s = b.slope_deg;
    if (!Array.isArray(s) || s.length !== 4 || !s.every(num)) err(w, 'slope_deg must be 4 numbers');
    else {
      if (!(s[0] <= s[1] && s[1] <= s[2] && s[2] <= s[3])) err(w, `slope_deg not ordered: ${s.join(', ')}`);
      if (s[0] < 0 || s[3] > 90) err(w, `slope_deg outside 0..90: ${s.join(', ')}`);
    }
  }
  if (need('sun') && !SUN.includes(b.sun)) err(w, `sun "${b.sun}" not in ${SUN.join('|')}`);
  if (need('water_m') && b.water_m !== null) {
    const v = b.water_m;
    if (!Array.isArray(v) || v.length !== 2 || !v.every(num) || v[0] < 0 || v[0] > v[1]) err(w, `water_m must be null or [best_max <= ok_max] (got ${JSON.stringify(v)})`);
  }
  if (need('road_m') && b.road_m !== null && !(num(b.road_m) && b.road_m >= 0)) err(w, `road_m must be null or a number >= 0`);
  if (need('terrain') && !TERRAIN.includes(b.terrain)) err(w, `terrain "${b.terrain}" not in ${TERRAIN.join('|')}`);
  if (need('cert') && !isCert(b.cert)) err(w, `cert must be 0..100 (got ${b.cert})`);
  if (need('tip') && (typeof b.tip !== 'string' || !b.tip)) err(w, 'tip must be a non empty string');
  if (need('source') && (typeof b.source !== 'string' || !b.source)) err(w, 'source must be a non empty string');
  // Optional honesty fields: per factor certainty and gaps.
  if (has('factors')) {
    for (const k of FACTORS) if (!isCert(b.factors[k])) err(w, `factors.${k} must be 0..100`);
    const gaps = FACTORS.filter((k) => b.factors[k] === 0);
    if (has('gaps') && JSON.stringify(gaps) !== JSON.stringify(b.gaps)) err(w, `gaps ${JSON.stringify(b.gaps)} do not match factors with cert 0 ${JSON.stringify(gaps)}`);
    if (gaps.length && !/no data/.test(b.note || '')) err(w, 'a block with cert 0 factors needs a note saying "no data"');
    // A factor with no data must hold the neutral value.
    const neutral = {
      aspect: () => ASPECTS.every((k) => b.aspect[k] === 1),
      slope: () => JSON.stringify(b.slope_deg) === JSON.stringify([0, 0, 90, 90]),
      sun: () => b.sun === 'any', water: () => b.water_m === null, road: () => b.road_m === null, terrain: () => b.terrain === 'any',
    };
    const field = { aspect: 'aspect', slope: 'slope_deg', sun: 'sun', water: 'water_m', road: 'road_m', terrain: 'terrain' };
    for (const k of gaps) if (has(field[k]) && !neutral[k]()) err(w, `factor ${k} has cert 0 but is not neutral`);
  }
}

for (const id of SPECIES) {
  const sp = m.species?.[id];
  const w = `species.${id}`;
  if (!sp) { err(w, 'missing'); continue; }
  if (typeof sp.name !== 'string' || !sp.name) err(w, 'name missing');
  if (!/^mc-[a-z-]+-\d{2}$/.test(sp.lesson || '')) err(w, `lesson id looks wrong: ${sp.lesson}`);
  // months
  for (let i = 1; i <= 12; i++) {
    const mo = sp.months?.[String(i)];
    const mw = `${w}.months.${i}`;
    if (!mo) { err(mw, 'missing'); continue; }
    const e = mo.elev_m;
    if (!Array.isArray(e) || e.length !== 2 || !e.every(num) || e[0] > e[1] || e[0] < 0 || e[1] > 5000) err(mw, `elev_m must be [min <= max] metres (got ${JSON.stringify(e)})`);
    if (!isCert(mo.elev_cert)) err(mw, `elev_cert must be 0..100`);
    if (typeof mo.activity !== 'string' || !mo.activity) err(mw, 'activity missing');
    if (typeof mo.note !== 'string' || !mo.note) err(mw, 'note missing');
    if (mo.elev_cert === 0 && !/no data/.test(mo.note)) err(mw, 'elev_cert 0 needs note "no data"');
  }
  if (sp.months && Object.keys(sp.months).length !== 12) err(w, 'months must have exactly 12 keys');
  // blocks
  for (const bk of BLOCKS) {
    if (!sp.blocks?.[bk]) err(`${w}.blocks`, `missing ${bk}`);
    else checkBlock(`${w}.blocks.${bk}`, sp.blocks[bk], false);
  }
  for (const k of Object.keys(sp.blocks || {})) if (!BLOCKS.includes(k) && k !== 'night') err(`${w}.blocks`, `unknown block ${k}`);
  // overrides
  for (const [mo, ov] of Object.entries(sp.month_overrides || {})) {
    const ow = `${w}.month_overrides.${mo}`;
    if (!/^(1[0-2]|[1-9])$/.test(mo)) err(ow, 'key must be a month 1..12');
    for (const [bk, b] of Object.entries(ov.blocks || {})) {
      if (!BLOCKS.includes(bk)) err(ow, `unknown block ${bk}`);
      else {
        checkBlock(`${ow}.blocks.${bk}`, b, true);
        checkBlock(`${ow}.blocks.${bk} (merged)`, Object.assign({}, sp.blocks[bk], b), false);
      }
    }
  }
  // tips
  if (!Array.isArray(sp.tips) || !sp.tips.length) err(w, 'tips must be a non empty array');
  else sp.tips.forEach((t, i) => {
    if (typeof t.text !== 'string' || !t.text) err(`${w}.tips[${i}]`, 'text missing');
    if (!isCert(t.cert)) err(`${w}.tips[${i}]`, 'cert must be 0..100');
    if (!Array.isArray(t.months) || !t.months.length || !t.months.every((x) => Number.isInteger(x) && x >= 1 && x <= 12)) err(`${w}.tips[${i}]`, 'months must be integers 1..12');
  });
  if (!Array.isArray(sp.sources) || !sp.sources.length) err(w, 'sources must be a non empty array');
}
for (const k of Object.keys(m.species || {})) if (!SPECIES.includes(k)) warns.push(`unknown species id ${k}`);

// Style: no em dashes in owner facing text.
const raw = fs.readFileSync(file, 'utf8');
if (raw.includes('—')) err('style', 'em dash found');

// Summary
const summary = SPECIES.filter((id) => m.species?.[id]).map((id) => {
  const sp = m.species[id];
  const bc = BLOCKS.map((b) => sp.blocks[b]?.cert ?? 0);
  const ec = Object.values(sp.months).map((x) => x.elev_cert);
  const fc = BLOCKS.flatMap((b) => Object.values(sp.blocks[b]?.factors || {}));
  const gaps = [...new Set(BLOCKS.flatMap((b) => sp.blocks[b]?.gaps || []))];
  const avg = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0);
  return `${id.padEnd(18)} blocks ${avg(bc)}%  elevation ${avg(ec)}%  factors ${avg(fc)}%  cert 0 factors: ${gaps.join(', ') || 'none'}  sources ${sp.sources.length}`;
});
console.log(summary.join('\n'));
for (const x of warns) console.log('warn:', x);
if (errors.length) { console.error(`\n${errors.length} error(s):\n` + errors.join('\n')); process.exit(1); }
console.log(`\nOK: ${file} matches the contract.`);
