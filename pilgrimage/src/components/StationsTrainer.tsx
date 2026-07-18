'use client';

// ─── The Stations of the Cross: a crown jewel ────────────────────────────────
// Fourteen stations walked slowly, one screen at a time. Each opens with the
// traditional versicle and response, then a short meditation. Tap to advance;
// no pace, no pressure — like the rosary, this is prayed, not completed.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STATIONS, STATIONS_RESPONSE, STATIONS_VERSICLE } from '@/content/stations';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { updateSave } from '@/lib/storage';
import { SacredArt } from '@/components/SacredArt';
import { SpeakerButton } from '@/components/SpeakerButton';
import { spokenParagraphs } from '@/lib/speech';

export function StationsTrainer() {
  const { t, lang, save } = useI18n();
  const [i, setI] = useState(0);
  const total = STATIONS.length;
  const done = i >= total;
  const station = STATIONS[Math.min(i, total - 1)];

  // A completed way of the cross rests in her chapel.
  useEffect(() => {
    if (done) {
      updateSave((d) => ({
        seen: { ...d.seen, stations: (d.seen.stations ?? 0) + 1 },
      }));
    }
  }, [done]);

  const spoken = spokenParagraphs(
    `${t(UI.stationWord)} ${station.n}. ${t(station.title)}`,
    t(STATIONS_VERSICLE),
    t(STATIONS_RESPONSE),
    t(station.meditation),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* header: back, title, progress */}
      <div className="flex items-center gap-3 px-4 pt-safe-bar">
        <Link href="/chapel" aria-label={t(UI.close)} className="flex h-11 w-11 items-center justify-center rounded-full text-incense">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z" /></svg>
        </Link>
        <div className="flex-1">
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-gold">
            {t(UI.stationsTitle)}
            {!done && ` · ${station.n}/${total}`}
          </p>
          <div
            className="mt-1 h-0.5 overflow-hidden rounded-full bg-ivory/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(i, total)}
          >
            <div className="h-full bg-gold transition-all duration-300" style={{ width: `${(Math.min(i, total) / total) * 100}%` }} />
          </div>
        </div>
        {!done && (
          <SpeakerButton id={`station-${station.n}-${lang}`} text={spoken} autoStart={save.narrate} tone="prayer" />
        )}
      </div>

      {!done ? (
        <button onClick={() => setI(i + 1)} className="page-in flex min-h-0 flex-1 flex-col text-left" aria-label={t(UI.continueWord)} key={station.n}>
          <div className="relative mx-5 mt-4 aspect-[16/10] overflow-hidden rounded-3xl">
            <SacredArt kind={station.art} rounded={false} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-lapis to-transparent" />
            <p className="absolute bottom-3 left-4 right-4 font-display text-base text-ivory">
              {station.n}. {t(station.title)}
            </p>
          </div>

          <div className="px-6 py-4">
            {/* the traditional versicle and response */}
            <div className="rounded-2xl border border-gold/25 bg-lapis/70 p-4">
              <p className="font-story text-lg italic leading-relaxed text-gold">{t(STATIONS_VERSICLE)}</p>
              <p className="mt-1.5 font-story text-lg leading-relaxed text-ivory">{t(STATIONS_RESPONSE)}</p>
            </div>

            <p className="mt-4 font-story text-xl italic leading-relaxed text-ivory/85">
              {t(station.meditation)}
            </p>

            <p className="mt-6 text-center text-xs text-incense">{t(UI.tapToContinue)}</p>
          </div>
        </button>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="h-40 w-52">
            <SacredArt kind="tomb-morning" />
          </div>
          <p className="font-story text-2xl leading-relaxed text-ivory">{t(UI.stationsDone)}</p>
          <Link
            href="/chapel"
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-gold font-ui text-base font-bold text-lapis"
          >
            {t(UI.close)}
          </Link>
        </div>
      )}
    </div>
  );
}
