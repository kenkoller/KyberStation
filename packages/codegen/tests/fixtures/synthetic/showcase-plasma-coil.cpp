// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 4 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   (expression) -> shimmer * replace * 100% -> 0
//   swing -> colorHueShiftSpeed * add * 40% -> 0.2500  [no AST slot - deferred]
//   clash -> shimmer * add * 90% -> 0  [no AST slot - deferred]
//
// Skipped bindings:
//   colorSaturationPulse - target path invalid or non-numeric
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    StyleFire<
      Rgb<200,100,240>,
      Rgb<228,178,248>,
      0,
      5,
      FireConfig<4,2500,8>
    >,
    BlastL<
      Rgb<240,220,255>
    >,
    SimpleClashL<
      Rgb<255,240,255>,
      40
    >,
    LockupTrL<
      AudioFlickerL<
        Rgb<240,200,255>
      >,
      TrInstant,
      TrFade<300>,
      SaberBase::LOCKUP_NORMAL
    >,
    LockupTrL<
      AudioFlickerL<
        Rgb<255,150,0>
      >,
      TrInstant,
      TrFade<400>,
      SaberBase::LOCKUP_DRAG
    >,
    LockupTrL<
      Stripes<
        3000,
        -3500,
        Rgb<100,100,255>,
        White,
        Rgb<50,50,200>
      >,
      TrInstant,
      TrFade<500>,
      SaberBase::LOCKUP_LIGHTNING_BLOCK
    >,
    LockupTrL<
      Mix<
        SmoothStep<
          Int<26000>,
          Int<4000>
        >,
        Black,
        Mix<
          NoisySoundLevel,
          Rgb<255,200,0>,
          White
        >
      >,
      TrInstant,
      TrFade<500>,
      SaberBase::LOCKUP_MELT
    >,
    InOutTrL<
      TrConcat<
        TrFade<95>,
        TrDelay<48>,
        TrWipe<190>
      >,
      TrConcat<
        TrFade<81>,
        TrFade<459>
      >
    >
  >
>()
