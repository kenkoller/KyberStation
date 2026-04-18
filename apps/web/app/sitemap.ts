import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

/**
 * Generates /sitemap.xml at build time. Next.js picks this up by
 * convention — nothing else needs to import it.
 *
 * Keep this list in sync with the public app routes. The editor and
 * share-link routes are intentionally omitted — they are app surfaces,
 * not indexable marketing pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = siteConfig.url;

  return [
    { url: `${base}/`,          lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/features`,  lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/showcase`,  lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/faq`,       lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/community`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/docs`,      lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
