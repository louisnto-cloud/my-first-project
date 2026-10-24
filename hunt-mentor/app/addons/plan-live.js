/* Hunt Mentor add on: live conditions for a saved hunt plan (prompt 2026-10-23 plan trip v2, part 3).
   API (plan.js calls it when present; it does not edit plan.js):
     HMPlanLive.fetch(plan, points[]) -> Promise<live>
       plan: the saved plan (id, where.lat/lon/mu, from, to, species, party, access, overnight)
       points: [{ id, name?, lat, lon, elev? }] the top spots (max 6 used); empty = the plan point
       live: { asOf, perPoint:[{ id, name, lat, lon, elev, hourly:[{ t, windDir, windKmh, gustKmh, rainMm, rainPct, tempC,
               freezingLevelM, snowCm, code }] }], days:[{ date, legalStart, legalEnd, sunrise, sunset, moon, forecast,
               forecastFrom, rut, climate }], rut:{ phase, cert, source, ... }, roads:{ asOf, items, link, live, ... },
               fireBans:{ asOf, items, link }|null, stale, offline, errors }
       Times: legalStart, legalEnd, sunrise, sunset and asOf are epoch ms; hourly t is Pacific wall clock "YYYY-MM-DDTHH:00".
     HMPlanLive.html(live, plan) -> HTML string. HMPlanLive.mount(el, plan, points) fetches, draws and wires Refresh.
     HMPlanLive.cached(planId) -> the saved copy or null.
   Live sources (fetched when online, saved in localStorage hm.planlive.<planId> for no signal, shown with "as of"):
     Open-Meteo forecast (CC BY 4.0, about 16 days ahead; later days show climate and rules, never a made up forecast),
     BC government Forest Service Road Safety Information layer (South Coast), BC Wildfire Service bans layer.
   Offline: sun, legal light, moon and rut are worked out on the phone; road lines fall back to the lesson's saved list. */
(function () {
  'use strict';
  const TZ = 'America/Vancouver';
  const LS = 'hm.planlive.';
  const DATA_URL = 'data/addons/plan-live/plan-live.json';
  const OM = 'https://api.open-meteo.com/v1/forecast';
  const FORECAST_DAYS = 16; // Open-Meteo: today plus 15 days
  const STALE_MS = 6 * 36e5;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const badge = (v) => (v == null ? '<span class="pill">Tip</span>' : `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}" title="Certainty">${v}%</span>`);
  const ld = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const hasSession = (id) => !!(window.HM && window.HM.lessonFiles && window.HM.lessonFiles[id]);
  const lessonA = (id, t) => (id && hasSession(id) ? `<a href="#/s/${esc(id)}">${esc(t || 'Lesson')}</a>` : '');

  // ---------- dates and times (Pacific) ----------
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const dAdd = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const dRange = (a, b) => { const out = []; if (!a) return out; for (let x = a; x <= (b || a) && out.length < 62; x = dAdd(x, 1)) out.push(x); return out; };
  const dLabel = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
  const fmtT = (ms) => (ms == null ? 'n/a' : new Date(ms).toLocaleTimeString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }));
  const fmtDT = (ms) => new Date(ms).toLocaleString('en-CA', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const hourKey = (ms) => new Date(ms).toLocaleString('sv-SE', { timeZone: TZ }).slice(0, 13).replace(' ', 'T');
  const hourLabel = (key) => { const h = +String(key).slice(11, 13); return `${h % 12 || 12} ${h < 12 ? 'a.m.' : 'p.m.'}`; };

  // ---------- small helpers ----------
  const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const C8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const C8W = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const dir8 = (d) => (d == null ? '' : C8[Math.round((((d % 360) + 360) % 360) / 45) % 8]);
  const dirWord = (d) => (d == null ? '' : C8W[Math.round((((d % 360) + 360) % 360) / 45) % 8]);
  function getJ(url, ms = 15000) {
    const ac = typeof AbortController === 'function' ? new AbortController() : null; const t = ac && setTimeout(() => ac.abort(), ms);
    return fetch(url, { credentials: 'omit', signal: ac && ac.signal }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).finally(() => t && clearTimeout(t));
  }
  let dataP = null;
  const loadData = () => (dataP = dataP || getJ(DATA_URL).catch((e) => { dataP = null; return null; }));
  const planKey = (plan) => LS + (plan && plan.id ? plan.id : 'p' + Math.abs([...JSON.stringify([plan && plan.where && plan.where.mu, plan && plan.from, plan && plan.to])].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 7)).toString(36));
  const isMig = (plan) => /duck|goose|geese|brant|teal|mallard|snipe|dove|pigeon|waterfowl|migratory/i.test(String(plan && plan.species));
  const regionOf = (mu) => (String(mu || '').match(/^(\d{1,2})-/) || [])[1] || '';

  // ---------- moon (same formula as home.js: mean synodic month from the new moon of 6 January 2000) ----------
  function moon(ms) {
    const syn = 29.530588853, age = ((((ms - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % syn) + syn) % syn;
    const lit = Math.round(((1 - Math.cos((2 * Math.PI * age) / syn)) / 2) * 100);
    const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
    // name by how much is lit (35% lit is still a crescent; quarter is about 50%)
    const wax = age < syn / 2, q = lit < 3 ? 0 : lit < 45 ? 1 : lit <= 55 ? 2 : lit < 97 ? 3 : 4;
    return { lit, name: q === 0 ? names[0] : q === 4 ? names[4] : wax ? names[q] : names[8 - q] };
  }

  // ---------- sun and legal light per day (app.js sunEvent, regs.json hours) ----------
  function dayLight(iso, pt, mig) {
    const S = window.HuntMentor, H = (window.HM && window.HM.regs && window.HM.regs.hours) || {};
    const h = mig ? H.migratory : H.bigGame;
    const [y, m, d] = iso.split('-').map(Number), noon = new Date(y, m - 1, d, 12);
    const rise = S && S.sunEvent && pt ? S.sunEvent(noon, pt.lat, pt.lon, true) : null, set = S && S.sunEvent && pt ? S.sunEvent(noon, pt.lat, pt.lon, false) : null;
    const ok = rise && set && h && h.beforeSunriseMin != null;
    return { sunrise: rise ? +rise : null, sunset: set ? +set : null, legalStart: ok ? +rise - (h.beforeSunriseMin - 2) * 6e4 : null, legalMarginMin: 2, legalEnd: ok ? +set + h.afterSunsetMin * 6e4 : null, rule: h ? h.text : null, ruleCert: h ? h.certainty : null };
  }

  // ---------- rut (Masterclass) ----------
  function rutFor(D, plan, iso) {
    if (!D || !Array.isArray(D.rut)) return null;
    const reg = regionOf(plan.where && plan.where.mu), mmdd = iso.slice(5);
    const R = D.rut.find((r) => (r.species || []).includes(plan.species) && (r.regions || []).includes(reg));
    if (!R) return /deer|elk|moose/.test(String(plan.species)) ? { phase: 'VERIFY', cert: null, source: D.rutOther && D.rutOther.t, lesson: D.rutOther && D.rutOther.lesson, verify: true } : null;
    const ph = (R.phases || []).find((p) => mmdd >= p.from && mmdd <= p.to);
    return { phase: ph ? ph.phase : 'Outside the rut', t: ph ? ph.t : '', cert: ph ? ph.cert : null, source: R.src, lesson: R.lesson, label: R.label, note: R.verify, phases: R.phases };
  }

  // ---------- Open-Meteo, one call for every point ----------
  async function fetchWx(points, a, b) {
    const u = `${OM}?latitude=${points.map((p) => (+p.lat).toFixed(4)).join(',')}&longitude=${points.map((p) => (+p.lon).toFixed(4)).join(',')}`
      + '&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m,freezing_level_height,snowfall,weather_code'
      + `&wind_speed_unit=kmh&timezone=${encodeURIComponent(TZ)}&start_date=${a}&end_date=${b}`;
    let j = await getJ(u, 20000);
    if (!Array.isArray(j)) j = [j];
    return points.map((p, i) => {
      const x = j[i] || {}, H = x.hourly || {}, n = (H.time || []).length, at = (k, q) => (H[k] && H[k][q] != null ? H[k][q] : null);
      const hourly = [];
      for (let q = 0; q < n; q++) hourly.push({ t: H.time[q], windDir: at('wind_direction_10m', q), windKmh: at('wind_speed_10m', q), gustKmh: at('wind_gusts_10m', q), rainMm: at('precipitation', q), rainPct: at('precipitation_probability', q), tempC: at('temperature_2m', q), freezingLevelM: at('freezing_level_height', q), snowCm: at('snowfall', q), code: at('weather_code', q) });
      return { id: p.id, name: p.name || '', lat: +p.lat, lon: +p.lon, elev: p.elev != null ? p.elev : x.elevation != null ? x.elevation : null, modelElev: x.elevation != null ? x.elevation : null, hourly };
    });
  }

  // ---------- road notices: official layer if reachable, else the lesson's saved lines ----------
  async function fetchRoads(D, pt) {
    const F = D.roads.feed;
    const q = `where=1%3D1&geometry=${pt.lon},${pt.lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=40&units=esriSRUnit_Kilometer&outFields=ALERT_TYPE,LOCATION,INFORMATION,NOTICE,Contact&outSR=4326&returnGeometry=true&f=json`;
    const [d, info] = await Promise.all([getJ(`${F.url}/query?${q}`), getJ(`${F.url}?f=json`).catch(() => null)]);
    if (d.error) throw new Error(d.error.message || 'road layer error');
    const items = (d.features || []).map((f) => { const a = f.attributes || {}, g = f.geometry || {};
      const kind = /closure/i.test(a.ALERT_TYPE) ? 'closure' : 'warning'; // the official type; closed = the words say no access
      return { kind, closed: kind === 'closure' || /\bclosed\b|no (vehicle )?access/i.test(a.INFORMATION || ''), type: a.ALERT_TYPE || '', road: a.LOCATION || '', t: a.INFORMATION || '', notice: a.NOTICE || '', contact: a.Contact || '', lat: g.y, lon: g.x, km: g.y != null ? km(pt, { lat: g.y, lon: g.x }) : null };
    }).sort((x, y) => (x.kind === y.kind ? (x.km || 0) - (y.km || 0) : x.kind === 'closure' ? -1 : 1));
    const edited = info && info.editingInfo && info.editingInfo.dataLastEditDate;
    return { live: true, asOf: Date.now(), edited: edited || null, items, link: D.roads.page.url, linkName: D.roads.page.name, map: F.map, src: F.name, cert: F.cert, covers: F.covers };
  }
  function savedRoads(D, plan) {
    const S = D && D.roads && D.roads.saved, reg = regionOf(plan.where && plan.where.mu);
    if (S && (S.regions || []).includes(reg)) return { live: false, saved: true, asOf: null, checked: S.checked, pageUpdated: S.pageUpdated, items: S.items, link: D.roads.page.url, linkName: D.roads.page.name, lesson: S.lesson, cert: S.cert };
    return { live: false, saved: false, asOf: null, items: [], link: D ? D.roads.allBc.url : 'https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/local-road-safety-information', linkName: D ? D.roads.allBc.name : 'BC local road safety information' };
  }

  // ---------- fire bans (BC Wildfire Service layer, as in the Safety conditions check) ----------
  async function fetchBans(D, pt) {
    const q = `where=1%3D1&geometry=${pt.lon},${pt.lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=TYPE,ACCESS_PROHIBITION_DESCRIPTION,ACCESS_STATUS_EFFECTIVE_DATE,FIRE_CENTRE_NAME,BULLETIN_URL&returnGeometry=false&f=json`;
    const d = await getJ(`${D.fire.feed}/query?${q}`);
    if (d.error) throw new Error(d.error.message || 'bans layer error');
    return { asOf: Date.now(), items: (d.features || []).map((f) => f.attributes || {}).map((a) => ({ type: a.TYPE || '', t: a.ACCESS_PROHIBITION_DESCRIPTION || '', from: a.ACCESS_STATUS_EFFECTIVE_DATE || null, centre: a.FIRE_CENTRE_NAME || '', url: a.BULLETIN_URL || '' })), link: D.fire.page, cert: D.fire.cert };
  }

  // ---------- the main fetch ----------
  async function fetchLive(plan, points) {
    const D = await loadData();
    const key = planKey(plan), old = ld(key);
    const pt = plan.where && plan.where.lat != null ? { lat: +plan.where.lat, lon: +plan.where.lon } : null;
    let pts = (points || []).filter((p) => p && p.lat != null && p.lon != null).slice(0, 6).map((p) => ({ id: String(p.id || `${p.lat},${p.lon}`), name: p.name || '', lat: +p.lat, lon: +p.lon, elev: p.elev != null ? +p.elev : p.detail && p.detail.elev != null ? +p.detail.elev : null }));
    if (!pts.length && pt) pts = [{ id: 'plan', name: (plan.where && plan.where.label) || 'Plan point', lat: pt.lat, lon: pt.lon, elev: null }];
    const center = pt || (pts[0] ? { lat: pts[0].lat, lon: pts[0].lon } : null);
    const mig = isMig(plan), today = todayIso(), last = dAdd(today, FORECAST_DAYS - 1);
    const dates = dRange(plan.from, plan.to);
    const days = dates.map((iso) => {
      const L = dayLight(iso, center, mig);
      const mo = +iso.slice(5, 7), clim = D && D.climate && D.climate[regionOf(plan.where && plan.where.mu)] && D.climate[regionOf(plan.where && plan.where.mu)][String(mo)];
      return Object.assign({ date: iso, moon: moon(Date.parse(iso + 'T20:00:00Z')), forecast: iso >= today && iso <= last, past: iso < today, forecastFrom: iso > last ? dAdd(iso, -(FORECAST_DAYS - 1)) : null, rut: rutFor(D, plan, iso), climate: clim || null }, L);
    });
    const live = { v: 1, planId: plan.id || null, asOf: Date.now(), perPoint: [], days, rut: days.length ? days[Math.floor((days.length - 1) / 2)].rut : null, roads: null, fireBans: null, stale: false, offline: navigator.onLine === false, errors: {}, mig, center, data: !!D };
    const wxDates = dates.filter((x) => x >= today && x <= last);
    const online = navigator.onLine !== false;
    const jobs = [];
    // weather
    if (wxDates.length && pts.length) {
      jobs.push((online ? fetchWx(pts, wxDates[0], wxDates[wxDates.length - 1]) : Promise.reject(new Error('offline'))).then((v) => { live.perPoint = v; live.wxAsOf = Date.now(); }, (e) => {
        live.errors.wx = String(e && e.message || e);
        if (old && old.perPoint && old.perPoint.length) { live.perPoint = old.perPoint; live.wxAsOf = old.wxAsOf || old.asOf; live.stale = true; }
      }));
    } else if (old && old.perPoint) { live.perPoint = old.perPoint.map((p) => Object.assign({}, p, { hourly: (p.hourly || []).filter((h) => dates.includes(String(h.t).slice(0, 10))) })); live.wxAsOf = old.wxAsOf; }
    // roads
    if (D && center) {
      jobs.push((online ? fetchRoads(D, center) : Promise.reject(new Error('offline'))).then((v) => { live.roads = v; }, (e) => {
        live.errors.roads = String(e && e.message || e);
        live.roads = old && old.roads && old.roads.live ? Object.assign({}, old.roads, { stale: true }) : savedRoads(D, plan);
      }));
      jobs.push((online ? fetchBans(D, center) : Promise.reject(new Error('offline'))).then((v) => { live.fireBans = v; }, (e) => {
        live.errors.bans = String(e && e.message || e);
        live.fireBans = old && old.fireBans ? Object.assign({}, old.fireBans, { stale: true }) : null;
      }));
    } else if (!D) { live.errors.data = 'plan live data not saved'; if (old) { live.roads = old.roads || null; live.fireBans = old.fireBans || null; } }
    await Promise.all(jobs);
    if (Object.keys(live.errors).length && old) live.stale = true;
    if (live.wxAsOf && Date.now() - live.wxAsOf > STALE_MS) live.stale = true;
    // keep a copy for no signal: only save when something live came in
    if (!live.errors.wx || !live.errors.roads || !live.errors.bans) sv(key, Object.assign({}, live, { asOf: live.wxAsOf || live.asOf }));
    if (live.errors.wx && old) live.asOf = old.asOf;
    return live;
  }

  // ---------- pictures ----------
  const ARW = (from, x, y, s) => `<g transform="translate(${x} ${y}) rotate(${((from + 180) % 360).toFixed(0)})"><path d="M0 ${-s} ${s * 0.62} ${s * 0.35}H${s * 0.2}V${s}H${-s * 0.2}V${s * 0.35}H${-s * 0.62}Z" class="pll-arw"/></g>`;
  // wind strip for one day at one point: 6 slots across legal light, arrow = where the wind blows to, number = km/h, bar = rain mm
  function windStrip(day, P) {
    if (!P || !day.legalStart) return '';
    const by = new Map((P.hourly || []).map((h) => [h.t.slice(0, 13), h]));
    const a = new Date(day.legalStart), sH = +hourKey(+a).slice(11, 13), eH = +hourKey(day.legalEnd).slice(11, 13);
    const step = Math.max(1, Math.ceil((eH - sH) / 5)), slots = [];
    for (let h = sH; h <= eH && slots.length < 6; h += step) { const k = `${day.date}T${String(h).padStart(2, '0')}`; if (by.has(k)) slots.push([k, by.get(k)]); }
    if (!slots.length) return '';
    const W = 340, gap = W / slots.length;
    const cells = slots.map(([k, h], i) => { const x = gap * i + gap / 2, rain = Math.min(1, (h.rainMm || 0) / 4) * 22, calm = h.windKmh == null || h.windKmh < 2;
      return `<text x="${x}" y="16" class="pll-t" text-anchor="middle">${hourLabel(k)}</text>${calm ? `<text x="${x}" y="50" class="pll-t" text-anchor="middle">calm</text>` : ARW(h.windDir, x, 44, 13)}
        <text x="${x}" y="82" class="pll-n" text-anchor="middle">${h.windKmh != null ? Math.round(h.windKmh) : ''}</text>
        <rect x="${x - 10}" y="${116 - rain}" width="20" height="${Math.max(rain, 1)}" class="pll-rain"/><text x="${x}" y="134" class="pll-t" text-anchor="middle">${h.rainMm != null ? (+h.rainMm).toFixed(1) : ''}</text>`; }).join('');
    return `<svg class="pll-strip" viewBox="0 0 ${W} 140" role="img" aria-label="Wind and rain by hour at ${esc(P.name || 'the spot')}: time, arrow showing where the wind blows, wind in kilometres per hour, rain in millimetres"><line x1="0" y1="117" x2="${W}" y2="117" class="pll-ax"/>${cells}</svg>
      <p class="pll-small muted">Arrow: where the wind blows to. Number: wind km/h. Bar: rain mm in that hour.</p>`;
  }
  // rut picture: Sept to Dec bar, phases shaded, your days marked
  function rutBar(rut, days) {
    if (!rut || !rut.phases) return '';
    const doy = (mmdd) => { const [m, d] = mmdd.split('-').map(Number); return Date.UTC(2026, m - 1, d) / 864e5; };
    const a = doy('09-01'), b = doy('12-31'), W = 340, X = (mmdd) => 4 + ((doy(mmdd) - a) / (b - a)) * (W - 8);
    const cls = ['pll-r0', 'pll-r1', 'pll-r2', 'pll-r3'];
    const segs = rut.phases.map((p, i) => `<rect x="${X(p.from)}" y="24" width="${Math.max(2, X(p.to) - X(p.from))}" height="22" class="${cls[i % 4]}"/>`).join('');
    const months = [['09-01', 'Sep'], ['10-01', 'Oct'], ['11-01', 'Nov'], ['12-01', 'Dec']].map(([d, l]) => `<text x="${X(d) + 2}" y="66" class="pll-t">${l}</text>`).join('');
    const mine = days.map((d) => d.date.slice(5)).filter((x) => x >= '09-01').map((x) => `<path d="M${X(x)} 20 l-6 -12 h12 Z" class="pll-you"/>`).join('');
    return `<svg class="pll-rut" viewBox="0 0 ${W} 72" role="img" aria-label="Rut phases from September to December with your hunt days marked">${segs}${mine}${months}</svg>
      <ul class="pll-key">${rut.phases.map((p, i) => `<li><i class="${cls[i % 4]}"></i>${esc(p.phase)}: ${esc(fmtMd(p.from))} to ${esc(fmtMd(p.to))}</li>`).join('')}<li><i class="pll-you"></i>Your hunt days</li></ul>`;
  }
  const fmtMd = (mmdd) => { const [m, d] = mmdd.split('-').map(Number); return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}`; };

  // day summary from hourly rows inside legal light
  function daySum(day, P) {
    if (!P || !day.legalStart) return null;
    const a = hourKey(day.legalStart), b = hourKey(day.legalEnd);
    const hs = (P.hourly || []).filter((h) => h.t.slice(0, 13) >= a && h.t.slice(0, 13) <= b);
    if (!hs.length) return null;
    const nums = (k) => hs.map((h) => h[k]).filter((v) => v != null);
    const mx = (k) => (nums(k).length ? Math.max(...nums(k)) : null), mn = (k) => (nums(k).length ? Math.min(...nums(k)) : null), sum = (k) => nums(k).reduce((s, v) => s + v, 0);
    return { windMin: mn('windKmh'), windMax: mx('windKmh'), gustMax: mx('gustKmh'), rain: sum('rainMm'), tMin: mn('tempC'), tMax: mx('tempC'), fzMin: mn('freezingLevelM'), snow: sum('snowCm'), first: hs[0], n: hs.length };
  }

  // ---------- html ----------
  function html(live, plan) {
    if (!live) return '<div class="card"><h3>Live conditions</h3><p class="muted">Not loaded yet.</p></div>';
    css();
    const P0 = live.perPoint && live.perPoint[0];
    const asOf = live.wxAsOf || live.asOf;
    const head = `<div class="card pll-head"><h3>Live conditions</h3>
      <p class="pll-law">Study aid only. The official regulations are the law.</p>
      ${live.stale || live.offline ? `<p class="pll-stale" role="status"><b>${live.offline ? 'No signal.' : 'Saved copy.'}</b> Showing what was saved${asOf ? ` (as of ${esc(fmtDT(asOf))})` : ''}. Forecasts change: check again with signal the night before.</p>` : `<p class="pll-small">As of ${esc(fmtDT(asOf))}</p>`}
      <button type="button" class="btn block no-print" data-pll-refresh="1">Check again</button></div>`;
    const days = (live.days || []).map((d, i) => dayCard(d, i, live, P0)).join('');
    const others = (live.perPoint || []).length > 1 ? spotsTable(live) : '';
    return `<div class="pll">${head}${days}${others}${rutCard(live)}${roadsCard(live, plan)}${bansCard(live)}${srcCard(live)}</div>`;
  }
  function dayCard(d, i, live, P0) {
    const L = d.legalStart ? `${esc(fmtT(d.legalStart))} to ${esc(fmtT(d.legalEnd))}` : '<span class="verify">VERIFY</span>';
    const s = d.forecast ? daySum(d, P0) : null;
    let wx;
    if (d.past) wx = '<p class="muted">This day has passed.</p>';
    else if (!d.forecast) wx = `<div class="pll-noday"><p><b>Forecast not out yet.</b> Open-Meteo forecasts about ${FORECAST_DAYS} days ahead, so this day comes in on ${esc(dLabel(d.forecastFrom))}. No made up numbers here.</p>
        ${d.climate ? `<p>What to expect: ${esc(d.climate.t)} ${badge(d.climate.cert)} <span class="pll-small muted">${esc(d.climate.src)}${d.climate.lesson && hasSession(d.climate.lesson) ? `, ${lessonA(d.climate.lesson, 'lesson')}` : ''}</span></p>` : '<p class="muted">No climate numbers in the app for this area and month.</p>'}
        <p class="pll-small">Plan by the rules that do not change: legal light below, thermals (morning down, midday up, evening down) and the wind on the day.</p></div>`;
    else if (!s) wx = `<p class="muted">${live.errors && live.errors.wx ? `Could not load the forecast (${esc(live.errors.wx)}). Open <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> with signal.` : 'No forecast hours for this day.'}</p>`;
    else {
      const elev = P0 && P0.elev;
      const snowy = s.fzMin != null && elev != null && s.fzMin <= elev + 300;
      wx = `${windStrip(d, P0)}
        <div class="pll-kv"><span>Wind</span><b>${s.first && s.first.windDir != null ? `From the ${esc(dirWord(s.first.windDir))} at first light. ` : ''}${Math.round(s.windMin)} to ${Math.round(s.windMax)} km/h${s.gustMax != null ? `, gusts to ${Math.round(s.gustMax)}` : ''}</b></div>
        <div class="pll-kv"><span>Rain in legal light</span><b>${s.rain.toFixed(1)} mm</b></div>
        <div class="pll-kv"><span>Temperature</span><b>${Math.round(s.tMin)} to ${Math.round(s.tMax)} °C</b></div>
        ${s.fzMin != null ? `<div class="pll-kv"><span>Freezing level (lowest)</span><b>${Math.round(s.fzMin)} m</b></div>` : ''}
        ${s.snow > 0 ? `<div class="pll-kv"><span>Snow</span><b>${s.snow.toFixed(1)} cm</b></div>` : ''}
        ${snowy ? `<p class="pll-warn">Freezing level within 300 m of the spot (${Math.round(elev)} m): rain can turn to snow or ice up there. Pack for both (Tip).</p>` : ''}
        ${s.gustMax != null && s.gustMax >= 50 ? '<p class="pll-warn">Strong gusts drop dead trees. Stay out of burned or beetle killed timber in a wind (Tip).</p>' : ''}
        <p class="pll-small muted">At ${esc(P0.name || 'the plan point')}. Model forecast, not a promise.</p>`;
    }
    return `<details class="card pl-day pll-day${d.past ? '' : ' pl-open'}"${i === 0 ? ' open' : ''}><summary><span class="pl-dn">Day ${i + 1}</span><span class="grow"><b>${esc(dLabel(d.date))}</b><br><span class="muted pll-small">Legal light ${L}</span></span></summary>
      <div class="pll-kv"><span>Sunrise, sunset</span><b>${esc(fmtT(d.sunrise))}, ${esc(fmtT(d.sunset))}</b></div>
      <div class="pll-kv"><span>Moon</span><b>${esc(d.moon.name)}, ${d.moon.lit}% lit</b></div>
      ${d.rut ? `<div class="pll-kv"><span>Rut</span><b>${d.rut.verify ? '<span class="verify">VERIFY</span>' : esc(d.rut.phase)}</b></div>` : ''}
      ${wx}</details>`;
  }
  // wind at every spot at first light, midday and evening (first forecast day)
  function spotsTable(live) {
    const d = (live.days || []).find((x) => x.forecast && x.legalStart); if (!d) return '';
    const keys = [['Dawn', hourKey(d.legalStart)], ['Noon', `${d.date}T12`], ['Dusk', hourKey(d.sunset - 36e5)]];
    const rows = live.perPoint.map((P) => { const by = new Map((P.hourly || []).map((h) => [h.t.slice(0, 13), h]));
      return `<tr><td>${esc(P.name || P.id)}</td>${keys.map(([, k]) => { const h = by.get(k); return `<td>${h && h.windKmh != null ? `${esc(dir8(h.windDir))} ${Math.round(h.windKmh)}` : 'n/a'}</td>`; }).join('')}</tr>`; }).join('');
    return `<div class="card"><h3>Wind at each spot, ${esc(dLabel(d.date))}</h3><div class="tbl"><table><thead><tr><th>Spot</th>${keys.map(([l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
      <p class="pll-small muted">Wind from (compass) and km/h. Walk in with the wind in your face (Tip).</p></div>`;
  }
  function rutCard(live) {
    const r = live.rut; if (!r) return '';
    if (r.verify) return `<div class="card"><h3>Rut</h3><p><span class="verify">VERIFY</span> ${esc(r.source || '')} ${lessonA(r.lesson, 'The rut')}</p></div>`;
    // every phase your days fall in, in date order (a 14 to 15 November trip spans Rut starting and Peak breeding)
    const per = (live.days || []).filter((d) => d.rut && !d.rut.verify && d.rut.phase), ph = [];
    per.forEach((d) => { const x = ph.find((y) => y.phase === d.rut.phase); if (x) x.days.push(d.date); else ph.push({ phase: d.rut.phase, t: d.rut.t, cert: d.rut.cert, days: [d.date] }); });
    if (!ph.length) ph.push({ phase: r.phase, t: r.t, cert: r.cert, days: [] });
    const head = ph.map((x, i) => (i ? x.phase.charAt(0).toLowerCase() + x.phase.slice(1) : x.phase)).join(' to ');
    const dayLine = (x) => (ph.length > 1 && x.days.length ? `<b>${esc(x.days.map(dLabel).join(', '))}: ${esc(x.phase)}.</b> ` : '');
    return `<div class="card"><h3>Rut on your dates: ${esc(head)}</h3>${rutBar(r, live.days || [])}
      ${ph.map((x) => (x.t ? `<p>${dayLine(x)}${esc(x.t)} ${badge(x.cert)}</p>` : '')).join('')}${r.note ? `<p class="pll-small">${esc(r.note)}</p>` : ''}
      <p class="pll-small muted">${esc(r.source || '')}. ${lessonA(r.lesson, 'Masterclass: The rut')}</p></div>`;
  }
  function roadsCard(live, plan) {
    const R = live.roads; if (!R) return `<div class="card"><h3>Road notices</h3><p class="muted">Not checked yet. Read the district road page before you go.</p></div>`;
    const pt = live.center;
    const li = (x) => `<li class="${x.kind === 'closure' || x.closed ? 'pll-bad' : ''}"><b>${x.kind === 'closure' ? 'Closure' : x.kind === 'none' ? 'No notice' : x.closed ? 'Warning, road closed' : 'Caution'}: ${esc(x.road || 'Road')}</b>${x.km != null ? ` <span class="muted pll-small">${Math.round(x.km)} km from ${pt ? 'the plan point' : 'here'}</span>` : ''}<br>${esc(x.t)}${x.notice && /^https?:/.test(x.notice) ? ` <a href="${esc(x.notice)}" target="_blank" rel="noopener">Notice</a>` : x.notice ? ` ${esc(x.notice)}` : ''}${x.contact ? `<br><span class="pll-small">Contact: ${esc(x.contact)}</span>` : ''}</li>`;
    const items = (R.items || []).slice(0, 12).sort((x, y) => (x.km == null ? 0 : x.km) - (y.km == null ? 0 : y.km));
    const when = R.live ? `Live from the official layer${R.stale ? ' (saved copy)' : ''}, checked ${esc(fmtDT(R.asOf))}${R.edited ? `; layer last edited ${esc(fmtDT(R.edited))}` : ''}. ${badge(R.cert)}`
      : R.saved ? `No live check (${live.offline ? 'no signal' : 'layer did not answer'}). Saved lines from the lesson: district page updated ${esc(R.pageUpdated)}, read ${esc(R.checked)}. ${badge(R.cert)} ${lessonA(R.lesson, 'Lesson')}`
      : 'No saved road notices for this area in the app.';
    return `<div class="card"><h3>Road notices (FSR, Forest Service Road)</h3>
      ${items.length ? `<ul class="pll-roads">${items.slice(0, 5).map(li).join('')}</ul>${items.length > 5 ? `<details class="pll-more"><summary>${items.length - 5} more notices</summary><ul class="pll-roads">${items.slice(5).map(li).join('')}</ul></details>` : ''}` : `<p>${R.live ? 'No notices in the official layer within 40 km.' : ''} No notice is not a promise the road is open.</p>`}
      ${(R.items || []).length > 12 ? `<p class="pll-small muted">${R.items.length - 12} more on the official map.</p>` : ''}
      <p class="pll-small">${when}</p>
      <p class="pll-small"><a href="${esc(R.link)}" target="_blank" rel="noopener">${esc(R.linkName || 'Official road page')}</a>${R.map ? ` · <a href="${esc(R.map)}" target="_blank" rel="noopener">Official road map</a>` : ''}. Read it the night before. Signs at the road beat any app.</p>
      <p class="pll-small">Use the RR (Resource Road) radio channel posted for your FSR (see the radio channel maps on the road page). Road problem: <a href="tel:6047025700">604 702 5700</a> (Chilliwack district road page, 90%).</p></div>`;
  }
  function bansCard(live) {
    const B = live.fireBans;
    const page = 'https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions';
    if (!B) return `<div class="card"><h3>Fire bans</h3><p class="muted">Not checked (${live.offline ? 'no signal' : 'the layer did not answer'}).</p><p class="pll-small"><a href="${page}" target="_blank" rel="noopener">BC Wildfire Service: fire bans and restrictions</a></p></div>`;
    return `<div class="card"><h3>Fire bans at the plan point</h3>
      ${B.items.length ? `<ul>${B.items.map((b) => `<li><b>${esc(b.type || 'Ban')}</b>${b.t ? `: ${esc(b.t)}` : ''}${b.centre ? ` <span class="pll-small muted">${esc(b.centre)}</span>` : ''}${b.url ? ` <a href="${esc(b.url)}" target="_blank" rel="noopener">Bulletin</a>` : ''}</li>`).join('')}</ul>` : '<p>No ban or prohibition area covers the plan point in the official layer.</p>'}
      <p class="pll-small">${B.stale ? 'Saved copy, ' : ''}checked ${esc(fmtDT(B.asOf))}, BC Wildfire Service ${badge(B.cert || 95)}. An empty result is not a promise. <a href="${esc(B.link || page)}" target="_blank" rel="noopener">Fire bans and restrictions</a></p></div>`;
  }
  function srcCard(live) {
    return `<p class="pll-small muted pll-src">Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0). Sun times worked out on the phone (within a few minutes in valleys). ${live.days && live.days[0] && live.days[0].rule ? `Legal light: ${esc(live.days[0].rule)} ${badge(live.days[0].ruleCert)} Start shown 2 min late on purpose (phone sun math can run 1 to 2 min early). Check sunrise on the NRC (National Research Council) sunrise table, as the synopsis says.` : ''} Moon: worked out on the phone (Tip, within a day).</p>`;
  }

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style');
    st.textContent = `.pll svg{display:block;width:100%;height:auto;margin:6px 0}details.pl-day>svg.pll-strip{width:calc(100% - 28px)}
.pll-t{font-size:13px;fill:var(--muted)}.pll-n{font-size:15px;font-weight:700;fill:var(--ink)}.pll-arw{fill:var(--accent)}.pll-rain{fill:#3b82c4}.pll-ax{stroke:var(--line);stroke-width:1}
.pll-small{font-size:14px}.pll-kv{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)}.pll-kv span{color:var(--muted)}.pll-kv b{text-align:right}
.pll-stale{background:var(--warn-bg);padding:8px 10px;border-radius:10px}.pll-warn{background:var(--warn-bg);padding:8px 10px;border-radius:10px}
.pll-law{font-size:14px;color:var(--muted)}.pll-roads{padding-left:18px}.pll-roads li{margin:8px 0}.pll-bad b{color:var(--bad-ink)}
.pll-r0{fill:#c9d8cc}.pll-r1{fill:#8fb79a}.pll-r2{fill:var(--blaze)}.pll-r3{fill:#b9a68a}.pll-you{fill:var(--ink)}
.pll-key{list-style:none;padding:0;font-size:14px}.pll-key li{display:flex;align-items:center;gap:8px;margin:4px 0}.pll-key i{display:inline-block;width:16px;height:16px;border-radius:3px;background:currentColor}
.pll-key i.pll-r0{background:#c9d8cc}.pll-key i.pll-r1{background:#8fb79a}.pll-key i.pll-r2{background:var(--blaze)}.pll-key i.pll-r3{background:#b9a68a}.pll-key i.pll-you{background:var(--ink)}
.pll-more summary{min-height:44px;padding:10px 0;font-weight:700}.pll .btn{min-height:44px}.pll summary{min-height:44px}`;
    document.head.appendChild(st);
  }

  // ---------- mount: fetch, draw, wire Check again ----------
  async function mount(el, plan, points) {
    if (!el) return null;
    const draw = (lv) => { if (el.isConnected) { el.innerHTML = html(lv, plan); wire(); } };
    const wire = () => { const b = el.querySelector('[data-pll-refresh]'); if (b) b.onclick = async () => { b.disabled = true; b.textContent = 'Checking...'; draw(await fetchLive(plan, points)); }; };
    const c = ld(planKey(plan)); if (c) draw(Object.assign({}, c, { stale: true }));
    else el.innerHTML = '<div class="card"><h3>Live conditions</h3><p class="muted">Checking the forecast and road notices...</p></div>';
    const lv = await fetchLive(plan, points);
    draw(lv);
    return lv;
  }
  const cached = (planId) => ld(LS + planId);

  window.HMPlanLive = { fetch: fetchLive, html, mount, cached, _data: loadData, _key: planKey, _dayLight: dayLight, _hourKey: hourKey, _dir8: dir8, _dirWord: dirWord, _km: km, _fmtT: fmtT, _moon: moon };
})();
