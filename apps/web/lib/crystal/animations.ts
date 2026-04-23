// ─── Kyber Crystal — Animation Controller ───
//
// Owns all per-frame animation state for a single crystal instance.
// Triggers enter as method calls; the controller composes their
// contributions each tick into an `AnimationState` the renderer
// consumes to update materials + transforms.
//
// Per `docs/KYBER_CRYSTAL_3D.md` §7.

import type { RGB } from '@kyberstation/engine';
import {
  type AnimationTrigger,
  type AnimationState,
  IDLE_ANIMATION_STATE,
  isRedHue,
} from './types';

// ─── Trigger records ───

interface ActiveTrigger {
  kind: AnimationTrigger;
  /** ms since trigger start */
  elapsed: number;
  /** total ms — -1 means continuous (idle, unstable, preon, smoothswing) */
  duration: number;
  /** arbitrary parameters, passed through to blender */
  params: Record<string, unknown>;
  /** true for blocking narrative animations (bleed, heal, first-discovery, attune) */
  blocking: boolean;
}

// ─── Duration defaults ───

const DURATIONS: Record<AnimationTrigger, number> = {
  idle: -1,
  hover: -1,
  clash: 200,
  'preset-saved': 500,
  'preset-loaded': 300,
  'first-discovery': 2000,
  attune: 2000,
  bleed: 1500,
  heal: 1500,
  unstable: -1,
  preon: -1,
  smoothswing: -1,
  lockup: -1,
};

const BLOCKING: Record<AnimationTrigger, boolean> = {
  idle: false,
  hover: false,
  clash: false,
  'preset-saved': false,
  'preset-loaded': false,
  'first-discovery': true,
  attune: true,
  bleed: true,
  heal: true,
  unstable: false,
  preon: false,
  smoothswing: false,
  lockup: false,
};

// ─── Easing helpers ───

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ─── Config-change detection ───

export interface ConfigSnapshot {
  baseColor: RGB;
  style: string;
  preonEnabled: boolean;
}

// ─── Controller options ───

export interface AnimationControllerOptions {
  /** Initial config snapshot — used for red-transition detection. */
  initialSnapshot?: ConfigSnapshot;
  /** Honour prefers-reduced-motion for ambient triggers. Default true. */
  respectReducedMotion?: boolean;
  /** LocalStorage key for the first-discovery one-shot flag. */
  firstDiscoveryKey?: string;
}

const DEFAULT_FIRST_DISCOVERY_KEY = 'kyberstation.crystal.firstDiscovery.played';

// ─── Controller ───

export class CrystalAnimationController {
  private active: ActiveTrigger[] = [];
  private lastSnapshot: ConfigSnapshot | null;
  private respectReducedMotion: boolean;
  private firstDiscoveryKey: string;
  private prefersReducedMotion = false;

  constructor(options: AnimationControllerOptions = {}) {
    this.lastSnapshot = options.initialSnapshot ?? null;
    this.respectReducedMotion = options.respectReducedMotion ?? true;
    this.firstDiscoveryKey = options.firstDiscoveryKey ?? DEFAULT_FIRST_DISCOVERY_KEY;

    // Sync reduced-motion preference on construction. Callers can re-sync
    // via `syncReducedMotion` when the OS setting changes.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  syncReducedMotion(prefers: boolean): void {
    this.prefersReducedMotion = prefers;
  }

  /** True if a blocking narrative animation is currently playing. */
  get isBlocking(): boolean {
    return this.active.some((t) => t.blocking);
  }

  /**
   * Enter a trigger. If a blocking trigger is already active, non-blocking
   * triggers still play; a new blocking trigger is dropped (no stacking).
   * Continuous triggers (-1 duration) replace any existing instance of
   * the same kind (idempotent on/off toggle).
   */
  trigger(kind: AnimationTrigger, params: Record<string, unknown> = {}): void {
    const duration = DURATIONS[kind];
    const blocking = BLOCKING[kind];

    // First-discovery gate: persistent flag
    if (kind === 'first-discovery') {
      try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem(this.firstDiscoveryKey)) {
          return; // already played — noop
        }
      } catch {
        /* ignore */
      }
    }

    // Blocking-stacking rule
    if (blocking && this.isBlocking) {
      return;
    }

    // Continuous-replace rule
    if (duration === -1) {
      this.active = this.active.filter((t) => t.kind !== kind);
    }

    this.active.push({ kind, elapsed: 0, duration, params, blocking });
  }

  /** Release a continuous trigger by kind (e.g. `release('lockup')`). */
  release(kind: AnimationTrigger): void {
    this.active = this.active.filter((t) => t.kind !== kind);
  }

  /**
   * Detect meaningful config changes and auto-trigger narrative
   * animations (bleed / heal / preset-loaded).
   */
  notifyConfigChange(next: ConfigSnapshot): void {
    const prev = this.lastSnapshot;
    this.lastSnapshot = next;
    if (!prev) return;

    const wasRed = isRedHue(prev.baseColor);
    const isRed = isRedHue(next.baseColor);

    if (!wasRed && isRed) {
      this.trigger('bleed', { from: prev.baseColor, to: next.baseColor });
    } else if (wasRed && !isRed) {
      this.trigger('heal', { from: prev.baseColor, to: next.baseColor });
    }

    // Preon halo toggle
    if (!prev.preonEnabled && next.preonEnabled) {
      this.trigger('preon');
    } else if (prev.preonEnabled && !next.preonEnabled) {
      this.release('preon');
    }

    // Unstable style toggle
    if (prev.style !== 'unstable' && next.style === 'unstable') {
      this.trigger('unstable');
    } else if (prev.style === 'unstable' && next.style !== 'unstable') {
      this.release('unstable');
    }
  }

  /**
   * Advance all active triggers and compose the per-frame animation state.
   */
  tick(deltaMs: number): AnimationState {
    // 1. Advance elapsed, drop completed triggers
    const finished: AnimationTrigger[] = [];
    for (const t of this.active) {
      t.elapsed += deltaMs;
      if (t.duration > 0 && t.elapsed >= t.duration) {
        finished.push(t.kind);
      }
    }
    for (const kind of finished) {
      // Fire first-discovery persistence on completion
      if (kind === 'first-discovery') {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.firstDiscoveryKey, '1');
          }
        } catch {
          /* ignore */
        }
      }
    }
    this.active = this.active.filter((t) => !finished.includes(t.kind));

    // 2. Compose state from active triggers
    const state: AnimationState = { ...IDLE_ANIMATION_STATE };

    // Elapsed time accumulator for idle-pulse sine — we use a small
    // drift so the pulse doesn't sync across all instances.
    this.idleTimeMs += deltaMs;

    for (const t of this.active) {
      this.apply(t, state, deltaMs);
    }

    return state;
  }

  private idleTimeMs = 0;

  private apply(t: ActiveTrigger, state: AnimationState, _deltaMs: number): void {
    const prog = t.duration > 0 ? Math.min(1, t.elapsed / t.duration) : 0;

    switch (t.kind) {
      case 'idle': {
        if (this.respectReducedMotion && this.prefersReducedMotion) {
          // flat baseline
          return;
        }
        // Two superposed sines so the idle pulse reads as "alive" rather
        // than metronomic: 0.6 Hz primary + 0.17 Hz slow drift. Peak-to-
        // peak stays under ±0.11 of the base so it doesn't clip bloom.
        const t = this.idleTimeMs / 1000;
        const primary = Math.sin(t * 2 * Math.PI * 0.6) * 0.08;
        const drift = Math.sin(t * 2 * Math.PI * 0.17 + 1.3) * 0.03;
        state.glowIntensity *= 1.0 + primary + drift;
        break;
      }

      case 'hover': {
        if (this.respectReducedMotion && this.prefersReducedMotion) return;
        const hx = typeof t.params.tiltX === 'number' ? (t.params.tiltX as number) : 0;
        const hy = typeof t.params.tiltY === 'number' ? (t.params.tiltY as number) : 0;
        // clamp to ±5°
        state.tiltX = Math.max(-5, Math.min(5, hx));
        state.tiltY = Math.max(-5, Math.min(5, hy));
        break;
      }

      case 'clash': {
        // Intensity spike: 1 → ~4 → 1 via easeOut on first half, easeIn on
        // second. Multiplier tuned against the lower post-Phase-2 internal
        // light base (0.38) so the peak still reads as a hard flash.
        const half = prog < 0.5 ? prog * 2 : (1 - prog) * 2;
        const eased = easeOutCubic(half);
        state.glowIntensity *= 1.0 + 3.0 * eased;
        state.scale *= 1.0 + 0.05 * eased;
        state.fleckOpacity = Math.max(state.fleckOpacity, 0.45 + 0.35 * eased);
        break;
      }

      case 'preset-saved': {
        // Fleck bloom + intensity sparkle
        const eased = easeOutBack(prog);
        state.fleckOpacity = Math.max(state.fleckOpacity, 0.1 + 0.9 * (1 - prog));
        state.glowIntensity *= 1.0 + 0.5 * eased * (1 - prog);
        break;
      }

      case 'preset-loaded': {
        // Brief pearl crossfade — push fleck up, dim glow mid-way
        const mid = 1 - Math.abs(prog - 0.5) * 2;
        state.fleckOpacity = Math.max(state.fleckOpacity, 0.3 + 0.7 * mid);
        state.glowIntensity *= 1.0 - 0.4 * mid;
        break;
      }

      case 'first-discovery': {
        // Pearlescent emergence → colour bond.
        // 0..0.4: fleck rises, glow dim; 0.4..0.8: fleck fades, glow rises with easeIn;
        // 0.8..1.0: settle to idle.
        if (prog < 0.4) {
          const p = prog / 0.4;
          state.fleckOpacity = 0.3 + 0.7 * easeOutCubic(p);
          state.glowIntensity *= 0.2 + 0.5 * p;
        } else if (prog < 0.8) {
          const p = (prog - 0.4) / 0.4;
          state.fleckOpacity = 1.0 - 0.7 * easeInOutCubic(p);
          state.glowIntensity *= 0.7 + 0.8 * easeOutCubic(p);
        } else {
          const p = (prog - 0.8) / 0.2;
          state.fleckOpacity = 0.3 + 0.05 * (1 - p);
          state.glowIntensity *= 1.5 - 0.5 * p;
        }
        state.scale *= 1.0 + 0.05 * (1 - prog);
        break;
      }

      case 'attune': {
        // Dim → tint to scanned identity. Similar envelope to first-discovery
        // but without the discovery-specific sparkle.
        if (prog < 0.3) {
          state.glowIntensity *= 0.3;
          state.fleckOpacity = Math.max(state.fleckOpacity, easeOutCubic(prog / 0.3));
        } else {
          const p = (prog - 0.3) / 0.7;
          state.glowIntensity *= 0.3 + 0.7 * easeInOutCubic(p);
          state.fleckOpacity = Math.max(state.fleckOpacity, 1.0 - p);
        }
        break;
      }

      case 'bleed': {
        // Veins propagate, colour crossfades to red, slight dim
        state.bleedProgress = Math.max(state.bleedProgress, easeInOutCubic(prog));
        state.veinOpacity = Math.max(state.veinOpacity, easeOutCubic(prog));
        state.glowIntensity *= 1.0 - 0.15 * Math.sin(prog * Math.PI);
        break;
      }

      case 'heal': {
        // Mirror of bleed, reversed direction
        state.bleedProgress = Math.max(state.bleedProgress, easeInOutCubic(1 - prog));
        state.veinOpacity = Math.max(state.veinOpacity, 1 - easeOutCubic(prog));
        state.glowIntensity *= 1.0 + 0.1 * Math.sin(prog * Math.PI);
        break;
      }

      case 'unstable': {
        // Crack-breathe: 1 Hz sinusoidal modulation on seam/vein opacity
        if (this.respectReducedMotion && this.prefersReducedMotion) {
          state.seamOpacity = 0.8;
          state.veinOpacity = Math.max(state.veinOpacity, 0.4);
          return;
        }
        const phase = (t.elapsed / 1000) * 2 * Math.PI;
        const mod = 0.5 + 0.5 * Math.sin(phase);
        state.seamOpacity = 0.6 + 0.4 * mod;
        state.veinOpacity = Math.max(state.veinOpacity, 0.3 + 0.2 * mod);
        break;
      }

      case 'preon': {
        // Breath-before-ignition halo
        if (this.respectReducedMotion && this.prefersReducedMotion) {
          state.haloOpacity = 0.25;
          return;
        }
        const phase = (t.elapsed / 1000) * 2 * Math.PI * 0.8;
        state.haloOpacity = 0.2 + 0.2 * (0.5 + 0.5 * Math.sin(phase));
        break;
      }

      case 'smoothswing': {
        // Audio-envelope-tracked intensity — envelope comes in via params
        if (this.respectReducedMotion && this.prefersReducedMotion) return;
        const env = typeof t.params.envelope === 'number'
          ? (t.params.envelope as number)
          : 0.5;
        state.glowIntensity *= 0.9 + 0.4 * env;
        break;
      }

      case 'lockup': {
        // Held bright with a fast micro-flicker so the "hold" reads as
        // energy rather than a static override. Pinned at 2.8x with
        // ±0.15 chatter at 12 Hz.
        if (this.respectReducedMotion && this.prefersReducedMotion) {
          state.glowIntensity = Math.max(state.glowIntensity, 2.8);
          return;
        }
        const phase = (t.elapsed / 1000) * 2 * Math.PI * 12;
        const chatter = 0.15 * Math.sin(phase);
        state.glowIntensity = Math.max(state.glowIntensity, 2.8 + chatter);
        state.veinOpacity = Math.max(state.veinOpacity, 0.3 + 0.2 * (0.5 + 0.5 * Math.sin(phase)));
        break;
      }
    }
  }

  /** Clear everything. Used on dispose. */
  dispose(): void {
    this.active = [];
  }
}
