// ─── The sound layer ─────────────────────────────────────────────────────────
// Silence is the default state of the app, like a church. When sound is on:
// a soft distant bell for the candle, a low thunk for the passport stamp.
// Everything is synthesized — no audio files, nothing to download.

import { getSave } from '@/lib/storage';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    ctx = ctx ?? new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType = 'sine',
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** A single distant bell, for the candle ritual. */
export function playBell(): void {
  if (!getSave().sound) return;
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  // A bell is a fundamental with slightly inharmonic partials.
  tone(ac, 440, now, 2.4, 0.12);
  tone(ac, 880 * 1.002, now, 1.6, 0.05);
  tone(ac, 1320 * 0.997, now, 0.9, 0.025);
}

/** A soft two-note rise, the guide's voice gently announcing itself. */
export function playChime(): void {
  if (!getSave().sound) return;
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  // A quiet perfect fifth, barely above the silence — an intake of attention,
  // not a notification.
  tone(ac, 587.33, now, 0.55, 0.028, 'sine'); // D5
  tone(ac, 880, now + 0.13, 0.8, 0.022, 'sine'); // A5
}

/**
 * A faint intake of breath — played just before the guide begins a passage
 * and between paragraphs. Synthesised voices never breathe; this tiny sound
 * is a large part of what makes the reading feel like a person.
 * Deliberately not gated on the sound setting: it belongs to the voice,
 * which the user has already turned on.
 */
export function playBreath(): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const dur = 0.32;

  // Filtered noise, shaped like an inhale: swelling, then cut off softly.
  const frames = Math.ceil(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(900, now);
  bp.frequency.linearRampToValueAtTime(1500, now + dur); // rising, like air drawn in
  bp.Q.value = 1.2;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.014, now + dur * 0.65); // barely there
  gain.gain.linearRampToValueAtTime(0, now + dur);

  src.connect(bp).connect(gain).connect(ac.destination);
  src.start(now);
  src.stop(now + dur + 0.02);
}

/** The stamp thunk, for the passport ritual. */
export function playThunk(): void {
  if (!getSave().sound) return;
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  tone(ac, 70, now, 0.22, 0.4, 'sine');
  tone(ac, 130, now, 0.1, 0.18, 'triangle');
}

/** A subtle haptic for the two rituals (candle, stamp), where supported.
 *  Silenced when the user prefers reduced motion. */
export function haptic(pattern: number | number[] = 12): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers gate vibration behind permissions; ignore failures.
  }
}
