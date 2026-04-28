'use client';
// Note: ignition + retraction MGPs + ms timing sliders are owned by
// IgnitionRetractionPanel (sidebar → Design → Ignition & Retraction).
// Per docs/SIDEBAR_IA_AUDIT_2026-04-27.md §6 dedup, EffectPanel was the
// duplicate mount point and dropped them. The unique-to-this-panel
// concerns (Preon, Easing Curves, Dual-Mode Ignition, Custom Curve
// scrubs) STAY here for now — they'll move to IgnitionRetractionPanel
// in a follow-up PR once the deeper concerns there are reorganized.
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { ScrubField } from '@/components/shared/ScrubField';
// IGNITION_STYLES + RETRACTION_STYLES still needed for the Dual-Mode
// Ignition / Custom Curve dropdowns below — those are unique to this
// panel and not duplicated in IgnitionRetractionPanel.
import {
  IGNITION_STYLES,
  RETRACTION_STYLES,
} from '@/lib/transitionCatalogs';

const EASING_PRESETS = [
  { id: 'linear', label: 'Linear' },
  { id: 'ease-in-quad', label: 'Ease In (Quad)' },
  { id: 'ease-out-quad', label: 'Ease Out (Quad)' },
  { id: 'ease-in-out-quad', label: 'Ease In-Out (Quad)' },
  { id: 'ease-in-cubic', label: 'Ease In (Cubic)' },
  { id: 'ease-out-cubic', label: 'Ease Out (Cubic)' },
  { id: 'ease-in-out-cubic', label: 'Ease In-Out (Cubic)' },
  { id: 'ease-in-quart', label: 'Ease In (Quart)' },
  { id: 'ease-out-quart', label: 'Ease Out (Quart)' },
  { id: 'ease-in-out-quart', label: 'Ease In-Out (Quart)' },
  { id: 'ease-in-expo', label: 'Ease In (Expo)' },
  { id: 'ease-out-expo', label: 'Ease Out (Expo)' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'elastic', label: 'Elastic' },
  { id: 'snap', label: 'Snap' },
];

export function EffectPanel() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const effectLog = useBladeStore((s) => s.effectLog);

  return (
    <div className="space-y-2">
      {/* Spatial effects — fine-tune the positions set via canvas Edit Mode */}
      <CollapsibleSection
        title="Spatial Effects"
        defaultOpen={false}
        persistKey="EffectPanel.spatial"
        headerAccessory={
          <HelpTooltip
            text="Positions for lockup and blast effects along the blade. Easier to set by clicking the blade in Edit Mode; these sliders let you dial in exact values."
          />
        }
      >
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
          {/* Lockup position */}
          <ScrubField
            id="lockup-pos"
            label="Lockup pos"
            min={0} max={100} step={1}
            value={Math.round(((config.lockupPosition as number | undefined) ?? 0.5) * 100)}
            onChange={(v) =>
              updateConfig({
                lockupPosition: v / 100,
                lockupRadius: (config.lockupRadius as number | undefined) ?? 0.12,
              })
            }
            format={() =>
              typeof config.lockupPosition === 'number'
                ? `${Math.round(config.lockupPosition * 100)}%`
                : '—'
            }
            inlineAccessory={
              <button
                onClick={() => updateConfig({ lockupPosition: undefined, lockupRadius: undefined })}
                title="Clear lockup position (falls back to runtime default)"
                aria-label="Clear lockup position"
                className="text-ui-xs text-text-muted hover:text-text-primary px-1"
              >
                ×
              </button>
            }
          />
          {/* Lockup radius */}
          <ScrubField
            id="lockup-rad"
            label="Lockup radius"
            min={2} max={40} step={1}
            value={Math.round(((config.lockupRadius as number | undefined) ?? 0.12) * 100)}
            onChange={(v) => updateConfig({ lockupRadius: v / 100 })}
            unit="%"
            disabled={typeof config.lockupPosition !== 'number'}
          />

          {/* Blast position */}
          <ScrubField
            id="blast-pos"
            label="Blast pos"
            min={0} max={100} step={1}
            value={Math.round(((config.blastPosition as number | undefined) ?? 0.5) * 100)}
            onChange={(v) => updateConfig({ blastPosition: v / 100 })}
            format={() =>
              typeof config.blastPosition === 'number'
                ? `${Math.round(config.blastPosition * 100)}%`
                : '—'
            }
            className="gap-3 pt-1 border-t border-border-subtle/50"
            inlineAccessory={
              <button
                onClick={() => updateConfig({ blastPosition: undefined, blastRadius: undefined })}
                title="Clear blast position (random default)"
                aria-label="Clear blast position"
                className="text-ui-xs text-text-muted hover:text-text-primary px-1"
              >
                ×
              </button>
            }
          />
          {/* Blast radius */}
          <ScrubField
            id="blast-rad"
            label="Blast radius"
            min={10} max={100} step={5}
            value={Math.round(((config.blastRadius as number | undefined) ?? 0.5) * 100)}
            onChange={(v) => updateConfig({ blastRadius: v / 100 })}
            unit="%"
            disabled={typeof config.blastPosition !== 'number'}
          />
        </div>
      </CollapsibleSection>

      {/* Preon (ProffieOS 7+) */}
      <CollapsibleSection
        title="Preon"
        defaultOpen={false}
        persistKey="EffectPanel.preon"
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
              checked={(config.preonEnabled as boolean | undefined) ?? false}
              onChange={(e) => updateConfig({ preonEnabled: e.target.checked })}
              className="accent-accent"
            />
            Enable pre-ignition flash
          </label>

          {(config.preonEnabled as boolean | undefined) && (
            <>
              <div className="flex items-center gap-3">
                <label htmlFor="preon-color" className="text-ui-xs text-text-secondary w-28 shrink-0">
                  Flash colour
                </label>
                <input
                  id="preon-color"
                  type="color"
                  value={(() => {
                    const c = (config.preonColor as { r: number; g: number; b: number } | undefined) ?? config.baseColor;
                    return (
                      '#' +
                      [c.r, c.g, c.b]
                        .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
                        .join('')
                    );
                  })()}
                  onChange={(e) => {
                    const hex = e.target.value;
                    updateConfig({
                      preonColor: {
                        r: parseInt(hex.slice(1, 3), 16),
                        g: parseInt(hex.slice(3, 5), 16),
                        b: parseInt(hex.slice(5, 7), 16),
                      },
                    });
                  }}
                  className="w-8 h-6 rounded border border-border-subtle cursor-pointer bg-transparent p-0"
                />
                <span className="text-ui-xs text-text-muted">
                  Falls back to base colour if unset
                </span>
              </div>

              <ScrubField
                id="preon-ms"
                label="Duration"
                min={50} max={2000} step={50}
                value={(config.preonMs as number | undefined) ?? 300}
                onChange={(v) => updateConfig({ preonMs: v })}
                unit="ms"
                readoutClassName="w-14"
              />
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Easing */}
      <CollapsibleSection
        title="Easing Curves"
        defaultOpen={false}
        persistKey="EffectPanel.easing"
        headerAccessory={
          <HelpTooltip text="Controls the acceleration profile of ignition/retraction animations. Linear = constant speed. Ease In = starts slow. Ease Out = ends slow. Bounce/Elastic add physical spring effects." proffie="TrEaseX<TrWipe<300>, 5>" />
        }
      >
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
          <div className="flex items-center gap-3">
            <label htmlFor="easing-ignition" className="text-ui-xs text-text-secondary w-28 shrink-0">Ignition</label>
            <select
              id="easing-ignition"
              value={config.ignitionEasing?.type === 'preset' ? config.ignitionEasing.name : 'linear'}
              onChange={(e) => updateConfig({ ignitionEasing: { type: 'preset', name: e.target.value } })}
              className="touch-target flex-1 bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-primary"
            >
              {EASING_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="easing-retraction" className="text-ui-xs text-text-secondary w-28 shrink-0">Retraction</label>
            <select
              id="easing-retraction"
              value={config.retractionEasing?.type === 'preset' ? config.retractionEasing.name : 'linear'}
              onChange={(e) => updateConfig({ retractionEasing: { type: 'preset', name: e.target.value } })}
              className="touch-target flex-1 bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-primary"
            >
              {EASING_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </CollapsibleSection>

      {/* Dual-Mode Ignition */}
      <CollapsibleSection
        title="Dual-Mode Ignition"
        defaultOpen={false}
        persistKey="EffectPanel.dual-mode"
        headerAccessory={
          <HelpTooltip text="When enabled, blade angle selects between two different ignition/retraction animations. Tilt up for one, tilt down for another. See also: Motion Simulation panel to test angle values." proffie="TrSelect<BladeAngle<>, TrWipe<>, TrWipeIn<>>" />
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
            <span className="text-ui-xs text-text-secondary">Enable angle-based ignition switching</span>
          </label>

          {config.dualModeIgnition && (
            <>
              <ScrubField
                id="dual-angle-threshold"
                label="Angle Threshold"
                min={0} max={100} step={5}
                value={Math.round((config.ignitionAngleThreshold ?? 0.3) * 100)}
                onChange={(v) => updateConfig({ ignitionAngleThreshold: v / 100 })}
                unit="%"
                readoutClassName="w-10"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dual-ignition-up" className="text-ui-xs text-text-muted uppercase mb-1 block">Ignition Up</label>
                  <select
                    id="dual-ignition-up"
                    value={config.ignitionUp ?? config.ignition}
                    onChange={(e) => updateConfig({ ignitionUp: e.target.value })}
                    className="touch-target w-full bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-xs text-text-primary"
                  >
                    {IGNITION_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dual-ignition-down" className="text-ui-xs text-text-muted uppercase mb-1 block">Ignition Down</label>
                  <select
                    id="dual-ignition-down"
                    value={config.ignitionDown ?? config.ignition}
                    onChange={(e) => updateConfig({ ignitionDown: e.target.value })}
                    className="touch-target w-full bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-xs text-text-primary"
                  >
                    {IGNITION_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dual-retraction-up" className="text-ui-xs text-text-muted uppercase mb-1 block">Retraction Up</label>
                  <select
                    id="dual-retraction-up"
                    value={config.retractionUp ?? config.retraction}
                    onChange={(e) => updateConfig({ retractionUp: e.target.value })}
                    className="touch-target w-full bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-xs text-text-primary"
                  >
                    {RETRACTION_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dual-retraction-down" className="text-ui-xs text-text-muted uppercase mb-1 block">Retraction Down</label>
                  <select
                    id="dual-retraction-down"
                    value={config.retractionDown ?? config.retraction}
                    onChange={(e) => updateConfig({ retractionDown: e.target.value })}
                    className="touch-target w-full bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-xs text-text-primary"
                  >
                    {RETRACTION_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Effect Customization */}
      <CollapsibleSection
        title="Effect Customization"
        defaultOpen={false}
        persistKey="EffectPanel.customization"
        headerAccessory={
          <HelpTooltip text="Fine-tune the visual behavior of clash, blast, and stab effects. These settings control location, intensity, count, spread, and depth." />
        }
      >
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
          {/* Clash controls */}
          <div className="space-y-2">
            <span className="text-ui-xs text-text-muted uppercase tracking-wider font-semibold">Clash</span>
            <ScrubField
              label="Location"
              min={0} max={100} step={1}
              value={(config.clashLocation as number | undefined) ?? 50}
              onChange={(v) => updateConfig({ clashLocation: v })}
              ariaLabel="Clash location on blade"
              unit="%"
              className="gap-2"
              readoutClassName="w-7"
            />
            <ScrubField
              label="Intensity"
              min={0} max={100} step={1}
              value={(config.clashIntensity as number | undefined) ?? 75}
              onChange={(v) => updateConfig({ clashIntensity: v })}
              ariaLabel="Clash intensity"
              unit="%"
              className="gap-2"
              readoutClassName="w-7"
            />
          </div>

          {/* Blast controls */}
          <div className="space-y-2">
            <span className="text-ui-xs text-text-muted uppercase tracking-wider font-semibold">Blast</span>
            <ScrubField
              label="Count"
              min={1} max={5} step={1}
              value={(config.blastCount as number | undefined) ?? 1}
              onChange={(v) => updateConfig({ blastCount: v })}
              ariaLabel="Blast mark count"
              className="gap-2"
              readoutClassName="w-7"
            />
            <ScrubField
              label="Spread"
              min={0} max={100} step={1}
              value={(config.blastSpread as number | undefined) ?? 50}
              onChange={(v) => updateConfig({ blastSpread: v })}
              ariaLabel="Blast mark spread"
              unit="%"
              className="gap-2"
              readoutClassName="w-7"
            />
          </div>

          {/* Stab controls */}
          <div className="space-y-2">
            <span className="text-ui-xs text-text-muted uppercase tracking-wider font-semibold">Stab</span>
            <ScrubField
              label="Depth"
              min={0} max={100} step={1}
              value={(config.stabDepth as number | undefined) ?? 80}
              onChange={(v) => updateConfig({ stabDepth: v })}
              ariaLabel="Stab effect depth"
              unit="%"
              className="gap-2"
              readoutClassName="w-7"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Custom Curve Controls */}
      {(config.ignition === 'custom-curve' || config.retraction === 'custom-curve') && (
        <CollapsibleSection
          title="Curve Controls"
          defaultOpen={true}
          persistKey="EffectPanel.curve-controls"
          headerAccessory={
            <HelpTooltip text="Adjust the cubic Bezier control points to shape the ignition/retraction profile. X controls timing, Y controls intensity." />
          }
        >
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
            {config.ignition === 'custom-curve' && (
              <div>
                <label className="text-ui-xs text-text-muted uppercase mb-1.5 block">Ignition Curve</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['x1', 'y1', 'x2', 'y2'] as const).map((label, i) => (
                    <ScrubField
                      key={label}
                      label={label}
                      ariaLabel={`Ignition curve control point ${label}`}
                      min={0} max={100}
                      value={(config.ignitionCurve?.[i] ?? [0.25, 0.1, 0.25, 1.0][i]) * 100}
                      onChange={(v) => {
                        const curve = [...(config.ignitionCurve ?? [0.25, 0.1, 0.25, 1.0])] as [number, number, number, number];
                        curve[i] = v / 100;
                        updateConfig({ ignitionCurve: curve });
                      }}
                      format={(v) => v.toFixed(0)}
                      className="gap-2"
                      labelClassName="w-6"
                      readoutClassName="w-8"
                    />
                  ))}
                </div>
              </div>
            )}
            {config.retraction === 'custom-curve' && (
              <div>
                <label className="text-ui-xs text-text-muted uppercase mb-1.5 block">Retraction Curve</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['x1', 'y1', 'x2', 'y2'] as const).map((label, i) => (
                    <ScrubField
                      key={label}
                      label={label}
                      ariaLabel={`Retraction curve control point ${label}`}
                      min={0} max={100}
                      value={(config.retractionCurve?.[i] ?? [0.25, 0.1, 0.25, 1.0][i]) * 100}
                      onChange={(v) => {
                        const curve = [...(config.retractionCurve ?? [0.25, 0.1, 0.25, 1.0])] as [number, number, number, number];
                        curve[i] = v / 100;
                        updateConfig({ retractionCurve: curve });
                      }}
                      format={(v) => v.toFixed(0)}
                      className="gap-2"
                      labelClassName="w-6"
                      readoutClassName="w-8"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Effect log */}
      <CollapsibleSection
        title="Effect Log"
        defaultOpen={false}
        persistKey="EffectPanel.effect-log"
        headerAccessory={
          <HelpTooltip text="Chronological record of triggered effects during this session. Use keyboard shortcuts or toolbar buttons to trigger effects." />
        }
      >
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle max-h-[250px] overflow-y-auto">
          {effectLog.length === 0 ? (
            <p className="text-ui-xs text-text-muted italic">
              No effects triggered yet. Use keyboard shortcuts or buttons to trigger effects.
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

      {/* Keyboard shortcuts */}
      <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle">
        <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5">
          Keyboard Shortcuts
        </h4>
        <div className="grid grid-cols-2 gap-1 text-ui-sm">
          <span className="text-text-muted">SPACE</span>
          <span className="text-text-secondary">Ignite/Retract</span>
          <span className="text-text-muted">C</span>
          <span className="text-text-secondary">Clash</span>
          <span className="text-text-muted">L</span>
          <span className="text-text-secondary">Lockup</span>
          <span className="text-text-muted">B</span>
          <span className="text-text-secondary">Blast</span>
          <span className="text-text-muted">D</span>
          <span className="text-text-secondary">Drag</span>
          <span className="text-text-muted">M</span>
          <span className="text-text-secondary">Melt</span>
          <span className="text-text-muted">N</span>
          <span className="text-text-secondary">Lightning</span>
          <span className="text-text-muted">S</span>
          <span className="text-text-secondary">Stab</span>
          <span className="text-text-muted">F</span>
          <span className="text-text-secondary">Force</span>
          <span className="text-text-muted">W</span>
          <span className="text-text-secondary">Shockwave</span>
        </div>
      </div>
    </div>
  );
}
