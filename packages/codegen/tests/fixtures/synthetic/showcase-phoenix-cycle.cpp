// ─── Modulation Routing — v1.1 Core ──────────────────────
//
// This blade carries 3 live-modulation bindings in KyberStation's editor.
// Mappable bindings emit as LIVE ProffieOS templates (Scale<...>,
// Sin<...>, etc.) so the flashed saber reacts in real time. Bindings
// that don't fit a current template slot snapshot to a static value.
//
// Snapshotted to static values (source -> target * combinator * amount -> snapshot):
//   ignition -> shimmer * replace * 100% -> 0
//   retraction -> shimmer * add * 60% -> 0
//   lockup -> shimmer * add * 70% -> 0
//
// See docs/MODULATION_ROUTING_ROADMAP.md for the v1.1+ ladder.
// ───────────────────────────────────────────────────────────

StylePtr<
  Layers<
    StyleFire<
      Rgb<255,100,30>,
      Rgb<255,200,50>,
      0,
      3,
      FireConfig<2,1500,5>
    >,
    BlastL<
      Rgb<255,220,130>
    >,
    SimpleClashL<
      Rgb<255,240,180>,
      40
    >,
    ResponsiveLockupL<
      AudioFlickerL<
        Rgb<255,180,60>
      >,
      TrInstant,
      TrFade<300>,
      Int<15565>,
      Int<10649>,
      Int<4915>
    >,
    LockupTrL<
      AudioFlickerL<
        Rgb<255,80,0>
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
        TrFade<104>,
        TrWipe<416>
      >,
      TrFade<680>
    >
  >
>()
