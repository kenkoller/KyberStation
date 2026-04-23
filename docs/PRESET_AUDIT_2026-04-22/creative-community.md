# Creative Community Preset Audit — 2026-04-22

**Scope**: 96 non-canonical creative presets in `packages/presets/src/characters/creative-community.ts`. Criteria: quality, internal consistency, feature-leveraging.

## Summary
- Total: **96**
- High-quality, no changes needed: **~55**
- Quality issues flagged: **6**
- Internal consistency issues: **11**
- Feature-leveraging opportunities: **14** (high-impact)

The file falls in two bands. The "NEW STYLES SHOWCASE" and "WILD & CRAZY" sections (roughly the second half) deliberately exercise new engine styles (tidal, nebula, mirage, vortex, torrent, cascade, helix, automata, candle, shatter, neutron, moire, gravity, ember, dataStream) plus new ignition/retraction animations (drip-up, crackle, seismic, summon, hyperspace, flash-fill, fracture, pulse-wave, spaghettify, evaporate, implode, dissolve, unravel, flickerOut, drain). These are in excellent shape — the author clearly built them against the new engine.

The older sections ("IN-UNIVERSE DEEP CUTS" through "COMMUNITY CLASSICS", presets 1–46 roughly) were authored before many of those styles shipped, and this is where nearly every feature-leveraging opportunity lives.

---

## Quality Issues

### `creative-darksaber-deep` — Darksaber (Crackling)
**Issue**: `baseColor {r:10, g:10, b:10}` is effectively off — at that RGB the LED is barely emitting. The "jet-black core with a crackling white edge" concept is the *visual* goal, but a 10/10/10 base produces a nearly invisible blade with `unstable` shimmer as the only thing to see. The canonical Darksaber in ProffieOS uses a dark base with a visible white outline/fringe; a pure black base is not how it reads on a Neopixel.
**Recommendation**: Bump base to `{r:25, g:25, b:35}` (still near-black but visibly present) or keep black and switch style to `imageScroll`/`photon` with a high white shimmer so the blade has energy to show. Alternatively: `baseColor {r:40, g:40, b:60}`, `clashColor` unchanged — the slight blue tint sells the "dark energy" read better than pure grey.

### `creative-dark-mode` — Dark Mode
**Issue**: `baseColor {r:15, g:15, b:20}` plus `shimmer 0.05` produces an essentially invisible blade. This is intentional comedy ("your eyes are sensitive") but the joke lands harder if the blade is actually *visible enough to register* before clash blows it out. Right now it reads as "off".
**Recommendation**: `baseColor {r:30, g:30, b:40}`, keep shimmer low. The joke survives; the blade becomes faintly visible, which is what "dark mode" actually looks like on a monitor.

### `creative-forbidden-saber` — The Forbidden Saber
**Issue**: `baseColor {r:0, g:0, b:0}` is literally off. The description says "inverted colors, maximum instability" but with a true-black base, `unstable` style has nothing to modulate. The LEDs are dark until clash/lockup/blast.
**Recommendation**: `baseColor {r:40, g:0, b:40}` (deep forbidden magenta) so unstable has substrate to corrupt. Keeps the "nothing good comes from this" read while producing a visible blade.

### `creative-pixel-miner` — Pixel Miner
**Issue**: `lockupColor {r:150, g:150, b:150}` (dead grey) is indistinguishable from the `clashColor {r:150, g:150, b:150}` — same grey — so lockup vs clash read identical. Dead grey is also the lowest-quality color on Neopixels (murky, no saturation).
**Recommendation**: `lockupColor {r:100, g:200, b:255}` (diamond-sky blue) and `clashColor {r:255, g:255, b:255}` (pickaxe spark white). Gives the "mining" theme distinct visual identity per trigger.

### `creative-everything-everywhere` — Everything Bagel
**Issue**: Hero color `{r:128, g:0, b:255}` is fine, but this preset claims "all styles, all colors, all at once" while using `vortex` — a single style. The gap between description and reality is bigger than any other preset in the file.
**Recommendation**: Either rewrite description to match what vortex actually does, OR escalate the visual: `shimmer 1.0` (currently 0.85), and consider switching to `prism` with `facets: 16, rotationSpeed: 4.0` — prism genuinely splits into every hue in a way vortex does not. The vortex-as-multiverse-collapse framing only works if you commit to the visual spin.

### `creative-saber-goes-brrr` — Saber Goes Brrr
**Issue**: `clashColor {r:0, g:255, b:0}` is identical saturation-channel to `baseColor {r:0, g:200, b:0}` — a 55-unit green bump on the same channel. Clash is nearly invisible because base is already saturated green.
**Recommendation**: `clashColor {r:255, g:255, b:100}` (money-green-to-dollar-yellow) — reads as "cha-ching" and provides actual contrast.

---

## Internal Consistency Issues

### `creative-temple-sentinel` — Temple Sentinel
**Description says**: "solemn, steady pulse"
**Config says**: `style: 'rotoscope'`
**Recommendation**: Rotoscope is a flickering film-grain style — the opposite of "steady pulse". Switch to `style: 'pulse'` with `shimmer: 0.1`. "Steady" in the description becomes literally true.

### `creative-lightning-storm` — Lightning Storm
**Description says**: "extreme instability creating constant crackling"
**Config says**: `ignition: 'spark'` (sparks, not crackle)
**Recommendation**: `ignition: 'crackle'` or `'fracture'`. Both exist and match the description. Spark is a different animation (bottom-up sparks, not continuous crackle).

### `creative-nebula` — Nebula
**Description says**: "Slow rotational drift" (the Cosmos preset)
**Config says**: `style: 'aurora'`
**Recommendation**: `style: 'nebula'` exists in the engine — this preset is literally called Nebula and should use it. Aurora is for northern-lights bands; nebula gives the rotational cloud dynamics described.

### `creative-fire-and-ice` — Fire & Ice
**Description says**: "Red base fading to blue at the tip"
**Config says**: `style: 'gradient'` — correct, but `ignition: 'center'` / `retraction: 'center'` are wrong for a blade gradient. Center blooms outward, which obscures the fade.
**Recommendation**: `ignition: 'scroll'` or `'wipe'` and `retraction: 'fadeout'` so the gradient reads tip-to-hilt as described.

### `creative-aurora-borealis` — Aurora Borealis (already uses aurora ✓)
No issue — flagging the well-matched baseline for reference.

### `creative-heartbeat` — Heartbeat
**Description says**: "pulses like a heartbeat — slow, rhythmic"
**Config says**: `shimmer: 0.05` — shimmer controls flicker intensity, but heartbeat rhythm comes from `pulseSpeed: 0.6` which is correct. The `ignition: 'stutter'` is inconsistent — heartbeat doesn't stutter into existence; it starts beating.
**Recommendation**: `ignition: 'standard'` or `'drip-up'` — drip-up is the "building up to the first beat" animation and fits the theme.

### `creative-ghostblade` — Ghostblade
**Description says**: "Clash triggers a bright spectral flash that fades fast"
**Config says**: `retraction: 'fadeout'` at `2000ms` — the retraction is slow, not fast. The description is about *clash* fading fast, which is fine, but a spectral ghost blade using vanilla `pulse` style misses `GhostEchoEffect` which literally exists in the engine.
**Recommendation**: Keep pulse; add note in config that `GhostEchoEffect` on blast would transform this preset (see Feature-Leveraging section).

### `creative-neon-noir` — Neon Noir
**Description says**: "Clash inverts the gradient"
**Config says**: No mechanism actually inverts anything — it's a plain gradient with a contrasting clashColor. This is fine as a fib in a flavor description, but the engine has an `InvertEffect` that would literally do this.
**Recommendation**: Note for future "effects array" support on presets — currently presets can't bind effects beyond clash/lockup/blast/drag. This is a flag for the v1.1 modulation-routing work, not a today-fix.

### `creative-digital-rain` — Digital Rain
**Description says**: "Cascading green aurora-wave down the blade like falling code"
**Config says**: `style: 'aurora'` — reasonable, but the engine has `cascade` (for falling-code-like vertical bands) AND `dataStream` (for literal streaming packets). Aurora is horizontal bands.
**Recommendation**: `style: 'dataStream'` or `'cascade'`. Both match "falling code" far better than aurora's horizontal drift. `dataStream` is the stronger match — literal traveling data packets.

### `creative-quantum-flux` — Quantum Flux
**Description says**: "spinning wildly"
**Config says**: `shimmer: 0.15` — low shimmer doesn't match "spinning wildly"; ignition is 200ms which is fine, but the visual intensity is dialed back compared to the copy.
**Recommendation**: `shimmer: 0.5` — matches the wild-spinning read.

### `creative-perpetual-motion` — Perpetual Motion
**Description says**: "Twin white-gold helices spiral endlessly"
**Config says**: `style: 'helix'` ✓, but `shimmer: 0.15` is very low for "spiral endlessly" — the motion reads as static.
**Recommendation**: `shimmer: 0.25-0.3` to keep the helix visibly in motion.

---

## Feature-Leveraging Opportunities (high-impact)

### `creative-darksaber-deep` — Darksaber (Crackling)
**Current**: `style: 'unstable'`
**Suggested**: `style: 'unstable'` + add a comment that `BifurcateEffect` on clash would match the "energy splitting" darksaber aesthetic perfectly. Once preset effect-binding ships (v1.1), this is a top candidate.
**Why**: The Darksaber visually has warm/cool split-color energy on contact in the animated shows. BifurcateEffect is built for exactly this.

### `creative-kyber-bleeding` — Kyber Bleeding
**Current**: `style: 'gradient'`
**Suggested**: `style: 'gradient'` is fine for the color transition, but consider `ignition: 'fracture'` or `'crackle'` instead of `'stutter'` — the "fall made visible" theme is about *cracking open*, not stuttering.
**Why**: Matches the corruption metaphor; the crystal is breaking under dark-side pressure. Use `FractureIgnition` explicitly.

### `creative-sparkle-blade` — Sparkle Blade
**Current**: `style: 'prism'`
**Suggested**: `style: 'crystalShatter'` with high shimmer
**Why**: "Crystal glitter" and "maximum prismatic shimmer" literally describe CrystalShatterStyle. Prism is for geometric facet rotation; crystalShatter gives the independent shard twinkle the description evokes.

### `creative-starfield` — Starfield
**Current**: `style: 'crystalShatter'` ✓
**Suggested**: Already correct — flagging as a *model example* of how the crystalShatter style should be used (white base, distinct shards, matching description). No change needed.

### `creative-kryptonite` — Kryptonite
**Current**: `style: 'unstable'` ✓
**Suggested**: Add `ignition: 'fracture'` instead of `'spark'` and consider bumping shimmer to `0.7` for "actively dangerous to hold"
**Why**: Fracture ignition delivers the cracking-radiation-leak read. Spark is too tame for the "toxic" tone.

### `creative-solar-flare` — Solar Flare
**Current**: `style: 'fire'` ✓
**Suggested**: Consider `torrent` style (surging upward flame) which the engine supports. Fire is flickering hearth; torrent is rising inferno.
**Why**: "Solar prominence dynamics" is a surge, not a flicker. TorrentStyle matches the upward-rush feel.

### `creative-abyssal` — Abyssal
**Current**: `style: 'pulse'`
**Suggested**: `style: 'tidal'` or `'nebula'` — both exist, both fit "deep ocean" better than pulse.
**Why**: Tidal gives deep-current flow; nebula gives bioluminescent pulse clouds. Pulse is generic brightness modulation and misses the water-specific behavior.

### `creative-permafrost` — Permafrost
**Current**: `style: 'crystalShatter'` ✓
**Suggested**: Already well-matched. Consider `ignition: 'fracture'` instead of `'wipe'` for the "ice cracking" read.
**Why**: Fracture literally radiates cracks — that's what the description is painting. Cheap upgrade.

### `creative-protosaber` — Protosaber
**Current**: `style: 'cinder'` ✓
**Suggested**: Already solid. Consider `style: 'candle'` for the "vintage vacuum tube filament" read — candle's fbm flicker + gust events is a closer match to "filament glow" than cinder's rising particles.
**Why**: Protosabers (EU concept) were bulky and warm-glowing like a lantern, not ember-trailing. Candle nails the filament warmth.

### `creative-magma-core` — Magma Core
**Current**: `style: 'cinder'`
**Suggested**: Strongly consider `style: 'ember'` — "rising ember particles" is literally in the description and `EmberStyle` exists.
**Why**: Description says "rising ember particles" verbatim. EmberStyle is the feature-matched pick.

### `creative-404-not-found` — 404 Saber Not Found
**Current**: `style: 'crystalShatter'`
**Suggested**: `style: 'automata'` — Rule 30 cellular automaton produces literal "pixelated blocks, glitch artifacts, random color tearing". CrystalShatter is geometric; automata is digital noise.
**Why**: Perfectly matches "digital corruption made physical". The engine has AutomataStyle specifically for this aesthetic.

### `creative-dark-energy` — Dark Energy
**Current**: `style: 'plasma'` ✓ (good)
**Suggested**: Consider `NebulaStyle` for "chain lightning lockup" — the description mentions chain lightning but plasma's chromatic swirl doesn't produce lightning. LightningEffect exists at the effect layer, not the style layer.
**Why**: Keep plasma for the surface; flag for v1.1 effect-binding — LightningEffect on lockup would deliver the chain-lightning read.

### `creative-sith-alchemy` — Sith Alchemy
**Current**: `style: 'plasma'` ✓
**Suggested**: Already strong. Consider `ignition: 'summon'` — "ancient dark-side forge blade" evokes ritual summoning.
**Why**: SummonIgnition has the ceremonial slow-build animation that matches "never meant to exist". Stronger read than glitch.

### `creative-ghostblade` — Ghostblade
**Current**: `style: 'pulse'`
**Suggested**: `style: 'nebula'` (pulse clouds) or `style: 'mirage'` (heat-shimmer invisibility) for the "barely visible, hauntingly beautiful" read.
**Why**: Pulse is too literal. Mirage specifically does the "is it there or not" shimmer the description is grasping for.

---

## Structural Observations

- **The engine has 29 styles; the file uses 22 of them.** Unused: `imageScroll`, `painted`, `photon` (used heavily), `rotoscope` (only 2 uses). Styles with underutilization where the theme would benefit: `ember` (1 use), `candle` (3 uses but good fits), `tidal` (2 uses).
- **Sections 1-4 (presets 1-46, "IN-UNIVERSE" through "COMMUNITY CLASSICS") were authored before the 22-style engine existed.** This is where 100% of the feature-leveraging opportunities live. The file has a clear chronological gradient: older presets default to 6-7 classic styles (stable/unstable/pulse/gradient/fire/plasma/prism), newer presets (sections 5-7) exercise the full modern style palette.
- **The "NEW STYLES SHOWCASE" section is exemplary** — it was clearly authored as a style-showcase catalog, with each preset intentionally pairing a new style with a matched ignition/retraction. Presets like `creative-wildfire`, `creative-glacier`, `creative-frostbane`, `creative-cozy-fireplace`, `creative-astral-projection`, `creative-tectonic` are textbook feature-leveraging.
- **Very low adoption of non-standard ignitions in sections 1-4**: 41/46 presets use only standard/scroll/center/spark/wipe/stutter/glitch/shatter/fadeout. Zero uses of fracture, crackle, flash-fill, pulse-wave, drip-up, hyperspace, summon, seismic among the old presets. All the new-engine ignitions are locked inside the "NEW STYLES SHOWCASE" and "WILD & CRAZY" sections.
- **Crystal/shatter-themed presets with feature-leveraging gaps**: `creative-sparkle-blade` uses `prism` instead of `crystalShatter`; `creative-404-not-found` uses `crystalShatter` but the description wants `automata`. Four of six crystal/ice-themed presets get this right; two miss.
- **Fire/ember-themed pattern**: `creative-magma-core` describes "rising ember particles" but uses `cinder`, not `ember`. `creative-solar-flare` describes "solar prominence dynamics" (surge) but uses `fire` (flicker). Both are close but a tier below the matched style.
- **Aurora/nebula overlap**: `creative-digital-rain` uses `aurora` for falling code; `creative-nebula` uses `aurora` for rotational cosmic drift; `creative-bioluminescence` correctly uses `nebula`. The newer-authored presets disambiguate; the older ones over-rely on aurora as a generic "flowing color" fallback.
- **Shimmer-to-description mismatches are rare** — when authors wrote "extreme instability" or "maximum shimmer", they dialed shimmer to 0.7–1.0. The one notable exception is `creative-quantum-flux` (0.15 shimmer for "spinning wildly").
- **Only 3 presets use pure black/near-black bases** (`darksaber-deep`, `dark-mode`, `forbidden-saber`). All three appear in the Quality Issues list — a consistent pattern: pure black doesn't read on Neopixels, even when it's a thematic choice.

---

## No-Change Sample (quick wins confirmed)

Ten presets that are already excellent — internal consistency, feature-leverage, and quality all on-point. Use these as reference when evaluating fix PRs:

- `creative-wildfire` — ember + crackle + evaporate, textbook
- `creative-glacier` — cascade + fracture + dissolve, textbook
- `creative-sandstorm` — mirage + seismic + dissolve, textbook
- `creative-bioluminescence` — nebula + summon + flickerOut, textbook
- `creative-warp-core` — helix + hyperspace + implode, textbook
- `creative-singularity` — vortex + summon + spaghettify, textbook
- `creative-dragonfire` — candle + crackle + evaporate, textbook
- `creative-frostbane` — shatter + fracture + implode, textbook
- `creative-astral-projection` — neutron + summon + flickerOut, textbook
- `creative-cozy-fireplace` — candle + drip-up + flickerOut, textbook

Two tongue-in-cheek presets that land perfectly despite (or because of) their absurdity:
- `creative-absolute-zero` — disciplined restraint; shimmer 0.0, cascade, summon, implode all pulling in one direction
- `creative-supernova` — 50ms flash-fill + 1500ms spaghettify with shimmer 1.0 and a white→violet color arc; pure stellar-collapse storytelling through config
