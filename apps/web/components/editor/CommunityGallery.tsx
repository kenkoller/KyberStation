'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { PanelSkeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';

export interface CommunityStyle {
  id: string;
  name: string;
  author: string;
  description: string;
  tags: string[];
  style: string;
  config: Record<string, unknown>;
  created: string;
}

export interface GalleryData {
  styles: CommunityStyle[];
  lastUpdated: string;
}

const GALLERY_CACHE_KEY = 'kyberstation-community-gallery';
const GALLERY_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// Build the gallery JSON URL using the GitHub Pages basePath. The
// `NEXT_PUBLIC_BASE_PATH` env var is inlined at build time (see
// `apps/web/next.config.mjs`), so it's available in client code without
// runtime lookup. Falls back to '' for local dev / preview deploys.
const GALLERY_BASE_PATH =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_PATH
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : '';
const GALLERY_URL = `${GALLERY_BASE_PATH}/community-gallery.json`;

// Hardcoded fallback used when both the network fetch AND the localStorage
// cache fail. This is the exact same data as `apps/web/public/community-gallery.json`
// so first-launch / fully-offline users still see SOMETHING. When real
// community submissions land, the public JSON file gets PR-moderated
// updates per `docs/COMMUNITY_GALLERY.md`; this in-memory copy stays
// frozen as a safety net.
const PLACEHOLDER_STYLES: CommunityStyle[] = [
  {
    id: 'comm-1',
    name: 'Sith Lightning',
    author: 'DarthMaker',
    description: 'Dark side unstable blade with lightning crackles',
    tags: ['dark-side', 'unstable', 'lightning'],
    style: 'unstable',
    config: { baseColor: { r: 255, g: 0, b: 0 }, style: 'unstable', shimmer: 0.6 },
    created: '2025-12-15',
  },
  {
    id: 'comm-2',
    name: 'Kyber Crystal Pure',
    author: 'JediSmith',
    description: 'Clean stable blue with subtle pulse',
    tags: ['light-side', 'stable', 'clean'],
    style: 'pulse',
    config: { baseColor: { r: 0, g: 80, b: 255 }, style: 'pulse', shimmer: 0.2 },
    created: '2025-11-20',
  },
  {
    id: 'comm-3',
    name: 'Beskar Forge',
    author: 'MandalorianMaker',
    description: 'Molten metal fire effect in orange-white',
    tags: ['fire', 'mandalorian', 'forge'],
    style: 'fire',
    config: { baseColor: { r: 255, g: 120, b: 0 }, style: 'fire', shimmer: 0.4 },
    created: '2026-01-05',
  },
  {
    id: 'comm-4',
    name: 'Aurora Borealis',
    author: 'NorthernLights',
    description: 'Shimmering aurora gradient from green to blue',
    tags: ['gradient', 'aurora', 'nature'],
    style: 'aurora',
    config: { baseColor: { r: 0, g: 255, b: 128 }, style: 'aurora', shimmer: 0.5 },
    created: '2026-02-14',
  },
  {
    id: 'comm-5',
    name: 'Temple Guard Gold',
    author: 'JediArchives',
    description: 'Ceremonial gold blade from the Jedi Temple',
    tags: ['light-side', 'gold', 'temple-guard'],
    style: 'stable',
    config: { baseColor: { r: 255, g: 200, b: 0 }, style: 'stable', shimmer: 0.15 },
    created: '2026-03-01',
  },
];

/**
 * Persist a successful fetch result to localStorage. Best-effort: throws
 * (e.g. quota exceeded) are swallowed so a write failure never breaks
 * the render path.
 */
function writeCache(data: GalleryData): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      GALLERY_CACHE_KEY,
      JSON.stringify({ gallery: data, cachedAt: Date.now() }),
    );
  } catch {
    // Cache writes are best-effort — quota errors don't break the panel.
  }
}

/**
 * Read fresh-enough cached data from localStorage. Returns null on miss,
 * stale, or any parse / type-shape error.
 */
function readCache(): GalleryData | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const cached = localStorage.getItem(GALLERY_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { gallery?: GalleryData; cachedAt?: number };
    if (
      !parsed ||
      typeof parsed.cachedAt !== 'number' ||
      !parsed.gallery ||
      !Array.isArray(parsed.gallery.styles)
    ) {
      return null;
    }
    if (Date.now() - parsed.cachedAt >= GALLERY_CACHE_TTL) return null;
    return parsed.gallery;
  } catch {
    return null;
  }
}

export function CommunityGallery() {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const [gallery, setGallery] = useState<CommunityStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Load gallery data with a 3-branch fallback chain:
  //   1. Try fresh fetch from GitHub Pages (`/KyberStation/community-gallery.json`)
  //   2. On fetch failure: try localStorage cache (best-effort, ignores stale)
  //   3. On both failing: render in-memory `PLACEHOLDER_STYLES` (offline safety net)
  // The fetch branch always writes the cache on success so future loads
  // can short-circuit even when offline, until `GALLERY_CACHE_TTL` elapses.
  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Branch 1: fresh fetch
    try {
      const res = await fetch(GALLERY_URL, { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as GalleryData;
      if (!data || !Array.isArray(data.styles)) {
        throw new Error('Malformed gallery JSON: expected { styles: [...] }');
      }
      setGallery(data.styles);
      writeCache(data);
      setLoading(false);
      return;
    } catch (fetchErr) {
      // Fall through to cache + placeholder branches.
      const fetchMessage =
        fetchErr instanceof Error ? fetchErr.message : 'fetch failed';

      // Branch 2: localStorage cache
      const cached = readCache();
      if (cached) {
        setGallery(cached.styles);
        // Surface the underlying fetch failure as a soft warning so users
        // know they're seeing potentially-stale data. Cache hit still
        // counts as "loaded" — no error blocks the grid.
        setError(null);
        setLoading(false);
        return;
      }

      // Branch 3: hardcoded placeholder (final fallback)
      setGallery(PLACEHOLDER_STYLES);
      setError(`Showing offline samples — ${fetchMessage}`);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const style of gallery) {
      for (const tag of style.tags) tags.add(tag);
    }
    return Array.from(tags).sort();
  }, [gallery]);

  // Filtered styles
  const filtered = useMemo(() => {
    return gallery.filter((s) => {
      if (tagFilter && !s.tags.includes(tagFilter)) return false;
      if (filter) {
        const q = filter.toLowerCase();
        return s.name.toLowerCase().includes(q) ||
               s.author.toLowerCase().includes(q) ||
               s.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [gallery, filter, tagFilter]);

  const handleLoad = (style: CommunityStyle) => {
    loadPreset(style.config as Parameters<typeof loadPreset>[0]);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
        Community Gallery
        <HelpTooltip text="Browse and load community-submitted blade styles. Fork any style to customize it in the editor. Submit your own via GitHub PR." />
      </h3>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search styles..."
          aria-label="Search community styles"
          className="flex-1 bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-sm text-text-secondary placeholder:text-text-muted"
        />
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setTagFilter(null)}
          className={`px-1.5 py-0.5 rounded text-ui-xs border transition-colors ${
            !tagFilter
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'bg-bg-surface border-border-subtle text-text-muted hover:text-text-primary'
          }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            className={`px-1.5 py-0.5 rounded text-ui-xs border transition-colors ${
              tagFilter === tag
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-surface border-border-subtle text-text-muted hover:text-text-primary'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      {loading && <PanelSkeleton title="Community Gallery" />}
      {error && !loading && (
        <ErrorState
          variant="load-failed"
          message={error}
          onRetry={() => {
            void loadGallery();
          }}
          compact
        />
      )}

      <div className="grid grid-cols-1 gap-2">
        {filtered.map((style) => {
          const color = style.config.baseColor as { r: number; g: number; b: number } | undefined;
          return (
            <div
              key={style.id}
              className="bg-bg-surface rounded-panel p-2.5 border border-border-subtle hover:border-border-light transition-colors group"
            >
              <div className="flex items-start gap-2">
                {color && (
                  <div
                    className="w-6 h-6 rounded shrink-0 border border-border-subtle mt-0.5"
                    style={{ backgroundColor: `rgb(${color.r},${color.g},${color.b})` }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-ui-base font-medium text-text-primary">{style.name}</span>
                    <span className="text-ui-xs text-text-muted">{style.style}</span>
                  </div>
                  <p className="text-ui-xs text-text-muted mt-0.5">{style.description}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-ui-xs text-text-muted">by {style.author}</span>
                    <button
                      onClick={() => handleLoad(style)}
                      aria-label={`Load ${style.name} style`}
                      className="px-2 py-0.5 rounded text-ui-xs font-medium border border-accent-border text-accent bg-accent-dim hover:bg-accent/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <p className="text-ui-sm text-text-muted italic">No styles match your search.</p>
      )}

      <p className="text-ui-xs text-text-muted">
        {gallery.length} community style{gallery.length !== 1 ? 's' : ''} available.
        Submit yours via GitHub PR to the kyberstation-community-styles repository.
      </p>
    </div>
  );
}
