# Docs Polish Brief

> **For the next Claude Code session.** Read this file end-to-end before touching any docs. The work is about polish and depth, not reinvention — the documentation structure is already in place. Your job is to fill gaps, improve clarity for newcomers, and harden weak spots.
>
> Do NOT begin until the user gives you a go signal.

---

## Context You Need

**What KyberStation is:** A free, open-source, browser-based visual blade style editor and ProffieOS config generator for custom lightsabers. Supports ~16 saber boards. Hobby project by a single developer (Ken, `@kenkoller` on GitHub).

**Why polish the docs:** The project is pre-launch. Public release target is "as soon as ready," with a May 4 (Star Wars Day) promotion amplification beat. This is Ken's first publicly released programming project. The documentation is the user's first impression and will either invite them in or push them away.

**Tone to preserve everywhere:**
- **Humble.** "Hobby project", "my first public project", "still taking shape" — not "the best tool for X".
- **Specific.** Numbers, not superlatives. "29 blade styles" is better than "lots of blade styles".
- **Invitational.** Bug reports and feedback are explicitly welcomed. Outside PRs are NOT accepted yet.
- **Non-patronizing.** Users of this tool range from absolute beginners to Proffie power users. Write for both without condescending to either.
- **No emoji in prose.** Occasional emoji in UI controls or visual aids is fine.

**Audience priorities (highest to lowest):**
1. Proffieboard power users
2. CFX / Golden Harvest owners
3. Xenopixel / budget Neopixel owners
4. Saber-curious hobbyists who don't yet own hardware
5. Professional saber makers

## What's Already Done (DO NOT REDO)

### In-app user guide (`apps/web/app/docs/page.tsx`)

Already has these sections in this order:
1. **Welcome to KyberStation** — newcomer-friendly intro
2. **Your First 5 Minutes** — 6-step tutorial walkthrough
3. **The Editor Workspace** — UI orientation (formerly "Getting Started")
4. Blade Styles, Effects, Ignition & Retraction, Colors, Parameters, Audio, Gallery, Output, etc. — existing content, comprehensive
5. **Installing KyberStation** — PWA install for Chrome/Edge/Safari/Android
6. **Feedback & Community** — how to file issues, contribution policy

### Settings modal

Has a "Feedback" section with four action links (Report a bug, Suggest a feature, Request a style, Ask a question) + source on GitHub link.

### Repo-level docs

- `README.md` — has badges, quick-start, contributing links, Star Wars trademark disclaimer
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- `SECURITY.md` — client-side app scope, reporting policy
- `docs/LAUNCH_PLAN.md` — full launch strategy
- `docs/LAUNCH_ASSETS.md` — Reddit/YouTube/blog post drafts, shot lists, response templates
- `docs/ARCHITECTURE.md` — technical architecture
- `docs/DEVELOPMENT.md` — dev setup
- `docs/CONTRIBUTING.md` — how to add styles, effects, presets, boards
- `docs/STYLE_AUTHORING.md` — blade style authoring guide
- `docs/PROFFIEOS_FLASHING_GUIDE.md` — firmware flashing
- `docs/SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md` — font + preset system

---

## What Needs Polishing (In Priority Order)

### Priority 1 — Newcomer usability of the in-app guide

The in-app guide at `apps/web/app/docs/page.tsx` covers almost every feature but has room to breathe for newcomers.

1. **Add a "Glossary / Terminology" section** near the top. Explain saber-world terms that non-Proffie-native users might not know: *clash*, *blast*, *lockup*, *drag*, *melt*, *SmoothSwing*, *prop file*, *preset*, *kyber code*, *LED strip*, *Neopixel*, *Baselit*, *IMU*, *ProffieOS*, *config.h*, *flashing*, *smooth vs. responsive styles*. Keep definitions to 1–2 sentences each.

2. **Add a "Troubleshooting" section** covering the most common first-encounter problems. Draft the list yourself by thinking through "what would a new user get stuck on?" — e.g., blade doesn't ignite (is the browser allowing audio?), colors look different on real LEDs vs. the simulator (gamma, LED type), generated code won't compile (missing ProffieOS includes, wrong prop file), sound fonts not detected (directory picker is Chromium-only), IndexedDB data wiped (what to do). Each entry: problem → cause → fix.

3. **Add a "Flashing your saber" cross-reference section** that links to `docs/PROFFIEOS_FLASHING_GUIDE.md` rather than duplicating it. Short — just the bridge from "I have my generated code" to "how do I get it on my board."

4. **Add a "Keyboard Shortcuts" reference section** (if not already present — search for it first). Should be a single cheat-sheet-style table. Keyboard shortcuts are also in the Settings modal, but a reference in the docs is useful.

5. **Consider whether the order of existing sections flows well for a first-time reader.** Welcome → First 5 Minutes → Editor Workspace is right. After that, the mental model a user has is "I've seen the basics, now show me depth." So: Styles → Effects → Colors → Ignition → Params → Audio → Gallery → Saber Profiles → Output/Code → Troubleshooting → Installing → Feedback. Audit the actual order against this mental flow and reorder if needed (by moving entries in the `SECTIONS` array).

### Priority 2 — README audit

Open `README.md` and verify every factual claim is still accurate.

- Feature counts: number of blade styles, effects, ignition/retraction animations, boards, presets. Cross-check against the actual code in `packages/engine/src/styles/`, `packages/engine/src/effects/`, `packages/engine/src/ignition/`, `packages/boards/src/profiles/`, `packages/presets/src/characters/`.
- Tech stack — still accurate?
- Quick start — does `pnpm install && pnpm dev` actually work from a fresh clone? (You don't need to run it, just verify the scripts exist in `package.json` and reference the right entry points.)
- Architecture diagram (if any in README) — matches reality?
- Badges — all URLs resolve? (CI badge, License, PRs Welcome)

**DO NOT** restructure the README. Just fix incorrect or stale claims and tighten prose where it's wordy.

### Priority 3 — `docs/CONTRIBUTING.md` polish

This file was written when the project was still "BladeForge" / early-stage. Re-read it and:

- Make sure the tone is consistent with the humble launch posture
- Add a prominent note at the top: "Outside pull requests are not currently accepted. Issues, bug reports, and feature discussions are very welcome. Policy will likely change after the project stabilizes."
- Fix any stale numbers (`398 tests` may no longer be accurate — audit against the actual test count)
- Ensure the "adding a new blade style / effect / board" sections match the current code structure
- Cross-link to `docs/STYLE_AUTHORING.md` and `docs/ARCHITECTURE.md` where appropriate

### Priority 4 — Docs folder audit

There are a lot of docs in `docs/`. Some may be stale or duplicative. Audit each and:

- Add a one-sentence summary at the top of each if missing, so readers know what each doc is for
- Remove or consolidate docs that duplicate information
- Flag (but don't delete) any doc that looks like an outdated spec or working note. Ask the user if uncertain.
- Consider whether a single `docs/README.md` index would help — a file that lists all the docs with one-line summaries of each, so new contributors know where to look

### Priority 5 — CHANGELOG seed

Create `CHANGELOG.md` at the repo root if it doesn't exist, seeded with a v0.1.0 entry covering the major features being shipped at launch. Follow [Keep a Changelog](https://keepachangelog.com/) format (Added / Changed / Fixed / Removed sections). This is what `release.yml` workflow will reference when creating GitHub Releases.

### Priority 6 — Video tutorial script

Ken wants to record a "first 5 minutes" walkthrough video. Write the script in a new file `docs/VIDEO_TUTORIAL_SCRIPT.md`:

- 5–8 minutes total
- Matches the "Your First 5 Minutes" tutorial already in the in-app docs page
- Specific actions to take on screen at each step
- Suggested voice-over for each beat
- Notes on what to show in the blade canvas at each moment (which style, which effect, etc.)
- Short cold open ("I'm Ken, this is KyberStation, here's how to make your first blade") and outro ("Link to try it, link to GitHub, thanks for watching")

Do not attempt to record or storyboard — script only.

---

## What's Out of Scope (Do NOT Do)

- **Do NOT rewrite existing docs wholesale.** Polish, fill gaps, fix errors. Do not restructure without a specific reason.
- **Do NOT add new app features.** Documentation only. If you notice something broken in the code, file an issue or add a TODO comment, but don't implement fixes.
- **Do NOT change the launch plan or assets** (`LAUNCH_PLAN.md`, `LAUNCH_ASSETS.md`) without explicit user approval. These are frozen pending launch.
- **Do NOT produce screenshots or GIFs.** Those require Ken's hardware and his hilt. The shot list in `LAUNCH_ASSETS.md` tells him what to capture; you don't produce the assets.
- **Do NOT modify the tone to be more promotional.** The humble, hobby-project voice is intentional.
- **Do NOT commit without approval.** Make the changes, run `pnpm typecheck` if code files were touched, and then hand off to Ken for review before he decides what to commit.
- **Do NOT open-source the contribution policy** (i.e., don't say "we welcome PRs!" anywhere). That policy decision is post-launch.

---

## Working Process

1. Read this brief in full.
2. Read the top of `README.md`, `CLAUDE.md` (for project context), and `docs/LAUNCH_PLAN.md` (for launch context).
3. Use a TodoWrite list to track the priorities above.
4. Work through priorities in order. After each one, run a quick self-review: is this more helpful for a newcomer? Did I preserve the humble tone? Did I cite specific numbers? Did I cross-link properly?
5. For code files you touched (`apps/web/app/docs/page.tsx`), run `cd apps/web && pnpm typecheck` to verify.
6. When done, summarize what you changed, which priorities are still open, and any questions the user needs to weigh in on. Do NOT commit.

---

## Definition of Done

A new user who opens the deployed KyberStation, goes to the built-in docs page, and reads from top to bottom should:

- Understand what KyberStation is within the first paragraph
- Be able to complete their first blade design within 5 minutes of starting to read
- Know where to go when something doesn't work
- Understand how to install the app as a PWA
- Know how to send feedback if something is broken or missing
- Have a clear mental model of which features exist and which might not apply to their board

For repo-level docs (README, CONTRIBUTING, CHANGELOG):

- A developer encountering the repo for the first time can clone, install, and run the dev server using only the README's quick-start section
- The contribution policy is unambiguous (no PRs yet, bug reports welcome)
- The CHANGELOG is a truthful account of what's shipped in v0.1.0
