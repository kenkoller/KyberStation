/**
 * Zustand store for loaded sound font data.
 *
 * Holds decoded AudioBuffers grouped by category so that useAudioEngine
 * can use real font sounds instead of synthetic ones. Also manages the
 * font library directory and cached font metadata.
 */
import { create } from 'zustand';
import type { FontManifest } from '@bladeforge/sound';
import type { LibraryFontEntry } from '@bladeforge/sound';
import {
  saveLibraryHandle,
  loadLibraryHandle,
  clearLibraryHandle,
  saveLibraryFonts,
  loadLibraryFonts,
} from '@/lib/fontDB';

interface AudioFontState {
  /** Name of the currently loaded font (e.g. "SmthJedi") */
  fontName: string | null;

  /** The parsed manifest with file metadata */
  manifest: FontManifest | null;

  /** Decoded AudioBuffers keyed by sound category */
  buffers: Map<string, AudioBuffer[]>;

  /** Loading state: 0 = idle, 0..1 = loading progress, 1 = done */
  loadProgress: number;

  /** Whether a font is currently being decoded */
  isLoading: boolean;

  /** Any warnings from parsing or decoding */
  warnings: string[];

  // ─── Font Library ───

  /** The saved directory handle for the font library root */
  libraryHandle: FileSystemDirectoryHandle | null;

  /** Scanned font metadata from the library */
  libraryFonts: LibraryFontEntry[];

  /** Display name of the selected library directory */
  libraryPath: string;

  /** Whether library is currently being scanned */
  isScanning: boolean;

  /** Number of fonts scanned so far (for progress) */
  scanProgress: { scanned: number; currentName: string };

  /** Set the loaded font data */
  setFont: (
    fontName: string,
    manifest: FontManifest,
    buffers: Map<string, AudioBuffer[]>,
    warnings: string[],
  ) => void;

  /** Update loading progress (0..1) */
  setLoadProgress: (progress: number) => void;

  /** Set loading state */
  setIsLoading: (loading: boolean) => void;

  /** Clear the loaded font */
  clearFont: () => void;

  /** Get a random buffer for a category, or null if none loaded */
  getBuffer: (category: string) => AudioBuffer | null;

  // ─── Font Library actions ───

  /** Set the library directory handle and persist it. */
  setLibraryHandle: (handle: FileSystemDirectoryHandle) => Promise<void>;

  /** Clear the library directory and cached fonts. */
  clearLibrary: () => Promise<void>;

  /** Load cached library state from IndexedDB on mount. */
  hydrateLibrary: () => Promise<void>;

  /** Scan the library directory and cache results. */
  scanLibrary: () => Promise<void>;

  /** Set scanning state */
  setIsScanning: (scanning: boolean) => void;

  /** Update library fonts (from scan or cache) */
  setLibraryFonts: (fonts: LibraryFontEntry[]) => void;
}

export const useAudioFontStore = create<AudioFontState>((set, get) => ({
  fontName: null,
  manifest: null,
  buffers: new Map(),
  loadProgress: 0,
  isLoading: false,
  warnings: [],

  // Library state
  libraryHandle: null,
  libraryFonts: [],
  libraryPath: '',
  isScanning: false,
  scanProgress: { scanned: 0, currentName: '' },

  setFont: (fontName, manifest, buffers, warnings) =>
    set({ fontName, manifest, buffers, warnings, loadProgress: 1, isLoading: false }),

  setLoadProgress: (progress) => set({ loadProgress: progress }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  clearFont: () =>
    set({
      fontName: null,
      manifest: null,
      buffers: new Map(),
      loadProgress: 0,
      isLoading: false,
      warnings: [],
    }),

  getBuffer: (category) => {
    const bufs = get().buffers.get(category);
    if (!bufs || bufs.length === 0) return null;
    return bufs[Math.floor(Math.random() * bufs.length)];
  },

  // ─── Font Library actions ───

  setLibraryHandle: async (handle) => {
    const displayName = handle.name;
    set({ libraryHandle: handle, libraryPath: displayName });
    await saveLibraryHandle(handle, displayName);
  },

  clearLibrary: async () => {
    set({
      libraryHandle: null,
      libraryFonts: [],
      libraryPath: '',
      isScanning: false,
      scanProgress: { scanned: 0, currentName: '' },
    });
    await clearLibraryHandle();
  },

  hydrateLibrary: async () => {
    const stored = await loadLibraryHandle();
    if (!stored) return;

    // Re-request permission (returns 'granted' if still valid)
    // Cast: requestPermission is a File System Access API method not in TS DOM lib
    try {
      const h = stored.handle as FileSystemDirectoryHandle & {
        requestPermission: (opts: { mode: string }) => Promise<string>;
      };
      const permission = await h.requestPermission({ mode: 'read' });
      if (permission !== 'granted') return;
    } catch {
      // User denied or handle is stale
      return;
    }

    set({ libraryHandle: stored.handle, libraryPath: stored.displayName });

    // Load cached font metadata
    const cached = await loadLibraryFonts();
    if (cached.length > 0) {
      set({ libraryFonts: cached });
    }
  },

  scanLibrary: async () => {
    const handle = get().libraryHandle;
    if (!handle) return;

    set({ isScanning: true, scanProgress: { scanned: 0, currentName: '' } });

    try {
      const { scanDirectoryHandle } = await import('@bladeforge/sound');
      const fonts = await scanDirectoryHandle(handle, (scanned, name) => {
        set({ scanProgress: { scanned, currentName: name } });
      });
      set({ libraryFonts: fonts, isScanning: false });
      await saveLibraryFonts(fonts);
    } catch {
      set({ isScanning: false });
    }
  },

  setIsScanning: (scanning) => set({ isScanning: scanning }),

  setLibraryFonts: (fonts) => set({ libraryFonts: fonts }),
}));
