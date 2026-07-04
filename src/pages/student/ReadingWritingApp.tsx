import { useState, useEffect, useRef, useCallback } from 'react';
import { CURRICULUM, MONTH_COLORS, getAllLessons } from '../../data/curriculum';
import type { Lesson, Month, Exercise } from '../../data/curriculum';

const PROGRESS_KEY = 'rw-progress-v1';

interface Progress {
  completedLessons: string[];
  exerciseAnswers: Record<string, Record<string, string>>; // lessonId -> exerciseId -> answer
  writingResponses: Record<string, string>; // lessonId -> writing text
  currentLessonId: string | null;
}

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch { /* empty */ }
  return { completedLessons: [], exerciseAnswers: {}, writingResponses: {}, currentLessonId: null };
}

function saveProgress(p: Progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

// ─── TTS Hook ────────────────────────────────────────────────────────────────
function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.05;
    u.lang = 'en-US';
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  return { speak, stop, speaking };
}

// ─── Top-level view state ─────────────────────────────────────────────────────
type View = 'home' | 'month' | 'lesson';

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ReadingWritingApp() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [view, setView] = useState<View>('home');
  const [selectedMonth, setSelectedMonth] = useState<Month | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const updateProgress = (fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = fn(prev);
      saveProgress(next);
      return next;
    });
  };

  const openLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setView('lesson');
  };

  const openMonth = (month: Month) => {
    setSelectedMonth(month);
    setView('month');
  };

  const goHome = () => { setView('home'); setSelectedMonth(null); setActiveLesson(null); };

  const totalLessons = getAllLessons().length;
  const doneCount = progress.completedLessons.length;
  const pct = Math.round((doneCount / totalLessons) * 100);

  if (view === 'lesson' && activeLesson) {
    return (
      <LessonView
        lesson={activeLesson}
        progress={progress}
        updateProgress={updateProgress}
        onBack={() => {
          setView(selectedMonth ? 'month' : 'home');
          setActiveLesson(null);
        }}
      />
    );
  }

  if (view === 'month' && selectedMonth) {
    return (
      <MonthView
        month={selectedMonth}
        progress={progress}
        onBack={goHome}
        onLesson={openLesson}
      />
    );
  }

  return <HomeView progress={progress} pct={pct} doneCount={doneCount} totalLessons={totalLessons} onMonth={openMonth} onLesson={openLesson} />;
}

// ─── Home View ────────────────────────────────────────────────────────────────
function HomeView({ progress, pct, doneCount, totalLessons, onMonth, onLesson }: {
  progress: Progress;
  pct: number;
  doneCount: number;
  totalLessons: number;
  onMonth: (m: Month) => void;
  onLesson: (l: Lesson) => void;
}) {
  const allLessons = getAllLessons();
  const nextLesson = allLessons.find((l) => !progress.completedLessons.includes(l.id)) ?? allLessons[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="mb-1 text-3xl">📚</div>
        <h1 className="text-2xl font-black">Read & Write — Zero to Expert</h1>
        <p className="mt-1 text-sm text-violet-200">6-Month Learning Programme · {totalLessons} Lessons · Audio Included</p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-semibold text-violet-200">
            <span>{doneCount} of {totalLessons} lessons complete</span>
            <span>{pct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-3 rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Continue button */}
      {nextLesson && (
        <button
          onClick={() => onLesson(nextLesson)}
          className="flex w-full items-center gap-4 rounded-2xl border-2 border-violet-200 bg-white p-4 text-left shadow-sm hover:border-violet-400 hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-2xl">▶️</div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-violet-500">Continue Learning</div>
            <div className="font-bold text-gray-800">{nextLesson.title}</div>
            <div className="text-xs text-gray-500">
              Month {nextLesson.monthIndex + 1} · Week {nextLesson.weekIndex + 1}
            </div>
          </div>
        </button>
      )}

      {/* Month grid */}
      <div>
        <h2 className="mb-3 text-lg font-black text-gray-700">Your 6-Month Programme</h2>
        <div className="grid grid-cols-2 gap-3">
          {CURRICULUM.map((month) => {
            const monthLessons = month.weeks.flatMap((w) => w.lessons);
            const monthDone = monthLessons.filter((l) => progress.completedLessons.includes(l.id)).length;
            const c = MONTH_COLORS[month.color];
            const isUnlocked = month.index === 0 || progress.completedLessons.includes(
              CURRICULUM[month.index - 1].weeks.flatMap((w) => w.lessons).slice(-1)[0]?.id ?? ''
            );

            return (
              <button
                key={month.index}
                onClick={() => isUnlocked && onMonth(month)}
                disabled={!isUnlocked}
                className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                  isUnlocked
                    ? `${c.border} ${c.light} hover:shadow-md`
                    : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="text-2xl">{isUnlocked ? month.emoji : '🔒'}</div>
                <div className={`mt-1 text-xs font-bold uppercase tracking-wide ${isUnlocked ? c.text : 'text-gray-400'}`}>
                  Month {month.index + 1}
                </div>
                <div className="font-black text-gray-800 leading-tight">{month.title}</div>
                <div className="text-xs text-gray-500">{month.level}</div>
                <div className="mt-2 text-xs text-gray-400">{monthDone}/{monthLessons.length} lessons</div>
                {monthDone > 0 && (
                  <div className={`mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200`}>
                    <div
                      className={`h-1.5 rounded-full ${c.bg}`}
                      style={{ width: `${(monthDone / monthLessons.length) * 100}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Lessons Done', value: doneCount, emoji: '✅' },
          { label: 'Progress', value: `${pct}%`, emoji: '📈' },
          { label: 'Months Left', value: Math.max(0, 6 - CURRICULUM.filter((m) => m.weeks.flatMap((w) => w.lessons).every((l) => progress.completedLessons.includes(l.id))).length), emoji: '📅' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-gray-100 p-3 text-center shadow-sm">
            <div className="text-xl">{s.emoji}</div>
            <div className="text-lg font-black text-gray-800">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ month, progress, onBack, onLesson }: {
  month: Month;
  progress: Progress;
  onBack: () => void;
  onLesson: (l: Lesson) => void;
}) {
  const c = MONTH_COLORS[month.color];
  const allMonthLessons = month.weeks.flatMap((w) => w.lessons);
  const doneCount = allMonthLessons.filter((l) => progress.completedLessons.includes(l.id)).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-800">
        ← Back to Programme
      </button>
      <div className={`rounded-2xl ${c.bg} p-5 text-white shadow-lg`}>
        <div className="text-3xl">{month.emoji}</div>
        <div className="text-xs font-bold uppercase tracking-widest opacity-80">Month {month.index + 1} · {month.level}</div>
        <h2 className="mt-1 text-2xl font-black">{month.title}</h2>
        <p className="text-sm opacity-90">{month.subtitle}</p>
        <div className="mt-3 text-sm opacity-80">{doneCount}/{allMonthLessons.length} lessons complete</div>
      </div>

      {month.weeks.map((week) => (
        <div key={week.index} className="space-y-2">
          <h3 className={`text-sm font-black uppercase tracking-wide ${c.text}`}>
            Week {week.index + 1}: {week.title}
          </h3>
          {week.lessons.map((lesson) => {
            const isDone = progress.completedLessons.includes(lesson.id);
            const kindEmoji: Record<string, string> = {
              phonics: '🔤', vocabulary: '📝', reading: '📖', writing: '✍️', grammar: '📐', comprehension: '🔍',
            };
            return (
              <button
                key={lesson.id}
                onClick={() => onLesson(lesson)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all hover:shadow-md ${
                  isDone ? `${c.border} ${c.light}` : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${isDone ? c.bg + ' text-white' : 'bg-gray-100'}`}>
                  {isDone ? '✓' : kindEmoji[lesson.kind]}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">{lesson.title}</div>
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

// ─── Lesson View ──────────────────────────────────────────────────────────────
type LessonStep = 'intro' | 'content' | 'keywords' | 'exercises' | 'writing' | 'complete';

function LessonView({ lesson, progress, updateProgress, onBack }: {
  lesson: Lesson;
  progress: Progress;
  updateProgress: (fn: (p: Progress) => Progress) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<LessonStep>('intro');
  const [answers, setAnswers] = useState<Record<string, string>>(
    progress.exerciseAnswers[lesson.id] ?? {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [writingText, setWritingText] = useState(progress.writingResponses[lesson.id] ?? '');
  const { speak, stop, speaking } = useTTS();

  const month = CURRICULUM[lesson.monthIndex];
  const c = MONTH_COLORS[month.color];
  const isDone = progress.completedLessons.includes(lesson.id);

  const steps: LessonStep[] = ['intro', 'content', 'keywords', 'exercises', ...(lesson.writingPrompt ? ['writing' as LessonStep] : []), 'complete'];
  const stepIndex = steps.indexOf(step);
  const totalSteps = steps.length;

  const nextStep = () => {
    const next = steps[stepIndex + 1];
    if (next) setStep(next);
  };

  const score = lesson.exercises.reduce((acc, ex) => {
    const ans = (answers[ex.id] ?? '').trim().toLowerCase();
    return acc + (ans === ex.answer.toLowerCase() ? 1 : 0);
  }, 0);

  const handleSubmit = () => {
    setSubmitted(true);
    updateProgress((p) => ({
      ...p,
      exerciseAnswers: { ...p.exerciseAnswers, [lesson.id]: answers },
    }));
  };

  const handleComplete = () => {
    updateProgress((p) => ({
      ...p,
      completedLessons: p.completedLessons.includes(lesson.id)
        ? p.completedLessons
        : [...p.completedLessons, lesson.id],
      writingResponses: { ...p.writingResponses, [lesson.id]: writingText },
    }));
    onBack();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm font-semibold text-gray-500 hover:text-gray-800">←</button>
        <div className="flex-1">
          <div className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{month.emoji} Month {lesson.monthIndex + 1}</div>
          <h2 className="font-black text-gray-800 leading-tight">{lesson.title}</h2>
        </div>
        {isDone && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-600">Done ✓</span>}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full ${c.bg} transition-all duration-500`}
          style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>
      <div className="text-center text-xs text-gray-400">Step {stepIndex + 1} of {totalSteps}</div>

      {/* ── INTRO ── */}
      {step === 'intro' && (
        <StepCard>
          <div className="text-center">
            <div className="text-5xl mb-3">🎯</div>
            <h3 className="text-xl font-black text-gray-800">Lesson Goal</h3>
            <p className="mt-2 text-gray-600">{lesson.objective}</p>
          </div>
          <div className={`mt-4 rounded-xl ${c.light} border ${c.border} p-4`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">🎧 Listen to the Introduction</span>
              <button
                onClick={() => speaking ? stop() : speak(lesson.audioText)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  speaking ? 'bg-red-100 text-red-600' : `${c.bg} text-white`
                }`}
              >
                {speaking ? '⏹ Stop' : '▶ Play'}
              </button>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{lesson.audioText}</p>
          </div>
          <NavButton label="Start Lesson →" onClick={nextStep} color={c.bg} />
        </StepCard>
      )}

      {/* ── CONTENT ── */}
      {step === 'content' && (
        <StepCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-gray-800">📖 Lesson Content</h3>
            <button
              onClick={() => speaking ? stop() : speak(lesson.content.replace(/[#*|_`]/g, '').replace(/\n+/g, ' '))}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${speaking ? 'bg-red-100 text-red-600' : `${c.bg} text-white`}`}
            >
              {speaking ? '⏹ Stop' : '🔊 Listen'}
            </button>
          </div>
          <MarkdownContent content={lesson.content} />
          <NavButton label="Next: Key Words →" onClick={nextStep} color={c.bg} />
        </StepCard>
      )}

      {/* ── KEYWORDS ── */}
      {step === 'keywords' && (
        <StepCard>
          <h3 className="font-black text-gray-800 mb-3">📝 Key Words</h3>
          <div className="space-y-2">
            {lesson.keyWords.map((kw) => (
              <div key={kw.word} className={`flex items-start gap-3 rounded-xl border ${c.border} ${c.light} p-3`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-black ${c.text}`}>{kw.word}</span>
                    <button
                      onClick={() => speak(kw.word + '. ' + kw.meaning)}
                      className="text-xs text-gray-400 hover:text-gray-700"
                      title="Hear this word"
                    >🔊</button>
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5">{kw.meaning}</div>
                </div>
              </div>
            ))}
          </div>
          <NavButton label="Next: Practice Exercises →" onClick={nextStep} color={c.bg} />
        </StepCard>
      )}

      {/* ── EXERCISES ── */}
      {step === 'exercises' && (
        <StepCard>
          <h3 className="font-black text-gray-800 mb-1">✏️ Exercises</h3>
          <p className="text-xs text-gray-500 mb-4">Answer all {lesson.exercises.length} questions, then check your score.</p>
          <div className="space-y-4">
            {lesson.exercises.map((ex, i) => (
              <ExerciseItem
                key={ex.id}
                exercise={ex}
                index={i}
                answer={answers[ex.id] ?? ''}
                submitted={submitted}
                onAnswer={(val) => setAnswers((prev) => ({ ...prev, [ex.id]: val }))}
                speak={speak}
                color={c}
              />
            ))}
          </div>

          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={lesson.exercises.some((ex) => !answers[ex.id]?.trim())}
              className={`mt-4 w-full rounded-xl py-3 font-black text-white transition-all disabled:opacity-40 ${c.bg}`}
            >
              Check My Answers
            </button>
          ) : (
            <div className={`mt-4 rounded-xl p-4 text-center ${score === lesson.exercises.length ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="text-3xl mb-1">{score === lesson.exercises.length ? '🏆' : score >= lesson.exercises.length * 0.6 ? '👍' : '📚'}</div>
              <div className="font-black text-lg text-gray-800">{score} / {lesson.exercises.length} correct</div>
              <div className="text-sm text-gray-600">
                {score === lesson.exercises.length ? 'Perfect score! Amazing work!' : score >= lesson.exercises.length * 0.6 ? 'Great job! Review the ones you missed.' : 'Good effort! Re-read the lesson and try again.'}
              </div>
              <NavButton label={lesson.writingPrompt ? "Next: Writing Practice →" : "Next: Complete! →"} onClick={nextStep} color={c.bg} />
            </div>
          )}
        </StepCard>
      )}

      {/* ── WRITING ── */}
      {step === 'writing' && lesson.writingPrompt && (
        <StepCard>
          <h3 className="font-black text-gray-800 mb-1">✍️ Writing Practice</h3>
          <div className={`mb-3 rounded-xl border ${c.border} ${c.light} p-3`}>
            <div className="flex items-start gap-2">
              <button
                onClick={() => speak(lesson.writingPrompt!)}
                className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${c.bg} text-white`}
              >🔊</button>
              <p className="text-sm font-semibold text-gray-700">{lesson.writingPrompt}</p>
            </div>
          </div>
          <textarea
            value={writingText}
            onChange={(e) => setWritingText(e.target.value)}
            placeholder="Write your response here... Take your time."
            rows={8}
            className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm text-gray-800 focus:border-violet-400 focus:outline-none resize-none leading-relaxed"
          />
          <div className="text-right text-xs text-gray-400 mt-1">{writingText.split(/\s+/).filter(Boolean).length} words</div>
          <NavButton label="Next: Complete Lesson →" onClick={nextStep} color={c.bg} />
        </StepCard>
      )}

      {/* ── COMPLETE ── */}
      {step === 'complete' && (
        <StepCard>
          <div className="text-center py-4">
            <div className="text-6xl mb-3">🎉</div>
            <h3 className="text-2xl font-black text-gray-800">Lesson Complete!</h3>
            <p className="mt-2 text-gray-600">You've finished: <strong>{lesson.title}</strong></p>
            <div className={`mt-4 inline-block rounded-full ${c.bg} px-6 py-2 text-white font-black`}>
              +1 Lesson ✓
            </div>
            <div className="mt-6 space-y-2 text-sm text-gray-600">
              <p>📖 Read the content again anytime</p>
              <p>🎧 Use the audio buttons while reading</p>
              <p>✍️ Keep your writing responses in a notebook</p>
            </div>
          </div>
          <button
            onClick={handleComplete}
            className={`w-full rounded-xl py-3 font-black text-white ${c.bg}`}
          >
            Save & Continue →
          </button>
        </StepCard>
      )}
    </div>
  );
}

// ─── Exercise Item ────────────────────────────────────────────────────────────
function ExerciseItem({ exercise, index, answer, submitted, onAnswer, speak, color }: {
  exercise: Exercise;
  index: number;
  answer: string;
  submitted: boolean;
  onAnswer: (v: string) => void;
  speak: (t: string) => void;
  color: { bg: string; text: string; border: string; light: string };
}) {
  const isCorrect = submitted && answer.trim().toLowerCase() === exercise.answer.toLowerCase();
  const isWrong = submitted && !isCorrect;

  return (
    <div className={`rounded-xl border-2 p-3 transition-all ${
      submitted ? (isCorrect ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50') : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-start gap-2 mb-2">
        <span className={`shrink-0 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black text-white ${color.bg}`}>{index + 1}</span>
        <div className="flex-1">
          <button onClick={() => speak(exercise.prompt)} className="text-xs text-gray-400 float-right hover:text-gray-600">🔊</button>
          <p className="text-sm font-semibold text-gray-800">{exercise.prompt}</p>
        </div>
      </div>

      {exercise.kind === 'multiple-choice' && (
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          {exercise.options!.map((opt) => {
            const isSelected = answer === opt;
            const isCorrectOpt = submitted && opt === exercise.answer;
            return (
              <button
                key={opt}
                onClick={() => !submitted && onAnswer(opt)}
                disabled={submitted}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold text-left transition-all border-2 ${
                  isCorrectOpt ? 'border-green-400 bg-green-100 text-green-800' :
                  isSelected && isWrong ? 'border-red-400 bg-red-100 text-red-800' :
                  isSelected ? `${color.border} ${color.light} ${color.text}` :
                  'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {(exercise.kind === 'fill-blank' || exercise.kind === 'arrange-words' || exercise.kind === 'write-sentence') && (
        <div className="mt-1">
          <input
            type="text"
            value={answer}
            onChange={(e) => !submitted && onAnswer(e.target.value)}
            disabled={submitted}
            placeholder={exercise.hint ?? 'Your answer...'}
            className={`w-full rounded-lg border-2 px-3 py-2 text-sm focus:outline-none ${
              submitted
                ? isCorrect ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'
                : 'border-gray-200 focus:border-violet-400'
            }`}
          />
        </div>
      )}

      {submitted && (
        <div className={`mt-2 text-xs font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
          {isCorrect ? '✓ Correct!' : `✗ Answer: ${exercise.answer}`}
          {!isCorrect && exercise.hint && <span className="ml-2 font-normal text-gray-500">Hint: {exercise.hint}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
      {children}
    </div>
  );
}

function NavButton({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`mt-2 w-full rounded-xl py-3 font-black text-white transition-all hover:opacity-90 ${color}`}
    >
      {label}
    </button>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="prose prose-sm max-w-none text-gray-700 space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h2 key={i} className="text-lg font-black text-gray-800 mt-2">{line.slice(2)}</h2>;
        if (line.startsWith('## ')) return <h3 key={i} className="text-base font-black text-gray-700 mt-2">{line.slice(3)}</h3>;
        if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-bold text-gray-600 mt-1">{line.slice(4)}</h4>;
        if (line.startsWith('- ') || line.startsWith('✓ ') || line.startsWith('✅ ') || line.startsWith('❌ ')) {
          return <div key={i} className="flex gap-2 text-sm"><span className="shrink-0">{line.slice(0, 2)}</span><span dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} /></div>;
        }
        if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-gray-300 pl-3 italic text-gray-600 text-sm">{line.slice(2)}</blockquote>;
        if (line.startsWith('---')) return <hr key={i} className="border-gray-200" />;
        if (line.startsWith('|')) {
          // Skip table rows for simplicity; render as code
          return <div key={i} className="font-mono text-xs bg-gray-50 px-2 py-0.5 rounded text-gray-600 overflow-x-auto">{line}</div>;
        }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />;
      })}
    </div>
  );
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 rounded px-1 text-xs font-mono">$1</code>');
}
