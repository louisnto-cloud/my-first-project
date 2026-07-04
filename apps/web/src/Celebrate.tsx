import { useEffect } from 'react';
import { sfx, speak } from './sound';
import { Mascot } from './Mascot';

// A calm, delightful finish screen — Apple-style: one big number, gentle
// confetti, a single clear action. Reused by assignments and lessons.

function Confetti() {
  const pieces = Array.from({ length: 28 });
  const colors = ['#7c3aed', '#d946ef', '#ffe11a', '#34d399', '#fb7185', '#60a5fa'];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 7) * 0.12;
        const dur = 1.6 + ((i % 5) * 0.25);
        const color = colors[i % colors.length];
        const size = 7 + (i % 4) * 2;
        return (
          <span
            key={i}
            className="absolute top-[-20px] rounded-[2px]"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 1.4,
              background: color,
              animation: `fall ${dur}s ${delay}s ease-in forwards`,
              transform: `rotate(${i * 47}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

export function ScoreRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const tone = pct >= 80 ? '#34d399' : pct >= 50 ? '#a855f7' : '#fb7185';
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#ede9fe" strokeWidth="12" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={tone} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c} style={{ animation: `ring 1s ease-out forwards`, ['--target' as string]: `${c * (1 - pct / 100)}` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-violet-800">{pct}</span>
        <span className="text-xs font-bold text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

export function Celebrate({
  title,
  pct,
  points,
  pending,
  speakText,
  onDone,
  doneLabel,
}: {
  title: string;
  pct: number | null;
  points?: number;
  pending?: boolean;
  speakText?: string;
  onDone: () => void;
  doneLabel: string;
}) {
  const good = (pct ?? 0) >= 50;
  useEffect(() => {
    if (pending) return;
    sfx.complete();
    if (speakText) setTimeout(() => speak(speakText), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative overflow-hidden">
      {good && !pending && <Confetti />}
      <div className="card animate-pop relative flex flex-col items-center gap-4 py-10 text-center">
        <Mascot size={96} mood={pending ? 'think' : good ? 'cheer' : 'happy'} className="animate-bounce-in" />
        <h2 className="text-xl font-black text-violet-800">{title}</h2>
        {pending ? (
          <p className="font-bold text-slate-500">Đã nộp — chờ giáo viên chấm</p>
        ) : (
          <>
            {pct != null && <ScoreRing pct={pct} />}
            {points != null && points > 0 && (
              <div className="chip animate-rise bg-amber-100 text-amber-700">+{points} ⭐</div>
            )}
          </>
        )}
        <button onClick={onDone} className="btn-primary mt-1 px-8">{doneLabel}</button>
      </div>
    </div>
  );
}
