// Sentence- and LANGUAGE-aware chunking for natural, bilingual speech.
//
// Lesson audio mixes English explanations with Vietnamese examples. Speaking
// both with one voice makes English sound Vietnamese-accented (or Vietnamese
// sound mangled). So text is split into chunks, each tagged 'en' or 'vi', and
// the speech layer gives every chunk the right voice and language.
//
// Chunking also fixes robotic delivery: each sentence gets its own intonation
// curve plus a short breath after it, and Chrome's ~15s utterance kill can't
// truncate long passages.
//
// baseWord tracks each chunk's first-word index within the FULL text, so the
// karaoke highlight keeps pointing at the right word across chunk boundaries.

import { hasDiacritics } from './vi';

export type SpeechLang = 'vi' | 'en';

export interface SpeechChunk {
  text: string;
  baseWord: number;   // index of this chunk's first word within the whole text
  pauseAfter: number; // ms of silence after the chunk (breath length)
  lang: SpeechLang;
}

const LONG_SEGMENT = 140;       // chars — split beyond this at commas
const SENTENCE_PAUSE = 300;     // breath between sentences
const CLAUSE_PAUSE = 140;       // shorter breath at a comma split
const LANG_SWITCH_PAUSE = 60;   // tiny beat when switching voices mid-sentence

// Vietnamese words used in this app that happen to be plain ASCII, so the
// diacritic test alone can't spot them. A word from this list only counts as
// Vietnamese next to a definitely-Vietnamese word (or in a short utterance),
// so English "an apple" stays English while "xin chào" goes Vietnamese.
const VI_ASCII = new Set([
  'ma', 'ba', 'ta', 'an', 'ang', 'anh', 'ai', 'em', 'con', 'nam', 'hai',
  'sao', 'cao', 'mai', 'bay', 'rau', 'sau', 'xin', 'ngon', 'nghe', 'quen',
  'kem', 'hoa', 'vui', 'xanh', 'trong', 'theo', 'tin', 'vua', 'ngang',
  'lan', 'minh', 'mi', 'huy', 'oan', 'ay', 'ao', 'au', 'oi', 'eo',
]);

type WordLang = SpeechLang | 'ambi' | 'punct';

function classify(word: string): WordLang {
  const letters = word.toLowerCase().replace(/[^\p{L}]/gu, '');
  if (!letters) return 'punct';
  if (hasDiacritics(letters)) return 'vi';
  if (VI_ASCII.has(letters)) return 'ambi';
  return 'en';
}

/** Decide a language for every word of the text. */
function resolveLangs(words: string[]): SpeechLang[] {
  const raw = words.map(classify);
  const letterWords = raw.filter((l) => l !== 'punct').length || 1;
  const defVi = raw.filter((l) => l === 'vi').length;
  const anyViSignal = defVi > 0 || raw.includes('ambi');

  // Mostly-Vietnamese text (stories, example sentences): speak it all as
  // Vietnamese so ASCII names like "Nam" or "Lan" don't flip the voice.
  if (defVi / letterWords >= 0.4) return words.map(() => 'vi');
  if (!anyViSignal) return words.map(() => 'en');
  // Short utterances (tap-to-hear words, "xin chào"): any Vietnamese signal wins
  if (letterWords <= 3) return words.map(() => 'vi');

  const langs: WordLang[] = [...raw];
  // Ambiguous ASCII words join a Vietnamese neighbour ("xin" next to "chào");
  // two passes let short chains resolve.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < langs.length; i++) {
      if (langs[i] === 'ambi' && (langs[i - 1] === 'vi' || langs[i + 1] === 'vi')) langs[i] = 'vi';
    }
  }
  // Leftover ambiguity is English context ("an apple"); punctuation/numbers
  // inherit the running language.
  const firstReal = langs.find((l) => l === 'vi' || l === 'en');
  let prev: SpeechLang = firstReal === 'vi' ? 'vi' : 'en';
  return langs.map((l) => {
    if (l === 'vi') prev = 'vi';
    else if (l === 'en' || l === 'ambi') prev = 'en';
    return prev; // 'punct' keeps the running language
  });
}

export function chunkForSpeech(text: string): SpeechChunk[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ');
  const langs = resolveLangs(words);

  const chunks: SpeechChunk[] = [];
  let seg: string[] = [];
  let segStart = 0;
  let segLang: SpeechLang = langs[0];
  let len = 0;

  const flush = (pause: number) => {
    if (seg.length) chunks.push({ text: seg.join(' '), baseWord: segStart, pauseAfter: pause, lang: segLang });
    seg = [];
    len = 0;
  };

  for (let i = 0; i < words.length; i++) {
    if (seg.length && langs[i] !== segLang) flush(LANG_SWITCH_PAUSE);
    if (seg.length === 0) { segStart = i; segLang = langs[i]; }
    seg.push(words[i]);
    len += words[i].length + 1;

    if (/[.!?…:]$/.test(words[i])) flush(SENTENCE_PAUSE);
    else if (len >= LONG_SEGMENT * 0.5 && /[,;·—–]$/.test(words[i])) flush(CLAUSE_PAUSE);
    else if (len >= LONG_SEGMENT * 1.5) flush(CLAUSE_PAUSE);
  }
  flush(SENTENCE_PAUSE);
  return chunks;
}
