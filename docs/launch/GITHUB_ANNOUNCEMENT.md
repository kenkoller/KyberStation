# GitHub Announcement

*Note: as of 2026-04-30 the repo is already public, v0.16.0 is
already tagged + deployed, and the URL works. Steps 1-2 are kept
for reference but already complete. Focus on 3-4.*

1. ~~Push the `v0.16.0` tag (triggers release.yml → GitHub Release page)~~ ✓ done
2. ~~Verify GitHub Pages deploy succeeded → URL works~~ ✓ done
3. Pin the discussion below at the top of Discussions
4. Update README per the diff suggestions at the end of this file

---

## Pinned Discussion

**Category:** Announcements
**Title:** Welcome to KyberStation, what this is and how to give feedback

### Body

```markdown
Hi everyone, Ken here.

KyberStation is a browser-based visual editor and simulator for
lightsaber blade styles, with a ProffieOS config generator on top.
I built it for my own 89sabers Proffieboard V3.9 and decided to share
it with the community ahead of Star Wars Day.

This is my first publicly released programming project and my first
GitHub project. Be kind, be honest. I need your feedback to make this
better.

## What's in here

- **33 blade styles**, **22 effects**, **19 ignition + 13 retraction
  animations**
- **354 character presets** across canon, Legends, and pop-culture
  sources (LOTR, Marvel, mythology, anime, Star Wars Visions, more)
- **AST-based ProffieOS C++ code generator**, output compiles
  directly in Arduino IDE
- **Sound font library** with SmoothSwing pair simulation
- **Saber profile + SD card composer**, export the entire SD card as
  a ZIP
- **Multi-board support**, config generation for 16 boards (Proffie,
  CFX, Golden Harvest, Xenopixel, Verso, etc.)
- **One-click WebUSB flashing** for Proffieboards (V3.9 hardware-
  validated; other revisions unverified)
- **Modulation routing v1.1 + Wave 8 LITE**, wire any of 19
  modulators (11 continuous + latched signals; 8 button/gesture
  events) to any tunable parameter with combinator math +
  per-binding expression editing
- **Kyber Codes**, compact share links for any blade design
- **PWA installable**, works offline after first visit, no app store
  needed

Browser-only. No accounts. No backend. No telemetry. Your data stays
local. MIT licensed.

## How to install

**Easiest path: just use the deployed version.**
https://kenkoller.github.io/KyberStation/

**Install as PWA (recommended):**
- **Desktop Chrome / Edge / Brave / Arc:** click the install icon in
  the address bar
- **iOS Safari:** Share → Add to Home Screen
- **Android Chrome:** "Install app" prompt appears automatically

**Build from source:**
```
git clone https://github.com/kenkoller/KyberStation.git
cd KyberStation
pnpm install
pnpm dev
```
Requires Node.js 20+ and pnpm 9+. Open http://localhost:3000.

## How to give feedback

I read everything. Reply times will sometimes be days, not hours, but
nothing falls through the cracks.

| What | Where |
|---|---|
| **Bug report** | [File a bug](https://github.com/kenkoller/KyberStation/issues/new?template=bug_report.md) |
| **Feature idea** | [File a feature request](https://github.com/kenkoller/KyberStation/issues/new?template=feature_request.md) |
| **New blade style or preset** | [File a style request](https://github.com/kenkoller/KyberStation/issues/new?template=style_request.md) |
| **Hardware report (you flashed a saber, tell me how it went)** | [File a hardware report](https://github.com/kenkoller/KyberStation/issues/new?template=hardware_report.md) |
| **Question or discussion** | This Discussions tab |
| **Want to share a blade design** | Drop a Kyber Code share link in Discussions → Show and Tell |

## Honest disclosure

I personally only own a Proffieboard V3.9 (89sabers, macOS, Brave).
That's the only hardware/OS/browser combination I've end-to-end-
validated. The other 15 board profiles ship based on documentation and
spot testing. **I need your help to validate everything else.**

If you flash KyberStation on hardware I haven't confirmed yet, please
file a hardware report. One pass through Connect → Dry-run → Flash is
enough.

## Contributions policy (at launch)

I'm not currently accepting outside pull requests. The project is
still finding its shape, and a single reviewer keeps the architecture
coherent at this stage. **This will likely change in 30 days.** In the
meantime, the most valuable contributions are:

- Bug reports with clear repro steps
- Feature requests with concrete use cases
- Hardware reports on boards I don't own
- Preset / style requests for characters or designs the gallery is
  missing

Forking is fully welcome, MIT license, no restrictions.

## What I'm hoping for

- 50+ stars in the first week
- 5+ quality bug reports from real users
- At least one non-Proffie board owner trying it and reporting back
- Genuine community engagement, not promotional virality

## Credits

- **ProffieOS** by Fredrik Hübinette, the firmware this tool targets
- **Fett263's Style Library**, the prop file conventions and dual-mode
  ignition / edit-mode patterns this tool produces
- The r/lightsabers and r/Proffieboard communities, which have been
  quietly teaching me this hobby for years

## License

KyberStation source: **MIT**.
ProffieOS (separate project): **GPL-3.0**. KyberStation generates text;
your compiled saber firmware is GPL-3.0. The combined-work obligations
are documented in the README and every generated config has a GPL
attribution header.

---

May the Force be with you. Thanks for being here.

Ken
```

---

## README updates needed (suggested edits)

The current README is mostly good, but these tweaks tighten it for the
public launch:

### Edit 1: Tighten the opening (line 7 area)

**Current:**
```
**Visual blade style editor, real-time simulator, and config generator for custom lightsabers.**

![KyberStation landing page, live blade render behind the wordmark](docs/images/landing-hero.png)

Design, preview, and export blade styles for Proffieboard, CFX, Golden Harvest, Verso, Xenopixel, and more. Works on any device, phone, tablet, laptop, or desktop. Installable as a PWA.

> Think "DAW for lightsabers", if GarageBand let you design blade animations instead of music tracks.
```

**Suggested:**
Keep mostly as-is, but add a single line under the tagline:
```
**Free, browser-based, MIT licensed, no accounts, no backend. Hobby project.**
```

This sets the right expectations in the first scroll.

### Edit 2: Add a "Try it" callout near the top

**Insert below the tagline image, before "Features":**
```markdown
## Try it

[Live demo: https://...](URL)

Or install as a PWA, [Open the app](URL), then click the install icon
in your browser's address bar. Works offline after first visit.
```

A direct "Try it" link near the top reduces the bounce rate of folks
who don't want to scroll through a feature list.

### Edit 3: Replace "Validated hardware" header anchor

**Current:** `### Flash your saber (WebUSB)` is followed immediately by
the marketing phrasing.

**Suggested:** Add an anchor (`<a id="flash-validation"></a>`) so you
can link directly to the validation grid from the Reddit post / Fett263
email / hardware report template. The grid is the most-linked thing in
the entire README during launch.

### Edit 4: Update preset count in the Features section

**Current** (line ~739 in LAUNCH_ASSETS.md): "700+ character presets"

**Reality** (verified 2026-05-01 from `packages/presets/src/`,
counted 354 entries via `grep -rhE "^\s+id:\s*['\"]"` after Star Wars
Visions Vol 1 + Acolyte/Maul lifecycle landed). The "700+" claim is
from an older draft and is **incorrect**.

**Action:** sweep the README + LAUNCH_ASSETS.md + every Reddit / social
draft to use the accurate count. Suggested phrasing:

> **354 character presets** across canon, Legends, and pop-culture
> sources (LOTR, Marvel, DC, mythology, anime, gaming, kids' cartoons,
> Power Rangers, mascots, Star Wars Visions, and more, every preset
> is `continuity`-tagged so you can filter to just canon if that's
> your thing).

### Edit 5: Add to Status section: v0.16.0 entry

The README's "Status" section currently ends at v0.11.2. Suggested
addition near the top of that section:

```markdown
### v0.16.0: Public launch (2026-04-30)

The first publicly-released version. Includes:
- Full Modulation Routing v1.1 Core + Wave 8 LITE (19 modulators
  total: 11 continuous + latched signals, 8 button/gesture events;
  click + drag-to-route, per-binding expression editing, AST-level
  template injection in codegen)
- Vertical Saber Card layout + animated saber GIF export
- 354-preset gallery across canon, Legends, pop-culture, and Star Wars Visions
- AST-based ProffieOS code generator targeting 16 boards
- Save Preset v1 (IndexedDB-backed user presets) + Add to Queue v1
- WebUSB flashing, experimental, validated on Proffieboard V3.9 + macOS + Brave
- ~5,000 tests across 10 workspace packages

See the [CHANGELOG](CHANGELOG.md) for the full list.
```

### Edit 6: Add to Feedback section: "respond time" expectation

**Current:** lists the feedback channels but doesn't set expectation.

**Insert:**
```
> I read every issue and discussion personally. Reply times can range
> from hours to a few days, this is a hobby project and I'm protecting
> ~5 hrs/week of time for it. Nothing falls through the cracks though.
```

Setting the expectation prevents "why hasn't Ken replied yet" frustration.
