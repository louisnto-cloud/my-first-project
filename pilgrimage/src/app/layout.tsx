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

export const metadata: Metadata = {
  title: 'The Pilgrimage',
  description: 'A quiet road through places you have stood.',
  manifest: './manifest.webmanifest',
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
