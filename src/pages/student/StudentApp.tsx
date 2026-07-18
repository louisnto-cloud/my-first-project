import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../../store';
import { fmtDate, useI18n, WEEKDAYS } from '../../i18n';
import { Empty, Header, Pill, scoreColor, TabBar, WeekRing } from '../../components/ui';
import { BadgesView, GradesView, HomeworkView, LeaderboardView, ScheduleView } from '../../components/views';
import { FlashcardSession, QuizSession } from '../../components/Flashcards';
import { FeedbackSection } from '../../components/Feedback';
import { StreakCelebration } from '../../components/StreakCelebration';
import { pointsOf, practicedListToday, practicedToday, scoresOf, streakOf, todayISO, weekPractice } from '../../lib';
import type { VocabList } from '../../types';

export function StudentLayout() {
  const { t } = useI18n();
  const { user } = useApp();
  return (
    <div className="min-h-screen pb-24">
      <Header subtitle={user?.name} />
      <main id="main" className="mx-auto max-w-3xl p-4" tabIndex={-1}>
        <Outlet />
      </main>
      <StreakCelebration />
      <TabBar
        items={[
          { to: '/app', emoji: '🏠', label: t('nav.home'), end: true },
          { to: '/app/grades', emoji: '📊', label: t('nav.grades') },
          { to: '/app/schedule', emoji: '📅', label: t('nav.schedule') },
          { to: '/app/homework', emoji: '📚', label: t('nav.homework') },
          { to: '/app/practice', emoji: '🎮', label: t('nav.practice') },
        ]}
      />
    </div>
  );
}

export function Dashboard() {
  const { db, user } = useApp();
  const { t, lang } = useI18n();
  if (!user) return null;

  const points = pointsOf(db, user.id);
  const streak = streakOf(db, user.id);
  const doneToday = practicedToday(db, user.id);
  const xs = scoresOf(db, user.id);
  const latest = xs[xs.length - 1];

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const slots = db.classes
    .filter((c) => user.classIds.includes(c.id))
    .flatMap((c) => c.schedule.map((s) => ({ cls: c, slot: s })));
  let nextSlot: { cls: (typeof slots)[number]['cls']; slot: (typeof slots)[number]['slot']; dist: number } | null = null;
  for (const { cls, slot } of slots) {
    const [h, m] = slot.start.split(':').map(Number);
    let dist = ((slot.weekday - now.getDay() + 7) % 7) * 1440 + (h * 60 + m) - nowMin;
    if (dist < 0) dist += 7 * 1440;
    if (!nextSlot || dist < nextSlot.dist) nextSlot = { cls, slot, dist };
  }

  const today = todayISO();
  const dueSoon = db.homework
    .filter((h) => user.classIds.includes(h.classId))
    .filter((h) => !db.homeworkStatus.some((s) => s.homeworkId === h.id && s.studentId === user.id && s.done))
    .filter((h) => h.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-3xl">{user.avatar}</div>
        <div>
          <h1 className="text-xl font-black">
            {t('dash.hello')}, {user.name.split(' ').pop()}! 👋
          </h1>
          <div className="flex gap-2">
            <Pill className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">⭐ {points} {t('common.points')}</Pill>
            <Pill className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300">🔥 {streak} {t('common.dayStreak')}</Pill>
          </div>
        </div>
      </div>

      <div className={`card ${doneToday ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10' : 'border-orange-200 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10'}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300 dark:text-slate-600">{doneToday ? t('dash.streakSafe') : t('dash.keepStreak')}</p>
          {!doneToday && (
            <Link to="/app/practice" className="btn-primary shrink-0 text-sm">
              {t('dash.practiceNow')} 🎮
            </Link>
          )}
        </div>
        <div className="mt-3 border-t border-white/60 pt-3">
          <WeekRing days={weekPractice(db, user.id)} labels={t('dash.weekLabels').split(',')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/app/schedule" className="card hover:border-violet-300">
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500">⏰ {t('dash.nextClass')}</div>
          {nextSlot ? (
            <>
              <div className="mt-1 truncate font-extrabold">{nextSlot.cls.emoji} {nextSlot.cls.name}</div>
              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {WEEKDAYS[lang][nextSlot.slot.weekday]} {nextSlot.slot.start} · {t('common.room')} {nextSlot.slot.room}
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm font-semibold text-slate-400 dark:text-slate-500">{t('dash.noClass')}</div>
          )}
        </Link>
        <Link to="/app/grades" className="card hover:border-violet-300">
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500">✨ {t('dash.latestScore')}</div>
          {latest ? (
            <>
              <div className={`mt-1 text-2xl font-black ${scoreColor((latest.score.score / latest.assessment.maxScore) * 100)}`}>
                {latest.score.score}
                <span className="text-sm text-slate-300 dark:text-slate-600">/{latest.assessment.maxScore}</span>
              </div>
              <div className="truncate text-xs font-semibold text-slate-400 dark:text-slate-500">{latest.assessment.title}</div>
            </>
          ) : (
            <div className="mt-1 text-sm font-semibold text-slate-400 dark:text-slate-500">{t('dash.noScores')}</div>
          )}
        </Link>
      </div>

      <div className="card">
        <h3 className="mb-2 font-extrabold text-violet-700 dark:text-violet-300">📌 {t('dash.homeworkDue')}</h3>
        {dueSoon.length === 0 ? (
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{t('dash.allDone')}</p>
        ) : (
          <ul className="space-y-1.5">
            {dueSoon.slice(0, 3).map((hw) => (
              <li key={hw.id}>
                <Link to="/app/homework" className="flex items-center justify-between rounded-xl bg-violet-50 dark:bg-slate-700/60 px-3 py-2 text-sm font-bold hover:bg-violet-100">
                  <span className="truncate">{hw.title}</span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{t('hw.due')} {fmtDate(hw.dueDate, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BadgesView studentId={user.id} />
      {user.classIds[0] && <LeaderboardView classId={user.classIds[0]} highlightId={user.id} />}

      <Link to="/app/feedback" className="card flex items-center justify-between gap-3 hover:border-violet-300">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <div className="text-sm font-extrabold">{t('feedback.cta')}</div>
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">{t('feedback.subtitle')}</div>
          </div>
        </div>
        <span className="text-violet-400 dark:text-violet-500">→</span>
      </Link>
    </div>
  );
}

export function FeedbackPage() {
  const { user } = useApp();
  const { t } = useI18n();
  if (!user) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">💬 {t('feedback.title')}</h1>
      <FeedbackSection userId={user.id} />
    </div>
  );
}

export function Grades() {
  const { user } = useApp();
  const { t } = useI18n();
  if (!user) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">📊 {t('grades.title')}</h1>
      <GradesView studentId={user.id} />
    </div>
  );
}

export function Schedule() {
  const { user } = useApp();
  const { t } = useI18n();
  if (!user) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">📅 {t('schedule.title')}</h1>
      <ScheduleView classIds={user.classIds} />
    </div>
  );
}

export function Homework() {
  const { user } = useApp();
  const { t } = useI18n();
  if (!user) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">📚 {t('hw.title')}</h1>
      <HomeworkView studentId={user.id} canToggle />
    </div>
  );
}

type Mode =
  | { kind: 'pick' }
  | { kind: 'preview'; list: VocabList }
  | { kind: 'flash'; list: VocabList }
  | { kind: 'quiz'; list: VocabList };

export function Practice() {
  const { db, user } = useApp();
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<Mode>({ kind: 'pick' });
  if (!user) return null;

  const lists = db.vocabLists.filter((v) => user.classIds.includes(v.classId));
  const anyToday = practicedListToday(db, user.id);

  if (mode.kind === 'flash') return <FlashcardSession list={mode.list} studentId={user.id} onExit={() => setMode({ kind: 'pick' })} />;
  if (mode.kind === 'quiz') return <QuizSession list={mode.list} studentId={user.id} onExit={() => setMode({ kind: 'pick' })} />;
  if (mode.kind === 'preview') {
    const list = mode.list;
    return (
      <div className="space-y-3">
        <button onClick={() => setMode({ kind: 'pick' })} className="text-sm font-bold text-violet-600 dark:text-violet-300">
          ← {t('common.back')}
        </button>
        <h1 className="text-xl font-black">📖 {list.title}</h1>
        <p className="-mt-2 text-sm font-semibold text-slate-400 dark:text-slate-500">
          {list.words.length} {t('practice.words')}
        </p>
        <ul className="space-y-2">
          {list.words.map((w) => (
            <li key={w.id} className="card">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-base font-black text-violet-700 dark:text-violet-300">{w.term}</div>
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-600">{lang === 'vi' ? w.meaningVi : w.meaningVi}</div>
              </div>
              {w.example && <p className="mt-1 text-xs italic text-slate-500">"{w.example}"</p>}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={() => setMode({ kind: 'flash', list })} className="btn-soft text-sm">
            🃏 {t('practice.flashcards')}
          </button>
          <button onClick={() => setMode({ kind: 'quiz', list })} className="btn-primary text-sm">
            ❓ {t('practice.quiz')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">🎮 {t('practice.title')}</h1>
      <p className="-mt-2 text-sm font-semibold text-slate-400 dark:text-slate-500">{t('practice.subtitle')}</p>
      {lists.length === 0 && <Empty emoji="📖" text={t('grades.empty')} />}
      {lists.map((list) => (
        <div key={list.id} className="card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-extrabold">{list.title}</div>
              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {list.words.length} {t('practice.words')}
              </div>
            </div>
            {anyToday && <Pill className="bg-emerald-100 text-emerald-700">✓ {t('practice.doneToday')}</Pill>}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button onClick={() => setMode({ kind: 'preview', list })} className="btn-soft text-sm">
              📖 {t('practice.preview')}
            </button>
            <button onClick={() => setMode({ kind: 'flash', list })} className="btn-soft text-sm">
              🃏 {t('practice.flashcards')}
            </button>
            <button onClick={() => setMode({ kind: 'quiz', list })} className="btn-primary text-sm">
              ❓ {t('practice.quiz')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
