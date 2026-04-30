interface PillarProps {
  glyph: string;
  title: string;
  description: string;
}

/**
 * Individual feature pillar card. Glyph + uppercase mono title +
 * relaxed-leading body copy. Top border-accent so the eight cards
 * read as a clear ledger when stacked. Sits inside a responsive grid
 * (1 → 2 → 4 columns by viewport). All-tokenized colors.
 */
function Pillar({ glyph, title, description }: PillarProps) {
  return (
    <div
      className="relative pt-5 pl-5 pr-5 pb-6 border border-border-subtle bg-bg-deep/40 transition-colors hover:border-border-light"
      style={{ borderRadius: 'var(--r-chrome, 2px)' }}
    >
      <div
        className="font-mono text-xl mb-3 leading-none"
        style={{ color: 'rgb(var(--accent))' }}
        aria-hidden="true"
      >
        {glyph}
      </div>
      <h3 className="font-sans text-[13px] tracking-[0.16em] font-semibold uppercase mb-2 text-text-primary">
        {title}
      </h3>
      <p className="font-sans text-[14px] leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

const PILLARS: PillarProps[] = [
  {
    glyph: '◇',
    title: '29 Blade Styles',
    description:
      'Stable, Unstable, Fire, Plasma, Crystal Shatter, Aurora, Helix, Candle — and 22 more. Mix layers, stack effects, build something unique.',
  },
  {
    glyph: '★',
    title: '300+ Presets',
    description:
      'Every Jedi, Sith, Inquisitor, plus 89 cross-franchise sabers (LOTR, Marvel, Zelda, Final Fantasy, anime). Drop in, then make it yours.',
  },
  {
    glyph: '⚡',
    title: '21 Combat Effects',
    description:
      'Clash, Lockup, Blast, Drag, Melt, Lightning, Stab, Force, Shockwave, Ripple, Freeze. Each one with spatial placement on the blade.',
  },
  {
    glyph: '↯',
    title: '19 × 13 Transitions',
    description:
      'Nineteen ignition animations and thirteen retractions. Mix and match. Or wire dual-mode ignitions that change behavior per saber orientation.',
  },
  {
    glyph: '◈',
    title: 'Modulation Routing',
    description:
      'Wire any swing, sound, angle, twist, or clash signal to any parameter. Live driver evaluation in the visualizer; AST injection in the codegen.',
  },
  {
    glyph: '∷',
    title: 'ProffieOS Codegen',
    description:
      'Real C++ output, validated against ProffieOS 7.x. Compiles clean with arduino-cli. Builds the full config.h with every preset wired.',
  },
  {
    glyph: '♪',
    title: 'Sound Font Manager',
    description:
      'Auto-detect Proffie and CFX font folders. Preview SmoothSwing pairs. Map fonts to presets. Ships with the Brave file-system flag warning.',
  },
  {
    glyph: '◐',
    title: 'Saber Card Snapshots',
    description:
      'One-click 1200×675 share cards. Five themes (Deep Space, Imperial, Jedi, Light, Pure Black). Four layouts (default, OG, Instagram, Story). Plus animated GIF export.',
  },
];

export function LandingFeaturePillars() {
  return (
    <section
      className="relative border-t border-border-subtle py-16 md:py-24"
      aria-labelledby="features-heading"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <header className="mb-12 md:mb-16 text-center">
          <div
            className="font-mono text-xs tracking-widest mb-4 tabular-nums"
            style={{ color: 'rgb(var(--accent))' }}
          >
            FEATURE / LEDGER
          </div>
          <h2
            id="features-heading"
            className="font-sans text-2xl md:text-3xl tracking-[0.08em] font-semibold uppercase text-text-primary"
          >
            What you get
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-text-secondary text-[15px] leading-relaxed">
            Everything below ships in v1.0. No login. No paywall. No backend
            calls. Your designs stay in your browser unless you export them.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {PILLARS.map((pillar) => (
            <Pillar key={pillar.title} {...pillar} />
          ))}
        </div>
      </div>
    </section>
  );
}
