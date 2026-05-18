# Session 2026-05-17 — V3.9-BT Custom-Flash Feasibility Audit + Doc/App Sweep

**Worktree:** `.claude/worktrees/relaxed-kirch-ab37ca`
**Branch:** `claude/relaxed-kirch-ab37ca`
**Session scope:** deep-dive audit of whether KyberStation can reliably flash custom firmware to the 89sabers V3.9-BT bench board → update documentation and app claims to match → write R&D next-steps plan → prep for archival 2026-05-18.

---

## What landed in this worktree

### New documents

1. [`docs/research/PROFFIE_V39BT_FLASH_FEASIBILITY.md`](../research/PROFFIE_V39BT_FLASH_FEASIBILITY.md) — the audit itself. Executive summary, evidence section, 5 ranked root-cause hypotheses (H1: Bank 1 is a custom 89sabers loader with a validation check is the leading hypothesis), recommended protocol, decision matrix, open questions / future experiments. Also has a 2026-05-18 postscript section that folds in the four developments documented after the original 2026-05-17 write.
2. [`docs/research/V39BT_FLASH_NEXT_STEPS.md`](../research/V39BT_FLASH_NEXT_STEPS.md) — R&D plan with three workstreams (W1 no-hardware, W2 hardware-purchases, W3 docs hygiene). 2026-05-18 update at the top reprioritizes given the new constraints; original plan body preserved for audit trail.
3. [`docs/archive/SESSION_2026-05-17_V39BT_FLASH_AUDIT.md`](SESSION_2026-05-17_V39BT_FLASH_AUDIT.md) — this file.

### Modified documents (claims now match the audit posture)

4. [`README.md`](../../README.md) — top-level "Export flashable ProffieOS firmware (validated end-to-end)" narrowed to "stock Proffieboard V3" with explicit V3.9-BT caveat pointing at the audit.
5. [`docs/FLASH_GUIDE.md`](../FLASH_GUIDE.md) §10 — split into a new "V3.9-BT — custom flashing is currently not reliable" subsection + the legacy non-BT section marked historical.
6. [`docs/HARDWARE_VALIDATION_TODO.md`](../HARDWARE_VALIDATION_TODO.md) — 2026-04-20 "validated" header correctly footnoted as on the now-retired non-BT board; V3.9-BT runtime-preset validation called out separately.
7. [`docs/PROFFIEOS_FLASHING_GUIDE.md`](../PROFFIEOS_FLASHING_GUIDE.md) — intro adds the V3.9-BT caveat + runtime-preset pointer.
8. [`docs/WEBUSB_FLASH.md`](../WEBUSB_FLASH.md) — validated-hardware table replaced; explicit V3.9-BT row added with ❌ + audit link; previous validated row correctly marked "board retired 2026-05-01."
9. [`docs/BOARD_COMPATIBILITY_ROADMAP.md`](../BOARD_COMPATIBILITY_ROADMAP.md) — board status table now distinguishes stock Proffieboard / 89sabers V3.9-BT / 89sabers V3.9 non-BT (historical) / Sabertrio + KR (projected).
10. [`docs/POST_LAUNCH_BACKLOG.md`](../POST_LAUNCH_BACKLOG.md) — 2026-05-17 audit row pinned at top of "What's open"; new V3.9-BT flash R&D row added to the Recommended Next Sequence.
11. [`docs/research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md`](../research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md) — new "External writers MUST write both `.ini` and `.tmp`" rule (per the 2026-05-17 deploy-bug observation).
12. [`CHANGELOG.md`](../../CHANGELOG.md) `[Unreleased]` — documents the doc + UI sweep + audit + scripts.
13. [`CLAUDE.md`](../../CLAUDE.md) — "Current State" header replaced with 2026-05-17 audit posture; prior "v0.21.1 Polyglot Release cut" content moved under "Prior State."

### Modified app UI (claims surfaced to users)

14. [`apps/web/components/editor/FlashPanel.tsx`](../../apps/web/components/editor/FlashPanel.tsx) — new red-tier "89sabers V3.9-BT owners — please read" disclaimer block above the experimental warning, pointing at the audit and recommending the Card Writer. Other-vendor warning split out into its own amber-tier block.
15. [`apps/web/components/landing/LandingBetaNotice.tsx`](../../apps/web/components/landing/LandingBetaNotice.tsx) — value-strip bullet for "Proffieboard V3 compile + flash" now caveats V3.9-BT.
16. [`apps/web/components/editor/CompatibilityPanel.tsx`](../../apps/web/components/editor/CompatibilityPanel.tsx) — help tooltip + footer paragraph both reflect runtime-preset path for SAVE_PRESET vendor chassis + V3.9-BT custom-flash caveat.

### New helper scripts

17. [`scripts/hardware-test/restore-factory.sh`](../../scripts/hardware-test/restore-factory.sh) — SHA256-gated dual-bank restore from the May 14 backup. Refuses to write if the backup hashes don't match the documented fingerprints. Does not touch Option Bytes or OTP.
18. [`scripts/hardware-test/safe-flash.sh`](../../scripts/hardware-test/safe-flash.sh) — guarded custom-flash wrapper that requires `--i-know-this-is-experimental`, requires a fingerprint-matched backup, defaults the warning rail toward Bank 2 (where factory ProffieOS lives), and prints the recovery command before touching anything.

### Memory written

- `project_v39bt_custom_flash_blocked_2026-05-17.md` — the canonical "do not flash V3.9-BT custom; use runtime presets" rule.

### Memory written after this session began (relevant for next session)

- `reference_proffieboard_hardware_access_2026-05-17.md` — front-side-only constraint on the bench board.
- `reference_proffieos_runtime_verbs_v39bt.md` — 8 runtime verbs validated.
- `reference_runtime_preset_double_buffer.md` — `.ini` + `.tmp` deploy rule (incident observed 2026-05-17).
- `reference_89sabers_ccsabers_contacts.md` — vendor outreach succeeded; 89Sabers shared factory config.

---

## What the audit concluded

**Custom firmware flashing on the 89sabers V3.9-BT is not reliable today and should not be a user-facing workflow.** Eight attempts across two bench sessions (2026-05-15 and 2026-05-17) all failed. Forensic analysis of `backups/89sabers-v39bt-factory-2026-05-14/` shows:

- Bank 2 (physical, 256 KiB at `0x08040000`): 78 KiB of factory ProffieOS firmware. Contains "ProffieOS" + "89sabers-config.h" + "Fett263Buttons" + font/track strings.
- Bank 1 (physical, 256 KiB at `0x08000000`): fully populated 256 KiB of dense binary, only 15 long ASCII strings, no ProffieOS markers. Likely a custom 89sabers loader / coprocessor blob / BT firmware blob.
- OB fingerprint `4c2b2194…` confirms documented "V3.9-BT pristine" state (FLASH_GUIDE §10).
- Empirical pattern: full dual-bank restore → boots. Custom single-bank → silent. Means **the boot chain requires both banks intact**, and Bank 1 isn't reproducible from public sources.

**Recommended path until further notice:** runtime presets via `proffie_runtime` board mode (PR #325). Bench-validated 2026-05-16. Covers ~95 % of the v0.17 "design preset → put on saber" pitch via 8 runtime verbs. Flash-only gap is well-defined: motion-reactive AST shapes (BladeAngle / SwingSpeed / twist), slow time-based modulation, custom `Layers<>` / `Stripes<>` / `BumpPositionPredictable<>` animations.

---

## What the next session should do (priority order)

The R&D plan at [`docs/research/V39BT_FLASH_NEXT_STEPS.md`](../research/V39BT_FLASH_NEXT_STEPS.md) covers this in depth. Highlights:

1. **W1.1 — Preset coverage analysis (no hardware, ~3-4 h, highest leverage).** Walk all 455 gallery presets; classify each as translatable to one of the 8 verified runtime-preset verbs vs. flash-only. Output is the count for product strategy and the explicit list of flash-only presets to surface in the deliverability UI.
2. **NEW W2-prime — Compile + flash 89Sabers' factory source (no ST-Link needed).** 89Sabers shared the factory `89sabers-config.h` 2026-05-17/18. Compiling against ProffieOS 7.12 + matching Proffieboard core and attempting a single-bank Bank-2 flash is the cheapest discrimination test for the audit's H1 (Bank 1 loader gate) vs. H4 (toolchain skew) hypotheses. **Gated on the USB-only DFU recovery sequence being verified first** — front-side-only access means if the flash fails badly, recovery is limited to `scripts/hardware-test/restore-factory.sh`. Validate that script end-to-end before any custom flash attempt.
3. **CardWriter double-buffer fix.** Check `apps/web/lib/zipExporter.ts` + `apps/web/components/editor/CardWriter.tsx`: do they write both `presets.ini` AND `presets.tmp` to the SD card? Memory [`reference_runtime_preset_double_buffer.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_runtime_preset_double_buffer.md) documents a real deployment bug where deploying only `.ini` silently reverted to factory presets. Small high-leverage PR if the UI isn't already doing it.
4. **W1.2 — Deliverability "flash-only" tier UI.** Once W1.1 has the list of flash-only presets, surface them explicitly in the CardWriter panel with a chassis-aware message rather than silently dropping them.
5. **W2.2 (ST-Link) — BLOCKED** until chassis-open window. Don't propose hardware steps that need backside access (BOOT0, BFB2, ST-Link pads) — board is hilt-mounted, front-side-only. Memory: [`reference_proffieboard_hardware_access_2026-05-17.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_proffieboard_hardware_access_2026-05-17.md).

---

## State of the worktree at session end

- **Branch `claude/relaxed-kirch-ab37ca`** — pushed to origin at session end. 11 commits behind `origin/main` at session start; not rebased. (No conflicts expected — the audit work doesn't overlap with main's recent merges, but a `git pull --rebase` or merge from main is recommended before turning this into a PR.)
- **Worktree path:** `/Users/KK/Development/KyberStation/.claude/worktrees/relaxed-kirch-ab37ca/`
- **No PR opened.** Per the user's intent for this session ("make ready to be archived"), the work is pushed but not promoted to a merge-ready PR. The next session can pick up from the branch, rebase, and open a PR when ready.
- **Bench board state:** factory firmware restored, healthy (per the 2026-05-17 session end-state in [`SESSION_2026-05-15_V39BT_BENCH.md`](SESSION_2026-05-15_V39BT_BENCH.md) end-state).
- **`backups/89sabers-v39bt-factory-2026-05-14/`** — the only known recovery image for this board. Lives in the main checkout, not the worktree (worktree git status doesn't see it).

---

## Open follow-ups (small, can be picked up any time)

- Push `backups/89sabers-v39bt-factory-2026-05-14/` to a private GitHub release as a redundancy mechanism (W1.4 in the next-steps plan).
- Email is the audit-trail mode for vendor outreach — keep the `89sabers-config.h` 89Sabers shared somewhere durable (not just in `~/Downloads`). Suggest committing the file under `docs/research/vendor-configs/` with a vendor-attribution README if license terms allow, or keeping it in a private mirror if not.
- The `node_modules` symlink in the worktree (added 2026-05-17 to enable typecheck) was removed at session end.
- Run `pnpm test` from main before the next session — the audit didn't change anything that should break tests, but the merge-from-main step could introduce drift; clean baseline matters.

---

## Pointers for the next session prompt

```
You're picking up from worktree .claude/worktrees/relaxed-kirch-ab37ca (branch claude/relaxed-kirch-ab37ca).
Read docs/archive/SESSION_2026-05-17_V39BT_FLASH_AUDIT.md for context.
The two driving docs are docs/research/PROFFIE_V39BT_FLASH_FEASIBILITY.md and
docs/research/V39BT_FLASH_NEXT_STEPS.md. Branch is pushed to origin; rebase on main before
opening a PR. First task: choose one of W1.1 / W2-prime / CardWriter-double-buffer-fix
per the next-steps plan, and execute it. The factory config 89Sabers shared 2026-05-17/18
is the unlock for W2-prime — check ~/Downloads (or wherever Ken filed it) for the actual file.
```
