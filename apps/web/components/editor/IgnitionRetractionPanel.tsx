'use client';

import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { MiniGalleryPicker } from '@/components/shared/MiniGalleryPicker';
import { getIgnitionThumbnail } from '@/lib/ignitionThumbnails';
import { getRetractionThumbnail } from '@/lib/retractionThumbnails';

// ─── Ignition / Retraction focused panel ─────────────────────────────────────
//
// Renders only the ignition + retraction sections so the ignition-retraction
// panel slot has a distinct view instead of duplicating the full EffectPanel.
// Extracted from TabColumnContent.tsx inline 2026-04-21 as part of OV9; same
// catalog entries, same store wiring, now driven by MiniGalleryPicker +
// static SVG thumbnails (lib/ignitionThumbnails.tsx + retractionThumbnails.tsx).

const IGNITION_STYLES = [
  { id: 'standard',     label: 'Standard',    desc: 'Classic linear ignition' },
  { id: 'scroll',       label: 'Scroll',       desc: 'Scrolling pixel fill' },
  { id: 'spark',        label: 'Spark',        desc: 'Crackling spark ignition' },
  { id: 'center',       label: 'Center Out',   desc: 'Ignites from center' },
  { id: 'wipe',         label: 'Wipe',         desc: 'Soft wipe reveal' },
  { id: 'stutter',      label: 'Stutter',      desc: 'Flickering unstable ignition' },
  { id: 'glitch',       label: 'Glitch',       desc: 'Digital glitch effect' },
  { id: 'twist',        label: 'Twist',        desc: 'Spiral ignition driven by twist' },
  { id: 'swing',        label: 'Swing',        desc: 'Speed-reactive swing ignition' },
  { id: 'stab',         label: 'Stab',         desc: 'Rapid center-out burst' },
  { id: 'crackle',      label: 'Crackle',      desc: 'Random segment flicker fill' },
  { id: 'fracture',     label: 'Fracture',     desc: 'Radiating crack points' },
  { id: 'flash-fill',   label: 'Flash Fill',   desc: 'White flash then color wipe' },
  { id: 'pulse-wave',   label: 'Pulse Wave',   desc: 'Sequential building waves' },
  { id: 'drip-up',      label: 'Drip Up',      desc: 'Fluid upward flow' },
  { id: 'hyperspace',   label: 'Hyperspace',   desc: 'Streaking star-line ignition' },
  { id: 'summon',       label: 'Summon',       desc: 'Force-pull ignition' },
  { id: 'seismic',      label: 'Seismic',      desc: 'Ground-shake ripple ignition' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];

const RETRACTION_STYLES = [
  { id: 'standard',     label: 'Standard',    desc: 'Linear retraction' },
  { id: 'scroll',       label: 'Scroll',       desc: 'Scrolling retract' },
  { id: 'fadeout',      label: 'Fade Out',     desc: 'Fading retraction' },
  { id: 'center',       label: 'Center In',    desc: 'Retracts to center' },
  { id: 'shatter',      label: 'Shatter',      desc: 'Shattering retraction' },
  { id: 'dissolve',     label: 'Dissolve',     desc: 'Random shuffle turn-off' },
  { id: 'flickerOut',   label: 'Flicker Out',  desc: 'Tip-to-base flicker band' },
  { id: 'unravel',      label: 'Unravel',      desc: 'Sinusoidal thread unwind' },
  { id: 'drain',        label: 'Drain',        desc: 'Gravity drain with meniscus' },
  { id: 'implode',      label: 'Implode',      desc: 'Collapsing inward retraction' },
  { id: 'evaporate',    label: 'Evaporate',    desc: 'Fading particle evaporation' },
  { id: 'spaghettify',  label: 'Spaghettify',  desc: 'Stretching gravitational pull' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];

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
