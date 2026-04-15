// ─── ProffieOS OLED BMP Codec ───
// Encodes/decodes 1-bit monochrome BMP files for SSD1306 OLED displays.
// ProffieOS expects 1-bit BMP format with specific dimensions.

const BMP_HEADER_SIZE = 14;
const DIB_HEADER_SIZE = 40; // BITMAPINFOHEADER
const PALETTE_SIZE = 8; // 2 colors × 4 bytes
const HEADER_TOTAL = BMP_HEADER_SIZE + DIB_HEADER_SIZE + PALETTE_SIZE;

export type OLEDResolution = '128x32' | '128x64';

export interface BMPDecodeResult {
  pixels: boolean[][];
  width: number;
  height: number;
}

/**
 * Encode a boolean pixel grid into a 1-bit monochrome BMP file.
 * ProffieOS OLED format: 1-bit BMP, monochrome palette.
 */
export function encodeBMP(pixels: boolean[][], width: number, height: number): Uint8Array {
  // Row stride: each row is padded to 4-byte boundary
  const rowBytes = Math.ceil(width / 8);
  const rowStride = Math.ceil(rowBytes / 4) * 4;
  const pixelDataSize = rowStride * height;
  const fileSize = HEADER_TOTAL + pixelDataSize;

  const data = new Uint8Array(fileSize);
  const view = new DataView(data.buffer);

  // ─── BMP File Header (14 bytes) ───
  data[0] = 0x42; // 'B'
  data[1] = 0x4D; // 'M'
  view.setUint32(2, fileSize, true);       // file size
  view.setUint32(6, 0, true);             // reserved
  view.setUint32(10, HEADER_TOTAL, true); // pixel data offset

  // ─── DIB Header (40 bytes - BITMAPINFOHEADER) ───
  view.setUint32(14, DIB_HEADER_SIZE, true); // header size
  view.setInt32(18, width, true);            // width
  view.setInt32(22, height, true);           // height (positive = bottom-up)
  view.setUint16(26, 1, true);              // color planes
  view.setUint16(28, 1, true);              // bits per pixel
  view.setUint32(30, 0, true);              // compression (none)
  view.setUint32(34, pixelDataSize, true);  // image size
  view.setInt32(38, 3780, true);            // horizontal DPI (~96)
  view.setInt32(42, 3780, true);            // vertical DPI
  view.setUint32(46, 2, true);              // colors in palette
  view.setUint32(50, 2, true);              // important colors

  // ─── Color Palette (8 bytes) ───
  // Color 0: black (off pixels)
  data[54] = 0; data[55] = 0; data[56] = 0; data[57] = 0;
  // Color 1: white (on pixels)
  data[58] = 0xFF; data[59] = 0xFF; data[60] = 0xFF; data[61] = 0;

  // ─── Pixel Data ───
  // BMP stores rows bottom-up
  for (let y = 0; y < height; y++) {
    const bmpRow = height - 1 - y; // flip vertically
    const rowOffset = HEADER_TOTAL + bmpRow * rowStride;

    for (let x = 0; x < width; x++) {
      const pixelOn = y < pixels.length && x < pixels[y].length && pixels[y][x];
      if (pixelOn) {
        const byteIdx = Math.floor(x / 8);
        const bitIdx = 7 - (x % 8); // MSB first
        data[rowOffset + byteIdx] |= (1 << bitIdx);
      }
    }
  }

  return data;
}

/**
 * Decode a 1-bit monochrome BMP file into a boolean pixel grid.
 */
export function decodeBMP(data: Uint8Array): BMPDecodeResult {
  if (data.length < HEADER_TOTAL) {
    throw new Error('Invalid BMP: file too small');
  }

  // Validate BMP signature
  if (data[0] !== 0x42 || data[1] !== 0x4D) {
    throw new Error('Invalid BMP: missing BM signature');
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const pixelOffset = view.getUint32(10, true);
  const width = view.getInt32(18, true);
  const rawHeight = view.getInt32(22, true);
  const height = Math.abs(rawHeight);
  const bottomUp = rawHeight > 0;
  const bpp = view.getUint16(28, true);

  if (bpp !== 1) {
    throw new Error(`Invalid BMP: expected 1-bit, got ${bpp}-bit`);
  }

  // Validate dimensions
  if ((width !== 128) || (height !== 32 && height !== 64)) {
    throw new Error(`Invalid BMP: expected 128x32 or 128x64, got ${width}x${height}`);
  }

  const rowBytes = Math.ceil(width / 8);
  const rowStride = Math.ceil(rowBytes / 4) * 4;

  const pixels: boolean[][] = Array.from({ length: height }, () =>
    new Array(width).fill(false) as boolean[]
  );

  for (let y = 0; y < height; y++) {
    const bmpRow = bottomUp ? height - 1 - y : y;
    const rowOffset = pixelOffset + bmpRow * rowStride;

    for (let x = 0; x < width; x++) {
      const byteIdx = Math.floor(x / 8);
      const bitIdx = 7 - (x % 8);
      if (rowOffset + byteIdx < data.length) {
        pixels[y][x] = !!(data[rowOffset + byteIdx] & (1 << bitIdx));
      }
    }
  }

  return { pixels, width, height };
}

/**
 * Get resolution dimensions from resolution string.
 */
export function getResolutionDims(res: OLEDResolution): { width: number; height: number } {
  switch (res) {
    case '128x64': return { width: 128, height: 64 };
    case '128x32':
    default: return { width: 128, height: 32 };
  }
}
