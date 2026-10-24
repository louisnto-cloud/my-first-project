/* "Hunt week" countdown checklist (add on). Routes: #/huntweek (the next saved plan that starts within 14 days, else the
   next one coming up) and #/huntweek/<planId>. Home card: window.HMHuntWeek.homeCard(S), shown by app.js home() only when
   a saved plan (S.plans, made by plan.js) starts within 14 days, until its last day.
   Ticks: localStorage hm.huntweek.<planId> ({ itemId: time }) on this phone only; the backup's add on data includes hm.huntweek.*.
   Every rule line carries its certainty and source, copied from the app's lessons (lesson named) or from an official page
   read on the date shown. Tips are labelled Tip. Nothing here is new law: the lessons and the official regulations decide. */
(function () {
  'use strict';
  const TZ = 'America/Vancouver';
  const PFX = 'hm.huntweek.';
  const WINDOW = 14;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const badge = (v) => `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}" title="Certainty">${v}%</span>`;
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const dDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const dLabel = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
  const ldJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const svJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const sessions = () => (window.HM && window.HM.sessions) || [];
  const lessonHref = (id, re) => {
    const s = sessions().find((x) => x.id === id);
    if (!s) return '';
    const i = re ? (s.steps || []).findIndex((st, k) => k > 0 && re.test(st.title || '')) : 0; // screen 0 repeats the lesson title
    return `#/s/${id}/${Math.max(0, i)}`;
  };
  const lessonTitle = (id) => { const s = sessions().find((x) => x.id === id); return s ? s.title : id; };
  const L = (id, re, label) => [lessonHref(id, re), label || lessonTitle(id)];

  // ---------- plans ----------
  function plansOf(S) { return S && Array.isArray(S.plans) ? S.plans.filter((p) => p && p.id && p.from) : []; }
  function readS() { try { return JSON.parse(localStorage.getItem('hm.v1') || '{}'); } catch (e) { return {}; } }
  // the plan Home shows: starts within 14 days (or has started and not ended), soonest first
  function soonPlan(S, t = todayIso()) {
    return plansOf(S).filter((p) => { const d = dDiff(t, p.from); return d <= WINDOW && (p.to || p.from) >= t; })
      .sort((a, b) => a.from.localeCompare(b.from))[0] || null;
  }
  const nextPlan = (S, t = todayIso()) => plansOf(S).filter((p) => (p.to || p.from) >= t).sort((a, b) => a.from.localeCompare(b.from))[0] || null;
  const planName = (p) => `${p.speciesName || 'Hunt'}${p.where && p.where.mu ? `, MU (Management Unit) ${p.where.mu}` : ''}`;
  const isDeerR2 = (p) => !p || (/deer/i.test(p.species || p.speciesName || '') && /^2-/.test((p.where && p.where.mu) || ''));

  // ---------- the checklist ----------
  // item: { id, t (text, may hold safe HTML), c (certainty) or tip, s (source), links [[href, label]], only (plan filter) }
  const SYN = 'BC Hunting and Trapping Regulations Synopsis 2026 to 2028';
  const ROADS = 'https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/local-road-safety-information/chilliwack-natural-resource-district-district-road-safety-information';
  const REGS = 'https://www.gov.bc.ca/huntingregulations';
  function groups(p) {
    const pid = p ? p.id : '';
    const plan = p ? `#/plan/${pid}` : '#/plan';
    const two = !p || p.party !== 'solo';
    return [
      { id: 'g14', from: 14, to: 8, h: '2 weeks out', sub: '14 to 8 days before', items: [
        { id: 'lic-hunt', t: 'BC hunting licence bought ($32 plus GST, Goods and Services Tax). Close to the hunt, buy it in person with the species licence: mail can take weeks.', c: 99, s: `${SYN}, pages 5 and 8 (Licences and tags lesson)`, links: [L('licences', /hunting licence/i, 'Licences and tags')] },
        { id: 'lic-deer', t: 'Deer species licence for each hunter, bought in person. Online orders are mailed: about 14 days in one source, 14 business days (about 3 weeks) in another. $15 plus GST. A black tailed deer uses the mule deer licence.', c: 99, s: `${SYN}, pages 5 and 8; BC species licences page (Licences and tags lesson)`, links: [L('licences', /deer tags/i, 'Deer tags')] },
        { id: 'lic-fwid', t: 'FWID (Fish and Wildlife ID) number known, photo ID in your wallet. No card needed.', c: 95, s: 'BC Fish and Wildlife ID page (Licences and tags lesson)', links: [L('licences', /FWID/i, 'Your hunter number')] },
        two && { id: 'lic-partner', t: `With your ${(p && p.partner) || 'partner'}: they buy their own licence and deer licence. No sharing.`, c: 99, s: `${SYN}, page 11 item 2 (Licences and tags lesson)`, links: [L('licences', /deer tags/i, 'Licences and tags')] },
        { id: 'lic-cancel', t: 'Know how to cancel the tag: kill, cancel the licence as printed on it, then touch the deer. The shooter cancels their own.', c: 99, s: `${SYN}, page 11 (Rule Book: bag limits, tags and transport)`, links: [L('rb-bag-limits', /cancelling/i, 'Cancelling your licence'), ['#/field/c/tag', 'Field card']] },
        { id: 'lic-carry', t: 'Carry all your species licences while hunting, cancelled and not.', c: 99, s: `${SYN}, page 5 (Rule Book: bag limits, tags and transport)`, links: [L('rb-bag-limits', /keeping and replacing/i, 'Keeping your licences')] },
        { id: 'gun-car', t: 'Rifle unloaded in the truck: no cartridge in the chamber or in an attached magazine.', c: 99, s: 'Firearm Violence Prevention Act s. 4(1); federal storage and transport regulations (SOR/98-209) s. 1 (Firearm care lesson)', links: [L('firearm-care', /transport/i, 'Transport and storage')] },
        { id: 'gun-left', t: 'Leaving the truck: rifle locked in the trunk or a lockable compartment. No trunk: out of sight, truck locked.', c: 99, s: 'SOR/98-209 s. 10(2) (Firearm care lesson)', links: [L('firearm-care', /transport/i, 'Transport and storage')] },
        { id: 'gun-home', t: 'At home: stored unloaded, with a lock, the bolt out, or in a locked container or room. Ammunition not at hand unless locked up too.', c: 99, s: 'SOR/98-209 s. 5(1) (Firearm care lesson)', links: [L('firearm-care', /transport/i, 'Transport and storage')] },
        { id: 'sight-in', t: 'Sight in the rifle at a range with the same ammunition you will hunt with. Zero at 100 m (109 yd).', c: 75, s: 'Sighting in lesson: same load 75%; the 100 m zero is a Tip', links: [['#/map/tool/practice', 'Where can I practise?'], L('sighting-in', /ranges near/i, 'Sighting in')], ranges: true },
        { id: 'study', t: 'Read the must know lessons on your study path: they come first on the Home study card.', tip: true, links: [[plan, 'Study path (plan, part 5)'], L('local-harrison-deer', null, 'Your Harrison deer hunt')] },
        { id: 'gear', t: 'Gear checked against the lists.', tip: true, links: [[plan, 'Plan checklist (part 4)'], ['#/lists/before', 'Before every hunt'], ['#/lists/licences', 'Licences and paperwork'], ['#/lists/animal/mule-deer', 'Deer list']] },
        { id: 'meat-plan', t: 'Meat plan: coolers, ice, breathable game bags. Target: meat below 4°C (40°F) as fast as you can, in a cooler the same day.', c: 80, s: 'Meat care lesson', links: [L('meat-care', /cooler/i, 'Cooler and ice plan'), L('packing-out', null, 'Packing out')] },
        { id: 'meat-edible', t: 'Bring the edible portions home: neck, ribs, all four quarters and the loins.', c: 99, s: `${SYN}, pages 3 and 12 (Rule Book: unlawful acts)`, links: [L('rb-unlawful-acts', /meat rule/i, 'The meat rule')] },
        !two && { id: 'solo-pack', t: 'Solo: pick spots with a short pack out, 1 km or less and 100 m climb or less.', tip: true, links: [L('local-harrison-deer', /brother|solo/i, 'With your brother or solo')] },
      ] },
      { id: 'g7', from: 7, to: 3, h: 'The week before', sub: '7 to 3 days before', items: [
        { id: 'scout', t: 'Scout your spots on the Hunt Map (Scouting layer set) and, if you can, on the ground. Every spot is a candidate.', tip: true, links: [['#/map', 'Hunt Map'], [plan, 'My plan spots']] },
        isDeerR2(p) && { id: 'roads', t: 'Chilliwack district road notices read. On 23 October 2026 the page (updated 21 October 2026) said: Mystery 5500 FSR (Forest Service Road) no access past 0 km, washout at 2.0 km; Hemlock Valley FSR no access at 0 km; Harrison East FSR no access past 55 km. Read it again before you go.', c: 95, s: 'BC government, Chilliwack Natural Resource District road safety information, read 2026-10-23', links: [[ROADS, 'Road notices'], L('local-harrison-deer', /logging roads/i, 'Logging roads lesson')] },
        { id: 'regs', t: 'In season regulation changes checked at gov.bc.ca/huntingregulations.', c: 99, s: `${SYN}, page 7 (Countdown lesson)`, links: [[REGS, 'Regulation changes']] },
        { id: 'offline', t: 'Hunt area saved for no signal, on wifi: open your plan, "Offline for no signal". Then Check again.', tip: true, links: [[plan, 'Save for no signal']] },
        { id: 'aid', t: 'First aid kit with a tourniquet packed. Read what to do for a bad bleed.', tip: true, links: [['#/safety/sos', 'Emergency card'], L('field-first-aid', null, 'First aid lesson')] },
        { id: 'spray', t: 'Bear spray on the hip or chest, never in the pack.', c: 75, s: 'WildSafeBC (Safety: bears and cougars)', links: [['#/safety/wildlife', 'Bears and cougars']] },
        { id: 'train', t: 'Practise shot placement and the legal buck trainer.', tip: true, links: [['#/train/shot', 'Shot placement'], ['#/train/buck', 'Legal buck']] },
      ] },
      { id: 'g2', from: 2, to: 2, h: '2 days before', sub: '', items: [
        { id: 'live', t: 'Weather, wind and fire bans checked.', tip: true, links: [['#/safety/live', 'Conditions']] },
        { id: 'trip', t: 'Trip plan made and sent to a contact: who, where, when back.', c: 75, s: 'AdventureSmart (Safety: trip plan)', links: [['#/safety/trip', 'Trip plan']] },
        { id: 'turn', t: 'Turnaround time picked: sunset minus your walk out time. Legal light for deer ends 1 hour after sunset.', c: 99, s: `Legal light: ${SYN}, page 11 item 38. Turnaround: Tip`, links: [['#/safety/turn', 'Turnaround'], ['#/field/light', 'Legal light']] },
        two && { id: 'zones', t: 'With your brother: zones of fire, a meeting point and a clock time agreed.', tip: true, links: [L('hunting-partner', null, 'Hunting with a partner')] },
      ] },
      { id: 'g1', from: 1, to: 1, h: 'The day before', sub: '', items: [
        isDeerR2(p) && { id: 'night', t: 'The night before: road notices, sunrise for your spot, tag steps in your head (kill, cancel, touch), tell someone at home.', tip: true, links: [L('local-harrison-deer', /logging roads.*2 of 2/i, 'Harrison lesson'), [ROADS, 'Road notices']] },
        { id: 'bed', t: 'Before bed: trip plan sent to your contact (who, where, when back). An alarm set for the leave time on the hour by hour plan (Tip). All your licences on you, and your FWID (Fish and Wildlife ID) number with photo ID.', c: 75, s: `Trip plan: AdventureSmart (75%). Carry all licences: ${SYN}, page 5 (99%). FWID: BC Fish and Wildlife ID page (95%). Alarm: Tip`, links: [['#/safety/trip', 'Trip plan'], L('licences', /FWID/i, 'Your hunter number')] },
        { id: 'charge', t: 'Phone and power bank charged. Offline area checked: Ready.', tip: true, links: [[plan, 'My plan']] },
        { id: 'pack', t: 'Packed: licences, ID, ammunition, knife, game bags, first aid, headlamp.', tip: true, links: [['#/lists/before', 'Before every hunt']] },
        { id: 'backup', t: 'Backup exported (More, Backup), in case the phone is lost.', tip: true, links: [['#/more', 'More']] },
      ] },
      { id: 'g0', from: 0, to: 0, h: 'Morning of', sub: '', items: [
        { id: 'light', t: 'Legal light: 1 hour before sunrise to 1 hour after sunset.', c: 99, s: `${SYN}, page 11 item 38`, links: [['#/field/light', 'Legal light today']] },
        { id: 'load', t: 'Load only where you may lawfully shoot. Never on or across a road allowance. Walk off the road, then load (Tip).', c: 99, s: `SOR/98-209 s. 15; ${SYN}, page 10`, links: [L('firearm-safety', /at the car/i, 'At the car')] },
        { id: 'truck', t: 'Mark my truck on the Hunt Map where you park.', tip: true, links: [['#/map', 'Hunt Map']] },
        { id: 'alarm', t: 'Turnaround alarm on. Trip plan still with your contact.', tip: true, links: [['#/safety/turn', 'Turnaround']] },
        { id: 'legal', t: 'In doubt about a shot? Run Legal to shoot? in Field Mode.', tip: true, links: [['#/field/legal', 'Legal to shoot?']] },
      ] },
      { id: 'gA', from: -1, to: -999, h: 'After the shot', sub: 'Read it now, use it then', items: [
        { id: 'wait', t: 'Stay still, watch, mark where it stood. Wait about 30 minutes before you follow.', tip: true, links: [L('after-the-shot', /wait/i, 'After the shot'), L('blood-trailing', null, 'Blood trailing')] },
        { id: 'cancel', t: 'Kill, cancel the licence, then touch the deer.', c: 99, s: `${SYN}, page 11`, links: [['#/field/c/tag', 'Tag card']] },
        { id: 'sex', t: 'Leave the unskinned tail and a testicle or part of the penis attached.', c: 99, s: `${SYN}, page 15 (Rule Book: after the kill)`, links: [L('rb-after-the-kill', /evidence of sex/i, 'Evidence of sex')] },
        { id: 'cool', t: 'Cool it: game bags, shade, no plastic or tarp on a warm carcass. Cooler the same day.', c: 80, s: 'Meat care lesson', links: [L('meat-care', /cooling/i, 'Cooling in the field'), ['#/field/c/dress', 'Field dressing card']] },
        { id: 'papers', t: 'Your cancelled licence travels with the meat. Your brother moving your meat without you: a Record of Receipt.', c: 99, s: `${SYN}, pages 14 and 15`, links: [L('rb-bag-limits', /record of receipt: when/i, 'Record of Receipt')] },
        { id: 'log', t: 'Log the hunt in your journal, even a blank day.', tip: true, links: [['#/journal', 'Journal']] },
      ] },
    ].map((g) => Object.assign(g, { items: g.items.filter(Boolean) }));
  }

  // ---------- ranges near Mission (data/addons/practice/ranges.geojson, OpenStreetMap, precached) ----------
  let rangesP = null;
  function nearRanges() {
    if (rangesP) return rangesP;
    const base = ((window.HM && window.HM.bases) || []).find((b) => b.id === 'mission');
    if (!base) return Promise.resolve([]);
    rangesP = fetch('data/addons/practice/ranges.geojson', { credentials: 'omit' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((fc) => {
      const out = [];
      for (const f of fc.features || []) {
        const pr = f.properties || {};
        if (/archery|shotgun|pistol/i.test(pr.kind || '') && pr.kind !== 'mixed') continue; // keep rifle, mixed and type unknown
        let c = f.geometry && f.geometry.coordinates; while (Array.isArray(c) && Array.isArray(c[0])) c = c[0];
        if (!c) continue;
        const dLat = (c[1] - base.lat) * 111.2, dLon = (c[0] - base.lon) * 111.2 * Math.cos(base.lat * Math.PI / 180);
        out.push({ km: Math.hypot(dLat, dLon), p: pr });
      }
      return out.sort((a, b) => a.km - b.km).slice(0, 3);
    }).catch(() => { rangesP = null; return []; });
    return rangesP;
  }

  // ---------- view ----------
  function css() {
    if (document.getElementById('hm-hw-css')) return;
    const st = document.createElement('style'); st.id = 'hm-hw-css';
    st.textContent = `
.hw .cert, .hw-home .cert { font-size: 14px; }
.hw-g h2 { font-size: 19px; margin: 0; }
.hw-g .hw-sub { font-size: 15px; color: var(--muted); margin: 0 0 6px; }
.hw-g.now { border: 2px solid var(--accent); }
.hw-now { display: inline-block; font-size: 14px; font-weight: 800; background: var(--accent); color: var(--accent-ink); border-radius: 99px; padding: 1px 10px; margin-left: 6px; vertical-align: middle; }
.hw-i { border-bottom: 1px solid var(--line); padding: 8px 0 10px; }
.hw-i:last-child { border-bottom: 0; }
.hw-i .check { border: 0; padding: 4px 0; min-height: 44px; }
.hw-i .check span { font-size: 16px; }
.hw-src { font-size: 14px; color: var(--muted); margin: 2px 0 6px 40px; }
.hw-links { display: flex; flex-wrap: wrap; gap: 8px; margin-left: 40px; }
.hw-links a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; font-size: 15px; font-weight: 700; color: var(--ink); text-decoration: none; background: var(--card); }
.hw-rng { margin: 4px 0 6px 40px; font-size: 15px; }
.hw-rng li { margin: 4px 0; }
.hw-bar { height: 10px; background: var(--line); border-radius: 6px; overflow: hidden; margin: 6px 0; }
.hw-bar i { display: block; height: 100%; background: var(--sage); }
.hw-home p { font-size: 16px; margin: 4px 0; }
.hw-plans a { min-height: 44px; }`;
    document.head.appendChild(st);
  }
  const tickKey = (p) => PFX + (p ? p.id : 'general');
  const countDone = (gs, ticks) => { let n = 0, d = 0; gs.forEach((g) => g.items.forEach((it) => { n++; if (ticks[it.id]) d++; })); return { n, d }; };
  // which group is "now": days to go falls inside it (after the hunt starts: Morning of and After the shot)
  const nowGroup = (gs, d) => (d == null ? '' : d <= 0 ? 'g0' : (gs.find((g) => d <= g.from && d >= g.to) || {}).id || (d > 14 ? 'g14' : ''));
  // the pill on the "now" group: more days to go than the group covers (22 days out, first group 14 to 8) means start early, not "now"
  const nowPill = (g, d) => (g && d != null && g.from != null && d > g.from ? 'Start now' : 'Now');

  function itemHtml(it, ticks) {
    const src = it.tip ? '<span class="pill">Tip</span>' : `${badge(it.c)} ${esc(it.s)}`;
    const links = (it.links || []).filter((l) => l && l[0]);
    return `<div class="hw-i"><label class="check"><input type="checkbox" data-hw="${esc(it.id)}" ${ticks[it.id] ? 'checked' : ''}><span>${it.t}</span></label>
      <div class="hw-src">${src}</div>
      ${it.ranges ? '<div class="hw-rng" data-hw-ranges><span class="muted">Ranges near Mission: loading...</span></div>' : ''}
      ${links.length ? `<div class="hw-links">${links.map(([h, lab]) => `<a href="${esc(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}>${esc(lab)}</a>`).join('')}</div>` : ''}</div>`;
  }

  function render(args) {
    css();
    const v = document.getElementById('view');
    const tt = document.getElementById('top-title'); if (tt) tt.textContent = 'Hunt week';
    document.querySelectorAll('.tabs a').forEach((a) => { const on = a.dataset.tab === 'home'; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const S = readS(), t = todayIso();
    const want = args && args[0];
    const p = want ? plansOf(S).find((x) => x.id === want) || null : soonPlan(S, t) || nextPlan(S, t);
    if (want && !p) { v.innerHTML = '<div class="card"><h2>Plan not found</h2><p>It may have been deleted, or it was saved on another phone.</p><a class="btn block" href="#/huntweek">Hunt week</a></div>'; return; }
    const gs = groups(p);
    const key = tickKey(p);
    const ticks = ldJ(key, {});
    const d = p ? dDiff(t, p.from) : null;
    const now = nowGroup(gs, d);
    const cnt = countDone(gs, ticks);
    const others = plansOf(S).filter((x) => (x.to || x.from) >= t && (!p || x.id !== p.id));
    const head = p
      ? `<div class="card"><h2>${esc(planName(p))}</h2><p class="muted">${esc(dLabel(p.from))}${p.to && p.to !== p.from ? ` to ${esc(dLabel(p.to))}` : ''}. ${d > 0 ? `<b>${d} day${d === 1 ? '' : 's'} to go</b>` : d === 0 ? '<b>Today</b>' : '<b>Hunt under way</b>'}</p>
          <div class="hw-bar"><i style="width:${Math.round((cnt.d / Math.max(1, cnt.n)) * 100)}%"></i></div><p class="muted">${cnt.d} of ${cnt.n} done. Ticks stay on this phone.</p>
          <div class="btn-row"><a class="btn" href="#/plan/${esc(p.id)}">Open the plan</a></div></div>`
      : `<div class="card"><h2>No hunt plan yet</h2><p>Make a plan and this list counts down to its first day. Until then it is a general list.</p>
          <div class="btn-row" style="flex-wrap:wrap"><a class="btn primary" href="#/plan/preset/harrison-deer-two">Harrison deer, with my brother</a><a class="btn" href="#/plan/preset/harrison-deer-solo">Harrison deer, solo</a></div></div>`;
    v.innerHTML = `<div class="hw">
      <p class="muted" style="margin:0 4px 10px">Study aid only. The official regulations are the law. Each rule shows its certainty and source.</p>
      ${head}
      ${gs.map((g) => `<div class="card hw-g ${g.id === now ? 'now' : ''}" id="hw-${g.id}"><h2>${esc(g.h)}${g.id === now ? `<span class="hw-now">${nowPill(g, d)}</span>` : ''}</h2>${g.sub ? `<p class="hw-sub">${esc(g.sub)}</p>` : ''}
        ${g.items.map((it) => itemHtml(it, ticks)).join('')}</div>`).join('')}
      ${others.length ? `<div class="card list hw-plans"><h2>Other plans</h2>${others.map((x) => `<a class="item" href="#/huntweek/${esc(x.id)}"><span class="grow">${esc(planName(x))}<br><span class="muted">${esc(dLabel(x.from))}</span></span></a>`).join('')}</div>` : ''}
      <div class="card"><button type="button" class="btn block" id="hw-reset">Untick all</button></div></div>`;
    v.onchange = (e) => {
      const cb = e.target.closest && e.target.closest('input[data-hw]'); if (!cb) return;
      const o = ldJ(key, {}); if (cb.checked) o[cb.dataset.hw] = Date.now(); else delete o[cb.dataset.hw]; svJ(key, o);
      const c2 = countDone(gs, o); const bar = v.querySelector('.hw-bar i'); if (bar) bar.style.width = Math.round((c2.d / Math.max(1, c2.n)) * 100) + '%';
      const m = bar && bar.parentNode.nextElementSibling; if (m) m.textContent = `${c2.d} of ${c2.n} done. Ticks stay on this phone.`;
    };
    v.querySelector('#hw-reset').onclick = () => { if (!confirm('Untick every item on this list?')) return; try { localStorage.removeItem(key); } catch (e) { /* storage blocked */ } render(args); };
    const rb = v.querySelector('[data-hw-ranges]');
    if (rb) nearRanges().then((list) => {
      if (!rb.isConnected) return;
      if (!list.length) { rb.innerHTML = '<span class="muted">Range list not saved on this phone yet. Open Where can I practise? with signal.</span>'; return; }
      rb.innerHTML = `<div>Nearest to Mission, straight line:</div><ul style="margin:2px 0;padding-left:18px">${list.map((r) => `<li>${r.p.website ? `<a href="${esc(r.p.website)}" target="_blank" rel="noopener">${esc(r.p.name)}</a>` : esc(r.p.name)}, about ${Math.round(r.km)} km</li>`).join('')}</ul>
        <div class="muted">OpenStreetMap contributors (ODbL), May 2026 data. Membership or day fees may apply. Call first (Tip).</div>`;
    });
  }

  // ---------- Home card ----------
  function homeCard(S) {
    const t = todayIso();
    const p = soonPlan(S || readS(), t);
    if (!p) return '';
    css();
    const gs = groups(p), ticks = ldJ(tickKey(p), {}), cnt = countDone(gs, ticks), d = dDiff(t, p.from);
    const now = nowGroup(gs, d), g = gs.find((x) => x.id === now);
    const left = g ? g.items.filter((it) => !ticks[it.id]).length : 0;
    return `<div class="card hw-home" id="hw-home"><h2>Hunt week</h2>
      <p><b>${esc(planName(p))}</b>: ${d > 0 ? `${d} day${d === 1 ? '' : 's'} to go` : d === 0 ? 'today' : 'under way'}.</p>
      <div class="hw-bar"><i style="width:${Math.round((cnt.d / Math.max(1, cnt.n)) * 100)}%"></i></div>
      <p class="muted">${cnt.d} of ${cnt.n} done.${g ? ` ${esc(g.h)}${nowPill(g, d) === 'Now' ? '' : ' (coming up, start early)'}: ${left ? `${left} left` : 'all done'}.` : ''}</p>
      <a class="btn primary block" href="#/huntweek/${esc(p.id)}">Open the hunt week list</a></div>`;
  }

  window.HMHuntWeek = { homeCard, soonPlan, _groups: groups };
  window.HMRoutes = window.HMRoutes || {};
  window.HMRoutes.huntweek = render;
})();
