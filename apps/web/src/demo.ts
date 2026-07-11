// In-browser demo engine. When the app is built with VITE_DEMO=1 (the
// published preview), every api() call is served from here instead of a
// network server — so the whole app is clickable with no hosting.
//
// It is honest about the one thing that matters: class isolation reuses the
// REAL policy functions from @etop/domain, the same code production runs.
// Data is seeded with the real E'TOP tenant and persisted to localStorage,
// so teacher edits and student work survive a refresh.

import { canTeachClass, canViewClass, weightedOverall, type Actor, type ClassRef, type SkillKey, type SkillScore } from '@etop/domain';

type Role = 'student' | 'tutor' | 'owner' | 'parent' | 'front_desk' | 'academic_director';

interface DUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  code?: string;
  avatar?: string; // kid-picked emoji character
  classIds: string[]; // student: enrolled; tutor: taught
  childIds: string[]; // parent
}
interface DClass {
  id: string;
  name: string;
  teacherId: string;
  scheduleNote: string;
  level: string;
}
interface DQuestion {
  id: string;
  skill: 'grammar' | 'reading' | 'listening' | 'writing';
  type: 'mc' | 'fill' | 'order' | 'listen' | 'write';
  prompt: string;
  payload: Record<string, unknown>;
  unit: string;
  ownerId?: string;
  shared?: boolean;
  sharedApproved?: boolean;
}
interface DAssignment {
  id: string;
  classId: string;
  title: string;
  status: 'draft' | 'published';
  questionIds: string[];
  dueAt: string | null;
}
interface DSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  answers: Record<string, unknown>;
  status: 'in_progress' | 'submitted' | 'graded';
  overall: number | null;
  pendingReview: boolean;
  comment?: string; // teacher's rubric comment
  rubricFrac?: number; // 0-1 rubric fraction for the writing question(s)
}
interface DPractice {
  studentId: string;
  kind: string;
  points: number;
  date: string;
  lessonId?: string;
  pct?: number;
}
interface DJoinReq {
  id: string;
  classId: string;
  studentId: string;
}
interface DAttend {
  studentId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  releasedTo: string | null;
}
interface DPickup {
  id: string;
  studentId: string;
  name: string;
  relation: string;
  pin: string;
  blocked: boolean;
}
interface DAnnouncement {
  id: string;
  classId: string | null; // null = whole center
  authorName: string;
  title: string;
  body: string;
  createdAt: string;
}
interface DDB {
  users: DUser[];
  classes: DClass[];
  questions: DQuestion[];
  assignments: DAssignment[];
  submissions: DSubmission[];
  practice: DPractice[];
  joinRequests: DJoinReq[];
  invites: { code: string; studentId: string; used: boolean }[];
  attendance: DAttend[];
  pickups: DPickup[];
  syncedEvents: string[]; // kiosk idempotency
  announcements: DAnnouncement[];
  nps: { userId: string; term: string; score: number; comment: string }[];
  sessionNotes: { studentId: string; date: string; className: string; tutorName: string; parentNote: string }[];
  summaries: { id: string; studentId: string; weekStart: string; bodyVi: string; bodyEn: string; status: 'draft' | 'approved' }[];
  messages: { studentId: string; senderId: string; senderName: string; body: string; at: string }[];
}

const ORG = 'org_etop';
const SITE = 'site_nh';
const KEY = 'etop-demo-db-v19';

// localStorage shim so this module is testable in Node.
const mem = new Map<string, string>();
const store = {
  get(k: string): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : mem.get(k) ?? null;
  },
  set(k: string, v: string): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
    else mem.set(k, v);
  },
};

let rngState = 1;
const rnd = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};
const uid = (p: string) => `${p}_${Math.floor(rnd() * 1e9).toString(36)}_${Date.now().toString(36)}`;
// LOCAL calendar date (not UTC): kiosk taps and attendance dots must land
// on the day the user experiences — Vietnam is UTC+7.
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localDate(new Date());

function seed(): DDB {
  const teachers: [id: string, name: string, code: string][] = [
    ['t_quy', 'Ms. Quy', 'GV0001'],
    ['t_trucvy', 'Ms. Truc Vy', 'GV0002'],
    ['t_y', 'Ms. Y', 'GV0003'],
    ['t_ha', 'Ms. Ha', 'GV0004'],
    ['t_tinh', 'Mr. Tinh', 'GV0005'],
    ['t_ly', 'Ms. Ly', 'GV0006'],
  ];
  const classDefs: [id: string, teacher: string, name: string, schedule: string][] = [
    ['sj1_246', 't_quy', 'SJ1', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    ['sk2_246', 't_trucvy', 'SK2', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    ['pn1_246', 't_y', 'PN1', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    ['starters_246', 't_ha', 'Starters', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    ['grm_246', 't_tinh', 'Get Ready Mover', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    ['sj1_357', 't_quy', 'SJ1', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['pn1_357a', 't_trucvy', 'PN1', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['pn1_357b', 't_y', 'PN1', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['starters_357', 't_ha', 'Starters', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['sj2_357', 't_tinh', 'SJ2', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['sj5_357', 't_ly', 'SJ5', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['sj2_t7cn', 't_trucvy', 'SJ2', 'Ca sáng · Thứ 7 & Chủ nhật'],
    ['grs_t7cn', 't_tinh', 'Get Ready Starter', 'Ca sáng · Thứ 7 & Chủ nhật'],
    ['sk1_24', 't_ly', 'SK1', 'Ca 2-4 · Thứ 2 & Thứ 4'],
    ['up1', 't_ha', 'Up 1', 'Thứ 2, 3, 4 · 17:30–19:00'],
    ['up2', 't_tinh', 'Up 2', 'Thứ 5, 6, 7 · 17:30–19:00'],
    ['up3', 't_ly', 'Up 3', 'Thứ 7 & Chủ nhật · 9:00–10:30'],
  ];
  const upStudents: [name: string, code: string, classId: string][] = [
    ['Nguyễn Gia Bảo', 'UP1482', 'up1'],
    ['Trần Khánh Vy', 'UP1739', 'up1'],
    ['Lê Minh Khôi', 'UP1256', 'up1'],
    ['Phạm Thuỳ Linh', 'UP2614', 'up2'],
    ['Võ Quốc Huy', 'UP2358', 'up2'],
    ['Đặng Mai Anh', 'UP2907', 'up2'],
    ['Bùi Đức Long', 'UP3171', 'up3'],
    ['Hoàng Yến Nhi', 'UP3845', 'up3'],
    ['Ngô Tuấn Kiệt', 'UP3520', 'up3'],
    ['Lý Thảo Vy', 'UP3693', 'up3'],
  ];
  // Ms. Quy (GV0001 — the quick-login teacher chip) gets a living class
  // too, so her first screen isn't an empty roster.
  const sjStudents: [name: string, code: string][] = [
    ['Đỗ Gia Hân', 'HV0101'],
    ['Lương Minh Trí', 'HV0102'],
    ['Trịnh Bảo Ngọc', 'HV0103'],
    ['Phùng Anh Khoa', 'HV0104'],
    ['Vương Thuỳ Dương', 'HV0105'],
  ];

  const users: DUser[] = [
    { id: 'u_zhao', role: 'owner', name: 'Ms. Zhao', email: 'zhao@etop.vn', classIds: [], childIds: [] },
    ...teachers.map(([id, name, code]) => ({
      id, role: 'tutor' as Role, name, email: `${id}@etop.vn`, code,
      classIds: classDefs.filter((c) => c[1] === id).map((c) => c[0]), childIds: [],
    })),
    ...upStudents.map(([name, code, classId], i) => ({
      id: `s_${code}`, role: 'student' as Role, name, email: `${code.toLowerCase()}@hv.etop.local`,
      code, avatar: ['🦊', '🐼', '🦄', '🐯', '🐸', '🐰', '🐙', '🦖', '🐳', '🐝'][i], classIds: [classId], childIds: [],
    })),
    ...sjStudents.map(([name, code], i) => ({
      id: `s_${code}`, role: 'student' as Role, name, email: `${code.toLowerCase()}@hv.etop.local`,
      code, avatar: ['🐨', '🦁', '🐼', '🦄', '🐸'][i] ?? '🐨', classIds: ['sj1_246'], childIds: [],
    })),
    // Two children (different classes) so the child switcher shows.
    { id: 'p0', role: 'parent', name: 'Phụ huynh (demo)', email: 'phuhuynh@etop.vn', classIds: [], childIds: ['s_UP1482', 's_UP2614'] },
    { id: 'fd0', role: 'front_desk', name: 'Lễ tân (demo)', email: 'letan@etop.vn', classIds: [], childIds: [] },
  ];

  // Registered pickup people (kiosk dismissal). Every student has Mom
  // (PIN 1234); the first also has a blocked person to demo the hard stop.
  const pickups: DPickup[] = upStudents.flatMap(([name, code]) => {
    const sid = `s_${code}`;
    const given = name.split(' ').slice(-1)[0];
    const list: DPickup[] = [{ id: `pk_${code}_m`, studentId: sid, name: `Mẹ bé ${given}`, relation: 'Mẹ', pin: '1234', blocked: false }];
    if (code === 'UP1482') list.push({ id: `pk_${code}_x`, studentId: sid, name: 'Người bị cấm đón (demo)', relation: 'Khác', pin: '0000', blocked: true });
    return list;
  });

  const classes: DClass[] = classDefs.map(([id, teacherId, name, scheduleNote]) => ({
    id, teacherId, name, scheduleNote, level: id.startsWith('up') ? 'a1_movers' : 'pre_a1_starters',
  }));

  const questions: DQuestion[] = [
    { id: 'q1', skill: 'grammar', type: 'mc', unit: 'Unit 1', prompt: 'I ___ a student.', payload: { options: ['am', 'is', 'are', 'be'], answer: 'am' } },
    { id: 'q2', skill: 'grammar', type: 'fill', unit: 'Unit 1', prompt: 'She ___ my friend.', payload: { sentence: 'She ___ my friend.', choices: ['is', 'am', 'are'], answer: 'is' } },
    { id: 'q3', skill: 'reading', type: 'mc', unit: 'Unit 1', prompt: '“The cat is under the table.” Where is the cat?', payload: { options: ['Under the table', 'On the table', 'Next to the dog'], answer: 'Under the table' } },
    { id: 'q4', skill: 'listening', type: 'listen', unit: 'Unit 1', prompt: 'Nghe và chọn câu đúng.', payload: { audioText: 'Good morning, teacher!', options: ['Good morning, teacher!', 'Good night, teacher!', 'Good morning, Peter!'], answer: 'Good morning, teacher!' } },
    { id: 'q5', skill: 'writing', type: 'order', unit: 'Unit 1', prompt: 'Xếp thành câu đúng:', payload: { words: ['My', 'name', 'is', 'Mai'], answer: 'My name is Mai' } },
    { id: 'q6', skill: 'grammar', type: 'mc', unit: 'Unit 2', prompt: 'They ___ playing football.', payload: { options: ['are', 'is', 'am'], answer: 'are' } },
    { id: 'q7', skill: 'reading', type: 'fill', unit: 'Unit 2', prompt: 'An apple a ___ keeps the doctor away.', payload: { sentence: 'An apple a ___ keeps the doctor away.', choices: ['day', 'week', 'year'], answer: 'day' } },
    { id: 'q8', skill: 'listening', type: 'listen', unit: 'Unit 2', prompt: 'Nghe và chọn câu đúng.', payload: { audioText: 'I have two brothers.', options: ['I have two brothers.', 'I have two sisters.', 'I have ten brothers.'], answer: 'I have two brothers.' } },
    { id: 'q9', skill: 'writing', type: 'write', unit: 'Unit 1', prompt: 'Write 2–3 sentences about your family. / Viết 2–3 câu về gia đình em.', payload: { starters: ['My family has…', 'I love…'] } },
  ];

  // Seed questions are shared-and-approved center material.
  for (const qq of questions) { qq.ownerId = ['q6','q7','q8'].includes(qq.id) ? 't_quy' : 't_ha'; qq.shared = true; qq.sharedApproved = true; }

  const db: DDB = {
    users,
    classes,
    questions,
    assignments: [
      { id: 'a_demo1', classId: 'up1', title: 'Unit 1 — Ôn tập / Review', status: 'published', questionIds: ['q1', 'q3', 'q4', 'q5'], dueAt: new Date(Date.now() + 20 * 3_600_000).toISOString() },
      { id: 'a_demo2', classId: 'up1', title: 'Viết đoạn — My family', status: 'published', questionIds: ['q9'], dueAt: new Date(Date.now() + 3 * 86_400_000).toISOString() },
      { id: 'a_demo3', classId: 'sj1_246', title: 'Unit 2 — Grammar check', status: 'published', questionIds: ['q6', 'q7', 'q8'], dueAt: new Date(Date.now() + 2 * 86_400_000).toISOString() },
    ],
    submissions: [
      // A classmate already handed in the seeded assignment, so the teacher
      // view shows live results from the first open.
      { id: 'sub_seed1', assignmentId: 'a_demo1', studentId: 's_UP1739', answers: { q1: 'am', q3: 'Under the table', q4: 'Good morning, teacher!', q5: ['My', 'name', 'is', 'Mai'] }, status: 'graded', overall: 100, pendingReview: false },
      { id: 'sub_seed2', assignmentId: 'a_demo1', studentId: 's_UP1256', answers: { q1: 'is', q3: 'Under the table', q4: 'Good morning, teacher!', q5: ['My', 'name', 'is', 'Mai'] }, status: 'graded', overall: 75, pendingReview: false },
      // …and a writing submission waiting in the grading queue, so teachers
      // can try rubric grading immediately.
      { id: 'sub_seed3', assignmentId: 'a_demo2', studentId: 's_UP1739', answers: { q9: 'My family has four people. I love my mom and my dad. My sister is cute.' }, status: 'submitted', overall: null, pendingReview: true },
      // Ms. Quy's SJ1 has results too.
      { id: 'sub_seed4', assignmentId: 'a_demo3', studentId: 's_HV0101', answers: { q6: 'are', q7: 'day', q8: 'I have two brothers.' }, status: 'graded', overall: 100, pendingReview: false },
      { id: 'sub_seed5', assignmentId: 'a_demo3', studentId: 's_HV0102', answers: { q6: 'is', q7: 'day', q8: 'I have two brothers.' }, status: 'graded', overall: 66.7, pendingReview: false },
    ],
    practice: [
      // A little history so the first student already has a streak + points,
      // and classmates on the board so the leaderboard has a race going.
      { studentId: 's_UP1482', kind: 'lesson', points: 14, date: today(), lessonId: 'found_l1', pct: 100 },
      { studentId: 's_UP1739', kind: 'lesson', points: 12, date: today(), lessonId: 'found_l1', pct: 90 },
      { studentId: 's_UP1739', kind: 'vocab', points: 10, date: today() },
      { studentId: 's_UP1256', kind: 'lesson', points: 8, date: today(), lessonId: 'found_l1', pct: 80 },
    ],
    joinRequests: [],
    invites: [],
    attendance: [],
    pickups,
    syncedEvents: [],
    announcements: [
      { id: 'ann1', classId: null, authorName: 'Ms. Zhao', title: '📣 Nghỉ lễ Quốc khánh 2/9', body: 'Trung tâm nghỉ ngày 2/9. Các lớp học bù sẽ được thông báo với từng lớp. Chúc cả nhà kỳ nghỉ vui!', createdAt: new Date().toISOString() },
      { id: 'ann2', classId: 'up1', authorName: 'Ms. Ha', title: 'Tuần này học Unit 2 🎈', body: 'Cả lớp nhớ mang vở bài tập nhé. Bạn nào chưa nộp bài "Viết đoạn — My family" thì hoàn thành trước thứ 6.', createdAt: new Date().toISOString() },
    ],
    nps: [
      { userId: 'seed_p1', term: 'seed', score: 10, comment: 'Cô giáo rất tận tâm, con tiến bộ rõ.' },
      { userId: 'seed_p2', term: 'seed', score: 9, comment: 'App tiện, biết ngay con đến lớp chưa.' },
      { userId: 'seed_p3', term: 'seed', score: 7, comment: 'Mong có thêm lớp cuối tuần.' },
    ],
    sessionNotes: [
      { studentId: 's_UP1482', date: today(), className: 'Up 1', tutorName: 'Ms. Ha', parentNote: 'Hôm nay bé phát âm rất tốt và xung phong trả lời 3 lần. Về nhà ôn từ vựng Unit 1 giúp cô nhé!' },
      { studentId: 's_UP2614', date: today(), className: 'Up 2', tutorName: 'Mr. Tinh', parentNote: 'Linh làm bài nhóm rất tích cực. Thầy gửi thêm bài nghe để bé luyện cuối tuần nhé!' },
    ],
    summaries: [
      // Last week: already approved → the parent sees it. This week: a
      // draft waiting in Ms. Ha's approval queue, so the loop is live.
      {
        id: 'sum1', studentId: 's_UP1482', weekStart: new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10), status: 'approved',
        bodyVi: 'Tuần trước bé học Unit 1: chào hỏi và giới thiệu bản thân. Nghe hiểu tốt, cần luyện thêm viết câu. Cô rất vui với tiến bộ của bé! 💜',
        bodyEn: 'Last week we covered Unit 1: greetings and introductions. Strong listening; sentence writing needs practice. Great progress! 💜',
      },
      {
        id: 'sum2', studentId: 's_UP1482', weekStart: new Date().toISOString().slice(0, 10), status: 'draft',
        bodyVi: 'Tuần này bé hoàn thành bài Ôn tập Unit 1 và tự luyện đều mỗi ngày. Điểm chăm chỉ tăng rõ — cô đề nghị tiếp tục ôn từ vựng 10 phút mỗi tối.',
        bodyEn: 'This week: finished the Unit 1 review and practiced daily. Effort points are climbing — keep the 10-minute vocab habit each evening.',
      },
      {
        id: 'sum3', studentId: 's_UP2614', weekStart: new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10), status: 'approved',
        bodyVi: 'Linh nghe hiểu nhanh và phát biểu tự tin. Tuần này cần chú ý hơn ở phần chính tả — thầy đã gửi bài luyện thêm.',
        bodyEn: 'Linh listens well and speaks confidently. Spelling needs a little extra attention this week — extra practice assigned.',
      },
    ],
    messages: [
      { studentId: 's_UP1482', senderId: 'p0', senderName: 'Phụ huynh (demo)', body: 'Chào cô, tuần sau bé xin nghỉ thứ 3 vì về quê ạ. Có bài nào cần làm bù không cô?', at: new Date(Date.now() - 3_600_000).toISOString() },
    ],
  };
  // A week of attendance history for the demo child (Up 1 meets Mon-Wed):
  // present on class days except one absence, so the week view is honest.
  // Local dates throughout, so the dots label the right weekday.
  for (let back = 6; back >= 1; back--) {
    const d = new Date(Date.now() - back * 86_400_000);
    const dow = d.getDay();
    if ([1, 2, 3].includes(dow) && back !== 2) {
      const at = new Date(d);
      at.setHours(17, 28, 0, 0);
      db.attendance.push({ studentId: 's_UP1482', date: localDate(d), checkInAt: at.toISOString(), checkOutAt: null, releasedTo: null });
    }
  }
  return db;
}

function load(): DDB {
  const raw = store.get(KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DDB;
    } catch {
      /* reseed */
    }
  }
  const db = seed();
  store.set(KEY, JSON.stringify(db));
  return db;
}
function save(db: DDB): void {
  store.set(KEY, JSON.stringify(db));
}

export function resetDemo(): void {
  store.set(KEY, JSON.stringify(seed()));
}

// --- helpers ---
const actorOf = (u: DUser): Actor => ({ id: u.id, orgId: ORG, role: u.role as Actor['role'], siteId: u.role === 'owner' ? null : SITE });
const classRef = (c: DClass): ClassRef => ({ id: c.id, orgId: ORG, siteId: SITE, teacherId: c.teacherId });

function teacherName(db: DDB, id: string): string | null {
  return db.users.find((u) => u.id === id)?.name ?? null;
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();
// null = open question (writing): goes to the teacher's grading queue.
function grade(q: DQuestion, ans: unknown): number | null {
  const p = q.payload;
  if (q.type === 'write') return null;
  if (q.type === 'order') return norm(Array.isArray(ans) ? (ans as string[]).join(' ') : ans) === norm(p.answer) ? 1 : 0;
  return norm(ans) === norm(p.answer) ? 1 : 0;
}
function seededShuffle<T>(arr: T[], key: string): T[] {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Students receive API-shaped type names — the SAME names the real server
// serializes — so the shared Player renders identically in demo and prod.
const API_TYPE: Record<DQuestion['type'], string> = { mc: 'mc', fill: 'fill_blank', order: 'reorder', listen: 'listen_mc', write: 'picture' };
function serializeQuestion(q: DQuestion, seedKey: string) {
  const out: Record<string, unknown> = { id: q.id, type: API_TYPE[q.type], skill: q.skill, prompt: q.prompt, points: 1 };
  const p = q.payload;
  if (q.type === 'mc') out.options = seededShuffle(p.options as string[], seedKey + q.id);
  else if (q.type === 'listen') { out.options = seededShuffle(p.options as string[], seedKey + q.id); out.audioText = p.audioText; out.replayLimit = 2; }
  else if (q.type === 'fill') { out.sentence = p.sentence; out.choices = seededShuffle(p.choices as string[], seedKey + q.id); }
  else if (q.type === 'order') out.words = seededShuffle(p.words as string[], seedKey + q.id + 'w');
  else if (q.type === 'write') out.starters = (p.starters as string[]) ?? [];
  return out;
}

export interface DemoResponse {
  status: number;
  json: unknown;
}
const ok = (json: unknown): DemoResponse => ({ status: 200, json });
const err = (status: number, error: string): DemoResponse => ({ status, json: { error } });

// token format: demo:<userId>
function userFromToken(db: DDB, token: string | null): DUser | null {
  if (!token?.startsWith('demo:')) return null;
  return db.users.find((u) => u.id === token.slice(5)) ?? null;
}

export async function demoDispatch(method: string, path: string, body: unknown, token: string | null): Promise<DemoResponse> {
  const db = load();
  const [rawPath] = path.split('?');
  const seg = rawPath.split('/').filter(Boolean);
  const q = Object.fromEntries(new URLSearchParams(path.includes('?') ? path.slice(path.indexOf('?') + 1) : ''));
  const b = (body ?? {}) as Record<string, unknown>;
  const me = userFromToken(db, token);

  // ---- auth (no token needed) ----
  if (method === 'POST' && rawPath === '/auth/login-code') {
    const code = String(b.code ?? '').trim().toUpperCase();
    const u = db.users.find((x) => x.code === code && (x.role === 'student' || x.role === 'tutor'));
    if (!u) return err(401, 'invalid_code');
    return ok({ token: `demo:${u.id}`, user: { id: u.id, name: u.name, role: u.role } });
  }
  if (method === 'POST' && rawPath === '/auth/login') {
    const email = String(b.email ?? '').trim().toLowerCase();
    const u = db.users.find((x) => x.email === email);
    if (!u) return err(401, 'invalid_credentials');
    return ok({ token: `demo:${u.id}`, user: { id: u.id, name: u.name, role: u.role } });
  }

  // Parent self-registration with a one-time invite code (public route).
  if (method === 'POST' && rawPath === '/auth/register-parent') {
    const inviteCode = String(b.inviteCode ?? '').trim().toUpperCase();
    const name = String(b.name ?? '').trim();
    const email = String(b.email ?? '').trim().toLowerCase();
    if (!inviteCode || name.length < 2 || !email.includes('@') || String(b.password ?? '').length < 6) return err(400, 'invalid_input');
    const inv = db.invites.find((x) => x.code === inviteCode);
    if (!inv) return err(404, 'invalid_invite');
    if (inv.used) return err(409, 'invite_used');
    if (db.users.some((u) => u.email === email)) return err(409, 'email_taken');
    const u: DUser = { id: uid('p'), role: 'parent', name, email, classIds: [], childIds: [inv.studentId] };
    db.users.push(u);
    inv.used = true;
    save(db);
    return ok({ token: `demo:${u.id}`, user: { id: u.id, name: u.name, role: 'parent' } });
  }

  if (!me) return err(401, 'unauthenticated');
  const actor = actorOf(me);

  if (method === 'GET' && rawPath === '/me') {
    return ok({ id: me.id, name: me.name, role: me.role, orgId: ORG, siteId: actor.siteId, locale: 'vi', avatar: me.avatar ?? null });
  }

  if (method === 'POST' && rawPath === '/me/avatar') {
    const AVATARS = ['🦊', '🐼', '🐯', '🦄', '🐸', '🐰', '🐙', '🦖', '🐳', '🐝', '🐨', '🦁'];
    const avatar = String(b.avatar ?? '');
    if (!AVATARS.includes(avatar)) return err(400, 'invalid_input');
    me.avatar = avatar;
    save(db);
    return ok({ ok: true, avatar });
  }

  // ---------- Admin: teachers & classes (owner / academic director) ----------
  const isAdmin = me.role === 'owner' || me.role === 'academic_director';

  if (rawPath === '/admin/teachers') {
    if (!isAdmin) return err(403, 'forbidden');
    if (method === 'GET') {
      return ok(
        db.users.filter((u) => u.role === 'tutor').map((u) => ({
          id: u.id, name: u.name, email: u.email, loginCode: u.code,
          classCount: db.classes.filter((c) => c.teacherId === u.id).length,
        })),
      );
    }
    if (method === 'POST') {
      const name = String(b.name ?? '').trim();
      if (name.length < 2) return err(400, 'invalid_input');
      let code: string;
      do { code = `GV${String(Math.floor(rnd() * 9000) + 1000)}`; } while (db.users.some((u) => u.code === code));
      const u: DUser = { id: uid('t'), role: 'tutor', name, email: `${code.toLowerCase()}@gv.etop.local`, code, classIds: [], childIds: [] };
      db.users.push(u);
      save(db);
      return ok({ id: u.id, name: u.name, loginCode: code });
    }
  }

  if (rawPath === '/admin/classes' && method === 'POST') {
    if (!isAdmin) return err(403, 'forbidden');
    const name = String(b.name ?? '').trim();
    if (!name) return err(400, 'invalid_input');
    const teacherId = (b.teacherId as string) || '';
    if (teacherId && !db.users.some((u) => u.id === teacherId && u.role === 'tutor')) return err(400, 'unknown_teacher');
    const c: DClass = { id: uid('cls'), name, teacherId, scheduleNote: String(b.scheduleNote ?? ''), level: '' };
    db.classes.push(c);
    const teacher = db.users.find((u) => u.id === teacherId);
    if (teacher) teacher.classIds.push(c.id);
    save(db);
    return ok({ id: c.id, name: c.name });
  }

  if (seg[0] === 'admin' && seg[1] === 'classes' && seg[2] && method === 'PATCH') {
    if (!isAdmin) return err(403, 'forbidden');
    const c = db.classes.find((x) => x.id === seg[2]);
    if (!c) return err(404, 'not_found');
    if (b.name !== undefined) c.name = String(b.name).trim();
    if (b.scheduleNote !== undefined) c.scheduleNote = String(b.scheduleNote);
    if (b.teacherId !== undefined) {
      const nextId = (b.teacherId as string) || '';
      if (nextId && !db.users.some((u) => u.id === nextId && u.role === 'tutor')) return err(400, 'unknown_teacher');
      const prev = db.users.find((u) => u.id === c.teacherId);
      if (prev) prev.classIds = prev.classIds.filter((x) => x !== c.id);
      c.teacherId = nextId;
      const next = db.users.find((u) => u.id === nextId);
      if (next) next.classIds.push(c.id);
    }
    save(db);
    return ok({ ok: true });
  }

  // ---------- Teacher authoring: create a question in the bank ----------
  if (rawPath === '/questions' && method === 'POST') {
    if (!(me.role === 'tutor' || isAdmin)) return err(403, 'forbidden');
    const typeMap: Record<string, DQuestion['type']> = { mc: 'mc', fill_blank: 'fill', reorder: 'order', listen_mc: 'listen', picture: 'write' };
    const type = typeMap[String(b.type)];
    const payload = (b.payload ?? {}) as Record<string, unknown>;
    if (!type || !b.skill) return err(400, 'invalid_input');
    const q: DQuestion = {
      id: uid('q'),
      type,
      skill: b.skill as DQuestion['skill'],
      prompt: String(b.prompt ?? ''),
      payload,
      unit: String(b.unit ?? ''),
      ownerId: me.id,
      shared: false,
      sharedApproved: false,
    };
    db.questions.push(q);
    save(db);
    return ok({ id: q.id, copyrightNotice: 'Không tải lên tài liệu có bản quyền của nhà xuất bản.' });
  }

  // ---------- Parent invite (teacher of the student, or admin) ----------
  if (seg[0] === 'students' && seg[2] === 'invite' && method === 'POST') {
    const stu = db.users.find((u) => u.id === seg[1] && u.role === 'student');
    if (!stu) return err(404, 'not_found');
    const teaches = me.role === 'tutor' && stu.classIds.some((cid) => me.classIds.includes(cid));
    if (!teaches && !isAdmin) return err(403, 'forbidden');
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = 'PH-';
    for (let j = 0; j < 6; j++) code += alphabet[Math.floor(rnd() * alphabet.length)];
    db.invites.push({ code, studentId: stu.id, used: false });
    save(db);
    return ok({ inviteCode: code, studentName: stu.name });
  }

  if (rawPath === '/auth/change-password' && method === 'POST') return ok({ ok: true });

  // ---- classes ----
  if (method === 'GET' && rawPath === '/classes') {
    let list = db.classes;
    if (me.role === 'tutor') list = db.classes.filter((c) => c.teacherId === me.id);
    else if (me.role === 'student') list = db.classes.filter((c) => me.classIds.includes(c.id));
    else if (me.role === 'parent') {
      const childClassIds = new Set(db.users.filter((u) => me.childIds.includes(u.id)).flatMap((u) => u.classIds));
      list = db.classes.filter((c) => childClassIds.has(c.id));
    }
    return ok(list.map((c) => ({ id: c.id, name: c.name, level: c.level, teacherId: c.teacherId, teacherName: teacherName(db, c.teacherId), scheduleNote: c.scheduleNote })));
  }

  if (seg[0] === 'classes' && seg[1] && seg.length === 2 && method === 'GET') {
    const c = db.classes.find((x) => x.id === seg[1]);
    if (!c) return err(404, 'not_found');
    const isEnrolled = me.role === 'student' ? me.classIds.includes(c.id) : undefined;
    const isChildEnrolled = me.role === 'parent' ? db.users.some((u) => me.childIds.includes(u.id) && u.classIds.includes(c.id)) : undefined;
    if (!canViewClass(actor, classRef(c), { isEnrolled, isChildEnrolled })) return err(403, 'forbidden');
    const canSeeCodes = me.role === 'owner' || (me.role === 'tutor' && c.teacherId === me.id);
    const roster = db.users.filter((u) => u.role === 'student' && u.classIds.includes(c.id)).map((u) => ({ id: u.id, name: u.name, ...(canSeeCodes ? { loginCode: u.code } : {}) }));
    return ok({ id: c.id, name: c.name, teacherName: teacherName(db, c.teacherId), scheduleNote: c.scheduleNote, roster });
  }

  // ---- assignments under a class ----
  if (seg[0] === 'classes' && seg[2] === 'assignments') {
    const c = db.classes.find((x) => x.id === seg[1]);
    if (!c) return err(404, 'not_found');
    if (method === 'GET') {
      if (me.role === 'student') {
        if (!me.classIds.includes(c.id)) return err(403, 'forbidden');
        return ok(
          db.assignments.filter((a) => a.classId === c.id && a.status === 'published').map((a) => {
            const sub = db.submissions.find((s) => s.assignmentId === a.id && s.studentId === me.id);
            return {
              id: a.id, title: a.title, dueAt: a.dueAt,
              myStatus: sub?.status ?? null,
              myOverall: sub?.status === 'graded' ? sub.overall : null,
              myComment: sub?.status === 'graded' ? sub.comment ?? null : null,
            };
          }),
        );
      }
      if (!canTeachClass(actor, classRef(c))) return err(403, 'forbidden');
      const rosterCount = db.users.filter((u) => u.role === 'student' && u.classIds.includes(c.id)).length;
      return ok(
        db.assignments.filter((a) => a.classId === c.id).map((a) => {
          const subs = db.submissions.filter((s) => s.assignmentId === a.id && s.status !== 'in_progress');
          const scored = subs.filter((s) => s.overall != null);
          return {
            id: a.id, title: a.title, status: a.status, dueAt: a.dueAt,
            submittedCount: subs.length, rosterCount,
            avgOverall: scored.length ? Math.round(scored.reduce((t, s) => t + (s.overall ?? 0), 0) / scored.length) : null,
          };
        }),
      );
    }
    if (method === 'POST') {
      if (!canTeachClass(actor, classRef(c))) return err(403, 'forbidden');
      const ids = (b.questionIds as string[]) ?? [];
      if (!b.title || ids.length === 0) return err(400, 'invalid_input');
      const a: DAssignment = { id: uid('a'), classId: c.id, title: String(b.title), status: 'draft', questionIds: ids, dueAt: (b.dueAt as string) ?? null };
      db.assignments.push(a);
      save(db);
      return ok({ id: a.id, status: 'draft' });
    }
  }

  // ---- gradebook: real ETOP skill weighting (30/30/20/20) from domain ----
  if (seg[0] === 'classes' && seg[2] === 'gradebook' && method === 'GET') {
    const c = db.classes.find((x) => x.id === seg[1]);
    if (!c) return err(404, 'not_found');
    if (!canTeachClass(actor, classRef(c))) return err(403, 'forbidden');
    const students = db.users.filter((u) => u.role === 'student' && u.classIds.includes(c.id));
    return ok(
      students.map((stu) => {
        const agg: Partial<Record<SkillKey, SkillScore>> = {};
        const seenAssignments = new Set<string>();
        for (const s of db.submissions.filter((x) => x.studentId === stu.id && x.status === 'graded')) {
          const a = db.assignments.find((x) => x.id === s.assignmentId);
          if (!a || a.classId !== c.id || seenAssignments.has(a.id)) continue; // one attempt per assignment
          seenAssignments.add(a.id);
          for (const qid of a.questionIds) {
            const qq = db.questions.find((x) => x.id === qid)!;
            const g = grade(qq, s.answers[qid]);
            const t = (agg[qq.skill] ??= { earned: 0, possible: 0 });
            t.possible += 1;
            t.earned += g === null ? s.rubricFrac ?? 0 : g; // write: the rubric fraction, not the whole-paper overall
          }
        }
        return { studentId: stu.id, name: stu.name, overall: weightedOverall(agg), skills: agg };
      }),
    );
  }

  // ---- session log: after-class note straight to the parent's digest ----
  if (seg[0] === 'classes' && seg[2] === 'session-log' && method === 'POST') {
    const c = db.classes.find((x) => x.id === seg[1]);
    if (!c) return err(404, 'not_found');
    if (!canTeachClass(actor, classRef(c))) return err(403, 'forbidden');
    const entries = (b.entries ?? []) as { studentId: string; parentNote?: string }[];
    if (entries.length === 0) return err(400, 'invalid_input');
    for (const e of entries) {
      const stu = db.users.find((u) => u.id === e.studentId && u.role === 'student' && u.classIds.includes(c.id));
      if (!stu) return err(400, 'student_not_in_class');
      if (e.parentNote?.trim()) {
        db.sessionNotes.push({ studentId: stu.id, date: today(), className: c.name, tutorName: me.name, parentNote: e.parentNote.trim() });
      }
    }
    save(db);
    return ok({ ok: true, logged: entries.length });
  }

  // ---- roster import / join requests ----
  if (seg[0] === 'classes' && seg[2] === 'students' && method === 'POST') {
    const c = db.classes.find((x) => x.id === seg[1]);
    if (!c) return err(404, 'not_found');
    if (!canTeachClass(actor, classRef(c))) return err(403, 'forbidden');
    const names = (b.names as string[]) ?? [];
    const pairs = (b.students as { name: string; code?: string }[]) ?? [];
    const entries = [...names.map((n) => ({ name: n, code: undefined as string | undefined })), ...pairs];
    if (entries.length === 0) return err(400, 'invalid_input');
    const created = [];
    for (const e of entries) {
      let code = e.code?.toUpperCase();
      if (code && db.users.some((u) => u.code === code)) return err(409, 'code_taken');
      if (!code) { do { code = `HV${String(Math.floor(rnd() * 9000) + 1000)}`; } while (db.users.some((u) => u.code === code)); }
      const u: DUser = { id: uid('s'), role: 'student', name: e.name.trim(), email: `${code.toLowerCase()}@hv.etop.local`, code, classIds: [c.id], childIds: [] };
      db.users.push(u);
      created.push({ id: u.id, name: u.name, loginCode: code });
    }
    save(db);
    return ok({ created });
  }
  if (seg[0] === 'classes' && seg[2] === 'join-requests' && method === 'GET') {
    const c = db.classes.find((x) => x.id === seg[1]);
    if (!c || !canTeachClass(actor, classRef(c))) return err(c ? 403 : 404, c ? 'forbidden' : 'not_found');
    return ok(db.joinRequests.filter((j) => j.classId === c.id).map((j) => ({ id: j.id, studentId: j.studentId, name: db.users.find((u) => u.id === j.studentId)?.name })));
  }
  if (rawPath === '/classes/join' && method === 'POST') {
    if (me.role !== 'student') return err(403, 'students_only');
    const code = String(b.code ?? '').trim().toUpperCase();
    // Demo: classes don't carry join codes; accept the class id as the code for simplicity.
    const c = db.classes.find((x) => x.id.toUpperCase() === code || x.name.toUpperCase() === code);
    if (!c) return err(404, 'invalid_code');
    if (me.classIds.includes(c.id)) return err(409, 'already_enrolled');
    db.joinRequests.push({ id: uid('jr'), classId: c.id, studentId: me.id });
    save(db);
    return ok({ status: 'pending', className: c.name });
  }
  if (seg[0] === 'join-requests' && seg[2] === 'decide' && method === 'POST') {
    const jr = db.joinRequests.find((j) => j.id === seg[1]);
    if (!jr) return err(404, 'not_found');
    const c = db.classes.find((x) => x.id === jr.classId)!;
    if (!canTeachClass(actor, classRef(c))) return err(403, 'forbidden');
    if (b.approve) {
      const stu = db.users.find((u) => u.id === jr.studentId);
      if (stu && !stu.classIds.includes(jr.classId)) stu.classIds.push(jr.classId);
    }
    db.joinRequests = db.joinRequests.filter((j) => j.id !== jr.id);
    save(db);
    return ok({ ok: true });
  }
  if (seg[0] === 'students' && seg[2] === 'rotate-code' && method === 'POST') {
    const stu = db.users.find((u) => u.id === seg[1] && u.role === 'student');
    if (!stu) return err(404, 'not_found');
    // Only the child's teacher or a manager may rotate — the response
    // contains the new login code (account takeover otherwise).
    const teaches = me.role === 'tutor' && stu.classIds.some((cid) => me.classIds.includes(cid));
    if (!teaches && !isAdmin) return err(403, 'forbidden');
    let code: string;
    do { code = `HV${String(Math.floor(rnd() * 9000) + 1000)}`; } while (db.users.some((u) => u.code === code));
    stu.code = code;
    save(db);
    return ok({ loginCode: code });
  }

  if (rawPath === '/questions' && method === 'GET') {
    if (!(me.role === 'tutor' || isAdmin)) return err(403, 'forbidden'); // bank is teacher material
    return ok(
      db.questions
        .filter((qq) => isAdmin || qq.ownerId === me.id || (qq.shared && qq.sharedApproved))
        .map((qq) => ({ id: qq.id, type: qq.type, skill: qq.skill, prompt: qq.prompt, unit: qq.unit, ownerId: qq.ownerId ?? null, shared: !!qq.shared, sharedApproved: !!qq.sharedApproved })),
    );
  }

  // ---- shared bank: offer / approve ----
  if (seg[0] === 'questions' && seg[2] === 'share' && method === 'POST') {
    const qq = db.questions.find((x) => x.id === seg[1]);
    if (!qq) return err(404, 'not_found');
    if (qq.ownerId !== me.id && !isAdmin) return err(403, 'forbidden');
    qq.shared = true;
    qq.sharedApproved = isAdmin; // managers' shares go live immediately
    save(db);
    return ok({ ok: true, pendingApproval: !isAdmin });
  }
  if (rawPath === '/questions/pending-shares' && method === 'GET') {
    if (!isAdmin) return err(403, 'forbidden');
    return ok(
      db.questions
        .filter((qq) => qq.shared && !qq.sharedApproved)
        .map((qq) => ({ id: qq.id, type: qq.type, skill: qq.skill, unit: qq.unit, prompt: qq.prompt, ownerName: db.users.find((u) => u.id === qq.ownerId)?.name ?? '—' })),
    );
  }
  if (seg[0] === 'questions' && seg[2] === 'approve-share' && method === 'POST') {
    if (!isAdmin) return err(403, 'forbidden');
    const qq = db.questions.find((x) => x.id === seg[1]);
    if (!qq) return err(404, 'not_found');
    qq.sharedApproved = true;
    save(db);
    return ok({ ok: true });
  }

  // ---- assignment lifecycle ----
  if (seg[0] === 'assignments' && seg[1] && seg.length === 2 && method === 'GET') {
    const a = db.assignments.find((x) => x.id === seg[1]);
    if (!a) return err(404, 'not_found');
    const c = db.classes.find((x) => x.id === a.classId)!;
    if (canTeachClass(actor, classRef(c))) {
      return ok({ id: a.id, title: a.title, instructions: '', dueAt: a.dueAt, questions: a.questionIds.map((qid) => db.questions.find((qq) => qq.id === qid)) });
    }
    // Part C isolation: a student must be enrolled in this class.
    if (me.role === 'student' && a.status === 'published' && me.classIds.includes(a.classId)) {
      return ok({
        id: a.id, title: a.title, instructions: '', dueAt: a.dueAt,
        questions: a.questionIds.map((qid) => serializeQuestion(db.questions.find((qq) => qq.id === qid)!, `${a.id}:${me.id}`)),
      });
    }
    return err(403, 'forbidden');
  }
  if (seg[0] === 'assignments' && seg[2] === 'publish' && method === 'POST') {
    const a = db.assignments.find((x) => x.id === seg[1]);
    if (!a) return err(404, 'not_found');
    const c = db.classes.find((x) => x.id === a.classId)!;
    if (!canTeachClass(actor, classRef(c))) return err(403, 'forbidden');
    a.status = 'published';
    save(db);
    return ok({ ok: true });
  }
  if (seg[0] === 'assignments' && seg[2] === 'start' && method === 'POST') {
    const a = db.assignments.find((x) => x.id === seg[1]);
    if (!a || me.role !== 'student' || a.status !== 'published' || !me.classIds.includes(a.classId)) return err(403, 'forbidden');
    // One submission per (assignment, student): reopening a finished paper
    // resumes it instead of minting duplicates that inflate class stats.
    let s = db.submissions.find((x) => x.assignmentId === a.id && x.studentId === me.id);
    if (!s) {
      s = { id: uid('sub'), assignmentId: a.id, studentId: me.id, answers: {}, status: 'in_progress', overall: null, pendingReview: false };
      db.submissions.push(s);
      save(db);
    }
    return ok({ submissionId: s.id, resumed: s.status !== 'in_progress' });
  }
  if (seg[0] === 'submissions' && seg[2] === 'answers' && method === 'PATCH') {
    const s = db.submissions.find((x) => x.id === seg[1] && x.studentId === me.id);
    if (!s) return err(404, 'not_found');
    if (s.status !== 'in_progress') return ok({ ok: true }); // finished paper: edits are ignored
    s.answers = { ...s.answers, ...((b.answers as object) ?? {}) };
    save(db);
    return ok({ ok: true });
  }
  if (seg[0] === 'submissions' && seg[2] === 'submit' && method === 'POST') {
    const s = db.submissions.find((x) => x.id === seg[1] && x.studentId === me.id);
    if (!s) return err(404, 'not_found');
    // Idempotent: resubmitting a finished paper just returns the result.
    if (s.status !== 'in_progress') {
      return ok({ status: s.status, late: false, ...(s.pendingReview ? {} : { overall: s.overall }), pendingReview: s.pendingReview });
    }
    const a = db.assignments.find((x) => x.id === s.assignmentId)!;
    let earned = 0;
    let possible = 0;
    let pending = false;
    for (const qid of a.questionIds) {
      const qq = db.questions.find((x) => x.id === qid)!;
      const g = grade(qq, s.answers[qid]);
      if (g === null) { pending = true; continue; } // writing → teacher grades
      possible++;
      earned += g;
    }
    s.status = pending ? 'submitted' : 'graded';
    s.pendingReview = pending;
    s.overall = pending ? null : possible ? Math.round((earned / possible) * 1000) / 10 : 0;
    save(db);
    return ok({ status: s.status, late: false, autoPoints: earned, autoPossible: possible, ...(pending ? {} : { overall: s.overall }), pendingReview: pending });
  }
  if (seg[0] === 'assignments' && seg[2] === 'status' && method === 'GET') {
    const a = db.assignments.find((x) => x.id === seg[1]);
    if (!a) return err(404, 'not_found');
    const c = db.classes.find((x) => x.id === a.classId)!;
    if (!canTeachClass(actor, classRef(c))) return err(403, 'forbidden');
    const roster = db.users.filter((u) => u.role === 'student' && u.classIds.includes(a.classId));
    return ok(
      roster.map((u) => {
        const s = db.submissions.find((x) => x.assignmentId === a.id && x.studentId === u.id);
        return { studentId: u.id, name: u.name, status: s?.status ?? 'not_started', overall: s?.overall ?? null };
      }),
    );
  }

  // ---------- Teacher grading queue (writing questions) ----------
  if (rawPath === '/grading/queue' && method === 'GET') {
    if (!(me.role === 'tutor' || isAdmin)) return err(403, 'forbidden');
    return ok(
      db.submissions
        .filter((s) => s.pendingReview)
        .filter((s) => {
          const a = db.assignments.find((x) => x.id === s.assignmentId);
          const c = a && db.classes.find((x) => x.id === a.classId);
          return !!c && (isAdmin || c.teacherId === me.id);
        })
        .map((s) => {
          const a = db.assignments.find((x) => x.id === s.assignmentId)!;
          const stu = db.users.find((u) => u.id === s.studentId)!;
          const writeQ = a.questionIds.map((qid) => db.questions.find((x) => x.id === qid)!).find((qq) => qq.type === 'write');
          return { id: s.id, studentName: stu.name, title: a.title, answerText: String(s.answers[writeQ?.id ?? ''] ?? '') };
        }),
    );
  }

  if (seg[0] === 'submissions' && seg[2] === 'grade' && method === 'POST') {
    if (!(me.role === 'tutor' || isAdmin)) return err(403, 'forbidden');
    const s = db.submissions.find((x) => x.id === seg[1]);
    if (!s) return err(404, 'not_found');
    const a = db.assignments.find((x) => x.id === s.assignmentId)!;
    const c = db.classes.find((x) => x.id === a.classId)!;
    if (!isAdmin && c.teacherId !== me.id) return err(403, 'forbidden');

    // Rubric 0-2 × 3 criteria → each writing question worth 1 point.
    const r = (b.rubric ?? {}) as Record<string, number>;
    const rubricFrac = Math.max(0, Math.min(6, (r.accuracy ?? 0) + (r.vocabulary ?? 0) + (r.structure ?? 0))) / 6;
    let earned = 0;
    let possible = 0;
    for (const qid of a.questionIds) {
      const qq = db.questions.find((x) => x.id === qid)!;
      possible++;
      const g = grade(qq, s.answers[qid]);
      earned += g === null ? rubricFrac : g;
    }
    s.overall = possible ? Math.round((earned / possible) * 1000) / 10 : 0;
    s.status = 'graded';
    s.pendingReview = false;
    s.comment = String(b.comment ?? '').trim();
    s.rubricFrac = rubricFrac;
    save(db);
    return ok({ ok: true, overall: s.overall });
  }
  if (rawPath === '/summaries/queue' && method === 'GET') {
    if (!(me.role === 'tutor' || isAdmin)) return err(403, 'forbidden');
    return ok(
      db.summaries
        .filter((s) => s.status === 'draft')
        .filter((s) => {
          const stu = db.users.find((u) => u.id === s.studentId);
          return !!stu && (isAdmin || stu.classIds.some((cid) => me.classIds.includes(cid)));
        })
        .map((s) => ({ id: s.id, studentName: db.users.find((u) => u.id === s.studentId)?.name ?? '—', bodyVi: s.bodyVi, bodyEn: s.bodyEn })),
    );
  }
  if (seg[0] === 'summaries' && seg[2] === 'approve' && method === 'POST') {
    if (!(me.role === 'tutor' || isAdmin)) return err(403, 'forbidden');
    const s = db.summaries.find((x) => x.id === seg[1]);
    if (!s) return err(404, 'not_found');
    const stu = db.users.find((u) => u.id === s.studentId)!;
    if (!isAdmin && !stu.classIds.some((cid) => me.classIds.includes(cid))) return err(403, 'forbidden');
    s.status = 'approved';
    save(db);
    return ok({ ok: true });
  }

  // ---- practice & achievements ----
  if (rawPath === '/practice/events' && method === 'POST') {
    if (me.role !== 'student') return err(403, 'students_only');
    const pts = Number(b.points ?? 0);
    if (!(pts >= 1 && pts <= 50)) return err(400, 'invalid_input');
    const d = (b.detail ?? {}) as { lessonId?: string; pct?: number };
    db.practice.push({ studentId: me.id, kind: String(b.kind), points: pts, date: today(), lessonId: d.lessonId, pct: d.pct });
    save(db);
    return ok({ ok: true });
  }
  if (rawPath === '/my/practice/lessons' && method === 'GET') {
    if (me.role !== 'student') return err(403, 'students_only');
    const byLesson = new Map<string, number>();
    for (const p of db.practice) if (p.studentId === me.id && p.lessonId) byLesson.set(p.lessonId, Math.max(byLesson.get(p.lessonId) ?? 0, p.pct ?? 0));
    return ok([...byLesson].map(([lessonId, bestPct]) => ({ lessonId, bestPct })));
  }
  if (rawPath === '/my/achievements' && method === 'GET') {
    const sid = me.role === 'parent' ? (q.childId as string) : me.id;
    if (me.role === 'parent' && !me.childIds.includes(sid)) return err(403, 'forbidden');
    if (me.role !== 'parent' && me.role !== 'student') return err(403, 'forbidden');
    const evs = db.practice.filter((p) => p.studentId === sid);
    const points = evs.reduce((s, p) => s + p.points, 0);
    const days = new Set(evs.map((p) => p.date));
    let streak = 0;
    const cur = new Date();
    // localDate throughout — events are stored with local dates too.
    if (!days.has(localDate(cur))) cur.setDate(cur.getDate() - 1);
    while (days.has(localDate(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
    const submissions = db.submissions.filter((s) => s.studentId === sid && s.status !== 'in_progress').length;
    const badges = [
      { id: 'first-steps', earned: days.size >= 1 },
      { id: 'streak-3', earned: streak >= 3 },
      { id: 'streak-7', earned: streak >= 7 },
      { id: 'points-50', earned: points >= 50 },
      { id: 'points-200', earned: points >= 200 },
      { id: 'homework-hero', earned: submissions >= 5 },
    ];
    const pointsToday = evs.filter((p) => p.date === today()).reduce((s, p) => s + p.points, 0);
    return ok({ points, pointsToday, streak, practiceDays: days.size, submissions, badges });
  }

  // ---------- Announcements (Bảng tin) ----------
  if (rawPath === '/announcements' && method === 'POST') {
    const title = String(b.title ?? '').trim();
    if (title.length < 2) return err(400, 'invalid_input');
    const classId = (b.classId as string) || null;
    if (classId) {
      const c = db.classes.find((x) => x.id === classId);
      if (!c) return err(404, 'not_found');
      if (!isAdmin && !(me.role === 'tutor' && c.teacherId === me.id)) return err(403, 'forbidden');
    } else if (!isAdmin) {
      return err(403, 'forbidden'); // center-wide is managers-only
    }
    db.announcements.unshift({ id: uid('ann'), classId, authorName: me.name, title, body: String(b.body ?? '').trim(), createdAt: new Date().toISOString() });
    save(db);
    return ok({ id: db.announcements[0].id });
  }

  if (rawPath === '/announcements' && method === 'GET') {
    let scope: (a: DAnnouncement) => boolean;
    if (me.role === 'student') scope = (a) => a.classId === null || me.classIds.includes(a.classId);
    else if (me.role === 'parent') {
      const kidClasses = new Set(db.users.filter((u) => me.childIds.includes(u.id)).flatMap((u) => u.classIds));
      scope = (a) => a.classId === null || kidClasses.has(a.classId);
    } else if (me.role === 'tutor') scope = (a) => a.classId === null || me.classIds.includes(a.classId);
    else scope = () => true;
    return ok(
      db.announcements.filter(scope).slice(0, 20).map((a) => ({
        id: a.id, classId: a.classId, className: a.classId ? db.classes.find((c) => c.id === a.classId)?.name ?? null : null,
        authorName: a.authorName, title: a.title, body: a.body, createdAt: a.createdAt,
      })),
    );
  }

  // Class leaderboard: effort points only — never grades.
  if (seg[0] === 'classes' && seg[2] === 'leaderboard' && method === 'GET') {
    const c = db.classes.find((x) => x.id === seg[1]);
    if (!c) return err(404, 'not_found');
    const enrolled = me.role === 'student' && me.classIds.includes(c.id);
    const childEnrolled = me.role === 'parent' && db.users.some((u) => me.childIds.includes(u.id) && u.classIds.includes(c.id));
    const staff = isAdmin || (me.role === 'tutor' && c.teacherId === me.id);
    if (!enrolled && !childEnrolled && !staff) return err(403, 'forbidden');
    return ok(
      db.users
        .filter((u) => u.role === 'student' && u.classIds.includes(c.id))
        .map((u) => ({ id: u.id, name: u.name, avatar: u.avatar ?? null, points: db.practice.filter((p) => p.studentId === u.id).reduce((s, p) => s + p.points, 0) }))
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
        .slice(0, 20),
    );
  }

  // ---- parent (basic) ----
  if (rawPath === '/parents/children' && method === 'GET') {
    if (me.role !== 'parent') return err(403, 'forbidden');
    return ok(db.users.filter((u) => me.childIds.includes(u.id)).map((u) => ({ id: u.id, name: u.name, classes: db.classes.filter((c) => u.classIds.includes(c.id)).map((c) => ({ id: c.id, name: c.name })) })));
  }
  if (rawPath === '/parents/digest' && method === 'GET') {
    if (me.role !== 'parent') return err(403, 'forbidden');
    // Live attendance: what the front desk taps shows up here immediately.
    const childId = (q.childId as string) || me.childIds[0];
    if (!me.childIds.includes(childId)) return err(403, 'forbidden');
    const att = db.attendance.find((x) => x.studentId === childId && x.date === today()) ?? null;
    const childPts = db.practice.filter((p) => p.studentId === childId && p.date === today()).reduce((s, p) => s + p.points, 0);
    return ok({
      date: today(),
      attendance: att ? { checkInAt: att.checkInAt, checkOutAt: att.checkOutAt, releasedTo: att.releasedTo } : null,
      sessions: db.sessionNotes
        .filter((s) => s.studentId === childId && s.date === today() && s.parentNote)
        .map((s) => ({ className: s.className, tutorName: s.tutorName, parentNote: s.parentNote })),
      newAssignments: db.assignments
        .filter((a) => a.status === 'published' && (db.users.find((u) => u.id === childId)?.classIds ?? []).includes(a.classId))
        .slice(0, 2)
        .map((a) => ({ title: a.title })),
      graded: db.submissions
        .filter((s) => s.studentId === childId && s.status === 'graded' && s.overall != null)
        .slice(0, 2)
        .map((s) => ({ title: db.assignments.find((a) => a.id === s.assignmentId)?.title ?? 'Bài tập', overall: s.overall })),
      practice: { points: childPts, activities: 1 },
    });
  }
  if (rawPath === '/parents/attendance-week' && method === 'GET') {
    if (me.role !== 'parent') return err(403, 'forbidden');
    const childId = (q.childId as string) || me.childIds[0];
    if (!me.childIds.includes(childId)) return err(403, 'forbidden');
    return ok(
      Array.from({ length: 7 }, (_, i) => {
        const d = localDate(new Date(Date.now() - (6 - i) * 86_400_000));
        return { date: d, attended: db.attendance.some((a) => a.studentId === childId && a.date === d && a.checkInAt) };
      }),
    );
  }

  if (rawPath === '/parents/summaries' && method === 'GET') {
    if (me.role !== 'parent') return err(403, 'forbidden');
    const childId = (q.childId as string) || me.childIds[0];
    if (!me.childIds.includes(childId)) return err(403, 'forbidden');
    return ok(
      db.summaries
        .filter((s) => s.studentId === childId && s.status === 'approved')
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
        .map((s) => ({ weekStart: s.weekStart, bodyVi: s.bodyVi, bodyEn: s.bodyEn })),
    );
  }
  if (rawPath === '/my/invoices' && method === 'GET') {
    if (me.role !== 'parent') return err(403, 'forbidden');
    return ok([{ id: 'inv_demo', period: today().slice(0, 7), studentName: 'Nguyễn Gia Bảo', totalVnd: 1350000, status: 'open', vietqr: 'VIETQR|ETOP|inv_demo|1350000|HOC PHI ETOP' }]);
  }
  // ---- two-way messaging, threaded per student ----
  const canUseThread = (studentId: string): boolean => {
    const stu = db.users.find((u) => u.id === studentId && u.role === 'student');
    if (!stu) return false;
    if (isAdmin) return true;
    if (me.role === 'parent') return me.childIds.includes(studentId);
    if (me.role === 'tutor') return stu.classIds.some((cid) => me.classIds.includes(cid));
    return false;
  };
  if (rawPath === '/threads' && method === 'POST') {
    const studentId = String(b.studentId ?? '');
    if (!canUseThread(studentId)) return err(403, 'forbidden');
    return ok({ threadId: `th_${studentId}`, existing: true });
  }
  if (rawPath === '/threads' && method === 'GET') {
    // Teacher inbox: one thread per student with messages.
    if (!(me.role === 'tutor' || isAdmin)) return err(403, 'forbidden');
    const byStudent = new Map<string, { body: string; at: string; senderName: string }>();
    for (const m of db.messages) {
      if (!canUseThread(m.studentId)) continue;
      const cur = byStudent.get(m.studentId);
      if (!cur || m.at > cur.at) byStudent.set(m.studentId, { body: m.body, at: m.at, senderName: m.senderName });
    }
    return ok(
      [...byStudent.entries()]
        .sort((a, b2) => b2[1].at.localeCompare(a[1].at))
        .map(([studentId, last]) => ({
          threadId: `th_${studentId}`,
          studentName: db.users.find((u) => u.id === studentId)?.name ?? '—',
          lastBody: last.body,
          lastFrom: last.senderName,
          lastAt: last.at,
        })),
    );
  }
  if (seg[0] === 'threads' && seg[2] === 'messages') {
    const studentId = seg[1].replace(/^th_/, '');
    if (!canUseThread(studentId)) return err(403, 'forbidden');
    if (method === 'POST') {
      const body2 = String(b.body ?? '').trim();
      if (!body2) return err(400, 'invalid_input');
      db.messages.push({ studentId, senderId: me.id, senderName: me.name, body: body2, at: new Date().toISOString() });
      save(db);
      return ok({ ok: true });
    }
    return ok(db.messages.filter((m) => m.studentId === studentId).map((m) => ({ senderName: m.senderName, body: m.body, at: m.at })));
  }

  // ---- owner dashboard (basic, computed) ----
  if (rawPath === '/billing/dashboard' && method === 'GET') {
    if (!['owner', 'academic_director'].includes(me.role)) return err(403, 'forbidden');
    // Six months of history so the revenue trend chart has a story.
    const base = [21_600_000, 22_950_000, 24_300_000, 23_650_000, 25_650_000, 27_000_000];
    const nowD = new Date();
    const revenue = base.map((v, i) => {
      const d = new Date(nowD.getFullYear(), nowD.getMonth() - (base.length - 1 - i), 1);
      return { period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, revenueVnd: v };
    });
    return ok({ revenue, arAging: [{ bucket: 'current', outstandingVnd: 4050000, invoices: 3 }] });
  }
  if (rawPath === '/nps' && method === 'POST') {
    if (me.role !== 'parent') return err(403, 'parents_only');
    const score = Number(b.score);
    const term = String(b.term ?? '').trim();
    if (!(score >= 0 && score <= 10) || term.length < 3) return err(400, 'invalid_input');
    if (db.nps.some((r) => r.userId === me.id && r.term === term)) return err(409, 'already_responded');
    db.nps.push({ userId: me.id, term, score, comment: String(b.comment ?? '').trim() });
    save(db);
    return ok({ ok: true });
  }
  if (rawPath === '/nps/summary' && method === 'GET') {
    if (!['owner', 'academic_director'].includes(me.role)) return err(403, 'forbidden');
    const n = db.nps.length;
    const promoters = db.nps.filter((r) => r.score >= 9).length;
    const detractors = db.nps.filter((r) => r.score <= 6).length;
    return ok({ responses: n, nps: n ? Math.round(((promoters - detractors) / n) * 100) : null, comments: db.nps.filter((r) => r.comment).map((r) => r.comment).slice(0, 20) });
  }
  if (rawPath === '/academic/dashboard' && method === 'GET') {
    if (!['owner', 'academic_director'].includes(me.role)) return err(403, 'forbidden');
    const deltas = [0.18, 0.12, 0.09, 0.15];
    return ok({ stalled: [], velocity: db.users.filter((u) => u.role === 'tutor').slice(0, 4).map((u, i) => ({ tutorName: u.name, avgDelta: deltas[i % deltas.length] })) });
  }
  if (seg[0] === 'escalations' && method === 'GET') return ok([]);

  // ---------- Kiosk: attendance, offline sync, verified dismissal ----------
  const staffish = ['front_desk', 'owner', 'academic_director'].includes(me.role);
  const attendOf = (studentId: string): DAttend => {
    let a = db.attendance.find((x) => x.studentId === studentId && x.date === today());
    if (!a) {
      a = { studentId, date: today(), checkInAt: null, checkOutAt: null, releasedTo: null };
      db.attendance.push(a);
    }
    return a;
  };
  const statusOf = (studentId: string): string => {
    const a = db.attendance.find((x) => x.studentId === studentId && x.date === today());
    if (a?.checkOutAt) return 'released';
    if (a?.checkInAt) return 'present';
    return 'expected';
  };

  if (rawPath === '/attendance/today' && method === 'GET') {
    if (!staffish) return err(403, 'forbidden');
    return ok(
      db.users.filter((u) => u.role === 'student').map((u) => ({
        id: u.id,
        name: u.name,
        className: db.classes.find((c) => u.classIds.includes(c.id))?.name ?? '—',
        status: statusOf(u.id),
      })),
    );
  }

  if (rawPath === '/kiosk/sync' && method === 'POST') {
    if (!staffish) return err(403, 'forbidden');
    const events = (b.events ?? []) as { clientEventId: string; type: string; studentId: string; at: string; releasedToName?: string }[];
    for (const ev of events) {
      if (!ev.clientEventId || db.syncedEvents.includes(ev.clientEventId)) continue; // idempotent
      db.syncedEvents.push(ev.clientEventId);
      const a = attendOf(ev.studentId);
      if (ev.type === 'check_in' && !a.checkInAt) a.checkInAt = ev.at;
      if (ev.type === 'check_out' && !a.checkOutAt) {
        a.checkOutAt = ev.at;
        a.releasedTo = ev.releasedToName ?? 'Người đón (ngoại tuyến)';
      }
    }
    save(db);
    return ok({ accepted: events.length });
  }

  if (seg[0] === 'students' && seg[2] === 'pickups' && method === 'GET') {
    if (!staffish) return err(403, 'forbidden');
    return ok(db.pickups.filter((p) => p.studentId === seg[1]).map((p) => ({ id: p.id, name: p.name, relation: p.relation, blocked: p.blocked })));
  }

  if (rawPath === '/attendance/dismiss' && method === 'POST') {
    if (!staffish) return err(403, 'forbidden');
    const p = db.pickups.find((x) => x.id === b.pickupPersonId && x.studentId === b.studentId);
    if (!p) return err(404, 'not_found');
    if (p.blocked) return { status: 403, json: { error: 'forbidden', reason: 'blocked_pickup' } };
    if (p.pin !== String(b.pin ?? '')) return { status: 403, json: { error: 'forbidden', reason: 'pin_invalid' } };
    const a = attendOf(String(b.studentId));
    a.checkOutAt = String(b.at ?? new Date().toISOString());
    a.releasedTo = p.name;
    save(db);
    return ok({ ok: true });
  }

  // Unknown demo route → empty, so the UI degrades gracefully.
  return ok([]);
}
