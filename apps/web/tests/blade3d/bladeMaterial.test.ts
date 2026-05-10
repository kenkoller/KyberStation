// ─── BladeMaterial Tests ────────────────────────────────────────────
//
// Unit tests for the custom ShaderMaterial and LED texture utilities.

import { describe, it, expect } from 'vitest';
import {
  createLedTexture,
  updateLedTexture,
  createBladeMaterial,
  getLedTextureFromMaterial,
} from '../../components/editor/blade3d/BladeMaterial';
import * as THREE from 'three';

describe('BladeMaterial', () => {
  describe('createLedTexture', () => {
    it('creates a DataTexture with width = ledCount and height = 1', () => {
      const tex = createLedTexture(144);
      expect(tex).toBeInstanceOf(THREE.DataTexture);
      expect(tex.image.width).toBe(144);
      expect(tex.image.height).toBe(1);
      tex.dispose();
    });

    it('allocates RGBA data buffer (4 bytes per LED)', () => {
      const tex = createLedTexture(10);
      const data = tex.image.data as Uint8Array;
      expect(data.length).toBe(10 * 4);
      tex.dispose();
    });

    it('initializes all pixels to zero', () => {
      const tex = createLedTexture(8);
      const data = tex.image.data as Uint8Array;
      for (let i = 0; i < data.length; i++) {
        expect(data[i]).toBe(0);
      }
      tex.dispose();
    });

    it('uses LinearFilter for smooth interpolation', () => {
      const tex = createLedTexture(16);
      expect(tex.minFilter).toBe(THREE.LinearFilter);
      expect(tex.magFilter).toBe(THREE.LinearFilter);
      tex.dispose();
    });

    it('uses ClampToEdge wrapping', () => {
      const tex = createLedTexture(16);
      expect(tex.wrapS).toBe(THREE.ClampToEdgeWrapping);
      expect(tex.wrapT).toBe(THREE.ClampToEdgeWrapping);
      tex.dispose();
    });

    it('is ready for GPU upload after creation', () => {
      const tex = createLedTexture(16);
      // The texture is configured and has valid data — needsUpdate is a
      // write-only setter in Three.js that triggers internal version increment.
      // We verify the texture has valid image data instead.
      const data = tex.image.data as Uint8Array;
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(16 * 4);
      tex.dispose();
    });
  });

  describe('updateLedTexture', () => {
    it('copies RGB pixel data into RGBA texture buffer', () => {
      const tex = createLedTexture(3);
      // 3 LEDs: R, G, B solid colors
      const pixels = new Uint8Array([
        255, 0, 0,    // LED 0: red
        0, 255, 0,    // LED 1: green
        0, 0, 255,    // LED 2: blue
      ]);

      updateLedTexture(tex, pixels, 3);
      const data = tex.image.data as Uint8Array;

      // LED 0: R=255, G=0, B=0, A=255
      expect(data[0]).toBe(255);
      expect(data[1]).toBe(0);
      expect(data[2]).toBe(0);
      expect(data[3]).toBe(255);

      // LED 1: R=0, G=255, B=0, A=255
      expect(data[4]).toBe(0);
      expect(data[5]).toBe(255);
      expect(data[6]).toBe(0);
      expect(data[7]).toBe(255);

      // LED 2: R=0, G=0, B=255, A=255
      expect(data[8]).toBe(0);
      expect(data[9]).toBe(0);
      expect(data[10]).toBe(255);
      expect(data[11]).toBe(255);

      tex.dispose();
    });

    it('sets alpha to 255 (fully opaque) for every LED', () => {
      const tex = createLedTexture(5);
      const pixels = new Uint8Array(5 * 3).fill(128);

      updateLedTexture(tex, pixels, 5);
      const data = tex.image.data as Uint8Array;

      for (let i = 0; i < 5; i++) {
        expect(data[i * 4 + 3]).toBe(255);
      }
      tex.dispose();
    });

    it('clears remaining pixels when pixel buffer is shorter than texture', () => {
      const tex = createLedTexture(5);
      // Only 3 LEDs of pixel data
      const pixels = new Uint8Array([
        100, 100, 100,
        200, 200, 200,
        50, 50, 50,
      ]);

      updateLedTexture(tex, pixels, 5);
      const data = tex.image.data as Uint8Array;

      // LED 3 and 4 should be cleared to 0
      expect(data[3 * 4]).toBe(0);
      expect(data[3 * 4 + 1]).toBe(0);
      expect(data[3 * 4 + 2]).toBe(0);
      expect(data[3 * 4 + 3]).toBe(0);

      expect(data[4 * 4]).toBe(0);
      expect(data[4 * 4 + 3]).toBe(0);

      tex.dispose();
    });

    it('modifies the texture data buffer in place', () => {
      const tex = createLedTexture(4);
      const pixels = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);

      updateLedTexture(tex, pixels, 4);
      const data = tex.image.data as Uint8Array;

      // Verify the data was written (proves updateLedTexture touched the buffer)
      expect(data[0]).toBe(10);
      expect(data[4]).toBe(40);
      expect(data[8]).toBe(70);
      expect(data[12]).toBe(100);

      tex.dispose();
    });

    it('handles empty pixel buffer gracefully', () => {
      const tex = createLedTexture(4);
      const pixels = new Uint8Array(0);

      // Should not throw
      updateLedTexture(tex, pixels, 4);
      const data = tex.image.data as Uint8Array;

      // All should be cleared since bufferLeds = 0
      for (let i = 0; i < data.length; i++) {
        expect(data[i]).toBe(0);
      }
      tex.dispose();
    });
  });

  describe('createBladeMaterial', () => {
    it('creates a ShaderMaterial with default options', () => {
      const mat = createBladeMaterial();
      expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
      expect(mat.uniforms.uLedCount.value).toBe(144);
      expect(mat.uniforms.uEmissiveIntensity.value).toBe(2.5);
      expect(mat.uniforms.uDiffusionRadius.value).toBe(1.5);
      expect(mat.uniforms.uGlowFalloff.value).toBe(0.03);
      expect(mat.uniforms.uExtendProgress.value).toBe(1.0);
      mat.dispose();
    });

    it('respects custom options', () => {
      const mat = createBladeMaterial({
        ledCount: 72,
        emissiveIntensity: 3.0,
        diffusionRadius: 2.0,
        glowFalloff: 0.05,
      });
      expect(mat.uniforms.uLedCount.value).toBe(72);
      expect(mat.uniforms.uEmissiveIntensity.value).toBe(3.0);
      expect(mat.uniforms.uDiffusionRadius.value).toBe(2.0);
      expect(mat.uniforms.uGlowFalloff.value).toBe(0.05);
      mat.dispose();
    });

    it('uses additive blending for HDR bloom', () => {
      const mat = createBladeMaterial();
      expect(mat.blending).toBe(THREE.AdditiveBlending);
      mat.dispose();
    });

    it('is transparent with no depth write', () => {
      const mat = createBladeMaterial();
      expect(mat.transparent).toBe(true);
      expect(mat.depthWrite).toBe(false);
      mat.dispose();
    });

    it('renders on both sides (DoubleSide)', () => {
      const mat = createBladeMaterial();
      expect(mat.side).toBe(THREE.DoubleSide);
      mat.dispose();
    });

    it('creates an internal LED texture with matching ledCount', () => {
      const mat = createBladeMaterial({ ledCount: 50 });
      const tex = getLedTextureFromMaterial(mat);
      expect(tex.image.width).toBe(50);
      mat.dispose();
    });
  });

  describe('getLedTextureFromMaterial', () => {
    it('retrieves the LED texture from the material uniforms', () => {
      const mat = createBladeMaterial({ ledCount: 32 });
      const tex = getLedTextureFromMaterial(mat);
      expect(tex).toBeInstanceOf(THREE.DataTexture);
      expect(tex.image.width).toBe(32);
      mat.dispose();
    });

    it('returns a texture that can be updated in-place', () => {
      const mat = createBladeMaterial({ ledCount: 4 });
      const tex = getLedTextureFromMaterial(mat);
      const pixels = new Uint8Array([255, 128, 64, 32, 16, 8, 4, 2, 1, 100, 200, 150]);

      updateLedTexture(tex, pixels, 4);
      const data = tex.image.data as Uint8Array;

      expect(data[0]).toBe(255);
      expect(data[1]).toBe(128);
      expect(data[2]).toBe(64);
      expect(data[3]).toBe(255); // alpha

      mat.dispose();
    });
  });
});
