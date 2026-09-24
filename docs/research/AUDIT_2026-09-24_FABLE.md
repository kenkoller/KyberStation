# KyberStation codebase audit — 2026-09-24

**Scope:** whole-repo read-only audit at `f4acb55` (origin/main, 2026-05-18). Auditor: Claude (Fable 5.1), four parallel read-only sub-reviews (engine/template-eval, codegen/presets/profiles, web app, test suite) plus a full `pnpm turbo test` run in this worktree. Anything not read directly is marked **hypothesis**. Line numbers are as of `f4acb55`.

---

## 1. Executive summary

**Top findings**

1. **The repo has been idle for 129 days and its own state documents are already wrong.** No commit on any ref since 2026-05-18. GitHub auto-disabled the scheduled CodeQL and stale workflows on ~2026-07-18 (`disabled_inactivity`), PR #363 has sat open since 05-18, and CLAUDE.md's "Top open items" #2 (Wave 8 button-routing sub-tab) actually shipped the day before that list was written ([#354](https://github.com/kenkoller/KyberStation/pull/354)–[#356](https://github.com/kenkoller/KyberStation/pull/356); [ButtonRoutingSubTab.tsx](apps/web/components/editor/routing/ButtonRoutingSubTab.tsx) is 422 lines and mounted at [GestureControlPanel.tsx:322](apps/web/components/editor/GestureControlPanel.tsx:322)). External signal since the 05-01 launch: 0 issues, 0 discussions, 0 outside PRs, 0 stars, 1 fork, 12 repo views in the last 14 days.
2. **The one hardware-validated delivery path (runtime presets) is thinner in code than the docs say, and ships a known deployment bug.** The emitter emits only `builtin` and a fixed-template `advanced` ([ProffieRuntimeEmitter.ts:169](packages/codegen/src/emitters/ProffieRuntimeEmitter.ts:169), [:239](packages/codegen/src/emitters/ProffieRuntimeEmitter.ts:239)); it never reads `style`, so the gallery→verb mapping described on 05-18 exists only in prose. Result: 0/455 gallery presets are style-faithful on the runtime path (all 455 get colors + timing). The app writes `presets.ini` but never `presets.tmp` (zero hits in `apps/web` or `packages/codegen`), despite the 05-17 hardware finding that a stale `.tmp` silently reverts the deck. Meanwhile the compile+flash path — the README's headline — has never produced a booting saber from a production export on any board ([HARDWARE_COMPATIBILITY.md:36-38](docs/HARDWARE_COMPATIBILITY.md:36) all TBD; V3.9-BT 9/9 failed).
3. **v0.23.0's "template-eval is the default render path" is true of the engine constant and not of the app.** [useBladeEngine.ts:99-105](apps/web/hooks/useBladeEngine.ts:99) forces `'proffie'` unless raw code is imported; template-eval is reached only because the Hardware Preview toggle defaults on ([uiStore.ts:693](apps/web/stores/uiStore.ts:693)). Under template-eval, ignition/retraction animations are not rendered (`_extendProgress` is unused at [TemplateEvalBridge.ts:63](packages/engine/src/templateEval/TemplateEvalBridge.ts:63); the canvas draws a linear wipe at [BladeCanvas.tsx:1047](apps/web/components/editor/BladeCanvas.tsx:1047)), and `triggerEffect('lockup')` never sets `lockupType` ([TemplateEvalBridge.ts:101-109](packages/engine/src/templateEval/TemplateEvalBridge.ts:101)) so codegen's default `LockupTrL` shape produces no pixels (sub-review executed this; I confirmed the code path). Two render paths remain live with divergent behavior.

**Top recommendations**

1. **One re-entry session before any feature work:** correct CLAUDE.md / backlog / handoff (Wave 8 shipped, stale file tree), fix the [HARDWARE_COMPATIBILITY.md:34](docs/HARDWARE_COMPATIBILITY.md:34) V3.9-BT row that still recommends compile+flash, merge or close #363, prune the 38 merged remote branches, re-enable CodeQL, gitignore and rotate `certs/`, and either install ESLint or drop the no-op `lint` step from CI.
2. **Make the runtime path honest and broad (no hardware needed to start):** write `presets.tmp` alongside `.ini`; add a `flash-only`/`dropped` deliverability tier; add a style→verb table using upstream's nine `named_styles` (`standard advanced fire unstable strobe cycle rainbow charging builtin`, [style_parser.h:45-102](https://github.com/profezzorn/ProffieOS/blob/master/styles/style_parser.h) on master) with byte-exact tests. Estimated effect: 0/455 → roughly 300/455 approximately-faithful. Then bench-validate one preset per verb on the V3.9-BT.
3. **Buy a stock Proffieboard V3.9 (~$80) and run W2.3.** It is the only way to make the README's compile+flash promise either true or retractable, it isolates the toolchain from the 89sabers loader question, and it unblocks a real CI compile gate for generated `config.h`. Until then, re-frame README/FLASH_GUIDE so runtime presets is the primary "put it on your saber" path.

---

## 2. Findings by area

### 2.1 Architecture health

**Package split.** The UI boundary is clean where it matters: zero deep-path imports into `packages/*/src`, zero `(engine as any)`, and every web import goes through `@kyberstation/*`. The dependency graph is no longer what [ARCHITECTURE.md:21-32](docs/ARCHITECTURE.md:21) draws: `engine` depends on `template-eval` and `peggy`, `boards` on `engine` + `codegen`, `hardware-profiles` on `boards`. The doc (last touched 2026-04-18) omits two packages and says engine "depends on nothing."

**Render-path duplication.** The parameter engine is 7,301 non-test LOC (styles 2,957 / effects 1,975 / ignition 2,369) beside template-eval's 8,786. Both are live:

- Mode selection lives in two hooks with identical ternaries ([useBladeEngine.ts:99-105](apps/web/hooks/useBladeEngine.ts:99), [useHardwarePreview.ts:53-59](apps/web/hooks/useHardwarePreview.ts:53)). On a `boardId` change the first sets `'proffie'` (which nulls the bridge, [BladeEngine.ts:234-237](packages/engine/src/BladeEngine.ts:234)) and the second only re-applies `'template-eval'` if generated code changed ([useHardwarePreview.ts:74-78](apps/web/hooks/useHardwarePreview.ts:74)). **Hypothesis:** switching between two Proffie boards silently drops the canvas to the approximation until the next edit.
- Inspector STATE snapshots build `new BladeEngine()` with no preview template ([BladeEngine.ts:715](packages/engine/src/BladeEngine.ts:715)), so the snapshot grid renders the parameter engine while the canvas renders template-eval.
- The bridge maps 8 of 23 `EffectType`s ([TemplateEvalBridge.ts:22-31](packages/engine/src/templateEval/TemplateEvalBridge.ts:22)); the other 15 are dropped silently.
- Desktop instantiates two engines and two rAF loops: [AppShell.tsx:184](apps/web/components/layout/AppShell.tsx:184) and [WorkbenchLayout.tsx:173](apps/web/components/layout/WorkbenchLayout.tsx:173) both call `useBladeEngine()`, which does `new BladeEngine()` per call ([useBladeEngine.ts:28](apps/web/hooks/useBladeEngine.ts:28)).
- Two `timeScale` multipliers compound ([useBladeEngine.ts:66](apps/web/hooks/useBladeEngine.ts:66) and [BladeEngine.ts:547](packages/engine/src/BladeEngine.ts:547)), written from different UI surfaces.

**Emitter architecture is nominal.** `BoardEmitter` exists ([BaseEmitter.ts:34-53](packages/codegen/src/emitters/BaseEmitter.ts:34)) but the app never calls `getEmitter`, `CFXEmitter`, `GHv3Emitter`, `XenopixelEmitter.emit()` or `ProffieRuntimeEmitter.emitMultiPreset()`. The live ZIP path is local builders in [zipExporter.ts](apps/web/lib/zipExporter.ts) (920 LOC). This is the exact class/live-path split that produced "27 of 33 styles silently degraded" in [#339](https://github.com/kenkoller/KyberStation/pull/339); it was patched for Xenopixel and left in place for the other four boards.

### 2.2 Code quality and technical debt

**Type discipline is good.** `any` usage: 2 in engine/template-eval, 0 in codegen/presets/boards/hardware-profiles, 39 in 112k LOC of web (29 of them `as unknown as`). `BladeConfig`'s index signature is `[key: string]: unknown` ([types.ts:567](packages/engine/src/types.ts:567)), not the `any` CLAUDE.md shows. TODO/FIXME across the repo: 6.

**Plugin extensibility is working but under-documented.** Base classes are minimal; registries are hand-maintained literals. Adding the newest style (`tempoLock`) touched 7 files (class, engine registry, `ASTBuilder` case, `styleCatalog.ts`, `engineOnlyStyles.ts`, `xenopixelCompat.ts`, `styleThumbnails.tsx`); `mirage` touched 18. [STYLE_AUTHORING.md:68-99](docs/STYLE_AUTHORING.md:68) lists four steps and none of the web-side lists. A filesystem-scanning parity test ([engineStyleParity.test.ts](apps/web/tests/engineStyleParity.test.ts)) catches ASTBuilder omissions, which is why the 33-style count has not drifted.

**Recurring smells, in order of consequence:**

1. *Wall-clock mixed into simulated time.* [BaseEffect.ts:15](packages/engine/src/effects/BaseEffect.ts:15) stamps `startTime = performance.now()`; [BladeEngine.ts:1056](packages/engine/src/BladeEngine.ts:1056) subtracts it from `_elapsedTime`. An engine created 5 s after page load holds a 400 ms clash for ~5 s (sub-review measured it). Six test files stub `performance.now` to work around this rather than fix it.
2. *Dead plumbing in the engine.* `_activeEffectTypes` is declared and passed but never mutated ([BladeEngine.ts:128](packages/engine/src/BladeEngine.ts:128), [:477](packages/engine/src/BladeEngine.ts:477)), so the `lockup`/`clash` modulator sources in [sampler.ts:114](packages/engine/src/modulation/sampler.ts:114), [:225](packages/engine/src/modulation/sampler.ts:225) cannot fire from the live engine. `cleanupEffects()` is a no-op called twice.
3. *The validator is inert.* `validateAST` is exported and called by nothing except its own test; `countBrackets` returns 0 by construction ([Validator.ts:144-159](packages/codegen/src/Validator.ts:144)), so the "unbalanced" error can never fire. Bracket balance is guaranteed structurally by AST emission, but the "validates it" claim in CLAUDE.md/ARCHITECTURE.md describes nothing that runs.
4. *Copy-paste helpers.* The `sin(x*127.1+311.7)*43758.5453` hash appears in 22 engine files while [noise.ts:38](packages/engine/src/noise.ts:38) provides it; `hslToRgb` is defined 5× in engine and `rgbToHex` 23× in web; the engine's exported color helpers have zero web importers.
5. *God files.* [BladeCanvas.tsx](apps/web/components/editor/BladeCanvas.tsx) 2,913, [CardWriter.tsx](apps/web/components/editor/CardWriter.tsx) 1,647, [WorkbenchLayout.tsx](apps/web/components/layout/WorkbenchLayout.tsx) 1,446, [BladeEngine.ts](packages/engine/src/BladeEngine.ts) 1,166, [uiStore.ts](apps/web/stores/uiStore.ts) 913 with seven separate localStorage keys. Seven stores hand-roll unversioned localStorage; eight hydrate at module scope, five without a `window` guard.
6. *Dead components.* Eight editor components have zero importers (~2,014 LOC): `OLEDEditor`, `ComparisonView`, `CompatibilityPanel`, `VisualSettingsPanel`, `ThemePickerPanel`, `EffectColumn`, `OutputWorkflowGuide`, `UVUnwrapView`, plus `BladeBloom`. `CompatibilityPanel` is one of the three UI surfaces [#364](https://github.com/kenkoller/KyberStation/pull/364) edited to carry the V3.9-BT warning; that copy is never shown.

**Deliverability table vs. emitter.** [deliverability.ts:335](apps/web/lib/deliverability.ts:335) marks `shimmer` deliverable ("emitted as AudioFlicker<> intensity"); `ASTBuilder` never reads it ([ASTBuilder.ts:34](packages/codegen/src/ASTBuilder.ts:34) is a type field only). The field-coverage matrix already recorded this as P1 ([MULTI_BOARD_FIELD_COVERAGE_2026-05-16.md:116](docs/research/MULTI_BOARD_FIELD_COVERAGE_2026-05-16.md:116)) and the table was not corrected.

### 2.3 Test coverage — real vs. claimed

**The count is real.** `pnpm turbo test` in this worktree: **8,909 passed, 0 skipped, 256 files, 19.6 s wall** (web 3,802 / codegen 3,045 / engine 1,244 / boards 278 / template-eval 231 / presets 138 / hardware-profiles 109 / sound 62). CLAUDE.md's "~8,750+" is conservative.

**About half is parametric expansion.** 4,526 textual `it(`/`test(` sites expand to 8,909; 49% comes from `.each` and loop-wrapped `it`. One file, [synthetic.test.ts](packages/codegen/tests/synthetic.test.ts), is 2,287 tests (25.7% of the suite): 455 presets × 5 through a genuine Config→AST→Code→AST→Config round-trip, but the color-field check early-returns for any style outside a 10-style set ([:79-90](packages/codegen/tests/synthetic.test.ts:79)) — 28% of preset style declarations get only `not.toBeNull()` — it never runs `validateAST` or `buildConfigFile`, and the 214 committed `.cpp` fixtures are written under `KYBERSTATION_WRITE_FIXTURES=1` and read by nothing. [bladeCanvasAlignment.test.ts](apps/web/tests/bladeCanvasAlignment.test.ts) is 379 tests comparing a lib helper against a copy of the BladeCanvas formula re-implemented inside the test ([:56-60](apps/web/tests/bladeCanvasAlignment.test.ts:56)); the component is not imported.

**Where coverage is concentrated (and good):** byte-exact runtime-emitter tests ([proffieRuntimeEmitter.test.ts:22-60](packages/codegen/tests/proffieRuntimeEmitter.test.ts:22), including the 16-bit RGB pin), the 63-fixture Fett263 corpus, strict-mock DFU regressions replaying the 04-20 bench failures ([DfuSeFlasher.test.ts:305-333](apps/web/tests/webusb/DfuSeFlasher.test.ts:305)), preset drift sentinels, and golden hashes.

**Where it is weakest, ranked:**

1. No differential test renders one config under both `'proffie'` and `'template-eval'` and compares buffers. The "455/455 parse" figure comes from `pnpm bench:template-eval`, not CI. **Hypothesis:** `bladeEngineGoldenHash.test.ts` never sets a template, so it pins the approximation path.
2. 13/33 styles have any pinned output; 20 get only finite-RGB smoke ([styles.test.ts:78-115](packages/engine/tests/styles.test.ts:78)).
3. 38 of 71 editor components (54%) have zero test references, including `EffectPanel`, `LayerStack`, `PresetGallery`, `PixelDebugOverlay`, `CrystalPanel`.
4. Nothing compiles KyberStation-generated code. `firmware-build.yml` runs arduino-cli only for the three shipped variants on manual/release triggers.
5. `CFXEmitter`/`GHv3Emitter` have no in-package tests; `FontPlayer.ts` has zero references; `lib/webusb/connect.ts` is imported by no test.
6. Golden hashes update via plain `vitest -u` with no gate; the card-snapshot matrix is down to one sentinel hashing the FNV function on two pixels ([cardSnapshot.test.ts:25-36](apps/web/tests/cardSnapshotGoldenHash/cardSnapshot.test.ts:25)).

### 2.4 Product / feature strategy

**There is no user signal to prioritize against.** Four months public: zero issues, discussions, outside PRs, or stars; the one external data point cited anywhere is a 2026-05-08 Reddit comment about prop-file control schemes. Whatever the next move is, it is chosen on Ken's own bench experience, not demand.

**The runtime path is the product's only proven "design → saber" loop, and it is narrower than documented.** Today every gallery preset lands on a V3.9-BT as a solid-color `advanced` blade with the right colors and in/out timing; style, shimmer, ignition/retraction *style*, and modulation are dropped, and the drop is surfaced only as a `dropped-silently` row inside CardWriter. Upstream's `advanced` verb is actually `Gradient<RgbArg1,RgbArg2,RgbArg3>` with onspark/blast/lockup/clash colors and in/out times ([style_parser.h:51-75](https://github.com/profezzorn/ProffieOS/blob/master/styles/style_parser.h)); [zipExporter.ts:738-752](apps/web/lib/zipExporter.ts:738) sets all three gradient slots to `baseColor`. Gallery style distribution (28 distinct styles across 455): stable 152, unstable 62, pulse 28, aurora 27, gradient 18, photon 15, fire 13, rotoscope 12, helix 12, plasma 11, prism 10, vortex 10, tidal 9, darksaber 8, the rest ≤7 each. A verb table (stable/gradient/darksaber→`advanced`, unstable→`unstable`, fire→`fire`, pulse/aurora→`cycle` flagged approximate) covers roughly 300/455; ~155 (~34%) stay flash-only under current verbs. That is above the 20% threshold [V39BT_FLASH_NEXT_STEPS.md:97](docs/research/V39BT_FLASH_NEXT_STEPS.md:97) set for "real product gap." W1.1 was never written up; this is the number it would have produced.

**Ranking the candidates in the brief:**

| Candidate | User value | Effort | Verdict |
|---|---|---|---|
| Runtime path: `.tmp` write + flash-only tier + verb mapping | High — only validated path; fixes a silent-reversion bug | S + M | Do first |
| Perceptual/differential harness (proffie vs template-eval) | Medium — prerequisite for trusting either render path; would have caught the lockup and ignition gaps | M | Do second, as a CI gate over `ALL_PRESETS` |
| Wave 8 button routing UI | Already shipped (#354–#356) | — | Update the docs |
| Mobile shell migration | Low — no mobile usage signal; the files it was meant to retire no longer exist | M | Defer |
| Crystal Vault panel | Low — design debt with no user pull | M-L | Defer |

### 2.5 Hardware roadmap

**Status, restated plainly.** Compile+flash: unvalidated on stock V3.9/V2.2 (no board), failed 9/9 on V3.9-BT including 89Sabers' own factory source, and the single 04-27 success was hand-patched on a board that is now app-mode-USB-damaged. Runtime presets: validated 05-16 and 05-18 on the V3.9-BT, including the 16-bit RGB fix. USB-only recovery is proven. ST-Link characterization is blocked on chassis access.

**Ranked by expected user value per effort:**

1. **Runtime-verb breadth (M, no hardware to start, one bench session to close).** Covered above. Upstream `named_styles[]` on master confirms all nine verbs exist; the format machinery (`install_time`, `ValidatePresets`, `iteration_`) is unchanged in [current_preset.h](https://github.com/profezzorn/ProffieOS/blob/master/common/current_preset.h). Also fixes the `.tmp` bug and the missing flash-only tier.
2. **Stock Proffieboard V3.9 reference (S + ~$80).** Isolates toolchain from vendor loader, validates the documented path, enables a CI compile gate against a pinned ProffieOS tag using the arduino-cli steps already in `firmware-build.yml`.
3. **Vendor outreach round two (S).** 89Sabers already answered once. The specific ask now is the Bank 1 image or a statement of whether it is a loader; the W2-prime result gives them a concrete failure to react to.
4. **Bluetooth (L).** The real payoff is not new capability; it is removing the SD-card swap from the runtime path (ProffieOS serial commands over BLE UART — the same `set_style`/preset commands already validated over USB). Gate it on §9 of [BLUETOOTH_FEASIBILITY.md](docs/research/BLUETOOTH_FEASIBILITY.md) being filled in (still all TBD; the Hubinette PoC "BLE" no-op was never investigated) and on runtime verbs being broad enough to be worth pushing. iOS/Safari/Firefox exclusion is permanent.
5. **Multi-board expansion (L).** Xenopixel has no test hardware; CFX/GH are design-reference only; the emitter class/live-builder split is unresolved. Low value until Proffie delivery is solid.
6. **ST-Link (blocked).** Correct to leave parked; do not plan around it.

**Drift risk the roadmap does not mention.** Upstream ProffieOS is at v8.10 (2026-02-22) with master active on 2026-09-05; KyberStation's stated target is 7.x and there are zero mentions of OS 8 anywhere outside `docs/archive`. `firmware-build.yml` builds from `master` (now 8.x) and labels the output `proffieos-7x-*`. The runtime format was verified against 7.12 (the vendor firmware), which is fine for the V3.9-BT and unverified for any OS-8 chassis.

### 2.6 Documentation

**For a new user:** the README is long, current on posture (V3.9-BT caveat, dfu-util path, experimental FlashPanel) and stale on facts: "~8,300 tests"/"8,283", "29 style implementations" in the architecture tree, Status section ends at v0.21.1 with no v0.22/v0.23 entries, and "v1.0" appears eleven times across README/FLASH_GUIDE/CLAUDE.md though no `v1.*` tag exists (launch was tagged `v0.16.0`). `docs/user-guide/` (11 files, including a modulation guide with SVGs) has no inbound link from the README or the app.

**For a returning contributor:** the "start here" set — [ARCHITECTURE.md](docs/ARCHITECTURE.md), [CONTRIBUTING.md](docs/CONTRIBUTING.md), [DEVELOPMENT.md](docs/DEVELOPMENT.md), [STYLE_AUTHORING.md](docs/STYLE_AUTHORING.md), [docs/README.md](docs/README.md) — was last modified 2026-04-18, before template-eval, hardware-profiles, runtime presets, Xenopixel, and the render-mode change. `docs/README.md` links four files that were archived. ARCHITECTURE.md describes canvas mode 2d/3d (removed in #75), blend modes add/screen/multiply (removed in #116), 398 tests, and thirteen stores listing one twice. CLAUDE.md's file tree names `BladeCanvas3D.tsx`, `DesignPanel.tsx`, `DynamicsPanel.tsx`, `MergedDesignPanel`, `functions/`, `motion/IMUEmulator.ts`, and `apps/electron`, none of which exist.

**Contradictions between research docs:**

- [HARDWARE_COMPATIBILITY.md:34](docs/HARDWARE_COMPATIBILITY.md:34) (the public matrix the README links) marks the V3.9-BT "✅ via vendor profile" with recommended path "Vendor profile — emit config.h tailored to the chassis." It was flipped on 05-17 (#360) and not touched after W2-prime on 05-18. [PROFFIE_V39BT_FLASH_FEASIBILITY.md](docs/research/PROFFIE_V39BT_FLASH_FEASIBILITY.md) says do not flash this chassis. A user following the matrix ends up with a dead saber until they restore from a backup they may not have taken.
- [HARDWARE_COMPATIBILITY_STRATEGY.md](docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md) (05-15) proposes a 6–8-week compile+flash-first "Hardware Profiles" bet; the 05-17/18 audit inverts that. Neither doc references the other's conclusion; CLAUDE.md links both.
- [FETT263_TEMPLATE_INVENTORY.md](docs/research/FETT263_TEMPLATE_INVENTORY.md) reports ~110 templates; the registry holds 343. Template-eval registry is 408 names ([registryGaps.test.ts:48](packages/template-eval/tests/registryGaps.test.ts:48)); QA_TESTING_CHECKLIST and EMIT_PARSER_AUDIT say 372.
- [NEXTJS_15_UPGRADE_PLAN.md](docs/research/NEXTJS_15_UPGRADE_PLAN.md) targets a v0.17 slot that passed in May; see §2.8.

**Volume.** 41 top-level docs, 19 research docs, 55 archived. Root also carries `AGENT_PROMPTS.md` (April scaffold prompts), `SETUP_CHECKLIST.md`, an 8.2 MB TIFF and 1.7 MB PNG mockup, `vercel.json` for a GitHub-Pages deploy, and `certs/`.

### 2.7 Release cadence and process

**Throughput.** 365 PRs merged between 2026-04-16 and 2026-05-18 (194 April merges, 136 May), 923 commits, up to 16 PRs in one session. Tags `v0.17.0` through `v0.20.3` were all cut on 2026-05-02 — version numbers functioned as session labels. Root `package.json` still says `0.22.0` (cosmetic; nothing reads it).

**Guards that exist.** A repository ruleset on `main` blocks non-fast-forward and deletion, requires a PR, and requires the `build-and-test` check — CLAUDE.md's server-side claim is correct, though via rulesets rather than classic protection. `strict_required_status_checks_policy` is `false`, so a PR green on a stale base can merge; in 16-PR sessions that is the realistic path for a semantic conflict to land. The client-side `pre-push` hook is not installed in the main working copy (`core.hooksPath` unset, no `.git/hooks/pre-push`) and its header still describes a private repo with no server protection.

**CI gaps.** `pnpm lint` is `echo 'lint: placeholder'` in all 8 packages while [.eslintrc.js](.eslintrc.js) references `@typescript-eslint` that is in no `devDependencies`; CI "passes" lint every run. No Dependabot/Renovate. CI runs Node 20; CLAUDE.md recommends 24. `pnpm.onlyBuiltDependencies` contains junk single-letter entries (`"b","d","e","i","l","s","u"`). Scheduled CodeQL is disabled by inactivity, so the "new CVE surfaced within 7 days" promise in its header is void.

**Branch and worktree hygiene.** 38 merged remote branches unpruned despite the collaboration defaults. Four unmerged: #363 (open, one commit, content not on main), `feat/marketing-site-expansion` (6 commits from 04-19 with its own worktree `KyberStation-mkt`), `feat/blade-renderer-golden-hash` (superseded by #334), `docs/s1-audit-batch` (content already on main). The main working copy sits on a docs branch two commits behind `main`, holding untracked, un-gitignored directories including `89sabers Config File/` — vendor-shared material one `git add .` away from a public repo. `.git/lost-found` is 1.1 GB of dangling objects (actual history is ~100 MB unpacked, 69 MB packed); safe to delete.

**Secrets.** [certs/localhost-key.pem](certs/localhost-key.pem) (`BEGIN PRIVATE KEY`) has been tracked since the initial commit and is used by `scripts/local-serve.mjs`. It is a self-signed localhost key, so exposure impact is nil, but it is a private key in a public repo and will trip scanners. Gitignore, regenerate locally (mkcert), leave history alone.

### 2.8 Risks, 3–6 month horizon

1. **Dependency debt has crossed from "hygiene" to "two majors behind."** Lockfile: `next@14.2.35`, `react@18.3.1`, `three@0.183.2`, `vitest@3.2.4`, `typescript@5.9.3`. Registry today: `next@16.3.4`, `react@19.2.8`, `vitest@5.0.0`, `typescript@7.0.2`, `tailwindcss@4.3.3`, `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.8`. The last 14.x release was 2025-12-11; `pnpm audit --prod` reports 15 high / 15 moderate, eight of them `next` advisories patched only in ≥15.0.8/15.5.x. Static export neutralizes the server-side DoS class; two XSS-class advisories (CSP nonces, `beforeInteractive` scripts) I did not verify against static export. The 04-30 plan's own warning ("14→15 compounding into 14→16") has happened; the job is now Next 16 + React 19 + R3F 9 + drei 10 + vitest 5, realistically 2–3 sessions, and the plan should be rewritten before anyone starts. Dev-only: 3 critical (`vitest` <3.2.6, `tar`).
2. **Vendor and firmware drift.** The V3.9-BT boot chain is unexplained (H1 leading); a vendor firmware update could change the compiled style bank that `builtin N M` indexes by position, or the `advanced` slot layout. The emitter has no version guard beyond `install_time`. ProffieOS 8.x is current upstream and the project has no stated position on it.
3. **Two render truths.** Until a differential test exists, "what you see is what hardware does" is an intention, not a property. The lockup and ignition gaps under template-eval were shipped in the same release that made that claim.
4. **Bus factor and process.** Solo maintainer; zero outside contributors; PR policy revisit was due 2026-05-31. The parallel-agent workflow that produced 365 PRs also produced state docs written by agents about agent work, which is how a shipped feature stayed "open" in three documents. Any restart should treat CLAUDE.md's Current State as untrusted until re-verified.
5. **Operational.** Disabled scheduled workflows, an open PR, and an unpruned branch set are minor individually; together they mean the next session starts by rebuilding context that the docs claim to hold.

---

## 3. Prioritized roadmap

Ranked by leverage × confidence. Sizes: S ≤ half a session, M = 1–2 sessions, L = 3+.

### 3-month horizon (concrete)

1. **Re-entry hygiene (S).** Correct CLAUDE.md Current State, backlog, and handoff (Wave 8 shipped; file tree; test count; `unknown` not `any`). Fix the HARDWARE_COMPATIBILITY V3.9-BT row. Merge/close #363; delete `feat/blade-renderer-golden-hash` and `docs/s1-audit-batch`; decide `feat/marketing-site-expansion`. Prune 38 merged branches. `rm -rf .git/lost-found`. Gitignore `certs/`, `89sabers Config File/`, `builds/`, the stills directories. Remove the TIFF/PNG from the tree. Re-enable CodeQL; drop the stale bot or accept it. Either add ESLint (the config is written) or remove `lint` from CI. Add Dependabot for lockfile awareness. Set the ruleset to strict status checks.
2. **Runtime path correctness (S–M).** Write `presets.tmp` byte-identical to `presets.ini` in both ZIP and direct-write paths, with a wire-format fixture test. Add a `flash-only` deliverability tier and surface it in CardWriter. Correct the `shimmer` row. One bench session to confirm the `.tmp` fix on the V3.9-BT.
3. **Runtime verb mapping (M).** Style→verb table per §2.4, `gradient`/`darksaber` using the three `advanced` gradient slots, `pulse`/`aurora` via `cycle` flagged approximate, everything else `flash-only`. Byte-exact tests against upstream `named_styles[]` arity. Bench-validate one preset per verb. Publish the coverage number in `docs/research/RUNTIME_PRESET_COVERAGE_2026-MM-DD.md` as W1.1 intended.
4. **Render-path parity (M).** Fix `lockupType` propagation in `TemplateEvalBridge.triggerEffect`; decide how ignition/retraction render under template-eval (evaluate `InOutTrL` transitions in the interpreter, or overlay the parameter-engine ignition mask on the canvas); collapse mode selection into one hook; fix the wall-clock `startTime`. Then add a differential test over `ALL_PRESETS` (proffie vs template-eval, first-frame and t=1 s buffers within a tolerance) as a CI gate replacing the bench-only 455/455 claim.
5. **Stock Proffieboard V3.9 (S + ~$80).** W2.3 as written. On success, add a CI job that compiles one generated `config.h` against a pinned ProffieOS tag using the existing arduino-cli steps; flip the compatibility row; leave the README claim. On failure, retract the compile+flash headline until fixed.
6. **Dead-code and duplicate pass (S).** Delete the eight orphan components and `BladeBloom`; delete or wire the unreachable emitter classes so there is one emit path per board; route web color math through engine exports.

### 6-month horizon (directional)

- **Decide the product's center of gravity.** The evidence says runtime-presets-first for vendor sabers (89sabers, Sabertrio, KR), with compile+flash as the DIY/stock path once a stock board proves it. README, onboarding, and the compatibility matrix should say that in one place ([W3.3 decision tree](docs/research/V39BT_FLASH_NEXT_STEPS.md)).
- **Bluetooth as SD-swap removal, not a new feature.** Only after verbs are broad and §9 of the BT doc is measured on the bench.
- **Next 14→16 upgrade** as its own release with a rewritten plan; freeze feature work for it.
- **ProffieOS 8 position.** Pin a tested OS tag per delivery path; add an OS-8 row to the matrix even if TBD.
- **Community channel.** GitHub has produced nothing in four months; a Crucible thread or a Reddit follow-up with a real-saber GIF of the runtime path (still open in `LAUNCH_ASSETS.md` as the "single most impactful asset") is the cheapest way to get any prioritization signal. Revisit the closed-PR policy at the same time.
- **Defer** mobile shell migration, Crystal Vault, and multi-board expansion until a user asks.

---

## 4. Open questions for Ken

1. **Is KyberStation's primary promise "design → your vendor saber's SD card" or "generate firmware"?** This decides whether recommendation 2 or 3 goes first and how the README leads.
2. **Will you buy a stock V3.9 (~$80)?** It is the only experiment that can make the compile+flash claim true or false without opening the chassis.
3. **Will the V3.9-BT chassis be opened for ST-Link in the next six months?** If not, custom flash on BT chassis should be written off in the docs rather than carried as "blocked."
4. **Upgrade or freeze the web stack?** Next 16 + React 19 now (2–3 sessions, before more features accrue on 18), or accept an unpatched Next 14 for another cycle on the static-export argument.
5. **Where should feedback arrive?** GitHub has had zero engagement; if the audience is on Crucible/Reddit/Discord, the "feedback welcome" posture needs to live there, and the outside-PR policy (revisit was due 05-31) needs a decision either way.

---

## 5. Verification notes (added 2026-09-24 by the main session)

Before planning against this report, its load-bearing claims were re-checked against the code at `f4acb55`:

- **Confirmed:** `useBladeEngine.ts` forces `'proffie'` unless raw code is imported, and template-eval is reached only through the Hardware Preview default; `TemplateEvalBridge.triggerEffect` never sets `lockupType` and ignores `_extendProgress`; zero references to `presets.tmp` in `apps/web` or `packages/`; `BaseEffect.trigger` stamps `performance.now()` while `BladeEngine` subtracts it from simulated time; `AppShell` and `WorkbenchLayout` each call `useBladeEngine()`; every package's `lint` script is an `echo` placeholder that CI runs; `certs/localhost-key.pem` is tracked; the public matrix row recommended compile + flash on the V3.9-BT; Wave 8's `ButtonRoutingSubTab` is mounted; the eight orphan editor components have zero importers.
- **Correction — `BladeBloom`:** it is not orphaned (three importers). It stays on the backlog as a separate deprecation-soak item.
- **Correction — V3.9-BT attempt count:** 11 custom builds have failed, not 9. The 2026-05-18/19 session (W2-prime-bis: Bank-2-only flash; W2-prime-tris: Bank-1 flash with a 256K-constrained link) was written up but sat uncommitted in a sibling worktree when this audit ran. It is now at [`SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md`](SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md), and its gitignored bench artifacts were copied into the main checkout's `backups/`.
- **Idle time** is computed to the actual audit date (2026-05-18 → 2026-09-24 = 129 days).
- **Runtime verb signatures** cited in §2.4 were re-read from the local ProffieOS v7.12 source (`styles/style_parser.h` `named_styles[]`, the same version as the V3.9-BT factory firmware) rather than upstream master.

The resulting plan is [`../DEVELOPMENT_PLAN_2026-09.md`](../DEVELOPMENT_PLAN_2026-09.md).
