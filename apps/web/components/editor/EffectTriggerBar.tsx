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
    { type: 'lightning', label: 'Lightning', key: 'N' },
  ],
  [
    { type: 'drag', label: 'Drag', key: 'D' },
    { type: 'melt', label: 'Melt', key: 'M' },
    { type: 'force', label: 'Force', key: 'F' },
  ],
];

interface EffectTriggerBarProps {
  onTrigger: (type: string) => void;
}

export function EffectTriggerBar({ onTrigger }: EffectTriggerBarProps) {
  const isOn = useBladeStore((s) => s.isOn);

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
              className={`px-4 py-2.5 rounded text-xs font-medium transition-all border ${
                isOn
                  ? 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-border hover:bg-accent-dim active:scale-95'
                  : 'bg-bg-deep border-border-subtle text-text-muted cursor-not-allowed opacity-50'
              }`}
              style={{ transition: 'transform 0.1s ease, color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease' }}
              title={`${effect.label} (${effect.key})`}
            >
              <span className="block leading-tight">{effect.label}</span>
              <span className="block text-[9px] text-text-muted mt-0.5">{effect.key}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
