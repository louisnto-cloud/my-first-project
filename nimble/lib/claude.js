// Claude API calls: scenario generation and response judging.
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-6';

// The key can come from the environment (.env) or be pasted into the app's
// first-run screen and saved locally; setApiKey swaps it in at runtime.
let apiKey = process.env.ANTHROPIC_API_KEY || null;
let client = null;

function setApiKey(key) {
  apiKey = key || null;
  client = null;
}

function hasApiKey() {
  return Boolean(apiKey);
}

function getClient() {
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

// Cheap validity check: count_tokens is free and fails fast on a bad key.
// Only a 401 means the key is wrong; other errors (network, overload) don't
// prove anything, so callers treat them as "couldn't verify", not "invalid".
async function verifyApiKey(key) {
  const probe = new Anthropic({ apiKey: key });
  try {
    await probe.messages.countTokens({
      model: MODEL,
      messages: [{ role: 'user', content: 'ping' }],
    });
    return { valid: true };
  } catch (err) {
    if (err?.status === 401) return { valid: false };
    return { valid: true, unverified: true };
  }
}

const DOMAIN_LABELS = {
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

async function generateScenario({ domain, difficulty }) {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 500,
    output_config: { effort: 'low' },
    system: SCENARIO_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Domain: ${DOMAIN_LABELS[domain]}\nDifficulty level: ${difficulty} of 5\n\nGenerate one scenario.`,
      },
    ],
  });
  const text = msg.content.find(b => b.type === 'text')?.text?.trim();
  if (!text) throw new Error('Scenario generation returned no text');
  return text;
}

async function judgeResponse({ scenario, response, domain, timedOut, timeLimit }) {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 400,
    output_config: { effort: 'low' },
    system: JUDGE_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `Domain: ${DOMAIN_LABELS[domain]}\n` +
          `Time limit: ${timeLimit} seconds${timedOut ? ' (TIMED OUT — reply auto-submitted as-is)' : ''}\n\n` +
          `SCENARIO:\n${scenario}\n\n` +
          `TRAINEE'S REPLY:\n${response || '(nothing typed)'}`,
      },
    ],
  });
  const text = msg.content.find(b => b.type === 'text')?.text ?? '';
  return parseJudgeJson(text);
}

// The judge is instructed to return bare JSON, but parse defensively:
// strip code fences and extract the first {...} block if needed.
function parseJudgeJson(text) {
  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Judge returned no JSON: ' + text.slice(0, 200));
  const obj = JSON.parse(match[0]);
  const score = Math.max(1, Math.min(10, Math.round(Number(obj.score))));
  if (!Number.isFinite(score)) throw new Error('Judge returned invalid score');
  return { score, feedback: String(obj.feedback ?? '').trim() };
}

module.exports = { generateScenario, judgeResponse, setApiKey, hasApiKey, verifyApiKey };
