'use client';

// A gentle, dismissible invitation to install the app to the home screen.
// On Android/Chrome it triggers the real install prompt; on iPhone it shows
// the two-step Share → Add to Home Screen path (iOS has no install event).
// Hidden once installed, once dismissed, or where installation isn't offered.

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';

const DISMISS_KEY = 'pilgrimage.install.dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS never fires the event, so offer the manual path there.
    if (isIOS()) setShow(true);

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      dismiss();
    } else {
      setIosHint((v) => !v); // tap reveals the iPhone instructions
    }
  };

  return (
    <div className="rounded-3xl border border-gold/40 bg-gradient-to-b from-gold/10 to-transparent p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lapis">
          <svg viewBox="0 0 60 80" className="h-7 w-6" aria-hidden>
            <path d="M30 8c12 16 18 26 18 36a18 18 0 0 1-36 0c0-10 6-20 18-36z" fill="#D9A441" className="flame" />
            <rect x="22" y="40" width="16" height="34" rx="3" fill="#F3ECDD" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base text-ivory">{t(UI.installTitle)}</p>
          <p className="text-xs leading-snug text-incense">{t(UI.installBody)}</p>
        </div>
      </div>

      {iosHint && (
        <p className="mt-3 rounded-2xl bg-lapis/60 p-3 font-story text-base leading-relaxed text-ivory">
          {t(UI.installIosHint)}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={install}
          className="min-h-[44px] flex-1 rounded-xl bg-gold font-ui text-sm font-bold text-lapis"
        >
          {deferred ? t(UI.installButton) : t(UI.installHow)}
        </button>
        <button
          onClick={dismiss}
          className="min-h-[44px] rounded-xl border border-ivory/20 px-4 font-ui text-sm font-semibold text-incense"
        >
          {t(UI.installLater)}
        </button>
      </div>
    </div>
  );
}
