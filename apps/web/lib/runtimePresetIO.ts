// ─── ProffieOS Runtime Preset — Browser-side I/O ───
//
// Helpers for the File System Access API path ("Write to Card"):
//   - discover the firmware's compile-time `install_time` from the SD card's
//     existing presets.ini / presets.tmp (plain text OR firmware-written)
//   - back up both files byte-for-byte before they are overwritten
//   - verify both files after writing
// The runtime emitter in `packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`
// stays pure — platform-specific I/O lives here.
//
// ── Why there are two files (ProffieOS 7.12) ──
//
// ProffieOS double-buffers the preset list across `presets.ini` and
// `presets.tmp`. Whenever the firmware writes one of them (first boot, or any
// on-saber preset edit) it goes through `BufferedFileWriter`
// (`common/file_reader.h`), which prefixes the text with a 512-byte binary
// header: two identical `SafeFileHeader` records
// `{ magic 0xFF1E5AFE, checksum, iteration, length }`, then the install_time
// string, zero-padded to byte 512. The plain `installed=…` text starts at byte
// 512 and the file is zero-padded to 256 KiB.
//
// At boot, `CurrentPreset::OpenPresets2()` (`common/current_preset.h`) tries
// files with a valid header FIRST (highest iteration wins) and only then the
// plain-text `presets.ini`, then plain `presets.tmp`. So a leftover
// firmware-written `presets.tmp` beats a freshly copied plain `presets.ini`,
// and the saber silently reverts to its old list. Writing `presets.tmp` as a
// byte-identical plain-text copy of `presets.ini` leaves no valid header on
// the card, so `TryPlain(presets.ini)` wins. Hardware-validated on the
// 89sabers V3.9-BT 2026-05-18 (4-preset deck) and 2026-05-19 (22-preset deck).
//
// The binary header also means a firmware-written presets.ini does NOT start
// with `installed=` — `parseInstallTimeFromBytes()` looks past the header.

export const RUNTIME_PRESETS_INI = 'presets.ini';
export const RUNTIME_PRESETS_TMP = 'presets.tmp';

/** Both on-card preset files, in the order ProffieOS tries plain-text files. */
export const RUNTIME_PRESET_FILES = [RUNTIME_PRESETS_INI, RUNTIME_PRESETS_TMP] as const;
export type RuntimePresetFileName = (typeof RUNTIME_PRESET_FILES)[number];

const INSTALLED_PREFIX = 'installed=';

/** `SafeFileHeader::magic` written by `BufferedFileWriter::Close()`. */
const SAFE_FILE_MAGIC = 0xff1e5afe;
/** Size of one `SafeFileHeader` (4 × uint32). The header is written twice. */
const SAFE_FILE_HEADER_RECORD_BYTES = 16;
/** `BufferedFileWriter` seeks to 512 before writing the text payload. */
const SAFE_FILE_PAYLOAD_OFFSET = 512;

// ─── Pure parsers ───

/**
 * If `bytes` is a firmware-written preset file (valid-looking
 * `SafeFileHeader2`: magic at offset 0 and both header records identical),
 * return the text payload — `length` bytes starting at offset 512. Returns
 * `null` for plain-text files. Does not verify the checksum (ProffieOS does
 * that; we only need to find the text).
 */
export function extractFirmwarePayload(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < SAFE_FILE_PAYLOAD_OFFSET) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== SAFE_FILE_MAGIC) return null;
  for (let i = 0; i < SAFE_FILE_HEADER_RECORD_BYTES; i++) {
    if (bytes[i] !== bytes[SAFE_FILE_HEADER_RECORD_BYTES + i]) return null;
  }
  const length = view.getUint32(12, true);
  const end = Math.min(bytes.length, SAFE_FILE_PAYLOAD_OFFSET + length);
  return bytes.subarray(SAFE_FILE_PAYLOAD_OFFSET, end);
}

/** True when the file carries the firmware's binary header (the saber wrote it). */
export function isFirmwareWrittenPresetFile(bytes: Uint8Array): boolean {
  return extractFirmwarePayload(bytes) !== null;
}

/**
 * Extract the `install_time` value from raw file content. Tolerant of CRLF,
 * leading blank lines, BOM, and `#` comments above the `installed=` line.
 * Pure helper exposed for unit tests; expects plain text (use
 * `parseInstallTimeFromBytes` for raw file bytes).
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

/**
 * Extract the `install_time` value from raw preset-file bytes — either a
 * plain-text file (KyberStation / hand-written) or a firmware-written file
 * with the 512-byte `SafeFileHeader2` prefix.
 */
export function parseInstallTimeFromBytes(bytes: Uint8Array): string | null {
  const payload = extractFirmwarePayload(bytes) ?? bytes;
  return parseInstallTime(new TextDecoder('utf-8').decode(payload));
}

// ─── Directory helpers (File System Access API) ───

/** Read a root-level file's bytes, or `null` when it doesn't exist / can't be read. */
export async function readRuntimePresetFileBytes(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Read the card's existing preset files and return the firmware's
 * `install_time` so the emitter can produce a file ProffieOS will accept.
 * Tries `presets.ini` first, then `presets.tmp` (both carry the same
 * compile-time constant). Handles firmware-written files (binary header).
 *
 * Returns `null` when neither file exists or neither yields a non-empty
 * `installed=` value.
 */
export async function readExistingInstallTime(
  dirHandle: FileSystemDirectoryHandle,
): Promise<string | null> {
  return (await inspectRuntimePresetFiles(dirHandle)).installTime;
}

export interface RuntimePresetFileInfo {
  name: RuntimePresetFileName;
  exists: boolean;
  /** The saber wrote this file (binary `SafeFileHeader` present). */
  firmwareWritten: boolean;
  installTime: string | null;
}

export interface RuntimePresetCardState {
  ini: RuntimePresetFileInfo;
  tmp: RuntimePresetFileInfo;
  /** First install_time found — presets.ini preferred, presets.tmp as fallback. */
  installTime: string | null;
}

/** Inspect both on-card preset files in one pass. */
export async function inspectRuntimePresetFiles(
  dirHandle: FileSystemDirectoryHandle,
): Promise<RuntimePresetCardState> {
  const inspect = async (name: RuntimePresetFileName): Promise<RuntimePresetFileInfo> => {
    const bytes = await readRuntimePresetFileBytes(dirHandle, name);
    if (!bytes) return { name, exists: false, firmwareWritten: false, installTime: null };
    return {
      name,
      exists: true,
      firmwareWritten: isFirmwareWrittenPresetFile(bytes),
      installTime: parseInstallTimeFromBytes(bytes),
    };
  };
  const ini = await inspect(RUNTIME_PRESETS_INI);
  const tmp = await inspect(RUNTIME_PRESETS_TMP);
  return { ini, tmp, installTime: ini.installTime ?? tmp.installTime };
}

export interface RuntimePresetBackup {
  from: RuntimePresetFileName;
  to: string;
  bytes: number;
}

/**
 * Backup file name for one of the preset files. Keeps the original
 * extension so restoring is a rename: `presets.ini` →
 * `presets_backup_<stamp>.ini`, `presets.tmp` → `presets_backup_<stamp>.tmp`.
 * ProffieOS only ever opens the exact names `presets.ini` / `presets.tmp`,
 * so backups never load by accident.
 */
export function runtimePresetBackupName(
  fileName: RuntimePresetFileName,
  stamp: string,
): string {
  const ext = fileName.slice(fileName.lastIndexOf('.'));
  return `presets_backup_${stamp}${ext}`;
}

/**
 * Copy the card's existing `presets.ini` and `presets.tmp` (whichever exist)
 * to backup files, byte-for-byte. Firmware-written files are binary (header +
 * zero padding), so this never round-trips through text decoding.
 */
export async function backupRuntimePresetFiles(
  dirHandle: FileSystemDirectoryHandle,
  stamp: string,
): Promise<RuntimePresetBackup[]> {
  const backups: RuntimePresetBackup[] = [];
  for (const name of RUNTIME_PRESET_FILES) {
    const bytes = await readRuntimePresetFileBytes(dirHandle, name);
    if (!bytes) continue;
    const to = runtimePresetBackupName(name, stamp);
    const fileHandle = await dirHandle.getFileHandle(to, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(bytes);
    await writable.close();
    backups.push({ from: name, to, bytes: bytes.length });
  }
  return backups;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * After a write, confirm BOTH preset files on the card are byte-identical to
 * the emitted content. A mismatch on `presets.tmp` means the stale-save trap
 * is still armed.
 */
export async function verifyRuntimePresetFiles(
  dirHandle: FileSystemDirectoryHandle,
  expectedContent: string,
): Promise<Record<RuntimePresetFileName, boolean>> {
  const expected = new TextEncoder().encode(expectedContent);
  const result: Record<RuntimePresetFileName, boolean> = {
    [RUNTIME_PRESETS_INI]: false,
    [RUNTIME_PRESETS_TMP]: false,
  };
  for (const name of RUNTIME_PRESET_FILES) {
    const bytes = await readRuntimePresetFileBytes(dirHandle, name);
    result[name] = bytes !== null && bytesEqual(bytes, expected);
  }
  return result;
}
