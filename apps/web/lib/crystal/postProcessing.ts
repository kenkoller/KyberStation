// ─── Kyber Crystal — Post-Processing ───
//
// EffectComposer pipeline for the crystal render. The headline pass is
// UnrealBloomPass on the internal highlights — the single biggest
// "this reads as real glass" lever.
//
// Kept small and self-contained so the React wrapper can instantiate
// it conditionally (performance tier gating) and dispose cleanly on
// unmount.
//
// See `docs/KYBER_CRYSTAL_3D.md` §9 for perf budget — bloom at 0.5
// resolution + small viewport stays well under the 4ms slice.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export interface CrystalPostProcessingOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  size: { width: number; height: number };
  /**
   * Pixel-ratio multiplier for the bloom work buffers. 0.5 halves the
   * buffer size → 4× less fragment work at the cost of a slightly
   * softer glow. 0.5 is the sweet spot on mid-tier laptops.
   */
  bloomResolutionScale?: number;
}

export interface CrystalPostProcessingHandle {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  setSize(width: number, height: number): void;
  render(delta: number): void;
  dispose(): void;
}

/**
 * Build an EffectComposer with:
 *   RenderPass (scene → main buffer)
 *   → UnrealBloomPass (bright highlights get a wide soft halo)
 *   → OutputPass (tone-mapping + encoding to the canvas)
 *
 * Parameters tuned for the crystal's scale:
 *   - strength 0.8 — punchy but not overexposed
 *   - radius 0.6   — soft bloom halo
 *   - threshold 0.5 — bloom the inner glow + highlights, not the body
 */
export function createCrystalPostProcessing(
  opts: CrystalPostProcessingOptions,
): CrystalPostProcessingHandle {
  const { scene, camera, renderer, size } = opts;
  const resScale = opts.bloomResolutionScale ?? 0.5;

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(size.width, size.height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomResolution = new THREE.Vector2(
    Math.max(1, Math.floor(size.width * resScale)),
    Math.max(1, Math.floor(size.height * resScale)),
  );
  const bloomPass = new UnrealBloomPass(
    bloomResolution,
    /* strength  */ 0.8,
    /* radius    */ 0.6,
    /* threshold */ 0.5,
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  function setSize(width: number, height: number): void {
    composer.setSize(width, height);
    bloomPass.setSize(Math.max(1, Math.floor(width * resScale)), Math.max(1, Math.floor(height * resScale)));
  }

  function render(delta: number): void {
    composer.render(delta);
  }

  function dispose(): void {
    // EffectComposer disposes its render targets; bloom pass holds
    // internal targets that must also be disposed.
    bloomPass.dispose();
    composer.dispose();
  }

  return { composer, bloomPass, setSize, render, dispose };
}
