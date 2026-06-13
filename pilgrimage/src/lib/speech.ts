'use client';

// ─── Narration: the story, read aloud ────────────────────────────────────────
// On-device text-to-speech via the Web Speech API. Free, needs no audio files,
// and works offline once the platform voices are present. Built for an ESL
// reader who can follow spoken words more easily than a page of text.
//
// The content schema keeps an optional `audio` field for future recorded
// narration; until those exist, this synthesizes the same text on the device.

import { useCallback, useEffect, useState } from 'react';
import type { Lang } from '@/lib/storage';

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

/** Pick the most appropriate installed voice for a language. */
function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!voices.length) refreshVoices();
  const tag = lang === 'vi' ? 'vi' : 'en';
  // Prefer an exact language match; fall back to any voice of that language.
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith(tag === 'vi' ? 'vi' : 'en-')) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(tag))
  );
}

/** True when a Vietnamese voice is actually installed on this device. */
export function hasVoiceFor(lang: Lang): boolean {
  if (!voices.length) refreshVoices();
  const tag = lang === 'vi' ? 'vi' : 'en';
  return voices.some((v) => v.lang?.toLowerCase().startsWith(tag));
}

export function stopNarration() {
  const s = synth();
  if (s) s.cancel();
  speakingId = null;
  emit();
}

/** Speak a block of text. `id` lets the UI show which card is currently read. */
export function narrate(id: string, text: string, lang: Lang) {
  const s = synth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? (lang === 'vi' ? 'vi-VN' : 'en-US');
  u.rate = 0.92; // a touch slower: kinder to a second-language listener
  u.pitch = 1;
  u.onend = () => {
    if (speakingId === id) {
      speakingId = null;
      emit();
    }
  };
  u.onerror = () => {
    if (speakingId === id) {
      speakingId = null;
      emit();
    }
  };
  speakingId = id;
  emit();
  s.speak(u);
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
    return () => {
      listeners.delete(fn);
    };
  }, []);
  // Stop narration when the component using it unmounts is the caller's job;
  // we expose a stable stop for convenience.
  const stop = useCallback(() => stopNarration(), []);
  return { speaking, narrate, stop, supported: narrationSupported() };
}
