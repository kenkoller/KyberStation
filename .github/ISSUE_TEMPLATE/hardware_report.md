---
name: Hardware Report
about: Report how KyberStation's Flash panel worked (or didn't) on your board / OS / browser
title: "[HW] <board> / <OS> / <browser> — <result>"
labels: hardware-report
assignees: ''
---

## Thanks for helping validate coverage!

We've only been able to verify KyberStation's WebUSB Flash feature on one specific combination (Proffieboard V3.9 + macOS + Brave). Every independent report — success or failure — helps build a real compatibility matrix for users. A short report is plenty.

> If your saber uses a non-STM32 board (CFX, Xenopixel, Golden Harvest, etc.), this form doesn't apply — KyberStation can still export your `config.h`, but flashing is done through your vendor's own tool. Please file a regular bug report instead.

## Hardware

- **Board revision**: (e.g., Proffieboard V3.9 / V3 + OLED / V2.2 / V1)
- **Purchased from**: (89sabers / Electro Dynamics / TCSS / other)
- **STM32 on the board** (optional, from the chip's silkscreen): (e.g., STM32L452RE / STM32L433CC)

## Software

- **OS + version**: (e.g., macOS 15.3 / Windows 11 23H2 / Ubuntu 24.04)
- **Browser + version**: (e.g., Brave 1.68 / Chrome 130 / Edge 130 / Arc)
- **KyberStation URL you flashed from**: (deployed GitHub Pages URL, a local `pnpm dev`, or a specific branch)

## Result

Pick whichever applies and fill in the details:

### ✅ Success

Which phases ran cleanly?

- [ ] Connect — banner says `STMicroelectronics STM32 BOOTLOADER — <N> KiB flash ready`
- [ ] Dry run — final banner: `Dry run complete. No bytes were written.`
- [ ] Real flash — progress walks erase → writing → verifying → finalising → done
- [ ] Unplug → replug (no BOOT): board boots; blade behaves as expected

Notes (binary size, block count reported, wall-clock time per phase, anything surprising):

### ⚠️ Partial / Worked with caveats

What worked:

What didn't:

### ❌ Failed

- **Phase it failed in**: (connect / erase / writing / verifying / finalising / reboot)
- **Error text shown in the panel** (paste verbatim):

```
<paste error here>
```

- **Browser console errors** (F12 → Console, paste relevant lines):

```
<paste console here>
```

- **Did BOOT+RESET recovery work?** Could you put the board back in DFU mode and re-flash?

## Anything else

Screenshots, short video, physical observations (LED behaviour, button response), or notes about what your saber did before you tried to flash.
