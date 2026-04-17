import type { Metadata } from 'next';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingValueStrip } from '@/components/landing/LandingValueStrip';
import { LandingCTAs } from '@/components/landing/LandingCTAs';
import { LandingReleaseStrip } from '@/components/landing/LandingReleaseStrip';
import { LandingFooter } from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'KyberStation — Universal Saber Style Engine',
  description:
    'A visual editor for lightsaber blade styles. Design, simulate, and export Proffieboard-compatible ProffieOS code without trial-and-error compiles.',
  openGraph: {
    title: 'KyberStation — Universal Saber Style Engine',
    description:
      'Design, preview, and export lightsaber blade styles for Proffieboard. A visual editor with motion sim, audio sync, and ProffieOS code generation.',
    type: 'website',
  },
};

export default function LandingPage() {
  return (
    <main id="main-content" className="min-h-screen">
      <LandingHero />
      <LandingCTAs />
      <LandingValueStrip />
      <LandingReleaseStrip />
      <LandingFooter />
    </main>
  );
}
