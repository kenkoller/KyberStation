# Video Tutorial Script — "Your First 5 Minutes With KyberStation"

> Script for a 5–8 minute introductory walkthrough matching the
> "Your First 5 Minutes" section of the in-app guide
> ([apps/web/app/docs/page.tsx](../apps/web/app/docs/page.tsx)). Written so
> every beat has (1) what to show on screen, (2) a suggested voice-over, and
> (3) timing notes.
>
> Target length: 5–8 minutes. Ideal is around 6 minutes — fast enough to hold
> attention, slow enough to absorb.

---

## Pre-production notes

- **Screen recorder**: macOS native (Shift-Cmd-5), Kap, or ScreenFlick.
  Capture at 1080p minimum, 1440p if the display supports it — YouTube
  down-scales gracefully.
- **Window size**: Use an exact 1920×1080 viewport for the browser so the
  editor renders in its full 4-column layout (1440px breakpoint).
- **Browser**: Chrome. KyberStation features that depend on Chromium
  (Font Library, WebUSB) won't demo on Safari.
- **Dark room, one lamp behind the camera** if you're doing a cold-open
  face shot. Keeps focus on you without wash.
- **Mic**: USB condenser or lavalier. Check levels on a 30-second test
  before committing to a full take.
- **No editing flourishes.** No zooms, no animated captions, no music.
  Tone should match the Reddit post: humble, specific, quiet.

## Structure at a glance

| Segment | Time | Content |
|---|---|---|
| Cold open | 0:00–0:20 | "I'm Ken, this is KyberStation, here's what it does." |
| Step 1 — Ignite | 0:20–1:00 | Open the app, press Space, watch the blade come on. |
| Step 2 — Try styles | 1:00–2:00 | Browse the Style panel, switch between 3–4 styles. |
| Step 3 — Trigger effects | 2:00–2:45 | Clash, Blast, Lockup demo with keyboard shortcuts. |
| Step 4 — Change color | 2:45–3:30 | Open Colors, pick a new base color, see the blade update. |
| Step 5 — Browse presets | 3:30–4:30 | Gallery tab, load Obi-Wan or Ahsoka, point out the detail. |
| Step 6 — Export | 4:30–5:15 | Output tab → Generate → show the code briefly. |
| Outro | 5:15–5:45 | "Try it, GitHub link, thanks for watching." |

Total: ~5:45 target. Pad to 6:30 if a step takes longer; cut ruthlessly
to 4:30 if the flow tightens up.

---

## Cold open (0:00–0:20)

**On screen:** Title card or face cam. If face cam, sit in front of the
hilt on a plain backdrop. If title card, use the KyberStation landing page
as the background with the wordmark visible.

**Voice-over:**
> "Hey — I'm Ken. I made something called KyberStation. It's a free,
> browser-based tool for designing custom lightsaber blade styles and
> exporting the code you flash onto your saber. In the next five minutes
> I'll walk you through making your first blade."

**Timing:** Aim for 15–18 seconds. Keep it tight — don't sell, don't list
features. Just state what it is.

---

## Step 1 — Ignite the blade (0:20–1:00)

**On screen:**
- Start on the KyberStation landing page at the deployed URL.
- Click **Open Editor** to enter the workspace.
- Blade canvas is visible at top, panels below. Blade starts retracted.
- Press **Space**. The blade ignites with the default style (Stable blue
  on a 36" blade).
- Hold the ignited frame for 3–4 seconds so viewers can see the idle
  animation.
- Press **Space** again. The blade retracts.
- Press **Space** one more time. Blade ignites again.

**Voice-over:**
> "This is the editor. The blade preview sits up top. Press Space to
> ignite — you'll hear the familiar snap-hiss sound, and the blade powers
> on with the default style. That's a stable blue blade, which is the
> starting point for most saber builds. Hit Space again to retract."

**Timing:** 40 seconds. Don't rush the ignition — let the animation
breathe.

**Gotcha to avoid:** If Space doesn't work on the first press, the
browser may not have focus yet. Click the canvas once first.

---

## Step 2 — Try different blade styles (1:00–2:00)

**On screen:**
- Blade is ignited.
- Open the **Style** panel (bottom of screen).
- Click **Unstable** — the blade starts flickering with Kylo-Ren-style
  crackle. Hold for 3 seconds.
- Click **Fire** — organic flame motion along the blade. Hold for 3
  seconds.
- Click **Rotoscope** — discrete color banding, original-trilogy look.
  Hold for 3 seconds.
- Click **Plasma Storm** — chaotic plasma bursts. Hold for 3 seconds.
- Return to **Stable** or leave on Plasma Storm for the next beat.

**Voice-over:**
> "There are 29 different blade styles built in. Every style has a
> different character. Unstable gives you that flickering, cracked-kyber
> Kylo Ren feel. Fire is more organic, with flames traveling up the
> blade. Rotoscope mimics the hand-painted look of the original 1977 film.
> Plasma Storm is pure chaos — random bursts and arcs. You can see the
> blade updates instantly as you click through them."

**Timing:** 60 seconds total, about 12–15 seconds per style demo.

**Alt styles to consider if those don't read well on camera:** Aurora
(slow flowing waves, very photogenic), Helix (DNA-like spiral pattern,
clear on tall blades), Crystal Shatter (fractured look).

---

## Step 3 — Trigger combat effects (2:00–2:45)

**On screen:**
- Blade is ignited, Stable style.
- Press **C** — a Clash effect flashes briefly. Do it 2–3 times in a
  row.
- Press **B** — a Blast bolt ring appears at a random position. Do it
  2–3 times.
- Press **L** to engage Lockup — sustained electrical activity at the
  contact point. Let it run for 3 seconds.
- Press **L** again to release Lockup.
- Press **N** for Force Lightning — branching arcs run the length of
  the blade. Let it run for 2 seconds.
- Press **N** again to release.

**Voice-over:**
> "Effects are what your saber does in combat. Press C for clash — that's
> what happens when blades collide. B for blast, which is a deflected
> blaster bolt — the position is randomized. Hold L for lockup, when
> two blades are pressed together. N for Force lightning. These are the
> same events that fire when you swing a real saber — KyberStation lets
> you preview exactly how each effect will look against your design
> choices."

**Timing:** 45 seconds.

**Gotcha:** Make sure keyboard focus is on the page, not a text input.
If you have the Parameters panel open and a slider is focused, keys may
not trigger effects. Click on empty space first.

---

## Step 4 — Change the color (2:45–3:30)

**On screen:**
- Blade is ignited.
- Open the **Colors** panel.
- Click the **base color** swatch to open the color picker.
- Drag the picker from blue toward red, pausing at green and purple.
  The blade updates in real time at every step.
- Settle on a specific color — e.g., Mace Windu purple (`#A020F0`-ish).
- Close the picker.

**Voice-over:**
> "Colors update live. Open the Colors panel, click the base color
> swatch, and drag around the picker. The blade follows instantly —
> there's no apply button, no preview-before-commit step. You can pick
> any canonical color for a character you're recreating, or invent
> something entirely your own."

**Timing:** 45 seconds.

**Aesthetic note:** Purple reads well on camera because it's unusual
but instantly recognizable as Mace Windu. Viewers will connect with it.

---

## Step 5 — Browse character presets (3:30–4:30)

**On screen:**
- Open the **Gallery** panel.
- Show the preset grid briefly — scroll through a handful of character
  thumbnails so the viewer sees the range.
- Click **Obi-Wan Kenobi — ANH** (or whichever presets are marked as
  featured). The editor swaps in the canonical config — style,
  color, ignition, effects.
- Hold on the resulting blade for 3–4 seconds.
- Click **Ahsoka Tano — Rebels** as a second demo. Hold again.
- Click **Kylo Ren — TFA** for a third demo — the crossguard shows up
  if it's configured in that preset.

**Voice-over:**
> "If you don't want to build a design from scratch, there's a gallery
> of character presets from across the saga. Jedi, Sith, Grey Jedi,
> animated-era characters, EU deep cuts. Each preset is a complete
> configuration: style, colors, effects, ignition, and tuning. You
> can use them as-is or use one as a starting point and customize from
> there. Let me load Obi-Wan Kenobi from A New Hope. … And here's
> Ahsoka's white saberstaff. … And Kylo's crossguard — that's an
> actual multi-blade topology, not just a visual effect."

**Timing:** 60 seconds.

**Alt presets if a particular character doesn't render well:** Luke ROTJ
green, Anakin ROTS, Darth Maul. These render cleanly and are instantly
recognizable.

---

## Step 6 — Export the code (4:30–5:15)

**On screen:**
- Open the **Output** tab.
- Click **Generate**.
- Scroll through the emitted code briefly (don't dwell — it's
  intentionally dense).
- Highlight the `StylePtr<Layers<...>>(...)` block so the viewer sees
  the shape.
- Copy button — flash the "copied to clipboard" toast.
- Optionally: briefly show the **Flash to Saber** panel so the viewer
  sees that the next step exists, without actually flashing.

**Voice-over:**
> "Once you have a design you like, open the Output tab and click
> Generate. For Proffieboard users, you get a block of ProffieOS C++
> code — paste this into your config.h and flash your board. For other
> boards, KyberStation outputs the right format for your hardware.
> And if you're on a Proffieboard V3 with a Chromium browser, there's a
> Flash to Saber panel right there that'll push the firmware over USB
> without any Arduino IDE. I won't flash on camera today, but that's
> the path."

**Timing:** 45 seconds.

**Why not actually flash:** The flashing process takes 30–60 seconds
and adds risk to the take. Mention it exists; save the demo for a
follow-up video.

---

## Outro (5:15–5:45)

**On screen:**
- Back to the landing page, or a simple title card with:
  - Deployed URL (e.g., `kyberstation.app` or the GitHub Pages URL)
  - GitHub repo link
  - "Free and open source"
- Optionally: end with a real-saber shot — 2–3 seconds of the finished
  blade design running on your actual 89sabers hilt, if you have footage.

**Voice-over:**
> "That's the whole thing. The URL is on screen — try it for yourself,
> it's free and runs in your browser. The code is on GitHub if you
> want to dig into it. If something is broken or confusing, please
> file an issue — I actually read them. Thanks for watching, and may
> the Force be with you."

**Timing:** 20–30 seconds. Resist the urge to re-list features. End on
the "may the Force be with you" — don't add anything after it.

---

## Things NOT to include in the v1 video

These belong in follow-up videos, not the first-five-minutes piece:

- Sound fonts and the Font Library (worth its own video)
- Saber Profiles and card composition (power-user flow)
- The visualization stack and pixel debug (technical audience only)
- Performance tiers and accessibility (important but niche)
- Aurebesh mode and scene themes (fun but not essential)
- Detailed parameter tuning (too deep for a first look)
- The WebUSB flash walkthrough (worth a dedicated 3-minute video)
- Multi-blade topologies beyond a 2-second demo
- The config.h structure explanation (viewers who need this will find
  [PROFFIEOS_FLASHING_GUIDE.md](./PROFFIEOS_FLASHING_GUIDE.md))

## Recording checklist

Before hitting record:

- [ ] Clear browser cache / open in a fresh profile so you don't have
  stale presets loaded
- [ ] Confirm the exact viewport size (1920×1080 or matching)
- [ ] Close every other app — no notifications, no Slack pings
- [ ] Disable system sounds (macOS → System Settings → Sound)
- [ ] Test audio levels with a 30-second scratch take
- [ ] Run through the script twice silently to settle the flow
- [ ] Put the hilt in view if you're doing a cold open

After recording:

- [ ] Check audio is clean, no peaking, no room echo
- [ ] Confirm the keyboard shortcuts actually triggered on camera
  (sometimes focus is off)
- [ ] Export at 1080p or 1440p, H.264, ~15 Mbps — good balance for
  YouTube
- [ ] Upload unlisted first, watch it back once, then make public

## Related docs

- In-app tutorial this script matches:
  [apps/web/app/docs/page.tsx](../apps/web/app/docs/page.tsx) — the
  "Your First 5 Minutes" section
- Launch plan (where this video will live):
  [LAUNCH_PLAN.md](./LAUNCH_PLAN.md)
- Shot list for static screenshots (separate from this video):
  [LAUNCH_ASSETS.md](./LAUNCH_ASSETS.md)
