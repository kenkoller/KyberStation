'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioFontStore } from '@/stores/audioFontStore';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioMixerStore } from '@/stores/audioMixerStore';
import type { MixerValues } from '@/stores/audioMixerStore';
import type { LibraryFontEntry } from '@bladeforge/sound';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

// ─── Sound event types ───

const SOUND_EVENTS = [
  { id: 'hum', label: 'Hum', description: 'Idle hum loop', loop: true },
  { id: 'swing', label: 'Swing', description: 'Swing whoosh', loop: false },
  { id: 'clash', label: 'Clash', description: 'Blade clash impact', loop: false },
  { id: 'blast', label: 'Blast', description: 'Blaster deflection', loop: false },
  { id: 'lockup', label: 'Lockup', description: 'Blade lock sustained', loop: false },
  { id: 'drag', label: 'Drag', description: 'Blade tip drag', loop: false },
  { id: 'melt', label: 'Melt', description: 'Blade melt effect', loop: false },
  { id: 'in', label: 'Ignition', description: 'Ignition sound', loop: false },
  { id: 'out', label: 'Retraction', description: 'Retraction sound', loop: false },
  { id: 'force', label: 'Force', description: 'Force effect', loop: false },
  { id: 'stab', label: 'Stab', description: 'Stab thrust', loop: false },
];

// ─── EQ/Effect filter types for the mixer ───

interface FilterSlider {
  id: keyof MixerValues;
  label: string;
  category: 'eq' | 'effects' | 'master';
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
}

const MIXER_CONTROLS: FilterSlider[] = [
  // EQ
  { id: 'bass', label: 'Bass', category: 'eq', min: -12, max: 12, step: 0.5, default: 0, unit: 'dB' },
  { id: 'mid', label: 'Mid', category: 'eq', min: -12, max: 12, step: 0.5, default: 0, unit: 'dB' },
  { id: 'treble', label: 'Treble', category: 'eq', min: -12, max: 12, step: 0.5, default: 0, unit: 'dB' },
  // Effects
  { id: 'distortion', label: 'Distortion', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'reverb', label: 'Reverb', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'delay', label: 'Echo/Delay', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'chorus', label: 'Chorus', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'phaser', label: 'Phaser', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'bitcrusher', label: 'Bitcrusher', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'pitchShift', label: 'Pitch Shift', category: 'effects', min: -12, max: 12, step: 0.5, default: 0, unit: 'st' },
  { id: 'compressor', label: 'Compressor', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  // Master
  { id: 'volume', label: 'Volume', category: 'master', min: 0, max: 100, step: 1, default: 80, unit: '%' },
];

// ─── Preset effect chains ───

const EFFECT_PRESETS = [
  { id: 'clean', label: 'Clean', description: 'No effects, pure sound' },
  { id: 'kylo-unstable', label: 'Kylo Unstable', description: 'Distortion + high-pass crackle' },
  { id: 'cave-echo', label: 'Cave Echo', description: 'Deep reverb + echo' },
  { id: 'lo-fi-retro', label: 'Lo-Fi Retro', description: 'Bitcrusher + low-pass warmth' },
  { id: 'underwater', label: 'Underwater', description: 'Heavy low-pass + chorus' },
  { id: 'force-tunnel', label: 'Force Tunnel', description: 'Phaser + reverb + pitch shift' },
];

// ─── Helpers ───

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FORMAT_LABELS: Record<string, string> = {
  proffie: 'PRF',
  cfx: 'CFX',
  generic: 'GEN',
};

const COMPLETENESS_COLORS: Record<string, { dot: string; text: string; label: string }> = {
  complete: { dot: 'bg-green-400', text: 'text-green-400', label: 'Complete' },
  partial: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Partial' },
  minimal: { dot: 'bg-red-400', text: 'text-red-400', label: 'Minimal' },
};

// ─── Font Library Tab ───

function FontLibraryTab({ onLoadFont }: { onLoadFont: (fontName: string) => void }) {
  const libraryHandle = useAudioFontStore((s) => s.libraryHandle);
  const libraryFonts = useAudioFontStore((s) => s.libraryFonts);
  const libraryPath = useAudioFontStore((s) => s.libraryPath);
  const isScanning = useAudioFontStore((s) => s.isScanning);
  const scanProgress = useAudioFontStore((s) => s.scanProgress);
  const setLibraryHandle = useAudioFontStore((s) => s.setLibraryHandle);
  const clearLibrary = useAudioFontStore((s) => s.clearLibrary);
  const scanLibrary = useAudioFontStore((s) => s.scanLibrary);
  const hydrateLibrary = useAudioFontStore((s) => s.hydrateLibrary);
  const activeFontName = useAudioFontStore((s) => s.fontName);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'alpha' | 'files' | 'completeness'>('alpha');
  const [expandedFont, setExpandedFont] = useState<string | null>(null);
  const hasFileSystemAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // Hydrate library handle on mount
  useEffect(() => {
    hydrateLibrary();
  }, [hydrateLibrary]);

  const handlePickDirectory = useCallback(async () => {
    if (!hasFileSystemAccess) return;
    try {
      const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      await setLibraryHandle(handle);
      // Auto-scan after picking
      setTimeout(() => {
        useAudioFontStore.getState().scanLibrary();
      }, 100);
    } catch {
      // User cancelled picker
    }
  }, [hasFileSystemAccess, setLibraryHandle]);

  // Filter + sort
  const filteredFonts = libraryFonts
    .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'alpha') return a.name.localeCompare(b.name);
      if (sort === 'files') return b.fileCount - a.fileCount;
      // completeness: complete > partial > minimal
      const order = { complete: 0, partial: 1, minimal: 2 };
      return order[a.completeness] - order[b.completeness] || a.name.localeCompare(b.name);
    });

  // No File System Access API
  if (!hasFileSystemAccess) {
    return (
      <div className="space-y-3">
        <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-panel p-3 text-ui-sm text-yellow-300/80">
          Font library browsing requires Chrome, Edge, or Arc. You can still import individual fonts via drag-and-drop in the Sound Fonts tab.
        </div>
      </div>
    );
  }

  // No library set yet
  if (!libraryHandle) {
    return (
      <div className="space-y-3">
        <div className="border-2 border-dashed border-border-subtle rounded-panel p-6 text-center">
          <div className="text-ui-sm text-text-muted mb-3 flex items-center justify-center gap-1">
            Point BladeForge at your local sound font collection to browse and load fonts instantly.
            <HelpTooltip text="Select the top-level folder containing your sound font subfolders. BladeForge scans each subfolder for audio files, detects formats (Proffie/CFX), and shows completeness. Your folder choice is remembered across sessions." />
          </div>
          <button
            onClick={handlePickDirectory}
            className="px-4 py-2 rounded border border-accent bg-accent-dim/20 text-accent text-ui-sm font-medium hover:bg-accent-dim/40 transition-colors"
          >
            Set Font Library Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-ui-sm text-text-secondary truncate flex-1 flex items-center gap-1" title={libraryPath}>
          <span className="text-text-muted">Library:</span>{' '}
          <span className="text-accent font-medium">{libraryPath}</span>
          {libraryFonts.length > 0 && (
            <span className="text-text-muted ml-1">({libraryFonts.length} fonts)</span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => scanLibrary()}
            disabled={isScanning}
            className="text-ui-xs px-2 py-0.5 rounded border border-border-subtle text-text-muted hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50"
          >
            {isScanning ? 'Scanning...' : 'Refresh'}
          </button>
          <button
            onClick={handlePickDirectory}
            className="text-ui-xs px-2 py-0.5 rounded border border-border-subtle text-text-muted hover:text-text-secondary transition-colors"
          >
            Change
          </button>
          <button
            onClick={() => clearLibrary()}
            className="text-ui-xs px-1.5 py-0.5 rounded border border-border-subtle text-text-muted hover:text-red-400 hover:border-red-400/40 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Scanning progress */}
      {isScanning && (
        <div className="bg-accent-dim/10 border border-accent-border/30 rounded-panel p-2 text-center">
          <span className="text-ui-sm text-accent">
            Scanning... {scanProgress.scanned} fonts found
          </span>
          {scanProgress.currentName && (
            <span className="text-ui-xs text-text-muted ml-1">({scanProgress.currentName})</span>
          )}
        </div>
      )}

      {/* Search + Sort */}
      {libraryFonts.length > 0 && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search fonts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search font library"
            className="flex-1 bg-bg-deep text-ui-sm text-text-primary px-2 py-1 rounded border border-border-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent placeholder:text-text-muted"
          />
          <div className="flex gap-0.5">
            {([
              { id: 'alpha' as const, label: 'A-Z' },
              { id: 'files' as const, label: '#' },
              { id: 'completeness' as const, label: 'Status' },
            ]).map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`text-ui-xs px-1.5 py-0.5 rounded border transition-colors ${
                  sort === s.id
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border-subtle text-text-muted hover:text-text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Font list */}
      {filteredFonts.length === 0 && !isScanning ? (
        <div className="text-ui-sm text-text-muted text-center py-4 border border-dashed border-border-subtle rounded">
          {libraryFonts.length === 0
            ? 'No fonts found. Click "Refresh" to scan your library folder.'
            : 'No fonts match your search.'}
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {filteredFonts.map((font) => (
            <FontLibraryRow
              key={font.name}
              font={font}
              isActive={activeFontName === font.name}
              isExpanded={expandedFont === font.name}
              onToggleExpand={() => setExpandedFont(expandedFont === font.name ? null : font.name)}
              onLoad={() => onLoadFont(font.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FontLibraryRow({
  font,
  isActive,
  isExpanded,
  onToggleExpand,
  onLoad,
}: {
  font: LibraryFontEntry;
  isActive: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLoad: () => void;
}) {
  const comp = COMPLETENESS_COLORS[font.completeness];

  return (
    <div
      className={`bg-bg-surface rounded border transition-colors ${
        isActive
          ? 'border-accent-border/40 bg-accent-dim/10'
          : 'border-border-subtle hover:border-border-light'
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        {/* Completeness dot */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${comp.dot}`}
          title={comp.label}
          aria-label={`Completeness: ${comp.label}`}
        />

        {/* Name */}
        <button
          onClick={onToggleExpand}
          className="flex-1 text-left min-w-0"
        >
          <span className={`text-ui-sm truncate block ${isActive ? 'text-accent font-medium' : 'text-text-primary'}`}>
            {font.name}
            {isActive && <span className="ml-1 text-accent text-ui-xs">(loaded)</span>}
          </span>
        </button>

        {/* File count */}
        <span className="text-ui-xs text-text-muted tabular-nums shrink-0">
          {font.fileCount}
        </span>

        {/* Format badge */}
        <span className="text-ui-xs px-1 py-0.5 rounded bg-bg-deep text-text-muted border border-border-subtle shrink-0 font-mono">
          {FORMAT_LABELS[font.format] ?? font.format}
        </span>

        {/* SmoothSwing indicator */}
        {font.hasSmoothSwing && (
          <span className="text-ui-xs text-blue-400 shrink-0" title={`${font.smoothSwingPairCount} SmoothSwing pairs`}>
            SS
          </span>
        )}

        {/* Load button */}
        <button
          onClick={(e) => { e.stopPropagation(); onLoad(); }}
          className={`text-ui-xs px-2 py-0.5 rounded border transition-colors shrink-0 ${
            isActive
              ? 'border-accent/30 text-accent/50 cursor-default'
              : 'border-accent-border/40 text-accent bg-accent-dim/20 hover:bg-accent-dim/40'
          }`}
          disabled={isActive}
        >
          Load
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-2 pb-2 pt-1 border-t border-border-subtle">
          <div className="grid grid-cols-3 gap-1 text-ui-xs">
            {Object.entries(font.categories)
              .filter(([, count]) => (count ?? 0) > 0)
              .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
              .map(([cat, count]) => (
                <div key={cat} className="flex justify-between bg-bg-deep rounded px-1.5 py-0.5">
                  <span className="text-text-secondary capitalize">{cat}</span>
                  <span className="text-text-muted">{count}</span>
                </div>
              ))}
          </div>
          <div className="flex gap-3 mt-1.5 text-ui-xs text-text-muted">
            <span>{formatBytes(font.totalSizeBytes)}</span>
            <span className={comp.text}>{comp.label}</span>
            {font.missingCategories.length > 0 && (
              <span className="text-yellow-400/70">
                Missing: {font.missingCategories.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ───

export function SoundFontPanel() {
  const [activeSection, setActiveSection] = useState<'fonts' | 'mixer' | 'presets' | 'library'>('fonts');
  const [playingEvent, setPlayingEvent] = useState<string | null>(null);
  const [libraryLoadingFont, setLibraryLoadingFont] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use mixer store instead of local state
  const mixerValues = useAudioMixerStore((s) => s.mixerValues);
  const activePreset = useAudioMixerStore((s) => s.activePresetId);
  const setMixerValue = useAudioMixerStore((s) => s.setMixerValue);
  const applyPreset = useAudioMixerStore((s) => s.applyPreset);

  // Connect to audio engine and font store
  const audio = useAudioEngine();
  const fontName = useAudioFontStore((s) => s.fontName);
  const manifest = useAudioFontStore((s) => s.manifest);
  const isLoading = useAudioFontStore((s) => s.isLoading);
  const loadProgress = useAudioFontStore((s) => s.loadProgress);
  const warnings = useAudioFontStore((s) => s.warnings);
  const buffers = useAudioFontStore((s) => s.buffers);
  const clearFont = useAudioFontStore((s) => s.clearFont);

  // Handle font folder import — now decodes actual audio
  const handleFontImport = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await audio.loadFont(files);
  }, [audio]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFontImport(e.dataTransfer.files);
  }, [handleFontImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Play a sound event using real font buffers
  const handlePlayEvent = useCallback((eventId: string) => {
    if (playingEvent === eventId) {
      // Stop if already playing
      if (eventId === 'hum') {
        audio.stopHum();
      }
      setPlayingEvent(null);
      return;
    }

    const played = audio.playEvent(eventId);
    if (played) {
      setPlayingEvent(eventId);
      // Auto-stop after a brief duration for non-looping sounds
      const event = SOUND_EVENTS.find(e => e.id === eventId);
      if (event && !event.loop) {
        setTimeout(() => setPlayingEvent(null), 2000);
      }
    }
  }, [playingEvent, audio]);

  const handleMixerChange = useCallback((id: keyof MixerValues, value: number) => {
    setMixerValue(id, value);
  }, [setMixerValue]);

  const handlePresetSelect = useCallback((presetId: string) => {
    applyPreset(presetId);
  }, [applyPreset]);

  // Load a font from the library directory
  const handleLoadLibraryFont = useCallback(async (fontName: string) => {
    const handle = useAudioFontStore.getState().libraryHandle;
    if (!handle) return;

    setLibraryLoadingFont(fontName);
    try {
      const { loadFontFromDirectoryHandle } = await import('@bladeforge/sound');
      const files = await loadFontFromDirectoryHandle(handle, fontName);
      if (files.length > 0) {
        await audio.loadFont(files);
      }
    } catch {
      // Failed to load font
    } finally {
      setLibraryLoadingFont(null);
    }
  }, [audio]);

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 flex-wrap">
        {([
          { id: 'fonts' as const, label: 'Sound Fonts' },
          { id: 'library' as const, label: 'Library' },
          { id: 'mixer' as const, label: 'EQ / Effects' },
          { id: 'presets' as const, label: 'Effect Presets' },
        ]).map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-3 py-1 rounded text-ui-sm font-medium border transition-colors ${
              activeSection === section.id
                ? 'border-accent bg-accent-dim text-accent'
                : 'border-border-subtle text-text-muted hover:text-text-secondary'
            }`}
          >
            {section.label}
          </button>
        ))}
        <HelpTooltip text="Import individual fonts via drag-and-drop, or set a Library folder to browse your entire collection. Use EQ/Effects to shape audio in real-time." />
      </div>

      {/* ── Sound Fonts Section ── */}
      {activeSection === 'fonts' && (
        <div className="space-y-4">
          {/* Font import */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-panel p-4 text-center transition-colors cursor-pointer ${
              isLoading
                ? 'border-accent/50 bg-accent-dim/10'
                : 'border-border-subtle hover:border-accent/50'
            }`}
            onClick={() => !isLoading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              // @ts-expect-error - webkitdirectory is a non-standard attribute
              webkitdirectory=""
              multiple
              className="hidden"
              aria-label="Import sound font folder"
              onChange={(e) => handleFontImport(e.target.files)}
            />
            <div className="text-text-muted text-ui-xs">
              {isLoading ? (
                <div className="space-y-2">
                  <span className="text-accent">Decoding audio files...</span>
                  <div
                    className="w-full bg-bg-deep rounded-full h-1.5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(loadProgress * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Audio decoding progress"
                  >
                    <div
                      className="bg-accent h-full transition-all duration-200 rounded-full"
                      style={{ width: `${Math.round(loadProgress * 100)}%` }}
                    />
                  </div>
                  <span className="text-text-muted text-ui-sm">
                    {Math.round(loadProgress * 100)}%
                  </span>
                </div>
              ) : fontName ? (
                <div className="flex items-center justify-between">
                  <span>
                    <span className="text-accent font-medium">{fontName}</span>
                    <span className="text-text-muted"> ({manifest?.files.length ?? 0} files)</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFont();
                    }}
                    className="text-text-muted hover:text-red-400 text-ui-sm px-1.5 py-0.5 rounded border border-border-subtle hover:border-red-500/30"
                    aria-label="Clear loaded sound font"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                'Drop font folder here or click to browse'
              )}
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-panel p-2.5">
              <h4 className="text-ui-sm text-yellow-400 uppercase tracking-widest font-semibold mb-1">
                Warnings
              </h4>
              <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
                {warnings.slice(0, 10).map((w, i) => (
                  <div key={i} className="text-ui-sm text-yellow-300/80">{w}</div>
                ))}
                {warnings.length > 10 && (
                  <div className="text-ui-sm text-yellow-300/50">+{warnings.length - 10} more</div>
                )}
              </div>
            </div>
          )}

          {/* Font details */}
          {manifest && (
            <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
              <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
                Font Contents
              </h4>
              <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-1.5 text-ui-sm">
                {Object.entries(manifest.categories)
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => {
                    const hasBuffers = (buffers.get(category)?.length ?? 0) > 0;
                    return (
                      <div
                        key={category}
                        className={`flex items-center justify-between rounded px-2 py-1 ${
                          hasBuffers ? 'bg-bg-deep' : 'bg-bg-deep opacity-50'
                        }`}
                      >
                        <span className="text-text-secondary capitalize">{category}</span>
                        <span className={hasBuffers ? 'text-green-400' : 'text-text-muted'}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
              </div>
              {manifest.smoothSwingPairs.length > 0 && (
                <div className="mt-2 text-ui-sm text-text-muted">
                  {manifest.smoothSwingPairs.length} SmoothSwing pair{manifest.smoothSwingPairs.length > 1 ? 's' : ''} detected
                </div>
              )}
            </div>
          )}

          {/* Sound event playback */}
          <div>
            <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
              Sound Events
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {SOUND_EVENTS.map((event) => {
                const isPlaying = playingEvent === event.id;
                const hasSound = (buffers.get(event.id)?.length ?? 0) > 0;
                return (
                  <button
                    key={event.id}
                    onClick={() => handlePlayEvent(event.id)}
                    disabled={!hasSound}
                    aria-label={isPlaying ? `Stop ${event.label}` : `Play ${event.label}`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-ui-sm border transition-colors ${
                      isPlaying
                        ? 'border-green-500/50 bg-green-900/20 text-green-400'
                        : hasSound
                          ? 'border-border-subtle bg-bg-surface text-text-secondary hover:border-accent'
                          : 'border-border-subtle bg-bg-deep text-text-muted opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-ui-md" aria-hidden="true">{isPlaying ? '\u25A0' : '\u25B6'}</span>
                    <span>{event.label}</span>
                    {event.loop && <span className="text-text-muted text-ui-xs">LOOP</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── EQ / Effects Mixer ── */}
      {activeSection === 'mixer' && (
        <div className="space-y-4">
          {/* EQ Section */}
          <div>
            <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
              Equalizer
            </h4>
            <div className="space-y-2 bg-bg-surface rounded-panel p-3 border border-border-subtle">
              {MIXER_CONTROLS.filter(c => c.category === 'eq').map((ctrl) => (
                <div key={ctrl.id} className="flex items-center gap-2">
                  <label htmlFor={`eq-${ctrl.id}`} className="text-ui-sm text-text-secondary w-12">{ctrl.label}</label>
                  <input
                    id={`eq-${ctrl.id}`}
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={mixerValues[ctrl.id] ?? ctrl.default}
                    onChange={(e) => handleMixerChange(ctrl.id, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-ui-sm text-text-muted font-mono w-14 text-right">
                    {(mixerValues[ctrl.id] ?? ctrl.default) > 0 ? '+' : ''}{mixerValues[ctrl.id] ?? ctrl.default}{ctrl.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Effects Section */}
          <div>
            <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
              Effects
            </h4>
            <div className="space-y-2 bg-bg-surface rounded-panel p-3 border border-border-subtle">
              {MIXER_CONTROLS.filter(c => c.category === 'effects').map((ctrl) => (
                <div key={ctrl.id} className="flex items-center gap-2">
                  <label htmlFor={`fx-${ctrl.id}`} className="text-ui-sm text-text-secondary w-16 shrink-0">{ctrl.label}</label>
                  <input
                    id={`fx-${ctrl.id}`}
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={mixerValues[ctrl.id] ?? ctrl.default}
                    onChange={(e) => handleMixerChange(ctrl.id, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-ui-sm text-text-muted font-mono w-12 text-right">
                    {mixerValues[ctrl.id] ?? ctrl.default}{ctrl.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Master Section */}
          <div>
            <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
              Master
            </h4>
            <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
              {MIXER_CONTROLS.filter(c => c.category === 'master').map((ctrl) => (
                <div key={ctrl.id} className="flex items-center gap-2">
                  <label htmlFor={`master-${ctrl.id}`} className="text-ui-sm text-text-secondary w-12">{ctrl.label}</label>
                  <input
                    id={`master-${ctrl.id}`}
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={mixerValues[ctrl.id] ?? ctrl.default}
                    onChange={(e) => handleMixerChange(ctrl.id, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-ui-sm text-text-muted font-mono w-12 text-right">
                    {mixerValues[ctrl.id] ?? ctrl.default}{ctrl.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Font Library ── */}
      {activeSection === 'library' && (
        <div>
          {libraryLoadingFont && (
            <div className="mb-2 bg-accent-dim/10 border border-accent-border/30 rounded-panel p-2 text-center text-ui-sm text-accent">
              Loading {libraryLoadingFont}...
            </div>
          )}
          <FontLibraryTab onLoadFont={handleLoadLibraryFont} />
        </div>
      )}

      {/* ── Effect Presets ── */}
      {activeSection === 'presets' && (
        <div className="space-y-3">
          <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
            Effect Chain Presets
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {EFFECT_PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`text-left px-3 py-2.5 rounded text-ui-xs transition-colors border ${
                    isActive
                      ? 'border-accent bg-accent-dim text-accent'
                      : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-ui-sm text-text-muted mt-0.5">{preset.description}</div>
                </button>
              );
            })}
          </div>

          {/* Current mixer state summary */}
          <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
            <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
              Active Effects
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {MIXER_CONTROLS.filter(c => {
                const val = mixerValues[c.id] ?? c.default;
                return val !== c.default;
              }).map((ctrl) => (
                <span key={ctrl.id} className="px-2 py-0.5 rounded-full bg-accent-dim text-accent text-ui-sm border border-accent/30">
                  {ctrl.label}: {mixerValues[ctrl.id]}{ctrl.unit}
                </span>
              ))}
              {MIXER_CONTROLS.every(c => (mixerValues[c.id] ?? c.default) === c.default) && (
                <span className="text-ui-sm text-text-muted">No effects active</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
