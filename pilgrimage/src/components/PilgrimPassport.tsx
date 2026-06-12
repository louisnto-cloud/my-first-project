'use client';

// ─── The Pilgrim's Passport ──────────────────────────────────────────────────
// The emotional centerpiece. Each world is a page; completing a world presses
// an ornate ink stamp onto it — a cross between a vintage visa stamp and an
// illuminated manuscript seal. The final page is reserved, faintly embossed,
// for the day of her baptism.

import { useState } from 'react';
import type { World, WorldId } from '@/content/types';
import { WORLDS } from '@/content/worlds';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { stepsWalked, worldProgress } from '@/lib/progress';

const STAMP_COLORS: Record<WorldId, string> = {
  hanoi: '#D9A441',
  bruges: '#7A1F2B',
  paris: '#D9A441',
  brussels: '#D9A441',
  parish: '#D9A441',
};

function Stamp({ world, date, animate }: { world: World; date: string; animate: boolean }) {
  const { t, lang } = useI18n();
  const color = STAMP_COLORS[world.id];
  const churchLine = t(world.church).toUpperCase();
  const dateStr = new Date(date + 'T12:00:00').toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className={animate ? 'stamp-press' : 'rotate-[-8deg]'}>
      <svg viewBox="0 0 200 200" className={`h-44 w-44 ${animate ? 'ink-bleed' : 'opacity-90'}`}>
        <defs>
          <path id={`ring-${world.id}`} d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
        </defs>
        <circle cx="100" cy="100" r="88" fill="none" stroke={color} strokeWidth="3.5" />
        <circle cx="100" cy="100" r="82" fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="2 4" />
        <circle cx="100" cy="100" r="56" fill="none" stroke={color} strokeWidth="1.5" />
        <text fontSize="13.5" fontFamily="Cinzel, serif" fill={color} letterSpacing="2.5">
          <textPath href={`#ring-${world.id}`} startOffset="0%">
            {churchLine} · {t(world.place).toUpperCase()} ·
          </textPath>
        </text>
        {/* central cross and rays */}
        <g stroke={color} strokeWidth="3" strokeLinecap="round">
          <line x1="100" y1="72" x2="100" y2="124" />
          <line x1="82" y1="90" x2="118" y2="90" />
        </g>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4 + Math.PI / 8;
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * 36}
              y1={100 + Math.sin(a) * 36}
              x2={100 + Math.cos(a) * 48}
              y2={100 + Math.sin(a) * 48}
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}
        <text x="100" y="146" textAnchor="middle" fontSize="13" fontFamily="Nunito Sans, sans-serif" fontWeight="700" fill={color}>
          {dateStr}
        </text>
      </svg>
    </div>
  );
}

export function PilgrimPassport({
  onClose,
  stampJustEarned,
}: {
  onClose: () => void;
  stampJustEarned?: WorldId | null;
}) {
  const { t, save } = useI18n();
  const pages: (World | 'final')[] = [...WORLDS, 'final'];
  const [page, setPage] = useState(() =>
    stampJustEarned ? Math.max(0, WORLDS.findIndex((w) => w.id === stampJustEarned)) : 0,
  );

  const current = pages[page];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-lapis/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="font-display text-lg tracking-wide text-gold">{t(UI.passportTitle)}</h2>
        <button onClick={onClose} className="min-h-[44px] rounded-full px-4 font-ui text-sm font-bold text-incense">
          {t(UI.close)} ✕
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-4">
        {/* The page: vellum ivory, like heavy paper */}
        <div className="relative flex aspect-[3/4] w-full max-w-sm flex-col items-center overflow-hidden rounded-2xl bg-ivory p-6 text-lapis shadow-2xl">
          <div className="absolute inset-2 rounded-xl border border-lapis/15" />
          <div className="absolute inset-3 rounded-lg border border-lapis/10" />

          {current === 'final' ? (
            <div className="relative flex flex-1 flex-col items-center justify-center gap-6 text-center">
              <div className="flex h-44 w-44 items-center justify-center rounded-full border-2 border-lapis/10">
                <svg viewBox="0 0 60 80" className="h-16 w-12 opacity-15">
                  <path d="M30 4c8 11 13 18 13 26a13 13 0 0 1-26 0c0-8 5-15 13-26z" fill="#1C2647" />
                  <rect x="24" y="36" width="12" height="38" rx="2" fill="#1C2647" />
                </svg>
              </div>
              <p className="max-w-[16rem] font-story text-xl italic leading-relaxed text-lapis/60">
                {t(UI.passportFinalPage)}
              </p>
            </div>
          ) : (
            <div className="relative flex flex-1 flex-col items-center pt-2 text-center">
              <p className="font-display text-[10px] uppercase tracking-[0.35em] text-garnet">
                {String(page + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-1 font-display text-2xl leading-tight">{t(current.church)}</h3>
              <p className="font-story text-lg italic text-lapis/70">{t(current.place)}</p>
              <p className="mt-1 font-ui text-xs font-semibold uppercase tracking-widest text-lapis/50">
                {t(current.theme)}
              </p>

              <div className="flex flex-1 items-center justify-center">
                {save.stamps[current.id] ? (
                  <Stamp world={current} date={save.stamps[current.id]} animate={stampJustEarned === current.id} />
                ) : (
                  <div className="flex h-44 w-44 rotate-[-8deg] items-center justify-center rounded-full border-2 border-lapis/10">
                    <p className="max-w-[8rem] font-story text-base italic leading-snug text-lapis/35">
                      {t(UI.passportNotYet)}
                    </p>
                  </div>
                )}
              </div>

              {/* mementos in elegant script */}
              <div className="mb-2 flex items-end justify-center gap-5 font-story text-base italic text-lapis/60">
                <span>
                  {save.candles.length} {t(UI.passportCandles)}
                </span>
                {current.id === 'hanoi' && save.stamps.hanoi && (
                  <span>
                    {worldProgress(current, save).done} {t(UI.lessonsWord)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* page turner, in thumb territory */}
      <div className="flex items-center justify-between px-8 pb-10">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-ivory/20 text-ivory disabled:opacity-30"
          aria-label="Previous page"
        >
          ‹
        </button>
        <div className="flex gap-2">
          {pages.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === page ? 'bg-gold' : 'bg-ivory/25'}`} />
          ))}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
          disabled={page === pages.length - 1}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-ivory/20 text-ivory disabled:opacity-30"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
