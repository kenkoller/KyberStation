# Next Session — Hardware Profiles MVP (v0.17)

**Paste the block below verbatim into a fresh Claude Code session** to pick up the v0.17 hardware-compatibility work after the 2026-05-14/15 V3.9-BT bench session.

---

## Paste-ready prompt

> Context handoff from 2026-05-14/15 V3.9-BT hardware bench session.
>
> **Branch:** `claude/affectionate-yalow-3a35d5` (5 commits past main: `e22cafb`, `e5cc09b`, `c675bff`, `4c8d37b`, `61e5eeb`). Saber is at factory state. Branch is recoverable from origin.
>
> **What's true:**
> 1. KyberStation has never confirmed end-to-end successful boot of user-facing codegen on real Proffieboard hardware. The 2026-05-14 V3.9-BT bench tried two flash attempts (KyberStation defaults, then factory-matched config from CCSabers' published 89sabers V3.9 pack) — both failed to boot. Recovery from backup worked. Detail in [`docs/archive/SESSION_2026-05-14_V39BT_BENCH.md`](SESSION_2026-05-14_V39BT_BENCH.md).
> 2. The systemic root cause: KyberStation defaults assume stock Proffieboard V3 single-blade, but real users have vendor chassis (89sabers, Sabertrio, KR Sabers, etc.) with non-stock topology. Full analysis in [`docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md`](../research/HARDWARE_COMPATIBILITY_STRATEGY.md). Read that doc end-to-end before starting work.
> 3. v0.17 sprint priority is now **Hardware Profiles MVP** — promoted to #1 in [`docs/POST_LAUNCH_BACKLOG.md`](../POST_LAUNCH_BACKLOG.md), ahead of Visualizer Phase 2C / Crystal Vault / mobile shell which are polish. Bluetooth is explicitly deferred — not in v0.17 scope.
> 4. Hardware/tooling for the session: `dfu-util 0.11+` installed; `arduino-cli` with `proffieboard:stm32l4` core 4.6 installed; `~/ProffieOS` clone at tag `v7.12`. The new 89sabers V3.9-BT board (chip serial `2068308F3830`) is the test bench. Factory backup at `/Users/KK/Development/KyberStation/backups/89sabers-v39bt-factory-2026-05-14/` (SHA-verified). The old 89sabers V3.9 (chip serial `2081399A4B30`) is parked — chip alive but chassis hardware can't drive output even with known-good firmware.
>
> **Goal of this session:** ship Phase 1 of the Hardware Profiles MVP. Don't try to do all of v0.17 in one session — chunk it.
>
> **Phase 1 — package stub + first profile (~3-4 hours, no codegen wiring yet):**
> 1. Create `packages/hardware-profiles/` workspace package. Mirror the layout from `packages/codegen/` or `packages/presets/` — same pnpm/tsconfig/vitest scaffolding.
> 2. Implement `HardwareProfile` interface per [`HARDWARE_COMPATIBILITY_STRATEGY.md`](../research/HARDWARE_COMPATIBILITY_STRATEGY.md) §4 ("Data model"). Include `BladeSpec` and provenance fields (`source`, `validatedBy`, `notes`).
> 3. Create `profiles/` directory with **two** seed YAML manifests:
>     - `stock-proffieboard-v3.yaml` — mirror KyberStation's current hardcoded defaults exactly. This is the validation reference; if our codegen ever boots on a stock V3 board (which it might, we just haven't tested it), this is the profile that proved it.
>     - `89sabers-v3.9.yaml` — populate from the 11 configs in the CCSabers pack at `/tmp/89sabers-config-download/` (still on disk from the bench session; re-download from [CCSabers tutorial](https://www.ccsabers.com/blogs/tutorials/ccsabers-89sabers-proffieboard-v3-9-config-files-full-os-7-12-pack) if cleaned up). Use `89V3_allfont.h` as the source of truth: `NUM_BLADES=2`, 128-LED main blade on `bladePin` with `PowerPINS<bladePowerPin2, bladePowerPin3>`, 30-LED crystal chamber on `blade2Pin` with `PowerPINS<bladePowerPin4, bladePowerPin5>`, `VOLUME=1800`, `CLASH_THRESHOLD_G=4.5`, `ORIENTATION ORIENTATION_USB_TOWARDS_BLADE`, `ENABLE_SERIAL`, all the `FETT263_*` gesture defines, `MOTION_TIMEOUT 60 * 3 * 1000`.
> 4. Export a typed loader: `byId(id: string): HardwareProfile`, `byVendor(vendor: string): HardwareProfile[]`, `all(): HardwareProfile[]`.
> 5. Vitest unit tests: each profile parses cleanly, required fields are present, every `BladeSpec.dataPin` is one of the known macros, role counts make sense (exactly one `main` per profile).
> 6. **Do not wire into codegen yet.** This phase is data-only. The package compiles, the tests pass, but nothing in the editor changes.
>
> **Out of scope for this session:**
> - UI chassis picker (Phase 2)
> - `codegen-adapter.ts` wiring from `HardwareProfile` → `ConfigOptions` (Phase 2)
> - `zipExporter.ts` modification (Phase 2)
> - StatusBar chip + export-time guard (Phase 2)
> - Live hardware flash test (Phase 3 — needs the chassis picker to land first)
>
> **Also out of scope:**
> - Bluetooth work. The 2026-05-14 BLUETOOTH_FEASIBILITY.md §9 captured advertising + USB CDC baseline; that's enough until full BT work begins, which is post-v0.17. Don't be tempted by the deferred items in the BT entry of `POST_LAUNCH_BACKLOG.md`.
>
> **What good looks like at end of session:**
> - New `packages/hardware-profiles/` is in the workspace graph (`pnpm install` clean, `pnpm build` clean, `pnpm test` clean across all packages, `pnpm typecheck` clean).
> - Two profile YAMLs land with provenance comments.
> - Tests pass.
> - PR opened against main. The PR description states: "This is Phase 1 of the v0.17 Hardware Profiles MVP. No user-visible changes. Lays the data foundation for Phase 2 (codegen + UI wiring)." Reference `HARDWARE_COMPATIBILITY_STRATEGY.md`.
>
> **Process notes:**
> - Follow CLAUDE.md collaboration defaults: commit on feature branch, push, open PR. Don't merge to main; let Ken review.
> - When in doubt about a profile field, default to "vendor-confirmed" → `community-validated` → `community-submitted` → `experimental` provenance levels. Tonight's 89sabers data is community-validated at best (came from a reseller's published pack, not 89sabers directly).
> - Run `pnpm test` and `pnpm typecheck` before pushing; they're gating per CLAUDE.md.
>
> Start by reading the strategy doc end-to-end, then `SESSION_2026-05-14_V39BT_BENCH.md` for the failure context. Then write up your phase 1 plan (which agents you'll spawn, file paths you'll touch) and confirm with Ken before starting implementation.

---

## How to use this prompt

1. Open a new Claude Code session in the KyberStation repo on the `claude/affectionate-yalow-3a35d5` branch (or merge it to main first and start fresh from main).
2. Paste the block above as the first message.
3. Claude will read the strategy doc + session log, then propose a Phase 1 plan and ask for your confirmation.

## Why this works

The prompt is self-contained — it gives a fresh Claude session everything it needs:
- **Branch state** (so it doesn't try to recompose work that's already committed)
- **Anchored docs** (so it reads the strategy + session log before coding)
- **Clear phase boundary** (so it doesn't try to do all of v0.17 in one session)
- **Specific scope** (so it doesn't drift into BT or other distractions)
- **End-of-session criteria** (so you can verify it actually delivered)
- **CLAUDE.md compliance reminders** (commits, tests, typecheck, branch protection)

## After Phase 1 lands

Two more sessions to plan for after the package stub merges:

**Phase 2 (~1 week):** codegen adapter + UI chassis picker + zipExporter wiring + StatusBar chip + export-time guard. The big "user-visible change" milestone.

**Phase 3 (~2-3 days):** live hardware flash test on the V3.9-BT bench using the new pipeline. This is where we find out whether Phase 1+2 actually solved the boot-loop problem from 2026-05-14 — or whether there's a deeper codegen-correctness issue (e.g., the `AudioFlicker` masking pattern hand-patched out of the 2026-04-27 modulation test). If Phase 3 reveals codegen issues beyond profiles, that's a v0.17.5 patch sprint focused on the emitter, not the data layer.

Each phase is one focused session. Don't combine them.
