// JSON-file persistence for settings, domain rotation, and the drill log.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const DOMAINS = ['business', 'legal', 'personal'];

const DEFAULT_STATE = {
  apiKey: null,                  // saved from the in-app setup screen (data/ is gitignored)
  settings: { timeLimit: null, focus: null, dailyGoal: 5 }, // focus: null = rotation; dailyGoal: drills/day target
  rotation: [],                  // remaining domains in the current shuffled block
  lastDomain: null,
  drills: [],                    // { id, domain, scenario, response, score, feedback, timedOut, timeLimit, difficulty, timestamp }
};

function load() {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function save(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = STORE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STORE_PATH);
}

// Atomic read-modify-write: reload the freshest state, apply the mutator, and
// save. Routes that await a slow Claude call must persist through this rather
// than saving a snapshot loaded before the await — otherwise a concurrent
// write (a settings change, another tab's drill) is silently clobbered.
function update(mutator) {
  const state = load();
  mutator(state);
  save(state);
  return state;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffled block rotation: each domain appears once per block of three, and the
// first domain of a new block never repeats the last domain of the previous one.
function nextDomain(state) {
  if (!Array.isArray(state.rotation) || state.rotation.length === 0) {
    let block = shuffle(DOMAINS);
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

// Level 1 for drills 0-4, 2 for 5-9, ... capped at 5.
function difficultyFor(drillCount) {
  return Math.min(5, Math.floor(drillCount / 5) + 1);
}

function stats(state) {
  const drills = state.drills;
  const avg = (list) =>
    list.length ? list.reduce((s, d) => s + d.score, 0) / list.length : null;
  const perDomain = {};
  for (const d of DOMAINS) {
    perDomain[d] = avg(drills.filter(x => x.domain === d));
  }
  return {
    totalDrills: drills.length,
    overallAverage: avg(drills),
    perDomainAverage: perDomain,
    history: drills.map(d => ({ score: d.score, domain: d.domain, timestamp: d.timestamp })),
  };
}

module.exports = { load, save, update, nextDomain, difficultyFor, stats, DOMAINS };
