/* Safety tools add on. Routes: #/safety (hub), #/safety/trip, #/safety/turn, #/safety/sos, #/safety/wildlife, #/safety/live.
   Content and sources: data/addons/safety/safety.json (precached). User data on this phone only (localStorage hm.safety.*).
   Nothing is ever sent automatically: every share, text or email needs a tap and the phone's own send button.
   Live checks (Open-Meteo, BC Wildfire Service ArcGIS layers, Avalanche Canada) run only on a tap, fail gracefully offline,
   and keep the last result with its time. */
(function () {
  'use strict';
  const TZ = 'America/Vancouver';
  const K = { trip: 'hm.safety.trip', turn: 'hm.safety.turn', live: 'hm.safety.live', fix: 'hm.safety.fix', pt: 'hm.safety.pt', data: 'hm.safety.data' };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ld = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const badge = (v) => `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}" title="Certainty">${v}%</span>`;
  const TIP = '<span class="pill">Tip</span>';
  const VERIFY = '<span class="verify">VERIFY</span>';
  const view = () => document.getElementById('view');
  const title = (t) => { const e = document.getElementById('top-title'); if (e) e.textContent = t; };
  const toast = (m) => { const t = $('.hm-toast'); if (!t) { alert(m); return; } t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3500); };
  const fmtT = (ms) => new Date(ms).toLocaleTimeString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const fmtDT = (ms) => new Date(ms).toLocaleString('en-CA', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const ago = (ms) => { const m = Math.round((Date.now() - ms) / 6e4); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
  const f5 = (x) => (+x).toFixed(5);
  // BC (Vancouver) wall clock <-> time stamp, so the alarm is right even if the phone is set to another time zone
  const hm24 = (ms) => new Date(ms).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  const vanMs = (y, m, d, hh, mm) => {
    let t = Date.UTC(y, m - 1, d, hh, mm);
    for (let i = 0; i < 2; i++) {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
      t += Date.UTC(y, m - 1, d, hh, mm) - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
    }
    return t;
  };

  function copy(text) {
    const legacy = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove(); return ok; };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, legacy);
    return Promise.resolve(legacy());
  }
  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  // ---------- content ----------
  // Minimal card if the data file cannot load (for example the single file backup opened from Files). Same facts as safety.json.
  const FALLBACK = {
    checked: '2026-10-16', fallback: true,
    sources: {
      bcws: { name: 'BC Wildfire Service: Report a wildfire', url: 'https://www2.gov.bc.ca/gov/content/safety/wildfire-status/contact-channels/report-a-wildfire', checked: '2026-10-16' },
      rapp: { name: 'BC Conservation Officer Service: RAPP', url: 'https://www2.gov.bc.ca/gov/content/environment/natural-resource-stewardship/natural-resource-law-enforcement/conservation-officer-service/cos-rapp', checked: '2026-10-16' },
    },
    numbers: [
      { id: '911', label: 'Emergency: police, fire, ambulance, search and rescue', tel: '911', show: '911', c: 99 },
      { id: 'fire', label: 'Report a wildfire', tel: '18006635555', show: '1 800 663 5555', alt: { tel: '*5555', show: '*5555 on a cell' }, c: 99, s: 'bcws' },
      { id: 'rapp', label: 'Conservation Officer Service RAPP (Report All Poachers and Polluters)', tel: '18779527277', show: '1 877 952 7277', c: 99, s: 'rapp' },
    ],
    dispatch: [{ t: 'Your location first: read the latitude and longitude below.', c: 0 }, { t: 'What happened, how many people, who is hurt.', c: 0 }, { t: 'Your phone number. Stay on the line.', c: 0 }],
    nosignal: [], stop: [{ k: 'S', w: 'Stop', t: 'Sit down.' }, { k: 'T', w: 'Think', t: 'Where were you last sure?' }, { k: 'O', w: 'Observe', t: 'Map, compass, sun, creeks.' }, { k: 'P', w: 'Plan', t: 'Stay put unless sure.' }],
    stopSrc: { c: 75 }, stopMore: [], bleed: [], hypo: [],
  };
  let DATA = null, dataP = null;
  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (dataP) return dataP;
    dataP = fetch('data/addons/safety/safety.json', { credentials: 'omit' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => { DATA = d; sv(K.data, d); return d; })
      .catch(() => { const c = ld(K.data, null); DATA = c || FALLBACK; return DATA; })
      .finally(() => { dataP = null; });
    return dataP;
  }
  const srcOf = (sid) => (DATA && DATA.sources && DATA.sources[sid]) || null;
  const shortName = (s) => { const p = String(s.name).split(':'); return /^Hunt Mentor lesson/.test(p[0]) ? 'Lesson: ' + String(p[1] || '').replace(/\s*\(.*$/, '').trim() : p[0].replace(/\s*\(.*$/, ''); };
  const dot = (s) => (/\.$/.test(s) ? s : s + '.');
  const srcLink = (sid) => {
    const s = srcOf(sid); if (!s) return '';
    const ext = /^https?:/.test(s.url);
    return ` <a class="sf-src" href="${esc(s.url)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(shortName(s))}</a>`;
  };
  // one fact: text, then certainty (or Tip), then the source name as a link
  const cert = (f) => (f.verify ? VERIFY : f.c ? badge(f.c) : TIP);
  const fact = (f) => `<li>${esc(f.t)} ${cert(f)}${f.s ? srcLink(f.s) : ''}${f.n ? `<div class="sf-n">${esc(f.n)}</div>` : ''}</li>`;
  const facts = (arr, cls) => (arr && arr.length ? `<ul class="sf-facts ${cls || ''}">${arr.map(fact).join('')}</ul>` : '');
  const tips = (arr) => (arr && arr.length ? `<ul class="sf-facts">${arr.map((t) => `<li>${esc(t.replace(/\s*\(Tip\)(\.?)\s*$/, '$1'))} ${TIP}</li>`).join('')}</ul>` : '');
  function sourcesBox(ids) {
    const rows = [...new Set(ids)].map((id) => [id, srcOf(id)]).filter(([, s]) => s);
    if (!rows.length) return '';
    return `<details class="card sf-sources"><summary>Sources and dates checked</summary><ul>${rows.map(([, s]) => `<li><a href="${esc(s.url)}"${/^https?:/.test(s.url) ? ' target="_blank" rel="noopener"' : ''}>${esc(s.name)}</a>${s.how ? `, ${esc(s.how)}` : ''}. Checked ${esc(s.checked)}.</li>`).join('')}</ul>
      <p class="muted">Certainty: 95 to 100% read in the official source; 80 to 94% official, some interpretation; 60 to 79% reliable secondary source; Tip is opinion.</p></details>`;
  }
  const idsIn = (...arrs) => arrs.flat().filter(Boolean).map((f) => f.s).filter(Boolean);

  // ---------- location ----------
  function getFix() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) { rej(new Error('This phone or browser has no location.')); return; }
      navigator.geolocation.getCurrentPosition((p) => {
        const fix = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy || 0), alt: p.coords.altitude, at: Date.now() };
        sv(K.fix, fix); res(fix);
      }, (e) => rej(new Error(e.code === 1 ? 'Location is blocked. In iPhone Settings, Privacy, Location Services, allow it for Safari or this app.' : 'No location fix yet. Step into the open, wait a minute and try again. GPS (Global Positioning System) works with no cell signal, but the first fix can be slow.')), { enableHighAccuracy: true, timeout: 45000, maximumAge: 30000 });
    });
  }
  const normMu = (s) => { const m = String(s || '').match(/^\s*(\d{1,2})\s*[-‐-―\s]\s*0*(\d{1,2})\s*$/); return m && +m[1] >= 1 && +m[1] <= 8 ? `${+m[1]}-${+m[2]}` : ''; };
  const muAt = (lat, lon) => (window.HMHome && window.HMHome._muAt ? Promise.resolve(window.HMHome._muAt(lat, lon)).catch(() => null) : Promise.resolve(null));
  async function muCentre(mu) { // same method as the planner: area weighted centroid of the MU's biggest ring
    const man = await fetch('data/layers/manifest.json').then((r) => r.json());
    const l = (man.layers || []).find((x) => x.id === 'mu'); if (!l || !Array.isArray(l.files)) return null;
    const v = l.dataDate || man.updated || '', n = mu.split('-')[0];
    for (const f of l.files.filter((x) => (n === '7' ? /Region 7/.test(x.area) : x.area === 'Region ' + n))) {
      const fc = await fetch(f.file + (v ? `?v=${encodeURIComponent(v)}` : '')).then((r) => r.json());
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
  // WGS84 latitude and longitude to UTM (NAD83 differs by about a metre or two in BC)
  function utm(lat, lon) {
    const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2), rad = Math.PI / 180;
    const zone = Math.floor((lon + 180) / 6) + 1, lon0 = ((zone - 1) * 6 - 180 + 3) * rad, phi = lat * rad, lam = lon * rad;
    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = Math.cos(phi) * (lam - lon0);
    const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi) + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
    const E = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
    let Nn = k0 * (M + N * Math.tan(phi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720));
    if (lat < 0) Nn += 10000000;
    const band = 'CDEFGHJKLMNPQRSTUVWX'[Math.min(19, Math.max(0, Math.floor((lat + 80) / 8)))];
    return { zone, band, e: Math.round(E), n: Math.round(Nn) };
  }
  const km = (a, b) => { const r = Math.PI / 180, x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  const bases = () => (window.HM && window.HM.bases) || [];

  // Shared point picker (turnaround and live conditions). Saved point: K.pt {lat, lon, label, mu, src}
  function pickerHtml() {
    const tp = ld(K.trip, {});
    return `<div class="card sf-pick sf-noprint"><h2>Where?</h2>
      <p class="sf-cur" id="sf-cur"></p>
      <div class="sf-grid2">
        ${tp.lat ? '<button class="btn" data-pick="trip">Trip plan point</button>' : ''}
        <button class="btn" data-pick="gps">My GPS location</button>
      </div>
      <label class="f" for="sf-base">A home base</label>
      <select id="sf-base"><option value="">Choose a base</option>${bases().map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select>
      <label class="f" for="sf-mu">MU (Management Unit), centre point</label>
      <div class="sf-row"><input type="text" id="sf-mu" inputmode="numeric" placeholder="for example 3-27" autocomplete="off"><button class="btn" data-pick="mu">Use</button></div>
      <label class="f" for="sf-ll">Latitude, longitude</label>
      <div class="sf-row"><input type="text" id="sf-ll" inputmode="decimal" placeholder="50.86, -120.27" autocomplete="off"><button class="btn" data-pick="ll">Use</button></div>
    </div>`;
  }
  function wirePicker(root, onPick) {
    const show = () => { const p = ld(K.pt, null); $('#sf-cur', root).innerHTML = p ? `<b>${esc(p.label)}</b><br><span class="sf-mono">${f5(p.lat)}, ${f5(p.lon)}</span>${p.mu ? ` MU ${esc(p.mu)}` : ''}` : 'No point chosen yet.'; };
    const set = (p) => { sv(K.pt, p); show(); onPick(p); };
    show();
    $$('[data-pick]', root).forEach((b) => { b.onclick = async () => {
      const k = b.dataset.pick;
      try {
        if (k === 'trip') { const t = ld(K.trip, {}); set({ lat: +t.lat, lon: +t.lon, mu: t.mu || '', label: 'Trip plan: ' + (t.where || 'map point'), src: 'trip' }); }
        else if (k === 'gps') { b.disabled = true; b.textContent = 'Finding you...'; const f = await getFix(); const mu = await muAt(f.lat, f.lon); set({ lat: f.lat, lon: f.lon, mu: mu || '', label: `My GPS location (about ${f.acc} m)`, src: 'gps' }); }
        else if (k === 'mu') { const mu = normMu($('#sf-mu', root).value); if (!mu) { toast('Type an MU like 3-27.'); return; } const c = await muCentre(mu).catch(() => null); if (!c) { toast(`Could not find MU ${mu} on this phone. Open the Hunt Map once online, or type a point.`); return; } set({ lat: c.lat, lon: c.lon, mu, label: `Centre of MU ${mu} (approximate)`, src: 'mu' }); }
        else if (k === 'll') { const m = $('#sf-ll', root).value.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/); if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) { toast('Type latitude, longitude like 50.86, -120.27'); return; } const lat = +m[1], lon = +m[2]; const mu = await muAt(lat, lon); set({ lat, lon, mu: mu || '', label: 'Typed point', src: 'typed' }); }
      } catch (e) { toast(e.message); }
      finally { if (k === 'gps') { b.disabled = false; b.textContent = 'My GPS location'; } }
    }; });
    $('#sf-base', root).onchange = (e) => { const b = bases().find((x) => x.id === e.target.value); if (b) set({ lat: b.lat, lon: b.lon, mu: '', label: b.name + ' (approximate centre)', src: 'base' }); };
  }

  // ---------- turnaround alarm (global watcher, so it fires on any screen of the app) ----------
  let audio = null;
  const unlockAudio = () => { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { audio = null; } };
  function beep() {
    if (!audio) return;
    try { [0, 0.45, 0.9].forEach((t) => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audio.destination); g.gain.setValueAtTime(0.0001, audio.currentTime + t); g.gain.exponentialRampToValueAtTime(0.5, audio.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.35); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.4); }); } catch (e) { /* no sound */ }
  }
  function notify(titleText, body) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const opt = { body, tag: 'hm-turn', renotify: true, requireInteraction: true };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then((r) => r.showNotification(titleText, opt)).catch(() => { try { new Notification(titleText, opt); } catch (e) { /* none */ } });
      else new Notification(titleText, opt);
    } catch (e) { /* notifications not allowed here */ }
  }
  function overlay(st) {
    let o = document.getElementById('sf-alarm');
    if (!st || !st.on || st.acked || Date.now() < st.at) { if (o) o.remove(); return; }
    if (!o) {
      o = document.createElement('div'); o.id = 'sf-alarm'; o.setAttribute('role', 'alertdialog'); o.setAttribute('aria-label', 'Turnaround alarm');
      document.body.appendChild(o);
    }
    o.innerHTML = `<div class="sf-al-in"><div class="sf-al-big">TURN AROUND NOW</div><p>${esc(dot(`Your turnaround time was ${fmtT(st.at)}${Date.now() - st.at > 9e4 ? `, ${ago(st.at)}` : ''}`))}</p><p>Head back to the truck. Tell your partner.</p><button class="btn primary block" id="sf-al-ok">I am heading back. Stop the alarm</button></div>`;
    $('#sf-al-ok', o).onclick = () => { const s = ld(K.turn, {}); s.acked = true; sv(K.turn, s); o.remove(); if (/^#\/safety\/turn/.test(location.hash)) turnView(); };
  }
  function watch() {
    const st = ld(K.turn, null);
    if (!st || !st.on || st.acked) { overlay(null); return; }
    const left = st.at - Date.now();
    if (left <= 15 * 6e4 && left > 0 && !st.warned) { st.warned = true; sv(K.turn, st); notify('15 minutes to turnaround', dot(`Turn around at ${fmtT(st.at)}`)); toast(`15 minutes to turnaround (${fmtT(st.at)}).`); }
    if (left <= 0) {
      if (!st.fired) { st.fired = true; sv(K.turn, st); notify('Turn around now', dot(`Your turnaround time was ${fmtT(st.at)}`) + ' Head back.'); }
      overlay(st);
      if (document.visibilityState === 'visible' && (!watch.last || Date.now() - watch.last > 8000)) { watch.last = Date.now(); beep(); try { navigator.vibrate && navigator.vibrate([400, 200, 400, 200, 400]); } catch (e) { /* no vibrate */ } }
    }
  }
  setInterval(watch, 2000);
  window.HMSafety = { unlockAudio, check: watch }; // Hunt Map (map/hunt-field.js) sets the same alarm from the map
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') watch(); });

  // ---------- screens ----------
  let tick = null;
  const stopTick = () => { if (tick) { clearInterval(tick); tick = null; } };
  window.addEventListener('hashchange', () => { if (!/^#\/safety\/turn/.test(location.hash)) stopTick(); });

  function hub() {
    title('Safety');
    const st = ld(K.turn, null), on = st && st.on && !st.acked;
    view().innerHTML = `
      <a class="sf-911" href="tel:911">Call 911<small>Emergency. Works on any carrier's tower in range.</small></a>
      ${on ? `<a class="card sf-turnmini" href="#/safety/turn"><b>Turnaround at ${esc(fmtT(st.at))}</b><span id="sf-mini"></span></a>` : ''}
      <div class="sf-hub">
        <a class="btn block sf-big" href="#/safety/sos"><b>Emergency card</b><small>911, your location, lost, bleeding, cold. Works in airplane mode.</small></a>
        <a class="btn block sf-big" href="#/safety/trip"><b>Trip plan</b><small>Who, where, when back. You send it to your contact.</small></a>
        <a class="btn block sf-big" href="#/safety/turn"><b>Turnaround alarm</b><small>Sunset, legal light, countdown.</small></a>
        <a class="btn block sf-big" href="#/safety/wildlife"><b>Bears and cougars</b><small>Step by step, and bear spray.</small></a>
        <a class="btn block sf-big" href="#/safety/live"><b>Conditions check</b><small>Weather, wind, wildfires, avalanche, ice.</small></a>
      </div>
      <p class="muted">Saved on this phone only. Nothing is ever sent without you tapping Send.</p>
      <p class="muted">Full lessons: <a href="#/s/mc-skills-10">Safety Masterclass</a>, <a href="#/s/mc-nav-07">Lost</a>, <a href="#/s/bear-cougar-encounters">Bears and cougars</a>.</p>`;
    if (on) { const m = $('#sf-mini'); const up = () => { const l = st.at - Date.now(); m.textContent = l > 0 ? ` in ${countdown(l)}` : ' now'; }; up(); stopTick(); tick = setInterval(() => { if (!document.body.contains(m)) { stopTick(); return; } up(); }, 1000); }
  }

  // ----- emergency card -----
  function sosView(D) {
    title('Emergency card');
    const fix = ld(K.fix, null), trip = ld(K.trip, {});
    const nums = (D.numbers || []).filter((n) => n.id !== '911');
    view().innerHTML = `
      <div class="sf-card-print">
      <a class="sf-911" href="tel:911">1. Call 911<small>Police, ambulance, fire, search and rescue.</small></a>
      <div class="card"><h2>2. Your location</h2>
        <div id="sf-loc" class="sf-loc">${fix ? locHtml(fix) : '<p class="muted">No location yet.</p>'}</div>
        <div class="sf-grid2 sf-noprint"><button class="btn primary" id="sf-gps">Get my GPS location</button><button class="btn" id="sf-copy" ${fix ? '' : 'disabled'}>Copy location</button></div>
        <p class="muted">GPS (Global Positioning System) works with no cell signal and in airplane mode. The first fix can take a minute in the open.</p>
        ${trip.mu || trip.where ? `<p class="sf-n">Trip plan: ${esc(trip.where || '')}${trip.mu ? `, MU (Management Unit) ${esc(trip.mu)}` : ''}${trip.lat ? `, point ${f5(trip.lat)}, ${f5(trip.lon)}` : ''}</p>` : ''}
        <details class="sf-noprint"><summary>UTM (Universal Transverse Mercator), if a searcher asks</summary><div id="sf-utm">${fix ? utmHtml(fix) : '<p class="muted">Get a location first.</p>'}</div></details>
      </div>
      <div class="card"><h2>3. Tell dispatch</h2>${facts(D.dispatch, 'sf-num')}</div>
      ${D.nosignal && D.nosignal.length ? `<div class="card"><h2>No signal?</h2>${facts(D.nosignal)}</div>` : ''}
      <div class="card"><h2>Lost? STOP ${D.stopSrc && D.stopSrc.c ? badge(D.stopSrc.c) : ''}${D.stopSrc && D.stopSrc.s ? srcLink(D.stopSrc.s) : ''}</h2>
        <div class="sf-stop">${(D.stop || []).map((s) => `<div><b>${esc(s.k)}</b><span><strong>${esc(s.w)}.</strong> ${esc(s.t)}</span></div>`).join('')}</div>${facts(D.stopMore)}</div>
      ${D.bleed && D.bleed.length ? `<div class="card"><h2>Bad bleeding</h2>${facts(D.bleed, 'sf-num')}</div>` : ''}
      ${D.hypo && D.hypo.length ? `<div class="card"><h2>Hypothermia (too cold)</h2>${facts(D.hypo)}</div>` : ''}
      <div class="card"><h2>Other numbers</h2>${nums.map(numHtml).join('')}</div>
      <p class="muted">Study aid, not a first aid course. Take a hands on course with tourniquet practice ${TIP}. Checked ${esc(D.checked)}.</p>
      </div>
      <div class="btn-row sf-noprint"><button class="btn" id="sf-print">Print this card</button></div>
      ${D.fallback ? '<p class="muted">Short card: the full card loads once the app has been opened online.</p>' : ''}
      ${sourcesBox([...idsIn(D.dispatch, D.nosignal, D.stopMore, D.bleed, D.hypo, nums), D.stopSrc && D.stopSrc.s])}`;
    const fillLoc = (f) => { $('#sf-loc').innerHTML = locHtml(f); $('#sf-utm').innerHTML = utmHtml(f); $('#sf-copy').disabled = false; };
    $('#sf-gps').onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Finding you...';
      try { fillLoc(await getFix()); } catch (err) { $('#sf-loc').insertAdjacentHTML('beforeend', `<p class="sf-err">${esc(err.message)}</p>`); }
      b.disabled = false; b.textContent = 'Get my GPS location again';
    };
    $('#sf-copy').onclick = () => { const f = ld(K.fix, null); if (!f) return; const u = utm(f.lat, f.lon); copy(`My location: latitude ${f5(f.lat)}, longitude ${f5(f.lon)} (accuracy about ${f.acc} m, ${fmtDT(f.at)}). UTM zone ${u.zone}${u.band} ${u.e} E ${u.n} N.`).then((ok) => toast(ok ? 'Location copied. Paste it into a text or read it to 911.' : 'Copy did not work. Read the numbers out.')); };
    $('#sf-print').onclick = () => window.print();
  }
  function locHtml(f) {
    return `<div class="sf-ll"><div><small>Latitude</small><b>${f5(f.lat)}</b></div><div><small>Longitude</small><b>${f5(f.lon)}</b></div></div>
      <p class="muted">Accuracy about ${esc(f.acc)} m${f.alt != null ? `, elevation about ${Math.round(f.alt)} m` : ''}. Fix ${esc(fmtDT(f.at))} (${esc(ago(f.at))}).</p>`;
  }
  function utmHtml(f) { const u = utm(f.lat, f.lon); return `<p class="sf-mono">Zone ${u.zone}${u.band}<br>${u.e} E<br>${u.n} N</p><p class="muted">Worked out on the phone from the GPS fix (WGS84; NAD83 maps differ by about a metre or two here).</p>`; }
  function numHtml(n) {
    if (n.verify || !n.tel) return `<div class="sf-numrow"><div><b>${esc(n.label)}</b><div>${VERIFY}</div>${n.why ? `<div class="sf-n">${esc(n.why)}</div>` : ''}</div></div>`;
    return `<div class="sf-numrow"><div><b>${esc(n.label)}</b> ${badge(n.c)}${n.s ? srcLink(n.s) : ''}${n.why ? `<div class="sf-n">${esc(n.why)}</div>` : ''}</div>
      <div class="sf-numbtns"><a class="btn" href="tel:${esc(n.tel)}">${esc(n.show)}</a>${n.alt ? `<a class="btn" href="tel:${esc(n.alt.tel)}">${esc(n.alt.show)}</a>` : ''}</div></div>`;
  }

  // ----- trip plan -----
  const TRIP_FIELDS = [
    ['who', 'Your name', 'text'], ['party', 'Who is with you (names)', 'text'], ['count', 'How many people in total', 'number'],
    ['contact', 'Your contact at home (name)', 'text'], ['cphone', 'Contact phone (for a text message)', 'tel'], ['cemail', 'Contact email', 'email'],
    ['where', 'Where you are going (area, road, route)', 'textarea'], ['mu', 'MU (Management Unit), for example 3-27', 'text'],
    ['lat', 'Map point latitude', 'text'], ['lon', 'Map point longitude', 'text'],
    ['vehicle', 'Vehicle (make, colour, licence plate)', 'text'], ['parked', 'Where the vehicle will be parked', 'text'],
    ['start', 'Leaving', 'datetime-local'], ['ret', 'Planned return', 'datetime-local'], ['overdue', 'Overdue: if no word by this time, call 911', 'datetime-local'],
    ['phone', 'Your cell number', 'tel'], ['sat', 'Satellite device (inReach or iPhone satellite) and its message or map link', 'text'],
    ['notes', 'Notes (medical needs, experience, plan B route)', 'textarea'],
  ];
  const dtTxt = (v) => (v ? new Date(v).toLocaleString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
  function tripText(t) {
    const L = [];
    const add = (k, v) => { if (v && String(v).trim()) L.push(`${k}: ${String(v).trim()}`); };
    L.push(`TRIP PLAN from ${t.who || '(name)'}`);
    L.push('(AdventureSmart style trip plan. See adventuresmart.ca)');
    L.push('');
    if (t.overdue) L.push(`IF YOU HAVE NOT HEARD FROM ME BY ${dtTxt(t.overdue).toUpperCase()}: call 911 right away. Say I left a trip plan and read them this message. Do not wait. A false alarm is fine.`);
    else L.push('IF I AM OVERDUE: call 911. Say I left a trip plan and read them this message.');
    L.push('');
    add('Who', t.who); add('Party', [t.party, t.count ? `${t.count} people in total` : ''].filter(Boolean).join(', '));
    add('Where', t.where); add('MU (Management Unit)', t.mu);
    if (t.lat && t.lon) { add('Map point (latitude, longitude)', `${t.lat}, ${t.lon}`); add('Map link', `https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lon}#map=14/${t.lat}/${t.lon}`); }
    add('Vehicle', t.vehicle); add('Parked at', t.parked);
    add('Leaving', dtTxt(t.start)); add('Planned return', dtTxt(t.ret)); add('Overdue time', dtTxt(t.overdue));
    add('My cell', t.phone); add('Satellite device', t.sat);
    const gear = (t.gear || []).concat(t.gearOther ? [t.gearOther] : []);
    add('Gear with us', gear.join(', '));
    add('Notes', t.notes);
    add('Contact', [t.contact, t.cphone].filter(Boolean).join(', '));
    L.push(''); L.push(`Sent by me, ${t.who || ''}, from the Hunt Mentor app on ${new Date().toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`);
    return L.join('\n');
  }
  function tripView(D) {
    title('Trip plan');
    const t = ld(K.trip, {}); t.gear = Array.isArray(t.gear) ? t.gear : [];
    const T = D.trip || { intro: [], gear: [] };
    let hp = []; try { hp = (JSON.parse(localStorage.getItem('hm.v1') || '{}').plans || []).filter((p) => p && p.where); } catch (e) { hp = []; }
    const field = ([k, lab, type]) => {
      const v = t[k] == null ? '' : t[k];
      if (type === 'textarea') return `<label class="f" for="sf-t-${k}">${esc(lab)}</label><textarea id="sf-t-${k}" data-k="${k}" rows="3">${esc(v)}</textarea>`;
      const im = k === 'lat' || k === 'lon' ? ' inputmode="decimal"' : '';
      return `<label class="f" for="sf-t-${k}">${esc(lab)}</label><input class="sf-in" type="${type}" id="sf-t-${k}" data-k="${k}" value="${esc(v)}"${im} autocomplete="off">`;
    };
    const F = Object.fromEntries(TRIP_FIELDS.map((f) => [f[0], f]));
    view().innerHTML = `
      <div class="card"><h2>3 steps</h2><ol class="sf-steps"><li>Fill in the plan. It saves on this phone as you type.</li><li>Read the message below.</li><li>Tap Send. Your phone opens Messages or Mail. You press send.</li></ol>${facts(T.intro)}</div>
      ${hp.length ? `<div class="card"><label class="f" for="sf-hp">Fill from a saved hunt plan</label><div class="sf-row"><select id="sf-hp"><option value="">Choose a plan</option>${hp.map((p, i) => `<option value="${i}">${esc((p.where.label || 'Plan') + (p.from ? ', ' + p.from : ''))}</option>`).join('')}</select></div></div>` : ''}
      <div class="card"><h2>Who</h2>${['who', 'party', 'count'].map((k) => field(F[k])).join('')}</div>
      <div class="card"><h2>Your contact</h2>${['contact', 'cphone', 'cemail'].map((k) => field(F[k])).join('')}</div>
      <div class="card"><h2>Where</h2>${['where', 'mu', 'lat', 'lon'].map((k) => field(F[k])).join('')}
        <div class="sf-grid2"><button class="btn" id="sf-t-gps">Use my GPS</button><button class="btn" id="sf-t-muc">Use MU centre</button></div>
        <p class="muted">Tip: drop the point where you will park or start walking. The Hunt Map shows latitude and longitude when you tap a spot.</p>
        ${field(F.vehicle)}${field(F.parked)}</div>
      <div class="card"><h2>When</h2>${['start', 'ret', 'overdue'].map((k) => field(F[k])).join('')}
        <div class="sf-grid2"><button class="btn" id="sf-t-od2">Overdue = return + 2 h</button><button class="btn" id="sf-t-od0">Overdue = next morning 8 AM</button></div>
        <p id="sf-t-warn" class="sf-err" hidden></p>
        <p class="muted">Pick an overdue time you will not miss by accident, and stick to it ${TIP}.</p></div>
      <div class="card"><h2>Gear and contact</h2>${field(F.phone)}${field(F.sat)}
        <p class="f">Gear with you</p><div class="sf-checks">${(T.gear || []).map((g, i) => `<label class="sf-chk"><input type="checkbox" data-gear="${esc(g)}" ${t.gear.includes(g) ? 'checked' : ''}> <span>${esc(g)}</span></label>`).join('')}</div>
        <label class="f" for="sf-t-go">Other gear</label><input class="sf-in" type="text" id="sf-t-go" value="${esc(t.gearOther || '')}">
        ${T.gearSrc ? `<p class="muted">${esc(T.gearSrc.t.replace(/\s*\(Tip\)\.?$/, '.'))} ${T.gearSrc.c ? badge(T.gearSrc.c) : ''}${T.gearSrc.s ? srcLink(T.gearSrc.s) : ''}</p>` : ''}
        ${field(F.notes)}</div>
      <div class="card"><h2>The message</h2><pre class="sf-pre" id="sf-t-pre"></pre>
        <div class="sf-grid2">
          <button class="btn primary" id="sf-t-share">Send</button>
          <button class="btn" id="sf-t-copy">Copy</button>
          <a class="btn" id="sf-t-sms" href="#">Text message</a>
          <a class="btn" id="sf-t-mail" href="#">Email</a>
        </div>
        <p class="muted">Nothing is sent automatically. Your phone shows the message first and you press send.</p></div>
      <div class="card"><h2>Back safe?</h2><p>Tell your contact so they do not call for a search.</p>
        <div class="sf-grid2"><button class="btn primary" id="sf-t-back">Send "I am back safe"</button><button class="btn" id="sf-t-clear">Clear the plan</button></div></div>
      ${sourcesBox(idsIn(T.intro, [T.gearSrc]))}`;
    const root = view();
    const save = () => sv(K.trip, t);
    const msg = () => tripText(t);
    const backMsg = () => `I am back safe${t.where ? ` from ${t.where}` : ''}, ${new Date().toLocaleString('en-CA', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}. No need to call anyone. ${t.who || ''}`.trim();
    const smsHref = (body) => `sms:${encodeURIComponent((t.cphone || '').replace(/[^\d+]/g, ''))}?&body=${encodeURIComponent(body)}`;
    const mailHref = (subj, body) => `mailto:${encodeURIComponent(t.cemail || '')}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    const refresh = () => {
      const m = msg(); $('#sf-t-pre').textContent = m;
      $('#sf-t-sms').href = smsHref(m); $('#sf-t-mail').href = mailHref(`Trip plan: ${t.who || ''} ${t.ret ? 'back ' + dtTxt(t.ret) : ''}`.trim(), m);
      const w = $('#sf-t-warn'), probs = [];
      if (t.ret && t.overdue && new Date(t.overdue) <= new Date(t.ret)) probs.push('The overdue time should be after your planned return.');
      if (t.start && t.ret && new Date(t.ret) <= new Date(t.start)) probs.push('The return should be after you leave.');
      w.hidden = !probs.length; w.textContent = probs.join(' ');
    };
    $$('[data-k]', root).forEach((el) => { el.addEventListener('input', () => { t[el.dataset.k] = el.value; save(); refresh(); }); });
    $$('[data-gear]', root).forEach((el) => { el.onchange = () => { const g = el.dataset.gear; t.gear = t.gear.filter((x) => x !== g); if (el.checked) t.gear.push(g); save(); refresh(); }; });
    $('#sf-t-go').oninput = (e) => { t.gearOther = e.target.value; save(); refresh(); };
    const setF = (k, v) => { t[k] = v; const el = $(`#sf-t-${k}`); if (el) el.value = v; };
    const toLocalInput = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
    $('#sf-t-gps').onclick = async (e) => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Finding you...'; try { const f = await getFix(); setF('lat', f5(f.lat)); setF('lon', f5(f.lon)); const mu = await muAt(f.lat, f.lon); if (mu && !t.mu) setF('mu', mu); save(); refresh(); } catch (err) { toast(err.message); } b.disabled = false; b.textContent = 'Use my GPS'; };
    $('#sf-t-muc').onclick = async () => { const mu = normMu(t.mu); if (!mu) { toast('Type the MU first, like 3-27.'); return; } const c = await muCentre(mu).catch(() => null); if (!c) { toast(`Could not find MU ${mu} on this phone yet. Open it once online.`); return; } setF('mu', mu); setF('lat', String(c.lat)); setF('lon', String(c.lon)); save(); refresh(); toast(`Centre of MU ${mu} set. It is approximate: a real start point is better.`); };
    $('#sf-t-od2').onclick = () => { if (!t.ret) { toast('Set the planned return first.'); return; } setF('overdue', toLocalInput(new Date(+new Date(t.ret) + 2 * 36e5))); save(); refresh(); };
    $('#sf-t-od0').onclick = () => { if (!t.ret) { toast('Set the planned return first.'); return; } const d = new Date(t.ret); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); setF('overdue', toLocalInput(d)); save(); refresh(); };
    const hpSel = $('#sf-hp');
    if (hpSel) hpSel.onchange = () => { const p = hp[+hpSel.value]; if (!p) return; const w = p.where || {}; setF('where', w.label || ''); if (w.mu) setF('mu', w.mu); if (w.lat != null) { setF('lat', String(w.lat)); setF('lon', String(w.lon)); } if (p.from) setF('start', p.from + 'T05:00'); if (p.to) setF('ret', p.to + 'T19:00'); save(); refresh(); toast('Filled from the hunt plan. Check the times: they are only a starting guess.'); };
    const share = async (text, subj) => {
      if (navigator.share) { try { await navigator.share({ title: subj, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      const ok = await copy(text); toast(ok ? 'This phone cannot open the share sheet here. The message is copied: use Text message or Email, or paste it.' : 'Use Text message or Email below.');
    };
    $('#sf-t-share').onclick = () => { if (!t.who || !t.where || !t.ret || !t.overdue) { toast('Fill in at least your name, where, planned return and overdue time.'); return; } share(msg(), 'Trip plan'); };
    $('#sf-t-copy').onclick = () => copy(msg()).then((ok) => toast(ok ? 'Copied.' : 'Copy did not work.'));
    $('#sf-t-back').onclick = () => share(backMsg(), 'Back safe');
    $('#sf-t-clear').onclick = () => { if (confirm('Clear this trip plan from the phone?')) { localStorage.removeItem(K.trip); tripView(D); } };
    refresh();
  }

  // ----- turnaround -----
  const countdown = (ms) => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
  function sunFor(p, iso) {
    const H = window.HuntMentor; if (!H || !H.sunEvent || !p) return null;
    const [y, m, d] = iso.split('-').map(Number), day = new Date(y, m - 1, d);
    const rise = H.sunEvent(day, p.lat, p.lon, true), set = H.sunEvent(day, p.lat, p.lon, false);
    const hrs = (window.HM && window.HM.regs && window.HM.regs.hours) || {};
    const bg = (hrs.bigGame && hrs.bigGame.afterSunsetMin) || 60, mg = (hrs.migratory && hrs.migratory.afterSunsetMin) || 30;
    return set ? { rise: rise && +rise, set: +set, bigEnd: +set + bg * 6e4, migEnd: +set + mg * 6e4 } : null;
  }
  function turnView(D) {
    D = D || DATA || FALLBACK;
    title('Turnaround alarm');
    stopTick();
    const st = ld(K.turn, {}), T = D.turn || { legal: [], tips: [], ios: [] };
    const on = st.on && !st.acked;
    const date = st.date || todayIso();
    view().innerHTML = `
      ${on ? `<div class="card sf-cd"><p>Turn around at</p><div class="sf-cd-at">${esc(fmtT(st.at))}</div><div class="sf-cd-big" id="sf-cd">--:--</div><p class="muted" id="sf-cd-sub"></p>
        <button class="btn block" id="sf-stop">Stop the alarm</button></div>` : ''}
      ${pickerHtml()}
      <div class="card"><h2>Light at this point</h2>
        <label class="f" for="sf-date">Date</label><input type="date" id="sf-date" value="${esc(date)}">
        <div id="sf-sun"></div>${facts(T.legal)}</div>
      <div class="card"><h2>Pick your turnaround</h2>
        <label class="f" for="sf-walk">Walk out time to the truck (minutes)</label>
        <div class="sf-row"><input class="sf-in" type="number" id="sf-walk" inputmode="numeric" min="0" max="600" value="${esc(st.walk || '')}" placeholder="minutes"></div>
        <div class="sf-chips">${[30, 60, 90, 120].map((m) => `<button class="btn" data-walk="${m}">${m} min</button>`).join('')}</div>
        <div id="sf-sugg" class="sf-sugg"></div>
        <label class="f" for="sf-time">Or set your own time</label>
        <input class="sf-in" type="time" id="sf-time" value="${esc(st.time || '')}">
        <button class="btn primary block sf-go" id="sf-start">Start the alarm</button>
        ${tips(T.tips)}</div>
      <div class="card"><h2>Make sure it rings</h2>
        <div class="sf-grid2"><button class="btn" id="sf-notif">Allow notifications</button><button class="btn" id="sf-alarm-how">Set a phone alarm too</button></div>
        <button class="btn block" id="sf-ics" style="margin-top:10px">Add it to my calendar (with an alert)</button>
        <div class="callout warn"><b>Honest limits on iPhone</b><ul class="sf-facts">${(T.ios || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${T.iosSrc ? `<p class="muted">${badge(T.iosSrc.c)}${srcLink(T.iosSrc.s)}</p>` : ''}</div></div>
      ${sourcesBox([...idsIn(T.legal), T.iosSrc && T.iosSrc.s])}`;
    const root = view();
    let pt = ld(K.pt, null);
    const at = () => {
      const v = $('#sf-time').value; if (!v) return null;
      const [y, m, d] = ($('#sf-date').value || todayIso()).split('-').map(Number), [hh, mm] = v.split(':').map(Number);
      return vanMs(y, m, d, hh, mm);
    };
    const draw = () => {
      const iso = $('#sf-date').value || todayIso(), s = sunFor(pt, iso);
      $('#sf-sun').innerHTML = !pt ? '<p class="muted">Choose a point above to see sunset and legal light.</p>' : !s ? '<p class="muted">Sun times are not ready on this screen. Open the Home page once, then come back.</p>'
        : `<div class="sf-kv"><span>Sunrise</span><b>${s.rise ? esc(fmtT(s.rise)) : 'n/a'}</b></div><div class="sf-kv"><span>Sunset</span><b>${esc(fmtT(s.set))}</b></div>
           <div class="sf-kv"><span>Legal light ends: big game and upland birds</span><b>${esc(fmtT(s.bigEnd))}</b></div><div class="sf-kv"><span>Legal light ends: ducks and geese</span><b>${esc(fmtT(s.migEnd))}</b></div>
           <p class="muted">Worked out on the phone for ${esc(pt.label)}. Within a minute or two.</p>`;
      const w = +$('#sf-walk').value;
      $('#sf-sugg').innerHTML = s && w > 0 ? `<p>Suggested: sunset ${esc(fmtT(s.set))} minus ${w} min walk out =</p><div class="sf-sugg-t">${esc(fmtT(s.set - w * 6e4))}</div><button class="btn block" id="sf-use">Use ${esc(fmtT(s.set - w * 6e4))}</button>` : '<p class="muted">Enter your walk out time to get a suggested turnaround.</p>';
      const u = $('#sf-use'); if (u) u.onclick = () => { $('#sf-time').value = hm24(s.set - w * 6e4); toast('Time set. Now tap Start the alarm.'); };
    };
    wirePicker(root, (p) => { pt = p; draw(); });
    $('#sf-date').onchange = draw; $('#sf-walk').oninput = draw;
    $$('[data-walk]', root).forEach((b) => { b.onclick = () => { $('#sf-walk').value = b.dataset.walk; draw(); }; });
    draw();
    $('#sf-start').onclick = () => {
      const t = at(); if (!t) { toast('Set a time first.'); return; }
      if (t <= Date.now()) { toast('That time has already passed. Pick a later time or another date.'); return; }
      unlockAudio();
      sv(K.turn, { on: true, at: t, date: $('#sf-date').value, time: $('#sf-time').value, walk: $('#sf-walk').value, set: Date.now() });
      toast(`Alarm set for ${fmtT(t)} Keep this app open, and set a phone alarm too.`);
      turnView(D); window.scrollTo(0, 0);
    };
    const stop = $('#sf-stop'); if (stop) stop.onclick = () => { const s = ld(K.turn, {}); s.on = false; sv(K.turn, s); overlay(null); turnView(D); };
    $('#sf-notif').onclick = async () => {
      if (!('Notification' in window)) { toast('Notifications are not available here. On iPhone they need iOS 16.4 or later and the app added to the Home Screen.'); return; }
      try { const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Notifications on. They show while the app is running.' : 'Notifications are off. You can change this in Settings.'); } catch (e) { toast('Notifications could not be turned on here.'); }
    };
    $('#sf-alarm-how').onclick = () => {
      const t = at(), lbl = t ? fmtT(t) : 'your turnaround time';
      sheetShow(`<h2>Set a phone alarm for ${esc(lbl)}</h2>
        <p><b>iPhone</b></p><ol class="sf-steps"><li>Open the Clock app.</li><li>Tap Alarms, then the + button.</li><li>${esc(dot('Set ' + lbl))} Label it "Turn around".</li><li>Tap Save. Check the ring volume is up.</li></ol>
        <p>Or hold the side button and say to Siri: "Set an alarm for ${esc(lbl)}." Siri needs a signal for some requests ${TIP}.</p>
        <p><b>Android</b></p><ol class="sf-steps"><li>Open the Clock app, tap Alarm, then +.</li><li>Set ${esc(lbl)} and save.</li></ol>
        <p class="muted">A Clock app alarm rings even when the screen is locked. A web app cannot promise that.</p>
        ${t ? `<button class="btn block" id="sf-cp-time">Copy the time</button>` : ''}`);
      const c = $('#sf-cp-time'); if (c) c.onclick = () => copy(lbl).then(() => toast('Copied.'));
    };
    $('#sf-ics').onclick = () => {
      const t = at(); if (!t) { toast('Set a time first.'); return; }
      const z = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
      const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hunt Mentor//Safety//EN', 'BEGIN:VEVENT', `UID:hm-turn-${t}@hunt-mentor`, `DTSTAMP:${z(Date.now())}`, `DTSTART:${z(t)}`, `DTEND:${z(t + 15 * 6e4)}`, 'SUMMARY:Turn around now', 'DESCRIPTION:Turnaround time from Hunt Mentor. Head back to the truck.', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Turn around now', 'TRIGGER:PT0M', 'END:VALARM', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:15 minutes to turnaround', 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      download('turnaround.ics', ics, 'text/calendar');
      toast('Calendar file made. Open it and tap Add. Calendar alerts ring even when the app is closed.');
    };
    if (on) {
      const up = () => { const el = $('#sf-cd'); if (!el) { stopTick(); return; } const l = st.at - Date.now(); el.textContent = l > 0 ? countdown(l) : '0:00'; el.classList.toggle('sf-late', l <= 15 * 6e4); if (window.HMSayMinutes) window.HMSayMinutes('turn', l, (m) => (m > 0 ? `${m} minute${m > 1 ? 's' : ''} left before you turn around.` : 'Turnaround time. Head back now.')); $('#sf-cd-sub').textContent = l > 0 ? (l <= 15 * 6e4 ? 'left before you turn around. Under 15 minutes.' : 'left before you turn around') : `Turnaround time passed ${ago(st.at)}. Head back now.`; };
      up(); tick = setInterval(up, 1000);
    }
  }
  function sheetShow(html) {
    const s = document.getElementById('sheet'), b = document.getElementById('sheet-body');
    if (s && b) { b.innerHTML = html; s.hidden = false; } else alert(html.replace(/<[^>]+>/g, ' '));
  }

  // ----- bears and cougars -----
  function wildView(D) {
    title('Bears and cougars');
    const W = D.wildlife;
    if (!W) { view().innerHTML = '<div class="card"><p>This screen loads once the app has been opened online.</p><p><b>Never run from a bear or a cougar.</b></p></div>'; return; }
    view().innerHTML = `
      <div class="sf-chips sf-noprint"><a class="btn" href="#sf-w-see">Bear</a><a class="btn" href="#sf-w-attack">Attack</a><a class="btn" href="#sf-w-cougar">Cougar</a><a class="btn" href="#sf-w-spray">Spray</a></div>
      <div class="card sf-first">${facts(W.first)}</div>
      <div class="card"><h2>Black bear or grizzly?</h2>${facts(W.id)}<p class="muted">More photos: <a href="#/s/black-bear">Black bear lesson</a>.</p></div>
      <div class="card" id="sf-w-see"><h2>You see a bear: match what it does</h2>
        ${W.see.map((x, i) => `<div class="sf-step"><span class="sf-stepn">${i + 1}</span><div><b>${esc(x.h)}</b><p>${esc(x.t)} ${badge(x.c)}${srcLink(x.s)}</p></div></div>`).join('')}</div>
      <div class="card" id="sf-w-attack"><h2>It makes contact: defensive or predatory?</h2>
        ${W.contact.map((x) => `<div class="sf-att"><h3>${esc(x.h)}</h3><ol class="sf-steps">${x.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><p>${badge(x.c)}${srcLink(x.s)}</p>${x.note ? `<p class="sf-n">${esc(x.note)}</p>` : ''}</div>`).join('')}
        <p class="muted">Old rhyme "brown, lie down; black, fight back" is too simple. Use defensive or predatory ${TIP}.</p></div>
      <div class="card" id="sf-w-cougar"><h2>Cougar</h2>${facts(W.cougar, 'sf-num')}</div>
      <div class="card" id="sf-w-spray"><h2>Bear spray, step by step</h2>
        ${W.spray.map((x, i) => `<div class="sf-step"><span class="sf-stepn">${i + 1}</span><div><b>${esc(x.h)}</b><p>${esc(x.t)} ${badge(x.c)}${srcLink(x.s)}</p>${x.n ? `<p class="sf-n">${esc(x.n)}</p>` : ''}</div></div>`).join('')}
        ${facts(W.sprayMore)}</div>
      <div class="card"><h2>Report it</h2><p>${esc(W.report.t)} ${badge(W.report.c)}${srcLink(W.report.s)}</p>
        ${(D.numbers || []).filter((n) => n.id === 'rapp').map(numHtml).join('')}<p>Someone hurt: call 911 first.</p></div>
      <p class="muted">Full lesson with photos and quiz: <a href="#/s/bear-cougar-encounters">Bears and cougars</a>. Checked ${esc(D.checked)}.</p>
      ${sourcesBox(idsIn(W.first, W.id, W.see, W.contact, W.cougar, W.spray, W.sprayMore, [W.report]))}`;
    $$('.sf-chips a[href^="#sf-"]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
  }

  // ----- live conditions -----
  const AGO = 'https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services';
  const getJ = (url, ms = 20000) => {
    const ac = 'AbortController' in window ? new AbortController() : null; const t = ac && setTimeout(() => ac.abort(), ms);
    return fetch(url, { credentials: 'omit', cache: 'no-store', signal: ac && ac.signal }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).finally(() => t && clearTimeout(t));
  };
  const dirName = (d) => (d == null ? '' : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((d % 360) + 360) % 360 / 45) % 8]);
  const stripHtml = (h) => { try { return (new DOMParser().parseFromString(String(h || ''), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) { return ''; } };
  async function fetchWeather(p) {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,freezing_level_height&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,sunset&timezone=America%2FVancouver&forecast_days=3`;
    const d = await getJ(u);
    const H = d.hourly || {}, now = new Date().toLocaleString('sv-SE', { timeZone: TZ }).slice(0, 13).replace(' ', 'T');
    let i0 = (H.time || []).findIndex((t) => t.slice(0, 13) >= now); if (i0 < 0) i0 = 0;
    const hours = [];
    for (let i = i0; i < Math.min((H.time || []).length, i0 + 25); i += 3) hours.push({ t: H.time[i], temp: H.temperature_2m[i], pp: H.precipitation_probability[i], pr: H.precipitation[i], ws: H.wind_speed_10m[i], wg: H.wind_gusts_10m[i], wd: H.wind_direction_10m[i], fz: H.freezing_level_height ? H.freezing_level_height[i] : null });
    const D = d.daily || {};
    const days = (D.time || []).map((t, i) => ({ t, max: D.temperature_2m_max[i], min: D.temperature_2m_min[i], pr: D.precipitation_sum[i], ws: D.wind_speed_10m_max[i], wg: D.wind_gusts_10m_max[i] }));
    return { elev: d.elevation, hours, days };
  }
  async function fetchFires(p) {
    const q = `where=${encodeURIComponent("FIRE_STATUS <> 'Out'")}&geometry=${p.lon},${p.lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=100&units=esriSRUnit_Kilometer&outFields=FIRE_NUMBER,INCIDENT_NAME,FIRE_STATUS,CURRENT_SIZE,LATITUDE,LONGITUDE,GEOGRAPHIC_DESCRIPTION,FIRE_URL,FIRE_OF_NOTE_IND&returnGeometry=false&f=json`;
    const d = await getJ(`${AGO}/BCWS_ActiveFires_PublicView/FeatureServer/0/query?${q}`);
    if (d.error) throw new Error(d.error.message || 'service error');
    return (d.features || []).map((f) => f.attributes).map((a) => ({ num: a.FIRE_NUMBER, name: a.INCIDENT_NAME, st: a.FIRE_STATUS, ha: a.CURRENT_SIZE, km: km(p, { lat: a.LATITUDE, lon: a.LONGITUDE }), where: a.GEOGRAPHIC_DESCRIPTION, url: a.FIRE_URL, note: a.FIRE_OF_NOTE_IND === 'Y' }))
      .sort((a, b) => a.km - b.km).slice(0, 12);
  }
  async function fetchPoly(p, svc, layer, fields) {
    const q = `where=1%3D1&geometry=${p.lon},${p.lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=${fields}&returnGeometry=false&f=json`;
    const d = await getJ(`${AGO}/${svc}/FeatureServer/${layer}/query?${q}`);
    if (d.error) throw new Error(d.error.message || 'service error');
    return (d.features || []).map((f) => f.attributes);
  }
  async function fetchAvy(p) {
    const r = await fetch(`https://api.avalanche.ca/forecasts/en/products/point?lat=${p.lat}&long=${p.lon}`, { credentials: 'omit', cache: 'no-store' });
    if (r.status === 404) return { none: true };
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(); if (!d || !d.report) return { none: true };
    const R = d.report;
    return {
      url: d.url, owner: d.owner && d.owner.display, title: R.title, issued: R.dateIssued, until: R.validUntil,
      highlights: stripHtml(R.highlights).slice(0, 600),
      days: (R.dangerRatings || []).slice(0, 3).map((x) => ({ day: x.date && x.date.display, alp: x.ratings.alp.rating.display, tln: x.ratings.tln.rating.display, btl: x.ratings.btl.rating.display })),
    };
  }
  function liveView(D) {
    title('Conditions check');
    view().innerHTML = `
      <div class="card"><h2>3 steps</h2><ol class="sf-steps"><li>Choose where.</li><li>Tap Check now while you have signal.</li><li>Read the results. They stay saved for when you lose signal.</li></ol></div>
      ${pickerHtml()}
      <button class="btn primary block sf-go sf-noprint" id="sf-live-go">Check now</button>
      <p id="sf-live-net" class="muted"></p>
      <div id="sf-live-out"></div>
      ${sourcesBox(['openmeteo', 'firedata', 'bans', 'bcwsmap', 'avcan', 'avcan-early', 'redcross-ice', ...idsIn(D.ice && D.ice.rules, D.avy && D.avy.rules)])}`;
    const root = view();
    const net = () => { const n = $('#sf-live-net'); if (n) n.textContent = navigator.onLine ? '' : 'No signal right now. Showing the last saved check and the rules. Live data needs a connection.'; };
    net(); window.addEventListener('online', net); window.addEventListener('offline', net);
    const render = () => { const c = ld(K.live, null); $('#sf-live-out').innerHTML = liveHtml(D, c); };
    wirePicker(root, () => {});
    $('#sf-live-go').onclick = async (e) => {
      const p = ld(K.pt, null); if (!p) { toast('Choose a point first.'); return; }
      if (!navigator.onLine) { toast('No signal. Showing the last saved check.'); render(); return; }
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Checking...';
      const res = { at: Date.now(), pt: p, err: {} };
      const run = (k, fn) => fn().then((v) => { res[k] = v; }, (er) => { res.err[k] = String(er && er.message || er); });
      await Promise.all([
        run('wx', () => fetchWeather(p)),
        run('fires', () => fetchFires(p)),
        run('bans', () => fetchPoly(p, 'British_Columbia_Bans_and_Prohibition_Areas_-_View', 14, 'TYPE,ACCESS_PROHIBITION_DESCRIPTION,ACCESS_STATUS_EFFECTIVE_DATE,FIRE_CENTRE_NAME,BULLETIN_URL')),
        run('restr', () => fetchPoly(p, 'British_Columbia_Area_Restrictions_-_View', 13, 'NAME,ACCESS_STATUS_EFFECTIVE_DATE,FIRE_CENTRE_NAME,BULLETIN_URL')),
        run('avy', () => fetchAvy(p)),
      ]);
      sv(K.live, res); b.disabled = false; b.textContent = 'Check again'; render();
    };
    render();
  }
  function liveHtml(D, c) {
    const link = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
    const fail = (k, what, u, t) => (c && c.err && c.err[k] ? `<p class="sf-err">Could not load ${what} (${esc(c.err[k])}). Open ${link(u, t)} instead.</p>` : '');
    const stamp = c ? `<div class="card sf-stamp"><b>Last checked ${esc(fmtDT(c.at))}</b> (${esc(ago(c.at))})<br>${esc(c.pt.label)}: <span class="sf-mono">${f5(c.pt.lat)}, ${f5(c.pt.lon)}</span>${c.pt.mu ? `, MU (Management Unit) ${esc(c.pt.mu)}` : ''}${Date.now() - c.at > 6 * 36e5 ? '<p class="sf-err">This is old. Conditions change. Check again when you have signal.</p>' : ''}</div>` : '<div class="card"><p class="muted">No check saved yet. Choose a point and tap Check now.</p></div>';
    // weather
    let wx = '';
    if (c && c.wx) {
      const W = c.wx;
      wx = `<p class="muted">Forecast for the model's ground height at this point, about ${esc(Math.round(W.elev))} m. Wind is where it blows from.</p>
        <div class="tbl"><table class="sf-tbl"><thead><tr><th>Day</th><th>Low to high</th><th>Rain or snow</th><th>Wind, gusts</th></tr></thead><tbody>
        ${W.days.map((d) => `<tr><td>${esc(new Date(d.t + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'short', day: 'numeric' }))}</td><td>${Math.round(d.min)} to ${Math.round(d.max)}°C</td><td>${d.pr} mm</td><td>${Math.round(d.ws)}, ${Math.round(d.wg)} km/h</td></tr>`).join('')}</tbody></table></div>
        <h3>Next 24 hours</h3><div class="tbl"><table class="sf-tbl"><thead><tr><th>Time</th><th>Temp</th><th>Wind, gusts km/h</th><th>Rain chance</th><th>Freezing level</th></tr></thead><tbody>
        ${W.hours.map((h) => `<tr><td>${esc(new Date(h.t).toLocaleTimeString('en-CA', { hour: 'numeric' }))}</td><td>${Math.round(h.temp)}°C</td><td>${esc(dirName(h.wd))} ${Math.round(h.ws)}, ${Math.round(h.wg)}</td><td>${h.pp == null ? '' : h.pp + '%'}</td><td>${h.fz == null ? '' : Math.round(h.fz) + ' m'}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted">Weather data by ${link('https://open-meteo.com/', 'Open-Meteo.com')} (CC BY 4.0). A model forecast, not a promise.</p>`;
    }
    // fires
    let fires = '';
    if (c && c.fires) fires = c.fires.length ? `<ul class="sf-list">${c.fires.map((f) => `<li><b>${esc(f.name && f.name !== f.num ? f.name : 'Fire ' + f.num)}</b>${f.note ? ' <span class="pill soon">Wildfire of note</span>' : ''}<br>${esc(f.st)}, about ${esc(f.ha)} ha, ${Math.round(f.km)} km away${f.where ? `<br><span class="muted">${esc(f.where)}</span>` : ''}${f.url ? `<br>${link(f.url, 'Details')}` : ''}</li>`).join('')}</ul>` : '<p>No active fires within 100 km in the official layer at the time of the check.</p>';
    const date = (ms) => (ms ? new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' }) : '');
    let bans = '';
    if (c && c.bans) bans += c.bans.length ? `<ul class="sf-list">${c.bans.map((b) => `<li><b>${esc(b.TYPE || 'Ban or prohibition')}</b> ${esc(b.ACCESS_PROHIBITION_DESCRIPTION || '')}${b.ACCESS_STATUS_EFFECTIVE_DATE ? `<br>In effect from ${esc(date(b.ACCESS_STATUS_EFFECTIVE_DATE))}` : ''}${b.BULLETIN_URL ? `<br>${link(b.BULLETIN_URL, 'Official bulletin')}` : ''}</li>`).join('')}</ul>` : '<p>No fire ban or prohibition area covers this point in the official layer.</p>';
    if (c && c.restr) bans += c.restr.length ? `<ul class="sf-list">${c.restr.map((b) => `<li><b>Area restriction: ${esc(b.NAME || '')}</b>${b.ACCESS_STATUS_EFFECTIVE_DATE ? `<br>From ${esc(date(b.ACCESS_STATUS_EFFECTIVE_DATE))}` : ''}${b.BULLETIN_URL ? `<br>${link(b.BULLETIN_URL, 'Official bulletin')}` : ''}</li>`).join('')}</ul>` : '<p>No wildfire area restriction covers this point in the official layer.</p>';
    // avalanche
    let avy = '';
    if (c && c.avy) {
      const A = c.avy;
      avy = A.none ? `<p>No Avalanche Canada forecast area covers this point. Check ${link('https://avalanche.ca/map', 'avalanche.ca')} if you go into the mountains.</p>`
        : `<p><b>${esc(A.owner || 'Forecast')}</b>${A.title && A.title.length < 60 ? `: ${esc(A.title)}` : ''}. Issued ${esc(fmtDT(Date.parse(A.issued)))}, valid until ${esc(fmtDT(Date.parse(A.until)))}.</p>
          ${A.days && A.days.length ? `<div class="tbl"><table class="sf-tbl"><thead><tr><th>Day</th><th>Alpine</th><th>Treeline</th><th>Below treeline</th></tr></thead><tbody>${A.days.map((d) => `<tr><td>${esc(d.day)}</td><td>${esc(d.alp)}</td><td>${esc(d.tln)}</td><td>${esc(d.btl)}</td></tr>`).join('')}</tbody></table></div>` : ''}
          ${A.highlights ? `<p>${esc(A.highlights)}</p>` : ''}<p>${link(A.url || 'https://avalanche.ca/map', 'Full forecast on avalanche.ca')}</p>`;
    }
    const sec = (h, body, extra) => `<div class="card"><h2>${h}</h2>${body}${extra || ''}</div>`;
    return stamp
      + sec('Weather and wind', wx || '<p class="muted">No weather saved yet.</p>', fail('wx', 'the forecast', 'https://open-meteo.com/', 'Open-Meteo') + tips(D.weather && D.weather.tips))
      + sec('Wildfires near you', (fires || '<p class="muted">No fire check saved yet.</p>') + fail('fires', 'the fire layer', 'https://wildfiresituation.nrs.gov.bc.ca/map', 'the BC Wildfire Service map'),
        `<p class="muted">Official BC Wildfire Service data, updated about every 15 minutes, and it can lag ${badge(95)}${srcLink('firedata')}. ${link('https://wildfiresituation.nrs.gov.bc.ca/map', 'Wildfire map')}</p>${(D.numbers || []).filter((n) => n.id === 'fire').map(numHtml).join('')}`)
      + sec('Fire bans and area restrictions', (bans || '<p class="muted">No bans check saved yet.</p>') + fail('bans', 'fire bans', 'https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions', 'Fire bans and restrictions') + fail('restr', 'area restrictions', 'https://wildfiresituation.nrs.gov.bc.ca/map', 'the BC Wildfire Service map'),
        `<p class="muted">An empty result is not a promise. Read ${link('https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions', 'Fire bans and restrictions')} the night before you go ${TIP}.</p>`)
      + sec('Avalanche', (avy || '<p class="muted">No avalanche check saved yet.</p>') + fail('avy', 'the avalanche forecast', 'https://avalanche.ca/map', 'avalanche.ca'), facts(D.avy && D.avy.rules) + `<p class="muted">Lesson: <a href="#/s/avalanche-hunters">Avalanche awareness</a>.</p>`)
      + sec('Ice: general guidance', '<p class="sf-n">No live ice data exists. These are general rules, not a check of your lake.</p>' + facts(D.ice && D.ice.rules) + tips(D.ice && D.ice.tips), '<p class="muted">Lesson: <a href="#/s/ice-cold-water">Ice and cold water</a>.</p>');
  }

  // ---------- router ----------
  function route(args) {
    const sub = (args && args[0]) || '';
    stopTick();
    if (!sub) { hub(); return; }
    view().innerHTML = '<p class="muted">Loading...</p>';
    load().then((D) => {
      if (!/^#\/safety/.test(location.hash)) return;
      if (sub === 'sos') sosView(D);
      else if (sub === 'trip') tripView(D);
      else if (sub === 'turn') turnView(D);
      else if (sub === 'wildlife') wildView(D);
      else if (sub === 'live') liveView(D);
      else hub();
      window.scrollTo(0, 0);
    });
  }

  const css = `
  .sf-911{display:block;background:var(--bad);color:#fff;text-decoration:none;border-radius:16px;padding:16px 18px;margin:0 0 14px;font-size:30px;font-weight:900;text-align:center;min-height:64px}
  .sf-911 small{display:block;font-size:15px;font-weight:600;opacity:.95}
  .sf-hub{display:grid;gap:10px;margin-bottom:14px}
  .sf-big{flex-direction:column;align-items:flex-start;text-align:left;padding:14px 16px;min-height:64px;text-decoration:none}
  .sf-big b{font-size:19px}.sf-big small{font-size:15px;color:var(--muted);font-weight:500}
  .sf-turnmini{display:block;text-decoration:none;color:var(--ink);border:2px solid var(--accent)}
  .sf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
  .sf-grid2 .btn{min-height:48px;text-decoration:none;text-align:center;justify-content:center;padding:6px 8px;font-size:16px}
  .sf-row{display:flex;gap:8px}.sf-row input,.sf-row select{flex:1;min-width:0}.sf-row .btn{min-height:48px;padding:0 16px}
  .sf-in,input[type=time].sf-in,input[type=number].sf-in,input[type=tel].sf-in,input[type=email].sf-in,input[type=datetime-local].sf-in{width:100%;font-size:18px;padding:12px;border-radius:12px;border:2px solid var(--line);background:var(--card);color:var(--ink);min-height:48px;box-sizing:border-box}
  .sf-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.sf-chips .btn{min-height:44px;padding:0 14px;text-decoration:none;font-size:16px}
  .sf-facts{margin:8px 0;padding-left:20px}.sf-facts li{margin:6px 0;font-size:17px;overflow-wrap:anywhere}
  .sf-num{list-style:decimal}
  .sf-src{font-size:14px;margin-left:4px;overflow-wrap:anywhere}
  .sf-n{font-size:14px;color:var(--muted);margin:4px 0}
  .sf-steps{padding-left:22px;margin:8px 0}.sf-steps li{margin:6px 0;font-size:17px}
  .sf-loc .sf-ll{display:grid;grid-template-columns:1fr;gap:8px}
  .sf-ll div{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:10px}
  .sf-ll small{display:block;font-size:14px;color:var(--muted)}.sf-ll b{font-size:28px;font-family:ui-monospace,Menlo,monospace;overflow-wrap:anywhere}
  .sf-mono{font-family:ui-monospace,Menlo,monospace;font-size:17px}
  .sf-err{color:var(--bad);font-weight:700;font-size:15px}
  .sf-stop{display:grid;gap:8px;margin:8px 0}.sf-stop div{display:flex;gap:12px;align-items:center}
  .sf-stop b{flex:0 0 48px;height:48px;border-radius:12px;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:28px;font-weight:900}
  .sf-stop span{font-size:17px}
  .sf-numrow{border-top:1px solid var(--line);padding:10px 0}.sf-numrow:first-of-type{border-top:0}
  .sf-numbtns{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.sf-numbtns .btn{min-height:48px;text-decoration:none;font-size:18px;font-weight:800;padding:0 14px}
  .sf-pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px;font-size:15px;max-height:340px;overflow:auto}
  .sf-checks{display:grid;gap:4px}.sf-chk{display:flex;gap:10px;align-items:center;min-height:44px;font-size:16px}.sf-chk input{width:24px;height:24px}
  .sf-cd{text-align:center;border:3px solid var(--accent)}.sf-cd p{margin:4px 0}
  .sf-cd-at{font-size:28px;font-weight:800}.sf-cd-big{font-size:64px;font-weight:900;font-variant-numeric:tabular-nums;line-height:1.1;margin:6px 0}
  .sf-cd-big.sf-late{color:var(--bad)}
  .sf-kv{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:16px}.sf-kv b{white-space:nowrap;font-size:18px}
  .sf-sugg{margin:10px 0}.sf-sugg-t{font-size:34px;font-weight:900}
  .sf-go{margin-top:14px;min-height:56px;font-size:19px;font-weight:800}
  .sf-step{display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line)}.sf-step:first-of-type{border-top:0}
  .sf-step p{margin:4px 0;font-size:17px}.sf-step b{font-size:17px}
  .sf-stepn{flex:0 0 34px;height:34px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:900}
  .sf-att{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:10px 0}.sf-att h3{margin:0 0 4px;font-size:18px}
  .sf-first{border:2px solid var(--bad)}.sf-first li{font-weight:700}
  .sf-list{padding-left:18px}.sf-list li{margin:8px 0;font-size:16px;overflow-wrap:anywhere}
  .sf-tbl{width:100%;border-collapse:collapse;font-size:14px}.sf-tbl th,.sf-tbl td{padding:6px 5px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
  .sf-sources summary,details.sf-noprint>summary{min-height:44px;display:flex;align-items:center;font-weight:700;cursor:pointer}.sf-sources li{font-size:14px;margin:6px 0;overflow-wrap:anywhere}
  .sf-cur{font-size:16px;margin:0 0 6px}
  #sf-alarm{position:fixed;inset:0;z-index:50;background:rgba(179,38,30,.96);color:#fff;display:flex;align-items:center;justify-content:center;padding:16px}
  .sf-al-in{max-width:420px;width:100%;text-align:center}.sf-al-in p{font-size:19px}
  .sf-al-big{font-size:44px;font-weight:900;line-height:1.1;margin-bottom:10px;animation:sfpulse 1s infinite alternate}
  #sf-alarm .btn{min-height:60px;font-size:19px;background:#fff;color:#b3261e;border-color:#fff}
  @keyframes sfpulse{from{opacity:1}to{opacity:.55}}
  @media (prefers-reduced-motion:reduce){.sf-al-big{animation:none}}
  @media print{.sf-noprint,.sf-sources,#sf-alarm{display:none!important}.sf-911{background:none;color:#000;border:3px solid #000}.sf-stop b,.sf-stepn{background:none;color:#000;border:2px solid #000}.card{break-inside:avoid;border:1px solid #000}a.sf-src{color:#000}}`;
  function init() { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); watch(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.HMRoutes = window.HMRoutes || {};
  window.HMRoutes.safety = route;
  window.HMSafety = { utm, tripText, countdown, load };
})();
