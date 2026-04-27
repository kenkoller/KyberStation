# Saber GIF Roadmap

**Status:** Queued — gated on the workbench blade render tuning, which is now done (2026-04-24).
**Scope owner:** New session, fresh context. Self-contained handoff prompt at the bottom of this doc.
**Suggested PR strategy:** New PR distinct from the static Saber Card PR (#36). Different scope, different review surface, cleaner revert.

---

## Why GIFs

Static Saber Cards are a great share artifact, but a saber's identity is in its motion: how it ignites, how it shimmers at idle, how it retracts. A GIF turns the share artifact into a 1-3 second "moment" — most people will recognize a saber by its hum-loop before they recognize it by colour. Plus: the editor has 19 ignition styles and 13 retraction styles. Users currently pick them blind. Per-variant GIF previews fix that — pickers become visual.

---

## Inventory — what we want to ship

### Tier 1 — core sharing artifacts (build first)

| GIF | Spec | Use case |
|---|---|---|
| **Idle hum loop** | 0.5-1s seamless loop, blade in `BladeState.ON`, subtle shimmer per workbench bloom + ±3% jitter | Default Saber Card variant. Replaces / complements the static PNG. |
| **Ignition cycle** | ~2-3s: PREON → IGNITING → ON (hold) → RETRACTING → OFF | Full story arc. Cinematic. |
| **Clash** | ~400ms: ON-idle → clash flash → return to idle | High-energy share moment. |

### Tier 2 — showcase / marketing

| GIF | Spec | Use case |
|---|---|---|
| **Style grid** | Single blade cycles through all 29 styles (~2-3s per style, 1-1.5min total) | Landing page, `/features` showcase. |
| **Colour cycle** | Same style, cycles through ~12 canonical colours | Same surfaces. |
| **Lockup** | 1-2s loop of held lockup flicker | Effect-system demo. |

### Tier 3 — effect-specific + deep cuts

| GIF | Spec | Use case |
|---|---|---|
| Blast deflect | ~600ms with positional flash | Effect demo. |
| Stab tip flash | ~500ms with thrust | Effect demo. |
| Swing response | ~2s with simulated swing-speed shimmer | Motion demo. |
| First-ignition ceremony | ~3-4s with the "unboxing" feel | New-saber ritual. |
| State grid montage | All 9 saber states (OFF → PREON → IGNITING → ON → CLASH → BLAST → LOCKUP → RETRACTING → OFF) | Education. |

### Per-variant animation showcases (the picker upgrade)

This is the MOST scoped + MOST valuable work for the editor:

| Surface | GIF set |
|---|---|
| **Ignition picker** | 19 GIFs — one per ignition style, all on the same blade config (Obi-Wan azure, default thickness). Thumbnail = the GIF. Hover = full-size preview. |
| **Retraction picker** | 13 GIFs — same shape, retraction styles. |
| **Style picker** | 29 GIFs — already have 52 static SVG thumbnails (per CLAUDE.md OV9). GIFs would be a polish-pass upgrade. |

**Sequencing:** Ignition variants first (most user-visible — they pick one for every saber). Retractions next. Style picker is last because it has decent static thumbs already.

### Non-blade GIFs

| GIF | Source |
|---|---|
| **Hilt switch-press** | Hilt SVG with the activation switch pressed — small UI flourish. |
| **Hilt rotation** | Hilt SVG rotating slowly to showcase profile. Marketing only. |
| **UI walkthrough — gallery filter** | Screen recording of the gallery filter chip flow. |
| **UI walkthrough — wizard** | Screen recording of the 4-step Saber Wizard. |
| **UI walkthrough — code export** | Screen recording of the config.h → ZIP export flow. |
| **State machine diagram** | Animated boxes-and-arrows showing the 9-state engine flow. Pure illustration. |

**These ship independent of the blade renderer** — different pipeline, no engine capture needed. UI walkthroughs use ScreenStudio / OBS / similar (manual capture). Hilt-only GIFs use SVG animation or canvas paths.

---

## Technical approach

### Capture pipeline

The Wave 2 saber-card work (PR #36) already extracted the workbench blade renderer to a headless function (`drawBlade.ts`'s new pipeline). For static, it does:

1. Instantiate `BladeEngine`
2. `engine.captureStateFrame(BladeState.ON, config)` → single LED buffer
3. Render LED buffer + bloom passes to canvas
4. Output PNG

For animation, we extend that to multi-frame:

1. Instantiate `BladeEngine` once
2. For each frame in the loop (e.g. 30 frames at 30fps for 1s):
   - Tick engine forward (`engine.update(deltaMs, config)` with deltaMs = 1000/fps)
   - Force the state we want at this frame (PREON / IGNITING / ON / RETRACTING / OFF)
   - Capture LED buffer (`engine.getPixels()`)
   - Headless-render to a canvas
   - Push canvas into the GIF encoder
3. Encoder finalizes → returns Blob

### New helper to add

`packages/engine/src/captureSequence.ts` (or co-located in BladeEngine.ts):

```ts
captureSequence(opts: {
  state: BladeState | 'ignition-cycle' | 'idle-loop' | 'clash' | ...
  config: BladeConfig
  fps: number          // default 30
  durationMs: number   // total clip length
  effectAtMs?: number  // for effect-aware sequences (clash at frame N)
}): Uint8Array[]       // array of LED buffers, one per frame
```

For seamless looping (idle hum, lockup): the helper picks a starting time-anchor where the shimmer pattern repeats cleanly (or fades the last few frames into the first via crossfade).

### GIF encoder

**Recommendation:** [`gif.js`](https://github.com/jnordberg/gif.js)

- Web Worker-based (won't block main thread during encoding)
- Mature, ~100KB minified
- Quality settings: `quality: 1` is best, `quality: 10` is fastest
- Handles palette quantization automatically
- Output: Blob in browser, Buffer in Node

Alternatives considered:
- `modern-gif` — newer, smaller, but less battle-tested
- `gifshot` — too opinionated, less control
- Server-side: `gif-encoder-2` — only useful for `/share/[glyph]` route OG image generation (different sprint)

### File output sizes — rough estimates

For 1200×630 OG-friendly cards:

| GIF | Frames @ 30fps | Estimated size |
|---|---|---|
| Idle hum loop (1s) | 30 | 800KB-1.5MB |
| Ignition cycle (3s) | 90 | 2.5-4MB |
| Clash (0.4s) | 12 | 400-700KB |
| Style grid (60s) | 1800 | 30-50MB ❌ — too big for GIF, use MP4/WebM instead |

**Format strategy:**
- Tier 1 (sharing) → GIF (universal preview support)
- Tier 2 (long montages) → MP4 / WebM (~2MB, autoplay-friendly on landing page)
- Per-variant pickers → GIF (small, 3-400KB each, browser preview just works)

### Where in the file tree

- **Engine helper:** `packages/engine/src/captureSequence.ts`
- **GIF encoding:** `apps/web/lib/sharePack/gifEncoder.ts` (new)
- **Card flow:** extend `apps/web/lib/sharePack/cardSnapshot.ts` with `renderCardGif(options)` alongside `renderCardSnapshot`
- **Variant assets:** `apps/web/public/animations/ignitions/<id>.gif`, `apps/web/public/animations/retractions/<id>.gif` — generated once via build script, served as static
- **Build script:** `scripts/generate-variant-gifs.mjs` — node CLI that loads engine + headless canvas (`canvas` npm package) + gif encoder, generates all 32 picker GIFs at build time

---

## Sequencing recommendation

**Sprint 1 (MVP):** Engine helper + GIF encoder + idle hum + ignition cycle. Land as a new PR, ~1-2 days work. Adds the "Save share GIF" button next to "Save share card" in CrystalPanel. New CardLayout variants for GIF dimensions.

**Sprint 2 (variant pickers):** Build script to generate all 19 ignition + 13 retraction GIFs. Wire into `MiniGalleryPicker` so the thumbnails animate. ~1 day.

**Sprint 3 (showcase):** Tier 2 marketing GIFs. ~1 day.

**Sprint 4 (deep cuts):** Tier 3, hilt-only, UI walkthroughs. As-needed.

---

## Hard constraints

- **Use the post-tuning blade renderer.** Don't snapshot the pre-tuning visualization. Workbench updates landed 2026-04-24.
- **Do not break PR #36.** The static `renderCardSnapshot` keeps working untouched. The new `renderCardGif` is additive.
- **Engine package stays headless.** No DOM, no `window`, no `requestAnimationFrame`. The new `captureSequence` is pure data.
- **GIF file sizes < 5MB for sharing artifacts.** Beyond that, ship MP4/WebM and document the tradeoff.
- **Worker-encoded GIFs.** No main-thread blocking during encode.
- **Reduced-motion preference applies to AUTOPLAY surfaces.** Per-variant picker GIFs autoplay-on-hover unless `prefers-reduced-motion: reduce` (then show the first frame as a static).

---

## Handoff prompt — paste into a fresh Claude Code session

```
Build the Saber GIF Sprint 1 deliverables: a `captureSequence` engine helper,
a `gif.js`-based encoder, and the first two GIF variants (idle hum loop +
ignition cycle).

Read these first (in order):
1. docs/SABER_GIF_ROADMAP.md — full sprint scope (this file)
2. CLAUDE.md — project context
3. apps/web/lib/sharePack/card/drawBlade.ts — the current headless blade
   renderer used by the static Saber Card. Reuse this pipeline frame-by-
   frame.
4. packages/engine/src/BladeEngine.ts — engine API. captureStateFrame is
   the single-frame analog; you're building captureSequence on the same
   pattern.
5. apps/web/lib/sharePack/cardSnapshot.ts — orchestrator. Add
   renderCardGif as a sibling of renderCardSnapshot.
6. apps/web/components/editor/CrystalPanel.tsx — adds the
   "Save share GIF" button.

Scope (Sprint 1 only):
- packages/engine/src/captureSequence.ts — new file. Pure-data helper
  returning Uint8Array[] of LED buffers across N frames. Modes: 'idle-loop'
  and 'ignition-cycle' for now.
- apps/web/lib/sharePack/gifEncoder.ts — new file. Wraps gif.js in a
  Promise-based API. Add gif.js to package.json. Worker URL needs to be
  served from /public — handle the Next.js asset path.
- apps/web/lib/sharePack/cardSnapshot.ts — add renderCardGif(options,
  variant) that loops captureSequence frames through the existing
  drawBlade pipeline (per frame, not just once) and stuffs each canvas
  into the GIF encoder. Output: PNG blob fallback if no GIF support.
- apps/web/components/editor/CrystalPanel.tsx — add "Save share GIF"
  button next to "Save share card". Variant dropdown: 'Idle' / 'Ignition
  cycle'. Filename: kyberstation-card-<variant>-<preset>-<timestamp>.gif.
- Tests: round-trip captureSequence (deterministic seed → identical
  buffers), renderCardGif produces a Blob of type image/gif with > 0
  bytes.

Hard constraints:
- Do NOT modify packages/engine/src/modulation/* (locked types,
  modulation session).
- Do NOT modify apps/web/components/editor/routing/* or the modulation
  routing/board picker files.
- Do NOT modify apps/web/lib/sharePack/card/* — those are PR #36 turf.
  Add new files alongside instead.
- Use the blade renderer AS-IS from PR #36 (workbench-pipeline port). The
  visual quality is now correct — don't re-tune it.
- Engine package stays headless. No DOM in captureSequence.
- New PR off origin/main, NOT against PR #36's branch. Branch name:
  feat/saber-gif-sprint-1.

Verification:
- pnpm typecheck clean
- pnpm test green (existing tests + new tests for captureSequence +
  gifEncoder + renderCardGif)
- Browser smoke: navigate to /editor → My Crystal panel → click "Save
  share GIF" with variant 'Idle' → downloads a < 2MB GIF that loops
  cleanly. Same with variant 'Ignition cycle' → < 5MB GIF.

Deferred to later sprints (don't build):
- Sprint 2: per-variant ignition / retraction picker GIFs (build script
  + MiniGalleryPicker wiring)
- Sprint 3: Tier 2 showcase GIFs (style grid, colour cycle)
- Sprint 4: Tier 3 effect-specific + non-blade GIFs

Ship target: a single PR with the engine helper + encoder + 2 GIF
variants. Discord/Twitter-shareable. Deferred items get their own PRs.

End of brief.
```
