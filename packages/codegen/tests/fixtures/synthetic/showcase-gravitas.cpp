// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 4 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   angle -> shimmer * add * 50% -> 0.2000  [no AST slot - deferred]
//   swing -> shimmer * add * 40% -> 0.2000  [no AST slot - deferred]
//   (expression) -> baseColor.r * add * 30% -> 80
//
// Skipped bindings:
//   colorSaturationPulse - target path invalid or non-numeric
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    Mix<
      BladeAngle,
      Gradient<
        Rgb<185,201,249>,
        Rgb<24,36,72>
      >,
      Gradient<
        Rgb<24,36,72>,
        Rgb<185,201,249>
      >
    >,
    BlastL<
      Rgb<220,230,255>
    >,
    SimpleClashL<
      Rgb<240,240,255>,
      40
    >,
    LockupTrL<
      AudioFlickerL<
        Rgb<200,200,255>
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
      TrFade<580>,
      TrConcat<
        TrFade<504>,
        TrFade<216>
      >
    >
  >
>()
