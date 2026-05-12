# Launch Performance Audit — 2026-04-19

Branch: `test/launch-readiness-2026-04-18`.
Scope: production bundle sizes, runtime perf hotspots, image/font strategy,
render-blocking assets. Runtime profiling NOT performed (dev server in use
by another task). All findings are from a cold production build +
static code review.

---

## Executive summary

`/editor` **First Load JS = 665 KB** (445 KB route + 87.6 KB shared).
That is heavy for a content-rich SPA but not alarming — Three.js is
already code-split out of the initial load, Next `next/font` is
self-hosting with CLS protection, and there are no obvious
render-blocking scripts.

The biggest measurable risk is **runtime jank on the editor canvas**,
not bundle size: `BladeCanvas.tsx` allocates a fresh `<canvas>`
**every frame** during diffusion blur, triggering GC churn, and
iterates the LED array up to 8× per frame for photoreal rendering. On
LED counts above 144 this will quietly cap frame rate on older MacBooks
/ Chromebooks.

Top concerns by severity:

| P | Concern | File |
|---|---------|------|
| **P0** | `tempCanvas` allocated every frame in diffusion blur path | `BladeCanvas.tsx:962` |
| **P1** | `/editor` First Load JS = 665 KB (445 KB route code alone) | build output |
| **P1** | `icon-1024.png` = **672 KB** shipped in `/public/` but not referenced by manifest/layout (dead weight or mis-wired) | `apps/web/public/icon-1024.png` |
| **P1** | BladeCanvas photoreal path walks LED array 6–8× per frame + 14-pass bloom loop | `BladeCanvas.tsx:837–1066` |
| **P2** | `useBladeEngine` RAF loop calls `useBladeStore.getState().config` every frame (no memoization needed, but triggers state mirror on every frame) | `useBladeEngine.ts:41–70` |
| **P2** | `CrystalPanel` mounts Three.js on *any* editor open if the panel is in the persisted layout — no lazy mount | `TabColumnContent.tsx:45`, `CrystalPanel.tsx` |

No P0-bundle-size issues. Three.js tree-shakes correctly; `msgpackr`,
`bs58`, `qrcode` appear bundled only where used (crystal/share chunks).
`pako` shows up in one mid-size chunk (455, 180 KB) which is
reasonable given the `pako`-backed glyph encoder is always-on.

ESLint is disabled during the build (`ESLint must be installed in
order to run during builds`). This is the pre-existing decision from
`docs/SESSION_2026-04-17_C.md` — out of scope for this audit.

---

## 1. Production build — parsed output

```
Route (app)                              Size     First Load JS
┌ ○ /                                    1.39 kB         120 kB
├ ○ /_not-found                          873 B          88.4 kB
├ ○ /docs                                21 kB           125 kB
├ ○ /docs/design-system                  5.12 kB        92.7 kB
├ ○ /editor                              445 kB          665 kB
├ ○ /gallery                             138 B          87.7 kB
├ ○ /m                                   1.98 kB         213 kB
└ ○ /s                                   509 B          88.1 kB
+ First Load JS shared by all            87.6 kB
  ├ chunks/1dd3208c-84a7b41489a607d2.js  53.6 kB     (React runtime)
  └ chunks/528-c244c11a046151b9.js       31.8 kB     (app shell chunk)
```

### Largest on-disk chunks (unminified / pre-gzip)

| Chunk (disk) | Size | Identified content |
|---|---|---|
| `63d2ba32-…` | 372 KB | @react-three/drei helpers + PMREM / postprocessing |
| `9d78c252-…` | 352 KB | `three` core (ships `REVISION` string) |
| `839-…` | 248 KB | Editor-only libs (preset authoring, codegen helpers) |
| `455-…` | 180 KB | **`pako` inflate/deflate** — always loaded (glyph encoder) |
| `1dd3208c-…` | 172 KB | React DOM |
| `929-…` | 128 KB | Editor utilities (contains BufferGeometry string refs — Three.js types, not runtime) |
| `editor/page-5afc0d418cc113b8.js` | **748 KB** | Editor-only page bundle (all statically-imported panels) |

**Three.js placement is correct.** `9d78c252` + `63d2ba32` (724 KB
combined) only load when `<BladeCanvas3D>`, `<CrystalPanel>`, or
`<FullscreenPreview>`'s reveal scene actually mount. Confirmed by
dynamic-import pattern (see §2).

**`pako` lives in the always-loaded 455 chunk.** The glyph
encoder (`apps/web/lib/sharePack/kyberGlyph.ts`) runs during share-URL
handling on `/editor` page hydration, so this is load-bearing. Still,
`pako` tree-shaking options (replace with `fflate`, or use
`CompressionStream` where available) would save ~40 KB on modern
browsers.

---

## 2. Three.js / Crystal chunk analysis

**Finding: three.js is code-split correctly — but with a sharp edge.**

Dynamic imports confirmed at:

- `apps/web/components/editor/CrystalPanel.tsx:18` — `KyberCrystal`
- `apps/web/components/editor/BladeCanvas3DWrapper.tsx:9` —
  `BladeCanvas3D` (via `.BladeCanvas3DInner`)
- `apps/web/components/editor/FullscreenPreview.tsx:13` —
  `CrystalRevealScene`

All three use `dynamic(() => import(…), { ssr: false })`, so three.js
stays out of the main bundle. ✓

**But `CrystalPanel` is statically imported by `TabColumnContent`**
(line 45):

```
import { CrystalPanel } from '@/components/editor/CrystalPanel';
```

The `dynamic` wrapper inside `CrystalPanel` defers the *three.js
payload*, not the panel component itself. As soon as `TabColumnContent`
mounts — which it does on every `/editor` visit — `CrystalPanel`
module-level code evaluates. Today that module only imports
`encodeGlyphFromConfig` + crystal types, so the static cost is small.
But any additional static imports pulled in via `CrystalPanel` will
leak into the editor page bundle.

**Recommendation:** make `CrystalPanel` itself lazy at the render-panel
site:

```tsx
// TabColumnContent.tsx
const CrystalPanel = dynamic(() => import('@/components/editor/CrystalPanel').then(m => m.CrystalPanel), {
  ssr: false,
  loading: () => <CrystalLoadingShell />,
});
```

Same treatment for any panel that might grow into Three.js or heavy
library territory (OLED editor, Code Output already OK).

---

## 3. Runtime hotspot review

### 3.1 `useBladeEngine.ts` — RAF-driven engine tick (P2)

File: `apps/web/hooks/useBladeEngine.ts:41–70`

The engine's tick loop runs on RAF regardless of whether BladeCanvas
is visible (intentional fix for view-switching — commented). On each
frame:

- Calls `useBladeStore.getState().config` — **fine** (synchronous,
  no subscribe).
- Calls `useUIStore.getState().animationPaused` — fine.
- `engine.update(delta, config)` — engine work. Expected.
- Compares `engine.state !== currentState` and writes back. Good —
  no dead-write on every frame.

No re-render triggers, no allocation. **Clean.** Only concern: every
frame pays the cost of three Zustand `getState()` calls (~50 ns each
× ~60 fps = negligible). No fix needed.

### 3.2 `BladeCanvas.tsx` — the main hotspot (P0 + P1)

File: `apps/web/components/editor/BladeCanvas.tsx` (2,655 lines)

**P0 — `tempCanvas` allocated per frame, line 962:**

```tsx
if (diffusion.blurKernel > 0) {
  offCtx.save();
  offCtx.filter = `blur(${diffusion.blurKernel * scale}px)`;
  const tempCanvas = document.createElement('canvas');  // ← every frame
  tempCanvas.width = cw;
  tempCanvas.height = ch;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.drawImage(offscreen, 0, 0);
  offCtx.clearRect(0, 0, cw, ch);
  offCtx.drawImage(tempCanvas, 0, 0);
  offCtx.restore();
}
```

At 60 fps that's ~60 `<canvas>` + 2D context allocations per second,
all garbage-collected. Reuse a `diffusionTempRef` ref (same pattern as
the existing `offscreenRef` at line 505) and resize on sizeRef change
only. Expected impact: fewer GC pauses, smoother 60 fps hold on
diffusion modes.

**P1 — per-LED inner loops (line 837–1066):**

The photoreal path walks the LED array 6 times per frame:

- line 837: average colour + farthest-lit scan
- line 862 / 875: draw LEDs to offscreen (in-hilt vs neopixel branch)
- line 988: 14-pass bloom draw loop (passCount × draws of offscreen)
- line 1011: blade body vertical gradient
- line 1066: specular / rim pass

For `ledCount = 144` that's ~864 iterations + 14 full-canvas draw
calls. On retina at 1440px canvas × DPR 2 that's ~2880 px-wide
buffers blitted 14× per frame. Meaningful on slow GPUs.

Recommendations (ordered by risk):

1. **Skip-pass when blade is off or `extendProgress === 0`** — fast
   exit at line 826 already handles `visibleLen <= 0`; extend it to
   skip bloom when `activeCount === 0`.
2. **Collapse the avg-colour + max-lit scan with the draw loop** —
   both walk the same LED array; combine into one pass.
3. **Cap bloom passes at `passCount = 6` on the `low` performance
   tier** — wire through `usePerformanceTier`.

**P1 — pixel-view / cross-section inner loops at 100, 1200, 1500
line range:** similar shape, multiple walks per frame. Same remedies
as above.

### 3.3 `VisualizationStack.tsx` (P2 — reasonable)

File: `apps/web/components/editor/VisualizationStack.tsx` (696 lines)

Each visible layer gets its own `<LayerCanvas>` with its own RAF.
`useAnimationFrame` respects `isPaused` and `reducedMotion` (line
617–620). Each render function walks the LED array once (line 168,
186, 209, 260, 287, 321). With 13 possible layers × 144 LEDs × 60 fps
= ~112k per-LED ops/sec — fine on any modern CPU.

**Minor concern:** every render function allocates a fresh `values[]`
array (line 168, 186, 209, 260, 287). For 13 layers × 60 fps this is
780 allocations/sec of `number[]` sized 144. Use a module-level
scratch buffer or `Float32Array`. Low impact; nice-to-have.

### 3.4 `LayerStack.tsx` — thumbnail stagger (P2, working correctly)

File: `apps/web/components/editor/LayerStack.tsx:732`

```tsx
const shouldStagger = totalRows >= HIGH_DENSITY_THRESHOLD;
const staggerTurn = shouldStagger ? rowIndex % Math.max(1, totalRows) : undefined;
const staggerTotal = shouldStagger ? totalRows : undefined;
```

The stagger activates at `HIGH_DENSITY_THRESHOLD` rows — each thumbnail
only paints when `frameCount % total === turn` (verified at
`LayerThumbnail.tsx:109`). Math checks out: under the threshold
every row paints every frame, over it, total cost per frame is ~1 row
× `THUMBNAIL_WIDTH` pixels of style evaluation.

**Minor issue at line 702:** `layerIndex` is derived via
`findIndex` **inside a Zustand selector** — recomputed on every
`layers` change. For a 20-row stack this is `O(n)` per row per
re-render = O(n²). Not catastrophic, but for large stacks in the
future, switch to selecting the full `layers` array once in the
parent and passing `layerIndex` as a prop.

Also: each `LayerRow` subscribes to **11 separate Zustand selectors**
(lines 700–719). Each re-runs when any listed slice changes. Consider
one selector that returns `{ layer, canMoveUp, canMoveDown, renderState }`
via `useShallow`.

### 3.5 `animations.ts` (crystal) — clean (no concerns)

File: `apps/web/lib/crystal/animations.ts`

Pure tick-based controller, no DOM, no Zustand, no allocations per
frame beyond a `finished: AnimationTrigger[]` array when a trigger
expires (rare). Idiomatic and well-bounded. No changes needed.

---

## 4. Image + font strategy

### 4.1 Fonts — well done

`apps/web/app/layout.tsx:9–19` uses `next/font/google` with
`display: 'swap'` and CSS-variable output:

```tsx
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-jetbrains-mono' });
```

Self-hosting + subset-latin + CLS-safe variable binding. ✓

**Missing:** the `CLAUDE.md` update from 2026-04-18 says Orbitron
was ratified as the third ceremonial face per UX §5/§6/§8. Not
loaded in `layout.tsx`. Either the spec doc is ahead of the code,
or Orbitron is loaded elsewhere (e.g. injected per-page). Worth
verifying — if Orbitron isn't wired yet, adding it here follows the
same pattern and CLS-safely self-hosts.

### 4.2 Images — one outlier

`apps/web/public/` contents:

| File | Size |
|------|------|
| `icon-1024.png` | **672 KB** |
| `icons/` | empty |
| `manifest.json` | 720 B |
| `sw.js` | 5.5 KB |
| `firmware/README.md` | 1.6 KB (stub) |

**`icon-1024.png` is 672 KB and not referenced by `manifest.json`
or `layout.tsx`.** The manifest likely points to
`apps/web/app/icon.svg` (file-based Next convention, cited in
`layout.tsx:27`), so this PNG is either dead weight or a Prior
Art asset.

Recommendation: verify reference via `grep`, then either remove
from public or convert to an optimized set (sizes 192 / 512 via
`next/image` source files, ~30 KB total). At 672 KB it would
sabotage anyone who accidentally routes to it.

### 4.3 `layout.tsx` render-blocking audit — clean

Inspected `apps/web/app/layout.tsx:1–65`:

- Fonts via `next/font` (non-blocking, font-display swap) ✓
- CSP meta tag applied in production only, doesn't block render ✓
- No `<link rel="stylesheet">` to external CSS ✓
- `<MobileTabBar />` is the only child besides `{children}` — small
  client component, renders below the fold on mobile ✓
- Skip-to-main link is `sr-only` ✓

No render-blocking imports. LCP will be gated by route-level work
(editor page hydration + first blade-canvas paint), not by the root
layout.

---

## 5. Quick wins (<1 hour each)

Ordered by impact-to-effort ratio.

1. **Fix per-frame canvas allocation in `BladeCanvas.tsx:962`.**
   Add a `diffusionTempRef` mirror of the existing `offscreenRef`
   pattern (line 505). **~10 min, removes 60 alloc/s GC churn.**

2. **Lazy-mount `CrystalPanel`** via `dynamic()` at
   `TabColumnContent.tsx:45`. **~15 min, shrinks editor page
   bundle by whatever module-level code the CrystalPanel file
   transitively pulls in, and by the `encodeGlyphFromConfig`
   call site.**

3. **Delete or optimize `public/icon-1024.png`.** Confirm no refs
   then remove (or swap in a 60 KB 512px WebP). **~10 min,
   saves 672 KB from anyone who loads the raw path.**

4. **Collapse `LayerRow` Zustand selectors** (`LayerStack.tsx:700–719`)
   into one `useShallow`-wrapped selector. **~20 min, reduces
   re-render count when the layers array changes.**

5. **Guard the 14-pass bloom loop with `activeCount === 0` early
   return** (`BladeCanvas.tsx:988`). **~5 min, saves ~50% frame
   budget when blade is off.**

6. **Cap `passCount` by performance tier.** Wire
   `usePerformanceTier` into BladeCanvas, use `passCount = tier ===
   'low' ? 6 : 14`. **~30 min, major frame-budget relief on
   low-end hardware.**

---

## 6. Out of scope / deferred

- **ESLint re-enablement** — build explicitly disables; owned by the
  future lint-enforcement sprint per `docs/SESSION_2026-04-17_C.md`.
- **pako → fflate or CompressionStream migration** — would save
  ~40 KB on modern browsers but touches the glyph encoder's
  binding-stability contract; do in a dedicated follow-up with
  regression coverage.
- **Runtime FPS / memory profiling** — blocked on dev-server
  availability. Recommend spinning up Lighthouse + Chrome DevTools
  Performance panel in a dedicated session once the #1 (alloc) fix
  is in; the perf tier system (`usePerformanceTier`) is ready to
  receive the thresholds.
- **Full memory-leak audit on WebUSB `DfuDevice` disconnect paths**
  — code-review-only, not part of this audit's brief.
