/* After the shot add on (APP-IMPROVE-PROMPT.md Part 3). Routes: #/aftershot (start or continue), #/aftershot/1 to #/aftershot/10 (one step each).
   Content: data/addons/aftershot/steps.json (precached; every fact copied from the app's lessons, with certainty, source and page).
   Diagrams: copies of lesson diagrams in data/addons/aftershot/img/ (inlined, so the app's diagram tips still work).
   User data on this phone only:
     localStorage hm.aftershot.run    the hunt in progress (steps done, GPS points, hit sign, notes, checklists, Record of Receipt)
     localStorage hm.aftershot.timer  the wait timer as time stamps { start, ms, label }, so the countdown survives a reload or a closed app
     localStorage hm.aftershot.log    finished runs (short summary)
     localStorage hm.aftershot.data   last good copy of steps.json
     IndexedDB hm-map (map/store.js)  "Shot from" and "Deer down" waypoints (items) and photos (photos), so the Hunt Map and the backup have them
     localStorage hm.v1 journal       "Save to journal" adds or updates one entry in the app's own journal format, then reloads the page
                                      (app.js keeps its state in memory; the reload makes it read the new entry instead of writing over it)
   Links: a tile on Field Mode, a card on Home and a row on More, added from here with a MutationObserver (app.js, home.js untouched). */
(function () {
  'use strict';
  const TZ = 'America/Vancouver';
  const K = { run: 'hm.aftershot.run', timer: 'hm.aftershot.timer', log: 'hm.aftershot.log', data: 'hm.aftershot.data' };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ld = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const sv = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const view = () => document.getElementById('view');
  const title = (t) => { const e = document.getElementById('top-title'); if (e) e.textContent = t; };
  const tab = (name) => $$('.tabs a').forEach((a) => { const on = a.dataset.tab === name; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const badge = (v) => (v == null ? '<span class="pill">Tip</span>' : `<span class="cert as-cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}" title="Certainty">${v}%</span>`);
  const BANNER = '<aside class="callout warn"><p>Study aid only. The official regulations are the law.</p></aside>';
  const fmtT = (ms) => new Date(ms).toLocaleTimeString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const fmtDT = (ms) => new Date(ms).toLocaleString('en-CA', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const f5 = (x) => (+x).toFixed(5);
  const dur = (ms) => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
  const minTxt = (m) => (m >= 60 ? `${m / 60} h` : `${m} min`);
  const toast = (m) => { const t = $('.hm-toast'); if (!t) { alert(m); return; } t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3500); };

  // ---------- data ----------
  let D = null, dataP = null;
  function load() {
    if (D) return Promise.resolve(D);
    if (dataP) return dataP;
    dataP = fetch('data/addons/aftershot/steps.json', { credentials: 'omit' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => { D = d; sv(K.data, d); return d; })
      .catch(() => { D = ld(K.data, null); return D; })
      .finally(() => { dataP = null; });
    return dataP;
  }
  const svgCache = {};
  function diagram(id, box) {
    if (svgCache[id]) { box.innerHTML = svgCache[id]; return; }
    fetch(`data/addons/aftershot/img/${id}.svg`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
      .then((t) => { if (/^\s*<svg[\s>]/.test(t)) { svgCache[id] = t; box.innerHTML = t; } })
      .catch(() => { box.innerHTML = '<p class="muted">Diagram not saved on this phone yet. Open the lesson below.</p>'; });
  }

  // ---------- the run ----------
  const newRun = () => ({ id: 'as' + Date.now().toString(36), started: Date.now(), done: {}, checks: {}, ror: {}, photos: [] });
  const getRun = () => ld(K.run, null);
  const setRun = (r) => sv(K.run, r);
  function run() { let r = getRun(); if (!r) { r = newRun(); setRun(r); } r.done = r.done || {}; r.checks = r.checks || {}; r.ror = r.ror || {}; r.photos = r.photos || []; return r; }
  const patch = (fn) => { const r = run(); fn(r); setRun(r); return r; };
  const nextStep = (r) => { if (!D) return 1; const i = D.steps.findIndex((s) => !r.done[s.id]); return i < 0 ? D.steps.length : i + 1; };

  // ---------- timer (time stamps, so it survives a reload) ----------
  const getTimer = () => ld(K.timer, null);
  const timerLeft = (t) => t.start + t.ms - Date.now();
  let tick = null, wake = null;
  function startTick() {
    if (tick) return;
    tick = setInterval(paintTimer, 1000);
  }
  function stopTick() { if (tick) { clearInterval(tick); tick = null; } releaseWake(); }
  function paintTimer() {
    const t = getTimer();
    $$('[data-as-cd]').forEach((el) => { el.textContent = t ? (timerLeft(t) > 0 ? dur(timerLeft(t)) : '0:00') : ''; });
    $$('[data-as-cdlbl]').forEach((el) => { el.textContent = t ? (timerLeft(t) > 0 ? `left. Ends ${fmtT(t.start + t.ms)}` : `Wait over at ${fmtT(t.start + t.ms)}`) : ''; });
    if (t && timerLeft(t) <= 0 && !t.buzzed) {
      t.buzzed = true; sv(K.timer, t);
      try { if (navigator.vibrate) navigator.vibrate([400, 200, 400]); } catch (e) { /* no vibration */ }
      const big = $('#as-timer'); if (big) renderStep(2);
      else { const chip = $('#as-chip'); if (chip) chip.classList.add('over'); }
    }
  }
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; }
  }
  function releaseWake() { try { if (wake) wake.release(); } catch (e) { /* ignore */ } wake = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('#as-timer')) keepAwake(); });

  // legal light end today (1 hour after sunset for big game, data/regs.json), at the shot point or Mission
  function legalEnd() {
    const H = window.HuntMentor, HM = window.HM || {};
    if (!H || !H.sunEvent) return null;
    const r = getRun();
    const base = (HM.bases || []).find((b) => b.id === 'mission');
    const pt = (r && r.shot) || (base ? { lat: base.lat, lon: base.lon, base: true } : null);
    if (!pt) return null;
    const day = new Date(), bg = (HM.regs && HM.regs.hours && HM.regs.hours.bigGame) || {};
    const rise = H.sunEvent(day, pt.lat, pt.lon, true), set = H.sunEvent(day, pt.lat, pt.lon, false);
    return set && rise ? { s: +rise - (bg.beforeSunriseMin || 60) * 6e4, t: +set + (bg.afterSunsetMin || 60) * 6e4, base: !!pt.base } : null;
  }

  // ---------- GPS and the Hunt Map store (map/store.js) ----------
  const storeMod = () => import(new URL('map/store.js', document.baseURI).href).catch(() => null);
  function gps() {
    return new Promise((res) => {
      if (!('geolocation' in navigator)) { res(null); return; }
      navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy || 0), t: Date.now() }), () => res(null), { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
    });
  }
  async function pinWaypoint(pt, name, icon, note, oldId) {
    const m = await storeMod(); if (!m || !m.saveItem) return null;
    try {
      const old = oldId ? await m.get('items', oldId).catch(() => null) : null;
      const it = Object.assign(old || { kind: 'wpt', icon, color: '', folder: '' }, { name, note, coords: [+(+pt.lon).toFixed(6), +(+pt.lat).toFixed(6)], acc: pt.acc || null, from: 'gps', markedAt: pt.t });
      await m.saveItem(it);
      const T = window.HuntMap && window.HuntMap.tools; if (T && T.refresh) T.refresh().catch(() => {});
      return it.id;
    } catch (e) { return null; }
  }
  async function savePhoto(file) {
    const m = await storeMod(); if (!m || !m.put) return null;
    let blob = file;
    try {
      const img = await createImageBitmap(file);
      const s = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      blob = await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.85));
    } catch (e) { blob = file; }
    const id = m.uid ? m.uid('p') : 'p' + Date.now().toString(36);
    try { await m.put('photos', { id, blob }); return id; } catch (e) { return null; }
  }
  async function photoUrl(id) { const m = await storeMod(); if (!m) return null; const r = await m.get('photos', id).catch(() => null); return r && r.blob ? URL.createObjectURL(r.blob) : null; }
  const mapLink = (pt, label) => `<a class="btn" href="#/map/@${f5(pt.lat)},${f5(pt.lon)},17">${esc(label)}</a>`;

  // ---------- shared bits ----------
  function lessonHref(key) {
    const L = D.lessons[key], HM = window.HM; if (!L || !HM || !HM.sessions) return null;
    const s = HM.sessions.find((x) => x.id === L.id); if (!s) return null;
    const i = (s.steps || []).findIndex((st) => String(st.title || '').startsWith(L.screen));
    return `#/s/${L.id}/${i < 0 ? 0 : i}`;
  }
  function src(sid, page) {
    const s = D.sources[sid]; if (!s) return page ? esc(page) : '';
    const ext = /^https?:/.test(s.url);
    return `<a class="as-src" href="${esc(s.url)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(s.name.replace(/\s*\(.*$/, ''))}</a>${page ? ', ' + esc(page) : ''}`;
  }
  const ruleLi = (r) => `<li>${esc(r.t)} ${badge(r.c)} <span class="as-s">${src(r.s, r.p)}</span></li>`;
  const rulesBlock = (h, list) => (list && list.length ? `<div class="card"><h2>${esc(h)}</h2><ul class="as-list">${list.map(ruleLi).join('')}</ul><p class="as-s">Checked ${esc(D.checked)} against the lessons.</p></div>` : '');
  const tipsBlock = (list) => (list && list.length ? `<div class="card"><h2>Tips <span class="pill">Tip</span></h2><p class="as-s">Opinion and common hunter practice, not law, unless a % is shown.</p><ul class="as-list">${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '');
  const lessonsBlock = (keys) => { const l = (keys || []).map((k) => [k, lessonHref(k)]).filter(([, h]) => h); return l.length ? `<div class="card"><h2>Lessons</h2><div class="as-links">${l.map(([k, h]) => `<a class="as-lk" href="${h}">${esc(D.lessons[k].label)}</a>`).join('')}</div></div>` : ''; };
  const imgsBlock = (ids) => (ids && ids.length ? ids.map((id) => `<figure class="diagram as-fig" data-as-img="${esc(id)}"></figure>`).join('') : '');
  function chip() {
    const t = getTimer(); if (!t) return '';
    return `<a id="as-chip" class="as-chip${timerLeft(t) <= 0 ? ' over' : ''}" href="#/aftershot/2"><b>Wait timer</b> <span data-as-cd></span> <span data-as-cdlbl></span></a>`;
  }
  const doList = (list) => (list && list.length ? `<ol class="as-do">${list.map((x) => `<li>${typeof x === 'string' ? esc(x) : `${esc(x.t)} ${badge(x.c)} <span class="as-s">${src(x.s, x.p)}</span>`}</li>`).join('')}</ol>` : '');
  function checks(key, items) {
    const r = run(), on = r.checks[key] || [];
    return `<div class="as-checks" data-ck="${esc(key)}">${items.map((t, i) => `<label class="check as-ck"><input type="checkbox" data-i="${i}"${on[i] ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>`;
  }
  function wireChecks(el) {
    $$('.as-checks', el).forEach((box) => box.addEventListener('change', (e) => {
      const i = +e.target.dataset.i; patch((r) => { const a = r.checks[box.dataset.ck] || []; a[i] = e.target.checked ? Date.now() : 0; r.checks[box.dataset.ck] = a; });
    }));
  }

  // ---------- hub ----------
  function hub() {
    const r = getRun(), T = getTimer();
    const n = r ? nextStep(r) : 1, st = D.steps[n - 1];
    view().innerHTML = `${chip()}
      <p class="as-why">Deer down or hit? One step at a time. Big buttons, works with no signal.</p>
      ${r ? `<a class="btn primary block as-big" href="#/aftershot/${n}">Continue: step ${n}<small>${esc(st ? st.title : '')}</small></a>`
        : '<button class="btn primary block as-big" id="as-go">I just shot. Start<small>Step 1: mark the spot</small></button>'}
      <div class="as-steps">${D.steps.map((s, i) => `<a class="as-stp${r && r.done[s.id] ? ' ok' : ''}" href="#/aftershot/${i + 1}"><span class="as-n">${r && r.done[s.id] ? '&#10003;' : i + 1}</span><span>${esc(s.btn)}</span></a>`).join('')}</div>
      ${r ? `<p class="as-s">Started ${esc(fmtDT(r.started))}.</p><button class="btn block" id="as-reset">Start over (clears this hunt's steps)</button>` : ''}
      ${pastBlock()}
      <p class="as-s">For a black tailed deer near Harrison (Region 2). Facts come from the lessons, with certainty and source on each rule.</p>`;
    const go = $('#as-go'); if (go) go.onclick = () => { setRun(newRun()); location.hash = '#/aftershot/1'; };
    const rs = $('#as-reset'); if (rs) rs.onclick = () => { if (!confirm('Clear this hunt\'s steps, timer and Record of Receipt notes? Map waypoints, photos and journal entries stay.')) return; finish(false); hub(); };
    if (T) startTick(); paintTimer();
  }
  function pastBlock() {
    const L = ld(K.log, []); if (!L.length) return '';
    return `<details class="card as-past"><summary>Past hunts (${L.length})</summary><ul class="as-list">${L.slice(0, 10).map((x) => `<li>${esc(fmtDT(x.started))}: ${esc(x.text)}</li>`).join('')}</ul></details>`;
  }
  function finish(keep) {
    const r = getRun();
    if (keep && r) { const L = ld(K.log, []); L.unshift({ started: r.started, text: summaryText(r).split('\n').slice(0, 4).join('. ') }); sv(K.log, L.slice(0, 30)); }
    sv(K.run, null); sv(K.timer, null); stopTick();
  }

  // ---------- one step ----------
  function renderStep(n) {
    const st = D.steps[n - 1]; if (!st) { location.hash = '#/aftershot'; return; }
    const r = run();
    if (r.step !== n) patch((x) => { x.step = n; });
    title(`After the shot ${n}/${D.steps.length}`);
    const last = n === D.steps.length;
    view().innerHTML = `${n === 2 ? '' : chip()}
      <div class="as-head"><span class="as-n big">${n}</span><div><div class="as-k">Step ${n} of ${D.steps.length}</div><h2 class="as-t">${esc(st.title)}</h2></div></div>
      <p class="as-why">${esc(st.why)}</p>
      <div id="as-w"></div>
      ${st.do && st.do.length && !st.numbers ? `<div class="card"><h2>Do this</h2>${doList(st.do)}</div>` : ''}
      ${rulesBlock(st.id === 'tag' ? 'More rules on the licence' : 'The rules', st.rules)}
      ${imgsBlock(st.img)}
      ${tipsBlock(st.tips)}
      ${lessonsBlock(st.lessons)}
      <div class="as-bar"><a class="btn" href="${n > 1 ? `#/aftershot/${n - 1}` : '#/aftershot'}">Back</a>
        ${last ? '<button class="btn primary" id="as-done">Finish</button>' : `<button class="btn primary" id="as-done">Done${r.done[st.id] ? ' again' : ''}<small>Next: ${esc(D.steps[n].btn)}</small></button>`}</div>`;
    const W = $('#as-w');
    (WIDGETS[st.id] || (() => {}))(W, st, r);
    wireChecks(view());
    $$('[data-as-img]').forEach((f) => diagram(f.dataset.asImg, f));
    const tabs = document.getElementById('tabs'), bar = $('.as-bar');
    if (tabs && bar && getComputedStyle(tabs).position === 'fixed') bar.style.bottom = Math.round(tabs.getBoundingClientRect().height) + 'px';
    $('#as-done').onclick = () => {
      if (st.id === 'tag') { const c = (run().checks.tag || []).filter(Boolean).length; if (c < st.checks.length && !confirm('Not every licence box is ticked. The licence is cancelled before you handle the deer. Mark done anyway?')) return; }
      patch((x) => { x.done[st.id] = Date.now(); });
      if (last) { finish(true); toast('Hunt saved in Past hunts. Well done.'); location.hash = '#/aftershot'; return; }
      location.hash = `#/aftershot/${n + 1}`;
    };
    if (getTimer()) startTick(); paintTimer();
  }

  // ---------- step widgets ----------
  const WIDGETS = {
    mark(W, st, r) {
      const p = r.shot;
      W.innerHTML = `<div class="card as-act"><h2>Where you shot from</h2>
        ${p ? `<p class="as-big2">Saved ${esc(fmtT(p.t))}${p.acc ? `, GPS (Global Positioning System) within about ${p.acc} m` : ''}</p><p class="as-s">${f5(p.lat)}, ${f5(p.lon)}${r.shotWpt ? '. Also a "Shot from" waypoint on the Hunt Map.' : '. Saved on this phone. The map waypoint could not be made here.'}</p>`
          : '<p>Tap once. Your phone finds you with GPS (Global Positioning System). No signal needed.</p>'}
        <button class="btn primary block as-big" id="as-gps">${p ? 'Save again here' : 'Save my spot'}</button>
        <div class="btn-row">${p ? mapLink(p, 'Open in map') : ''}<a class="btn" href="#/map">Hunt Map: truck arrow</a></div>
        <label class="f" for="as-lm">Landmark at the last place you saw it</label>
        <input id="as-lm" type="text" placeholder="Split cedar, big stump, rock face" value="${esc(r.landmark || '')}">
        <p class="as-s">Turnaround time set? <a href="#/safety/turn">Safety: turnaround alarm</a>.</p></div>`;
      $('#as-lm').onchange = (e) => patch((x) => { x.landmark = e.target.value; });
      $('#as-gps').onclick = async (e) => {
        const b = e.currentTarget; b.disabled = true; b.textContent = 'Finding you...';
        const pt = await gps();
        if (!pt) { b.disabled = false; b.textContent = 'Try again'; toast('No GPS fix. Step into the open and try again, and write the landmark.'); return; }
        const id = await pinWaypoint(pt, 'Shot from', 'blood', `After the shot: shot from here at ${fmtT(pt.t)}.`, run().shotWpt);
        patch((x) => { x.shot = pt; if (id) x.shotWpt = id; });
        toast('Spot saved.'); renderStep(1);
      };
    },
    see(W, st, r) {
      const T = getTimer(), le = legalEnd();
      const hit = D.hits.find((h) => h.id === r.hit);
      const opts = (h) => {
        const b = [];
        h.waits.forEach((w) => { [w.min, w.max].forEach((m) => { if (m != null && !b.some((x) => x.m === m)) b.push({ m, src: w.src }); }); });
        return b.sort((a, c) => a.m - c.m);
      };
      const where = le && le.base ? ', worked out for Mission' : '';
      const warn = (endT) => (le && (Date.now() > le.t || Date.now() < le.s) ? `<p class="as-warn">It is outside legal hours now (legal light today ${esc(fmtT(le.s))} to ${esc(fmtT(le.t))}${where}). Following the trail with your rifle is hunting ${badge(95)}. Back out and come back at first light, or call RAPP (Report All Poachers and Polluters), 1 877 952 7277, for direction.</p>`
        : le && endT > le.t ? `<p class="as-warn">This wait ends after legal light (about ${esc(fmtT(le.t))}${le.base ? ', worked out for Mission' : ''}). Following the trail with your rifle after that is hunting outside hours ${badge(95)}. Come back at first light, or call RAPP (Report All Poachers and Polluters), 1 877 952 7277, for direction.</p>` : '');
      W.innerHTML = `${T ? `<div class="card as-act" id="as-timer"><h2>${timerLeft(T) > 0 ? 'Wait. Stay still and quiet.' : 'The wait is over'}</h2>
          <div class="as-cd" data-as-cd></div><p class="as-cdl" data-as-cdlbl></p>
          <p class="as-s">${esc(T.label || '')}. Started ${esc(fmtT(T.start))}. The timer keeps running if you close the app.</p>
          ${warn(T.start + T.ms)}
          <div class="btn-row"><button class="btn" id="as-add">+15 min</button><button class="btn" id="as-stop">Stop timer</button></div>
          ${timerLeft(T) <= 0 ? '<a class="btn primary block as-big" href="#/aftershot/3">Go to step 3: track it</a>' : ''}</div>` : ''}
        <div class="card as-act"><h2>What did the deer do?</h2>
          <div class="as-hits">${D.hits.filter((h) => !h.blood).map((h) => `<button class="as-hit${r.hit === h.id ? ' on' : ''}" data-hit="${h.id}"><b>${esc(h.label)}</b><small>${esc(h.means)} ${h.tip ? '(Tip)' : `(${h.c}%)`}</small></button>`).join('')}</div>
          <p class="as-s">Already at the hit site and saw dark blood with no bubbles?</p>
          <div class="as-hits">${D.hits.filter((h) => h.blood).map((h) => `<button class="as-hit${r.hit === h.id ? ' on' : ''}" data-hit="${h.id}"><b>${esc(h.label)}</b><small>${esc(h.means)} (${h.c}%)</small></button>`).join('')}</div>
        </div>
        ${hit ? `<div class="card as-act" id="as-waits"><h2>${esc(hit.means)}: how long to wait</h2>
          <table class="as-tbl"><tr><th>Source</th><th>Wait</th></tr>${hit.waits.map((w) => `<tr><td>${esc(w.src)}</td><td>${esc(w.text)}</td></tr>`).join('')}</table>
          <p class="as-s">${esc(hit.note)}</p>
          <p class="as-s"><b>${esc(D.callYourWait)}</b> ${badge(70)}</p>
          <div class="as-opts">${opts(hit).map((o) => `<button class="btn${o.m ? '' : ' primary'}" data-min="${o.m}">${o.m ? `Start ${minTxt(o.m)}` : 'Track now'}<small>${esc(o.src)}</small></button>`).join('')}</div>
          <div class="as-own"><label class="f" for="as-mins">Or your own wait, in minutes</label><div class="as-row"><input id="as-mins" type="number" inputmode="numeric" min="1" max="1440" placeholder="45"><button class="btn" id="as-own">Start</button></div></div>
        </div>` : ''}`;
      $$('[data-hit]', W).forEach((b) => b.onclick = () => { patch((x) => { x.hit = b.dataset.hit; x.hitAt = Date.now(); }); renderStep(2); const w = $('#as-waits'); if (w) w.scrollIntoView({ block: 'start' }); });
      const start = (m, label) => {
        if (!m) { sv(K.timer, null); toast('No wait. Track slowly.'); location.hash = '#/aftershot/3'; return; }
        const le2 = legalEnd(); const end = Date.now() + m * 6e4;
        if (le2 && (Date.now() > le2.t || Date.now() < le2.s)) toast('Legal light is over. Do not follow with your rifle until first light.');
        else if (le2 && end > le2.t) toast('This wait runs past legal light. See the warning.');
        sv(K.timer, { start: Date.now(), ms: m * 6e4, label, hit: (getRun() || {}).hit || '' });
        renderStep(2); keepAwake(); window.scrollTo(0, 0);
      };
      $$('[data-min]', W).forEach((b) => b.onclick = () => { const m = +b.dataset.min; start(m, `${minTxt(m)} wait (${b.querySelector('small').textContent}) for ${hit.means.replace(/^Often /, '').toLowerCase()}`); });
      const own = $('#as-own'); if (own) own.onclick = () => { const m = Math.round(+$('#as-mins').value); if (!(m > 0 && m <= 1440)) { toast('Type a wait from 1 to 1440 minutes.'); return; } start(m, `${minTxt(m)} wait, your own choice, for ${hit.means.replace(/^Often /, '').toLowerCase()}`); };
      const add = $('#as-add'); if (add) add.onclick = () => { const t = getTimer(); if (!t) return; const left = timerLeft(t); if (left <= 0) { t.start = Date.now(); t.ms = 15 * 6e4; } else t.ms += 15 * 6e4; t.buzzed = false; sv(K.timer, t); renderStep(2); };
      const stop = $('#as-stop'); if (stop) stop.onclick = () => { if (confirm('Stop the wait timer?')) { sv(K.timer, null); stopTick(); renderStep(2); } };
      if (T && timerLeft(T) > 0) keepAwake();
    },
    track(W, st, r) {
      const p = r.shot;
      W.innerHTML = `<div class="card as-act"><h2>Blood says go back?</h2>
        <p>Dark red blood with no bubbles (liver) or thin, green brown, smelly blood (gut): back out quietly and wait hours ${badge(70)}.</p>
        <div class="btn-row"><button class="btn" data-re="liver">Back out: liver wait</button><button class="btn" data-re="gut">Back out: gut wait</button></div>
        <div class="btn-row">${p ? mapLink(p, 'Shot spot on the map') : ''}<a class="btn" href="#/field/light">Legal light today</a></div></div>`;
      $$('[data-re]', W).forEach((b) => b.onclick = () => { patch((x) => { x.hit = b.dataset.re; x.hitAt = Date.now(); }); sv(K.timer, null); location.hash = '#/aftershot/2'; });
    },
    approach(W, st, r) {
      const p = r.deer;
      W.innerHTML = `<div class="card as-act"><h2>Pin where the deer lies</h2>
        ${p ? `<p class="as-big2">Saved ${esc(fmtT(p.t))}${p.acc ? `, GPS (Global Positioning System) within about ${p.acc} m` : ''}</p><p class="as-s">${f5(p.lat)}, ${f5(p.lon)}${r.deerWpt ? '. Also a "Deer down" waypoint on the Hunt Map.' : '. Saved on this phone.'}</p>` : ''}
        <button class="btn primary block as-big" id="as-dgps">${p ? 'Pin again here' : 'Pin the deer'}</button>
        ${p ? `<div class="btn-row">${mapLink(p, 'Open in map')}</div>` : ''}</div>`;
      $('#as-dgps').onclick = async (e) => {
        const b = e.currentTarget; b.disabled = true; b.textContent = 'Finding you...';
        const pt = await gps();
        if (!pt) { b.disabled = false; b.textContent = 'Try again'; toast('No GPS fix. Try again in a gap in the trees.'); return; }
        const id = await pinWaypoint(pt, 'Deer down', 'kill', `After the shot: deer recovered here at ${fmtT(pt.t)}.`, run().deerWpt);
        patch((x) => { x.deer = pt; if (id) x.deerWpt = id; });
        toast('Deer pinned.'); renderStep(4);
      };
    },
    tag(W, st) {
      W.innerHTML = `<div class="card as-act as-law"><h2>The Rule Book, word for word</h2>
        <blockquote>${esc(st.law)}</blockquote><p class="as-s">${badge(st.lawSrc.c)} ${src(st.lawSrc.s, st.lawSrc.p)}</p></div>
        <div class="card as-act"><h2>Cancel it in 5 steps</h2>${checks('tag', st.checks)}<p class="as-s">${badge(st.checksSrc.c)} ${src(st.checksSrc.s, st.checksSrc.p)}</p></div>`;
    },
    notes(W, st, r) {
      const labels = ['The deer', 'The notched licence beside the deer', 'The spot, with the landmark'];
      const J = r.journal || {};
      W.innerHTML = `<div class="card as-act"><h2>Photos</h2>
        <div class="as-photos">${labels.map((l, i) => `<div class="as-ph" data-ph="${i}"><div class="as-thumb" data-th="${i}">${r.photos[i] ? 'Saved' : ''}</div>
          <label class="btn block">${r.photos[i] ? 'Retake' : 'Take'}: ${esc(l)}<input type="file" accept="image/*" capture="environment" hidden data-pf="${i}"></label></div>`).join('')}</div>
        <p class="as-s">Photos stay on this phone, in the Hunt Map store (in your backup). The deer photo also goes on the "Deer down" waypoint.</p></div>
        <div class="card as-act"><h2>Notes</h2>
          <label class="f" for="as-sex">Buck or doe</label><div class="seg" id="as-sex">${['Buck', 'Doe'].map((s) => `<button data-v="${s}" class="${r.sex === s ? 'on' : ''}">${s}</button>`).join('')}</div>
          <label class="f" for="as-place">Place or MU (Management Unit)</label><input id="as-place" type="text" value="${esc(J.place || '')}" placeholder="Near Harrison, MU ____">
          <label class="f" for="as-weather">Weather and wind</label><input id="as-weather" type="text" value="${esc(J.weather || '')}">
          <label class="f" for="as-seen">What happened</label><textarea id="as-seen" rows="3">${esc(J.seen || '')}</textarea>
          <label class="f" for="as-lesson">One lesson</label><textarea id="as-lesson" rows="2">${esc(J.lesson || '')}</textarea>
          <button class="btn primary block as-big" id="as-jr">${r.journalAt ? 'Update the journal entry' : 'Save to journal'}</button>
          ${r.journalAt ? `<p class="as-s">In your <a href="#/journal">Hunt journal</a> since ${esc(fmtT(r.journalAt))}.</p>` : ''}</div>`;
      const keep = () => patch((x) => { x.journal = { place: $('#as-place').value, weather: $('#as-weather').value, seen: $('#as-seen').value, lesson: $('#as-lesson').value }; });
      ['as-place', 'as-weather', 'as-seen', 'as-lesson'].forEach((id) => { $('#' + id).onchange = keep; });
      $$('#as-sex button').forEach((b) => b.onclick = () => { keep(); patch((x) => { x.sex = b.dataset.v; }); $$('#as-sex button').forEach((c) => c.classList.toggle('on', c === b)); });
      $('#as-jr').onclick = () => { keep(); saveJournal(); };
      r.photos.forEach((id, i) => { if (id) photoUrl(id).then((u) => { const th = $(`[data-th="${i}"]`); if (u && th) th.innerHTML = `<img src="${u}" alt="${esc(labels[i])}">`; }); });
      $$('[data-pf]', W).forEach((inp) => inp.onchange = async () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        const i = +inp.dataset.pf, id = await savePhoto(f);
        if (!id) { toast('Could not save the photo here. Use the phone camera app instead.'); return; }
        const rr = patch((x) => { x.photos[i] = id; });
        if (i === 0 && rr.deerWpt) { const m = await storeMod(); try { const it = await m.get('items', rr.deerWpt); if (it) { it.photo = id; await m.saveItem(it); } } catch (e) { /* map item gone */ } }
        renderStep(6);
      });
    },
    dress(W, st, r) {
      const m = st.methods.find((x) => x.id === r.method);
      W.innerHTML = `<div class="card as-act"><h2>Before the knife</h2>${checks('before', st.before.map((b) => b.t))}
        <ul class="as-list as-s">${st.before.map((b) => `<li>${badge(b.c)} ${src(b.s, b.p)}</li>`).join('')}</ul></div>
        <div class="card as-act"><h2>Which way?</h2><p class="as-s">${esc(st.lean)}</p>
          <div class="as-hits">${st.methods.map((x) => `<button class="as-hit${r.method === x.id ? ' on' : ''}" data-m="${x.id}"><b>${esc(x.label)}</b></button>`).join('')}</div>
          ${m ? `${checks('m-' + m.id, m.steps)}<p class="as-s">${esc(m.src)}. ${lessonHref(m.lesson) ? `<a href="${lessonHref(m.lesson)}">Open the full steps with pictures</a>` : ''}</p>` : ''}</div>
        <div class="card as-act as-bear"><h2>Bear safety at the kill</h2><ul class="as-list">${st.bear.map(ruleLi).join('')}</ul></div>`;
      $$('[data-m]', W).forEach((b) => b.onclick = () => { patch((x) => { x.method = b.dataset.m; }); renderStep(7); });
    },
    cool(W, st) {
      W.innerHTML = `<div class="card as-act"><h2>The numbers</h2><table class="as-tbl">${st.numbers.map((x) => `<tr><td><b>${esc(x.n)}</b></td><td>${esc(x.t)} ${badge(x.c)} <span class="as-s">${src(x.s, x.p)}</span></td></tr>`).join('')}</table>
        <p class="as-s">Food safety guides, not BC law.</p></div>
        <div class="card as-act"><h2>Do this</h2>${doList(st.do)}</div>`;
    },
    papers(W, st, r) {
      const R = r.ror, sexTxt = r.sex || '';
      const pre = { Date: todayIso(), Species: 'Mule deer (black tailed)', Sex: sexTxt };
      W.innerHTML = `<div class="card as-act"><h2>Before you drive</h2>${checks('papers', st.checks)}</div>
        ${rulesBlock('Report or inspection?', st.report)}
        <details class="card as-act as-ror"${R.open ? ' open' : ''}><summary>Someone else moves your deer? Record of Receipt</summary>
          <p class="as-s">The fields of the page 14 form ${badge(st.rorSrc.c)} ${src(st.rorSrc.s, st.rorSrc.p)}. Kept on this phone only. Write it on paper too and photograph it (Tip).</p>
          ${st.ror.map((f, i) => `<label class="f" for="as-r${i}">${esc(f)}</label><input id="as-r${i}" data-rf="${esc(f)}" type="text" value="${esc(R[f] != null ? R[f] : (pre[f] || ''))}">`).join('')}
          <div class="btn-row"><button class="btn" id="as-rcopy">Copy as text</button>${navigator.share ? '<button class="btn" id="as-rshare">Share</button>' : ''}</div></details>
        <div class="btn-row"><a class="btn" href="#/map">Hunt Map: truck arrow</a><a class="btn" href="#/safety/turn">Turnaround alarm</a></div>`;
      $$('[data-rf]', W).forEach((inp) => inp.onchange = () => patch((x) => { x.ror[inp.dataset.rf] = inp.value; x.ror.open = true; }));
      const text = () => 'Record of Receipt (BC synopsis page 14)\n' + st.ror.map((f, i) => `${f}: ${$('#as-r' + i).value}`).join('\n');
      $('#as-rcopy').onclick = () => { const t = text(); const done = (ok) => toast(ok ? 'Copied.' : 'Copy did not work. Write it on paper.'); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => done(true), () => done(false)); else done(false); };
      const sh = $('#as-rshare'); if (sh) sh.onclick = () => navigator.share({ title: 'Record of Receipt', text: text() }).catch(() => {});
    },
    done(W, st, r) {
      W.innerHTML = `<div class="card as-act"><h2>Your hunt</h2><pre class="as-sum">${esc(summaryText(r))}</pre>
        <div class="btn-row">${r.shot ? mapLink(r.shot, 'Shot spot') : ''}${r.deer ? mapLink(r.deer, 'Deer spot') : ''}</div>
        <button class="btn primary block as-big" id="as-jr2">${r.journalAt ? 'Update the journal entry' : 'Save to journal'}</button>
        ${r.journalAt ? `<p class="as-s">In your <a href="#/journal">Hunt journal</a>.</p>` : ''}
        <p class="as-s">Finish moves this hunt to Past hunts and clears the timer. Waypoints, photos and the journal entry stay.</p></div>`;
      $('#as-jr2').onclick = () => saveJournal();
    },
  };

  // ---------- summary and journal (app format: hm.v1 S.journal entries) ----------
  function summaryText(r) {
    const hit = D.hits.find((h) => h.id === r.hit), T = getTimer();
    const L = [];
    L.push(`Started ${fmtDT(r.started)}`);
    if (r.shot) L.push(`Shot from ${f5(r.shot.lat)}, ${f5(r.shot.lon)} at ${fmtT(r.shot.t)}`);
    if (r.landmark) L.push(`Landmark: ${r.landmark}`);
    if (hit) L.push(`Saw: ${hit.label} (${hit.means.toLowerCase()})`);
    if (T) L.push(`Wait: ${T.label}, from ${fmtT(T.start)} to ${fmtT(T.start + T.ms)}`);
    if (r.deer) L.push(`Deer down at ${f5(r.deer.lat)}, ${f5(r.deer.lon)}, ${fmtT(r.deer.t)}`);
    if (r.done.tag) L.push(`Licence cancelled step done ${fmtT(r.done.tag)}`);
    if (r.sex) L.push(`Sex: ${r.sex}`);
    if (r.method) L.push(`Field dressed: ${r.method}`);
    const ph = r.photos.filter(Boolean).length; if (ph) L.push(`Photos: ${ph}`);
    D.steps.forEach((s, i) => { if (r.done[s.id]) L.push(`Step ${i + 1} ${s.btn}: done ${fmtT(r.done[s.id])}`); });
    return L.join('\n');
  }
  function saveJournal() {
    const r = run(), J = r.journal || {}, hit = D.hits.find((h) => h.id === r.hit), T = getTimer();
    const result = [r.sex ? `${r.sex} recovered` : 'Deer hit', r.shot ? `shot ${fmtT(r.shot.t)}` : '', hit ? `sign: ${hit.means.toLowerCase()}` : '', T ? `waited ${minTxt(Math.round(T.ms / 6e4))}` : '', r.deer ? `found ${fmtT(r.deer.t)}` : ''].filter(Boolean).join(', ');
    const pts = [r.shot ? `Shot from ${f5(r.shot.lat)}, ${f5(r.shot.lon)}.` : '', r.deer ? `Deer at ${f5(r.deer.lat)}, ${f5(r.deer.lon)}.` : '', r.landmark ? `Landmark: ${r.landmark}.` : ''].filter(Boolean).join(' ');
    const entry = { date: new Date(r.started).toLocaleDateString('en-CA', { timeZone: TZ }), place: J.place || 'Near Harrison', species: 'Black tailed deer', weather: J.weather || '', seen: [J.seen, pts].filter(Boolean).join('\n'), result, lesson: J.lesson || '', aftershot: r.id };
    let S; try { S = JSON.parse(localStorage.getItem('hm.v1') || '{}'); } catch (e) { S = {}; }
    if (!S || typeof S !== 'object') S = {};
    S.journal = Array.isArray(S.journal) ? S.journal : [];
    const i = S.journal.findIndex((e) => e && e.aftershot === r.id);
    if (i >= 0) S.journal[i] = entry; else S.journal.unshift(entry);
    try { localStorage.setItem('hm.v1', JSON.stringify(S)); } catch (e) { toast('Could not save: storage is blocked.'); return; }
    patch((x) => { x.journalAt = Date.now(); });
    // app.js holds the journal in memory: reload so it reads the new entry (and never writes the old copy back)
    try { sessionStorage.setItem('hm.aftershot.saved', '1'); } catch (e) { /* ignore */ }
    location.reload();
  }

  // ---------- route ----------
  function route(args) {
    document.body.classList.add('field', 'as-on'); tab('field');
    const v = view();
    if (!D) v.innerHTML = '<p class="muted">Loading...</p>';
    load().then((d) => {
      if (!/^#\/aftershot/.test(location.hash)) return;
      if (!d) { title('After the shot'); v.innerHTML = `${BANNER}<div class="card"><h2>Not saved on this phone yet</h2><p>Open the app once with signal so the steps are saved for no signal use.</p><a class="btn block" href="#/s/after-the-shot/0">Read the After the shot lesson</a></div>`; return; }
      const n = parseInt(args && args[0], 10);
      if (n >= 1 && n <= d.steps.length) renderStep(n); else { title('After the shot'); hub(); }
      try { if (sessionStorage.getItem('hm.aftershot.saved')) { sessionStorage.removeItem('hm.aftershot.saved'); toast('Saved to your Hunt journal.'); } } catch (e) { /* ignore */ }
    });
  }
  window.addEventListener('hashchange', () => { if (!/^#\/aftershot/.test(location.hash)) { stopTick(); document.body.classList.remove('as-on'); } });

  // ---------- links on Field Mode, Home and More (added here, app.js and home.js untouched) ----------
  function hooks() {
    const v = view(); if (!v) return;
    const h = location.hash, r = getRun(), T = getTimer();
    const sub = r ? (T && timerLeft(T) > 0 ? `Waiting: ${dur(timerLeft(T))} left` : 'Continue where you left off') : 'Step by step, wait timer';
    if (/^#\/field\/?$/.test(h)) {
      const g = $('.fgrid', v);
      if (g && !$('#as-ftile', g)) { const a = document.createElement('a'); a.id = 'as-ftile'; a.className = 'ftile hot'; a.href = '#/aftershot'; a.innerHTML = `Shot taken: guide me<small>${esc(sub)}</small>`; g.insertBefore(a, g.firstChild); }
    } else if (!h || h === '#' || h === '#/') {
      if (v.firstElementChild && !$('#as-home', v)) { const a = document.createElement('a'); a.id = 'as-home'; a.className = 'btn block as-homebtn' + (r ? ' primary' : ''); a.href = '#/aftershot'; a.innerHTML = `${r ? 'Continue: after the shot' : 'After the shot: guided steps'}<small>${esc(sub)}</small>`; v.insertBefore(a, v.firstChild); }
    } else if (h === '#/more') {
      const list = $('.card.list', v);
      if (list && !$('#as-more', list)) { const a = document.createElement('a'); a.id = 'as-more'; a.className = 'item'; a.href = '#/aftershot'; a.innerHTML = '<span class="grow">After the shot: guided steps, wait timer, licence, meat, papers</span>'; list.insertBefore(a, list.children[2] || null); }
    }
  }
  let hookQ = false;
  const queueHooks = () => { if (hookQ) return; hookQ = true; requestAnimationFrame(() => { hookQ = false; try { hooks(); } catch (e) { console.warn('aftershot hooks', e); } }); };

  const css = `.as-on main{padding-bottom:170px}
  .as-why{font-size:17px;margin:4px 0 12px}.as-s{font-size:14px;color:var(--muted)}.as-s a,.as-src{font-size:14px}
  .as-cert{font-size:14px!important;padding:0 6px}
  .as-big{min-height:64px;font-size:20px;font-weight:800;flex-direction:column;gap:2px}.as-big small,.as-bar .btn small,.as-opts .btn small,.as-homebtn small{display:block;font-size:14px;font-weight:500;opacity:.9}
  .as-big2{font-size:18px;font-weight:700;margin:4px 0}
  .as-steps{display:grid;grid-template-columns:1fr;gap:8px;margin:14px 0}
  .as-stp{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 12px;border:2px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);text-decoration:none;font-size:18px;font-weight:700}
  .as-stp.ok{border-color:var(--sage)}
  .as-n{flex:0 0 36px;height:36px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:900;font-size:17px}.as-stp.ok .as-n{background:var(--sage)}
  .as-n.big{flex-basis:48px;height:48px;font-size:24px}
  .as-head{display:flex;gap:12px;align-items:center;margin:4px 0 6px}.as-k{font-size:14px;color:var(--muted);font-weight:700;text-transform:uppercase}.as-t{margin:0;font-size:24px}
  .as-list{padding-left:20px;margin:6px 0}.as-list li{margin:8px 0;font-size:16px;overflow-wrap:anywhere}
  .as-do{padding-left:22px}.as-do li{margin:8px 0;font-size:17px}
  .as-act{border:2px solid var(--accent)}.as-bear{border-color:var(--bark)}
  .as-hits{display:grid;gap:8px;margin:8px 0}
  .as-hit{min-height:60px;text-align:left;padding:10px 12px;border-radius:12px;border:2px solid var(--moss);background:var(--card);color:var(--ink);font:inherit;cursor:pointer}
  .as-hit b{display:block;font-size:18px}.as-hit small{display:block;font-size:14px;color:var(--muted);margin-top:2px}
  .as-hit.on{border-color:var(--accent);background:var(--warn-bg);box-shadow:inset 0 0 0 2px var(--accent)}
  .as-tbl{width:100%;border-collapse:collapse;font-size:15px}.as-tbl th,.as-tbl td{padding:6px 5px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
  .as-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.as-opts .btn{min-height:60px;flex-direction:column;font-weight:800}
  .as-row{display:flex;gap:8px}.as-row input{flex:1;min-width:0;min-height:48px;font-size:18px}.as-row .btn{min-height:48px}
  .as-cd{font-size:56px;font-weight:900;line-height:1.05;text-align:center;font-variant-numeric:tabular-nums;margin:6px 0}
  .as-cdl{text-align:center;font-size:16px;margin:0 0 8px}
  .as-warn{border-left:4px solid var(--accent);padding:6px 10px;background:var(--warn-bg);font-size:15px}
  .as-chip{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:48px;padding:8px 12px;margin:0 0 12px;border-radius:12px;background:var(--moss);color:#fff;text-decoration:none;font-size:16px}
  .as-chip b{margin-right:4px}.as-chip.over{background:var(--accent)}
  .as-bar{position:fixed;left:0;right:0;bottom:calc(64px + env(safe-area-inset-bottom));z-index:20;display:flex;gap:10px;padding:8px 12px;background:var(--bg);border-top:1px solid var(--line)}
  .as-bar .btn{min-height:56px;font-size:18px;font-weight:800;flex-direction:column}.as-bar .btn:first-child{flex:0 0 30%}.as-bar .btn.primary{flex:1}
  .as-links{display:flex;flex-direction:column;gap:6px}.as-lk{display:flex;align-items:center;min-height:44px;font-size:16px;font-weight:700}
  .as-fig svg{width:100%;height:auto;display:block}.as-fig{margin:0 0 14px}
  .as-law blockquote{margin:6px 0;padding:8px 12px;border-left:4px solid var(--accent);font-size:17px;font-weight:600}
  .as-ck{display:flex;gap:12px;align-items:flex-start;min-height:44px;padding:6px 0;font-size:17px}
  .as-photos{display:grid;gap:10px}.as-thumb img{max-width:100%;max-height:160px;border-radius:10px;display:block;margin-bottom:6px}.as-thumb{font-size:14px;color:var(--muted)}
  .as-ph .btn{min-height:52px}
  .as-ror summary,.as-past summary{min-height:44px;display:flex;align-items:center;font-weight:800;font-size:17px;cursor:pointer}
  .as-ror input{width:100%;min-height:44px;font-size:16px}
  .as-sum{white-space:pre-wrap;font-family:inherit;font-size:15px;margin:0}
  .as-homebtn{margin:0 0 12px;min-height:56px;flex-direction:column;font-weight:800}
  #as-sex button{min-height:48px;font-size:17px}`;
  function init() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const v = view(); if (v) new MutationObserver(queueHooks).observe(v, { childList: true });
    window.addEventListener('hashchange', queueHooks); queueHooks();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.HMRoutes = window.HMRoutes || {};
  window.HMRoutes.aftershot = route;
  window.HMAftershot = { load, summaryText: (r) => summaryText(r || run()), timer: getTimer };
})();
