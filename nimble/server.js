require('dotenv').config();
const express = require('express');
const path = require('path');
const store = require('./lib/store');
const claude = require('./lib/claude');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const VALID_TIME_LIMITS = [10, 15, 20, 30];

// Current app state: settings, counts, difficulty, stats.
app.get('/api/state', (req, res) => {
  const state = store.load();
  res.json({
    timeLimit: state.settings.timeLimit,
    totalDrills: state.drills.length,
    difficulty: store.difficultyFor(state.drills.length),
    stats: store.stats(state),
  });
});

app.post('/api/settings', (req, res) => {
  const { timeLimit } = req.body || {};
  if (!VALID_TIME_LIMITS.includes(timeLimit)) {
    return res.status(400).json({ error: 'timeLimit must be one of ' + VALID_TIME_LIMITS.join(', ') });
  }
  const state = store.load();
  state.settings.timeLimit = timeLimit;
  store.save(state);
  res.json({ ok: true, timeLimit });
});

// Start a drill: rotate to the next domain and generate a scenario.
app.post('/api/drill/start', async (req, res) => {
  try {
    const state = store.load();
    if (!state.settings.timeLimit) {
      return res.status(400).json({ error: 'Pick a time limit first' });
    }
    const domain = store.nextDomain(state);
    const difficulty = store.difficultyFor(state.drills.length);
    const scenario = await claude.generateScenario({ domain, difficulty });
    store.save(state); // persist the rotation advance only once the scenario exists
    res.json({ domain, scenario, difficulty, timeLimit: state.settings.timeLimit });
  } catch (err) {
    console.error('drill/start failed:', err);
    res.status(502).json({ error: apiErrorMessage(err) });
  }
});

// Submit (or auto-submit on timeout): judge the reply and log the drill.
app.post('/api/drill/submit', async (req, res) => {
  try {
    const { domain, scenario, response, timedOut, difficulty } = req.body || {};
    if (!store.DOMAINS.includes(domain) || typeof scenario !== 'string' || !scenario) {
      return res.status(400).json({ error: 'Missing or invalid drill payload' });
    }
    const state = store.load();
    const timeLimit = state.settings.timeLimit;
    const { score, feedback } = await claude.judgeResponse({
      scenario,
      response: String(response ?? ''),
      domain,
      timedOut: Boolean(timedOut),
      timeLimit,
    });
    state.drills.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      domain,
      scenario,
      response: String(response ?? ''),
      score,
      feedback,
      timedOut: Boolean(timedOut),
      timeLimit,
      difficulty: Number(difficulty) || store.difficultyFor(state.drills.length),
      timestamp: new Date().toISOString(),
    });
    store.save(state);
    res.json({
      score,
      feedback,
      totalDrills: state.drills.length,
      difficulty: store.difficultyFor(state.drills.length),
      stats: store.stats(state),
    });
  } catch (err) {
    console.error('drill/submit failed:', err);
    res.status(502).json({ error: apiErrorMessage(err) });
  }
});

app.get('/api/stats', (req, res) => {
  res.json(store.stats(store.load()));
});

function apiErrorMessage(err) {
  if (err?.status === 401 || /authentication method/i.test(err?.message || '')) {
    return 'Invalid or missing ANTHROPIC_API_KEY — copy .env.example to .env and add your key';
  }
  if (err?.status === 429) return 'Rate limited by the Claude API — wait a moment and try again';
  if (err?.status >= 500) return 'Claude API is temporarily unavailable — try again';
  return err?.message || 'Claude API call failed';
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('WARNING: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
}

app.listen(PORT, () => {
  console.log(`Nimble running at http://localhost:${PORT}`);
});
