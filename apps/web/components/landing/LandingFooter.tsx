const REPO_URL = 'https://github.com/kenkoller/KyberStation';
const ISSUES_URL = 'https://github.com/kenkoller/KyberStation/issues';

export function LandingFooter() {
  return (
    <footer className="border-t border-border-subtle py-10 md:py-12">
      <div className="max-w-6xl mx-auto px-6 md:px-8 space-y-4 text-center text-text-muted">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-secondary transition-colors"
          >
            GitHub
          </a>
          <span aria-hidden="true" className="text-text-muted/50">
            ·
          </span>
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-secondary transition-colors"
          >
            Issues
          </a>
          <span aria-hidden="true" className="text-text-muted/50">
            ·
          </span>
          <a
            href="/editor"
            className="hover:text-text-secondary transition-colors"
          >
            Editor
          </a>
        </div>

        <p className="text-xs max-w-2xl mx-auto leading-relaxed">
          KyberStation source is MIT-licensed. ProffieOS template reference
          material is GPL-3.0 and is distributed as an aggregate work under the
          terms of that license.
        </p>

        <p className="text-xs max-w-2xl mx-auto leading-relaxed text-text-muted/80">
          ProffieOS and Proffieboard are community projects, not affiliated
          with Lucasfilm Ltd. or The Walt Disney Company. &quot;Lightsaber&quot;
          is a registered trademark of Lucasfilm Ltd. KyberStation is fan-made
          tooling for the Proffieboard hobbyist community.
        </p>
      </div>
    </footer>
  );
}
