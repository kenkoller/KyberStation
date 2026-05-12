# Sound Font Audit — 2026-05-02

Read-only audit of the sound-font surface area, run after a long stretch of Fett263-import work to confirm Ken's prior audio-engine PRs are still intact and to surface gaps worth prioritizing post-launch.

## TL;DR

The sound-font surface is in good shape. Architecture is sound — module-scope singleton, stores correctly partitioned, FSA library + drag-drop fallback both live, modern Kyberphonic category set wired through the parser and the manifest. Live preview verifies the Audio section renders cleanly, the audio engine initializes on user gesture, mute + pause both work, and there are no console or server errors.

One small inconsistency closed inline: `SoundFontPanel.tsx`'s no-FSA fallback warning copy was stale relative to `AudioColumnB.tsx`'s post-PR-#118 copy. Brought the legacy panel's warning into line with the modern one.

The biggest open gap is the unshipped **Phase A/B/C** of [`SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md`](SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md) — that's a 3-phase XL feature spec, not a regression. Several smaller items are listed below for Ken's prioritization.

## What was checked

### 1. Architecture (read-only)

| File | Role | Status |
|---|---|---|
| [`apps/web/lib/audioEngineSingleton.ts`](../apps/web/lib/audioEngineSingleton.ts) | Module-scope singleton — one `AudioContext`, one `FontPlayer`, one `SmoothSwingEngine`, one master gain. Lazy init on first user gesture. Test seams via `__setAudioContextFactoryForTesting` + `__resetAudioEngineForTesting`. | ✅ Solid. PR #176 architecture intact. |
| [`apps/web/hooks/useAudioEngine.ts`](../apps/web/hooks/useAudioEngine.ts) | Thin React surface over the singleton. Subscribes to `audioMuteStore` + `audioFontStore` for re-renders. Restores last-used font from IDB once per app lifetime. | ✅ |
| [`apps/web/stores/audioFontStore.ts`](../apps/web/stores/audioFontStore.ts) | Zustand store: active font (name + manifest + buffers + warnings) + library (handle + scanned `LibraryFontEntry[]` + scan progress). Hydrates library handle from IDB on mount. | ✅ |
| [`apps/web/components/editor/SoundFontPanel.tsx`](../apps/web/components/editor/SoundFontPanel.tsx) | Legacy panel mounted via `AudioPanel.tsx` when `useABLayout === false`. 4 sub-tabs: Sound Fonts / Library / EQ-Effects / Effect Presets. | ✅ (warning copy fixed this session) |
| [`apps/web/components/editor/audio/AudioColumnB.tsx`](../apps/web/components/editor/audio/AudioColumnB.tsx) | Modern A/B Column B mounted via `AudioAB`. 4 sub-tabs: Events / EQ-Effects / Effect Presets / Sequencer. | ✅ |
| [`packages/sound/src/types.ts`](../packages/sound/src/types.ts) | `SoundCategory` union with all 12 modern Proffie / Kyberphonic categories from PR #122 (`bgndrag` / `enddrag` / `bgnlock` / `endlock` / `bgnlb` / `endlb` / `bgnmelt` / `endmelt` / `lb` / `lowbatt` / `color` / `ccchange`). | ✅ |
| [`packages/sound/src/FontParser.ts`](../packages/sound/src/FontParser.ts) | Regex-based name → category mapping. All 12 modern categories matched. SmoothSwing pair detection. 50 MB per-file safety limit. | ✅ |

### 2. Subscription wiring (the bug-prone part)

The singleton installs five module-scope subscriptions at first init in `ensureAudioEngineInit()`:

1. `audioMuteStore.muted` → master gain value (`0` muted / `1` unmuted)
2. `uiStore.isPaused` → `ctx.suspend()` / `ctx.resume()` (PR #130)
3. `audioMixerStore` → `filterChain.setConfig()` (EQ / effects)
4. `audioPlaybackStore.swingSpeed` → `smoothSwing.update()` (PR #128)
5. `audioFontStore.fontName` → hum hot-swap + SmoothSwing pair reload (PR #128)

All five inspected. The font-change subscription correctly:
- Falls back to synthetic hum when the new font has no `hum` category.
- Restarts hum on the new buffer via `playHum` (which internally calls `stopHum` first).
- Reloads SmoothSwing low/high pairs only when both `swingl` and `swingh` are present.

### 3. Tests

```
✓ apps/web/hooks/__tests__/useAudioEngine.test.ts       (12 tests)
✓ apps/web/hooks/__tests__/useAudioEngine.swingHum.test.ts (4 tests)
✓ apps/web/lib/__tests__/audioEngineSingleton.test.ts    (6 tests)
✓ apps/web/tests/audioCategoryMap.test.ts                (5 tests)
✓ apps/web/tests/audioMuteStore.test.ts                 (21 tests)
✓ apps/web/tests/audioAB.test.tsx                        (17 tests)

Test Files  6 passed (6)
Tests      65 passed (65)
```

Workspace typecheck clean.

### 4. Live preview verification

Started dev server, skipped the wizard, navigated to the Audio section. Verified:

- **Audio section renders** — Column A (font filter input + empty-state pointer) + Column B (4 sub-tabs).
- **Sound Events sub-tab** — all 11 event play buttons render: Hum / Swing / Clash / Blast / Lockup / Drag / Melt / Ignition / Retraction / Force / Stab.
- **EQ / Effects sub-tab** — Equalizer (Bass / Mid / Treble), Effects (incl. Bitcrusher / Reverb), Master Volume.
- **Drop font folder zone** + **Set Font Library Folder** button both render (Brave + FSA flag enabled in this session).
- **Sound mute toggle** (header `Sound OFF` / `Sound ON`) flipped cleanly; AudioContext initialized on click.
- **Effect chips** (Clash / Blast / Lockup / Stab) clickable; synthetic samples played.
- **Pause toggle** flipped to `▶ Paused` cleanly; AudioContext suspended per PR #130.
- **Zero console errors. Zero server errors.**

## Findings

### Fixed inline

**1. Stale Brave warning in `SoundFontPanel.tsx` (legacy AudioPanel path)**

[`SoundFontPanel.tsx:186`](../apps/web/components/editor/SoundFontPanel.tsx) read:

> Font library browsing requires Chrome, Edge, or Arc. You can still import individual fonts via drag-and-drop in the Sound Fonts tab.

But the modern `AudioColumnB.tsx` (post-PR-#118) reads:

> Font library browsing requires the File System Access API. Supported in Chrome, Edge, Arc, and Brave (Brave users: enable `brave://flags/#file-system-access-api`). Not yet supported in Safari or Firefox.

The legacy panel still ships through `AudioPanel.tsx` when `uiStore.useABLayout === false`. Brought the legacy copy in line with the modern one in a one-line edit. Keeps Brave users who flip back to the legacy layout from seeing inconsistent guidance.

### Open gaps (Ken to prioritize)

| # | Gap | Severity | Effort | Notes |
|---|---|---|---|---|
| 1 | **Phase A/B/C of `SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md`** is unshipped. Phase A: User Preset Store (mostly done via PR #134, save state v1, but not `userPreset`'s richer schema with thumbnails / tags / descriptions). Phase B: Font Library Browser (the directory picker + scanner shipped, the per-preset font association is missing). Phase C: Card Presets (composer with drag-to-reorder + multiple card configs per saber + storage budget integration). | Feature backlog | XL (3 phases, post-launch) | Tracked in [`POST_LAUNCH_BACKLOG.md`](POST_LAUNCH_BACKLOG.md) row "Sound Font Library + Custom Presets + Card Presets". |
| 2 | **Modern category playback is detected, not played.** PR #122 surfaces all 12 modern categories in the manifest, but `CATEGORY_MAP` in `audioEngineSingleton.ts:162-174` only maps the 11 classic events (`ignition` / `retraction` / `hum` / `clash` / `blast` / `swing` / `lockup` / `stab` / `drag` / `melt` / `force`). The new `bgnlock` / `endlock` / `bgnlb` / `endlb` / `bgnmelt` / `endmelt` / `bgndrag` / `enddrag` are not yet wired into BladeEngine state-change dispatch. | Coverage gap | M | Per the comment in `types.ts:21-23`: "playback wiring into BladeEngine state changes is deferred to v0.16+." Tracked. |
| 3 | **Surprise-me sound font.** Ken field-note #17 from the 2026-04-30 launch session — `Surprise Me` randomizer doesn't pick a sound font from the library to pair with the random preset. Status flagged "post-launch per Ken." | UX gap | S | The library is in `audioFontStore.libraryFonts`; the randomizer can pick one with weighted-by-completeness sampling. |
| 4 | **No `userPreset.fontAssociation` round-trip.** `UserPreset` schema in `userPresetStore` exists, but `saveStateV1` doesn't capture which font was loaded at save time. When you load a saved preset later, the previously-paired font isn't auto-reloaded. | Polish gap | S-M | Wire-up: snapshot `audioFontStore.fontName` on save → on load, if a library font with that name exists, fire `loadFontFromDirectoryHandle`. |
| 5 | **`SoundFontPanel.tsx` is dual-rendered code in 2026-05.** The modern AudioColumnB owns the active path on desktop+tablet (Sidebar A/B v2). The legacy `SoundFontPanel.tsx` is reachable only when `useABLayout === false` is forced — which the user can do via persisted layout state but isn't a default. Worth deciding: keep legacy as a fallback or retire it once `useABLayout` defaults are confirmed across mobile + desktop. | Hygiene | S (audit) / M (delete) | If retired, also drops `AudioPanel.tsx` and the `SoundFontPanel` import in `MainContent.tsx` switch. |
| 6 | **No `pstoff` mapping.** The `CATEGORY_MAP` comment notes that `pstoff` ("post-off") is the optional retraction follow-up clip ProffieOS plays after `in.wav`. Currently the singleton's `playRetraction` only plays `in.wav`. If a font ships `pstoff`, it's collected by `FontParser` but never played. | Polish gap | S | Schedule `pstoff` playback via `setTimeout(playOneShot, inDuration)` in `playRetraction` if the buffer exists. |
| 7 | **No Library handle revocation flow.** If the user denies permission on `hydrateLibrary` (or the OS revokes the handle), `useAudioFontStore.libraryHandle` stays set in the in-memory store but reads fail. The store handles this silently in `hydrateLibrary` (returns early), but a stale handle persists in IDB. | Polish gap | S | Catch the revocation path and call `clearLibraryHandle` so the user gets prompted to re-pick on next visit. |

### Confirmed working

- **Audio singleton** ([PR #176](https://github.com/kenkoller/KyberStation/pull/176)): one AudioContext, six consumers share it. No per-origin cap hits.
- **Brave FSA flag warning** ([PR #118](https://github.com/kenkoller/KyberStation/pull/118)): live in `AudioColumnB.tsx`. Now also live in `SoundFontPanel.tsx` (this session).
- **Modern Proffie / Kyberphonic categories** ([PR #122](https://github.com/kenkoller/KyberStation/pull/122)): all 12 wired through `SoundCategory` union and `FontParser` regex matchers.
- **Pause → AudioContext suspend** ([PR #130](https://github.com/kenkoller/KyberStation/pull/130)): live, verified in preview (`▶ Paused` flips on click; engine subscription installs once per singleton).
- **Mute → master gain** ([PR #124](https://github.com/kenkoller/KyberStation/pull/124)): live, shared store.
- **SmoothSwing speed broadcast + hum hot-swap** ([PR #128](https://github.com/kenkoller/KyberStation/pull/128)): subscriptions installed in singleton init, fire on store flip without re-rendering React.
- **ProffieOS in/out convention** ([PR #127](https://github.com/kenkoller/KyberStation/pull/127)): `out.wav` plays during ignition, `in.wav` during retraction. Confirmed in `audioEngineSingleton.ts:163-164`.
- **Directory iterator yields tuples** ([PR #115](https://github.com/kenkoller/KyberStation/pull/115)): scan/load handle iterator handles the ES `for await … of dirHandle` shape correctly.

## Suggested next steps

1. **Decide on the legacy `SoundFontPanel.tsx` retirement window.** If `useABLayout` is the durable default, the legacy panel can be deleted alongside `AudioPanel.tsx` and the `MainContent.tsx` switch case. ~200 LOC reduction.
2. **Wire `userPreset.fontAssociation` round-trip** (gap #4 above). Smallest gap that meaningfully closes the v1 save-state loop. S-M effort.
3. **Schedule `pstoff` playback** (gap #6 above). One-line addition to `playRetraction`. S effort.
4. **Phase A spec items beyond v1 save state** — thumbnails / tags / descriptions on `UserPreset`. The current shape works; the spec's richer schema is post-launch.

None of these are launch blockers. The audio surface is field-ready as-is.

---

*Audit run on 2026-05-02 from `claude/loving-tu-e431f1` worktree. Live preview verified at `localhost:61967` against `main` tip `39e5732`. 65 audio-related tests passing, workspace typecheck clean.*
