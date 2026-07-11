import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { useI18n } from '../i18n';
import { addPractice, speak } from '../lib';
import type { VocabList, VocabWord } from '../types';

function SpeakButton({ text, tone = 'light' }: { text: string; tone?: 'light' | 'dark' }) {
  const { t } = useI18n();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      title={t('practice.listen')}
      aria-label={t('practice.listen')}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-lg transition active:scale-90 ${
        tone === 'dark' ? 'bg-white/20 hover:bg-white/30' : 'bg-violet-100 hover:bg-violet-200'
      }`}
    >
      🔊
    </button>
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
  const [cards] = useState(() => shuffle(list.words));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [finished, setFinished] = useState(false);

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

  if (finished) {
    return (
      <Result
        emoji={known >= cards.length * 0.7 ? '🎉' : '💪'}
        line={`${t('practice.youKnew')} ${known}/${cards.length}`}
        points={Math.max(2, known)}
        onExit={onExit}
      />
    );
  }

  const card = cards[idx];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <button onClick={onExit} className="text-violet-500">← {t('common.back')}</button>
        <span>
          {idx + 1} / {cards.length}
        </span>
      </div>
      <div className="relative">
        <div className="absolute right-3 top-3 z-10">
          <SpeakButton text={card.term} tone={flipped ? 'dark' : 'light'} />
        </div>
        <button
          onClick={() => setFlipped(!flipped)}
          className={`card flex min-h-[220px] w-full flex-col items-center justify-center gap-2 text-center transition ${flipped ? 'border-violet-300 bg-violet-600 text-white' : ''}`}
        >
          {flipped ? (
            <>
              <div className="text-2xl font-black">{card.meaningVi}</div>
              <p className="text-sm font-semibold text-violet-100">“{card.example}”</p>
            </>
          ) : (
            <>
              <div className="text-3xl font-black text-violet-700">{card.term}</div>
              <div className="text-xs font-bold text-slate-300">{t('practice.tapToFlip')}</div>
            </>
          )}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => answer(false)} className="btn bg-amber-100 text-amber-700 hover:bg-amber-200">
          {t('practice.dontKnow')}
        </button>
        <button onClick={() => answer(true)} className="btn bg-emerald-500 text-white hover:bg-emerald-600">
          {t('practice.know')}
        </button>
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
  const questions: QuizQ[] = useMemo(() => {
    return shuffle(list.words).map((word) => {
      const distractors = shuffle(list.words.filter((w) => w.id !== word.id))
        .slice(0, 3)
        .map((w) => w.meaningVi);
      return { word, options: shuffle([word.meaningVi, ...distractors]) };
    });
  }, [list]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[idx];

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

  if (finished) {
    return (
      <Result
        emoji={correct === questions.length ? '🏆' : correct >= questions.length * 0.7 ? '🎉' : '💪'}
        line={`${t('practice.correct')}: ${correct}/${questions.length}`}
        points={Math.max(2, correct * 2)}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <button onClick={onExit} className="text-violet-500">← {t('common.back')}</button>
        <span>
          {idx + 1} / {questions.length}
        </span>
      </div>
      <div className="card text-center">
        <div className="text-xs font-bold text-slate-400">{t('practice.whichMeaning')}</div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="text-3xl font-black text-violet-700">{q.word.term}</div>
          <SpeakButton text={q.word.term} />
        </div>
      </div>
      <div className="space-y-2">
        {q.options.map((opt) => {
          let cls = 'bg-white border-violet-100 hover:border-violet-300';
          if (picked) {
            if (opt === q.word.meaningVi) cls = 'bg-emerald-500 border-emerald-500 text-white';
            else if (opt === picked) cls = 'bg-rose-400 border-rose-400 text-white';
            else cls = 'bg-white border-violet-100 opacity-50';
          }
          return (
            <button key={opt} onClick={() => pick(opt)} className={`w-full rounded-2xl border-2 p-3 text-left text-sm font-bold transition ${cls}`}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Result({ emoji, line, points, onExit }: { emoji: string; line: string; points: number; onExit: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card animate-pop flex flex-col items-center gap-3 py-10 text-center">
      <div className="text-6xl">{emoji}</div>
      <div className="text-xl font-black text-violet-700">{t('practice.complete')}</div>
      <div className="text-sm font-bold text-slate-500">{line}</div>
      <div className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-black text-amber-700">
        +{points} ⭐ {t('practice.earned')}
      </div>
      <button onClick={onExit} className="btn-primary mt-2">
        {t('practice.again')}
      </button>
    </div>
  );
}
