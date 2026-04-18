import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

/**
 * Generates /robots.txt at build time. Next.js picks this up by
 * convention.
 *
 * We allow everything by default — KyberStation has no private routes,
 * no user accounts, no server-side data to hide. The editor + share
 * routes aren't in the sitemap (they're app surfaces), but we don't
 * block them either; they'll just rank low since they're
 * client-rendered SPAs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
