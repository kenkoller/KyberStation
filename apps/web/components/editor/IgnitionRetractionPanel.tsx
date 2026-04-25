'use client';

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { MiniGalleryPicker } from '@/components/shared/MiniGalleryPicker';
import { getIgnitionThumbnail } from '@/lib/ignitionThumbnails';
import { getRetractionThumbnail } from '@/lib/retractionThumbnails';
import {
  IGNITION_STYLES,
  RETRACTION_STYLES,
} from '@/lib/transitionCatalogs';

// ─── Ignition / Retraction focused panel ─────────────────────────────────────
//
// Renders only the ignition + retraction sections so the ignition-retraction
// panel slot has a distinct view instead of duplicating the full EffectPanel.
// Extracted from TabColumnContent.tsx inline 2026-04-21 as part of OV9; same
// catalog entries, same store wiring, now driven by MiniGalleryPicker +
// static SVG thumbnails (lib/ignitionThumbnails.tsx + retractionThumbnails.tsx).
//
// PR 5a (2026-04-24): the 19-ignition + 13-retraction tables moved to
// `lib/transitionCatalogs.ts` so the Inspector's QuickIgnition /
// QuickRetraction pickers and this deep-tuning panel share one source.

export function IgnitionRetractionPanel() {
  const config = useBladeStore((s) => s.config);
  const setIgnition = useBladeStore((s) => s.setIgnition);
  const setRetraction = useBladeStore((s) => s.setRetraction);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const ignitionItems = useMemo(
    () =>
      IGNITION_STYLES.map((style) => {
        const entry = getIgnitionThumbnail(style.id);
        return {
          id: style.id,
          label: style.label,
          thumbnail: entry.thumbnail,
          description: style.desc,
        };
      }),
    [],
  );

  const retractionItems = useMemo(
    () =>
      RETRACTION_STYLES.map((style) => {
        const entry = getRetractionThumbnail(style.id);
        return {
          id: style.id,
          label: style.label,
          thumbnail: entry.thumbnail,
          description: style.desc,
        };
      }),
    [],
  );

  return (
    <div className="space-y-4">
      {/* Ignition */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Ignition Style
          <HelpTooltip
            text="How the blade extends when activated. Controls the visual transition from off to on."
            proffie="InOutTrL<TrWipe<300>>"
          />
        </h3>
        <MiniGalleryPicker
          items={ignitionItems}
          activeId={config.ignition}
          onSelect={setIgnition}
          columns={3}
          ariaLabel="Ignition style picker"
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-ui-xs text-text-muted w-24 shrink-0">Ignition Speed</span>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={(config.ignitionMs as number | undefined) ?? 300}
            onChange={(e) => updateConfig({ ignitionMs: Number(e.target.value) })}
            aria-label="Ignition speed in milliseconds"
            className="flex-1"
          />
          <span className="text-ui-xs text-text-muted font-mono w-12 text-right">
            {(config.ignitionMs as number | undefined) ?? 300}ms
          </span>
        </div>
      </div>

      {/* Retraction */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
          Retraction Style
          <HelpTooltip text="How the blade retracts when deactivated." proffie="InOutTrL<TrWipe<500>>" />
        </h3>
        <MiniGalleryPicker
          items={retractionItems}
          activeId={config.retraction}
          onSelect={setRetraction}
          columns={3}
          ariaLabel="Retraction style picker"
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-ui-xs text-text-muted w-24 shrink-0">Retraction Speed</span>
          <input
            type="range"
            min={100}
            max={3000}
            step={50}
            value={(config.retractionMs as number | undefined) ?? 500}
            onChange={(e) => updateConfig({ retractionMs: Number(e.target.value) })}
            aria-label="Retraction speed in milliseconds"
            className="flex-1"
          />
          <span className="text-ui-xs text-text-muted font-mono w-12 text-right">
            {(config.retractionMs as number | undefined) ?? 500}ms
          </span>
        </div>
      </div>
    </div>
  );
}
