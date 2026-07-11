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
  type: 'vocab' | 'quiz' | 'homework';
  points: number;
}

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface Attendance {
  id: string;
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD (a class session date)
  status: AttendanceStatus;
}

export interface Feedback {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  rating: number; // 1-5 stars
  message: string;
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
  attendance: Attendance[];
}
