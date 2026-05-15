# Session 2026-05-14 — 89sabers V3.9-BT Bench

**Hardware:** 89sabers Proffieboard V3.9-BT (replacement board after the 2026-04-29 brick of the original V3.9).
**Goals (user):** (1) don't brick this one; (2) load ~30 random presets from KyberStation; (3) verify Bluetooth.
**Outcome:** Goal 1 ✅. Goal 2 ❌ (KyberStation-emitted firmware does not boot on this chassis; root cause not isolated this session). Goal 3 partial — BT module identified, full BT verification deferred.

---

## What worked

- **Phase B factory backup** — `dfu-util` upload-only dumps of Bank 1 / Bank 2 / Option Bytes / OTP, SHA256-manifested, restore-tested twice end-to-end. Workflow is now rock-solid. Helper at [`scripts/hardware-test/backup-proffieboard-v3.sh`](../../scripts/hardware-test/backup-proffieboard-v3.sh).
- **Option Byte fingerprint refinement** — old "bricked state" fingerprint (`4c2b2194…`) turned out to be the V3.9-BT *pristine* state. Updated [`docs/FLASH_GUIDE.md`](../FLASH_GUIDE.md) §10. Brick detection should now key on vector-table validity (in the script), not on hash matching.
- **USB CDC baseline** — characterized factory firmware: ProffieOS v7.12, `SaberFett263Buttons` prop, 25 factory presets, battery telemetry, clash threshold 2.0 G. Helper at [`scripts/hardware-test/proffie-serial.sh`](../../scripts/hardware-test/proffie-serial.sh).
- **BT module identification** — saber advertises as **`Feasycom`** at MAC `62:21:23:B8:9B:6B`, RSSI -63 dBm. Confirms the FSC-BT909 hypothesis from [`docs/research/BLUETOOTH_FEASIBILITY.md`](../research/BLUETOOTH_FEASIBILITY.md) §2.2. Default unconfigured name means 89sabers didn't customize the module's BLE_NAME at the factory.
- **Recovery via dfu-util** — ~30 second restore from `bank1-pre.bin`, validated twice. Saber is currently back to factory state and functioning normally.

## What failed

**Two flash attempts of KyberStation-emitted firmware. Both boot-loops / chip falls back to DFU mode.**

| Attempt | Config | Result |
|---|---|---|
| #1 | KyberStation defaults: 144 LED single blade, pins 2+3, `NUM_BLADES=1` | Stuck in boot mode, no audio, no LED response |
| #3 | Factory-matched: 128 LED main + 30 LED crystal chamber, pins 2+3 and 4+5, `NUM_BLADES=2`, `ORIENTATION USB_TOWARDS_BLADE`, `ENABLE_SERIAL`, Style2 added to all 24 presets | Chip auto-enters DFU after boot (firmware never runs long enough for ProffieOS init logs to appear) |

**Attempt 3 used the published 89sabers V3.9 factory CONFIG_TOP** from the CCSabers tutorial pack ([Google Drive link](https://www.ccsabers.com/blogs/tutorials/ccsabers-89sabers-proffieboard-v3-9-config-files-full-os-7-12-pack)) — 11 configs included: `89V3_OBI.h`, `89V3_Purple.h`, `89V3_Green.h`, `89V3_allfont.h`, `89V3_Blue.h`, `89V3_Fire.h`, `89V3_Golden.h`, `89V3_Lightblue.h`, `89V3_Qui.h`, `89V3_Red.h`, `89sabers-Kylo-config.h`. All non-Kylo configs share the same dual-blade declaration (128+30 LEDs).

**But the factory firmware on this specific BT board reports its config name as `89sabers-config.h` — not in that pack.** 89sabers ships a BT-variant config that's not publicly distributed (or distributed only via direct support request).

## Why the boot fails — current hypotheses, none verified

- **Missing defines specific to the BT variant** — possibly `BLE_PASSWORD`, `BLE_NAME`, `BLE_SHORTNAME`; the factory pack mentions these as `// commented out` placeholders, but the BT chassis might require them. Also possibly missing FETT263 gesture defines (`FETT263_TWIST_ON`, `FETT263_STAB_ON`, `FETT263_SWING_ON_NO_BM`, `MOTION_TIMEOUT`, etc.) that the factory config does declare.
- **Chassis-specific blade pinout we haven't seen** — the BT variant might use different `bladePin`/`blade2Pin` (data lines) or different power pin pairs from the standard V3.9.
- **Build-environment drift** — we cloned ProffieOS at tag `v7.12` and use `proffieboard:stm32l4` core 4.6. 89sabers may compile from a custom branch or older core version. We have no way to confirm we're producing a binary-compatible output.
- **KyberStation codegen issue** — the emitted `Layers<>` / `StylePtr<>` template instantiations might reference something at runtime that 89sabers' prop file expects but our config doesn't declare.

**The diagnostic gap is the limiter.** ProffieOS prints init progress over USB CDC during boot. We never captured those logs because our firmware never opens the USB CDC interface (crashes too early). Without that log, every theory is a guess and every flash attempt is a probe-by-fire.

## What we need before the next attempt

1. **Capture serial logs from a broken boot.** Three paths:
    - **ST-Link via SWD** — hard-wire to the SWD pads on the V3.9 board, attach OpenOCD/gdb, watch ITM/SWO output from a panicking firmware. The most reliable approach. We had ST-Link in mind on 2026-04-29 but the original V3.9 was bricked beyond recovery — buy/borrow an ST-Link V2 clone (~$8 on Amazon) for this session.
    - **Modify ProffieOS to log to LED** — patch ProffieOS to flash a status LED pattern at each init checkpoint so we get a visible heartbeat. Requires source modification and a re-flash dance for each diagnostic iteration. Lower throughput but no extra hardware.
    - **Earlier USB CDC init in ProffieOS** — patch ProffieOS so USB CDC opens before the WS281X / audio / motion inits that may crash. Then any cat `/dev/cu.usbmodem*` would capture the boot log up to the crash. One-time patch, then reflashable.
2. **Get the BT-variant factory config.** Email 89sabers support requesting the `89sabers-config.h` source (or the OS pack for the V3.9-BT). The standard 11-config pack is for the non-BT V3.9.
3. **Flash-test the unmodified factory config from our toolchain first.** Take `89V3_allfont.h` (which boots in the factory but isn't byte-identical to what's on the chip), compile from our `~/ProffieOS` + arduino-cli, flash. If it boots → build environment is fine and the issue is KyberStation's codegen output. If it doesn't boot → toolchain drift or chassis-specific issue we need to chase.

## What KyberStation needs to do differently so this works for users

This session exposed real product gaps. The plan to address them, in priority order:

1. **Vendor board profile selector.** KyberStation currently emits config.h targeting a stock Proffieboard. Real users have vendor chassis (89sabers, KR Sabers, Saberbay, Vader's Vault, Sabertrio, Electrum, etc.) — each with non-stock pin assignments, blade counts, accent LED declarations, button mappings. KyberStation needs a "what chassis do you have?" picker that pins codegen to the vendor's known-good baseline. Without this, KyberStation defaults fail on the most common community hardware.
2. **Factory config import.** Users with non-vendor chassis (DIY, custom builds, vendors we don't profile) need to paste their factory `config.h` once. KyberStation then preserves the user's `BladeConfig blades[]` and `#define`s verbatim while emitting only the `presets[]` array. This is the safe-by-default path — KyberStation only touches what it knows is safe to touch.
3. **End-user diagnostic capture.** Add a documented "boot capture" workflow to FLASH_GUIDE.md: how to attach `screen /dev/cu.usbmodem* 115200` (or our `proffie-serial.sh`) to a Proffieboard during boot to see ProffieOS init logs. If their flash fails, they can paste the log into a GitHub issue.
4. **Compatibility matrix.** Public doc listing vendor + board + ProffieOS version + KyberStation-default-config-works status, with PR-able rows. First-mover entries: `89sabers V3.9-BT — KyberStation default ❌, vendor `89sabers-config.h` pending request`, `stock Proffieboard V3.9 from Hubbe — ✅` (pending verification on a stock board).
5. **CI: hardware-test smoke build.** Each release tag, compile KyberStation's emitted default config + each vendor profile to confirm arduino-cli build doesn't regress. Doesn't verify hardware boot (impossible without a hardware-in-the-loop bench) but catches toolchain drift early.

Items 1, 3, 4 are the v0.17–v0.18 priorities. Item 2 is a v0.19 ergonomics improvement. Item 5 is post-launch CI hardening.

## Captured artifacts (outside this worktree)

- **Factory backup**: `/Users/KK/Development/KyberStation/backups/89sabers-v39bt-factory-2026-05-14/` — `bank1-pre.bin`, `bank2-pre.bin`, `option-bytes-pre.bin`, `otp-memory.bin`, `SHA256SUMS.txt`. Restore command: `dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000:leave -D bank1-pre.bin`.
- **Build artifacts**: `/Users/KK/Development/KyberStation/builds/89sabers-v39bt-first-flash-2026-05-14/`:
  - `original.zip` — user's KyberStation export
  - `config-original.h` — extracted config before any modification
  - `extracted/config.h` — final attempt-3 config (Graflex;common font, dual-blade)
  - `firmware-attempt2-3pin234.bin` — 3-pin power, single blade (built but not flashed)
  - `firmware-attempt3-factory-match.bin` — 2-blade factory-matched config (flashed, didn't boot)
- **CCSabers config pack**: `/tmp/89sabers-config-download/` — 11 official 89sabers V3.9 configs from Google Drive.
- **Patched ProffieOS source**: `~/ProffieOS/config/89sabers-bt-2026-05-14.h` + `.attempt2-backup`.

## Next-session checklist

- [ ] Buy/borrow ST-Link V2 clone (Amazon, ~$8)
- [ ] Email 89sabers support for V3.9-BT `89sabers-config.h`
- [ ] Test-flash unmodified `89V3_allfont.h` from our toolchain → bake the build-environment vs codegen distinction
- [ ] If that boots: diff KyberStation config defines against `89V3_allfont.h` exhaustively, isolate the missing/wrong define
- [ ] If that doesn't boot: investigate toolchain (older arduino-cli core?, different ProffieOS branch?, BT-variant chassis-specific HALs?)
- [ ] Capture serial boot log via ST-Link or LED heartbeat, identify exact failure step
- [ ] Once boot succeeds, document the working config delta as a new vendor profile in KyberStation
- [ ] Update [`docs/POST_LAUNCH_BACKLOG.md`](../POST_LAUNCH_BACKLOG.md) with vendor profile selector + factory config import as v0.17 work items
