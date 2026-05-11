// ─── BladeMaterial ──────────────────────────────────────────────────
//
// Custom ShaderMaterial for the 3D blade that reads per-LED colors
// from a DataTexture uniform. Each frame, the LED buffer from
// BladeEngine is uploaded to the texture, and the shader samples
// it based on the fragment's V coordinate (position along the blade).
//
// The material uses:
//   - Emissive lighting only (blade is self-luminous, no external light)
//   - Gaussian blur along the V axis to simulate polycarbonate diffusion
//   - Alpha falloff at the tip for a soft glow termination
//   - HDR emissive intensity for bloom post-processing

import * as THREE from 'three';

/** Vertex shader — passes UV and normal to fragment */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

/** Fragment shader — samples LED texture + applies diffusion + glow */
const fragmentShader = /* glsl */ `
  uniform sampler2D uLedTexture;
  uniform float uLedCount;
  uniform float uExtendProgress;
  uniform float uEmissiveIntensity;
  uniform float uDiffusionRadius;
  uniform float uGlowFalloff;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  // Sample LED color at a given position along the blade (0..1)
  vec3 sampleLed(float v) {
    // LED texture is 1D (width=ledCount, height=1)
    float u = clamp(v, 0.0, 1.0);
    return texture2D(uLedTexture, vec2(u, 0.5)).rgb;
  }

  // Gaussian-weighted blur along the blade axis for polycarbonate diffusion
  vec3 sampleWithDiffusion(float v) {
    if (uDiffusionRadius <= 0.0) {
      return sampleLed(v);
    }

    // 5-tap Gaussian kernel
    float sigma = uDiffusionRadius / uLedCount;
    float weights[5];
    float offsets[5];
    weights[0] = 0.382925;
    weights[1] = 0.241730;
    weights[2] = 0.241730;
    weights[3] = 0.060598;
    weights[4] = 0.060598;
    offsets[0] = 0.0;
    offsets[1] = 1.0 / uLedCount;
    offsets[2] = -1.0 / uLedCount;
    offsets[3] = 2.0 / uLedCount;
    offsets[4] = -2.0 / uLedCount;

    vec3 color = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      color += sampleLed(v + offsets[i] * uDiffusionRadius) * weights[i];
    }
    return color;
  }

  void main() {
    // V coordinate = position along blade (0 = hilt, 1 = tip)
    float v = vUv.y;

    // Mask by extend progress (ignition/retraction animation)
    if (v > uExtendProgress) {
      discard;
    }

    // Sample LED color with diffusion
    vec3 ledColor = sampleWithDiffusion(v);

    // Fresnel-like edge glow (brighter at glancing angles)
    float fresnel = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    float edgeGlow = pow(fresnel, 2.0) * 0.3;

    // Tip falloff (soft termination near the tip)
    float tipFade = 1.0;
    if (v > uExtendProgress - uGlowFalloff) {
      tipFade = (uExtendProgress - v) / uGlowFalloff;
      tipFade = clamp(tipFade, 0.0, 1.0);
      tipFade = tipFade * tipFade; // Quadratic falloff
    }

    // Final emissive color
    vec3 emissive = ledColor * (1.0 + edgeGlow) * tipFade * uEmissiveIntensity;

    gl_FragColor = vec4(emissive, tipFade);
  }
`;

export interface BladeMaterialOptions {
  /** Number of LEDs. Default: 144 */
  ledCount?: number;
  /** Emissive intensity (HDR, > 1 for bloom). Default: 2.5 */
  emissiveIntensity?: number;
  /** Diffusion radius in LED units (how far light bleeds). Default: 1.5 */
  diffusionRadius?: number;
  /** Tip glow falloff distance as fraction of blade. Default: 0.03 */
  glowFalloff?: number;
}

/**
 * Create the LED DataTexture — a 1D texture (width=ledCount, height=1)
 * where each pixel stores the RGB color of one LED.
 */
export function createLedTexture(ledCount: number): THREE.DataTexture {
  // RGBA format, 4 bytes per pixel
  const data = new Uint8Array(ledCount * 4);
  const texture = new THREE.DataTexture(
    data,
    ledCount,  // width
    1,         // height
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Update the LED texture from the engine's pixel buffer.
 * Call this every frame in the render loop.
 *
 * @param texture - The DataTexture to update
 * @param pixels - Engine's getPixels() result (Uint8Array of RGB triplets)
 * @param ledCount - Number of LEDs to read
 */
export function updateLedTexture(
  texture: THREE.DataTexture,
  pixels: Uint8Array,
  ledCount: number,
): void {
  const data = texture.image.data as Uint8Array;
  const bufferLeds = Math.floor(pixels.length / 3);
  const count = Math.min(ledCount, bufferLeds, texture.image.width);

  for (let i = 0; i < count; i++) {
    const srcIdx = i * 3;
    const dstIdx = i * 4;
    data[dstIdx] = pixels[srcIdx];       // R
    data[dstIdx + 1] = pixels[srcIdx + 1]; // G
    data[dstIdx + 2] = pixels[srcIdx + 2]; // B
    data[dstIdx + 3] = 255;               // A (fully opaque)
  }

  // Clear remaining pixels (if ledCount < texture width)
  for (let i = count; i < texture.image.width; i++) {
    const dstIdx = i * 4;
    data[dstIdx] = 0;
    data[dstIdx + 1] = 0;
    data[dstIdx + 2] = 0;
    data[dstIdx + 3] = 0;
  }

  texture.needsUpdate = true;
}

/**
 * Create the custom ShaderMaterial for the blade.
 */
export function createBladeMaterial(options?: BladeMaterialOptions): THREE.ShaderMaterial {
  const ledCount = options?.ledCount ?? 144;
  const emissiveIntensity = options?.emissiveIntensity ?? 2.5;
  const diffusionRadius = options?.diffusionRadius ?? 1.5;
  const glowFalloff = options?.glowFalloff ?? 0.03;

  const ledTexture = createLedTexture(ledCount);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uLedTexture: { value: ledTexture },
      uLedCount: { value: ledCount },
      uExtendProgress: { value: 1.0 },
      uEmissiveIntensity: { value: emissiveIntensity },
      uDiffusionRadius: { value: diffusionRadius },
      uGlowFalloff: { value: glowFalloff },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  return material;
}

/**
 * Get the LED texture from a blade material for per-frame updates.
 */
export function getLedTextureFromMaterial(material: THREE.ShaderMaterial): THREE.DataTexture {
  return material.uniforms.uLedTexture.value as THREE.DataTexture;
}
