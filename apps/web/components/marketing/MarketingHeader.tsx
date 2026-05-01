import Link from 'next/link';

interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/features', label: 'Features' },
  { href: '/showcase', label: 'Showcase' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/community', label: 'Community' },
  { href: '/faq', label: 'FAQ' },
] as const;

interface MarketingHeaderProps {
  /** Slug of the page that's currently active (e.g. "features"). */
  active?: 'features' | 'showcase' | 'changelog' | 'community' | 'faq';
}

/**
 * Shared header for marketing pages (`/features`, `/showcase`,
 * `/changelog`, `/community`, `/faq`). The landing route (`/`) renders
 * its own inline hero instead.
 *
 * Visual language: matches the landing — Orbitron wordmark on the
 * left, four sub-route nav links + an "Open Editor" CTA on the right.
 * Mobile collapses the sub-route links into a horizontal scroll row
 * directly under the wordmark.
 */
export function MarketingHeader({ active }: MarketingHeaderProps) {
  return (
    <header
      className="relative border-b border-border-subtle"
      role="banner"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-4 md:py-5 flex flex-col md:flex-row gap-4 md:gap-6 md:items-center md:justify-between">
        <Link
          href="/"
          aria-label="KyberStation home"
          className="font-cinematic text-lg md:text-xl tracking-[0.16em] text-text-primary hover:text-accent transition-colors"
        >
          KYBERSTATION
        </Link>

        <nav
          aria-label="Marketing navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 md:gap-x-6"
        >
          {NAV_LINKS.map((link) => {
            const slug = link.href.slice(1);
            const isActive = active === slug;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className="font-sans text-[13px] tracking-[0.12em] uppercase transition-colors"
                style={{
                  color: isActive
                    ? 'rgb(var(--accent))'
                    : 'rgb(var(--text-secondary))',
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/editor"
            aria-label="Open KyberStation editor"
            className="font-sans text-[13px] tracking-[0.18em] uppercase px-4 py-1.5 transition-colors"
            style={{
              background: 'rgb(var(--accent) / 0.10)',
              border: '1px solid rgb(var(--accent) / 0.45)',
              color: 'rgb(var(--accent))',
              borderRadius: 'var(--r-chrome, 2px)',
            }}
          >
            Open Editor
          </Link>
        </nav>
      </div>
    </header>
  );
}
