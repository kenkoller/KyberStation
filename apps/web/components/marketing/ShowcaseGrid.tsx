'use client';

import { useMemo, useState } from 'react';
import type { Preset, Era, Affiliation } from '@kyberstation/presets';
import { PresetCard } from './PresetCard';

type EraFilter = 'all' | Era;
type FactionFilter = 'all' | Affiliation;

interface ShowcaseGridProps {
  presets: ReadonlyArray<Preset>;
}

const ERA_FILTERS: ReadonlyArray<{ value: EraFilter; label: string }> = [
  { value: 'all', label: 'All eras' },
  { value: 'prequel', label: 'Prequel' },
  { value: 'original-trilogy', label: 'Original' },
  { value: 'sequel', label: 'Sequel' },
  { value: 'animated', label: 'Animated' },
  { value: 'expanded-universe', label: 'EU / Legends' },
];

const FACTION_FILTERS: ReadonlyArray<{ value: FactionFilter; label: string }> = [
  { value: 'all', label: 'All affiliations' },
  { value: 'jedi', label: 'Jedi' },
  { value: 'sith', label: 'Sith' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'other', label: 'Other' },
];

export function ShowcaseGrid({ presets }: ShowcaseGridProps) {
  const [era, setEra] = useState<EraFilter>('all');
  const [faction, setFaction] = useState<FactionFilter>('all');
  const [screenOnly, setScreenOnly] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return presets.filter((p) => {
      if (era !== 'all' && p.era !== era) return false;
      if (faction !== 'all' && p.affiliation !== faction) return false;
      if (screenOnly && !p.screenAccurate) return false;
      if (q) {
        const hay = `${p.name} ${p.character} ${p.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [presets, era, faction, screenOnly, search]);

  const clearAll = () => {
    setEra('all');
    setFaction('all');
    setScreenOnly(false);
    setSearch('');
  };

  const anyActive =
    era !== 'all' || faction !== 'all' || screenOnly || search.trim() !== '';

  return (
    <div>
      <div
        className="sticky top-14 z-20 border-y border-border-subtle backdrop-blur-md py-4 mb-6"
        style={{ background: 'rgb(var(--bg-primary) / 0.8)' }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-8 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative flex-1 min-w-[200px]">
              <span className="sr-only">Search presets</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, character, or word..."
                className="w-full px-3 py-2 rounded-[2px] text-[13px] font-mono bg-bg-surface border border-border-subtle text-text-primary placeholder:text-text-muted focus:border-accent/40 focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-2 text-[12px] text-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={screenOnly}
                onChange={(e) => setScreenOnly(e.target.checked)}
                className="accent-accent"
              />
              <span>Screen-accurate only</span>
            </label>

            {anyActive && (
              <button
                type="button"
                onClick={clearAll}
                className="dot-matrix tabular-nums text-text-muted hover:text-text-primary transition-colors px-2 py-1"
              >
                CLEAR ALL ×
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <FilterRow
              label="Era"
              options={ERA_FILTERS}
              value={era}
              onChange={setEra}
            />
            <FilterRow
              label="Affiliation"
              options={FACTION_FILTERS}
              value={faction}
              onChange={setFaction}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="mb-5 dot-matrix tabular-nums flex flex-wrap gap-x-3">
          <span>{filtered.length}</span>
          <span className="text-text-muted">·</span>
          <span>
            {filtered.length === 1 ? 'PRESET SHOWN' : 'PRESETS SHOWN'}
          </span>
          <span className="text-text-muted">·</span>
          <span>{presets.length} TOTAL</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div
              className="dot-matrix mb-3"
              style={{ color: 'rgb(var(--status-warn))' }}
            >
              NO MATCHES
            </div>
            <p className="text-text-secondary text-sm">
              Try clearing a filter, or{' '}
              <button
                type="button"
                onClick={clearAll}
                className="text-accent hover:underline"
              >
                reset everything
              </button>
              .
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 pb-16">
            {filtered.map((preset) => (
              <PresetCard key={preset.id} preset={preset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterRowProps<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: FilterRowProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="dot-matrix tabular-nums whitespace-nowrap mr-1"
        style={{ color: 'rgb(var(--accent) / 0.7)' }}
      >
        {label}
      </span>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-3 py-1 rounded-[2px] text-[11px] font-mono uppercase tracking-[0.1em] transition-colors"
            style={{
              background: active
                ? 'rgb(var(--accent) / 0.15)'
                : 'transparent',
              border: active
                ? '1px solid rgb(var(--accent) / 0.4)'
                : '1px solid var(--border-subtle)',
              color: active
                ? 'rgb(var(--accent))'
                : 'rgb(var(--text-secondary))',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
