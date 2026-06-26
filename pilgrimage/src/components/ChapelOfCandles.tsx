'use client';

// ─── Chapel of Candles: the streak, without punishment ──────────────────────
// One candle for each day she walked. Missed days are never scolded;
// the chapel simply says the candles can always be lit again.

import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';

export function ChapelOfCandles() {
  const { t, save } = useI18n();
  const total = save.candles.length;

  // The last 14 days as a row of candle places in the side chapel.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const iso = `${d.getFullYear()}-${m}-${day}`;
    return { iso, lit: save.candles.includes(iso) };
  });

  return (
    <section className="rounded-3xl border border-ivory/10 bg-[#141b33] p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg text-gold">{t(UI.chapelCandles)}</h2>
        <p className="font-story text-lg italic text-incense">
          {total} · {t(UI.streakDays)}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-3">
        {days.map(({ iso, lit }) => (
          <div key={iso} className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 24 40" className="h-10 w-6">
              {lit && (
                <>
                  <path d="M12 2c4 5.5 6 9 6 12.5a6 6 0 0 1-12 0C6 11 8 7.5 12 2z" fill="#D9A441" className="flame" />
                  <circle cx="12" cy="12" r="9" fill="#D9A441" opacity="0.15" />
                </>
              )}
              <rect x="8" y="18" width="8" height="18" rx="2" fill={lit ? '#F3ECDD' : '#2a3354'} opacity={lit ? 0.95 : 0.8} />
            </svg>
            <span className="text-[9px] text-incense">{iso.slice(8)}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 font-story text-base italic leading-relaxed text-incense">{t(UI.chapelCandlesNote)}</p>
    </section>
  );
}
