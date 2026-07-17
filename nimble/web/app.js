// Nimble — browser-only build. Everything the local server does (storage,
// domain rotation, difficulty, Claude calls) happens right here; state lives
// in localStorage and Claude is called directly from the browser using the
// CORS opt-in header. The API key never leaves this browser except to
// api.anthropic.com.
(() => {
  const $ = (id) => document.getElementById(id);
  const views = ['key', 'setup', 'ready', 'loading', 'drill', 'judging', 'result', 'stats'];

  const MODEL = 'claude-sonnet-4-6';
  const API_URL = 'https://api.anthropic.com/v1/messages';
  const STORE_KEY = 'nimble-state-v1';
  const DOMAINS = ['business', 'legal', 'personal'];
  const VALID_TIME_LIMITS = [10, 15, 20, 30];

  const DOMAIN_LABELS = {
    business: 'Business & sales negotiation',
    legal: 'Legal / debate argument',
    personal: 'High-stakes personal confrontation',
  };
  const DOMAIN_PROMPT_LABELS = {
    business: 'business & sales negotiation',
    legal: 'legal/debate argument',
    personal: 'high-stakes personal confrontation',
  };

  const SCENARIO_SYSTEM = `You are a scenario generator for "Nimble", a rapid-response communication trainer. You write short, vivid, second-person scenarios that put the trainee under conversational pressure.

Rules:
- Write 3-5 sentences, second person ("you"), present tense.
- Build a concrete, realistic situation in the requested domain with named people and specific stakes.
- The scenario must END at a moment of pressure with a direct question or demand aimed at the trainee — the last sentence is the other party speaking, in quotes, putting them on the spot.
- Difficulty is a level from 1 to 5. At level 1 the counterpart is firm but civil and the subtext is plain. Each level up makes the situation more emotionally loaded, the counterpart harder to read (mixed signals, hidden agendas, veiled threats, feigned warmth), and the stakes higher.
- Vary settings, personalities, and tactics across scenarios. Never reuse a setup.
- Output ONLY the scenario text. No title, no preamble, no explanation.`;

  const JUDGE_SYSTEM = `You are the judge for "Nimble", a rapid-response communication trainer. You are given a pressure scenario and the trainee's reply, typed under a strict time limit.

Score the reply from 1 to 10 for how effective it would be in the moment, considering: composure under pressure, directly addressing the question asked, tactical soundness for the domain (negotiation leverage, argumentative rigor, or emotional intelligence as appropriate), tone control, and concision. An empty or off-topic reply scores 1-2. A reply that buys time gracefully without conceding can score moderately. Do not reward length.

If the reply was auto-submitted on timeout, judge whatever was typed; an unfinished but well-aimed reply can still score decently.

Respond with ONLY a JSON object, no markdown fences, no other text:
{"score": <integer 1-10>, "feedback": "<2-4 sentences: what worked, what failed, and the single strongest alternative move they could have made>"}`;

  // ---------- local storage ----------
  const DEFAULT_STATE = {
    apiKey: null,
    timeLimit: null,
    rotation: [],
    lastDomain: null,
    drills: [],
  };

  function loadState() {
    try {
      return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(STORE_KEY)) };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }
  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  let state = loadState();
  let drill = null; // { domain, scenario, difficulty }
  let timerHandle = null;
  let deadline = 0;
  let submitting = false;

  // ---------- rotation / difficulty / stats (same rules as the server) ----------
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function nextDomain() {
    if (!Array.isArray(state.rotation) || state.rotation.length === 0) {
      const block = shuffle(DOMAINS);
      if (state.lastDomain && block[0] === state.lastDomain) {
        const j = 1 + Math.floor(Math.random() * (block.length - 1));
        [block[0], block[j]] = [block[j], block[0]];
      }
      state.rotation = block;
    }
    const domain = state.rotation.shift();
    state.lastDomain = domain;
    return domain;
  }

  function difficultyFor(count) {
    return Math.min(5, Math.floor(count / 5) + 1);
  }

  function computeStats() {
    const avg = (list) => (list.length ? list.reduce((s, d) => s + d.score, 0) / list.length : null);
    const perDomain = {};
    for (const d of DOMAINS) perDomain[d] = avg(state.drills.filter(x => x.domain === d));
    return {
      totalDrills: state.drills.length,
      overallAverage: avg(state.drills),
      perDomainAverage: perDomain,
      history: state.drills.map(d => ({ score: d.score, domain: d.domain, timestamp: d.timestamp })),
    };
  }

  // ---------- Claude ----------
  function apiHeaders(key) {
    return {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  function friendlyApiError(status, data) {
    if (status === 401) return "Your API key was rejected — open “API key” in the top right and paste it again";
    if (status === 429) return 'Rate limited by the Claude API — wait a moment and try again';
    if (status >= 500) return 'Claude API is temporarily unavailable — try again';
    return data?.error?.message || `Claude API call failed (${status})`;
  }

  async function askClaude(system, userContent, maxTokens) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: apiHeaders(state.apiKey),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        output_config: { effort: 'low' },
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(friendlyApiError(res.status, data));
    const text = (data.content || []).find(b => b.type === 'text')?.text?.trim();
    if (!text) throw new Error('Claude returned no text');
    return text;
  }

  async function generateScenario(domain, difficulty) {
    return askClaude(
      SCENARIO_SYSTEM,
      `Domain: ${DOMAIN_PROMPT_LABELS[domain]}\nDifficulty level: ${difficulty} of 5\n\nGenerate one scenario.`,
      500,
    );
  }

  async function judgeResponse({ scenario, response, domain, timedOut }) {
    const text = await askClaude(
      JUDGE_SYSTEM,
      `Domain: ${DOMAIN_PROMPT_LABELS[domain]}\n` +
      `Time limit: ${state.timeLimit} seconds${timedOut ? ' (TIMED OUT — reply auto-submitted as-is)' : ''}\n\n` +
      `SCENARIO:\n${scenario}\n\n` +
      `TRAINEE'S REPLY:\n${response || '(nothing typed)'}`,
      400,
    );
    const cleaned = text.replace(/```(?:json)?/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Judge returned no JSON');
    const obj = JSON.parse(match[0]);
    const score = Math.max(1, Math.min(10, Math.round(Number(obj.score))));
    if (!Number.isFinite(score)) throw new Error('Judge returned an invalid score');
    return { score, feedback: String(obj.feedback ?? '').trim() };
  }

  // Cheap key check: count_tokens is free and 401s fast on a bad key.
  // Only a 401 means invalid; other failures don't prove anything.
  async function verifyApiKey(key) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
        method: 'POST',
        headers: apiHeaders(key),
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: 'ping' }] }),
      });
      return { valid: res.status !== 401 };
    } catch {
      return { valid: true, unverified: true };
    }
  }

  // ---------- view plumbing ----------
  function show(view) {
    for (const v of views) $('view-' + v).hidden = v !== view;
    const inDrill = view === 'drill';
    const configured = state.apiKey && state.timeLimit;
    $('navStats').hidden = inDrill || view === 'stats' || !configured;
    $('navSettings').hidden = inDrill || view === 'setup' || !configured;
    $('navKey').hidden = inDrill || view === 'key' || !configured;
    $('headerMeta').textContent =
      inDrill && drill ? `${DOMAIN_LABELS[drill.domain]} · level ${drill.difficulty}` : '';
  }

  function showError(msg) {
    const bar = $('errorBar');
    bar.textContent = msg;
    bar.hidden = false;
    clearTimeout(showError._t);
    showError._t = setTimeout(() => { bar.hidden = true; }, 6000);
  }

  function showReady() {
    const n = state.drills.length;
    $('readyMeta').textContent =
      `${state.timeLimit}s per response · level ${difficultyFor(n)} · ${n} drill${n === 1 ? '' : 's'} done`;
    show('ready');
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
      const check = await verifyApiKey(apiKey);
      if (!check.valid) {
        showError("That key didn't work — double-check you copied the whole thing");
        return;
      }
      state.apiKey = apiKey;
      saveState();
      $('keyInput').value = '';
      if (!state.timeLimit) show('setup');
      else showReady();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save key';
    }
  }

  // ---------- time limit ----------
  $('timeChoices').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-limit]');
    if (!btn) return;
    const timeLimit = Number(btn.dataset.limit);
    if (!VALID_TIME_LIMITS.includes(timeLimit)) return;
    state.timeLimit = timeLimit;
    saveState();
    showReady();
  });

  $('navSettings').addEventListener('click', () => {
    for (const b of $('timeChoices').querySelectorAll('button')) {
      b.classList.toggle('selected', Number(b.dataset.limit) === state.timeLimit);
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
    // Pick the domain but only persist the rotation once the scenario exists,
    // so a failed generation retries the same domain.
    const domain = nextDomain();
    const difficulty = difficultyFor(state.drills.length);
    let scenario;
    try {
      scenario = await generateScenario(domain, difficulty);
    } catch (err) {
      state = loadState(); // roll back the in-memory rotation advance
      showError(err.message);
      showReady();
      return;
    }
    saveState();
    drill = { domain, scenario, difficulty };
    $('scenarioText').textContent = scenario;
    $('domainChip').textContent = DOMAIN_LABELS[domain];
    $('levelDots').innerHTML =
      '●'.repeat(difficulty) + `<span class="off">${'●'.repeat(5 - difficulty)}</span>`;
    $('responseBox').value = '';
    submitting = false;
    $('submitBtn').disabled = false;
    show('drill');
    $('responseBox').focus();
    startTimer(state.timeLimit);
  }

  const RING_CIRCUMFERENCE = 282.74; // 2πr for r=45
  let timerTotalMs = 0;

  function startTimer(seconds) {
    timerTotalMs = seconds * 1000;
    deadline = Date.now() + timerTotalMs;
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
      const { score, feedback } = await judgeResponse({
        scenario: drill.scenario,
        response,
        domain: drill.domain,
        timedOut,
      });
      state.drills.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        domain: drill.domain,
        scenario: drill.scenario,
        response,
        score,
        feedback,
        timedOut,
        timeLimit: state.timeLimit,
        difficulty: drill.difficulty,
        timestamp: new Date().toISOString(),
      });
      saveState();
      const scoreEl = $('scoreValue');
      scoreEl.textContent = score;
      scoreEl.className = 'score ' +
        (score <= 3 ? 'band-low' : score <= 6 ? 'band-mid' : 'band-high');
      const replyEl = $('yourReply');
      replyEl.textContent = response.trim() ? `“${response.trim()}”` : 'You said nothing.';
      replyEl.classList.toggle('empty', !response.trim());
      $('feedbackText').textContent = feedback;
      $('timedOutNote').hidden = !timedOut;
      show('result');
    } catch (err) {
      showError(err.message);
      submitting = false;
      $('submitBtn').disabled = false;
      show('drill');
      $('timer').textContent = '0';
    }
  }

  // ---------- stats ----------
  $('navStats').addEventListener('click', openStats);
  $('backBtn').addEventListener('click', showReady);

  function openStats() {
    const s = computeStats();
    $('statTotal').textContent = s.totalDrills;
    $('statAvg').textContent = s.overallAverage == null ? '–' : s.overallAverage.toFixed(1);
    $('statLevel').textContent = difficultyFor(s.totalDrills);

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

  // Single-series SVG line chart with crosshair + tooltip (same as local build).
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
    const y = (score) => pad.t + (1 - (score - 1) / 9) * ih;

    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => {
      const node = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      return node;
    };

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

  // ---------- boot ----------
  if (!state.apiKey) show('key');
  else if (!state.timeLimit) show('setup');
  else showReady();
})();
