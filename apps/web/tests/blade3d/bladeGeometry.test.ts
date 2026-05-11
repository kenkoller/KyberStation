// ─── BladeGeometry Tests ──────────────────────────────────────────
//
// Unit tests for the segmented cylinder geometry used by the 3D blade.

import { describe, it, expect } from 'vitest';
import { createBladeGeometry, createBladeTipGeometry, createFullBladeGeometry } from '../../components/editor/blade3d/BladeGeometry';

describe('BladeGeometry', () => {
  describe('createBladeGeometry', () => {
    it('creates a cylinder with height segments equal to LED count', () => {
      const geo = createBladeGeometry({ ledCount: 144, radialSegments: 8 });
      const pos = geo.getAttribute('position');
      // CylinderGeometry with N height segments has (N+1) rings of (radialSegments+1) vertices
      // plus top/bottom cap vertices. Exact count depends on Three.js version's
      // cap tessellation strategy. Key invariant: body has 145 rings × 9 = 1305 verts,
      // plus caps. Verify the geometry is large enough to contain the body vertices.
      expect(pos.count).toBeGreaterThanOrEqual(1305);
      // And not unreasonably large (should be < 1500 with any cap strategy)
      expect(pos.count).toBeLessThan(1500);
      geo.dispose();
    });

    it('respects custom radius and length', () => {
      const radius = 0.025;
      const length = 1.5;
      const geo = createBladeGeometry({ radius, length, ledCount: 10, radialSegments: 8 });
      const pos = geo.getAttribute('position');

      // Check that vertex positions are within the expected bounds.
      // After translate(0, length/2, 0), Y range should be [0, length].
      let minY = Infinity;
      let maxY = -Infinity;
      let maxR = 0;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        maxR = Math.max(maxR, Math.sqrt(x * x + z * z));
      }

      expect(minY).toBeCloseTo(0, 3);
      expect(maxY).toBeCloseTo(length, 3);
      expect(maxR).toBeCloseTo(radius, 3);
      geo.dispose();
    });

    it('UV.y ranges from 0 (hilt) to 1 (tip)', () => {
      const geo = createBladeGeometry({ ledCount: 10, radialSegments: 4 });
      const uv = geo.getAttribute('uv');

      let minV = Infinity;
      let maxV = -Infinity;
      for (let i = 0; i < uv.count; i++) {
        const v = uv.getY(i);
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
      }

      expect(minV).toBeCloseTo(0, 2);
      expect(maxV).toBeCloseTo(1, 2);
      geo.dispose();
    });

    it('uses default values when no options provided', () => {
      const geo = createBladeGeometry();
      expect(geo).toBeDefined();
      expect(geo.type).toBe('CylinderGeometry');
      geo.dispose();
    });
  });

  describe('createBladeTipGeometry', () => {
    it('creates a hemisphere positioned at the blade tip', () => {
      const length = 1.0;
      const radius = 0.018;
      const tipGeo = createBladeTipGeometry({ length, radius, radialSegments: 8 });
      const pos = tipGeo.getAttribute('position');

      // All vertices should be near Y = length (tip)
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }

      // After rotating and translating, the hemisphere base should be at Y=length
      // and the dome extends below (towards hilt) by up to `radius`
      expect(minY).toBeGreaterThanOrEqual(length - radius - 0.001);
      expect(maxY).toBeCloseTo(length, 2);
      tipGeo.dispose();
    });
  });

  describe('createFullBladeGeometry', () => {
    it('merges cylinder and tip into one geometry', () => {
      const geo = createFullBladeGeometry({ ledCount: 10, radialSegments: 4 });
      expect(geo.getAttribute('position')).toBeDefined();
      expect(geo.getAttribute('normal')).toBeDefined();
      expect(geo.getAttribute('uv')).toBeDefined();
      geo.dispose();
    });

    it('returns just the cylinder when cappedTip is false', () => {
      const geo = createFullBladeGeometry({ ledCount: 10, radialSegments: 4, cappedTip: false });
      const plainCyl = createBladeGeometry({ ledCount: 10, radialSegments: 4, cappedTip: false });
      // Should have same vertex count since no tip is added
      expect(geo.getAttribute('position').count).toBe(plainCyl.getAttribute('position').count);
      geo.dispose();
      plainCyl.dispose();
    });
  });
});
