import type { Metadata } from 'next';
import { siteConfig } from '@/lib/siteConfig';

interface PageMetadataInput {
  /** Short page title appended after "KyberStation —". */
  title: string;
  /** 1-2 sentence description used by SEO + OG. */
  description: string;
  /** Path under siteConfig.url, e.g. "/features". */
  path: string;
}

/**
 * Build a uniform Next.js `Metadata` block for marketing sub-routes.
 *
 * - `title` is composed as `KyberStation — <title>`
 * - `openGraph` reuses `siteConfig.ogImage` (1200×630)
 * - `alternates.canonical` is wired so SEO crawlers point at production
 *
 * Override the base URL via `NEXT_PUBLIC_SITE_URL` for preview deploys
 * (already documented in `siteConfig.ts`).
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const { title, description, path } = input;
  const fullTitle = `${siteConfig.name} — ${title}`;
  const canonical = new URL(path, `${siteConfig.url}/`).toString();

  return {
    title: fullTitle,
    description,
    alternates: { canonical },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      type: 'website',
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: siteConfig.ogImageWidth,
          height: siteConfig.ogImageHeight,
          alt: `${siteConfig.name} — ${siteConfig.tagline}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [siteConfig.ogImage],
    },
  };
}
