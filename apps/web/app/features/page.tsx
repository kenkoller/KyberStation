import type { BladeConfig } from '@kyberstation/engine';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { ScrollReveal } from '@/components/marketing/ScrollReveal';
import { InlineCodePeek } from '@/components/marketing/InlineCodePeek';
import { LiveBladePreview } from '@/components/marketing/LiveBladePreview';
import { pageMetadata } from '@/lib/marketing/pageMetadata';

export const metadata = pageMetadata({
  title: 'Features',
  description:
    'Explore KyberStation feature pillars — 29 blade styles, 21 combat effects, modulation routing, ProffieOS codegen, and more.',
  path: '/features',
});

interface Pillar {
  anchor: string;
  glyph: string;
  title: string;
  intro: string;
  bullets: string[];
  code?: { language?: string; caption?: string; body: string };
}

interface DemoBlade {
  label: string;
  config: BladeConfig;
}

const baseDemoConfig = (overrides: Partial<BladeConfig>): BladeConfig =>
  ({
    name: 'demo',
    baseColor: { r: 22, g: 114, b: 243 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 255 },
    blastColor: { r: 255, g: 255, b: 255 },
    dragColor: { r: 255, g: 180, b: 0 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 320,
    retractionMs: 420,
    shimmer: 0.07,
    ledCount: 144,
    swingFxIntensity: 0,
    noiseLevel: 0,
    ...overrides,
  }) as BladeConfig;

const DEMO_BLADES: DemoBlade[] = [
  {
    label: 'STABLE / AZURE',
    config: baseDemoConfig({
      baseColor: { r: 22, g: 114, b: 243 },
      style: 'stable',
    }),
  },
  {
    label: 'UNSTABLE / CRIMSON',
    config: baseDemoConfig({
      baseColor: { r: 230, g: 30, b: 30 },
      style: 'unstable',
      shimmer: 0.18,
    }),
  },
  {
    label: 'PULSE / VIOLET',
    config: baseDemoConfig({
      baseColor: { r: 170, g: 60, b: 240 },
      style: 'pulse',
      shimmer: 0.12,
    }),
  },
  {
    label: 'PHOTON / EMERALD',
    config: baseDemoConfig({
      baseColor: { r: 30, g: 220, b: 110 },
      style: 'photon',
    }),
  },
];

const PILLARS: Pillar[] = [
  {
    anchor: 'blade-styles',
    glyph: '◇',
    title: '29 Blade Styles',
    intro:
      'Every base style ships as a typed engine class with codegen parity. Mix and match in the layer compositor; stack effects on top.',
    bullets: [
      'Stable, Unstable, Fire, Plasma, Photon, Pulse, Gradient, Rotoscope',
      'Crystal Shatter, Aurora, Cinder, Prism, Gravity, Data Stream, Ember',
      'Automata, Helix, Candle, Shatter, Neutron, Darksaber',
      'Real ProffieOS templates emit per style — no visualizer-only fakes',
    ],
    code: {
      caption: 'Sample emit · stable + AudioFlicker',
      language: 'C++',
      body: `StylePtr<InOutTrL<
  TrWipe<300>,
  TrWipeIn<500>,
  Layers<
    AudioFlicker<Rgb<15,105,245>, Rgb<255,255,255>>,
    BlastL<White, 200, 100, EFFECT_BLAST>,
    LockupTrL<...>
  >
>>()`,
    },
  },
  {
    anchor: 'presets',
    glyph: '★',
    title: '300+ Presets',
    intro:
      'Every Jedi, Sith, and Inquisitor across the canon era files plus 89 cross-franchise sabers spanning LOTR, Marvel, DC, Zelda, anime, and more. Click any card to drop into the editor and make it yours.',
    bullets: [
      '216 canonical presets (prequel, OT, sequel, animated, legends, EU)',
      '89 pop-culture entries (LOTR, mythology, MCU, DC, Zelda, FF/KH, anime)',
      'Hardware-fidelity audited — every preset matches what real LED strips can produce',
      'Filter by era, faction, color family, or continuity',
    ],
  },
  {
    anchor: 'combat-effects',
    glyph: '⚡',
    title: '21 Combat Effects',
    intro:
      'Real-time effect triggers with spatial placement on the blade. Click anywhere on the visualizer to drop a Lockup, Blast, or Drag at that LED.',
    bullets: [
      'Clash, Lockup, Blast, Drag, Melt, Stab, Lightning, Force',
      'Shockwave, Scatter, Fragment, Ripple, Freeze, Overcharge, Bifurcate',
      'Dual-mode ignition — different behavior for saber-up vs saber-down',
      'Held-state visuals; sustained effects glow until released',
    ],
  },
  {
    anchor: 'transitions',
    glyph: '↯',
    title: '19 × 13 Transitions',
    intro:
      'Nineteen ignition animations and thirteen retractions, freely mixed. Compact 24×24 thumbnails in the picker so you can audition without typing.',
    bullets: [
      'Ignitions: Standard, Scroll, Spark, Center, Wipe, Stutter, Glitch, Crackle, Fracture, Flash Fill, Pulse Wave, Drip Up, and more',
      'Retractions: Dissolve, Flicker Out, Unravel, Drain, Implode, Fade, and more',
      'Per-style timing curves; tune ignitionMs / retractionMs independently',
      'Wave 5 picker — drag-to-route from the modulator plates onto any timing parameter',
    ],
  },
  {
    anchor: 'modulation',
    glyph: '◈',
    title: 'Modulation Routing',
    intro:
      'Wire any swing, sound, angle, twist, clash, time, lockup, preon, ignition, retraction, or battery signal to any blade parameter. Live driver evaluation in the visualizer; AST-level template injection in the codegen.',
    bullets: [
      '11 modulators with bespoke live-viz glyphs',
      'Per-binding combinator (replace, add, multiply, scale)',
      'Math expression editor — peggy parser + evaluator, with live ✓/✕ feedback',
      '11 starter recipes (heartbeat, breathing, battery saver, twist-driven hue, more)',
      'AST-level template injection — emits live `Mix<Scale<SwingSpeed<...>, ...>>`',
    ],
    code: {
      caption: 'Modulation emit · swing → shimmer',
      language: 'C++',
      body: `// MODULATION (v1.1 Core)
// LIVE: shimmer ← scale(swing, 0..0.6) × 100%
StylePtr<InOutTrL<
  TrWipe<300>, TrWipeIn<500>,
  AudioFlicker<
    Mix<Scale<SwingSpeed<400>, Int<0>, Int<19660>>,
        Rgb<15,105,245>, White>,
    White
  >
>>()`,
    },
  },
  {
    anchor: 'codegen',
    glyph: '∷',
    title: 'ProffieOS Codegen',
    intro:
      'AST-based emitter targeting ProffieOS 7.x. Validated end-to-end against the real compile pipeline (213 KB binary builds clean from a KyberStation-generated config).',
    bullets: [
      'Real C++ output — no string concatenation, no template-bracket bugs',
      'Compiles unmodified in Arduino IDE with the Proffieboard board manager',
      'Builds the full config.h with every preset wired',
      '1,859 codegen tests covering AST round-trip + transition mapping',
    ],
  },
  {
    anchor: 'sound',
    glyph: '♪',
    title: 'Sound Font Manager',
    intro:
      'Auto-detect Proffie and CFX font folders. Preview SmoothSwing pairs. Map fonts to presets. Recognizes 12 modern Proffie sound categories.',
    bullets: [
      'Folder picker via the File System Access API (with Brave FSA flag warning)',
      'Live SmoothSwing crossfade engine — V1 + V2',
      'Audio waveform analysis layer — read RMS as the blade idles',
      'Hum hot-swap on font change; Mute via shared store',
    ],
  },
  {
    anchor: 'cards',
    glyph: '◐',
    title: 'Saber Card Snapshots',
    intro:
      'One-click 1200×675 share cards for posting your design. Five themes, four layouts, plus animated GIF export from the My Crystal panel.',
    bullets: [
      'Themes: Deep Space, Imperial, Jedi, Light, Pure Black',
      'Layouts: Default, OG (Twitter), Instagram square, Story portrait',
      'GIF variants: 1 s idle hum loop, 2.5 s ignition cycle (≤2 MB / ≤5 MB)',
      'Kyber Code URL in a corner QR — scannable from any phone',
    ],
  },
  {
    anchor: 'kyber-code',
    glyph: '✦',
    title: 'Kyber Code Sharing',
    intro:
      'Encode any saber design as a base58 URL fragment. Send a `?s=<glyph>` link; the recipient loads the exact preset on the editor.',
    bullets: [
      'MessagePack + delta-vs-default + raw-deflate + base58 (~18–130 chars typical)',
      'Versioned payload byte for forward compatibility',
      'Round-trips every BladeConfig field including modulation bindings',
      'Renderable as a 3D Kyber Crystal via the My Crystal panel',
    ],
  },
  {
    anchor: 'offline',
    glyph: '◊',
    title: 'Offline-First, Local-Only',
    intro:
      'No login. No backend. No analytics. No telemetry. Every project stays in your browser unless you export it. Installable as a PWA for offline editing.',
    bullets: [
      'IndexedDB for projects, presets, profiles, and card queues',
      'localStorage for layout + accessibility + theme preferences',
      'Service worker — works on a flight with zero network',
      'Export anytime: ProffieOS code, config.h, share-card PNG, GIF, ZIP',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col">
      <MarketingHeader active="features" />

      <section
        className="relative border-b border-border-subtle py-16 md:py-20"
        aria-labelledby="features-page-heading"
      >
        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center">
          <ScrollReveal>
            <div
              className="font-mono text-xs tracking-widest mb-4 tabular-nums"
              style={{ color: 'rgb(var(--accent))' }}
            >
              FEATURE / LEDGER
            </div>
            <h1
              id="features-page-heading"
              className="font-cinematic text-3xl md:text-5xl tracking-[0.08em] font-semibold uppercase text-text-primary mb-5"
            >
              What KyberStation does
            </h1>
            <p className="font-sans text-[15px] md:text-base leading-relaxed text-text-secondary max-w-2xl mx-auto">
              Ten feature pillars, each shipping in v1.0. Sample
              ProffieOS code peeks alongside the styles + modulation
              entries so you can read the actual output before you open
              the editor.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section
        className="relative border-b border-border-subtle py-10 md:py-12"
        aria-labelledby="features-live-now-heading"
      >
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <ScrollReveal>
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <div>
                <div
                  className="font-mono text-[11px] tracking-widest mb-1 tabular-nums"
                  style={{ color: 'rgb(var(--accent))' }}
                >
                  ● LIVE NOW
                </div>
                <h2
                  id="features-live-now-heading"
                  className="font-cinematic text-lg md:text-xl tracking-[0.08em] text-text-primary"
                >
                  The engine, running right now in your browser.
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-center md:justify-start gap-x-8 gap-y-6">
              {DEMO_BLADES.map((blade, i) => (
                <LiveBladePreview
                  key={blade.label}
                  config={blade.config}
                  label={blade.label}
                  width={180}
                  height={44}
                  cycleLitMs={2600 + i * 400}
                />
              ))}
            </div>
            <p className="mt-6 text-[13px] text-text-muted max-w-2xl leading-relaxed">
              Every preset in the showcase renders through the same
              engine you&apos;d use to design your own. No screenshots —
              this is the actual output, frame-by-frame.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="flex-1 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-8 space-y-12 md:space-y-16">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.anchor}
              id={pillar.anchor}
              className="scroll-mt-24"
            >
              <header className="flex items-baseline gap-3 mb-4">
                <span
                  className="font-mono text-2xl md:text-3xl leading-none"
                  style={{ color: 'rgb(var(--accent))' }}
                  aria-hidden="true"
                >
                  {pillar.glyph}
                </span>
                <h2 className="font-sans text-xl md:text-2xl tracking-[0.08em] font-semibold uppercase text-text-primary">
                  {pillar.title}
                </h2>
                <a
                  href={`#${pillar.anchor}`}
                  className="ml-auto font-mono text-[11px] tracking-widest text-text-muted hover:text-accent transition-colors"
                  aria-label={`Direct link to ${pillar.title}`}
                >
                  #
                </a>
              </header>
              <p className="font-sans text-[15px] leading-relaxed text-text-secondary mb-4">
                {pillar.intro}
              </p>
              <ul className="space-y-2 text-text-secondary text-[14px] leading-relaxed">
                {pillar.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="font-mono shrink-0 mt-[2px]"
                      style={{ color: 'rgb(var(--accent) / 0.85)' }}
                    >
                      ◆
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              {pillar.code && (
                <InlineCodePeek
                  code={pillar.code.body}
                  caption={pillar.code.caption}
                  language={pillar.code.language}
                />
              )}
            </article>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
