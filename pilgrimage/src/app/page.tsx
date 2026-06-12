'use client';

// ─── TODAY: the One Thing rule ───────────────────────────────────────────────
// The app opens straight onto Today's Step: one beautiful card, one big
// button. No dashboard, no menu decision, no choice paralysis.

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { nextStep } from '@/lib/progress';
import { todayISO } from '@/lib/storage';
import { SacredArt } from '@/components/SacredArt';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function TodayPage() {
  const { t, save } = useI18n();
  const step = nextStep(save);
  const walkedToday = save.candles.includes(todayISO());

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col px-5 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-story text-xl italic text-incense">{t(UI.todayGreeting)},</p>
          <h1 className="font-display text-2xl text-ivory">{save.name || t(UI.passportName)}</h1>
        </div>
        <LanguageToggle />
      </header>

      <div className="flex flex-1 flex-col justify-center py-6">
        {step ? (
          <div className="overflow-hidden rounded-3xl border border-ivory/10 bg-lapis shadow-2xl">
            <div className="relative aspect-[4/3]">
              <SacredArt kind={step.lesson.door.art} rounded={false} />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-lapis to-transparent" />
              <p className="absolute left-4 top-4 rounded-full bg-lapis/70 px-3 py-1 font-ui text-[11px] font-bold uppercase tracking-widest text-gold backdrop-blur">
                {walkedToday ? t(UI.walkFurther) : t(UI.todaysStep)} · {step.lesson.minutes} {t(UI.minutesShort)}
              </p>
            </div>
            <div className="relative z-10 -mt-10 px-5 pb-5">
              <p className="font-display text-[11px] uppercase tracking-[0.3em] text-gold">{t(step.world.church)}</p>
              <h2 className="mt-1 font-display text-2xl leading-tight text-ivory">{t(step.lesson.title)}</h2>
              <p className="mt-2 font-story text-lg italic leading-snug text-ivory/80">{t(step.lesson.door.line)}</p>
              {step.resuming && <p className="mt-2 text-xs text-incense">{t(UI.resumeLine)}</p>}
              {walkedToday && <p className="mt-2 text-xs text-gold/80">{t(UI.doneToday)}</p>}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-gold/30 p-8 text-center">
            <p className="font-story text-2xl leading-relaxed text-ivory">{t(UI.roadComplete)}</p>
          </div>
        )}
      </div>

      {/* Thumb territory: the one action lives at the bottom */}
      {step && (
        <div className="sticky bottom-24 pb-2">
          <Link
            href={`/lesson/${step.lesson.id}`}
            className="flex min-h-[60px] items-center justify-center rounded-2xl bg-gold font-ui text-lg font-bold text-lapis shadow-[0_8px_30px_rgba(217,164,65,0.25)]"
          >
            {step.resuming ? t(UI.continueWord) : t(UI.begin)}
          </Link>
        </div>
      )}
    </div>
  );
}
