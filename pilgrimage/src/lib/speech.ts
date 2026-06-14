'use client';

// ─── The guide's voice: the story, read aloud ────────────────────────────────
// On-device text-to-speech via the Web Speech API. Free, needs no audio files,
// and works offline once the platform voices are present. Built so the app can
// feel like a companion that reads each page to you — warmly, at a kind pace —
// rather than a wall of text you must read yourself.
//
// Three things make it feel less like a robot and more like a guide:
//   1. We rank the installed voices and pick the warmest, most natural one.
//   2. We speak sentence by sentence, with a breath between, so it has cadence.
//   3. We keep the engine awake (Chrome silently pauses long passages).
//
// The content schema keeps an optional `audio` field for future recorded
// narration; until those exist, this synthesizes the same text on the device.

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

// Substrings that tend to mark the warmer, more natural, less synthetic voices
// across platforms. Higher in the list = stronger preference.
const WARM = [
  'natural', 'neural', 'premium', 'enhanced', 'wavenet', 'siri', 'google',
  // Friendly named voices Apple/Microsoft ship that sound human:
  'samantha', 'ava', 'allison', 'serena', 'karen', 'moira', 'tessa', 'fiona',
  'daniel', 'aaron', 'nathan', 'oliver', 'libby', 'aria', 'jenny', 'guy',
  // Vietnamese named voices:
  'linh', 'an', 'hoaimy', 'namminh',
];

function voiceScore(v: SpeechSynthesisVoice): number {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;
  WARM.forEach((p, i) => {
    if (n.includes(p)) s += WARM.length - i + 8;
  });
  // A default voice the platform chose is usually a safe, clear one.
  if (v.default) s += 3;
  return s;
}

/** Pick the warmest installed voice for a language. */
function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!voices.length) refreshVoices();
  const tag = lang === 'vi' ? 'vi' : 'en';
  const matches = voices.filter((v) => v.lang?.toLowerCase().startsWith(tag));
  if (!matches.length) return undefined;
  return matches.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

/** True when a voice for this language is actually installed on this device. */
export function hasVoiceFor(lang: Lang): boolean {
  if (!voices.length) refreshVoices();
  const tag = lang === 'vi' ? 'vi' : 'en';
  return voices.some((v) => v.lang?.toLowerCase().startsWith(tag));
}

// ─── The speaking queue ──────────────────────────────────────────────────────
// We break a passage into sentences and speak them in turn, so the guide
// breathes between thoughts instead of racing through in one flat utterance.

let queue: string[] = [];
let activeId: string | null = null;
let activeLang: Lang = 'en';
let keepAlive: ReturnType<typeof setInterval> | null = null;

/** Split a passage into gentle, speakable clauses. */
function intoSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    // break after sentence-ending punctuation (Latin and CJK), and after
    // the softer pauses of colons and dashes
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
    // The passage is finished.
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
  u.lang = voice?.lang ?? (activeLang === 'vi' ? 'vi-VN' : 'en-US');
  u.rate = 0.95; // a touch slower: kinder to a second-language listener
  u.pitch = 1.02; // a hair warmer than flat
  u.onend = () => {
    if (activeId !== null) speakNext();
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
 * When `cue` is set and the sound setting is on, a soft chime announces the
 * guide before it begins — like a companion clearing its throat to read.
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

  // Chrome silently pauses synthesis after ~15s; nudging it keeps long
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
