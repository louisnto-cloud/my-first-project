import { hashPassword } from './auth.js';
import type { DB } from './db.js';

// The REAL E'TOP tenant: actual teachers and class sections provided by
// the owner (2026-06). This is what the live server seeds; the fictional
// demo tenant in seed.ts is used by the automated tests only.
//
// Shifts (ca):
//   Ca 2-4-6      = Mon/Wed/Fri    Ca 3-5-7 = Tue/Thu/Sat
//   Ca sáng T7-CN = Sat+Sun morning    Ca 2-4 = Mon/Wed
// Class times within each shift are not known yet — owner to confirm.

export async function seedReal(db: DB): Promise<void> {
  const pw = hashPassword('etop123');

  await db.query("INSERT INTO orgs (id, name) VALUES ('org_etop', $1)", ["Trung tâm Anh Ngữ E'TOP"]);
  await db.query(
    `INSERT INTO sites (id, org_id, name, address) VALUES
     ('site_nh', 'org_etop', 'Cơ sở Nguyễn Hội', '166 Nguyễn Hội, P. Phú Trinh, TP. Phan Thiết'),
     ('site_tt', 'org_etop', 'Cơ sở Tôn Thất Thiệp', 'Tôn Thất Thiệp, TP. Phan Thiết')`,
  );

  await db.query(
    `INSERT INTO users (id, org_id, role, name, email, password_hash) VALUES
     ('u_zhao', 'org_etop', 'owner', 'Ms. Zhao', 'zhao@etop.vn', $1)`,
    [pw],
  );

  // Real teachers, each with a GV login code.
  const teachers: [id: string, name: string, email: string, code: string][] = [
    ['t_quy', 'Ms. Quy', 'quy@etop.vn', 'GV0001'],
    ['t_trucvy', 'Ms. Truc Vy', 'trucvy@etop.vn', 'GV0002'],
    ['t_y', 'Ms. Y', 'y@etop.vn', 'GV0003'],
    ['t_ha', 'Ms. Ha', 'ha@etop.vn', 'GV0004'],
    ['t_tinh', 'Mr. Tinh', 'tinh@etop.vn', 'GV0005'],
    ['t_ly', 'Ms. Ly', 'ly@etop.vn', 'GV0006'],
  ];
  for (const [id, name, email, code] of teachers) {
    await db.query(
      `INSERT INTO users (id, org_id, site_id, role, name, email, login_code, password_hash)
       VALUES ($1, 'org_etop', 'site_nh', 'tutor', $2, $3, $4, $5)`,
      [id, name, email, code, pw],
    );
  }

  // Real class sections per shift. PN1 runs twice in ca 3-5-7 with two
  // different teachers (two sections, as provided).
  const classes: [id: string, teacher: string, name: string, schedule: string][] = [
    // Ca 2-4-6
    ['sj1_246', 't_quy', 'SJ1', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    ['sk2_246', 't_trucvy', 'SK2', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    ['pn1_246', 't_y', 'PN1', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    ['starters_246', 't_ha', 'Starters', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    ['grm_246', 't_tinh', 'Get Ready Mover', 'Ca 2-4-6 · Thứ 2, 4, 6'],
    // Ca 3-5-7
    ['sj1_357', 't_quy', 'SJ1', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['pn1_357a', 't_trucvy', 'PN1', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['pn1_357b', 't_y', 'PN1', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['starters_357', 't_ha', 'Starters', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['sj2_357', 't_tinh', 'SJ2', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    ['sj5_357', 't_ly', 'SJ5', 'Ca 3-5-7 · Thứ 3, 5, 7'],
    // Ca sáng T7-CN
    ['sj2_t7cn', 't_trucvy', 'SJ2', 'Ca sáng · Thứ 7 & Chủ nhật'],
    ['grs_t7cn', 't_tinh', 'Get Ready Starter', 'Ca sáng · Thứ 7 & Chủ nhật'],
    // Ca 2-4
    ['sk1_24', 't_ly', 'SK1', 'Ca 2-4 · Thứ 2 & Thứ 4'],
  ];
  for (const [id, teacher, name, schedule] of classes) {
    await db.query(
      `INSERT INTO classes (id, org_id, site_id, teacher_id, name, schedule_note)
       VALUES ($1, 'org_etop', 'site_nh', $2, $3, $4)`,
      [id, teacher, name, schedule],
    );
  }

  // The owner's Up 1/2/3 test roster with custom UP codes (kept so the
  // distributed codes keep working). Homeroom assignment provisional.
  const upClasses: [id: string, teacher: string, name: string, schedule: string][] = [
    ['up1', 't_ha', 'Up 1', 'Thứ 2, 3, 4 · 17:30–19:00'],
    ['up2', 't_tinh', 'Up 2', 'Thứ 5, 6, 7 · 17:30–19:00'],
    ['up3', 't_ly', 'Up 3', 'Thứ 7 & Chủ nhật · 9:00–10:30'],
  ];
  for (const [id, teacher, name, schedule] of upClasses) {
    await db.query(
      `INSERT INTO classes (id, org_id, site_id, teacher_id, name, level, schedule_note)
       VALUES ($1, 'org_etop', 'site_nh', $2, $3, 'a1_movers', $4)`,
      [id, teacher, name, schedule],
    );
  }
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
  for (let i = 0; i < upStudents.length; i++) {
    const [name, code, classId] = upStudents[i];
    const id = `su${i + 1}`;
    await db.query(
      `INSERT INTO users (id, org_id, site_id, role, name, email, login_code, password_hash)
       VALUES ($1, 'org_etop', 'site_nh', 'student', $2, $3, $4, $5)`,
      [id, name, `${code.toLowerCase()}@hv.etop.local`, code, pw],
    );
    await db.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2)', [classId, id]);
  }
}
