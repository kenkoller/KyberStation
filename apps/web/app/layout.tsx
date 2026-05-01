import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Orbitron, Exo_2 } from 'next/font/google';
import localFont from 'next/font/local';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import './globals.css';

// UX North Star §5/§6/§8 — Inter (chrome + labels), JetBrains Mono (data /
// numerics / code / identifiers), Orbitron (cinematic titles, §5 ratified
// third ceremonial face), Exo 2 (SW-body fallback paired with Aurebesh).
// All four self-hosted via next/font for CLS-safe loads.
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

const orbitron = Orbitron({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-orbitron',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const exo2 = Exo_2({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-exo2',
  weight: ['300', '400', '500', '600', '700'],
});

// Aurebesh AF — 4 variants self-hosted via next/font/local so the
// generated @font-face URLs honor `basePath` automatically (the
// previous manual @font-face declarations in globals.css emitted
// root-relative URLs like `/fonts/aurebesh/...` which 404 on the
// `/KyberStation` GitHub Pages deployment — local dev with empty
// basePath worked, production didn't, so the bottom HUD ticker
// silently fell back to monospace in production).
//
// Each variable maps to one variant; `globals.css` resolves
// `--aurebesh-family` to the matching variable based on
// `html.aurebesh-variant-*` and consumers (DataTicker, .sw-aurebesh,
// aurebesh-labels / aurebesh-full immersion modes) read through that
// indirection.
const aurebeshCanon = localFont({
  src: '../public/fonts/aurebesh/AurebeshAF-Canon.otf',
  display: 'swap',
  variable: '--font-aurebesh-canon',
});

const aurebeshCanonTech = localFont({
  src: '../public/fonts/aurebesh/AurebeshAF-CanonTech.otf',
  display: 'swap',
  variable: '--font-aurebesh-canon-tech',
});

const aurebeshLegends = localFont({
  src: '../public/fonts/aurebesh/AurebeshAF-Legends.otf',
  display: 'swap',
  variable: '--font-aurebesh-legends',
});

const aurebeshLegendsTech = localFont({
  src: '../public/fonts/aurebesh/AurebeshAF-LegendsTech.otf',
  display: 'swap',
  variable: '--font-aurebesh-legends-tech',
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
    <html lang="en" className={`dark ${inter.variable} ${jetBrainsMono.variable} ${orbitron.variable} ${exo2.variable} ${aurebeshCanon.variable} ${aurebeshCanonTech.variable} ${aurebeshLegends.variable} ${aurebeshLegendsTech.variable}`}>
      <head>
        {process.env.NODE_ENV === 'production' && (
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; worker-src 'self' blob:"
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
