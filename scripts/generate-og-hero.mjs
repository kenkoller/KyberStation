#!/usr/bin/env node
/**
 * generate-og-hero.mjs — produce apps/web/public/og-hero.png
 *
 * 1200×630 Open Graph hero image for Reddit / Twitter / Discord
 * link previews. Mirrors the landing page composition: two
 * horizontal sabers flanking the KYBERSTATION wordmark on a
 * deep-space backdrop.
 *
 * Run:
 *   node scripts/generate-og-hero.mjs
 *
 * Prerequisites:
 *   `canvas` is already a devDependency (added by PR #147 for
 *   the renderer golden-hash harness).
 */

import { createCanvas } from 'canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../apps/web/public/og-hero.png');

const WIDTH = 1200;
const HEIGHT = 630;

// Match the deep-space background token (--bg-deep ≈ #0a0a10).
const BG = '#0a0a10';

// Two saber colors — pulled from the landing's hero array.
const SABER_BLUE = { r: 0, g: 140, b: 255 };
const SABER_RED = { r: 255, g: 40, b: 40 };

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Background fill.
ctx.fillStyle = BG;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Subtle vignette via radial gradient (lights center, darks edges).
const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 100, WIDTH / 2, HEIGHT / 2, WIDTH * 0.7);
vignette.addColorStop(0, 'rgba(20, 24, 38, 0.18)');
vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
ctx.fillStyle = vignette;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// ─── Saber renderer ──────────────────────────────────────────────────────
function drawHilt(x, y, hiltLength, hiltHeight, direction) {
  // Direction: 'left' (blade extends right from hilt), 'right' (blade extends
  // left from hilt). Hilt is a simple grayscale capsule with grip rings.
  const cx = x;
  const cy = y;
  const w = hiltLength;
  const h = hiltHeight;

  // Body
  ctx.fillStyle = '#3a3e48';
  ctx.fillRect(cx, cy - h / 2, w, h);

  // Grip rings (4 vertical lines)
  ctx.fillStyle = '#1f2229';
  const ringCount = 4;
  for (let i = 0; i < ringCount; i++) {
    const rx = cx + (w * (i + 1)) / (ringCount + 1);
    ctx.fillRect(rx - 1, cy - h / 2, 2, h);
  }

  // Pommel + emitter caps
  ctx.fillStyle = '#5a606b';
  const capW = 8;
  if (direction === 'left') {
    ctx.fillRect(cx, cy - h / 2 - 2, capW, h + 4); // pommel (left)
    ctx.fillRect(cx + w - capW, cy - h / 2 - 4, capW, h + 8); // emitter (right)
  } else {
    ctx.fillRect(cx + w - capW, cy - h / 2 - 2, capW, h + 4);
    ctx.fillRect(cx, cy - h / 2 - 4, capW, h + 8);
  }
}

function drawBlade(x, y, length, thickness, color, direction) {
  // Core blade (saturated centerline).
  const coreColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
  const haloColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`;

  const startX = direction === 'left' ? x : x - length;
  const endX = direction === 'left' ? x + length : x;

  // Halo (3 mip-style passes — outer most diffuse).
  for (let pass = 3; pass >= 1; pass--) {
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.15 / pass})`;
    const tHalo = thickness + pass * 14;
    ctx.fillRect(startX, y - tHalo / 2, endX - startX, tHalo);
  }

  // White-hot core (almost-white inner band).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(startX, y - thickness / 4, endX - startX, thickness / 2);

  // Body color band.
  ctx.fillStyle = coreColor;
  ctx.fillRect(startX, y - thickness / 2, endX - startX, thickness);

  // Restore the white core on top so the saturation reads.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(startX, y - thickness / 6, endX - startX, thickness / 3);
}

// ─── Composition ─────────────────────────────────────────────────────────

// Top saber — blue, hilt at left, blade extends right.
const topY = HEIGHT * 0.22;
const topHiltX = 80;
const topHiltLen = 130;
const topHiltH = 28;
const topBladeStart = topHiltX + topHiltLen;
const topBladeLen = WIDTH - topBladeStart - 80;

drawBlade(topBladeStart, topY, topBladeLen, 12, SABER_BLUE, 'left');
drawHilt(topHiltX, topY, topHiltLen, topHiltH, 'left');

// Bottom saber — red, hilt at right, blade extends left.
const botY = HEIGHT * 0.78;
const botHiltLen = 130;
const botHiltH = 28;
const botHiltX = WIDTH - 80 - botHiltLen;
const botBladeEnd = botHiltX;
const botBladeLen = botBladeEnd - 80;

drawBlade(botBladeEnd, botY, botBladeLen, 12, SABER_RED, 'right');
drawHilt(botHiltX, botY, botHiltLen, botHiltH, 'right');

// ─── Wordmark ────────────────────────────────────────────────────────────
ctx.fillStyle = '#ffffff';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Title (Orbitron-ish; canvas falls back if Orbitron not available).
ctx.font = 'bold 110px "Orbitron", "Helvetica", "Arial", sans-serif';
ctx.fillText('KYBERSTATION', WIDTH / 2, HEIGHT / 2 - 14);

// Subtitle — small accent monospace.
ctx.font = '500 22px "JetBrains Mono", "Menlo", "Courier New", monospace';
ctx.fillStyle = 'rgba(0, 140, 255, 0.85)';
ctx.fillText('UNIVERSAL  ·  SABER  ·  STYLE  ·  ENGINE', WIDTH / 2, HEIGHT / 2 + 56);

// Footer hint.
ctx.font = '500 16px "JetBrains Mono", "Menlo", monospace';
ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
ctx.fillText('kenkoller.github.io/KyberStation', WIDTH / 2, HEIGHT - 28);

// ─── Write file ──────────────────────────────────────────────────────────
await mkdir(dirname(OUT), { recursive: true });
const buf = canvas.toBuffer('image/png');
await writeFile(OUT, buf);
console.log(`Wrote ${OUT} (${(buf.length / 1024).toFixed(1)} KB, ${WIDTH}×${HEIGHT})`);
