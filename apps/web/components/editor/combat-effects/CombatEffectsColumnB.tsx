'use client';

// ─── CombatEffectsColumnB — Sidebar A/B v2 Phase 4 ─────────────────────
//
// Deep editor for whichever row is active in Column A. Two render
// branches:
//
//   1. GENERAL row (`COMBAT_EFFECT_GENERAL_ID`) — global effect-related
//      settings: Preon (pre-ignition flash), Dual-Mode Ignition (angle-
//      based ignition switching), and the full effect log. These are
//      inherited from the legacy EffectPanel's global concerns —
//      previously homeless under the A/B layout.
//
//   2. Effect row (one of 21) — per-effect deep config:
//      - Header (label, description, sustained/one-shot pill, hotkey)
//      - Trigger button (fires or toggles via props-injected handlers)
//      - Per-effect parameter sliders (clash / blast / lockup / stab
//        have customizations; others render a quiet "no parameters" hint)
//      - Filtered effect log (last few entries of the selected effect)

import { useMemo, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useActiveEffectsStore } from '@/stores/activeEffectsStore';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { ScrubField } from '@/components/shared/ScrubField';
import { toggleOrTriggerEffect } from '@/lib/effectToggle';
import { IGNITION_STYLES, RETRACTION_STYLES } from '@/lib/transitionCatalogs';
import {
  COMBAT_EFFECTS,
  COMBAT_EFFECT_GENERAL_ID,
  getCombatEffect,
  isEffectRowId,
  type CombatEffectRowId,
} from './effectCatalog';

// ─── Per-effect parameter table ────────────────────────────────────────
//
// Mirrors the relevant blocks of legacy EffectPanel's "Effect Customization"
// + "Spatial Effects" sections. Effects not listed here render the
// "no additional parameters" hint — that's not a regression, the legacy
// panel never showed customization for them either.

type ParamShape =
  | { kind: 'percent'; key: string; label: string; defaultValue: number }
  | { kind: 'count'; key: string; label: string; min: number; max: number; defaultValue: number };

interface EffectConfigBlock {
  /** Spatial position + radius pair (applies to lockup + blast). */
  spatial?: { positionKey: string; radiusKey: string; defaultRadius: number };
  /** Optional channel color override (clashColor / blastColor / lockupColor). */
  colorKey?: 'clashColor' | 'blastColor' | 'lockupColor';
  /** Effect-specific scrub fields. */
  params?: ParamShape[];
}

const EFFECT_CONFIG: Record<string, EffectConfigBlock> = {
  clash: {
    colorKey: 'clashColor',
    params: [
      { kind: 'percent', key: 'clashLocation',  label: 'Location',  defaultValue: 50 },
      { kind: 'percent', key: 'clashIntensity', label: 'Intensity', defaultValue: 75 },
    ],
  },
  blast: {
    colorKey: 'blastColor',
    spatial: { positionKey: 'blastPosition', radiusKey: 'blastRadius', defaultRadius: 0.5 },
    params: [
      { kind: 'count',   key: 'blastCount',  label: 'Count',  min: 1, max: 5, defaultValue: 1 },
      { kind: 'percent', key: 'blastSpread', label: 'Spread', defaultValue: 50 },
    ],
  },
  lockup: {
    colorKey: 'lockupColor',
    spatial: { positionKey: 'lockupPosition', radiusKey: 'lockupRadius', defaultRadius: 0.12 },
  },
  stab: {
    params: [
      { kind: 'percent', key: 'stabDepth', label: 'Depth', defaultValue: 80 },
    ],
  },
};

// Default base for the dual-mode bezier curve (matches legacy panel).
const DEFAULT_DUAL_THRESHOLD = 0.3;

// ─── Helpers ───────────────────────────────────────────────────────────

function rgbToHex(c: { r: number; g: number; b: number }): string {
  return (
    '#' +
    [c.r, c.g, c.b]
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// ─── Public API ────────────────────────────────────────────────────────

export interface CombatEffectsColumnBProps {
  selectedId: CombatEffectRowId;
  /**
   * Engine handlers, threaded down from WorkbenchLayout via MainContent.
   * Optional — when absent (e.g. tests, off-flag fallback), the trigger
   * button renders disabled with a hint that the engine isn't connected.
   */
  triggerEffect?: (type: string) => void;
  releaseEffect?: (type: string) => void;
}

export function CombatEffectsColumnB({
  selectedId,
  triggerEffect,
  releaseEffect,
}: CombatEffectsColumnBProps): JSX.Element {
  if (selectedId === COMBAT_EFFECT_GENERAL_ID) {
    return <GeneralView />;
  }
  if (!isEffectRowId(selectedId)) {
    // Defensive — shouldn't be reachable while ColumnA + AB wrapper
    // restrict selection to known ids, but keep the panel empty rather
    // than crashing if a future caller passes an unknown id.
    return (
      <div className="p-4 text-ui-xs text-text-muted italic" data-testid="combat-effects-column-b">
        Unknown effect.
      </div>
    );
  }
  return (
    <EffectView
      effectId={selectedId}
      triggerEffect={triggerEffect}
      releaseEffect={releaseEffect}
    />
  );
}

// ─── GENERAL view — Preon + Dual-Mode + global log ─────────────────────

function GeneralView(): JSX.Element {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const effectLog = useBladeStore((s) => s.effectLog);

  const preonEnabled = (config.preonEnabled as boolean | undefined) ?? false;
  const preonColor =
    (config.preonColor as { r: number; g: number; b: number } | undefined) ??
    config.baseColor;

  return (
    <div className="flex flex-col h-full" data-testid="combat-effects-column-b">
      <header className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <div className="flex items-baseline gap-3">
          <h3 className="font-mono uppercase text-ui-sm tracking-[0.10em] text-text-primary">
            General
          </h3>
          <span className="text-ui-xs text-text-muted truncate">
            Effect-wide settings — Preon flash, Dual-Mode Ignition, log
          </span>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {/* Preon */}
        <CollapsibleSection
          title="Preon"
          defaultOpen={true}
          persistKey="CombatEffectsColumnB.preon"
          headerAccessory={
            <HelpTooltip
              text="Preon plays a short colour flash BEFORE ignition — a charging-up moment that builds anticipation. Requires ProffieOS 7.x."
              proffie="TransitionEffectL<TrConcat<TrInstant, <color>, TrFade<ms>>, EFFECT_PREON>"
            />
          }
        >
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
            <label className="flex items-center gap-2 text-ui-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={preonEnabled}
                onChange={(e) => updateConfig({ preonEnabled: e.target.checked })}
                className="accent-accent"
              />
              Enable pre-ignition flash
            </label>

            {preonEnabled && (
              <>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="general-preon-color"
                    className="text-ui-xs text-text-secondary w-28 shrink-0"
                  >
                    Flash colour
                  </label>
                  <input
                    id="general-preon-color"
                    type="color"
                    value={rgbToHex(preonColor)}
                    onChange={(e) => updateConfig({ preonColor: hexToRgb(e.target.value) })}
                    className="w-8 h-6 rounded border border-border-subtle cursor-pointer bg-transparent p-0"
                  />
                  <span className="text-ui-xs text-text-muted">
                    Falls back to base colour if unset
                  </span>
                </div>

                <ScrubField
                  id="general-preon-ms"
                  label="Duration"
                  min={50}
                  max={2000}
                  step={50}
                  value={(config.preonMs as number | undefined) ?? 300}
                  onChange={(v) => updateConfig({ preonMs: v })}
                  unit="ms"
                  readoutClassName="w-14"
                />
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Dual-Mode Ignition */}
        <CollapsibleSection
          title="Dual-Mode Ignition"
          defaultOpen={false}
          persistKey="CombatEffectsColumnB.dual-mode"
          headerAccessory={
            <HelpTooltip
              text="When enabled, blade angle selects between two different ignition/retraction animations. Tilt up for one, tilt down for another."
              proffie="TrSelect<BladeAngle<>, TrWipe<>, TrWipeIn<>>"
            />
          }
        >
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
            <label className="touch-target flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!config.dualModeIgnition}
                onChange={(e) => updateConfig({ dualModeIgnition: e.target.checked })}
                className="w-3 h-3 rounded border-border-subtle accent-accent"
              />
              <span className="text-ui-xs text-text-secondary">
                Enable angle-based ignition switching
              </span>
            </label>

            {config.dualModeIgnition && (
              <>
                <ScrubField
                  id="general-dual-angle-threshold"
                  label="Angle Threshold"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(
                    (config.ignitionAngleThreshold ?? DEFAULT_DUAL_THRESHOLD) * 100,
                  )}
                  onChange={(v) => updateConfig({ ignitionAngleThreshold: v / 100 })}
                  unit="%"
                  readoutClassName="w-10"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="general-dual-ignition-up"
                      className="text-ui-xs text-text-muted uppercase mb-1 block"
                    >
                      Ignition Up
                    </label>
                    <select
                      id="general-dual-ignition-up"
                      value={config.ignitionUp ?? config.ignition}
                      onChange={(e) => updateConfig({ ignitionUp: e.target.value })}
                      className="touch-target w-full bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-xs text-text-primary"
                    >
                      {IGNITION_STYLES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="general-dual-ignition-down"
                      className="text-ui-xs text-text-muted uppercase mb-1 block"
                    >
                      Ignition Down
                    </label>
                    <select
                      id="general-dual-ignition-down"
                      value={config.ignitionDown ?? config.ignition}
                      onChange={(e) => updateConfig({ ignitionDown: e.target.value })}
                      className="touch-target w-full bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-xs text-text-primary"
                    >
                      {IGNITION_STYLES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="general-dual-retraction-up"
                      className="text-ui-xs text-text-muted uppercase mb-1 block"
                    >
                      Retraction Up
                    </label>
                    <select
                      id="general-dual-retraction-up"
                      value={config.retractionUp ?? config.retraction}
                      onChange={(e) => updateConfig({ retractionUp: e.target.value })}
                      className="touch-target w-full bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-xs text-text-primary"
                    >
                      {RETRACTION_STYLES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="general-dual-retraction-down"
                      className="text-ui-xs text-text-muted uppercase mb-1 block"
                    >
                      Retraction Down
                    </label>
                    <select
                      id="general-dual-retraction-down"
                      value={config.retractionDown ?? config.retraction}
                      onChange={(e) => updateConfig({ retractionDown: e.target.value })}
                      className="touch-target w-full bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-xs text-text-primary"
                    >
                      {RETRACTION_STYLES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Effect log — full, unfiltered */}
        <CollapsibleSection
          title="Effect Log"
          defaultOpen={false}
          persistKey="CombatEffectsColumnB.log"
          headerAccessory={
            <HelpTooltip text="Chronological record of triggered effects during this session. Most recent first." />
          }
        >
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle max-h-[250px] overflow-y-auto">
            {effectLog.length === 0 ? (
              <p className="text-ui-xs text-text-muted italic">
                No effects triggered yet. Use keyboard shortcuts or the action bar.
              </p>
            ) : (
              <div className="space-y-1">
                {effectLog.map((entry, i) => (
                  <div
                    key={`${entry}-${i}`}
                    className="text-ui-base font-mono text-text-secondary py-0.5 border-b border-border-subtle last:border-0"
                  >
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Pointer to ignition-retraction for related concerns. */}
        <div
          className="rounded-panel border border-border-subtle bg-bg-surface px-3 py-2 text-ui-xs text-text-muted"
          aria-label="Related sections"
        >
          <p className="leading-relaxed">
            Speed, easing curves, and custom-curve editing live in{' '}
            <span className="text-text-secondary">Ignition &amp; Retraction</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Per-effect view — header + trigger + params + filtered log ───────

interface EffectViewProps {
  effectId: string;
  triggerEffect?: (type: string) => void;
  releaseEffect?: (type: string) => void;
}

function EffectView({
  effectId,
  triggerEffect,
  releaseEffect,
}: EffectViewProps): JSX.Element {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const effectLog = useBladeStore((s) => s.effectLog);
  const isHeld = useActiveEffectsStore((s) => s.active.has(effectId));

  const effect = useMemo(() => getCombatEffect(effectId), [effectId]);
  const block = EFFECT_CONFIG[effectId];

  const filteredLog = useMemo(() => {
    if (!effect) return [];
    // effectLog entries look like `[12:34:56.7] Clash` — match by suffix.
    const needle = effect.label.toLowerCase();
    return effectLog
      .filter((entry) => entry.toLowerCase().includes(needle))
      .slice(0, 5);
  }, [effectLog, effect]);

  const handleTrigger = useCallback(() => {
    if (!triggerEffect || !releaseEffect) return;
    toggleOrTriggerEffect(effectId, { triggerEffect, releaseEffect });
  }, [effectId, triggerEffect, releaseEffect]);

  if (!effect) {
    return (
      <div className="p-4 text-ui-xs text-text-muted italic" data-testid="combat-effects-column-b">
        Unknown effect.
      </div>
    );
  }

  const handlersConnected = !!(triggerEffect && releaseEffect);
  const triggerLabel = effect.sustained ? (isHeld ? 'Release' : 'Hold') : 'Trigger';

  return (
    <div className="flex flex-col h-full" data-testid="combat-effects-column-b">
      <header className="px-4 py-2 border-b border-border-subtle bg-bg-deep/50 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="font-mono text-ui-sm leading-none"
            aria-hidden="true"
            style={{
              color:
                effect.category === 'impact'
                  ? 'rgb(var(--status-warn))'
                  : effect.category === 'sustained'
                  ? 'rgb(var(--faction-sith))'
                  : 'rgb(var(--status-magenta))',
            }}
          >
            {effect.glyph}
          </span>
          <h3 className="font-mono uppercase text-ui-sm tracking-[0.10em] text-text-primary">
            {effect.label}
          </h3>
          <span className="text-ui-xs text-text-muted truncate">{effect.desc}</span>
          <span className="text-ui-xs uppercase tracking-wider px-1.5 rounded text-text-muted border border-border-subtle">
            {effect.sustained ? 'sustained' : 'one-shot'}
          </span>
          {effect.shortcut && (
            <kbd
              className="text-ui-xs font-mono text-text-muted bg-bg-deep border border-border-subtle rounded-chrome px-1.5 py-0.5"
              aria-label={`Keyboard shortcut: ${effect.shortcut}`}
            >
              {effect.shortcut}
            </kbd>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {/* Trigger button — large primary affordance. Disabled when
            handlers aren't connected (e.g. tests). */}
        <div>
          <button
            type="button"
            onClick={handleTrigger}
            disabled={!handlersConnected}
            aria-pressed={effect.sustained ? isHeld : undefined}
            className={[
              'w-full px-3 py-2 rounded-panel border text-ui-sm font-medium transition-colors',
              !handlersConnected
                ? 'bg-bg-surface border-border-subtle text-text-muted cursor-not-allowed'
                : isHeld && effect.sustained
                ? 'bg-bg-surface border-border-light text-text-primary hover:bg-bg-deep'
                : 'bg-accent-dim border-accent-border text-accent hover:bg-accent-dim',
            ].join(' ')}
          >
            {triggerLabel} {effect.label}
            {effect.shortcut && (
              <span className="ml-2 text-text-muted font-mono text-ui-xs">
                ({effect.shortcut})
              </span>
            )}
          </button>
          {!handlersConnected && (
            <p className="mt-1 text-ui-xs text-text-muted italic">
              Engine handlers not connected — trigger via keyboard or action bar above.
            </p>
          )}
        </div>

        {/* Per-effect color override */}
        {block?.colorKey && (
          <CollapsibleSection
            title="Color"
            defaultOpen={true}
            persistKey={`CombatEffectsColumnB.${effectId}.color`}
            headerAccessory={<HelpTooltip text="Channel-specific color used by this effect." />}
          >
            <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
              <div className="flex items-center gap-3">
                <label
                  htmlFor={`effect-color-${effectId}`}
                  className="text-ui-xs text-text-secondary w-24 shrink-0"
                >
                  {effect.label} colour
                </label>
                <input
                  id={`effect-color-${effectId}`}
                  type="color"
                  value={rgbToHex(
                    (config[block.colorKey] as { r: number; g: number; b: number } | undefined) ?? {
                      r: 255,
                      g: 255,
                      b: 255,
                    },
                  )}
                  onChange={(e) =>
                    updateConfig({ [block.colorKey as string]: hexToRgb(e.target.value) })
                  }
                  className="w-8 h-6 rounded border border-border-subtle cursor-pointer bg-transparent p-0"
                />
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Spatial position — only for effects that store position on config. */}
        {block?.spatial && (
          <CollapsibleSection
            title="Position"
            defaultOpen={true}
            persistKey={`CombatEffectsColumnB.${effectId}.spatial`}
            headerAccessory={
              <HelpTooltip text="Where on the blade this effect happens. Easier to set by clicking the blade in Edit Mode; these sliders dial in exact values." />
            }
          >
            <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
              <ScrubField
                id={`effect-${effectId}-pos`}
                label="Position"
                min={0}
                max={100}
                step={1}
                value={Math.round(
                  ((config[block.spatial.positionKey] as number | undefined) ?? 0.5) * 100,
                )}
                onChange={(v) =>
                  updateConfig({
                    [block.spatial!.positionKey]: v / 100,
                    [block.spatial!.radiusKey]:
                      (config[block.spatial!.radiusKey] as number | undefined) ??
                      block.spatial!.defaultRadius,
                  })
                }
                format={() =>
                  typeof config[block.spatial!.positionKey] === 'number'
                    ? `${Math.round(
                        (config[block.spatial!.positionKey] as number) * 100,
                      )}%`
                    : '—'
                }
                inlineAccessory={
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig({
                        [block.spatial!.positionKey]: undefined,
                        [block.spatial!.radiusKey]: undefined,
                      })
                    }
                    title="Clear (use runtime default)"
                    aria-label={`Clear ${effect.label} position`}
                    className="text-ui-xs text-text-muted hover:text-text-primary px-1"
                  >
                    ×
                  </button>
                }
              />
              <ScrubField
                id={`effect-${effectId}-rad`}
                label="Radius"
                min={2}
                max={100}
                step={1}
                value={Math.round(
                  ((config[block.spatial.radiusKey] as number | undefined) ??
                    block.spatial.defaultRadius) * 100,
                )}
                onChange={(v) => updateConfig({ [block.spatial!.radiusKey]: v / 100 })}
                unit="%"
                disabled={typeof config[block.spatial.positionKey] !== 'number'}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* Per-effect parameter sliders (if any). */}
        {block?.params && block.params.length > 0 && (
          <CollapsibleSection
            title="Parameters"
            defaultOpen={true}
            persistKey={`CombatEffectsColumnB.${effectId}.params`}
            headerAccessory={
              <HelpTooltip text={`Fine-tune the ${effect.label.toLowerCase()} effect.`} />
            }
          >
            <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
              {block.params.map((param) => {
                const stored = config[param.key] as number | undefined;
                const value = stored ?? param.defaultValue;
                if (param.kind === 'count') {
                  return (
                    <ScrubField
                      key={param.key}
                      id={`effect-${effectId}-${param.key}`}
                      label={param.label}
                      min={param.min}
                      max={param.max}
                      step={1}
                      value={value}
                      onChange={(v) => updateConfig({ [param.key]: v })}
                      readoutClassName="w-7"
                    />
                  );
                }
                return (
                  <ScrubField
                    key={param.key}
                    id={`effect-${effectId}-${param.key}`}
                    label={param.label}
                    min={0}
                    max={100}
                    step={1}
                    value={value}
                    onChange={(v) => updateConfig({ [param.key]: v })}
                    unit="%"
                    readoutClassName="w-7"
                  />
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* Quiet "no params" hint when nothing is tunable. Most exotic
            effects fall here today — that's not a regression. */}
        {!block && (
          <div
            className="rounded-panel border border-border-subtle bg-bg-surface px-3 py-2 text-ui-xs text-text-muted"
            aria-label="No parameters"
          >
            <p className="leading-relaxed">
              No tunable parameters for this effect. Trigger it from above
              {effect.shortcut ? <> or with the <kbd className="text-text-secondary">{effect.shortcut}</kbd> shortcut</> : null}.
            </p>
          </div>
        )}

        {/* Filtered effect log — last 5 occurrences of this effect. */}
        <CollapsibleSection
          title="Recent triggers"
          defaultOpen={false}
          persistKey={`CombatEffectsColumnB.${effectId}.recent`}
          headerAccessory={
            <HelpTooltip text="Last 5 times this specific effect fired in the current session." />
          }
        >
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle max-h-[180px] overflow-y-auto">
            {filteredLog.length === 0 ? (
              <p className="text-ui-xs text-text-muted italic">
                Not triggered yet this session.
              </p>
            ) : (
              <div className="space-y-1">
                {filteredLog.map((entry, i) => (
                  <div
                    key={`${entry}-${i}`}
                    className="text-ui-base font-mono text-text-secondary py-0.5 border-b border-border-subtle last:border-0"
                  >
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

// Public re-export for the test surface.
export { COMBAT_EFFECTS };
