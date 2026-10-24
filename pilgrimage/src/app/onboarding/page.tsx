'use client';

// ─── Onboarding: three screens, that is the entire setup ────────────────────
// 1. Choose English or Vietnamese.  2. Her name and one warm line.
// 3. The map appears and Hanoi glows.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { updateSave } from '@/lib/storage';
import { PilgrimageMap } from '@/components/PilgrimageMap';

export default function OnboardingPage() {
  const { t, setLang } = useI18n();
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [name, setName] = useState('');

  const begin = () => {
    updateSave({ name: name.trim(), onboarded: true });
    router.replace('/');
  };

  return (
    <div className="flex min-h-dvh flex-col justify-between px-6 py-10">
      {screen === 0 && (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
            <svg viewBox="0 0 60 80" className="h-20 w-14">
              <path d="M30 4c10 13 15 22 15 30a15 15 0 0 1-30 0c0-8 5-17 15-30z" fill="#D9A441" className="flame" />
              <rect x="22" y="40" width="16" height="34" rx="3" fill="#F3ECDD" opacity="0.9" />
            </svg>
            <h1 className="font-display text-3xl text-ivory">{t(UI.appName)}</h1>
            <p className="font-story text-xl italic text-incense">{t(UI.obChooseLanguage)}</p>
          </div>
          <div className="flex flex-col gap-3">
            {(
              [
                ['en', 'English'],
                ['vi', 'Tiếng Việt'],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                onClick={() => {
                  setLang(code);
                  setScreen(1);
                }}
                className="min-h-[60px] rounded-2xl border border-gold/50 font-ui text-lg font-bold text-gold"
              >
                {label}
              </button>
            ))}
            <p className="text-center text-xs text-incense">{t(UI.obLanguageNote)}</p>
          </div>
        </>
      )}

      {screen === 1 && (
        <>
          <div className="flex flex-1 flex-col justify-center gap-5">
            <h1 className="font-display text-2xl text-ivory">{t(UI.obYourName)}</h1>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(UI.obNamePlaceholder)}
              className="min-h-[56px] rounded-2xl border border-ivory/20 bg-lapis/60 px-4 font-story text-2xl text-ivory placeholder-incense focus:border-gold/60 focus:outline-none"
              autoFocus
            />
            <p className="font-story text-xl italic leading-relaxed text-incense">{t(UI.obWelcomeLine)}</p>
          </div>
          <button
            onClick={() => setScreen(2)}
            disabled={!name.trim()}
            className="min-h-[60px] rounded-2xl bg-gold font-ui text-lg font-bold text-lapis disabled:opacity-40"
          >
            {t(UI.obContinue)}
          </button>
        </>
      )}

      {screen === 2 && (
        <>
          <div className="flex flex-1 flex-col justify-center gap-4">
            <p className="text-center font-story text-xl italic text-incense">{t(UI.obMapLine)}</p>
            <div className="light-bloom">
              <PilgrimageMap onSelect={() => {}} />
            </div>
          </div>
          <button onClick={begin} className="min-h-[60px] rounded-2xl bg-gold font-ui text-lg font-bold text-lapis">
            {t(UI.obBegin)}
          </button>
        </>
      )}
    </div>
  );
}
