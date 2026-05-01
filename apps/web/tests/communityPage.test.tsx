// ─── /community page — SSR smoke + structural pins ────────────────────────
//
// Pin the contract for the marketing /community page (added 2026-05-01 to
// close the last unshipped piece of the closed PR #32). Coverage:
//   1. The page exports a `metadata` object built via `pageMetadata` with
//      the right title + description + canonical URL.
//   2. SSR markup renders the section structure (eyebrow / h1 / h2 list).
//   3. The 5 expected anchored sections are present.
//   4. MarketingHeader is rendered with `active="community"`.
//   5. Outbound GitHub links use `target="_blank"` + `rel="noopener noreferrer"`.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

import CommunityPage, { metadata } from '@/app/community/page';
import { siteConfig } from '@/lib/siteConfig';

describe('/community page', () => {
  describe('metadata', () => {
    it('builds a "KyberStation — Community" title', () => {
      expect(metadata.title).toBe(`${siteConfig.name} — Community`);
    });

    it('canonical URL ends in /community', () => {
      expect(metadata.alternates?.canonical).toBe(`${siteConfig.url}/community`);
    });

    it('description mentions hobby release context', () => {
      expect(typeof metadata.description).toBe('string');
      const description = metadata.description as string;
      expect(description.toLowerCase()).toContain('contribution');
    });

    it('Open Graph metadata mirrors the page title + canonical', () => {
      expect(metadata.openGraph?.title).toBe(metadata.title);
      expect(metadata.openGraph?.url).toBe(`${siteConfig.url}/community`);
    });
  });

  describe('SSR markup', () => {
    it('renders without throwing', () => {
      const markup = renderToStaticMarkup(createElement(CommunityPage));
      expect(markup.length).toBeGreaterThan(0);
    });

    it('renders the page heading at the top of <main>', () => {
      const markup = renderToStaticMarkup(createElement(CommunityPage));
      expect(markup).toContain('Saber-builders helping saber-builders.');
      expect(markup).toContain('id="main-content"');
    });

    it('uses MarketingHeader with active="community"', () => {
      const markup = renderToStaticMarkup(createElement(CommunityPage));
      // The community NAV_LINK becomes aria-current="page" when active
      expect(markup).toMatch(/aria-current="page"[^>]*>Community/);
    });

    it('renders all 5 numbered sections', () => {
      const markup = renderToStaticMarkup(createElement(CommunityPage));
      expect(markup).toContain('01 / COMMUNITY');
      expect(markup).toContain('02 / WAYS IN');
      expect(markup).toContain('03 / SOURCE + CONTRIBUTIONS');
      expect(markup).toContain('04 / ROADMAP');
      expect(markup).toContain('05 / STANDING ON SHOULDERS');
    });

    it('renders the 3 ways-in cards with index labels', () => {
      const markup = renderToStaticMarkup(createElement(CommunityPage));
      expect(markup).toContain('W.01');
      expect(markup).toContain('W.02');
      expect(markup).toContain('W.03');
      expect(markup).toContain('Report a bug');
      expect(markup).toContain('Request a feature or preset');
      expect(markup).toContain('Share your saber');
    });

    it('renders all 4 recognition entries', () => {
      const markup = renderToStaticMarkup(createElement(CommunityPage));
      expect(markup).toContain('ProffieOS');
      expect(markup).toContain('Proffieboard');
      expect(markup).toContain('Fett263 prop file');
      expect(markup).toContain('The Neopixel saber community');
    });

    it('outbound GitHub links open in a new tab with rel="noopener noreferrer"', () => {
      const markup = renderToStaticMarkup(createElement(CommunityPage));
      // Every external github link should have target="_blank" + rel
      const externalLinks = markup.match(
        /href="https:\/\/github\.com[^"]*"[^>]*/g,
      );
      expect(externalLinks).toBeTruthy();
      for (const link of externalLinks ?? []) {
        expect(link).toContain('target="_blank"');
        expect(link).toContain('rel="noopener noreferrer"');
      }
    });

    it('exposes section anchors for deep-linking', () => {
      const markup = renderToStaticMarkup(createElement(CommunityPage));
      expect(markup).toContain('id="ways-in"');
      expect(markup).toContain('id="contribution-policy"');
      expect(markup).toContain('id="roadmap"');
      expect(markup).toContain('id="recognition"');
    });
  });
});
