import type { Metadata, Viewport } from 'next';
import { Fraunces, Figtree } from 'next/font/google';
import { ServiceWorker } from '@/components/ServiceWorker';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display-face', weight: ['500', '600', '700'] });
const sans = Figtree({ subsets: ['latin'], variable: '--font-sans-face' });

export const metadata: Metadata = {
  title: 'Oasis — a hex-tile strategy game',
  description: 'Surround the other Pharaoh. A two-player tile strategy game to play with family online, on one device, or against the computer.',
  applicationName: 'Oasis',
  appleWebApp: { capable: true, title: 'Oasis', statusBarStyle: 'default' },
  openGraph: { title: 'Oasis', description: 'Join my game of Oasis!', type: 'website' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FBF6EC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
