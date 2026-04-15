'use client';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { CANVAS_THEMES } from '@/lib/canvasThemes';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

const IGNITION_STYLES = [
  { id: 'standard', label: 'Standard' },
  { id: 'scroll', label: 'Scroll' },
  { id: 'spark', label: 'Spark' },
  { id: 'center', label: 'Center Out' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'stutter', label: 'Stutter' },
  { id: 'glitch', label: 'Glitch' },
];

const RETRACTION_STYLES = [
  { id: 'standard', label: 'Standard' },
  { id: 'scroll', label: 'Scroll' },
  { id: 'fadeout', label: 'Fade Out' },
  { id: 'center', label: 'Center In' },
  { id: 'shatter', label: 'Shatter' },
];

const STYLE_OPTIONS = [
  { id: 'stable', label: 'Stable' },
  { id: 'unstable', label: 'Unstable' },
  { id: 'fire', label: 'Fire' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'rotoscope', label: 'Rotoscope' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'photon', label: 'Photon' },
  { id: 'plasma', label: 'Plasma' },
  { id: 'crystalShatter', label: 'Crystal' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'cinder', label: 'Cinder' },
  { id: 'prism', label: 'Prism' },
];

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

export function CanvasToolbar() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const canvasTheme = useUIStore((s) => s.canvasTheme);
  const setCanvasTheme = useUIStore((s) => s.setCanvasTheme);

  const baseHex = rgbToHex(config.baseColor.r, config.baseColor.g, config.baseColor.b);

  const selectClass = 'bg-bg-deep border border-border-subtle rounded px-1.5 py-0.5 text-text-secondary text-ui-sm focus:outline-none focus:border-accent';

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-bg-secondary/40 border-b border-border-subtle text-ui-sm shrink-0 overflow-x-auto">
      {/* Style */}
      <label className="flex items-center gap-1 shrink-0">
        <span className="text-text-muted">Style</span>
        <HelpTooltip text="Base blade animation style. Each style creates a unique visual character for the blade." proffie="StylePtr<Layers<...>>" position="bottom" />
        <select
          value={config.style}
          onChange={(e) => updateConfig({ style: e.target.value })}
          className={selectClass}
        >
          {STYLE_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      <span className="w-px h-4 bg-border-subtle shrink-0" />

      {/* Ignition */}
      <label className="flex items-center gap-1 shrink-0">
        <span className="text-text-muted">Ign</span>
        <HelpTooltip text="How the blade extends when ignited. Controls the ignition animation." proffie="InOutTrL<TrWipe<...>>" position="bottom" />
        <select
          value={config.ignition}
          onChange={(e) => updateConfig({ ignition: e.target.value })}
          className={selectClass}
        >
          {IGNITION_STYLES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      {/* Retraction */}
      <label className="flex items-center gap-1 shrink-0">
        <span className="text-text-muted">Ret</span>
        <select
          value={config.retraction}
          onChange={(e) => updateConfig({ retraction: e.target.value })}
          className={selectClass}
        >
          {RETRACTION_STYLES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      <span className="w-px h-4 bg-border-subtle shrink-0" />

      {/* Base color swatch */}
      <label className="flex items-center gap-1 shrink-0">
        <span className="text-text-muted">Color</span>
        <input
          type="color"
          value={baseHex}
          onChange={(e) => {
            const hex = e.target.value;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            updateConfig({ baseColor: { r, g, b } });
          }}
          className="w-5 h-5 rounded border border-border-subtle cursor-pointer bg-transparent p-0"
        />
        <span className="text-text-muted font-mono">{baseHex}</span>
      </label>

      <span className="w-px h-4 bg-border-subtle shrink-0" />

      {/* Shimmer */}
      <label className="flex items-center gap-1 shrink-0">
        <span className="text-text-muted">Shimmer</span>
        <HelpTooltip text="Adds subtle brightness variation to the blade for a more organic, living look." proffie="AudioFlicker<>" position="bottom" />
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round((config.shimmer ?? 0) * 100)}
          onChange={(e) => updateConfig({ shimmer: Number(e.target.value) / 100 })}
          className="w-14 h-1 accent-accent"
        />
        <span className="text-text-muted tabular-nums w-6">{Math.round((config.shimmer ?? 0) * 100)}%</span>
      </label>

      <span className="w-px h-4 bg-border-subtle shrink-0" />

      {/* Scene / Location Theme */}
      <label className="flex items-center gap-1 shrink-0">
        <span className="text-text-muted">Scene</span>
        <HelpTooltip text="Changes the entire UI theme to match iconic Star Wars locations. Affects all colors, backgrounds, and borders." position="bottom" />
        <select
          value={canvasTheme}
          onChange={(e) => setCanvasTheme(e.target.value)}
          className={selectClass}
        >
          {CANVAS_THEMES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
