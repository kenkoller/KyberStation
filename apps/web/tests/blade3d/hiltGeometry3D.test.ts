// ─── HiltGeometry3D Tests ───────────────────────────────────────────
//
// Unit tests for SVG → LatheGeometry hilt conversion pipeline.

import { describe, it, expect } from 'vitest';
import {
  extractProfileFromPath,
  buildDefaultHiltProfile,
  createHiltLathGeometry,
  createHiltGeometry3D,
  createHiltMaterial,
} from '../../components/editor/blade3d/HiltGeometry3D';
import * as THREE from 'three';

describe('HiltGeometry3D', () => {
  describe('extractProfileFromPath', () => {
    it('extracts right-side profile from a simple rectangle path', () => {
      // Rectangle: 48 wide, 60 tall, centered at x=24
      // Points at x=0,y=0 / x=48,y=0 / x=48,y=60 / x=0,y=60
      const path = 'M 0 0 L 48 0 L 48 60 L 0 60 Z';
      const profile = extractProfileFromPath(path, 48);

      // Should extract rightmost points: radius = |48 - 24| * 0.001 = 0.024
      expect(profile.length).toBeGreaterThanOrEqual(2);

      // All radii should be 0.024 (24 SVG units from center)
      for (const p of profile) {
        expect(p.radius).toBeCloseTo(0.024, 4);
      }
    });

    it('extracts tapered profile from a trapezoid path', () => {
      // Trapezoid: wider at top (x=6..42), narrower at bottom (x=12..36)
      const path = 'M 6 0 L 42 0 L 36 60 L 12 60 Z';
      const profile = extractProfileFromPath(path, 48);

      expect(profile.length).toBeGreaterThanOrEqual(2);

      // Top (y=0): rightmost is x=42, radius = |42-24| * 0.001 = 0.018
      const topPoint = profile.find((p) => Math.abs(p.y) < 0.001);
      expect(topPoint).toBeDefined();
      expect(topPoint!.radius).toBeCloseTo(0.018, 4);

      // Bottom (y=60): rightmost is x=36, radius = |36-24| * 0.001 = 0.012
      const bottomPoint = profile.find((p) => Math.abs(p.y - 0.060) < 0.001);
      expect(bottomPoint).toBeDefined();
      expect(bottomPoint!.radius).toBeCloseTo(0.012, 4);
    });

    it('handles real Graflex emitter path', () => {
      const graflexPath = 'M 6 0 L 42 0 L 41 4 L 39 6 L 39 60 L 9 60 L 9 6 L 7 4 Z';
      const profile = extractProfileFromPath(graflexPath, 48);

      // Should have multiple Y levels from the path points
      expect(profile.length).toBeGreaterThanOrEqual(3);

      // Top should be wider (flared bell: x=42 → radius=0.018)
      const topProfile = profile[0];
      expect(topProfile.radius).toBeCloseTo(0.018, 4);

      // Body should be narrower (x=39 → radius=0.015)
      const bodyProfile = profile.find((p) => p.y > 0.005);
      expect(bodyProfile).toBeDefined();
      expect(bodyProfile!.radius).toBeCloseTo(0.015, 4);
    });

    it('returns fallback profile for empty path', () => {
      const profile = extractProfileFromPath('', 48);
      expect(profile.length).toBe(2);
      expect(profile[0].radius).toBeCloseTo(0.024, 4);
    });

    it('handles relative path commands (m/l)', () => {
      // Start at (0,0), relative moves to (48,0), (0,60), (-48,0)
      const path = 'M 0 0 l 48 0 l 0 60 l -48 0 Z';
      const profile = extractProfileFromPath(path, 48);
      expect(profile.length).toBeGreaterThanOrEqual(2);
      // Rightmost at y=0 and y=60 is x=48, radius = 0.024
      expect(profile[0].radius).toBeCloseTo(0.024, 4);
    });
  });

  describe('buildDefaultHiltProfile', () => {
    it('returns a profile with correct height', () => {
      const profile = buildDefaultHiltProfile(0.16, 0.022);
      const maxY = Math.max(...profile.map((p) => p.y));
      expect(maxY).toBeCloseTo(0.16, 3);
    });

    it('has decreasing radius from pommel to emitter', () => {
      const profile = buildDefaultHiltProfile(0.16, 0.022);
      const pommelRadius = profile[0].radius;
      const emitterRadius = profile[profile.length - 1].radius;
      expect(pommelRadius).toBeGreaterThan(emitterRadius);
    });

    it('uses default values when called with no args', () => {
      const profile = buildDefaultHiltProfile();
      expect(profile.length).toBeGreaterThanOrEqual(4);
      const maxY = Math.max(...profile.map((p) => p.y));
      expect(maxY).toBeCloseTo(0.16, 3);
    });
  });

  describe('createHiltLathGeometry', () => {
    it('creates a LatheGeometry from a profile', () => {
      const profile = buildDefaultHiltProfile();
      const geo = createHiltLathGeometry(profile);
      expect(geo).toBeInstanceOf(THREE.LatheGeometry);
      expect(geo.getAttribute('position')).toBeDefined();
      geo.dispose();
    });

    it('respects custom segment count', () => {
      const profile = buildDefaultHiltProfile();
      const geo8 = createHiltLathGeometry(profile, 8);
      const geo16 = createHiltLathGeometry(profile, 16);

      // More segments = more vertices
      const count8 = geo8.getAttribute('position').count;
      const count16 = geo16.getAttribute('position').count;
      expect(count16).toBeGreaterThan(count8);

      geo8.dispose();
      geo16.dispose();
    });
  });

  describe('createHiltGeometry3D', () => {
    it('creates geometry positioned below Y=0 (blade junction)', () => {
      const geo = createHiltGeometry3D(null);
      const pos = geo.getAttribute('position');

      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }

      // Hilt should be below Y=0 (blade starts at Y=0)
      expect(maxY).toBeLessThanOrEqual(0.001);
      // And extend downward
      expect(minY).toBeLessThan(-0.05);

      geo.dispose();
    });

    it('creates geometry with reasonable radius', () => {
      const geo = createHiltGeometry3D(null);
      const pos = geo.getAttribute('position');

      let maxR = 0;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        maxR = Math.max(maxR, Math.sqrt(x * x + z * z));
      }

      // Default hilt radius should be around 0.022-0.025
      expect(maxR).toBeGreaterThan(0.015);
      expect(maxR).toBeLessThan(0.04);

      geo.dispose();
    });
  });

  describe('createHiltMaterial', () => {
    it('creates a MeshStandardMaterial with metallic properties', () => {
      const mat = createHiltMaterial();
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(mat.metalness).toBeGreaterThan(0.8);
      expect(mat.roughness).toBeLessThan(0.5);
      mat.dispose();
    });
  });
});
