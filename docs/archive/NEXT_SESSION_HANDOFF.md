# Next Session — Paste-Ready Handoff Prompt

Refreshed **2026-05-19** (post deep-dive V3.9-BT custom flash session).

Last session was the V3.9-BT flash deep-dive (2026-05-18 evening → 2026-05-19 ~03:30 PDT). Full writeup: [`docs/research/SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md`](../research/SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md).

**Recommended first action next session: test L7 hypothesis — custom Reset_Handler with aggressive hardware init.**

---

## Paste this into a new Claude Code session

```
Continue KyberStation development — V3.9-BT custom flash R&D.

PROJECT CONTEXT
---------------
KyberStation is a web-based lightsaber style editor for Proffieboard
V3.9 / ProffieOS 7.x. v1.0 shipped 2026-05-01 (web-only). Main bench
hardware is the "gray board" 89Sabers V3.9-BT chassis. Goal of this
work: enable custom firmware flashing on the V3.9-BT so users can
deploy kinetic + showcase presets (motion-reactive styles) that
factory firmware's 8 runtime verbs cannot express.

CURRENT STATE (2026-05-19)
--------------------------
Production wins (from 2026-05-18/19 session):
- Gray board has a working 22-preset runtime deck deployed via SD
  card (4 W2-prime test presets + 18 KS showcase color-only versions
  + Factory Vader mis-indexing fix from `builtin 2 1` → `builtin 1 1`)
- All 18 showcase preset colors verified rendering correctly on
  hardware. Dynamic style algorithms (motion modulators, gradients,
  shimmer) NOT preserved — `advanced` verb is color-only on factory.
- Vader now ignites red (was blue). User confirmed.

Blackboard (V3.9 non-BT, R&D testbed):
- Silicon damage confirmed broader than USB peripheral. Three firmware
  variants tested (kyberstation_config, May 15 unknown build, CCSabers
  89V3_allfont.h) — all produce identical green-LED-only behavior.
  Likely HSE crystal / clock circuit damaged. DFU mode works for
  flash-pipeline testbed; cannot run app-mode firmware.

Custom flash on gray board (V3.9-BT) status:
- 11 attempts now failed across 4 bench sessions (5/15, 5/17,
  5/18 morning W2-prime, 5/18 evening + 5/19 W2-prime-bis + tris).
- W2-prime (Bank 1, standard FLASH=512K): silent hang
- W2-prime-bis (Bank 2 only, FLASH=256K @ 0x08040000): silent hang —
  rules out H3 (Bank 2 sole boot source)
- W2-prime-tris (Bank 1, FLASH=256K constrained): silent hang —
  confirms FLASH constraint doesn't matter for our 206KB binary
- Only byte-perfect dual-bank factory restore boots the saber
- Recovery procedure validated end-to-end:
  `bash backups/w2prime-bis-prep-2026-05-18/recover-grayboard.sh`

NEW HIGHEST-LEVERAGE HYPOTHESIS (L7) — UNTESTED
------------------------------------------------
**Reset_Handler initialization mismatch.** Factory Bank 1's
Reset_Handler at offset 0x40 does extensive hardware init before
branching:
- RCC clock enable for PWR peripheral
- FLASH ACR configuration (latency)
- SYSCFG memory remap zero
- PWR enable + wait for ready
- Backup domain reset
- RTC unlock (write 0xCA, 0x53 to RTC_WPR) + init

Standard proffieboard-core Reset_Handler does ONLY:
- Copy `__copy_table` data sections from FLASH to RAM
- Zero `__zero_table` BSS sections
- Branch to `main` (SystemInit deferred)

Hypothesis: V3.9-BT chassis requires aggressive hardware init in
Reset_Handler before main() can safely run. Our deferred SystemInit
approach fails because peripheral state has already gone wrong by
the time SystemInit runs.

Test plan:
1. Write a custom assembly Reset_Handler that mimics factory's
   offset-0x40 hardware init sequence
2. Replace proffieboard-core's stock Reset_Handler in
   ~/Library/Arduino15/packages/proffieboard/hardware/stm32l4/4.6/
   system/STM32L4xx/Source/startup_stm32l452xx.S (back up first)
3. Compile, flash, observe
4. If boots: L7 confirmed, custom flash unlocked
5. If silent: L7 ruled out, recovery via the proven script

Risk: low brick risk (recovery proven); requires modifying startup
.S file which is invasive but easy to revert.

WHAT TO READ FIRST
------------------
1. `docs/research/SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md` — full
   session writeup with all experimental data, forensic findings,
   false positives to avoid, and L7 reasoning
2. `docs/research/PROFFIE_V39BT_FLASH_FEASIBILITY.md` — audit foundation
3. `docs/research/V39BT_FLASH_NEXT_STEPS.md` — workstreams + priorities

WHAT'S AT WHICH HARDWARE STATE
-------------------------------
Gray board (89Sabers V3.9-BT, DFU serial 2068308F3830):
- Factory firmware (May 14 baseline) recovered
- 22-preset deck on SD with Vader fix
- Use for: continued L7 experiments, daily use

Blackboard (89Sabers V3.9 non-BT, DFU serial 2081399A4B30):
- Bank 1: 89V3_allfont.h (May 18 build, doesn't boot due to silicon
  damage but flash pipeline works)
- Bank 2: Apr 30 + residual content
- Use for: DFU/flash pipeline testing, NOT runtime testing

ALL BUILD ARTIFACTS PRESERVED
------------------------------
- `backups/89sabers-blackboard-2026-05-18/` — pre-flash snapshot
- `backups/89sabers-grayboard-2026-05-18-w2primebis/` — fresh gray
  board dump (SHA matches May 14 baseline)
- `backups/89sabers-v39bt-factory-2026-05-14/` — canonical recovery
  baseline
- `backups/w2prime-bis-prep-2026-05-18/`:
  - STM32L452RE_FLASH.ld.original (linker baseline, SHA 21939796…)
  - STM32L452RE_FLASH.ld.bank2 (Bank-2 variant)
  - STM32L452RE_FLASH.ld.bank1-only-256k (constrained Bank 1)
  - firmware-bank2-2026-05-18.bin (W2-prime-bis binary)
  - firmware-bank1-only-256k-2026-05-19.bin (W2-prime-tris binary)
  - recover-grayboard.sh (proven recovery script)
- `backups/path-c-showcase-2026-05-18/` — Path C deployment

LESSONS LEARNED (avoid repeating)
----------------------------------
1. DO NOT naive-byte-scan binaries for cross-bank pointers. Many ARM
   Thumb-2 instructions (mvn.w, sub.w, certain ldr/str pairs) byte-
   decode to look like 0x0807XXXX Bank-2 addresses. False positives
   wasted ~30 min twice this session. Use `movw`+`movt` pair detection
   from disassembly instead. See:
   `feedback_movw_movt_for_cross_bank_pointer_detection.md` in memory.
2. arduino-cli + proffieboard core 4.6 produces LTO-heavy binaries
   where Reset_Handler doesn't disassemble like canonical CMSIS
   startup. Look at the SOURCE (.S file) for what it SHOULD do,
   not the optimized disassembly.
3. Crucible forum has NO discussion of V3.9-BT vendor lockdown
   specifically. Don't expect community knowledge here.
4. BFB2=1 + valid vector table at Bank 1 offset 0 does NOT mean
   chip "fell back to Bank 1" simply. Without ST-Link, the actual
   BootROM behavior on STM32L4 with BFB2=1 + invalid Bank 2 vector
   table is genuinely opaque.

WHAT WOULD UNLOCK FULL CUSTOM FLASH (if L7 fails)
--------------------------------------------------
- ST-Link procurement + chassis backside access (blocked on chassis
  disassembly)
- Vendor outreach: ask 89Sabers for their Bank-1 boot loader source
  or pre-built binary. They shared their config; might share this.

WHAT'S NOT BLOCKED (productive software directions)
----------------------------------------------------
- Extend KyberStation's ProffieRuntimeEmitter to emit `cycle` /
  `unstable` / `fire` / `strobe` / `rainbow` verbs (not just
  `advanced` + `builtin`) for matching showcase preset styles.
  Improves visual fidelity on the existing factory firmware.
  See packages/codegen/src/emitters/ProffieRuntimeEmitter.ts.
- Perceptual diff harness between visualizer and template-eval
  render (backlog item).

Start by acknowledging context, then propose an L7 test plan and
ask whether to proceed.
```

---

## Quick-reference next-session decision tree

**If you can do hardware work (DFU + chassis access OK):**
→ Test L7 (Reset_Handler init) — modify startup_stm32l452xx.S to do factory-style hardware init, compile, flash, observe. ~2 hours total.

**If hardware is unavailable but you want progress:**
→ Extend ProffieRuntimeEmitter to emit `cycle`/`unstable`/`fire` verbs for matching showcase presets. Software-only. ~2-3 hours.

**If user wants to unblock all custom flash possibilities:**
→ Vendor outreach (email 89Sabers for boot loader source). Async — wait for response.

**If user just wants to keep using the saber:**
→ The 22-preset deck is deployed and working. No further action needed for daily use.
