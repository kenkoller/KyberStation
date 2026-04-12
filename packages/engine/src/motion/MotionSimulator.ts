/**
 * MotionSimulator — simulates saber motion data for the blade engine.
 *
 * In the real Proffieboard, motion data comes from the onboard IMU
 * (accelerometer + gyroscope). This simulator produces equivalent
 * normalized values that drive motion-reactive blade styles:
 *
 *  - swingSpeed (0-1): how fast the saber is being swung
 *  - bladeAngle (-1 to 1): orientation of the blade (down to up)
 *  - twistAngle (-1 to 1): rotational twist around the blade axis
 *  - soundLevel (0-1): ambient sound reactivity (derived from swing)
 *
 * The UI sets target values and the simulator smoothly interpolates
 * toward them, preventing jarring jumps. Two auto modes are provided:
 *
 *  - autoSwing: oscillates swing speed for passive demo display
 *  - autoDuel: triggers random combat effects at realistic intervals
 */
export class MotionSimulator {
  // ─── Current smoothed values ───
  swingSpeed: number = 0;
  bladeAngle: number = 0;
  twistAngle: number = 0;
  soundLevel: number = 0;

  // ─── Targets (UI sets these, values smooth toward them) ───
  targetSwing: number = 0;
  targetAngle: number = 0;
  targetTwist: number = 0;

  // ─── Auto modes ───
  autoSwing: boolean = false;
  autoDuel: boolean = false;
  private autoSwingTime: number = 0;
  private autoDuelTimer: number = 0;
  private autoDuelCallback: ((effect: string) => void) | null = null;

  // ─── Smoothing rates (fraction per frame at 60fps, adjusted by delta) ───
  private static readonly SWING_SMOOTHING = 0.08;
  private static readonly ANGLE_SMOOTHING = 0.05;
  private static readonly TWIST_SMOOTHING = 0.05;

  // ─── Auto-swing parameters ───
  private static readonly AUTO_SWING_FREQ = 2; // oscillations per second
  private static readonly AUTO_SWING_AMPLITUDE = 0.5;
  private static readonly AUTO_SWING_OFFSET = 0.5;

  // ─── Auto-duel parameters ───
  private static readonly DUEL_MIN_INTERVAL = 800; // ms
  private static readonly DUEL_MAX_INTERVAL = 2800; // ms (800 + 2000)
  private static readonly DUEL_EFFECTS = ['clash', 'blast', 'lockup'] as const;

  /**
   * Register a callback that fires when auto-duel triggers an effect.
   * Typically wired to BladeEngine.triggerEffect().
   */
  setAutoDuelCallback(cb: (effect: string) => void): void {
    this.autoDuelCallback = cb;
  }

  /**
   * Advance the simulation by deltaMs milliseconds.
   * Call once per frame from the engine update loop.
   */
  update(deltaMs: number): void {
    // Smooth current values toward targets using exponential decay.
    // The smoothing factors are calibrated for ~16ms frames; we don't
    // need to adjust for variable delta since the visual difference
    // is negligible and the cost of Math.pow isn't worth it here.
    this.swingSpeed += (this.targetSwing - this.swingSpeed) * MotionSimulator.SWING_SMOOTHING;
    this.bladeAngle += (this.targetAngle - this.bladeAngle) * MotionSimulator.ANGLE_SMOOTHING;
    this.twistAngle += (this.targetTwist - this.twistAngle) * MotionSimulator.TWIST_SMOOTHING;

    // Auto-swing: sinusoidal oscillation for demo/preview
    if (this.autoSwing) {
      this.autoSwingTime += deltaMs;
      this.targetSwing =
        Math.sin((this.autoSwingTime / 1000) * MotionSimulator.AUTO_SWING_FREQ) *
          MotionSimulator.AUTO_SWING_AMPLITUDE +
        MotionSimulator.AUTO_SWING_OFFSET;
    }

    // Auto-duel: trigger random effects at randomized intervals
    if (this.autoDuel && this.autoDuelCallback) {
      this.autoDuelTimer += deltaMs;
      const threshold =
        MotionSimulator.DUEL_MIN_INTERVAL +
        Math.random() * (MotionSimulator.DUEL_MAX_INTERVAL - MotionSimulator.DUEL_MIN_INTERVAL);
      if (this.autoDuelTimer > threshold) {
        this.autoDuelTimer = 0;
        const effects = MotionSimulator.DUEL_EFFECTS;
        const effect = effects[Math.floor(Math.random() * effects.length)];
        this.autoDuelCallback(effect);
      }
    }

    // Sound level simulated from swing speed with a small random jitter
    this.soundLevel = Math.min(1, this.swingSpeed * 0.6 + Math.random() * 0.1);
  }

  /**
   * Reset all values to zero and disable auto modes.
   */
  reset(): void {
    this.swingSpeed = 0;
    this.bladeAngle = 0;
    this.twistAngle = 0;
    this.soundLevel = 0;
    this.targetSwing = 0;
    this.targetAngle = 0;
    this.targetTwist = 0;
    this.autoSwing = false;
    this.autoDuel = false;
    this.autoSwingTime = 0;
    this.autoDuelTimer = 0;
  }
}
