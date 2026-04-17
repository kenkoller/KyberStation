'use client';
import { useBladeStore } from '@/stores/bladeStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

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

const IGNITION_STYLES = [
  { id: 'standard', label: 'Standard', desc: 'Classic linear ignition' },
  { id: 'scroll', label: 'Scroll', desc: 'Scrolling pixel fill' },
  { id: 'spark', label: 'Spark', desc: 'Crackling spark ignition' },
  { id: 'center', label: 'Center Out', desc: 'Ignites from center' },
  { id: 'wipe', label: 'Wipe', desc: 'Soft wipe reveal' },
  { id: 'stutter', label: 'Stutter', desc: 'Flickering unstable ignition' },
  { id: 'glitch', label: 'Glitch', desc: 'Digital glitch effect' },
  { id: 'twist', label: 'Twist', desc: 'Spiral ignition driven by twist' },
  { id: 'swing', label: 'Swing', desc: 'Speed-reactive swing ignition' },
  { id: 'stab', label: 'Stab', desc: 'Rapid center-out burst' },
  { id: 'crackle', label: 'Crackle', desc: 'Random segment flicker fill' },
  { id: 'fracture', label: 'Fracture', desc: 'Radiating crack points' },
  { id: 'flash-fill', label: 'Flash Fill', desc: 'White flash then color wipe' },
  { id: 'pulse-wave', label: 'Pulse Wave', desc: 'Sequential building waves' },
  { id: 'drip-up', label: 'Drip Up', desc: 'Fluid upward flow' },
  { id: 'hyperspace', label: 'Hyperspace', desc: 'Streaking star-line ignition' },
  { id: 'summon', label: 'Summon', desc: 'Force-pull ignition' },
  { id: 'seismic', label: 'Seismic', desc: 'Ground-shake ripple ignition' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];

const RETRACTION_STYLES = [
  { id: 'standard', label: 'Standard', desc: 'Linear retraction' },
  { id: 'scroll', label: 'Scroll', desc: 'Scrolling retract' },
  { id: 'fadeout', label: 'Fade Out', desc: 'Fading retraction' },
  { id: 'center', label: 'Center In', desc: 'Retracts to center' },
  { id: 'shatter', label: 'Shatter', desc: 'Shattering retraction' },
  { id: 'dissolve', label: 'Dissolve', desc: 'Random shuffle turn-off' },
  { id: 'flickerOut', label: 'Flicker Out', desc: 'Tip-to-base flicker band' },
  { id: 'unravel', label: 'Unravel', desc: 'Sinusoidal thread unwind' },
  { id: 'drain', label: 'Drain', desc: 'Gravity drain with meniscus' },
  { id: 'implode', label: 'Implode', desc: 'Collapsing inward retraction' },
  { id: 'evaporate', label: 'Evaporate', desc: 'Fading particle evaporation' },
  { id: 'spaghettify', label: 'Spaghettify', desc: 'Stretching gravitational pull' },
  { id: 'custom-curve', label: 'Custom Curve', desc: 'User-defined Bezier curve' },
];

export function EffectPanel() {
  const config = useBladeStore((s) => s.config);
  const setIgnition = useBladeStore((s) => s.setIgnition);
  const setRetraction = useBladeStore((s) => s.setRetraction);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const effectLog = useBladeStore((s) => s.effectLog);

  return (
    <div className="space-y-2">
      {/* Ignition */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Ignition Style
          <HelpTooltip text="How the blade extends when activated. Controls the visual transition from off to on." proffie="InOutTrL<TrWipe<300>>" />
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {IGNITION_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setIgnition(style.id)}
              title={style.desc}
              className={`touch-target text-left px-2 py-1.5 rounded text-ui-base font-medium transition-colors border ${
                config.ignition === style.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
        {/* Stutter parameters */}
        {config.ignition === 'stutter' && (
          <div className="mt-2 bg-bg-surface rounded p-2 border border-border-subtle space-y-2">
            <label className="flex items-center gap-2 text-ui-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={(config.stutterFullExtend as boolean | undefined) ?? true}
                onChange={(e) => updateConfig({ stutterFullExtend: e.target.checked })}
                className="accent-accent"
              />
              Full extend (blade always reaches full length)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Flicker Count</span>
              <input
                type="range" min={5} max={60} step={1}
                value={(config.stutterCount as number | undefined) ?? 30}
                onChange={(e) => updateConfig({ stutterCount: Number(e.target.value) })}
                aria-label="Stutter flicker count"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.stutterCount as number | undefined) ?? 30}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Amplitude</span>
              <input
                type="range" min={1} max={30} step={1}
                value={(config.stutterAmplitude as number | undefined) ?? 10}
                onChange={(e) => updateConfig({ stutterAmplitude: Number(e.target.value) })}
                aria-label="Stutter amplitude"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.stutterAmplitude as number | undefined) ?? 10}%
              </span>
            </div>
          </div>
        )}
        {/* Glitch parameters */}
        {config.ignition === 'glitch' && (
          <div className="mt-2 bg-bg-surface rounded p-2 border border-border-subtle space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Density</span>
              <input
                type="range" min={1} max={20} step={1}
                value={(config.glitchDensity as number | undefined) ?? 3}
                onChange={(e) => updateConfig({ glitchDensity: Number(e.target.value) })}
                aria-label="Glitch pixel density"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.glitchDensity as number | undefined) ?? 3}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Intensity</span>
              <input
                type="range" min={10} max={100} step={5}
                value={(config.glitchIntensity as number | undefined) ?? 100}
                onChange={(e) => updateConfig({ glitchIntensity: Number(e.target.value) })}
                aria-label="Glitch intensity"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.glitchIntensity as number | undefined) ?? 100}%
              </span>
            </div>
          </div>
        )}
        {/* Spark parameters */}
        {config.ignition === 'spark' && (
          <div className="mt-2 bg-bg-surface rounded p-2 border border-border-subtle space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Spark Size</span>
              <input
                type="range" min={1} max={15} step={1}
                value={(config.sparkSize as number | undefined) ?? 5}
                onChange={(e) => updateConfig({ sparkSize: Number(e.target.value) })}
                aria-label="Spark tip size"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.sparkSize as number | undefined) ?? 5}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Trail</span>
              <input
                type="range" min={1} max={20} step={1}
                value={(config.sparkTrail as number | undefined) ?? 5}
                onChange={(e) => updateConfig({ sparkTrail: Number(e.target.value) })}
                aria-label="Spark trail length"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.sparkTrail as number | undefined) ?? 5}%
              </span>
            </div>
          </div>
        )}
        {/* Wipe parameters */}
        {config.ignition === 'wipe' && (
          <div className="mt-2 bg-bg-surface rounded p-2 border border-border-subtle space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Softness</span>
              <input
                type="range" min={1} max={20} step={1}
                value={(config.wipeSoftness as number | undefined) ?? 3}
                onChange={(e) => updateConfig({ wipeSoftness: Number(e.target.value) })}
                aria-label="Wipe edge softness"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.wipeSoftness as number | undefined) ?? 3}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Retraction */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Retraction Style
          <HelpTooltip text="How the blade retracts when deactivated. Controls the visual transition from on to off." proffie="InOutTrL<..., TrWipeIn<300>>" />
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {RETRACTION_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setRetraction(style.id)}
              title={style.desc}
              className={`touch-target text-left px-2 py-1.5 rounded text-ui-base font-medium transition-colors border ${
                config.retraction === style.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
        {/* Shatter retraction parameters */}
        {config.retraction === 'shatter' && (
          <div className="mt-2 bg-bg-surface rounded p-2 border border-border-subtle space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Fragment Size</span>
              <input
                type="range" min={5} max={50} step={1}
                value={(config.shatterScale as number | undefined) ?? 20}
                onChange={(e) => updateConfig({ shatterScale: Number(e.target.value) })}
                aria-label="Shatter fragment scale"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.shatterScale as number | undefined) ?? 20}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Fade Speed</span>
              <input
                type="range" min={10} max={100} step={5}
                value={(config.shatterDimSpeed as number | undefined) ?? 100}
                onChange={(e) => updateConfig({ shatterDimSpeed: Number(e.target.value) })}
                aria-label="Shatter fade speed"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.shatterDimSpeed as number | undefined) ?? 100}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Duration sliders */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Timing
          <HelpTooltip text="Duration in milliseconds for ignition and retraction animations. Lower = faster, higher = more dramatic. Typical range: 200-800ms." />
        </h3>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
          <div className="flex items-center gap-3">
            <label htmlFor="timing-ignition" className="text-ui-xs text-text-secondary w-28 shrink-0">Ignition</label>
            <input
              id="timing-ignition"
              type="range"
              min={100}
              max={1500}
              step={50}
              value={config.ignitionMs}
              onChange={(e) => updateConfig({ ignitionMs: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-ui-sm text-text-muted font-mono w-14 text-right">
              {config.ignitionMs}ms
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="timing-retraction" className="text-ui-xs text-text-secondary w-28 shrink-0">Retraction</label>
            <input
              id="timing-retraction"
              type="range"
              min={100}
              max={1500}
              step={50}
              value={config.retractionMs}
              onChange={(e) => updateConfig({ retractionMs: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-ui-sm text-text-muted font-mono w-14 text-right">
              {config.retractionMs}ms
            </span>
          </div>
        </div>
      </div>

      {/* Preon (ProffieOS 7+) */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Preon
          <HelpTooltip
            text="Preon plays a short colour flash BEFORE ignition — a charging-up moment that builds anticipation. Requires ProffieOS 7.x."
            proffie="TransitionEffectL<TrConcat<TrInstant, <color>, TrFade<ms>>, EFFECT_PREON>"
          />
        </h3>
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

              <div className="flex items-center gap-3">
                <label htmlFor="preon-ms" className="text-ui-xs text-text-secondary w-28 shrink-0">
                  Duration
                </label>
                <input
                  id="preon-ms"
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={(config.preonMs as number | undefined) ?? 300}
                  onChange={(e) => updateConfig({ preonMs: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-ui-sm text-text-muted font-mono w-14 text-right">
                  {(config.preonMs as number | undefined) ?? 300}ms
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Easing */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Easing Curves
          <HelpTooltip text="Controls the acceleration profile of ignition/retraction animations. Linear = constant speed. Ease In = starts slow. Ease Out = ends slow. Bounce/Elastic add physical spring effects." proffie="TrEaseX<TrWipe<300>, 5>" />
        </h3>
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
      </div>

      {/* Dual-Mode Ignition */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Dual-Mode Ignition
          <HelpTooltip text="When enabled, blade angle selects between two different ignition/retraction animations. Tilt up for one, tilt down for another. See also: Motion Simulation panel to test angle values." proffie="TrSelect<BladeAngle<>, TrWipe<>, TrWipeIn<>>" />
        </h3>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
          <label className="touch-target flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!config.dualModeIgnition}
              onChange={(e) => updateConfig({ dualModeIgnition: e.target.checked })}
              className="w-3 h-3 rounded border-border-subtle accent-[var(--color-accent)]"
            />
            <span className="text-ui-xs text-text-secondary">Enable angle-based ignition switching</span>
          </label>

          {config.dualModeIgnition && (
            <>
              <div className="flex items-center gap-3">
                <label htmlFor="dual-angle-threshold" className="text-ui-xs text-text-secondary w-28 shrink-0">Angle Threshold</label>
                <input
                  id="dual-angle-threshold"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={(config.ignitionAngleThreshold ?? 0.3) * 100}
                  onChange={(e) => updateConfig({ ignitionAngleThreshold: Number(e.target.value) / 100 })}
                  className="flex-1"
                />
                <span className="text-ui-sm text-text-muted font-mono w-10 text-right">
                  {Math.round((config.ignitionAngleThreshold ?? 0.3) * 100)}%
                </span>
              </div>
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
      </div>

      {/* Effect Customization */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Effect Customization
          <HelpTooltip text="Fine-tune the visual behavior of clash, blast, and stab effects. These settings control location, intensity, count, spread, and depth." />
        </h3>
        <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
          {/* Clash controls */}
          <div className="space-y-2">
            <span className="text-ui-xs text-text-muted uppercase tracking-wider font-semibold">Clash</span>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Location</span>
              <input
                type="range" min={0} max={100} step={1}
                value={(config.clashLocation as number | undefined) ?? 50}
                onChange={(e) => updateConfig({ clashLocation: Number(e.target.value) })}
                aria-label="Clash location on blade"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.clashLocation as number | undefined) ?? 50}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Intensity</span>
              <input
                type="range" min={0} max={100} step={1}
                value={(config.clashIntensity as number | undefined) ?? 75}
                onChange={(e) => updateConfig({ clashIntensity: Number(e.target.value) })}
                aria-label="Clash intensity"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.clashIntensity as number | undefined) ?? 75}%
              </span>
            </div>
          </div>

          {/* Blast controls */}
          <div className="space-y-2">
            <span className="text-ui-xs text-text-muted uppercase tracking-wider font-semibold">Blast</span>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Count</span>
              <input
                type="range" min={1} max={5} step={1}
                value={(config.blastCount as number | undefined) ?? 1}
                onChange={(e) => updateConfig({ blastCount: Number(e.target.value) })}
                aria-label="Blast mark count"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.blastCount as number | undefined) ?? 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Spread</span>
              <input
                type="range" min={0} max={100} step={1}
                value={(config.blastSpread as number | undefined) ?? 50}
                onChange={(e) => updateConfig({ blastSpread: Number(e.target.value) })}
                aria-label="Blast mark spread"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.blastSpread as number | undefined) ?? 50}%
              </span>
            </div>
          </div>

          {/* Stab controls */}
          <div className="space-y-2">
            <span className="text-ui-xs text-text-muted uppercase tracking-wider font-semibold">Stab</span>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-text-muted w-20 shrink-0">Depth</span>
              <input
                type="range" min={0} max={100} step={1}
                value={(config.stabDepth as number | undefined) ?? 80}
                onChange={(e) => updateConfig({ stabDepth: Number(e.target.value) })}
                aria-label="Stab effect depth"
                className="flex-1"
              />
              <span className="text-ui-xs text-text-muted font-mono w-7 text-right">
                {(config.stabDepth as number | undefined) ?? 80}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Curve Controls */}
      {(config.ignition === 'custom-curve' || config.retraction === 'custom-curve') && (
        <div>
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
            Curve Controls
            <HelpTooltip text="Adjust the cubic Bezier control points to shape the ignition/retraction profile. X controls timing, Y controls intensity." />
          </h3>
          <div className="bg-bg-surface rounded-panel p-2 border border-border-subtle space-y-2">
            {config.ignition === 'custom-curve' && (
              <div>
                <label className="text-ui-xs text-text-muted uppercase mb-1.5 block">Ignition Curve</label>
                <div className="grid grid-cols-2 gap-2">
                  {['x1', 'y1', 'x2', 'y2'].map((label, i) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-ui-xs text-text-muted w-6">{label}</span>
                      <input
                        type="range"
                        aria-label={`Ignition curve control point ${label}`}
                        min={0}
                        max={100}
                        value={(config.ignitionCurve?.[i] ?? [0.25, 0.1, 0.25, 1.0][i]) * 100}
                        onChange={(e) => {
                          const curve = [...(config.ignitionCurve ?? [0.25, 0.1, 0.25, 1.0])] as [number, number, number, number];
                          curve[i] = Number(e.target.value) / 100;
                          updateConfig({ ignitionCurve: curve });
                        }}
                        className="flex-1"
                      />
                      <span className="text-ui-xs text-text-muted font-mono w-8">
                        {((config.ignitionCurve?.[i] ?? [0.25, 0.1, 0.25, 1.0][i]) * 100).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {config.retraction === 'custom-curve' && (
              <div>
                <label className="text-ui-xs text-text-muted uppercase mb-1.5 block">Retraction Curve</label>
                <div className="grid grid-cols-2 gap-2">
                  {['x1', 'y1', 'x2', 'y2'].map((label, i) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-ui-xs text-text-muted w-6">{label}</span>
                      <input
                        type="range"
                        aria-label={`Retraction curve control point ${label}`}
                        min={0}
                        max={100}
                        value={(config.retractionCurve?.[i] ?? [0.25, 0.1, 0.25, 1.0][i]) * 100}
                        onChange={(e) => {
                          const curve = [...(config.retractionCurve ?? [0.25, 0.1, 0.25, 1.0])] as [number, number, number, number];
                          curve[i] = Number(e.target.value) / 100;
                          updateConfig({ retractionCurve: curve });
                        }}
                        className="flex-1"
                      />
                      <span className="text-ui-xs text-text-muted font-mono w-8">
                        {((config.retractionCurve?.[i] ?? [0.25, 0.1, 0.25, 1.0][i]) * 100).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Effect log */}
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1.5 flex items-center gap-1">
          Effect Log
          <HelpTooltip text="Chronological record of triggered effects during this session. Use keyboard shortcuts or toolbar buttons to trigger effects." />
        </h3>
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
      </div>

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
