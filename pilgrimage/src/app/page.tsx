'use client';

// ─── TODAY: the One Thing ─────────────────────────────────────────────────────
// Opens straight onto today's step: one beautiful card, one button. Everything
// secondary (the reliquary, the install nudge) waits quietly below the fold so
// the first screen stays calm and uncluttered.

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { candleStreak, nextStep } from '@/lib/progress';
import { todayISO } from '@/lib/storage';
import { InteractiveArt } from '@/components/InteractiveArt';
import { LanguageToggle } from '@/components/LanguageToggle';
import { DailyReliquary } from '@/components/DailyReliquary';
import { InstallPrompt } from '@/components/InstallPrompt';
import { currentSeason } from '@/lib/liturgical';

export default function TodayPage() {
  const { t, save } = useI18n();
  const step = nextStep(save);
  const walkedToday = save.candles.includes(todayISO());
  const season = currentSeason();
  const seasonDot = { garnet: 'bg-garnet', gold: 'bg-gold', incense: 'bg-incense' }[season.tone];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? UI.greetMorning : hour < 18 ? UI.greetAfternoon : UI.greetEvening;
  const streak = candleStreak(save.candles);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col px-6">
      {/* a quiet eyebrow: the liturgical season, and the language toggle */}
      <div className="flex items-center justify-between pt-6">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-incense">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${seasonDot}`} />
          {t(season.name)}
        </span>
        <LanguageToggle />
      </div>

      {/* the greeting, given room to breathe */}
      <header className="pt-8">
        <p className="font-story text-2xl italic text-incense">
          {t(greeting)}{save.name ? ',' : ''}
        </p>
        <h1 className="mt-1 font-display text-4xl leading-tight text-ivory">
          {save.name || t(UI.passportName)}
        </h1>
        {streak > 1 && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-gold">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M12 3c2.4 2.6 4.5 5 4.5 8a4.5 4.5 0 0 1-9 0c0-1.2.4-2.3 1-3.4.5 1 1.2 1.7 2 2.1-.3-2.3.3-4.6 1.5-6.7Z" />
            </svg>
            {streak} {t(UI.streakLine)}
          </p>
        )}
      </header>

      {/* the one thing: today's step */}
      <div className="flex flex-1 flex-col justify-center py-8">
        {step ? (
          <Link
            href={`/lesson/${step.lesson.id}`}
            className="group block overflow-hidden rounded-[28px] bg-[#141b33] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]"
          >
            <div className="relative aspect-[5/4]">
              <InteractiveArt kind={step.lesson.door.art} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#141b33] via-[#141b33]/60 to-transparent" />
              <span className="absolute right-4 top-4 rounded-full bg-lapis/60 px-3 py-1 text-[11px] font-semibold text-ivory/90 backdrop-blur-md">
                {step.lesson.minutes} {t(UI.minutesShort)}
              </span>
            </div>
            <div className="relative z-10 -mt-14 px-6 pb-6">
              <p className="font-display text-[11px] uppercase tracking-[0.3em] text-gold">
                {t(step.world.church)}
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight text-ivory">
                {t(step.lesson.title)}
              </h2>
              <p className="mt-2 font-story text-xl italic leading-snug text-ivory/70">
                {t(step.lesson.door.line)}
              </p>
              {step.resuming && <p className="mt-3 text-sm text-incense">{t(UI.resumeLine)}</p>}
              {walkedToday && !step.resuming && (
                <p className="mt-3 text-sm text-gold/80">{t(UI.doneToday)}</p>
              )}
            </div>
          </Link>
        ) : (
          <div className="py-12 text-center">
            <p className="font-story text-2xl leading-relaxed text-ivory/80">{t(UI.roadComplete)}</p>
          </div>
        )}
      </div>

      {/* the single action, in thumb territory */}
      {step && (
        <div className="sticky bottom-6 pb-2">
          <Link
            href={`/lesson/${step.lesson.id}`}
            className="flex min-h-[60px] items-center justify-center rounded-2xl bg-gold font-ui text-lg font-bold text-lapis shadow-[0_10px_40px_-8px_rgba(217,164,65,0.5)] transition-transform active:scale-[0.98]"
          >
            {walkedToday ? t(UI.walkFurther) : step.resuming ? t(UI.continueWord) : t(UI.begin)}
          </Link>
        </div>
      )}

      {/* secondary, below the fold: the daily gift, then a quiet install nudge */}
      <div className="mt-10 flex flex-col gap-4 border-t border-ivory/5 pt-8">
        <DailyReliquary />
        <InstallPrompt />
      </div>
    </div>
  );
}
