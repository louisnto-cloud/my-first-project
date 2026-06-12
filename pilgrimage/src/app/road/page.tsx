'use client';

// ─── THE ROAD: the pilgrimage map and the passport ──────────────────────────

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { WorldId } from '@/content/types';
import { BONUS_WORLDS, worldById } from '@/content/worlds';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { isWorldUnlocked } from '@/lib/progress';
import { PilgrimageMap } from '@/components/PilgrimageMap';
import { PilgrimPassport } from '@/components/PilgrimPassport';

function RoadContent() {
  const { t, save } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const stampParam = params.get('stamp') as WorldId | null;

  const [passportOpen, setPassportOpen] = useState(false);
  const [justStamped, setJustStamped] = useState<WorldId | null>(null);
  const [selected, setSelected] = useState<WorldId | null>(null);

  // Arriving from a Vigil: open the passport and press the stamp.
  useEffect(() => {
    if (stampParam && save.stamps[stampParam]) {
      setJustStamped(stampParam);
      setPassportOpen(true);
      router.replace('/road');
    }
  }, [stampParam, save.stamps, router]);

  const world = selected ? worldById(selected) : null;

  return (
    <div className="px-5 pt-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ivory">{t(UI.roadTitle)}</h1>
        <button
          onClick={() => setPassportOpen(true)}
          className="flex min-h-[44px] items-center gap-2 rounded-full border border-gold/50 px-4 font-ui text-sm font-bold text-gold"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M9 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {t(UI.openPassport)}
        </button>
      </header>

      <div className="mt-4">
        <PilgrimageMap onSelect={setSelected} />
      </div>

      {/* Bonus roads, off the main pilgrimage */}
      <section className="mt-5">
        <h2 className="font-display text-xs uppercase tracking-[0.3em] text-incense">{t(UI.bonusRoads)}</h2>
        <div className="mt-2 flex flex-col gap-2 pb-4">
          {BONUS_WORLDS.map((w) => {
            const unlocked = isWorldUnlocked(w, save);
            return (
              <button
                key={w.id}
                onClick={() => setSelected(w.id)}
                className={`flex min-h-[56px] items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                  unlocked ? 'border-gold/40' : 'border-ivory/10'
                }`}
              >
                <span>
                  <span className={`block font-display text-sm ${unlocked ? 'text-ivory' : 'text-incense'}`}>
                    {t(w.name)}
                  </span>
                  <span className="block text-xs text-incense">
                    {unlocked
                      ? t(w.theme)
                      : w.id === 'asia'
                        ? t(UI.bonusLocked)
                        : t(UI.bonusPreparing)}
                  </span>
                </span>
                <span className={unlocked ? 'text-gold' : 'text-incense/50'}>{unlocked ? '✦' : '·'}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* World sheet */}
      {world && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-lapis/60" onClick={() => setSelected(null)}>
          <div
            className="max-h-[70dvh] overflow-y-auto rounded-t-3xl border-t border-gold/30 bg-lapis px-5 pb-28 pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ivory/20" />
            <p className="font-display text-[11px] uppercase tracking-[0.3em] text-gold">{t(world.place)}</p>
            <h2 className="mt-1 font-display text-2xl text-ivory">{t(world.church)}</h2>
            <p className="mt-1 font-story text-lg italic text-incense">{t(world.theme)}</p>

            {!isWorldUnlocked(world, save) ? (
              <p className="mt-6 rounded-2xl border border-ivory/10 p-4 font-story text-lg italic text-incense">
                {t(UI.lockedWorld)}
              </p>
            ) : world.lessons.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-ivory/10 p-4 font-story text-lg italic text-incense">
                {t(UI.comingSoon)}
              </p>
            ) : (
              <ol className="mt-5 flex flex-col gap-2">
                {world.lessons.map((lesson, i) => {
                  const done = !!save.completed[lesson.id];
                  const isNext = !done && world.lessons.slice(0, i).every((l) => save.completed[l.id]);
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={isNext || done ? `/lesson/${lesson.id}` : '#'}
                        aria-disabled={!isNext && !done}
                        className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 py-3 ${
                          done
                            ? 'border-gold/30 text-incense'
                            : isNext
                              ? 'border-gold bg-gold/10 text-ivory'
                              : 'pointer-events-none border-ivory/10 text-incense/60'
                        }`}
                      >
                        <span className={`font-display text-sm ${done || isNext ? 'text-gold' : ''}`}>
                          {lesson.vigil ? '✦' : i + 1}
                        </span>
                        <span className="flex-1 font-ui text-sm font-semibold">
                          {t(lesson.title)}
                          {lesson.vigil && (
                            <span className="ml-2 text-[10px] uppercase tracking-widest text-gold/80">{t(UI.vigilWord)}</span>
                          )}
                        </span>
                        {done ? <span className="text-gold">✓</span> : <span className="text-incense">{lesson.minutes}′</span>}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}

      {passportOpen && (
        <PilgrimPassport
          onClose={() => {
            setPassportOpen(false);
            setJustStamped(null);
          }}
          stampJustEarned={justStamped}
        />
      )}
    </div>
  );
}

export default function RoadPage() {
  return (
    <Suspense>
      <RoadContent />
    </Suspense>
  );
}
