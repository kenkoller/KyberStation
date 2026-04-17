/**
 * Part catalog — the registry every composer reads from.
 *
 * Keep imports alphabetized within each type group. Stage-2 artist
 * agents add new imports + map entries here without conflicting —
 * each touches disjoint sections.
 */

import type { HiltPart } from './types';

// Emitters
import { graflexEmitter } from './parts/emitters/graflex';

// Switches
import { graflexSwitch } from './parts/switches/graflex';

// Grips
import { tTracksGrip } from './parts/grips/t-tracks';

// Pommels
import { classicPommel } from './parts/pommels/classic';

export const PART_CATALOG: Record<string, HiltPart> = {
  [graflexEmitter.id]: graflexEmitter,
  [graflexSwitch.id]: graflexSwitch,
  [tTracksGrip.id]: tTracksGrip,
  [classicPommel.id]: classicPommel,
};

export function getPart(id: string): HiltPart | undefined {
  return PART_CATALOG[id];
}

export function getPartsByType(type: HiltPart['type']): HiltPart[] {
  return Object.values(PART_CATALOG).filter((p) => p.type === type);
}

export function allParts(): HiltPart[] {
  return Object.values(PART_CATALOG);
}
