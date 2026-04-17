'use client';

// ─── Saber Wizard ───
//
// A guided 3-step flow for new users: archetype → colour → vibe.
// Combines into a fully-formed BladeConfig and loads it into the store.
// Uses existing presets and theme tokens — zero new visual primitives.

import { useState, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { playUISound } from '@/lib/uiSounds';
import type { BladeConfig } from '@kyberstation/engine';

interface SaberWizardProps {
  open: boolean;
  onClose: () => void;
}

// ─── Step 1: Archetype ───────────────────────────────────────────────

type Archetype = 'jedi' | 'sith' | 'grey' | 'unstable' | 'exotic';

interface ArchetypeOption {
  id: Archetype;
  label: string;
  tagline: string;
  defaultColor: { r: number; g: number; b: number };
  defaultStyle: string;
}

const ARCHETYPES: ArchetypeOption[] = [
  {
    id: 'jedi',
    label: 'Jedi',
    tagline: 'Classic defender. Blue or green, steady and bright.',
    defaultColor: { r: 0, g: 140, b: 255 },
    defaultStyle: 'stable',
  },
  {
    id: 'sith',
    label: 'Sith',
    tagline: 'Synthetic crystal. Deep red, aggressive energy.',
    defaultColor: { r: 255, g: 0, b: 0 },
    defaultStyle: 'stable',
  },
  {
    id: 'grey',
    label: 'Grey Jedi',
    tagline: 'Purple, yellow, or white. Between orthodox paths.',
    defaultColor: { r: 180, g: 0, b: 255 },
    defaultStyle: 'stable',
  },
  {
    id: 'unstable',
    label: 'Unstable',
    tagline: 'Cracked crystal. Flickering, unpredictable flame.',
    defaultColor: { r: 255, g: 20, b: 0 },
    defaultStyle: 'unstable',
  },
  {
    id: 'exotic',
    label: 'Exotic',
    tagline: 'Darksaber white, rainbow, or something else entirely.',
    defaultColor: { r: 255, g: 255, b: 255 },
    defaultStyle: 'rotoscope',
  },
];

// ─── Step 2: Colour swatches (per archetype) ─────────────────────────

const COLOR_SWATCHES: Record<Archetype, Array<{ id: string; label: string; color: { r: number; g: number; b: number } }>> = {
  jedi: [
    { id: 'obi-wan', label: 'Obi-Wan Blue', color: { r: 0, g: 140, b: 255 } },
    { id: 'anakin', label: 'Anakin Blue', color: { r: 0, g: 80, b: 255 } },
    { id: 'qui-gon', label: 'Qui-Gon Green', color: { r: 0, g: 220, b: 0 } },
    { id: 'luke-rotj', label: 'Luke Green', color: { r: 0, g: 255, b: 0 } },
    { id: 'yoda', label: 'Yoda Green', color: { r: 80, g: 255, b: 20 } },
  ],
  sith: [
    { id: 'vader', label: 'Vader Red', color: { r: 255, g: 0, b: 0 } },
    { id: 'maul', label: 'Maul Red', color: { r: 255, g: 0, b: 10 } },
    { id: 'dooku', label: 'Dooku Red', color: { r: 200, g: 0, b: 0 } },
    { id: 'palpatine', label: 'Palpatine Red', color: { r: 220, g: 0, b: 0 } },
  ],
  grey: [
    { id: 'mace', label: 'Mace Purple', color: { r: 128, g: 0, b: 255 } },
    { id: 'rey', label: 'Rey Yellow', color: { r: 255, g: 180, b: 0 } },
    { id: 'ahsoka', label: 'Ahsoka White', color: { r: 255, g: 255, b: 255 } },
    { id: 'revan', label: 'Revan Purple', color: { r: 160, g: 0, b: 255 } },
  ],
  unstable: [
    { id: 'kylo', label: 'Kylo Unstable', color: { r: 255, g: 14, b: 0 } },
    { id: 'inquisitor', label: 'Inquisitor Red', color: { r: 255, g: 20, b: 0 } },
    { id: 'crimson', label: 'Crimson', color: { r: 200, g: 10, b: 10 } },
  ],
  exotic: [
    { id: 'darksaber', label: 'Darksaber White', color: { r: 255, g: 255, b: 255 } },
    { id: 'cal-cyan', label: 'Cal Cyan', color: { r: 0, g: 200, b: 255 } },
    { id: 'cal-orange', label: 'Cal Orange', color: { r: 255, g: 90, b: 0 } },
    { id: 'magenta', label: 'Magenta', color: { r: 255, g: 0, b: 180 } },
    { id: 'rainbow', label: 'Rainbow (Aurora)', color: { r: 255, g: 0, b: 128 } },
  ],
};

// ─── Step 3: Vibe presets (apply effect parameters) ──────────────────

interface VibeOption {
  id: string;
  label: string;
  desc: string;
  shimmer: number;
  ignitionMs: number;
  retractionMs: number;
  ignition: string;
  retraction: string;
}

const VIBES: VibeOption[] = [
  {
    id: 'classic',
    label: 'Classic',
    desc: 'Movie-accurate standard ignition. Timeless.',
    shimmer: 0.1,
    ignitionMs: 300,
    retractionMs: 800,
    ignition: 'standard',
    retraction: 'standard',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    desc: 'Fast hot-tempered ignition with spark tip.',
    shimmer: 0.25,
    ignitionMs: 180,
    retractionMs: 450,
    ignition: 'spark',
    retraction: 'fadeout',
  },
  {
    id: 'mystical',
    label: 'Mystical',
    desc: 'Slow centre-out ignition. Dramatic, deliberate.',
    shimmer: 0.15,
    ignitionMs: 600,
    retractionMs: 1200,
    ignition: 'center',
    retraction: 'center',
  },
  {
    id: 'glitchy',
    label: 'Glitchy',
    desc: 'Damaged-crystal stutter. Breaks the rules.',
    shimmer: 0.35,
    ignitionMs: 500,
    retractionMs: 600,
    ignition: 'stutter',
    retraction: 'flickerOut',
  },
];

// ─── Component ───────────────────────────────────────────────────────

export function SaberWizard({ open, onClose }: SaberWizardProps) {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const currentConfig = useBladeStore((s) => s.config);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [color, setColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [vibe, setVibe] = useState<VibeOption | null>(null);

  const reset = useCallback(() => {
    setStep(1);
    setArchetype(null);
    setColor(null);
    setVibe(null);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const apply = useCallback(() => {
    if (!archetype || !color || !vibe) return;
    const archetypeOpt = ARCHETYPES.find((a) => a.id === archetype);
    if (!archetypeOpt) return;

    const clashColor = isHotColor(color)
      ? { r: 255, g: 255, b: 255 }
      : { r: 255, g: 200, b: 80 };

    const next: BladeConfig = {
      ...currentConfig,
      name: 'Wizard Saber',
      baseColor: color,
      clashColor,
      lockupColor: { r: 255, g: 200, b: 80 },
      blastColor: { r: 255, g: 255, b: 255 },
      style: archetype === 'exotic' && vibe.id === 'classic' ? 'rotoscope' : archetypeOpt.defaultStyle,
      ignition: vibe.ignition,
      retraction: vibe.retraction,
      ignitionMs: vibe.ignitionMs,
      retractionMs: vibe.retractionMs,
      shimmer: vibe.shimmer,
    };
    loadPreset(next);
    playUISound('success');
    close();
  }, [archetype, color, vibe, currentConfig, loadPreset, close]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saber-wizard-title"
      className="fixed inset-0 z-[50] flex items-center justify-center p-4"
      style={{ background: 'rgba(var(--bg-deep), 0.85)' }}
    >
      <div className="w-full max-w-2xl bg-bg-surface border border-border-light rounded-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div>
            <h2 id="saber-wizard-title" className="text-ui-base font-semibold text-text-primary">
              Saber Wizard
            </h2>
            <p className="text-ui-xs text-text-muted">
              Step {step} of 3 · {step === 1 ? 'Archetype' : step === 2 ? 'Colour' : 'Vibe'}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close wizard"
            className="touch-target text-text-muted hover:text-text-primary px-2 py-1"
          >
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-4 pt-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full"
              style={{
                background:
                  s <= step
                    ? 'rgb(var(--accent))'
                    : 'rgb(var(--border-subtle, 255 255 255 / 0.15))',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-4 min-h-[280px]">
          {step === 1 && (
            <Step1Archetype
              selected={archetype}
              onSelect={(id) => {
                setArchetype(id);
                const archetypeOpt = ARCHETYPES.find((a) => a.id === id);
                if (archetypeOpt) setColor(archetypeOpt.defaultColor);
                setStep(2);
                playUISound('button-click');
              }}
            />
          )}

          {step === 2 && archetype && (
            <Step2Color
              archetype={archetype}
              selected={color}
              onSelect={(c) => {
                setColor(c);
                setStep(3);
                playUISound('button-click');
              }}
            />
          )}

          {step === 3 && (
            <Step3Vibe
              selected={vibe}
              onSelect={(v) => {
                setVibe(v);
                playUISound('button-click');
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <button
            onClick={() => {
              if (step === 1) {
                close();
              } else {
                setStep((s) => (s === 3 ? 2 : 1));
              }
            }}
            className="touch-target px-3 py-1 text-ui-sm text-text-muted hover:text-text-primary"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          <button
            onClick={apply}
            disabled={!archetype || !color || !vibe}
            className="touch-target px-4 py-1 rounded text-ui-sm font-medium bg-accent text-bg-deep disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create saber
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step components ─────────────────────────────────────────────────

function Step1Archetype({
  selected,
  onSelect,
}: {
  selected: Archetype | null;
  onSelect: (id: Archetype) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-ui-sm text-text-muted mb-3">
        Pick the identity of your saber. This sets sensible defaults for colour
        and style — you can fine-tune everything afterward.
      </p>
      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-2">
        {ARCHETYPES.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={`text-left p-3 rounded-panel border transition-colors ${
              selected === a.id
                ? 'bg-accent-dim border-accent text-accent'
                : 'bg-bg-deep border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-white/10 shrink-0"
                style={{
                  backgroundColor: `rgb(${a.defaultColor.r}, ${a.defaultColor.g}, ${a.defaultColor.b})`,
                }}
              />
              <span className="text-ui-base font-semibold">{a.label}</span>
            </div>
            <p className="text-ui-xs text-text-muted mt-1">{a.tagline}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2Color({
  archetype,
  selected,
  onSelect,
}: {
  archetype: Archetype;
  selected: { r: number; g: number; b: number } | null;
  onSelect: (c: { r: number; g: number; b: number }) => void;
}) {
  const swatches = COLOR_SWATCHES[archetype];
  return (
    <div className="space-y-2">
      <p className="text-ui-sm text-text-muted mb-3">
        Pick a crystal colour. These are canon shades — you can tune them later
        in the Colour panel.
      </p>
      <div className="grid grid-cols-2 tablet:grid-cols-3 gap-2">
        {swatches.map((s) => {
          const isSelected =
            selected &&
            selected.r === s.color.r &&
            selected.g === s.color.g &&
            selected.b === s.color.b;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.color)}
              className={`flex items-center gap-2 p-2 rounded-panel border transition-colors ${
                isSelected
                  ? 'bg-accent-dim border-accent'
                  : 'bg-bg-deep border-border-subtle hover:border-border-light'
              }`}
            >
              <div
                className="w-8 h-8 rounded-full shrink-0 border border-white/10"
                style={{
                  backgroundColor: `rgb(${s.color.r}, ${s.color.g}, ${s.color.b})`,
                  boxShadow: `0 0 12px rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0.45)`,
                }}
              />
              <span
                className={`text-ui-sm text-left ${
                  isSelected ? 'text-accent font-medium' : 'text-text-secondary'
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step3Vibe({
  selected,
  onSelect,
}: {
  selected: VibeOption | null;
  onSelect: (v: VibeOption) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-ui-sm text-text-muted mb-3">
        Pick a vibe. This applies ignition style, timing, and shimmer — the
        feel of the saber.
      </p>
      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-2">
        {VIBES.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v)}
            className={`text-left p-3 rounded-panel border transition-colors ${
              selected?.id === v.id
                ? 'bg-accent-dim border-accent text-accent'
                : 'bg-bg-deep border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
            }`}
          >
            <div className="text-ui-base font-semibold">{v.label}</div>
            <p className="text-ui-xs text-text-muted mt-1">{v.desc}</p>
            <p className="text-ui-xs text-text-muted mt-2 font-mono">
              {v.ignition} · {v.ignitionMs}ms · shimmer {Math.round(v.shimmer * 100)}%
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isHotColor(c: { r: number; g: number; b: number }): boolean {
  // "Hot" colours (red/orange) pair better with white clash.
  return c.r > 180 && c.g < 100;
}
