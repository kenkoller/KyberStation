# Fredrik Hübinette — Direct Outreach

Fredrik created ProffieOS and the Proffieboard hardware. KyberStation
exists because ProffieOS exists. This is the most foundational
acknowledgment in the entire launch — even more so than Fett263, because
the prop file runs on top of the OS Fredrik wrote.

**Tone:**
- Deep respect — he built the platform
- Informational, not transactional — you're telling him, not asking him
- Mention the GPL-3.0 attribution in every generated config
- Reference his Web Bluetooth POC (shows you've done your homework)
- Don't ask for endorsement, review, or anything
- Make clear it's hobby, no commercial intent

**Send timing:** Same day as or one day before the Fett263 email.
Before the public Reddit post.

**Channel:** GitHub (profezzorn) or his website (fredrik.hubbe.net).
If he has a contact form or listed email, use that. A GitHub Discussion
post on the ProffieOS repo is also reasonable — it's public and he
monitors it.

**What NOT to do:**
- Don't ask for a feature, integration, or collaboration
- Don't position KyberStation as an official tool or partner
- Don't imply any affiliation with the ProffieOS project
- Don't follow up more than once if he doesn't reply

---

## Variant A — Short, informational

### Subject
KyberStation — heads-up on a free visual editor built on ProffieOS

### Body

```
Hi Fredrik,

I'm Ken. I own an 89sabers hilt with a Proffieboard V3.9, and I've
been using ProffieOS for a while now. I wanted to reach out because
I built a tool on top of your work that I'm about to share publicly,
and it didn't feel right to do that without telling you first.

It's called KyberStation — a free, open-source, browser-based visual
editor for designing blade styles and exporting ProffieOS config code.
Users design a style visually, preview it in real time, and export a
config.h that compiles directly in Arduino IDE against ProffieOS 7.x.

Try it: https://kenkoller.github.io/KyberStation/
Code: https://github.com/kenkoller/KyberStation

KyberStation is MIT-licensed. Every generated config includes a
GPL-3.0 attribution header acknowledging ProffieOS, and the
README credits you as the creator of both ProffieOS and the
Proffieboard hardware.

This is a hobby project and my first public release. No commercial
intent. I'm not asking for anything — just wanted you to know it
exists, and to say thank you. Without ProffieOS, this tool wouldn't
exist and neither would the community it's built for.

— Ken
```

---

## Variant B — Slightly more detail

### Subject
KyberStation — free visual blade editor built on ProffieOS (heads-up before public launch)

### Body

```
Hi Fredrik,

I'm Ken. I've been running ProffieOS on my 89sabers Proffieboard V3.9
and it's genuinely one of the most impressive open-source projects
I've encountered — the depth of the template system, the motion
processing, the audio engine. It's remarkable work.

I'm reaching out because I built a tool on top of ProffieOS that I'm
about to share with the saber community, and I wanted to give you a
heads-up first.

It's called KyberStation — a free, open-source, browser-based visual
editor for designing blade styles and generating ProffieOS config
code. The code generator is AST-based and emits real ProffieOS
templates (Layers<>, InOutTrL<>, BlastL<>, the responsive functions,
etc.) that compile directly against ProffieOS 7.x via arduino-cli.
Hardware-validated end-to-end on my own V3.9 including DFU flash.

Try it: https://kenkoller.github.io/KyberStation/
Code: https://github.com/kenkoller/KyberStation
License: MIT (KyberStation source). Generated configs target
ProffieOS (GPL-3.0); that relationship is documented in the README
and every generated config carries a GPL attribution header.

I also came across your Web Bluetooth proof-of-concept at
profezzorn/lightsaber-web-bluetooth during research for a future
wireless-update feature. Impressive work — if KyberStation ever
pursues that direction, your POC would be the natural starting point,
and I'd want to coordinate rather than duplicate.

I'm not asking for anything — no review, no endorsement, no
integration. This is a hobby project, my first public release, and
there's no commercial intent. I just wanted you to know it exists
and to express genuine gratitude. ProffieOS is the reason this
community can do what it does, and KyberStation is a visual layer
on top of what you built.

If anything in the generated output or the attribution language
doesn't sit right with you, I'd want to hear about it and fix it
before the wider community sees it.

Thank you for everything.

— Ken
```

---

## What to do if Fredrik responds

### If positive or neutral
- Thank him briefly and sincerely
- Don't push for more engagement
- If he has technical feedback on the generated code, take it seriously
  — he knows the template system better than anyone alive

### If he has concerns about GPL compliance or attribution
- Take them extremely seriously — he's the copyright holder
- Fix whatever he flags before the public launch
- Offer to delay the launch until resolved
- Consult the GPL-3.0 text if needed — KyberStation's MIT source is
  an aggregate work; the generated configs are derivative of ProffieOS

### If he doesn't reply
- Wait 7 days
- Send one follow-up (below), then proceed with the launch
- His silence after a respectful heads-up is implicitly fine

### Follow-up (one shot, after 7 days of no reply)

Subject: `Re: [original subject]`

```
Hi Fredrik,

Quick follow-up — wanted to make sure this didn't get lost. No reply
needed if everything looks fine. I'm planning to share KyberStation
publicly on [date] unless I hear concerns.

Try it: https://kenkoller.github.io/KyberStation/

Thanks again for ProffieOS.

— Ken
```
