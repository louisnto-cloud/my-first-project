import { useApp } from '../store';
import { fmtDate, useI18n, WEEKDAYS } from '../i18n';
import { BADGES, badgeStats, leaderboard, scoresOf, todayISO } from '../lib';
import { Empty, Pill, ProgressChart, scoreColor, SkillBars } from './ui';

export function GradesView({ studentId }: { studentId: string }) {
  const { db } = useApp();
  const { t, lang } = useI18n();
  const xs = scoresOf(db, studentId);
  if (xs.length === 0) return <Empty emoji="📝" text={t('grades.empty')} />;

  const chartPoints = xs.map((x) => ({
    label: x.assessment.title,
    pct: (x.score.score / x.assessment.maxScore) * 100,
  }));
  const latestTest = [...xs].reverse().find((x) => x.score.skills);
  const latestComment = [...xs].reverse().find((x) => x.score.comment);

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="mb-1 font-extrabold text-violet-700">📈 {t('grades.progress')}</h3>
        <ProgressChart points={chartPoints} />
      </div>

      {latestTest?.score.skills && (
        <div className="card">
          <h3 className="mb-3 font-extrabold text-violet-700">💪 {t('grades.skills')}</h3>
          <SkillBars skills={latestTest.score.skills} />
        </div>
      )}

      {latestComment?.score.comment && (
        <div className="card border-amber-200 bg-amber-50">
          <h3 className="mb-1 font-extrabold text-amber-700">💬 {t('grades.teacherComment')}</h3>
          <p className="text-sm font-semibold text-slate-700">“{latestComment.score.comment}”</p>
          <p className="mt-1 text-xs font-bold text-amber-600">
            {latestComment.assessment.title} · {fmtDate(latestComment.assessment.date, lang)}
          </p>
        </div>
      )}

      <div className="card">
        <h3 className="mb-2 font-extrabold text-violet-700">🗂️ {t('grades.history')}</h3>
        <ul className="divide-y divide-violet-50">
          {[...xs].reverse().map((x) => {
            const pct = (x.score.score / x.assessment.maxScore) * 100;
            return (
              <li key={x.score.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-bold">{x.assessment.title}</div>
                  <div className="text-xs font-semibold text-slate-400">
                    {fmtDate(x.assessment.date, lang)} · {t(`teach.kind.${x.assessment.kind}`)}
                  </div>
                </div>
                <div className={`text-lg font-black ${scoreColor(pct)}`}>
                  {x.score.score}
                  <span className="text-xs font-bold text-slate-300">/{x.assessment.maxScore}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function ScheduleView({ classIds }: { classIds: string[] }) {
  const { db } = useApp();
  const { t, lang } = useI18n();
  const classes = db.classes.filter((c) => classIds.includes(c.id));
  const slots = classes
    .flatMap((c) => c.schedule.map((s) => ({ cls: c, slot: s })))
    .sort((a, b) => a.slot.weekday - b.slot.weekday || a.slot.start.localeCompare(b.slot.start));
  const today = new Date().getDay();

  if (slots.length === 0) return <Empty emoji="📅" text={t('dash.noClass')} />;

  return (
    <div className="card">
      <h3 className="mb-2 font-extrabold text-violet-700">📅 {t('schedule.thisWeek')}</h3>
      <ul className="space-y-2">
        {slots.map(({ cls, slot }, i) => {
          const teacher = db.users.find((u) => u.id === cls.teacherId);
          const isToday = slot.weekday === today;
          return (
            <li key={i} className={`flex items-center gap-3 rounded-2xl p-3 ${isToday ? 'bg-violet-600 text-white' : 'bg-violet-50'}`}>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${cls.color}`}>{cls.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold">{cls.name}</div>
                <div className={`text-xs font-semibold ${isToday ? 'text-violet-100' : 'text-slate-400'}`}>
                  {teacher?.name} · {t('common.room')} {slot.room}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black">{WEEKDAYS[lang][slot.weekday]}</div>
                <div className={`text-xs font-bold ${isToday ? 'text-violet-100' : 'text-slate-400'}`}>
                  {slot.start}–{slot.end}
                </div>
                {isToday && <Pill className="mt-0.5 bg-white/20 text-white">{t('common.today')}</Pill>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HomeworkView({ studentId, canToggle }: { studentId: string; canToggle: boolean }) {
  const { db, mutate } = useApp();
  const { t, lang } = useI18n();
  const student = db.users.find((u) => u.id === studentId);
  const items = db.homework
    .filter((h) => student?.classIds.includes(h.classId))
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  if (items.length === 0) return <Empty emoji="🎈" text={t('hw.empty')} />;

  const statusOf = (hwId: string) => db.homeworkStatus.find((s) => s.homeworkId === hwId && s.studentId === studentId)?.done ?? false;

  const toggle = (hwId: string) => {
    mutate((d) => {
      const existing = d.homeworkStatus.find((s) => s.homeworkId === hwId && s.studentId === studentId);
      if (existing) {
        existing.done = !existing.done;
        existing.doneAt = existing.done ? todayISO() : undefined;
      } else {
        d.homeworkStatus.push({ homeworkId: hwId, studentId, done: true, doneAt: todayISO() });
      }
      const nowDone = d.homeworkStatus.find((s) => s.homeworkId === hwId && s.studentId === studentId)?.done;
      if (nowDone) {
        d.practice.push({ id: `hw_${hwId}_${studentId}_${Date.now()}`, studentId, date: todayISO(), type: 'homework', points: 5 });
      }
    });
  };

  const today = todayISO();

  return (
    <div className="space-y-3">
      {items.map((hw) => {
        const done = statusOf(hw.id);
        const overdue = !done && hw.dueDate < today;
        const cls = db.classes.find((c) => c.id === hw.classId);
        return (
          <div key={hw.id} className={`card ${done ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-extrabold">{hw.title}</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-400">
                  {cls?.emoji} {cls?.name}
                </div>
              </div>
              {done ? (
                <Pill className="bg-emerald-100 text-emerald-700">✅ {t('hw.done')}</Pill>
              ) : overdue ? (
                <Pill className="bg-rose-100 text-rose-700">⏰ {t('hw.overdue')}</Pill>
              ) : (
                <Pill className="bg-amber-100 text-amber-700">📌 {t('hw.todo')}</Pill>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">{hw.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                {t('hw.due')}: {fmtDate(hw.dueDate, lang)}
              </span>
              {canToggle && !done && (
                <button onClick={() => toggle(hw.id)} className="btn-primary text-sm">
                  {t('hw.markDone')} <span className="text-xs opacity-80">{t('hw.points')}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BadgesView({ studentId }: { studentId: string }) {
  const { db } = useApp();
  const { t, lang } = useI18n();
  const stats = badgeStats(db, studentId);
  return (
    <div className="card">
      <h3 className="mb-3 font-extrabold text-violet-700">🏅 {t('badges.title')}</h3>
      <div className="grid grid-cols-4 gap-3">
        {BADGES.map((b) => {
          const earned = b.earned(stats);
          return (
            <div key={b.id} className="flex flex-col items-center text-center" title={lang === 'vi' ? b.descVi : b.descEn}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${earned ? 'bg-amber-100' : 'bg-slate-100 grayscale opacity-40'}`}>
                {b.emoji}
              </div>
              <div className="mt-1 text-[10px] font-bold leading-tight text-slate-500">
                {earned ? (lang === 'vi' ? b.nameVi : b.nameEn) : t('badges.locked')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeaderboardView({ classId, highlightId }: { classId: string; highlightId?: string }) {
  const { db } = useApp();
  const { t } = useI18n();
  const rows = leaderboard(db, classId).slice(0, 5);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="card">
      <h3 className="mb-2 font-extrabold text-violet-700">🏆 {t('dash.leaderboard')}</h3>
      <ul className="space-y-1">
        {rows.map((row, i) => (
          <li
            key={row.user.id}
            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${row.user.id === highlightId ? 'bg-violet-100' : ''}`}
          >
            <span className="w-6 text-center text-sm">{medals[i] ?? `${i + 1}.`}</span>
            <span className="text-lg">{row.user.avatar}</span>
            <span className="flex-1 truncate text-sm font-bold">{row.user.name}</span>
            <span className="text-sm font-black text-violet-600">{row.points}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
