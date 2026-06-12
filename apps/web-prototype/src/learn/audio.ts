// Audio for the learning experience: synthesized UI sounds (Web Audio API,
// no files needed) and natural-as-possible speech via the Web Speech API.

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const SOUND_KEY = 'etop-sound';

export function soundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) !== 'off';
}

export function setSoundEnabled(on: boolean): void {
  localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
}

interface Note {
  f: number; // frequency Hz
  t: number; // start offset s
  d: number; // duration s
  type?: OscillatorType;
  v?: number; // volume
}

function play(notes: Note[]): void {
  if (!soundEnabled()) return;
  const c = audioCtx();
  if (!c) return;
  const now = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.value = n.f;
    const vol = n.v ?? 0.16;
    gain.gain.setValueAtTime(0, now + n.t);
    gain.gain.linearRampToValueAtTime(vol, now + n.t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
    osc.connect(gain).connect(c.destination);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.05);
  }
}

export const sfx = {
  // cheerful rising two-note ding
  correct: () => play([{ f: 659.25, t: 0, d: 0.12 }, { f: 880, t: 0.1, d: 0.25 }]),
  // soft descending "wah" — encouraging, not punishing
  wrong: () => play([{ f: 233.08, t: 0, d: 0.18, type: 'triangle', v: 0.12 }, { f: 185, t: 0.16, d: 0.3, type: 'triangle', v: 0.12 }]),
  // subtle tap
  click: () => play([{ f: 540, t: 0, d: 0.05, v: 0.06 }]),
  // little C-major fanfare for finishing a lesson
  complete: () =>
    play([
      { f: 523.25, t: 0, d: 0.16 },
      { f: 659.25, t: 0.13, d: 0.16 },
      { f: 783.99, t: 0.26, d: 0.16 },
      { f: 1046.5, t: 0.39, d: 0.45, v: 0.2 },
      { f: 1318.5, t: 0.39, d: 0.45, v: 0.08 },
    ]),
  // sparkle for stars / points
  star: () => play([{ f: 1318.5, t: 0, d: 0.1, v: 0.1 }, { f: 1567.98, t: 0.08, d: 0.2, v: 0.1 }]),
};

// ---- Speech ----
// Voice quality is device-dependent; we pick the most natural English voice
// available (Neural/Natural/Premium > Google > known high-quality system
// voices) instead of the browser default, which is often the robotic one.

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

function scoreVoice(v: SpeechSynthesisVoice): number {
  if (!/^en([-_]|$)/i.test(v.lang)) return -1;
  let s = 0;
  if (/en[-_]US/i.test(v.lang)) s += 4;
  else if (/en[-_]GB/i.test(v.lang)) s += 3;
  const n = v.name.toLowerCase();
  if (/(natural|neural|premium|enhanced|online)/.test(n)) s += 12;
  if (/google/.test(n)) s += 7;
  // Known good system voices (iOS/macOS/Windows)
  if (/(samantha|ava|allison|zoe|nicky|aria|jenny|guy|libby|sonia|daniel|karen|moira|tessa)/.test(n)) s += 6;
  if (/(compact|espeak|robot)/.test(n)) s -= 8;
  return s;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice && voicesReady) return cachedVoice;
  try {
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    voicesReady = true;
    cachedVoice = voices
      .filter((v) => scoreVoice(v) >= 0)
      .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
    return cachedVoice;
  } catch {
    return null;
  }
}

export function initVoices(): void {
  try {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => {
      voicesReady = false;
      cachedVoice = null;
      pickVoice();
    };
  } catch {
    // no speech support — buttons just do nothing
  }
}

export function speak(text: string, rate = 0.95): void {
  try {
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'en-US';
    }
    // slightly under-speed + a touch of pitch keeps it warm rather than flat
    u.rate = rate;
    u.pitch = 1.02;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    // speech is best-effort
  }
}
