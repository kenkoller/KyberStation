// ─── pageMetadata helper tests ───
//
// Validates the shape of the Next.js Metadata object emitted for every
// marketing page. Uses the real siteConfig — no mock — since the config
// is a frozen object with sensible defaults.

import { describe, it, expect } from 'vitest';
import { pageMetadata } from '@/lib/pageMetadata';
import { siteConfig } from '@/lib/siteConfig';

describe('pageMetadata', () => {
  const expectedImageUrl = `${siteConfig.url}${siteConfig.ogImage}`;

  it('builds a Metadata object with suffixed title + canonical + OG defaults', () => {
    const m = pageMetadata({
      title: 'Features',
      description: 'Everything KyberStation can do.',
      path: '/features',
    });

    expect(m.title).toBe(`Features — ${siteConfig.name}`);
    expect(m.description).toBe('Everything KyberStation can do.');
    expect(m.alternates?.canonical).toBe(`${siteConfig.url}/features`);

    // OpenGraph + Twitter are discriminated unions in Next.js's types;
    // cast to an index signature for runtime-shape assertions.
    const og = m.openGraph as Record<string, unknown> | undefined;
    expect(og).toBeDefined();
    expect(og?.url).toBe(`${siteConfig.url}/features`);
    expect(og?.siteName).toBe(siteConfig.name);
    expect(og?.type).toBe('website');

    const tw = m.twitter as Record<string, unknown> | undefined;
    expect(tw).toBeDefined();
    expect(tw?.card).toBe('summary_large_image');
  });

  it('omits the " — KyberStation" suffix when full=true', () => {
    const m = pageMetadata({
      title: 'KyberStation — Universal Saber Style Engine',
      description: 'Landing',
      path: '/',
      full: true,
    });
    expect(m.title).toBe('KyberStation — Universal Saber Style Engine');
  });

  it('passes through the keywords array', () => {
    const m = pageMetadata({
      title: 'FAQ',
      description: 'Questions.',
      path: '/faq',
      keywords: ['proffieboard', 'neopixel', 'saber'],
    });
    expect(m.keywords).toEqual(['proffieboard', 'neopixel', 'saber']);
  });

  it('openGraph image has the absolute URL + dimensions from siteConfig', () => {
    const m = pageMetadata({
      title: 'Features',
      description: '.',
      path: '/features',
    });
    const og = m.openGraph as { images?: unknown } | undefined;
    const images = og?.images;
    expect(Array.isArray(images)).toBe(true);
    const first = Array.isArray(images)
      ? (images[0] as Record<string, unknown>)
      : undefined;
    expect(first?.url).toBe(expectedImageUrl);
    expect(first?.width).toBe(siteConfig.ogImageWidth);
    expect(first?.height).toBe(siteConfig.ogImageHeight);
  });

  it('twitter.images[0] matches the OpenGraph image URL', () => {
    const m = pageMetadata({
      title: 'Features',
      description: '.',
      path: '/features',
    });
    const tw = m.twitter as { images?: unknown } | undefined;
    const twImages = tw?.images;
    expect(Array.isArray(twImages)).toBe(true);
    if (Array.isArray(twImages)) {
      expect(twImages[0]).toBe(expectedImageUrl);
    }
  });
});
