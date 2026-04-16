'use client';

import { useState, useMemo } from 'react';
import { CANVAS_THEMES } from '../../lib/canvasThemes';
import { playUISound } from '@/lib/uiSounds';
import {
  EXTENDED_LOCATION_THEMES,
  EXTENDED_FACTION_THEMES,
  type ExtendedCanvasTheme,
} from '../../lib/extendedThemes';
import { ThemePreviewCard } from './ThemePreviewCard';

type ThemeCategory = 'all' | 'locations' | 'factions';

interface ThemePickerPanelProps {
  activeThemeId: string;
  onSelectTheme: (themeId: string) => void;
  className?: string;
}

/**
 * Theme picker panel with category filtering and search.
 *
 * Displays all available themes (base 9 + 12 extended locations + 9 factions)
 * in a browsable grid with category tabs.
 */
export function ThemePickerPanel({
  activeThemeId,
  onSelectTheme,
  className = '',
}: ThemePickerPanelProps) {
  const [category, setCategory] = useState<ThemeCategory>('all');
  const [search, setSearch] = useState('');

  // Merge base themes as "location" category for display purposes
  const baseAsExtended: ExtendedCanvasTheme[] = useMemo(
    () =>
      CANVAS_THEMES.map((t) => ({
        ...t,
        category: 'location' as const,
        description: '',
        material: {
          surfaceStyle: 'matte' as const,
          panelOpacity: 0.92,
          borderStyle: 'subtle' as const,
          cornerStyle: 'rounded' as const,
        },
        ambient: {
          particleDensity: 0.3,
          particleColor: 'rgba(180, 200, 255, 0.3)',
          scanSweep: false,
          scanColor: 'rgba(180, 200, 255, 0)',
          consoleBlinkRate: 0,
          gridAnimated: false,
          hudStyle: 'minimal' as const,
        },
      })),
    [],
  );

  const allThemes = useMemo(
    () => [...baseAsExtended, ...EXTENDED_LOCATION_THEMES, ...EXTENDED_FACTION_THEMES],
    [baseAsExtended],
  );

  const filteredThemes = useMemo(() => {
    let themes = allThemes;

    // Category filter
    if (category === 'locations') {
      themes = themes.filter((t) => t.category === 'location');
    } else if (category === 'factions') {
      themes = themes.filter((t) => t.category === 'faction');
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      themes = themes.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }

    return themes;
  }, [allThemes, category, search]);

  const counts = useMemo(
    () => ({
      all: allThemes.length,
      locations: allThemes.filter((t) => t.category === 'location').length,
      factions: allThemes.filter((t) => t.category === 'faction').length,
    }),
    [allThemes],
  );

  const tabs: { id: ThemeCategory; label: string; count: number }[] = [
    { id: 'all', label: 'ALL', count: counts.all },
    { id: 'locations', label: 'LOCATIONS', count: counts.locations },
    { id: 'factions', label: 'FACTIONS', count: counts.factions },
  ];

  return (
    <div
      className={`flex flex-col gap-3 ${className}`}
      style={{ maxHeight: '100%', overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="dot-matrix"
          style={{ fontSize: 'calc(9px * var(--font-scale))' }}
        >
          SCENE THEME
        </span>
        <span className="dot-matrix" style={{ opacity: 0.5 }}>
          {filteredThemes.length}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategory(tab.id)}
            className="btn-hum corner-rounded no-aurebesh"
            style={{
              padding: '4px 8px',
              fontSize: 'calc(8px * var(--font-scale))',
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.08em',
              cursor: 'pointer',
              border:
                category === tab.id
                  ? '1px solid rgb(var(--accent) / 0.4)'
                  : '1px solid var(--border-subtle)',
              background:
                category === tab.id
                  ? 'var(--accent-dim)'
                  : 'transparent',
              color:
                category === tab.id
                  ? 'rgb(var(--accent))'
                  : 'rgb(var(--text-muted))',
              transition: 'all 150ms ease',
            }}
          >
            {tab.label}
            <span style={{ opacity: 0.5, marginLeft: 4 }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search themes..."
        className="corner-rounded no-aurebesh"
        style={{
          padding: '6px 10px',
          fontSize: 'calc(10px * var(--font-scale))',
          fontFamily: "'IBM Plex Mono', monospace",
          background: 'rgb(var(--bg-deep))',
          border: '1px solid var(--border-subtle)',
          color: 'rgb(var(--text-primary))',
          outline: 'none',
        }}
      />

      {/* Theme grid */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 8,
          paddingBottom: 8,
        }}
      >
        {filteredThemes.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            isActive={activeThemeId === theme.id}
            onClick={() => { playUISound('theme-switch'); onSelectTheme(theme.id); }}
          />
        ))}

        {filteredThemes.length === 0 && (
          <div
            className="text-ui-sm col-span-full text-center py-6"
            style={{ color: 'rgb(var(--text-muted))' }}
          >
            No themes match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
