/* Know your weak spots and Hunt ready score (add on). Route: #/progress (next saved plan) and #/progress/<planId>.
   Reads only what the app already stores on this phone, never sends anything anywhere:
   - hm.v1 (app.js): S.quiz (lesson quiz answers), S.cards (flashcard boxes, 0 = missed), S.srs (daily cards), S.done/pos/max
     (screens read), S.plans (plan.js), S.study (today's cards, S.study.q is today's card queue).
   - hm-train-v1 (addons/train.js): shot, buck and range trainer sessions.
   - hm.safety.trip and hm.safety.turn (addons/safety.js): trip plan and turnaround alarm.
   - hm.map.v1 offline list plus map/offline.js checkArea (same check as the plan's "Ready offline" card).
   - Optional, only when present at run time: hm.huntweek.<planId> with window.HMHuntWeek (addons/huntweek.js) and a
     decision trainer (addons/decide.js: window.HMDecide.stats() or hm.decide.* / hm-decide* keys).
   Own data: hm.progress.v1 = { ticks: { <planId>: { sighted: date, licence: date } }, cardDays: [dates] }.
   Window API: HMProgress.score(planId?) -> Promise of the Hunt ready result; HMProgress.weak() -> weak spots (sync). */
(function () {
  'use strict';
  const HM = window.HM;
  if (!HM) return;
  const TZ = 'America/Vancouver';
  const OWN = 'hm.progress.v1';
  const DRILL_MAX = 25; // about 5 minutes at about 12 seconds a card (the app's own card time assumption, plan.js)
  const STREAK_FULL = 7;
  const TRAIN_LAST = 5; // trainer sessions counted per trainer (the latest ones)
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ld = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const readS = () => { const S = ld('hm.v1', {}); return S && typeof S === 'object' ? S : {}; };
  const dayISO = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const fmtDay = (iso) => (iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('en-CA', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }) : '');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const plural = (n, w, ws) => `${n} ${n === 1 ? w : ws || w + 's'}`;

  // ---------- lessons: topic = series ("Mule deer Masterclass", "Rules hunters break") or the phase name ----------
  const sessions = HM.sessions || [];
  const byId = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const PHASE = { 1: 'Fast Start', 2: 'Foundations', 3: 'Reading the Land', 4: 'Species', 5: 'The Shot and After', 6: 'Mastery', 7: 'Rule Book', 8: 'Masterclass', 9: 'Field Wisdom' }; // same names as app.js
  const norm = (t) => String(t || '').toLowerCase().replace(/["']/g, '').replace(/\s+/g, ' ').trim();
  const seriesOf = (s) => { const m = String(s.title || '').match(/^(.+?)\s+\d+\s*:/); return m ? m[1].replace(/^"/, '') : null; };
  const topicOf = (s) => seriesOf(s) || PHASE[s.phase] || 'Other lessons';
  const titleIx = {}, seriesIx = {};
  sessions.forEach((s) => { titleIx[norm(s.title)] = s.id; const se = seriesOf(s); if (se) (seriesIx[norm(se)] = seriesIx[norm(se)] || []).push(s.id); });
  const quizN = (s) => (s.quiz ? s.quiz.length : s.qn || 0); // installed app: quiz count only (qn), text loads on demand
  const stepsN = (s) => (s.steps || []).length + (quizN(s) ? 1 : 0); // screens plus the quiz screen (app.js stepsOf)
  const seenOf = (S, s) => { const n = stepsN(s); return (S.done || {})[s.id] ? n : (S.max || {})[s.id] != null ? Math.min(n, S.max[s.id] + 1) : 0; };

  // ---------- flashcards: the same card ids as app.js allCards() ----------
  let cardIx = null;
  function cards() {
    if (cardIx) return cardIx;
    cardIx = {};
    for (const t of Object.keys(HM.glossary || {})) cardIx['g:' + t] = { deck: 'Terms' };
    for (const r of ((HM.regs && HM.regs.items) || [])) if (r.value) cardIx['r:' + r.key] = { deck: 'Rules' };
    if (HM.flashcards) for (const c of HM.flashcards) cardIx['f:' + c.id] = { deck: c.deck };
    else for (const [deck, , ids] of (HM.cardDecks || [])) for (const id of ids || []) cardIx['f:' + id] = { deck }; // installed app: card ids per deck, text loads on demand
    for (const s of sessions) for (let n = 0; n < quizN(s); n++) cardIx['q:' + s.id + '#' + n] = { deck: 'Quiz', sid: s.id };
    return cardIx;
  }
  // a deck's topic: a quiz card goes to its lesson; a deck named like a lesson goes to that lesson; a deck named like a series to it
  function cardTopic(id) {
    const c = cards()[id]; if (!c) return null;
    if (c.sid && byId[c.sid]) return { topic: topicOf(byId[c.sid]), sid: c.sid, deck: c.deck };
    if (c.deck === 'Terms') return { topic: 'Terms (glossary)', deck: c.deck };
    if (c.deck === 'Rules') return { topic: PHASE[7], deck: c.deck };
    const one = titleIx[norm(c.deck)];
    if (one && byId[one]) return { topic: topicOf(byId[one]), sid: one, deck: c.deck };
    const ser = seriesIx[norm(c.deck)];
    if (ser) return { topic: seriesOf(byId[ser[0]]), deck: c.deck };
    if (/^know your mus$/i.test(c.deck)) return { topic: PHASE[7], sid: byId['know-your-mus'] ? 'know-your-mus' : null, deck: c.deck };
    return { topic: c.deck, deck: c.deck };
  }

  // ---------- trainers ----------
  const TRAINERS = [
    { kind: 'shot', name: 'Shot placement trainer', lesson: 'shot-placement', miss: (r) => r.n - r.score },
    { kind: 'buck', name: 'Legal buck trainer', lesson: 'rb-definitions', miss: (r) => r.n - r.score },
    { kind: 'range', name: 'Range guessing trainer', lesson: 'judging-distance', miss: (r) => r.n - r.within },
  ];

  // ---------- decision trainer (addons/decide.js, built in parallel): read if present, never required ----------
  function decideStats() {
    try {
      const D = window.HMDecide;
      if (D && typeof D.stats === 'function') { const s = D.stats(); if (s && s.total > 0) return { right: +s.right || 0, total: +s.total, topics: Array.isArray(s.topics) ? s.topics : [], how: 'from the decision trainer' }; }
    } catch (e) { console.warn('progress: decide stats', e); }
    try { // fallback: session lists of { score, n } in a hm.decide.* or hm-decide* key
      for (let k = 0; k < localStorage.length; k++) {
        const key = localStorage.key(k); if (!/^hm[.-]decide/.test(key)) continue;
        const o = ld(key, null); const list = Array.isArray(o) ? o : o && (o.sessions || o.history || o.scores);
        const ok = Array.isArray(list) ? list.filter((r) => r && r.n > 0 && r.score != null).slice(-3) : [];
        if (ok.length) { const right = ok.reduce((a, r) => a + +r.score, 0), total = ok.reduce((a, r) => a + +r.n, 0); return { right, total, topics: [], how: `latest ${plural(ok.length, 'session')} saved by the decision trainer` }; }
      }
    } catch (e) { /* storage blocked */ }
    return null;
  }

  // ---------- weak spots ----------
  function weak() {
    const S = readS(), T = {}, perLesson = {};
    const add = (topic, part, miss, tried, sid) => {
      const t = (T[topic] = T[topic] || { topic, miss: 0, tried: 0, parts: { quiz: [0, 0], cards: [0, 0], trainer: [0, 0], decide: [0, 0] }, lessons: {}, decks: {}, trainers: {} });
      t.miss += miss; t.tried += tried; t.parts[part][0] += miss; t.parts[part][1] += tried;
      if (sid && miss) { t.lessons[sid] = (t.lessons[sid] || 0) + miss; perLesson[sid] = (perLesson[sid] || 0) + miss; }
      return t;
    };
    // 1. lesson quizzes: the latest answer to each question (S.quiz[lessonId#n] = true or false)
    const missedQ = [];
    for (const [qid, ok] of Object.entries(S.quiz || {})) {
      const sid = qid.split('#')[0], s = byId[sid]; if (!s) continue;
      add(topicOf(s), 'quiz', ok ? 0 : 1, 1, sid);
      if (!ok) missedQ.push(qid);
    }
    // 2. flashcards: box 0 after a try = missed last time (S.cards), or a daily card last graded "Missed it" (S.srs repetitions 0)
    const tried = new Set([...Object.keys(S.cards || {}), ...Object.keys(S.srs || {})]), missedC = [];
    for (const id of tried) {
      const ct = cardTopic(id); if (!ct) continue;
      const box = (S.cards || {})[id], sr = (S.srs || {})[id];
      const miss = box === 0 || (box == null && sr && sr.r === 0) ? 1 : 0;
      const t = add(ct.topic, 'cards', miss, 1, ct.sid);
      if (miss) { missedC.push(id); t.decks[ct.deck] = (t.decks[ct.deck] || 0) + 1; }
    }
    // 3. trainers: the latest sessions of each
    const tr = ld('hm-train-v1', {}) || {};
    for (const x of TRAINERS) {
      const list = (Array.isArray(tr[x.kind]) ? tr[x.kind] : []).filter((r) => r && r.n > 0).slice(-TRAIN_LAST); if (!list.length) continue;
      const s = byId[x.lesson], miss = list.reduce((a, r) => a + Math.max(0, +x.miss(r) || 0), 0), n = list.reduce((a, r) => a + +r.n, 0);
      const t = add(s ? topicOf(s) : x.name, 'trainer', miss, n, s ? x.lesson : null);
      if (miss) t.trainers[x.kind] = { name: x.name, miss, n, sessions: list.length };
    }
    // 4. decision trainer, when it reports misses by topic ({ topic, miss, tried, lesson })
    const ds = decideStats();
    if (ds) for (const d of ds.topics) if (d && d.topic && d.tried > 0) add(String(d.topic), 'decide', +d.miss || 0, +d.tried, byId[d.lesson] ? d.lesson : null);

    const topics = Object.values(T).filter((t) => t.miss > 0).map((t) => Object.assign(t, { rate: pct(t.miss, t.tried) }))
      .sort((a, b) => b.miss - a.miss || b.rate - a.rate || a.topic.localeCompare(b.topic));
    const top = topics.slice(0, 5);
    // 3 lessons to reread: the lessons your misses point to, most misses first, from the top topics
    const reread = [];
    for (const t of top) for (const [sid, n] of Object.entries(t.lessons).sort((a, b) => b[1] - a[1])) if (!reread.some((r) => r.id === sid)) reread.push({ id: sid, misses: perLesson[sid] || n, topic: t.topic });
    reread.sort((a, b) => b.misses - a.misses);
    const pinned = reread.length;
    // a series topic with card misses but no single lesson to point at: its least read chapter (labelled)
    if (reread.length < 3) for (const t of top) {
      const ids = seriesIx[norm(t.topic)]; if (!ids || reread.length >= 3) continue;
      const pick = ids.filter((id) => !reread.some((r) => r.id === id)).map((id) => ({ id, seen: seenOf(S, byId[id]) / Math.max(1, stepsN(byId[id])) })).sort((a, b) => a.seen - b.seen)[0];
      if (pick) reread.push({ id: pick.id, misses: 0, topic: t.topic, guess: true });
    }
    const topRank = Object.fromEntries(top.map((t, i) => [t.topic, i]));
    const rankOf = (id) => { const ct = cardTopic(id); return ct && topRank[ct.topic] != null ? topRank[ct.topic] : 9; };
    const have = cards();
    const drillIds = [...new Set([...missedC, ...missedQ.map((q) => 'q:' + q)])].filter((id) => have[id]).sort((a, b) => rankOf(a) - rankOf(b)).slice(0, DRILL_MAX);
    const drillTrainer = top.flatMap((t) => Object.keys(t.trainers))[0] || null;
    return {
      topics: top, allTopics: topics.length, reread: reread.slice(0, 3), pinned,
      drill: { cards: drillIds, missedCards: missedC.length, missedQuiz: missedQ.length, trainer: drillTrainer },
      counted: { quiz: Object.keys(S.quiz || {}).length, cards: tried.size, trainer: TRAINERS.reduce((a, x) => a + Math.min(TRAIN_LAST, (Array.isArray(tr[x.kind]) ? tr[x.kind] : []).length), 0), decide: ds ? ds.total : 0 },
    };
  }

  // ---------- 5 minute drill: put the missed cards first in today's daily cards (S.study.q, the app's own queue) ----------
  // app.js keeps its state in memory and saves all of it on the next change, so after writing the queue the page reloads
  // (from the phone's saved copy, works with no signal) and opens Today's cards with the drill on top.
  function queueDrill(ids) {
    const S = readS(), t = dayISO(), have = cards();
    ids = ids.filter((id) => have[id]); if (!ids.length) return false;
    let st = S.study && S.study.date === t ? S.study : Object.assign({}, S.study, { date: t, base: {}, q: null, cardsDone: 0, again: [] });
    const srs = S.srs || {};
    const due = Object.keys(srs).filter((id) => have[id] && srs[id] && srs[id].d <= t).sort((a, b) => (srs[a].d < srs[b].d ? -1 : 1));
    const rest = (Array.isArray(st.q) ? st.q : due).filter((id) => !ids.includes(id));
    st = Object.assign(st, { q: ids.concat(rest).slice(0, Math.max(ids.length + 10, 50)), drill: { date: t, n: ids.length } });
    if (st.dueCount == null) st.dueCount = due.length;
    S.study = st;
    if (!sv('hm.v1', S)) return false;
    try { history.replaceState({ d: 0 }, '', '#/daily'); } catch (e) { /* ignore */ }
    location.reload();
    return true;
  }

  // ---------- own data ----------
  const own = () => { const o = ld(OWN, {}) || {}; o.ticks = o.ticks || {}; o.cardDays = Array.isArray(o.cardDays) ? o.cardDays : []; return o; };
  function noteCardDay() { // remember each day daily cards were done (S.study only keeps today)
    const S = readS(), st = S.study;
    if (!st || st.date !== dayISO() || !(st.cardsDone > 0)) return;
    const o = own(); if (o.cardDays.includes(st.date)) return;
    o.cardDays = o.cardDays.concat(st.date).sort().slice(-120); sv(OWN, o);
  }
  // card days: this add on's own log, plus each card's last review day (due date minus its interval, S.srs)
  function streak(S) {
    const days = new Set(own().cardDays);
    for (const c of Object.values(S.srs || {})) if (c && c.d && c.i != null) days.add(addDays(c.d, -c.i));
    if (S.study && S.study.date && S.study.cardsDone > 0) days.add(S.study.date);
    const t = dayISO();
    let d = days.has(t) ? t : addDays(t, -1), n = 0;
    while (days.has(d)) { n++; d = addDays(d, -1); }
    return { n, today: days.has(t), any: days.size > 0 };
  }

  // ---------- plans and the study path (same rules as app.js studyPath and regionLessons; read only) ----------
  const plansOf = (S) => (Array.isArray(S.plans) ? S.plans.filter((p) => p && p.id) : []);
  const nextPlan = (S) => { const t = dayISO(); return plansOf(S).filter((p) => p.from && (p.to || p.from) >= t).sort((a, b) => (a.from < b.from ? -1 : 1))[0] || null; };
  const planName = (p) => `${p.where && /^2-/.test(p.where.mu || '') && p.species === 'mule-deer' ? 'Black tailed deer' : p.speciesName || 'Hunt'}${p.where && p.where.mu ? `, MU (Management Unit) ${p.where.mu}` : ''}`;
  let speciesP = null;
  function species() {
    if (speciesP) return speciesP;
    const P = window.HMPlan && window.HMPlan._load ? window.HMPlan._load() : fetch('data/plans/species.json').then((r) => r.json()).then((o) => ({ byId: Object.fromEntries((o.species || []).map((s) => [s.id, s])) }));
    speciesP = Promise.resolve(P).then((d) => (d && d.byId) || {}).catch(() => { speciesP = null; return {}; });
    return speciesP;
  }
  const MUST_RE = /^(rb-|local-harrison|tagging-legal|shot-placement|blood-trailing|field-dressing|meat-care|cwd|first-)/;
  const MUST_ALL = ['mc-skills-10', 'mc-nav-07'];
  function regionLessons(plan, lessons) {
    const r = String((plan.where && plan.where.mu) || '').split('-')[0].toLowerCase();
    const rb = r && byId['rb-region-' + r] ? 'rb-region-' + r : null;
    const out = (lessons || []).filter((id) => !(r && r !== '3' && /^local-heffley/.test(id))).map((id) => (rb && /^rb-region-/.test(id) ? rb : id));
    if (rb && !out.includes(rb)) out.unshift(rb);
    if (/^2-(8|18|19)$/.test(String(plan.where && plan.where.mu)) && /deer/.test(plan.species) && byId['local-harrison-deer']) out.splice(1, 0, 'local-harrison-deer');
    return [...new Set(out)];
  }
  function studyPath(plan, sp) {
    const lessons = regionLessons(plan, sp ? sp.lessons : []);
    const mc = sessions.filter((s) => s.id.startsWith('mc-' + plan.species + '-')).map((s) => s.id).sort();
    const les = lessons.filter((id) => byId[id]);
    const rank = (id) => (/^rb-/.test(id) ? 0 : /^tagging-legal/.test(id) ? 1 : /^first-/.test(id) ? 5 : 2);
    const must = [...new Set([...les.filter((id) => MUST_RE.test(id)).sort((a, b) => rank(a) - rank(b)), ...mc.filter((id) => /-(09|10)$/.test(id)), ...MUST_ALL.filter((id) => byId[id])])];
    const rest = [...new Set([...mc, ...les])].filter((id) => !must.includes(id));
    return { must, all: must.concat(rest) };
  }
  function pathStats(S, ids) {
    let total = 0, seen = 0, next = null;
    for (const id of ids) { const s = byId[id], n = stepsN(s), k = seenOf(S, s); total += n; seen += k; if (!next && k < n) next = { id, i: k, title: s.title }; }
    return { total, seen, next };
  }

  // ---------- offline area check (map/plan-offline.js planPoints + map/offline.js checkArea, no map needed) ----------
  function offlineRec(planId) { const m = ld('hm.map.v1', {}) || {}; return (m.offline || []).find((x) => x && x.planId === planId) || null; }
  async function offlineCheck(plan, pathIds) {
    const rec = offlineRec(plan.id);
    if (!rec) return { ok: false, text: 'Not saved on this phone yet.' };
    if (rec.partial) return { ok: false, text: 'The download stopped part way. Resume it in the plan.' };
    try {
      const base = location.href.split('#')[0];
      const [off, po] = await Promise.all([import(new URL('map/offline.js', base).href), import(new URL('map/plan-offline.js', base).href)]);
      const lf = HM.lessonFiles || {};
      const ids = [...new Set([...pathIds, ...(plan.where && plan.where.id === 'harrison' ? ['local-harrison-deer'] : [])])].filter((id) => lf[id]);
      const reg = String((plan.where && plan.where.mu) || '').split('-')[0];
      const data = [...(reg ? (reg === '7' ? ['region7a', 'region7b'] : ['region' + reg]).map((f) => `data/seasons/${f}.json`) : []), 'data/harvest/bc-harvest.json', ...(HM.plansInline ? [] : HM.planFiles && HM.planFiles.length ? HM.planFiles : ['data/plans/species.json', 'data/plans/species-birds.json', 'data/plans/checklists.json'])];
      const r = await off.checkArea(off.findPlanArea(plan.id) || rec, { points: po.planPoints(plan), files: [{ label: 'Lessons for this hunt', urls: ids.map((id) => lf[id]) }, { label: 'Plan data (seasons, odds, checklists)', urls: data }] });
      const bad = r.rows.filter((x) => !x.ok);
      return { ok: r.ok, full: true, text: r.ok ? `Ready offline: every part checked on this phone just now (saved ${fmtDay(rec.updated || rec.created)}).` : `Not ready offline: ${bad.map((x) => x.label).slice(0, 3).join(', ')}${bad.length > 3 ? ' and more' : ''} missing.` };
    } catch (e) {
      return { ok: true, full: false, text: `Saved ${fmtDay(rec.updated || rec.created)}. The full check could not run here, so this counts the saved record only. Open the plan to check.` };
    }
  }

  // ---------- Hunt ready score ----------
  // Weights (Assumption: the app's own choice, not a standard). Each part says how it was counted.
  const W = { must: 20, licence: 15, sighted: 15, cards: 10, huntweek: 10, offline: 10, trip: 10, turn: 5, decide: 5 };
  async function score(planId) {
    const S = readS(), plan = planId ? plansOf(S).find((p) => p.id === planId) : nextPlan(S);
    if (!plan) return { plan: null, items: [], earned: 0, possible: 0, pct: null, why: planId ? 'That plan is not on this phone.' : 'No saved plan for a hunt coming up.' };
    const items = [], pid = encodeURIComponent(plan.id), mine = own().ticks[plan.id] || {};
    const item = (key, label, part, how, href, link, extra) => { const w = W[key]; items.push(Object.assign({ key, label, weight: w, counted: part != null, points: part == null ? 0 : Math.round(w * Math.max(0, Math.min(1, part)) * 10) / 10, how, href, link }, extra || {})); };
    // 1. must know screens (study path)
    const sp = (await species())[plan.species];
    const P = studyPath(plan, sp), ms = pathStats(S, P.must);
    if (!sp && !P.must.length) item('must', 'Must know screens read', null, 'The plan data is not on this phone yet, so the study path cannot be worked out. Open the plan once with signal.', `#/plan/${pid}`, 'Open the plan');
    else item('must', 'Must know screens read', ms.total ? ms.seen / ms.total : 0, `${ms.seen} of ${ms.total} must know screens read on this plan's study path (${pct(ms.seen, ms.total)}%). Points follow the share read.`, ms.next ? `#/s/${encodeURIComponent(ms.next.id)}/${ms.next.i}` : `#/plan/${pid}`, ms.next ? `Read next: ${ms.next.title}` : 'See the study path');
    // 2. licence and tag (self tick)
    item('licence', 'Licence and tag bought', mine.licence ? 1 : 0, mine.licence ? `You ticked it on ${fmtDay(mine.licence)}.` : 'Not ticked yet. Tick it here once you hold them.', '#/s/licences', 'Lesson: Licences and tags', { tick: 'licence' });
    // 3. sighted in (self tick)
    const gun = plan.method === 'shotgun' ? 'Shotgun patterned' : plan.method === 'bow' ? 'Bow tuned and practised' : 'Rifle sighted in';
    item('sighted', gun, mine.sighted ? 1 : 0, mine.sighted ? `You ticked it on ${fmtDay(mine.sighted)}.` : 'Not ticked yet. Tick it here after your range day.', byId['sighting-in'] ? '#/s/sighting-in' : '#/learn', 'Lesson: Sighting in and patterning', { tick: 'sighted' });
    // 4. daily cards streak
    const sk = streak(S);
    item('cards', 'Daily cards streak', sk.n / STREAK_FULL, sk.any ? `${plural(sk.n, 'day')} in a row${sk.today ? ', today included' : sk.n ? ', today not done yet' : ''}. Full points at ${STREAK_FULL} days. Counted from each card's last review day and the days this page saw cards done, so it can count low.` : `No daily cards done yet. Full points at ${STREAK_FULL} days in a row.`, '#/daily', "Today's cards");
    // 5. hunt week list (addons/huntweek.js, if present)
    const HW = window.HMHuntWeek;
    if (HW && typeof HW._groups === 'function') {
      let n = 0, d = 0; const ticks = ld('hm.huntweek.' + plan.id, {}) || {};
      try { HW._groups(plan).forEach((g) => (g.items || []).forEach((it) => { n++; if (ticks[it.id]) d++; })); } catch (e) { n = 0; }
      item('huntweek', 'Hunt week list ticked', n ? d / n : null, n ? `${d} of ${n} items ticked (${pct(d, n)}%). Points follow the share ticked.` : 'The hunt week list could not be read.', `#/huntweek/${pid}`, 'Open the hunt week list');
    } else item('huntweek', 'Hunt week list ticked', null, 'The hunt week list is not in this version of the app. Not counted.', null, null);
    // 6. offline area
    if (!plan.where || plan.where.lat == null) item('offline', 'Hunt area saved for no signal', 0, 'This plan has no map point, so no area can be saved. Pick a place in the plan.', `#/plan/${pid}`, 'Open the plan');
    else { const oc = await offlineCheck(plan, P.all); item('offline', 'Hunt area saved for no signal', oc.ok ? 1 : 0, oc.text, `#/plan/${pid}`, oc.ok ? 'Open the plan' : 'Save it in the plan'); }
    // 7. trip plan (addons/safety.js)
    const tp = ld('hm.safety.trip', {}) || {}, need = [['who', 'your name'], ['where', 'where'], ['ret', 'planned return'], ['overdue', 'overdue time']], miss = need.filter(([k]) => !String(tp[k] || '').trim());
    const tStart = String(tp.start || '').slice(0, 10), inDates = !tStart || (tStart >= plan.from && tStart <= (plan.to || plan.from));
    item('trip', 'Trip plan saved', miss.length ? 0 : 1, miss.length ? `Missing: ${miss.map((x) => x[1]).join(', ')}.${miss.length < need.length ? ' Saved in part.' : ''}` : `Saved with name, where, return and overdue time.${inDates ? '' : ` Its start day (${fmtDay(tStart)}) is not in this plan's dates: check it.`} Remember to send it.`, '#/safety/trip', 'Open the trip plan');
    // 8. turnaround for a hunt day (addons/safety.js)
    const tu = ld('hm.safety.turn', null), tuDay = tu && tu.date, tuOk = tu && tu.time && tuDay >= plan.from && tuDay <= (plan.to || plan.from);
    item('turn', 'Turnaround time set for a hunt day', tuOk ? 1 : 0, tuOk ? `Set for ${tu.time} on ${fmtDay(tuDay)}.` : tu && tu.time ? `Set for ${fmtDay(tuDay)}, which is not one of this plan's days.` : 'Not set yet. Set it the night before or the morning of.', '#/safety/turn', 'Set the turnaround');
    // 9. decision trainer (addons/decide.js, if present)
    const ds = decideStats();
    item('decide', 'Shoot or don\'t shoot trainer', ds ? ds.right / ds.total : null, ds ? `${ds.right} of ${ds.total} right (${pct(ds.right, ds.total)}%), ${ds.how}. Points follow the share right.` : window.HMRoutes && window.HMRoutes.train && window.HMDecide ? 'Not tried yet. Not counted until you do a round.' : 'The decision trainer is not in this version of the app. Not counted.', ds || window.HMDecide ? '#/train/decide' : null, ds || window.HMDecide ? 'Open the decision trainer' : null);
    if (window.HMDecide && !ds) { const it = items[items.length - 1]; it.counted = true; it.points = 0; } // present but not tried: counts as 0

    const counted = items.filter((x) => x.counted), possible = counted.reduce((a, x) => a + x.weight, 0), earned = Math.round(counted.reduce((a, x) => a + x.points, 0) * 10) / 10;
    return { plan: { id: plan.id, title: planName(plan), from: plan.from, to: plan.to, days: dayDiff(dayISO(), plan.from) }, items, earned, possible, pct: possible ? Math.round((earned / possible) * 100) : null, missing: counted.filter((x) => x.points < x.weight).map((x) => x.label) };
  }

  // ---------- screen ----------
  function css() {
    if (document.getElementById('pg-css')) return;
    const s = document.createElement('style'); s.id = 'pg-css';
    s.textContent = `
.pg h2 { font-size: 20px; }
.pg p, .pg li { font-size: 16px; }
.pg .muted { font-size: 15px; }
.pg-score { display: flex; align-items: baseline; gap: 10px; margin: 4px 0 8px; }
.pg-score b { font-size: 40px; line-height: 1; }
.pg-score span { font-size: 16px; }
.pg-items { list-style: none; margin: 8px 0 0; padding: 0; }
.pg-item { border-top: 1px solid var(--line); padding: 12px 0; }
.pg-item:first-child { border-top: 0; }
.pg-row { display: flex; gap: 10px; align-items: flex-start; }
.pg-row .pg-l { flex: 1; font-weight: 700; font-size: 16px; }
.pg-pts { font-size: 15px; white-space: nowrap; font-weight: 700; }
.pg-ok .pg-pts { color: #1b7f3b; }
.pg-no .pg-pts { color: #b3261e; }
.pg-na .pg-pts { color: var(--muted); font-weight: 400; }
.pg-how { font-size: 15px; color: var(--muted); margin: 4px 0 8px; }
.pg-acts { display: flex; flex-wrap: wrap; gap: 8px; }
.pg-acts .btn { min-height: 44px; flex: 1 1 140px; margin: 0; font-size: 15px; }
.pg-topic { border-top: 1px solid var(--line); padding: 10px 0; }
.pg-topic:first-of-type { border-top: 0; }
.pg-topic .pg-row b { flex: 1; font-size: 16px; }
.pg-topic .bar { margin: 6px 0 4px; }
.pg-topic .bar > i { background: #b3261e; }
.pg-plans { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.pg-plans .btn { min-height: 44px; font-size: 15px; }
.pg a.item { min-height: 44px; }
@media (prefers-color-scheme: dark) { .pg-ok .pg-pts { color: #7fd99a; } .pg-no .pg-pts { color: #ff8a80; } }
:root[data-theme="dark"] .pg-ok .pg-pts { color: #7fd99a; }
:root[data-theme="dark"] .pg-no .pg-pts { color: #ff8a80; }
`;
    document.head.appendChild(s);
  }
  const fmtPts = (x) => String(Math.round(x * 10) / 10);
  function readyHtml(r, S) {
    if (!r.plan) return `<div class="card"><h2>Hunt ready</h2><p>${esc(r.why)}</p><p class="muted">The score is for one saved plan: its dates, place and study path.</p><a class="btn primary block" href="#/plan/new/0">Plan a hunt</a></div>`;
    const t = dayISO(), others = plansOf(S).filter((p) => p.id !== r.plan.id && p.from && (p.to || p.from) >= t).sort((a, b) => (a.from < b.from ? -1 : 1));
    return `<div class="card" id="pg-ready"><h2>Hunt ready</h2>
      <p><b>${esc(r.plan.title)}</b><br><span class="muted">${esc(fmtDay(r.plan.from))}${r.plan.to && r.plan.to !== r.plan.from ? ` to ${esc(fmtDay(r.plan.to))}` : ''}. ${r.plan.days > 0 ? `${plural(r.plan.days, 'day')} to go.` : r.plan.days === 0 ? 'Starts today.' : 'Under way.'}</span></p>
      <div class="pg-score" role="status"><b>${r.pct}%</b><span>${fmtPts(r.earned)} of ${r.possible} points counted</span></div>
      <div class="bar"><i style="width:${r.pct}%"></i></div>
      <p class="muted">${r.missing.length ? `Still to do: ${esc(r.missing.join(', '))}.` : 'Everything counted is done.'}${r.items.some((x) => !x.counted) ? ' Parts marked "Not counted" are left out of the total, not scored as zero.' : ''}</p>
      <ul class="pg-items">${r.items.map((x) => {
        const cls = !x.counted ? 'pg-na' : x.points >= x.weight ? 'pg-ok' : 'pg-no';
        const tick = x.tick ? `<button type="button" class="btn${x.points ? '' : ' primary'}" data-pg-tick="${x.tick}" aria-pressed="${x.points ? 'true' : 'false'}">${x.points ? 'Untick' : 'Tick: done'}</button>` : '';
        return `<li class="pg-item ${cls}" data-pg-item="${x.key}"><div class="pg-row"><span class="pg-l">${x.counted && x.points >= x.weight ? '&#10003; ' : ''}${esc(x.label)}</span><span class="pg-pts">${x.counted ? `${fmtPts(x.points)} of ${x.weight}` : 'Not counted'}</span></div>
          <p class="pg-how">${esc(x.how)}</p>${tick || x.href ? `<div class="pg-acts">${tick}${x.href ? `<a class="btn" href="${esc(x.href)}">${esc(x.link)}</a>` : ''}</div>` : ''}</li>`;
      }).join('')}</ul>
      <p class="muted">Assumption: the points for each part are this app's own weighting, not an official standard. The score helps you find gaps; it does not say the hunt is legal or safe.</p>
      ${others.length ? `<p class="muted">Other plans coming up:</p><div class="pg-plans">${others.slice(0, 4).map((p) => `<a class="btn" href="#/progress/${encodeURIComponent(p.id)}">${esc(planName(p))}, ${esc(fmtDay(p.from))}</a>`).join('')}</div>` : ''}</div>`;
  }
  function weakHtml(w) {
    const c = w.counted, any = c.quiz + c.cards + c.trainer + c.decide;
    const src = `Counted from ${plural(c.quiz, 'quiz answer')}, ${plural(c.cards, 'flashcard')} tried${c.trainer ? `, ${plural(c.trainer, 'trainer session')}` : ''}${c.decide ? `, ${plural(c.decide, 'decision round')}` : ''}.`;
    if (!any) return `<div class="card"><h2>Weak spots</h2><p>Nothing to show yet. Weak spots come from your lesson quizzes, flashcards and the practice trainers.</p>
      <div class="pg-acts"><a class="btn primary" href="#/daily">Today's cards</a><a class="btn" href="#/learn">Lessons</a>${window.HMRoutes && window.HMRoutes.train ? '<a class="btn" href="#/train">Trainers</a>' : ''}</div></div>`;
    if (!w.topics.length) return `<div class="card"><h2>Weak spots</h2><p>No misses right now. ${esc(src)}</p><div class="pg-acts"><a class="btn" href="#/daily">Today's cards</a></div></div>`;
    const parts = (t) => [['quiz', 'quiz'], ['cards', 'cards'], ['trainer', 'trainer'], ['decide', 'decisions']].filter(([k]) => t.parts[k][1]).map(([k, n]) => `${n} ${t.parts[k][0]} of ${t.parts[k][1]}`).join(', ');
    const tr = w.drill.trainer && TRAINERS.find((x) => x.kind === w.drill.trainer);
    return `<div class="card" id="pg-weak"><h2>Weak spots</h2><p class="muted">The topics you miss most, from your latest answers. ${esc(src)}</p>
      ${w.topics.map((t) => `<div class="pg-topic"><div class="pg-row"><b>${esc(t.topic)}</b><span class="pg-pts">${t.rate}% missed</span></div>
        <div class="bar" aria-hidden="true"><i style="width:${t.rate}%"></i></div><div class="muted">${t.miss} missed of ${t.tried} tried: ${esc(parts(t))}.</div></div>`).join('')}
      ${w.allTopics > 5 ? `<p class="muted">Top 5 of ${w.allTopics} topics with a miss.</p>` : ''}
      <h3>Reread these</h3>${w.reread.length ? `<div class="list">${w.reread.map((r) => `<a class="item" href="#/s/${encodeURIComponent(r.id)}/0"><span class="grow">${esc(byId[r.id] ? byId[r.id].title : r.id)}<br><span class="muted">${r.guess ? `Least read chapter in ${esc(r.topic)}. Your misses there are flashcards with no single chapter.` : `${plural(r.misses, 'miss', 'misses')} point here`}</span></span></a>`).join('')}</div>` : '<p class="muted">Your misses do not point to one lesson. Use the drill below.</p>'}
      ${w.reread.length < 3 ? `<p class="muted">Only ${plural(w.reread.length, 'lesson')} can be named from your misses.</p>` : ''}
      <h3>5 minute drill</h3>
      ${w.drill.cards.length ? `<p>${plural(w.drill.cards.length, 'missed card')}, worst topic first, put at the top of today's cards.</p><button type="button" class="btn primary block" id="pg-drill">Start the 5 minute drill</button>
        <p class="muted">Assumption: about 12 seconds a card (the app's own estimate, not measured). The app reloads once to add them.</p>`
        : tr ? `<p>Your misses are in the ${esc(tr.name.toLowerCase())}.</p><a class="btn primary block" href="#/train/${tr.kind}">Open the ${esc(tr.name.toLowerCase())}</a>` : '<p class="muted">No missed cards to drill.</p>'}</div>`;
  }
  let drawN = 0;
  function render(args) {
    const v = document.getElementById('view'); if (!v) return;
    css();
    const h = document.getElementById('top-title'); if (h) h.textContent = 'Progress';
    document.querySelectorAll('.tabs a').forEach((a) => { const on = a.dataset.tab === 'home'; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    noteCardDay();
    const S = readS(), w = weak(), planId = args && args[0] ? decodeURIComponent(args[0]) : null, me = ++drawN, y = window.scrollY;
    v.innerHTML = `<div class="pg"><div id="pg-ready-box"><div class="card"><h2>Hunt ready</h2><p class="muted">Checking...</p></div></div>${weakHtml(w)}</div>`;
    const go = $('#pg-drill', v); if (go) go.onclick = () => { go.disabled = true; if (!queueDrill(w.drill.cards)) { go.disabled = false; location.hash = '#/daily'; } };
    score(planId).then((r) => {
      if (me !== drawN || !v.isConnected || !/^#\/progress/.test(location.hash)) return;
      const box = $('#pg-ready-box', v); if (!box) return;
      box.innerHTML = readyHtml(r, S);
      if (y) window.scrollTo(0, y);
      box.querySelectorAll('[data-pg-tick]').forEach((b) => { b.onclick = () => {
        const o = own(), k = b.dataset.pgTick, t = (o.ticks[r.plan.id] = o.ticks[r.plan.id] || {});
        if (t[k]) delete t[k]; else t[k] = dayISO();
        sv(OWN, o); render(args);
      }; });
    }).catch((e) => { console.warn('progress: score', e); const box = $('#pg-ready-box', v); if (box) box.innerHTML = '<div class="card"><h2>Hunt ready</h2><p>The score could not be worked out. Try again.</p></div>'; });
  }

  noteCardDay();
  window.addEventListener('hashchange', () => { if (/^#\/(daily|progress|$)/.test(location.hash) || !location.hash || location.hash === '#/') noteCardDay(); });
  window.HMRoutes = window.HMRoutes || {};
  window.HMRoutes.progress = render;
  window.HMProgress = { score, weak, queueDrill, _streak: () => streak(readS()), _studyPath: studyPath };
})();
