'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import {
  useLayerStore,
  SMOOTHSWING_DEFAULTS,
  type SmoothSwingLayerConfig,
  type SmoothSwingVersion,
} from '@/stores/layerStore';
import { useDragToScrub } from '@/hooks/useDragToScrub';

// ---------------------------------------------------------------------------
// SmoothSwing — now lives as a specialized modulator plate inside LayerStack.
//
// Per UX North Star §4 (Bitwig plate-in-device-chain pattern), SmoothSwing
// configuration is no longer a sibling panel. Instead, users add a
// "SmoothSwing" layer from LayerStack's Add-Layer menu; the plate below
// renders as the expanded view for that layer. State lives on the layer
// (config reorders, duplicates, and round-trips with Kyber Glyph alongside
// the rest of the saber design) and obeys audition controls (bypass / mute
// / solo) the same way visual layers do — e.g. "solo this plate" previews
// the SmoothSwing sound in isolation.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Parameter metadata
// ---------------------------------------------------------------------------

interface ParamMeta {
  key: keyof Omit<SmoothSwingLayerConfig, 'version'>;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals: number;
}

const PARAMS: ParamMeta[] = [
  {
    key: 'swingThreshold',
    label: 'Swing Threshold',
    hint: 'Minimum blade speed before swing sounds start. Higher = swings must be stronger to trigger.',
    min: 0, max: 500, step: 5, unit: '', decimals: 0,
  },
  {
    key: 'swingSharpness',
    label: 'Swing Sharpness',
    hint: 'How quickly the low\u2194high crossfade responds to speed changes. Higher = snappier transitions.',
    min: 0, max: 5, step: 0.05, unit: '', decimals: 2,
  },
  {
    key: 'swingStrength',
    label: 'Swing Strength',
    hint: 'Overall volume scaling applied to swing sounds. 700 is the ProffieOS default.',
    min: 0, max: 2000, step: 10, unit: '', decimals: 0,
  },
  {
    key: 'humVolume',
    label: 'Hum Volume',
    hint: 'Background hum loudness level. Lower values let swing sounds stand out more.',
    min: 0, max: 5, step: 0.1, unit: '', decimals: 1,
  },
  {
    key: 'accentSwingSpeed',
    label: 'Accent Swing Speed',
    hint: 'Speed threshold above which an accent overlay sound fires. Triggers on fast, committed swings.',
    min: 0, max: 600, step: 5, unit: '', decimals: 0,
  },
  {
    key: 'accentSwingLength',
    label: 'Accent Length',
    hint: 'How long the accent sound overlay plays in milliseconds before fading back to the swing pair.',
    min: 50, max: 500, step: 10, unit: 'ms', decimals: 0,
  },
];

// ---------------------------------------------------------------------------
// Crossfade visualiser helpers (pure — exported for reuse + testing)
// ---------------------------------------------------------------------------

/**
 * Compute low/high gain levels from a normalised speed (0–1), mirroring
 * the SmoothSwingEngine.update() logic so the preview is accurate.
 */
export function computeCrossfade(
  normSpeed: number,
  sharpness: number,
): { lowGain: number; highGain: number; active: boolean } {
  const SILENCE_THRESHOLD = 0.1;

  if (normSpeed < SILENCE_THRESHOLD) {
    return { lowGain: 0, highGain: 0, active: false };
  }

  // Map SILENCE_THRESHOLD..1 -> 0..1
  const raw = (normSpeed - SILENCE_THRESHOLD) / (1 - SILENCE_THRESHOLD);
  // Apply sharpness as a power curve: > 1 biases toward high faster, < 1 slower
  const shaped = Math.pow(raw, Math.max(0.2, 1 / Math.max(sharpness, 0.2)));
  const t = Math.max(0, Math.min(1, shaped));

  return { lowGain: 1 - t, highGain: t, active: true };
}

/**
 * Coerce an unknown `BladeLayer.config` into a fully-populated
 * SmoothSwingLayerConfig, substituting defaults for any missing fields.
 * Exported so LayerStack + other consumers can read config uniformly.
 */
export function readSmoothSwingConfig(
  raw: Record<string, unknown>,
): SmoothSwingLayerConfig {
  const num = (key: keyof SmoothSwingLayerConfig, fallback: number): number => {
    const v = raw[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  };
  const version: SmoothSwingVersion =
    raw.version === 'V1' || raw.version === 'V2'
      ? (raw.version as SmoothSwingVersion)
      : SMOOTHSWING_DEFAULTS.version;
  return {
    version,
    swingThreshold: num('swingThreshold', SMOOTHSWING_DEFAULTS.swingThreshold),
    swingSharpness: num('swingSharpness', SMOOTHSWING_DEFAULTS.swingSharpness),
    swingStrength: num('swingStrength', SMOOTHSWING_DEFAULTS.swingStrength),
    humVolume: num('humVolume', SMOOTHSWING_DEFAULTS.humVolume),
    accentSwingSpeed: num('accentSwingSpeed', SMOOTHSWING_DEFAULTS.accentSwingSpeed),
    accentSwingLength: num('accentSwingLength', SMOOTHSWING_DEFAULTS.accentSwingLength),
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-ui-xs font-mono uppercase tracking-widest text-text-muted">
        {children}
      </span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}

interface SliderRowProps {
  meta: ParamMeta;
  value: number;
  onChange: (key: keyof Omit<SmoothSwingLayerConfig, 'version'>, value: number) => void;
}

function SliderRow({ meta, value, onChange }: SliderRowProps) {
  const displayValue =
    meta.decimals === 0
      ? String(value)
      : value.toFixed(meta.decimals);

  const reactId = useId();
  const inputId = `smoothswing-${meta.key}-${reactId}`;

  const pointerHandlers = useDragToScrub<HTMLLabelElement>({
    value,
    min: meta.min,
    max: meta.max,
    step: meta.step,
    onScrub: (next) => onChange(meta.key, next),
  });

  return (
    <div className="group">
      <div className="flex items-baseline justify-between mb-0.5">
        <label
          htmlFor={inputId}
          {...pointerHandlers}
          className="text-ui-xs text-text-secondary font-mono cursor-ew-resize select-none touch-none"
          style={{ touchAction: 'none' }}
          title="Drag to scrub (Shift 10×, Alt 0.1×). Click slider to type."
        >
          {meta.label}
        </label>
        <span className="text-ui-xs font-mono text-accent-primary tabular-nums">
          {displayValue}
          {meta.unit ? <span className="text-text-muted ml-0.5">{meta.unit}</span> : null}
        </span>
      </div>

      <input
        id={inputId}
        type="range"
        min={meta.min}
        max={meta.max}
        step={meta.step}
        value={value}
        onChange={(e) => onChange(meta.key, parseFloat(e.target.value))}
        className="w-full h-1 appearance-none rounded-full cursor-pointer
          bg-bg-elevated
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent-primary
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-125"
      />

      <p className="text-ui-xs leading-snug text-text-muted mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {meta.hint}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crossfade visualiser
// ---------------------------------------------------------------------------

interface CrossfadeVizProps {
  config: SmoothSwingLayerConfig;
}

function CrossfadeViz({ config }: CrossfadeVizProps) {
  const [simSpeed, setSimSpeed] = useState(0.5);

  const normSpeed = simSpeed; // slider already 0–1
  const { lowGain, highGain, active } = useMemo(
    () => computeCrossfade(normSpeed, config.swingSharpness),
    [normSpeed, config.swingSharpness],
  );

  // Map swingThreshold (0–500) back to a 0–1 threshold line position
  const thresholdNorm = config.swingThreshold / 500;
  // Map accentSwingSpeed (0–600) back to 0–1 for the accent marker
  const accentNorm = Math.min(config.accentSwingSpeed / 600, 1);

  const speedPct = Math.round(simSpeed * 100);

  return (
    <div className="rounded border border-border-subtle bg-bg-elevated p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-ui-xs font-mono uppercase tracking-widest text-text-muted">
          Crossfade Preview
        </span>
        {active ? (
          <span className="text-ui-xs font-mono text-accent-secondary">ACTIVE</span>
        ) : (
          <span className="text-ui-xs font-mono text-text-muted/50">SILENT</span>
        )}
      </div>

      {/* Crossfade bar */}
      <div className="relative h-5 rounded overflow-hidden bg-bg-surface flex">
        {/* Low (swingl) segment */}
        <div
          className="h-full transition-all duration-75 flex items-center justify-center"
          style={{
            width: `${lowGain * 100}%`,
            background: 'rgb(var(--status-cyan, 56 189 248) / 0.7)',
          }}
        >
          {lowGain > 0.15 && (
            <span className="text-ui-xs font-mono text-white/90 select-none">L</span>
          )}
        </div>
        {/* High (swingh) segment */}
        <div
          className="h-full transition-all duration-75 bg-accent-primary/80 flex items-center justify-center"
          style={{ width: `${highGain * 100}%` }}
        >
          {highGain > 0.15 && (
            <span className="text-ui-xs font-mono text-white/90 select-none">H</span>
          )}
        </div>
        {/* Silent fill */}
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-ui-xs font-mono text-text-muted/50">below threshold</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-ui-xs font-mono text-text-muted">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ background: 'rgb(var(--status-cyan, 56 189 248) / 0.7)' }}
          />
          swingl (low) {active ? `${Math.round(lowGain * 100)}%` : ''}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-accent-primary/80" />
          swingh (high) {active ? `${Math.round(highGain * 100)}%` : ''}
        </span>
      </div>

      {/* Sim speed slider */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <label className="text-ui-xs font-mono text-text-muted">
            Simulated Swing Speed
          </label>
          <span className="text-ui-xs font-mono tabular-nums text-text-secondary">
            {speedPct}%
          </span>
        </div>

        {/* Track with threshold and accent markers */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={simSpeed}
            onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
            className="w-full h-1 appearance-none rounded-full cursor-pointer
              bg-bg-surface
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-text-secondary
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
          {/* Threshold tick */}
          <div
            className="absolute top-0 -translate-y-0.5 w-px h-2.5 pointer-events-none"
            style={{
              left: `${thresholdNorm * 100}%`,
              background: 'rgb(var(--status-warn) / 0.7)',
            }}
            title="Swing Threshold"
          />
          {/* Accent speed tick */}
          <div
            className="absolute top-0 -translate-y-0.5 w-px h-2.5 pointer-events-none"
            style={{
              left: `${accentNorm * 100}%`,
              background: 'rgb(var(--status-error) / 0.6)',
            }}
            title="Accent Swing Speed"
          />
        </div>

        <div className="flex items-center gap-3 mt-1 text-ui-xs font-mono text-text-muted/60">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5"
              style={{ background: 'rgb(var(--status-warn) / 0.7)' }}
            />
            swing threshold
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5"
              style={{ background: 'rgb(var(--status-error) / 0.6)' }}
            />
            accent trigger
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SmoothSwingPlate — rendered by LayerStack as the expanded view for a
// `smoothswing` layer type. Reads and writes the layer's config directly
// via layerStore, so state moves with the layer when reordered/duplicated
// and round-trips through history/undo alongside the rest of the stack.
// ---------------------------------------------------------------------------

export interface SmoothSwingPlateProps {
  layerId: string;
}

export function SmoothSwingPlate({ layerId }: SmoothSwingPlateProps) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  const updateLayerConfig = useLayerStore((s) => s.updateLayerConfig);

  // Coerce whatever's in the layer.config into a fully populated
  // SmoothSwingLayerConfig so partial persistence / migration from older
  // saves always has a safe starting point.
  const config = useMemo<SmoothSwingLayerConfig>(
    () => readSmoothSwingConfig(layer?.config ?? {}),
    [layer?.config],
  );

  const handleVersion = useCallback(
    (v: SmoothSwingVersion) => {
      updateLayerConfig(layerId, { version: v });
    },
    [layerId, updateLayerConfig],
  );

  const handleParam = useCallback(
    (key: keyof Omit<SmoothSwingLayerConfig, 'version'>, value: number) => {
      updateLayerConfig(layerId, { [key]: value });
    },
    [layerId, updateLayerConfig],
  );

  const handleReset = useCallback(() => {
    updateLayerConfig(layerId, { ...SMOOTHSWING_DEFAULTS });
  }, [layerId, updateLayerConfig]);

  const isDirty = useMemo(
    () =>
      (Object.keys(SMOOTHSWING_DEFAULTS) as Array<keyof SmoothSwingLayerConfig>).some(
        (k) => config[k] !== SMOOTHSWING_DEFAULTS[k],
      ),
    [config],
  );

  if (!layer) return null;

  return (
    <div className="flex flex-col gap-2 text-text-primary">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-ui-sm font-mono text-text-primary">SmoothSwing Plate</h4>
          <p className="text-ui-xs text-text-muted mt-0.5 leading-snug">
            Crossfades paired swingl/swingh files based on blade speed
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={!isDirty}
          className="text-ui-xs font-mono px-2 py-1 rounded border border-border-subtle
            text-text-muted hover:text-text-secondary hover:border-border-strong
            disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Version selector */}
      <div>
        <SectionHeader>Algorithm Version</SectionHeader>
        <div className="flex gap-2">
          {(['V1', 'V2'] as SmoothSwingVersion[]).map((v) => (
            <button
              key={v}
              onClick={() => handleVersion(v)}
              className={[
                'flex-1 py-1.5 rounded text-ui-xs font-mono border transition-colors',
                config.version === v
                  ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                  : 'bg-bg-elevated border-border-subtle text-text-muted hover:border-border-strong hover:text-text-secondary',
              ].join(' ')}
            >
              {v}
              {v === 'V2' && (
                <span className="ml-1 text-ui-xs text-accent-secondary opacity-80">rec</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-ui-xs text-text-muted mt-1.5 leading-snug">
          {config.version === 'V2'
            ? 'V2 uses per-pair seamless looping with speed-reactive crossfade. Recommended for all new fonts.'
            : 'V1 uses a simpler gain approach with less smooth transitions. Legacy support only.'}
        </p>
      </div>

      {/* Swing parameters */}
      <div>
        <SectionHeader>Swing Parameters</SectionHeader>
        <div className="space-y-2">
          {PARAMS.slice(0, 3).map((meta) => (
            <SliderRow
              key={meta.key}
              meta={meta}
              value={config[meta.key] as number}
              onChange={handleParam}
            />
          ))}
        </div>
      </div>

      {/* Hum & accent */}
      <div>
        <SectionHeader>Hum &amp; Accent</SectionHeader>
        <div className="space-y-2">
          {PARAMS.slice(3).map((meta) => (
            <SliderRow
              key={meta.key}
              meta={meta}
              value={config[meta.key] as number}
              onChange={handleParam}
            />
          ))}
        </div>
      </div>

      {/* Crossfade visualiser */}
      <div>
        <SectionHeader>Live Crossfade Preview</SectionHeader>
        <CrossfadeViz config={config} />
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy SmoothSwingPanel export — preserved for any stale layout configs
// that still reference the `smoothswing-config` panel slot.
//
// Per item #15 of the UX North Star remaining-items list, SmoothSwing is
// no longer a sibling panel; it lives inside LayerStack as a plate. This
// guidance panel redirects users who land here from a persisted layout
// and gives them a one-click path to the new home.
// ---------------------------------------------------------------------------

export function SmoothSwingPanel() {
  const addLayer = useLayerStore((s) => s.addLayer);
  const layers = useLayerStore((s) => s.layers);
  const selectLayer = useLayerStore((s) => s.selectLayer);

  const existing = useMemo(
    () => layers.find((l) => l.type === 'smoothswing'),
    [layers],
  );

  const handleAdd = useCallback(() => {
    if (existing) {
      selectLayer(existing.id);
      return;
    }
    addLayer({
      type: 'smoothswing',
      name: 'SmoothSwing',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      config: { ...SMOOTHSWING_DEFAULTS },
    });
  }, [addLayer, existing, selectLayer]);

  return (
    <div className="flex flex-col gap-3 p-4 text-text-primary">
      <div>
        <h3 className="text-ui-sm font-mono text-text-primary">SmoothSwing has moved</h3>
        <p className="text-ui-xs text-text-muted mt-1 leading-snug">
          SmoothSwing now lives inside the Layer Stack as a modulator plate,
          so its settings reorder and duplicate with your saber design.
          {existing
            ? ' A SmoothSwing layer is already on your stack.'
            : ' Add a SmoothSwing layer from the Layer Stack to tune it.'}
        </p>
      </div>
      <button
        onClick={handleAdd}
        className="self-start px-3 py-1.5 rounded text-ui-xs font-mono border border-accent-primary
          bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
      >
        {existing ? 'Select SmoothSwing Layer' : 'Add SmoothSwing Layer'}
      </button>
    </div>
  );
}
