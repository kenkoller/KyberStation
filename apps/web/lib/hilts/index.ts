/**
 * Public API — the modular hilt library.
 *
 * Most callers want `getAssembly` + `PART_CATALOG` + the `HiltRenderer`
 * component. See docs/HILT_PART_SPEC.md for authoring conventions.
 */

export * from './types';
export * from './composer';
export {
  PART_CATALOG,
  allParts,
  getPart,
  getPartsByType,
} from './catalog';
export {
  ASSEMBLY_CATALOG,
  allAssemblies,
  getAssembly,
  graflexAssembly,
} from './assemblies';
