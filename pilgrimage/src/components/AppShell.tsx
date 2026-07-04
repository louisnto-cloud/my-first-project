'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { BottomNav } from '@/components/BottomNav';
import { Companion } from '@/components/Companion';
import { startAmbient, stopAmbient } from '@/lib/ambient';

function Shell({ children }: { children: React.ReactNode }) {
  const { save } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  // Progress, language, and dates all live in localStorage, so the app is
  // client-rendered after mount; until then, a quiet candle holds the screen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Immersive experiences own the full screen; navigation hides there so each
  // can be completed one-handed without distraction.
  const inLesson =
    pathname.startsWith('/lesson') || pathname.startsWith('/mass') || pathname.startsWith('/rosary');
  const inOnboarding = pathname.startsWith('/onboarding');

  useEffect(() => {
    if (!save.onboarded && !inOnboarding) router.replace('/onboarding');
  }, [save.onboarded, inOnboarding, router]);

  // Ambient chant: start on the first user gesture (browser autoplay policy),
  // pause when the tab is hidden (saves battery), resume on return.
  useEffect(() => {
    if (!save.ambient) { stopAmbient(); return; }
    const tryStart = () => startAmbient();
    document.addEventListener('click', tryStart, { once: true, capture: true });
    document.addEventListener('touchstart', tryStart, { once: true, capture: true });
    const onVisible = () => { if (!document.hidden && save.ambient) startAmbient(); else stopAmbient(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('click', tryStart, { capture: true });
      document.removeEventListener('touchstart', tryStart, { capture: true });
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [save.ambient]);

  // A new version of the app is ready — offer one tap to step into it.
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Only a page that already had a controller is *updating*; a first visit
    // gaining its first controller must not see the refresh nudge.
    const hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (hadController) setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let recheck: ReturnType<typeof setInterval> | null = null;
    const onVisible = () => {
      if (!document.hidden) {
        void navigator.serviceWorker.getRegistration().then((r) => r?.update());
      }
    };
    // Registered with an absolute path so it works from nested routes and
    // under a hosting subpath alike.
    navigator.serviceWorker
      .register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/sw.js`)
      .then((reg) => {
        // Look for a newer build when the app comes back to the foreground,
        // and every half hour while it stays open.
        document.addEventListener('visibilitychange', onVisible);
        recheck = setInterval(() => void reg.update(), 30 * 60 * 1000);
      })
      .catch(() => {
        // Offline support is progressive; the app works without it.
      });
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
      if (recheck) clearInterval(recheck);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="pt-safe flex min-h-dvh items-center justify-center">
        <svg viewBox="0 0 60 80" className="h-16 w-12 opacity-80">
          <path d="M30 4c10 13 15 22 15 30a15 15 0 0 1-30 0c0-8 5-17 15-30z" fill="#D9A441" className="flame" />
          <rect x="22" y="40" width="16" height="34" rx="3" fill="#F3ECDD" opacity="0.9" />
        </svg>
      </div>
    );
  }

  // Scrolling pages (Today/Road/Chapel) get the top inset + room for the nav.
  // Immersive full-screen pages keep the true viewport height and clear the
  // notch via their own header (.pt-safe-bar), so their 100dvh math holds.
  const immersive = inLesson || inOnboarding;
  return (
    <div className="mx-auto flex min-h-dvh max-w-page flex-col">
      <main className={immersive ? 'flex-1' : 'pt-safe pb-nav flex-1'}>{children}</main>
      {!immersive && <BottomNav />}
      {/* The guide's presence: a glow while it reads, on every screen but setup. */}
      {!inOnboarding && <Companion />}
      {updateReady && <UpdateToast onRefresh={() => window.location.reload()} />}
    </div>
  );
}

// A quiet card above the nav: the app has a newer build waiting; one tap
// steps into it. Dismissible — never nags, never auto-reloads mid-reading.
function UpdateToast({ onRefresh }: { onRefresh: () => void }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-6" role="status" aria-live="polite">
      <div className="veil-in flex w-full max-w-page items-center gap-3 rounded-2xl border border-gold/30 bg-lapis/95 px-4 py-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <p className="min-w-0 flex-1 text-sm text-ivory">{t(UI.updateReady)}</p>
        <button
          onClick={onRefresh}
          className="shrink-0 rounded-xl bg-gold px-4 py-2 font-ui text-sm font-bold text-lapis"
        >
          {t(UI.updateAction)}
        </button>
        <button
          onClick={() => setHidden(true)}
          aria-label={t(UI.updateLater)}
          className="shrink-0 p-1 text-incense"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
            <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19l1.4-1.4L13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <Shell>{children}</Shell>
    </I18nProvider>
  );
}
