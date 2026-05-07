'use client';

import { XENO_IGNITION_STYLES } from '@kyberstation/boards';

export interface XenoIgnitionPickerProps {
  selectedIgnition: number;
  onSelectIgnition: (id: number) => void;
}

export function XenoIgnitionPicker({ selectedIgnition, onSelectIgnition }: XenoIgnitionPickerProps) {
  const bladeModes = XENO_IGNITION_STYLES.filter((s) => !s.category);
  const specialPreons = XENO_IGNITION_STYLES.filter((s) => s.category === 'special-preon');

  return (
    <div className="space-y-4">
      {/* Blade Modes (IDs 0-4) */}
      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[rgb(var(--text-muted))]">
          Blade Modes
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {bladeModes.map((style) => (
            <IgnitionCard
              key={style.id}
              id={style.id}
              name={style.name}
              isSelected={selectedIgnition === style.id}
              onSelect={onSelectIgnition}
            />
          ))}
        </div>
      </div>

      {/* Special Preon Ignitions (IDs 5-11) */}
      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[rgb(var(--text-muted))]">
          Special Preon Ignitions
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {specialPreons.map((style) => (
            <IgnitionCard
              key={style.id}
              id={style.id}
              name={style.name}
              isSelected={selectedIgnition === style.id}
              onSelect={onSelectIgnition}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Internal card subcomponent ─────────────────────────────────────

interface IgnitionCardProps {
  id: number;
  name: string;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

function IgnitionCard({ id, name, isSelected, onSelect }: IgnitionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={isSelected}
      className={[
        'rounded-lg border p-3 text-left transition-colors',
        isSelected
          ? 'border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/10'
          : 'border-[var(--border-subtle)] hover:border-[rgb(var(--color-accent))]/50',
      ].join(' ')}
    >
      <div className="text-xs font-mono text-[rgb(var(--text-muted))]">
        #{id}
      </div>
      <div className="text-sm font-medium text-[rgb(var(--text-primary))]">
        {name}
      </div>
    </button>
  );
}
