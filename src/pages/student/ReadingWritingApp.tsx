import { useMemo, useState } from 'react';
import { CURRICULUM, MONTH_COLORS, getAllLessons } from '../../data/curriculum';
import type { Lesson, Month } from '../../data/curriculum';
import { useApp } from '../../store';
import { LIBRARY } from '../../data/library';
import {
  BADGES, isMonthUnlocked, levelFor, loadProgress, logActivity, resetProgress, saveProgress, streakOf, todayISO, touchToday, withBadges,
  type Badge, type RWProgress,
} from './rw/engine';
import LessonView from './rw/LessonView';
import Library from './rw/Library';
import Placement from './rw/Placement';
import Review from './rw/Review';
import { StepCard } from './rw/shared';

type Tab = 'learn' | 'library' | 'review' | 'me';

export default function ReadingWritingApp() {
  const { user, mutate } = useApp();
  const [progress, setProgress] = useState<RWProgress>(loadProgress);
  const [tab, setTab] = useState<Tab>('learn');
  const [selectedMonth, setSelectedMonth] = useState<Month | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [showPlacement, setShowPlacement] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('rw-welcome-v1'));
  const dismissWelcome = () => { localStorage.setItem('rw-welcome-v1', '1'); setShowWelcome(false); };

  /**
   * Single funnel for all progress mutations: streak day, daily-goal log, and
   * badge checks happen here. Runs outside the setState updater because it has
   * side effects (localStorage, eTop practice log) that must not double-fire
   * under StrictMode.
   */
  const apply = (fn: (p: RWProgress) => RWProgress) => {
    const applied = fn(progress);

    // Bridge to eTop: completed lessons/stories/reviews count as practice
    // activity, feeding the school-wide streak, points, and class leaderboard.
    if (user?.role === 'student') {
      const lessons = Math.max(0, applied.completedLessons.length - progress.completedLessons.length);
      const stories = Math.max(0, applied.completedStories.length - progress.completedStories.length);
      const reviews = Math.max(0, applied.reviewSessions - progress.reviewSessions);
      const points = lessons * 20 + stories * 10 + reviews * 5;
      if (points > 0) {
        mutate((db) => {
          db.practice.push({
            id: `rw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            studentId: user.id,
            date: todayISO(),
            type: lessons > 0 ? 'quiz' : 'vocab',
            points,
          });
        });
      }
    }

    const { progress: next, earned } = withBadges(touchToday(logActivity(progress, applied)));
    saveProgress(next);
    if (earned.length) setNewBadges((b) => [...b, ...earned]);
    setProgress(next);
  };

  const totalLessons = getAllLessons().length;
  const doneCount = progress.completedLessons.length;
  const pct = Math.round((doneCount / totalLessons) * 100);
  const { level, next, pctToNext } = levelFor(progress.xp);
  const streak = streakOf(progress);

  if (activeLesson) {
    // The next lesson in sequence that isn't done yet (excluding the one being viewed)
    const all = getAllLessons();
    const after = all.slice(all.findIndex((l) => l.id === activeLesson.id) + 1);
    const nextLesson = [...after, ...all].find((l) => l.id !== activeLesson.id && !progress.completedLessons.includes(l.id)) ?? null;
    return (
      <LessonView key={activeLesson.id} lesson={activeLesson} progress={progress} apply={apply}
        onBack={() => setActiveLesson(null)}
        onNextLesson={nextLesson ? () => setActiveLesson(nextLesson) : null} />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      {/* Badge unlock toast */}
      {newBadges.length > 0 && (
        <button onClick={() => setNewBadges([])}
          className="fixed inset-x-4 top-16 z-40 mx-auto max-w-sm rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-left shadow-xl animate-pop">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{newBadges[0].emoji}</span>
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-amber-500">Badge unlocked!</div>
              <div className="font-black text-gray-800">{newBadges[0].title}</div>
              <div className="text-xs text-gray-500">{newBadges[0].desc} · tap to dismiss</div>
            </div>
          </div>
        </button>
      )}

      {/* Top status strip */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-black">
          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-600">🔥 {streak}</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">⭐ {progress.xp} XP</span>
        </div>
        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-700">{level.emoji} {level.title}</span>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-gray-100 p-1 text-sm font-black">
        {([
          { id: 'learn', label: '📚 Learn' },
          { id: 'library', label: '📖 Library' },
          { id: 'review', label: '🔁 Review' },
          { id: 'me', label: '⭐ Me' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedMonth(null); }}
            className={`flex-1 rounded-xl py-2 transition-all ${tab === t.id ? 'bg-white text-violet-700 shadow' : 'text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {showWelcome && tab === 'learn' && !showPlacement && (
        <div className="rounded-2xl border-2 border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="font-black text-gray-800">👋 Welcome! Here's how it works:</h2>
          <div className="mt-2 space-y-1.5 text-sm text-gray-600">
            <p>📚 <strong>Learn</strong> — one short lesson a day takes you from the alphabet to expert writing in 6 months.</p>
            <p>📖 <strong>Library</strong> — stories at your level, read aloud to you word by word.</p>
            <p>🔁 <strong>Review</strong> — quick games that make the words you learned stick.</p>
            <p>⭐ <strong>Me</strong> — your streak, level, badges, and (one day!) your certificate.</p>
          </div>
          <button onClick={dismissWelcome} className="mt-3 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-black text-white hover:opacity-90">
            Got it — let's start! →
          </button>
        </div>
      )}

      {tab === 'learn' && (showPlacement ? (
        <Placement apply={apply} onClose={() => setShowPlacement(false)} />
      ) : selectedMonth ? (
        <MonthView month={selectedMonth} progress={progress} onBack={() => setSelectedMonth(null)} onLesson={setActiveLesson} />
      ) : (
        <LearnHome progress={progress} pct={pct} doneCount={doneCount} totalLessons={totalLessons}
          onMonth={setSelectedMonth} onLesson={setActiveLesson} onPlacement={() => setShowPlacement(true)} />
      ))}
      {tab === 'library' && <Library progress={progress} apply={apply} />}
      {tab === 'review' && <Review progress={progress} apply={apply} />}
      {tab === 'me' && <MeTab progress={progress} onReset={() => setProgress(resetProgress())} />}
    </div>
  );
}

// ─── Learn home ───────────────────────────────────────────────────────────────
function LearnHome({ progress, pct, doneCount, totalLessons, onMonth, onLesson, onPlacement }: {
  progress: RWProgress;
  pct: number;
  doneCount: number;
  totalLessons: number;
  onMonth: (m: Month) => void;
  onLesson: (l: Lesson) => void;
  onPlacement: () => void;
}) {
  const allLessons = getAllLessons();
  const nextLesson = allLessons.find((l) => !progress.completedLessons.includes(l.id)) ?? null;

  return (
    <div className="space-y-5">
      {/* The single most important action comes first */}
      {nextLesson ? (
        <button onClick={() => onLesson(nextLesson)}
          className="flex w-full items-center gap-4 rounded-2xl border-2 border-violet-300 bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-left shadow-lg transition-all hover:shadow-xl">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 text-3xl">▶️</div>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wide text-violet-200">{doneCount === 0 ? 'Start Learning' : 'Continue Learning'}</div>
            <div className="truncate font-black text-white">{nextLesson.title}</div>
            <div className="text-xs text-violet-200">Month {nextLesson.monthIndex + 1} · Week {nextLesson.weekIndex + 1} · ~10 min</div>
          </div>
        </button>
      ) : (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-center">
          <div className="text-3xl">🎓</div>
          <div className="font-black text-amber-800">Programme complete — you're an expert!</div>
          <div className="text-xs text-amber-600">Your certificate is waiting in the ⭐ Me tab.</div>
        </div>
      )}

      <DailyGoals progress={progress} hasLessonsLeft={!!nextLesson} />

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-1 flex justify-between text-xs font-semibold text-gray-500">
          <span>📚 {doneCount} of {totalLessons} lessons · {LIBRARY.length} stories · audio everywhere</span>
          <span className="font-black text-violet-600">{pct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-black text-gray-700">Your 6-Month Programme</h2>
        <div className="grid grid-cols-2 gap-3">
          {CURRICULUM.map((month) => {
            const monthLessons = month.weeks.flatMap((w) => w.lessons);
            const monthDone = monthLessons.filter((l) => progress.completedLessons.includes(l.id)).length;
            const c = MONTH_COLORS[month.color];
            const unlocked = isMonthUnlocked(progress, month.index);
            return (
              <button key={month.index} onClick={() => unlocked && onMonth(month)} disabled={!unlocked}
                className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                  unlocked ? `${c.border} ${c.light} hover:shadow-md` : 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'}`}>
                <div className="text-2xl">{unlocked ? month.emoji : '🔒'}</div>
                <div className={`mt-1 text-xs font-bold uppercase tracking-wide ${unlocked ? c.text : 'text-gray-400'}`}>Month {month.index + 1}</div>
                <div className="font-black leading-tight text-gray-800">{month.title}</div>
                <div className="text-xs text-gray-500">{month.level}</div>
                <div className="mt-2 text-xs text-gray-400">{monthDone}/{monthLessons.length} lessons</div>
                {monthDone > 0 && (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className={`h-1.5 rounded-full ${c.bg}`} style={{ width: `${(monthDone / monthLessons.length) * 100}%` }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {doneCount === 0 && (
        <button onClick={onPlacement}
          className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-gray-300 bg-white p-4 text-left hover:border-violet-300">
          <div>
            <div className="text-sm font-black text-gray-700">🧭 Not starting from zero?</div>
            <div className="text-xs text-gray-500">Take the 12-question placement test to unlock your real starting level.</div>
          </div>
          <span className="text-gray-300">›</span>
        </button>
      )}
    </div>
  );
}

// ─── Daily goals ──────────────────────────────────────────────────────────────
function DailyGoals({ progress, hasLessonsLeft }: { progress: RWProgress; hasLessonsLeft: boolean }) {
  const today = progress.activityLog[todayISO()] ?? { lessons: 0, reviews: 0, stories: 0 };
  const goals = [
    ...(hasLessonsLeft ? [{ emoji: '📚', label: 'Complete 1 lesson', done: today.lessons >= 1 }] : []),
    { emoji: '🔁', label: 'Do 1 review session', done: today.reviews >= 1 },
    { emoji: '📖', label: 'Read 1 story (bonus)', done: today.stories >= 1 },
  ];
  const required = goals.filter((g) => !g.label.includes('bonus'));
  const allDone = required.every((g) => g.done);

  return (
    <div className={`rounded-2xl border-2 p-4 ${allDone ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-700">🎯 Today's Goals</h3>
        {allDone && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-black text-green-700">Streak safe! 🔥</span>}
      </div>
      <div className="space-y-1.5">
        {goals.map((g) => (
          <div key={g.label} className="flex items-center gap-2 text-sm">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${g.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {g.done ? '✓' : ''}
            </span>
            <span className={`font-semibold ${g.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{g.emoji} {g.label}</span>
          </div>
        ))}
      </div>
      {!allDone && <p className="mt-2 text-[11px] text-gray-400">Finish the first two to keep your streak growing — a little every day beats a lot once a week.</p>}
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────
function MonthView({ month, progress, onBack, onLesson }: {
  month: Month;
  progress: RWProgress;
  onBack: () => void;
  onLesson: (l: Lesson) => void;
}) {
  const c = MONTH_COLORS[month.color];
  const allMonthLessons = month.weeks.flatMap((w) => w.lessons);
  const doneCount = allMonthLessons.filter((l) => progress.completedLessons.includes(l.id)).length;
  const kindEmoji: Record<string, string> = { phonics: '🔤', vocabulary: '📝', reading: '📖', writing: '✍️', grammar: '📐', comprehension: '🔍' };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-800">← Back to Programme</button>
      <div className={`rounded-2xl ${c.bg} p-5 text-white shadow-lg`}>
        <div className="text-3xl">{month.emoji}</div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-80">Month {month.index + 1} · {month.level}</div>
        <h2 className="mt-1 text-2xl font-black">{month.title}</h2>
        <p className="text-sm opacity-90">{month.subtitle}</p>
        <div className="mt-3 text-sm opacity-80">{doneCount}/{allMonthLessons.length} lessons complete</div>
      </div>

      {month.weeks.map((week) => (
        <div key={week.index} className="space-y-2">
          <h3 className={`text-sm font-black uppercase tracking-wide ${c.text}`}>Week {week.index + 1}: {week.title}</h3>
          {week.lessons.map((lesson) => {
            const isDone = progress.completedLessons.includes(lesson.id);
            const isPerfect = progress.perfectLessons.includes(lesson.id);
            return (
              <button key={lesson.id} onClick={() => onLesson(lesson)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all hover:shadow-md ${isDone ? `${c.border} ${c.light}` : 'border-gray-200 bg-white'}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${isDone ? `${c.bg} text-white` : 'bg-gray-100'}`}>
                  {isDone ? '✓' : kindEmoji[lesson.kind]}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">{lesson.title} {isPerfect && '💯'}</div>
                  <div className="text-xs text-gray-500">{lesson.objective}</div>
                </div>
                <div className="text-gray-300">›</div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Me tab: level, streak calendar, badges, certificate ─────────────────────
const NAME_KEY = 'rw-name-v1';

function MeTab({ progress, onReset }: { progress: RWProgress; onReset: () => void }) {
  const { user } = useApp();
  const [ownName, setOwnName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const displayName = user?.name ?? (ownName.trim() || 'Learner');
  const { level, next, pctToNext } = levelFor(progress.xp);
  const streak = streakOf(progress);
  const totalLessons = getAllLessons().length;
  const graduated = progress.completedLessons.length >= totalLessons;
  const [confirmReset, setConfirmReset] = useState(false);

  const last14 = useMemo(() => {
    const days: { iso: string; label: string; done: boolean }[] = [];
    const d = new Date();
    d.setDate(d.getDate() - 13);
    for (let i = 0; i < 14; i++) {
      const iso = d.toISOString().slice(0, 10);
      days.push({ iso, label: 'SMTWTFS'[d.getDay()], done: progress.practiceDays.includes(iso) });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [progress.practiceDays]);

  return (
    <div className="space-y-4">
      {/* Level card */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-lg">
        <div className="text-4xl">{level.emoji}</div>
        <h2 className="text-xl font-black">{level.title}</h2>
        <p className="text-sm opacity-90">{progress.xp} XP total</p>
        {next && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs font-semibold opacity-90">
              <span>Next: {next.emoji} {next.title}</span>
              <span>{next.xp - progress.xp} XP to go</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-2.5 rounded-full bg-white transition-all duration-700" style={{ width: `${pctToNext}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Your name (used on the certificate) */}
      {!user && (
        <StepCard>
          <label className="text-sm font-black text-gray-700">✏️ Your name</label>
          <input
            type="text"
            value={ownName}
            onChange={(e) => { setOwnName(e.target.value); localStorage.setItem(NAME_KEY, e.target.value); }}
            placeholder="Shown on your graduation certificate"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </StepCard>
      )}

      {/* Streak calendar */}
      <StepCard>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-gray-800">🔥 {streak}-day streak</h3>
          <span className="text-xs text-gray-400">last 14 days</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {last14.map((d) => (
            <div key={d.iso} className="flex flex-col items-center gap-0.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${d.done ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-300'}`}>
                {d.done ? '🔥' : '·'}
              </div>
              <span className="text-[9px] font-bold text-gray-400">{d.label}</span>
            </div>
          ))}
        </div>
      </StepCard>

      {/* Badges */}
      <StepCard>
        <h3 className="font-black text-gray-800">🏅 Badges ({progress.badges.length}/{BADGES.length})</h3>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((b) => {
            const earned = progress.badges.includes(b.id);
            return (
              <div key={b.id} className={`rounded-xl border-2 p-2.5 ${earned ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                <div className="text-xl">{earned ? b.emoji : '🔒'}</div>
                <div className="text-xs font-black text-gray-700">{b.title}</div>
                <div className="text-[10px] text-gray-500">{b.desc}</div>
              </div>
            );
          })}
        </div>
      </StepCard>

      {/* Certificate */}
      {graduated && (
        <div className="rounded-2xl border-4 border-double border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 text-center shadow-lg print:border-amber-400">
          <div className="text-4xl">🎓</div>
          <div className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-amber-600">Certificate of Completion</div>
          <div className="mt-3 text-sm text-gray-500">This certifies that</div>
          <div className="mt-1 text-2xl font-black text-gray-800">{displayName}</div>
          <div className="mt-2 text-sm text-gray-500">
            has completed the full 6-month
            <br /><strong className="text-gray-700">Read &amp; Write: Zero to Expert</strong> programme
            <br />— all {totalLessons} lessons, from the alphabet to advanced literacy —
          </div>
          <div className="mt-3 text-xs font-bold text-gray-400">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {progress.xp} XP earned</div>
          <button onClick={() => window.print()} className="mt-4 rounded-full bg-amber-500 px-5 py-2 text-sm font-black text-white hover:bg-amber-600 print:hidden">
            🖨️ Print Certificate
          </button>
        </div>
      )}

      {/* Reset */}
      <StepCard>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} className="w-full text-xs font-bold text-gray-400 hover:text-red-500">Reset all my progress…</button>
        ) : (
          <div className="text-center">
            <p className="text-sm font-bold text-red-600">Delete ALL progress, XP, and badges? This cannot be undone.</p>
            <div className="mt-2 flex justify-center gap-2">
              <button onClick={() => { onReset(); setConfirmReset(false); }} className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-black text-white">Yes, reset</button>
              <button onClick={() => setConfirmReset(false)} className="rounded-full bg-gray-100 px-4 py-1.5 text-xs font-black text-gray-600">Cancel</button>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
