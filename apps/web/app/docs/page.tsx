'use client';
import Link from 'next/link';
import { useThemeApplier } from '@/hooks/useThemeApplier';

interface Section {
  id: string;
  title: string;
  content: string[];
  list?: string[];
  subsections?: Array<{
    subtitle: string;
    content?: string[];
    list?: string[];
  }>;
}

const SECTIONS: Section[] = [
  // ────────────────────────────────────────────────────────
  // 0. Welcome (new-user landing)
  // ────────────────────────────────────────────────────────
  {
    id: 'welcome',
    title: 'Welcome to KyberStation',
    content: [
      'KyberStation is a free, open-source tool for designing lightsaber blade styles. You can use it to create a custom look for your saber, preview it in real time, and export the code or config file needed to flash it to your hardware.',
      'You do not need to be a programmer to use it. If you just want to browse preset designs from characters across the saga and export one to your saber, that works too. If you want to dive deep, build your own blade style from scratch, tune the individual ignition and effect parameters, and hand-craft your dream saber — that also works.',
      'Everything runs in your browser. There is no account to create, no data collected, no server. Your designs are saved locally on your device. If you ever want to share a design with a friend, you can copy a short "Kyber Code" URL that encodes the full config.',
    ],
    list: [
      'Own a Proffieboard? KyberStation generates the ProffieOS C++ code you paste into your config.h file.',
      'Own a CFX, Golden Harvest, Xenopixel, or other board? Compatibility profiles tell you exactly which features work on your hardware, and generated configs use the right format for your board.',
      'Do not own a saber yet? Use KyberStation as a design tool to experiment before you buy.',
      'On mobile? The app is installable as a PWA — add it to your home screen and it runs like a native app.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // 0.5. Your First 5 Minutes (tutorial)
  // ────────────────────────────────────────────────────────
  {
    id: 'first-5-minutes',
    title: 'Your First 5 Minutes',
    content: [
      'The fastest way to understand what KyberStation does is to try it. Here is a short walkthrough — each step takes a few seconds.',
    ],
    subsections: [
      {
        subtitle: '1. Ignite the blade',
        content: [
          'Press Space (or click the IGNITE button in the toolbar). The virtual blade powers on and you see the current style animating. Press Space again to retract it.',
        ],
      },
      {
        subtitle: '2. Try different blade styles',
        content: [
          'Open the Style panel (bottom of the screen). Click through a few styles — Stable, Unstable, Fire, Plasma Storm. The blade updates instantly. Every style has its own character.',
        ],
      },
      {
        subtitle: '3. Trigger combat effects',
        content: [
          'With the blade ignited, press C for Clash, B for Blast, or hold L to toggle Lockup. Press N for Force Lightning. These are the same events that happen when you actually swing a real saber.',
        ],
      },
      {
        subtitle: '4. Change the color',
        content: [
          'Open the Colors panel. Click the color swatch to open the picker and change the base color. The blade updates in real time.',
        ],
      },
      {
        subtitle: '5. Browse character presets',
        content: [
          'Open the Gallery panel. Pick any preset — Obi-Wan Kenobi, Darth Maul, Ahsoka Tano, Kylo Ren, whoever. Click to load their canonical blade configuration. You can customize from there or use it as-is.',
        ],
      },
      {
        subtitle: '6. Export it',
        content: [
          'Open the Output panel and click Generate. For Proffie users, you get a block of ProffieOS C++ code you can paste into your config.h. For other boards, you get the right config format for your hardware.',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 0.75. Glossary (vocabulary help)
  // ────────────────────────────────────────────────────────
  {
    id: 'glossary',
    title: 'Glossary',
    content: [
      'Short definitions for the saber and ProffieOS terms KyberStation uses. Skim this now, or come back when something in the UI is unfamiliar.',
    ],
    list: [
      'Baselit — A blade lit by LEDs at the hilt end, shining up a polycarbonate tube. Simpler than Neopixel, but cannot do per-pixel effects.',
      'Blade strip — The string of addressable LEDs inside a Neopixel blade. Each LED is individually controllable.',
      'Blast — A deflected blaster bolt. Renders as a bright ring at a random position on the blade.',
      'CFX — A premium saber board (Golden Harvest CFX / GHv3 family) with its own sound and config format.',
      'Clash — Blade-on-blade collision. Produces a brief flash at the contact point.',
      'config.h — The main configuration file for ProffieOS firmware. KyberStation generates the style and preset sections of this file.',
      'Drag — Effect for dragging the blade along a surface. Sustained heat glow near the tip.',
      'Flashing — Writing new firmware to your saber board over USB. KyberStation supports in-browser WebUSB flashing for Proffieboard V3.',
      'IMU — Inertial Measurement Unit. The accelerometer and gyroscope inside a saber board that detect swings, clashes, and orientation.',
      'Kyber Code — KyberStation\'s compact URL format for sharing a complete blade design via a single link.',
      'Lockup — When two blades are pressed together and held. Sustained electrical activity at the contact point.',
      'Melt — Effect where the blade is held against a surface and melts through it. Sustained tip glow with molten drip behavior.',
      'Neopixel — An addressable RGB LED (technically WS2812B). A "Neopixel blade" is a blade with a full strip of these LEDs.',
      'Preset — A single saved blade design: style, colors, effects, ignition, and parameters bundled together. Most boards hold multiple presets you cycle through.',
      'Proffieboard — A popular open-source saber board created by Fredrik Hübinette. Runs ProffieOS.',
      'ProffieOS — The open-source firmware that runs on Proffieboards. KyberStation targets ProffieOS 7.x.',
      'Prop file — A C++ header that defines how buttons and gestures control the saber. KyberStation defaults to saber_fett263_buttons.h (Fett263\'s prop).',
      'Responsive style — A style whose animation reacts to motion, swing speed, or other runtime input. Contrasts with a smooth style that animates on its own.',
      'SmoothSwing — A swing-sound system that crossfades between high- and low-intensity swing samples based on actual swing speed. More realistic than single-file swing triggers.',
      'Smooth style — A style whose animation is self-contained and does not require motion input to look alive.',
      'Xenopixel — A budget-friendly saber board, popular with first-time builders. Uses preloaded effect files rather than runtime C++ config.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // 1. Getting Started (UI orientation)
  // ────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    title: 'The Editor Workspace',
    content: [
      'The main editor workspace has three areas: a compact canvas strip at the top showing your blade preview, a toolbar for quick style/effect controls, and a tabbed panel area below for detailed configuration.',
      'Click IGNITE (or press Space) to power on the virtual blade and see your style in action. Use the effect buttons (Clash, Blast, Lockup, etc.) to preview how your saber reacts to combat events. Every change updates the blade preview in real-time.',
      'The tabbed panels at the bottom give you full control: Style for blade style selection, Colors for palette editing, Effects for combat effect tuning, Ignition for ignition/retraction animations, Params for advanced parameters, Audio for sound font management, Gallery for presets, and Output for code generation and SD card export.',
      'KyberStation runs entirely in your browser with no server required — all project data is stored locally in your browser\'s IndexedDB. Clearing site data in your browser will erase your local presets and configurations, so make sure to export any designs you want to keep.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // 2. Blade Styles
  // ────────────────────────────────────────────────────────
  {
    id: 'blade-styles',
    title: 'Blade Styles',
    content: [
      'KyberStation includes 29 blade styles, each with a unique visual character. Select a style from the Style panel and adjust its parameters to create your look.',
    ],
    list: [
      'Stable — Classic solid blade with subtle shimmer. The foundation for most saber builds. Shimmer intensity is adjustable.',
      'Unstable — Flickering, crackling energy with randomized brightness variation. Inspired by Kylo Ren\'s crossguard saber with its cracked kyber crystal.',
      'Fire — Organic flame-like movement along the blade using procedural noise. Hot spots travel from emitter to tip with configurable speed and turbulence.',
      'Pulse — Rhythmic brightness breathing with adjustable frequency. Creates a calm, meditative glow that rises and falls like a heartbeat.',
      'Rotoscope — Film-accurate original trilogy look with discrete color banding. Mimics the hand-painted rotoscoping technique used in the 1977 film.',
      'Gradient — Smooth color transition from emitter to tip. Supports linear, smooth, and stepped interpolation between your base color and a configurable end color.',
      'Photon — Particle-like traveling light pulses that move along the blade. Individual photon dots with adjustable speed, density, and trail length.',
      'Plasma Storm — Chaotic plasma energy with random bursts and crackling arcs. High-energy look with unpredictable movement patterns.',
      'Crystal Shatter — Fractured crystal refraction pattern. The blade appears to be made of broken crystal segments with light refracting through the cracks.',
      'Aurora — Northern-lights flowing color waves. Slow, organic color bands drift along the blade like aurora borealis.',
      'Cinder — Ember and lava-flow with hot spots and cooling dark regions. Embers brighten and fade organically, creating a smoldering blade effect.',
      'Prism — Rainbow light splitting and recombining. White light separates into spectral colors that shift and blend across the blade.',
      'Painted — Hand-painted colors at user-defined positions along the blade, with smooth blending between them. Useful for multi-color gradients and character-specific color zones.',
      'Image Scroll — Scrolls image pixel data across the blade over time. Designed for light-painting photography: wave the saber during a long exposure and the full image appears in the photo.',
      'Gravity — Color pools toward whichever end of the blade points down, using accelerometer input. The center of brightness follows gravity with smooth Gaussian distribution.',
      'Data Stream — Digital data packets traveling from emitter to tip. Multiple concurrent light pulses scroll along the blade like a data bus, each with unique speed and color variation.',
      'Ember — Streams of glowing embers drifting upward along the blade. Multiple ember particles rise with organic movement and height-based dimming.',
      'Automata — Cellular automaton patterns (Rule 30) evolving per frame. Creates complex, self-organizing patterns from simple mathematical rules.',
      'Helix — Double sinusoidal waves at 180\u00b0 offset, creating a DNA-like spiral pattern. The two helices weave around each other along the blade length.',
      'Candle — Realistic candle flame simulation with fractal Brownian motion flicker. Warm gradient with occasional gust events that cause the flame to dance.',
      'Shatter — Deterministic segments with independent pulses and crack highlights. The blade appears fractured into distinct shards, each pulsing independently.',
      'Neutron — A bright point bouncing back and forth along the blade with a phosphor trail. The bouncing particle leaves a glowing afterimage that slowly fades.',
      'Torrent — Rapid streaks of light rushing along the blade like a torrential downpour. Multiple concurrent streams with randomized speed and brightness.',
      'Moire — Interference pattern created by overlapping sine waves at slightly different frequencies. Produces mesmerizing, slowly shifting geometric patterns.',
      'Cascade — Layered waterfalls of color that tumble down the blade in waves. Each cascade layer has independent timing and color variation.',
      'Vortex — Swirling spiral pattern that rotates around the blade axis. The vortex speed responds to swing motion for dynamic visual feedback.',
      'Nebula — Soft, cloud-like color formations that drift and morph along the blade. Inspired by interstellar gas clouds with gentle color gradients.',
      'Tidal — Ocean wave patterns that ebb and flow along the blade length. Simulates tidal motion with cresting waves and foam-like bright edges.',
      'Mirage — Heat-shimmer distortion effect with wavering color bands. The blade appears to ripple like a desert mirage with shifting transparency.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // 3. Effects
  // ────────────────────────────────────────────────────────
  {
    id: 'effects',
    title: 'Effects',
    content: [
      'Effects simulate how your saber responds to combat and Force interactions. KyberStation includes 21 effect types. Each effect has its own configurable color and behavior. Transient effects fire once and fade, while sustained effects stay active until released.',
    ],
    list: [
      'Clash (key: C) — Brief flash when blades collide. Creates a bright burst at the clash position. Configurable location and intensity.',
      'Blast (key: B) — Blaster bolt deflection. Creates a ring of light at a random position along the blade. Configurable count (1-5 simultaneous marks) and spread.',
      'Stab (key: S) — Tip-focused flash when thrusting forward. A bright flare concentrated at the blade tip with configurable depth.',
      'Lockup (key: L) — Sustained sparking when blades are locked together. Press L to engage, press again to release. Creates continuous electrical activity at the contact point.',
      'Lightning (key: N) — Force lightning block with electrical arcing along the entire blade. Sustained effect — press N to toggle. Branching arc patterns travel from hilt to tip.',
      'Drag (key: D) — Blade dragged along a surface. Sustained effect near the tip with heat-glow behavior. Press D to toggle.',
      'Melt (key: M) — Blade melting through a surface. Sustained tip glow with molten drip effect. Press M to toggle.',
      'Force (key: F) — Force push/pull effect. Blade-wide color shift and brightness pulse that ripples along the entire blade.',
      'Shockwave (key: W) — Two bright rings expand outward from the impact point in both directions, dimming as they travel. Creates a dramatic ripple effect from clash events.',
      'Scatter — 20-30 random pixel positions flash simultaneously across the blade, creating a scattered sparkle burst effect.',
      'Fragment — The blade splits into 5-8 distinct segments with expanding dark gaps between them, as if the blade is breaking apart.',
      'Ripple — Three concentric rings with cosine-shaped profiles emanate from the trigger point, creating a water-ripple effect along the blade.',
      'Freeze — An icy crystal pattern spreads from the contact point, gradually covering the blade with a cold blue-white overlay before snapping back.',
      'Overcharge — Brightness ramps up dramatically with unstable flicker, simulating a power surge, followed by a dim dip as the saber recovers.',
      'Bifurcate — The blade color splits into warm and cool halves at the trigger point, as if the kyber crystal\'s energy is being divided.',
      'Invert — Instantly inverts all blade colors to their complementary values. The blade flashes to its negative image before snapping back.',
      'Ghost Echo — A translucent afterimage of the blade\'s previous state lingers and slowly fades, creating a ghostly double-vision trail effect.',
      'Splinter — Sharp crystalline fracture lines shoot out from the trigger point, splitting the blade into jagged splinter segments that briefly separate.',
      'Coronary — A bright corona flare erupts around the blade, radiating intense light outward from the blade surface like a solar prominence.',
      'Glitch Matrix — Digital corruption artifacts scramble sections of the blade into random pixel noise and color channel shifts, as if the kyber crystal is malfunctioning.',
      'Siphon — Energy visibly drains from the blade toward the trigger point, darkening the extremities while concentrating brightness at the center of the effect.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // 4. Ignition & Retraction
  // ────────────────────────────────────────────────────────
  {
    id: 'ignition',
    title: 'Ignition & Retraction',
    content: [
      'Control how your blade extends and retracts with different animation styles. Ignition and retraction can be set independently — you can pair any ignition type with any retraction type. Timing is adjustable via the Ignition Duration and Retraction Duration sliders.',
    ],
    subsections: [
      {
        subtitle: 'Ignition Types',
        list: [
          'Standard — Linear extend from emitter to tip. The classic lightsaber ignition.',
          'Scroll — Fast scroll-up with slight acceleration. The fill edge moves rapidly with an ease-out feel.',
          'Spark — Sparking particles lead the ignition wave. A bright spark tip travels ahead of the fill edge, leaving a trail of particles.',
          'Center Out — Blade extends from the center outward in both directions simultaneously.',
          'Wipe — Color wipe transition with a soft gradient edge. The softness of the leading edge is adjustable.',
          'Stutter — Choppy, glitchy ignition with oscillating pauses. The blade extends, retreats slightly, then surges forward repeatedly. Configurable stutter count and amplitude.',
          'Glitch — Digital glitch effect with random pixel-level artifacts during ignition. Segments flicker on and off with configurable density and intensity.',
          'Twist — Spiral ignition pattern. Pixels illuminate in a rotational sweep, with the spiral direction influenced by your motion input (twist angle).',
          'Swing — Speed-reactive ignition. The blade fills faster when swing speed is higher. At rest the fill is smooth; at high swing speed it accelerates with a bright leading edge.',
          'Stab — Rapid center-out burst ignition. Inspired by the stab-on gesture. A bright flash at the center explodes outward in both directions.',
          'Custom Curve — User-defined cubic Bezier ignition profile. Draw a custom curve that shapes how the blade fills across its length. Full control over the ignition timing envelope.',
          'Crackle — Random segments flicker on during ignition like an unstable power-up. Per-LED probability increases over the ignition duration, creating a chaotic, organic fill-in.',
          'Fracture — Seven crack points radiate outward from random positions, illuminating the blade in a spreading fracture pattern.',
          'Flash Fill — A bright white flash illuminates the entire blade, then a base-to-tip color wipe fills in the actual blade color.',
          'Pulse Wave — Four sequential energy waves, each reaching further along the blade than the last, building up to full ignition.',
          'Drip Up — Fluid upward flow with leading drip particles. The blade fills like liquid being poured upward with surface tension effects.',
          'Hyperspace — The blade streaks to life like stars elongating into hyperspace lines. LEDs stretch from the emitter in accelerating trails that snap into a solid blade.',
          'Summon — Force-pull ignition where the blade materializes from the tip inward, as if being summoned from a distance. Particles converge toward the hilt before solidifying.',
          'Seismic — Ground-shaking ignition with concentric shock rings expanding from the emitter. The blade builds in pulsing waves like seismic tremors.',
        ],
      },
      {
        subtitle: 'Retraction Types',
        content: [
          'Retraction animations play in reverse when the blade powers down. Most ignition types can also be used as retractions. These additional retraction-specific types are available:',
        ],
        list: [
          'Standard — Linear retract from tip to hilt.',
          'Scroll — Fast scroll retraction with deceleration.',
          'Center In — Blade retracts from both ends toward the center.',
          'Fadeout — The entire blade dims progressively instead of retracting with a hard edge. The tip fades faster than the hilt, creating a ghostly power-down.',
          'Shatter — The blade fragments and dissolves like shattering crystal. Noise-driven fragments disappear as retraction progresses, with configurable fragment scale and dim speed.',
          'Custom Curve — Same Bezier curve system as ignition, applied in reverse for retraction.',
          'Dissolve — Pixels randomly turn off in a shuffled order like analog TV static dying. Each LED flickers briefly before going dark.',
          'Flicker Out — A dead zone advances from tip to base with a flickering band at the boundary. LEDs in the flicker zone flash erratically before going dark.',
          'Unravel — The blade appears to unwind like a thread being pulled. A sinusoidal tension pattern travels along the blade with a trailing afterimage.',
          'Drain — Smooth gravity-like drain from tip to base with a meniscus curve at the leading edge and occasional residual drips left behind.',
          'Implode — The blade collapses inward toward its center from both ends simultaneously, compressing into a bright point before vanishing.',
          'Evaporate — The blade dissipates like steam, with brightness fading unevenly as if the energy is boiling away into the air.',
          'Spaghettify — The blade stretches and thins like matter falling into a black hole. Segments elongate and narrow before disappearing into a point.',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 5. Keyboard Shortcuts
  // ────────────────────────────────────────────────────────
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    content: [
      'Use these keyboard shortcuts for quick access in the editor. Shortcuts are disabled when typing in text inputs.',
    ],
    list: [
      'Space — Toggle ignition (Ignite / Retract)',
      'C — Trigger Clash effect (one-shot)',
      'B — Trigger Blast effect (one-shot)',
      'S — Trigger Stab effect (one-shot)',
      'F — Trigger Force effect (one-shot)',
      'L — Toggle Lockup effect (sustained — press again to release)',
      'N — Toggle Lightning effect (sustained — press again to release)',
      'D — Toggle Drag effect (sustained — press again to release)',
      'M — Toggle Melt effect (sustained — press again to release)',
      'W — Trigger Shockwave effect (one-shot)',
      'R — Trigger Fragment effect (one-shot)',
      'V — Trigger Bifurcate effect (one-shot)',
      'G — Trigger Ghost Echo effect (one-shot)',
      'P — Trigger Splinter effect (one-shot)',
      'E — Trigger Coronary effect (one-shot)',
      'X — Trigger Glitch Matrix effect (one-shot)',
      'H — Trigger Siphon effect (one-shot)',
      'Escape — Exit fullscreen preview',
      'O — Toggle fullscreen orientation (horizontal/vertical)',
      'Cmd+Z — Undo last change',
      'Cmd+Shift+Z — Redo last undone change',
      'Cmd+Y — Redo (alternative)',
    ],
  },

  // ────────────────────────────────────────────────────────
  // 6. Parameters
  // ────────────────────────────────────────────────────────
  {
    id: 'parameters',
    title: 'Parameters',
    content: [
      'The Parameters panel gives deep control over blade behavior beyond basic style and color. Parameters are organized into groups, with a quick-access bank at the top showing the six most commonly used sliders: Shimmer, Noise, Swing FX, Hue Shift, Wave, and Emitter.',
    ],
    subsections: [
      {
        subtitle: 'Shimmer',
        list: [
          'Controls the baseline brightness variation of the blade. At 0% the blade is perfectly smooth; at higher values it gains a subtle sparkling texture. Works with all blade styles.',
        ],
      },
      {
        subtitle: 'Noise & Texture',
        list: [
          'Scale — Spatial scale of the Perlin noise pattern (1-100). Low values create fine grain, high values create broad bands.',
          'Speed — Animation speed of the noise pattern (0-100). Controls how quickly the texture shifts.',
          'Octaves — Fractal detail layers (1-6). More octaves add finer detail on top of the base pattern.',
          'Turbulence — Distortion amount (0-100). Warps the noise field for more chaotic textures.',
          'Intensity — How much the noise pattern affects blade color (0-100). At 0% noise has no effect; at 100% it fully modulates the blade.',
        ],
      },
      {
        subtitle: 'Motion Reactivity',
        list: [
          'Swing Sensitivity — How much swing speed affects the blade (0-100). Higher values make the blade more responsive to movement.',
          'Angle Influence — How much blade tilt affects the look (0-100). The blade can shift color or brightness based on whether it points up or down.',
          'Twist Response — How much wrist twist affects the blade (0-100). Twist can modulate patterns and color shifts.',
          'Smoothing — How smoothly motion input transitions (0-100). Higher values create gradual, flowing reactions; lower values are snappy.',
          'Swing Brighten — Brightness boost on swing (0-100). The blade gets brighter during fast swings.',
          'Swing Color — An optional color that the blade shifts toward during swings.',
        ],
      },
      {
        subtitle: 'Color Dynamics',
        list: [
          'Hue Shift Speed — Rainbow hue rotation speed (0-100). At 0 the color is static; higher values cycle through the hue spectrum.',
          'Saturation Pulse — Saturation breathing amount (0-100). The blade\'s color saturation rises and falls rhythmically.',
          'Brightness Wave — Brightness wave amplitude (0-100). A sine wave modulates brightness along the blade.',
          'Flicker Rate — Random flicker frequency (0-100). How often the blade brightness dips randomly.',
          'Flicker Depth — How deep flicker dips (0-100). Controls the minimum brightness during a flicker event.',
        ],
      },
      {
        subtitle: 'Spatial Patterns',
        list: [
          'Wave Frequency — Number of wave cycles along the blade (1-20). More cycles create tighter patterns.',
          'Wave Speed — How fast waves travel along the blade (0-100).',
          'Direction — Pattern direction: Hilt-to-Tip, Tip-to-Hilt, Center-Out, or Edges-In.',
          'Spread — How wide patterns spread across the blade (0-100).',
          'Phase — Phase offset in degrees (0-360). Useful for synchronizing or offsetting patterns on multi-blade sabers.',
        ],
      },
      {
        subtitle: 'Tip & Emitter',
        list: [
          'Tip Color — A different color at the blade tip, blended with the base color.',
          'Tip Length — How far the tip color extends (0-50% of blade length).',
          'Tip Fade — Smoothness of the transition between base color and tip color (0-100).',
          'Emitter Flare — Brightness boost at the emitter (hilt) end of the blade (0-100). Simulates the crystal glow at the blade\'s origin.',
          'Emitter Flare Width — How far the emitter flare extends up the blade (0-50%).',
        ],
      },
      {
        subtitle: 'Blend Modes',
        list: [
          'Blend Mode — How the blade style composites with other layers: Normal, Additive, Multiply, Screen, or Overlay.',
          'Secondary Style — An optional second style to blend with the primary. Choose from any of the 29 blade styles.',
          'Mix Amount — How much of the secondary style shows through (0-100%).',
          'Mask — Pattern used to blend between primary and secondary: None, Gradient, Noise, or Wave.',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 7. Power Draw
  // ────────────────────────────────────────────────────────
  {
    id: 'power-draw',
    title: 'Power Draw & Battery',
    content: [
      'Understanding power draw is important for real-world saber operation. Neopixel blades use WS2812B LEDs, and each LED\'s power draw depends on the color being displayed.',
    ],
    subsections: [
      {
        subtitle: 'WS2812B LED Power',
        list: [
          'Each WS2812B LED contains three sub-pixels: Red, Green, and Blue. Each sub-pixel draws up to 20mA at full brightness.',
          'Maximum per LED: 60mA (all three channels at 255). A full white blade at max brightness draws the most current.',
          'A typical 132-LED blade (36") at full white draws: 132 x 60mA = 7.92A theoretical maximum. In practice, ProffieOS limits brightness to stay within safe limits.',
          'Colored blades draw less: a pure red blade uses only the red channel (20mA/LED). Blue and green are similar. Mixed colors fall in between.',
        ],
      },
      {
        subtitle: 'Battery Estimation',
        list: [
          'Proffieboard sabers typically use a single 18650 Li-ion cell (3.7V nominal, 3000-3500mAh capacity).',
          'Realistic draw at normal brightness settings: 1.5A-3A depending on style complexity and color.',
          'A 3000mAh battery at ~2A average draw gives roughly 90 minutes of continuous on-time. Actual usage with ignition/retraction cycles and standby extends this significantly.',
          'Bright whites and complex multi-layer styles draw more power. Simple single-color styles are the most efficient.',
        ],
      },
      {
        subtitle: 'Proffieboard Limits',
        list: [
          'The Proffieboard\'s power FET can handle approximately 5A continuous current for blade power.',
          'ProffieOS includes configurable global brightness limiting (maxLedsPerStrip setting) to cap total current draw.',
          'Exceeding the 5A limit risks brownouts, board resets, or component damage. KyberStation\'s storage budget panel estimates per-style power impact to help you stay within safe limits.',
          'Multi-blade setups (staff, crossguard) multiply the draw — a dual-blade staff uses roughly twice the current of a single blade.',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 8. Code Generation & Export
  // ────────────────────────────────────────────────────────
  {
    id: 'code-export',
    title: 'Code Generation & Export',
    content: [
      'KyberStation generates valid ProffieOS 7.x C++ code from your blade configuration. The code generator builds an AST (Abstract Syntax Tree) of ProffieOS style templates, validates it, and emits properly formatted code that compiles in Arduino IDE with the Proffieboard board manager installed.',
    ],
    subsections: [
      {
        subtitle: 'Generated Code',
        list: [
          'KyberStation produces complete StylePtr<> declarations using standard ProffieOS templates: Layers<>, BlastL<>, SimpleClashL<>, LockupTrL<>, InOutTrL<>, and all standard transitions.',
          'The code uses Rgb<> for colors, Mix<> and Gradient<> for color blending, and responsive functions like Scale<>, SwingSpeed<>, and BladeAngle<>.',
          'All angle brackets are correctly nested and matched. Template arguments are validated before emission.',
          'Copy the generated style code from the Output tab and paste it into the presets[] array in your config.h file.',
        ],
      },
      {
        subtitle: 'SD Card Export',
        list: [
          'The SD Card Writer generates a complete download package from your active Saber Profile.',
          'The ZIP archive contains: a valid config.h with all presets, blade definitions, and Fett263 prop file settings, plus the correct sound font directory structure.',
          'Board selection (Proffieboard V2.2 or V3.9) determines the correct pin mappings and feature flags in the generated config.',
          'Extract the ZIP to your SD card root. The directory structure maps font folder names to preset entries.',
        ],
      },
      {
        subtitle: 'config.h Structure',
        content: [
          'The generated config.h follows the standard ProffieOS structure:',
        ],
        list: [
          '#ifdef CONFIG_TOP — Board settings, feature flags, maxLedsPerStrip, and #include directives.',
          '#ifdef CONFIG_PROP — Prop file selection (defaults to saber_fett263_buttons.h for full button controls).',
          '#ifdef CONFIG_PRESETS — Your blade presets array with StylePtr<> entries, each linked to a sound font directory.',
          '#ifdef CONFIG_STYLES — Style definitions referenced by the presets section.',
          'Blade definitions follow each preset array, specifying WS2811 data pins, LED counts, and power pin assignments.',
        ],
      },
      {
        subtitle: 'Sharing & Backup',
        list: [
          'Single Config (.kyberstation.json) — Export/import the current editor state as a file.',
          'Preset Collection (.kyberstation-collection.json) — Bundle multiple user presets with thumbnails for sharing.',
          'Card Template (.kyberstation-card.json) — Share a card config. Font paths are stripped but folder names are preserved.',
          'Kyber Code (URL) — Share a style as a compact URL using JSON, deflate-raw, and base64url encoding. Anyone with the link loads your style instantly.',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // Flashing cross-reference
  // ────────────────────────────────────────────────────────
  {
    id: 'flashing',
    title: 'Flashing Your Saber',
    content: [
      'Once you have a design you like, the final step is getting the config onto your board. KyberStation stops at "generate the code" — the actual flash depends on which board you own.',
    ],
    subsections: [
      {
        subtitle: 'Proffieboard V3 via WebUSB (easiest)',
        content: [
          'Open the Flash to Saber panel in the Output tab. Connect your board in DFU mode (hold the BOOT button while plugging in USB), pick a firmware variant, acknowledge the risk disclaimer, and click Flash. The entire process happens in the browser — no Arduino IDE and no driver installation on macOS. Requires a Chromium-based browser.',
        ],
      },
      {
        subtitle: 'Proffieboard via Arduino CLI (traditional path)',
        content: [
          'If you prefer the classic workflow — or need to flash a Proffieboard V2 — the complete step-by-step guide is in the repository under docs/PROFFIEOS_FLASHING_GUIDE.md. It covers cable selection, board manager installation, the exact compile and upload commands, the config.h section structure, and every code-generation bug we have seen with its fix. The guide has been validated against real hardware (Proffieboard V3.9, ProffieOS 7.x).',
        ],
      },
      {
        subtitle: 'Non-Proffie boards',
        content: [
          'CFX, Golden Harvest, Xenopixel, Verso, and other non-Proffie boards each have their own flashing tool. KyberStation produces the correct config format for your board — the board maker\'s documentation tells you how to apply it. Consult the support resources that came with your saber.',
        ],
      },
      {
        subtitle: 'Before you flash — back things up',
        content: [
          'Back up your SD card contents and your original config.h before flashing. The Proffieboard has readout protection enabled: once you flash, the previous firmware and config cannot be recovered from the board. The flashing guide includes a pre-flash backup checklist.',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // Scene Themes (existing)
  // ────────────────────────────────────────────────────────
  {
    id: 'scene-themes',
    title: 'Scene Themes',
    content: [
      'Scene themes transform the entire UI to match iconic Star Wars locations. Each theme changes every color in the interface — backgrounds, accents, borders, text, and canvas ambiance.',
    ],
    list: [
      'Deep Space — Cool void with electric blue accents (default)',
      'Tatooine — Sandy gold with warm amber tones',
      'Bespin — Sunset coral, Cloud City warmth',
      'Dagobah — Swamp emerald with vivid green',
      'Mustafar — Volcanic ember, fiery red-orange',
      'Hoth — Icy blue, frozen tundra feel',
      'Coruscant — Neon midnight, purple-blue cityscape',
      'Endor — Forest moonlit, natural green',
      'Death Star — Industrial steel, cold metallic gray',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Effect Comparison (existing)
  // ────────────────────────────────────────────────────────
  {
    id: 'effect-comparison',
    title: 'Effect Comparison View',
    content: [
      'Click "FX Compare" in the toolbar to see all 8 effects rendered simultaneously as stacked blade strips. Each row shows how a different effect looks on your current blade style and colors.',
      'This is invaluable for tuning effect colors — you can see at a glance how clash, blast, lockup, and other effects contrast with your base blade color.',
      'Transient effects (Clash, Blast, Stab, Force) retrigger automatically so you can observe their animation cycle. Sustained effects (Lockup, Lightning, Drag, Melt) remain active continuously.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Hardware (existing)
  // ────────────────────────────────────────────────────────
  {
    id: 'hardware',
    title: 'Blade Hardware',
    content: [
      'Configure your physical saber hardware to match the simulation:',
    ],
    list: [
      'Blade Type — Single, Staff/Double, Crossguard, Triple, Quad Star, Inquisitor, Split, or Accent LEDs',
      'Hilt Style — Choose from 9 hilt designs (Minimal, Classic ANH, Graflex ESB, etc.)',
      'Strip Type — Neopixel (1-4 strips) or In-Hilt (Tri/Quad/Penta Cree)',
      'Blade Length — 24" to 40" (LED count adjusts automatically: 88 to 147 LEDs at ~3.66 LEDs/inch)',
      'Blade Diameter — 3/4", 7/8", or 1" tubes',
      'Diffusion — None, Light, Medium, or Heavy diffusion tube simulation',
    ],
  },

  // ────────────────────────────────────────────────────────
  // User Presets (existing)
  // ────────────────────────────────────────────────────────
  {
    id: 'user-presets',
    title: 'User Presets (My Presets)',
    content: [
      'Save any blade configuration as a reusable preset in your personal collection. User presets persist in your browser\'s IndexedDB storage and survive page reloads.',
      'Open the Gallery tab and click "Save Current" to snapshot your active style, colors, and settings. Give it a name, optional description, tags, and a font association.',
    ],
    list: [
      'Save As Preset — Captures the current blade config including style, all colors, ignition, effects, and parameters. Automatically generates a thumbnail from the blade canvas.',
      'My Presets tab — Browse, search, sort (newest, A-Z, recently modified), and filter by tags. Click a preset to load it into the editor.',
      'Font Association — Link a sound font to a preset. When the font library is connected, loading a preset auto-loads its paired font.',
      'Edit / Duplicate / Delete — Right-click or use the overflow menu on any preset card for management actions.',
      'Name Conflicts — If you save with an existing name, choose "Update Existing" to overwrite or "Save as New" to create a copy.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Font Library (existing)
  // ────────────────────────────────────────────────────────
  {
    id: 'font-library',
    title: 'Font Library',
    content: [
      'The Font Library lets you point KyberStation at your local sound font collection folder. It scans all subdirectories, detects font formats (Proffie, CFX, Generic), and shows completeness at a glance. Requires a Chromium-based browser (Chrome, Edge, Arc).',
      'Go to the Audio tab and click the "Library" sub-tab. Click "Set Font Library Folder" and select your top-level font directory.',
    ],
    list: [
      'Auto-Scan — After selecting a folder, KyberStation scans every subdirectory for sound files. It counts files per category (hum, swing, clash, etc.) and detects SmoothSwing pairs.',
      'Completeness Indicator — Each font shows a dot: green (complete — all essential categories present), yellow (partial — some missing), or red (minimal). Hover for a text label.',
      'Search & Sort — Filter fonts by name. Sort alphabetically, by file count, or by completeness.',
      'Load — Click "Load" on any font to decode and activate it as the current sound font for preview playback.',
      'Pair — Associate a font with your current preset so they auto-load together.',
      'Refresh — Re-scan the folder to pick up newly added fonts.',
      'Persistent Handle — Your folder selection is saved in IndexedDB. On next visit, KyberStation re-requests access to the same directory without you needing to re-pick it.',
      'Non-Chromium Fallback — On Firefox/Safari, the Library tab shows a notice. You can still import individual fonts via drag-and-drop in the Sound Fonts tab.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Saber Profiles (existing)
  // ────────────────────────────────────────────────────────
  {
    id: 'saber-profiles',
    title: 'Saber Profiles & Card Presets',
    content: [
      'Saber Profiles represent a complete saber identity — a named collection of blade presets (a "card") ready to write to an SD card. Each profile can hold multiple Card Configs (e.g., "Dueling Set", "Display Set"), and each card config contains an ordered list of preset entries.',
      'Find Saber Profiles in the Output tab under the "Saber Profiles" section.',
    ],
    list: [
      'Create Profile — Click "+ New Profile" and give it a name (e.g., "Main Saber", "Dueling Setup"). Each profile tracks its own board selection, blade count, and presets.',
      'Card Configs — Each profile has one or more named card configs. The active config is what gets exported. Use the dropdown to switch, rename, duplicate, or delete configs.',
      'Card Preset Composer — Build your preset list by adding from the Gallery, from My Presets, or snapshotting the current editor state. Drag to reorder (or Alt+Up/Down for keyboard).',
      'Preset Entries — Each entry shows its position number, color swatch, style label, font assignment, and source badge (Built-in, Custom, or Inline).',
      'Starter Templates — Use the "Starter Templates" dropdown to bulk-add curated preset collections: Original Trilogy Essentials, Prequel Collection, Dark Side Pack, or Dueling Minimalist.',
      'Font Assignments — Set the font folder name for each entry. This maps to the SD card directory structure.',
      'Storage Budget — See estimated flash memory usage per entry and total for the card. Budget varies by style complexity (simple ~3KB, medium ~7KB, heavy ~12KB).',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Audio Mixer (existing)
  // ────────────────────────────────────────────────────────
  {
    id: 'audio-mixer',
    title: 'Audio EQ & Effects',
    content: [
      'The Audio tab includes a built-in mixer for shaping your sound font\'s audio output in real-time. Preview how your saber will sound with different EQ and effect settings.',
    ],
    list: [
      'EQ — 3-band equalizer (Bass, Mid, Treble) with +/-12dB range. Shape the tonal character of your hum, swings, and clashes.',
      'Effects — Distortion, Reverb, Echo/Delay, Chorus, Phaser, Bitcrusher, and Pitch Shift. Each has 0-100% wet mix.',
      'Effect Presets — Save and recall mixer configurations. Includes built-in presets for common sound profiles.',
      'Live Preview — All changes apply in real-time to the currently loaded font. Trigger sound events (hum, swing, clash) to hear the effect.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Accessibility (existing)
  // ────────────────────────────────────────────────────────
  {
    id: 'accessibility',
    title: 'Accessibility',
    content: [
      'KyberStation includes accessibility features to ensure the editor is usable by everyone.',
    ],
    list: [
      'Text Sizing — Adjust UI text size from the Accessibility panel in settings.',
      'Reduced Motion — Respects your OS "prefers-reduced-motion" setting on first load. Also toggleable manually in the Accessibility panel. Disables canvas animations and UI transitions.',
      'Touch Targets — All interactive elements meet minimum 44x44px touch target size for mobile and tablet use.',
      'Keyboard Navigation — Full keyboard support throughout the editor. Tab to navigate, Enter/Space to activate, Escape to close modals.',
      'Drag-and-Drop Alternatives — Anywhere you can drag to reorder (preset lists, timeline events), you can also use Alt+Up/Down to move items with the keyboard.',
      'ARIA Labels — All controls have descriptive ARIA labels for screen reader support.',
      'Focus Traps — Modals and dialogs trap focus within the dialog until dismissed.',
      'Color-Only Indicators — Status indicators (completeness dots, active states) include text labels alongside color coding.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Workbench Layout
  // ────────────────────────────────────────────────────────
  {
    id: 'workbench-layout',
    title: 'Workbench Layout',
    content: [
      'The desktop editor uses a horizontal workbench layout with the blade preview at the top and a multi-column panel workspace below. The layout automatically adapts to your screen width: 4 columns at 1440px+, 3 columns at 1200px+, 2 columns at 1024px+, and single column on smaller screens.',
      'Panels within each tab can be dragged between columns to customize your workspace. Collapse panels you don\'t need by clicking their header. Save your preferred layout as a preset in Settings for quick recall.',
    ],
    list: [
      'Header Bar — App logo, undo/redo buttons, FPS counter, share button (Kyber Code), global pause toggle, settings gear, and documentation link.',
      'Blade Canvas — Horizontal blade preview with the visualization stack below it. Toggle individual analysis layers on/off.',
      'Tab Bar — Five top-level tabs organize all controls: Design, Dynamics, Audio, Gallery, and Output.',
      'Column Grid — Drag panels between columns to arrange your ideal workspace. Save layout presets from Settings.',
      'Status Bar — Real-time power draw estimate (mA vs 5A limit), storage budget percentage, and LED count.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Visualization Stack
  // ────────────────────────────────────────────────────────
  {
    id: 'visualization-stack',
    title: 'Visualization Stack',
    content: [
      'The visualization stack sits below the blade canvas and provides detailed analysis layers that help you understand exactly what your blade is doing at every pixel.',
    ],
    list: [
      'Pixel Strip — Shows the raw LED colors as a strip of discrete pixels, matching your physical blade.',
      'R / G / B Channels — Individual red, green, and blue channel intensity graphs.',
      'Luminance — Perceived brightness graph across the blade length.',
      'Power Draw — Estimated milliamp draw per LED based on color values.',
      'Hue — Hue angle distribution across the blade.',
      'Saturation — Color saturation graph.',
      'Effect Overlay — Highlights which portions of the blade are currently affected by active effects.',
      'Swing Response — Shows how swing speed is influencing the current frame.',
      'Transition Progress — Displays ignition/retraction animation progress.',
      'Storage Budget — Estimated flash memory usage visualization.',
      'Debug Mode — Click the debug icon to enable per-pixel inspection. Hover any pixel for a tooltip showing RGB, hex, HSL, power draw (mA), and Star Wars color name. Click to pin an info card. Select ranges for comparison.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Fullscreen Preview
  // ────────────────────────────────────────────────────────
  {
    id: 'fullscreen-preview',
    title: 'Fullscreen Preview',
    content: [
      'Enter fullscreen mode from the toolbar to see your blade in an immersive, distraction-free view. The blade takes over the entire viewport with a dark background.',
    ],
    list: [
      'Orientation — Toggle between horizontal and vertical blade orientation with the O key or the orientation button.',
      'Control Bar — Auto-hides after 3 seconds of inactivity. Move your mouse or touch the screen to reveal it.',
      'Effect Triggers — Use keyboard shortcuts (C, B, S, L, N, D, M, F) to trigger effects in fullscreen.',
      'Mobile Motion — On mobile devices, enable the motion toggle to use your device\'s accelerometer and gyroscope. Tilt and swing your phone to drive blade angle and swing speed in real-time.',
      'Exit — Press Escape or click the X button to return to the editor.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Settings
  // ────────────────────────────────────────────────────────
  {
    id: 'settings',
    title: 'Settings',
    content: [
      'Access the global settings panel from the gear icon in the header bar. Settings are organized into five sections and persist across sessions.',
    ],
    list: [
      'Performance Tier — Choose Full (all animations and effects), Medium (reduced particle counts), or Lite (minimal animations). Lower tiers improve performance on older devices.',
      'Aurebesh Mode — Toggle Aurebesh script rendering: Off (standard English), Labels Only (UI labels in Aurebesh), or Full (all text in Aurebesh). A fun Star Wars immersion feature.',
      'UI Sounds — Enable Star Wars-style beep and chirp sound effects for UI interactions. Choose from preset sound packs and adjust volume per category. Defaults to off.',
      'Layout Presets — Save, load, and delete custom workbench column arrangements. Each preset remembers which panels are in which columns.',
      'Display — Toggle FPS counter visibility and configure which visualization layers appear by default.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Global Pause
  // ────────────────────────────────────────────────────────
  {
    id: 'global-pause',
    title: 'Global Pause',
    content: [
      'The pause button in the header bar (\u23f8) freezes all animations across the entire application. This is useful when the blade preview feels visually overwhelming, or when you want to inspect a specific frame of an animation.',
      'When paused, the blade canvas keeps its last rendered frame visible, but the engine stops updating. All CSS animations across the app are also frozen. Press the button again (or Space when not in a text field) to resume.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Undo / Redo
  // ────────────────────────────────────────────────────────
  {
    id: 'undo-redo',
    title: 'Undo / Redo',
    content: [
      'KyberStation tracks changes to your blade configuration and lets you step backward and forward through your edit history. The undo/redo buttons in the header bar show tooltips describing what will be undone or redone.',
      'History is session-only (not persisted across page reloads) and stores up to 50 entries. Changes are debounced by 300ms to avoid flooding the history with rapid slider adjustments.',
    ],
    list: [
      'Cmd+Z (Mac) or Ctrl+Z (Windows) — Undo the last change.',
      'Cmd+Shift+Z or Cmd+Y — Redo the last undone change.',
      'Each history entry is labeled with a human-readable description of what changed (e.g., "Change base color", "Switch to Fire style").',
    ],
  },

  // ────────────────────────────────────────────────────────
  // Troubleshooting
  // ────────────────────────────────────────────────────────
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: [
      'The common rough edges and how to get past them. If you hit something that is not listed here, please file an issue — the more specific reports come in, the more complete this section gets over time.',
    ],
    subsections: [
      {
        subtitle: 'The blade preview looks frozen or never starts',
        content: [
          'Browsers block autoplaying animations and audio until you interact with the page. Click anywhere in the editor — or press Space to ignite — and the engine starts. If the FPS counter in the header stays at zero, try a hard refresh (Cmd/Ctrl+Shift+R).',
        ],
      },
      {
        subtitle: 'Colors look different on my real blade than in the preview',
        content: [
          'The in-browser preview approximates WS2812B gamma and diffusion-tube softening, but the real blade also depends on LED type, diffuser thickness, ambient lighting, and your camera\'s white balance. Treat the preview as a design guide, not a pixel-perfect match. For closer results, adjust the Diffusion setting in the Hardware panel to match your physical blade.',
        ],
      },
      {
        subtitle: 'Generated code will not compile',
        content: [
          'KyberStation emits the blade style code that goes inside your config.h — not a complete standalone file. You still need the CONFIG_TOP, CONFIG_PROP, and CONFIG_BUTTONS sections with their #include lines. The most common errors are: missing maxLedsPerStrip, missing SaberBase:: prefix on lockup types, and placing the prop #include in the wrong section. Every known error has an entry in the Flashing Guide\'s "Code Generation Bugs and Fixes" table — see the Flashing Your Saber section above for the link.',
        ],
      },
      {
        subtitle: 'Sound fonts not detected by the Font Library',
        content: [
          'The Font Library uses the File System Access API, which is only available in Chromium-based browsers (Chrome, Edge, Arc, Brave). On Firefox and Safari you will see a notice — use drag-and-drop in the Sound Fonts tab to load individual fonts instead.',
        ],
      },
      {
        subtitle: 'My presets disappeared',
        content: [
          'Presets live in your browser\'s IndexedDB. Clearing site data, switching browser profiles, or opening the app in an incognito / private window resets that storage. To keep a backup, open the Output tab and export your preset collection as a .kyberstation-collection.json file. You can re-import it later on any device.',
        ],
      },
      {
        subtitle: 'WebUSB flash fails to connect',
        content: [
          'The board has to be in DFU mode before WebUSB can talk to it — hold the BOOT button while plugging in USB, or use the specific BOOT-button sequence for your board. Only Chromium-based browsers support WebUSB. macOS does not need driver installation; on Windows you may need to install the ST generic WinUSB driver via Zadig. The full recovery procedure is in docs/WEBUSB_FLASH.md.',
        ],
      },
      {
        subtitle: 'The editor feels slow on my laptop or phone',
        content: [
          'Open Settings → Performance Tier and drop to Medium or Lite. That alone reclaims most of the frame budget. You can also disable the visualization stack and the per-pixel debug overlay — those are the heaviest components. Older mobile devices run best in Lite mode with the fullscreen preview.',
        ],
      },
      {
        subtitle: 'Blade appears too short or too long',
        content: [
          'Check the Blade Length setting in the Hardware panel. LED count adjusts automatically (roughly 3.66 LEDs per inch) but must match the actual LED count in your physical blade — mismatched counts leave the tip dark or overflow the strip.',
        ],
      },
      {
        subtitle: 'The PWA install icon does not appear',
        content: [
          'Only Chromium browsers show the install icon in the address bar. Safari on iOS uses Share → Add to Home Screen. Firefox does not install PWAs. Details for each platform are in the Installing section below.',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // Installing KyberStation (PWA)
  // ────────────────────────────────────────────────────────
  {
    id: 'installing',
    title: 'Installing KyberStation',
    content: [
      'KyberStation is a Progressive Web App (PWA). You can install it to your desktop or mobile device so it launches from its own icon, runs in its own window, and works offline after the first visit. There is no app store download, no account creation, and no installer to run.',
    ],
    subsections: [
      {
        subtitle: 'Desktop (Chrome, Edge, Brave, Arc)',
        content: [
          'Look for a small install icon in the right side of the address bar — it looks like a monitor with a downward arrow. Click it, then confirm "Install". KyberStation will appear in your Applications folder (macOS) or Start menu (Windows). It launches in its own window, separate from the browser.',
          'You can uninstall at any time by opening the installed app, clicking the three-dot menu, and choosing "Uninstall KyberStation".',
        ],
      },
      {
        subtitle: 'iPhone and iPad (Safari)',
        content: [
          'Tap the Share button at the bottom of Safari. Scroll down in the share sheet and tap "Add to Home Screen". Confirm the name and tap Add. KyberStation appears as a home-screen icon and launches full-screen like a native app.',
        ],
      },
      {
        subtitle: 'Android (Chrome)',
        content: [
          'Chrome will often prompt "Install KyberStation" at the bottom of the screen on your first visit. If it does not, open the three-dot menu and choose "Install app" or "Add to Home Screen".',
        ],
      },
      {
        subtitle: 'Offline use',
        content: [
          'After your first visit, the app shell is cached locally. If your internet drops, you can still open and use KyberStation. Your presets and projects are stored in your browser\'s local database, so they do not require a network connection.',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // Feedback & Community
  // ────────────────────────────────────────────────────────
  {
    id: 'feedback',
    title: 'Feedback & Community',
    content: [
      'KyberStation is a hobby project built by one person, and it is actively shaped by feedback from the community. If something is broken, confusing, or missing — please say so. The single best thing you can do to help the project is file a report when you hit a rough edge.',
      'You can also reach the feedback links directly from inside the app: open Settings (gear icon in the header), scroll to the Feedback section, and pick the right option for what you want to share.',
    ],
    subsections: [
      {
        subtitle: 'Report a bug',
        content: [
          'If something is broken, behaves unexpectedly, or produces wrong output: file a bug report on GitHub. Include your board type, browser, operating system, and any console errors if you have them.',
        ],
      },
      {
        subtitle: 'Suggest a feature',
        content: [
          'If there is something KyberStation does not do yet that you think it should: file a feature request on GitHub. Mention your use case — why you need this and how you would use it. That context helps prioritize what gets built.',
        ],
      },
      {
        subtitle: 'Request a blade style or preset',
        content: [
          'If you have a specific character, era, or aesthetic you want supported: file a style/preset request. Reference material (a clip or screenshot from canon, existing ProffieOS code that achieves the look, etc.) makes these much easier to build.',
        ],
      },
      {
        subtitle: 'Ask a question or discuss',
        content: [
          'For general questions, discussion, or just sharing what you have built: use GitHub Discussions rather than opening an issue. Discussions are better for open-ended conversation.',
        ],
      },
      {
        subtitle: 'About contributions',
        content: [
          'Outside pull requests are not currently accepted while the project is still taking shape. This is not personal — it is a time-management decision to avoid the project consuming all my free time. The policy will likely change as things stabilize. In the meantime, issues and feature discussions are the most useful way to help.',
        ],
      },
    ],
  },
];

export default function DocsPage() {
  useThemeApplier();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-mono">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-secondary/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/editor" className="text-accent hover:text-accent-warm transition-colors text-ui-sm">
              &larr; Editor
            </Link>
            <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em]">
              <span className="text-white">KYBER</span>
              <span className="text-accent">STATION</span>
              <span className="text-text-muted ml-2 font-mono text-ui-sm font-normal">User Guide</span>
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar nav */}
        <nav className="hidden desktop:block w-52 shrink-0 sticky top-16 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
          <ul className="space-y-1 pb-8">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block px-2 py-1 text-ui-base text-text-secondary hover:text-accent transition-colors rounded hover:bg-accent-dim"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-base font-cinematic font-bold text-text-primary tracking-wide mb-3 pb-2 border-b border-border-subtle">
                {section.title}
              </h2>
              {section.content.map((para, i) => (
                <p key={i} className="text-ui-md text-text-secondary leading-relaxed mb-2">
                  {para}
                </p>
              ))}
              {section.list && (
                <ul className="mt-2 space-y-1">
                  {section.list.map((item, i) => (
                    <li key={i} className="text-ui-base text-text-secondary leading-relaxed pl-4 relative">
                      <span className="absolute left-0 text-accent">&#x2022;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.subsections?.map((sub, si) => (
                <div key={si} className="mt-4">
                  <h3 className="text-ui-md font-bold text-text-primary mb-2">
                    {sub.subtitle}
                  </h3>
                  {sub.content?.map((para, pi) => (
                    <p key={pi} className="text-ui-md text-text-secondary leading-relaxed mb-2">
                      {para}
                    </p>
                  ))}
                  {sub.list && (
                    <ul className="mt-1 space-y-1">
                      {sub.list.map((item, li) => (
                        <li key={li} className="text-ui-base text-text-secondary leading-relaxed pl-4 relative">
                          <span className="absolute left-0 text-accent">&#x2022;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}

          {/* Footer link back to editor */}
          <div className="border-t border-border-subtle pt-6 pb-12">
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-ui-md font-bold"
            >
              &larr; Back to Editor
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
