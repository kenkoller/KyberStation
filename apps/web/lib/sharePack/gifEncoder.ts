// ─── gifEncoder — Promise-based wrapper around gif.js ───
//
// Encodes a sequence of canvases into an animated GIF Blob using the
// `gif.js` web-worker encoder. Wraps the callback-based gif.js API in a
// Promise so the rest of the share-pack pipeline can `await` the encode.
//
// Worker URL contract:
//   gif.js spawns a Worker from a separate script (`gif.worker.js`).
//   That file is committed to `apps/web/public/gif.worker.js` (copied
//   from `node_modules/gif.js/dist/gif.worker.js`) and served as a
//   static asset by Next.js. The encoder defaults to `/gif.worker.js`;
//   callers can override via the `workerScript` option.
//
// Test seam:
//   Tests inject a fake encoder via `setGifEncoderFactory()` so the
//   encoder Promise resolves with a mocked GIF Blob without spawning a
//   real Web Worker (which doesn't exist in node).

// ─── Public types ───

export interface GifEncoderOptions {
  /** GIF width in pixels. */
  width: number;
  /** GIF height in pixels. */
  height: number;
  /** Capture FPS — used to compute the per-frame delay. */
  fps: number;
  /** 1 (best) — 30 (worst). gif.js default is 10; we keep that. */
  quality?: number;
  /** Number of encoder web workers to spawn. Default 2. */
  workers?: number;
  /** URL of the gif.worker.js script. Default '/gif.worker.js'. */
  workerScript?: string;
  /** Override the per-frame delay (ms). Defaults to round(1000 / fps). */
  delayMs?: number;
}

/** Subset of the gif.js instance surface that this wrapper depends on. */
export interface GifEncoderInstance {
  addFrame(canvas: unknown, options: { delay: number; copy?: boolean }): void;
  on(event: 'finished', listener: (blob: Blob) => void): void;
  on(event: 'abort', listener: () => void): void;
  on(event: 'progress', listener: (percent: number) => void): void;
  render(): void;
  abort?(): void;
}

export type GifEncoderFactory = (opts: {
  workers: number;
  quality: number;
  width: number;
  height: number;
  workerScript: string;
}) => GifEncoderInstance;

// ─── Factory injection ───

let factoryOverride: GifEncoderFactory | null = null;

/**
 * Override the default gif.js-based encoder factory. Tests inject a
 * fake encoder that resolves immediately without spawning a real
 * Web Worker. Pass `null` to restore the default.
 */
export function setGifEncoderFactory(factory: GifEncoderFactory | null): void {
  factoryOverride = factory;
}

async function defaultFactory(opts: {
  workers: number;
  quality: number;
  width: number;
  height: number;
  workerScript: string;
}): Promise<GifEncoderInstance> {
  const mod = await import('gif.js');
  // gif.js publishes a `module.exports = GIF` shape; the type definition
  // models it as `export = GIF`. Under ESM dynamic import this surfaces
  // as either `mod.default` or the namespace itself depending on the
  // bundler's interop strategy.
  const Ctor = (
    mod as unknown as {
      default?: new (o: typeof opts) => GifEncoderInstance;
    } & (new (o: typeof opts) => GifEncoderInstance)
  ).default ?? (mod as unknown as new (o: typeof opts) => GifEncoderInstance);
  return new Ctor(opts);
}

// ─── Public API ───

export type EncodeFrameInput = HTMLCanvasElement | OffscreenCanvas | ImageData;

/**
 * Encode an array of canvases to a GIF Blob.
 *
 * Resolves with a Blob of MIME type `image/gif`. Rejects if `gif.js`
 * fires its `abort` event or the worker fails to spawn.
 *
 * Memory-bounded variants: for long sequences, prefer
 * `encodeGifStreamed` and reuse a single canvas across frames so the
 * canvas backing store doesn't multiply by frame count.
 */
export async function encodeGif(
  canvases: ReadonlyArray<EncodeFrameInput>,
  options: GifEncoderOptions,
): Promise<Blob> {
  if (canvases.length === 0) {
    throw new Error('encodeGif: at least one frame is required');
  }
  return encodeGifStreamed(options, (gif) => {
    for (const canvas of canvases) {
      gif.addFrame(canvas);
    }
  });
}

/**
 * Streaming variant — caller pushes frames into the encoder one at a
 * time inside `produceFrames`. This lets callers reuse a single canvas
 * across the whole sequence (gif.js's `copy: true` snapshots pixel data
 * at addFrame time, so the canvas can be safely overwritten between
 * frames).
 */
export async function encodeGifStreamed(
  options: GifEncoderOptions,
  produceFrames: (gif: {
    addFrame: (canvas: EncodeFrameInput, delayMs?: number) => void;
  }) => void | Promise<void>,
): Promise<Blob> {
  if (!Number.isFinite(options.fps) || options.fps <= 0) {
    throw new Error(`encodeGif: fps must be > 0 (got ${options.fps})`);
  }

  const factoryOpts = {
    workers: options.workers ?? 2,
    quality: options.quality ?? 10,
    width: options.width,
    height: options.height,
    workerScript: options.workerScript ?? '/gif.worker.js',
  };
  const gif: GifEncoderInstance = factoryOverride
    ? factoryOverride(factoryOpts)
    : await defaultFactory(factoryOpts);

  const defaultDelay = options.delayMs ?? Math.max(1, Math.round(1000 / options.fps));
  let frameCount = 0;
  const adapter = {
    addFrame(canvas: EncodeFrameInput, delayMs?: number): void {
      gif.addFrame(canvas, { delay: delayMs ?? defaultDelay, copy: true });
      frameCount++;
    },
  };

  await produceFrames(adapter);
  if (frameCount === 0) {
    throw new Error('encodeGif: produceFrames did not add any frames');
  }

  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    gif.on('finished', (blob) => {
      if (settled) return;
      settled = true;
      resolve(blob);
    });
    gif.on('abort', () => {
      if (settled) return;
      settled = true;
      reject(new Error('encodeGif: encoder aborted'));
    });
    try {
      gif.render();
    } catch (err) {
      if (settled) return;
      settled = true;
      reject(err);
    }
  });
}
