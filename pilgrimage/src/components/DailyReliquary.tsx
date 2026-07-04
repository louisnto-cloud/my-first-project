'use client';

// ─── The Daily Reliquary ─────────────────────────────────────────────────────
// A small golden box on the Today screen. Once a day it opens: one surprise,
// ten seconds long. Variable, delightful, and it costs her nothing.

import { useState } from 'react';
import { RELIQUARY } from '@/content/reliquary';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { todayISO, updateSave } from '@/lib/storage';
import { SacredArt } from '@/components/SacredArt';
import { SpeakerButton } from '@/components/SpeakerButton';
import { spokenParagraphs, stopNarration } from '@/lib/speech';

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

export function DailyReliquary() {
  const { t, lang, save } = useI18n();
  const [open, setOpen] = useState(false);
  const openedToday = save.reliquary === todayISO();
  const item = RELIQUARY[dayOfYear() % RELIQUARY.length];

  const openBox = () => {
    setOpen(true);
    updateSave({ reliquary: todayISO() });
  };

  const close = () => {
    stopNarration(); // the gift's reading ends when the box closes
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={openBox}
        className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
          openedToday ? 'border-ivory/10' : 'border-gold/40'
        }`}
      >
        {/* the little golden reliquary chest */}
        <svg viewBox="0 0 40 34" className={`h-9 w-10 shrink-0 ${openedToday ? 'opacity-50' : 'soft-glow'}`}>
          <path d="M4 16h32v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#D9A441" />
          <path d="M4 16c0-7 7-12 16-12s16 5 16 12z" fill="#D9A441" opacity="0.85" />
          <path d="M4 16h32" stroke="#1C2647" strokeWidth="1.5" />
          <rect x="17" y="13" width="6" height="8" rx="1.5" fill="#7A1F2B" />
          <path d="M20 6v5M18 8.5h4" stroke="#1C2647" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="flex-1">
          <span className="block font-display text-sm text-gold">{t(UI.reliquaryTitle)}</span>
          <span className="block text-xs text-incense">
            {openedToday ? t(UI.reliquaryOpened) : t(UI.reliquaryHint)}
          </span>
        </span>
      </button>

      {open && (
        <div className="veil-in fixed inset-0 z-50 flex items-center justify-center bg-lapis/85 px-6 backdrop-blur-sm" onClick={close}>
          <div
            className="light-bloom w-full max-w-sm rounded-3xl border border-gold/40 bg-[#141b33] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {item.art && (
              <div className="mb-4 aspect-[4/3] overflow-hidden rounded-2xl">
                <SacredArt kind={item.art} rounded={false} />
              </div>
            )}
            <p className="font-display text-xs uppercase tracking-[0.3em] text-gold">{t(UI.reliquaryTitle)}</p>
            <div className="mt-2 flex items-start gap-3">
              <h3 className="min-w-0 flex-1 font-display text-xl text-ivory">{t(item.title)}</h3>
              {/* the gift is read aloud, like everything else the guide gives */}
              <SpeakerButton
                id={`reliquary-${todayISO()}-${lang}`}
                text={spokenParagraphs(t(item.title), t(item.text))}
                autoStart={save.narrate}
              />
            </div>
            <p className="mt-2 font-story text-xl leading-relaxed text-ivory">{t(item.text)}</p>
            <button
              onClick={close}
              className="mt-5 min-h-[48px] w-full rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
            >
              {t(UI.close)}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
