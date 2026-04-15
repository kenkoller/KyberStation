import type {
  BladeConfig,
  BladeEffect,
  BladeSegment,
  BladeStyle,
  BladeTopology,
  BlendMode,
  EasingFunction,
  EffectContext,
  EffectParams,
  EffectType,
  IgnitionAnimation,
  IgnitionContext,
  LayerDirection,
  RGB,
  StyleContext,
  EffectScoping,
} from './types.js';
import { BladeState, DEFAULT_TOPOLOGY } from './types.js';
import { LEDArray, lerpColor, blendAdd, blendMultiply, blendScreen, scaleColor, clampColor } from './LEDArray.js';
import { MotionSimulator } from './motion/MotionSimulator.js';
import { createEasingFunction } from './easing.js';
import { createStyle } from './styles/index.js';
import { createEffect } from './effects/index.js';
import { createIgnition, createRetraction } from './ignition/index.js';

// ─── Direction transform helpers ───

/**
 * Apply a layer direction transform to a normalized position (0-1).
 */
function transformPosition(pos: number, direction: LayerDirection): number {
  switch (direction) {
    case 'hilt-to-tip':
      return pos;
    case 'tip-to-hilt':
      return 1.0 - pos;
    case 'center-out':
      return Math.abs(pos - 0.5) * 2.0;
    case 'edges-in':
      return 1.0 - Math.abs(pos - 0.5) * 2.0;
    default:
      return pos;
  }
}

/**
 * Blend an overlay color onto a base color using the specified blend mode.
 */
function applyBlendMode(base: RGB, overlay: RGB, opacity: number, mode: BlendMode): RGB {
  if (opacity <= 0) return base;

  let blended: RGB;
  switch (mode) {
    case 'add':
      blended = blendAdd(base, overlay, opacity);
      break;
    case 'multiply':
      blended = blendMultiply(base, overlay);
      if (opacity < 1) blended = lerpColor(base, blended, opacity);
      break;
    case 'screen':
      blended = blendScreen(base, overlay);
      if (opacity < 1) blended = lerpColor(base, blended, opacity);
      break;
    case 'normal':
    default:
      blended = lerpColor(base, overlay, opacity);
      break;
  }
  return blended;
}

/**
 * BladeEngine — the core simulation engine for BladeForge.
 *
 * Manages the full blade lifecycle: ignition/retraction state machine,
 * per-LED style rendering with multi-layer compositing, segment topology,
 * motion simulation, and effect triggering.
 *
 * Usage:
 *   const engine = new BladeEngine();
 *   engine.ignite();
 *   // each frame:
 *   engine.update(deltaMs, config);
 *   const pixels = engine.getPixels();
 *   // render pixels to canvas...
 */
export class BladeEngine {
  // ─── Public state ───
  readonly leds: LEDArray;
  readonly motion: MotionSimulator;

  // ─── Private state ───
  private _state: BladeState = BladeState.OFF;
  private _extendProgress: number = 0;
  private _topology: BladeTopology;
  private _elapsedTime: number = 0;

  // ─── Caches ───
  private styleCache: Map<string, BladeStyle> = new Map();
  private effectPool: Map<string, BladeEffect> = new Map();
  private ignitionCache: Map<string, IgnitionAnimation> = new Map();
  private retractionCache: Map<string, IgnitionAnimation> = new Map();
  private ignitionEasing: EasingFunction | null = null;
  private retractionEasing: EasingFunction | null = null;

  // ─── Segment ignition delays ───
  private segmentDelayProgress: Map<string, number> = new Map();

  constructor(topology?: BladeTopology) {
    this._topology = topology ?? DEFAULT_TOPOLOGY;
    this.leds = new LEDArray(this._topology.totalLEDs);
    this.motion = new MotionSimulator();

    // Wire auto-duel to our effect trigger
    this.motion.setAutoDuelCallback((effect) => {
      this.triggerEffect(effect as EffectType, {
        position: 0.2 + Math.random() * 0.6,
      });
    });
  }

  // ─── Read-only accessors ───

  get state(): BladeState {
    return this._state;
  }

  get extendProgress(): number {
    return this._extendProgress;
  }

  get topology(): BladeTopology {
    return this._topology;
  }

  // ─── State machine controls ───

  /**
   * Begin blade ignition. Transitions OFF -> IGNITING.
   * If already ON or IGNITING, this is a no-op.
   */
  ignite(): void {
    if (this._state === BladeState.ON || this._state === BladeState.IGNITING) {
      return;
    }
    this._state = BladeState.IGNITING;
    // If currently retracting, we resume from current progress
    // (allows re-ignite during retraction)
    this.segmentDelayProgress.clear();
  }

  /**
   * Begin blade retraction. Transitions ON -> RETRACTING.
   * If already OFF or RETRACTING, this is a no-op.
   */
  retract(): void {
    if (this._state === BladeState.OFF || this._state === BladeState.RETRACTING) {
      return;
    }
    this._state = BladeState.RETRACTING;
    this.segmentDelayProgress.clear();
  }

  /**
   * Immediately toggle between ignite and retract based on current state.
   */
  toggle(): void {
    if (this._state === BladeState.OFF || this._state === BladeState.RETRACTING) {
      this.ignite();
    } else {
      this.retract();
    }
  }

  /**
   * Replay the ignition animation — retract quickly then re-ignite.
   * Useful for previewing ignition/retraction style changes.
   */
  replayIgnition(): void {
    this._state = BladeState.OFF;
    this._extendProgress = 0;
    this.segmentDelayProgress.clear();
    this.leds.clear();
    // Start igniting from scratch
    this._state = BladeState.IGNITING;
  }

  // ─── Effect controls ───

  /**
   * Trigger a blade effect (clash, blast, lockup, etc.).
   * Creates or reuses an effect instance from the pool.
   *
   * If `params.segmentId` is provided, the effect is scoped to that segment
   * (only segments with `effectScoping: 'independent'` that match will see it).
   * If omitted, the effect is global and applies to all `'mirror-main'` segments.
   */
  // One-shot effect types that cancel each other when triggered
  private static readonly ONE_SHOT_EFFECTS: ReadonlySet<EffectType> = new Set([
    'clash', 'blast', 'stab', 'force',
  ]);

  triggerEffect(type: EffectType, params?: EffectParams): void {
    const segmentId = params?.segmentId ?? '_global';

    // Cancel other active one-shot effects to prevent stacking
    if (BladeEngine.ONE_SHOT_EFFECTS.has(type)) {
      for (const [key, existing] of this.effectPool.entries()) {
        if (!key.startsWith(`${segmentId}-`)) continue;
        const effectType = key.split('-').slice(1).join('-') as EffectType;
        if (effectType !== type && BladeEngine.ONE_SHOT_EFFECTS.has(effectType) && existing.isActive()) {
          existing.reset();
        }
      }
    }

    const effect = this.getEffect(type, segmentId);
    effect.trigger(params ?? { position: 0.5 });
  }

  /**
   * Release a sustained effect (lockup, drag, melt, lightning).
   */
  releaseEffect(type: EffectType, segmentId?: string): void {
    const key = `${segmentId ?? '_global'}-${type}`;
    const effect = this.effectPool.get(key);
    if (effect && effect.isActive()) {
      effect.release();
    }
  }

  // ─── Topology ───

  /**
   * Reconfigure the engine with a new blade topology.
   * Resets the LED array and clears caches.
   */
  setTopology(topology: BladeTopology): void {
    this._topology = topology;
    // Rebuild LEDArray — we cast to mutable for this one-time reassignment.
    // In a production build we'd use a proper reinit pattern, but for the
    // engine the constructor-readonly guarantee is sufficient.
    (this as { leds: LEDArray }).leds = new LEDArray(topology.totalLEDs);
    this.segmentDelayProgress.clear();
    this.ignitionCache.clear();
    this.retractionCache.clear();
  }

  // ─── Main frame update ───

  /**
   * Advance the engine simulation by deltaMs milliseconds.
   * This is the main per-frame entry point.
   *
   * @param deltaMs — milliseconds since the last update
   * @param config  — current blade configuration
   */
  update(deltaMs: number, config: BladeConfig): void {
    this._elapsedTime += deltaMs;

    // (a) Update motion simulator
    this.motion.update(deltaMs);

    // (b) Update easing functions if config has changed
    this.updateEasings(config);

    // (c) Update ignition/retraction progress
    this.updateExtendProgress(deltaMs, config);

    // (d) Update state machine transitions
    this.updateStateMachine();

    // If blade is fully off, just clear and return early
    if (this._state === BladeState.OFF) {
      this.leds.clear();
      return;
    }

    // (e) Build the StyleContext shared by all style/effect evaluations
    const styleContext: StyleContext = {
      time: this._elapsedTime,
      swingSpeed: this.motion.swingSpeed,
      bladeAngle: this.motion.bladeAngle,
      twistAngle: this.motion.twistAngle,
      soundLevel: this.motion.soundLevel,
      batteryLevel: 1.0, // simulated — always full
      config,
    };

    // (f) Render each segment (guarded so a single style crash
    //     doesn't blank the entire blade)
    for (const segment of this._topology.segments) {
      try {
        this.renderSegment(segment, styleContext, config);
      } catch (err) {
        console.warn(`Render failed for segment ${segment.startLED}-${segment.endLED}:`, err);
      }
    }

    // (g) Clean up expired effects
    this.cleanupEffects();
  }

  // ─── Output ───

  /**
   * Return the raw LED pixel buffer (Uint8Array of R,G,B triplets).
   */
  getPixels(): Uint8Array {
    return this.leds.buffer;
  }

  /**
   * Return the current blade state.
   */
  getState(): BladeState {
    return this._state;
  }

  /**
   * Reset the engine to initial state (OFF, all LEDs dark).
   */
  reset(): void {
    this._state = BladeState.OFF;
    this._extendProgress = 0;
    this._elapsedTime = 0;
    this.leds.clear();
    this.motion.reset();
    this.segmentDelayProgress.clear();
    // Reset all active effects
    for (const effect of this.effectPool.values()) {
      effect.reset();
    }
  }

  // ─── Private: Easing ───

  private updateEasings(config: BladeConfig): void {
    // Cache easing functions; rebuild only when config changes.
    // For simplicity we rebuild each frame — createEasingFunction is cheap
    // for presets (just a lookup). A config-diff check can be added later
    // if profiling shows this as a bottleneck.
    if (config.ignitionEasing) {
      this.ignitionEasing = createEasingFunction(config.ignitionEasing);
    } else {
      this.ignitionEasing = null;
    }
    if (config.retractionEasing) {
      this.retractionEasing = createEasingFunction(config.retractionEasing);
    } else {
      this.retractionEasing = null;
    }
  }

  // ─── Private: Extend progress ───

  private updateExtendProgress(deltaMs: number, config: BladeConfig): void {
    if (this._state === BladeState.IGNITING) {
      const rate = deltaMs / Math.max(1, config.ignitionMs);
      this._extendProgress = Math.min(1, this._extendProgress + rate);
    } else if (this._state === BladeState.RETRACTING) {
      const rate = deltaMs / Math.max(1, config.retractionMs);
      this._extendProgress = Math.max(0, this._extendProgress - rate);
    }
  }

  // ─── Private: State machine ───

  private updateStateMachine(): void {
    if (this._state === BladeState.IGNITING && this._extendProgress >= 1) {
      this._extendProgress = 1;
      this._state = BladeState.ON;
    } else if (this._state === BladeState.RETRACTING && this._extendProgress <= 0) {
      this._extendProgress = 0;
      this._state = BladeState.OFF;
    }
  }

  // ─── Private: Segment rendering ───

  private renderSegment(
    segment: BladeSegment,
    styleContext: StyleContext,
    config: BladeConfig,
  ): void {
    const segmentLength = segment.endLED - segment.startLED + 1;
    if (segmentLength <= 0) return;

    // Compute per-segment ignition progress, accounting for delay
    const segmentProgress = this.getSegmentExtendProgress(segment, config);

    // Get the ignition and retraction animations for this segment.
    // Use config values (from the UI) rather than segment defaults,
    // so that changing ignition/retraction style in the UI is immediately visible.
    let ignitionId = config.ignition ?? segment.ignition;
    let retractionId = config.retraction ?? segment.retraction;

    // Dual-mode ignition: select ignition/retraction based on blade angle
    if (config.dualModeIgnition) {
      const angleThreshold = config.ignitionAngleThreshold ?? 0.3;
      const isUp = styleContext.bladeAngle > angleThreshold;
      if (isUp) {
        ignitionId = config.ignitionUp ?? ignitionId;
        retractionId = config.retractionUp ?? retractionId;
      } else {
        ignitionId = config.ignitionDown ?? ignitionId;
        retractionId = config.retractionDown ?? retractionId;
      }
    }

    const ignition = this.getIgnition(ignitionId);
    const retraction = this.getRetraction(retractionId);

    // Configure custom curve ignition with control points from config
    if (ignitionId === 'custom-curve' && config.ignitionCurve && 'setControlPoints' in ignition) {
      (ignition as { setControlPoints(p: [number, number, number, number]): void }).setControlPoints(config.ignitionCurve);
    }
    if (retractionId === 'custom-curve' && config.retractionCurve && 'setControlPoints' in retraction) {
      (retraction as { setControlPoints(p: [number, number, number, number]): void }).setControlPoints(config.retractionCurve);
    }

    // Build ignition context for motion-reactive ignition types
    const ignitionCtx: IgnitionContext = {
      bladeAngle: styleContext.bladeAngle,
      swingSpeed: styleContext.swingSpeed,
      twistAngle: styleContext.twistAngle,
      config,
    };

    // Choose the active ignition animation based on state
    const activeIgnition =
      this._state === BladeState.RETRACTING ? retraction : ignition;

    // Apply eased progress for the ignition mask
    const easedProgress = this.applyEasing(segmentProgress);

    // Resolve layers — if segment mirrors another, use that segment's layers
    const layers = this.resolveSegmentLayers(segment);

    // Compute rotation offset for segments with rotationRPM (e.g., inquisitor ring)
    const rotationOffset = segment.animationConfig?.rotationRPM
      ? (this._elapsedTime * segment.animationConfig.rotationRPM / 60000) % 1.0
      : 0;

    for (let led = segment.startLED; led <= segment.endLED; led++) {
      // Normalized position within this segment (0 = start, 1 = end)
      let pos = segmentLength > 1
        ? (led - segment.startLED) / (segmentLength - 1)
        : 0;

      // Flip for reversed segments
      if (segment.direction === 'reverse') {
        pos = 1.0 - pos;
      }

      // Apply rotation offset for spinning segments (inquisitor ring)
      let stylePos = pos;
      if (rotationOffset > 0) {
        stylePos = (pos + rotationOffset) % 1.0;
      }

      // ─── Layer compositing ───
      let finalColor: RGB = { r: 0, g: 0, b: 0 };
      let hasBase = false;

      for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
        const layer = layers[layerIdx];
        // Transform position based on layer direction
        const transformedPos = transformPosition(stylePos, layer.direction);

        // For the base layer (index 0), use config.style from the UI
        // so that changing the style selector is immediately visible.
        const styleId = (layerIdx === 0 && config.style) ? config.style : layer.style;
        const style = this.getStyle(styleId);
        const layerColor = style.getColor(transformedPos, this._elapsedTime, styleContext);

        if (!hasBase) {
          // First layer: set as base
          finalColor = { r: layerColor.r, g: layerColor.g, b: layerColor.b };
          hasBase = true;
          // Apply first layer opacity
          if (layer.opacity < 1) {
            finalColor = scaleColor(finalColor, layer.opacity);
          }
        } else {
          // Subsequent layers: blend onto base
          finalColor = applyBlendMode(finalColor, layerColor, layer.opacity, layer.blendMode);
        }
      }

      // If no layers produced color, fallback to black
      if (!hasBase) {
        finalColor = { r: 0, g: 0, b: 0 };
      }

      // ─── Apply ignition/retraction mask ───
      const mask = activeIgnition.getMask(pos, easedProgress, ignitionCtx);
      if (mask < 1) {
        finalColor = scaleColor(finalColor, mask);
      }

      // ─── Apply active effects (per-segment scoping) ───
      finalColor = this.applyEffectsForSegment(finalColor, pos, styleContext, segment);

      // ─── Write to LED array ───
      this.leds.setPixelRGB(led, clampColor(finalColor));
    }
  }

  /**
   * Compute per-segment extend progress, accounting for ignition delay.
   * Segments with a delay start their ignition later than the main progress.
   */
  private getSegmentExtendProgress(segment: BladeSegment, config: BladeConfig): number {
    if (segment.ignitionDelay <= 0) {
      return this._extendProgress;
    }

    // The segment's progress is shifted by its delay relative to the total duration.
    // For ignition: the segment starts later.
    // For retraction: the segment finishes earlier (starts retracting first).
    const totalMs =
      this._state === BladeState.RETRACTING ? config.retractionMs : config.ignitionMs;
    const delayFraction = segment.ignitionDelay / Math.max(1, totalMs);

    if (this._state === BladeState.IGNITING || this._state === BladeState.ON) {
      // Ignition: shift progress back by delay fraction, clamp to 0-1
      const adjusted = (this._extendProgress - delayFraction) / (1 - delayFraction);
      return Math.max(0, Math.min(1, adjusted));
    } else if (this._state === BladeState.RETRACTING) {
      // Retraction: segment retracts earlier (finishes sooner)
      const adjusted = this._extendProgress / (1 - delayFraction);
      return Math.max(0, Math.min(1, adjusted));
    }

    return this._extendProgress;
  }

  /**
   * Apply easing to the extend progress if configured.
   */
  private applyEasing(progress: number): number {
    if (this._state === BladeState.IGNITING || this._state === BladeState.ON) {
      return this.ignitionEasing ? this.ignitionEasing(progress) : progress;
    }
    if (this._state === BladeState.RETRACTING) {
      // For retraction, progress goes 1→0. The easing expects 0→1 input,
      // so we invert, apply, and invert back.
      if (this.retractionEasing) {
        return 1 - this.retractionEasing(1 - progress);
      }
    }
    return progress;
  }

  /**
   * Resolve layers for a segment, following mirrorOf references.
   */
  private resolveSegmentLayers(segment: BladeSegment): BladeSegment['layers'] {
    if (segment.mirrorOf) {
      const mirrored = this._topology.segments.find((s) => s.id === segment.mirrorOf);
      if (mirrored) {
        return mirrored.layers;
      }
    }
    return segment.layers;
  }

  // ─── Private: Effect application ───

  /**
   * Apply effects to a pixel, respecting the segment's effectScoping setting.
   *
   * - 'mirror-main': Apply global effects (keyed with '_global') — same as main blade.
   * - 'independent': Only apply effects triggered with this segment's specific segmentId.
   * - 'ignore': Skip all effects (accents, blade plugs, rings).
   */
  private applyEffectsForSegment(
    color: RGB,
    position: number,
    styleContext: StyleContext,
    segment: BladeSegment,
  ): RGB {
    const scoping: EffectScoping = segment.effectScoping ?? 'mirror-main';

    // 'ignore' — no effects applied
    if (scoping === 'ignore') {
      return color;
    }

    let result = color;
    for (const [key, effect] of this.effectPool.entries()) {
      if (!effect.isActive()) continue;

      // Determine if this effect applies to the current segment
      if (scoping === 'mirror-main') {
        // Only apply global (unsegmented) effects
        if (!key.startsWith('_global-')) continue;
      } else if (scoping === 'independent') {
        // Only apply effects triggered for this specific segment
        if (!key.startsWith(`${segment.id}-`)) continue;
      }

      // Access BaseEffect internals to compute elapsed/progress for the context.
      const baseEffect = effect as unknown as { startTime: number; duration: number };
      const elapsed = this._elapsedTime - baseEffect.startTime;
      const progress = Math.min(1, elapsed / Math.max(1, baseEffect.duration));

      const effectContext: EffectContext = {
        ...styleContext,
        elapsed,
        progress,
      };

      result = effect.apply(result, position, effectContext);
    }
    return result;
  }

  private cleanupEffects(): void {
    // Effects self-deactivate via isActive() returning false.
    // No explicit cleanup needed — inactive effects stay in the pool
    // and are reused on the next trigger. This avoids GC churn.
  }

  // ─── Private: Lazy instance caches ───

  private getStyle(id: string): BladeStyle {
    let style = this.styleCache.get(id);
    if (!style) {
      style = createStyle(id);
      this.styleCache.set(id, style);
    }
    return style;
  }

  private getEffect(type: EffectType, segmentId: string = '_global'): BladeEffect {
    const key = `${segmentId}-${type}`;
    let effect = this.effectPool.get(key);
    if (!effect) {
      effect = createEffect(type);
      this.effectPool.set(key, effect);
    }
    return effect;
  }

  private getIgnition(id: string): IgnitionAnimation {
    let ignition = this.ignitionCache.get(id);
    if (!ignition) {
      ignition = createIgnition(id);
      this.ignitionCache.set(id, ignition);
    }
    return ignition;
  }

  private getRetraction(id: string): IgnitionAnimation {
    let retraction = this.retractionCache.get(id);
    if (!retraction) {
      retraction = createRetraction(id);
      this.retractionCache.set(id, retraction);
    }
    return retraction;
  }
}
