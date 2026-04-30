const REPO_URL = 'https://github.com/kenkoller/KyberStation';
const ISSUES_URL = 'https://github.com/kenkoller/KyberStation/issues';
const FLASH_GUIDE_URL =
  'https://github.com/kenkoller/KyberStation/blob/main/docs/FLASH_GUIDE.md';
const LICENSE_URL =
  'https://github.com/kenkoller/KyberStation/blob/main/LICENSE';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const PRIMARY_LINKS: readonly FooterLink[] = [
  { label: 'GitHub', href: REPO_URL, external: true },
  { label: 'Issues', href: ISSUES_URL, external: true },
  { label: 'Flash Guide', href: FLASH_GUIDE_URL, external: true },
  { label: 'Editor', href: '/editor' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Features', href: '/features' },
  { label: 'Showcase', href: '/showcase' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Docs', href: '/docs' },
  { label: 'License', href: LICENSE_URL, external: true },
] as const;

/**
 * Shared marketing footer. Used by both the landing page and the
 * marketing sub-routes (`/features`, `/showcase`, `/changelog`,
 * `/faq`). Tone matches `docs/LAUNCH_PLAN.md` — humble, clear about
 * the GPL-3.0 ProffieOS aggregate-work boundary, and explicit that
 * nothing here is affiliated with Lucasfilm.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border-subtle py-10 md:py-12">
      <div className="max-w-6xl mx-auto px-6 md:px-8 space-y-4 text-center text-text-muted">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          {PRIMARY_LINKS.map((link, index) => (
            <span
              key={link.href}
              className="flex items-center gap-x-5"
            >
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-secondary transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <a
                  href={link.href}
                  className="hover:text-text-secondary transition-colors"
                >
                  {link.label}
                </a>
              )}
              {index < PRIMARY_LINKS.length - 1 && (
                <span aria-hidden="true" className="text-text-muted/50">
                  ·
                </span>
              )}
            </span>
          ))}
        </div>

        <p className="text-[13px] max-w-2xl mx-auto leading-relaxed text-text-secondary/80">
          KyberStation source is MIT-licensed. ProffieOS template reference
          material is GPL-3.0 and is distributed as an aggregate work under the
          terms of that license.
        </p>

        <p className="text-[13px] max-w-2xl mx-auto leading-relaxed">
          ProffieOS and Proffieboard are community projects, not affiliated
          with Lucasfilm Ltd. or The Walt Disney Company. &quot;Lightsaber&quot;
          is a registered trademark of Lucasfilm Ltd. KyberStation is fan-made
          tooling for the Proffieboard hobbyist community.
        </p>
      </div>
    </footer>
  );
}
