// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 4 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Mapped to live templates (source -> target * combinator * amount):
//   swing -> shimmer * add * 50%
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   (expression) -> shimmer * replace * 100% -> 0
//   swing -> shimmer * add * 50% -> 0
//   clash -> shimmer * add * 80% -> 0  [no AST slot - deferred]
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    StyleFire<
      Rgb<30,130,240>,
      Mix<
        Scale<
          SwingSpeed<400>,
          Int<0>,
          Int<16384>
        >,
        Rgb<30,130,240>,
        White
      >,
      0,
      4,
      FireConfig<3,2000,5>
    >,
    BlastL<
      Rgb<220,240,255>
    >,
    SimpleClashL<
      Rgb<255,240,220>,
      40
    >,
    ResponsiveLockupL<
      AudioFlickerL<
        Rgb<255,200,130>
      >,
      TrInstant,
      TrFade<300>,
      Int<19333>,
      Int<13435>,
      Int<5898>
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
      TrWipeSparkTip<White,380>,
      TrFade<460>
    >
  >
>()
