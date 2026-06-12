// Shared curriculum content types (pure data — usable by any client).

export type Exercise =
  | { kind: 'mc'; question: string; options: string[]; answer: string }
  | { kind: 'fill'; sentence: string; choices: string[]; answer: string }
  | { kind: 'order'; words: string[]; answer: string }
  | { kind: 'listen'; text: string; options: string[]; answer: string };

export interface LessonGrammar {
  titleEn: string;
  titleVi: string;
  bodyEn: string;
  bodyVi: string;
  examples: { en: string; vi: string }[];
}

export interface Lesson {
  id: string;
  emoji: string;
  titleEn: string;
  titleVi: string;
  vocab: { term: string; meaningVi: string; example: string }[];
  grammar: LessonGrammar;
  exercises: Exercise[];
}

export interface Unit {
  id: string;
  titleEn: string;
  titleVi: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  emoji: string;
  color: string;
  titleEn: string;
  titleVi: string;
  descEn: string;
  descVi: string;
  levelKeywords: string[];
  units: Unit[];
}
