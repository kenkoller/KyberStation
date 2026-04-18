import { LATEST_VERSION, LATEST_CODENAME, LATEST_DATE } from '@/lib/version';

const REPO_RELEASES_URL =
  'https://github.com/kenkoller/KyberStation/releases';

export function LandingReleaseStrip() {
  return (
    <section className="border-t border-border-subtle py-6">
      <div className="max-w-6xl mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="dot-matrix tabular-nums flex flex-wrap items-center gap-x-3 gap-y-1 justify-center md:justify-start">
          <span>v{LATEST_VERSION}</span>
          <span className="text-text-muted">·</span>
          <span>{LATEST_CODENAME}</span>
          <span className="text-text-muted">·</span>
          <span>{LATEST_DATE}</span>
        </div>
        <a
          href={REPO_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="dot-matrix hover:text-text-primary transition-colors"
          style={{ color: 'rgb(var(--accent) / 0.8)' }}
        >
          RELEASE NOTES →
        </a>
      </div>
    </section>
  );
}
