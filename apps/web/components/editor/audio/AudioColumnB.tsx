'use client';

// ─── AudioColumnB — Sidebar A/B v2 Phase 4d ────────────────────────────
//
// Deep editor for whichever font is loaded in Column A. Keeps EVERY
// surface the legacy `AudioPanel` (= `SoundFontPanel` + `TimelinePanel`
// inside `ReorderableSections`) renders today, just reshaped into the
// A/B form factor:
//
//   - Sticky header — font name + manifest summary + clear button.
//   - Sub-tab bar — Events / EQ-Effects / Effect Presets / Sequencer.
//     The first three mirror the legacy SoundFontPanel sub-tabs (the
//     "Library" sub-tab was rolled into Column A; the user-facing
//     library directory chooser is surfaced in the Events sub-tab so
//     users without a library configured can still set one from here).
//   - Events — drag-drop import + import progress + manifest table +
//     11 sound-event triggers + library-folder picker for first-run.
//   - EQ / Effects — 3-band EQ + 8 effect knobs + master volume.
//   - Effect Presets — 6 one-click chains + active-effects summary.
//   - Sequencer — the legacy TimelinePanel, mounted whole.
//
// What's NOT here vs. legacy:
//   - The "Library" sub-tab body — Column A is the canonical font list
//     surface in the A/B layout. The folder-picker control + "scan
//     status" lift to the Events sub-tab when the user hasn't set a
//     library yet (so first-run flow still works from Column B alone).
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.8 — Column B = "Selected
// font's preview + EQ/effects mixer".

import { useCallback, useRef, useState } from 'react';
import { useAudioFontStore } from '@/stores/audioFontStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioMixerStore } from '@/stores/audioMixerStore';
import type { MixerValues } from '@/stores/audioMixerStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { TimelinePanel } from '@/components/editor/TimelinePanel';
import { scoreFontForConfig, pairingLabel } from '@/lib/fontPairing';
import { useMemo } from 'react';
import {
  SOUND_EVENTS,
  MIXER_CONTROLS,
  EFFECT_PRESETS,
  AUDIO_SUBTABS,
  DEFAULT_AUDIO_SUBTAB,
  type AudioSubTab,
} from './audioCatalog';

// ─── Component ─────────────────────────────────────────────────────────

export function AudioColumnB(): JSX.Element {
  const [activeSubTab, setActiveSubTab] = useState<AudioSubTab>(DEFAULT_AUDIO_SUBTAB);
  const [playingEvent, setPlayingEvent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio engine + font store wiring (mirrors legacy SoundFontPanel).
  const audio = useAudioEngine();
  const fontName = useAudioFontStore((s) => s.fontName);
  const manifest = useAudioFontStore((s) => s.manifest);
  const isLoading = useAudioFontStore((s) => s.isLoading);
  const loadProgress = useAudioFontStore((s) => s.loadProgress);
  const warnings = useAudioFontStore((s) => s.warnings);
  const buffers = useAudioFontStore((s) => s.buffers);
  const clearFont = useAudioFontStore((s) => s.clearFont);
  const libraryHandle = useAudioFontStore((s) => s.libraryHandle);
  const setLibraryHandle = useAudioFontStore((s) => s.setLibraryHandle);

  // Mixer store wiring.
  const mixerValues = useAudioMixerStore((s) => s.mixerValues);
  const activePreset = useAudioMixerStore((s) => s.activePresetId);
  const setMixerValue = useAudioMixerStore((s) => s.setMixerValue);
  const applyPreset = useAudioMixerStore((s) => s.applyPreset);

  // Pairing score for the loaded font + active preset config.
  const bladeConfig = useBladeStore((s) => s.config);
  const pairingScore = useMemo(() => {
    if (!fontName) return 0;
    return scoreFontForConfig(fontName, {
      style: bladeConfig.style,
      ignition: bladeConfig.ignition,
      baseColor: bladeConfig.baseColor,
      name: bladeConfig.name,
    }).score;
  }, [
    fontName,
    bladeConfig.style,
    bladeConfig.ignition,
    bladeConfig.baseColor,
    bladeConfig.name,
  ]);
  const pairing = pairingLabel(pairingScore);

  // ─── Import handlers (drag-drop folder + folder picker) ─────────────

  const hasFileSystemAccess =
    typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const handleFontImport = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      await audio.loadFont(files);
    },
    [audio],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFontImport(e.dataTransfer.files);
    },
    [handleFontImport],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handlePickLibrary = useCallback(async () => {
    if (!hasFileSystemAccess) return;
    try {
      const handle = await (
        window as unknown as {
          showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
        }
      ).showDirectoryPicker();
      await setLibraryHandle(handle);
      setTimeout(() => {
        useAudioFontStore.getState().scanLibrary();
      }, 100);
    } catch {
      // User cancelled the picker — no-op.
    }
  }, [hasFileSystemAccess, setLibraryHandle]);

  // ─── Event playback handler ────────────────────────────────────────

  const handlePlayEvent = useCallback(
    (eventId: string) => {
      if (playingEvent === eventId) {
        if (eventId === 'hum') audio.stopHum();
        setPlayingEvent(null);
        return;
      }
      const played = audio.playEvent(eventId);
      if (played) {
        setPlayingEvent(eventId);
        const event = SOUND_EVENTS.find((e) => e.id === eventId);
        if (event && !event.loop) {
          setTimeout(() => setPlayingEvent(null), 2000);
        }
      }
    },
    [playingEvent, audio],
  );

  const handleMixerChange = useCallback(
    (id: keyof MixerValues, value: number) => {
      setMixerValue(id, value);
    },
    [setMixerValue],
  );

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" data-testid="audio-column-b">
      {/* Sticky header — loaded font name + clear + pairing badge. */}
      <header className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <div className="flex items-baseline gap-3">
          <h3 className="font-mono uppercase text-ui-sm tracking-[0.10em] text-text-primary">
            {fontName ? fontName : 'No font loaded'}
          </h3>
          {fontName && manifest && (
            <span className="text-ui-xs text-text-muted truncate">
              {manifest.files.length} file
              {manifest.files.length === 1 ? '' : 's'}
              {manifest.smoothSwingPairs.length > 0 &&
                ` · ${manifest.smoothSwingPairs.length} SmoothSwing`}
            </span>
          )}
          {fontName && pairing.tag !== 'neutral' && (
            <span
              className="ml-auto text-ui-xs uppercase tracking-wider font-mono px-1.5 py-0.5 rounded shrink-0"
              style={{
                color: pairing.color,
                background: pairing.color
                  .replace('rgb(', 'rgba(')
                  .replace(')', ' / 0.12)'),
                border: `1px solid ${pairing.color
                  .replace('rgb(', 'rgba(')
                  .replace(')', ' / 0.35)')}`,
              }}
              title={`Pairing score ${Math.round(pairingScore * 100)}% — recommended for this blade`}
            >
              {pairing.label}
            </span>
          )}
          {fontName && (
            <button
              onClick={() => clearFont()}
              className="ml-auto text-ui-xs px-1.5 py-0.5 rounded border border-border-subtle text-text-muted hover:text-text-secondary"
              aria-label="Clear loaded sound font"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Sub-tab bar — events / mixer / presets / sequencer. */}
      <nav
        className="px-3 py-2 border-b border-border-subtle bg-bg-deep/30 shrink-0"
        role="tablist"
        aria-label="Audio editor section"
      >
        <div className="flex gap-1.5 flex-wrap">
          {AUDIO_SUBTABS.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSubTab(tab.id)}
                className={[
                  'px-2.5 py-1 rounded text-ui-sm border transition-colors',
                  isActive
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Scrolling body. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {/* ── Events ──────────────────────────────────────────────── */}
        {activeSubTab === 'events' && (
          <div className="space-y-4">
            {/* Drag-drop import dropzone. */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={[
                'border-2 border-dashed rounded-panel p-4 text-center transition-colors cursor-pointer',
                isLoading
                  ? 'border-accent/50 bg-accent-dim/10'
                  : 'border-border-subtle hover:border-accent/50',
              ].join(' ')}
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
                ) : (
                  'Drop font folder here or click to browse'
                )}
              </div>
            </div>

            {/* Library directory picker — surfaced from Column A's
                first-run flow. Hidden when a library is already set;
                Column A's "Library:" indicator covers the post-set
                state, and the Events tab is the right place for the
                "I haven't set this up yet" call to action. */}
            {!libraryHandle && hasFileSystemAccess && (
              <div className="border-2 border-dashed border-border-subtle rounded-panel p-3 text-center">
                <div className="text-ui-xs text-text-muted mb-2 flex items-center justify-center gap-1">
                  Or point KyberStation at your local sound font collection
                  for an instant searchable library.
                  <HelpTooltip text="Select the top-level folder containing your sound font subfolders. KyberStation scans each subfolder for audio files, detects formats (Proffie/CFX), and shows completeness." />
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <button
                    onClick={handlePickLibrary}
                    className="px-3 py-1.5 rounded border border-accent bg-accent-dim/20 text-accent text-ui-xs font-medium hover:bg-accent-dim/40 transition-colors"
                  >
                    Set Font Library Folder
                  </button>
                  <HelpTooltip text="Picks the parent folder containing your sound font subfolders. KyberStation scans each subfolder, detects format (Proffie/CFX) and SmoothSwing v2 pairs, and shows completeness. Settings persist via browser storage — you only set this once." />
                </div>
              </div>
            )}
            {!hasFileSystemAccess && !libraryHandle && (
              <div
                className="rounded-panel p-3 text-ui-sm border space-y-1.5"
                style={{
                  background: 'rgb(var(--status-warn) / 0.1)',
                  borderColor: 'rgb(var(--status-warn) / 0.3)',
                  color: 'rgb(var(--status-warn) / 0.85)',
                }}
              >
                <p>
                  Font library browsing requires the File System Access API.
                  Supported in Chrome, Edge, Arc, and Brave (Brave users:
                  enable{' '}
                  <code className="font-mono px-1 py-0.5 rounded bg-bg-deep/60 text-ui-xs">
                    brave://flags/#file-system-access-api
                  </code>
                  ). Not yet supported in Safari or Firefox.
                </p>
                <p>
                  You can still import individual fonts via drag-and-drop
                  above.
                </p>
              </div>
            )}

            {/* Decode warnings. */}
            {warnings.length > 0 && (
              <div
                className="rounded-panel p-2.5 border"
                style={{
                  background: 'rgb(var(--status-warn) / 0.1)',
                  borderColor: 'rgb(var(--status-warn) / 0.3)',
                }}
              >
                <h4
                  className="text-ui-sm uppercase tracking-widest font-semibold mb-1"
                  style={{ color: 'rgb(var(--status-warn))' }}
                >
                  Warnings
                </h4>
                <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
                  {warnings.slice(0, 10).map((w, i) => (
                    <div
                      key={i}
                      className="text-ui-sm"
                      style={{ color: 'rgb(var(--status-warn) / 0.85)' }}
                    >
                      {w}
                    </div>
                  ))}
                  {warnings.length > 10 && (
                    <div
                      className="text-ui-sm"
                      style={{ color: 'rgb(var(--status-warn) / 0.55)' }}
                    >
                      +{warnings.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Font manifest. */}
            {manifest && (
              <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
                <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
                  Font Contents
                </h4>
                <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-1.5 text-ui-sm font-mono">
                  {Object.entries(manifest.categories)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => {
                      const hasBuffers = (buffers.get(category)?.length ?? 0) > 0;
                      return (
                        <div
                          key={category}
                          className={[
                            'flex items-center justify-between rounded px-2 py-1',
                            hasBuffers ? 'bg-bg-deep' : 'bg-bg-deep opacity-50',
                          ].join(' ')}
                        >
                          <span className="text-text-secondary">{category}</span>
                          <span
                            className={hasBuffers ? '' : 'text-text-muted'}
                            style={
                              hasBuffers ? { color: 'rgb(var(--status-ok))' } : undefined
                            }
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Sound events. */}
            <div>
              <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
                Sound Events
                <HelpTooltip text="Preview individual sound files from the loaded font. Each event corresponds to a saber action. Grayed-out events have no audio files in this font." />
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
                      aria-label={
                        isPlaying ? `Stop ${event.label}` : `Play ${event.label}`
                      }
                      className={[
                        'flex items-center gap-2 px-2 py-1.5 rounded text-ui-sm border transition-colors',
                        isPlaying
                          ? ''
                          : hasSound
                            ? 'border-border-subtle bg-bg-surface text-text-secondary hover:border-accent'
                            : 'border-border-subtle bg-bg-deep text-text-muted opacity-40 cursor-not-allowed',
                      ].join(' ')}
                      style={
                        isPlaying
                          ? {
                              color: 'rgb(var(--status-ok))',
                              background: 'rgb(var(--status-ok) / 0.18)',
                              borderColor: 'rgb(var(--status-ok) / 0.5)',
                            }
                          : undefined
                      }
                    >
                      <span className="text-ui-md" aria-hidden="true">
                        {isPlaying ? '■' : '▶'}
                      </span>
                      <span>{event.label}</span>
                      {event.loop && (
                        <span className="text-text-muted text-ui-xs">LOOP</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── EQ / Effects mixer ─────────────────────────────────── */}
        {activeSubTab === 'mixer' && (
          <div className="space-y-4">
            {/* EQ section. */}
            <div>
              <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
                Equalizer
                <HelpTooltip text="Three-band EQ to shape the font's tone. Boost bass for a deeper hum, cut treble for a warmer sound. These are preview-only and do not affect the actual saber." />
              </h4>
              <div className="space-y-2 bg-bg-surface rounded-panel p-3 border border-border-subtle">
                {MIXER_CONTROLS.filter((c) => c.category === 'eq').map((ctrl) => (
                  <div key={ctrl.id} className="flex items-center gap-2">
                    <label
                      htmlFor={`eq-${ctrl.id}`}
                      className="text-ui-sm text-text-secondary w-12"
                    >
                      {ctrl.label}
                    </label>
                    <input
                      id={`eq-${ctrl.id}`}
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step}
                      value={mixerValues[ctrl.id] ?? ctrl.default}
                      onChange={(e) =>
                        handleMixerChange(ctrl.id, Number(e.target.value))
                      }
                      className="flex-1"
                    />
                    <span className="text-ui-sm text-text-muted font-mono w-14 text-right">
                      {(mixerValues[ctrl.id] ?? ctrl.default) > 0 ? '+' : ''}
                      {mixerValues[ctrl.id] ?? ctrl.default}
                      {ctrl.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Effects section. */}
            <div>
              <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
                Effects
                <HelpTooltip text="Audio effects applied to the font preview. Distortion adds grit (great for unstable blades), Reverb adds space, Bitcrusher creates lo-fi character. Use Effect Presets tab for quick combos." />
              </h4>
              <div className="space-y-2 bg-bg-surface rounded-panel p-3 border border-border-subtle">
                {MIXER_CONTROLS.filter((c) => c.category === 'effects').map(
                  (ctrl) => (
                    <div key={ctrl.id} className="flex items-center gap-2">
                      <label
                        htmlFor={`fx-${ctrl.id}`}
                        className="text-ui-sm text-text-secondary w-16 shrink-0"
                      >
                        {ctrl.label}
                      </label>
                      <input
                        id={`fx-${ctrl.id}`}
                        type="range"
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={mixerValues[ctrl.id] ?? ctrl.default}
                        onChange={(e) =>
                          handleMixerChange(ctrl.id, Number(e.target.value))
                        }
                        className="flex-1"
                      />
                      <span className="text-ui-sm text-text-muted font-mono w-12 text-right">
                        {mixerValues[ctrl.id] ?? ctrl.default}
                        {ctrl.unit}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Master section. */}
            <div>
              <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
                Master
                <HelpTooltip
                  text="Master output volume for the audio preview. Does not affect the saber's actual volume setting in config.h."
                  proffie="#define VOLUME 2000"
                />
              </h4>
              <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
                {MIXER_CONTROLS.filter((c) => c.category === 'master').map(
                  (ctrl) => (
                    <div key={ctrl.id} className="flex items-center gap-2">
                      <label
                        htmlFor={`master-${ctrl.id}`}
                        className="text-ui-sm text-text-secondary w-12"
                      >
                        {ctrl.label}
                      </label>
                      <input
                        id={`master-${ctrl.id}`}
                        type="range"
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={mixerValues[ctrl.id] ?? ctrl.default}
                        onChange={(e) =>
                          handleMixerChange(ctrl.id, Number(e.target.value))
                        }
                        className="flex-1"
                      />
                      <span className="text-ui-sm text-text-muted font-mono w-12 text-right">
                        {mixerValues[ctrl.id] ?? ctrl.default}
                        {ctrl.unit}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Effect chain presets ───────────────────────────────── */}
        {activeSubTab === 'presets' && (
          <div className="space-y-3">
            <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
              Effect Chain Presets
              <HelpTooltip text="One-click audio effect combos for common saber sounds. Each preset sets multiple EQ and effects sliders at once. Switch to the EQ/Effects tab to fine-tune after applying." />
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {EFFECT_PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={[
                      'text-left px-3 py-2.5 rounded text-ui-xs transition-colors border',
                      isActive
                        ? 'border-accent bg-accent-dim text-accent'
                        : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light',
                    ].join(' ')}
                  >
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-ui-sm text-text-muted mt-0.5">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active effects summary. */}
            <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
              <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
                Active Effects
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {MIXER_CONTROLS.filter((c) => {
                  const val = mixerValues[c.id] ?? c.default;
                  return val !== c.default;
                }).map((ctrl) => (
                  <span
                    key={ctrl.id}
                    className="px-2 py-0.5 rounded-full bg-accent-dim text-accent text-ui-sm border border-accent/30"
                  >
                    {ctrl.label}: {mixerValues[ctrl.id]}
                    {ctrl.unit}
                  </span>
                ))}
                {MIXER_CONTROLS.every(
                  (c) => (mixerValues[c.id] ?? c.default) === c.default,
                ) && (
                  <span className="text-ui-sm text-text-muted">
                    No effects active
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Sequencer (legacy TimelinePanel) ────────────────────── */}
        {activeSubTab === 'sequencer' && (
          <div>
            <TimelinePanel />
          </div>
        )}
      </div>
    </div>
  );
}
