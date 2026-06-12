'use client';

// ─── MY CHAPEL: candles, prayers, journal, and quiet settings ────────────────

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { PRAYERS } from '@/content/prayers';
import { lessonById } from '@/content/worlds';
import { exportJSON, importJSON } from '@/lib/storage';
import { collectUnverified, downloadFile } from '@/lib/review';
import { ChapelOfCandles } from '@/components/ChapelOfCandles';
import { RoseWindow } from '@/components/RoseWindow';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function ChapelPage() {
  const { t, lang, save } = useI18n();
  const [openPrayer, setOpenPrayer] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const keptPrayers = PRAYERS.filter((p) => (save.seen[p.id] ?? 0) > 0);

  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ivory">{t(UI.chapelTitle)}</h1>
        <LanguageToggle />
      </header>

      <ChapelOfCandles />

      {/* Practices: the two crown jewels */}
      <section className="rounded-3xl border border-ivory/10 bg-[#141b33] p-5">
        <h2 className="font-display text-lg text-gold">{t(UI.chapelPractices)}</h2>
        <div className="mt-3 flex flex-col gap-2">
          <Link href="/mass" className="rounded-2xl border border-gold/30 px-4 py-3.5">
            <span className="block font-display text-base text-ivory">{t(UI.massTitle)}</span>
            <span className="mt-0.5 block text-xs text-incense">{t(UI.massSubtitle)}</span>
          </Link>
          <Link href="/rosary" className="rounded-2xl border border-gold/30 px-4 py-3.5">
            <span className="block font-display text-base text-ivory">{t(UI.rosaryTitle)}</span>
            <span className="mt-0.5 block text-xs text-incense">{t(UI.rosarySubtitle)}</span>
          </Link>
        </div>
      </section>

      <RoseWindow />

      {/* Prayers she keeps */}
      <section className="rounded-3xl border border-ivory/10 bg-[#141b33] p-5">
        <h2 className="font-display text-lg text-gold">{t(UI.chapelPrayers)}</h2>
        {keptPrayers.length === 0 ? (
          <p className="mt-3 font-story text-lg italic text-incense">{t(UI.chapelNoPrayers)}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {keptPrayers.map((p) => (
              <div key={p.id} className="rounded-2xl border border-gold/25">
                <button
                  onClick={() => setOpenPrayer(openPrayer === p.id ? null : p.id)}
                  className="flex min-h-[52px] w-full items-center justify-between px-4 font-ui text-sm font-bold text-ivory"
                >
                  {t(p.name)}
                  <span className="text-gold">{openPrayer === p.id ? '–' : '+'}</span>
                </button>
                {openPrayer === p.id && (
                  <div className="px-4 pb-4">
                    {(lang === 'vi' ? p.vi : p.en).map((line, i) => (
                      <p key={i} className="font-story text-lg leading-relaxed text-ivory">{line}</p>
                    ))}
                    <p className="mt-3 font-story text-base italic text-incense">{t(p.about)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Journal — hers alone, stored locally */}
      <section className="rounded-3xl border border-ivory/10 bg-[#141b33] p-5">
        <h2 className="font-display text-lg text-gold">{t(UI.chapelJournal)}</h2>
        <p className="mt-1 text-xs text-incense">{t(UI.reflectionNote)}</p>
        {save.journal.length === 0 ? (
          <p className="mt-3 font-story text-lg italic text-incense">{t(UI.chapelNoJournal)}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {[...save.journal].reverse().map((entry, i) => {
              const lesson = lessonById(entry.lessonId);
              return (
                <div key={i} className="rounded-2xl bg-lapis/60 p-4">
                  <p className="text-[11px] text-incense">
                    {new Date(entry.date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB')}
                    {lesson ? ` · ${t(lesson.lesson.title)}` : ''}
                  </p>
                  <p className="mt-1 font-story text-lg leading-relaxed text-ivory">{entry.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Settings, quiet */}
      <section className="rounded-3xl border border-ivory/10 bg-[#141b33] p-5">
        <h2 className="font-display text-lg text-gold">{t(UI.chapelSettings)}</h2>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-ui text-sm font-semibold text-ivory">{t(UI.language)}</span>
          <LanguageToggle />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => downloadFile('pilgrimage-save.json', exportJSON())}
            className="min-h-[48px] rounded-xl border border-ivory/20 px-4 text-left font-ui text-sm font-semibold text-ivory"
          >
            {t(UI.exportSave)}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="min-h-[48px] rounded-xl border border-ivory/20 px-4 text-left font-ui text-sm font-semibold text-ivory"
          >
            {t(UI.importSave)}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const ok = importJSON(await file.text());
              setImportMsg(t(ok ? UI.importOk : UI.importBad));
              e.target.value = '';
            }}
          />
          {importMsg && <p className="text-sm text-gold">{importMsg}</p>}
          <button
            onClick={() =>
              downloadFile('vietnamese-review.json', JSON.stringify(collectUnverified(), null, 2))
            }
            className="min-h-[48px] rounded-xl border border-ivory/20 px-4 text-left font-ui text-sm font-semibold text-incense"
          >
            {t(UI.viReviewExport)}
          </button>
        </div>
      </section>

      <p className="pb-4 text-center font-story text-base italic leading-relaxed text-incense">
        {t(UI.parishNote)}
      </p>
    </div>
  );
}
