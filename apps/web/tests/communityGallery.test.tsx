// @vitest-environment jsdom
//
// ─── CommunityGallery — fetch + cache + fallback tests ────────────────────
//
// Pin down the contract for the production data flow shipped with the
// "real data source" PR (item v0.15.x in `docs/POST_LAUNCH_BACKLOG.md`).
//
// Coverage:
//   1. SSR safety — the component renders without throwing under
//      `renderToStaticMarkup` even when no globals (fetch / localStorage)
//      have been stubbed.
//   2. Branch 1 (fresh fetch, success) — fetch returns valid JSON →
//      gallery populated with `data.styles`, cache written.
//   3. Branch 2 (fetch fails, cache HIT) — fetch rejects → fresh
//      localStorage cache used → gallery populated, no error surfaced.
//   4. Branch 3 (fetch fails, cache MISS) — fetch rejects + no cache →
//      hardcoded `PLACEHOLDER_STYLES` rendered + soft error message.
//   5. Cache expiry — cache older than `GALLERY_CACHE_TTL` (30 min) is
//      ignored; fetch retried; treated as cache miss for the fallback.
//   6. Malformed fetch JSON — `data.styles` not an array → fall through
//      to cache / placeholder branch.
//   7. Non-OK fetch response — `res.ok === false` → fall through.
//
// Pattern: jsdom-style component mounting via `@testing-library/react`
// for the dynamic branches (fetch is async, useEffect must run), plus
// `renderToStaticMarkup` for the SSR-safety smoke test.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// ─── Mock the bladeStore — CommunityGallery only reads `loadPreset` ───
// We don't care about the actual store wiring; just make `useBladeStore`
// callable so the component renders. The selector pattern matches how
// other tests in the suite (galleryGridView.test.tsx) mock the store.

vi.mock('@/stores/bladeStore', () => {
  const useBladeStore = ((selector: (s: unknown) => unknown) =>
    selector({ loadPreset: () => undefined })) as unknown as {
    (selector: (s: unknown) => unknown): unknown;
  };
  return { useBladeStore };
});

// ─── Test fixtures ─────────────────────────────────────────────────────
// jsdom provides a real `localStorage` — we just clear it between tests
// rather than stubbing.

const fetchedStyles = [
  {
    id: 'fetched-1',
    name: 'Network Sample',
    author: 'NetworkAuthor',
    description: 'Loaded from the network',
    tags: ['network'],
    style: 'stable',
    config: { baseColor: { r: 10, g: 20, b: 30 }, style: 'stable', shimmer: 0.1 },
    created: '2026-04-01',
  },
];

const cachedStyles = [
  {
    id: 'cached-1',
    name: 'Cache Sample',
    author: 'CacheAuthor',
    description: 'Loaded from localStorage',
    tags: ['cache'],
    style: 'pulse',
    config: { baseColor: { r: 100, g: 100, b: 100 }, style: 'pulse', shimmer: 0.5 },
    created: '2026-03-15',
  },
];

const GALLERY_CACHE_KEY = 'kyberstation-community-gallery';
const GALLERY_CACHE_TTL = 1000 * 60 * 30;

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

// ─── 1. SSR safety smoke ───────────────────────────────────────────────

describe('CommunityGallery — SSR rendering', () => {
  it('renders without throwing under renderToStaticMarkup', async () => {
    // No fetch / localStorage stubs needed — useEffect doesn't run during
    // SSR, so the load chain never fires. We're just verifying that the
    // initial render shape is well-formed.
    const { CommunityGallery } = await import('@/components/editor/CommunityGallery');
    const markup = renderToStaticMarkup(createElement(CommunityGallery));
    expect(markup).toContain('Community Gallery');
    expect(markup).toContain('Search styles');
  });
});

// ─── 2. Branch 1 — fresh fetch success ─────────────────────────────────

describe('CommunityGallery — Branch 1: fresh fetch', () => {
  it('populates gallery from fetch response and writes cache', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          styles: fetchedStyles,
          lastUpdated: '2026-04-01T00:00:00.000Z',
        }),
      })),
    );

    const { CommunityGallery } = await import('@/components/editor/CommunityGallery');
    render(createElement(CommunityGallery));

    await waitFor(() => {
      expect(screen.getByText('Network Sample')).toBeTruthy();
    });

    // Cache write happened — read it back to confirm.
    const cached = localStorage.getItem(GALLERY_CACHE_KEY);
    expect(cached).toBeTruthy();
    const parsed = JSON.parse(cached as string);
    expect(parsed.gallery.styles[0].id).toBe('fetched-1');
    expect(typeof parsed.cachedAt).toBe('number');
  });

  it('treats malformed JSON (no styles array) as a fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ lastUpdated: '2026-04-01T00:00:00.000Z' }),
      })),
    );

    const { CommunityGallery } = await import('@/components/editor/CommunityGallery');
    render(createElement(CommunityGallery));

    // Falls through to placeholder branch — first hardcoded sample is "Sith Lightning".
    await waitFor(() => {
      expect(screen.getByText('Sith Lightning')).toBeTruthy();
    });
  });

  it('treats a non-OK response as a fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        json: async () => ({}),
      })),
    );

    const { CommunityGallery } = await import('@/components/editor/CommunityGallery');
    render(createElement(CommunityGallery));

    await waitFor(() => {
      expect(screen.getByText('Sith Lightning')).toBeTruthy();
    });
  });
});

// ─── 3. Branch 2 — fetch fails, cache hit ──────────────────────────────

describe('CommunityGallery — Branch 2: cache hit on fetch failure', () => {
  it('uses fresh cache when fetch rejects', async () => {
    // Seed cache with current timestamp so it's well within TTL.
    localStorage.setItem(
      GALLERY_CACHE_KEY,
      JSON.stringify({
        gallery: { styles: cachedStyles, lastUpdated: '2026-03-15T00:00:00.000Z' },
        cachedAt: Date.now(),
      }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    const { CommunityGallery } = await import('@/components/editor/CommunityGallery');
    render(createElement(CommunityGallery));

    await waitFor(() => {
      expect(screen.getByText('Cache Sample')).toBeTruthy();
    });

    // Fetched data should NOT appear (network failed).
    expect(screen.queryByText('Network Sample')).toBeNull();
    // Hardcoded placeholder should NOT appear (cache won the fallback race).
    expect(screen.queryByText('Sith Lightning')).toBeNull();
  });

  it('ignores cache older than the 30-min TTL', async () => {
    // Seed cache with a timestamp older than the TTL — should be ignored.
    localStorage.setItem(
      GALLERY_CACHE_KEY,
      JSON.stringify({
        gallery: { styles: cachedStyles, lastUpdated: '2026-01-01T00:00:00.000Z' },
        cachedAt: Date.now() - GALLERY_CACHE_TTL - 1000,
      }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    const { CommunityGallery } = await import('@/components/editor/CommunityGallery');
    render(createElement(CommunityGallery));

    // Stale cache rejected → falls through to hardcoded placeholder.
    await waitFor(() => {
      expect(screen.getByText('Sith Lightning')).toBeTruthy();
    });
    expect(screen.queryByText('Cache Sample')).toBeNull();
  });

  it('ignores malformed cache JSON', async () => {
    localStorage.setItem(GALLERY_CACHE_KEY, 'not valid json {');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    const { CommunityGallery } = await import('@/components/editor/CommunityGallery');
    render(createElement(CommunityGallery));

    // Bad cache → placeholder branch.
    await waitFor(() => {
      expect(screen.getByText('Sith Lightning')).toBeTruthy();
    });
  });
});

// ─── 4. Branch 3 — fetch fails, no cache → placeholder ─────────────────

describe('CommunityGallery — Branch 3: placeholder fallback', () => {
  it('renders all 5 hardcoded placeholder styles when both fetch and cache miss', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );

    const { CommunityGallery } = await import('@/components/editor/CommunityGallery');
    render(createElement(CommunityGallery));

    await waitFor(() => {
      expect(screen.getByText('Sith Lightning')).toBeTruthy();
    });

    // All 5 placeholder entries should render in the grid.
    expect(screen.getByText('Sith Lightning')).toBeTruthy();
    expect(screen.getByText('Kyber Crystal Pure')).toBeTruthy();
    expect(screen.getByText('Beskar Forge')).toBeTruthy();
    expect(screen.getByText('Aurora Borealis')).toBeTruthy();
    expect(screen.getByText('Temple Guard Gold')).toBeTruthy();
  });

  it('surfaces a soft error message alongside the placeholder data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connection refused');
      }),
    );

    const { CommunityGallery } = await import('@/components/editor/CommunityGallery');
    render(createElement(CommunityGallery));

    await waitFor(() => {
      // Error message should mention the underlying fetch reason.
      expect(screen.getByText(/connection refused/i)).toBeTruthy();
    });
  });
});
