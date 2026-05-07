'use client';

import { XENO_BLADE_EFFECTS } from '@kyberstation/boards';

export interface XenoEffectPickerProps {
  selectedEffect: number;
  onSelectEffect: (id: number) => void;
}

/** One-line description for each blade effect ID. */
function getEffectDescription(id: number): string {
  switch (id) {
    case 0: return 'Flickering flame animation';
    case 1: return 'Solid steady color';
    case 2: return 'Random flicker/crackling';
    case 3: return 'Cycling rainbow colors';
    case 4: return 'Multi-color segments';
    case 5: return 'Bright crack/break flashes';
    case 6: return 'Breathing brightness pulse';
    case 7: return 'Fast strobe/flash';
    default: return '';
  }
}

export function XenoEffectPicker({ selectedEffect, onSelectEffect }: XenoEffectPickerProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">
        Blade Effect
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {XENO_BLADE_EFFECTS.map((effect) => {
          const isSelected = selectedEffect === effect.id;
          return (
            <button
              key={effect.id}
              type="button"
              onClick={() => onSelectEffect(effect.id)}
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
                {getEffectDescription(effect.id)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
