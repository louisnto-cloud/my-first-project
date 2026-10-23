/* Shoot or don't shoot: decision trainer (add on), route #/train/decide (train.js hands it the "decide" sub route).
   Scenarios in data/addons/decide/scenarios.json, every rule copied from a lesson with certainty, source and the lesson
   screen to reopen. Pictures are the lesson's own diagrams (found inside the precached lesson file by their aria label)
   or credited lesson photos. 10 round sessions; Harrison deer scenarios come first; a missed scenario comes back next
   session (simple boxes: right moves it up a box and spaces it out, wrong puts it back in box 0).
   Results stay in this phone's localStorage under hm.train.decide (included in the app's backup). */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'hm.train.decide';
  const ROUNDS = 10;
  const MAX_MISSED = 6; // missed ones that return in a mixed session
  const GAP = [1, 1, 2, 4, 8]; // sessions until a right answer comes back, by box
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const view = () => $('#view');
  const setTitle = (t) => { const h = $('#top-title'); if (h) h.textContent = t; };
  const dayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  // the app shows this banner at the top; repeat it only when that bar is hidden (so every rule screen has it once)
  const law = () => { const b = document.getElementById('banner'); return b && b.offsetParent !== null && /Study aid only/.test(b.textContent) ? '' : '<p class="hm-law">Study aid only. The official regulations are the law.</p>'; };
  // prose: escaped, and codes like 2-18 kept on one line (non breaking hyphen)
  const tx = (s) => esc(s).replace(/(\d)-(\d)/g, '$1&#8209;$2');

  // ---------- storage ----------
  const blank = () => ({ v: 1, n: 0, s: {}, hist: [] });
  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && o.v === 1 ? Object.assign(blank(), o) : blank(); } catch (e) { return blank(); }
  }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* storage blocked: play still works */ } }

  // ---------- data ----------
  let D = null, DP = null;
  const data = () => (D ? Promise.resolve(D) : DP || (DP = fetch('data/addons/decide/scenarios.json')
    .then((r) => { if (!r.ok) throw new Error('scenarios ' + r.status); return r.json(); })
    .then((j) => { j.byId = {}; j.scenarios.forEach((s) => { j.byId[s.id] = s; }); return (D = j); })
    .catch((e) => { DP = null; throw e; })));

  const cert = (c) => (c === 'Tip' ? '<span class="dc-c dc-tip">Tip</span>' : `<span class="dc-c ${c >= 95 ? 'dc-hi' : c >= 80 ? 'dc-mid' : 'dc-lo'}">${c}%</span>`);
  function srcHtml(sc) {
    const s = D.sources[sc.s]; if (!s) return '';
    const name = esc(s.name) + (sc.p ? ', ' + esc(sc.p) : '');
    if (!s.url) return name;
    const ext = /^https?:/.test(s.url);
    return `<a href="${esc(s.url)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${name}</a>`;
  }
  // lesson link: the screen whose title matches, else the lesson start
  function lessonLink(id, screen) {
    const S = (window.HM && window.HM.sessions || []).find((x) => x.id === id);
    if (!S) return { href: `#/s/${id}`, title: 'the lesson' };
    let i = S.steps.findIndex((st) => st.title === screen);
    if (i < 0 && screen) { const base = screen.replace(/ \(\d+ of \d+\)$/, ''); i = S.steps.findIndex((st) => st.title.indexOf(base) === 0); }
    if (i < 0) i = 0;
    return { href: `#/s/${id}/${i}`, title: S.title, screen: i > 0 ? S.steps[i].title : '' };
  }

  // ---------- pictures ----------
  const picCache = {};
  function picHtml(key) {
    const p = D.pics[key]; if (!p) return '';
    if (p.p) {
      return `<figure class="dc-pic"><img src="photos/${esc(p.p)}.jpg" alt="${esc(p.cap)}" width="640" height="427"><figcaption class="dc-credit">Photo: ${esc(p.author || 'unknown')}, ${esc(p.licence)}${p.src ? `, <a href="${esc(p.src)}" target="_blank" rel="noopener">source</a>` : ''}. The scene in the question is described in words; the photo shows the animal.</figcaption></figure>`;
    }
    const id = 'dcp' + rnd(1e9);
    setTimeout(() => fillDiagram(id, key), 0);
    return `<figure class="dc-pic dc-diag" id="${id}" role="img" aria-label="${esc(p.alt || '')}"><p class="muted">Loading the lesson drawing...</p></figure>`;
  }
  function findDiagram(key) {
    if (picCache[key]) return Promise.resolve(picCache[key]);
    const p = D.pics[key], C = window.HMContent;
    if (!C) return Promise.reject(new Error('no content'));
    return C.loadLesson(p.l).then((s) => {
      const tpl = document.createElement('template');
      tpl.innerHTML = s.steps.map((st) => st.html || '').join('');
      const svg = [...tpl.content.querySelectorAll('svg[aria-label]')].find((el) => (el.getAttribute('aria-label') || '').indexOf(p.a) === 0);
      if (!svg) throw new Error('diagram not found');
      return (picCache[key] = svg.outerHTML);
    });
  }
  function fillDiagram(id, key) {
    const el = document.getElementById(id); if (!el) return;
    const p = D.pics[key], L = lessonLink(p.l);
    findDiagram(key).then((svg) => {
      const e2 = document.getElementById(id); if (!e2) return;
      e2.removeAttribute('role'); e2.removeAttribute('aria-label');
      e2.innerHTML = svg + `<figcaption class="dc-credit">Drawing from the lesson: ${esc(L.title)}</figcaption>`;
    }, () => {
      const e2 = document.getElementById(id); if (!e2) return;
      e2.innerHTML = `<p class="muted">${esc(p.alt || '')}</p><p class="muted">The drawing is not saved on this phone yet. <a href="${esc(L.href)}">Open the lesson</a>.</p>`;
    });
  }

  // ---------- review boxes ----------
  function record(st, sc, ok) {
    const e = st.s[sc.id] || (st.s[sc.id] = { b: 0, d: 0, r: 0, w: 0 });
    if (ok) { e.r++; e.b = Math.min(e.b + 1, GAP.length - 1); e.d = st.n + GAP[e.b]; } else { e.w++; e.b = 0; e.d = st.n + 1; }
    e.last = st.n; e.ok = ok ? 1 : 0;
  }
  const missedIds = (st) => Object.keys(st.s).filter((id) => st.s[id].ok === 0 && D.byId[id]);
  function pickRound(st, mode) {
    let pool = D.scenarios;
    if (mode === 'harrison') pool = pool.filter((s) => s.h);
    else if (mode && mode.indexOf('topic:') === 0) { const t = mode.slice(6); pool = pool.filter((s) => s.t === t); }
    const seen = (s) => !!st.s[s.id];
    const out = [], take = (arr, n) => { for (const s of arr) { if (out.length >= ROUNDS || n <= 0) break; if (!out.includes(s)) { out.push(s); n--; } } };
    const missed = pool.filter((s) => st.s[s.id] && st.s[s.id].ok === 0).sort((a, b) => st.s[a.id].d - st.s[b.id].d);
    if (mode === 'missed') { take(missed, ROUNDS); return shuffle(out); }
    take(missed, MAX_MISSED);
    take(pool.filter((s) => seen(s) && st.s[s.id].ok && st.s[s.id].d <= st.n).sort((a, b) => st.s[a.id].d - st.s[b.id].d), 2);
    // new ones: Harrison deer first, then the rest in a random order
    const fresh = pool.filter((s) => !seen(s));
    take(fresh.filter((s) => s.h).concat(shuffle(fresh.filter((s) => !s.h))), ROUNDS);
    take(pool.filter(seen).sort((a, b) => (st.s[a.id].d - st.s[b.id].d) || (st.s[a.id].last - st.s[b.id].last)), ROUNDS);
    return shuffle(out);
  }

  // ---------- screens ----------
  let cur = null; // the session in play: { mode, list, i, res: [{id, ok, pick}], order: [[choice idx]] }
  const MODE_NAME = (m) => (m === 'harrison' ? 'Harrison deer' : m === 'missed' ? 'Missed ones' : m && m.indexOf('topic:') === 0 ? D.topics[m.slice(6)] : 'Mixed');

  function stats() {
    const st = load(), by = {};
    if (D) Object.keys(D.topics).forEach((t) => { by[t] = { name: D.topics[t], n: 0, seen: 0, r: 0, w: 0 }; });
    if (D) D.scenarios.forEach((s) => { const b = by[s.t]; b.n++; const e = st.s[s.id]; if (e) { b.seen++; b.r += e.r; b.w += e.w; } });
    return { sessions: st.hist.length, missed: D ? missedIds(st).length : 0, byTopic: by, hist: st.hist.slice() };
  }

  function startScreen() {
    setTitle('Shoot or don\'t shoot');
    cur = null;
    const st = load(), S = stats();
    const nH = D.scenarios.filter((s) => s.h).length, nM = S.missed;
    const hist = st.hist.slice(-8).reverse();
    const topics = Object.entries(S.byTopic).map(([t, b]) => {
      const tot = b.r + b.w, pct = tot ? Math.round((100 * b.r) / tot) : null;
      return `<button class="dc-topic" data-topic="${esc(t)}"><span><b>${esc(b.name)}</b><small>${b.n} scenarios, ${b.seen} seen</small></span><span class="dc-pct">${pct == null ? 'new' : pct + '%'}</span></button>`;
    }).join('');
    view().innerHTML = `<div class="dc">${law()}
      <div class="card"><h2>Shoot or don't shoot</h2>
        <ul class="dc-intro"><li>Read the situation, look at the picture, make the call.</li>
        <li>Each answer shows the rule, how sure the app is, the source and the lesson to reopen.</li>
        <li>Harrison deer scenarios come first. Missed ones come back next session.</li></ul>
        <button class="btn primary block" id="dc-go">Start 10 rounds</button>
        <div class="dc-row"><button class="btn" id="dc-h">Harrison deer only (${nH})</button>
        <button class="btn" id="dc-m"${nM ? '' : ' disabled'}>Review missed (${nM})</button></div></div>
      <div class="card"><h2>By topic</h2><p class="muted">Tap a topic to practise only that. Percent is your right calls so far.</p><div class="dc-topics">${topics}</div></div>
      <div class="card"><h2>Your last sessions</h2>${hist.length ? `<table class="dc-hist"><thead><tr><th>Date</th><th>Set</th><th>Score</th></tr></thead><tbody>${hist.map((r) => `<tr><td>${esc(r.date)}</td><td>${esc(r.mode)}</td><td>${r.score} of ${r.n}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No sessions yet. Scores stay on this phone.</p>'}</div>
      <p class="muted">${D.scenarios.length} scenarios from the lessons, checked ${esc(D.checked)}.</p>
      <a class="btn block" href="#/train">All trainers</a></div>`;
    $('#dc-go').onclick = () => begin('mix');
    $('#dc-h').onclick = () => begin('harrison');
    $('#dc-m').onclick = () => begin('missed');
    view().querySelectorAll('.dc-topic').forEach((b) => { b.onclick = () => begin('topic:' + b.dataset.topic); });
  }

  function begin(mode) {
    const st = load(); st.n++; save(st);
    const list = pickRound(st, mode);
    if (!list.length) return startScreen();
    cur = { mode, list, i: 0, res: [], order: list.map((s) => shuffle(s.ch.map((_, k) => k))), was: list.map((s) => !!(st.s[s.id] && st.s[s.id].ok === 0)) };
    round();
  }

  const dots = () => `<div class="dc-dots" role="img" aria-label="Round ${cur.i + 1} of ${cur.list.length}, ${cur.res.filter((r) => r.ok).length} right so far">${cur.list.map((_, k) => `<i class="${k < cur.res.length ? (cur.res[k].ok ? 'ok' : 'bad') : k === cur.i ? 'now' : ''}"></i>`).join('')}</div>`;

  function round() {
    const sc = cur.list[cur.i], ord = cur.order[cur.i], done = cur.res[cur.i];
    setTitle('Shoot or don\'t shoot');
    view().innerHTML = `<div class="dc">${law()}${dots()}
      <p class="dc-meta"><span>Round ${cur.i + 1} of ${cur.list.length}</span><span class="dc-chip">${tx(D.topics[sc.t])}</span>${sc.h ? '<span class="dc-chip dc-h">Harrison</span>' : ''}${cur.was[cur.i] ? '<span class="dc-chip dc-rev">Missed last time</span>' : ''}</p>
      <p class="dc-q">${tx(sc.q)}</p>
      ${picHtml(sc.pic)}
      <div class="dc-ch">${ord.map((k) => `<button class="btn block dc-opt" data-k="${k}">${tx(sc.ch[k])}</button>`).join('')}</div>
      <div id="dc-out"></div>
      <button class="btn block dc-quit" id="dc-quit">End session</button></div>`;
    view().querySelectorAll('.dc-opt').forEach((b) => { b.onclick = () => answer(+b.dataset.k); });
    $('#dc-quit').onclick = () => (cur.res.length ? summary() : startScreen());
    if (done) showResult(done.pick, false);
    window.scrollTo(0, 0);
  }

  function answer(k) {
    const sc = cur.list[cur.i];
    if (cur.res[cur.i]) return;
    const ok = k === sc.a;
    cur.res[cur.i] = { id: sc.id, ok, pick: k };
    const st = load(); record(st, sc, ok); save(st);
    showResult(k, true);
  }

  function showResult(k, scroll) {
    const sc = cur.list[cur.i], ok = k === sc.a, L = lessonLink(sc.l, sc.lh);
    view().querySelectorAll('.dc-opt').forEach((b) => {
      const kk = +b.dataset.k; b.disabled = true;
      if (kk === sc.a) b.classList.add('dc-right'); else if (kk === k) b.classList.add('dc-wrong');
      if (kk === sc.a) b.insertAdjacentHTML('afterbegin', '<span class="dc-mk" aria-hidden="true">✓ </span>');
      else if (kk === k) b.insertAdjacentHTML('afterbegin', '<span class="dc-mk" aria-hidden="true">✗ </span>');
    });
    const last = cur.i + 1 >= cur.list.length;
    $('#dc-out').innerHTML = `<div class="card dc-res ${ok ? 'dc-good' : 'dc-badc'}" tabindex="-1">
      <h2>${ok ? '✓ Right call' : '✗ Not this time'}</h2>
      <p><b>The call:</b> ${tx(sc.ch[sc.a])}.</p>
      <p>${tx(sc.why)}</p>
      <div class="dc-rule"><b>${sc.c === 'Tip' ? 'Tip' : 'Rule'}:</b> ${tx(sc.rule)} ${cert(sc.c)}<span class="dc-from">${srcHtml(sc)}</span></div>
      <a class="btn block dc-lesson" href="${esc(L.href)}">Open the lesson: ${esc(L.title)}${L.screen ? `<small>${esc(L.screen)}</small>` : ''}</a>
      ${ok ? '' : '<p class="muted">This one comes back next session.</p>'}
      <p class="muted">Checked ${esc(D.checked)}.</p>
      <button class="btn primary block" id="dc-next">${last ? 'See my score' : 'Next round'}</button></div>`;
    $('#dc-next').onclick = () => { if (last) summary(); else { cur.i++; round(); } };
    if (scroll) { const r = $('.dc-res'); if (r && r.scrollIntoView) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function summary() {
    const res = cur.res.filter(Boolean), score = res.filter((r) => r.ok).length;
    const st = load();
    st.hist.push({ date: dayISO(), mode: MODE_NAME(cur.mode), score, n: res.length });
    if (st.hist.length > 100) st.hist = st.hist.slice(-100);
    save(st);
    const mode = cur.mode; cur = null;
    const miss = missedIds(st).length;
    view().innerHTML = `<div class="dc">${law()}<div class="card"><h2>Session done</h2>
      <p class="dc-big">${score} of ${res.length}</p>
      <ul class="dc-rounds">${res.map((r) => { const s = D.byId[r.id]; return `<li class="${r.ok ? 'ok' : 'bad'}">${r.ok ? '✓' : '✗'} ${tx(s.q.length > 90 ? s.q.slice(0, 88).replace(/\s+\S*$/, '') + '...' : s.q)}</li>`; }).join('')}</ul>
      ${score < res.length ? '<p>The ones you missed come back first next session.</p>' : '<p>Clean sweep. Right answers come back later, spaced out.</p>'}
      <div class="dc-row"><button class="btn primary" id="dc-again">Again</button><button class="btn" id="dc-rm"${miss ? '' : ' disabled'}>Review missed (${miss})</button></div>
      <a class="btn block dc-gap" href="#/train/decide" id="dc-home">Trainer start</a></div></div>`;
    $('#dc-again').onclick = () => begin(mode === 'missed' ? 'mix' : mode);
    $('#dc-rm').onclick = () => begin('missed');
    $('#dc-home').onclick = (e) => { e.preventDefault(); startScreen(); };
    window.scrollTo(0, 0);
  }

  // ---------- styles ----------
  function injectCss() {
    if (document.getElementById('dc-css')) return;
    const st = document.createElement('style'); st.id = 'dc-css';
    st.textContent = `
.dc { font-size: 16px; }
.dc .btn { min-height: 48px; }
.dc .btn[disabled] { opacity: .55; }
.dc-intro { padding-left: 20px; margin: 6px 0 12px; } .dc-intro li { margin: 4px 0; }
.dc-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; } .dc-row .btn { flex: 1 1 140px; padding: 0 8px; }
.dc-topics { display: grid; gap: 8px; }
.dc-topic { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; min-height: 52px; padding: 8px 12px; text-align: left; font: inherit; color: var(--ink); background: var(--card); border: 1px solid var(--line); border-radius: 12px; cursor: pointer; }
.dc-topic b { display: block; font-size: 16px; } .dc-topic small { display: block; font-size: 14px; color: var(--muted); }
.dc-pct { font-weight: 800; font-size: 16px; white-space: nowrap; }
.dc-hist { width: 100%; border-collapse: collapse; font-size: 15px; } .dc-hist td, .dc-hist th { text-align: left; padding: 6px 4px; border-bottom: 1px solid var(--line); }
.dc-dots { display: flex; gap: 4px; margin: 2px 0 8px; } .dc-dots i { flex: 1; height: 8px; border-radius: 4px; background: var(--line); }
.dc-dots i.ok { background: var(--ok); } .dc-dots i.bad { background: var(--bad); } .dc-dots i.now { background: var(--accent); }
.dc-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 14px; color: var(--muted); margin: 0 0 8px; }
.dc-chip { font-size: 14px; padding: 1px 8px; border-radius: 10px; border: 1px solid var(--line); color: var(--ink); }
.dc-chip.dc-h { border-color: var(--sage); } .dc-chip.dc-rev { border-color: var(--bad); }
.dc-pic { margin: 0 0 10px; } .dc-pic img, .dc-pic svg { display: block; width: 100%; height: auto; border-radius: 12px; }
.dc-pic img { aspect-ratio: 3 / 2; object-fit: cover; background: var(--line); }
.dc-credit { font-size: 14px; color: var(--muted); margin-top: 4px; } .dc-credit a { color: inherit; }
.dc-q { font-size: 17px; line-height: 1.45; margin: 4px 0 10px; font-weight: 600; }
.dc-ch { display: grid; gap: 8px; }
.dc-opt { justify-content: flex-start; text-align: left; height: auto; padding: 10px 14px; line-height: 1.35; white-space: normal; }
.dc-opt.dc-right { border: 2px solid var(--ok); } .dc-opt.dc-wrong { border: 2px solid var(--bad); }
.dc-opt[disabled] { opacity: 1; } .dc-opt[disabled]:not(.dc-right):not(.dc-wrong) { opacity: .6; }
#dc-out { scroll-margin-top: 72px; } .dc-res { margin-top: 12px; } .dc-res h2 { font-size: 19px; }
.dc-good { border-left: 6px solid var(--ok); } .dc-badc { border-left: 6px solid var(--bad); }
.dc-rule { font-size: 15px; margin: 8px 0 12px; } .dc-from { display: block; font-size: 14px; color: var(--muted); margin-top: 2px; } .dc-from a { color: inherit; }
.dc-lesson { flex-direction: column; align-items: flex-start; justify-content: center; text-align: left; height: auto; padding: 8px 14px; margin: 8px 0; white-space: normal; }
.dc-lesson small { display: block; font-size: 14px; font-weight: 400; color: var(--muted); }
.dc-c { font-size: 14px; font-weight: 700; padding: 0 6px; border-radius: 6px; margin-left: 3px; white-space: nowrap; }
.dc-hi { background: rgba(46,125,50,.16); color: #1f6b24; } .dc-mid { background: rgba(122,143,46,.18); color: #56691c; }
.dc-lo { background: rgba(198,138,0,.18); color: #8a5f00; } .dc-tip { background: rgba(120,120,120,.18); color: #555; }
:root[data-theme="dark"] .dc-c { color: #ddd; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]):not([data-theme="sun"]) .dc-c { color: #ddd; } }
.dc-big { font-size: 34px; font-weight: 800; margin: 4px 0 8px; }
.dc-rounds { padding-left: 4px; list-style: none; font-size: 15px; } .dc-rounds li { margin: 6px 0; } .dc-rounds li.ok { color: var(--ok); } .dc-rounds li.bad { color: var(--bad); }
.dc-quit, .dc-gap { margin-top: 14px; }
`;
    document.head.appendChild(st);
  }

  function route(args) {
    setTitle('Shoot or don\'t shoot');
    document.querySelectorAll('.tabs a').forEach((a) => a.classList.remove('on'));
    injectCss();
    const go = () => (cur ? round() : startScreen());
    if (D) return go();
    view().innerHTML = '<p class="muted">Loading...</p>';
    data().then(go, () => {
      view().innerHTML = `<div class="dc">${law()}<div class="card"><p>The scenarios are not saved on this phone yet. Connect to the internet once and open this page again. After that it works with no signal.</p></div><a class="btn block" href="#/train">All trainers</a></div>`;
    });
  }

  window.HMDecide = { route, stats, data, KEY, _pick: (mode) => pickRound(load(), mode), _find: (k) => data().then(() => findDiagram(k)), _link: lessonLink };
})();
