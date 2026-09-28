// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 4 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Mapped to live templates (source -> target * combinator * amount):
//   swing -> shimmer * add * 30%
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   (expression) -> shimmer * replace * 100% -> 0
//   swing -> shimmer * add * 30% -> 0
//
// Skipped bindings:
//   colorSaturationPulse - target path invalid or non-numeric
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    Pulsing<
      Rgb<80,200,160>,
      Mix<
        Scale<
          SwingSpeed<400>,
          Int<0>,
          Int<9830>
        >,
        Rgb<80,200,160>,
        White
      >,
      3000
    >,
    BlastL<
      Rgb<220,250,240>
    >,
    SimpleClashL<
      Rgb<220,250,230>,
      40
    >,
    LockupTrL<
      AudioFlickerL<
        Rgb<160,230,200>
      >,
      TrInstant,
      TrFade<300>,
      SaberBase::LOCKUP_NORMAL
    >,
    AlphaL<
      LockupTrL<
        AudioFlickerL<
          Rgb<60,180,140>
        >,
        TrInstant,
        TrFade<400>,
        SaberBase::LOCKUP_DRAG
      >,
      Bump<
        Int<22938>,
        Int<6554>
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
      TrWipeIn<580>,
      TrFade<720>
    >
  >
>()
