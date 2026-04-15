import type { BoardId } from './zipExporter';

// ─── Types ───

export interface DetectedBoard {
  boardId: BoardId;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
}

export interface ExistingPreset {
  name: string;
  fontFolder: string;
}

// ─── File System Helpers ───

async function fileExists(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<boolean> {
  try {
    await dirHandle.getFileHandle(fileName);
    return true;
  } catch {
    return false;
  }
}

async function readFileText(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<string | null> {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

async function listDirectoryNames(
  dirHandle: FileSystemDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (handle.kind === 'directory') {
      names.push(name);
    }
  }
  return names.sort();
}

async function listFileNames(
  dirHandle: FileSystemDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (handle.kind === 'file') {
      names.push(name);
    }
  }
  return names.sort();
}

// ─── Board Detection ───

/**
 * Examine a directory's file structure to determine which lightsaber board
 * it belongs to. Returns null if the board cannot be identified.
 */
export async function detectBoardFromDirectory(
  dirHandle: FileSystemDirectoryHandle,
): Promise<DetectedBoard | null> {
  const evidence: string[] = [];
  const files = await listFileNames(dirHandle);
  const dirs = await listDirectoryNames(dirHandle);

  // --- ProffieOS detection ---
  const hasConfigH = files.includes('config.h');
  const hasPresetsDir = dirs.includes('presets');
  const hasFontDirs = dirs.some((d) => /^font\d+$/.test(d) || /^[A-Z]/.test(d));

  if (hasConfigH) {
    evidence.push('Found config.h');
    const configContent = await readFileText(dirHandle, 'config.h');
    if (configContent) {
      const isProffie =
        configContent.includes('CONFIG_TOP') ||
        configContent.includes('proffieboard') ||
        configContent.includes('NUM_BLADES') ||
        configContent.includes('ENABLE_WS2811');
      if (isProffie) {
        evidence.push('config.h contains ProffieOS markers');
        return { boardId: 'proffie', confidence: 'high', evidence };
      }
    }
    // config.h exists but no ProffieOS markers — still likely Proffie
    if (hasFontDirs || hasPresetsDir) {
      evidence.push('Has font directories alongside config.h');
      return { boardId: 'proffie', confidence: 'medium', evidence };
    }
    return { boardId: 'proffie', confidence: 'low', evidence };
  }

  if (hasPresetsDir) {
    evidence.push('Found presets/ directory (ProffieOS layout)');
    return { boardId: 'proffie', confidence: 'medium', evidence };
  }

  // --- CFX detection ---
  const hasConfigTxt = files.includes('config.txt');
  if (hasConfigTxt) {
    evidence.push('Found config.txt');
    const content = await readFileText(dirHandle, 'config.txt');
    if (content) {
      const isCfx =
        content.includes('[general]') ||
        content.includes('profiles=') ||
        content.includes('[profile') ||
        content.toLowerCase().includes('cfx');
      if (isCfx) {
        evidence.push('config.txt contains CFX markers');
        return { boardId: 'cfx', confidence: 'high', evidence };
      }
    }
    // config.txt without clear markers
    evidence.push('config.txt present but no clear CFX markers');
    return { boardId: 'cfx', confidence: 'low', evidence };
  }

  // --- Golden Harvest detection ---
  const hasConfigIni = files.includes('config.ini');
  if (hasConfigIni) {
    evidence.push('Found config.ini');
    const content = await readFileText(dirHandle, 'config.ini');
    if (content) {
      const isGH =
        content.includes('[board]') ||
        content.includes('Golden Harvest') ||
        content.includes('color_base=') ||
        content.toLowerCase().includes('golden');
      if (isGH) {
        evidence.push('config.ini contains Golden Harvest markers');
        return { boardId: 'golden_harvest', confidence: 'high', evidence };
      }
    }
    evidence.push('config.ini present but no clear GH markers');
    return { boardId: 'golden_harvest', confidence: 'low', evidence };
  }

  // --- Xenopixel detection ---
  const hasConfigJson = files.includes('config.json');
  if (hasConfigJson) {
    evidence.push('Found config.json');
    const content = await readFileText(dirHandle, 'config.json');
    if (content) {
      try {
        const parsed = JSON.parse(content);
        // Validate parsed JSON is a plain object before accessing properties
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          evidence.push('config.json is not a valid object');
        } else {
          const isXeno =
            'profiles' in parsed ||
            'generator' in parsed ||
            'version' in parsed;
          if (isXeno) {
            evidence.push('config.json contains Xenopixel-style structure');
            return { boardId: 'xenopixel', confidence: 'high', evidence };
          }
        }
      } catch {
        // Invalid JSON
      }
    }
    evidence.push('config.json present but structure unclear');
    return { boardId: 'xenopixel', confidence: 'low', evidence };
  }

  return null;
}

// ─── Preset Listing ───

/**
 * List existing presets/fonts already on the SD card.
 */
export async function listExistingPresets(
  dirHandle: FileSystemDirectoryHandle,
  boardId: BoardId,
): Promise<ExistingPreset[]> {
  const presets: ExistingPreset[] = [];
  const dirs = await listDirectoryNames(dirHandle);

  switch (boardId) {
    case 'proffie': {
      // ProffieOS: parse config.h for font names, or list font directories
      const configContent = await readFileText(dirHandle, 'config.h');
      if (configContent) {
        // Extract preset names from Preset presets[] entries
        const presetRegex = /\{\s*"([^"]+)"\s*,\s*"[^"]*"\s*,/g;
        let match: RegExpExecArray | null;
        while ((match = presetRegex.exec(configContent)) !== null) {
          presets.push({ name: match[1], fontFolder: match[1] });
        }
      }
      if (presets.length === 0) {
        // Fallback: list directories that look like font folders
        for (const dir of dirs) {
          if (dir !== 'common' && dir !== 'presets' && !dir.startsWith('.')) {
            presets.push({ name: dir, fontFolder: dir });
          }
        }
      }
      break;
    }

    case 'cfx': {
      // CFX: font folders with per-folder config.txt
      for (const dir of dirs) {
        if (/^font\d+$/i.test(dir) || !dir.startsWith('.')) {
          try {
            const fontDir = await dirHandle.getDirectoryHandle(dir);
            const hasFontConfig = await fileExists(fontDir, 'config.txt');
            if (hasFontConfig) {
              const fontConfig = await readFileText(fontDir, 'config.txt');
              const nameMatch = fontConfig?.match(/name=(.+)/);
              presets.push({
                name: nameMatch ? nameMatch[1].trim() : dir,
                fontFolder: dir,
              });
            } else {
              presets.push({ name: dir, fontFolder: dir });
            }
          } catch {
            presets.push({ name: dir, fontFolder: dir });
          }
        }
      }
      break;
    }

    case 'golden_harvest': {
      // GH: parse config.ini for profile sections
      const content = await readFileText(dirHandle, 'config.ini');
      if (content) {
        const profileRegex = /\[profile(\d+)\]\s*\n(?:.*\n)*?name=(.+)/g;
        let match: RegExpExecArray | null;
        while ((match = profileRegex.exec(content)) !== null) {
          presets.push({
            name: match[2].trim(),
            fontFolder: `font${match[1]}`,
          });
        }
      }
      if (presets.length === 0) {
        for (const dir of dirs) {
          if (/^font\d+$/i.test(dir)) {
            presets.push({ name: dir, fontFolder: dir });
          }
        }
      }
      break;
    }

    case 'xenopixel': {
      // Xenopixel: parse config.json
      const content = await readFileText(dirHandle, 'config.json');
      if (content) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.profiles)) {
            for (const profile of parsed.profiles) {
              presets.push({
                name: profile.name ?? `Profile ${profile.id}`,
                fontFolder: profile.font ?? `font${profile.id}`,
              });
            }
          }
        } catch {
          // Invalid JSON
        }
      }
      if (presets.length === 0) {
        for (const dir of dirs) {
          if (/^font\d+$/i.test(dir)) {
            presets.push({ name: dir, fontFolder: dir });
          }
        }
      }
      break;
    }
  }

  return presets;
}

// ─── Backup ───

/**
 * Read the existing config file from the SD card and return it as a string
 * for backup purposes.
 */
export async function backupConfig(
  dirHandle: FileSystemDirectoryHandle,
): Promise<string | null> {
  // Try each known config file name in priority order
  const configFiles = ['config.h', 'config.txt', 'config.ini', 'config.json'];

  for (const fileName of configFiles) {
    const content = await readFileText(dirHandle, fileName);
    if (content !== null) {
      return content;
    }
  }

  return null;
}

// ─── Write Utilities ───

/**
 * Write a string to a file within a directory, creating or overwriting.
 */
export async function writeFileToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string,
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Create a subdirectory if it does not exist.
 */
export async function ensureDirectory(
  dirHandle: FileSystemDirectoryHandle,
  dirName: string,
): Promise<FileSystemDirectoryHandle> {
  return dirHandle.getDirectoryHandle(dirName, { create: true });
}

/**
 * Verify a file's contents match the expected string.
 */
export async function verifyFileContents(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  expected: string,
): Promise<boolean> {
  const actual = await readFileText(dirHandle, fileName);
  return actual === expected;
}
