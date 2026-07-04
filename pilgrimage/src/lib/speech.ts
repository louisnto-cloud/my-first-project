'use client';

// ─── The guide's voice ────────────────────────────────────────────────────────
// What makes on-device TTS feel human rather than robotic here:
//
//   1. Voice selection: known female voices win by name and URI (Siri Female
//      first), every known male voice takes a −40 penalty, online/Neural
//      voices beat local synthesised ones, and the choice is cached — but
//      never from a voice list that hasn't loaded yet.
//
//   2. Text humanisation (language-aware): abbreviations expand (St. → Saint),
//      scripture reads as spoken ("Jn 3:16" → "John chapter 3 verse 16";
//      "chương 3, câu 16" in Vietnamese), regnal numerals become words
//      (Benedict XVI → the Sixteenth), Church Latin is respelled phonetically,
//      CCC citations read "Catechism, paragraph …", ordinals/eras/ranges are
//      written out, and bullets, citations, and dashes become natural pauses.
//
//   3. Breathing: sentences split at clause boundaries (110 ms breath),
//      complete at full stops (380 ms), rest at paragraphs and after "Amen."
//      (620 ms) — with ±15% jitter so the silences never tick.
//
//   4. Prosody contour: settle in on the first chunk, hold a steady middle,
//      slow into the last; questions lift, quotations shift, "Amen" lands
//      slowly and low. Base rate 0.87 (en) / 0.92 (vi), natural pitch.
//
//   5. Engine care: chant ducks fast and restores slow around the voice, the
//      chime finishes before the first words, Chrome's 15 s stall is nudged
//      (Chromium only), and speaking waits for the async voice list.

import { useCallback, useEffect, useState } from 'react';
import type { Lang } from '@/lib/storage';
import { playBreath, playChime } from '@/lib/sound';

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
const voiceCache = new Map<Lang, SpeechSynthesisVoice | undefined>();
function refreshVoices() {
  const s = synth();
  if (s) {
    voices = s.getVoices();
    voiceCache.clear(); // new voice list → rescore on next pick
  }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    refreshVoices();
    emit(); // voices can arrive after first render — let the UI re-check
  });
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

/** Pick the best female voice for a language. Scored once, then cached. */
function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!voices.length) refreshVoices();
  // The voice list loads asynchronously on Chrome — never cache a miss taken
  // before any voices exist, or we'd be stuck on the default (male) voice.
  if (!voices.length) return undefined;
  if (voiceCache.has(lang)) return voiceCache.get(lang);
  const tag = lang === 'vi' ? 'vi' : 'en';
  const matches = voices.filter((v) => v.lang?.toLowerCase().startsWith(tag));
  const best = matches.length
    ? matches.slice().sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0]
    : undefined;
  voiceCache.set(lang, best);
  return best;
}

/** Run `cb` once the voice list is available (or after a short grace period —
 *  speaking with only a lang hint still beats not speaking at all). */
function whenVoicesReady(cb: () => void) {
  if (!voices.length) refreshVoices();
  if (voices.length) return cb();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    refreshVoices();
    cb();
  };
  window.speechSynthesis.addEventListener?.('voiceschanged', finish, { once: true });
  setTimeout(finish, 1200);
}

export function hasVoiceFor(lang: Lang): boolean {
  if (!voices.length) refreshVoices();
  const tag = lang === 'vi' ? 'vi' : 'en';
  return voices.some((v) => v.lang?.toLowerCase().startsWith(tag));
}

// ─── Text humanisation ───────────────────────────────────────────────────────
// The TTS engine hears exactly what we give it. Expand abbreviations, spell
// out acronyms, and tidy punctuation so it can speak naturally.

const ORDINAL_WORDS = [
  '', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh',
  'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth',
  'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth',
  'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third',
  'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh',
  'twenty-eighth', 'twenty-ninth', 'thirtieth', 'thirty-first',
];

// Church Latin, respelled the way an English voice must see it to say it
// right — an en-GB engine reads "Agnus Dei" as if it were English otherwise.
const LATIN_RESPELL: [RegExp, string][] = [
  [/\bKyrie,?\s+eleison\b/gi, 'Kirie-ay, eh-lay-ee-son'],
  [/\bChriste,?\s+eleison\b/gi, 'Kris-tay, eh-lay-ee-son'],
  [/\bAgnus Dei\b/gi, 'Ahn-yoos Day-ee'],
  [/\bGloria in excelsis Deo\b/gi, 'Gloria in ex-chel-sees Day-oh'],
  [/\bSalve Regina\b/gi, 'Sal-vay Regina'],
  [/\bAve Maria\b/gi, 'Ah-vay Maria'],
  [/\bPater noster\b/gi, 'Pah-tair noster'],
  [/\bDeo gratias\b/gi, 'Day-oh grah-tsee-as'],
];

// Scripture abbreviations, expanded only when a chapter/verse number follows
// ("Jn 3:16" → "John 3:16") so ordinary words are never touched.
const SCRIPTURE_BOOKS: Record<string, string> = {
  Gen: 'Genesis', Ex: 'Exodus', Lev: 'Leviticus', Num: 'Numbers',
  Deut: 'Deuteronomy', Josh: 'Joshua', Sam: 'Samuel', Kgs: 'Kings',
  Chr: 'Chronicles', Macc: 'Maccabees', Ps: 'Psalm', Prov: 'Proverbs',
  Eccl: 'Ecclesiastes', Wis: 'Wisdom', Sir: 'Sirach', Is: 'Isaiah',
  Isa: 'Isaiah', Jer: 'Jeremiah', Ezek: 'Ezekiel', Dan: 'Daniel',
  Hos: 'Hosea', Mic: 'Micah', Zech: 'Zechariah', Mal: 'Malachi',
  Mt: 'Matthew', Mk: 'Mark', Lk: 'Luke', Jn: 'John', Rom: 'Romans',
  Cor: 'Corinthians', Gal: 'Galatians', Eph: 'Ephesians',
  Phil: 'Philippians', Col: 'Colossians', Thess: 'Thessalonians',
  Tim: 'Timothy', Pet: 'Peter', Jas: 'James', Heb: 'Hebrews',
  Rev: 'Revelation',
};

// Regnal numerals: "Benedict XVI" must read "Benedict the Sixteenth",
// never "Benedict ex vee eye".
const ROMAN_REGNAL: Record<string, string> = {
  I: 'the First', II: 'the Second', III: 'the Third', IV: 'the Fourth',
  V: 'the Fifth', VI: 'the Sixth', VII: 'the Seventh', VIII: 'the Eighth',
  IX: 'the Ninth', X: 'the Tenth', XI: 'the Eleventh', XII: 'the Twelfth',
  XIII: 'the Thirteenth', XIV: 'the Fourteenth', XV: 'the Fifteenth',
  XVI: 'the Sixteenth', XXI: 'the Twenty-first', XXII: 'the Twenty-second',
  XXIII: 'the Twenty-third',
};

// Punctuation and noise handling shared by both languages.
function tidyPunctuation(text: string): string {
  return (
    text
      // ── List bullets are visual; a reader never says "dash" ────────────
      .replace(/^\s*[-•*–]\s+/gm, '')
      // ── Ranges: "1962–1965" reads "1962 to 1965" ───────────────────────
      .replace(/(\d)\s?[–—]\s?(\d)/g, '$1 to $2')
      // ── Punctuation → natural pauses ───────────────────────────────────
      // Em/en dashes become a comma — the guide pauses, then continues.
      .replace(/\s[—–]\s/g, ', ')
      // Ellipsis becomes a comma-pause, not a sentence break.
      .replace(/…/g, ', ')
      .replace(/\.{2,}\s*/g, ', ')
      // ── Remove inline citations that read as noise ─────────────────────
      .replace(/\s*\[\d+\]\s*/g, ' ')
      .replace(/\s*\(\d+\)\s*/g, ' ')
      // Short parentheticals become comma-asides — a reader lowers their
      // voice and continues; they never say "open bracket".
      .replace(/\s*\(([^()]{1,80})\)\s*/g, ', $1, ')
      // ── Tidy whitespace — but PRESERVE line breaks: they are the
      // paragraph boundaries that give the reading its long pauses and
      // breaths. Only runs of spaces/tabs collapse.
      .replace(/[^\S\n]{2,}/g, ' ')
      .replace(/[^\S\n]*\n[^\S\n]*/g, '\n')
      .trim()
  );
}

export function humanizeText(text: string, lang: Lang): string {
  // Vietnamese gets its own scripture-reference reading; the English
  // abbreviation and ordinal rules must never touch Vietnamese prose.
  if (lang === 'vi') {
    return tidyPunctuation(
      text
        .replace(/\b(\d+):(\d+)[-–](\d+)\b/g, 'chương $1, câu $2 đến $3')
        .replace(/\b(\d+):(\d+)\b/g, 'chương $1, câu $2'),
    );
  }

  let en = text
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
    // ── Catechism citations read as prose, not spelled letters ───────────
    .replace(/\bCCC\s+(\d+)/g, 'Catechism, paragraph $1')
    // ── Acronyms — dot-separated so TTS spells them out clearly ──────────
    .replace(/\bRCIA\b/g, 'R. C. I. A.')
    .replace(/\bOCIA\b/g, 'O. C. I. A.')
    .replace(/\bCCC\b/g, 'C. C. C.')
    // ── Scripture book abbreviations (only before a numeric reference) ───
    .replace(/\b([123])\s?(Cor|Thess|Tim|Pet|Jn|Sam|Kgs|Chr|Macc)\.?\s+(?=\d)/g,
      (m, n: string, book: string) => {
        const nth = ({ '1': 'First', '2': 'Second', '3': 'Third' } as Record<string, string>)[n];
        return `${nth} ${SCRIPTURE_BOOKS[book] ?? book} `;
      })
    .replace(/\b(Gen|Ex|Lev|Num|Deut|Josh|Ps|Prov|Eccl|Wis|Sir|Is|Isa|Jer|Ezek|Dan|Hos|Mic|Zech|Mal|Mt|Mk|Lk|Jn|Rom|Gal|Eph|Phil|Col|Heb|Jas|Rev)\.?\s+(?=\d)/g,
      (m, book: string) => `${SCRIPTURE_BOOKS[book] ?? book} `)
    // ── Scripture references: "John 3:16" → "John, chapter 3, verse 16" ──
    .replace(/\b(\d+):(\d+)[-–](\d+)\b/g, 'chapter $1, verses $2 to $3')
    .replace(/\b(\d+):(\d+)\b/g, 'chapter $1, verse $2')
    // Psalms are cited by number, never by chapter.
    .replace(/\bPsalms?\s+chapter\b/g, 'Psalm')
    // ── Councils are spoken "Vatican Two", never "Vatican the Second" ────
    .replace(/\bVatican II\b/g, 'Vatican Two')
    .replace(/\bVatican I\b/g, 'Vatican One')
    // ── Regnal numerals after a name: "John Paul II" → "John Paul the Second"
    // (numeral must be 2+ letters — a lone "I" after a name is the pronoun)
    .replace(
      /\b([A-Z][a-z]+)\s(X{0,2}(?:I[VX]|V?I{1,3}|V))\b(?=[\s,.;:!?)]|$)/g,
      (m, name: string, numeral: string) =>
        numeral.length > 1 && ROMAN_REGNAL[numeral] ? `${name} ${ROMAN_REGNAL[numeral]}` : m,
    )
    // ── Ordinals: 1st–31st → words (feast days, Sundays of Advent, …) ────
    .replace(/\b([1-9]|[12]\d|3[01])(st|nd|rd|th)\b/gi, (m, n: string) =>
      ORDINAL_WORDS[Number(n)] ?? m,
    )
    // ── Common shorthand ─────────────────────────────────────────────────
    .replace(/\be\.g\.\s*/g, 'for example, ')
    .replace(/\bi\.e\.\s*/g, 'that is, ')
    .replace(/\bcf\.\s*/gi, 'compare ')
    // ── Eras: spelled letter by letter, "A. D. 33", "500 B. C." ──────────
    .replace(/\bAD\b(?=\s*\d)/g, 'A. D.')
    // no trailing dot — it would collide with the sentence's own full stop
    .replace(/(?<=\d\s?)BC\b/g, 'B. C')
    .replace(/\betc\.\b/g, 'et cetera')
    .replace(/\s&\s/g, ' and ')
    .replace(/\bvs\.\s*/g, 'versus ');

  for (const [latin, phonetic] of LATIN_RESPELL) en = en.replace(latin, phonetic);
  return tidyPunctuation(en);
}

/**
 * Assemble spoken text from separate pieces (a heading, a body, a note…).
 * Each piece becomes its own paragraph — a real pause and a breath between
 * them — and gets a full stop only if it doesn't already end in punctuation,
 * so "Who Is God?" never becomes "Who Is God?.".
 */
export function spokenParagraphs(...parts: Array<string | false | null | undefined>): string {
  return parts
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .map((p) => (/[.!?…:;,。！？]$/.test(p) ? p : `${p}.`))
    .join('\n\n');
}

// ─── Chunk splitting ─────────────────────────────────────────────────────────
// We speak the text in short, naturally-paced pieces. The pause that follows
// each piece reflects how the punctuation would sound in a real reading:
// a comma is a breath; a full stop is a thought completing.

interface Chunk {
  text: string;
  pause: number;       // ms to wait before the next chunk begins
  question?: boolean;  // rising thought — spoken with a slight lift
  solemn?: boolean;    // "Amen." / "Alleluia." — spoken slowly, reverently
  quoted?: boolean;    // dialogue — a reader marks a quotation with a shift
  pos?: 'open' | 'mid' | 'close' | 'solo'; // position within its sentence
  seed?: number;       // sentence counter — each sentence gets its own melody
  breath?: boolean;    // opens a paragraph — a faint intake of breath first
}

const SENTENCE_PAUSE  = 380; // after . ! ?  — a thought has completed
const CLAUSE_PAUSE    = 110; // after ,  ;  : — a breath between ideas
const PARAGRAPH_PAUSE = 620; // a blank line — the reader looks up for a moment

/** Merge stubby fragments into their neighbour so the reading never stutters
 *  ("Yes," … "and no." should be one breath, not two). */
function mergeShortChunks(chunks: Chunk[]): Chunk[] {
  const out: Chunk[] = [];
  for (const c of chunks) {
    const prev = out[out.length - 1];
    if (
      prev &&
      !c.solemn &&
      (c.text.length < 18 || prev.text.length < 18) &&
      prev.text.length + c.text.length < 90 &&
      prev.pause <= CLAUSE_PAUSE
    ) {
      prev.text = `${prev.text} ${c.text}`;
      prev.pause = c.pause;
      prev.question = c.question;
      // If the merge swallowed the whole sentence, it now opens AND closes it.
      if (prev.pos === 'open' && c.pos === 'close') prev.pos = 'solo';
    } else {
      out.push({ ...c });
    }
  }
  return out;
}

export function intoChunks(raw: string, lang: Lang): Chunk[] {
  const chunks: Chunk[] = [];
  let seed = 0; // running sentence counter, across paragraphs

  // Paragraphs first: a blank line is a longer, deliberate silence.
  const paragraphs = humanizeText(raw, lang)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const paragraphStart = chunks.length;
    // A sentence may end inside quotation marks — '…for you."' still ends it.
    const sentences = paragraph
      .split(/(?<=[.!?。！？]["”’']?)\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    sentences.forEach((sentence, si) => {
      const lastSentence = si === sentences.length - 1;
      const question = /[?？]["”’']?$/.test(sentence);
      const solemn = /^(amen|alleluia)[.!]?$/i.test(sentence);
      const quoted = /^["“‘']/.test(sentence);
      // A solemn word earns a long silence after it, even mid-paragraph.
      const endPause = lastSentence || solemn ? PARAGRAPH_PAUSE : SENTENCE_PAUSE;
      seed++;

      // For longer sentences, also split at clause boundaries so the guide
      // breathes between ideas rather than rushing through a long stretch —
      // and so the pitch can fall through the sentence (declination).
      if (sentence.length > 48) {
        const clauses = sentence
          .split(/(?<=[,;:])\s+/)
          .map((c) => c.trim())
          .filter(Boolean);

        clauses.forEach((clause, i) => {
          const isLast = i === clauses.length - 1;
          chunks.push({
            text: clause,
            pause: isLast ? endPause : CLAUSE_PAUSE,
            question: isLast ? question : false,
            quoted: i === 0 ? quoted : false,
            pos: i === 0 ? 'open' : isLast ? 'close' : 'mid',
            seed,
          });
        });
      } else {
        chunks.push({ text: sentence, pause: endPause, question, solemn, quoted, pos: 'solo', seed });
      }
    });

    // The first words of a paragraph follow an intake of breath.
    if (chunks.length > paragraphStart) chunks[paragraphStart].breath = true;
  }

  // Fallback: text with no sentence-ending punctuation (e.g. a title or label).
  if (!chunks.length) {
    const text = humanizeText(raw, lang);
    if (text) chunks.push({ text, pause: SENTENCE_PAUSE, pos: 'solo', seed: 1 });
  }

  // A reader lets a beat fall before a quotation — the silence frames it.
  for (let i = 1; i < chunks.length; i++) {
    if (chunks[i].quoted) {
      chunks[i - 1].pause = Math.max(chunks[i - 1].pause, SENTENCE_PAUSE + 140);
    }
  }

  return mergeShortChunks(chunks);
}

// ─── Speaking engine ─────────────────────────────────────────────────────────

/** How the guide reads: a story is warm and conversational; a prayer is
 *  slower, more even, with longer silences — reverence, not performance. */
export type Tone = 'story' | 'prayer';

let queue: Chunk[] = [];
let activeId: string | null = null;
let activeLang: Lang = 'en';
let activeTone: Tone = 'story';
let chunkIndex = 0; // how far through the current passage we are
let generation = 0; // bumped on every narrate/stop — cancel() fires the old
                    // utterance's onend/onerror AFTER the new narration has
                    // begun; stale events must never touch the new state
let keepAlive: ReturnType<typeof setInterval> | null = null;

function clearKeepAlive() {
  if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
}

export function stopNarration() {
  const s = synth();
  generation++;
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

  // She breathes in, and begins — the words start on the tail of the inhale,
  // exactly as a person does. (Utterance startup latency covers the overlap.)
  if (chunk.breath) playBreath();

  const u = new SpeechSynthesisUtterance(chunk.text);
  const voice = pickVoice(activeLang);
  if (voice) u.voice = voice;
  // Hint British English so the engine uses the right pronunciation rules
  // even on platforms where no specific voice could be selected.
  u.lang = voice?.lang ?? (activeLang === 'vi' ? 'vi-VN' : 'en-GB');

  // ── Prosody contour ──────────────────────────────────────────────────────
  // Monotone is what a flat pitch sounds like. A human reader speaks in
  // melody: each sentence sits on its own note, opens above the baseline,
  // and falls as the thought completes — pitch declination. Rate breathes
  // the same way: settle in, hold a steady middle, slow into the ending.
  const isFirst = chunkIndex === 0;
  const isLast = queue.length === 0;
  const prayer = activeTone === 'prayer';
  // Vietnamese voices read naturally a touch quicker; 0.87 drags for vi.
  // A prayer is slower still — the words are being prayed, not delivered.
  const base = (activeLang === 'vi' ? 0.92 : 0.87) - (prayer ? 0.05 : 0);
  let rate = base;                    // steady, unhurried middle
  if (isLast) rate = base - 0.05;     // ritardando — let the ending land
  else if (isFirst) rate = base - 0.03; // settle in gently
  // Readers move a touch quicker through long, flowing clauses and give
  // short ones room to breathe.
  else if (chunk.text.length > 90) rate += 0.015;
  else if (chunk.text.length < 25) rate -= 0.015;

  // Each sentence sits on its own note: a deterministic melody derived from
  // the sentence counter, drifting ±0.02 around the voice's natural register.
  // Prayers keep a narrower melody — even, litany-like, never theatrical.
  const dyn = prayer ? 0.55 : 1;
  const seed = chunk.seed ?? 0;
  const melody = (((seed * 2654435761) >>> 0) % 1000) / 1000; // stable 0..1
  let pitch = 0.985 + melody * 0.04 * dyn;

  // Declination: the thought begins above its note and falls to rest on it.
  if (chunk.pos === 'open') pitch += 0.045 * dyn;
  else if (chunk.pos === 'mid') pitch += 0.015 * dyn;
  else if (chunk.pos === 'close') pitch -= 0.035 * dyn;

  if (chunk.question) pitch += 0.075 * dyn; // the rise of asking
  if (chunk.quoted) pitch += 0.02;          // dialogue sits slightly apart

  // Micro-variance: no two chunks are ever spoken identically.
  pitch += Math.random() * 0.02 - 0.01;
  rate += Math.random() * 0.016 - 0.008;

  if (chunk.solemn) {
    rate = 0.76;   // "Amen." — slow, reverent, letting it rest
    pitch = 0.96;
  }

  pitch = Math.min(1.12, Math.max(0.92, pitch));
  rate = Math.min(0.97, Math.max(0.72, rate));

  // Volume shading: a reader leans in at the start, opens up through the
  // middle, and lets the final words soften rather than stopping at
  // full loudness. Solemn words are almost whispered.
  let volume = 1.0;
  if (isFirst) volume = 0.97;
  if (isLast) volume = 0.94;
  if (chunk.solemn) volume = 0.88;
  chunkIndex++;

  u.rate   = rate;
  u.pitch  = pitch;
  u.volume = volume;

  const gen = generation; // this utterance belongs to this narration only

  u.onend = () => {
    if (generation !== gen || activeId === null) return;
    // The chunk's own pause (breath vs. completed thought), with a little
    // human variance — identical pauses every time read as a metronome.
    // A prayer holds its silences longer; the pauses are part of the prayer.
    const jitter = 0.85 + Math.random() * 0.3;
    const hold = activeTone === 'prayer' ? 1.35 : 1;
    setTimeout(() => {
      if (generation === gen && activeId !== null) speakNext();
    }, Math.round(chunk.pause * jitter * hold));
  };

  u.onerror = () => {
    if (generation !== gen) return; // cancelled by a newer narration — ignore
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
export function narrate(
  id: string,
  text: string,
  lang: Lang,
  opts?: { cue?: boolean; tone?: Tone },
) {
  const s = synth();
  if (!s) return;

  const chunks = intoChunks(text, lang);
  if (!chunks.length) {
    // Nothing speakable (empty or whitespace text) — just stop what's playing.
    stopNarration();
    return;
  }

  generation++;
  const gen = generation;
  s.cancel();
  clearKeepAlive();

  queue = chunks;
  chunkIndex = 0;
  activeId = id;
  activeLang = lang;
  activeTone = opts?.tone ?? 'story';
  speakingId = id;
  emit();

  if (opts?.cue) playChime();

  // Chrome silently pauses synthesis after ~15 s; nudging it keeps long
  // passages (a whole prayer, a Mass moment) flowing to the end. The nudge
  // itself causes an audible stutter on Safari, so it's Chromium-only.
  if (typeof navigator !== 'undefined' && /chrom(e|ium)|edg/i.test(navigator.userAgent)) {
    keepAlive = setInterval(() => {
      const sp = synth();
      if (sp && sp.speaking) {
        sp.pause();
        sp.resume();
      }
    }, 9000);
  }

  // Wait for the async voice list before the first utterance, so the very
  // first words already carry the chosen female voice — never the default.
  // Then a short beat: Chrome can swallow an utterance queued immediately
  // after cancel(), and the chime deserves to finish before the guide speaks.
  const settle = opts?.cue ? 450 : 80;
  whenVoicesReady(() => {
    setTimeout(() => {
      if (generation === gen && activeId === id) speakNext();
    }, settle);
  });
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
