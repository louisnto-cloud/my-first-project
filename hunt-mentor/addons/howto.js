/* Picture how tos (add on, prompts/2026-10-23-pictures-for-everything.md Part 1).
   Data: data/addons/howto/howto.json and one SVG per step in data/addons/howto/svg/ (precached; made by scripts/build-howto.mjs).
   1. A small "How to" button inside each feature's screen opens its picture steps in a sheet:
      - app screens: chosen by the route (#/safety/trip, #/journal, ...). The button goes at the top of #view and comes back
        when the view redraws (a MutationObserver on #view, children only).
      - Hunt Map: chosen by the open sheet's title (Hunt Map Layers, Can I hunt here now?, Here on the map, Hunt day, Help ...)
        or by the search screen. The button goes in the sheet header, next to the X. Watches the map root (rAF batched).
      No other feature's code is changed: everything is found in the DOM.
   2. window.HMHowTo.strip(id) gives the swipeable step strip used by the guide (app/addons/guide.js).
   Offline: the JSON and SVGs are precached. If they cannot load (single file backup), no button shows.
   Nothing is stored. */
(function () {
  'use strict';
  const BASE = 'data/addons/howto/';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let data = null, loading = null;
  function load() {
    if (data) return Promise.resolve(data);
    if (!loading) {
      loading = fetch(BASE + 'howto.json', { credentials: 'omit' })
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then((j) => { data = j; return j; })
        .catch(() => { loading = null; return null; });
    }
    return loading;
  }
  const feat = (id) => (data && (data.features || []).find((f) => f.id === id)) || null;

  // ---------- which features belong to a screen ----------
  const MAP_ALL = ['layer_sets', 'what_key', 'search', 'tap_card', 'can_hunt', 'where_hunt', 'spots', 'truck', 'light_chips', 'steep', 'offline_area', 'help_tour'];
  const SAFETY = { trip: 'trip_plan', turn: 'turnaround', sos: 'emergency', wildlife: 'wildlife', live: 'conditions' };
  function forRoute(hash) {
    const h = String(hash || '').replace(/^#\/?/, '').split('/');
    const [a, b] = h;
    switch (a || '') {
      case '': return ['home_study', 'plan', 'presets', 'huntweek', 'guide'];
      case 'daily': case 'cards': return ['daily', 'read_aloud'];
      case 's': case 'learn': return ['read_aloud'];
      case 'plan': return b === 'preset' ? ['presets', 'plan'] : b === 'new' ? ['plan', 'presets'] : ['plan', 'offline_area', 'home_study', 'presets'];
      case 'huntweek': return ['huntweek'];
      case 'progress': return ['ready'];
      case 'safety': return b && SAFETY[b] ? [SAFETY[b]] : ['trip_plan', 'turnaround', 'emergency', 'wildlife', 'conditions'];
      case 'train': return b === 'decide' ? ['decide'] : ['trainers', 'decide'];
      case 'aftershot': return ['aftershot'];
      case 'field': return ['field_mode', 'aftershot'];
      case 'journal': return ['journal'];
      case 'more': return ['backup', 'guide', 'install', 'ready'];
      case 'install': return ['install'];
      default: return [];
    }
  }
  function forSheet(title, body) {
    const t = String(title || '').trim();
    const T = {
      'Hunt Map Layers': ['layer_sets', 'steep', 'what_key'], 'What am I looking at?': ['what_key'], 'What the colours mean': ['what_key'],
      'Can I hunt here now?': ['can_hunt'], 'Where can I hunt?': ['where_hunt'], 'Here on the map': ['tap_card'], 'Hunt day': ['light_chips', 'truck'],
      Help: ['help_tour'].concat(MAP_ALL.filter((x) => x !== 'help_tour')), 'Offline Maps': ['offline_area'], Tools: ['can_hunt', 'where_hunt'],
      'Hunt helpers': ['can_hunt', 'where_hunt'], 'Slope steepness': ['steep'],
    };
    if (T[t]) return T[t];
    if (/^Rundown: /.test(t)) return ['spots'];
    if (body && (body.querySelector('[data-rundown], .hmm-verify-line') || /campgrounds close/i.test(body.textContent || ''))) return ['spots'];
    return [];
  }

  // ---------- styles ----------
  function css() {
    if (document.getElementById('hwt-css')) return;
    const st = document.createElement('style'); st.id = 'hwt-css';
    st.textContent = `
.hwt-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px 0 10px; border: 2px solid var(--moss, #1f3d2b); border-radius: 22px; background: var(--card, #fff); color: var(--ink, #17201a); font: 700 15px/1 var(--font, system-ui, sans-serif); cursor: pointer; }
.hwt-btn svg { width: 22px; height: 22px; flex: none; }
.hwt-row { display: flex; justify-content: flex-end; margin: 0 0 8px; }
.hmm-sheet-h .hwt-btn { min-height: 44px; padding: 0 10px 0 8px; font-size: 14px; flex: none; }
.hmm-search .hwt-row { margin: 6px 12px 0; }
.hwt-ov { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; justify-content: center; }
.hwt-card { background: var(--card, #fff); color: var(--ink, #17201a); width: 100%; max-width: 560px; max-height: 92vh; overflow: auto; border-radius: 18px 18px 0 0; padding: 8px 16px calc(16px + env(safe-area-inset-bottom)); }
.hwt-head { display: flex; align-items: center; gap: 8px; position: sticky; top: -8px; background: var(--card, #fff); padding: 6px 0; z-index: 1; }
.hwt-head h2 { flex: 1; margin: 0; font-size: 20px; line-height: 1.2; }
.hwt-x { min-width: 44px; min-height: 44px; border: 0; background: none; color: var(--ink, #17201a); font-size: 28px; line-height: 1; cursor: pointer; }
.hwt-pick { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 12px; }
.hwt-pick button { min-height: 44px; padding: 0 12px; border: 1px solid var(--line, #d5dbd2); border-radius: 22px; background: var(--card, #fff); color: var(--ink, #17201a); font: 600 15px/1.1 var(--font, system-ui, sans-serif); cursor: pointer; }
.hwt-pick button[aria-pressed="true"] { background: var(--moss, #1f3d2b); border-color: var(--moss, #1f3d2b); color: #fff; }
.hwt-strip { margin: 6px 0 4px; }
.hwt-steps { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; list-style: none; margin: 0; padding: 0 0 6px; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain; }
.hwt-step { flex: 0 0 88%; scroll-snap-align: start; margin: 0; }
.hwt-step img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 3; border-radius: 12px; background: #eef1ea; }
.hwt-step p { display: flex; gap: 8px; align-items: flex-start; margin: 8px 2px 0; font-size: 16px; line-height: 1.35; }
.hwt-n { flex: none; display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--blaze, #ff6a13); color: var(--blaze-ink, #17201a); font-weight: 800; font-size: 15px; }
.hwt-nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; }
.hwt-nav button { min-width: 44px; min-height: 44px; border: 2px solid var(--btn-line, #1f3d2b); border-radius: 12px; background: var(--card, #fff); color: var(--ink, #17201a); font-size: 22px; line-height: 1; cursor: pointer; }
.hwt-nav button:disabled { opacity: .35; cursor: default; }
.hwt-count { font-size: 15px; color: var(--muted, #5b665e); }
@media (prefers-reduced-motion: no-preference) { .hwt-steps { scroll-behavior: smooth; } }`;
    document.head.appendChild(st);
  }
  const Q = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4.1"/><circle cx="12" cy="17.6" r=".6" fill="currentColor"/></svg>';

  // ---------- the step strip ----------
  let uid = 0;
  function strip(id) {
    const f = feat(id); if (!f) return '';
    const k = 'hwt' + (++uid);
    return `<div class="hwt-strip" data-hwt-strip="${esc(f.id)}">
      <ol class="hwt-steps" id="${k}" tabindex="0" aria-label="${esc(f.title)}: ${f.steps.length} picture steps. Swipe or use the arrows.">
        ${f.steps.map((s, i) => `<li class="hwt-step"><img src="${esc(BASE + s.svg)}" alt="${esc(s.alt || '')}" width="400" height="300" loading="lazy" decoding="async"><p><span class="hwt-n" aria-hidden="true">${i + 1}</span><span><span class="hwt-sr" style="position:absolute;left:-9999px">Step ${i + 1}. </span>${esc(s.text)}</span></p></li>`).join('')}
      </ol>
      <div class="hwt-nav"><button type="button" data-hwt-go="-1" aria-controls="${k}" aria-label="Previous step">&#8249;</button><span class="hwt-count" aria-live="polite">Step 1 of ${f.steps.length}</span><button type="button" data-hwt-go="1" aria-controls="${k}" aria-label="Next step">&#8250;</button></div>
    </div>`;
  }
  // wire every strip under root: arrows, the step counter and hiding pictures that fail to load
  function wire(root) {
    (root || document).querySelectorAll('.hwt-strip:not([data-hwt-on])').forEach((el) => {
      el.setAttribute('data-hwt-on', '1');
      const ol = el.querySelector('.hwt-steps'), items = [...ol.children], cnt = el.querySelector('.hwt-count');
      const [prev, next] = el.querySelectorAll('[data-hwt-go]');
      const cur = () => { const w = items[0] ? items[0].getBoundingClientRect().width + 10 : 1; return Math.max(0, Math.min(items.length - 1, Math.round(ol.scrollLeft / w))); };
      const sync = () => { const i = cur(); cnt.textContent = `Step ${i + 1} of ${items.length}`; prev.disabled = i === 0; next.disabled = i === items.length - 1; };
      const go = (d) => { const i = Math.max(0, Math.min(items.length - 1, cur() + d)); ol.scrollTo({ left: items[i].offsetLeft - ol.offsetLeft, behavior: 'smooth' }); setTimeout(sync, 350); };
      prev.onclick = () => go(-1); next.onclick = () => go(1);
      let t = 0; ol.addEventListener('scroll', () => { cancelAnimationFrame(t); t = requestAnimationFrame(sync); }, { passive: true });
      ol.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });
      el.querySelectorAll('img').forEach((im) => { im.onerror = () => { im.hidden = true; }; });
      sync();
    });
  }

  // ---------- the sheet ----------
  let ov = null, opener = null;
  function open(ids, from) {
    load().then((d) => {
      if (!d) return;
      const list = ids.map(feat).filter(Boolean); if (!list.length) return;
      css(); close(true);
      opener = from || document.activeElement;
      ov = document.createElement('div'); ov.className = 'hwt-ov';
      ov.innerHTML = `<div class="hwt-card" role="dialog" aria-modal="true" aria-labelledby="hwt-ov-t">
        <div class="hwt-head"><h2 id="hwt-ov-t"></h2><button type="button" class="hwt-x" aria-label="Close">&times;</button></div>
        ${list.length > 1 ? `<div class="hwt-pick" role="group" aria-label="Pick a how to">${list.map((f, i) => `<button type="button" data-hwt-f="${esc(f.id)}" aria-pressed="${i === 0}">${esc(f.title)}</button>`).join('')}</div>` : ''}
        <div class="hwt-body"></div></div>`;
      const show = (f) => {
        ov.querySelector('#hwt-ov-t').textContent = 'How to: ' + f.title;
        ov.querySelector('.hwt-body').innerHTML = strip(f.id); wire(ov);
        ov.querySelectorAll('[data-hwt-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hwtF === f.id)));
      };
      ov.querySelectorAll('[data-hwt-f]').forEach((b) => { b.onclick = () => show(feat(b.dataset.hwtF)); });
      ov.querySelector('.hwt-x').onclick = () => close();
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      ov.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
        if (e.key === 'Tab') { // keep focus inside the sheet
          const fs = [...ov.querySelectorAll('button:not([disabled]), [tabindex="0"]')]; if (!fs.length) return;
          const a = fs[0], z = fs[fs.length - 1];
          if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
        }
      });
      document.body.appendChild(ov);
      show(list[0]);
      ov.querySelector('.hwt-x').focus();
    });
  }
  function close(quiet) {
    if (!ov) return;
    ov.remove(); ov = null;
    if (!quiet && opener && opener.isConnected && opener.focus) opener.focus();
    opener = null;
  }

  // ---------- the How to button ----------
  function button(ids, label) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'hwt-btn'; b.dataset.hwtIds = ids.join(',');
    b.setAttribute('aria-label', 'How to: ' + label + ', picture steps');
    b.innerHTML = Q + '<span>How to</span>';
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); open(b.dataset.hwtIds.split(','), b); };
    return b;
  }

  // app screens: one row at the top of #view
  function placeView() {
    const v = document.getElementById('view'); if (!v || !data) return;
    const ids = document.body.classList.contains('map-open') ? [] : forRoute(location.hash).filter(feat);
    const row = v.querySelector(':scope > .hwt-row');
    if (!ids.length) { if (row) row.remove(); return; }
    if (row && row.firstChild && row.firstChild.dataset.hwtIds === ids.join(',')) return; // never moved once placed: other add ons insert here too
    if (row) row.remove();
    if (!v.firstChild) return; // wait for the view to draw
    const r = document.createElement('div'); r.className = 'hwt-row';
    r.appendChild(button(ids, feat(ids[0]).title));
    v.insertBefore(r, v.firstChild);
  }

  // Hunt Map: the open sheet's header, and the search screen
  function placeMap(root) {
    const sh = root.querySelector('.hmm-sheet');
    if (sh) {
      const head = sh.querySelector('.hmm-sheet-h'), h2 = head && head.querySelector('h2');
      const old = head && head.querySelector('.hwt-btn');
      const ids = sh.hidden || !h2 ? [] : forSheet(h2.textContent, sh.querySelector('.hmm-sheet-b')).filter(feat);
      if (!ids.length) { if (old) old.remove(); }
      else if (!old || old.dataset.hwtIds !== ids.join(',')) { if (old) old.remove(); head.insertBefore(button(ids, feat(ids[0]).title), head.querySelector('.hmm-x')); }
    }
    const se = root.querySelector('.hmm-search');
    if (se && feat('search') && !se.querySelector('.hwt-row')) {
      const r = document.createElement('div'); r.className = 'hwt-row'; r.appendChild(button(['search'], feat('search').title));
      const form = se.querySelector('.hmm-sbar'); if (form) form.after(r); else se.prepend(r);
    }
  }

  let mapObs = null, mapRoot = null, raf = 0;
  function watchMap() {
    const root = document.getElementById('hm-map');
    if (!root || root === mapRoot) return;
    if (mapObs) mapObs.disconnect();
    mapRoot = root;
    mapObs = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => placeMap(root)); });
    mapObs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    placeMap(root);
  }

  function start() {
    load().then((d) => {
      if (!d) return;
      css();
      const v = document.getElementById('view');
      if (v) new MutationObserver(() => placeView()).observe(v, { childList: true });
      // the map adds its root to <body> the first time it opens
      new MutationObserver(() => { if (!mapRoot || !mapRoot.isConnected) { mapRoot = null; watchMap(); } }).observe(document.body, { childList: true });
      window.addEventListener('hashchange', () => { close(true); placeView(); watchMap(); });
      placeView(); watchMap();
    });
  }

  window.HMHowTo = { load, strip, wire, open, forRoute, forSheet };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
