// ─── drawMetadata — preset title, spec line, glyph, chips ───
//
// OWNER (agent B): this file + chips.ts. Add a chip row BELOW the spec
// line (or beside the title) showing: Crystal Form · Faction · LED
// count · ignition-curve sparkline thumbnail · anything else that
// signals at a glance.
//
// Chip drawing helpers go in chips.ts. Theme tokens available:
//   - theme.chipBg, chipText, chipBorder, chipGlyph
//   - theme.metadataTitle, metadataSpec, metadataGlyphLabel, metadataGlyphText
//
// Use `selectForm(config)` from '@/lib/crystal' to derive the Crystal
// Form name. Use `isRedHue(config.baseColor)` + other heuristics (or
// inspect config.style) to derive the Faction chip.

import type { CardContext } from './cardTypes';
import { capitalise, colourName, fitText } from './canvasUtils';
import { drawChipRow, buildChipsForConfig } from './chips';

export function drawMetadata(card: CardContext): void {
  const { ctx, options, layout, theme } = card;

  const presetLabel =
    options.presetName && options.crystalName
      ? `${options.presetName}  ·  "${options.crystalName}"`
      : options.presetName ??
        options.crystalName ??
        options.config.name ??
        'Untitled blade';

  ctx.save();

  ctx.fillStyle = theme.metadataTitle;
  ctx.font = "700 28px 'Orbitron', ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    fitText(ctx, presetLabel.toUpperCase(), layout.metadataMaxWidth),
    layout.metadataLeftX,
    layout.metadataTopY,
  );

  const spec = `${capitalise(options.config.style)} · ${colourName(options.config.baseColor)} · ${options.config.ignition} ignition · ${options.config.ignitionMs}ms`;
  ctx.fillStyle = theme.metadataSpec;
  ctx.font = "400 15px ui-monospace, monospace";
  ctx.fillText(spec, layout.metadataLeftX, layout.metadataTopY + 34);

  // Glyph label
  ctx.fillStyle = theme.metadataGlyphLabel;
  ctx.font = "500 10px ui-monospace, monospace";
  ctx.fillText('KYBER GLYPH', layout.metadataLeftX, layout.metadataTopY + 66);

  ctx.fillStyle = theme.metadataGlyphText;
  ctx.font = "400 13px ui-monospace, monospace";
  ctx.fillText(
    fitText(ctx, options.glyph, layout.metadataMaxWidth),
    layout.metadataLeftX,
    layout.metadataTopY + 84,
  );

  const chips = buildChipsForConfig(options.config, options.glyph);
  drawChipRow(card, chips, layout.metadataLeftX, layout.metadataTopY + 108);

  ctx.restore();
}
