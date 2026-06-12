'use client';

// Exactly three destinations, ever: Today, The Road, My Chapel.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';

const tabs = [
  {
    href: '/',
    label: UI.navToday,
    icon: (
      // A small flame: today's step
      <path d="M12 3c2.4 2.6 4.5 5 4.5 8a4.5 4.5 0 0 1-9 0c0-1.2.4-2.3 1-3.4.5 1 1.2 1.7 2 2.1-.3-2.3.3-4.6 1.5-6.7Z" />
    ),
  },
  {
    href: '/road',
    label: UI.navRoad,
    icon: (
      // A winding road of dots toward a hill
      <>
        <circle cx="6" cy="18" r="1.4" />
        <circle cx="10.5" cy="14.5" r="1.4" />
        <circle cx="9" cy="10" r="1.4" />
        <circle cx="13.5" cy="7" r="1.4" />
        <path d="M16 4l2.2 4H18v3h-4V8h-.2L16 4Z" />
      </>
    ),
  },
  {
    href: '/chapel',
    label: UI.navChapel,
    icon: (
      // A chapel arch with a candle inside
      <>
        <path d="M5 20v-8a7 7 0 0 1 14 0v8h-2.5v-8a4.5 4.5 0 0 0-9 0v8H5Z" />
        <rect x="11" y="13" width="2" height="5" rx="0.5" />
        <path d="M12 9.6c.8.9 1.3 1.6 1.3 2.4a1.3 1.3 0 0 1-2.6 0c0-.8.5-1.5 1.3-2.4Z" />
      </>
    ),
  },
];

export function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ivory/10 bg-lapis/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-page items-stretch justify-around">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[56px] min-w-[88px] flex-col items-center justify-center gap-0.5 py-2 ${
                active ? 'text-gold' : 'text-incense'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
                {tab.icon}
              </svg>
              <span className="text-[11px] font-semibold">{t(tab.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
