# Sequel Era Preset Audit — 2026-04-22

**Source**: Blu-ray → Wookieepedia → community convention.
**File audited**: `/Users/KK/Development/KyberStation-presets/packages/presets/src/characters/sequel-era.ts`
**Agent scope**: sequel-era (Episodes VII–IX + related visions/guards).

## Summary

- **Total**: 10 presets (file is authoritative; audit-prompt scoping of ~11 included expected Kylo/Rey variants per-film; actual file collapses each character to one canonical loadout + adds Palpatine/Praetorian/Dark Rey which were out of the prompt's bullet list).
- **Flagged** (canonical issues beyond "nice to have"): 5
- **Accurate as-shipped**: 5 (`st-rey-blue`, `st-luke-tlj`, `st-leia`, `st-ben-solo`, `st-finn` — all core blue/green stable-blade loadouts are correct).
- **Detailed tier**: 5 (Kylo, Rey Yellow, Palpatine, Praetorian Guard, Dark Rey).
- **Base tier**: 5 (Rey Blue, Luke TLJ, Leia, Ben Solo, Finn).

### Top issues

1. **Kylo Ren's `ignition: 'crackle'` is correct by prompt guidance, but `shimmer: 0.4` is at the floor of the 0.4–0.7 canon band** — the TFA/TLJ crossguard blade visibly fluctuates more than this value will render. Recommend 0.55–0.65 to match the "sparking arc-welder" feel of the on-screen blade.
2. **Kylo is not leveraging `BifurcateEffect` (clash-bound) despite the prompt explicitly calling him out as the #1 feature-leveraging candidate for the sequel era.** The current `clashColor` is a hot-cream tone — good — but there's no explicit side-vent instability cue. This is a genuine missed-opportunity tied to an already-shipped engine effect.
3. **Rey TROS yellow (`st-rey-yellow`) uses `style: 'photon'`** — Photon is a holographic/plasma-phased style per the registry, and the on-screen TROS final-scene yellow blade is a stable, warm-gold standard blade (most community builds tune it as `stable` + warmer bias, or `aurora` if you want the ceremonial halo suggested by the prompt). `photon` is defensible as a flourish but drifts from canon "just a plain yellow blade."

### Structural patterns across the file

- Colour values consistently include gamma-pulled blue channels (`r:0, g:120, b:255` etc.) which is the right pull for WS2812b at full brightness — no corrections needed.
- Every preset references `ledCount: 144` — consistent with the project default in `bladeStore.ts`.
- The three Graflex-wielders (Rey Blue, Finn, Ben Solo) share identical `baseColor` `{0,120,255}` — good data hygiene, same blade, same RGB.
- `clashColor` in the Graflex trio varies (Rey/Ben `190,215,255` vs Finn `200,220,255`) by <5 points — effectively indistinguishable on-screen. Fine, but consider normalizing to a single constant to remove silent drift.
- No spatial effect positioning fields (`blastPosition`, `lockupPosition`, `dragPosition`) appear anywhere in this file. That's a uniform miss across the sequel era — identical to the other eras — and not a sequel-specific concern.

---

## Per-preset audit

### `st-kylo-ren` — Kylo Ren

**Canon anchor**: TFA (Takodana / Starkiller), TLJ (throne room), TROS (Kef Bir) — same crossguard across all three films, blade deepens slightly over time but remains the same basic look.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `baseColor` | `{200, 10, 0}` | Blood-red with orange undertone from instability | **Accurate** — the 200 red + nudge of green makes the orange lean right |
| `clashColor` | `{255, 200, 100}` | Hot white-cream on impact | **Accurate** — good hot-cream |
| `lockupColor` | `{255, 130, 0}` | Orange-white sparks | **Accurate** |
| `blastColor` | `{255, 220, 180}` | Hot near-white | **Accurate** |
| `dragColor` | `{255, 100, 0}` | Orange ember | **Accurate** |
| `style` | `unstable` | `unstable` (canonical exception per prompt) | **Accurate** |
| `ignition` | `crackle` | `crackle` or `fracture` justified per prompt | **Accurate** |
| `retraction` | `flickerOut` | Any flicker-variant retraction | **Accurate** |
| `ignitionMs` | 500 | 400–600 ms per prompt | **Accurate** (mid-range) |
| `retractionMs` | 400 | Standard range | **Accurate** |
| `shimmer` | **0.4** | 0.4–0.7 per prompt | **Flagged — floor value**; bump to **0.55–0.65** |
| `unstableIntensity` | 0.6 | Custom field; higher = more visible flicker | Acceptable |
| `noiseLevel` | 0.2 | Custom field | Acceptable |
| `swingFxIntensity` | 0.5 | Custom field | Acceptable |
| `stutterCount` | 4 | Custom field | Acceptable |
| `crossguard` | true | Yes | **Accurate** |
| `quillonLength` | 48 | 144/3 = 48 — "1/3 main blade" per own topologyNotes | **Accurate** |

**Feature-leveraging opportunity (high priority)**: Prompt explicitly names Kylo as the #1 candidate — currently the file implements **none** of the named effects. Adding any one would be a meaningful canon upgrade:

- **`BifurcateEffect` on clash** — the prompt's specific suggestion; the side-vent "two currents" read is a perfect fit.
- **`FractureIgnition`** as an alternative to `crackle` for a more dramatic first-ignite feel.
- **Raised shimmer 0.55–0.65** per table above.
- **Candle-style flicker in style** — the `candle` style (`CandleStyle`) is literally built around fbm flicker + gust events, and would hybrid-render beautifully on top of `unstable` for the crossguard — worth experimenting with a detailed variant.

### `st-rey-blue` — Rey (Skywalker Saber)

**Canon anchor**: TFA Takodana awakening → TLJ Ahch-To/Crait → TROS Pasaana — Anakin's Graflex, blue.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `baseColor` | `{0, 120, 255}` | Cool sequel-grade blue | **Accurate** |
| `clashColor` | `{190, 215, 255}` | Cool blue-white | **Accurate** |
| `style` | `stable` | Stable | **Accurate** |
| `ignition` | `standard` | Standard | **Accurate** |
| `ignitionMs` | 300 | 250–400 ms per prompt | **Accurate** |
| `shimmer` | 0.04 | 0.0–0.1 per prompt | **Accurate** |
| `dragColor` | `{255, 180, 0}` | Orange ember (present despite no canonical drag scene) | Acceptable — matches the Graflex "warm scar" convention |

**Feature-leveraging opportunity**: None — correct and intentionally understated. This is the canonical baseline; leave it.

### `st-rey-yellow` — Rey (Own Saber)

**Canon anchor**: TROS final scene (Tatooine burial). Single appearance, warm gold-yellow, stable.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `baseColor` | `{255, 200, 0}` | Warm gold-yellow (not safety lemon) | **Accurate** — good gold bias |
| `clashColor` | `{255, 240, 160}` | Near-white gold | **Accurate** |
| `lockupColor` | `{255, 220, 80}` | Warm gold | **Accurate** |
| `blastColor` | `{255, 255, 220}` | Warm white | **Accurate** |
| `style` | **`photon`** | Stable or (per prompt) Aurora-adjacent for ceremony | **Flagged** — `photon` is a phased/holographic style, drifts from "plain warm blade" |
| `ignition` | `wipe` | Standard or any soft sweep | Acceptable — unusual but not wrong |
| `retraction` | `fadeout` | Standard or soft fade | Acceptable |
| `ignitionMs` | 280 | 250–400 ms | **Accurate** |
| `shimmer` | 0.05 | 0.0–0.1 | **Accurate** |

**Feature-leveraging opportunity (prompt-directed)**: Swap `style: 'photon'` → **`style: 'aurora'`** with low intensity to give the ceremonial warm-halo read the prompt specifically calls out. `aurora` renders a drifting warm-halo layer on top of a stable base, which reads "ceremonial, consecrated" without looking holographic. Alternative: plain `stable` with a slightly-lower-saturation base color is also defensible and is the lowest-risk community-convention choice.

### `st-luke-tlj` — Luke Skywalker (TLJ)

**Canon anchor**: Flashback at Ben Solo's hut + Crait Force projection. Same ROTJ green blade visually.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `baseColor` | `{0, 220, 40}` | ROTJ green | **Accurate** |
| `style` | `rotoscope` | Rotoscope preserves the film-grade ROTJ-style blade rendering | **Accurate** — arguably *better* than generic `stable` here; `rotoscope` is the right prequel/OT homage |
| `ignition` | `standard` | Standard | **Accurate** |
| `ignitionMs` | 250 | 250–400 ms per prompt | **Accurate** (floor — matches Luke's characteristically snappy ignitions) |
| `shimmer` | 0.03 | 0.0–0.1 | **Accurate** |

**Feature-leveraging opportunity**: Preset omits `dragColor` and `blastColor` is plain white. If adding detail-tier variance later, a slightly warm drag (`{255, 160, 60}`) would echo the scorched-earth Crait floor in the projection scene. Currently `tier: 'base'` so no change recommended.

**Note**: Prompt specifies "Luke TROS (Force ghost) — probably skip special treatment." Correctly omitted — no `st-luke-tros` exists in the file.

### `st-leia` — Leia Organa

**Canon anchor**: Ahch-To flashback training sequence (TROS). Short clip; blade color calibrated to match "royal deep blue" convention.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `baseColor` | `{0, 100, 255}` | Deeper blue than Skywalker saber | **Accurate** — deliberately 20 points lower green than Rey Blue, giving it a slightly more violet-leaning blue |
| `style` | `stable` | Stable | **Accurate** |
| `ignition` | `standard` | Standard, short window | **Accurate** |
| `ignitionMs` | 280 | 250–400 | **Accurate** |
| `retractionMs` | 380 | Slightly longer than ignition is fine | **Accurate** |
| `shimmer` | 0.04 | 0.0–0.1 | **Accurate** |

**Feature-leveraging opportunity**: None. This is a well-tuned base preset.

### `st-ben-solo` — Ben Solo (Redeemed)

**Canon anchor**: TROS Exegol final battle. Same Skywalker Graflex blade as Rey Blue.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `baseColor` | `{0, 120, 255}` | Identical to Rey Blue (same blade) | **Accurate** |
| `clashColor/lockupColor/blastColor` | Match Rey Blue | Same blade | **Accurate** |
| `style` | `stable` | Stable (per prompt — blade itself is canonical blue, not unstable) | **Accurate** |
| `ignitionMs` | 300 | 250–400 | **Accurate** |
| `shimmer` | 0.04 | 0.0–0.1 | **Accurate** |

**Note**: The `dragColor` present in Rey Blue is absent here. Minor inconsistency since it's the same physical blade. Low priority — drag color is a user-preference aesthetic, not a canonical attribute.

**Feature-leveraging opportunity**: None — this is correctly a clone of Rey Blue with a distinct name/description to surface the character arc.

### `st-palpatine` — Palpatine (TROS)

**Canon anchor**: Palpatine's TROS appearance does not ignite a saber on-screen. His canonical saber (from Legends + various supplementary material — Electrum-plated Phrik hilt with a synthetic red crystal) is extrapolated. This preset is **imaginative-canonical** rather than screen-accurate in the strict sense, though the `screenAccurate: true` flag is set.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `baseColor` | `{255, 0, 0}` | Deep Sith red | **Accurate** (within imaginative scope) |
| `style` | `cinder` | Free choice — Palpatine has no on-screen saber ignite | Acceptable as flavor; `unstable` or `stable` would also be defensible |
| `ignition` | `crackle` | Force-lightning flavor carries over | Acceptable |
| `retraction` | `drain` | Evocative | Acceptable |
| `ignitionMs` | 200 | Short/snap | Acceptable |
| `shimmer` | 0.22 | Intermediate | Acceptable |
| `dragColor` | `{200, 0, 200}` | Purple drag | Genuinely inventive — the purple cribs from Force-lightning color and is a nice nod |
| `screenAccurate` | `true` | Debatable — Palpatine never ignites a saber in TROS | **Flagged** — consider demoting to `screenAccurate: false` with a "Legends reference" note, OR keep true but document the Legends-lineage basis in `hiltNotes` (currently "Electrum-plated Phrik hilt" is asserted as canonical but this is Legends-era material, not new-canon) |

**Feature-leveraging opportunity**: Strong fit for `CandleStyle` or `ember` + high noise to echo the Force-lightning coupling. The purple `dragColor` is already a lovely flourish.

### `st-praetorian-guard` — Praetorian Guard

**Canon anchor**: TLJ throne room fight. **These are not lightsabers** — they are vibro-weapons with plasma edges (per Wookieepedia: "bilari electro-chain whip," "electro-bisento," "twin vibro-voulge"). This preset is a visual analogue.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `affiliation` | `sith` | Snoke's guards are not strictly Sith but are First Order/aligned with dark | Acceptable given the simplified affiliation taxonomy (`sith` serves as dark-aligned umbrella) |
| `baseColor` | `{255, 20, 10}` | Bright electro-plasma red | **Accurate** |
| `style` | `plasma` | Appropriate — these are plasma weapons | **Accurate** and clever — `plasma` style is literally what these are on-screen |
| `ignition` | `wipe` | No proper "ignition" since these are always-on | Acceptable as a representation |
| `retraction` | `fadeout` | Same | Acceptable |
| `shimmer` | 0.1 | Matches the "electric buzz" read | **Accurate** |
| `frequency` | 1.8 | Plasma-style custom field | Acceptable |
| `phaseSpeed` | 0.6 | Plasma-style custom field | Acceptable |

**Feature-leveraging opportunity**: `LightningEffect` (if available) bound to clash would echo the vibro-buzz on hit. The current config is good.

**Note**: Consider clarifying `topologyNotes` — these weapons vary dramatically in form (chain whip vs pole-arm vs paired blades) and a single preset can't represent all eight guard weapons. Fine as a base "plasma-edge weapon" template.

### `st-finn` — Finn (Skywalker Saber)

**Canon anchor**: TFA Takodana + Starkiller Base — Finn wields the Graflex for one scene before losing it.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `baseColor` | `{0, 120, 255}` | Identical to Rey Blue (same blade) — prompt explicitly calls this out | **Accurate** |
| `clashColor` | `{200, 220, 255}` | 5-pt drift vs Rey Blue | Acceptable but see "Structural patterns" above |
| `style/ignition/retraction` | stable/standard/standard | Per prompt | **Accurate** |
| `ignitionMs` | 280 | 250–400 | **Accurate** |
| `shimmer` | **0.06** | 0.0–0.1 per prompt | **Accurate**, though slightly higher than Rey Blue's 0.04 to reflect Finn's untrained swings — defensible artistic choice, not a bug |

**Feature-leveraging opportunity**: Description mentions "Finn's untrained swings give the ignition a slightly desperate quality" — this is narrative flavor, but the file does not translate it into a config change beyond the +0.02 shimmer bump. If wanting to lean further in, a `stutter` ignition at 350ms would literally render the "desperate" ignition. Low-priority flourish.

### `st-rey-dark` — Rey (Dark Side Vision)

**Canon anchor**: TROS Kef Bir Force vision. Brief but iconic; hinged double-bladed red saber.

| Field | Current | Canon expectation | Verdict |
|---|---|---|---|
| `baseColor` | `{255, 0, 10}` | Saturated Sith red | **Accurate** |
| `clashColor` | `{255, 200, 100}` | Hot orange-cream | **Accurate** |
| `lockupColor` | `{255, 100, 0}` | Orange sparks | **Accurate** |
| `style` | `unstable` | Canon shows the vision saber with mild instability | **Accurate** — and appropriate as a Kylo-adjacent dark-side kit |
| `ignition` | `fracture` | Dramatic dark-side ignition | **Accurate** — great choice |
| `retraction` | `implode` | Dramatic | **Accurate** — great choice |
| `ignitionMs` | 250 | Snap | **Accurate** |
| `shimmer` | 0.3 | Below the Kylo 0.4–0.7 band; that's fine since the vision blade is visually more stable than Kylo's cracked crystal | **Accurate** |
| `flicker` | 0.5 | Custom field | Acceptable |
| `noiseLevel` | 0.12 | Custom field | Acceptable |
| `swingFxIntensity` | 0.4 | Custom field | Acceptable |

**Feature-leveraging opportunity**: Arguably the most well-leveraged preset in the file — fracture ignition + implode retraction + unstable style is exactly the kind of rich layering this era's feature surface supports. No changes recommended; this is a strong template for other vision/what-if presets.

**Note**: Current preset doesn't explicitly encode the **double-bladed** hilt topology — that's represented only in `hiltNotes` text. If/when topology-expansion work lands (multi-blade workbench), this preset should be promoted to `topology: 'double-bladed'` or similar so the blade visualizer renders both ends.

---

## Recommended changes — priority order

1. **P1 — Kylo Ren**: raise `shimmer` from `0.4` → `0.55–0.65`. One-line change, renders visibly closer to TFA screen reference.
2. **P1 — Kylo Ren**: file a `feature-leveraging` follow-up to bind `BifurcateEffect` to clash. Prompt-directed; engine support exists per `packages/engine/src/effects/BifurcateEffect.ts`.
3. **P2 — Rey Yellow**: change `style: 'photon'` → `style: 'aurora'` (or `stable`). `photon` drifts from on-screen read.
4. **P3 — Palpatine**: either demote `screenAccurate: true` → `false` or add a `hiltNotes` caveat noting Legends-era basis. Light touch; the preset is good, just mis-flagged.
5. **P3 — Graflex trio**: normalize `clashColor` across Rey Blue / Ben Solo / Finn to a single constant to remove silent drift (Finn is 5pts higher green/red vs the other two).
6. **P4 — Luke TLJ / Ben Solo**: consider adding `dragColor` for parity with Rey Blue. Low priority — neither character has an on-screen drag moment for this to match against.
7. **P4 — Dark Rey**: flag for multi-blade topology when that workbench work lands.

## Uncertainty / WebSearch flag

- **Palpatine's TROS saber canonicity**: The `hiltNotes` asserts "Electrum-plated Phrik hilt" as canonical. Phrik-hilt Palpatine lore is **Legends-era** (pre-Disney canon), not new-canon. No WebSearch attempted since the recommendation is to adjust the flag/notes rather than remove the preset — worth confirming with the broader Wookieepedia current-canon entry if a stricter pass is done.
- **All other presets**: evaluated against my recall of the three films and community convention; high confidence. No WebSearch required.
