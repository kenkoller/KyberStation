# Ignition Styles

Ignition style picks **how** the blade lights up — the visual choreography of the wipe from hilt to tip. KyberStation ships 18 ignition styles, from clean defaults to motion-shaped specials.

The picker lives in **DESIGN → Ignition & Retraction**. Hover any tile to see a preview GIF.

---

## Defaults

| ID | Behavior |
|---|---|
| `standard` | Smooth hilt-to-tip wipe. The everyday default. |
| `wipe` | Soft-edged sweep. Slightly slower, slightly more deliberate. |
| `center` | Lights from the middle outward in both directions. |
| `scroll` | Crisp marching wave. Reads as mechanical / synthetic. |

If you don't have a strong preference, leave it on `standard`. Most canonical Star Wars sabers ignite this way.

## Stylized

| ID | Behavior |
|---|---|
| `spark` | Bright leading edge with a glowing trail. Energetic. |
| `crackle` | Random segments flicker in as the fill advances — reads as unstable. |
| `fracture` | Cracks radiate from points along the blade. |
| `flashfill` | Whole blade flashes white, then resolves to color. |
| `pulsewave` | Sequential building waves layer on top of each other. |
| `dripup` | Fluid upward flow, like liquid filling a tube. |
| `glitch` | Digital glitch pattern on the leading edge. |
| `stutter` | Stop-and-start fill — used for older / damaged sabers. |
| `stab` | Rapid center-out burst. Read more punchy than ignite. |

## Motion-shaped

These read motion data while ignition runs. They don't *trigger* on motion — your standard ignition button still starts them — but the animation **shape** depends on what the saber's doing.

### `swing`

Faster swing speed pushes the fill further ahead of the time-based progress, with a leading-edge spark that brightens with speed. Hold the saber still and it ignites smoothly; ignite mid-swing and the wipe accelerates and sparks.

### `twist`

A **spiral pattern** layers over the basic hilt-to-tip wipe. The spiral's phase depends on `twistAngle` — the rotation of the saber around its long axis — so rolling your wrist as the blade ignites shifts where the spiral peaks fall.

- **Driven by:** `twist` only (not `twist + angle`). The blade's tilt off-vertical doesn't affect it.
- **What it looks like:** a hilt-to-tip wipe with a wobble traveling along the blade. The wobble peaks shift up or down the blade as you twist.
- **Real-saber gesture:** twist your wrist before hitting ignite (or during, if your prop file allows mid-ignition input). On a still saber it still has the spiral pattern — twist input just adds another knob to shape it.
- **Pairs well with:** Sith / Inquisitor presets where the kyber crystal is "cracked" and reads as energy spiraling out of containment. Less natural fit for clean Jedi defaults.

> **One thing to note:** ignition still completes on its own time (per `ignitionMs`). Twist doesn't speed it up or slow it down — it only shapes the pattern. If you want the gesture itself to *start* ignition, that's a button-routing setup, not an ignition style.

---

## Picking an ignition

- **First saber?** `standard` (or whatever your preset's default is). You can always change it later.
- **Want it to feel fast?** `spark` or `swing`.
- **Want it to feel haunted / unstable?** `crackle` or `fracture`.
- **Want it to feel ceremonial?** `wipe` or `dripup`.
- **Want it to react to how you hold the saber?** `swing` or `twist`.

The retraction tab next to it works the same way — pick the visual choreography for the blade pulling back.
