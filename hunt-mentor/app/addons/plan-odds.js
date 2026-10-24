/* Odds engine for "Plan a hunt" (add on). window.HMPlanOdds = { compute(plan, sp, spotsList) -> Promise<result>, html(result) -> string }.
   plan.js calls it when present (it owns the plan screen; this file never touches it).
   Base: BC Big Game Harvest Statistics (data/harvest/bc-harvest.json), resident hunters, 2020 to 2024, per MU (Management Unit),
   falling back to the region total when the MU has under 3 reliable years (same rule as plan.js odds()).
   Maths, all shown to the owner in the method fold:
     per year: p = kills / hunter days (chance one average hunter day ends with a deer); season success = kills / hunters.
     range over the years: low = lowest year, mid = median year, high = highest year. Thin data (a year left out for fewer than
     20 hunters, a year with under 15 deer, or under 5 usable years) widens the range: low x 0.75, high x 1.25.
     over N planned days: 1 - (1 - p)^N (each day independent, an average hunter, the season average day).
   Spot estimates: the MU range times multipliers that each have a stated basis (rut dates from Masterclass 4, hunter pressure
   from the pressure lesson, the app's own habitat score), each a range, all together capped at x 0.5 to x 1.75. Labelled
   estimate (Tip) with certainty. Nothing here is official except the base table. Offline: the harvest file is precached by
   the service worker; spot detail tiles are used only when already saved, else the spot's index fields. */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tx = (s) => esc(s).replace(/(\d+(?:-\d+)+)/g, '<span style="white-space:nowrap">$1</span>'); // keep codes like 2-18 and dates on one line, with a plain hyphen
  const badge = (v) => (v == null ? '<span class="verify">VERIFY</span>' : `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}" title="Certainty ${v}%">${v}%</span>`);
  const cache = {};
  const getJSON = (u) => (cache[u] = cache[u] || fetch(u, { credentials: 'omit' }).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }).catch((e) => { delete cache[u]; throw e; }));

  const HARVEST = 'data/harvest/bc-harvest.json';
  const YEARS = [2020, 2024];
  const WIDEN = { low: 0.75, high: 1.25 };
  const CAP = { low: 0.5, high: 1.75 };
  const SMALL_KILLS = 15;
  const REF_SCORE = 8; // the most common deer spot score in the app's spot data (area B, 2026-10-16)
  const L = { rut: 'mc-black-tailed-deer-04', hunt: 'mc-black-tailed-deer-05', pressure: 'pressure-push', harrison: 'local-harrison-deer', shoot: 'shooting-skills', quiet: 'still-hunting' };
  const lessonLink = (id, label) => `<a href="#/s/${esc(id)}">${esc(label)}</a>`;

  // ---------- small maths ----------
  const median = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  const over = (p, n) => 1 - Math.pow(1 - Math.min(Math.max(p, 0), 1), n);
  const overDays = (ps) => 1 - ps.reduce((a, p) => a * (1 - Math.min(Math.max(p, 0), 1)), 1);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const rng = (lo, hi) => ({ low: lo, mid: (lo + hi) / 2, high: hi });
  const dRange = (a, b) => { const out = []; if (!a) return out; b = b || a; for (let x = a; x <= b && out.length < 62;) { out.push(x); const [y, m, d] = x.split('-').map(Number); x = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10); } return out; };
  const dLabel = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
  const partyN = (p, plan) => (p === 'two' ? (plan && plan.ask && plan.ask.partner && plan.ask.partner.tag === false ? 1 : 2) : p === 'group' ? 3 : 1); // same rule as plan.js tagsN: only hunters with a tag count
  const regionOf = (mu) => String(mu || '').split('-')[0];

  // ---------- rut timing (Masterclass 4, coast black tailed deer only) ----------
  // Most does conceive 15 Nov to 5 Dec (90%); rut "November and early December" (90%); bucks hide before it (lesson).
  // How much the daily rate rises is not measured anywhere we found: the multipliers are Tips, and the low end of the
  // rut windows stays at about the season average because the official average already contains the rut days.
  function rutFactor(iso) {
    const md = iso.slice(5);
    if (md >= '11-15' && md <= '12-05') return { lo: 1.0, hi: 1.5, why: 'peak rut window: most does conceive 15 November to 5 December (90%)' };
    if ((md >= '11-01' && md <= '11-14') || (md >= '12-06' && md <= '12-15')) return { lo: 0.9, hi: 1.3, why: 'rut month: coast deer breed in November and early December (90%)' };
    if (md >= '09-01' && md <= '10-31') return { lo: 0.7, hi: 1.0, why: 'before the rut: bucks that hid all fall have not started moving by day yet (lesson)' };
    return null;
  }
  const isCoastDeer = (sp, mu) => String((sp && sp.harvestKey) || '').toLowerCase() === 'mule deer' && regionOf(mu) === '2';

  // ---------- pressure (pressure lesson) ----------
  const PRESS = {
    busier: { lo: 0.7, hi: 1.0, t: 'Busier spot (near pavement, a town, a rec site or under 30 minutes from a city)' },
    average: { lo: 0.9, hi: 1.1, t: 'Average pressure (no town, pavement or rec site within 1 km)' },
    quieter: { lo: 1.0, hi: 1.3, t: 'Quieter spot (a long walk from parking)' },
    remote: { lo: 1.0, hi: 1.4, t: 'Remote spot (far from roads and parking)' },
  };

  // ---------- spot detail (only if already saved on this phone) ----------
  async function spotDetail(s) {
    if (!s || !s.id || s.lat == null || s.lon == null) return null;
    const area = String(s.id).split('-')[0];
    const tile = `${Math.floor(s.lon / 0.25)}_${Math.floor(s.lat / 0.25)}`;
    try { const t = await getJSON(`data/spots/${area}/detail/${tile}.json`); return (t && t[s.id]) || null; } catch (e) { return null; }
  }

  // ---------- compute ----------
  async function compute(plan, sp, spotsList) {
    plan = plan || {}; sp = sp || {};
    const mu = (plan.where && plan.where.mu) || plan.mu || '';
    const out = { mu, species: sp.harvestKey || null, speciesName: sp.name || '', years: [], spots: [], levers: [], label: 'estimate' };
    if (!sp.harvestKey) { out.none = true; out.levers = levers(sp, mu, null, plan); return out; }
    let H;
    try { H = await getJSON(HARVEST); } catch (e) { out.missing = true; out.levers = levers(sp, mu, null, plan); return out; }
    const key = String(sp.harvestKey).toLowerCase();
    const inYears = (r) => r.year >= YEARS[0] && r.year <= YEARS[1];
    const mine = (r) => String(r.species).toLowerCase() === key && inYears(r);
    const usable = (r) => !r.lowConfidence && r.hunters >= 20 && r.kills != null && r.days > 0;
    let all = (H.rows || []).filter((r) => r.mu === mu && mine(r)), scope = 'mu';
    if (all.filter((r) => r.resident && usable(r)).length < 3) {
      const reg = (H.regionTotals || []).filter((r) => r.region === regionOf(mu) && mine(r));
      if (reg.filter((r) => r.resident && usable(r)).length) { all = reg; scope = 'region'; }
    }
    const res = all.filter((r) => r.resident).sort((a, b) => a.year - b.year);
    const nonRes = all.filter((r) => !r.resident).sort((a, b) => a.year - b.year);
    out.scope = scope; out.region = regionOf(mu);
    out.source = { name: H.source, url: H.url, checked: H.checked, updated: H.datasetUpdated, cert: 90 };
    out.years = res.map((r) => ({ year: r.year, hunters: r.hunters, kills: r.kills, days: r.days, successPct: r.successPct, low: !usable(r), perDay: usable(r) ? r.kills / r.days : null }));
    const g = res.filter(usable);
    if (!g.length) { out.thin = true; out.levers = levers(sp, mu, null, plan); return out; }

    const p = g.map((r) => r.kills / r.days), s = g.map((r) => r.kills / r.hunters);
    const flags = [];
    if (res.some((r) => !usable(r))) flags.push('a year was left out (fewer than 20 hunters reported, or numbers not published)');
    if (g.some((r) => r.kills < SMALL_KILLS)) flags.push(`a year had fewer than ${SMALL_KILLS} deer, so the survey estimate swings a lot (${g.filter((r) => r.kills < SMALL_KILLS).map((r) => `${r.year}: ${r.kills}`).join(', ')})`);
    if (g.length < 5) flags.push(`only ${g.length} usable years`);
    if (scope === 'region') flags.push('MU numbers too thin, so these are the region totals');
    const widen = flags.length > 0;
    const R = (a) => { const lo = Math.min(...a), hi = Math.max(...a); return { low: widen ? lo * WIDEN.low : lo, mid: median(a), high: Math.min(1, widen ? hi * WIDEN.high : hi), rawLow: lo, rawHigh: hi }; };
    const perDay = R(p), season = R(s);
    const days = dRange(plan.from, plan.to);
    const N = Number.isFinite(plan.huntDays) ? plan.huntDays : days.length;
    const n = partyN(plan.party, plan);
    const sum = (k) => g.reduce((a, r) => a + r[k], 0);
    const base = {
      successSeason: { low: season.low, mid: season.mid, high: season.high },
      killsPerYear: sum('kills') / g.length,
      huntersPerYear: sum('hunters') / g.length,
      hunterDaysPerYear: sum('days') / g.length,
      daysPerHunter: sum('days') / sum('hunters'),
      daysPerDeer: { low: 1 / perDay.high, mid: 1 / perDay.mid, high: 1 / perDay.low },
      perDay: { low: perDay.low, mid: perDay.mid, high: perDay.high },
      planDays: N, dates: days,
      overPlanDays: { low: over(perDay.low, N), mid: over(perDay.mid, N), high: over(perDay.high, N) },
      party: n,
      partyOverPlanDays: n > 1 ? { low: over(perDay.low, N * n), mid: over(perDay.mid, N * n), high: over(perDay.high, N * n) } : null,
      confidence: scope === 'region' || g.length < 3 ? 'low' : widen ? 'low to medium' : 'medium',
      flags, widened: widen, years: g.length,
    };
    const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
    const yrs = g.map((r) => `${r.year}: ${r.kills} / ${r.days} = ${pct(r.kills / r.days, 2)}`).join('; ');
    base.method = [
      `Source: ${H.source} (open data, updated ${H.datasetUpdated || 'n/a'}, checked ${H.checked || 'n/a'}). Resident hunters, ${YEARS[0]} to ${YEARS[1]}, ${scope === 'mu' ? `MU ${mu}` : `Region ${regionOf(mu)} total`}.`,
      'The numbers are Hunter Sample survey estimates: general season and LEH (Limited Entry Hunting) together, bucks and does together.',
      `Chance per hunter day = deer taken / hunter days, each year. ${yrs}.`,
      `Range: low = the worst year, likely = the middle year, high = the best year${widen ? `; widened (low x ${WIDEN.low}, high x ${WIDEN.high}) because ${flags.join('; ')}` : ''}.`,
      `Season success = deer taken / hunters, same range rule: ${g.map((r) => `${r.year}: ${pct(r.kills / r.hunters, 1)}`).join('; ')}.`,
      `Days per deer = 1 / chance per day (${Math.round(base.daysPerDeer.low)} to ${Math.round(base.daysPerDeer.high)}, likely ${Math.round(base.daysPerDeer.mid)}).`,
      `Your ${N} day${N === 1 ? '' : 's'}: chance = 1 minus (1 minus chance per day) to the power ${N}. Likely: 1 minus (1 minus ${perDay.mid.toFixed(4)})^${N} = ${pct(base.overPlanDays.mid, 1)}.`,
      'Assumes an average hunter on an average season day, every day the same and independent. Your skill, your spot and your dates move it (see the estimates).',
      n > 1 ? `Party of ${n}: 1 minus (1 minus p)^(${N} x ${n}), as if each hunter hunts apart at the average rate. Hunting side by side counts for less (Tip).` : null,
      nonRes.length ? `Non resident rows exist (${nonRes.map((r) => `${r.year}: ${r.hunters} hunter${r.hunters === 1 ? '' : 's'}, ${r.kills == null ? 'kills not published' : r.kills + ' deer'}, ${r.days} days`).join('; ')}). They come from guide outfitter reports, a different count, and are under 20 hunters, so they are shown but not added.` : 'No non resident rows for this MU and species, so residents only.',
      'Hunt year runs 1 April to 31 March. The MU rate covers the whole MU, every spot and every week of the season.',
    ].filter(Boolean);
    out.base = base;
    out.nonResident = nonRes.map((r) => ({ year: r.year, hunters: r.hunters, kills: r.kills, days: r.days }));

    // trend: first two usable years against the last two (per hunter day)
    if (g.length >= 4) {
      const a = (p[0] + p[1]) / 2, b = (p[p.length - 1] + p[p.length - 2]) / 2, ratio = b / a;
      const dir = ratio >= 1.25 ? 'up' : ratio <= 0.8 ? 'down' : 'flat';
      out.trend = { dir, first: a, last: b, ratio, text: `${dir === 'up' ? 'Up' : dir === 'down' ? 'Down' : 'About flat'}: ${pct(a, 1)} a hunter day in ${g[0].year} and ${g[1].year}, ${pct(b, 1)} in ${g[g.length - 2].year} and ${g[g.length - 1].year}. Five survey years is too short to call a real trend.` };
    } else out.trend = { dir: 'unknown', text: 'Too few years to show a trend.' };

    out.levers = levers(sp, mu, base, plan);
    out.spots = await spotEstimates(plan, sp, mu, base, spotsList || [], days);
    out.tagAssumed = plan.party === 'two' && !(plan.ask && plan.ask.partner && typeof plan.ask.partner.tag === 'boolean');
    out.seen = { verify: true, text: 'Deer you might see a day: VERIFY. No deer density count for these MUs was found in the lessons, so the app gives no number.' };
    return out;
  }

  // ---------- spot estimates ----------
  async function spotEstimates(plan, sp, mu, base, list, days) {
    const coast = isCoastDeer(sp, mu);
    const rut = coast ? days.map((d) => ({ d, f: rutFactor(d) })) : [];
    const out = [];
    for (const s of list.slice(0, 7)) {
      const det = await spotDetail(s);
      const adj = [];
      // rut timing (per day)
      let rutLo = days.map(() => 1), rutHi = days.map(() => 1);
      if (coast && rut.some((x) => x.f)) {
        rutLo = rut.map((x) => (x.f ? x.f.lo : 1)); rutHi = rut.map((x) => (x.f ? x.f.hi : 1));
        const uniq = [...new Map(rut.filter((x) => x.f).map((x) => [x.f.why, x])).values()];
        adj.push({ key: 'rut', why: `Your dates: ${rut.filter((x) => x.f).map((x) => `${dLabel(x.d)} x ${x.f.lo} to x ${x.f.hi}`).join('; ')}. ${uniq.map((x) => x.f.why).join('; ')}. Bucks move more by day in the rut (Tip). How much more is not measured.`, factor: rng(Math.min(...rutLo), Math.max(...rutHi)), source: 'Black tailed deer Masterclass 4: The rut (Nyberg and Janz 1990)', lesson: L.rut, cert: 50 });
      } else if (!coast) adj.push({ key: 'rut', why: 'No sourced rut dates for this animal and area in the app, so no date change.', factor: rng(1, 1), source: 'none', cert: null });
      // hunter pressure
      const pr = (det && det.pressure) || s.busy;
      const P = PRESS[pr];
      if (P) {
        const walk = det && det.walkKm != null ? ` Walk from parking about ${det.walkKm < 0.1 ? 'under 0.1' : det.walkKm.toFixed(1)} km${det.climbM ? `, ${Math.round(det.climbM)} m climb` : ''}.` : '';
        adj.push({ key: 'pressure', why: `${P.t}${det && det.pressureWhy ? `: ${det.pressureWhy}` : ''}.${walk} 73% of hunters stayed within 0.5 km of a road (90%, Pennsylvania study; BC is an assumption). Hunted bucks pick cover away from roads (85%). But coast forest has so much cover that hunting barely changes deer numbers (90%), so the change is kept small.`, factor: rng(P.lo, P.hi), source: 'Hunting pressure lesson; Black tailed deer Masterclass 5', lesson: L.pressure, cert: 50 });
      } else adj.push({ key: 'pressure', why: 'No pressure estimate for this spot, so no change.', factor: rng(1, 1), source: 'none', cert: null });
      // habitat score (the app's own pick)
      const sc = det && det.score != null ? det.score : s.score;
      if (sc != null && Number.isFinite(+sc)) {
        const f = clamp(1 + 0.04 * (+sc - REF_SCORE), 0.85, 1.2);
        adj.push({ key: 'habitat', why: `Habitat score ${sc}${det && det.scoreMax ? ` of ${det.scoreMax}` : ''} (my pick, from open data: winter range, cutblock age, burns, slope). A typical deer spot here scores ${REF_SCORE}. The score has never been tested against kills, so it moves the estimate only a little.`, factor: rng(Math.min(1, f), Math.max(1, f)), source: 'Hunt Mentor spot data (my pick), 60% for the spot list', cert: 40 });
      }
      // owner answers: shown, not counted (no sourced number)
      if (plan.firstHunt || plan.experience) adj.push({ key: 'you', why: 'Your experience: the base is the average of all hunters, new and old. No source gives a number for a first season, so it is not counted. Expect to be at or below the average at first (Tip).', factor: rng(1, 1), source: 'none (Tip)', cert: null });

      const sLo = adj.filter((a) => a.key !== 'rut').reduce((a, x) => a * x.factor.low, 1);
      const sHi = adj.filter((a) => a.key !== 'rut').reduce((a, x) => a * x.factor.high, 1);
      const sMid = adj.filter((a) => a.key !== 'rut').reduce((a, x) => a * x.factor.mid, 1);
      const capped = [];
      const dayF = days.map((_, i) => {
        const lo = sLo * rutLo[i], hi = sHi * rutHi[i], mid = sMid * (rutLo[i] + rutHi[i]) / 2;
        if (lo < CAP.low || hi > CAP.high) capped.push(i);
        return { lo: clamp(lo, CAP.low, CAP.high), mid: clamp(mid, CAP.low, CAP.high), hi: clamp(hi, CAP.low, CAP.high) };
      });
      const est = days.length ? {
        low: overDays(dayF.map((f) => base.perDay.low * f.lo)),
        mid: overDays(dayF.map((f) => base.perDay.mid * f.mid)),
        high: overDays(dayF.map((f) => base.perDay.high * f.hi)),
      } : { low: 0, mid: 0, high: 0 };
      const all = dayF.length ? { low: Math.min(...dayF.map((f) => f.lo)), mid: dayF.reduce((a, f) => a + f.mid, 0) / dayF.length, high: Math.max(...dayF.map((f) => f.hi)) } : rng(1, 1);
      out.push({ id: s.id, name: s.name, cat: s.cat, mu: s.mu, km: s.km, lat: s.lat, lon: s.lon, estimate: est, factor: all, capped: capped.length > 0, adjustments: adj, label: 'estimate', detail: !!det });
    }
    return out;
  }

  // ---------- levers: what changes the odds (from lessons; Tips labelled) ----------
  function levers(sp, mu, base, plan) {
    const out = [];
    if (base) {
      const N = base.planDays || 0, add = (k) => over(base.perDay.mid, N + k) - over(base.perDay.mid, N);
      out.push({ name: 'More days', effect: `At the likely rate, day ${N + 1} adds about ${(add(1) * 100).toFixed(1)} points, each day after a bit less: ${N + 1} days ${(over(base.perDay.mid, N + 1) * 100).toFixed(0)}%, ${N + 3} days ${(over(base.perDay.mid, N + 3) * 100).toFixed(0)}%, ${N + 8} days ${(over(base.perDay.mid, N + 8) * 100).toFixed(0)}% (plus ${(add(8) * 100).toFixed(0)} points). Average hunter maths.`, source: 'BC harvest statistics and the method below', cert: 80 });
    }
    const coast = isCoastDeer(sp, mu);
    if (coast) {
      out.push({ name: 'Hunt the rut dates', effect: 'Most does conceive 15 November to 5 December (90%). Bucks move by day then (Tip). Stay out through midday in rut weeks (Tip).', source: 'Nyberg and Janz 1990, page 36 (Vancouver Island data), via Black tailed deer Masterclass 4: The rut', lesson: L.rut, cert: 90 });
      out.push({ name: 'Watch cutblock edges', effect: 'Collared coast deer used clearcuts most within 100 m of cover (90%). Sit where you see that edge band at dawn and dusk (Tip).', source: 'Black tailed deer Masterclass 5 (Nyberg and Janz 1990)', lesson: L.hunt, cert: 90 });
      out.push({ name: 'Watch the doe, then behind her', effect: 'In the rut a buck follows a doe 2 to 3 days before her heat (90%). Stop and glass behind every doe for 5 minutes (Tip). Bucks only in these MUs (99%, page 28).', source: 'Black tailed deer Masterclass 4', lesson: L.rut, cert: 90 });
    }
    out.push({ name: 'Get past the road crowd', effect: '73% of hunters stayed within 0.5 km of a road; the average farthest point was 0.84 km (90%, Pennsylvania). Walk past that, quietly (Tip). Applied to BC: an assumption.', source: 'Hunting pressure lesson', lesson: L.pressure, cert: 90 });
    out.push({ name: 'Hunt midweek if you can', effect: 'Less pressure Tuesday to Thursday (Tip). No number found for how much.', source: 'Hunting pressure lesson', lesson: L.pressure, cert: 40 });
    out.push({ name: 'Be still before legal light', effect: 'Big game is legal from 1 hour before sunrise (99%, page 11). Be on your seat 30 to 45 minutes before that so you are still when deer move (Tip).', source: 'Hunting pressure lesson; synopsis page 11', lesson: L.pressure, cert: 70 });
    if (!plan || plan.party === 'two' || plan.party === 'group') out.push({ name: 'Work as a pair', effect: 'One sits an edge, one still hunts slowly toward them, wind at the walker\'s back. On foot only: pushing deer with a vehicle is unlawful (99%, page 11, item 25). Agree zones of fire (Tip).', source: 'Black tailed deer Masterclass 5', lesson: L.hunt, cert: 60 });
    out.push({ name: 'A practised shot', effect: 'Know your max range: the distance you hit a 15 cm (6 in) plate 9 of 10 from a field rest (Tip). Timber shots are short and fast: practise off sticks and kneeling (Tip).', source: 'Plan tips; Black tailed deer Masterclass 5', lesson: L.shoot, cert: 70 });
    out.push({ name: 'Scout first', effect: 'Early November: find does on cutblock edges at dusk and note where. Hunt those edges on your weekend (Tip).', source: 'Black tailed deer Masterclass 4', lesson: L.rut, cert: 50 });
    return out;
  }

  // ---------- html ----------
  const P0 = (x) => `${Math.round(x * 100)}%`;
  const P1 = (x) => { const v = x * 100; return `${v < 10 ? v.toFixed(1) : Math.round(v)}%`; };
  const R0 = (r) => `${P0(r.low)} to ${P0(r.high)}`;
  const R1 = (r) => `${P1(r.low)} to ${P1(r.high)}`;
  const fx = (f) => (Math.abs(f.low - f.high) < 1e-9 ? `x ${f.low.toFixed(2)}` : `x ${f.low.toFixed(2)} to x ${f.high.toFixed(2)}`);

  const CSS = `<style id="po-css">
.po .po-sub{font-size:14px;color:var(--muted);margin:2px 0 8px}
.po .po-how>summary{min-height:44px;font-weight:700;cursor:pointer}.po .po-h4{margin:14px 0 4px;font-size:16px}.po .po-h5{margin:10px 0 2px;font-size:15px}
.po .po-bar{margin:12px 0}
.po .po-bar-h{display:flex;justify-content:space-between;gap:8px;font-size:16px}
.po .po-bar-h b{font-family:var(--mono);font-weight:600;white-space:nowrap}
.po svg{display:block;width:100%;height:auto;overflow:visible}
.po svg text{font-size:16px;fill:var(--ink);font-family:var(--font)}
.po svg .po-mut{fill:var(--muted)}
.po .po-track{fill:var(--line)}
.po .po-band{fill:var(--sage);opacity:.55}
.po .po-mid{fill:var(--accent)}
.po .po-you{fill:var(--blaze)}
.po .po-dot{fill:var(--line)}
.po .po-dot.on{fill:var(--blaze)}
.po .po-dot.maybe{fill:var(--sage)}
.po .po-col{fill:var(--sage)}
.po .po-col.lo{fill:none;stroke:var(--muted);stroke-dasharray:4 3}
.po .po-axis{stroke:var(--line);stroke-width:1}
.po .po-line{fill:none;stroke:var(--blaze);stroke-width:2.5}
.po .po-pt{fill:var(--blaze)}
.po .po-lev li{margin:8px 0}
.po a{display:inline-flex;align-items:center;min-height:44px}
.po .po-spt td,.po .po-spt th{font-size:14px;vertical-align:top;padding:6px 4px}
.po .po-spt td b{font-family:var(--mono);font-weight:600;white-space:nowrap}
.po details>summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:600}
.po .po-meth li{font-size:14px;margin:6px 0}
.po .po-tag{display:inline-block;font-size:14px;border:1.5px dotted var(--muted);color:var(--muted);border-radius:8px;padding:0 6px;margin-left:4px}
</style>`;

  // one range bar: track 0..scale, band low..high, tick at mid
  function bar(id, title, r, scale, you, valueText, note) {
    const W = 320, X = (v) => clamp(v / scale, 0, 1) * W;
    const lo = X(r.low), hi = X(r.high), mid = X(r.mid);
    const step = scale <= 0.5 ? 0.1 : 0.25, tv = []; for (let v = 0; v <= scale + 1e-9; v += step) tv.push(v);
    const ticks = tv.map((v, i) => `<text class="po-mut" x="${X(v)}" y="46" text-anchor="${i === 0 ? 'start' : i === tv.length - 1 ? 'end' : 'middle'}">${Math.round(v * 100)}%</text>`).join('');
    return `<div class="po-bar"><div class="po-bar-h"><span>${title}</span><b>${valueText}</b></div>
      <svg viewBox="0 0 ${W} 52" role="img" aria-labelledby="${id}t"><title id="${id}t">${esc(title)}: likely ${P1(r.mid)}, range ${R1(r)}</title>
      <rect class="po-track" x="0" y="8" width="${W}" height="18" rx="9"/>
      <rect class="po-band" x="${lo}" y="8" width="${Math.max(4, hi - lo)}" height="18" rx="9"/>
      <rect class="${you ? 'po-you' : 'po-mid'}" x="${Math.max(0, mid - 2)}" y="3" width="4" height="28" rx="2"/>${ticks}</svg>
      ${note ? `<p class="po-sub">${note}</p>` : ''}</div>`;
  }

  // 100 hunters: how many get a deer on your days (likely, plus the extra up to the high end)
  function dots(r, N) {
    const on = Math.round(r.mid * 100), max = Math.round(r.high * 100), lo = Math.round(r.low * 100);
    let s = '';
    for (let i = 0; i < 100; i++) { const x = (i % 20) * 16 + 8, y = Math.floor(i / 20) * 16 + 8; s += `<circle class="po-dot${i < on ? ' on' : i < max ? ' maybe' : ''}" cx="${x}" cy="${y}" r="6"/>`; }
    return `<svg viewBox="0 0 320 82" role="img" aria-labelledby="po-dots-t"><title id="po-dots-t">Out of 100 average hunters with your ${N} day${N === 1 ? '' : 's'}: about ${on} get a deer (likely), ${lo} to ${max} across the years.</title>${s}</svg>
      <p class="po-sub">Out of 100 average hunters with your ${N} day${N === 1 ? '' : 's'}: about <b>${on}</b> get a deer (orange). Good years: up to ${max} (green). Bad years: ${lo}.</p>`;
  }

  // 5 year chart: season success columns (dashed = left out), per hunter day line
  function yearChart(res) {
    const ys = res.years, W = 320, H = 170, top = 18, bot = 138, n = ys.length || 1, cw = W / n;
    const sMax = Math.max(0.3, ...ys.filter((y) => !y.low && y.successPct != null).map((y) => y.successPct / 100));
    const pMax = Math.max(0.08, ...ys.filter((y) => y.perDay != null).map((y) => y.perDay));
    const Y = (v, m) => bot - (v / m) * (bot - top);
    let cols = '', pts = [], labs = '';
    ys.forEach((y, i) => {
      const cx = i * cw + cw / 2, w = Math.min(36, cw * 0.55);
      if (y.successPct != null && !y.low) {
        const v = y.successPct / 100;
        cols += `<rect class="po-col" x="${cx - w / 2}" y="${Y(v, sMax)}" width="${w}" height="${bot - Y(v, sMax)}" rx="3"/><text x="${cx}" y="${Y(v, sMax) - 4}" text-anchor="middle">${Math.round(y.successPct)}%</text>`;
      } else cols += `<rect class="po-col lo" x="${cx - w / 2}" y="${bot - 30}" width="${w}" height="30"/><text class="po-mut" x="${cx}" y="${bot - 34}" text-anchor="middle">few</text>`;
      if (y.perDay != null) pts.push([cx, Y(y.perDay, pMax), y.perDay]);
      labs += `<text class="po-mut" x="${cx}" y="${bot + 18}" text-anchor="middle">${y.year}</text>`;
    });
    const line = pts.length > 1 ? `<polyline class="po-line" points="${pts.map((p) => `${p[0]},${p[1]}`).join(' ')}"/>` : '';
    const dotsP = pts.map((p) => `<circle class="po-pt" cx="${p[0]}" cy="${p[1]}" r="4"/>`).join('');
    const desc = ys.map((y) => `${y.year}: ${y.hunters != null ? y.hunters : 'n/a'} hunters, ${y.kills != null ? y.kills : 'n/a'} deer, ${y.days != null ? y.days : 'n/a'} days${y.perDay != null ? `, ${P1(y.perDay)} a hunter day` : ', left out'}`).join('. ');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="po-yr-t po-yr-d"><title id="po-yr-t">Season success and chance per hunter day, ${ys.length ? ys[0].year : ''} to ${ys.length ? ys[ys.length - 1].year : ''}</title><desc id="po-yr-d">${esc(desc)}</desc>
      <line class="po-axis" x1="0" y1="${bot}" x2="${W}" y2="${bot}"/>${cols}${line}${dotsP}${labs}</svg>
      <p class="po-sub">Green columns: share of hunters who got a deer that season. Orange line: chance per hunter day (its own scale, ${P1(Math.min(...pts.map((p) => p[2])) || 0)} to ${P1(Math.max(...pts.map((p) => p[2])) || 0)}). Dashed: too few hunters, left out.</p>`;
  }

  function html(res) {
    if (!res) return '';
    const head = `${CSS}<div class="po">`;
    const lev = levHtml(res.levers || []);
    if (res.none) return `${head}<div class="card"><h3>Odds</h3><p>BC publishes success numbers for big game only. There is no official number for ${esc((res.speciesName || 'this animal').toLowerCase())}, so the app gives none.</p></div>${lev}</div>`;
    if (res.missing) return `${head}<div class="card"><h3>Odds</h3><p class="muted">Harvest numbers are not saved on this phone yet. Open the app once with signal.</p><p class="muted pl-small">Official link: <a href="https://catalogue.data.gov.bc.ca/dataset/big-game-harvest-statistics-1976-to-2024" target="_blank" rel="noopener">BC Big Game Harvest Statistics</a></p></div>${lev}</div>`;
    if (res.thin) return `${head}<div class="card"><h3>Odds</h3><p>Too few hunters reported here (under 20 a year) for an honest number. The app gives none.</p></div>${lev}</div>`;
    const b = res.base, N = b.planDays, where = res.scope === 'mu' ? `MU (Management Unit) ${tx(res.mu)}` : `Region ${esc(res.region)} (MU ${tx(res.mu)} has too few reports)`;
    const scale = Math.max(0.5, Math.ceil(Math.max(b.successSeason.high, b.overPlanDays.high, ...(res.spots || []).map((s) => s.estimate.high)) * 4) / 4);
    const dates = b.dates && b.dates.length ? `${dLabel(b.dates[0])}${b.dates.length > 1 ? ` to ${dLabel(b.dates[b.dates.length - 1])}` : ''}` : '';
    const picture = `<div class="card"><h3>Your odds: ${where}</h3>
      <p class="po-sub">Official base, an average hunter. Range = worst year to best year, line = the middle year (median of the 5 reports). The other odds cards on this plan use the same base. Scale 0 to ${Math.round(scale * 100)}%.</p>
      ${bar('po-b1', 'Whole season, one hunter', b.successSeason, scale, false, `${P0(b.successSeason.mid)} (${R0(b.successSeason)})`, `Average hunter spent ${b.daysPerHunter.toFixed(1)} days.`)}
      ${bar('po-b2', 'One hunter day', b.perDay, scale, false, `${P1(b.perDay.mid)} (${R1(b.perDay)})`, `About 1 deer per ${Math.round(b.daysPerDeer.mid)} hunter days (${Math.round(b.daysPerDeer.low)} to ${Math.round(b.daysPerDeer.high)}).`)}
      ${N ? bar('po-b3', `Your ${N} day${N === 1 ? '' : 's'}${dates ? `, ${esc(dates)}` : ''}`, b.overPlanDays, scale, true, `${P0(b.overPlanDays.mid)} (${R0(b.overPlanDays)})`, b.partyOverPlanDays ? `Someone in your party of ${b.party}: about ${P0(b.partyOverPlanDays.mid)} (${R0(b.partyOverPlanDays)}), if you hunt apart, at the median year rate (Tip).${res.tagAssumed ? ' Assumption: your partner carries a tag; change it in Your answers.' : ''}` : '') : '<p>No dates in this plan yet.</p>'}
      ${N ? dots(b.overPlanDays, N) : ''}
      <p class="po-sub">Assumes an average hunter. Source: BC harvest statistics ${badge(res.source.cert)}. Data confidence: <b>${esc(b.confidence)}</b>${b.widened ? ' (range widened, see method)' : ''}.</p></div>`;
    const yrs = `<div class="card"><h3>5 years of reports</h3>${yearChart(res)}<p class="po-sub">Trend: ${esc(res.trend.text)}</p>
      <p class="po-sub">Deer taken a year: about ${Math.round(b.killsPerYear)}. Hunters a year: about ${Math.round(b.huntersPerYear)}. Hunter days a year: about ${Math.round(b.hunterDaysPerYear)}.</p></div>`;
    const spots = spotsHtml(res);
    const meth = `<h4 class="po-h4">Method and sources</h4><ul class="po-meth">${b.method.map((t) => `<li>${tx(t)}</li>`).join('')}
      <li>Spot estimates: the range above times the multipliers shown on each spot, each day on its own, all together capped at x ${CAP.low} to x ${CAP.high}. Estimate (Tip), not official.</li>
      <li>${esc(res.seen.text)} <span class="verify">VERIFY</span></li></ul>
      <div class="tbl"><table><thead><tr><th>Year</th><th>Hunters</th><th>Deer</th><th>Days</th><th>A day</th></tr></thead><tbody>${res.years.map((y) => `<tr><td>${y.year}</td><td>${y.hunters != null ? y.hunters : 'n/a'}</td><td>${y.kills != null ? y.kills : 'n/a'}</td><td>${y.days != null ? y.days : 'n/a'}</td><td>${y.perDay != null ? P1(y.perDay) : 'left out'}</td></tr>`).join('')}</tbody></table></div>
      <p class="po-sub">Source: <a href="${esc(res.source.url)}" target="_blank" rel="noopener">${esc(res.source.name)}</a>, checked ${esc(res.source.checked || '')} ${badge(res.source.cert)}. Rut: ${lessonLink(L.rut, 'Masterclass 4: The rut')}. Pressure: ${lessonLink(L.pressure, 'Hunting pressure')}.</p>`;
    // headline numbers stay on the card; the years, the per spot multipliers and the method fold under one heading
    const how = `<details class="card po-how"><summary>How these odds are worked out</summary>${yrs.replace(/^<div class="card">/, '<div class="po-in">')}${spotsWhy(res)}${meth}</details>`;
    return `${head}${picture}${lev}${spots}${how}</div>`;
  }

  function levHtml(lv) {
    if (!lv.length) return '';
    return `<div class="card"><h3>What raises your odds</h3><p class="po-sub">From the lessons. Tips are opinion; numbers carry their certainty.</p><ul class="po-lev">${lv.map((l) => `<li><b>${esc(l.name)}</b><br>${tx(l.effect)}<br><span class="po-sub">${esc(l.source)} ${badge(l.cert)}${l.lesson ? ` ${lessonLink(l.lesson, 'Open lesson')}` : ''}</span></li>`).join('')}</ul></div>`;
  }

  function spotsHtml(res) {
    const sp = res.spots || [];
    if (!sp.length) return `<div class="card"><h3>Spot estimates</h3><p class="muted">No candidate spots for this plan yet, so no spot estimate.</p></div>`;
    const N = res.base.planDays;
    const rows = sp.map((s, i) => `<tr><td>${i + 1}. ${esc(s.name)}<br><span class="po-sub">${fx(s.factor)}${s.capped ? ' (capped)' : ''}</span></td><td><b>${P0(s.estimate.mid)}</b><br><span class="po-sub">${R0(s.estimate)}</span></td></tr>`).join('');
    return `<div class="card po-spt"><h3>Spot estimates <span class="po-tag">estimate, Tip</span></h3>
      <p class="po-sub">The official MU range for your ${N} day${N === 1 ? '' : 's'}, moved by each spot's multipliers. Not official, not precise. Scout first.</p>
      ${sp.length > 1 && new Set(sp.map((s) => P0(s.estimate.mid))).size === 1 ? '<p class="po-sub"><b>These estimates do not separate the spots.</b> They come out the same, so pick on scouting, wind, walk and access, not on this number.</p>' : ''}
      <div class="tbl"><table><thead><tr><th>Spot and multiplier</th><th>Your ${N} day${N === 1 ? '' : 's'}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="po-sub">Why each spot gets its number: How these odds are worked out, below.</p></div>`;
  }
  // per spot "why": the multipliers every spot shares are listed once, then only what differs per spot
  function spotsWhy(res) {
    const sp = res.spots || [];
    if (!sp.length) return '';
    const adj = (a) => `<li><b>${fx(a.factor)}</b> ${tx(a.why)} <span class="po-sub">${esc(a.source)}</span> ${a.cert != null ? badge(a.cert) : '<span class="po-tag">not counted</span>'}${a.lesson ? ` ${lessonLink(a.lesson, 'Lesson')}` : ''}</li>`;
    const sig = (a) => `${a.factor}|${a.why}|${a.source}|${a.cert}`;
    const shared = sp.length > 1 ? (sp[0].adjustments || []).filter((a) => sp.every((s) => (s.adjustments || []).some((b) => sig(b) === sig(a)))) : [];
    const sk = new Set(shared.map(sig));
    const one = sp.map((s, i) => { const own = (s.adjustments || []).filter((a) => !sk.has(sig(a)));
      return `<h5 class="po-h5">${i + 1}. ${esc(s.name)}: why ${P0(s.estimate.mid)}</h5>${own.length ? `<ul>${own.map(adj).join('')}</ul>` : '<p class="po-sub">Only the shared multipliers above.</p>'}${s.detail ? '' : '<p class="po-sub">Spot detail not saved on this phone, so the map index was used.</p>'}`; }).join('');
    return `<h4 class="po-h4">Why each spot gets its number</h4>${shared.length ? `<p class="po-sub"><b>Same for all ${sp.length} spots:</b></p><ul>${shared.map(adj).join('')}</ul>` : ''}${one}`;
  }

  window.HMPlanOdds = { compute, html, _rutFactor: rutFactor, _over: over };
})();
