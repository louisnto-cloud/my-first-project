'use client';

// ─── The guide's voice ────────────────────────────────────────────────────────
// Four things make on-device TTS feel human rather than robotic:
//
//   1. Voice selection: we seek out known female voices by name and URI,
//      and actively penalise every known male voice (−40) so Daniel, Ryan,
//      Guy, etc. can never win. Siri Female URIs and online/Neural voices
//      score highest; local synthesised fallbacks score lowest.
//
//   2. Text humanisation: abbreviations are expanded (St. → Saint), acronyms
//      spelled out (RCIA → R. C. I. A.), ordinals written (1st → first), and
//      em dashes converted to comma-pauses before the engine ever sees the text.
//
//   3. Clause breathing: long sentences are split at comma/semicolon boundaries
//      and each clause gets a short 100 ms pause; full-stop sentences get a
//      380 ms pause. This mimics the rhythm of a real reader.
//
//   4. Unhurried rate (0.87) and natural pitch (1.0 — don't fight the voice).

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
// Ordered from most preferred to least. The scoring function checks name + URI,
// so "siri_female_en-GB_compact" and "Siri Female Voice" both match.

const FEMALE_VOICES = [
  // Apple Siri female — best quality on iOS/macOS if accessible
  'siri_female',        // URI: com.apple.ttsbundle.siri_female_en-GB_compact
  'siri female',        // display name variant: "Siri Voice 2 (English UK, Female)"
  // Generic catch-all: any voice whose name or URI contains the word 'female'
  // This covers Google UK English Female, Siri Female URIs, and any future voices.
  'female',
  // British female — primary fallback after Siri
  'serena',             // Apple Serena (en-GB, Premium) — gold standard on macOS
  'libby',              // Microsoft Libby Online (Natural) — excellent on Edge/Chrome
  'mia',                // Microsoft Mia Online (Natural)
  'hazel',              // Microsoft Hazel (en-GB desktop)
  'martha',             // Apple Martha (en-GB)
  'helena',             // Apple Helena (en-GB)
  'susan',              // Microsoft Susan Online (Natural)
  'grace', 'emma', 'kate', 'emily', 'claire', 'alice',
  // Irish / Australian — warm, gentle accents; preferred over flat American
  'moira',              // Apple Moira (en-IE)
  'karen',              // Apple Karen (en-AU)
  'catherine',          // Apple Catherine (en-AU)
  // American female — solid fallbacks
  'samantha', 'ava', 'allison', 'tessa', 'fiona', 'aria', 'jenny',
  // Vietnamese female
  'hoaimy',             // Microsoft HoaiMy Online (Natural, vi-VN)
  'linh',
];

// Active penalty: these voices must never be chosen as the guide.
// Daniel is the default en-GB voice on Apple AND Microsoft — it would otherwise
// win by default on most devices due to the British-English accent bonus.
const MALE_VOICES = [
  'daniel',             // Apple/Microsoft Daniel (en-GB) — the #1 offender
  'ryan',               // Microsoft Ryan Online (Natural, en-GB)
  'james', 'george', 'rishi', 'liam', 'thomas',
  'siri_male',          // URI: com.apple.ttsbundle.siri_male_en-GB_compact
  'siri male',          // display name variant
  'uk english male',    // Google UK English Male
  'oliver', 'aaron', 'nathan', 'guy', 'fred',
  'namminh',            // Microsoft NamMinh Online (vi-VN, male)
];

// Neural / quality markers — lift any voice above its local synthesised sibling.
const QUALITY = ['natural', 'neural', 'premium', 'enhanced', 'wavenet', 'siri'];

function voiceScore(v: SpeechSynthesisVoice, lang: Lang): number {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;

  if (lang === 'en') {
    const lc = v.lang?.toLowerCase() ?? '';
    // British English is the guide's home accent.
    if (lc.startsWith('en-gb')) s += 40;
    // Irish and Australian are soft and warm — prefer over flat American.
    else if (/^en-(ie|au|nz)/.test(lc)) s += 12;
  }

  // Online/cloud voices use Neural TTS and sound dramatically more human
  // than the local synthesised voices bundled with the OS.
  if (!v.localService) s += 25;

  // Female voices: each name in the list carries a diminishing bonus so
  // voices earlier in the list are preferred over voices later.
  FEMALE_VOICES.forEach((name, i) => {
    if (n.includes(name)) s += FEMALE_VOICES.length - i + 25;
  });

  // Male voices: hard penalty — must never beat even a mediocre female voice.
  MALE_VOICES.forEach((name) => {
    if (n.includes(name)) s -= 40;
  });

  // Quality markers add a bonus on top of everything else.
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

export function hasVoiceFor(lang: Lang): boolean {
  if (!voices.length) refreshVoices();
  const tag = lang === 'vi' ? 'vi' : 'en';
  return voices.some((v) => v.lang?.toLowerCase().startsWith(tag));
}

// ─── Text humanisation ───────────────────────────────────────────────────────
// The TTS engine hears exactly what we give it. Expand abbreviations, spell
// out acronyms, and tidy punctuation so it can speak naturally.

function humanizeText(text: string): string {
  return text
    // ── Catholic / liturgical abbreviations ──────────────────────────────
    .replace(/\bSt\.\s+/g, 'Saint ')
    .replace(/\bSts\.\s+/g, 'Saints ')
    .replace(/\bFr\.\s+/g, 'Father ')
    .replace(/\bSr\.\s+/g, 'Sister ')
    .replace(/\bBr\.\s+/g, 'Brother ')
    .replace(/\bBp\.\s+/g, 'Bishop ')
    .replace(/\bCard\.\s+/g, 'Cardinal ')
    .replace(/\bMsgr\.\s+/g, 'Monsignor ')
    .replace(/\bAbb\.\s+/g, 'Abbot ')
    // ── Acronyms — dot-separated so TTS spells them out clearly ──────────
    .replace(/\bRCIA\b/g, 'R. C. I. A.')
    .replace(/\bOCIA\b/g, 'O. C. I. A.')
    .replace(/\bCCC\b/g, 'C. C. C.')
    // ── Ordinals ─────────────────────────────────────────────────────────
    .replace(/\b1st\b/gi, 'first')
    .replace(/\b2nd\b/gi, 'second')
    .replace(/\b3rd\b/gi, 'third')
    .replace(/\b4th\b/gi, 'fourth')
    .replace(/\b5th\b/gi, 'fifth')
    .replace(/\b6th\b/gi, 'sixth')
    .replace(/\b7th\b/gi, 'seventh')
    .replace(/\b8th\b/gi, 'eighth')
    // ── Common shorthand ─────────────────────────────────────────────────
    .replace(/\be\.g\.\s*/g, 'for example, ')
    .replace(/\bi\.e\.\s*/g, 'that is, ')
    .replace(/\betc\.\b/g, 'et cetera')
    .replace(/\s&\s/g, ' and ')
    .replace(/\bvs\.\s*/g, 'versus ')
    // ── Punctuation → natural pauses ─────────────────────────────────────
    // Em/en dashes become a comma — the guide pauses, then continues.
    .replace(/\s[—–]\s/g, ', ')
    // Ellipsis becomes a comma-pause, not a sentence break.
    .replace(/…/g, ', ')
    .replace(/\.{2,}\s*/g, ', ')
    // ── Remove inline citations that read as noise ────────────────────────
    .replace(/\s*\[\d+\]\s*/g, ' ')
    .replace(/\s*\(\d+\)\s*/g, ' ')
    // ── Tidy whitespace ──────────────────────────────────────────────────
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── Chunk splitting ─────────────────────────────────────────────────────────
// We speak the text in short, naturally-paced pieces. The pause that follows
// each piece reflects how the punctuation would sound in a real reading:
// a comma is a breath; a full stop is a thought completing.

interface Chunk {
  text: string;
  pause: number; // ms to wait before the next chunk begins
}

const SENTENCE_PAUSE = 380; // after . ! ?  — a thought has completed
const CLAUSE_PAUSE   = 110; // after ,  ;  : — a breath between ideas

function intoChunks(raw: string): Chunk[] {
  const text = humanizeText(raw);
  const chunks: Chunk[] = [];

  // First pass: split at every sentence boundary.
  const sentences = text
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    // For longer sentences, also split at clause boundaries so the guide
    // breathes between ideas rather than rushing through a long stretch.
    if (sentence.length > 60) {
      const clauses = sentence
        .split(/(?<=[,;:])\s+/)
        .map((c) => c.trim())
        .filter(Boolean);

      clauses.forEach((clause, i) => {
        const isLast = i === clauses.length - 1;
        chunks.push({ text: clause, pause: isLast ? SENTENCE_PAUSE : CLAUSE_PAUSE });
      });
    } else {
      chunks.push({ text: sentence, pause: SENTENCE_PAUSE });
    }
  }

  // Fallback: text with no sentence-ending punctuation (e.g. a title or label).
  if (!chunks.length && text) {
    chunks.push({ text, pause: SENTENCE_PAUSE });
  }

  return chunks;
}

// ─── Speaking engine ─────────────────────────────────────────────────────────

let queue: Chunk[] = [];
let activeId: string | null = null;
let activeLang: Lang = 'en';
let keepAlive: ReturnType<typeof setInterval> | null = null;

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
  const chunk = queue.shift();
  if (!chunk) {
    clearKeepAlive();
    if (speakingId === activeId) {
      speakingId = null;
      activeId = null;
      emit();
    }
    return;
  }

  const u = new SpeechSynthesisUtterance(chunk.text);
  const voice = pickVoice(activeLang);
  if (voice) u.voice = voice;
  // Hint British English so the engine uses the right pronunciation rules
  // even on platforms where no specific voice could be selected.
  u.lang   = voice?.lang ?? (activeLang === 'vi' ? 'vi-VN' : 'en-GB');
  u.rate   = 0.87;  // unhurried — a soft guide, never rushing
  u.pitch  = 1.0;   // let the voice's natural register carry through
  u.volume = 1.0;

  u.onend = () => {
    if (activeId !== null) {
      // Use the chunk's own pause duration — shorter for clause breaks,
      // longer for sentence ends — so the reading has natural breathing.
      setTimeout(() => {
        if (activeId !== null) speakNext();
      }, chunk.pause);
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
 * When `cue` is true and sound is on, a soft chime announces the guide first.
 */
export function narrate(id: string, text: string, lang: Lang, opts?: { cue?: boolean }) {
  const s = synth();
  if (!s) return;
  s.cancel();
  clearKeepAlive();

  queue = intoChunks(text);
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
