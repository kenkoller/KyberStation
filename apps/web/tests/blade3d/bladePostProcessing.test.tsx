// ─── BladePostProcessing Tests ────────────────────────────────────
//
// Phase 2D of the Visualizer Upgrade Plan: post-processing pipeline
// for the 3D blade scene (UnrealBloom + PolycarbonateDiffusion +
// BladeMotionBlur).
//
// EffectComposer + Effect classes require WebGL/R3F context that's
// not available in a node test environment, so we:
//   1. Mock @react-three/postprocessing + @react-three/fiber for the
//      module-level imports to resolve cleanly.
//   2. Unit-test the pure config-resolution logic + the per-pass
//      helper math (intensity scaling, swing→strength mapping, etc.).
//   3. Verify the postprocessing.Effect subclasses construct + expose
//      the live-setter API the composer uses each frame.
//
// Integration-level rendering coverage lives in the browser-based
// visual checks (preview_screenshot on the 3D view toggle); the
// same precedent as bladeBloom.test.ts.

import { describe, it, expect, vi } from 'vitest';

// ─── Module mocks ─────────────────────────────────────────────────
// @react-three/postprocessing — replace with stubs so imports succeed.
vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: vi.fn(({ children }: { children?: unknown }) => children ?? null),
  Bloom: vi.fn(() => null),
}));

// @react-three/fiber — useFrame needs a stub for the motion-blur wrapper.
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

// postprocessing — pmndrs/postprocessing. KernelSize is the only enum
// we import; BlendFunction + Effect are exercised by the custom
// effects so we let those pass through to the real module.
vi.mock('postprocessing', async () => {
  const actual =
    await vi.importActual<typeof import('postprocessing')>('postprocessing');
  return {
    ...actual,
    KernelSize: actual.KernelSize ?? { LARGE: 2, MEDIUM: 1, SMALL: 0 },
  };
});

// ─── resolvePostProcessingConfig (pure gating logic) ───────────────

describe('resolvePostProcessingConfig', () => {
  it('returns null when enabled is false (entire composer off)', async () => {
    const { resolvePostProcessingConfig } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    expect(resolvePostProcessingConfig({ enabled: false })).toBeNull();
  });

  it('returns null when graphicsQuality is "low"', async () => {
    const { resolvePostProcessingConfig } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    expect(resolvePostProcessingConfig({ graphicsQuality: 'low' })).toBeNull();
  });

  it('returns full pipeline at high quality on desktop (defaults)', async () => {
    const { resolvePostProcessingConfig, BASE_BLOOM_INTENSITY, BASE_DIFFUSION_INTENSITY } =
      await import('@/components/editor/blade3d/postprocessing/BladePostProcessing');
    const cfg = resolvePostProcessingConfig({});
    expect(cfg).not.toBeNull();
    expect(cfg!.bloom.enabled).toBe(true);
    expect(cfg!.bloom.intensity).toBe(BASE_BLOOM_INTENSITY);
    expect(cfg!.diffusion.enabled).toBe(true);
    expect(cfg!.diffusion.intensity).toBe(BASE_DIFFUSION_INTENSITY);
    expect(cfg!.motionBlur.enabled).toBe(true);
  });

  it('halves diffusion intensity on mobile', async () => {
    const { resolvePostProcessingConfig, BASE_DIFFUSION_INTENSITY } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    const cfg = resolvePostProcessingConfig({ isMobile: true });
    expect(cfg!.diffusion.intensity).toBeCloseTo(BASE_DIFFUSION_INTENSITY * 0.5, 5);
  });

  it('disables motion blur on mobile', async () => {
    const { resolvePostProcessingConfig } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    expect(resolvePostProcessingConfig({ isMobile: true })!.motionBlur.enabled).toBe(false);
  });

  it('disables motion blur and halves diffusion at "medium" tier', async () => {
    const { resolvePostProcessingConfig, BASE_DIFFUSION_INTENSITY } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    const cfg = resolvePostProcessingConfig({ graphicsQuality: 'medium' });
    expect(cfg!.motionBlur.enabled).toBe(false);
    expect(cfg!.diffusion.intensity).toBeCloseTo(BASE_DIFFUSION_INTENSITY * 0.5, 5);
  });

  it('disables motion blur under prefers-reduced-motion', async () => {
    const { resolvePostProcessingConfig } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    expect(
      resolvePostProcessingConfig({ reducedMotion: true })!.motionBlur.enabled,
    ).toBe(false);
  });

  it('scales bloom intensity down (~40%) when reduceBloom is true', async () => {
    const { resolvePostProcessingConfig, BASE_BLOOM_INTENSITY } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    const cfg = resolvePostProcessingConfig({ reduceBloom: true });
    expect(cfg!.bloom.intensity).toBeCloseTo(BASE_BLOOM_INTENSITY * 0.4, 5);
  });

  it('scales bloom intensity down under prefers-reduced-motion', async () => {
    const { resolvePostProcessingConfig, BASE_BLOOM_INTENSITY } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    const cfg = resolvePostProcessingConfig({ reducedMotion: true });
    expect(cfg!.bloom.intensity).toBeCloseTo(BASE_BLOOM_INTENSITY * 0.4, 5);
  });

  it('honors a custom bloomIntensity override (tests + tuning)', async () => {
    const { resolvePostProcessingConfig } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    const cfg = resolvePostProcessingConfig({ bloomIntensity: 3.0 });
    expect(cfg!.bloom.intensity).toBe(3.0);
  });

  it('honors a custom diffusionIntensity override', async () => {
    const { resolvePostProcessingConfig } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    const cfg = resolvePostProcessingConfig({ diffusionIntensity: 0.8 });
    expect(cfg!.diffusion.intensity).toBe(0.8);
  });
});

// ─── resolveBloomIntensity (UnrealBloom helper) ──────────────────────

describe('resolveBloomIntensity', () => {
  it('passes through base intensity when no a11y flags are set', async () => {
    const { resolveBloomIntensity } = await import(
      '@/components/editor/blade3d/postprocessing/UnrealBloom'
    );
    expect(resolveBloomIntensity(1.8)).toBe(1.8);
    expect(resolveBloomIntensity(2.5, {})).toBe(2.5);
  });

  it('drops intensity to ~40% when reduceBloom is true', async () => {
    const { resolveBloomIntensity } = await import(
      '@/components/editor/blade3d/postprocessing/UnrealBloom'
    );
    expect(resolveBloomIntensity(1.0, { reduceBloom: true })).toBeCloseTo(0.4, 5);
  });

  it('drops intensity when reducedMotion is true', async () => {
    const { resolveBloomIntensity } = await import(
      '@/components/editor/blade3d/postprocessing/UnrealBloom'
    );
    expect(resolveBloomIntensity(2.0, { reducedMotion: true })).toBeCloseTo(0.8, 5);
  });
});

// ─── swingSpeedToBlurStrength (motion blur math) ─────────────────────

describe('swingSpeedToBlurStrength', () => {
  it('returns 0 for swing speeds inside the dead zone', async () => {
    const { swingSpeedToBlurStrength, MOTION_BLUR_DEAD_ZONE } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    expect(swingSpeedToBlurStrength(0)).toBe(0);
    expect(swingSpeedToBlurStrength(MOTION_BLUR_DEAD_ZONE - 0.001)).toBe(0);
    expect(swingSpeedToBlurStrength(MOTION_BLUR_DEAD_ZONE)).toBe(0);
  });

  it('returns >0 for swing speeds above the dead zone', async () => {
    const { swingSpeedToBlurStrength, MOTION_BLUR_DEAD_ZONE } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    expect(swingSpeedToBlurStrength(MOTION_BLUR_DEAD_ZONE + 0.1)).toBeGreaterThan(0);
    expect(swingSpeedToBlurStrength(0.5)).toBeGreaterThan(0);
  });

  it('saturates at MOTION_BLUR_MAX_STRENGTH for swing speed of 1', async () => {
    const { swingSpeedToBlurStrength, MOTION_BLUR_MAX_STRENGTH } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    expect(swingSpeedToBlurStrength(1)).toBeCloseTo(MOTION_BLUR_MAX_STRENGTH, 5);
    expect(swingSpeedToBlurStrength(2)).toBeCloseTo(MOTION_BLUR_MAX_STRENGTH, 5);
  });

  it('scales monotonically with swing speed', async () => {
    const { swingSpeedToBlurStrength } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    const a = swingSpeedToBlurStrength(0.3);
    const b = swingSpeedToBlurStrength(0.6);
    const c = swingSpeedToBlurStrength(0.9);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

// ─── bladeAngleToBlurDirection (motion blur direction) ───────────────

describe('bladeAngleToBlurDirection', () => {
  it('returns horizontal direction at angle 0', async () => {
    const { bladeAngleToBlurDirection } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    const [x, y] = bladeAngleToBlurDirection(0);
    expect(x).toBeCloseTo(1, 5);
    expect(y).toBeCloseTo(0, 5);
  });

  it('returns near-vertical direction at angle +1', async () => {
    const { bladeAngleToBlurDirection } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    const [x, y] = bladeAngleToBlurDirection(1);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(1, 5);
  });

  it('returns near-vertical (negative) direction at angle -1', async () => {
    const { bladeAngleToBlurDirection } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    const [x, y] = bladeAngleToBlurDirection(-1);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(-1, 5);
  });

  it('returns a unit vector at all angles', async () => {
    const { bladeAngleToBlurDirection } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    for (const angle of [-0.8, -0.4, 0, 0.4, 0.8]) {
      const [x, y] = bladeAngleToBlurDirection(angle);
      expect(Math.sqrt(x * x + y * y)).toBeCloseTo(1, 5);
    }
  });
});

// ─── PolycarbonateDiffusionEffect (Effect subclass) ──────────────────

describe('PolycarbonateDiffusionEffect', () => {
  it('constructs with default options', async () => {
    const { PolycarbonateDiffusionEffect } = await import(
      '@/components/editor/blade3d/postprocessing/PolycarbonateDiffusion'
    );
    const eff = new PolycarbonateDiffusionEffect();
    expect(eff).toBeDefined();
    expect(eff.uniforms.get('uIntensity')?.value).toBe(0.5);
    expect(eff.uniforms.get('uRadius')?.value).toBe(1.5);
    expect(eff.uniforms.get('uThreshold')?.value).toBe(0.15);
  });

  it('constructs with custom options', async () => {
    const { PolycarbonateDiffusionEffect } = await import(
      '@/components/editor/blade3d/postprocessing/PolycarbonateDiffusion'
    );
    const eff = new PolycarbonateDiffusionEffect({
      intensity: 0.9,
      radius: 3.0,
      threshold: 0.2,
    });
    expect(eff.uniforms.get('uIntensity')?.value).toBe(0.9);
    expect(eff.uniforms.get('uRadius')?.value).toBe(3.0);
    expect(eff.uniforms.get('uThreshold')?.value).toBe(0.2);
  });

  it('setIntensity updates the uniform', async () => {
    const { PolycarbonateDiffusionEffect } = await import(
      '@/components/editor/blade3d/postprocessing/PolycarbonateDiffusion'
    );
    const eff = new PolycarbonateDiffusionEffect();
    eff.setIntensity(0.8);
    expect(eff.uniforms.get('uIntensity')?.value).toBe(0.8);
  });

  it('setIntensity clamps negative values to 0', async () => {
    const { PolycarbonateDiffusionEffect } = await import(
      '@/components/editor/blade3d/postprocessing/PolycarbonateDiffusion'
    );
    const eff = new PolycarbonateDiffusionEffect();
    eff.setIntensity(-0.5);
    expect(eff.uniforms.get('uIntensity')?.value).toBe(0);
  });

  it('setRadius updates the uniform', async () => {
    const { PolycarbonateDiffusionEffect } = await import(
      '@/components/editor/blade3d/postprocessing/PolycarbonateDiffusion'
    );
    const eff = new PolycarbonateDiffusionEffect();
    eff.setRadius(4.0);
    expect(eff.uniforms.get('uRadius')?.value).toBe(4.0);
  });
});

// ─── BladeMotionBlurEffect (Effect subclass) ─────────────────────────

describe('BladeMotionBlurEffect', () => {
  it('constructs with default options (strength 0, horizontal direction)', async () => {
    const { BladeMotionBlurEffect } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    const eff = new BladeMotionBlurEffect();
    expect(eff.strength).toBe(0);
    const dir = eff.uniforms.get('uDirection')?.value;
    expect(dir.x).toBe(1);
    expect(dir.y).toBe(0);
  });

  it('setStrength updates the uniform', async () => {
    const { BladeMotionBlurEffect } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    const eff = new BladeMotionBlurEffect();
    eff.setStrength(0.6);
    expect(eff.strength).toBe(0.6);
  });

  it('setStrength clamps negative values to 0', async () => {
    const { BladeMotionBlurEffect } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    const eff = new BladeMotionBlurEffect();
    eff.setStrength(-1);
    expect(eff.strength).toBe(0);
  });

  it('setDirection mutates the Vector2 uniform in place', async () => {
    const { BladeMotionBlurEffect } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    const eff = new BladeMotionBlurEffect();
    eff.setDirection(0, 1);
    const dir = eff.uniforms.get('uDirection')?.value;
    expect(dir.x).toBe(0);
    expect(dir.y).toBe(1);
  });

  it('accepts strength above 1 (extra streak — no upper clamp)', async () => {
    const { BladeMotionBlurEffect } = await import(
      '@/components/editor/blade3d/postprocessing/BladeMotionBlur'
    );
    const eff = new BladeMotionBlurEffect();
    eff.setStrength(1.5);
    expect(eff.strength).toBe(1.5);
  });
});

// ─── Module export shape ─────────────────────────────────────────────

describe('postprocessing module exports', () => {
  it('exports BladePostProcessing as a function', async () => {
    const mod = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    expect(mod.BladePostProcessing).toBeDefined();
    expect(typeof mod.BladePostProcessing).toBe('function');
  });

  it('exports UnrealBloom as a function', async () => {
    const mod = await import(
      '@/components/editor/blade3d/postprocessing/UnrealBloom'
    );
    expect(mod.UnrealBloom).toBeDefined();
    expect(typeof mod.UnrealBloom).toBe('function');
  });

  it('exports the three pass components from the barrel', async () => {
    const mod = await import(
      '@/components/editor/blade3d/postprocessing'
    );
    expect(mod.UnrealBloom).toBeDefined();
    expect(mod.PolycarbonateDiffusion).toBeDefined();
    expect(mod.BladeMotionBlur).toBeDefined();
    expect(mod.BladePostProcessing).toBeDefined();
  });

  it('re-exports from the parent blade3d barrel', async () => {
    const mod = await import('@/components/editor/blade3d');
    expect(mod.BladePostProcessing).toBeDefined();
    expect(mod.swingSpeedToBlurStrength).toBeDefined();
    expect(mod.bladeAngleToBlurDirection).toBeDefined();
    expect(mod.resolvePostProcessingConfig).toBeDefined();
    // Original BladeBloom still exported (backward compat).
    expect(mod.BladeBloom).toBeDefined();
  });
});

// ─── Backward compat — legacy BladeBloom still loads ─────────────────

describe('BladeBloom (legacy — Phase 2A)', () => {
  it('still mounts cleanly (Phase 2A backward-compat during 2D transition)', async () => {
    const mod = await import('@/components/editor/blade3d/BladeBloom');
    expect(mod.BladeBloom).toBeDefined();
    expect(typeof mod.BladeBloom).toBe('function');
    // enabled=false still short-circuits to null.
    expect(mod.BladeBloom({ enabled: false })).toBeNull();
  });
});

// ─── BladePostProcessing component-level rendering ───────────────────

describe('BladePostProcessing component', () => {
  it('returns null when graphicsQuality is "low"', async () => {
    const { BladePostProcessing } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    const engineRef = { current: null };
    const result = BladePostProcessing({
      engineRef,
      graphicsQuality: 'low',
    });
    expect(result).toBeNull();
  });

  it('returns null when enabled is false', async () => {
    const { BladePostProcessing } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    const engineRef = { current: null };
    expect(BladePostProcessing({ engineRef, enabled: false })).toBeNull();
  });

  it('renders the composer tree when enabled (returns truthy element)', async () => {
    const { BladePostProcessing } = await import(
      '@/components/editor/blade3d/postprocessing/BladePostProcessing'
    );
    const engineRef = { current: null };
    const result = BladePostProcessing({ engineRef });
    expect(result).not.toBeNull();
  });
});
