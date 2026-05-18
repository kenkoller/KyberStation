# 89sabers V3.9-BT — Custom-Flash R&D Next Steps

**Status:** Active plan. Living document. **Updated 2026-05-18** to reflect new constraints (front-side-only hardware access) and new openings (89Sabers shared factory source). See "2026-05-18 update" section below for the deltas to the original 2026-05-17 plan.
**Companion docs:** [`PROFFIE_V39BT_FLASH_FEASIBILITY.md`](PROFFIE_V39BT_FLASH_FEASIBILITY.md) (the audit), [`PROFFIEOS_RUNTIME_PRESET_FORMAT.md`](PROFFIEOS_RUNTIME_PRESET_FORMAT.md) (the working alternative), [`HARDWARE_COMPATIBILITY_STRATEGY.md`](HARDWARE_COMPATIBILITY_STRATEGY.md) (the broader Hardware Profiles direction).
**Owner:** Ken Koller. Plan author: 2026-05-17. Last revision: 2026-05-18.

---

## 2026-05-18 update — three things changed

1. **89Sabers shared their factory `89sabers-config.h`** (W1.3 in the original plan succeeded faster than expected). Outreach sent 2026-05-17, response received 2026-05-17 → 2026-05-18.
2. **Hardware access constraint clarified — front-side-only.** The bench V3.9-BT is in a hilt-mounted chassis; SWD/ST-Link/BOOT0/BFB2 pads on the backside are unreachable without disassembly. W2.2 (ST-Link bench session) is blocked until Ken's next chassis-open window.
3. **8 runtime-preset verbs validated on V3.9-BT firmware** (W1.1 partially answered). Most KyberStation gallery presets are expressible via `advanced` / `unstable` / `fire` / `cycle` / `rainbow`. Flash-only set is well-defined: motion-reactive AST shapes (`Mix<BladeAngle<…>>`, `Mix<SwingSpeed<…>>`, twist-reactive), slow time-based modulation, custom `Layers<>` / `Stripes<>` / `BumpPositionPredictable<>` animations.

**Revised priorities, in order:**

- **NEW W2-prime** — Validate that compiling 89Sabers' factory source against ProffieOS 7.12 + matching Proffieboard core produces a binary that survives a single-bank Bank-2 flash with USB-only DFU recovery staged. This is the cheapest way to test whether toolchain skew (audit hypothesis H4) was the real culprit, vs. a vendor loader / signature gate (H1). Replaces the (blocked) W2.2 ST-Link session as the new highest-leverage experiment. **Important — gated on USB-only recovery sequence working.** Validate `scripts/hardware-test/restore-factory.sh` end-to-end on the bench board *before* any custom flash. If the recovery doesn't work from front-side alone, this experiment is also blocked.
- **W1.1 (preset coverage analysis)** — still highest-value zero-hardware task. With the 8-verb list confirmed, the analysis is now: for each of 455 gallery presets, classify as (a) translatable to one of the 8 verbs, (b) flash-only (motion-reactive / slow-time / custom AST). Output the count for product strategy.
- **W1.2 (deliverability "flash-only" tier UI)** — unchanged. Surface the flash-only presets explicitly in the CardWriter panel rather than silently dropping them.
- **NEW item — CardWriter must write both `presets.ini` AND `presets.tmp`.** Memory entry [`reference_runtime_preset_double_buffer.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_runtime_preset_double_buffer.md) documents a real deployment bug observed 2026-05-17. `apps/web/lib/zipExporter.ts` and `CardWriter.tsx` need to be checked: do they emit both files? If not, this is a small high-leverage PR that fixes silent preset reversion for any user who deploys via SD-card direct write.
- **W2.2 (ST-Link bench session) — BLOCKED.** Until the chassis is opened, this experiment is off the table. Don't burn cycles planning ST-Link procurement yet — wait until either Ken opens the chassis or the W2-prime experiment yields information that makes ST-Link unnecessary.
- **W2.3 (stock Proffieboard reference)** — still useful but lower priority now that we have 89Sabers source. If W2-prime fails, a stock-board control run becomes the next-best discrimination test.

The original 2026-05-17 plan is preserved below for the audit trail. Treat any conflicting recommendation between the 2026-05-18 update and the body below as the 2026-05-18 update winning.

---

---

## What we know

Established by the 2026-05-17 audit:

1. **Runtime presets work** on the V3.9-BT. The `proffie_runtime` board mode validated end-to-end on the same hardware 2026-05-16, loading 15 custom presets via serial without any flashing.
2. **Custom firmware flashing does not work** on the V3.9-BT. Eight independent attempts across two bench sessions failed; only full dual-bank factory restores produce a booting saber.
3. **The factory backup at `backups/89sabers-v39bt-factory-2026-05-14/` is the only known recovery image** for this board. SHA `d881a8e7…` (bank1), `61d9f615…` (bank2), `4c2b2194…` (option bytes).
4. **The boot chain depends on both banks.** Bank 2 has factory ProffieOS strings; Bank 1 has 256 KB of dense vendor content with no plaintext ProffieOS strings — likely a custom 89sabers loader.
5. **We can't characterize Bank 1 further without ST-Link/SWD.** USB DFU shows us bytes, not what executes when.

## What we want

Two outcomes, in priority order:

- **A.** Confidence in our current posture: runtime presets is the right primary path for BT-equipped vendor chassis, and we're not over-promising or silently dropping things users care about.
- **B.** (Stretch) Reliable custom-firmware flashing on the V3.9-BT, unlocking the ~5 % of preset designs that runtime presets can't carry (Showcase / Kinetic gallery, brand-new blade-style algorithms beyond the factory bank).

Outcome A is achievable in the next two sessions without any hardware purchases. Outcome B requires either ST-Link arrival or vendor cooperation.

---

## Workstreams

### W1 — Outcome A: validate the runtime-preset posture (no hardware purchases)

#### W1.1 — Preset coverage analysis ⚡ start here

**Question:** Of the 455 gallery presets, how many use AST shapes that the `advanced` verb + `builtin N M` overrides can express? How many are flash-only?

**Method:**
1. Walk `packages/presets/src/**/*.ts` and `packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`.
2. For each preset, classify whether its `StylePtr<…>()` template can be encoded as:
   - `style=builtin N M` — references factory style bank (Phase A)
   - `style=builtin N M R,G,B …` — Phase B, when factory style accepts `RgbArg<>` slots
   - `style=advanced R,G,B R,G,B …` — Phase C, 11-slot parameterized blade
   - **Flash-only** — uses `Layers<Mix<SwingSpeed<…>>>`, `RotateColorsX<>`, modulation routing, custom AST shapes not representable in the runtime parser
3. Tabulate by gallery section (canon-era, animated, legends, pop-culture, creative-community, kinetic, showcase).
4. Report: count + percentage in each bucket, plus a list of representative flash-only presets per bucket.

**Output:** `docs/research/RUNTIME_PRESET_COVERAGE_2026-MM-DD.md` with the table and the flash-only-preset list.

**Implication for product:**
- If <5 % are flash-only → runtime presets is clearly the right primary path; surface the 5 % in the deliverability summary as "requires firmware flash, not currently supported on V3.9-BT".
- If 5–20 % are flash-only → still right primary, but ST-Link bench session becomes more urgent.
- If >20 % flash-only → there's a real product gap; ST-Link must move to top priority.

**Effort:** ~3–4 h. Single-session, single-developer, no hardware. **Highest leverage thing we can do right now.**

#### W1.2 — Deliverability-summary "requires flash" surfaces

**Status:** Foundation already in place (`apps/web/lib/deliverability.ts` from PR #325). Needs:
1. A new severity tier: `'flash-only'` distinct from `'lossy'` / `'dropped'`. Tier label: `Requires firmware flash`.
2. Per-AST-shape classification: when codegen sees an unsupported shape for the active board mode, classify it as `flash-only` (not silently dropped).
3. UI affordance in the CardWriter panel: list of `flash-only` props with a chassis-aware message ("This chassis does not currently support custom firmware flashing — these properties will not transfer. See <link>." for `89sabers V3.9-BT`).
4. Chassis-aware default for the `proffie_runtime` board mode: 89sabers V3+ chassis should default to it without the user having to flip a setting.

**Output:** PR with deliverability tier expansion + CardWriter UI surface + tests pinning the chassis-default behavior.

**Effort:** ~6–8 h. Depends on W1.1 to know what AST shapes we need to flag.

#### W1.3 — Vendor outreach (89sabers)

**Method:**
1. Email or DM 89sabers support asking for:
   - The exact `89sabers-config.h` used to build the V3.9-BT factory firmware (`installed: Apr 21 2026 08:44:54`).
   - Their ProffieOS commit hash / Proffieboard core version.
   - Any custom bootloader source code or pre-built binary image we can flash to Bank 1 to recover from a failed custom flash.
   - Their stance on user firmware modification and warranty.

**Outcomes (any of these is useful):**
- They share source → we can rebuild factory firmware byte-for-byte and use that as the baseline for custom mods. Closes the V3.9-BT flash question.
- They share the Bank 1 image but not source → recoverable from custom-flash failures without needing the May 14 backup; safer experiments possible.
- They decline → product positioning lean fully into runtime presets; document "vendor-locked custom flash" in user-facing copy.
- They don't reply → wait two weeks, then proceed as if they declined.

**Effort:** Send the email — 15 min. Wait for response — variable. Worth doing **before** ST-Link arrives since the answer might make ST-Link unnecessary.

#### W1.4 — Backup preservation

**Risk:** the May 14 backup is the only known-good recovery image for this board. If it's lost (drive failure, accidental delete, lost Mac), the bench board cannot be recovered without ST-Link.

**Mitigations:**
1. Push the backup to a private GitHub release (`backups/89sabers-v39bt-factory-2026-05-14`). Tag as `bench-v39bt-factory-2026-05-14`. Mark release as draft (private) since it's vendor firmware redistribution.
2. Mirror to iCloud / Dropbox / external SSD.
3. Document the SHA256 fingerprints in `FLASH_GUIDE.md` §10 as the "if you see this hash, this is the validated factory state" reference. Already done; double-check in audit.
4. Capture a fresh backup any time the board is in a known-good state (before the next bench session). The board itself is the only source of these bytes; treat each capture as a checkpoint.

**Effort:** 30 min. Should happen this week before any future bench session.

### W2 — Outcome B: unblock custom flash (hardware purchases + bench time)

#### W2.1 — ST-Link procurement

**What:** ST-Link/v3 SET or ST-Link/v2 mini (~$15–$30 from STMicro distributors, Mouser, Digi-Key, or Amazon). The v3 is preferred for SWD-V command support; v2 is sufficient for SWD debug.

**Also needed:**
- 4-pin SWD connector or jumper wires (board's SWD pads need to be probed — verify pad layout on the V3.9-BT PCB before purchasing connectors).
- `arm-none-eabi-gdb` + `openocd` (already installable via Homebrew, no purchase).
- STM32CubeProgrammer (free download from ST, useful for OB read/write with safer UI than dfu-util).

**Effort:** Order today, arrives in 3–7 days. Wiring + first-boot characterization ~2 h.

#### W2.2 — ST-Link bench experiments

Once W2.1 hardware is in hand. Experiment order is important — start with read-only observations, only write after we've characterized the boot flow.

**E1 — Read-only observation: what does the chip execute at reset?**
1. Flash an ST-Link / OpenOCD config for STM32L452RE.
2. Halt the chip immediately after reset.
3. Read PC and VTOR. Compare against:
   - 0x08000000 (expected if Bank 1 is boot)
   - 0x08040000 (expected if Bank 2 is boot)
   - Other (anomaly worth investigating)
4. Dump SP and the first 16 words of memory at PC's location to see what code is about to execute.
5. Single-step the first 100 instructions, watching memory reads. Looking for:
   - Reads from the opposite bank (Bank 1 reading Bank 2, or vice versa)
   - CRC-like loops (XOR / shift sequences over a large memory range)
   - Magic-number comparisons (load immediate, compare against memory, conditional branch)
   - Jumps to the opposite bank (the handoff)

**Expected outcome of E1:** A clear narrative of "chip starts at <addr>, executes <N> instructions of setup, reads <range> from the other bank, computes <something>, then jumps to <addr> in the other bank". This is the boot chain.

**E2 — Identify the validation gate**
With E1's narrative in hand, identify the specific instruction(s) that decide whether to jump to the application. Either:
- A `cmp` against a known constant, then conditional branch
- A subroutine call that returns 0/1, then conditional branch
- A signature check (longer CRC / hash subroutine)

For each candidate gate, characterize the input: what bytes get checked? Where do they live?

**E3 — Test whether we can satisfy the gate**
Without modifying the chip:
- Build a minimal custom firmware (one preset, default style, stripped of everything optional).
- Examine the bytes at the locations E2 says are checked.
- If the gate is a magic number or version pin: can we set it in our build to match?
- If the gate is a CRC: can we compute the expected CRC and adjust our firmware to match?
- If the gate is a signature: this requires the 89sabers private key; permanently blocked without vendor cooperation.

**E4 — Validated custom flash (the goal)**
Once E3 produces a candidate firmware that should satisfy the gate:
1. Capture a fresh backup of the current state.
2. Flash the candidate firmware to Bank 2 only (factory ProffieOS bank).
3. Observe via ST-Link: does the boot chain pass the gate?
4. If yes — does the firmware reach `main()` and start ProffieOS?
5. If no — what step fails? Iterate on the firmware until it passes.

**Effort:** E1 ~2 h. E2 ~2–4 h. E3 ~1–4 h depending on gate complexity. E4 ~2 h per iteration. Total: 1–3 bench sessions.

**Output of W2.2:** Either a working custom-flash protocol for the V3.9-BT (huge win, unlocks Showcase / Kinetic / new style algorithms), or a definitive "this gate requires vendor cooperation / signing key" (closes the question, focuses product strategy).

#### W2.3 — Stock Proffieboard validation reference

**Why:** If W2.2 hits a wall, we need a control case to verify that "KyberStation's compile-and-flash works at all" — not just "doesn't work on vendor chassis".

**What:** Buy a stock Proffieboard V3.9 direct from Fredrik Hubbe (~$60–$80 from fredrik.hubbe.net). No vendor customization, no custom OB, no custom loader.

**Validation flow:**
1. Receive board, take initial backup (full bank dump should show Bank 1 with valid Cortex-M vector table, Bank 2 mostly 0xFF / unused).
2. Compile a minimal KyberStation `config.h` against stock ProffieOS.
3. Flash via the documented `dfu-util` workflow.
4. Confirm: saber boots, blade lights, audio plays, USB CDC enumerates.
5. If yes — KyberStation's compile-and-flash path is validated on a vendor-free reference. Document as such in `BOARD_COMPATIBILITY_ROADMAP.md`.
6. If no — surprising; the codegen has drifted in a way the 2026-04-20 validation didn't catch. Worth investigating before assuming the V3.9-BT issue is purely vendor-side.

**Effort:** ~$80 + a week shipping + 1 h bench time once it arrives.

### W3 — Documentation hygiene

Lower priority, but worth tracking.

#### W3.1 — Archive the 2026-04-20 WebUSB validation result

The April 20 Phases A+B+C green pass was a real result, on a real (since-retired) board. It's currently cited in CLAUDE.md, HARDWARE_VALIDATION_TODO.md, CHANGELOG.md, and WEBUSB_FLASH.md in a way that implies "the WebUSB FlashPanel is validated on current hardware". The 2026-05-17 doc edits in this audit cycle correctly footnote it as historical, but it's worth a follow-up cleanup pass once W2.3 (stock board re-validation) gives us a fresh "validated" claim to anchor.

#### W3.2 — Vendor compatibility matrix doc

POST_LAUNCH_BACKLOG.md row #65 calls for a new `docs/HARDWARE_COMPATIBILITY.md` listing (vendor, chassis, ProffieOS version, default-config-works?, runtime-presets-works?, custom-flash-works?). Worth promoting up the backlog once we have:
- Stock Proffieboard (W2.3 result)
- 89sabers V3.9-BT (current data: runtime ✅, flash ❌)
- Any community-reported hardware (issue template already exists)

The table is small but high-leverage for setting user expectations before they buy hardware.

#### W3.3 — User-facing "which path should I use" decision tree

Currently spread across FLASH_GUIDE intro, CompatibilityPanel copy, FlashPanel disclaimers, and CardWriter help text. Consolidate into a single `docs/CHOOSE_YOUR_PATH.md` or equivalent that says:
- "I own a stock Proffieboard / DIY build" → compile-and-flash (FLASH_GUIDE.md)
- "I own a vendor saber with `SAVE_PRESET` (89sabers V3+, Sabertrio, KR Sabers v3+)" → runtime presets (CardWriter panel)
- "I own a Xenopixel" → design-reference export (separate doc)
- "I own a CFX / Golden Harvest" → design-reference export (separate doc)

Link prominently from README and the app's first-run onboarding.

---

## Sequencing

**This week (no hardware purchases):**
- W1.1 preset coverage analysis (4 h)
- W1.3 vendor outreach email (15 min)
- W1.4 backup preservation (30 min)

**Next 2 weeks (W2.1 hardware in transit):**
- W1.2 deliverability tier expansion (8 h, depends on W1.1)
- W2.3 stock Proffieboard order placed (if budget allows)
- Wait for vendor reply on W1.3

**Once ST-Link arrives (~1 week from order):**
- W2.2 E1 + E2 (read-only ST-Link characterization, 4–6 h bench session)

**Decision point after W2.2 E1/E2:**
- If we found a tractable gate (magic / CRC / version) → continue to E3 + E4, aim for validated custom flash
- If we found a signature gate → halt experiment, document the finding, declare custom flash on this chassis vendor-cooperation-bound

**After stock board arrives:**
- W2.3 validation flow (1 h)
- W3.1 doc cleanup (1 h)

**Ongoing:**
- W3.2 hardware compatibility matrix (low priority until more data)
- W3.3 user-facing decision tree (low priority until more chassis tested)

---

## Cost summary

- **Time investment to fully scope outcome A (runtime presets is right):** ~12 h spread across this week. No purchases.
- **Time investment to fully attempt outcome B (custom flash works):** ~25 h plus ~$25 ST-Link plus ~$80 stock Proffieboard, spread over 3–4 weeks.

Outcome A alone gives us a defensible product strategy. Outcome B is the bonus round. Don't sequence them in a way that blocks A on B's timeline.

---

## Open questions for Ken

1. **Budget for ST-Link + stock Proffieboard** (~$100 combined)?
2. **Willingness to email 89sabers** vs. wait for the audit's bench data to harden first?
3. **Public communication** — should the README / landing page explicitly say "BT-equipped vendor sabers: use runtime presets" as a recommendation, or keep it as a per-chassis disclaimer? (Current edits split the difference — explicit V3.9-BT callout, general "BT-equipped vendor" hedge for the rest.)
4. **Stock Proffieboard purchase priority** — buy now (parallel to ST-Link arrival) or wait until W2.2 results to decide? Parallel is slightly faster; waiting saves $80 if W2.2 unblocks the BT chassis cleanly.

These are user judgment calls, not technical questions; defer to whatever Ken wants.
