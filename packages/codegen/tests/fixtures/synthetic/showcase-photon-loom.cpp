// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 5 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Mapped to live templates (source -> target * combinator * amount):
//   clash -> shimmer * add * 90%
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   (expression) -> shimmer * replace * 90% -> 0
//   clash -> shimmer * add * 90% -> 0
//   swing -> colorHueShiftSpeed * add * 40% -> 0.2000  [no AST slot - deferred]
//
// Skipped bindings:
//   colorSaturationPulse - target path invalid or non-numeric
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    Stripes<
      5000,
      -1500,
      Rgb<255,230,100>,
      Mix<
        Scale<
          ClashImpactF,
          Int<0>,
          Int<29491>
        >,
        Black,
        Rgb<255,230,100>
      >,
      Pulsing<
        Rgb<255,230,100>,
        White,
        1200
      >
    >,
    BlastL<
      Rgb<255,250,220>
    >,
    SimpleClashL<
      Rgb<255,255,240>,
      40
    >,
    LockupTrL<
      AudioFlickerL<
        Rgb<255,240,180>
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
        TrInstant,
        TrWipeIn<460>
      >,
      TrFade<600>
    >
  >
>()
