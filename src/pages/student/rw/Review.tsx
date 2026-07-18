import { useMemo, useState } from 'react';
import { getAllLessons } from '../../../data/curriculum';
import { LIBRARY } from '../../../data/library';
import { todayISO, XP, type RWProgress } from './engine';
import { useTTS } from './useTTS';
import Flashcards from './Flashcards';
import { Confetti, NavButton, StepCard, XpChip } from './shared';

interface ReviewQ {
  word: string;
  meaning: string;
  options: string[]; // word options (choice mode)
  mode: 'choice' | 'type'; // words answered correctly 2+ times graduate to typed recall
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** All vocabulary the learner has met: lesson key words + words from completed stories. */
function learnedVocab(progress: RWProgress): { word: string; meaning: string }[] {
  const fromLessons = getAllLessons()
    .filter((l) => progress.completedLessons.includes(l.id))
    .flatMap((l) => l.keyWords);
  const fromStories = LIBRARY
    .filter((s) => progress.completedStories.includes(s.id))
    .flatMap((s) => s.vocab);
  const unique = new Map<string, string>();
  for (const kw of [...fromLessons, ...fromStories]) if (!unique.has(kw.word)) unique.set(kw.word, kw.meaning);
  return [...unique.entries()].map(([word, meaning]) => ({ word, meaning }));
}

/** Session of the weakest / least-recently-reviewed words first. */
function buildSession(progress: RWProgress, size = 8): ReviewQ[] {
  const pool = learnedVocab(progress);
  if (pool.length < 4) return [];

  const priority = (w: string) => {
    const s = progress.reviewHistory[w];
    if (!s) return -1000 - Math.random() * 10; // never reviewed → highest priority
    const daysAgo = Math.floor((Date.parse(todayISO()) - Date.parse(s.last)) / 86400000);
    return s.correct - s.wrong * 2 - daysAgo; // low score = review sooner
  };
  const chosen = [...pool].sort((a, b) => priority(a.word) - priority(b.word)).slice(0, size);

  return shuffle(chosen).map((item) => {
    const distractors = shuffle(pool.filter((p) => p.word !== item.word)).slice(0, 3).map((p) => p.word);
    const stat = progress.reviewHistory[item.word];
    // Recognition first; once a word is answered correctly twice it graduates to typed recall
    const mode: ReviewQ['mode'] = stat && stat.correct >= 2 && stat.correct > stat.wrong ? 'type' : 'choice';
    return { word: item.word, meaning: item.meaning, options: shuffle([item.word, ...distractors]), mode };
  });
}

export default function Review({ progress, apply }: {
  progress: RWProgress;
  apply: (fn: (p: RWProgress) => RWProgress) => void;
}) {
  const tts = useTTS();
  const [session, setSession] = useState<ReviewQ[] | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const learnedCount = useMemo(() => learnedVocab(progress).length, [progress]);

  if (showFlash) {
    return <Flashcards deck={learnedVocab(progress)} progress={progress} apply={apply} tts={tts} onClose={() => setShowFlash(false)} />;
  }

  const start = () => {
    setSession(buildSession(progress));
    setQIndex(0);
    setPicked(null);
    setTyped('');
    setCorrectCount(0);
    setFinished(false);
  };

  const q = session?.[qIndex];

  const choose = (opt: string) => {
    if (!q || picked) return;
    setPicked(opt);
    const right = opt.trim().toLowerCase() === q.word.toLowerCase();
    tts.speak(q.word); // reinforce the sound–spelling link right after answering
    if (right) setCorrectCount((n) => n + 1);
    apply((p) => {
      const prev = p.reviewHistory[q.word] ?? { correct: 0, wrong: 0, last: todayISO() };
      return {
        ...p,
        xp: p.xp + (right ? XP.reviewCorrect : 0),
        reviewHistory: {
          ...p.reviewHistory,
          [q.word]: { correct: prev.correct + (right ? 1 : 0), wrong: prev.wrong + (right ? 0 : 1), last: todayISO() },
        },
      };
    });
  };

  const next = () => {
    if (!session) return;
    if (qIndex + 1 >= session.length) {
      apply((p) => ({ ...p, xp: p.xp + XP.reviewSession, reviewSessions: p.reviewSessions + 1 }));
      setFinished(true);
    } else {
      setQIndex((i) => i + 1);
      setPicked(null);
      setTyped('');
    }
  };

  // ── Not enough material yet ──
  if (learnedCount < 4) {
    return (
      <StepCard>
        <div className="py-8 text-center">
          <div className="mb-3 text-5xl">🌱</div>
          <h3 className="text-lg font-black text-gray-800">Nothing to review yet</h3>
          <p className="mt-2 text-sm text-gray-500">Complete a few lessons or stories first — every word you learn is added to your review deck automatically.</p>
          <p className="mt-2 text-sm text-gray-500">Meanwhile, warm up with the starter flashcards:</p>
          <NavButton label="🃏 Flashcards — Sight Words →" onClick={() => setShowFlash(true)} color="bg-emerald-600" />
        </div>
      </StepCard>
    );
  }

  // ── Session finished ──
  if (finished && session) {
    return (
      <StepCard>
        <Confetti />
        <div className="py-6 text-center">
          <div className="mb-3 text-5xl">🧠</div>
          <h3 className="text-2xl font-black text-gray-800">Review Complete!</h3>
          <p className="mt-1 text-gray-600">{correctCount} / {session.length} correct</p>
          <div className="mt-2"><XpChip amount={correctCount * XP.reviewCorrect + XP.reviewSession} /></div>
          <p className="mt-4 text-xs text-gray-400">Words you missed will come back sooner next time — that's how memory works best.</p>
          <NavButton label="Review Again 🔁" onClick={start} color="bg-violet-600" />
        </div>
      </StepCard>
    );
  }

  // ── In-session question ──
  if (session && q) {
    return (
      <StepCard>
        <div className="flex items-center justify-between text-xs font-bold text-gray-400">
          <span>Question {qIndex + 1} / {session.length}</span>
          <span>✅ {correctCount}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-1.5 rounded-full bg-violet-500 transition-all" style={{ width: `${((qIndex + (picked ? 1 : 0)) / session.length) * 100}%` }} />
        </div>
        <div className="py-3 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-violet-500">
            {q.mode === 'type' ? '⭐ Recall — type the word that means…' : 'Which word means…'}
          </div>
          <p className="mt-2 text-lg font-black text-gray-800">"{q.meaning}"</p>
          <button onClick={() => tts.speak(q.meaning)} className="mt-1 text-xs text-gray-400 hover:text-gray-600">🔊 hear it</button>
        </div>

        {q.mode === 'choice' ? (
          <div className="grid grid-cols-1 gap-2">
            {q.options.map((opt) => (
              <button key={opt} onClick={() => choose(opt)} disabled={!!picked}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all ${
                  picked && opt === q.word ? 'border-green-400 bg-green-100 text-green-800'
                    : picked === opt ? 'border-red-400 bg-red-100 text-red-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300'}`}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={picked ?? typed}
              disabled={!!picked}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && typed.trim() && !picked) choose(typed); }}
              placeholder={`Type the word (${q.word.length} letters, starts with "${q.word[0]}")`}
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
              className={`w-full rounded-xl border-2 px-3 py-2.5 text-sm font-bold focus:outline-none ${
                picked
                  ? picked.trim().toLowerCase() === q.word.toLowerCase() ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'
                  : 'border-gray-200 focus:border-violet-400'}`}
            />
            {!picked ? (
              <button onClick={() => typed.trim() && choose(typed)} disabled={!typed.trim()}
                className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-black text-white disabled:opacity-40">
                Check
              </button>
            ) : picked.trim().toLowerCase() !== q.word.toLowerCase() && (
              <p className="text-center text-sm font-bold text-red-600">The word was: {q.word}</p>
            )}
          </div>
        )}
        {picked && (
          <NavButton label={qIndex + 1 >= session.length ? 'Finish Session →' : 'Next Question →'} onClick={next} color="bg-violet-600" />
        )}
      </StepCard>
    );
  }

  // ── Start screen ──
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 p-5 text-white shadow-lg">
        <div className="text-3xl">🔁</div>
        <h2 className="text-xl font-black">Smart Review</h2>
        <p className="text-sm opacity-90">
          Your review deck has <strong>{learnedCount} words</strong> from the lessons and stories you've completed.
          Words you struggle with come back more often — that's spaced repetition, the most effective way to remember.
        </p>
      </div>
      <StepCard>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-gray-700">📇 {learnedCount} words in your deck</span>
          <span className="text-xs text-gray-400">{progress.reviewSessions} sessions done</span>
        </div>
        <NavButton label="Start Review Session (8 questions) →" onClick={start} color="bg-violet-600" />
        <NavButton label="🃏 Flashcards — flip through your words" onClick={() => setShowFlash(true)} color="bg-emerald-600" />
      </StepCard>
    </div>
  );
}
