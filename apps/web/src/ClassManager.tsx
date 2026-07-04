import { useEffect, useState } from 'react';
import { api } from './api';
import { sfx } from './sound';

const SKILL_EMOJI: Record<string, string> = { grammar: '🔤', reading: '📖', listening: '🎧', writing: '✍️' };

// Teacher class management: every class the teacher owns (a teacher can
// run many classes on different days), its roster with student login
// codes, paste-a-list student import, and assigning work to that class
// from the question bank.

interface ClassInfo {
  id: string;
  name: string;
  level: string;
  teacherName: string | null;
  scheduleNote: string;
}

interface RosterRow {
  id: string;
  name: string;
  loginCode?: string;
}

interface Question {
  id: string;
  type: string;
  skill: string;
  prompt: string;
  unit: string | null;
}

function ClassCard({ cls }: { cls: ClassInfo }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'students' | 'work'>('students');
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; title: string; status: string }[]>([]);
  const [names, setNames] = useState('');
  const [bank, setBank] = useState<Question[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [composing, setComposing] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState('');

  const load = async () => {
    const detail = await api<{ roster: RosterRow[] }>('GET', `/classes/${cls.id}`);
    setRoster(detail.roster);
    setAssignments(await api('GET', `/classes/${cls.id}/assignments`));
    setBank(await api('GET', '/questions'));
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const addStudents = async () => {
    const list = names.split('\n').map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) return;
    const res = await api<{ created: { name: string; loginCode: string }[] }>('POST', `/classes/${cls.id}/students`, { names: list });
    setNames('');
    flash(`✅ Đã thêm ${res.created.length} học viên — mã số đã hiện trong danh sách.`);
    void load();
  };

  const rotate = async (studentId: string) => {
    const res = await api<{ loginCode: string }>('POST', `/students/${studentId}/rotate-code`);
    flash(`🔑 Mã mới: ${res.loginCode} (mã cũ hết hiệu lực ngay)`);
    void load();
  };

  const copyCode = (code?: string) => {
    if (!code) return;
    try { void navigator.clipboard.writeText(code); } catch { /* ignore */ }
    sfx.click();
    setCopied(code);
    setTimeout(() => setCopied(''), 1200);
  };

  // One-time invite code so the student's parent can self-register an
  // account linked to their child (single-use, no open signup).
  const invite = async (studentId: string, studentName: string) => {
    const res = await api<{ inviteCode: string }>('POST', `/students/${studentId}/invite`);
    copyCode(res.inviteCode);
    flash(`🎟 Mã mời phụ huynh của ${studentName}: ${res.inviteCode} (đã chép) — phụ huynh nhập mã này ở màn hình đăng nhập, mục Phụ huynh → Đăng ký. Dùng được 1 lần.`);
  };

  const togglePick = (id: string) => {
    sfx.click();
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  const assign = async () => {
    if (!title.trim() || picked.size === 0) return;
    const created = await api<{ id: string }>('POST', `/classes/${cls.id}/assignments`, {
      title: title.trim(),
      questionIds: [...picked],
      ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
    });
    await api('POST', `/assignments/${created.id}/publish`);
    setTitle('');
    setPicked(new Set());
    setComposing(false);
    flash(`📨 Đã giao "${title.trim()}" — học viên & phụ huynh đã được báo.`);
    void load();
  };

  return (
    <div className="card space-y-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 text-left">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl">🏫</div>
        <div className="min-w-0 flex-1">
          <div className="font-black text-violet-800">Lớp {cls.name}</div>
          <div className="truncate text-[11px] font-bold text-slate-400">🗓 {cls.scheduleNote || '—'}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-slate-400">
          <span className="chip bg-violet-50 text-violet-600">👧 {roster.length || ''}</span>
          <span className="text-violet-400">{open ? '▴' : '▾'}</span>
        </div>
      </button>

      {open && (
        <>
          {msg && <div className="animate-rise rounded-2xl bg-emerald-50 p-2.5 text-center text-sm font-bold text-emerald-700">{msg}</div>}

          <div className="flex gap-1 rounded-2xl bg-violet-100 p-1">
            {([['students', `👧 Học viên (${roster.length})`], ['work', `📝 Bài tập (${assignments.length})`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-xl px-2 py-2 text-xs font-extrabold transition ${tab === k ? 'bg-white text-violet-700 shadow-sm' : 'text-violet-400'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'students' && (
            <div className="space-y-2">
              <ul className="divide-y divide-violet-50">
                {roster.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm font-bold">
                    <span>{r.name}</span>
                    <span className="flex items-center gap-2">
                      {r.loginCode && (
                        <button onClick={() => copyCode(r.loginCode)} className="rounded-lg bg-violet-100 px-2.5 py-1 font-black text-violet-700 transition active:scale-95" title="Chạm để chép mã">
                          {copied === r.loginCode ? '✓ đã chép' : r.loginCode}
                        </button>
                      )}
                      <button onClick={() => rotate(r.id)} title="Đổi mã" className="text-slate-300 hover:text-violet-600">↻</button>
                      <button onClick={() => invite(r.id, r.name)} title="Tạo mã mời phụ huynh" className="text-slate-300 transition hover:text-violet-600">🎟</button>
                    </span>
                  </li>
                ))}
              </ul>
              <textarea
                className="input text-sm"
                rows={2}
                placeholder={'Thêm học viên — mỗi dòng một tên:\nNguyễn Văn A\nTrần Thị B'}
                value={names}
                onChange={(e) => setNames(e.target.value)}
              />
              <button onClick={addStudents} disabled={!names.trim()} className="btn-soft w-full text-sm">＋ Thêm vào lớp (tự cấp mã số)</button>
            </div>
          )}

          {tab === 'work' && (
            <div className="space-y-2">
              {assignments.length === 0 && !composing && (
                <div className="rounded-2xl bg-slate-50 p-3 text-center text-sm font-bold text-slate-400">Chưa giao bài nào</div>
              )}
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-2xl bg-violet-50 px-3 py-2.5 text-sm font-bold">
                  <span>📝 {a.title}</span>
                  <span className="chip bg-emerald-100 text-emerald-600">{a.status === 'published' ? 'đã giao' : a.status}</span>
                </div>
              ))}

              {!composing ? (
                <button onClick={() => setComposing(true)} className="btn-primary w-full text-sm">＋ Giao bài tập mới</button>
              ) : (
                <div className="space-y-2 rounded-2xl border-2 border-dashed border-violet-200 p-3">
                  <input className="input text-sm" placeholder="Tên bài tập (vd: Ôn Unit 1)" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <div className="text-[11px] font-bold text-slate-400">Hạn nộp (không bắt buộc)</div>
                  <input className="input text-sm" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                  <div className="text-[11px] font-bold text-slate-400">Chạm để chọn câu hỏi:</div>
                  <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                    {bank.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => togglePick(q.id)}
                        className={`rounded-xl border-2 px-2.5 py-1.5 text-left text-[11px] font-bold transition ${picked.has(q.id) ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-violet-100 bg-white text-slate-500'}`}
                      >
                        {SKILL_EMOJI[q.skill] ?? '•'} {q.prompt || q.type}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setComposing(false); setPicked(new Set()); setTitle(''); }} className="btn-soft text-sm">Hủy</button>
                    <button onClick={assign} disabled={!title.trim() || picked.size === 0} className="btn-primary flex-1 text-sm">
                      📨 Giao ({picked.size})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ClassManager() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  useEffect(() => {
    void api<ClassInfo[]>('GET', '/classes').then(setClasses);
  }, []);
  if (classes.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="px-1 font-black text-violet-800">🏫 Lớp của tôi <span className="text-slate-400">({classes.length})</span></h2>
      {classes.map((c) => (
        <ClassCard key={c.id} cls={c} />
      ))}
    </div>
  );
}
