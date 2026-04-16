'use client';

import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { usePresetListStore } from '@/stores/presetListStore';

const WORKFLOW_STEPS = [
  {
    number: 1,
    title: 'Build Your Preset List',
    description:
      'Use the Saber Profiles panel to create a profile and add presets to your card config.',
    checkKey: 'presets' as const,
  },
  {
    number: 2,
    title: 'Review Storage Budget',
    description:
      'Check that your presets fit within the board\'s flash memory and SD card capacity.',
    checkKey: 'storage' as const,
  },
  {
    number: 3,
    title: 'Generate Config',
    description:
      'Preview the generated ProffieOS C++ code. KyberStation handles all the code for you.',
    checkKey: 'config' as const,
  },
  {
    number: 4,
    title: 'Export to SD Card',
    description:
      'Download the ZIP with config.h and font directories, then extract to your SD card.',
    checkKey: 'export' as const,
  },
  {
    number: 5,
    title: 'Flash Your Board',
    description:
      '(Advanced) Compile and upload firmware via USB using Arduino IDE with ProffieOS.',
    checkKey: 'flash' as const,
  },
] as const;

type CheckKey = (typeof WORKFLOW_STEPS)[number]['checkKey'];

export function OutputWorkflowGuide() {
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const profiles = useSaberProfileStore((s) => s.profiles);
  const presetListEntries = usePresetListStore((s) => s.entries);

  // Determine which steps have been completed (best-effort checks)
  const completedSteps = new Set<CheckKey>();

  // Step 1: presets — has at least one preset in a card config or preset list
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const activeCardConfig = activeProfile
    ? activeProfile.cardConfigs.find(
        (c) => c.id === activeProfile.activeCardConfigId,
      ) ?? activeProfile.cardConfigs[0]
    : null;
  const cardEntryCount = activeCardConfig?.entries.length ?? 0;
  const hasPresets = cardEntryCount > 0 || presetListEntries.length > 0;
  if (hasPresets) completedSteps.add('presets');

  // Steps 2-5 are manual / not easily auto-detected, so they stay unchecked.
  // Step 3 is always "ready" if presets exist (code is generated live).
  if (hasPresets) completedSteps.add('config');

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-1">
          Output Workflow
        </h3>
        <p className="text-ui-xs text-text-muted leading-relaxed">
          Follow these steps to get your custom blade styles onto a real saber.
          You don&apos;t need to understand C++ &mdash; KyberStation handles the code generation.
        </p>
      </div>

      <div className="space-y-1">
        {WORKFLOW_STEPS.map((step) => {
          const done = completedSteps.has(step.checkKey);
          return (
            <div
              key={step.number}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                done
                  ? 'bg-green-950/20 border-green-800/30'
                  : 'bg-bg-surface border-border-subtle'
              }`}
            >
              {/* Step number badge */}
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-ui-xs font-bold shrink-0 mt-0.5 ${
                  done
                    ? 'bg-green-900/40 text-green-400 border border-green-700/40'
                    : 'bg-bg-deep text-text-muted border border-border-subtle'
                }`}
              >
                {done ? '\u2713' : step.number}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-ui-xs font-semibold ${
                    done ? 'text-green-400' : 'text-text-primary'
                  }`}
                >
                  {step.title}
                </div>
                <p className="text-ui-xs text-text-muted mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!hasPresets && (
        <div className="text-ui-xs text-yellow-400 bg-yellow-900/15 border border-yellow-800/25 rounded-lg px-3 py-2">
          Start by creating a Saber Profile below and adding presets to your card config.
          You can add your current editor design with the &quot;+ Add Current&quot; button.
        </div>
      )}
    </div>
  );
}
