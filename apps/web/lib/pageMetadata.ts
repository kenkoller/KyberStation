import type { Metadata } from 'next';
import { siteConfig } from './siteConfig';

interface PageMetadataInput {
  /** Page-specific title; wrapped as "<title> — KyberStation" unless full=true. */
  title: string;
  /** Meta description. Should be 120–160 characters for ideal SEO. */
  description: string;
  /** Relative path from site root, e.g. '/features'. Used for canonical + og:url. */
  path: string;
  /** If true, use `title` verbatim without the " — KyberStation" suffix. */
  full?: boolean;
  /** Additional keywords for search engines (optional, low impact). */
  keywords?: ReadonlyArray<string>;
}

/**
 * Builds a consistent Metadata object for a marketing page — canonical
 * URL, OpenGraph, and Twitter card tags with project-wide defaults.
 *
 * Usage:
 *   export const metadata = pageMetadata({
 *     title: 'Features',
 *     description: '...',
 *     path: '/features',
 *   });
 */
export function pageMetadata({
  title,
  description,
  path,
  full = false,
  keywords,
}: PageMetadataInput): Metadata {
  const fullTitle = full ? title : `${title} — ${siteConfig.name}`;
  const url = `${siteConfig.url}${path}`;
  const imageUrl = `${siteConfig.url}${siteConfig.ogImage}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      type: 'website',
      images: [
        {
          url: imageUrl,
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
      images: [imageUrl],
    },
  };
}
