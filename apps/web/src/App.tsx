import { useEffect, useState } from 'react';
import { api, ApiError, hasToken, setToken, type Me } from './api';
import { makeT, type Lang } from './i18n';
import { Player } from './Player';
import { Landing } from './Landing';
import { ClassManager } from './ClassManager';

// Phase 4 portal: state-routed views per role on the real API.

function useT(): [Lang, (l: Lang) => void, (k: string) => string] {
  const [lang, setLang] = useState<Lang>((localStorage.getItem('etop-lang') as Lang) || 'vi');
  const set = (l: Lang) => {
    localStorage.setItem('etop-lang', l);
    setLang(l);
  };
  return [lang, set, makeT(lang)];
}

function Header({ me, lang, setLang, t, onLogout }: { me: Me; lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string; onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-violet-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="text-lg font-black text-violet-700">⭐ Anh Ngữ E’TOP <span className="text-xs font-bold text-slate-400">· {me.name}</span></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase text-violet-700">{lang}</button>
          <button onClick={onLogout} className="text-xs font-bold text-slate-400">{t('logout')}</button>
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
function Student({ t }: { t: (k: string) => string }) {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [ach, setAch] = useState<{ points: number; streak: number } | null>(null);
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

  return (
    <div className="space-y-4">
      {ach && (
        <div className="card flex gap-4 font-black text-violet-700">
          <span>⭐ {ach.points} {t('points')}</span>
          <span>🔥 {ach.streak} {t('dayStreak')}</span>
        </div>
      )}
      <h2 className="font-black">{t('myClasses')}</h2>
      {classes.map((c) => (
        <div key={c.id} className="card space-y-2">
          <div className="font-extrabold">🏫 Lớp {c.name}</div>
          <div className="text-xs font-bold text-slate-400">
            👩‍🏫 GV chủ nhiệm: {c.teacherName ?? '—'}{c.scheduleNote ? ` · 🗓 ${c.scheduleNote}` : ''}
          </div>
          {(assignments[c.id] ?? []).map((a) => (
            <button key={a.id} onClick={() => setPlaying(a.id)} className="flex w-full items-center justify-between rounded-2xl bg-violet-50 p-3 font-bold hover:bg-violet-100">
              <span>📝 {a.title}</span>
              <span className="text-xs text-slate-400">
                {a.myStatus === 'graded' ? `✅ ${t('graded')}` : a.myStatus === 'submitted' ? `📨 ${t('submitted')}` : a.myStatus === 'in_progress' ? `▶ ${t('continue')}` : `▶ ${t('start')}`}
              </span>
            </button>
          ))}
        </div>
      ))}
      <div className="card space-y-2">
        <div className="text-sm font-extrabold text-violet-700">🔑 {t('joinClass')}</div>
        <div className="flex gap-2">
          <input className="input uppercase" placeholder="BEAR42" value={code} onChange={(e) => setCode(e.target.value)} />
          <button onClick={join} className="btn-primary">{t('join')}</button>
        </div>
        {joinMsg && <div className="text-sm font-bold">{joinMsg}</div>}
      </div>
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

  return (
    <div className="space-y-4">
      {children.length > 1 && (
        <div className="flex gap-2">
          {children.map((c) => (
            <button key={c.id} onClick={() => setChildId(c.id)} className={`btn text-sm ${c.id === childId ? 'bg-violet-600 text-white' : 'bg-white'}`}>{c.name}</button>
          ))}
        </div>
      )}
      <div className="card space-y-2">
        <h2 className="font-black text-violet-700">📋 {t('today')}</h2>
        <div className="font-bold">
          {att?.checkOutAt ? `🏠 ${t('releasedTo')}: ${att.releasedTo}` : att?.checkInAt ? `✅ ${t('checkedIn')} ${new Date(att.checkInAt).toLocaleTimeString()}` : `⏳ ${t('notArrived')}`}
        </div>
        {sessions.map((s, i) => (
          <div key={i} className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold">💬 {s.tutorName} ({s.className}): “{s.parentNote}”</div>
        ))}
        {newA.length > 0 && <div className="text-sm font-bold">📌 {t('newAssignments')}: {newA.map((a) => a.title).join(', ')}</div>}
        {graded.map((g, i) => (
          <div key={i} className="text-sm font-bold text-emerald-700">✅ {t('gradedToday')}: {g.title} — {g.overall}/100</div>
        ))}
        {practice && <div className="text-sm font-bold">🎮 {t('practiceToday')}: +{practice.points} ⭐</div>}
      </div>

      <div className="card space-y-2">
        <h2 className="font-black text-violet-700">📖 {t('weeklySummaries')}</h2>
        {summaries.length === 0 && <div className="text-sm font-semibold text-slate-400">—</div>}
        {summaries.map((s) => (
          <div key={s.weekStart} className="rounded-2xl bg-violet-50 p-3 text-sm font-semibold">{lang === 'vi' ? s.bodyVi : s.bodyEn}</div>
        ))}
      </div>

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
    </div>
  );
}

// ---------- Teacher ----------
function Teacher({ lang, t }: { lang: Lang; t: (k: string) => string }) {
  const [queue, setQueue] = useState<{ id: string; studentName: string; title: string }[]>([]);
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
      <ClassManager />
      <div className="card space-y-2">
        <h2 className="font-black text-violet-700">✍️ {t('gradingQueue')} ({queue.length})</h2>
        {queue.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-2xl bg-violet-50 p-3 font-bold">
            <span>{s.studentName} — {s.title}</span>
            <button onClick={() => setGrading(s.id)} className="btn-soft text-sm">{t('grade')}</button>
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

  const tap = (s: { id: string; status: string }) => {
    if (s.status === 'expected') {
      enqueue({ clientEventId: `kio_${Date.now()}_${s.id}`, type: 'check_in', studentId: s.id, at: new Date().toISOString() });
    } else if (s.status === 'present') {
      const name = prompt('Released to (tên người đón + giấy tờ đã kiểm tra):');
      if (name) enqueue({ clientEventId: `kio_${Date.now()}_${s.id}`, type: 'check_out', studentId: s.id, at: new Date().toISOString(), releasedToName: name });
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
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {me.role === 'student' && <Student t={t} />}
        {me.role === 'parent' && <Parent lang={lang} t={t} />}
        {['tutor', 'academic_director', 'owner'].includes(me.role) && <Teacher lang={lang} t={t} />}
        {me.role === 'front_desk' && <Kiosk me={me} t={t} />}
      </main>
    </div>
  );
}
