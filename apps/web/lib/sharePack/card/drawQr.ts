// ─── drawQr — scannable QR code corner panel ───

import type { CardContext } from './cardTypes';
import { fillRoundRect } from './canvasUtils';

export function drawQr(card: CardContext): void {
  const { ctx, layout, theme, qrCanvas } = card;

  ctx.save();

  // White card behind the QR for a hard contrast edge — phones lock
  // onto high-contrast boundaries instantly.
  ctx.fillStyle = theme.qrBg;
  fillRoundRect(ctx, layout.qrX - 8, layout.qrY - 8, layout.qrSize + 16, layout.qrSize + 16, 6);

  // The QR itself (pre-rasterized to canvas by createQrSurface)
  ctx.drawImage(qrCanvas, layout.qrX, layout.qrY, layout.qrSize, layout.qrSize);

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
