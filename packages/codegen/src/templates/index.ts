// ─── Template Registry ───
// Aggregates all ProffieOS template definitions into a single lookup map.

import type { TemplateDefinition } from '../types.js';
import { colorTemplates, namedColors } from './colors.js';
import { layerTemplates } from './layers.js';
import { transitionTemplates } from './transitions.js';
import { functionTemplates } from './functions.js';
import { wrapperTemplates } from './wrappers.js';

const allTemplates: Map<string, TemplateDefinition> = new Map();

// Merge all sub-maps in order
for (const source of [
  colorTemplates,
  namedColors,
  layerTemplates,
  transitionTemplates,
  functionTemplates,
  wrapperTemplates,
]) {
  for (const [key, value] of source) {
    allTemplates.set(key, value);
  }
}

/**
 * Look up a ProffieOS template definition by name.
 * Returns undefined if the name is not a known template.
 */
export function lookupTemplate(name: string): TemplateDefinition | undefined {
  return allTemplates.get(name);
}

/**
 * Check whether a name corresponds to a registered template.
 */
export function isKnownTemplate(name: string): boolean {
  return allTemplates.has(name);
}

/**
 * Get all registered template definitions.
 */
export function getAllTemplates(): ReadonlyMap<string, TemplateDefinition> {
  return allTemplates;
}

export { colorTemplates, namedColors } from './colors.js';
export { layerTemplates } from './layers.js';
export { transitionTemplates } from './transitions.js';
export { functionTemplates } from './functions.js';
export { wrapperTemplates } from './wrappers.js';
