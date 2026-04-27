# Engine package — build scripts

Standalone CLI utilities that consume the engine + headless renderer to
produce static artifacts checked into / served by the web app.

## `generate-picker-gifs.mjs`

Saber GIF Sprint 2 — generates 32 small animated GIF thumbnails (19
ignition + 13 retraction variants) at
`apps/web/public/picker-gifs/{ignition,retraction}/<id>.gif`. The
editor's `MiniGalleryPicker` swaps the static SVG for the GIF on hover
when `gifPath` is wired into the catalog entry.

### Run

```bash
pnpm --filter @kyberstation/engine gif:pickers
```

Filter to one variant kind:

```bash
pnpm --filter @kyberstation/engine gif:pickers -- --variant=ignition
pnpm --filter @kyberstation/engine gif:pickers -- --variant=retraction
```

Filter to a single id (or comma-separated ids):

```bash
pnpm --filter @kyberstation/engine gif:pickers -- --only=spark
pnpm --filter @kyberstation/engine gif:pickers -- --only=spark,glitch,fracture
```

### When to regenerate

- A new ignition or retraction style is added to
  `apps/web/lib/transitionCatalogs.ts` (and its corresponding entry in
  `packages/engine/src/ignition/index.ts`).
- A style's frame timing was tuned and the thumbnail visual no longer
  matches the live editor's behaviour.
- The capsule rasterizer or bloom pipeline in
  `apps/web/lib/sharePack/bladeRenderHeadless.ts` was retuned and the
  thumbnail's visual identity should track the workbench preview.

### Output

- 80×40 px, 16 fps, ~1.1 s clips per variant
- Target size: <50 KB per file (matches the `MiniGalleryPicker`
  thumbnail aspect; ~6 bits/px after gifenc 64-color quantization)
- ~1 MB total disk delta for a full regen (32 files)

### Dependencies (devDependencies in `packages/engine/package.json`)

- `@napi-rs/canvas` — node-native HTML5 canvas polyfill. The live
  editor's `gifEncoder.ts` uses `gif.js` + a real Web Worker; in Node
  there's no `Worker` global, so we substitute the canvas at the
  rendering layer and use a different encoder for the GIF byte stream.
- `gifenc` — pure-JS GIF89a encoder. Tiny, ESM, no DOM. Different code
  path from runtime `gif.js`; both produce valid GIF89a, just from
  different sides of the browser/server boundary.
- `tsx` — runs the engine + renderer source TS directly without a
  pre-build step.

### Why a separate encoder vs runtime `gif.js`

`gif.js` ships a Web Worker entry point — its core encoder is browser-
only. In Node it tries to construct `new Worker(...)` against a non-
existent global. Rather than monkey-patching that env at build time,
this script uses `gifenc` (pure JS, no DOM, no workers). The browser-
side `gifEncoder.ts` Promise wrapper that Sprint 1 shipped is unchanged
— runtime in-app GIF saves still go through gif.js + a real Worker.

If `gif.js` ever ships a node-friendly entry, this script's encoder can
be migrated for parity with the runtime path.

### Coordinating with the catalog augmentation

`apps/web/lib/transitionCatalogs.ts` carries an optional `pickerGifPath`
field on each catalog entry. When it points at a real file under
`/picker-gifs/...`, the picker UI uses it. When it's undefined or the
file doesn't exist, the picker falls back to the static SVG thumbnail.
That keeps the catalog usable on environments where the GIFs haven't
been generated yet (e.g. fresh clone, CI without the script run).

### Output layout

```
apps/web/public/picker-gifs/
├── ignition/
│   ├── standard.gif
│   ├── scroll.gif
│   ├── spark.gif
│   ├── ... (16 more)
│   └── custom-curve.gif
└── retraction/
    ├── standard.gif
    ├── scroll.gif
    ├── ... (10 more)
    └── custom-curve.gif
```
