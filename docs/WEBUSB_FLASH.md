# WebUSB Flash — technical reference

KyberStation v0.11.0 ships a one-click firmware flash affordance that
drives the Proffieboard's STM32 DFU bootloader straight from the
browser — no Arduino IDE, no `arduino-cli`, no Zadig driver dance on
Windows. This document explains how the pipeline works end-to-end, what
can go wrong, and how to recover.

If you are a user looking for the *how do I use it* story, start with
[`docs/PROFFIEOS_FLASHING_GUIDE.md`](./PROFFIEOS_FLASHING_GUIDE.md)
— the WebUSB flow is an optional shortcut around its "compile + upload"
steps.

---

## High-level pipeline

```
User clicks "Flash to Saber"
            ▼
DISCLAIMER (first time per session only)
            ▼
Pick firmware variant
  ├─ bundled:  apps/web/public/firmware/proffieos-7x-{variant}.bin
  └─ custom:   user's own .bin (compiled in Arduino IDE themselves)
            ▼
connectProffieboardDfu()
  ├─ navigator.usb.requestDevice({ filters: [STM32 VID/PID] })
  ├─ device.open()
  ├─ findDfuInterface → claimInterface
  ├─ read DfuSe alternate strings (e.g. "@Internal Flash /0x08000000/512*0002Kg")
  └─ selectAlternate(flash-capable)
            ▼
DfuSeFlasher.flash(firmware)
  ├─ ensureIdle       (clear DFU errors from a previous attempt)
  ├─ for each page:
  │     DNLOAD block 0 = [0x41, page_addr_le]   ← ERASE
  │     GET_STATUS poll until dfuDNLOAD_IDLE
  ├─ DNLOAD block 0 = [0x21, base_addr_le]      ← SET_ADDRESS
  ├─ for each chunk:
  │     DNLOAD block (i+2) = chunk_data          ← DNLOAD
  │     GET_STATUS poll until dfuDNLOAD_IDLE
  └─ DNLOAD block 0 = []                         ← MANIFEST
            ▼
Board detaches USB → reboots into new firmware
User reconnects SD card (if removed) → blade boots on their config.h
```

The code lives under
[`apps/web/lib/webusb/`](../apps/web/lib/webusb/) and
[`apps/web/components/editor/FlashPanel.tsx`](../apps/web/components/editor/FlashPanel.tsx).

---

## Protocol reference

### USB device identity

STM32 microcontrollers enter ROM-bootloader DFU mode and expose:

| Descriptor    | Value   |
|---------------|---------|
| VID           | `0x0483` (STMicroelectronics)           |
| PID           | `0xdf11` (STM32 DFU Bootloader, DfuSe)  |
| Interface class / subclass / protocol | `0xfe / 0x01 / 0x02` (DFU mode) |

KyberStation filters on VID + PID in
[`PROFFIEBOARD_DFU_FILTER`](../apps/web/lib/webusb/constants.ts).

### Entering DFU mode

The Proffieboard V3 enters DFU mode automatically when plugged in **after
ProffieOS has already been flashed** and the user sends `rebootDFU` over
the serial console, OR by holding the **BOOT** button while connecting
USB — the hardware recovery path that also works when the current
firmware is bricked.

### DFU class requests used

All sent with `bmRequestType = 0x21` (host→device, class, recipient=interface)
except status reads which use `0xA1`.

| Name        | bRequest | Direction | Purpose                                |
|-------------|----------|-----------|----------------------------------------|
| DETACH      | 0x00     | out       | Application-mode → DFU-mode transition |
| DNLOAD      | 0x01     | out       | Send a block to the device             |
| UPLOAD      | 0x02     | in        | Read a block from the device (verify)  |
| GETSTATUS   | 0x03     | in        | 6-byte status + pollTimeout + state    |
| CLRSTATUS   | 0x04     | out       | Clear an error, return to dfuIDLE      |
| GETSTATE    | 0x05     | in        | 1-byte state only                      |
| ABORT       | 0x06     | out       | Return to dfuIDLE from any idle state  |

### DfuSe vendor extensions

STM32's bootloader layers a command protocol on top of DFU's opaque
block concept. The first byte of a block-0 DNLOAD distinguishes the
command:

| First byte  | Command       | Payload (LE)                        |
|-------------|---------------|-------------------------------------|
| `0x21`      | SET_ADDRESS   | 4-byte target address               |
| `0x41`      | ERASE_PAGE    | 4-byte page address                 |
| `0x41`      | MASS_ERASE    | (no address — single byte payload)  |
| `0x92`      | READ_UNPROTECT| Clear RDP. Destroys flash.          |

Data blocks use block numbers ≥ 2 — DfuSe interprets them as an offset
from the last `SET_ADDRESS`:

```
flash_addr = address_pointer + (block_num - 2) × wTransferSize
```

See ST AN3156 §4.2 for the formal spec. KyberStation's implementation
lives in
[`DfuSeFlasher.ts`](../apps/web/lib/webusb/DfuSeFlasher.ts).

### Memory-layout strings

A DfuSe interface alternate's `interfaceName` string encodes the
writable flash region. On a Proffieboard V3 (STM32L452RE):

```
@Internal Flash  /0x08000000/512*0002Kg
```

Parsed by
[`parseDfuMemoryLayout`](../apps/web/lib/webusb/memoryLayout.ts):

- `0x08000000` — start address
- `512*0002K` — 512 sectors of 2 KiB each (1 MiB total)
- `g` — readable + erasable + writable

---

## Browser support

| Browser         | OS          | WebUSB | Notes                          |
|-----------------|-------------|--------|--------------------------------|
| Chrome          | macOS       | ✅     | Chromium WebUSB reference path |
| Chrome          | Windows     | ✅     | No Zadig needed for DFU VID    |
| Chrome          | Linux       | ✅     | Needs udev rule (below)        |
| Edge            | Win / Mac   | ✅     | Same engine as Chrome          |
| Brave           | any         | ✅     | Same engine as Chrome          |
| Arc             | macOS       | ✅     | Same engine as Chrome          |
| Safari          | macOS / iOS | ❌     | Apple does not ship WebUSB     |
| Firefox         | any         | ❌     | Mozilla declined to implement  |

### Validated hardware configurations

The flash flow relies on the STM32 DfuSe ROM bootloader, which is identical across all Proffieboard V3 / V3.9 / V3+OLED variants, and memory-layout-parameterised for V2. That means one validated configuration gives moderate confidence across the whole family — but only *real* hardware catches state-machine edge cases. (2026-04-20's validation session caught three real DFU-protocol bugs that 576 green mock tests had missed.)

| Board | OS | Browser | Status | Last verified |
|---|---|---|---|---|
| Proffieboard V3.9 (89sabers) | macOS 15 (Sonoma) | Brave | ✅ full: connect → dry-run → flash → verify → re-flash | 2026-04-20 |
| Proffieboard V3.9 | macOS | Chrome / Edge / Arc | 🟡 untested (same Chromium WebUSB impl as Brave) | — |
| Proffieboard V3.9 | Windows 10/11 | any Chromium | 🟡 untested (WinUSB driver path) | — |
| Proffieboard V3.9 | Linux | Chrome / Brave | 🟡 untested (udev rule required) | — |
| Proffieboard V2.2 | any | any Chromium | 🟡 untested (STM32L433CC, 256 KiB flash) | — |
| Proffieboard V3 + OLED | any | any Chromium | 🟡 untested (same STM32L4 as V3 standard) | — |

**Community validation is how this table grows.** If you flash your saber from KyberStation on a combination we haven't verified yet, a short hardware report really helps — see the [hardware_report](https://github.com/kenkoller/KyberStation/issues/new?template=hardware_report.md) issue template. One clean Connect → Dry-run → Flash → Reboot pass is all we need.

### macOS quirk — null `USBAlternateInterface.interfaceName`

Every Chromium-based browser on macOS (Chrome, Brave, Edge, Arc) currently returns `null` for `USBAlternateInterface.interfaceName` on DFU alternates, even when the device advertises valid string descriptors. This was a release-blocker — `findInternalFlash()` couldn't find a writable region. Fixed in [`DfuDevice.loadAlternates()`](../apps/web/lib/webusb/DfuDevice.ts) with a fallback to a raw `GET_DESCRIPTOR(config + string)` control transfer whenever any alternate comes back nameless. Windows and Linux are not affected — they populate the field natively.

If WebUSB is unavailable the FlashPanel surfaces a clear error message
and leaves the rest of the editor functional — the user can still
download `config.h` and flash with Arduino IDE the old way.

### Linux udev rule

Without a udev rule, Chrome asks for permission but the kernel denies
device access. Install one-off:

```bash
sudo tee /etc/udev/rules.d/49-proffieboard-dfu.rules <<'EOF'
SUBSYSTEM=="usb", ATTRS{idVendor}=="0483", ATTRS{idProduct}=="df11", MODE="0666"
EOF
sudo udevadm control --reload-rules
sudo udevadm trigger
```

---

## Recovery procedure

If a flash is interrupted mid-write the board is left with an incomplete
firmware image. The STM32's BOOT-pin DFU path is your safety net:

1. Unplug the USB cable.
2. Hold the **BOOT** button on the Proffieboard's PCB.
3. Re-plug USB while holding BOOT.
4. Release BOOT a second after the board enumerates.
5. In KyberStation's Flash panel, click **Connect Proffieboard (DFU
   mode)** and retry the flash.

The ROM bootloader always honours the BOOT-pin DFU path — it cannot
be overwritten by bad firmware, because it lives in a separate,
write-protected region of the STM32.

If retry still fails, the board is fine; the binary is suspect. Try
the user-supplied `.bin` path or compile ProffieOS yourself locally.

---

## Known protocol quirks

### Manifest GET_STATUS may be stalled

STM32 DfuSe bootloaders reset the USB pipe as part of manifestation
(`bitManifestationTolerant = 0`) rather than returning
`dfuMANIFEST_WAIT_RESET` cleanly. The final `GET_STATUS` poll can
surface as a "device disconnected" error or a raw `DOMException`
(Chrome's WebUSB API's way of saying the pipe went away), but the
flash itself has already succeeded. `DfuSeFlasher.waitForManifestComplete`
catches *any* error during the post-manifest poll and treats it as
success. Confirmed on Proffieboard V3.9 hardware 2026-04-20.

### DFU state-machine transitions around UPLOAD verify

The STM32 DfuSe bootloader is stricter than the DFU spec's state
diagram on two transitions that caused real-hardware STALLs on
2026-04-20:

1. **UPLOAD must start from `dfuIDLE`, not `dfuDNLOAD_IDLE`.** The
   readback-verify flow sets the address pointer (which leaves the
   device in `dfuDNLOAD_IDLE`), then issues UPLOAD. Without an
   intervening `abort()` to return to `dfuIDLE`, the first UPLOAD
   stalls. Fixed in `DfuSeFlasher.verifyFlash`.

2. **Manifest's zero-length DNLOAD must come from `dfuIDLE`, not
   `dfuUPLOAD_IDLE`.** After the UPLOAD verify loop the device is in
   `dfuUPLOAD_IDLE`, but the manifest command requires `dfuIDLE`. An
   `abort()` between verify and manifest is required. Fixed in
   `DfuSeFlasher.flash`.

Neither STALL was reproducible against the (too permissive) mock in
`apps/web/tests/webusb/mockUsbDevice.ts`; tightening the mock to
enforce these state rules is a known followup.

### Transfer size

ST's bootloader advertises a functional-descriptor `wTransferSize`
(typically 2048 bytes). We hardcode 2048 as
[`DFU_DEFAULT_TRANSFER_SIZE`](../apps/web/lib/webusb/constants.ts).
If a future bootloader advertises a different size, we'll need to read
the functional descriptor and use its value.

### Block numbering

A common bug when porting DFU code: block 0 is for SET_ADDRESS / ERASE
/ manifest, block 1 is reserved, and data starts at block **2**. Losing
that offset puts the first 2 KiB of firmware at the wrong address.

---

## Safety rails implemented

- WebUSB presence check before any request; falls back to a helpful notice.
- Vendor/product-ID filter on the picker — we can't accidentally flash
  a different USB device.
- DFU interface discovery — refuses to proceed if the chosen device
  doesn't expose a DFU-mode interface.
- Writable-flash region check — refuses to proceed if the alternate's
  parsed memory layout has no writable STM32-flash region.
- Per-firmware size cap (`FIRMWARE_MAX_BYTES`, 1 MiB) above which we
  refuse to upload.
- Per-region fit check — refuses if firmware doesn't fit the advertised
  sector count × sector size.
- First-time disclaimer gated by a sessionStorage flag; cannot be
  clicked past without an explicit checkbox acknowledgement.
- AbortSignal plumbed through `DfuSeFlasher.flash` — the Cancel button
  tears down the flash cleanly rather than leaving the board in an
  indeterminate state.

---

## Testing the protocol without hardware

`apps/web/tests/webusb/mockUsbDevice.ts` implements a pure-TypeScript
STM32 DfuSe mock: it tracks the address pointer, records erased pages,
simulates a DNBUSY→DNLOAD_IDLE transition, serves the 9-byte DFU
functional descriptor, and verifies flash contents against a simulated
0xff-initialised memory map. The mock's advertised flash layout
defaults to the real STM32L452RE descriptor (256 × 2 KiB = 512 KiB);
tests can override for V2's L433CC, custom wTransferSize values, or
silent-corruption scenarios.

Exercised by:

```bash
pnpm --filter @kyberstation/web test tests/webusb
```

**43 tests** cover:

- Memory-layout string parsing (multi-region, flag interpretation, malformed inputs)
- DFU class requests (GET_STATUS, GET_STATE, CLR_STATUS, ABORT, DNLOAD, UPLOAD) + standard GET_DESCRIPTOR(0x21) for the functional descriptor
- `pollUntilIdle` honours the device-reported `bwPollTimeout` between GET_STATUS calls
- Successful flash round-trip including SET_ADDRESS, ERASE, DNLOAD, MANIFEST
- **UPLOAD-based readback verification** catches silent flash corruption (bit flips during write)
- **Dry-run mode** runs the full protocol sequence without issuing a single DNLOAD
- Bootloader `wTransferSize` overrides the fallback (tests a 1024-byte bootloader)
- Realistic ~350 KB binary flashes end-to-end with byte-exact readback
- Flash-size fit check against the 512 KB STM32L452RE region
- Error paths: empty firmware, >1 MiB, doesn't fit in region, mid-flash dfuERROR, AbortSignal

## Dry-run mode — recommended for first-hardware test

The FlashPanel exposes a **Dry run** toggle. When on, the flasher:

1. Reads the memory layout from the real bootloader.
2. Walks through the erase / SET_ADDRESS / write / verify phases exactly as it would for a real flash.
3. Skips every `DNLOAD` — the bootloader receives no writes.
4. Reports progress through the same UI so you see the byte counts and block boundaries.

This is the recommended path for the **first** WebUSB test against a
real board: prove the memory layout is parsed correctly, the
wTransferSize matches what the board advertises, and the block-count
math lines up — all without committing anything to flash memory.

After a successful dry run, disable the toggle and flash for real.
