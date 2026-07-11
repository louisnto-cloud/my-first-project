'use client';

// ─── Onboarding: three screens, that is the entire setup ────────────────────
// 1. Choose English or Vietnamese.  2. Her name and one warm line.
// 3. The map appears and Hanoi glows.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { updateSave } from '@/lib/storage';
import { narrate, narrationSupported, stopNarration } from '@/lib/speech';
import { PilgrimageMap } from '@/components/PilgrimageMap';

// A small, quiet back arrow pinned top-left — every onboarding step can be
// stepped out of; nothing about beginning should feel like a corridor.
function BackDot({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="absolute left-4 top-[calc(env(safe-area-inset-top)+12px)] flex h-11 w-11 items-center justify-center rounded-full text-incense"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z" />
      </svg>
    </button>
  );
}

export default function OnboardingPage() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [name, setName] = useState('');

  // Choosing the voice is also the gesture browsers need to unlock speech, so
  // we speak a warm sample right here — the guide says hello before you walk.
  const chooseVoice = (on: boolean) => {
    updateSave({ narrate: on });
    if (on && narrationSupported()) narrate('onboarding-guide', t(UI.obGuideSample), lang, { cue: true });
    setScreen(3);
  };

  const begin = () => {
    stopNarration();
    updateSave({ name: name.trim(), onboarded: true });
    router.replace('/');
  };

  return (
    <div className="relative flex min-h-dvh flex-col justify-between px-6 pb-10 pt-safe-bar">
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
          <BackDot onClick={() => setScreen(0)} label={t(UI.close)} />
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
          {/* A name is a gift, not a toll — the road opens either way. */}
          <button
            onClick={() => setScreen(2)}
            className="min-h-[60px] rounded-2xl bg-gold font-ui text-lg font-bold text-lapis"
          >
            {name.trim() ? t(UI.obContinue) : t(UI.obSkipName)}
          </button>
        </>
      )}

      {screen === 2 && (
        <>
          <BackDot onClick={() => setScreen(1)} label={t(UI.close)} />
          <div className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
            {/* a small mouth-of-light: the voice about to speak */}
            <svg viewBox="0 0 80 80" className="h-24 w-24" aria-hidden>
              <defs>
                <radialGradient id="ob-voice" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#D9A441" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#D9A441" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="40" cy="40" r="38" fill="url(#ob-voice)" className="soft-glow" />
              <g fill="none" stroke="#F3ECDD" strokeWidth="3" strokeLinecap="round">
                <path d="M26 34v12" />
                <path d="M34 28v24" className="soft-glow" />
                <path d="M42 32v16" />
                <path d="M50 26v28" className="soft-glow" />
                <path d="M58 34v12" />
              </g>
            </svg>
            <h1 className="font-display text-2xl text-ivory">{t(UI.obGuideTitle)}</h1>
            <p className="max-w-sm font-story text-xl italic leading-relaxed text-incense">
              {t(UI.obGuideBody)}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => chooseVoice(true)}
              className="min-h-[60px] rounded-2xl bg-gold font-ui text-lg font-bold text-lapis"
            >
              {t(UI.obGuideYes)}
            </button>
            <button
              onClick={() => chooseVoice(false)}
              className="min-h-[56px] rounded-2xl border border-ivory/20 font-ui text-base font-semibold text-incense"
            >
              {t(UI.obGuideNo)}
            </button>
          </div>
        </>
      )}

      {screen === 3 && (
        <>
          <BackDot onClick={() => setScreen(2)} label={t(UI.close)} />
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
