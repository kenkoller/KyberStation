'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import type { BladeConfig } from '@bladeforge/engine';

const STYLE_OPTIONS = [
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
] as const;

const IGNITION_OPTIONS = [
  { id: 'standard', label: 'Standard' },
  { id: 'scroll', label: 'Scroll' },
  { id: 'spark', label: 'Spark' },
  { id: 'center', label: 'Center' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'stutter', label: 'Stutter' },
  { id: 'glitch', label: 'Glitch' },
] as const;

const RETRACTION_OPTIONS = [
  { id: 'standard', label: 'Standard' },
  { id: 'scroll', label: 'Scroll' },
  { id: 'fadeout', label: 'Fade Out' },
  { id: 'center', label: 'Center' },
  { id: 'shatter', label: 'Shatter' },
] as const;

function rgbToHex(color: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function getLabelForId(
  options: ReadonlyArray<{ id: string; label: string }>,
  id: string,
): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

interface ConfigColumnProps {
  label: string;
  config: BladeConfig;
  onChangeStyle: (styleId: string) => void;
  onChangeIgnition: (id: string) => void;
  onChangeRetraction: (id: string) => void;
  onChangeBaseColor: (color: { r: number; g: number; b: number }) => void;
  readonly?: boolean;
}

function ConfigColumn({
  label,
  config,
  onChangeStyle,
  onChangeIgnition,
  onChangeRetraction,
  onChangeBaseColor,
  readonly = false,
}: ConfigColumnProps) {
  const selectClasses =
    'w-full rounded border border-border-subtle bg-bg-deep px-2 py-1.5 text-ui-sm text-text-primary focus:border-accent-border focus:outline-none disabled:opacity-50';

  return (
    <div className="flex flex-1 flex-col gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
      <h3 className="text-ui-sm font-semibold text-accent">{label}</h3>

      {/* Config summary */}
      <div className="rounded bg-bg-deep px-3 py-2 text-ui-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full border border-border-subtle"
            style={{ backgroundColor: rgbToHex(config.baseColor) }}
          />
          <span>{getLabelForId([...STYLE_OPTIONS], config.style)}</span>
          <span className="text-text-muted">/</span>
          <span>{getLabelForId([...IGNITION_OPTIONS], config.ignition)}</span>
        </div>
      </div>

      {/* Style dropdown */}
      <label className="flex flex-col gap-1">
        <span className="text-ui-xs text-text-muted">Style</span>
        <select
          className={selectClasses}
          value={config.style}
          onChange={(e) => onChangeStyle(e.target.value)}
          disabled={readonly}
        >
          {STYLE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* Ignition dropdown */}
      <label className="flex flex-col gap-1">
        <span className="text-ui-xs text-text-muted">Ignition</span>
        <select
          className={selectClasses}
          value={config.ignition}
          onChange={(e) => onChangeIgnition(e.target.value)}
          disabled={readonly}
        >
          {IGNITION_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* Retraction dropdown */}
      <label className="flex flex-col gap-1">
        <span className="text-ui-xs text-text-muted">Retraction</span>
        <select
          className={selectClasses}
          value={config.retraction}
          onChange={(e) => onChangeRetraction(e.target.value)}
          disabled={readonly}
        >
          {RETRACTION_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* Base color picker */}
      <label className="flex flex-col gap-1">
        <span className="text-ui-xs text-text-muted">Base Color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-8 w-10 cursor-pointer rounded border border-border-subtle bg-bg-deep"
            value={rgbToHex(config.baseColor)}
            onChange={(e) => onChangeBaseColor(hexToRgb(e.target.value))}
            disabled={readonly}
          />
          <span className="text-ui-xs text-text-secondary">
            {rgbToHex(config.baseColor).toUpperCase()}
          </span>
        </div>
      </label>
    </div>
  );
}

export function ComparisonView() {
  const config = useBladeStore((s) => s.config);
  const candidateConfig = useBladeStore((s) => s.candidateConfig);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const setCandidateConfig = useBladeStore((s) => s.setCandidateConfig);
  const applyCandidateConfig = useBladeStore((s) => s.applyCandidateConfig);

  // Initialize candidate as a clone of the current config when opened
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setCandidateConfig({ ...config });
      setInitialized(true);
    }
  }, [initialized, config, setCandidateConfig]);

  const candidate = candidateConfig ?? config;

  const handleUpdateCandidate = useCallback(
    (partial: Partial<BladeConfig>) => {
      setCandidateConfig({ ...candidate, ...partial });
    },
    [candidate, setCandidateConfig],
  );

  const handleSwap = useCallback(() => {
    const currentA = { ...config };
    const currentB = { ...candidate };
    updateConfig(currentB);
    setCandidateConfig(currentA);
  }, [config, candidate, updateConfig, setCandidateConfig]);

  const handleApplyB = useCallback(() => {
    applyCandidateConfig();
    // Re-initialize candidate from newly applied config
    setInitialized(false);
  }, [applyCandidateConfig]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-ui-sm font-semibold text-text-primary">
          A/B Comparison
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSwap}
            className="rounded border border-border-subtle bg-bg-secondary px-3 py-1.5 text-ui-xs font-medium text-text-primary transition-colors hover:border-accent-border hover:text-accent"
          >
            Swap A/B
          </button>
          <button
            type="button"
            onClick={handleApplyB}
            className="rounded bg-accent-dim px-3 py-1.5 text-ui-xs font-medium text-accent transition-colors hover:brightness-110"
          >
            Apply B
          </button>
        </div>
      </div>

      {/* Side-by-side columns */}
      <div className="flex gap-4">
        <ConfigColumn
          label="A (Current)"
          config={config}
          onChangeStyle={(styleId) => updateConfig({ style: styleId })}
          onChangeIgnition={(id) => updateConfig({ ignition: id })}
          onChangeRetraction={(id) => updateConfig({ retraction: id })}
          onChangeBaseColor={(color) => updateConfig({ baseColor: color })}
        />
        <ConfigColumn
          label="B (Candidate)"
          config={candidate}
          onChangeStyle={(styleId) => handleUpdateCandidate({ style: styleId })}
          onChangeIgnition={(id) => handleUpdateCandidate({ ignition: id })}
          onChangeRetraction={(id) =>
            handleUpdateCandidate({ retraction: id })
          }
          onChangeBaseColor={(color) =>
            handleUpdateCandidate({ baseColor: color })
          }
        />
      </div>
    </div>
  );
}
