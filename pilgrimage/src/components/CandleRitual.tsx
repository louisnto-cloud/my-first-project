'use client';

// ─── The candle: the daily ritual ────────────────────────────────────────────
// Flame catches, light blooms softly across the screen. Reflections are
// private, optional, never scored.

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import type { L } from '@/content/types';

export function CandleRitual({
  reflectionPrompt,
  onLit,
  litLabelExtra,
  children,
}: {
  reflectionPrompt: L;
  onLit: (reflection: string) => void;
  litLabelExtra?: string;
  children?: React.ReactNode; // actions shown after the candle is lit
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [lit, setLit] = useState(false);

  const light = () => {
    setLit(true);
    onLit(text.trim());
  };

  return (
    <div className="relative flex h-full flex-col items-center justify-end gap-6 overflow-hidden px-6 pb-8 pt-10">
      {lit && (
        <>
          <div className="light-bloom pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_55%,rgba(217,164,65,0.28),transparent_70%)]" />
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              className="shard pointer-events-none absolute top-0 block w-3 rounded-sm"
              style={{
                left: `${12 + i * 12}%`,
                height: `${26 + (i % 3) * 14}px`,
                background: i % 3 === 0 ? '#7A1F2B' : '#D9A441',
                opacity: 0.5,
                ['--rot' as string]: `${(i - 3) * 9}deg`,
                ['--dur' as string]: `${2.8 + (i % 4) * 0.5}s`,
                ['--delay' as string]: `${i * 0.25}s`,
              }}
            />
          ))}
        </>
      )}

      {/* The candle */}
      <div className="relative flex flex-col items-center">
        {lit && (
          <svg viewBox="0 0 60 80" className="absolute -top-16 h-20 w-16">
            <path d="M30 8c12 16 18 26 18 36a18 18 0 0 1-36 0c0-10 6-20 18-36z" fill="#D9A441" className="flame" />
            <circle cx="30" cy="46" r="26" fill="#D9A441" opacity="0.15" />
          </svg>
        )}
        <div className="h-36 w-12 rounded-md bg-ivory/90 shadow-[0_0_40px_rgba(217,164,65,0.2)]" />
        <div className="mt-1 h-2 w-20 rounded-full bg-ivory/20" />
      </div>

      {!lit ? (
        <>
          <div className="w-full">
            <p className="text-center font-story text-2xl text-ivory">{t(reflectionPrompt)}</p>
            <p className="mt-1 text-center text-xs text-incense">{t(UI.reflectionNote)}</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="mt-3 w-full rounded-2xl border border-ivory/15 bg-lapis/60 p-3 font-story text-lg text-ivory placeholder-incense focus:border-gold/50 focus:outline-none"
              placeholder="…"
            />
          </div>
          <button
            onClick={light}
            className="min-h-[56px] w-full rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
          >
            {t(UI.lightTheCandle)}
          </button>
        </>
      ) : (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="font-story text-2xl text-gold">
            {t(UI.candleLit)}
            {litLabelExtra ? ` ${litLabelExtra}` : ''}
          </p>
          {children}
        </div>
      )}
    </div>
  );
}
