# Next Session — ProffieOS Runtime Presets (SD-card path)

**Goal:** Deliver KyberStation's "design presets → put them on the saber" pitch via the **SD-card runtime-preset path**, sidestepping the firmware-flash problem entirely.

**Context:** Read [`docs/archive/SESSION_2026-05-15_V39BT_BENCH.md`](SESSION_2026-05-15_V39BT_BENCH.md) end-to-end before doing anything else. The key discovery from that session: 89sabers V3.9-BT factory firmware loads presets from the SD card at runtime, not from `config.h`. Re-flashing isn't needed to change presets. This pivots the v0.17 product direction.

---

## Hardware state at start of session

- **89sabers V3.9-BT** (chip `2068308F3830`) restored to factory firmware. USB CDC enumerates as `Proffieboard`. Operating normally.
- **Old 89sabers V3.9 non-BT** (chip `2081399A4B30`) flash-degraded. Don't rely on it for testing. Backup at `backups/89sabers-v39-old-2026-05-15/bank1-pre.bin`.
- **No ST-Link clone yet** — order one ($8 Amazon V2 clone) for future deep-debug needs but not required for this session.
- **Toolchain present**: `arduino-cli` 1.4.1, `dfu-util` 0.11, ProffieOS clone at tag `v7.12` at `~/ProffieOS/`, Proffieboard core 4.6.

---

## Phase 1: Reverse-engineer the preset file format (~half-day)

Modern ProffieOS with `SAVE_PRESET` defined writes preset data to the SD card so changes survive power cycles. The 89sabers V3.9-BT factory firmware uses this. We need to know the exact filename + schema.

**Reading list (start here):**

- `~/ProffieOS/common/saber_base.h` and `saber_base_passthrough.h` — preset state struct
- `~/ProffieOS/common/preset.h` (or similar) — preset definition
- `~/ProffieOS/common/save_state_file.h` — file I/O for saved state
- `~/ProffieOS/styles/builtin/*.h` — what "builtin N M" means in the preset list output
- Any file with `SAVE_PRESET` or `SAVE_STATE` in it: `grep -r SAVE_PRESET ~/ProffieOS/`

**External references:**

- ProffieOS Wiki: https://pod.hubbe.net/sound/changing-preset-on-startup.html (referenced in the saber's serial output)
- ProffieOS Workbench discussion: https://crucible.hubbe.net/t/presets-ini-edit-mode-proffieos-workbench-and-static-configs/2526

**Empirical approach if source-reading is slow:**

1. Plug in the V3.9-BT board. Confirm USB CDC enumerates.
2. Find the serial command that switches the chip from CDC mode to MSC (mass storage). Likely `msc`, `mount_sd`, or similar — try `help` first.
3. Once SD card mounts as a USB drive on the Mac, browse for files. Look for `.ini`, `.txt`, `presets.*`, `saved*`, `preset.h`, anything that looks like preset data.
4. Read the file. The format should be self-evident from the existing entries (we saw the in-memory representation already: `FONT=...`, `TRACK=...`, `STYLE1=builtin N M`, `NAME=...`, `VARIATION=N`).

**Deliverable from Phase 1:** A short doc (`docs/research/PROFFIEOS_RUNTIME_PRESET_FORMAT.md`) describing:
- File name + path on the SD card
- Format schema (one preset per record? INI sections? line-delimited?)
- How `STYLE1=builtin N M` maps to compiled-in style indices (where does ProffieOS expose this mapping?)
- Whether the file is human-editable or has checksums / binary fields
- Whether changes are picked up on reboot or require a serial reload command

---

## Phase 2: KyberStation export adapter (~1 day)

Add a new export mode to KyberStation: **"ProffieOS Runtime Presets (SD card)"**.

**Suggested location:** `apps/web/lib/zipExporter.ts` already has multi-board export logic (Proffie, CFX, GHv3, Xenopixel). Add a new path: when the user picks "ProffieOS Runtime" as the export target, emit the SD-card preset file directly (no `config.h`, no compile step).

**What it needs to produce:** Given KyberStation's current `presetListEntries` from `usePresetListStore`, emit a file in the format identified in Phase 1.

**Limitation that must be surfaced to the user:** The runtime path can only reference styles that are **compiled into the user's factory firmware**. KyberStation can offer to design colors / effects / ignition timing / font assignment / preset names, but cannot add a new blade-style algorithm via this path. UI should make this clear (probably a "runtime export" vs "full flash" choice when the user clicks Export).

**Tests:** Unit test that a generated file matches the expected schema for the seed presets we ship (Obi-Wan, Vader, etc.). No hardware test gate needed for the unit-test pass.

---

## Phase 3: End-to-end hardware validation (~1 hour bench session)

Plug in V3.9-BT. With KyberStation:

1. Design one trivial test preset (e.g. solid blue blade with a specific color, distinctive name "KyberStation Test Phase 3").
2. Export via the new "ProffieOS Runtime" mode → download a file.
3. Switch the saber to USB MSC mode (button combo or serial command from Phase 1).
4. Drop the file onto the SD card.
5. Eject the SD card / safely disconnect.
6. Reboot saber.
7. Verify the test preset appears in `list_presets` over USB CDC.
8. Cycle through presets via main button. Verify the test preset boots / sounds / shows the expected color.

**Success criterion:** A KyberStation-designed preset appears on the saber with the correct color and name, **without re-flashing firmware**.

If this works, **the v0.17 pitch is delivered for this hardware tonight**.

---

## What's explicitly out of scope for this session

- Re-flashing firmware on the V3.9-BT board. We've tried that 6× and ruled out 4 hypotheses (see SESSION log). Not on the critical path for v0.17 anymore.
- Reverse-engineering `89sabers-config.h` source. Same reason.
- Old V3.9 chip recovery. Needs ST-Link, not relevant to this work.
- Stock Proffieboard V3 hardware. We don't own one.
- New blade-style algorithms on hardware. Blocked on firmware flash, which is blocked on V3.9-BT config knowledge.

---

## What the user (Ken) will be able to do after this lands

**Yes:** design custom presets (colors, ignition / retraction timing, blast / clash / lockup colors, font assignment, track file, preset name, variation) in KyberStation's editor, export to a file, drop it onto their saber's SD card, and have it appear as a new preset with no firmware flash needed. **The 95% case.**

**No (without further work):** invent a new blade-style algorithm beyond what's compiled into their factory firmware. That requires the firmware-flash path, which still has the V3.9-BT-config-text gap.

**Realistic v0.17 release notes:** "KyberStation now supports the ProffieOS runtime-preset workflow. For sabers shipped by 89sabers, Sabertrio, KR Sabers, and other vendors that ship with `SAVE_PRESET` enabled, you can design presets in KyberStation, copy the generated file to your saber's SD card, and the new presets appear after reboot. No firmware flashing, no toolchain setup."

---

## Files / paths the next session needs to know about

- [`docs/archive/SESSION_2026-05-15_V39BT_BENCH.md`](SESSION_2026-05-15_V39BT_BENCH.md) — read this first.
- [`docs/research/HARDWARE_COMPATIBILITY_STRATEGY.md`](../research/HARDWARE_COMPATIBILITY_STRATEGY.md) — vendor chassis context.
- [`docs/research/CODEGEN_CORRECTNESS_AUDIT_2026-05-15.md`](../research/CODEGEN_CORRECTNESS_AUDIT_2026-05-15.md) — codegen state.
- [`apps/web/lib/zipExporter.ts`](../../apps/web/lib/zipExporter.ts) — where the new export adapter lands.
- [`apps/web/stores/saberProfileStore.ts`](../../apps/web/stores/saberProfileStore.ts) — where preset-list state lives.
- [`packages/codegen/src/`](../../packages/codegen/src) — existing codegen; mostly unchanged for this work (no `config.h` involved).
- `/Users/KK/ProffieOS/` (outside repo) — ProffieOS source for Phase 1 schema research.
- `~/ProffieOS/config/89V3_allfont.h` + variants — test artifacts from 2026-05-15 session.
- `/Users/KK/Development/KyberStation/backups/89sabers-v39bt-factory-2026-05-14/` — factory backups (Bank 1, Bank 2, OBs, OTP, SHA-verified).

---

## Process notes

- Follow CLAUDE.md collaboration defaults (commit, push, PR; never force-push; never touch Option Bytes without ST-Link recovery path).
- This work pivots the v0.17 narrative substantially. Before merging the export-adapter PR, update `docs/POST_LAUNCH_BACKLOG.md` to reflect the new priority order.
- The session log + this prompt are checked into `docs/archive/`. Once Phase 1 starts, move tracking artifacts into a fresh sprint doc.

---

## Open question worth answering early

When the user designs a preset that references a style KyberStation's editor supports but the factory firmware's compiled-in style bank doesn't have, what do we do?

Three options:
1. Warn the user at export time ("Your factory firmware compiled in styles A/B/C/...; preset uses X which isn't available — output may degrade")
2. Substitute the closest matching builtin style automatically
3. Refuse to export and require the user to pick a compatible style

Recommend option 1 for v0.17 — keeps user agency and surfaces the limitation honestly. The audit-style warning modal pattern from #320 is reusable here.
