# Flashing Your Saber — KyberStation FLASH_GUIDE

> **KyberStation v1.0 is a design tool first.** This guide walks you through compiling and flashing a KyberStation-generated config to a Proffieboard using the `dfu-util` command-line workflow. The in-browser WebUSB FlashPanel is **experimental** in v1.0 — see [§9](#9-the-webusb-flashpanel-is-experimental) below.

> **Audience:** Proffieboard owners on macOS, Linux, or Windows (WSL or MSYS2). You'll spend ~10 minutes the first time you set this up. After that, every reflash is two commands.

---

## TL;DR — the entire workflow in one block

```bash
# One-time setup (macOS shown; Linux/Windows notes below)
brew install dfu-util arduino-cli
arduino-cli core install --additional-urls \
  https://profezzorn.github.io/arduino-proffieboard/package_proffieboard_index.json \
  proffieboard:stm32l4
git clone https://github.com/profezzorn/ProffieOS.git ~/ProffieOS

# Every time you want to flash a new config:
# 1. Export config.h from KyberStation OUTPUT panel
# 2. Drop it into ~/ProffieOS/config/my-config.h
# 3. Edit ~/ProffieOS/ProffieOS.ino — point CONFIG_FILE at "config/my-config.h"
# 4. Compile
arduino-cli compile \
  --fqbn 'proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,usb=cdc_msc' \
  --output-dir /tmp/proffie-build \
  ~/ProffieOS/ProffieOS.ino

# 5. Strip the .iap DFU suffix so dfu-util accepts it
SIZE=$(stat -f%z /tmp/proffie-build/ProffieOS.ino.iap 2>/dev/null \
  || stat -c%s /tmp/proffie-build/ProffieOS.ino.iap)
head -c $((SIZE - 16)) /tmp/proffie-build/ProffieOS.ino.iap \
  > /tmp/proffie-build/firmware.bin

# 6. Enter DFU mode on the saber (vendor button combo — see §6)
# 7. BACK UP YOUR EXISTING FIRMWARE (DO NOT SKIP THIS — see §7)
dfu-util -d 0x0483:0xdf11 -a 0 -U ~/my-saber-backup.bin -s 0x08000000:524288

# 8. Flash your new firmware
dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000:leave \
  -D /tmp/proffie-build/firmware.bin
```

If the new firmware doesn't boot, jump to [§8 Recovery](#8-recovery--restoring-from-backup) and flash the backup.

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Install `dfu-util` and `arduino-cli`](#2-install-dfu-util-and-arduino-cli)
3. [Get the ProffieOS source](#3-get-the-proffieos-source)
4. [Generate your config from KyberStation](#4-generate-your-config-from-kyberstation)
5. [Compile](#5-compile)
6. [Enter DFU mode](#6-enter-dfu-mode)
7. [⚠ Mandatory: back up your existing firmware](#7--mandatory-back-up-your-existing-firmware)
8. [Flash](#8-flash)
9. [The WebUSB FlashPanel is experimental](#9-the-webusb-flashpanel-is-experimental)
10. [Vendor-customized boards (89sabers, KR, Saberbay, etc.)](#10-vendor-customized-boards)
11. [Recovery — restoring from backup](#11-recovery--restoring-from-backup)
12. [Troubleshooting](#12-troubleshooting)
13. [FAQ](#13-faq)

---

## 1. Prerequisites

- A Proffieboard (V2 or V3). KyberStation generates configs targeting **ProffieOS 7.x**.
- A USB-C or USB-micro cable that carries data (not just power).
- macOS, Linux, or Windows. WSL2 or MSYS2 work fine on Windows.
- ~150 MB of disk for the ProffieOS source + Proffieboard board package.
- Comfort with a terminal. If `cd ~/Downloads` and `which python3` are familiar, you're set.

If any of those make you uneasy: **don't flash today.** Read this guide end to end first. Skim [§7 backup](#7--mandatory-back-up-your-existing-firmware) and [§11 recovery](#11-recovery--restoring-from-backup) — those two steps are the safety net.

---

## 2. Install `dfu-util` and `arduino-cli`

### macOS

```bash
brew install dfu-util arduino-cli
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install dfu-util
# arduino-cli — install via official script:
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
sudo mv bin/arduino-cli /usr/local/bin/
```

You'll also need a udev rule so `dfu-util` can talk to the board without `sudo`:

```bash
sudo tee /etc/udev/rules.d/49-stm32-dfu.rules <<'EOF'
SUBSYSTEMS=="usb", ATTRS{idVendor}=="0483", ATTRS{idProduct}=="df11", MODE="0666"
EOF
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Windows

- **dfu-util:** download from [dfu-util.sourceforge.net](http://dfu-util.sourceforge.net/) and add the directory to your `PATH`. You'll also need to install [Zadig](https://zadig.akeo.ie/) and switch the **STM32 BOOTLOADER** device's driver from `STTub30` to `WinUSB`.
- **arduino-cli:** download from [github.com/arduino/arduino-cli/releases](https://github.com/arduino/arduino-cli/releases) and add to `PATH`.
- Easier path: install [WSL2 with Ubuntu](https://learn.microsoft.com/en-us/windows/wsl/install) and follow the Linux instructions above.

### Install the Proffieboard board package

```bash
arduino-cli core update-index --additional-urls \
  https://profezzorn.github.io/arduino-proffieboard/package_proffieboard_index.json
arduino-cli core install --additional-urls \
  https://profezzorn.github.io/arduino-proffieboard/package_proffieboard_index.json \
  proffieboard:stm32l4
```

Verify both tools work:

```bash
dfu-util --version    # expect "dfu-util 0.11" or similar
arduino-cli version   # expect "Version: 1.x.x"
```

---

## 3. Get the ProffieOS source

KyberStation generates a `config.h` that drops into the ProffieOS source tree. You compile that source against your config.

```bash
git clone https://github.com/profezzorn/ProffieOS.git ~/ProffieOS
cd ~/ProffieOS
git checkout v7.14   # or the latest stable tag from the ProffieOS repo
```

KyberStation's codegen targets ProffieOS 7.x. Newer 7.x point releases should work; if a future ProffieOS API breaks compilation, file an issue at [github.com/kenkoller/KyberStation/issues](https://github.com/kenkoller/KyberStation/issues/new?template=bug_report.md).

---

## 4. Generate your config from KyberStation

1. In the KyberStation editor, design your saber.
2. Open the **OUTPUT** panel (left sidebar → OUTPUT, or `⌘4` / `Ctrl+4`).
3. Click **Download config.h**.

> **Known v1.0 limitation:** in **single-preset mode**, the OUTPUT panel currently exports a style snippet only, not a full `config.h`. To get a complete config, add at least one entry to the preset list (My Saber → Card Preset Composer) before exporting. This is tracked as a post-launch fix.

Save the downloaded file to `~/ProffieOS/config/my-saber.h`.

Then edit `~/ProffieOS/ProffieOS.ino` and change the `CONFIG_FILE` line near the top:

```cpp
// Was: #define CONFIG_FILE "config/default_proffieboard_config.h"
#define CONFIG_FILE "config/my-saber.h"
```

---

## 5. Compile

```bash
arduino-cli compile \
  --fqbn 'proffieboard:stm32l4:ProffieboardV3-L452RE:dosfs=sdmmc1,usb=cdc_msc' \
  --output-dir /tmp/proffie-build \
  ~/ProffieOS/ProffieOS.ino
```

For a Proffieboard V2 board, swap `ProffieboardV3-L452RE` for `ProffieboardV2-L433CC`.

You should see something like:

```
Sketch uses 213484 bytes (40%) of program storage space. Maximum is 524288 bytes.
```

If compile fails: that's a code/config issue, not a flash issue. Most likely your KyberStation config references a feature that requires a specific ProffieOS version, or references a board capability your fqbn doesn't have. Read the error, fix the cause, recompile.

---

## 6. Enter DFU mode

You need the saber's STM32 chip to come up as `0483:df11` (the STMicro DFU bootloader) before `dfu-util` can talk to it.

There are two ways in. Try them in order:

### Method A — Vendor button combo (recommended for assembled sabers)

The button combo varies by saber vendor. Common combos:

| Vendor | Combo |
|---|---|
| 89sabers | Hold **POWER + AUX** while plugging in USB |
| Saberbay | Hold **POWER + AUX** while plugging in USB |
| KR Sabers | Hold **POWER + AUX** while plugging in USB |
| Goth-3 / Vader's Vault | Hold **AUX** while plugging in USB |
| DIY / bare board | See Method B |

**If your saber has a battery installed:** unplug USB, hold the combo, then plug USB back in. Some vendors require you to also have the board powered down first; if the combo doesn't trigger DFU, fully shut the saber down (long-press POWER) and try again.

### Method B — On-board buttons (DIY or bare-board access)

The Proffieboard has two buttons labeled **BOOT** (SW1) and **RESET** (SW2). The reliable sequence on a powered board is:

1. Hold **BOOT**.
2. Tap **RESET** (release immediately).
3. Release **BOOT**.

If the board is fully powered off (no battery, no USB), the older "unplug, hold BOOT, replug" works too — but on a battery-powered live board the BOOT0 pin doesn't get resampled unless you reset, so use the BOOT-then-RESET sequence above.

### Verify

```bash
dfu-util -l
```

You should see a line like:

```
Found DFU: [0483:df11] ver=2200, devnum=18, cfg=1, intf=0,
  path="20-1", alt=0, name="@Internal Flash  /0x08000000/256*02Kg",
  serial="3068386F3034"
```

That's the STMicro ROM bootloader, ready to accept a DFU upload. If you don't see it, the button combo didn't take — try again.

---

## 7. ⚠ Mandatory: back up your existing firmware

> **DO NOT SKIP THIS STEP.** This single command turns "I just bricked my saber" into "I just lost 30 seconds." If your new firmware doesn't boot for any reason — bug in the config, vendor option-byte mismatch, board variant we haven't tested — you'll restore from this backup and the saber will be back where it started.

Before flashing **anything new**, dump the current firmware to a file:

### V3 (512 KiB / Proffieboard V3.9, V3 Lite)

```bash
dfu-util -d 0x0483:0xdf11 -a 0 -U ~/my-saber-backup-$(date +%Y%m%d).bin \
  -s 0x08000000:524288
```

### V2 (256 KiB / Proffieboard V2.2)

```bash
dfu-util -d 0x0483:0xdf11 -a 0 -U ~/my-saber-backup-$(date +%Y%m%d).bin \
  -s 0x08000000:262144
```

You should see something like:

```
Upload    [=========================] 100%       524288 bytes
Upload done.
```

**Verify the file:**

```bash
ls -la ~/my-saber-backup-*.bin
# Expect ~524288 bytes (V3) or ~262144 bytes (V2). Anything zero-byte = failed dump.
```

**Store this somewhere safe** — same folder as your config, a Dropbox/iCloud sync folder, a tagged Git repo, whatever you'll be able to find in 6 months. If your saber came from a vendor with a custom bootloader (89sabers, KR, Saberbay), this backup is **the only copy** of that bootloader you control. Don't lose it.

> **Vendor-customized boards have a second alternate.** If your saber came pre-flashed by a vendor, run `dfu-util -l` and look for `alt=1` (Option Bytes). Some vendors set custom Option Bytes (notably 89sabers's `BFB2=1`, "Boot from Bank 2"). Read [§10](#10-vendor-customized-boards) before flashing those boards.

---

## 8. Flash

Strip the DFU suffix from the compiled `.iap` file (arduino-cli embeds Proffieboard's VID/PID in the suffix; `dfu-util` talking to the STMicro ROM bootloader rejects mismatched VID/PID):

```bash
SIZE=$(stat -f%z /tmp/proffie-build/ProffieOS.ino.iap 2>/dev/null \
  || stat -c%s /tmp/proffie-build/ProffieOS.ino.iap)
head -c $((SIZE - 16)) /tmp/proffie-build/ProffieOS.ino.iap \
  > /tmp/proffie-build/firmware.bin
```

Flash it:

```bash
dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000:leave \
  -D /tmp/proffie-build/firmware.bin
```

The `:leave` suffix on the address tells the bootloader to exit DFU mode and start the new firmware after the write completes.

You should see:

```
Download    [=========================] 100%       213484 bytes
Download done.
File downloaded successfully
Transitioning to dfuMANIFEST state
```

Then the saber should restart, the LEDs should respond, and the audio should announce your active font (or "font not found"/"SD card not found" if the SD isn't seated).

If the saber does **not** boot — LEDs dark, no audio, USB does not re-enumerate — go straight to [§11 Recovery](#11-recovery--restoring-from-backup).

---

## 9. The WebUSB FlashPanel is experimental

KyberStation's in-browser FlashPanel (the FLASH button on the bottom Delivery rail) is shipped as **experimental** in v1.0. The protocol is implemented and verified against a comprehensive mock test suite, but on real hardware the manifest phase has a known bug that can leave the chip stuck in DFU mode after a successful write.

**For v1.0, use the `dfu-util` workflow above.** It's the validated path; it has the mandatory backup step; it's recoverable.

The FlashPanel will be revisited in v0.16+ once we've root-caused the manifest-phase issue. If you want to experiment with it anyway: the panel itself has a disclaimer + acknowledgement step, and you can always recover via this guide.

---

## 10. Vendor-customized boards

Some saber vendors customize the Proffieboard before shipping — different bootloader, different Option Bytes, different memory layout. **A stock ProffieOS firmware compiled with default settings may not boot on a vendor-customized board.**

### 89sabers

89sabers ships V3.9 boards with **BFB2=1** in Option Bytes — "boot from Bank 2" — meaning their factory firmware lives at `0x08040000`, not the standard `0x08000000`. They also use a 4-config layout (`89V3_OBI.h`, `89V3_Purple.h`, `89V3_green.h`, `89V3_allfont.h`); the four configs are functionally identical, differing only in the first preset's blade color.

**Do not write to alt=1 (Option Bytes) on an 89sabers board** unless you have an ST-Link wired up and STM32CubeProgrammer ready as a recovery path. Clearing BFB2 makes the standard ProffieOS Bank 1 layout work but **also overwrites their bootloader stage**, and the chip will refuse to boot until the bootloader is restored.

If you have an 89sabers board: stick to flashing Bank 1 (`0x08000000:leave`) with the standard arduino-cli output. The board will tolerate this and run your config — `dfu-util` writes both banks, but the chip's BFB2 flag determines which one runs at boot. If your custom config doesn't boot, restore from your backup ([§11](#11-recovery--restoring-from-backup)) and check that you flashed the right bank.

### KR Sabers, Saberbay, Vader's Vault

These vendors use similar customization patterns to 89sabers — vendor splash screens, custom font selections in the default config, sometimes BFB2 set. The same rule applies: **don't touch Option Bytes**, flash Bank 1 only, keep your backup.

### Stock Proffieboards (Fredrik Hubbe / direct from the vendor)

If you bought your Proffieboard directly from [fredrik.hubbe.net](https://fredrik.hubbe.net/lightsaber/v3/) or assembled it yourself, you have a stock board. No Option Byte gotchas, no vendor bootloader stage. The standard workflow Just Works.

---

## 11. Recovery — restoring from backup

If your new firmware doesn't boot, you can always restore the backup you took in [§7](#7--mandatory-back-up-your-existing-firmware):

```bash
# 1. Re-enter DFU mode (same button combo as §6).
# 2. Verify the chip is visible:
dfu-util -l

# 3. Write the backup to Bank 1:
dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000:leave \
  -D ~/my-saber-backup-YYYYMMDD.bin
```

This restores your saber to exactly the state it was in before you started. Original sounds, original config, original everything. **30 seconds, fully recoverable.**

If the backup file restore also fails to boot:

- Double-check the file size matches the board's flash (524288 bytes for V3, 262144 bytes for V2).
- Try a stock ProffieOS binary from the [Crucible forum](https://crucible.hubbe.net/) as a fallback "is the chip alive?" check. If a stock binary boots, your backup file is corrupted; if a stock binary also doesn't boot, you have a different problem (see [§12](#12-troubleshooting)).
- File a GitHub Issue with the output of `dfu-util -l` and a description of what you flashed.

---

## 12. Troubleshooting

### `dfu-util: No DFU capable USB device available`

The chip isn't in DFU mode. Re-do the button combo from [§6](#6-enter-dfu-mode). On Linux, also confirm the udev rule is in place — without it, the device is owned by `root` and `dfu-util` returns this error.

### `dfu-util: Cannot open DFU device 0483:df11`

Permission issue. Linux: install the udev rule. macOS: usually transient; unplug/replug and retry. Windows: re-run Zadig and confirm WinUSB driver is bound to STM32 BOOTLOADER.

### `dfu-util: Invalid DFU suffix signature`

Expected — `dfu-util` warns about this but proceeds. Make sure you stripped the suffix per [§8](#8-flash); if you didn't, dfu-util will reject the file outright with a different error.

### Compile fails with "ProffieOS.ino:1:1: error: ..."

Your config references something the current ProffieOS source doesn't have, or your fqbn is wrong for the board variant. Confirm:
- `~/ProffieOS` is on a recent stable tag (`git -C ~/ProffieOS describe --tags`).
- Your fqbn matches your board (V3 vs V2).
- The downloaded `config.h` from KyberStation is the **full** config, not a single-preset style snippet (see [§4](#4-generate-your-config-from-kyberstation) limitation note).

### Saber boots but no audio / no SD card

That's a hardware/SD issue, not a flash issue. Confirm the SD card is seated and FAT32 formatted, your `~/SaberFonts/` directory layout matches the ProffieOS expected structure, and the font you reference in the config exists on the SD.

### Saber boots, blade lights, but the wrong font plays

Your config references a font directory that doesn't match the SD layout. Compare the font name in your KyberStation config to the actual folder names on the SD.

### Chip stuck in DFU after manifest phase (`dfu-util: can't detach`)

Known issue with certain board firmware combinations — particularly seen on 89sabers V3.9 with BFB2=1 after an Option Byte clear. The chip is alive but won't run the new firmware. Restore from backup ([§11](#11-recovery--restoring-from-backup)) — if you cleared Option Bytes, you may need ST-Link for full recovery.

---

## 13. FAQ

### "Can I just use Arduino IDE instead of arduino-cli?"

Yes. Open `~/ProffieOS/ProffieOS.ino` in Arduino IDE, select **Tools → Board → Proffieboard V3** (or V2), and use **Sketch → Export Compiled Binary**. The output is the same `.iap` file as `arduino-cli` produces; the [§8](#8-flash) suffix-strip + dfu-util steps are unchanged.

### "Why not let KyberStation flash directly from the browser?"

We do — there's a WebUSB FlashPanel inside the editor. But on real hardware its manifest phase has a known bug, so for v1.0 it's labeled experimental and we recommend the dfu-util workflow as the validated path. See [§9](#9-the-webusb-flashpanel-is-experimental).

### "Do I really have to back up every time?"

Strictly: only the first time, since the backup captures whatever firmware your board shipped with. After that, you have the file and can re-flash it any time. But — backing up before each flash takes ~30 seconds and means you can always roll back to the *exact* working state you were in. Cheap insurance.

### "What's the worst that can happen if I skip the backup and the flash goes wrong?"

The chip is alive (the STM32 ROM bootloader is silicon-burned and recoverable via DFU). But you'd have lost any vendor customization that came with the board — vendor splash screens, vendor-default presets, vendor-tweaked option bytes. Restoring those without a backup means contacting your saber vendor and asking for their factory firmware, which they may or may not provide. With a backup: 30 seconds and you're done.

### "Can I share configs with other people?"

Yes — KyberStation has a Kyber Code share feature that encodes the full config into a URL. Click the share button in the editor header. The recipient opens the URL in KyberStation, sees your design, and can export their own config.h to flash.

### "What about Verso, CFX, Golden Harvest, Xenopixel?"

KyberStation's editor and visualizer work for any Neopixel saber, but the **flashing path is Proffieboard-specific**. CFX and Golden Harvest use their own proprietary tools; Xenopixel boards are flashed via SD card config files, not USB DFU. KyberStation's role on those boards is design and visualization, not flashing.

---

## See also

- [`docs/WEBUSB_FLASH.md`](WEBUSB_FLASH.md) — protocol details for the (experimental) in-browser flasher.
- [`docs/PROFFIE_REFERENCE.md`](PROFFIE_REFERENCE.md) — ProffieOS template reference, useful when debugging config errors.
- [Fredrik Hubbe's Proffieboard docs](https://fredrik.hubbe.net/lightsaber/v3/) — upstream hardware documentation.
- [Crucible forum](https://crucible.hubbe.net/) — the saber community's canonical Q&A archive.

---

**Found a bug in this guide, or a vendor combo we haven't documented?** [File an issue](https://github.com/kenkoller/KyberStation/issues/new?template=bug_report.md) with the saber vendor + board variant + your OS + what happened. KyberStation is a hobby project and your hardware report makes the next user's experience better.
