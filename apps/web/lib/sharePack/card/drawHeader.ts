// ─── drawHeader — top brand/status band ───

import type { CardContext } from './cardTypes';

export function drawHeader(card: CardContext): void {
  const { ctx, layout, theme } = card;
  const { width, headerH } = layout;

  ctx.fillStyle = theme.headerBand;
  ctx.fillRect(0, 0, width, headerH);

  ctx.strokeStyle = theme.headerSeparator;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(width, headerH);
  ctx.stroke();

  ctx.fillStyle = theme.headerText;
  ctx.font = "600 16px ui-monospace, 'SF Mono', Menlo, monospace";
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('◈ KYBERSTATION', 32, headerH / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = theme.headerAccent;
  ctx.font = "500 12px ui-monospace, monospace";
  ctx.fillText('ARCHIVE DATA CARD · v1', width - 32, headerH / 2);
  ctx.textAlign = 'left';
}
