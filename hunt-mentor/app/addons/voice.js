/* Read aloud (add on): a hands free reader for lesson screens (#/s/...) and flashcards (#/cards/<deck>, #/daily).
   Uses the phone's own voice (window.speechSynthesis; works offline with the voices installed on an iPhone).
   No route of its own: it watches #view and injects a small control bar above the lesson screen or the card.
   Reads the screen title, then the text in order. Skips the code inside drawings and reads their caption or
   description instead. Settings (speed, voice, keep going) live in localStorage under hm.voice.* on this phone.
   If the browser has no speechSynthesis, nothing is shown. */
(function () {
  'use strict';
  const SS = window.speechSynthesis;
  if (!SS || typeof window.SpeechSynthesisUtterance !== 'function') return;

  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // ---------- settings (hm.voice.*) ----------
  const RATES = [0.8, 1, 1.2];
  const get = (k, d) => { try { const v = localStorage.getItem('hm.voice.' + k); return v == null ? d : v; } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem('hm.voice.' + k, String(v)); } catch (e) { /* storage blocked */ } };
  const cfg = {
    rate: RATES.includes(+get('rate', 1)) ? +get('rate', 1) : 1,
    voice: get('voice', ''), // voiceURI
    auto: get('auto', '0') === '1', // keep going to the next screen of the lesson
    more: get('more', '0') === '1', // also read closed "More" sections
  };

  // ---------- voices: English, Canada first ----------
  let voices = [], bar = null;
  const langRank = (l) => { l = String(l || '').replace('_', '-').toLowerCase(); return l === 'en-ca' ? 0 : l === 'en-us' ? 1 : l === 'en-gb' ? 2 : l.indexOf('en') === 0 ? 3 : 9; };
  function loadVoices() {
    let all = []; try { all = SS.getVoices() || []; } catch (e) { all = []; }
    voices = all.filter((v) => langRank(v.lang) < 9).sort((a, b) => langRank(a.lang) - langRank(b.lang) || (b.localService === true) - (a.localService === true) || String(a.name).localeCompare(String(b.name)));
    if (bar) fillVoices();
  }
  const pickVoice = () => voices.find((v) => v.voiceURI === cfg.voice) || voices[0] || null;
  loadVoices();
  try { if (SS.addEventListener) SS.addEventListener('voiceschanged', loadVoices); else SS.onvoiceschanged = loadVoices; } catch (e) { /* old browser */ }

  // ---------- text for speech ----------
  const SPELL_OK = new Set(['VERIFY', 'CORE', 'NOT', 'NO', 'YES', 'DO', 'STOP', 'AND', 'OR', 'THE', 'ALL', 'ONE', 'TWO', 'OK', 'NEVER', 'ALWAYS', 'WAIT', 'DEAD', 'LOOK', 'SAFE']);
  const UNITS = { km: 'kilometres', m: 'metres', cm: 'centimetres', mm: 'millimetres', yd: 'yards', yds: 'yards', ft: 'feet', kg: 'kilograms', g: 'grams', lb: 'pounds', lbs: 'pounds', gr: 'grains', h: 'hours', min: 'minutes', hr: 'hours', hrs: 'hours', L: 'litres', mL: 'millilitres', ha: 'hectares', fps: 'feet per second', moa: 'M O A', MOA: 'M O A' };
  function speakable(t) {
    t = String(t || '');
    t = t.replace(/[←-⇿➔➤▶◀✓✔✕✗·•]/g, (c) => (/[→➔➤]/.test(c) ? ' to ' : ' '));
    t = t.replace(/\bMUs?\s+(\d)\s*[-‐‑–]\s*(\d{1,2})\b/g, (m, a, b) => `${/MUs/.test(m) ? 'M Us' : 'M U'} ${a} ${b}`); // MU 2-18 -> M U 2 18
    t = t.replace(/\b(\d)-(\d{1,2})\b(?!\s*(?:%|m\b|km|yd|cm|mm|kg|lb))/g, '$1 $2'); // bare MU codes like 2-19
    t = t.replace(/(\d)\s*[-–]\s*(\d)/g, '$1 to $2'); // other number ranges
    t = t.replace(/\$\s?(\d[\d,]*(?:\.\d\d)?)/g, '$1 dollars');
    t = t.replace(/(^|[\s(])[-\u2212](\d)/g, '$1minus $2');
    t = t.replace(/(\d)\s*°\s*C\b/g, '$1 degrees Celsius').replace(/(\d)\s*°\s*F\b/g, '$1 degrees Fahrenheit').replace(/°/g, ' degrees');
    t = t.replace(/(\d)\s*km\/h\b/g, '$1 kilometres per hour');
    t = t.replace(/(\d)\s*(km|m|cm|mm|yds?|ft|kg|g|lbs?|gr|hrs?|h|min|L|mL|ha|fps|moa|MOA)\b(?!\w)/g, (m, n, u) => `${n} ${UNITS[u]}`);
    t = t.replace(/\s*%/g, ' percent');
    t = t.replace(/\be\.g\./gi, 'for example').replace(/\bi\.e\./gi, 'that is').replace(/\bvs\.?(?=\s)/g, 'versus');
    t = t.replace(/&/g, ' and ').replace(/\s\/\s/g, ' or ').replace(/[≥]/g, ' at least ').replace(/[≤]/g, ' at most ').replace(/×/g, ' times ').replace(/\+(?=\s|$)/g, ' plus');
    t = t.replace(/\b([A-Z]{2,4})(s?)\b/g, (m, w, s) => (SPELL_OK.has(w) ? m : w.split('').join(' ') + (s ? "'s" : ''))); // MU -> M U, BC -> B C
    t = t.replace(/[_*#|~^<>{}[\]]/g, ' ').replace(/\s+([.,;:!?])/g, '$1').replace(/\s{2,}/g, ' ');
    return t.trim();
  }

  // ---------- reading order: walk the screen like a person reads it ----------
  const SKIP = 'script, style, .credit, .hmv-bar, .steps-count, .steps-dots, .steps-nav, .anim-replay, .yt-play, .segs, .lesson-bar, .lesson-nav, noscript, template, [aria-hidden="true"], .sr-skip';
  const BLOCK = /^(P|LI|H1|H2|H3|H4|H5|H6|FIGCAPTION|TR|DT|DD|SUMMARY|LABEL|BLOCKQUOTE|ASIDE|DIV|SECTION|ARTICLE|FIGURE|UL|OL|TABLE|DETAILS|PRE)$/;
  const hiddenEl = (el) => {
    if (el.hidden) return true;
    const cs = el.ownerDocument.defaultView.getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden';
  };
  function collect(root, opts) {
    const out = []; let buf = '', bufEl = null;
    const flush = () => { const s = buf.replace(/\s+/g, ' ').trim(); if (s) out.push({ text: s, el: bufEl }); buf = ''; bufEl = null; };
    const add = (s, el) => { if (!bufEl) bufEl = el; buf += s; };
    const say = (s, el) => { flush(); s = String(s || '').replace(/\s+/g, ' ').trim(); if (s) out.push({ text: s, el }); };
    const blockOf = (el) => { let b = el; while (b && b !== root && !(b.nodeType === 1 && BLOCK.test(b.tagName))) b = b.parentElement; return b || root; };
    function walk(n) {
      if (n.nodeType === 3) { if (n.nodeValue.trim() || buf) add(n.nodeValue, blockOf(n.parentElement)); return; }
      if (n.nodeType !== 1) return;
      const el = n, tag = el.tagName;
      if (el.matches(SKIP)) return;
      if (tag !== 'svg' && hiddenEl(el)) return;
      if (tag === 'svg' || tag === 'SVG' || el.namespaceURI === 'http://www.w3.org/2000/svg') {
        // a drawing: never read its code. Its figure's caption is read where the caption sits; with no caption, read its description
        const fig = el.closest('figure');
        const cap = fig && fig.querySelector('figcaption');
        if (!cap) { const d = el.getAttribute('aria-label') || (el.querySelector('title') && el.querySelector('title').textContent) || ''; if (d) say('Drawing: ' + d, fig || el); }
        return;
      }
      if (tag === 'IMG') { const fig = el.closest('figure'); if (!(fig && fig.querySelector('figcaption')) && el.alt) say('Photo: ' + el.alt, el); return; }
      if (tag === 'VIDEO' || tag === 'AUDIO' || tag === 'IFRAME' || tag === 'CANVAS' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (tag === 'BUTTON') {
        if (el.classList.contains('opt')) { const q = el.closest('.q'); const k = q ? [...q.querySelectorAll('.opt')].indexOf(el) : -1; say(`Option ${k + 1}: ${el.textContent}`, el); return; }
        if (el.classList.contains('term') || el.classList.contains('hmp')) { add(el.textContent, blockOf(el)); return; }
        return; // other buttons are controls, not content
      }
      if (tag === 'DETAILS' && !el.open) {
        if (!opts.more) return;
        flush(); for (const c of el.childNodes) walk(c); flush(); return;
      }
      if (tag === 'SUMMARY' && el.parentElement && el.parentElement.open === false && !opts.more) return;
      if (tag === 'TABLE') { readTable(el); return; }
      if (el.classList.contains('cert')) { add(` (certainty ${el.textContent.trim()}) `, blockOf(el)); return; }
      if (el.classList.contains('yt-card')) { const b = el.querySelector('b'); say('Video link: ' + (b ? b.textContent : el.textContent) + '. Needs internet.', el); return; }
      if (tag === 'FIGCAPTION' && el.closest('figure') && el.closest('figure').querySelector('svg')) {
        flush(); add('Drawing: ', el); for (const c of el.childNodes) walk(c); flush(); return;
      }
      const isBlock = BLOCK.test(tag) || tag === 'BR';
      if (isBlock) flush();
      if (tag === 'BR') return;
      if (tag === 'LABEL' && el.classList.contains('check')) { const i = el.querySelector('input'); add(i && i.checked ? 'Done: ' : 'To do: ', el); }
      for (const c of el.childNodes) walk(c);
      if (isBlock) flush();
    }
    function readTable(t) {
      flush();
      const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      const rows = [...t.querySelectorAll('tbody tr')].length ? [...t.querySelectorAll('tbody tr')] : [...t.querySelectorAll('tr')].slice(heads.length ? 1 : 0);
      out.push({ text: `Table${heads.length ? ': ' + heads.join(', ') : ''}. ${rows.length} rows.`, el: t });
      for (const r of rows) {
        if (hiddenEl(r)) continue;
        const cells = [...r.children].map((c, k) => { const v = c.textContent.replace(/\s+/g, ' ').trim(); return v && heads[k] && k > 0 ? `${heads[k]}: ${v}` : v; }).filter(Boolean);
        if (cells.length) out.push({ text: cells.join('. ') + '.', el: r });
      }
    }
    walk(root); flush();
    return out;
  }
  // split long blocks into short utterances (some engines cut off long ones; short ones pause and resume cleanly)
  function chunks(items) {
    const res = [];
    for (const it of items) {
      let t = speakable(it.text);
      if (!t || /^[\s.,;:!?()-]*$/.test(t)) continue;
      const parts = t.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [t];
      let cur = '';
      for (const p of parts) {
        if ((cur + p).length > 220 && cur) { res.push({ text: cur.trim(), el: it.el }); cur = ''; }
        if (p.length > 220) { for (const q of p.replace(/([,;:])\s+/g, '$1\u0001').split('\u0001')) { if ((cur + q).length > 220 && cur) { res.push({ text: cur.trim(), el: it.el }); cur = ''; } cur += q + ' '; } } else cur += p;
      }
      if (cur.trim()) res.push({ text: cur.trim(), el: it.el });
    }
    return res;
  }

  // ---------- what is on screen ----------
  const view = () => document.getElementById('view');
  function mode() {
    const h = location.hash;
    if (/^#\/s\/[^/]+/.test(h) && document.getElementById('ls-step')) return 'lesson';
    if (/^#\/(cards\/[^/]+|daily)/.test(h) && document.getElementById('fc')) return 'card';
    return '';
  }
  const lessonArt = () => document.getElementById('ls-step');
  function screenKey() {
    const m = mode();
    if (m === 'lesson') { const h2 = lessonArt().querySelector('h2'); return 'L|' + location.hash + '|' + (h2 ? h2.textContent : ''); }
    if (m === 'card') return 'C|' + location.hash.split('/')[1] + '|' + uid(document.getElementById('fc'));
    return '';
  }
  const uids = new WeakMap(); let uidN = 0;
  const uid = (el) => { if (!el) return 0; if (!uids.has(el)) uids.set(el, ++uidN); return uids.get(el); };

  // ---------- player ----------
  // state: idle | playing | paused | flipwait (card front read, waiting for the flip)
  let cardSession = false, state = 'idle', queue = [], pos = 0, key = '', part = 'front', expectNew = false, gen = 0, cur = null, onEl = null;
  const keep = []; // keep utterances referenced (some engines drop the end event of collected ones)
  function mark(el) { if (onEl) onEl.classList.remove('hmv-on'); onEl = el && el.classList ? el : null; if (onEl) onEl.classList.add('hmv-on'); }
  function buildQueue() {
    const m = mode();
    if (m === 'lesson') {
      const art = lessonArt();
      const h2 = art.querySelector('h2');
      const items = collect(art, cfg);
      const title = document.getElementById('top-title');
      if (h2 && items[0] && items[0].el === h2) items[0] = { text: h2.textContent.trim() + '.', el: h2 };
      const count = document.getElementById('ls-count');
      if (title && title.textContent.trim()) items.unshift({ text: `${title.textContent.trim()}${count && count.textContent ? ', screen ' + count.textContent.trim() : ''}.`, el: null });
      return chunks(items);
    }
    if (m === 'card') {
      const fc = document.getElementById('fc');
      const front = fc.querySelector('.fc-front'), back = fc.querySelector('.fc-back');
      if (part === 'front') {
        const items = collect(front, cfg).filter((x) => !/^Tap to flip$/i.test(x.text.trim()));
        return chunks([{ text: 'Card front.', el: null }].concat(items));
      }
      return chunks([{ text: 'Back.', el: null }].concat(collect(back, cfg)));
    }
    return [];
  }
  function speakNext(g) {
    if (g !== gen || state !== 'playing') return;
    if (pos >= queue.length) return finished();
    const c = queue[pos];
    const u = new SpeechSynthesisUtterance(c.text);
    const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-CA';
    u.rate = cfg.rate;
    let done = false;
    const next = () => { if (done) return; done = true; if (g !== gen || state !== 'playing') return; pos++; speakNext(g); };
    u.onend = next;
    u.onerror = (e) => { if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; next(); };
    keep.push(u); if (keep.length > 8) keep.shift();
    cur = u; mark(c.el);
    try { SS.speak(u); } catch (e) { stop(); }
    paint();
  }
  function start(fromPos) {
    gen++;
    try { SS.cancel(); } catch (e) { /* ignore */ }
    queue = buildQueue(); pos = Math.max(0, Math.min(fromPos || 0, queue.length));
    state = 'playing'; key = screenKey();
    const g = gen; speakNext(g);
  }
  function finished() {
    mark(null); cur = null;
    const m = mode();
    if (m === 'card' && part === 'front') {
      const back = document.querySelector('#fc .fc-back');
      if (back && !back.hidden) { part = 'back'; return start(0); }
      state = 'flipwait'; return paint();
    }
    if (m === 'lesson' && cfg.auto) {
      const nb = document.getElementById('ls-next'), cnt = (document.getElementById('ls-count') || {}).textContent || '';
      const mm = cnt.match(/(\d+)\s+of\s+(\d+)/);
      if (nb && mm && +mm[1] < +mm[2]) { expectNew = true; state = 'playing'; paint(); nb.click(); return; }
    }
    state = 'idle'; paint();
  }
  function play() {
    if (state === 'paused') { state = 'playing'; gen++; try { SS.cancel(); } catch (e) { /* ignore */ } const g = gen; speakNext(g); return; }
    if (state === 'flipwait') return;
    const m = mode(); if (!m) return;
    if (m === 'lesson' && lessonArt().querySelector('.ls-wait')) { state = 'playing'; expectNew = true; key = screenKey(); queue = []; pos = 0; paint(); return; } // reads when the screen arrives
    part = 'front'; cardSession = m === 'card';
    start(0);
  }
  function pause() { if (state !== 'playing') return; gen++; state = 'paused'; try { SS.cancel(); } catch (e) { /* ignore */ } paint(); }
  function stop() { cardSession = false; gen++; state = 'idle'; queue = []; pos = 0; part = 'front'; expectNew = false; cur = null; mark(null); try { SS.cancel(); } catch (e) { /* ignore */ } paint(); }
  function nextScreen() {
    const nb = document.getElementById('ls-next'); if (!nb) return;
    const going = state !== 'idle';
    gen++; try { SS.cancel(); } catch (e) { /* ignore */ } mark(null);
    expectNew = going; state = going ? 'playing' : 'idle';
    nb.click();
  }
  function setRate(r) {
    cfg.rate = r; set('rate', r);
    if (state === 'playing') { gen++; try { SS.cancel(); } catch (e) { /* ignore */ } const g = gen; speakNext(g); } // say the current part again at the new speed
    paint();
  }

  // ---------- the control bar ----------
  const ICON = {
    play: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5Z" fill="currentColor"/></svg>',
    pause: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor"/></svg>',
    stop: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l7 7-7 7M13 5l7 7-7 7"/></svg>',
    gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  };
  function makeBar(kind) {
    const b = document.createElement('div');
    b.className = 'hmv-bar'; b.dataset.kind = kind;
    b.setAttribute('role', 'group'); b.setAttribute('aria-label', 'Read aloud');
    b.innerHTML = `<div class="hmv-row">
        <button type="button" class="hmv-b hmv-play" data-act="play"></button>
        <button type="button" class="hmv-b hmv-ic" data-act="stop" aria-label="Stop reading">${ICON.stop}</button>
        ${kind === 'lesson' ? `<button type="button" class="hmv-b" data-act="next" aria-label="Next screen and keep reading">${ICON.next}<span>Next</span></button>` : ''}
        <button type="button" class="hmv-b hmv-rate" data-act="rate" aria-label="Reading speed"></button>
        <button type="button" class="hmv-b hmv-ic" data-act="opts" aria-label="Voice settings" aria-expanded="false">${ICON.gear}</button>
      </div>
      <div class="hmv-opts" hidden>
        <label class="hmv-f"><span>Voice</span><select class="hmv-voice" aria-label="Voice"></select></label>
        <div class="hmv-f"><span>Speed</span><div class="hmv-seg" role="radiogroup" aria-label="Speed">${RATES.map((r) => `<button type="button" role="radio" class="hmv-b" data-rate="${r}">${r}&times;</button>`).join('')}</div></div>
        ${kind === 'lesson' ? `<label class="hmv-ck"><input type="checkbox" class="hmv-auto"><span>Keep going to the next screen</span></label>` : ''}
        <label class="hmv-ck"><input type="checkbox" class="hmv-more"><span>Also read the closed "More" sections</span></label>
        <p class="hmv-note">Uses this phone's own voice. Works with no signal. Speech stops if the screen locks.</p>
      </div>
      <div class="hmv-live" aria-live="polite"></div>`;
    b.addEventListener('click', (e) => {
      e.stopPropagation(); // never flip a card or swipe a lesson from the bar
      const t = e.target.closest('button'); if (!t) return;
      const act = t.dataset.act;
      if (t.dataset.rate) return setRate(+t.dataset.rate);
      if (act === 'play') return state === 'playing' ? pause() : play();
      if (act === 'stop') return stop();
      if (act === 'next') return nextScreen();
      if (act === 'rate') return setRate(RATES[(RATES.indexOf(cfg.rate) + 1) % RATES.length]);
      if (act === 'opts') { const o = b.querySelector('.hmv-opts'); o.hidden = !o.hidden; t.setAttribute('aria-expanded', String(!o.hidden)); }
    });
    b.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    b.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
    b.addEventListener('change', (e) => {
      const t = e.target;
      if (t.classList.contains('hmv-voice')) { cfg.voice = t.value; set('voice', t.value); if (state === 'playing') setRate(cfg.rate); }
      if (t.classList.contains('hmv-auto')) { cfg.auto = t.checked; set('auto', t.checked ? '1' : '0'); }
      if (t.classList.contains('hmv-more')) { cfg.more = t.checked; set('more', t.checked ? '1' : '0'); }
    });
    bar = b; fillVoices();
    return b;
  }
  function fillVoices() {
    const sel = bar && bar.querySelector('.hmv-voice'); if (!sel) return;
    const v = pickVoice();
    sel.innerHTML = voices.length ? voices.map((x) => `<option value="${esc(x.voiceURI)}">${esc(x.name)} (${esc(x.lang)})</option>`).join('') : '<option value="">Phone default</option>';
    if (v) sel.value = v.voiceURI;
  }
  function paint() {
    if (!bar || !bar.isConnected) return;
    const p = bar.querySelector('.hmv-play');
    const label = state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : state === 'flipwait' ? 'Tap the card' : 'Read aloud';
    p.innerHTML = (state === 'playing' ? ICON.pause : ICON.play) + `<span>${label}</span>`;
    p.setAttribute('aria-label', state === 'playing' ? 'Pause reading' : state === 'paused' ? 'Resume reading' : state === 'flipwait' ? 'Waiting: tap the card to flip it, then the back is read' : 'Read this screen aloud');
    p.disabled = state === 'flipwait';
    p.setAttribute('aria-pressed', String(state === 'playing'));
    bar.classList.toggle('hmv-active', state !== 'idle');
    bar.querySelector('.hmv-rate').textContent = cfg.rate + '×';
    bar.querySelector('.hmv-rate').setAttribute('aria-label', `Reading speed ${cfg.rate}. Tap to change`);
    bar.querySelectorAll('[data-rate]').forEach((x) => x.setAttribute('aria-checked', String(+x.dataset.rate === cfg.rate)));
    const a = bar.querySelector('.hmv-auto'); if (a) a.checked = cfg.auto;
    bar.querySelector('.hmv-more').checked = cfg.more;
    bar.querySelector('.hmv-live').textContent = state === 'flipwait' ? 'Tap the card to hear the back.' : '';
  }

  // ---------- watch the app: inject, follow screen changes, stop when the screen is left ----------
  function sync() {
    const m = mode();
    if (!m) { if (state !== 'idle') stop(); if (bar && bar.isConnected) bar.remove(); return; }
    // place the bar
    const anchor = m === 'lesson' ? lessonArt() : document.getElementById('fc');
    if (!bar || !bar.isConnected || bar.dataset.kind !== m || bar.nextElementSibling !== anchor) {
      if (bar && bar.isConnected) bar.remove();
      const b = bar && bar.dataset.kind === m ? bar : makeBar(m);
      anchor.parentNode.insertBefore(b, anchor); paint();
    }
    const k = screenKey();
    if (k !== key) {
      const was = state;
      key = k;
      const loading = m === 'lesson' && lessonArt().querySelector('.ls-wait');
      if (expectNew && was === 'playing') { if (loading) return; expectNew = false; part = 'front'; start(0); return; }
      if (m === 'card' && (was !== 'idle' || cardSession) && k.split('|')[1] === (prevCardRoute || '')) { part = 'front'; start(0); return; } // next card in the same deck: keep reading
      if (was !== 'idle') stop();
    } else if (expectNew && state === 'playing' && m === 'lesson' && !lessonArt().querySelector('.ls-wait') && !queue.length) { expectNew = false; start(0); return; }
    if (m === 'card') prevCardRoute = k.split('|')[1];
    if (m === 'card' && state === 'flipwait') { const back = document.querySelector('#fc .fc-back'); if (back && !back.hidden) { part = 'back'; start(0); } }
  }
  let prevCardRoute = '';
  let queued = false;
  const later = () => { if (queued) return; queued = true; Promise.resolve().then(() => { queued = false; try { sync(); } catch (e) { /* never break the app */ } }); };
  function watch() {
    const v = view(); if (!v) return;
    new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.type === 'attributes' ? !(r.target.closest && r.target.closest('.hmv-bar')) : [...r.addedNodes, ...r.removedNodes].some((n) => !(n.classList && n.classList.contains('hmv-bar')))) { later(); return; }
      }
    }).observe(v, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('hashchange', () => { if (!mode()) { if (state !== 'idle') stop(); } later(); });
    window.addEventListener('pagehide', () => { if (state !== 'idle') stop(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && state === 'playing' && !SS.speaking && !SS.pending) { gen++; state = 'paused'; paint(); } // the phone stopped the voice (screen lock): Resume picks up here
    });
    later();
  }

  // ---------- style (neutral; the lesson's own Next stays the one orange action) ----------
  const css = `.hmv-bar{margin:0 0 10px;font-size:14px}
.hmv-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.hmv-b{min-height:44px;min-width:44px;padding:0 12px;border:1px solid var(--line,#d8cfbc);border-radius:12px;background:var(--card,#fffaf0);color:var(--ink,#23261f);font-family:inherit;font-size:14px;font-weight:600;line-height:1.1;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hmv-b:active{transform:translateY(1px)}
.hmv-b:disabled{opacity:.7;cursor:default}
.hmv-b:focus-visible{outline:3px solid var(--sage,#8a9a6b);outline-offset:2px}
.hmv-ic{padding:0}
.hmv-play{flex:1 1 auto;justify-content:flex-start}
.hmv-bar:not(.hmv-active) [data-act=stop],.hmv-bar:not(.hmv-active) [data-act=next]{display:none}
.hmv-active .hmv-play{border-color:var(--sage,#8a9a6b);background:color-mix(in srgb,var(--sage,#8a9a6b) 14%,var(--card,#fffaf0))}
.hmv-rate{min-width:52px;font-variant-numeric:tabular-nums}
.hmv-opts{margin-top:8px;padding:10px;border:1px solid var(--line,#d8cfbc);border-radius:12px;background:var(--card,#fffaf0);display:grid;gap:10px}
.hmv-opts[hidden]{display:none}
.hmv-f{display:grid;gap:4px;color:var(--muted,#5d6152)}
.hmv-f>span{font-size:14px}
.hmv-voice{min-height:44px;width:100%;max-width:100%;font-size:16px;border:1px solid var(--line,#d8cfbc);border-radius:10px;background:var(--bg,#f4efe4);color:var(--ink,#23261f);padding:0 8px}
.hmv-seg{display:flex;gap:6px}.hmv-seg .hmv-b{flex:1}
.hmv-seg [aria-checked=true]{border-color:var(--ink,#23261f);box-shadow:inset 0 0 0 1px var(--ink,#23261f)}
.hmv-ck{display:flex;gap:10px;align-items:center;min-height:44px;font-size:14px;color:var(--ink,#23261f)}
.hmv-ck input{width:22px;height:22px;flex:none}
.hmv-note{margin:0;font-size:14px;color:var(--muted,#5d6152)}
.hmv-live{font-size:14px;color:var(--muted,#5d6152)}.hmv-live:empty{display:none}
.hmv-on{outline:2px dashed var(--sage,#8a9a6b);outline-offset:3px;border-radius:4px}
@media (max-width:400px){.hmv-b{padding:0 10px}[data-act=next] span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}
@media (prefers-reduced-motion:reduce){.hmv-b:active{transform:none}}`;
  function injectCss() { if (document.getElementById('hmv-css')) return; const s = document.createElement('style'); s.id = 'hmv-css'; s.textContent = css; document.head.appendChild(s); }

  injectCss();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  // for tests and other add ons
  window.HMVoice = { speakable, state: () => state, stop, play, pause, textOf: () => buildQueue().map((c) => c.text) };
})();
