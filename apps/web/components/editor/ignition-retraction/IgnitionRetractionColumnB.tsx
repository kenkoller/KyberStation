'use client';

// ─── IgnitionRetractionColumnB — Sidebar A/B v2 Phase 3 ───────────────
//
// Deep editor for whichever animation is active in Column A. The
// active animation depends on which tab is selected in A — when the
// Ignition tab is active, this column edits `config.ignition` /
// `config.ignitionMs` / `config.ignitionEasing` / `config.ignitionCurve`;
// when the Retraction tab is active, the same UI edits the retraction
// counterparts.
//
// Per `docs/SIDEBAR_AB_LAYOUT_v2_DESIGN.md` §4.3:
//   - Header: animation name + 1-line description
//   - Speed slider (ignitionMs OR retractionMs depending on tab)
//   - Easing curve dropdown (15 EASING_PRESETS)
//   - Custom-curve editor — only shown when active style === 'custom-curve';
//     reuses the legacy 4-component cubic-bezier control-point grid.

import { useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { ScrubField } from '@/components/shared/ScrubField';
import {
  IGNITION_STYLES,
  RETRACTION_STYLES,
  type TransitionStyle,
} from '@/lib/transitionCatalogs';
import type { IgnitionRetractionTab } from './tabState';

export interface IgnitionRetractionColumnBProps {
  activeTab: IgnitionRetractionTab;
}

// Mirrors EffectPanel.EASING_PRESETS exactly. Keeping a local copy
// rather than importing from EffectPanel because the constant isn't
// exported there and duplicating a 15-row table is cheaper than
// promoting it to a shared module just for this consumer.
const EASING_PRESETS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'linear',            label: 'Linear' },
  { id: 'ease-in-quad',      label: 'Ease In (Quad)' },
  { id: 'ease-out-quad',     label: 'Ease Out (Quad)' },
  { id: 'ease-in-out-quad',  label: 'Ease In-Out (Quad)' },
  { id: 'ease-in-cubic',     label: 'Ease In (Cubic)' },
  { id: 'ease-out-cubic',    label: 'Ease Out (Cubic)' },
  { id: 'ease-in-out-cubic', label: 'Ease In-Out (Cubic)' },
  { id: 'ease-in-quart',     label: 'Ease In (Quart)' },
  { id: 'ease-out-quart',    label: 'Ease Out (Quart)' },
  { id: 'ease-in-out-quart', label: 'Ease In-Out (Quart)' },
  { id: 'ease-in-expo',      label: 'Ease In (Expo)' },
  { id: 'ease-out-expo',     label: 'Ease Out (Expo)' },
  { id: 'bounce',            label: 'Bounce' },
  { id: 'elastic',           label: 'Elastic' },
  { id: 'snap',              label: 'Snap' },
];

const DEFAULT_BEZIER: [number, number, number, number] = [0.25, 0.1, 0.25, 1.0];

function findStyle(
  catalog: ReadonlyArray<TransitionStyle>,
  id: string,
): TransitionStyle | undefined {
  return catalog.find((s) => s.id === id);
}

export function IgnitionRetractionColumnB({
  activeTab,
}: IgnitionRetractionColumnBProps): JSX.Element {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const isIgnition = activeTab === 'ignition';
  const catalog = isIgnition ? IGNITION_STYLES : RETRACTION_STYLES;
  const activeStyleId = isIgnition ? config.ignition : config.retraction;
  const activeStyle = findStyle(catalog, activeStyleId);

  // Speed slider config: ignition 100-2000 ms, retraction 100-3000 ms.
  // Defaults match the legacy panel (ignitionMs=300 / retractionMs=500).
  const speedKey = isIgnition ? 'ignitionMs' : 'retractionMs';
  const speedMin = 100;
  const speedMax = isIgnition ? 2000 : 3000;
  const speedDefault = isIgnition ? 300 : 500;
  const currentSpeed = (config[speedKey] as number | undefined) ?? speedDefault;

  // Easing dropdown reads the existing EasingConfig (PresetEasing variant
  // only — the cubic-bezier variant is reserved for custom-curve below).
  const easingKey = isIgnition ? 'ignitionEasing' : 'retractionEasing';
  const easingValue =
    (config[easingKey] as { type: 'preset'; name: string } | undefined)?.type === 'preset'
      ? (config[easingKey] as { type: 'preset'; name: string }).name
      : 'linear';

  const handleEasingChange = useCallback(
    (preset: string) => {
      updateConfig({ [easingKey]: { type: 'preset', name: preset } });
    },
    [easingKey, updateConfig],
  );

  // Custom-curve editor — shown only when the active style is 'custom-curve'.
  const isCustomCurve = activeStyleId === 'custom-curve';
  const curveKey = isIgnition ? 'ignitionCurve' : 'retractionCurve';
  const curve = (config[curveKey] as
    | [number, number, number, number]
    | undefined) ?? DEFAULT_BEZIER;

  const handleCurvePointChange = useCallback(
    (index: 0 | 1 | 2 | 3, raw0to100: number) => {
      const next: [number, number, number, number] = [...curve] as [
        number,
        number,
        number,
        number,
      ];
      next[index] = raw0to100 / 100;
      updateConfig({ [curveKey]: next });
    },
    [curve, curveKey, updateConfig],
  );

  return (
    <div className="flex flex-col h-full" data-testid="ignition-retraction-column-b">
      {/* Sticky header — animation name + description. */}
      <header className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <div className="flex items-baseline gap-3">
          <span className="font-mono uppercase text-ui-xs tracking-[0.10em] text-text-muted">
            {isIgnition ? 'Ignition' : 'Retraction'}
          </span>
          <h3 className="font-mono uppercase text-ui-sm tracking-[0.10em] text-text-primary">
            {activeStyle?.label ?? activeStyleId}
          </h3>
          {activeStyle && (
            <span className="text-ui-xs text-text-muted truncate">
              {activeStyle.desc}
            </span>
          )}
        </div>
      </header>

      {/* Scrolling body. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* Speed slider — depends on the active tab. */}
        <div>
          <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
            {isIgnition ? 'Ignition Speed' : 'Retraction Speed'}
            <HelpTooltip
              text={
                isIgnition
                  ? 'How long the blade takes to extend on ignite. Lower = snappier; higher = more cinematic.'
                  : 'How long the blade takes to retract on power-off. Lower = snappier; higher = lingering.'
              }
              proffie={isIgnition ? 'InOutTrL<TrWipe<300>>' : 'InOutTrL<TrWipe<500>>'}
            />
          </h4>
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-24 shrink-0">
                {isIgnition ? 'Speed' : 'Speed'}
              </span>
              <input
                type="range"
                min={speedMin}
                max={speedMax}
                step={50}
                value={currentSpeed}
                onChange={(e) => updateConfig({ [speedKey]: Number(e.target.value) })}
                aria-label={`${isIgnition ? 'Ignition' : 'Retraction'} speed in milliseconds`}
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-14 text-right">
                {currentSpeed}ms
              </span>
            </div>
          </div>
        </div>

        {/* Easing-curve dropdown. */}
        <div>
          <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
            Easing
            <HelpTooltip
              text="Acceleration profile of the animation. Linear = constant speed. Ease In/Out shape the start/end. Bounce + Elastic add spring physics."
              proffie="TrEaseX<TrWipe<300>, 5>"
            />
          </h4>
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
            <div className="flex items-center gap-3">
              <label
                htmlFor={`cb-easing-${activeTab}`}
                className="text-ui-xs text-text-secondary w-24 shrink-0"
              >
                Curve
              </label>
              <select
                id={`cb-easing-${activeTab}`}
                value={easingValue}
                onChange={(e) => handleEasingChange(e.target.value)}
                className="touch-target flex-1 bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-primary"
              >
                {EASING_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Custom-curve cubic-bezier editor — only when active style is 'custom-curve'. */}
        {isCustomCurve && (
          <div>
            <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
              Custom Curve
              <HelpTooltip text="Adjust the cubic Bezier control points to shape the timing curve. X controls timing; Y controls intensity. Values 0-100 map to 0.0-1.0 in the bezier formula." />
            </h4>
            <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
              <div className="grid grid-cols-2 gap-2">
                {(['x1', 'y1', 'x2', 'y2'] as const).map((label, idx) => (
                  <ScrubField
                    key={label}
                    label={label}
                    ariaLabel={`${
                      isIgnition ? 'Ignition' : 'Retraction'
                    } curve control point ${label}`}
                    min={0}
                    max={100}
                    value={curve[idx] * 100}
                    onChange={(v) =>
                      handleCurvePointChange(idx as 0 | 1 | 2 | 3, v)
                    }
                    format={(v) => v.toFixed(0)}
                    className="gap-2"
                    labelClassName="w-6"
                    readoutClassName="w-8"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pointer to where related controls live. Mirrors the
            BladeStyleColumnB pattern — one info card so users don't
            search for missing controls. */}
        <div
          className="rounded-panel border border-border-subtle bg-bg-surface px-3 py-2 text-ui-xs text-text-muted"
          aria-label="Related sections"
        >
          <p className="leading-relaxed">
            Effect-specific options (Preon, Dual-Mode Ignition, spatial
            placement) live in{' '}
            <span className="text-text-secondary">Combat Effects</span>.
            For wider blade-style timing, see{' '}
            <span className="text-text-secondary">Blade Style</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
