interface CreditGroupProps {
  index: string;
  title: string;
  body: React.ReactNode;
}

function CreditGroup({ index, title, body }: CreditGroupProps) {
  return (
    <div className="space-y-3">
      <div
        className="font-mono text-xs tracking-widest tabular-nums"
        style={{ color: 'rgb(var(--accent))' }}
      >
        {index}
      </div>
      <h3 className="font-sans text-[13px] tracking-[0.16em] font-semibold uppercase text-text-primary">
        {title}
      </h3>
      <div className="font-sans text-[14px] leading-relaxed text-text-secondary">
        {body}
      </div>
    </div>
  );
}

/**
 * Credits + community attribution. Tone matches docs/LAUNCH_PLAN.md:
 * humble, broad, no vendor pitching. Three groups: ProffieOS lineage,
 * the wider Crucible / community, hardware + sound vendors.
 */
export function LandingCredits() {
  return (
    <section
      className="relative border-t border-border-subtle py-16 md:py-20"
      aria-labelledby="credits-heading"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <header className="mb-12 md:mb-14 text-center">
          <div
            className="font-mono text-xs tracking-widest mb-4 tabular-nums"
            style={{ color: 'rgb(var(--accent))' }}
          >
            CREDITS / COMMUNITY
          </div>
          <h2
            id="credits-heading"
            className="font-sans text-2xl md:text-3xl tracking-[0.08em] font-semibold uppercase text-text-primary"
          >
            Built on shoulders
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-text-secondary text-[15px] leading-relaxed">
            KyberStation wouldn&apos;t exist without decades of work from the
            Proffieboard ecosystem. This page is too short for a full thanks
            list — what follows is a starting point.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          <CreditGroup
            index="01 / SOFTWARE"
            title="ProffieOS"
            body={
              <p>
                <strong className="text-text-primary font-semibold">
                  Fredrik Hübinette
                </strong>{' '}
                created and maintains ProffieOS — the firmware every
                Proffieboard saber runs. KyberStation generates configs
                targeted at ProffieOS 7.x.{' '}
                <strong className="text-text-primary font-semibold">
                  Fett263&apos;s
                </strong>{' '}
                community style libraries and prop file inspired the codegen
                output shape.
              </p>
            }
          />

          <CreditGroup
            index="02 / COMMUNITY"
            title="The Crucible"
            body={
              <p>
                The{' '}
                <strong className="text-text-primary font-semibold">
                  Crucible
                </strong>{' '}
                Discord and Saber Forum communities answer hundreds of
                hardware and software questions a day. Hobbyist tinkerers,
                installers, and content creators have shaped the conventions
                this app builds on.
              </p>
            }
          />

          <CreditGroup
            index="03 / HARDWARE & SOUND"
            title="Sabers and fonts"
            body={
              <p>
                Saber vendors build the Neopixel hardware these designs run
                on — including 89sabers, KR Sabers, Saberbay, Vader&apos;s
                Vault, and Genesis Custom Sabers, among many others. Sound
                font makers like{' '}
                <strong className="text-text-primary font-semibold">
                  Kyberphonic
                </strong>
                ,{' '}
                <strong className="text-text-primary font-semibold">
                  Saber Theory
                </strong>
                , and the whole Discord font scene supply the audio that
                makes a saber feel alive.
              </p>
            }
          />
        </div>
      </div>
    </section>
  );
}
