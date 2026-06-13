import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { sfx, speak } from './sound';
import { Celebrate } from './Celebrate';

// The assignment player: all 8 Part C question types, continuous autosave,
// huge touch targets, audio via speech synthesis with replay limits.

interface Q {
  id: string;
  type: string;
  skill: string;
  prompt: string;
  points: number;
  options?: string[];
  sentence?: string;
  choices?: string[];
  text?: string;
  gapIds?: number[];
  wordBank?: string[];
  words?: string[];
  audioText?: string;
  audioUrl?: string;
  replayLimit?: number;
  imageUrl?: string | null;
  starters?: string[];
}

interface Assignment {
  id: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  questions: Q[];
}

function Audio({ q, t }: { q: Q; t: (k: string) => string }) {
  const [left, setLeft] = useState(q.replayLimit ?? 2);
  const play = (rate = 0.95) => {
    if (left <= 0) return;
    setLeft(left - 1);
    if (q.audioText) speak(q.audioText, rate);
  };
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => play()} disabled={left <= 0} className="btn-primary !rounded-full !p-5 text-2xl shadow-lg">🔊</button>
      <button onClick={() => play(0.55)} disabled={left <= 0} className="text-2xl" aria-label="Nghe chậm">🐢</button>
      <span className="text-xs font-bold text-slate-400">{left} {t('replaysLeft')}</span>
    </div>
  );
}

function QuestionCard({ q, value, onChange, t }: { q: Q; value: unknown; onChange: (v: unknown) => void; t: (k: string) => string }) {
  const [order, setOrder] = useState<number[]>(Array.isArray(value) && q.words ? (value as string[]).map((w) => q.words!.indexOf(w)).filter((i) => i >= 0) : []);

  const pick = (opt: string) => { sfx.click(); onChange(opt); };
  const pickMulti = (opt: string) => {
    const cur = new Set(Array.isArray(value) ? (value as string[]) : []);
    if (cur.has(opt)) cur.delete(opt);
    else cur.add(opt);
    onChange([...cur]);
  };

  return (
    <div className="card space-y-3">
      <div className="text-xs font-bold uppercase text-violet-400">{q.skill}</div>
      {q.prompt && <div className="text-lg font-extrabold">{q.prompt}</div>}
      {(q.type === 'listen_mc' || q.type === 'dictation') && <Audio q={q} t={t} />}
      {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-56 rounded-2xl" />}

      {(q.type === 'mc' || q.type === 'listen_mc') &&
        q.options!.map((opt) => (
          <button key={opt} onClick={() => pick(opt)} className={`block w-full rounded-2xl border-2 p-3 text-left font-bold ${value === opt ? 'border-violet-500 bg-violet-50' : 'border-violet-100 bg-white'}`}>
            {opt}
          </button>
        ))}

      {q.type === 'mc_multi' &&
        q.options!.map((opt) => {
          const on = Array.isArray(value) && (value as string[]).includes(opt);
          return (
            <button key={opt} onClick={() => pickMulti(opt)} className={`block w-full rounded-2xl border-2 p-3 text-left font-bold ${on ? 'border-emerald-500 bg-emerald-50' : 'border-violet-100 bg-white'}`}>
              {on ? '✅ ' : '⬜ '}{opt}
            </button>
          );
        })}

      {q.type === 'fill_blank' && (
        <>
          <div className="text-xl font-black text-violet-700">{q.sentence}</div>
          {q.choices ? (
            q.choices.map((opt) => (
              <button key={opt} onClick={() => pick(opt)} className={`mr-2 rounded-2xl border-2 px-4 py-2 font-bold ${value === opt ? 'border-violet-500 bg-violet-50' : 'border-violet-100 bg-white'}`}>
                {opt}
              </button>
            ))
          ) : (
            <input className="input" placeholder={t('typeHere')} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
          )}
        </>
      )}

      {q.type === 'fill_gaps' && (
        <>
          <div className="text-lg font-bold text-violet-700">{q.text}</div>
          {q.wordBank && <div className="text-xs font-bold text-slate-400">{q.wordBank.join(' · ')}</div>}
          {q.gapIds!.map((g) => (
            <input
              key={g}
              className="input"
              placeholder={`${g}…`}
              value={String((value as Record<string, string>)?.[String(g)] ?? '')}
              onChange={(e) => onChange({ ...((value as object) ?? {}), [String(g)]: e.target.value })}
            />
          ))}
        </>
      )}

      {q.type === 'reorder' && (
        <>
          <div className="text-xs font-bold text-slate-400">{t('tapInOrder')}</div>
          <div className="min-h-[44px] rounded-2xl bg-violet-50 p-2 font-black text-violet-700">
            {order.map((i, pos) => (
              <button key={pos} onClick={() => { const next = order.filter((_, p) => p !== pos); setOrder(next); onChange(next.map((x) => q.words![x])); }} className="m-0.5 rounded-xl bg-white px-2.5 py-1 shadow-sm">
                {q.words![i]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {q.words!.map((w, i) =>
              order.includes(i) ? null : (
                <button key={i} onClick={() => { const next = [...order, i]; setOrder(next); onChange(next.map((x) => q.words![x])); }} className="rounded-2xl border-2 border-violet-100 bg-white px-3 py-2 font-bold">
                  {w}
                </button>
              ),
            )}
          </div>
        </>
      )}

      {(q.type === 'dictation' || q.type === 'picture') && (
        <>
          {q.starters && <div className="text-xs font-bold text-slate-400">{q.starters.join(' / ')}</div>}
          <textarea className="input" rows={3} placeholder={t('typeHere')} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
        </>
      )}
    </div>
  );
}

export function Player({ assignmentId, onExit, t }: { assignmentId: string; onExit: () => void; t: (k: string) => string }) {
  const [a, setA] = useState<Assignment | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [result, setResult] = useState<{ status: string; late: boolean; overall?: number; pendingReview?: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    void (async () => {
      const detail = await api<Assignment>('GET', `/assignments/${assignmentId}`);
      setA(detail);
      const start = await api<{ submissionId: string }>('POST', `/assignments/${assignmentId}/start`);
      setSubmissionId(start.submissionId);
    })();
  }, [assignmentId]);

  const setAnswer = (qid: string, v: unknown) => {
    const next = { ...answers, [qid]: v };
    setAnswers(next);
    setSaveState('saving');
    clearTimeout(timer.current);
    // Continuous autosave: a dropped connection never loses work.
    timer.current = setTimeout(async () => {
      try {
        await api('PATCH', `/submissions/${submissionId}/answers`, { answers: { [qid]: v } });
        setSaveState('saved');
      } catch {
        setSaveState('idle');
      }
    }, 600);
  };

  const submit = async () => {
    const res = await api<{ status: string; late: boolean; overall?: number; pendingReview?: boolean }>('POST', `/submissions/${submissionId}/submit`);
    setResult(res);
  };

  if (!a) return <div className="card animate-pulse text-center text-slate-300">…</div>;

  if (result) {
    return (
      <Celebrate
        title={a.title}
        pct={result.pendingReview ? null : result.overall ?? 0}
        pending={result.pendingReview}
        onDone={onExit}
        doneLabel={t('backToCourse') === 'backToCourse' ? 'Xong' : t('backToCourse')}
      />
    );
  }

  const answered = a.questions.filter((q) => answers[q.id] != null && answers[q.id] !== '').length;
  const pct = Math.round((answered / Math.max(1, a.questions.length)) * 100);

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 -mx-4 bg-violet-50/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={onExit} className="text-xl font-bold text-violet-500">←</button>
          <h2 className="truncate px-2 text-sm font-black text-violet-800">{a.title}</h2>
          <span className="w-10 text-right text-[11px] font-bold text-slate-400">{answered}/{a.questions.length}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-violet-100">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {a.instructions && <div className="card text-sm font-semibold text-slate-600">{a.instructions}</div>}
      {a.questions.map((q) => (
        <QuestionCard key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} t={t} />
      ))}
      <button onClick={submit} disabled={!submissionId} className="btn-primary w-full py-3.5 text-lg">{t('submit')} 🚀</button>
      <div className="pb-2 text-center text-[11px] font-bold text-slate-400">{saveState === 'saving' ? t('saving') : saveState === 'saved' ? `✓ ${t('saved')}` : ''}</div>
    </div>
  );
}
