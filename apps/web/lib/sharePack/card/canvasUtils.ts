// ─── Canvas 2D drawing utilities shared by card drawers ───

import type { Ctx } from './cardTypes';

/** Rounded-rect fill with a fallback for environments without native `roundRect`. */
export function fillRoundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const c = ctx as Ctx & {
    roundRect?: (x: number, y: number, w: number, h: number, r: number | number[]) => void;
  };
  ctx.beginPath();
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r);
  } else {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** Rounded-rect stroke (paired with `fillRoundRect` for chip borders). */
export function strokeRoundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const c = ctx as Ctx & {
    roundRect?: (x: number, y: number, w: number, h: number, r: number | number[]) => void;
  };
  ctx.beginPath();
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r);
  } else {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
  }
  ctx.closePath();
  ctx.stroke();
}

/** Truncate text with an ellipsis so it fits within `maxWidth`. */
export function fitText(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const candidate = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + ellipsis;
}

/** Small helper — capitalise first letter. */
export function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/** Cheap RGB→name mapping for the spec line. */
export function colourName(c: { r: number; g: number; b: number }): string {
  const { r, g, b } = c;
  if (r > 200 && g < 80 && b < 80) return 'Crimson';
  if (r < 80 && g > 180 && b < 100) return 'Jade';
  if (r < 80 && g < 180 && b > 200) return 'Azure';
  if (r > 200 && g > 180 && b < 100) return 'Saffron';
  if (r > 180 && g < 80 && b > 180) return 'Amethyst';
  if (r > 200 && g > 200 && b > 200) return 'Pure';
  return `RGB(${r},${g},${b})`;
}

/** Blob → HTMLImageElement (used to composite rendered sub-images). */
export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = URL.createObjectURL(blob);
  });
}

/** Load an SVG string as an Image via blob URL. */
export function svgStringToImage(svg: string): Promise<HTMLImageElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  return blobToImage(blob);
}
