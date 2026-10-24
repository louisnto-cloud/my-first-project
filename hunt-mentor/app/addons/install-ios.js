/* iPhone helpers (add on).
   1. "Add to Home Screen" guide: route #/iphone, and a small card on Home shown only in an iPhone or iPad browser tab
      (not in the Home Screen app). "Not now" hides the card on this phone (localStorage hm.iphone.hide).
   2. window.HMSaveFile(name, text, type): saves a file the way that works on the phone. On iPhone a blob download
      (a.download) is unreliable in a Home Screen app, so the Share sheet ("Save to Files") is used when the phone can
      share files; anywhere else, a normal download. Used by the backup, journal CSV and turnaround calendar file.
   3. In the Home Screen app: asks once, quietly, for persistent storage (navigator.storage.persist), so iOS does not
      clear the saved lessons and maps first when space runs low. Safari decides by itself and shows no prompt.
   4. While the on screen keyboard is up (a text box has focus on a touch phone), the bottom tab bar and other fixed
      bottom bars hide (body.hm-kb). iOS does not shrink the page for the keyboard, so fixed bars floated over the
      text box or jumped mid screen. */
(function () {
  'use strict';
  const nav = navigator, ua = nav.userAgent || '';
  const isIOS = /iP(hone|ad|od)/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1); // iPadOS reports a Mac
  const standalone = () => nav.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const $ = (s, el = document) => el.querySelector(s);
  const ld = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const sv = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };
  const toast = (m) => { const t = $('.hm-toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 4000); };
  const HIDE = 'hm.iphone.hide';

  // ---------- 2. save a file ----------
  function download(name, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  // The Share sheet needs a fresh tap. A backup that took a moment to gather can lose the tap: then ask for one more tap.
  function tapToSave(file, blob) {
    let box = $('#hmi-save'); if (box) box.remove();
    box = document.createElement('div'); box.id = 'hmi-save'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Save file');
    box.innerHTML = `<p><strong>Your file is ready.</strong> Tap Save, then choose Save to Files.</p>
      <div class="btn-row"><button type="button" class="btn primary" data-k="share">Save</button><button type="button" class="btn" data-k="dl">Download instead</button><button type="button" class="btn" data-k="x">Close</button></div>`;
    document.body.appendChild(box);
    box.onclick = (e) => {
      const k = e.target.closest('[data-k]'); if (!k) return;
      if (k.dataset.k === 'share') nav.share({ files: [file], title: file.name }).then(() => box.remove(), (err) => { if (!err || err.name !== 'AbortError') { download(file.name, blob); box.remove(); } });
      else if (k.dataset.k === 'dl') { download(file.name, blob); box.remove(); }
      else box.remove();
    };
    const b = $('[data-k="share"]', box); if (b) b.focus();
  }
  async function saveFile(name, text, type) {
    const blob = new Blob([text], { type });
    if (isIOS && typeof File === 'function' && nav.canShare && nav.share) {
      let file = null;
      try { file = new File([blob], name, { type }); } catch (e) { file = null; }
      if (file && nav.canShare({ files: [file] })) {
        try { await nav.share({ files: [file], title: name }); return 'shared'; } catch (err) {
          if (err && err.name === 'AbortError') return 'cancelled';
          if (err && err.name === 'NotAllowedError') { tapToSave(file, blob); return 'asked'; }
        }
      }
    }
    download(name, blob);
    return 'downloaded';
  }
  window.HMSaveFile = saveFile;

  // ---------- 3. persistent storage in the Home Screen app ----------
  function persist() {
    if (!standalone() || !nav.storage || !nav.storage.persist || !nav.storage.persisted) return;
    nav.storage.persisted().then((on) => (on ? on : nav.storage.persist())).catch(() => {});
  }

  // ---------- 4. keyboard up: hide fixed bottom bars ----------
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const typing = (el) => el && (el.tagName === 'TEXTAREA' || el.isContentEditable || (el.tagName === 'INPUT' && !/^(checkbox|radio|range|button|submit|reset|file|color|date|time|datetime-local|month|week)$/.test(el.type)));
  if (coarse) {
    document.addEventListener('focusin', (e) => { if (typing(e.target)) document.body.classList.add('hm-kb'); });
    document.addEventListener('focusout', () => { setTimeout(() => { if (!typing(document.activeElement)) document.body.classList.remove('hm-kb'); }, 120); });
  }

  // ---------- 1. guide ----------
  const SHARE_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="hmi-ic"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"/></svg>';
  const PLUS_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" class="hmi-ic"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  const card = () => `<div class="card hmi-card" id="hmi-card"><h2>Add Hunt Mentor to your Home Screen</h2>
    <p>On iPhone it then opens like an app, works with no signal, and keeps your progress safer.</p>
    <div class="btn-row"><a class="btn primary" href="#/iphone">Show me how</a><button type="button" class="btn" id="hmi-hide">Not now</button></div></div>`;
  function steps() {
    return `<ol class="hmi-steps">
      <li>Open this page in <strong>Safari</strong>.${otherBrowser ? ' You are in another browser. Safari is the surest way. On iOS 16.4 or later, its Share button can also add to the Home Screen.' : ''}</li>
      <li>Tap <strong>Share</strong> ${SHARE_SVG} (a square with an arrow pointing up). On iOS 26 or later, tap the <strong>More</strong> button (three dots) by the address first, then Share.</li>
      <li>Scroll down the list. Tap <strong>Add to Home Screen</strong> ${PLUS_SVG}. Not there? Tap <strong>View More</strong> or <strong>Edit Actions</strong>.</li>
      <li>If you see <strong>Open as Web App</strong>, leave it on. Tap <strong>Add</strong>.</li>
      <li>Open Hunt Mentor from the Home Screen once while you have signal. Leave it open a few minutes so the lessons save for offline use.</li></ol>`;
  }
  function route() {
    const tt = $('#top-title'); if (tt) tt.textContent = 'Add to Home Screen';
    document.querySelectorAll('.tabs a').forEach((a) => { const on = a.dataset.tab === 'more'; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const v = document.getElementById('view'); if (!v) return;
    const inApp = standalone();
    v.innerHTML = `${inApp ? '<div class="card hmi-ok"><h2>You are in the Home Screen app</h2><p>Nothing to do. This is the version that keeps working with no signal.</p></div>' : ''}
      <div class="card"><h2>iPhone: add to Home Screen</h2>${steps()}</div>
      <div class="card"><h2>Why it matters</h2><ul>
        <li>It opens full screen, like an app, from its own icon.</li>
        <li>In a Safari tab, iPhone can clear a site's saved data after 7 days of using Safari without opening the site. The Home Screen app keeps its own data.</li>
        <li>Alerts (notifications) for the turnaround alarm only work in the Home Screen app, on iOS 16.4 or later.</li></ul></div>
      <div class="card"><h2>Bring your progress with you</h2>
        <p>The Home Screen app has its own storage. What you did in Safari (progress, lists, journal, map items) does not move over by itself.</p>
        <ol><li>Here in Safari: More, then <strong>Export backup</strong>. Save it to Files.</li>
        <li>In the Home Screen app: More, then <strong>Import</strong>. Pick that file.</li></ol>
        <div class="btn-row"><a class="btn" href="#/more">Open More</a></div></div>
      <div class="card"><h2>Android</h2><p>Open in Chrome. Tap the three dots menu, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p></div>
      <p class="muted hmi-src">Phone behaviour, not hunting rules. Sources: WebKit blog, "Full Third Party Cookie Blocking and More" (24 March 2020, the 7 day rule and Home Screen apps, certainty 90%); WebKit blog, "Web Push for Web Apps on iOS and iPadOS" (February 2023, alerts need iOS 16.4 and the Home Screen, certainty 90%); Apple iPhone User Guide, Safari, add a website icon to your Home Screen (step names, certainty 75%, menus move between iOS versions). Checked 23 October 2026.</p>`;
    if (ld(HIDE)) { const p = document.createElement('div'); p.className = 'btn-row'; p.innerHTML = '<button type="button" class="btn" id="hmi-show">Show the Home Screen tip on Home again</button>'; v.appendChild(p); $('#hmi-show').onclick = () => { try { localStorage.removeItem(HIDE); } catch (e) { /* storage blocked */ } p.remove(); toast('The tip shows on Home again.'); }; }
  }
  // Home card: an iPhone or iPad browser tab only, until "Not now"
  function onHome() {
    const h = location.hash.replace(/^#\/?/, '');
    if (h !== '' || !isIOS || standalone() || ld(HIDE)) return;
    const v = document.getElementById('view'); if (!v || $('#hmi-card', v) || !v.firstElementChild) return;
    const st = $('.pl-today', v); // with a plan, Today's study stays first on the screen and this tip goes under it
    if (st) st.insertAdjacentHTML('afterend', card()); else v.insertAdjacentHTML('afterbegin', card());
    $('#hmi-hide', v).onclick = () => { sv(HIDE, '1'); const c = $('#hmi-card'); if (c) c.remove(); toast('Hidden. More, Install on iPhone or Android shows the steps any time.'); };
  }

  const css = `.hmi-card{border-left:4px solid var(--accent)}.hmi-card h2{margin-top:0}
  .hmi-steps li{margin:0 0 10px}.hmi-ic{vertical-align:-5px}.hmi-src{font-size:14px}.hmi-ok{border-left:4px solid var(--ok)}
  #hmi-save{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:45;max-width:520px;margin:0 auto;background:var(--card);color:var(--ink);border:2px solid var(--line);border-radius:14px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:16px}
  #hmi-save p{margin:0 0 8px}`;
  function init() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const v = document.getElementById('view');
    if (v) new MutationObserver(onHome).observe(v, { childList: true });
    window.addEventListener('hashchange', () => setTimeout(onHome, 0));
    onHome(); persist();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.HMRoutes = window.HMRoutes || {};
  window.HMRoutes.iphone = route;
  window.HMiPhone = { isIOS, standalone, saveFile }; // for tests and other add ons
})();
