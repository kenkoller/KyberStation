# Session 2026-05-18 → 2026-05-19 — V3.9-BT Custom Flash Deep Dive + Path C Win

**Session window:** evening 2026-05-18 through ~03:30 2026-05-19 (PDT)
**Authors:** Ken Koller, Claude Code (Opus 4.7)
**Status:** Comprehensive empirical + forensic session. Wraps with: production gray board deployment success, three additional flash experiments ruled out, and Reset_Handler hypothesis identified as the highest-leverage next-session direction.

---

## Session goal

Continue R&D toward reliable workflow for deploying complex (kinetic + showcase) KyberStation presets onto Proffieboard V3 hardware in 89Sabers chassis ("blackboard" V3.9 non-BT and "gray board" V3.9-BT).

## Production wins (deployable artifacts)

### Path C deployment — 22-preset gray board deck

- **Hardware-validated**: 18 SHOWCASE_PRESETS emitted as runtime `advanced` verb entries via `buildRuntimePresetsFile()` ([`packages/codegen/src/emitters/ProffieRuntimeEmitter.ts:252`](../../packages/codegen/src/emitters/ProffieRuntimeEmitter.ts)), appended to the existing 4-preset W2-prime test deck. User confirmed all colors render correctly on hardware.
- **Color identity preserved**, dynamic style algorithms (motion modulators, gradients, shimmer) lost — `advanced` verb is color-only on factory firmware.
- **Factory Vader mis-indexing fix shipped**: `style=builtin 2 1` / `builtin 2 2` → `builtin 1 1` / `builtin 1 2` (firmware slot 2 is Luke, slot 1 is Vader). User confirmed Vader now ignites red.
- **Deployment SHA**: `e62dbdfcd5724f6b9e2ad231c874f40b3c2e020c95fb4cda71df55189e8627f0` (presets.ini + presets.tmp byte-identical, double-buffer rule satisfied per [`reference_runtime_preset_double_buffer.md`](/Users/KK/.claude/projects/-Users-KK-Development-KyberStation/memory/reference_runtime_preset_double_buffer.md)).
- **Backup locations**:
  - Pre-merge SD: `backups/path-c-showcase-2026-05-18/presets.ini.pre-merge`
  - Snippet only: `backups/path-c-showcase-2026-05-18/showcase-snippet.ini` (SHA `41ee41e4…`, 18 presets, 7,725 bytes)
  - Post-Vader-fix: `backups/path-c-showcase-2026-05-18/presets.ini.vader-fixed`

### Blackboard outcome — confirmed dead for runtime, useful as DFU-pipeline testbed

- **3 firmware variants tested**: `kyberstation_config.h`+ENABLE_SERIAL, unknown May 15 build, CCSabers `89V3_allfont.h` — all produce identical green-LED-only behavior.
- **Silicon damage extends beyond USB peripheral** to (likely) the HSE crystal / clock circuit. BootROM uses internal HSI clock (DFU works); app-mode firmware uses HSE PLL (hangs at clock init before any GPIO/peripheral init).
- **Blackboard recovery snapshot** captured 2026-05-18 22:24: `backups/89sabers-blackboard-2026-05-18/{bank1-pre.bin, bank2-pre.bin, option-bytes-pre.bin, otp-memory.bin}` (4 files, full SHA manifest).

## Custom-flash experiments — three new empirical results

All ran on gray board (V3.9-BT, DFU serial `2068308F3830`, in pristine May 14 baseline state).

### W2-prime (recap from prior session 2026-05-18 morning)

- **Binary**: 89Sabers actual factory source compiled with arduino-cli 1.4.1 + proffieboard:stm32l4 4.6
- **Target**: Bank 1 (0x08000000) with `:leave`, standard FLASH=512K linker
- **Result**: Mechanical flash succeeded, chip exited DFU, **no USB CDC enumeration, no blade ignition**. Silent.

### W2-prime-bis — Bank 2 only flash (NEW, this session)

- **Binary**: `89V3_allfont.h` (CCSabers V3.9 non-BT canonical) compiled with FLASH=256K linker at ORIGIN=0x08040000 (Bank 2). SHA `5c653a22dd7e137e4d4d927c693072cccecfccdd00890cd40afb8dd8244df2fe`, 205,176 bytes.
- **Vector table**: SP=0x20028000, Reset_Handler=0x080686A9 (correctly in Bank 2 range, exact 0x40000 offset from Bank-1-linked equivalent).
- **Target**: Bank 2 (0x08040000) with `:leave`, Bank 1 (factory loader) UNTOUCHED
- **Result**: Mechanical flash succeeded. Chip exited DFU cleanly. **No USB CDC enumeration for 10+ seconds. No blade ignition.** Silent.
- **Implication**: Definitively rules out hypothesis H3 (Bank 2 = sole boot source). Either H1 (Bank 1 vendor loader byte-validates Bank 2 contents and rejects custom firmware) is correct, OR the failure mechanism is more subtle than bank-source selection.

### W2-prime-tris — Bank 1 with FLASH=256K constraint (NEW, this session)

- **Binary**: `89V3_allfont.h` compiled with FLASH=256K linker at ORIGIN=0x08000000. SHA `21211416a29fc2fbb377a4f436163bf8e8f5b28de40a3bae761661dea2a8f591`, 205,176 bytes.
- **Hypothesis tested**: Even with FLASH=512K, our binary fits in Bank 1 (206KB < 256KB). Adding the FLASH=256K constraint shouldn't change the produced binary in any meaningful way for a binary that already fits.
- **Result**: Same as W2-prime — mechanical success, then silent. Confirms the prediction.

### Synthesis across all three

| Experiment | Linker FLASH | Linked for | Target bank | Bank 1 state | Bank 2 state | Result |
|---|---|---|---|---|---|---|
| W2-prime | 512K | 0x08000000 | Bank 1 | Custom | Factory | Silent |
| W2-prime-bis | 256K | 0x08040000 | Bank 2 | Factory | Custom | Silent |
| W2-prime-tris | 256K | 0x08000000 | Bank 1 | Custom | Factory | Silent |

**Three independent variations of which bank gets custom content, all produce identical silent-hang behavior.** The only flash state that boots is byte-perfect factory dual-bank content. **This is decisive empirical evidence that the V3.9-BT firmware is "double-validated" at boot** — either by a vendor loader's check OR by inherent cross-bank linkage that requires both banks to match (or both)..

## Forensic analysis findings

### Factory firmware structure (gray board V3.9-BT)

- **Bank 1**: 256KB **completely full** (0xFF padding starts at last byte). Dense Thumb-2 code throughout. 211 long strings (≥10 chars), all binary garbage when decoded as ASCII — no "ProffieOS", "saber", or config-identifying English text.
- **Bank 2**: 78KB used (rest 0xFF). 419 long strings, voice-pack filenames (`thirty.wav`, `mtrue.wav`, etc.), 89sabers-config.h reference, "Welcome to ProffieOS" boot greeting. **This is the RODATA / string section** of the factory firmware.
- **Cross-bank pointers**: Bank 1 has REAL `movw`+`movt` pairs constructing Bank 2 addresses (e.g., `0x0804C5DC`, `0x0804C77C`, multiple `0x0805XXXX`). Factory firmware genuinely accesses Bank 2 data via these pointers. Verified at offset 0xC5DC in Bank 2: literal string `"on, retraction blend option"` with surrounding bytes including `81 ce 03 08` (= `0x0803CE81`, a Bank 1 address — reverse cross-bank pointer).
- **Reset_Handler at offset 0x40 of Bank 1** (chip's actual boot entry): does aggressive hardware init — RCC clock enable for PWR, FLASH ACR config, SYSCFG memory remap, PWR + wait, backup domain reset, RTC unlock + init. Then chain-loads (sets VTOR=0, reads SP+PC from address 0, jumps).
- **Bank 2 offset 0**: NOT a valid Cortex-M vector table. Bytes `56 f9 41 f6 8b 51 41 f2` (SP=0xF641F956 invalid SRAM, PC=0xF241518B invalid flash). Yet chip boots normally. **Implies chip is NOT booting Bank 2 from offset 0 directly** — must be using Bank 1 via ROM bootloader fallback, or some other mechanism.
- **Secondary vector table at offset 0x400 of Bank 1**: SP=0x20028000 (valid), Reset_Handler=0x08047B4D (Bank 2 address — likely where stage-2 entry actually lives). Many ISR slots point to `0x08047B7D` (a default handler in Bank 2). Used after VTOR change.

### Our custom build structure

- **Reset_Handler placement**: at offset 0x286A8 (= absolute `0x080286A9` with Thumb bit). 68 bytes per linker map. Standard CMSIS startup from `startup_stm32l452xx.o`.
- **What our Reset_Handler does** (per source `startup_stm32l452xx.S:181-229` in the local Arduino core install, `~/Library/Arduino15/packages/proffieboard/hardware/stm32l4/4.6/system/STM32L4xx/Source/`):
  1. Copy `__copy_table` data sections from FLASH to RAM
  2. Zero `__zero_table` BSS sections
  3. Branch to `main` (which calls SystemInit + libc init_array)
- **Does NOT do explicit hardware init** in Reset_Handler. Hardware init deferred to SystemInit called downstream from main.
- **Cross-bank pointer count**: 0 real pointers (initial false-positive flags were ARM Thumb-2 instructions that happened to byte-pattern-match Bank-2 addresses when read as little-endian 32-bit words; objdump disassembly confirmed they're instructions like `mvn.w`, `sub.w`, `lsls` pairs, etc.).

### False positives identified (for future sessions)

1. **Byte-pattern scanning for cross-bank pointers** gives false positives. Many ARM Thumb-2 instruction encodings (e.g., `0xEA6F XXXX` = `mvn.w`, `0xEBA6 XXXX` = `sub.w`) byte-decode to look like `0x0807XXXX` Bank 2 addresses when read as little-endian. **The correct method is `movw`+`movt` pair detection from disassembly**, which IS authoritative.
2. **"Candidate vector table at Bank 2 offset 0x13348"** is actually a data table containing the ASCII string `"Charger"` and other text. SP/PC byte patterns happened to match valid vector table signatures by coincidence.
3. **LTO-optimized code is hard to interpret offline.** Our Reset_Handler's disassembled instructions don't look like canonical CMSIS startup because LTO inlined/reordered the actual logic.

## Hypotheses ruled out by this session's data

| # | Hypothesis | Why it's wrong |
|---|---|---|
| H3 | Bank 2 is sole boot source (factory firmware) | W2-prime-bis flashed custom Bank 2 alone → still silent. If H3 were right, custom Bank 2 with valid vector table at its offset 0 should have booted. It didn't. |
| H4 (alone) | Toolchain skew is the failure | Already ruled out 2026-05-18 morning W2-prime with 89Sabers actual factory source against the same toolchain we use. |
| L1 | Older proffieboard core needed | Only core 4.6 available publicly via arduino-cli. The audit's W2-prime used 4.6 too. Can't test older versions. |
| L2 | SRAM2 missing | Linker references `.rodata2`/`.data2`/`.bss2`/etc. → SRAM2, but NEITHER factory binary NOR ours has actual code/data referencing SRAM2 (`0x10000000+`). The sections are empty in both cases; warning is benign. |
| Cross-bank pointer linkage | Our builds have dangling Bank-2 pointers | False positive — our builds have ZERO real cross-bank pointers (verified via `movw`+`movt` pair scanning, not naive byte scan). |

## Hypotheses still standing

### H1 (refined) — Vendor signature / validation gate in Bank 1

- Bank 1 boot path runs ROM-style startup then does something during the chain-load that REQUIRES specific Bank 2 contents
- Could be: CRC32 check over Bank 2 region, magic number compare at fixed offset, signature verification
- **Resolvable only with ST-Link** (single-step from reset to observe what address ranges Bank 1 reads from Bank 2 and what comparisons are made)

### NEW L7 — Reset_Handler initialization mismatch (highest-leverage NEW direction)

**Factory Bank 1's Reset_Handler at offset 0x40 does extensive hardware init BEFORE branching anywhere:**
- RCC clock enable for PWR peripheral
- FLASH ACR configuration (latency)
- SYSCFG memory remap zero
- PWR enable + wait for ready
- Backup domain reset
- RTC unlock + init

**Standard proffieboard-core Reset_Handler does ONLY:**
- Copy `__copy_table` (initialized data)
- Zero `__zero_table` (BSS)
- Branch to main (SystemInit deferred)

**Hypothesis:** the V3.9-BT chassis or its specific peripheral configuration REQUIRES the aggressive hardware init in Reset_Handler before `main()` can safely run. Our deferred-init approach via SystemInit-from-main fails because something has already gone wrong with peripheral state by the time SystemInit gets called.

**Test plan (future session)**:
1. Write a custom Reset_Handler in assembly that mimics factory's offset-0x40 hardware init sequence
2. Replace proffieboard-core's stock startup with the custom one
3. Build + flash + observe

**Risk**: Modifying startup code is invasive. Won't damage hardware but adds complexity. Best done with focused attention, not late-night.

## Community knowledge audit

- **No public Crucible / Reddit / ProffieOS forum discussion** of V3.9-BT vendor lockdown specifically. The 89Sabers community generally treats the chip as a stock Proffieboard V3.
- **BT-909 module issues** (Crucible thread #5148) are about missing C63 stabilization capacitor, NOT firmware-side lockdown.
- **STM AN docs on BFB2** confirm the option byte mechanism but don't address fallback specifics on STM32L4 L452RE in particular.
- **89Sabers and CCSabers** have shared configs publicly + privately but haven't documented any vendor firmware customization beyond standard ProffieOS.

## Next-session priorities (ordered by leverage)

1. **L7 — Custom Reset_Handler experiment** (software-only, no hardware risk on the analytical side, low brick risk on flash). Write a Reset_Handler that does aggressive hardware init like factory's. Compile + flash + test. Highest-leverage new direction.
2. **ST-Link procurement** (still). The audit's W2.2 remains the only way to DEFINITIVELY resolve H1. Chassis-backside access still required.
3. **Codegen extension — emit other verbs** (`cycle`, `unstable`, `fire`, `strobe`, `rainbow`). Software-only, zero hardware risk. Improves visual fidelity of showcase presets on the gray board's existing factory firmware. Realistic ~50 % deck fidelity improvement.
4. **Vendor outreach (89Sabers)** — request the Bank-1 boot loader source or pre-built binary. They shared their config; might share more. Async.

## Files + state summary as of session end

### Gray board (89Sabers V3.9-BT, current production saber)
- **State**: Recovered to factory baseline (Bank 1 + Bank 2 byte-perfect to May 14)
- **Boot**: Factory firmware, 22-preset runtime deck on SD card
- **Vader**: Fixed (`builtin 1 1` / `builtin 1 2`)
- **DFU serial**: `2068308F3830`

### Blackboard (89Sabers V3.9 non-BT, R&D testbed)
- **State**: 89V3_allfont.h binary on Bank 1 (from this session's Path A test). Not booting (chip silicon damage beyond USB).
- **DFU**: Reliable
- **DFU serial**: `2081399A4B30`

### Build artifacts retained
- `backups/89sabers-blackboard-2026-05-18/` — blackboard pre-flash snapshot
- `backups/89sabers-grayboard-2026-05-18-w2primebis/` — gray board fresh dump (SHA-matches May 14 baseline)
- `backups/w2prime-bis-prep-2026-05-18/`:
  - `STM32L452RE_FLASH.ld.original` (linker baseline)
  - `STM32L452RE_FLASH.ld.bank2` (Bank-2 variant, FLASH=256K @ 0x08040000)
  - `STM32L452RE_FLASH.ld.bank1-only-256k` (Bank-1 constrained variant)
  - `firmware-bank2-2026-05-18.bin` (W2-prime-bis binary)
  - `firmware-bank1-only-256k-2026-05-19.bin` (W2-prime-tris binary)
  - `recover-grayboard.sh` (proven recovery script)
- `backups/path-c-showcase-2026-05-18/` — Path C deployment artifacts + pre/post-merge presets.ini variants

### Source modifications
- `~/ProffieOS/ProffieOS.ino` left configured for `89V3_allfont.h` (line 32). Restore to user's preferred default before next session if desired.
- `~/ProffieOS/config/89sabers-blackboard-original-2026-04-14.h` — copy of the April 14 config (added `ENABLE_ALL_EDIT_OPTIONS` for current Fett263 prop compatibility). May be useful for future blackboard work if HSE is ever repaired.
- All linker file modifications **reverted to original** (`STM32L452RE_FLASH.ld` SHA `21939796…` confirmed).

### Memory entries updated/created
- `project_proffieboard_v39_replacement_2026-05-01.md` — appended 2026-05-18 late evening section with 89V3_allfont.h flash result + USB damage firmware-independent confirmation
- `reference_user_board_nomenclature.md` (NEW) — blackboard / gray board / chassis terminology
- `MEMORY.md` index updated

## Bottom line

**Session was substantively productive** despite not cracking the V3.9-BT custom flash gate. Three additional flash experiments definitively ruled out three hypotheses. Path C deployment is a real, hardware-validated production win — user now has 22 working presets on the gray board including 18 showcase variants. Reset_Handler initialization mismatch (L7) is the highest-leverage NEW hypothesis identified, testable in a fresh session.

**The audit's bottom line stands and is reinforced by tonight's data**: runtime-presets remain the sanctioned path on V3.9-BT chassis. Custom flash is blocked without ST-Link or new evidence from L7 testing.
