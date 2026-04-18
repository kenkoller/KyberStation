import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHero } from '@/components/marketing/MarketingHero';
import { ChangelogMarkdown } from '@/components/marketing/ChangelogMarkdown';
import { loadChangelog } from '@/lib/changelogParser';
import { pageMetadata } from '@/lib/pageMetadata';
import pkg from '../../package.json';

const LATEST_VERSION = pkg.version;
const LATEST_CODENAME = 'Long-tail cleanup';
const LATEST_DATE = '2026-04-17';

export const metadata = pageMetadata({
  title: 'Changelog',
  description:
    'Release history for KyberStation — every feature, fix, and architectural decision, pulled live from CHANGELOG.md.',
  path: '/changelog',
});

// Revalidate once an hour in case CHANGELOG.md updates without a redeploy.
export const revalidate = 3600;

const REPO_CHANGELOG_URL =
  'https://github.com/kenkoller/KyberStation/blob/main/CHANGELOG.md';

export default async function ChangelogPage() {
  const entries = await loadChangelog();

  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="01 / RELEASE HISTORY"
        title="Changelog"
        subtitle={`Currently on v${LATEST_VERSION} — ${LATEST_CODENAME}. Every entry below is pulled straight from CHANGELOG.md at build time.`}
      >
        <a
          href={REPO_CHANGELOG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="dot-matrix inline-flex items-center gap-2 transition-colors"
          style={{ color: 'rgb(var(--accent) / 0.85)' }}
        >
          VIEW ON GITHUB →
        </a>
      </MarketingHero>

      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-8 space-y-10">
          {entries.map((entry) => {
            const isUnreleased = entry.version.toLowerCase() === 'unreleased';
            const isCurrent = entry.version === LATEST_VERSION;
            return (
              <article
                key={entry.version}
                id={`v${entry.version}`}
                className="relative rounded-[2px] p-6 md:p-8"
                style={{
                  background: 'rgb(var(--bg-card))',
                  border: isCurrent
                    ? '1px solid rgb(var(--accent) / 0.35)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-4 mb-4 border-b border-border-subtle">
                  <h2 className="font-cinematic text-xl md:text-2xl tracking-[0.12em] text-text-primary">
                    {isUnreleased ? 'UNRELEASED' : `v${entry.version}`}
                  </h2>
                  {entry.date && (
                    <span className="dot-matrix tabular-nums">
                      {entry.date}
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className="dot-matrix tabular-nums px-2 py-0.5 rounded-[2px]"
                      style={{
                        background: 'rgb(var(--accent) / 0.12)',
                        color: 'rgb(var(--accent))',
                        border: '1px solid rgb(var(--accent) / 0.3)',
                      }}
                    >
                      CURRENT
                    </span>
                  )}
                </header>
                <ChangelogMarkdown source={entry.body} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border-subtle py-10">
        <div className="max-w-3xl mx-auto px-6 text-center dot-matrix tabular-nums space-y-2">
          <div>
            LATEST · v{LATEST_VERSION} · {LATEST_CODENAME} · {LATEST_DATE}
          </div>
          <div className="text-text-muted">
            Semver-compliant · conventional commits · MIT-licensed
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
