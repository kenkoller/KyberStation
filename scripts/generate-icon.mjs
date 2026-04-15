#!/usr/bin/env node
/**
 * Generates a BladeForge app icon as a PNG set and .icns file.
 * Uses Node canvas-free approach: writes a simple icon via raw pixel data.
 *
 * For macOS .icns we create PNGs at required sizes and use iconutil.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ICONSET = resolve(ROOT, 'BladeForge.iconset');

// We'll create the icon using sips to rasterize from a simple approach:
// Create a 1024x1024 HTML canvas rendered to PNG via a quick script

const sizes = [16, 32, 64, 128, 256, 512, 1024];

// Generate SVG icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a12"/>
      <stop offset="100%" stop-color="#12121e"/>
    </linearGradient>
    <linearGradient id="blade" x1="0.5" y1="1" x2="0.5" y2="0">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="30%" stop-color="#00e5ff"/>
      <stop offset="100%" stop-color="#00b8d4"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="20" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="outerGlow">
      <feGaussianBlur stdDeviation="40" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
  <rect width="1024" height="1024" rx="220" fill="none" stroke="rgba(0,229,255,0.15)" stroke-width="3"/>
  <!-- Blade glow -->
  <line x1="512" y1="140" x2="512" y2="620" stroke="#00e5ff" stroke-width="60" stroke-linecap="round" opacity="0.2" filter="url(#outerGlow)"/>
  <!-- Blade -->
  <line x1="512" y1="160" x2="512" y2="600" stroke="url(#blade)" stroke-width="28" stroke-linecap="round" filter="url(#glow)"/>
  <!-- Blade core (white hot center) -->
  <line x1="512" y1="180" x2="512" y2="580" stroke="white" stroke-width="8" stroke-linecap="round" opacity="0.9"/>
  <!-- Hilt guard -->
  <rect x="472" y="620" width="80" height="16" rx="4" fill="#888" stroke="#666" stroke-width="2"/>
  <!-- Hilt grip -->
  <rect x="492" y="636" width="40" height="180" rx="6" fill="#555"/>
  <!-- Grip lines -->
  <line x1="496" y1="660" x2="528" y2="660" stroke="#444" stroke-width="2"/>
  <line x1="496" y1="680" x2="528" y2="680" stroke="#444" stroke-width="2"/>
  <line x1="496" y1="700" x2="528" y2="700" stroke="#444" stroke-width="2"/>
  <line x1="496" y1="720" x2="528" y2="720" stroke="#444" stroke-width="2"/>
  <line x1="496" y1="740" x2="528" y2="740" stroke="#444" stroke-width="2"/>
  <line x1="496" y1="760" x2="528" y2="760" stroke="#444" stroke-width="2"/>
  <line x1="496" y1="780" x2="528" y2="780" stroke="#444" stroke-width="2"/>
  <!-- Pommel -->
  <rect x="488" y="816" width="48" height="24" rx="8" fill="#666"/>
  <!-- Activation button -->
  <circle cx="480" cy="690" r="8" fill="#e22" opacity="0.9"/>
  <circle cx="480" cy="690" r="4" fill="#ff4444" opacity="0.8"/>
  <!-- Text -->
  <text x="512" y="940" text-anchor="middle" font-family="SF Mono, Menlo, monospace" font-size="64" font-weight="bold" fill="#00e5ff" opacity="0.8">BF</text>
</svg>`;

try {
  // Write SVG
  const svgPath = resolve(ROOT, 'BladeForge-icon.svg');
  writeFileSync(svgPath, svg);

  // Create iconset directory
  mkdirSync(ICONSET, { recursive: true });

  // Use sips (macOS built-in) to convert SVG → PNG at various sizes
  // sips can't handle SVG, so we'll use qlmanage or a different approach
  // Actually, let's use the `rsvg-convert` if available, or fall back to sips with a PNG

  // Try using qlmanage (Quick Look) to render SVG to PNG at 1024x1024
  const png1024 = resolve(ICONSET, 'icon_512x512@2x.png');

  try {
    // Method 1: Use rsvg-convert if available
    execFileSync('which', ['rsvg-convert'], { stdio: 'pipe' });
    for (const size of sizes) {
      const name = size <= 512
        ? `icon_${size}x${size}.png`
        : `icon_512x512@2x.png`;
      execFileSync('rsvg-convert', [
        '-w', String(size), '-h', String(size),
        '-o', resolve(ICONSET, name),
        svgPath
      ]);
      // Also create @2x variants
      if (size <= 256) {
        const retina = `icon_${size}x${size}@2x.png`;
        execFileSync('rsvg-convert', [
          '-w', String(size * 2), '-h', String(size * 2),
          '-o', resolve(ICONSET, retina),
          svgPath
        ]);
      }
    }
  } catch {
    // Method 2: Use sips with a temporary WebKit render via qlmanage
    console.log('  rsvg-convert not found, using qlmanage...');
    const tmpDir = resolve(ROOT, '.icon-tmp');
    mkdirSync(tmpDir, { recursive: true });

    try {
      execFileSync('qlmanage', ['-t', '-s', '1024', '-o', tmpDir, svgPath], { stdio: 'pipe' });
      const rendered = resolve(tmpDir, 'BladeForge-icon.svg.png');

      for (const size of sizes) {
        const name = size <= 512
          ? `icon_${size}x${size}.png`
          : `icon_512x512@2x.png`;
        execFileSync('sips', ['-z', String(size), String(size), rendered, '--out', resolve(ICONSET, name)], { stdio: 'pipe' });

        if (size <= 256) {
          const retina = `icon_${size}x${size}@2x.png`;
          execFileSync('sips', ['-z', String(size * 2), String(size * 2), rendered, '--out', resolve(ICONSET, retina)], { stdio: 'pipe' });
        }
      }
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Generate .icns from iconset
  const icnsPath = resolve(ROOT, 'BladeForge.app', 'Contents', 'Resources', 'AppIcon.icns');
  execFileSync('iconutil', ['-c', 'icns', '-o', icnsPath, ICONSET]);

  // Also copy to public for PWA
  execFileSync('cp', [resolve(ICONSET, 'icon_512x512@2x.png'), resolve(ROOT, 'apps', 'web', 'public', 'icon-1024.png')]);

  // Cleanup
  rmSync(ICONSET, { recursive: true, force: true });

  console.log('  Icon generated at', icnsPath);
} catch (err) {
  console.error('Icon generation failed:', err.message);
  console.log('  The .app will work without a custom icon.');
}
