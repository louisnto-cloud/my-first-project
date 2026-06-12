import { useState } from 'react';
import { useApp } from '../../store';
import { useI18n } from '../../i18n';
import { Empty, Pill } from '../../components/ui';
import { FlashcardSession, QuizSession } from '../../components/Flashcards';
import { allLessons, COURSES, recommendedCourse } from '../../learn/content';
import { setSoundEnabled, sfx, soundEnabled, speak } from '../../learn/audio';
import { lessonProgressOf, recordLessonResult, starsForPct, todayISO } from '../../lib';
import type { Course, Exercise, Lesson, VocabList } from '../../types';

const DAILY_GOAL = 20;

function Stars({ n }: { n: number }) {
  return <span className="text-sm">{'⭐'.repeat(n)}{'☆'.repeat(Math.max(0, 3 - n))}</span>;
}

type View =
  | { kind: 'hub' }
  | { kind: 'course'; course: Course }
  | { kind: 'lesson'; course: Course; lesson: Lesson }
  | { kind: 'flash'; list: VocabList }
  | { kind: 'quiz'; list: VocabList };

export default function LearnHub() {
  const { db, user } = useApp();
  const { t, lang } = useI18n();
  const [view, setView] = useState<View>({ kind: 'hub' });
  if (!user) return null;

  if (view.kind === 'flash') return <FlashcardSession list={view.list} studentId={user.id} onExit={() => setView({ kind: 'hub' })} />;
  if (view.kind === 'quiz') return <QuizSession list={view.list} studentId={user.id} onExit={() => setView({ kind: 'hub' })} />;
  if (view.kind === 'lesson') {
    return (
      <LessonPlayer
        lesson={view.lesson}
        studentId={user.id}
        onExit={() => setView({ kind: 'course', course: view.course })}
      />
    );
  }
  if (view.kind === 'course') {
    return (
      <CourseView
        course={view.course}
        studentId={user.id}
        onBack={() => setView({ kind: 'hub' })}
        onOpenLesson={(lesson) => setView({ kind: 'lesson', course: view.course, lesson })}
      />
    );
  }

  const levels = db.classes.filter((c) => user.classIds.includes(c.id)).map((c) => c.level);
  const recommended = recommendedCourse(levels);
  const ordered = [recommended, ...COURSES.filter((c) => c.id !== recommended.id)];
  const lists = db.vocabLists.filter((v) => user.classIds.includes(v.classId));
  const todayPoints = db.practice.filter((p) => p.studentId === user.id && p.date === todayISO()).reduce((s, p) => s + p.points, 0);
  const goalPct = Math.min(100, (todayPoints / DAILY_GOAL) * 100);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">📖 {t('learn.title')}</h1>

      <div className={`card ${goalPct >= 100 ? 'border-emerald-200 bg-emerald-50' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-violet-700">🎯 {t('learn.dailyGoal')}</span>
          <span className="text-xs font-black text-slate-500">{todayPoints}/{DAILY_GOAL} ⭐</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-violet-100">
          <div className={`h-full rounded-full transition-all ${goalPct >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${goalPct}%` }} />
        </div>
        {goalPct >= 100 && <div className="mt-1.5 text-xs font-bold text-emerald-600">{t('learn.goalDone')}</div>}
      </div>

      <h2 className="font-extrabold text-violet-700">🚀 {t('learn.programs')}</h2>
      {ordered.map((course) => {
        const lessons = allLessons(course);
        const done = lessons.filter((l) => (lessonProgressOf(db, user.id, l.id)?.stars ?? 0) > 0).length;
        return (
          <button key={course.id} onClick={() => setView({ kind: 'course', course })} className="card flex w-full items-center gap-3 text-left hover:border-violet-300">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${course.color}`}>{course.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-extrabold">{lang === 'vi' ? course.titleVi : course.titleEn}</span>
                {course.id === recommended.id && <Pill className="bg-amber-100 text-amber-700">⭐ {t('learn.forYourClass')}</Pill>}
              </div>
              <div className="truncate text-xs font-semibold text-slate-400">{lang === 'vi' ? course.descVi : course.descEn}</div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-violet-100">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(done / lessons.length) * 100}%` }} />
              </div>
            </div>
            <div className="shrink-0 text-right text-xs font-bold text-slate-400">
              {done}/{lessons.length}
              <div>{t('learn.lessons')}</div>
            </div>
          </button>
        );
      })}

      <h2 className="pt-2 font-extrabold text-violet-700">🃏 {t('learn.vocabPractice')}</h2>
      {lists.length === 0 && <Empty emoji="📖" text={t('grades.empty')} />}
      {lists.map((list) => (
        <div key={list.id} className="card">
          <div className="font-extrabold">{list.title}</div>
          <div className="text-xs font-semibold text-slate-400">
            {list.words.length} {t('practice.words')}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setView({ kind: 'flash', list })} className="btn-soft text-sm">
              🃏 {t('practice.flashcards')}
            </button>
            <button onClick={() => setView({ kind: 'quiz', list })} className="btn-primary text-sm">
              ❓ {t('practice.quiz')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CourseView({ course, studentId, onBack, onOpenLesson }: { course: Course; studentId: string; onBack: () => void; onOpenLesson: (l: Lesson) => void }) {
  const { db } = useApp();
  const { t, lang } = useI18n();
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-bold text-violet-500">← {t('common.back')}</button>
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${course.color}`}>{course.emoji}</div>
        <div>
          <h1 className="text-xl font-black">{lang === 'vi' ? course.titleVi : course.titleEn}</h1>
          <div className="text-xs font-semibold text-slate-400">{lang === 'vi' ? course.descVi : course.descEn}</div>
        </div>
      </div>

      {course.units.map((unit) => {
        const flat = allLessons(course);
        return (
        <div key={unit.id} className="space-y-2">
          <h2 className="font-extrabold text-violet-700">{lang === 'vi' ? unit.titleVi : unit.titleEn}</h2>
          {unit.lessons.map((lesson) => {
            const progress = lessonProgressOf(db, studentId, lesson.id);
            const done = (progress?.stars ?? 0) > 0;
            // Lessons unlock sequentially across the whole course
            const flatIdx = flat.findIndex((l) => l.id === lesson.id);
            const prevDone = flatIdx === 0 || (lessonProgressOf(db, studentId, flat[flatIdx - 1].id)?.stars ?? 0) > 0;
            const locked = !done && !prevDone;
            return (
              <button
                key={lesson.id}
                disabled={locked}
                onClick={() => onOpenLesson(lesson)}
                className={`card flex w-full items-center gap-3 text-left ${locked ? 'opacity-50' : 'hover:border-violet-300'}`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${done ? 'bg-emerald-100' : 'bg-violet-100'}`}>
                  {locked ? '🔒' : lesson.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold">{lang === 'vi' ? lesson.titleVi : lesson.titleEn}</div>
                  <div className="text-xs font-semibold text-slate-400">
                    {locked ? t('learn.locked') : done ? <Stars n={progress!.stars} /> : `${lesson.vocab.length} ${t('practice.words')} · ${lesson.exercises.length} ${t('learn.exercises').toLowerCase()}`}
                  </div>
                </div>
                {!locked && <span className="btn-soft shrink-0 !px-3 !py-1.5 text-xs">{done ? t('learn.review') : t('learn.start')} ▶</span>}
              </button>
            );
          })}
        </div>
        );
      })}
    </div>
  );
}

type Phase = { kind: 'vocab' } | { kind: 'grammar' } | { kind: 'ex'; idx: number } | { kind: 'done'; correct: number };

function LessonPlayer({ lesson, studentId, onExit }: { lesson: Lesson; studentId: string; onExit: () => void }) {
  const { mutate } = useApp();
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>({ kind: 'vocab' });
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<{ stars: number; points: number } | null>(null);
  const [sound, setSound] = useState(soundEnabled);

  const total = lesson.exercises.length;

  const finishExercise = (wasCorrect: boolean, idx: number) => {
    const c = correct + (wasCorrect ? 1 : 0);
    setCorrect(c);
    if (idx + 1 >= total) {
      const pct = (c / total) * 100;
      let res = { stars: starsForPct(pct), points: 0 };
      mutate((d) => {
        const r = recordLessonResult(d, studentId, lesson.id, pct);
        res = { stars: r.stars, points: r.points };
      });
      if (res.stars > 0) sfx.complete();
      setResult(res);
      setPhase({ kind: 'done', correct: c });
    } else {
      setPhase({ kind: 'ex', idx: idx + 1 });
    }
  };

  const restart = () => {
    setCorrect(0);
    setResult(null);
    setPhase({ kind: 'ex', idx: 0 });
  };

  const header = (
    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
      <button onClick={onExit} className="text-violet-500">← {t('common.back')}</button>
      <span>
        {lesson.emoji} {lang === 'vi' ? lesson.titleVi : lesson.titleEn}
      </span>
      <button
        onClick={() => { const next = !sound; setSound(next); setSoundEnabled(next); if (next) sfx.click(); }}
        className="rounded-full bg-violet-100 px-2.5 py-1 text-sm"
        title={sound ? 'Sound on' : 'Sound off'}
      >
        {sound ? '🔔' : '🔕'}
      </button>
    </div>
  );

  if (phase.kind === 'vocab') {
    return (
      <div className="space-y-4">
        {header}
        <h2 className="text-lg font-black">🆕 {t('learn.newWords')}</h2>
        <div className="space-y-2">
          {lesson.vocab.map((w) => (
            <div key={w.term} className="card flex items-center gap-3">
              <button onClick={() => speak(w.term)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg hover:bg-violet-200" title="Listen">
                🔊
              </button>
              <div className="min-w-0">
                <div className="font-extrabold text-violet-700">{w.term} <span className="font-bold text-slate-400">· {w.meaningVi}</span></div>
                <button onClick={() => speak(w.example)} className="text-left text-xs font-semibold text-slate-500">“{w.example}”</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setPhase({ kind: 'grammar' })} className="btn-primary w-full">{t('learn.continue')} →</button>
      </div>
    );
  }

  if (phase.kind === 'grammar') {
    const g = lesson.grammar;
    return (
      <div className="space-y-4">
        {header}
        <h2 className="text-lg font-black">💡 {t('learn.grammar')}: {lang === 'vi' ? g.titleVi : g.titleEn}</h2>
        <div className="card border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-slate-700">{lang === 'vi' ? g.bodyVi : g.bodyEn}</p>
        </div>
        <div className="card">
          <h3 className="mb-2 text-sm font-extrabold text-violet-700">{t('learn.examples')}</h3>
          <ul className="space-y-2">
            {g.examples.map((ex) => (
              <li key={ex.en} className="flex items-start gap-2">
                <button onClick={() => speak(ex.en)} className="mt-0.5 shrink-0 text-base">🔊</button>
                <div>
                  <div className="text-sm font-bold">{ex.en}</div>
                  <div className="text-xs font-semibold text-slate-400">{ex.vi}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <button onClick={() => setPhase({ kind: 'ex', idx: 0 })} className="btn-primary w-full">
          {t('learn.exercises')} ({total}) →
        </button>
      </div>
    );
  }

  if (phase.kind === 'ex') {
    const ex = lesson.exercises[phase.idx];
    return (
      <div className="space-y-4">
        {header}
        <div className="h-2 overflow-hidden rounded-full bg-violet-100">
          <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(phase.idx / total) * 100}%` }} />
        </div>
        <ExerciseCard key={phase.idx} ex={ex} onDone={(ok) => finishExercise(ok, phase.idx)} />
      </div>
    );
  }

  // done
  const pct = (phase.correct / total) * 100;
  const passed = (result?.stars ?? 0) > 0;
  return (
    <div className="space-y-4">
      {header}
      <div className="card animate-pop flex flex-col items-center gap-3 py-10 text-center">
        <div className="text-6xl">{passed ? (result!.stars === 3 ? '🏆' : '🎉') : '💪'}</div>
        <div className="text-xl font-black text-violet-700">{passed ? t('learn.lessonDone') : t('learn.lessonFailed')}</div>
        {passed && <div className="text-3xl">{'⭐'.repeat(result!.stars)}</div>}
        <div className="text-sm font-bold text-slate-500">
          {t('practice.correct')}: {phase.correct}/{total} ({Math.round(pct)}%)
        </div>
        {passed && result!.points > 0 && (
          <div className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-black text-amber-700">
            +{result!.points} ⭐ {t('practice.earned')}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button onClick={restart} className="btn-soft">{t('learn.tryAgain')}</button>
          <button onClick={onExit} className="btn-primary">{t('learn.backToCourse')}</button>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({ ex, onDone }: { ex: Exercise; onDone: (correct: boolean) => void }) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<string | null>(null);
  const [orderSel, setOrderSel] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null); // null = unanswered

  const settle = (ok: boolean) => {
    setChecked(ok);
    if (ok) sfx.correct();
    else sfx.wrong();
    setTimeout(() => onDone(ok), ok ? 900 : 1800);
  };

  const optionClass = (opt: string, answer: string) => {
    if (checked === null) return 'bg-white border-violet-100 hover:border-violet-300';
    if (opt === answer) return 'bg-emerald-500 border-emerald-500 text-white';
    if (opt === picked) return 'bg-rose-400 border-rose-400 text-white';
    return 'bg-white border-violet-100 opacity-50';
  };

  const feedback = checked !== null && (
    <div className={`rounded-2xl p-3 text-center text-sm font-extrabold ${checked ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
      {checked ? t('learn.correct') : `${t('learn.incorrect')} ${t('learn.correctIs')} ${ex.kind === 'order' ? ex.answer : ex.kind === 'fill' ? ex.answer : ex.answer}`}
    </div>
  );

  if (ex.kind === 'mc' || ex.kind === 'listen') {
    const isListen = ex.kind === 'listen';
    return (
      <div className="space-y-3">
        <div className="card text-center">
          <div className="text-xs font-bold text-slate-400">{isListen ? t('learn.listenTap') : t('learn.chooseAnswer')}</div>
          {isListen ? (
            <div className="mt-2 flex items-center justify-center gap-3">
              <button onClick={() => speak(ex.text)} className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-3xl text-white shadow-lg active:scale-95">
                🔊
              </button>
              <button onClick={() => speak(ex.text, 0.55)} title="Slow" className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-xl active:scale-95">
                🐢
              </button>
            </div>
          ) : (
            <div className="mt-2 text-lg font-black text-violet-700">{ex.question}</div>
          )}
        </div>
        <div className="space-y-2">
          {ex.options.map((opt) => (
            <button
              key={opt}
              disabled={checked !== null}
              onClick={() => { setPicked(opt); settle(opt === ex.answer); }}
              className={`w-full rounded-2xl border-2 p-3 text-left text-sm font-bold transition ${optionClass(opt, ex.answer)}`}
            >
              {opt}
            </button>
          ))}
        </div>
        {feedback}
      </div>
    );
  }

  if (ex.kind === 'fill') {
    return (
      <div className="space-y-3">
        <div className="card text-center">
          <div className="text-xs font-bold text-slate-400">{t('learn.chooseFill')}</div>
          <div className="mt-2 text-lg font-black text-violet-700">
            {checked !== null ? ex.sentence.replace('___', ex.answer) : ex.sentence}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ex.choices.map((opt) => (
            <button
              key={opt}
              disabled={checked !== null}
              onClick={() => { setPicked(opt); settle(opt === ex.answer); }}
              className={`rounded-2xl border-2 p-3 text-center text-sm font-bold transition ${optionClass(opt, ex.answer)}`}
            >
              {opt}
            </button>
          ))}
        </div>
        {feedback}
      </div>
    );
  }

  // order
  const remaining = ex.words.map((w, i) => ({ w, i })).filter(({ i }) => !orderSel.includes(i));
  const built = orderSel.map((i) => ex.words[i]).join(' ');
  return (
    <div className="space-y-3">
      <div className="card text-center">
        <div className="text-xs font-bold text-slate-400">{t('learn.orderTap')}</div>
        <div className="mt-2 min-h-[44px] rounded-2xl bg-violet-50 p-2 text-base font-black text-violet-700">
          {orderSel.map((i, pos) => (
            <button
              key={pos}
              disabled={checked !== null}
              onClick={() => setOrderSel(orderSel.filter((_, p) => p !== pos))}
              className="m-0.5 inline-block rounded-xl bg-white px-2.5 py-1 shadow-sm"
            >
              {ex.words[i]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {remaining.map(({ w, i }) => (
          <button
            key={i}
            disabled={checked !== null}
            onClick={() => setOrderSel([...orderSel, i])}
            className="rounded-2xl border-2 border-violet-100 bg-white px-3 py-2 text-sm font-bold hover:border-violet-300"
          >
            {w}
          </button>
        ))}
      </div>
      <button
        disabled={orderSel.length !== ex.words.length || checked !== null}
        onClick={() => settle(built === ex.answer)}
        className="btn-primary w-full"
      >
        {t('learn.check')}
      </button>
      {feedback}
    </div>
  );
}
