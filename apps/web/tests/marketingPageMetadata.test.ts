import { describe, it, expect } from 'vitest';
import { pageMetadata } from '@/lib/marketing/pageMetadata';
import { siteConfig } from '@/lib/siteConfig';

describe('pageMetadata', () => {
  it('composes a "KyberStation — <title>" title', () => {
    const meta = pageMetadata({
      title: 'Features',
      description: 'desc',
      path: '/features',
    });
    expect(meta.title).toBe(`${siteConfig.name} — Features`);
  });

  it('builds an absolute canonical URL from the site config base', () => {
    const meta = pageMetadata({
      title: 'FAQ',
      description: 'd',
      path: '/faq',
    });
    expect(meta.alternates?.canonical).toBe(`${siteConfig.url}/faq`);
  });

  it('points OG image at siteConfig.ogImage with correct dimensions', () => {
    const meta = pageMetadata({
      title: 'Showcase',
      description: 'd',
      path: '/showcase',
    });
    const ogImages = meta.openGraph?.images as
      | Array<{ url: string; width?: number; height?: number; alt?: string }>
      | undefined;
    expect(ogImages?.[0]?.url).toBe(siteConfig.ogImage);
    expect(ogImages?.[0]?.width).toBe(siteConfig.ogImageWidth);
    expect(ogImages?.[0]?.height).toBe(siteConfig.ogImageHeight);
  });

  it('emits a summary_large_image twitter card', () => {
    const meta = pageMetadata({
      title: 'Changelog',
      description: 'd',
      path: '/changelog',
    });
    // Twitter metadata is a discriminated union; the `card` field
    // exists on every variant we use, so widen via the unknown cast.
    const twitter = meta.twitter as { card?: string } | undefined;
    expect(twitter?.card).toBe('summary_large_image');
  });

  it('uses the same title and description across openGraph and twitter', () => {
    const meta = pageMetadata({
      title: 'Features',
      description: 'overview of features',
      path: '/features',
    });
    expect(meta.openGraph?.title).toBe(meta.title);
    expect(meta.openGraph?.description).toBe('overview of features');
    expect(meta.twitter?.title).toBe(meta.title);
    expect(meta.twitter?.description).toBe('overview of features');
  });
});
