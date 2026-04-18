/**
 * Single source of truth for the public site identity. Used by
 * sitemap.ts, robots.ts, and every page's metadata helper.
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
   * Social preview image. 1024×1024 app icon for now — platforms
   * letterbox it fine. Replace with a 1200×630 hero when the OG image
   * pipeline lands.
   */
  ogImage: '/icon-1024.png',
  ogImageWidth: 1024,
  ogImageHeight: 1024,
  author: 'Ken Koller',
  github: 'https://github.com/kenkoller/KyberStation',
} as const;

export type SiteConfig = typeof siteConfig;
