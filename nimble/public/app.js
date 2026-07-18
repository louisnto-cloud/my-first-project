// Nimble frontend — plain JS state machine over the views in index.html.
(() => {
  const $ = (id) => document.getElementById(id);
  const views = ['key', 'setup', 'ready', 'loading', 'warmup', 'drill', 'judging', 'result', 'stats'];

  const DOMAIN_LABELS = {
    business: 'Business & sales negotiation',
    legal: 'Legal / debate argument',
    personal: 'High-stakes personal confrontation',
  };

  let app = { hasApiKey: false, timeLimit: null, focus: null, dailyGoal: 5, totalDrills: 0, difficulty: 1, stats: null };
  const DOMAIN_SHORT = { business: 'Business', legal: 'Legal', personal: 'Personal' };
  let drill = null; // { domain, scenario, difficulty, timeLimit }
  let timerHandle = null;
  let deadline = 0;
  let submitting = false;
  let pendingSubmit = null; // { response, timedOut, retry } frozen at submit time
  let isRetry = false;      // the current drill is a replay of the same scenario

  const difficultyFor = (n) => Math.min(5, Math.floor(n / 5) + 1);

  // Move keyboard focus to each view's primary control so screen-reader and
  // keyboard users land in the right place on every transition.
  const FOCUS_TARGET = { key: 'keyInput', ready: 'startBtn', drill: 'responseBox', result: 'nextBtn' };

  function show(view) {
    for (const v of views) $('view-' + v).hidden = v !== view;
    const inDrill = view === 'drill';
    const configured = app.hasApiKey && app.timeLimit;
    $('navStats').hidden = inDrill || view === 'stats' || !configured;
    $('navSettings').hidden = inDrill || view === 'setup' || !configured;
    $('navKey').hidden = inDrill || view === 'key' || !configured;
    updateHeader(view);
    const target = FOCUS_TARGET[view];
    if (target) $(target).focus();
  }

  // Politely announce a status change to assistive tech.
  function announce(msg) { $('srStatus').textContent = msg; }

  function updateHeader(view) {
    $('headerMeta').textContent =
      view === 'drill' && drill
        ? `${DOMAIN_LABELS[drill.domain]} · level ${drill.difficulty}`
        : '';
  }

  function showError(msg) {
    const bar = $('errorBar');
    bar.textContent = msg;
    bar.hidden = false;
    clearTimeout(showError._t);
    showError._t = setTimeout(() => { bar.hidden = true; }, 6000);
  }

  async function api(path, opts) {
    const res = await fetch(path, opts && {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  // ---------- boot ----------
  async function boot() {
    try {
      app = await api('/api/state');
    } catch (e) {
      showError('Cannot reach the Nimble server: ' + e.message);
      return;
    }
    $('goalValue').textContent = app.dailyGoal;
    if (!app.hasApiKey) show('key');
    else if (!app.timeLimit) show('setup');
    else showReady();
  }

  // Drills done on the local calendar day, and progress toward the daily goal.
  // Rendered on both the ready and stats screens.
  function renderDailyProgress(history) {
    const goal = app.dailyGoal;
    const today = new Date().toDateString();
    const done = history.filter(h => new Date(h.timestamp).toDateString() === today).length;
    const met = goal > 0 && done >= goal;
    const pct = goal > 0 ? Math.min(100, (done / goal) * 100) : 0;
    const label = met
      ? `<span class="met">🎯 Daily goal reached — ${done} today</span>`
      : `Today: ${done} / ${goal} drills`;
    for (const key of ['Ready', 'Stats']) {
      const wrap = $('dp' + key + 'Wrap');
      if (!wrap) continue;
      wrap.hidden = !goal;
      $('dp' + key + 'Label').innerHTML = label;
      const fill = $('dp' + key + 'Fill');
      fill.style.width = pct + '%';
      fill.classList.toggle('met', met);
    }
  }

  function showReady() {
    const focusLabel = app.focus ? `${DOMAIN_SHORT[app.focus]} only` : 'all three arenas';
    $('readyMeta').textContent =
      `${app.timeLimit}s · ${focusLabel} · level ${app.difficulty} · ${app.totalDrills} drill${app.totalDrills === 1 ? '' : 's'} done`;
    for (const b of $('focusPicker').querySelectorAll('button')) {
      b.classList.toggle('selected', (b.dataset.focus || null) === app.focus);
    }
    const history = app.stats ? app.stats.history : [];
    renderRecentForm(history);
    renderDailyProgress(history);
    const streak = winStreak(history);
    const streakLine = $('streakLine');
    streakLine.hidden = streak < 2;
    streakLine.textContent = `🔥 ${streak} strong replies in a row — keep it going`;
    $('domainIntro').hidden = app.totalDrills > 0;
    show('ready');
  }

  const bandFor = (score) => (score <= 3 ? 'band-low' : score <= 6 ? 'band-mid' : 'band-high');

  // Consecutive drills from the most recent backwards that scored 7+.
  function winStreak(history) {
    let n = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].score >= 7) n++;
      else break;
    }
    return n;
  }

  // Last five scores as colored dots, plus a trend arrow vs the five before.
  function renderRecentForm(history) {
    const el = $('recentForm');
    if (!history || !history.length) { el.innerHTML = ''; return; }
    const last5 = history.slice(-5);
    const dots = last5.map(h =>
      `<span class="form-dot ${bandFor(h.score)}" title="${h.score}/10">${h.score}</span>`
    ).join('');
    let delta = '';
    const prev5 = history.slice(-10, -5);
    if (prev5.length) {
      const avg = (a) => a.reduce((s, x) => s + x.score, 0) / a.length;
      const d = avg(last5) - avg(prev5);
      const arrow = d >= 0.05 ? '▲' : d <= -0.05 ? '▼' : '—';
      delta = `<span class="form-delta">${arrow} ${Math.abs(d).toFixed(1)} vs previous 5</span>`;
    }
    el.innerHTML = `<span class="form-label">Recent</span>${dots}${delta}`;
  }

  // ---------- API key ----------
  $('keySaveBtn').addEventListener('click', saveKey);
  $('keyInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(); });
  $('navKey').addEventListener('click', () => { $('keyInput').value = ''; show('key'); });

  async function saveKey() {
    const apiKey = $('keyInput').value.trim();
    if (!apiKey) { showError('Paste your API key first'); return; }
    const btn = $('keySaveBtn');
    btn.disabled = true;
    btn.textContent = 'Checking…';
    try {
      const res = await api('/api/apikey', { apiKey });
      app.hasApiKey = true;
      $('keyInput').value = '';
      if (res.unverified) {
        showError("Saved, but couldn't reach Anthropic to verify it — if drills fail, re-check the key.");
      }
      if (!app.timeLimit) show('setup');
      else showReady();
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save key';
    }
  }

  // ---------- setup ----------
  $('timeChoices').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-limit]');
    if (!btn) return;
    const timeLimit = Number(btn.dataset.limit);
    try {
      await api('/api/settings', { timeLimit });
      app.timeLimit = timeLimit;
      showReady();
    } catch (err) {
      showError(err.message);
    }
  });

  $('navSettings').addEventListener('click', () => {
    for (const b of $('timeChoices').querySelectorAll('button')) {
      b.classList.toggle('selected', Number(b.dataset.limit) === app.timeLimit);
    }
    show('setup');
  });

  // ---------- daily goal ----------
  async function changeGoal(delta) {
    const next = Math.min(20, Math.max(1, app.dailyGoal + delta));
    if (next === app.dailyGoal) return;
    try {
      await api('/api/goal', { dailyGoal: next });
      app.dailyGoal = next;
      $('goalValue').textContent = next;
    } catch (err) {
      showError(err.message);
    }
  }
  $('goalMinus').addEventListener('click', () => changeGoal(-1));
  $('goalPlus').addEventListener('click', () => changeGoal(1));

  // ---------- focus (which domain to drill) ----------
  $('focusPicker').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-focus]');
    if (!btn) return;
    const focus = btn.dataset.focus || null;
    if (focus === app.focus) return;
    try {
      await api('/api/focus', { focus });
      app.focus = focus;
      showReady();
    } catch (err) {
      showError(err.message);
    }
  });

  // ---------- drill flow ----------
  const LOADING_LINES = [
    'Setting the scene…',
    'Someone is about to put you on the spot…',
    'Raising the stakes…',
    'Finding the pressure point…',
    'The room is going quiet…',
  ];

  $('startBtn').addEventListener('click', startDrill);
  $('nextBtn').addEventListener('click', startDrill);
  $('retryBtn').addEventListener('click', retryDrill);

  // Re-run the same scenario with a fresh clock — for drilling a moment
  // until you find the answer you wish you'd given. Replays are flagged so
  // stats can tell a genuine first attempt from a re-run.
  function retryDrill() {
    if (!drill) return;
    isRetry = true;
    runWarmup(beginDrillView);
  }

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let warmupTimer = null;

  // A skippable 3-2-1 pre-roll so the scenario and clock don't hit cold.
  // Skipped entirely under reduced-motion; click or any key jumps straight in.
  function runWarmup(done) {
    if (reducedMotion()) { done(); return; }
    let n = 3;
    const countEl = $('warmupCount');
    countEl.textContent = n;
    announce('Get ready');
    show('warmup');
    const cleanup = () => {
      clearInterval(warmupTimer); warmupTimer = null;
      document.removeEventListener('keydown', onKey, true);
      $('view-warmup').removeEventListener('click', skip);
    };
    const skip = () => { cleanup(); done(); };
    const onKey = (e) => { e.preventDefault(); e.stopImmediatePropagation(); skip(); };
    document.addEventListener('keydown', onKey, true);
    $('view-warmup').addEventListener('click', skip);
    warmupTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) skip();
      else { countEl.textContent = n; countEl.style.animation = 'none'; void countEl.offsetWidth; countEl.style.animation = ''; }
    }, 700);
  }

  function beginDrillView() {
    $('scenarioText').textContent = drill.scenario;
    $('domainChip').textContent = DOMAIN_LABELS[drill.domain];
    const dots = $('levelDots');
    dots.innerHTML = '●'.repeat(drill.difficulty) + `<span class="off">${'●'.repeat(5 - drill.difficulty)}</span>`;
    dots.setAttribute('aria-label', `Difficulty ${drill.difficulty} of 5`);
    announce(`${DOMAIN_LABELS[drill.domain]}. ${drill.scenario} You have ${drill.timeLimit || app.timeLimit} seconds.`);
    $('responseBox').value = '';
    submitting = false;
    $('submitBtn').disabled = false;
    show('drill');
    $('responseBox').focus();
    startTimer(drill.timeLimit || app.timeLimit);
  }
  $('submitBtn').addEventListener('click', () => submit(false));
  // Re-score a frozen reply after a judge failure (uses the frozen timedOut).
  $('rejudgeBtn').addEventListener('click', () => {
    if (pendingSubmit) submit(pendingSubmit.timedOut);
  });
  $('responseBox').addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(false);
  });
  // Enter anywhere on the ready/result screens starts the next drill,
  // so you can chain drills without touching the mouse.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.matches('input, textarea, button')) return;
    if (!$('view-ready').hidden || !$('view-result').hidden) {
      e.preventDefault();
      startDrill();
    }
  });

  async function startDrill() {
    $('loadingText').textContent = LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)];
    show('loading');
    try {
      drill = await api('/api/drill/start', {});
    } catch (err) {
      showError(err.message);
      showReady();
      return;
    }
    isRetry = false;
    runWarmup(beginDrillView);
  }

  const RING_CIRCUMFERENCE = 282.74; // 2πr for r=45
  const ANNOUNCE_AT = new Set([10, 5, 3]); // seconds-remaining milestones to speak
  let timerTotalMs = 0;
  let lastAnnouncedSec = null;

  function startTimer(seconds) {
    timerTotalMs = seconds * 1000;
    deadline = Date.now() + timerTotalMs;
    lastAnnouncedSec = seconds; // suppress the milestone equal to the start, so the scenario announcement isn't clobbered
    renderTimer();
    clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      if (renderTimer() <= 0) submit(true);
    }, 100);
  }

  function renderTimer() {
    const remaining = Math.max(0, deadline - Date.now());
    const secs = Math.ceil(remaining / 1000);
    const low = secs <= 3;
    const el = $('timer');
    el.textContent = secs;
    el.classList.toggle('low', low);
    el.parentElement.classList.toggle('low', low);
    const frac = timerTotalMs ? remaining / timerTotalMs : 0;
    $('ringFg').style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - frac);
    // Announce key milestones once each, without spamming every tick.
    if (secs !== lastAnnouncedSec && ANNOUNCE_AT.has(secs)) {
      announce(`${secs} seconds left`);
      lastAnnouncedSec = secs;
    }
    return remaining;
  }

  // Submit for scoring. The reply and its timed-out status are frozen into
  // pendingSubmit the first time, so a failed judge call can be retried without
  // re-opening the editor (which would let the user rewrite off the clock and
  // relabel a timed-out answer as untimed).
  async function submit(timedOut) {
    if (submitting) return;
    submitting = true;
    clearInterval(timerHandle);
    $('submitBtn').disabled = true;
    if (!pendingSubmit) {
      pendingSubmit = { response: $('responseBox').value, timedOut, retry: isRetry };
    }
    const prevBest = app.stats && app.stats.history.length
      ? Math.max(...app.stats.history.map(h => h.score)) : 0;
    showJudging();
    try {
      const result = await api('/api/drill/submit', {
        domain: drill.domain,
        scenario: drill.scenario,
        difficulty: drill.difficulty,
        response: pendingSubmit.response,
        timedOut: pendingSubmit.timedOut,
        retry: pendingSubmit.retry,
      });
      app.totalDrills = result.totalDrills;
      app.difficulty = result.difficulty;
      app.stats = result.stats;
      const reply = pendingSubmit.response.trim();
      const wasTimedOut = pendingSubmit.timedOut;
      pendingSubmit = null;
      const scoreEl = $('scoreValue');
      scoreEl.textContent = result.score;
      scoreEl.className = 'score ' + bandFor(result.score);
      const replyEl = $('yourReply');
      replyEl.textContent = reply ? `“${reply}”` : 'You said nothing.';
      replyEl.classList.toggle('empty', !reply);
      $('feedbackText').textContent = result.feedback;
      $('timedOutNote').hidden = !wasTimedOut;
      const isBest = result.score > prevBest && result.totalDrills > 1;
      $('bestRibbon').hidden = !isBest;
      const streak = winStreak(result.stats.history);
      const streakNote = $('streakNote');
      streakNote.hidden = streak < 3;
      streakNote.textContent = `🔥 ${streak} in a row`;
      announce(`Scored ${result.score} out of 10.${isBest ? ' New personal best.' : ''} ${result.feedback}`);
      show('result');
    } catch (err) {
      // Keep pendingSubmit frozen; offer a re-score without re-opening editing.
      showError(err.message);
      submitting = false;
      showJudgingError();
    }
  }

  function showJudging() {
    $('judgingSpinner').hidden = false;
    $('judgingText').textContent = 'Judging…';
    $('rejudgeBtn').hidden = true;
    announce('Judging your reply');
    show('judging');
  }

  function showJudgingError() {
    $('judgingSpinner').hidden = true;
    $('judgingText').textContent = "Couldn't reach the judge. Your reply is saved — try scoring it again.";
    $('rejudgeBtn').hidden = false;
  }

  // ---------- stats ----------
  $('navStats').addEventListener('click', openStats);
  $('backBtn').addEventListener('click', showReady);
  $('exportBtn').addEventListener('click', exportCsv);
  $('resetBtn').addEventListener('click', resetHistory);

  function toCsv(drills) {
    // Quote every field, and neutralize spreadsheet formula injection by
    // prefixing a leading =, +, -, or @ with an apostrophe.
    const esc = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const header = ['timestamp', 'domain', 'difficulty', 'time_limit_s', 'timed_out', 'score', 'response', 'scenario', 'feedback'];
    const rows = drills.map(d =>
      [d.timestamp, d.domain, d.difficulty, d.timeLimit, d.timedOut, d.score, d.response, d.scenario, d.feedback].map(esc).join(','));
    return header.join(',') + '\n' + rows.join('\n');
  }

  async function exportCsv() {
    try {
      const { drills } = await api('/api/drills');
      if (!drills.length) { showError('Nothing to export yet'); return; }
      const blob = new Blob([toCsv(drills)], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nimble-drills.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      showError(err.message);
    }
  }

  async function resetHistory() {
    if (!confirm('Delete all drill history? Your API key and time limit are kept. This cannot be undone.')) return;
    try {
      await api('/api/reset', {});
      app.totalDrills = 0;
      app.difficulty = 1;
      app.stats = null;
      openStats();
    } catch (err) {
      showError(err.message);
    }
  }

  async function openStats() {
    let drills;
    try {
      app.stats = await api('/api/stats');
      drills = (await api('/api/drills')).drills;
    } catch (err) {
      showError(err.message);
      return;
    }
    const s = app.stats;
    $('statTotal').textContent = s.totalDrills;
    $('statAvg').textContent = s.overallAverage == null ? '–' : s.overallAverage.toFixed(1);
    $('statBest').textContent = s.history.length ? Math.max(...s.history.map(h => h.score)) : '–';
    $('statLevel').textContent = difficultyFor(s.totalDrills);

    renderDailyProgress(s.history);
    renderDomainRows(s);

    renderChart(s.history);
    renderHistory(drills);
    show('stats');
  }

  // Per-domain rows with a magnitude bar and drill count, plus a
  // strongest/weakest callout once at least two domains have real data.
  function renderDomainRows(s) {
    $('domainAvgs').innerHTML = Object.entries(DOMAIN_LABELS).map(([key, label]) => {
      const avg = s.perDomainAverage[key];
      const cnt = s.history.filter(h => h.domain === key).length;
      const pct = avg == null ? 0 : ((avg - 1) / 9) * 100;
      const val = avg == null
        ? '<span class="val empty">no drills yet</span>'
        : `<span class="val">${avg.toFixed(1)}</span>`;
      return `<div class="domain-row">
        <div class="domain-row-top"><span>${label}<span class="domain-count">${cnt} drill${cnt === 1 ? '' : 's'}</span></span>${val}</div>
        <div class="domain-bar"><div class="domain-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');

    const seasoned = Object.entries(s.perDomainAverage)
      .filter(([k, v]) => v != null && s.history.filter(h => h.domain === k).length >= 3)
      .sort((a, b) => a[1] - b[1]);
    const callout = $('focusCallout');
    if (seasoned.length >= 2 && seasoned[seasoned.length - 1][1] - seasoned[0][1] >= 0.8) {
      const [weakK, weakV] = seasoned[0];
      const [strongK, strongV] = seasoned[seasoned.length - 1];
      callout.innerHTML =
        `Strongest arena: <strong>${DOMAIN_LABELS[strongK]}</strong> (${strongV.toFixed(1)}). ` +
        `Focus next: <strong>${DOMAIN_LABELS[weakK]}</strong> (${weakV.toFixed(1)}) — that's where the easy points are.`;
      callout.hidden = false;
    } else {
      callout.hidden = true;
    }
  }

  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Collapsible per-drill cards, newest first: scenario, your reply, feedback.
  function renderHistory(drills) {
    const el = $('historyList');
    if (!drills.length) {
      el.innerHTML = '<p class="history-empty">No drills yet — your past scenarios and feedback will appear here.</p>';
      return;
    }
    el.innerHTML = drills.slice(-50).reverse().map((d) => `
      <details class="history-item">
        <summary>
          <span class="form-dot ${bandFor(d.score)}">${d.score}</span>
          <span class="hist-domain">${DOMAIN_LABELS[d.domain] || d.domain}</span>
          <span class="hist-when">${new Date(d.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          ${d.timedOut ? '<span class="hist-flag">timed out</span>' : ''}
          ${d.retry ? '<span class="hist-flag retry">retry</span>' : ''}
        </summary>
        <div class="hist-body">
          <p class="hist-label">Scenario</p>
          <p>${escapeHtml(d.scenario)}</p>
          <p class="hist-label">Your reply</p>
          <blockquote>${d.response.trim() ? escapeHtml(d.response) : '(nothing typed)'}</blockquote>
          <p class="hist-label">Feedback</p>
          <p>${escapeHtml(d.feedback)}</p>
        </div>
      </details>`).join('');
  }

  // Single-series SVG line chart: score (1-10, fixed scale) per drill,
  // with crosshair + tooltip on hover. No legend needed for one series.
  function renderChart(history) {
    const svg = $('chart');
    const tooltip = $('chartTooltip');
    tooltip.hidden = true;
    const W = svg.clientWidth || 600;
    const H = 220;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';

    if (!history.length) {
      svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" fill="#6b7280" text-anchor="middle" font-size="13">No drills yet</text>`;
      return;
    }

    const pad = { l: 30, r: 14, t: 12, b: 22 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const n = history.length;
    const x = (i) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (score) => pad.t + (1 - (score - 1) / 9) * ih; // fixed 1..10 scale

    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => {
      const node = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      return node;
    };

    // Recessive gridlines + y labels at 1, 5, 10
    for (const tick of [1, 5, 10]) {
      svg.append(el('line', { x1: pad.l, x2: W - pad.r, y1: y(tick), y2: y(tick), stroke: '#2a2e36', 'stroke-width': 1 }));
      const label = el('text', { x: pad.l - 8, y: y(tick) + 4, fill: '#6b7280', 'font-size': 11, 'text-anchor': 'end' });
      label.textContent = tick;
      svg.append(label);
    }

    const pts = history.map((h, i) => ({ px: x(i), py: y(h.score), ...h, index: i }));
    if (n > 1) {
      svg.append(el('polyline', {
        points: pts.map(p => `${p.px},${p.py}`).join(' '),
        fill: 'none', stroke: '#6690f2', 'stroke-width': 2,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      }));
    }
    // 5-drill rolling average once there's enough history to smooth
    $('chartLegend').hidden = n < 5;
    if (n >= 5) {
      const roll = history.map((_, i) => {
        const win = history.slice(Math.max(0, i - 4), i + 1);
        return win.reduce((s, h) => s + h.score, 0) / win.length;
      });
      svg.append(el('polyline', {
        points: roll.map((v, i) => `${x(i)},${y(v)}`).join(' '),
        fill: 'none', stroke: '#9aa1ac', 'stroke-width': 2,
        'stroke-dasharray': '5 5', 'stroke-linejoin': 'round',
      }));
    }
    for (const p of pts) {
      svg.append(el('circle', { cx: p.px, cy: p.py, r: n > 40 ? 2 : 3.5, fill: '#6690f2', stroke: '#16181d', 'stroke-width': 2 }));
    }

    // Hover layer: nearest-point crosshair + tooltip
    const crosshair = el('line', { y1: pad.t, y2: H - pad.b, stroke: '#3a3f49', 'stroke-width': 1, visibility: 'hidden' });
    const hoverDot = el('circle', { r: 5.5, fill: '#6690f2', stroke: '#16181d', 'stroke-width': 2, visibility: 'hidden' });
    svg.append(crosshair, hoverDot);

    // Assign (not addEventListener) so re-rendering the chart replaces the
    // handlers instead of stacking a new pair on the persistent <svg> each visit.
    svg.onmousemove = (e) => {
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      let nearest = pts[0];
      for (const p of pts) if (Math.abs(p.px - mx) < Math.abs(nearest.px - mx)) nearest = p;
      crosshair.setAttribute('x1', nearest.px);
      crosshair.setAttribute('x2', nearest.px);
      crosshair.setAttribute('visibility', 'visible');
      hoverDot.setAttribute('cx', nearest.px);
      hoverDot.setAttribute('cy', nearest.py);
      hoverDot.setAttribute('visibility', 'visible');
      tooltip.innerHTML =
        `<strong>${nearest.score}/10</strong> · drill ${nearest.index + 1}<br>` +
        `<span class="tt-sub">${DOMAIN_LABELS[nearest.domain] || nearest.domain}</span>`;
      tooltip.style.left = (nearest.px / W * 100) + '%';
      tooltip.style.top = (nearest.py / H * 100) + '%';
      tooltip.hidden = false;
    };
    svg.onmouseleave = () => {
      crosshair.setAttribute('visibility', 'hidden');
      hoverDot.setAttribute('visibility', 'hidden');
      tooltip.hidden = true;
    };
  }

  boot();
})();
