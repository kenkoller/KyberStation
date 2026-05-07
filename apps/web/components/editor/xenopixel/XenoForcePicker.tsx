'use client';

import { XENO_FORCE_EFFECTS } from '@kyberstation/boards';

export interface XenoForcePickerProps {
  selectedForce: number;
  onSelectForce: (id: number) => void;
}

function getForceDescription(id: number): string {
  switch (id) {
    case 0: return 'Smooth Force push/pull light sweep';
    case 1: return 'Intense Force lightning crackle';
    default: return '';
  }
}

export function XenoForcePicker({ selectedForce, onSelectForce }: XenoForcePickerProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">
        Force Effect
      </h3>
      <p className="text-xs text-[rgb(var(--text-muted))]">
        Controls the visual effect when a Force action is triggered.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {XENO_FORCE_EFFECTS.map((effect) => {
          const isSelected = selectedForce === effect.id;
          return (
            <button
              key={effect.id}
              type="button"
              onClick={() => onSelectForce(effect.id)}
              aria-pressed={isSelected}
              className={[
                'rounded-lg border p-3 text-left transition-colors',
                isSelected
                  ? 'border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/10'
                  : 'border-[var(--border-subtle)] hover:border-[rgb(var(--color-accent))]/50',
              ].join(' ')}
            >
              <div className="text-xs font-mono text-[rgb(var(--text-muted))]">
                #{effect.id}
              </div>
              <div className="text-sm font-medium text-[rgb(var(--text-primary))]">
                {effect.name}
              </div>
              <div className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                {getForceDescription(effect.id)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
