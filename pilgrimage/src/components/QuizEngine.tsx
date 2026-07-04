'use client';

// ─── QuizEngine: every question format, and nothing punishes ─────────────────
// Wrong answers gently reveal the right one with a one-line why, then move on.
// No hearts, no lives, no locked retries, no red error states. Only warmth.

import { useEffect, useMemo, useState } from 'react';
import type { ArtKind, L, MatchQuestion, OrderQuestion, Question, TapArtQuestion } from '@/content/types';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { SacredArt } from '@/components/SacredArt';
import { currentlySpeaking, narrate, narrationSupported, spokenParagraphs, stopNarration } from '@/lib/speech';
import { haptic } from '@/lib/sound';

/** Deterministic shuffle (seeded by string) so server and client agree. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = (h ^ ch.charCodeAt(0)) * 16777619;
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function ContinueButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="min-h-[56px] w-full rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
    >
      {label}
    </button>
  );
}

function Why({ right, why }: { right: boolean; why: L }) {
  const { t, lang, save } = useI18n();

  // The guide stays present through the questions: a right answer earns a
  // soft pulse, and the why is read aloud like everything else.
  useEffect(() => {
    if (right) haptic(14);
    if (save.narrate && narrationSupported()) {
      narrate('quiz-why', spokenParagraphs(t(right ? UI.gentleRight : UI.gentleWrong), t(why)), lang);
    }
    return () => {
      if (currentlySpeaking() === 'quiz-why') stopNarration();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl p-4 ${right ? 'gold-glow bg-gold/15' : 'bg-ivory/10'}`}
    >
      <p className="font-ui text-sm font-bold text-gold">{t(right ? UI.gentleRight : UI.gentleWrong)}</p>
      <p className="mt-1 font-story text-lg leading-relaxed text-ivory">{t(why)}</p>
    </div>
  );
}

// ─── Choice / Predict / Fill ─────────────────────────────────────────────────

function ChoiceLike({
  prompt,
  options,
  answer,
  why,
  before,
  after,
  onDone,
}: {
  prompt: L;
  options: { text: L; art?: ArtKind }[];
  answer: number;
  why: L;
  before?: L;
  after?: L;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-story text-2xl leading-snug text-ivory">{t(prompt)}</p>
      {before && (
        <p className="rounded-2xl border border-gold/25 bg-lapis/70 p-4 font-story text-xl italic text-gold">
          {t(before)} <span className="text-incense">______</span> {after ? t(after) : ''}
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        {options.map((o, i) => {
          const isAnswer = i === answer;
          const isPicked = picked === i;
          const revealed = picked !== null;
          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => setPicked(i)}
              className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 py-3 text-left font-ui text-base font-semibold transition-colors ${
                revealed && isAnswer
                  ? 'gold-glow border-gold bg-gold/20 text-ivory'
                  : revealed && isPicked
                    ? 'border-ivory/30 bg-ivory/5 text-incense'
                    : 'border-ivory/20 text-ivory'
              }`}
            >
              {o.art && (
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                  <SacredArt kind={o.art} rounded={false} />
                </span>
              )}
              {t(o.text)}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <Why right={picked === answer} why={why} />
          <ContinueButton onClick={onDone} label={t(UI.continueWord)} />
        </>
      )}
    </div>
  );
}

// ─── Order the story ─────────────────────────────────────────────────────────

function OrderView({ q, onDone }: { q: OrderQuestion; onDone: () => void }) {
  const { t } = useI18n();
  const shuffled = useMemo(() => seededShuffle(q.items.map((_, i) => i), q.id), [q]);
  const [placed, setPlaced] = useState<number[]>([]);
  const done = placed.length === q.items.length;
  const correct = done && placed.every((v, i) => v === i);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-story text-2xl leading-snug text-ivory">{t(q.prompt)}</p>
      <p className="text-sm text-incense">{t(UI.orderHint)}</p>

      <ol className="flex min-h-[56px] flex-col gap-2">
        {placed.map((idx, pos) => (
          <li
            key={idx}
            className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-4 py-2 font-ui text-sm font-semibold ${
              done && idx === pos ? 'border-gold/60 bg-gold/15 text-ivory' : done ? 'border-ivory/20 text-incense' : 'border-gold/40 text-ivory'
            }`}
          >
            <span className="font-display text-gold">{pos + 1}</span> {t(q.items[idx])}
          </li>
        ))}
      </ol>

      {!done && (
        <div className="flex flex-col gap-2">
          {shuffled
            .filter((i) => !placed.includes(i))
            .map((i) => (
              <button
                key={i}
                onClick={() => setPlaced((p) => [...p, i])}
                className="min-h-[48px] rounded-xl border border-ivory/25 px-4 py-2 text-left font-ui text-sm font-semibold text-ivory"
              >
                {t(q.items[i])}
              </button>
            ))}
        </div>
      )}

      {done && !correct && (
        <div className="rounded-2xl bg-ivory/10 p-4">
          <p className="font-ui text-sm font-bold text-gold">{t(UI.gentleWrong)}</p>
          <ol className="mt-2 flex flex-col gap-1">
            {q.items.map((item, i) => (
              <li key={i} className="font-story text-lg text-ivory">
                <span className="font-display text-gold">{i + 1}.</span> {t(item)}
              </li>
            ))}
          </ol>
        </div>
      )}
      {done && (
        <>
          <Why right={correct} why={q.why} />
          <ContinueButton onClick={onDone} label={t(UI.continueWord)} />
        </>
      )}
      {!done && placed.length > 0 && (
        <button onClick={() => setPlaced([])} className="text-sm font-semibold text-incense underline underline-offset-4">
          {t(UI.orderReset)}
        </button>
      )}
    </div>
  );
}

// ─── Match the symbol to its meaning ────────────────────────────────────────

function MatchView({ q, onDone }: { q: MatchQuestion; onDone: () => void }) {
  const { t } = useI18n();
  const meanings = useMemo(() => seededShuffle(q.pairs.map((_, i) => i), q.id + 'm'), [q]);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [missed, setMissed] = useState<number | null>(null);
  const allDone = matched.length === q.pairs.length;

  const tryMatch = (meaningIdx: number) => {
    if (selected === null) return;
    if (selected === meaningIdx) {
      setMatched((m) => [...m, meaningIdx]);
      haptic(10);
    } else {
      // A gentle "not quite": the row warms garnet for a moment, nothing more.
      setMissed(meaningIdx);
      setTimeout(() => setMissed(null), 550);
    }
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-story text-2xl leading-snug text-ivory">{t(q.prompt)}</p>
      <p className="text-sm text-incense">{t(UI.matchHint)}</p>

      <div className="grid grid-cols-4 gap-2">
        {q.pairs.map((p, i) => (
          <button
            key={i}
            disabled={matched.includes(i)}
            onClick={() => setSelected(i)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-colors ${
              matched.includes(i)
                ? 'border-gold/60 opacity-45'
                : selected === i
                  ? 'gold-glow border-gold'
                  : 'border-ivory/20'
            }`}
          >
            <span className="block h-14 w-full overflow-hidden rounded-lg">
              <SacredArt kind={p.symbol} rounded={false} />
            </span>
            <span className="font-ui text-[11px] font-bold text-ivory">{t(p.label)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {meanings.map((i) => (
          <button
            key={i}
            disabled={matched.includes(i)}
            onClick={() => tryMatch(i)}
            className={`min-h-[48px] rounded-xl border px-4 py-2 text-left font-ui text-sm font-semibold transition-colors ${
              matched.includes(i)
                ? 'border-gold/60 bg-gold/15 text-ivory'
                : missed === i
                  ? 'border-garnet bg-garnet/20 text-ivory'
                  : 'border-ivory/25 text-ivory'
            }`}
          >
            {t(q.pairs[i].meaning)}
          </button>
        ))}
      </div>

      {allDone && <ContinueButton onClick={onDone} label={t(UI.continueWord)} />}
    </div>
  );
}

// ─── Tap the artwork ─────────────────────────────────────────────────────────

function TapArtView({ q, onDone }: { q: TapArtQuestion; onDone: () => void }) {
  const { t } = useI18n();
  const [seen, setSeen] = useState<number[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const allSeen = seen.length === q.hotspots.length;

  return (
    <div className="flex flex-col gap-4">
      <p className="font-story text-2xl leading-snug text-ivory">{t(q.prompt)}</p>
      <p className="text-sm text-incense">{t(UI.tapArtHint)}</p>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        <SacredArt kind={q.art} rounded={false} />
        {q.hotspots.map((h, i) => (
          <button
            key={i}
            onClick={() => {
              setOpen(i);
              setSeen((s) => (s.includes(i) ? s : [...s, i]));
            }}
            aria-label={t(h.label)}
            className={`absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
              seen.includes(i) ? 'border-gold/40' : 'soft-glow border-gold'
            }`}
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            <span className="m-auto block h-2.5 w-2.5 rounded-full bg-gold" />
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="gold-glow rounded-2xl bg-gold/15 p-4">
          <p className="font-ui text-sm font-bold text-gold">{t(q.hotspots[open].label)}</p>
          <p className="mt-1 font-story text-lg leading-relaxed text-ivory">{t(q.hotspots[open].meaning)}</p>
        </div>
      )}
      {allSeen && <ContinueButton onClick={onDone} label={t(UI.continueWord)} />}
    </div>
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function QuizEngine({ question, onDone }: { question: Question; onDone: () => void }) {
  switch (question.kind) {
    case 'choice':
    case 'predict':
      return (
        <ChoiceLike
          prompt={question.prompt}
          options={question.options}
          answer={question.answer}
          why={question.why}
          onDone={onDone}
        />
      );
    case 'fill':
      return (
        <ChoiceLike
          prompt={question.prompt}
          options={question.options.map((o) => ({ text: o }))}
          answer={question.answer}
          why={question.why}
          before={question.before}
          after={question.after}
          onDone={onDone}
        />
      );
    case 'order':
      return <OrderView q={question} onDone={onDone} />;
    case 'match':
      return <MatchView q={question} onDone={onDone} />;
    case 'tapArt':
      return <TapArtView q={question} onDone={onDone} />;
  }
}
