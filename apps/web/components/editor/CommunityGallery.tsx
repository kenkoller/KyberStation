'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { PanelSkeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';

interface CommunityStyle {
  id: string;
  name: string;
  author: string;
  description: string;
  tags: string[];
  style: string;
  config: Record<string, unknown>;
  created: string;
}

interface GalleryData {
  styles: CommunityStyle[];
  lastUpdated: string;
}

const GALLERY_CACHE_KEY = 'kyberstation-community-gallery';
const GALLERY_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export function CommunityGallery() {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const [gallery, setGallery] = useState<CommunityStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Load gallery data (from cache or placeholder)
  const loadGallery = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      // Check localStorage cache first
      const cached = localStorage.getItem(GALLERY_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as { gallery: GalleryData; cachedAt: number };
        if (Date.now() - data.cachedAt < GALLERY_CACHE_TTL) {
          setGallery(data.gallery.styles);
          setLoading(false);
          return;
        }
      }

      // Placeholder data — in production this fetches from GitHub Pages
      const placeholderStyles: CommunityStyle[] = [
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

      setGallery(placeholderStyles);
      localStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify({
        gallery: { styles: placeholderStyles, lastUpdated: new Date().toISOString() },
        cachedAt: Date.now(),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load gallery');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGallery();
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
          message={`Couldn't reach the community gallery. ${error}`}
          onRetry={loadGallery}
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
