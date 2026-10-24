'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { BottomNav } from '@/components/BottomNav';

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

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Registered with an absolute path so it works from nested routes and
      // under a hosting subpath alike.
      navigator.serviceWorker
        .register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/sw.js`)
        .catch(() => {
          // Offline support is progressive; the app works without it.
        });
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <svg viewBox="0 0 60 80" className="h-16 w-12 opacity-80">
          <path d="M30 4c10 13 15 22 15 30a15 15 0 0 1-30 0c0-8 5-17 15-30z" fill="#D9A441" className="flame" />
          <rect x="22" y="40" width="16" height="34" rx="3" fill="#F3ECDD" opacity="0.9" />
        </svg>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-page flex-col">
      <main className="flex-1 pb-24">{children}</main>
      {!inLesson && !inOnboarding && <BottomNav />}
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
