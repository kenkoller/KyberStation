'use client';
import { useState, useCallback } from 'react';
import { useLayerStore } from '@/stores/layerStore';
import type { LayerType, BlendMode, LayerRenderState } from '@/stores/layerStore';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import {
  LayerThumbnail,
  HIGH_DENSITY_THRESHOLD,
} from './LayerThumbnail';

// ─── Constants ───

const BLADE_STYLES = [
  { id: 'stable', label: 'Stable' },
  { id: 'unstable', label: 'Unstable' },
  { id: 'fire', label: 'Fire' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'rotoscope', label: 'Rotoscope' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'photon', label: 'Photon' },
  { id: 'plasma', label: 'Plasma' },
  { id: 'crystalShatter', label: 'Crystal Shatter' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'cinder', label: 'Cinder' },
  { id: 'prism', label: 'Prism' },
  { id: 'dataStream', label: 'Data Stream' },
  { id: 'gravity', label: 'Gravity' },
  { id: 'ember', label: 'Ember' },
  { id: 'automata', label: 'Automata' },
  { id: 'helix', label: 'Helix' },
  { id: 'candle', label: 'Candle' },
  { id: 'shatter', label: 'Shatter' },
  { id: 'neutron', label: 'Neutron' },
  { id: 'torrent', label: 'Torrent' },
  { id: 'moire', label: 'Moir\u00e9' },
  { id: 'cascade', label: 'Cascade' },
  { id: 'vortex', label: 'Vortex' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'tidal', label: 'Tidal' },
  { id: 'mirage', label: 'Mirage' },
];

const EFFECT_TYPES = [
  { id: 'clash', label: 'Clash Flash' },
  { id: 'blast', label: 'Blast Spots' },
  { id: 'lockup', label: 'Lockup Glow' },
  { id: 'drag', label: 'Drag Sparks' },
  { id: 'melt', label: 'Melt Tip' },
  { id: 'lightning', label: 'Lightning Block' },
  { id: 'stab', label: 'Stab Flash' },
  { id: 'force', label: 'Force Effect' },
  { id: 'shockwave', label: 'Shockwave' },
  { id: 'scatter', label: 'Scatter Burst' },
  { id: 'fragment', label: 'Fragment' },
  { id: 'ripple', label: 'Ripple Waves' },
  { id: 'freeze', label: 'Freeze Crystal' },
  { id: 'overcharge', label: 'Overcharge' },
  { id: 'bifurcate', label: 'Bifurcate' },
  { id: 'invert', label: 'Invert' },
  { id: 'preon', label: 'Preon' },
  { id: 'postoff', label: 'Post-Off' },
  { id: 'emitter', label: 'Emitter' },
  { id: 'rain', label: 'Rain' },
  { id: 'fire', label: 'Fire Distortion' },
];

const BLEND_MODES: Array<{ id: BlendMode; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'add', label: 'Add' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'screen', label: 'Screen' },
];

const TYPE_BADGES: Record<LayerType, { color: string; label: string }> = {
  base: { color: 'bg-blue-500', label: 'B' },
  effect: { color: 'bg-yellow-500', label: 'E' },
  accent: { color: 'bg-green-500', label: 'A' },
  mix: { color: 'bg-purple-500', label: 'M' },
};

// ─── Helpers ───

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.min(255, c))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 128, g: 128, b: 128 };
}

// ─── Add Layer Dropdown ───

function AddLayerDropdown({ onClose }: { onClose: () => void }) {
  const addLayer = useLayerStore((s) => s.addLayer);

  const handleAdd = useCallback(
    (type: LayerType) => {
      const defaults: Record<LayerType, { name: string; config: Record<string, unknown> }> = {
        base: {
          name: 'Base Layer',
          config: { style: 'stable', color: { r: 0, g: 140, b: 255 } },
        },
        effect: {
          name: 'Effect Layer',
          config: { effectType: 'clash', color: { r: 255, g: 255, b: 255 }, size: 50 },
        },
        accent: {
          name: 'Accent Layer',
          config: { style: 'stable', color: { r: 255, g: 200, b: 0 }, position: 90, width: 10 },
        },
        mix: {
          name: 'Mix Layer',
          config: { mixRatio: 50, styleA: 'stable', styleB: 'fire' },
        },
      };

      const preset = defaults[type];
      addLayer({
        type,
        name: preset.name,
        visible: true,
        opacity: 1,
        blendMode: type === 'effect' ? 'add' : 'normal',
        config: preset.config,
      });
      onClose();
    },
    [addLayer, onClose]
  );

  const options: Array<{ type: LayerType; label: string; desc: string }> = [
    { type: 'base', label: 'Add Base Layer', desc: 'Primary blade style' },
    { type: 'effect', label: 'Add Effect Layer', desc: 'Clash, blast, lockup...' },
    { type: 'accent', label: 'Add Accent Layer', desc: 'Tip/hilt accent stripe' },
    { type: 'mix', label: 'Add Mix Layer', desc: 'Blend two styles' },
  ];

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-deep border border-border-subtle rounded-lg shadow-lg overflow-hidden z-10">
      {options.map((opt) => {
        const badge = TYPE_BADGES[opt.type];
        return (
          <button
            key={opt.type}
            onClick={() => handleAdd(opt.type)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-ui-xs hover:bg-bg-surface transition-colors"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${badge.color}`}
              aria-label={`${opt.type} layer type`}
            />
            <div>
              <div className="text-text-primary font-medium">{opt.label}</div>
              <div className="text-ui-xs text-text-muted">{opt.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Layer Config Panels ───

function BaseLayerConfig({ layerId }: { layerId: string }) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  const updateConfig = useLayerStore((s) => s.updateLayerConfig);

  if (!layer) return null;

  const style = (layer.config.style as string) ?? 'stable';
  const color = (layer.config.color as { r: number; g: number; b: number }) ?? {
    r: 0,
    g: 140,
    b: 255,
  };

  return (
    <div className="space-y-3">
      {/* Style selector */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Style
        </label>
        <div className="max-h-[200px] overflow-y-auto rounded border border-border-subtle/50">
          <div className="grid grid-cols-3 gap-1 p-1">
            {BLADE_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => updateConfig(layerId, { style: s.id })}
                className={`px-1.5 py-0.5 rounded text-ui-xs border transition-colors truncate ${
                  style === s.id
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border-subtle bg-bg-deep text-text-secondary hover:border-border-light'
                }`}
                title={s.label}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Color */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={rgbToHex(color.r, color.g, color.b)}
            onChange={(e) => updateConfig(layerId, { color: hexToRgb(e.target.value) })}
            className="w-8 h-6 rounded cursor-pointer border border-border-subtle bg-transparent"
            aria-label="Base layer color"
          />
          <span className="text-ui-sm text-text-muted font-mono">
            Rgb&lt;{color.r},{color.g},{color.b}&gt;
          </span>
        </div>
      </div>
    </div>
  );
}

function EffectLayerConfig({ layerId }: { layerId: string }) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  const updateConfig = useLayerStore((s) => s.updateLayerConfig);

  if (!layer) return null;

  const effectType = (layer.config.effectType as string) ?? 'clash';
  const color = (layer.config.color as { r: number; g: number; b: number }) ?? {
    r: 255,
    g: 255,
    b: 255,
  };
  const size = (layer.config.size as number) ?? 50;

  return (
    <div className="space-y-3">
      {/* Effect type */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Effect Type
        </label>
        <div className="grid grid-cols-2 gap-1">
          {EFFECT_TYPES.map((et) => (
            <button
              key={et.id}
              onClick={() => updateConfig(layerId, { effectType: et.id })}
              className={`px-2 py-1 rounded text-ui-sm border transition-colors ${
                effectType === et.id
                  ? 'border-accent bg-accent-dim text-accent'
                  : 'border-border-subtle bg-bg-deep text-text-secondary hover:border-border-light'
              }`}
            >
              {et.label}
            </button>
          ))}
        </div>
      </div>
      {/* Trigger color */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Trigger Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={rgbToHex(color.r, color.g, color.b)}
            onChange={(e) => updateConfig(layerId, { color: hexToRgb(e.target.value) })}
            className="w-8 h-6 rounded cursor-pointer border border-border-subtle bg-transparent"
            aria-label="Effect trigger color"
          />
          <span className="text-ui-sm text-text-muted font-mono">
            Rgb&lt;{color.r},{color.g},{color.b}&gt;
          </span>
        </div>
      </div>
      {/* Intensity */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Intensity
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={size}
            onChange={(e) => updateConfig(layerId, { size: Number(e.target.value) })}
            className="flex-1"
            aria-label="Effect intensity"
          />
          <span className="text-ui-sm text-text-muted font-mono w-8 text-right">{size}%</span>
        </div>
      </div>
    </div>
  );
}

function AccentLayerConfig({ layerId }: { layerId: string }) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  const updateConfig = useLayerStore((s) => s.updateLayerConfig);

  if (!layer) return null;

  const color = (layer.config.color as { r: number; g: number; b: number }) ?? {
    r: 255,
    g: 200,
    b: 0,
  };
  const position = (layer.config.position as number) ?? 90;
  const width = (layer.config.width as number) ?? 10;

  return (
    <div className="space-y-3">
      {/* Color */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={rgbToHex(color.r, color.g, color.b)}
            onChange={(e) => updateConfig(layerId, { color: hexToRgb(e.target.value) })}
            className="w-8 h-6 rounded cursor-pointer border border-border-subtle bg-transparent"
            aria-label="Accent layer color"
          />
          <span className="text-ui-sm text-text-muted font-mono">
            Rgb&lt;{color.r},{color.g},{color.b}&gt;
          </span>
        </div>
      </div>
      {/* Position */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Position (0 = hilt, 100 = tip)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={position}
            onChange={(e) => updateConfig(layerId, { position: Number(e.target.value) })}
            className="flex-1"
            aria-label="Accent position"
          />
          <span className="text-ui-sm text-text-muted font-mono w-8 text-right">{position}%</span>
        </div>
      </div>
      {/* Width */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Width
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={50}
            value={width}
            onChange={(e) => updateConfig(layerId, { width: Number(e.target.value) })}
            className="flex-1"
            aria-label="Accent width"
          />
          <span className="text-ui-sm text-text-muted font-mono w-8 text-right">{width}%</span>
        </div>
      </div>
    </div>
  );
}

function MixLayerConfig({ layerId }: { layerId: string }) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  const updateConfig = useLayerStore((s) => s.updateLayerConfig);

  if (!layer) return null;

  const mixRatio = (layer.config.mixRatio as number) ?? 50;
  const styleA = (layer.config.styleA as string) ?? 'stable';
  const styleB = (layer.config.styleB as string) ?? 'fire';

  return (
    <div className="space-y-3">
      {/* Style A */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Style A
        </label>
        <select
          value={styleA}
          onChange={(e) => updateConfig(layerId, { styleA: e.target.value })}
          className="w-full px-2 py-1 rounded text-ui-sm bg-bg-deep border border-border-subtle text-text-primary"
        >
          {BLADE_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {/* Mix Ratio */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Mix Ratio
        </label>
        <div className="flex items-center gap-2">
          <span className="text-ui-xs text-text-muted">A</span>
          <input
            type="range"
            min={0}
            max={100}
            value={mixRatio}
            onChange={(e) => updateConfig(layerId, { mixRatio: Number(e.target.value) })}
            className="flex-1"
            aria-label="Mix ratio between Style A and Style B"
          />
          <span className="text-ui-xs text-text-muted">B</span>
          <span className="text-ui-sm text-text-muted font-mono w-8 text-right">{mixRatio}%</span>
        </div>
      </div>
      {/* Style B */}
      <div>
        <label className="text-ui-xs text-text-muted uppercase tracking-wider mb-1 block">
          Style B
        </label>
        <select
          value={styleB}
          onChange={(e) => updateConfig(layerId, { styleB: e.target.value })}
          className="w-full px-2 py-1 rounded text-ui-sm bg-bg-deep border border-border-subtle text-text-primary"
        >
          {BLADE_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function LayerConfigPanel({ layerId }: { layerId: string }) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  if (!layer) return null;

  switch (layer.type) {
    case 'base':
      return <BaseLayerConfig layerId={layerId} />;
    case 'effect':
      return <EffectLayerConfig layerId={layerId} />;
    case 'accent':
      return <AccentLayerConfig layerId={layerId} />;
    case 'mix':
      return <MixLayerConfig layerId={layerId} />;
  }
}

// ─── Layer Row ───

/**
 * Map a render state to the triple of buttons' visual tokens.
 *
 * Uses `--status-*` tokens rather than raw red/green/yellow so color
 * theming and a11y contrast tune centrally. Glyph pairing follows the
 * StatusSignal convention — every color-coded signal has a typographic
 * fallback:
 *
 *   Bypass — ▢ (outlined square)   — status-info / muted when off
 *   Mute   — ▽ (empty triangle)     — status-warn when engaged
 *   Solo   — ◉ (bullseye)            — status-ok when engaged (the
 *            chosen signal for "isolated and playing")
 *
 * We deliberately avoid red for "solo on" — in DAWs red-solo is common
 * but conflicts with `--status-error` semantics and colorblind-safe
 * palette discipline. Green (status-ok) + ◉ reads as "active signal"
 * without implying failure.
 */
const AUDITION_BUTTON_TOKENS = {
  bypass: {
    label: 'B',
    title: 'Bypass — skip layer in compositor (zero CPU)',
    glyphOn: '\u25A2',   // ▢
    glyphOff: '\u25A2',  // ▢
    colorOn: 'rgb(var(--status-info))',
    colorOff: 'rgb(var(--text-muted))',
    bgOn: 'rgba(var(--status-info), 0.15)',
  },
  mute: {
    label: 'M',
    title: 'Mute — composite as black (still pays CPU)',
    glyphOn: '\u25BD',   // ▽
    glyphOff: '\u25BD',  // ▽
    colorOn: 'rgb(var(--status-warn))',
    colorOff: 'rgb(var(--text-muted))',
    bgOn: 'rgba(var(--status-warn), 0.15)',
  },
  solo: {
    label: 'S',
    title: 'Solo — render only soloed layers',
    glyphOn: '\u25C9',   // ◉
    glyphOff: '\u25CB',  // ○
    colorOn: 'rgb(var(--status-ok))',
    colorOff: 'rgb(var(--text-muted))',
    bgOn: 'rgba(var(--status-ok), 0.15)',
  },
} as const;

function AuditionButton({
  kind,
  active,
  onClick,
}: {
  kind: 'bypass' | 'mute' | 'solo';
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const tokens = AUDITION_BUTTON_TOKENS[kind];
  return (
    <button
      onClick={onClick}
      className="touch-target shrink-0 w-5 h-5 text-ui-xs leading-none flex items-center justify-center rounded border transition-colors font-mono"
      style={{
        color: active ? tokens.colorOn : tokens.colorOff,
        background: active ? tokens.bgOn : 'transparent',
        borderColor: active ? tokens.colorOn : 'rgb(var(--border-subtle))',
      }}
      title={`${tokens.title} (${active ? 'on' : 'off'})`}
      aria-label={`${kind} ${active ? 'on' : 'off'}`}
      aria-pressed={active}
      role="switch"
      aria-checked={active}
    >
      <span aria-hidden="true" className="text-ui-xs">
        {active ? tokens.glyphOn : tokens.glyphOff}
      </span>
      <span className="sr-only">{tokens.label}</span>
    </button>
  );
}

function LayerRow({
  layerId,
  isSelected,
  rowIndex,
  totalRows,
}: {
  layerId: string;
  isSelected: boolean;
  /** 0-indexed position in the rendered row list (for stagger). */
  rowIndex: number;
  /** Total rendered rows (for stagger). */
  totalRows: number;
}) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  const layerCount = useLayerStore((s) => s.layers.length);
  const layerIndex = useLayerStore((s) => s.layers.findIndex((l) => l.id === layerId));
  const selectLayer = useLayerStore((s) => s.selectLayer);
  const toggleVisibility = useLayerStore((s) => s.toggleVisibility);
  const setOpacity = useLayerStore((s) => s.setOpacity);
  const setBlendMode = useLayerStore((s) => s.setBlendMode);
  const moveLayer = useLayerStore((s) => s.moveLayer);
  const removeLayer = useLayerStore((s) => s.removeLayer);
  const duplicateLayer = useLayerStore((s) => s.duplicateLayer);
  const toggleBypass = useLayerStore((s) => s.toggleBypass);
  const toggleMute = useLayerStore((s) => s.toggleMute);
  const toggleSolo = useLayerStore((s) => s.toggleSolo);
  // Subscribe to the derived render state at this level; cheap (just
  // reads two booleans + iterates `layers` once). The subscription
  // re-fires when `layers` changes, which is correct — solo state
  // toggling must propagate to every row.
  const renderState: LayerRenderState = useLayerStore((s) =>
    s.getRenderState(layerId),
  );

  const [showOpacity, setShowOpacity] = useState(false);

  if (!layer) return null;

  const badge = TYPE_BADGES[layer.type];
  const canMoveUp = layerIndex < layerCount - 1;
  const canMoveDown = layerIndex > 0;

  // Stagger thumbnail updates when row count is high. Below the
  // threshold we let every thumbnail update every frame; above it we
  // round-robin to keep total frame cost under the 16ms budget.
  const shouldStagger = totalRows >= HIGH_DENSITY_THRESHOLD;
  const staggerTurn = shouldStagger ? rowIndex % Math.max(1, totalRows) : undefined;
  const staggerTotal = shouldStagger ? totalRows : undefined;

  return (
    <div
      className={`group border transition-colors rounded ${
        isSelected
          ? 'border-accent bg-accent-dim/30'
          : 'border-border-subtle bg-bg-surface hover:border-border-light'
      }`}
    >
      {/* Main row — compact at ~36px */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 cursor-pointer"
        onClick={() => selectLayer(isSelected ? null : layer.id)}
      >
        {/* Reorder arrows */}
        <div className="flex flex-col shrink-0" aria-label="Reorder">
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveLayer(layer.id, 'up');
            }}
            disabled={!canMoveUp}
            className={`touch-target text-ui-xs leading-none px-1 ${
              canMoveUp
                ? 'text-text-muted hover:text-accent'
                : 'text-text-muted/20 cursor-default'
            }`}
            title="Move up"
            aria-label="Move layer up"
          >
            {'\u25B2'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveLayer(layer.id, 'down');
            }}
            disabled={!canMoveDown}
            className={`touch-target text-ui-xs leading-none px-1 ${
              canMoveDown
                ? 'text-text-muted hover:text-accent'
                : 'text-text-muted/20 cursor-default'
            }`}
            title="Move down"
            aria-label="Move layer down"
          >
            {'\u25BC'}
          </button>
        </div>

        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleVisibility(layer.id);
          }}
          className={`touch-target text-ui-sm shrink-0 w-5 text-center transition-colors ${
            layer.visible ? 'text-text-secondary hover:text-accent' : 'text-text-muted/30'
          }`}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
          role="switch"
          aria-checked={layer.visible}
          aria-label={`Layer visibility: ${layer.name}`}
        >
          {layer.visible ? '\u25C9' : '\u25CB'}
        </button>

        {/* Type badge */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${badge.color}`}
          title={layer.type}
          aria-label={`${layer.type} layer`}
        />

        {/* Live thumbnail — 40x8 px */}
        <LayerThumbnail
          layer={layer}
          renderState={renderState}
          staggerTurn={staggerTurn}
          staggerTotal={staggerTotal}
        />

        {/* Layer name */}
        <span
          className={`flex-1 text-ui-base truncate ${
            layer.visible ? 'text-text-primary' : 'text-text-muted line-through'
          }`}
        >
          {layer.name}
        </span>

        {/* Audition controls: Bypass / Mute / Solo */}
        <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Audition controls">
          <AuditionButton
            kind="bypass"
            active={layer.bypass}
            onClick={(e) => {
              e.stopPropagation();
              toggleBypass(layer.id);
            }}
          />
          <AuditionButton
            kind="mute"
            active={layer.mute}
            onClick={(e) => {
              e.stopPropagation();
              toggleMute(layer.id);
            }}
          />
          <AuditionButton
            kind="solo"
            active={layer.solo}
            onClick={(e) => {
              e.stopPropagation();
              toggleSolo(layer.id);
            }}
          />
        </div>

        {/* Opacity indicator (click to expand slider) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowOpacity(!showOpacity);
          }}
          className="text-ui-xs text-text-muted font-mono shrink-0 hover:text-accent transition-colors w-8 text-right"
          title="Opacity"
          aria-label="Toggle opacity slider"
        >
          {Math.round(layer.opacity * 100)}%
        </button>

        {/* Blend mode dropdown */}
        <select
          value={layer.blendMode}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setBlendMode(layer.id, e.target.value as BlendMode)}
          className="text-ui-xs bg-transparent border-none text-text-muted cursor-pointer shrink-0 w-12 p-0"
          title="Blend mode"
          aria-label="Blend mode"
        >
          {BLEND_MODES.map((bm) => (
            <option key={bm.id} value={bm.id}>
              {bm.label}
            </option>
          ))}
        </select>

        {/* Duplicate */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            duplicateLayer(layer.id);
          }}
          className="touch-target text-ui-sm text-text-muted/50 hover:text-accent focus:opacity-100 transition-colors opacity-0 group-hover:opacity-100 shrink-0 w-5"
          title="Duplicate layer"
          aria-label="Duplicate layer"
        >
          {'\u2398'}
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeLayer(layer.id);
          }}
          className="touch-target text-ui-sm text-text-muted/50 hover:text-red-400 focus:opacity-100 transition-colors opacity-0 group-hover:opacity-100 shrink-0 w-5"
          title="Remove layer"
          aria-label="Remove layer"
        >
          {'\u2715'}
        </button>
      </div>

      {/* Opacity slider (expanded) */}
      {showOpacity && (
        <div className="flex items-center gap-2 px-3 pb-2">
          <label className="text-ui-xs text-text-muted shrink-0">Opacity</label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(layer.opacity * 100)}
            onChange={(e) => setOpacity(layer.id, Number(e.target.value) / 100)}
            className="flex-1"
            aria-label="Layer opacity"
          />
          <span className="text-ui-sm text-text-muted font-mono w-8 text-right">
            {Math.round(layer.opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

/**
 * Banner shown above the layer list whenever any layer has solo=true.
 * Click "Clear solo" to remove solo from every layer at once.
 */
function SoloBanner() {
  const soloedCount = useLayerStore(
    (s) => s.layers.filter((l) => l.solo).length,
  );
  const totalCount = useLayerStore((s) => s.layers.length);
  const clearSolo = useLayerStore((s) => s.clearSolo);

  if (soloedCount === 0) return null;

  return (
    <button
      onClick={clearSolo}
      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-ui-xs font-medium transition-colors"
      style={{
        background: 'rgba(var(--status-ok), 0.1)',
        border: '1px solid rgba(var(--status-ok), 0.4)',
        color: 'rgb(var(--status-ok))',
      }}
      title="Click to exit solo mode for all layers"
      aria-label={`Solo mode active — ${soloedCount} of ${totalCount} layers isolated. Click to clear solo.`}
    >
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="text-ui-sm">{'\u25C9'}</span>
        <span className="tracking-wider uppercase">
          Solo active — {soloedCount} of {totalCount} layer
          {totalCount !== 1 ? 's' : ''} isolated
        </span>
      </span>
      <span className="underline decoration-dotted opacity-80 hover:opacity-100">
        Clear solo
      </span>
    </button>
  );
}

export function LayerStack() {
  const layers = useLayerStore((s) => s.layers);
  const selectedLayerId = useLayerStore((s) => s.selectedLayerId);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Render layers bottom-to-top: reverse for display (top layer at top of list)
  const displayLayers = [...layers].reverse();
  const totalRows = displayLayers.length;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
          Layer Stack
          <HelpTooltip text="Stack multiple visual layers to compose complex blade styles. Base layers provide the primary look, Effect layers add combat reactions, Accent layers create tip/hilt highlights, and Mix layers blend two styles. Order matters: top layers render on top. Per-row B/M/S buttons control Bypass (skip entirely), Mute (composite as black), and Solo (isolate). See also: Color Panel for per-layer colors." proffie="Layers<base, BlastL<>, SimpleClashL<>, ...>" />
        </h3>
        <span className="text-ui-xs text-text-muted tabular-nums" aria-live="polite">
          {layers.length} layer{layers.length !== 1 ? 's' : ''}
        </span>
      </div>

      <SoloBanner />

      {/* Layer list */}
      <div className="space-y-1">
        {displayLayers.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded border border-dashed border-border-subtle/60 bg-bg-surface/40">
            <span className="text-ui-sm text-text-secondary font-medium">No layers yet</span>
            <span className="text-ui-xs text-text-muted text-center max-w-[240px] leading-relaxed">
              Start with a Base layer, then stack Effect / Accent / Mix layers on top to compose.
            </span>
          </div>
        )}
        {displayLayers.map((layer, idx) => (
          <LayerRow
            key={layer.id}
            layerId={layer.id}
            isSelected={selectedLayerId === layer.id}
            rowIndex={idx}
            totalRows={totalRows}
          />
        ))}
      </div>

      {/* Add layer button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full px-3 py-1.5 rounded text-ui-sm font-medium border border-dashed border-border-subtle text-text-muted hover:border-accent hover:text-accent transition-colors"
        >
          + Add Layer
        </button>
        {showAddMenu && <AddLayerDropdown onClose={() => setShowAddMenu(false)} />}
      </div>

      {/* Selected layer config */}
      {selectedLayerId && (
        <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle mt-2">
          <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
            Layer Config
            <HelpTooltip text="Settings specific to the selected layer. Base layers choose a style, Effect layers pick a trigger type (clash, blast, etc.), Accent layers set position along the blade, and Mix layers blend two styles with a ratio." />
          </h4>
          <LayerConfigPanel layerId={selectedLayerId} />
        </div>
      )}

      {/* ProffieOS mapping hint */}
      <div className="text-ui-xs text-text-muted/50 text-center pt-1">
        Maps to ProffieOS Layers&lt;&gt; template nesting
      </div>
    </div>
  );
}
