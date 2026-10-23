'use client';

// ─── The Rose Window ─────────────────────────────────────────────────────────
// Achievements assemble, pane by pane, into one rose window. The long arc of
// the whole pilgrimage, living quietly inside My Chapel.

import { useState } from 'react';
import { ACHIEVEMENTS } from '@/content/achievements';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';

const PANE_COLORS = ['#D9A441', '#7A1F2B', '#F3ECDD'];

export function RoseWindow() {
  const { t, save } = useI18n();
  const [open, setOpen] = useState<number | null>(null);

  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned(save)).length;
  const n = ACHIEVEMENTS.length;

  return (
    <section className="rounded-3xl border border-ivory/10 bg-[#141b33] p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg text-gold">{t(UI.roseWindow)}</h2>
        <p className="font-story text-lg italic text-incense">
          {earnedCount}/{n}
        </p>
      </div>

      <div className="mx-auto mt-4 max-w-[17rem]">
        <svg viewBox="0 0 240 240" role="img" aria-label={t(UI.roseWindow)}>
          {/* stone tracery */}
          <circle cx="120" cy="120" r="114" fill="#10162b" stroke="#8A8578" strokeWidth="3" />
          <circle cx="120" cy="120" r="98" fill="none" stroke="#8A8578" strokeWidth="1.5" opacity="0.6" />
          {/* the panes */}
          {ACHIEVEMENTS.map((a, i) => {
            const earned = a.earned(save);
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
            const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
            const mid = (a0 + a1) / 2;
            const r0 = 38;
            const r1 = 94;
            const gap = 0.035;
            const p = (r: number, ang: number) => `${120 + Math.cos(ang) * r},${120 + Math.sin(ang) * r}`;
            const d = `M${p(r0, a0 + gap)} L${p(r1, a0 + gap)} A${r1} ${r1} 0 0 1 ${p(r1, a1 - gap)} L${p(r0, a1 - gap)} A${r0} ${r0} 0 0 0 ${p(r0, a0 + gap)} Z`;
            const color = PANE_COLORS[i % PANE_COLORS.length];
            return (
              <g key={a.id} onClick={() => setOpen(open === i ? null : i)} className="cursor-pointer">
                <path
                  d={d}
                  fill={earned ? color : '#1a2240'}
                  opacity={earned ? 0.92 : 1}
                  stroke={open === i ? '#D9A441' : '#8A8578'}
                  strokeWidth={open === i ? 2 : 1}
                />
                {earned && (
                  <circle cx={120 + Math.cos(mid) * ((r0 + r1) / 2)} cy={120 + Math.sin(mid) * ((r0 + r1) / 2)} r="3.5" fill="#F3ECDD" opacity="0.85" />
                )}
              </g>
            );
          })}
          {/* center boss: the flame, reserved glow */}
          <circle cx="120" cy="120" r="30" fill="#1C2647" stroke="#8A8578" strokeWidth="1.5" />
          <path
            d="M120 102c8 10 12 17 12 23a12 12 0 0 1-24 0c0-6 4-13 12-23z"
            fill="#D9A441"
            opacity={earnedCount === n ? 1 : 0.3}
            className={earnedCount === n ? 'flame' : ''}
          />
        </svg>
      </div>

      {open !== null && (
        <div className="gold-glow mt-3 rounded-2xl bg-gold/10 p-4">
          <p className="font-display text-base text-gold">{t(ACHIEVEMENTS[open].title)}</p>
          <p className="mt-1 font-story text-lg leading-snug text-ivory">
            {t(ACHIEVEMENTS[open].how)}
            {!ACHIEVEMENTS[open].earned(save) && ' …'}
          </p>
        </div>
      )}
    </section>
  );
}
