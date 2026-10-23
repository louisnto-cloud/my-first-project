/* Practice trainers (add on): #/train menu, #/train/shot, #/train/buck, #/train/range.
   10 round sessions, every answer explained from data/addons/train/facts.json (facts copied from the lessons, with
   certainty and source). Scores live in localStorage on this phone only. Lesson plates (vitals, antler definitions,
   distance units) are reused from the lesson files the app already precaches. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ROUNDS = 10;
  const KEY = 'hm-train-v1';
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const yd = (m) => Math.round(m * 1.0936);
  const store = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } };
  const keep = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* storage blocked */ } };
  function addSession(kind, rec) { const o = store(); const l = (o[kind] = o[kind] || []); l.push(rec); if (l.length > 300) o[kind] = l.slice(-300); keep(o); }
  const dayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const setTitle = (t) => { const h = $('#top-title'); if (h) h.textContent = t; };
  const tab = () => document.querySelectorAll('.tabs a').forEach((a) => a.classList.remove('on'));
  const view = () => $('#view');

  // ---------- facts and sources ----------
  let F = null, FP = null;
  const facts = () => (F ? Promise.resolve(F) : FP || (FP = fetch('data/addons/train/facts.json')
    .then((r) => { if (!r.ok) throw new Error('facts ' + r.status); return r.json(); })
    .then((j) => (F = j)).catch((e) => { FP = null; throw e; })));
  const cert = (c) => (c === 'Tip' ? '<span class="tr-c tr-tip">Tip</span>' : `<span class="tr-c ${c >= 95 ? 'tr-hi' : c >= 80 ? 'tr-mid' : 'tr-lo'}">${c}%</span>`);
  function srcLink(k, page) {
    const s = F && F.sources[k]; if (!s) return '';
    const ext = /^https?:/.test(s.url);
    return `<a href="${esc(s.url)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(s.name)}</a>${page ? ', ' + esc(page) : ''}`;
  }
  const factLi = (f) => `<li>${f.c === 'Tip' ? '<b>Tip:</b> ' : ''}${esc(f.t)} ${cert(f.c)}<span class="tr-from">${srcLink(f.s, f.p)}</span></li>`;
  const factList = (arr) => (arr && arr.length ? `<ul class="tr-facts">${arr.map(factLi).join('')}</ul>` : '');

  // ---------- lesson plates: the diagrams already inside the lesson files ----------
  const plateCache = {};
  function lessonSvg(lesson, prefix) {
    const k = lesson + '|' + prefix;
    if (plateCache[k]) return Promise.resolve(plateCache[k]);
    const C = window.HMContent;
    if (!C) return Promise.reject(new Error('no content'));
    return C.loadLesson(lesson).then((s) => {
      const html = s.steps.map((st) => st.html || '').join('');
      const re = /<svg\b[^>]*aria-label="([^"]*)"[\s\S]*?<\/svg>/g; let m;
      while ((m = re.exec(html))) if (m[1].indexOf(prefix) === 0) return (plateCache[k] = m[0]);
      throw new Error('plate not found');
    });
  }
  function plateBox(lesson, prefix, label) {
    const id = 'tp' + rnd(1e9);
    setTimeout(() => {
      const el = document.getElementById(id); if (!el) return;
      lessonSvg(lesson, prefix).then((svg) => { el.innerHTML = svg; }, () => {
        el.innerHTML = `<p class="muted">The lesson drawing is not saved on this phone yet. <a href="#/s/${esc(lesson)}">Open the lesson</a>.</p>`;
      });
    }, 0);
    return `<details class="tr-plate"><summary>${esc(label)}</summary><div id="${id}" class="tr-plate-in"><p class="muted">Loading...</p></div></details>`;
  }

  // ---------- shared screens ----------
  const histOf = (kind) => (store()[kind] || []);
  function historyHtml(kind, fmt) {
    const h = histOf(kind).slice(-8).reverse();
    if (!h.length) return '<p class="muted">No sessions yet. Scores stay on this phone.</p>';
    return `<table class="tr-hist"><thead><tr><th>Date</th><th>Score</th></tr></thead><tbody>${h.map((r) => `<tr><td>${esc(r.date)}</td><td>${fmt(r)}</td></tr>`).join('')}</tbody></table>`;
  }
  const dots = (i, res) => `<div class="tr-dots" role="img" aria-label="Round ${i + 1} of ${ROUNDS}, ${res.filter(Boolean).length} right so far">${Array.from({ length: ROUNDS }, (_, k) => `<i class="${k < res.length ? (res[k] ? 'ok' : 'bad') : k === i ? 'now' : ''}"></i>`).join('')}</div>`;
  const offlineMsg = '<div class="card"><p>The trainer facts are not saved on this phone yet. Connect to the internet once and open this page again. After that it works with no signal.</p></div>';
  function withFacts(fn) {
    return (args) => {
      setTitle('Practice'); tab(); injectCss();
      if (F) return fn(args);
      view().innerHTML = '<p class="muted">Loading...</p>';
      facts().then(() => fn(args), () => { view().innerHTML = offlineMsg; });
    };
  }

  // ---------- menu ----------
  function menu() {
    setTitle('Practice');
    const best = (k, f) => { const h = histOf(k); return h.length ? f(h[h.length - 1]) : 'not tried yet'; };
    view().innerHTML = `<div class="tr">
      <p class="muted">Four trainers. 10 rounds each. Every answer explained. Works with no signal.</p>
      ${window.HMDecide ? `<a class="card tr-menu" href="#/train/decide"><b>Shoot or don't shoot</b><span>Short field situations, Harrison deer first: legal light, season, land, roads, partner, angle, wounded animal, bears. Make the call, see the rule.</span><small>Last: ${(() => { try { const h = (JSON.parse(localStorage.getItem('hm.train.decide') || '{}').hist || []); const r = h[h.length - 1]; return r ? r.score + ' of ' + r.n : 'not tried yet'; } catch (e) { return 'not tried yet'; } })()}</small></a>` : ''}
      <a class="card tr-menu" href="#/train/shot"><b>Shot placement</b><span>Tap where you would aim on a deer, moose, elk or black bear. Some rounds are a no shot.</span><small>Last: ${best('shot', (r) => r.score + ' of ' + r.n)}</small></a>
      <a class="card tr-menu" href="#/train/buck"><b>Legal buck</b><span>Count the points on mule deer and white tailed deer antlers, then call it: legal or not in MU (Management Unit) 3-27.</span><small>Last: ${best('buck', (r) => r.score + ' of ' + r.n)}</small></a>
      <a class="card tr-menu" href="#/train/range"><b>Range guessing</b><span>Guess how far the deer stands. Within 10% scores. Your accuracy chart builds over time.</span><small>Last: ${best('range', (r) => r.within + ' of ' + r.n + ' within 10%')}</small></a>
      <p class="muted">Scores are kept in this phone's storage only.</p></div>`;
  }

  function startScreen(kind, title, introHtml, fmt, start, extra) {
    setTitle(title);
    view().innerHTML = `<div class="tr"><div class="card"><h2>${esc(title)}</h2>${introHtml}
      <button class="btn primary block" id="tr-go">Start 10 rounds</button></div>
      ${extra || ''}
      <div class="card"><h2>Your last sessions</h2>${historyHtml(kind, fmt)}</div>
      <a class="btn block" href="#/train">All trainers</a></div>`;
    $('#tr-go').onclick = start;
  }
  function summaryScreen(kind, title, html, again) {
    view().innerHTML = `<div class="tr"><div class="card"><h2>${esc(title)}: done</h2>${html}
      <div class="btn-row"><button class="btn primary" id="tr-again">Again</button><a class="btn" href="#/train">All trainers</a></div></div></div>`;
    $('#tr-again').onclick = again;
    window.scrollTo(0, 0);
  }
  function svgPoint(svg, ev) {
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse()); return { x: p.x, y: p.y };
  }

  // =====================================================================
  // 1. SHOT PLACEMENT
  // Each animal is a set of ellipsoids in body space (cm: x forward, y up from the ground, z toward the near side).
  // A yaw angle turns it; each ellipsoid projects to an ellipse. Taps are tested against the projected lungs, heart,
  // near shoulder and body parts, front to back. Proportions follow the lesson plates (aim one third up the chest
  // on deer and moose, one third to one half on elk, halfway up on bear, heart low).
  // =====================================================================
  const E = (t, x, y, z, a, b, c, o) => Object.assign({ t, x, y, z, a, b, c }, o || {});
  const legs = (fx, hx, y, z, w, h) => [E('leg', fx, y, z, w, h, w), E('leg', fx - 4, y, -z, w, h, w), E('leg', hx, y + 2, z, w + 1, h + 2, w + 1), E('leg', hx + 4, y + 2, -z, w + 1, h + 2, w + 1)];
  const SPECIES = {
    deer: { col: '#a87b52', ink: '#5a3e26', plate: 'Deer, broadside',
      parts: [E('ham', -52, 70, 0, 26, 24, 18), E('ham', -72, 76, 0, 8, 16, 12, { col: '#f3ead8' }), E('ham', -79, 86, 0, 3, 8, 2, { col: '#f3ead8' }), E('gut', -12, 66, 0, 40, 23, 21), E('chest', 22, 70, 0, 34, 24, 19),
        E('neck', 50, 84, 0, 14, 13, 9), E('neck', 60, 98, 0, 11, 12, 8), E('neck', 72, 110, 0, 15, 8, 7),
        E('neck', 62, 122, 6, 4, 8, 2), E('neck', 62, 122, -6, 4, 8, 2)].concat(legs(30, -56, 26, 9, 5, 27)),
      lungs: E('lungs', 22, 70, 0, 25, 17, 15), heart: E('heart', 22, 56, 0, 7, 7, 6), shoulder: E('shoulder', 38, 74, 15, 12, 20, 4),
      antlers: [[[64, 116], [60, 132], [54, 146]], [[60, 132], [68, 146]]] },
    moose: { col: '#4a3626', ink: '#24180f', plate: 'Bull moose, broadside',
      parts: [E('ham', -70, 135, 0, 38, 40, 28), E('gut', -20, 130, 0, 60, 40, 32), E('chest', 35, 140, 0, 50, 45, 30), E('chest', 28, 180, 0, 32, 14, 16),
        E('neck', 84, 158, 0, 24, 22, 14), E('neck', 118, 150, 0, 30, 15, 11), E('neck', 104, 124, 0, 5, 12, 3),
        E('neck', 100, 170, 8, 5, 9, 2), E('neck', 100, 170, -8, 5, 9, 2)].concat(legs(42, -76, 50, 14, 8, 52)),
      lungs: E('lungs', 32, 136, 0, 36, 33, 26), heart: E('heart', 30, 108, 0, 10, 10, 9), shoulder: E('shoulder', 56, 145, 22, 18, 32, 5),
      antlers: [[[104, 174], [94, 186], [80, 196], [70, 204]], [[94, 186], [98, 204]], [[86, 190], [84, 206]]] },
    elk: { col: '#9a6a3c', ink: '#4a2f17', plate: 'Bull elk, broadside',
      parts: [E('ham', -58, 105, 0, 32, 32, 22), E('ham', -82, 110, 0, 9, 20, 15, { col: '#e3c999' }), E('gut', -15, 100, 0, 50, 32, 27), E('chest', 30, 108, 0, 42, 36, 24),
        E('neck', 64, 128, 0, 18, 20, 12), E('neck', 76, 146, 0, 14, 16, 10), E('neck', 92, 158, 0, 22, 11, 9),
        E('neck', 80, 170, 7, 5, 9, 2), E('neck', 80, 170, -7, 5, 9, 2)].concat(legs(36, -62, 38, 11, 7, 40)),
      lungs: E('lungs', 26, 106, 0, 31, 26, 20), heart: E('heart', 26, 82, 0, 9, 9, 8), shoulder: E('shoulder', 48, 112, 18, 16, 28, 5),
      antlers: [[[84, 168], [74, 200], [56, 226], [36, 238]], [[80, 180], [96, 192]], [[76, 196], [92, 214]], [[66, 214], [76, 234]], [[52, 228], [56, 246]]] },
    bear: { col: '#2b2622', ink: '#0d0b0a', plate: 'Black bear, broadside',
      parts: [E('ham', -40, 62, 0, 30, 32, 24), E('gut', -8, 58, 0, 40, 30, 26), E('chest', 24, 60, 0, 32, 32, 24),
        E('neck', 50, 66, 0, 14, 20, 14), E('neck', 66, 64, 0, 18, 15, 13), E('neck', 82, 58, 0, 9, 6, 6),
        E('neck', 62, 80, 8, 4, 5, 3), E('neck', 62, 80, -8, 4, 5, 3)].concat(legs(30, -45, 20, 12, 8, 22)),
      lungs: E('lungs', 12, 62, 0, 26, 23, 18), heart: E('heart', 18, 40, 0, 8, 8, 7), shoulder: E('shoulder', 36, 62, 18, 12, 24, 5),
      antlers: [] },
  };
  const SP_NAME = { deer: 'Mule deer', moose: 'Bull moose', elk: 'Bull elk', bear: 'Black bear' };
  const D2R = Math.PI / 180;
  function projE(e, th, m) {
    const c = Math.cos(th), s = Math.sin(th);
    return { t: e.t, col: e.col, cx: m * (e.x * c - e.z * s), cy: -e.y, rx: Math.sqrt((e.a * c) ** 2 + (e.c * s) ** 2), ry: e.b, d: e.x * s + e.z * c, rot: (e.rot || 0) * m };
  }
  const projP = (p, z, th, m) => [m * (p[0] * Math.cos(th) - z * Math.sin(th)), -p[1], p[0] * Math.sin(th) + z * Math.cos(th)];
  function inside(pe, u, v) {
    let dx = u - pe.cx, dy = v - pe.cy;
    if (pe.rot) { const r = -pe.rot * D2R, cr = Math.cos(r), sr = Math.sin(r); const x = dx * cr - dy * sr; dy = dx * sr + dy * cr; dx = x; }
    return (dx / pe.rx) ** 2 + (dy / pe.ry) ** 2 <= 1;
  }
  function pose(spKey, scen, th, m) {
    const sp = SPECIES[spKey];
    let parts = sp.parts;
    if (scen === 'legback') { // near front leg swung back over the heart
      parts = parts.map((e, i) => (e.t === 'leg' && i === sp.parts.findIndex((q) => q.t === 'leg') ? E('leg', sp.heart.x - (sp.heart.y - e.y - e.b * 0.3) * 0.325, e.y + e.b * 0.3, e.z + 2, e.a, e.b * 1.25, e.c, { rot: 18 }) : e));
    }
    return { sp, th, m, parts: parts.map((e) => projE(e, th, m)), lungs: projE(sp.lungs, th, m), heart: projE(sp.heart, th, m), shoulder: projE(sp.shoulder, th, m) };
  }
  function classify(P, u, v) {
    const hits = P.parts.filter((pe) => inside(pe, u, v)).sort((a, b) => b.d - a.d);
    if (!hits.length) return 'miss';
    const first = hits[0];
    const inL = inside(P.lungs, u, v), inH = inside(P.heart, u, v);
    const shIn = inside(P.shoulder, u, v);
    if (first.t === 'leg' || first.t === 'neck') return first.t;
    if (first.t === 'ham') return 'ham';
    if (inL || inH) {
      if (shIn && P.shoulder.d > P.lungs.d) return 'shoulder';
      return inH ? 'heart' : 'lungs';
    }
    if (shIn) return 'shoulder';
    if (first.t === 'gut') return v < P.lungs.cy - P.lungs.ry ? 'high' : 'gut';
    if (v < P.lungs.cy - P.lungs.ry) return 'high';
    if (v > P.heart.cy + P.heart.ry) return 'low';
    const fwd = P.m * Math.cos(P.th);
    return (u - P.lungs.cx) * fwd > 0 ? 'shoulder' : 'gut';
  }
  const ell = (pe, attrs) => `<ellipse cx="${pe.cx.toFixed(1)}" cy="${pe.cy.toFixed(1)}" rx="${pe.rx.toFixed(1)}" ry="${pe.ry.toFixed(1)}"${pe.rot ? ` transform="rotate(${pe.rot} ${pe.cx.toFixed(1)} ${pe.cy.toFixed(1)})"` : ''} ${attrs}/>`;
  function animalSvg(P, opt) {
    const sp = P.sp; const o = opt || {};
    const col = o.col || sp.col, ink = o.ink || sp.ink;
    // one clean silhouette: every part drawn thick in ink first, then the fills on top (legs keep a thin edge)
    const outline = P.parts.map((pe) => ell(pe, `fill="${ink}" stroke="${ink}" stroke-width="3.2"`)).join('');
    const items = P.parts.map((pe) => ({ d: pe.d, s: ell(pe, pe.t === 'leg' ? `fill="${pe.d < -3 ? ink : col}" stroke="${ink}" stroke-width="1"` : `fill="${pe.col && !o.col ? pe.col : col}"`) }));
    sp.antlers.forEach((line) => [5, -5].forEach((z) => {
      const pts = line.map((p) => projP(p, z, P.th, P.m));
      items.push({ d: pts[0][2] + 30, s: `<polyline points="${pts.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" fill="none" stroke="${o.antler || '#d9c8a4'}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` });
    }));
    return outline + items.sort((a, b) => a.d - b.d).map((i) => i.s).join('');
  }
  // fit: one scale per species (its broadside size), centred, standing on the ground line
  function fitOf(spKey) {
    const P = pose(spKey, 'broadside', 0, 1);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9;
    P.parts.forEach((pe) => { x0 = Math.min(x0, pe.cx - pe.rx); x1 = Math.max(x1, pe.cx + pe.rx); y0 = Math.min(y0, pe.cy - pe.ry); });
    return Math.min(330 / (x1 - x0), 215 / -y0);
  }
  function bboxX(P) { let x0 = 1e9, x1 = -1e9; P.parts.forEach((pe) => { x0 = Math.min(x0, pe.cx - pe.rx); x1 = Math.max(x1, pe.cx + pe.rx); }); return [x0, x1]; }
  const GROUND = 262;
  function shotScene(R, reveal) {
    const P = pose(R.sp, R.scen, R.th, R.m);
    const k = fitOf(R.sp);
    const [x0, x1] = bboxX(P);
    const tx = 200 - k * (x0 + x1) / 2, ty = GROUND;
    R.tf = { k, tx, ty }; R.P = P;
    const sky = R.scen === 'skyline';
    let bg = `<rect width="400" height="300" fill="#cfe3ef"/>`;
    bg += sky ? `<path d="M0 ${GROUND + 6} Q200 ${GROUND - 10} 400 ${GROUND + 6} L400 300 L0 300z" fill="#9c8a5e"/>`
      : `<path d="M0 70 Q120 40 240 62 T400 50 L400 300 L0 300z" fill="#8ea36a"/><path d="M0 150 Q200 120 400 150 L400 300 L0 300z" fill="#a3ad74"/><rect y="${GROUND - 4}" width="400" height="${304 - GROUND}" fill="#b9ae7a"/>`;
    let back = '';
    if (R.scen === 'behind') { // a second animal standing behind the first, its body behind the vitals
      const k2 = k * 0.82; const L = P.lungs;
      const P2 = pose(R.sp, 'broadside', 0, -R.m);
      const gx = tx + k * L.cx - k2 * P2.parts.find((q) => q.t === 'gut').cx, gy = GROUND - 22;
      back = `<g transform="translate(${gx.toFixed(1)} ${gy}) scale(${k2.toFixed(4)})" opacity=".85">${animalSvg(P2, { col: R.sp === 'bear' ? '#4a423b' : '#8f6744' })}</g>`;
    }
    let front = '';
    if (R.scen === 'brush') {
      const L = P.lungs; const cx = tx + k * L.cx, cy = ty + k * L.cy, r = k * (L.rx + 12);
      front = `<g stroke="#4f5d2f" stroke-width="3" fill="none" stroke-linecap="round"><path d="M${cx - r * 2} ${cy + r} Q${cx} ${cy - r * 0.2} ${cx + r * 1.6} ${cy - r * 1.4}"/><path d="M${cx - r * 1.5} ${cy - r * 1.2} Q${cx - r * 0.2} ${cy} ${cx + r * 1.2} ${cy + r * 1.3}"/><path d="M${cx - r} ${cy + r * 1.6} L${cx + r * 0.3} ${cy - r * 0.6}"/></g>`
        + Array.from({ length: 14 }, (_, i) => { const a = i * 2.39, rr = r * (0.3 + (i % 5) * 0.28); return `<ellipse cx="${(cx + Math.cos(a) * rr).toFixed(1)}" cy="${(cy + Math.sin(a) * rr).toFixed(1)}" rx="7" ry="4" transform="rotate(${(i * 47) % 180} ${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)})" fill="#6b7d3a"/>`; }).join('');
    }
    // seen from above inset
    const c = Math.cos(R.th), s = Math.sin(R.th);
    const hx = R.m * c * 18, hy = s * 18;
    const inset = `<g transform="translate(56 58)"><rect x="-50" y="-52" width="100" height="106" rx="8" fill="#fffaf0" stroke="#8a7a5a"/>
      <ellipse cx="0" cy="0" rx="20" ry="8" transform="rotate(${(Math.atan2(hy, hx) / D2R).toFixed(1)})" fill="${SPECIES[R.sp].col}" stroke="#2f241a"/>
      <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="5" fill="#2f241a"/>
      <path d="M0 30 l-7 -10 h14z" fill="#e8590c"/><text x="0" y="-33" font-size="16" text-anchor="middle" fill="#2f241a">from above</text><text x="0" y="48" font-size="16" text-anchor="middle" fill="#2f241a">you</text></g>`;
    let over = '';
    if (reveal) {
      const L = P.lungs, H = P.heart, S = P.shoulder;
      over = `<g transform="translate(${tx.toFixed(1)} ${ty}) scale(${k.toFixed(4)})">${ell(S, 'fill="none" stroke="#fffaf0" stroke-width="2.4" stroke-dasharray="5 4"')}${ell(L, 'fill="#e9a3a0" fill-opacity=".75" stroke="#b55b57" stroke-width="2"')}${ell(H, 'fill="#8e2a2a" stroke="#5e1717" stroke-width="1.5"')}</g>`;
    }
    return `<svg class="tr-svg" viewBox="0 0 400 300" role="img" aria-label="${esc(SP_NAME[R.sp] + ', ' + F.shot.scen[R.scen].label.toLowerCase())}">
      ${bg}${back}<g transform="translate(${tx.toFixed(1)} ${ty}) scale(${k.toFixed(4)})">${animalSvg(P)}</g>${front}${over}${inset}<g id="tr-mark"></g></svg>`;
  }
  const markSvg = (x, y, col) => `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${col || '#e8590c'}" stroke-width="3"/><path d="M${x - 15} ${y}h30M${x} ${y - 15}v30" stroke="${col || '#e8590c'}" stroke-width="2"/>`;

  function shotRounds() {
    const no = shuffle(['qtoward', 'facing', 'away', 'legback', 'skyline', 'brush', 'behind']).slice(0, 5);
    const list = shuffle(['broadside', 'broadside', 'broadside', 'qaway', 'qaway'].concat(no));
    const sps = Object.keys(SPECIES);
    return list.map((scen) => {
      const m = Math.random() < 0.5 ? 1 : -1;
      const a = 30 + rnd(16);
      const th = scen === 'qaway' ? -a * D2R : scen === 'qtoward' ? a * D2R : scen === 'facing' ? (88 + rnd(5)) * D2R : scen === 'away' ? -(88 + rnd(5)) * D2R : 0;
      return { sp: pick(sps), scen, th, m };
    });
  }
  function shot() {
    const fmt = (r) => `${r.score} of ${r.n}`;
    startScreen('shot', 'Shot placement trainer', `<ul class="tr-intro"><li>Each round: an animal at one angle.</li><li>Tap where you would aim, then tap Shoot.</li><li>Or tap No shot when you should not shoot.</li><li>The answer shows the lungs, heart and shoulder bone.</li></ul>
      <p class="muted">Drawings are simplified for practice. Lungs and heart placed to match the lesson plates.</p>`, fmt, () => shotRun(shotRounds(), 0, []));
  }
  function shotRun(rounds, i, res) {
    if (i >= rounds.length) {
      const score = res.filter(Boolean).length;
      addSession('shot', { date: dayISO(), n: rounds.length, score });
      return summaryScreen('shot', 'Shot placement', `<p class="tr-big">${score} of ${rounds.length}</p>${roundList(rounds.map((r, k) => `${SP_NAME[r.sp]}, ${F.shot.scen[r.scen].label.toLowerCase()}`), res)}
        ${factList([{ t: 'Say the angle out loud. Say the spot. Then squeeze. Three words, then a bullet.', c: 'Tip', s: 'L_shot' }])}`, () => shotRun(shotRounds(), 0, []));
    }
    const R = rounds[i];
    const sc = F.shot.scen[R.scen];
    view().innerHTML = `<div class="tr">${dots(i, res)}
      <p class="tr-q"><b>${esc(SP_NAME[R.sp])}</b>, about 100 m (109 yd) away. Tap where you would aim.</p>
      <div class="tr-stage">${shotScene(R, false)}</div>
      <div class="btn-row"><button class="btn primary" id="tr-shoot" disabled>Shoot here</button><button class="btn" id="tr-no">No shot</button></div>
      <div id="tr-out"></div></div>`;
    const svg = $('.tr-svg'); let tap = null; let done = false;
    svg.addEventListener('click', (ev) => {
      if (done) return;
      const p = svgPoint(svg, ev); tap = p;
      $('#tr-mark').innerHTML = markSvg(p.x.toFixed(1), p.y.toFixed(1));
      $('#tr-shoot').disabled = false;
    });
    const finish = (choice) => {
      if (done) return; done = true;
      let zone = 'noshot';
      if (choice === 'shoot') { const t = R.tf; zone = classify(R.P, (tap.x - t.tx) / t.k, (tap.y - t.ty) / t.k); }
      const good = sc.shoot ? (zone === 'lungs' || zone === 'heart') : zone === 'noshot';
      res.push(good);
      $('.tr-stage').innerHTML = shotScene(R, true);
      if (tap && choice === 'shoot') $('#tr-mark').innerHTML = markSvg(tap.x.toFixed(1), tap.y.toFixed(1), '#1565c0');
      const Z = F.shot.zones[zone];
      const spF = F.shot.species[R.sp].facts;
      let head;
      if (sc.shoot) head = good ? `Good shot. ${Z.title}.` : zone === 'noshot' ? 'You passed, but this was a good shot.' : `Not the spot: ${Z.title.toLowerCase()}.`;
      else head = good ? 'Right call: no shot.' : `This was a no shot round.${zone !== 'noshot' ? ` Your bullet: ${Z.title.toLowerCase()}.` : ''}`;
      const why0 = [].concat(sc.facts, spF[R.scen] || [], sc.shoot && zone !== 'noshot' ? Z.facts : [], !sc.shoot && zone !== 'noshot' && zone !== 'lungs' && zone !== 'heart' ? Z.facts : [], (spF.any || []).slice(0, 1));
      const why = why0.filter((f, k) => why0.indexOf(f) === k);
      $('#tr-out').innerHTML = `<div class="card tr-res ${good ? 'tr-good' : 'tr-badc'}"><h2>${good ? '✓ ' : '✗ '}${esc(head)}</h2>
        <p><b>The angle:</b> ${esc(sc.label)}. ${sc.shoot ? 'A shot to take.' : 'Not a shot to take.'}</p>
        <p class="muted">Pink: lungs. Dark red: heart. Dashed white: near shoulder bone. Blue cross: your aim.</p>
        ${factList(why)}
        ${plateBox('shot-placement', F.shot.species[R.sp].lesson, 'See the lesson plate for this animal')}
        <p class="muted">From the lesson: ${srcLink('L_shot')}. Checked ${esc(F.checked)}.</p>
        <button class="btn primary block" id="tr-next">${i + 1 < rounds.length ? 'Next round' : 'See my score'}</button></div>`;
      $('#tr-shoot').disabled = true; $('#tr-no').disabled = true;
      $('#tr-next').onclick = () => { shotRun(rounds, i + 1, res); window.scrollTo(0, 0); };
      $('#tr-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    $('#tr-shoot').onclick = () => tap && finish('shoot');
    $('#tr-no').onclick = () => finish('no');
  }
  const roundList = (labels, res) => `<ol class="tr-rounds">${labels.map((l, k) => `<li class="${res[k] ? 'ok' : 'bad'}">${res[k] ? '✓' : '✗'} ${esc(l)}</li>`).join('')}</ol>`;

  // =====================================================================
  // 2. LEGAL BUCK (Region 3, MU 3-27, synopsis pages 3, 4, 33, 34 as quoted in the Rule Book lessons)
  // Antlers drawn front on. Right antler in local units (x outward, y up is negative); left is the mirror.
  // Kinds: beam (main beam tip), tine, brow (brow tine), bump (under 2.5 cm: not a point).
  // =====================================================================
  const B = (k, pts) => ({ k, pts });
  const MD = {
    spike: [B('beam', [[0, 0], [8, -50], [16, -100]])],
    fork: [B('beam', [[0, 0], [18, -45], [40, -70], [72, -112]]), B('tine', [[40, -70], [36, -104], [28, -132]])],
    three: [B('beam', [[0, 0], [18, -45], [40, -70], [74, -94], [112, -122]]), B('tine', [[74, -94], [80, -144]]), B('tine', [[40, -70], [36, -104], [30, -136]])],
    four: [B('beam', [[0, 0], [18, -45], [40, -70], [74, -94], [112, -122]]), B('tine', [[74, -94], [80, -144]]), B('tine', [[40, -70], [36, -100], [16, -132]]), B('tine', [[36, -100], [46, -146]])],
  };
  const MD_BROW = B('brow', [[7, -16], [-2, -40]]);
  const MD_BUMP = B('bump', [[38, -96], [45, -101]]);
  const WT = {
    spike: [B('beam', [[0, 0], [10, -45], [16, -92]])],
    fork: [B('beam', [[0, 0], [28, -34], [52, -60], [56, -104]]), B('tine', [[28, -34], [26, -84]])],
    four: [B('beam', [[0, 0], [45, -16], [96, -38], [122, -64], [140, -92], [150, -108]]), B('brow', [[18, -7], [16, -44]]), B('tine', [[62, -22], [60, -96]]), B('tine', [[96, -38], [90, -122]])],
    five: [B('beam', [[0, 0], [45, -16], [96, -38], [122, -64], [140, -92], [150, -108]]), B('brow', [[18, -7], [16, -44]]), B('tine', [[62, -22], [60, -96]]), B('tine', [[96, -38], [90, -122]]), B('tine', [[122, -64], [124, -132]])],
  };
  const withX = (base, ...extra) => base.concat(extra);
  // pool: species, left and right antler, date (month index, day), plain label
  const BUCK_POOL = [
    { sp: 'md', L: MD.spike, R: MD.spike, mo: 10, d: 15, label: 'spike' },
    { sp: 'md', L: MD.spike, R: MD.spike, mo: 11, d: 15, label: 'spike' },
    { sp: 'md', L: MD.fork, R: MD.fork, mo: 9, d: 20, label: 'forked, 2 points a side' },
    { sp: 'md', L: MD.fork, R: MD.fork, mo: 10, d: 20, label: 'forked, 2 points a side' },
    { sp: 'md', L: withX(MD.three, MD_BROW), R: withX(MD.three, MD_BROW), mo: 11, d: 15, label: '3 points plus brow tines' },
    { sp: 'md', L: MD.three, R: MD.three, mo: 12, d: 1, label: '3 points a side' },
    { sp: 'md', L: withX(MD.three, MD_BUMP), R: MD.three, mo: 11, d: 5, label: '3 points and a short bump' },
    { sp: 'md', L: MD.four, R: MD.four, mo: 11, d: 20, label: '4 points a side' },
    { sp: 'md', L: withX(MD.four, MD_BROW), R: withX(MD.four, MD_BROW), mo: 12, d: 5, label: '4 points plus brow tines' },
    { sp: 'md', L: MD.four, R: MD.three, mo: 9, d: 25, label: '4 points one side, 3 the other' },
    { sp: 'md', L: null, R: null, button: true, mo: 10, d: 15, label: 'button buck' },
    { sp: 'wt', L: WT.spike, R: WT.spike, mo: 11, d: 15, label: 'spike' },
    { sp: 'wt', L: WT.five, R: WT.five, mo: 9, d: 20, label: '5 points a side' },
    { sp: 'wt', L: WT.fork, R: WT.fork, mo: 12, d: 5, label: 'forked' },
    { sp: 'wt', L: WT.four, R: WT.five, mo: 11, d: 25, label: '4 and 5 points' },
    { sp: 'wt', L: null, R: null, button: true, mo: 10, d: 20, label: 'button buck' },
    { sp: 'wt', L: null, R: null, button: true, mo: 11, d: 20, label: 'button buck' },
    { sp: 'wt', L: null, R: null, doe: true, mo: 9, d: 20, label: 'doe' },
  ];
  const MON = ['', '', '', '', '', '', '', '', '', 'September', 'October', 'November', 'December'];
  const BSP = { md: 'Mule deer', wt: 'White tailed deer' };
  const countable = (sp, k) => k === 'beam' || k === 'tine' || (sp === 'wt' && k === 'brow');
  const sideCount = (sp, side) => (side || []).filter((b) => countable(sp, b.k)).length;
  function buckLegal(r) {
    const best = Math.max(sideCount(r.sp, r.L), sideCount(r.sp, r.R));
    const antlered = !!(r.L || r.R);
    const mmdd = r.mo * 100 + r.d;
    if (r.sp === 'md') {
      if (!antlered) return { ok: false, best, why: ['buck', 'mdAntlerless'] };
      if (mmdd >= 1001 && mmdd <= 1031) return { ok: true, best, why: ['mdSeason', 'buck'] };
      return { ok: best >= 4, best, why: ['mdSeason', 'mdPoint', 'brow', 'tine'].concat(best >= 4 ? ['mdAntlers'] : []) };
    }
    if (!antlered) return { ok: mmdd >= 1010 && mmdd <= 1031, best, why: ['buck', 'wtAntlerless'] };
    return { ok: mmdd >= 910 && mmdd <= 1210, best, why: ['wtBucks', 'buck'] };
  }
  function buckRounds() {
    const md = shuffle(BUCK_POOL.filter((r) => r.sp === 'md')).slice(0, 7);
    const wt = shuffle(BUCK_POOL.filter((r) => r.sp === 'wt')).slice(0, 3);
    return shuffle(md.concat(wt)).map((r) => Object.assign({}, r, Math.random() < 0.5 ? {} : { L: r.R, R: r.L }));
  }
  const BASE_Y = 168, BASE_DX = 24;
  const toScr = (p, side) => [200 + side * (BASE_DX + p[0]), BASE_Y + p[1]];
  function tipsOf(r) {
    const out = [];
    [['L', -1], ['R', 1]].forEach(([s, side]) => (r[s] || []).forEach((b, bi) => { const p = toScr(b.pts[b.pts.length - 1], side); out.push({ s, bi, k: b.k, x: p[0], y: p[1] }); }));
    return out;
  }
  function buckSvg(r, marks, reveal) {
    const isMd = r.sp === 'md';
    const ear = isMd ? 'M-26 -6 C-70 -30 -96 -20 -102 -6 C-80 10 -50 10 -26 6z' : 'M-24 -4 C-52 -22 -70 -16 -74 -6 C-58 6 -40 8 -24 4z';
    const head = `<g transform="translate(200 ${BASE_Y + 10})"><path d="${ear}" fill="#a87b52" stroke="#5a3e26" stroke-width="1.5"/><path d="${ear}" transform="scale(-1 1)" fill="#a87b52" stroke="#5a3e26" stroke-width="1.5"/>
      <path d="M-30 -10 C-32 30 -18 80 -10 104 C-4 112 4 112 10 104 C18 80 32 30 30 -10 C20 -22 -20 -22 -30 -10z" fill="#a87b52" stroke="#5a3e26" stroke-width="1.6"/>
      <path d="M-14 -6 C-10 20 -8 50 -6 80 L6 80 C8 50 10 20 14 -6z" fill="${isMd ? '#efe6d2' : '#8f6744'}" opacity=".7"/>
      <circle cx="-18" cy="16" r="4" fill="#2f241a"/><circle cx="18" cy="16" r="4" fill="#2f241a"/><ellipse cx="0" cy="104" rx="11" ry="7" fill="#2f241a"/></g>`;
    let ant = '';
    [['L', -1], ['R', 1]].forEach(([s, side]) => (r[s] || []).forEach((b) => {
      const pts = b.pts.map((p) => toScr(p, side));
      ant += `<polyline points="${pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="#5a4630" stroke-width="${b.k === 'beam' ? 9 : b.k === 'bump' ? 7 : 6.5}" stroke-linecap="round" stroke-linejoin="round"/>`;
      ant += `<polyline points="${pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="#e8dcc0" stroke-width="${b.k === 'beam' ? 5.5 : b.k === 'bump' ? 4 : 3.5}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }));
    if (r.button) ant += `<circle cx="${200 - BASE_DX}" cy="${BASE_Y}" r="6" fill="#8f6744" stroke="#5a3e26"/><circle cx="${200 + BASE_DX}" cy="${BASE_Y}" r="6" fill="#8f6744" stroke="#5a3e26"/>`;
    let lab = '';
    const tips = tipsOf(r);
    if (reveal) {
      const n = { L: 0, R: 0 };
      tips.forEach((t) => {
        if (countable(r.sp, t.k)) { n[t.s]++; lab += `<circle cx="${t.x}" cy="${t.y}" r="12" fill="#2e7d32"/><text x="${t.x}" y="${t.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${n[t.s]}</text>`; }
        else { lab += `<circle cx="${t.x}" cy="${t.y}" r="12" fill="#b3261e"/><text x="${t.x}" y="${t.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">✗</text>`; }
      });
    } else {
      (marks || []).forEach((t) => { lab += `<circle cx="${t.x}" cy="${t.y}" r="13" fill="#e8590c" stroke="#fff" stroke-width="2"/><text x="${t.x}" y="${t.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${t.n}</text>`; });
    }
    return `<svg class="tr-svg" viewBox="0 0 400 300" role="img" aria-label="${esc(BSP[r.sp])} head from the front">
      <rect width="400" height="300" fill="#e7efe1"/>${head}${ant}${lab}</svg>`;
  }
  function buck() {
    const fmt = (r) => `${r.score} of ${r.n}${r.counts != null ? `, counts right ${r.counts}` : ''}`;
    startScreen('buck', 'Legal buck trainer', `<ul class="tr-intro"><li>Each round: a buck seen from the front, a species and a date.</li><li>Tap each point on the antler with the most points.</li><li>Then call it: legal or not.</li></ul>
      <p class="muted">${esc(F.buck.assume)}</p>`, fmt, () => buckRun(buckRounds(), 0, [], 0),
      `<div class="card"><h2>The rules you need</h2>${factList(['mdPoint', 'brow', 'tine', 'mdSeason', 'wtBucks', 'wtAntlerless', 'mdAntlerless'].map((k) => F.buck.rules[k]))}
        ${plateBox('rb-definitions', 'A mule deer buck head in side view', 'See the 4 point drawing from the Rule Book')}
        ${plateBox('rb-definitions', 'Two antler bumps in a 2.5 centimetre box', 'See how to measure a tine')}</div>`);
  }
  function buckRun(rounds, i, res, counts) {
    if (i >= rounds.length) {
      const score = res.filter(Boolean).length;
      addSession('buck', { date: dayISO(), n: rounds.length, score, counts });
      return summaryScreen('buck', 'Legal buck', `<p class="tr-big">${score} of ${rounds.length}</p><p>Point counts right: ${counts} of ${rounds.filter((r) => r.L || r.R).length}.</p>
        ${roundList(rounds.map((r) => `${BSP[r.sp]}, ${r.label}, ${r.d} ${MON[r.mo]}`), res)}
        ${factList([{ t: 'Until you read your MU in the synopsis, count points on every buck as if the 4 point rule applies.', c: 'Tip', s: 'L_md' }])}`, () => buckRun(buckRounds(), 0, [], 0));
    }
    const r = rounds[i];
    const L = buckLegal(r);
    const antlered = !!(r.L || r.R);
    const marks = []; let counted = false;
    const q = `<p class="tr-q"><b>${esc(BSP[r.sp])}</b>, ${r.d} ${MON[r.mo]}, MU (Management Unit) 3-27.</p>`;
    const draw = () => { $('.tr-stage').innerHTML = buckSvg(r, marks, false); bindTaps(); };
    view().innerHTML = `<div class="tr">${dots(i, res)}${q}
      <p class="muted">${antlered ? (r.sp === 'md' ? 'Tap each point on the antler with the most points. Mule deer rule: leave out the brow tine.' : 'Tap each point on the antler with the most points, beam tip included.') : 'Look for visible antlers first.'}</p>
      <div class="tr-stage"></div>
      <div id="tr-step">${antlered ? `<div class="btn-row"><button class="btn" id="tr-undo">Undo</button><button class="btn primary" id="tr-cnt">Done: <span id="tr-n">0</span> points</button></div>`
        : '<div class="btn-row"><button class="btn primary" id="tr-cnt">No antlers to count</button></div>'}</div>
      <div id="tr-out"></div></div>`;
    const userBest = () => { const n = { L: 0, R: 0 }; marks.forEach((m) => n[m.s]++); return Math.max(n.L, n.R); };
    function bindTaps() {
      const svg = $('.tr-svg');
      svg.addEventListener('click', (ev) => {
        if (!antlered || counted) return;
        const p = svgPoint(svg, ev);
        let best = null, bd = 32;
        tipsOf(r).forEach((t) => { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; best = t; } });
        if (!best) return;
        const at = marks.findIndex((m) => m.x === best.x && m.y === best.y);
        if (at >= 0) marks.splice(at, 1); else marks.push(Object.assign({}, best));
        const n = { L: 0, R: 0 }; marks.forEach((m) => { m.n = ++n[m.s]; });
        draw(); $('#tr-n').textContent = userBest();
      });
    }
    draw();
    if ($('#tr-undo')) $('#tr-undo').onclick = () => { marks.pop(); const n = { L: 0, R: 0 }; marks.forEach((m) => { m.n = ++n[m.s]; }); draw(); $('#tr-n').textContent = userBest(); };
    $('#tr-cnt').onclick = () => {
      counted = true;
      const ub = userBest();
      const countOk = !antlered || ub === L.best;
      if (antlered && countOk) counts++;
      $('.tr-stage').innerHTML = buckSvg(r, null, true);
      const tp = tipsOf(r), notes = [];
      if (tp.some((t) => t.k === 'brow')) notes.push(r.sp === 'md' ? '✗ on the brow tine: not counted on a mule deer 4 point.' : 'The brow tine counts in a white tail point count.');
      if (tp.some((t) => t.k === 'bump')) notes.push('✗ on the bump: under 2.5 cm, so not a point.');
      const countLine = antlered ? `<p><b>${countOk ? '✓' : '✗'} Best antler: ${L.best} point${L.best === 1 ? '' : 's'}${r.sp === 'md' ? ', brow tine not counted' : ''}.</b> You counted ${ub}.</p>${notes.map((n) => `<p class="muted">${n}</p>`).join('')}<p class="muted">Green numbers: points that count.</p>`
        : `<p><b>No visible antlers.</b> ${r.button ? 'A button buck: skin covered bumps, not antlers.' : 'A doe.'} By law: antlerless.</p>`;
      $('#tr-step').innerHTML = `${countLine}<p class="tr-q">Legal for you to shoot today?</p><div class="btn-row"><button class="btn" id="tr-yes">Legal</button><button class="btn" id="tr-nope">Not legal</button></div>`;
      const answer = (say) => {
        const good = say === L.ok;
        res.push(good);
        $('#tr-step').innerHTML = countLine;
        const extra = r.sp === 'md' ? ['mdShape', 'mdAge'] : ['wtCount', 'mdShape'];
        const why = L.why.concat(extra).map((k) => F.buck.rules[k]);
        $('#tr-out').innerHTML = `<div class="card tr-res ${good ? 'tr-good' : 'tr-badc'}"><h2>${good ? '✓ Right' : '✗ Not quite'}: ${L.ok ? 'legal' : 'not legal'}.</h2>
          <p>${esc(plainWhy(r, L))}</p>${factList(why)}
          <p class="muted">${esc(F.buck.assume)}</p>
          <p class="muted">Rules from the ${srcLink('L_r3')} and ${srcLink('L_def')} lessons, read in the synopsis. Checked ${esc(F.checked)}.</p>
          <button class="btn primary block" id="tr-next">${i + 1 < rounds.length ? 'Next round' : 'See my score'}</button></div>`;
        $('#tr-next').onclick = () => { buckRun(rounds, i + 1, res, counts); window.scrollTo(0, 0); };
        $('#tr-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      $('#tr-yes').onclick = () => answer(true);
      $('#tr-nope').onclick = () => answer(false);
    };
  }
  function plainWhy(r, L) {
    const mmdd = r.mo * 100 + r.d; const date = `${r.d} ${MON[r.mo]}`;
    if (r.sp === 'md') {
      if (!(r.L || r.R)) return `No visible antlers, so it is antlerless. Antlerless mule deer in Region 3 need an LEH (Limited Entry Hunting) draw. Not on a general licence.`;
      if (mmdd >= 1001 && mmdd <= 1031) return `${date} falls in 1 to 31 October: any buck with visible antlers is legal in MU 3-27. Points do not matter this month.`;
      return `${date} is a 4 point season in MU 3-27. The best antler has ${L.best} point${L.best === 1 ? '' : 's'} without the brow tine. ${L.best >= 4 ? 'That meets the rule. Keep the antlers with the licence.' : 'That is short of 4. Let him walk.'}`;
    }
    if (!(r.L || r.R)) return mmdd >= 1010 && mmdd <= 1031 ? `${date} falls in the antlerless white tail season, 10 to 31 October. A button buck counts as antlerless, so it is legal.`
      : `${date} is outside the antlerless white tail season for adults (10 to 31 October; November either sex is youth only). Not legal.`;
    return `White tailed bucks are open 10 September to 10 December in MU 3-27, and the row has no point rule. Any buck with visible antlers is legal on ${date}. Be sure it is a white tail, not a mule deer.`;
  }

  // =====================================================================
  // 3. RANGE GUESSING
  // Scene geometry: 6 px per mil (milliradian). Horizon at y 60. Eye 1.6 m above flat ground (assumption), so a
  // point on the ground at d metres sits 1,600 ÷ d mils below the horizon. The deer stands 0.92 m at the shoulder
  // (BC deer account: 90 to 95 cm), so it is 920 ÷ d mils tall.
  // =====================================================================
  const PXM = 6, HOR = 60, EYE = 1.6, WITHERS = 0.92;
  const groundY = (d) => HOR + PXM * 1000 * EYE / d;
  function rangeRounds() {
    const out = []; const bands = shuffle([[50, 100], [80, 150], [120, 200], [150, 250], [200, 300], [250, 350], [60, 120], [100, 180], [180, 260], [220, 340]]);
    bands.forEach(([a, b]) => out.push({ d: Math.round((a + Math.random() * (b - a)) / 5) * 5, x: 70 + rnd(260), m: Math.random() < 0.5 ? 1 : -1, th: (rnd(3) - 1) * 15 * D2R, seed: rnd(1e6) }));
    return out;
  }
  function seeded(s) { return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function rangeSvg(R, hints, reveal) {
    const g = groundY(R.d);
    const P = pose('deer', 'broadside', R.th, R.m);
    const k = (PXM * 1000 * WITHERS / R.d) / 94; // model withers = 94 units
    const rand = seeded(R.seed + 1);
    let tufts = '';
    for (let i = 0; i < 70; i++) { // grass tufts 0.3 m tall at random distances: they shrink with distance too
      const dd = 30 + rand() * 470, y = groundY(dd), h = PXM * 1000 * 0.3 / dd, x = rand() * 400;
      tufts += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(-h * 0.3).toFixed(1)} ${(-h).toFixed(1)} M${x.toFixed(1)} ${y.toFixed(1)} l0 ${(-h * 1.1).toFixed(1)} M${x.toFixed(1)} ${y.toFixed(1)} l${(h * 0.3).toFixed(1)} ${(-h).toFixed(1)}" stroke="#7d8a4a" stroke-width="${Math.max(0.6, h / 8).toFixed(2)}"/>`;
    }
    let lines = '';
    if (hints.unit || reveal) [100, 200, 300].forEach((d) => { const y = groundY(d); lines += `<line x1="0" x2="400" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#fffaf0" stroke-width="1.5" stroke-dasharray="6 5"/><text x="396" y="${(y - 3).toFixed(1)}" text-anchor="end" font-size="14" font-weight="700" fill="#23261f" stroke="#fffaf0" stroke-width="3" paint-order="stroke">${d} m</text>`; });
    let ladder = '';
    if (hints.mil || reveal) {
      const lx = R.x + (R.x > 200 ? -60 : 60); const top = g - PXM * 12;
      ladder = `<g stroke="#23261f" stroke-width="1.4"><line x1="${lx}" x2="${lx}" y1="${g}" y2="${top}"/>${Array.from({ length: 13 }, (_, i) => `<line x1="${lx - (i % 5 ? 4 : 8)}" x2="${lx + (i % 5 ? 4 : 8)}" y1="${(g - i * PXM).toFixed(1)}" y2="${(g - i * PXM).toFixed(1)}"/>`).join('')}</g>
        <text x="${lx + 10}" y="${(top + 4).toFixed(1)}" font-size="13" fill="#23261f" stroke="#fffaf0" stroke-width="3" paint-order="stroke">1 tick = 1 mil</text>`;
    }
    return `<svg class="tr-svg" viewBox="0 0 400 300" role="img" aria-label="A mule deer standing in an open field">
      <defs><linearGradient id="tr-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8b07a"/><stop offset="1" stop-color="#a39a62"/></linearGradient></defs>
      <rect width="400" height="${HOR}" fill="#cfe3ef"/><path d="M0 ${HOR} L0 ${HOR - 12} Q60 ${HOR - 22} 130 ${HOR - 10} T260 ${HOR - 14} T400 ${HOR - 8} L400 ${HOR}z" fill="#8fa0a8"/>
      <rect y="${HOR}" width="400" height="${300 - HOR}" fill="url(#tr-g)"/>${tufts}${lines}
      <ellipse cx="${R.x}" cy="${g.toFixed(1)}" rx="${(k * 70).toFixed(1)}" ry="${Math.max(1, k * 5).toFixed(1)}" fill="#7f7648" opacity=".6"/>
      <g transform="translate(${R.x} ${g.toFixed(1)}) scale(${k.toFixed(4)})">${animalSvg(P, { antler: '#cdbb93' })}</g>${ladder}</svg>`;
  }
  function rangeChart() {
    const h = histOf('range');
    if (h.length < 2) return '<p class="muted">Play two sessions and your accuracy chart starts here.</p>';
    const W = 340, H = 180, l = 40, b = 26, t = 12, rpad = 10;
    const pts = h.slice(-30);
    const maxE = Math.max(30, Math.ceil(Math.max(...pts.map((p) => p.err)) / 10) * 10);
    const X = (i) => l + (pts.length === 1 ? 0 : i * (W - l - rpad) / (pts.length - 1));
    const Y = (e) => t + (1 - e / maxE) * (H - t - b);
    const grid = [0, maxE / 2, maxE].map((e) => `<line x1="${l}" x2="${W - rpad}" y1="${Y(e)}" y2="${Y(e)}" style="stroke:var(--line)" stroke-width="1"/><text x="${l - 6}" y="${Y(e) + 4}" text-anchor="end" font-size="12" style="fill:var(--muted)">${e}%</text>`).join('');
    const goal = `<line x1="${l}" x2="${W - rpad}" y1="${Y(10)}" y2="${Y(10)}" style="stroke:var(--ok)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - rpad}" y="${Y(10) - 5}" text-anchor="end" font-size="12" style="fill:var(--ok)">goal: 10%</text>`;
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.err).toFixed(1)}`).join(' ');
    const marks = pts.map((p, i) => `<g class="tr-pt"><circle cx="${X(i).toFixed(1)}" cy="${Y(p.err).toFixed(1)}" r="14" fill="transparent"/><circle cx="${X(i).toFixed(1)}" cy="${Y(p.err).toFixed(1)}" r="4" style="fill:var(--accent);stroke:var(--card)" stroke-width="2"/><title>${esc(p.date)}: average error ${p.err}%, ${p.within} of ${p.n} within 10%</title></g>`).join('');
    const last = pts[pts.length - 1];
    return `<svg class="tr-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average range error per session, last ${pts.length} sessions">${grid}${goal}
      <path d="${path}" fill="none" style="stroke:var(--accent)" stroke-width="2"/>${marks}
      <text x="${l}" y="${H - 6}" font-size="12" style="fill:var(--muted)">older</text><text x="${W - rpad}" y="${H - 6}" text-anchor="end" font-size="12" style="fill:var(--muted)">latest: ${last.err}%</text></svg>
      <details class="tr-plate"><summary>Show as a table</summary><table class="tr-hist"><thead><tr><th>Date</th><th>Avg error</th><th>Within 10%</th><th>Lean</th></tr></thead><tbody>
      ${pts.slice().reverse().map((p) => `<tr><td>${esc(p.date)}</td><td>${p.err}%</td><td>${p.within} of ${p.n}</td><td>${p.bias > 0 ? 'long ' + p.bias + '%' : p.bias < 0 ? 'short ' + (-p.bias) + '%' : 'even'}</td></tr>`).join('')}</tbody></table></details>`;
  }
  const rf = (id) => F.range.facts.find((f) => f.id === id);
  function range() {
    const fmt = (r) => `${r.within} of ${r.n} within 10%, average error ${r.err}%`;
    startScreen('range', 'Range guessing trainer', `<ul class="tr-intro"><li>Each round: one mule deer in an open field.</li><li>Guess the distance in metres, then lock it in.</li><li>Within 10% of the true distance scores.</li><li>Stuck? Show the 100 m lines or a mil scale.</li></ul>
      <p class="muted">Assumption: flat ground, your eye 1.6 m above it, and the scene drawn so 1 tick on the scale is 1 mil (milliradian). Your screen size does not change the answer.</p>
      ${factList([rf('size'), rf('mil')])}`, fmt, () => rangeRun(rangeRounds(), 0, []),
      `<div class="card"><h2>Your accuracy over time</h2>${rangeChart()}</div>`);
  }
  function rangeRun(rounds, i, res) {
    if (i >= rounds.length) {
      const within = res.filter((x) => x.ok).length;
      const err = Math.round(res.reduce((a, x) => a + Math.abs(x.e), 0) / res.length);
      const bias = Math.round(res.reduce((a, x) => a + x.e, 0) / res.length);
      addSession('range', { date: dayISO(), n: res.length, within, err, bias });
      return summaryScreen('range', 'Range guessing', `<p class="tr-big">${within} of ${res.length} within 10%</p>
        <p>Average error: ${err}%. ${bias > 3 ? `You guess long by about ${bias}%.` : bias < -3 ? `You guess short by about ${-bias}%.` : 'No clear lean long or short.'}</p>
        ${roundList(res.map((x) => `${x.g} m guessed, ${x.d} m true (${x.e > 0 ? '+' : ''}${x.e}%)`), res.map((x) => x.ok))}
        <h3>Your accuracy over time</h3>${rangeChart()}
        ${factList([rf('laser'), rf('laserhabit'), rf('practice')])}`, () => rangeRun(rangeRounds(), 0, []));
    }
    const R = rounds[i]; const hints = { unit: false, mil: false };
    let g = 150;
    view().innerHTML = `<div class="tr">${dots(i, res.map((x) => x.ok))}
      <p class="tr-q">How far is the deer?</p>
      <div class="tr-stage">${rangeSvg(R, hints, false)}</div>
      <div class="tr-guess"><span class="tr-gnum" id="tr-g">${g} m</span><span class="muted" id="tr-gy">(${yd(g)} yd)</span></div>
      <input type="range" id="tr-sl" min="25" max="500" step="5" value="${g}" aria-label="Your guess in metres">
      <div class="tr-steps"><button class="btn" data-s="-25">−25</button><button class="btn" data-s="-5">−5</button><button class="btn" data-s="5">+5</button><button class="btn" data-s="25">+25</button></div>
      <div class="btn-row"><button class="btn" id="tr-h1">100 m lines</button><button class="btn" id="tr-h2">Mil scale</button></div>
      <button class="btn primary block" id="tr-lock" style="margin-top:10px">Lock in my guess</button>
      <div id="tr-out"></div></div>`;
    const show = () => { $('#tr-g').textContent = g + ' m'; $('#tr-gy').textContent = `(${yd(g)} yd)`; $('#tr-sl').value = g; };
    $('#tr-sl').oninput = (e) => { g = +e.target.value; show(); };
    document.querySelectorAll('.tr-steps .btn').forEach((b) => { b.onclick = () => { g = Math.max(25, Math.min(500, g + +b.dataset.s)); show(); }; });
    const redraw = () => { $('.tr-stage').innerHTML = rangeSvg(R, hints, false); };
    $('#tr-h1').onclick = () => { hints.unit = !hints.unit; $('#tr-h1').classList.toggle('on', hints.unit); redraw(); };
    $('#tr-h2').onclick = () => { hints.mil = !hints.mil; $('#tr-h2').classList.toggle('on', hints.mil); redraw(); };
    $('#tr-lock').onclick = () => {
      const e = Math.round((g - R.d) / R.d * 100);
      const ok = Math.abs(g - R.d) <= R.d * 0.1;
      res.push({ g, d: R.d, e, ok, hint: hints.unit || hints.mil });
      $('.tr-stage').innerHTML = rangeSvg(R, hints, true);
      document.querySelectorAll('.tr-steps .btn, #tr-h1, #tr-h2, #tr-lock').forEach((b) => { b.disabled = true; }); $('#tr-sl').disabled = true;
      const mils = (WITHERS * 1000 / R.d);
      const tips = [rf('unit'), rf('half'), rf('bracket'), rf('near'), rf('cost'), rf('chest')];
      $('#tr-out').innerHTML = `<div class="card tr-res ${ok ? 'tr-good' : 'tr-badc'}"><h2>${ok ? '✓ Within 10%' : '✗ Outside 10%'}</h2>
        <p><b>True distance: ${R.d} m (${yd(R.d)} yd).</b> You said ${g} m: ${e > 0 ? `${e}% long` : e < 0 ? `${-e}% short` : 'spot on'}.</p>
        <p><b>Mil (milliradian) check:</b> the deer stood ${mils.toFixed(1)} mils at the shoulder. 0.92 × 1,000 ÷ ${mils.toFixed(1)} = ${R.d} m.</p>
        <p class="muted">The dashed lines now show 100, 200 and 300 m. How many 100 m blocks fit between you and the deer?</p>
        ${factList([rf('mil'), tips[i % tips.length], rf('laser')])}
        ${i === 0 ? plateBox('judging-distance', 'A field stretching away from a hunter', 'See the unit of measure drawing from the lesson') : ''}
        <p class="muted">From the lesson: ${srcLink('L_jd')}. Checked ${esc(F.checked)}.</p>
        <button class="btn primary block" id="tr-next">${i + 1 < rounds.length ? 'Next round' : 'See my score'}</button></div>`;
      $('#tr-next').onclick = () => { rangeRun(rounds, i + 1, res); window.scrollTo(0, 0); };
      $('#tr-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }

  // ---------- styles ----------
  function injectCss() {
    if (document.getElementById('tr-css')) return;
    const st = document.createElement('style'); st.id = 'tr-css';
    st.textContent = `
.tr { font-size: 16px; }
.tr .btn { min-height: 48px; }
.tr .btn.on { background: var(--sage); color: #fff; border-color: var(--sage); }
.tr-menu { display: block; text-decoration: none; color: var(--ink); min-height: 56px; }
.tr-menu b { display: block; font-size: 19px; margin-bottom: 4px; }
.tr-menu span { display: block; font-size: 15px; }
.tr-menu small { display: block; margin-top: 6px; font-size: 14px; color: var(--muted); }
.tr-intro { padding-left: 20px; margin: 6px 0 12px; } .tr-intro li { margin: 4px 0; }
.tr-q { font-size: 17px; margin: 8px 0; }
.tr-stage { margin: 6px -4px; }
.tr-svg { display: block; width: 100%; height: auto; border-radius: 12px; border: 1px solid var(--line); touch-action: manipulation; cursor: crosshair; -webkit-tap-highlight-color: transparent; }
.tr-dots { display: flex; gap: 4px; margin: 2px 0 8px; } .tr-dots i { flex: 1; height: 8px; border-radius: 4px; background: var(--line); }
.tr-dots i.ok { background: var(--ok); } .tr-dots i.bad { background: var(--bad); } .tr-dots i.now { background: var(--accent); }
#tr-out { scroll-margin-top: 72px; } .tr-res { margin-top: 12px; } .tr-res h2 { font-size: 19px; }
.tr-good { border-left: 6px solid var(--ok); } .tr-badc { border-left: 6px solid var(--bad); }
.tr-facts { padding-left: 20px; margin: 8px 0; } .tr-facts li { margin: 7px 0; font-size: 15px; }
.tr-from { display: block; font-size: 14px; color: var(--muted); } .tr-from a { color: inherit; }
.tr-c { font-size: 14px; font-weight: 700; padding: 0 6px; border-radius: 6px; margin-left: 3px; white-space: nowrap; }
.tr-hi { background: rgba(46,125,50,.16); color: #1f6b24; } .tr-mid { background: rgba(122,143,46,.18); color: #56691c; }
.tr-lo { background: rgba(198,138,0,.18); color: #8a5f00; } .tr-tip { background: rgba(120,120,120,.18); color: #555; }
:root[data-theme="dark"] .tr-c { color: #ddd; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]):not([data-theme="sun"]) .tr-c { color: #ddd; } }
.tr-plate { margin: 10px 0; } .tr-plate summary { min-height: 44px; display: flex; align-items: center; font-weight: 700; cursor: pointer; color: var(--accent); }
.tr-plate-in svg { width: 100%; height: auto; display: block; }
.tr-hist { width: 100%; border-collapse: collapse; font-size: 15px; } .tr-hist td, .tr-hist th { text-align: left; padding: 6px 4px; border-bottom: 1px solid var(--line); }
.tr-big { font-size: 34px; font-weight: 800; margin: 4px 0 8px; }
.tr-rounds { padding-left: 4px; list-style: none; font-size: 15px; } .tr-rounds li { margin: 4px 0; } .tr-rounds li.ok { color: var(--ok); } .tr-rounds li.bad { color: var(--bad); }
.tr-guess { display: flex; align-items: baseline; gap: 10px; justify-content: center; margin: 8px 0 2px; } .tr-gnum { font-size: 34px; font-weight: 800; }
.tr input[type=range] { width: 100%; height: 44px; accent-color: var(--accent); }
.tr-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; } .tr-steps .btn { padding: 0 4px; }
.tr-chart { width: 100%; height: auto; display: block; }
.tr .btn-row .btn { padding: 0 8px; }
`;
    document.head.appendChild(st);
  }

  window.HMRoutes = window.HMRoutes || {};
  const trainRoute = withFacts((args) => {
    const a = (args && args[0]) || '';
    if (a === 'shot') shot(); else if (a === 'buck') buck(); else if (a === 'range') range(); else menu();
  });
  // #/train/decide belongs to app/addons/decide.js (it loads its own data, so it skips the facts fetch)
  window.HMRoutes.train = (args) => (args && args[0] === 'decide' && window.HMDecide ? window.HMDecide.route(args.slice(1)) : trainRoute(args));
  window.HMTrain = { classify, pose, buckLegal, BUCK_POOL, SPECIES, groundY, _rounds: { shotRounds, buckRounds, rangeRounds }, _draw: { shot: (R, rev) => shotScene(R, rev), buck: (r) => buckSvg(r, null, true), range: (R) => rangeSvg(R, {}, true) } };
})();
