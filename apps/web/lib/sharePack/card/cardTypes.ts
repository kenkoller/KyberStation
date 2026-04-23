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

  /** Hilt bounding box (left X). */
  hiltX: number;
  /** Hilt bounding box width. */
  hiltW: number;
  /** Hilt bounding box height. */
  hiltH: number;

  /** Blade start X (typically hiltX + hiltW + emitterOffset). */
  bladeStartX: number;
  /** Blade end X (tip). */
  bladeEndX: number;
  /** Blade core thickness. */
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
