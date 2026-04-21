// ─── StatusSignal — Color-Glyph Pairing for Accessibility ───
//
// Every color-coded status indicator in the UI gets a paired typographic
// glyph so the signal is readable without relying on hue alone. This is
// the redundant channel colorblind users need (deuteranopia, protanopia,
// tritanopia), and it also gives the console/HUD aesthetic a little more
// deliberate craft.
//
// The component is deliberately dumb: pick a variant, it renders a glyph
// in the right token color. Animation (blink/breathe/alert) stays in
// `ConsoleIndicator` where it already lives — StatusSignal is the static
// meaning layer that sits next to it (or replaces it when motion isn't
// wanted).
//
// Era / faction badge variants are included here so callers only import
// one thing. They share the same `aria-label` / `aria-hidden` contract
// as the core status variants.

import type { Affiliation, Era } from '@kyberstation/presets';

/**
 * Eight semantic status states with paired glyph + color token.
 *
 *   idle       — ● (filled circle)   — text-muted      (neutral presence)
 *   active     — ◉ (bullseye)        — accent          (live / selected)
 *   success    — ✓ (check)           — status-ok       (all good)
 *   warning    — ▲ (triangle)        — badge-creative  (amber caution)
 *   alert      — ⚠ (warning sign)    — status-warn     (loud caution)
 *   error      — ✕ (cross)           — status-error    (failure)
 *   modulation — ◆ (filled diamond)  — status-magenta  (modulation / routing identity)
 *   data       — · (middle dot)      — status-white    (neutral data readout)
 */
export type StatusVariant =
  | 'idle'
  | 'active'
  | 'success'
  | 'warning'
  | 'alert'
  | 'error'
  | 'modulation'
  | 'data';

export type StatusSize = 'sm' | 'md';

// ─── Glyph / color lookup ────────────────────────────────────────────

interface GlyphSpec {
  glyph: string;
  color: string;  // rgb(var(--token)) — always a CSS-variable reference
}

const STATUS_GLYPHS: Record<StatusVariant, GlyphSpec> = {
  idle:       { glyph: '\u25CF', color: 'rgb(var(--text-muted))' },      // ●
  active:     { glyph: '\u25C9', color: 'rgb(var(--accent))' },          // ◉
  success:    { glyph: '\u2713', color: 'rgb(var(--status-ok))' },       // ✓
  warning:    { glyph: '\u25B2', color: 'rgb(var(--badge-creative))' },  // ▲
  alert:      { glyph: '\u26A0', color: 'rgb(var(--status-warn))' },     // ⚠
  error:      { glyph: '\u2715', color: 'rgb(var(--status-error))' },    // ✕
  modulation: { glyph: '\u25C6', color: 'rgb(var(--status-magenta))' },  // ◆
  data:       { glyph: '\u00B7', color: 'rgb(var(--status-white))' },    // ·
};

const SIZE_TO_FONT_SIZE: Record<StatusSize, string> = {
  sm: '0.6875rem', // 11px — matches text-ui-xs
  md: '0.8125rem', // 13px — matches text-ui-sm
};

// ─── StatusSignal ────────────────────────────────────────────────────

export interface StatusSignalProps {
  variant: StatusVariant;
  /** Visual size. Defaults to "sm" (11px). */
  size?: StatusSize;
  /**
   * Optional text label rendered next to the glyph. When omitted and
   * `label` is not provided, the glyph is purely decorative and
   * `aria-hidden` will be set.
   */
  children?: React.ReactNode;
  /**
   * Screen-reader label used when the glyph carries meaning on its own.
   * When provided without `children`, `aria-label` is set on the wrapper
   * and `aria-hidden` is dropped. When omitted and there is no
   * `children`, the glyph is marked decorative.
   */
  label?: string;
  /** Render only the glyph — hide any label text. */
  compact?: boolean;
  /** Additional classes for the outer wrapper. */
  className?: string;
}

/**
 * Paired color + glyph status indicator.
 *
 *   <StatusSignal variant="success" label="Power OK" />
 *   <StatusSignal variant="alert">3 warnings</StatusSignal>
 *   <StatusSignal variant="active" compact label="Connected" />
 *
 * Uses CSS custom-property color tokens only — never hardcoded hex.
 * Glyph font is JetBrains Mono (already in the app stack via next/font) so
 * the shapes align visually with the rest of the telemetry numerics.
 */
export function StatusSignal({
  variant,
  size = 'sm',
  children,
  label,
  compact = false,
  className = '',
}: StatusSignalProps): JSX.Element {
  const { glyph, color } = STATUS_GLYPHS[variant];
  const showText = !compact && children !== undefined;
  const glyphIsDecorative = showText || (!label && !children);

  // When the glyph is the ONLY thing conveying meaning (no children text,
  // label provided), put the aria-label on the wrapper and hide the glyph
  // from AT so it doesn't read the unicode character aloud.
  const wrapperAriaLabel = !showText && label ? label : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono leading-none ${className}`}
      style={{ fontSize: SIZE_TO_FONT_SIZE[size] }}
      aria-label={wrapperAriaLabel}
      role={wrapperAriaLabel ? 'img' : undefined}
    >
      <span
        aria-hidden={glyphIsDecorative ? true : undefined}
        aria-label={!glyphIsDecorative && label && showText ? label : undefined}
        style={{
          color,
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
          // Slight optical adjustment — these unicode glyphs render a hair
          // lower than the baseline text they sit next to.
          lineHeight: 1,
        }}
      >
        {glyph}
      </span>
      {showText && <span>{children}</span>}
    </span>
  );
}

// ─── Era + Faction glyph badges ──────────────────────────────────────

const ERA_GLYPHS: Record<Era, { glyph: string; color: string }> = {
  'prequel':           { glyph: '\u25C7', color: 'rgb(var(--era-prequel))' },   // ◇
  'original-trilogy':  { glyph: '\u25C6', color: 'rgb(var(--era-ot))' },        // ◆
  'sequel':            { glyph: '\u25B2', color: 'rgb(var(--era-sequel))' },    // ▲
  'animated':          { glyph: '\u25EF', color: 'rgb(var(--era-animated))' },  // ◯
  'expanded-universe': { glyph: '\u2726', color: 'rgb(var(--era-eu))' },        // ✦
};

/** "Legends" isn't an era in the BladeConfig type — it's a sub-tag. */
export const LEGENDS_GLYPH = '\u2727'; // ✧
export const LEGENDS_COLOR = 'rgb(var(--badge-legends))';

const FACTION_GLYPHS: Record<Affiliation, { glyph: string; color: string }> = {
  jedi:    { glyph: '\u2609', color: 'rgb(var(--faction-jedi))' },    // ☉
  sith:    { glyph: '\u2726', color: 'rgb(var(--faction-sith))' },    // ✦
  neutral: { glyph: '\u00B7', color: 'rgb(var(--faction-neutral))' }, // ·
  other:   { glyph: '\u25D0', color: 'rgb(var(--faction-grey))' },    // ◐
};

export interface EraBadgeProps {
  era: Era;
  /** If true, render the "Legends" glyph instead of the era glyph. */
  legends?: boolean;
  size?: StatusSize;
  className?: string;
  /** Optional text label to render alongside the glyph. */
  children?: React.ReactNode;
  /** Screen-reader label — defaults to era name if omitted. */
  label?: string;
}

/**
 * Tiny monogram for era / legends-status badges. Used in PresetGallery
 * badges so the era reads without relying on the color token alone.
 */
export function EraBadge({
  era,
  legends = false,
  size = 'sm',
  className = '',
  children,
  label,
}: EraBadgeProps): JSX.Element {
  const glyph = legends ? LEGENDS_GLYPH : ERA_GLYPHS[era].glyph;
  const color = legends ? LEGENDS_COLOR : ERA_GLYPHS[era].color;
  const showText = children !== undefined;
  const ariaLabel = !showText ? (label ?? (legends ? 'Legends' : era)) : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1 leading-none ${className}`}
      style={{ fontSize: SIZE_TO_FONT_SIZE[size] }}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <span
        aria-hidden={!ariaLabel ? true : undefined}
        style={{
          color,
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
          lineHeight: 1,
        }}
      >
        {glyph}
      </span>
      {showText && <span>{children}</span>}
    </span>
  );
}

export interface FactionBadgeProps {
  faction: Affiliation;
  size?: StatusSize;
  className?: string;
  children?: React.ReactNode;
  label?: string;
}

/**
 * Faction monogram (Jedi / Sith / Grey / Neutral). Pairs with the color
 * dot used in PresetGallery so the affiliation is distinguishable via
 * glyph shape in addition to hue.
 */
export function FactionBadge({
  faction,
  size = 'sm',
  className = '',
  children,
  label,
}: FactionBadgeProps): JSX.Element {
  const { glyph, color } = FACTION_GLYPHS[faction];
  const showText = children !== undefined;
  const ariaLabel = !showText ? (label ?? faction) : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1 leading-none ${className}`}
      style={{ fontSize: SIZE_TO_FONT_SIZE[size] }}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <span
        aria-hidden={!ariaLabel ? true : undefined}
        style={{
          color,
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
          lineHeight: 1,
        }}
      >
        {glyph}
      </span>
      {showText && <span>{children}</span>}
    </span>
  );
}

// ─── Exports for convenience ─────────────────────────────────────────

/** Returns the raw glyph character for a status variant. */
export function statusGlyph(variant: StatusVariant): string {
  return STATUS_GLYPHS[variant].glyph;
}

/** Returns the raw glyph character for an era. */
export function eraGlyph(era: Era): string {
  return ERA_GLYPHS[era].glyph;
}

/** Returns the raw glyph character for a faction. */
export function factionGlyph(faction: Affiliation): string {
  return FACTION_GLYPHS[faction].glyph;
}
