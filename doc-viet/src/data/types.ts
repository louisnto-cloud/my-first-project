export type LessonKind = 'phonics' | 'vocabulary' | 'reading' | 'writing' | 'grammar' | 'comprehension';

export interface Exercise {
  id: string;
  kind: 'multiple-choice' | 'fill-blank';
  prompt: string;
  options?: string[];
  answer: string;
  hint?: string;
}

export interface Lesson {
  id: string;
  monthIndex: number; // 0-5
  weekIndex: number;
  lessonIndex: number;
  title: string;
  kind: LessonKind;
  objective: string;
  audioText: string;   // spoken intro — English explanation with Vietnamese examples
  content: string;     // main lesson body (markdown-like)
  keyWords: { word: string; meaning: string }[]; // word = Vietnamese, meaning = English
  exercises: Exercise[];
  writingPrompt?: string;
}

export interface Month {
  index: number;
  title: string;      // Vietnamese
  subtitle: string;   // English
  color: string;
  emoji: string;
  level: string;
  weeks: Week[];
}

export interface Week {
  index: number;
  title: string;
  lessons: Lesson[];
}
