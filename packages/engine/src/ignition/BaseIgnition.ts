import type { IgnitionAnimation, IgnitionContext } from '../types.js';

/**
 * Abstract base class for ignition and retraction animations.
 *
 * Subclasses implement getMask() which returns a visibility value (0-1)
 * for each LED position at a given animation progress (0-1).
 *
 * For ignition: progress goes 0 → 1 (blade extending).
 * For retraction: progress goes 1 → 0 (blade retracting),
 * or a dedicated retraction class can handle its own logic.
 *
 * The optional IgnitionContext provides motion data (bladeAngle, swingSpeed,
 * twistAngle) for motion-reactive ignition types.
 */
export abstract class BaseIgnition implements IgnitionAnimation {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract getMask(position: number, progress: number, context?: IgnitionContext): number;
}
