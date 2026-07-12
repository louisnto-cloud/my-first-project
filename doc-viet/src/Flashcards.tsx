import { useMemo, useState } from 'react';
import { awardOnce, todayISO, type DVProgress } from './engine';
import type { TTS } from './useTTS';
import { Confetti, NavButton, StepCard, XpChip } from './shared';

interface Card {
  word: string;
  meaning: string;
}

// Always-available starter deck (survival Vietnamese) so flashcards work from day one
const STARTER_CARDS: Card[] = [
  { word: 'xin chào', meaning: 'hello' },
  { word: 'cảm ơn', meaning: 'thank you' },
  { word: 'tôi', meaning: 'I / me' },
  { word: 'bạn', meaning: 'you / friend' },
  { word: 'một', meaning: 'one' },
  { word: 'ăn', meaning: 'to eat' },
  { word: 'nước', meaning: 'water; country' },
  { word: 'nhà', meaning: 'house; home' },
  { word: 'mẹ', meaning: 'mother' },
  { word: 'vui', meaning: 'happy; fun' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FLASH_XP = 10;

export default function Flashcards({ deck, progress, apply, tts, onClose }: {
  deck: Card[]; // learner's vocabulary; starter words fill in when it's small
  progress: DVProgress;
  apply: (fn: (p: DVProgress) => DVProgress) => void;
  tts: TTS;
  onClose: () => void;
}) {
  const cards = useMemo(() => {
    const pool = deck.length >= 8 ? deck : [...deck, ...STARTER_CARDS];
    return shuffle(pool).slice(0, 12);
  }, [deck]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [again, setAgain] = useState<Card[]>([]);
  const [gotIt, setGotIt] = useState(0);
  const [queue, setQueue] = useState<Card[]>(cards);
  const [done, setDone] = useState(false);

  const card = queue[index];
  const dayKey = `flash:${todayISO()}`;
  const xpAvailable = !progress.xpKeys.includes(dayKey);

  const mark = (knewIt: boolean) => {
    if (!knewIt) setAgain((a) => [...a, card]);
    else setGotIt((n) => n + 1);
    setFlipped(false);
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    } else if (!knewIt || again.length > 0) {
      // Cycle the missed cards until every one is "Got it"
      const nextQueue = knewIt ? again : [...again, card];
      if (nextQueue.length === 0) { finish(); return; }
      setQueue(shuffle(nextQueue));
      setAgain([]);
      setIndex(0);
    } else {
      finish();
    }
  };

  const finish = () => {
    apply((p) => awardOnce(p, [{ key: dayKey, xp: FLASH_XP }]).progress);
    setDone(true);
  };

  if (done) {
    return (
      <StepCard>
        <Confetti />
        <div className="py-6 text-center">
          <div className="mb-3 text-5xl">🃏</div>
          <h3 className="text-2xl font-black text-gray-800">Deck Complete!</h3>
          <p className="mt-1 text-gray-600">You worked through every card{xpAvailable && <> — <XpChip amount={FLASH_XP} /></>}</p>
          <p className="mt-3 text-xs text-gray-400">Cards you marked "Again" kept coming back until you knew them all. Come back tomorrow for more XP.</p>
          <NavButton label="Back to Review →" onClick={onClose} color="bg-red-600" />
        </div>
      </StepCard>
    );
  }

  if (!card) { onClose(); return null; }

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="text-sm font-semibold text-gray-500 hover:text-gray-800">← End session</button>
      <div className="flex items-center justify-between text-xs font-bold text-gray-400">
        <span>Card {index + 1} / {queue.length}</span>
        <span>✅ {gotIt} · 🔁 {again.length}</span>
      </div>

      <button
        onClick={() => { setFlipped((f) => !f); if (!flipped) tts.speak(card.word); }}
        className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-3xl border-4 p-6 text-center shadow-md transition-all ${
          flipped ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-white'}`}
      >
        {!flipped ? (
          <>
            <div className="text-3xl font-black text-gray-800">{card.word}</div>
            <div className="mt-3 text-xs font-semibold text-gray-400">🔊 plays when you flip · tap to see the meaning</div>
          </>
        ) : (
          <>
            <div className="text-sm font-black uppercase tracking-wide text-emerald-600">{card.word}</div>
            <div className="mt-2 text-lg font-bold text-gray-700">{card.meaning}</div>
            <button onClick={(e) => { e.stopPropagation(); tts.speak(card.word); }}
              className="mt-3 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">🔊 hear it again</button>
          </>
        )}
      </button>

      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => mark(false)} className="rounded-xl border-2 border-amber-300 bg-amber-50 py-3 font-black text-amber-700 hover:bg-amber-100">
            🔁 Again
          </button>
          <button onClick={() => mark(true)} className="rounded-xl border-2 border-emerald-300 bg-emerald-50 py-3 font-black text-emerald-700 hover:bg-emerald-100">
            ✅ Got it
          </button>
        </div>
      )}
    </div>
  );
}
