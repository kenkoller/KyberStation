'use client';
import { useCallback, useMemo, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import type { BladeConfig } from '@bladeforge/engine';
import {
  ALL_PRESETS,
  PREQUEL_ERA_PRESETS,
  ORIGINAL_TRILOGY_PRESETS,
  SEQUEL_ERA_PRESETS,
  ANIMATED_SERIES_PRESETS,
  EXTENDED_UNIVERSE_PRESETS,
  LEGENDS_PRESETS,
} from '@bladeforge/presets';
import type { Preset, Era, Affiliation } from '@bladeforge/presets';

// ─── Constants ───

const ERA_FILTERS: Array<{ id: Era | 'all'; label: string; shortLabel: string; cssClass: string; count: number }> = [
  { id: 'all', label: 'All Eras', shortLabel: 'All', cssClass: 'text-text-primary', count: ALL_PRESETS.length },
  { id: 'prequel', label: 'Prequel Trilogy', shortLabel: 'PT', cssClass: 'era-prequel', count: PREQUEL_ERA_PRESETS.length },
  { id: 'original-trilogy', label: 'Original Trilogy', shortLabel: 'OT', cssClass: 'era-original', count: ORIGINAL_TRILOGY_PRESETS.length },
  { id: 'sequel', label: 'Sequel Trilogy', shortLabel: 'ST', cssClass: 'era-sequel', count: SEQUEL_ERA_PRESETS.length },
  { id: 'animated', label: 'Animated', shortLabel: 'CW', cssClass: 'era-animated', count: ANIMATED_SERIES_PRESETS.length },
  { id: 'expanded-universe', label: 'Expanded Universe', shortLabel: 'EU', cssClass: 'era-eu', count: EXTENDED_UNIVERSE_PRESETS.length },
];

const AFFILIATION_FILTERS: Array<{ id: Affiliation | 'all'; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: '' },
  { id: 'jedi', label: 'Jedi', icon: '' },
  { id: 'sith', label: 'Sith', icon: '' },
  { id: 'neutral', label: 'Neutral', icon: '' },
];

const STYLE_LABELS: Record<string, string> = {
  stable: 'Stable', unstable: 'Unstable', fire: 'Fire', pulse: 'Pulse',
  rotoscope: 'Rotoscope', gradient: 'Gradient', photon: 'Photon', plasma: 'Plasma',
  crystalShatter: 'Crystal Shatter', aurora: 'Aurora', cinder: 'Cinder', prism: 'Prism',
};

type SortMode = 'name' | 'era' | 'affiliation' | 'style';

// ─── Helpers ───

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function getBladeGradient(preset: Preset): string {
  const { r, g, b } = preset.config.baseColor;
  const hex = rgbToHex(r, g, b);
  const isDark = r + g + b < 50;
  // Vertical gradient simulating a blade from emitter (bottom) to tip (top)
  if (isDark) {
    return `linear-gradient(to top, #ffffff 0%, ${hex} 20%, ${hex} 80%, ${hex}88 100%)`;
  }
  return `linear-gradient(to top, #ffffff 0%, ${hex} 15%, ${hex} 85%, ${hex}44 100%)`;
}

function getGlowShadow(preset: Preset): string {
  const { r, g, b } = preset.config.baseColor;
  const isDark = r + g + b < 50;
  if (isDark) return '0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(200,200,255,0.15)';
  return `0 0 20px rgba(${r},${g},${b},0.5), 0 0 40px rgba(${r},${g},${b},0.25)`;
}

function getEraLabel(era: Era): string {
  switch (era) {
    case 'prequel': return 'Prequel';
    case 'original-trilogy': return 'OT';
    case 'sequel': return 'Sequel';
    case 'animated': return 'Animated';
    case 'expanded-universe': return 'EU';
    default: return era;
  }
}

function getEraCssClass(era: Era): string {
  switch (era) {
    case 'prequel': return 'era-prequel';
    case 'original-trilogy': return 'era-original';
    case 'sequel': return 'era-sequel';
    case 'animated': return 'era-animated';
    case 'expanded-universe': return 'era-eu';
    default: return 'text-text-muted';
  }
}

function isLegends(preset: Preset): boolean {
  return LEGENDS_PRESETS.some((p) => p.id === preset.id);
}

// ─── Gallery Card ───

function GalleryCard({
  preset,
  isActive,
  onSelect,
}: {
  preset: Preset;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { r, g, b } = preset.config.baseColor;
  const hex = rgbToHex(r, g, b);
  const isLegendsPreset = isLegends(preset);

  return (
    <button
      onClick={onSelect}
      className={`gallery-card blade-glow text-left rounded-lg overflow-hidden border transition-all ${
        isActive
          ? 'border-accent ring-1 ring-accent/30'
          : 'border-border-subtle hover:border-border-light'
      } bg-bg-card`}
      style={{ '--glow-color': hex } as React.CSSProperties}
    >
      {/* Blade preview strip */}
      <div className="relative h-28 overflow-hidden bg-bg-deep flex items-center justify-center">
        {/* Background ambient glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at center 80%, rgba(${r},${g},${b},0.6) 0%, transparent 70%)`,
          }}
        />
        {/* Vertical blade */}
        <div
          className="relative w-3 rounded-full blade-shimmer"
          style={{
            height: '85%',
            background: getBladeGradient(preset),
            boxShadow: getGlowShadow(preset),
          }}
        />
        {/* Emitter base */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-3 rounded-sm bg-gradient-to-b from-zinc-500 to-zinc-700 border border-zinc-600/50" />

        {/* Era badge */}
        <div className={`absolute top-1.5 left-1.5 text-[8px] font-bold uppercase tracking-wider ${getEraCssClass(preset.era)}`}>
          {getEraLabel(preset.era)}
        </div>

        {/* Legends badge */}
        {isLegendsPreset && (
          <div className="absolute top-1.5 right-1.5 text-[7px] font-bold uppercase tracking-wider text-yellow-500 bg-yellow-900/40 px-1 rounded">
            Legends
          </div>
        )}

        {/* Affiliation indicator */}
        <div
          className={`absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full ${
            preset.affiliation === 'jedi'
              ? 'bg-blue-400'
              : preset.affiliation === 'sith'
                ? 'bg-red-500'
                : preset.affiliation === 'neutral'
                  ? 'bg-purple-400'
                  : 'bg-gray-400'
          }`}
        />
      </div>

      {/* Info section */}
      <div className="p-2.5">
        {/* Character name */}
        <div
          className={`font-cinematic text-[11px] font-bold leading-tight truncate tracking-wide ${
            isActive ? 'text-accent' : 'text-text-primary'
          }`}
        >
          {preset.name}
        </div>

        {/* Style + Color swatch */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <div
            className="w-3 h-3 rounded-full shrink-0 border border-white/10"
            style={{ backgroundColor: hex }}
          />
          <span className="text-[9px] text-text-muted font-sw-body truncate">
            {STYLE_LABELS[preset.config.style] ?? preset.config.style}
          </span>
          <span className="text-[8px] text-text-muted ml-auto">
            {preset.config.ignitionMs}ms
          </span>
        </div>

        {/* Description preview */}
        {preset.description && (
          <p className="text-[8px] text-text-muted mt-1.5 line-clamp-2 leading-relaxed font-sw-body">
            {preset.description}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Detail Panel ───

function PresetDetail({ preset, onClose }: { preset: Preset; onClose: () => void }) {
  const { r, g, b } = preset.config.baseColor;
  const hex = rgbToHex(r, g, b);
  const clashHex = rgbToHex(preset.config.clashColor.r, preset.config.clashColor.g, preset.config.clashColor.b);
  const lockupHex = rgbToHex(preset.config.lockupColor.r, preset.config.lockupColor.g, preset.config.lockupColor.b);
  const blastHex = rgbToHex(preset.config.blastColor.r, preset.config.blastColor.g, preset.config.blastColor.b);

  return (
    <div className="bg-bg-surface rounded-lg border border-border-subtle p-4 mt-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-cinematic text-sm font-bold tracking-wider text-text-primary">
            {preset.name}
          </h3>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${getEraCssClass(preset.era)}`}>
            {getEraLabel(preset.era)}
          </span>
          <span className={`text-[10px] ml-2 ${
            preset.affiliation === 'jedi' ? 'text-blue-400' :
            preset.affiliation === 'sith' ? 'text-red-400' :
            'text-purple-400'
          }`}>
            {preset.affiliation.toUpperCase()}
          </span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm">
          x
        </button>
      </div>

      {preset.description && (
        <p className="text-[11px] text-text-secondary font-sw-body leading-relaxed mb-3">
          {preset.description}
        </p>
      )}

      {/* Color swatches */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: 'Base', hex: hex },
          { label: 'Clash', hex: clashHex },
          { label: 'Lockup', hex: lockupHex },
          { label: 'Blast', hex: blastHex },
        ].map(({ label, hex: h }) => (
          <div key={label} className="text-center">
            <div
              className="w-full h-5 rounded border border-white/10 mb-0.5"
              style={{ backgroundColor: h }}
            />
            <span className="text-[8px] text-text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-[9px] text-text-muted">
        <div>
          <span className="text-text-secondary font-medium">Style</span>
          <br />
          {STYLE_LABELS[preset.config.style] ?? preset.config.style}
        </div>
        <div>
          <span className="text-text-secondary font-medium">Ignition</span>
          <br />
          {preset.config.ignition} ({preset.config.ignitionMs}ms)
        </div>
        <div>
          <span className="text-text-secondary font-medium">Retraction</span>
          <br />
          {preset.config.retraction} ({preset.config.retractionMs}ms)
        </div>
      </div>

      {preset.hiltNotes && (
        <p className="text-[9px] text-text-muted mt-2 italic">
          Hilt: {preset.hiltNotes}
        </p>
      )}
    </div>
  );
}

// ─── Main Gallery Component ───

export function PresetGallery() {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const config = useBladeStore((s) => s.config);

  const [selectedEra, setSelectedEra] = useState<Era | 'all'>('all');
  const [selectedAffiliation, setSelectedAffiliation] = useState<Affiliation | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLegends, setShowLegends] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [detailPreset, setDetailPreset] = useState<Preset | null>(null);

  const filteredPresets = useMemo(() => {
    let presets = showLegends
      ? ALL_PRESETS
      : ALL_PRESETS.filter((p) => !isLegends(p));

    if (selectedEra !== 'all') {
      presets = presets.filter((p) => p.era === selectedEra);
    }
    if (selectedAffiliation !== 'all') {
      presets = presets.filter((p) => p.affiliation === selectedAffiliation);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      presets = presets.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.character.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      );
    }

    // Sort
    presets = [...presets];
    switch (sortMode) {
      case 'name':
        presets.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'era':
        presets.sort((a, b) => a.era.localeCompare(b.era) || a.name.localeCompare(b.name));
        break;
      case 'affiliation':
        presets.sort((a, b) => a.affiliation.localeCompare(b.affiliation) || a.name.localeCompare(b.name));
        break;
      case 'style':
        presets.sort((a, b) => {
          const { h: hA } = rgbToHsl(a.config.baseColor.r, a.config.baseColor.g, a.config.baseColor.b);
          const { h: hB } = rgbToHsl(b.config.baseColor.r, b.config.baseColor.g, b.config.baseColor.b);
          return hA - hB;
        });
        break;
    }

    return presets;
  }, [selectedEra, selectedAffiliation, searchQuery, showLegends, sortMode]);

  const handleSelect = useCallback(
    (preset: Preset) => {
      loadPreset(preset.config as BladeConfig);
      setDetailPreset(preset);
    },
    [loadPreset],
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cinematic text-[11px] tracking-[0.2em] font-bold text-accent uppercase">
          Saber Gallery
        </h3>
        <span className="text-[10px] text-text-muted font-sw-body">
          {filteredPresets.length} presets
        </span>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search characters, styles..."
        className="w-full mb-2 px-3 py-1.5 rounded text-xs bg-bg-primary border border-border-subtle
          text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent font-sw-body"
      />

      {/* Era filters */}
      <div className="flex flex-wrap gap-1 mb-1.5">
        {ERA_FILTERS.map((era) => (
          <button
            key={era.id}
            onClick={() => setSelectedEra(era.id)}
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors border ${
              selectedEra === era.id
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className="desktop:hidden">{era.shortLabel}</span>
            <span className="hidden desktop:inline">{era.label}</span>
            <span className="ml-1 opacity-50">{era.count}</span>
          </button>
        ))}
      </div>

      {/* Affiliation + Sort + Legends */}
      <div className="flex flex-wrap items-center gap-1 mb-3">
        {AFFILIATION_FILTERS.map((aff) => (
          <button
            key={aff.id}
            onClick={() => setSelectedAffiliation(aff.id)}
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors border ${
              selectedAffiliation === aff.id
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
            }`}
          >
            {aff.label}
          </button>
        ))}

        <div className="ml-auto flex gap-1">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-1.5 py-0.5 rounded text-[9px] bg-bg-primary border border-border-subtle text-text-muted"
          >
            <option value="name">A-Z</option>
            <option value="era">Era</option>
            <option value="affiliation">Side</option>
            <option value="style">Color</option>
          </select>
          <button
            onClick={() => setShowLegends(!showLegends)}
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors border ${
              showLegends
                ? 'bg-yellow-900/30 border-yellow-700/50 text-yellow-400'
                : 'bg-bg-primary border-border-subtle text-text-muted'
            }`}
          >
            Legends
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 desktop:grid-cols-3 wide:grid-cols-4 gap-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredPresets.map((preset) => (
          <GalleryCard
            key={preset.id}
            preset={preset}
            isActive={config.name === preset.config.name}
            onSelect={() => handleSelect(preset)}
          />
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-text-muted font-sw-body">No presets match your filters.</p>
        </div>
      )}

      {/* Detail panel for selected preset */}
      {detailPreset && (
        <PresetDetail
          preset={detailPreset}
          onClose={() => setDetailPreset(null)}
        />
      )}
    </div>
  );
}
