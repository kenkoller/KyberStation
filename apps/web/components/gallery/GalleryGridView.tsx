'use client';

// ─── GalleryGridView — large card grid (default gallery view) ─────────────
//
// Replaces the legacy A/B sidebar layout as the default view at /gallery.
// Renders a responsive flex-wrap grid of preset cards, ~6 cards per row at
// desktop, scaling down to 4 (tablet) and 2 (mobile).
//
// Performance contract — CRITICAL:
//   With ~305 cards mounted, we DO NOT run 305 BladeEngine instances. We
//   match the landing page's `MarqueeCard` pattern:
//
//     1. IntersectionObserver gates each card's `inView` state. Cards
//        outside the viewport (+200px rootMargin pre-fetch) freeze to
//        zero per-frame CPU — `engine.update()` + `drawPixels()` are
//        gated on `animated={inView && isHovered}`.
//
//     2. Only the HOVERED card actively ticks the engine at 30fps. Cards
//        in view but not hovered render a static idle frame (engine
//        warmed up + a single frame drawn once). Cards out of view never
//        mount the engine at all.
//
//     3. Click on a card opens the `GalleryDetailModal`. We DO NOT
//        load the preset on card click — that would lose users' unsaved
//        work. Loading happens only via the modal's explicit "Open in
//        Workbench" CTA.
//
// Filter state + filter toolbar lives at the top (relocated from the legacy
// Column A's sidebar rail). Filter logic is reused unchanged from
// `lib/galleryFilters.ts` and `galleryAB.types.ts` — no duplication.
//
// Shuffle button rotates a deterministic seed; the seeded order persists
// across re-renders within the session until the user clicks Shuffle
// again or Reset. (Same pattern as Column A's shuffle.)

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { Preset } from '@kyberstation/presets';
import type { BladeConfig } from '@kyberstation/engine';
import { ALL_PRESETS } from '@kyberstation/presets';
import { MiniSaber } from '@/components/shared/MiniSaber';
import { EraBadge, FactionBadge } from '@/components/shared/StatusSignal';
import {
  DEFAULT_FILTERS,
  filterPresets,
  presetContinuity,
  type GalleryFilters,
  type EraFilter,
  type FactionFilter,
  type ColorFilter,
  type StyleFilter,
  type ContinuityFilter,
} from './galleryAB.types';
import { GalleryDetailModal } from './GalleryDetailModal';

export function GalleryGridView(): JSX.Element {
  const [filters, setFilters] = useState<GalleryFilters>(DEFAULT_FILTERS);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  const filtered = useMemo(
    () => filterPresets(ALL_PRESETS, filters),
    [filters],
  );

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      data-testid="gallery-grid-view"
    >
      {/* Filter toolbar — horizontal, above the grid */}
      <GalleryFilterToolbar
        filters={filters}
        onFiltersChange={setFilters}
        filteredCount={filtered.length}
      />

      {/* Scrollable grid body */}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        data-testid="gallery-grid-scroll"
      >
        {filtered.length === 0 ? (
          <div
            className="px-3 py-12 flex flex-col items-center justify-center gap-2 text-center"
            data-testid="gallery-grid-empty"
          >
            <span className="text-ui-base text-text-secondary font-medium">
              No presets match
            </span>
            <span className="text-ui-sm text-text-muted leading-relaxed max-w-[320px]">
              Try clearing a filter or adjusting your search query.
            </span>
          </div>
        ) : (
          <ul
            className="flex flex-wrap justify-center gap-3 p-4"
            aria-label={`${filtered.length} presets`}
            data-testid="gallery-grid-list"
          >
            {filtered.map((preset) => (
              <GalleryGridCard
                key={preset.id}
                preset={preset}
                onClick={() => setSelectedPreset(preset)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Detail overlay modal — opens on card click; does NOT auto-load. */}
      {selectedPreset !== null && (
        <GalleryDetailModal
          preset={selectedPreset}
          onClose={() => setSelectedPreset(null)}
        />
      )}
    </div>
  );
}

// ─── Filter toolbar (horizontal — relocated from sidebar) ─────────────────

interface FilterToolbarProps {
  filters: GalleryFilters;
  onFiltersChange: (next: GalleryFilters) => void;
  filteredCount: number;
}

function GalleryFilterToolbar({
  filters,
  onFiltersChange,
  filteredCount,
}: FilterToolbarProps): JSX.Element {
  const update = <K extends keyof GalleryFilters>(
    key: K,
    value: GalleryFilters[K],
  ) => onFiltersChange({ ...filters, [key]: value });

  return (
    <div
      className="px-4 py-3 border-b border-border-subtle bg-bg-deep/50 shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2"
      data-testid="gallery-grid-filters"
    >
      <input
        type="search"
        value={filters.search}
        onChange={(e) => update('search', e.target.value)}
        placeholder={`Search ${ALL_PRESETS.length} presets…`}
        className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-ui-xs font-mono placeholder:text-text-muted/60 focus:border-accent-border outline-none"
        style={{ minWidth: 180, maxWidth: 240 }}
        aria-label="Search presets"
      />

      <ToolbarFilter<EraFilter>
        label="Era"
        value={filters.era}
        options={[
          { id: 'all', label: 'All' },
          { id: 'prequel', label: 'PT' },
          { id: 'original-trilogy', label: 'OT' },
          { id: 'sequel', label: 'ST' },
          { id: 'animated', label: 'Anim' },
          { id: 'expanded-universe', label: 'EU' },
        ]}
        onChange={(v) => update('era', v)}
      />

      <ToolbarFilter<FactionFilter>
        label="Side"
        value={filters.faction}
        options={[
          { id: 'all', label: 'All' },
          { id: 'jedi', label: 'Jedi' },
          { id: 'sith', label: 'Sith' },
          { id: 'neutral', label: 'Grey' },
          { id: 'other', label: 'Other' },
        ]}
        onChange={(v) => update('faction', v)}
      />

      <ToolbarFilter<ColorFilter>
        label="Color"
        value={filters.colorFamily}
        options={[
          { id: 'all', label: 'All' },
          { id: 'blue', label: 'Blue' },
          { id: 'green', label: 'Green' },
          { id: 'red', label: 'Red' },
          { id: 'purple', label: 'Purple' },
          { id: 'yellow', label: 'Yellow' },
          { id: 'white', label: 'White' },
        ]}
        onChange={(v) => update('colorFamily', v)}
      />

      <ToolbarFilter<StyleFilter>
        label="Style"
        value={filters.styleFamily}
        options={[
          { id: 'all', label: 'All' },
          { id: 'steady', label: 'Steady' },
          { id: 'animated', label: 'Anim' },
          { id: 'particle', label: 'Particle' },
          { id: 'color', label: 'Color' },
          { id: 'kinetic', label: 'Kinetic' },
        ]}
        onChange={(v) => update('styleFamily', v)}
      />

      <ToolbarFilter<ContinuityFilter>
        label="Source"
        value={filters.continuity}
        options={[
          { id: 'all', label: 'All' },
          { id: 'canon', label: 'Canon' },
          { id: 'legends', label: 'Legends' },
          { id: 'creative', label: 'Creative' },
          { id: 'pop-culture', label: 'Pop' },
          { id: 'mythology', label: 'Myth' },
          { id: 'showcase', label: '✦ Showcase' },
        ]}
        onChange={(v) => update('continuity', v)}
      />

      {/* Star-Wars-only toggle — purist mode */}
      <label
        className="flex items-center gap-2 px-2 py-0.5 cursor-pointer text-ui-xs font-mono uppercase tracking-[0.08em] text-text-muted hover:text-text-primary select-none"
        title="Hide all non-Star-Wars entries (pop-culture tributes, real-world mythology, KyberStation showcase tech demos)"
      >
        <input
          type="checkbox"
          checked={filters.starWarsOnly}
          onChange={(e) => update('starWarsOnly', e.target.checked)}
          className="accent-accent"
        />
        <span>Star Wars only</span>
      </label>

      {/* Right-aligned count + shuffle controls */}
      <span className="ml-auto inline-flex items-center gap-2">
        <span
          className="text-ui-xs font-mono text-text-muted tabular-nums"
          aria-live="polite"
          data-testid="gallery-grid-count"
        >
          {filteredCount} / {ALL_PRESETS.length}
        </span>

        <button
          type="button"
          onClick={() => update('shuffleSeed', Date.now())}
          className={[
            'px-2 py-0.5 rounded text-ui-xs font-mono uppercase tracking-[0.08em] border transition-colors',
            filters.shuffleSeed !== null
              ? 'border-accent-border text-accent bg-accent-dim/30'
              : 'border-border-subtle text-text-muted hover:text-text-primary hover:border-border-light',
          ].join(' ')}
          title={
            filters.shuffleSeed !== null
              ? 'Re-shuffle (click again for a new order)'
              : 'Shuffle preset order'
          }
          aria-pressed={filters.shuffleSeed !== null}
          data-testid="gallery-grid-shuffle"
        >
          <span aria-hidden="true">⇅</span>
          {' '}Shuffle
        </button>

        {filters.shuffleSeed !== null && (
          <button
            type="button"
            onClick={() => update('shuffleSeed', null)}
            className="px-2 py-0.5 rounded text-ui-xs font-mono uppercase text-text-muted hover:text-text-primary border border-border-subtle hover:border-border-light transition-colors"
            title="Restore default order"
          >
            Reset
          </button>
        )}
      </span>
    </div>
  );
}

// ─── Toolbar filter primitive ─────────────────────────────────────────────

interface FilterOption<T extends string> {
  id: T;
  label: string;
}

function ToolbarFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (v: T) => void;
}): JSX.Element {
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={label}
    >
      <span className="font-mono uppercase text-[9px] text-text-muted tracking-[0.10em] mr-0.5">
        {label}
      </span>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={[
              'px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.06em]',
              'border transition-colors',
              active
                ? 'border-accent-border text-accent bg-accent-dim/30'
                : 'border-border-subtle text-text-muted hover:text-text-primary hover:border-border-light',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Grid card ─────────────────────────────────────────────────────────────
//
// A single preset card in the grid. Hover-to-tick performance pattern:
//   - IntersectionObserver tracks `inView`. While not in view, the card
//     mounts a static placeholder silhouette and never instantiates the
//     BladeEngine.
//   - Once in view, MiniSaber mounts. `animated` is gated on
//     `inView && isHovered`. In view but not hovered → engine runs once
//     to warm the steady ignited state, then freezes (zero per-frame CPU).
//   - On hover, animated = true → engine ticks at 30fps.
//
// This matches the landing page's MarqueeCard pattern exactly so dozens
// of cards on screen don't tank FPS.

interface GalleryGridCardProps {
  preset: Preset;
  onClick: () => void;
}

function GalleryGridCard({
  preset,
  onClick,
}: GalleryGridCardProps): JSX.Element {
  const cardRef = useRef<HTMLLIElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    // 200px rootMargin: pre-mount cards just before they scroll into view
    // and keep them animated slightly after they leave so quick scrolls
    // never flash "frozen" at the visible edges.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const intersecting = entry.isIntersecting;
          setInView(intersecting);
          if (intersecting) setMounted(true);
        }
      },
      { rootMargin: '200px 200px 200px 200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { r, g, b } = preset.config.baseColor;
  const accentCss = `rgb(${r}, ${g}, ${b})`;
  const continuity = presetContinuity(preset);
  const isLegends = continuity === 'legends';

  // Hover treatment: brighter accent border + outer halo. Inset shadow
  // simulates a 2px border without changing the actual border thickness
  // (which would cause a 1px layout twitch).
  const cardStyle: CSSProperties = {
    width: 200,
    minHeight: 360,
    borderColor: isHovered
      ? `rgba(${r}, ${g}, ${b}, 0.85)`
      : 'rgb(var(--border-subtle))',
    transition:
      'border-color 600ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 600ms cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: isHovered
      ? `inset 0 0 0 1px rgba(${r}, ${g}, ${b}, 0.6), 0 0 36px 2px rgba(${r}, ${g}, ${b}, 0.36)`
      : 'none',
  };

  return (
    <li
      ref={cardRef}
      data-preset-id={preset.id}
      data-testid={`gallery-grid-card-${preset.id}`}
      className="relative shrink-0 flex flex-col rounded-lg border bg-bg-card/60 backdrop-blur-sm overflow-hidden cursor-pointer focus-within:ring-2 focus-within:ring-accent"
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        className="absolute inset-0 z-10 cursor-pointer focus:outline-none"
        aria-label={`Open ${preset.name} details`}
      />

      {/* Decorative accent halo — purely cosmetic */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 35% 70% at center, ${accentCss} 0%, transparent 65%)`,
          opacity: isHovered ? 0.22 : 0.1,
          filter: 'blur(24px)',
          transition: 'opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Saber region — ~280px tall slot, blade visible at idle */}
      <div
        className="relative flex items-end justify-center w-full pt-5"
        style={{ minHeight: 280 }}
      >
        {mounted ? (
          <MiniSaber
            config={preset.config as BladeConfig}
            hiltId="graflex"
            orientation="vertical"
            bladeLength={220}
            bladeThickness={5}
            hiltLength={64}
            controlledIgnited={true}
            animated={inView && isHovered}
            fps={30}
            ariaLabel={`${preset.name} blade preview`}
          />
        ) : (
          <GridCardPlaceholder accentCss={accentCss} />
        )}
      </div>

      {/* Title + subtitle region */}
      <div className="relative text-center pb-3 px-3 pt-2 flex-1 flex flex-col justify-end">
        <div className="font-cinematic text-ui-base font-bold tracking-[0.06em] text-text-primary truncate">
          {preset.name}
        </div>
        <div className="text-ui-xs text-text-muted font-mono mt-0.5 truncate">
          {preset.character}
        </div>
        {/* Era + faction badges */}
        <div
          className="mt-1.5 inline-flex items-center justify-center gap-1"
          aria-hidden="true"
        >
          <EraBadge era={preset.era} legends={isLegends} size="sm" />
          <FactionBadge faction={preset.affiliation} size="sm" />
        </div>
      </div>
    </li>
  );
}

// Static silhouette shown until IntersectionObserver scrolls the card in.
// Sized roughly the same as the rendered MiniSaber so the visual swap is
// minimal (and certainly does not shift the card layout).
function GridCardPlaceholder({ accentCss }: { accentCss: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-0">
      <div
        aria-hidden="true"
        style={{
          width: 5,
          height: 220,
          background: accentCss,
          opacity: 0.32,
          borderRadius: '2.5px 2.5px 0 0',
          filter: `drop-shadow(0 0 6px ${accentCss}) drop-shadow(0 0 18px ${accentCss})`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          width: 14,
          height: 64,
          background:
            'linear-gradient(180deg, #3a3a3e 0%, #26262a 60%, #16161a 100%)',
        }}
      />
    </div>
  );
}
