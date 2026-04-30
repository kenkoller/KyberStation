import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { ScrollReveal } from '@/components/marketing/ScrollReveal';
import { pageMetadata } from '@/lib/marketing/pageMetadata';
import { loadChangelog } from '@/lib/marketing/changelogParser';

export const metadata = pageMetadata({
  title: 'Changelog',
  description:
    'Release notes for KyberStation — every version since v0.1.0, including v1.0 launch posture, modulation routing, and saber GIF infrastructure.',
  path: '/changelog',
});

export default function ChangelogPage() {
  const releases = loadChangelog();

  return (
    <main id="main-content" className="min-h-screen flex flex-col">
      <MarketingHeader active="changelog" />

      <section
        className="relative border-b border-border-subtle py-16 md:py-20"
        aria-labelledby="changelog-page-heading"
      >
        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center">
          <ScrollReveal>
            <div
              className="font-mono text-xs tracking-widest mb-4 tabular-nums"
              style={{ color: 'rgb(var(--accent))' }}
            >
              RELEASE / NOTES
            </div>
            <h1
              className="font-cinematic text-3xl md:text-5xl tracking-[0.08em] font-semibold uppercase text-text-primary mb-5"
              id="changelog-page-heading"
            >
              Changelog
            </h1>
            <p className="font-sans text-[15px] md:text-base leading-relaxed text-text-secondary max-w-2xl mx-auto">
              Every release of KyberStation, oldest version to most
              recent. Mirrors the{' '}
              <a
                href="https://github.com/kenkoller/KyberStation/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
              >
                CHANGELOG.md
              </a>{' '}
              on GitHub.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="flex-1 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          {releases.length === 0 ? (
            <p className="font-sans text-text-muted text-center text-[14px]">
              Changelog is unavailable in this environment. View the
              full history on{' '}
              <a
                href="https://github.com/kenkoller/KyberStation/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
              >
                GitHub
              </a>
              .
            </p>
          ) : (
            <nav
              aria-label="Release jump-links"
              className="mb-12 md:mb-16 flex flex-wrap items-center gap-2"
            >
              <span
                className="font-mono text-[10px] tracking-widest uppercase tabular-nums text-text-muted mr-2"
                aria-hidden="true"
              >
                JUMP TO:
              </span>
              {releases.slice(0, 10).map((release) => (
                <a
                  key={release.anchor}
                  href={`#${release.anchor}`}
                  className="font-mono text-[12px] tracking-widest tabular-nums px-2 py-1 transition-colors hover:text-accent"
                  style={{
                    color: 'rgb(var(--text-secondary))',
                    border: '1px solid rgb(var(--border-subtle))',
                    borderRadius: 'var(--r-chrome, 2px)',
                  }}
                >
                  v{release.version}
                </a>
              ))}
            </nav>
          )}

          <div className="space-y-12 md:space-y-16">
            {releases.map((release) => (
              <article
                key={release.anchor}
                id={release.anchor}
                className="changelog-entry scroll-mt-24"
              >
                <header className="mb-5 pb-3 border-b border-border-subtle flex items-baseline justify-between gap-3 flex-wrap">
                  <h2 className="font-cinematic text-xl md:text-2xl tracking-[0.08em] font-semibold uppercase text-text-primary">
                    v{release.version}
                  </h2>
                  <span className="font-mono text-[12px] tracking-widest tabular-nums text-text-muted">
                    {release.date}
                  </span>
                </header>
                <div
                  className="changelog-body font-sans text-[14px] leading-relaxed text-text-secondary"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: release.bodyHtml }}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
