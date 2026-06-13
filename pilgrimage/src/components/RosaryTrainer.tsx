'use client';

// ─── The Rosary Trainer: a crown jewel ───────────────────────────────────────
// The beautiful rosary she owns, bead by bead. All four sets of mysteries on
// their traditional days; tap to advance; no pace, no pressure.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { buildRosary, MYSTERY_SETS, todaysSet, type MysterySet } from '@/content/rosary';
import { prayerById } from '@/content/prayers';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { updateSave } from '@/lib/storage';
import { SacredArt } from '@/components/SacredArt';
import { SpeakerButton } from '@/components/SpeakerButton';

function BeadStrip({ position, total }: { position: number; total: number }) {
  // Ten beads of the current decade (or the 3 opening beads), as a string.
  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < position
              ? 'h-3 w-3 bg-gold/40'
              : i === position
                ? 'gold-glow h-5 w-5 bg-gold'
                : 'h-3 w-3 border border-ivory/30'
          }`}
        />
      ))}
    </div>
  );
}

export function RosaryTrainer() {
  const { t, lang } = useI18n();
  const [set, setSet] = useState<MysterySet | null>(null);
  const steps = useMemo(() => (set ? buildRosary(set) : []), [set]);
  const [i, setI] = useState(0);

  // A completed rosary lights its pane in the Rose Window.
  const finished = set !== null && i >= steps.length;
  useEffect(() => {
    if (finished) {
      updateSave((d) => ({
        seen: {
          ...d.seen,
          rosary: (d.seen.rosary ?? 0) + 1,
          // The rosary's own prayers now rest in her chapel too.
          'apostles-creed': (d.seen['apostles-creed'] ?? 0) + 1,
          'hail-holy-queen': (d.seen['hail-holy-queen'] ?? 0) + 1,
        },
      }));
    }
  }, [finished]);

  // ── Screen 1: which mysteries today? ──
  if (!set) {
    const today = todaysSet();
    return (
      <div className="flex min-h-dvh flex-col px-5 pt-4">
        <div className="flex items-center gap-3">
          <Link href="/chapel" aria-label={t(UI.close)} className="flex h-11 w-11 items-center justify-center rounded-full text-incense">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z" /></svg>
          </Link>
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-gold">{t(UI.rosaryTitle)}</p>
        </div>

        <h1 className="mt-6 font-display text-2xl text-ivory">{t(UI.rosaryChooseSet)}</h1>
        <div className="mt-4 flex flex-col gap-2.5 pb-8">
          {MYSTERY_SETS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSet(s)}
              className={`flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                s.id === today.id ? 'border-gold bg-gold/10' : 'border-ivory/15'
              }`}
            >
              <span className="h-14 w-16 shrink-0 overflow-hidden rounded-xl">
                <SacredArt kind={s.mysteries[0].art} rounded={false} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base text-ivory">{t(s.name)}</span>
                {s.id === today.id && (
                  <span className="block text-xs font-bold uppercase tracking-widest text-gold">
                    {t(UI.rosaryTodaySet)}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Screen 2: the beads ──
  const done = i >= steps.length;
  const step = steps[Math.min(i, steps.length - 1)];
  const mystery = step.mystery ? set.mysteries[step.mystery - 1] : null;
  const prayer = step.announce ? null : prayerById(step.prayerId);
  const art = mystery ? mystery.art : 'candle-single';

  // What the speaker reads for the current bead: the mystery's meditation, or
  // the prayer's lines. Manual only — the pane itself advances on tap.
  const spoken =
    step.announce && mystery
      ? `${t(mystery.title)}. ${t(mystery.meditation)}`
      : prayer
        ? (lang === 'vi' ? prayer.vi : prayer.en).join(' ')
        : '';

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => { setSet(null); setI(0); }}
          aria-label={t(UI.close)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-incense"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z" /></svg>
        </button>
        <div className="flex-1">
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-gold">
            {t(set.name)}
            {mystery ? ` · ${step.mystery}/5` : ''}
          </p>
          <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-ivory/10">
            <div className="h-full bg-gold transition-all duration-300" style={{ width: `${(Math.min(i, steps.length) / steps.length) * 100}%` }} />
          </div>
        </div>
        {!done && spoken && <SpeakerButton id={`rosary-${i}-${lang}`} text={spoken} />}
      </div>

      {!done ? (
        <button onClick={() => setI(i + 1)} className="flex min-h-0 flex-1 flex-col text-left" aria-label={t(UI.continueWord)}>
          <div className="relative mx-5 mt-4 aspect-[16/10] overflow-hidden rounded-3xl">
            <SacredArt kind={art} rounded={false} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-lapis to-transparent" />
            {mystery && (
              <p className="absolute bottom-3 left-4 right-4 font-display text-base text-ivory">
                {step.mystery}. {t(mystery.title)}
              </p>
            )}
          </div>

          <div className="px-6 py-4">
            {step.count && (
              <div className="mb-3">
                <BeadStrip position={step.count.i - 1} total={step.count.n} />
              </div>
            )}

            {step.announce && mystery ? (
              <>
                <p className="font-display text-xs uppercase tracking-[0.25em] text-gold">{t(UI.rosaryAnnounce)}</p>
                <h2 className="mt-2 font-display text-2xl text-ivory">{t(mystery.title)}</h2>
                <p className="mt-2 font-story text-xl italic leading-relaxed text-ivory/85">{t(mystery.meditation)}</p>
              </>
            ) : prayer ? (
              <>
                <h2 className="font-display text-xl text-gold">
                  {t(prayer.name)}
                  {step.count ? `  ·  ${step.count.i}/${step.count.n}` : ''}
                </h2>
                <div className="mt-2 flex flex-col gap-0.5">
                  {(lang === 'vi' ? prayer.vi : prayer.en).map((line, k) => (
                    <p key={k} className="font-story text-xl leading-relaxed text-ivory">{line}</p>
                  ))}
                </div>
              </>
            ) : null}

            <p className="soft-glow mt-6 text-center font-ui text-xs font-bold uppercase tracking-widest text-gold">
              {t(UI.rosaryTapNext)}
            </p>
          </div>
        </button>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="h-40 w-52">
            <SacredArt kind={set.mysteries[0].art} />
          </div>
          <p className="font-story text-2xl leading-relaxed text-ivory">{t(UI.rosaryDone)}</p>
          <Link
            href="/chapel"
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
          >
            {t(UI.close)}
          </Link>
        </div>
      )}
    </div>
  );
}
