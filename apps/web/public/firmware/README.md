# ProffieOS Firmware Binaries

This directory holds pre-built ProffieOS 7.x firmware binaries that the
KyberStation WebUSB flash panel can send to a connected Proffieboard.

## How binaries land here

Binaries are produced by the `firmware-build` GitHub Actions workflow
(see `.github/workflows/firmware-build.yml`) and committed to the
repository as release artefacts on every `v*` tag. The workflow checks
out ProffieOS 7.x, compiles one binary per variant, and copies the
resulting `.bin` files into this directory.

## Variants shipped (v0.11.0)

| File                          | Board | OLED | Notes                          |
|-------------------------------|-------|------|--------------------------------|
| proffieos-7x-v3-standard.bin  | V3    | no   | Fett263 prop, SD + audio + WS2811 |
| proffieos-7x-v3-oled.bin      | V3    | yes  | Standard + SSD1306 driver      |
| proffieos-7x-v2-standard.bin  | V2    | no   | Standard build for V2 boards   |

## Missing binaries

If a binary is absent at runtime (the `fetch` request 404s), the
FlashPanel surfaces a user-friendly error and points the user at the
"Custom .bin" file picker. Pre-built binaries are a convenience, not
a requirement — power users can always compile ProffieOS themselves and
upload the resulting `.bin` directly.

## Licensing

ProffieOS is licensed under GPL-3.0. Its source is not bundled in this
repository. Binaries produced by the `firmware-build` workflow are
distributed under GPL-3.0 terms (see `LICENSES/ProffieOS-GPL-3.0.txt`).
KyberStation's own source remains MIT — the binary/source separation
is documented in the README under "License aggregation."
