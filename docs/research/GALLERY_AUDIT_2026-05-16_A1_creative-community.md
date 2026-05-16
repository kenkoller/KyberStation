# Gallery Audit — creative-community.ts — Agent A1

**Date:** 2026-05-16
**Scope:** 114 presets in `packages/presets/src/characters/creative-community.ts`
**Auditor:** A1
**Context:** Post-v0.22.0 quality lift. Voice anchor: `Obi-Wan Kenobi (ANH)`.

## Summary

- Total presets audited: 114
- PASS: 20
- FLAG: 94

The dominant FLAG reason is **missing `hiltNotes`** — only the post-2026-04-29 "Kinetic Expansion" + "Canonical Character Kinetic Interpretations" sections (~17 presets) consistently include hiltNotes. If hiltNotes is treated as a hard requirement, virtually every preset before line ~2392 fails on that axis alone, hence the high FLAG count.

If hiltNotes were treated as legitimately optional for non-character creative presets, the real description/style/color quality bar lands closer to ~75 PASS / ~39 FLAG. The "Wild & Crazy" cluster (lines 1830–2400) is uniformly excellent — those descriptions exceed the Obi-Wan (ANH) voice anchor in personality and sensory specificity. The IN-UNIVERSE DEEP CUTS section is also strong on description but blank on hiltNotes. The middle "Custom" cluster (lines 982–1207, 10 presets with `character: 'Custom'`) is the weakest band — short descriptions, generic character archetypes, occasional duplicate concepts.

## Systemic issues found

1. **hiltNotes is missing on ~78% of presets.** All entries from `creative-temple-sentinel` through `creative-lava-lamp` (lines 13–2385) omit `hiltNotes` except for `creative-temple-sentinel`, `creative-darksaber-deep`, `creative-palpatine-speculative`, `creative-obiwan-force-ghost`, and `creative-morgan-elsbeth-nightsister`. Only the post-2026-04-29 "Kinetic Expansion" + "Canonical Character Kinetic Interpretations" sections (last ~14 presets) consistently include hiltNotes. Recommend either backfilling, or making it explicit in the type schema that hiltNotes is intentionally optional for non-character creative presets.

2. **`screenAccurate` flag inconsistent on canonical-character interpretations.** All 7 canonical character "kinetic interpretation" presets (`creative-aayla-secura-tidal`, `creative-plo-koon-vortex`, `creative-kit-fisto-torrent`, `creative-yoda-helix`, `creative-vader-vortex`, `creative-rey-tidal-yellow`, `creative-ahsoka-helix`) correctly set `screenAccurate: false`. Good. But several earlier presets riff on canonical concepts (`creative-binary-sunset` is explicitly Tatooine/Luke-coded, `creative-temple-sentinel` is canon Jedi Temple Guards) without the flag — though these are reasonable since they're concept-level not character-level. Minor cleanup, not a bug.

3. **`era: 'expanded-universe'` over-applied to non-Star-Wars concepts.** A large chunk of pop-culture, novelty, and abstract presets use `era: 'expanded-universe'` (e.g., `creative-baguette-blade`, `creative-rgb-gamer`, `creative-companion-cube`, `creative-windows-xp`). EU traditionally means Legends Star Wars material. These should arguably be `era: 'modern'` or a new `era: 'non-canon'` value, but if the schema doesn't have a better slot, this is a forced choice rather than drift. Calling it out for backlog rather than per-preset FLAG.

4. **Several descriptions are genuinely short stubs.** Roughly 18 presets have descriptions under 100 chars that just paraphrase the name without sensory texture (`creative-baguette-blade`, `creative-companion-cube`, `creative-pixel-miner`, `creative-quantum-flux`, `creative-ghost-signal`, `creative-power-grayskull`, etc.). Flagged individually below.

5. **`character` field as filler text on "Custom" presets.** Five presets in the middle cluster (`creative-quantum-flux`, `creative-nebula-core`, `creative-ghost-signal`, `creative-thermal-detonator`, `creative-tidal-wave`, `creative-heartbeat`, `creative-starfield`, `creative-molten-core`, `creative-retro-crt`) use `character: 'Custom'` — uninformative. The later additions correctly use evocative archetypes (`Wave-Caller`, `Sith Acolyte`, `Time-Keeper`). Minor metadata polish opportunity.

## Per-preset findings

### creative-temple-sentinel: Temple Sentinel
- Status: PASS

### creative-darksaber-deep: Crackling Black Blade
- Status: PASS — exemplary description with cross-reference to canonical Darksaber path

### creative-kyber-bleeding: Kyber Bleeding
- Status: FLAG: missing hiltNotes

### creative-purification: Crystal Purification
- Status: FLAG: missing hiltNotes

### creative-sith-alchemy: Sith Alchemy
- Status: FLAG: missing hiltNotes; `ignition: 'summon'` not in the standard 19-ignition set documented in CLAUDE.md (may be valid via newer Visualizer Phase ignition family — verify against `packages/engine/src/ignition/` index)

### creative-first-lightsaber: First Lightsaber
- Status: FLAG: missing hiltNotes

### creative-beskar-reflection: Beskar Reflection
- Status: FLAG: missing hiltNotes

### creative-baguette-blade: Baguette Blade
- Status: FLAG: missing hiltNotes; description acceptable but ignitionMs 1000 + retractionMs 800 is unusually slow for a novelty preset — intentional "rising dough" theme works but consider lowering

### creative-rgb-gamer: RGB Gamer
- Status: FLAG: missing hiltNotes; base/clash/lockup are pure 100% saturation primaries which will look harsh on real LEDs — slight desaturation would improve photographic fidelity

### creative-battery-anxiety: Battery Anxiety
- Status: FLAG: missing hiltNotes; retractionMs 3000 is on the high end but justified by "long sad fadeout" — accept as intentional

### creative-disco-inferno: Disco Inferno
- Status: FLAG: missing hiltNotes

### creative-rave-saber: Rave Saber
- Status: FLAG: missing hiltNotes; description is exactly the minimum length (~74 chars) and reads like a stub

### creative-gender-reveal: Gender Reveal
- Status: FLAG: missing hiltNotes

### creative-404-not-found: 404 Saber Not Found
- Status: FLAG: missing hiltNotes

### creative-christmas: Christmas Classic
- Status: FLAG: missing hiltNotes; description is ~95 chars but reads as stub-ish ("Festive and aggressive" is the only sensory note)

### creative-spooky-season: Spooky Season
- Status: FLAG: missing hiltNotes

### creative-energy-sword: Energy Sword
- Status: FLAG: missing hiltNotes; very close to "Halo Energy Sword" canonical depiction — consider Halo trademark concerns or rename ambiguity (currently named generically, which is good)

### creative-dragon-glass: Dragon Glass
- Status: FLAG: missing hiltNotes; reads as GoT obsidian reference but stays just generic enough — acceptable

### creative-protosaber: Protosaber
- Status: FLAG: missing hiltNotes; description quality is high. `era: 'expanded-universe'` is correct here — protosaber is actual Legends content

### creative-grid-runner: Grid Runner
- Status: FLAG: missing hiltNotes

### creative-digital-rain: Digital Rain
- Status: FLAG: missing hiltNotes; description is only ~106 chars — could use sensory detail beyond the spoon joke

### creative-neon-noir: Neon Noir
- Status: FLAG: missing hiltNotes

### creative-dark-energy: Dark Energy
- Status: FLAG: missing hiltNotes; `affiliation: 'sith'` for a generic dark fantasy concept is a stretch — consider `'other'` since this isn't Star Wars Sith content

### creative-power-grayskull: Power of Grayskull
- Status: FLAG: missing hiltNotes; description ~63 chars — too short. He-Man's sword is iconic and could carry "When this sword glows, you have the power" callout

### creative-companion-cube: Companion Cube
- Status: FLAG: description ~62 chars stub ("Orange blade, blue clash. The cake is a lie but the style is real."); missing hiltNotes; the Companion Cube is actually pink-on-gray with heart icons, not orange/blue — those are the Portal *portal* colors not the Companion Cube. Color/concept mismatch worth fixing

### creative-pixel-miner: Pixel Miner
- Status: FLAG: missing hiltNotes; description ~94 chars borderline; Minecraft diamond ore is light cyan/teal so colors are right — but "blast sparkles like dropped XP" mixes Minecraft (no XP color) with general gaming

### creative-aurora-borealis: Aurora Borealis
- Status: FLAG: missing hiltNotes

### creative-magma-core: Magma Core
- Status: FLAG: missing hiltNotes; retractionMs 2000 is high but justified by lava-cooling theme

### creative-abyssal: Abyssal
- Status: FLAG: missing hiltNotes

### creative-lightning-storm: Lightning Storm
- Status: FLAG: missing hiltNotes; description ~123 chars

### creative-permafrost: Permafrost
- Status: FLAG: missing hiltNotes

### creative-solar-flare: Solar Flare
- Status: FLAG: missing hiltNotes

### creative-nebula: Nebula
- Status: FLAG: missing hiltNotes; ignitionMs 1500 / retractionMs 1800 is very slow — flagged for review but matches "meditative" intent

### creative-fire-and-ice: Fire & Ice
- Status: FLAG: missing hiltNotes

### creative-kryptonite: Kryptonite
- Status: FLAG: missing hiltNotes; description quality is good

### creative-ghostblade: Ghostblade
- Status: FLAG: missing hiltNotes; description has forward-reference to v1.1 feature (GhostEchoEffect) — fine as note but mark as future TODO; retractionMs 2000 on the high end but justified

### creative-sparkle-blade: Sparkle Blade
- Status: FLAG: missing hiltNotes

### creative-binary-sunset: Binary Sunset
- Status: FLAG: missing hiltNotes; concept is Tatooine — consider `screenAccurate: false` flag since this is concept-evoking-canon-scene (or accept as ambient)

### creative-void-walker: Void Walker
- Status: FLAG: missing hiltNotes; `affiliation: 'sith'` — same note as creative-dark-energy, non-Star-Wars edgelord concept doesn't need Sith faction tag

### creative-quantum-flux: Quantum Flux
- Status: FLAG: missing hiltNotes; description ~80 chars borderline stub; `character: 'Custom'` uninformative

### creative-nebula-core: Nebula Core
- Status: FLAG: missing hiltNotes; description ~76 chars stub; `character: 'Custom'` uninformative; duplicate concept with `creative-nebula` above — recommend differentiating in description

### creative-ghost-signal: Ghost Signal
- Status: FLAG: missing hiltNotes; description ~85 chars borderline; `character: 'Custom'` uninformative

### creative-thermal-detonator: Thermal Detonator
- Status: FLAG: missing hiltNotes; description ~96 chars borderline; `character: 'Custom'` should be something like "Bounty Hunter" or "Pyrotechnician" — thermal detonators are very specifically Star Wars; consider `continuity: 'creative'` -> arguably should be `canon` since these are canon SW items; retractionMs 250 paired with `retraction: 'shatter'` is intentional and good

### creative-tidal-wave: Tidal Wave
- Status: FLAG: missing hiltNotes; description ~86 chars borderline; `character: 'Custom'` uninformative; concept-overlap with `creative-tidal-force` (added later, with better hiltNotes)

### creative-heartbeat: Heartbeat
- Status: FLAG: missing hiltNotes; `character: 'Custom'` uninformative; `affiliation: 'sith'` is a stretch — heartbeat isn't inherently dark side

### creative-starfield: Starfield
- Status: FLAG: missing hiltNotes; description ~92 chars; `character: 'Custom'` uninformative

### creative-molten-core: Molten Core
- Status: FLAG: missing hiltNotes; description ~78 chars stub; `character: 'Custom'` uninformative; `affiliation: 'sith'` again stretched — molten core isn't inherently Sith

### creative-retro-crt: Retro CRT
- Status: FLAG: missing hiltNotes; description ~91 chars borderline; `character: 'Custom'` uninformative

### creative-deep-current: Deep Current
- Status: FLAG: missing hiltNotes

### creative-wildfire: Wildfire
- Status: FLAG: missing hiltNotes; `retraction: 'evaporate'` not in standard 13-retraction list documented in CLAUDE.md (may be valid via newer additions — verify against `packages/engine/src/ignition/` retraction set)

### creative-glacier: Glacier
- Status: FLAG: missing hiltNotes

### creative-sandstorm: Sandstorm
- Status: FLAG: missing hiltNotes; `ignition: 'seismic'` not in CLAUDE.md's listed ignition set — verify

### creative-bioluminescence: Bioluminescence
- Status: FLAG: missing hiltNotes; ignitionMs 1000 + retractionMs 1400 borderline-slow but justified by "deep sea" theme

### creative-earthquake: Earthquake
- Status: FLAG: missing hiltNotes

### creative-mainframe: Mainframe
- Status: FLAG: missing hiltNotes; description excellent

### creative-neural-link: Neural Link
- Status: FLAG: missing hiltNotes

### creative-warp-core: Warp Core
- Status: FLAG: missing hiltNotes; close to Trek IP (warp core is heavily associated with Star Trek) — `character: 'Engineer'` is appropriately generic

### creative-singularity: Singularity
- Status: FLAG: missing hiltNotes

### creative-quantum-entangle: Quantum Entangle
- Status: FLAG: missing hiltNotes

### creative-dragonfire: Dragonfire
- Status: FLAG: missing hiltNotes; description excellent

### creative-frostbane: Frostbane
- Status: FLAG: missing hiltNotes

### creative-astral-projection: Astral Projection
- Status: FLAG: missing hiltNotes

### creative-phoenix-rising: Phoenix Rising
- Status: FLAG: missing hiltNotes

### creative-interference: Interference
- Status: FLAG: missing hiltNotes

### creative-perpetual-motion: Perpetual Motion
- Status: FLAG: missing hiltNotes; description ~115 chars

### creative-cellular: Cellular
- Status: FLAG: missing hiltNotes; "Stephen Wolfram approves" is great flavor

### creative-event-horizon: Event Horizon
- Status: FLAG: missing hiltNotes

### creative-cozy-fireplace: Cozy Fireplace
- Status: FLAG: missing hiltNotes; description excellent

### creative-loading-screen: Loading Screen
- Status: FLAG: missing hiltNotes

### creative-graviton: Graviton
- Status: FLAG: missing hiltNotes; description ~130 chars excellent

### creative-shooting-star: Shooting Star
- Status: FLAG: missing hiltNotes; description excellent

### creative-tectonic: Tectonic
- Status: FLAG: missing hiltNotes

### creative-monsoon: Monsoon
- Status: FLAG: missing hiltNotes

### creative-vaporwave-aesthetic: V A P O R W A V E
- Status: FLAG: missing hiltNotes; description is outstanding (170+ chars, period-perfect references); ignitionMs 1800 / retractionMs 2000 is intentional and good for the aesthetic

### creative-bsod: Lightsaber.exe Has Crashed
- Status: FLAG: missing hiltNotes; ignitionMs 100 / retractionMs 3000 deliberately asymmetric and excellent

### creative-dial-up: Dial-Up Internet
- Status: FLAG: missing hiltNotes; ignitionMs 3000 is intentional (entire joke is the slow ignition) — accept

### creative-nyan-saber: Nyan Saber
- Status: FLAG: missing hiltNotes

### creative-its-over-9000: IT'S OVER 9000!!!
- Status: FLAG: missing hiltNotes; ignitionMs 50 is extreme but matches the joke perfectly

### creative-saber-goes-brrr: Saber Goes Brrr
- Status: FLAG: missing hiltNotes

### creative-synthwave-sunset: Synthwave Sunset
- Status: FLAG: missing hiltNotes; description excellent — "Drive down the coast, blade out the window, synthwave on the stereo" is exactly the voice anchor target

### creative-glitch-in-the-matrix: Glitch in the Matrix
- Status: FLAG: missing hiltNotes; description excellent

### creative-lofi-chill: Lo-Fi Chill Beats Saber
- Status: FLAG: missing hiltNotes; description excellent

### creative-maximum-rgb: RGB Gaming Saber Pro Max Ultra
- Status: FLAG: missing hiltNotes; duplicate-concept with `creative-rgb-gamer` (the simpler version above) — both can coexist but cross-reference would help discoverability

### creative-dark-mode: Dark Mode
- Status: FLAG: missing hiltNotes; description excellent

### creative-forbidden-saber: The Forbidden Saber
- Status: FLAG: missing hiltNotes; ignitionMs 50 / retractionMs 3000 asymmetric and intentional

### creative-cyberpunk-2077: Night City Chrome
- Status: FLAG: missing hiltNotes; "Wake up, samurai" is perfect CP77 reference

### creative-comic-sans: Comic Sans Saber
- Status: FLAG: missing hiltNotes

### creative-dueling-banjos: Rave Stick Deluxe
- Status: FLAG: missing hiltNotes; preset `id` says `creative-dueling-banjos` but `name` is "Rave Stick Deluxe" and `character` is "Festival Goer" — the ID and name don't match conceptually. Either rename ID to `creative-rave-stick-deluxe` or rename to something Deliverance-related. ID-vs-name drift is a real issue here.

### creative-microwave-dinner: Microwave Dinner
- Status: FLAG: missing hiltNotes

### creative-windows-xp: Windows XP Bliss
- Status: FLAG: missing hiltNotes; description excellent

### creative-everything-everywhere: Everything Bagel
- Status: FLAG: missing hiltNotes; `id` is `creative-everything-everywhere` (the movie title) but `name` is "Everything Bagel" (also from the movie) — name is more memorable but ID drift exists; description excellent

### creative-absolute-zero: Absolute Zero
- Status: FLAG: missing hiltNotes; description excellent

### creative-supernova: Supernova
- Status: FLAG: missing hiltNotes; description excellent

### creative-anxiety-core: Anxiety Core
- Status: FLAG: missing hiltNotes; description excellent

### creative-party-mode: Party Mode Activated
- Status: FLAG: missing hiltNotes

### creative-lava-lamp: Lava Lamp
- Status: FLAG: missing hiltNotes; description excellent; ignitionMs 2500 / retractionMs 3000 deliberately slow for "wax warming up" — intentional

### creative-palpatine-speculative: Emperor Palpatine (Speculative)
- Status: PASS — `screenAccurate: false` correctly set, hiltNotes present, description acknowledges non-canon status, colors appropriately Sith-red with cinder edge

### creative-obiwan-force-ghost: Obi-Wan (Force Ghost)
- Status: PASS — `screenAccurate: false` correctly set, hiltNotes present, description has clear sensory texture ("ethereal pale blue with a ghostly luminescence")

### creative-morgan-elsbeth-nightsister: Morgan Elsbeth (Nightsister — Speculative)
- Status: PASS — `screenAccurate: false` correctly set, hiltNotes present, description honest about canon (Beskar Sword, not lightsaber)

### creative-tidal-force: Tidal Force
- Status: PASS

### creative-vortex-of-korriban: Vortex of Korriban
- Status: PASS — Korriban is Legends content so the Sith-faction tag + creative continuity is appropriate

### creative-helix-resonance: Helix Resonance
- Status: PASS

### creative-neutron-drift: Neutron Drift
- Status: PASS

### creative-torrent-of-stars: Torrent of Stars
- Status: PASS

### creative-gravity-well: Gravity Well
- Status: PASS

### creative-cyclone-eye: Cyclone Eye
- Status: PASS

### creative-pendulum-blade: Pendulum Blade
- Status: PASS — excellent description, hiltNotes present

### creative-aayla-secura-tidal: Aayla Secura (Tidal Drift)
- Status: PASS — `screenAccurate: false`, hiltNotes acknowledge canonical hilt, description honest

### creative-plo-koon-vortex: Plo Koon (Stormcaller)
- Status: PASS — "Electric Judgment" reference is canonically accurate flavor

### creative-kit-fisto-torrent: Kit Fisto (Deep Current)
- Status: PASS — Nautolan aquatic nod is good lore detail

### creative-yoda-helix: Yoda (Force Helix)
- Status: PASS — ledCount 73 correctly reflects shoto blade size

### creative-vader-vortex: Darth Vader (Choke Vortex)
- Status: PASS — `dragColor` present for accurate Vader cinder edge

### creative-rey-tidal-yellow: Rey (Skywalker — Tidal Halo)
- Status: PASS — sequel-yellow color accurate to TROS, description acknowledges canon

### creative-ahsoka-helix: Ahsoka Tano (Twin Helix)
- Status: PASS — ledCount 120 for twin shorter blades is appropriate; white blade accurate to post-Rebels canon
