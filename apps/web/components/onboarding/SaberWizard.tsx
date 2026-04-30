'use client';

// ─── Saber Wizard ───
//
// A guided 4-step flow for new users: hardware → archetype → colour → vibe.
// Combines into a fully-formed BladeConfig and loads it into the store.
// Uses existing presets and theme tokens — zero new visual primitives.

import { useState, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { playUISound } from '@/lib/uiSounds';
import { useModalDialog } from '@/hooks/useModalDialog';
import { inferBladeInches } from '@/lib/bladeRenderMetrics';
import {
  BLADE_LENGTHS as CANONICAL_BLADE_LENGTHS,
  type BladeLengthOption as CanonicalBladeLengthOption,
} from '@/lib/bladeLengths';
import { StatusSignal, type StatusVariant } from '@/components/shared/StatusSignal';
import type { BladeConfig } from '@kyberstation/engine';

interface SaberWizardProps {
  open: boolean;
  onClose: () => void;
}

// ─── Step 1: Hardware (blade length + board) ─────────────────────────

export interface BladeLengthOption {
  inches: number;
  ledCount: number;
  label: string;
}

// Derived from `lib/bladeLengths.ts` (which sources `BLADE_LENGTH_PRESETS`
// from the engine package — the single canonical source of truth).
// Re-exported as a mutable array shape for back-compat with the existing
// `saberWizardOptions.test.ts` import + the wizard's local find/index calls.
export const BLADE_LENGTHS: BladeLengthOption[] = CANONICAL_BLADE_LENGTHS.map(
  (b: CanonicalBladeLengthOption): BladeLengthOption => ({
    inches: b.inches,
    ledCount: b.ledCount,
    label: b.label,
  }),
);

export type BoardId = 'proffie-v3' | 'proffie-v2' | 'cfx' | 'gh-v4' | 'gh-v3';

/**
 * Hardware-compatibility tier for the wizard's board picker.
 *
 *   verified  — hardware-validated end-to-end (flash + boot + audio).
 *               Proffie V3 only as of 2026-04-22 (89sabers V3.9, macOS+Brave).
 *   untested  — KyberStation generates correct ProffieOS code for this board
 *               but real-hardware flash hasn't been confirmed yet. Community
 *               testing welcome.
 *   reference — board lives in a different firmware ecosystem entirely
 *               (CFX / GH / Xeno etc.); the editor + visualizer work but
 *               flash output won't run. Picked for documentation parity,
 *               not for export.
 */
export type BoardCompatibility = 'verified' | 'untested' | 'reference';

export interface BoardOption {
  id: BoardId;
  label: string;
  // Persisted on SaberProfile.boardType. CodeOutput.tsx maps these strings
  // back to proffieboard_v{2,3} when generating config.h headers.
  storeValue: string;
  compatibility: BoardCompatibility;
  tagline: string;
}

export const BOARDS: BoardOption[] = [
  {
    id: 'proffie-v3',
    label: 'Proffie V3',
    storeValue: 'Proffie V3',
    compatibility: 'verified',
    tagline: 'Recommended. Hardware-validated flash + editor.',
  },
  {
    id: 'proffie-v2',
    label: 'Proffie V2',
    storeValue: 'Proffie V2',
    compatibility: 'untested',
    tagline: 'Code path ready, awaiting community hardware testing.',
  },
  {
    id: 'cfx',
    label: 'CFX',
    storeValue: 'CFX',
    compatibility: 'reference',
    tagline: 'Editor + reference only — flash needs Proffie.',
  },
  {
    id: 'gh-v4',
    label: 'GH V4',
    storeValue: 'GH V4',
    compatibility: 'reference',
    tagline: 'Editor + reference only — flash needs Proffie.',
  },
  {
    id: 'gh-v3',
    label: 'GH V3',
    storeValue: 'GH V3',
    compatibility: 'reference',
    tagline: 'Editor + reference only — flash needs Proffie.',
  },
];

/** Per-tier visual + a11y metadata for the board chip. */
const COMPAT_META: Record<
  BoardCompatibility,
  { variant: StatusVariant; label: string; description: string }
> = {
  verified: {
    variant: 'success',
    label: 'VERIFIED',
    description: 'Hardware-validated — known working',
  },
  untested: {
    variant: 'warning',
    label: 'UNTESTED',
    description: 'Code ready, hardware testing pending',
  },
  reference: {
    variant: 'error',
    label: 'REFERENCE',
    description: 'Editor + reference only — flash unsupported',
  },
};

// ─── Step 2: Archetype ───────────────────────────────────────────────

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

// ─── Step 3: Colour swatches (per archetype) ─────────────────────────

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

// ─── Step 4: Vibe presets (apply effect parameters) ──────────────────

export interface VibeOption {
  id: string;
  label: string;
  desc: string;
  shimmer: number;
  ignitionMs: number;
  retractionMs: number;
  ignition: string;
  retraction: string;
}

export const VIBES: VibeOption[] = [
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
  const profiles = useSaberProfileStore((s) => s.profiles);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const updateProfileFn = useSaberProfileStore((s) => s.updateProfile);
  const createProfileFn = useSaberProfileStore((s) => s.createProfile);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  // Pre-select hardware defaults from current config + active profile so
  // a user with existing setup sees their values reflected, and a fresh
  // user sees sensible canon defaults (144 LEDs / 36" / Proffie V3).
  const initialBladeLength = (() => {
    const ledCount = currentConfig.ledCount ?? 144;
    const exact = BLADE_LENGTHS.find((b) => b.ledCount === ledCount);
    if (exact) return exact;
    const inches = inferBladeInches(ledCount);
    return BLADE_LENGTHS.find((b) => b.inches === inches) ?? BLADE_LENGTHS[4];
  })();
  const initialBoardId: BoardId = (() => {
    const stored = activeProfile?.boardType;
    if (stored) {
      const match = BOARDS.find((b) => b.storeValue === stored);
      if (match) return match.id;
    }
    return 'proffie-v3';
  })();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [bladeLength, setBladeLength] = useState<BladeLengthOption>(initialBladeLength);
  const [boardId, setBoardId] = useState<BoardId>(initialBoardId);
  // Tracks whether the user explicitly Continued past the hardware step.
  // Skip leaves this false so apply() won't write ledCount or boardType.
  const [applyHardware, setApplyHardware] = useState(false);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [color, setColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [vibe, setVibe] = useState<VibeOption | null>(null);

  const reset = useCallback(() => {
    setStep(1);
    setBladeLength(initialBladeLength);
    setBoardId(initialBoardId);
    setApplyHardware(false);
    setArchetype(null);
    setColor(null);
    setVibe(null);
  }, [initialBladeLength, initialBoardId]);

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
      ...(applyHardware ? { ledCount: bladeLength.ledCount } : {}),
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

    if (applyHardware) {
      const board = BOARDS.find((b) => b.id === boardId);
      if (board) {
        if (activeProfile) {
          updateProfileFn(activeProfile.id, { boardType: board.storeValue });
        } else {
          createProfileFn('My Saber', '', board.storeValue);
        }
      }
    }

    playUISound('success');
    close();
  }, [
    archetype,
    color,
    vibe,
    currentConfig,
    loadPreset,
    close,
    applyHardware,
    bladeLength,
    boardId,
    activeProfile,
    updateProfileFn,
    createProfileFn,
  ]);

  // Modal a11y: ESC-to-close, focus trap, initial + restore focus.
  // Hook is always called (rules-of-hooks); it no-ops when `open` is false.
  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen: open,
    onClose: close,
  });

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="saber-wizard-title"
      aria-describedby="saber-wizard-step-label"
      className="fixed inset-0 z-[50] flex items-center justify-center p-4"
      style={{ background: 'rgba(var(--bg-deep), 0.85)' }}
    >
      <div className="w-full max-w-2xl bg-bg-surface border border-border-light rounded-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div>
            <h2 id="saber-wizard-title" className="text-ui-base font-semibold text-text-primary">
              The Gathering
            </h2>
            <p id="saber-wizard-step-label" className="text-ui-xs text-text-muted">
              Step {step} of 4 ·{' '}
              {step === 1
                ? 'Hardware'
                : step === 2
                ? 'Archetype'
                : step === 3
                ? 'Colour'
                : 'Vibe'}
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
          {[1, 2, 3, 4].map((s) => (
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
            <Step1Hardware
              bladeLength={bladeLength}
              boardId={boardId}
              onBladeLength={setBladeLength}
              onBoard={setBoardId}
            />
          )}

          {step === 2 && (
            <Step2Archetype
              selected={archetype}
              onSelect={(id) => {
                setArchetype(id);
                const archetypeOpt = ARCHETYPES.find((a) => a.id === id);
                if (archetypeOpt) setColor(archetypeOpt.defaultColor);
                setStep(3);
                playUISound('button-click');
              }}
            />
          )}

          {step === 3 && archetype && (
            <Step3Color
              archetype={archetype}
              selected={color}
              onSelect={(c) => {
                setColor(c);
                setStep(4);
                playUISound('button-click');
              }}
            />
          )}

          {step === 4 && (
            <Step4Vibe
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
                // Skip hardware setup — applyHardware stays false so apply()
                // won't touch ledCount or boardType. User can revisit later.
                setStep(2);
                playUISound('button-click');
              } else {
                setStep((s) => (s === 4 ? 3 : s === 3 ? 2 : 1) as 1 | 2 | 3 | 4);
              }
            }}
            className="touch-target px-3 py-1 text-ui-sm text-text-muted hover:text-text-primary"
          >
            {step === 1 ? 'Skip for now' : '← Back'}
          </button>
          {step === 1 ? (
            <button
              onClick={() => {
                setApplyHardware(true);
                setStep(2);
                playUISound('button-click');
              }}
              className="touch-target px-4 py-1 rounded text-ui-sm font-medium bg-accent text-bg-deep"
            >
              Continue →
            </button>
          ) : step === 4 ? (
            <button
              onClick={apply}
              disabled={!archetype || !color || !vibe}
              className="touch-target px-4 py-1 rounded text-ui-sm font-medium bg-accent text-bg-deep disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create saber
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step components ─────────────────────────────────────────────────

function Step1Hardware({
  bladeLength,
  boardId,
  onBladeLength,
  onBoard,
}: {
  bladeLength: BladeLengthOption;
  boardId: BoardId;
  onBladeLength: (b: BladeLengthOption) => void;
  onBoard: (id: BoardId) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-ui-sm text-text-muted">
        Tell us about your saber so the editor matches your hardware. Already
        set up? Pick &ldquo;Skip for now&rdquo; — you can change this later in
        Profile + Code panels.
      </p>

      {/* Blade length */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-ui-sm font-semibold text-text-primary">Blade length</h3>
          <span className="text-ui-xs text-text-muted font-mono">
            {bladeLength.ledCount} LEDs
          </span>
        </div>
        <div className="grid grid-cols-3 tablet:grid-cols-6 gap-2">
          {BLADE_LENGTHS.map((b) => {
            const isSelected = b.inches === bladeLength.inches;
            return (
              <button
                key={b.inches}
                onClick={() => onBladeLength(b)}
                aria-pressed={isSelected}
                aria-label={`${b.label} blade — ${b.ledCount} LEDs`}
                {...(isSelected ? { 'data-autofocus': true } : {})}
                className={`touch-target px-2 py-2 rounded-panel border text-ui-sm font-mono transition-colors ${
                  isSelected
                    ? 'bg-accent-dim border-accent text-accent'
                    : 'bg-bg-deep border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
                }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Board */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-ui-sm font-semibold text-text-primary">Board</h3>
          <div className="flex items-center gap-3 text-ui-xs">
            <StatusSignal variant="success" label="Verified — hardware-validated" compact />
            <StatusSignal variant="warning" label="Untested — community testing pending" compact />
            <StatusSignal variant="error" label="Reference only — flash unsupported" compact />
          </div>
        </div>
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-2">
          {BOARDS.map((b) => {
            const isSelected = b.id === boardId;
            const meta = COMPAT_META[b.compatibility];
            return (
              <button
                key={b.id}
                onClick={() => onBoard(b.id)}
                aria-pressed={isSelected}
                className={`text-left p-2 rounded-panel border transition-colors ${
                  isSelected
                    ? 'bg-accent-dim border-accent text-accent'
                    : 'bg-bg-deep border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ui-base font-semibold">{b.label}</span>
                  <StatusSignal variant={meta.variant} label={meta.description}>
                    {meta.label}
                  </StatusSignal>
                </div>
                <p className="text-ui-xs text-text-muted mt-0.5">{b.tagline}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step2Archetype({
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
        {ARCHETYPES.map((a, idx) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            // Initial-focus target for keyboard users when the wizard
            // opens. Picked up by `useModalDialog` via [data-autofocus].
            {...(idx === 0 && selected === null ? { 'data-autofocus': true } : {})}
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

function Step3Color({
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
              aria-pressed={!!isSelected}
              aria-label={`${s.label} — rgb(${s.color.r}, ${s.color.g}, ${s.color.b})`}
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

function Step4Vibe({
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
            aria-pressed={selected?.id === v.id}
            aria-label={`${v.label} — ${v.desc}`}
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
