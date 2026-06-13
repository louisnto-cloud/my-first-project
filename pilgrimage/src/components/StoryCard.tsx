'use client';

// One story card: full-bleed art with a soft gradient scrim, 1–3 short
// sentences in the story face, optional scripture in the three-layer pattern,
// optional light branching with no wrong answers. A speaker reads it aloud.

import { useEffect, useState } from 'react';
import type { StoryCard as StoryCardT } from '@/content/types';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { SacredArt } from '@/components/SacredArt';
import { RichText } from '@/components/GlossaryTerm';
import { SpeakerButton } from '@/components/SpeakerButton';

export function StoryCardView({ card, onDone }: { card: StoryCardT; onDone: () => void }) {
  const { t, lang, save } = useI18n();
  const [chosen, setChosen] = useState<number | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const branch = card.branch;

  // The full spoken form of the card: the story, then the verse in plain words.
  const spoken = [
    t(card.text),
    card.scripture ? `${t(card.scripture.verse)}. ${t(card.scripture.plain)}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="page-in flex h-full flex-col" key={card.id}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <SacredArt kind={card.art} rounded={false} />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-lapis via-lapis/70 to-transparent" />
      </div>

      <div className="-mt-16 relative z-10 flex flex-col gap-4 px-6 pb-6">
        <div className="flex items-start gap-3">
          <p className="flex-1 font-story text-[1.45rem] leading-relaxed text-ivory">
            <RichText text={t(card.text)} />
          </p>
          <SpeakerButton id={`card-${card.id}-${lang}`} text={spoken} autoStart={save.narrate} />
        </div>

        {card.scripture && (
          <div className="rounded-2xl border border-gold/25 bg-lapis/80 p-4">
            <p className="font-story text-xl italic leading-relaxed text-gold">
              “{t(card.scripture.verse)}”
            </p>
            <p className="mt-1 text-xs text-incense">
              {card.scripture.ref} · {t(UI.simplifiedRendering)}
            </p>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-incense">
              {t(UI.inPlainWords)}
            </p>
            <p className="mt-1 font-story text-lg leading-relaxed text-ivory">
              {t(card.scripture.plain)}
            </p>
            {card.scripture.bridge && (
              <p className="mt-2 font-story text-lg italic leading-relaxed text-ivory/80">
                {t(card.scripture.bridge)}
              </p>
            )}
            {card.scripture.original && (
              <button
                onClick={() => setShowOriginal((s) => !s)}
                className="mt-3 text-xs font-semibold text-incense underline underline-offset-4"
              >
                {t(UI.originalBeauty)}
              </button>
            )}
            {card.scripture.original && showOriginal && (
              <p className="mt-2 font-story text-base italic text-incense">{card.scripture.original}</p>
            )}
          </div>
        )}

        {branch && (
          <div className="rounded-2xl border border-ivory/15 bg-lapis/80 p-4">
            <p className="font-story text-lg italic text-ivory/90">{t(branch.prompt)}</p>
            {chosen === null ? (
              <div className="mt-3 flex flex-col gap-2">
                {branch.choices.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setChosen(i)}
                    className="min-h-[48px] rounded-xl border border-gold/40 px-4 py-3 text-left font-ui text-sm font-semibold text-gold"
                  >
                    {t(c.label)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="gold-glow mt-3 rounded-xl bg-gold/10 p-3 font-story text-lg leading-relaxed text-ivory">
                {t(branch.choices[chosen].response)}
              </p>
            )}
          </div>
        )}

        <button
          onClick={onDone}
          disabled={!!branch && chosen === null}
          className="min-h-[56px] rounded-2xl bg-gold font-ui text-base font-bold text-lapis disabled:opacity-40"
        >
          {t(UI.continueWord)}
        </button>
      </div>
    </div>
  );
}
