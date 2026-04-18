import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import './globals.css';

// UX North Star §6 — Inter for chrome + labels, JetBrains Mono for all data /
// numerics / code / identifiers / ceremonial display at 80–120px. No third
// typeface. Loaded via next/font for CLS-safe self-hosting.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'KyberStation — Lightsaber Style Editor',
  description:
    'Universal Saber Style Engine — Design, preview, and export lightsaber blade styles',
  manifest: '/manifest.json',
  // Favicon + apple-touch-icon provided via Next's file-based convention:
  // apps/web/app/icon.svg + apps/web/app/apple-icon.svg.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KyberStation',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetBrainsMono.variable}`}>
      <head>
        {process.env.NODE_ENV === 'production' && (
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; worker-src 'self' blob:"
          />
        )}
      </head>
      <body className="bg-bg-primary text-text-primary font-sans antialiased min-h-screen phone:pb-[calc(56px+env(safe-area-inset-bottom))]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded">
          Skip to main content
        </a>
        {children}
        <MobileTabBar />
      </body>
    </html>
  );
}
