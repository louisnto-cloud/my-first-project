'use client';

// A small speaker that reads its text aloud, on device. Tapping toggles it;
// when `autoStart` is on (the narration setting), it begins as the card opens.
// Renders nothing if the platform has no speech support.

import { useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { narrate, narrationSupported, stopNarration, useNarrator } from '@/lib/speech';

export function SpeakerButton({
  id,
  text,
  autoStart = false,
}: {
  id: string;
  text: string;
  autoStart?: boolean;
}) {
  const { t, lang } = useI18n();
  const { speaking } = useNarrator();
  const isSpeaking = speaking === id;
  const started = useRef<string | null>(null);

  // Auto-narrate once per card when the setting is on. Keyed by id so each new
  // card re-triggers, but re-renders of the same card do not.
  useEffect(() => {
    if (autoStart && narrationSupported() && started.current !== id) {
      started.current = id;
      narrate(id, text, lang, { cue: true });
    }
    // Stop any narration when leaving this card.
    return () => {
      if (started.current === id) stopNarration();
    };
  }, [id, text, lang, autoStart]);

  if (!narrationSupported()) return null;

  return (
    <button
      onClick={() => (isSpeaking ? stopNarration() : narrate(id, text, lang))}
      aria-label={t(isSpeaking ? UI.narrateStop : UI.narratePlay)}
      aria-pressed={isSpeaking}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
        isSpeaking ? 'border-gold bg-gold/15 text-gold' : 'border-ivory/20 text-incense'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M4 9v6h4l5 5V4L8 9H4z" />
        {isSpeaking ? (
          // sound waves while reading
          <path
            d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="soft-glow"
          />
        ) : (
          <path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
