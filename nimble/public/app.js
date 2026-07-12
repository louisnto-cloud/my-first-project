// Nimble frontend — plain JS state machine over the views in index.html.
(() => {
  const $ = (id) => document.getElementById(id);
  const views = ['setup', 'ready', 'loading', 'drill', 'judging', 'result', 'stats'];

  const DOMAIN_LABELS = {
    business: 'Business & sales negotiation',
    legal: 'Legal / debate argument',
    personal: 'High-stakes personal confrontation',
  };

  let app = { timeLimit: null, totalDrills: 0, difficulty: 1, stats: null };
  let drill = null; // { domain, scenario, difficulty, timeLimit }
  let timerHandle = null;
  let deadline = 0;
  let submitting = false;

  function show(view) {
    for (const v of views) $('view-' + v).hidden = v !== view;
    $('navStats').hidden = view === 'drill' || view === 'stats' || !app.timeLimit;
    $('navSettings').hidden = view === 'drill' || view === 'setup' || !app.timeLimit;
    updateHeader(view);
  }

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
    if (!app.timeLimit) show('setup');
    else showReady();
  }

  function showReady() {
    $('readyMeta').textContent =
      `${app.timeLimit}s per response · level ${app.difficulty} · ${app.totalDrills} drill${app.totalDrills === 1 ? '' : 's'} done`;
    show('ready');
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

  // ---------- drill flow ----------
  $('startBtn').addEventListener('click', startDrill);
  $('nextBtn').addEventListener('click', startDrill);
  $('submitBtn').addEventListener('click', () => submit(false));
  $('responseBox').addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(false);
  });

  async function startDrill() {
    show('loading');
    try {
      drill = await api('/api/drill/start', {});
    } catch (err) {
      showError(err.message);
      showReady();
      return;
    }
    $('scenarioText').textContent = drill.scenario;
    $('responseBox').value = '';
    submitting = false;
    $('submitBtn').disabled = false;
    show('drill');
    $('responseBox').focus();
    startTimer(drill.timeLimit);
  }

  function startTimer(seconds) {
    deadline = Date.now() + seconds * 1000;
    renderTimer();
    clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      if (renderTimer() <= 0) submit(true);
    }, 100);
  }

  function renderTimer() {
    const remaining = Math.max(0, deadline - Date.now());
    const secs = Math.ceil(remaining / 1000);
    const el = $('timer');
    el.textContent = secs;
    el.classList.toggle('low', secs <= 3);
    return remaining;
  }

  async function submit(timedOut) {
    if (submitting) return;
    submitting = true;
    clearInterval(timerHandle);
    $('submitBtn').disabled = true;
    const response = $('responseBox').value;
    show('judging');
    try {
      const result = await api('/api/drill/submit', {
        domain: drill.domain,
        scenario: drill.scenario,
        difficulty: drill.difficulty,
        response,
        timedOut,
      });
      app.totalDrills = result.totalDrills;
      app.difficulty = result.difficulty;
      app.stats = result.stats;
      $('scoreValue').textContent = result.score;
      $('feedbackText').textContent = result.feedback;
      $('timedOutNote').hidden = !timedOut;
      show('result');
    } catch (err) {
      showError(err.message);
      // Let them retry the submission rather than losing the drill.
      submitting = false;
      $('submitBtn').disabled = false;
      show('drill');
      $('timer').textContent = '0';
    }
  }

  // ---------- stats ----------
  $('navStats').addEventListener('click', openStats);
  $('backBtn').addEventListener('click', showReady);

  async function openStats() {
    try {
      app.stats = await api('/api/stats');
    } catch (err) {
      showError(err.message);
      return;
    }
    const s = app.stats;
    $('statTotal').textContent = s.totalDrills;
    $('statAvg').textContent = s.overallAverage == null ? '–' : s.overallAverage.toFixed(1);
    $('statLevel').textContent = Math.min(5, Math.floor(s.totalDrills / 5) + 1);

    $('domainAvgs').innerHTML = Object.entries(DOMAIN_LABELS).map(([key, label]) => {
      const avg = s.perDomainAverage[key];
      const val = avg == null
        ? '<span class="val empty">no drills yet</span>'
        : `<span class="val">${avg.toFixed(1)}</span>`;
      return `<div class="domain-row"><span>${label}</span>${val}</div>`;
    }).join('');

    renderChart(s.history);
    renderTable(s.history);
    show('stats');
  }

  function renderTable(history) {
    $('drillTable').querySelector('tbody').innerHTML = history.map((h, i) =>
      `<tr><td>${i + 1}</td><td>${DOMAIN_LABELS[h.domain] || h.domain}</td><td>${h.score}</td><td>${new Date(h.timestamp).toLocaleString()}</td></tr>`
    ).join('');
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
    for (const p of pts) {
      svg.append(el('circle', { cx: p.px, cy: p.py, r: n > 40 ? 2 : 3.5, fill: '#6690f2', stroke: '#16181d', 'stroke-width': 2 }));
    }

    // Hover layer: nearest-point crosshair + tooltip
    const crosshair = el('line', { y1: pad.t, y2: H - pad.b, stroke: '#3a3f49', 'stroke-width': 1, visibility: 'hidden' });
    const hoverDot = el('circle', { r: 5.5, fill: '#6690f2', stroke: '#16181d', 'stroke-width': 2, visibility: 'hidden' });
    svg.append(crosshair, hoverDot);

    svg.addEventListener('mousemove', (e) => {
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
    });
    svg.addEventListener('mouseleave', () => {
      crosshair.setAttribute('visibility', 'hidden');
      hoverDot.setAttribute('visibility', 'hidden');
      tooltip.hidden = true;
    });
  }

  boot();
})();
