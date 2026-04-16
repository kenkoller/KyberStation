import Dexie, { type Table } from 'dexie';
import type { FontManifest, SoundCategory } from '@kyberstation/sound';
import type { BladeConfig } from '@kyberstation/engine';

// ─── Stored record types ───

interface StoredFont {
  name: string;
  manifest: FontManifest;
  /** category -> ArrayBuffer[] (raw audio data, re-decoded on load) */
  audioData: Record<string, ArrayBuffer[]>;
}

interface AppSetting {
  key: string;
  value: string;
}

// ─── Font Library types ───

interface StoredLibraryHandle {
  id: string;
  handle: FileSystemDirectoryHandle;
  displayName: string;
}

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

// ─── User Preset types ───

export interface UserPreset {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  config: BladeConfig;
  fontAssociation?: string;
  sourcePresetId?: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

// ─── Database definition ───

class KyberStationDB extends Dexie {
  fonts!: Table<StoredFont, string>;
  settings!: Table<AppSetting, string>;
  userPresets!: Table<UserPreset, string>;
  libraryHandles!: Table<StoredLibraryHandle, string>;
  libraryFonts!: Table<LibraryFontEntry, string>;

  constructor() {
    super('kyberstation-fonts');
    this.version(1).stores({
      fonts: 'name',
      settings: 'key',
    });
    this.version(2).stores({
      fonts: 'name',
      settings: 'key',
      userPresets: 'id, name, createdAt, updatedAt',
    });
    this.version(3).stores({
      fonts: 'name',
      settings: 'key',
      userPresets: 'id, name, createdAt, updatedAt',
      libraryHandles: 'id',
      libraryFonts: 'name',
    });
  }
}

const db = new KyberStationDB();

// ─── Public API ───

/**
 * Persist a sound font's raw audio data to IndexedDB so it survives
 * page reloads. AudioBuffers cannot be cloned into IDB, so callers
 * must provide the underlying ArrayBuffer data.
 */
export async function saveFontToDB(
  name: string,
  manifest: FontManifest,
  audioData: Map<string, ArrayBuffer[]>,
): Promise<void> {
  const record: StoredFont = {
    name,
    manifest,
    audioData: Object.fromEntries(audioData),
  };
  await db.fonts.put(record);
  await setLastUsedFontName(name);
}

/**
 * Load a previously-stored font from IndexedDB.
 * Returns null if no font with that name exists.
 */
export async function loadFontFromDB(
  name: string,
): Promise<{ manifest: FontManifest; audioData: Map<string, ArrayBuffer[]> } | null> {
  const record = await db.fonts.get(name);
  if (!record) return null;
  return {
    manifest: record.manifest,
    audioData: new Map(Object.entries(record.audioData)),
  };
}

/** List the names of all fonts stored in IndexedDB. */
export async function getStoredFontNames(): Promise<string[]> {
  const keys = await db.fonts.toCollection().primaryKeys();
  return keys as string[];
}

/** Delete a stored font by name. */
export async function deleteFontFromDB(name: string): Promise<void> {
  await db.fonts.delete(name);
  // If this was the last-used font, clear that setting too
  const last = await getLastUsedFontName();
  if (last === name) {
    await db.settings.delete('lastUsedFont');
  }
}

/** Get the name of the most recently used font (or null). */
export async function getLastUsedFontName(): Promise<string | null> {
  const row = await db.settings.get('lastUsedFont');
  return row?.value ?? null;
}

/** Record which font was last active. */
export async function setLastUsedFontName(name: string): Promise<void> {
  await db.settings.put({ key: 'lastUsedFont', value: name });
}

// ─── User Preset persistence ───

/** Save or update a user preset in IndexedDB. */
export async function saveUserPresetToDB(preset: UserPreset): Promise<void> {
  await db.userPresets.put(preset);
}

/** Load all user presets from IndexedDB. */
export async function getAllUserPresets(): Promise<UserPreset[]> {
  return db.userPresets.toArray();
}

/** Delete a user preset by id. */
export async function deleteUserPresetFromDB(id: string): Promise<void> {
  await db.userPresets.delete(id);
}

/** Bulk-put user presets (for import). */
export async function bulkPutUserPresets(presets: UserPreset[]): Promise<void> {
  await db.userPresets.bulkPut(presets);
}

// ─── Font Library persistence ───

const LIBRARY_HANDLE_ID = 'default';

/** Save the font library directory handle to IndexedDB. */
export async function saveLibraryHandle(
  handle: FileSystemDirectoryHandle,
  displayName: string,
): Promise<void> {
  await db.libraryHandles.put({ id: LIBRARY_HANDLE_ID, handle, displayName });
}

/** Load the saved font library directory handle (or null). */
export async function loadLibraryHandle(): Promise<{
  handle: FileSystemDirectoryHandle;
  displayName: string;
} | null> {
  const record = await db.libraryHandles.get(LIBRARY_HANDLE_ID);
  if (!record) return null;
  return { handle: record.handle, displayName: record.displayName };
}

/** Clear the saved font library handle. */
export async function clearLibraryHandle(): Promise<void> {
  await db.libraryHandles.delete(LIBRARY_HANDLE_ID);
  await db.libraryFonts.clear();
}

/** Save scanned library font entries to IndexedDB cache. */
export async function saveLibraryFonts(fonts: LibraryFontEntry[]): Promise<void> {
  await db.libraryFonts.clear();
  await db.libraryFonts.bulkPut(fonts);
}

/** Load cached library font entries. */
export async function loadLibraryFonts(): Promise<LibraryFontEntry[]> {
  return db.libraryFonts.toArray();
}
