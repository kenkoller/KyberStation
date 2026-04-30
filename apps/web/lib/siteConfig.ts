/**
 * Single source of truth for the public site identity. Used by
 * sitemap.ts, robots.ts, and any future page metadata helpers.
 *
 * Override the base URL for preview / staging deploys via the
 * NEXT_PUBLIC_SITE_URL env var (Vercel preview deploys, local dev).
 */
export const siteConfig = {
  /**
   * Canonical production origin. Override via NEXT_PUBLIC_SITE_URL
   * for preview deploys so OG tags point at the preview, not prod.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://kyberstation.com',
  name: 'KyberStation',
  tagline: 'Universal Saber Style Engine',
  description:
    'A visual editor for lightsaber blade styles. Design, simulate, and export Proffieboard-compatible ProffieOS code without trial-and-error compiles.',
  /**
   * Social preview image. 1200×630 OG hero rendered by
   * `scripts/generate-og-hero.mjs` — runs offline using node-canvas.
   * Re-run that script if the wordmark or saber composition changes.
   */
  ogImage: '/og-hero.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  author: 'Ken Koller',
  github: 'https://github.com/kenkoller/KyberStation',
} as const;

export type SiteConfig = typeof siteConfig;
