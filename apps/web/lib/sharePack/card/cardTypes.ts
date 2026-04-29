// ─── Share Card — Shared Types ───
//
// Every drawer module imports from here. Agents working on individual
// drawers should NOT modify this file — if you need a new token, add
// it as a local export at the top of your drawer module and we'll
// factor it out during integration.

import type { BladeConfig } from '@kyberstation/engine';

// ─── Canvas 2D context (works for both HTMLCanvasElement and OffscreenCanvas) ───

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// ─── Public options (passed to renderCardSnapshot) ───

export interface CardSnapshotOptions {
  config: BladeConfig;
  /** Glyph string for the QR embedded in the corner. */
  glyph: string;
  /** Optional public crystal name printed in the metadata. */
  crystalName?: string;
  /** Optional preset name printed as the hero title. */
  presetName?: string;
  /** Layout preset — defaults to DEFAULT_LAYOUT (1200×675 landscape). */
  layout?: CardLayout;
  /** Theme preset — defaults to DEFAULT_THEME (dark deep-space). */
  theme?: CardTheme;
  /** Output width override (scales the layout). */
  width?: number;
  /** Output height override. */
  height?: number;
}

// ─── Layout — positions and sizes in logical card coordinates ───
//
// Most layouts are "horizontal-saber" (hilt left, blade extending right).
// A vertical-saber variant is supported via `saberOrientation: 'vertical'`
// + the `bladeY1`/`bladeY2`/`hiltY` fields below. Drawers check the
// orientation flag and consult the appropriate coordinate set.

export type SaberOrientation = 'horizontal' | 'vertical';

export interface CardLayout {
  id: string;

  /** Logical canvas width (may be scaled for output). */
  width: number;
  /** Logical canvas height. */
  height: number;

  /** Top header band height. */
  headerH: number;
  /** Bottom footer band height. */
  footerH: number;

  /** Hero area (saber) top Y. */
  heroY: number;
  /** Hero area height. */
  heroH: number;

  /** Hilt bounding box (left X). Horizontal: grip left edge. Vertical:
   *  hilt X-center anchor (combined with hiltW for horizontal width). */
  hiltX: number;
  /** Hilt bounding box width (long-axis when horizontal). */
  hiltW: number;
  /** Hilt bounding box height (short-axis when horizontal). */
  hiltH: number;

  /** Blade start X (typically hiltX + hiltW + emitterOffset). Used for
   *  horizontal sabers only. */
  bladeStartX: number;
  /** Blade end X (tip). Used for horizontal sabers only. */
  bladeEndX: number;
  /** Blade core thickness (perpendicular to the long axis). */
  bladeThickness: number;

  /** QR panel size (square). */
  qrSize: number;
  /** QR panel top-left X. */
  qrX: number;
  /** QR panel top-left Y. */
  qrY: number;
  /** Gap between QR and its "SCAN" label. */
  qrLabelGap: number;

  /** Metadata column left X. */
  metadataLeftX: number;
  /** Metadata title baseline Y. */
  metadataTopY: number;
  /** Metadata column max width (used for truncation). */
  metadataMaxWidth: number;

  // ─── Vertical-saber fields (optional; unused when horizontal) ───
  /** Saber orientation on this layout. Defaults to 'horizontal'. */
  saberOrientation?: SaberOrientation;
  /** Blade tip Y (top) — used when saberOrientation === 'vertical'. */
  bladeY1?: number;
  /** Blade emitter Y (bottom) — used when saberOrientation === 'vertical'. */
  bladeY2?: number;
  /** Hilt top Y — used when saberOrientation === 'vertical'. */
  hiltY?: number;
}

// ─── Theme — color palette tokens ───
//
// Drawers reference these tokens by name. Agent E will add LIGHT_THEME,
// IMPERIAL_THEME, JEDI_THEME, SPACE_THEME later — each should fill in
// every token so drawers never have to null-check.

export interface CardTheme {
  id: string;

  // ─── Backdrop ───
  /** Opacity of the blade-color inner wash on the backdrop radial. */
  backdropBladeWash: number;
  backdropMid: string;
  backdropOuter: string;
  backdropEdge: string;
  scanlineColor: string;
  scanlineAlpha: number;

  // ─── HUD chrome (drawn in drawBackdrop) ───
  gridColor: string;
  gridAlpha: number;
  hudBracketColor: string;
  watermarkColor: string;
  archiveStampBg: string;
  archiveStampText: string;
  /** Edge-vignette gradient outer color. Default themes use translucent
   *  black for darkening corners; light themes can use translucent white
   *  or warm cream for a paper-grain feel. */
  vignetteColor: string;

  // ─── Hilt ───
  /** Accent color override applied to the SVG hilt assembly. Default
   *  themes use a neutral chrome silver; faction themes can override
   *  (warm gold for Jedi parchment, crimson for Imperial, etc.). */
  hiltAccent: string;

  // ─── Blade ───
  /**
   * Compositing mode used when the blade renderer paints its bloom
   * mips + body capsule onto the card. Dark themes use `'lighter'`
   * (additive a + b) for a saturated halo against deep-space chrome.
   * Light themes that paint over a near-white backdrop must use
   * `'source-over'` (the default canvas op) — additive blending on a
   * paper-white field over-brightens to pure white and the blade
   * loses its color identity. `'screen'` (1 − (1−a)(1−b)) is also
   * valid for "soft additive" treatments. Each theme declares its
   * own preference here so `drawBlade` doesn't special-case theme
   * ids.
   */
  bladeComposite: GlobalCompositeOperation;

  // ─── Header ───
  headerBand: string;
  headerText: string;
  headerAccent: string;
  headerSeparator: string;

  // ─── Metadata ───
  metadataTitle: string;
  metadataSpec: string;
  metadataGlyphLabel: string;
  metadataGlyphText: string;

  // ─── Chips (drawn alongside metadata) ───
  chipBg: string;
  chipText: string;
  chipBorder: string;
  /** Faction glyph fill when a chip has a glyph marker. */
  chipGlyph: string;

  // ─── QR panel ───
  qrBg: string;
  qrLabelText: string;
  qrPanelBorder: string;

  // ─── Footer ───
  footerBand: string;
  footerText: string;
  footerSeparator: string;
}

// ─── CardContext — passed to every drawer ───

export interface CardContext {
  ctx: Ctx;
  options: CardSnapshotOptions;
  layout: CardLayout;
  theme: CardTheme;
  /** Pre-rendered QR raster (drawQr composites it onto the card). */
  qrCanvas: HTMLCanvasElement;
}

// ─── Chip — pill used in the metadata strip ───

export interface Chip {
  /** Label text (e.g. "Natural", "Jedi", "144 LEDs"). */
  label: string;
  /** Optional unicode glyph prefix (e.g. "☉", "✦", "◆"). */
  glyph?: string;
  /**
   * Optional override for border/glyph color. Use for strong semantic
   * markers (faction Jedi = jade, Sith = crimson, etc.). Falls back to
   * `theme.chipBorder` / `theme.chipGlyph`.
   */
  accent?: string;
}
