/* Hunt Mentor add on: day by day, hour by hour hunt plan (prompt 2026-10-23 plan trip v2, part 4).
   API (plan.js calls it when present; it does not edit plan.js):
     HMPlanDays.build(plan, live, spots[], opts?) -> days[]
       plan: saved plan; live: HMPlanLive.fetch result (or null: sun and rules only);
       spots: plan.js top spots in rank order [{ id, name, cat, mu, lat, lon, detail? }] (detail = spot detail tile row:
              park, parkWhat, walkMin, walkKm, climbM, elev, aspect, driveVia; HMPlanDays.enrich adds it)
       opts: { dayOpen: { 'YYYY-MM-DD': [open season names] } from plan.js legal(), home: { lat, lon, name } (default Mission) }
       day: { date, kind ('hunt' | 'closed' | 'past'), forecast, legalStart, legalEnd, sunrise, sunset, drive, primary, evening,
              backup, blocked[], cautions[], steps[{ at, end?, key, title, t, tip?, src? }], turnaround{ at, walkMin }, roles, wind[] }
     HMPlanDays.html(days, plan?) -> HTML (SVG timeline first). HMPlanDays.wire(root) wires the turnaround alarm buttons.
     HMPlanDays.text(days) -> plain text for Share and print. HMPlanDays.enrich(spots) -> Promise<spots with detail>.
     HMPlanDays.mount(el, plan, spots, opts) -> enrich, HMPlanLive.fetch (or opts.live), build, draw, wire. Resolves { live, days }.
   Turnaround: the Safety tool's alarm (localStorage hm.safety.turn { on, at, date, time, walk, set }, the same keys the Hunt Map uses).
   Every time is an estimate or a Tip and says so. Legal light is the rule (regs.json hours). */
(function () {
  'use strict';
  const TZ = 'America/Vancouver';
  const TURN = 'hm.safety.turn';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const badge = (v) => (v == null ? '<span class="pill">Tip</span>' : `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}" title="Certainty">${v}%</span>`);
  const TIP = '<span class="pill">Tip</span>';
  const hasSession = (id) => !!(window.HM && window.HM.lessonFiles && window.HM.lessonFiles[id]);
  const lessonA = (id, t) => (id && hasSession(id) ? `<a href="#/s/${esc(id)}">${esc(t)}</a>` : esc(t));
  const fmtT = (ms) => (ms == null ? 'n/a' : new Date(ms).toLocaleTimeString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }));
  const hourKey = (ms) => new Date(ms).toLocaleString('sv-SE', { timeZone: TZ }).slice(0, 13).replace(' ', 'T');
  const minOfDay = (ms) => { const s = new Date(ms).toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit' }).split(':'); return +s[0] * 60 + +s[1]; };
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const dAdd = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const dRange = (a, b) => { const out = []; if (!a) return out; for (let x = a; x <= (b || a) && out.length < 62; x = dAdd(x, 1)) out.push(x); return out; };
  const dLabel = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
  const r5 = (m) => Math.max(5, Math.round(m / 5) * 5);
  const MIN = 6e4;
  const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const bearing = (a, b) => { const r = Math.PI / 180, y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r), x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r); return ((Math.atan2(y, x) / r) + 360) % 360; };
  const C8W = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const dirWord = (d) => C8W[Math.round((((d % 360) + 360) % 360) / 45) % 8];
  const gmaps = (p) => `https://www.google.com/maps/search/?api=1&query=${(+p.lat).toFixed(5)},${(+p.lon).toFixed(5)}`;
  const gdir = (p) => `https://www.google.com/maps/dir/?api=1&destination=${(+p.lat).toFixed(5)},${(+p.lon).toFixed(5)}`;
  const mapLink = (p) => `#/map/@${(+p.lat).toFixed(5)},${(+p.lon).toFixed(5)},15`;

  // data (shared file with plan-live.js); defaults keep it working when the file is not saved yet
  const DEF = {
    est: { driveKmh: 60, roadFactor: 1.3, walkKmh: 3, gearUpMin: 10, bufferMin: 15, why: 'Assumption: road distance is the straight line from Mission to the parking times 1.3, driven at 60 km/h on average, plus 15 minutes of slack. Walk: 3 km/h plus 1 min per 10 m of climb, at least 5 min (the spot pipeline\'s rule).' },
    thermals: { lesson: 'wind-thermals', more: 'wind-mastery', cert: 75, down: 'Cool air sinks downhill from night until the sun warms the slope.', up: 'Warm air rises uphill while the sun heats the slopes.', switch: 'Thermals switch mid morning and near sunset.' },
    roles: { lesson: 'hunting-partner', pair: [], solo: [] },
  };
  let D = DEF;
  const loadData = () => (window.HMPlanLive && window.HMPlanLive._data ? window.HMPlanLive._data() : fetch('data/addons/plan-live/plan-live.json', { credentials: 'omit' }).then((r) => r.json())).then((d) => { if (d) D = Object.assign({}, DEF, d); return D; }, () => D);

  // ---------- spots ----------
  const parkOf = (s) => { const p = s.detail && s.detail.park; return Array.isArray(p) && p.length >= 2 ? { lat: +p[1], lon: +p[0] } : null; };
  function walkOf(s) {
    const d = s.detail || {};
    // one walk rule everywhere (spot pipeline): 3 km/h plus 1 min per 10 m of climb, at least 5 min
    if (d.walkMin != null) return { min: Math.max(5, +d.walkMin), how: `${d.walkKm != null ? `${(+d.walkKm).toFixed(1)} km, ` : ''}${d.climbM ? `${Math.round(d.climbM)} m climb, ` : ''}3 km/h plus 1 min per 10 m climb, at least 5 min, estimate` };
    if (d.walkKm != null) return { min: Math.max(5, Math.round((+d.walkKm / D.est.walkKmh) * 60 + (+d.climbM || 0) / 10)), how: `${(+d.walkKm).toFixed(1)} km at ${D.est.walkKmh} km/h plus 1 min per 10 m climb, at least 5 min, estimate` };
    return { min: 20, how: 'Assumption: 20 minutes, no walk data for this spot', assumed: true };
  }
  const normRoad = (s) => String(s || '').toLowerCase().replace(/\s+-\s+.*$/, '').replace(/forest service road|\bfsr\b|\(.*?\)/g, '').replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  // road notices that touch a spot: point within 2 km of the spot or its parking, or the road is on its drive
  function noticesFor(s, items) {
    const pk = parkOf(s), via = ((s.detail && s.detail.driveVia) || []).map(normRoad).filter(Boolean), out = [];
    for (const n of items || []) {
      if (n.kind === 'none') continue;
      const near = n.lat != null && (km(s, n) < 2 || (pk && km(pk, n) < 2));
      const nr = normRoad(n.road);
      const onRoute = nr && via.some((v) => v === nr || v.startsWith(nr + ' ') || nr.startsWith(v + ' ') || v.split(' ')[0] === nr.split(' ')[0] && v.split(' ').length > 1 && nr.split(' ').length > 1 && v.split(' ')[1] === nr.split(' ')[1]);
      if (!near && !onRoute) continue;
      // a closure far up the road (past 5 km, say) may not stop you reaching a spot before it: block only when it is near the
      // spot, or at the start of the road (0 to 1 km); otherwise show it as a caution with its km to check
      const m = String(n.t).match(/(?:at|past|beyond|between)\s+(?:approximately\s+|about\s+)?(\d+(?:\.\d+)?)\s*km/i);
      const startKm = m ? +m[1] : null;
      const shut = n.kind === 'closure' || n.closed;
      const blocks = shut && (near || (startKm != null && startKm <= 1));
      out.push(Object.assign({}, n, { why: near ? 'within 2 km' : 'on your drive in', kind: blocks ? 'closure' : 'warning', partial: shut && !blocks }));
    }
    return out;
  }
  const hourAt = (live, s, ms) => {
    if (!live || !live.perPoint || ms == null) return null;
    const P = live.perPoint.find((p) => p.id === String(s.id)) || live.perPoint[0]; if (!P) return null;
    const k = hourKey(ms); return (P.hourly || []).find((h) => h.t.slice(0, 13) === k) || null;
  };
  // wind fit for walking in from the truck: +1 wind in your face, -1 wind at your back (scent blows ahead into the spot)
  function fit(s, h) {
    const pk = parkOf(s);
    if (!h || h.windKmh == null || h.windDir == null) return { v: 0, t: 'No forecast wind for this hour. Check the wind at the truck (puffer bottle) and walk in with it in your face.' };
    if (h.windKmh < 5) return { v: 0.2, calm: true, t: `Light wind (${Math.round(h.windKmh)} km/h): thermals rule.` };
    if (!pk) return { v: 0, t: `Wind from the ${dirWord(h.windDir)}, ${Math.round(h.windKmh)} km/h. No parking point for this spot: approach from the ${dirWord(h.windDir + 180)} side so the wind is in your face.` };
    const b = bearing(pk, s), c = Math.cos(((h.windDir - b) * Math.PI) / 180);
    const head = `You walk in heading ${dirWord(b)}; wind from the ${dirWord(h.windDir)}, ${Math.round(h.windKmh)} km/h`;
    return { v: c, b, t: c > 0.5 ? `${head}: wind in your face. Good.` : c > -0.3 ? `${head}: crosswind. Workable; keep the spot upwind of you.` : `${head}: wind at your back. Your scent blows ahead into the spot.` };
  }
  const rainHeavy = (live, s, a, b) => { if (!live || !live.perPoint) return null; let mm = 0, n = 0; for (let t = a; t <= b; t += 36e5) { const h = hourAt(live, s, t); if (h && h.rainMm != null) { mm += h.rainMm; n++; } } return n ? mm : null; };

  // ---------- build ----------
  function build(plan, live, spots, opts) {
    opts = opts || {};
    const home = opts.home || (() => { const b = ((window.HM && window.HM.bases) || []).find((x) => x.id === 'mission'); return b ? { lat: b.lat, lon: b.lon, name: b.name } : { lat: 49.13, lon: -122.31, name: 'Mission' }; })();
    const list = (spots || []).filter((s) => s && s.lat != null).slice(0, 5);
    const roadItems = (live && live.roads && live.roads.items) || [];
    const ldays = new Map(((live && live.days) || []).map((d) => [d.date, d]));
    const pt = plan.where && plan.where.lat != null ? { lat: +plan.where.lat, lon: +plan.where.lon } : list[0] || null;
    const pair = plan.party === 'two' || plan.party === 'group';
    const E = D.est, today = todayIso();
    const days = dRange(plan.from, plan.to);
    return days.map((iso, i) => {
      let L = ldays.get(iso);
      if (!L && window.HMPlanLive && window.HMPlanLive._dayLight) L = Object.assign({ date: iso }, window.HMPlanLive._dayLight(iso, pt, false));
      L = L || { date: iso };
      const open = opts.dayOpen ? (opts.dayOpen[iso] || []).length > 0 : true;
      const day = { date: iso, label: dLabel(iso), kind: iso < today ? 'past' : open ? 'hunt' : 'closed', forecast: !!L.forecast, forecastFrom: L.forecastFrom || null, legalStart: L.legalStart, legalEnd: L.legalEnd, sunrise: L.sunrise, sunset: L.sunset, rut: L.rut || null, steps: [], blocked: [], cautions: [], wind: [], pair };
      if (!L.legalStart || !L.sunset) { day.kind = day.kind === 'past' ? 'past' : 'nolight'; return day; }
      // spots: blocked by a closure, cautions from warnings
      const ok = [];
      list.forEach((s, rank) => {
        const ns = noticesFor(s, roadItems), cl = ns.filter((n) => n.kind === 'closure');
        if (cl.length) day.blocked.push({ spot: s, notices: cl }); else ok.push({ s, rank, cautions: ns });
      });
      const dawn = L.legalStart, mid = L.sunrise + 4 * 36e5, eve = L.sunset - 60 * MIN;
      const score = (c, t) => { const f = fit(c.s, hourAt(live, c.s, t)); const rain = rainHeavy(live, c.s, L.legalStart, L.legalEnd); const w = walkOf(c.s);
        return { c, f, w, rain, sc: (list.length - c.rank) + (f.v * 2.5) - (rain != null && rain > 10 && w.min > 30 ? 1.5 : 0) }; };
      const rank = (t) => ok.map((c) => score(c, t)).sort((a, b) => b.sc - a.sc);
      const am = rank(dawn), pm = rank(eve);
      const P = am[0] || null;
      let EV = pm[0] || null;
      if (P && EV && EV.c !== P.c) { const same = pm.find((x) => x.c === P.c); if (same && same.f.v > -0.3 && EV.sc - same.sc < 1.5) EV = same; } // stay put when it still works: less driving, less noise
      // backup: best other spot; with no forecast, the one whose walk in faces the most different way (covers the opposite wind)
      let B = null;
      if (P) {
        const others = am.filter((x) => x.c !== P.c);
        if (!day.forecast && parkOf(P.c.s)) { const b0 = bearing(parkOf(P.c.s), P.c.s); B = others.map((x) => ({ x, d: parkOf(x.c.s) ? Math.abs(((bearing(parkOf(x.c.s), x.c.s) - b0 + 540) % 360) - 180) : 0 })).sort((a, b) => b.d - a.d || a.x.c.rank - b.x.c.rank)[0]; B = B && B.x; }
        else B = others[0] || null;
      }
      const rainDay = P ? rainHeavy(live, P.c.s, L.legalStart, L.legalEnd) : null;
      const why = [];
      if (B) {
        why.push(P && P.f.v < -0.3 ? 'The forecast wind is at your back at the first pick: start here instead if it holds.' : 'Wind wrong at the first pick on the morning (blowing from you toward the spot): go here.');
        why.push(rainDay != null && rainDay > 10 ? `Heavy rain forecast (${rainDay.toFixed(0)} mm in legal light): pick the shorter walk and still hunt in timber.` : 'Heavy rain: pick the shorter walk and still hunt in timber (Tip).');
        why.push('A road notice, a locked gate or other hunters at the first pick: go here.');
      }
      day.primary = P && { spot: P.c.s, fit: P.f, walk: P.w, cautions: P.c.cautions };
      day.evening = EV && { spot: EV.c.s, fit: EV.f, walk: EV.w, cautions: EV.c.cautions, same: EV.c === (P && P.c) };
      day.backup = B && { spot: B.c.s, fit: B.f, walk: B.w, why, cautions: B.c.cautions };
      day.rainMm = rainDay;
      // drive
      const first = !plan.overnight || i === 0;
      const tgt = P ? parkOf(P.c.s) || P.c.s : pt;
      const from = first ? home : pt;
      const roadKm = tgt && from ? km(from, tgt) * E.roadFactor : null;
      const driveMin = roadKm != null ? r5((roadKm / E.driveKmh) * 60) : null;
      const homeKm = tgt ? km(tgt, home) * E.roadFactor : null, homeMin = homeKm != null ? r5((homeKm / E.driveKmh) * 60) : null; // home leg: spot park to home, not the plan point drive
      day.drive = { km: roadKm, min: driveMin, from: first ? home.name : 'where you stayed (the plan point)', homeKm, homeMin, why: E.why };
      const walk = P ? P.w.min : 20;
      // times
      const setup = L.legalStart, walkIn = setup - walk * MIN, arrive = walkIn - E.gearUpMin * MIN, leave = driveMin != null ? arrive - (driveMin + E.bufferMin) * MIN : null;
      const amEnd = L.sunrise + 150 * MIN, swA = L.sunrise + 90 * MIN, swB = L.sunrise + 150 * MIN;
      const evWalk = EV ? EV.w.min : walk;
      const evSit = L.sunset - 120 * MIN, midEnd = evSit - evWalk * MIN - (EV && !day.evening.same ? 15 : 0) * MIN;
      const turn = L.sunset - evWalk * MIN, truck = L.sunset;
      day.turnaround = { at: turn, walkMin: evWalk, legalEnd: L.legalEnd };
      // backup morning: its own leave and turnaround, so a long backup walk never borrows the first pick's times
      if (day.backup && B && leave != null) {
        const bw = B.w.min, bt = parkOf(B.c.s) || B.c.s, bKm = bt && from ? km(from, bt) * E.roadFactor : roadKm, bDrive = r5((bKm / E.driveKmh) * 60);
        const bLeave = setup - (bw + E.gearUpMin + bDrive + E.bufferMin) * MIN, bTurn = L.sunset - bw * MIN;
        const cm = /(\d+) m climb/.exec(String(B.w.how || '')), climb = cm ? +cm[1] : 0;
        if (bw - walk >= 15) {
          day.backup.leave = bLeave; day.backup.turn = bTurn;
          day.backup.why = day.backup.why.map((t) => (/^Heavy rain:/.test(t) && !/mm in legal light/.test(t) ? `Heavy rain: the backup is the longer walk (${bw} min against ${walk} min), so stay at the first pick and still hunt in timber (Tip).` : t));
          day.backup.why.unshift(`On a backup morning: leave ${day.drive.from} by ${fmtT(bLeave)} (not ${fmtT(leave)}): about ${bDrive} min drive plus ${E.bufferMin} min slack, ${E.gearUpMin} min to gear up and about ${bw} min walk in, to sit by ${fmtT(setup).replace(/\.$/, "")}. Turn back by ${fmtT(bTurn)} (sunset ${fmtT(L.sunset)} minus the ${bw} min walk out), not ${fmtT(turn)} (estimate).${climb >= 300 ? ` It climbs about ${climb} m cross country with no trail: walk it once in daylight before you try it in the dark, and pick another spot if you have not (Tip).` : ''}`);
        }
      }
      const th = D.thermals, thSrc = `${lessonA(th.lesson, 'Wind and thermals')} ${badge(th.cert)}`;
      const S = (at, key, title, t, extra) => day.steps.push(Object.assign({ at, key, title, t }, extra || {}));
      const pName = P ? P.c.s.name : 'your first spot';
      if (leave != null) S(leave, 'leave', `Leave ${day.drive.from}`, `About ${Math.round(roadKm)} km and ${driveMin} min (rounded to 5 min) to ${esc(pName)}, plus ${E.bufferMin} min slack (estimate).`, { est: true });
      S(arrive, 'park', 'Park and gear up', P && P.c.s.detail && P.c.s.detail.parkWhat ? `Park: ${esc(P.c.s.detail.parkWhat)}. Load the rifle only where it is legal to hunt, never on or across the road.` : 'Park off the road. Load the rifle only where it is legal to hunt, never on or across the road.', { est: true });
      S(walkIn, 'walkin', 'Walk in quietly', `${walk} min to the spot (${P ? esc(P.w.how) : 'Assumption'}). Headlamp, red light if you have one.`, { est: true });
      S(setup, 'setup', 'Sit by: legal light starts', `Sit by ${fmtT(setup).replace(/\.$/, '')} (legal light starts). Earlier option ${TIP}: in your seat by ${fmtT(setup - 45 * MIN).replace(/\.$/, '')} to ${fmtT(setup - 30 * MIN).replace(/\.$/, '')} (30 to 45 min before), so you are still when deer move; then leave and walk in that much earlier than the times above. ${P ? esc(P.f.t) + ' ' : ''}Air still sinks downhill at first light: sit below or beside where deer will feed, so your scent drains away from them. ${thSrc} Dawn and dusk matter most ${badge(80)}. Sit still through the thermal switch, about ${fmtT(swA)} to ${fmtT(swB)}: air swirls, do not walk then ${TIP}.`, { legal: true });
      const rut = L.rut && !L.rut.verify && /rut|breeding/i.test(L.rut.phase);
      S(amEnd, 'midday', rainDay != null && rainDay > 10 ? 'Midday: still hunt timber or scout' : 'Midday: still hunt or scout', `${esc(th.up)} Hunt from above or across the slope so your scent lifts away ${badge(th.cert)}. ${rut ? `${esc(L.rut.phase)}: stay out through midday; bucks cruise for does ${TIP} (${lessonA(L.rut.lesson, 'Masterclass: The rut')}).` : 'Or scout the backup spot for sign and the wind.'} Eat, drink, check the time.`);
      if (EV && !day.evening.same) S(midEnd, 'move', `Move to ${esc(EV.c.s.name)}`, `${esc(EV.f.t)} Drive and walk in before ${fmtT(evSit)} (estimate).`, { est: true });
      S(evSit, 'evening', 'Evening sit', `Back on the edge where does feed. From about an hour before sunset air sinks downhill again: sit below or beside the trail ${badge(th.cert)}. ${EV && day.evening.same ? esc(EV.f.t) : ''}`);
      S(turn, 'turn', 'Turnaround', `Sunset ${fmtT(L.sunset)} minus your ${evWalk} min walk out = ${fmtT(turn).replace(/\.$/, '')}. Back at the truck in daylight ${TIP}. Staying to the end of legal light (${fmtT(L.legalEnd)}) means walking out in the dark: headlamp, known route, partner told ${TIP}.`, { turn: true });
      S(truck, 'truck', 'Back at the truck', `Unload the rifle before you get in. ${pair ? 'Both back: check in.' : 'Text home that you are out.'}`);
      S(L.legalEnd, 'legalEnd', 'Legal light ends', `No hunting from 1 hour after sunset ${badge(99)}.`, { legal: true });
      if (homeMin != null && (!plan.overnight || iso === days[days.length - 1])) S(truck + (E.gearUpMin + homeMin) * MIN, 'home', `Home in ${home.name}`, `Estimate: ${E.gearUpMin} min to pack up and about ${homeMin} min drive (rounded to 5 min). Add time if you are hauling a deer: field dressing, then the carry out takes far longer than the ${evWalk} min walk out, and cooling and meat care come first.`, { est: true });
      day.steps.sort((a, b) => a.at - b.at);
      // wind arrows for the picture
      if (P) for (const t of [dawn, mid, eve]) { const h = hourAt(live, P.c.s, t); if (h && h.windDir != null) day.wind.push({ at: t, dir: h.windDir, kmh: h.windKmh }); }
      day.roles = { pair: (D.roles.pair || []), solo: (D.roles.solo || []), lesson: D.roles.lesson };
      return day;
    });
  }

  // ---------- picture: SVG timeline ----------
  function timeline(d) {
    if (!d.steps.length) return '';
    const W = 340, a0 = d.steps[0].at, a1 = d.steps[d.steps.length - 1].at;
    const t0 = Math.floor(minOfDay(a0) / 60) * 60, t1 = Math.ceil(minOfDay(a1) / 60) * 60 + 30;
    const X = (ms) => 6 + ((minOfDay(ms) - t0) / (t1 - t0)) * (W - 12);
    const at = (k) => (d.steps.find((s) => s.key === k) || {}).at;
    const seg = (a, b, cls, label) => (a != null && b != null && b > a ? `<rect x="${X(a).toFixed(1)}" y="54" width="${(X(b) - X(a)).toFixed(1)}" height="26" class="${cls}"/>${label && X(b) - X(a) > 34 ? `<text x="${((X(a) + X(b)) / 2).toFixed(1)}" y="72" class="pld-sl" text-anchor="middle">${label}</text>` : ''}` : '');
    const legal = `<rect x="${X(d.legalStart).toFixed(1)}" y="46" width="${(X(Math.min(d.legalEnd, a1 + 30 * MIN)) - X(d.legalStart)).toFixed(1)}" height="42" class="pld-legal"/>`;
    const parts = [
      seg(at('leave'), at('park'), 'pld-drive', 'Drive'), seg(at('park'), at('setup'), 'pld-walk', ''),
      seg(at('setup'), at('midday'), 'pld-sit', 'Sit'), seg(at('midday'), at('move') || at('evening'), 'pld-mid', 'Still hunt'),
      seg(at('move'), at('evening'), 'pld-walk', ''), seg(at('evening'), at('turn'), 'pld-sit', 'Sit'), seg(at('turn'), at('truck'), 'pld-walk', ''),
      seg(at('truck') + 10 * MIN, at('home'), 'pld-drive', 'Drive'),
    ].join('');
    const ticks = []; for (let m = t0; m <= t1; m += 180) { const x = 6 + ((m - t0) / (t1 - t0)) * (W - 12), h = Math.floor(m / 60), lx = Math.min(W - 20, Math.max(20, x)); ticks.push(`<line x1="${x}" y1="88" x2="${x}" y2="94" class="pld-ax"/><text x="${lx}" y="110" class="pld-t" text-anchor="middle">${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}</text>`); }
    const mark = (ms, cls, lab, y) => (ms ? `<line x1="${X(ms)}" y1="40" x2="${X(ms)}" y2="92" class="${cls}"/>${lab ? `<text x="${X(ms) - 4}" y="${y}" class="pld-t ${cls}-t" text-anchor="end">${lab}</text>` : ''}` : '');
    const arrows = d.wind.map((w) => { const x = X(w.at); return w.kmh < 2 ? `<text x="${x}" y="28" class="pld-t" text-anchor="middle">calm</text>` : `<g transform="translate(${x.toFixed(1)} 22) rotate(${((w.dir + 180) % 360).toFixed(0)})"><path d="M0 -12 7.5 4H2.5V12H-2.5V4H-7.5Z" class="pld-arw"/></g><text x="${(x + 14).toFixed(1)}" y="27" class="pld-t">${Math.round(w.kmh)}</text>`; }).join('');
    return `<svg class="pld-svg" viewBox="0 0 ${W} 118" role="img" aria-label="Timeline for ${esc(d.label)}: drive, walk, sit, still hunt, sit, turnaround, with legal light shaded and forecast wind arrows">
      ${legal}${parts}<line x1="6" y1="88" x2="${W - 6}" y2="88" class="pld-ax"/>${ticks.join('')}
      ${mark(d.sunrise, 'pld-sun', '', 0)}${mark(d.sunset, 'pld-sun', '', 0)}${mark(d.turnaround && d.turnaround.at, 'pld-turn', 'Turn', 50)}${arrows}</svg>`;
  }

  // ---------- html ----------
  const spotLine = (x, label) => !x ? '' : `<div class="pld-spot"><div class="pld-sl2">${label}</div><b>${esc(x.spot.name)}</b>
      <div class="pll-small muted">${x.walk ? `Walk ${x.walk.min} min (${esc(x.walk.how)}). ` : ''}${x.spot.mu ? `MU (Management Unit) <span class="pld-nw">${esc(x.spot.mu)}</span>.` : ''}</div>
      ${x.fit ? `<div class="pll-small">${esc(x.fit.t)}</div>` : ''}
      ${(x.cautions || []).map((n) => `<div class="pll-small pld-caution"><b>${n.partial ? 'Closure further up the road' : 'Caution'}, ${esc(n.why)}:</b><br>${esc(n.road)}:<br>${esc(n.t)}${n.partial ? '<br>Check your spot is before that km.' : ''}</div>`).join('')}
      <div class="pld-acts no-print"><a class="btn" href="${mapLink(x.spot)}">Map</a><a class="btn" href="${gdir(parkOf(x.spot) || x.spot)}" target="_blank" rel="noopener">Directions</a></div></div>`;
  // "Saturday, November 14": the weekday is the heading, the date sits after it
  const dayHead = (label) => { const m = String(label).match(/^(\w+),?\s+(.*)$/); return m ? `<b class="pld-wd">${esc(m[1])}</b> <b>${esc(m[2])}</b>` : `<b>${esc(label)}</b>`; };
  // the legal light margin rule, said once for every day and time below
  const LEGEND = 'Legal light times on this plan are shown 3 min late at the start and 1 min early at the end, for safety (phone sun times can be up to 2 min off).';
  function dayHtml(d, i) {
    if (d.kind === 'nolight') return `<div class="card"><h3>Day ${i + 1}: ${esc(d.label)}</h3><p class="muted">Sun times are not ready on this screen, so no hour by hour plan. Open the Home page once, then come back.</p></div>`;
    const head = `<summary><span class="pl-dn">Day ${i + 1}</span><span class="grow">${dayHead(d.label)}${d.kind === 'closed' ? ': not open, scout only' : d.kind === 'past' ? ': done' : ''}<br><span class="muted pll-small">Legal light ${esc(fmtT(d.legalStart))} to ${esc(fmtT(d.legalEnd))}</span></span></summary>`;
    if (d.kind === 'closed') return `<details class="card pl-day pl-closed pld-day">${head}<p><b>No open season for you on this day.</b> Scout, sight in or rest. No hunting.</p></details>`;
    const now = Date.now();
    const steps = d.steps.map((s) => `<li class="pld-st pld-${s.key}"><span class="pld-tm">${esc(fmtT(s.at))}</span><span><b class="pld-ti">${s.title}</b>${s.est ? ' <span class="pill">Estimate</span>' : ''}<br><span class="pll-small pld-tx">${s.t}</span>
        ${s.turn && s.at > now ? `<span class="pld-acts no-print"><button type="button" class="btn" data-pld-turn="${s.at}" data-pld-walk="${d.turnaround.walkMin}">Set the turnaround alarm for ${esc(fmtT(s.at))}</button><a class="btn" href="#/safety/turn">Safety: turnaround</a></span>` : ''}</span></li>`).join('');
    const wx = d.forecast ? (d.rainMm != null ? `<p class="pll-small">Forecast rain in legal light at the first pick: ${d.rainMm.toFixed(1)} mm.</p>` : '') : d.kind !== 'past' ? `<p class="pld-note">No forecast yet for this day${d.forecastFrom ? ` (it comes in on ${esc(dLabel(d.forecastFrom))})` : ''}. The first pick is the top ranked spot. On the morning, check the wind at the truck: in your face, go; at your back, take the backup.</p>` : '';
    const blocked = d.blocked.length ? `<div class="pld-block"><b>Left out: a road notice blocks it</b><ul>${d.blocked.map((b) => `<li>${esc(b.spot.name)}: ${b.notices.map((n) => `${esc(n.road)}, ${esc(n.t)} (${esc(n.why)})`).join('; ')}</li>`).join('')}</ul><p class="pll-small">A closure past a given km may still let you reach a spot before it. Check the km on the official notice.</p></div>` : '';
    const roles = (d.pair ? d.roles.pair : d.roles.solo) || [];
    return `<details class="card pl-day pl-open pld-day"${i === 0 ? ' open' : ''}>${head}
      ${timeline(d)}${wx}
      ${d.primary ? spotLine(d.primary, 'First light') : d.blocked.length ? '<p class="pld-note">Every top spot is blocked by a road notice below. Pick another area on the Map, or check the notice km.</p>' : '<p class="muted">No candidate spots in the plan yet, so the times use the plan point.</p>'}
      ${d.evening && !d.evening.same ? spotLine(d.evening, 'Evening') : ''}
      ${d.backup ? `<div class="pld-bk"><div class="pld-bk-h">Backup plan and its own times</div>${spotLine(d.backup, 'Backup')}<ul class="pll-small pld-why">${d.backup.why.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${blocked}
      <div class="pld-hh">Hour by hour</div><ol class="pld-steps">${steps}</ol>
      ${roles.length ? `<div class="pld-roles"><b>${d.pair ? 'With your partner' : 'Solo'}</b><ul>${roles.map((r) => `<li>${esc(r.t)} ${badge(r.cert)}</li>`).join('')}</ul><p class="pll-small">${lessonA(d.roles.lesson, 'Lesson: Hunting with a partner')}${d.pair ? '' : ` · ${lessonA('local-harrison-deer', 'Your Harrison deer hunt')}`}</p></div>` : ''}
      </details>`;
  }
  // the timeline key, said once for every day
  const KEY = (wind) => `<ul class="pld-key no-print"><li><i class="pld-legal"></i>Legal light</li><li><i class="pld-sit"></i>Sit</li><li><i class="pld-mid"></i>Still hunt or scout</li><li><i class="pld-walk"></i>Walk</li><li><i class="pld-drive"></i>Drive</li><li><i class="pld-turnk"></i>Turnaround</li>${wind ? '<li>Arrow: forecast wind, pointing where it blows; number: km/h</li>' : ''}</ul>`;
  function html(days, plan) {
    css();
    if (!days || !days.length) return '<div class="card"><h3>Hour by hour</h3><p class="muted">No days in this plan.</p></div>';
    return `<div class="pld"><p class="pll-law">Study aid only. The official regulations are the law.</p>
      <p class="pld-legend"><b>${esc(LEGEND)}</b></p>
      ${KEY(days.some((d) => d.wind && d.wind.length))}
      ${days.map(dayHtml).join('')}
      <p class="pll-small muted">Times: ${esc(D.est.why)} Turnaround: sunset minus your walk out (the Safety tool's rule). Thermal times: ${esc(D.thermals.times || 'Tip, rule of thumb')} Spots are candidates, scout them first. Legal light: synopsis page 11, item 38 ${badge(99)}; margins as in the line at the top, check the NRC (National Research Council) sunrise table. Home time: drive from the spot's parking to home (estimate).</p></div>`;
  }
  function text(days) {
    const L = [];
    for (const d of days || []) {
      L.push(`${d.label}${d.kind === 'closed' ? ' (not open, scout only)' : ''}`);
      if (d.primary) L.push(`  First light: ${d.primary.spot.name} ${gmaps(d.primary.spot)}`);
      if (d.backup) L.push(`  Backup: ${d.backup.spot.name} ${gmaps(d.backup.spot)}`);
      for (const s of d.steps) L.push(`  ${fmtT(s.at)} ${s.title.replace(/<[^>]+>/g, '')}`);
    }
    L.push('Times are estimates. Study aid only. The official regulations are the law.');
    return L.join('\n');
  }

  // ---------- turnaround alarm (Safety keys) ----------
  function setTurn(at, walk) {
    if (!(at > Date.now())) return false;
    const date = new Date(at).toLocaleDateString('en-CA', { timeZone: TZ }), time = new Date(at).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
    let old = {}; try { old = JSON.parse(localStorage.getItem(TURN) || '{}') || {}; } catch (e) { old = {}; }
    try { localStorage.setItem(TURN, JSON.stringify({ on: true, at, date, time, walk: walk != null ? String(walk) : old.walk || '', set: Date.now() })); } catch (e) { return false; }
    try { if (window.HMSafety) { window.HMSafety.unlockAudio && window.HMSafety.unlockAudio(); window.HMSafety.check && window.HMSafety.check(); } } catch (e) { /* no sound */ }
    return true;
  }
  function wire(root) {
    if (!root) return;
    root.querySelectorAll('[data-pld-turn]').forEach((b) => { b.onclick = () => {
      const at = +b.dataset.pldTurn, ok = setTurn(at, b.dataset.pldWalk);
      const msg = ok ? `Turnaround alarm set for ${fmtT(at)}. Keep the app open, and set a phone alarm too.` : 'Could not set the alarm (time passed or storage blocked).';
      const t = document.querySelector('.hm-toast'); if (t) { t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 3500); } else b.textContent = msg;
    }; });
  }

  // ---------- spot detail (parking, walk, drive roads) from the spot detail tiles ----------
  async function enrich(spots) {
    const out = (spots || []).map((s) => Object.assign({}, s));
    try {
      const man = await fetch('data/layers/manifest.json', { credentials: 'omit' }).then((r) => r.json());
      const l = (man.layers || []).find((x) => x.id === 'spots'); if (!l || !l.detail) return out;
      const d = +l.tileDeg || 0.25, v = encodeURIComponent(l.dataDate || '1'), tiles = new Map();
      await Promise.all(out.map(async (s) => {
        if (s.detail || !s.id) return;
        const area = String(s.id).split('-')[0];
        const u = `${l.detail.replace(/\{area\}/g, area).replace(/\{tile\}/g, `${Math.floor(s.lon / d)}_${Math.floor(s.lat / d)}`)}?v=${v}`;
        if (!tiles.has(u)) tiles.set(u, fetch(u, { credentials: 'omit' }).then((r) => (r.ok ? r.json() : null)).catch(() => null));
        const t = await tiles.get(u); if (t && t[s.id]) s.detail = t[s.id];
      }));
    } catch (e) { /* no manifest: times use assumptions */ }
    return out;
  }
  async function mount(el, plan, spots, opts) {
    opts = opts || {};
    await loadData();
    const sp = await enrich(spots);
    let live = opts.live || null;
    if (!live && window.HMPlanLive) { try { live = await window.HMPlanLive.fetch(plan, sp); } catch (e) { live = null; } }
    const days = build(plan, live, sp, opts);
    if (el && el.isConnected) { el.innerHTML = html(days, plan); wire(el); }
    return { live, days, spots: sp };
  }

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style');
    st.textContent = `.pld-svg{display:block;width:100%;height:auto;margin:6px 0}details.pl-day>svg.pld-svg{width:calc(100% - 28px)}
.pld-t{font-size:16px;fill:var(--muted)}.pld-sl{font-size:15px;font-weight:700;fill:#fff}.pld-ax{stroke:var(--muted);stroke-width:1}
.pld-legal{fill:var(--sel-bg)}.pld-sit{fill:var(--accent)}.pld-mid{fill:var(--sage)}.pld-walk{fill:#b9a68a}.pld-drive{fill:#7d8a80}
.pld-sun{stroke:var(--blaze);stroke-width:2;stroke-dasharray:3 3}.pld-turn{stroke:var(--bad);stroke-width:3}.pld-turn-t{fill:var(--bad-ink);font-weight:700}.pld-arw{fill:var(--ink)}
.pld-key{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px 12px;font-size:14px}.pld-key li{display:flex;align-items:center;gap:6px}
.pld-key i{display:inline-block;width:16px;height:12px;border-radius:3px}.pld-key i.pld-legal{background:var(--sel-bg);border:1px solid var(--line)}.pld-key i.pld-sit{background:var(--accent)}.pld-key i.pld-mid{background:var(--sage)}.pld-key i.pld-walk{background:#b9a68a}.pld-key i.pld-drive{background:#7d8a80}.pld-key i.pld-turnk{background:var(--bad);width:4px}
.pld-steps{list-style:none;padding:0;margin:10px 0}.pld-st{display:grid;grid-template-columns:76px 1fr;gap:8px;padding:10px 0;align-items:start;border-bottom:1px solid var(--line)}
.pld-nw{white-space:nowrap}.pld-tm{font-weight:700;white-space:nowrap;font-size:15px;font-variant-numeric:tabular-nums}.pld-turn .pld-tm{color:var(--bad-ink)}.pld-st.pld-turn{border-left:4px solid var(--bad);padding-left:6px}
.pld-spot{border:1px solid var(--line);border-radius:12px;padding:10px;margin:8px 0}.pld-sl2{font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.pld-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.pld-acts .btn{min-height:44px}.pld-ti{font-size:16px}.pld-tx{color:var(--ink);display:block;margin-top:2px}
.pld-bk{border:2px dashed var(--line);border-radius:12px;padding:8px 10px;margin:16px 0;background:var(--sel-bg)}.pld-bk-h,.pld-hh{font-weight:800;font-size:16px;margin:4px 0}.pld-hh{margin-top:16px;border-top:2px solid var(--line);padding-top:10px}
.pld-caution{margin:6px 0;line-height:1.35}.pld-key li{min-height:28px}.pld-caution{color:var(--bad-ink)}
.pld-block,.pld-note{background:var(--warn-bg);padding:8px 10px;border-radius:10px;margin:8px 0}.pld-why{margin:4px 0 8px}.pld-roles{margin-top:8px}
.pld summary{min-height:44px}.pld-wd{font-size:18px}.pld-legend{font-size:14px;background:var(--sel-bg);padding:8px 10px;border-radius:10px;margin:8px 0}.pll-small{font-size:14px}.pll-law{font-size:14px;color:var(--muted)}
@media print{.pld-day{break-inside:avoid}.pld details,.pld-day{display:block}}`;
    document.head.appendChild(st);
  }

  loadData();
  window.HMPlanDays = { build, html, text, wire, enrich, mount, _setTurn: setTurn, _fit: fit, _noticesFor: noticesFor };
})();
