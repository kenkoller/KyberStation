# Saber-Visibility Audit — 2026-04-18

Systematic probe of every view that renders the blade/saber, checking
for visibility failures reported at launch-readiness QA.

Branch: `test/launch-readiness-2026-04-18`.

## Views Probed

| View | Renderer | File | Visibility |
|---|---|---|---|
| 2D Workbench (default) | 2D canvas | `BladeCanvas.tsx` | ✅ Works |
| 2D Pixel Mode | 2D canvas | `BladeCanvas.tsx` (`renderMode='pixel'`) | ✅ Works |
| 3D Workbench | WebGL / R3F | `BladeCanvas3D.tsx` | ⚠️ Stale bladeState (fixed below) |
| Fullscreen Preview | 2D canvas (`BladeCanvas` reused) | `FullscreenPreview.tsx` | ✅ Works |
| Crystal Reveal (Fullscreen) | WebGL / R3F overlay | `CrystalRevealScene.tsx` | ✅ Works — blade is always-on by design |
| Mobile Companion `/m` | 2D canvas (`BladeCanvas` reused) | `app/m/page.tsx` | ✅ Works |
| Tablet Shell | 2D canvas (`BladeCanvas` reused) | `AppShell.tsx` | ✅ Works |
| Landing Hero | 2D canvas (isolated engine) | `LandingBladeHero.tsx` | ✅ Works (own engine instance) |

## Root-Cause Bug Found

**Symptom:** In 3D view, the blade is visible when the saber is OFF (or
vice versa — blade missing when saber is ON). The state doesn't match
the Ignite/Retract button.

**Reproduction (pre-fix):**
1. Open `/editor` in 2D mode.
2. Click Ignite — blade extends (2D canvas works).
3. Switch to 3D mode.
4. Click Retract.
5. Observe: 3D view still shows a blade segment, even though the
   saber is now OFF. (Conversely, if you ignite while on 3D, the blade
   may be stuck at a partial extension.)

**Cause:** The engine tick loop — which advances animation progress
(`engine.update(deltaMs, config)`) and mirrors `engine.state` into the
Zustand store — lived inside `BladeCanvas.tsx`'s `useAnimationFrame`
callback. That was fine when `BladeCanvas` was always mounted. But
`WorkbenchLayout` now conditionally renders `BladeCanvas3D` *instead
of* `BladeCanvas` when the user switches to 3D mode. When
`BladeCanvas` is unmounted:

- `engine.update()` is never called — ignition / retraction never
  progresses past its initial state.
- `bladeStore.setBladeState(engine.state)` is never called — the
  store's `bladeState` retains whatever value was last written by the
  2D canvas. `BladeCanvas3D` reads this stale value and keeps
  rendering the frozen blade.

The `FullscreenPreview` escapes the bug because it reuses `BladeCanvas`
internally. `CrystalRevealScene`'s blade is always-on by design (doesn't
read `bladeState`). Mobile + tablet + `/m` shells also embed
`BladeCanvas`, so they're fine.

**Fix (this PR):** Moved the engine tick + `bladeState` mirror out of
`BladeCanvas.tsx` and into `useBladeEngine.ts`'s own `useEffect` rAF
loop. `useBladeEngine` is called from `AppShell`, `WorkbenchLayout`,
`/m` page, and `UVUnwrapView` — so any view that cares about the
engine gets a live tick regardless of which canvas is mounted.

- `BladeCanvas` now only paints (reads `engine.getPixels()`).
- `useBladeEngine` owns the update cadence and the store mirror.
- `engine.update` was passed `deltaMs` from `BladeCanvas`'s local rAF
  and `config` from its React closure — the new loop reads delta from
  `performance.now()` and config fresh from the store each frame
  (handles live colour changes without needing a re-subscribe).
- `useUIStore.getState().animationPaused` is honoured in the new
  location, same as the old `BladeCanvas` path.

## Verification

- `pnpm -w typecheck` → green (11 packages).
- `pnpm -w test` → green (2208 tests: engine 457, codegen 1323, web 428).
- Manual probe via MCP preview:
  - 2D mode: blade renders correctly when ignited (blue pixels
    detected, ~1200+ blue-dominant pixels in blade area).
  - 3D mode: blade now correctly hides when saber is OFF (0 blue
    pixels after retract).
  - 3D mode ignition: blade state transitions in 3D respect
    `engine.state` changes immediately (the `bladeState` mirror now
    fires on every frame rather than only from 2D's rAF).

## Deferred / Out-of-Scope (design calls, not fixes)

- **3D camera framing when blade is fully extended.** With the
  default Graflex hilt, blade top at `y=5.84`; camera at `y=2` with
  FOV 40° centred on `y=1.5` only sees up to `y≈3.32`. The upper
  ~40% of the blade is cropped. This is pre-existing and cosmetic —
  fix would change the default camera framing, which is a design
  decision, not a visibility bug.
- **`CrystalRevealScene.tsx` renders a permanently-full blade.**
  Doesn't react to `bladeState`. This is intentional per the scene's
  design (dolly into the crystal chamber; blade is a background
  element, not a dynamic one).
- **Hydration error noise in dev.** Console shows repeated
  "hydration mismatch" warnings unrelated to this fix — likely from
  `SplashScreen` / `OnboardingFlow` reading `localStorage` on mount.
  Pre-existing and does not affect visibility. Logged separately.
- **`BladeCanvas` is instantiated twice on desktop.** `AppShell`
  calls `useBladeEngine()` and passes `engineRef` into
  `FullscreenPreview`, while `WorkbenchLayout` (rendered as a child)
  also calls `useBladeEngine()` for the workbench canvas. Both
  engines are now independently ticked and both write to the store.
  Pre-existing architecture; fix (single shared engine) is a
  larger refactor out of scope for this launch-readiness pass.
- **Preview iframe tab-visibility throttling.** Under the MCP preview
  harness the page is often `document.hidden=true`, which throttles
  `requestAnimationFrame` to ~1 Hz. This is a testing-environment
  limitation, not a production issue — real users focus the tab.
  Noted because it made end-to-end visual verification noisy during
  the audit.

## Files Changed

- `apps/web/hooks/useBladeEngine.ts` — added rAF tick loop that
  advances the engine and mirrors `engine.state` into
  `bladeStore.bladeState` every frame.
- `apps/web/components/editor/BladeCanvas.tsx` — removed
  `engine.update(deltaMs, config)` and
  `setBladeState(engine.state)` from the render callback; they now
  live in `useBladeEngine`. Renamed the callback's `deltaMs` →
  `_deltaMs` since it's no longer consumed. Added an explanatory
  comment pointing to the new owner.

## Follow-Up Worth Considering (not required for launch)

1. Consolidate to a single engine instance. `useBladeEngine` currently
   constructs a new `BladeEngine` per caller; the workbench ends up
   with two. A refactor that exposes a shared engine via context
   would eliminate the double-tick + double-write pattern.
2. Tighten 3D camera framing so the fully-extended blade fits in the
   viewport with a small margin. Likely a simple tweak to the
   `camera.position.y` + `fov` in `BladeCanvas3D.tsx`.
3. Add a `useBladeEngine` unit test that asserts the rAF loop syncs
   `engine.state` to the store.
