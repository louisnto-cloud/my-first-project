'use client';

// ─── The guide's presence ────────────────────────────────────────────────────
// A soft band of light along the top edge of the screen that breathes while the
// voice is reading — the way Siri glows — so you always feel the companion is
// there and speaking, on any screen, without a button to get in the way.
// It is purely ambient: tap the speaker on the page itself to stop or replay.

import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { narrationSupported, useNarrator } from '@/lib/speech';
import { duckAmbient } from '@/lib/ambient';

export function Companion() {
  const { t, save } = useI18n();
  const { speaking } = useNarrator();

  // Duck the background chant when the guide's voice is reading.
  useEffect(() => { duckAmbient(!!speaking); }, [speaking]);

  if (!narrationSupported() || !save.narrate || !speaking) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
    >
      {/* the breathing band of light */}
      <div className="guide-glow h-[3px] w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
      {/* a quiet word, tucked just under the notch, so it never blocks content */}
      <span className="absolute top-[calc(env(safe-area-inset-top)+6px)] flex items-center gap-2 rounded-full bg-lapis/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold backdrop-blur-sm">
        <span className="guide-eq" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {t(UI.guideReading)}
      </span>
    </div>
  );
}
