/* Ask the app: offline question box. Ranks every screen, glossary term and regs item already loaded in window.HM.
   BM25 with title boosts and hunter synonyms (same scoring as the mentor's search). Index lives in memory only. */
(function () {
  'use strict';
  const HM = window.HM;
  if (!HM) return;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const badge = (v) => `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}" title="Certainty">${v}%</span>`;
  const VERIFY = '<span class="verify">VERIFY</span>';

  // ---------- tokens ----------
  const STOP = {};
  ('a an and are as at be but by can do does for from has have how i if in into is it its me my of on or so than that the their them then there these they this to up was we what when where which who why will with you your yours about any all also get got just like should would could need want tell explain plain words rule rules mean means am im okay ok please use using go going').split(' ').forEach((w) => { STOP[w] = 1; });
  const MONTH = { january: 'jan', february: 'feb', march: 'mar', april: 'apr', june: 'jun', july: 'jul', august: 'aug', september: 'sep', sept: 'sep', october: 'oct', november: 'nov', december: 'dec' };
  function stem(w) {
    if (/^\d/.test(w) || w.length < 4) return w;
    if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (/(ss|us|is)$/.test(w)) return w;
    if (/ing$/.test(w) && w.length > 5) return w.slice(0, -3);
    if (/es$/.test(w) && /(sh|ch|x|z)es$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  const NC = Object.create(null);
  const norm = (w) => { let v = NC[w]; if (v === undefined) { v = NC[w] = stem(MONTH[w] || w); } return v; };
  const DASH = /[‐-―]/;
  const TOK = /\d+-\d+|[a-z0-9]+(?:'[a-z]+)?/g;
  function toks(text) {
    const out = [];
    let t = String(text).toLowerCase();
    if (DASH.test(t)) t = t.replace(/(\d+)\s*[‐-―]\s*(\d+)/g, '$1-$2');
    const ws = t.match(TOK); if (!ws) return out;
    for (let i = 0; i < ws.length; i++) {
      let w = ws[i];
      if (w.charCodeAt(0) < 58 && i && ws[i - 1] === 'region' && /^\d[ab]?$/.test(w)) out.push('region' + w);
      if (w.length < 2) continue;
      if (w.indexOf("'") > 0) w = w.replace(/'[a-z]+$/, '');
      if (STOP[w] !== 1) out.push(norm(w));
    }
    return out;
  }
  // Hunter phrasing. Keys and values are matched after stemming. [term, weight]
  const SYN = {
    buck: [['deer', 0.5], ['antler', 0.35], ['point', 0.35], ['mule', 0.3]], doe: [['antlerless', 0.6], ['deer', 0.4]], deer: [['buck', 0.35]],
    tag: [['species', 0.6], ['licence', 0.7], ['tagging', 0.4]], license: [['licence', 1]], licensing: [['licence', 1]], permit: [['licence', 0.5]],
    quail: [['upland', 0.5], ['california', 0.4]], grouse: [['upland', 0.5], ['ruffed', 0.3], ['spruce', 0.3], ['dusky', 0.3]], upland: [['quail', 0.4], ['grouse', 0.4]],
    partridge: [['upland', 0.5], ['huns', 0.5]], pheasant: [['upland', 0.5]], chukar: [['upland', 0.4]],
    shell: [['shot', 0.6], ['load', 0.4], ['ammunition', 0.4], ['shotgun', 0.3]], shot: [['steel', 0.4], ['toxic', 0.4], ['load', 0.4], ['shell', 0.3]],
    ammo: [['ammunition', 0.6], ['load', 0.4], ['shot', 0.4], ['cartridge', 0.4]], bullet: [['ammunition', 0.4], ['load', 0.4], ['cartridge', 0.4]],
    caliber: [['calibre', 1], ['cartridge', 0.4]], calibre: [['cartridge', 0.4]], gun: [['shotgun', 0.4], ['rifle', 0.4], ['firearm', 0.5]], firearm: [['gun', 0.3]],
    22: [['rimfire', 0.6]], 12: [['gauge', 0.4]], 20: [['gauge', 0.3]],
    atv: [['quad', 0.6], ['orv', 0.6]], quad: [['atv', 1], ['orv', 0.6]], utv: [['atv', 0.6], ['orv', 0.6]], sxs: [['atv', 0.6], ['orv', 0.6]], bike: [['orv', 0.3]],
    duck: [['waterfowl', 0.4], ['migratory', 0.4]], goose: [['geese', 0.8], ['migratory', 0.4]], geese: [['goose', 0.5], ['migratory', 0.4]],
    legal: [['lawful', 0.4], ['season', 0.35], ['allowed', 0.35], ['law', 0.3]], allowed: [['legal', 0.5], ['lawful', 0.4]], lawful: [['legal', 0.5]],
    shoot: [['hunt', 0.35], ['shooting', 0.35]], shooting: [['shoot', 0.3]], hour: [['sunrise', 0.5], ['sunset', 0.5], ['light', 0.5]], time: [['sunrise', 0.3], ['sunset', 0.3]],
    dark: [['sunset', 0.4]], dawn: [['sunrise', 0.6]], dusk: [['sunset', 0.6]],
    season: [['open', 0.3], ['close', 0.3]], open: [['season', 0.4]], bag: [['limit', 0.5]], limit: [['bag', 0.3]], many: [['limit', 0.4], ['bag', 0.4]],
    okanagan: [['region8', 0.9]], penticton: [['region8', 0.9]], oliver: [['region8', 0.8]], vernon: [['region8', 0.8]], kelowna: [['region8', 0.9]], kamloop: [['region3', 0.5]], heffley: [['region3', 0.4]], fraser: [['region2', 0.4]], mission: [['region2', 0.4]],
    whitetail: [['white', 0.6], ['tailed', 0.6]], muley: [['mule', 1]], bear: [['black', 0.3]], cost: [['fee', 0.5], ['price', 0.4]], fee: [['cost', 0.3]],
  };
  const SPECIES = new Set('deer buck doe mule whitetail elk moose bear duck goose geese grouse quail chukar pheasant partridge ptarmigan sheep goat caribou bison cougar wolf coyote turkey hare rabbit squirrel brant'.split(' ').map(norm));
  const MONTHS = new Set(['jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']);
  function queryTerms(q) {
    const terms = {}; const base = toks(q);
    base.forEach((w) => { terms[w] = 1; });
    const add = (t, wt) => { if (!(terms[t] >= wt)) terms[t] = wt; };
    base.forEach((w) => {
      (SYN[w] || []).forEach(([s, wt]) => add(norm(s), wt));
      const mu = /^(\d)-\d+$/.exec(w); if (mu) { add('region' + mu[1], 0.4); add('mu', 0.3); }
      if (MONTHS.has(w)) add('season', 0.35);
    });
    if (/\b(can i|is it legal|am i allowed|legal to|allowed to)\b/i.test(q)) { add('legal', 0.5); add('lawful', 0.3); }
    return { terms, base };
  }

  // ---------- index (built once, in memory) ----------
  let IX = null;
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', '#39': "'", '#10003': '', '#9744': '' };
  function htmlText(h) {
    if (h.indexOf('<svg') >= 0 || h.indexOf('<figure') >= 0) h = h.replace(/<figure[\s\S]*?<\/figure>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ');
    return h
      .replace(/<span class="cert[^"]*"[^>]*>(\d+)%<\/span>/g, ' \u0001$1\u0002')
      .replace(/<(\/(li|p|tr|h3|h4|div|aside|figcaption)|br|li|tr|h3|h4)\b[^>]*>/g, '\n')
      .replace(/<\/t[dh]>/g, '; ').replace(/<[^>]+>/g, '')
      .replace(/&(#?\w+);/g, (m, e) => (e in ENT ? ENT[e] : m));
  }
  function sentencesOf(text) {
    const out = [];
    text.split('\n').forEach((line) => {
      line = line.replace(/\s+/g, ' ').replace(/(;\s*)+$/, '').trim();
      if (line.length < 3) return;
      if (line.length <= 240) { out.push(line); return; }
      line.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).forEach((s) => { if (s.trim().length > 2) out.push(s.trim()); });
    });
    return out;
  }
  function build() {
    const t0 = performance.now();
    // only token arrays here; term counts and document frequency are worked out per question (one fast scan)
    const docs = []; let total = 0;
    const regsScreen = {};
    const add = (d, title, sess, body) => {
      d.b = toks(body); d.ti = toks(title); d.se = typeof sess === 'string' ? toks(sess) : sess;
      d.len = d.b.length + d.ti.length * 3 + d.se.length * 2; total += d.len;
      docs.push(d);
    };
    HM.sessions.forEach((s) => {
      const sname = `${s.phase}.${s.num} ${s.title}`, stoks = toks(s.title);
      s.steps.forEach((st, i) => {
        const r = /data-regs="([^"]+)"/.exec(st.html);
        if (r) r[1].split(',').forEach((k) => { if (!regsScreen[k]) regsScreen[k] = `#/s/${s.id}/${i}`; });
        const text = htmlText(st.html);
        add({ type: 'screen', sid: s.id, step: i, sess: sname, title: st.title, text }, st.title, stoks, text);
      });
    });
    Object.entries(HM.glossary).forEach(([term, def]) => {
      const text = htmlText(def);
      add({ type: 'term', title: term, text }, term + ' glossary', '', text);
    });
    // hidden keywords so a rule row is found by the words hunters use (official region names, season, limit)
    const RN = { 1: 'Vancouver Island', 2: 'Lower Mainland', 3: 'Thompson', 4: 'Kootenay', 5: 'Cariboo', 6: 'Skeena', 7: 'Omineca Peace', 8: 'Okanagan' };
    HM.regs.items.forEach((r) => {
      const text = `${r.value || 'VERIFY'}${r.note ? '\n' + r.note : ''}`;
      const all = r.label + ' ' + text, extra = [];
      (all.match(/Regions? \d/g) || []).forEach((m) => extra.push(RN[m.slice(-1)]));
      if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/.test(all)) extra.push('season');
      if (/\b(daily|possession|bag)\b/i.test(all)) extra.push('limit');
      add({ type: 'reg', reg: r, title: r.label, text, cert: r.certainty }, r.label, r.group + ' ' + extra.join(' '), text);
    });
    const H = HM.regs.hours || {};
    [['bigGame', 'Legal shooting hours: big game and upland birds'], ['migratory', 'Legal shooting hours: ducks and geese']].forEach(([k, label]) => {
      if (H[k]) add({ type: 'reg', hours: true, title: label, text: H[k].text, cert: H[k].certainty, link: '#/field/light' }, label + ' sunrise sunset time', 'legal hours', H[k].text);
    });
    docs.forEach((d) => { if (d.type === 'reg' && !d.link) d.link = regsScreen[d.reg.key] || regsScreen[d.reg.group] || '#/sources'; });
    IX = { docs, df: new Map(), N: docs.length, avg: total / docs.length, ms: Math.round(performance.now() - t0) };
    return IX;
  }
  const idf = (w) => { const n = IX.df.get(w) || 0; return Math.log(1 + (IX.N - n + 0.5) / (n + 0.5)); };

  function rank(q) {
    if (!IX) build();
    const { terms, base } = queryTerms(q);
    const keys = Object.keys(terms); if (!keys.length) return { terms, base, list: [] };
    const K1 = 1.2, B = 0.6, list = [];
    const licQ = base.some((w) => /^(tag|licence|license|permit)$/.test(w));
    const want = Object.create(null); keys.forEach((w) => { want[w] = 1; });
    const df = new Map(), hits = [];
    const count = (arr, wt, c) => { for (let i = 0; i < arr.length; i++) { const w = arr[i]; if (want[w] === 1) { (c || (c = {}))[w] = (c[w] || 0) + wt; } } return c; };
    for (const d of IX.docs) {
      let c = count(d.b, 1, null); c = count(d.ti, 3, c); c = count(d.se, 2, c);
      if (!c) continue;
      for (const w in c) df.set(w, (df.get(w) || 0) + 1);
      hits.push([d, c]);
    }
    IX.df = df;
    for (const [d, c] of hits) {
      let sc = 0, hit = 0;
      for (const w in c) {
        const f = c[w];
        if (terms[w] === 1) hit++;
        sc += terms[w] * idf(w) * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.len / IX.avg));
      }
      sc *= 1 + 0.25 * hit;
      if (licQ && d.type === 'reg' && d.reg && d.reg.group === 'licence') sc *= 1.6;
      list.push({ d, sc, hit, c });
    }
    list.sort((a, b) => b.sc - a.sc);
    return { terms, base, list };
  }
  // a quick answer must name the animal the question names (buck counts as deer)
  function sameAnimal(r, base) {
    const want = base.filter((w) => SPECIES.has(w)); if (!want.length) return true;
    const have = r.c;
    return want.some((w) => have[w] || (SYN[w] || []).some(([s, wt]) => wt >= 0.5 && SPECIES.has(norm(s)) && have[norm(s)]));
  }

  // ---------- passage: the 2 or 3 sentences with the most query weight ----------
  function bestSentences(text, terms, n) {
    const ss = sentencesOf(text);
    const scored = ss.map((s, i) => {
      const seen = {}; let sc = 0;
      toks(s).forEach((w) => { if (terms[w] && !seen[w]) { seen[w] = 1; sc += terms[w] * idf(w); } });
      return { s, i, sc: sc / Math.sqrt(1 + s.length / 160) };
    }).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, n);
    const pick = scored.length ? scored : ss.slice(0, 1).map((s, i) => ({ s, i }));
    return pick.sort((a, b) => a.i - b.i).map((x) => x.s);
  }
  function hl(raw, terms) {
    // escape piece by piece so marks never land inside an entity; cert markers become badges
    return String(raw).split(/(\u0001\d+\u0002|\bVERIFY\b|\d+-\d+|[A-Za-z0-9]+(?:'[a-z]+)?)/).map((p, k) => {
      if (!(k % 2)) return esc(p);
      const c = /^\u0001(\d+)\u0002$/.exec(p); if (c) return badge(+c[1]);
      if (p === 'VERIFY') return VERIFY;
      const w = p.toLowerCase().replace(/'[a-z]+$/, '');
      return !STOP[w] && terms[norm(w)] >= 0.5 ? `<mark class="hma-m">${esc(p)}</mark>` : esc(p);
    }).join('');
  }

  // ---------- view ----------
  const EXAMPLES = ['Is a 4 point buck legal in 3-27 in November?', 'What shot for ducks?', 'Can I use a .22 for grouse?', 'Legal shooting hours'];
  const setTitle = (t) => { const h = $('#top-title'); if (h) h.textContent = t; };
  const tab = () => document.querySelectorAll('.tabs a').forEach((a) => a.classList.remove('on'));
  function card(r, terms, quick) {
    const d = r.d;
    if (d.type === 'reg') {
      const val = d.reg ? (d.reg.value ? hl(d.reg.value, terms) : VERIFY) : hl(d.text, terms);
      const note = d.reg && d.reg.note ? `<div class="muted">${hl(d.reg.note, terms)}</div>` : '';
      const src = d.reg ? `<div class="muted">${esc(d.reg.source || '')}${d.reg.page ? `, ${esc(d.reg.page)}` : ''}${d.reg.checked ? `. Checked ${esc(d.reg.checked)}` : ''}</div>` : '';
      return `<div class="card hma-card${quick ? ' hma-quick' : ''}">${quick ? '<div class="hma-k">Quick answer: rule</div>' : '<div class="hma-k">Rule</div>'}
        <h3>${esc(d.title)}</h3><p>${val} ${d.cert != null ? badge(d.cert) : VERIFY}</p>${note}${src}
        <a class="hma-open" href="${d.link}">${d.hours ? 'Open legal light times' : 'Open this screen'}</a></div>`;
    }
    if (d.type === 'term') {
      return `<div class="card hma-card${quick ? ' hma-quick' : ''}"><div class="hma-k">${quick ? 'Quick answer: glossary' : 'Glossary'}</div>
        <h3>${esc(d.title)}</h3><p>${hl(d.text.replace(/\s+/g, ' ').trim(), terms)}</p><a class="hma-open" href="#/glossary">Open the glossary</a></div>`;
    }
    const ss = bestSentences(d.text, terms, 3);
    return `<div class="card hma-card"><div class="hma-k">${esc(d.sess)}</div><h3>${esc(d.title)}</h3>
      <ul class="hma-ss">${ss.map((s) => `<li>${hl(s, terms)}</li>`).join('')}</ul>
      <a class="hma-open" href="#/s/${d.sid}/${d.step}">Open this screen</a></div>`;
  }
  function answer(q) {
    const t0 = performance.now();
    const { terms, base, list } = rank(q);
    if (!list.length) return { html: '<div class="card"><h3>No match</h3><p>Try other words, like the animal, the place or the gear.</p></div>', ms: 0 };
    // quick answer: a rule or glossary term that matches most of the question and ranks near the top screen
    const topScreen = list.find((r) => r.d.type === 'screen');
    const need = Math.max(1, Math.ceil(base.filter((w, i) => base.indexOf(w) === i).length * 0.5));
    const quick = list.filter((r) => r.d.type !== 'screen' && r.hit >= need && sameAnimal(r, base) && (!topScreen || r.sc >= topScreen.sc * 0.55)).slice(0, 2);
    const qs = quick.length > 1 && quick[1].sc < quick[0].sc * 0.6 ? quick.slice(0, 1) : quick;
    // a rule row often has a sibling (mule deer and white tailed deer for one MU): show both so the answer is not one sided
    if (qs.length === 1 && qs[0].d.reg) {
      const g = qs[0].d.reg.group, mus = base.filter((w) => /^\d-\d+$/.test(w)).concat(Object.keys(terms).filter((w) => /^region\d/.test(w) && terms[w] >= 0.9));
      const sib = list.find((r) => r !== qs[0] && r.d.reg && r.d.reg.group === g && r.sc >= qs[0].sc * 0.35 && sameAnimal(r, base) && mus.every((m) => r.c[m]));
      if (sib) qs.push(sib);
    }
    const used = new Set(qs.map((r) => r.d)), per = {}, cards = [];
    for (const r of list) {
      if (cards.length >= 5) break;
      if (used.has(r.d)) continue;
      const key = r.d.sid || r.d.type; per[key] = (per[key] || 0) + 1;
      if (per[key] > (r.d.type === 'screen' ? 2 : 1)) continue;
      cards.push(r);
    }
    const html = (qs.length ? qs.map((r) => card(r, terms, true)).join('') : '') +
      `<h2 class="hma-h">${qs.length ? 'More from the app' : 'Best matches in the app'}</h2>` + cards.map((r) => card(r, terms, false)).join('');
    return { html, ms: Math.round(performance.now() - t0), quick: qs, cards };
  }

  function mentorBox(q) {
    const url = (window.HuntMentor && window.HuntMentor.mentorUrl) || '';
    if (!url || !q) return '';
    return `<div class="card hma-mentor" id="hma-mentor"${navigator.onLine ? '' : ' hidden'}><p class="muted">Not what you need? You have signal, so the mentor can help.</p>
      <a class="btn block" id="hma-ask-mentor" href="${esc(url)}" target="_blank" rel="noopener">Ask the mentor</a>
      <p class="muted">Your question is copied. Paste it in the mentor.</p></div>`;
  }
  function toast(msg) {
    const el = $('.hm-toast'); if (!el) return;
    el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 3500);
  }
  function copy(text) {
    const legacy = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove(); return ok; };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, legacy);
    return Promise.resolve(legacy());
  }

  function view(param) {
    const root = $('#view');
    const q = param ? decodeURIComponent(param.join('/')) : '';
    setTitle('Ask the app'); tab();
    root.innerHTML = `<form class="hma-form" id="hma-f" role="search">
        <label class="f" for="hma-q">Ask a question. Works with no signal.</label>
        <div class="hma-row"><input type="search" id="hma-q" enterkeyhint="search" autocomplete="off" placeholder="Is a 4 point buck legal in 3-27?" value="${esc(q)}">
        <button class="btn primary" type="submit">Ask</button></div></form>
      <div id="hma-res">${q ? '' : `<p class="muted">Try one of these:</p><div class="hma-ex">${EXAMPLES.map((e) => `<a class="pill" href="#/ask/${encodeURIComponent(e)}">${esc(e)}</a>`).join('')}</div>
        <p class="muted">Answers come from the screens, rules and glossary in this app. Open the screen to read it all.</p>`}</div>`;
    $('#hma-f').onsubmit = (e) => {
      e.preventDefault();
      const v = $('#hma-q').value.trim(); if (!v) return;
      $('#hma-q').blur();
      const h = '#/ask/' + encodeURIComponent(v);
      if (location.hash === h) view(param); else location.hash = h;
    };
    if (!q) {
      if (!('ontouchstart' in window)) $('#hma-q').focus();
      if (!IX) setTimeout(() => { if (!IX) build(); }, 120); // build while the owner types
      return;
    }
    const a = answer(q);
    $('#hma-res').innerHTML = a.html + mentorBox(q);
    const m = $('#hma-ask-mentor');
    if (m) m.onclick = () => { copy(q).then((ok) => toast(ok ? 'Question copied. Tap Paste in the mentor.' : 'Copy did not work, so type your question in the mentor.')); };
    window.scrollTo(0, 0);
  }
  const syncOnline = () => { const m = $('#hma-mentor'); if (m) m.hidden = !navigator.onLine; };
  window.addEventListener('online', syncOnline); window.addEventListener('offline', syncOnline);

  // ---------- small Ask button in the session screen header ----------
  function headerBtn() {
    const top = $('header.top'), search = $('#btn-search');
    if (!top || $('#btn-ask')) return;
    const b = document.createElement('button');
    b.className = 'icon-btn hma-hbtn'; b.id = 'btn-ask'; b.type = 'button'; b.textContent = 'Ask'; b.setAttribute('aria-label', 'Ask the app a question'); b.hidden = true;
    b.onclick = () => { location.hash = '#/ask'; };
    top.insertBefore(b, search || null);
    const sync = () => { b.hidden = !/^#\/s\//.test(location.hash); };
    window.addEventListener('hashchange', sync); sync();
  }

  const css = `.hma-row{display:flex;gap:8px;align-items:stretch}.hma-row input{flex:1;min-width:0}.hma-row .btn{min-height:48px;padding:0 16px}
  .hma-ex{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 12px}.hma-ex .pill{text-decoration:none;color:var(--ink);padding:6px 10px;font-size:15px;border:1px solid var(--line);border-radius:999px;background:var(--card)}
  #hma-res{margin-top:14px}.hma-h{font-size:17px;margin:18px 0 8px;color:var(--muted)}.hma-card h3{margin:2px 0 6px;font-size:18px}
  .hma-k{font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}
  .hma-quick{border:2px solid var(--accent)}.hma-quick .hma-k{color:var(--accent)}.hma-card p{margin:6px 0;overflow-wrap:anywhere}
  .hma-ss{margin:6px 0 8px;padding-left:20px}.hma-ss li{margin:4px 0;overflow-wrap:anywhere}
  .hma-open{display:inline-flex;align-items:center;min-height:44px;font-weight:700}
  mark.hma-m{background:rgba(232,89,12,.22);color:inherit;border-radius:3px;padding:0 1px}
  :root[data-theme="dark"] mark.hma-m{background:rgba(255,122,46,.32)}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="sun"]) mark.hma-m{background:rgba(255,122,46,.32)}}
  :root[data-theme="sun"] mark.hma-m{background:none;font-weight:800;text-decoration:underline 2px}
  .hma-hbtn{font-size:16px;font-weight:700;min-width:44px;padding:0 6px}.hma-hbtn[hidden]{display:none}.hma-mentor[hidden]{display:none}`;
  function init() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    headerBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.HMRoutes = window.HMRoutes || {};
  window.HMRoutes.ask = view;
  window.HMAsk = { build, rank, answer, stats: () => IX && { docs: IX.N, ms: IX.ms } };
})();
