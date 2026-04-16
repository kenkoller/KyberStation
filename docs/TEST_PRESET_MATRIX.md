# KyberStation Test Preset Matrix

50 presets, each isolating a single parameter for on-saber verification.
Baseline: Stable style, solid Rgb<0,0,255> blue, standard wipe ignition/retraction, 500ms timing.

## Blade Styles (1-14)
Each uses the same blue base color, standard ignition, to isolate style behavior.

| # | Font Folder | Callout | What It Tests | ProffieOS Style Core |
|---|------------|---------|---------------|---------------------|
| 1 | test01 | "Stable solid" | Stable blade, no shimmer (baseline) | `Rgb<0,0,255>` |
| 2 | test02 | "Stable shimmer" | Stable blade + shimmer flicker | `AudioFlicker<Rgb<0,0,255>,Rgb<0,0,128>>` |
| 3 | test03 | "Unstable" | Kylo-style crackling blade | `StyleFire<Rgb<0,0,255>,Rgb<0,0,128>,0,6,FireConfig<0,1000,5>>` |
| 4 | test04 | "Fire" | Full fire effect, yellow core | `StyleFire<Rgb<255,80,0>,Rgb<255,200,0>,0,6>` |
| 5 | test05 | "Pulse" | Sine-wave pulsing brightness | `Pulsing<Rgb<0,0,255>,Rgb<0,0,80>,3000>` |
| 6 | test06 | "Rainbow" | Full spectrum cycling | `Rainbow` |
| 7 | test07 | "Stripes" | Animated stripe pattern | `Stripes<3000,-2000,Rgb<0,0,255>,White,Rgb<0,0,128>>` |
| 8 | test08 | "Gradient two color" | Hilt-blue to tip-red gradient | `Gradient<Rgb<0,0,255>,Rgb<255,0,0>>` |
| 9 | test09 | "Audio flicker" | Sound-reactive flicker | `AudioFlicker<Rgb<0,0,255>,Rgb<100,100,255>>` |
| 10 | test10 | "Rotoscope" | OT-style bright core shimmer | `AudioFlicker<Rgb<0,0,255>,Rgb<200,200,255>>` |
| 11 | test11 | "Plasma stripes" | Roiling plasma arcs | `Stripes<5000,-3000,Rgb<0,0,255>,Mix<Sin<Int<3>>,Rgb<0,0,255>,White>,Rgb<0,0,128>>` |
| 12 | test12 | "Cinder" | Smoldering embers, dark blade | `StyleFire<Rgb<255,50,0>,Rgb<80,0,0>,0,3,FireConfig<0,2000,3>>` |
| 13 | test13 | "Prism" | Rainbow with rotation | `Mix<SwingSpeed<400>,Rainbow,Mix<Sin<Int<3>>,Rainbow,White>>` |
| 14 | test14 | "Color rotate" | Hue rotation over time | `RotateColorsX<Variation,Rgb<0,0,255>>` |

## Ignition Types (15-21)
All use same stable blue blade to isolate ignition animation.

| # | Font Folder | Callout | What It Tests | Ignition Template |
|---|------------|---------|---------------|-------------------|
| 15 | test15 | "Standard wipe ignition" | Basic hilt-to-tip wipe | `TrWipe<500>` / `TrWipeIn<500>` |
| 16 | test16 | "Fast wipe ignition" | Speed comparison - fast | `TrWipe<200>` / `TrWipeIn<200>` |
| 17 | test17 | "Slow wipe ignition" | Speed comparison - slow | `TrWipe<1200>` / `TrWipeIn<1200>` |
| 18 | test18 | "Center out ignition" | Extends from blade center | `TrCenterWipe<500>` / `TrCenterWipeIn<500>` |
| 19 | test19 | "Spark tip ignition" | Wipe with leading spark | `TrWipeSparkTipX<White,Int<500>>` / `TrFade<500>` |
| 20 | test20 | "Stutter ignition" | Jittery unstable ignition | `TrConcat<TrFade<50>,TrDelay<25>,TrWipe<500>>` / `TrFade<500>` |
| 21 | test21 | "Fade ignition" | Smooth fade-in/fade-out | `TrFade<800>` / `TrFade<800>` |

## Color Methods (22-31)
All use stable style, standard ignition, to isolate color behavior.

| # | Font Folder | Callout | What It Tests | Color Expression |
|---|------------|---------|---------------|-----------------|
| 22 | test22 | "Solid red" | Pure red reference | `Rgb<255,0,0>` |
| 23 | test23 | "Solid green" | Pure green reference | `Rgb<0,255,0>` |
| 24 | test24 | "Solid blue" | Pure blue reference (same as baseline) | `Rgb<0,0,255>` |
| 25 | test25 | "Solid white" | Full white, max brightness | `Rgb<255,255,255>` |
| 26 | test26 | "Solid purple" | Custom mix color | `Rgb<128,0,255>` |
| 27 | test27 | "Two color mix" | Static 50/50 blend | `Mix<Int<16384>,Rgb<0,0,255>,Rgb<255,0,0>>` |
| 28 | test28 | "Swing color shift" | Color changes with swing speed | `Mix<SwingSpeed<400>,Rgb<0,0,255>,Rgb<255,0,0>>` |
| 29 | test29 | "Angle color shift" | Color changes with blade angle | `Mix<BladeAngle<>,Rgb<0,0,255>,Rgb<255,0,0>>` |
| 30 | test30 | "Sound reactive" | Brightness responds to sound | `Mix<NoisySoundLevel,Rgb<0,0,80>,Rgb<0,0,255>>` |
| 31 | test31 | "Three color gradient" | Gradient with 3 stops | `Gradient<Rgb<255,0,0>,Rgb<0,255,0>,Rgb<0,0,255>>` |

## Effects (32-39)
All use same stable blue base. Each preset highlights ONE effect type with a vivid contrast color.

| # | Font Folder | Callout | What It Tests | Key Layer |
|---|------------|---------|---------------|-----------|
| 32 | test32 | "Clash white" | White clash flash | `SimpleClashL<White,40>` |
| 33 | test33 | "Clash colored" | Orange clash flash | `SimpleClashL<Rgb<255,150,0>,40>` |
| 34 | test34 | "Lockup" | Sustained lockup glow | `LockupTrL<AudioFlickerL<White>,TrInstant,TrFade<300>,SaberBase::LOCKUP_NORMAL>` |
| 35 | test35 | "Drag" | Tip drag effect | `LockupTrL<AudioFlickerL<Rgb<255,150,0>>,TrInstant,TrFade<400>,SaberBase::LOCKUP_DRAG>` |
| 36 | test36 | "Lightning block" | Electrical arc defense | `LockupTrL<Stripes<3000,-3500,White,Rgb<100,100,255>,Rgb<50,50,200>>,TrInstant,TrFade<500>,SaberBase::LOCKUP_LIGHTNING_BLOCK>` |
| 37 | test37 | "Melt" | Overload/melt at tip | `LockupTrL<Mix<SmoothStep<Int<26000>,Int<4000>>,Black,Mix<NoisySoundLevel,Rgb<255,200,0>,White>>,TrInstant,TrFade<500>,SaberBase::LOCKUP_MELT>` |
| 38 | test38 | "Blast" | Impact blast marks | `BlastL<White>` |
| 39 | test39 | "Multi blast" | Multiple blast impacts | `BlastL<White>,BlastL<White>,BlastL<White>` |

## Shimmer & Modulation (40-43)
Isolating shimmer/flicker intensity on same base color.

| # | Font Folder | Callout | What It Tests | Style |
|---|------------|---------|---------------|-------|
| 40 | test40 | "No shimmer baseline" | Clean solid, no flicker | `Rgb<0,0,255>` |
| 41 | test41 | "Light shimmer" | Subtle flicker | `AudioFlicker<Rgb<0,0,255>,Rgb<0,0,220>>` |
| 42 | test42 | "Medium shimmer" | Moderate flicker depth | `AudioFlicker<Rgb<0,0,255>,Rgb<0,0,160>>` |
| 43 | test43 | "Heavy shimmer" | Deep flicker | `AudioFlicker<Rgb<0,0,255>,Rgb<0,0,80>>` |

## Spatial Patterns (44-47)
Animated patterns along blade length.

| # | Font Folder | Callout | What It Tests | Style |
|---|------------|---------|---------------|-------|
| 44 | test44 | "Wave hilt to tip" | Animated wave traveling up | `Stripes<5000,-2000,Rgb<0,0,255>,Rgb<0,0,128>,Rgb<0,0,255>>` |
| 45 | test45 | "Wave tip to hilt" | Animated wave traveling down | `Stripes<5000,2000,Rgb<0,0,255>,Rgb<0,0,128>,Rgb<0,0,255>>` |
| 46 | test46 | "Fast wave" | High speed stripe animation | `Stripes<2000,-5000,Rgb<0,0,255>,Rgb<0,0,128>,Rgb<0,0,255>>` |
| 47 | test47 | "Wide stripes" | Broad stripe segments | `Stripes<10000,-1500,Rgb<0,0,255>,White,Rgb<0,0,128>>` |

## Combined Showcase (48-50)
Polished presets combining multiple features for demo video.

| # | Font Folder | Callout | What It Tests | Description |
|---|------------|---------|---------------|-------------|
| 48 | test48 | "Showcase one" | Swing-reactive rainbow + spark ignition + full effects | Best-of combination |
| 49 | test49 | "Showcase two" | Fire style + stutter ignition + orange effects | Aggressive dark-side combo |
| 50 | test50 | "Showcase three" | Gradient + center ignition + white effects | Elegant light-side combo |
