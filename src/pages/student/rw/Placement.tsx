import { useState } from 'react';
import { CURRICULUM } from '../../../data/curriculum';
import type { RWProgress } from './engine';
import { NavButton, StepCard } from './shared';

interface PQ {
  monthIndex: number;
  prompt: string;
  options: string[];
  answer: string;
}

// Two questions per month, easy → hard. Placement stops at the first month
// where the learner misses a question — that's where they should start.
const QUESTIONS: PQ[] = [
  { monthIndex: 0, prompt: 'Which word has the short A sound (like in "hat")?', options: ['cake', 'cat', 'car', 'came'], answer: 'cat' },
  { monthIndex: 0, prompt: 'Blend these sounds: /d/ /o/ /g/', options: ['dig', 'dot', 'dog', 'dug'], answer: 'dog' },
  { monthIndex: 1, prompt: 'What is the plural of "child"?', options: ['childs', 'children', 'childes', 'childrens'], answer: 'children' },
  { monthIndex: 1, prompt: '"She ___ to school every day."', options: ['walk', 'walks', 'walking', 'walked'], answer: 'walks' },
  { monthIndex: 2, prompt: 'The sentence that states a paragraph\'s main idea is called the:', options: ['closing sentence', 'topic sentence', 'detail sentence', 'question sentence'], answer: 'topic sentence' },
  { monthIndex: 2, prompt: '"He slammed the door and refused to speak." We can infer he is:', options: ['tired', 'hungry', 'angry', 'happy'], answer: 'angry' },
  { monthIndex: 3, prompt: 'In an essay, the thesis statement belongs in the:', options: ['conclusion', 'introduction', 'third body paragraph', 'title'], answer: 'introduction' },
  { monthIndex: 3, prompt: '"Summer is the best season." This is:', options: ['a fact', 'an opinion', 'a statistic', 'evidence'], answer: 'an opinion' },
  { monthIndex: 4, prompt: '"Her smile was like sunshine" is a:', options: ['metaphor', 'simile', 'hyperbole', 'personification'], answer: 'simile' },
  { monthIndex: 4, prompt: 'Which sentence is formal?', options: ["Can't make it, sorry!", 'It is not possible to attend.', 'No way I can come.', 'Nah, busy that day.'], answer: 'It is not possible to attend.' },
  { monthIndex: 5, prompt: 'In the SQ3R reading method, the first step is:', options: ['Recite', 'Question', 'Survey', 'Review'], answer: 'Survey' },
  { monthIndex: 5, prompt: 'Rewrite in active voice: "The report was written by her."', options: ['The report is written.', 'She wrote the report.', 'The report she wrote.', 'By her the report was written.'], answer: 'She wrote the report.' },
];

export default function Placement({ apply, onClose }: {
  apply: (fn: (p: RWProgress) => RWProgress) => void;
  onClose: () => void;
}) {
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [result, setResult] = useState<number | null>(null); // placed-through month index

  const q = QUESTIONS[qIndex];

  const finish = (all: boolean[]) => {
    // Walk months in order; placement stops at the first month with any miss
    let placed = 0;
    for (let m = 0; m < CURRICULUM.length; m++) {
      const qs = QUESTIONS.map((qq, i) => ({ qq, ok: all[i] })).filter(({ qq }) => qq.monthIndex === m);
      if (qs.every(({ ok }) => ok)) placed = Math.min(m + 1, CURRICULUM.length - 1);
      else break;
    }
    setResult(placed);
    apply((p) => ({ ...p, placedThroughMonth: Math.max(p.placedThroughMonth ?? 0, placed) }));
  };

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const all = [...answers, opt === q.answer];
    setAnswers(all);
    // A miss in this month's pair means we already know the placement — but let
    // the learner finish the current question's feedback before deciding.
    setTimeout(() => {
      if (qIndex + 1 >= QUESTIONS.length) {
        finish(all);
      } else {
        // Early exit: if this month already has a miss, further questions only get harder
        const monthMissed = QUESTIONS.map((qq, i) => ({ qq, ok: all[i] ?? true }))
          .filter(({ qq }, i) => i < all.length && qq.monthIndex === q.monthIndex)
          .some(({ ok }) => !ok);
        if (monthMissed && all.length >= (q.monthIndex + 1) * 2 - 1) {
          finish(all);
        } else {
          setQIndex((i) => i + 1);
          setPicked(null);
        }
      }
    }, 900);
  };

  if (result !== null) {
    const month = CURRICULUM[result];
    return (
      <StepCard>
        <div className="py-6 text-center">
          <div className="mb-3 text-5xl">{month.emoji}</div>
          <h3 className="text-xl font-black text-gray-800">
            {result === 0 ? 'Start at the beginning — and build a rock-solid foundation!' : `You can start at Month ${result + 1}!`}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {result === 0
              ? 'Month 1 covers the alphabet, sounds, and first words. Strong foundations make everything after easier.'
              : `Months 1–${result + 1} are now unlocked. You can still do earlier lessons anytime — they're great review.`}
          </p>
          <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm font-bold text-violet-700">
            Recommended start: Month {result + 1} — {month.title} ({month.level})
          </div>
          <NavButton label="Let's go! →" onClick={onClose} color="bg-violet-600" />
        </div>
      </StepCard>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="text-sm font-semibold text-gray-500 hover:text-gray-800">← Cancel test</button>
      <StepCard>
        <div className="flex items-center justify-between text-xs font-bold text-gray-400">
          <span>Placement question {qIndex + 1} / {QUESTIONS.length}</span>
          <span>Level: Month {q.monthIndex + 1}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-1.5 rounded-full bg-violet-500 transition-all" style={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }} />
        </div>
        <p className="py-2 text-center text-base font-black text-gray-800">{q.prompt}</p>
        <div className="grid grid-cols-1 gap-2">
          {q.options.map((opt) => (
            <button key={opt} onClick={() => choose(opt)} disabled={!!picked}
              className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all ${
                picked && opt === q.answer ? 'border-green-400 bg-green-100 text-green-800'
                  : picked === opt ? 'border-red-400 bg-red-100 text-red-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300'}`}>
              {opt}
            </button>
          ))}
        </div>
        <p className="text-center text-[11px] text-gray-400">The questions get harder — answer honestly for an accurate starting point.</p>
      </StepCard>
    </div>
  );
}
