import type { Metadata, Viewport } from 'next';
import '@fontsource/cinzel/600.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/nunito-sans/400.css';
import '@fontsource/nunito-sans/600.css';
import '@fontsource/nunito-sans/700.css';
import './globals.css';
import { AppShell } from '@/components/AppShell';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'The Pilgrimage',
  description: 'A quiet pilgrimage through the world’s holy places.',
  manifest: `${base}/manifest.webmanifest`,
  applicationName: 'The Pilgrimage',
  // Makes iOS "Add to Home Screen" launch full-screen with a dark status bar
  // and the proper title, just like a native app.
  appleWebApp: {
    capable: true,
    title: 'Pilgrimage',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: `${base}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
  // Legacy iOS flag for full-screen launch on older Safari versions; Next emits
  // only the modern `mobile-web-app-capable`, so add this one by hand.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: '#1C2647',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-ui antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
