// ─── Card Theme Presets ───
//
// Every theme must fill every token in CardTheme. Swap the whole theme
// object to re-paint the entire card — no drawer should special-case
// theme ids.

import type { CardTheme } from './cardTypes';

// ─── Default — deep-space dark ───

export const DEFAULT_THEME: CardTheme = {
  id: 'default',

  backdropBladeWash: 0.25,
  backdropMid: '#141826',
  backdropOuter: '#0a0d18',
  backdropEdge: '#05070e',
  scanlineColor: '#a8c6ff',
  scanlineAlpha: 0.04,

  gridColor: '#a8c6ff',
  gridAlpha: 0.04,
  hudBracketColor: 'rgba(168, 198, 255, 0.55)',
  watermarkColor: 'rgba(168, 198, 255, 0.06)',
  archiveStampBg: 'rgba(168, 198, 255, 0.08)',
  archiveStampText: 'rgba(168, 198, 255, 0.55)',

  headerBand: 'rgba(255, 255, 255, 0.035)',
  headerText: '#a8c6ff',
  headerAccent: 'rgba(168, 198, 255, 0.6)',
  headerSeparator: 'rgba(168, 198, 255, 0.25)',

  metadataTitle: '#ecf2ff',
  metadataSpec: 'rgba(168, 198, 255, 0.85)',
  metadataGlyphLabel: 'rgba(168, 198, 255, 0.55)',
  metadataGlyphText: 'rgba(232, 239, 255, 0.7)',

  chipBg: 'rgba(168, 198, 255, 0.08)',
  chipText: 'rgba(232, 239, 255, 0.85)',
  chipBorder: 'rgba(168, 198, 255, 0.35)',
  chipGlyph: 'rgba(168, 198, 255, 0.9)',

  qrBg: '#ffffff',
  qrLabelText: '#a8c6ff',
  qrPanelBorder: 'rgba(168, 198, 255, 0.2)',

  footerBand: 'rgba(255, 255, 255, 0.025)',
  footerText: 'rgba(168, 198, 255, 0.5)',
  footerSeparator: 'rgba(168, 198, 255, 0.15)',
};

// ─── Light — paper-white, for print or day-mode sharing ───

export const LIGHT_THEME: CardTheme = {
  id: 'light',

  backdropBladeWash: 0.08,
  backdropMid: '#e8edf5',
  backdropOuter: '#dce2ec',
  backdropEdge: '#c8cfd9',
  scanlineColor: '#2a3548',
  scanlineAlpha: 0.025,

  gridColor: '#2a3548',
  gridAlpha: 0.05,
  hudBracketColor: 'rgba(42, 53, 72, 0.5)',
  watermarkColor: 'rgba(42, 53, 72, 0.07)',
  archiveStampBg: 'rgba(42, 53, 72, 0.08)',
  archiveStampText: 'rgba(42, 53, 72, 0.7)',

  headerBand: 'rgba(255, 255, 255, 0.35)',
  headerText: '#1a2130',
  headerAccent: 'rgba(42, 53, 72, 0.7)',
  headerSeparator: 'rgba(42, 53, 72, 0.2)',

  metadataTitle: '#0e121c',
  metadataSpec: 'rgba(42, 53, 72, 0.85)',
  metadataGlyphLabel: 'rgba(42, 53, 72, 0.55)',
  metadataGlyphText: 'rgba(32, 40, 58, 0.75)',

  chipBg: 'rgba(42, 53, 72, 0.07)',
  chipText: 'rgba(26, 33, 48, 0.9)',
  chipBorder: 'rgba(42, 53, 72, 0.3)',
  chipGlyph: 'rgba(42, 53, 72, 0.85)',

  qrBg: '#ffffff',
  qrLabelText: '#1a2130',
  qrPanelBorder: 'rgba(42, 53, 72, 0.25)',

  footerBand: 'rgba(255, 255, 255, 0.4)',
  footerText: 'rgba(42, 53, 72, 0.55)',
  footerSeparator: 'rgba(42, 53, 72, 0.18)',
};

// ─── Imperial — crimson on charcoal, Sith / Empire aesthetic ───

export const IMPERIAL_THEME: CardTheme = {
  id: 'imperial',

  backdropBladeWash: 0.35,
  backdropMid: '#1e0f12',
  backdropOuter: '#12080a',
  backdropEdge: '#080405',
  scanlineColor: '#ff7a7a',
  scanlineAlpha: 0.05,

  gridColor: '#ff7a7a',
  gridAlpha: 0.045,
  hudBracketColor: 'rgba(255, 120, 120, 0.55)',
  watermarkColor: 'rgba(255, 90, 90, 0.07)',
  archiveStampBg: 'rgba(255, 90, 90, 0.1)',
  archiveStampText: 'rgba(255, 160, 160, 0.7)',

  headerBand: 'rgba(255, 90, 90, 0.05)',
  headerText: '#ffb0b0',
  headerAccent: 'rgba(255, 140, 140, 0.7)',
  headerSeparator: 'rgba(255, 90, 90, 0.3)',

  metadataTitle: '#fff0f0',
  metadataSpec: 'rgba(255, 160, 160, 0.9)',
  metadataGlyphLabel: 'rgba(255, 120, 120, 0.65)',
  metadataGlyphText: 'rgba(255, 190, 190, 0.75)',

  chipBg: 'rgba(255, 90, 90, 0.1)',
  chipText: 'rgba(255, 220, 220, 0.9)',
  chipBorder: 'rgba(255, 90, 90, 0.4)',
  chipGlyph: 'rgba(255, 120, 120, 0.95)',

  qrBg: '#ffffff',
  qrLabelText: '#ffb0b0',
  qrPanelBorder: 'rgba(255, 90, 90, 0.3)',

  footerBand: 'rgba(255, 90, 90, 0.035)',
  footerText: 'rgba(255, 140, 140, 0.55)',
  footerSeparator: 'rgba(255, 90, 90, 0.2)',
};

// ─── Jedi — warm cream on parchment, Order archive aesthetic ───

export const JEDI_THEME: CardTheme = {
  id: 'jedi',

  backdropBladeWash: 0.15,
  backdropMid: '#3a2e1c',
  backdropOuter: '#2a2012',
  backdropEdge: '#181008',
  scanlineColor: '#f6e5b8',
  scanlineAlpha: 0.05,

  gridColor: '#f6e5b8',
  gridAlpha: 0.05,
  hudBracketColor: 'rgba(246, 229, 184, 0.55)',
  watermarkColor: 'rgba(246, 229, 184, 0.07)',
  archiveStampBg: 'rgba(246, 229, 184, 0.08)',
  archiveStampText: 'rgba(246, 229, 184, 0.7)',

  headerBand: 'rgba(246, 229, 184, 0.04)',
  headerText: '#f6e5b8',
  headerAccent: 'rgba(246, 229, 184, 0.7)',
  headerSeparator: 'rgba(246, 229, 184, 0.25)',

  metadataTitle: '#fff5d8',
  metadataSpec: 'rgba(246, 229, 184, 0.9)',
  metadataGlyphLabel: 'rgba(246, 229, 184, 0.55)',
  metadataGlyphText: 'rgba(230, 214, 170, 0.75)',

  chipBg: 'rgba(246, 229, 184, 0.08)',
  chipText: 'rgba(255, 245, 216, 0.9)',
  chipBorder: 'rgba(246, 229, 184, 0.35)',
  chipGlyph: 'rgba(246, 229, 184, 0.9)',

  qrBg: '#ffffff',
  qrLabelText: '#f6e5b8',
  qrPanelBorder: 'rgba(246, 229, 184, 0.25)',

  footerBand: 'rgba(246, 229, 184, 0.025)',
  footerText: 'rgba(246, 229, 184, 0.55)',
  footerSeparator: 'rgba(246, 229, 184, 0.18)',
};

// ─── Space — pure black minimal, cinematic ───

export const SPACE_THEME: CardTheme = {
  id: 'space',

  backdropBladeWash: 0.1,
  backdropMid: '#050608',
  backdropOuter: '#020305',
  backdropEdge: '#000000',
  scanlineColor: '#ffffff',
  scanlineAlpha: 0.025,

  gridColor: '#ffffff',
  gridAlpha: 0.03,
  hudBracketColor: 'rgba(255, 255, 255, 0.45)',
  watermarkColor: 'rgba(255, 255, 255, 0.04)',
  archiveStampBg: 'rgba(255, 255, 255, 0.05)',
  archiveStampText: 'rgba(255, 255, 255, 0.55)',

  headerBand: 'rgba(255, 255, 255, 0.025)',
  headerText: '#f5f5f5',
  headerAccent: 'rgba(255, 255, 255, 0.55)',
  headerSeparator: 'rgba(255, 255, 255, 0.2)',

  metadataTitle: '#ffffff',
  metadataSpec: 'rgba(255, 255, 255, 0.8)',
  metadataGlyphLabel: 'rgba(255, 255, 255, 0.5)',
  metadataGlyphText: 'rgba(235, 235, 235, 0.7)',

  chipBg: 'rgba(255, 255, 255, 0.05)',
  chipText: 'rgba(245, 245, 245, 0.9)',
  chipBorder: 'rgba(255, 255, 255, 0.3)',
  chipGlyph: 'rgba(255, 255, 255, 0.85)',

  qrBg: '#ffffff',
  qrLabelText: '#f5f5f5',
  qrPanelBorder: 'rgba(255, 255, 255, 0.2)',

  footerBand: 'rgba(255, 255, 255, 0.02)',
  footerText: 'rgba(255, 255, 255, 0.5)',
  footerSeparator: 'rgba(255, 255, 255, 0.15)',
};

// ─── Catalog + lookup ───

export const THEME_CATALOG: Record<string, CardTheme> = {
  default: DEFAULT_THEME,
  light: LIGHT_THEME,
  imperial: IMPERIAL_THEME,
  jedi: JEDI_THEME,
  space: SPACE_THEME,
};

export function getTheme(id: string): CardTheme {
  return THEME_CATALOG[id] ?? DEFAULT_THEME;
}
