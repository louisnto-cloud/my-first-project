import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { useI18n } from '../i18n';
import { addPractice } from '../lib';
import type { VocabList, VocabWord } from '../types';

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-slate-700"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
    >
      <div
        className="h-full rounded-full bg-violet-500 transition-all duration-300 ease-out dark:bg-violet-400"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FlashcardSession({ list, studentId, onExit }: { list: VocabList; studentId: string; onExit: () => void }) {
  const { mutate } = useApp();
  const { t } = useI18n();
  const [cards, setCards] = useState(() => shuffle(list.words));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [finished, setFinished] = useState(false);
  const answerRef = useRef<(knew: boolean) => void>(() => {});

  const answer = (knew: boolean) => {
    const k = known + (knew ? 1 : 0);
    if (idx + 1 >= cards.length) {
      setKnown(k);
      setFinished(true);
      mutate((d) => addPractice(d, studentId, 'vocab', Math.max(2, k)));
    } else {
      setKnown(k);
      setIdx(idx + 1);
      setFlipped(false);
    }
  };
  answerRef.current = answer;

  const restart = () => {
    setCards(shuffle(list.words));
    setIdx(0);
    setFlipped(false);
    setKnown(0);
    setFinished(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        answerRef.current(true);
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        answerRef.current(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, onExit]);

  if (finished) {
    return (
      <Result
        emoji={known >= cards.length * 0.7 ? '🎉' : '💪'}
        line={`${t('practice.youKnew')} ${known}/${cards.length}`}
        points={Math.max(2, known)}
        onExit={onExit}
        onAgain={restart}
      />
    );
  }

  const card = cards[idx];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500">
        <button onClick={onExit} className="text-violet-500 dark:text-violet-300">← {t('common.back')}</button>
        <span>
          {idx + 1} / {cards.length}
        </span>
      </div>
      <ProgressBar value={idx} total={cards.length} />
      <button
        onClick={() => setFlipped(!flipped)}
        aria-label={flipped ? card.meaningVi : `${card.term}. ${t('practice.tapToFlip')}`}
        className={`card flex min-h-[220px] w-full flex-col items-center justify-center gap-2 text-center transition ${flipped ? 'border-violet-300 bg-violet-600 text-white' : ''}`}
      >
        {flipped ? (
          <>
            <div className="text-2xl font-black">{card.meaningVi}</div>
            <p className="text-sm font-semibold text-violet-100">"{card.example}"</p>
          </>
        ) : (
          <>
            <div className="text-3xl font-black text-violet-700 dark:text-violet-300">{card.term}</div>
            <div className="text-xs font-bold text-slate-300 dark:text-slate-600">{t('practice.tapToFlip')}</div>
          </>
        )}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => answer(false)}
          aria-keyshortcuts="ArrowLeft d"
          className="btn bg-amber-100 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
        >
          {t('practice.dontKnow')}
        </button>
        <button
          onClick={() => answer(true)}
          aria-keyshortcuts="ArrowRight k"
          className="btn bg-emerald-500 text-white hover:bg-emerald-600"
        >
          {t('practice.know')}
        </button>
      </div>
      <div className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {t('practice.keyHint')}
      </div>
    </div>
  );
}

interface QuizQ {
  word: VocabWord;
  options: string[];
}

export function QuizSession({ list, studentId, onExit }: { list: VocabList; studentId: string; onExit: () => void }) {
  const { mutate } = useApp();
  const { t } = useI18n();
  const [questionsSeed, setQuestionsSeed] = useState(0);
  const questions: QuizQ[] = useMemo(() => {
    return shuffle(list.words).map((word) => {
      const distractors = shuffle(list.words.filter((w) => w.id !== word.id))
        .slice(0, 3)
        .map((w) => w.meaningVi);
      return { word, options: shuffle([word.meaningVi, ...distractors]) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, questionsSeed]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[idx];
  const pickedRef = useRef<((opt: string) => void) | null>(null);

  const pick = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const ok = opt === q.word.meaningVi;
    const c = correct + (ok ? 1 : 0);
    setCorrect(c);
    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        setFinished(true);
        mutate((d) => addPractice(d, studentId, 'quiz', Math.max(2, c * 2)));
      } else {
        setIdx(idx + 1);
        setPicked(null);
      }
    }, 700);
  };
  pickedRef.current = pick;

  const restart = () => {
    setQuestionsSeed((s) => s + 1);
    setIdx(0);
    setPicked(null);
    setCorrect(0);
    setFinished(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= (q?.options.length ?? 0) && q) {
        e.preventDefault();
        pickedRef.current?.(q.options[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, onExit, q]);

  if (finished) {
    return (
      <Result
        emoji={correct === questions.length ? '🏆' : correct >= questions.length * 0.7 ? '🎉' : '💪'}
        line={`${t('practice.correct')}: ${correct}/${questions.length}`}
        points={Math.max(2, correct * 2)}
        onExit={onExit}
        onAgain={restart}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500">
        <button onClick={onExit} className="text-violet-500 dark:text-violet-300">← {t('common.back')}</button>
        <span>
          {idx + 1} / {questions.length}
        </span>
      </div>
      <ProgressBar value={idx} total={questions.length} />
      <div className="card text-center">
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500">{t('practice.whichMeaning')}</div>
        <div className="mt-2 text-3xl font-black text-violet-700 dark:text-violet-300">{q.word.term}</div>
      </div>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let cls = 'bg-white dark:bg-slate-800 border-violet-100 dark:border-slate-700 hover:border-violet-300';
          if (picked) {
            if (opt === q.word.meaningVi) cls = 'bg-emerald-500 border-emerald-500 text-white';
            else if (opt === picked) cls = 'bg-rose-400 border-rose-400 text-white';
            else cls = 'bg-white dark:bg-slate-800 border-violet-100 dark:border-slate-700 opacity-50';
          }
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              aria-keyshortcuts={`${i + 1}`}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm font-bold transition ${cls}`}
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-500 dark:bg-slate-700 dark:text-slate-300"
              >
                {i + 1}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>
      <div className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {t('practice.keyHintQuiz')}
      </div>
    </div>
  );
}

function Result({
  emoji,
  line,
  points,
  onExit,
  onAgain,
}: {
  emoji: string;
  line: string;
  points: number;
  onExit: () => void;
  onAgain?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="card animate-pop flex flex-col items-center gap-3 py-10 text-center">
      <div aria-hidden="true" className="text-6xl">{emoji}</div>
      <div className="text-xl font-black text-violet-700 dark:text-violet-300">{t('practice.complete')}</div>
      <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{line}</div>
      <div className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-black text-amber-700 dark:text-amber-300 dark:bg-amber-500/20">
        +{points} ⭐ {t('practice.earned')}
      </div>
      <div className="mt-2 grid w-full grid-cols-2 gap-2">
        <button onClick={onExit} className="btn-soft">
          {t('common.back')}
        </button>
        <button onClick={onAgain ?? onExit} className="btn-primary">
          {t('practice.again')}
        </button>
      </div>
    </div>
  );
}
