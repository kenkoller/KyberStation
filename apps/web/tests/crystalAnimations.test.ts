import { describe, it, expect, beforeEach } from 'vitest';
import { CrystalAnimationController } from '@/lib/crystal/animations';
import type { ConfigSnapshot } from '@/lib/crystal/animations';

// Minimal localStorage polyfill — the node vitest env doesn't ship one
// and the first-discovery gate depends on it for persistence.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

const BLUE: ConfigSnapshot = {
  baseColor: { r: 0, g: 140, b: 255 },
  style: 'stable',
  preonEnabled: false,
};
const RED: ConfigSnapshot = {
  baseColor: { r: 220, g: 30, b: 24 },
  style: 'stable',
  preonEnabled: false,
};

describe('CrystalAnimationController — idle', () => {
  beforeEach(() => {
    // Ensure first-discovery flag doesn't leak across tests
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('produces baseline state when no triggers are active', () => {
    const c = new CrystalAnimationController({ respectReducedMotion: false });
    const s = c.tick(16);
    // No triggers → no animation contribution. bleed/vein/halo stay at 0
    expect(s.bleedProgress).toBe(0);
    expect(s.veinOpacity).toBe(0);
    expect(s.haloOpacity).toBe(0);
  });

  it('idle pulse modulates glow intensity', () => {
    const c = new CrystalAnimationController({ respectReducedMotion: false });
    c.trigger('idle');
    // Advance across half a cycle to sample the sine
    const samples: number[] = [];
    for (let i = 0; i < 10; i++) {
      samples.push(c.tick(100).glowIntensity);
    }
    // At least one sample should differ from 1.0 (sine not exactly aligned)
    const varied = samples.some((v) => Math.abs(v - 1.0) > 0.01);
    expect(varied).toBe(true);
  });
});

describe('CrystalAnimationController — bleed / heal', () => {
  it('auto-triggers bleed on blue→red transition', () => {
    const c = new CrystalAnimationController({
      initialSnapshot: BLUE,
      respectReducedMotion: false,
    });
    c.notifyConfigChange(RED);
    // Immediately after trigger, blocking should be true
    expect(c.isBlocking).toBe(true);

    // Advance through most of the 1500ms animation
    const s1 = c.tick(750);
    expect(s1.bleedProgress).toBeGreaterThan(0);
    expect(s1.veinOpacity).toBeGreaterThan(0);

    // Advance past completion
    c.tick(900);
    expect(c.isBlocking).toBe(false);
  });

  it('auto-triggers heal on red→blue transition', () => {
    const c = new CrystalAnimationController({
      initialSnapshot: RED,
      respectReducedMotion: false,
    });
    c.notifyConfigChange(BLUE);
    expect(c.isBlocking).toBe(true);
    // Immediately after tick, bleed should START HIGH (heal reverses)
    const s = c.tick(16);
    expect(s.bleedProgress).toBeGreaterThan(0.9);
  });

  it('drops a second blocking trigger while one is active', () => {
    const c = new CrystalAnimationController({ respectReducedMotion: false });
    c.trigger('bleed');
    c.trigger('first-discovery');
    // Second should be dropped — still one active blocking
    c.tick(16);
    expect(c.isBlocking).toBe(true);
    c.tick(1600); // exceeds 1500ms
    // Now bleed is done; first-discovery was dropped so nothing should remain
    expect(c.isBlocking).toBe(false);
  });
});

describe('CrystalAnimationController — first-discovery gate', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('plays once, then refuses to play again', () => {
    const c1 = new CrystalAnimationController({
      respectReducedMotion: false,
      firstDiscoveryKey: 'test.firstDiscovery',
    });
    c1.trigger('first-discovery');
    expect(c1.isBlocking).toBe(true);

    // Run it all the way through
    c1.tick(2100);
    expect(c1.isBlocking).toBe(false);

    // A fresh controller attempts first-discovery — should be skipped
    const c2 = new CrystalAnimationController({
      respectReducedMotion: false,
      firstDiscoveryKey: 'test.firstDiscovery',
    });
    c2.trigger('first-discovery');
    expect(c2.isBlocking).toBe(false);
  });
});

describe('CrystalAnimationController — continuous triggers', () => {
  it('unstable trigger modulates seam opacity continuously', () => {
    const c = new CrystalAnimationController({ respectReducedMotion: false });
    c.trigger('unstable');
    const s1 = c.tick(100);
    const s2 = c.tick(500);
    // Both should have non-idle seam opacity
    expect(s1.seamOpacity).toBeGreaterThan(0);
    expect(s2.seamOpacity).toBeGreaterThan(0);
  });

  it('release(kind) stops a continuous trigger', () => {
    const c = new CrystalAnimationController({ respectReducedMotion: false });
    c.trigger('preon');
    c.tick(100);
    c.release('preon');
    const s = c.tick(100);
    expect(s.haloOpacity).toBe(0);
  });

  it('reduced-motion flattens ambient triggers', () => {
    const c = new CrystalAnimationController({ respectReducedMotion: true });
    c.syncReducedMotion(true);
    c.trigger('idle');
    const s1 = c.tick(100);
    const s2 = c.tick(500);
    // Idle pulse should be flat under reduced motion
    expect(s1.glowIntensity).toBe(1.0);
    expect(s2.glowIntensity).toBe(1.0);
  });
});

describe('CrystalAnimationController — lockup', () => {
  it('pins glow intensity to 2.2 while held', () => {
    const c = new CrystalAnimationController({ respectReducedMotion: false });
    c.trigger('lockup');
    const s = c.tick(100);
    expect(s.glowIntensity).toBeGreaterThanOrEqual(2.2);
  });
});
