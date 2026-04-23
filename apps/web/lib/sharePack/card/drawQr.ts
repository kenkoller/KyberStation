// ─── drawQr — scannable QR code corner panel ───

import type { CardContext, Ctx } from './cardTypes';
import { fillRoundRect } from './canvasUtils';

export function drawQr(card: CardContext): void {
  const { ctx, layout, theme, qrCanvas } = card;

  ctx.save();

  // Tighter white-card border — 4px was previously 8px. Combined with
  // the QR library's 2-module quiet zone (reduced from 4 in cardSnapshot),
  // the QR modules now read denser and scan more reliably on phones.
  const border = 4;
  ctx.fillStyle = theme.qrBg;
  fillRoundRect(
    ctx,
    layout.qrX - border,
    layout.qrY - border,
    layout.qrSize + border * 2,
    layout.qrSize + border * 2,
    4,
  );

  // The QR itself (pre-rasterized to canvas by createQrSurface)
  ctx.drawImage(qrCanvas, layout.qrX, layout.qrY, layout.qrSize, layout.qrSize);

  // HUD corner brackets around the QR panel — matches the card's global
  // corner-bracket grammar so the QR reads as part of the chrome, not a
  // foreign white box.
  drawQrCornerBrackets(
    ctx,
    layout.qrX - border,
    layout.qrY - border,
    layout.qrSize + border * 2,
    layout.qrSize + border * 2,
    theme.hudBracketColor,
  );

  // "SCAN" label above the QR panel
  ctx.fillStyle = theme.qrLabelText;
  ctx.font = "600 11px ui-monospace, monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    '⤓ SCAN TO OPEN',
    layout.qrX + layout.qrSize / 2,
    layout.qrY - layout.qrLabelGap - 2,
  );
  ctx.textAlign = 'left';

  ctx.restore();
}

/** Small corner L-brackets on the QR panel, 6px arms, 1.25px stroke. */
function drawQrCornerBrackets(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  const arm = 8;
  const inset = 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.beginPath();

  // Top-left
  ctx.moveTo(x - inset, y - inset + arm);
  ctx.lineTo(x - inset, y - inset);
  ctx.lineTo(x - inset + arm, y - inset);

  // Top-right
  ctx.moveTo(x + w + inset - arm, y - inset);
  ctx.lineTo(x + w + inset, y - inset);
  ctx.lineTo(x + w + inset, y - inset + arm);

  // Bottom-left
  ctx.moveTo(x - inset, y + h + inset - arm);
  ctx.lineTo(x - inset, y + h + inset);
  ctx.lineTo(x - inset + arm, y + h + inset);

  // Bottom-right
  ctx.moveTo(x + w + inset - arm, y + h + inset);
  ctx.lineTo(x + w + inset, y + h + inset);
  ctx.lineTo(x + w + inset, y + h + inset - arm);

  ctx.stroke();
  ctx.restore();
}
