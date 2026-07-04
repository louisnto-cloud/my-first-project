'use client';

// Story text may contain {{term-id}} markers. They render with a soft dotted
// underline; one tap opens a plain-English meaning plus the Vietnamese.

import { useState } from 'react';
import { glossaryById } from '@/content/glossary';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { narrate, narrationSupported, spokenParagraphs } from '@/lib/speech';

export function GlossaryTermSpan({ id, fallback }: { id: string; fallback: string }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const entry = glossaryById(id);
  if (!entry) return <>{fallback}</>;

  const label = lang === 'vi' ? entry.vi : entry.term;

  return (
    <span className="relative">
      <button type="button" className="term font-inherit" onClick={() => setOpen((o) => !o)}>
        {label}
      </button>
      {open && (
        <>
          {/* invisible veil: tapping anywhere else lets the word rest again */}
          <span
            className="fixed inset-0 z-20 block cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <span className="veil-in absolute bottom-full left-1/2 z-30 mb-2 block w-64 max-w-[78vw] -translate-x-1/2 rounded-xl border border-gold/30 bg-lapis p-3 font-ui text-sm font-normal not-italic leading-snug text-ivory shadow-xl">
            <span className="flex items-start gap-2">
              <span className="block min-w-0 flex-1">{t(entry.plain)}</span>
              {narrationSupported() && (
                <button
                  type="button"
                  aria-label={t(UI.narratePlay)}
                  onClick={() => narrate(`term-${id}-${lang}`, spokenParagraphs(label, t(entry.plain)), lang)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ivory/20 text-incense"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                    <path d="M4 9v6h4l5 5V4L8 9H4z" />
                    <path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </span>
            <span className="mt-1 block text-incense">
              {lang === 'vi' ? entry.term : entry.vi}
            </span>
          </span>
        </>
      )}
    </span>
  );
}

/** Renders a string, expanding {{term-id}} markers into tappable terms. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\{\{[a-z-]+\}\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{\{([a-z-]+)\}\}$/);
        if (!m) return <span key={i}>{part}</span>;
        return <GlossaryTermSpan key={i} id={m[1]} fallback={m[1]} />;
      })}
    </>
  );
}
