'use client';
import { useBladeStore } from '@/stores/bladeStore';

const EFFECT_GROUPS = [
  [
    { type: 'clash', label: 'Clash', key: 'C' },
    { type: 'blast', label: 'Blast', key: 'B' },
    { type: 'stab', label: 'Stab', key: 'S' },
  ],
  [
    { type: 'lockup', label: 'Lockup', key: 'L' },
    { type: 'lightning', label: 'Ltng', key: 'N' },
  ],
  [
    { type: 'drag', label: 'Drag', key: 'D' },
    { type: 'melt', label: 'Melt', key: 'M' },
    { type: 'force', label: 'Force', key: 'F' },
  ],
];

interface EffectTriggerBarProps {
  onTrigger: (type: string) => void;
  vertical?: boolean;
  compact?: boolean;
}

export function EffectTriggerBar({ onTrigger, vertical, compact }: EffectTriggerBarProps) {
  const isOn = useBladeStore((s) => s.isOn);

  // Compact horizontal: slim single-row bar for the canvas strip header
  if (compact) {
    return (
      <div className="flex items-center gap-0.5 px-1">
        {EFFECT_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && (
              <span className="w-px h-4 bg-border-light mx-0.5" />
            )}
            {group.map((effect) => (
              <button
                key={effect.type}
                onClick={() => onTrigger(effect.type)}
                disabled={!isOn}
                aria-label={`Trigger ${effect.label} effect (${effect.key})`}
                className={`px-1.5 py-0.5 rounded text-ui-xs font-medium transition-all border ${
                  isOn
                    ? 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-border hover:bg-accent-dim active:scale-95'
                    : 'bg-bg-deep border-border-subtle text-text-muted cursor-not-allowed opacity-50'
                }`}
                title={`${effect.label} (${effect.key})`}
              >
                {effect.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-0.5 py-2 px-0.5">
        {EFFECT_GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col items-center gap-0.5">
            {gi > 0 && (
              <span className="h-px w-6 bg-border-light my-0.5" />
            )}
            {group.map((effect) => (
              <button
                key={effect.type}
                onClick={() => onTrigger(effect.type)}
                disabled={!isOn}
                aria-label={`Trigger ${effect.label} effect (${effect.key})`}
                className={`w-9 h-9 rounded text-ui-xs font-bold transition-all border flex items-center justify-center ${
                  isOn
                    ? 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-border hover:bg-accent-dim active:scale-95'
                    : 'bg-bg-deep border-border-subtle text-text-muted cursor-not-allowed opacity-50'
                }`}
                title={`${effect.label} (${effect.key})`}
              >
                {effect.key}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EFFECT_GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1">
          {gi > 0 && (
            <span className="w-px h-6 bg-border-light mx-1" />
          )}
          {group.map((effect) => (
            <button
              key={effect.type}
              onClick={() => onTrigger(effect.type)}
              disabled={!isOn}
              aria-label={`Trigger ${effect.label} effect (${effect.key})`}
              className={`px-4 py-2.5 rounded text-ui-xs font-medium transition-all border ${
                isOn
                  ? 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-border hover:bg-accent-dim active:scale-95'
                  : 'bg-bg-deep border-border-subtle text-text-muted cursor-not-allowed opacity-50'
              }`}
              style={{ transition: 'transform 0.1s ease, color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease' }}
              title={`${effect.label} (${effect.key})`}
            >
              <span className="block leading-tight">{effect.label}</span>
              <span className="block text-ui-xs text-text-muted mt-0.5">{effect.key}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
