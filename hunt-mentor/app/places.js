/* Tap a place to see it on the map. Vanilla JS, works offline.
   Data (precached by the service worker; inline in the single file backup as HM.placesInline):
     data/places/mu.json      every BC MU (Management Unit) and Region: small outlines, neighbours, towns inside, nearest town
     data/places/places.json  place names the lessons mention, coordinates from BC Geographical Names (scripts/build-places.py)
   window.HMPlaces.link(root)  wraps "MU 3-27", "Region 3 Thompson" and gazetteer names in root with tap targets
                               (first mention of each place per call; never inside links, buttons, code, SVG or quizzes)
   window.HMPlaces.open(kind, id)  bottom sheet with a mini map drawn from the outline data
   Lesson block ```mumap 3-27``` (build.mjs) becomes <div class="hmp-mini" data-mu="3-27">, drawn by link(). */
(function () {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PIN = '<svg class="hmp-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>';
  let D = null, loading = null;

  // ---------- data ----------
  const getJSON = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
  function load() {
    if (D) return Promise.resolve(D);
    if (loading) return loading;
    const inl = window.HM && window.HM.placesInline;
    loading = (inl ? Promise.resolve([inl.mu, inl.places]) : Promise.all([getJSON('data/places/mu.json'), getJSON('data/places/places.json')]))
      .then(([mu, pl]) => (D = index(mu, pl)))
      .catch((e) => { loading = null; throw e; });
    return loading;
  }
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function index(mu, pl) {
    const d = { mu, places: pl.places, muById: {}, regById: {}, placeById: {}, byName: {} };
    mu.mus.forEach((m) => { d.muById[m.id] = m; });
    mu.regions.forEach((r) => { d.regById[r.id] = r; });
    pl.places.forEach((p) => {
      d.placeById[p.id] = p;
      [p.name, ...(p.alias || [])].forEach((n) => { d.byName[n] = p; });
    });
    const names = Object.keys(d.byName).sort((a, b) => b.length - a.length).map(reEsc);
    // whole word, case sensitive, longest first (no look behind: older iPhone Safari)
    d.nameRe = names.length ? new RegExp(`(^|[^\\w-])(${names.join('|')})(?![\\w-])`, 'g') : null;
    const rn = mu.regions.map((r) => reEsc(r.name)).join('|');
    d.regRe = new RegExp(`\\bRegions?\\s+(\\d[AB]?(?:(?:\\s*,\\s*|\\s+(?:and|or|to)\\s+)\\d[AB]?)*)(\\s+(?:${rn}))?\\b`, 'g');
    return d;
  }
  const MU_RE = /\bMUs?\b(?:\s*\(Management Units?\))?\s+(\d{1,2}-\d{1,3}(?:(?:\s*,\s*(?:and\s+|or\s+)?|\s+(?:and|or|to)\s+)\d{1,2}-\d{1,3})*)/g;
  const decode = (o) => o.map((f) => { const pts = []; let x = 0, y = 0; for (let i = 0; i < f.length; i += 2) { x += f[i]; y += f[i + 1]; pts.push([x / 1000, y / 1000]); } return pts; });
  const ring = (m) => m._r || (m._r = decode(m.o));
  const regName = (r) => `Region ${r.id} ${r.name}`;
  const town = (i) => { const t = D.mu.towns[i]; return t && { name: t[0], lon: t[1], lat: t[2], type: t[3] }; };
  const baseOf = (id) => (window.HM && window.HM.bases || []).find((b) => b.id === id);
  const regOfMu = (m) => D.regById[m.r];

  // ---------- auto linking ----------
  const SKIP = 'a,button,code,pre,svg,script,style,textarea,select,option,label,summary,input,.hmp,.q,.term,.verify,.cert,.steps-nav,.hmp-mini,.hmp-sheet';
  function spansIn(text) {
    const out = [];
    let m;
    MU_RE.lastIndex = 0;
    while ((m = MU_RE.exec(text))) {
      const list = m[1], base = m.index + m[0].length - list.length;
      const ids = /\d{1,2}-\d{1,3}/g; let k;
      let first = true;
      while ((k = ids.exec(list))) {
        if (!D.muById[k[0]]) { first = false; continue; }
        // the first id carries "MU " into the link when nothing sits between them except the spelled out name
        const st = first ? m.index : base + k.index;
        out.push({ s: st, e: base + k.index + k[0].length, kind: 'mu', id: k[0] });
        first = false;
      }
    }
    D.regRe.lastIndex = 0;
    while ((m = D.regRe.exec(text))) {
      const list = m[1], base = m.index + m[0].length - list.length - (m[2] || '').length;
      const ids = /\d[AB]?/g; let k, n = 0;
      const toks = [];
      while ((k = ids.exec(list))) toks.push(k);
      toks.forEach((k2) => {
        const id = k2[0];
        if (!D.regById[id]) return;
        const single = toks.length === 1;
        const st = n === 0 ? m.index : base + k2.index;
        const en = single && m[2] && m[2].trim() === D.regById[id].name ? m.index + m[0].length : base + k2.index + id.length;
        out.push({ s: st, e: en, kind: 'region', id });
        n++;
      });
    }
    if (D.nameRe) {
      D.nameRe.lastIndex = 0;
      while ((m = D.nameRe.exec(text))) {
        const s = m.index + m[1].length;
        out.push({ s, e: s + m[2].length, kind: 'place', id: D.byName[m[2]].id });
        D.nameRe.lastIndex = s + m[2].length;
      }
    }
    out.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
    const keep = []; let end = -1;
    for (const sp of out) if (sp.s >= end) { keep.push(sp); end = sp.e; }
    return keep;
  }
  const quick = /MU|Region|[A-Z][a-z]/;
  function linkNow(root, seen) {
    if (!root || !D) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.length > 2 && quick.test(n.nodeValue) && !(n.parentElement && n.parentElement.closest(SKIP)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = []; for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    for (const node of nodes) {
      const text = node.nodeValue;
      const sp = spansIn(text).filter((x) => { const key = x.kind + ':' + x.id; if (seen.has(key)) return false; seen.add(key); return true; });
      if (!sp.length) continue;
      const frag = document.createDocumentFragment();
      let at = 0;
      for (const x of sp) {
        if (x.s > at) frag.appendChild(document.createTextNode(text.slice(at, x.s)));
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'hmp'; b.dataset.k = x.kind; b.dataset.id = x.id;
        b.setAttribute('aria-label', `${text.slice(x.s, x.e)}: show on a map`);
        b.innerHTML = esc(text.slice(x.s, x.e)) + PIN;
        frag.appendChild(b);
        at = x.e;
      }
      if (at < text.length) frag.appendChild(document.createTextNode(text.slice(at)));
      node.parentNode.replaceChild(frag, node);
    }
    root.querySelectorAll('.hmp-mini[data-mu]:not([data-drawn]), .hmp-mini[data-region]:not([data-drawn]), .hmp-mini[data-place]:not([data-drawn])').forEach(drawBlock);
  }
  function link(root) {
    if (!root) return;
    const seen = new Set();
    if (D) { linkNow(root, seen); return; }
    load().then(() => { if (root.isConnected) linkNow(root, seen); }, () => {});
  }

  // ---------- mini map (SVG drawn from the outline data) ----------
  const C = { paper: '#fffaf0', ink: '#23261f', moss: '#2f3a2b', sage: '#8a9a6b', bark: '#6b4f35', accent: '#e8590c', land: '#f3eedf', other: '#e7e1cf' };
  const overlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  function view(box, padFrac, minDeg) {
    let [w, s, e, n] = box;
    const cx = (w + e) / 2, cy = (s + n) / 2;
    let dx = Math.max((e - w) * (1 + padFrac), minDeg || 0), dy = Math.max((n - s) * (1 + padFrac), (minDeg || 0) * 0.6);
    const k = Math.cos((cy * Math.PI) / 180);
    const W = 400, H = 250;
    // keep the aspect of the picture: widen the narrow side
    if ((dx * k) / dy > W / H) dy = (dx * k * H) / W; else dx = (dy * W) / H / k;
    w = cx - dx / 2; e = cx + dx / 2; s = cy - dy / 2; n = cy + dy / 2;
    const px = (lon) => ((lon - w) / (e - w)) * W, py = (lat) => ((n - lat) / (n - s)) * H;
    return { box: [w, s, e, n], W, H, px, py, kmPerPx: (dx * 111.32 * k) / W };
  }
  const path = (V, rings) => rings.map((r) => 'M' + r.map(([x, y]) => `${V.px(x).toFixed(1)} ${V.py(y).toFixed(1)}`).join('L') + 'Z').join('');
  const txt = (x, y, t, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="sans-serif" font-size="${o.size || 14}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || C.ink}" text-anchor="${o.anchor || 'middle'}" stroke="${C.paper}" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">${esc(t)}</text>`;
  function scaleBar(V) {
    const target = V.kmPerPx * 90;
    const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find((v) => v >= target * 0.6) || 500;
    const len = nice / V.kmPerPx;
    const x = 12, y = V.H - 14;
    return `<path d="M${x} ${y - 5}V${y}H${(x + len).toFixed(1)}V${y - 5}" fill="none" stroke="${C.ink}" stroke-width="2"/>${txt(x + len / 2, y - 8, `${nice} km`, { size: 13 })}`
      + `<g transform="translate(${V.W - 22} 26)"><path d="M0 -14L7 6L0 1L-7 6Z" fill="${C.ink}"/>${txt(0, 22, 'N', { size: 13, bold: true })}</g>`;
  }
  function labelPlacer() {
    const used = [];
    return (x, y, w = 40, h = 16) => {
      const b = [x - w / 2, y - h, x + w / 2, y + 4];
      if (x < 8 || x > 392 || y < 14 || y > 244) return false;
      if (used.some((u) => overlap(u, b))) return false;
      used.push(b); return true;
    };
  }
  function regionsLayer(V, focusR) {
    let s = '';
    for (const r of D.mu.regions) {
      if (!overlap(r.b, V.box)) continue;
      s += `<path d="${path(V, ring(r))}" fill="${r.id === focusR ? C.land : C.other}" stroke="none"/>`;
    }
    for (const r of D.mu.regions) if (overlap(r.b, V.box)) s += `<path d="${path(V, ring(r))}" fill="none" stroke="${C.bark}" stroke-width="2.4" stroke-dasharray="7 4" stroke-linejoin="round"/>`;
    return s;
  }
  function dot(V, put, lon, lat, name, own) {
    const x = V.px(lon), y = V.py(lat);
    if (x < 4 || x > V.W - 4 || y < 4 || y > V.H - 4) return '';
    const right = x < V.W - 110;
    const lbl = put(right ? x + 50 : x - 50, y + 5, 96, 16);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${own ? 6 : 5}" fill="${own ? C.accent : C.ink}" stroke="${C.paper}" stroke-width="2"/>`
      + (lbl ? txt(right ? x + 9 : x - 9, y + 5, name, { anchor: right ? 'start' : 'end', size: 14, bold: own }) : '');
  }
  // the base or town to show: an owner base in the MU first, then a town in it, then the nearest town
  function anchorFor(m) {
    for (const [k, v] of m.in || []) if (k === 'b') { const b = baseOf(v); if (b) return { name: b.name, lon: b.lon, lat: b.lat, own: true }; }
    for (const [k, v] of m.in || []) if (k === 't') { const t = town(v); if (t) return t; }
    return town(m.ref[0]);
  }
  function muMap(id, opts = {}) {
    const m = D.muById[id]; if (!m) return '';
    const V = opts.place ? placeView(opts.place, m) : view(m.b, 0.45, 0.25);
    const put = labelPlacer();
    let s = regionsLayer(V, m.r);
    const near = D.mu.mus.filter((o) => o !== m && overlap(o.b, V.box));
    for (const o of near) s += `<path d="${path(V, ring(o))}" fill="none" stroke="${C.sage}" stroke-width="1.3" stroke-linejoin="round"/>`;
    s += `<path d="${path(V, ring(m))}" fill="${opts.place ? 'rgba(232,89,12,.08)' : 'rgba(232,89,12,.2)'}" stroke="${C.accent}" stroke-width="${opts.place ? 2.2 : 3.2}" stroke-linejoin="round"/>`;
    // focus label first, then the place or base, then neighbours (faint)
    let labels = '';
    const fx = V.px(m.c[0]), fy = V.py(m.c[1]);
    if (!opts.place && put(fx, fy + 6, 56, 20)) labels += txt(fx, fy + 6, m.id, { size: 17, bold: true, fill: C.accent });
    if (opts.place) {
      const p = opts.place, x = V.px(p.lon), y = V.py(p.lat);
      put(x, y, 30, 34);
      labels += `<path d="M${x} ${y}c-2-6-9-11-9-17a9 9 0 0 1 18 0c0 6-7 11-9 17Z" fill="${C.accent}" stroke="${C.paper}" stroke-width="2"/><circle cx="${x}" cy="${y - 17}" r="3.4" fill="${C.paper}"/>`;
      const right = x < V.W - 130;
      if (put(right ? x + 60 : x - 60, y - 6, 116, 18)) labels += txt(right ? x + 13 : x - 13, y - 8, p.name, { anchor: right ? 'start' : 'end', size: 15, bold: true });
      if (put(fx, fy + 6, 50, 18)) labels += txt(fx, fy + 6, `MU ${m.id}`, { size: 14, bold: true, fill: C.accent });
    } else {
      const a = anchorFor(m);
      if (a) labels += dot(V, put, a.lon, a.lat, a.name, a.own);
    }
    for (const o of near) {
      const x = V.px(o.c[0]), y = V.py(o.c[1]);
      if (put(x, y + 5, 40, 16)) labels += txt(x, y + 5, o.id, { size: 13, fill: '#5b6650' });
    }
    // region names where the region's label point is in view
    for (const r of D.mu.regions) {
      const x = V.px(r.c[0]), y = V.py(r.c[1]);
      if (r.id !== m.r && put(x, y, 90, 16)) labels += txt(x, y, `Region ${r.id}`, { size: 13, fill: C.bark, bold: true });
    }
    return svgWrap(V, s + labels + scaleBar(V), opts.place ? `Map: ${opts.place.name} in MU ${m.id}, ${regName(regOfMu(m))}` : `Map: MU ${m.id} in ${regName(regOfMu(m))}, with the units around it`);
  }
  function placeView(p, m) {
    const wide = m.b[2] - m.b[0] > 1.1;
    const box = wide ? [p.lon - 0.45, p.lat - 0.25, p.lon + 0.45, p.lat + 0.25] : m.b;
    return view(box, wide ? 0 : 0.3, 0.3);
  }
  function regionMap(id) {
    const r = D.regById[id]; if (!r) return '';
    const V = view(r.b, 0.12, 2);
    const put = labelPlacer();
    let s = regionsLayer(V, id);
    for (const m of D.mu.mus) if (m.r === id) s += `<path d="${path(V, ring(m))}" fill="none" stroke="${C.sage}" stroke-width="1" stroke-linejoin="round"/>`;
    s += `<path d="${path(V, ring(r))}" fill="rgba(232,89,12,.12)" stroke="${C.accent}" stroke-width="3" stroke-linejoin="round"/>`;
    let labels = '';
    const x = V.px(r.c[0]), y = V.py(r.c[1]);
    if (put(x, y, 90, 22)) labels += txt(x, y, `Region ${r.id}`, { size: 18, bold: true, fill: C.accent });
    for (const b of (window.HM && window.HM.bases) || []) {
      const mm = muAt(b.lon, b.lat);
      if (mm && mm.r === id) labels += dot(V, put, b.lon, b.lat, b.name.replace(/ \(.*\)$/, ''), true);
    }
    for (const i of r.cities || []) { const t = town(i); if (t) labels += dot(V, put, t.lon, t.lat, t.name, false); }
    for (const o of D.mu.regions) {
      const ox = V.px(o.c[0]), oy = V.py(o.c[1]);
      if (o.id !== id && put(ox, oy, 70, 16)) labels += txt(ox, oy, `Region ${o.id}`, { size: 13, fill: C.bark, bold: true });
    }
    return svgWrap(V, s + labels + scaleBar(V), `Map: ${regName(r)} and the regions around it`);
  }
  const svgWrap = (V, inner, label) => `<svg class="hmp-svg" viewBox="0 0 ${V.W} ${V.H}" role="img" aria-label="${esc(label)}"><rect width="${V.W}" height="${V.H}" fill="#dfe6ee"/>${inner}</svg>`;
  // point in polygon on the small outlines (good enough to say which MU a base sits in)
  function inRing(pt, r) {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function muAt(lon, lat) {
    for (const m of D.mu.mus) if (lon >= m.b[0] && lon <= m.b[2] && lat >= m.b[1] && lat <= m.b[3] && ring(m).some((r) => inRing([lon, lat], r))) return m;
    return null;
  }

  // ---------- plain words from the data ----------
  const list = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  function muWords(m) {
    const r = regOfMu(m);
    const own = [], tw = [];
    for (const [k, v] of m.in || []) {
      if (k === 'b') { const b = baseOf(v); if (b) own.push(b.name.replace(/ \(.*\)$/, '') + ' (your base)'); } else { const t = town(v); if (t && !own.some((o) => o.startsWith(t.name))) tw.push(t.name); }
    }
    const inside = own.concat(tw).slice(0, 3);
    const ref = town(m.ref[0]);
    const far = ref && m.ref[1] >= 3 ? `about ${m.ref[1]} km ${m.ref[2]} of ${ref.name}` : ref ? `at ${ref.name}` : '';
    const lines = [`MU ${m.id} is in ${regName(r)}.`];
    if (inside.length) lines.push(`It is the area around ${list(inside)}${far ? `. Its centre is ${far}` : ''}.`);
    else if (far) lines.push(`Its centre is ${far}.`);
    lines.push(`About ${m.km2.toLocaleString('en-CA')} km² (square kilometres). Next to it: ${m.nb.length ? list(m.nb.map((x) => `MU ${x}`)) : 'no other unit'}.`);
    return lines;
  }
  function regionWords(r) {
    const lines = [`${regName(r)} is one of the 9 hunting regions of BC (British Columbia). It holds ${r.mus} MUs (Management Units), numbered ${r.id.replace(/[AB]$/, '')}-1 and up.`];
    const cities = (r.cities || []).map((i) => town(i).name);
    if (cities.length) lines.push(`Cities in it: ${list(cities.slice(0, 6))}${cities.length > 6 ? ' and more' : ''}.`);
    return lines;
  }
  const certB = (v) => `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}">${v}%</span>`;
  const hasLesson = (id) => !!(id && window.HM && window.HM.sessions && window.HM.sessions.some((s) => s.id === id));
  function rulesBtn(r) {
    if (!r) return '';
    if (hasLesson(r.lesson)) return `<a class="btn" href="#/s/${esc(r.lesson)}">Rules for Region ${esc(r.id)}</a>`;
    return '';
  }
  const SRC_MU = 'Outline: BC Data Catalogue Management Units layer, simplified for this small map (data date 2026-10-03). Towns: BC Geographical Names.';

  // ---------- the pop up ----------
  function sheet(html) {
    const body = document.getElementById('sheet-body'), sh = document.getElementById('sheet');
    if (!body || !sh) return;
    body.innerHTML = `<div class="hmp-sheet">${html}</div>`;
    sh.hidden = false;
    const card = sh.querySelector('.sheet-card'); if (card) card.scrollTop = 0;
  }
  function open(kind, id) {
    if (!D) {
      sheet('<p class="muted">Loading the map...</p>');
      load().then(() => open(kind, id), () => sheet('<h2>Map not saved yet</h2><p>Open the app once with signal to save the place maps on this phone.</p>'));
      return;
    }
    if (kind === 'mu') {
      const m = D.muById[id]; if (!m) return;
      const r = regOfMu(m);
      sheet(`<h2>MU ${esc(m.id)} <small class="muted">MU (Management Unit)</small></h2>${muMap(m.id)}
        <div class="hmp-words">${muWords(m).map((l) => `<p>${esc(l)}</p>`).join('')}</div>
        <p class="hmp-src muted">${esc(SRC_MU)} ${certB(95)} Outline is for finding the area only. The Hunt Map shows the exact line.</p>
        <div class="btn-row hmp-btns"><a class="btn primary" href="#/map/mu/${esc(m.id)}">Open on Hunt Map</a>${rulesBtn(r)}</div>`);
      linkNow(document.querySelector('.hmp-words'), new Set(['mu:' + m.id]));
    } else if (kind === 'region') {
      const r = D.regById[id]; if (!r) return;
      sheet(`<h2>${esc(regName(r))}</h2>${regionMap(r.id)}
        <div class="hmp-words">${regionWords(r).map((l) => `<p>${esc(l)}</p>`).join('')}</div>
        <p class="hmp-src muted">Outline: all the region's MUs joined, BC Data Catalogue (data date 2026-10-03). ${certB(95)}${r.lesson && !hasLesson(r.lesson) ? ' The Rule Book lesson for this region is not in the app yet.' : !r.lesson ? ' No Rule Book lesson for this region yet.' : ''}</p>
        <div class="btn-row hmp-btns"><a class="btn primary" href="#/map/region/${esc(r.id)}">Open on Hunt Map</a>${rulesBtn(r)}</div>`);
    } else if (kind === 'place') {
      const p = D.placeById[id]; if (!p) return;
      const m = D.muById[p.mu], r = m && regOfMu(m);
      sheet(`<h2>${esc(p.name)} <small class="muted">${esc(p.type)}</small></h2>${m ? muMap(m.id, { place: p }) : ''}
        <div class="hmp-words"><p>${esc(p.desc)}</p>${p.note ? `<p class="muted">${esc(p.note)}</p>` : ''}</div>
        <p class="hmp-src muted">Source: ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.source)}</a>` : esc(p.source)} ${certB(p.cert)}</p>
        <div class="btn-row hmp-btns"><a class="btn primary" href="#/map/place/${esc(p.id)}">Open on Hunt Map</a>${m ? `<button type="button" class="btn hmp-go" data-k="mu" data-id="${esc(m.id)}">MU ${esc(m.id)}</button>` : ''}</div>
        ${rulesBtn(r) ? `<div class="btn-row">${rulesBtn(r)}</div>` : ''}`);
      linkNow(document.querySelector('.hmp-words'), new Set(['place:' + p.id]));
    }
  }
  // lesson block: a mini map in the page (MU, region or place)
  function drawBlock(el) {
    el.dataset.drawn = '1';
    const mu = el.dataset.mu, rg = el.dataset.region, pl = el.dataset.place;
    let svg = '', cap = '', k = '', id = '';
    if (mu && D.muById[mu]) { svg = muMap(mu); cap = muWords(D.muById[mu]).slice(0, 2).join(' '); k = 'mu'; id = mu; }
    else if (rg && D.regById[rg]) { svg = regionMap(rg); cap = regionWords(D.regById[rg])[0]; k = 'region'; id = rg; }
    else if (pl && D.placeById[pl]) { const p = D.placeById[pl]; svg = muMap(p.mu, { place: p }); cap = p.desc; k = 'place'; id = pl; }
    else { el.innerHTML = '<p class="verify">Map missing</p>'; return; }
    el.innerHTML = `<figure class="hmp-fig">${svg}<figcaption>${esc(el.dataset.cap || cap)} <button type="button" class="linkish hmp-go" data-k="${k}" data-id="${esc(id)}">More</button></figcaption></figure>`;
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.hmp, .hmp-go');
    if (!b) return;
    e.preventDefault();
    open(b.dataset.k, b.dataset.id);
  });

  window.HMPlaces = { link, open, load, _spans: (t) => (D ? spansIn(t) : null) };
})();
