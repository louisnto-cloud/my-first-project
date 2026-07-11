import { useEffect, useState } from 'react';
import { api, ApiError, hasToken, isDemo, setToken, type Me } from './api';
import { makeT, type Lang } from './i18n';
import { Player } from './Player';
import { Landing } from './Landing';
import { ClassManager } from './ClassManager';
import { AdminPanel } from './AdminPanel';
import { QuestionBank } from './QuestionBank';
import { Announcements } from './Announcements';
import { PracticeHub } from './Practice';
import { Icon } from './Icon';
import { Mascot } from './Mascot';

const ROLE_LABEL: Record<string, { vi: string; en: string }> = {
  student: { vi: 'Học viên', en: 'Student' },
  tutor: { vi: 'Giáo viên', en: 'Teacher' },
  parent: { vi: 'Phụ huynh', en: 'Parent' },
  owner: { vi: 'Chủ trung tâm', en: 'Director' },
  academic_director: { vi: 'Quản lý học vụ', en: 'Academic Dir.' },
  front_desk: { vi: 'Lễ tân', en: 'Front desk' },
};

// Phase 4 portal: state-routed views per role on the real API.

function useT(): [Lang, (l: Lang) => void, (k: string) => string] {
  const [lang, setLang] = useState<Lang>((localStorage.getItem('etop-lang') as Lang) || 'vi');
  const set = (l: Lang) => {
    localStorage.setItem('etop-lang', l);
    setLang(l);
  };
  return [lang, set, makeT(lang)];
}

function Header({ me, lang, setLang, onLogout }: { me: Me; lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string; onLogout: () => void }) {
  const role = ROLE_LABEL[me.role];
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-cloud/70 backdrop-blur-xl">
      {isDemo() && (
        <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-300 px-4 py-1 text-[11px] font-extrabold text-amber-900">
          <Icon name="sparkles" size={13} strokeWidth={2.2} />
          {lang === 'vi' ? 'Bản dùng thử — chạy ngay trên trình duyệt' : 'Demo — runs in your browser'}
        </div>
      )}
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <img src="./logo.png" alt="" className="h-9 w-9 rounded-2xl shadow-soft ring-1 ring-black/5" />
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold tracking-tight text-ink">Anh Ngữ E’TOP</div>
            <div className="text-[11px] font-semibold text-muted">
              {role && <span className="text-violet-600">{lang === 'vi' ? role.vi : role.en}</span>} · {me.name}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <a href="./manual.html" aria-label={lang === 'vi' ? 'Hướng dẫn sử dụng' : 'User guide'} className="surface p-2 text-violet-500 transition hover:border-violet-300">
            <Icon name="book" size={17} />
          </a>
          <button
            onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            className="surface flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-violet-600 transition hover:border-violet-300"
          >
            <Icon name="globe" size={15} /> {lang.toUpperCase()}
          </button>
          <button onClick={onLogout} aria-label="Đăng xuất" className="surface p-2 text-slate-400 transition hover:border-rose-200 hover:text-rose-500">
            <Icon name="logout" size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

interface ClassInfo {
  id: string;
  name: string;
  level: string;
  teacherName: string | null;
  scheduleNote: string;
}

// ---------- Student ----------
const BADGE_META: Record<string, { emoji: string; vi: string; en: string }> = {
  'first-steps': { emoji: '🐣', vi: 'Khởi đầu', en: 'First steps' },
  'streak-3': { emoji: '🔥', vi: '3 ngày liền', en: '3-day streak' },
  'streak-7': { emoji: '🚀', vi: '7 ngày liền', en: '7-day streak' },
  'points-50': { emoji: '⭐', vi: '50 điểm', en: '50 points' },
  'points-200': { emoji: '🏆', vi: '200 điểm', en: '200 points' },
  'homework-hero': { emoji: '📚', vi: '5 bài nộp', en: 'Homework hero' },
};

function Leaderboard({ classId, meName, lang }: { classId: string; meName: string; lang: Lang }) {
  const [rows, setRows] = useState<{ id: string; name: string; points: number }[]>([]);
  useEffect(() => {
    void api<typeof rows>('GET', `/classes/${classId}/leaderboard`).then(setRows).catch(() => {});
  }, [classId]);
  if (rows.length < 2) return null;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="card space-y-1.5">
      <h3 className="flex items-center gap-1.5 font-extrabold text-ink">🏅 {lang === 'vi' ? 'Bảng vàng của lớp' : 'Class leaderboard'}</h3>
      <p className="text-[11px] font-bold text-muted">{lang === 'vi' ? 'Tính theo điểm chăm chỉ ⭐ — không xếp hạng điểm bài kiểm tra.' : 'Effort points only — never test scores.'}</p>
      {rows.slice(0, 5).map((r, i) => {
        const isMe = r.name === meName;
        return (
          <div key={r.id} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-bold ${isMe ? 'bg-violet-100 text-violet-800' : 'bg-slate-50 text-slate-600'}`}>
            <span className="w-6 shrink-0 text-center">{medals[i] ?? `${i + 1}.`}</span>
            <span className="min-w-0 flex-1 truncate">{r.name}{isMe ? (lang === 'vi' ? ' (bạn)' : ' (you)') : ''}</span>
            <span className="shrink-0 text-violet-600">⭐ {r.points}</span>
          </div>
        );
      })}
    </div>
  );
}

function Student({ lang, t, name }: { lang: Lang; t: (k: string) => string; name: string }) {
  const [view, setView] = useState<'work' | 'practice'>('work');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [ach, setAch] = useState<{ points: number; streak: number; badges?: { id: string; earned: boolean }[] } | null>(null);
  const [assignments, setAssignments] = useState<Record<string, { id: string; title: string; dueAt: string | null; myStatus: string | null }[]>>({});
  const [playing, setPlaying] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [joinMsg, setJoinMsg] = useState('');

  const load = async () => {
    const cls = await api<ClassInfo[]>('GET', '/classes');
    setClasses(cls);
    setAch(await api('GET', '/my/achievements'));
    const all: typeof assignments = {};
    for (const c of cls) all[c.id] = await api('GET', `/classes/${c.id}/assignments`);
    setAssignments(all);
  };
  useEffect(() => { void load(); }, []);

  const join = async () => {
    try {
      await api('POST', '/classes/join', { code });
      setJoinMsg(`✅ ${t('pendingApproval')}`);
      setCode('');
    } catch (e) {
      setJoinMsg(`❌ ${e instanceof ApiError ? e.message : 'error'}`);
    }
  };

  if (playing) return <Player assignmentId={playing} onExit={() => { setPlaying(null); void load(); }} t={t} />;

  const totalAssignments = classes.reduce((n, c) => n + (assignments[c.id]?.length ?? 0), 0);

  const classColors = ['bg-rose-100 text-rose-500', 'bg-sky-100 text-sky-500', 'bg-emerald-100 text-emerald-500', 'bg-amber-100 text-amber-600', 'bg-fuchsia-100 text-fuchsia-500'];

  return (
    <div className="space-y-4">
      {ach && (
        <div className="relative overflow-hidden rounded-3.5xl bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lift">
          <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-center gap-3">
            <Mascot size={72} mood="wave" className="shrink-0 animate-float drop-shadow" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-extrabold">
                {lang === 'vi' ? `Chào ${name.split(' ').slice(-1)[0]}! Học thôi nào 🎈` : `Hi ${name.split(' ').slice(-1)[0]}! Let's learn 🎈`}
              </div>
              <div className="mt-2 flex gap-2">
                <span className="chip bg-white/20 text-white"><Icon name="star" size={14} /> {ach.points} {t('points')}</span>
                <span className="chip bg-white/20 text-white"><Icon name="flame" size={14} /> {ach.streak} {t('dayStreak')}</span>
              </div>
            </div>
          </div>
          {(ach.badges ?? []).some((b) => b.earned) && (
            <div className="relative mt-3 flex flex-wrap gap-1.5">
              {(ach.badges ?? []).filter((b) => b.earned).map((b) => {
                const m = BADGE_META[b.id];
                return m ? (
                  <span key={b.id} className="chip bg-white/20 text-white" title={lang === 'vi' ? m.vi : m.en}>
                    {m.emoji} {lang === 'vi' ? m.vi : m.en}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}

      <div className="seg">
        {([['work', 'pencil', lang === 'vi' ? 'Bài tập' : 'Assignments'], ['practice', 'book', lang === 'vi' ? 'Tự luyện' : 'Practice']] as const).map(([k, icon, label]) => (
          <button key={k} data-active={view === k} onClick={() => setView(k)}>
            <span className="flex items-center justify-center gap-1.5"><Icon name={icon} size={17} /> {label}</span>
          </button>
        ))}
      </div>

      {view === 'practice' ? (
        <>
          <PracticeHub lang={lang} />
          {classes[0] && <Leaderboard classId={classes[0].id} meName={name} lang={lang} />}
        </>
      ) : (
        <>
          <Announcements lang={lang} />
          {classes.map((c, ci) => (
            <div key={c.id} className="card space-y-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${classColors[ci % classColors.length]}`}><Icon name="cap" size={24} /></div>
                <div className="min-w-0">
                  <div className="text-[17px] font-extrabold text-ink">Lớp {c.name}</div>
                  <div className="truncate text-xs font-bold text-muted">{c.teacherName ?? '—'}{c.scheduleNote ? ` · ${c.scheduleNote}` : ''}</div>
                </div>
              </div>
              {(assignments[c.id] ?? []).length === 0 ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-extrabold text-emerald-600">
                  <Mascot size={30} mood="happy" /> {lang === 'vi' ? 'Chưa có bài mới — giỏi lắm!' : 'All done — great job!'}
                </div>
              ) : (
                (assignments[c.id] ?? []).map((a) => {
                  const done = a.myStatus === 'graded' || a.myStatus === 'submitted';
                  return (
                    <button
                      key={a.id}
                      onClick={() => setPlaying(a.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 p-3.5 text-left transition active:translate-y-[3px] active:border-b-2 ${done ? 'border-slate-100 bg-slate-50' : 'border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50'}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-100 text-emerald-500' : 'bg-violet-600 text-white'}`}>
                        <Icon name={done ? 'check' : 'pencil'} size={18} />
                      </span>
                      <span className="flex-1 font-extrabold text-ink">{a.title}</span>
                      <span className={`chip ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-600 text-white'}`}>
                        {a.myStatus === 'graded' ? t('graded') : a.myStatus === 'submitted' ? t('submitted') : a.myStatus === 'in_progress' ? t('continue') : t('start')}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ))}

          {totalAssignments === 0 && classes.length > 0 && (
            <button onClick={() => setView('practice')} className="btn-fun btn-fun-green w-full">
              <Icon name="book" size={18} /> {lang === 'vi' ? 'Tự luyện thêm nào!' : 'Practice more!'}
            </button>
          )}

          <details className="card !p-3">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-extrabold text-muted"><Icon name="plus" size={16} /> {t('joinClass')}</summary>
            <div className="mt-3 flex gap-2">
              <input className="input uppercase" placeholder="UP1 / BEAR42" value={code} onChange={(e) => setCode(e.target.value)} />
              <button onClick={join} className="btn-primary">{t('join')}</button>
            </div>
            {joinMsg && <div className="mt-2 text-sm font-bold">{joinMsg}</div>}
          </details>
        </>
      )}
    </div>
  );
}

// ---------- Parent ----------
function Parent({ lang, t }: { lang: Lang; t: (k: string) => string }) {
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [childId, setChildId] = useState<string>('');
  const [digest, setDigest] = useState<Record<string, unknown> | null>(null);
  const [summaries, setSummaries] = useState<{ weekStart: string; bodyEn: string; bodyVi: string }[]>([]);
  const [thread, setThread] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<{ senderName: string; body: string }[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void (async () => {
      const kids = await api<{ id: string; name: string }[]>('GET', '/parents/children');
      setChildren(kids);
      if (kids[0]) setChildId(kids[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!childId) return;
    void (async () => {
      setDigest(await api('GET', `/parents/digest?childId=${childId}`));
      setSummaries(await api('GET', `/parents/summaries?childId=${childId}`));
      const th = await api<{ threadId: string }>('POST', '/threads', { studentId: childId });
      setThread(th.threadId);
      setMsgs(await api('GET', `/threads/${th.threadId}/messages`));
    })();
  }, [childId]);

  const send = async () => {
    if (!thread || !draft.trim()) return;
    await api('POST', `/threads/${thread}/messages`, { body: draft });
    setDraft('');
    setMsgs(await api('GET', `/threads/${thread}/messages`));
  };

  const att = digest?.attendance as { checkInAt?: string; checkOutAt?: string; releasedTo?: string } | null;
  const sessions = (digest?.sessions ?? []) as { parentNote: string; className: string; tutorName: string }[];
  const newA = (digest?.newAssignments ?? []) as { title: string }[];
  const graded = (digest?.graded ?? []) as { title: string; overall: number }[];
  const practice = digest?.practice as { points: number } | undefined;

  const childName = children.find((c) => c.id === childId)?.name ?? '';
  const status = att?.checkOutAt
    ? { emoji: '🏠', text: `${t('releasedTo')}: ${att.releasedTo}`, tone: 'bg-slate-100 text-slate-600' }
    : att?.checkInAt
      ? { emoji: '✅', text: `${t('checkedIn')} · ${new Date(att.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`, tone: 'bg-emerald-100 text-emerald-700' }
      : { emoji: '⏳', text: t('notArrived'), tone: 'bg-amber-100 text-amber-700' };

  return (
    <div className="space-y-4">
      {children.length > 1 && (
        <div className="flex gap-2">
          {children.map((c) => (
            <button key={c.id} onClick={() => setChildId(c.id)} className={`btn text-sm ${c.id === childId ? 'bg-violet-600 text-white' : 'bg-white'}`}>{c.name}</button>
          ))}
        </div>
      )}

      <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-5 text-white shadow-lg shadow-violet-300/40">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">🧒</div>
          <div>
            <div className="text-lg font-black">{childName}</div>
            <span className={`chip ${status.tone}`}>{status.emoji} {status.text}</span>
          </div>
          {practice && <div className="ml-auto text-center"><div className="text-2xl font-black">+{practice.points}</div><div className="text-[10px] font-bold text-violet-100">⭐ hôm nay</div></div>}
        </div>
      </div>

      <Announcements lang={lang} />

      {(sessions.length > 0 || newA.length > 0 || graded.length > 0) && (
        <div className="card space-y-2">
          <h2 className="font-black text-violet-800">📋 {t('today')}</h2>
          {sessions.map((s, i) => (
            <div key={i} className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold">💬 <b>{s.tutorName}</b> ({s.className}): “{s.parentNote}”</div>
          ))}
          {newA.length > 0 && <div className="rounded-2xl bg-violet-50 p-3 text-sm font-bold">📌 {t('newAssignments')}: {newA.map((a) => a.title).join(', ')}</div>}
          {graded.map((g, i) => (
            <div key={i} className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">✅ {g.title} — {g.overall}/100</div>
          ))}
        </div>
      )}

      <div className="card space-y-2">
        <h2 className="font-black text-violet-700">📖 {t('weeklySummaries')}</h2>
        {summaries.length === 0 && <div className="text-sm font-semibold text-slate-400">—</div>}
        {summaries.map((s) => (
          <div key={s.weekStart} className="rounded-2xl bg-violet-50 p-3 text-sm font-semibold">{lang === 'vi' ? s.bodyVi : s.bodyEn}</div>
        ))}
      </div>

      <ParentInvoices />

      <div className="card space-y-2">
        <h2 className="font-black text-violet-700">💬 {t('messages')}</h2>
        {msgs.map((m, i) => (
          <div key={i} className="text-sm"><b>{m.senderName}:</b> {m.body}</div>
        ))}
        <div className="flex gap-2">
          <input className="input" placeholder={t('messageTeacher')} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button onClick={send} className="btn-primary">{t('send')}</button>
        </div>
      </div>

      <PasswordCard lang={lang} />
    </div>
  );
}

// Password change for email-auth roles (parents, managers).
function PasswordCard({ lang }: { lang: Lang }) {
  const vi = lang === 'vi';
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');

  const change = async () => {
    setMsg('');
    try {
      await api('POST', '/auth/change-password', { current, next });
      setCurrent('');
      setNext('');
      setMsg(vi ? '✅ Đã đổi mật khẩu.' : '✅ Password changed.');
    } catch (e) {
      setMsg(
        e instanceof ApiError && e.status === 403
          ? vi ? '❌ Mật khẩu hiện tại không đúng.' : '❌ Current password is wrong.'
          : vi ? '❌ Mật khẩu mới cần từ 6 ký tự.' : '❌ New password needs 6+ characters.',
      );
    }
  };

  return (
    <details className="card !p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-extrabold text-muted">
        <Icon name="lock" size={16} /> {vi ? 'Đổi mật khẩu' : 'Change password'}
      </summary>
      <div className="mt-3 space-y-2">
        <input className="input text-sm" type="password" placeholder={vi ? 'Mật khẩu hiện tại' : 'Current password'} value={current} onChange={(e) => setCurrent(e.target.value)} />
        <input className="input text-sm" type="password" placeholder={vi ? 'Mật khẩu mới (từ 6 ký tự)' : 'New password (6+ chars)'} value={next} onChange={(e) => setNext(e.target.value)} />
        <button onClick={change} disabled={!current || next.length < 6} className="btn-primary w-full text-sm">{vi ? 'Đổi mật khẩu' : 'Change password'}</button>
        {msg && <div className="text-center text-sm font-bold">{msg}</div>}
      </div>
    </details>
  );
}

function ParentInvoices() {
  const [invoices, setInvoices] = useState<{ id: string; period: string; studentName: string; totalVnd: number; status: string; vietqr: string }[]>([]);
  const [showQr, setShowQr] = useState<string | null>(null);
  useEffect(() => {
    void api<typeof invoices>('GET', '/my/invoices').then(setInvoices).catch(() => {});
  }, []);
  if (invoices.length === 0) return null;
  return (
    <div className="card space-y-2">
      <h2 className="font-black text-violet-700">🧾 Học phí / Tuition</h2>
      {invoices.map((i) => (
        <div key={i.id} className="rounded-2xl bg-violet-50 p-3">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>{i.studentName} · Tháng {i.period}</span>
            <span className={i.status === 'paid' ? 'text-emerald-600' : i.status === 'overdue' ? 'text-rose-600' : 'text-amber-600'}>
              {i.totalVnd.toLocaleString('vi-VN')}đ · {i.status === 'paid' ? '✅ Đã đóng' : i.status === 'overdue' ? '⏰ Quá hạn' : '📌 Chờ đóng'}
            </span>
          </div>
          {i.status !== 'paid' && (
            <button onClick={() => setShowQr(showQr === i.id ? null : i.id)} className="mt-1 text-xs font-extrabold text-violet-600 underline">
              {showQr === i.id ? 'Ẩn mã chuyển khoản' : '💳 Chuyển khoản VietQR'}
            </button>
          )}
          {showQr === i.id && (
            <code className="mt-1 block break-all rounded-xl bg-white p-2 text-[10px] font-bold text-slate-500">{i.vietqr}</code>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Owner / Academic Director dashboard ----------
function OwnerDash() {
  const [finance, setFinance] = useState<{ revenue: { period: string; revenueVnd: string | number }[]; arAging: { bucket: string; outstandingVnd: string | number; invoices: number }[] } | null>(null);
  const [nps, setNps] = useState<{ responses: number; nps: number | null } | null>(null);
  const [academic, setAcademic] = useState<{ stalled: { id: string; name: string }[]; velocity: { tutorName: string; avgDelta: string | number }[] } | null>(null);
  const [escalations, setEscalations] = useState<{ studentName: string }[]>([]);

  useEffect(() => {
    void api<NonNullable<typeof finance>>('GET', '/billing/dashboard').then(setFinance).catch(() => {});
    void api<NonNullable<typeof nps>>('GET', '/nps/summary').then(setNps).catch(() => {});
    void api<NonNullable<typeof academic>>('GET', '/academic/dashboard').then(setAcademic).catch(() => {});
    void Promise.all(
      ['site_nh', 'site_tt'].map((s) => api<{ studentName: string }[]>('GET', `/escalations?siteId=${s}`).catch(() => [] as { studentName: string }[])),
    ).then((xs) => setEscalations(xs.flat()));
  }, []);

  const revenue = finance?.revenue.length ? Number(finance.revenue[finance.revenue.length - 1].revenueVnd) : null;
  const unpaid = finance ? finance.arAging.reduce((s, a) => s + a.invoices, 0) : null;
  const maxDelta = Math.max(0.01, ...(academic?.velocity.map((v) => Math.abs(Number(v.avgDelta))) ?? [0.01]));

  return (
    <div className="space-y-4">
      {escalations.length > 0 && (
        <div className="card animate-pop border-rose-300 bg-rose-50 text-center font-black text-rose-700">
          🚨 Cảnh báo vắng mặt: {escalations.map((e) => e.studentName).join(', ')}
        </div>
      )}

      <div className="rounded-3xl bg-gradient-to-br from-violet-700 to-fuchsia-600 p-5 text-white shadow-lg shadow-violet-300/40">
        <div className="text-xs font-bold text-violet-100">💰 Doanh thu tháng này</div>
        <div className="mt-1 text-4xl font-black">{revenue != null ? `${revenue.toLocaleString('vi-VN')}đ` : '—'}</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { emoji: '🧾', value: unpaid ?? '—', label: 'Hóa đơn chưa thu' },
          { emoji: '💜', value: nps?.nps ?? '—', label: `NPS · ${nps?.responses ?? 0} ý kiến` },
          { emoji: '🐢', value: academic?.stalled.length ?? '—', label: 'HS cần hỗ trợ' },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <div className="text-xl">{s.emoji}</div>
            <div className="text-2xl font-black text-violet-800">{s.value}</div>
            <div className="text-[10px] font-bold leading-tight text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {academic && academic.velocity.length > 0 && (
        <div className="card space-y-2">
          <h3 className="text-sm font-extrabold text-violet-800">📈 Tiến bộ học viên theo giáo viên <span className="font-bold text-slate-400">· 8 tuần</span></h3>
          {academic.velocity.map((v) => {
            const d = Number(v.avgDelta);
            return (
              <div key={v.tutorName} className="flex items-center gap-2 text-sm font-bold">
                <span className="w-24 shrink-0 truncate">{v.tutorName}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-violet-50">
                  <div className={`h-full rounded-full ${d >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${(Math.abs(d) / maxDelta) * 100}%` }} />
                </div>
                <span className={`w-12 text-right ${d >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{d >= 0 ? '+' : ''}{d.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Teacher ----------
function Teacher({ lang, t }: { lang: Lang; t: (k: string) => string }) {
  const [queue, setQueue] = useState<{ id: string; studentName: string; title: string; answerText?: string }[]>([]);
  const [sums, setSums] = useState<{ id: string; studentName: string; bodyEn: string; bodyVi: string }[]>([]);
  const [grading, setGrading] = useState<string | null>(null);
  const [rubric, setRubric] = useState({ accuracy: 2, vocabulary: 2, structure: 2 });
  const [comment, setComment] = useState('');

  const load = async () => {
    setQueue(await api('GET', '/grading/queue'));
    setSums(await api('GET', '/summaries/queue'));
  };
  useEffect(() => { void load(); }, []);

  const grade = async () => {
    await api('POST', `/submissions/${grading}/grade`, { rubric, comment });
    setGrading(null);
    setComment('');
    void load();
  };

  return (
    <div className="space-y-4">
      <Announcements lang={lang} canPost />
      <ClassManager />
      <QuestionBank lang={lang} />
      <div className="card space-y-2">
        <h2 className="font-black text-violet-700">✍️ {t('gradingQueue')} ({queue.length})</h2>
        {queue.map((s) => (
          <div key={s.id} className="space-y-1.5 rounded-2xl bg-violet-50 p-3">
            <div className="flex items-center justify-between font-bold">
              <span>{s.studentName} — {s.title}</span>
              <button onClick={() => setGrading(s.id)} className="btn-soft text-sm">{t('grade')}</button>
            </div>
            {s.answerText && grading === s.id && (
              <blockquote className="rounded-xl border-l-4 border-violet-300 bg-white p-2.5 text-sm font-semibold italic text-slate-600">
                “{s.answerText}”
              </blockquote>
            )}
          </div>
        ))}
        {grading && (
          <div className="space-y-2 rounded-2xl border-2 border-violet-200 p-3">
            {(['accuracy', 'vocabulary', 'structure'] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-28 text-sm font-bold">{t(k)}</span>
                {[0, 1, 2].map((v) => (
                  <button key={v} onClick={() => setRubric({ ...rubric, [k]: v })} className={`btn !px-3 !py-1 text-sm ${rubric[k] === v ? 'bg-violet-600 text-white' : 'bg-violet-100'}`}>{v}</button>
                ))}
              </div>
            ))}
            <input className="input" placeholder={t('comment')} value={comment} onChange={(e) => setComment(e.target.value)} />
            <button onClick={grade} className="btn-primary w-full">{t('grade')} ✓</button>
          </div>
        )}
      </div>

      <div className="card space-y-2">
        <h2 className="font-black text-violet-700">📖 {t('summariesQueue')} ({sums.length})</h2>
        {sums.map((s) => (
          <div key={s.id} className="rounded-2xl bg-violet-50 p-3">
            <div className="text-sm font-semibold">{lang === 'vi' ? s.bodyVi : s.bodyEn}</div>
            <button onClick={async () => { await api('POST', `/summaries/${s.id}/approve`); void load(); }} className="btn-primary mt-2 text-sm">✓ {t('approve')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Kiosk (offline-first) ----------
interface QueuedEvent {
  clientEventId: string;
  type: 'check_in' | 'check_out';
  studentId: string;
  at: string;
  releasedToName?: string;
}

function Kiosk({ me, t }: { me: Me; t: (k: string) => string }) {
  const siteId = me.siteId ?? 'site_nh';
  const [roster, setRoster] = useState<{ id: string; name: string; className: string; status: string }[]>([]);
  const [escalations, setEscalations] = useState<{ studentName: string }[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [queueLen, setQueueLen] = useState(0);

  const qKey = 'etop-kiosk-queue';
  const getQueue = (): QueuedEvent[] => JSON.parse(localStorage.getItem(qKey) ?? '[]');
  const setQueue = (q: QueuedEvent[]) => { localStorage.setItem(qKey, JSON.stringify(q)); setQueueLen(q.length); };

  const load = async () => {
    try {
      setRoster(await api('GET', `/attendance/today?siteId=${siteId}`));
      setEscalations(await api<{ studentName: string }[]>('GET', `/escalations?siteId=${siteId}`).catch(() => [] as { studentName: string }[]));
      setOnline(true);
    } catch {
      setOnline(false);
    }
  };

  const flush = async () => {
    const q = getQueue();
    if (q.length === 0) return;
    try {
      await api('POST', '/kiosk/sync', { siteId, events: q });
      setQueue([]);
      setOnline(true);
      void load();
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    setQueueLen(getQueue().length);
    void load();
    void flush();
    const iv = setInterval(() => { void flush(); void load(); }, 15000);
    const on = () => { setOnline(true); void flush(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { clearInterval(iv); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enqueue = (ev: QueuedEvent) => {
    setQueue([...getQueue(), ev]);
    // Optimistic local update so the kiosk works fully offline.
    setRoster(roster.map((r) => (r.id === ev.studentId ? { ...r, status: ev.type === 'check_in' ? 'present' : 'released' } : r)));
    void flush();
  };

  // Verified dismissal (D20): pickup person + PIN when online; logged
  // ID-check fallback that also works offline.
  const [dismissing, setDismissing] = useState<{ id: string; name: string } | null>(null);
  const [pickups, setPickups] = useState<{ id: string; name: string; relation: string; blocked: boolean }[]>([]);
  const [pin, setPin] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [otherName, setOtherName] = useState('');
  const [dismissErr, setDismissErr] = useState('');

  const tap = (s: { id: string; name: string; status: string }) => {
    if (s.status === 'expected') {
      enqueue({ clientEventId: `kio_${Date.now()}_${s.id}`, type: 'check_in', studentId: s.id, at: new Date().toISOString() });
    } else if (s.status === 'present') {
      setDismissing(s);
      setPickups([]);
      setPin('');
      setChosen(null);
      setOtherName('');
      setDismissErr('');
      void api<typeof pickups>('GET', `/students/${s.id}/pickups`).then(setPickups).catch(() => setPickups([]));
    }
  };

  const confirmDismiss = async () => {
    if (!dismissing) return;
    setDismissErr('');
    if (chosen) {
      // PIN-verified path: requires the server (a verification, not a record).
      try {
        await api('POST', '/attendance/dismiss', {
          studentId: dismissing.id, siteId, clientEventId: `kio_${Date.now()}_${dismissing.id}`,
          at: new Date().toISOString(), pickupPersonId: chosen, pin,
        });
        setDismissing(null);
        void load();
      } catch (e) {
        const reason = e instanceof ApiError ? (e.body as { reason?: string }).reason : '';
        if (reason === 'blocked_pickup') setDismissErr('⛔ NGƯỜI NÀY BỊ CẤM ĐÓN — KHÔNG TRẢ TRẺ. Quản lý đã được báo động.');
        else if (reason === 'pin_invalid') setDismissErr('Mã PIN sai. Thử lại hoặc kiểm tra giấy tờ.');
        else setDismissErr('Không kết nối được máy chủ — dùng "Người khác (kiểm tra giấy tờ)" để ghi nhận ngoại tuyến.');
      }
    } else if (otherName.trim()) {
      // Logged ID-check path: offline-safe via the queue.
      enqueue({ clientEventId: `kio_${Date.now()}_${dismissing.id}`, type: 'check_out', studentId: dismissing.id, at: new Date().toISOString(), releasedToName: `${otherName.trim()} (đã kiểm tra giấy tờ)` });
      setDismissing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`card text-center font-black ${online ? 'text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>
        {online ? `🟢 ${t('online')}` : `🟡 ${t('offlineQueued')}`} {queueLen > 0 && `· ${queueLen} ⏳`}
      </div>
      {escalations.length > 0 && (
        <div className="card border-rose-300 bg-rose-50 font-black text-rose-700">
          🚨 {t('escalations')}: {escalations.map((e) => e.studentName).join(', ')}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {roster.map((s) => (
          <button
            key={s.id}
            onClick={() => tap(s)}
            className={`kiosk-btn ${s.status === 'present' ? 'bg-emerald-100 text-emerald-800' : s.status === 'released' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-800'}`}
          >
            <div>{s.name}</div>
            <div className="text-xs font-bold">{s.className} · {s.status === 'present' ? `✅ ${t('dismiss')}?` : s.status === 'released' ? '🏠' : t('checkIn')}</div>
          </button>
        ))}
      </div>

      {dismissing && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-white p-5">
            <h3 className="text-lg font-black">🏠 Trả học sinh: {dismissing.name}</h3>
            {dismissErr && <div className={`rounded-2xl p-3 text-sm font-black ${dismissErr.startsWith('⛔') ? 'bg-rose-100 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{dismissErr}</div>}
            <div className="space-y-2">
              {pickups.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setChosen(p.id); setOtherName(''); }}
                  className={`block w-full rounded-2xl border-2 p-3 text-left font-bold ${p.blocked ? 'border-rose-400 bg-rose-50 text-rose-700' : chosen === p.id ? 'border-violet-500 bg-violet-50' : 'border-violet-100'}`}
                >
                  {p.blocked ? '⛔ ' : '👤 '}{p.name} <span className="text-xs font-semibold text-slate-400">({p.relation})</span>
                  {p.blocked && <span className="block text-xs font-black">BỊ CẤM ĐÓN — không trả trẻ</span>}
                </button>
              ))}
              {chosen && (
                <input
                  className="input text-center text-2xl font-black tracking-widest"
                  placeholder="Mã PIN"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              )}
              <input
                className="input"
                placeholder="Người khác — ghi tên (đã kiểm tra giấy tờ)"
                value={otherName}
                onChange={(e) => { setOtherName(e.target.value); setChosen(null); }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDismissing(null)} className="btn-soft flex-1">Hủy</button>
              <button onClick={confirmDismiss} disabled={!(chosen && pin.length >= 4) && !otherName.trim()} className="btn-primary flex-1">
                ✅ Xác nhận trả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [lang, setLang, t] = useT();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const loadMe = async () => {
    if (!hasToken()) { setReady(true); return; }
    try {
      setMe(await api<Me>('GET', '/me'));
    } catch {
      setToken('');
    }
    setReady(true);
  };
  useEffect(() => { void loadMe(); }, []);

  if (!ready) return null;
  if (!me) return <Landing onDone={() => void loadMe()} />;

  const logout = () => { setToken(''); setMe(null); };

  return (
    <div className="min-h-screen pb-10">
      <Header me={me} lang={lang} setLang={setLang} t={t} onLogout={logout} />
      <main key={me.role} className="animate-rise mx-auto max-w-3xl space-y-4 p-4">
        {me.role === 'student' && <Student lang={lang} t={t} name={me.name} />}
        {me.role === 'parent' && <Parent lang={lang} t={t} />}
        {['owner', 'academic_director'].includes(me.role) && (
          <>
            <OwnerDash />
            <AdminPanel lang={lang} />
          </>
        )}
        {['tutor', 'academic_director', 'owner'].includes(me.role) && <Teacher lang={lang} t={t} />}
        {me.role === 'front_desk' && <Kiosk me={me} t={t} />}
      </main>
    </div>
  );
}
