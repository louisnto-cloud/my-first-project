import { useEffect, useState } from 'react';
import { api } from './api';

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
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; title: string; status: string }[]>([]);
  const [names, setNames] = useState('');
  const [bank, setBank] = useState<Question[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [msg, setMsg] = useState('');

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

  const addStudents = async () => {
    const list = names.split('\n').map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) return;
    const res = await api<{ created: { name: string; loginCode: string }[] }>('POST', `/classes/${cls.id}/students`, { names: list });
    setNames('');
    setMsg(`✅ Đã thêm ${res.created.length} học viên — mã số hiển thị trong danh sách.`);
    void load();
  };

  const rotate = async (studentId: string) => {
    const res = await api<{ loginCode: string }>('POST', `/students/${studentId}/rotate-code`);
    setMsg(`🔑 Mã mới: ${res.loginCode} (mã cũ hết hiệu lực ngay)`);
    void load();
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
    setMsg(`📨 Đã giao "${title.trim()}" cho lớp ${cls.name} — học viên và phụ huynh đã được thông báo.`);
    void load();
  };

  return (
    <div className="card space-y-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <div>
          <div className="font-extrabold">🏫 Lớp {cls.name}</div>
          <div className="text-xs font-bold text-slate-400">🗓 {cls.scheduleNote || '—'} · GV chủ nhiệm: {cls.teacherName}</div>
        </div>
        <span className="text-violet-400">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <>
          {msg && <div className="rounded-2xl bg-emerald-50 p-2 text-sm font-bold text-emerald-700">{msg}</div>}

          <div>
            <h4 className="mb-1 text-sm font-extrabold text-violet-700">👧 Danh sách học viên ({roster.length})</h4>
            <ul className="divide-y divide-violet-50">
              {roster.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-1.5 text-sm font-bold">
                  <span>{r.name}</span>
                  <span className="flex items-center gap-2">
                    {r.loginCode && <code className="rounded-lg bg-violet-100 px-2 py-0.5 font-black text-violet-700">{r.loginCode}</code>}
                    <button onClick={() => rotate(r.id)} title="Đổi mã" className="text-xs text-slate-400 hover:text-violet-600">↻</button>
                  </span>
                </li>
              ))}
            </ul>
            <textarea
              className="input mt-2 text-sm"
              rows={2}
              placeholder={'Thêm học viên — mỗi dòng một tên:\nNguyễn Văn A\nTrần Thị B'}
              value={names}
              onChange={(e) => setNames(e.target.value)}
            />
            <button onClick={addStudents} className="btn-soft mt-1 text-sm">＋ Thêm vào lớp (tự cấp mã số)</button>
          </div>

          <div>
            <h4 className="mb-1 text-sm font-extrabold text-violet-700">📝 Bài tập của lớp</h4>
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-violet-50 px-3 py-1.5 text-sm font-bold">
                <span>{a.title}</span>
                <span className="text-xs text-slate-400">{a.status === 'published' ? '📨 đã giao' : a.status}</span>
              </div>
            ))}
            <div className="mt-2 space-y-2 rounded-2xl border-2 border-dashed border-violet-200 p-3">
              <div className="text-sm font-extrabold text-violet-700">＋ Giao bài tập mới cho lớp này</div>
              <input className="input text-sm" placeholder="Tiêu đề bài tập" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="input text-sm" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {bank.map((q) => (
                  <label key={q.id} className="flex items-start gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={picked.has(q.id)}
                      onChange={(e) => {
                        const next = new Set(picked);
                        if (e.target.checked) next.add(q.id);
                        else next.delete(q.id);
                        setPicked(next);
                      }}
                    />
                    <span><b className="uppercase text-violet-500">{q.skill}</b> · {q.prompt || q.type}{q.unit ? ` (${q.unit})` : ''}</span>
                  </label>
                ))}
              </div>
              <button onClick={assign} disabled={!title.trim() || picked.size === 0} className="btn-primary w-full text-sm">
                📨 Giao cho lớp {cls.name} ({picked.size} câu)
              </button>
            </div>
          </div>
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
      <h2 className="font-black text-violet-700">🏫 Lớp của tôi ({classes.length})</h2>
      {classes.map((c) => (
        <ClassCard key={c.id} cls={c} />
      ))}
    </div>
  );
}
