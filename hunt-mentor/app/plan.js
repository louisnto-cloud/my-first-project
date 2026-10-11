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
    const scored = [], camps = [];
    for (const f of feats) {
      const p = f.properties || {}, c = f.geometry && f.geometry.coordinates; if (!c) continue;
      const at = { lat: c[1], lon: c[0] }, d = km(pt, at), same = p.mu === plan.where.mu;
      if (!same && d > 45) continue;
      if (p.cat === 'camp') { camps.push({ name: p.name, lat: at.lat, lon: at.lon, km: d, mu: p.mu, same }); continue; }
      if (tag && !(p.species || []).includes(tag)) continue;
      if (p.cat === 'atv' && !acc.includes('atv')) continue;
      if (p.cat === 'backcountry' && !(plan.overnight && acc.includes('walk'))) continue;
      let s = (+p.score || 0) + (same ? 3 : 0) - d / 15;
      if (Array.isArray(p.months) && p.months.length) s += p.months.some((m) => months.includes(m)) ? 1 : -3;
      if (p.cat === 'walk' && acc.includes('walk')) s += 0.5;
      scored.push({ name: p.name, cat: p.cat, busy: p.busy, mu: p.mu, score: p.score, lat: at.lat, lon: at.lon, km: d, s });
    }
    scored.sort((a, b) => b.s - a.s);
    const names = new Set(), list = [];
    for (const x of scored) { if (names.has(x.name)) continue; names.add(x.name); list.push(x); if (list.length >= 7) break; }
    camps.sort((a, b) => (b.same - a.same) || a.km - b.km);
    return { list, camps: camps.slice(0, 2), tag, dataDate: l.dataDate, cert: l.cert };
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
  function planTitle(p, D) { const sp = D && D.byId[p.species]; return `${sp ? sp.name : p.speciesName || 'Hunt'}${p.where.mu ? `, MU ${p.where.mu}` : ''}`; }
  function planProgress(p, D) {
    const sp = D.byId[p.species]; if (!sp) return null;
    const items = checkItems(sp, D.lists, condOf(p));
    return { done: items.filter((i) => p.ticks && p.ticks[i.key]).length, total: items.length };
  }
  const condOf = (p) => ({ method: p.method, access: p.access || [], overnight: !!p.overnight, party: p.party, months: monthsOf(dRange(p.from, p.to)), firstHunt: p.firstHunt !== false });
  // first hunt: yes until there is a saved plan whose last day has passed
  const firstDefault = (C) => !plansOf(C).some((p) => p.to && p.to < todayIso());

  // ---------- wizard ----------
  const STEPS = ['animal', 'where', 'when', 'how', 'access', 'overnight', 'party', 'first'];
  const Q = { animal: 'What animal?', where: 'Where?', when: 'When?', how: 'How will you hunt?', access: 'How do you get in?', overnight: 'Staying overnight?', party: 'Who is going?', first: 'Is this your first hunt?' };
  let draft = null;
  const ss = { get() { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; } }, set(v) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch (e) { /* storage blocked */ } } };
  const getDraft = () => (draft = draft || ss.get() || {});
  const saveDraft = () => ss.set(draft);
  const answered = (d, k) => (k === 'animal' ? !!d.species : k === 'where' ? !!(d.where && d.where.mu) : k === 'when' ? !!(d.from && d.to) : k === 'how' ? !!d.method : k === 'access' ? !!(d.access && d.access.length) : k === 'overnight' ? d.overnight != null : k === 'party' ? !!d.party : d.firstHunt != null);
  const goStep = (n) => { location.hash = `#/plan/new/${n}`; };

  async function wizard(view, n, C) {
    const D = await loadData();
    if (!D.species.length) { view.innerHTML = noData(); return; }
    const d = getDraft();
    const first = STEPS.findIndex((k) => !answered(d, k));
    if (first > -1 && n > first) n = first;
    const k = STEPS[n];
    C.setTitle(d.editId ? 'Change the plan' : 'Plan a hunt');
    const sp = D.byId[d.species];
    const head = `<div class="pl-wiz-h"><div class="muted">Question ${n + 1} of ${STEPS.length}${sp && n > 0 ? `: ${esc(sp.name)}` : ''}</div><div class="bar"><i style="width:${Math.round(((n + 1) / STEPS.length) * 100)}%"></i></div>
      <h2 class="pl-q">${Q[k]}</h2></div>`;
    const done = (patch) => { Object.assign(d, patch); saveDraft(); if (n < STEPS.length - 1) goStep(n + 1); else finish(C, D); };
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
        <div id="pl-msg" class="pl-msg" role="status"></div><button type="button" class="btn primary block" id="pl-next">Next</button>`;
    } else if (k === 'how') {
      const ms = (sp && sp.methods) || [];
      const fitTxt = { best: 'Best fit', ok: 'Works', no: 'Not a fit' };
      body = ms.length ? `<div class="pl-opts">${ms.map((m) => `<button type="button" class="pl-opt${m.fit === 'no' ? ' off' : ''}${d.method === m.id ? ' on' : ''}" data-m="${esc(m.id)}" ${m.fit === 'no' ? 'disabled' : ''}>${esc(m.label || METHOD_LABEL[m.id] || m.id)} <span class="pill ${m.fit === 'best' ? 'soon' : ''}">${fitTxt[m.fit] || ''}</span><small>${esc(m.note || '')}${m.cert != null ? ' ' + C.certBadge(m.cert) : ''}</small></button>`).join('')}</div>`
        : `<div class="pl-opts">${Object.entries(METHOD_LABEL).map(([id, l]) => `<button type="button" class="pl-opt${d.method === id ? ' on' : ''}" data-m="${id}">${l}</button>`).join('')}</div>`;
    } else if (k === 'access') {
      const a = d.access || [];
      body = `<p class="muted">Pick all that apply.</p><div class="pl-opts">${ACCESS.map(([id, l]) => `<button type="button" class="pl-opt pl-tog${a.includes(id) ? ' on' : ''}" data-acc="${id}" aria-pressed="${a.includes(id)}">${esc(l)}</button>`).join('')}</div>
        <button type="button" class="btn primary block" id="pl-next" ${a.length ? '' : 'disabled'}>Next</button>`;
    } else if (k === 'overnight') {
      body = `<div class="pl-opts pl-two"><button type="button" class="pl-opt${d.overnight === true ? ' on' : ''}" data-on="1">Yes<small>Camp or stay out</small></button><button type="button" class="pl-opt${d.overnight === false ? ' on' : ''}" data-on="0">No<small>Home each night</small></button></div>`;
    } else if (k === 'first') {
      const fh = d.firstHunt != null ? d.firstHunt : firstDefault(C);
      body = `<p class="muted">Yes adds a first hunt list: the extra steps that are easy to miss the first time.</p><div class="pl-opts pl-two"><button type="button" class="pl-opt${fh ? ' on' : ''}" data-fh="1">Yes<small>First time out</small></button><button type="button" class="pl-opt${!fh ? ' on' : ''}" data-fh="0">No<small>I have hunted before</small></button></div>`;
    } else if (k === 'party') {
      body = `<div class="pl-opts">${PARTY.map(([id, l]) => `<button type="button" class="pl-opt${d.party === id ? ' on' : ''}" data-party="${id}">${esc(l)}</button>`).join('')}</div>`;
    }
    view.innerHTML = `<div class="pl-wiz">${head}${body}<div class="btn-row pl-wiz-foot">${n > 0 ? '<button type="button" class="btn" id="pl-back">Back</button>' : '<a class="btn" href="#/plan">My plans</a>'}<button type="button" class="btn" id="pl-reset">Start over</button></div>
      <p class="muted pl-small">Study aid only. The official regulations are the law.</p></div>`;
    const $ = (s) => view.querySelector(s);
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
    const base = { species: d.species, speciesName: sp ? sp.name : '', where: d.where, from: d.from, to: d.to, method: d.method, access: d.access, overnight: !!d.overnight, party: d.party, firstHunt: d.firstHunt !== false };
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
    view.innerHTML = `<a class="btn primary block pl-new" href="#/plan/new/0">Plan a new hunt</a>
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
    view.innerHTML = `<div class="pl" id="pl">
      <p class="pl-law">Study aid only. The official regulations are the law.</p>
      <div class="card pl-sum"><h2>${esc(sp.name)}</h2>
        <div class="pl-kv"><span>Where</span><b>${esc(p.where.label)}${p.where.mu ? `, MU (Management Unit) ${esc(p.where.mu)}` : ''}</b></div>
        <div class="pl-kv"><span>When</span><b>${esc(rangeLabel(p.from, p.to))} (${days.length} day${days.length === 1 ? '' : 's'})</b></div>
        <div class="pl-kv"><span>How</span><b>${esc(((sp.methods || []).find((m) => m.id === p.method) || {}).label || METHOD_LABEL[p.method] || p.method || '')}</b></div>
        <div class="pl-kv"><span>Access</span><b>${esc(accessLabel(p.access))}</b></div>
        <div class="pl-kv"><span>Overnight</span><b>${p.overnight ? 'Yes' : 'No'}</b></div>
        <div class="pl-kv"><span>Party</span><b>${esc(partyLabel(p.party))}</b></div>
        <div class="pl-kv"><span>First hunt</span><b>${p.firstHunt !== false ? 'Yes' : 'No'}</b></div>
        <div class="pl-acts no-print"><button type="button" class="btn" id="pl-share">Share</button><button type="button" class="btn" id="pl-print">Print</button><button type="button" class="btn" id="pl-edit">Change</button><button type="button" class="btn" id="pl-del">Delete</button></div>
      </div>
      <nav class="pl-nav no-print" aria-label="Plan sections"><button type="button" data-go="pl-s1">1 Legal</button><button type="button" data-go="pl-s2">2 Odds</button><button type="button" data-go="pl-s3">3 Days</button><button type="button" data-go="pl-s4">4 Checklist</button></nav>
      <section class="pl-sec" id="pl-s1"><h2 class="pl-sh">1. Legal and open</h2><div id="pl-legal"><p class="muted">Checking the season tables...</p></div></section>
      <section class="pl-sec" id="pl-s2"><h2 class="pl-sh">2. Odds</h2><div id="pl-odds"><p class="muted">Loading harvest numbers...</p></div></section>
      <section class="pl-sec" id="pl-s3"><h2 class="pl-sh">3. Day by day</h2><div id="pl-days"><p class="muted">Building your days...</p></div></section>
      <section class="pl-sec" id="pl-s4"><h2 class="pl-sh">4. Checklist</h2><div id="pl-check"></div></section>
    </div>`;
    const $ = (s) => view.querySelector(s);
    const m = (memo[p.id] = { p, sp });

    // actions
    $('#pl-print').onclick = () => window.print();
    $('#pl-edit').onclick = () => { draft = { species: p.species, where: p.where, from: p.from, to: p.to, method: p.method, access: p.access, overnight: p.overnight, party: p.party, firstHunt: p.firstHunt !== false, editId: p.id }; saveDraft(); goStep(0); };
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
    const secs = ['pl-s1', 'pl-s2', 'pl-s3', 'pl-s4'].map((s) => view.querySelector('#' + s));
    const onScroll = () => {
      if (!alive()) { window.removeEventListener('scroll', onScroll); return; }
      const off = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 56) + nav.offsetHeight + 40;
      let cur = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top < off) cur = i; });
      nav.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === cur));
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

    // 2. odds
    let od; try { od = await odds(p, sp, lg); } catch (e) { od = { missing: true }; }
    if (!alive()) return;
    m.odds = od;
    od.shared = D.species.filter((x) => x.id !== sp.id && x.harvestKey && sp.harvestKey && x.harvestKey === sp.harvestKey).map((x) => x.name);
    $('#pl-odds').innerHTML = oddsHtml(od, sp, p, lg, C);

    // 3. days (spots fill in after)
    $('#pl-days').innerHTML = daysHtml(sp, p, lg, C, H) + '<div id="pl-spots"><div class="card"><h3>Top spots</h3><p class="muted">Finding candidate spots near the MU...</p></div></div>';
    let st = null;
    try { st = await spots(p, sp); } catch (e) { st = null; }
    if (!alive()) return;
    if (st && st.list.length) { p.spots = { at: todayIso(), list: st.list.slice(0, 7), camps: st.camps }; C.save(); }
    else if ((!st || !st.list.length) && p.spots && p.spots.list.length) st = Object.assign({ saved: p.spots.at }, p.spots);
    m.spots = st;
    $('#pl-spots').innerHTML = spotsHtml(st, sp, p, C);
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
    const n = partyN(p.party);
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
      ${huntDays ? `<li>Rough math (Tip): at the average rate, your ${huntDays} hunt day${huntDays === 1 ? '' : 's'} give ${r5(you)}${n > 1 ? `, and ${r5(party)} that someone in your party of ${n} gets one` : ''}.</li>` : '<li>Your dates have no open hunt days, so the chance is 0 on these dates.</li>'}
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
        ${open ? `<div class="pl-kv"><span>Open for</span><b>${esc(lg.dayOpen[d].join(', '))}</b></div>` : ''}${body}</details>`;
    }).join('');
    const phases = [...new Set(days.map((d) => +d.slice(5, 7)))].map((mo) => (sp.phases || []).find((ph) => (ph.months || []).includes(mo))).filter(Boolean);
    const uniq = [...new Set(phases)];
    const tactics = (sp.tactics || []);
    return `<p class="muted pl-small">Sun times worked out on your phone for ${esc(p.where.label)}${p.where.src === 'typed' ? ' (centre of the MU, approximate)' : ''}, Pacific time. Can be a few minutes off in valleys. ${hrs ? `Legal light: ${esc(H.label.toLowerCase())} rule. ${C.certBadge(hrs.certainty)}` : ''} Times of day plans are Tip (opinion).</p>
      ${nS === 0 ? `<div class="card pl-scout"><h3>Scout before you go</h3><ul>${(sp.dayPlan && sp.dayPlan.scout || []).map((t) => `<li>${esc(t)}</li>`).join('') || '<li>One trip before the hunt to learn the ground.</li>'}</ul><p class="muted pl-small">Your dates are short, so there is no scout day inside them (Tip).</p></div>` : ''}
      ${uniq.map((ph) => `<div class="card"><h3>${esc(ph.label)}: what the animals do</h3>${(ph.where || []).length ? `<p><b>Where</b></p><ul>${ph.where.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${(ph.tactics || []).length ? `<p><b>Tactics</b> (Tip)</p><ul>${ph.tactics.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${ph.cert != null ? `<p class="muted pl-small">${C.certBadge(ph.cert)}</p>` : ''}</div>`).join('')}
      ${cards}
      ${tactics.length ? `<details class="card pl-more"><summary>Tactics: options, pros and cons (Tip)</summary>${tactics.map((t) => `<div class="pl-tac"><h3>${esc(t.name)}</h3>${t.best ? `<p class="muted">Best: ${esc(t.best)}</p>` : ''}${(t.steps || []).length ? `<ol>${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}<div class="pl-pc">${(t.pros || []).length ? `<div><b>Pros</b><ul>${t.pros.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}${(t.cons || []).length ? `<div><b>Cons</b><ul>${t.cons.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}</div></div>`).join('')}</details>` : ''}
      ${sp.shot ? `<div class="card"><h3>The shot</h3><ul>${sp.shot.range ? `<li><b>Range:</b> ${esc(sp.shot.range)}</li>` : ''}${sp.shot.aim ? `<li><b>Aim:</b> ${esc(sp.shot.aim)}</li>` : ''}</ul>${sp.shot.cert != null ? C.certBadge(sp.shot.cert) : ''} ${C.hasSession('shot-placement') ? '<a href="#/s/shot-placement">Shot placement lesson</a>' : ''}</div>` : ''}
      ${(sp.afterKill || []).length ? `<div class="card"><h3>After the kill</h3><ol>${sp.afterKill.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>` : ''}
      ${(sp.mistakes || []).length ? `<div class="card"><h3>Beginner mistakes to skip</h3><ul>${sp.mistakes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}`;
  }

  function spotsHtml(st, sp, p, C) {
    if (!st) return '<div class="card"><h3>Top spots</h3><p class="muted">Could not load spots. Open the Map once with signal.</p></div>';
    const top = st.list.slice(0, 5), backup = st.list.slice(5, 7);
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
    return `<div class="card"><h3>Top ${top.length || ''} candidate spots</h3>
      ${top.length ? `<ol class="pl-spots">${top.map((x, i) => li(x, i + 1)).join('')}</ol>` : `<p class="muted">${esc(st.none || 'No matching candidate spots near this MU in the app.')}</p>`}
      <p class="muted pl-small">Candidate spots from open data, my pick, not proven hunting spots. Scout it first. Check land status and closures on the map. ${C.certBadge(st.cert != null ? st.cert : 60)}${st.saved ? ` Saved copy from ${esc(st.saved)}.` : ''}</p></div>
      ${p.overnight && st.camps && st.camps.length ? `<div class="card"><h3>Camps nearby</h3><ul>${st.camps.map((c) => `<li>${esc(c.name)}, ${Math.round(c.km)} km. <a href="${mapLink(c)}">Map</a> <a href="${gmaps(c)}" target="_blank" rel="noopener">Google Maps</a></li>`).join('')}</ul></div>` : ''}
      <div class="card"><h3>Backup plan</h3><p class="muted pl-small">Tip (opinion).</p><ul>${backupLines.map((t) => `<li>${t}</li>`).join('')}</ul></div>`;
  }

  // ---------- share ----------
  function shareText(m, D, C) {
    const { p, sp } = m, L = [];
    L.push(`Hunt plan: ${sp.name}`);
    L.push(`Where: ${p.where.label}${p.where.mu ? `, MU (Management Unit) ${p.where.mu}` : ''}`);
    L.push(`When: ${rangeLabel(p.from, p.to)}`);
    L.push(`How: ${METHOD_LABEL[p.method] || p.method}. Access: ${accessLabel(p.access)}. Overnight: ${p.overnight ? 'yes' : 'no'}. Party: ${partyLabel(p.party)}.`);
    if (m.legal) L.push(`Legal: ${{ open: 'Open', no: 'Not open', check: 'Check' }[m.legal.verdict]}. ${m.legal.why}`);
    if (m.odds && m.odds.pct != null) L.push(`Odds: ${Math.round(m.odds.pct)}% of resident hunters got one, 2020 to 2024 average (${m.odds.scope === 'mu' ? 'MU' : 'region'}). 90% is ${m.odds.pct >= 90 ? 'possible but not promised' : 'not realistic'}.`);
    else if (m.odds && m.odds.none) L.push('Odds: no official success numbers for this animal.');
    if (m.spots && m.spots.list && m.spots.list.length) { L.push('Top spots (candidates, scout first):'); m.spots.list.slice(0, 5).forEach((x, i) => L.push(`${i + 1}. ${x.name}: ${gmaps(x)}`)); }
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

  // ---------- Home card ----------
  function homeCard(C) {
    const all = plansOf(C).slice(0, 3);
    return `<div class="card pl-home"><h2>Plan a hunt</h2><p>Pick an animal, a place and dates. Get the rules, your odds, a day by day plan and a full checklist.</p>
      <a class="btn primary block" href="#/plan/new/0">Plan a hunt</a>
      ${all.length ? `<div class="list pl-home-list">${all.map((p) => `<a class="item" href="#/plan/${esc(p.id)}"><span class="grow"><b>${esc(planTitle(p, null))}</b><br><span class="muted">${esc(rangeLabel(p.from, p.to))}</span></span></a>`).join('')}</div>${plansOf(C).length > 3 ? '<a href="#/plan">All my plans</a>' : ''}` : ''}</div>`;
  }

  // ---------- router: #/plan, #/plan/new/<n>, #/plan/<id> ----------
  function route(view, args, C) {
    C.tab('home');
    const [a, b] = args || [];
    view.onchange = null;
    if (!a) return listView(view, C);
    if (a === 'new') { if (b == null || b === '') { draft = {}; saveDraft(); } return wizard(view, Math.max(0, Math.min(STEPS.length - 1, +b || 0)), C); }
    return planView(view, a, C);
  }
  // print: open every folded part so the whole plan prints
  window.addEventListener('beforeprint', () => document.querySelectorAll('.pl details:not([open]), .pl-list details:not([open])').forEach((d) => { d.dataset.plClosed = '1'; d.open = true; }));
  window.addEventListener('afterprint', () => document.querySelectorAll('details[data-pl-closed]').forEach((d) => { d.open = false; delete d.dataset.plClosed; }));

  window.HMPlan = { route, homeCard, animalIndex, animalList, _legal: legal, _odds: odds, _spots: spots, _load: loadData };
})();
