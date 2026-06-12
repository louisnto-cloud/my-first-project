import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../../store';
import { fmtDate, useI18n } from '../../i18n';
import { Header } from '../../components/ui';
import { FeedbackInbox } from '../../components/Feedback';
import { EVENT_ICONS } from '../../components/views';
import { avgPct, studentsInClass, todayISO, uid } from '../../lib';
import type { CenterEvent } from '../../types';

export function TeachLayout() {
  const { user } = useApp();
  const { t } = useI18n();
  const role = user?.role === 'admin' ? t('login.demo.owner') : t('login.demo.teacher');
  return (
    <div className="min-h-screen pb-10">
      <Header subtitle={`${role} · ${user?.name ?? ''}`} />
      <main className="mx-auto max-w-3xl p-4">
        <Outlet />
      </main>
    </div>
  );
}

export function TeachHome() {
  const { db, user, resetDemo } = useApp();
  const { t } = useI18n();
  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const myClasses = isAdmin ? db.classes : db.classes.filter((c) => user.classIds.includes(c.id));
  const students = db.users.filter((u) => u.role === 'student');

  const allPcts = students
    .map((s) => avgPct(db, s.id))
    .filter((x): x is number => x != null);
  const centerAvg = allPcts.length ? allPcts.reduce((a, b) => a + b, 0) / allPcts.length : 0;
  const hwRate = db.homeworkStatus.filter((h) => h.done).length / Math.max(1, db.homework.length * (students.length / db.classes.length));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">🧑‍🏫 {t('teach.overview')}</h1>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard emoji="🧑‍🎓" label={t('teach.totalStudents')} value={String(students.length)} />
          <StatCard emoji="🏫" label={t('teach.classes')} value={String(db.classes.length)} />
          <StatCard emoji="📊" label={t('teach.centerAvg')} value={`${(centerAvg / 10).toFixed(1)}/10`} />
          <StatCard emoji="📚" label={t('teach.hwRate')} value={`${Math.round(Math.min(1, hwRate) * 100)}%`} />
        </div>
      )}

      <h2 className="text-lg font-black">{isAdmin ? t('teach.allClasses') : t('teach.myClasses')}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {myClasses.map((cls) => {
          const roster = studentsInClass(db, cls.id);
          const pcts = roster.map((s) => avgPct(db, s.id)).filter((x): x is number => x != null);
          const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length / 10 : null;
          const teacher = db.users.find((u) => u.id === cls.teacherId);
          return (
            <Link key={cls.id} to={`/teach/class/${cls.id}`} className="card flex items-center gap-3 hover:border-violet-300">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${cls.color}`}>{cls.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-extrabold">{cls.name}</div>
                <div className="text-xs font-semibold text-slate-400">
                  {cls.level} · {teacher?.name} · {roster.length} {t('common.students')}
                </div>
              </div>
              {avg != null && (
                <div className="text-right">
                  <div className="text-lg font-black text-violet-600">{avg.toFixed(1)}</div>
                  <div className="text-[10px] font-bold text-slate-400">{t('teach.avgScore')}</div>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <EventsManager />

      {isAdmin && <FeedbackInbox />}

      <button onClick={resetDemo} className="text-xs font-bold text-slate-300 underline hover:text-slate-400">
        {t('common.resetDemo')}
      </button>
    </div>
  );
}

function EventsManager() {
  const { db, mutate, user } = useApp();
  const { t, lang } = useI18n();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [kind, setKind] = useState<CenterEvent['kind']>('meeting');
  const [classId, setClassId] = useState('');
  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const myClasses = isAdmin ? db.classes : db.classes.filter((c) => user.classIds.includes(c.id));
  const today = todayISO();
  const visible = db.events
    .filter((e) => isAdmin || !e.classId || user.classIds.includes(e.classId))
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const add = () => {
    if (!title.trim()) return;
    mutate((d) =>
      d.events.push({ id: uid('ev'), title: title.trim(), date, time: time || undefined, kind, classId: classId || undefined }),
    );
    setTitle('');
    setTime('');
  };

  return (
    <div className="card space-y-3">
      <h3 className="font-extrabold text-violet-700">📣 {t('events.manage')}</h3>
      <div className="space-y-2 rounded-2xl bg-violet-50 p-3">
        <input className="input" placeholder={t('events.titlePh')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <input className="input !w-auto flex-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="input !w-28" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto flex-1" value={kind} onChange={(e) => setKind(e.target.value as CenterEvent['kind'])}>
            {(['meeting', 'test', 'holiday', 'activity'] as const).map((k) => (
              <option key={k} value={k}>{EVENT_ICONS[k]} {t(`events.kind.${k}`)}</option>
            ))}
          </select>
          <select className="input !w-auto flex-1" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {isAdmin && <option value="">{t('events.allCenter')}</option>}
            {!isAdmin && myClasses.length > 1 && <option value="">{t('events.allCenter')}</option>}
            {myClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
          <button onClick={add} className="btn-primary text-sm">{t('events.add')}</button>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm font-semibold text-slate-400">{t('events.none')}</p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((e) => {
            const cls = e.classId ? db.classes.find((c) => c.id === e.classId) : null;
            return (
              <li key={e.id} className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-sm font-bold">
                <span>{EVENT_ICONS[e.kind]}</span>
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="shrink-0 text-xs font-semibold text-slate-400">
                  {cls ? cls.emoji : '🏫'} {fmtDate(e.date, lang)}{e.time ? ` · ${e.time}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl">{emoji}</div>
      <div className="text-xl font-black text-violet-700">{value}</div>
      <div className="text-[11px] font-bold text-slate-400">{label}</div>
    </div>
  );
}
