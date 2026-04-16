'use client';
import { useState, useCallback, useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';

// ─── Parameter Definition Types ───

interface SliderParam {
  key: string;
  label: string;
  type: 'slider';
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  description?: string;
}

interface ColorParam {
  key: string;
  label: string;
  type: 'color';
  description?: string;
}

interface SelectParam {
  key: string;
  label: string;
  type: 'select';
  options: Array<{ value: string; label: string }>;
  default: string;
  description?: string;
}

type Param = SliderParam | ColorParam | SelectParam;

interface ParamGroup {
  id: string;
  label: string;
  icon: string;
  description: string;
  quickAccess?: string[]; // keys of params to show in quick-access bank
  params: Param[];
}

// ─── Quick-Access Parameters (always visible at top) ───

const QUICK_ACCESS: SliderParam[] = [
  { key: 'shimmer', label: 'Shimmer', type: 'slider', min: 0, max: 100, step: 1, default: 10, unit: '%' },
  { key: 'noiseIntensity', label: 'Noise', type: 'slider', min: 0, max: 100, step: 1, default: 50, unit: '%' },
  { key: 'motionSwingSensitivity', label: 'Swing FX', type: 'slider', min: 0, max: 100, step: 1, default: 50, unit: '%' },
  { key: 'colorHueShiftSpeed', label: 'Hue Shift', type: 'slider', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { key: 'spatialWaveSpeed', label: 'Wave', type: 'slider', min: 0, max: 100, step: 1, default: 30, unit: '%' },
  { key: 'emitterFlare', label: 'Emitter', type: 'slider', min: 0, max: 100, step: 1, default: 20, unit: '%' },
];

// ─── Parameter Groups (accordion sections) ───

const PARAM_GROUPS: ParamGroup[] = [
  {
    id: 'noise',
    label: 'Noise & Texture',
    icon: '~',
    description: 'Perlin noise patterns and organic textures',
    params: [
      { key: 'noiseScale', label: 'Scale', type: 'slider', min: 1, max: 100, step: 1, default: 30, description: 'Spatial scale of noise pattern' },
      { key: 'noiseSpeed', label: 'Speed', type: 'slider', min: 0, max: 100, step: 1, default: 20, description: 'Animation speed' },
      { key: 'noiseOctaves', label: 'Octaves', type: 'slider', min: 1, max: 6, step: 1, default: 2, description: 'Fractal detail layers' },
      { key: 'noiseTurbulence', label: 'Turbulence', type: 'slider', min: 0, max: 100, step: 1, default: 0, description: 'Distortion amount' },
      { key: 'noiseIntensity', label: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, default: 50, description: 'How much noise affects the blade' },
    ],
  },
  {
    id: 'motion',
    label: 'Motion Reactivity',
    icon: '>>',
    description: 'How the blade responds to movement',
    params: [
      { key: 'motionSwingSensitivity', label: 'Swing Sensitivity', type: 'slider', min: 0, max: 100, step: 1, default: 50 },
      { key: 'motionAngleInfluence', label: 'Angle Influence', type: 'slider', min: 0, max: 100, step: 1, default: 30 },
      { key: 'motionTwistResponse', label: 'Twist Response', type: 'slider', min: 0, max: 100, step: 1, default: 20 },
      { key: 'motionSmoothing', label: 'Smoothing', type: 'slider', min: 0, max: 100, step: 1, default: 60 },
      { key: 'motionSwingBrighten', label: 'Swing Brighten', type: 'slider', min: 0, max: 100, step: 1, default: 30 },
      { key: 'motionSwingColorShift', label: 'Swing Color', type: 'color' },
    ],
  },
  {
    id: 'color',
    label: 'Color Dynamics',
    icon: '*',
    description: 'Animated color shifts and flicker',
    params: [
      { key: 'colorHueShiftSpeed', label: 'Hue Shift Speed', type: 'slider', min: 0, max: 100, step: 1, default: 0, description: 'Rainbow cycling speed (0 = off)' },
      { key: 'colorSaturationPulse', label: 'Saturation Pulse', type: 'slider', min: 0, max: 100, step: 1, default: 0 },
      { key: 'colorBrightnessWave', label: 'Brightness Wave', type: 'slider', min: 0, max: 100, step: 1, default: 0 },
      { key: 'colorFlickerRate', label: 'Flicker Rate', type: 'slider', min: 0, max: 100, step: 1, default: 0 },
      { key: 'colorFlickerDepth', label: 'Flicker Depth', type: 'slider', min: 0, max: 100, step: 1, default: 30 },
    ],
  },
  {
    id: 'spatial',
    label: 'Spatial Pattern',
    icon: '|||',
    description: 'Wave patterns and directional effects',
    params: [
      { key: 'spatialWaveFrequency', label: 'Wave Frequency', type: 'slider', min: 1, max: 20, step: 1, default: 3 },
      { key: 'spatialWaveSpeed', label: 'Wave Speed', type: 'slider', min: 0, max: 100, step: 1, default: 30 },
      { key: 'spatialDirection', label: 'Direction', type: 'select', default: 'hilt-to-tip', options: [
        { value: 'hilt-to-tip', label: 'Hilt to Tip' },
        { value: 'tip-to-hilt', label: 'Tip to Hilt' },
        { value: 'center-out', label: 'Center Out' },
        { value: 'edges-in', label: 'Edges In' },
      ]},
      { key: 'spatialSpread', label: 'Spread', type: 'slider', min: 0, max: 100, step: 1, default: 50 },
      { key: 'spatialPhase', label: 'Phase', type: 'slider', min: 0, max: 360, step: 5, default: 0, unit: '\u00B0' },
    ],
  },
  {
    id: 'blend',
    label: 'Blend & Layer',
    icon: '///',
    description: 'Layer blending and style mixing',
    params: [
      { key: 'blendMode', label: 'Blend Mode', type: 'select', default: 'normal', options: [
        { value: 'normal', label: 'Normal' },
        { value: 'add', label: 'Additive' },
        { value: 'multiply', label: 'Multiply' },
        { value: 'screen', label: 'Screen' },
        { value: 'overlay', label: 'Overlay' },
      ]},
      { key: 'blendSecondaryStyle', label: 'Secondary Style', type: 'select', default: '', options: [
        { value: '', label: 'None' },
        { value: 'stable', label: 'Stable' },
        { value: 'unstable', label: 'Unstable' },
        { value: 'fire', label: 'Fire' },
        { value: 'pulse', label: 'Pulse' },
        { value: 'rotoscope', label: 'Rotoscope' },
        { value: 'gradient', label: 'Gradient' },
        { value: 'photon', label: 'Photon' },
        { value: 'plasma', label: 'Plasma' },
        { value: 'crystalShatter', label: 'Crystal Shatter' },
        { value: 'aurora', label: 'Aurora' },
        { value: 'cinder', label: 'Cinder' },
        { value: 'prism', label: 'Prism' },
        { value: 'dataStream', label: 'Data Stream' },
        { value: 'gravity', label: 'Gravity' },
        { value: 'ember', label: 'Ember' },
        { value: 'automata', label: 'Automata' },
        { value: 'helix', label: 'Helix' },
        { value: 'candle', label: 'Candle' },
        { value: 'shatter', label: 'Shatter' },
        { value: 'neutron', label: 'Neutron' },
        { value: 'torrent', label: 'Torrent' },
        { value: 'moire', label: 'Moir\u00e9' },
        { value: 'cascade', label: 'Cascade' },
        { value: 'vortex', label: 'Vortex' },
        { value: 'nebula', label: 'Nebula' },
        { value: 'tidal', label: 'Tidal' },
        { value: 'mirage', label: 'Mirage' },
      ]},
      { key: 'blendSecondaryAmount', label: 'Mix Amount', type: 'slider', min: 0, max: 100, step: 1, default: 0, unit: '%' },
      { key: 'blendMaskType', label: 'Mask', type: 'select', default: 'none', options: [
        { value: 'none', label: 'None' },
        { value: 'gradient', label: 'Gradient' },
        { value: 'noise', label: 'Noise' },
        { value: 'wave', label: 'Wave' },
      ]},
    ],
  },
  {
    id: 'tip',
    label: 'Tip & Emitter',
    icon: '^',
    description: 'Blade tip color and emitter glow',
    params: [
      { key: 'tipColor', label: 'Tip Color', type: 'color' },
      { key: 'tipLength', label: 'Tip Length', type: 'slider', min: 0, max: 50, step: 1, default: 10, unit: '%', description: '% of blade' },
      { key: 'tipFade', label: 'Tip Fade', type: 'slider', min: 0, max: 100, step: 1, default: 50, unit: '%' },
      { key: 'emitterFlare', label: 'Emitter Flare', type: 'slider', min: 0, max: 100, step: 1, default: 20, unit: '%' },
      { key: 'emitterFlareWidth', label: 'Flare Width', type: 'slider', min: 0, max: 50, step: 1, default: 5, unit: '%' },
    ],
  },
];

// ─── Helpers ───

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

// ─── Param Controls ───

function SliderControl({ param, value, onChange }: { param: SliderParam; value: number; onChange: (v: number) => void }) {
  // Scale: shimmer is 0-1 in config but 0-100 in UI
  const isShimmer = param.key === 'shimmer';
  const displayValue = isShimmer ? Math.round(value * 100) : value;
  const inputId = `param-slider-${param.key}`;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={inputId} className="text-ui-base text-text-secondary w-24 shrink-0 truncate" title={param.description}>
        {param.label}
      </label>
      <input
        id={inputId}
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={displayValue}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(isShimmer ? v / 100 : v);
        }}
        className="flex-1 min-w-0"
        aria-valuemin={param.min}
        aria-valuemax={param.max}
        aria-valuenow={displayValue}
      />
      <span className="text-ui-sm text-text-muted font-mono w-10 text-right shrink-0">
        {displayValue}{param.unit || ''}
      </span>
    </div>
  );
}

function ColorControl({ param, value, onChange }: { param: ColorParam; value?: { r: number; g: number; b: number }; onChange: (v: { r: number; g: number; b: number }) => void }) {
  const color = value ?? { r: 255, g: 255, b: 255 };
  const inputId = `param-color-${param.key}`;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={inputId} className="text-ui-base text-text-secondary w-24 shrink-0">{param.label}</label>
      <input
        id={inputId}
        type="color"
        value={rgbToHex(color.r, color.g, color.b)}
        onChange={(e) => onChange(hexToRgb(e.target.value))}
        className="w-8 h-6 rounded cursor-pointer border border-border-subtle bg-transparent touch-target"
      />
      <span className="text-ui-sm text-text-muted font-mono">
        {color.r},{color.g},{color.b}
      </span>
    </div>
  );
}

function SelectControl({ param, value, onChange }: { param: SelectParam; value: string; onChange: (v: string) => void }) {
  const inputId = `param-select-${param.key}`;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={inputId} className="text-ui-base text-text-secondary w-24 shrink-0">{param.label}</label>
      <select
        id={inputId}
        value={value ?? param.default}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-base text-text-primary touch-target"
      >
        {param.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Accordion Group ───

function ParamGroupAccordion({ group, isOpen, onToggle }: { group: ParamGroup; isOpen: boolean; onToggle: () => void }) {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  // Count how many params in this group are non-default
  const activeCount = useMemo(() => {
    let count = 0;
    for (const p of group.params) {
      const val = config[p.key as keyof typeof config];
      if (p.type === 'slider' && val !== undefined && val !== (p as SliderParam).default) count++;
      if (p.type === 'select' && val !== undefined && val !== (p as SelectParam).default) count++;
      if (p.type === 'color' && val !== undefined) count++;
    }
    return count;
  }, [config, group.params]);

  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-bg-surface hover:bg-bg-card transition-colors text-left"
        aria-expanded={isOpen}
        aria-controls={`param-group-${group.id}`}
      >
        <span className="text-ui-sm text-text-muted font-mono w-6" aria-hidden="true">{group.icon}</span>
        <span className="text-ui-xs font-medium text-text-primary flex-1">{group.label}</span>
        {activeCount > 0 && (
          <span className="text-ui-xs bg-accent-dim text-accent px-1.5 py-0.5 rounded-full border border-accent-border" aria-label={`${activeCount} active parameter${activeCount !== 1 ? 's' : ''}`}>
            {activeCount}
          </span>
        )}
        <span className={`text-text-muted text-ui-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div id={`param-group-${group.id}`} className="px-3 py-3 space-y-2.5 bg-bg-deep/50 border-t border-border-subtle">
          <p className="text-ui-xs text-text-muted mb-2">{group.description}</p>
          {group.params.map((param) => {
            const val = config[param.key as keyof typeof config];
            if (param.type === 'slider') {
              return (
                <SliderControl
                  key={param.key}
                  param={param}
                  value={(val as number) ?? param.default}
                  onChange={(v) => updateConfig({ [param.key]: v })}
                />
              );
            }
            if (param.type === 'color') {
              return (
                <ColorControl
                  key={param.key}
                  param={param}
                  value={val as { r: number; g: number; b: number } | undefined}
                  onChange={(v) => updateConfig({ [param.key]: v })}
                />
              );
            }
            if (param.type === 'select') {
              return (
                <SelectControl
                  key={param.key}
                  param={param}
                  value={(val as string) ?? param.default}
                  onChange={(v) => updateConfig({ [param.key]: v })}
                />
              );
            }
            return null;
          })}

          {/* Reset group button */}
          <button
            onClick={() => {
              const reset: Record<string, unknown> = {};
              for (const p of group.params) {
                if (p.type === 'slider') reset[p.key] = (p as SliderParam).default;
                else if (p.type === 'select') reset[p.key] = (p as SelectParam).default;
                else if (p.type === 'color') reset[p.key] = undefined;
              }
              updateConfig(reset);
            }}
            className="text-ui-sm text-text-muted hover:text-red-400 transition-colors mt-1 touch-target"
          >
            Reset group
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export function ParameterBank() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Expand all / collapse all
  const expandAll = useCallback(() => {
    setOpenGroups(new Set(PARAM_GROUPS.map((g) => g.id)));
  }, []);

  const collapseAll = useCallback(() => {
    setOpenGroups(new Set());
  }, []);

  return (
    <div className="space-y-4">
      {/* Quick-Access Slider Bank */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold">
            Quick Parameters
          </h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`text-ui-sm font-medium transition-colors touch-target ${
              showAdvanced ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
            }`}
            aria-expanded={showAdvanced}
            aria-controls="advanced-params-section"
          >
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        </div>

        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle space-y-2">
          {QUICK_ACCESS.map((param) => {
            const val = config[param.key as keyof typeof config];
            return (
              <SliderControl
                key={param.key}
                param={param}
                value={(val as number) ?? param.default}
                onChange={(v) => updateConfig({ [param.key]: v })}
              />
            );
          })}
          {/* Pattern Direction — quick-access select */}
          <div className="flex items-center gap-2">
            <label htmlFor="quick-direction" className="text-ui-base text-text-secondary w-24 shrink-0 truncate">Direction</label>
            <select
              id="quick-direction"
              value={(config.spatialDirection as string) ?? 'hilt-to-tip'}
              onChange={(e) => updateConfig({ spatialDirection: e.target.value as 'hilt-to-tip' | 'tip-to-hilt' | 'center-out' | 'edges-in' })}
              className="flex-1 bg-bg-deep border border-border-subtle rounded px-2 py-1 text-ui-base text-text-primary touch-target"
            >
              <option value="hilt-to-tip">Hilt → Tip</option>
              <option value="tip-to-hilt">Tip → Hilt</option>
              <option value="center-out">Center Out</option>
              <option value="edges-in">Edges In</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Parameter Groups (accordion) */}
      {showAdvanced && (
        <div id="advanced-params-section">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold">
              Advanced Parameters
            </h3>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-ui-xs text-text-muted hover:text-text-secondary transition-colors touch-target"
              >
                Expand all
              </button>
              <button
                onClick={collapseAll}
                className="text-ui-xs text-text-muted hover:text-text-secondary transition-colors touch-target"
              >
                Collapse all
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {PARAM_GROUPS.map((group) => (
              <ParamGroupAccordion
                key={group.id}
                group={group}
                isOpen={openGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}
          </div>

          {/* Reset ALL advanced params */}
          <button
            onClick={() => {
              const reset: Record<string, unknown> = {};
              for (const group of PARAM_GROUPS) {
                for (const p of group.params) {
                  if (p.type === 'slider') reset[p.key] = (p as SliderParam).default;
                  else if (p.type === 'select') reset[p.key] = (p as SelectParam).default;
                  else if (p.type === 'color') reset[p.key] = undefined;
                }
              }
              updateConfig(reset);
            }}
            className="mt-3 text-ui-sm text-text-muted hover:text-red-400 transition-colors touch-target"
          >
            Reset all advanced parameters
          </button>
        </div>
      )}
    </div>
  );
}
