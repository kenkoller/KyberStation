// ─── MarketingFooter <-> MarketingHeader drift sentinel ───────────────────
//
// Catches the bug shape that PR #219 introduced (added /community to
// NAV_LINKS but forgot to add it to PRIMARY_LINKS). Every internal
// marketing route in NAV_LINKS must also appear in PRIMARY_LINKS so the
// footer surfaces the full marketing index.
//
// External links + non-marketing routes (/editor, /gallery, /docs, repo,
// issues, etc.) are footer-only — those are not part of the drift check.

import { describe, it, expect } from 'vitest';
import { NAV_LINKS } from '@/components/marketing/MarketingHeader';
import { PRIMARY_LINKS } from '@/components/marketing/MarketingFooter';

describe('MarketingFooter / MarketingHeader drift sentinel', () => {
  it('every NAV_LINKS href appears in PRIMARY_LINKS', () => {
    const footerHrefs = new Set(PRIMARY_LINKS.map((l) => l.href));
    for (const navLink of NAV_LINKS) {
      expect(
        footerHrefs.has(navLink.href),
        `MarketingHeader has "${navLink.label}" (${navLink.href}) but ` +
          `MarketingFooter PRIMARY_LINKS does not. Add it to keep the ` +
          `header + footer marketing-route lists in sync.`,
      ).toBe(true);
    }
  });

  it('every NAV_LINKS label matches PRIMARY_LINKS label for the same href', () => {
    const footerByHref = new Map(PRIMARY_LINKS.map((l) => [l.href, l.label]));
    for (const navLink of NAV_LINKS) {
      const footerLabel = footerByHref.get(navLink.href);
      expect(
        footerLabel,
        `Footer is missing label for ${navLink.href}`,
      ).toBeDefined();
      expect(
        footerLabel,
        `Footer label mismatch for ${navLink.href}: header says ` +
          `"${navLink.label}", footer says "${footerLabel}"`,
      ).toBe(navLink.label);
    }
  });

  it('PRIMARY_LINKS preserves NAV_LINKS relative order', () => {
    // Filter PRIMARY_LINKS down to entries also in NAV_LINKS, then assert
    // the sequence matches. Footer-only entries (external, /editor, etc.)
    // can sit anywhere in PRIMARY_LINKS without breaking this check.
    const navHrefs = new Set(NAV_LINKS.map((l) => l.href));
    const footerNavOrder = PRIMARY_LINKS.filter((l) => navHrefs.has(l.href)).map(
      (l) => l.href,
    );
    const headerOrder = NAV_LINKS.map((l) => l.href);
    expect(footerNavOrder).toEqual(headerOrder);
  });

  it('marketing routes are internal (no `external: true`) in PRIMARY_LINKS', () => {
    const navHrefs = new Set(NAV_LINKS.map((l) => l.href));
    for (const link of PRIMARY_LINKS) {
      if (navHrefs.has(link.href)) {
        expect(
          link.external,
          `${link.href} is a marketing route — must not be marked external`,
        ).not.toBe(true);
      }
    }
  });
});
