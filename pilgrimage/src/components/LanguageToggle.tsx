'use client';

import { useI18n } from '@/lib/i18n';

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex overflow-hidden rounded-full border border-ivory/20 text-xs font-bold">
      {(['en', 'vi'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`min-h-[36px] px-3.5 uppercase tracking-wide transition-colors ${
            lang === l ? 'bg-gold text-lapis' : 'text-incense'
          }`}
          aria-pressed={lang === l}
        >
          {l === 'en' ? 'EN' : 'VI'}
        </button>
      ))}
    </div>
  );
}
