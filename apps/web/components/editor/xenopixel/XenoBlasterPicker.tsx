'use client';

import { XENO_BLASTER_EFFECTS } from '@kyberstation/boards';

export interface XenoBlasterPickerProps {
  selectedBlaster: number;
  onSelectBlaster: (id: number) => void;
}

function getBlasterDescription(id: number): string {
  switch (id) {
    case 0: return 'Standard blaster deflection flash';
    case 1: return 'Rapid multi-point blaster sparks';
    case 2: return 'Wide blaster impact burst';
    default: return '';
  }
}

export function XenoBlasterPicker({ selectedBlaster, onSelectBlaster }: XenoBlasterPickerProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">
        Blaster Effect
      </h3>
      <p className="text-xs text-[rgb(var(--text-muted))]">
        Controls the visual effect when a blaster deflection is triggered.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {XENO_BLASTER_EFFECTS.map((effect) => {
          const isSelected = selectedBlaster === effect.id;
          return (
            <button
              key={effect.id}
              type="button"
              onClick={() => onSelectBlaster(effect.id)}
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
                {getBlasterDescription(effect.id)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
