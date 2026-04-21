# KyberStation Launch Plan

> **Status:** Pre-launch. **Launch target: as soon as ready.** Every day of runway before May 4 is a day users have to discover the tool, get comfortable with it, and load their sabers for Star Wars Day.
>
> This document is the single source of truth for the release plan. Update as decisions land.
>
> **Companion doc:** [`LAUNCH_ASSETS.md`](LAUNCH_ASSETS.md) — contains the copy-paste-ready Reddit post drafts, YouTube outreach email templates, screenshot shot list, GIF production guide, response templates for comments/issues, and the full feature list.

## Vision & Posture

**What KyberStation is:** A visual blade style editor, simulator, and ProffieOS config generator that Ken built primarily for his own saber, then decided to share with the community.

**Launch tone:** Humble. This is Ken's first publicly released programming project and first GitHub project. The Reddit post and all outreach should read as "I made this thing I'm excited about, hope it's useful, would love your feedback" — not "look at this shiny product I'm launching."

**Timing philosophy — launch ASAP, then amplify on May 4:**

- **The launch itself is not tied to May 4.** Launch as soon as the pre-launch checklist is clean and you have a deployed URL + basic assets ready. Every day earlier = more runway for community feedback, bug fixes, and word-of-mouth.
- **May 4 is a promotion beat, not a deadline.** On Star Wars Day (and the 3–5 days leading up to it), do a second wave of outreach: a fresh Reddit post variant ("sharing this again for Star Wars Day"), social posts, re-email any YouTubers who didn't reply the first time, ask users to post their blade designs with a tag.
- **The earlier the initial launch, the better May 4 goes.** Users need time to install, design, export, flash their boards, and actually enjoy the result. A user who installed KyberStation 3 weeks before May 4 shows up on May 4 with a finished saber. A user who discovers it on May 4 is still reading the docs.

**Suggested release order once the checklist is clean:**
1. Ship it (GitHub Pages deploy, v0.1.0 tag, public repo visible)
2. Soft-launch to a handful of trusted saber friends (2–5 days of private feedback)
3. Reddit launch (main event, mid-week morning)
4. Secondary channels (LinkedIn, blog, YouTube outreach) over the following week
5. **May 4 push** — second wave of visibility timed to Star Wars Day energy

## Success Criteria

- 50+ stars on GitHub in the first week
- 20+ comments on Reddit post with genuine engagement
- 5+ quality bug reports from real users on real hardware
- At least one non-Proffie board owner trying the tool and reporting back
- Zero personal bandwidth commitment exceeding ~5 hrs/week maintaining it post-launch

## Audience Segments (In Order of Priority)

1. **Proffieboard power users** — already comfortable editing config.h, will immediately understand the value. First wave of adopters, most likely contributors.
2. **CFX and Golden Harvest owners** — second-tier premium board owners, want more control than their stock software offers.
3. **Xenopixel / Asteria / budget Neopixel owners** — biggest population segment, will appreciate the visualizer and preset gallery even if code export is less relevant.
4. **Saber-curious hobbyists** — don't own a saber yet, might use KyberStation as inspiration / design tool before buying hardware.
5. **Professional saber makers** (shops, custom builders) — long-term opportunity, not the launch audience.

## Pre-Launch Checklist

### Code & Infrastructure

- [ ] All tests passing on `main`
- [ ] Latest build deployed to GitHub Pages (public URL live)
- [ ] Deployed URL works on mobile (PWA installable)
- [ ] `.gitattributes` committed so cross-platform dev works
- [ ] `v0.1.0` tag created → triggers `release.yml` → GitHub Release live

### GitHub Repo Settings

- [ ] Create `kenkoller/KyberStation` repo (public)
- [ ] Enable Discussions (Settings → Features)
- [ ] Add branch protection on `main`: require PR + passing CI
- [ ] Add topic tags: `lightsaber`, `proffieos`, `neopixel`, `blade-style`, `proffie`, `cosplay`, `saber`, `kyber`
- [ ] Repo description: "Visual blade style editor and ProffieOS config generator for custom lightsabers"
- [ ] Social preview image (1280×640 PNG) showing the editor

### Documentation

- [x] README has badges, quick-start, contributing links
- [x] CONTRIBUTING.md covers how to add styles, effects, presets, boards
- [x] CODE_OF_CONDUCT.md in place
- [x] SECURITY.md in place
- [x] Issue templates (bug, feature, style request)
- [x] PR template
- [ ] **User Guide polish pass** — the in-app `app/docs/page.tsx` should be newcomer-friendly. Assume the reader has never used a config editor before. Walk them through: "Here's how to design your first style" tutorial-style.
- [ ] Built-in screenshots / annotated UI callouts inside the docs page
- [ ] "Your first 5 minutes with KyberStation" quickstart video or GIF linked from the docs page

### Assets for Launch

- [ ] **5–8 high-quality screenshots** of the editor:
    1. Full editor view with a signature blade design visible
    2. Preset gallery showing the character library
    3. Code output panel with generated ProffieOS code
    4. Blade canvas close-up showing animation detail
    5. Saber profile / card composer view
    6. Mobile view (PWA on iPhone/Android)
    7. Compatibility panel showing multi-board support
    8. Sound font panel with an active font loaded
- [ ] **3–5 GIFs of the app in action** — ignition animations, effect triggers, style browsing
- [ ] **2–3 GIFs of real saber demos** — you swinging your 89sabers V3.9 with different styles loaded
- [ ] Hero image / OG card for social shares (1200×675, per SHARE_PACK.md spec)
- [ ] App icon finalized (KyberStation.app icon already generated — verify it looks good)

### In-App Feedback Mechanism

Lightweight options ranked by effort:

1. **Minimal (recommended for launch):** Add a "Feedback" button in Settings Modal that opens a pre-filled GitHub Issue URL. Zero backend, routes straight to where you want the feedback to live anyway.
2. **Medium:** Tally / Google Form embedded in a modal. Captures people who don't have GitHub accounts. Anonymous-friendly.
3. **Heavy:** Custom backend endpoint. Skip this for launch — not worth the ops burden.

Recommendation: ship option 1 at launch, evaluate need for option 2 after week 1.

## Reddit Post Strategy

**Subreddit:** r/lightsabers (primary), r/Proffieboard (secondary, smaller but engaged)

**Timing:** Weekday, 10am–1pm Eastern. Avoid weekends (post gets buried fast in that sub).

**Title options (pick one, test others later):**
- "I built KyberStation — a visual blade editor for Proffie and other saber boards. It's my first public project and I'd love your feedback."
- "Made a tool to design blade styles visually and export ProffieOS code. Free and open source. Feedback welcome."
- "KyberStation: a hobby project that grew into a full blade style editor. Sharing it with the community for May 4."

**Post body draft:**

```
Hey r/lightsabers —

I'm Ken. I own an 89sabers hilt with a Proffieboard V3.9 and I got tired of
editing config.h by hand every time I wanted to try a new blade style. So I
started building a tool for myself. It turned into something bigger than I
expected and a few folks I've shown it to said I should share it with the
community, so here we are.

It's called KyberStation. It's a browser-based visual editor for designing,
previewing, and exporting blade styles. It supports Proffie, CFX, Golden
Harvest, Xenopixel, and a bunch of other boards — ~16 in total. Works on
desktop and mobile (PWA installable).

**What it does:**
- Visual blade simulator — design a style, see it animate in real time
- 29 blade styles out of the box (Stable, Unstable, Fire, Rotoscope,
  Plasma, Aurora, and more)
- 21 effects (Clash, Lockup, Blast, Drag, Melt, Lightning, Shockwave, etc.)
- 19 ignition + 13 retraction animations
- 700+ character presets from every era of the saga
- ProffieOS C++ code generator — output compiles directly in Arduino IDE
- Sound font library support with SmoothSwing simulation
- Saber profile manager with card preset composer
- Multi-board compatibility scoring so you know what works on your hardware
- Shareable config URLs (Kyber Codes)
- Everything runs in the browser. No accounts, no backend, your data stays local.

**Try it:** [URL to deployed version]
**Code:** https://github.com/kenkoller/KyberStation

**Fair warning / what I need help with:**

This is a hobby project and my first public programming release. There's a
lot of room for improvement. I only personally own one board (Proffieboard V3.9)
so the compatibility for other boards is based on documentation and spot
testing — I absolutely need folks with CFX, GH, Xeno, Verso, etc. hilts to
try it and tell me what breaks.

I built it around how I use my own saber, so there are blind spots I can't
see. Please be kind — but also please be honest. If something is confusing,
broken, or missing, open an issue on GitHub or comment here and I'll look at it.

I don't know if I'm going to open it up for outside pull requests yet — I want
to see what the response looks like first. But bug reports, feature ideas,
style requests, and general feedback are all very welcome.

Sharing it now so folks have time to play with it and load up their
sabers well before Star Wars Day.

May the Force be with you.

[Screenshot 1]
[Screenshot 2]
[GIF of app in action]
[GIF of real saber demo]
```

**Tone notes:**
- "Hey, not "Hello everyone" or "Hi all"
- First person, conversational
- Acknowledge it's hobby work and first public project
- Specific about what you need help with (board testing)
- Don't say "release" — say "share"
- Don't list every feature in prose — the bullet list does the work
- Sign off with "May the Force be with you" — cheesy but earns goodwill

**Follow-up engagement (first 48 hrs):**
- Reply to every comment within a few hours
- Don't be defensive about bugs — thank the reporter, ask for details, file an issue
- Pin the GitHub issues link in a sticky comment
- If someone asks "will you support X board" — say "I'd love to, can you help me test it?"

## Additional Outreach Channels

### LinkedIn

**Audience:** Professional network, potential employers / collaborators, non-saber devs who might find it interesting as a technical project.

**Angle:** Different from Reddit — lean into the engineering. "I built a visual blade editor and ProffieOS code generator as a hobby project. Here's what I learned about AST-based code generation, visual simulation engines, and shipping a PWA." Post screenshots + architecture diagram.

**Timing:** 2–3 days after Reddit post. Let Reddit drive initial stars/feedback first.

### Personal Blog Post

**Audience:** Same as LinkedIn + future self + hiring managers researching your work.

**Angle:** Technical deep-dive. How it works, why the architecture decisions were made, what you'd do differently. Could be:
- "Building a visual editor for a hardware platform I barely understood"
- "Why I built KyberStation: a DAW for lightsabers"
- "AST-based code generation for ProffieOS — a case study"

**Timing:** 1–2 weeks after Reddit launch. Gives you time to collect real-world usage stories.

### YouTube / TikTok Influencer Outreach

The lightsaber community has a strong YouTube presence. A single well-placed review or mention could drive more traffic than any Reddit post.

**Tier 1 — Must reach out (highest impact):**
- **Fett263** — Creates the most popular ProffieOS prop file. If he even acknowledges KyberStation, adoption spikes. Approach respectfully: you are standing on his work. Offer to integrate with his prop file better.
- **Saber Sourcing** — Dedicated saber review channel with significant following. They cover news, new products, community tools.

**Tier 2 — Worth reaching out:**
- **KR Sabers** (community channel, not just the brand)
- **Sabertrio** YouTube (they make Verso + Golden Harvest sabers)
- **Smaller but dedicated Proffie channels** — search "Proffieboard tutorial" on YouTube, find creators with 5k–50k subs actively making content in the last 6 months

**TikTok:** The saber community on TikTok skews younger and is growing. Harder to identify specific creators without current research. Focus here after Reddit + YouTube land.

**Outreach template (short, respectful, no pitch-deck energy):**

```
Subject: I built a free tool for designing Proffie blade styles — would
love your honest feedback

Hi [Name],

Big fan of your work — [specific thing you appreciated]. I wanted to share
a free open-source tool I built called KyberStation. It's a browser-based
visual editor for blade styles that exports ProffieOS code.

I'm not asking for a review or endorsement — just hoping you'd take a look
and tell me what you think, especially anything confusing or missing. If
you decide it's worth sharing with your audience down the road, that would
be amazing, but no expectation.

Try it: [URL]
Code: https://github.com/kenkoller/KyberStation

Thank you for everything you contribute to this community.

Ken
```

**What NOT to do:**
- Don't mass-email. Personalize each one. Reference something specific they've done.
- Don't ask for a video / review / shoutout in the first message. That's a second-email ask if they respond positively.
- Don't overpromise. Don't say "it's the best tool for X" — let them decide.

### Future (Post-Launch, Not for May 4)

- **In-depth demo video** (15–30 min walkthrough of every feature)
- **"How I built this" technical talk** — good for conferences, your blog, YouTube
- **Saber vendor partnerships** — some shops (89sabers, Sabertrio, etc.) might link to KyberStation from their support pages if the tool works well for their boards
- **Hackernews post** if it gets traction — "Show HN: KyberStation"
- **Product Hunt** launch — only if/when you have a polished onboarding flow; PH audience is less forgiving of rough edges

## "I Don't Own All These Boards" Honest Disclosure

This is a feature, not a bug. Say it out loud in the Reddit post and in the README. Something like:

> KyberStation supports 16 boards, but I personally only own a Proffieboard V3.9.
> The other 15 board profiles are based on published documentation and community
> knowledge. If you own one of these boards and the compatibility feedback is
> wrong — please file an issue. I need your help to make this accurate.

Boards you don't own = implicit call for testers. Turn it into an onboarding moment instead of a liability.

### WebUSB flashing — validated scope

The "Flash to Saber" feature is distinct from "code generation for 16 boards" — flashing only works for STM32-based Proffieboards, and has been end-to-end hardware-validated only on **Proffieboard V3.9 + macOS 15 + Brave**, as of 2026-04-20. Include that nuance in the Reddit post so nobody plugs in a Xenopixel and expects the flash panel to work.

Suggested messaging:

> Flashing from the browser has been verified on my own Proffieboard V3.9 on macOS + Brave. It *should* work on Chrome/Edge/Arc (same WebUSB implementation), on Windows/Linux, and on other Proffieboard revisions — but I haven't tested those combinations yet. If you try it on something new and it works (or doesn't), please file a [hardware report](https://github.com/kenkoller/KyberStation/issues/new?template=hardware_report.md). Boards that aren't STM32-based (CFX, Xenopixel, Golden Harvest, etc.) can export their `config.h` from KyberStation but need their vendor's own flashing tool.

## Open Question: Accepting Contributions

**Options:**

1. **Closed to PRs at launch** — public code, free to fork, but you're the only one merging. Lowest overhead. Fastest to maintain.
2. **Open to curated PRs** — CONTRIBUTING.md says "open an issue first, we'll discuss, then PR." Moderate overhead. You remain final reviewer.
3. **Fully open** — anyone can submit PRs on anything. Highest overhead, highest potential community growth.

**Recommendation for launch:** Start with option 1 or 2. You can always loosen up later. Loosening is easy; tightening after the fact is awkward.

Put a line in the README:

> **Contributions:** I'm not currently accepting outside pull requests
> while the project is still taking shape. I am very interested in bug
> reports, feature ideas, and style requests — please use the issue
> templates. This policy will likely change as things stabilize.

Revisit at 30 days post-launch.

## Desktop / Mobile Launcher for Non-Developers

**Current state:**
- Developers get the `KyberStation.app`, `.bat`, `.ps1`, `.command` launchers for running the dev server locally. These are useful for you and contributors but confusing for end users.
- Regular users get the **deployed web app** (GitHub Pages). That's the real launcher — they visit the URL and they're in.

**The install story for users:**

1. **Web:** Visit the URL. App loads. Done.
2. **Install as PWA:**
    - Desktop Chrome: click the install icon in the address bar
    - iOS Safari: Share → Add to Home Screen
    - Android Chrome: "Install app" prompt appears automatically
3. **Icon on home screen / dock:** PWA launches in its own window, looks like a native app.

**What's needed for the PWA story to be airtight:**
- [ ] Verify `manifest.json` has all the right icon sizes (192, 512, maskable)
- [ ] Verify `sw.js` caches the shell so it works offline after first visit
- [ ] Test install flow on iOS, Android, Mac, Windows
- [ ] Document the install steps in the in-app docs page ("Installing KyberStation")

**You do NOT need:**
- Electron wrapper
- Native iOS / Android app
- App Store / Play Store listings
- Installers (.dmg, .msi, .exe)

The PWA covers all these use cases for free. Ship it.

## Post-Launch Monitoring (Week 1)

**Daily checks:**
- GitHub issues — respond within 24 hrs, even if just "thanks, looking into it"
- GitHub Discussions — answer questions
- Reddit post — reply to comments, keep momentum in first 48 hrs

**What to watch for:**
- **Repeated bug reports** → prioritize fixes, cut a v0.1.1 patch release
- **Board compatibility complaints** → add to the "needs testing" list, engage the reporter as a test partner
- **Feature requests you agree with** → label, don't commit to timing
- **Feature requests that don't fit the vision** → label "wontfix" respectfully, explain why
- **Someone offering to contribute code** → thank them, tell them the current contribution policy, keep the door open for later

**What to AVOID:**
- Promising features to specific users
- Getting into debates in the comments
- Feeling obligated to respond instantly — "I'll look into this tomorrow" is fine
- Scope creep from enthusiasm — protect your 5 hrs/week

## Protecting Your Time

You said you don't want this project to consume your life. That's the right posture. Some guardrails:

1. **Set office hours for the project.** Maybe Sunday evening + one weeknight. Don't check issues during work or before bed.
2. **Batch replies.** Don't answer comments the second they come in. Respond in batches.
3. **Use templates** for common responses ("thanks for the report, can you try X and let me know?")
4. **Close stale issues** — the stale bot handles this automatically after 60 days
5. **Say no to scope.** If someone wants a feature that doesn't fit, "I'm not planning to add that but feel free to fork" is a legitimate answer.

## Things You Might Be Forgetting

Here are things that often catch first-time open-source maintainers by surprise:

- **License clarity** — MIT is in place. Good.
- **Attribution** — if you used any code, fonts, or assets from others, credit them in README. ProffieOS itself is GPL; your code is separate since you're generating text, not linking to it, but credit Fredrik Hubinette anyway as the creator of ProffieOS.
- **Trademark disclaimer** — add a line somewhere: "Star Wars, lightsaber, Jedi, Sith, and related terms are trademarks of Lucasfilm Ltd. KyberStation is an unofficial fan project and is not affiliated with or endorsed by Lucasfilm or Disney."
- **Data privacy statement** — even a one-liner: "KyberStation runs entirely in your browser. No data is collected, transmitted, or stored on any server."
- **Accessibility pass** — your codebase already has strong a11y. Mention it in the README as a selling point.
- **Offline mode disclosure** — PWA caches the shell. Users can design styles on a plane. Call that out.
- **Cost to you** — GitHub Pages is free. Domain (if you buy one) is ~$12/yr. No hidden ongoing costs. You can afford to keep this up indefinitely.
- **What happens if you get hit by a bus** — morbid but real. Put the project org in your will / password manager notes so someone could take it over.
- **Don't merge drunk / tired / emotional** — code review discipline matters more on public projects.

## Asset Production Checklist

Things that need creating before launch (separate from code):

### Screenshots (5–8)
Take these on a high-DPI display. Retina Mac screenshots render sharply on every platform. Save as PNG.

- [ ] Editor hero shot — show a cool blade design, clean UI
- [ ] Preset gallery — show the character presets
- [ ] Code output — show generated ProffieOS code
- [ ] Mobile view — iPhone screenshot of the PWA
- [ ] Saber profile manager — card composer in action
- [ ] Compatibility panel — show the multi-board scoring
- [ ] Sound font panel — with a font loaded
- [ ] Canvas close-up — animation frame at high zoom

### GIFs (3–5 of app, 2–3 of real saber)
Use Kap, ScreenFlick, or similar to capture. Keep each under 10 seconds. Compress aggressively — Reddit compresses harshly.

- [ ] App: ignition animation (pick a dramatic one)
- [ ] App: switching between blade styles quickly
- [ ] App: triggering effects (Clash, Blast, Lockup)
- [ ] App: mobile install flow
- [ ] Real saber: you swinging your 89sabers with 2–3 different styles side-by-side

### Social Preview Card (OG Image)
1200×675 PNG for GitHub / Twitter / Discord embedding when the repo URL is shared. Can reuse the SHARE_PACK spec for visual style.

## Suggested Timeline (Launch ASAP + May 4 Amplification)

The timeline below is a template — the actual dates shift based on when the pre-launch checklist is clean. Launch as soon as you can, not on a specific date.

### Week 0 — Launch Prep (as short as possible)
- Complete the pre-launch checklist
- Push rename, tag v0.1.0, deploy to GitHub Pages, confirm public URL works
- Produce 5–8 screenshots and 3–5 GIFs (don't wait for perfection — "good enough to ship" is the bar)
- Test PWA install on 4 device combinations (iOS Safari, Android Chrome, Mac Chrome, Windows Chrome)

### Week 1 — Soft Launch
- Share privately with 2–5 trusted saber friends or r/lightsabers folks you already know
- Gather reactions, fix anything critical
- This step can take 2–5 days; don't skip it, don't let it stretch

### Week 1 or 2 — Reddit Launch (Main Event)
- Weekday, 10am–1pm Eastern
- Reply to every comment within a few hours for the first 48 hrs
- Fix quick wins as they come in
- Don't promise features, don't get defensive, don't compare to other tools

### Week 2 — Secondary Push
- LinkedIn post (3–5 days after Reddit)
- Blog post on your professional site
- Email tier-1 YouTube creators (Fett263, Saber Sourcing, etc.) individually
- Keep an eye on GitHub issues daily

### Running Up to May 4 (Star Wars Day Amplification)
This is where the early launch pays off. Users who installed weeks ago now have time to design, export, flash, and show off their builds on May 4.

- **~5 days before May 4:** Second-wave Reddit post variant. Different title, fresh angle. Example: "Star Wars Day is coming — if you want to try a new blade style on your saber, here's the tool I shared a few weeks back." Include user-submitted examples if any came in.
- **~3 days before:** Re-email any YouTube / TikTok creators who didn't reply the first time. Star Wars Day is a natural hook.
- **~1 day before:** LinkedIn / Twitter / wherever else — "Hey Star Wars Day tomorrow, here's a fun hobby tool I made."
- **May 4 itself:** Post a "happy Star Wars Day" comment on the original Reddit post with usage stats and a request for users to share what they designed. Start a community thread. Let the community celebrate itself.

### After May 4
- Reflect on what worked and what didn't
- Write the "how I built this" blog post
- Plan v0.2 based on real feedback
- Decide whether to open up for contributions

## Kill Criteria

If any of these happen, pause the rollout:

- Critical bug that bricks a board or loses user data
- Legal letter from Lucasfilm / Disney (unlikely but acknowledge it)
- Repo gets brigaded with bad-faith issues → lock down, make private, reassess
- Burnout signals in yourself → step back, the community will still be here in two weeks
