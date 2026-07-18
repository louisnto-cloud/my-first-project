// Nimble — browser-only build. Everything the local server does (storage,
// domain rotation, difficulty, Claude calls) happens right here; state lives
// in localStorage and Claude is called directly from the browser using the
// CORS opt-in header. The API key never leaves this browser except to
// api.anthropic.com.
(() => {
  const $ = (id) => document.getElementById(id);
  const views = ['key', 'setup', 'ready', 'loading', 'warmup', 'drill', 'judging', 'result', 'stats'];

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
    focus: null,      // null = shuffled rotation, else a single domain
    dailyGoal: 5,     // drills/day target
    rotation: [],
    lastDomain: null,
    drills: [],
  };
  const DOMAIN_SHORT = { business: 'Business', legal: 'Legal', personal: 'Personal' };

  function loadState() {
    try {
      return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(STORE_KEY)) };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }
  // Returns false if the write failed (private mode, quota, disabled storage)
  // so callers can warn instead of throwing an unhandled rejection.
  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      return true;
    } catch {
      showError("Couldn't save to this browser — history won't persist (private mode or storage full?).");
      return false;
    }
  }

  let state = loadState();
  let drill = null; // { domain, scenario, difficulty }
  let timerHandle = null;
  let deadline = 0;
  let submitting = false;
  let pendingSubmit = null; // { response, timedOut, retry } frozen at submit time
  let isRetry = false;      // the current drill is a replay of the same scenario

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
  // Move keyboard focus to each view's primary control so screen-reader and
  // keyboard users land in the right place on every transition.
  const FOCUS_TARGET = { key: 'keyInput', ready: 'startBtn', drill: 'responseBox', result: 'nextBtn' };

  function show(view) {
    for (const v of views) $('view-' + v).hidden = v !== view;
    const inDrill = view === 'drill';
    const configured = state.apiKey && state.timeLimit;
    $('navStats').hidden = inDrill || view === 'stats' || !configured;
    $('navSettings').hidden = inDrill || view === 'setup' || !configured;
    $('navKey').hidden = inDrill || view === 'key' || !configured;
    $('headerMeta').textContent =
      inDrill && drill ? `${DOMAIN_LABELS[drill.domain]} · level ${drill.difficulty}` : '';
    const target = FOCUS_TARGET[view];
    if (target) $(target).focus();
  }

  // Politely announce a status change to assistive tech.
  function announce(msg) { $('srStatus').textContent = msg; }

  function showError(msg) {
    const bar = $('errorBar');
    bar.textContent = msg;
    bar.hidden = false;
    clearTimeout(showError._t);
    showError._t = setTimeout(() => { bar.hidden = true; }, 6000);
  }

  function showReady() {
    const n = state.drills.length;
    const focusLabel = state.focus ? `${DOMAIN_SHORT[state.focus]} only` : 'all three arenas';
    $('readyMeta').textContent =
      `${state.timeLimit}s · ${focusLabel} · level ${difficultyFor(n)} · ${n} drill${n === 1 ? '' : 's'} done`;
    for (const b of $('focusPicker').querySelectorAll('button')) {
      b.classList.toggle('selected', (b.dataset.focus || null) === state.focus);
    }
    renderRecentForm(state.drills);
    renderDailyProgress();
    const streak = winStreak(state.drills);
    const streakLine = $('streakLine');
    streakLine.hidden = streak < 2;
    streakLine.textContent = `🔥 ${streak} strong replies in a row — keep it going`;
    $('domainIntro').hidden = n > 0;
    show('ready');
  }

  const bandFor = (score) => (score <= 3 ? 'band-low' : score <= 6 ? 'band-mid' : 'band-high');

  // Drills done on the local calendar day, and progress toward the daily goal.
  // Rendered on both the ready and stats screens.
  function renderDailyProgress() {
    const goal = state.dailyGoal;
    const today = new Date().toDateString();
    const done = state.drills.filter(d => new Date(d.timestamp).toDateString() === today).length;
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
      const check = await verifyApiKey(apiKey);
      if (!check.valid) {
        showError("That key didn't work — double-check you copied the whole thing");
        return;
      }
      state.apiKey = apiKey;
      saveState();
      $('keyInput').value = '';
      if (check.unverified) {
        showError("Saved, but couldn't reach Anthropic to verify it — if drills fail, re-check the key.");
      }
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

  // ---------- daily goal ----------
  function changeGoal(delta) {
    const next = Math.min(20, Math.max(1, state.dailyGoal + delta));
    if (next === state.dailyGoal) return;
    state.dailyGoal = next;
    saveState();
    $('goalValue').textContent = next;
  }
  $('goalMinus').addEventListener('click', () => changeGoal(-1));
  $('goalPlus').addEventListener('click', () => changeGoal(1));

  // ---------- focus (which domain to drill) ----------
  $('focusPicker').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-focus]');
    if (!btn) return;
    const focus = btn.dataset.focus || null;
    if (focus === state.focus) return;
    state.focus = focus;
    saveState();
    showReady();
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
    announce(`${DOMAIN_LABELS[drill.domain]}. ${drill.scenario} You have ${state.timeLimit} seconds.`);
    $('responseBox').value = '';
    submitting = false;
    $('submitBtn').disabled = false;
    show('drill');
    $('responseBox').focus();
    startTimer(state.timeLimit);
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
    if (!$('helpModal').hidden) return; // don't start drills while the help modal is open
    if (e.key !== 'Enter' || e.target.matches('input, textarea, button')) return;
    if (!$('view-ready').hidden || !$('view-result').hidden) {
      e.preventDefault();
      startDrill();
    }
  });

  // ---------- keyboard-shortcuts help ----------
  let lastFocusBeforeHelp = null;
  function openHelp() {
    if (!$('helpModal').hidden) return;
    lastFocusBeforeHelp = document.activeElement;
    $('helpModal').hidden = false;
    $('helpClose').focus();
  }
  function closeHelp() {
    if ($('helpModal').hidden) return;
    $('helpModal').hidden = true;
    if (lastFocusBeforeHelp && lastFocusBeforeHelp.focus) lastFocusBeforeHelp.focus();
  }
  $('navHelp').addEventListener('click', openHelp);
  $('helpClose').addEventListener('click', closeHelp);
  $('helpModal').addEventListener('click', (e) => { if (e.target === $('helpModal')) closeHelp(); });
  document.addEventListener('keydown', (e) => {
    if (!$('helpModal').hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeHelp(); }
      else if (e.key === 'Tab') { e.preventDefault(); $('helpClose').focus(); } // trap focus on the one control
      return;
    }
    if (e.key === '?' && $('view-warmup').hidden && !e.target.matches('input, textarea')) { e.preventDefault(); openHelp(); }
  }, true);

  async function startDrill() {
    $('loadingText').textContent = LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)];
    show('loading');
    // Focus mode pins a single domain; otherwise advance the shuffled rotation.
    // Only persist the rotation advance once the scenario exists, so a failed
    // generation retries the same domain.
    const usingFocus = DOMAINS.includes(state.focus);
    const domain = usingFocus ? state.focus : nextDomain();
    const difficulty = difficultyFor(state.drills.length);
    let scenario;
    try {
      scenario = await generateScenario(domain, difficulty);
    } catch (err) {
      if (!usingFocus) state = loadState(); // roll back the in-memory rotation advance
      showError(err.message);
      showReady();
      return;
    }
    if (!usingFocus) saveState();
    drill = { domain, scenario, difficulty };
    isRetry = false;
    runWarmup(beginDrillView);
  }

  // ---------- optional final-seconds sound cue (per-device, localStorage) ----------
  const SOUND_KEY = 'nimble-sound';
  const soundEnabled = () => localStorage.getItem(SOUND_KEY) === '1';
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { audioCtx = new AC(); } catch { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function beep(freq) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }
  (() => {
    const t = $('soundToggle');
    t.checked = soundEnabled();
    t.addEventListener('change', () => {
      localStorage.setItem(SOUND_KEY, t.checked ? '1' : '0');
      if (t.checked) { ensureAudio(); beep(660); } // prime + preview on the enabling gesture
    });
  })();

  const RING_CIRCUMFERENCE = 282.74; // 2πr for r=45
  const ANNOUNCE_AT = new Set([10, 5, 3]); // seconds-remaining milestones to speak
  const BEEP_AT = new Set([3, 2, 1]);      // seconds-remaining milestones to beep
  let timerTotalMs = 0;
  let lastAnnouncedSec = null;
  let lastBeepSec = null;

  function startTimer(seconds) {
    timerTotalMs = seconds * 1000;
    deadline = Date.now() + timerTotalMs;
    lastAnnouncedSec = seconds; // suppress the milestone equal to the start, so the scenario announcement isn't clobbered
    lastBeepSec = seconds;
    if (soundEnabled()) ensureAudio(); // resume the context on the (gesture-initiated) drill start
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
    // Beep the final-seconds cue once per second (higher pitch on the last).
    if (soundEnabled() && secs !== lastBeepSec && BEEP_AT.has(secs)) {
      beep(secs === 1 ? 880 : 660);
      lastBeepSec = secs;
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
    const prevBest = state.drills.length ? Math.max(...state.drills.map(d => d.score)) : 0;
    showJudging();
    try {
      const { score, feedback } = await judgeResponse({
        scenario: drill.scenario,
        response: pendingSubmit.response,
        domain: drill.domain,
        timedOut: pendingSubmit.timedOut,
      });
      state.drills.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        domain: drill.domain,
        scenario: drill.scenario,
        response: pendingSubmit.response,
        score,
        feedback,
        timedOut: pendingSubmit.timedOut,
        retry: pendingSubmit.retry,
        timeLimit: state.timeLimit,
        difficulty: drill.difficulty,
        timestamp: new Date().toISOString(),
      });
      saveState();
      const reply = pendingSubmit.response.trim();
      const wasTimedOut = pendingSubmit.timedOut;
      pendingSubmit = null;
      const scoreEl = $('scoreValue');
      scoreEl.textContent = score;
      scoreEl.className = 'score ' + bandFor(score);
      const replyEl = $('yourReply');
      replyEl.textContent = reply ? `“${reply}”` : 'You said nothing.';
      replyEl.classList.toggle('empty', !reply);
      $('feedbackText').textContent = feedback;
      $('timedOutNote').hidden = !wasTimedOut;
      const isBest = score > prevBest && state.drills.length > 1;
      $('bestRibbon').hidden = !isBest;
      const streak = winStreak(state.drills);
      const streakNote = $('streakNote');
      streakNote.hidden = streak < 3;
      streakNote.textContent = `🔥 ${streak} in a row`;
      announce(`Scored ${score} out of 10.${isBest ? ' New personal best.' : ''} ${feedback}`);
      show('result');
    } catch (err) {
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

  function exportCsv() {
    if (!state.drills.length) { showError('Nothing to export yet'); return; }
    const blob = new Blob([toCsv(state.drills)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nimble-drills.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function resetHistory() {
    if (!confirm('Delete all drill history? Your API key and time limit are kept. This cannot be undone.')) return;
    state.drills = [];
    state.rotation = [];
    state.lastDomain = null;
    saveState();
    openStats();
  }

  function openStats() {
    const s = computeStats();
    $('statTotal').textContent = s.totalDrills;
    $('statAvg').textContent = s.overallAverage == null ? '–' : s.overallAverage.toFixed(1);
    $('statBest').textContent = s.history.length ? Math.max(...s.history.map(h => h.score)) : '–';
    $('statLevel').textContent = difficultyFor(s.totalDrills);

    renderDailyProgress();
    renderDomainRows(s);

    renderChart(s.history);
    renderHistory(state.drills);
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

  // ---------- boot ----------
  $('goalValue').textContent = state.dailyGoal;
  if (!state.apiKey) show('key');
  else if (!state.timeLimit) show('setup');
  else showReady();
})();
