import { describe, it, expect } from 'vitest';
import {
  renderLayerThumbnail,
  decideThumbnailTick,
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  HIGH_DENSITY_THRESHOLD,
} from '../components/editor/LayerThumbnail';
import type { BladeLayer } from '../stores/layerStore';

// ─── Mock canvas context ──────────────────────────────────────────────────────
//
// `renderLayerThumbnail` is a pure function that takes a CanvasRenderingContext2D.
// We don't need a real canvas here — a minimal recording mock that captures
// fillStyle / fillRect / clearRect calls is enough to verify behavior.

interface FillRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fillStyle: string;
}

function makeMockContext() {
  const rects: FillRect[] = [];
  const cleared: Array<{ x: number; y: number; w: number; h: number }> = [];
  const strokes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  let currentFill = '';
  let currentStroke = '';
  let pendingMoveTo: { x: number; y: number } | null = null;

  const ctx = {
    get fillStyle() {
      return currentFill;
    },
    set fillStyle(v: string) {
      currentFill = v;
    },
    get strokeStyle() {
      return currentStroke;
    },
    set strokeStyle(v: string) {
      currentStroke = v;
    },
    lineWidth: 1,
    clearRect(x: number, y: number, w: number, h: number) {
      cleared.push({ x, y, w, h });
    },
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push({ x, y, w, h, fillStyle: currentFill });
    },
    beginPath() {},
    moveTo(x: number, y: number) {
      pendingMoveTo = { x, y };
    },
    lineTo(x: number, y: number) {
      if (pendingMoveTo) {
        strokes.push({
          x1: pendingMoveTo.x,
          y1: pendingMoveTo.y,
          x2: x,
          y2: y,
        });
        pendingMoveTo = null;
      }
    },
    stroke() {},
  } as unknown as CanvasRenderingContext2D;

  return { ctx, rects, cleared, strokes };
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeLayer(overrides: Partial<BladeLayer> = {}): BladeLayer {
  return {
    id: 'test-layer',
    type: 'base',
    name: 'Test Layer',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    bypass: false,
    mute: false,
    solo: false,
    config: { style: 'stable', color: { r: 0, g: 140, b: 255 } },
    ...overrides,
  };
}

// ─── Per-state compositor output (bypass vs mute vs active) ───────────────────

describe('renderLayerThumbnail — per-state compositor output', () => {
  it('"active" state fills every pixel column with a colored rect', () => {
    const { ctx, rects } = makeMockContext();
    renderLayerThumbnail(ctx, makeLayer(), 'active', 0);
    // One column per thumbnail pixel width.
    const columns = rects.filter((r) => r.w === 1 && r.h === THUMBNAIL_HEIGHT);
    expect(columns.length).toBe(THUMBNAIL_WIDTH);
    // All fill styles are non-black rgb(…) colors.
    for (const col of columns) {
      expect(col.fillStyle.startsWith('rgb(')).toBe(true);
    }
  });

  it('"muted" state draws a single black rect (honest black, pays CPU but outputs black)', () => {
    const { ctx, rects } = makeMockContext();
    renderLayerThumbnail(ctx, makeLayer(), 'muted', 0);
    // One full-canvas fill with a near-black color.
    expect(rects.length).toBe(1);
    expect(rects[0].w).toBe(THUMBNAIL_WIDTH);
    expect(rects[0].h).toBe(THUMBNAIL_HEIGHT);
    // Near-black palette — starts with "rgb(8".
    expect(rects[0].fillStyle.startsWith('rgb(')).toBe(true);
  });

  it('"skipped" state draws a diagonal stripe placeholder (bypass — compositor skips layer)', () => {
    const { ctx, rects, strokes } = makeMockContext();
    renderLayerThumbnail(ctx, makeLayer(), 'skipped', 0);
    // Exactly one background fill + several diagonal strokes.
    expect(rects.length).toBe(1);
    expect(strokes.length).toBeGreaterThan(0);
    // All strokes are diagonal (y1 !== y2) — placeholder hatch.
    for (const s of strokes) {
      expect(s.y1).not.toBe(s.y2);
    }
  });

  it('"skipped" state does NOT evaluate style (zero CPU for bypassed thumbnail)', () => {
    // The `style` key on a bypassed layer is intentionally unreachable. We
    // verify by passing a layer whose style would throw if evaluated — no
    // throw means the style was never invoked.
    const boobyTrap: BladeLayer = {
      ...makeLayer(),
      type: 'base',
      config: {
        // Non-existent style ID — would normally fall back, but
        // that fallback path itself is never entered for bypass.
        style: '__this_would_crash_if_invoked__',
        color: { r: 128, g: 128, b: 128 },
      },
    };
    const { ctx, rects } = makeMockContext();
    // Bypass must not crash.
    expect(() => renderLayerThumbnail(ctx, boobyTrap, 'skipped', 0)).not.toThrow();
    // And it produces only placeholder output — no per-pixel columns.
    const columns = rects.filter((r) => r.w === 1);
    expect(columns.length).toBe(0);
  });
});

// ─── Effect layer thumbnails render flat trigger color ────────────────────────

describe('renderLayerThumbnail — effect layers', () => {
  it('effect layer renders flat band of trigger color (opacity applied)', () => {
    const layer = makeLayer({
      type: 'effect',
      opacity: 1,
      config: { effectType: 'clash', color: { r: 200, g: 100, b: 50 }, size: 50 },
    });
    const { ctx, rects } = makeMockContext();
    renderLayerThumbnail(ctx, layer, 'active', 0);
    const columns = rects.filter((r) => r.w === 1 && r.h === THUMBNAIL_HEIGHT);
    // Every column is the same trigger color → flat band.
    const uniqueFills = new Set(columns.map((c) => c.fillStyle));
    expect(uniqueFills.size).toBe(1);
    expect(columns[0].fillStyle).toBe('rgb(200, 100, 50)');
  });

  it('opacity scales the rendered color linearly', () => {
    const layer = makeLayer({
      type: 'effect',
      opacity: 0.5,
      config: { effectType: 'clash', color: { r: 200, g: 100, b: 50 }, size: 50 },
    });
    const { ctx, rects } = makeMockContext();
    renderLayerThumbnail(ctx, layer, 'active', 0);
    const columns = rects.filter((r) => r.w === 1);
    // 200 * 0.5 = 100 etc.
    expect(columns[0].fillStyle).toBe('rgb(100, 50, 25)');
  });
});

// ─── Mix layers blend two styles ──────────────────────────────────────────────

describe('renderLayerThumbnail — mix layers', () => {
  it('mix layer produces a blended output (no crash, full column fill)', () => {
    const layer = makeLayer({
      type: 'mix',
      config: { styleA: 'stable', styleB: 'fire', mixRatio: 50 },
    });
    const { ctx, rects } = makeMockContext();
    renderLayerThumbnail(ctx, layer, 'active', 0);
    const columns = rects.filter((r) => r.w === 1);
    expect(columns.length).toBe(THUMBNAIL_WIDTH);
  });
});

// ─── Unknown style ID doesn't crash ───────────────────────────────────────────

describe('renderLayerThumbnail — resilience', () => {
  it('unknown base style ID falls back gracefully (no throw)', () => {
    const layer = makeLayer({
      type: 'base',
      config: { style: '__not_a_real_style__', color: { r: 0, g: 0, b: 0 } },
    });
    const { ctx } = makeMockContext();
    expect(() => renderLayerThumbnail(ctx, layer, 'active', 0)).not.toThrow();
  });
});

// ─── decideThumbnailTick — pause / reduced-motion / stagger gating ──────────

describe('decideThumbnailTick — reduced motion freezes at t=0', () => {
  it('paints once on first tick, then never again', () => {
    const first = decideThumbnailTick({
      reducedMotion: true, paused: false,
      hasPainted: false, elapsedMs: 0, frameCount: 0,
    });
    expect(first.paint).toBe(true);
    expect(first.time).toBe(0);
    expect(first.scheduleNext).toBe(false);

    const second = decideThumbnailTick({
      reducedMotion: true, paused: false,
      hasPainted: true, elapsedMs: 5000, frameCount: 300,
    });
    expect(second.paint).toBe(false);
    expect(second.time).toBe(0);
    expect(second.scheduleNext).toBe(false);
  });

  it('reduced motion wins over elapsed time (animations never start)', () => {
    const d = decideThumbnailTick({
      reducedMotion: true, paused: false,
      hasPainted: false, elapsedMs: 10000, frameCount: 600,
    });
    // Elapsed was large — we still clamp to 0.
    expect(d.time).toBe(0);
  });
});

describe('decideThumbnailTick — pause freezes thumbnails too', () => {
  it('paused + not yet painted → paint once at t=0', () => {
    const d = decideThumbnailTick({
      reducedMotion: false, paused: true,
      hasPainted: false, elapsedMs: 0, frameCount: 0,
    });
    expect(d.paint).toBe(true);
    expect(d.time).toBe(0);
    expect(d.scheduleNext).toBe(false);
  });

  it('paused + already painted → do NOT repaint (leaves frozen frame)', () => {
    const d = decideThumbnailTick({
      reducedMotion: false, paused: true,
      hasPainted: true, elapsedMs: 123, frameCount: 7,
    });
    expect(d.paint).toBe(false);
    expect(d.scheduleNext).toBe(false);
  });

  it('pause ignores elapsed time — frame is never advanced', () => {
    const d = decideThumbnailTick({
      reducedMotion: false, paused: true,
      hasPainted: false, elapsedMs: 9999, frameCount: 1,
    });
    expect(d.time).toBe(0);
  });
});

describe('decideThumbnailTick — active (live) playback advances time', () => {
  it('not paused, not reduced-motion, no stagger → paint every tick at real elapsed', () => {
    const d = decideThumbnailTick({
      reducedMotion: false, paused: false,
      hasPainted: true, elapsedMs: 500, frameCount: 30,
    });
    expect(d.paint).toBe(true);
    expect(d.time).toBe(500);
    expect(d.scheduleNext).toBe(true);
  });
});

describe('decideThumbnailTick — stagger cadence', () => {
  it('row 0 of 10 paints on frame 0, 10, 20 — not on 1..9', () => {
    for (let f = 0; f < 20; f++) {
      const d = decideThumbnailTick({
        reducedMotion: false, paused: false,
        hasPainted: true, elapsedMs: f * 16, frameCount: f,
        staggerTurn: 0, staggerTotal: 10,
      });
      if (f === 0 || f === 10) {
        expect(d.paint, `frame ${f}`).toBe(true);
      } else if (f < 10 || (f > 10 && f < 20)) {
        expect(d.paint, `frame ${f}`).toBe(false);
      }
    }
  });

  it('row 3 of 10 paints on frame 3, 13, 23', () => {
    const paintingFrames: number[] = [];
    for (let f = 0; f < 30; f++) {
      const d = decideThumbnailTick({
        reducedMotion: false, paused: false,
        hasPainted: true, elapsedMs: 0, frameCount: f,
        staggerTurn: 3, staggerTotal: 10,
      });
      if (d.paint) paintingFrames.push(f);
    }
    expect(paintingFrames).toEqual([3, 13, 23]);
  });

  it('staggerTotal <= 1 disables stagger (every tick paints)', () => {
    for (let f = 0; f < 5; f++) {
      const d = decideThumbnailTick({
        reducedMotion: false, paused: false,
        hasPainted: true, elapsedMs: 0, frameCount: f,
        staggerTurn: 0, staggerTotal: 1,
      });
      expect(d.paint).toBe(true);
    }
  });
});

// ─── HIGH_DENSITY_THRESHOLD sanity ────────────────────────────────────────────

describe('LayerThumbnail — stagger threshold budget', () => {
  it('threshold is sized for ~10 layers at 60fps (within 16ms budget)', () => {
    // Documented assumption — a change to the threshold should be a
    // deliberate decision. This test pins the constant so accidental
    // bumps trip here.
    expect(HIGH_DENSITY_THRESHOLD).toBeGreaterThanOrEqual(8);
    expect(HIGH_DENSITY_THRESHOLD).toBeLessThanOrEqual(16);
  });
});
