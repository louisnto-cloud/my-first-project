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
  const blank = { done: {}, pos: {}, quiz: {}, checks: {}, journal: [], settings: { theme: '', firstHunt: '' } };
  let S;
  try { S = Object.assign({}, blank, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = JSON.parse(JSON.stringify(blank)); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } };
  const applyTheme = () => { if (S.settings.theme) document.documentElement.dataset.theme = S.settings.theme; else delete document.documentElement.dataset.theme; };
  applyTheme();

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sessions = HM.sessions;
  const byId = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const phases = [...new Set(sessions.map((s) => s.phase))];
  const phaseNames = { 1: 'Fast Start', 2: 'Foundations', 3: 'Reading the Land', 4: 'Species', 5: 'The Shot and After', 6: 'Mastery', 7: 'Rule Book' };
  const setTitle = (t) => { $('#top-title').textContent = t; };
  const tab = (name) => document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === name));
  const firstHunt = () => S.settings.firstHunt || HM.field.defaults.firstHunt;
  const daysTo = (iso) => Math.ceil((new Date(iso + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5);

  function sheet(html) {
    $('#sheet-body').innerHTML = html;
    $('#sheet').hidden = false;
  }
  $('#sheet-close').onclick = () => { $('#sheet').hidden = true; };
  $('#sheet').onclick = (e) => { if (e.target.id === 'sheet') $('#sheet').hidden = true; };
  $('#btn-back').onclick = () => history.back();
  $('#btn-search').onclick = () => { location.hash = '#/search'; };

  // glossary taps, checklist ticks (delegated)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.term');
    if (t) {
      const k = t.dataset.term;
      const def = HM.glossary[k] || Object.entries(HM.glossary).find(([g]) => g.toLowerCase() === k.toLowerCase())?.[1];
      sheet(`<h2>${esc(k)}</h2><p>${def || 'Not in the glossary yet.'}</p>`);
    }
  });
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
  window.HuntMentor = { sunEvent, hhmm, TZ }; // shared with the map (Insights)

  // ---------- views ----------
  function progress(phase) {
    const list = sessions.filter((s) => phase == null || s.phase === phase);
    const done = list.filter((s) => S.done[s.id]).length;
    return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
  }
  const nextSession = () => sessions.find((s) => !S.done[s.id]);

  function home() {
    setTitle('Hunt Mentor'); tab('home');
    const d = daysTo(firstHunt());
    const nx = nextSession();
    const p = progress();
    const misses = Object.entries(S.quiz).filter(([, v]) => !v).length;
    view.innerHTML = `
      <div class="card row">
        <div class="grow"><div class="muted">First hunt</div><div class="big">${d > 0 ? d : 0} days</div>
        <div class="muted">${esc(firstHunt())}${S.settings.firstHunt ? '' : ' (placeholder date, set yours in More)'}</div></div>
        <a class="btn primary" href="#/field">Field Mode</a>
      </div>
      ${nx ? `<a class="card" style="display:block;text-decoration:none;color:inherit" href="#/s/${nx.id}">
        <div class="muted">Next session</div><h2>${nx.phase}.${nx.num} ${esc(nx.title)}</h2><div class="muted">${nx.minutes} min</div></a>` : '<div class="card"><h2>All sessions done</h2></div>'}
      <div class="card"><h2>Progress</h2>
        <div class="muted">${p.done} of ${p.total} sessions</div><div class="bar"><i style="width:${p.pct}%"></i></div>
        ${phases.map((ph) => { const q = progress(ph); return `<div style="margin-top:10px"><div class="row"><span class="grow">${ph}. ${phaseNames[ph]}</span><span class="muted">${q.done}/${q.total}</span></div><div class="bar"><i style="width:${q.pct}%"></i></div></div>`; }).join('')}
      </div>
      ${misses ? `<a class="btn block" href="#/review">Review ${misses} missed quiz question${misses > 1 ? 's' : ''}</a>` : ''}
      <p class="muted">Regulation data last checked: ${esc(HM.regs.lastChecked)}. Content built ${esc(HM.built)}.</p>`;
  }

  function learn() {
    setTitle('Learn'); tab('learn');
    view.innerHTML = phases.map((ph) => `<div class="card"><h2>Phase ${ph}: ${phaseNames[ph]}</h2><div class="list">
      ${sessions.filter((s) => s.phase === ph).map((s) => `<a class="item ${S.done[s.id] ? 'done' : ''}" href="#/s/${s.id}">
        <span class="num">${S.done[s.id] ? '&#10003;' : s.num}</span><span class="grow">${esc(s.title)}</span><span class="pill">${s.minutes} min</span></a>`).join('')}
    </div></div>`).join('');
  }

  function session(id, stepArg) {
    const s = byId[id]; if (!s) return notFound();
    tab('learn');
    const steps = s.steps.slice();
    if (s.quiz.length) steps.push({ title: 'Quiz', quiz: true });
    let i = stepArg != null ? +stepArg : (S.pos[id] || 0);
    i = Math.max(0, Math.min(i, steps.length - 1));
    S.pos[id] = i; save();
    const st = steps[i];
    setTitle(`${s.phase}.${s.num} ${s.title}`);
    const last = i === steps.length - 1;
    view.innerHTML = `
      <div class="dots">${steps.map((_, n) => `<i class="${n <= i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="muted">${s.minutes} min. Screen ${i + 1} of ${steps.length}</div>
      <article class="step"><h2>${esc(st.title)}</h2>${st.quiz ? quizHtml(s) : st.html}</article>
      <div class="btn-row">
        ${i > 0 ? `<a class="btn" href="#/s/${id}/${i - 1}">Back</a>` : '<a class="btn" href="#/learn">List</a>'}
        ${last ? `<button class="btn primary" id="mark">${S.done[id] ? 'Done &#10003;' : 'Mark done'}</button>` : `<a class="btn primary" href="#/s/${id}/${i + 1}">Next</a>`}
      </div>`;
    hydrateChecks(view);
    renderRegs(view);
    if (st.quiz) bindQuiz(s);
    const mk = $('#mark'); if (mk) mk.onclick = () => { S.done[id] = true; save(); const nx = nextSession(); location.hash = nx ? `#/s/${nx.id}` : '#/'; };
    window.scrollTo(0, 0);
  }

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
      hydrateChecks(view);
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
  function lists(id) {
    setTitle('Checklists'); tab('lists');
    const L = HM.field.checklists;
    if (!id) {
      view.innerHTML = `<div class="list card">${L.map((l) => {
        const n = l.items.filter((_, k) => S.checks[`${l.id}:${k}`]).length;
        return `<a class="item" href="#/lists/${l.id}"><span class="grow">${esc(l.title)}</span><span class="pill">${n}/${l.items.length}</span></a>`;
      }).join('')}</div>`;
      return;
    }
    const l = L.find((x) => x.id === id); if (!l) return notFound();
    setTitle(l.title);
    view.innerHTML = `<div class="card"><div class="checklist">${l.items.map((t, k) =>
      `<label class="check"><input type="checkbox" data-key="${l.id}:${k}"><span>${t}</span></label>`).join('')}</div>
      <div class="btn-row"><button class="btn" id="reset">Untick all</button></div></div>`;
    hydrateChecks(view);
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
          S = Object.assign({}, blank, o); save(); applyTheme();
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
    const draw = (q) => { $('#gl').innerHTML = terms.filter((t) => !q || (t + HM.glossary[t]).toLowerCase().includes(q)).map((t) => `<p><strong>${esc(t)}</strong>: ${HM.glossary[t]}</p>`).join('') || '<p>No match.</p>'; };
    $('#gq').oninput = (e) => draw(e.target.value.toLowerCase()); draw('');
  }

  function search() {
    setTitle('Search'); tab('');
    view.innerHTML = `<input type="search" id="q" placeholder="Search sessions, glossary, rules" autofocus><div id="res" style="margin-top:12px"></div>`;
    const run = (q) => {
      q = q.trim().toLowerCase(); if (q.length < 2) { $('#res').innerHTML = ''; return; }
      const ses = sessions.filter((s) => s.text.includes(q) || s.title.toLowerCase().includes(q));
      const gl = Object.keys(HM.glossary).filter((t) => (t + HM.glossary[t]).toLowerCase().includes(q));
      const rg = HM.regs.items.filter((r) => (r.label + ' ' + (r.value || '') + ' ' + (r.note || '')).toLowerCase().includes(q));
      $('#res').innerHTML = `
        ${ses.length ? `<div class="card list"><h2>Sessions</h2>${ses.map((s) => `<a class="item" href="#/s/${s.id}"><span class="num">${s.num}</span><span class="grow">${esc(s.title)}</span></a>`).join('')}</div>` : ''}
        ${gl.length ? `<div class="card"><h2>Glossary</h2>${gl.map((t) => `<p><strong>${esc(t)}</strong>: ${HM.glossary[t]}</p>`).join('')}</div>` : ''}
        ${rg.length ? `<div class="card"><h2>Rules data</h2>${rg.map((r) => `<p><strong>${esc(r.label)}</strong>: ${r.value ? esc(r.value) : 'VERIFY'} ${certBadge(r.certainty)}</p>`).join('')}</div>` : ''}
        ${!ses.length && !gl.length && !rg.length ? '<p>No results.</p>' : ''}`;
    };
    $('#q').oninput = (e) => run(e.target.value);
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
    fc.onclick = () => { fc.querySelector('.fc-back').hidden = false; $('#fc-btns').hidden = false; };
    $('#fc-yes').onclick = () => { S.cards[card.id] = Math.min(2, (S.cards[card.id] || 0) + 1); save(); cards(deckArg); window.scrollTo(0, 0); };
    $('#fc-no').onclick = () => { S.cards[card.id] = 0; save(); cards(deckArg); window.scrollTo(0, 0); };
  }

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

  function notFound() { view.innerHTML = '<div class="card"><h2>Not found</h2><a href="#/">Home</a></div>'; }

  // ---------- router ----------
  function route() {
    document.body.classList.remove('field');
    $('#sheet').hidden = true;
    const h = location.hash.replace(/^#\/?/, '').split('/');
    const [a, b, c] = h;
    if (a === 'map') return mapView(h.slice(1).join('/'));
    leaveMap();
    if (!a) home();
    else if (a === 'learn') learn();
    else if (a === 's') session(b, c);
    else if (a === 'field') field(h.slice(1).join('/'));
    else if (a === 'lists') lists(b);
    else if (a === 'more') more();
    else if (a === 'glossary') glossary();
    else if (a === 'search') search();
    else if (a === 'review') review();
    else if (a === 'sources') sources();
    else if (a === 'install') install();
    else if (a === 'cards') cards(b);
    else if (a === 'print') printCards();
    else if (a === 'credits') credits();
    else if (a === 'journal') journal(b === 'new' ? -1 : b != null ? +b : undefined);
    else notFound();
  }
  window.addEventListener('hashchange', route);
  route();
})();
