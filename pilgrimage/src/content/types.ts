// ─── The Pilgrimage: content schema ──────────────────────────────────────────
// Every piece of curriculum lives in typed content files, never in components.

/** Review state of a Vietnamese string. Unverified strings still display, but
 *  are collected by the hidden review export for a native speaker to check. */
export type ViStatus = 'verified' | 'unverified';

/** A localized string. Every user-facing sentence in the app is one of these. */
export interface L {
  en: string;
  vi: string;
  viStatus: ViStatus;
}

/** Identifiers for the in-app illuminated artwork scenes (see SacredArt).
 *  Each id can later be backed by a real public-domain image in /public/art. */
export type ArtKind =
  | 'cathedral-hanoi'
  | 'cathedral-door'
  | 'creation-light'
  | 'creation-world'
  | 'creation-people'
  | 'prayer-night'
  | 'sky-flight'
  | 'teacher-hill'
  | 'incense-altar'
  | 'martyrs-palm'
  | 'candle-single'
  | 'lake-evening'
  | 'cross-dawn'
  | 'symbol-water'
  | 'symbol-light'
  | 'symbol-bread'
  | 'symbol-cross'
  | 'symbol-incense'
  // World 2 · Bruges
  | 'basilica-bruges'
  | 'eden-tree'
  | 'prophet-night'
  | 'annunciation'
  | 'nativity'
  | 'cana-jars'
  | 'prodigal-embrace'
  | 'samaritan-road'
  | 'loaves-fishes'
  | 'storm-sea'
  | 'palm-gate'
  | 'last-supper'
  | 'gethsemane'
  | 'cross-passion'
  | 'tomb-morning'
  | 'relic-blood'
  | 'emmaus-road'
  | 'ascension';

export interface Scripture {
  /** Book chapter:verse, e.g. "John 8:12" */
  ref: string;
  /** Simplified rendering, max two sentences, never archaic. */
  verse: L;
  /** "In plain words" — like telling a friend over coffee. */
  plain: L;
  /** Optional bridge to her world. Only when natural. */
  bridge?: L;
  /** Optional traditional wording behind the "original beauty" toggle. */
  original?: string;
}

export interface StoryBranch {
  prompt: L;
  choices: { label: L; response: L }[];
}

export interface StoryCard {
  id: string;
  art: ArtKind;
  text: L;
  scripture?: Scripture;
  /** Light branching: a pause with no wrong answers. */
  branch?: StoryBranch;
  /** Glossary term ids that appear in this card's text via {{term}} markers. */
  terms?: string[];
}

// ─── Question formats ────────────────────────────────────────────────────────

interface QuestionBase {
  id: string;
  /** Insert this question after the story card with this index (0-based).
   *  Omitted = after the last card. */
  afterCard?: number;
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice';
  prompt: L;
  options: { text: L; art?: ArtKind }[];
  answer: number;
  why: L;
}

export interface PredictQuestion extends QuestionBase {
  kind: 'predict';
  prompt: L;
  options: { text: L }[];
  answer: number;
  why: L;
}

export interface OrderQuestion extends QuestionBase {
  kind: 'order';
  prompt: L;
  /** Items listed here in the CORRECT order; shuffled at runtime. */
  items: L[];
  why: L;
}

export interface FillQuestion extends QuestionBase {
  kind: 'fill';
  prompt: L;
  before: L;
  after: L;
  options: L[];
  answer: number;
  why: L;
}

export interface MatchQuestion extends QuestionBase {
  kind: 'match';
  prompt: L;
  pairs: { symbol: ArtKind; label: L; meaning: L }[];
}

export interface TapArtQuestion extends QuestionBase {
  kind: 'tapArt';
  prompt: L;
  art: ArtKind;
  /** Positions are percentages of the artwork box. */
  hotspots: { x: number; y: number; label: L; meaning: L }[];
}

export type Question =
  | ChoiceQuestion
  | PredictQuestion
  | OrderQuestion
  | FillQuestion
  | MatchQuestion
  | TapArtQuestion;

// ─── Treasures ───────────────────────────────────────────────────────────────

export type Treasure =
  | { kind: 'prayer'; prayerId: string; note: L }
  | { kind: 'word'; termId: string; note: L }
  | { kind: 'practice'; title: L; note: L }
  | { kind: 'art'; art: ArtKind; title: L; note: L };

// ─── Lessons and worlds ──────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  title: L;
  /** Honest estimate, 3–6 for daily steps. */
  minutes: number;
  door: { art: ArtKind; line: L };
  cards: StoryCard[];
  questions: Question[];
  treasure: Treasure;
  /** Optional, never scored: "What stayed with you today?" */
  reflection: L;
  /** "Go deeper" footnote: Catechism paragraph numbers. */
  deeper?: { ccc: number[]; note: L };
  /** Vigils are quizless capstones that earn the world's passport stamp. */
  vigil?: boolean;
}

export type WorldId = 'hanoi' | 'bruges' | 'paris' | 'brussels' | 'parish';

export interface World {
  id: WorldId;
  /** e.g. "Beginning" */
  name: L;
  church: L;
  place: L;
  theme: L;
  lessons: Lesson[];
}

// ─── Prayers, glossary, terminology ─────────────────────────────────────────

export interface Prayer {
  id: string;
  name: L;
  /** English text, line by line, simple modern wording. */
  en: string[];
  /** The actual traditional Vietnamese Catholic prayer, line by line.
   *  Never a fresh translation. */
  vi: string[];
  viStatus: ViStatus;
  about: L;
}

export interface GlossaryEntry {
  id: string;
  term: string;
  /** One-sentence plain English meaning. */
  plain: L;
  /** Established Vietnamese Catholic rendering. */
  vi: string;
  viStatus: ViStatus;
}

/** Locked Vietnamese Catholic terminology. All Vietnamese content must use
 *  these renderings; machine translation of sacred terms is forbidden. */
export interface TermEntry {
  en: string;
  vi: string;
}

export interface Artwork {
  id: ArtKind;
  title: L;
  /** Credit for the future real image; in-app scenes are original SVG. */
  credit: string;
  /** Optional path under /public/art once real public-domain images are added. */
  src?: string;
}
