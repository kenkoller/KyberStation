'use client';

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

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
  const importedRawCode = useBladeStore((s) => s.config.importedRawCode);
  const importedAt = useBladeStore((s) => s.config.importedAt);
  const importedSource = useBladeStore((s) => s.config.importedSource);
  const convertImportToNative = useBladeStore((s) => s.convertImportToNative);

  const relativeTime = useMemo(() => {
    if (typeof importedAt !== 'number' || !Number.isFinite(importedAt)) return null;
    return formatRelativeTime(importedAt, nowMs ?? Date.now());
  }, [importedAt, nowMs]);

  if (!importedRawCode || importedRawCode.length === 0) return null;

  const sourceLabel = importedSource ?? 'External source';

  return (
    <div
      role="status"
      aria-label="Imported configuration status"
      data-testid="import-status-banner"
      className="mb-3 px-3 py-2.5 rounded-panel border"
      style={{
        background: 'rgb(var(--badge-creative) / 0.1)',
        borderColor: 'rgb(var(--badge-creative) / 0.4)',
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
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
        </div>
        <button
          type="button"
          onClick={convertImportToNative}
          className="touch-target px-3 py-1.5 rounded-interactive text-ui-xs font-medium border focus-visible:ring-2 focus-visible:ring-accent transition-colors shrink-0"
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
  );
}
