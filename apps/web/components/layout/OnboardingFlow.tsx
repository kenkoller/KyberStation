'use client';

import { useState, useCallback } from 'react';
import {
  type PerformanceTier,
  detectCapabilities,
  recommendTier,
  setPerformanceTier,
  applyPerformanceTier,
} from '../../lib/performanceTier';
import {
  type AurebeshMode,
  setAurebeshMode,
  applyAurebeshMode,
} from '../../lib/aurebesh';
import {
  type UISoundPreset,
  getUISoundEngine,
} from '../../lib/uiSounds';

const ONBOARDING_KEY = 'kyberstation-onboarding-complete';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'performance' | 'sound' | 'aurebesh' | 'done';

/**
 * First-use onboarding flow.
 *
 * Presents 3 setup screens for:
 *   1. Performance tier (auto-detected, user can override)
 *   2. Sound preference (Silent / Subtle / Full Immersion)
 *   3. Aurebesh mode (Off / Labels / Full)
 *
 * Persists choices and marks onboarding as complete so it
 * doesn't show again. Can be re-triggered from settings.
 */
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedTier, setSelectedTier] = useState<PerformanceTier>(() => {
    if (typeof window === 'undefined') return 'medium';
    const caps = detectCapabilities();
    return recommendTier(caps);
  });
  const [selectedSound, setSelectedSound] = useState<UISoundPreset>('silent');
  const [selectedAurebesh, setSelectedAurebesh] = useState<AurebeshMode>('off');

  const finish = useCallback(() => {
    // Apply all choices
    setPerformanceTier(selectedTier);
    applyPerformanceTier(selectedTier);

    setAurebeshMode(selectedAurebesh);
    applyAurebeshMode(selectedAurebesh);

    getUISoundEngine().setPreset(selectedSound);

    // Mark onboarding complete
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  }, [selectedTier, selectedSound, selectedAurebesh, onComplete]);

  const next = useCallback(() => {
    const steps: Step[] = ['welcome', 'performance', 'sound', 'aurebesh', 'done'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      const nextStep = steps[idx + 1];
      if (nextStep === 'done') {
        finish();
      } else {
        setStep(nextStep);
      }
    }
  }, [step, finish]);

  const skip = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: 'rgba(var(--bg-deep), 0.95)' }}
    >
      <div
        className="relative w-full max-w-md mx-4 corner-rounded"
        style={{
          background: 'rgb(var(--bg-secondary))',
          border: '1px solid var(--border-light)',
          padding: '32px',
        }}
      >
        {/* Skip button */}
        <button
          onClick={skip}
          className="absolute top-3 right-4 text-ui-xs btn-hum"
          style={{
            color: 'rgb(var(--text-muted))',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Skip setup
        </button>

        {/* Step content */}
        {step === 'welcome' && (
          <WelcomeStep onNext={next} />
        )}
        {step === 'performance' && (
          <PerformanceStep
            selected={selectedTier}
            onSelect={setSelectedTier}
            onNext={next}
          />
        )}
        {step === 'sound' && (
          <SoundStep
            selected={selectedSound}
            onSelect={setSelectedSound}
            onNext={next}
          />
        )}
        {step === 'aurebesh' && (
          <AurebeshStep
            selected={selectedAurebesh}
            onSelect={setSelectedAurebesh}
            onNext={next}
          />
        )}

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {(['welcome', 'performance', 'sound', 'aurebesh'] as Step[]).map((s) => (
            <div
              key={s}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background:
                  s === step
                    ? 'rgb(var(--accent))'
                    : 'var(--border-light)',
                transition: 'background 200ms ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step Components ───

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <h2
        className="font-cinematic text-ui-xl mb-2"
        style={{ color: 'rgb(var(--text-primary))', letterSpacing: '0.2em' }}
      >
        WELCOME
      </h2>
      <p className="text-ui-sm mb-6" style={{ color: 'rgb(var(--text-secondary))' }}>
        Let&apos;s configure your experience. These settings can be changed
        anytime in the settings panel.
      </p>
      <button
        onClick={onNext}
        className="btn-hum corner-rounded"
        style={{
          background: 'rgb(var(--accent))',
          color: 'rgb(var(--bg-deep))',
          border: 'none',
          padding: '10px 32px',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 'calc(11px * var(--font-scale))',
          fontWeight: 600,
          letterSpacing: '0.1em',
        }}
      >
        GET STARTED
      </button>
    </div>
  );
}

function PerformanceStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: PerformanceTier;
  onSelect: (tier: PerformanceTier) => void;
  onNext: () => void;
}) {
  const tiers: { id: PerformanceTier; label: string; desc: string }[] = [
    {
      id: 'full',
      label: 'FULL',
      desc: 'All animations, particles, backdrop effects, and ambient HUD elements.',
    },
    {
      id: 'medium',
      label: 'MEDIUM',
      desc: 'Reduced animations, simpler particles, no backdrop blur. Good balance.',
    },
    {
      id: 'lite',
      label: 'LITE',
      desc: 'No ambient animations. Instant transitions. Maximum performance.',
    },
  ];

  return (
    <div>
      <h2
        className="font-cinematic text-ui-lg mb-1 text-center"
        style={{ color: 'rgb(var(--text-primary))', letterSpacing: '0.15em' }}
      >
        VISUAL QUALITY
      </h2>
      <p className="text-ui-xs mb-4 text-center" style={{ color: 'rgb(var(--text-muted))' }}>
        Auto-detected based on your device. Override anytime.
      </p>

      <div className="flex flex-col gap-2 mb-5">
        {tiers.map((tier) => (
          <OptionCard
            key={tier.id}
            label={tier.label}
            description={tier.desc}
            isSelected={selected === tier.id}
            onClick={() => onSelect(tier.id)}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <NextButton onClick={onNext} />
      </div>
    </div>
  );
}

function SoundStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: UISoundPreset;
  onSelect: (preset: UISoundPreset) => void;
  onNext: () => void;
}) {
  const presets: { id: UISoundPreset; label: string; desc: string }[] = [
    {
      id: 'silent',
      label: 'SILENT',
      desc: 'No UI sounds. The blade sound preview is unaffected.',
    },
    {
      id: 'subtle',
      label: 'SUBTLE',
      desc: 'Navigation and interaction beeps at low volume. No ambient sounds.',
    },
    {
      id: 'full',
      label: 'FULL IMMERSION',
      desc: 'All UI sounds including ambient bridge chatter. Full cockpit experience.',
    },
  ];

  const handleSelect = (preset: UISoundPreset) => {
    onSelect(preset);
    // Play a preview sound so the user hears the difference
    if (preset !== 'silent') {
      const engine = getUISoundEngine();
      engine.setPreset(preset);
      engine.play('button-click');
    }
  };

  return (
    <div>
      <h2
        className="font-cinematic text-ui-lg mb-1 text-center"
        style={{ color: 'rgb(var(--text-primary))', letterSpacing: '0.15em' }}
      >
        COCKPIT SOUNDS
      </h2>
      <p className="text-ui-xs mb-4 text-center" style={{ color: 'rgb(var(--text-muted))' }}>
        Enable Star Wars-style console beeps for UI interactions.
      </p>

      <div className="flex flex-col gap-2 mb-5">
        {presets.map((preset) => (
          <OptionCard
            key={preset.id}
            label={preset.label}
            description={preset.desc}
            isSelected={selected === preset.id}
            onClick={() => handleSelect(preset.id)}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <NextButton onClick={onNext} />
      </div>
    </div>
  );
}

function AurebeshStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: AurebeshMode;
  onSelect: (mode: AurebeshMode) => void;
  onNext: () => void;
}) {
  const modes: { id: AurebeshMode; label: string; desc: string }[] = [
    {
      id: 'off',
      label: 'STANDARD',
      desc: 'All text in regular fonts. Recommended for new users.',
    },
    {
      id: 'labels',
      label: 'AUREBESH LABELS',
      desc: 'Panel titles and navigation in Aurebesh. Values stay readable.',
    },
    {
      id: 'full',
      label: 'FULL AUREBESH',
      desc: 'Everything renders in Aurebesh. For those who can read it.',
    },
  ];

  const handleSelect = (mode: AurebeshMode) => {
    onSelect(mode);
    // Live preview the Aurebesh mode
    applyAurebeshMode(mode);
  };

  return (
    <div>
      <h2
        className="font-cinematic text-ui-lg mb-1 text-center"
        style={{ color: 'rgb(var(--text-primary))', letterSpacing: '0.15em' }}
      >
        TYPOGRAPHY
      </h2>
      <p className="text-ui-xs mb-4 text-center" style={{ color: 'rgb(var(--text-muted))' }}>
        Render UI text in the Star Wars Aurebesh alphabet.
      </p>

      <div className="flex flex-col gap-2 mb-5">
        {modes.map((mode) => (
          <OptionCard
            key={mode.id}
            label={mode.label}
            description={mode.desc}
            isSelected={selected === mode.id}
            onClick={() => handleSelect(mode.id)}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <NextButton onClick={onNext} label="FINISH" />
      </div>
    </div>
  );
}

// ─── Shared UI ───

function OptionCard({
  label,
  description,
  isSelected,
  onClick,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left corner-rounded btn-hum no-aurebesh"
      style={{
        padding: '10px 14px',
        background: isSelected
          ? 'var(--accent-dim)'
          : 'rgb(var(--bg-surface))',
        border: isSelected
          ? '1px solid rgb(var(--accent) / 0.4)'
          : '1px solid var(--border-subtle)',
        cursor: 'pointer',
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      <div
        className="text-ui-sm font-mono"
        style={{
          color: isSelected
            ? 'rgb(var(--accent))'
            : 'rgb(var(--text-primary))',
          fontWeight: 600,
          letterSpacing: '0.1em',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        className="text-ui-xs"
        style={{ color: 'rgb(var(--text-muted))' }}
      >
        {description}
      </div>
    </button>
  );
}

function NextButton({
  onClick,
  label = 'NEXT',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-hum corner-rounded"
      style={{
        background: 'rgb(var(--accent))',
        color: 'rgb(var(--bg-deep))',
        border: 'none',
        padding: '8px 24px',
        cursor: 'pointer',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 'calc(10px * var(--font-scale))',
        fontWeight: 600,
        letterSpacing: '0.1em',
      }}
    >
      {label}
    </button>
  );
}

// ─── Utility ───

/**
 * Check if onboarding has been completed.
 */
export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

/**
 * Reset onboarding so it shows again on next load.
 */
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}
