'use client';

// ─── InspectorGalleryTab — W8 (2026-04-22) ──────────────────────────────────
//
// Compact preset picker inside the Inspector's GALLERY tab. Each row
// is a full-width thin horizontal card: the preset's baseColor
// rendered as a blade gradient, with the name overlaid on the left
// (drop shadow). Hover a row and only that blade animates — a subtle
// shimmer drifts left-to-right. Non-hovered rows stay completely
// static. No popover (that's reserved for the full-screen /gallery
// page); this picker keeps the hover preview in-place per W8 spec.
//
// Click a row loads the preset into bladeStore — user stays on the
// Inspector, does not leave Design. That's the key difference from
// the full-screen Gallery which navigates to /editor after selection.

import { useState } from 'react';
import { ALL_PRESETS } from '@kyberstation/presets';
import type { Preset } from '@kyberstation/presets';
import type { BladeConfig } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';

export function InspectorGalleryTab() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const activeName = useBladeStore((s) => s.config.name);

  const filtered = search
    ? ALL_PRESETS.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.character.toLowerCase().includes(search.toLowerCase()))
    : ALL_PRESETS;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2 shrink-0 border-b border-border-subtle">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search presets…"
          className="w-full bg-bg-surface border border-border-subtle rounded px-2 py-1 text-ui-xs font-mono placeholder:text-text-muted/60 focus:border-accent-border outline-none"
        />
        <div className="mt-1 text-ui-xs font-mono text-text-muted tracking-[0.08em] text-right">
          {filtered.length} presets
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.map((preset) => (
          <InspectorPresetRow
            key={preset.id}
            preset={preset}
            isHovered={hoveredId === preset.id}
            isActive={preset.name === activeName}
            onHover={(id) => setHoveredId(id)}
            onSelect={() => loadPreset(preset.config as BladeConfig)}
          />
        ))}
      </div>
    </div>
  );
}

interface InspectorPresetRowProps {
  preset: Preset;
  isHovered: boolean;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onSelect: () => void;
}

function InspectorPresetRow({
  preset,
  isHovered,
  isActive,
  onHover,
  onSelect,
}: InspectorPresetRowProps) {
  const { baseColor } = preset.config;
  // Base blade gradient — brighter core at 30%, fades toward tip.
  const base = `rgb(${baseColor.r},${baseColor.g},${baseColor.b})`;
  const bright = `rgb(${Math.min(255, baseColor.r + 90)},${Math.min(255, baseColor.g + 90)},${Math.min(255, baseColor.b + 90)})`;

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(preset.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(preset.id)}
      onBlur={() => onHover(null)}
      title={preset.description ?? preset.character}
      aria-pressed={isActive}
      className={`group relative w-full flex items-center px-2 transition-colors ${
        isActive
          ? 'bg-accent-dim/25'
          : isHovered
            ? 'bg-bg-surface/70'
            : 'hover:bg-bg-surface/40'
      }`}
      style={{ height: 26 }}
    >
      {/* Blade strip — full width minus the name column. In-place
          hover animation: only the hovered row shimmers. */}
      <div
        aria-hidden="true"
        className={`absolute left-[110px] right-2 rounded-sm overflow-hidden ${
          isHovered ? 'gallery-blade-hover' : ''
        }`}
        style={{
          top: 6,
          bottom: 6,
          background: `linear-gradient(90deg, ${base} 0%, ${bright} 40%, ${base} 70%, ${base}80 100%)`,
          boxShadow: `0 0 6px rgb(${baseColor.r},${baseColor.g},${baseColor.b}, ${isHovered ? 0.55 : 0.3})`,
        }}
      />

      <span
        className="relative z-10 font-mono uppercase text-ui-xs tracking-[0.06em] truncate"
        style={{
          width: 106,
          color: isActive
            ? 'rgb(var(--accent))'
            : 'rgb(var(--text-primary))',
          textShadow: '0 0 6px rgb(0 0 0 / 0.85), 0 1px 2px rgb(0 0 0 / 0.9)',
        }}
      >
        {preset.name}
      </span>
    </button>
  );
}
