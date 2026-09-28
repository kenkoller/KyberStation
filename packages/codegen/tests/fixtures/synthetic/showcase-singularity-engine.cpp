// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 7 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Mapped to live templates (source -> target * combinator * amount):
//   swing -> shimmer * add * 40%
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   (expression) -> shimmer * replace * 100% -> 0
//   sound -> colorHueShiftSpeed * add * 50% -> 0.7000  [no AST slot - deferred]
//   swing -> shimmer * add * 40% -> 0
//   clash -> shimmer * add * 80% -> 0  [no AST slot - deferred]
//   (expression) -> shimmer * add * 30% -> 0
//
// Skipped bindings:
//   colorSaturationPulse - target path invalid or non-numeric
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    StyleFire<
      Rgb<200,60,240>,
      Mix<
        Scale<
          SwingSpeed<400>,
          Int<0>,
          Int<13107>
        >,
        Rgb<200,60,240>,
        White
      >,
      0,
      4,
      FireConfig<3,2000,5>
    >,
    BlastL<
      Rgb<240,220,255>
    >,
    SimpleClashL<
      Rgb<255,240,220>,
      40
    >,
    ResponsiveLockupL<
      AudioFlickerL<
        Rgb<220,180,255>
      >,
      TrInstant,
      TrFade<300>,
      Int<19006>,
      Int<13762>,
      Int<5243>
    >,
    AlphaL<
      LockupTrL<
        AudioFlickerL<
          Rgb<255,100,200>
        >,
        TrInstant,
        TrFade<400>,
        SaberBase::LOCKUP_DRAG
      >,
      Bump<
        Int<27853>,
        Int<3932>
      >
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
        TrWipe<460>
      >,
      TrFade<720>
    >
  >
>()
