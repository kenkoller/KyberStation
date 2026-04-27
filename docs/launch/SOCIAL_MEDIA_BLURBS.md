# Social Media Blurbs

Channel-by-channel copy. Each is calibrated for that platform's
audience + length limit + posting culture.

**Order of posting:**
1. Day 1 — Twitter/X + Bluesky + Mastodon (parallel with Reddit)
2. Day 4 — LinkedIn (different audience, technical angle)
3. Day 10+ if Reddit traction supports — Hacker News (Show HN)

---

## Twitter / X (5 variants, all under 280 chars)

### Variant 1 — Direct
```
Just shipped KyberStation — a free browser-based visual editor for
designing custom lightsaber blade styles + exporting Proffie configs.

29 styles, 21 effects, 305+ presets, all in your browser. MIT.
First public project. Feedback welcome.

[URL]
```
**Char count: ~245.** Comfortably under cap. Includes URL but not
hashtags (don't bother — they don't help on X anymore).

### Variant 2 — "I built a thing"
```
I built a thing. KyberStation: free, browser-based visual editor for
lightsaber blade styles. Exports ProffieOS code that compiles in
Arduino IDE. Hardware-validated on my own Proffieboard V3.9.

Hobby project. First public release. Code's open.

[URL]
```
**Char count: ~258.**

### Variant 3 — Engineering angle (ride on dev followers)
```
Spent the last few months building a visual editor for designing
custom lightsaber blade styles. AST-based code generator, real-time
sim, PWA, no backend. MIT, free.

It's my first publicly released project. Feedback would mean a lot.

[URL]
```
**Char count: ~263.**

### Variant 4 — Star Wars Day teaser (use ~5 days before May 4)
```
Star Wars Day is almost here. If you want to try a new blade style on
your Proffieboard saber, I shipped a free tool a few weeks back called
KyberStation. Browser-based, visual editor, real-time sim.

[URL]

Code: github.com/kenkoller/KyberStation
```
**Char count: ~270.**

### Variant 5 — Showcase clip (attach a real-saber GIF)
```
This is the same blade style designed in KyberStation, then flashed to
my real saber via WebUSB. Free, browser-based, MIT, hobby project.

If you've got a Proffie or any Neopixel saber, give it a spin.

[URL]
```
**Char count: ~244.** Pair with the cleanest real-saber GIF you have.

---

## LinkedIn (longer-form, "I made a thing for fun" tone)

```
I shipped a side project this week.

It's called KyberStation — a browser-based visual editor for
designing custom lightsaber blade styles, with a real-time simulator
and a ProffieOS config generator on top. I built it for my own
89sabers Proffieboard hilt because I was tired of hand-editing
template-heavy C++ at 1am, and ended up with something I figured the
broader Proffie / saber community might find useful.

A few things I'm proud of (and a few that humbled me):

The codebase is a TypeScript / Next.js / Zustand monorepo with a
headless simulation engine. I learned that engine-first architecture
— simulation as the source of truth, rendering as a thin layer — pays
off the moment you want unit tests, deterministic motion capture, or
to run anything headless.

The code generator is AST-based, not string concatenation. It's
structurally impossible for it to emit unbalanced template brackets,
which has saved my own bacon more times than I'll admit. Generated
configs compile against ProffieOS 7.x via arduino-cli; a 23-preset
config landed at 264 KB / 52% flash on a Proffieboard V3.

PWAs are wildly underrated. Zero install friction, works offline,
shows up as an app on every platform. No Electron, no app stores, no
deployment ceremony. One static deploy on GitHub Pages and the install
flow is "click the icon in your address bar."

The honesty side: I personally own one Proffie board (out of 16 the
tool supports). The other 15 board profiles ship based on documentation
and spot testing. I'm leaning hard on community testing to validate
the rest. Shipping a hardware-adjacent tool with that many unknowns
was uncomfortable, and I had to make peace with "good enough for the
community to find the gaps" rather than "I've personally verified
every combination."

This is my first publicly released project. MIT licensed. Hobby
project. No commercial intent — runs free on GitHub Pages, will keep
running indefinitely.

If anyone here works on similar visual-editor / DSL / code-gen
problems, I'd be genuinely curious to hear how you'd approach the
parts I'm probably doing wrong. Architecture docs are in the repo.

Code: github.com/kenkoller/KyberStation
Live: [URL]

#opensource #typescript #sideproject
```

**Tone check:** humble, specific, technical-but-readable, reflective.
Don't over-hashtag (3 max). Don't add `#StarWars` — LinkedIn algo will
class it as entertainment and bury it.

---

## Mastodon

Mastodon culture is anti-marketing. Lead with substance, not pitch.

```
Just released KyberStation, a hobby project that grew on me: a
browser-based visual editor for custom lightsaber blade styles, with
a ProffieOS config generator. Real-time simulator, AST-based codegen,
PWA, all local, no backend, MIT.

First publicly released project of mine. If you've got a Proffie
saber or are saber-curious, would love your feedback.

[URL]
github.com/kenkoller/KyberStation

#opensource #foss #lightsabers
```

**Char count: ~510.** Mastodon's default is 500 but most instances
allow longer. If you're on a 500-cap instance, trim "AST-based codegen"
to fit.

---

## Hacker News (Show HN)

HN has a different posting culture: more technical, less "humble
hobby." But still no buzzwords, and lead with the engineering.

### Title (HN cap: 80 chars)
**Use exactly this format:**
```
Show HN: KyberStation – browser-based visual editor for lightsaber blade styles
```
**Char count: ~78.** Show HN prefix is required. Em-dash separates the
name from the description.

### Body

```
Hi HN — I'm Ken.

KyberStation is a browser-based visual editor for designing custom
lightsaber blade styles, with a real-time simulator and a ProffieOS
firmware config generator. Built primarily for my own Proffieboard
V3.9 (89sabers hilt). Free, MIT, no backend.

Live: [URL]
Code: https://github.com/kenkoller/KyberStation

A few things that might interest folks here:

**Architecture.** TypeScript / Next.js 14 / Zustand monorepo,
turborepo + pnpm workspaces. Engine package is headless (zero DOM
deps) — runs identically in browser, vitest, and theoretically
Electron. The React UI is a thin rendering layer over the engine's
LED array output, which made testing tractable.

**AST-based code generation.** ProffieOS uses deeply nested C++
templates: `Layers<>`, `BlastL<LockupTrL<...>>`, `InOutTrL<TrWipe<300>,
TrFade<500>, ...>`. I went AST-first — config → AST → emitted code.
The validator catches structural issues at the AST stage, so the
emitter can't produce unbalanced template brackets. Generated configs
have compiled cleanly via arduino-cli against ProffieOS 7.x (23-
preset config, 264 KB / 52% flash on V3).

**WebUSB for one-click flashing.** STM32 DfuSe protocol implemented
from scratch in TypeScript (apps/web/lib/webusb/). 576 unit tests
against a pure-TS DfuSe mock. Three real protocol bugs surfaced only
during real-hardware validation that the mocks missed — those are
documented in the README and the validation grid honestly lists which
hardware/OS/browser combinations are confirmed vs. unverified.

**Modulation routing.** 11 modulators (swing, sound, angle, twist,
time, clash, battery, lockup, preon, ignition, retraction) wireable
to any tunable parameter via click-to-route, drag-to-route, or
per-binding math expressions (peggy-parsed grammar). Engine samples
+ applies bindings per frame. Codegen emits real `Scale<SwingSpeed<>>`
/ `Sin<Int<>>` templates where possible, with snapshot-value fallback
for what isn't expressible at the codegen target.

**PWA, no backend.** All data stored locally in IndexedDB (Dexie).
Service worker caches the shell. Works offline after first visit. One
GitHub Pages deploy serves every platform. No accounts, no telemetry,
no analytics.

**Honest scope:** Hobby project. First publicly released project.
Hardware-validated end-to-end on Proffieboard V3.9 + macOS + Brave.
Other configurations should work but are unverified. Code generation
for 16 boards is based on documentation + spot testing for boards I
don't own. Outside PRs not currently accepted while the project finds
its shape.

Happy to answer questions.
```

**Tone for HN comments (if it gets traction):**
- Engineering specifics: yes
- Performance numbers: yes
- Architecture trade-offs: yes (especially "what would you do
  differently")
- Saber community drama: no
- Defensiveness: no — if someone says your architecture is wrong,
  thank them and ask what they'd do instead

---

## Bluesky

Bluesky is small but conversational. Closer to early-Twitter than to
LinkedIn or Mastodon.

```
Shipped KyberStation today — a free browser-based visual editor for
lightsaber blade styles. Real-time sim, ProffieOS code export, MIT,
no backend.

Hobby project, first public release. If you've got a Proffie saber
or are just saber-curious, give it a spin.

[URL]
github.com/kenkoller/KyberStation
```

**Char count: ~310.** Bluesky's cap is 300 — trim "or are just saber-
curious" to "or are saber-curious" to fit.

```

---

## Suggested launch-day timing (parallelizable, all sendable from
one workstation)

| Time (ET) | Action |
|---|---|
| 7:30 AM | Verify deployed URL, run a quick smoke test |
| 8:00 AM | Push `v0.15.0` tag, flip repo public |
| 8:15 AM | Pin `GITHUB_ANNOUNCEMENT.md` body as a Discussion |
| 8:30 AM | Apply README edits per `GITHUB_ANNOUNCEMENT.md` § "README updates needed" |
| 9:30 AM | Soft-DM 3-5 trusted saber friends (you may have done this T-2 already) |
| 10:00 AM | Post Reddit Variant A on r/lightsabers |
| 10:05 AM | Post Twitter/X Variant 1 |
| 10:10 AM | Post Bluesky |
| 10:15 AM | Post Mastodon |
| 10:30 AM | Camp the Reddit thread for 4-6 hours |
| 12:30 PM | Reddit cross-post to r/Proffieboard if Variant A is green |
| 4:00 PM | First batch of comment replies |
| Day 4 | LinkedIn post |
| Day 7+ | YouTube outreach wave (one variant per recipient) |
| Day 10-14 | TikTok / Instagram DMs |
| Day 10+ | Show HN if Reddit traction warrants |
| ~May 2 | Reddit Variant C (Star Wars Day amplification) |
| May 4 | Comment thread on original Reddit post, share user designs |
