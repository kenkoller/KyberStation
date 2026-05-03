'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUserPresetStore } from '@/stores/userPresetStore';
import { useUIStore } from '@/stores/uiStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { toast } from '@/lib/toastManager';

/**
 * Render a relative-time string for the imported-at timestamp.
 * Falls back to a literal "just now" / "moments ago" range so we don't
 * pull in a date library for one usage site.
 */
function formatRelativeTime(importedAt: number, now: number): string {
  const deltaMs = Math.max(0, now - importedAt);
  const deltaMin = Math.floor(deltaMs / 60_000);
  if (deltaMin < 1) return 'moments ago';
  if (deltaMin === 1) return '1 minute ago';
  if (deltaMin < 60) return `${deltaMin} minutes ago`;
  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr === 1) return '1 hour ago';
  if (deltaHr < 24) return `${deltaHr} hours ago`;
  const deltaDay = Math.floor(deltaHr / 24);
  if (deltaDay === 1) return '1 day ago';
  return `${deltaDay} days ago`;
}

export interface ImportStatusBannerProps {
  /** Override the comparison timestamp — for deterministic tests. */
  nowMs?: number;
}

/**
 * Surfaces the import-preservation contract whenever
 * `bladeStore.config.importedRawCode` is set: shows where the code
 * came from, when it was imported, that visualizer edits don't change
 * the exported code, and offers the one-way "Convert to Native"
 * escape hatch that strips the import fields and resumes regeneration
 * from BladeConfig.
 *
 * Renders nothing when no import is active (`importedRawCode` absent).
 */
export function ImportStatusBanner({ nowMs }: ImportStatusBannerProps) {
  const config = useBladeStore((s) => s.config);
  const importedRawCode = config.importedRawCode;
  const importedAt = config.importedAt;
  const importedSource = config.importedSource;
  const convertImportToNative = useBladeStore((s) => s.convertImportToNative);
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const savePreset = useUserPresetStore((s) => s.savePreset);
  const userPresets = useUserPresetStore((s) => s.presets);
  const recentImportBatch = useUIStore((s) => s.recentImportBatch);
  const setRecentImportBatch = useUIStore((s) => s.setRecentImportBatch);
  const [saved, setSaved] = useState(false);

  // Auto-scroll the banner into view whenever a new import lands. Tracks
  // the `importedAt` timestamp so we re-scroll for each distinct import
  // (e.g. switching presets in a multi-preset batch) but not on
  // unrelated re-renders. Mobile UX audit (2026-05-02) caught that the
  // banner was below-the-fold by default after Apply on phones — users
  // saw the visualizer update but missed the "your import was preserved"
  // affordance entirely.
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledForRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!importedRawCode || importedRawCode.length === 0) return;
    if (typeof importedAt !== 'number' || !Number.isFinite(importedAt)) return;
    if (lastScrolledForRef.current === importedAt) return;
    lastScrolledForRef.current = importedAt;
    // rAF ensures layout has settled (banner just mounted) before scrolling.
    requestAnimationFrame(() => {
      bannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [importedRawCode, importedAt]);

  const relativeTime = useMemo(() => {
    if (typeof importedAt !== 'number' || !Number.isFinite(importedAt)) return null;
    return formatRelativeTime(importedAt, nowMs ?? Date.now());
  }, [importedAt, nowMs]);

  const handleSave = useCallback(() => {
    const defaultName =
      typeof config.name === 'string' && config.name.length > 0
        ? `${config.name} (imported)`
        : `Imported preset ${new Date().toLocaleTimeString()}`;
    const name = window.prompt('Name this preset:', defaultName);
    if (!name || name.trim().length === 0) return;
    savePreset(name.trim(), { ...config });
    toast.success(`Saved "${name.trim()}"`);
    setSaved(true);
    // Reset the "Saved" affordance after a beat — banner stays as long as
    // the import does, so users can save multiple revisions if they want.
    setTimeout(() => setSaved(false), 2400);
  }, [config, savePreset]);

  const handleSwitchPreset = useCallback(
    (presetId: string) => {
      const preset = userPresets.find((p) => p.id === presetId);
      if (!preset) return;
      loadPreset(preset.config);
    },
    [userPresets, loadPreset],
  );

  const handleConvert = useCallback(() => {
    convertImportToNative();
    // Sprint 5E: clear the batch when converting since the user is
    // explicitly leaving the imported state. The batch's per-preset
    // switcher only makes sense while the import is active.
    setRecentImportBatch(null);
  }, [convertImportToNative, setRecentImportBatch]);

  if (!importedRawCode || importedRawCode.length === 0) return null;

  const sourceLabel = importedSource ?? 'External source';
  // Sprint 5E: show the switcher only when there are 2+ presets in the
  // recent batch AND the current config is one of them (the user
  // hasn't navigated away to a different preset).
  const showSwitcher =
    recentImportBatch !== null &&
    recentImportBatch.length > 1 &&
    recentImportBatch.some((entry) => entry.name === config.name);
  const currentBatchIndex = showSwitcher
    ? recentImportBatch!.findIndex((entry) => entry.name === config.name)
    : -1;

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-label="Imported configuration status"
      data-testid="import-status-banner"
      className="mb-3 px-3 py-2.5 rounded-panel border scroll-mt-3"
      style={{
        background: 'rgb(var(--badge-creative) / 0.1)',
        borderColor: 'rgb(var(--badge-creative) / 0.4)',
      }}
    >
      {/* Mobile UX audit (2026-05-02): default to vertical stack so the
          description has full width on phone + tablet (where Column B is
          ~210-343px wide). Switch to horizontal at desktop+ where there's
          room for description-left + actions-right side-by-side. */}
      <div className="flex flex-col gap-3 desktop:flex-row desktop:items-start desktop:justify-between desktop:flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-ui-sm font-semibold uppercase tracking-widest"
               style={{ color: 'rgb(var(--badge-creative))' }}>
            <span aria-hidden="true">↓</span>
            <span>Imported</span>
            <HelpTooltip text="When raw imported code is preserved on this preset, KyberStation re-emits it byte-for-byte on export. Visualizer-side edits (colors, ignition timing, etc.) update the preview but won't change what's flashed to the saber until you click 'Convert to Native'." />
          </div>
          <div className="mt-1 text-ui-sm text-text-primary">
            From <span className="font-mono">{sourceLabel}</span>
            {relativeTime && (
              <>
                {' · '}
                <span className="text-text-secondary">{relativeTime}</span>
              </>
            )}
          </div>
          <div className="mt-1.5 text-ui-xs text-text-secondary leading-relaxed">
            Original ProffieOS code is preserved on export. Visualizer edits
            update the preview only — they won&apos;t change the exported
            code until you convert.
          </div>
          {/* Sprint 5E: per-preset switcher. When the most recent
              import was a multi-preset batch (e.g. 3 presets from a
              full config.h paste), let users flip the visualizer
              between them without going through the My Presets
              sidebar. Renders only when batch.length > 1 AND the
              current config is one of the batch entries. */}
          {showSwitcher && (
            <div
              className="mt-2 flex items-center gap-2 text-ui-xs"
              data-testid="import-banner-preset-switcher"
            >
              <label
                htmlFor="import-banner-preset-select"
                className="text-text-secondary shrink-0"
              >
                Preset {currentBatchIndex + 1} of {recentImportBatch!.length}:
              </label>
              <select
                id="import-banner-preset-select"
                value={
                  recentImportBatch!.find((e) => e.name === config.name)?.id ?? ''
                }
                onChange={(e) => handleSwitchPreset(e.target.value)}
                className="touch-target px-2 py-1 rounded-interactive text-ui-xs font-mono border bg-bg-deep focus-visible:ring-2 focus-visible:ring-accent transition-colors min-w-0 flex-1"
                style={{
                  borderColor: 'rgb(var(--badge-creative) / 0.4)',
                  color: 'rgb(var(--badge-creative))',
                }}
                aria-label="Switch the visualizer to a different imported preset"
              >
                {recentImportBatch!.map((entry, idx) => (
                  <option key={entry.id} value={entry.id}>
                    {idx + 1}. {entry.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            data-testid="import-banner-save-button"
            className="touch-target px-3 py-1.5 rounded-interactive text-ui-xs font-medium border focus-visible:ring-2 focus-visible:ring-accent transition-colors"
            style={{
              background: saved
                ? 'rgb(var(--status-ok) / 0.2)'
                : 'rgb(var(--badge-creative) / 0.1)',
              borderColor: saved
                ? 'rgb(var(--status-ok) / 0.5)'
                : 'rgb(var(--badge-creative) / 0.4)',
              color: saved
                ? 'rgb(var(--status-ok))'
                : 'rgb(var(--badge-creative))',
            }}
            aria-label="Save this imported preset to your library so you can return to it later"
          >
            {saved ? '✓ Saved' : '★ Save Preset'}
          </button>
          <button
            type="button"
            onClick={handleConvert}
            className="touch-target px-3 py-1.5 rounded-interactive text-ui-xs font-medium border focus-visible:ring-2 focus-visible:ring-accent transition-colors"
            style={{
              background: 'rgb(var(--badge-creative) / 0.18)',
              borderColor: 'rgb(var(--badge-creative) / 0.5)',
              color: 'rgb(var(--badge-creative))',
            }}
            aria-label="Convert imported code to native KyberStation config — discards original code, enables full editing"
          >
            Convert to Native
          </button>
        </div>
      </div>
    </div>
  );
}
