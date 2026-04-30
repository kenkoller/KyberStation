import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { ScrollReveal } from '@/components/marketing/ScrollReveal';
import { ShowcaseGrid } from '@/components/marketing/ShowcaseGrid';
import { pageMetadata } from '@/lib/marketing/pageMetadata';

export const metadata = pageMetadata({
  title: 'Showcase',
  description:
    'A curated selection of saber designs from the KyberStation engine — canonical Jedi/Sith, style showcases, and cross-franchise builds. Click any card to open in the editor.',
  path: '/showcase',
});

export default function ShowcasePage() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col">
      <MarketingHeader active="showcase" />

      <section
        className="relative border-b border-border-subtle py-16 md:py-20"
        aria-labelledby="showcase-page-heading"
      >
        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center">
          <ScrollReveal>
            <div
              className="font-mono text-xs tracking-widest mb-4 tabular-nums"
              style={{ color: 'rgb(var(--accent))' }}
            >
              SHOWCASE / GALLERY
            </div>
            <h1
              className="font-cinematic text-3xl md:text-5xl tracking-[0.08em] font-semibold uppercase text-text-primary mb-5"
              id="showcase-page-heading"
            >
              Sabers worth a closer look
            </h1>
            <p className="font-sans text-[15px] md:text-base leading-relaxed text-text-secondary max-w-2xl mx-auto">
              A hand-picked tour of the engine&apos;s range — canonical
              characters, dedicated style demos, and a few
              cross-franchise builds. Click any card to open the design
              in the editor and make it your own.
            </p>
            <p className="font-sans text-[13px] mt-4 text-text-muted">
              For the full preset library (~300 entries with filters and
              search), open the{' '}
              <Link
                href="/gallery"
                className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
              >
                Gallery
              </Link>
              .
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="flex-1 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <ShowcaseGrid />
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
