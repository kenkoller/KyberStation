'use client';

// ─── GalleryColumnA — Sidebar A/B v2 Phase 4 (gallery) ─────────────────
//
// Column A of the /gallery route's A/B layout. Hosts the filter rail at
// the top and a scrollable list of preset rows below.
//
// Compared to the legacy `GalleryPage` portrait-card grid, each row here
// is condensed:
//   - Color stripe on the left (4px, baseColor)
//   - Title + character on a single line (truncated)
//   - Era + faction monogram badges at the right
//   - Selected row uses a left-edge accent + bg-accent-dim wash
//
// 305 entries in a 280–400px column reads as a list, not a grid — that's
// the established Phase 4 pattern (audio fonts, modulation bindings, etc).
// Hero blade preview lives in Column B.
//
// Filter + selection state is owned by the parent `GalleryAB` wrapper;
// this component is a controlled view over that state.

import { useCallback, useEffect, useId } from 'react';
import type { Preset } from '@kyberstation/presets';
import { ALL_PRESETS } from '@kyberstation/presets';
import { EraBadge, FactionBadge } from '@/components/shared/StatusSignal';
import { useUserPresetStore, type UserPreset } from '@/stores/userPresetStore';
import { useBladeStore } from '@/stores/bladeStore';
import { toast } from '@/lib/toastManager';
import {
  type GalleryFilters,
  type EraFilter,
  type FactionFilter,
  type ColorFilter,
  type StyleFilter,
  type ContinuityFilter,
  presetContinuity,
} from './galleryAB.types';

export interface GalleryColumnAProps {
  filters: GalleryFilters;
  onFiltersChange: (next: GalleryFilters) => void;
  filtered: readonly Preset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function GalleryColumnA({
  filters,
  onFiltersChange,
  filtered,
  selectedId,
  onSelect,
}: GalleryColumnAProps): JSX.Element {
  const searchInputId = useId();

  // ── User presets (My Presets) ──
  const userPresets = useUserPresetStore((s) => s.presets);
  const isLoadingPresets = useUserPresetStore((s) => s.isLoading);
  const hydratePresets = useUserPresetStore((s) => s.hydrate);
  const deletePreset = useUserPresetStore((s) => s.deletePreset);
  const loadPreset = useBladeStore((s) => s.loadPreset);

  // Hydrate user presets from IndexedDB on mount
  useEffect(() => {
    hydratePresets();
  }, [hydratePresets]);

  const handleLoadUserPreset = useCallback(
    (preset: UserPreset) => {
      loadPreset(preset.config);
      toast.success(`Loaded "${preset.name}"`);
    },
    [loadPreset],
  );

  const handleDeleteUserPreset = useCallback(
    (preset: UserPreset) => {
      const confirmed = window.confirm(
        `Delete "${preset.name}"? This cannot be undone.`,
      );
      if (!confirmed) return;
      deletePreset(preset.id);
      toast.success(`Deleted "${preset.name}"`);
    },
    [deletePreset],
  );

  const update = <K extends keyof GalleryFilters>(
    key: K,
    value: GalleryFilters[K],
  ) => onFiltersChange({ ...filters, [key]: value });

  return (
    <div
      className="flex flex-col h-full"
      data-testid="gallery-column-a"
    >
      {/* Filter rail — sticky top */}
      <div
        className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0 space-y-2"
        data-testid="gallery-column-a-filters"
      >
        <input
          id={searchInputId}
          type="search"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder={`Search ${ALL_PRESETS.length} presets…`}
          className="w-full bg-bg-surface border border-border-subtle rounded px-2 py-1 text-ui-xs font-mono placeholder:text-text-muted/60 focus:border-accent-border outline-none"
          aria-label="Search presets"
        />

        <FilterRow<EraFilter>
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

        <FilterRow<FactionFilter>
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

        <FilterRow<ColorFilter>
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

        <FilterRow<StyleFilter>
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

        <FilterRow<ContinuityFilter>
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

        {/* Star-Wars-only toggle — purist mode hides pop-culture + mythology
            + showcase entries, leaving canon + legends + creative variants. */}
        <label
          className="flex items-center gap-2 px-1 py-0.5 cursor-pointer text-ui-xs font-mono uppercase tracking-[0.08em] text-text-muted hover:text-text-primary select-none"
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

        {/* Footer line: count + shuffle controls */}
        <div className="flex items-center gap-2 pt-1">
          <span
            className="text-ui-xs font-mono text-text-muted tabular-nums"
            aria-live="polite"
            data-testid="gallery-column-a-count"
          >
            {filtered.length} / {ALL_PRESETS.length}
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
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
      </div>

      {/* Scrollable list body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ── My Presets section ── */}
        <div
          className="border-b border-border-subtle"
          data-testid="my-presets-section"
        >
          <div className="px-3 py-2 flex items-center justify-between bg-bg-deep/30">
            <span className="font-mono uppercase text-[10px] text-text-muted tracking-[0.10em]">
              My Presets
            </span>
            <span className="text-[10px] font-mono text-text-muted tabular-nums">
              {isLoadingPresets ? '...' : userPresets.length}
            </span>
          </div>
          {isLoadingPresets ? (
            <div className="px-3 py-3 text-ui-xs text-text-muted">
              Loading...
            </div>
          ) : userPresets.length === 0 ? (
            <div className="px-3 py-4 text-center" data-testid="my-presets-empty">
              <span className="text-ui-xs text-text-muted leading-relaxed">
                No saved presets yet. Use the Save button in the action bar to save your current design.
              </span>
            </div>
          ) : (
            <ul
              aria-label="My saved presets"
              className="divide-y divide-border-subtle/40"
              data-testid="my-presets-list"
            >
              {userPresets.map((preset) => (
                <UserPresetRow
                  key={preset.id}
                  preset={preset}
                  onLoad={() => handleLoadUserPreset(preset)}
                  onDelete={() => handleDeleteUserPreset(preset)}
                />
              ))}
            </ul>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="px-3 py-6 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-ui-sm text-text-secondary font-medium">
              No presets match
            </span>
            <span className="text-ui-xs text-text-muted leading-relaxed max-w-[240px]">
              Try clearing a filter or adjusting your search query.
            </span>
          </div>
        ) : (
          <ul
            role="listbox"
            aria-label="Preset library"
            aria-activedescendant={
              selectedId ? `gallery-row-${selectedId}` : undefined
            }
            className="divide-y divide-border-subtle/40"
          >
            {filtered.map((preset) => (
              <PresetRow
                key={preset.id}
                preset={preset}
                isSelected={preset.id === selectedId}
                onSelect={() => onSelect(preset.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Filter row primitive ─────────────────────────────────────────────

interface FilterOption<T extends string> {
  id: T;
  label: string;
}

function FilterRow<T extends string>({
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
      className="flex items-center gap-1 flex-wrap"
      role="group"
      aria-label={label}
    >
      {/* w-14 (56px) gives 5–6 char labels ("COLOR" / "STYLE" / "SOURCE") room
          to breathe — w-10 (40px) was too tight for the 0.10em letter-spacing
          and label text bled into the first toggle pill (Bug fix 2026-04-30). */}
      <span className="font-mono uppercase text-[9px] text-text-muted tracking-[0.10em] w-14 shrink-0">
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

// ─── Preset row ───────────────────────────────────────────────────────

interface PresetRowProps {
  preset: Preset;
  isSelected: boolean;
  onSelect: () => void;
}

function PresetRow({
  preset,
  isSelected,
  onSelect,
}: PresetRowProps): JSX.Element {
  const { r, g, b } = preset.config.baseColor;
  const stripeColor = `rgb(${r}, ${g}, ${b})`;
  const continuity = presetContinuity(preset);
  const isLegends = continuity === 'legends';

  return (
    <li
      id={`gallery-row-${preset.id}`}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        'flex items-center gap-2 px-3 py-2 cursor-pointer outline-none border-l-2 transition-colors',
        'focus-visible:bg-bg-surface/80',
        isSelected
          ? 'bg-accent-dim/30 border-l-accent text-accent'
          : 'border-l-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary',
      ].join(' ')}
      style={
        !isSelected
          ? { boxShadow: `inset 3px 0 0 ${stripeColor}` }
          : undefined
      }
      data-preset-id={preset.id}
    >
      <div className="flex-1 min-w-0">
        <div className="text-ui-xs font-medium truncate" title={preset.name}>
          {preset.name}
        </div>
        <div
          className="text-[10px] text-text-muted truncate"
          title={preset.character}
        >
          {preset.character}
        </div>
      </div>

      <div
        className="shrink-0 inline-flex items-center gap-1"
        aria-hidden="true"
      >
        <EraBadge era={preset.era} legends={isLegends} size="sm" />
        <FactionBadge faction={preset.affiliation} size="sm" />
      </div>
    </li>
  );
}

// ─── User preset row ─────────────────────────────────────────────────

interface UserPresetRowProps {
  preset: UserPreset;
  onLoad: () => void;
  onDelete: () => void;
}

function UserPresetRow({
  preset,
  onLoad,
  onDelete,
}: UserPresetRowProps): JSX.Element {
  const { r, g, b } = preset.config.baseColor;
  const swatchColor = `rgb(${r}, ${g}, ${b})`;

  return (
    <li
      className="flex items-center gap-2 px-3 py-2 cursor-pointer outline-none border-l-2 border-l-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary transition-colors focus-visible:bg-bg-surface/80"
      tabIndex={0}
      onClick={onLoad}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onLoad();
        }
      }}
      style={{ boxShadow: `inset 3px 0 0 ${swatchColor}` }}
      data-testid={`user-preset-row-${preset.id}`}
    >
      {/* Color swatch */}
      <span
        className="shrink-0 w-3 h-3 rounded-full border border-border-subtle"
        style={{ backgroundColor: swatchColor }}
        aria-hidden="true"
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-ui-xs font-medium truncate" title={preset.name}>
          {preset.name}
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 text-text-muted hover:text-red-400 transition-colors p-0.5"
        title={`Delete "${preset.name}"`}
        aria-label={`Delete "${preset.name}"`}
        data-testid={`delete-user-preset-${preset.id}`}
      >
        <span aria-hidden="true" className="text-[10px]">
          x
        </span>
      </button>
    </li>
  );
}
