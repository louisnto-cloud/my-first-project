/* "My guns" hub (add on). Routes: #/guns (every gun, range day checklist, storage and transport card, guns you might add later)
   and #/guns/<id> (one gun: drawing, facts, course chapters, lessons, cleaning and maintenance log with reminders).
   Data: data/addons/guns/guns.json (facts copied from the app's lessons with their certainty; Tips labelled).
   Course chapters: sessions whose id starts with the gun's prefix (mc-tikka-, mc-cz457-, mc-sks-, mc-shotgun-), linked only
   when they exist in HM.sessions at run time; until then the existing lessons are linked.
   User data on this phone only, in the backup: hm.guns.log.<gunId> (log entries), hm.guns.check (range day ticks).
   Home: window.HMGuns.homeCard(S), a small link card placed by app.js home() in the plan and hunt week area. */
(function () {
  'use strict';
  const TZ = 'America/Vancouver';
  const PFX = 'hm.guns.';
  const OWNED = ['tikka', 'cz457', 'sks'];
  const NAMES = { tikka: 'Tikka', cz457: 'CZ 457', sks: 'SKS' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const badge = (v) => `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}" title="Certainty">${v}%</span>`;
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const dDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const dShort = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
  const ldJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const svJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const sessions = () => (window.HM && window.HM.sessions) || [];
  const lessonHref = (id, re) => {
    const s = sessions().find((x) => x.id === id);
    if (!s) return '';
    const rx = re ? new RegExp(re, 'i') : null;
    const i = rx ? (s.steps || []).findIndex((st, k) => k > 0 && rx.test(st.title || '')) : 0; // screen 0 repeats the lesson title
    return `#/s/${id}/${Math.max(0, i)}`;
  };
  const src = (o) => (o.tip ? '<span class="pill">Tip</span>' : o.c ? `${badge(o.c)} ${esc(o.s)}` : o.s ? `<span class="muted">${esc(o.s)}</span>` : '');
  const btnLink = ([h, lab]) => `<a href="${esc(h)}">${esc(lab)}</a>`;

  // ---------- data ----------
  let D = null, DP = null;
  const data = () => (D ? Promise.resolve(D) : DP || (DP = fetch('data/addons/guns/guns.json', { credentials: 'omit' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((j) => { D = j; return j; })
    .catch((e) => { DP = null; throw e; })));

  // ---------- drawings: simple side views, design colours, labelled (14 px or more on a 360 px screen) ----------
  const SP = '#1F3D2B', LI = '#EEF1EA', BZ = '#FF6A13', TX = '#17201A', WD = '#8A6A44', ST = '#6F7B72';
  // a label row: y 24 or 52 above the gun, 206 or 232 below it; (px, py) is the part, in the gun's own coordinates (drawn 30 lower)
  function label(x, y, t, px, py, anchor) {
    py += 30;
    return `<line x1="${px}" y1="${py}" x2="${anchor === 'start' ? x + 20 : anchor === 'end' ? x - 20 : x}" y2="${y < 120 ? y + 6 : y - 20}" stroke="${TX}" stroke-width="1.5"/>` +
      `<text x="${x}" y="${y}" font-size="20" font-weight="700" fill="${TX}" text-anchor="${anchor || 'middle'}">${esc(t)}</text>`;
  }
  function drawing(type, name) {
    const id = 'gn-' + type;
    let g = '', labels = '';
    if (type === 'bolt') { // Tikka T3x Arctic: laminate stock, stainless barrel, rear drum sight, detachable magazine
      g = `<path d="M18 104 L120 96 L150 96 L156 112 L120 118 L60 132 L22 134 Z" fill="${WD}"/>
        <rect x="150" y="90" width="80" height="18" rx="3" fill="${ST}"/>
        <path d="M150 108 L262 108 L262 116 L176 120 L150 118 Z" fill="${WD}"/>
        <rect x="230" y="94" width="158" height="7" fill="${ST}"/>
        <rect x="382" y="87" width="4" height="7" fill="${SP}"/>
        <rect x="236" y="85" width="12" height="9" rx="2" fill="${SP}"/>
        <path d="M168 99 L162 114" stroke="${SP}" stroke-width="5" stroke-linecap="round"/><circle cx="161" cy="116" r="5" fill="${SP}"/>
        <rect x="186" y="116" width="26" height="16" fill="${SP}"/>
        <path d="M160 118 q2 16 18 14" stroke="${SP}" stroke-width="3" fill="none"/><path d="M168 118 l2 9" stroke="${TX}" stroke-width="3"/>
        <rect x="146" y="86" width="9" height="6" fill="${BZ}"/>`;
      labels = label(6, 24, 'Stock', 40, 112, 'start') + label(150, 24, 'Safety', 150, 86) + label(250, 52, 'Rear sight', 242, 85) + label(394, 24, 'Front sight', 384, 87, 'end') +
        label(150, 206, 'Bolt', 162, 118) + label(210, 206, 'Mag', 199, 132) + label(320, 206, 'Barrel', 310, 101);
    } else if (type === 'rimfire') { // CZ 457: wood stock, slim barrel, dovetail on the receiver, small magazine
      g = `<path d="M20 106 L124 98 L156 98 L160 112 L126 118 L64 132 L24 132 Z" fill="${WD}"/>
        <rect x="156" y="92" width="70" height="15" rx="3" fill="${SP}"/>
        <path d="M156 107 L268 107 L268 114 L180 118 L156 116 Z" fill="${WD}"/>
        <rect x="226" y="96" width="150" height="5" fill="${SP}"/>
        <rect x="160" y="88" width="62" height="4" fill="${ST}"/>
        <path d="M200 98 L196 112" stroke="${SP}" stroke-width="5" stroke-linecap="round"/><circle cx="195" cy="114" r="5" fill="${SP}"/>
        <rect x="178" y="115" width="16" height="12" fill="${SP}"/>
        <path d="M160 116 q2 14 16 12" stroke="${SP}" stroke-width="3" fill="none"/><path d="M167 116 l2 8" stroke="${TX}" stroke-width="3"/>
        <rect x="216" y="104" width="9" height="5" fill="${BZ}"/>`;
      labels = label(6, 24, 'Stock', 44, 112, 'start') + label(190, 24, 'Scope base', 190, 88) + label(330, 24, 'Barrel', 330, 96) +
        label(150, 206, 'Mag', 186, 127) + label(225, 206, 'Safety', 220, 109) + label(300, 206, 'Bolt', 198, 114);
    } else if (type === 'sks') { // SKS: wood stock to the front, gas tube over the barrel, fixed magazine, folding bayonet
      g = `<path d="M16 102 L110 96 L140 98 L150 114 L112 118 L56 130 L20 132 Z" fill="${WD}"/>
        <rect x="140" y="90" width="78" height="16" rx="3" fill="${ST}"/>
        <path d="M140 106 L300 106 L300 113 L170 116 L140 114 Z" fill="${WD}"/>
        <rect x="218" y="92" width="96" height="9" rx="3" fill="${WD}"/>
        <rect x="218" y="99" width="168" height="5" fill="${SP}"/>
        <rect x="378" y="88" width="4" height="11" fill="${SP}"/>
        <rect x="222" y="86" width="16" height="6" fill="${SP}"/>
        <rect x="214" y="83" width="6" height="7" fill="${SP}"/>
        <rect x="170" y="114" width="34" height="14" rx="3" fill="${SP}"/>
        <rect x="300" y="106" width="70" height="4" fill="${ST}"/>
        <path d="M150 115 q2 15 16 13" stroke="${SP}" stroke-width="3" fill="none"/><path d="M157 115 l2 8" stroke="${TX}" stroke-width="3"/>
        <rect x="162" y="113" width="8" height="6" fill="${BZ}"/>`;
      labels = label(6, 24, 'Stock', 40, 112, 'start') + label(200, 24, 'Rear sight', 230, 86) + label(300, 52, 'Gas tube', 290, 92) + label(394, 24, 'Front', 380, 88, 'end') +
        label(110, 206, 'Safety', 165, 119) + label(200, 232, 'Fixed mag', 187, 128) + label(335, 206, 'Bayonet', 335, 110);
    } else { // shotgun: pump or semi auto, rib and bead, magazine tube, screw in choke
      g = `<path d="M16 102 L118 96 L146 96 L152 112 L118 118 L58 132 L20 132 Z" fill="${WD}"/>
        <rect x="146" y="88" width="66" height="22" rx="4" fill="${SP}"/>
        <rect x="212" y="92" width="174" height="7" fill="${ST}"/>
        <rect x="212" y="89" width="174" height="3" fill="${SP}"/>
        <rect x="212" y="101" width="110" height="6" fill="${ST}"/>
        <rect x="226" y="98" width="62" height="14" rx="5" fill="${WD}"/>
        <rect x="372" y="92" width="14" height="7" fill="${SP}"/>
        <circle cx="384" cy="87" r="3" fill="${TX}"/>
        <path d="M154 110 q2 15 18 13" stroke="${SP}" stroke-width="3" fill="none"/><path d="M162 110 l2 8" stroke="${TX}" stroke-width="3"/>
        <rect x="176" y="84" width="9" height="5" fill="${BZ}"/>`;
      labels = label(6, 24, 'Stock', 40, 112, 'start') + label(180, 24, 'Safety', 180, 84) + label(290, 24, 'Rib', 300, 89) + label(394, 24, 'Bead', 384, 85, 'end') +
        label(150, 206, 'Trigger', 163, 118) + label(258, 206, 'Forend', 258, 112) + label(394, 232, 'Choke', 378, 99, 'end');
    }
    return `<svg class="gn-svg" id="${id}" viewBox="0 0 400 240" role="img" aria-label="${esc(name)}: side view drawing with its main parts labelled" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" rx="10" fill="${LI}"/><g transform="translate(0 30)">${g}</g>${labels}</svg>`;
  }

  // ---------- log and reminders ----------
  const logKey = (id) => `${PFX}log.${id}`;
  const getLog = (id) => { const l = ldJ(logKey(id), []); return Array.isArray(l) ? l : []; };
  const byTime = (a, b) => (a.d === b.d ? (a.t || 0) - (b.t || 0) : a.d.localeCompare(b.d));
  function readS() { try { return JSON.parse(localStorage.getItem('hm.v1') || '{}'); } catch (e) { return {}; } }
  const SMALL = /grouse|ptarmigan|hare|rabbit|squirrel/i;
  const planGuns = (p) => (p.method !== 'rifle' ? [] : SMALL.test(p.species || p.speciesName || '') ? ['cz457'] : ['tikka', 'sks']);
  // reminders: [{ k (care rule key), level ('now' | 'soon' | 'info'), t (extra text) }], computed from the log and saved plans
  function reminders(id, log, S, t = todayIso()) {
    const L = log.slice().sort(byTime);
    const out = [];
    const lastClean = L.filter((e) => e.c).pop();
    const since = lastClean ? L.filter((e) => byTime(e, lastClean) > 0) : L;
    const dirty = since.filter((e) => !e.c);
    if (dirty.some((e) => e.cor)) out.push({ k: 'corrosive', level: 'now', t: `Corrosive ammunition on ${dShort(dirty.filter((e) => e.cor).pop().d)}.` });
    if (dirty.length) out.push({ k: 'afterUse', level: 'now', t: `Not cleaned since ${dShort(dirty[0].d)}.` });
    if (dirty.some((e) => e.w)) out.push({ k: 'wet', level: 'now', t: '' });
    if (L.length) {
      const svc = L.filter((e) => e.svc).pop();
      if (!svc) out.push({ k: 'yearly', level: 'info', t: 'No yearly service logged yet.' });
      else if (dDiff(svc.d, t) > 365) out.push({ k: 'yearly', level: 'soon', t: `Last yearly service ${dShort(svc.d)}.` });
    }
    const plans = (S && Array.isArray(S.plans) ? S.plans : []).filter((p) => p && p.from && planGuns(p).includes(id));
    const soon = plans.filter((p) => { const d = dDiff(t, p.from); return d >= 0 && d <= 21; }).sort((a, b) => a.from.localeCompare(b.from))[0];
    if (soon && !(lastClean && dDiff(lastClean.d, t) <= 30)) out.push({ k: 'season', level: 'soon', t: `Hunt starts ${dShort(soon.from)}: clean it, check the screws and confirm the zero with your hunting load (Tip).` });
    const ended = plans.filter((p) => { const e = p.to || p.from; const d = dDiff(e, t); return d > 0 && d <= 30; }).sort((a, b) => (b.to || b.from).localeCompare(a.to || a.from))[0];
    if (ended && !(lastClean && lastClean.d > (ended.to || ended.from))) out.push({ k: 'after', level: 'soon', t: `Hunt ended ${dShort(ended.to || ended.from)}: clean it and oil it before storage.` });
    return out;
  }
  function stats(log) {
    const L = log.slice().sort(byTime);
    const lastClean = L.filter((e) => e.c).pop();
    const total = L.reduce((n, e) => n + (+e.r || 0), 0);
    const sinceClean = (lastClean ? L.filter((e) => byTime(e, lastClean) > 0) : L).reduce((n, e) => n + (+e.r || 0), 0);
    return { total, sinceClean, lastClean, last: L[L.length - 1] };
  }
  const SEASON_RULE = { t: 'Before a hunt: clean, check the screws, confirm the zero with the same ammunition you hunt with.', c: 75, s: 'Sighting in lesson: same load 75%; the timing is a Tip', lesson: 'sighting-in' };
  const AFTER_RULE = { t: 'After the season: clean and oil before long storage.', c: 95, s: 'Tikka manual v5.3, periodic maintenance before long storage, as carried in Cleaning and maintenance', lesson: 'firearm-care', re: 'copper fouling' };
  const ruleFor = (gun, k) => (k === 'season' ? SEASON_RULE : k === 'after' ? AFTER_RULE : (gun.care || []).find((c) => c.k === k) || null);
  function remHtml(gun, rems) {
    if (!rems.length) return '<p class="gn-ok">Nothing due. Next: clean it after your next range day or hunt.</p>';
    return `<ul class="gn-rem">${rems.map((r) => { const ru = ruleFor(gun, r.k) || {}; const h = ru.lesson ? lessonHref(ru.lesson, ru.re) : '';
      return `<li class="lv-${r.level}"><b>${r.level === 'now' ? 'Do now' : r.level === 'soon' ? 'Soon' : 'When you can'}:</b> ${esc(ru.t || '')} ${r.t ? `<span>${esc(r.t)}</span>` : ''}
        <div class="gn-src">${src(ru)}${h ? ` <a href="${esc(h)}">Lesson</a>` : ''}</div></li>`; }).join('')}</ul>`;
  }

  // ---------- links: course chapters and lessons ----------
  function course(gun) {
    const ch = sessions().filter((s) => s.id && s.id.indexOf(gun.prefix) === 0);
    return ch;
  }
  function linksHtml(gun) {
    const ch = course(gun);
    const ls = (gun.lessons || []).map((l) => [lessonHref(l.id, l.re), l.label]).filter((l) => l[0]);
    return `<h3>Course chapters</h3>${ch.length
      ? `<div class="list">${ch.map((s) => `<a class="item" href="#/s/${esc(s.id)}"><span class="grow">${esc(s.title)}</span><span class="muted">${esc(s.minutes || '')}${s.minutes ? ' min' : ''}</span></a>`).join('')}</div>`
      : `<p class="muted">The full ${esc(gun.short)} course is coming in an update. Until then, the lessons below cover it.</p>`}
      ${ls.length ? `<h3>Lessons in the app</h3><div class="gn-links">${ls.map(btnLink).join('')}</div>` : ''}`;
  }
  function buyingGuide() {
    const s = sessions().find((x) => x.id.indexOf('mc-shotgun-') === 0 && /buy/i.test(x.id + ' ' + x.title));
    return s ? [`#/s/${s.id}`, s.title] : [lessonHref('shotgun-guide'), 'Choosing your shotgun (buying guide)'];
  }

  // ---------- view ----------
  function css() {
    if (document.getElementById('hm-gn-css')) return;
    const st = document.createElement('style'); st.id = 'hm-gn-css';
    st.textContent = `
.gn .cert, .gn-home .cert { font-size: 14px; }
.gn h2 { font-size: 20px; margin: 0 0 6px; }
.gn h3 { font-size: 17px; margin: 14px 0 6px; }
.gn-svg { display: block; width: 100%; max-width: 480px; height: auto; margin: 4px 0 10px; }
.gn-meta { margin: 0 0 8px; padding: 0; list-style: none; font-size: 16px; }
.gn-meta li { margin: 3px 0; }
.gn-facts { margin: 0; padding-left: 20px; font-size: 16px; }
.gn-facts li { margin: 6px 0; }
.gn-src { font-size: 14px; color: var(--muted); margin-top: 2px; }
.gn-src a { font-size: 15px; font-weight: 700; display: inline-flex; align-items: center; min-height: 44px; padding: 0 6px; }
.gn-links { display: flex; flex-wrap: wrap; gap: 8px; }
.gn-links a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; font-size: 15px; font-weight: 700; color: var(--ink); text-decoration: none; background: var(--card); }
.gn .list .item, .gn .item { min-height: 44px; box-sizing: border-box; display: flex; align-items: center; }
.gn-rem { list-style: none; margin: 0; padding: 0; font-size: 16px; }
.gn-rem li { border-left: 5px solid var(--sage); padding: 6px 10px; margin: 0 0 8px; background: var(--bg); border-radius: 0 8px 8px 0; }
.gn-rem li.lv-now { border-left-color: var(--blaze, #ff6a13); }
.gn-rem li span { display: block; color: var(--muted); font-size: 15px; }
.gn-ok { font-size: 16px; margin: 4px 0; }
.gn-form label { display: block; font-size: 16px; margin: 8px 0 4px; font-weight: 700; }
.gn-form input[type=date], .gn-form input[type=number], .gn-form input[type=text] { width: 100%; min-height: 44px; font-size: 16px; box-sizing: border-box; }
.gn-form .check { min-height: 44px; border: 0; padding: 4px 0; font-weight: 400; }
.gn-form .check span { font-size: 16px; }
.gn-log { list-style: none; margin: 0; padding: 0; }
.gn-log li { display: flex; gap: 8px; align-items: center; border-bottom: 1px solid var(--line); padding: 6px 0; font-size: 16px; }
.gn-log li .grow { flex: 1; }
.gn-log li button { min-height: 44px; min-width: 44px; font-size: 15px; }
.gn-i { border-bottom: 1px solid var(--line); padding: 4px 0 8px; }
.gn-i:last-child { border-bottom: 0; }
.gn-i .check { border: 0; padding: 4px 0; min-height: 44px; }
.gn-i .check span { font-size: 16px; }
.gn-i .gn-src { margin-left: 40px; }
.gn-rule { padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 16px; }
.gn-rule:last-child { border-bottom: 0; }
.gn-pc { display: grid; grid-template-columns: 1fr; gap: 6px; font-size: 16px; }
.gn-pc ul { margin: 2px 0; padding-left: 20px; }
.gn-tbl { width: 100%; border-collapse: collapse; font-size: 15px; }
.gn-tbl td, .gn-tbl th { border-bottom: 1px solid var(--line); padding: 6px 4px; text-align: left; vertical-align: top; }
.gn-card .btn { min-height: 48px; }
.gn-toc { display: flex; flex-wrap: wrap; gap: 8px; }
.gn-toc a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 99px; color: var(--ink); text-decoration: none; font-size: 15px; background: var(--card); }
.gn-due { display: inline-block; font-size: 14px; font-weight: 800; background: var(--blaze, #ff6a13); color: #17201a; border-radius: 99px; padding: 1px 10px; margin-left: 6px; vertical-align: middle; }`;
    document.head.appendChild(st);
  }
  function chrome(title) {
    css();
    const tt = document.getElementById('top-title'); if (tt) tt.textContent = title;
    document.querySelectorAll('.tabs a').forEach((a) => { const on = a.dataset.tab === 'more'; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    return document.getElementById('view');
  }
  const BANNER = '<p class="muted" style="margin:0 4px 10px">Study aid only. The official regulations are the law. Each rule shows its certainty and source.</p>';
  const SAFE = '<p class="gn-safe"><b>Every time you pick it up:</b> point it in a safe direction, finger off the trigger, check it is unloaded (ACTS and PROVE).</p>';

  function render(args) {
    const v = chrome('My guns');
    v.innerHTML = '<div class="card"><p class="muted">Loading...</p></div>';
    data().then((d) => {
      if (!v.isConnected) return;
      const id = args && args[0];
      if (id) { const g = d.guns.find((x) => x.id === id); if (g) return gunView(v, d, g); v.innerHTML = '<div class="card"><h2>Gun not found</h2><a class="btn block" href="#/guns">My guns</a></div>'; return; }
      hub(v, d);
    }).catch(() => { v.innerHTML = '<div class="card"><h2>My guns</h2><p>Could not load the gun data. Open the app once with signal, then it works offline.</p></div>'; });
  }

  function gunCard(g, S) {
    const log = g.owned ? getLog(g.id) : [];
    const rems = g.owned ? reminders(g.id, log, S) : [];
    const now = rems.filter((r) => r.level === 'now').length;
    const st = stats(log);
    const guide = buyingGuide();
    return `<div class="card gn-card" id="gn-c-${esc(g.id)}"><h2>${esc(g.name)}${now ? `<span class="gn-due">${now} to do</span>` : ''}</h2>
      ${drawing(g.draw, g.name)}
      <ul class="gn-meta"><li><b>Calibre:</b> ${esc(g.calibre)}</li><li><b>Action:</b> ${esc(g.action)}</li><li><b>Sights:</b> ${esc(g.sights)}</li>
      ${g.owned ? `<li><b>Last cleaned:</b> ${st.lastClean ? esc(dShort(st.lastClean.d)) : 'not logged yet'}. <b>Rounds logged:</b> ${st.total}</li>` : '<li><b>Not owned yet.</b> Read the buying guide first.</li>'}</ul>
      <div class="btn-row" style="flex-wrap:wrap">${g.owned ? `<a class="btn primary" href="#/guns/${esc(g.id)}">Open: log, reminders, lessons</a>` : `<a class="btn primary" href="#/guns/${esc(g.id)}">Open the shotgun page</a>${guide[0] ? `<a class="btn" href="${esc(guide[0])}">Buying guide</a>` : ''}`}</div></div>`;
  }

  function checklistHtml(d) {
    const ticks = ldJ(PFX + 'check', {});
    const owned = d.guns.filter((g) => g.owned);
    const items = [];
    for (const it of d.checklist) {
      if (it.per) owned.forEach((g) => items.push({ id: 'ammo-' + g.id, t: g.ammo, s: g.ammoSrc === 'Tip' ? null : g.ammoSrc, tip: g.ammoSrc === 'Tip' }));
      else items.push(it);
    }
    return `<div class="card" id="gn-range"><h2>Range day checklist</h2><p class="muted">Ticks stay on this phone.</p>
      ${items.map((it) => { const h = it.lesson ? lessonHref(it.lesson, it.re) : '';
        return `<div class="gn-i"><label class="check"><input type="checkbox" data-gn="${esc(it.id)}" ${ticks[it.id] ? 'checked' : ''}><span>${esc(it.t)}</span></label>
        <div class="gn-src">${it.rules ? '<a href="#/guns" data-jump="gn-rules">Storage and transport card</a>' : src(it)}${h ? ` <a href="${esc(h)}">Lesson</a>` : ''}</div></div>`; }).join('')}
      <div class="btn-row" style="flex-wrap:wrap">${lessonHref('season-practice', 'one range day') ? `<a class="btn" href="${esc(lessonHref('season-practice', 'one range day'))}">The range day plan</a>` : ''}<a class="btn" href="#/map/tool/practice">Where can I practise?</a><button type="button" class="btn" id="gn-reset">Untick all</button></div></div>`;
  }
  function rulesHtml(d) {
    return `<div class="card" id="gn-rules"><h2>${esc(d.rules.title)}</h2><p class="muted">Study aid only. The official regulations are the law.</p>
      ${d.rules.items.map((r) => { const h = r.lesson ? lessonHref(r.lesson, r.re) : ''; return `<div class="gn-rule">${esc(r.t)}<div class="gn-src">${src(r)}${h ? ` <a href="${esc(h)}">Lesson</a>` : ''}</div></div>`; }).join('')}</div>`;
  }
  function laterHtml(d) {
    const L = d.later;
    return `<div class="card" id="gn-later"><h2>${esc(L.title)}</h2><p class="muted">${esc(L.intro)}</p>
      ${L.items.map((it) => { const guide = buyingGuide();
        return `<h3>${esc(it.name)}</h3><p style="font-size:16px;margin:0 0 6px">${esc(it.why)}</p>
        <div class="gn-pc"><div><b>Pros</b><ul>${it.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div><b>Cons</b><ul>${it.cons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
        <table class="gn-tbl"><thead><tr><th>Tier</th><th>Price</th><th>Examples</th></tr></thead><tbody>${it.prices.map((p) => `<tr><td>${esc(p.tier)}</td><td>${esc(p.p)}</td><td>${esc(p.eg)}</td></tr>`).join('')}</tbody></table>
        <div class="gn-src">${badge(it.priceC)} ${esc(it.priceSrc)}. Prices change: check at the store.</div>
        <div class="btn-row" style="flex-wrap:wrap;margin-top:8px">${guide[0] ? `<a class="btn primary" href="${esc(guide[0])}">${esc(guide[1])}</a>` : ''}<a class="btn" href="#/guns/shotgun">Shotgun page</a></div>`; }).join('')}</div>`;
  }

  function hub(v, d) {
    const S = readS();
    v.innerHTML = `<div class="gn">${BANNER}
      <div class="card"><h2>Your guns</h2><ul class="gn-facts"><li>A card for each gun: drawing, calibre, sights, lessons.</li><li>Log every range day and cleaning. Reminders come from your log.</li><li>Your log stays on this phone and goes in your backup.</li></ul>
        <div class="gn-toc" style="margin-top:10px"><a href="#/guns" data-jump="gn-range">Range day checklist</a><a href="#/guns" data-jump="gn-rules">Storage and transport</a><a href="#/guns" data-jump="gn-later">Guns to add later</a></div></div>
      ${d.guns.map((g) => gunCard(g, S)).join('')}
      ${checklistHtml(d)}
      ${rulesHtml(d)}
      ${laterHtml(d)}
      <p class="muted" style="margin:0 4px 14px">Gun facts checked ${esc(d.lastChecked)}. ${esc(d.note)}</p></div>`;
    wireJumps(v);
    v.onchange = (e) => {
      const cb = e.target.closest && e.target.closest('input[data-gn]'); if (!cb) return;
      const o = ldJ(PFX + 'check', {}); if (cb.checked) o[cb.dataset.gn] = Date.now(); else delete o[cb.dataset.gn]; svJ(PFX + 'check', o);
    };
    v.querySelector('#gn-reset').onclick = () => { if (!confirm('Untick every item on the range day checklist?')) return; try { localStorage.removeItem(PFX + 'check'); } catch (e) { /* storage blocked */ } hub(v, d); };
  }
  function wireJumps(v) {
    v.querySelectorAll('[data-jump]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
  }

  function gunView(v, d, g) {
    chrome(g.short);
    const S = readS();
    const facts = `<h3>Key facts</h3><ul class="gn-facts">${g.facts.map((f) => `<li>${esc(f.t)}<div class="gn-src">${src(f)}</div></li>`).join('')}</ul>`;
    if (!g.owned) {
      const guide = buyingGuide();
      v.innerHTML = `<div class="gn">${BANNER}<div class="card"><h2>${esc(g.name)}: not owned yet</h2>${drawing(g.draw, g.name)}
        <ul class="gn-meta"><li><b>Pick:</b> ${esc(g.calibre)}</li><li><b>Actions:</b> ${esc(g.action)}</li><li><b>Sights:</b> ${esc(g.sights)}</li></ul>
        ${guide[0] ? `<a class="btn primary block" href="${esc(guide[0])}">${esc(guide[1])}</a>` : ''}${facts}${linksHtml(g)}</div>
        ${laterHtml(d)}<div class="card"><a class="btn block" href="#/guns">All my guns</a></div></div>`;
      wireJumps(v); return;
    }
    const draw = () => {
      const log = getLog(g.id), rems = reminders(g.id, log, S), st = stats(log);
      const L = log.slice().sort(byTime).reverse();
      v.innerHTML = `<div class="gn">${BANNER}
        <div class="card"><h2>${esc(g.name)}</h2>${drawing(g.draw, g.name)}
          <ul class="gn-meta"><li><b>Calibre:</b> ${esc(g.calibre)}</li><li><b>Action:</b> ${esc(g.action)}</li><li><b>Sights:</b> ${esc(g.sights)}</li></ul>${facts}</div>
        <div class="card" id="gn-remcard"><h2>Reminders</h2>
          <p class="muted">Last cleaned: ${st.lastClean ? esc(dShort(st.lastClean.d)) : 'not logged yet'}. Rounds since: ${st.sinceClean}. Rounds logged: ${st.total}.</p>${remHtml(g, rems)}</div>
        <div class="card gn-form"><h2>Cleaning and maintenance log</h2>${SAFE}
          <form id="gn-f"><label for="gn-d">Date</label><input type="date" id="gn-d" value="${esc(todayIso())}" required>
          <label for="gn-r">Rounds fired</label><input type="number" id="gn-r" min="0" max="5000" step="1" inputmode="numeric" value="0">
          <label class="check"><input type="checkbox" id="gn-c"><span>Cleaned it</span></label>
          <label class="check"><input type="checkbox" id="gn-w"><span>It got wet</span></label>
          ${g.id === 'sks' ? '<label class="check"><input type="checkbox" id="gn-cor"><span>Corrosive or surplus ammunition</span></label>' : ''}
          <label class="check"><input type="checkbox" id="gn-svc"><span>Yearly service done</span></label>
          <label for="gn-n">Notes</label><input type="text" id="gn-n" maxlength="300" placeholder="Range, groups, anything odd">
          <button type="submit" class="btn primary block" style="margin-top:10px">Add to log</button></form>
          ${L.length ? `<h3>Your log</h3><ul class="gn-log">${L.map((e) => `<li><span class="grow"><b>${esc(dShort(e.d))}</b>: ${+e.r || 0} rounds${e.c ? ', cleaned' : ', not cleaned'}${e.w ? ', wet' : ''}${e.cor ? ', corrosive' : ''}${e.svc ? ', yearly service' : ''}${e.n ? `<br><span class="muted">${esc(e.n)}</span>` : ''}</span><button type="button" class="btn" data-del="${esc(e.id)}" aria-label="Delete this entry">Delete</button></li>`).join('')}</ul>` : '<p class="muted">No entries yet. Log your next range day or cleaning.</p>'}
          <p class="muted">Stays on this phone. More, Backup saves it.</p></div>
        <div class="card">${linksHtml(g)}</div>
        <div class="card"><div class="btn-row" style="flex-wrap:wrap"><a class="btn" href="#/guns" >All my guns</a></div></div></div>`;
      v.querySelector('#gn-f').onsubmit = (e) => {
        e.preventDefault();
        const q = (s) => v.querySelector(s);
        const dt = q('#gn-d').value; if (!/^\d{4}-\d{2}-\d{2}$/.test(dt)) { alert('Pick a date.'); return; }
        const ent = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), d: dt, r: Math.max(0, Math.min(5000, parseInt(q('#gn-r').value, 10) || 0)), c: q('#gn-c').checked, w: q('#gn-w').checked, svc: q('#gn-svc').checked, n: q('#gn-n').value.trim().slice(0, 300) };
        if (q('#gn-cor')) ent.cor = q('#gn-cor').checked;
        const l = getLog(g.id); l.push(ent); svJ(logKey(g.id), l); draw();
      };
      v.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { if (!confirm('Delete this log entry?')) return; svJ(logKey(g.id), getLog(g.id).filter((e) => e.id !== b.dataset.del)); draw(); }; });
    };
    draw();
  }

  // ---------- Home card: small link, with what is due ----------
  function homeCard(S) {
    css();
    S = S || readS();
    const due = [];
    OWNED.forEach((id) => { const r = reminders(id, getLog(id), S); if (r.some((x) => x.level === 'now')) due.push(NAMES[id]); else if (r.some((x) => x.level === 'soon')) due.push(NAMES[id] + ' (soon)'); });
    return `<a class="card cont cont-sm gn-home" id="gn-home" href="#/guns"><div class="cont-k">My guns</div><div class="cont-t">${due.length ? `To do: ${esc(due.join(', '))}` : 'Cleaning log, range day checklist, transport rules'}</div></a>`;
  }

  window.HMGuns = { homeCard, _reminders: reminders, _stats: stats, _drawing: drawing };
  window.HMRoutes = window.HMRoutes || {};
  window.HMRoutes.guns = render;
})();
