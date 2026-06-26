'use client';

// Story text may contain {{term-id}} markers. They render with a soft dotted
// underline; one tap opens a plain-English meaning plus the Vietnamese.

import { useState } from 'react';
import { glossaryById } from '@/content/glossary';
import { useI18n } from '@/lib/i18n';

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
        <span
          className="absolute bottom-full left-1/2 z-30 mb-2 block w-64 -translate-x-1/2 rounded-xl border border-gold/30 bg-lapis p-3 font-ui text-sm font-normal not-italic leading-snug text-ivory shadow-xl"
          onClick={() => setOpen(false)}
        >
          <span className="block">{t(entry.plain)}</span>
          <span className="mt-1 block text-incense">
            {lang === 'vi' ? entry.term : entry.vi}
          </span>
        </span>
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
