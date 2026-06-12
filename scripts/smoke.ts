// Sanity checks for the seeded demo database. Run: npx tsx scripts/smoke.ts
import { buildSeed } from '../src/seed';
import { avgPct, earnedBadges, leaderboard, pointsOf, scoresOf, streakOf } from '../src/lib';

const db = buildSeed();
const fail: string[] = [];
const check = (cond: boolean, msg: string) => { if (!cond) fail.push(msg); };

const students = db.users.filter((u) => u.role === 'student');
check(students.length === 40, `expected 40 students, got ${students.length}`);
check(db.classes.length === 6, `expected 6 classes, got ${db.classes.length}`);
check(db.users.some((u) => u.email === 'minh@etop.vn'), 'demo student missing');
check(db.users.some((u) => u.email === 'zhao@etop.vn' && u.role === 'admin'), 'owner missing');
check(db.users.some((u) => u.email === 'phuhuynh@etop.vn' && u.childIds.includes('s0')), 'parent link missing');

// every student belongs to exactly one existing class
for (const s of students) {
  check(s.classIds.length === 1 && db.classes.some((c) => c.id === s.classIds[0]), `bad class for ${s.id}`);
}

// every score references a real assessment + student in that class
for (const sc of db.scores) {
  const a = db.assessments.find((x) => x.id === sc.assessmentId);
  check(!!a, `orphan score ${sc.id}`);
  check(sc.score >= 0 && sc.score <= (a?.maxScore ?? 10), `score out of range: ${sc.id}`);
  const st = db.users.find((u) => u.id === sc.studentId);
  check(!!st && st.classIds.includes(a!.classId), `score for student not in class: ${sc.id}`);
}

// every class has assessments, homework, and at least one vocab list
for (const c of db.classes) {
  check(db.assessments.some((a) => a.classId === c.id), `no assessments for ${c.id}`);
  check(db.homework.some((h) => h.classId === c.id), `no homework for ${c.id}`);
  check(db.vocabLists.some((v) => v.classId === c.id), `no vocab for ${c.id}`);
}

// demo student: full history, live streak, earned badges, leaderboard presence
check(scoresOf(db, 's0').length === 6, `minh should have 6 scores, got ${scoresOf(db, 's0').length}`);
check(streakOf(db, 's0') >= 4, `minh streak should be >= 4, got ${streakOf(db, 's0')}`);
check(pointsOf(db, 's0') > 0, 'minh has no points');
check((avgPct(db, 's0') ?? 0) > 50, 'minh average suspiciously low');
check(earnedBadges(db, 's0').length >= 3, `minh should have >=3 badges, got ${earnedBadges(db, 's0').length}`);
check(leaderboard(db, 'c4').some((r) => r.user.id === 's0'), 'minh missing from class leaderboard');

// feedback entries reference real users with valid ratings
check(db.feedback.length >= 2, 'expected seeded feedback');
for (const f of db.feedback) {
  check(db.users.some((u) => u.id === f.userId), `feedback from unknown user: ${f.id}`);
  check(f.rating >= 1 && f.rating <= 5, `bad rating: ${f.id}`);
}

if (fail.length) {
  console.error('SMOKE FAILED:\n' + fail.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
console.log(`SMOKE OK — ${students.length} students, ${db.scores.length} scores, ${db.homework.length} homework, ${db.vocabLists.length} vocab lists, ${db.practice.length} practice events`);
