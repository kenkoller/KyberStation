# KyberStation Launch Assets

Copy-paste templates, draft scripts, shot lists, and outreach emails for the public launch. Every template is designed to preserve the humble, hobby-project tone established in `LAUNCH_PLAN.md`.

**How to use this doc:** Work top to bottom before launch. Each section is a thing you'll produce, send, post, or capture. Check off as you go.

---

## Table of Contents

1. [Screenshot Shot List](#screenshot-shot-list)
2. [GIF Production Guide (App)](#gif-production-guide-app)
3. [GIF Production Guide (Real Saber)](#gif-production-guide-real-saber)
4. [Social Preview / OG Card](#social-preview--og-card)
5. [Soft-Launch Message (to Friends)](#soft-launch-message-to-friends)
6. [Reddit Post — Title Variants](#reddit-post--title-variants)
7. [Reddit Post — Full Body Draft](#reddit-post--full-body-draft)
8. [Reddit Post — May 4 Amplification Variant](#reddit-post--may-4-amplification-variant)
9. [LinkedIn Post Draft](#linkedin-post-draft)
10. [Blog Post Outline](#blog-post-outline)
11. [YouTube / TikTok Outreach — Tier 1 (Fett263)](#youtube--tiktok-outreach--tier-1-fett263)
12. [YouTube / TikTok Outreach — Tier 2 (Review Channels)](#youtube--tiktok-outreach--tier-2-review-channels)
13. [YouTube / TikTok Outreach — Smaller Creators](#youtube--tiktok-outreach--smaller-creators)
14. [Response Templates (Comments, Issues, Feature Requests)](#response-templates-comments-issues-feature-requests)
15. [Repo Metadata](#repo-metadata)
16. [Feature List for the Reddit Post](#feature-list-for-the-reddit-post)

---

## Screenshot Shot List

Capture on a high-DPI / Retina display. Save as PNG. 1600–2400px wide is the sweet spot. Don't use the native retina 2x resolution — downscale to reasonable sizes or file sizes bloat.

**Before capturing:**
- Close dev tools, turn off any personal bookmarks / extensions visible in the browser frame
- Use the app window at a clean 16:10 or 16:9 aspect ratio
- Set Aurebesh to Off (full English) — unfamiliar script confuses first-time viewers
- Pick a theme that reads well at small sizes — darker themes photograph better
- Dismiss any toasts, tooltips, or onboarding bubbles before capturing

**Required shots (8):**

| # | Shot | What to show | Notes |
|---|---|---|---|
| 1 | **Editor hero** | Full editor layout with a visually striking blade design loaded (try Plasma Storm, Unstable Kylo Ren, or an Aurora preset) | This is the shot that goes at the top of the Reddit post. Make it the best one. |
| 2 | **Preset gallery** | The character preset library with several film-accurate presets visible | Show the breadth — "305+ presets" is a selling point |
| 3 | **Code output** | The CodeOutput panel showing generated ProffieOS C++ | Proves the real output, not just visuals |
| 4 | **Mobile view** | iPhone / Android screenshot of the PWA running | Safari / Chrome on iOS — use device screenshot, not Chrome DevTools emulation (looks fake) |
| 5 | **Saber profile manager** | Card preset composer with multiple presets queued up | Shows the SD card workflow |
| 6 | **Compatibility panel** | Multi-board compatibility scoring visible | Communicates "works on your board" |
| 7 | **Sound font panel** | Font panel with a sound font loaded, SmoothSwing pair detected | Shows the audio sophistication |
| 8 | **Canvas close-up** | High-zoom view of the blade during a complex effect (Lightning, Shockwave, Crystal Shatter) | Show the visual detail |

**Optional extras (nice-to-have):**

| # | Shot | What to show |
|---|---|---|
| 9 | OLED preview | The OLED display preview panel showing the saber's mini screen |
| 10 | Kyber Code share | The share dialog showing a Kyber Code share URL |
| 11 | RGB graph | The analytical RGB visualization |
| 12 | Style stacking | Multiple effects layered simultaneously mid-animation |

**Tool recommendations (macOS):**
- **CleanShot X** — overlays cursor, keystrokes, window chrome. Best for polished screenshots.
- **Shottr** — free alternative, very capable
- **Built-in macOS** (Cmd+Shift+4 → space → window) — fine for quick ones

**Export format:** PNG, sRGB color space. If a screenshot is over 2 MB, compress via [Squoosh](https://squoosh.app) with MozJPEG quality 85–90.

---

## GIF Production Guide (App)

GIFs sell the tool more than screenshots. Reddit compresses them harshly though — aim for **under 5 MB** and **under 10 seconds** each. If you need longer, use MP4 instead (Reddit supports MP4 upload).

**Tools:**
- **Kap** (macOS, free) — dead simple, drag a window, record, export
- **ScreenFlick** — more control, can adjust fps post-recording
- **GIPHY Capture** — decent free option
- **Cloud Convert** for format conversion / compression

**Capture settings:**
- **30 fps maximum** (Reddit caps playback at ~20 fps anyway)
- **Output size 1280×720 or smaller** — larger than this gets downsampled
- **No cursor** for UI demos (enable "hide cursor" in capture tool)
- **Use cursor** for tutorial-style shots where clicks matter

**Required GIFs (3–5):**

| # | GIF | Script | Duration |
|---|---|---|---|
| 1 | **Dramatic ignition** | Click IGNITE, blade ignites with a bold animation (Crackle, Fracture, or Pulse Wave ignition), hold for a beat, then retract | 5–7s |
| 2 | **Style switching** | Start with Stable blade, switch to Unstable, then Fire, then Plasma Storm — show the visual variety | 8–10s |
| 3 | **Effect triggers** | Blade active. Trigger Clash (C), Blast (B), Lockup (L on/off), Lightning (N on/off) in sequence | 8–10s |
| 4 | **Preset browsing** | Open preset gallery, hover over a few character presets, load one, see blade update | 6–8s |
| 5 | **Mobile install flow** | iPhone Safari → Share → Add to Home Screen → launch as PWA | 8–10s |

**Optional:**

| # | GIF | What to show |
|---|---|---|
| 6 | **Color picker** | Changing base color with the color wheel, blade updates in real time |
| 7 | **Share URL** | Click share button, URL copies, open in new tab, same blade loads |
| 8 | **Code generation** | Click "Generate" in Output panel, code appears in the panel |

---

## GIF Production Guide (Real Saber)

This is what sells it. A screenshot of your UI is just a screenshot. A clip of your actual 89sabers V3.9 swinging with a blade style YOU designed in KyberStation loaded on it — that's the magic.

**Setup:**
- Dark room, dim overhead light (not pitch black — you want to see the hilt)
- Camera on a tripod or stable surface
- Phone camera in Cinematic / 4K mode is fine if tripod-stable
- Wear dark clothing so you blend into the background
- **Film in 60fps or higher**, then export slow-motion for maximum drama

**Key shots:**

| # | Clip | Duration | Notes |
|---|---|---|---|
| 1 | **Ignition + idle** | 5s | Ignite, hold the saber steady, let the idle animation play |
| 2 | **Swing with SmoothSwing** | 3–5s | A few full swings showing audio + visual response |
| 3 | **Clash moment** | 3s | Tap the blade against something (pillow, sofa cushion — don't break anything) |
| 4 | **Style comparison** | 15–20s total | Same swing motion with 2–3 different styles loaded — e.g., "here's Stable, here's Unstable, here's Plasma Storm" |

**Compression:** export as MP4 H.264, 720p or 1080p, target file size under 10 MB per clip. For Reddit, MP4 is fine — no need to convert to GIF.

**Privacy:** don't film in a way that reveals your home layout, address, or other personal details. Plain wall background is ideal.

---

## Social Preview / OG Card

**Purpose:** When someone shares the KyberStation GitHub URL or deployed URL on Twitter, Discord, Slack, iMessage, etc., this image shows up as the preview.

**Specs:**
- 1200 × 630 px (Twitter / Facebook standard)
- PNG or JPG
- Under 1 MB
- Repository setting: `Settings → Social preview → Edit → Upload image`

**Composition:**
- Dark backdrop matching the app's aesthetic
- KyberStation wordmark prominent (top-left or centered)
- A hero blade render on the right side
- Tagline below the wordmark: "Visual blade style editor for custom lightsabers"
- URL at the bottom: `github.com/kenkoller/KyberStation`

The Share Pack (docs/SHARE_PACK.md) spec describes a similar visual language — reuse that treatment here.

---

## Soft-Launch Message (to Friends)

Before posting publicly, send this to 3–5 trusted saber friends or r/lightsabers folks you already know. Use DMs, iMessage, email — whatever your usual channel is with them.

```
Hey [name] —

I've been building a side project for a while now — a visual blade style
editor for Proffie and other saber boards — and I'm about to share it on
r/lightsabers. Before I do, I'd love 5 minutes of your honest feedback.

Try it here: [URL]
Code: github.com/kenkoller/KyberStation

What I'm hoping to learn:
- Does it work on your board? (Which one do you have?)
- Is the first-minute experience confusing anywhere?
- Anything clearly broken or missing?

No pressure — ignore if you're busy. I'll post publicly in a few days
either way.

Thanks,
Ken
```

**What to do with the feedback:**
- Fix anything critical before the Reddit post
- Note non-critical issues as GitHub issues (but label them `post-launch`)
- If someone finds a dealbreaker, delay the Reddit post by a day — better to ship clean than ship Tuesday

---

## Reddit Post — Title Variants

Pick one. If it flops, delete it and try another (Reddit treats each submission as independent — no penalty for retrying, but give it at least 12 hours before giving up).

**Ranked by likely performance:**

1. **"I built KyberStation — a visual blade editor for Proffie and other saber boards. Free, open source, and my first public project."**
2. **"Made a tool to design blade styles visually and export ProffieOS code — would love your feedback."**
3. **"KyberStation: a hobby project I built for my own saber and decided to share with the community."**
4. **"Sharing a free visual blade editor I made for my 89sabers Proffie. Looking for testers on other boards."**
5. **"Spent the last few months building a blade style editor. Sharing it in case anyone else finds it useful."**

**Avoid:**
- Clickbait ("You won't believe what this tool can do")
- Overclaim ("The best blade editor ever")
- Emojis in the title (Reddit users skim past them)
- ALL CAPS
- "Show HN:" style prefixes (that's HackerNews, not Reddit)

**Test signal:** if the first 30 minutes produces <5 upvotes and no comments, it's probably the title. Delete, wait 24 hrs, try a different one.

---

## Reddit Post — Full Body Draft

This is the draft from `LAUNCH_PLAN.md`, polished slightly for ease of copy-paste. Replace `[URL]` with the live deployed URL before posting.

```
Hey r/lightsabers —

I'm Ken. I own an 89sabers hilt with a Proffieboard V3.9 and I got tired
of editing config.h by hand every time I wanted to try a new blade style.
So I started building a tool for myself. It turned into something bigger
than I expected and a few folks I've shown it to said I should share it
with the community, so here we are.

It's called **KyberStation**. It's a browser-based visual editor for
designing, previewing, and exporting blade styles. Supports Proffie, CFX,
Golden Harvest, Xenopixel, and a bunch of other boards — around 16 in
total. Works on desktop and mobile (installable as a PWA).

**Try it:** [URL]
**Code:** https://github.com/kenkoller/KyberStation

**What it does:**

- 🗡 Visual blade simulator — design a style and watch it animate in real time
- 🎨 29 blade styles (Stable, Unstable, Fire, Rotoscope, Plasma Storm, Aurora, Cinder, and more)
- ⚡ 21 effects (Clash, Lockup, Blast, Drag, Melt, Lightning, Shockwave, Freeze, etc.)
- 🔥 19 ignition + 13 retraction animations
- 👥 305+ character presets spanning every era of the saga
- 💻 ProffieOS C++ code generator — output compiles directly in Arduino IDE
- 🔊 Sound font library with SmoothSwing simulation
- 📂 Saber profile manager + card preset composer for SD card writing
- 🎛 Multi-board compatibility scoring — tells you what works on your hardware
- 🔗 Shareable config URLs (Kyber Codes — compact share links)
- 🌐 Everything runs in the browser. No accounts, no backend, your data stays local.

**Fair warning / what I could use help with:**

This is a hobby project and my first public programming release. There's
a lot of room for improvement. I only personally own one board
(Proffieboard V3.9) so the compatibility logic for the other 15+ boards
is based on documentation and spot testing — I absolutely need folks
with CFX, Golden Harvest, Xenopixel, Verso, Asteria, etc. hilts to try
it and tell me what breaks.

I built it around how I use my own saber, so there are blind spots I
can't see. Please be kind — but also please be honest. If something is
confusing, broken, or missing, file an issue on GitHub or comment here
and I'll take a look.

I'm not currently accepting outside pull requests while the project is
still taking shape — but bug reports, feature ideas, style requests, and
general feedback are all very welcome. I'll revisit the contribution
policy after the dust settles.

Sharing it now so folks have time to play with it and load up their
sabers well before Star Wars Day.

May the Force be with you.

— Ken

[Screenshot 1 — editor hero]
[Screenshot 2 — preset gallery]
[GIF 1 — app in action]
[GIF 2 — real saber demo]
```

**Formatting tips:**
- Reddit markdown: use `**bold**`, `*italic*`, blank lines between paragraphs
- Emoji sparingly in the feature list — they add scannability. Don't go overboard.
- Always put images/GIFs INLINE in the post body, not as attachments — inline gets more engagement
- Upload GIFs directly to Reddit (v.redd.it) — don't link to Imgur / Giphy if you can avoid it

---

## Reddit Post — May 4 Amplification Variant

Post this 3–5 days before May 4 as a fresh submission (not a comment reply). Different enough to not get flagged as reposting, but the URL and core pitch stay the same.

```
Title: Star Wars Day is coming — if you want to try a new blade style on
your saber, here's a free tool I shared a few weeks back.

Hey r/lightsabers —

With May 4 coming up, wanted to re-share KyberStation for anyone who
missed it the first time around. It's a free, browser-based blade style
editor and ProffieOS code generator.

**Try it:** [URL]
**Code:** github.com/kenkoller/KyberStation

Since the original post, I've had help from:
- [brief list of improvements that came from community feedback, e.g.:]
- Bug reports from 12+ users on 5 different board types
- Better compatibility for [specific board]
- [N] new presets contributed by community via issues
- [any new features shipped]

If you've been meaning to try a new style on your saber for Star Wars
Day, this might save you some time.

Still a hobby project, still my first public release, still looking for
honest feedback. If you design something cool, drop a screenshot or
Kyber Code share link in the comments — I'd love to see what people are
making.

[2–3 fresh GIFs, maybe a user submission if someone shared one]

May the 4th be with you all.

— Ken
```

---

## LinkedIn Post Draft

Different audience: engineers, recruiters, professional network. Lean into the technical craft, not the Star Wars fandom. Include a screenshot.

```
Spent the last [X months] building something for myself and ended up
sharing it with the world.

KyberStation is a browser-based visual editor for designing custom
lightsaber blade styles and generating ProffieOS firmware code. It's a
monorepo (TypeScript, Next.js, Zustand) with a headless simulation
engine, an AST-based C++ code generator, a 305+ preset character
library, and Web Audio–based sound font playback — all running locally
in the browser as a PWA.

What I learned along the way:

• Building a hardware-adjacent tool is humbling. I own one board; the
  other 15 I support are based on documentation and community
  knowledge. Shipping before feeling fully ready is hard.

• AST-based code generation beats string concatenation every time. The
  firmware compiles without modification because the generator can't
  emit unbalanced template brackets.

• PWAs are severely underrated. Zero install friction, works offline,
  shows up as an app on every platform. No Electron, no app stores, no
  deployment ceremony.

• An engine-first architecture — simulation as the source of truth,
  rendering as a thin layer — pays off the moment you want to add tests,
  record motion capture, or run headless.

Open source. MIT licensed. Happy to answer questions.

Code: github.com/kenkoller/KyberStation
Try it: [URL]

#opensource #typescript #nextjs #sideproject
```

**Don't:**
- Mention "Star Wars" more than once (don't want the algorithm classing this as entertainment)
- Use saber community slang that non-fans won't parse
- Include more than one hashtag cluster

---

## Blog Post Outline

For your personal/professional site. Target length: 1500–2500 words. Include screenshots and an embedded GIF if your blog platform supports it.

**Working title options:**
- "Building KyberStation: a visual editor for a hardware platform I barely understood"
- "Why I built a lightsaber config generator (and what I learned along the way)"
- "AST-based code generation, PWAs, and a hobby project that got out of hand"

**Suggested structure:**

```markdown
# [Title]

## The Itch

- I own an 89sabers hilt with a Proffieboard V3.9
- Every time I wanted to try a new blade style, I was editing config.h by hand
- Hand-editing template-heavy C++ is error-prone and not visual
- Existing tools (Fett263 Style Library, Fredrik's editor) were close but not
  what I wanted — I wanted a DAW for lightsabers

## What I Built

[Screenshot of editor hero]

- Browser-based visual editor
- 29 blade styles, 21 effects, 305+ presets
- ProffieOS C++ code generator
- Sound font management, multi-board compatibility, PWA install
- All local, no backend

## Three Technical Choices That Paid Off

### 1. Engine-first architecture
- packages/engine is the single source of truth
- React UI is a thin rendering layer over LED array output
- Engine has zero DOM dependencies, runs headless in tests
- This let me add unit tests that would've been brittle in a mixed UI/logic codebase

### 2. AST-based code generation, not string concat
- Built an AST for ProffieOS style templates
- Validator ensures correct nesting and angle-bracket balance before emission
- The firmware compiles without modification because invalid code can't be emitted in the first place

### 3. PWA over Electron
- Zero install friction
- Works offline after first visit
- Service worker caches the shell
- One deploy (GitHub Pages), every platform

## What I'd Do Differently

- [honest thing you'd change]
- [another honest thing]

## What's Next

- Open to community feedback and bug reports
- Not yet accepting outside PRs — want to see the shape of feedback first
- Plan to support [specific feature] based on early user requests

## Try It

- Live: [URL]
- Code: github.com/kenkoller/KyberStation
- MIT licensed, fork freely
```

**Tips:**
- Be specific about numbers (29 styles, 21 effects, 16 boards)
- Don't overstate the work ("built in a weekend" when it wasn't)
- Credit ProffieOS (Fredrik Hubinette) and Fett263 — you're standing on their work
- End with a try-it link, not a philosophical flourish

---

## YouTube / TikTok Outreach — Tier 1 (Fett263)

Fett263 is the single highest-impact contact. He created the most popular ProffieOS prop file (`saber_fett263_buttons.h`) and his style library is the de facto community reference. Approach respectfully — you're standing on his work and you know it.

**Before emailing:** make sure KyberStation's generated code explicitly supports his prop file, and say so. Test compiling with `USE_PROP_FILE saber_fett263_buttons.h` and make sure it works.

**Template:**

```
Subject: KyberStation — free visual blade editor, built on top of your
prop file work

Hi Fett263,

I'm Ken. Long-time user of your prop file and style library — they
transformed what my saber is capable of and the documentation alone
saved me countless hours.

I recently released a tool called KyberStation — a browser-based visual
blade style editor and ProffieOS code generator. It's free, open
source, and runs entirely in the browser with no backend. Generated
configs compile against ProffieOS 7.x using your prop file out of the
box.

I'm reaching out because (a) you are the natural person to know about
it, and (b) if anything in the generated output looks wrong from a
prop-file perspective, I want to know. Not asking for a review or
endorsement — just genuine feedback from someone who knows this
platform better than anyone.

Try it: [URL]
Code: github.com/kenkoller/KyberStation

I've credited your work in the README and the architecture docs. If I
should change how I reference the prop file or your library, please
let me know.

Thank you for everything you contribute to this community.

Ken
```

**What to do if he responds positively:**
- Offer to feature his prop file as the default selected option
- Offer to add a "Compatible with Fett263 prop file" badge/callout
- Do NOT ask for a shoutout or mention. If he wants to share, he will.

**What to do if he doesn't respond:**
- Follow up once, at most, after 2 weeks. Short and non-needy.
- After that, move on. Don't pester.

---

## YouTube / TikTok Outreach — Tier 2 (Review Channels)

Saber Sourcing, larger saber-focused YouTube channels, Sabertrio's channel, KR Sabers, etc.

**Template:**

```
Subject: Free open-source blade style editor — thought you might find
this interesting

Hi [Name],

Big fan of your channel — [specific video or review you appreciated].

I wanted to share a tool I built called KyberStation. It's a free,
browser-based visual editor for blade styles with a ProffieOS code
generator. Supports around 16 different boards (Proffie, CFX, Golden
Harvest, Xenopixel, etc.).

I'm not asking for a review — just hoping you'd take a look and tell me
if it's useful from the reviewer/maker perspective. If it turns out to
be the kind of thing your audience would find interesting, that would
be amazing — but no expectation.

Try it: [URL]
Code: github.com/kenkoller/KyberStation

Thanks for everything you do for this community.

Ken
```

**When to send:** about a week after the Reddit launch, once you have real user feedback. Include a line like "the community has already helped me fix X, Y, Z" to show traction.

---

## YouTube / TikTok Outreach — Smaller Creators

For channels with 5k–50k subs actively making Proffie/saber content. These folks are often more responsive than Tier-1, and the cumulative reach from 5–10 of them can exceed one top-tier mention.

**Template:**

```
Subject: I built a free blade editor for the community — would love
your honest take

Hi [Name],

I've been watching your channel for [specific reason] and wanted to
share something I built.

KyberStation is a free, open-source visual editor for designing blade
styles and exporting ProffieOS code. I made it for my own saber (89sabers
V3.9) and am sharing it with the community. Released a few weeks ago
on Reddit and it's been growing from there.

If you've got 5 minutes to try it and let me know what's confusing or
missing, I'd really appreciate it. If it turns out to be something you'd
want to cover, that would be incredible — but zero pressure either way.

Try it: [URL]
Code: github.com/kenkoller/KyberStation

Thanks for the content you put out. It matters.

Ken
```

---

## Response Templates (Comments, Issues, Feature Requests)

You'll be replying to a lot of comments in the first week. Having templates ready saves mental energy and keeps you from over-explaining or under-explaining in the moment.

### Bug report with enough info

```
Thanks for flagging this — reproduced on my end. Filed as issue #X,
I'll take a look this weekend.
```

### Bug report with NOT enough info

```
Thanks for reporting! Can you share:
- Which board you're using
- Browser + OS
- Screenshot or console error if possible

That'll help me reproduce it. Feel free to file directly at:
https://github.com/kenkoller/KyberStation/issues
```

### Feature request that fits the vision

```
This is a great idea — filed as issue #X. No promises on timing but
it's on the list.
```

### Feature request that doesn't fit

```
Appreciate the suggestion! Honestly this isn't something I'm planning to
tackle — [brief, non-defensive reason]. Feel free to fork and take a
swing at it though, and if it works out we can talk about upstreaming.
```

### "Will you support [board X]?"

```
I'd love to. I don't own one, so I need your help to test it. If you're
willing to try KyberStation with your [board X] and let me know where it
falls short, that's exactly the kind of feedback I need.
```

### "Can I contribute code?"

```
Really appreciate the offer. I'm not accepting outside PRs yet while
the project is still finding its shape — but issues, bug reports, and
detailed feature requests are gold. I'll revisit the contribution
policy in a few weeks once things settle down.
```

### "This is amazing, great work!"

```
Thanks so much! Hearing that means a lot. If you find bugs or have
ideas, don't be shy — this is my first public project and I need all
the feedback I can get.
```

### "This competes with [Fett263 / Fredrik's tool / etc.]"

```
Not trying to replace any of those — they're excellent and I use them
myself. KyberStation is a different take on the same problem. Everyone
has different workflows and preferences, and having more tools in the
community is a win for everyone.
```

### "When will you add [specific feature]?"

```
No ETA. It's a hobby project and I'm keeping expectations realistic. If
it's on my list, I'll get to it when I can. If you need it soon, the
code is MIT-licensed and the architecture docs are in docs/ARCHITECTURE.md.
```

### Troll / bad-faith comment

Don't reply. Don't downvote-brigade. Report if it violates subreddit rules. Move on. Engaging makes it worse.

---

## Repo Metadata

Paste these into the GitHub repo Settings.

**Description:**
```
Visual blade style editor, real-time simulator, and ProffieOS config generator for custom lightsabers. Free, open-source, browser-based.
```

**Topic tags (add all 10):**
```
lightsaber
proffieos
proffie
proffieboard
neopixel
blade-style
saber
kyber
cosplay
starwars
```

**Website field:**
```
[your deployed URL — whatever github.io address, or custom domain if you bought one]
```

**README badges (already in place, just verify):**
- CI status
- MIT License
- PRs Welcome

---

## Feature List for the Reddit Post

Complete, organized feature list. Use this to generate the Reddit bullet list, or link to it from the README.

### Visual Editor
- Real-time blade simulator running in your browser
- 29 blade styles — Stable, Unstable, Fire, Rotoscope, Gradient, Photon, Plasma Storm, Crystal Shatter, Aurora, Cinder, Prism, Gravity, Data Stream, Ember, Automata, Helix, Candle, Shatter, Neutron, Torrent, Moire, Cascade, Vortex, Nebula, Tidal, Mirage, Pulse, and more
- 21 effects — Clash, Lockup, Blast, Drag, Melt, Lightning, Stab, Force, Shockwave, Scatter, Fragment, Ripple, Freeze, Overcharge, Bifurcate, Invert, Ghost Echo, Splinter, Coronary, and more
- 19 ignition animations — Standard, Scroll, Spark, Center Out, Wipe, Stutter, Glitch, Crackle, Fracture, Flash Fill, Pulse Wave, Drip Up, and more
- 13 retraction animations — Dissolve, Flicker Out, Unravel, Drain, and more
- 10 easing curves with custom easing support
- Per-segment effect scoping for multi-blade builds
- Canvas-based blade rendering at 60fps

### Code Generation
- AST-based ProffieOS C++ code emitter (no string concatenation, no broken brackets)
- Full config.h generation with Layers, BlastL, InOutTrL, transitions, functions
- Validated ProffieOS 7.x compilation via arduino-cli
- Correct SaberBase enum prefixes, maxLedsPerStrip placement, CONFIG_PROP section separation
- Fett263 prop file compatible

### Multi-Board Support (16 boards)
- **Tier 1 (full featured):** Proffieboard V2.2, V3.9, Lite, Clone
- **Tier 2 (mid-range):** CFX 10/10.5, Golden Harvest V3/V4, Xenopixel V2/V3, DamienSaber, Verso
- **Tier 3 (budget):** LGT Baselit, Asteria, Darkwolf, SN-Pixel V4, S-RGB
- Board capability matrix with compatibility scoring per preset
- Dedicated emitters for Proffie, CFX, GHv3/V4, and Xenopixel

### Blade Topologies (8 configurations)
- Single, Staff, Crossguard, Triple, Quad-Star, Inquisitor Ring, Split Blade, Accent LEDs
- Configurable blade lengths (24"–40")
- Ring rotation for Inquisitor-style sabers
- Per-segment effect scoping

### Sound System
- Sound font parser for Proffie, CFX, and Generic formats
- Web Audio playback engine
- SmoothSwing pair crossfade simulation
- 13 stackable audio filters — LP/HP/BP, distortion, reverb, delay, tremolo, chorus, flanger, phaser, bitcrusher, pitch shift, compressor
- Dynamic filter parameters driven by swing speed, blade angle, twist, LFO, or noise
- 6 built-in filter chain presets

### User Presets & Libraries
- 305+ character presets across every era (Prequels, OT, Sequels, Clone Wars, Rebels, Bad Batch, Legends, community)
- Save any blade configuration as a reusable preset in your personal library
- Tag, search, sort, duplicate, and organize presets
- Export/import preset collections as `.kyberstation-collection.json`
- Thumbnail auto-capture from the blade canvas
- Directory picker scans your local sound font collection (Chromium browsers)

### Saber Profiles & Card Presets
- Create named saber profiles with multiple card configs
- Card Preset Composer — add from Gallery, My Presets, or current editor state
- 4 built-in starter templates (OT Essentials, Prequel Collection, Dark Side Pack, Dueling Minimalist)
- Storage budget estimation per preset entry
- SD Card Writer — generate a ZIP with config.h and font directories, ready to extract

### Sharing
- Kyber Code system — compact config URLs with deflate compression + base64url encoding
- Single config, preset collection, and card template import/export
- Coming soon: Saber Card (see `docs/SHARE_PACK.md`)

### Accessibility
- Reduced motion auto-sync from OS `prefers-reduced-motion`
- Keyboard-only drag-and-drop (Alt + Arrow keys)
- ARIA labels, focus traps, color-only indicator text fallbacks
- Responsive grid layouts, 44px minimum touch targets
- 30 scene themes for full UI theming
- Optional Aurebesh script rendering for UI labels

### Privacy & Data
- Runs entirely in your browser
- No accounts, no login, no tracking
- All data stored locally in IndexedDB
- Works offline after first visit (PWA with service worker cache)
- MIT licensed — fork freely
