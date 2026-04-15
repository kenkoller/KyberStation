/**
 * FontParser — parses dropped font folders into FontManifest.
 *
 * Takes a FileList (from drag-drop or file input with webkitdirectory)
 * and categorizes each .wav file by its ProffieOS naming convention.
 */

import type { SoundCategory, SoundFile, SmoothSwingPair, FontManifest, FontFormat } from './types.js';

/** Pattern map: regex to SoundCategory */
const CATEGORY_PATTERNS: Array<[RegExp, SoundCategory]> = [
  [/^hum\d*/i, 'hum'],
  [/^swingl\d*/i, 'swingl'],
  [/^swingh\d*/i, 'swingh'],
  [/^(swng|swing)\d*/i, 'swing'],
  [/^(clsh|clash)\d*/i, 'clash'],
  [/^(blst|blast)\d*/i, 'blast'],
  [/^(lock)\d*/i, 'lockup'],
  [/^drag\d*/i, 'drag'],
  [/^melt\d*/i, 'melt'],
  [/^(in\d|poweron)/i, 'in'],
  [/^(out\d|poweroff)/i, 'out'],
  [/^force\d*/i, 'force'],
  [/^stab\d*/i, 'stab'],
  [/^boot\d*/i, 'boot'],
  [/^font\d*/i, 'font'],
  [/^(track|bgm)\d*/i, 'track'],
  [/^quote\d*/i, 'quote'],
  [/^ccbegin/i, 'ccbegin'],
  [/^ccend/i, 'ccend'],
];

/** Extract the numeric index from a filename, e.g. "clsh03.wav" → 3 */
function extractIndex(filename: string): number | undefined {
  const match = filename.match(/(\d+)\.\w+$/);
  return match ? parseInt(match[1], 10) : undefined;
}

/** Detect the category of a single file by its name */
function detectCategory(filename: string): SoundCategory | null {
  const base = filename.split('/').pop()?.toLowerCase() ?? '';
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(base)) return category;
  }
  return null;
}

/** Detect font format from file naming conventions */
function detectFormat(files: SoundFile[]): FontFormat {
  const names = files.map((f) => f.name.toLowerCase());
  // ProffieOS uses clsh/blst/swng prefixes
  if (names.some((n) => /^(clsh|blst|swng)/.test(n))) return 'proffie';
  // CFX uses clash/blast/swing full names
  if (names.some((n) => /^(clash|blast|swing)\d/.test(n))) return 'cfx';
  return 'generic';
}

/**
 * Parse a FileList into a FontManifest.
 *
 * Only processes .wav files. Ignores non-audio files and unrecognized filenames.
 */
export function parseFileList(files: FileList | File[]): FontManifest {
  const fileArray = Array.from(files);
  const wavFiles = fileArray.filter(
    (f) => f.name.toLowerCase().endsWith('.wav') && !f.name.startsWith('.'),
  );

  const soundFiles: SoundFile[] = [];
  const warnings: string[] = [];

  for (const file of wavFiles) {
    const baseName = file.name.split('/').pop() ?? file.name;
    const category = detectCategory(baseName);

    if (!category) {
      warnings.push(`Unrecognized file: ${baseName}`);
      continue;
    }

    soundFiles.push({
      name: baseName,
      category,
      index: extractIndex(baseName),
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    });
  }

  // Build category counts
  const categories = {} as Record<SoundCategory, number>;
  const allCategories: SoundCategory[] = [
    'hum', 'swing', 'clash', 'blast', 'lockup', 'drag', 'melt',
    'in', 'out', 'force', 'stab', 'quote', 'boot', 'font', 'track',
    'ccbegin', 'ccend', 'swingl', 'swingh',
  ];
  for (const cat of allCategories) {
    categories[cat] = soundFiles.filter((f) => f.category === cat).length;
  }

  // Build smooth-swing pairs
  const smoothSwingPairs: SmoothSwingPair[] = [];
  const lows = soundFiles.filter((f) => f.category === 'swingl');
  const highs = soundFiles.filter((f) => f.category === 'swingh');

  for (const low of lows) {
    const idx = low.index ?? 0;
    const high = highs.find((h) => (h.index ?? 0) === idx);
    if (high) {
      smoothSwingPairs.push({ index: idx, low, high });
    } else {
      warnings.push(`SmoothSwing low file ${low.name} has no matching high pair`);
    }
  }

  // Detect missing critical categories
  if (categories.hum === 0) warnings.push('No hum file found — blade will have no idle sound');
  if (categories.swing === 0 && categories.swingl === 0) {
    warnings.push('No swing files found');
  }

  const format = detectFormat(soundFiles);

  return {
    format,
    files: soundFiles,
    smoothSwingPairs,
    categories,
    warnings,
  };
}

/**
 * Extract the font name from a FileList.
 * Uses the first file's webkitRelativePath to get the folder name.
 */
export function extractFontName(files: FileList | File[]): string {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) return 'Unknown';

  const first = fileArray[0] as File & { webkitRelativePath?: string };
  const path = first.webkitRelativePath || first.name;
  if (path.includes('/')) {
    return path.split('/')[0];
  }
  return 'Imported Font';
}

// ─── Library scanner (File System Access API) ───

/** Lightweight font metadata for library browsing (no audio decoding). */
export interface LibraryFontEntry {
  name: string;
  format: 'proffie' | 'cfx' | 'generic';
  fileCount: number;
  totalSizeBytes: number;
  categories: Partial<Record<SoundCategory, number>>;
  hasSmoothSwing: boolean;
  smoothSwingPairCount: number;
  completeness: 'complete' | 'partial' | 'minimal';
  missingCategories: string[];
  lastScanned: number;
}

const CRITICAL_CATEGORIES: SoundCategory[] = ['hum', 'clash', 'in', 'out'];

function computeCompleteness(
  cats: Partial<Record<SoundCategory, number>>,
): { completeness: 'complete' | 'partial' | 'minimal'; missingCategories: string[] } {
  const hasSwing = (cats.swing ?? 0) > 0 || (cats.swingl ?? 0) > 0;
  const missing: string[] = [];

  for (const c of CRITICAL_CATEGORIES) {
    if ((cats[c] ?? 0) === 0) missing.push(c);
  }
  if (!hasSwing) missing.push('swing');

  if (missing.length === 0) return { completeness: 'complete', missingCategories: [] };
  if (missing.length <= 2) return { completeness: 'partial', missingCategories: missing };
  return { completeness: 'minimal', missingCategories: missing };
}

/**
 * Scan a font library root directory using the File System Access API.
 *
 * Iterates immediate subdirectories, categorizes .wav files by name pattern
 * (no audio decoding), and returns lightweight metadata entries.
 */
export async function scanDirectoryHandle(
  rootHandle: FileSystemDirectoryHandle,
  onProgress?: (scanned: number, name: string) => void,
): Promise<LibraryFontEntry[]> {
  const entries: LibraryFontEntry[] = [];
  let scanned = 0;

  // Cast: TS DOM lib lacks the async iterable on FileSystemDirectoryHandle
  const rootEntries = (rootHandle as unknown as AsyncIterable<FileSystemHandle>);
  for await (const entry of rootEntries) {
    if (entry.kind !== 'directory') continue;

    const fontHandle = await rootHandle.getDirectoryHandle(entry.name);
    const cats: Partial<Record<SoundCategory, number>> = {};
    let fileCount = 0;
    let totalSizeBytes = 0;
    const fileNames: string[] = [];

    const fontEntries = (fontHandle as unknown as AsyncIterable<FileSystemHandle>);
    for await (const fileEntry of fontEntries) {
      if (fileEntry.kind !== 'file') continue;
      const name = fileEntry.name.toLowerCase();
      if (!name.endsWith('.wav')) continue;

      fileCount++;
      fileNames.push(fileEntry.name);

      // Get file size without reading content
      try {
        const file = await (fileEntry as FileSystemFileHandle).getFile();
        totalSizeBytes += file.size;
      } catch {
        // Permission issue — skip size
      }

      const category = detectCategory(fileEntry.name);
      if (category) {
        cats[category] = (cats[category] ?? 0) + 1;
      }
    }

    if (fileCount === 0) continue; // Skip empty directories

    const hasSmoothSwing = (cats.swingl ?? 0) > 0 && (cats.swingh ?? 0) > 0;
    const smoothSwingPairCount = Math.min(cats.swingl ?? 0, cats.swingh ?? 0);

    // Detect format from file names
    const hasProffie = fileNames.some((n) => /^(clsh|blst|swng)/i.test(n));
    const hasCfx = fileNames.some((n) => /^(clash|blast|swing)\d/i.test(n));
    const format: 'proffie' | 'cfx' | 'generic' = hasProffie ? 'proffie' : hasCfx ? 'cfx' : 'generic';

    const { completeness, missingCategories } = computeCompleteness(cats);

    entries.push({
      name: entry.name,
      format,
      fileCount,
      totalSizeBytes,
      categories: cats,
      hasSmoothSwing,
      smoothSwingPairCount,
      completeness,
      missingCategories,
      lastScanned: Date.now(),
    });

    scanned++;
    onProgress?.(scanned, entry.name);
  }

  // Sort alphabetically by default
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

/**
 * Load files from a specific font subdirectory for full audio decoding.
 * Returns a File array compatible with parseFileList/decodeFilesByCategory.
 */
export async function loadFontFromDirectoryHandle(
  rootHandle: FileSystemDirectoryHandle,
  fontName: string,
): Promise<File[]> {
  const fontHandle = await rootHandle.getDirectoryHandle(fontName);
  const files: File[] = [];

  const loadEntries = (fontHandle as unknown as AsyncIterable<FileSystemHandle>);
  for await (const entry of loadEntries) {
    if (entry.kind !== 'file') continue;
    if (!entry.name.toLowerCase().endsWith('.wav')) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    // Attach a fake webkitRelativePath for compatibility with parseFileList
    Object.defineProperty(file, 'webkitRelativePath', {
      value: `${fontName}/${entry.name}`,
      writable: false,
    });
    files.push(file);
  }

  return files;
}

/**
 * Decode File objects into AudioBuffers, grouped by category.
 *
 * Returns a Map of category → AudioBuffer[] for all successfully decoded files.
 * Files that fail to decode are silently skipped (added to warnings).
 */
export async function decodeFilesByCategory(
  files: FileList | File[],
  manifest: FontManifest,
  audioContext: AudioContext,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ buffers: Map<string, AudioBuffer[]>; warnings: string[] }> {
  const fileArray = Array.from(files);
  const wavFiles = fileArray.filter(
    (f) => f.name.toLowerCase().endsWith('.wav') && !f.name.startsWith('.'),
  );

  const buffers = new Map<string, AudioBuffer[]>();
  const warnings: string[] = [];
  let loaded = 0;

  for (const file of wavFiles) {
    const baseName = file.name.split('/').pop() ?? file.name;
    const soundFile = manifest.files.find((sf) => sf.name === baseName);
    if (!soundFile) continue;

    try {
      // Security: reject files over 50 MB to prevent memory exhaustion
      const MAX_WAV_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_WAV_SIZE) {
        warnings.push(`Skipped ${baseName}: exceeds 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
        loaded++;
        onProgress?.(loaded, wavFiles.length);
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const decodeTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Decode timeout')), 5000),
      );
      const audioBuffer = await Promise.race([
        audioContext.decodeAudioData(arrayBuffer),
        decodeTimeout,
      ]);

      const category = soundFile.category;
      if (!buffers.has(category)) {
        buffers.set(category, []);
      }
      buffers.get(category)!.push(audioBuffer);
    } catch {
      warnings.push(`Failed to decode: ${baseName}`);
    }

    loaded++;
    onProgress?.(loaded, wavFiles.length);
  }

  return { buffers, warnings };
}
