// ─── robots.ts regression tests ───
//
// The marketing site has no private routes, no accounts, and no
// telemetry — robots should allow-all + point at the sitemap. If
// someone accidentally adds a `disallow` rule, this test catches it.

import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';
import { siteConfig } from '@/lib/siteConfig';

describe('robots()', () => {
  const rules = robots();

  it('returns an allow-all rule for every user agent', () => {
    const r = Array.isArray(rules.rules) ? rules.rules[0] : rules.rules;
    expect(r).toBeDefined();
    expect(r?.userAgent).toBe('*');
    expect(r?.allow).toBe('/');
    expect(r?.disallow).toBeUndefined();
  });

  it('points at the sitemap on the configured site URL', () => {
    expect(rules.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
  });

  it('sets host to the configured site URL', () => {
    expect(rules.host).toBe(siteConfig.url);
  });
});
