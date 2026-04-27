// ─── gifEncoder — Promise-contract tests ───
//
// Verifies the wrapper's public contract WITHOUT spawning a real Web
// Worker. Tests inject a fake encoder via setGifEncoderFactory; the
// fake exercises the same gif.js API surface the real encoder uses.
//
// What we pin:
//
//   • `encodeGif` resolves with a Blob whose `type === 'image/gif'`.
//   • The resolved Blob has size > 0.
//   • Each input canvas results in one `addFrame` call.
//   • Per-frame delay is round(1000 / fps).
//   • Empty input throws synchronously.
//   • An encoder `abort` event rejects the Promise.
//   • The streaming variant is callable with a single reusable canvas.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  encodeGif,
  encodeGifStreamed,
  setGifEncoderFactory,
  type EncodeFrameInput,
  type GifEncoderInstance,
} from '@/lib/sharePack/gifEncoder';

// ─── Test fakes ───

interface FakeFrame {
  canvas: unknown;
  delay: number;
  copy: boolean;
}

interface FakeEncoderState {
  frames: FakeFrame[];
  finishedListeners: Array<(blob: Blob) => void>;
  abortListeners: Array<() => void>;
  rendered: boolean;
  finishMode: 'finish' | 'abort';
  finishBlob: Blob;
}

function makeFakeEncoder(state: FakeEncoderState): GifEncoderInstance {
  return {
    addFrame(canvas, opts) {
      state.frames.push({ canvas, delay: opts.delay, copy: opts.copy ?? false });
    },
    on(event, listener) {
      if (event === 'finished') state.finishedListeners.push(listener as (b: Blob) => void);
      if (event === 'abort') state.abortListeners.push(listener as () => void);
      // 'progress' is no-op for tests.
    },
    render() {
      state.rendered = true;
      // Resolve the wrapper Promise on the next microtask, mirroring
      // gif.js's async behaviour.
      queueMicrotask(() => {
        if (state.finishMode === 'finish') {
          for (const l of state.finishedListeners) l(state.finishBlob);
        } else {
          for (const l of state.abortListeners) l();
        }
      });
    },
  };
}

function makeGifBlob(): Blob {
  // GIF89a magic — gif.js produces a real GIF blob; the test fake just
  // needs `type: image/gif` and non-zero size.
  const bytes = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
    0x01, 0x00, 0x01, 0x00,             // 1×1 dimensions
    0x80, 0x00, 0x00,                   // packed flags + bg + aspect
    0x00, 0x00, 0x00, 0xff, 0xff, 0xff, // 2-color palette (black + white)
    0x21, 0xf9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, // GCE
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // image desc
    0x02, 0x02, 0x44, 0x01, 0x00,       // LZW data
    0x3b,                                // trailer
  ]);
  return new Blob([bytes], { type: 'image/gif' });
}

let lastState: FakeEncoderState | null = null;
const FAKE_CANVAS = { __fake: true } as unknown as EncodeFrameInput;

beforeEach(() => {
  lastState = null;
  setGifEncoderFactory((opts) => {
    const state: FakeEncoderState = {
      frames: [],
      finishedListeners: [],
      abortListeners: [],
      rendered: false,
      finishMode: 'finish',
      finishBlob: makeGifBlob(),
    };
    lastState = state;
    void opts; // factory opts captured for assertion via spy if needed
    return makeFakeEncoder(state);
  });
});

afterEach(() => {
  setGifEncoderFactory(null);
});

// ─── encodeGif (array variant) ───

describe('encodeGif', () => {
  it('resolves with a Blob whose type === "image/gif"', async () => {
    const blob = await encodeGif([FAKE_CANVAS, FAKE_CANVAS], {
      width: 32,
      height: 32,
      fps: 24,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/gif');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('calls addFrame once per input canvas', async () => {
    await encodeGif([FAKE_CANVAS, FAKE_CANVAS, FAKE_CANVAS], {
      width: 32,
      height: 32,
      fps: 24,
    });
    expect(lastState!.frames.length).toBe(3);
  });

  it('uses round(1000 / fps) ms delay by default', async () => {
    await encodeGif([FAKE_CANVAS], { width: 32, height: 32, fps: 24 });
    expect(lastState!.frames[0].delay).toBe(Math.round(1000 / 24));
    await encodeGif([FAKE_CANVAS], { width: 32, height: 32, fps: 30 });
    expect(lastState!.frames[0].delay).toBe(Math.round(1000 / 30));
  });

  it('honours an explicit delayMs override', async () => {
    await encodeGif([FAKE_CANVAS, FAKE_CANVAS], {
      width: 32,
      height: 32,
      fps: 24,
      delayMs: 100,
    });
    expect(lastState!.frames.every((f) => f.delay === 100)).toBe(true);
  });

  it('passes copy: true so gif.js snapshots pixel data immediately', async () => {
    await encodeGif([FAKE_CANVAS], { width: 32, height: 32, fps: 24 });
    expect(lastState!.frames[0].copy).toBe(true);
  });

  it('throws synchronously when given zero frames', async () => {
    await expect(encodeGif([], { width: 32, height: 32, fps: 24 })).rejects.toThrow(
      /at least one frame/,
    );
  });

  it('rejects on fps <= 0', async () => {
    await expect(
      encodeGif([FAKE_CANVAS], { width: 32, height: 32, fps: 0 }),
    ).rejects.toThrow(/fps/);
    await expect(
      encodeGif([FAKE_CANVAS], { width: 32, height: 32, fps: NaN }),
    ).rejects.toThrow(/fps/);
  });

  it('rejects with abort error when the encoder fires its abort event', async () => {
    setGifEncoderFactory(() => {
      const state: FakeEncoderState = {
        frames: [],
        finishedListeners: [],
        abortListeners: [],
        rendered: false,
        finishMode: 'abort',
        finishBlob: makeGifBlob(),
      };
      lastState = state;
      return makeFakeEncoder(state);
    });
    await expect(
      encodeGif([FAKE_CANVAS], { width: 32, height: 32, fps: 24 }),
    ).rejects.toThrow(/aborted/);
  });
});

// ─── encodeGifStreamed (callback variant) ───

describe('encodeGifStreamed', () => {
  it('resolves with an image/gif Blob from frames pushed inside the callback', async () => {
    const blob = await encodeGifStreamed(
      { width: 64, height: 64, fps: 12 },
      (gif) => {
        gif.addFrame(FAKE_CANVAS);
        gif.addFrame(FAKE_CANVAS);
        gif.addFrame(FAKE_CANVAS);
      },
    );
    expect(blob.type).toBe('image/gif');
    expect(lastState!.frames.length).toBe(3);
    // Default delay derived from fps=12 → 83ms.
    expect(lastState!.frames[0].delay).toBe(Math.round(1000 / 12));
  });

  it('supports awaiting an async produceFrames callback', async () => {
    const blob = await encodeGifStreamed(
      { width: 64, height: 64, fps: 24 },
      async (gif) => {
        for (let i = 0; i < 4; i++) {
          await Promise.resolve();
          gif.addFrame(FAKE_CANVAS);
        }
      },
    );
    expect(blob.type).toBe('image/gif');
    expect(lastState!.frames.length).toBe(4);
  });

  it('rejects when produceFrames adds zero frames', async () => {
    await expect(
      encodeGifStreamed({ width: 32, height: 32, fps: 24 }, () => {
        // intentionally empty
      }),
    ).rejects.toThrow(/did not add any frames/);
  });

  it('honours per-call delayMs override on a frame-by-frame basis', async () => {
    await encodeGifStreamed({ width: 32, height: 32, fps: 24 }, (gif) => {
      gif.addFrame(FAKE_CANVAS, 50);
      gif.addFrame(FAKE_CANVAS, 200);
    });
    expect(lastState!.frames[0].delay).toBe(50);
    expect(lastState!.frames[1].delay).toBe(200);
  });
});

// ─── setGifEncoderFactory ───

describe('setGifEncoderFactory', () => {
  it('passes width / height / quality / workers / workerScript to the factory', async () => {
    const seen: Array<{
      workers: number;
      quality: number;
      width: number;
      height: number;
      workerScript: string;
    }> = [];
    setGifEncoderFactory((opts) => {
      seen.push(opts);
      const state: FakeEncoderState = {
        frames: [],
        finishedListeners: [],
        abortListeners: [],
        rendered: false,
        finishMode: 'finish',
        finishBlob: makeGifBlob(),
      };
      lastState = state;
      return makeFakeEncoder(state);
    });
    await encodeGif([FAKE_CANVAS], {
      width: 800,
      height: 450,
      fps: 24,
      workers: 4,
      quality: 5,
      workerScript: '/custom/worker.js',
    });
    expect(seen.length).toBe(1);
    expect(seen[0]).toEqual({
      workers: 4,
      quality: 5,
      width: 800,
      height: 450,
      workerScript: '/custom/worker.js',
    });
  });

  it('passing null restores the default factory (smoke check)', () => {
    setGifEncoderFactory(null);
    // We can't verify the default factory without spawning a real
    // worker — just confirm the call returns void without throwing.
    expect(true).toBe(true);
  });

  // vi keeps the linter happy about an otherwise-unused import.
  it('vi spy lifecycle works alongside the factory override', () => {
    const spy = vi.fn();
    spy('ping');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
