import { BaseStyle } from './BaseStyle.js';
import type { RGB, StyleContext } from '../types.js';

/**
 * ImageScrollStyle — scrolls image pixel data across the blade.
 *
 * Designed for light painting photography: upload an image, the blade
 * scrolls through columns over time, creating the full image in a
 * long-exposure photo.
 *
 * Image data is stored in config as a flat Uint8Array (R,G,B per pixel,
 * row-major order). Rows map to LED positions, columns map to scroll frames.
 */
export class ImageScrollStyle extends BaseStyle {
  readonly id = 'imageScroll';
  readonly name = 'Image Scroll';
  readonly description = 'Scrolls an image across the blade for light painting';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const { config } = context;
    const imageData = config.imageData as Uint8Array | undefined;
    const imageWidth = (config.imageWidth as number) ?? 0;
    const imageHeight = (config.imageHeight as number) ?? 0;

    // No image loaded — show a rainbow placeholder
    if (!imageData || imageWidth === 0 || imageHeight === 0) {
      return this.placeholderColor(position, time);
    }

    const speed = (config.scrollSpeed as number) ?? 30;
    const direction = (config.scrollDirection as string) ?? 'left-to-right';
    const repeatMode = (config.scrollRepeatMode as string) ?? 'loop';

    // Calculate scroll offset (which column we're on)
    const totalColumns = imageWidth;
    const elapsedColumns = (time * speed) / 1000; // time is in ms, speed in px/sec
    let column: number;

    switch (repeatMode) {
      case 'once':
        column = Math.min(elapsedColumns, totalColumns - 1);
        break;
      case 'pingpong': {
        const cycle = totalColumns * 2 - 2;
        if (cycle <= 0) {
          column = 0;
        } else {
          const pos = elapsedColumns % cycle;
          column = pos < totalColumns ? pos : cycle - pos;
        }
        break;
      }
      case 'loop':
      default:
        column = elapsedColumns % totalColumns;
        break;
    }

    // Reverse direction
    if (direction === 'right-to-left') {
      column = totalColumns - 1 - column;
    } else if (direction === 'bidirectional') {
      // Left half scrolls left-to-right, right half scrolls right-to-left
      if (position > 0.5) {
        column = totalColumns - 1 - column;
      }
    }

    // Map blade position (0-1) to image row
    const row = Math.min(imageHeight - 1, Math.max(0, Math.floor(position * imageHeight)));
    const col = Math.min(totalColumns - 1, Math.max(0, Math.floor(column)));

    // Sample pixel from image data (row-major, 3 bytes per pixel)
    const pixelIndex = (row * imageWidth + col) * 3;
    if (pixelIndex + 2 >= imageData.length) {
      return { r: 0, g: 0, b: 0 };
    }

    return {
      r: imageData[pixelIndex],
      g: imageData[pixelIndex + 1],
      b: imageData[pixelIndex + 2],
    };
  }

  /** Rainbow placeholder shown when no image is loaded */
  private placeholderColor(position: number, time: number): RGB {
    const hue = (position * 360 + time * 0.05) % 360;
    return hslToRgb(hue, 1, 0.5);
  }
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}
