import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { Icon } from './Icon';
import { sfx } from './sound';

// Owner / academic-director control panel — the "backend" made visible.
// This is where accounts come from: the owner creates teachers (each gets
// a GV login code to hand over in person) and classes, and can move a
// class between teachers. Teachers then import students; parents join
// via invite codes from ClassManager. Closed loop — no open signup for
// anyone who touches children's data.

interface TeacherRow {
  id: string;
  name: string;
  email: string | null;
  loginCode: string;
  classCount: number;
}

interface ClassRow {
  id: string;
  name: string;
  teacherId: string | null;
  teacherName: string | null;
  scheduleNote: string;
}

export function AdminPanel({ lang }: { lang: 'vi' | 'en' }) {
  const vi = lang === 'vi';
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState('');

  // Add-teacher form
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [issued, setIssued] = useState<{ name: string; loginCode: string } | null>(null);

  // Add-class form
  const [cName, setCName] = useState('');
  const [cSchedule, setCSchedule] = useState('');
  const [cTeacher, setCTeacher] = useState('');

  // Shared-question approvals
  const [pendingShares, setPendingShares] = useState<{ id: string; prompt: string; skill: string; ownerName: string }[]>([]);

  // Front-desk accounts (sign in via 🔐 Khu vực trung tâm)
  const [staff, setStaff] = useState<{ id: string; name: string; email: string }[]>([]);
  const [fdName, setFdName] = useState('');
  const [fdEmail, setFdEmail] = useState('');
  const [fdIssued, setFdIssued] = useState<{ name: string; email: string; tempPassword: string } | null>(null);

  const addStaff = async () => {
    if (fdName.trim().length < 2 || !fdEmail.includes('@')) return;
    try {
      const res = await api<{ name: string; email: string; tempPassword: string }>('POST', '/admin/staff', { name: fdName.trim(), email: fdEmail.trim() });
      setFdIssued(res);
      setFdName('');
      setFdEmail('');
      void load();
    } catch (e) {
      flash(e instanceof ApiError && e.message === 'email_taken' ? (vi ? '❌ Email này đã được dùng.' : '❌ Email already in use.') : '❌ Lỗi — thử lại.');
    }
  };

  const load = async () => {
    setTeachers(await api('GET', '/admin/teachers'));
    setClasses(await api('GET', '/classes'));
    setPendingShares(await api<typeof pendingShares>('GET', '/questions/pending-shares').catch(() => []));
    setStaff(await api<typeof staff>('GET', '/admin/staff').catch(() => []));
  };
  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  const copy = (text: string) => {
    try { void navigator.clipboard.writeText(text); } catch { /* ignore */ }
    sfx.click();
    setCopied(text);
    setTimeout(() => setCopied(''), 1200);
  };

  const addTeacher = async () => {
    if (tName.trim().length < 2) return;
    try {
      const res = await api<{ name: string; loginCode: string }>('POST', '/admin/teachers', {
        name: tName.trim(),
        ...(tEmail.trim() ? { email: tEmail.trim() } : {}),
      });
      setIssued(res);
      setTName('');
      setTEmail('');
      void load();
    } catch (e) {
      flash(e instanceof ApiError && e.message === 'email_taken' ? (vi ? '❌ Email này đã được dùng.' : '❌ Email already in use.') : '❌ Lỗi — thử lại.');
    }
  };

  const addClass = async () => {
    if (!cName.trim()) return;
    await api('POST', '/admin/classes', {
      name: cName.trim(),
      scheduleNote: cSchedule.trim(),
      ...(cTeacher ? { teacherId: cTeacher } : {}),
    });
    setCName('');
    setCSchedule('');
    setCTeacher('');
    flash(vi ? '✅ Đã tạo lớp mới.' : '✅ Class created.');
    void load();
  };

  const reassign = async (classId: string, teacherId: string) => {
    await api('PATCH', `/admin/classes/${classId}`, { teacherId: teacherId || null });
    flash(vi ? '✅ Đã đổi giáo viên phụ trách.' : '✅ Teacher reassigned.');
    void load();
  };

  return (
    <div className="card space-y-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white"><Icon name="shield" size={22} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-ink">{vi ? 'Quản trị trung tâm' : 'Center admin'}</span>
          <span className="block text-[11px] font-bold text-muted">{vi ? 'Giáo viên · Lớp học · Mã đăng nhập' : 'Teachers · Classes · Login codes'}</span>
        </span>
        <Icon name="chevron" size={18} className={`shrink-0 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="animate-rise space-y-4">
          {msg && <div className="rounded-2xl bg-emerald-50 p-2.5 text-center text-sm font-bold text-emerald-700">{msg}</div>}

          {/* ---- Teachers ---- */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-violet-800"><Icon name="users" size={16} /> {vi ? 'Đội ngũ giáo viên' : 'Teaching team'} <span className="font-bold text-slate-400">({teachers.length})</span></h3>
            <ul className="divide-y divide-violet-50">
              {teachers.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm font-bold">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{t.name}</span>
                    <span className="block text-[10px] font-semibold text-slate-400">{t.classCount} {vi ? 'lớp' : 'classes'}</span>
                  </span>
                  <button onClick={() => copy(t.loginCode)} className="rounded-lg bg-violet-100 px-2.5 py-1 font-black text-violet-700 transition active:scale-95" title={vi ? 'Chạm để chép mã' : 'Tap to copy'}>
                    {copied === t.loginCode ? '✓' : t.loginCode}
                  </button>
                </li>
              ))}
            </ul>

            {issued && (
              <div className="animate-pop rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3 text-center">
                <div className="text-sm font-extrabold text-emerald-700">{vi ? `Đã tạo tài khoản cho ${issued.name}!` : `Account created for ${issued.name}!`}</div>
                <button onClick={() => copy(issued.loginCode)} className="mt-1 rounded-xl bg-white px-4 py-2 text-2xl font-black tracking-[0.2em] text-emerald-700 shadow-soft transition active:scale-95">
                  {copied === issued.loginCode ? '✓ đã chép' : issued.loginCode}
                </button>
                <div className="mt-1 text-[11px] font-bold text-emerald-600">{vi ? 'Đưa mã này trực tiếp cho giáo viên — họ đăng nhập ngay bằng mã.' : 'Hand this code to the teacher — they sign in with it right away.'}</div>
              </div>
            )}

            <div className="space-y-2 rounded-2xl border-2 border-dashed border-violet-200 p-3">
              <input className="input text-sm" placeholder={vi ? 'Tên giáo viên mới (vd: Ms. Hương)' : 'New teacher name'} value={tName} onChange={(e) => setTName(e.target.value)} />
              <input className="input text-sm" placeholder={vi ? 'Email (không bắt buộc)' : 'Email (optional)'} value={tEmail} onChange={(e) => setTEmail(e.target.value)} />
              <button onClick={addTeacher} disabled={tName.trim().length < 2} className="btn-primary w-full text-sm">
                <Icon name="plus" size={16} /> {vi ? 'Tạo tài khoản giáo viên (tự cấp mã GV)' : 'Create teacher (auto GV code)'}
              </button>
            </div>
          </div>

          {/* ---- Front-desk accounts ---- */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-violet-800">🛎 {vi ? 'Tài khoản lễ tân' : 'Front-desk accounts'} <span className="font-bold text-slate-400">({staff.length})</span></h3>
            {staff.length > 0 && (
              <ul className="divide-y divide-violet-50">
                {staff.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm font-bold">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{s.name}</span>
                      <span className="block truncate text-[10px] font-semibold text-slate-400">{s.email}</span>
                    </span>
                    <span className="chip shrink-0 bg-violet-50 text-violet-500">🔐 {vi ? 'Khu vực trung tâm' : 'Center area'}</span>
                  </li>
                ))}
              </ul>
            )}

            {fdIssued && (
              <div className="animate-pop rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3 text-center">
                <div className="text-sm font-extrabold text-emerald-700">{vi ? `Đã tạo tài khoản lễ tân cho ${fdIssued.name}!` : `Front-desk account created for ${fdIssued.name}!`}</div>
                <div className="mt-1 text-xs font-bold text-emerald-600">{fdIssued.email}</div>
                <button onClick={() => copy(fdIssued.tempPassword)} className="mt-1 rounded-xl bg-white px-4 py-2 text-xl font-black tracking-[0.12em] text-emerald-700 shadow-soft transition active:scale-95">
                  {copied === fdIssued.tempPassword ? (vi ? '✓ đã chép' : '✓ copied') : fdIssued.tempPassword}
                </button>
                <div className="mt-1 text-[11px] font-bold leading-snug text-emerald-600">
                  {vi
                    ? 'Mật khẩu tạm — chỉ hiện MỘT lần. Lễ tân đăng nhập ở mục 🔐 Khu vực trung tâm rồi tự đổi email & mật khẩu riêng.'
                    : 'Temporary password — shown ONCE. They sign in via the 🔐 Center area, then set their own email & password.'}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-2xl border-2 border-dashed border-violet-200 p-3">
              <input className="input text-sm" placeholder={vi ? 'Tên lễ tân (vd: Chị Thu)' : 'Front-desk name'} value={fdName} onChange={(e) => setFdName(e.target.value)} />
              <input className="input text-sm" placeholder={vi ? 'Email đăng nhập' : 'Login email'} value={fdEmail} onChange={(e) => setFdEmail(e.target.value)} />
              <button onClick={addStaff} disabled={fdName.trim().length < 2 || !fdEmail.includes('@')} className="btn-primary w-full text-sm">
                <Icon name="plus" size={16} /> {vi ? 'Tạo tài khoản lễ tân (cấp mật khẩu tạm)' : 'Create front-desk account (temp password)'}
              </button>
            </div>
          </div>

          {/* ---- Shared-question approvals ---- */}
          {pendingShares.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-violet-800">🤝 {vi ? 'Câu hỏi chờ duyệt chia sẻ' : 'Shares awaiting approval'} <span className="font-bold text-amber-500">({pendingShares.length})</span></h3>
              {pendingShares.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.prompt || '—'}</span>
                    <span className="block text-[10px] font-semibold text-slate-400">{p.ownerName} · {p.skill}</span>
                  </span>
                  <button
                    onClick={async () => { await api('POST', `/questions/${p.id}/approve-share`); flash(vi ? '✅ Đã duyệt — mọi giáo viên dùng được câu này.' : '✅ Approved for all teachers.'); void load(); }}
                    className="btn-primary shrink-0 !py-1.5 text-xs"
                  >
                    ✓ {vi ? 'Duyệt' : 'Approve'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ---- Classes ---- */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-violet-800"><Icon name="cap" size={16} /> {vi ? 'Lớp học' : 'Classes'} <span className="font-bold text-slate-400">({classes.length})</span></h3>
            <ul className="space-y-1.5">
              {classes.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-2xl bg-violet-50 px-3 py-2 text-sm font-bold">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{c.name}</span>
                    <span className="block truncate text-[10px] font-semibold text-slate-400">{c.scheduleNote || '—'}</span>
                  </span>
                  <select
                    className="max-w-[45%] rounded-xl border-2 border-violet-100 bg-white px-2 py-1.5 text-xs font-bold text-violet-700"
                    value={c.teacherId ?? ''}
                    onChange={(e) => void reassign(c.id, e.target.value)}
                  >
                    <option value="">{vi ? '— chưa có GV —' : '— no teacher —'}</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>

            <div className="space-y-2 rounded-2xl border-2 border-dashed border-violet-200 p-3">
              <input className="input text-sm" placeholder={vi ? 'Tên lớp mới (vd: SK3)' : 'New class name'} value={cName} onChange={(e) => setCName(e.target.value)} />
              <input className="input text-sm" placeholder={vi ? 'Lịch học (vd: Ca 2-4-6 · Thứ 2, 4, 6)' : 'Schedule'} value={cSchedule} onChange={(e) => setCSchedule(e.target.value)} />
              <select className="input text-sm" value={cTeacher} onChange={(e) => setCTeacher(e.target.value)}>
                <option value="">{vi ? 'Chọn giáo viên phụ trách…' : 'Pick a teacher…'}</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button onClick={addClass} disabled={!cName.trim()} className="btn-primary w-full text-sm">
                <Icon name="plus" size={16} /> {vi ? 'Tạo lớp' : 'Create class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
