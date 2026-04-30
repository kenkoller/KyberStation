# Bluetooth Feasibility Research — KyberStation

**Date:** 2026-04-29
**Author:** Research session
**Status:** Research only — no implementation
**Inspiration:** [ForceSync by Shtok Custom Worx](https://shtokcustomworx.com/pages/forcesync)

---

## 1. Executive summary

**Yes, Bluetooth-based wireless preset/config control of Proffieboard V3.9 from KyberStation is feasible** and there is a clean precedent — ProffieOS author Fredrik Hubinette already ships a [proof-of-concept Web Bluetooth app](https://github.com/profezzorn/lightsaber-web-bluetooth) that drives sabers over BLE using the same plain-text serial command set the desktop USB Workbench uses. The realistic v1 scope is **a UART-over-BLE bridge** (BT-909-class module attached to ProffieOS's `Serial3` UART) that lets KyberStation send `set_preset`, `set_style`, `set_blade_color`, `play_track`, `clash`, `lockup` etc. wirelessly. **Firmware updates over BT are NOT possible** (DFU bootloader requires USB), and **sound-font transfer over BT is impractical** (BLE serial throughput ≈ 1–4 KB/s vs typical font folders of 50–200 MB). The cost is meaningful: Web Bluetooth is **Chromium-only on desktop, blocked on Brave by default, never coming to iOS Safari**, and requires the user to buy + wire a $25–35 BT-909 module into their saber. Recommendation below in §8.

---

## 2. Hardware reality

### 2.1 Proffieboard V3.9 — no onboard Bluetooth

The STM32L4-based Proffieboard V3.9 has **no integrated Bluetooth radio**. The chip itself (STM32L433/L431/L451 family, depending on revision) is non-wireless. Bluetooth is added via an **external BLE-to-serial bridge module** wired to one of the board's UART pins. ([Artekit V3.9 docs](https://www.artekit.eu/doc/guides/proffieboard-v3-9/), [Saberbay V3.9 product page](https://www.saberbay.com/products/proffieboard-v3-9))

### 2.2 The BT-909 (Feasycom FSC-BT909) is the de-facto standard

The lightsaber community has standardized on the **Feasycom FSC-BT909** module — Bluetooth 5.x, ~9 mm × 13 mm, 2.7 V to 3.3 V supply, AT-command provisioning, and a transparent UART pass-through service. Shtok Custom Worx, Saberbay, The Saber Armory, and Custom Saber Shop all sell pre-flashed BT-909 breakout boards specifically marketed as "ForceSync compatible" for Proffieboard. Retail is roughly **$25–35** for the bare module, $40–55 with a breakout PCB. Older HC-05/HM-10 modules are technically usable but the community has converged on BT-909 because of better range, smaller footprint, and signed firmware images that work out-of-the-box with ForceSync. ([Saber Armory FSC-BT909](https://thesaberarmory.com/products/fsc-bt909-bluetooth-module), [Saberbay BT909 V2](https://www.saberbay.com/products/copy-of-scw-bt909-bluetooth-module-w-breakout-board), [Feasycom datasheet](https://www.feasycom.com/datasheet/fsc-bt909c.pdf))

### 2.3 Wiring (3-wire UART)

- **BT909 TX → Proffie RX** (typically `Serial3.RX`, exposed as a TX/RX pad pair on V3.9)
- **BT909 RX → Proffie TX**
- **BT909 VCC → Proffie 3.3 V or SD power pad** (3 V regulated; **NOT BATT+**)
- **BT909 GND → board GND**

Known gotcha: there's a **missing-capacitor footprint** on early Proffie V3.9 batches that, when paired with a BT-909, can prevent the board from powering up. The Crucible thread documents the workaround (add a small bypass cap between two specific pads on the top of the V3.9). ([BT-909 power on Proffie 3.9 — Crucible](https://crucible.hubbe.net/t/bt-909-power-connection-on-proffie-v3-9/6212), [BT-909 power not working — Crucible](https://crucible.hubbe.net/t/proffie-v3-9-not-working-anymore-when-bt-909-is-connected/5148))

### 2.4 Power cost

Once the BT-909 is wired and ProffieOS is built with `#define ENABLE_SERIAL`, the board draws roughly **+50 mA continuous** while idle with the OLED + BLE on (community-measured on Crucible). At a typical 3 Ah saber battery that's roughly 60 hours of standby drain attributable to BT — meaningful but not deal-breaking. Deep-sleep paths exist (the SD power pad can gate BLE power) but only fire when the saber is fully off, not just retracted. ([Proffie deep sleep — Crucible](https://crucible.hubbe.net/t/proffieboard-v2-2-deep-sleep-mode/459))

### 2.5 Pre-built saber options

A user does not have to wire BT-909 themselves. **Sabertrio sells "Proffie Bluetooth Power Cores"** with BT pre-integrated — V3.9 + BT-909 + breakout already done — as a $200+ drop-in chassis upgrade. Vendors like 89sabers, Vader's Vault, SaberMach, Electrum Sabercrafts, and Sabertrio ship Bluetooth-enabled sabers as a checkbox option. So there's a real installed base today, but it skews toward higher-end vendor builds, not DIY hobbyists. ([Sabertrio Proffie Bluetooth Power Core](https://sabertrio.com/products/proffie-power-core), [Sabertrio Bluetooth user guide](https://sabertrio.com/pages/using-bluetooth))

---

## 3. Protocol options

### 3.1 ProffieOS does serial-over-BLE, not a custom binary protocol — **this is the load-bearing finding**

ProffieOS's `common/serial.h` exposes `Serial3Adapter` (`SERIAL_INTERFACES_COUNT > 3`) at 115200 baud. When a BT-909 is wired to UART3 and the board is built with `#define ENABLE_SERIAL`, every line that arrives on the BT-909 is fed into the same `Parser` class that handles USB CDC commands. **The BT module is a completely transparent serial bridge** — there is zero ProffieOS-side awareness that the bytes came from BLE rather than USB. ([ProffieOS common/serial.h](https://github.com/profezzorn/ProffieOS/blob/master/common/serial.h))

This means **the entire ProffieOS serial command vocabulary is available over BT**:

- `on` / `off` — ignite / retract
- `set_preset N` — change preset
- `set_style N <code>` — push a new style at runtime
- `set_blade_color <r> <g> <b>` — runtime color change (no flash)
- `set_font <name>` / `set_track <name>` — change font / music
- `play_track <name>` — play a track
- `clash` / `blast` / `force` / `lockup` / `drag` / `melt` — trigger effects
- `set_blade_length <blade> <n>` — runtime LED count
- `get_preset` / `get_track` / `get_volume` / `battery_voltage` — readback
- `list_presets` — full preset enumeration
- `version` — firmware version

The full list lives at the [ProffieOS Serial Monitor Commands wiki](https://github.com/profezzorn/ProffieOS/wiki/Serial-Monitor-Commands).

### 3.2 The Hubinette reference implementation exists today

The author of ProffieOS himself, Fredrik Hubinette, ships a Web Bluetooth proof-of-concept at [profezzorn/lightsaber-web-bluetooth](https://github.com/profezzorn/lightsaber-web-bluetooth) (5 stars, last pushed 2026-02-04). The full source is one HTML file. **Reading that source confirms the protocol is identical to USB serial** — see for example:

```js
Send("set_preset " + n);
Send("set_style" + blade + " " + ret);
Send("set_blade_length " + blade + " " + length);
await Send("battery_voltage", true);
preset_string = await Send("list_presets", true);
```

The app supports **six different BLE UART services** on its UUID whitelist:

| Service UUID prefix | Module |
|---|---|
| `713d0000-…` | Hubinette's "special blend" (BT-909 with custom firmware) |
| `6e400001-…` | Nordic UART Service (NUS) — RN4870, BlueGiga, generic |
| `49535343-…` | ISSC / Microchip |
| `0000fff0-…` | ISSC Transparent |
| `0000ffe0-…` | HM-10, JDY-08, AT-09 (clones) |
| `0000fefb-…` | Stollmann Terminal IO |
| `569a1101-…` | Laird BL600 VSP |

This is a generic catch-all for "any BLE module that does GATT-based UART pass-through." That's the same shape KyberStation would adopt.

### 3.3 What you get for free vs what you have to build

**For free** (all already in ProffieOS, all already exercised by the Hubinette app):
- Live preset changes
- Live style + color edits without re-flash
- Effect triggers (clash / blast / lockup / drag)
- Battery telemetry
- Track playback
- Preset list + reordering / duplication / deletion
- Volume / clash threshold / blade dimming
- Optional pairing PIN via `BLE_PASSWORD` define (`get_ble_config` command returns the configured PIN/name to authenticated clients)

**Have to build** (KyberStation-side):
- Web Bluetooth pairing flow (`navigator.bluetooth.requestDevice` with the 6-UUID whitelist)
- Serial line buffering + tag-correlated request/response (Hubinette's `Send2` does request tagging — `<n>| <cmd>` with a sequence number — and waits for `<n>| <response>` to come back; 20-bytes-per-write GATT MTU constraint matters)
- Disconnect-and-reconnect resilience
- A "Push current KyberStation design to saber" action that translates a `BladeConfig` to the appropriate `set_style` / `set_blade_color` / `set_preset` calls

---

## 4. Web Bluetooth browser support matrix

This is the load-bearing constraint. **Web Bluetooth is permanently a Chromium-desktop + Android-Chrome feature** — it will never work in Safari (any platform), Firefox (any platform), or any iOS browser (because all iOS browsers must use Apple's WebKit engine). ([MDN Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), [caniuse Web Bluetooth](https://caniuse.com/web-bluetooth), [WebBluetoothCG implementation status](https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md))

| Browser / Platform | Web BT status | Notes |
|---|---|---|
| **Chrome desktop** (macOS / Windows / Linux / ChromeOS) | ✅ Stable since v56 | The reference implementation |
| **Edge desktop** (Win / Mac) | ✅ Stable since v79 | Same Chromium base |
| **Brave desktop** | ⚠️ **Disabled by default** — must enable `brave://flags/#brave-web-bluetooth-api` | Same pattern as the FSA flag we already document for sound fonts (per `reference_brave_fsa_flag.md` memory). UX cost: warn the user, link to the flag. ([Brave brave-browser#15637](https://github.com/brave/brave-browser/issues/15637)) |
| **Arc desktop** (Chromium) | ✅ Should work — Chromium-derivative | Untested by our team |
| **Opera desktop** | ✅ Supported | Chromium-based |
| **Chrome Android** (6.0+) | ✅ Stable | The mobile story |
| **Samsung Internet (Android)** | ✅ Since v6.2 | Chromium-based |
| **Firefox** (any platform) | ❌ Never | Mozilla has stated they will not implement on security grounds |
| **Safari desktop** (macOS) | ❌ Never | No WebKit implementation, no roadmap |
| **iOS Safari** (and ALL iOS browsers — Chrome iOS / Edge iOS / Brave iOS) | ❌ **Hard-blocked by Apple** — all iOS browsers are forced to use WebKit, which has no Web BT | This cuts iOS users entirely from the in-browser path |
| **iOS via Bluefy / WebBLE** | 🟡 Workaround | [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) is an iOS-only browser that ships its own BLE shim. Works for Web BT pages, but it's a third-party download, not the user's default browser. ~$3 paid app. Realistically nobody will install this just for our editor. |

**Realistic addressable market for in-browser BT:** Chromium desktop users (Chrome / Edge / Brave-with-flag / Arc / Opera) + Android Chrome users. **iOS users are excluded.** Per `caniuse.com/web-bluetooth`, that's roughly **65–70% of global browser usage** in 2026, but the iOS exclusion is the user-facing pain — every iPhone user will ask "why doesn't this work on my phone?"

---

## 5. Realistic v1 scope proposal

Three tiers, each shippable as a self-contained increment. **Each tier inherits everything from the previous tier.**

### 5.1 — 2-week sprint: "Wireless Trigger" (read-only-ish)

Pure live-control parity with the existing FlashPanel, no design-push. The minimum-viable demo.

**Scope:**
- New `BluetoothPanel` next to `FlashPanel` — pairing UI via `navigator.bluetooth.requestDevice` with the 6-UUID whitelist
- New `lib/webbluetooth/` — `BleSerial` class wrapping `getCharacteristic('rx').writeValue` + `tx.startNotifications()` + 20-byte MTU chunking + tag-correlated request/response
- New `useBluetoothConnection` hook publishing connection state to a Zustand store (mirror of existing `useWebUsbStore` pattern from PR #104)
- Effect trigger buttons in the workbench wire to the BT serial: `IGNITE` → `Send("on")`, `CLASH` → `Send("clash")`, etc.
- Preset switcher — read `list_presets`, render dropdown, `set_preset N` on selection
- Battery readout in StatusBar (`battery_voltage` polled every 30 s)
- Brave-flag warning copy (matches the existing FSA flag UX)
- Tests against a `MockBleDevice` (same shape as our existing `MockUsbDevice`)

**Hardware requirement for the user:** BT-909 already wired into their saber + ProffieOS built with `#define ENABLE_SERIAL` and `#define BLE_PASSWORD "000000"`.

**What this proves:** the protocol works, the pairing UX works, KyberStation can talk to a real saber wirelessly. It does NOT yet push designs or do anything the existing ForceSync app doesn't already do.

### 5.2 — 4-week sprint: "Design Push" (the differentiator)

This is what would make KyberStation's BT story genuinely better than ForceSync. ForceSync is a remote control; KyberStation would be a **wireless design pipeline**.

**Adds on top of 5.1:**
- "Beam to saber" button on every design surface (action bar, gallery, share preview)
- Translates the active KyberStation `BladeConfig` to a sequence of ProffieOS serial commands:
  - `set_blade_color <r> <g> <b>`
  - `set_style <preset_idx> StylePtr<...>` (the same C++ template string our `generateStyleCode` emits, but as a one-liner — ProffieOS supports the inline form via `set_style`)
  - `set_font <name>` if the font is already on SD
  - `set_clash_threshold` / `set_blade_dimming`
- "Save current saber state to KyberStation" reverse direction — read the saber's current preset list via `list_presets`, parse, hydrate into the editor
- Hot-swap design: every slider drag in the editor pushes a debounced `set_blade_color` so the live saber tracks the workbench in real-time
- Connection-state UI throughout the app (existing `StatusBar` BOARD chip can publish "BLE · CONNECTED · 89SABERS" instead of just "FULL")

**What this proves:** KyberStation becomes a **wireless DAW for lightsabers** — what Logic Pro is to a hardware synth. No competitor (ForceSync, Crystal FX, Fett263 web tools) does live-as-you-edit design push.

### 5.3 — 8-week sprint: "Full Wireless Pipeline" (stretch)

Adds operations that aren't shippable in 4 weeks because they touch SD card I/O over a serial line.

**Adds on top of 5.2:**
- Preset-list reordering / duplicate / delete (4-week scope already has this if we want it)
- Sound font selection from a wireless-readable manifest of what's on the SD
- `presets.ini` push — write the entire ProffieOS preset block to the saber's SD via the serial protocol's `mount_sd` + file-write commands, eliminating the "compile + flash" step for new preset deployment
- OLED bitmap push (`bmp_upload`) — wireless OLED art install for V3.9-OLED configurations
- Multi-saber pair-and-switch (one connection at a time, but quick-swap)
- Optional Electron sidecar (post-launch v0.16+ per `project_electron_companion_post_launch.md` memory) for serial-over-BT + serial-over-USB unified surface

**What this proves:** "I can develop, design, and deploy a full saber config — including new presets and OLED art — without ever plugging in a USB cable." That's a different category of product.

### 5.4 — Hard ceiling: what is NOT in any tier

- **Firmware updates over BT.** Reflashing ProffieOS itself requires the STM32 DFU bootloader, which only appears on the USB CDC interface after a hold-BOOT-tap-RESET sequence. There is no path to put the chip into DFU mode over a UART. The `dfu-util` workflow we already document in [`docs/FLASH_GUIDE.md`](../FLASH_GUIDE.md) remains the only way to update firmware. ForceSync also doesn't do this — it's a hard hardware constraint.
- **Sound font transfer over BT.** A typical sound font folder is 50–200 MB. BLE serial throughput at 115200 baud with overhead is realistically 1–4 KB/s. That's **8–24 hours per font.** The SD card pull-and-load workflow stays. (89sabers etc. ship 25 fonts per saber — that'd be a week of waiting.)
- **CFX, GHv4, Plecter compatibility.** ForceSync supports CFX / GHv4 / Plecter / TeensySaber as well as Proffie. KyberStation is Proffieboard-only by design (see `project_audience_proffieboard_hobbyist.md` memory). Not a regression; just scoping.

---

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **iOS users locked out** of in-browser BT entirely | High | Document clearly. Direct iOS users to the existing FlashPanel + dfu-util workflow OR to the third-party Bluefy browser as an opt-in escape hatch. Don't pretend iOS works. |
| **Brave disables Web BT by default** | Medium | Same warning UX we already ship for FSA; user enables `brave://flags/#brave-web-bluetooth-api`. ~30 sec, one-time. |
| **BT-909 module variants behave differently** | Medium | Test against both Hubinette's "special blend" UUID set AND the generic Nordic UART UUID. The 6-UUID whitelist in Hubinette's app is the canonical compatibility list — copy it. |
| **Pairing PIN UX (`BLE_PASSWORD`) is fiddly** | Low | The default Shtok-shipped PIN is `000000`. If `BLE_PASSWORD` is unset, ProffieOS doesn't require pairing at all. Show the PIN entry only when the saber rejects the unauthenticated connection. |
| **Firmware mismatch — old ProffieOS without `ENABLE_SERIAL` for `Serial3`** | Medium | Send `version` immediately on connect; if ProffieOS < 7.x or `Serial3Adapter` not built, show a "your saber's firmware doesn't support Bluetooth — flash a recent ProffieOS first" toast linking to FLASH_GUIDE. |
| **Latency / dropouts during live editing** | Medium | Debounce slider→`set_blade_color` writes to ~33 ms (30 fps cap, well within BLE GATT write capacity). Buffer + retry on transient disconnect. The Hubinette app's `tag_number` request-correlation pattern handles out-of-order responses cleanly. |
| **Concurrent-connection cap** — only one client at a time | Low | BLE GATT is one-controller-at-a-time by design. Shipping with explicit "another client is connected" detection is enough. |
| **Connection drops mid-write during preset push** | High | Atomic per-command push (`set_preset N` is one line) — never persist partial state. The saber stays on whatever preset succeeded last. Document this in user copy. |
| **WebUSB + WebBT can't share device** | Low | They're mutually exclusive at the OS level for the same device. Easy to enforce — pick one connection mode per session. |
| **Battery cost (+50 mA standby) annoys some users** | Low | Document. Some users will decline to install BT-909 specifically to keep deep-sleep current low. Their loss; not our problem. |
| **macOS Chromium WebUSB null-name bug** has a Bluetooth twin we haven't found yet | Medium | Prebuild a `MockBleDevice` test that shadows real-OS quirks (the way `MockUsbDevice` does for WebUSB per the 2026-04-20 hardware validation session). Discover bugs in CI rather than on user hardware. |
| **Vendor-customized boards with different UUIDs** | Medium | The Hubinette app whitelists 6 UUIDs because the BLE-module-firmware market has fragmented. Test against the BT-909 first, but expose a "scan all services" debug mode for vendors that ship custom firmware. |

---

## 7. Comparison to ForceSync

ForceSync (Shtok Custom Worx, 2019–present) is the dominant solution. KyberStation does NOT need to displace it — they solve different problems. ([ShtokCustomWorx ForceSync page](https://shtokcustomworx.com/pages/forcesync), [ForceSync Mobile App page](https://shtokcustomworx.com/pages/forcesync-mobile-app), [ForceSync user guide PDF](https://electrumsabers.com/content/ForceSyncUserGuide.pdf), [Crucible thread](https://crucible.hubbe.net/t/forcesync-app-bluetooth-smartphone-remote-control/169))

| Aspect | ForceSync | KyberStation BT (proposed) |
|---|---|---|
| **Form factor** | Native iOS + Android apps (App Store, Google Play) | Web app, Web Bluetooth |
| **Platforms** | iOS + Android | Chromium desktop (Mac/Win/Linux) + Android Chrome — **NO iOS** |
| **Open source** | No (closed-source, proprietary) | Yes (MIT, source on GitHub) |
| **Boards** | CFX, CFv10, CFv9, Crystal Shard, Prizm, GHv4, Proffie V1/V2/V3, TeensySaber V3 | Proffie V3.9 only (V2.2 if `ENABLE_SERIAL` is built) |
| **Use case** | Live remote control: change preset / color / volume / effects mid-duel | Wireless **design push**: edit in browser, push to saber, iterate |
| **Protocol** | Likely the same UART-over-BLE serial protocol (the user guide describes the same command set), but app source isn't published | UART-over-BLE — same as Hubinette's open reference impl |
| **Pricing** | Lite free; Pro paid in-app upgrade (Pro adds full sound-board control on CFX + Proffie) | Free, MIT |
| **Strengths** | Mobile-native UX (iOS users covered), broad board support, mature, polished, vendor-blessed | Editor-coupled — push designs you literally just authored; full-fidelity workbench preview matches what the saber will do |
| **Weaknesses** | Closed-source — can't verify what it does; no in-editor design path; PRO upgrade for full features | iOS exclusion is real and unavoidable |

**ForceSync is a remote control for an already-configured saber. KyberStation BT would be a wireless development environment.** They co-exist cleanly. Power users will keep ForceSync on their phone for performance use (mid-duel preset switching) and reach for KyberStation+BT on their laptop for design iteration.

---

## 8. Recommendation

**Defer to v0.17 minimum, possibly later. Do NOT pursue for v1.0 launch.**

### Why defer

1. **v1.0 launch is in 48 hours** (per `project_launch_deadline_2026-05-01.md` memory). Bluetooth is a multi-week project. Not in launch scope, full stop.

2. **Web Bluetooth's iOS exclusion makes it a partial story.** Until we ship an Electron sidecar (post-launch v0.16+) or a native mobile app, users on iPhones can't use it. That's a non-trivial fraction of our audience. Better to ship it once we have an iOS path than ship it twice.

3. **The existing Tier 1 hardware path (FlashPanel + dfu-util via FLASH_GUIDE.md) is honest, validated, and works on every platform.** That's launch-critical. BT would compete for engineering time against the single most reliable path users have.

4. **ForceSync owns the live-control market.** KyberStation's strategic moat is the editor + workbench. The differentiated BT story (design push, hot-swap design, beam-to-saber) requires the 4-week Tier 2 scope, not Tier 1. Half-shipping (Tier 1) gives users a worse ForceSync; full-shipping is a v0.17 commitment.

5. **The hardware install base is a chicken-and-egg problem.** Most DIY hobbyists do NOT have a BT-909 wired into their saber today. ForceSync's installed base skews heavily toward vendor-shipped sabers (Sabertrio, 89sabers Bluetooth chassis). Shipping our BT feature in v1.0 would benefit a small, mostly vendor-served slice of the audience while costing 4–6 weeks of post-launch engineering.

### When to revisit

- **v0.17 — design-push BT (4-week scope).** Once we have:
  - 30+ days of post-launch user feedback confirming the editor + flash workflow is solid
  - Either an Electron sidecar (`project_electron_companion_post_launch.md`) or commitment to ship without iOS support
  - Hardware on hand: a BT-909 wired into Ken's existing 89sabers V3.9 test saber
- **v0.18+ — full wireless pipeline (8-week scope).** Once SD-card-over-serial proves reliable on hardware AND there's clear user demand.

### What to do NOW (v1.0)

- Add a one-paragraph "Wireless Bluetooth control coming in v0.17" callout to the README's Flash section
- File a public GitHub issue tracking BT scope so users know it's on the roadmap, not abandoned
- Keep a private follow-up doc (this file) so the v0.17 sprint doesn't re-research the same ground
- **Do not block launch on this**

### What to do EARLIER if circumstances change

If a community vendor (Sabertrio, 89sabers) reaches out post-launch wanting a deeper KyberStation integration for their Bluetooth chassis, that's a strong reason to accelerate. The code is mostly done — Hubinette's reference app is ~50 KB of vanilla JS and we'd port it to TypeScript in a few days.

---

## Sources

### ProffieOS (the load-bearing implementation)

- [profezzorn/ProffieOS — main repo](https://github.com/profezzorn/ProffieOS)
- [`common/serial.h` — `Serial3Adapter`, `BLE_PASSWORD`, `get_ble_config`, `Parser`](https://github.com/profezzorn/ProffieOS/blob/master/common/serial.h)
- [Serial Monitor Commands wiki — full vocabulary](https://github.com/profezzorn/ProffieOS/wiki/Serial-Monitor-Commands)
- [WebUSB wiki](https://github.com/profezzorn/ProffieOS/wiki/WebUSB)

### Reference Web BT app (the proof it works)

- [profezzorn/lightsaber-web-bluetooth — Hubinette's PoC](https://github.com/profezzorn/lightsaber-web-bluetooth)
- [Live demo](https://profezzorn.github.io/lightsaber-web-bluetooth/app.html)

### ForceSync

- [ShtokCustomWorx ForceSync overview](https://shtokcustomworx.com/pages/forcesync)
- [ForceSync Mobile App page](https://shtokcustomworx.com/pages/forcesync-mobile-app)
- [ForceSync user guide PDF (mirrored at Electrum Sabers)](https://electrumsabers.com/content/ForceSyncUserGuide.pdf)
- [ForceSync iOS App Store](https://apps.apple.com/us/app/forcesync/id1439683611)
- [ForceSync Lite — Google Play](https://play.google.com/store/apps/details?id=com.forcesync.saber.forcesync.lite)
- [Crucible — ForceSync app thread](https://crucible.hubbe.net/t/forcesync-app-bluetooth-smartphone-remote-control/169)
- [FX-Sabers — ForceSync announcement thread](https://fx-sabers.com/forum/index.php?topic=53667.0)

### BT-909 module + wiring

- [Feasycom FSC-BT909C datasheet](https://www.feasycom.com/datasheet/fsc-bt909c.pdf)
- [Saber Armory — FSC-BT909 module](https://thesaberarmory.com/products/fsc-bt909-bluetooth-module)
- [Saberbay — SCW BT909 V2](https://www.saberbay.com/products/copy-of-scw-bt909-bluetooth-module-w-breakout-board)
- [Custom Saber Shop — BT909 module](https://www.thecustomsabershop.com/Electronics/BluetoothUSBRICE/Bluetooth-Module-BT909)
- [Crucible — BT-909 power on Proffie 3.9](https://crucible.hubbe.net/t/bt-909-power-connection-on-proffie-v3-9/6212)
- [Crucible — BT-909 capacitor issue](https://crucible.hubbe.net/t/proffie-v3-9-not-working-anymore-when-bt-909-is-connected/5148)
- [FX-Sabers — Wireless control HOW-TO](https://www.fx-sabers.com/forum/index.php?topic=52381.0)

### Web Bluetooth API

- [MDN — Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [caniuse — Web Bluetooth](https://caniuse.com/web-bluetooth)
- [WebBluetoothCG — implementation status](https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md)
- [Chrome Status — Web Bluetooth API](https://chromestatus.com/feature/5264933985976320)
- [Brave — Web Bluetooth disabled by default](https://github.com/brave/brave-browser/issues/15637)
- [Bluefy — iOS Web BT browser](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055)

### Vendor-shipped Bluetooth sabers

- [Sabertrio — Proffie Bluetooth Power Core](https://sabertrio.com/products/proffie-power-core)
- [Sabertrio — Using Bluetooth user guide](https://sabertrio.com/pages/using-bluetooth)
- [Saberbay Proffieboard V3.9](https://www.saberbay.com/products/proffieboard-v3-9)
- [Artekit Proffieboard V3.9 documentation](https://www.artekit.eu/doc/guides/proffieboard-v3-9/)

### ProffieOS runtime edit / color change capabilities

- [Edit Mode for ProffieOS6 — Crucible](https://crucible.hubbe.net/t/edit-mode-and-other-additions-for-proffieos6/114)
- [ColorChange in a blade style — POD](https://pod.hubbe.net/config/color-change.html)
- [ProffieOS6 Edit Mode — Fett263](https://www.fett263.com/proffieOS6-edit-mode.html)
