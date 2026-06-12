export type Role = 'student' | 'teacher' | 'admin' | 'parent';
export type Skill = 'listening' | 'speaking' | 'reading' | 'writing';
export const SKILLS: Skill[] = ['listening', 'speaking', 'reading', 'writing'];

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  password: string; // demo only — replaced by real auth when a backend is added
  avatar: string;
  classIds: string[]; // student: enrolled; teacher: taught
  childIds: string[]; // parent only
}

export interface ScheduleSlot {
  weekday: number; // 0 = Sunday … 6 = Saturday
  start: string;
  end: string;
  room: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  level: string;
  teacherId: string;
  color: string;
  emoji: string;
  schedule: ScheduleSlot[];
}

export interface Assessment {
  id: string;
  classId: string;
  title: string;
  kind: 'test' | 'quiz';
  date: string; // YYYY-MM-DD
  maxScore: number;
}

export interface Score {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number;
  skills?: Partial<Record<Skill, number>>; // 0-10
  comment?: string;
}

export interface Homework {
  id: string;
  classId: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
}

export interface HomeworkStatus {
  homeworkId: string;
  studentId: string;
  done: boolean;
  doneAt?: string;
}

export interface VocabWord {
  id: string;
  term: string;
  meaningVi: string;
  example: string;
}

export interface VocabList {
  id: string;
  classId: string;
  title: string;
  words: VocabWord[];
}

export interface PracticeEvent {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  type: 'vocab' | 'quiz' | 'homework' | 'lesson';
  points: number;
}

export interface Feedback {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  rating: number; // 1-5 stars
  message: string;
}

// --- Self-study learning programs ---

export type Exercise =
  | { kind: 'mc'; question: string; options: string[]; answer: string }
  | { kind: 'fill'; sentence: string; choices: string[]; answer: string } // sentence contains ___
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
  levelKeywords: string[]; // matched against ClassInfo.level to recommend
  units: Unit[];
}

export interface LessonProgress {
  studentId: string;
  lessonId: string;
  bestPct: number;
  stars: number; // 0-3
  attempts: number;
  completedAt: string;
}

export interface DB {
  users: User[];
  classes: ClassInfo[];
  assessments: Assessment[];
  scores: Score[];
  homework: Homework[];
  homeworkStatus: HomeworkStatus[];
  vocabLists: VocabList[];
  practice: PracticeEvent[];
  feedback: Feedback[];
  lessonProgress: LessonProgress[];
}
