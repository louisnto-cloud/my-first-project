import { Link, Outlet } from 'react-router-dom';
import { useApp } from '../../store';
import { useI18n } from '../../i18n';
import { Header } from '../../components/ui';
import { avgPct, studentsInClass } from '../../lib';

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

      <button onClick={resetDemo} className="text-xs font-bold text-slate-300 underline hover:text-slate-400">
        {t('common.resetDemo')}
      </button>
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
