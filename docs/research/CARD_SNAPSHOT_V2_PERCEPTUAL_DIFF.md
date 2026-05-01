# Card Snapshot v2 — Perceptual Diff Feasibility Research

**Date:** 2026-04-30
**Author:** Claude (research-only sweep, see prompt)
**Status:** Negative result — see Recommendation below.
**Sibling artifact:** [`apps/web/tests/cardSnapshotGoldenHash/__research__/pixelmatch-prototype.ts`](../../apps/web/tests/cardSnapshotGoldenHash/__research__/pixelmatch-prototype.ts)

## Problem Statement

The card-snapshot pipeline (`renderCardSnapshot` + 7 region drawers + 5 layouts × 5 themes = 25 combos) has no working cross-platform regression sentinel. Two prior approaches landed and were both scoped down:

| Attempt | Approach | Outcome |
|---|---|---|
| PR #147 | Coarse FNV-1a hash (4×4 tile + 16-level luma quantize) | Drift between Cairo (CI Linux, FreeType + Pango) and Core Graphics (macOS authoring, Core Text) survived even coarse hashing. Dropped from PR. |
| PR #217 | Region-masked FNV-1a — zero out header / footer / metadata / archive stamp / QR-label rects before hashing | `drawHilt` and `drawMetadata`'s chip-row both render text outside the masked rects. After dropping portrait layouts, all 15 remaining landscape combos still diverged. Scoped to a single FNV drift sentinel. |

Open question: would a **per-pixel perceptual diff** (e.g. [`pixelmatch`](https://github.com/mapbox/pixelmatch) with a tuned threshold) recover regression coverage for the matrix?

## Methodology

The prototype renders a representative card (Obi-Wan ANH on the default 1200×675 landscape layout, default deep-space theme) using the actual `drawBackdrop → drawHeader → drawHilt → drawBlade → drawMetadata → drawQr → drawFooter` pipeline against node-canvas (Cairo). It then runs `pixelmatch` against five categories of pair:

| Case | What changed | What this case probes |
|---|---|---|
| 1 | nothing (re-render) | Deterministic-render floor — should be 0 |
| 2 | `metadataTopY` shifted +1 px | Single-pixel typographic nudge |
| 3 | `metadataTopY` shifted +4 px | Larger but still-bounded UI tweak |
| 4 | Theme backdrop tone darker | Gradient-wide subtle color change |
| 5 | Blade `baseColor` 10° hue shift | Localized real semantic change |
| 6 | ±10 luma jitter on text-band pixels (deterministic LCG, ~3% density) | Synthetic Cairo↔Core-Graphics glyph-edge drift proxy |

Threshold sweep: 0.05, 0.10, 0.20, 0.30, 0.50. Each case is also run with `includeAA: true` (anti-alias detection disabled) to factor out one source of suppression.

## Threshold Tuning Curve

Mismatched-pixel counts out of 810,000 total (1200×675).

### Pass 1 — default settings (AA detection ON)

| CASE                                    | t=0.05 | t=0.10 | t=0.20 | t=0.30 | t=0.50 |
|-----------------------------------------|-------:|-------:|-------:|-------:|-------:|
| 1. baseline ≡ baseline                  |      0 |      0 |      0 |      0 |      0 |
| 2. baseline vs +1px metadata            |  3 930 |  3 308 |  2 417 |  1 398 |    430 |
| 3. baseline vs +4px metadata            |  8 336 |  6 742 |  5 518 |  3 785 |  2 235 |
| 4. baseline vs darker theme backdrop    |      0 |      0 |      0 |      0 |      0 |
| 5. baseline vs blade hue shift          | 10 218 |  6 396 |  **0** |  **0** |  **0** |
| 6. baseline vs synth text drift (±10)   |  **0** |  **0** |  **0** |  **0** |  **0** |

### Pass 2 — `includeAA: true` (AA suppression OFF)

| CASE                                    | t=0.05 | t=0.10 | t=0.20 | t=0.30 | t=0.50 |
|-----------------------------------------|-------:|-------:|-------:|-------:|-------:|
| 1. baseline ≡ baseline                  |      0 |      0 |      0 |      0 |      0 |
| 2. baseline vs +1px metadata            |  6 446 |  5 378 |  3 972 |  2 258 |    746 |
| 3. baseline vs +4px metadata            | 11 184 |  9 076 |  7 233 |  5 072 |  2 853 |
| 4. baseline vs darker theme backdrop    |      0 |      0 |      0 |      0 |      0 |
| 5. baseline vs blade hue shift          | 10 778 |  6 745 |  **0** |  **0** |  **0** |
| 6. baseline vs synth text drift (±10)   |  **0** |  **0** |  **0** |  **0** |  **0** |

## Key Findings

1. **There is no clean threshold valley.** Pixelmatch's YIQ-weighted color distance is designed to swallow exactly the kind of small-magnitude perturbation that text-rasterizer drift produces — but it ALSO swallows real semantic changes of comparable per-pixel magnitude. Case 4 (darker backdrop) registers 0 mismatches at every threshold. Case 5 (blade hue shift, a clearly intentional change a user would notice) registers 0 mismatches at any threshold ≥ 0.20.

2. **Case 4 is the most damning.** A user-visible change to the theme backdrop produced zero mismatches at every threshold tested. The change is gradient-wide and small per-pixel — exactly what pixelmatch is built to ignore. A perceptual-diff regression test would silently pass theme regressions of this shape.

3. **AA suppression isn't the problem.** Disabling `includeAA` (Pass 2) increased counts modestly for the layout-shift cases but didn't recover discrimination for the broad-area cases — Case 5 still goes to 0 at threshold 0.20.

4. **Layout shifts ARE detected reliably.** Cases 2 and 3 produce non-zero counts across the full threshold sweep. Pixelmatch is a usable sentinel for `metadataTopY`-style positional changes, just not for color-space or broad-gradient changes.

5. **The simulated drift went to zero at every threshold.** ±10 luma jitter is below pixelmatch's per-pixel rejection bar. This means the suppression we'd want for real Cairo↔CG drift is the SAME suppression that loses real change detection — they're the same property of the algorithm.

## Vitest matcher API (sketch — for reference only, NOT recommended)

If pixelmatch were viable, a minimal API for a vitest-friendly matcher would be:

```ts
expect.extend({
  toMatchPixelmatchSnapshot(received: Canvas, expectedPath: string, threshold = 0.1) {
    const expected = loadPng(expectedPath); // node-canvas + pngjs
    const w = received.width, h = received.height;
    const a = received.getContext('2d').getImageData(0, 0, w, h).data;
    const b = expected.getContext('2d').getImageData(0, 0, w, h).data;
    const mismatched = pixelmatch(a, b, undefined, w, h, { threshold });
    return {
      pass: mismatched === 0,
      message: () => `${mismatched} pixels mismatched at threshold ${threshold}`,
    };
  },
});

// Usage:
expect(canvas).toMatchPixelmatchSnapshot('./__snapshots__/default-default.png', 0.05);
```

Vitest's `toMatchSnapshot` is **not directly compatible**: it's hash-equality on a serialized representation. `toMatchFileSnapshot` (vitest 1.0+) is closer — it compares against a file on disk — but it's also string-based, so we'd serialize PNG bytes via base64 to use it. A custom matcher (above) is cleaner. Either way: the API is straightforward; the algorithmic problem above is the blocker, not the test plumbing.

## Alternatives Compared

### Platform-specific golden files (separate macOS + Linux CI runs)
**Verdict: viable — best of the alternatives.** Two snapshot files per case, one per platform. CI matrix splits into Linux + macOS jobs (GitHub Actions supports this). On contributor laptops, the local-platform snapshot updates; on CI, the OS-matched one runs. Adds ~$$ to CI minutes (macOS runners cost more) but recovers full byte-exact coverage on each platform. Works with vitest's existing `toMatchSnapshot` — no new test infrastructure.

### Per-region masking expansion (continue Approach A)
**Verdict: viable but high-touch and brittle.** Extend the masking to cover everything `drawHilt` and `drawMetadata` chip-row write outside their nominal bounds. Needs ongoing maintenance every time a drawer adds a text element — and we'd need to re-validate cross-platform stability for the un-masked watermark glyph too. The hilt SVG paths produce sub-pixel AA on stroke edges that Cairo and CG rasterize differently; widening the mask there means masking most of the hilt area, which removes coverage of the hilt visual.

### SSIM (structural similarity, e.g. via [`ssim.js`](https://github.com/obartra/ssim))
**Verdict: same algorithmic problem.** SSIM is designed to align with human perception of similarity, which means it explicitly suppresses small-magnitude changes — the same property that defeats pixelmatch here. Worth prototyping if discrimination is the bottleneck, but no a priori reason to think it would do better than pixelmatch on this matrix.

## Recommendation

**Do not adopt pixelmatch for the card-snapshot matrix.** The prototype shows that the threshold curve has no usable valley between "swallows Cairo↔CG drift" and "preserves real change detection" — the algorithm's perceptual-tolerance property collides with our regression-coverage requirement.

**Adopt platform-specific golden files instead.** Split CI into a `test:linux` job (current default) and a new `test:macos` job that runs the card-snapshot suite (only). Author baselines per-platform; both must be checked in. Locally, contributors update their own platform's baseline via `pnpm test -u`; the other platform's baseline is regenerated in CI on the matching runner. Standard vitest snapshot infrastructure handles the rest.

The CI cost is the trade-off: macOS runners cost ~10× Linux runners on GitHub Actions, but the card-snapshot suite is small (25 combos × ~100 ms = a few seconds). At launch scale this is dollars, not double-digit dollars.

**Pixelmatch could still be useful as a layout-shift-only sentinel** — Case 2 + Case 3 prove it catches positional changes reliably across the full threshold range. A scoped follow-up could pair coarse pixelmatch (layout shifts) with the existing FNV drift sentinel (algorithm stability), giving partial coverage without the platform-specific golden-file complexity. That's a smaller win than full matrix coverage but might be worth it as a stepping stone.

## Reproduce locally

```sh
cd apps/web
pnpm exec vite-node --config vitest.config.ts \
  tests/cardSnapshotGoldenHash/__research__/pixelmatch-prototype.ts
```

Output: the two threshold-sweep tables in this doc, deterministic across runs.

To capture the missing half of the curve (real Cairo↔CG drift), the prototype would need to run on Linux CI with a baseline checked in from macOS — out of scope for this research pass.
