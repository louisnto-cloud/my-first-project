// Sound + speech for the learning experience. Sound effects are synthesized
// with the Web Audio API (no files), and speech picks the most natural English
// voice the device has instead of the robotic default.

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const SOUND_KEY = 'etop-sound';
export const soundOn = () => localStorage.getItem(SOUND_KEY) !== 'off';
export const setSoundOn = (on: boolean) => localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');

interface Note { f: number; t: number; d: number; type?: OscillatorType; v?: number }
function play(notes: Note[]): void {
  if (!soundOn()) return;
  const c = audio();
  if (!c) return;
  const now = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.value = n.f;
    const v = n.v ?? 0.15;
    gain.gain.setValueAtTime(0, now + n.t);
    gain.gain.linearRampToValueAtTime(v, now + n.t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
    osc.connect(gain).connect(c.destination);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.05);
  }
}

export const sfx = {
  correct: () => play([{ f: 659.25, t: 0, d: 0.12 }, { f: 880, t: 0.1, d: 0.22 }]),
  wrong: () => play([{ f: 233, t: 0, d: 0.18, type: 'triangle', v: 0.12 }, { f: 185, t: 0.15, d: 0.28, type: 'triangle', v: 0.12 }]),
  click: () => play([{ f: 520, t: 0, d: 0.05, v: 0.05 }]),
  complete: () =>
    play([
      { f: 523.25, t: 0, d: 0.15 },
      { f: 659.25, t: 0.12, d: 0.15 },
      { f: 783.99, t: 0.24, d: 0.15 },
      { f: 1046.5, t: 0.36, d: 0.4, v: 0.18 },
    ]),
};

// ---- speech ----
let voice: SpeechSynthesisVoice | null = null;
let ready = false;
function scoreVoice(v: SpeechSynthesisVoice): number {
  if (!/^en([-_]|$)/i.test(v.lang)) return -1;
  let s = /en[-_]US/i.test(v.lang) ? 4 : /en[-_]GB/i.test(v.lang) ? 3 : 0;
  const n = v.name.toLowerCase();
  if (/(natural|neural|premium|enhanced|online)/.test(n)) s += 12;
  if (/google/.test(n)) s += 7;
  if (/(samantha|ava|allison|aria|jenny|guy|libby|sonia|daniel|karen|moira|tessa)/.test(n)) s += 6;
  if (/(compact|espeak|robot)/.test(n)) s -= 8;
  return s;
}
function pick(): SpeechSynthesisVoice | null {
  if (voice && ready) return voice;
  try {
    const vs = speechSynthesis.getVoices();
    if (!vs.length) return null;
    ready = true;
    voice = vs.filter((v) => scoreVoice(v) >= 0).sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
    return voice;
  } catch {
    return null;
  }
}
export function initVoices(): void {
  try {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => { ready = false; voice = null; pick(); };
  } catch {
    /* no speech */
  }
}
export function speak(text: string, rate = 0.95): void {
  try {
    const u = new SpeechSynthesisUtterance(text);
    const v = pick();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
    u.rate = rate;
    u.pitch = 1.02;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* best effort */
  }
}
