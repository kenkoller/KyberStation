// ─── sitemap.ts regression tests ───
//
// Pins the set of public marketing routes in the sitemap + catches
// accidental drift if someone adds a route but forgets to wire
// it in. The editor, /m, and /s routes must NOT appear — they are
// app surfaces, not marketing pages.

import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';
import { siteConfig } from '@/lib/siteConfig';

describe('sitemap()', () => {
  const entries = sitemap();

  it('lists the expected marketing routes and no editor surfaces', () => {
    const urls = entries.map((e) => e.url).sort();
    expect(urls).toEqual(
      [
        `${siteConfig.url}/`,
        `${siteConfig.url}/changelog`,
        `${siteConfig.url}/community`,
        `${siteConfig.url}/docs`,
        `${siteConfig.url}/faq`,
        `${siteConfig.url}/features`,
        `${siteConfig.url}/showcase`,
      ].sort(),
    );
  });

  it('does not expose editor / share / mobile routes', () => {
    const urls = entries.map((e) => e.url);
    expect(urls).not.toContain(`${siteConfig.url}/editor`);
    expect(urls).not.toContain(`${siteConfig.url}/m`);
    expect(urls).not.toContain(`${siteConfig.url}/s`);
  });

  it('puts the homepage at top priority', () => {
    const home = entries.find((e) => e.url === `${siteConfig.url}/`);
    expect(home?.priority).toBe(1.0);
  });

  it('gives every entry a lastModified Date', () => {
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });

  it('uses a valid changeFrequency for every entry', () => {
    const valid = new Set([
      'always',
      'hourly',
      'daily',
      'weekly',
      'monthly',
      'yearly',
      'never',
    ]);
    for (const entry of entries) {
      expect(valid.has(entry.changeFrequency as string)).toBe(true);
    }
  });
});
