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

// If there's no key in the environment, fall back to one saved from the app.
if (!process.env.ANTHROPIC_API_KEY) {
  const saved = store.load().apiKey;
  if (saved) claude.setApiKey(saved);
}

// Current app state: settings, counts, difficulty, stats.
app.get('/api/state', (req, res) => {
  const state = store.load();
  res.json({
    hasApiKey: claude.hasApiKey(),
    timeLimit: state.settings.timeLimit,
    totalDrills: state.drills.length,
    difficulty: store.difficultyFor(state.drills.length),
    stats: store.stats(state),
  });
});

// Save the API key pasted into the app's setup screen. Stored locally in
// data/store.json (gitignored) — it never leaves this machine except to
// call the Claude API.
app.post('/api/apikey', async (req, res) => {
  const apiKey = String(req.body?.apiKey || '').trim();
  if (!apiKey) {
    return res.status(400).json({ error: 'Paste your API key first' });
  }
  try {
    const check = await claude.verifyApiKey(apiKey);
    if (!check.valid) {
      return res.status(401).json({ error: "That key didn't work — double-check you copied the whole thing" });
    }
    const state = store.load();
    state.apiKey = apiKey;
    store.save(state);
    claude.setApiKey(apiKey);
    res.json({ ok: true, unverified: Boolean(check.unverified) });
  } catch (err) {
    console.error('apikey save failed:', err);
    res.status(500).json({ error: 'Could not save the key: ' + (err?.message || 'unknown error') });
  }
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
    if (!claude.hasApiKey()) {
      return res.status(400).json({ error: 'Add your API key first' });
    }
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

// Full drill log (newest last) for the history browser.
app.get('/api/drills', (req, res) => {
  res.json({ drills: store.load().drills });
});

// Wipe the drill log (keeps API key and time limit).
app.post('/api/reset', (req, res) => {
  const state = store.load();
  state.drills = [];
  state.rotation = [];
  state.lastDomain = null;
  store.save(state);
  res.json({ ok: true });
});

function apiErrorMessage(err) {
  if (err?.status === 401 || /authentication method/i.test(err?.message || '')) {
    return 'Your API key was rejected — open "API key" in the top right and paste it again';
  }
  if (err?.status === 429) return 'Rate limited by the Claude API — wait a moment and try again';
  if (err?.status >= 500) return 'Claude API is temporarily unavailable — try again';
  return err?.message || 'Claude API call failed';
}

app.listen(PORT, () => {
  console.log(`Nimble running at http://localhost:${PORT}`);
  if (!claude.hasApiKey()) {
    console.log('No API key yet — the app will ask for it in the browser.');
  }
});
