// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 4 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   (expression) -> shimmer * replace * 80% -> 0
//   clash -> shimmer * add * 90% -> 0  [no AST slot - deferred]
//   swing -> shimmer * add * 40% -> 0  [no AST slot - deferred]
//
// Skipped bindings:
//   colorSaturationPulse - target path invalid or non-numeric
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    Stripes<
      3000,
      -2000,
      Rgb<200,240,255>,
      Mix<
        Sin<Int<5>>,
        Rgb<200,240,255>,
        White
      >,
      Rgb<200,240,255>
    >,
    BlastL<
      Rgb<240,255,255>
    >,
    SimpleClashL<
      Rgb<255,255,255>,
      40
    >,
    ResponsiveLockupL<
      AudioFlickerL<
        Rgb<240,250,255>
      >,
      TrInstant,
      TrFade<300>,
      Int<19006>,
      Int<13762>,
      Int<5243>
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
      TrWipeIn<540>,
      TrFade<700>
    >
  >
>()
