# Modulation Routing — User Guide Outline

**Status:** Skeleton. First-pass content lands with v1.1 (2026-05-16). Friday v1.0 ships only §1 as a one-page quick-start.
**Companion docs:** [design spec](MODULATION_ROUTING_V1.1.md) · [impl plan](MODULATION_ROUTING_v1.1_IMPL_PLAN.md) · [roadmap](MODULATION_ROUTING_ROADMAP.md).

---

## Guide structure (8 sections)

### §1. Your First Wire — 60-second quick-start

Format: GIF-first tutorial.

**Steps:**
1. Open DESIGN tab
2. See `SWING` plate in LayerStack — has a moving needle when you wave your phone / move mouse in motion sim
3. Click the `SWING` plate (it highlights + arms)
4. Click the `shimmer` knob in the Inspector
5. Wave your phone → shimmer reacts

**Result:** Your blade now responds to swings. That's one wire. Everything else is more of the same.

**Ships Friday v1.0.**

### §2. Ten Recipes to Steal

Each recipe ships as importable Kyber Glyph + wire diagram + one-line description.

| # | Recipe | Wiring | Unlocks |
|---|---|---|---|
| 1 | Reactive Shimmer | `swing → shimmer` | Basic gesture response |
| 2 | Sound-Reactive Music Saber | `sound → baseColor.b` | Music-sync for displays |
| 3 | Breathing Blade *(v1.1+)* | `sin(time * 0.001) * 0.5 + 0.5 → brightness` | Idle ambience |
| 4 | Battery Saver *(v1.1+)* | `clamp(1 - battery, 0, 0.5) → brightness` | Power-saver blade |
| 5 | Tip-Bright-When-Up | `max(0, angle) → baseColor.r` | Directional glow |
| 6 | Speed-Gated Accent *(v1.2+)* | conditional `swing > 0.5` triggers color shift | Combat mode |
| 7 | Twist-Drives-Hue | `twist → colorHueShiftSpeed` | Wrist control |
| 8 | Clash-to-White-Flash *(v1.1+)* | `clash → lerp(baseColor, white, clash)` | Dueling flash |
| 9 | Heartbeat Pulse *(v1.1+)* | `abs(sin(time * 0.002)) → brightness` | Organic pulse |
| 10 | Idle Hue Drift *(v1.1+)* | slow time-LFO on base hue when `swing < 0.1` | Ambient drift |

Recipes marked v1.1+ require math formula support (peggy parser). Friday v1.0 ships 5 simpler recipes.

### §3. The 11 Modulators Illustrated

For each modulator, a short clip showing the physical gesture + value plot:

| ID | Gesture | Value range | Smoothing |
|---|---|---|---|
| `swing` | Phone shake / mouse shake | 0..1 | 0.35 |
| `angle` | Tilt up/down | -1..1 | 0.20 |
| `twist` | Wrist rotate | -1..1 | 0.20 |
| `sound` | Speak / sing into mic | 0..1 | 0.50 |
| `battery` | Charge state (static) | 0..1 | 0 |
| `time` | Sweeping clock hand | 0..2³² ms | 0 |
| `clash` | Impact + decay curve | 0..1 | decay-only |
| `lockup` | Button held flag | 0 or 1 | 0 |
| `preon` | Pre-ignition progress | 0..1 | 0 |
| `ignition` | Ignition progress | 0..1 | 0 |
| `retraction` | Retraction progress | 0..1 | 0 |

Users need a mental model for what `swing` actually *is* before routing it.

### §4. Combinator Cookbook

Visual side-by-side — same binding (`swing → shimmer`, amount 50%) rendered five ways:

| Combinator | Formula | Feel |
|---|---|---|
| Replace | `shimmer = swing` | Full takeover |
| Add | `shimmer = 0.3 + swing * 0.5` | Additive contribution |
| Multiply | `shimmer = 0.3 * swing` | Gating |
| Min | `shimmer = min(0.3, swing)` | Ceiling |
| Max | `shimmer = max(0.3, swing)` | Floor |

Most users have no intuition for which to pick. This guide builds that intuition.

### §5. Expression Language Reference *(v1.1+)*

Compact reference for power users.

**Variables:** 11 modulator IDs.
**Functions:** `min`, `max`, `clamp`, `lerp`, `sin`, `cos`, `abs`, `floor`, `ceil`, `round`.
**Operators:** `+` `-` `*` `/` `(` `)` `-` (unary).
**v1.2 adds:** `if(cond, a, b)`, `config.*` references.

### §6. Patterns from Film and Lore

Reverse-engineer canon sabers as modulation recipes. Canon as curriculum.

| Canon | Technique | Modulation recipe |
|---|---|---|
| Kylo's unstable crackle | Fast random + clash-chain | `swing * 0.5 + noise(time * 20) * 0.5 → saturation` |
| Maul's dueling flicker | Swing-reactive saturation | `swing → colorSaturation` |
| Anakin's Mustafar burn-in | Slow time-LFO on red-shift | `sin(time * 0.0005) → baseColor.r` |
| Qui-Gon's calm blade | Minimal, subtle breathing | `sin(time * 0.0005) * 0.15 + 0.85 → brightness` |
| Ahsoka's white precision | Sharp envelope on swing | `swing^2 → shimmer` |

### §7. Troubleshooting

Named failure modes people can search for.

| Symptom | Cause | Fix |
|---|---|---|
| Binding isn't doing anything | Amount at 0 | Raise amount > 0 |
| Binding isn't doing anything | Bypass toggled on | Click bypass off |
| Wire won't drop on a field | Target is enum, not numeric | Enums can't be modulated — use button routing |
| Values look wrong | Combinator is Min and value can't go lower | Switch to Add or Multiply |
| Flash dialog says "can't map" | Binding uses v1.2+ feature | Use snapshot-value fallback or remove |
| Sharing a glyph lost modulation | Recipient on older KyberStation | Ask them to update to v1.1+ |

### §8. Sharing Your Creation

- Kyber Glyph v2 carries modulation (v1.1+)
- Community Gallery via GitHub PR — see [`COMMUNITY_GALLERY.md`](COMMUNITY_GALLERY.md)
- Crediting derivative work — imported glyphs show original author + modifier chain

---

## In-app supplements beyond the written guide

- **Coach marks on first use** — non-blocking balloon pointing at amount slider: *"Scrub this to go from subtle to dramatic."* Once, then gone forever.
- **Remix button on every shared glyph** — import → see wire diagram → tweak → re-share. This is what made the Ableton / Vital / Serum communities grow.
- **In-app starter-preset gallery** — 20+ presets each showcasing one pattern. Users learn by reading other people's patches.
- **Expression-editor autocomplete** — typing `sw` suggests `swing`; typing `cla` suggests `clamp` + `clash`; typing `sin(` suggests the function signature.

---

## Content priority for v1.0 / v1.1 / v1.2

| Section | Ships in |
|---|---|
| §1 Your First Wire | v1.0 Friday |
| §2 Recipes 1, 2, 5, 7 + one simple custom | v1.0 Friday |
| §2 Recipes 3, 4, 8, 9, 10 | v1.1 |
| §2 Recipe 6 | v1.2 |
| §3 Modulators Illustrated | v1.1 |
| §4 Combinator Cookbook | v1.1 |
| §5 Expression Reference | v1.1 |
| §6 Patterns from Film | v1.2 |
| §7 Troubleshooting | v1.1 (seed), expands with real user feedback |
| §8 Sharing | v1.1 (depends on glyph v2 session) |

---

_Content stub. Each section fleshed out alongside corresponding implementation wave._
