'use client';
import { useState, useCallback } from 'react';

// ─── Hilt Preset Geometry ───

export interface HiltGeometry {
  id: string;
  name: string;
  /** Total hilt length in world units */
  hiltLength: number;
  /** Grip diameter */
  gripDiameter: number;
  /** Emitter diameter (top of hilt) */
  emitterDiameter: number;
  /** Pommel diameter (bottom of hilt) */
  pommelDiameter: number;
  /** Whether the grip has a curved profile */
  curved: boolean;
  /** Guard ring thickness (0 = no guard) */
  guardThickness: number;
  /** Guard ring diameter */
  guardDiameter: number;
  /** Number of grip ridges/ribs */
  gripRidges: number;
}

export const HILT_PRESETS: HiltGeometry[] = [
  {
    id: 'graflex',
    name: 'Graflex',
    hiltLength: 2.8,
    gripDiameter: 0.32,
    emitterDiameter: 0.36,
    pommelDiameter: 0.34,
    curved: false,
    guardThickness: 0.06,
    guardDiameter: 0.44,
    gripRidges: 7,
  },
  {
    id: 'vader',
    name: 'Vader',
    hiltLength: 2.6,
    gripDiameter: 0.30,
    emitterDiameter: 0.40,
    pommelDiameter: 0.28,
    curved: false,
    guardThickness: 0.04,
    guardDiameter: 0.48,
    gripRidges: 0,
  },
  {
    id: 'curved',
    name: 'Curved',
    hiltLength: 3.0,
    gripDiameter: 0.28,
    emitterDiameter: 0.32,
    pommelDiameter: 0.30,
    curved: true,
    guardThickness: 0.05,
    guardDiameter: 0.42,
    gripRidges: 0,
  },
  {
    id: 'staff',
    name: 'Staff',
    hiltLength: 4.0,
    gripDiameter: 0.26,
    emitterDiameter: 0.30,
    pommelDiameter: 0.30,
    curved: false,
    guardThickness: 0.0,
    guardDiameter: 0.0,
    gripRidges: 12,
  },
];

interface HiltSelectorProps {
  selectedId: string;
  onSelect: (hilt: HiltGeometry) => void;
  className?: string;
}

export function HiltSelector({ selectedId, onSelect, className }: HiltSelectorProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`} role="radiogroup" aria-label="Hilt style selector">
      <span className="text-ui-xs text-text-muted uppercase tracking-wider mr-1" id="hilt-selector-label">Hilt</span>
      {HILT_PRESETS.map((hilt) => (
        <button
          key={hilt.id}
          onClick={() => onSelect(hilt)}
          className={`px-2.5 py-1 rounded text-ui-sm font-medium transition-colors border ${
            selectedId === hilt.id
              ? 'bg-accent-dim text-accent border-accent-border'
              : 'text-text-muted hover:text-text-secondary border-border-subtle hover:border-text-muted'
          }`}
          title={hilt.name}
          role="radio"
          aria-checked={selectedId === hilt.id}
          aria-label={`Hilt style: ${hilt.name}`}
        >
          {hilt.name}
        </button>
      ))}
    </div>
  );
}

/** Hook for managing hilt selection state */
export function useHiltSelection() {
  const [selectedHilt, setSelectedHilt] = useState<HiltGeometry>(HILT_PRESETS[0]);

  const selectHilt = useCallback((hilt: HiltGeometry) => {
    setSelectedHilt(hilt);
  }, []);

  return { selectedHilt, selectHilt };
}
