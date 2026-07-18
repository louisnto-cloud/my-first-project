'use client';

// ─── The Divine Mercy Chaplet: prayed bead by bead ───────────────────────────
// Same bead-walk as the rosary trainer — tap to advance, no pace, no
// pressure — with the chaplet's own prayers on the large and small beads.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { buildMercyChaplet, MERCY_INTRO, MERCY_NAME } from '@/content/mercy';
import { prayerById } from '@/content/prayers';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { updateSave } from '@/lib/storage';
import { SacredArt } from '@/components/SacredArt';
import { SpeakerButton } from '@/components/SpeakerButton';

function BeadStrip({ position, total }: { position: number; total: number }) {
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

export function MercyTrainer() {
  const { t, lang, save } = useI18n();
  const steps = useMemo(() => buildMercyChaplet(), []);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);

  const done = i >= steps.length;
  const step = steps[Math.min(i, steps.length - 1)];
  const prayer = prayerById(step.prayerId);

  // A completed chaplet rests in her chapel.
  useEffect(() => {
    if (done) {
      updateSave((d) => ({
        seen: { ...d.seen, mercy: (d.seen.mercy ?? 0) + 1 },
      }));
    }
  }, [done]);

  // ── Screen 1: what this is ──
  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col px-5 pt-safe-bar">
        <div className="flex items-center gap-3">
          <Link href="/chapel" aria-label={t(UI.close)} className="flex h-11 w-11 items-center justify-center rounded-full text-incense">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z" /></svg>
          </Link>
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-gold">{t(MERCY_NAME)}</p>
        </div>

        <div className="mx-0 mt-5 aspect-[16/10] overflow-hidden rounded-3xl">
          <SacredArt kind="cross-dawn" rounded={false} />
        </div>
        <h1 className="mt-5 font-display text-2xl text-ivory">{t(MERCY_NAME)}</h1>
        <p className="mt-2 font-story text-xl italic leading-relaxed text-ivory/85">{t(MERCY_INTRO)}</p>
        <button
          onClick={() => setStarted(true)}
          className="mt-6 min-h-[56px] w-full rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
        >
          {t(UI.begin)}
        </button>
      </div>
    );
  }

  // ── Screen 2: the beads ──
  const spoken = prayer ? (lang === 'vi' ? prayer.vi : prayer.en).join(' ') : '';

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center gap-3 px-4 pt-safe-bar">
        <button
          onClick={() => { setStarted(false); setI(0); }}
          aria-label={t(UI.close)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-incense"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z" /></svg>
        </button>
        <div className="flex-1">
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-gold">
            {t(MERCY_NAME)}
            {step.decade ? ` · ${step.decade}/5` : ''}
          </p>
          <div
            className="mt-1 h-0.5 overflow-hidden rounded-full bg-ivory/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={Math.min(i, steps.length)}
          >
            <div className="h-full bg-gold transition-all duration-300" style={{ width: `${(Math.min(i, steps.length) / steps.length) * 100}%` }} />
          </div>
        </div>
        {!done && spoken && (
          <SpeakerButton id={`mercy-${i}-${lang}`} text={spoken} autoStart={save.narrate} tone="prayer" />
        )}
      </div>

      {!done ? (
        <button onClick={() => setI(i + 1)} className="flex min-h-0 flex-1 flex-col text-left" aria-label={t(UI.continueWord)}>
          <div className="relative mx-5 mt-4 aspect-[16/10] overflow-hidden rounded-3xl">
            <SacredArt kind="cross-dawn" rounded={false} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-lapis to-transparent" />
          </div>

          <div className="px-6 py-4">
            {step.count && (
              <div className="mb-3">
                <BeadStrip position={step.count.i - 1} total={step.count.n} />
              </div>
            )}

            {prayer && (
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
            )}

            <p className="mt-6 text-center text-xs text-incense">{t(UI.tapToContinue)}</p>
          </div>
        </button>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="h-40 w-52">
            <SacredArt kind="cross-dawn" />
          </div>
          <p className="font-story text-2xl leading-relaxed text-ivory">{t(UI.mercyDone)}</p>
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
