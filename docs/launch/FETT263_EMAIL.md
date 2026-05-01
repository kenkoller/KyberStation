# Fett263: Direct Outreach

This is the most delicate outreach in the entire launch wave. Fett263
created `saber_fett263_buttons.h`, the most-used ProffieOS prop file
and his style library is the de facto community reference.
KyberStation generates code that targets his prop file. **You are
standing on his work.**

**Tone:**
- Acknowledge his work as foundational
- Be clear KyberStation isn't competing, it's a visualizer/editor that
  produces config.h targeting his prop file
- Ask for any concerns BEFORE the public launch, don't surprise him
- Soft offer: credit, coordination on prop-file changes
- Make clear it's hobby, no commercial intent

**Send timing:** Day -1 or -2 (a day or two before the public Reddit
post). If he replies with concerns, you have time to address them.

**Channel:** [FILL IN: contact channel, fett263.com contact form,
his Discord, email if known]. Whichever channel he publicly lists.
If multiple, prefer the one he says is best for tool-related questions.

**What NOT to do:**
- Don't ask for a shoutout, video, blog post, or endorsement
- Don't position KyberStation as "better than" anything he's made
- Don't promise specific features or roadmap items
- Don't cc anyone else on the email
- Don't follow up more than once if he doesn't reply

---

## Variant A: Short, cold open

### Subject
KyberStation, heads-up on a free visual editor that generates configs targeting your prop file

### Body

```
Hi Fett263,

I'm Ken. Long-time user of your prop file and style library, they
genuinely transformed what my saber is capable of, and the documentation
alone has saved me hours.

I built a free, open-source tool called KyberStation: a browser-based
visual blade style editor and ProffieOS config generator. It runs
entirely in the browser, no backend, no accounts. The generated configs
target ProffieOS 7.x with `saber_fett263_buttons.h` as the default prop
file.

I'm planning to share it publicly on r/lightsabers in the next day or
two, and wanted to give you a heads-up first because (a) you're the
natural person to know, and (b) if anything in the generated output
looks wrong from a prop-file perspective, I'd really want to fix it
before the wider community sees it.

Try it: https://kenkoller.github.io/KyberStation/
Code: https://github.com/kenkoller/KyberStation

I've credited your work in the README and the architecture docs. Happy
to adjust how the prop file is referenced if you'd prefer different
language. Not asking for a shoutout or endorsement, just want to make
sure you're aware and that nothing in the output is misrepresenting
your work.

Thank you for everything you contribute to this community.

Ken
```

---

## Variant B: Medium, slightly more detail

### Subject
KyberStation, free visual editor that generates configs for your prop file (heads-up before launch)

### Body

```
Hi Fett263,

I'm Ken. I've been using your prop file and style library on my 89sabers
V3.9 for [time period] and they're foundational to how I think about
what a saber can do. Your documentation alone is in a different league
from anything else in this space.

I'm reaching out because I built a tool I'm about to share publicly,
and I'd be uncomfortable shipping it without giving you a heads-up
first. It's called KyberStation, a free, open-source, browser-based
visual editor for blade styles. It generates ProffieOS config code
that compiles directly with `saber_fett263_buttons.h` selected as the
prop file. AST-based codegen so the output structurally can't have
unbalanced template brackets.

Try it: https://kenkoller.github.io/KyberStation/
Code: https://github.com/kenkoller/KyberStation
License: MIT (KyberStation source). Generated configs go into ProffieOS,
which is GPL-3.0; that relationship is documented in the README and
every generated config has a GPL attribution header.

What I want to make sure is right before the public launch:

1. **Prop file references.** I credit your prop file work in the
   README and the in-app docs. If you'd prefer different language,
   different placement, or a specific phrasing, please tell me and
   I'll update it.

2. **Generated output.** If the generated configs misuse anything from
   your prop file conventions, or emit patterns you'd consider
   incorrect, I'd want to know before users start hitting it. Open to
   feedback at any level, naming, ordering, defaults, anything.

3. **Coordination on prop-file changes.** I want KyberStation to track
   your prop file as it evolves, not lag behind it. If there's a
   reasonable way for me to know when the prop file ships breaking
   changes, I'd appreciate the heads-up so I can adjust the codegen.
   Happy to follow whatever channel works for you.

I'm not asking for a review, endorsement, or shoutout. Genuinely just
want to make sure the relationship is clear and the output is right.
This is a hobby project, my first public release, and there's no
commercial intent, KyberStation is free, MIT-licensed, and runs on
free GitHub Pages hosting that I can keep up indefinitely.

If you have any concerns at all, I'd rather hear them now than after
the post goes live. If you'd prefer I delay the launch a few days to
give you time to look, I can do that.

Thank you for everything. The work you've done changed what this hobby
is for a lot of us.

Ken
```

---

## What to do if Fett263 responds

### If positive ("looks good, share it")
- Thank him briefly
- Don't push for more, let him initiate any further engagement
- Optional: offer to feature his prop file as the default-selected
  option in the UI (if not already), or add a "Compatible with Fett263
  prop file" badge prominently
- **Don't ask for a video / shoutout / mention.** If he wants to share,
  he will.

### If he has concerns
- Take them seriously. Address every concrete one.
- Offer to delay the launch until they're addressed.
- Don't get defensive. He has a deeper context on the prop file than
  you do, by definition.

### If he says don't ship
- Pause the launch.
- Understand exactly what the concern is.
- Adjust until the concern is resolved, even if it means rewriting
  features or removing references to his work.
- This is unlikely but possible. Treat it with respect.

### If he doesn't reply
- Wait 5 days.
- Send the follow-up below, ONCE.
- After that, proceed with the launch. You gave him the heads-up.

### Follow-up (one shot, after 5 days of no reply)

Subject: `Re: [original subject]`

```
Hi Fett263,

Quick bump on this, wanted to make sure it didn't get lost. No reply
needed if everything looks fine. I'm planning to share publicly on
[date] unless I hear concerns.

Try it: https://kenkoller.github.io/KyberStation/

Thanks again for the work you do.

Ken
```
