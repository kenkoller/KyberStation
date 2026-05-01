# Launch Copy Pack

Polished, copy-paste-ship drafts for the public launch
(soft launch posture — share with the community while mobile UX
work continues).

**Calendar reality (refreshed 2026-05-01):**
- Today is **May 1**. Star Wars Day is **May 4** — 3 days away.
- v0.16.0 shipped 2026-04-30 but the public Reddit post never went up
  (prep ran long; Brave-vs-Chrome screenshot detour, late-night
  preset cartography mini-sprint pushed Visions Vol 1 + Acolyte/Maul
  presets into main, Wave 8 LITE landed 8 new modulators).
- **Counts at last audit (2026-05-01):** 33 styles, 22 effects, 19+13
  ignition/retraction, **354 character presets**, **19 modulators**
  (11 v1.1 Core + 8 Wave 8 LITE button/gesture events), 16 boards.
- Schedule below is re-anchored to **today = T-0** (launch day).

Voice: humble, specific, honest. Don't rewrite — paste and tweak the
brackets only (`[URL]`, `[Name]`, `[specific video]`).

## What's in here

| File | Purpose | When to send |
|---|---|---|
| `REDDIT_POSTS.md` | 3 Reddit post variants + cross-post candidates + 7 reply templates | Day 1 (launch day, weekday 10am-1pm ET) |
| `REDDIT_CLAUDE_POST.md` | r/ClaudeAI build-process post — Claude Code workflow story, parallel agents, MCPs, what didn't work | Day 4-7 (after r/lightsabers shows real engagement) |
| `YOUTUBE_OUTREACH.md` | 5 cold-email variants + personalization checklist + follow-up | Day 7-10 (after Reddit traction shows) |
| `FREDRIK_EMAIL.md` | Two careful drafts to the ProffieOS creator — the foundation everything sits on | Day 0 (before Reddit, same day as Fett263) |
| `FETT263_EMAIL.md` | Two careful drafts to the prop-file author KyberStation builds on | Day 0 (before Reddit, ideally same day or day before) |
| `TIKTOK_INSTAGRAM_OUTREACH.md` | 3 short-form DM/comment templates | Day 10-14 (parallel to YouTube wave) |
| `GITHUB_ANNOUNCEMENT.md` | Pinned discussion + README diff suggestions | Day 0 (when repo flips public) |
| `SOCIAL_MEDIA_BLURBS.md` | Twitter/X, LinkedIn, Mastodon, HN, Bluesky | Twitter day 1, LinkedIn day 4, HN if traction warrants |

## Suggested launch order (re-calibrated 2026-05-01)

**T-0 / today — May 1 (Friday): main launch event**

Pre-launch infrastructure is already in place:
- ✓ v0.16.0 tag shipped 2026-04-30
- ✓ Repo public, GitHub Pages live at https://kenkoller.github.io/KyberStation/
- ✓ All 11 launch screenshots committed at `docs/images/launch/`
- ✓ Marketing GIFs in `apps/web/public/marketing/` (style-grid, color-cycle, lockup-loop)
- ✓ Reddit title locked, 19 reply templates ready (8 generic + 11 concrete)

Today's send order (do these in this sequence):

1. **Send 3 outreach emails** (Gmail Connector in Claude Desktop):
   - Fredrik Hübinette (`FREDRIK_EMAIL.md` Variant B)
   - Fett263 (`FETT263_EMAIL.md` Variant B)
   - The Collectors Outpost (`YOUTUBE_OUTREACH.md` § pre-filled)
   Send all 3 in ~15 min window. Wait ~1-2 hours for any concerns
   from devs before going public.
2. **URL smoke-test** — open https://kenkoller.github.io/KyberStation/
   one final time, verify the editor loads cleanly.
3. **Pin GitHub Discussion** — body in `GITHUB_ANNOUNCEMENT.md`.
4. **Post r/lightsabers** with the locked title from `REDDIT_POSTS.md`
   + Variant A body. Inline media: pick from
   `docs/images/launch/editor-*.jpg` (recommend editor-06 vibrant
   green hero) + `gallery.jpg` + `apps/web/public/marketing/style-grid.gif`.
5. **Camp the Reddit thread for 4-6 hours.** Use the 19 reply
   templates. Don't reply instantly — batch every 30-60 min.
6. **Post Twitter/X + Bluesky + Mastodon** (`SOCIAL_MEDIA_BLURBS.md`)
   2-3 hours after Reddit, only if r/lightsabers shows positive
   traction (10+ comments, net upvoted).

**T+1 / Saturday May 2:**
- Cross-post to r/Proffieboard (Variant B) if r/lightsabers is stable.
- LinkedIn post (engineering angle, different audience).

**T+2 / Sunday May 3:**
- Reddit Variant C amplification post — "Star Wars Day is tomorrow,
  here's what's new since I shared this last week" + real engagement
  numbers from the original post. **This is the May 4 amplification
  beat the launch plan called for.**
- Twitter/X thread amplification.

**T+3 / Monday May 4 — Star Wars Day:**
- "Happy Star Wars Day" comment thread on the original r/lightsabers
  post. Ask users to share their Kyber Codes.
- **Do NOT create a new Reddit post.** Variant C ran yesterday;
  doubling up looks promotional.
- Coordinate with whoever's around — friends, builders, the
  Crucible community Discord — for organic May 4 noise.

**T+4 to T+7 / Tuesday-Friday week of May 5:**
- Post to **r/ClaudeAI** (`REDDIT_CLAUDE_POST.md`) — different angle,
  build-process story. Post once you have real engagement numbers
  from r/lightsabers + r/Proffieboard to cite in the post.

**T+7 to T+10 / following week:**
- YouTube outreach wave (`YOUTUBE_OUTREACH.md`) — only after you
  have real user feedback to mention ("the community has already
  helped me fix X").
- TikTok / Instagram DMs (`TIKTOK_INSTAGRAM_OUTREACH.md`).
- Show HN if Reddit traction warrants it.

## Tone discipline reminder

Read `docs/LAUNCH_PLAN.md` § "Vision & Posture" before sending anything.
Every draft below was written to match that voice. If you find yourself
adding adjectives like "powerful" or "advanced," delete them.
