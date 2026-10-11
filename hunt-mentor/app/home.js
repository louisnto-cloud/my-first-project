/* Hunt Mentor home dashboard ("This week"). Classic script, loaded before app.js; app.js home() calls HMHome.render().
   Cards: Plan a hunt (plan.js, through C.planCard), countdown, where picker (MU by point in polygon), open today in that MU (data/seasons), legal light,
   wind and weather (Open-Meteo through map/tools-wind.js, saved copy hm.wx.v1), sun and moon, quick links.
   Works offline: season files are precached; weather shows the last saved forecast; anything missing hides. */
(function () {
  'use strict';
  const TZ = 'America/Vancouver';
  const WX_LS = 'hm.wx.v1', WX_TTL = 30 * 6e4;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Preset places. MU (Management Unit) found by point in polygon on data/layers/bc/mu.geojson at these points (checked 2026-10-04).
  const PLACES = {
    heffley: { label: 'Heffley Creek', short: 'Heffley', base: 'heffley', mu: '3-27' },
    mission: { label: 'Mission', short: 'Mission', base: 'mission', mu: '2-8' },
    oliver: { label: 'Okanagan (Oliver)', short: 'Oliver', lat: 49.183, lon: -119.55, mu: '8-1' }, // Assumption: approximate town centre
    gps: { label: 'My location', short: 'My spot' },
  };
  // Species shown on the card, in this order. Ducks and geese come from the federal table (migratory.json).
  const GROUPS = [
    ['Deer', (s) => s === 'mule deer' || s === 'white tailed deer'],
    ['Grouse', (s) => s.includes('grouse')],
    ['Quail', (s) => s.includes('quail')],
    ['Black bear', (s) => s === 'black bear'],
    ['Moose', (s) => s === 'moose'],
    ['Elk', (s) => s === 'elk'],
  ];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  const compass8 = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const md = (mmdd) => { const [m, d] = mmdd.split('-').map(Number); return `${MON[m - 1]} ${d}`; };
  const json = (u) => fetch(u, { credentials: 'omit' }).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
  const seasonCache = {};
  const getJSON = (u) => (seasonCache[u] = seasonCache[u] || json(u).catch((e) => { delete seasonCache[u]; throw e; }));

  // ---------- season logic ----------
  function openOn(r, t) {
    if (r.allYear) return true;
    if (!r.open || !r.close) return false;
    return r.open <= r.close ? t >= r.open && t <= r.close : t >= r.open || t <= r.close;
  }
  function daysLeft(close, iso) {
    const [y] = iso.split('-').map(Number);
    let end = new Date(`${y}-${close}T00:00:00Z`), now = new Date(iso + 'T00:00:00Z');
    if (end < now) end = new Date(`${y + 1}-${close}T00:00:00Z`);
    return Math.round((end - now) / 864e5);
  }
  const regionFiles = (mu) => { const n = (String(mu).match(/^(\d{1,2})-/) || [])[1]; return !n ? [] : n === '7' ? ['region7a', 'region7b'] : ['region' + n]; };
  const tagOf = (notes) => { const m = String(notes || '').match(/youth only|bow only|private land only/i); return m ? cap(m[0].toLowerCase()) : ''; };

  async function seasonRows(mu, iso) {
    const t = iso.slice(5);
    const out = [];
    let session = '', regionName = '';
    for (const f of regionFiles(mu)) {
      const R = await getJSON(`data/seasons/${f}.json`);
      const rows = (R.rows || []).filter((r) => Array.isArray(r.mus) && r.mus.includes(mu));
      if (!rows.length) continue;
      session = 'rb-' + f.replace('region', 'region-');
      regionName = R.regionName || '';
      for (const r of rows) {
        const sp = String(r.species || '').toLowerCase();
        const g = GROUPS.findIndex(([, test]) => test(sp));
        if (g < 0 || !openOn(r, t)) continue;
        const note = cap(String(r.notes || '').split(';')[0].trim());
        out.push({ g: g < 1 ? 0 : g + 2, sp: cap(sp), cls: cap(r.class || ''), note: tagOf(r.notes) ? '' : note, tag: tagOf(r.notes),
          open: r.open, close: r.close, allYear: r.allYear, left: r.close ? daysLeft(r.close, iso) : null, src: r.page != null ? `Synopsis page ${r.page}` : '', cert: r.cert });
      }
    }
    // ducks and geese: federal Migratory Birds Regulations, by district (or by MU inside a district)
    let birdNote = '';
    try {
      const M = await getJSON('data/seasons/migratory.json');
      const dk = Object.keys(M.districts || {}).find((k) => (M.districts[k].mus || []).includes(mu));
      if (dk) {
        for (const r of M.rows || []) {
          if (r.district !== dk || (r.mus && !r.mus.includes(mu))) continue;
          const sp = String(r.species || '').toLowerCase();
          const g = sp === 'ducks' ? 1 : sp.includes('geese') ? 2 : -1;
          if (g < 0 || !openOn(r, t)) continue;
          out.push({ g, sp: cap(sp), cls: r.daily ? `${r.daily} a day, ${r.possession} in possession` : '', note: '', tag: '',
            open: r.open, close: r.close, left: daysLeft(r.close, iso), src: `Federal Migratory Birds Regulations, ${r.item || 'Schedule 3'}`, cert: r.cert });
        }
      } else if (M.noDistrict && (M.noDistrict.mus || []).includes(mu)) birdNote = 'No federal duck or goose season found for this MU. VERIFY with the Canadian Wildlife Service.';
    } catch (e) { /* ducks and geese hidden when the file is missing */ }
    out.sort((a, b) => a.g - b.g || (a.tag ? 1 : 0) - (b.tag ? 1 : 0) || (a.left ?? 999) - (b.left ?? 999));
    return { rows: out, session, regionName, birdNote };
  }

  // ---------- MU lookup (lazy: only for My location) ----------
  function inRing(x, y, r) {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const inPoly = (x, y, p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h));
  async function muAt(lat, lon) {
    let v = '', files = ['data/layers/bc/mu.geojson'];
    try { const man = await json('data/layers/manifest.json'); const l = (man.layers || []).find((x) => x.id === 'mu'); v = (l && l.dataDate) || man.updated || '';
      if (l && Array.isArray(l.files)) files = l.files.filter((f) => !f.bbox || (lon >= f.bbox[0] && lon <= f.bbox[2] && lat >= f.bbox[1] && lat <= f.bbox[3])).map((f) => f.file);
      else if (l && l.file) files = [l.file]; } catch (e) { /* no manifest: plain URL */ }
    for (const file of files) {
      const fc = await json(file + (v ? `?v=${encodeURIComponent(v)}` : '')); // same URL as the map, so the saved copy is shared
      for (const f of fc.features || []) {
        const g = f.geometry; if (!g) continue;
        const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
        if (polys.some((p) => inPoly(lon, lat, p))) { const m = String(f.properties.MU || '').match(/(\d{1,2})\s*-\s*0*(\d{1,2})/); return m ? `${+m[1]}-${+m[2]}` : null; }
      }
    }
    return null;
  }

  // ---------- weather ----------
  function readWx() { try { return JSON.parse(localStorage.getItem(WX_LS) || 'null'); } catch (e) { return null; } }
  const distKm = (a, b) => { const R = 6371, d2r = Math.PI / 180, dLat = (b.lat - a.lat) * d2r, dLon = (b.lon - a.lon) * d2r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d2r) * Math.cos(b.lat * d2r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  async function weather(lat, lon) {
    const s = readWx();
    const near = s && s.v && s.lat != null && distKm({ lat, lon }, { lat: s.lat, lon: s.lng }) < 3;
    if (near && Date.now() - s.t < WX_TTL) return { v: s.v, t: s.t, offline: false, away: 0 };
    try {
      if (navigator.onLine === false) throw new Error('offline');
      const W = await import('./map/tools-wind.js');
      const f = await W.forecast(lon, lat);
      return { v: f.v, t: f.t, offline: f.offline, away: (f.away || 0) / 1000 };
    } catch (e) {
      if (s && s.v) return { v: s.v, t: s.t, offline: true, away: distKm({ lat, lon }, { lat: s.lat, lon: s.lng }) };
      throw e;
    }
  }
  const WMO = [[0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Cloudy'], [45, 'Fog'], [51, 'Drizzle'], [56, 'Freezing drizzle'], [61, 'Rain'], [66, 'Freezing rain'], [71, 'Snow'], [77, 'Snow grains'], [80, 'Rain showers'], [85, 'Snow showers'], [95, 'Thunderstorm']];
  const sky = (code) => { let t = 'Weather'; for (const [c, l] of WMO) if (code >= c) t = l; return t; };
  const arrow = (from) => `<svg class="hmd-arr" viewBox="0 0 24 24" width="18" height="18" style="transform:rotate(${(from + 180) % 360}deg)" aria-hidden="true"><path d="M12 2 19 12h-4.5v10h-5V12H5Z" fill="currentColor"/></svg>`;
  const hourLabel = (iso) => { const h = +iso.slice(11, 13); return `${h % 12 || 12} ${h < 12 ? 'a.m.' : 'p.m.'}`; };
  function wxHtml(f) {
    const v = f.v, c = v.current || {}, H = v.hourly || {};
    const nowKey = (c.time || new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T')).slice(0, 13);
    let i = (H.time || []).findIndex((t) => t.slice(0, 13) === nowKey); if (i < 0) i = 0;
    // when the saved copy is old, start from the hour that matches now if it is in the block
    const nowLocal = new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T').slice(0, 13);
    const j = (H.time || []).findIndex((t) => t.slice(0, 13) === nowLocal); if (f.offline && j >= 0) i = j;
    const cur = f.offline && j >= 0 ? { temperature_2m: H.temperature_2m[j], wind_speed_10m: H.wind_speed_10m[j], wind_direction_10m: H.wind_direction_10m[j], weather_code: c.weather_code } : c;
    const hrs = [];
    for (let k = 2; k <= 12; k += 2) { const n = i + k; if (H.time && H.time[n]) hrs.push(`<div class="hmd-hr"><span>${hourLabel(H.time[n])}</span>${arrow(H.wind_direction_10m[n])}<b>${Math.round(H.wind_speed_10m[n])}</b><span>${Math.round(H.temperature_2m[n])}°</span>${H.precipitation_probability && H.precipitation_probability[n] != null ? `<span class="hmd-rain">${H.precipitation_probability[n]}%</span>` : ''}</div>`); }
    const kmh = cur.wind_speed_10m, from = cur.wind_direction_10m;
    const calm = kmh == null || kmh < 2;
    const tip = calm ? 'Calm now. Air drifts downhill in the morning and uphill in the afternoon. Watch your scent (Tip).'
      : `Wind from ${compass8(from)}: approach from the ${compass8(from + 180)} (Tip).`;
    const when = new Date(f.t).toLocaleString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'long' });
    return `<div class="row hmd-now"><div class="hmd-wind">${calm ? '' : arrow(from)}</div><div class="grow">
        <div><b>${calm ? 'Calm' : `From the ${compass8(from)}, ${Math.round(kmh)} km/h`}</b>${c.wind_gusts_10m != null && !f.offline ? `, gusts ${Math.round(c.wind_gusts_10m)}` : ''}</div>
        <div class="muted">${cur.temperature_2m != null ? `${Math.round(cur.temperature_2m)}°C, ` : ''}${cur.weather_code != null ? sky(cur.weather_code) : ''}</div></div></div>
      ${hrs.length ? `<div class="hmd-hrs" aria-label="Next 12 hours: time, wind in kilometres per hour, temperature, chance of rain">${hrs.join('')}</div>` : ''}
      <p class="hmd-tip">${tip}</p>
      <p class="muted hmd-small">${f.offline ? `Offline. Last saved forecast: ${esc(when)}${f.away > 3 ? `, for a spot ${Math.round(f.away)} km away` : ''}` : `Updated: ${esc(when)}`}<br> Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>.</p>`;
  }

  // ---------- moon (same formula as map/tools-insights.js: mean synodic month from the new moon of 6 January 2000) ----------
  function moon(date = new Date()) {
    const syn = 29.530588853, age = ((((date - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % syn) + syn) % syn;
    const lit = Math.round(((1 - Math.cos((2 * Math.PI * age) / syn)) / 2) * 100);
    const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
    return { lit, name: names[Math.round((age / syn) * 8) % 8] };
  }

  // ---------- render ----------
  function render(view, C, opts) {
    const S = C.S;
    const st = (S.settings.home = S.settings.home || {});
    const where = PLACES[st.where] ? st.where : 'heffley';
    const place = PLACES[where];
    const base = place.base && (window.HM.bases || []).find((b) => b.id === place.base);
    const gps = st.gps || null;
    const pt = where === 'gps' ? (gps ? { lat: gps.lat, lon: gps.lon } : null) : base ? { lat: base.lat, lon: base.lon } : { lat: place.lat, lon: place.lon };
    const mu = where === 'gps' ? (gps && gps.mu) || '' : place.mu;
    const iso = todayIso();

    // 1. countdown
    const fh = S.settings.firstHunt;
    const d = fh ? C.daysTo(fh) : null;
    const count = fh
      ? `<div class="row"><div class="grow"><div class="muted">First hunt</div><div class="big">${d > 0 ? `${d} day${d === 1 ? '' : 's'}` : d === 0 ? 'Today' : 'Date passed'}</div>
          <div class="muted">${esc(new Date(fh + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</div></div>
          <button class="btn hmd-edit" id="hmd-fh-edit" type="button">Change</button></div>
          <div id="hmd-fh-box" hidden><label class="f" for="hmd-fh">First hunt date</label><input type="date" id="hmd-fh" value="${esc(fh)}"></div>`
      : `<div class="muted">First hunt</div><p class="hmd-q">When is your first hunt? Set the date for a countdown.</p><input type="date" id="hmd-fh" aria-label="First hunt date">`;

    // 2. where
    const seg = Object.entries(PLACES).map(([k, p]) => `<button type="button" data-w="${k}" class="${k === where ? 'on' : ''}">${esc(p.short)}</button>`).join('');
    let whereLine;
    if (where === 'gps' && !gps) whereLine = '<p class="muted hmd-small">Tap My spot again to use your phone location. Optional. It stays on this phone.</p>';
    else whereLine = `<p class="hmd-where">${esc(place.label)}: ${mu ? `<b>MU (Management Unit) ${esc(mu)}</b>` : 'MU (Management Unit) not found here'}</p>${where === 'gps' ? `<p class="muted hmd-small">Location from ${esc(new Date(gps.t).toLocaleString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }))}. <button type="button" class="hmd-link" id="hmd-gps-again">Update</button></p>` : ''}`;

    // 4 and 6. legal light, sun and moon
    let light = '', sunMoon = '';
    if (pt && C.sunEvent) {
      const [y, m, dd] = iso.split('-').map(Number), day = new Date(y, m - 1, dd, 12);
      const rise = C.sunEvent(day, pt.lat, pt.lon, true), set = C.sunEvent(day, pt.lat, pt.lon, false);
      const Hh = (window.HM.regs && window.HM.regs.hours) || {};
      const span = (h) => (h && h.beforeSunriseMin != null ? `${C.hhmm(C.addMin(rise, -h.beforeSunriseMin))} to ${C.hhmm(C.addMin(set, h.afterSunsetMin))}` : '<span class="verify">VERIFY</span>');
      light = `<div class="card hmd-card"><h2>Legal light today</h2>
        <div class="hmd-kv"><span>Big game and upland birds</span><b>${span(Hh.bigGame)}</b></div>
        <div class="hmd-kv"><span>Ducks and geese</span><b>${span(Hh.migratory)}</b></div>
        <p class="muted hmd-small">Worked out on your phone for ${esc(place.label)}, Pacific time. Can be a few minutes off in valleys. ${Hh.bigGame ? C.certBadge(Hh.bigGame.certainty) : ''} <a href="#/field/light">Other days</a></p></div>`;
      const mo = moon();
      sunMoon = `<div class="card hmd-card"><h2>Sun and moon</h2>
        <div class="hmd-kv"><span>Sunrise</span><b>${C.hhmm(rise)}</b></div><div class="hmd-kv"><span>Sunset</span><b>${C.hhmm(set)}</b></div>
        <div class="hmd-kv"><span>Moon</span><b>${mo.name}, ${mo.lit}% lit</b></div></div>`;
    }

    let planCard = '';
    try { planCard = C.planCard ? C.planCard() : ''; } catch (e) { planCard = ''; }
    const html = `<section class="hmd" id="hmd" aria-label="This week">
      ${planCard}
      <div class="card hmd-card">${count}</div>
      <div class="card hmd-card"><h2>Where</h2><div class="seg hmd-seg" role="group" aria-label="Where">${seg}</div>${whereLine}<div id="hmd-gps-msg"></div></div>
      ${mu ? `<div class="card hmd-card" id="hmd-open"><h2>Open today in MU ${esc(mu)}</h2><p class="muted">Loading seasons...</p></div>` : ''}
      ${light}
      ${pt ? `<div class="card hmd-card" id="hmd-wx"><h2>Wind and weather</h2><p class="muted">Loading forecast...</p></div>` : ''}
      ${sunMoon}
      <div class="hmd-links">
        <a class="btn" href="#/map">Map</a><a class="btn primary" href="#/field">Field Mode</a>
        ${C.mentorUrl ? `<a class="btn" href="${esc(C.mentorUrl)}" target="_blank" rel="noopener">Ask the mentor</a>` : ''}<a class="btn" href="#/lists">Checklists</a>${C.planCard ? '<a class="btn" href="#/plan">My hunt plans</a>' : ''}
      </div></section>`;
    view.insertAdjacentHTML('afterbegin', html);
    const root = view.querySelector('#hmd');
    const alive = () => root.isConnected;
    const rerender = (o) => { if (!alive()) return; root.remove(); render(view, C, o); };

    // events
    const fhIn = root.querySelector('#hmd-fh');
    if (fhIn) fhIn.onchange = (e) => { if (!e.target.value) return; S.settings.firstHunt = e.target.value; C.save(); if (C.refresh) C.refresh(); else rerender(); };
    const ed = root.querySelector('#hmd-fh-edit');
    if (ed) ed.onclick = () => { const b = root.querySelector('#hmd-fh-box'); b.hidden = !b.hidden; };
    const askGps = () => {
      const msg = root.querySelector('#hmd-gps-msg');
      if (!navigator.geolocation) { msg.innerHTML = '<p class="muted hmd-small">This phone cannot share its location here.</p>'; return; }
      msg.innerHTML = '<p class="muted hmd-small">Finding your location...</p>';
      navigator.geolocation.getCurrentPosition(async (p) => {
        const lat = p.coords.latitude, lon = p.coords.longitude;
        if (alive()) msg.innerHTML = '<p class="muted hmd-small">Finding your Management Unit...</p>';
        let found = null, failed = false;
        try { found = await muAt(lat, lon); } catch (e) { failed = true; }
        st.gps = { lat, lon, mu: found || '', t: Date.now() }; C.save();
        rerender({ gpsFail: failed });
      }, () => { if (alive()) msg.innerHTML = '<p class="muted hmd-small">Location is off or was not allowed. Pick a place instead.</p>'; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
    };
    root.querySelectorAll('.hmd-seg button').forEach((b) => { b.onclick = () => {
      const w = b.dataset.w;
      if (w === 'gps' && where === 'gps') { askGps(); return; }
      st.where = w; C.save(); rerender({ askGps: w === 'gps' && !st.gps });
    }; });
    const again = root.querySelector('#hmd-gps-again'); if (again) again.onclick = askGps;
    if (opts && opts.askGps) askGps();
    if (opts && opts.gpsFail) root.querySelector('#hmd-gps-msg').innerHTML = '<p class="muted hmd-small">Could not read the Management Unit map. Open the Map once with signal so it is saved for offline use.</p>';

    // 3. open today
    if (mu) seasonRows(mu, iso).then((res) => {
      if (!alive()) return;
      const box = root.querySelector('#hmd-open');
      const sess = res.session && C.hasSession(res.session) ? `<a href="#/s/${res.session}">Rule Book for this region</a>` : '';
      const rows = res.rows.map((r) => `<li class="hmd-sr"><div class="row"><b class="grow">${esc(r.sp)}</b>${r.tag ? `<span class="pill">${esc(r.tag)}</span>` : ''}</div>
          ${r.cls || r.note ? `<div>${esc([r.cls, r.note && r.note.toLowerCase() !== r.cls.toLowerCase() ? r.note : ''].filter(Boolean).join('. '))}</div>` : ''}
          <div class="muted hmd-small">${r.allYear ? 'Open all year' : `${md(r.open)} to ${md(r.close)}. <b class="${r.left <= 7 ? 'hmd-soon' : ''}">${r.left === 0 ? 'Closes today' : `Closes in ${r.left} day${r.left === 1 ? '' : 's'}`}</b>`}</div>
          <div class="muted hmd-small">${esc(r.src)} ${C.certBadge(r.cert)}</div></li>`).join('');
      box.innerHTML = `<h2>Open today in MU ${esc(mu)}</h2>
        <p class="hmd-law">Study aid only. The official regulations are the law.</p>
        ${rows ? `<ul class="hmd-list">${rows}</ul>` : '<p>None of deer, ducks, geese, grouse, quail, bear, moose or elk is open today in this MU in general open seasons.</p>'}
        ${res.birdNote ? `<p class="muted hmd-small">${esc(res.birdNote)}</p>` : ''}
        <p class="muted hmd-small">General open seasons for ${esc(iso)}. LEH (Limited Entry Hunting) draws, closed areas and no shooting areas are not shown. ${sess}</p>`;
    }).catch(() => { if (alive()) root.querySelector('#hmd-open').innerHTML = `<h2>Open today in MU ${esc(mu)}</h2><p class="hmd-law">Study aid only. The official regulations are the law.</p><p class="muted">Season tables are not saved on this phone yet. Open the app once with signal.</p>`; });

    // 5. weather
    if (pt) weather(pt.lat, pt.lon).then((f) => { if (alive()) root.querySelector('#hmd-wx').innerHTML = `<h2>Wind and weather</h2>${wxHtml(f)}`; })
      .catch(() => { if (alive()) root.querySelector('#hmd-wx').remove(); });
  }

  window.HMHome = { render, _seasonRows: seasonRows, _muAt: muAt };
})();
