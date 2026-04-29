# Feature Spec: Sound Font Library, Custom Presets & Card Presets

## Motivation

Sound fonts are an integral part of the lightsaber experience — the visual blade style
and the sound font together define a saber's character. KyberStation currently handles
fonts as one-at-a-time drag-drop imports with no persistent library. It also lacks a
way for users to save their own customized presets alongside the built-in canonical ones,
or to compose curated "card presets" — complete SD card configurations assembled from
a mix of built-in and personal presets paired with specific fonts.

This spec covers three tightly related features:
1. **Sound Font Library Browser** — point KyberStation at your local font collection,
   browse and switch fonts instantly, and associate fonts with presets.
2. **Custom User Presets** — save your current editor state as a named personal preset,
   organize a personal collection, and pair presets with fonts from your library.
3. **Card Presets** — composable, swappable SD card configurations that bundle multiple
   blade presets + font pairings into a single exportable unit.

---

## Part 1: Sound Font Library Browser

### What exists today

- `SoundFontPanel.tsx` — single font drag-drop import, playback buttons, EQ/effects mixer
- `audioFontStore.ts` — Zustand store holding one active font's decoded AudioBuffers
- `fontDB.ts` — IndexedDB persistence via Dexie (`kyberstation-fonts` database), stores
  individual fonts by name with raw ArrayBuffer audio data, tracks last-used font name
- `FontParser.ts` — parses a FileList into a FontManifest, categorizes WAVs by ProffieOS
  naming convention (`clsh`, `swng`, `blst`, etc.), also detects CFX naming. Detects
  SmoothSwing pairs (`swingl`/`swingh`). Has a 50 MB per-file safety limit.
- `FontPlayer.ts` — Web Audio playback engine: hum loop + one-shot effects, outputs to
  a GainNode for filter chain connection
- `AudioFilterChain.ts` + `audioMixerStore.ts` — EQ (bass/mid/treble), effects
  (distortion, reverb, delay, chorus, phaser, bitcrusher, pitch shift, compressor),
  and effect chain presets (Kylo Unstable, Cave Echo, Lo-Fi Retro, etc.)

### What needs to be built

#### 1.1 Font Library Directory Picker

Use the File System Access API (`window.showDirectoryPicker()`) to let the user select
their root font library directory (e.g., `~/SaberFonts/`). The API returns a
`FileSystemDirectoryHandle` that can be persisted across sessions via IndexedDB.

On subsequent visits, re-request read permission with:
```ts
const permission = await handle.requestPermission({ mode: 'read' });
```

**Storage**: Add a new table in `fontDB.ts` (bump Dexie schema version):
```ts
this.version(2).stores({
  fonts: 'name',
  settings: 'key',
  libraryHandles: 'id',  // stores serialized FileSystemDirectoryHandle
});
```

Use `indexedDB` serialization of `FileSystemDirectoryHandle` (it is structured-cloneable).

**Store changes** in `audioFontStore.ts`:
- Add `libraryHandle: FileSystemDirectoryHandle | null`
- Add `libraryFonts: LibraryFontEntry[]` — lightweight metadata for each detected font
- Add `libraryPath: string` — display name of the selected directory
- Add `setLibraryHandle()`, `clearLibrary()`, `scanLibrary()` actions

#### 1.2 Font Scanner

When a library directory is set, scan its immediate subdirectories. Each subdirectory
is assumed to be a font folder. For each folder:

1. Iterate files via `dirHandle.values()` to list `.wav` files
2. Run `FontParser` categorization logic (name pattern matching only — no audio decoding)
3. Build a lightweight `LibraryFontEntry`:

```ts
interface LibraryFontEntry {
  name: string;                    // folder name
  format: 'proffie' | 'cfx' | 'generic';
  fileCount: number;
  totalSizeBytes: number;
  categories: Record<SoundCategory, number>;  // count per category
  hasSmoothSwing: boolean;
  smoothSwingPairCount: number;
  completeness: 'complete' | 'partial' | 'minimal';  // based on missing critical categories
  missingCategories: string[];     // e.g., ["hum", "swing"]
  lastScanned: number;            // timestamp
}
```

**Completeness logic**:
- `complete` — has hum, swing (or swingl/swingh), clash, ignition, retraction
- `partial` — missing 1-2 of the above
- `minimal` — missing 3+ critical categories

Cache these manifests in IndexedDB so the font list loads instantly on revisit without
re-scanning. Add a "Refresh Library" action that re-scans.

**Important**: Do NOT decode audio during scanning. Audio decoding only happens when the
user selects a specific font to preview. This keeps the scan fast even for large libraries.

#### 1.3 Font Library Panel UI

Add a `library` tab to the existing SoundFontPanel tab bar (alongside `fonts`, `mixer`,
`presets`). The library tab shows:

- **Header**: Current library path + "Change Folder" button + "Refresh" button
- **Search bar**: Filter fonts by name
- **Sort options**: alphabetical, by file count, by completeness
- **Font list**: Scrollable list of `LibraryFontEntry` items, each showing:
  - Font name (bold)
  - File count + format badge (`PRF` / `CFX` / `GEN`)
  - Completeness dot: green (complete), yellow (partial), red (minimal)
  - Category breakdown on hover/expand (how many clash, swing, hum, etc.)
  - "Load" button to decode and activate as the current preview font
  - "Pair" button to associate with the currently active blade preset

If no library is set, show a prominent "Set Font Library Folder" button with a brief
explanation of what it does.

**Active font indicator**: When a font from the library is loaded, highlight it in the
list. Show the font name in the main Sound Fonts tab header area too.

#### 1.4 Browser Compatibility

The File System Access API is Chromium-only (Chrome, Edge, Arc, Brave — not Firefox
or Safari). Add a capability check:

```ts
const hasFileSystemAccess = 'showDirectoryPicker' in window;
```

If unsupported:
- Hide the "Set Library Folder" button
- Show a note: "Font library browsing requires the File System Access API.
  Supported in Chrome, Edge, Arc, and Brave (Brave users: enable
  `brave://flags/#file-system-access-api`). Not yet supported in Safari or
  Firefox."
- The existing drag-drop + IndexedDB cache flow continues to work
- Show a "Previously Imported" section listing fonts cached in IndexedDB (from
  `getStoredFontNames()` in `fontDB.ts`) as a lightweight library substitute

**Brave-specific note**: Brave is Chromium-based and ships with the File System
Access API, but disables it by default for fingerprinting-prevention reasons.
Brave users see the unsupported-browser warning on first visit. The fix is one
flag flip: navigate to `brave://flags/#file-system-access-api` and set it to
**Enabled**, then relaunch the browser. Confirmed live 2026-04-28 — without the
flag the warning correctly fires; with the flag enabled the directory picker
works identically to Chrome. The warning copy in `AudioColumnB.tsx` calls this
out inline so users don't assume Brave is unsupported.

---

## Part 2: Custom User Presets

### What exists today

- `PresetBrowser.tsx` — browse 146 built-in canonical presets (OT, prequel, sequel,
  animated, extended universe, legends, community). Filter by era/affiliation, search
  by name. Click to load into editor. "+ List" button adds to preset list.
- `presetListStore.ts` — an ordered list of `PresetListEntry` items persisted in
  localStorage. Each entry has: id, presetName, fontName, config (full BladeConfig),
  optional sourcePresetId. This is effectively an export queue for generating the
  ProffieOS config file, NOT a personal preset library.
- `bladeConfigIO.ts` — export config as `.kyberstation.json` file download, import from
  file. Also has `encodeConfig()`/`buildShareUrl()` for share links.
- `bladeStore.ts` — the active editor state (current BladeConfig being edited)

### What's missing

There is no way to:
- Save the current editor state as a named personal preset
- Build a personal collection of customized presets
- Browse personal presets alongside built-in ones
- Tag, categorize, or describe personal presets
- Associate a sound font from the library with a personal preset
- Duplicate and modify a built-in preset as a starting point

### What needs to be built

#### 2.1 User Preset Data Model

```ts
interface UserPreset {
  id: string;                      // crypto.randomUUID()
  name: string;                    // user-chosen name, e.g. "My Vader (Heavy Bass)"
  description?: string;            // optional notes
  tags: string[];                  // user-defined tags for filtering, e.g. ["dark side", "dueling", "favorite"]
  config: BladeConfig;             // full blade configuration snapshot
  fontAssociation?: string;        // name of font from library to auto-load
  sourcePresetId?: string;         // if derived from a built-in preset, track which one
  createdAt: number;               // timestamp
  updatedAt: number;               // timestamp
  thumbnail?: string;              // base64 data URL of a blade canvas snapshot (small)
}
```

#### 2.2 User Preset Store

Create `apps/web/stores/userPresetStore.ts`:

```ts
interface UserPresetStore {
  presets: UserPreset[];
  
  // CRUD
  savePreset: (name: string, config: BladeConfig, options?: {
    description?: string;
    tags?: string[];
    fontAssociation?: string;
    sourcePresetId?: string;
    thumbnail?: string;
  }) => string;  // returns new preset id
  
  updatePreset: (id: string, updates: Partial<Omit<UserPreset, 'id' | 'createdAt'>>) => void;
  deletePreset: (id: string) => void;
  duplicatePreset: (id: string, newName: string) => string;
  
  // Bulk operations
  importPresets: (presets: UserPreset[]) => void;
  exportPresets: (ids?: string[]) => UserPreset[];  // all if no ids specified
  
  // Organization
  reorderPresets: (fromIndex: number, toIndex: number) => void;
}
```

**Persistence**: Store in IndexedDB via Dexie (not localStorage — user preset collections
can grow large with thumbnail data). Add a `userPresets` table to the existing
`KyberStationDB` in `fontDB.ts` (or create a dedicated `presetDB.ts` if cleaner):

```ts
this.version(3).stores({
  fonts: 'name',
  settings: 'key',
  libraryHandles: 'id',
  userPresets: 'id, name, createdAt, updatedAt',
});
```

#### 2.3 "Save Preset" UI Flow

Add a "Save As Preset" action accessible from multiple places:

1. **Editor toolbar / header area** — a "Save" button that captures the current
   `bladeStore.config` state

2. **PresetBrowser panel** — a "Save Current As..." button in the Import/Export section

3. **Keyboard shortcut** — Ctrl/Cmd+S when the editor is focused

The save flow:
1. User clicks "Save As Preset"
2. A small modal/popover appears with:
   - **Name** field (pre-filled with config.name or "My Custom Preset")
   - **Description** textarea (optional)
   - **Tags** input (comma-separated or chip-style input)
   - **Font association** dropdown (populated from library fonts if library is set,
     or manual text input)
   - **Thumbnail**: auto-captured from the current BladeCanvas state (small snapshot)
3. User clicks "Save" — preset is stored in IndexedDB
4. Toast confirmation: "Preset saved: [name]"

If a preset with the same name already exists, offer "Update existing" vs "Save as new".

#### 2.4 User Preset Browser

Add a "My Presets" section to `PresetBrowser.tsx`, displayed above or in a separate tab
from the built-in canonical presets. This section shows:

- **Grid of user preset cards** (same card style as built-in presets but with a
  distinguishing visual — e.g., a subtle border color or "Custom" badge)
- Each card shows:
  - Thumbnail (engine-rendered blade snapshot from save time)
  - Preset name
  - Style type + ignition timing
  - Font association (if any)
  - Tags as small pills/chips
  - Creation date (relative: "2 days ago")
- **Card actions** (via right-click context menu or overflow "..." button):
  - Load (applies config to editor)
  - Edit Details (name, description, tags, font)
  - Update (overwrite config with current editor state)
  - Duplicate
  - Export as `.kyberstation.json`
  - Delete (with confirmation)
- **Search** across name, description, and tags
- **Filter by tags** (show all unique tags as filter chips)
- **Sort**: newest first, alphabetical, recently modified
- **Bulk export**: select multiple and export as a single `.kyberstation.json` bundle

#### 2.5 Preset + Font Pairing

When the font library (Part 1) is available, presets gain font association:

- When saving a preset, if a library font is currently loaded in the Sound Font panel,
  auto-suggest that font name in the association field
- When loading a user preset that has a font association, and the font library is
  connected, automatically load that font alongside the visual style
- In the preset card, show the associated font name as a subtle label
- If the associated font isn't found in the library (renamed/deleted), show a warning
  icon and let the user re-associate

This creates the complete workflow:
1. Browse built-in preset -> load "Darth Vader"
2. Tweak colors, ignition, effects to taste
3. Open font library -> load "KSith_Vader_Heavy" font
4. Audition the combined visual + audio experience
5. Save as "My Vader (Heavy)" with font association
6. Next time: click "My Vader (Heavy)" -> blade style AND font load together

#### 2.6 Integration with Preset List (Export Queue)

The existing `presetListStore` (the ordered list used for config.h generation) should
be enhanced to accept user presets:

- When adding a user preset to the export list, pull font name from the font association
- The "+ List" button on user preset cards works the same as on built-in presets
- The export list entries should visually distinguish "from built-in" vs "from custom"

#### 2.7 Import/Export of User Preset Collections

Users should be able to share their custom preset collections:

- **Export**: Download all (or selected) user presets as a `.kyberstation-collection.json`
  file containing an array of `UserPreset` objects (thumbnails included)
- **Import**: Load a `.kyberstation-collection.json` — merges into existing collection,
  handles name conflicts by appending "(imported)" suffix
- The existing single-preset `.kyberstation.json` export continues to work for sharing
  individual configs. When importing a single `.kyberstation.json`, offer to save it as
  a user preset in addition to loading it into the editor.

---

## Part 3: Card Presets (Composable SD Card Configurations)

### What exists today

- `SaberProfileManager.tsx` — manage multiple "saber profiles," each representing a
  physical lightsaber with its own board type, SD card size, preset list, font
  assignments, and notes. Can switch between profiles, duplicate, delete, export/import
  as JSON, and copy presets between profiles.
- `saberProfileStore.ts` — Zustand store persisted to localStorage. Each `SaberProfile`
  has: id, name, chassisType, boardType, cardSize, presetEntries (array of
  `PresetListEntry`), fontAssignments (Record<string, string>), notes, timestamps.
- `CardWriter.tsx` — exports preset list as a ZIP (config file + font folder structure)
  or writes directly to SD card via File System Access API. Detects existing board
  config, backs up, writes, and verifies. Supports Proffie, CFX, GHv3, Xenopixel boards.
- `presetListStore.ts` — the active ordered list of presets for export. Currently the
  CardWriter pulls from this list.
- `StorageBudgetPanel.tsx` — estimates SD card usage based on font count and card size.

### What's missing

The saber profile system exists but is disconnected from the user preset library and
font library. There is no way to:
- Build a card preset from a mix of built-in presets AND user-created custom presets
- Quickly swap between different card preset configurations for the same saber
- Preview the full card preset (all presets + font pairings) before exporting
- Create a card preset template that can be shared with other users
- See storage budget estimates that account for actual font sizes from the library

### What needs to be built

#### 3.1 Enhanced Saber Profile Data Model

Extend `SaberProfile` in `saberProfileStore.ts`:

```ts
interface SaberProfile {
  // ... existing fields ...
  id: string;
  name: string;
  chassisType: string;
  boardType: string;
  cardSize: string;
  presetEntries: CardPresetEntry[];  // CHANGED: richer type than PresetListEntry
  notes: string;
  createdAt: string;
  updatedAt: string;

  // NEW fields
  fontLibraryPath?: string;          // display path of associated font library
  isTemplate: boolean;               // true = shareable template, false = personal config
  tags: string[];                    // for organization: ["dueling", "display", "cosplay"]
}

interface CardPresetEntry {
  id: string;
  order: number;                     // position in the preset cycle order
  presetName: string;                // display name for this slot
  fontName: string;                  // font folder name on SD card

  // Source — where this entry came from
  source:
    | { type: 'builtin'; presetId: string }    // from packages/presets canonical library
    | { type: 'custom'; userPresetId: string }  // from user's saved presets (Part 2)
    | { type: 'inline'; }                       // manually configured in-place

  config: BladeConfig;               // the actual blade configuration
  fontAssociation?: string;          // font name from the font library (Part 1)
  mixerPreset?: string;              // optional audio effect chain preset id
}
```

#### 3.2 Card Preset Composer UI

Replace or enhance the current preset list section in the editor. The composer should
show an ordered list of `CardPresetEntry` items with:

- **Drag-to-reorder** — rearrange the cycle order
- **Each entry shows**:
  - Position number (1, 2, 3...)
  - Blade style thumbnail (live-rendered or cached)
  - Preset name (editable inline)
  - Source badge: "Built-in" / "Custom" / "Inline"
  - Font name (editable, or pick from font library if connected)
  - Base color swatch
  - Style label (Stable, Fire, Unstable, etc.)
  - Remove button
- **Add preset actions**:
  - "Add from Gallery" — opens preset browser (built-in presets), adds selected to list
  - "Add from My Presets" — opens user preset browser (Part 2), adds selected
  - "Add Current" — snapshots the current editor state as an inline entry
  - "Add Empty" — creates a blank entry to configure from scratch
- **Bulk actions**:
  - "Clear All" (with confirmation)
  - "Import from Profile" — copy entries from another saber profile
  - "Save as Template" — save the current list as a shareable card preset template

#### 3.3 Card Preset Quick-Switch

Add a quick-switch mechanism so users can maintain multiple card preset configurations
for the same saber (e.g., "Dueling Set" with 8 presets vs. "Display Set" with 20
presets vs. "Full Collection" with everything):

- Each saber profile can have multiple named "card configurations"
- A dropdown or tab bar at the top of the card preset composer lets you switch between
  them
- Only one card configuration is "active" for export at a time
- This replaces the need to create separate saber profiles just to have different
  preset selections for the same physical saber

Data model addition to `SaberProfile`:

```ts
interface SaberProfile {
  // ... existing fields ...
  cardConfigs: CardConfig[];
  activeCardConfigId: string;
}

interface CardConfig {
  id: string;
  name: string;                      // e.g., "Dueling Set", "Display Set"
  entries: CardPresetEntry[];
  createdAt: string;
  updatedAt: string;
}
```

#### 3.4 Storage Budget Integration

Connect the storage budget estimation to real data:

- When the font library (Part 1) is connected, use actual font folder sizes from
  `LibraryFontEntry.totalSizeBytes` instead of generic estimates
- Show per-entry storage breakdown: "Vader font: 12.3 MB, Luke font: 8.7 MB"
- Show total with a visual bar against the selected SD card capacity
- Warn if the total exceeds available space
- Warn if approaching the flash memory limit based on style complexity (use the
  complexity tiers from the board profile: simple ~3KB, medium ~7KB, heavy ~12KB)

#### 3.5 Card Preset Templates

Allow card presets to be shared as templates:

- **Export as template**: strips personal font paths but keeps font folder names,
  exports as `.kyberstation-card.json`
- **Import template**: loads the preset list and font folder names. If font library
  is connected, attempts to match font names automatically. Unmatched fonts show as
  "font not found — assign manually"
- **Built-in starter templates**: ship a few curated card preset templates:
  - "Original Trilogy Essentials" (Luke ANH/ESB/ROTJ, Vader, Obi-Wan, Palpatine)
  - "Prequel Collection" (Anakin, Obi-Wan, Mace, Yoda, Dooku, Maul, Sidious)
  - "Dark Side Pack" (Vader, Maul, Kylo, Sidious, Ventress, Inquisitors)
  - "Dueling Minimalist" (4-6 simple presets optimized for low flash usage)

#### 3.6 Integration with CardWriter

The existing `CardWriter.tsx` should pull from the active card configuration:

- Instead of reading from `presetListStore` directly, read from the active saber
  profile's active card configuration
- The CardWriter's "Presets to Include" section becomes a read-only summary of the
  active card config (with a link to the composer to edit)
- Font folder names in the export come from `CardPresetEntry.fontName`
- The ZIP structure and SD card write flow remain the same — just the data source changes

#### 3.7 Workflow Example

The complete end-to-end workflow with all three features:

1. **Set up font library** (Part 1): Point KyberStation at `~/SaberFonts/` containing
   40 fonts from Kyberphonic, Greyscale, BK Saber Sounds, etc.

2. **Create custom presets** (Part 2):
   - Load built-in "Darth Vader" preset
   - Tweak fire intensity, change clash to orange, adjust ignition to stutter
   - Load "KSith_Vader_v2" font from library, preview together
   - Save as "My Vader (Heavy)" with font association

3. **Build card presets** (Part 3):
   - Create saber profile: "89sabers Vader ANH", Proffie V3, 16GB card
   - Create card config: "Dueling Set"
   - Add from My Presets: "My Vader (Heavy)" — font auto-fills from association
   - Add from Gallery: "Luke ROTJ" — manually assign "SmthJedi" font from library
   - Add from Gallery: "Obi-Wan ANH" — assign "Ben" font
   - Add current editor state as inline entry
   - See storage budget: 43.2 MB / 14.8 GB available
   - See flash estimate: ~28 KB style code / 300 KB available
   - Create second card config: "Display Set" with 15 presets for shelf display

4. **Export** — switch to "Dueling Set", open CardWriter, download ZIP or write to card

---

## Key Files to Modify

### Font Library
- `apps/web/lib/fontDB.ts` — add `libraryHandles` table, `LibraryFontEntry` cache,
  bump Dexie version
- `apps/web/stores/audioFontStore.ts` — add library state fields and actions
- `apps/web/components/editor/SoundFontPanel.tsx` — add library browser tab
- `packages/sound/src/FontParser.ts` — add lightweight `scanDirectoryHandle()` that
  builds manifests from `FileSystemDirectoryHandle` without decoding audio

### Custom Presets
- New file: `apps/web/stores/userPresetStore.ts` — Zustand store + IndexedDB persistence
- `apps/web/lib/fontDB.ts` (or new `presetDB.ts`) — add `userPresets` table
- `apps/web/components/editor/PresetBrowser.tsx` — add "My Presets" section, save modal
- `apps/web/stores/presetListStore.ts` — minor updates for user preset integration
- `packages/presets/src/types.ts` — NO changes needed (user presets use their own type,
  built-in presets stay canonical)

### Card Presets
- `apps/web/stores/saberProfileStore.ts` — extend `SaberProfile` with `CardConfig[]`,
  `activeCardConfigId`, new `CardPresetEntry` type with source tracking
- `apps/web/components/editor/SaberProfileManager.tsx` — add card config quick-switch
  dropdown, card preset composer with drag-to-reorder, add-from-sources actions
- `apps/web/components/editor/CardWriter.tsx` — change data source from
  `presetListStore` to active saber profile's active card configuration
- `apps/web/components/editor/StorageBudgetPanel.tsx` — integrate real font sizes from
  font library, add flash memory estimation per style complexity

### Shared
- `apps/web/lib/bladeConfigIO.ts` — add collection import/export and card template
  import/export functions

---

## Important Constraints

- **Read-only font access** — never write to or modify font files on disk
- **Lazy audio decode** — only decode when user selects a font to preview, not on scan
- **50 MB per-file limit** — already exists in FontParser, preserve it
- **Font names from filesystem are display names** — sanitize for use as identifiers
- **User presets are personal data** — stored locally in IndexedDB, never uploaded
  without explicit user action
- **Built-in presets are immutable** — user customizations create new user presets,
  they don't modify the canonical preset definitions in `packages/presets/`
- **Thumbnails should be small** — capture at ~200x40px, compress as JPEG data URL,
  cap at ~5KB each to keep IndexedDB reasonable for large collections
- **File System Access API is Chromium-only** — always provide fallback for Firefox/Safari
  using drag-drop import + IndexedDB cached font list

---

## Implementation Order

These features build on each other. Suggested phasing — each step is independently
useful, and later steps connect them together:

### Phase A: User Presets (foundation for everything else)
1. **User Preset Store + Save Flow** — the store, IndexedDB table, and save modal.
   Self-contained and immediately useful.
2. **User Preset Browser UI** — "My Presets" section in PresetBrowser with cards,
   search, filter, and CRUD actions.

### Phase B: Font Library
3. **Font Library Directory Picker + Scanner** — File System Access API integration,
   directory scanning, lightweight manifest caching.
4. **Font Library Panel UI** — library browser tab in SoundFontPanel.
5. **Preset + Font Pairing** — association field in save flow, auto-load on preset
   selection, wiring between user presets and font library.

### Phase C: Card Presets
6. **Card Preset Data Model** — extend `SaberProfile` with `CardConfig[]` and
   `CardPresetEntry` with source tracking. Migrate existing preset list data.
7. **Card Preset Composer UI** — drag-to-reorder list with add-from-sources
   (gallery, my presets, current editor, empty). Replace or augment current preset
   list display.
8. **Card Config Quick-Switch** — multiple named card configurations per saber
   profile with dropdown switcher.
9. **Storage Budget Integration** — connect real font sizes and flash estimates
   to the card preset view.
10. **CardWriter Integration** — change CardWriter to read from active card config
    instead of presetListStore.

### Phase D: Sharing & Templates
11. **Collection Import/Export** — bulk export/import of user preset collections.
12. **Card Preset Templates** — export/import card presets as shareable templates,
    built-in starter templates.
