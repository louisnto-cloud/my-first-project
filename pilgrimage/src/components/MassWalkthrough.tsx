'use client';

// ─── Walk through the Mass: a crown jewel ────────────────────────────────────
// Each moment of the liturgy explained as it happens, with what to say and
// when to stand, sit, or kneel.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MASS, MASS_PARTS, type Posture } from '@/content/mass';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { updateSave } from '@/lib/storage';
import { SacredArt } from '@/components/SacredArt';
import { SpeakerButton } from '@/components/SpeakerButton';

function PostureBadge({ posture }: { posture: Posture }) {
  const { t } = useI18n();
  const label = { stand: UI.postureStand, sit: UI.postureSit, kneel: UI.postureKneel }[posture];
  return (
    <span className="flex items-center gap-2 rounded-full border border-gold/50 bg-lapis/80 px-3.5 py-1.5 font-ui text-xs font-bold uppercase tracking-widest text-gold">
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        {posture === 'stand' && (
          <>
            <circle cx="12" cy="4.5" r="2.5" />
            <path d="M10.5 8h3v9l1.5 5h-2l-1.5-5L10 22H8l1.5-5z" />
          </>
        )}
        {posture === 'sit' && (
          <>
            <circle cx="10" cy="5" r="2.5" />
            <path d="M8.5 8.5h3V14h5v2h-5v4h-2zM6 14h2v6H6z" />
          </>
        )}
        {posture === 'kneel' && (
          <>
            <circle cx="11" cy="5" r="2.5" />
            <path d="M9.5 8.5h3v7h3v2h-3l-1 4h-2l1-4.5zM8 21h6v1.5H8z" />
          </>
        )}
      </svg>
      {t(label)}
    </span>
  );
}

export function MassWalkthrough() {
  const { t, lang, save } = useI18n();
  const [step, setStep] = useState(0);
  const total = MASS.length;
  const done = step >= total;
  const moment = MASS[Math.min(step, total - 1)];

  // A completed walkthrough lights its pane in the Rose Window.
  useEffect(() => {
    if (done) {
      updateSave((d) => ({
        seen: { ...d.seen, 'mass-walkthrough': (d.seen['mass-walkthrough'] ?? 0) + 1 },
      }));
    }
  }, [done]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* header: back, part name, progress */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Link href="/chapel" aria-label={t(UI.close)} className="flex h-11 w-11 items-center justify-center rounded-full text-incense">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z" /></svg>
        </Link>
        <div className="flex-1">
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-gold">
            {done ? t(UI.massTitle) : t(MASS_PARTS[moment.part])}
          </p>
          <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-ivory/10">
            <div className="h-full bg-gold transition-all duration-300" style={{ width: `${(Math.min(step, total) / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {!done ? (
        <div className="page-in flex min-h-0 flex-1 flex-col" key={moment.id}>
          <div className="relative mx-5 mt-4 aspect-[4/3] overflow-hidden rounded-3xl">
            <SacredArt kind={moment.art} rounded={false} />
            <div className="absolute left-3 top-3">
              <PostureBadge posture={moment.posture} />
            </div>
          </div>

          <div className="flex flex-col gap-3 px-6 py-4">
            <div className="flex items-start gap-3">
              <h2 className="flex-1 font-display text-2xl text-ivory">{t(moment.title)}</h2>
              <SpeakerButton
                id={`mass-${moment.id}-${lang}`}
                autoStart={save.narrate}
                text={[
                  t(moment.what),
                  ...(moment.say?.flatMap((d) => [t(d.priest), t(d.people)]) ?? []),
                  t(moment.why),
                ].join(' ')}
              />
            </div>
            <p className="font-story text-xl leading-relaxed text-ivory">{t(moment.what)}</p>

            {moment.say?.map((d, i) => (
              <div key={i} className="rounded-2xl border border-ivory/10 bg-[#141b33] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-incense">{t(UI.massPriestSays)}</p>
                <p className="mt-0.5 font-story text-lg italic text-ivory/85">{t(d.priest)}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gold">{t(UI.massYouSay)}</p>
                <p className="mt-0.5 font-story text-xl text-gold">{t(d.people)}</p>
              </div>
            ))}

            <p className="font-story text-lg italic leading-relaxed text-incense">{t(moment.why)}</p>
          </div>

          <div className="sticky bottom-0 mt-auto flex gap-3 bg-gradient-to-t from-lapis via-lapis/95 to-transparent px-5 pb-8 pt-4">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ivory/20 text-ivory"
                aria-label="Back"
              >
                ‹
              </button>
            )}
            <button
              onClick={() => setStep(step + 1)}
              className="min-h-[56px] flex-1 rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
            >
              {t(UI.continueWord)}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="h-40 w-52">
            <SacredArt kind="cathedral-door" />
          </div>
          <p className="font-story text-2xl leading-relaxed text-ivory">{t(UI.massDone)}</p>
          <p className="text-xs text-incense">{t(UI.massPostureNote)}</p>
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
