// ─── BladeMotionBlur ─────────────────────────────────────────────────
//
// Directional motion blur on the 3D blade, modulated by the engine's
// swingSpeed. At rest (swingSpeed ≈ 0) the pass is essentially a
// no-op; at full swing it streaks the blade pixels along the swing
// direction, simulating the camera-shutter blur you'd see filming a
// real saber mid-strike.
//
// Implementation: a custom postprocessing.Effect with a 7-tap
// directional Gaussian blur. The direction vector + strength are
// driven from the parent <BladePostProcessing> via the engineRef on
// each frame.
//
// Honors `prefers-reduced-motion`: when `reducedMotion === true` the
// strength is forced to 0 (the pass mounts but renders as a no-op).
// We don't unmount the pass conditionally because EffectComposer
// remounts on child-array changes, which causes a visible flicker.

import React, { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BlendFunction, Effect } from 'postprocessing';
import * as THREE from 'three';
import type { BladeEngine } from '@kyberstation/engine';

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uStrength;
  uniform vec2 uDirection;

  // 7-tap directional Gaussian — symmetric weights around the center.
  const float W0 = 0.196826;
  const float W1 = 0.175713;
  const float W2 = 0.124009;
  const float W3 = 0.067915;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    if (uStrength <= 0.0001) {
      outputColor = inputColor;
      return;
    }

    vec2 texelSize = 1.0 / resolution;
    vec2 step = uDirection * texelSize * uStrength * 8.0;

    vec3 sum = inputColor.rgb * W0;
    sum += texture2D(inputBuffer, uv + step).rgb * W1;
    sum += texture2D(inputBuffer, uv - step).rgb * W1;
    sum += texture2D(inputBuffer, uv + step * 2.0).rgb * W2;
    sum += texture2D(inputBuffer, uv - step * 2.0).rgb * W2;
    sum += texture2D(inputBuffer, uv + step * 3.0).rgb * W3;
    sum += texture2D(inputBuffer, uv - step * 3.0).rgb * W3;

    outputColor = vec4(sum, inputColor.a);
  }
`;

export interface BladeMotionBlurEffectOptions {
  /** Initial strength [0, 1]. Set per-frame via setStrength. Default 0. */
  strength?: number;
  /**
   * Initial blur direction. Default [1, 0] (horizontal). Updated each
   * frame from the engine's bladeAngle. Magnitude < 1 attenuates the
   * directional spread; > 1 stretches it.
   */
  direction?: [number, number];
  /** Blend function. Default NORMAL — output overwrites input. */
  blendFunction?: BlendFunction;
}

/**
 * Velocity-driven directional blur. Pure class; the React wrapper
 * subscribes to engine.motion.swingSpeed each frame and pushes the
 * value through `setStrength`.
 */
export class BladeMotionBlurEffect extends Effect {
  constructor(options: BladeMotionBlurEffectOptions = {}) {
    const {
      strength = 0,
      direction = [1, 0],
      blendFunction = BlendFunction.NORMAL,
    } = options;

    super('BladeMotionBlurEffect', FRAGMENT_SHADER, {
      blendFunction,
      uniforms: new Map<string, THREE.Uniform>([
        ['uStrength', new THREE.Uniform(strength)],
        ['uDirection', new THREE.Uniform(new THREE.Vector2(direction[0], direction[1]))],
      ]),
    });
  }

  /** Set blur strength in [0, 1]. Values above 1 are accepted (extra streak). */
  setStrength(strength: number): void {
    const uniform = this.uniforms.get('uStrength');
    if (uniform) uniform.value = Math.max(0, strength);
  }

  /** Read current strength (test helper). */
  get strength(): number {
    return (this.uniforms.get('uStrength')?.value as number | undefined) ?? 0;
  }

  /** Set blur direction as a 2D vector. The magnitude scales the streak. */
  setDirection(x: number, y: number): void {
    const uniform = this.uniforms.get('uDirection');
    if (uniform) {
      const v = uniform.value as THREE.Vector2;
      v.set(x, y);
    }
  }
}

/**
 * Pure helper: map a normalized swing speed [0, 1] into the motion-
 * blur strength [0, MAX]. Linear with a small dead zone so micro-jitter
 * doesn't constantly blur the blade.
 *
 * Exposed so tests + future tuning have one place to change.
 */
export const MOTION_BLUR_DEAD_ZONE = 0.05;
export const MOTION_BLUR_MAX_STRENGTH = 0.8;

export function swingSpeedToBlurStrength(swingSpeed: number): number {
  if (swingSpeed <= MOTION_BLUR_DEAD_ZONE) return 0;
  const t = (swingSpeed - MOTION_BLUR_DEAD_ZONE) / (1 - MOTION_BLUR_DEAD_ZONE);
  return Math.min(1, Math.max(0, t)) * MOTION_BLUR_MAX_STRENGTH;
}

/**
 * Pure helper: convert a blade angle [-1, +1] into a 2D blur direction
 * unit vector. angle = 0 → horizontal blur ([1, 0]). angle = ±1 →
 * vertical ([0, ±1]). Used by the per-frame update.
 *
 * The blade rotates in screen space as the user swings it, so the
 * blur direction should follow the perceived velocity. We approximate
 * "perpendicular to the blade" by treating bladeAngle as an angle
 * offset from horizontal in the range [-π/2, +π/2].
 */
export function bladeAngleToBlurDirection(bladeAngle: number): [number, number] {
  const theta = bladeAngle * (Math.PI / 2);
  return [Math.cos(theta), Math.sin(theta)];
}

export interface BladeMotionBlurProps {
  /**
   * Reference to the BladeEngine so the pass can read motion.swingSpeed
   * + motion.bladeAngle each frame.
   */
  engineRef: React.RefObject<BladeEngine | null>;
  /**
   * When true (user has prefers-reduced-motion OR explicitly disabled
   * motion blur), strength is forced to 0 regardless of swingSpeed.
   * Default false.
   */
  reducedMotion?: boolean;
}

/**
 * React component wrapping `BladeMotionBlurEffect`. Mount as a child
 * of `<EffectComposer />`, after diffusion. Reads engine.motion every
 * frame and updates the effect's strength + direction uniforms.
 */
export const BladeMotionBlur = forwardRef<
  BladeMotionBlurEffect,
  BladeMotionBlurProps
>(function BladeMotionBlur({ engineRef, reducedMotion = false }, ref) {
  const effect = useMemo(() => new BladeMotionBlurEffect(), []);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  React.useImperativeHandle(ref, () => effect, [effect]);

  useFrame(() => {
    const engine = engineRef.current;
    if (!engine) {
      effect.setStrength(0);
      return;
    }
    if (reducedRef.current) {
      effect.setStrength(0);
      return;
    }
    const strength = swingSpeedToBlurStrength(engine.motion.swingSpeed);
    effect.setStrength(strength);
    const [dx, dy] = bladeAngleToBlurDirection(engine.motion.bladeAngle);
    effect.setDirection(dx, dy);
  });

  // primitive is the R3F idiomatic mount for an arbitrary
  // postprocessing Effect.
  return <primitive object={effect} dispose={null} />;
});
