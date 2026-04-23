// ─── Card Layout Presets ───
//
// Each layout is a full dimensional spec the drawers consume. Every
// field must be set — drawers should never have to fall back to
// defaults. All dimensions are in logical pixels at the layout's native
// scale; renderCardSnapshot handles scaling to output width/height.

import type { CardLayout } from './cardTypes';

// ─── 16:9 Default (Share Card canonical) — 1200×675 ───

export const DEFAULT_LAYOUT: CardLayout = {
  id: 'default',
  width: 1200,
  height: 675,
  headerH: 48,
  footerH: 40,
  heroY: 72,
  heroH: 220,
  hiltX: 80,
  hiltW: 260,
  hiltH: 56,
  bladeStartX: 346, // hiltX + hiltW + 6
  bladeEndX: 1120,
  bladeThickness: 26,
  qrSize: 168,
  qrX: 992,
  qrY: 451,
  qrLabelGap: 14,
  metadataLeftX: 56,
  metadataTopY: 344,
  metadataMaxWidth: 896,
};

// ─── Twitter / Open Graph (1.91:1) — 1200×630 ───
//
// 45px shorter than default. Hero stays the same size; footer / QR /
// metadata compress slightly so nothing falls off the bottom.

export const OG_LAYOUT: CardLayout = {
  id: 'og',
  width: 1200,
  height: 630,
  headerH: 44,
  footerH: 36,
  heroY: 64,
  heroH: 200,
  hiltX: 80,
  hiltW: 240,
  hiltH: 52,
  bladeStartX: 326,
  bladeEndX: 1120,
  bladeThickness: 24,
  qrSize: 150,
  qrX: 1010,
  qrY: 420,
  qrLabelGap: 12,
  metadataLeftX: 56,
  metadataTopY: 314,
  metadataMaxWidth: 910,
};

// ─── Instagram Square (1:1) — 1080×1080 ───
//
// Much more vertical breathing room. Hero stays horizontal but centred
// around the vertical midpoint; metadata + QR + footer fill the bottom
// half. Good for feed posts.

export const INSTAGRAM_LAYOUT: CardLayout = {
  id: 'instagram',
  width: 1080,
  height: 1080,
  headerH: 56,
  footerH: 48,
  heroY: 300,
  heroH: 240,
  hiltX: 80,
  hiltW: 220,
  hiltH: 56,
  bladeStartX: 306,
  bladeEndX: 1000,
  bladeThickness: 26,
  qrSize: 180,
  qrX: 860,
  qrY: 820,
  qrLabelGap: 14,
  metadataLeftX: 64,
  metadataTopY: 610,
  metadataMaxWidth: 760,
};

// ─── Instagram Story (9:16) — 1080×1920 ───
//
// Tall vertical canvas. Saber rides around the vertical 1/3 line;
// metadata occupies the middle/lower band; QR anchors the bottom-right.

export const STORY_LAYOUT: CardLayout = {
  id: 'story',
  width: 1080,
  height: 1920,
  headerH: 64,
  footerH: 52,
  heroY: 540,
  heroH: 260,
  hiltX: 80,
  hiltW: 220,
  hiltH: 58,
  bladeStartX: 306,
  bladeEndX: 1000,
  bladeThickness: 28,
  qrSize: 220,
  qrX: 820,
  qrY: 1620,
  qrLabelGap: 16,
  metadataLeftX: 72,
  metadataTopY: 890,
  metadataMaxWidth: 840,
};

// ─── Catalog + lookup ───

export const LAYOUT_CATALOG: Record<string, CardLayout> = {
  default: DEFAULT_LAYOUT,
  og: OG_LAYOUT,
  instagram: INSTAGRAM_LAYOUT,
  story: STORY_LAYOUT,
};

export function getLayout(id: string): CardLayout {
  return LAYOUT_CATALOG[id] ?? DEFAULT_LAYOUT;
}
