'use client';

// ─── The candle: the daily ritual ────────────────────────────────────────────
// Flame catches, light blooms softly across the screen. Reflections are
// private, optional, never scored.

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import type { L } from '@/content/types';
import { haptic, playBell } from '@/lib/sound';
import { stopNarration } from '@/lib/speech';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

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
  const still = prefersReducedMotion();

  const light = () => {
    stopNarration(); // any reading of the last card ends as the candle is lit
    setLit(true);
    playBell();
    haptic([0, 18, 40, 12]); // a soft double pulse, like a struck bell
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
          <svg viewBox="0 0 60 80" className="absolute -top-16 h-20 w-16" aria-hidden>
            <defs>
              {/* living fire: feTurbulence whose frequency breathes, driving a displacement map */}
              <filter id="cr-fire" x="-50%" y="-60%" width="200%" height="220%">
                <feTurbulence type="fractalNoise" baseFrequency="0.018 0.045" numOctaves="3" seed="4" result="fn">
                  {!still && (
                    <animate
                      attributeName="baseFrequency"
                      dur="5.5s"
                      values="0.018 0.045;0.024 0.07;0.02 0.05;0.018 0.045"
                      repeatCount="indefinite"
                    />
                  )}
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="fn" scale="6" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              {/* warm light bloom */}
              <filter id="cr-bloom" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* garnet at base → orange mid → gold tip */}
              <linearGradient id="cr-outer" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#7A1F2B" />
                <stop offset="55%" stopColor="#b5572e" />
                <stop offset="100%" stopColor="#D9A441" />
              </linearGradient>
              {/* orange at base → gold → ivory tip */}
              <linearGradient id="cr-inner" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#c9772f" />
                <stop offset="60%" stopColor="#D9A441" />
                <stop offset="100%" stopColor="#F3ECDD" />
              </linearGradient>
            </defs>

            {/* soft wax-glow pool at the wick */}
            <ellipse cx="30" cy="70" rx="20" ry="6" fill="#D9A441" opacity="0.18" />

            {/* the living flame: turbulence + sway + multi-layer glow */}
            <g filter="url(#cr-fire)" className="flame-sway" style={{ transformOrigin: '30px 44px' }}>
              {/* outer flame — dark garnet rising to gold */}
              <path
                d="M30 8c12 16 18 26 18 36a18 18 0 0 1-36 0c0-10 6-20 18-36z"
                fill="url(#cr-outer)"
              />
              {/* inner flame — warm orange-to-ivory with bloom glow */}
              <g filter="url(#cr-bloom)">
                <path
                  d="M30 18c8 11 11 18 11 26a11 11 0 0 1-22 0c0-8 3-15 11-26z"
                  fill="url(#cr-inner)"
                  className="flame"
                />
                {/* white-hot core at the wick */}
                <path
                  d="M30 28c4 6 6 10 6 14a6 6 0 0 1-12 0c0-4 2-8 6-14z"
                  fill="#F3ECDD"
                />
              </g>
            </g>

            {/* embers lifting off and fading upward */}
            <circle
              cx="28" cy="40" r="1.3" fill="#D9A441" className="ember"
              style={{ '--x': '-9px', '--d': '0s' } as React.CSSProperties}
            />
            <circle
              cx="32" cy="40" r="1.1" fill="#D9A441" className="ember"
              style={{ '--x': '8px', '--d': '1.4s' } as React.CSSProperties}
            />
            <circle
              cx="30" cy="38" r="0.9" fill="#F3ECDD" className="ember"
              style={{ '--x': '-4px', '--d': '2.9s' } as React.CSSProperties}
            />
          </svg>
        )}
        <div
          className={`h-36 w-12 rounded-md bg-ivory/90 ${
            lit ? 'candle-glow-pulse' : 'shadow-[0_0_40px_rgba(217,164,65,0.2)]'
          }`}
        />
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
              placeholder={t(UI.reflectionPlaceholder)}
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
