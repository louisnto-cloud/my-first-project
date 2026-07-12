// Sentence-level chunking for more natural, human-sounding speech.
//
// Why: a single long SpeechSynthesisUtterance is read as one flat, breathless
// monotone — and Chrome silently kills utterances longer than ~15 seconds.
// Splitting at sentence boundaries lets the engine reset its intonation curve
// on every sentence (each gets a natural rise and fall), and the short pauses
// between chunks read as human breathing room.
//
// baseWord tracks each chunk's first-word index within the FULL text, so the
// karaoke highlight keeps pointing at the right word across chunk boundaries.

export interface SpeechChunk {
  text: string;
  baseWord: number;   // index of this chunk's first word within the whole text
  pauseAfter: number; // ms of silence after the chunk (breath length)
}

const LONG_SENTENCE = 140;      // chars — split beyond this at commas
const SENTENCE_PAUSE = 300;     // breath between sentences
const CLAUSE_PAUSE = 140;       // shorter breath at a comma split

export function chunkForSpeech(text: string): SpeechChunk[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  // Split into sentences, keeping the punctuation with its sentence
  const sentences = clean.split(/(?<=[.!?…:])\s+/);
  const chunks: SpeechChunk[] = [];
  let base = 0;

  for (const sentence of sentences) {
    const pieces = sentence.length > LONG_SENTENCE ? splitLongSentence(sentence) : [sentence];
    pieces.forEach((piece, i) => {
      const words = piece.split(' ').filter(Boolean);
      if (words.length === 0) return;
      chunks.push({
        text: piece,
        baseWord: base,
        pauseAfter: i === pieces.length - 1 ? SENTENCE_PAUSE : CLAUSE_PAUSE,
      });
      base += words.length;
    });
  }
  return chunks;
}

/** Break an over-long sentence at clause boundaries (commas, dashes, dots-in-lists). */
function splitLongSentence(sentence: string): string[] {
  const out: string[] = [];
  let current = '';
  for (const word of sentence.split(' ')) {
    current = current ? `${current} ${word}` : word;
    if (current.length >= LONG_SENTENCE * 0.5 && /[,;·—–]$/.test(word)) {
      out.push(current);
      current = '';
    } else if (current.length >= LONG_SENTENCE) {
      out.push(current);
      current = '';
    }
  }
  if (current) out.push(current);
  return out;
}
