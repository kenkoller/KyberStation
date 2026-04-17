// ─── Share Pack — Card Snapshot ───
//
// Renders the Kyber Crystal to a PNG blob positioned as the
// bottom-right accent of a 1200×675 Saber Card. This ships the crystal
// portion of Share Pack; the full card renderer (hilt + blade hero)
// lands in its own sprint.
//
// The snapshot takes the config + crystal name and returns a Blob the
// caller can download or send through a share-sheet API.

import type { BladeConfig } from '@kyberstation/engine';
import { CrystalRenderer } from '@/lib/crystal';

// ─── Card constants ───

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 675;

/** Crystal accent occupies the bottom-right ~8% of the card. */
const CRYSTAL_SIZE = 180;
const CRYSTAL_MARGIN = 32;

// ─── Snapshot options ───

export interface CardSnapshotOptions {
  config: BladeConfig;
  /** Glyph string for the QR embedded inside the crystal. */
  glyph: string;
  /** Optional public crystal name printed above the crystal accent. */
  crystalName?: string;
  /** Optional preset name printed in the label strip. */
  presetName?: string;
  /** Override the canvas size (for smaller previews). */
  width?: number;
  height?: number;
}

// ─── Main ───

/**
 * Render a Saber Card-sized PNG with the crystal in the bottom-right.
 * The hilt + blade hero area is intentionally left as a placeholder
 * rectangle labelled "Blade render — see Share Pack" until the Share
 * Pack card renderer lands. The crystal portion IS shipped.
 *
 * Returns a PNG Blob.
 */
export async function renderCardSnapshot(options: CardSnapshotOptions): Promise<Blob> {
  const width = options.width ?? CARD_WIDTH;
  const height = options.height ?? CARD_HEIGHT;

  // 1. Render the crystal to an off-screen canvas via CrystalRenderer
  const renderer = new CrystalRenderer({
    config: options.config,
    glyph: options.glyph,
    qrEnabled: true,
  });
  // Let the renderer initialise (QR is async)
  await new Promise<void>((r) => setTimeout(r, 100));
  const crystalBlob = await renderer.snapshot(CRYSTAL_SIZE * 2); // 2x for retina
  renderer.dispose();

  // 2. Composite onto the Saber Card canvas
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? (new OffscreenCanvas(width, height) as unknown as HTMLCanvasElement)
      : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error('canvas context unavailable');

  // Backdrop
  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    50,
    width * 0.5,
    height * 0.45,
    width * 0.7,
  );
  grad.addColorStop(0, '#1a1f2e');
  grad.addColorStop(0.7, '#0a0f1a');
  grad.addColorStop(1, '#05060a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Header band
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fillRect(0, 0, width, 48);
  ctx.fillStyle = '#a8c6ff';
  ctx.font = "600 16px ui-monospace, 'SF Mono', Menlo, monospace";
  ctx.textBaseline = 'middle';
  ctx.fillText('◈ KYBERSTATION   ARCHIVE DATA CARD', 32, 24);

  // Hero placeholder — full card renderer will replace this in Share
  // Pack proper. Until then, we draw a subtle placeholder so the card
  // is self-describing about what's still to come.
  ctx.strokeStyle = 'rgba(168, 198, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(48, 72, width - 96, height - 200);
  ctx.fillStyle = 'rgba(168, 198, 255, 0.35)';
  ctx.font = "500 14px ui-monospace, monospace";
  ctx.textAlign = 'center';
  ctx.fillText(
    'Hilt + blade render — rendered via Share Pack',
    width / 2,
    height / 2 - 80,
  );
  ctx.textAlign = 'left';

  // Label strip
  const labelY = height - 110;
  ctx.fillStyle = '#e8efff';
  ctx.font = "600 18px ui-monospace, monospace";
  const label = options.presetName && options.crystalName
    ? `"${options.presetName}" — "${options.crystalName}"`
    : options.crystalName
      ? `"${options.crystalName}"`
      : options.presetName
        ? `"${options.presetName}"`
        : options.config.name ?? 'Untitled blade';
  ctx.fillText(label, 48, labelY);

  const spec = `${capitalise(options.config.style)} · ${colourName(options.config.baseColor)} · ${options.config.ignition} ignition ${options.config.ignitionMs}ms`;
  ctx.fillStyle = 'rgba(168, 198, 255, 0.75)';
  ctx.font = "400 13px ui-monospace, monospace";
  ctx.fillText(spec, 48, labelY + 26);

  ctx.fillStyle = 'rgba(168, 198, 255, 0.5)';
  ctx.fillText(options.glyph, 48, labelY + 50);

  // Footer
  ctx.fillStyle = 'rgba(168, 198, 255, 0.4)';
  ctx.font = "400 11px ui-monospace, monospace";
  ctx.fillText('github.com/kenkoller/KyberStation', 48, height - 24);

  // Crystal accent (bottom-right)
  const crystalImg = await blobToImage(crystalBlob);
  const crystalX = width - CRYSTAL_SIZE - CRYSTAL_MARGIN;
  const crystalY = height - CRYSTAL_SIZE - CRYSTAL_MARGIN;
  ctx.drawImage(crystalImg, crystalX, crystalY, CRYSTAL_SIZE, CRYSTAL_SIZE);

  // 3. Return as Blob
  const maybeOffscreen = canvas as unknown as { convertToBlob?: (opts: { type: string }) => Promise<Blob> };
  if (typeof maybeOffscreen.convertToBlob === 'function') {
    return await maybeOffscreen.convertToBlob({ type: 'image/png' });
  }
  return await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/png',
      1.0,
    );
  });
}

// ─── Helpers ───

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function colourName(c: { r: number; g: number; b: number }): string {
  // Cheap label — the real one comes from `apps/web/lib/saberColorNames.ts`
  // (or Session B's namingMath replacement). We avoid the import here to
  // keep this module self-contained.
  const { r, g, b } = c;
  if (r > 200 && g < 80 && b < 80) return 'Crimson';
  if (r < 80 && g > 180 && b < 100) return 'Jade';
  if (r < 80 && g < 180 && b > 200) return 'Azure';
  if (r > 200 && g > 180 && b < 100) return 'Saffron';
  if (r > 180 && g < 80 && b > 180) return 'Amethyst';
  if (r > 200 && g > 200 && b > 200) return 'Pure';
  return `RGB(${r},${g},${b})`;
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = URL.createObjectURL(blob);
  });
}
