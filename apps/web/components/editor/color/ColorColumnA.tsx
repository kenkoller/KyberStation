'use client';

// ─── ColorColumnA — Sidebar A/B v2 Phase 3 ────────────────────────────
//
// Channel tabs (Base / Clash / Lockup / Blast) sticky at the top, then
// 24-canon-color preset rows scrolling below. Replaces the inline
// channel button row + preset grid in legacy `ColorPanel.tsx` (the
// off-flag fallback) with a focused list-of-presets surface.
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.2:
//   - Channel tabs sticky at top (always visible; choose which channel
//     `setColor` writes to)
//   - Below: 24 canon-color preset rows. Each: 24×24 swatch + label.
//   - Active row: matches whichever channel's color is closest to a
//     canonical preset (using the existing colorsMatch ±5 epsilon).
//
// Selecting a preset writes the chip's RGB into the active channel via
// `bladeStore.setColor`. We deliberately skip the auto-suggest clash /
// lockup behavior that legacy ColorPanel applied on Base presets — that
// lives in Column B's "Auto-Suggest" surface so users opt-in rather
// than having clash/lockup silently overwritten on every preset click.

import { useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { playUISound } from '@/lib/uiSounds';
import {
  COLOR_PRESETS,
  COLOR_CHANNELS,
  colorsMatch,
  type ColorPreset,
} from './colorCatalog';

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function ColorColumnA(): JSX.Element {
  const config = useBladeStore((s) => s.config);
  const setColor = useBladeStore((s) => s.setColor);
  const activeChannel = useUIStore((s) => s.activeColorChannel);
  const setActiveChannel = useUIStore((s) => s.setActiveColorChannel);

  // Coerce non-canonical channels (legacy `dragColor` etc.) back to
  // baseColor so the tab strip stays responsive even on stale state.
  const isCanonicalChannel = COLOR_CHANNELS.some((c) => c.key === activeChannel);
  const effectiveChannel = isCanonicalChannel ? activeChannel : 'baseColor';

  // Resolve the channel's current color so we can highlight the
  // matching preset row (if any).
  const channelColor = (config as Record<string, unknown>)[effectiveChannel] as
    | { r: number; g: number; b: number }
    | undefined;

  const handlePresetClick = useCallback(
    (preset: ColorPreset) => {
      playUISound('button-click');
      setColor(effectiveChannel, preset.color);
    },
    [effectiveChannel, setColor],
  );

  return (
    <div className="flex flex-col h-full" data-testid="color-column-a">
      {/* Sticky channel tabs — pinned at the top of A. */}
      <div
        className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0 sticky top-0 z-10"
        role="tablist"
        aria-label="Color channel"
      >
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_CHANNELS.map((ch) => {
            const channelDisplayColor =
              ((config as Record<string, unknown>)[ch.key] as
                | { r: number; g: number; b: number }
                | undefined) ?? { r: 128, g: 128, b: 128 };
            const isActive = effectiveChannel === ch.key;
            return (
              <button
                key={ch.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveChannel(ch.key)}
                className={[
                  'flex items-center gap-1.5 px-2 py-1 rounded text-ui-sm border transition-colors',
                  isActive
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light',
                ].join(' ')}
                title={ch.description}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                  style={{
                    backgroundColor: rgbToHex(
                      channelDisplayColor.r,
                      channelDisplayColor.g,
                      channelDisplayColor.b,
                    ),
                  }}
                  aria-hidden="true"
                />
                {ch.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset list — scrolls below the sticky tabs. */}
      <ul
        role="listbox"
        aria-label="Canon color presets"
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {COLOR_PRESETS.map((preset) => {
          const isActive = colorsMatch(channelColor, preset.color);
          const hex = rgbToHex(preset.color.r, preset.color.g, preset.color.b);
          return (
            <li
              key={preset.id}
              id={`color-preset-row-${preset.id}`}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => handlePresetClick(preset)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePresetClick(preset);
                }
              }}
              className={[
                'flex items-center gap-2.5 px-3 py-2 cursor-pointer outline-none border-l-2 transition-colors',
                'focus-visible:bg-bg-surface/80',
                isActive
                  ? 'bg-accent-dim/30 border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary',
              ].join(' ')}
            >
              {/* 24×24 color swatch */}
              <span
                className="shrink-0 w-6 h-6 rounded border border-white/15"
                style={{ backgroundColor: hex }}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <div
                  className={[
                    'text-ui-sm font-medium truncate',
                    isActive ? 'text-accent' : 'text-text-primary',
                  ].join(' ')}
                >
                  {preset.label}
                </div>
                <div className="text-ui-xs text-text-muted truncate font-mono">
                  Rgb&lt;{preset.color.r},{preset.color.g},{preset.color.b}&gt;
                </div>
              </div>
              {/* Category badge */}
              <span
                className={[
                  'shrink-0 text-ui-xs uppercase tracking-wider px-1.5 py-0.5 rounded font-mono',
                  preset.category === 'jedi'
                    ? 'text-text-muted'
                    : preset.category === 'sith'
                    ? 'text-text-muted'
                    : 'text-text-muted',
                ].join(' ')}
              >
                {preset.category}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
