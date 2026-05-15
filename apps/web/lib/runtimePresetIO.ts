// ─── ProffieOS Runtime Preset — Browser-side I/O ───
//
// Helpers for the File System Access API path that reads the user's
// existing `presets.ini` to discover the firmware's compile-time
// `install_time` constant. The runtime emitter in
// `packages/codegen/src/emitters/ProffieRuntimeEmitter.ts` stays
// pure — platform-specific I/O lives here.

const PRESETS_FILE = 'presets.ini';
const INSTALLED_PREFIX = 'installed=';

/**
 * Probe whether a directory looks like the SD card of a saber that uses
 * runtime presets. True if `presets.ini` exists at the root.
 */
export async function hasRuntimePresetsFile(
  dirHandle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    await dirHandle.getFileHandle(PRESETS_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the existing `presets.ini` and return the `install_time` value
 * (the substring after `installed=` on the first non-empty line) so the
 * emitter can produce a file that ProffieOS will accept.
 *
 * Returns `null` if:
 *   - the file doesn't exist
 *   - the file is empty
 *   - the first non-empty line doesn't start with `installed=`
 *   - the install_time value is empty after trimming
 */
export async function readExistingInstallTime(
  dirHandle: FileSystemDirectoryHandle,
): Promise<string | null> {
  let fileHandle: FileSystemFileHandle;
  try {
    fileHandle = await dirHandle.getFileHandle(PRESETS_FILE);
  } catch {
    return null;
  }

  const file = await fileHandle.getFile();
  const text = await file.text();
  return parseInstallTime(text);
}

/**
 * Pure helper exposed for unit tests. Extract the `install_time` value
 * from raw file content. Tolerant of CRLF, leading blank lines, BOM,
 * and `#` comments above the `installed=` line.
 */
export function parseInstallTime(rawText: string): string | null {
  if (!rawText) return null;

  // Strip UTF-8 BOM if present.
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith('#')) continue;
    if (!trimmed.startsWith(INSTALLED_PREFIX)) {
      // ProffieOS's ValidatePresets() requires `installed=` as the first
      // variable; any other first variable means the file isn't a valid
      // presets.ini.
      return null;
    }
    const value = trimmed.slice(INSTALLED_PREFIX.length).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}
