'use client';

// ─── AudioColumnA — Sidebar A/B v2 Phase 4d ────────────────────────────
//
// Scrollable sound-font list rendered in Column A of the
// MainContentABLayout when the active sidebar section is `audio` AND
// `useABLayout` is true.
//
// Surfaces three classes of font row so the user can always see what's
// loaded vs. what's available vs. how to import more:
//
//   1. The currently-loaded font (if any) — pinned at the top with an
//      "active" stripe matching the rest of the A/B sections.
//   2. Library fonts scanned from `audioFontStore.libraryHandle` —
//      filtered by the search box, ordered as the store returns them.
//   3. A trailing "Set library folder…" pseudo-row when the user hasn't
//      pointed KyberStation at a folder yet (this is the only entry
//      into the File System Access flow surfaced in Column A).
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.8:
//   - Each row: name + bundle/user badge + mini preview button (load)
//   - Filter input at top (mirror of the legacy library search)
//   - Active row matches `audioFontStore.fontName`
//
// Source-of-truth nuances:
//   - The audio store has a single `fontName` slot — it's the loaded
//     font, not a "selected but not loaded" cursor. So clicking a
//     library row = load it; there is no separate "pick" state to
//     manage. This matches the legacy `FontLibraryRow` Load button.
//   - Drag-and-drop import / Library folder pick are intentionally NOT
//     in Column A — they lift cleanly into Column B's events / library
//     surfaces and would crowd the list. Column A's goal is "show me
//     what's available, let me activate one."

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAudioFontStore } from '@/stores/audioFontStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { playUISound } from '@/lib/uiSounds';
import { scoreFontForConfig, pairingLabel } from '@/lib/fontPairing';
import { toast } from '@/lib/toastManager';
import type { LibraryFontEntry } from '@kyberstation/sound';
import { COMPLETENESS_COLORS, FORMAT_LABELS } from './audioCatalog';

// Unified row shape — either the imported (drag-drop) font, a library
// scan entry, or a placeholder when no library is configured.
type FontRow =
  | {
      kind: 'imported';
      id: string;
      name: string;
      fileCount: number;
    }
  | {
      kind: 'library';
      id: string;
      entry: LibraryFontEntry;
    };

export function AudioColumnA(): JSX.Element {
  const fontName = useAudioFontStore((s) => s.fontName);
  const manifest = useAudioFontStore((s) => s.manifest);
  const libraryFonts = useAudioFontStore((s) => s.libraryFonts);
  const libraryHandle = useAudioFontStore((s) => s.libraryHandle);
  const libraryPath = useAudioFontStore((s) => s.libraryPath);
  const isScanning = useAudioFontStore((s) => s.isScanning);
  const hydrateLibrary = useAudioFontStore((s) => s.hydrateLibrary);

  const audio = useAudioEngine();

  const [filter, setFilter] = useState('');
  const [loadingFontName, setLoadingFontName] = useState<string | null>(null);

  // Hydrate the library handle on mount (same idempotent call legacy
  // FontLibraryTab makes — safe to fire from either surface).
  useEffect(() => {
    hydrateLibrary();
  }, [hydrateLibrary]);

  // Pairing scores so the "Recommended" badge mirrors the legacy
  // FontLibraryRow display. Pulled from bladeStore so they refresh when
  // the user changes preset.
  const bladeConfig = useBladeStore((s) => s.config);
  const pairingCtx = useMemo(
    () => ({
      style: bladeConfig.style,
      ignition: bladeConfig.ignition,
      baseColor: bladeConfig.baseColor,
      name: bladeConfig.name,
    }),
    [bladeConfig.style, bladeConfig.ignition, bladeConfig.baseColor, bladeConfig.name],
  );
  const fontScores = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of libraryFonts) {
      map.set(f.name, scoreFontForConfig(f.name, pairingCtx).score);
    }
    return map;
  }, [libraryFonts, pairingCtx]);

  // Compose the row list: imported font (if loaded and not also a
  // library entry) → library fonts (filtered by search).
  const rows: FontRow[] = useMemo(() => {
    const out: FontRow[] = [];

    const needle = filter.trim().toLowerCase();

    // Imported font — only surfaced when we have a loaded font that
    // isn't already a library entry by the same name. Otherwise it
    // appears once in the library section with the active stripe.
    if (fontName) {
      const isLibraryEntry = libraryFonts.some((f) => f.name === fontName);
      if (!isLibraryEntry && (!needle || fontName.toLowerCase().includes(needle))) {
        out.push({
          kind: 'imported',
          id: `imported:${fontName}`,
          name: fontName,
          fileCount: manifest?.files.length ?? 0,
        });
      }
    }

    // Library fonts — apply the filter.
    for (const entry of libraryFonts) {
      if (needle && !entry.name.toLowerCase().includes(needle)) continue;
      out.push({
        kind: 'library',
        id: `library:${entry.name}`,
        entry,
      });
    }

    return out;
  }, [filter, fontName, manifest, libraryFonts]);

  const handleLoadLibraryFont = useCallback(
    async (target: string) => {
      const handle = useAudioFontStore.getState().libraryHandle;
      if (!handle) return;
      setLoadingFontName(target);
      try {
        const { loadFontFromDirectoryHandle } = await import('@kyberstation/sound');
        const files = await loadFontFromDirectoryHandle(handle, target);
        if (files.length > 0) {
          await audio.loadFont(files);
          playUISound('success');
        } else {
          toast.warning(`Font "${target}" has no audio files`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Failed to load font "${target}": ${msg}`);
      } finally {
        setLoadingFontName(null);
      }
    },
    [audio],
  );

  const handleSelect = useCallback(
    (row: FontRow) => {
      if (row.kind === 'library') {
        if (row.entry.name === fontName) return; // already loaded
        playUISound('button-click');
        void handleLoadLibraryFont(row.entry.name);
      }
      // Imported rows are always already-active — clicking them is a no-op
      // (the Clear control lives on the Column B header).
    },
    [fontName, handleLoadLibraryFont],
  );

  return (
    <div className="flex flex-col h-full" data-testid="audio-column-a">
      {/* Filter input — sticky at the top of A. */}
      <div className="px-3 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <label htmlFor="audio-font-filter" className="sr-only">
          Filter sound fonts
        </label>
        <input
          id="audio-font-filter"
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={
            libraryFonts.length > 0
              ? `Filter ${libraryFonts.length} fonts…`
              : 'Filter fonts…'
          }
          className="w-full px-2 py-1 text-ui-xs bg-bg-surface border border-border-subtle rounded-chrome text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-border"
        />
        {libraryHandle && (
          <div
            className="mt-1 text-ui-xs text-text-muted truncate font-mono"
            title={libraryPath}
          >
            <span className="text-text-muted">Library:</span>{' '}
            <span className="text-text-secondary">{libraryPath}</span>
            {isScanning && <span className="ml-1">· scanning…</span>}
          </div>
        )}
      </div>

      {/* Scrollable list body. */}
      <ul
        role="listbox"
        aria-label="Sound font"
        aria-activedescendant={fontName ? `audio-font-row-${fontName}` : undefined}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {rows.length === 0 && (
          <li className="px-3 py-4 text-ui-xs text-text-muted italic text-center">
            {libraryFonts.length === 0
              ? !libraryHandle
                ? 'No fonts loaded. Open Column B to import a font folder or set a library directory.'
                : 'No fonts in your library yet — refresh from Column B.'
              : `No fonts match "${filter}"`}
          </li>
        )}
        {rows.map((row) => {
          const isActive =
            (row.kind === 'imported' && row.name === fontName) ||
            (row.kind === 'library' && row.entry.name === fontName);
          const isLoading =
            row.kind === 'library' && loadingFontName === row.entry.name;
          const score =
            row.kind === 'library' ? fontScores.get(row.entry.name) ?? 0 : 0;
          const pair = pairingLabel(score);

          // Resolve the per-row metadata for display.
          const name = row.kind === 'imported' ? row.name : row.entry.name;
          const fileCount =
            row.kind === 'imported' ? row.fileCount : row.entry.fileCount;
          const completenessKey =
            row.kind === 'library' ? row.entry.completeness : 'complete';
          const comp = COMPLETENESS_COLORS[completenessKey];
          const formatKey =
            row.kind === 'library' ? row.entry.format : 'imported';
          const formatLabel = FORMAT_LABELS[formatKey] ?? 'IMP';
          const sourceLabel = row.kind === 'imported' ? 'USR' : 'LIB';
          const sourceTooltip =
            row.kind === 'imported'
              ? 'Imported via drag-and-drop'
              : 'From your font library folder';

          return (
            <li
              key={row.id}
              id={`audio-font-row-${name}`}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => handleSelect(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(row);
                }
              }}
              className={[
                'flex items-start gap-2.5 px-3 py-2 cursor-pointer outline-none border-l-2 transition-colors',
                'focus-visible:bg-bg-surface/80',
                isActive
                  ? 'bg-accent-dim/30 border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:bg-bg-surface/50 hover:text-text-primary',
              ].join(' ')}
            >
              {/* 40×40 status well — completeness dot + format badge.
                  Mirrors the BladeStyle thumbnail well dimension. */}
              <div
                className="shrink-0 bg-bg-deep rounded-chrome overflow-hidden border border-border-subtle flex flex-col items-center justify-center gap-0.5"
                style={{ width: 40, height: 40 }}
                aria-hidden="true"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: comp.color }}
                  title={comp.label}
                />
                <span className="text-[8px] font-mono uppercase tracking-wider text-text-muted">
                  {formatLabel}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className={[
                      'text-ui-sm font-medium font-mono truncate',
                      isActive ? 'text-accent' : 'text-text-primary',
                    ].join(' ')}
                  >
                    {name}
                  </div>
                  {/* Source badge (LIB / USR) — colorblind-safe via the
                      typographic glyph, not a color-only signal. */}
                  <span
                    className="shrink-0 text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded bg-bg-deep border border-border-subtle text-text-muted"
                    title={sourceTooltip}
                  >
                    {sourceLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-ui-xs text-text-muted">
                  <span className="tabular-nums">{fileCount} files</span>
                  {row.kind === 'library' && row.entry.hasSmoothSwing && (
                    <span title="Has SmoothSwing audio pairs">SS</span>
                  )}
                  {pair.tag !== 'neutral' && (
                    <span
                      className="text-[9px] uppercase tracking-wider font-mono"
                      style={{ color: pair.color }}
                      title={`Pairing score ${Math.round(score * 100)}%`}
                    >
                      {pair.label}
                    </span>
                  )}
                  {isLoading && (
                    <span className="text-accent">loading…</span>
                  )}
                  {isActive && !isLoading && (
                    <span className="text-accent">active</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
