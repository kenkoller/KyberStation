// ─── drawFooter — bottom band with repo link + date ───

import type { CardContext } from './cardTypes';

export function drawFooter(card: CardContext): void {
  const { ctx, layout, theme } = card;
  const { width, height, footerH } = layout;

  ctx.fillStyle = theme.footerBand;
  ctx.fillRect(0, height - footerH, width, footerH);

  ctx.strokeStyle = theme.footerSeparator;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - footerH);
  ctx.lineTo(width, height - footerH);
  ctx.stroke();

  ctx.fillStyle = theme.footerText;
  ctx.font = "400 11px ui-monospace, monospace";
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('github.com/kenkoller/KyberStation', 32, height - footerH / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = theme.footerText;
  ctx.globalAlpha = 0.7;
  ctx.fillText(new Date().toISOString().slice(0, 10), width - 32, height - footerH / 2);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
