'use client';

// ─── The guide's voice: the story, read aloud ────────────────────────────────
// On-device text-to-speech via the Web Speech API. Three things make it feel
// less like a robot and more like a warm female companion:
//
//   1. We score voices using a detailed female-voice list AND actively penalise
//      known male voices, so Daniel never wins over Libby or Serena.
//   2. We give online (Neural/Natural) cloud voices a large bonus — they are
//      dramatically warmer than the local synthesised fallbacks.
//   3. We speak sentence-by-sentence with a 200 ms breath between thoughts, so
//      the guide has cadence rather than flat machine speed.

import { useCallback, useEffect, useState } from 'react';
import type { Lang } from '@/lib/storage';
import { playChime } from '@/lib/sound';

type Listener = () => void;
const listeners = new Set<Listener>();
let speakingId: string | null = null;

function emit() {
  listeners.forEach((fn) => fn());
}

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

export function narrationSupported(): boolean {
  return synth() !== null;
}

let voices: SpeechSynthesisVoice[] = [];
function refreshVoices() {
  const s = synth();
  if (s) voices = s.getVoices();
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

// ─── Voice preference ────────────────────────────────────────────────────────
// Female voices, ordered from most preferred to least. The guide should sound
// like a warm, calm woman — soft British accent where available.

const FEMALE_VOICES = [
  // British female — the primary target
  'serena',             // Apple Serena (en-GB, Premium) — gold standard on iOS/macOS
  'libby',              // Microsoft Libby Online (Natural) — best on Edge/Chrome
  'mia',                // Microsoft Mia Online (Natural)
  'hazel',              // Microsoft Hazel (en-GB)
  'martha',             // Apple Martha (en-GB)
  'helena',             // Apple Helena (en-GB)
  'susan',              // Microsoft Susan Online (Natural)
  'grace',              // en-GB Grace (various platforms)
  'emma',               // en-GB Emma (various)
  'kate',               // en-GB Kate (various)
  'emily',              // en-GB Emily (various)
  'uk english female',  // Google UK English Female (Android/Chrome)
  // Irish/Australian — warm, gentle accents; preferred over American male
  'moira',              // Apple Moira (en-IE)
  'karen',              // Apple Karen (en-AU)
  'catherine',          // Apple Catherine (en-AU)
  // American female — solid fallbacks
  'samantha', 'ava', 'allison', 'tessa', 'fiona',
  'aria', 'jenny',
  // Vietnamese female
  'hoaimy',             // Microsoft HoaiMy Online (Natural, vi-VN)
  'linh',               // Various vi-VN Linh voices
];

// Male voices are actively penalised — the guide must not sound like a man.
// Daniel in particular is the default en-GB voice on Apple and Microsoft; it
// would otherwise win purely because of the British-English bonus.
const MALE_VOICES = [
  'daniel',             // Apple/Microsoft Daniel (en-GB) — most commonly mis-selected
  'ryan',               // Microsoft Ryan Online (Natural, en-GB)
  'james', 'george', 'rishi',
  'uk english male',    // Google UK English Male
  'oliver', 'aaron', 'nathan', 'guy',
  'namminh',            // Microsoft NamMinh Online (vi-VN, male)
];

// Quality markers — lift any voice above its robotic local fallbacks.
const QUALITY = ['natural', 'neural', 'premium', 'enhanced', 'wavenet', 'siri'];

function voiceScore(v: SpeechSynthesisVoice, lang: Lang): number {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;

  if (lang === 'en') {
    const lc = v.lang?.toLowerCase() ?? '';
    // British English is the guide's home accent.
    if (lc.startsWith('en-gb')) s += 40;
    // Irish and Australian are also soft, gentle accents — prefer over American.
    else if (/^en-(ie|au|nz)/.test(lc)) s += 10;
  }

  // Online/cloud voices are Neural quality — dramatically better than
  // the local synthesised voices shipped with the OS.
  if (!v.localService) s += 25;

  // Female voices: larger bonus for names earlier in the list.
  FEMALE_VOICES.forEach((name, i) => {
    if (n.includes(name)) s += FEMALE_VOICES.length - i + 25;
  });

  // Male voices: strong penalty so they never beat a weaker female voice.
  MALE_VOICES.forEach((name) => {
    if (n.includes(name)) s -= 40;
  });

  // Quality/naturalness markers.
  QUALITY.forEach((p, i) => {
    if (n.includes(p)) s += QUALITY.length - i + 8;
  });

  if (v.default) s += 2;
  return s;
}

/** Pick the best female voice for a language. */
function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!voices.length) refreshVoices();
  const tag = lang === 'vi' ? 'vi' : 'en';
  const matches = voices.filter((v) => v.lang?.toLowerCase().startsWith(tag));
  if (!matches.length) return undefined;
  return matches.slice().sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0];
}

/** True when a voice for this language is actually installed on this device. */
export function hasVoiceFor(lang: Lang): boolean {
  if (!voices.length) refreshVoices();
  const tag = lang === 'vi' ? 'vi' : 'en';
  return voices.some((v) => v.lang?.toLowerCase().startsWith(tag));
}

// ─── The speaking queue ──────────────────────────────────────────────────────

let queue: string[] = [];
let activeId: string | null = null;
let activeLang: Lang = 'en';
let keepAlive: ReturnType<typeof setInterval> | null = null;

/** Split a passage into gentle, speakable clauses. */
function intoSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…。！？])\s+|(?<=[:;–—])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clearKeepAlive() {
  if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
}

export function stopNarration() {
  const s = synth();
  queue = [];
  activeId = null;
  clearKeepAlive();
  if (s) s.cancel();
  speakingId = null;
  emit();
}

function speakNext() {
  const s = synth();
  if (!s || activeId == null) return;
  const next = queue.shift();
  if (next === undefined) {
    clearKeepAlive();
    if (speakingId === activeId) {
      speakingId = null;
      activeId = null;
      emit();
    }
    return;
  }
  const u = new SpeechSynthesisUtterance(next);
  const voice = pickVoice(activeLang);
  if (voice) u.voice = voice;
  // Hint British English so the engine uses the right pronunciation rules
  // even if no specific voice could be selected.
  u.lang = voice?.lang ?? (activeLang === 'vi' ? 'vi-VN' : 'en-GB');
  u.rate = 0.90;  // unhurried — a soft guide, never in a rush
  u.pitch = 1.0;  // let the voice's own natural register carry through
  u.onend = () => {
    if (activeId !== null) {
      // A 200 ms breath between sentences makes the guide sound human rather
      // than a wall of words delivered at machine speed.
      setTimeout(() => {
        if (activeId !== null) speakNext();
      }, 200);
    }
  };
  u.onerror = () => {
    if (speakingId === activeId) {
      clearKeepAlive();
      speakingId = null;
      activeId = null;
      emit();
    }
  };
  s.speak(u);
}

/**
 * Speak a passage aloud. `id` lets the UI show which card is being read.
 * When `cue` is set and sound is on, a soft chime announces the guide first.
 */
export function narrate(id: string, text: string, lang: Lang, opts?: { cue?: boolean }) {
  const s = synth();
  if (!s) return;
  s.cancel();
  clearKeepAlive();

  queue = intoSentences(text);
  activeId = id;
  activeLang = lang;
  speakingId = id;
  emit();

  if (opts?.cue) playChime();

  // Chrome silently pauses synthesis after ~15 s; nudging it keeps long
  // passages (a whole prayer, a Mass moment) flowing to the end.
  keepAlive = setInterval(() => {
    const sp = synth();
    if (sp && sp.speaking) {
      sp.pause();
      sp.resume();
    }
  }, 9000);

  speakNext();
}

export function currentlySpeaking(): string | null {
  return speakingId;
}

/** React binding: returns the id currently being narrated and controls. */
export function useNarrator() {
  const [speaking, setSpeaking] = useState<string | null>(speakingId);
  useEffect(() => {
    const fn = () => setSpeaking(speakingId);
    listeners.add(fn);
    fn();
    return () => {
      listeners.delete(fn);
    };
  }, []);
  const stop = useCallback(() => stopNarration(), []);
  return { speaking, narrate, stop, supported: narrationSupported() };
}
