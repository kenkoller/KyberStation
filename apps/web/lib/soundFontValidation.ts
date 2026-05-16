// ─── Sound Font Validation ───
//
// Pre-flash check that the font folders a preset list references actually
// exist on the user's SD card. Without this check, users hit a silent
// failure mode: they design a preset referencing `font=mace_v2`, flash to
// their saber, and on activation the saber falls back to the default font
// (or refuses to ignite) because the folder isn't there.
//
// The check is best-effort — only runs in the direct-write path where we
// have a `FileSystemDirectoryHandle` to enumerate. ZIP-export users get a
// general "copy your fonts in after extracting" notice but no per-preset
// validation (we don't know what's on their card).
//
// Motivated by `docs/research/EMIT_PARSER_AUDIT.md` section I ("Sound
// font / track file references") — the audit flagged this gap as an
// UNVERIFIED item to fix.

export interface FontReference {
  presetName: string;
  fontName: string;
}

export interface MissingFontEntry extends FontReference {
  /** Best-guess closest match by case-insensitive prefix, for hinting. */
  closestMatch?: string;
}

/**
 * Enumerate font folders at the root of the SD card. Returns the names of
 * every immediate child *directory* — these are the candidates a preset's
 * `font=` line might reference. Skips non-directory entries and ignores
 * dot-prefixed system folders (`.fseventsd`, `.Spotlight-V100`, etc.).
 *
 * Throws if the handle isn't readable. Caller is responsible for catching.
 */
export async function listAvailableFonts(
  dirHandle: FileSystemDirectoryHandle,
): Promise<string[]> {
  const folders: string[] = [];
  // @ts-expect-error — `entries()` is an async iterator on FileSystemDirectoryHandle
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind !== 'directory') continue;
    if (name.startsWith('.')) continue; // skip macOS metadata dirs
    folders.push(name);
  }
  return folders.sort((a, b) => a.localeCompare(b));
}

/**
 * Given a list of preset font references + a list of available folders,
 * return the references whose font isn't present on the card.
 *
 * Match logic: case-insensitive equality. Real Proffieboard SD cards are
 * FAT32 and case-insensitive at the filesystem level, but ProffieOS's
 * `font=...` line is matched case-insensitively in the firmware, so we
 * mirror that. A preset referencing `font=mace_v2` matches a folder
 * named `Mace_V2` on the card.
 */
export function findMissingFontReferences(
  presets: FontReference[],
  availableFonts: string[],
): MissingFontEntry[] {
  if (availableFonts.length === 0) {
    return presets.map((p) => ({ ...p }));
  }
  const lowerAvailable = new Set(availableFonts.map((f) => f.toLowerCase()));
  const missing: MissingFontEntry[] = [];

  for (const ref of presets) {
    if (!ref.fontName || ref.fontName.trim().length === 0) continue; // no reference, no problem
    if (lowerAvailable.has(ref.fontName.toLowerCase())) continue; // matched

    // Find a hint — first available folder sharing a 3-char prefix
    // (case-insensitive). This catches typos like `mace_v2` vs `mace_v3`.
    const refPrefix = ref.fontName.slice(0, 3).toLowerCase();
    const closestMatch = availableFonts.find((f) =>
      f.toLowerCase().startsWith(refPrefix),
    );

    missing.push({
      presetName: ref.presetName,
      fontName: ref.fontName,
      closestMatch,
    });
  }

  return missing;
}
