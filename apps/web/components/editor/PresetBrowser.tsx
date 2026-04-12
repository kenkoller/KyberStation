'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import type { BladeConfig } from '@bladeforge/engine';
import { downloadConfigAsFile, readConfigFromFile } from '@/lib/bladeConfigIO';
import { encodeConfig, buildShareUrl } from '@/lib/configUrl';
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

const ERA_OPTIONS: Array<{ id: Era | 'all'; label: string; count: number }> = [
  { id: 'all', label: 'All Eras', count: ALL_PRESETS.length },
  { id: 'prequel', label: 'Prequel Trilogy', count: PREQUEL_ERA_PRESETS.length },
  { id: 'original-trilogy', label: 'Original Trilogy', count: ORIGINAL_TRILOGY_PRESETS.length },
  { id: 'sequel', label: 'Sequel Trilogy', count: SEQUEL_ERA_PRESETS.length },
  { id: 'animated', label: 'Animated Series', count: ANIMATED_SERIES_PRESETS.length },
  { id: 'expanded-universe', label: 'Expanded Universe', count: EXTENDED_UNIVERSE_PRESETS.length },
];

const AFFILIATION_OPTIONS: Array<{ id: Affiliation | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'jedi', label: 'Jedi' },
  { id: 'sith', label: 'Sith' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'other', label: 'Other' },
];

const STYLE_LABELS: Record<string, string> = {
  stable: 'Stable',
  unstable: 'Unstable',
  fire: 'Fire',
  pulse: 'Pulse',
  rotoscope: 'Rotoscope',
  gradient: 'Gradient',
  photon: 'Photon',
  plasma: 'Plasma',
  crystalShatter: 'Crystal Shatter',
  aurora: 'Aurora',
  cinder: 'Cinder',
  prism: 'Prism',
};

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')
  );
}

// Check if a preset has Legends-specific content
function isLegends(preset: Preset): boolean {
  return LEGENDS_PRESETS.some((p) => p.id === preset.id);
}

export function PresetBrowser() {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const config = useBladeStore((s) => s.config);
  const currentName = config.name;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const [selectedEra, setSelectedEra] = useState<Era | 'all'>('all');
  const [selectedAffiliation, setSelectedAffiliation] = useState<Affiliation | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLegends, setShowLegends] = useState(false);

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
    return presets;
  }, [selectedEra, selectedAffiliation, searchQuery, showLegends]);

  const handleLoadPreset = useCallback(
    (preset: Preset) => {
      loadPreset(preset.config as BladeConfig);
    },
    [loadPreset],
  );

  const handleExportConfig = useCallback(() => {
    downloadConfigAsFile(config);
  }, [config]);

  const handleImportConfig = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportError(null);
      try {
        const imported = await readConfigFromFile(file);
        loadPreset(imported);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to import config');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [loadPreset],
  );

  const handleShareLink = useCallback(async () => {
    try {
      const encoded = await encodeConfig(config);
      const url = buildShareUrl(encoded);
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  }, [config]);

  return (
    <div>
      <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-3">
        Character Presets ({filteredPresets.length})
      </h3>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search characters..."
        className="w-full mb-2 px-3 py-1.5 rounded text-xs bg-bg-primary border border-border-subtle
          text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-1 mb-2">
        {ERA_OPTIONS.map((era) => (
          <button
            key={era.id}
            onClick={() => setSelectedEra(era.id)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ${
              selectedEra === era.id
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
            }`}
          >
            {era.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {AFFILIATION_OPTIONS.map((aff) => (
          <button
            key={aff.id}
            onClick={() => setSelectedAffiliation(aff.id)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ${
              selectedAffiliation === aff.id
                ? 'bg-accent-dim border-accent-border text-accent'
                : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
            }`}
          >
            {aff.label}
          </button>
        ))}
        <button
          onClick={() => setShowLegends(!showLegends)}
          className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ml-auto ${
            showLegends
              ? 'bg-yellow-900/30 border-yellow-700/50 text-yellow-400'
              : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
        >
          {showLegends ? 'Legends ON' : '+ Legends'}
        </button>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-2 desktop:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
        {filteredPresets.map((preset) => {
          const isActive = currentName === preset.config.name;
          const { r, g, b } = preset.config.baseColor;
          const hexColor = rgbToHex(r, g, b);
          const isDark = r + g + b < 50;
          const isLegendsPreset = isLegends(preset);

          return (
            <button
              key={preset.id}
              onClick={() => handleLoadPreset(preset)}
              className={`card-hover text-left rounded-panel p-2.5 transition-colors border ${
                isActive
                  ? 'bg-accent-dim border-accent-border'
                  : 'bg-bg-surface border-border-subtle hover:border-border-light'
              }`}
              title={preset.description}
            >
              {/* Color swatch */}
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-8 h-2 rounded-full shrink-0"
                  style={{
                    background: isDark
                      ? `linear-gradient(90deg, ${hexColor}, #ffffff40)`
                      : `linear-gradient(90deg, ${hexColor}, ${hexColor}88)`,
                  }}
                />
                {isLegendsPreset && (
                  <span className="text-[8px] text-yellow-400 font-bold uppercase">EU</span>
                )}
              </div>

              {/* Character name */}
              <div
                className={`text-[11px] font-bold leading-tight truncate ${
                  isActive ? 'text-accent' : 'text-text-primary'
                }`}
              >
                {preset.name}
              </div>

              {/* Style + ignition */}
              <div className="text-[9px] text-text-muted mt-0.5 truncate">
                {STYLE_LABELS[preset.config.style] ?? preset.config.style} &middot;{' '}
                {preset.config.ignitionMs}ms
              </div>

              {/* Affiliation badge */}
              <div
                className={`text-[8px] mt-1 font-medium uppercase tracking-wider ${
                  preset.affiliation === 'jedi'
                    ? 'text-blue-400'
                    : preset.affiliation === 'sith'
                      ? 'text-red-400'
                      : preset.affiliation === 'neutral'
                        ? 'text-purple-400'
                        : 'text-text-muted'
                }`}
              >
                {preset.affiliation}
              </div>
            </button>
          );
        })}
      </div>

      {filteredPresets.length === 0 && (
        <p className="text-xs text-text-muted text-center py-6">
          No presets match your filters. Try broadening your search.
        </p>
      )}

      {/* Import / Export / Share */}
      <div className="mt-4 bg-bg-surface rounded-panel p-3 border border-border-subtle">
        <h4 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
          Import / Export / Share
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportConfig}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors border
              bg-bg-primary border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Export Config
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors border
              bg-bg-primary border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Import Config
          </button>
          <button
            onClick={handleShareLink}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
              shareCopied
                ? 'bg-green-900/30 border-green-700/50 text-green-400'
                : 'bg-accent-dim border-accent-border text-accent hover:bg-accent/20'
            }`}
          >
            {shareCopied ? 'Link Copied!' : 'Share Link'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.bladeforge.json"
          onChange={handleImportConfig}
          className="hidden"
        />
        {importError && <p className="text-[10px] text-red-400 mt-2">{importError}</p>}
        <p className="text-[10px] text-text-muted mt-2">
          Click a preset to load it, or import a .bladeforge.json file. Share Link copies a URL
          that anyone can open to load your exact configuration.
        </p>
      </div>
    </div>
  );
}
