'use client';

import { useState, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// SmoothSwing configuration types + defaults
// ---------------------------------------------------------------------------

type SmoothSwingVersion = 'V1' | 'V2';

interface SmoothSwingConfig {
  version: SmoothSwingVersion;
  swingThreshold: number;    // 0–500    — min speed to trigger swing audio
  swingSharpness: number;    // 0.0–5.0  — how quickly crossfade reacts
  swingStrength: number;     // 0–2000   — volume scaling for swing sounds
  humVolume: number;         // 0–5      — background hum volume
  accentSwingSpeed: number;  // 0–600    — threshold for accent swings
  accentSwingLength: number; // 50–500ms — accent sound overlay duration
}

const DEFAULTS: SmoothSwingConfig = {
  version: 'V2',
  swingThreshold: 250,
  swingSharpness: 1.75,
  swingStrength: 700,
  humVolume: 3,
  accentSwingSpeed: 300,
  accentSwingLength: 150,
};

// ---------------------------------------------------------------------------
// Parameter metadata
// ---------------------------------------------------------------------------

interface ParamMeta {
  key: keyof Omit<SmoothSwingConfig, 'version'>;
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
    hint: 'How quickly the low↔high crossfade responds to speed changes. Higher = snappier transitions.',
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
// Crossfade visualiser helpers
// ---------------------------------------------------------------------------

/**
 * Compute low/high gain levels from a normalised speed (0–1), mirroring
 * the SmoothSwingEngine.update() logic so the preview is accurate.
 */
function computeCrossfade(
  normSpeed: number,
  sharpness: number,
): { lowGain: number; highGain: number; active: boolean } {
  const SILENCE_THRESHOLD = 0.1;

  if (normSpeed < SILENCE_THRESHOLD) {
    return { lowGain: 0, highGain: 0, active: false };
  }

  // Map SILENCE_THRESHOLD..1 → 0..1
  const raw = (normSpeed - SILENCE_THRESHOLD) / (1 - SILENCE_THRESHOLD);
  // Apply sharpness as a power curve: > 1 biases toward high faster, < 1 slower
  const shaped = Math.pow(raw, Math.max(0.2, 1 / Math.max(sharpness, 0.2)));
  const t = Math.max(0, Math.min(1, shaped));

  return { lowGain: 1 - t, highGain: t, active: true };
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
  onChange: (key: keyof Omit<SmoothSwingConfig, 'version'>, value: number) => void;
}

function SliderRow({ meta, value, onChange }: SliderRowProps) {
  const displayValue =
    meta.decimals === 0
      ? String(value)
      : value.toFixed(meta.decimals);

  return (
    <div className="group">
      <div className="flex items-baseline justify-between mb-0.5">
        <label className="text-ui-xs text-text-secondary font-mono">
          {meta.label}
        </label>
        <span className="text-ui-xs font-mono text-accent-primary tabular-nums">
          {displayValue}
          {meta.unit ? <span className="text-text-muted ml-0.5">{meta.unit}</span> : null}
        </span>
      </div>

      <input
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

      <p className="text-[10px] leading-snug text-text-muted mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {meta.hint}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crossfade visualiser
// ---------------------------------------------------------------------------

interface CrossfadeVizProps {
  config: SmoothSwingConfig;
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
          <span className="text-[10px] font-mono text-accent-secondary">ACTIVE</span>
        ) : (
          <span className="text-[10px] font-mono text-text-muted/50">SILENT</span>
        )}
      </div>

      {/* Crossfade bar */}
      <div className="relative h-5 rounded overflow-hidden bg-bg-surface flex">
        {/* Low (swingl) segment */}
        <div
          className="h-full transition-all duration-75 bg-blue-500/70 flex items-center justify-center"
          style={{ width: `${lowGain * 100}%` }}
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
      <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-blue-500/70" />
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
          <label className="text-[10px] font-mono text-text-muted">
            Simulated Swing Speed
          </label>
          <span className="text-[10px] font-mono tabular-nums text-text-secondary">
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
            className="absolute top-0 -translate-y-0.5 w-px h-2.5 bg-yellow-400/70 pointer-events-none"
            style={{ left: `${thresholdNorm * 100}%` }}
            title="Swing Threshold"
          />
          {/* Accent speed tick */}
          <div
            className="absolute top-0 -translate-y-0.5 w-px h-2.5 bg-red-400/60 pointer-events-none"
            style={{ left: `${accentNorm * 100}%` }}
            title="Accent Swing Speed"
          />
        </div>

        <div className="flex items-center gap-3 mt-1 text-ui-xs font-mono text-text-muted/60">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-yellow-400/70" />
            swing threshold
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-red-400/60" />
            accent trigger
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function SmoothSwingPanel() {
  const [config, setConfig] = useState<SmoothSwingConfig>({ ...DEFAULTS });

  // NOTE: SmoothSwing parameters are not yet wired to audioMixerStore — the
  // mixer store tracks EQ/effects mixer values. These settings are ready to
  // be persisted once a smoothSwingConfig slice is added to audioMixerStore
  // or a dedicated smoothSwingStore is created.

  const handleVersion = useCallback((v: SmoothSwingVersion) => {
    setConfig((prev) => ({ ...prev, version: v }));
  }, []);

  const handleParam = useCallback(
    (key: keyof Omit<SmoothSwingConfig, 'version'>, value: number) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setConfig({ ...DEFAULTS });
  }, []);

  const isDirty = useMemo(
    () =>
      (Object.keys(DEFAULTS) as Array<keyof SmoothSwingConfig>).some(
        (k) => config[k] !== DEFAULTS[k],
      ),
    [config],
  );

  return (
    <div className="flex flex-col gap-2 p-3 text-text-primary">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-ui-sm font-mono text-text-primary">SmoothSwing</h3>
          <p className="text-[10px] text-text-muted mt-0.5 leading-snug">
            Crossfades paired swingl/swingh files based on blade speed
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={!isDirty}
          className="text-[10px] font-mono px-2 py-1 rounded border border-border-subtle
            text-text-muted hover:text-text-secondary hover:border-border-strong
            disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          Reset
        </button>
      </div>

      {/* ── Version selector ── */}
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
        <p className="text-[10px] text-text-muted mt-1.5 leading-snug">
          {config.version === 'V2'
            ? 'V2 uses per-pair seamless looping with speed-reactive crossfade. Recommended for all new fonts.'
            : 'V1 uses a simpler gain approach with less smooth transitions. Legacy support only.'}
        </p>
      </div>

      {/* ── Swing parameters ── */}
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

      {/* ── Hum & accent ── */}
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

      {/* ── Crossfade visualiser ── */}
      <div>
        <SectionHeader>Live Crossfade Preview</SectionHeader>
        <CrossfadeViz config={config} />
      </div>

      {/* ── Wiring note ── */}
      <div className="rounded border border-border-subtle bg-bg-elevated px-3 py-2">
        <p className="text-[10px] font-mono text-text-muted leading-snug">
          <span className="text-accent-secondary">NOTE</span>
          {' '}These values are ready to wire into{' '}
          <span className="text-text-secondary">audioMixerStore</span>
          {' '}or a dedicated{' '}
          <span className="text-text-secondary">smoothSwingStore</span>
          {' '}for persistence and codegen integration.
        </p>
      </div>

    </div>
  );
}
