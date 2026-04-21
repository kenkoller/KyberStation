'use client';
import { useLayerStore } from '@/stores/layerStore';
import { SmoothSwingPlate } from '../SmoothSwingPanel';
import { BLADE_STYLES, EFFECT_TYPES, hexToRgb, rgbToHex } from './constants';
import { MixRatioScrub, StackedScrub } from './scrubFields';

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
      <StackedScrub
        label="Intensity"
        min={0} max={100}
        value={size}
        onChange={(v) => updateConfig(layerId, { size: v })}
        ariaLabel="Effect intensity"
        unit="%"
      />
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
      <StackedScrub
        label="Position (0 = hilt, 100 = tip)"
        min={0} max={100}
        value={position}
        onChange={(v) => updateConfig(layerId, { position: v })}
        ariaLabel="Accent position"
        unit="%"
      />
      {/* Width */}
      <StackedScrub
        label="Width"
        min={1} max={50}
        value={width}
        onChange={(v) => updateConfig(layerId, { width: v })}
        ariaLabel="Accent width"
        unit="%"
      />
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
      <MixRatioScrub
        value={mixRatio}
        onChange={(v) => updateConfig(layerId, { mixRatio: v })}
      />
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

export function LayerConfigPanel({ layerId }: { layerId: string }) {
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
    case 'smoothswing':
      // Specialized modulator plate. The plate's own header tells users
      // they're looking at SmoothSwing and lets them reset; the rest of
      // the row controls (B/M/S, reorder, delete) are inherited from
      // the generic LayerRow.
      return <SmoothSwingPlate layerId={layerId} />;
  }
}
