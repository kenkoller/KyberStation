'use client';
import { useEffect, useState, useRef } from 'react';
import { BladeEngine } from '@kyberstation/engine';
import type { BladeConfig } from '@kyberstation/engine';

/**
 * Thumbnail dimensions for the engine-rendered preview strip.
 */
const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 24;

/**
 * Base warmup frames after ignition completes for steady-state effects.
 */
const STEADY_STATE_FRAMES = 10;

/**
 * Simulated delta time per warmup frame (ms).
 */
const FRAME_DT = 16;

/**
 * Module-level cache so thumbnails persist across component mounts.
 * Keyed by a stable serialization of the config that affects visual output.
 */
const thumbnailCache = new Map<string, string>();

/**
 * Build a stable cache key from the subset of BladeConfig properties
 * that affect the thumbnail appearance.
 */
function buildCacheKey(config: BladeConfig): string {
  const { baseColor, style, shimmer, ledCount, ignitionMs, spatialDirection } = config;
  return `${baseColor.r},${baseColor.g},${baseColor.b}|${style}|${shimmer}|${ledCount}|${ignitionMs ?? 300}|${spatialDirection ?? 'hilt-to-tip'}`;
}

/**
 * Render a preset config into a data URL thumbnail using a headless BladeEngine.
 * Returns null if OffscreenCanvas is unavailable (SSR or unsupported browser).
 */
function renderThumbnail(config: BladeConfig): string | null {
  // OffscreenCanvas is not available in SSR
  if (typeof OffscreenCanvas === 'undefined') return null;

  const engine = new BladeEngine();
  engine.ignite();

  // Run enough frames to complete ignition + reach steady state
  const ignitionFrames = Math.ceil((config.ignitionMs ?? 300) / FRAME_DT);
  const warmupTotal = ignitionFrames + STEADY_STATE_FRAMES;
  for (let i = 0; i < warmupTotal; i++) {
    engine.update(FRAME_DT, config);
  }

  const pixels = engine.getPixels();
  const ledCount = engine.topology.totalLEDs;

  // Render at 2x for the glow pass, then composite
  const GLOW_PAD = 8; // vertical padding for bloom
  const FULL_H = THUMB_HEIGHT + GLOW_PAD * 2;
  const canvas = new OffscreenCanvas(THUMB_WIDTH, FULL_H);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Dark background
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, THUMB_WIDTH, FULL_H);

  // Draw soft glow layer first (wider, blurred-ish strips)
  const pixelWidth = THUMB_WIDTH / ledCount;
  for (let i = 0; i < ledCount; i++) {
    const pr = pixels[i * 3];
    const pg = pixels[i * 3 + 1];
    const pb = pixels[i * 3 + 2];
    const x = Math.floor(i * pixelWidth);
    const nextX = Math.ceil((i + 1) * pixelWidth);
    const w = nextX - x;

    // Outer glow (diffuse)
    const glowGrad = ctx.createLinearGradient(0, 0, 0, FULL_H);
    glowGrad.addColorStop(0, `rgba(${pr},${pg},${pb},0)`);
    glowGrad.addColorStop(0.25, `rgba(${pr},${pg},${pb},0.15)`);
    glowGrad.addColorStop(0.5, `rgba(${pr},${pg},${pb},0.3)`);
    glowGrad.addColorStop(0.75, `rgba(${pr},${pg},${pb},0.15)`);
    glowGrad.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
    ctx.fillStyle = glowGrad;
    ctx.fillRect(x, 0, w, FULL_H);
  }

  // Draw core blade strip (bright, sharp)
  const coreTop = GLOW_PAD + 2;
  const coreH = THUMB_HEIGHT - 4;
  for (let i = 0; i < ledCount; i++) {
    const pr = pixels[i * 3];
    const pg = pixels[i * 3 + 1];
    const pb = pixels[i * 3 + 2];
    ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
    const x = Math.floor(i * pixelWidth);
    const nextX = Math.ceil((i + 1) * pixelWidth);
    ctx.fillRect(x, coreTop, nextX - x, coreH);
  }

  // White-hot center line for intensity
  const centerY = GLOW_PAD + THUMB_HEIGHT / 2;
  for (let i = 0; i < ledCount; i++) {
    const pr = pixels[i * 3];
    const pg = pixels[i * 3 + 1];
    const pb = pixels[i * 3 + 2];
    const brightness = (pr + pg + pb) / (255 * 3);
    if (brightness > 0.1) {
      ctx.fillStyle = `rgba(255,255,255,${brightness * 0.4})`;
      const x = Math.floor(i * pixelWidth);
      const nextX = Math.ceil((i + 1) * pixelWidth);
      ctx.fillRect(x, centerY - 2, nextX - x, 4);
    }
  }

  // Convert to data URL via temporary visible canvas
  const imageData = ctx.getImageData(0, 0, THUMB_WIDTH, FULL_H);
  return canvasToDataUrl(imageData);
}

/**
 * Animation frame generation constants.
 */
const ANIM_TOTAL_FRAMES = 100;
const ANIM_CAPTURE_INTERVAL = 7;

/**
 * Module-level cache for animation frames.
 */
const animationCache = new Map<string, string[]>();

/**
 * Convert ImageData to a data URL using a temporary canvas element.
 */
function canvasToDataUrl(imageData: ImageData): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Render a frame from engine pixels onto a canvas context, returning ImageData.
 */
function renderFrame(
  pixels: Uint8Array,
  ledCount: number,
): ImageData | null {
  if (typeof OffscreenCanvas === 'undefined') return null;

  const GLOW_PAD = 8;
  const FULL_H = THUMB_HEIGHT + GLOW_PAD * 2;
  const canvas = new OffscreenCanvas(THUMB_WIDTH, FULL_H);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, THUMB_WIDTH, FULL_H);

  const pixelWidth = THUMB_WIDTH / ledCount;

  // Glow layer
  for (let i = 0; i < ledCount; i++) {
    const pr = pixels[i * 3];
    const pg = pixels[i * 3 + 1];
    const pb = pixels[i * 3 + 2];
    const x = Math.floor(i * pixelWidth);
    const nextX = Math.ceil((i + 1) * pixelWidth);
    const w = nextX - x;
    const glowGrad = ctx.createLinearGradient(0, 0, 0, FULL_H);
    glowGrad.addColorStop(0, `rgba(${pr},${pg},${pb},0)`);
    glowGrad.addColorStop(0.25, `rgba(${pr},${pg},${pb},0.15)`);
    glowGrad.addColorStop(0.5, `rgba(${pr},${pg},${pb},0.3)`);
    glowGrad.addColorStop(0.75, `rgba(${pr},${pg},${pb},0.15)`);
    glowGrad.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
    ctx.fillStyle = glowGrad;
    ctx.fillRect(x, 0, w, FULL_H);
  }

  // Core blade strip
  const coreTop = GLOW_PAD + 2;
  const coreH = THUMB_HEIGHT - 4;
  for (let i = 0; i < ledCount; i++) {
    const pr = pixels[i * 3];
    const pg = pixels[i * 3 + 1];
    const pb = pixels[i * 3 + 2];
    ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
    const x = Math.floor(i * pixelWidth);
    const nextX = Math.ceil((i + 1) * pixelWidth);
    ctx.fillRect(x, coreTop, nextX - x, coreH);
  }

  // White-hot center line
  const centerY = GLOW_PAD + THUMB_HEIGHT / 2;
  for (let i = 0; i < ledCount; i++) {
    const pr = pixels[i * 3];
    const pg = pixels[i * 3 + 1];
    const pb = pixels[i * 3 + 2];
    const brightness = (pr + pg + pb) / (255 * 3);
    if (brightness > 0.1) {
      ctx.fillStyle = `rgba(255,255,255,${brightness * 0.4})`;
      const x = Math.floor(i * pixelWidth);
      const nextX = Math.ceil((i + 1) * pixelWidth);
      ctx.fillRect(x, centerY - 2, nextX - x, 4);
    }
  }

  return ctx.getImageData(0, 0, THUMB_WIDTH, FULL_H);
}

/**
 * Render animation frames for a preset config.
 * Runs the engine for ANIM_TOTAL_FRAMES frames, capturing every ANIM_CAPTURE_INTERVAL-th.
 */
export function renderAnimationFrames(config: BladeConfig): string[] | null {
  if (typeof OffscreenCanvas === 'undefined') return null;

  const engine = new BladeEngine();
  engine.ignite();

  // Warmup until ignition completes + steady state
  const ignitionFrames = Math.ceil((config.ignitionMs ?? 300) / FRAME_DT);
  const warmupTotal = ignitionFrames + STEADY_STATE_FRAMES;
  for (let i = 0; i < warmupTotal; i++) {
    engine.update(FRAME_DT, config);
  }

  const frames: string[] = [];

  for (let f = 0; f < ANIM_TOTAL_FRAMES; f++) {
    engine.update(FRAME_DT, config);

    if (f % ANIM_CAPTURE_INTERVAL === 0) {
      const pixels = engine.getPixels();
      const ledCount = engine.topology.totalLEDs;
      const imageData = renderFrame(pixels, ledCount);
      if (imageData) {
        const url = canvasToDataUrl(imageData);
        if (url) frames.push(url);
      }
    }
  }

  return frames.length > 0 ? frames : null;
}

/**
 * Get cached animation frames, or compute and cache them lazily.
 */
export function getAnimationFrames(config: BladeConfig): string[] | null {
  const key = buildCacheKey(config);
  const cached = animationCache.get(key);
  if (cached) return cached;

  const frames = renderAnimationFrames(config);
  if (frames) {
    animationCache.set(key, frames);
  }
  return frames;
}

/**
 * Hook that returns a data URL for an engine-rendered blade thumbnail.
 *
 * - Creates a headless BladeEngine with the given preset config
 * - Runs warmup frames to reach steady state
 * - Reads LED pixels and draws them as a horizontal strip
 * - Caches results to avoid re-rendering
 *
 * @param config - The BladeConfig to render a thumbnail for
 * @returns A data URL string, or null if not yet rendered / unavailable
 */
export function usePresetThumbnail(config: BladeConfig): string | null {
  const cacheKey = buildCacheKey(config);
  const [dataUrl, setDataUrl] = useState<string | null>(() => {
    return thumbnailCache.get(cacheKey) ?? null;
  });
  const pendingKeyRef = useRef(cacheKey);

  useEffect(() => {
    pendingKeyRef.current = cacheKey;

    // Check cache first
    const cached = thumbnailCache.get(cacheKey);
    if (cached) {
      setDataUrl(cached);
      return;
    }

    // Render asynchronously to avoid blocking the main thread during
    // initial gallery load with many presets
    const timeoutId = requestAnimationFrame(() => {
      // Bail if the config changed while we were waiting
      if (pendingKeyRef.current !== cacheKey) return;

      const result = renderThumbnail(config);
      if (result) {
        thumbnailCache.set(cacheKey, result);
      }
      // Only update state if this is still the current config
      if (pendingKeyRef.current === cacheKey) {
        setDataUrl(result);
      }
    });

    return () => cancelAnimationFrame(timeoutId);
  }, [cacheKey, config]);

  return dataUrl;
}
