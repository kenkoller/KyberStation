// ─── Edit Mode Argument Index Manager ───
// Tracks argument index allocation for Fett263 Edit Mode.
//
// Standard Fett263 argument assignments:
//   ARG 1: Base Color
//   ARG 2: Blast Color
//   ARG 3: Clash Color
//   ARG 4: Lockup Color
//   ARG 5-8: Other effect colors (drag, lightning, melt, etc.)
//   ARG 9+: IntArgs for ignition/retraction times, shimmer, etc.

export type ArgType = 'rgb' | 'int';

export interface ArgAllocation {
  index: number;
  type: ArgType;
  label: string;
}

/** Standard color argument assignments for Fett263 Edit Mode */
const STANDARD_COLOR_ARGS: Array<{ index: number; label: string; configKey: string }> = [
  { index: 1, label: 'Base Color', configKey: 'baseColor' },
  { index: 2, label: 'Blast Color', configKey: 'blastColor' },
  { index: 3, label: 'Clash Color', configKey: 'clashColor' },
  { index: 4, label: 'Lockup Color', configKey: 'lockupColor' },
  { index: 5, label: 'Drag Color', configKey: 'dragColor' },
  { index: 6, label: 'Lightning Color', configKey: 'lightningColor' },
  { index: 7, label: 'Melt Color', configKey: 'meltColor' },
  { index: 8, label: 'Gradient End', configKey: 'gradientEnd' },
];

export class EditArgManager {
  private allocations: Map<number, ArgAllocation> = new Map();
  private nextIntArgIndex = 9;

  constructor() {
    this.reset();
  }

  /**
   * Get the standard RgbArg index for a config color key.
   * Returns undefined if no standard mapping exists.
   */
  getColorArgIndex(configKey: string): number | undefined {
    const std = STANDARD_COLOR_ARGS.find((a) => a.configKey === configKey);
    return std?.index;
  }

  /**
   * Allocate an RgbArg for a color channel.
   * Uses standard index if available, otherwise allocates a new one.
   */
  allocateRgbArg(configKey: string, label?: string): { index: number } {
    const stdIndex = this.getColorArgIndex(configKey);
    const index = stdIndex ?? this.nextIntArgIndex++;
    const argLabel = label ?? STANDARD_COLOR_ARGS.find((a) => a.configKey === configKey)?.label ?? configKey;
    this.allocations.set(index, { index, type: 'rgb', label: argLabel });
    return { index };
  }

  /**
   * Allocate an IntArg for an integer parameter.
   */
  allocateIntArg(label: string): { index: number } {
    const index = this.nextIntArgIndex++;
    this.allocations.set(index, { index, type: 'int', label });
    return { index };
  }

  /**
   * Get all allocated argument indices.
   */
  getUsedIndices(): Map<number, ArgAllocation> {
    return new Map(this.allocations);
  }

  /**
   * Reset all allocations.
   */
  reset(): void {
    this.allocations.clear();
    this.nextIntArgIndex = 9;
  }
}

export { STANDARD_COLOR_ARGS };
