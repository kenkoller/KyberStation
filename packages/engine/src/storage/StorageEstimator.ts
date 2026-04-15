// ─── SD Card Storage Estimator ───
// Estimates storage usage for ProffieOS SD card builds.

export interface StorageBudget {
  totalBytes: number;
  cardSizeBytes: number;
  freeBytes: number;
  usagePercent: number;
  breakdown: StorageBreakdownItem[];
}

export interface StorageBreakdownItem {
  label: string;
  bytes: number;
  category: 'font' | 'config' | 'oled' | 'music' | 'system';
}

// Known font sizes (community averages, in bytes)
const KNOWN_FONT_SIZES: Record<string, number> = {
  'Kyberphonic': 120_000_000,
  'Greyscale Fonts': 100_000_000,
  'Font Maker': 80_000_000,
  'CFX': 60_000_000,
};

const DEFAULT_FONT_SIZE = 100_000_000; // ~100MB average
const OLED_BMP_SIZE = 512; // ~512 bytes per 128x32 1-bit BMP
const BOOT_SOUND_SIZE = 500_000; // ~500KB typical boot sound
const SYSTEM_OVERHEAD = 10_000_000; // ~10MB for ProffieOS system files

const CARD_SIZES: Record<string, number> = {
  '8GB': 8_000_000_000,
  '16GB': 16_000_000_000,
  '32GB': 32_000_000_000,
  '64GB': 64_000_000_000,
};

/**
 * Estimate font folder size by name or default.
 */
export function estimateFontSize(fontName: string): number {
  // Check known sizes (case-insensitive partial match)
  const lower = fontName.toLowerCase();
  for (const [known, size] of Object.entries(KNOWN_FONT_SIZES)) {
    if (lower.includes(known.toLowerCase())) return size;
  }
  return DEFAULT_FONT_SIZE;
}

/**
 * Estimate config.h file size based on preset count.
 */
export function estimateConfigSize(presetCount: number): number {
  // ~200 bytes base + ~300 bytes per preset
  return 200 + presetCount * 300;
}

/**
 * Estimate OLED animation storage.
 */
export function estimateOLEDSize(frameCount: number, resolution: '128x32' | '128x64' = '128x32'): number {
  const bmpSize = resolution === '128x64' ? 1088 : OLED_BMP_SIZE;
  return frameCount * bmpSize;
}

/**
 * Estimate total SD card storage usage.
 */
export function estimateTotal(options: {
  cardSize: string;
  fontNames: string[];
  presetCount: number;
  oledFrameCount?: number;
  oledResolution?: '128x32' | '128x64';
  musicTrackCount?: number;
  musicTrackSizeMB?: number;
  /** Real font sizes from library scan, keyed by font name. Falls back to estimate. */
  fontSizeOverrides?: Record<string, number>;
}): StorageBudget {
  const breakdown: StorageBreakdownItem[] = [];

  // System overhead
  breakdown.push({
    label: 'ProffieOS System',
    bytes: SYSTEM_OVERHEAD,
    category: 'system',
  });

  // Config file
  breakdown.push({
    label: 'config.h',
    bytes: estimateConfigSize(options.presetCount),
    category: 'config',
  });

  // Boot sound
  breakdown.push({
    label: 'Boot Sound',
    bytes: BOOT_SOUND_SIZE,
    category: 'system',
  });

  // Sound fonts
  for (const fontName of options.fontNames) {
    const realSize = options.fontSizeOverrides?.[fontName];
    breakdown.push({
      label: `Font: ${fontName || 'Unknown'}${realSize != null ? '' : ' (est.)'}`,
      bytes: realSize ?? estimateFontSize(fontName),
      category: 'font',
    });
  }

  // OLED frames
  if (options.oledFrameCount && options.oledFrameCount > 0) {
    breakdown.push({
      label: 'OLED Animations',
      bytes: estimateOLEDSize(options.oledFrameCount, options.oledResolution),
      category: 'oled',
    });
  }

  // Music tracks
  if (options.musicTrackCount && options.musicTrackCount > 0) {
    const trackSize = (options.musicTrackSizeMB ?? 5) * 1_000_000;
    breakdown.push({
      label: `Music (${options.musicTrackCount} tracks)`,
      bytes: options.musicTrackCount * trackSize,
      category: 'music',
    });
  }

  const totalBytes = breakdown.reduce((sum, item) => sum + item.bytes, 0);
  const cardSizeBytes = CARD_SIZES[options.cardSize] ?? CARD_SIZES['16GB'];
  const freeBytes = Math.max(0, cardSizeBytes - totalBytes);
  const usagePercent = Math.min(100, (totalBytes / cardSizeBytes) * 100);

  return {
    totalBytes,
    cardSizeBytes,
    freeBytes,
    usagePercent,
    breakdown,
  };
}

/**
 * Format bytes as human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

export { CARD_SIZES };
