# Next Session Handoff — 2026-05-17

**Cut at end of 2026-05-17 session.** Paste verbatim into a fresh Claude Code session at `/Users/KK/Development/KyberStation/` and the agent has everything needed to pick up cleanly.

---

## TL;DR

- Main is at `e3f0888` (or later — fetch first). **v0.23.1 tag is the latest release.**
- 33 PRs landed last session including full Visualizer Upgrade arc (Phases 2C, 2D, 3), Wave 8 button routing, Hardware Compatibility foundation docs, and the first real vendor profile (89sabers V3.9-BT).
- One thing is **pending physical bench validation:** the 89sabers V3.9-BT profile (PR #360) ships with emit-verified config.h but real-hardware boot was not re-tested. The 2026-05-14 bench attempt boot-looped due to a residual delta in vendor source.
- No open PRs. Everything that was started this session shipped.

---

## What shipped last session (2026-05-17, 33 PRs)

| Group | PRs | What |
|---|---|---|
| Polyglot Audit Sprint (v0.22.1) | #331-#346 | Gallery accuracy audit (455 presets, 296 PASS / 159 FLAG), 6 real bugs fixed, 60+ stub descriptions enriched, multi-board codegen matrix, sound-font silent-failure pre-check, Xenopixel emitter-class adoption (27 styles unblocked), EMIT_PARSER_AUDIT closeout, renderer extraction (4 modules from BladeCanvas), bench validation tooling |
| Visualizer Upgrade (v0.23.0) | #348-#352 | Phase 2C 3D mouse interaction, Phase 2D post-processing (bloom + diffusion + motion blur), Phase 3 template-eval as default render mode (0/455 → 455/455 gallery parse, ~78,000 fps headroom) |
| Wave 8 button routing | #354-#356 | Engine `triggerEvent` binding extension, codegen `EFFECT_*` wrapper emission, UI routing sub-tab on `GestureControlPanel` |
| P0 white-out fix (v0.23.1) | #357 | `InOutTrL.getColor()` returned WHITE in stable-on → Layers compositor reduced every preset to pure white once template-eval became default. Fix: return BLACK (alpha 0). 4 regression tests across template-eval + apps/web. |
| Hardware foundation | #358-#360 | v0.23.1 release tag, `docs/HARDWARE_COMPATIBILITY.md` public matrix + `FLASH_GUIDE.md` §9 boot-diagnostic workflow, **89sabers V3.9-BT chassis profile (first real vendor profile)** |

**Test count:** 3565 → 9000+ workspace tests.
**Release tags pushed:** v0.22.1, v0.23.0, v0.23.1.

---

## Pending — needs YOUR physical involvement

### 1. 89sabers V3.9-BT bench validation

PR #360 added the chassis profile but the emitted `config.h` is **not yet bench-confirmed on real hardware.** Your prior 2026-05-14/15 bench had the chip falling back to DFU mode within milliseconds of `:leave` despite using a factory-matched config. The new profile may or may not boot cleanly — only the hardware knows.

**When you next have hands on the board:**

1. Generate a config via the new vendor profile:
   - Open editor → Chassis picker → `89sabers V3.9-BT`
   - Export ZIP for the `proffie` board target
2. Flash per `docs/FLASH_GUIDE.md`
3. If it boots: update `docs/HARDWARE_COMPATIBILITY.md` row to `✅ (bench-verified <date>)` + add a session recap to `docs/archive/`
4. If it doesn't boot: capture serial logs per `FLASH_GUIDE.md §9` and open an issue with the diff against the vendor source. Diagnosis from there.

Either way, the runtime-presets path (PR #325 + #331) remains the recommended workflow for V3.9-BT users today.

---

## Recommended priorities for the next session

Ranked by user-impact ÷ risk. All have the infrastructure shipped; these are the next concrete builds.

### Top 3

1. **Hardware Profile #2 — next vendor (M, ~1 session).** Pick from the `TBD` rows in `docs/HARDWARE_COMPATIBILITY.md`. Best candidates by likely user volume:
   - **KR Sabers V3** — large user base, modern chassis, likely has `SAVE_PRESET`
   - **Vader's Vault** — premium chassis, well-documented community resources
   - **Sabertrio Standard refinement** — PR #321 stub exists but is partial (only main blade, not all 4); promoting to full profile is a small lift
   
   The 89sabers V3.9-BT profile (`packages/hardware-profiles/src/profiles/89sabers-v3.9-bt.ts`) is the canonical template — mirror its shape, run the test pattern from `packages/hardware-profiles/tests/89sabers-v3.9-bt.test.ts`, update `HARDWARE_COMPATIBILITY.md`.

2. **Factory Config Import (M-L, multi-session per backlog).** Companion to vendor profiles. Users with non-vendor chassis paste their factory `config.h` once; KyberStation preserves `CONFIG_TOP` + `BladeConfig` + prop defines verbatim and emits only the `presets[]` array. Safe-by-default — touches only what's known safe. Unblocks every chassis we don't profile.

3. **Fett263 Prop File Editor Level 3 (XL, evaluate community demand).** Visual state machine → compilable `*_buttons.h`. Wave 8 (Levels 1+2) shipped this session, so Level 3 is the natural next escalation. Backlog says "evaluate community demand" — if nobody's asking for it, deprioritize in favor of more chassis profiles.

### Smaller wins if you want quick PRs

- **`BladeBloom.tsx` deletion** (S, ~20 min). `PolycarbonateDiffusion` replaced it in PR #349 with a backward-compat shim. After soak period, delete the legacy file + remove the 6 tests pinning the deprecated component.
- **`<HiltMesh>` extraction from `BladeCanvas3D.tsx`** (S, mechanical). Tracked in backlog since v0.12.0. Pure refactor.
- **Phase B color override for runtime presets** (M). Emit `style=builtin N M R,G,B …` with positional args mapping to compiled style's `RgbArg<N>` slots. Needs per-chassis schema validation, but the 89sabers V3.9-BT profile (with the runtime presets bench-validated state from #331) is the validation target.

### Polish / UX-blocked items

These need your UX call before they ship:
- Crystal Vault panel + Re-attunement UI (entry-point shape: header button vs sidebar entry vs `/vault` route)
- Mobile shell migration to Sidebar + MainContent (drawer vs bottom-sheet at 375px)

### Active risk to monitor

- **Visualizer Phase 3 / template-eval as default.** PR #352 flipped the engine default. The P0 white-out fix in PR #357 closed the known regression, but this is a meaningful behavioral shift. **Watch for any user reports** of preset rendering looking subtly different than pre-v0.23 (parameter-engine path). If anything surfaces, the fall-through to parameter-engine still works — but the gap may indicate template-eval not handling a style correctly.

---

## What NOT to do

- **Don't revert any of the visualizer-upgrade PRs** wholesale (#348, #349, #350, #351, #352). Phase 3 is the headline feature of v0.23.0 — find specific fixes, don't roll back.
- **Don't speculate on chassis pin maps** without bench evidence. The 89sabers V3.9-BT profile was conservative for this reason — sensible defaults + TODOs where the bench recap didn't have specifics.
- **Don't force-push or `--no-verify`** anywhere per CLAUDE.md collaboration defaults.
- **Don't push to main directly** — branch protection is on; auto-merge is the path.

---

## Starting the next session

```bash
cd /Users/KK/Development/KyberStation
git fetch origin --prune --tags
git checkout main
git pull --ff-only
git log -5 --oneline   # should show v0.23.1 region

# Verify nothing's open
gh pr list --state open

# Verify tests green from main
pnpm typecheck && pnpm test
```

Then paste the next-direction question to yourself + pick from the priority list above.

---

## Background context that doesn't need re-explaining

- **The smoking-gun saga** (2026-05-15/16): 6h bench session that found ProffieOS's `RgbArg<>` parser stores `Color16(0-65535)` while KyberStation was emitting 0-255. Fixed at commit `45737f2`. Lesson captured in `docs/research/EMIT_PARSER_AUDIT.md` + `docs/HARDWARE_FIDELITY_PRINCIPLE.md` audit history.

- **The white-out P0** (2026-05-17): Template-eval `InOutTrL` was returning WHITE in stable-on. Layers compositor reduced every preset to pure white once template-eval became default. Different mechanism, same chain of work as the dim-presets fix — both rooted in the engine→codegen→firmware encoding boundary. Pattern: when shipping a default-mode flip, run a full preset gallery render diff before merging.

- **Wave 8 button routing pattern.** Engine → codegen → UI three-agent partition works well for additive features. A1 must land first (types); A2 + A3 can run in parallel after. Future similar work should follow this shape.

- **Parallel-agent dispatch is high-leverage.** This session shipped 33 PRs largely because the audit + visualizer + Wave 8 work was decomposable into file-disjoint parallel agents. The pattern: scope the work into N file-disjoint slices, dispatch them in parallel with worktree isolation, enable auto-merge on the resulting PRs. Cap at 4 concurrent agents for sanity. Don't try this pattern on UI work that all touches the same component file — sequential is better there.

---

## Files / paths the next session needs to know about

**Current state of the world:**
- `CLAUDE.md` — project context (top-level)
- `docs/POST_LAUNCH_BACKLOG.md` — single source of truth for prioritized work
- `docs/HARDWARE_COMPATIBILITY.md` — public per-chassis matrix (the new community-contributable table)
- `docs/FLASH_GUIDE.md` — flash + recovery + new §9 boot-diagnostic workflow
- `docs/research/EMIT_PARSER_AUDIT.md` — emit↔parser boundary inventory (0 ⚠ Unverified marks remaining)
- `docs/research/MULTI_BOARD_FIELD_COVERAGE_2026-05-16.md` — 103 BladeConfig fields × 5 boards matrix
- `docs/research/TEMPLATE_EVAL_PERF_BENCHMARK_2026-05-16.md` — perf benchmark + findings
- `docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md` — architectural plan for vendor profiles

**Active feature surfaces:**
- `packages/hardware-profiles/src/profiles/89sabers-v3.9-bt.ts` — first real vendor profile, the template to mirror
- `packages/hardware-profiles/src/profiles/sabertrio.ts` (or similar) — partial stub from PR #321
- `packages/engine/src/BladeEngine.ts` — `_renderMode` defaults to `'template-eval'`, parameter-engine fall-through preserved
- `packages/template-eval/src/templates/wrappers.ts` — `InOutTrLTemplate` now returns BLACK in stable-on per P0 fix
- `packages/codegen/src/proffieOSEmitter/mapBindings.ts` + `buttonEventMap.ts` — Wave 8 codegen for triggerEvent bindings
- `apps/web/components/editor/routing/ButtonRoutingSubTab.tsx` — Wave 8 UI sub-tab on `GestureControlPanel`
- `apps/web/components/layout/SoundFontWarningModal.tsx` + `apps/web/lib/soundFontValidation.ts` — pre-flash sound-font check

**Tag history:**
- v0.20.3 → v0.21.1 (Polyglot Release, 118 commits, 2026-05-12)
- v0.21.1 → v0.22.1 (Polyglot Audit Sprint, 16 PRs, 2026-05-16)
- v0.22.1 → v0.23.0 (Visualizer Upgrade, 5 PRs, 2026-05-16)
- v0.23.0 → v0.23.1 (P0 white-out patch, 1 PR, 2026-05-17)

---

## Per-CLAUDE.md collaboration defaults (no need to re-confirm)

- Pre-authorized: local commits on feature branches, push feature branches (not main), open PRs, enable auto-merge with `gh pr merge --auto --merge`
- Never: force-push, modify git config, skip hooks, commit secrets, delete worktree-attached branches
- Test gates before push: `pnpm typecheck` + `pnpm test` both green
- Branch naming: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`, `perf/`, `release/`

---

## If you want to be aggressive

The session-day pattern that worked:
1. Scope a workstream into file-disjoint slices
2. Dispatch parallel agents (cap 4) with worktree isolation
3. Enable auto-merge on each resulting PR
4. Cut a release tag when a coherent group of PRs lands

If the next session wants to ship multiple vendor profiles in one pass, dispatch one agent per chassis (each writes a single `*.ts` file in `packages/hardware-profiles/src/profiles/` + its test). File-disjoint by design.

If you want to be more measured, just pick one vendor + ship it solo. Bench-verify before moving to #3.

---

## What done looks like for this arc

After the next 2-3 sessions following this handoff:
- 3-5 vendor profiles in `packages/hardware-profiles/src/profiles/` (89sabers V3.9-BT + KR + Vader's Vault + Sabertrio refined + maybe stock Hubbe V3.9)
- `docs/HARDWARE_COMPATIBILITY.md` matrix with 3-5 ✅ rows beyond the runtime-presets fallback column
- At least one bench-confirmed profile (V3.9-BT or whichever new one ships first with hardware verification)
- Factory Config Import shipped or in flight, covering the unprofiled chassis safety net
- A v0.24.0 minor bump capturing this hardware-profiles surface

That's the natural end state of the Hardware Profiles MVP arc.
