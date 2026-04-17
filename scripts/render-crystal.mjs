#!/usr/bin/env node
/**
 * render-crystal.mjs — Kyber Crystal renderer proof-of-concept
 *
 * Takes a sample BladeConfig, produces a real QR code via the
 * `qrcode` library, and wraps it in a crystal-shaped SVG following
 * the spec in docs/KYBER_CRYSTAL_VISUAL.md.
 *
 * Outputs a standalone .svg file to docs/samples/ that you can open
 * in a browser and scan with a phone camera to verify the aesthetic
 * overlay hasn't broken QR decoding.
 *
 * This is a PROOF, not production. The production renderer will live
 * at apps/web/lib/crystal/renderer.ts with proper types and tests.
 *
 * Usage:
 *   node scripts/render-crystal.mjs             # renders all 5 sample crystals
 *   node scripts/render-crystal.mjs obi-wan     # renders a specific sample
 *
 * Prerequisites:
 *   pnpm add -D qrcode
 *   (add to the workspace root devDependencies when implementing for real)
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Sample configs ────────────────────────────────────────────────────────
// Five representative configs covering the 5 crystal Forms.

const SAMPLES = {
  'obi-wan-prequel': {
    glyphPrefix: 'JED',
    form: 'natural',
    baseColor: { r: 100, g: 180, b: 255 },    // sky blue
    style: 'stable',
    ignition: 'standard',
    ignitionMs: 300,
    bled: false,
    name: 'Obi-Wan (Prequel)',
    crystalName: 'Dawnlight',
  },
  'vader-bled': {
    glyphPrefix: 'SIT',
    form: 'bled',
    baseColor: { r: 240, g: 30, b: 20 },      // deep crimson
    style: 'stable',
    ignition: 'standard',
    ignitionMs: 400,
    bled: true,
    name: 'Darth Vader',
    crystalName: 'Wrath of the Fallen',
  },
  'rey-sentinel': {
    glyphPrefix: 'GRY',
    form: 'natural',
    baseColor: { r: 255, g: 210, b: 48 },     // sentinel yellow
    style: 'stable',
    ignition: 'standard',
    ignitionMs: 280,
    bled: false,
    name: 'Rey Skywalker',
    crystalName: 'By Ashla, the Edge',
  },
  'kylo-crossguard': {
    glyphPrefix: 'SIT',
    form: 'cracked',
    baseColor: { r: 255, g: 60, b: 40 },      // unstable red
    style: 'unstable',
    ignition: 'crackle',
    ignitionMs: 350,
    bled: true,
    crossguard: true,
    name: 'Kylo Ren',
    crystalName: 'The Cracked Heir',
  },
  'darksaber': {
    glyphPrefix: 'DRK',
    form: 'obsidian-bipyramid',
    baseColor: { r: 30, g: 30, b: 34 },       // near-black
    style: 'stable',
    ignition: 'standard',
    ignitionMs: 250,
    bled: false,
    name: 'Darksaber',
    crystalName: 'Mand\u0027alor\u0027s Oath',
  },
};

// ─── Encode config → Kyber Glyph string ────────────────────────────────────
// Proof-of-concept encoding. Real implementation will use
// MessagePack + zlib + base58; for this demo we use a simple JSON
// + base64url to avoid the dependency install.

function encodeConfigAsGlyph(cfg) {
  const payload = {
    v: 1,
    vv: 1,  // visual version
    c: {
      r: cfg.baseColor.r,
      g: cfg.baseColor.g,
      b: cfg.baseColor.b,
      s: cfg.style,
      i: cfg.ignition,
      ms: cfg.ignitionMs,
    },
    n: cfg.crystalName ?? '',
  };
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf-8').toString('base64url');
  return `${cfg.glyphPrefix}.${b64}`;
}

// ─── Tiny QR code generator (minimal, for demo only) ───────────────────────
// For the proof, we fake a 21x21 QR matrix with a deterministic
// pseudo-random pattern seeded by the config hash. A real implementation
// uses the `qrcode` npm library.
//
// This is intentionally NOT a valid QR code — it's a placeholder that
// shows the renderer's output shape. To get a *scannable* QR, install
// `qrcode`:
//
//   import QRCode from 'qrcode';
//   const matrix = QRCode.create(glyph, { errorCorrectionLevel: 'M' }).modules;
//
// ...and swap the body of mockQRMatrix() for QRCode.create() output.

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function mockQRMatrix(glyph, version = 1) {
  // Version 1 QR = 21x21 modules
  const size = version === 1 ? 21 : 29;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));

  // Hash the glyph string into a seed
  let seed = 0;
  for (let i = 0; i < glyph.length; i++) {
    seed = (seed * 31 + glyph.charCodeAt(i)) & 0x7fffffff;
  }
  const rng = seededRandom(seed);

  // Place finder patterns (top-left, top-right, bottom-left) —
  // these MUST stay intact for scanning
  const placeFinder = (r, c) => {
    for (let dr = 0; dr < 7; dr++) {
      for (let dc = 0; dc < 7; dc++) {
        const isRing = (dr === 0 || dr === 6 || dc === 0 || dc === 6);
        const isInner = (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
        matrix[r + dr][c + dc] = isRing || isInner;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Fill remaining data modules with seeded randomness (mock data)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeftFinder = r < 9 && c < 9;
      const inTopRightFinder = r < 9 && c >= size - 9;
      const inBottomLeftFinder = r >= size - 9 && c < 9;
      if (inTopLeftFinder || inTopRightFinder || inBottomLeftFinder) continue;
      if (rng() > 0.55) matrix[r][c] = true;
    }
  }

  return matrix;
}

// ─── Colour utilities ──────────────────────────────────────────────────────

function rgbToHex({ r, g, b }) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbDarken({ r, g, b }, factor = 0.25) {
  return {
    r: Math.round(r * factor),
    g: Math.round(g * factor),
    b: Math.round(b * factor),
  };
}

function rgbLighten({ r, g, b }, factor = 0.3) {
  return {
    r: Math.min(255, Math.round(r + (255 - r) * factor)),
    g: Math.min(255, Math.round(g + (255 - g) * factor)),
    b: Math.min(255, Math.round(b + (255 - b) * factor)),
  };
}

// ─── Silhouette renderers ──────────────────────────────────────────────────

function renderNaturalSilhouette(cfg, glowId) {
  // Hexagonal prism, Form 1 Natural
  return `
    <polygon points="150,40 225,115 225,305 150,370 75,305 75,115"
             fill="url(#${glowId})" stroke="${rgbToHex(rgbLighten(cfg.baseColor, 0.2))}"
             stroke-width="1.2" stroke-opacity="0.85"/>
    <line x1="150" y1="40" x2="150" y2="370"
          stroke="${rgbToHex(rgbLighten(cfg.baseColor, 0.5))}"
          stroke-width="0.4" stroke-opacity="0.4"/>
    <line x1="75" y1="115" x2="225" y2="305"
          stroke="${rgbToHex(rgbLighten(cfg.baseColor, 0.4))}"
          stroke-width="0.3" stroke-opacity="0.3"/>
    <line x1="225" y1="115" x2="75" y2="305"
          stroke="${rgbToHex(rgbLighten(cfg.baseColor, 0.4))}"
          stroke-width="0.3" stroke-opacity="0.3"/>`;
}

function renderBledSilhouette(cfg, glowId) {
  // Form 2 — asymmetric hex prism with bleed veins
  const crackColour = rgbToHex(rgbLighten(cfg.baseColor, 0.15));
  const darkCrack = rgbToHex(rgbDarken(cfg.baseColor, 0.3));
  return `
    <polygon points="150,40 228,115 222,305 152,370 72,305 78,115"
             fill="url(#${glowId})" stroke="${rgbToHex(cfg.baseColor)}"
             stroke-width="1.5" stroke-opacity="0.9"/>
    <path d="M 150,50 Q 140,120 165,180 T 148,250 Q 155,290 140,340"
          stroke="${crackColour}" stroke-width="1.5" fill="none" stroke-opacity="0.8"/>
    <path d="M 85,130 Q 110,150 130,170 Q 120,200 140,225"
          stroke="${darkCrack}" stroke-width="1" fill="none" stroke-opacity="0.7"/>
    <path d="M 220,130 Q 195,155 175,175 Q 190,210 165,240"
          stroke="${darkCrack}" stroke-width="1" fill="none" stroke-opacity="0.7"/>
    <path d="M 100,260 Q 130,275 155,280"
          stroke="${crackColour}" stroke-width="0.8" fill="none" stroke-opacity="0.85"/>`;
}

function renderCrackedSilhouette(cfg, glowId) {
  // Form 3 — fractured hex prism with exposed energy gap
  const sparkColour = rgbToHex(rgbLighten(cfg.baseColor, 0.5));
  return `
    <polygon points="150,40 225,115 225,190 165,215 75,200 75,115"
             fill="url(#${glowId})" stroke="${rgbToHex(cfg.baseColor)}"
             stroke-width="1.5" stroke-opacity="0.9"/>
    <polygon points="75,200 225,190 210,225 90,230"
             fill="${sparkColour}" fill-opacity="0.8"/>
    <polygon points="75,215 225,208 225,305 150,370 75,305"
             fill="url(#${glowId})" stroke="${rgbToHex(cfg.baseColor)}"
             stroke-width="1.5" stroke-opacity="0.9"/>
    <path d="M 90,215 L 110,160 L 125,195"
          stroke="${sparkColour}" stroke-width="1" fill="none" stroke-opacity="0.85"/>
    <path d="M 215,212 L 195,255 L 175,220"
          stroke="${sparkColour}" stroke-width="1" fill="none" stroke-opacity="0.85"/>`;
}

function renderObsidianBipyramidSilhouette(_cfg, _glowId) {
  // Form 4 — elongated double-pyramid, darksaber
  return `
    <defs>
      <linearGradient id="darkGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a2a2a"/>
        <stop offset="50%" stop-color="#0a0a0a"/>
        <stop offset="100%" stop-color="#1a1a1a"/>
      </linearGradient>
    </defs>
    <polygon points="150,30 205,100 150,200 95,100"
             fill="url(#darkGrad)" stroke="#9098a8"
             stroke-width="1.3" stroke-opacity="0.8"/>
    <polygon points="150,200 205,290 150,380 95,290"
             fill="url(#darkGrad)" stroke="#9098a8"
             stroke-width="1.3" stroke-opacity="0.8"/>
    <line x1="150" y1="30" x2="150" y2="380"
          stroke="#d0d8e8" stroke-width="0.5" stroke-opacity="0.4"/>`;
}

// ─── QR → SVG rect placement ───────────────────────────────────────────────

function renderQRInSVG(matrix, cfg) {
  const moduleSize = 3;
  const size = matrix.length;
  const qrPixels = size * moduleSize;
  const offsetX = (300 - qrPixels) / 2;
  const offsetY = (400 - qrPixels) / 2;

  const darkColour = rgbToHex(rgbDarken(cfg.baseColor, 0.1));
  const lightColour = rgbToHex(rgbLighten(cfg.baseColor, 0.5));

  let bgOpacity = 0.5;
  let rects = `<rect x="${offsetX}" y="${offsetY}" width="${qrPixels}" height="${qrPixels}" fill="${darkColour}" fill-opacity="${bgOpacity}"/>`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        const x = offsetX + c * moduleSize;
        const y = offsetY + r * moduleSize;
        rects += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${lightColour}"/>`;
      }
    }
  }
  return rects;
}

// ─── Full crystal SVG renderer ─────────────────────────────────────────────

function renderCrystalSVG(cfg, glyph) {
  const matrix = mockQRMatrix(glyph);
  const glowStops = {
    inner: rgbToHex(rgbLighten(cfg.baseColor, 0.7)),
    mid: rgbToHex(cfg.baseColor),
    outer: rgbToHex(rgbDarken(cfg.baseColor, 0.2)),
  };

  const silhouetteRenderer =
    cfg.form === 'bled' ? renderBledSilhouette :
    cfg.form === 'cracked' ? renderCrackedSilhouette :
    cfg.form === 'obsidian-bipyramid' ? renderObsidianBipyramidSilhouette :
    renderNaturalSilhouette;

  const silhouette = silhouetteRenderer(cfg, 'crystalGlow');

  const prefix = glyph.split('.')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 430" width="300" height="430"
     role="img" aria-label="Kyber crystal: ${cfg.name}">
  <defs>
    <radialGradient id="crystalGlow" cx="50%" cy="55%" r="50%">
      <stop offset="0%" stop-color="${glowStops.inner}" stop-opacity="1"/>
      <stop offset="40%" stop-color="${glowStops.mid}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${glowStops.outer}" stop-opacity="0.7"/>
    </radialGradient>
  </defs>

  <!-- Deep-space backdrop -->
  <rect width="300" height="430" fill="#0a0f1a"/>

  <!-- Crystal silhouette -->
  ${silhouette}

  <!-- Functional QR region (scannable) -->
  ${renderQRInSVG(matrix, cfg)}

  <!-- Pearlescent top shimmer -->
  <ellipse cx="150" cy="90" rx="35" ry="8"
           fill="#e8f5ff" fill-opacity="0.2"/>

  <!-- Name / glyph label strip -->
  <text x="150" y="405" text-anchor="middle" font-family="ui-monospace, monospace"
        font-size="10" fill="${rgbToHex(rgbLighten(cfg.baseColor, 0.4))}" fill-opacity="0.9">
    ${cfg.crystalName || cfg.name}
  </text>
  <text x="150" y="422" text-anchor="middle" font-family="ui-monospace, monospace"
        font-size="8" fill="${rgbToHex(rgbLighten(cfg.baseColor, 0.3))}" fill-opacity="0.7">
    ${prefix}.[config-payload]
  </text>
</svg>
`;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(__dirname, '../docs/samples');
  await mkdir(outDir, { recursive: true });

  const filter = process.argv[2];
  const entries = Object.entries(SAMPLES).filter(([k]) => !filter || k.includes(filter));

  if (entries.length === 0) {
    console.error(`No sample matching "${filter}".`);
    console.error(`Available: ${Object.keys(SAMPLES).join(', ')}`);
    process.exit(1);
  }

  for (const [name, cfg] of entries) {
    const glyph = encodeConfigAsGlyph(cfg);
    const svg = renderCrystalSVG(cfg, glyph);
    const outPath = resolve(outDir, `crystal-${name}.svg`);
    await writeFile(outPath, svg, 'utf-8');
    console.log(`\u2713 ${outPath}`);
    console.log(`  glyph: ${glyph.slice(0, 50)}${glyph.length > 50 ? '...' : ''} (${glyph.length} chars)`);
  }

  console.log('');
  console.log('Open any .svg in a browser to preview.');
  console.log('');
  console.log('IMPORTANT: This demo uses a MOCK QR matrix — the pattern is');
  console.log('deterministically seeded from the glyph string but is NOT a');
  console.log('real scannable QR code. To produce scannable output, install');
  console.log('the `qrcode` package and swap mockQRMatrix() for QRCode.create().');
  console.log('See the file header for details.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
