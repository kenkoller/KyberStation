'use client';

// ─── ColorRail — Phase 4.3 (2026-04-30) ─────────────────────────────────────
//
// Per "Claude Design Mobile handoff/HANDOFF.md" §"Concerns 6":
//   - 8 swatches at the top of the Color tab body
//   - `border-radius: 50%` (circles) so they don't visually compete
//     with the Style chip rectangles
//   - "+12" overflow button at the end → opens the deep ColorPanel for
//     the long-tail palette and HSL editor
//
// Each swatch sets `bladeStore.config.baseColor` directly. The default
// 8 are drawn from the canonical CSS variable palette so theme-aware
// accents read cleanly across light + dark.

import { useBladeStore } from '@/stores/bladeStore';
import { playUISound } from '@/lib/uiSounds';

interface SwatchDef {
  id: string;
  /** Display label for screen readers. */
  label: string;
  /** RGB triple — also shown as a tooltip on long-press. */
  rgb: { r: number; g: number; b: number };
}

/**
 * Canonical 8 — handpicked saber-relevant colors covering the
 * faction spectrum. Mirrors the v1-synthesis ColorRail palette.
 */
export const COLOR_RAIL_SWATCHES: ReadonlyArray<SwatchDef> = [
  { id: 'jedi-blue', label: 'Jedi Blue', rgb: { r: 74, g: 158, b: 255 } },
  { id: 'sith-red', label: 'Sith Red', rgb: { r: 255, g: 91, b: 91 } },
  { id: 'jedi-green', label: 'Jedi Green', rgb: { r: 34, g: 197, b: 94 } },
  { id: 'mace-amethyst', label: 'Amethyst', rgb: { r: 167, g: 139, b: 250 } },
  { id: 'amber', label: 'Sentinel Amber', rgb: { r: 251, g: 191, b: 36 } },
  { id: 'magenta', label: 'Magenta', rgb: { r: 232, g: 121, b: 249 } },
  { id: 'orange', label: 'Lava Orange', rgb: { r: 249, g: 115, b: 22 } },
  { id: 'cyan', label: 'Ice Cyan', rgb: { r: 34, g: 211, b: 238 } },
];

interface ColorRailProps {
  /** Called when the "+ more" overflow button is tapped — host opens
   *  the deep Color section editor. */
  onOpenMore?: () => void;
}

function rgbDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

export function ColorRail({ onOpenMore }: ColorRailProps = {}) {
  const baseColor = useBladeStore((s) => s.config.baseColor);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  // Pick the closest swatch to the current baseColor as the active one.
  // Squared euclidean distance in RGB space — cheap and good enough for
  // a 8-color rail (proper visual nearest-color would use Lab).
  let activeIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < COLOR_RAIL_SWATCHES.length; i++) {
    const d = rgbDistance(baseColor, COLOR_RAIL_SWATCHES[i].rgb);
    if (d < bestDist) {
      bestDist = d;
      activeIdx = i;
    }
  }
  // If the current color is far from every swatch (>~12 channel-units
  // away on each axis squared) treat as "custom" and don't highlight.
  if (bestDist > 4500) activeIdx = -1;

  function handleSwatchClick(i: number) {
    const sw = COLOR_RAIL_SWATCHES[i];
    playUISound('button-click');
    updateConfig({ baseColor: { ...sw.rgb } });
  }

  return (
    <div
      className="color-rail w-full flex items-center gap-2 px-3 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-bg-primary border-b border-border-subtle"
      role="group"
      aria-label="Quick color picker"
    >
      {COLOR_RAIL_SWATCHES.map((sw, i) => {
        const active = i === activeIdx;
        const cssRgb = `rgb(${sw.rgb.r} ${sw.rgb.g} ${sw.rgb.b})`;
        return (
          <button
            key={sw.id}
            type="button"
            onClick={() => handleSwatchClick(i)}
            aria-label={`Set blade color to ${sw.label}`}
            aria-pressed={active}
            data-swatch-id={sw.id}
            data-active={active || undefined}
            className={[
              'shrink-0 rounded-full border-2 transition-all',
              active
                ? 'border-accent scale-110'
                : 'border-border-subtle hover:border-border-light',
            ].join(' ')}
            style={{
              width: 32,
              height: 32,
              background: cssRgb,
              boxShadow: active ? `0 0 12px ${cssRgb}` : `0 0 6px ${cssRgb}88`,
            }}
            title={sw.label}
          />
        );
      })}

      {/* Overflow trigger — opens the deep ColorPanel. Phase 4.3 just
          calls the host callback; v1.x will scroll/anchor to the panel.
          Visual: pill, not circle, so it's clearly a different
          affordance from the swatches. */}
      <button
        type="button"
        onClick={() => {
          playUISound('button-click');
          onOpenMore?.();
        }}
        aria-label="Open full color picker"
        className="shrink-0 px-3 rounded-interactive border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light text-[10px] font-mono uppercase tracking-[0.1em] bg-bg-surface"
        style={{ height: 32 }}
        data-color-rail-more
      >
        + More
      </button>
    </div>
  );
}
