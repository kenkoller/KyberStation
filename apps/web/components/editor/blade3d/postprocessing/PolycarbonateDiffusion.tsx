// ─── PolycarbonateDiffusion ──────────────────────────────────────────
//
// Screen-space soft Gaussian blur over the emissive blade pixels,
// simulating the way LED light scatters through the polycarbonate
// diffuser tube. The blade shader already does in-pixel diffusion
// along the V axis; this is a separate, perpendicular scattering
// that bleeds light across the *screen* — what you see when the
// blade is rotated obliquely and the diffuser tube's wall acts as a
// fiber-optic bundle.
//
// Implementation: a custom postprocessing Effect with a luminance-
// thresholded 9-tap Gaussian blur. The threshold ensures the hilt and
// any non-emissive geometry don't get softened — only bright LED
// pixels participate. Output is screen-blended over the base scene,
// so the underlying detail stays sharp.
//
// Mounted as a child of <EffectComposer />, after <UnrealBloom />.

import React, { forwardRef, useMemo } from 'react';
import { BlendFunction, Effect } from 'postprocessing';
import * as THREE from 'three';

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uIntensity;
  uniform float uRadius;
  uniform float uThreshold;

  // Gaussian blur weights for a 9-tap kernel — pre-computed
  // for σ ≈ 2.0, normalized to sum to 1.0.
  const float WEIGHT_0 = 0.227027;
  const float WEIGHT_1 = 0.194595;
  const float WEIGHT_2 = 0.121622;
  const float WEIGHT_3 = 0.054054;
  const float WEIGHT_4 = 0.016216;

  // Compute perceptual luminance (Rec. 709). The diffusion only
  // operates on pixels above the threshold — non-emissive geometry
  // stays sharp.
  float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 texelSize = 1.0 / resolution;
    vec2 step = texelSize * uRadius;

    // Sample 9 taps along both axes (separable Gaussian).
    vec3 horizontal = texture2D(inputBuffer, uv).rgb * WEIGHT_0;
    horizontal += texture2D(inputBuffer, uv + vec2(step.x, 0.0)).rgb * WEIGHT_1;
    horizontal += texture2D(inputBuffer, uv - vec2(step.x, 0.0)).rgb * WEIGHT_1;
    horizontal += texture2D(inputBuffer, uv + vec2(2.0 * step.x, 0.0)).rgb * WEIGHT_2;
    horizontal += texture2D(inputBuffer, uv - vec2(2.0 * step.x, 0.0)).rgb * WEIGHT_2;
    horizontal += texture2D(inputBuffer, uv + vec2(3.0 * step.x, 0.0)).rgb * WEIGHT_3;
    horizontal += texture2D(inputBuffer, uv - vec2(3.0 * step.x, 0.0)).rgb * WEIGHT_3;
    horizontal += texture2D(inputBuffer, uv + vec2(4.0 * step.x, 0.0)).rgb * WEIGHT_4;
    horizontal += texture2D(inputBuffer, uv - vec2(4.0 * step.x, 0.0)).rgb * WEIGHT_4;

    vec3 vertical = texture2D(inputBuffer, uv).rgb * WEIGHT_0;
    vertical += texture2D(inputBuffer, uv + vec2(0.0, step.y)).rgb * WEIGHT_1;
    vertical += texture2D(inputBuffer, uv - vec2(0.0, step.y)).rgb * WEIGHT_1;
    vertical += texture2D(inputBuffer, uv + vec2(0.0, 2.0 * step.y)).rgb * WEIGHT_2;
    vertical += texture2D(inputBuffer, uv - vec2(0.0, 2.0 * step.y)).rgb * WEIGHT_2;
    vertical += texture2D(inputBuffer, uv + vec2(0.0, 3.0 * step.y)).rgb * WEIGHT_3;
    vertical += texture2D(inputBuffer, uv - vec2(0.0, 3.0 * step.y)).rgb * WEIGHT_3;
    vertical += texture2D(inputBuffer, uv + vec2(0.0, 4.0 * step.y)).rgb * WEIGHT_4;
    vertical += texture2D(inputBuffer, uv - vec2(0.0, 4.0 * step.y)).rgb * WEIGHT_4;

    vec3 blurred = (horizontal + vertical) * 0.5;

    // Luminance gate — only diffuse pixels above the threshold.
    float lum = luminance(inputColor.rgb);
    float gate = smoothstep(uThreshold, uThreshold + 0.05, lum);

    // Mix the blurred result with the original by intensity * gate.
    vec3 diffused = mix(inputColor.rgb, blurred, uIntensity * gate);

    outputColor = vec4(diffused, inputColor.a);
  }
`;

export interface PolycarbonateDiffusionEffectOptions {
  /** Diffusion strength [0, 1]. Default 0.5. */
  intensity?: number;
  /** Blur radius in texels. Default 1.5 (subtle scattering halo). */
  radius?: number;
  /** Luminance threshold — pixels below this don't diffuse. Default 0.15. */
  threshold?: number;
  /** Blend function. Default NORMAL — the shader already mixes internally. */
  blendFunction?: BlendFunction;
}

/**
 * Custom postprocessing Effect implementing a luminance-gated soft
 * Gaussian blur. Mountable directly inside an EffectComposer.
 *
 * Pure class; no React. The companion `<PolycarbonateDiffusion />`
 * React component wraps it for JSX use.
 */
export class PolycarbonateDiffusionEffect extends Effect {
  constructor(options: PolycarbonateDiffusionEffectOptions = {}) {
    const {
      intensity = 0.5,
      radius = 1.5,
      threshold = 0.15,
      blendFunction = BlendFunction.NORMAL,
    } = options;

    super('PolycarbonateDiffusionEffect', FRAGMENT_SHADER, {
      blendFunction,
      uniforms: new Map<string, THREE.Uniform>([
        ['uIntensity', new THREE.Uniform(intensity)],
        ['uRadius', new THREE.Uniform(radius)],
        ['uThreshold', new THREE.Uniform(threshold)],
      ]),
    });
  }

  /** Live setter — lets BladePostProcessing tween intensity at runtime. */
  setIntensity(intensity: number): void {
    const uniform = this.uniforms.get('uIntensity');
    if (uniform) uniform.value = Math.max(0, intensity);
  }

  /** Live setter — radius in texels. */
  setRadius(radius: number): void {
    const uniform = this.uniforms.get('uRadius');
    if (uniform) uniform.value = Math.max(0, radius);
  }
}

export interface PolycarbonateDiffusionProps {
  /** Diffusion strength [0, 1]. Default 0.5. */
  intensity?: number;
  /** Blur radius in texels. Default 1.5. */
  radius?: number;
  /** Luminance threshold below which pixels stay sharp. Default 0.15. */
  threshold?: number;
}

/**
 * React component wrapping `PolycarbonateDiffusionEffect`. Mount as a
 * child of `<EffectComposer />`, typically after `<UnrealBloom />`.
 *
 * The effect is implemented as a custom postprocessing.Effect so it
 * composes cleanly with other pmndrs/postprocessing passes in the
 * same composer (no extra render passes — Effects are merged into
 * a single EffectPass by the composer).
 */
export const PolycarbonateDiffusion = forwardRef<
  PolycarbonateDiffusionEffect,
  PolycarbonateDiffusionProps
>(function PolycarbonateDiffusion(props, ref) {
  const effect = useMemo(
    () => new PolycarbonateDiffusionEffect(props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.intensity, props.radius, props.threshold],
  );

  // Update ref so parent can call setIntensity/setRadius at runtime.
  React.useImperativeHandle(ref, () => effect, [effect]);

  // primitive is the R3F idiomatic way to mount an arbitrary Three /
  // postprocessing object into the scene graph.
  return <primitive object={effect} dispose={null} />;
});
