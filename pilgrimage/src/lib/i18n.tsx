'use client';

// ─── i18n: every string is a paired {en, vi} record ─────────────────────────
// The toggle is instant, offline, and free. No live translation APIs: sacred
// vocabulary is controlled by the locked terminology table in content/.

import React, { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import type { L } from '@/content/types';
import { getSave, subscribe, updateSave, type Lang, type SaveDoc } from '@/lib/storage';

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Resolve a localized string for the current language. */
  t: (s: L) => string;
  save: SaveDoc;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const save = useSyncExternalStore(subscribe, getSave, getSave);
  const lang = save.lang;

  // Keep the document's language honest for screen readers, hyphenation,
  // and the browser's own text-to-speech when the user switches languages.
  useEffect(() => {
    document.documentElement.lang = lang === 'vi' ? 'vi' : 'en';
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    updateSave({ lang: l });
  }, []);

  const t = useCallback(
    (s: L) => (lang === 'vi' && s.vi ? s.vi : s.en),
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t, save }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
