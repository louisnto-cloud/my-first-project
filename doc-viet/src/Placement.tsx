import { useState } from 'react';
import { CURRICULUM } from './data/curriculum';
import type { DVProgress } from './engine';
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
  { monthIndex: 0, prompt: 'Which letter is NOT in the Vietnamese alphabet?', options: ['đ', 'ơ', 'f', 'ă'], answer: 'f' },
  { monthIndex: 0, prompt: 'Which word carries the falling huyền tone?', options: ['ma', 'mà', 'má', 'mạ'], answer: 'mà' },
  { monthIndex: 1, prompt: 'Which spelling is correct before "i"?', options: ['ngi', 'nghi', 'ngii', 'nqi'], answer: 'nghi' },
  { monthIndex: 1, prompt: '"Tôi là học sinh" means:', options: ['I am a teacher', 'I am a student', 'You are a student', 'This is a school'], answer: 'I am a student' },
  { monthIndex: 2, prompt: 'How do you ask "Where do you live?"', options: ['Bạn sống gì?', 'Bạn sống ở đâu?', 'Bạn sống không?', 'Ai sống?'], answer: 'Bạn sống ở đâu?' },
  { monthIndex: 2, prompt: 'Which marker makes "Tôi ăn" past tense?', options: ['sẽ', 'đang', 'đã', 'không'], answer: 'đã' },
  { monthIndex: 3, prompt: 'Which of these is a từ láy (echo-word)?', options: ['quần áo', 'nho nhỏ', 'xe đạp', 'học sinh'], answer: 'nho nhỏ' },
  { monthIndex: 3, prompt: '"Học sinh" is a Sino-Vietnamese word meaning:', options: ['teacher', 'student', 'hospital', 'lesson'], answer: 'student' },
  { monthIndex: 4, prompt: 'A formal Vietnamese letter opens with:', options: ['Này bạn!', 'Kính gửi', 'Tạm biệt', 'Trân trọng'], answer: 'Kính gửi' },
  { monthIndex: 4, prompt: '"Tuy trời mưa ___ tôi vẫn đi." The missing word is:', options: ['và', 'nên', 'nhưng', 'thì'], answer: 'nhưng' },
  { monthIndex: 5, prompt: 'The introduction of a Vietnamese essay is called:', options: ['kết bài', 'thân bài', 'mở bài', 'tiêu đề'], answer: 'mở bài' },
  { monthIndex: 5, prompt: 'In the SQ3R reading method, the first step is:', options: ['Recite', 'Question', 'Survey', 'Review'], answer: 'Survey' },
];

export default function Placement({ apply, onClose }: {
  apply: (fn: (p: DVProgress) => DVProgress) => void;
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
              ? 'Month 1 covers the alphabet, the seven new letters, and the six tones. Strong foundations make everything after easier.'
              : `Months 1–${result + 1} are now unlocked. You can still do earlier lessons anytime — they're great review.`}
          </p>
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            Recommended start: Month {result + 1} — {month.title} ({month.level})
          </div>
          <NavButton label="Let's go! →" onClick={onClose} color="bg-red-600" />
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
          <div className="h-1.5 rounded-full bg-red-500 transition-all" style={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }} />
        </div>
        <p className="py-2 text-center text-base font-black text-gray-800">{q.prompt}</p>
        <div className="grid grid-cols-1 gap-2">
          {q.options.map((opt) => (
            <button key={opt} onClick={() => choose(opt)} disabled={!!picked}
              className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all ${
                picked && opt === q.answer ? 'border-green-400 bg-green-100 text-green-800'
                  : picked === opt ? 'border-red-400 bg-red-100 text-red-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-red-300'}`}>
              {opt}
            </button>
          ))}
        </div>
        <p className="text-center text-[11px] text-gray-400">The questions get harder — answer honestly for an accurate starting point.</p>
      </StepCard>
    </div>
  );
}
