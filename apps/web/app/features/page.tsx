import Link from 'next/link';
import type { BladeConfig } from '@kyberstation/engine';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHero } from '@/components/marketing/MarketingHero';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { FeatureCard } from '@/components/marketing/FeatureCard';
import { ScrollReveal } from '@/components/marketing/ScrollReveal';
import { LiveBladePreview } from '@/components/marketing/LiveBladePreview';
import { pageMetadata } from '@/lib/pageMetadata';

export const metadata = pageMetadata({
  title: 'Features',
  description:
    'A complete walkthrough of what KyberStation does: visual blade editor, engine-accurate simulation, ProffieOS code generation, WebUSB flash, and a growing preset library.',
  path: '/features',
  keywords: [
    'proffieboard',
    'proffieos',
    'lightsaber',
    'neopixel',
    'blade style editor',
    'saber fonts',
  ],
});

// Four inline demo blades for the "live now" strip. Intentionally
// self-contained — not coupled to ALL_PRESETS IDs so copy / preset
// renames don't break this page.
const makeDemoConfig = (overrides: Partial<BladeConfig>): BladeConfig =>
  ({
    name: 'demo',
    baseColor: { r: 0, g: 135, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    lockupColor: { r: 255, g: 255, b: 255 },
    blastColor: { r: 255, g: 255, b: 255 },
    dragColor: { r: 255, g: 180, b: 0 },
    style: 'stable',
    ignition: 'standard',
    retraction: 'standard',
    ignitionMs: 320,
    retractionMs: 420,
    shimmer: 0.06,
    ledCount: 144,
    swingFxIntensity: 0,
    noiseLevel: 0,
    ...overrides,
  }) as BladeConfig;

const DEMO_BLADES: ReadonlyArray<{ label: string; config: BladeConfig }> = [
  {
    label: 'Luke · ROTJ',
    config: makeDemoConfig({
      baseColor: { r: 60, g: 255, b: 40 },
      style: 'rotoscope',
      shimmer: 0.05,
    }),
  },
  {
    label: 'Anakin',
    config: makeDemoConfig({
      baseColor: { r: 0, g: 135, b: 255 },
      style: 'stable',
    }),
  },
  {
    label: 'Kylo Ren',
    config: makeDemoConfig({
      baseColor: { r: 255, g: 40, b: 20 },
      style: 'unstable',
      ignition: 'crackle',
    }),
  },
  {
    label: 'Ahsoka',
    config: makeDemoConfig({
      baseColor: { r: 250, g: 245, b: 225 },
      style: 'stable',
      shimmer: 0.04,
    }),
  },
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="01 / CAPABILITIES"
        title="Every surface of the saber, under your hands."
        subtitle="KyberStation is a visual design environment, a motion-aware simulator, a ProffieOS code generator, and a flash tool — unified around one editable blade."
      />

      <section className="relative border-b border-border-subtle py-14 md:py-16">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div
                className="dot-matrix mb-3"
                style={{ color: 'rgb(var(--accent) / 0.75)' }}
              >
                LIVE NOW
              </div>
              <h2 className="font-cinematic text-xl md:text-2xl tracking-[0.1em] text-text-primary leading-tight">
                This is the engine, running right now in your browser.
              </h2>
            </div>
            <Link
              href="/showcase"
              className="dot-matrix transition-colors whitespace-nowrap"
              style={{ color: 'rgb(var(--accent) / 0.85)' }}
            >
              SEE 214 MORE →
            </Link>
          </div>
          <div className="flex flex-wrap items-end justify-center md:justify-start gap-x-8 gap-y-6">
            {DEMO_BLADES.map((blade, i) => (
              <ScrollReveal key={blade.label} variant="fade-up" delay={i * 80}>
                <LiveBladePreview
                  config={blade.config}
                  label={blade.label}
                  width={180}
                  height={44}
                  cycleLitMs={2600 + i * 400}
                />
              </ScrollReveal>
            ))}
          </div>
          <p className="mt-8 text-[13px] text-text-muted max-w-2xl leading-relaxed">
            Every preset in the Showcase renders through the same engine.
            Click into any of them to open in the editor and tune your own.
          </p>
        </div>
      </section>

      <ScrollReveal variant="fade-up">
        <MarketingSection
          eyebrow="02 / AUTHORING"
          title="Click the blade. Place the effect. See the code."
        >
          <div className="grid md:grid-cols-2 gap-5">
            <FeatureCard
              index="A.01"
              title="WYSIWYG editing"
              description="Click anywhere on the blade to place a spatial lockup, drag, melt, or stab. The caret moves, the config updates, and the ProffieOS code re-emits in the same gesture."
              bullets={[
                'Spatial round-trip: placement survives import → export → re-import',
                'Preon editor with live transition-effect preview',
                'Dual-mode ignition via TrSelect (saber-up / saber-down)',
              ]}
            />
            <FeatureCard
              index="A.02"
              title="29 styles · 21 effects · 19 ignitions"
              description="A curated library of canonical and original blade behaviors. Every one is a typed class implementing BladeStyle / BladeEffect / IgnitionAnimation — plug-in shape, zero registry gymnastics."
              bullets={[
                'Stable, Unstable, Fire, Rotoscope, Pulse, Gradient, Photon, Plasma — and more',
                'Crystal Shatter, Aurora, Cinder, Prism, Gravity, Data Stream, Ember, Automata, Helix, Candle, Shatter, Neutron',
                '13 retraction animations paired with the 19 ignitions',
              ]}
            />
          </div>
        </MarketingSection>
      </ScrollReveal>

      <ScrollReveal variant="fade-up">
        <MarketingSection
          eyebrow="03 / SIMULATION"
          title="Not a cartoon. A live blade."
        >
          <div className="grid md:grid-cols-3 gap-5">
            <FeatureCard
              index="B.01"
              title="Neopixel-accurate preview"
              description="sRGB → linear, WS2812b channel bias, polycarbonate diffusion. What you see is what the LED strip will render."
            />
            <FeatureCard
              index="B.02"
              title="Motion-driven behavior"
              description="Swing, blade-angle, and twist all feed the sim. Responsive functions in your style react exactly the way ProffieOS evaluates them."
            />
            <FeatureCard
              index="B.03"
              title="Audio-visual sync"
              description="Sound-font playback pitches and modulates with gesture. The same motion envelope that drives the blade also drives the hum."
            />
          </div>
        </MarketingSection>
      </ScrollReveal>

      <ScrollReveal variant="fade-up">
        <MarketingSection
          eyebrow="04 / CODE"
          title="AST-based ProffieOS generator. No string concatenation."
        >
          <div className="grid md:grid-cols-2 gap-5">
            <FeatureCard
              index="C.01"
              title="Emits clean C++"
              description="Compiles in Arduino IDE with the Proffieboard board manager — no edits. Tracks current ProffieOS 7.x template grammar: Layers<>, BlastL<>, InOutTrL<>, LockupTrL<>, Mix<>, Gradient<>, and the full responsive-function family."
              bullets={[
                'Round-trips: config → C++ → config survives every field',
                'Parser warnings channel surfaces unknown templates without crashing',
                'Fett263 prop file + 4 other button maps supported',
              ]}
            />
            <FeatureCard
              index="C.02"
              title="Share a build as a URL"
              description="Kyber Glyph v1 encodes any BladeConfig into a stable base58 string. Drop it into Discord — the other person opens /editor?s=… and sees the exact same saber."
              bullets={[
                'Delta-vs-default + raw-deflate for tight QR-scannable links',
                '3D Kyber Crystal renders a visual signature of the glyph',
                'Works fully offline — no account, no server',
              ]}
            />
          </div>
        </MarketingSection>
      </ScrollReveal>

      <ScrollReveal variant="fade-up">
        <MarketingSection
          eyebrow="05 / HARDWARE"
          title="Straight from the browser to the board."
        >
          <div className="grid md:grid-cols-2 gap-5">
            <FeatureCard
              index="D.01"
              title="WebUSB flash"
              description="Direct STM32 DfuSe protocol over WebUSB. Flash firmware without Arduino IDE, without drivers, without the cable-dance."
              bullets={[
                'Supports Proffieboard V2.2 and V3.9',
                'Dry-run mode for testing without writing flash',
                'Readback verification after every write',
              ]}
              footer="Pending hardware validation — see docs/HARDWARE_VALIDATION_TODO.md"
              variant="accent"
            />
            <FeatureCard
              index="D.02"
              title="SD card writer"
              description="Pair presets with sound fonts and write the full SD card layout in one click. Detects existing cards and preserves unrelated folders."
              bullets={[
                'Sound font pairing: keyword-scored Recommended / Compatible labels',
                'Storage-budget estimator warns before you exceed flash capacity',
                'OLED image preview for boards with displays',
              ]}
            />
          </div>
        </MarketingSection>
      </ScrollReveal>

      <ScrollReveal variant="fade-up">
        <MarketingSection
          eyebrow="06 / LIBRARY"
          title="A preset library that keeps growing."
        >
          <div className="grid md:grid-cols-3 gap-5">
            <FeatureCard
              index="E.01"
              title="Saber Wizard"
              description="Three-step onboarding — archetype, color, vibe. A user-friendly way to land on a sensible starting config without scrolling the full editor."
            />
            <FeatureCard
              index="E.02"
              title="Character presets"
              description="Curated, film-reference-graded presets across prequel, original, sequel, animated, and Legends/EU eras. Screen-accurate configs are flagged as such."
            />
            <FeatureCard
              index="E.03"
              title="Modular hilt library"
              description="33 original line-art SVG parts composed into 8 canonical assemblies (Graflex, MPP, Negotiator, Count, Shoto Sage, Vented Crossguard, Staff, Fulcrum)."
            />
          </div>
        </MarketingSection>
      </ScrollReveal>

      <ScrollReveal variant="fade-up">
        <MarketingSection eyebrow="07 / FOUNDATIONS">
          <div className="grid md:grid-cols-2 gap-5">
            <FeatureCard
              index="F.01"
              title="Offline-first"
              description="All project data lives in IndexedDB on your machine. No account, no telemetry, no server round-trips. Works on a plane."
            />
            <FeatureCard
              index="F.02"
              title="MIT-licensed, community-built"
              description="KyberStation source is MIT. ProffieOS reference material is GPL-3.0 and distributed as an aggregate work. Fan-made tooling — not affiliated with Lucasfilm or Disney."
            />
          </div>
        </MarketingSection>
      </ScrollReveal>

      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div
            className="dot-matrix mb-5 opacity-80"
            style={{ color: 'rgb(var(--accent) / 0.75)' }}
          >
            08 / READY?
          </div>
          <h2 className="font-cinematic text-2xl md:text-4xl tracking-[0.1em] text-text-primary mb-6 leading-tight">
            Design your first saber.
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/editor?wizard=1"
              className="btn-hum inline-flex items-center justify-center min-w-[200px] px-7 py-3 rounded-[2px] font-cinematic text-sm tracking-[0.22em] uppercase transition-colors"
              style={{
                background: 'rgb(var(--accent) / 0.10)',
                border: '1px solid rgb(var(--accent) / 0.45)',
                color: 'rgb(var(--accent))',
              }}
            >
              Launch Wizard
            </Link>
            <Link
              href="/showcase"
              className="btn-hum inline-flex items-center justify-center min-w-[200px] px-7 py-3 rounded-[2px] border border-border-light text-text-secondary hover:text-text-primary font-cinematic text-sm tracking-[0.22em] uppercase transition-colors hover:bg-bg-surface"
            >
              Browse Showcase
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
