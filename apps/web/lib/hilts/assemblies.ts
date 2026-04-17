/**
 * Canonical assembly definitions. Each assembly is a curated
 * top-to-bottom stack of parts (by id) that renders as a complete
 * lightsaber hilt. Preset bindings reference assemblies by id.
 */

import type { HiltAssembly } from './types';

export const graflexAssembly: HiltAssembly = {
  id: 'graflex',
  displayName: 'Graflex',
  archetype: 'single-classic',
  era: 'original',
  faction: 'jedi',
  description:
    'Classic single-hilt inspired by the Graflex 3-cell flash-gun. '
    + 'Brass clamp band and T-tracks grip.',
  parts: [
    { partId: 'graflex-emitter' },
    { partId: 'graflex-switch' },
    { partId: 't-tracks-grip' },
    { partId: 'classic-pommel' },
  ],
};

export const ASSEMBLY_CATALOG: Record<string, HiltAssembly> = {
  [graflexAssembly.id]: graflexAssembly,
};

export function getAssembly(id: string): HiltAssembly | undefined {
  return ASSEMBLY_CATALOG[id];
}

export function allAssemblies(): HiltAssembly[] {
  return Object.values(ASSEMBLY_CATALOG);
}
