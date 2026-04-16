import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';
import { lerpColor } from '../LEDArray.js';

/**
 * Cellular automaton (Rule 30) running along the blade.
 * Time is discretised into generations.  Each generation's cell values are
 * computed deterministically from the previous generation using Rule 30,
 * starting from a single seed cell.  Cell positions map to blade positions.
 *
 * "On" cells render in base color at full brightness.
 * "Off" cells render dim (10 % brightness) so the blade is never fully dark.
 */
export class AutomataStyle extends BaseStyle {
  readonly id = 'automata';
  readonly name = 'Automata';
  readonly description = 'Rule 30 cellular automaton evolving chaotic organic patterns along the blade.';

  // Rule 30 look-up table: index = [left, center, right] as 3-bit number
  private static readonly RULE30: readonly number[] = [0, 1, 1, 1, 1, 0, 0, 0];

  /**
   * Deterministically compute one cell of generation `gen` at column `col`
   * within a grid of `width` cells.  Uses recursive descent with memoisation
   * encoded purely in the call arguments (no instance state).
   *
   * To avoid O(n²) cost per pixel we use a closed-form triangular bound:
   * generation `gen` can only be influenced by columns in the range
   * [seedCol - gen, seedCol + gen].  Outside that cone every cell is 0.
   *
   * The recursion depth equals `gen`; for the generation rates used here
   * (gen ≈ 0–100) this is fine without memoisation (each call touches at most
   * 3^gen nodes but we exit early at boundary, keeping it tractable for
   * gen ≤ ~20 in practice — see generationSpeed param).
   *
   * For large gen values we use an explicit iterative row-by-row approach
   * on a compact sliding window.
   */
  private static cellAt(gen: number, col: number, width: number): number {
    if (gen === 0) {
      // Seed: single "on" cell in the middle
      return col === Math.floor(width / 2) ? 1 : 0;
    }

    // Iteratively compute the row at `gen` using a minimal-width buffer.
    // The influence cone has half-width = gen, so we only need a strip of
    // width (2*gen+1) centred on the seed.
    const seedCol = Math.floor(width / 2);
    const halfWidth = gen;
    const stripWidth = 2 * halfWidth + 1;
    const stripOffset = seedCol - halfWidth; // first col of strip in global coords

    let prev = new Uint8Array(stripWidth);
    // Gen 0: set seed within strip
    const seedInStrip = seedCol - stripOffset;
    if (seedInStrip >= 0 && seedInStrip < stripWidth) {
      prev[seedInStrip] = 1;
    }

    const cur = new Uint8Array(stripWidth);
    for (let g = 1; g <= gen; g++) {
      for (let s = 0; s < stripWidth; s++) {
        const l = s > 0 ? prev[s - 1] : 0;
        const c = prev[s];
        const r = s < stripWidth - 1 ? prev[s + 1] : 0;
        const ruleIdx = (l << 2) | (c << 1) | r;
        cur[s] = AutomataStyle.RULE30[ruleIdx];
      }
      prev.set(cur);
    }

    const colInStrip = col - stripOffset;
    if (colInStrip < 0 || colInStrip >= stripWidth) return 0;
    return prev[colInStrip];
  }

  getColor(position: number, time: number, context: StyleContext): RGB {
    const base = context.config.baseColor;

    // Number of cells = ledCount (one cell per LED)
    const ledCount = Math.max(16, context.config.ledCount ?? 132);

    // Advance one generation per (1 / generationSpeed) seconds
    const generationSpeed = (context.config.generationSpeed as number | undefined) ?? 8; // gen/sec
    const gen = Math.floor(time * generationSpeed) % ledCount;

    // Map position 0-1 to a cell index
    const col = Math.min(ledCount - 1, Math.floor(position * ledCount));

    const on = AutomataStyle.cellAt(gen, col, ledCount);

    // "On" → base color at full brightness; "Off" → dim version
    const dimFactor = 0.08;
    const dim: RGB = { r: base.r * dimFactor, g: base.g * dimFactor, b: base.b * dimFactor };
    return lerpColor(dim, base, on);
  }
}
