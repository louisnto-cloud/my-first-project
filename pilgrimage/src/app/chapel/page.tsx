'use client';

// ─── MY CHAPEL: candles, prayers, journal, and quiet settings ────────────────

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { PRAYERS } from '@/content/prayers';
import { MERCY_NAME } from '@/content/mercy';
import { lessonById } from '@/content/worlds';
import { exportJSON, importJSON } from '@/lib/storage';
import { collectUnverified, downloadFile } from '@/lib/review';
import { ChapelOfCandles } from '@/components/ChapelOfCandles';
import { RoseWindow } from '@/components/RoseWindow';
import { RCIAMilestoneTracker } from '@/components/RCIAMilestoneTracker';
import { LanguageToggle } from '@/components/LanguageToggle';
import { SpeakerButton } from '@/components/SpeakerButton';
import { guideVoiceName, narrate, useNarrator } from '@/lib/speech';
import { updateSave } from '@/lib/storage';
import { startAmbient, stopAmbient } from '@/lib/ambient';

export default function ChapelPage() {
  const { t, lang, save } = useI18n();
  // Re-render when narration state changes so the voice name stays current
  // (the voice list loads asynchronously on some browsers).
  useNarrator();
  const voiceName = guideVoiceName(lang);
  const [openPrayer, setOpenPrayer] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [dataOpen, setDataOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
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
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/mass" className="rounded-2xl border border-gold/30 px-3.5 py-3">
            <span className="block font-display text-[15px] leading-snug text-ivory">{t(UI.massTitle)}</span>
            <span className="mt-1 block text-[11px] leading-snug text-incense">{t(UI.massSubtitle)}</span>
          </Link>
          <Link href="/rosary" className="rounded-2xl border border-gold/30 px-3.5 py-3">
            <span className="block font-display text-[15px] leading-snug text-ivory">{t(UI.rosaryTitle)}</span>
            <span className="mt-1 block text-[11px] leading-snug text-incense">{t(UI.rosarySubtitle)}</span>
          </Link>
          <Link href="/stations" className="rounded-2xl border border-gold/30 px-3.5 py-3">
            <span className="block font-display text-[15px] leading-snug text-ivory">{t(UI.stationsTitle)}</span>
            <span className="mt-1 block text-[11px] leading-snug text-incense">{t(UI.stationsSubtitle)}</span>
          </Link>
          <Link href="/mercy" className="rounded-2xl border border-gold/30 px-3.5 py-3">
            <span className="block font-display text-[15px] leading-snug text-ivory">{t(MERCY_NAME)}</span>
            <span className="mt-1 block text-[11px] leading-snug text-incense">{t(UI.mercySubtitle)}</span>
          </Link>
        </div>
      </section>

      <RCIAMilestoneTracker />

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
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        {(lang === 'vi' ? p.vi : p.en).map((line, i) => (
                          <p key={i} className="font-story text-lg leading-relaxed text-ivory">{line}</p>
                        ))}
                      </div>
                      <SpeakerButton id={`prayer-${p.id}-${lang}`} text={(lang === 'vi' ? p.vi : p.en).join(' ')} tone="prayer" />
                    </div>
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
            {save.journal.map((entry, origIdx) => ({ entry, origIdx })).reverse().map(({ entry, origIdx }) => {
              const lesson = lessonById(entry.lessonId);
              const confirming = confirmDelete === origIdx;
              return (
                <div key={origIdx} className="rounded-2xl bg-lapis/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] text-incense">
                      {new Date(entry.date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB')}
                      {lesson ? ` · ${t(lesson.lesson.title)}` : ''}
                    </p>
                    {confirming ? (
                      <span className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => {
                            updateSave((d) => ({ journal: d.journal.filter((_, k) => k !== origIdx) }));
                            setConfirmDelete(null);
                          }}
                          className="rounded-full bg-garnet/30 px-2.5 py-0.5 text-[11px] font-bold text-ivory"
                        >
                          {t(UI.journalRemove)}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-[11px] font-semibold text-incense"
                        >
                          {t(UI.journalKeep)}
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(origIdx)}
                        aria-label={t(UI.journalRemove)}
                        className="shrink-0 p-1 text-incense/70"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                          <path d="M9 3h6l1 2h4v2H4V5h4l1-2ZM6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z" />
                        </svg>
                      </button>
                    )}
                  </div>
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
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-ui text-sm font-semibold text-ivory">{t(UI.soundLabel)}</span>
            <span className="block text-xs text-incense">{t(UI.soundNote)}</span>
          </span>
          <button
            role="switch"
            aria-checked={save.sound}
            aria-label={t(UI.soundLabel)}
            onClick={() => updateSave({ sound: !save.sound })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${save.sound ? 'bg-gold' : 'bg-ivory/15'}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-ivory transition-all ${save.sound ? 'left-6' : 'left-1'}`}
            />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-ui text-sm font-semibold text-ivory">{t(UI.ambientLabel)}</span>
            <span className="block text-xs text-incense">{t(UI.ambientNote)}</span>
          </span>
          <button
            role="switch"
            aria-checked={save.ambient}
            aria-label={t(UI.ambientLabel)}
            onClick={() => {
              const next = !save.ambient;
              updateSave({ ambient: next });
              if (next) startAmbient(); else stopAmbient();
            }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${save.ambient ? 'bg-gold' : 'bg-ivory/15'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-ivory transition-all ${save.ambient ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-ui text-sm font-semibold text-ivory">{t(UI.narrateLabel)}</span>
            <span className="block text-xs text-incense">{t(UI.narrateNote)}</span>
          </span>
          <button
            role="switch"
            aria-checked={save.narrate}
            aria-label={t(UI.narrateLabel)}
            onClick={() => updateSave({ narrate: !save.narrate })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${save.narrate ? 'bg-gold' : 'bg-ivory/15'}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-ivory transition-all ${save.narrate ? 'left-6' : 'left-1'}`}
            />
          </button>
        </div>
        {/* Hear the guide's voice right away — no need to open a story */}
        <button
          onClick={() => narrate('voice-preview', t(UI.obGuideSample), lang, { cue: true })}
          className="mt-3 w-full rounded-2xl border border-gold/30 px-4 py-3 text-left"
        >
          <span className="block font-ui text-sm font-semibold text-gold">{t(UI.narratePreview)}</span>
          {voiceName && (
            <span className="mt-0.5 block text-xs text-incense">{voiceName}</span>
          )}
        </button>
        <button
          onClick={() => setDataOpen((o) => !o)}
          className="mt-4 flex w-full items-center justify-between text-left font-ui text-sm font-semibold text-incense"
        >
          {t(UI.dataTools)}
          <span className="text-gold">{dataOpen ? '–' : '+'}</span>
        </button>
        {dataOpen && (
        <div className="mt-3 flex flex-col gap-2">
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
        )}
      </section>

      <p className="pb-4 text-center font-story text-base italic leading-relaxed text-incense">
        {t(UI.parishNote)}
      </p>
    </div>
  );
}
