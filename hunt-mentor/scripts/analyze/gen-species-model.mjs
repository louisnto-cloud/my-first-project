// Generator for data/analyze/species-model.json (scratch tool, not shipped).
// Every value below is traced to a Masterclass lesson, a research log, or data/migration.json.
import fs from 'node:fs';
const ROOT = '/home/user/my-first-project/hunt-mentor';
const mig = JSON.parse(fs.readFileSync(ROOT + '/data/migration.json', 'utf8')).species;

const ASP = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
// Encoding of a written aspect preference: named = 1, next to a named one = 0.7, rest = 0.4.
function pref(...named) {
  const o = {};
  ASP.forEach((a, i) => {
    if (named.includes(a)) o[a] = 1;
    else if (named.includes(ASP[(i + 1) % 8]) || named.includes(ASP[(i + 7) % 8])) o[a] = 0.7;
    else o[a] = 0.4;
  });
  return o;
}
const NEUTRAL_ASP = Object.fromEntries(ASP.map((a) => [a, 1]));
const ANY_SLOPE = [0, 0, 90, 90];
const FLAT = [0, 0, 8, 15]; // app flat class (under 8 deg) + first app slope class (15 deg)
const ON_WATER = [0, 60]; // "on the water or its edge" = within one 30 to 60 m grid cell
const r1 = (x) => Math.round(x * 10) / 10;
// percent grade -> degrees
const pg = (p) => r1(Math.atan(p / 100) * 180 / Math.PI);

// Block builder. f = per factor certainty (0 = no data, neutral value used).
function B(o) {
  const f = Object.assign({ aspect: 0, slope: 0, sun: 0, water: 0, road: 0, terrain: 0 }, o.f || {});
  const b = {
    doing: o.doing,
    aspect: f.aspect ? o.aspect : NEUTRAL_ASP,
    slope_deg: f.slope ? o.slope : ANY_SLOPE,
    sun: f.sun ? o.sun : 'any',
    water_m: f.water ? o.water : null,
    road_m: f.road ? o.road : null,
    terrain: f.terrain ? o.terrain : 'any',
    cert: o.cert,
    tip: o.tip,
    source: o.source,
    factors: f,
  };
  const gaps = Object.keys(f).filter((k) => !f[k]);
  b.gaps = gaps;
  b.note = o.note || (gaps.length ? `factors without a source (neutral, cert 0): ${gaps.join(', ')}` : '');
  if (o.factor_notes) b.factor_notes = o.factor_notes;
  return b;
}
// Override: full merged block, emitted only for fields that changed (plus factors, gaps, note).
function OV(base, ch) {
  const merged = B(Object.assign({}, base._src, ch, { f: Object.assign({}, base._src.f, ch.f || {}), factor_notes: Object.assign({}, base._src.factor_notes || {}, ch.factor_notes || {}) }));
  const out = {};
  for (const k of Object.keys(merged)) if (JSON.stringify(merged[k]) !== JSON.stringify(base[k])) out[k] = merged[k];
  out.factors = merged.factors; out.gaps = merged.gaps; out.note = merged.note;
  return out;
}
function mk(o) { const b = B(o); Object.defineProperty(b, '_src', { value: o, enumerable: false }); return b; }

function monthsFrom(key, area, edits = {}) {
  const m = {};
  for (let i = 1; i <= 12; i++) {
    const x = mig[key].months[String(i)];
    m[String(i)] = Object.assign({ elev_m: x.elevM.slice(), elev_cert: x.cert, activity: '', note: `${x.where} General BC pattern from data/migration.json (BEC zone ranges, not collar data). ${area}` }, edits[i] || {});
  }
  return m;
}
function overrides(map) { // {months:[..], blocks:{dawn:ch}, note}
  const out = {};
  for (const g of map) for (const mo of g.months) {
    out[String(mo)] = out[String(mo)] || { blocks: {}, note: '' };
    for (const [bk, ch] of Object.entries(g.blocks)) out[String(mo)].blocks[bk] = OV(g.base[bk], ch);
    out[String(mo)].note = [out[String(mo)].note, g.note].filter(Boolean).join(' ');
  }
  return out;
}
const S = {}; // species

// ---------------- MULE DEER ----------------
{
  const src6 = 'mc-mule-deer-06; mc-mule-deer-07; research/2026-10-11-masterclass-mule-deer.md';
  const wr = [r1(Math.max(0, pg(10) - 5)), pg(10), pg(45), r1(pg(45) + 10)]; // winter range 10 to 45% slope
  const base = {
    dawn: mk({ doing: 'feeding', aspect: pref('S', 'SW', 'W'), slope: wr, sun: 'sun', water: [1000, 2400], road: 500, terrain: 'bench', cert: 85,
      f: { aspect: 85, slope: 50, sun: 50, water: 65, road: 60, terrain: 50 },
      factor_notes: { aspect: 'South and west faces October to winter (85%, chapter 6 map steps).', slope: 'Tip: winter range slope band 10 to 45% (6 to 24 deg) used for fall feeding; my reading.', sun: 'Tip: slopes that get first sun on a cold morning get early feeding deer.', water: 'Deer rarely more than about 2.4 km from water, prefer within about 1 km (65%, food water cover lesson). Matters most in a dry fall.', road: 'Hunters cluster within 0.5 km of roads (Penn State 2004, 60% applied to BC); Oregon GPS mule deer sat 1,250 m from open roads vs 190 m from closed (70%).', terrain: 'Tip: benches under steep ground are classic feeding edges.' },
      tip: 'Be on the glass before first light. Watch south and west faces as the sun hits them.', source: src6 }),
    morning: mk({ doing: 'moving', aspect: pref('N', 'NE', 'NW'), slope: wr, sun: 'shade', road: 500, terrain: 'ridge', cert: 85,
      f: { aspect: 80, slope: 50, sun: 80, road: 60, terrain: 60 },
      factor_notes: { aspect: 'Drifts uphill or into cover to bed (85%); warm days beds on north facing timber (80%).', terrain: 'Lore: bucks bed in the top third of a slope (60%, not a rule).', slope: 'Tip: winter range slope band used outside winter.', road: 'Pressured deer use thicker cover (65 to 70%); hunters cluster within 0.5 km of roads (60%).' },
      tip: 'After about 09:00 deer drift uphill into cover. Watch them to their beds.', source: src6 }),
    midday: mk({ doing: 'bedded', aspect: pref('N', 'NE', 'NW'), slope: wr, sun: 'shade', road: 500, terrain: 'bench', cert: 80,
      f: { aspect: 80, slope: 50, sun: 80, road: 60, terrain: 80 },
      factor_notes: { aspect: 'Warm day: north facing timber, benches, draws, shade (80%).', sun: 'Warm day beds in shade (80%).', terrain: 'Warm day beds on benches and in draws (80%).', slope: 'Tip: winter range slope band used outside winter.' },
      tip: 'Noon is for finding beds with binoculars, not walking. Check shaded benches and draws.', source: src6 }),
    afternoon: mk({ doing: 'moving', aspect: pref('N', 'NE', 'NW'), slope: wr, sun: 'shade', road: 500, terrain: 'bench', cert: 80,
      f: { aspect: 80, slope: 50, sun: 80, road: 60, terrain: 50 },
      factor_notes: { aspect: 'Late afternoon: rises and browses near the bed (80%), so still near the bed aspect.', terrain: 'Tip: benches near beds.', slope: 'Tip: winter range slope band used outside winter.' },
      tip: 'Late afternoon deer get up and browse near the bed. Be glassing by mid afternoon.', source: src6 }),
    dusk: mk({ doing: 'feeding', aspect: pref('S', 'SW', 'W'), slope: wr, water: [1000, 2400], road: 500, terrain: 'bench', cert: 85,
      f: { aspect: 85, slope: 50, water: 65, road: 60, terrain: 50 },
      factor_notes: { aspect: 'South and west faces October to winter (85%).', water: 'Dry fall: near water at dusk or dawn (Tip); within about 1 km of water preferred (65%).', slope: 'Tip: winter range slope band used outside winter.', terrain: 'Tip: benches and open feeding slopes.' },
      tip: 'Second peak sunset to about 21:00 (85%). Sit a seat that sees open feeding slopes.', source: src6 }),
  };
  const wrSrc = 'mc-mule-deer-05; mc-mule-deer-06; research/2026-10-11-rl.md (BC Chilcotin mule deer model, US Forest Service 1998 as cited)';
  const winterMid = { doing: 'bedded', aspect: pref('S', 'SW', 'W'), sun: 'sun', terrain: 'any', f: { aspect: 85, slope: 85, sun: 80, terrain: 0 }, factor_notes: { aspect: 'Cold day: sunny south and west slopes out of the wind (80%); winter range on warm aspects (85%).', sun: 'Cold day: sun (80%).', slope: 'Winter range 10 to 45% slope, south and west aspect (85%, BC habitat account citing US Forest Service 1998).', terrain: 'no data' }, source: wrSrc, tip: 'Cold day: look for bedded deer on sunny south and west slopes out of the wind.' };
  S['mule-deer'] = {
    name: 'Mule deer', lesson: 'mc-mule-deer-07',
    months: monthsFrom('muledeer', 'Area: Kamloops and Heffley Creek, Region 3.', {
      1: { activity: 'winter range', note: 'Winter range: low south and west slopes, old Douglas fir. Kamloops: habitat rule below about 1,000 m (75%); a studied Kamloops winter range sat below about 760 m (80%, Willms 1976). Band from data/migration.json. Area: Kamloops and Heffley Creek, Region 3.' },
      2: { activity: 'winter range' }, 3: { activity: 'winter range' },
      4: { activity: 'green up, low south slopes', note: 'April: deer on low south facing grassy slopes; the BC account names the Dewdrop Range near Kamloops (90%). Migrants leave late April to May (85%). Band from data/migration.json. Area: Kamloops, Region 3.' },
      5: { activity: 'spring migration' }, 6: { activity: 'summer range, fawning' }, 7: { activity: 'summer range' }, 8: { activity: 'summer range' },
      9: { activity: 'summer range, velvet off' },
      10: { elev_m: [900, 1500], elev_cert: 75, activity: 'fall, pre rut', note: 'Heffley Creek before the first snow: bucks often mid slope about 900 to 1,500 m on open fir and burn edges (75%, Heffley Creek lesson). Snow up high moves them down (85%); general BC band 400 to 1,800 m (70%). Area: Heffley Creek, Region 3.' },
      11: { activity: 'rut on or near winter range' }, 12: { activity: 'post rut, winter range' },
    }),
    blocks: base,
    month_overrides: overrides([
      { months: [11, 12, 1, 2, 3], base, blocks: { midday: winterMid, afternoon: Object.assign({}, winterMid, { doing: 'moving', tip: 'Cold afternoons: deer rise early and feed in the sun.', f: { aspect: 80, slope: 85, sun: 80, terrain: 0 } }) , dawn: { slope: wr, f: { slope: 85 }, factor_notes: { slope: 'Winter range 10 to 45% slope (85%).' } }, dusk: { slope: wr, f: { slope: 85 }, factor_notes: { slope: 'Winter range 10 to 45% slope (85%).' } } }, note: 'Cold months: beds on sunny south and west slopes (80%); winter range slope 10 to 45% (85%).' },
      { months: [11], base, blocks: { midday: Object.assign({}, winterMid, { doing: 'moving', cert: 70, tip: 'Rut: bucks follow does in daylight. Glass doe groups all day.' }) }, note: 'Rut mid November to mid December (80%): bucks move all day near does (65 to 75%).' },
      { months: [12], base, blocks: { midday: Object.assign({}, winterMid, { cert: 90, tip: 'Post rut bucks hide and rest (90%). Glass thick edges slowly.' }) }, note: 'Post rut: bucks hide and rest (90%).' },
      { months: [4], base, blocks: { dawn: { aspect: pref('S'), cert: 90, f: { aspect: 90 }, factor_notes: { aspect: 'April: low south facing grassy slopes for the first green (90%, BC account).' }, tip: 'April: glass low south facing grass slopes for green up.' }, dusk: { aspect: pref('S'), cert: 90, f: { aspect: 90 }, factor_notes: { aspect: 'April: low south facing grassy slopes (90%).' } } }, note: 'April green up on low south slopes (90%).' },
    ]),
    tips: [
      { text: 'Snow, not the rut, pushes deer down to winter range. First snow up high: hunt mid slopes below the snow line.', cert: 85, months: [10, 11] },
      { text: 'No snow yet in October: bucks often mid slope, about 900 to 1,500 m, on open fir and burn edges near Heffley Creek.', cert: 75, months: [10] },
      { text: 'Rut: find the does and stay out all day. Bucks follow them in daylight.', cert: 65, months: [11] },
      { text: 'Morning sun warms the slope and your scent drifts uphill; in the evening it slides downhill. Approach from above in the morning.', cert: 80, months: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: 'Pressured deer use thicker cover and move more at night. Walk farther from roads than other hunters (most stay within 0.5 km).', cert: 65, months: [9, 10, 11, 12] },
      { text: 'Winter range is fragile. If deer are moving away from you, you are too close.', cert: 85, months: [12, 1, 2, 3] },
      { text: 'No approved ungulate winter range polygons around Kamloops and Heffley Creek; use the habitat rule: south and west slopes, grass, pine and fir below about 1,000 m.', cert: 75, months: [11, 12, 1, 2, 3] },
    ],
    sources: [
      'BC Ministry (2000), Mule and Black-tailed Deer in British Columbia, https://www.env.gov.bc.ca/wld/documents/muledeer.pdf, checked 2026-10-11 (90%)',
      'BC Ministry (2003), mule deer habitat model, Central Okanagan, https://a100.gov.bc.ca/pub/acat/documents/r1757/whr_4002_modhe_1224094596301_8e248a8d30d8a9320898638a4b82840986e6405f8898.pdf, checked 2026-10-11 (85%)',
      'BC wildlife habitat rating account, mule deer, Chilcotin and Fraser Plateau (2004), https://a100.gov.bc.ca/pub/acat/documents/r1573/whr_4109_modhe_1097078581992_3f7c787cc7c9486aa185bdad7e4c4f53.pdf, via research/2026-10-11-rl.md, checked 2026-10-11 (85%)',
      'Stewart and others 2002, deer activity timing, https://academic.oup.com/jmammal/article/84/3/1076/905056, via research notes (85%)',
      'Mule Deer Working Group fact sheet 17, https://wildlife.utah.gov/pdf/deer/mdwg-17_winter_range_disturbance.pdf, checked 2026-10-11 (85%)',
      'Germaine and others 2004, mule deer day beds, https://www.esf.edu/biology/faculty/documents/Germaineetal2004muledeerdaybedsites.pdf, checked 2026-10-11 (60 to 80%)',
      'Willms 1976, deer diet near Kamloops, https://cdnsciencepub.com/doi/pdf/10.4141/cjas76-065, via research notes (85%)',
      'Luloff and others 2004, Penn State hunter movement report, https://ecosystems.psu.edu/research/pacfwru/reports/hunting-seasons/@@download/file/Final-huntmvmt-082004.pdf, via research/2026-10-11-rl.md (85% Pennsylvania, 60% applied to BC)',
      'Curtis and Du Toit 2017, Wildlife Society Bulletin 41, via Conservation Evidence, research/2026-10-11-rq.md, checked 2026-10-11 (70%)',
      'App data: data/migration.json (mule deer months, 60 to 80%), checked 2026-10-03',
      'Hunt Mentor lessons mc-mule-deer-05, 06, 07; local-heffley; food-water-cover',
    ],
  };
}

// ---------------- WHITE TAILED DEER ----------------
{
  const src = 'mc-white-tailed-deer-06; mc-white-tailed-deer-07; research/2026-10-11-masterclass-white-tailed-deer.md';
  const fn = { slope: 'Lower, flatter, brushier ground than mule deer (85%, Staudenmaier 2021); encoded as the app flat class (under 8 deg) with a shoulder to 15 deg (model choice).', terrain: 'Valley bottoms with farmland and river brush (85%, BC account).', road: 'Hunters cluster within 0.5 km of roads (Penn State 2004, a white tail study area, 60% applied to BC). White tails also live close to houses and roads (85%): pressure, not avoidance of roads as such.', water: 'no distance data; valley and riparian terrain used instead' };
  const base = {
    dawn: mk({ doing: 'moving', slope: FLAT, road: 500, terrain: 'valley', cert: 75, f: { slope: 70, road: 60, terrain: 85 }, factor_notes: fn, tip: 'At first light white tails drift from fields back to willow and cottonwood beds. Be set up before light, between field and bed.', source: src }),
    morning: mk({ doing: 'bedded', slope: FLAT, road: 500, terrain: 'valley', cert: 75, f: { slope: 70, road: 60, terrain: 85 }, factor_notes: fn, tip: 'Sit the first 2 hours of light, then scout or still hunt thick bottoms slowly.', source: src }),
    midday: mk({ doing: 'bedded', slope: FLAT, road: 500, terrain: 'valley', cert: 70, f: { slope: 70, road: 60, terrain: 85 }, factor_notes: fn, tip: 'Midday they are bedded in river brush, chewing cud. Under 50 m an hour of movement (75%).', source: src }),
    afternoon: mk({ doing: 'bedded', slope: FLAT, road: 500, terrain: 'valley', cert: 75, f: { slope: 70, road: 60, terrain: 85 }, factor_notes: fn, tip: 'Be in your evening stand at least 2 hours before dark. Deer stage at the field edge first.', source: src }),
    dusk: mk({ doing: 'feeding', slope: FLAT, road: 500, terrain: 'valley', cert: 80, f: { slope: 70, road: 60, terrain: 85 }, factor_notes: fn, tip: 'Hayfield and alfalfa edges at dusk. Leave after dark without crossing the field.', source: src }),
  };
  S['white-tailed-deer'] = {
    name: 'White tailed deer', lesson: 'mc-white-tailed-deer-07',
    months: monthsFrom('whitetail', 'Area: North Thompson valley near Heffley Creek, Region 3 (hayfields and cottonwood bottoms, 75%); local valley floor height VERIFY on the Hunt Map.', {
      1: { activity: 'winter range' }, 2: { activity: 'winter range' }, 3: { activity: 'winter range' }, 4: { activity: 'green up on fields' },
      5: { activity: 'fawning' }, 6: { activity: 'summer, floodplains' }, 7: { activity: 'summer, floodplains' }, 8: { activity: 'summer, floodplains' },
      9: { activity: 'velvet off' }, 10: { activity: 'pre rut' }, 11: { activity: 'rut' }, 12: { activity: 'post rut' },
    }),
    blocks: base,
    month_overrides: overrides([
      { months: [6, 7, 8, 9], base, blocks: Object.fromEntries(['dawn', 'morning', 'midday', 'afternoon', 'dusk'].map((k) => [k, { aspect: pref('N'), f: { aspect: 85 }, factor_notes: { aspect: 'Seasonal moves are across the valley: north facing slopes in summer, south facing sites in winter (85%, BC account).' } }])), note: 'Summer: north facing side of the valley (85%).' },
      { months: [12, 1, 2, 3], base, blocks: Object.assign(Object.fromEntries(['dawn', 'morning', 'afternoon', 'dusk'].map((k) => [k, { aspect: pref('S', 'SE', 'SW'), f: { aspect: 85 }, factor_notes: { aspect: 'Winter range: south to southwest slopes, fans and terraces (85%); Idaho: below about 900 m on southeast and southwest slopes (80%).' } }])), { midday: { doing: 'feeding', aspect: pref('S', 'SE', 'SW'), sun: 'sun', cert: 85, f: { aspect: 85, sun: 60 }, factor_notes: { aspect: 'Winter range south to southwest slopes (85%).', sun: 'Winter: active most of the day (85%); winter day beds in sun exposed spots (60%, Armstrong 1983, search preview).' }, tip: 'Winter: deer are active most of the day and use the warm midday sun.' } }), note: 'Winter: south slopes, active most of the day (85%).' },
      { months: [11], base, blocks: { midday: { doing: 'moving', cert: 70, tip: 'Rut: bucks search for does at any hour, midday too. Stay out all day.' } }, note: 'Rut peak mid November (80%): bucks move at all hours (70%).' },
    ]),
    tips: [
      { text: 'Most valley bottom land is private. Ask first, and check the private land layer before every sit.', cert: 95, months: [9, 10, 11, 12] },
      { text: 'Evening thermals drain cool air down to the river bottoms where white tails bed. Set up with that in mind.', cert: 80, months: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: 'Pressure turns white tails nocturnal and into thick cover. Midweek beats the weekend.', cert: 70, months: [9, 10, 11, 12] },
      { text: 'Late October: rubs then scrapes; bucks start moving in daylight.', cert: 65, months: [10] },
      { text: 'Deep snow over about 40 cm pushes white tails onto winter range and packed trails.', cert: 85, months: [12, 1, 2, 3] },
      { text: 'No white tail season in Region 2; from Mission the nearest white tail hunting is Region 3 or 8.', cert: 97, months: [9, 10, 11, 12] },
    ],
    sources: [
      'BC Ministry of Environment, White tailed deer in BC (Blood 2000), https://www.env.gov.bc.ca/wld/documents/whttail.pdf, via research notes (85%, 70% applied to the Thompson)',
      'US Forest Service species review, white tailed deer, https://www.fs.usda.gov/database/feis/animals/mammal/odvi/all.html, checked 2026-10-11 (85%)',
      'Idaho Fish and Game, Wildlife Express white tailed deer, https://idfg.idaho.gov/sites/default/files/wildlife-express_sept-2017-whitetalied-deer.pdf, checked 2026-10-11 (80%)',
      'Staudenmaier and others 2021, https://esajournals.onlinelibrary.wiley.com/doi/full/10.1002/ecs2.3813, checked 2026-10-01 (85%)',
      'Penn State, Wandering in the moonlight, https://deer.psu.edu/wandering-in-the-moonlight, via research/2026-10-11-rq.md (75%)',
      'Luloff and others 2004, Penn State hunter movement report, via research/2026-10-11-rq.md (85% Pennsylvania, 60% applied to BC)',
      'Armstrong and others 1983, white tail winter day beds, search preview via research/2026-10-11-rl.md (60%)',
      'App data: data/migration.json (white tail months, 60 to 70%), checked 2026-10-03',
      'Hunt Mentor lessons mc-white-tailed-deer-05, 06, 07, 03',
    ],
  };
}

// ---------------- MOOSE ----------------
{
  const src = 'mc-moose-06; mc-moose-07; research/2026-10-11-masterclass-moose.md; research/2026-10-11-analyze-model.md';
  const fn = { water: 'Wintering moose stayed mostly within 100 m of the forest and wetland edge and almost never past 200 m (Baker 1990, UBC thesis, West Chilcotin, search preview, 70%); wetlands are kitchens in every season (85%). Applied to fall: my reading.', slope: 'Tip: moose favour gentle, wet ground: benches, basins, valley floors. Encoded as the app flat class.', terrain: 'Tip: basins and valley floors with willow and wetlands.', road: 'Roads and open cutblocks made moose more vulnerable to hunters (90%, BC moose research); hunters cluster within 0.5 km of roads (60%).' };
  const base = {
    dawn: mk({ doing: 'feeding', slope: FLAT, water: [100, 200], road: 500, terrain: 'valley', cert: 75, f: { slope: 50, water: 60, road: 60, terrain: 50 }, factor_notes: fn, tip: 'Dawn: out at the willow flat, wetland edge or young cutblock. Glass the edges.', source: src }),
    morning: mk({ doing: 'feeding', slope: FLAT, water: [100, 200], road: 500, terrain: 'valley', cert: 75, f: { slope: 50, water: 60, road: 60, terrain: 50 }, factor_notes: fn, tip: 'Activity peaks about 2 hours after sunrise (75%, Minnesota GPS). Do not leave at sunrise.', source: src }),
    midday: mk({ doing: 'bedded', slope: FLAT, sun: 'shade', water: [100, 200], road: 500, terrain: 'valley', cert: 75, f: { slope: 50, sun: 65, water: 60, road: 60, terrain: 50 }, factor_notes: Object.assign({}, fn, { sun: 'Beds chosen as cooler thermal refuges in warm weather (65%); above about 14 deg C less moving in the open (70%).' }), tip: 'Midday: bedded in thick conifer or willow near water. Scout sign or still hunt timber slowly.', source: src }),
    afternoon: mk({ doing: 'bedded', slope: FLAT, water: [100, 200], road: 500, terrain: 'valley', cert: 70, f: { slope: 50, water: 60, road: 60, terrain: 50 }, factor_notes: fn, tip: 'Moose get up to feed several times a day (70%). Sit a wetland or cutblock edge for the last 3 hours.', source: src }),
    dusk: mk({ doing: 'feeding', slope: FLAT, water: [100, 200], road: 500, terrain: 'valley', cert: 75, f: { slope: 50, water: 60, road: 60, terrain: 50 }, factor_notes: fn, tip: 'Dusk: back out to feed. Shoot early enough to deal with a moose before dark.', source: src }),
  };
  const winter = { aspect: pref('S', 'SE', 'SW'), f: { aspect: 70, water: 70 }, factor_notes: { aspect: 'Dry interior Douglas fir units: moderate, south facing slopes with uneven aged stands within 100 m rate well for security and feeding (BC Chilcotin moose habitat model, read directly, 85%; applied near Kamloops 70%).', water: 'Winter: within 100 m of the forest and wetland edge, rarely past 200 m (70%, Baker 1990).' } };
  S.moose = {
    name: 'Moose', lesson: 'mc-moose-07',
    months: monthsFrom('moose', 'Area: forested plateaus above Heffley Creek (Heffley Lake, Paul Lake, Pinantan), MU 3-27, Region 3; the dry Thompson valley is not moose habitat (90%).', {
      1: { elev_m: [400, 1300], elev_cert: 75, activity: 'winter range', note: 'Winter: river valleys, burns, cutblocks, wetland complexes (90%). Areas above 1,300 m seldom used in winter (BC Chilcotin moose model, 85%); general band 400 to 1,500 m (70%). Area: plateaus and valleys around Heffley Creek, Region 3.' },
      2: { elev_m: [400, 1300], elev_cert: 75, activity: 'winter range', note: 'Winter range below about 1,300 m (85%, BC Chilcotin model). Area: Heffley Creek, Region 3.' },
      3: { elev_m: [400, 1300], elev_cert: 70, activity: 'late winter range', note: 'Late winter range below about 1,300 m (85%, BC Chilcotin model). Area: Heffley Creek, Region 3.' },
      4: { activity: 'spring range' }, 5: { activity: 'calving' }, 6: { activity: 'summer, lakes and wetlands' }, 7: { activity: 'summer, lakes and wetlands' }, 8: { activity: 'summer, young forest and water' },
      9: { activity: 'rut starts' }, 10: { activity: 'rut fades, bulls feed' },
      11: { activity: 'season 1 to 15 Nov; drifting down', note: 'Your 1 to 15 November bull is likely still high or mid slope, feeding hard (85%, my reading); moose stay high longer than deer or elk (90%). Band from data/migration.json (65%). Area: Heffley Creek plateaus, Region 3.' },
      12: { elev_m: [400, 1300], elev_cert: 70, activity: 'early winter range', note: 'Snow drives moose down slowly (90%); winter areas below about 1,300 m (85%, BC Chilcotin model). Area: Heffley Creek, Region 3.' },
    }),
    blocks: base,
    month_overrides: overrides([
      { months: [12, 1, 2, 3], base, blocks: Object.fromEntries(['dawn', 'morning', 'midday', 'afternoon', 'dusk'].map((k) => [k, k === 'midday' ? Object.assign({}, winter, { sun: 'any', f: Object.assign({}, winter.f, { sun: 0 }) }) : winter])), note: 'Winter: forest wetland edges and moderate south slopes.' },
      { months: [6, 7, 8], base, blocks: { midday: { water: ON_WATER, f: { water: 85 }, factor_notes: { water: 'Summer: feed in shallow ponds, dive for pondweeds, stand in water to cool (85 to 90%).' }, tip: 'Hot summer days: moose stand in water or bed in cool shade.' } }, note: 'Summer: lake shores, swamps and beaver ponds (90%).' },
      { months: [9, 10], base, blocks: { midday: { doing: 'moving', cert: 70, tip: 'Rut: bulls travel and call; calm, cool mornings carry calls far (65%).' } }, note: 'Rut late September to early October (90%).' },
    ]),
    tips: [
      { text: 'Willow, water and cover close together: that triangle is moose country.', cert: 90, months: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: 'Look for cutblocks 10 to 30 years old and burns 3 to 15 years old near wetlands.', cert: 65, months: [9, 10, 11, 12, 1, 2, 3] },
      { text: 'November in Region 3: think food and cover, not calling. The main rut is over.', cert: 85, months: [11] },
      { text: 'Evening air drains into low ground: keep your scent cone off the swamp.', cert: 80, months: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: 'Above about 14 deg C moose move less in the open. On warm days hunt the edges early and late.', cert: 70, months: [9, 10, 11] },
      { text: 'Plan the pack out: drop waypoints for kill sites near a road or trail before you shoot.', cert: 50, months: [11] },
    ],
    sources: [
      'BC Ministry (2000), Moose in British Columbia, https://www.env.gov.bc.ca/wld/documents/moose.pdf, checked 2026-10-11 (90%)',
      'BC wildlife habitat rating account, Moose, Chilcotin and Fraser Plateau (2004), https://a100.gov.bc.ca/pub/acat/documents/r1573/whr_4109_malal_1097078185680_3f7c787cc7c9486aa185bdad7e4c4f53.pdf, read directly 2026-10-11 (85%)',
      'Baker 1990, UBC MSc thesis, Winter habitat selection and use by moose in the West Chilcotin, https://open.library.ubc.ca/collections/831/items/1.0074938, search preview 2026-10-11 (70%)',
      'BC Ministry of Forests (2023), moose research progress report May 2022, read directly, checked 2026-10-11 (90%)',
      'University of Minnesota thesis, moose movement, summary via search, checked 2026-10-11 (75%)',
      'Wildlife Biology (2016), bed sites as thermal refuges, via search, checked 2026-10-11 (65%)',
      'App data: data/migration.json (moose months, 65 to 70%), checked 2026-10-03',
      'Hunt Mentor lessons mc-moose-03, 05, 06, 07',
    ],
  };
}

// ---------------- ELK ----------------
{
  const src = 'mc-elk-06; mc-elk-07; research/2026-10-11-masterclass-elk.md';
  const feedSlope = [0, 0, pg(30), pg(50)]; // 15 to 30% most used, drops past 40 to 50%
  const bedSlope = [0, pg(15), pg(30), pg(50)];
  const fn = { slope: 'Elk use slopes up to about 30 to 40%, most often 15 to 30% (8.5 to 16.7 deg); use drops sharply past 40 to 50% (27 deg) (80%, BC habitat model).', road: 'Oregon elk used habitat within 500 m of open roads half as much (60%, search preview); hunted elk become nocturnal (90%).' };
  const base = {
    dawn: mk({ doing: 'feeding', slope: feedSlope, road: 500, cert: 80, f: { slope: 80, road: 60 }, factor_notes: fn, tip: 'Elk feed in openings next to cover; most stay within 183 m of cover (80%). Glass meadow and burn edges.', source: src }),
    morning: mk({ doing: 'moving', slope: feedSlope, road: 500, cert: 80, f: { slope: 80, road: 60 }, factor_notes: fn, tip: 'The morning peak can come almost 2 hours after first light (80%). Stay in your seat.', source: src }),
    midday: mk({ doing: 'bedded', aspect: pref('N'), slope: bedSlope, sun: 'shade', road: 500, cert: 75, f: { aspect: 75, slope: 80, sun: 75, road: 60 }, factor_notes: Object.assign({}, fn, { aspect: 'Summer day beds on north aspects, cooler, over 54% canopy (75%, Millspaugh 1998).', sun: 'Heat: elk pick shade and north slopes (75%).' }), tip: 'Do not walk into midday beds: the herd leaves the drainage. Glass edges and wait.', source: src }),
    afternoon: mk({ doing: 'bedded', aspect: pref('N'), slope: bedSlope, sun: 'shade', road: 500, cert: 75, f: { aspect: 75, slope: 80, sun: 75, road: 60 }, factor_notes: Object.assign({}, fn, { aspect: 'Summer day beds on north aspects (75%).', sun: 'Heat pushes elk to shade (75%).' }), tip: 'Be set up over an opening next to timber before the evening move.', source: src }),
    dusk: mk({ doing: 'feeding', slope: feedSlope, road: 500, cert: 80, f: { slope: 80, road: 60 }, factor_notes: fn, tip: 'Dusk: out to feed. Under pressure elk go farther into the open only after dark.', source: src }),
  };
  const winterAsp = { aspect: pref('S', 'SW'), f: { aspect: 80 }, factor_notes: { aspect: 'Winter and spring: south to southwest exposures preferred (80%, BC habitat model).' } };
  S.elk = {
    name: 'Elk', lesson: 'mc-elk-07',
    months: monthsFrom('elk', 'Area: no Kamloops elk elevation data; Region 3 Thompson holds only 300 to 500 elk (90%) and has no general open season (99%). Region 8 Okanagan holds 2,500 to 3,500 (90%).', {
      1: { activity: 'winter range' }, 2: { activity: 'winter range' }, 3: { activity: 'winter range, antlers drop' }, 4: { activity: 'green up on winter range' },
      5: { activity: 'migration up, calving' }, 6: { activity: 'subalpine summer range' }, 7: { activity: 'subalpine summer range' }, 8: { activity: 'subalpine summer range' },
      9: { activity: 'rut' }, 10: { activity: 'late rut, moving down' }, 11: { activity: 'back on winter range' }, 12: { activity: 'winter range' },
    }),
    blocks: base,
    month_overrides: overrides([
      { months: [11, 12, 1, 2, 3, 4], base, blocks: Object.fromEntries(['dawn', 'morning', 'midday', 'afternoon', 'dusk'].map((k) => [k, (k === 'midday' || k === 'afternoon') ? Object.assign({}, winterAsp, { sun: 'any', f: { aspect: 80, sun: 0 } }) : winterAsp])), note: 'Winter and spring: low south and southwest slopes (80%).' },
      { months: [9], base, blocks: { midday: { doing: 'moving', cert: 70, tip: 'Peak rut: bulls active all day; wallows may be visited at any hour (70%).' } }, note: 'Rut: most cows bred mid to late September (90%).' },
    ]),
    tips: [
      { text: 'Rut bulls are most vocal at dawn, dusk and through the night. Listen before you walk.', cert: 70, months: [9, 10] },
      { text: 'Early morning cool air flows downhill: approach from below early and late, from above at midday.', cert: 75, months: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: 'Pressured elk hold in timber by day and feed at night. Hunt far from roads or refuge edges at first and last light.', cert: 80, months: [9, 10, 11] },
      { text: 'Last week of October: look lower and in timber as snow pushes herds down.', cert: 60, months: [10] },
      { text: 'Region 3 has no general elk season; Region 8 6 point bulls only. Check the Rule Book.', cert: 99, months: [9, 10] },
    ],
    sources: [
      'BC Ministry (2000), Elk in British Columbia, https://www.env.gov.bc.ca/wld/documents/elk.pdf, checked 2026-10-11 (90%)',
      'BC habitat models for Rocky Mountain elk, La Biche and Sandy Creek, https://a100.gov.bc.ca/pub/acat/documents/r1651/whr_4012_mceel_1098209135230_07a33d337dd7428586868202f6bc05bd.pdf, and Muskwa, https://a100.gov.bc.ca/pub/acat/documents/r1583/whr_4069_mceel_1117055960977_ad101d33f76a47c38b67f114e5fbb078.pdf, checked 2026-10-11 (80%)',
      'Ensing and others 2014, GPS daily activity of elk, https://pmc.ncbi.nlm.nih.gov/articles/PMC4160215/, checked 2026-10-11 (80%)',
      'Millspaugh and others 1998, summer bed sites (abstract, search preview, 75%)',
      'BHA literature review on roads and elk, via research/2026-10-11-rq.md, search preview (60%)',
      'App data: data/migration.json (elk months, 55 to 70%), checked 2026-10-03',
      'Hunt Mentor lessons mc-elk-03, 05, 06, 07',
    ],
  };
}

// ---------------- BLACK BEAR ----------------
{
  const src = 'mc-black-bear-06; mc-black-bear-07; research/2026-10-11-masterclass-black-bear.md';
  const fn = { terrain: 'Tip: near Heffley Creek bears hold on timbered slopes, creek draws and cutblocks above the dry valley (my reading of the BC account).', road: 'Bears near people feed more at night (75%, WildSafeBC); hunters cluster within 0.5 km of roads (60%).' };
  const base = {
    dawn: mk({ doing: 'feeding', road: 500, terrain: 'draw', cert: 70, f: { road: 60, terrain: 50 }, factor_notes: fn, tip: 'On a glassing knob before light. Glass berry slopes and cutblock edges.', source: src }),
    morning: mk({ doing: 'feeding', road: 500, terrain: 'draw', cert: 65, f: { road: 60, terrain: 50 }, factor_notes: fn, tip: 'Fall bears feed much of the day (65%). Keep glassing the best food.', source: src }),
    midday: mk({ doing: 'bedded', sun: 'shade', road: 500, terrain: 'draw', cert: 50, f: { sun: 50, road: 60, terrain: 50 }, factor_notes: Object.assign({}, fn, { sun: 'Tip: hot days, shade and water in creek bottoms.' }), tip: 'Tip: beds in thick cover near food. Scout sign and check the wind.', source: src }),
    afternoon: mk({ doing: 'feeding', road: 500, terrain: 'draw', cert: 65, f: { road: 60, terrain: 50 }, factor_notes: fn, tip: 'From about 15:00 be back on glass over the best food.', source: src }),
    dusk: mk({ doing: 'feeding', road: 500, terrain: 'draw', cert: 70, f: { road: 60, terrain: 50 }, factor_notes: fn, tip: 'Dawn and dusk peaks (70%). Big boars often use the last light (Tip).', source: src }),
  };
  const spring = { aspect: pref('S', 'SW'), slope: [0, 0, 25, 35], terrain: 'any', f: { aspect: 90, slope: 50, terrain: 0 }, factor_notes: { aspect: 'Spring food on grassy south facing slopes (90%, BC account).', slope: 'Tip (Hunt Map steps): south and southwest, under 25 deg, low, near cover. Shoulder to 35 deg is a model choice.', terrain: 'no data' } };
  S['black-bear'] = {
    name: 'Black bear', lesson: 'mc-black-bear-07',
    months: monthsFrom('blackbear', 'Area: Heffley Creek, Region 3: few bears on the dry grassland bottoms; timbered slopes, creek draws and cutblocks above hold them (Tip).', {
      1: { activity: 'denned' }, 2: { activity: 'denned' }, 3: { activity: 'mostly denned' },
      4: { activity: 'den out, low green up', note: 'Den exit 4 April to 22 May near the Okanagan (80%, Gaines 2003). Spring food on low grassy south slopes and valley bottoms (85 to 90%). Band from data/migration.json (70%). Area: Heffley Creek, Region 3.' },
      5: { activity: 'green up climbs' }, 6: { activity: 'mating' }, 7: { activity: 'berries start' }, 8: { activity: 'berries' },
      9: { activity: 'fall feeding (hyperphagia)' }, 10: { activity: 'fall feeding, den entry starts' },
      11: { activity: 'den entry', note: 'Den entry near the Okanagan: females 15 Oct to 19 Nov, males 22 Oct to 19 Nov (80%, Gaines 2003). Mostly big males left late in the month (Tip). Band from data/migration.json (65%).' },
      12: { activity: 'denned' },
    }),
    blocks: base,
    month_overrides: Object.assign(overrides([
      { months: [4, 5, 6], base, blocks: Object.fromEntries(['dawn', 'morning', 'afternoon', 'dusk'].map((k) => [k, spring])), note: 'Spring: low grassy south slopes, road edges and cutblocks that green up first (65 to 90%).' },
    ]), Object.fromEntries([1, 2, 12].map((m) => [String(m), { blocks: {}, note: 'Denned: habitat match is not meaningful this month (70%).' }]))),
    tips: [
      { text: 'Find the ripe berry patch this week; last week\'s patch may be done. Berries ripen low first, then higher.', cert: 70, months: [7, 8, 9, 10] },
      { text: 'Young cutblocks (about 5 to 20 years) and burns (about 3 to 15 years) grow bear food; closed young forest grows little.', cert: 90, months: [6, 7, 8, 9, 10] },
      { text: 'Spring: lean bears on the first green grass of low south slopes and road edges. Late April and May beat early April.', cert: 65, months: [4, 5] },
      { text: 'Evening thermals slide downhill: sit above or to the side of an evening berry slope.', cert: 80, months: [4, 5, 6, 7, 8, 9, 10, 11] },
      { text: 'Late fall: sows den first, big boars last. Few bears by late November.', cert: 80, months: [10, 11] },
    ],
    sources: [
      'BC Ministry (2001), Black Bears in British Columbia, https://www.env.gov.bc.ca/wld/documents/blackbear.pdf, checked 2026-10-11 (90%)',
      'Alaska Department of Fish and Game, Black bear, https://www.adfg.alaska.gov/index.cfm?adfg=blackbear.main, checked 2026-10-11 (85%)',
      'WildSafeBC, Black bear, https://wildsafebc.com/species/black-bear/, checked 2026-10-11 (75%)',
      'Gaines 2003, black bear denning in the northeastern Cascades, https://www.canadianfieldnaturalist.ca/index.php/cfn/article/download/833/833/3326, via research notes (80%)',
      'Geography Realm, Massachusetts GPS study of 86 bears, search preview, checked 2026-10-11 (65%)',
      'App data: data/migration.json (black bear months, 55 to 70%), checked 2026-10-03',
      'Hunt Mentor lessons mc-black-bear-03, 05, 06, 07',
    ],
  };
}

// ---------------- GROUSE (ruffed, spruce, dusky) ----------------
{
  const src = 'mc-grouse-06; mc-grouse-07; research/2026-10-11-masterclass-grouse.md';
  const fn = { aspect: 'Tip: south and east faces warm first; aspen benches often sit there in the Interior.', sun: 'Tip: morning sun on a slope can bring birds out to feed.', terrain: 'Near Heffley Creek: Douglas fir and aspen benches above the valley hold ruffed grouse (Tip, 65%).', water: 'Ruffed grouse: aspen, poplar, birch and alder near water (85%), no distance data', road: 'Birds feed and pick grit on road edges, so roads are not avoided; birds near open roads are shot more (75%). See tips.' };
  const base = {
    dawn: mk({ doing: 'feeding', aspect: pref('E', 'SE', 'S'), sun: 'sun', terrain: 'bench', cert: 75, f: { aspect: 50, sun: 50, terrain: 65 }, factor_notes: fn, tip: 'First light to mid morning: edges, old roads and trails for grit, clover and berries.', source: src }),
    morning: mk({ doing: 'feeding', aspect: pref('E', 'SE', 'S'), sun: 'sun', terrain: 'bench', cert: 75, f: { aspect: 50, sun: 50, terrain: 65 }, factor_notes: fn, tip: 'Walk an old closed road or trail away from traffic.', source: src }),
    midday: mk({ doing: 'loafing', terrain: 'bench', cert: 70, f: { terrain: 65 }, factor_notes: fn, tip: 'Midday birds loaf and dust bathe; spruce and dusky sit in conifers. Slow down and look up.', source: src }),
    afternoon: mk({ doing: 'feeding', terrain: 'bench', cert: 70, f: { terrain: 65 }, factor_notes: fn, tip: 'Last 2 hours of light: birds feed again on edges, berries and clover.', source: src }),
    dusk: mk({ doing: 'roosting', terrain: 'bench', cert: 75, f: { terrain: 65 }, factor_notes: fn, tip: 'Birds go to roost in trees, on the ground or in soft snow. Timber gets dark before legal light ends.', source: src }),
  };
  const union = (i) => { const d = mig.dusky.months[i], sp = mig.spruce.months[i], ru = mig.ruffed.months[i]; return { lo: Math.min(750, d.elevM[0]), hi: Math.max(1250, d.elevM[1], sp.elevM[1]), c: Math.min(d.cert, sp.cert, ru.cert) }; };
  const months = {};
  const acts = { 1: 'winter: buds and needles', 2: 'winter: buds and needles', 3: 'late winter', 4: 'drumming and hooting', 5: 'nesting', 6: 'broods', 7: 'broods', 8: 'families together', 9: 'fall shuffle', 10: 'fall shuffle, dusky move uphill', 11: 'winter range', 12: 'winter, snow roosts' };
  for (let i = 1; i <= 12; i++) {
    const u = union(i);
    months[String(i)] = { elev_m: [u.lo, u.hi], elev_cert: u.c, activity: acts[i], note: `Combined band: ruffed grouse most abundant 750 to 1,250 m (85%, BC atlas) plus spruce grouse ${mig.spruce.months[i].elevM.join(' to ')} m and dusky grouse ${mig.dusky.months[i].elevM.join(' to ')} m this month (general pattern, data/migration.json). Area: Heffley Creek, MU 3-27: ruffed on fir and aspen benches above the valley; spruce and dusky higher toward Heffley Lake and Sun Peaks (Tip, 65%).` };
  }
  S.grouse = {
    name: 'Grouse (ruffed, spruce, dusky)', lesson: 'mc-grouse-07',
    months,
    blocks: base,
    month_overrides: overrides([
      { months: [12, 1, 2], base, blocks: { midday: { doing: 'feeding', cert: 50, tip: 'Bitter cold: some birds feed in the warmest hours, about 13:00 to 16:00 (hunter account, Tip).' } }, note: 'Hard crust or thin snow pushes birds into thick conifers (85%).' },
      { months: [10, 11], base, blocks: { midday: { cert: 70, tip: 'Dusky grouse move uphill into dense conifers in fall (70 to 75%); look high in big Douglas fir.' } }, note: 'Fall: dusky and sooty grouse move uphill into dense conifers (70 to 75%).' },
    ]),
    tips: [
      { text: 'Walk more than 200 m from open roads: in Pennsylvania birds near roads were shot far more (48% vs 19%).', cert: 75, months: [9, 10, 11] },
      { text: 'Young forest under about 20 years old, aspen and creek bottoms: ruffed grouse cover.', cert: 75, months: [9, 10, 11, 12] },
      { text: 'October: young birds feed on road edges, clover and berries. Leaves down, birds up.', cert: 75, months: [10] },
      { text: 'Calm overcast days are best; wind makes birds wild (hunter lore).', cert: 55, months: [9, 10, 11] },
      { text: 'Region 3 grouse close 30 November. Sun Peaks: no hunting within 400 m of lifts and runs.', cert: 99, months: [9, 10, 11] },
    ],
    sources: [
      'BC Breeding Bird Atlas accounts (ruffed, spruce, dusky grouse), read 2026-10-01 to 2026-10-03 (85%)',
      'Hinterland Who\'s Who, Ruffed grouse, https://www.hww.ca/en/wildlife/birds/ruffed-grouse.html, checked 2026-10-11 (85%)',
      'Pennsylvania Game Commission, Ruffed grouse, https://www.pa.gov/agencies/pgc/wildlife/discover-pa-wildlife/ruffed-grouse, checked 2026-10-11 (75%)',
      'Idaho Fish and Game, field and forest grouse, https://idfg.idaho.gov/press/field-forest-grouse, checked 2026-10-11 (75%)',
      'Audubon and Colorado Parks and Wildlife, dusky grouse, read 2026-10-03 (70%)',
      'Washington Department of Fish and Wildlife, spruce grouse, read 2026-10-01 (80%)',
      'App data: data/migration.json (ruffed, spruce, dusky months, 55 to 75%), checked 2026-10-03',
      'Hunt Mentor lessons mc-grouse-03, 05, 06, 07',
    ],
  };
}

// ---------------- QUAIL ----------------
{
  const src = 'mc-quail-06; mc-quail-07; research/2026-10-11-masterclass-quail.md';
  const fn = { slope: 'Valley floor and first benches (85%); encoded as the app flat class with a shoulder to 15 deg (model choice, 60%).', terrain: 'Valley floor and first benches, brush beside food (85%).', water: 'Need free water daily in hot weather and gather near it in dry weather (80%), but no distance data', aspect: 'Tip: brushy edges that catch the first sun.', sun: 'Tip: on frosty mornings birds may wait for sun on the brush.' };
  const base = {
    dawn: mk({ doing: 'feeding', aspect: pref('E', 'SE', 'S'), slope: FLAT, sun: 'sun', terrain: 'valley', cert: 70, f: { aspect: 50, slope: 60, sun: 50, terrain: 85 }, factor_notes: fn, tip: 'Be in place and quiet at first light. Listen for assembly calls before you walk.', source: src }),
    morning: mk({ doing: 'feeding', aspect: pref('E', 'SE', 'S'), slope: FLAT, sun: 'sun', terrain: 'valley', cert: 70, f: { aspect: 50, slope: 60, sun: 50, terrain: 85 }, factor_notes: fn, tip: 'Feeding stays within about 15 to 30 m of cover (80%). Work brush edges.', source: src }),
    midday: mk({ doing: 'loafing', slope: FLAT, terrain: 'valley', cert: 75, f: { slope: 60, terrain: 85 }, factor_notes: fn, tip: 'Midday: rest in thick cover, dust bathe, drink. Birds hold tight. Take your own break.', source: src }),
    afternoon: mk({ doing: 'feeding', slope: FLAT, terrain: 'valley', cert: 70, f: { slope: 60, terrain: 85 }, factor_notes: fn, tip: 'Second feed in late afternoon. The last 2 hours before sunset are prime.', source: src }),
    dusk: mk({ doing: 'roosting', slope: FLAT, terrain: 'valley', cert: 75, f: { slope: 60, terrain: 85 }, factor_notes: fn, tip: 'Dusk chorus as coveys gather to roost in dense trees or shrubs. Stop early so coveys can regroup.', source: src }),
  };
  S.quail = {
    name: 'California quail', lesson: 'mc-quail-07',
    months: monthsFrom('quail', 'Area: South Okanagan, Region 8 (Osoyoos, Oliver, Vaseux Lake, MU 8-1). Most BC birds at 250 to 500 m (85%, BC atlas). No quail season at Heffley Creek or Mission.', {
      1: { activity: 'winter coveys' }, 2: { activity: 'winter coveys' }, 3: { activity: 'coveys break up' }, 4: { activity: 'pairs, spring dispersal' },
      5: { activity: 'nesting' }, 6: { activity: 'broods' }, 7: { activity: 'broods' }, 8: { activity: 'families join coveys' },
      9: { activity: 'fall coveys' }, 10: { activity: 'season, fall coveys' }, 11: { activity: 'season, winter range' }, 12: { activity: 'winter coveys' },
    }),
    blocks: base,
    month_overrides: overrides([
      { months: [12, 1, 2], base, blocks: Object.fromEntries(['dawn', 'morning', 'midday', 'afternoon'].map((k) => [k, { aspect: pref('S'), sun: 'sun', f: { aspect: 50, sun: 50 }, factor_notes: { aspect: 'Tip (60%): snow after a cold night pushes coveys to sunny slopes and bare ground, closer to houses.', sun: 'Tip (60%): sunny slopes after snow.' } }])), note: 'Snow pushes coveys to sunny slopes and bare ground (Tip, 60%).' },
    ]),
    tips: [
      { text: 'Most South Okanagan quail sit on private land: farms, orchards and town edges. Ask first.', cert: 75, months: [10, 11] },
      { text: 'Best window: late October to mid November, leaves down and coveys formed.', cert: 50, months: [10, 11] },
      { text: 'Pushed birds near trees may perch up. Walk away and come back in 30 to 60 minutes.', cert: 75, months: [10, 11] },
      { text: 'Hot dry days: quail need water daily. Check brushy draws near water.', cert: 80, months: [9, 10] },
      { text: 'Vaseux Lake is a sanctuary and towns ban shooting by bylaw. Check the layers before you load.', cert: 95, months: [10, 11] },
    ],
    sources: [
      'BC Breeding Bird Atlas, California quail, https://www.birdatlas.bc.ca/accounts/speciesaccount.jsp?sp=CAQU&lang=en, checked 2026-10-11 (85%)',
      'California Wildlife Habitat Relationships, California quail (Ahlborn), https://ncrcd.specialdistrict.org/files/b900df31f/California-Quail-info.pdf, checked 2026-10-11 (80%)',
      'Friends of Edgewood, California quail (from Calkins and others 1999), https://friendsofedgewood.org/?p=5231, checked 2026-10-11 (70%)',
      'Washington Fish and Wildlife, quail hunting, https://wdfw.wa.gov/node/68963, checked 2026-10-11 (75%)',
      'App data: data/migration.json (quail months, 60 to 75%), checked 2026-10-03',
      'Hunt Mentor lessons mc-quail-03, 05, 06, 07; local-okanagan',
    ],
  };
}

// ---------------- DUCKS ----------------
{
  const src = 'mc-ducks-06; mc-ducks-07; research/2026-10-11-masterclass-ducks.md';
  const fn = { slope: 'Water and fields are flat ground: app flat class (my reading, 60%).', terrain: 'Most important Interior waterfowl habitat lies in the valleys and on mid elevation plateaus (75%, Ducks Unlimited).', water: 'On the water or its edge, encoded as within one 30 to 60 m grid cell. Day sites on water (80%).' };
  const fieldNote = Object.assign({}, fn, { water: 'Field feeding: mallards commute 3.1 to 15 km between day and night sites (85%, Link 2011), so no distance to water is used' });
  const base = {
    dawn: mk({ doing: 'moving', slope: FLAT, terrain: 'valley', cert: 80, f: { slope: 60, terrain: 75 }, factor_notes: fieldNote, tip: 'Two flights a day: out to feed at first light. Be set up and quiet before the first bird can see.', source: src }),
    morning: mk({ doing: 'loafing', slope: FLAT, water: ON_WATER, terrain: 'valley', cert: 80, f: { slope: 60, water: 80, terrain: 75 }, factor_notes: fn, tip: 'After the morning feed ducks rest on water. Puddle ducks in shallow bays; divers raft off points.', source: src }),
    midday: mk({ doing: 'loafing', slope: FLAT, water: ON_WATER, terrain: 'valley', cert: 80, f: { slope: 60, water: 80, terrain: 75 }, factor_notes: fn, tip: 'Midday on water. Windy days: ducks hold on the lee side of ponds (65%).', source: src }),
    afternoon: mk({ doing: 'loafing', slope: FLAT, water: ON_WATER, terrain: 'valley', cert: 80, f: { slope: 60, water: 80, terrain: 75 }, factor_notes: fn, tip: 'Wigeon raft until late afternoon, then move into marshes to feed (80%).', source: src }),
    dusk: mk({ doing: 'feeding', slope: FLAT, terrain: 'valley', cert: 80, f: { slope: 60, terrain: 75 }, factor_notes: fieldNote, tip: 'Late day: mallards to cut grain fields, then back to the marsh for the night.', source: src }),
  };
  S.ducks = {
    name: 'Ducks', lesson: 'mc-ducks-07',
    months: monthsFrom('ducks', 'Area: Kamloops (Region 3: Thompson wetlands, mallard and gadwall breed mostly below 500 m, 85%) and the Fraser Valley (Region 2, near sea level).', {
      1: { activity: 'wintering on open water' }, 2: { activity: 'wintering, pairs' }, 3: { activity: 'spring move north' }, 4: { activity: 'arrive to breed' },
      5: { activity: 'nesting' }, 6: { activity: 'broods' }, 7: { activity: 'moult, flightless' }, 8: { activity: 'early migrants' },
      9: { activity: 'fall migration' }, 10: { activity: 'peak fall passage' }, 11: { activity: 'freeze up, valley water' }, 12: { activity: 'wintering waters' },
    }),
    blocks: base,
    month_overrides: overrides([
      { months: [11, 12, 1, 2], base, blocks: Object.fromEntries(['morning', 'midday', 'afternoon'].map((k) => [k, { aspect: pref('S'), f: { aspect: 50 }, factor_notes: { aspect: 'Tip: south facing shores warm and open first. In a cold snap find the one open, sheltered patch of water.' } }])), note: 'Freeze up: birds pack onto open valley water and the coast (65%).' },
    ]),
    tips: [
      { text: 'Pressure pushes the feeding flight into the dark. Hunt the line between refuge and food at first and last light.', cert: 80, months: [9, 10, 11, 12, 1] },
      { text: 'Ducks land into the wind: set the spread so they cross in front of you.', cert: 80, months: [9, 10, 11, 12, 1] },
      { text: 'Hunt the morning after a cold front passes: new birds decoy better (lore).', cert: 65, months: [10, 11] },
      { text: 'Plateau lakes freeze in October and November; then hunt valley water and rivers that stay open.', cert: 65, months: [10, 11] },
      { text: 'Tranquille is a No Shooting area and Vaseux Lake is a sanctuary. Check the Rule Book for your district.', cert: 99, months: [9, 10, 11, 12, 1] },
    ],
    sources: [
      'Ducks Unlimited Canada waterfowl ID guide, https://www.ducks.ca/assets/2021/10/waterfowl-ID-guide-2020-EN-reader-spreads.pdf, checked 2026-10-01 (80%)',
      'Ducks Unlimited, Ducks after dark (Humburg 2009), https://ducks.org/conservation/waterfowl-research-science/ducks-after-dark, checked 2026-10-11 (70 to 80%)',
      'Ducks Unlimited, the science of disturbance (2026), https://www.ducks.org/conservation/waterfowl-research-science/understanding-waterfowl-the-science-of-disturbance, checked 2026-10-11 (80%)',
      'Ducks Unlimited, BC Intermountain, https://www.ducks.org/conservation/international-conservation-plan/bc-intermountain, checked 2026-10-11 (70 to 75%)',
      'Link and others 2011, Waterbirds 34(4), mallard day and night sites, via research/2026-10-11-rq.md (85%)',
      'BC Breeding Bird Atlas, https://www.birdatlas.bc.ca/accounts/speciesaccount.jsp?lang=en&sp=MALL, checked 2026-10-01 (85%)',
      'App data: data/migration.json (ducks months, 55 to 65%), checked 2026-10-03',
      'Hunt Mentor lessons mc-ducks-03, 05, 06, 07',
    ],
  };
}

// ---------------- GEESE ----------------
{
  const src = 'mc-geese-06; mc-geese-07; research/2026-10-11-masterclass-geese.md';
  const fn = { slope: 'Water and open fields are flat ground: app flat class (my reading, 60%).', terrain: 'Tip (65%): river bars and hay or grain fields in the valley bottom.', water: 'Roost and rest on water, encoded as within one 30 to 60 m grid cell (80%).' };
  const fieldNote = Object.assign({}, fn, { water: 'Field feeding within commuting distance of water (80%, Audubon), no distance number' });
  const base = {
    dawn: mk({ doing: 'moving', slope: FLAT, terrain: 'valley', cert: 80, f: { slope: 60, terrain: 65 }, factor_notes: fieldNote, tip: 'First birds leave about 15 minutes before sunrise in clear weather; cloud delays it about 15 minutes (80%).', source: src }),
    morning: mk({ doing: 'feeding', slope: FLAT, terrain: 'valley', cert: 80, f: { slope: 60, terrain: 65 }, factor_notes: fieldNote, tip: 'Morning feed in open fields for a few hours. Geese avoid feeding next to tall cover (60%).', source: src }),
    midday: mk({ doing: 'loafing', slope: FLAT, water: ON_WATER, terrain: 'valley', cert: 80, f: { slope: 60, water: 80, terrain: 65 }, factor_notes: fn, tip: 'Midday rest on lakes, big rivers, bars and points. Never shoot the roost.', source: src }),
    afternoon: mk({ doing: 'feeding', slope: FLAT, terrain: 'valley', cert: 80, f: { slope: 60, terrain: 65 }, factor_notes: fieldNote, tip: 'Late afternoon feed. Cloudy days keep geese longer in the fields (80%).', source: src }),
    dusk: mk({ doing: 'moving', slope: FLAT, water: ON_WATER, terrain: 'valley', cert: 80, f: { slope: 60, water: 80, terrain: 65 }, factor_notes: fn, tip: 'Return to the roost between sunset and civil twilight; a visible full moon makes it later (80%).', source: src }),
  };
  S.geese = {
    name: 'Geese', lesson: 'mc-geese-07',
    months: monthsFrom('geese', 'Area: Kamloops valley (Region 3: Thompson River, valley fields; nest mostly below 500 m, 85%) and the Fraser Valley (Region 2, near sea level).', {
      1: { activity: 'wintering' }, 2: { activity: 'wintering, spring move starts' }, 3: { activity: 'spring staging' }, 4: { activity: 'nesting starts' },
      5: { activity: 'nesting, goslings' }, 6: { activity: 'goslings, moult' }, 7: { activity: 'moult' }, 8: { activity: 'local birds on fields' },
      9: { activity: 'local families, first migrants' }, 10: { activity: 'migrants arrive' }, 11: { activity: 'freeze up, valley water' }, 12: { activity: 'wintering, late season' },
    }),
    blocks: base,
    month_overrides: overrides([
      { months: [12, 1, 2], base, blocks: { morning: { doing: 'loafing', water: ON_WATER, f: { water: 80 }, factor_notes: { water: 'Below about minus 9 deg C at sunrise there was usually no heavy morning flight (80%, Raveling 1972); geese stay on the roost.' }, tip: 'Bitter cold: no dawn flight. Plan an afternoon field hunt.' } }, note: 'Cold days: geese feed in the warm afternoon (80%).' },
    ]),
    tips: [
      { text: 'Watch the flight line two evenings in a row before you plan a hunt.', cert: 65, months: [9, 10, 11, 12] },
      { text: 'The fields that hold geese are almost all private cultivated land: written permission first.', cert: 99, months: [9, 10, 11, 12, 1, 2, 3] },
      { text: 'Light pressure near Heffley Creek: under 30 estimated goose hunters a year in MUs 3-27 and 3-28.', cert: 99, months: [9, 10, 11, 12] },
      { text: 'After a bright full moon, plan an afternoon hunt as well as a morning one.', cert: 50, months: [9, 10, 11, 12, 1] },
      { text: 'Tranquille is a No Shooting area; Vaseux Lake is a sanctuary.', cert: 99, months: [9, 10, 11, 12, 1, 2, 3] },
    ],
    sources: [
      'Raveling, Crews and Klimstra 1972, Wilson Bulletin 84, https://archive.org/download/biostor-200086/biostor-200086.pdf, checked 2026-10-11 (80%)',
      'Hinterland Who\'s Who, Canada goose, https://www.hww.ca/en/wildlife/birds/canada-goose.html, checked 2026-10-11 (80%)',
      'Audubon, Canada goose, https://www.audubon.org/field-guide/bird/canada-goose, checked 2026-10-11 (80%)',
      'BC Hunter Sample Survey Estimates, https://catalogue.data.gov.bc.ca/dataset/8425b848-517e-4a20-b26c-6121720382af, downloaded 2026-10-11 (99% as published)',
      'App data: data/migration.json (geese months, 55 to 75%), checked 2026-10-03',
      'Hunt Mentor lessons mc-geese-03, 05, 06, 07',
    ],
  };
}

const out = {
  version: 1,
  checked: '2026-10-11',
  factors_doc: [
    'Habitat scoring model, not a prediction. Each block lists what the research says the animal is doing and the terrain it favours. Animals may not be there.',
    'cert (0 to 100) uses the CLAUDE.md scale; under 60 is a Tip, not a fact. Block cert is the certainty of the timing and activity claim. factors gives the certainty of each terrain factor; 0 means no data, the factor is neutral (aspect all 1, slope 0 to 90, sun any, water and road null, terrain any) and is listed in gaps.',
    'Tip lines carry 50 by convention. "My reading" lines are discounted from their source.',
    'Aspect weights are an encoding of written statements, not measurements: named aspects 1, next to a named aspect 0.7, the rest 0.4.',
    'slope_deg is [lo_ok, best_lo, best_hi, hi_ok] in degrees. Sourced percent grades are converted (degrees = atan(percent/100)). Where a source gives only best values, the shoulder (hi_ok = best_hi + 10, lo_ok = best_lo - 5) is a model choice. "Flat ground" = app flat class under 8 deg, shoulder to 15 deg.',
    'water_m is [best_max, ok_max] metres to water. "On the water" is encoded as [0, 60], one grid cell.',
    'road_m 500: hunters cluster within 0.5 km of open roads (Penn State 2004, 60% applied to BC).',
    'Elevation bands are general BC patterns from data/migration.json unless a month note names a local source for the owner\'s area.',
    'month_overrides hold full replacement values for the fields that change, plus the factors, gaps and note for that block.',
  ].join(' '),
  species: S,
};
fs.mkdirSync(ROOT + '/data/analyze', { recursive: true });
fs.writeFileSync(ROOT + '/data/analyze/species-model.json', JSON.stringify(out, null, 1) + '\n');
console.log('written', Object.keys(S).length, 'species');
