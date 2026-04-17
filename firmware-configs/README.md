# KyberStation firmware build configs

These `config.h` files drive the `firmware-build` GitHub Actions workflow
(`.github/workflows/firmware-build.yml`). Each file is dropped into
`ProffieOS/config/config.h` before compile.

The goal is a neutral, widely-compatible build — **not** a user's personal
blade configuration. Every variant:

- Enables the Fett263 prop file (the most common saber button map).
- Ships a single dummy preset so the firmware boots cleanly on first flash.
- Leaves style + colour decisions to the user's **real** config.h which
  they author in KyberStation and copy onto the SD card alongside the
  binary flashed here.

| File                | Board | LED count | OLED | Notes                          |
|---------------------|-------|-----------|------|--------------------------------|
| v3-standard.h       | V3    | 144       | no   | Fett263 + edit menu            |
| v3-oled.h           | V3    | 144       | yes  | + SSD1306 driver               |
| v2-standard.h       | V2    | 144       | no   | Same features, V2 pinout       |

**Why these are simple stubs.** The binary we flash only provides the
ProffieOS runtime — the style / font selection happens at SD-card read
time, so the compiled-in preset is just a boot placeholder. Users replace
`presets.ini` (Fett263 edit mode) on the card to pick their real config.
