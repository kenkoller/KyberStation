# KyberStation Development Plan — Fall 2026

**Written:** 2026-09-24 · **Owner:** Ken Koller · **Status:** Phase 1 in progress

**Inputs:** the [2026-09-24 whole-repo audit](research/AUDIT_2026-09-24_FABLE.md) (claims re-verified against the code, see its §5), the [2026-05-19 V3.9-BT session record](research/SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md), and [`POST_LAUNCH_BACKLOG.md`](POST_LAUNCH_BACKLOG.md).

---

## Where things stand

- **Last release:** v0.23.1 (2026-05-17). No commits between 2026-05-18 and this plan (129 days).
- **One proven way onto a saber:** runtime presets on the 89sabers V3.9-BT, bench-validated through 2026-05-19 with a 22-preset deck. But the app never writes `presets.tmp`, so a firmware-written `.tmp` silently wins over the app's `presets.ini`, and every gallery preset lands as a flat color because the emitter ignores the blade style.
- **Compile + flash:** no unmodified export has been bench-confirmed to boot. The V3.9-BT refused all 11 custom builds, including 89sabers' own source. No stock Hubbe board has been tested.
- **Visualizer:** Hardware Preview (template-eval) is on by default, but lockups render no pixels, chosen ignition/retraction styles aren't drawn, render-mode selection lives in two racing hooks, effects mix wall-clock and simulated time, and desktop runs two engines.
- **Tests:** 8,909 green in ~20 s, but some gates are hollow — the codegen validator can't fail, 214 golden `.cpp` fixtures are never read, and nothing compares the two render paths.
- **Tooling:** `pnpm lint` is an `echo` in every package; the scheduled CodeQL and stale workflows were auto-disabled for inactivity; Next.js 14 is past end of life with open advisories.
- **Docs:** the public compatibility matrix recommended compile + flash on the V3.9-BT (fixed in Lane A); CLAUDE.md listed a shipped feature (Wave 8) as open.

## Principles for this cycle

1. Fix what is actively wrong for users before adding anything.
2. Make the one proven design → saber path broad and honest.
3. Turn "what you see is what the saber does" into a tested property.
4. Cut drag: dead code, stale docs, CI steps that don't check anything.
5. Big bets wait for an explicit decision (see the end of this doc).

---

## Phase 1 — Re-entry sprint (in progress)

Five lanes. B, C and D run in parallel worktrees with disjoint file ownership; A and E run in the main session.

| Lane | Branch | Scope | Status |
|---|---|---|---|
| **A** Hygiene + docs truth | `docs/reentry-hygiene-2026-09` | Compatibility-matrix safety fix; README / FLASH_GUIDE / docs index / CLAUDE.md / backlog refresh; recover the uncommitted 05-19 session record; this plan; CI honesty (drop the no-op lint step, Node 20 → 24); untrack the localhost TLS key | In progress |
| **B** Runtime presets | `feat/runtime-presets-tmp-and-verbs` | Write `presets.tmp` identical to `presets.ini` (ZIP + Write to Card); map blade styles to all ProffieOS 7.12 runtime verbs (`advanced` with real gradients, `unstable`, `fire`, `cycle`, `rainbow`, …) with byte-exact tests; show per-preset fidelity (faithful / approximate / colors only) in CardWriter; measured coverage report | In progress |
| **C** Render parity | `fix/template-eval-render-parity` | Set lockup type on lockup/drag/melt/lightning; map every effect with a ProffieOS equivalent; draw the chosen ignition/retraction under template-eval; one source of truth for render mode; effects on the simulated clock; one engine on desktop; a CI gate rendering every gallery preset under template-eval | In progress |
| **D** Dead code + real gates | `refactor/dead-code-and-codegen-gates` | Remove superseded orphan components (keep and report any worth wiring); make the validator able to fail and run it over all presets; compare the golden `.cpp` fixtures; tighten `synthetic.test.ts` | In progress |
| **E** Usability pass | TBD | Hands-on walkthrough of the main flows (gallery → edit → export to card); fix the friction found, in files no other lane owns | In progress |

**Phase 1 is done when:** all lanes are merged with green CI, the visual changes are checked in a browser, CHANGELOG `[Unreleased]` describes them, CLAUDE.md Current State is re-verified, and v0.24.0 is ready to tag (tagging waits for Ken's OK).

---

## Phase 2 — Next (roughly 2–6 weeks)

Ordered by leverage. **Ken** marks items that need Ken's hands, money, or decision.

1. **Bench session for the runtime path** (**Ken**, ~1 h). One preset per runtime verb on the gray board, plus confirming the `.tmp` fix through the app's Write to Card. Closes Phase 1's hardware loop; the checklist will be in the Lane B PR.
2. **Stock Proffieboard V3.9** (**Ken**, ~$80 + 1 h). Workstream W2.3 in [`V39BT_FLASH_NEXT_STEPS.md`](research/V39BT_FLASH_NEXT_STEPS.md). The only experiment that can make the compile + flash promise true or false without opening a chassis. On success: add a CI job that compiles a generated `config.h` against a pinned ProffieOS tag (the arduino-cli steps already exist in `firmware-build.yml`) and flip the matrix row. On failure: retract the compile + flash headline until it's fixed.
3. **Web stack upgrade as its own release** (L, **Ken** to approve). Next 14 → 16, React 18 → 19, `@react-three/fiber` 9, `drei` 10, and a current Vitest. Next 14 is past its last release with eight open advisories. Rewrite [`NEXTJS_15_UPGRADE_PLAN.md`](research/NEXTJS_15_UPGRADE_PLAN.md) for the 16 jump first, and pause feature work while it's in flight.
4. **Lint + dependency hygiene** (S, **Ken** to approve the lockfile change). Adopt ESLint with the existing `.eslintrc.js` and put `pnpm lint` back in CI; add Dependabot; re-enable CodeQL; turn on strict status checks in the `main` ruleset so a PR green on a stale base can't merge.
5. **Runtime presets, round 2** (M). `builtin N M` color overrides where the factory styles accept args (the "Phase B" deferred in v0.22.0); detect vendor builds that disable the basic parser styles; guard against firmware updates that reshuffle the `builtin` bank.
6. **One "choose your path" page** (S, after **Ken** answers question 1). Consolidate the path guidance spread across README, FLASH_GUIDE, CardWriter and FlashPanel copy (W3.3 in the next-steps doc), and make README and onboarding lead with it.
7. **Vendor outreach, round 2** (**Ken**, 15 min). 89sabers answered once. The specific ask now: is Bank 1 a separate loader or part of one image spanning both banks, and can they share the build's linker script and startup file (or the Bank-1 image)? The 05-19 data gives them a concrete failure to react to.
8. **L7 Reset_Handler experiment** (optional, **Ken** at the bench, ≤ 2 h). Only if continuing V3.9-BT custom-flash R&D is worth it to Ken. Protocol is in the [05-19 session record](research/SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md). Two cheap additions: (a) before touching the startup file, disassemble the factory reset path to confirm what it actually does; (b) when observing a custom flash, also try a full power cycle rather than only `:leave`, which hands off from the ROM bootloader instead of a cold reset. Recovery: `backups/w2prime-bis-prep-2026-05-18/recover-grayboard.sh`.

## Phase 3 — Directional (this quarter)

- **Center of gravity.** The evidence points to runtime presets first for vendor sabers (89sabers, Sabertrio, KR), and compile + flash for DIY and stock boards once a stock board proves it.
- **Bluetooth as SD-swap removal, not a new feature.** The value is pushing presets over BLE instead of pulling the SD card. Only after runtime verbs are broad and §9 of [`BLUETOOTH_FEASIBILITY.md`](research/BLUETOOTH_FEASIBILITY.md) is measured on the bench.
- **ProffieOS 8.** Upstream is at v8.10; the project targets 7.x and `firmware-build.yml` builds master while labeling output `7x`. Pin a tested tag per delivery path and add an OS 8 row to the matrix, even if TBD.
- **Community signal.** Four months public with no issues, discussions, or stars. A Crucible thread or Reddit follow-up with a real-saber GIF of the runtime path is the cheapest way to learn what users want. Revisit the outside-PR policy at the same time.
- **Deferred until someone asks:** mobile shell migration, Crystal Vault panel, multi-board expansion, ST-Link characterization (needs the chassis opened).

---

## Decisions needed from Ken

1. **Primary promise:** "design → your vendor saber's SD card" or "generate firmware"? This sets the README lead, onboarding, and whether Phase 2 item 2 or 5 goes first.
2. **Stock V3.9 purchase** (~$80)?
3. **V3.9-BT chassis:** will it be opened for ST-Link in the next six months? If not, the docs should write off custom flash on BT chassis rather than carry it as "blocked."
4. **Web stack:** upgrade now (2–3 sessions, before more features accrue on Next 14 / React 18), or accept unpatched Next 14 for another cycle on the static-export argument?
5. **Feedback channel and PR policy:** where should feedback arrive, given GitHub has had none? The outside-PR revisit was due 2026-05-31.
6. **Housekeeping approvals** (each is quick; none done without a yes):
   - Re-enable the scheduled CodeQL and stale workflows; add Dependabot; strict status checks.
   - Adopt ESLint (adds dev dependencies to the lockfile).
   - Delete `.git/lost-found` (1.1 GB of dangling objects; history is ~70 MB packed).
   - Clean up stale agent worktrees from May; keep or drop `feat/marketing-site-expansion` and its `KyberStation-mkt` worktree.
   - Delete `feat/blade-renderer-golden-hash` (superseded by #334) and `docs/s1-audit-batch` (content already on main); both hold unique-hash commits, so they need a yes per the collaboration rules.
   - Remove the uncommitted `claude/unruffled-sanderson-957920` worktree once its 05-19 docs are on main (its backups are already copied).

## Keeping this current

Update the Phase 1 table as PRs land. Finished work goes to CHANGELOG; open items go to `POST_LAUNCH_BACKLOG.md`. When Phase 1 closes, re-verify CLAUDE.md's Current State against the code rather than against this doc — state docs written from memory are how Wave 8 stayed "open" for four months after it shipped.
