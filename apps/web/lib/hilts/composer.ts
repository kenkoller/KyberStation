/**
 * Hilt composition engine.
 *
 * Given an assembly (ordered list of part ids) and a part catalog,
 * produce a ComposedHilt with absolute part placements that the
 * renderer can stack into a single <svg>.
 *
 * Stacking rules:
 * - Parts are laid out top-to-bottom, in assembly order.
 * - Adjacent parts overlap by OVERLAP_UNITS so connectors kiss
 *   without a visible seam.
 * - The composer does NOT redraw parts — each part's SVG is
 *   rendered verbatim at its computed Y offset.
 *
 * Validation:
 * - `strict` — any connector-diameter mismatch produces an error
 *   and the composition fails (returns null hilt).
 * - `permissive` — mismatches produce warnings; composition proceeds
 *   using the smaller diameter (visual fit acceptable for user-
 *   authored assemblies in v0.11.3+).
 */

import type {
  AssemblyPart,
  ComposedHilt,
  CompositionError,
  CompositionMode,
  CompositionResult,
  HiltAssembly,
  HiltPart,
  PartPlacement,
} from './types';

/**
 * Vertical overlap between adjacent parts in SVG units. Tuned so the
 * connector ring from the upper part kisses the lower part without a
 * visible gap. ~1/6 of a typical connector ring height.
 */
export const OVERLAP_UNITS = 2;

export function resolveAssembly(
  assembly: HiltAssembly,
  catalog: Record<string, HiltPart>,
  mode: CompositionMode = 'strict',
): CompositionResult {
  const errors: CompositionError[] = [];
  const warnings: CompositionError[] = [];

  if (assembly.parts.length === 0) {
    errors.push({
      kind: 'no-parts',
      message: `Assembly "${assembly.id}" has no parts.`,
    });
    return { hilt: null, errors, warnings };
  }

  const placements: PartPlacement[] = [];
  let cursorY = 0;
  let emitterY = 0;
  let maxWidth = 0;
  let prevPart: HiltPart | null = null;

  for (let i = 0; i < assembly.parts.length; i++) {
    const assemblyPart: AssemblyPart = assembly.parts[i];
    const part = catalog[assemblyPart.partId];

    if (!part) {
      errors.push({
        kind: 'missing-part',
        message: `Part "${assemblyPart.partId}" not found in catalog.`,
        partId: assemblyPart.partId,
      });
      continue;
    }

    if (prevPart) {
      const prevDiameter = prevPart.bottomConnector.diameter;
      const thisDiameter = part.topConnector.diameter;

      if (prevDiameter !== thisDiameter) {
        const err: CompositionError = {
          kind: 'diameter-mismatch',
          message:
            `Part "${part.id}" top connector is ${thisDiameter}, `
            + `but previous part "${prevPart.id}" bottom is ${prevDiameter}.`,
          partId: part.id,
          expectedDiameter: prevDiameter,
          actualDiameter: thisDiameter,
        };

        if (mode === 'strict') {
          errors.push(err);
        } else {
          warnings.push(err);
        }
      }
    }

    const offsetNudge = assemblyPart.offsetY ?? 0;
    const y = cursorY + offsetNudge;

    if (i === 0) {
      emitterY = y;
    }

    placements.push({
      part,
      accentColor: assemblyPart.accentColor,
      y,
    });

    if (part.svg.width > maxWidth) {
      maxWidth = part.svg.width;
    }

    cursorY = y + part.svg.height - OVERLAP_UNITS;
    prevPart = part;
  }

  if (errors.length > 0) {
    return { hilt: null, errors, warnings };
  }

  const totalHeight = cursorY + OVERLAP_UNITS;

  const hilt: ComposedHilt = {
    assemblyId: assembly.id,
    totalWidth: maxWidth,
    totalHeight,
    emitterY,
    placements,
  };

  return { hilt, errors, warnings };
}

/**
 * Convenience — throws on errors, returns hilt directly. Use when the
 * caller knows the assembly is catalog-complete (e.g. shipped assemblies).
 */
export function composeOrThrow(
  assembly: HiltAssembly,
  catalog: Record<string, HiltPart>,
  mode: CompositionMode = 'strict',
): ComposedHilt {
  const { hilt, errors } = resolveAssembly(assembly, catalog, mode);
  if (!hilt) {
    const msg = errors.map((e) => e.message).join('; ');
    throw new Error(`Failed to compose "${assembly.id}": ${msg}`);
  }
  return hilt;
}
