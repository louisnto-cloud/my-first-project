'use client';

// ─── RCIA milestone tracker ──────────────────────────────────────────────────
// Enter the real dates as your parish gives them; the app counts down with
// encouragement, never pressure.

import { RCIA_MILESTONES } from '@/content/rcia';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { todayISO, updateSave } from '@/lib/storage';

function daysUntil(iso: string): number {
  const today = new Date(todayISO() + 'T00:00:00');
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function RCIAMilestoneTracker() {
  const { t, lang, save } = useI18n();

  return (
    <section className="rounded-3xl border border-ivory/10 bg-[#141b33] p-5">
      <h2 className="font-display text-lg text-gold">{t(UI.rciaTitle)}</h2>
      <p className="mt-1 text-xs text-incense">{t(UI.parishNote)}</p>

      <ol className="mt-4 flex flex-col gap-3">
        {RCIA_MILESTONES.map((m) => {
          const date = save.ocia[m.id];
          const days = date ? daysUntil(date) : null;
          const passed = days !== null && days < 0;
          return (
            <li key={m.id} className={`rounded-2xl border p-3.5 ${passed ? 'border-gold/50 bg-gold/10' : 'border-ivory/10'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-sm text-ivory">
                    {passed && <span className="mr-1.5 text-gold">✦</span>}
                    {t(m.name)}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-incense">{t(m.about)}</p>
                  {days !== null && !passed && (
                    <p className="mt-1.5 font-story text-base italic text-gold">
                      {days === 0
                        ? t(UI.rciaToday)
                        : `${days} ${t(UI.rciaDays)} · ${new Date(date + 'T12:00:00').toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB')}`}
                    </p>
                  )}
                  {passed && (
                    <p className="mt-1.5 font-story text-base italic text-gold">
                      {t(UI.rciaPassed)} · {new Date(date + 'T12:00:00').toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB')}
                    </p>
                  )}
                </div>
                <input
                  type="date"
                  value={date ?? ''}
                  onChange={(e) =>
                    updateSave((d) => ({ ocia: { ...d.ocia, [m.id]: e.target.value } }))
                  }
                  aria-label={t(m.name)}
                  className="min-h-[44px] w-[8.5rem] shrink-0 rounded-xl border border-ivory/15 bg-lapis/60 px-2 font-ui text-xs text-ivory focus:border-gold/50 focus:outline-none"
                />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
