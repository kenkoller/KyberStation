# Sharing Your Creation

> **BETA** — v1.0 ships Kyber Glyph v1 (the share-link format) which **does not** carry modulation. Modulation round-trip lands with [Glyph v2 in v1.1 Routing Core](../../MODULATION_ROUTING_ROADMAP.md). This page describes the path forward; the actual sharing for modulation patches is mostly a v1.1 thing.

---

The fastest way to grow as a saber designer is to copy other people's patches, then mutate them. KyberStation has two paths for sharing what you build: a one-way share link (Kyber Glyph) and a curated community gallery (GitHub PR).

## Kyber Glyph

A Kyber Glyph is a short URL-safe string that encodes everything about your saber — colors, style, ignition, retraction, effects, and (in v1.1+) modulation bindings. Send it in a Discord message, paste it in a Reddit thread, print it on a sticker; whoever loads the URL sees your exact patch.

### How to share today (v1.0)

1. Open your saber in the editor.
2. Click **Save Share Card** in the Crystal panel.
3. The PNG includes a scannable QR code and the glyph text in a corner.
4. Share the image, or copy the `?s=<glyph>` URL from the share button.

### What v1.0 captures vs. what v1.1 will capture

| What | v1.0 (Glyph v1) | v1.1 (Glyph v2) |
|---|---|---|
| Static color, style, ignition/retraction | Yes | Yes |
| Effects (clash, blast, lockup, etc.) | Yes | Yes |
| Modulation bindings | **No** | Yes |
| Math expressions | **No** | Yes |
| Custom modulators | **No** | Yes |

If you ship a glyph with modulation today, recipients will see the *static-config* part round-trip correctly, but their blade won't have the wires. The patch's reactive behavior is in the part v1 can't carry.

### Workaround until v1.1 lands

Send a screenshot of your binding list alongside the glyph. It's clunky, but it's how the early modulation community will swap patches before v1.1 ships. Roughly 3 weeks post-launch per the [roadmap](../../MODULATION_ROUTING_ROADMAP.md).

## Community Gallery

A curated collection of patches lives in the KyberStation repo at [`packages/presets/src/characters/community/`](../../../packages/presets/src/characters/community/). Anyone can submit one via GitHub PR. Once merged, the preset shows up in the in-app gallery for everyone — no backend account, no moderation queue, just code review.

How it works:

1. Build the patch in the editor.
2. Export the config (Output tab → Copy).
3. Open a PR adding a new preset file under `community/`. Fill out the metadata (your name, what the patch does, what gestures it responds to).
4. PR review by the maintainer + a couple of community reviewers. Mostly looking for: does it run, does the description match, is attribution clear.
5. On merge, the preset ships in the next release.

See [`COMMUNITY_GALLERY.md`](../../COMMUNITY_GALLERY.md) for the full submission guide and metadata template.

This is the **only** way to make your patch part of the in-app starter library. The Kyber Glyph route is for sharing one-off creations directly with friends; the Community Gallery is for patches you want to live in the app.

## Crediting derivative work

Modulation patches are remixable by design. If you load somebody else's glyph, tweak the wiring, and re-share — please credit the original author.

The remix flow (planned for v1.1):

1. Loading a glyph that came from a community-gallery preset captures the original author's name automatically.
2. When you re-share, your name gets appended to the chain: `Original: @kenkoller → Remix: @you`.
3. The Crystal Share Card shows the chain in the metadata block.

Until v1.1 ships, just include a "based on @author's [recipe name]" line in your description. The hobby is built on people sharing what they figure out — give credit, expect to receive it.

## What to share

Patches that travel well:

- **Distinct character signatures** — Kylo's crackle, Maul's flicker, your own custom canon. See [Canon Patterns](./canon-patterns.md).
- **Practical utilities** — battery-saver, sound-reactive music modes, dueling polish.
- **Show-off pieces** — purely aesthetic patches that look incredible on a static stand.

Patches that don't:

- Anything tightly coupled to your specific hardware (custom modulators not in the registry, board-specific settings).
- Anything that requires a specific sound font you haven't shipped alongside.
- Patches that depend on v1.2+ features when shared with a v1.0 user.

## Be honest about what works

Pre-launch, modulation is BETA. The hardware-flash story is snapshot-at-export — meaning patches *look* live in the editor, but the flashed saber freezes the binding values at export time. Real live AST injection on hardware lands with v1.1.

If you share a patch, mention which version it was built against. If it relies on `time` LFOs or expression math, say so — those won't carry through Glyph v1 today, and won't run live on hardware until v1.1.

Honest README beats clever trickery. Share what works, name what doesn't, and the community will be better for it.
