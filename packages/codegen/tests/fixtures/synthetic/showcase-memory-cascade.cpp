// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 5 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Mapped to live templates (source -> target * combinator * amount):
//   sound -> shimmer * add * 60%
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   sound -> shimmer * add * 60% -> 0.2000
//   (expression) -> baseColor.b * add * 40% -> 240
//   swing -> shimmer * add * 40% -> 0.2000  [no AST slot - deferred]
//
// Skipped bindings:
//   colorSaturationPulse - target path invalid or non-numeric
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    Stripes<
      2000,
      -3000,
      Mix<
        Scale<
          NoisySoundLevel,
          Int<0>,
          Int<19661>
        >,
        Black,
        Rgb<80,200,240>
      >,
      Rgb<203,239,251>
    >,
    BlastL<
      Rgb<220,240,255>
    >,
    SimpleClashL<
      Rgb<240,240,255>,
      40
    >,
    LockupTrL<
      AudioFlickerL<
        Rgb<180,220,255>
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
        TrWipeIn<110>,
        TrDelay<55>,
        TrWipeIn<110>,
        TrDelay<55>,
        TrWipeIn<220>
      >,
      TrFade<620>
    >
  >
>()
