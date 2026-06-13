'use client';

// ─── LessonPlayer ────────────────────────────────────────────────────────────
// Door → story cards with questions woven in → treasure → candle.
// Every step is persisted: closing the app mid-sentence loses nothing.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Lesson, Question, StoryCard as StoryCardT, World } from '@/content/types';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { getSave, lightCandle, todayISO, updateSave } from '@/lib/storage';
import { SacredArt } from '@/components/SacredArt';
import { InteractiveArt } from '@/components/InteractiveArt';
import { StoryCardView } from '@/components/StoryCard';
import { QuizEngine } from '@/components/QuizEngine';
import { CandleRitual } from '@/components/CandleRitual';
import { prayerById } from '@/content/prayers';
import { glossaryById } from '@/content/glossary';
import { artworkById } from '@/content/artworks';
import { nextStep } from '@/lib/progress';

type FlowItem = { type: 'card'; card: StoryCardT } | { type: 'question'; question: Question };

function buildFlow(lesson: Lesson): FlowItem[] {
  const flow: FlowItem[] = [];
  const last = lesson.cards.length - 1;
  lesson.cards.forEach((card, i) => {
    flow.push({ type: 'card', card });
    lesson.questions
      .filter((q) => (q.afterCard ?? last) === i)
      .forEach((question) => flow.push({ type: 'question', question }));
  });
  return flow;
}

function TreasureView({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const { t, lang } = useI18n();
  const tr = lesson.treasure;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-6 py-10">
      <p className="text-center font-display text-sm uppercase tracking-[0.25em] text-gold">
        {t(UI.treasureLabel)}
      </p>

      <div className="rounded-3xl border border-gold/40 bg-gradient-to-b from-gold/10 to-transparent p-5">
        {tr.kind === 'prayer' && (() => {
          const prayer = prayerById(tr.prayerId);
          if (!prayer) return null;
          const lines = lang === 'vi' ? prayer.vi : prayer.en;
          return (
            <>
              <h2 className="font-display text-2xl text-gold">{t(prayer.name)}</h2>
              <div className="mt-4 flex flex-col gap-1">
                {lines.map((line, i) => (
                  <p key={i} className="font-story text-xl leading-relaxed text-ivory">{line}</p>
                ))}
              </div>
              <p className="mt-4 font-story text-lg italic leading-relaxed text-ivory/80">{t(tr.note)}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-incense">{t(UI.prayerKept)}</p>
            </>
          );
        })()}

        {tr.kind === 'word' && (() => {
          const entry = glossaryById(tr.termId);
          if (!entry) return null;
          return (
            <>
              <h2 className="font-display text-2xl text-gold">{lang === 'vi' ? entry.vi : entry.term}</h2>
              <p className="mt-1 text-sm text-incense">{lang === 'vi' ? entry.term : entry.vi}</p>
              <p className="mt-3 font-story text-xl leading-relaxed text-ivory">{t(entry.plain)}</p>
              <p className="mt-4 font-story text-lg italic leading-relaxed text-ivory/80">{t(tr.note)}</p>
            </>
          );
        })()}

        {tr.kind === 'practice' && (
          <>
            <h2 className="font-display text-2xl text-gold">{t(tr.title)}</h2>
            <p className="mt-3 font-story text-xl leading-relaxed text-ivory">{t(tr.note)}</p>
          </>
        )}

        {tr.kind === 'art' && (
          <>
            <div className="aspect-[4/3] overflow-hidden rounded-2xl">
              <SacredArt kind={tr.art} rounded={false} />
            </div>
            <h2 className="mt-4 font-display text-2xl text-gold">{t(tr.title)}</h2>
            <p className="mt-2 font-story text-xl leading-relaxed text-ivory">{t(tr.note)}</p>
            <p className="mt-3 text-[11px] text-incense">{artworkById(tr.art)?.credit}</p>
          </>
        )}
      </div>

      {lesson.deeper && (
        <p className="text-center text-xs text-incense">
          {t(UI.goDeeper)}: {t(UI.cccRef)} {lesson.deeper.ccc.join(', ')} — {t(lesson.deeper.note)}
        </p>
      )}

      <div className="mt-auto">
        <button
          onClick={onDone}
          className="min-h-[56px] w-full rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
        >
          {t(UI.continueWord)}
        </button>
      </div>
    </div>
  );
}

export function LessonPlayer({ world, lesson }: { world: World; lesson: Lesson }) {
  const { t } = useI18n();
  const router = useRouter();
  const flow = useMemo(() => buildFlow(lesson), [lesson]);

  // steps: 0 = door · 1..flow.length = flow · flow.length+1 = treasure · +2 = candle
  const treasureStep = flow.length + 1;
  const candleStep = flow.length + 2;

  const [step, setStep] = useState(() => {
    const save = getSave();
    if (save.position?.lessonId === lesson.id) {
      return Math.min(save.position.step, candleStep);
    }
    return 0;
  });

  useEffect(() => {
    updateSave({ position: { lessonId: lesson.id, step } });
    window.scrollTo(0, 0);
  }, [lesson.id, step]);

  const [finished, setFinished] = useState(false);

  const complete = (reflection: string) => {
    const date = todayISO();
    updateSave((d) => ({
      completed: { ...d.completed, [lesson.id]: date },
      position: null,
      stamps: lesson.vigil ? { ...d.stamps, [world.id]: date } : d.stamps,
      journal: reflection
        ? [...d.journal, { date: new Date().toISOString(), lessonId: lesson.id, text: reflection }]
        : d.journal,
      seen: {
        ...d.seen,
        ...(lesson.treasure.kind === 'prayer'
          ? { [lesson.treasure.prayerId]: (d.seen[lesson.treasure.prayerId] ?? 0) + 1 }
          : {}),
      },
    }));
    lightCandle();
    setFinished(true);
  };

  const upNext = finished ? nextStep(getSave()) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Quiet header: progress hairline + leave door */}
      <div className="flex items-center gap-3 px-4 pt-safe-bar">
        <Link href="/" aria-label={t(UI.backToToday)} className="flex h-11 w-11 items-center justify-center rounded-full text-incense">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z" /></svg>
        </Link>
        <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-ivory/10">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${Math.round((step / candleStep) * 100)}%` }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {step === 0 && (
          <button onClick={() => setStep(1)} className="block h-full w-full text-left">
            <div className="relative flex h-[calc(100dvh-60px)] flex-col">
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <InteractiveArt kind={lesson.door.art} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-lapis via-lapis/70 to-transparent" />
              </div>
              <div className="relative z-10 -mt-28 px-6 pb-12">
                <p className="font-display text-xs uppercase tracking-[0.3em] text-gold">{t(world.church)}</p>
                <h1 className="mt-2 font-display text-3xl leading-tight text-ivory">{t(lesson.title)}</h1>
                <p className="mt-3 font-story text-xl italic leading-relaxed text-ivory/85">{t(lesson.door.line)}</p>
                <p className="soft-glow mt-8 text-center font-ui text-sm font-bold uppercase tracking-widest text-gold">
                  {t(UI.tapToEnter)}
                </p>
              </div>
            </div>
          </button>
        )}

        {step >= 1 && step <= flow.length && (() => {
          const item = flow[step - 1];
          if (item.type === 'card') {
            return (
              // Key by card id so each card gets a fresh component instance —
              // otherwise branch choices and the "original wording" toggle
              // would leak from one card to the next.
              <div className="h-[calc(100dvh-60px)]" key={item.card.id}>
                <StoryCardView card={item.card} onDone={() => setStep(step + 1)} />
              </div>
            );
          }
          return (
            <div className="page-in px-6 py-8" key={item.question.id}>
              <QuizEngine question={item.question} onDone={() => setStep(step + 1)} />
            </div>
          );
        })()}

        {step === treasureStep && (
          <div className="h-[calc(100dvh-60px)]">
            <TreasureView lesson={lesson} onDone={() => setStep(candleStep)} />
          </div>
        )}

        {step === candleStep && (
          <div className="h-[calc(100dvh-60px)]">
            <CandleRitual reflectionPrompt={lesson.reflection} onLit={complete}>
              {lesson.vigil ? (
                <button
                  onClick={() => router.push(`/road?stamp=${world.id}`)}
                  className="min-h-[56px] w-full rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
                >
                  {t(UI.seeTheRoad)}
                </button>
              ) : (
                <>
                  {upNext && (
                    <button
                      onClick={() => router.push(`/lesson/${upNext.lesson.id}`)}
                      className="min-h-[56px] w-full rounded-2xl border border-gold/50 font-ui text-base font-bold text-gold"
                    >
                      {t(UI.walkFurther)}
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/')}
                    className="min-h-[56px] w-full rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
                  >
                    {t(UI.backToToday)}
                  </button>
                </>
              )}
            </CandleRitual>
          </div>
        )}
      </div>
    </div>
  );
}
