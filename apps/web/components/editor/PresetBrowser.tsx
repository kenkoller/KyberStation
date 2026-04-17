'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { usePresetListStore } from '@/stores/presetListStore';
import { useUserPresetStore, type UserPreset } from '@/stores/userPresetStore';
import { useAudioFontStore } from '@/stores/audioFontStore';
import type { BladeConfig } from '@kyberstation/engine';
import { downloadConfigAsFile, readConfigFromFile } from '@/lib/bladeConfigIO';
import { encodeConfig, buildShareUrl } from '@/lib/configUrl';
import { usePresetAnimation } from '@/hooks/usePresetAnimation';
import {
  ALL_PRESETS,
  PREQUEL_ERA_PRESETS,
  ORIGINAL_TRILOGY_PRESETS,
  SEQUEL_ERA_PRESETS,
  ANIMATED_SERIES_PRESETS,
  EXTENDED_UNIVERSE_PRESETS,
  LEGENDS_PRESETS,
} from '@kyberstation/presets';
import type { Preset, Era, Affiliation } from '@kyberstation/presets';
import { PanelSkeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';

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

/** Individual preset card with engine-rendered blade thumbnail */
function PresetCard({
  preset,
  isActive,
  onSelect,
}: {
  preset: Preset;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { r, g, b } = preset.config.baseColor;
  const hexColor = rgbToHex(r, g, b);
  const isDark = r + g + b < 50;
  const isLegendsPreset = isLegends(preset);
  const { src: thumbnail, isAnimating, onMouseEnter, onMouseLeave } = usePresetAnimation(preset.config as BladeConfig);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`card-hover text-left rounded-panel overflow-hidden transition-colors border ${
        isActive
          ? 'bg-accent-dim border-accent-border'
          : 'bg-bg-surface border-border-subtle hover:border-border-light'
      }`}
      title={preset.description}
    >
      {/* Engine-rendered blade thumbnail */}
      <div className="relative h-10 w-full bg-bg-deep">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`${preset.name} blade preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: isDark
                ? `linear-gradient(90deg, ${hexColor}, #ffffff40)`
                : `linear-gradient(90deg, ${hexColor}, ${hexColor}88)`,
            }}
          />
        )}
        {isLegendsPreset && (
          <span className="absolute top-0.5 right-1 text-ui-xs text-yellow-400 font-bold uppercase bg-black/40 px-1 rounded">
            EU
          </span>
        )}
        {/* Play indicator (visible when paused) */}
        {!isAnimating && thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 flex items-center justify-center rounded-full bg-black/30 opacity-40">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
                <polygon points="1.5,0.5 7,4 1.5,7.5" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="p-2">
        {/* Character name */}
        <div
          className={`text-ui-base font-bold leading-tight truncate ${
            isActive ? 'text-accent' : 'text-text-primary'
          }`}
        >
          {preset.name}
        </div>

        {/* Style + ignition */}
        <div className="text-ui-xs text-text-muted mt-0.5 truncate">
          {STYLE_LABELS[preset.config.style] ?? preset.config.style} &middot;{' '}
          {preset.config.ignitionMs}ms
        </div>

        {/* Affiliation + Add to list */}
        <div className="flex items-center justify-between mt-1">
          <div
            className={`text-ui-xs font-medium uppercase tracking-wider ${
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
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              usePresetListStore.getState().addEntry({
                presetName: preset.name,
                fontName: preset.character.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                config: preset.config as BladeConfig,
                sourcePresetId: preset.id,
              });
            }}
            className="text-ui-xs px-1 py-0.5 rounded border border-border-subtle text-text-muted hover:text-accent hover:border-accent-border/40 transition-colors touch-target"
            title="Add to preset list"
            aria-label={`Add ${preset.name} to preset list`}
          >
            + List
          </span>
        </div>
      </div>
    </button>
  );
}

type BrowserTab = 'gallery' | 'my-presets';

type SortMode = 'newest' | 'alphabetical' | 'modified';

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ─── Save Preset Modal ───

function SavePresetModal({ onClose }: { onClose: () => void }) {
  const config = useBladeStore((s) => s.config);
  const fontName = useAudioFontStore((s) => s.fontName);
  const savePreset = useUserPresetStore((s) => s.savePreset);
  const presets = useUserPresetStore((s) => s.presets);

  const [name, setName] = useState(config.name ?? 'My Custom Preset');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [fontAssociation, setFontAssociation] = useState(fontName ?? '');
  const [saving, setSaving] = useState(false);

  const existingPreset = presets.find((p) => p.name === name);

  const handleSave = (overwrite: boolean) => {
    setSaving(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (overwrite && existingPreset) {
      useUserPresetStore.getState().updatePreset(existingPreset.id, {
        config: { ...config },
        description: description || undefined,
        tags,
        fontAssociation: fontAssociation || undefined,
        updatedAt: Date.now(),
      });
    } else {
      savePreset(name, config, {
        description: description || undefined,
        tags,
        fontAssociation: fontAssociation || undefined,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Save preset"
    >
      <div className="bg-bg-secondary border border-border-light rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h3 className="text-ui-base font-semibold text-text-primary">Save As Preset</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-4 space-y-3">
          {/* Name */}
          <div>
            <label htmlFor="save-preset-name" className="text-ui-xs text-text-muted block mb-1">Name</label>
            <input
              id="save-preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-deep border border-border-subtle rounded px-2.5 py-1.5 text-ui-sm text-text-primary focus:outline-none focus:border-accent"
              autoFocus
            />
            {existingPreset && (
              <p className="text-ui-xs text-yellow-400 mt-0.5">A preset with this name exists.</p>
            )}
          </div>
          {/* Description */}
          <div>
            <label htmlFor="save-preset-desc" className="text-ui-xs text-text-muted block mb-1">Description (optional)</label>
            <textarea
              id="save-preset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-bg-deep border border-border-subtle rounded px-2.5 py-1.5 text-ui-sm text-text-primary focus:outline-none focus:border-accent resize-none"
            />
          </div>
          {/* Tags */}
          <div>
            <label htmlFor="save-preset-tags" className="text-ui-xs text-text-muted block mb-1">Tags (comma-separated)</label>
            <input
              id="save-preset-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="dark side, dueling, favorite"
              className="w-full bg-bg-deep border border-border-subtle rounded px-2.5 py-1.5 text-ui-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
            />
          </div>
          {/* Font association */}
          <div>
            <label htmlFor="save-preset-font" className="text-ui-xs text-text-muted block mb-1">Font Association</label>
            <input
              id="save-preset-font"
              type="text"
              value={fontAssociation}
              onChange={(e) => setFontAssociation(e.target.value)}
              placeholder="e.g. KSith_Vader"
              className="w-full bg-bg-deep border border-border-subtle rounded px-2.5 py-1.5 text-ui-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
            />
            {fontName && fontAssociation !== fontName && (
              <button
                onClick={() => setFontAssociation(fontName)}
                className="text-ui-xs text-accent mt-0.5 hover:underline"
              >
                Use loaded font: {fontName}
              </button>
            )}
          </div>
          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {existingPreset ? (
              <>
                <button
                  onClick={() => handleSave(true)}
                  disabled={!name.trim() || saving}
                  className="flex-1 px-3 py-1.5 rounded text-ui-sm font-medium bg-yellow-900/30 border border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/50 transition-colors disabled:opacity-40"
                >
                  Update Existing
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={!name.trim() || saving}
                  className="flex-1 px-3 py-1.5 rounded text-ui-sm font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
                >
                  Save as New
                </button>
              </>
            ) : (
              <button
                onClick={() => handleSave(false)}
                disabled={!name.trim() || saving}
                className="flex-1 px-3 py-1.5 rounded text-ui-sm font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
              >
                Save Preset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Preset Card ───

function UserPresetCard({
  preset,
  isActive,
  onSelect,
  onDelete,
  onDuplicate,
  onExport,
}: {
  preset: UserPreset;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}) {
  const { r, g, b } = preset.config.baseColor;
  const hexColor = rgbToHex(r, g, b);
  const isDark = r + g + b < 50;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`card-hover text-left rounded-panel overflow-hidden transition-colors border relative ${
        isActive
          ? 'bg-accent-dim border-accent-border'
          : 'bg-bg-surface border-border-subtle hover:border-border-light'
      }`}
    >
      {/* Thumbnail */}
      <button onClick={onSelect} className="block w-full text-left">
        <div className="relative h-10 w-full bg-bg-deep">
          {preset.thumbnail ? (
            <img
              src={preset.thumbnail}
              alt={`${preset.name} blade preview`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: isDark
                  ? `linear-gradient(90deg, ${hexColor}, #ffffff40)`
                  : `linear-gradient(90deg, ${hexColor}, ${hexColor}88)`,
              }}
            />
          )}
          <span className="absolute top-0.5 left-1 text-ui-xs text-accent/80 font-bold uppercase bg-black/40 px-1 rounded">
            Custom
          </span>
        </div>

        <div className="p-2">
          <div className={`text-ui-base font-bold leading-tight truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
            {preset.name}
          </div>
          <div className="text-ui-xs text-text-muted mt-0.5 truncate">
            {STYLE_LABELS[preset.config.style] ?? preset.config.style} &middot; {preset.config.ignitionMs}ms
            {preset.fontAssociation && (
              <span className="ml-1 text-text-muted/70">&middot; {preset.fontAssociation}</span>
            )}
          </div>
          {preset.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {preset.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-ui-xs px-1 py-px rounded bg-bg-deep text-text-muted border border-border-subtle">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="text-ui-xs text-text-muted/50 mt-1">{formatRelativeDate(preset.createdAt)}</div>
        </div>
      </button>

      {/* Overflow menu */}
      <div className="absolute top-0.5 right-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="w-6 h-6 flex items-center justify-center rounded text-text-muted/60 hover:text-text-primary hover:bg-bg-deep/60 transition-colors text-ui-sm"
          aria-label={`Actions for ${preset.name}`}
        >
          &hellip;
        </button>
        {showMenu && (
          <div className="absolute right-0 top-7 w-32 bg-bg-secondary border border-border-light rounded shadow-lg z-20 py-1">
            <button onClick={() => { onSelect(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-ui-xs text-text-secondary hover:bg-bg-surface">Load</button>
            <button onClick={() => { onDuplicate(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-ui-xs text-text-secondary hover:bg-bg-surface">Duplicate</button>
            <button onClick={() => { onExport(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-ui-xs text-text-secondary hover:bg-bg-surface">Export</button>
            <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-ui-xs text-red-400 hover:bg-bg-surface">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PresetBrowser() {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const config = useBladeStore((s) => s.config);
  const currentName = config.name;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const [activeTab, setActiveTab] = useState<BrowserTab>('gallery');
  const [selectedEra, setSelectedEra] = useState<Era | 'all'>('all');
  const [selectedAffiliation, setSelectedAffiliation] = useState<Affiliation | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLegends, setShowLegends] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // My Presets state
  const userPresets = useUserPresetStore((s) => s.presets);
  const isLoadingPresets = useUserPresetStore((s) => s.isLoading);
  const hydrate = useUserPresetStore((s) => s.hydrate);
  const deletePreset = useUserPresetStore((s) => s.deletePreset);
  const duplicatePreset = useUserPresetStore((s) => s.duplicatePreset);
  const [myPresetsSearch, setMyPresetsSearch] = useState('');
  const [myPresetsSort, setMyPresetsSort] = useState<SortMode>('newest');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    userPresets.forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [userPresets]);

  const filteredUserPresets = useMemo(() => {
    let result = userPresets;
    if (myPresetsSearch.trim()) {
      const q = myPresetsSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (tagFilter) {
      result = result.filter((p) => p.tags.includes(tagFilter));
    }
    if (myPresetsSort === 'alphabetical') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (myPresetsSort === 'modified') {
      result = [...result].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    // 'newest' is the default order (by createdAt desc, already sorted on hydrate)
    return result;
  }, [userPresets, myPresetsSearch, myPresetsSort, tagFilter]);

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
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-3 py-1.5 rounded text-ui-sm font-semibold transition-colors border ${
            activeTab === 'gallery'
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
        >
          Gallery ({ALL_PRESETS.length})
        </button>
        <button
          onClick={() => setActiveTab('my-presets')}
          className={`px-3 py-1.5 rounded text-ui-sm font-semibold transition-colors border ${
            activeTab === 'my-presets'
              ? 'bg-accent-dim border-accent-border text-accent'
              : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
        >
          My Presets ({userPresets.length})
        </button>
        <button
          onClick={() => setShowSaveModal(true)}
          className="ml-auto px-3 py-1.5 rounded text-ui-sm font-medium transition-colors border
            bg-accent-dim border-accent-border text-accent hover:bg-accent/20"
        >
          Save As Preset
        </button>
      </div>

      {showSaveModal && <SavePresetModal onClose={() => setShowSaveModal(false)} />}

      {/* ─── My Presets Tab ─── */}
      {activeTab === 'my-presets' && (
        <div>
          {/* Search */}
          <input
            type="text"
            value={myPresetsSearch}
            onChange={(e) => setMyPresetsSearch(e.target.value)}
            placeholder="Search my presets..."
            className="w-full mb-2 px-3 py-1.5 rounded text-ui-xs bg-bg-primary border border-border-subtle
              text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent touch-target"
          />
          {/* Sort + tag filters */}
          <div className="flex flex-wrap gap-1 mb-2">
            {(['newest', 'alphabetical', 'modified'] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setMyPresetsSort(mode)}
                className={`px-2 py-1 rounded text-ui-sm font-medium transition-colors border ${
                  myPresetsSort === mode
                    ? 'bg-accent-dim border-accent-border text-accent'
                    : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
                }`}
              >
                {mode === 'newest' ? 'Newest' : mode === 'alphabetical' ? 'A-Z' : 'Modified'}
              </button>
            ))}
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              <button
                onClick={() => setTagFilter(null)}
                className={`px-2 py-0.5 rounded text-ui-xs transition-colors border ${
                  tagFilter === null
                    ? 'bg-accent-dim border-accent-border text-accent'
                    : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded text-ui-xs transition-colors border ${
                    tagFilter === tag
                      ? 'bg-accent-dim border-accent-border text-accent'
                      : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          {isLoadingPresets ? (
            <PanelSkeleton title="My Presets" />
          ) : filteredUserPresets.length === 0 ? (
            <div className="text-ui-sm text-text-muted text-center py-6 border border-dashed border-border-subtle rounded">
              {userPresets.length === 0
                ? 'No saved presets yet. Customize a style and click "Save As Preset".'
                : 'No presets match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 desktop:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
              {filteredUserPresets.map((preset) => (
                <UserPresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={currentName === preset.name}
                  onSelect={() => loadPreset(preset.config)}
                  onDelete={() => deletePreset(preset.id)}
                  onDuplicate={() => duplicatePreset(preset.id, `${preset.name} (Copy)`)}
                  onExport={() => downloadConfigAsFile(preset.config)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Gallery Tab ─── */}
      {activeTab === 'gallery' && (
        <div>
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search characters..."
        className="w-full mb-2 px-3 py-1.5 rounded text-ui-xs bg-bg-primary border border-border-subtle
          text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent touch-target"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-1 mb-2">
        {ERA_OPTIONS.map((era) => (
          <button
            key={era.id}
            onClick={() => setSelectedEra(era.id)}
            className={`px-2 py-1 rounded text-ui-sm font-medium transition-colors border touch-target ${
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
            className={`px-2 py-1 rounded text-ui-sm font-medium transition-colors border touch-target ${
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
          className={`px-2 py-1 rounded text-ui-sm font-medium transition-colors border ml-auto touch-target ${
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
        {filteredPresets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isActive={currentName === preset.config.name}
            onSelect={() => handleLoadPreset(preset)}
          />
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <p className="text-ui-xs text-text-muted text-center py-6">
          No presets match your filters. Try broadening your search.
        </p>
      )}

      {/* Import / Export / Share */}
      <div className="mt-4 bg-bg-surface rounded-panel p-3 border border-border-subtle">
        <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
          Import / Export / Share
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportConfig}
            className="px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border touch-target
              bg-bg-primary border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Export Config
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border touch-target
              bg-bg-primary border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light"
          >
            Import Config
          </button>
          <button
            onClick={handleShareLink}
            className={`px-3 py-1.5 rounded text-ui-xs font-medium transition-colors border touch-target ${
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
          accept=".json,.kyberstation.json"
          onChange={handleImportConfig}
          className="hidden"
        />
        {importError && (
          <div className="mt-2">
            <ErrorState
              variant="import-failed"
              message={importError}
              onRetry={() => {
                setImportError(null);
                fileInputRef.current?.click();
              }}
              compact
            />
          </div>
        )}
        <p className="text-ui-sm text-text-muted mt-2">
          Click a preset to load it, or import a .kyberstation.json file. Share Link copies a URL
          that anyone can open to load your exact configuration.
        </p>
      </div>
        </div>
      )}
    </div>
  );
}
