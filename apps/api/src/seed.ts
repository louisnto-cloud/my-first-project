import { hashPassword } from './auth.js';
import { type DB, one } from './db.js';

// Phase 1 demo tenant. Grows toward the full Part B demo tenant
// (250 students, medical/custody/learning profiles) phase by phase.

const STUDENT_NAMES = [
  'Trần Đức Minh', 'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Châu', 'Phạm Quốc Đạt',
  'Hoàng Thảo My', 'Vũ Gia Hân', 'Đặng Hoài Nam', 'Bùi Khánh Linh', 'Đỗ Mạnh Hùng',
  'Ngô Thanh Mai', 'Dương Minh Quân', 'Lý Thu Ngân', 'Trịnh Văn Phúc', 'Mai Xuân Quỳnh',
  'Cao Bảo Sơn', 'Đinh Thúy Trang', 'Lâm Tuấn Tú', 'Phan Hải Uyên', 'Võ Đình Vinh',
  'Tạ Yến Vy', 'Nguyễn Hữu Khoa', 'Trần Bảo Ngọc', 'Lê Thành Long', 'Phạm Diễm My',
  'Hoàng Anh Tuấn', 'Vũ Ngọc Ánh', 'Đặng Quang Huy', 'Bùi Thị Hoa', 'Đỗ Tiến Dũng',
  'Ngô Gia Bảo', 'Dương Thùy Dung', 'Lý Văn Thái', 'Trịnh Kim Oanh', 'Mai Đức Thịnh',
  'Cao Mỹ Lệ', 'Đinh Công Minh', 'Lâm Như Ý', 'Phan Văn Lộc', 'Võ Thị Thu',
];

export async function isSeeded(db: DB): Promise<boolean> {
  return !!(await one(db, 'SELECT 1 AS x FROM orgs LIMIT 1'));
}

export async function seedDemo(db: DB): Promise<void> {
  const pw = hashPassword('etop123');

  await db.query("INSERT INTO orgs (id, name) VALUES ('org_etop', $1)", ["Trung tâm Anh Ngữ E'TOP"]);
  await db.query(
    `INSERT INTO sites (id, org_id, name, address) VALUES
     ('site_nh', 'org_etop', 'Cơ sở Nguyễn Hội', '166 Nguyễn Hội, P. Phú Trinh, TP. Phan Thiết'),
     ('site_tt', 'org_etop', 'Cơ sở Tôn Thất Thiệp', 'Tôn Thất Thiệp, TP. Phan Thiết')`,
  );

  const users: [id: string, site: string | null, role: string, name: string, email: string][] = [
    ['u_zhao', null, 'owner', 'Ms. Zhao', 'zhao@etop.vn'],
    ['u_hoa', null, 'academic_director', 'Ms. Hoa', 'hoa@etop.vn'],
    ['u_lan', 'site_nh', 'tutor', 'Ms. Lan', 'lan@etop.vn'],
    ['u_david', 'site_nh', 'tutor', 'Mr. David', 'david@etop.vn'],
    ['u_trang', 'site_tt', 'tutor', 'Ms. Trang', 'trang@etop.vn'],
    ['u_desk', 'site_nh', 'front_desk', 'Front Desk NH', 'desk@etop.vn'],
    ['u_bill', null, 'billing_admin', 'Ms. Kế Toán', 'bill@etop.vn'],
  ];
  const teacherCodes: Record<string, string> = { u_lan: 'GV0001', u_david: 'GV0002', u_trang: 'GV0003' };
  for (const [id, site, role, name, email] of users) {
    await db.query('INSERT INTO users (id, org_id, site_id, role, name, email, login_code, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
      id, 'org_etop', site, role, name, email, teacherCodes[id] ?? null, pw,
    ]);
  }

  const classes: [id: string, site: string, teacher: string, name: string, level: string, schedule: string][] = [
    ['c1', 'site_nh', 'u_lan', 'Starters A', 'pre_a1_starters', 'Thứ 2 & Thứ 5 · 17:30–19:00'],
    ['c2', 'site_nh', 'u_lan', 'Movers B', 'a1_movers', 'Thứ 3 & Thứ 6 · 17:30–19:00'],
    ['c3', 'site_nh', 'u_david', 'Teens A2', 'a2_flyers', 'Thứ 2 & Thứ 5 · 19:15–20:45'],
    ['c4', 'site_nh', 'u_david', 'Teens B1', 'b1', 'Thứ 3 & Thứ 6 · 19:15–20:45'],
    ['c5', 'site_tt', 'u_trang', 'Flyers C', 'a2_flyers', 'Thứ 4 & Thứ 7 · 17:30–19:00'],
    ['c6', 'site_tt', 'u_trang', 'Starters B', 'pre_a1_starters', 'Thứ 4 & Chủ nhật · 9:00–10:30'],
  ];
  for (const [id, site, teacher, name, level, schedule] of classes) {
    await db.query('INSERT INTO classes (id, org_id, site_id, teacher_id, name, level, schedule_note) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
      id, 'org_etop', site, teacher, name, level, schedule,
    ]);
  }

  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const id = `s${i}`;
    const cls = classes[i % classes.length];
    const code = `HV${String(i + 1).padStart(4, '0')}`;
    await db.query('INSERT INTO users (id, org_id, site_id, role, name, email, login_code, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
      id, 'org_etop', cls[1], 'student', STUDENT_NAMES[i], i === 0 ? 'minh@etop.vn' : `s${i}@etop.vn`, code, pw,
    ]);
    await db.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2)', [cls[0], id]);
  }

  await db.query('INSERT INTO users (id, org_id, site_id, role, name, email, phone, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
    'p0', 'org_etop', null, 'parent', 'Trần Văn Hùng', 'phuhuynh@etop.vn', '+84901000001', pw,
  ]);
  await db.query('INSERT INTO users (id, org_id, site_id, role, name, email, phone, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
    'p1', 'org_etop', null, 'parent', 'Lê Thị Thanh', 'phuhuynh2@etop.vn', '+84901000002', pw,
  ]);
  await db.query("INSERT INTO guardian_students (guardian_id, student_id, contact_order) VALUES ('p0', 's0', 1), ('p1', 's0', 2)");

  // Verified pickup people for the demo student: grandma (PIN 1234) and a
  // court-blocked person to exercise the blocked-pickup alert flow.
  await db.query(
    `INSERT INTO pickup_people (id, org_id, student_id, name, relation, pin_hash, blocked) VALUES
     ('pk_grandma', 'org_etop', 's0', 'Bà Nội (Nguyễn Thị Tư)', 'grandmother', $1, false),
     ('pk_blocked', 'org_etop', 's0', 'Blocked Person', 'restricted', $1, true)`,
    [hashPassword('1234')],
  );

  // Today's meetings per class so attendance reconciliation has an
  // expected roster on first boot.
  const today = new Date();
  const meeting = (id: string, cls: (typeof classes)[number], startH: number, startM: number, durMin: number, room: string) => {
    const start = new Date(today);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(start.getTime() + durMin * 60000);
    return db.query(
      'INSERT INTO class_meetings (id, org_id, class_id, site_id, room, starts_at, ends_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, 'org_etop', cls[0], cls[1], room, start.toISOString(), end.toISOString()],
    );
  };
  // Starter skills taxonomy: 4 strands × 4 levels with prerequisite edges
  // forming a simple chain per strand (knowledge graph grows with content).
  const strands = ['grammar', 'reading', 'listening', 'writing'];
  const levels = ['pre_a1_starters', 'a1_movers', 'a2_flyers', 'b1'];
  for (const strand of strands) {
    let prev: string | null = null;
    for (const level of levels) {
      const id = `sk_${strand}_${level}`;
      await db.query('INSERT INTO skills (id, subject, strand, level, key, name) VALUES ($1, $2, $3, $4, $5, $6)', [
        id, 'english', strand, level, `${strand}.${level}`, `${strand[0].toUpperCase()}${strand.slice(1)} — ${level.replace(/_/g, ' ')}`,
      ]);
      if (prev) await db.query('INSERT INTO skill_prereqs (skill_id, prereq_id) VALUES ($1, $2)', [id, prev]);
      prev = id;
    }
  }

  // Join codes for every class.
  const codes = ['BEAR42', 'LION07', 'STAR91', 'FISH23', 'DUCK55', 'MOON38'];
  for (let i = 0; i < classes.length; i++) {
    await db.query('UPDATE classes SET join_code = $2 WHERE id = $1', [classes[i][0], codes[i]]);
  }

  // Starter question bank for Ms. Lan (one of each type, no publisher content).
  const q = (id: string, type: string, skill: string, prompt: string, payload: object) =>
    db.query(
      `INSERT INTO questions (id, org_id, owner_id, type, skill, level, unit, prompt, payload) VALUES ($1, 'org_etop', 'u_lan', $2, $3, 'pre_a1_starters', 'Unit 1', $4, $5)`,
      [id, type, skill, prompt, JSON.stringify(payload)],
    );
  await q('q_mc1', 'mc', 'grammar', 'I ___ a student.', { options: ['am', 'is', 'are', 'be'], answer: 'am' });
  await q('q_mcm1', 'mc_multi', 'grammar', 'Choose ALL the colour words:', { options: ['red', 'cat', 'blue', 'run'], answers: ['red', 'blue'] });
  await q('q_fb1', 'fill_blank', 'reading', 'The cat is ___ the table. (under)', { sentence: 'The cat is ___ the table.', choices: ['under', 'eat', 'blue'], answer: 'under' });
  await q('q_fg1', 'fill_gaps', 'grammar', 'Complete the sentences.', { text: 'I __1__ seven years old. She __2__ my friend.', gaps: [{ id: 1, answer: 'am' }, { id: 2, answer: 'is' }], wordBank: ['am', 'is', 'are'] });
  await q('q_ro1', 'reorder', 'writing', 'Make a sentence:', { words: ['My', 'name', 'is', 'Mai'], answer: 'My name is Mai' });
  await q('q_li1', 'listen_mc', 'listening', 'Listen and choose what you hear.', { audioText: 'Good morning, teacher!', options: ['Good morning, teacher!', 'Good night, teacher!', 'Good morning, Peter!'], answer: 'Good morning, teacher!', replayLimit: 2 });
  await q('q_di1', 'dictation', 'writing', 'Listen and type what you hear.', { audioText: 'I like my school.', replayLimit: 2 });
  await q('q_pi1', 'picture', 'writing', 'Describe the picture in 2 sentences.', { imageUrl: null, starters: ['I can see…', 'There is…'] });

  // Billing plans and the demo student's subscription.
  await db.query(
    `INSERT INTO billing_plans (id, org_id, name, kind, price_vnd) VALUES
     ('plan_monthly', 'org_etop', 'Học phí tháng (2 buổi/tuần)', 'monthly', 1500000),
     ('plan_term', 'org_etop', 'Học phí khóa 3 tháng', 'term', 4200000)`,
  );
  await db.query(
    `INSERT INTO student_plans (id, org_id, student_id, plan_id, started_on, sibling_discount_pct) VALUES
     ('sp_s0', 'org_etop', 's0', 'plan_monthly', '2026-01-01', 10)`,
  );

  await meeting('m1', classes[0], 17, 30, 90, 'P.101');
  await meeting('m2', classes[1], 17, 30, 90, 'P.102');
  await meeting('m3', classes[2], 19, 15, 90, 'P.103');
  await meeting('m4', classes[3], 19, 15, 90, 'P.201');
  await meeting('m5', classes[4], 17, 30, 90, 'P.301');
  await meeting('m6', classes[5], 19, 15, 90, 'P.302');
}
