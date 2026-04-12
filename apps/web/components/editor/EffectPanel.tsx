'use client';
import { useBladeStore } from '@/stores/bladeStore';

const IGNITION_STYLES = [
  { id: 'standard', label: 'Standard', desc: 'Classic linear ignition' },
  { id: 'scroll', label: 'Scroll', desc: 'Scrolling pixel fill' },
  { id: 'spark', label: 'Spark', desc: 'Crackling spark ignition' },
  { id: 'center', label: 'Center Out', desc: 'Ignites from center' },
  { id: 'wipe', label: 'Wipe', desc: 'Soft wipe reveal' },
  { id: 'stutter', label: 'Stutter', desc: 'Flickering unstable ignition' },
  { id: 'glitch', label: 'Glitch', desc: 'Digital glitch effect' },
];

const RETRACTION_STYLES = [
  { id: 'standard', label: 'Standard', desc: 'Linear retraction' },
  { id: 'scroll', label: 'Scroll', desc: 'Scrolling retract' },
  { id: 'fadeout', label: 'Fade Out', desc: 'Fading retraction' },
  { id: 'center', label: 'Center In', desc: 'Retracts to center' },
  { id: 'run', label: 'Run', desc: 'Running retraction' },
];

export function EffectPanel() {
  const config = useBladeStore((s) => s.config);
  const setIgnition = useBladeStore((s) => s.setIgnition);
  const setRetraction = useBladeStore((s) => s.setRetraction);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const effectLog = useBladeStore((s) => s.effectLog);

  return (
    <div className="space-y-6">
      {/* Ignition */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-3">
          Ignition Style
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {IGNITION_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setIgnition(style.id)}
              className={`text-left px-3 py-2 rounded text-xs transition-colors border ${
                config.ignition === style.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              <div className="font-medium">{style.label}</div>
              <div className="text-[10px] text-text-muted mt-0.5">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Retraction */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-3">
          Retraction Style
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {RETRACTION_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setRetraction(style.id)}
              className={`text-left px-3 py-2 rounded text-xs transition-colors border ${
                config.retraction === style.id
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
              }`}
            >
              <div className="font-medium">{style.label}</div>
              <div className="text-[10px] text-text-muted mt-0.5">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Duration sliders */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-3">
          Timing
        </h3>
        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary w-28 shrink-0">Ignition</label>
            <input
              type="range"
              min={100}
              max={1500}
              step={50}
              value={config.ignitionMs}
              onChange={(e) => updateConfig({ ignitionMs: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-[10px] text-text-muted font-mono w-14 text-right">
              {config.ignitionMs}ms
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary w-28 shrink-0">Retraction</label>
            <input
              type="range"
              min={100}
              max={1500}
              step={50}
              value={config.retractionMs}
              onChange={(e) => updateConfig({ retractionMs: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-[10px] text-text-muted font-mono w-14 text-right">
              {config.retractionMs}ms
            </span>
          </div>
        </div>
      </div>

      {/* Effect log */}
      <div>
        <h3 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-3">
          Effect Log
        </h3>
        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle max-h-[250px] overflow-y-auto">
          {effectLog.length === 0 ? (
            <p className="text-xs text-text-muted italic">
              No effects triggered yet. Use keyboard shortcuts or buttons to trigger effects.
            </p>
          ) : (
            <div className="space-y-1">
              {effectLog.map((entry, i) => (
                <div
                  key={`${entry}-${i}`}
                  className="text-[11px] font-mono text-text-secondary py-0.5 border-b border-border-subtle last:border-0"
                >
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
        <h4 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
          Keyboard Shortcuts
        </h4>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
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
        </div>
      </div>
    </div>
  );
}
