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
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={install}
          className="flex min-h-[44px] flex-1 items-center gap-2 text-left font-ui text-sm font-semibold text-gold"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
            <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {deferred ? t(UI.installTitle) : t(UI.installHow)}
        </button>
        <button
          onClick={dismiss}
          aria-label={t(UI.installLater)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-incense"
        >
          ✕
        </button>
      </div>
      {iosHint && (
        <p className="mt-2 rounded-2xl bg-ivory/[0.04] p-3 font-story text-base leading-relaxed text-ivory/90">
          {t(UI.installIosHint)}
        </p>
      )}
    </div>
  );
}
