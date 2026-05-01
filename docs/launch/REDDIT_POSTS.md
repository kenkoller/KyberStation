# Reddit Posts: Launch Wave

Three variants, picked based on the day and the audience. Variant A is
the main launch event (r/lightsabers, day 1). Variant B is a deeper-cut
angle for power-Proffie subs. Variant C is the Star Wars Day reshare.

**Before posting any of these:**
- Replace `[URL]` with the deployed GitHub Pages URL
- Have 2 inline images + 1 GIF ready (uploaded to v.redd.it, not imgur)
- Be ready to reply to every comment for the first 4-6 hours
- Don't post on weekends, engagement collapses fast

---

## Variant A: r/lightsabers, "I built a thing"

**Best subreddit fit:** r/lightsabers (primary audience, broadest reach)
**Suggested timing:** Tuesday or Wednesday, 10am-1pm Eastern
**Suggested flair:** "Tools" / "Discussion" / "DIY" depending on sub options

### Title: LOCKED IN (2026-05-01, post-launch refresh)

**One hilt, infinite blades. Introducing KyberStation, a free visual blade editor for Proffie and other saber boards, sharing ahead of Star Wars Day.**

156 chars. Leads with the project's own landing-page tagline ("One
hilt, infinite blades") for a punchy hook, then introduces the tool
+ timing.

(Backups, in case mods reject the locked title or it needs tweaking on
the day):

0. Introducing KyberStation, a free visual blade editor for Proffie and other saber boards. Sharing it ahead of Star Wars Day. First public project.
1. I built KyberStation, a free visual blade editor for Proffie and other saber boards. First public project, would love your feedback.
2. Made a tool to design blade styles visually and export ProffieOS code. Free and open source. Hoping it's useful to someone besides me.
3. KyberStation: a hobby project that grew into a full blade editor. Sharing with the community ahead of Star Wars Day.
4. Spent the last while building a blade style editor for my own saber and figured I'd share it. Free, browser-based, code is open.

**Don't use:** clickbait, ALL CAPS, "Show HN" prefixes, more than one
emoji per title, comparisons to other tools.

### Body

```
Hey r/lightsabers,

I'm Ken. I own an 89sabers hilt with a Proffieboard V3.9, and I got tired
of editing config.h by hand every time I wanted to try a new blade style.
So I built a tool for myself. It turned into something bigger than I
expected, and a few folks I showed it to said I should share it, so here
we are.

It's called **KyberStation**. It's a browser-based visual editor for
designing, previewing, and exporting blade styles. It generates ProffieOS
config code that compiles directly in Arduino IDE. Works on desktop and
mobile (PWA installable).

**Try it:** https://kenkoller.github.io/KyberStation/
**Code:** https://github.com/kenkoller/KyberStation

**What it does:**

- Visual blade simulator, design a style and watch it animate in real time
- 33 blade styles (Stable, Unstable, Fire, Plasma, Aurora, Crystal Shatter, and more)
- 22 effects (Clash, Lockup, Blast, Drag, Melt, Lightning, Shockwave, Freeze, etc.)
- 19 ignition + 13 retraction animations
- 354 character presets across canon, Legends, and pop-culture (LOTR, Marvel, mythology, anime, Star Wars Visions, and more)
- ProffieOS C++ code generator, output compiles in Arduino IDE
- Sound font library with SmoothSwing pair simulation
- Saber profile manager + SD card composer (export the whole card as a ZIP)
- Multi-board compatibility scoring, tells you what works on your hardware
- Shareable config URLs (Kyber Codes, compact share links)
- Browser-only. No accounts, no backend, your data stays local.

**Honest disclosure on hardware compatibility:**

The code generator outputs configs targeting 16 different boards
(Proffie V2.2/V3.9/Lite/Clone, CFX, Golden Harvest, Xenopixel, Verso,
and more). I personally only own a Proffieboard V3.9, so the other 15
board profiles are based on documentation and spot testing. I genuinely
need folks with CFX, GH, Xeno, Verso, Asteria hilts to try it and tell
me where it falls short.

The "Flash to Saber" feature (one-click WebUSB flash) has only been
hardware-validated on **Proffieboard V3.9 + macOS + Brave**. It should
work on Chrome / Edge / Arc on macOS (same Chromium WebUSB stack), and
should work on Windows / Linux + other Proffie revisions, but I haven't
tested those combinations yet. If you try it on something new, please
file a hardware report on GitHub.

Boards that aren't STM32-based (CFX, Xenopixel, Golden Harvest) can
export their config but need their vendor's flashing tool, that part
isn't going to change.

**What I could use help with:**

This is a hobby project and my first publicly released programming
project. There's a lot of room for improvement. I built it around how I
use my own saber, so there are blind spots I can't see. Please be kind,
but also please be honest. If something is confusing, broken, or
missing, file an issue on GitHub or comment here.

I'm not currently accepting outside pull requests while the project is
still finding its shape, but bug reports, feature ideas, style
requests, and general feedback are all very welcome. I'll revisit the
contribution policy once things settle.

Sharing it now so folks have time to play with it and load up their
sabers well before Star Wars Day.

May the Force be with you.

Ken

[Inline screenshot: editor hero]
[Inline GIF: ignition + style switching]
[Inline screenshot: preset gallery]
```

### Cross-post candidates (after Variant A lands well)

- **r/Proffieboard**, smaller but engaged, post a slightly tightened
  version emphasizing the Proffie-specific features
- **r/StarWarsCantina**, broader Star Wars community, different framing
  (lead with the gallery/preset library, not the engineering)
- **r/cosplay**, saber builders are a niche but they exist there;
  emphasize the visual editor + custom blade designs
- **r/arduino**, the engineering-curious slice; lead with "I built a
  visual editor for an Arduino-targeted firmware"

**Don't cross-post on day 1.** Let r/lightsabers be the home post.
Cross-post only after 24-48h of stable engagement, and write a fresh
intro paragraph for each, Reddit hates duplicate-feeling posts.

---

## Variant B: power-Proffie users angle (r/Proffieboard)

**Best subreddit fit:** r/Proffieboard (smaller, more technical)
**Tone:** speak the language. They already know what `Layers<>` is.
**Suggested flair:** "Tools" / "Resource"

### Title: pick one

1. Built a visual editor for ProffieOS configs, InOutTrL, BlastL, the whole template tree. Free, MIT, would love prop-file power-user feedback.
2. KyberStation, a browser-based config.h editor with a real-time blade simulator. Targets Fett263 prop file out of the box.
3. Tired of hand-editing template-heavy config.h? I built something. Free and open source.

### Body

```
Hey r/Proffieboard,

If you've spent any time hand-editing config.h with deeply-nested
`Layers<>` and `InOutTrL<TrWipe<300>, TrFade<500>, ...>` templates and
miscounted angle brackets at 1am, this might be useful to you.

I built a tool called **KyberStation**, a browser-based visual editor
that lets you design blade styles visually, preview them in real time
against a simulated motion model, and export ProffieOS code that
compiles directly in Arduino IDE. The code generator is AST-based, so
it's structurally impossible to emit unbalanced template brackets.

**Try it:** https://kenkoller.github.io/KyberStation/
**Code:** https://github.com/kenkoller/KyberStation

A few things specifically aimed at power Proffie users:

- **Fett263 prop file compatible.** Generated configs target
  `saber_fett263_buttons.h` and the dual-mode ignition / edit-mode
  conventions out of the box.
- **Style emitter covers the real surface.** `Layers<>`, `BlastL<>`,
  `LockupTrL<>`, `InOutTrL<>`, `Mix<>`, `Gradient<>`, `RotateColorsX<>`,
  `AudioFlicker`, `StyleFire`, `Pulsing`, `Stripes`, the standard
  responsive functions (`SwingSpeed<>`, `BladeAngle<>`, `TwistAngle<>`,
  `SoundLevel<>`, `BatteryLevel<>`).
- **Modulation routing v1.1 + Wave 8 LITE.** You can wire any of 19
  modulators to any tunable parameter, with combinator math and
  per-binding expression editing. v1.1 Core: 11 continuous + latched
  signals (swing, sound, angle, twist, time, clash, battery, lockup,
  preon, ignition, retraction). Wave 8 LITE: 8 button + gesture events
  (aux-click, aux-hold, aux-double-click, gesture-twist, -stab,
  -swing, -clash, -shake). Engine samples + applies bindings
  per frame for the preview; codegen emits real `Scale<SwingSpeed<>>` /
  `Sin<Int<>>` templates where possible, snapshot-value fallback where
  not.
- **AST-based codegen.** No string concatenation, no broken brackets.
  Validated to compile against ProffieOS 7.x via arduino-cli (23-preset
  config landed at 264 KB / 52% flash on V3).

**Honest disclosure:**

Hardware-validated end-to-end on my own Proffieboard V3.9 (89sabers,
macOS + Brave), including DFU flash and recovery re-flash. Should work
on V2.2, V3-OLED, Windows, Linux, same protocol, same Chromium
WebUSB stack, but I haven't independently confirmed those yet. If you
flash from KyberStation on something new and it works (or doesn't),
file a hardware report and I'll add it to the validation grid.

Hobby project. First public release. Outside PRs not accepted yet, but
bug reports / prop-file edge cases / template-emission issues are
exactly the feedback I need.

Ken
```

---

## Variant C: May 4 amplification post (r/lightsabers)

**Send 3-5 days before May 4** as a fresh submission.
**Suggested flair:** "Discussion"
**Different enough from Variant A that it's not a repost.**

### Title: pick one

1. Star Wars Day is almost here, if you want to try a new blade style on your saber, here's a free tool I shared a few weeks back.
2. May the 4th update, KyberStation is now [N] users / [N] presets / [N] confirmed boards. If you missed it the first time around.
3. Three weeks since I shared KyberStation here, here's what you all helped me fix, and what's new.

### Body (template, fill in real numbers)

```
Hey r/lightsabers,

May 4 is almost here. Wanted to re-share **KyberStation** for anyone who
missed the original post a few weeks back. It's a free, browser-based
blade style editor and ProffieOS code generator.

**Try it:** https://kenkoller.github.io/KyberStation/
**Code:** https://github.com/kenkoller/KyberStation

**Since the original post:**

[fill in based on what's actually happened, these are placeholder lines]
- Bug reports from [N] users on [N] different board types
- Better compatibility for [specific board(s) confirmed]
- [N] new presets contributed via issues / community submissions
- [Any new features shipped in response to feedback]
- [Notable user-shared blade designs, with permission]

If you've been meaning to try a new style on your saber for Star Wars
Day, this might save you some time. Design a style, export the config,
flash your board (Proffie V3.9 validated; other Proffie revisions
should work but unverified), enjoy it on May 4.

If you've designed something cool and want to share it, drop a Kyber
Code share link in the comments, I'd love to see what you're making.

Still a hobby project. Still my first public release. Still very
interested in honest feedback.

May the 4th be with you all.

Ken

[Inline GIF: a featured user-submitted design, with permission]
[Inline screenshot: the gallery showing community / new presets]
```

---

## Reply templates: first 48 hours of comments

Save these in a snippet manager. The first 48 hours are when you'll
need them most. Don't reply instantly to every comment, batch every
30-60 min so you have time to think.

### "Is it free?"
```
Yep, completely free, MIT licensed, no accounts, no paywall, no ads,
no telemetry. Code's on GitHub. The deployed version is on GitHub Pages
which I can keep up indefinitely at zero cost.
```

### "Does it work with [non-Proffie board]?"
```
Code generation supports it. KyberStation outputs config files for
[CFX / Golden Harvest / Xenopixel / etc.] using their respective formats.
But the one-click "Flash to Saber" feature only works on Proffie boards
(it's STM32 DFU over WebUSB). For [their board], you'd export the config
and use [their vendor's tool] to flash it. If you try it and the export
isn't right, please file an issue, I don't own that board, so I'm
flying blind on it.
```

### "Can I import my old config.h?"
```
Yes, there's a C++ import panel on the Output tab. Paste your existing
config.h, hit Parse, and it'll reconstruct as much as the parser
recognizes. Coverage isn't 100% (it handles the common templates,
Layers, InOutTrL, BlastL, LockupTrL, the standard transitions and
responsive functions) but if it can't parse something it'll tell you.
If you hit a config it chokes on, please file an issue with the snippet
that broke it.
```

### "Is the source open?"
```
Yep, https://github.com/kenkoller/KyberStation. MIT licensed. The
ProffieOS firmware itself is GPL-3.0 (separate project), and that
relationship is documented in the README + every generated config has a
GPL attribution header for the combined work.
```

### "I found a bug"
```
Thanks for flagging it. Could you file an issue at
https://github.com/kenkoller/KyberStation/issues with:
- Browser + OS
- Which board you're targeting
- Steps to reproduce
- Screenshot or console error if you can

That'll let me reproduce it cleanly. If it's blocking you, mark it
critical in the issue and I'll prioritize.
```

### "Request: feature X"
```
Appreciate the suggestion. Logging it as an issue so it doesn't get
lost. No promises on timing, this is a hobby project and I'm trying to
keep expectations realistic, but if it's a fit for the direction, I'll
get to it. If you need it sooner, the code's MIT and the architecture
docs in /docs/ARCHITECTURE.md should give you a launching point for a fork.
```

### "Will you support [X]?"
```
I'd love to. I don't own [X] though, so I genuinely need help testing
it. If you have one and you're willing to try KyberStation with it and
let me know where it falls short, that's the kind of feedback that
actually moves this forward.
```

### "This competes with [Fett263 / Fredrik / etc.]"
```
Not trying to replace any of those. They're excellent and I use them
myself. KyberStation is a different take on the same problem, visual
first, browser-based, with a simulator. Different tools fit different
workflows. More tools in this community is a win for everyone.
```

### "Why didn't you use [different tech / different approach]?"
```
Honestly, [whatever the real reason is, "I'm a one-person hobby project
and pnpm + Next was what I knew" is a perfectly valid answer]. If you
have a stronger architecture in mind I'd be genuinely curious to hear
it. The code is MIT, fork freely.
```

### Troll / bad-faith comment
**Don't reply.** Don't downvote-brigade. Report if it violates sub
rules. Move on.

---

## Concrete pre-drafted replies (added 2026-04-30, copy-paste-ready)

Specifics filled in based on actual KyberStation capabilities. Lighter
edits than the generic templates above.

### "How does it compare to ProffieOS Workbench / Fett263's Style Library?"
```
Different tools, different sweet spots, I use both myself.

ProffieOS Workbench is great for runtime config tweaking on a
connected saber. Fett263's Style Library is the gold standard for
hand-crafted style code and the prop file conventions everything
else builds on (KyberStation's codegen targets his prop file out of
the box).

KyberStation is browser-first with a real-time visual simulator.
You design a style and watch it animate against a motion model
before flashing anything. AST-based codegen so unbalanced template
brackets are structurally impossible. Different workflow, not a
replacement.
```

### "How big is the generated config? Will it fit in flash?"
```
A 23-preset config landed at 264 KB / 52% flash on a Proffieboard V3
during my own validation runs. The codegen tries to be efficient
(shared style declarations, no template bloat), but big-preset
configs can get tight on V2 (256 KB flash). The Output tab shows a
live storage budget readout, if you're approaching the limit, it'll
warn you.
```

### "Does the simulator account for [LED diffusion / gamma / polycarbonate]?"
```
Yes, there's a Neopixel-aware color pipeline (sRGB→linear gamma,
WS2812B per-channel bias, polycarbonate diffusion) so what you see
in the editor is closer to what the strip actually emits. Not a
perfect match (real saber lighting depends on hilt internals,
strip vendor, blade thickness, ambient light) but the calibration
is closer than what most other tools attempt.
```

### "Will this work on Bluetooth-enabled sabers / wireless?"
```
Not yet. Bluetooth (Web Bluetooth) is on the post-launch roadmap.
ProffieOS author Fredrik already shipped a proof-of-concept Web
Bluetooth app at github.com/profezzorn/lightsaber-web-bluetooth, so
the path forward is "port + integrate" rather than build from
scratch. Realistic timeline: v0.17+. iOS exclusion is permanent
(Apple WebKit doesn't allow USB or Bluetooth IO from web apps).
```

### "How do I share a design with someone?"
```
Every blade design has a "Kyber Code" share link, a compact URL
that encodes the entire config. Click "Kyber Code" in the header,
copy the URL, send to anyone. They open it and your design loads
straight into their editor. No accounts, no backend, the config
is encoded in the URL itself.
```

### "Will you actually maintain this?"
```
Yes. I built it for my own saber and I'll keep using it, so it'll
get attention as long as I'm in the hobby. Office hours posture:
issues get triaged within a few days, bugs and hardware reports
get priority over new features. The project is hobby-scale, so
"actively maintained" doesn't mean "weekly releases", more like
"things shipping regularly when I have evenings free."
```

### "How long did this take to build?"
```
A few months of evenings + weekends, on top of the day job. The
codebase ended up at ~5,000 tests across 10 monorepo packages. The
visual editor came together fast; the AST-based code generator and
the WebUSB flash pipeline were the parts that took real effort.
First publicly released programming project of mine, a lot of
"learn while building" hours in there.
```

### "Why no Electron / desktop app?"
```
No accounts means no install friction matters more than native APIs
for v1. PWA install (click the icon in your browser's address bar)
gets you 90% of the desktop-app experience, works offline, shows
up as an app on every platform, no app store. An Electron sidecar
for the parts that need real serial/USB/Bluetooth IO is on the
post-launch roadmap, but not a v1 priority.
```

### "Can I see how the config is generated?"
```
Yes, the Output tab shows the generated ProffieOS config.h live as
you edit. AST-based codegen, so the C++ output is a function of
the AST, which is a function of your config. Roundtrips are clean:
paste an existing config.h into the import panel and it parses
back into the editor.

Architecture docs are in /docs/ARCHITECTURE.md if you want to dig
into the engine + codegen split.
```

### "What about [88's hilt / Saberbay / KR / Vader's Vault]?"
```
KyberStation supports any vendor's hilt as long as the saber inside
is one of the 16 boards the codegen targets (Proffie V2/V3/Lite,
CFX, Golden Harvest, Xenopixel, Verso, Asteria, etc.). The hilt
brand doesn't matter to the codegen, it's the board inside that
counts. If your hilt has a Proffieboard, the validated flash path
applies. If it has a vendor-specific board (KR's clone, 89's
custom variants, etc.), I'd love a hardware report on whether the
generated config works for you.
```

### "Will users brick their saber if they flash from this?"
```
Honest answer: WebUSB flashing is experimental. Hardware-validated
end-to-end on Proffieboard V3.9 + macOS + Brave (including recovery
re-flash). Three protocol bugs surfaced during real-hardware
validation that 576 mock tests missed, those are fixed.

Before flashing, KyberStation enforces a 3-checkbox gate:
1. You acknowledge it's experimental
2. You've backed up your existing firmware (mandatory)
3. You know the recovery procedure

If something goes wrong, the firmware backup + STM32 BOOT-pin DFU
recovery means you can always re-flash to a known-good state. The
backup step is the safety net.

If you're not comfortable with WebUSB, just use the Output tab to
export config.h and flash it via arduino-cli + dfu-util, same
result, more control. Documented in docs/FLASH_GUIDE.md.
```

