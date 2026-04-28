// ─── chips.ts — chip-drawing toolkit ───
//
// Chips are pill-shaped labels with optional glyph prefixes shown in
// the card's metadata strip. Examples: "◆ Natural", "☉ Jedi",
// "144 LEDs", "300ms ignite".

import type { BladeConfig } from '@kyberstation/engine';
import { selectForm, isRedHue, isGreenHue, isBlueHue } from '@/lib/crystal';

import type { CardContext, Chip, Ctx } from './cardTypes';
import { fillRoundRect, strokeRoundRect } from './canvasUtils';

// ─── Chip visual constants ───

const CHIP_HEIGHT = 28;
const CHIP_PADDING_X = 12;
const CHIP_GAP = 10;
const CHIP_RADIUS = CHIP_HEIGHT / 2; // 14 — half-height
const GLYPH_LABEL_GAP = 6;
const LABEL_FONT = "500 12px ui-monospace, monospace";
const GLYPH_FONT = "500 13px ui-monospace, monospace";
const ROW_GAP = 8;

// ─── Measurement ───

interface MeasuredChip {
  chip: Chip;
  labelWidth: number;
  glyphWidth: number;
  totalWidth: number;
}

function measureChip(ctx: Ctx, chip: Chip): MeasuredChip {
  ctx.save();
  ctx.font = LABEL_FONT;
  const labelWidth = ctx.measureText(chip.label).width;

  let glyphWidth = 0;
  if (chip.glyph) {
    ctx.font = GLYPH_FONT;
    glyphWidth = ctx.measureText(chip.glyph).width;
  }
  ctx.restore();

  const innerWidth =
    glyphWidth > 0 ? glyphWidth + GLYPH_LABEL_GAP + labelWidth : labelWidth;
  const totalWidth = innerWidth + CHIP_PADDING_X * 2;

  return { chip, labelWidth, glyphWidth, totalWidth };
}

// ─── Single-chip render ───

function drawChip(
  card: CardContext,
  measured: MeasuredChip,
  x: number,
  y: number,
): void {
  const { ctx, theme } = card;
  const { chip, labelWidth, glyphWidth, totalWidth } = measured;
  const accent = chip.accent;

  ctx.save();

  // Pill background
  ctx.fillStyle = theme.chipBg;
  fillRoundRect(ctx, x, y, totalWidth, CHIP_HEIGHT, CHIP_RADIUS);

  // Border (accent overrides theme default)
  ctx.strokeStyle = accent ?? theme.chipBorder;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x + 0.5, y + 0.5, totalWidth - 1, CHIP_HEIGHT - 1, CHIP_RADIUS);

  // Inner content
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const centerY = y + CHIP_HEIGHT / 2;
  let cursorX = x + CHIP_PADDING_X;

  if (chip.glyph) {
    ctx.font = GLYPH_FONT;
    ctx.fillStyle = accent ?? theme.chipGlyph;
    ctx.fillText(chip.glyph, cursorX, centerY);
    cursorX += glyphWidth + GLYPH_LABEL_GAP;
  }

  ctx.font = LABEL_FONT;
  ctx.fillStyle = theme.chipText;
  ctx.fillText(chip.label, cursorX, centerY);

  // Suppress unused-var warning for labelWidth (kept for symmetry).
  void labelWidth;

  ctx.restore();
}

// ─── Public API ───

/**
 * Draw a row of chips starting at (x, y). Wraps to a second row if the
 * chips would overflow the configured layout.metadataMaxWidth. Returns
 * the bounding box so callers can stack additional rows beneath.
 */
export function drawChipRow(
  card: CardContext,
  chips: Chip[],
  x: number,
  y: number,
): { endX: number; height: number } {
  if (chips.length === 0) {
    return { endX: x, height: 0 };
  }

  const { ctx, layout } = card;
  const maxWidth = layout.metadataMaxWidth;

  ctx.save();

  const measured = chips.map((c) => measureChip(ctx, c));

  let cursorX = x;
  let cursorY = y;
  let rowStartX = x;
  let rowCount = 1;
  let maxEndX = x;

  for (let i = 0; i < measured.length; i++) {
    const m = measured[i];
    const isFirstInRow = cursorX === rowStartX;
    const projectedEndX = cursorX + m.totalWidth;
    const wouldOverflow = !isFirstInRow && projectedEndX - rowStartX > maxWidth;

    if (wouldOverflow) {
      // Wrap to the next row.
      cursorX = rowStartX;
      cursorY += CHIP_HEIGHT + ROW_GAP;
      rowCount += 1;
    }

    drawChip(card, m, cursorX, cursorY);
    cursorX += m.totalWidth + CHIP_GAP;
    maxEndX = Math.max(maxEndX, cursorX - CHIP_GAP);
  }

  ctx.restore();

  const height = rowCount * CHIP_HEIGHT + (rowCount - 1) * ROW_GAP;
  return { endX: maxEndX, height };
}

// ─── Chip selection from config ───

function formLabel(config: BladeConfig): string {
  const form = selectForm(config);
  switch (form) {
    case 'natural':
      return 'Natural';
    case 'bled':
      return 'Bled';
    case 'cracked':
      return 'Cracked';
    case 'obsidian-bipyramid':
      return 'Obsidian';
    case 'paired':
      return 'Paired';
    default:
      return 'Natural';
  }
}

interface FactionInfo {
  label: 'Sith' | 'Jedi' | 'Grey';
  glyph: string;
  accent: string;
}

function factionForConfig(config: BladeConfig): FactionInfo {
  if (isRedHue(config.baseColor)) {
    return {
      label: 'Sith',
      glyph: '✦',
      accent: 'rgba(220, 40, 40, 0.95)',
    };
  }

  // Jedi-coded: green or blue dominant, AND with low red. The `r < 80`
  // gate excludes amethyst / Mace purple (blue-dominant but red-rich),
  // magenta, hot pink — colors that satisfy isBlueHue / isGreenHue
  // generally but read as Grey on canon sabers.
  const baseHueIsJediCoded =
    (isGreenHue(config.baseColor) || isBlueHue(config.baseColor)) &&
    config.baseColor.r < 80;
  if (baseHueIsJediCoded) {
    return {
      label: 'Jedi',
      glyph: '☉',
      accent: 'rgba(110, 180, 255, 0.95)',
    };
  }

  return {
    label: 'Grey',
    glyph: '◐',
    accent: 'rgba(200, 200, 210, 0.85)',
  };
}

/**
 * Derive 3–5 chips that summarise the config at a glance:
 *   ◆ Form  ·  faction  ·  LED count  ·  ignition timing  ·  archetype
 */
export function buildChipsForConfig(
  config: BladeConfig,
  glyph: string,
): Chip[] {
  const chips: Chip[] = [];

  // 1. Crystal Form
  chips.push({ label: formLabel(config), glyph: '◆' });

  // 2. Faction (accent color + glyph)
  const faction = factionForConfig(config);
  chips.push({ label: faction.label, glyph: faction.glyph, accent: faction.accent });

  // 3. LED count
  chips.push({ label: `${config.ledCount} LEDs` });

  // 4. Ignition timing
  chips.push({ label: `${config.ignitionMs}ms ignite` });

  // 5. Archetype prefix from glyph — skip if it collides with the faction chip.
  const prefix = glyph.slice(0, 3).toUpperCase();
  const factionPrefix: Record<FactionInfo['label'], string> = {
    Sith: 'SIT',
    Jedi: 'JED',
    Grey: 'GRY',
  };
  const redundant = factionPrefix[faction.label] === prefix;
  if (prefix.length === 3 && /^[A-Z]{3}$/.test(prefix) && !redundant) {
    chips.push({ label: prefix });
  }

  return chips;
}
