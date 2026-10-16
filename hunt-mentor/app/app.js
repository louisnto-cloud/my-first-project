/* Hunt Mentor app. Vanilla JS, offline first. All user data stays in localStorage. */
(function () {
  'use strict';
  const HM = window.HM;
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');
  const KEY = 'hm.v1';
  const MAP_KEY = 'hm.map.v1'; // Hunt Map preferences (map/util.js), included in the backup
  const TZ = 'America/Vancouver';

  // ---------- storage ----------
  const blank = { done: {}, pos: {}, max: {}, last: null, quiz: {}, checks: {}, journal: [], settings: { theme: '', firstHunt: '' } };
  let S;
  try { S = Object.assign({}, blank, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = JSON.parse(JSON.stringify(blank)); }
  S.pos = S.pos || {}; S.max = S.max || {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } };
  const applyTheme = () => { if (S.settings.theme) document.documentElement.dataset.theme = S.settings.theme; else delete document.documentElement.dataset.theme; };
  applyTheme();

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sessions = HM.sessions;
  const byId = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const phases = [...new Set(sessions.map((s) => s.phase))];
  const phaseNames = { 1: 'Fast Start', 2: 'Foundations', 3: 'Reading the Land', 4: 'Species', 5: 'The Shot and After', 6: 'Mastery', 7: 'Rule Book', 8: 'Masterclass', 9: 'Field Wisdom' };
  const setTitle = (t) => { $('#top-title').textContent = t; };
  const tab = (name) => document.querySelectorAll('.tabs a').forEach((a) => {
    const on = a.dataset.tab === name;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const firstHunt = () => S.settings.firstHunt || HM.field.defaults.firstHunt;
  const daysTo = (iso) => Math.ceil((new Date(iso + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5);

  function sheet(html) {
    $('#sheet-body').innerHTML = html;
    $('#sheet').hidden = false;
  }
  $('#sheet-close').onclick = () => { $('#sheet').hidden = true; };
  $('#sheet').onclick = (e) => { if (e.target.id === 'sheet') $('#sheet').hidden = true; };
  // Back arrow: the previous place in the app (history.state.d counts in app steps), else the parent page. Never out of the app.
  const parentOf = (hash) => {
    const [a, b] = hash.replace(/^#\/?/, '').split('/');
    if (!a) return null;
    if (a === 's') return '#/learn';
    if (a === 'plan' && b != null && b !== '') return '#/plan';
    if ((a === 'field' || a === 'lists' || a === 'cards' || a === 'journal') && b != null && b !== '') return '#/' + a;
    if (['glossary', 'review', 'sources', 'install', 'print', 'credits', 'journal', 'cards', 'ask'].includes(a)) return '#/more';
    return '#/';
  };
  $('#btn-back').onclick = () => {
    if (navDepth > 0) { history.back(); return; }
    const up = parentOf(location.hash);
    if (up) { history.replaceState({ d: 0 }, '', up); route(); }
  };
  $('#btn-search').onclick = () => { location.hash = '#/search'; };

  // place names, MUs and regions become tap targets with a mini map (places.js, optional add on)
  const linkPlaces = (el) => { if (window.HMPlaces && el) try { window.HMPlaces.link(el); } catch (e) { console.warn('places', e); } };
  // glossary taps, checklist ticks (delegated)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.term');
    if (t) {
      const k = t.dataset.term;
      const def = HM.glossary[k] || Object.entries(HM.glossary).find(([g]) => g.toLowerCase() === k.toLowerCase())?.[1];
      sheet(`<h2>${esc(k)}</h2><p>${def || 'Not in the glossary yet.'}</p>`);
      linkPlaces($('#sheet-body'));
    }
  });
  // step by step slides and animation replay (delegated)
  const stepGo = (box, i) => {
    const tr = box.querySelector('.steps-track'); const n = +box.dataset.n;
    i = Math.max(0, Math.min(n - 1, i));
    tr.scrollTo({ left: i * tr.clientWidth, behavior: 'smooth' });
  };
  const stepMark = (box) => {
    const tr = box.querySelector('.steps-track'); const n = +box.dataset.n;
    const i = Math.max(0, Math.min(n - 1, Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth))));
    box.querySelector('.steps-count').textContent = `${i + 1} of ${n}`;
    box.querySelectorAll('.steps-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    box.querySelector('.steps-prev').disabled = i === 0;
    box.querySelector('.steps-next').disabled = i === n - 1;
    return i;
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.steps-prev, .steps-next');
    if (b) { const box = b.closest('.steps'); stepGo(box, stepMark(box) + (b.classList.contains('steps-next') ? 1 : -1)); return; }
    const r = e.target.closest && e.target.closest('.anim-replay');
    if (r) { const svg = r.closest('figure').querySelector('svg'); if (svg && svg.setCurrentTime) { svg.setCurrentTime(0); svg.unpauseAnimations && svg.unpauseAnimations(); } }
  });
  document.addEventListener('scroll', (e) => {
    const tr = e.target && e.target.classList && e.target.classList.contains('steps-track') ? e.target : null;
    if (tr) stepMark(tr.closest('.steps'));
  }, true);
  const hydrateSteps = (root) => root.querySelectorAll('.steps').forEach(stepMark);
  document.addEventListener('change', (e) => {
    const c = e.target.closest('input[data-key]');
    if (c) { S.checks[c.dataset.key] = c.checked; save(); }
  });
  const hydrateChecks = (root) => root.querySelectorAll('input[data-key]').forEach((c) => { c.checked = !!S.checks[c.dataset.key]; });

  // ---------- sun times (NOAA almanac method) ----------
  function sunEvent(date, lat, lon, rising) {
    const rad = Math.PI / 180, deg = 180 / Math.PI;
    const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
    const N = Math.floor((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 864e5);
    const lngHour = lon / 15;
    const t = N + ((rising ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = (M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634 + 360) % 360;
    let RA = (Math.atan(0.91764 * Math.tan(L * rad)) * deg + 360) % 360;
    RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
    const sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
    if (cosH > 1 || cosH < -1) return null;
    const H = (rising ? 360 - Math.acos(cosH) * deg : Math.acos(cosH) * deg) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    const UT = ((T - lngHour) % 24 + 24) % 24;
    let when = new Date(Date.UTC(y, m, d) + UT * 36e5);
    const target = new Date(y, m, d).toLocaleDateString('en-CA');
    for (let i = 0; i < 2; i++) {
      const got = when.toLocaleDateString('en-CA', { timeZone: TZ });
      if (got < target) when = new Date(+when + 864e5); else if (got > target) when = new Date(+when - 864e5); else break;
    }
    return when;
  }
  const hhmm = (dt) => dt ? dt.toLocaleTimeString('en-CA', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }) : 'n/a';
  const addMin = (dt, m) => dt ? new Date(+dt + m * 6e4) : null;
  // AI mentor: a claude.ai Artifact page that answers from the owner's own Claude plan (no key in this app)
  const MENTOR_URL = 'https://claude.ai/artifact/NbQDFag1TnNXfaFBiaQQT1';
  window.HuntMentor = { sunEvent, hhmm, TZ, mentorUrl: MENTOR_URL }; // shared with the map (Insights)

  // ---------- views ----------
  function progress(phase) {
    const list = sessions.filter((s) => phase == null || s.phase === phase);
    const done = list.filter((s) => S.done[s.id]).length;
    return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
  }
  const nextSession = () => sessions.find((s) => !S.done[s.id]);

  // ---------- lesson content: a small index loads at start; each lesson's screens load on demand ----------
  // The single file backup has everything inline (steps carry html, sessions carry text).
  const lessonLoads = {};
  const hasHtml = (s) => !s.steps.length || s.steps[0].html != null;
  const getJSON = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
  function loadLesson(s) {
    if (hasHtml(s)) return Promise.resolve(s);
    return lessonLoads[s.id] || (lessonLoads[s.id] = getJSON(HM.lessonFiles[s.id])
      .then((arr) => { s.steps.forEach((st, k) => { st.html = arr[k] || ''; }); return s; })
      .catch((e) => { delete lessonLoads[s.id]; throw e; }));
  }
  const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&(amp|lt|gt|quot|#39);/g, ' ').replace(/[#>*`|[\]]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  let searchLoad = null, searchReady = sessions.every((s) => s.text != null);
  function loadSearch() {
    if (searchReady) return Promise.resolve();
    return searchLoad || (searchLoad = getJSON(HM.searchFile).then((o) => {
      sessions.forEach((s) => { s.searchHtml = o[s.id] || []; s.text = plain(s.searchHtml.join(' ')); });
      searchReady = true;
    }).catch((e) => { searchLoad = null; throw e; }));
  }
  // shared with ask.js: screen html for the search index (diagrams and photos left out when loaded from the search file)
  window.HMContent = {
    loadLesson: (id) => (byId[id] ? loadLesson(byId[id]) : Promise.reject(new Error('no lesson ' + id))),
    loadSearch,
    searchReady: () => searchReady,
    screenHtml: (id, i) => { const s = byId[id]; return (s.searchHtml ? s.searchHtml[i] : s.steps[i] && s.steps[i].html) || ''; },
  };
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));

  const stepCache = {};
  const stepsOf = (s) => stepCache[s.id] || (stepCache[s.id] = s.quiz.length ? s.steps.concat([{ title: 'Quiz', quiz: true }]) : s.steps.slice());
  const lessonLabel = (s) => `${s.phase}.${s.num} ${s.title}`;
  // where a lesson reopens: the last screen seen, or screen 1 when it was finished on its last screen
  function openAt(s) {
    const n = stepsOf(s).length, p = S.pos[s.id] || 0;
    return S.done[s.id] && p >= n - 1 ? 0 : Math.max(0, Math.min(p, n - 1));
  }
  // the lesson to resume: the last one opened, unless it is finished
  function resumeInfo() {
    const L = S.last && byId[S.last.id];
    if (!L) return null;
    const n = stepsOf(L).length, i = openAt(L);
    if (S.done[L.id] && i === 0) return null;
    return { s: L, i, n, title: (stepsOf(L)[i] || {}).title || '' };
  }
  const meter = (a, b) => `<div class="bar"><i style="width:${Math.round((a / Math.max(1, b)) * 100)}%"></i></div>`;
  function startCard(cls) {
    const r = resumeInfo(), nx = nextSession();
    if (r) return `<a class="card cont ${cls || ''}" href="#/s/${r.s.id}/${r.i}"><div class="cont-k">Continue</div>
      <div class="cont-t">${esc(lessonLabel(r.s))}</div><div class="muted">Screen ${r.i + 1} of ${r.n}: ${esc(r.title)}</div>${meter(r.i + 1, r.n)}</a>`;
    if (nx) return `<a class="card cont ${cls || ''}" href="#/s/${nx.id}"><div class="cont-k">${Object.keys(S.done).length ? 'Next lesson' : 'Start here'}</div>
      <div class="cont-t">${esc(lessonLabel(nx))}</div><div class="muted">${stepsOf(nx).length} screens, ${nx.minutes} min</div></a>`;
    return '<div class="card"><h2>All lessons done</h2></div>';
  }

  function home() {
    setTitle('Hunt Mentor'); tab('home');
    const d = daysTo(firstHunt());
    const r = resumeInfo(), nx = nextSession();
    const p = progress();
    const misses = Object.entries(S.quiz).filter(([, v]) => !v).length;
    view.innerHTML = `
      ${window.HMHome ? '' : `<div class="card row">
        <div class="grow"><div class="muted">First hunt</div><div class="big">${d > 0 ? d : 0} days</div>
        <div class="muted">${esc(firstHunt())}${S.settings.firstHunt ? '' : ' (placeholder date, set yours in More)'}</div></div>
        <a class="btn primary" href="#/field">Field Mode</a>
      </div>`}
      ${r && nx && nx.id !== r.s.id ? `<a class="card cont cont-sm" href="#/s/${nx.id}"><div class="cont-k">Next new lesson</div><div class="cont-t">${esc(lessonLabel(nx))}</div><div class="muted">${nx.minutes} min</div></a>` : ''}
      <div class="card"><h2>Progress</h2>
        <div class="muted">${p.done} of ${p.total} lessons done</div><div class="bar"><i style="width:${p.pct}%"></i></div>
        ${phases.map((ph) => { const q = progress(ph); return `<div style="margin-top:10px"><div class="row"><span class="grow">${ph}. ${phaseNames[ph]}</span><span class="muted">${q.done}/${q.total}</span></div><div class="bar"><i style="width:${q.pct}%"></i></div></div>`; }).join('')}
        <a class="btn block" href="#/learn" style="margin-top:12px">All lessons</a>
      </div>
      ${misses ? `<a class="btn block" href="#/review">Review ${misses} missed quiz question${misses > 1 ? 's' : ''}</a>` : ''}
      <p class="muted">Regulation data last checked: ${esc(HM.regs.lastChecked)}. Content built ${esc(HM.built)}.</p>`;
    const planCard = window.HMPlan ? () => window.HMPlan.homeCard(planCtx()) : null;
    if (window.HMHome) try { window.HMHome.render(view, { S, save, daysTo, sunEvent, hhmm, addMin, certBadge, mentorUrl: MENTOR_URL, hasSession: (id) => !!byId[id], refresh: home, planCard }); } catch (e) { console.warn("Home dashboard", e); }
    else if (planCard) view.insertAdjacentHTML('afterbegin', planCard());
    view.insertAdjacentHTML('afterbegin', startCard('cont-home'));
    const today = view.querySelector('.pl-today'); if (today) view.prepend(today); // the study task for the next hunt goes first
    const warm = resumeInfo() ? resumeInfo().s : nextSession();
    if (warm) idle(() => loadLesson(warm).catch(() => {}));
  }

  // ---------- Learn: find a lesson (filter, topic chips, phase groups) ----------
  // Topic chips match lesson titles, plus a few lessons whose title does not say it.
  const CHIPS = [
    ['Deer', /deer|\brut\b|chronic wasting/i, ['shot-placement', 'blood-trailing', 'tracks', 'sign', 'local-heffley']],
    ['Moose', /moose/i, ['the-rut', 'shot-placement', 'blood-trailing', 'field-dressing', 'packing-out']],
    ['Ducks', /duck|geese|goose|waterfowl|migratory|brant/i, ['shotgun-skills', 'ammo-guide', 'local-mission', 'water-safety']],
    ['Quail', /quail|chukar|upland/i, ['grouse', 'shotgun-skills', 'shotgun-guide']],
    ['Rules', /rule book|licen|legal|\btags?\b|\bleh\b|bc rules|atv rules/i, []],
    ['Gear', /gear|shotgun|scope|ammo|rifle|wear|pack|\bkit\b|optic|binocular|ballistic/i, ['sighting-in', 'glassing']],
    ['Map skills', /\bmaps?\b|terrain|compass|gps|land status|scouting/i, ['funnels', 'wind-thermals', 'top-areas', 'named-areas']],
    ['Meat', /meat|field dress|butcher|cook|packing out|quarter|skinning|after the kill|after the shot/i, []],
  ];
  const chipHas = (c, s) => c[1].test(s.title) || c[2].includes(s.id);
  const LS_OPEN = 'hm.learn.open', SS_LEARN = 'hm.learn';
  const ssGet = (k) => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9.]+/g, ' ');
  let learnIndex = null;
  const getLearnIndex = () => learnIndex || (learnIndex = sessions.map((s) => ({ s, title: norm(`${s.phase}.${s.num} ${s.title}`), screens: stepsOf(s).map((st) => norm(st.title)) })));

  function lessonRow(s, hit, flat) {
    const n = stepsOf(s).length, p = S.pos[s.id] || 0, started = S.max[s.id] != null || p > 0;
    const status = S.done[s.id] ? `Done. ${n} screens` : started ? `Screen ${openAt(s) + 1} of ${n}` : `${n} screens, ${s.minutes} min`;
    return `<a class="item lrow ${S.done[s.id] ? 'done' : ''} ${!S.done[s.id] && started ? 'going' : ''}" href="#/s/${s.id}${hit != null ? '/' + hit.n : ''}" data-id="${s.id}">
      <span class="num ${flat ? 'wide' : ''}">${S.done[s.id] ? '&#10003;' : flat ? `${s.phase}.${s.num}` : s.num}</span>
      <span class="grow"><span class="lrow-t">${esc(s.title)}</span><span class="lrow-s">${hit != null ? `Screen ${hit.n + 1}: ${esc(stepsOf(s)[hit.n].title)}` : status}</span></span>
      ${!S.done[s.id] && started ? `<span class="lrow-m" aria-hidden="true"><i style="width:${Math.round(((openAt(s) + 1) / n) * 100)}%"></i></span>` : ''}</a>`;
  }

  function learn() {
    setTitle('Learn'); tab('learn');
    const st = ssGet(SS_LEARN) || { q: '', chip: '' };
    const openSaved = lsGet(LS_OPEN);
    const r = resumeInfo(), nx = nextSession();
    const curPh = (r ? r.s : nx || sessions[0]).phase;
    const isOpen = (ph) => (openSaved ? openSaved.includes(ph) : ph === curPh);
    view.innerHTML = `${startCard()}
      <div class="lfind"><input type="search" id="lq" placeholder="Find a lesson: moose, scope, tags" aria-label="Find a lesson" autocomplete="off" value="${esc(st.q || '')}"></div>
      <div class="chips" role="group" aria-label="Topics">${CHIPS.map((c) => `<button type="button" class="chip ${st.chip === c[0] ? 'on' : ''}" data-chip="${esc(c[0])}" aria-pressed="${st.chip === c[0]}">${esc(c[0])}</button>`).join('')}</div>
      <p class="muted lcount" id="lcount" aria-live="polite"></p>
      <div id="lres" hidden></div>
      <div id="lgroups">${phases.map((ph) => { const q = progress(ph); return `<details class="card phase" data-ph="${ph}" ${isOpen(ph) ? 'open' : ''}>
        <summary><span class="ph-t">Phase ${ph}: ${phaseNames[ph]}</span><span class="ph-c">${q.done} of ${q.total} done</span><span class="ph-bar"><i style="width:${q.pct}%"></i></span></summary>
        <div class="list" data-list="${ph}"></div></details>`; }).join('')}</div>`;
    const res = $('#lres', view);
    const groups = [...view.querySelectorAll('details.phase')];
    const lists = Object.fromEntries(groups.map((g) => [g.dataset.ph, g.querySelector('.list')]));
    let filtering = false;
    groups.forEach((g) => g.addEventListener('toggle', () => {
      if (filtering) return;
      lsSet(LS_OPEN, groups.filter((x) => x.open).map((x) => +x.dataset.ph));
    }));
    const qIn = $('#lq', view);
    const draw = () => {
      const q = norm(qIn.value).trim(), words = q.split(' ').filter(Boolean);
      const chip = CHIPS.find((c) => c[0] === st.chip);
      ssSet(SS_LEARN, { q: qIn.value, chip: st.chip });
      const idx = getLearnIndex();
      let hits = idx.filter((e) => !chip || chipHas(chip, e.s)).map((e) => {
        if (!words.length) return { s: e.s };
        if (words.every((w) => e.title.includes(w))) return { s: e.s, rank: 0 };
        const n = e.screens.findIndex((t) => words.every((w) => t.includes(w)));
        if (n > -1) return { s: e.s, rank: 1, n };
        if (words.every((w) => (e.title + ' ' + e.screens.join(' ')).includes(w))) return { s: e.s, rank: 2 };
        return null;
      }).filter(Boolean);
      let inText = false;
      if (words.length && !hits.length && q.length >= 3 && !searchReady) { loadSearch().then(() => { if (qIn.isConnected) draw(); }, () => {}); }
      if (words.length && !hits.length && q.length >= 3 && searchReady) {
        hits = sessions.filter((s) => (!chip || chipHas(chip, s)) && words.every((w) => s.text.includes(w))).map((s) => ({ s, rank: 3 }));
        inText = hits.length > 0;
      }
      const active = !!(words.length || chip);
      filtering = true;
      for (const g of groups) {
        const ph = +g.dataset.ph;
        g.hidden = active;
        if (!active) { g.open = isOpen(ph); if (!lists[ph].firstChild) lists[ph].innerHTML = sessions.filter((x) => x.phase === ph).map((x) => lessonRow(x)).join(''); }
      }
      filtering = false;
      // while filtering: one flat list, best matches first (lesson titles, then screens inside lessons)
      const main = hits.filter((h) => h.rank !== 1), inner = hits.filter((h) => h.rank === 1);
      main.sort((x, y) => (x.rank || 0) - (y.rank || 0));
      res.hidden = !active || !hits.length;
      res.innerHTML = !active ? '' : `${main.length ? `<div class="card lres"><h2>${inText ? 'Lessons that mention it' : 'Lessons'}</h2><div class="list">${main.map((h) => lessonRow(h.s, null, true)).join('')}</div></div>` : ''}
        ${inner.length ? `<div class="card lres"><h2>Screens inside lessons</h2><div class="list">${inner.map((h) => lessonRow(h.s, h, true)).join('')}</div></div>` : ''}`;
      const what = [chip && chip[0], qIn.value.trim() && `"${qIn.value.trim()}"`].filter(Boolean).join(' and ');
      $('#lcount', view).innerHTML = !active ? `${sessions.length} lessons in ${phases.length} phases. Tap a phase to open it.`
        : !hits.length ? `Nothing matches ${esc(what)}. Try one word, like deer or scope. <button type="button" class="linkish" id="lclear">Clear</button>`
        : `${hits.length} lesson${hits.length === 1 ? '' : 's'} ${inText ? 'mention' : 'match'} ${esc(what)}. <button type="button" class="linkish" id="lclear">Clear</button>`;
      const cl = $('#lclear', view);
      if (cl) cl.onclick = () => { qIn.value = ''; st.chip = ''; view.querySelectorAll('.chip').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); }); draw(); };
    };
    qIn.addEventListener('input', draw);
    qIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') qIn.blur(); });
    view.querySelectorAll('.chip').forEach((b) => b.onclick = () => {
      st.chip = st.chip === b.dataset.chip ? '' : b.dataset.chip;
      view.querySelectorAll('.chip').forEach((x) => { const on = x.dataset.chip === st.chip; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      draw();
    });
    draw();
  }

  // ---------- lesson reader: the shell renders once, a screen change swaps only the screen ----------
  let L = null; // the mounted lesson
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function session(id, stepArg) {
    const s = byId[id]; if (!s) return notFound();
    tab('learn');
    const steps = stepsOf(s);
    let i = stepArg != null && stepArg !== '' && isFinite(+stepArg) ? +stepArg : openAt(s);
    i = Math.max(0, Math.min(i, steps.length - 1));
    setTitle(lessonLabel(s));
    if (L && L.id === id && L.root.isConnected) { showScreen(i); return; }
    const n = steps.length;
    view.innerHTML = `<div class="lesson" id="lesson">
      <div class="lesson-head">
        <div class="segs" id="ls-segs" role="slider" tabindex="0" aria-label="Screens in this lesson. Tap or drag to jump" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="1">
          ${steps.map(() => '<i></i>').join('')}<span class="segs-tip" id="ls-tip" hidden></span></div>
        <div class="lesson-bar">
          <button type="button" class="lbtn" id="ls-toc" aria-haspopup="dialog"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>Contents</button>
          <span class="lesson-count" id="ls-count" aria-live="polite"></span>
          <button type="button" class="lbtn lbtn-ask" id="ls-ask" aria-haspopup="dialog"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4Z"/></svg>Ask</button>
        </div>
      </div>
      <article class="step" id="ls-step"></article>
      <div class="lesson-nav"><button type="button" class="btn" id="ls-prev"></button><button type="button" class="btn primary" id="ls-next"></button></div>
    </div>`;
    L = { id, s, steps, n, i: -1, root: $('#lesson', view), art: $('#ls-step', view), segs: [...view.querySelectorAll('#ls-segs > i')] };
    loadLesson(s).catch(() => {});
    bindLesson();
    showScreen(i);
  }

  function showScreen(i) {
    const { s, steps, n } = L;
    i = Math.max(0, Math.min(n - 1, i | 0));
    const prev = L.i, dir = prev < 0 ? 0 : Math.sign(i - prev);
    const st = steps[i];
    if (!st.quiz && st.html == null) {
      // screens not loaded yet: show the title now, fill in when the lesson file arrives (cached offline after first load)
      L.art.innerHTML = `<h2>${esc(st.title)}</h2><p class="muted ls-wait">Loading...</p>`;
      loadLesson(s).then(() => { if (L && L.s === s && L.i === i) { L.i = -1; showScreen(i); } }, () => {
        if (!(L && L.s === s && L.i === i)) return;
        L.art.innerHTML = `<h2>${esc(st.title)}</h2><div class="card"><p>This lesson is not saved on this phone yet. Connect to the internet once to download it.</p><button type="button" class="btn" id="ls-retry">Try again</button></div>`;
        $('#ls-retry', L.art).onclick = () => { L.i = -1; showScreen(i); };
      });
    } else if (i !== prev) {
      L.art.innerHTML = `<h2>${esc(st.title)}</h2>${st.quiz ? quizHtml(s) : st.html}`;
      hydrateChecks(L.art); hydrateSteps(L.art); renderRegs(L.art); renderSeasons(L.art);
      if (st.quiz) bindQuiz(s); else linkPlaces(L.art);
      if (dir && !reduceMotion && L.art.animate) L.art.animate([{ transform: `translateX(${dir * 28}px)`, opacity: 0.35 }, { transform: 'none', opacity: 1 }], { duration: 170, easing: 'ease-out' });
    }
    if (i !== prev) L.segs.forEach((g, k) => { g.className = k < i ? 'seen' : k === i ? 'on' : ''; });
    L.i = i;
    $('#ls-segs', view).setAttribute('aria-valuenow', String(i + 1));
    $('#ls-segs', view).setAttribute('aria-valuetext', `Screen ${i + 1} of ${n}: ${st.title}`);
    $('#ls-count', view).textContent = `${i + 1} of ${n}`;
    const last = i === n - 1;
    const pb = $('#ls-prev', view), nb = $('#ls-next', view);
    pb.textContent = i > 0 ? 'Back' : 'All lessons';
    nb.innerHTML = last ? (S.done[s.id] ? 'Done &#10003;' : 'Mark done') : 'Next';
    S.pos[s.id] = i; S.max[s.id] = Math.max(S.max[s.id] || 0, i); S.last = { id: s.id, t: Date.now() }; save();
    // keep the address current without adding a history entry for every screen
    const h = `#/s/${s.id}/${i}`;
    if (location.hash !== h) history.replaceState(history.state, '', h);
    setTrail(h);
    if (prev !== i) window.scrollTo(0, 0);
  }

  function bindLesson() {
    const go = (d) => showScreen(L.i + d);
    $('#ls-prev', view).onclick = () => { if (L.i > 0) go(-1); else location.hash = '#/learn'; };
    $('#ls-next', view).onclick = () => {
      if (L.i < L.n - 1) return go(1);
      const id = L.id; S.done[id] = true; save();
      const nx = nextSession(); location.hash = nx ? `#/s/${nx.id}` : '#/learn';
    };
    $('#ls-toc', view).onclick = openContents;
    $('#ls-ask', view).onclick = () => sheet(`<h2>Ask a question</h2>
      <div class="ask-pick">${window.HMRoutes && window.HMRoutes.ask ? `<a class="btn block" href="#/ask">Ask the app<small>Answers from these lessons. Works with no signal.</small></a>` : ''}
      <a class="btn block" href="${MENTOR_URL}" target="_blank" rel="noopener" data-ask-mentor>Ask the mentor<small>Copies this screen for you to paste. Needs internet.</small></a></div>`);
    // progress segments: tap or drag to jump (a 44 px tall touch strip; the bars inside are thin)
    const bar = $('#ls-segs', view), tip = $('#ls-tip', view);
    let dragging = false, pick = -1;
    const idxAt = (x) => { const r = bar.getBoundingClientRect(); return Math.max(0, Math.min(L.n - 1, Math.floor(((x - r.left) / r.width) * L.n))); };
    const preview = (x) => {
      pick = idxAt(x);
      L.segs.forEach((g, k) => g.classList.toggle('pick', k === pick));
      tip.hidden = false; tip.textContent = `${pick + 1}. ${L.steps[pick].title}`;
      const r = bar.getBoundingClientRect();
      tip.style.left = `${Math.max(8, Math.min(r.width - tip.offsetWidth - 8, x - r.left - tip.offsetWidth / 2))}px`;
    };
    const endPick = (commit) => {
      if (!dragging) return; dragging = false;
      tip.hidden = true; L.segs.forEach((g) => g.classList.remove('pick'));
      if (commit && pick > -1) showScreen(pick);
    };
    bar.addEventListener('pointerdown', (e) => { dragging = true; try { bar.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ } preview(e.clientX); });
    bar.addEventListener('pointermove', (e) => { if (dragging) preview(e.clientX); });
    bar.addEventListener('pointerup', () => endPick(true));
    bar.addEventListener('pointercancel', () => endPick(false));
    bar.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (d) { e.preventDefault(); go(d); } else if (e.key === 'Home') showScreen(0); else if (e.key === 'End') showScreen(L.n - 1);
    });
    // swipe left or right on the screen to change screens (not inside slides, tables or sideways scrolling boxes)
    let t0 = null;
    const blocksSwipe = (el) => {
      for (; el && el !== L.root; el = el.parentElement) {
        if (el.matches('.steps, .tbl, table, pre, input, textarea, select, video, .segs, .q')) return true;
        if (el.scrollWidth > el.clientWidth + 2) { const ox = getComputedStyle(el).overflowX; if (ox === 'auto' || ox === 'scroll') return true; }
      }
      return false;
    };
    L.root.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      t0 = e.touches.length === 1 && t.clientX > 24 && t.clientX < innerWidth - 24 && !blocksSwipe(e.target) ? { x: t.clientX, y: t.clientY, at: Date.now() } : null;
    }, { passive: true });
    L.root.addEventListener('touchend', (e) => {
      if (!t0) return;
      const t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y, dt = Date.now() - t0.at;
      t0 = null;
      if (dt > 700 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
      if (window.getSelection && String(window.getSelection()).length) return;
      if (dx < 0 && L.i < L.n - 1) go(1); else if (dx > 0 && L.i > 0) go(-1);
    }, { passive: true });
  }

  function openContents() {
    const { s, steps, i } = L, mx = S.max[s.id] || 0;
    sheet(`<h2>Contents</h2><p class="muted">${esc(lessonLabel(s))}. ${steps.length} screens.</p>
      <ol class="toc">${steps.map((st, n) => `<li><button type="button" class="toc-i ${n === i ? 'on' : ''} ${n <= mx && n !== i ? 'seen' : ''}" data-n="${n}" ${n === i ? 'aria-current="step"' : ''}>
        <span class="toc-n">${n + 1}</span><span class="toc-t">${esc(st.title)}</span>${n === i ? '<span class="pill soon">Here</span>' : ''}</button></li>`).join('')}</ol>`);
    const body = $('#sheet-body');
    body.querySelectorAll('.toc-i').forEach((b) => b.onclick = () => { $('#sheet').hidden = true; showScreen(+b.dataset.n); });
    const cur = body.querySelector('.toc-i.on');
    if (cur) { const card = $('#sheet .sheet-card'); card.scrollTop += cur.getBoundingClientRect().top - card.getBoundingClientRect().top - card.clientHeight / 2 + cur.offsetHeight / 2; }
  }
  // arrow keys change screens on a keyboard
  document.addEventListener('keydown', (e) => {
    if (!L || !L.root.isConnected || !$('#sheet').hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName)) return;
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.steps, .segs')) return;
    if (e.key === 'ArrowRight') showScreen(L.i + 1); else if (e.key === 'ArrowLeft') showScreen(L.i - 1);
  });

  function quizHtml(s, only) {
    return s.quiz.map((q, n) => {
      const qid = `${s.id}#${n}`;
      if (only && !only.includes(qid)) return '';
      return `<div class="q" data-qid="${qid}" data-sid="${s.id}" data-n="${n}"><p><strong>${n + 1}. ${esc(q.q)}</strong></p>
        ${q.options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join('')}<div class="why" hidden></div></div>`;
    }).join('');
  }
  function bindQuiz() {
    view.querySelectorAll('.q').forEach((qel) => {
      const s = byId[qel.dataset.sid]; const q = s.quiz[+qel.dataset.n];
      qel.querySelectorAll('.opt').forEach((b) => b.onclick = () => {
        if (qel.dataset.answered) return;
        qel.dataset.answered = '1';
        const k = +b.dataset.k; const ok = k === q.answer;
        b.classList.add(ok ? 'right' : 'wrong');
        qel.querySelector(`.opt[data-k="${q.answer}"]`).classList.add('right');
        const why = qel.querySelector('.why');
        why.hidden = false; why.innerHTML = `<strong>${ok ? 'Correct.' : 'Not quite.'}</strong> ${esc(q.why)}`;
        S.quiz[qel.dataset.qid] = ok; save();
      });
    });
  }

  function review() {
    setTitle('Review'); tab('home');
    const missed = Object.entries(S.quiz).filter(([, v]) => !v).map(([k]) => k);
    if (!missed.length) { view.innerHTML = '<div class="card"><h2>Nothing to review</h2><p>Every quiz answer so far is right.</p></div>'; return; }
    view.innerHTML = '<p class="muted">Questions you missed. Get them right to clear them.</p>' +
      [...new Set(missed.map((k) => k.split('#')[0]))].filter((id) => byId[id]).map((id) => `<div class="card"><h2>${esc(byId[id].title)}</h2>${quizHtml(byId[id], missed)}</div>`).join('');
    bindQuiz();
  }

  // ---------- regs data render ----------
  function renderRegs(root) {
    root.querySelectorAll('[data-regs]').forEach((el) => {
      const keys = el.dataset.regs.split(',');
      const rows = HM.regs.items.filter((r) => keys.some((k) => r.group === k || r.key === k));
      el.innerHTML = rows.length ? `<div class="tbl"><table><thead><tr><th>What</th><th>Rule</th><th>Certainty</th><th>Source</th></tr></thead><tbody>${rows.map((r) => `<tr>
        <td>${esc(r.label)}</td><td>${r.value ? esc(r.value) : '<span class="verify">VERIFY</span>'}${r.note ? `<div class="muted">${esc(r.note)}</div>` : ''}</td>
        <td><span class="cert ${r.certainty >= 95 ? 'c-hi' : r.certainty >= 80 ? 'c-mid' : r.certainty >= 60 ? 'c-lo' : 'c-tip'}">${r.certainty}%</span></td>
        <td>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.source)}</a>` : esc(r.source || '')}${r.page ? `, ${esc(r.page)}` : ''}<div class="muted">checked ${esc(r.checked)}</div></td></tr>`).join('')}</tbody></table></div>`
        : '<p><span class="verify">VERIFY</span> No checked data yet.</p>';
    });
  }

  // ---------- seasons lesson block (```seasons, build.mjs) ----------
  // Open today, opens in the next 60 days and the full table, from data/seasons/<file>.json (precached; HM.seasonsInline in the single file backup).
  // Same open logic as home.js and plan.js (MM-DD dates, seasons that wrap past New Year, allYear). Never shows a value the data does not have.
  const SZ = { cache: {} };
  const SMON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const scap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  const smd = (mmdd) => { const [m, d] = String(mmdd).split('-').map(Number); return `${SMON[m - 1]} ${d}`; };
  const sOpenOn = (r, t) => r.allYear ? true : !r.open || !r.close ? false : r.open <= r.close ? t >= r.open && t <= r.close : t >= r.open || t <= r.close;
  const sDays = (mmdd, iso) => { // days from iso to the next mmdd (0 = today)
    const y = +iso.slice(0, 4), now = new Date(iso + 'T00:00:00Z');
    let d = new Date(`${y}-${mmdd}T00:00:00Z`); if (d < now) d = new Date(`${y + 1}-${mmdd}T00:00:00Z`);
    return Math.round((d - now) / 864e5);
  };
  const sYearKey = (mmdd) => { const [m, d] = String(mmdd || '04-01').split('-').map(Number); return ((m + 8) % 12) * 100 + d; }; // licence year order, April first
  const muNum = (mu) => { const [a, b] = mu.split('-').map(Number); return a * 100 + b; };
  function muRanges(list) { // ["3-12","3-13","3-14","3-20"] -> "3-12 to 3-14, 3-20"
    const s = [...new Set(list)].sort((a, b) => muNum(a) - muNum(b)); const out = [];
    for (let i = 0; i < s.length; i++) {
      let j = i; while (j + 1 < s.length && muNum(s[j + 1]) === muNum(s[j]) + 1) j++;
      out.push(j > i ? `${s[i]} to ${s[j]}` : s[i]); i = j;
    }
    return out.join(', ');
  }
  function labelMus(label) { // "Wolf, MUs 3-12 to 3-16, 3-18 to 3-20" -> Set of MUs, or null when the label names none
    const m = String(label).match(/MUs? ([\d\s,toand-]+)$/); if (!m) return null;
    const out = new Set();
    for (const part of m[1].split(/,| and /)) {
      const r = part.trim().match(/^(\d+)-(\d+)(?: to (\d+)-(\d+))?$/); if (!r) return null;
      for (let k = +r[2]; k <= (r[3] ? +r[4] : +r[2]); k++) out.add(`${+r[1]}-${k}`);
    }
    return out;
  }
  const sWords = (x) => String(x || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/'s\b/g, '').replace(/[^a-z]+/g, ' ').split(' ').filter(Boolean).map((w) => w.length > 3 ? w.replace(/s$/, '') : w);
  function bagFor(R, sp, mu) { // bag table lines for a species (regional text and the table limit), filtered to the MU when the label names MUs
    const rw = sWords(sp), out = [];
    for (const b of R.bag || []) {
      if (/^refer to/i.test(b.limit || '')) continue; // "Refer to Regional Bag Limits": the regional line itself is shown instead
      const head = String(b.species).split(/[:,]/)[0], hw = sWords(head), fw = sWords(b.species);
      const regional = b.species === b.species.toLowerCase() && !/[:,]/.test(b.species); // "deer", "grouse": the regional bag limit paragraph
      const lw = sWords(b.limit);
      const ok = regional ? hw.every((w) => rw.includes(w)) && rw.every((w) => hw.includes(w) || lw.includes(w))
        : (hw.every((w) => rw.includes(w)) && rw.every((w) => fw.includes(w))) || rw.every((w) => hw.includes(w));
      if (!ok) continue;
      const lm = labelMus(b.species); if (mu && lm && !lm.has(mu)) continue;
      let text = b.limit === 'NBL' ? 'No bag limit (NBL)' : b.limit;
      if (regional) { // keep the sentences about this species or all of them: "aggregate ... is 3", "mule deer is 1", not the white tail one
        const Q = ['mule', 'white', 'ptarmigan'];
        const keep = String(b.limit).replace(/^[A-Za-z ]+:\s*/, '').split(/(?<=\.)\s+/).filter((x) => !Q.some((q) => sWords(x).includes(q) && !rw.includes(q)));
        if (keep.length) text = keep.join(' ');
      }
      out.push({ label: regional ? 'Regional limit' : b.species, text, full: b.limit, page: b.page, cert: b.cert });
    }
    return out;
  }
  function rowLimit(r) { // the limit printed in the row itself, in plain words; '' when the row has none
    if (r.daily != null) return `${r.daily} a day, ${r.possession != null ? r.possession : 'VERIFY'} in possession`;
    const n = String(r.notes || '');
    if (/\bNBL\b/.test(n)) return 'No bag limit';
    const pairs = n.match(/\b\d+(?: each)? ?\(\d+(?: each)?\)/g) || [];
    if (pairs.length > 1) return n.split(';')[0]; // several limits by MU: as printed
    let m;
    if ((m = n.match(/\bbag (\d+)((?: antlerless)?(?: \(\w+\))?(?: per licence year)?)/i))) return `Bag ${m[1]}${m[2] || ''}`;
    if ((m = n.match(/\b(\d+)( each)? ?\((\d+)( each)?\)/))) return `${m[1]}${m[2] || ''} a day, ${m[3]}${m[4] || ''} in possession`;
    if ((m = n.match(/\b(\d+) \(daily\)/))) return `${m[1]} a day`;
    return '';
  }
  const sTag = (n) => { const m = String(n || '').match(/youth (?:or senior )?(?:bow )?only|bow only|private land only/i); return m ? scap(m[0].toLowerCase()) : ''; };
  const sNote = (n) => String(n || '').replace(/^\s*(NBL( \(No Bag Limit\))?|bag \d+[^.;]*|\d+(?: each)? ?\(\d+(?: each)?\)|\d+ \(daily\))\s*[.;:]?\s*/i, '').replace(/^No closed season$/i, '').trim();
  function seasonsFile(f) {
    if (HM.seasonsInline && HM.seasonsInline[f]) return Promise.resolve(HM.seasonsInline[f]);
    return (SZ.cache[f] = SZ.cache[f] || fetch(`data/seasons/${f}.json`, { credentials: 'omit' }).then((r) => { if (!r.ok) throw new Error(f); return r.json(); }).catch((e) => { delete SZ.cache[f]; throw e; }));
  }

  function renderSeasons(root) {
    root.querySelectorAll('.hm-seasons[data-region]').forEach((el) => {
      if (el.dataset.done) return; el.dataset.done = '1';
      const reg = el.dataset.region, mig = reg === 'migratory';
      const want = (el.dataset.mus || '').split(',').filter(Boolean);
      const spf = (el.dataset.species || '').split('|').filter(Boolean);
      const law = '<p class="hm-law">Study aid only. The official regulations are the law.</p>';
      seasonsFile(mig ? 'migratory' : 'region' + reg).then((R) => {
        const allMus = mig ? Object.values(R.districts || {}).flatMap((d) => d.mus || []) : [...new Set((R.rows || []).flatMap((r) => r.mus || []))];
        allMus.sort((a, b) => muNum(a) - muNum(b));
        const regName = mig ? 'all BC districts' : `Region ${String(reg).toUpperCase()}`;
        const spOk = (sp) => !spf.length || spf.some((f) => { const a = sWords(f), b = sWords(sp); return a.every((w) => b.includes(w)) || b.every((w) => a.includes(w)); });
        let cur = want[0] || '';
        const draw = () => {
          const iso = new Date().toLocaleDateString('en-CA', { timeZone: TZ }), t = iso.slice(5);
          const where = cur ? `MU ${cur}` : regName;
          let dk = '', rows;
          if (mig) {
            dk = cur ? Object.keys(R.districts || {}).find((k) => (R.districts[k].mus || []).includes(cur)) || '' : '';
            rows = (R.rows || []).filter((r) => (!cur || (r.district === dk && (!r.mus || r.mus.includes(cur)))));
          } else rows = (R.rows || []).filter((r) => !cur || (r.mus || []).includes(cur));
          rows = rows.filter((r) => spOk(r.species));
          const muTxt = (r) => mig ? (cur ? '' : `District ${r.district} (${(R.districts[r.district] || {}).name || ''})${r.mus ? `, MUs ${muRanges(r.mus)}` : ''}`) : cur ? '' : `MUs ${muRanges(r.mus || [])}`;
          const src = (r) => mig ? `${esc(r.item || 'Schedule 3')} ${certBadge(r.cert)}` : `${r.page != null ? `page ${esc(r.page)}` : '<span class="verify">VERIFY</span> page'} ${certBadge(r.cert)}`;
          const bagCache = {};
          const bags = (sp) => (bagCache[sp] = bagCache[sp] || (mig ? [] : bagFor(R, sp, cur)));
          const limitHtml = (r) => { const l = rowLimit(r); if (l) return esc(l); const b = bags(r.species); return b.length ? b.map((x) => esc(x.text)).join('<br>') : '<span class="verify">VERIFY</span>'; };
          const dates = (r) => r.allYear ? 'No closed season' : r.open && r.close ? `${smd(r.open)} to ${smd(r.close)}` : '<span class="verify">VERIFY</span>';
          const item = (r, open) => {
            const tag = sTag(r.notes), note = sNote(r.notes), mt = muTxt(r);
            const when = r.allYear ? 'No closed season' : open ? (() => { const d = sDays(r.close, iso); return `${smd(r.open)} to ${smd(r.close)}, <b class="${d <= 7 ? 'hs-soon' : ''}">${d === 0 ? 'closes today' : `${d} day${d === 1 ? '' : 's'} left`}</b>`; })()
              : (() => { const d = sDays(r.open, iso); return `<b>Opens ${smd(r.open)}</b> (in ${d} day${d === 1 ? '' : 's'}), to ${smd(r.close)}`; })();
            return `<li class="hs-item"><div class="row"><b class="grow">${esc(scap(r.species))}${r.class ? `: ${esc(r.class)}` : ''}</b>${tag ? `<span class="pill">${esc(tag)}</span>` : ''}</div>
              <div class="hs-small">${when}. Limit: ${limitHtml(r)}</div>
              <div class="muted hs-small">${note && note.toLowerCase() !== String(tag).toLowerCase() ? `${esc(scap(note))}. ` : ''}${mt ? `${esc(mt)}. ` : ''}${src(r)}</div></li>`;
          };
          const spIdx = (r) => (R.rows || []).findIndex((x) => x.species === r.species);
          const list = (arr, isOpen, max) => !arr.length ? '' : `<ul class="hs-list">${arr.slice(0, max).map((r) => item(r, isOpen)).join('')}</ul>${arr.length > max ? `<details class="more hs-rest"><summary>${arr.length - max} more ${isOpen ? 'open today' : 'opening soon'}</summary><ul class="hs-list">${arr.slice(max).map((r) => item(r, isOpen)).join('')}</ul></details>` : ''}`;
          const open = rows.filter((r) => sOpenOn(r, t)).sort((a, b) => (a.allYear ? 1 : 0) - (b.allYear ? 1 : 0) || spIdx(a) - spIdx(b) || (sTag(a.notes) ? 1 : 0) - (sTag(b.notes) ? 1 : 0) || sDays(a.close || '12-31', iso) - sDays(b.close || '12-31', iso));
          const next = rows.filter((r) => !sOpenOn(r, t) && r.open && sDays(r.open, iso) > 0 && sDays(r.open, iso) <= 60).sort((a, b) => sDays(a.open, iso) - sDays(b.open, iso));
          // full table, grouped by species in the order of the data
          const groups = [];
          for (const r of [...rows].sort((a, b) => sYearKey(a.open) - sYearKey(b.open))) { let g = groups.find((x) => x.sp === r.species); if (!g) groups.push(g = { sp: r.species, rows: [] }); g.rows.push(r); }
          const order = [...new Set(rows.map((r) => r.species))]; groups.sort((a, b) => order.indexOf(a.sp) - order.indexOf(b.sp));
          const table = groups.map((g) => {
            const b = bags(g.sp);
            return `<h4 class="hs-sp">${esc(scap(g.sp))}</h4>
              ${b.map((x) => `<p class="hs-bag"><b>${esc(x.label === 'Regional limit' ? 'Regional limit' : 'Bag limit')}:</b> ${esc(x.full === 'NBL' ? 'No bag limit (NBL)' : x.full)} <span class="muted">page ${esc(x.page)}</span> ${certBadge(x.cert)}</p>`).join('')}
              <div class="tbl"><table class="hs-tbl"><thead><tr><th>Class</th><th>Dates</th><th>Limit</th><th>Source</th></tr></thead><tbody>${g.rows.map((r) => {
                const tag = sTag(r.notes), note = sNote(r.notes), mt = muTxt(r), lim = rowLimit(r);
                return `<tr${sOpenOn(r, t) ? ' class="hs-on"' : ''}><td>${r.class ? esc(r.class) : 'All'}${tag ? ` <span class="pill">${esc(tag)}</span>` : ''}${note && note.toLowerCase() !== String(tag).toLowerCase() ? `<div class="muted hs-small">${esc(note)}</div>` : ''}${mt ? `<div class="muted hs-small">${esc(mt)}</div>` : ''}</td>
                  <td>${dates(r)}${sOpenOn(r, t) ? '<div class="hs-small"><b>Open today</b></div>' : ''}</td><td>${lim ? esc(lim) : b.length ? 'As above' : '<span class="verify">VERIFY</span>'}</td><td class="hs-small">${src(r)}</td></tr>`;
              }).join('')}</tbody></table></div>`;
          }).join('');
          // what the data says is not open, LEH only or closed
          const extra = [];
          if (!mig) {
            const closed = (R.closedMus || []).filter((c) => !cur || c.mu === cur);
            for (const c of closed) extra.push(`<p class="hs-warn"><b>MU ${esc(c.mu)}:</b> ${esc(c.notes)} <span class="muted">page ${esc(c.page)}</span> ${certBadge(c.cert)}</p>`);
            const leh = (R.leh || []).filter((x) => spOk(x.species));
            if (leh.length) extra.push(`<p class="hs-small"><b>LEH (Limited Entry Hunting) only:</b> ${leh.map((x) => `${esc(scap([x.class, x.species].filter(Boolean).join(' ')))}${x.notes && !/^l(eh|imited entry hunting) only$/i.test(x.notes) ? ` (${esc(x.notes)})` : ''} <span class="muted">page ${esc(x.page)}</span> ${certBadge(x.cert)}`).join('; ')}</p>`);
            if (R.noRow && (R.noRow.species || []).length && !spf.length) extra.push(`<p class="hs-small"><b>No general open season:</b> ${esc(R.noRow.species.join(', '))}. ${esc(R.noRow.notes || '')} <span class="muted">page ${esc(R.noRow.page)}</span> ${certBadge(R.noRow.cert)}</p>`);
          } else {
            if (cur && !dk) extra.push(R.noDistrict && (R.noDistrict.mus || []).includes(cur) ? `<p class="hs-warn">${esc(R.noDistrict.notes)} ${certBadge(R.noDistrict.cert)}</p>` : '<p class="hs-warn"><span class="verify">VERIFY</span> No federal district found for this MU.</p>');
            const nos = (R.noOpenSeason || []).filter((x) => !cur || x.district === dk);
            if (nos.length && cur) extra.push(`<p class="hs-small"><b>No open season:</b> ${nos.map((x) => `${esc(x.species)} (${esc(x.item)}) ${certBadge(x.cert)}`).join(', ')}</p>`);
          }
          const today = new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
          el.querySelector('.hs-body').innerHTML = `
            ${extra.filter((x) => x.includes('hs-warn')).join('')}
            <h3 class="hs-h">Open today in ${esc(where)} <span class="muted hs-date">${esc(today)}</span></h3>
            ${open.length ? list(open, true, 6) : `<p>Nothing in this table is open today in ${esc(where)}.</p>`}
            <h3 class="hs-h">Opens in the next 60 days</h3>
            ${next.length ? list(next, false, 4) : '<p class="muted">No season in this table opens in the next 60 days.</p>'}
            <details class="more hs-all"${el.dataset.open ? ' open' : ''}><summary>All seasons in ${esc(where)} (${rows.length})</summary>${table || '<p>No rows.</p>'}</details>
            ${extra.filter((x) => !x.includes('hs-warn')).join('')}
            <p class="muted hs-small">${esc(R.source || '')}${R.checked ? `, checked ${esc(R.checked)}` : ''}. General open seasons only: LEH draws, closed areas, no shooting areas and in season changes are not all shown. Daily limit first, possession limit in brackets. Today is ${esc(iso)} on this phone.</p>`;
          const det = el.querySelector('.hs-all'); det.ontoggle = () => { el.dataset.open = det.open ? '1' : ''; };
          el.querySelectorAll('.hs-chips .chip').forEach((c) => c.classList.toggle('on', c.dataset.mu === cur));
          const sel = el.querySelector('.hs-other'); if (sel) { sel.value = want.includes(cur) || !cur ? '' : cur; sel.classList.toggle('on', !!sel.value); }
          linkPlaces(el.querySelector('.hs-body'));
        };
        const others = allMus.filter((m) => !want.includes(m));
        el.innerHTML = `${law}<div class="chips hs-chips" role="group" aria-label="Pick a Management Unit">
            ${want.map((m) => `<button type="button" class="chip" data-mu="${esc(m)}">MU ${esc(m)}</button>`).join('')}
            <button type="button" class="chip" data-mu="">${mig ? 'All districts' : `All ${esc(regName)}`}</button>
            ${others.length ? `<select class="hs-other chip" aria-label="Another MU"><option value="">Other MU</option>${others.map((m) => `<option value="${esc(m)}">MU ${esc(m)}</option>`).join('')}</select>` : ''}
          </div><div class="hs-body"></div>`;
        el.querySelectorAll('.hs-chips button').forEach((b) => { b.onclick = () => { cur = b.dataset.mu; draw(); }; });
        const sel = el.querySelector('.hs-other'); if (sel) sel.onchange = () => { if (sel.value) { cur = sel.value; draw(); } };
        draw();
      }).catch(() => { el.innerHTML = `${law}<p class="muted">The season table is not saved on this phone yet. Open the app once with signal.</p>`; });
    });
  }

  // ---------- field mode ----------
  function field(sub) {
    document.body.classList.add('field');
    tab('field');
    const F = HM.field;
    if (!sub) {
      setTitle('Field Mode');
      view.innerHTML = `<div class="fgrid">
        <a class="ftile hot" href="#/field/legal">Legal to shoot?<small>Step by step check</small></a>
        <a class="ftile" href="#/field/light">Legal light<small>3 bases, offline</small></a>
        ${F.cards.map((c) => `<a class="ftile ${c.hot ? 'hot' : ''}" href="#/field/c/${c.id}">${esc(c.title)}<small>${esc(c.sub || '')}</small></a>`).join('')}
      </div>`;
      return;
    }
    if (sub === 'legal') return legalFlow(0);
    if (sub === 'light') return lightView();
    if (sub.startsWith('c/')) {
      const c = F.cards.find((x) => x.id === sub.slice(2)); if (!c) return notFound();
      setTitle(c.title);
      view.innerHTML = `<div class="card step">${c.html}</div>`;
      hydrateChecks(view); hydrateSteps(view);
    }
  }

  function legalFlow(n) {
    const steps = HM.field.legalFlow;
    setTitle('Legal to shoot?');
    if (n >= steps.length) {
      view.innerHTML = `<div class="go">All checks passed. Breathe. Only shoot if the shot is ethical and you are sure.</div>
        <div class="btn-row"><button class="btn" id="again">Start again</button></div>`;
      $('#again').onclick = () => legalFlow(0);
      return;
    }
    const st = steps[n];
    view.innerHTML = `<div class="muted">Check ${n + 1} of ${steps.length}</div>
      <div class="flow"><div class="node">${esc(st.q)}</div>${st.help ? `<p class="muted">${esc(st.help)}</p>` : ''}
      <div class="yesno"><button class="btn primary" id="yes">YES</button><button class="btn" id="no">NO</button></div></div>`;
    $('#yes').onclick = () => legalFlow(n + 1);
    $('#no').onclick = () => {
      view.innerHTML = `<div class="stop">DO NOT SHOOT</div><p>${esc(st.stop)}</p>
        <div class="btn-row"><button class="btn" id="again">Start again</button></div>`;
      $('#again').onclick = () => legalFlow(0);
    };
  }

  function lightView(dateStr) {
    setTitle('Legal light');
    const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const ds = dateStr || today;
    const [y, m, d] = ds.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12);
    const H = HM.regs.hours;
    const rows = HM.bases.map((b) => {
      const rise = sunEvent(date, b.lat, b.lon, true), set = sunEvent(date, b.lat, b.lon, false);
      const col = (h) => h && h.beforeSunriseMin != null ? `${hhmm(addMin(rise, -h.beforeSunriseMin))} to ${hhmm(addMin(set, h.afterSunsetMin))}` : '<span class="verify">VERIFY</span>';
      return `<tr><td><strong>${esc(b.name)}</strong></td><td>${hhmm(rise)}<br>${hhmm(set)}</td><td>${col(H.bigGame)}</td><td>${col(H.migratory)}</td></tr>`;
    }).join('');
    view.innerHTML = `<div class="card"><label class="f" for="ld">Date</label><input type="date" id="ld" value="${ds}"></div>
      <div class="tbl light"><table><thead><tr><th>Base</th><th>Sunrise / sunset</th><th>Big game and upland</th><th>Ducks and geese</th></tr></thead><tbody>${rows}</tbody></table></div>
      <aside class="callout warn"><div class="callout-t">Verify with official tables</div>
      <p>Calculated on your phone, Pacific time. Can be off by a few minutes in hills and valleys.</p>
      <p>Big game rule: ${esc(H.bigGame.text)} ${certBadge(H.bigGame.certainty)}</p>
      <p>Migratory birds rule: ${esc(H.migratory.text)} ${certBadge(H.migratory.certainty)}</p></aside>`;
    $('#ld').onchange = (e) => lightView(e.target.value);
  }
  const certBadge = (v) => v == null ? '<span class="verify">VERIFY</span>' : `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}">${v}%</span>`;

  // ---------- lists ----------
  function lists(id, sub) {
    setTitle('Checklists'); tab('lists');
    const L = HM.field.checklists;
    if (id === 'animal' && window.HMPlan) return window.HMPlan.animalList(view, sub, planCtx());
    if (!id) {
      view.innerHTML = `<div class="list card">${L.map((l) => {
        const n = l.items.filter((_, k) => S.checks[`${l.id}:${k}`]).length;
        return `<a class="item" href="#/lists/${l.id}"><span class="grow">${esc(l.title)}</span><span class="pill">${n}/${l.items.length}</span></a>`;
      }).join('')}</div>
      ${window.HMPlan ? `<div class="card"><h2>By animal</h2><p class="muted">A full checklist for each animal. Make a plan to add lists for your method, access and trip.</p><a class="btn block" href="#/plan/new/0">Plan a hunt</a><div id="lists-animal"><p class="muted">Loading...</p></div></div>` : ''}`;
      if (window.HMPlan) window.HMPlan.animalIndex($('#lists-animal', view), planCtx());
      return;
    }
    const l = L.find((x) => x.id === id); if (!l) return notFound();
    setTitle(l.title);
    view.innerHTML = `<div class="card"><div class="checklist">${l.items.map((t, k) =>
      `<label class="check"><input type="checkbox" data-key="${l.id}:${k}"><span>${t}</span></label>`).join('')}</div>
      <div class="btn-row"><button class="btn" id="reset">Untick all</button></div></div>`;
    hydrateChecks(view); hydrateSteps(view);
    $('#reset').onclick = () => { l.items.forEach((_, k) => delete S.checks[`${l.id}:${k}`]); save(); lists(id); };
  }

  // ---------- more ----------
  function more() {
    setTitle('More'); tab('more');
    const th = S.settings.theme;
    view.innerHTML = `
      <div class="card"><h2>Look</h2><div class="seg" id="theme">
        ${[['', 'Auto'], ['light', 'Light'], ['dark', 'Dark'], ['sun', 'Sunlight']].map(([v, l]) => `<button data-v="${v}" class="${th === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="card"><h2>First hunt date</h2><input type="date" id="fh" value="${esc(firstHunt())}"></div>
      <div class="card list">
        <a class="item" href="#/ask"><span class="grow">Ask the app (works with no signal)</span></a>
        <a class="item" href="#/cards"><span class="grow">Flashcards</span></a>
        <a class="item" href="#/glossary"><span class="grow">Glossary</span></a>
        <a class="item" href="#/journal"><span class="grow">Hunt journal</span></a>
        <a class="item" href="#/print"><span class="grow">Print pocket cards</span></a>
        <a class="item" href="#/credits"><span class="grow">Credits: photos and map data</span></a>
        <a class="item" href="#/review"><span class="grow">Review missed questions</span></a>
        <a class="item" href="#/sources"><span class="grow">Regulation data and sources</span></a>
        <a class="item" href="#/install"><span class="grow">Install on iPhone or Android</span></a>
      </div>
      <div class="card"><h2>Backup</h2><p class="muted">Your progress lives on this phone only. iPhone can clear it if the app goes unused for weeks. Export a backup now and then.</p>
        <div class="btn-row"><button class="btn" id="exp">Export backup</button><label class="btn">Import<input type="file" id="imp" accept=".json" hidden></label></div></div>`;
    view.querySelectorAll('#theme button').forEach((b) => b.onclick = () => { S.settings.theme = b.dataset.v; save(); applyTheme(); more(); });
    $('#fh').onchange = (e) => { S.settings.firstHunt = e.target.value; save(); };
    // Hunt Map user data (waypoints, lines, areas, tracks, photos) lives in IndexedDB (map/store.js): added as mapData
    const mapStore = () => import('./map/store.js').catch(() => null);
    $('#exp').onclick = async () => {
      let mp = null; try { mp = JSON.parse(localStorage.getItem(MAP_KEY) || 'null'); } catch (e) { mp = null; }
      let md = null; try { const m = await mapStore(); if (m) md = await m.exportAll(); } catch (e) { md = null; }
      download(`hunt-mentor-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(Object.assign({}, S, mp ? { mapPrefs: mp } : {}, md ? { mapData: md } : {})), 'application/json');
    };
    $('#imp').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then((t) => {
        try {
          const o = JSON.parse(t);
          if (o.mapPrefs) { try { localStorage.setItem(MAP_KEY, JSON.stringify(o.mapPrefs)); } catch (e) { /* storage blocked */ } delete o.mapPrefs; }
          const md = o.mapData; delete o.mapData;
          S = Object.assign({}, blank, o); S.pos = S.pos || {}; S.max = S.max || {}; save(); applyTheme();
          const done = (n) => { alert(n ? "Backup restored, including your map items." : 'Backup restored.'); more(); };
          if (md) mapStore().then((m) => (m ? m.importAll(md) : 0)).then((n) => { const T = window.HuntMap && window.HuntMap.tools; if (T) T.refresh(); done(n); }, () => { alert('Backup restored, but the map items could not be saved on this phone.'); more(); });
          else done(0);
        } catch (err) { alert('That file is not a Hunt Mentor backup.'); }
      });
    };
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  function glossary() {
    setTitle('Glossary'); tab('more');
    const terms = Object.keys(HM.glossary).sort((a, b) => a.localeCompare(b));
    view.innerHTML = `<input type="search" id="gq" placeholder="Filter terms"><div class="card" id="gl" style="margin-top:12px"></div>`;
    const draw = (q) => { $('#gl').innerHTML = terms.filter((t) => !q || (t + HM.glossary[t]).toLowerCase().includes(q)).map((t) => `<p><strong>${esc(t)}</strong>: ${HM.glossary[t]}</p>`).join('') || '<p>No match.</p>'; linkPlaces($('#gl')); };
    $('#gq').oninput = (e) => draw(e.target.value.toLowerCase()); draw('');
  }

  function search() {
    setTitle('Search'); tab('');
    view.innerHTML = `<input type="search" id="q" placeholder="Search sessions, glossary, rules" autofocus>${window.HMRoutes && window.HMRoutes.ask ? '<a class="btn block" id="ask-link" href="#/ask" style="margin-top:10px">Ask a question instead</a>' : ''}<div id="res" style="margin-top:12px"></div>`;
    const run = (q) => {
      q = q.trim().toLowerCase(); if (q.length < 2) { $('#res').innerHTML = ''; return; }
      if (!searchReady) loadSearch().then(() => { const el = $('#q'); if (el && el.value.trim().toLowerCase() === q) run(el.value); }, () => {});
      const ses = sessions.filter((s) => (s.text || '').includes(q) || s.title.toLowerCase().includes(q));
      const gl = Object.keys(HM.glossary).filter((t) => (t + HM.glossary[t]).toLowerCase().includes(q));
      const rg = HM.regs.items.filter((r) => (r.label + ' ' + (r.value || '') + ' ' + (r.note || '')).toLowerCase().includes(q));
      $('#res').innerHTML = `
        ${ses.length ? `<div class="card list"><h2>Sessions</h2>${ses.map((s) => `<a class="item" href="#/s/${s.id}"><span class="num">${s.num}</span><span class="grow">${esc(s.title)}</span></a>`).join('')}</div>` : ''}
        ${gl.length ? `<div class="card"><h2>Glossary</h2>${gl.map((t) => `<p><strong>${esc(t)}</strong>: ${HM.glossary[t]}</p>`).join('')}</div>` : ''}
        ${rg.length ? `<div class="card"><h2>Rules data</h2>${rg.map((r) => `<p><strong>${esc(r.label)}</strong>: ${r.value ? esc(r.value) : 'VERIFY'} ${certBadge(r.certainty)}</p>`).join('')}</div>` : ''}
        ${!ses.length && !gl.length && !rg.length ? '<p>No results.</p>' : ''}`;
    };
    $('#q').oninput = (e) => { run(e.target.value); const al = $('#ask-link'); if (al) al.href = '#/ask' + (e.target.value.trim() ? '/' + encodeURIComponent(e.target.value.trim()) : ''); };
  }

  function sources() {
    setTitle('Rules data'); tab('more');
    const R = HM.regs;
    view.innerHTML = `<div class="card"><p><strong>Edition:</strong> ${esc(R.edition)}</p><p><strong>Last checked:</strong> ${esc(R.lastChecked)}</p>
      <p class="muted">${esc(R.note)}</p></div><div class="card"><h2>All rules in the app</h2><div data-regs="${[...new Set(R.items.map((r) => r.group))].join(',')}"></div></div>
      <div class="card"><h2>Official links</h2>${R.links.map((l) => `<p><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a></p>`).join('')}</div>`;
    renderRegs(view);
  }

  function install() {
    setTitle('Install'); tab('more');
    view.innerHTML = `<div class="card step"><h2>iPhone</h2><ol>
      <li>Open this page in <strong>Safari</strong> (not Chrome).</li><li>Tap the <strong>Share</strong> button (square with an arrow up).</li>
      <li>Scroll down. Tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li>
      <li>Open it once from the home screen while you have signal. It then works offline.</li></ol></div>
      <div class="card step"><h2>Android</h2><ol><li>Open this page in <strong>Chrome</strong>.</li><li>Tap the three dots menu.</li>
      <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li>Open it once with signal.</li></ol></div>
      <div class="card"><h2>Test it</h2><p>Turn on airplane mode. Open the app. Sessions and Field Mode should still work.</p></div>`;
  }

  function journal(editIdx) {
    setTitle('Hunt journal'); tab('more');
    const J = S.journal;
    const fields = [['date', 'Date', 'date'], ['place', 'Place or MU (Management Unit)', 'text'], ['species', 'Species hunted', 'text'],
      ['weather', 'Weather and wind', 'text'], ['seen', 'What you saw', 'textarea'], ['result', 'Shots and result', 'text'], ['lesson', 'One lesson', 'textarea']];
    if (editIdx != null) {
      const e = J[editIdx] || { date: new Date().toLocaleDateString('en-CA', { timeZone: TZ }) };
      view.innerHTML = `<div class="card">${fields.map(([k, l, t]) => `<label class="f" for="j-${k}">${l}</label>${t === 'textarea' ? `<textarea id="j-${k}" rows="3">${esc(e[k] || '')}</textarea>` : `<input type="${t}" id="j-${k}" value="${esc(e[k] || '')}">`}`).join('')}
        <div class="btn-row"><a class="btn" href="#/journal">Cancel</a><button class="btn primary" id="js">Save</button></div></div>`;
      $('#js').onclick = () => { const o = {}; fields.forEach(([k]) => { o[k] = $(`#j-${k}`).value; }); if (J[editIdx]) J[editIdx] = o; else J.unshift(o); save(); location.hash = '#/journal'; };
      return;
    }
    view.innerHTML = `<div class="btn-row"><a class="btn primary" href="#/journal/new">New entry</a><button class="btn" id="csv">Export CSV</button></div>
      <div class="list card" style="margin-top:12px">${J.map((e, n) => `<a class="item" href="#/journal/${n}"><span class="grow"><strong>${esc(e.date)}</strong> ${esc(e.place || '')}<br><span class="muted">${esc(e.species || '')} ${esc(e.result || '')}</span></span></a>`).join('') || '<p>No entries yet. Log every trip, even blank ones.</p>'}</div>`;
    $('#csv').onclick = () => {
      const q = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
      download('hunt-journal.csv', [fields.map((f) => q(f[1])).join(','), ...J.map((e) => fields.map(([k]) => q(e[k])).join(','))].join('\n'), 'text/csv');
    };
  }

  // ---------- flashcards (Leitner boxes: 0 new, 1 learning, 2 known) ----------
  function allCards() {
    const cards = [];
    for (const [t, d] of Object.entries(HM.glossary)) cards.push({ id: 'g:' + t, deck: 'Terms', front: t, back: d });
    for (const r of HM.regs.items) if (r.value) cards.push({ id: 'r:' + r.key, deck: 'Rules', front: r.label, back: `${esc(r.value)} <span class="cert ${r.certainty >= 95 ? 'c-hi' : r.certainty >= 80 ? 'c-mid' : 'c-lo'}">${r.certainty}%</span>` });
    for (const c of (HM.flashcards || [])) cards.push({ id: 'f:' + c.id, deck: c.deck, front: c.front, back: c.back, diagram: c.diagram, photo: c.photo });
    for (const s of sessions) s.quiz.forEach((q, n) => cards.push({ id: 'q:' + s.id + '#' + n, deck: 'Quiz', front: q.q, back: `<strong>${esc(q.options[q.answer])}</strong><br>${esc(q.why)}` }));
    return cards;
  }
  function cards(deckArg) {
    setTitle('Flashcards'); tab('more');
    S.cards = S.cards || {};
    const all = allCards();
    const decks = [...new Set(all.map((c) => c.deck))];
    const deck = deckArg ? decodeURIComponent(deckArg) : null;
    if (!deck) {
      view.innerHTML = `<p class="muted">Tap a deck. Cards you miss come back sooner.</p><div class="card list">${decks.map((d) => {
        const n = all.filter((c) => c.deck === d); const k = n.filter((c) => S.cards[c.id] === 2).length;
        return `<a class="item" href="#/cards/${encodeURIComponent(d)}"><span class="grow">${esc(d)}</span><span class="pill">${k}/${n.length} known</span></a>`; }).join('')}</div>
        <div class="btn-row"><button class="btn" id="reset-cards">Reset all decks</button></div>`;
      $('#reset-cards').onclick = () => { S.cards = {}; save(); cards(); };
      return;
    }
    const pool = all.filter((c) => c.deck === deck);
    // due order: box 0 first, then box 1, then box 2 (only when nothing else)
    const order = [0, 1, 2].flatMap((b) => pool.filter((c) => (S.cards[c.id] || 0) === b));
    const due = order.filter((c) => (S.cards[c.id] || 0) < 2);
    const card = (due.length ? due : order)[0];
    if (!card) { view.innerHTML = '<div class="card"><h2>Empty deck</h2></div>'; return; }
    const known = pool.filter((c) => S.cards[c.id] === 2).length;
    setTitle(deck);
    view.innerHTML = `<div class="muted">${known} of ${pool.length} known${due.length ? '' : '. All known, reviewing.'}</div>
      <div class="card fc" id="fc"><div class="fc-front"><h2>${card.front}</h2>${card.diagram ? `<figure class="diagram">${card.diagram}</figure>` : ''}${card.photo || ''}<p class="muted">Tap to flip</p></div>
      <div class="fc-back" hidden><p>${card.back}</p></div></div>
      <div class="btn-row" id="fc-btns" hidden><button class="btn" id="fc-no">Missed it</button><button class="btn primary" id="fc-yes">Knew it</button></div>
      <div class="btn-row"><a class="btn" href="#/cards">Decks</a></div>`;
    const fc = $('#fc');
    linkPlaces(fc.querySelector('.fc-back'));
    fc.onclick = (e) => { if (e.target.closest('.hmp')) return; fc.querySelector('.fc-back').hidden = false; $('#fc-btns').hidden = false; };
    $('#fc-yes').onclick = () => { S.cards[card.id] = Math.min(2, (S.cards[card.id] || 0) + 1); save(); cards(deckArg); window.scrollTo(0, 0); };
    $('#fc-no').onclick = () => { S.cards[card.id] = 0; save(); cards(deckArg); window.scrollTo(0, 0); };
  }

  // ---------- My next hunt: study path (must know first) and daily spaced repetition (SM-2 style) ----------
  // Path: legal, shot and meat lessons plus the Masterclass hunt chapters first, then every other Masterclass chapter and lesson.
  // Daily task: lesson screens worth about 8 minutes plus 10 cards from all decks (about 2 minutes). Pace "fit" spreads the rest over the days left.
  const dayISO = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const MUST_RE = /^(rb-|tagging-legal|shot-placement|blood-trailing|field-dressing|meat-care|cwd|first-)/;
  const MUST_ALL = ['mc-skills-10', 'mc-nav-07']; // safety and first aid; what to do when lost
  const STUDY_MIN = 8, DAY_CARDS = 10;
  const seenOf = (s) => { const n = stepsOf(s).length; return S.done[s.id] ? n : S.max[s.id] != null ? Math.min(n, S.max[s.id] + 1) : 0; };
  function studyPath(spId, lessons) {
    const mc = sessions.filter((s) => s.id.startsWith('mc-' + spId + '-')).map((s) => s.id).sort();
    const les = (lessons || []).filter((id) => byId[id]);
    const mcMust = mc.filter((id) => /-(09|10)$/.test(id));
    const rank = (id) => (/^rb-/.test(id) ? 0 : /^tagging-legal/.test(id) ? 1 : /^first-/.test(id) ? 5 : 2);
    const must = [...new Set([...les.filter((id) => MUST_RE.test(id)).sort((a, b) => rank(a) - rank(b)), ...mcMust, ...MUST_ALL.filter((id) => byId[id])])];
    const rest = [...new Set([...mc, ...les])].filter((id) => !must.includes(id));
    return { must, rest, all: must.concat(rest) };
  }
  function pathStats(ids) {
    let total = 0, seen = 0, min = 0, next = null, minLeft = 0;
    for (const id of ids) {
      const s = byId[id], n = stepsOf(s).length, k = seenOf(s), per = (s.minutes || n) / n;
      total += n; seen += k; min += per * n; minLeft += per * (n - k);
      if (!next && k < n) next = { id, i: k, title: s.title };
    }
    return { total, seen, left: total - seen, perScreen: total ? min / total : 1, minLeft, next };
  }
  function studyDay() {
    const t = dayISO();
    if (!S.study || S.study.date !== t) S.study = Object.assign({}, S.study, { date: t, base: {}, q: null, cardsDone: 0 });
    S.study.base = S.study.base || {};
    return S.study;
  }
  // today's task for one plan: { path, st, must, todayN, doneToday, leftToday, finish, mustFinish, daysToGo, pace }
  function studyToday(plan, lessons) {
    const P = studyPath(plan.species, lessons), st = pathStats(P.all), ms = pathStats(P.must);
    const day = studyDay(), t = day.date, pace = plan.pace || 'must'; // owner default 2026-10-16: must know by the hunt
    const daysToGo = plan.from ? dayDiff(t, plan.from) : null;
    if (!day.base[plan.id]) {
      const per10 = Math.max(1, Math.round(STUDY_MIN / Math.max(0.3, st.perScreen)));
      const fit = (left) => (daysToGo > 0 ? Math.ceil(left / daysToGo) : left);
      day.base[plan.id] = { seen: st.seen, n: pace === 'fit' ? Math.max(per10, fit(st.left)) : pace === 'must' ? Math.max(per10, fit(ms.left)) : per10 };
      save();
    }
    const b = day.base[plan.id], doneToday = Math.max(0, st.seen - b.seen), leftToday = Math.max(0, b.n - doneToday);
    const finish = st.left ? addDays(t, Math.max(0, Math.ceil((st.left - leftToday) / b.n))) : t;
    const mustFinish = ms.left ? addDays(t, Math.max(0, Math.ceil((ms.left - leftToday) / b.n))) : t;
    const perDay = (left) => (daysToGo > 0 ? Math.round((left / daysToGo) * st.perScreen) + 2 : null); // minutes a day to finish by the first hunt day
    return { path: P, st, must: ms, todayN: b.n, doneToday, leftToday, finish, mustFinish, daysToGo, pace, minPerDay: Math.round(b.n * st.perScreen) + 2, mustPerDay: perDay(ms.left), allPerDay: perDay(st.left) };
  }
  // ---------- spaced repetition: S.srs[id] = { e: ease, i: interval days, r: repetitions, d: due date } ----------
  function grade(id, knew) {
    S.srs = S.srs || {};
    const c = S.srs[id] || { e: 2.5, i: 0, r: 0 }, t = dayISO();
    if (knew) { c.r += 1; c.i = c.r === 1 ? 1 : c.r === 2 ? 6 : Math.round(c.i * c.e); }
    else { c.r = 0; c.i = 1; c.e = Math.max(1.3, c.e - 0.32); }
    c.d = addDays(t, c.i);
    S.srs[id] = c;
    S.cards = S.cards || {}; S.cards[id] = knew ? Math.min(2, (S.cards[id] || 0) + 1) : 0; // keep the deck counts in step
  }
  function dailyQueue() {
    const day = studyDay();
    if (day.q) return day.q;
    const all = allCards(), t = dayISO(), srs = S.srs || {};
    const due = all.filter((c) => srs[c.id] && srs[c.id].d <= t).sort((a, b) => (srs[a.id].d < srs[b.id].d ? -1 : 1)).map((c) => c.id);
    // new cards: quiz questions from lessons already read come first, then every deck in turn (all decks mixed)
    const fresh = all.filter((c) => !srs[c.id]);
    const readQuiz = fresh.filter((c) => { const m = c.id.match(/^q:(.+)#/); return m && byId[m[1]] && seenOf(byId[m[1]]) > 0; });
    const byDeck = {};
    fresh.filter((c) => !readQuiz.includes(c)).forEach((c) => (byDeck[c.deck] = byDeck[c.deck] || []).push(c));
    const decks = Object.keys(byDeck), mixed = [];
    for (let k = 0; mixed.length < DAY_CARDS * 2 && decks.some((d) => byDeck[d].length); k++) { const d = decks[k % decks.length]; if (byDeck[d].length) mixed.push(byDeck[d].shift()); }
    const newIds = readQuiz.concat(mixed).map((c) => c.id);
    day.q = due.concat(newIds).slice(0, Math.max(DAY_CARDS, Math.min(due.length, 50)));
    day.dueCount = due.length;
    save();
    return day.q;
  }
  function daily() {
    setTitle('Today\'s cards'); tab('home');
    const day = studyDay(), q = dailyQueue(), all = allCards(), byCard = Object.fromEntries(all.map((c) => [c.id, c]));
    const left = q.filter((id) => byCard[id]);
    if (!left.length) {
      view.innerHTML = `<div class="card"><h2>Cards done for today</h2><p>${day.cardsDone || 0} cards reviewed. Cards you knew come back in 1 day, then 6 days, then further apart. Cards you missed come back tomorrow.</p>
        <div class="btn-row"><a class="btn primary" href="#/">Home</a><button class="btn" id="dl-more">10 more cards</button><a class="btn" href="#/cards">All decks</a></div></div>`;
      $('#dl-more').onclick = () => { day.q = null; if (!dailyQueue().length) toast('No more cards for today.'); daily(); };
      return;
    }
    const card = byCard[left[0]];
    view.innerHTML = `<div class="muted">Card ${(day.cardsDone || 0) + 1} of ${(day.cardsDone || 0) + left.length}. Deck: ${esc(card.deck)}${S.srs && S.srs[card.id] ? '. Review' : '. New'}</div>
      <div class="card fc" id="fc"><div class="fc-front"><h2>${card.front}</h2>${card.diagram ? `<figure class="diagram">${card.diagram}</figure>` : ''}${card.photo || ''}<p class="muted">Tap to flip</p></div>
      <div class="fc-back" hidden><p>${card.back}</p></div></div>
      <div class="btn-row" id="fc-btns" hidden><button class="btn" id="fc-no">Missed it</button><button class="btn primary" id="fc-yes">Knew it</button></div>
      <div class="btn-row"><a class="btn" href="#/">Stop for now</a></div>`;
    const fc = $('#fc');
    linkPlaces(fc.querySelector('.fc-back'));
    fc.onclick = (e) => { if (e.target.closest('.hmp')) return; fc.querySelector('.fc-back').hidden = false; $('#fc-btns').hidden = false; };
    const next = (knew) => {
      grade(card.id, knew); q.splice(q.indexOf(card.id), 1);
      if (!knew && !(day.again || []).includes(card.id)) { day.again = (day.again || []).concat(card.id); q.push(card.id); } // one more try at the end of today
      else day.cardsDone = (day.cardsDone || 0) + 1;
      save(); daily(); window.scrollTo(0, 0);
    };
    $('#fc-yes').onclick = () => next(true);
    $('#fc-no').onclick = () => next(false);
  }
  const Study = { today: studyToday, path: studyPath, stats: pathStats, queue: dailyQueue, dayISO, dayDiff, seenOf, cardsLeft: () => { const q = dailyQueue(), have = new Set(allCards().map((c) => c.id)); return q.filter((id) => have.has(id)).length; }, cardsDone: () => studyDay().cardsDone || 0 };

  // ---------- print pocket cards ----------
  function printCards() {
    setTitle('Pocket cards'); tab('more');
    const F = HM.field; const H = HM.regs.hours;
    const today = new Date();
    const light = HM.bases.map((b) => { const r = sunEvent(today, b.lat, b.lon, true), s = sunEvent(today, b.lat, b.lon, false); return `<tr><td>${esc(b.name)}</td><td>${hhmm(r)} / ${hhmm(s)}</td><td>${hhmm(addMin(r, -H.bigGame.beforeSunriseMin))} to ${hhmm(addMin(s, H.bigGame.afterSunsetMin))}</td><td>${hhmm(addMin(r, -H.migratory.beforeSunriseMin))} to ${hhmm(addMin(s, H.migratory.afterSunsetMin))}</td></tr>`; }).join('');
    view.innerHTML = `<p class="muted no-print">Use your browser's Share or Print to make a PDF. Fold and keep in a zip bag. Study aid only.</p>
      <div class="print-grid">
      <div class="card"><h2>Legal to shoot? All must be YES</h2><ol>${F.legalFlow.map((s) => `<li>${esc(s.q)}</li>`).join('')}</ol><p><strong>Any NO = no shot.</strong></p></div>
      <div class="card"><h2>Legal light today (${today.toLocaleDateString('en-CA', { timeZone: TZ })})</h2><div class="tbl"><table><thead><tr><th>Base</th><th>Rise / set</th><th>Big game</th><th>Ducks</th></tr></thead><tbody>${light}</tbody></table></div><p class="muted">Verify with official tables.</p></div>
      ${F.cards.map((c) => `<div class="card step">${c.html}</div>`).join('')}
      ${F.checklists.map((l) => `<div class="card"><h2>${esc(l.title)}</h2><ul>${l.items.map((t) => `<li>&#9744; ${t}</li>`).join('')}</ul></div>`).join('')}
      </div>`;
  }

  function credits() {
    setTitle('Credits'); tab('more');
    const P = HM.photos || [];
    const M = [
      ['MapLibre GL JS', 'The map engine. BSD (Berkeley Software Distribution) 3 clause licence.', 'https://maplibre.org/'],
      ['maplibre-contour', 'Contour lines drawn from terrain tiles. BSD 3 clause licence.', 'https://github.com/onthegomap/maplibre-contour'],
      ['OpenStreetMap contributors', 'Roads, trails, water and place names. Open Database Licence.', 'https://www.openstreetmap.org/copyright'],
      ['OpenFreeMap', 'Free vector map tiles and map fonts, built on OpenMapTiles.', 'https://openfreemap.org/'],
      ['Esri World Imagery', 'Satellite imagery: Esri, Maxar, Earthstar Geographics and the GIS User Community.', 'https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9'],
      ['Terrain Tiles', 'Elevation for relief shading, 3D, contours and the elevation readout: Mapzen, Amazon Web Services Open Data.', 'https://registry.opendata.aws/terrain-tiles/'],
      ['Open-Meteo', 'Weather and wind forecasts. Creative Commons Attribution 4.0 licence.', 'https://open-meteo.com/'],
      ['BC Data Catalogue', 'Hunting layers: Management Units, closures, parks, land status and habitat. Open Government Licence BC.', 'https://catalogue.data.gov.bc.ca/'],
      ['BC Geographical Names and BC Address Geocoder', 'Place search. Open Government Licence BC.', 'https://www2.gov.bc.ca/gov/content/data/geographic-data-services'],
      ['Nominatim', 'Place search when the BC services find nothing, using OpenStreetMap data.', 'https://nominatim.org/'],
      ['PMTiles', 'Reads large map layers. BSD 3 clause licence.', 'https://github.com/protomaps/PMTiles'],
    ];
    view.innerHTML = `<div class="card"><h2>Map data and software</h2>${M.map(([n, t, u]) => `<p><strong><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a></strong>: ${esc(t)}</p>`).join('')}</div>
      <h2>Photos</h2><p class="muted">Every photo is public domain or Creative Commons, used with credit. Tap source to see the original and its licence.</p>
      <div class="card">${P.length ? P.map((p) => `<p><strong>${esc(p.species || p.id)}</strong>: ${esc(p.caption || '')}<br><span class="muted">Photo: ${esc(p.author || 'unknown')}, ${esc(p.licence || '')}${p.source ? `, <a href="${esc(p.source)}" target="_blank" rel="noopener">source</a>` : ''}</span></p>`).join('') : '<p>No photos yet.</p>'}</div>`;
  }

  // ---------- Hunt Map (map/core.js, loaded only when the map opens) ----------
  let mapMod = null;
  function mapView(param) {
    document.body.classList.add('map-open'); tab('map');
    (mapMod ? Promise.resolve(mapMod) : import('./map/core.js').then((m) => (mapMod = m)))
      .then((m) => { if (/^#\/map/.test(location.hash)) return m.open(param); })
      .catch((err) => {
        console.warn('Hunt Map could not load', err);
        document.body.classList.remove('map-open'); setTitle('Map');
        view.innerHTML = '<div class="card"><h2>The map could not open</h2><p>The map works in the installed app. It needs an internet connection the first time it opens.</p><a class="btn" href="#/">Home</a></div>';
      });
  }
  function leaveMap() {
    if (!document.body.classList.contains('map-open')) return;
    document.body.classList.remove('map-open');
    if (mapMod) mapMod.close();
  }

  function notFound() {
    const lesson = /^#\/s\//.test(location.hash);
    view.innerHTML = lesson
      ? '<div class="card"><h2>Coming soon</h2><p>This lesson is still being written. It will appear here in a later update.</p><p><a class="btn" href="javascript:history.back()">Go back</a> <a class="btn" href="#/learn">All lessons</a></p></div>'
      : '<div class="card"><h2>Not found</h2><a href="#/">Home</a></div>';
  }

  // ---------- Ask the mentor: copy what is on screen, open the mentor in a new tab ----------
  const askBtn = document.createElement('a');
  askBtn.className = 'hm-ask'; askBtn.href = MENTOR_URL; askBtn.target = '_blank'; askBtn.rel = 'noopener';
  askBtn.setAttribute('aria-label', 'Ask the mentor'); askBtn.title = 'Ask the mentor'; askBtn.hidden = true;
  askBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4Z"/><path d="M9 10h.01M12 10h.01M15 10h.01" stroke-linecap="round" stroke-width="2.6"/></svg>';
  document.body.appendChild(askBtn);
  const toastEl = document.createElement('div'); toastEl.className = 'hm-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl);
  let toastT;
  const toast = (msg) => { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3500); };
  function readingText() {
    const clean = (t) => String(t || '').replace(/\n{3,}/g, '\n\n').trim();
    if (document.body.classList.contains('map-open')) {
      const sh = document.querySelector('.hmm-sheet:not([hidden])');
      const t = sh && sh.querySelector('.hmm-sheet-h h2'), b = sh && sh.querySelector('.hmm-sheet-b');
      if (b && b.innerText.trim()) return `Hunt Mentor map: ${clean(t && t.textContent) || 'Hunt Map'}\n${clean(b.innerText)}`;
      const m = window.HuntMap && window.HuntMap.map, c = m && m.getCenter && m.getCenter();
      return `Hunt Mentor map: Hunt Map${c ? `, centre ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}` : ''}`;
    }
    const st = $('article.step', view);
    return `Hunt Mentor screen: ${$('#top-title').textContent}\n${clean(st ? st.innerText : view.innerText)}`;
  }
  function copyText(text) {
    const legacy = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove(); return ok; };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, legacy);
    return Promise.resolve(legacy());
  }
  // The link opens the mentor itself; this only copies first. Also used by the map's Insights button.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('.hm-ask, [data-ask-mentor]'); if (!a) return;
    copyText(readingText().slice(0, 8000)).then((ok) => toast(ok ? "Copied what you're reading. Tap Paste in the mentor." : 'Opening the mentor. Copy did not work, so type your question there.'));
  });

  // ---------- in app trail: depth per history entry, the place at each depth (session only) ----------
  let navDepth = 0, routed = false, curPage = '';
  let trail = ssGet('hm.trail') || [];
  function syncDepth() {
    const st = history.state;
    const was = navDepth;
    if (st && typeof st.d === 'number') navDepth = st.d;
    else { navDepth = routed ? navDepth + 1 : 0; history.replaceState(Object.assign({}, st, { d: navDepth }), '', location.href); trail.length = navDepth; }
    return navDepth < was;
  }
  function setTrail(h) { trail[navDepth] = h; ssSet('hm.trail', trail.slice(0, 40)); }
  const placeBefore = () => (navDepth > 0 ? trail[navDepth - 1] || '' : '');
  function measureChrome() {
    const r = document.documentElement.style, top = $('.top'), tabs = $('#tabs');
    if (top && top.offsetHeight) r.setProperty('--top-h', top.offsetHeight + 'px');
    if (tabs && tabs.offsetHeight) r.setProperty('--tabs-h', tabs.offsetHeight + 'px');
  }
  window.addEventListener('resize', measureChrome);
  // "Back to lesson" chip on the map when you came to the map from a lesson
  const backChip = document.createElement('button');
  backChip.type = 'button'; backChip.className = 'hm-backchip'; backChip.hidden = true;
  document.body.appendChild(backChip);
  backChip.onclick = () => { const p = placeBefore(); if (/^#\/s\//.test(p)) history.back(); else { const l = S.last && byId[S.last.id]; if (l) location.hash = `#/s/${l.id}`; } };
  // shared with the map: the lesson to go back to, and a way to get there
  window.HMNav = {
    lastLesson() { const l = S.last && byId[S.last.id]; if (!l) return null; const n = stepsOf(l).length, i = openAt(l); return { id: l.id, title: l.title, label: lessonLabel(l), screen: i + 1, screens: n, href: `#/s/${l.id}/${i}` }; },
    cameFromLesson: () => /^#\/s\//.test(placeBefore()),
    backToLesson: () => backChip.onclick(),
  };

  // ---------- Plan a hunt (plan.js): what it needs from the app ----------
  function planCtx() {
    return {
      get S() { return S; }, save, setTitle, tab, sunEvent, hhmm, addMin, certBadge, toast, copyText,
      hasSession: (id) => !!byId[id], lessonTitle: (id) => (byId[id] ? byId[id].title : id), link: linkPlaces,
      study: Study, refresh: () => { if (!location.hash || location.hash === '#/' || location.hash === '#') home(); },
    };
  }

  // ---------- router ----------
  function route() {
    const goingBack = syncDepth();
    routed = true;
    if (curPage === 'learn') { const st = ssGet(SS_LEARN) || {}; st.y = window.scrollY; ssSet(SS_LEARN, st); }
    document.body.classList.remove('field');
    $('#sheet').hidden = true;
    const h = location.hash.replace(/^#\/?/, '').split('/');
    const [a, b, c] = h;
    curPage = a || 'home';
    setTrail(location.hash || '#/');
    $('#btn-back').classList.toggle('off', !a && navDepth === 0);
    document.body.classList.toggle('in-lesson', a === 's');
    askBtn.hidden = a !== 'map';
    const fromLesson = a === 'map' && /^#\/s\//.test(placeBefore());
    backChip.hidden = !fromLesson;
    if (fromLesson) { const m = placeBefore().match(/^#\/s\/([^/]+)/), l = m && byId[m[1]]; backChip.innerHTML = `<span aria-hidden="true">&#8592;</span> Back to lesson${l ? `<small>${esc(l.title)}</small>` : ''}`; }
    if (a === 'map') return mapView(h.slice(1).join('/'));
    leaveMap();
    if (a !== 's') L = null;
    if (!a) home();
    else if (a === 'learn') learn();
    else if (a === 's') session(b, c);
    else if (a === 'field') field(h.slice(1).join('/'));
    else if (a === 'lists') lists(b, c);
    else if (a === 'plan' && window.HMPlan) window.HMPlan.route(view, h.slice(1), planCtx());
    else if (a === 'more') more();
    else if (a === 'glossary') glossary();
    else if (a === 'search') search();
    else if (a === 'review') review();
    else if (a === 'sources') sources();
    else if (a === 'install') install();
    else if (a === 'cards') cards(b);
    else if (a === 'daily') daily();
    else if (a === 'print') printCards();
    else if (a === 'credits') credits();
    else if (a === 'journal') journal(b === 'new' ? -1 : b != null ? +b : undefined);
    else if (window.HMRoutes && window.HMRoutes[a]) window.HMRoutes[a](h.slice(1)); // add on views (ask.js)
    else notFound();
    if (a === 'learn' && goingBack) { const y = (ssGet(SS_LEARN) || {}).y; if (y) requestAnimationFrame(() => window.scrollTo(0, y)); }
    else if (a !== 's') window.scrollTo(0, 0);
    measureChrome();
  }
  window.addEventListener('hashchange', route);
  route();
})();
