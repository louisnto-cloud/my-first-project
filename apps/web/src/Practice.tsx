import { useEffect, useState } from 'react';
import { allLessons, COURSES, type Course, type Lesson } from '@etop/curriculum';
import { api } from './api';
import { sfx, speak } from './sound';
import { Celebrate } from './Celebrate';

// Self-study curriculum in the portal (D19 closed): 38 lessons across the
// Foundations path and three audience courses. Completing a lesson posts a
// practice event — points, streaks, and badges are computed server-side.

type Progress = Record<string, number>; // lessonId -> bestPct

function LessonPlayer({ lesson, lang, onExit }: { lesson: Lesson; lang: 'vi' | 'en'; onExit: (completed: boolean) => void }) {
  const [phase, setPhase] = useState<'vocab' | 'grammar' | 'ex' | 'done'>('vocab');
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [earned, setEarned] = useState(0);

  const total = lesson.exercises.length;
  const ex = lesson.exercises[idx];

  const finish = async (c: number) => {
    const pct = Math.round((c / total) * 100);
    const points = pct >= 50 ? Math.max(4, Math.round(pct / 10) + 5) : 2;
    setEarned(points);
    try {
      await api('POST', '/practice/events', { kind: 'lesson', points, detail: { lessonId: lesson.id, pct } });
    } catch {
      /* offline practice still counts locally next sync — best effort */
    }
    setPhase('done');
  };

  const answer = (ok: boolean) => {
    if (ok) sfx.correct();
    else sfx.wrong();
    const c = correct + (ok ? 1 : 0);
    setCorrect(c);
    setTimeout(() => {
      setPicked(null);
      setOrder([]);
      if (idx + 1 >= total) void finish(c);
      else setIdx(idx + 1);
    }, ok ? 700 : 1500);
  };

  const choiceBtn = (opt: string, answerStr: string) => (
    <button
      key={opt}
      disabled={picked !== null}
      onClick={() => { setPicked(opt); answer(opt === answerStr); }}
      className={`tile ${picked === null ? '' : opt === answerStr ? 'tile-right' : opt === picked ? 'tile-wrong' : 'opacity-40'}`}
    >
      <span className="flex items-center gap-2">
        {picked !== null && opt === answerStr && <span className="text-emerald-500">✓</span>}
        {opt}
      </span>
    </button>
  );

  if (phase === 'vocab') {
    return (
      <div className="space-y-3">
        <button onClick={() => onExit(false)} className="font-bold text-violet-500">←</button>
        <h2 className="text-lg font-black">{lesson.emoji} {lang === 'vi' ? lesson.titleVi : lesson.titleEn}</h2>
        {lesson.vocab.map((w) => (
          <div key={w.term} className="card flex items-center gap-3">
            <button onClick={() => speak(w.term)} className="h-10 w-10 shrink-0 rounded-full bg-violet-100 text-lg" aria-label="Nghe">🔊</button>
            <div>
              <b className="text-violet-700">{w.term}</b> <span className="text-slate-400">· {w.meaningVi}</span>
              <div className="text-xs font-semibold text-slate-500">“{w.example}”</div>
            </div>
          </div>
        ))}
        <button onClick={() => setPhase('grammar')} className="btn-primary w-full">Tiếp tục →</button>
      </div>
    );
  }

  if (phase === 'grammar') {
    const g = lesson.grammar;
    return (
      <div className="space-y-3">
        <button onClick={() => onExit(false)} className="font-bold text-violet-500">←</button>
        <h2 className="text-lg font-black">💡 {lang === 'vi' ? g.titleVi : g.titleEn}</h2>
        <div className="card bg-amber-50 text-sm font-semibold">{lang === 'vi' ? g.bodyVi : g.bodyEn}</div>
        <div className="card space-y-2">
          {g.examples.map((e) => (
            <div key={e.en} className="flex items-start gap-2 text-sm">
              <button onClick={() => speak(e.en)} aria-label="Nghe">🔊</button>
              <span><b>{e.en}</b><br /><span className="text-xs text-slate-400">{e.vi}</span></span>
            </div>
          ))}
        </div>
        <button onClick={() => setPhase('ex')} className="btn-primary w-full">Làm bài tập ({total}) →</button>
      </div>
    );
  }

  if (phase === 'done') {
    const pct = Math.round((correct / total) * 100);
    return (
      <Celebrate
        title={pct >= 50 ? 'Hoàn thành bài học!' : 'Gần được rồi — thử lại nhé!'}
        pct={pct}
        points={earned}
        onDone={() => onExit(pct >= 50)}
        doneLabel="Về danh sách bài"
      />
    );
  }

  // exercises
  const remaining = ex.kind === 'order' ? ex.words.map((w, i) => ({ w, i })).filter(({ i }) => !order.includes(i)) : [];
  return (
    <div className="space-y-3">
      <div className="h-2 overflow-hidden rounded-full bg-violet-100">
        <div className="h-full bg-violet-500 transition-all" style={{ width: `${(idx / total) * 100}%` }} />
      </div>
      <div className="card space-y-3">
        {ex.kind === 'listen' ? (
          <div className="text-center">
            <div className="text-xs font-bold text-slate-400">Nghe rồi chọn câu đúng</div>
            <button onClick={() => speak(ex.text)} className="btn-primary mt-2 !rounded-full !p-5 text-2xl" aria-label="Nghe">🔊</button>
            <button onClick={() => speak(ex.text, 0.55)} className="ml-2 text-xl" aria-label="Nghe chậm">🐢</button>
          </div>
        ) : (
          <div className="text-lg font-extrabold text-violet-700">{ex.kind === 'fill' ? ex.sentence : ex.kind === 'order' ? 'Xếp các từ thành câu đúng:' : ex.question}</div>
        )}

        {(ex.kind === 'mc' || ex.kind === 'listen') && ex.options.map((o) => choiceBtn(o, ex.answer))}
        {ex.kind === 'fill' && ex.choices.map((o) => choiceBtn(o, ex.answer))}
        {ex.kind === 'order' && (
          <>
            <div className="min-h-[44px] rounded-2xl bg-violet-50 p-2 font-black text-violet-700">
              {order.map((i, pos) => (
                <button key={pos} onClick={() => setOrder(order.filter((_, p) => p !== pos))} className="m-0.5 rounded-xl bg-white px-2.5 py-1 shadow-sm">
                  {ex.words[i]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {remaining.map(({ w, i }) => (
                <button key={i} onClick={() => setOrder([...order, i])} className="rounded-2xl border-2 border-b-4 border-violet-200 bg-white px-4 py-2.5 text-base font-extrabold text-ink transition active:translate-y-[3px] active:border-b-2">{w}</button>
              ))}
            </div>
            <button
              disabled={order.length !== ex.words.length}
              onClick={() => answer(order.map((i) => ex.words[i]).join(' ') === ex.answer)}
              className="btn-fun w-full disabled:opacity-40"
            >
              {lang === 'vi' ? 'Kiểm tra' : 'Check'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function PracticeHub({ lang }: { lang: 'vi' | 'en' }) {
  const [progress, setProgress] = useState<Progress>({});
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);

  const load = async () => {
    try {
      const rows = await api<{ lessonId: string; bestPct: number }[]>('GET', '/my/practice/lessons');
      setProgress(Object.fromEntries(rows.map((r) => [r.lessonId, r.bestPct])));
    } catch {
      /* fresh student */
    }
  };
  useEffect(() => { void load(); }, []);

  if (lesson && course) {
    return <LessonPlayer lesson={lesson} lang={lang} onExit={() => { setLesson(null); void load(); }} />;
  }

  if (course) {
    const flat = allLessons(course);
    return (
      <div className="space-y-4">
        <button onClick={() => setCourse(null)} className="text-xl font-bold text-violet-500">←</button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-2xl">{course.emoji}</div>
          <h2 className="text-lg font-black text-violet-800">{lang === 'vi' ? course.titleVi : course.titleEn}</h2>
        </div>
        {course.units.map((u) => (
          <div key={u.id} className="space-y-2">
            <h3 className="px-1 text-xs font-extrabold uppercase tracking-wide text-violet-400">{lang === 'vi' ? u.titleVi : u.titleEn}</h3>
            {u.lessons.map((l) => {
              const flatIdx = flat.findIndex((x) => x.id === l.id);
              const pct = progress[l.id] ?? 0;
              const done = pct >= 50;
              const unlocked = flatIdx === 0 || (progress[flat[flatIdx - 1].id] ?? 0) >= 50;
              return (
                <button
                  key={l.id}
                  disabled={!unlocked}
                  onClick={() => setLesson(l)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                    done ? 'border-emerald-100 bg-emerald-50/60' : unlocked ? 'border-violet-100 bg-white hover:border-violet-300' : 'border-slate-100 bg-slate-50 opacity-60'
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${done ? 'bg-emerald-100' : unlocked ? 'bg-violet-100' : 'bg-slate-200'}`}>
                    {done ? '✓' : unlocked ? l.emoji : '🔒'}
                  </span>
                  <span className="flex-1 font-extrabold text-slate-700">{lang === 'vi' ? l.titleVi : l.titleEn}</span>
                  {done ? (
                    <span className="text-sm">{pct >= 90 ? '⭐⭐⭐' : pct >= 70 ? '⭐⭐' : '⭐'}</span>
                  ) : unlocked ? (
                    <span className="chip bg-violet-600 text-white">Học →</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="px-1 font-black text-violet-800">📖 Tự luyện mỗi ngày</h2>
      {COURSES.map((c) => {
        const lessons = allLessons(c);
        const done = lessons.filter((l) => (progress[l.id] ?? 0) >= 50).length;
        const pct = Math.round((done / lessons.length) * 100);
        return (
          <button key={c.id} onClick={() => setCourse(c)} className="card flex w-full items-center gap-3 text-left transition active:scale-[0.99] hover:border-violet-300">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-2xl">{c.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-black text-slate-700">{lang === 'vi' ? c.titleVi : c.titleEn}</span>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-violet-100">
                <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all" style={{ width: `${pct}%` }} />
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-black text-violet-700">{pct}%</span>
              <span className="block text-[10px] font-bold text-slate-400">{done}/{lessons.length}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
