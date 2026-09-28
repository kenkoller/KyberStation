// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 4 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   (expression) -> shimmer * replace * 100% -> 0
//   sound -> shimmer * add * 50% -> 0  [no AST slot - deferred]
//   clash -> shimmer * add * 70% -> 0  [no AST slot - deferred]
//   (expression) -> shimmer * add * 30% -> 0
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    BrownNoiseFlicker<
      Gradient<
        Rgb<255,140,40>,
        Rgb<255,80,10>
      >,
      White,
      50
    >,
    BlastL<
      Rgb<255,230,180>
    >,
    SimpleClashL<
      Rgb<255,240,200>,
      40
    >,
    LockupTrL<
      AudioFlickerL<
        Rgb<255,200,100>
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
        TrFade<116>,
        TrWipeIn<464>
      >,
      TrFade<720>
    >
  >
>()
