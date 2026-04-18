import { ALL_PRESETS } from '@kyberstation/presets';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHero } from '@/components/marketing/MarketingHero';
import { ShowcaseGrid } from '@/components/marketing/ShowcaseGrid';
import { pageMetadata } from '@/lib/pageMetadata';

export const metadata = pageMetadata({
  title: 'Showcase',
  description: `Browse the full KyberStation preset library — ${ALL_PRESETS.length} character-accurate and creative blade configurations you can open directly in the editor.`,
  path: '/showcase',
  keywords: [
    'lightsaber presets',
    'proffieboard presets',
    'jedi',
    'sith',
    'star wars saber',
    'custom saber',
  ],
});

export default function ShowcasePage() {
  const screenAccurateCount = ALL_PRESETS.filter((p) => p.screenAccurate).length;

  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="01 / PRESET LIBRARY"
        title="Showcase"
        subtitle={`${ALL_PRESETS.length} curated presets across the Prequel, Original, Sequel, Animated, and Expanded-Universe eras. ${screenAccurateCount} are graded against film reference frames.`}
      />
      <ShowcaseGrid presets={ALL_PRESETS} />
    </MarketingShell>
  );
}
