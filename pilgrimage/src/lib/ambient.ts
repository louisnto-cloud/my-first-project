'use client';

// ─── Gregorian chant ambient synthesizer ─────────────────────────────────────
// A warm monastic drone + a slowly unfolding melodic line, all synthesized
// on-device with the Web Audio API. No audio files, no download, works offline.
//
// The drone is D2 + D3 + A3 (tonic and fifth) as detuned sine pairs —
// the same chord a medieval organ would hold beneath the schola cantorum.
// The melody moves through D Dorian (Mode I: D E F G A B C D), the most
// ancient and contemplative of the Gregorian modes.
//
// A multi-tap comb filter reverb (RT60 ≈ 650 ms) gives the sound the feeling
// of a stone chapel — not an acoustic concert hall, not a living room.
// A slow 0.07 Hz LFO breathes the whole texture like a sleeping lung.

// ── Pitch table ─────────────────────────────────────────────────────────────
const HZ: Record<string, number> = {
  D2: 73.42,  D3: 146.83, E3: 164.81, F3: 174.61,
  G3: 196.00, A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66,
};

// A two-phrase Gregorian-style melody (Psalm Tone I, adapted):
// phrase 1 – establish the mode; phrase 2 – cadence back to D
const PHRASE: number[] = [
  // Intonation: rise to the reciting tone
  HZ.D3, HZ.F3, HZ.G3, HZ.A3, HZ.A3,
  // Reciting tone and mediant
  HZ.B3, HZ.A3, HZ.G3, HZ.A3, HZ.G3, HZ.F3,
  // Mediant cadence
  HZ.G3, HZ.F3, HZ.E3, HZ.D3, HZ.D3,
  // Second half — rise again
  HZ.F3, HZ.G3, HZ.A3, HZ.B3, HZ.A3,
  // Final cadence
  HZ.G3, HZ.F3, HZ.G3, HZ.F3, HZ.E3, HZ.D3, HZ.D3,
];

// Long notes on the tonic (D) and dominant (A) mirror the reciting-tone feel.
function noteDurationMs(freq: number): number {
  if (freq === HZ.D3 || freq === HZ.D4) return 5400;
  if (freq === HZ.A3) return 4600;
  return 3100;
}

// ── Module state ─────────────────────────────────────────────────────────────
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let reverbIn: GainNode | null = null;
let droneOscs: OscillatorNode[] = [];
let lfoOsc: OscillatorNode | null = null;
let noteOsc: OscillatorNode | null = null;
let noteGain: GainNode | null = null;
let melodyTimer: ReturnType<typeof setTimeout> | null = null;
let phrasePos = 0;
let running = false;
let generation = 0; // guards against deferred cleanup racing a new start

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    ctx = ctx ?? new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// ── Reverb: three parallel comb filters ──────────────────────────────────────
// Each is a delay + feedback loop. Gain 0.42 → RT60 ≈ 650 ms, like a
// small stone chapel. The dry signal passes through at 0.65 so the attack
// stays crisp; the wet tails bloom behind it.
function buildReverb(ac: AudioContext, dest: AudioNode): GainNode {
  const input = ac.createGain();

  const dry = ac.createGain();
  dry.gain.value = 0.65;
  input.connect(dry);
  dry.connect(dest);

  const wet = ac.createGain();
  wet.gain.value = 0.35;
  wet.connect(dest);

  [0.083, 0.117, 0.149].forEach((t) => {
    const tap = ac.createDelay(0.2);
    tap.delayTime.value = t;
    const fb = ac.createGain();
    fb.gain.value = 0.42;
    const mix = ac.createGain();
    mix.gain.value = 0.20;
    input.connect(tap);
    tap.connect(fb);
    fb.connect(tap); // feedback loop — gain < 1, guaranteed stable
    tap.connect(mix);
    mix.connect(wet);
  });

  return input;
}

// ── Drone helpers ─────────────────────────────────────────────────────────────
function spawnDrone(ac: AudioContext, dest: GainNode, freq: number, detune: number, gain: number): OscillatorNode {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const g = ac.createGain();
  g.gain.value = gain;
  osc.connect(g);
  g.connect(dest);
  osc.start();
  return osc;
}

// ── Melody scheduler ──────────────────────────────────────────────────────────
function scheduleNote(gen: number): void {
  if (!running || gen !== generation) return;
  const ac = getCtx();
  if (!ac || !reverbIn) return;

  const freq = PHRASE[phrasePos % PHRASE.length];
  phrasePos++;
  const now = ac.currentTime;

  // Fade out the old note over 1.8 s then disconnect it.
  if (noteOsc && noteGain) {
    const oldOsc = noteOsc;
    const oldGain = noteGain;
    noteOsc = null;
    noteGain = null;
    oldGain.gain.cancelScheduledValues(now);
    oldGain.gain.setValueAtTime(oldGain.gain.value, now);
    oldGain.gain.linearRampToValueAtTime(0, now + 1.8);
    setTimeout(() => {
      try { oldOsc.stop(); oldOsc.disconnect(); oldGain.disconnect(); } catch {}
    }, 2000);
  }

  // Spawn the new note — triangle wave, warmer than sine, less bright than sawtooth.
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.052, now + 1.3);
  osc.connect(gain);
  gain.connect(reverbIn);
  osc.start(now);
  noteOsc = osc;
  noteGain = gain;

  melodyTimer = setTimeout(() => scheduleNote(gen), noteDurationMs(freq));
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Begin the ambient chant. Requires a prior user gesture (browser autoplay). */
export function startAmbient(): void {
  if (running) return;
  const ac = getCtx();
  if (!ac) return;
  running = true;
  const gen = ++generation;

  // Master output chain: reverb+dry → low-pass warmth → master volume
  masterGain = ac.createGain();
  masterGain.gain.setValueAtTime(0, ac.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.2, ac.currentTime + 5); // gentle dawn
  masterGain.connect(ac.destination);

  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  lp.Q.value = 0.5;
  lp.connect(masterGain);

  reverbIn = buildReverb(ac, lp);

  // Drone: D2 pair + D3 pair + A3 (open fifth) — slightly detuned for warmth.
  droneOscs = [
    spawnDrone(ac, reverbIn, HZ.D2, 0,  0.32),
    spawnDrone(ac, reverbIn, HZ.D2, 5,  0.28),
    spawnDrone(ac, reverbIn, HZ.D3, 0,  0.20),
    spawnDrone(ac, reverbIn, HZ.D3, -4, 0.16),
    spawnDrone(ac, reverbIn, HZ.A3, 0,  0.08),
  ];

  // LFO: 0.07 Hz breathing — one slow inhale/exhale every ~14 seconds.
  lfoOsc = ac.createOscillator();
  lfoOsc.frequency.value = 0.07;
  const lfoDepth = ac.createGain();
  lfoDepth.gain.value = 0.014;
  lfoOsc.connect(lfoDepth);
  lfoDepth.connect(masterGain.gain);
  lfoOsc.start();

  // Let the drone establish itself for 2.5 s, then begin the melody.
  setTimeout(() => scheduleNote(gen), 2500);
}

/** Fade the chant out and stop all synthesis. */
export function stopAmbient(): void {
  if (!running) return;
  running = false;
  const gen = ++generation;
  if (melodyTimer) { clearTimeout(melodyTimer); melodyTimer = null; }

  const ac2 = ctx;
  const master = masterGain;
  if (master && ac2) {
    const now = ac2.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 3);
  }

  setTimeout(() => {
    if (gen !== generation) return; // a new startAmbient() fired during fade
    droneOscs.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
    droneOscs = [];
    if (lfoOsc) { try { lfoOsc.stop(); lfoOsc.disconnect(); } catch {} lfoOsc = null; }
    if (noteOsc) { try { noteOsc.stop(); noteOsc.disconnect(); } catch {} noteOsc = null; }
    if (noteGain) { try { noteGain.disconnect(); } catch {} noteGain = null; }
    masterGain = null;
    reverbIn = null;
  }, 3200);
}

/**
 * Duck (quiet) the chant while the guide is speaking, then restore it.
 * Called by Companion when narration starts/ends.
 */
export function duckAmbient(ducked: boolean): void {
  if (!masterGain || !ctx || !running) return;
  const now = ctx.currentTime;
  const target = ducked ? 0.04 : 0.2;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(target, now + 2);
}

export function ambientRunning(): boolean {
  return running;
}
