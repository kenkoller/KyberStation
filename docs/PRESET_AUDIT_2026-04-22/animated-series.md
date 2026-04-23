# Animated Series Preset Audit — 2026-04-22

**Scope**: `packages/presets/src/characters/animated-series.ts`
**Preset count**: 22
**Needing fixes**: 16 (canonical correctness / structural concerns)
**Auditor**: Agent 4 of 7 (animated-series lane)
**Reference period**: Clone Wars Blu-ray, Rebels HD, Bad Batch, Ahsoka (live-action), The Mandalorian/BoBF

---

## Summary

The animated-series file spans four animated-to-live-action sub-lineages: Clone Wars (Ahsoka's greens), Rebels (Kanan/Ezra/Inquisitors/Sabine), live-action Ahsoka (whites/Baylan/Shin/Huyang/Morgan), and The Mandalorian (Din's Darksaber + Grogu). The coverage is reasonable but has three systemic issues:

1. **`rotoscope` style on Cere Junda is canonically wrong** — Cere is a Jedi: Fallen Order/Jedi: Survivor character rendered in a video-game engine, not film. The agent-spec guidance (flag rotoscope on animated presets) applies, but more importantly the Clone Wars/Rebels presets already (correctly) use `stable`. Only one preset (`animated-cere-junda-blue`) uses `rotoscope`, and it should be `stable`.
2. **Morgan Elsbeth's weapon is the Beskar Sword, not a lightsaber.** This preset is canonically incorrect at the concept level — her weapon does not ignite, has no energy blade, and emits no glow. The preset invents a red "Nightsister-forged" blade that has no on-screen basis. Recommend deletion or re-purposing as creative/non-canonical with `screenAccurate: false`.
3. **Darksaber rendering approximation is weak.** `darkCore: true` + `coreColor` are not standard `BladeConfig` fields used by any registered style. The `unstable` style treats these as generic extras and will not render the iconic white-core-with-dark-corona appearance. True Darksaber rendering requires a `gradient` or custom style with spatial color mapping. Both `pre-vizsla-darksaber` and `sabine-wren-darksaber` and `din-djarin-darksaber` are all flagged for this feature-leveraging opportunity.
4. **Ahsoka's white saber is well-served by `photon`.** The current approach (photon + warm clash) is actually the best available approximation; Aurora could be an alternative but photon's particle-stream character maps to the live-action render aesthetic. Kept.
5. **Huyang canonically does not wield a lightsaber in on-screen Star Wars media.** He's a droid saber-architect. Either mark `screenAccurate: false` or delete.
6. **Cal Kestis default is blue, not cyan.** The Jedi: Fallen Order default on first ignition is blue; cyan is an unlock. Current `baseColor: {r:0,g:160,b:255}` is heavily skewed cyan. Marketing/box-art = blue. `screenAccurate: false` is set, so consistent — but the name includes "Blue/Cyan" which is ambiguous. Recommend either split presets or rename to clarify.
7. **Grogu's preset is speculative-canonical** — correctly flagged; lightsaber appearance (green/small) matches the comic/novel continuity and The Mandalorian S3 finale implication but is not fully shown on-screen. Keep as-is.
8. **Several Clone Wars presets using `standard` ignition could benefit from slight stylistic differentiation** — Clone Wars CGI animation presents sabers with almost no ignition animation (instant-on lightfield in nearly every frame). Short `ignitionMs` + `standard` is defensible.

---

## Per-preset audit table

| ID | Canonical? | Style | Ignition | Colors | Key notes / recommended fixes |
|---|---|---|---|---|---|
| `animated-ahsoka-cw-green` | ✅ close | `stable` ✅ | `spark` 300ms ✅ | Green (0,220,40) — good emerald | **Acceptable.** Ahsoka's CW green blade is a warm, slightly yellow-shifted emerald. Color is defensible. `drag` yellow is a creative extra, not canon, but harmless. |
| `animated-ahsoka-cw-shoto` | ✅ close | `stable` ✅ | `standard` 250ms ✅ | Yellow-green (128,235,20) | **Acceptable.** Her shoto is more yellow-green than the primary in Clone Wars Season 3+ episodes. Color feels right. |
| `animated-ahsoka-rebels-white` | ✅ close | `photon` | `summon` + `evaporate` | Cool-white (230,235,255) | **Style justified.** Photon's particle-stream look reasonably represents the "purified white" aesthetic. `summon`/`evaporate` are dramatic and suit her character. *Optional*: slightly warm the base (~240,240,250) to better match on-screen off-white tone rather than blue-white. |
| `animated-pre-vizsla-darksaber` | ⚠ approximation | `unstable` | `wipe` 200ms | White core (245,248,255) + `darkCore: true` + `coreColor` | **Rendering gap.** `darkCore`/`coreColor` are not honored by `unstable` style — no style in the registry ingests these fields. Real Darksaber rendering (white-core + black-purple corona) needs `gradient` style with spatial color params or a custom `darksaber` style addition. Feature-leveraging request: **add Darksaber as a first-class style** or use `gradient` with end-to-end color mapping. |
| `animated-ezra-bridger-blue` | ✅ | `stable` ✅ | `standard` 350ms ✅ | Blue (20,80,255) | **Acceptable.** Ezra's second saber (Atollon-built) is a warm blue. |
| `animated-ezra-bridger-hybrid` | ✅ concept | `stable` | `stutter` 400ms | Blue (30,100,255) | **Acceptable.** `stutter` ignition is a smart nod to the "unstable hybrid weapon" character of his first saber. Screen-accurate color. |
| `animated-kanan-jarrus-blue` | ✅ | `stable` ✅ | `summon` + `fadeout` | Blue (30,100,255) | **Acceptable.** `summon` is a stretch (Kanan has a standard ignition on-screen); `standard` 320ms might be more canonical. Minor. |
| `animated-grand-inquisitor-red` | ✅ close | `unstable` ✅ | `center` 200ms | Red (255,10,0) | **Good choice.** Cracked-kyber red should be `unstable`. Consider bumping `shimmer` (currently 0.35) or adding `noiseLevel` higher to emphasize the instability. Color is vivid — could be slightly deeper maroon (e.g., 240,20,10) to match Rebels Season 1 pilot. |
| `animated-second-sister-red` | ✅ | `stable` | `center` + `center` | Deep red (220,0,10) | **Close.** Lore-wise, all Inquisitors wield cracked kyber → should all be `unstable`, not `stable`. Fallen Order's Second Sister blade flickers with low-frequency instability. **Recommend `unstable` + shimmer 0.25**. |
| `animated-third-sister-reva-red` | ✅ | `unstable` ✅ | `fracture` + `flickerOut` ✅ | Red (255,20,10) | **Excellent.** `fracture` ignition canonically matches the cracked-kyber lore. `flickerOut` retraction is thematic. Keep. |
| `animated-fifth-brother-red` | ⚠ | `fire` ❌ | `center` 260ms | Deep red (200,0,0) | **Style mismatch.** `fire` style is wrong — Fifth Brother's blade is not a flame-lick effect on-screen, just a heavy, deep red with slight flicker. Recommend `unstable` with tuned-down `shimmer` (~0.18) to match the brutish, low-frequency flicker feel. |
| `animated-seventh-sister-red` | ⚠ | `plasma` ❌ | `center` 190ms | Vivid red (240,10,20) | **Style mismatch.** `plasma` with `frequency`/`phaseSpeed` creates moving bands — not what the Seventh Sister's blade looks like on-screen. Recommend `unstable` (cracked-kyber consistency) with low shimmer (~0.15) for her refined/controlled feel. |
| `animated-sabine-wren-darksaber` | ⚠ approximation | `unstable` | `wipe` + `fadeout` | White (240,245,255) + `darkCore`/`coreColor` | Same rendering-gap issue as Pre Vizsla. Needs a true Darksaber style. |
| `animated-sabine-wren-blue` | ✅ | `stable` ✅ | `standard` ✅ | Blue (20,80,255) | **Duplicate of Ezra's config** — which is canonically correct since this IS Ezra's saber. Keep. |
| `animated-cal-kestis-blue` | ⚠ | `stable` ✅ | `spark` 300ms | Cyan-skewed (0,160,255) | **Color concern.** Default Cal Kestis in Fallen Order is blue; cyan is a customization unlock. Name says "Blue/Cyan" — ambiguous. Split into two presets (default blue + cyan unlock) **or** rename to "Cal Kestis (Cyan)" and shift base to a clean blue. `screenAccurate: false` is set — that's honest, since it's a game-cosmetic. |
| `animated-cere-junda-blue` | ⚠ | `rotoscope` ❌ | `scroll` + `scroll` | Blue (40,110,255) | **Style violation per agent brief.** Cere is from a video game (Jedi: Fallen Order/Survivor), not film. `rotoscope` simulates film-frame rendering which doesn't apply. **Change to `stable`.** `scroll` ignition is also an odd pick — Cere's saber on first ignition in Survivor uses a standard-style animation. Recommend `standard`. |
| `animated-baylan-skoll-orange` | ✅ close | `cinder` | `scroll` + `fadeout` | Orange-red (255,90,10) | **Style is creative — justified.** Baylan's blade has an ember/coal quality in the Ahsoka series; `cinder` evokes that. Color is warm but could shift slightly more yellow (e.g., 255,110,20) to match the amber-orange seen on-screen rather than true orange-red. |
| `animated-shin-hati-orange` | ⚠ | `fire` | `scroll` + `scroll` | Orange (255,120,0) | **Style questionable.** `fire` implies literal flame animation. Shin's blade is a clean orange without visible fire-pattern animation. Recommend `stable` (or `cinder` to match her master) with `shimmer` ~0.15. |
| `animated-din-djarin-darksaber` | ⚠ approximation | `unstable` ✅ | `stutter` ✅ | Light gray-white (200,200,210) | **Rendering gap (Darksaber core issue).** `stutter` ignition is a **great** canonical choice — it captures Din's struggle with the blade perfectly. Color is grayer than the Mandalorian/Sabine Darksaber presets, representing his weak connection. Keep stutter; add Darksaber style when available. |
| `animated-ahsoka-liveaction-white` | ✅ | `photon` | `center` + `fadeout` | Warm-neutral white (240,245,255) | **Good.** `photon` captures the live-action "particle energy" aesthetic. Colors are well-tuned. |
| `animated-morgan-elsbeth-red` | ❌ canonically wrong | `ember` | `drip-up` + `unravel` | Red (220,20,20) | **Morgan Elsbeth does NOT wield a lightsaber.** She wields the Beskar Sword — a solid, non-energized Mandalorian weapon. This preset invents a Nightsister-forged red lightsaber that has no on-screen basis. **Recommendation**: delete, OR mark `screenAccurate: false` and rename to something like "Nightsister Blade (Creative)". |
| `animated-huyang` | ⚠ canonically thin | `stable` ✅ | `standard` ✅ | Blue (30,120,255) | **Huyang is a droid saber-architect, not a wielder.** He does not have a personal lightsaber in any on-screen appearance. This preset is `screenAccurate: true`, but should be `false`. Consider deletion or re-framing as "Huyang's Demonstration Saber" (speculative/creative). |
| `animated-grogu` | ✅ speculative-canon | `pulse` | `spark` + `scroll` | Green (0,230,30) | **Acceptable as speculative.** Grogu's lightsaber is implied in Book of Boba Fett / Mando S3 setup but not yet definitively shown. `pulse` style is a cute "training saber" choice. `screenAccurate: true` could be loosened to `false` given it's speculative, but defensible either way. |

---

## Structural patterns

### 1. The rotoscope-vs-stable call
Only **one preset** uses `rotoscope` (`animated-cere-junda-blue`) — and it's a video-game character, which is even further from the "film frame-by-frame rendering" basis that would justify rotoscope. All 21 other presets correctly use non-rotoscope styles. **Single recommended fix: `rotoscope` → `stable` on Cere Junda only.**

### 2. Inquisitor cracked-kyber consistency
Four of six Inquisitor presets (Grand, Reva, Fifth Brother, Seventh Sister, Second Sister) are on the sith/dark-side lineage. Canon: **all Inquisitor sabers use cracked kyber crystals** → all should be `unstable`.

| Inquisitor | Current style | Recommended |
|---|---|---|
| Grand Inquisitor | `unstable` ✅ | Keep |
| Second Sister | `stable` | **Change to `unstable`** |
| Third Sister (Reva) | `unstable` ✅ | Keep |
| Fifth Brother | `fire` | **Change to `unstable`** |
| Seventh Sister | `plasma` | **Change to `unstable`** |

This gives the Inquisitor lineage a coherent visual identity. Differentiation between Inquisitors can come from `shimmer` (Grand 0.35, Reva 0.28, Seventh 0.15, Second 0.18, Fifth 0.15) rather than style-switching.

### 3. Darksaber rendering gap (feature-leveraging)
Three presets (`pre-vizsla`, `sabine-wren-darksaber`, `din-djarin`) all encode `darkCore: true` + `coreColor` as ad-hoc config extras, but **no registered style consumes these fields**. The `unstable` style ignores them. The Darksaber's canonical look (white core, dark-purple/black corona) is currently impossible to render accurately.

**Feature-leveraging recommendation**: Add a first-class `darksaber` style to `packages/engine/src/styles/` that uses spatial gradient to produce a bright center channel plus a dark edge halo. Alternatively, `gradient` style with `startColor`/`endColor` could be used as a stopgap. Track as a post-launch enhancement — the current approximation at least gets the color vocabulary right.

### 4. Ahsoka white approximation: photon is well-chosen
The brief suggested `aurora` as an alternative for Ahsoka's white. After review, `photon` captures the live-action "particle stream/crystalline-light" aesthetic better than `aurora` (which has a flowing-color character). Both white-saber presets (Rebels and live-action Ahsoka) use `photon` — keep.

### 5. Concept errors worth flagging
- **Morgan Elsbeth** wields the Beskar Sword, not a lightsaber (hard canonical error)
- **Huyang** does not wield a lightsaber on-screen (soft canonical error; possibly speculative)
- **Cal Kestis color** — default is blue, cyan is game-unlock (minor labeling issue)
- **Pre-cross-guard Ezra hybrid** in Rebels S1 is blue-green per some takes; currently just blue (minor)

---

## Top 3 issues (ranked by impact)

1. **Morgan Elsbeth preset is conceptually wrong** — she does not have a lightsaber in Star Wars canon. Delete or re-frame as `screenAccurate: false` creative.
2. **Inquisitor style inconsistency** — cracked-kyber lore means all should be `unstable`; currently split across `unstable`/`stable`/`fire`/`plasma`. Unify on `unstable` with `shimmer` used as the differentiator.
3. **Darksaber rendering gap** — three presets encode a color feature (`darkCore`/`coreColor`) that no style consumes. Add a proper Darksaber style or use `gradient` as a stopgap; alternatively document that these extras are no-ops.

---

## Canon sources referenced

- **Clone Wars**: Ahsoka's Season 3+ jar'kai era. Primary green + yellow-green shoto established in Season 5 "Crystal Crisis" arc (lost sabers → built as part of the Jedi Temple trials).
- **Rebels**: Kanan/Ezra/Inquisitor sabers established S1–S4 (2014–2018). Darksaber on-screen in Clone Wars S2E12 "The Mandalore Plot" + Rebels S3E15 "Trials of the Darksaber".
- **Ahsoka (Disney+ 2023)**: Baylan Skoll, Shin Hati, Sabine-blue, Ahsoka-white (live-action), Huyang character, Morgan Elsbeth Beskar Sword.
- **The Mandalorian S2–S3**: Din Djarin's Darksaber struggle, Grogu's implied youngling training.
- **Jedi: Fallen Order / Survivor (games)**: Cal Kestis, Cere Junda, Trilla/Second Sister.

## Uncertainty flags

- Grogu's preset treats "Armorer-built beskar shoto" as canonical. This is not firmly established on-screen as of BoBF/Mando S3 — it's a heavily implied setup. `screenAccurate: true` is defensible but loose.
- Baylan's orange-red vs. pure orange — screens vary by shot. Color is in the acceptable range.
- Cal Kestis "default blue vs. cyan" — `screenAccurate: false` is technically honest since the color is a customization, but the name/description imply cyan is the default. Clarify.
