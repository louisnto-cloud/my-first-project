/* Hunt Mentor "Plan a hunt". Classic script, loaded before app.js; app.js routes #/plan and #/lists/animal to it.
   Wizard (one question a screen) -> saved plan (S.plans, in the app's own saved state, so Export backup carries it).
   A plan has 4 sections: (1) legal and open from data/seasons, (2) odds from data/harvest (official, big game only),
   (3) day by day from data/plans species dayPlan and phases, sun times and data/spots candidates, (4) checklist
   (species checklist + data/plans/checklists.json lists that match the plan). Data: every data/plans/species*.json.
   Offline: plan data and season and harvest tables are precached; spots and MU (Management Unit) shapes are cached
   after the first look, and a plan keeps its own copy of its top spots and its point. */
(function () {
  'use strict';
  const TZ = 'America/Vancouver';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DRAFT_KEY = 'hm.plan.draft';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  const json = (u) => fetch(u, { credentials: 'omit' }).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
  const cache = {};
  const getJSON = (u) => (cache[u] = cache[u] || json(u).catch((e) => { delete cache[u]; throw e; }));
  const hashKey = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return 'i' + (h >>> 0).toString(36); };

  // ---------- dates (ISO YYYY-MM-DD, worked in UTC so a day is a day) ----------
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const dAdd = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const dow = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();
  const dRange = (a, b) => { const out = []; for (let x = a; x <= b && out.length < 62; x = dAdd(x, 1)) out.push(x); return out; };
  const dLabel = (iso, long) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: long ? 'long' : 'short', month: long ? 'long' : 'short', day: 'numeric' });
  const dYear = (iso) => iso.slice(0, 4);
  const rangeLabel = (a, b) => (a === b ? `${dLabel(a)} ${dYear(a)}` : `${dLabel(a)} to ${dLabel(b)} ${dYear(b)}`);
  const md = (mmdd) => { const [m, d] = String(mmdd).split('-').map(Number); return `${MON[m - 1]} ${d}`; };
  const monthsOf = (days) => [...new Set(days.map((d) => +d.slice(5, 7)))];

  // ---------- data ----------
  const DEFAULT_FILES = ['data/plans/species.json', 'data/plans/species-birds.json', 'data/plans/checklists.json'];
  let dataP = null;
  function loadData() {
    if (dataP) return dataP;
    const HM = window.HM || {};
    if (HM.plansInline) { const d = HM.plansInline; return (dataP = Promise.resolve(prep(d.species || [], d.lists || []))); }
    const files = HM.planFiles && HM.planFiles.length ? HM.planFiles : DEFAULT_FILES;
    dataP = Promise.all(files.map((f) => json(f).catch(() => null))).then((all) => {
      const species = [], lists = [];
      all.forEach((o) => { if (!o) return; if (Array.isArray(o.species)) species.push(...o.species); if (Array.isArray(o.lists)) lists.push(...o.lists); });
      if (!species.length) { dataP = null; } // try again next time (first load with no signal)
      return prep(species, lists);
    });
    return dataP;
  }
  const GROUPS = [['big game', 'Big game'], ['predator', 'Predators'], ['upland bird', 'Upland birds'], ['waterfowl', 'Ducks and geese'], ['small game', 'Small game']];
  function prep(species, lists) {
    const seen = new Set();
    species = species.filter((s) => s && s.id && s.name && !seen.has(s.id) && seen.add(s.id));
    const gi = (g) => { const i = GROUPS.findIndex(([k]) => k === g); return i < 0 ? GROUPS.length : i; };
    species.sort((a, b) => gi(a.group) - gi(b.group) || a.name.localeCompare(b.name));
    return { species, lists: lists.filter((l) => l && Array.isArray(l.items)), byId: Object.fromEntries(species.map((s) => [s.id, s])) };
  }

  // ---------- places ----------
  // Preset MUs (Management Units) found by point in polygon at the base points (same as home.js, checked 2026-10-04).
  const KNOWN_MU = { heffley: '3-27', mission: '2-8' };
  const EXTRA_PLACES = [{ id: 'oliver', name: 'South Okanagan (Oliver)', lat: 49.183, lon: -119.55, mu: '8-1' }]; // Assumption: approximate town centre (home.js)
  const places = () => [...(window.HM.bases || []).map((b) => ({ id: b.id, name: b.name, lat: b.lat, lon: b.lon, mu: KNOWN_MU[b.id] || '' })), ...EXTRA_PLACES];
  const normMu = (s) => { const m = String(s || '').match(/^\s*(\d{1,2})\s*[-‐-―\s]\s*0*(\d{1,2})\s*$/); return m && +m[1] >= 1 && +m[1] <= 8 ? `${+m[1]}-${+m[2]}` : ''; };
  const regionOf = (mu) => (String(mu).match(/^(\d{1,2})-/) || [])[1] || '';
  const regionFiles = (mu) => { const n = regionOf(mu); return !n ? [] : n === '7' ? ['region7a', 'region7b'] : ['region' + n]; };

  async function muLayer() {
    const man = await getJSON('data/layers/manifest.json');
    return { man, l: (man.layers || []).find((x) => x.id === 'mu') };
  }
  // centre of an MU: area weighted centroid of its biggest ring (approximate; good for sun times and nearby spots)
  async function muCentre(mu) {
    const { man, l } = await muLayer();
    if (!l || !Array.isArray(l.files)) throw new Error('no MU files');
    const v = l.dataDate || man.updated || '';
    const n = regionOf(mu);
    const files = l.files.filter((f) => (n === '7' ? /Region 7/.test(f.area) : f.area === 'Region ' + n));
    for (const f of files) {
      const fc = await getJSON(f.file + (v ? `?v=${encodeURIComponent(v)}` : ''));
      for (const ft of fc.features || []) {
        const m = String(ft.properties.MU || '').match(/(\d{1,2})\s*-\s*0*(\d{1,2})/);
        if (!m || `${+m[1]}-${+m[2]}` !== mu || !ft.geometry) continue;
        const polys = ft.geometry.type === 'Polygon' ? [ft.geometry.coordinates] : ft.geometry.coordinates;
        let best = null;
        for (const p of polys) {
          const r = p[0]; let a = 0, cx = 0, cy = 0;
          for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const k = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += k; cx += (r[j][0] + r[i][0]) * k; cy += (r[j][1] + r[i][1]) * k; }
          if (a && (!best || Math.abs(a) > best.a)) best = { a: Math.abs(a), lon: cx / (3 * a), lat: cy / (3 * a) };
        }
        if (best) return { lat: +best.lat.toFixed(4), lon: +best.lon.toFixed(4) };
      }
    }
    return null;
  }
  const muAt = (lat, lon) => (window.HMHome && window.HMHome._muAt ? window.HMHome._muAt(lat, lon) : Promise.reject(new Error('no MU lookup')));

  // ---------- 1. legal and open ----------
  function openOn(r, t) {
    if (r.allYear) return true;
    if (!r.open || !r.close) return false;
    return r.open <= r.close ? t >= r.open && t <= r.close : t >= r.open || t <= r.close;
  }
  const tagOf = (notes) => { const m = String(notes || '').match(/youth only|bow only|private land only/i); return m ? m[0].toLowerCase() : ''; };
  const keyHit = (keys, s) => { const v = String(s || '').toLowerCase(); return keys.some((k) => k === v || k.endsWith(' ' + v) || v === k + 's'); };
  const isMigratoryOnly = (sp) => !(sp.seasonKeys || []).length && (sp.migratoryKeys || []).length > 0;
  const hoursFor = (sp) => { const H = (window.HM.regs && window.HM.regs.hours) || {}; return sp.group === 'waterfowl' || isMigratoryOnly(sp) ? { h: H.migratory, label: 'Ducks and geese' } : { h: H.bigGame, label: 'Big game and upland birds' }; };

  async function legal(plan, sp) {
    const mu = plan.where.mu, days = dRange(plan.from, plan.to);
    const keys = (sp.seasonKeys || []).map((k) => k.toLowerCase()), mkeys = (sp.migratoryKeys || []).map((k) => k.toLowerCase());
    const out = { rows: [], mig: [], bag: [], flags: [], dayOpen: {}, session: '', missing: false, days };
    if (!mu) { out.verdict = 'check'; out.why = 'No MU (Management Unit) picked, so the season tables cannot be checked.'; return out; }
    for (const f of regionFiles(mu)) {
      let R;
      try { R = await getJSON(`data/seasons/${f}.json`); } catch (e) { out.missing = true; continue; }
      const inThis = (R.rows || []).some((r) => (r.mus || []).includes(mu)) || (R.closedMus || []).some((c) => c.mu === mu);
      if (!inThis) continue;
      out.session = 'rb-' + f.replace('region', 'region-'); out.region = f; out.edition = R.edition; out.checked = R.checked; out.src = R.source; out.url = R.url;
      for (const r of R.rows || []) {
        if (!keys.includes(String(r.species).toLowerCase()) || !(r.mus || []).includes(mu)) continue;
        const tag = tagOf(r.notes);
        const ok = tag === 'youth only' ? false : tag === 'bow only' ? plan.method === 'bow' : true;
        out.rows.push({ r, tag, ok, days: days.filter((d) => openOn(r, d.slice(5))) });
      }
      const nr = R.noRow && (R.noRow.species || []).filter((s) => keys.includes(String(s).toLowerCase()));
      if (nr && nr.length) out.flags.push({ bad: true, t: `No general open season for ${nr.join(', ')} in this region. ${R.noRow.notes || ''}`, page: R.noRow.page, cert: R.noRow.cert });
      for (const c of R.closedMus || []) if (c.mu === mu) out.flags.push({ bad: true, closed: true, t: `MU ${mu}: ${c.notes}`, page: c.page, cert: c.cert });
      for (const l of R.leh || []) if (keys.includes(String(l.species).toLowerCase())) out.flags.push({ t: `${cap(l.species)}${l.class ? ', ' + l.class : ''}: ${l.notes}. LEH (Limited Entry Hunting) is a draw. You apply ahead of time.`, page: l.page, cert: l.cert });
      for (const b of R.bag || []) if (keyHit(keys, b.species) || keys.some((k) => String(b.species).toLowerCase().startsWith(k))) out.bag.push({ t: String(b.limit).toLowerCase().startsWith(String(b.species).toLowerCase() + ':') ? cap(String(b.limit).slice(String(b.species).length + 1).trim()) : `${cap(b.species)}: ${b.limit}`, page: b.page, cert: b.cert });
    }
    if (mkeys.length) {
      try {
        const M = await getJSON('data/seasons/migratory.json');
        const dk = Object.keys(M.districts || {}).find((k) => (M.districts[k].mus || []).includes(mu));
        out.migSrc = M.source; out.migUrl = M.url;
        if (dk) {
          out.district = `${dk} (${M.districts[dk].name})`;
          for (const r of M.rows || []) {
            if (r.district !== dk || !mkeys.includes(String(r.species).toLowerCase()) || (r.mus && !r.mus.includes(mu))) continue;
            out.mig.push({ r, ok: true, days: days.filter((d) => openOn(r, d.slice(5))) });
            out.bag.push({ t: `${cap(r.species)}: ${r.daily} a day, ${r.possession} in possession${r.notes && /within/i.test(r.notes) ? '. ' + r.notes.split('. Possession')[0] : ''}`, src: `Migratory Birds Regulations, ${r.item}`, cert: r.cert });
          }
          for (const n of M.noOpenSeason || []) if (n.district === dk && mkeys.includes(String(n.species).toLowerCase())) out.flags.push({ bad: true, t: `No federal open season for ${n.species} in district ${dk}.`, src: n.item, cert: n.cert });
        } else if (M.noDistrict && (M.noDistrict.mus || []).includes(mu)) out.flags.push({ bad: true, t: M.noDistrict.notes, cert: M.noDistrict.cert });
      } catch (e) { out.missing = true; }
    }
    // which days are open for this hunter
    const all = [...out.rows, ...out.mig];
    for (const d of days) out.dayOpen[d] = all.filter((x) => x.ok && x.days.includes(d)).map((x) => x.r.class || cap(x.r.species));
    const openN = days.filter((d) => out.dayOpen[d].length).length;
    out.openN = openN;
    if (!keys.length && !mkeys.length) { out.verdict = 'no'; out.why = 'No general open season for this animal in the season tables. Read the red flags below.'; }
    else if (out.missing && !all.length) { out.verdict = 'check'; out.why = 'Season tables are not saved on this phone yet. Open the app once with signal.'; }
    else if (out.flags.some((f) => f.closed)) { out.verdict = 'no'; out.why = 'This MU is closed to hunting.'; }
    else if (openN === days.length) { out.verdict = 'open'; out.why = `General open season on all ${days.length} day${days.length === 1 ? '' : 's'} of your plan.`; }
    else if (openN > 0) { out.verdict = 'check'; out.why = `Open on ${openN} of ${days.length} days only. The day by day plan marks the closed days.`; }
    else {
      out.verdict = 'no';
      const near = all.filter((x) => x.days.length && !x.ok);
      out.why = near.length ? `Only ${[...new Set(near.map((x) => x.tag))].join(' and ')} seasons fall in your dates.` : all.length ? 'No general open season in your dates.' : 'No general open season for this animal in this MU.';
    }
    if (out.verdict !== 'no' && all.some((x) => x.days.length && x.tag === 'private land only')) out.flags.push({ t: 'One season in your dates is private land only. You need the owner\'s permission.' });
    return out;
  }

  // ---------- 2. odds (BC Big Game Harvest Statistics, resident hunters, 2020 to 2024) ----------
  async function odds(plan, sp, lg) {
    if (!sp.harvestKey) return { none: true };
    let H;
    try { H = await getJSON('data/harvest/bc-harvest.json'); } catch (e) { return { missing: true }; }
    const mu = plan.where.mu, key = String(sp.harvestKey).toLowerCase();
    const inYears = (r) => r.year >= 2020 && r.year <= 2024;
    const muRows = (H.rows || []).filter((r) => r.mu === mu && String(r.species).toLowerCase() === key && r.resident && inYears(r)).sort((a, b) => a.year - b.year);
    const good = (rs) => rs.filter((r) => !r.lowConfidence && r.hunters >= 20 && r.kills != null && r.days != null);
    let rows = muRows, scope = 'mu';
    if (good(muRows).length < 3) {
      const n = regionOf(mu);
      const rk = n === '7' ? (lg && lg.region === 'region7a' ? '7A' : '7B') : n;
      const reg = (H.regionTotals || []).filter((r) => r.region === rk && String(r.species).toLowerCase() === key && r.resident && inYears(r)).sort((a, b) => a.year - b.year);
      if (good(reg).length) { rows = reg; scope = 'region'; }
    }
    const g = good(rows);
    if (!g.length) return { thin: true, muRows, src: H.source, url: H.url };
    const sH = g.reduce((a, r) => a + r.hunters, 0), sK = g.reduce((a, r) => a + r.kills, 0), sD = g.reduce((a, r) => a + r.days, 0);
    return { scope, rows, muRows, region: regionOf(mu), pct: (sK / sH) * 100, dph: sD / sH, dpk: sK ? sD / sK : null, perDay: sD ? sK / sD : 0, years: g.length, src: H.source, url: H.url, checked: H.checked, notes: H.notes };
  }
  const partyN = (p) => (p === 'two' ? 2 : p === 'group' ? 3 : 1);

  // ---------- 3. spots near the MU (data/spots candidates) ----------
  const spotTag = (sp) => {
    const n = (sp.id + ' ' + sp.name).toLowerCase();
    if (/deer/.test(n)) return 'deer'; if (/moose/.test(n)) return 'moose'; if (/elk/.test(n)) return 'elk'; if (/turkey/.test(n)) return 'turkey';
    if (/bear/.test(n)) return 'bear'; if (/quail/.test(n)) return 'quail'; if (/grouse|ptarmigan/.test(n)) return 'grouse';
    if (sp.group === 'waterfowl' || /duck|geese|goose|brant/.test(n)) return 'duck';
    return null;
  };
  const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const CAT = { drive: 'Drive to', atv: 'ATV (all terrain vehicle)', walk: 'Walk in', backcountry: 'Backcountry', camp: 'Camp' };
  async function spots(plan, sp) {
    const pt = plan.where.lat != null ? { lat: plan.where.lat, lon: plan.where.lon } : null;
    if (!pt) return { list: [], camps: [], none: 'No map point for this plan, so no spots.' };
    const man = await getJSON('data/layers/manifest.json');
    const l = (man.layers || []).find((x) => x.id === 'spots');
    if (!l) return { list: [], camps: [], none: 'No spot data in the app.' };
    const boxes = man.areaBoxes || {}, pad = 0.4;
    const areas = Object.keys(boxes).filter((a) => { const b = boxes[a]; return pt.lon >= b[0] - pad && pt.lon <= b[2] + pad && pt.lat >= b[1] - pad && pt.lat <= b[3] + pad; });
    const v = l.dataDate || man.updated || '1';
    const tag = spotTag(sp), acc = plan.access || [], months = monthsOf(dRange(plan.from, plan.to));
    const feats = [];
    for (const a of areas) {
      try { const fc = await getJSON(`${l.file.replace('{area}', a)}?v=${encodeURIComponent(v)}`); feats.push(...(fc.features || [])); } catch (e) { /* area not saved yet */ }
    }
    if (!feats.length) return { list: [], camps: [], none: areas.length ? 'Spots are not saved on this phone yet. Open the Map once with signal.' : 'No candidate spots in the app for this area yet.' };
    const A = plan.ask || {}, fourBy = A.truck === '4wd' || A.truck === '4wdhc';
    const left = { truck: 0, walk: 0, travel: 0, legal: 0 };
    const own = ownSightings(plan, tag);
    const scored = [], camps = [];
    for (const f of feats) {
      const p = f.properties || {}, c = f.geometry && f.geometry.coordinates; if (!c) continue;
      const at = { lat: c[1], lon: c[0] }, d = km(pt, at), same = p.mu === plan.where.mu;
      if (!same && d > 45) continue;
      if (p.cat === 'camp') { camps.push({ name: p.name, lat: at.lat, lon: at.lon, km: d, mu: p.mu, same }); continue; }
      if (tag && !(p.species || []).includes(tag)) continue;
      // ATV spots: an ATV, or (answer) a 4 wheel drive truck on the rough road ("by ATV or 4x4 on rough road" in the spot data)
      if (p.cat === 'atv' && !acc.includes('atv') && !fourBy) { if (A.truck === '2wd') left.truck++; continue; }
      if (p.cat === 'backcountry' && !(plan.overnight && acc.includes('walk'))) continue;
      let s = (+p.score || 0) + (same ? 3 : 0) - d / 15;
      if (Array.isArray(p.months) && p.months.length) s += p.months.some((m) => months.includes(m)) ? 1 : -3;
      if (p.cat === 'walk' && acc.includes('walk')) s += 0.5;
      const why = [];
      if (p.pop === 'quiet') { s += 0.5; why.push('Less popular: fewer hunters is a lever on the odds (Tip).'); }
      if (A.exp === 'new' && (p.cat === 'drive' || p.cat === 'walk')) { s += 0.5; why.push('New hunter: an easy spot to reach and sit (Tip).'); }
      if (A.exp === 'new' && p.cat === 'backcountry') s -= 1;
      const mine = ownNear(own, at);
      if (mine) { s += mine.pts; why.push(mine.text); }
      scored.push({ id: p.id, name: p.name, cat: p.cat, busy: p.busy, pop: p.pop, mu: p.mu, score: p.score, lat: at.lat, lon: at.lon, km: d, s, why, own: mine ? { text: mine.text, n: mine.n } : null });
    }
    scored.sort((a, b) => b.s - a.s);
    const names = new Set(), pre = [];
    for (const x of scored) { if (names.has(x.name)) continue; names.add(x.name); pre.push(x); if (pre.length >= 30) break; }
    // detail tiles (same files and cache as the map spot card): walk, drive, pressure, legal flags, why
    const tiles = {};
    for (const x of pre) { const u = detailUrl(l, man, x); if (u) (tiles[u] = tiles[u] || []).push(x); }
    await Promise.all(Object.entries(tiles).map(([u, xs]) => getJSON(u).then((t) => xs.forEach((x) => { if (t && t[x.id]) addDetail(x, t[x.id], plan); })).catch(() => { /* tile not saved: index facts only */ })));
    const home = homePt();
    const pool = [];
    for (const x of pre) {
      if (!x.det) { const dk = km(home, x) * 1.3; x.driveKm = Math.round(dk); x.driveMin = Math.round((dk / 60) * 60); x.driveSrc = 'est'; }
      if (x.legal && x.legal.fail.length) { left.legal++; continue; }
      if (A.fit && A.fit.walk && x.walkKm != null && x.walkKm > A.fit.walk) { left.walk++; continue; }
      if (A.fit && A.fit.walk === 1 && x.climbM != null && x.climbM > 100) { left.walk++; continue; }
      if (A.travel && x.driveMin != null && x.driveMin > A.travel) { left.travel++; continue; }
      if (A.budget && x.driveKm != null) { const cost = fuelCost(x.driveKm); if (cost > A.budget / 3) { x.s -= 1; x.why.push(`Fuel for the round trip is about $${Math.round(cost)}, a big part of your budget (estimate).`); } }
      pool.push(x);
    }
    pool.sort((a, b) => b.s - a.s);
    camps.sort((a, b) => (b.same - a.same) || a.km - b.km);
    for (const x of pool) { const c = camps.slice().sort((a, b) => km(a, x) - km(b, x))[0]; if (c) x.camp = { name: c.name, km: Math.round(km(c, x) * 10) / 10, lat: c.lat, lon: c.lon }; }
    const skip = new Set(plan.spotSkip || []);
    const shown = pool.filter((x) => !skip.has(x.id));
    return { list: shown.slice(0, 7), pool, camps: camps.slice(0, 2), tag, dataDate: l.dataDate, cert: l.cert, left, own: own.length,
      detail: pre.some((x) => x.det), none: pool.length ? '' : pre.length ? 'No candidate spot passes your answers and the legal checks. Loosen the walk or drive limit (Change).' : '' };
  }
  // ---------- spot details: access, pressure, pack out and legal checks (from the spot pipeline's detail tile) ----------
  function detailUrl(l, man, x) {
    if (!l.detail) return null;
    const pre = String(x.id || '').split('-')[0], boxes = man.areaBoxes || {};
    const area = boxes[pre] ? pre : Object.keys(boxes).find((a) => { const b = boxes[a]; return x.lon >= b[0] && x.lon <= b[2] && x.lat >= b[1] && x.lat <= b[3]; });
    if (!area) return null;
    const dg = +l.tileDeg || 0.25;
    return `${l.detail.replace(/\{area\}/g, area).replace(/\{tile\}/g, `${Math.floor(x.lon / dg)}_${Math.floor(x.lat / dg)}`)}?v=${encodeURIComponent(l.dataDate || '1')}`;
  }
  const homePt = () => { const b = ((window.HM && window.HM.bases) || []).find((x) => x.id === 'mission'); return b ? { lat: b.lat, lon: b.lon } : { lat: 49.13, lon: -122.31 }; };
  // Assumption (labelled where shown): a truck uses about 15 L per 100 km and fuel is about $1.80 a litre. Check your own truck and the pump.
  const FUEL_L100 = 15, FUEL_PRICE = 1.8;
  const fuelCost = (oneWayKm) => (oneWayKm * 2 * FUEL_L100 / 100) * FUEL_PRICE;
  // legal flags in the spot data, sorted into the three checks the board shows
  function legalOf(flags, method) {
    const out = { fail: [], warn: [], rows: { priv: [], road: [], noshoot: [], other: [] } };
    for (const f of flags || []) {
      const t = String(f.t || f.text || ''); if (!t || /^MU \(Management Unit\) [\d-]+, Region [^.]*\.$/.test(t)) continue;
      const here = /right here|^Inside|^Spot is inside/i.test(t);
      let k = 'other', bad = false;
      if (/private land/i.test(t)) { k = 'priv'; bad = /^Private land right here/i.test(t); }
      else if (/road allowance|on or within \d+ m of the road/i.test(t)) { k = 'road'; bad = here; }
      else if (/no hunting|no shooting|ecological reserve|single projectile|shot only|sanctuary|prohibited/i.test(t)) { k = 'noshoot'; bad = here && !(/single projectile|shot only/i.test(t) && method !== 'rifle' && method !== 'rimfire') && !/bows allowed/i.test(t); }
      else if (/^MU \(Management Unit\)/.test(t) && !/Near the MU line/.test(t)) continue;
      const row = { t, cert: f.cert, bad };
      out.rows[k].push(row);
      if (bad) out.fail.push(row); else if (k !== 'other') out.warn.push(row);
    }
    return out;
  }
  function addDetail(x, d, plan) {
    x.det = true; x.area = d.area;
    const num = (v) => (v == null || v === '' || isNaN(+v) ? null : +v);
    x.walkKm = num(d.walkKm); x.rideKm = num(d.rideKm); x.climbM = num(d.climbM); x.walkMin = num(d.walkMin);
    x.press = d.pressure; x.pressWhy = d.pressureWhy; x.popLabel = d.popLabel; x.popCert = d.popCert; x.popWhy = d.popWhy; x.pop = d.pop || x.pop;
    x.park = Array.isArray(d.park) ? { lon: d.park[0], lat: d.park[1], what: d.parkWhat } : null;
    x.slope = num(d.slope); x.aspect = d.aspect; x.scoreLabel = d.scoreLabel; x.driveVia = (d.driveVia || []).slice(-3);
    const drive = (d.plan || []).find((t) => /^Drive:/.test(t)) || '', m = drive.match(/from Mission, about ([\d,.]+) km/i);
    if (m) { x.driveKm = Math.round(+m[1].replace(/,/g, '')); x.driveSrc = 'data'; }
    else { x.driveKm = Math.round(km(homePt(), x.park || x) * 1.3); x.driveSrc = 'est'; }
    x.driveMin = Math.round((x.driveKm / 60) * 60) + (x.rideKm ? Math.round((x.rideKm / 10) * 60) : 0); // Assumption: about 60 km/h on average to the parking, 10 km/h on the rough part
    x.ride = /4x4|rough road/i.test((d.plan || []).find((t) => /^Ride:/.test(t)) || '') ? 'rough' : x.rideKm ? 'ride' : '';
    x.legal = legalOf(d.flags, plan.method);
    x.evid = (d.evidence || []).filter((e) => e && (e.pts > 0)).sort((a, b) => b.pts - a.pts).slice(0, 3).map((e) => e.t);
    if (/FSR|forest service/i.test((d.driveVia || []).join(' '))) x.fsr = true;
  }
  // ---------- your own trips (after the hunt debriefs, hm.plandebrief.<planId>) ----------
  const DEB = 'hm.plandebrief.';
  function allDebriefs() {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(DEB)) { const v = JSON.parse(localStorage.getItem(k) || '[]'); if (Array.isArray(v)) v.forEach((e) => e && out.push(Object.assign({ planId: k.slice(DEB.length) }, e))); } } } catch (e) { /* storage blocked */ }
    return out;
  }
  const ownSightings = (plan, tag) => allDebriefs().filter((e) => e.lat != null && e.lon != null && (!tag || !e.tag || e.tag === tag));
  // within 2 km of one of your own debriefs: seen animals raise the spot, a blank trip lowers it a little (both labelled)
  function ownNear(own, at) {
    let best = null;
    for (const e of own) {
      const dk = km(e, at); if (dk > 2) continue;
      const n = +e.seenN || 0;
      const pts = n > 0 ? Math.min(3, 1 + n * 0.5) : -0.5;
      if (!best || Math.abs(pts) > Math.abs(best.pts)) best = { pts, n, text: n > 0 ? `From your own trips: you saw ${n} ${n === 1 ? 'animal' : 'animals'} ${dk < 0.1 ? 'right here' : `${dk < 1 ? Math.round(dk * 1000) + ' m' : dk.toFixed(1) + ' km'} away`} on ${e.date || 'a past trip'}${e.time ? ` (${e.time})` : ''}.` : `From your own trips: nothing seen ${dk < 1 ? Math.round(dk * 1000) + ' m' : dk.toFixed(1) + ' km'} away on ${e.date || 'a past trip'}.` };
    }
    return best;
  }
  const gmaps = (x) => `https://www.google.com/maps/search/?api=1&query=${x.lat.toFixed(5)},${x.lon.toFixed(5)}`;
  const mapLink = (x) => `#/map/@${x.lat.toFixed(5)},${x.lon.toFixed(5)},15`;

  // ---------- 4. checklist ----------
  const CATS = [['paperwork', 'Paperwork and licences'], ['firearm', 'Firearm and ammunition'], ['gear', 'Gear'], ['clothing', 'Clothing'], ['meat', 'Meat care'], ['safety', 'Safety'], ['vehicle', 'Vehicle and getting there'], ['plan', 'Plan and people']];
  function listMatches(when, cond) {
    const w = when || {}, ks = Object.keys(w);
    if (!ks.length) return true;
    if (!cond) return false;
    const any = (a, b) => (a || []).some((x) => (b || []).includes(x));
    return ks.every((k) => {
      if (k === 'method') return (w.method || []).includes(cond.method);
      if (k === 'access') return any(w.access, cond.access);
      if (k === 'overnight') return !!w.overnight === !!cond.overnight;
      if (k === 'party') return (w.party || []).includes(cond.party);
      if (k === 'months') return any(w.months, cond.months);
      if (k === 'firstHunt') return !!w.firstHunt === !!cond.firstHunt;
      return false; // a condition this app does not know: leave the list out
    });
  }
  function checkItems(sp, lists, cond) {
    const out = [], seen = new Set();
    const add = (cat, it, from) => {
      if (!it || !it.t) return;
      const n = String(it.t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (seen.has(n)) return; seen.add(n);
      out.push({ cat: CATS.some(([k]) => k === cat) ? cat : 'gear', t: it.t, why: it.why, cert: it.cert, lesson: it.lesson, from, key: hashKey(cat + '|' + n) });
    };
    for (const [cat] of CATS) for (const it of ((sp && sp.checklist) || {})[cat] || []) add(cat, it, sp.name);
    for (const l of lists) if (listMatches(l.when, cond)) for (const it of l.items) add(it.cat || l.category || 'gear', it, l.title || l.id);
    return out;
  }
  function checklistHtml(items, ticked, C, attr, closed) {
    return CATS.map(([cat, label]) => {
      const its = items.filter((i) => i.cat === cat); if (!its.length) return '';
      const n = its.filter((i) => ticked(i)).length;
      return `<details class="pl-cat" data-cat="${cat}"${closed && closed.has(cat) ? '' : ' open'}><summary><h3>${esc(label)} <span class="pill">${n}/${its.length}</span></h3></summary>${its.map((i) => `<label class="check pl-item${ticked(i) ? ' done' : ''}">
        <input type="checkbox" ${attr}="${esc(i.key)}"${ticked(i) ? ' checked' : ''}><span>${esc(i.t)}${i.cert != null ? ' ' + C.certBadge(i.cert) : ''}
        ${i.why || i.lesson ? `<small class="pl-why">${esc(i.why || '')}${i.lesson && C.hasSession(i.lesson) ? ` <a href="#/s/${esc(i.lesson)}">Lesson: ${esc(C.lessonTitle(i.lesson))}</a>` : ''}</small>` : ''}</span></label>`).join('')}</details>`;
    }).join('');
  }
  const closedCats = (root) => new Set([...root.querySelectorAll('details.pl-cat:not([open])')].map((d) => d.dataset.cat));
  const lessonLinks = (ids, C) => [...new Set(ids)].filter((id) => id && C.hasSession(id)).map((id) => `<a class="pl-chip" href="#/s/${esc(id)}">${esc(C.lessonTitle(id))}</a>`).join('');

  // ---------- saved plans ----------
  const plansOf = (C) => (C.S.plans = Array.isArray(C.S.plans) ? C.S.plans : []);
  const METHOD_LABEL = { rifle: 'Rifle', shotgun: 'Shotgun', bow: 'Bow', rimfire: '.22 rimfire' };
  const ACCESS = [['truck', 'Truck'], ['atv', 'ATV (all terrain vehicle)'], ['boat', 'Boat'], ['kayak', 'Kayak'], ['walk', 'Walk in']];
  const PARTY = [['solo', 'Solo'], ['two', 'With my brother'], ['group', 'Group (3 or more)']];
  const accessLabel = (a) => (a || []).map((x) => (ACCESS.find(([k]) => k === x) || [x, x])[1].replace(/ \(.*\)/, '')).join(', ');
  const partyLabel = (p) => (PARTY.find(([k]) => k === p) || [p, p])[1];
  // Region 2 deer are black tailed deer; the synopsis season rows list them as mule deer (page 28). Display only: plan data stays "mule-deer".
  const spName = (sp, mu) => (sp && /^2-/.test(mu || '') && (sp.seasonKeys || []).includes('mule deer') ? 'Black tailed deer (listed as mule deer in the synopsis)' : sp ? sp.name : '');
  function planTitle(p, D) { const sp = D && D.byId[p.species]; return `${sp ? spName(sp, p.where.mu) : p.speciesName || 'Hunt'}${p.where.mu ? `, MU ${p.where.mu}` : ''}`; }
  function planProgress(p, D) {
    const sp = D.byId[p.species]; if (!sp) return null;
    const items = checkItems(sp, D.lists, condOf(p));
    return { done: items.filter((i) => p.ticks && p.ticks[i.key]).length, total: items.length };
  }
  const condOf = (p) => ({ method: p.method, access: p.access || [], overnight: !!p.overnight, party: p.party, months: monthsOf(dRange(p.from, p.to)), firstHunt: p.firstHunt !== false });
  // first hunt: yes until there is a saved plan whose last day has passed
  const firstDefault = (C) => !plansOf(C).some((p) => p.to && p.to < todayIso());

  // ---------- wizard ----------
  // Harrison Lake area: Harrison Hot Springs, approximate town centre (Assumption), in MU 2-18 (point in polygon on the MU layer, checked 2026-10-16). Deer near Mission are black tailed deer; the Rule Book season rows list them as mule deer.
  const HARRISON_LESSON = 'local-harrison-deer'; // content/phase6/20-local-harrison-deer.md: linked from the Harrison presets and plans (species lessons are not per region)
  const PRESETS = {
    'harrison-deer-two': { species: 'mule-deer', where: { id: 'harrison', mu: '2-18', label: 'Harrison Lake area (black tailed deer)', lat: 49.30, lon: -121.785, src: 'preset' }, method: 'rifle', access: ['truck'], party: 'two', firstHunt: true },
    'harrison-deer-solo': { species: 'mule-deer', where: { id: 'harrison', mu: '2-18', label: 'Harrison Lake area (black tailed deer)', lat: 49.30, lon: -121.785, src: 'preset' }, method: 'rifle', access: ['truck'], party: 'solo', firstHunt: true },
  };
  // answer lists for the optional questions: [value, label, small print]
  const ASK = {
    exp: [['new', 'New to hunting', 'No hunts yet, or this is the first'], ['some', 'A few hunts', 'Small game, or a big game hunt or two'], ['seasoned', 'Hunted big game for years', 'You know still hunting and the pack out']],
    walk: [[1, 'Up to 1 km', 'Short walks, little climbing'], [3, 'Up to 3 km', 'A steady walk with some hills'], [6, '5 km or more', 'Long days on foot are fine']],
    pack: [[15, 'Up to 15 kg', 'About a day pack and a bit'], [25, '15 to 25 kg', 'A loaded frame pack'], [35, '25 kg or more', 'Heavy loads, many trips']],
    hours: [[3, 'About 3 hours', 'First or last light only'], [5, 'About 5 hours', 'A dawn sit and an evening sit'], [8, 'About 8 hours', 'Most of the day'], ['full', 'All of legal light', 'First to last legal light']],
    travel: [[60, 'Up to 1 hour'], [90, 'Up to 1.5 hours'], [120, 'Up to 2 hours'], [180, 'Up to 3 hours'], [0, 'No limit']],
    truck: [['2wd', '2 wheel drive', 'A car or a 2 wheel drive truck'], ['4wd', '4 wheel drive, stock height', 'Fine on gravel, careful on rough spurs'], ['4wdhc', '4 wheel drive, high clearance', 'Lifted or all terrain tires']],
    pexp: [['new', 'New to hunting'], ['some', 'A few hunts'], ['seasoned', 'Hunted big game for years']],
    ptag: [[true, 'Yes, a tag too', 'Two hunters who can each take a deer'], [false, 'No, helping only', 'Spots, packs and keeps you company']],
    sights: [['iron', 'Open (iron) sights'], ['scope', 'Scope']],
    budget: [[100, 'Under $100'], [250, '$100 to $250'], [500, '$250 to $500'], [0, 'More, or not a worry']],
    success: [['see', 'See the animal', 'Get close, learn the ground'], ['shot', 'Get a shot opportunity', 'A legal animal in range, a clean chance'], ['meat', 'Meat in the freezer', 'Take an animal home']],
  };
  const shotsFor = (method) => (method === 'bow' ? [20, 30, 40, 50] : method === 'shotgun' ? [20, 30, 40, 50] : method === 'rimfire' ? [25, 50, 75, 100] : [50, 100, 150, 200, 300]);
  const askLabel = (list, v) => { const o = (ASK[list] || []).find((x) => x[0] === v); return o ? o[1] : ''; };
  const yd = (m) => Math.round(m * 1.0936);
  // owned guns from My guns (data/addons/guns/guns.json), the ones that fit the method
  async function myGuns(method) {
    let G = null; try { G = await getJSON('data/addons/guns/guns.json'); } catch (e) { return []; }
    const fit = { rifle: ['bolt', 'sks'], rimfire: ['rimfire'], shotgun: ['shotgun'], bow: [] }[method] || [];
    return (G.guns || []).filter((g) => g.owned && fit.includes(g.draw)).map((g) => ({ id: g.id, name: g.name, calibre: g.calibre, sights: /iron|open/i.test(g.sights || '') ? 'iron' : /scope/i.test(g.sights || '') ? 'scope' : '', sightsText: g.sights }));
  }

  // Optional questions (plan trip v2, part 1): each has a skip; answers live in plan.ask (null = skipped). A ready made plan
  // still skips only what it answers, so these are asked after it (with "Skip the rest" to go straight to the plan).
  const OPT = ['exp', 'fit', 'hours', 'travel', 'truck', 'partner', 'gun', 'budget', 'success'];
  const STEPS = ['animal', 'where', 'when', 'how', 'access', 'overnight', 'party', 'first', ...OPT];
  const Q = { animal: 'What animal?', where: 'Where?', when: 'When?', how: 'How will you hunt?', access: 'How do you get in?', overnight: 'Staying overnight? Camping or day trips?', party: 'Who is going?', first: 'Is this your first hunt?',
    exp: 'Your hunting experience?', fit: 'How far can you walk, and carry?', hours: 'How many hours can you hunt each day?', travel: 'Longest drive from Mission, one way?', truck: 'What do you drive?',
    partner: 'Your partner on this hunt?', gun: 'Your gun and your longest practised shot?', budget: 'Budget for this trip?', success: 'What does success mean to you on this trip?' };
  let draft = null;
  const ss = { get() { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; } }, set(v) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch (e) { /* storage blocked */ } } };
  const getDraft = () => (draft = draft || ss.get() || {});
  const saveDraft = () => ss.set(draft);
  const hasAsk = (d, k) => !!(d.ask && Object.prototype.hasOwnProperty.call(d.ask, k));
  const answered = (d, k) => (OPT.includes(k) ? (k === 'partner' && d.party === 'solo') || hasAsk(d, k)
    : k === 'animal' ? !!d.species : k === 'where' ? !!(d.where && d.where.mu) : k === 'when' ? !!(d.from && d.to) : k === 'how' ? !!d.method : k === 'access' ? !!(d.access && d.access.length) : k === 'overnight' ? d.overnight != null : k === 'party' ? !!d.party : d.firstHunt != null);
  const goStep = (n) => { location.hash = `#/plan/new/${n}`; };

  async function wizard(view, n, C) {
    const D = await loadData();
    if (!D.species.length) { view.innerHTML = noData(); return; }
    const d = getDraft();
    const first = STEPS.findIndex((k) => !answered(d, k));
    if (first > -1 && n > first) n = first;
    const k = STEPS[n];
    C.setTitle(d.editId ? 'Change the plan' : 'Plan a hunt');
    css2();
    const sp = D.byId[d.species];
    const head = `<div class="pl-wiz-h"><div class="muted">Question ${n + 1} of ${STEPS.length}${sp && n > 0 ? `: ${esc(spName(sp, d.where && d.where.mu))}` : ''}</div><div class="bar"><i style="width:${Math.round(((n + 1) / STEPS.length) * 100)}%"></i></div>
      <h2 class="pl-q">${Q[k]}</h2></div>`;
    const done = (patch) => { Object.assign(d, patch); saveDraft(); let k = n + 1; if (d._preset) while (k < STEPS.length && answered(d, STEPS[k])) k++; if (k < STEPS.length) goStep(k); else finish(C, D); }; // a ready made plan skips what it already answered
    let body = '';
    if (k === 'animal') {
      body = `<input type="search" id="pl-find" class="pl-find" placeholder="Find an animal: deer, duck, quail" aria-label="Find an animal" autocomplete="off">
        <div id="pl-animals">${GROUPS.concat([['', 'Other']]).map(([g, label]) => {
          const ss2 = D.species.filter((s) => (g ? s.group === g : !GROUPS.some(([x]) => x === s.group)));
          return ss2.length ? `<div class="pl-grp" data-g="${esc(g)}"><h3>${esc(label)}</h3><div class="pl-opts">${ss2.map((s) => `<button type="button" class="pl-opt${d.species === s.id ? ' on' : ''}" data-sp="${esc(s.id)}" data-find="${esc((s.name + ' ' + s.id + ' ' + (s.group || '') + ' ' + (s.seasonKeys || []).join(' ')).toLowerCase())}">${esc(s.name)}</button>`).join('')}</div></div>` : '';
        }).join('')}</div><p class="muted" id="pl-none" hidden>No animal matches. Try one word.</p>`;
    } else if (k === 'where') {
      body = `<div class="pl-opts">${places().map((p) => `<button type="button" class="pl-opt${d.where && d.where.id === p.id ? ' on' : ''}" data-place="${esc(p.id)}">${esc(p.name)}<small>${p.mu ? `MU (Management Unit) ${esc(p.mu)}` : 'MU found when you tap'}</small></button>`).join('')}
        <button type="button" class="pl-opt" id="pl-gps">Use my location<small>Finds the MU you are standing in. Stays on this phone.</small></button></div>
        <label class="f" for="pl-mu">Or type an MU (Management Unit), like 3-27</label>
        <div class="row pl-mu-row"><input type="text" id="pl-mu" autocomplete="off" placeholder="3-27" value="${esc(d.where && d.where.typed ? d.where.mu : '')}"><button type="button" class="btn primary" id="pl-mu-go">Use it</button></div>
        <div id="pl-msg" class="pl-msg" role="status"></div>`;
    } else if (k === 'when') {
      const t = todayIso(), wd = dow(t);
      const sat = wd === 6 ? t : wd === 0 ? t : dAdd(t, 6 - wd), sun = wd === 0 ? t : dAdd(sat, 1);
      const picks = [['This weekend', sat, sun], ['Next 7 days', t, dAdd(t, 6)]];
      const opens = sp ? await openings(sp, d.where.mu, t) : [];
      opens.forEach((o) => picks.push([`Opening week: ${o.label}`, o.from, dAdd(o.from, 6)]));
      body = `<div class="pl-opts">${picks.map(([l, a, b]) => `<button type="button" class="pl-opt" data-a="${a}" data-b="${b}">${esc(l)}<small>${esc(rangeLabel(a, b))}</small></button>`).join('')}</div>
        ${sp && !opens.length ? '<p class="muted">No general season opening found ahead in this MU in the app\'s tables.</p>' : ''}
        <div class="pl-dates"><div><label class="f" for="pl-from">First day</label><input type="date" id="pl-from" value="${esc(d.from || t)}"></div>
        <div><label class="f" for="pl-to">Last day</label><input type="date" id="pl-to" value="${esc(d.to || dAdd(t, 2))}"></div></div>
        <div id="pl-msg" class="pl-msg" role="status"></div><button type="button" class="btn next block" id="pl-next">Next</button>`;
    } else if (k === 'how') {
      const ms = (sp && sp.methods) || [];
      const fitTxt = { best: 'Best fit', ok: 'Works', no: 'Not a fit' };
      body = ms.length ? `<div class="pl-opts">${ms.map((m) => `<button type="button" class="pl-opt${m.fit === 'no' ? ' off' : ''}${d.method === m.id ? ' on' : ''}" data-m="${esc(m.id)}" ${m.fit === 'no' ? 'disabled' : ''}>${esc(m.label || METHOD_LABEL[m.id] || m.id)} <span class="pill ${m.fit === 'best' ? 'soon' : ''}">${fitTxt[m.fit] || ''}</span><small>${esc(m.note || '')}${m.cert != null ? ' ' + C.certBadge(m.cert) : ''}</small></button>`).join('')}</div>`
        : `<div class="pl-opts">${Object.entries(METHOD_LABEL).map(([id, l]) => `<button type="button" class="pl-opt${d.method === id ? ' on' : ''}" data-m="${id}">${l}</button>`).join('')}</div>`;
    } else if (k === 'access') {
      const a = d.access || [];
      body = `<p class="muted">Pick all that apply.</p><div class="pl-opts">${ACCESS.map(([id, l]) => `<button type="button" class="pl-opt pl-tog${a.includes(id) ? ' on' : ''}" data-acc="${id}" aria-pressed="${a.includes(id)}">${esc(l)}</button>`).join('')}</div>
        <button type="button" class="btn next block" id="pl-next" ${a.length ? '' : 'disabled'}>Next</button>`;
    } else if (k === 'overnight') {
      body = `<div class="pl-opts pl-two"><button type="button" class="pl-opt${d.overnight === true ? ' on' : ''}" data-on="1">Yes<small>Camp or stay out</small></button><button type="button" class="pl-opt${d.overnight === false ? ' on' : ''}" data-on="0">No<small>Home each night</small></button></div>`;
    } else if (k === 'first') {
      const fh = d.firstHunt != null ? d.firstHunt : firstDefault(C);
      body = `<p class="muted">Yes adds a first hunt list: the extra steps that are easy to miss the first time.</p><div class="pl-opts pl-two"><button type="button" class="pl-opt${fh ? ' on' : ''}" data-fh="1">Yes<small>First time out</small></button><button type="button" class="pl-opt${!fh ? ' on' : ''}" data-fh="0">No<small>I have hunted before</small></button></div>`;
    } else if (k === 'party') {
      body = `<div class="pl-opts">${PARTY.map(([id, l]) => `<button type="button" class="pl-opt${d.party === id ? ' on' : ''}" data-party="${id}">${esc(l)}</button>`).join('')}</div>`;
    }
    // optional questions: one list (tap = answer), or groups with a Next button
    const a0 = (d.ask && d.ask[k]) || null;
    const optBtns = (list, cur, attr) => `<div class="pl-opts">${ASK[list].map(([v, l, s], i) => `<button type="button" class="pl-opt${cur === v ? ' on' : ''}" ${attr}="${i}">${esc(l)}${s ? `<small>${esc(s)}</small>` : ''}</button>`).join('')}</div>`;
    const grp = (title, list, cur, g) => `<h3 class="pl2-gh">${esc(title)}</h3><div class="pl-opts pl2-grp" data-grp="${g}">${(Array.isArray(list) ? list : ASK[list]).map(([v, l, s], i) => `<button type="button" class="pl-opt pl-tog${cur === v ? ' on' : ''}" data-gi="${i}" aria-pressed="${cur === v}">${esc(l)}${s ? `<small>${esc(s)}</small>` : ''}</button>`).join('')}</div>`;
    let guns = [];
    if (OPT.includes(k)) {
      const why = {
        exp: 'Sets which spots rank first (short walks and sits for a new hunter) and the skill lever on the odds.',
        fit: 'Sets the longest walk in for your top spots and the pack out estimate.',
        hours: 'Sets the timeline on each hunt day: when you sit and when you rest.',
        travel: 'Spots further than this (drive time estimate) are left out of your top spots.',
        truck: '2 wheel drive leaves out rough road spots. High clearance adds them.',
        partner: 'Sets the party odds: only hunters with a tag count.',
        gun: 'Sets your max shot. Your max: the distance you hit a 15 cm (6 in) plate 9 of 10 from a field rest (Tip).',
        budget: 'Adds a fuel estimate per spot and drops far spots lower when the budget is tight.',
        success: 'Changes the odds headline: what the numbers can and cannot say about your goal.',
      }[k];
      if (k === 'exp') body = optBtns('exp', a0, 'data-ov');
      else if (k === 'hours') body = optBtns('hours', a0, 'data-ov');
      else if (k === 'travel') body = optBtns('travel', a0, 'data-ov');
      else if (k === 'truck') body = optBtns('truck', a0, 'data-ov');
      else if (k === 'budget') body = `${optBtns('budget', a0, 'data-ov')}<p class="muted pl-small">Licences are on top: in BC a hunting licence and a species licence for each hunter. The prices are in the hunt week list.</p>`;
      else if (k === 'success') body = optBtns('success', a0, 'data-ov');
      else if (k === 'fit') body = grp('Longest walk in, one way', 'walk', a0 && a0.walk, 'walk') + grp('Heaviest pack you are happy to carry', 'pack', a0 && a0.pack, 'pack');
      else if (k === 'partner') body = grp('Their experience', 'pexp', a0 && a0.exp, 'exp') + grp('Will they carry a tag too?', 'ptag', a0 && a0.tag, 'tag');
      else if (k === 'gun') {
        guns = await myGuns(d.method);
        const cur = a0 || {}, gid = cur.id || (guns[0] && guns[0].id);
        const gSel = guns.find((g) => g.id === gid);
        const shots = shotsFor(d.method).map((m) => [m, `${m} m (${yd(m)} yd)`]).concat([[0, 'Not practised yet', 'Sight in and practise first']]);
        body = (guns.length ? `<h3 class="pl2-gh">From My guns</h3><div class="pl-opts pl2-grp" data-grp="gun">${guns.map((g, i) => `<button type="button" class="pl-opt pl-tog${g.id === gid ? ' on' : ''}" data-gi="${i}" aria-pressed="${g.id === gid}">${esc(g.name)}<small>${esc(g.calibre)}</small></button>`).join('')}</div>` : '')
          + (d.method === 'bow' ? '' : grp('Sights', 'sights', cur.sights || (gSel && gSel.sights) || '', 'sights'))
          + grp('Longest shot you have practised and hit', shots, cur.maxShot != null ? cur.maxShot : null, 'shot');
      }
      if (['fit', 'partner', 'gun'].includes(k)) body += '<button type="button" class="btn next block" id="pl-next">Next</button>';
      body = `<p class="pl2-optq"><span class="pill">Optional</span> ${esc(why)}</p>${body}
        <div class="pl2-skip"><button type="button" class="btn" id="pl-skip">Skip this question</button><button type="button" class="btn" id="pl-skip-all">Skip the rest, make the plan</button></div>`;
    }
    view.innerHTML = `<div class="pl-wiz">${head}${body}<div class="btn-row pl-wiz-foot">${n > 0 ? '<button type="button" class="btn" id="pl-back">Back</button>' : '<a class="btn" href="#/plan">My plans</a>'}<button type="button" class="btn" id="pl-reset">Start over</button></div>
      <p class="muted pl-small">Study aid only. The official regulations are the law.</p></div>`;
    const $ = (s) => view.querySelector(s);
    if (OPT.includes(k)) {
      const setAsk = (v) => done({ ask: Object.assign({}, d.ask, { [k]: v }) });
      $('#pl-skip').onclick = () => setAsk(null);
      $('#pl-skip-all').onclick = () => { d.ask = Object.assign({}, d.ask); OPT.forEach((x) => { if (!hasAsk(d, x)) d.ask[x] = null; }); saveDraft(); finish(C, D); };
      const listOf = { exp: 'exp', hours: 'hours', travel: 'travel', truck: 'truck', budget: 'budget', success: 'success' }[k];
      if (listOf) view.querySelectorAll('[data-ov]').forEach((b) => b.onclick = () => setAsk(ASK[listOf][+b.dataset.ov][0]));
      else {
        const lists = { fit: { walk: 'walk', pack: 'pack' }, partner: { exp: 'pexp', tag: 'ptag' }, gun: { sights: 'sights' } }[k];
        const shots = shotsFor(d.method).concat([0]);
        const pick = Object.assign({}, a0 || {});
        if (k === 'gun' && !pick.id && guns[0]) Object.assign(pick, { id: guns[0].id, name: guns[0].name, calibre: guns[0].calibre }, pick.sights ? {} : { sights: guns[0].sights || undefined });
        view.querySelectorAll('[data-grp]').forEach((g) => g.querySelectorAll('[data-gi]').forEach((b) => b.onclick = () => {
          const key = g.dataset.grp, i = +b.dataset.gi;
          if (key === 'gun') { const x = guns[i]; Object.assign(pick, { id: x.id, name: x.name, calibre: x.calibre }); if (x.sights) pick.sights = x.sights; }
          else if (key === 'shot') pick.maxShot = shots[i];
          else pick[key] = ASK[lists[key]][i][0];
          g.querySelectorAll('[data-gi]').forEach((y) => { y.classList.toggle('on', y === b); y.setAttribute('aria-pressed', String(y === b)); });
          if (key === 'gun' && pick.sights) view.querySelectorAll('[data-grp="sights"] [data-gi]').forEach((y, j) => { const on = ASK.sights[j][0] === pick.sights; y.classList.toggle('on', on); y.setAttribute('aria-pressed', String(on)); });
        }));
        $('#pl-next').onclick = () => setAsk(Object.keys(pick).length ? pick : null);
      }
    }
    $('#pl-back') && ($('#pl-back').onclick = () => history.back());
    $('#pl-reset').onclick = () => { draft = {}; saveDraft(); if (n === 0) wizard(view, 0, C); else goStep(0); };
    if (k === 'animal') {
      view.querySelectorAll('[data-sp]').forEach((b) => b.onclick = () => { const id = b.dataset.sp; const s2 = D.byId[id]; const patch = { species: id };
        if (d.species !== id && d.method && !((s2.methods || []).some((m) => m.id === d.method && m.fit !== 'no'))) patch.method = '';
        done(patch); });
      const f = $('#pl-find');
      f.oninput = () => { const q = f.value.trim().toLowerCase(); let any = 0;
        view.querySelectorAll('[data-sp]').forEach((b) => { const hit = !q || q.split(/\s+/).every((w) => b.dataset.find.includes(w)); b.hidden = !hit; any += hit; });
        view.querySelectorAll('.pl-grp').forEach((g) => { g.hidden = ![...g.querySelectorAll('[data-sp]')].some((b) => !b.hidden); });
        $('#pl-none').hidden = !!any; };
    } else if (k === 'where') {
      const msg = (t) => { $('#pl-msg').innerHTML = t ? `<p>${t}</p>` : ''; };
      view.querySelectorAll('[data-place]').forEach((b) => b.onclick = async () => {
        const p = places().find((x) => x.id === b.dataset.place);
        let mu = p.mu;
        if (!mu) { msg('Finding the MU (Management Unit)...'); try { mu = await muAt(p.lat, p.lon); } catch (e) { mu = ''; } }
        if (!mu) { msg('Could not find the MU here. Open the Map once with signal, or type the MU below.'); return; }
        done({ where: { id: p.id, label: p.name, mu, lat: p.lat, lon: p.lon, src: 'base' } });
      });
      $('#pl-gps').onclick = () => {
        if (!navigator.geolocation) { msg('This phone cannot share its location here. Type the MU instead.'); return; }
        msg('Finding your location...');
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const lat = +pos.coords.latitude.toFixed(4), lon = +pos.coords.longitude.toFixed(4);
          msg('Finding your MU (Management Unit)...');
          let mu = ''; try { mu = (await muAt(lat, lon)) || ''; } catch (e) { mu = ''; }
          if (!mu) { msg('No BC MU found at your location, or the MU map is not saved yet. Type the MU instead.'); return; }
          if (view.isConnected) done({ where: { id: 'gps', label: 'My location', mu, lat, lon, src: 'gps' } });
        }, () => msg('Location is off or was not allowed. Pick a place or type the MU.'), { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
      };
      const go = async () => {
        const mu = normMu($('#pl-mu').value);
        if (!mu) { msg('Type it like 3-27: region number, a dash, unit number. Regions are 1 to 8.'); return; }
        msg('Checking the MU...');
        let c = null, failed = false; try { c = await muCentre(mu); } catch (e) { failed = true; }
        if (!c && !failed) { msg(`MU ${esc(mu)} is not in the app's MU map. Check the number on the map or in the synopsis.`); return; }
        done({ where: { id: 'mu', label: `MU ${mu}`, mu, lat: c ? c.lat : null, lon: c ? c.lon : null, src: 'typed', typed: true } });
      };
      $('#pl-mu-go').onclick = go;
      $('#pl-mu').onkeydown = (e) => { if (e.key === 'Enter') go(); };
    } else if (k === 'when') {
      const check = (a, b) => {
        if (!a || !b) return 'Pick a first and a last day.';
        if (b < a) return 'The last day is before the first day.';
        if (dRange(a, b).length > 60) return 'Keep it to 60 days or less.';
        return '';
      };
      const set = (a, b) => { const e = check(a, b); if (e) { $('#pl-msg').innerHTML = `<p>${e}</p>`; return; } done({ from: a, to: b }); };
      view.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => set(b.dataset.a, b.dataset.b));
      $('#pl-from').onchange = () => { if ($('#pl-to').value < $('#pl-from').value) $('#pl-to').value = $('#pl-from').value; };
      $('#pl-next').onclick = () => set($('#pl-from').value, $('#pl-to').value);
    } else if (k === 'how') {
      view.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => done({ method: b.dataset.m }));
    } else if (k === 'access') {
      const a = new Set(d.access || []);
      view.querySelectorAll('[data-acc]').forEach((b) => b.onclick = () => {
        const id = b.dataset.acc; if (a.has(id)) a.delete(id); else a.add(id);
        b.classList.toggle('on', a.has(id)); b.setAttribute('aria-pressed', String(a.has(id)));
        d.access = [...a]; saveDraft(); $('#pl-next').disabled = !a.size;
      });
      $('#pl-next').onclick = () => done({ access: ACCESS.map(([id]) => id).filter((id) => a.has(id)) });
    } else if (k === 'overnight') {
      view.querySelectorAll('[data-on]').forEach((b) => b.onclick = () => done({ overnight: b.dataset.on === '1' }));
    } else if (k === 'party') {
      view.querySelectorAll('[data-party]').forEach((b) => b.onclick = () => done({ party: b.dataset.party }));
    } else if (k === 'first') {
      view.querySelectorAll('[data-fh]').forEach((b) => b.onclick = () => done({ firstHunt: b.dataset.fh === '1' }));
    }
  }
  // the next general season openings ahead for this animal in this MU (for the "Opening week" quick pick)
  async function openings(sp, mu, t) {
    const keys = (sp.seasonKeys || []).map((k) => k.toLowerCase()), mkeys = (sp.migratoryKeys || []).map((k) => k.toLowerCase());
    const rows = [];
    for (const f of regionFiles(mu)) { try { const R = await getJSON(`data/seasons/${f}.json`); rows.push(...(R.rows || []).filter((r) => keys.includes(String(r.species).toLowerCase()) && (r.mus || []).includes(mu) && tagOf(r.notes) !== 'youth only')); } catch (e) { /* not saved */ } }
    if (mkeys.length) try {
      const M = await getJSON('data/seasons/migratory.json');
      const dk = Object.keys(M.districts || {}).find((k) => (M.districts[k].mus || []).includes(mu));
      if (dk) rows.push(...(M.rows || []).filter((r) => r.district === dk && mkeys.includes(String(r.species).toLowerCase()) && (!r.mus || r.mus.includes(mu))));
    } catch (e) { /* not saved */ }
    const y = +t.slice(0, 4), out = [];
    for (const r of rows) {
      if (!r.open || r.allYear) continue;
      let from = `${y}-${r.open}`; if (from < t) from = `${y + 1}-${r.open}`;
      if (dRange(t, from).length > 300) continue;
      out.push({ from, label: `${md(r.open)}${r.class ? ', ' + r.class.toLowerCase() : ''}${tagOf(r.notes) ? ', ' + tagOf(r.notes) : ''}` });
    }
    const seen = new Set();
    return out.sort((a, b) => (a.from < b.from ? -1 : 1)).filter((o) => !seen.has(o.from) && seen.add(o.from)).slice(0, 3);
  }
  function finish(C, D) {
    const d = getDraft(), all = plansOf(C), sp = D.byId[d.species];
    const base = { species: d.species, speciesName: sp ? sp.name : '', where: d.where, from: d.from, to: d.to, method: d.method, access: d.access, overnight: !!d.overnight, party: d.party, firstHunt: d.firstHunt !== false, ask: Object.assign({}, d.ask) };
    let id = d.editId;
    const old = id && all.find((p) => p.id === id);
    if (old) { const moved = old.where.mu !== base.where.mu || old.species !== base.species; Object.assign(old, base, { updated: Date.now() }); if (moved) delete old.spots; }
    else { id = Date.now().toString(36); all.unshift(Object.assign({ id, created: Date.now(), ticks: {}, hideDone: false }, base)); }
    C.save(); draft = {}; saveDraft();
    location.hash = `#/plan/${id}`;
  }
  const noData = () => '<div class="card"><h2>Plan data not saved yet</h2><p>The planner needs its data file. Open the app once with signal, then try again.</p><a class="btn" href="#/">Home</a></div>';

  // ---------- plan list ----------
  async function listView(view, C) {
    C.setTitle('Plan a hunt');
    const all = plansOf(C);
    let D = null; try { D = await loadData(); } catch (e) { D = null; }
    if (!all.length) { goStep(0); return; }
    view.innerHTML = `<a class="btn next block pl-new" href="#/plan/new/0">Plan a new hunt</a>
      <h2 class="pl-h">My plans</h2><div class="card list">${all.map((p) => { const pr = D && planProgress(p, D);
        return `<a class="item" href="#/plan/${esc(p.id)}"><span class="grow"><b>${esc(planTitle(p, D))}</b><br><span class="muted">${esc(p.where.label)}. ${esc(rangeLabel(p.from, p.to))}</span></span>${pr ? `<span class="pill">${pr.done}/${pr.total}</span>` : ''}</a>`; }).join('')}</div>
      <p class="muted pl-small">Plans live on this phone only. Export a backup in More to keep them safe.</p>`;
  }

  // ---------- plan view ----------
  const memo = {}; // last results per plan, for Share
  async function planView(view, id, C) {
    const p = plansOf(C).find((x) => x.id === id);
    if (!p) { view.innerHTML = '<div class="card"><h2>Plan not found</h2><p>It may have been deleted, or it was saved on another phone.</p><a class="btn" href="#/plan">My plans</a></div>'; return; }
    let D; try { D = await loadData(); } catch (e) { D = null; }
    if (!D || !D.species.length) { view.innerHTML = noData(); return; }
    const sp = D.byId[p.species];
    if (!sp) { view.innerHTML = `<div class="card"><h2>${esc(p.speciesName || 'This animal')} is not in the planner data any more</h2><a class="btn" href="#/plan">My plans</a></div>`; return; }
    C.setTitle(planTitle(p, D));
    const token = (view._plToken = {});
    const alive = () => view._plToken === token && view.isConnected;
    const days = dRange(p.from, p.to);
    const H = hoursFor(sp);
    let hero = '';
    if (p.from) {
      const n = Math.round((Date.parse(p.from + 'T00:00:00Z') - Date.parse(todayIso() + 'T00:00:00Z')) / 864e5), end = p.to || p.from;
      let act = '';
      try { if (C.study) { const T = C.study.today(p, sp.lessons); if (T.leftToday && T.st.next) act = `<a class="btn next block pl-hero-go no-print" href="#/s/${esc(T.st.next.id)}/${T.st.next.i}">Study today: ${T.leftToday} screen${T.leftToday === 1 ? '' : 's'}</a>`; } } catch (e) { act = ''; }
      hero = `<div class="hero pl-hero"><div><p class="hero-k">${n > 0 ? 'Hunt starts in' : end >= todayIso() ? 'Hunt is on' : 'Hunt done'}</p><div class="hero-n">${n > 0 ? `${n}<small>day${n === 1 ? '' : 's'} to go</small>` : end >= todayIso() ? 'Now' : 'Done'}</div>
        <div class="hero-sub">${esc(rangeLabel(p.from, end))}</div></div></div>${act}`;
    }
    view.innerHTML = `<div class="pl" id="pl">
      ${hero}<p class="pl-law">Study aid only. The official regulations are the law.</p>
      <div class="card pl-sum"><h2>${esc(spName(sp, p.where.mu))}</h2>
        <div class="pl-kv"><span>Where</span><b>${esc(p.where.label)}${p.where.mu ? `, MU (Management Unit) ${esc(p.where.mu)}` : ''}</b></div>
        <div class="pl-kv"><span>When</span><b>${esc(rangeLabel(p.from, p.to))} (${days.length} day${days.length === 1 ? '' : 's'})</b></div>
        <div class="pl-kv"><span>How</span><b>${esc(((sp.methods || []).find((m) => m.id === p.method) || {}).label || METHOD_LABEL[p.method] || p.method || '')}</b></div>
        <div class="pl-kv"><span>Access</span><b>${esc(accessLabel(p.access))}</b></div>
        <div class="pl-kv"><span>Overnight</span><b>${p.overnight ? 'Yes' : 'No'}</b></div>
        <div class="pl-kv"><span>Party</span><b>${esc(partyLabel(p.party))}</b></div>
        <div class="pl-kv"><span>First hunt</span><b>${p.firstHunt !== false ? 'Yes' : 'No'}</b></div>
        ${askHtml(p, sp)}
        <div class="pl-acts no-print"><button type="button" class="btn" id="pl-share">Share</button><button type="button" class="btn" id="pl-print">Print</button><button type="button" class="btn" id="pl-edit">Change</button><button type="button" class="btn" id="pl-del">Delete</button></div>
      </div>
      ${p.where && p.where.id === 'harrison' && C.hasSession(HARRISON_LESSON) ? `<div class="card pl-harrison no-print"><h3>Read first</h3><p class="pl-small">The rules, roads and tactics for this hunt on one page.</p><a class="btn block" href="#/s/${HARRISON_LESSON}">${esc(C.lessonTitle(HARRISON_LESSON))}</a></div>` : ''}
      <div class="card pl-offline no-print" id="pl-offline"><h3>Offline for no signal</h3><p class="muted">Loading...</p></div>
      <nav class="pl-nav pl2-nav no-print" aria-label="Plan sections"><button type="button" data-go="pl-s0">Ready</button><button type="button" data-go="pl-s1">1 Legal</button><button type="button" data-go="pl-s2">2 Odds</button><button type="button" data-go="pl-sb">Spots</button><button type="button" data-go="pl-sl">Live</button><button type="button" data-go="pl-s3">3 Days</button><button type="button" data-go="pl-s4">4 Checklist</button><button type="button" data-go="pl-s5">5 Study</button><button type="button" data-go="pl-sd">After</button></nav>
      <section class="pl-sec" id="pl-s0"><h2 class="pl-sh">Ready to go?</h2><div id="pl-ready"><p class="muted">Checking your readiness gates...</p></div></section>
      <section class="pl-sec" id="pl-s1"><h2 class="pl-sh">1. Legal and open</h2><div id="pl-legal"><p class="muted">Checking the season tables...</p></div></section>
      <section class="pl-sec" id="pl-s2"><h2 class="pl-sh">2. Odds</h2><div id="pl-odds"><p class="muted">Loading harvest numbers...</p></div></section>
      <section class="pl-sec" id="pl-sb"><h2 class="pl-sh">Top spots board</h2><div id="pl-board"><p class="muted">Finding and checking spots...</p></div></section>
      <section class="pl-sec" id="pl-sl"><h2 class="pl-sh">Live and day by day</h2><div id="pl-live"><p class="muted">Waiting for the top spots...</p></div></section>
      <section class="pl-sec" id="pl-s3"><h2 class="pl-sh">3. Day by day</h2><div id="pl-days"><p class="muted">Building your days...</p></div></section>
      <section class="pl-sec" id="pl-s4"><h2 class="pl-sh">4. Checklist</h2><div id="pl-check"></div></section>
      <section class="pl-sec" id="pl-s5"><h2 class="pl-sh">5. Study before you go</h2><div id="pl-study"></div></section>
      <section class="pl-sec" id="pl-sd"><h2 class="pl-sh">After the hunt</h2><div id="pl-debrief"></div></section>
    </div>`;
    css2();
    const $ = (s) => view.querySelector(s);
    const m = (memo[p.id] = { p, sp });
    const link = (el) => { if (C.link && el) C.link(el); }; // MUs, regions and place names: tap for a mini map (places.js)
    if (C.study) drawStudy(view.querySelector('#pl-study'), p, sp, C);
    link($('.pl-sum'));

    // actions
    $('#pl-print').onclick = () => window.print();
    $('#pl-edit').onclick = () => { draft = { species: p.species, where: p.where, from: p.from, to: p.to, method: p.method, access: p.access, overnight: p.overnight, party: p.party, firstHunt: p.firstHunt !== false, ask: Object.assign({}, p.ask), editId: p.id }; saveDraft(); goStep(0); };
    $('#pl-del').onclick = () => { if (!confirm('Delete this plan? Its ticks go too.')) return; const all = plansOf(C); all.splice(all.indexOf(p), 1); C.save(); location.hash = '#/plan'; };
    $('#pl-share').onclick = () => {
      const text = shareText(m, D, C);
      if (navigator.share) navigator.share({ title: `Hunt plan: ${planTitle(p, D)}`, text }).catch((e) => { if (e && e.name !== 'AbortError') copy(text, C); });
      else copy(text, C);
    };
    // mini nav
    const nav = $('.pl-nav');
    nav.querySelectorAll('button').forEach((b) => b.onclick = () => {
      const el = view.querySelector('#' + b.dataset.go);
      const off = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 56) + nav.offsetHeight + 6;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' });
    });
    const secs = [...nav.querySelectorAll('button')].map((b) => view.querySelector('#' + b.dataset.go));
    const onScroll = () => {
      if (!alive()) { window.removeEventListener('scroll', onScroll); return; }
      const off = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 56) + nav.offsetHeight + 40;
      let cur = 0; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < off) cur = i; });
      nav.querySelectorAll('button').forEach((b, i) => { if (i === cur && !b.classList.contains('on') && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: Math.max(0, b.offsetLeft - 40) }); b.classList.toggle('on', i === cur); });
    };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    // 4. checklist (needs nothing async)
    const drawCheck = () => {
      const items = checkItems(sp, D.lists, condOf(p));
      const t = (i) => !!(p.ticks && p.ticks[i.key]);
      const n = items.filter(t).length;
      m.check = { done: n, total: items.length, left: items.filter((i) => !t(i)) };
      $('#pl-check').innerHTML = `<div class="card"><div class="row"><b class="grow">${n} of ${items.length} done</b>
        <label class="pl-hide"><input type="checkbox" id="pl-hide"${p.hideDone ? ' checked' : ''}> Hide done</label></div>${'<div class="bar"><i style="width:' + Math.round((n / Math.max(1, items.length)) * 100) + '%"></i></div>'}
        <p class="muted pl-small">Your animal's list plus the lists that match your plan: ${esc(D.lists.filter((l) => listMatches(l.when, condOf(p))).map((l) => l.title || l.id).join(', ') || 'none')}. Ticks save on this phone.</p>
        <div class="pl-list${p.hideDone ? ' pl-hide-done' : ''}">${checklistHtml(items, t, C, 'data-pk', closedCats(view))}</div>
        ${n === items.length && items.length ? '<p class="pl-alldone">All done. Good hunting.</p>' : ''}
        <div class="btn-row no-print"><button type="button" class="btn" id="pl-untick">Untick all</button></div></div>`;
      $('#pl-hide').onchange = (e) => { p.hideDone = e.target.checked; C.save(); $('#pl-check .pl-list').classList.toggle('pl-hide-done', p.hideDone); };
      $('#pl-untick').onclick = () => { if (!n || confirm('Untick every item in this plan?')) { p.ticks = {}; C.save(); drawCheck(); } };
    };
    $('#pl-check').addEventListener('change', (e) => {
      const c = e.target.closest('input[data-pk]'); if (!c) return;
      p.ticks = p.ticks || {}; if (c.checked) p.ticks[c.dataset.pk] = 1; else delete p.ticks[c.dataset.pk];
      C.save();
      const y = window.scrollY; drawCheck(); window.scrollTo(0, y);
    });
    drawCheck();

    // 1. legal
    let lg;
    try { lg = await legal(p, sp); } catch (e) { lg = { verdict: 'check', why: 'Could not read the season tables.', rows: [], mig: [], bag: [], flags: [], dayOpen: {}, days }; }
    if (!alive()) return;
    m.legal = lg;
    $('#pl-legal').innerHTML = legalHtml(lg, sp, p, C, H);
    link($('#pl-legal'));

    // 2. odds
    let od; try { od = await odds(p, sp, lg); } catch (e) { od = { missing: true }; }
    if (!alive()) return;
    m.odds = od;
    od.shared = D.species.filter((x) => x.id !== sp.id && x.harvestKey && sp.harvestKey && x.harvestKey === sp.harvestKey).map((x) => x.name);
    $('#pl-odds').innerHTML = successHtml(od, sp, p, lg, C) + oddsHtml(od, sp, p, lg, C);
    link($('#pl-odds'));

    // 3. days (spots fill in after)
    $('#pl-days').innerHTML = daysHtml(sp, p, lg, C, H) + '<div id="pl-spots"><div class="card"><h3>Top spots</h3><p class="muted">Finding candidate spots near the MU...</p></div></div>';
    let st = null;
    try { st = await spots(p, sp); } catch (e) { console.warn('plan spots', e); st = null; }
    if (!alive()) return;
    if (st && st.list.length) { p.spots = { at: todayIso(), list: st.list.slice(0, 7), camps: st.camps }; C.save(); }
    else if ((!st || !st.list.length) && p.spots && p.spots.list.length) st = Object.assign({ saved: p.spots.at }, p.spots);
    m.spots = st;
    $('#pl-spots').innerHTML = spotsHtml(st, sp, p, C);
    link($('#pl-days'));
    wireRundowns($('#pl-spots'), st, p, C);
    mountOffline($('#pl-offline'), p, sp, C);

    // Top spots board (part 5), then the add ons that other parts build: odds, live and day by day (each optional)
    const X = extCtx(p, sp, lg, od, st, C, H, days);
    m.x = X;
    const board = () => { if (alive()) drawBoard($('#pl-board'), st, p, sp, C, m, X); };
    board();
    drawReady($('#pl-ready'), p, sp, C, m);
    drawDebrief($('#pl-debrief'), p, sp, st, C, () => drawReady($('#pl-ready'), p, sp, C, m));
    // window.HMPlanOdds (addons/plan-odds.js): compute(ctx) then html(result, ctx). Fallback: the official odds above.
    const O = window.HMPlanOdds;
    if (O && typeof O.compute === 'function' && typeof O.html === 'function') {
      try {
        const r = await O.compute(X); if (!alive()) return;
        m.oddsX = r; X.oddsResult = r;
        const out = addOn(O.html(r, X));
        $('#pl-odds').innerHTML = `<div class="pl2-x" id="pl-odds-x">${out.html}</div><details class="card pl-more"><summary>Official numbers, the 90% question and how to raise your odds</summary>${successHtml(od, sp, p, lg, C)}${oddsHtml(od, sp, p, lg, C)}</details>`;
        out.wire($('#pl-odds-x')); link($('#pl-odds'));
        board();
      } catch (e) { console.warn('plan odds add on', e); }
    }
    // window.HMPlanLive (addons/plan-live.js): fetch(ctx) then html(result, ctx); window.HMPlanDays (addons/plan-days.js): build(ctx) then html(result, ctx)
    await drawLive($('#pl-live'), X, m, alive, board, C);
  }
  // what the add ons get: the plan, its answers, the legal and official odds results, the top spots and the app helpers
  function extCtx(p, sp, lg, od, st, C, H, days) {
    return { plan: p, ask: p.ask || {}, species: sp, speciesName: spName(sp, p.where.mu), mu: p.where.mu, days, from: p.from, to: p.to,
      legal: lg, official: od, spots: boardList(st, p), camps: (st && st.camps) || [], hours: H, home: Object.assign({ name: 'Mission' }, homePt()),
      party: partyN(p.party), tags: tagsN(p), getJSON, sunEvent: C.sunEvent, hhmm: C.hhmm, addMin: C.addMin, certBadge: C.certBadge,
      hasSession: C.hasSession, lessonTitle: C.lessonTitle, toast: C.toast, esc, todayIso };
  }
  // an add on's html() may give a string or { html, wire(el) }
  function addOn(v) { if (v && typeof v === 'object' && typeof v.html === 'string') return { html: v.html, wire: typeof v.wire === 'function' ? (el) => { try { v.wire(el); } catch (e) { console.warn(e); } } : () => {} }; return { html: String(v == null ? '' : v), wire: () => {} }; }
  async function drawLive(el, X, m, alive, board, C) {
    if (!el) return;
    const L = window.HMPlanLive, Dd = window.HMPlanDays;
    const parts = [];
    let liveOk = false, daysOk = false;
    el.innerHTML = `<div id="pl-live-x">${L ? '<div class="card"><p class="muted">Getting the forecast for your top spots...</p></div>' : ''}</div><div id="pl-days-x"></div>`;
    if (L && typeof L.fetch === 'function' && typeof L.html === 'function') {
      try {
        const r = await L.fetch(X); if (!alive()) return;
        m.live = r; X.live = r;
        const out = addOn(L.html(r, X)); const box = el.querySelector('#pl-live-x'); box.innerHTML = out.html; out.wire(box); liveOk = true;
        board();
      } catch (e) { console.warn('plan live add on', e); }
    }
    if (!liveOk) el.querySelector('#pl-live-x').innerHTML = liveFallback(X);
    if (Dd && typeof Dd.build === 'function' && typeof Dd.html === 'function') {
      try {
        const r = await Dd.build(X); if (!alive()) return;
        m.daysX = r;
        const out = addOn(Dd.html(r, X)); const box = el.querySelector('#pl-days-x'); box.innerHTML = out.html; out.wire(box); daysOk = true;
      } catch (e) { console.warn('plan days add on', e); }
    }
    if (!daysOk) el.querySelector('#pl-days-x').innerHTML = '<div class="card"><h3>Hour by hour</h3><p class="pl-small">The day by day plan with your hours is in part 3 below: legal light, your time on stand, and what to do in each part of the day.</p><button type="button" class="btn" data-pl-jump="pl-s3">Go to part 3, Day by day</button></div>';
    el.querySelectorAll('[data-pl-jump]').forEach((b) => { b.onclick = () => { const t = document.getElementById(b.dataset.plJump); if (t) t.scrollIntoView({ behavior: 'smooth' }); }; });
    parts.push(liveOk, daysOk);
    if (C.link) C.link(el);
    return parts;
  }
  function liveFallback(X) {
    const ROADS = 'https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/local-road-safety-information/chilliwack-natural-resource-district-district-road-safety-information';
    const r2 = /^2-/.test(X.mu || '');
    return `<div class="card"><h3>Live conditions</h3><p class="pl-small">The live forecast for your spots is not in this version of the app yet. Check these before you leave, and again the night before.</p>
      <ul><li><b>Wind:</b> pick the spot you can walk into with the wind in your face, or across it. Never with the wind at your back toward where the deer are (Tip).</li>
      <li><b>Forecast:</b> <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (hourly wind, gusts, rain, freezing level).</li>
      <li><b>Fire bans:</b> <a href="https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions" target="_blank" rel="noopener">BC Wildfire Service fire bans and restrictions</a>.</li>
      ${r2 ? `<li><b>Road notices:</b> <a href="${ROADS}" target="_blank" rel="noopener">Chilliwack Natural Resource District road safety information</a> (Forest Service Roads near Harrison).</li>` : ''}
      <li><b>Highways:</b> <a href="https://www.drivebc.ca/" target="_blank" rel="noopener">DriveBC</a>.</li>
      <li><b>Legal light:</b> each day's times are in part 3 below, worked out on your phone.</li></ul></div>`;
  }

  // "Save this hunt area for no signal" (map/plan-offline.js, through map/offline.js): the plan point, its spots and nearest camp
  function offlineFiles(p, sp, C) {
    const HM = window.HM || {}, lf = HM.lessonFiles || {};
    const ids = [...new Set([...(C.study ? C.study.today(p, sp.lessons).path.all : sp.lessons || []), ...(p.where && p.where.id === 'harrison' ? [HARRISON_LESSON] : [])])].filter((id) => lf[id]);
    const data = [...regionFiles(p.where.mu).map((f) => `data/seasons/${f}.json`), 'data/harvest/bc-harvest.json', ...(HM.plansInline ? [] : HM.planFiles && HM.planFiles.length ? HM.planFiles : DEFAULT_FILES)];
    return [{ label: 'Lessons for this hunt', urls: ids.map((id) => lf[id]) }, { label: 'Plan data (seasons, odds, checklists)', urls: data }];
  }
  function mountOffline(el, p, sp, C) {
    if (!el) return;
    import('./map/plan-offline.js').then((m) => { if (el.isConnected) m.mount(el, { plan: p, files: offlineFiles(p, sp, C), toast: C.toast }); })
      .catch(() => { if (el.isConnected) el.innerHTML = '<h3>Offline for no signal</h3><p class="muted">This part did not load. Open the app once with signal.</p>'; });
  }
  // Home study card: a short status, and the full card (size estimate first) on tap
  let homeC = null;
  function offlineHomeHtml(p) {
    let rec = null;
    try { rec = ((JSON.parse(localStorage.getItem('hm.map.v1') || '{}') || {}).offline || []).find((x) => x.planId === p.id) || null; } catch (e) { rec = null; }
    if (p.where.lat == null) return '';
    return `<div class="pl-offline-home no-print" data-plo-plan="${esc(p.id)}">${rec && !rec.partial ? `<p class="pl-small">Saved for no signal on ${esc(rec.updated || rec.created)}.</p><button type="button" class="btn" data-plo-home="1">Check again</button>`
      : `<button type="button" class="btn block" data-plo-home="1">${rec ? 'Finish saving this hunt area for no signal' : 'Save this hunt area for no signal'}</button>`}</div>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-plo-home]'); if (!b || !homeC || !Dc) return;
    const el = b.closest('[data-plo-plan]'), p = plansOf(homeC).find((x) => x.id === el.dataset.ploPlan), sp = p && Dc.byId[p.species];
    if (!p || !sp) return;
    el.classList.add('pl-offline'); el.innerHTML = '<h3>Offline for no signal</h3><p class="muted">Loading...</p>';
    mountOffline(el, p, sp, homeC);
  });

  // Full rundown per spot: the shared renderer (map/spot-rundown.js), loaded and worked out only when opened
  function wireRundowns(root, st, p, C) {
    if (!root || !st || !st.list) return;
    root.querySelectorAll('details.pl-rd').forEach((el) => el.addEventListener('toggle', async () => {
      if (!el.open || el.dataset.done) return;
      el.dataset.done = '1';
      const x = st.list[+el.dataset.rd], box = el.querySelector('.pl-rd-in');
      try {
        const rd = await import('./map/spot-rundown.js');
        const r = await rd.rundown({ id: x.id, name: x.name, lng: x.lon, lat: x.lat, mu: x.mu },
          { plan: { species: p.species, from: p.from, to: p.to, mu: p.where.mu }, getJSON, hasSession: C.hasSession });
        box.innerHTML = r.html; r.wire(box);
      } catch (e) {
        delete el.dataset.done;
        box.innerHTML = `<p class="muted">The rundown did not load. ${navigator.onLine ? 'Close it and try again.' : 'Open the Map once with signal to save this area.'}</p>`;
      }
    }));
  }

  function verdictHtml(lg) {
    const V = { open: ['Open', 'pl-v-open'], no: ['Not open', 'pl-v-no'], check: ['Check', 'pl-v-check'] }[lg.verdict] || ['Check', 'pl-v-check'];
    return `<div class="pl-verdict ${V[1]}" role="status"><b>${V[0]}</b><span>${esc(lg.why || '')}</span></div>`;
  }
  function legalHtml(lg, sp, p, C, H) {
    const yr = (r, ds) => (r.allYear ? 'Open all year' : `${md(r.open)} to ${md(r.close)}`) + (ds && ds.length ? `. <b>Open on ${ds.length} of your days</b>` : '. <span class="muted">Not in your dates</span>');
    const rowLi = (x) => `<li class="${x.days.length && x.ok ? 'pl-hit' : ''}"><div><b>${esc(cap(x.r.class || x.r.species))}</b>${x.tag ? ` <span class="pill">${esc(cap(x.tag))}</span>` : ''}</div>
      <div>${yr(x.r, x.days)}</div>${x.r.notes && x.r.notes !== x.r.class ? `<div class="muted pl-small">Notes: ${esc(x.r.notes)}</div>` : ''}
      ${x.tag === 'youth only' && x.days.length ? '<div class="muted pl-small">Youth only: hunters under 18. Not counted as open for you.</div>' : ''}
      ${x.tag === 'bow only' && x.days.length && !x.ok ? '<div class="muted pl-small">Bow only: not open with your method.</div>' : ''}
      <div class="muted pl-small">Synopsis page ${esc(x.r.page != null ? x.r.page : 'VERIFY')} ${C.certBadge(x.r.cert)}</div></li>`;
    const migLi = (x) => `<li class="${x.days.length ? 'pl-hit' : ''}"><div><b>${esc(cap(x.r.species))}</b>, district ${esc(x.r.district)}</div><div>${yr(x.r, x.days)}</div>
      <div class="muted pl-small">${esc(x.r.daily)} a day, ${esc(x.r.possession)} in possession. ${esc(x.r.item || '')} ${C.certBadge(x.r.cert)}</div></li>`;
    const inDates = lg.rows.filter((x) => x.days.length), other = lg.rows.filter((x) => !x.days.length);
    const migIn = lg.mig.filter((x) => x.days.length), migOther = lg.mig.filter((x) => !x.days.length);
    const flags = [...lg.flags.map((f) => ({ bad: f.bad, t: f.t + (f.page ? ` Synopsis page ${f.page}.` : f.src ? ` ${f.src}.` : ''), cert: f.cert })), ...(sp.redFlags || []).map((t) => ({ t, watch: true }))];
    const rb = (id) => /^rb-|^legal-to-shoot$|^tagging-legal$|^licences$/.test(id);
    const lessons = [lg.session, ...(isMigratoryOnly(sp) || (sp.migratoryKeys || []).length ? ['rb-migratory-birds'] : []), 'rb-bag-limits', 'rb-licences-fees', 'legal-to-shoot', 'rb-legal-methods', ...(sp.lessons || []).filter(rb)];
    const more = lessonLinks((sp.lessons || []).filter((id) => !rb(id)), C);
    const hrs = H.h;
    return `${verdictHtml(lg)}
      ${inDates.length || migIn.length ? `<div class="card"><h3>Seasons in your dates</h3><ul class="pl-rows">${inDates.map(rowLi).join('')}${migIn.map(migLi).join('')}</ul></div>` : ''}
      ${other.length || migOther.length ? `<details class="card pl-more"><summary>Other seasons for ${esc(sp.name.toLowerCase())} in MU ${esc(p.where.mu)} (${other.length + migOther.length})</summary><ul class="pl-rows">${other.map(rowLi).join('')}${migOther.map(migLi).join('')}</ul></details>` : ''}
      ${lg.bag.length ? `<div class="card"><h3>Bag limits</h3><ul>${lg.bag.map((b) => `<li>${esc(b.t)} <span class="muted pl-small">${b.page ? `Synopsis page ${esc(b.page)}` : esc(b.src || '')}</span> ${C.certBadge(b.cert)}</li>`).join('')}</ul></div>` : ''}
      ${flags.length ? `<div class="card pl-flags"><h3>Red flags and watch outs</h3><ul>${flags.map((f) => `<li class="${f.bad ? 'pl-bad' : ''}">${f.bad ? '<b>Stop:</b> ' : ''}${esc(f.t)}${f.cert != null ? ' ' + C.certBadge(f.cert) : ''}</li>`).join('')}</ul></div>` : ''}
      ${(sp.licence || []).length ? `<div class="card"><h3>Licences and paperwork</h3><ul>${sp.licence.map((l) => `<li>${esc(l.t)} ${l.cert != null ? C.certBadge(l.cert) : ''}${l.lesson && C.hasSession(l.lesson) ? ` <a href="#/s/${esc(l.lesson)}">Lesson</a>` : ''}</li>`).join('')}</ul></div>` : ''}
      <div class="card"><h3>Legal shooting hours</h3><p>${hrs ? esc(hrs.text) + ' ' + C.certBadge(hrs.certainty) : '<span class="verify">VERIFY</span>'}</p><p class="muted pl-small">Each day's times are in the day by day plan.</p></div>
      <div class="card"><h3>Rule Book lessons</h3><div class="pl-chips">${lessonLinks(lessons, C) || '<span class="muted">None in the app yet.</span>'}</div>
      ${more ? `<details class="pl-more"><summary>More lessons on ${esc(sp.name.toLowerCase())}</summary><div class="pl-chips">${more}</div></details>` : ''}
      <p class="muted pl-small">${lg.src ? `Seasons: ${esc(lg.src)}, checked ${esc(lg.checked || '')}. ` : ''}${lg.migSrc ? `Ducks and geese: ${esc(lg.migSrc)}. ` : ''}General open seasons only. LEH (Limited Entry Hunting) draws, closed areas, no shooting areas and in season changes are not all shown. Check the official synopsis before you go.</p></div>`;
  }

  function oddsHtml(od, sp, p, lg, C) {
    const raise = (sp.raiseOdds || []).length ? `<div class="card"><h3>Raise your odds</h3><p class="muted pl-small">Tip (opinion), from the lessons.</p><ul>${sp.raiseOdds.map((r) => `<li><b>${esc(r.t)}</b>${r.why ? `<br><span class="muted pl-small">${esc(r.why)}</span>` : ''} ${r.cert != null ? C.certBadge(r.cert) : ''}</li>`).join('')}</ul></div>` : '';
    if (od.none) return `<div class="card"><h3>Is 90% realistic here?</h3><p><b>Nobody can honestly say.</b></p><ul><li>BC publishes success numbers for big game only.</li><li>There is no official success rate for ${esc(sp.name.toLowerCase())}.</li><li>Any % you see for birds or small game is a guess.</li><li>What you control: time in good habitat at the right time of day, and shooting skill.</li></ul></div>${raise}`;
    if (od.missing) return `<div class="card"><p class="muted">Harvest numbers are not saved on this phone yet. Open the app once with signal.</p></div>${raise}`;
    if (od.thin) return `<div class="card"><h3>Is 90% realistic here?</h3><p>Too few hunters reported here (under 20 a year) for a reliable %. No honest answer from the numbers.</p></div>${raise}`;
    const huntDays = (lg.days || []).filter((d, i) => (lg.dayOpen[d] || []).length && i >= scoutCount(lg.days.length)).length;
    const n = tagsN(p);
    const rough = (k) => 1 - Math.pow(1 - od.perDay, k);
    const you = rough(huntDays), party = rough(huntDays * n);
    const need = od.perDay > 0 && od.perDay < 1 ? Math.ceil(Math.log(0.1) / Math.log(1 - od.perDay)) : null;
    const pct = (x) => `${Math.round(x)}%`, r5 = (x) => `about ${Math.min(95, Math.max(1, Math.round((x * 100) / 5) * 5 || 1))}%`;
    const where = od.scope === 'mu' ? `MU ${esc(p.where.mu)}` : `Region ${esc(od.region)} (MU ${esc(p.where.mu)} has too few reports)`;
    let answer;
    if (od.pct >= 90) answer = `<p><b>Maybe, but never promised.</b> Hunters here have done very well on average.</p>`;
    else answer = `<p><b>No. 90% is not realistic here${huntDays ? ` in ${huntDays} hunt day${huntDays === 1 ? '' : 's'}` : ''}.</b></p>
      <ul><li>On average, ${pct(od.pct)} of resident hunters got one over the whole season (2020 to 2024).</li>
      <li>So most hunters went home without one, even with ${od.dph.toFixed(1)} days each.</li>
      ${huntDays ? `<li>Rough math (Tip): at the average rate, your ${huntDays} hunt day${huntDays === 1 ? '' : 's'} give ${r5(you)}${n > 1 ? `, and ${r5(party)} that one of the ${n} tags in your party is filled` : ''}.</li>` : '<li>Your dates have no open hunt days, so the chance is 0 on these dates.</li>'}
      ${need ? `<li>Rough math (Tip): a 9 in 10 chance would take about ${need} hunter days at the average rate.</li>` : ''}
      <li>You beat the average with scouting, time in the field and patience. See below.</li></ul>`;
    const years = od.rows.map((r) => `<tr class="${r.lowConfidence ? 'pl-low' : ''}"><td>${r.year}</td><td>${r.hunters != null ? r.hunters : 'n/a'}</td><td>${r.kills != null ? r.kills : 'n/a'}</td><td>${r.successPct != null && !r.lowConfidence ? r.successPct.toFixed(0) + '%' : r.lowConfidence ? 'Few hunters' : 'n/a'}</td><td>${r.days != null ? r.days : 'n/a'}</td></tr>`).join('');
    return `<div class="card pl-odds"><h3>Official success: ${where}</h3>
        ${od.shared && od.shared.length ? `<p class="pl-law">These numbers combine ${esc(sp.name.toLowerCase())} with ${esc(od.shared.join(' and ').toLowerCase())}. BC reports them together as ${esc(sp.harvestKey)}.</p>` : ''}
        <div class="pl-big">${pct(od.pct)}</div><p class="muted">of resident hunters got one (2020 to 2024 average, ${od.years} years)</p>
        <div class="pl-kv"><span>Days per hunter</span><b>${od.dph.toFixed(1)}</b></div>
        <div class="pl-kv"><span>Hunter days per kill</span><b>${od.dpk ? Math.round(od.dpk) : 'n/a'}</b></div>
        <div class="tbl"><table><thead><tr><th>Year</th><th>Hunters</th><th>Kills</th><th>Success</th><th>Days</th></tr></thead><tbody>${years}</tbody></table></div>
        ${od.rows.some((r) => r.lowConfidence) ? '<p class="muted pl-small">Few hunters: fewer than 20 reported, so that year is not reliable and is left out of the average.</p>' : ''}
        <p class="muted pl-small">Source: <a href="${esc(od.url)}" target="_blank" rel="noopener">${esc(od.src)}</a>, checked ${esc(od.checked || '')}. Hunter Sample survey estimates, general season and LEH (Limited Entry Hunting) together, males and females together. ${C.certBadge(90)}</p></div>
      <div class="card"><h3>Is 90% realistic here?</h3>${answer}</div>${raise}`;
  }

  const scoutCount = (n) => (n >= 6 ? 2 : n >= 3 ? 1 : 0);
  function daysHtml(sp, p, lg, C, H) {
    const days = lg.days || dRange(p.from, p.to), dp = sp.dayPlan || {}, nS = scoutCount(days.length);
    const pt = p.where.lat != null ? p.where : null, hrs = H.h;
    const BL = [['dawn', 'Dawn'], ['morning', 'Morning'], ['midday', 'Midday'], ['evening', 'Evening'], ['dusk', 'Dusk']];
    let firstHunt = true;
    const cards = days.map((d, i) => {
      const [y, mo, dd] = d.split('-').map(Number), month = mo;
      const phase = (sp.phases || []).find((ph) => (ph.months || []).includes(month));
      const open = (lg.dayOpen[d] || []).length > 0, scout = i < nS;
      let rise = null, set = null;
      if (pt && C.sunEvent) { const day = new Date(y, mo - 1, dd, 12); rise = C.sunEvent(day, pt.lat, pt.lon, true); set = C.sunEvent(day, pt.lat, pt.lon, false); }
      const light = hrs && hrs.beforeSunriseMin != null && rise ? `${C.hhmm(C.addMin(rise, -hrs.beforeSunriseMin))} to ${C.hhmm(C.addMin(set, hrs.afterSunsetMin))}` : '<span class="verify">VERIFY</span>';
      const kind = scout ? 'Scout day' : open ? 'Hunt day' : 'Not open';
      const tl = !scout && open && hrs && hrs.beforeSunriseMin != null && rise ? timeline(C.addMin(rise, -hrs.beforeSunriseMin), C.addMin(set, hrs.afterSunsetMin), (p.ask || {}).hours, C) : '';
      const phaseWhen = (b) => ((phase && phase.when) || []).filter((w) => new RegExp('^' + b + '\\s*:', 'i').test(w)).map((w) => w.replace(/^\w+\s*:\s*/, ''));
      let body;
      if (scout) body = `<ul>${(dp.scout || []).map((t) => `<li>${esc(t)}</li>`).join('')}<li>Glass your top spots at first and last light. Find sign, trails and the wind.</li>${open ? '<li>It is open today: if a legal animal shows and the shot is right, you may take it.</li>' : ''}</ul>`;
      else if (!open) body = `<p><b>No open season for you on this day.</b> Scout, practise or rest. No hunting.</p>`;
      else body = BL.map(([b, label]) => { const ls = [...(dp[b] || []), ...phaseWhen(b)]; return ls.length ? `<div class="pl-blk"><b>${label}</b><ul>${ls.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''; }).join('')
        + (p.overnight && (dp.night || []).length ? `<div class="pl-blk"><b>Night</b><ul>${dp.night.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '');
      const openAttr = (!scout && open && firstHunt) || i === 0 ? ' open' : '';
      if (!scout && open) firstHunt = false;
      return `<details class="card pl-day ${scout ? 'pl-scout' : open ? 'pl-open' : 'pl-closed'}"${openAttr}><summary><span class="pl-dn">Day ${i + 1}</span><span class="grow"><b>${esc(dLabel(d))}</b>: ${kind}<br><span class="muted pl-small">Legal light ${light}</span></span></summary>
        <div class="pl-kv"><span>Sunrise</span><b>${rise ? C.hhmm(rise) : 'n/a'}</b></div><div class="pl-kv"><span>Sunset</span><b>${set ? C.hhmm(set) : 'n/a'}</b></div>
        ${open ? `<div class="pl-kv"><span>Open for</span><b>${esc(lg.dayOpen[d].join(', '))}</b></div>` : ''}${tl}${body}</details>`;
    }).join('');
    const phases = [...new Set(days.map((d) => +d.slice(5, 7)))].map((mo) => (sp.phases || []).find((ph) => (ph.months || []).includes(mo))).filter(Boolean);
    const uniq = [...new Set(phases)];
    const tactics = (sp.tactics || []);
    return `<p class="muted pl-small">Sun times worked out on your phone for ${esc(p.where.label)}${p.where.src === 'typed' ? ' (centre of the MU, approximate)' : ''}, Pacific time. Can be a few minutes off in valleys. ${hrs ? `Legal light: ${esc(H.label.toLowerCase())} rule. ${C.certBadge(hrs.certainty)}` : ''} Times of day plans are Tip (opinion).</p>
      ${nS === 0 ? `<div class="card pl-scout"><h3>Scout before you go</h3><ul>${(sp.dayPlan && sp.dayPlan.scout || []).map((t) => `<li>${esc(t)}</li>`).join('') || '<li>One trip before the hunt to learn the ground.</li>'}</ul><p class="muted pl-small">Your dates are short, so there is no scout day inside them (Tip).</p></div>` : ''}
      ${uniq.map((ph) => `<div class="card"><h3>${esc(ph.label)}: what the animals do</h3>${(ph.where || []).length ? `<p><b>Where</b></p><ul>${ph.where.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${(ph.tactics || []).length ? `<p><b>Tactics</b> (Tip)</p><ul>${ph.tactics.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${ph.cert != null ? `<p class="muted pl-small">${C.certBadge(ph.cert)}</p>` : ''}</div>`).join('')}
      ${cards}
      ${tactics.length ? `<details class="card pl-more"><summary>Tactics: options, pros and cons (Tip)</summary>${tactics.map((t) => `<div class="pl-tac"><h3>${esc(t.name)}</h3>${t.best ? `<p class="muted">Best: ${esc(t.best)}</p>` : ''}${(t.steps || []).length ? `<ol>${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}<div class="pl-pc">${(t.pros || []).length ? `<div><b>Pros</b><ul>${t.pros.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}${(t.cons || []).length ? `<div><b>Cons</b><ul>${t.cons.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}</div></div>`).join('')}</details>` : ''}
      ${sp.shot ? `<div class="card"><h3>The shot</h3><ul>${sp.shot.range ? `<li><b>Range:</b> ${esc(sp.shot.range)}</li>` : ''}${sp.shot.aim ? `<li><b>Aim:</b> ${esc(sp.shot.aim)}</li>` : ''}${p.ask && p.ask.gun && p.ask.gun.maxShot ? `<li><b>Your answer:</b> ${p.ask.gun.maxShot} m (${yd(p.ask.gun.maxShot)} yd) is your longest practised shot. Pass on anything further (Tip).</li>` : p.ask && p.ask.gun && p.ask.gun.maxShot === 0 ? '<li><b>Your answer:</b> not practised yet. Sight in and practise before the hunt.</li>' : ''}</ul>${sp.shot.cert != null ? C.certBadge(sp.shot.cert) : ''} ${C.hasSession('shot-placement') ? '<a href="#/s/shot-placement">Shot placement lesson</a>' : ''}</div>` : ''}
      ${(sp.afterKill || []).length ? `<div class="card"><h3>After the kill</h3><ol>${sp.afterKill.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>` : ''}
      ${(sp.mistakes || []).length ? `<div class="card"><h3>Beginner mistakes to skip</h3><ul>${sp.mistakes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}`;
  }

  // your hours on a hunt day: half from first legal light, half up to last legal light (answer "hours"; all of legal light if skipped)
  function timeline(a, b, hours, C) {
    const span = (b - a) / 6e4; if (!(span > 0)) return '';
    const h = hours === 'full' || !hours ? null : +hours, mins = h ? Math.min(span, h * 60) : span, half = mins / 2;
    const segs = !h || mins >= span ? [[0, 100]] : [[0, (half / span) * 100], [100 - (half / span) * 100, (half / span) * 100]];
    const t = (d) => C.hhmm(d), dot = (x) => x.replace(/\.*$/, '.');
    const txt = !h || mins >= span ? dot(`All of legal light: ${t(a)} to ${t(b)}${h ? ` (your ${h} hours cover the whole day)` : ''}`) : `${dot(`Your ${h} hours: ${t(a)} to ${t(C.addMin(a, Math.round(half)))} and ${t(C.addMin(b, -Math.round(half)))} to ${t(b)}`)} Middle of the day: rest, scout or still hunt slowly (Tip).`;
    return `<div class="pl2-tl"><div class="pl2-tl-bar" aria-hidden="true">${segs.map(([l, w]) => `<i style="left:${l.toFixed(1)}%;width:${w.toFixed(1)}%"></i>`).join('')}</div><div class="pl2-tl-l"><span>${t(a)}</span><span>Midday</span><span>${t(b)}</span></div><p class="pl-small">${txt}${hours ? '' : ' Answer "hours a day" to fit it to you.'}</p></div>`;
  }
  function spotsHtml(st, sp, p, C) {
    if (!st) return '<div class="card"><h3>Top spots</h3><p class="muted">Could not load spots. Open the Map once with signal.</p></div>';
    const skip = new Set(p.spotSkip || []), all = (st.pool || st.list || []).filter((x) => !skip.has(x.id));
    const top = all.slice(0, 5), backup = all.slice(5, 7);
    // short form here; the full cards, checks and rundowns are on the Top spots board
    const li = (x, n) => `<li class="pl-spot"><div class="row"><span class="pl-dn">${n}</span><b class="grow">${esc(x.name)}</b></div>
      <div class="muted pl-small">${esc(CAT[x.cat] || x.cat || '')}${x.busy ? `, ${esc(x.busy)}` : ''}, MU ${esc(x.mu || '?')}, ${x.km < 1 ? 'under 1' : Math.round(x.km)} km from ${p.where.src === 'typed' ? 'the MU centre' : 'your point'}</div>
      <div class="pl-spot-a"><a class="btn" href="${mapLink(x)}">Open on map</a><a class="btn" href="${gmaps(x)}" target="_blank" rel="noopener">Google Maps</a></div></li>`;
    const tactics = sp.tactics || [];
    const backupLines = [
      ...backup.map((x) => `Spot ${esc(x.name)} (${esc(CAT[x.cat] || x.cat)}): <a href="${mapLink(x)}">map</a>`),
      ...(tactics[1] ? [`Change tactic: try ${esc(tactics[1].name.toLowerCase())}${tactics[1].best ? ` (best: ${esc(tactics[1].best)})` : ''}.`] : []),
      'Wind wrong for a spot? Go to a spot you can approach with the wind in your face.',
      'Pressure from other hunters? Walk further from the road than they will. Look at the quieter spots.',
      'Bad weather or a closed day: scout, sight in, or practise. Never hunt a closed season.',
    ];
    return `<div class="card"><h3>Top ${top.length || ''} candidate spots</h3><p class="pl-small">Full cards, legal checks, pack out and rundowns: the Top spots board above.</p>
      ${top.length ? `<ol class="pl-spots">${top.map((x, i) => li(x, i + 1)).join('')}</ol>` : `<p class="muted">${esc(st.none || 'No matching candidate spots near this MU in the app.')}</p>`}
      <p class="muted pl-small">Candidate spots from open data, my pick, not proven hunting spots. Scout it first. Check land status and closures on the map. ${C.certBadge(st.cert != null ? st.cert : 60)}${st.saved ? ` Saved copy from ${esc(st.saved)}.` : ''}</p></div>
      ${p.overnight && st.camps && st.camps.length ? `<div class="card"><h3>Camps nearby</h3><ul>${st.camps.map((c) => `<li>${esc(c.name)}, ${Math.round(c.km)} km. <a href="${mapLink(c)}">Map</a> <a href="${gmaps(c)}" target="_blank" rel="noopener">Google Maps</a></li>`).join('')}</ul></div>` : ''}
      <div class="card"><h3>Backup plan</h3><p class="muted pl-small">Tip (opinion).</p><ul>${backupLines.map((t) => `<li>${t}</li>`).join('')}</ul></div>`;
  }

  // ---------- plan trip v2: answers and what they change (part 1) ----------
  const tagsN = (p) => { const A = p.ask || {}; return p.party === 'solo' ? 1 : p.party === 'two' ? (A.partner && A.partner.tag === false ? 1 : 2) : 3; };
  const fmtMin = (n) => (n == null ? '' : n < 60 ? `${n} min` : `${Math.floor(n / 60)} h${n % 60 ? ` ${n % 60} min` : ''}`);
  function askRows(p) {
    const A = p.ask || {}, rows = [];
    const add = (k, label, val, eff) => rows.push({ k, label, val, eff, skipped: A[k] === null || A[k] === undefined });
    const skip = 'Skipped: no filter, the plan uses its defaults.';
    add('exp', 'Experience', askLabel('exp', A.exp), A.exp === 'new' ? 'Top spots favour easy spots to reach and sit. Still hunting is a skill lever: practise it before (Tip).' : A.exp ? 'Spots rank on the spot data alone.' : skip);
    const f = A.fit || {};
    add('fit', 'Walk and carry', A.fit ? [askLabel('walk', f.walk), askLabel('pack', f.pack)].filter(Boolean).join(', ') : '',
      A.fit ? `${f.walk ? `Top spots: walk in up to ${f.walk === 6 ? 'any distance' : f.walk + ' km'} one way${f.walk === 1 ? ', climb up to 100 m (Tip, from the Harrison lesson)' : ''}.` : ''}${f.pack ? ` Pack out estimate: ${f.pack} kg a trip each.` : ' Pack out estimate: 20 kg a trip each (Tip).'}` : skip);
    add('hours', 'Hours a day', askLabel('hours', A.hours), A.hours === 'full' ? 'Each hunt day timeline (part 3) covers all of legal light.' : A.hours ? `Each hunt day timeline (part 3) shows your ${A.hours} hours: half from first legal light, half up to last legal light.` : skip);
    add('travel', 'Drive limit', A.travel === 0 ? 'No limit' : askLabel('travel', A.travel), A.travel ? `Top spots: drive up to ${fmtMin(A.travel)} from Mission. Drive time is an estimate (about 60 km/h on average).` : A.travel === 0 ? 'No spots left out for distance.' : skip);
    add('truck', 'Vehicle', askLabel('truck', A.truck), A.truck === '2wd' ? 'Rough road spots (ATV or 4x4) are left out unless you bring an ATV. Gravel FSR (Forest Service Road) spots get a road watch out.' : A.truck === '4wd' ? 'Rough road spots are in, with a watch out: high clearance helps (Tip).' : A.truck === '4wdhc' ? 'Rough road spots are in.' : skip);
    if (p.party !== 'solo') { const P = A.partner || {}; add('partner', 'Partner', A.partner ? [askLabel('pexp', P.exp), P.tag === true ? 'carries a tag' : P.tag === false ? 'no tag' : ''].filter(Boolean).join(', ') : '',
      A.partner ? `Party odds count ${tagsN(p)} tag${tagsN(p) === 1 ? '' : 's'}.${P.tag === false ? ' Your partner still spots, helps and packs out.' : ''}${P.exp === 'new' ? ' Two new hunters: agree zones of fire and a meeting time before you split up (Tip).' : ''}` : skip); }
    const G = A.gun || {};
    add('gun', 'Gun and max shot', A.gun ? [G.name, G.sights ? askLabel('sights', G.sights).toLowerCase() : '', G.maxShot ? `${G.maxShot} m (${yd(G.maxShot)} yd)` : G.maxShot === 0 ? 'not practised yet' : ''].filter(Boolean).join(', ') : '',
      A.gun ? (G.maxShot ? `Your max shot: ${G.maxShot} m (${yd(G.maxShot)} yd). Pass on anything further (Tip).` : G.maxShot === 0 ? 'Not practised yet: sight in and practise first. Sighted in is a readiness gate.' : '') + (G.id === 'tikka' && G.sights === 'iron' ? ' Tikka open sights are factory zeroed at 100 m (95%, Tikka manual).' : '') : skip);
    add('budget', 'Budget', askLabel('budget', A.budget), A.budget ? `The board shows fuel per spot. Spots where fuel is over a third of your budget rank lower. Assumption: ${FUEL_L100} L per 100 km, about $${FUEL_PRICE.toFixed(2)} a litre.` : A.budget === 0 ? 'No spots lowered for fuel.' : skip);
    add('success', 'Success means', askLabel('success', A.success), A.success === 'see' ? 'Odds headline: seeing one. There is no official number for that; the plan says so.' : A.success === 'shot' ? 'Odds headline: a shot chance. No official number; at least the official kill rate.' : A.success === 'meat' ? 'Odds headline: an animal taken, the official harvest number.' : skip);
    return rows;
  }
  function askHtml(p) {
    const rows = askRows(p), n = rows.filter((r) => !r.skipped).length;
    return `<details class="pl2-ask"${n ? ' open' : ''}><summary>Your answers and what they change (${n} of ${rows.length})</summary>
      ${rows.map((r) => `<div class="pl2-ar"><div class="pl-kv"><span>${esc(r.label)}</span><b>${r.skipped ? '<span class="muted">Skipped</span>' : esc(r.val)}</b></div><p class="pl-small pl2-eff">${esc(r.eff)}</p></div>`).join('')}
      ${n < rows.length ? '<p class="pl-small">Tap Change to answer the skipped questions. Each answer changes the plan.</p>' : ''}</details>`;
  }
  // the odds headline for what success means to you (official numbers only; anything finer is labelled)
  const huntDaysOf = (lg) => (lg.days || []).filter((d, i) => (lg.dayOpen[d] || []).length && i >= scoutCount(lg.days.length)).length;
  function successHtml(od, sp, p, lg, C) {
    if (!od || od.pct == null) return '';
    const A = p.ask || {}, hd = huntDaysOf(lg), per = od.perDay || 0, trip = 1 - Math.pow(1 - per, hd), pty = 1 - Math.pow(1 - per, hd * tagsN(p));
    const r5 = (x) => Math.min(95, Math.max(1, Math.round((x * 100) / 5) * 5 || 1));
    const oneIn = per > 0 ? Math.round(1 / per) : null;
    const goal = A.success || 'meat';
    const head = { see: 'Seeing one', shot: 'A shot opportunity', meat: 'Meat in the freezer' }[goal];
    const body = goal === 'meat'
      ? `<p><b>About ${r5(trip)}%</b> over your ${hd} hunt day${hd === 1 ? '' : 's'}${tagsN(p) > 1 ? `, about ${r5(pty)}% that one of your ${tagsN(p)} tags is filled` : ''}. Rough math (Tip) at the official average rate.</p>`
      : goal === 'shot'
        ? `<p><b>No official number</b> for shot chances. Every animal taken was a shot chance, so it is at least the kill rate: about ${r5(trip)}% or more over your ${hd} hunt day${hd === 1 ? '' : 's'} (rough math, Tip).</p>`
        : `<p><b>No official number</b> for seeing one. It is at least your shot chance (about ${r5(trip)}% or more, rough math, Tip). Quiet spots at first and last light are where hunters see deer (Tip).</p>`;
    return `<div class="card pl2-goal"><p class="hero-k">Your goal${A.success ? '' : ' (not answered: meat in the freezer shown)'}</p><h3>${esc(head)}</h3>${body}
      <div class="pl2-bars" aria-hidden="true"><div><span>Chance per hunter day</span><i style="width:${Math.max(2, Math.round(per * 100))}%"></i><b>${oneIn ? `1 in ${oneIn}` : 'n/a'}</b></div><div><span>Your ${hd} day${hd === 1 ? '' : 's'}</span><i style="width:${Math.max(2, r5(trip))}%"></i><b>about ${r5(trip)}%</b></div></div>
      <p class="muted pl-small">Official base: ${Math.round(od.pct)}% of resident hunters a season, ${od.dpk ? `about ${Math.round(od.dpk)} hunter days per animal` : 'days per animal n/a'} (${od.scope === 'mu' ? `MU ${esc(p.where.mu)}` : `Region ${esc(od.region)}`}, 2020 to 2024). Everything finer is an estimate. ${C.certBadge(90)}</p></div>`;
  }

  // ---------- Top spots board (part 5) ----------
  function boardList(st, p) {
    if (!st) return [];
    const skip = new Set(p.spotSkip || []);
    return (st.pool || st.list || []).filter((x) => !skip.has(x.id)).slice(0, 5);
  }
  function packOut(x, p, sp) {
    const A = p.ask || {}, carry = (A.fit && A.fit.pack) || 20, ppl = partyN(p.party);
    const deer = spotTag(sp) === 'deer';
    const w = x.walkKm;
    if (!deer) return w != null ? `Walk ${w < 1 ? Math.round(w * 1000) + ' m' : w.toFixed(1) + ' km'} back to the truck with the load. No meat estimate for this animal yet.` : 'Walk distance not in the saved data.';
    const bt = /^2-/.test(p.where.mu || '');
    const lo = bt ? 16 : 23, hi = bt ? 30 : 38; // a third of live weight: black tailed buck 48 to 90 kg (90%), mule deer buck 68 to 113 kg (75%); a third is a Tip
    if (w == null) return `About ${lo} to ${hi} kg of boned meat (Tip). Walk distance not in the saved data.`;
    if (w < 0.3) return `Close to where you park${x.rideKm ? ' the ATV' : ''}: about ${lo} to ${hi} kg of boned meat, or drag it whole (Tip).`;
    const trips = Math.max(1, Math.ceil(hi / (carry * ppl)));
    const h = (trips * w) / 2 + ((trips - 1) * w) / 3;
    return `About ${lo} to ${hi} kg of boned meat. ${ppl > 1 ? `${ppl} of you` : 'You'} at up to ${carry} kg each: ${trips} trip${trips === 1 ? '' : 's'} of ${w < 1 ? Math.round(w * 1000) + ' m' : w.toFixed(1) + ' km'}, about ${h < 1 ? Math.round(h * 60) + ' min' : h.toFixed(1) + ' h'}${x.rideKm ? `, plus the ${x.rideKm.toFixed(1)} km ride` : ''}. Estimate (Tip: 2 km an hour loaded).`;
  }
  // an add on's per spot value: a string, { html }, or numbers { low, likely, high } (0 to 1 or %)
  function addOnVal(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'string') return v;
    if (typeof v.html === 'string') return v.html;
    if (typeof v.text === 'string') return esc(v.text);
    const pc = (n) => (n == null ? '' : `${Math.round(n <= 1 ? n * 100 : n)}%`);
    if (v.likely != null) return `about ${pc(v.likely)}${v.low != null && v.high != null ? ` (range ${pc(v.low)} to ${pc(v.high)})` : ''}, estimate`;
    return '';
  }
  function spotFrom(mod, fnName, x, res, X) {
    if (!mod) return null;
    try { if (typeof mod[fnName] === 'function') { const v = mod[fnName](x, res, X); if (v != null) return v; } } catch (e) { console.warn(fnName, e); }
    const s = res && res.spots; if (!s) return null;
    const hit = Array.isArray(s) ? s.find((y) => y && y.id === x.id) : s[x.id];
    return hit == null ? null : hit;
  }
  function drawBoard(el, st, p, sp, C, m, X) {
    if (!el) return;
    if (!st) { el.innerHTML = '<div class="card"><p class="muted">Could not load spots. Open the Map once with signal.</p></div>'; return; }
    const A = p.ask || {}, show = boardList(st, p), skip = p.spotSkip || [];
    const L = st.left || {}, outN = (L.walk || 0) + (L.travel || 0) + (L.truck || 0);
    const O = window.HMPlanOdds, Lv = window.HMPlanLive;
    const chk = (label, rows, noData) => {
      if (noData) return `<li class="pl2-q"><b>${label}:</b> not checked here. Open the Map once with signal.</li>`;
      if (!rows.length) return `<li class="pl2-ok"><b>${label}:</b> clear in the data.</li>`;
      return `<li class="pl2-w"><b>${label}:</b> ${esc(rows[0].t)}${rows[0].cert != null ? ' ' + C.certBadge(rows[0].cert) : ''}${rows.length > 1 ? ` <span class="muted">(${rows.length - 1} more in the rundown)</span>` : ''}</li>`;
    };
    const card = (x, i) => {
      const lg = x.legal, nd = !x.det;
      const oddsV = addOnVal(spotFrom(O, 'spot', x, m.oddsX, X)), windV = addOnVal(spotFrom(Lv, 'windFit', x, m.live, X));
      const walk = x.walkKm != null ? `walk ${x.walkKm < 1 ? Math.round(x.walkKm * 1000) + ' m' : x.walkKm.toFixed(1) + ' km'}${x.climbM ? `, climb about ${Math.round(x.climbM)} m` : ''}${x.walkMin ? `, about ${x.walkMin} min` : ''}` : '';
      const warnRoad = A.truck === '4wd' && x.ride === 'rough' ? ' Rough road: high clearance helps (Tip).' : A.truck === '2wd' && x.fsr ? ' Gravel FSR (Forest Service Road): check the road notices; 2 wheel drive in the wet is risky (Tip).' : '';
      const why = [...(x.own ? [`<li class="pl2-own"><span class="pill">From your own trips</span> ${esc(x.own.text.replace(/^From your own trips: /, ''))}</li>`] : []),
        ...(x.evid || []).map((t) => `<li>${esc(t)}</li>`), ...(x.why || []).filter((t) => !/^From your own trips/.test(t)).map((t) => `<li>${esc(t)}</li>`)];
      return `<li class="card pl2-spot" data-bi="${i}"><div class="row"><span class="pl-dn">${i + 1}</span><b class="grow">${esc(x.name)}</b>${x.pop ? `<span class="pill ${x.pop === 'quiet' ? 'soon' : ''}">${x.pop === 'quiet' ? 'Quiet' : 'Popular'}</span>` : ''}</div>
        <div class="pl2-strip" aria-label="Getting there"><span>Mission</span><i>${x.driveKm != null ? `${x.driveKm} km, about ${fmtMin(x.driveMin)}` : 'drive'}</i>${x.rideKm ? `<span>Park</span><i>${x.rideKm.toFixed(1)} km ${x.ride === 'rough' ? 'rough road' : 'ride'}</i>` : ''}<span>${x.rideKm ? 'Unload' : 'Park'}</span><i>${walk ? esc(walk.replace(/,.*/, '')) : 'walk'}</i><span>Spot</span></div>
        <div class="pl-kv"><span>Access</span><b>${esc(CAT[x.cat] || x.cat || '')}, MU ${esc(x.mu || '?')}</b></div>
        <p class="pl-small">Drive about ${x.driveKm != null ? x.driveKm : '?'} km from Mission, about ${fmtMin(x.driveMin) || '?'} (estimate${x.driveSrc === 'data' ? ', road distance from the spot data' : ', straight line times 1.3'}).${x.park && x.park.what ? ` Park: ${esc(x.park.what)}.` : ''}${walk ? ` Then ${esc(walk)}.` : ''}${esc(warnRoad)}${A.budget && x.driveKm != null ? ` Fuel about $${Math.round(fuelCost(x.driveKm))} round trip (Assumption: ${FUEL_L100} L per 100 km, $${FUEL_PRICE.toFixed(2)} a litre).` : ''}</p>
        <div class="pl-kv"><span>Pressure</span><b>${esc(x.popLabel || (x.pop === 'quiet' ? 'Less popular (quieter)' : x.pop ? 'More popular (busier)' : x.busy || 'not in the data'))}</b></div>
        ${x.popWhy || x.pressWhy ? `<p class="pl-small muted">${esc(x.pressWhy || '')}${x.popCert != null ? ` Popularity is an estimate, about ${esc(x.popCert)}% sure.` : ''}</p>` : ''}
        <div class="pl-kv"><span>Pack out</span><b>Estimate</b></div><p class="pl-small">${esc(packOut(x, p, sp))}</p>
        <div class="pl-kv"><span>Nearest camp</span><b>${x.camp ? `${esc(x.camp.name)}, ${x.camp.km} km` : 'none in the app data'}</b></div>
        <div class="pl-kv"><span>Odds here</span><b>${oddsV || (O ? 'working it out' : 'odds coming')}</b></div>
        <div class="pl-kv"><span>Wind fit</span><b>${windV || (Lv ? (m.live ? 'no forecast for this spot' : 'getting the forecast') : 'forecast coming')}</b></div>
        <h4 class="pl2-h4">Legal checks</h4><ul class="pl2-chk">${chk('Private land', nd ? [] : lg.rows.priv, nd)}${chk('Road allowance', nd ? [] : lg.rows.road, nd)}${chk('No shooting areas', nd ? [] : lg.rows.noshoot, nd)}
          ${!nd && lg.rows.other.length ? `<li class="pl2-w"><b>Also check:</b> ${lg.rows.other.slice(0, 2).map((r) => esc(r.t)).join(' ')}</li>` : ''}
          <li class="pl2-ok"><b>Legal light:</b> each day's times are in part 3.</li></ul>
        ${why.length || x.scoreLabel ? `<h4 class="pl2-h4">Why this spot</h4><ul class="pl2-why">${why.join('')}</ul>${x.scoreLabel ? `<p class="muted pl-small">${esc(x.scoreLabel)}.</p>` : ''}` : ''}
        <div class="pl2-acts no-print"><a class="btn" href="${mapLink(x)}">Map</a><button type="button" class="btn" data-b-off="${i}">Save offline</button><button type="button" class="btn" data-b-swap="${i}">Swap</button></div>
        <details class="pl-rd" data-rd="${i}"><summary class="btn">Full rundown</summary><div class="pl-rd-in"><p class="muted">Putting the rundown together...</p></div></details></li>`;
    };
    el.innerHTML = `<p class="pl-law">Study aid only. The official regulations are the law.</p>
      <div class="card"><p class="pl-small">The top ${show.length || ''} candidate spots for this plan, after your answers and the legal checks in the spot data (private land, road allowances, no shooting areas). Candidates from open data, my pick: scout first, check posted signs. ${C.certBadge(st.cert != null ? st.cert : 60)}${st.saved ? ` Saved copy from ${esc(st.saved)}.` : ''}</p>
        ${L.legal ? `<p class="pl-small"><b>${L.legal} spot${L.legal === 1 ? '' : 's'} left out:</b> failed a legal check (private land right here, on a road allowance, or inside a no shooting area).</p>` : ''}
        ${outN ? `<p class="pl-small"><b>${outN} left out by your answers:</b> ${[L.walk ? `${L.walk} walk` : '', L.travel ? `${L.travel} drive time` : '', L.truck ? `${L.truck} vehicle` : ''].filter(Boolean).join(', ')}.</p>` : ''}
        ${st.own ? `<p class="pl-small"><span class="pill">From your own trips</span> ${st.own} debrief${st.own === 1 ? '' : 's'} with a place can move spots up or down.</p>` : ''}
        ${st.detail === false && show.length ? '<p class="pl-small">Spot details are not saved on this phone yet, so walk, pressure and legal checks are missing. Open the Map once with signal.</p>' : ''}
        ${skip.length ? `<button type="button" class="btn" id="pl-b-reset">Bring back ${skip.length} swapped spot${skip.length === 1 ? '' : 's'}</button>` : ''}</div>
      ${show.length ? `<ol class="pl2-board">${show.map(card).join('')}</ol>` : `<div class="card"><p>${esc(st.none || 'No matching candidate spots near this MU in the app.')}</p></div>`}`;
    const save = () => { const pool = (st.pool || st.list || []).filter((x) => !(p.spotSkip || []).includes(x.id)); p.spots = { at: todayIso(), list: pool.slice(0, 7), camps: st.camps || [] }; C.save(); if (X) X.spots = boardList(st, p); };
    el.querySelectorAll('[data-b-swap]').forEach((b) => b.onclick = () => {
      const x = show[+b.dataset.bSwap], pool = st.pool || st.list || [];
      if (pool.filter((y) => !(p.spotSkip || []).includes(y.id)).length <= 5) { C.toast && C.toast('No more spots pass your answers. Change the answers to see more.'); return; }
      p.spotSkip = [...new Set([...(p.spotSkip || []), x.id])]; save(); drawBoard(el, st, p, sp, C, m, X);
      C.toast && C.toast(`Swapped out ${x.name}.`);
    });
    const rs = el.querySelector('#pl-b-reset'); if (rs) rs.onclick = () => { p.spotSkip = []; save(); drawBoard(el, st, p, sp, C, m, X); };
    el.querySelectorAll('[data-b-off]').forEach((b) => b.onclick = () => {
      save();
      const box = document.getElementById('pl-offline');
      if (box) { mountOffline(box, p, sp, C); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      C.toast && C.toast('This card saves the map around all your top spots. Tap Save (or Update) in it, on wifi.');
    });
    wireRundowns(el, { list: show }, p, C);
    if (C.link) C.link(el);
  }

  // ---------- readiness gates (part 6): hm.progress.v1 ticks, plan offline check, hm.safety.trip, must know screens ----------
  const PROG = 'hm.progress.v1';
  const ldJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const svJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  async function gates(p, sp, C) {
    const gun = p.method === 'shotgun' ? 'Shotgun patterned' : p.method === 'bow' ? 'Bow tuned and practised' : 'Rifle sighted in';
    const G = [
      { k: 'sighted', label: gun, tick: true, href: '#/s/sighting-in', link: 'Lesson: sighting in' },
      { k: 'licence', label: 'Licence and tag bought', tick: true, href: '#/s/licences', link: 'Lesson: licences and tags' },
      { k: 'offline', label: 'Hunt area saved for no signal', jump: 'pl-offline', link: 'Go to the offline card' },
      { k: 'trip', label: 'Trip plan saved and sent', href: '#/safety/trip', link: 'Open the trip plan' },
      { k: 'must', label: 'Must know screens read', href: '#/plan/' + encodeURIComponent(p.id), jump: 'pl-s5', link: 'Go to the study path' },
    ];
    let R = null;
    if (window.HMProgress && typeof window.HMProgress.score === 'function') { try { R = await window.HMProgress.score(p.id); } catch (e) { R = null; } }
    const ticks = (ldJ(PROG, {}) || {}).ticks || {}, mine = ticks[p.id] || {};
    for (const g of G) {
      const it = R && R.plan && (R.items || []).find((x) => x.key === g.k);
      if (it) { g.ok = it.counted && it.points >= it.weight; g.how = it.how; if (it.href && !g.jump) g.href = it.href; continue; }
      if (g.tick) { g.ok = !!mine[g.k]; g.how = g.ok ? `You ticked it on ${mine[g.k]}.` : 'Not ticked yet.'; }
      else if (g.k === 'trip') { const tp = ldJ('hm.safety.trip', {}) || {}; const miss = ['who', 'where', 'ret', 'overdue'].filter((k) => !String(tp[k] || '').trim()); g.ok = !miss.length; g.how = g.ok ? 'Saved with name, where, return and overdue time. Remember to send it.' : 'Not saved yet, or missing parts.'; }
      else if (g.k === 'offline') { const rec = (((ldJ('hm.map.v1', {}) || {}).offline) || []).find((x) => x && x.planId === p.id); g.ok = !!(rec && !rec.partial); g.how = g.ok ? 'Saved on this phone (record only; the offline card checks every part).' : 'Not saved on this phone yet.'; }
      else if (g.k === 'must') { try { const T = C.study.today(p, sp.lessons); g.ok = !T.must.left; g.how = `${T.must.seen} of ${T.must.total} must know screens read.`; } catch (e) { g.ok = false; g.how = 'The study path could not be read.'; } }
    }
    return G;
  }
  async function drawReady(el, p, sp, C, m) {
    if (!el) return;
    const G = await gates(p, sp, C);
    if (!el.isConnected) return;
    const left = G.filter((g) => !g.ok);
    m.ready = { left: left.length, total: G.length };
    const mine = ((ldJ(PROG, {}) || {}).ticks || {})[p.id] || {};
    el.innerHTML = `<div class="card pl2-ready"><div class="pl2-rb ${left.length ? 'pl2-no' : 'pl2-yes'}" role="status"><b>${left.length ? `Not ready: ${left.length} thing${left.length === 1 ? '' : 's'}` : 'Ready'}</b><span>${left.length ? esc(left.map((g) => g.label.toLowerCase()).join(', ')) : `All ${G.length} gates done. Good hunting.`}</span></div>
      <ul class="pl2-gates">${G.map((g) => `<li class="${g.ok ? 'pl2-ok' : 'pl2-x'}"><div class="row"><b class="grow">${g.ok ? '&#10003;' : '&#10007;'} ${esc(g.label)}</b></div><p class="pl-small muted">${esc(g.how || '')}</p>
        <div class="pl2-acts no-print">${g.tick ? `<button type="button" class="btn${mine[g.k] ? '' : ' primary'}" data-g-tick="${g.k}">${mine[g.k] ? 'Untick' : 'Tick: done'}</button>` : ''}${g.jump ? `<button type="button" class="btn" data-g-jump="${g.jump}">${esc(g.link)}</button>` : g.href ? `<a class="btn" href="${esc(g.href)}">${esc(g.link)}</a>` : ''}</div></li>`).join('')}</ul>
      <div class="btn-row no-print"><button type="button" class="btn" id="pl-g-again">Check again</button>${window.HMRoutes && window.HMRoutes.progress ? `<a class="btn" href="#/progress/${encodeURIComponent(p.id)}">Hunt ready score</a>` : ''}</div>
      <p class="muted pl-small">The plan shows Not ready until every gate is done. Ticks are shared with the Hunt ready score. Gates help you find gaps; they do not say the hunt is legal or safe.</p></div>`;
    el.querySelectorAll('[data-g-tick]').forEach((b) => b.onclick = () => {
      const o = ldJ(PROG, {}) || {}; o.ticks = o.ticks || {}; const t = (o.ticks[p.id] = o.ticks[p.id] || {}), k = b.dataset.gTick;
      if (t[k]) delete t[k]; else t[k] = todayIso();
      svJ(PROG, o); drawReady(el, p, sp, C, m);
    });
    el.querySelectorAll('[data-g-jump]').forEach((b) => b.onclick = () => { const t = document.getElementById(b.dataset.gJump); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    el.querySelector('#pl-g-again').onclick = () => { el.querySelector('#pl-g-again').disabled = true; drawReady(el, p, sp, C, m); };
  }

  // ---------- after the hunt debrief (part 6): hm.plandebrief.<planId> plus a journal entry (S.journal, app.js format) ----------
  const TIMES = ['Dawn', 'Morning', 'Midday', 'Evening', 'Dusk'];
  const WINDS = ['Calm', 'From the N', 'From the NE', 'From the E', 'From the SE', 'From the S', 'From the SW', 'From the W', 'From the NW'];
  const windTxt = (w) => String(w || '').replace(/^Calm$/, 'calm').replace(/^From the/, 'from the');
  const SKY = ['Clear', 'Cloud', 'Rain', 'Snow', 'Fog'];
  const RESULTS = ['No animal seen', 'Seen, no shot', 'Shot chance, passed', 'Shot, missed', 'Hit, not found', 'Animal down and tagged'];
  function drawDebrief(el, p, sp, st, C, after) {
    if (!el) return;
    const key = DEB + p.id, list = ldJ(key, []) || [];
    const spotsL = boardList(st, p), t = todayIso(), dflt = t < p.from ? p.from : t > p.to ? p.to : t, started = p.from <= t;
    const opt = (arr, cur) => arr.map((v) => `<option${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');
    el.innerHTML = `<div class="card"><p class="pl-small">After each hunt day, a short debrief: what you saw, where, when, the weather and your shots. It goes to your journal, and future plans rank spots near your sightings higher, labelled "from your own trips".</p>
      ${list.length ? `<ul class="pl2-deb">${list.map((e, i) => `<li><div class="row"><b class="grow">${esc(e.date)}${e.time ? `, ${esc(e.time)}` : ''}: ${esc(e.place || 'no place')}</b><button type="button" class="btn" data-d-del="${i}" aria-label="Delete this debrief">Delete</button></div>
        <p class="pl-small">${esc(+e.seenN || 0)} seen${e.seen ? `: ${esc(e.seen)}` : ''}. ${esc(e.sky || '')}${e.wind ? `, wind ${esc(windTxt(e.wind))}` : ''}${e.temp ? `, ${esc(e.temp)}` : ''}. ${esc(e.shots || 0)} shot${+e.shots === 1 ? '' : 's'}. ${esc(e.result || '')}.${e.lat == null ? ' <span class="muted">No map point, so it does not change spot ranking.</span>' : ''}</p></li>`).join('')}</ul>` : ''}
      <details class="pl2-df"${started ? ' open' : ''}><summary class="btn block">${list.length ? 'Add another debrief' : 'Add a debrief'}</summary>
      <div class="pl2-form"><div class="pl-dates"><div><label class="f" for="pd-date">Day</label><input type="date" id="pd-date" value="${esc(dflt)}"></div>
        <div><label class="f" for="pd-time">When</label><select id="pd-time">${opt(TIMES, 'Dawn')}</select></div></div>
        <label class="f" for="pd-where">Where</label><select id="pd-where">${spotsL.map((x, i) => `<option value="s${i}">${esc(x.name)}</option>`).join('')}<option value="gps">Where I am now (location)</option><option value="other">Somewhere else (type it)</option></select>
        <input type="text" id="pd-other" placeholder="Place name or what you saw near" hidden aria-label="Place">
        <div id="pd-msg" class="pl-small" role="status"></div>
        <div class="pl-dates"><div><label class="f" for="pd-n">Animals seen</label><input type="number" id="pd-n" min="0" max="99" value="0" inputmode="numeric"></div>
        <div><label class="f" for="pd-shots">Shots fired</label><input type="number" id="pd-shots" min="0" max="20" value="0" inputmode="numeric"></div></div>
        <label class="f" for="pd-seen">What you saw (bucks, does, sign, other hunters)</label><textarea id="pd-seen" rows="2"></textarea>
        <div class="pl-dates"><div><label class="f" for="pd-wind">Wind</label><select id="pd-wind">${opt(WINDS, 'Calm')}</select></div><div><label class="f" for="pd-sky">Weather</label><select id="pd-sky">${opt(SKY, 'Cloud')}</select></div></div>
        <label class="f" for="pd-temp">Temperature</label><input type="text" id="pd-temp" placeholder="About 4 C">
        <label class="f" for="pd-res">Result</label><select id="pd-res">${opt(RESULTS, 'No animal seen')}</select>
        <label class="f" for="pd-les">One lesson</label><textarea id="pd-les" rows="2"></textarea>
        <button type="button" class="btn primary block" id="pd-save">Save the debrief</button></div></details></div>`;
    const $ = (s) => el.querySelector(s);
    let gps = null;
    $('#pd-where').onchange = () => {
      const v = $('#pd-where').value; $('#pd-other').hidden = v !== 'other'; gps = null; $('#pd-msg').textContent = '';
      if (v === 'gps') {
        if (!navigator.geolocation) { $('#pd-msg').textContent = 'This phone cannot share its location here. Pick a spot or type the place.'; return; }
        $('#pd-msg').textContent = 'Finding your location...';
        navigator.geolocation.getCurrentPosition((pos) => { gps = { lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4) }; $('#pd-msg').textContent = `Got it: ${gps.lat}, ${gps.lon}. Stays on this phone.`; },
          () => { $('#pd-msg').textContent = 'Location is off or was not allowed. Pick a spot or type the place.'; }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
      }
    };
    $('#pd-save').onclick = () => {
      const w = $('#pd-where').value, s0 = /^s\d+$/.test(w) ? spotsL[+w.slice(1)] : null;
      if (w === 'gps' && !gps) { $('#pd-msg').textContent = 'No location yet. Wait a moment or pick a spot.'; return; }
      const place = s0 ? s0.name : w === 'gps' ? 'My location' : $('#pd-other').value.trim() || p.where.label;
      const e = { id: Date.now().toString(36), at: Date.now(), date: $('#pd-date').value || dflt, time: $('#pd-time').value, place, spotId: s0 ? s0.id : null,
        lat: s0 ? s0.lat : gps ? gps.lat : null, lon: s0 ? s0.lon : gps ? gps.lon : null, mu: p.where.mu, species: p.species, tag: spotTag(sp),
        seenN: Math.max(0, Math.min(99, parseInt($('#pd-n').value, 10) || 0)), seen: $('#pd-seen').value.trim(), wind: $('#pd-wind').value, sky: $('#pd-sky').value, temp: $('#pd-temp').value.trim(),
        shots: Math.max(0, parseInt($('#pd-shots').value, 10) || 0), result: $('#pd-res').value, lesson: $('#pd-les').value.trim() };
      const all = ldJ(key, []) || []; all.unshift(e);
      if (!svJ(key, all)) { C.toast && C.toast('Could not save on this phone.'); return; }
      const S = C.S; S.journal = Array.isArray(S.journal) ? S.journal : [];
      S.journal.unshift({ date: e.date, place: `${place}${p.where.mu ? `, MU ${p.where.mu}` : ''}`, species: spName(sp, p.where.mu), weather: `${e.sky}, wind ${windTxt(e.wind)}${e.temp ? ', ' + e.temp : ''}`,
        seen: `${e.time}: ${e.seenN} seen${e.seen ? '. ' + e.seen : ''}`, result: `${e.shots} shot${e.shots === 1 ? '' : 's'}. ${e.result}`, lesson: e.lesson });
      C.save();
      C.toast && C.toast('Saved to your journal. Spots near it move in your next plans.');
      drawDebrief(el, p, sp, st, C, after); if (after) after();
    };
    el.querySelectorAll('[data-d-del]').forEach((b) => b.onclick = () => {
      if (!confirm('Delete this debrief? Its journal entry stays in the journal.')) return;
      const all = ldJ(key, []) || []; all.splice(+b.dataset.dDel, 1); svJ(key, all); drawDebrief(el, p, sp, st, C, after);
    });
  }

  // ---------- styles for the v2 parts (kept here so plan.js stays one file) ----------
  function css2() {
    if (document.getElementById('pl2-css')) return;
    const s = document.createElement('style'); s.id = 'pl2-css';
    s.textContent = `
.pl2-nav { overflow-x: auto; scrollbar-width: none; }
.pl2-nav::-webkit-scrollbar { display: none; }
.pl2-nav button { flex: 0 0 auto; padding: 0 12px; }
.pl2-optq { font-size: 15px; margin: 0 0 12px; }
.pl2-gh { font-size: 17px; margin: 14px 0 8px; }
.pl2-skip { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
.pl2-skip .btn { min-height: 44px; margin: 0; font-size: 15px; }
.pl2-ask { margin: 8px 0; }
.pl2-ask summary { min-height: 44px; display: flex; align-items: center; font-weight: 800; cursor: pointer; }
.pl2-ar .pl-kv { border-bottom: 0; }
.pl2-eff { margin: 0 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--line); font-size: 14px; }
.pl2-goal h3 { margin: 2px 0 6px; }
.pl2-bars > div { display: grid; grid-template-columns: 9em 1fr auto; gap: 8px; align-items: center; margin: 6px 0; font-size: 14px; }
.pl2-bars i { display: block; height: 14px; border-radius: 7px; background: var(--accent); max-width: 100%; }
.pl2-bars b { font-size: 14px; }
.pl2-board { list-style: none; padding: 0 !important; margin: 0; }
.pl2-spot { margin: 0 0 12px !important; }
.pl2-spot p { margin: 4px 0 8px; }
.pl2-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 8px 0; font-size: 14px; }
.pl2-strip span { padding: 4px 8px; border-radius: 999px; border: 2px solid var(--line); font-weight: 700; }
.pl2-strip i { font-style: normal; color: var(--muted); }
.pl2-strip i::before { content: "\\2192  "; }
.pl2-strip i::after { content: "  \\2192"; }
.pl2-h4 { font-size: 16px; margin: 10px 0 4px; }
.pl2-chk, .pl2-why, .pl2-gates, .pl2-deb { list-style: none; padding: 0 !important; margin: 4px 0; }
.pl2-chk li, .pl2-why li { font-size: 14px; padding: 4px 0 4px 26px; position: relative; }
.pl2-chk li::before { position: absolute; left: 2px; font-weight: 800; }
.pl2-chk .pl2-ok::before { content: "\\2713"; color: #1b7f3b; }
.pl2-chk .pl2-w::before { content: "!"; color: #b25e00; left: 8px; }
.pl2-chk .pl2-q::before { content: "?"; color: var(--muted); left: 7px; }
.pl2-why li::before { content: "\\2022"; position: absolute; left: 10px; }
.pl2-own { font-weight: 700; }
.pl2-acts { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; margin: 8px 0; }
.pl2-acts .btn { min-height: 44px; margin: 0; font-size: 15px; padding: 0 8px; display: flex; align-items: center; justify-content: center; }
.pl2-rb { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 12px; margin-bottom: 8px; color: #fff; }
.pl2-rb b { font-size: 20px; }
.pl2-rb span { font-size: 14px; }
.pl2-no { background: #b3261e; }
.pl2-yes { background: #1b7f3b; }
.pl2-gates li { border-top: 1px solid var(--line); padding: 8px 0; }
.pl2-gates li.pl2-ok b { color: #1b7f3b; }
.pl2-gates li.pl2-x b { color: #b3261e; }
.pl2-gates p { margin: 2px 0 6px; }
.pl2-deb li { border-top: 1px solid var(--line); padding: 8px 0; }
.pl2-deb .btn { min-height: 44px; margin: 0; }
.pl2-df summary { list-style: none; min-height: 44px; display: flex; align-items: center; justify-content: center; }
.pl2-form select, .pl2-form input, .pl2-form textarea { width: 100%; min-height: 44px; font-size: 16px; box-sizing: border-box; }
.pl2-form .btn { margin-top: 12px; }
.pl2-tl { margin: 8px 0; }
.pl2-tl-bar { position: relative; height: 18px; border-radius: 9px; background: var(--line); overflow: hidden; }
.pl2-tl-bar i { position: absolute; top: 0; bottom: 0; background: var(--accent); }
.pl2-tl-l { display: flex; justify-content: space-between; font-size: 14px; color: var(--muted); margin-top: 2px; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .pl2-chk .pl2-ok::before, :root:not([data-theme="light"]) .pl2-gates li.pl2-ok b { color: #7fd99a; } :root:not([data-theme="light"]) .pl2-gates li.pl2-x b { color: #ff8a80; } :root:not([data-theme="light"]) .pl2-chk .pl2-w::before { color: #ffb74d; } }
:root[data-theme="dark"] .pl2-chk .pl2-ok::before, :root[data-theme="dark"] .pl2-gates li.pl2-ok b { color: #7fd99a; }
:root[data-theme="dark"] .pl2-gates li.pl2-x b { color: #ff8a80; }
@media print { .pl2-nav { display: none !important; } }
`;
    document.head.appendChild(s);
  }

  // ---------- share ----------
  function shareText(m, D, C) {
    const { p, sp } = m, L = [];
    L.push(`Hunt plan: ${spName(sp, p.where.mu)}`);
    L.push(`Where: ${p.where.label}${p.where.mu ? `, MU (Management Unit) ${p.where.mu}` : ''}`);
    L.push(`When: ${rangeLabel(p.from, p.to)}`);
    L.push(`How: ${METHOD_LABEL[p.method] || p.method}. Access: ${accessLabel(p.access)}. Overnight: ${p.overnight ? 'yes' : 'no'}. Party: ${partyLabel(p.party)}.`);
    const ar = askRows(p).filter((r) => !r.skipped);
    if (ar.length) L.push('Answers: ' + ar.map((r) => `${r.label}: ${r.val}`).join('; ') + '.');
    if (m.ready) L.push(m.ready.left ? `Readiness: not ready, ${m.ready.left} of ${m.ready.total} gates to do.` : 'Readiness: all gates done.');
    if (m.legal) L.push(`Legal: ${{ open: 'Open', no: 'Not open', check: 'Check' }[m.legal.verdict]}. ${m.legal.why}`);
    if (m.odds && m.odds.pct != null) L.push(`Odds: ${Math.round(m.odds.pct)}% of resident hunters got one, 2020 to 2024 average (${m.odds.scope === 'mu' ? 'MU' : 'region'}). 90% is ${m.odds.pct >= 90 ? 'possible but not promised' : 'not realistic'}.`);
    else if (m.odds && m.odds.none) L.push('Odds: no official success numbers for this animal.');
    const bl = boardList(m.spots, p);
    if (bl.length) { L.push('Top spots (candidates, scout first):'); bl.forEach((x, i) => L.push(`${i + 1}. ${x.name}${x.driveKm != null ? `, about ${x.driveKm} km from Mission` : ''}${x.walkKm != null ? `, walk ${x.walkKm} km` : ''}: ${gmaps(x)}`)); }
    if (m.check) { L.push(`Checklist: ${m.check.done} of ${m.check.total} done.`); if (m.check.left.length) L.push('Still to do: ' + m.check.left.slice(0, 12).map((i) => i.t).join('; ') + (m.check.left.length > 12 ? '; ...' : '')); }
    L.push('Study aid only. The official regulations are the law.');
    return L.join('\n');
  }
  function copy(text, C) {
    (C.copyText ? C.copyText(text) : Promise.resolve(false)).then((ok) => C.toast && C.toast(ok ? 'Plan copied. Paste it in a message.' : 'Could not copy on this phone.'));
  }

  // ---------- Lists page: "By animal" ----------
  async function animalIndex(el, C) {
    let D; try { D = await loadData(); } catch (e) { D = null; }
    if (!el.isConnected) return;
    if (!D || !D.species.length) { el.innerHTML = '<p class="muted">Animal checklists are not saved on this phone yet. Open the app once with signal.</p>'; return; }
    const S = C.S;
    el.innerHTML = GROUPS.concat([['', 'Other']]).map(([g, label]) => {
      const ss2 = D.species.filter((s) => (g ? s.group === g : !GROUPS.some(([x]) => x === s.group)));
      return ss2.length ? `<h3 class="pl-lh">${esc(label)}</h3><div class="list">${ss2.map((s) => { const its = checkItems(s, D.lists, { firstHunt: firstDefault(C) }); const n = its.filter((i) => S.checks[`an:${s.id}:${i.key}`]).length;
        return `<a class="item" href="#/lists/animal/${esc(s.id)}"><span class="grow">${esc(s.name)}</span><span class="pill">${n}/${its.length}</span></a>`; }).join('')}</div>` : '';
    }).join('');
  }
  async function animalList(view, id, C) {
    let D; try { D = await loadData(); } catch (e) { D = null; }
    if (!D || !D.species.length) { view.innerHTML = noData(); return; }
    const sp = D.byId[id];
    if (!sp) { view.innerHTML = '<div class="card"><h2>Not found</h2><a href="#/lists">Checklists</a></div>'; return; }
    C.setTitle(`${sp.name} checklist`);
    const S = C.S, k = (i) => `an:${sp.id}:${i.key}`;
    const draw = () => {
      const items = checkItems(sp, D.lists, { firstHunt: firstDefault(C) });
      const t = (i) => !!S.checks[k(i)], n = items.filter(t).length;
      const hide = !!(S.settings && S.settings.animalHideDone);
      view.innerHTML = `<div class="card"><div class="row"><b class="grow">${n} of ${items.length} done</b><label class="pl-hide"><input type="checkbox" id="pl-hide"${hide ? ' checked' : ''}> Hide done</label></div>
        <div class="bar"><i style="width:${Math.round((n / Math.max(1, items.length)) * 100)}%"></i></div>
        <p class="muted pl-small">${esc(sp.name)} list plus the lists for every hunt${firstDefault(C) ? ' and the first hunt list' : ''}. A plan adds lists for your method, access, overnight and party.</p>
        <div class="pl-list${hide ? ' pl-hide-done' : ''}">${checklistHtml(items, t, C, 'data-ak', closedCats(view))}</div>
        <div class="btn-row no-print"><button type="button" class="btn" id="pl-untick">Untick all</button><button type="button" class="btn primary" id="pl-mk">Plan a hunt</button></div></div>
        ${lessonLinks(sp.lessons || [], C) ? `<div class="card"><h3>Lessons</h3><div class="pl-chips">${lessonLinks(sp.lessons || [], C)}</div></div>` : ''}`;
      view.querySelector('#pl-hide').onchange = (e) => { S.settings.animalHideDone = e.target.checked; C.save(); view.querySelector('.pl-list').classList.toggle('pl-hide-done', e.target.checked); };
      view.querySelector('#pl-untick').onclick = () => { if (!n || confirm('Untick every item in this list?')) { items.forEach((i) => delete S.checks[k(i)]); C.save(); draw(); } };
      view.querySelector('#pl-mk').onclick = () => { draft = { species: sp.id }; saveDraft(); goStep(1); };
    };
    view.onchange = (e) => {
      const c = e.target.closest && e.target.closest('input[data-ak]'); if (!c) return;
      const key = `an:${sp.id}:${c.dataset.ak}`; if (c.checked) S.checks[key] = true; else delete S.checks[key]; C.save();
      const y = window.scrollY; draw(); window.scrollTo(0, y);
    };
    draw();
  }

  function drawStudy(el, p, sp, C) {
    if (!el) return;
    const b = studyBits(p, sp, C, true), P = b.T.path;
    const row = (id) => { const t = C.study.stats([id]); const done = t.left === 0; return `<a class="item" href="#/s/${esc(id)}${done ? '' : '/' + (t.next ? t.next.i : 0)}"><span class="grow">${done ? '&#10003; ' : ''}${esc(C.lessonTitle(id))}</span><span class="pill">${t.seen}/${t.total}</span></a>`; };
    el.innerHTML = `<div class="card">${b.html}
      <h3>Pace</h3><div class="seg pl-pace" role="group" aria-label="Pace">
        <button type="button" class="${b.T.pace === '10' ? 'on' : ''}" data-pace="10">10 min a day</button>
        <button type="button" class="${b.T.pace === 'must' ? 'on' : ''}" data-pace="must">Must know by the hunt${b.T.mustPerDay ? ` (about ${b.T.mustPerDay} min a day)` : ''}</button>
        <button type="button" class="${b.T.pace === 'fit' ? 'on' : ''}" data-pace="fit">All of it by the hunt${b.T.allPerDay ? ` (about ${b.T.allPerDay} min a day)` : ''}</button></div>
      <p class="muted pl-small">Minutes come from each lesson's own time, plus about 2 minutes for 10 cards. A new pace starts tomorrow. You can always read ahead.</p>
      <p class="muted pl-small">Cards use spaced repetition: a card you know comes back in 1 day, then 6 days, then further apart each time. A card you miss comes back tomorrow. Testing yourself this way beats rereading (Roediger and Karpicke, 2006). Assumption: about 12 seconds per card (not measured).</p>
      </div>
      <details class="pl-cat" open><summary>Must know first (${b.T.must.seen}/${b.T.must.total} screens)</summary><div class="list">${P.must.map(row).join('')}</div></details>
      <details class="pl-cat"><summary>Then the rest (${C.study.stats(P.rest).seen}/${C.study.stats(P.rest).total} screens)</summary><div class="list">${P.rest.map(row).join('')}</div></details>`;
    el.querySelectorAll('[data-pace]').forEach((x) => { x.onclick = () => { p.pace = x.dataset.pace; C.save(); drawStudy(el, p, sp, C); C.toast && C.toast(({ fit: 'Pace: all of it by the hunt.', must: 'Pace: must know by the hunt.' }[p.pace] || 'Pace: 10 minutes a day.') + ' Starts tomorrow.'); }; });
  }

  // ---------- Home card ----------
  // ---------- study path (engine in app.js, C.study) ----------
  let Dc = null;
  const nextPlan = (C) => { const t = C.study.dayISO(); return plansOf(C).filter((p) => p.from && (p.to || p.from) >= t).sort((a, b) => (a.from < b.from ? -1 : 1))[0] || null; };
  const fmtDay = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
  function studyBits(p, sp, C, plain) { // plain: leave out today's button (the screen shows it higher up as its one blaze "next action")
    const T = C.study.today(p, sp.lessons), st = T.st, cl = C.study.cardsLeft(), cd = C.study.cardsDone();
    const late = p.from && T.finish > p.from, mustLate = p.from && T.mustFinish > p.from;
    const go = st.next ? `#/s/${esc(st.next.id)}/${st.next.i}` : '#/learn';
    return { T, html: `<div class="pl-study">
      <div class="pl-kv"><span>Today</span><b>${T.leftToday ? `${T.leftToday} screen${T.leftToday === 1 ? '' : 's'}` : 'Screens done &#10003;'}, ${cl ? `${cl} card${cl === 1 ? '' : 's'}` : 'cards done &#10003;'}</b></div>
      ${T.daysToGo != null && (p.to || p.from) >= C.study.dayISO() ? `<div class="pl-kv"><span>Hunt starts</span><b>${T.daysToGo > 0 ? `${T.daysToGo} day${T.daysToGo === 1 ? '' : 's'} to go` : 'Now'}</b></div>` : ''}
      <div class="muted pl-small">Path: ${st.seen} of ${st.total} screens read. Must know: ${T.must.seen} of ${T.must.total}.</div>
      <div class="bar"><i style="width:${Math.round((st.seen / Math.max(1, st.total)) * 100)}%"></i></div>
      <div class="pl-kv"><span>Must know done</span><b>${T.must.left ? fmtDay(T.mustFinish) : 'Done &#10003;'}${mustLate ? ' <span class="pl-late">after hunt starts</span>' : ''}</b></div>
      ${mustLate && T.mustPerDay ? `<p class="pl-small"><b>Heads up:</b> at this pace the must know screens finish after your hunt starts. About ${T.mustPerDay} minutes a day gets them done first. Change the pace in the plan, part 5.</p>` : ''}
      <div class="pl-kv"><span>Whole path done</span><b>${st.left ? fmtDay(T.finish) : 'Done &#10003;'}${late ? ' <span class="pl-late">after hunt starts</span>' : ''}</b></div>
      ${st.next ? `<div class="muted pl-small">Next: ${esc(st.next.title)}</div>` : ''}
      <div class="btn-row">${T.leftToday && st.next ? (plain ? '' : `<a class="btn next" href="${go}">Read today's screens</a>`) : st.next ? `<a class="btn" href="${go}">Read ahead</a>` : ''}${cl ? '<a class="btn primary" href="#/daily">Review cards</a>' : ''}</div>
    </div>` };
  }
  function homeCard(C) {
    const all = plansOf(C).slice(0, 3);
    let study = '';
    const np = C.study && nextPlan(C);
    if (np) {
      if (!Dc) loadData().then((d) => { if (d && d.species.length) { Dc = d; C.refresh && C.refresh(); } }).catch(() => {});
      else if (Dc.byId[np.species]) { try { const b = studyBits(np, Dc.byId[np.species], C, true), nx = b.T.st.next; homeC = C;
        // today's task first: the one blaze button on Home sits right under the title
        const go = b.T.leftToday && nx ? `<a class="btn next block pl-today-go" href="#/s/${esc(nx.id)}/${nx.i}">Read today's ${b.T.leftToday} screen${b.T.leftToday === 1 ? '' : 's'}</a>` : '';
        study = `<div class="card pl-home pl-today"><p class="hero-k">Today's study</p><h2>${esc(planTitle(np, Dc))}</h2><p class="muted pl-small">About ${b.T.minPerDay} minutes today. Must know screens come first, finished before your hunt.</p>${go}${b.html}<a class="pl-small" href="#/plan/${esc(np.id)}">Pace and full path (plan, part 5)</a>${offlineHomeHtml(np)}</div>`; } catch (e) { console.warn('study card', e); } }
    }
    return `${study}<div class="card pl-home"><h2>Plan a hunt</h2><p>Pick an animal, a place and dates. Get the rules, your odds, a day by day plan and a full checklist.</p>
      <a class="btn primary block" href="#/plan/new/0">Plan a hunt</a>
      <div class="btn-row"><a class="btn" href="#/plan/preset/harrison-deer-two">Deer near Harrison, with my brother</a><a class="btn" href="#/plan/preset/harrison-deer-solo">Deer near Harrison, solo</a></div>
      ${C.hasSession && C.hasSession(HARRISON_LESSON) ? `<p class="pl-small"><a href="#/s/${HARRISON_LESSON}">Read first: ${esc(C.lessonTitle(HARRISON_LESSON))}</a></p>` : ''}
      ${all.length ? `<div class="list pl-home-list">${all.map((p) => `<a class="item" href="#/plan/${esc(p.id)}"><span class="grow"><b>${esc(planTitle(p, null))}</b><br><span class="muted">${esc(rangeLabel(p.from, p.to))}</span></span></a>`).join('')}</div>${plansOf(C).length > 3 ? '<a href="#/plan">All my plans</a>' : ''}` : ''}</div>`;
  }

  // ---------- router: #/plan, #/plan/new/<n>, #/plan/<id> ----------
  function route(view, args, C) {
    C.tab('home');
    const [a, b] = args || [];
    view.onchange = null;
    if (!a) return listView(view, C);
    // ready made starts (owner, 2026-10-16): deer near Harrison with a rifle, with the brother or solo; the wizard opens at "When?" with the rest filled in
    // replace the preset entry (not push): Back from "When?" then leaves the wizard instead of reloading the preset
    if (a === 'preset' && PRESETS[b]) { draft = Object.assign({ _preset: true }, PRESETS[b]); saveDraft(); const n = STEPS.indexOf('when'); history.replaceState(history.state, '', `#/plan/new/${n}`); return wizard(view, n, C); }
    if (a === 'new') { if (b == null || b === '') { draft = {}; saveDraft(); } return wizard(view, Math.max(0, Math.min(STEPS.length - 1, +b || 0)), C); }
    return planView(view, a, C);
  }
  // print: open every folded part so the whole plan prints
  window.addEventListener('beforeprint', () => document.querySelectorAll('.pl details:not([open]), .pl-list details:not([open])').forEach((d) => { d.dataset.plClosed = '1'; d.open = true; }));
  window.addEventListener('afterprint', () => document.querySelectorAll('details[data-pl-closed]').forEach((d) => { d.open = false; delete d.dataset.plClosed; }));

  window.HMPlan = { route, homeCard, animalIndex, animalList, _legal: legal, _odds: odds, _spots: spots, _load: loadData, _debriefs: allDebriefs, _ask: askRows, _tags: tagsN };
})();
