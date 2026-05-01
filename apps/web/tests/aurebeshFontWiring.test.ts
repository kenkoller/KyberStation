// ─── Aurebesh font wiring drift sentinel ──────────────────────────────────
//
// Locks down the 2026-05-01 fix: the bottom HUD DataTicker (and every
// other Aurebesh consumer — `.sw-aurebesh`, `aurebesh-labels`,
// `aurebesh-full`) MUST load its font through `next/font/local` so the
// generated `@font-face` URLs honor `basePath`.
//
// The previous wiring used manual `@font-face` declarations in
// `globals.css` with root-relative URLs like
// `url('/fonts/aurebesh/AurebeshAF-Canon.otf')`. That works in local
// dev (basePath = '') but 404s on the GitHub Pages production deploy
// (basePath = '/KyberStation'), silently dropping the ticker into
// monospace.
//
// If any of these checks fail, somebody re-introduced the broken
// pattern. Either:
//  (a) revert their change, or
//  (b) update both this test AND the basePath-aware wiring in lockstep.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_WEB = join(__dirname, '..');

describe('Aurebesh font wiring (drift sentinel)', () => {
  describe('Font files on disk', () => {
    const variants = [
      'AurebeshAF-Canon.otf',
      'AurebeshAF-CanonTech.otf',
      'AurebeshAF-Legends.otf',
      'AurebeshAF-LegendsTech.otf',
    ];
    for (const name of variants) {
      it(`bundles ${name}`, () => {
        const fontPath = join(REPO_WEB, 'public', 'fonts', 'aurebesh', name);
        expect(existsSync(fontPath)).toBe(true);
      });
    }
  });

  describe('layout.tsx — next/font/local wiring', () => {
    const layoutSrc = readFileSync(
      join(REPO_WEB, 'app', 'layout.tsx'),
      'utf-8',
    );

    it('imports localFont from next/font/local', () => {
      expect(layoutSrc).toContain("from 'next/font/local'");
    });

    it.each([
      ['canon', '--font-aurebesh-canon', 'AurebeshAF-Canon.otf'],
      ['canon-tech', '--font-aurebesh-canon-tech', 'AurebeshAF-CanonTech.otf'],
      ['legends', '--font-aurebesh-legends', 'AurebeshAF-Legends.otf'],
      ['legends-tech', '--font-aurebesh-legends-tech', 'AurebeshAF-LegendsTech.otf'],
    ])(
      'declares localFont() for %s with the expected variable + src',
      (_name, variable, src) => {
        expect(layoutSrc).toContain(`variable: '${variable}'`);
        expect(layoutSrc).toContain(src);
      },
    );

    it('threads all 4 Aurebesh variables onto <html className>', () => {
      // The exact string must include every variable so next/font/local's
      // generated CSS variables actually propagate to the page root.
      expect(layoutSrc).toMatch(/aurebeshCanon\.variable/);
      expect(layoutSrc).toMatch(/aurebeshCanonTech\.variable/);
      expect(layoutSrc).toMatch(/aurebeshLegends\.variable/);
      expect(layoutSrc).toMatch(/aurebeshLegendsTech\.variable/);
    });
  });

  describe('globals.css — no manual @font-face, variant classes use next/font vars', () => {
    const globalsCss = readFileSync(
      join(REPO_WEB, 'app', 'globals.css'),
      'utf-8',
    );

    it('does NOT contain a manual @font-face for Aurebesh AF', () => {
      // If this fails, somebody added back the broken root-relative
      // `url('/fonts/aurebesh/...')` pattern. Use next/font/local
      // (in app/layout.tsx) instead — it auto-prefixes basePath.
      expect(globalsCss).not.toMatch(/@font-face\s*\{[^}]*'Aurebesh AF'[^}]*\}/s);
    });

    it('does NOT reference root-relative Aurebesh font URLs', () => {
      // Same regression — manual url('/fonts/aurebesh/...') in any form.
      expect(globalsCss).not.toContain("url('/fonts/aurebesh/");
      expect(globalsCss).not.toContain('url("/fonts/aurebesh/');
    });

    it.each([
      ['canon', 'var(--font-aurebesh-canon)'],
      ['canon-tech', 'var(--font-aurebesh-canon-tech)'],
      ['legends', 'var(--font-aurebesh-legends)'],
      ['legends-tech', 'var(--font-aurebesh-legends-tech)'],
    ])(
      'aurebesh-variant-%s class resolves --aurebesh-family to the right var',
      (variant, varRef) => {
        const re = new RegExp(
          `html\\.aurebesh-variant-${variant}\\b[^{]*\\{\\s*--aurebesh-family:\\s*${varRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        );
        expect(globalsCss).toMatch(re);
      },
    );

    it('.sw-aurebesh falls back to --font-aurebesh-canon (not the legacy string)', () => {
      // Old fallback was `var(--aurebesh-family, 'Aurebesh AF')` — that
      // string referred to a manual @font-face we no longer ship, so
      // it'd resolve to a 404'd family on production. New fallback
      // hits the next/font-managed variable instead.
      expect(globalsCss).toMatch(
        /\.sw-aurebesh\s*\{[^}]*var\(--aurebesh-family,\s*var\(--font-aurebesh-canon\)\)/,
      );
    });
  });

  describe('DataTicker — uses variant indirection, not hardcoded family', () => {
    const dataTickerSrc = readFileSync(
      join(REPO_WEB, 'components', 'hud', 'DataTicker.tsx'),
      'utf-8',
    );

    it('reads font through var(--aurebesh-family) indirection', () => {
      // The variant picker now flows through DataTicker — flipping
      // canon → legends in Settings updates the bottom ticker too.
      expect(dataTickerSrc).toContain('var(--aurebesh-family');
    });

    it('falls back to --font-aurebesh-canon (not the legacy string family)', () => {
      // Same regression class as `.sw-aurebesh`: any `'Aurebesh AF'`
      // string reference would target a no-longer-shipped manual
      // @font-face that 404s on production.
      expect(dataTickerSrc).toContain('var(--font-aurebesh-canon)');
      // Quick guard — the line in DataTicker mustn't list
      // 'Aurebesh AF' as a string family any more.
      expect(dataTickerSrc).not.toMatch(
        /fontFamily\s*:\s*"['"]Aurebesh AF['"]/,
      );
    });
  });
});
