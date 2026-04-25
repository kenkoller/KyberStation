// ─── QuickColorChips — canonical saber-color chip row ───
//
// v0.14.0 Quick Controls expansion (PR 3a): a single-row of 8 canonical
// saber-color chips + a 9th "Custom..." affordance, mounted at the top
// of the Inspector's Quick Controls area.
//
// Clicking a chip writes the color into whichever channel is currently
// active in the Inspector (read from `uiStore.activeColorChannel`) via
// `bladeStore.setColor`. The Custom... chip jumps to the deep Color
// sidebar section (PR 5b) so users who want HSL / hex / harmony / preset
// access don't have to hunt for it — one click takes them to the full
// editor for the same active channel.
//
// Canonical color values below are locked to film/hobbyist standards;
// do not drift them without coordinating with the preset library.

'use client';

import { useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';

// ─── Canonical color set ───
//
// Film-canonical / hobbyist-standard saber colors. Matches the
// high-traffic entries from `ColorPanel`'s preset library and the
// default `baseColor` seed in `bladeStore` (Obi-Wan ANH blue). Exported
// so downstream consumers (tests, docs, future custom-color popover)
// can reference the same id/name/RGB triples.

export interface QuickColorChip {
  id: string;
  name: string;
  rgb: { r: number; g: number; b: number };
}

export const QUICK_COLORS: ReadonlyArray<QuickColorChip> = [
  { id: 'blue',   name: 'Blue',   rgb: { r: 0,   g: 140, b: 255 } },
  { id: 'red',    name: 'Red',    rgb: { r: 255, g: 30,  b: 20  } },
  { id: 'green',  name: 'Green',  rgb: { r: 30,  g: 255, b: 30  } },
  { id: 'yellow', name: 'Yellow', rgb: { r: 255, g: 210, b: 40  } },
  { id: 'purple', name: 'Purple', rgb: { r: 170, g: 60,  b: 240 } },
  { id: 'orange', name: 'Orange', rgb: { r: 255, g: 120, b: 20  } },
  { id: 'white',  name: 'White',  rgb: { r: 240, g: 240, b: 255 } },
  { id: 'cyan',   name: 'Cyan',   rgb: { r: 20,  g: 230, b: 255 } },
];

// ─── Channel → label mapping ───
//
// The readout above the chips shows `COLOR · ${channelLabel}` where
// channelLabel is the short 'BASE' / 'CLASH' / 'LOCKUP' / 'BLAST' form
// used elsewhere in the codebase (matches `COLOR_CHANNELS` in
// ColorPanel.tsx). Legacy / unknown channel IDs fall back to 'BASE' so
// the chips remain usable on stale-state reloads.

const CHANNEL_LABELS: Readonly<Record<string, string>> = {
  baseColor: 'BASE',
  clashColor: 'CLASH',
  lockupColor: 'LOCKUP',
  blastColor: 'BLAST',
};

function channelLabelOf(channel: string): string {
  return CHANNEL_LABELS[channel] ?? 'BASE';
}

// ─── Active-match epsilon ───
//
// The chips render the active-color ring when the channel's color is
// "close enough" to the chip's canonical RGB. We accept a small per-
// channel delta (≤5) so that users who slightly tweaked a canonical
// color (via HSL sliders) still see the matching chip highlighted —
// the chip-click is the authoritative equality, but visual match is
// more forgiving.

const EPSILON = 5;

function colorsMatch(
  a: { r: number; g: number; b: number } | undefined,
  b: { r: number; g: number; b: number },
): boolean {
  if (!a) return false;
  return (
    Math.abs(a.r - b.r) <= EPSILON &&
    Math.abs(a.g - b.g) <= EPSILON &&
    Math.abs(a.b - b.b) <= EPSILON
  );
}

// ─── Component ───

export function QuickColorChips() {
  const config = useBladeStore((s) => s.config);
  const setColor = useBladeStore((s) => s.setColor);
  const activeChannel = useUIStore((s) => s.activeColorChannel);
  const setActiveSection = useUIStore((s) => s.setActiveSection);

  // Resolve the channel's current color for active-chip highlighting.
  // `config` is typed as BladeConfig in the store; cast through Record
  // to read the dynamic channel key (matches ColorPanel.tsx:277).
  const channelColor = (config as Record<string, unknown>)[activeChannel] as
    | { r: number; g: number; b: number }
    | undefined;

  const channelLabel = channelLabelOf(activeChannel);

  const handleChipClick = useCallback(
    (chip: QuickColorChip) => {
      setColor(activeChannel, chip.rgb);
    },
    [activeChannel, setColor],
  );

  // PR 5b: Custom chip jumps to the deep Color sidebar section. The
  // active channel carries over via uiStore (ColorPanel reads
  // `activeColorChannel` directly), so the user lands on the full picker
  // already focused on whatever they were tweaking.
  const handleCustomClick = useCallback(() => {
    setActiveSection('color');
  }, [setActiveSection]);

  return (
    <div data-testid="quick-color-chips" className="space-y-1.5">
      {/* Channel readout label */}
      <div className="text-ui-xs font-mono tracking-widest text-text-muted uppercase">
        <span>COLOR · </span>
        <span data-testid="channel-readout" className="text-text-secondary">
          {channelLabel}
        </span>
      </div>

      {/* Chip row — 8 canonical + 1 Custom */}
      <div className="flex items-center gap-1.5">
        {QUICK_COLORS.map((chip) => {
          const active = colorsMatch(channelColor, chip.rgb);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleChipClick(chip)}
              aria-label={`Set ${channelLabel.toLowerCase()} to ${chip.name}`}
              aria-pressed={active}
              title={chip.name}
              className={`w-6 h-6 rounded-full border transition-colors shrink-0 ${
                active
                  ? 'border-accent ring-2 ring-accent'
                  : 'border-border-subtle hover:border-accent-border'
              }`}
              style={{
                backgroundColor: `rgb(${chip.rgb.r}, ${chip.rgb.g}, ${chip.rgb.b})`,
              }}
            />
          );
        })}

        {/*
          Custom... chip — jumps to the deep Color sidebar section
          (PR 5b). The HSL sliders, hex field, color-harmony presets,
          and gradient editor all live there. We don't open a separate
          popover because the deep panel already does the job and
          there's no benefit to maintaining two custom-color surfaces.
        */}
        <button
          type="button"
          data-testid="quick-color-chip-custom"
          onClick={handleCustomClick}
          aria-label="Open full color editor"
          title="Custom… — open the full Color editor"
          className="w-6 h-6 rounded-full border border-border-subtle hover:border-accent-border hover:text-accent text-text-muted text-ui-xs font-mono flex items-center justify-center transition-colors shrink-0"
        >
          <span aria-hidden="true">⊕</span>
        </button>
      </div>
    </div>
  );
}
