// ─── renderCardGif — orchestration tests ───
//
// What we pin:
//
//   • `renderCardGif` resolves with a Blob whose `type === 'image/gif'`.
//   • The GIF encoder receives `fps × durationMs / 1000` frames.
//   • Per-variant defaults (idle / ignition) round-trip through.
//   • The per-frame card-frame renderer is invoked once per frame.
//   • `analyzeLedBufferForCard` derives sensible extent + mean-color
//     scalars from raw LED buffers.
//   • No console errors / warnings during a successful render.
//
// We don't render real chrome here — the per-frame card renderer is
// stubbed via the `__setCardFrameRendererForTesting` seam, and the QR
// surface is stubbed via `__setCreateQrSurfaceForTesting`. Both seams
// are live in production but pass-through; the tests just substitute
// no-ops so the orchestration can run in node without a real DOM.

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  GIF_VARIANT_DEFAULTS,
  __setCardFrameRendererForTesting,
  __setCreateQrSurfaceForTesting,
  renderCardGif,
} from '@/lib/sharePack/cardSnapshot';
import {
  setGifEncoderFactory,
  type GifEncoderInstance,
} from '@/lib/sharePack/gifEncoder';
import type { BladeConfig } from '@kyberstation/engine';

// ─── Test fakes ────────────────────────────────────────────────────────

interface EncoderState {
  frameCount: number;
  finishedListeners: Array<(b: Blob) => void>;
}

function makeFakeEncoder(state: EncoderState): GifEncoderInstance {
  return {
    addFrame() {
      state.frameCount++;
    },
    on(event, listener) {
      if (event === 'finished') state.finishedListeners.push(listener as (b: Blob) => void);
    },
    render() {
      queueMicrotask(() => {
        // GIF89a magic header — 6 bytes is enough to assert size > 0.
        const blob = new Blob([new Uint8Array([0x47, 0x49, 0x46])], { type: 'image/gif' });
        for (const l of state.finishedListeners) l(blob);
      });
    },
  };
}

// Fake QrSurfaceResult — satisfies the production return type without
// touching qrcode.js or Three.js. We cast through `unknown` so the
// Three.js CanvasTexture isn't pulled into the test surface; the
// production code only ever calls `.dispose()` on it from
// renderCardGif's finally block.
import type { QrSurfaceResult } from '@/lib/crystal/qrSurface';

function makeFakeQrSurface(): Promise<QrSurfaceResult> {
  const result = {
    canvas: { width: 512, height: 512 } as unknown as HTMLCanvasElement,
    texture: { dispose: () => {} },
    moduleCount: 25,
    version: 2,
  } as unknown as QrSurfaceResult;
  return Promise.resolve(result);
}

// Stub OffscreenCanvas so renderCardGif's createGifOutputCanvas works
// in node. The render loop calls getContext('2d') + setTransform / clearRect
// / scale / save / restore, none of which need real pixels for the
// orchestration test.
class StubOffscreenCanvas {
  width: number;
  height: number;
  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
  }
  getContext(): unknown {
    return {
      save: () => {},
      restore: () => {},
      setTransform: () => {},
      clearRect: () => {},
      scale: () => {},
    };
  }
}

const TEST_CONFIG: BladeConfig = {
  baseColor: { r: 0, g: 140, b: 255 },
  clashColor: { r: 255, g: 255, b: 255 },
  lockupColor: { r: 255, g: 200, b: 80 },
  blastColor: { r: 255, g: 255, b: 255 },
  style: 'stable',
  ignition: 'standard',
  retraction: 'standard',
  ignitionMs: 300,
  retractionMs: 500,
  shimmer: 0.1,
  ledCount: 144,
};

let encoderState: EncoderState;
let frameRendererCalls: number;

beforeEach(() => {
  encoderState = { frameCount: 0, finishedListeners: [] };
  frameRendererCalls = 0;

  setGifEncoderFactory(() => makeFakeEncoder(encoderState));

  // Per-frame renderer stub — counts invocations; doesn't touch DOM.
  __setCardFrameRendererForTesting(() => {
    frameRendererCalls++;
  });

  // QR surface stub — returns a fake canvas + a no-op texture.dispose().
  __setCreateQrSurfaceForTesting(makeFakeQrSurface);

  vi.stubGlobal('OffscreenCanvas', StubOffscreenCanvas);
});

afterEach(() => {
  setGifEncoderFactory(null);
  __setCardFrameRendererForTesting(null);
  __setCreateQrSurfaceForTesting(null);
  vi.unstubAllGlobals();
});

// ─── renderCardGif: idle variant ──────────────────────────────────────

describe('renderCardGif: idle variant', () => {
  it('resolves with an image/gif Blob', async () => {
    const blob = await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.idle',
      variant: 'idle',
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/gif');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('produces fps × duration_seconds frames at default settings', async () => {
    const { fps, durationMs } = GIF_VARIANT_DEFAULTS.idle;
    const expectedFrames = Math.round((durationMs / 1000) * fps);
    await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.idle',
      variant: 'idle',
    });
    expect(encoderState.frameCount).toBe(expectedFrames);
    expect(frameRendererCalls).toBe(expectedFrames);
  });

  it('honours fps + durationMs overrides', async () => {
    await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test',
      variant: 'idle',
      fps: 12,
      durationMs: 500,
    });
    expect(encoderState.frameCount).toBe(6); // 12 fps × 0.5s
  });

  it('does not log to console.error during a successful render', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await renderCardGif({
        config: TEST_CONFIG,
        glyph: 'JED.test',
        variant: 'idle',
      });
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});

// ─── renderCardGif: ignition variant ──────────────────────────────────

describe('renderCardGif: ignition variant', () => {
  it('resolves with an image/gif Blob', async () => {
    const blob = await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.ignition',
      variant: 'ignition',
    });
    expect(blob.type).toBe('image/gif');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('produces fps × duration_seconds frames at default settings', async () => {
    const { fps, durationMs } = GIF_VARIANT_DEFAULTS.ignition;
    const expectedFrames = Math.round((durationMs / 1000) * fps);
    await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.ignition',
      variant: 'ignition',
    });
    expect(encoderState.frameCount).toBe(expectedFrames);
    expect(frameRendererCalls).toBe(expectedFrames);
  });
});

// ─── renderCardGif: Sprint 4 effect-specific variants ────────────────

describe('renderCardGif: blast-deflect variant (Sprint 4)', () => {
  it('resolves with an image/gif Blob', async () => {
    const blob = await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.blast',
      variant: 'blast-deflect',
    });
    expect(blob.type).toBe('image/gif');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('produces fps × duration_seconds frames at default settings', async () => {
    const { fps, durationMs } = GIF_VARIANT_DEFAULTS['blast-deflect'];
    const expectedFrames = Math.round((durationMs / 1000) * fps);
    await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.blast',
      variant: 'blast-deflect',
    });
    expect(encoderState.frameCount).toBe(expectedFrames);
    expect(frameRendererCalls).toBe(expectedFrames);
  });

  it('default duration is the brief-target 600ms at 30 fps (= 18 frames)', () => {
    expect(GIF_VARIANT_DEFAULTS['blast-deflect']).toEqual({ fps: 30, durationMs: 600 });
  });
});

describe('renderCardGif: stab-tip-flash variant (Sprint 4)', () => {
  it('resolves with an image/gif Blob', async () => {
    const blob = await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.stab',
      variant: 'stab-tip-flash',
    });
    expect(blob.type).toBe('image/gif');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('produces fps × duration_seconds frames at default settings', async () => {
    const { fps, durationMs } = GIF_VARIANT_DEFAULTS['stab-tip-flash'];
    const expectedFrames = Math.round((durationMs / 1000) * fps);
    await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.stab',
      variant: 'stab-tip-flash',
    });
    expect(encoderState.frameCount).toBe(expectedFrames);
    expect(frameRendererCalls).toBe(expectedFrames);
  });

  it('default duration is the brief-target 500ms at 30 fps (= 15 frames)', () => {
    expect(GIF_VARIANT_DEFAULTS['stab-tip-flash']).toEqual({ fps: 30, durationMs: 500 });
  });
});

describe('renderCardGif: swing-response variant (Sprint 4)', () => {
  it('resolves with an image/gif Blob', async () => {
    const blob = await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.swing',
      variant: 'swing-response',
    });
    expect(blob.type).toBe('image/gif');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('produces fps × duration_seconds frames at default settings', async () => {
    const { fps, durationMs } = GIF_VARIANT_DEFAULTS['swing-response'];
    const expectedFrames = Math.round((durationMs / 1000) * fps);
    await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.swing',
      variant: 'swing-response',
    });
    expect(encoderState.frameCount).toBe(expectedFrames);
    expect(frameRendererCalls).toBe(expectedFrames);
  });

  it('default duration is the brief-target 2000ms at 30 fps (= 60 frames)', () => {
    expect(GIF_VARIANT_DEFAULTS['swing-response']).toEqual({ fps: 30, durationMs: 2000 });
  });

  it('honours fps + durationMs overrides', async () => {
    await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test.swing',
      variant: 'swing-response',
      fps: 12,
      durationMs: 1000,
    });
    expect(encoderState.frameCount).toBe(12); // 12 × 1s
  });
});

// ─── renderCardGif: contracts shared by both variants ─────────────────

describe('renderCardGif: shared contracts', () => {
  it('forwards quality + workerScript to the encoder factory', async () => {
    const seenOpts: Array<{ quality: number; workerScript: string }> = [];
    setGifEncoderFactory((opts) => {
      seenOpts.push({ quality: opts.quality, workerScript: opts.workerScript });
      return makeFakeEncoder(encoderState);
    });
    await renderCardGif({
      config: TEST_CONFIG,
      glyph: 'JED.test',
      variant: 'idle',
      fps: 12,
      durationMs: 500,
      quality: 1,
      workerScript: '/custom/gif.worker.js',
    });
    expect(seenOpts.length).toBe(1);
    expect(seenOpts[0]).toEqual({ quality: 1, workerScript: '/custom/gif.worker.js' });
  });

  it('disposes the QR texture even if the encoder rejects', async () => {
    let disposed = false;
    __setCreateQrSurfaceForTesting(() =>
      Promise.resolve({
        canvas: { width: 512, height: 512 } as unknown as HTMLCanvasElement,
        texture: {
          dispose: () => {
            disposed = true;
          },
        },
        moduleCount: 25,
        version: 2,
      } as unknown as QrSurfaceResult),
    );
    setGifEncoderFactory(() => ({
      addFrame() {},
      on(event, listener) {
        if (event === 'abort') {
          queueMicrotask(() => (listener as () => void)());
        }
      },
      render() {},
    }));
    await expect(
      renderCardGif({ config: TEST_CONFIG, glyph: 'JED.test', variant: 'idle' }),
    ).rejects.toThrow();
    expect(disposed).toBe(true);
  });
});
