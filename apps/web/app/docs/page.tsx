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
  // 1. Getting Started
  // ────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: [
      'BladeForge is a visual saber style editor, real-time blade simulator, and config generator for ProffieOS 7.x sabers. It runs entirely in your browser with no server required — all project data is stored locally in IndexedDB.',
      'The main editor workspace has three areas: a compact canvas strip at the top showing your blade preview, a toolbar for quick style/effect controls, and a tabbed panel area below for detailed configuration.',
      'Click IGNITE (or press Space) to power on the virtual blade and see your style in action. Use the effect buttons (Clash, Blast, Lockup, etc.) to preview how your saber reacts to combat events. Every change updates the blade preview in real-time.',
      'The tabbed panels at the bottom give you full control: Style for blade style selection, Colors for palette editing, Effects for combat effect tuning, Ignition for ignition/retraction animations, Params for advanced parameters, Audio for sound font management, Gallery for presets, and Output for code generation and SD card export.',
    ],
  },

  // ────────────────────────────────────────────────────────
  // 2. Blade Styles
  // ────────────────────────────────────────────────────────
  {
    id: 'blade-styles',
    title: 'Blade Styles',
    content: [
      'BladeForge includes 12 blade styles, each with a unique visual character. Select a style from the Style panel and adjust its parameters to create your look.',
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
    ],
  },

  // ────────────────────────────────────────────────────────
  // 3. Effects
  // ────────────────────────────────────────────────────────
  {
    id: 'effects',
    title: 'Effects',
    content: [
      'Effects simulate how your saber responds to combat and Force interactions. Each effect has its own configurable color and behavior. Transient effects fire once and fade, while sustained effects stay active until released.',
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
          'Secondary Style — An optional second style to blend with the primary. Choose from any of the 12 blade styles.',
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
          'Exceeding the 5A limit risks brownouts, board resets, or component damage. BladeForge\'s storage budget panel estimates per-style power impact to help you stay within safe limits.',
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
      'BladeForge generates valid ProffieOS 7.x C++ code from your blade configuration. The code generator builds an AST (Abstract Syntax Tree) of ProffieOS style templates, validates it, and emits properly formatted code that compiles in Arduino IDE with the Proffieboard board manager installed.',
    ],
    subsections: [
      {
        subtitle: 'Generated Code',
        list: [
          'BladeForge produces complete StylePtr<> declarations using standard ProffieOS templates: Layers<>, BlastL<>, SimpleClashL<>, LockupTrL<>, InOutTrL<>, and all standard transitions.',
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
          'Single Config (.bladeforge.json) — Export/import the current editor state as a file.',
          'Preset Collection (.bladeforge-collection.json) — Bundle multiple user presets with thumbnails for sharing.',
          'Card Template (.bladeforge-card.json) — Share a card config. Font paths are stripped but folder names are preserved.',
          'Kyber Code (URL) — Share a style as a compact URL using JSON, deflate-raw, and base64url encoding. Anyone with the link loads your style instantly.',
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
      'The Font Library lets you point BladeForge at your local sound font collection folder. It scans all subdirectories, detects font formats (Proffie, CFX, Generic), and shows completeness at a glance. Requires a Chromium-based browser (Chrome, Edge, Arc).',
      'Go to the Audio tab and click the "Library" sub-tab. Click "Set Font Library Folder" and select your top-level font directory.',
    ],
    list: [
      'Auto-Scan — After selecting a folder, BladeForge scans every subdirectory for sound files. It counts files per category (hum, swing, clash, etc.) and detects SmoothSwing pairs.',
      'Completeness Indicator — Each font shows a dot: green (complete — all essential categories present), yellow (partial — some missing), or red (minimal). Hover for a text label.',
      'Search & Sort — Filter fonts by name. Sort alphabetically, by file count, or by completeness.',
      'Load — Click "Load" on any font to decode and activate it as the current sound font for preview playback.',
      'Pair — Associate a font with your current preset so they auto-load together.',
      'Refresh — Re-scan the folder to pick up newly added fonts.',
      'Persistent Handle — Your folder selection is saved in IndexedDB. On next visit, BladeForge re-requests access to the same directory without you needing to re-pick it.',
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
      'BladeForge includes accessibility features to ensure the editor is usable by everyone.',
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
              <span className="text-white">BLADE</span>
              <span className="text-accent">FORGE</span>
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
