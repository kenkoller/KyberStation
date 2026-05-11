// ─── BladeBloom Tests ─────────────────────────────────────────────
//
// Unit tests for the bloom post-processing component.
// EffectComposer + Bloom require WebGL/R3F context unavailable in
// unit tests. We test the module's export shape and the enabled-gating
// logic at the function level.
//
// Integration-level bloom rendering is covered by browser-based
// visual verification (preview_screenshot on the 3D view toggle).

import { describe, it, expect, vi } from 'vitest';

// Mock postprocessing modules so the import doesn't fail in test env
vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: vi.fn(),
  Bloom: vi.fn(),
}));

vi.mock('postprocessing', () => ({
  KernelSize: { LARGE: 2 },
}));

describe('BladeBloom', () => {
  it('exports BladeBloom as a function', async () => {
    const mod = await import('../../components/editor/blade3d/BladeBloom');
    expect(mod.BladeBloom).toBeDefined();
    expect(typeof mod.BladeBloom).toBe('function');
  });

  it('returns null when enabled is false', async () => {
    const { BladeBloom } = await import('../../components/editor/blade3d/BladeBloom');
    const result = BladeBloom({ enabled: false });
    expect(result).toBeNull();
  });

  it('returns non-null when enabled is true (bloom active)', async () => {
    const { BladeBloom } = await import('../../components/editor/blade3d/BladeBloom');
    // With mocked EffectComposer/Bloom, the JSX won't render real GL,
    // but the function should still return a truthy element
    const result = BladeBloom({ enabled: true });
    expect(result).not.toBeNull();
  });

  it('returns non-null with default props (enabled by default)', async () => {
    const { BladeBloom } = await import('../../components/editor/blade3d/BladeBloom');
    const result = BladeBloom({});
    expect(result).not.toBeNull();
  });

  it('accepts all optional props without throwing', async () => {
    const { BladeBloom } = await import('../../components/editor/blade3d/BladeBloom');
    // Verify the function signature matches the props interface
    expect(() => {
      BladeBloom({
        intensity: 1.2,
        luminanceThreshold: 0.3,
        luminanceSmoothing: 0.5,
        mipmapBlur: false,
        enabled: true,
      });
    }).not.toThrow();
  });

  it('is a single-argument function (props object)', async () => {
    const { BladeBloom } = await import('../../components/editor/blade3d/BladeBloom');
    expect(BladeBloom.length).toBe(1);
  });
});
