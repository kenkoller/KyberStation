import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHero } from '@/components/marketing/MarketingHero';

export const metadata: Metadata = {
  title: 'FAQ — KyberStation',
  description:
    'Frequently asked questions about KyberStation: hardware compatibility, licensing, safety, browser support, and contribution policy.',
};

interface QA {
  q: string;
  a: React.ReactNode;
}

const SECTIONS: ReadonlyArray<{ heading: string; items: ReadonlyArray<QA> }> = [
  {
    heading: 'Getting started',
    items: [
      {
        q: 'What is KyberStation?',
        a: (
          <>
            A visual design, simulation, and export tool for custom lightsaber blade
            styles — specifically for the Proffieboard V3.9 running ProffieOS 7.x.
            Think of it as a DAW for Neopixel sabers: design with motion and sound
            in the preview, then export ProffieOS-compatible code and write the SD
            card in one flow.
          </>
        ),
      },
      {
        q: 'Who is it for?',
        a: (
          <>
            Proffieboard hobbyists — cosplayers, duellists, reenactors, collectors —
            and anyone building a saber who would rather design visually than
            trial-and-error their way through Arduino IDE compiles. You do not need
            to know C++. You do not need to know the ProffieOS template grammar.
          </>
        ),
      },
      {
        q: 'Do I need hardware to use it?',
        a: (
          <>
            No. The editor, preview, code generator, and share flow all work in any
            modern browser. You only need a real Proffieboard if you want to flash
            firmware or write an SD card. Everything up to that point runs locally
            on your machine.
          </>
        ),
      },
    ],
  },
  {
    heading: 'Hardware',
    items: [
      {
        q: 'What hardware is supported?',
        a: (
          <>
            <strong className="text-text-primary">Proffieboard V3.9</strong> is the
            primary target. <strong className="text-text-primary">V2.2</strong> is
            also supported for most features. Neopixel blades up to 144 LEDs render
            natively in the preview.
          </>
        ),
      },
      {
        q: 'Is WebUSB flashing safe?',
        a: (
          <>
            The STM32 DfuSe protocol KyberStation uses is the same one that
            ProffieOS Workbench (already trusted by the community) uses. A bricked
            board is recoverable via the BOOT-pin DFU path on the chip itself — the
            worst-case failure mode is a re-flash, not hardware damage. That said,
            the WebUSB feature is{' '}
            <strong className="text-text-primary">
              pending real-hardware validation
            </strong>{' '}
            and is disabled behind a disclaimer gate until that work completes.
          </>
        ),
      },
      {
        q: 'Does it work on Mac and Windows?',
        a: (
          <>
            Yes. The project is developed on both. WebUSB requires Chrome or Edge
            (or another Chromium-based browser); Safari and Firefox do not ship
            WebUSB. Every other feature works in any modern browser.
          </>
        ),
      },
    ],
  },
  {
    heading: 'Licensing + legal',
    items: [
      {
        q: 'What is the license?',
        a: (
          <>
            The KyberStation source code is{' '}
            <strong className="text-text-primary">MIT-licensed</strong>. ProffieOS
            template reference material included in the repo is GPL-3.0 and is
            distributed as an aggregate work — see{' '}
            <code className="font-mono text-[13px] text-text-primary">
              LICENSES/ProffieOS-GPL-3.0.txt
            </code>{' '}
            and the README for the exact separation.
          </>
        ),
      },
      {
        q: 'Is this an official Lucasfilm or Disney product?',
        a: (
          <>
            <strong className="text-text-primary">No.</strong> KyberStation is
            fan-made tooling for the Proffieboard hobbyist community.
            &quot;Lightsaber&quot; is a registered trademark of Lucasfilm Ltd.
            ProffieOS and Proffieboard are community projects not affiliated with
            Lucasfilm or The Walt Disney Company.
          </>
        ),
      },
      {
        q: 'Can I use designs I make here commercially?',
        a: (
          <>
            The tool itself is free and MIT-licensed. The designs you create are
            yours. That said, commercial use of Star Wars trademarks is a Lucasfilm
            question, not a KyberStation one — know your local jurisdiction.
          </>
        ),
      },
    ],
  },
  {
    heading: 'Community + contributions',
    items: [
      {
        q: 'Can I contribute?',
        a: (
          <>
            Issues and feature requests are open on{' '}
            <a
              href="https://github.com/kenkoller/KyberStation/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              GitHub
            </a>
            . Outside pull requests are not accepted yet — this is a first public
            programming project and the author is still finding the contribution
            pattern. The policy gets revisited 30 days after public launch.
          </>
        ),
      },
      {
        q: 'How do I add a preset to the gallery?',
        a: (
          <>
            The community-preset gallery ships as a directory of typed presets in
            the repo. Once outside PRs open, the path will be{' '}
            <code className="font-mono text-[13px] text-text-primary">
              packages/presets/src/characters/community/
            </code>{' '}
            — one file per contributor, merged as the moderation gate. Until then,
            file a feature request with your config.
          </>
        ),
      },
      {
        q: 'Is there a Discord or forum?',
        a: (
          <>
            Not yet. For now, GitHub Issues is the canonical feedback channel. If
            interest warrants it, a community space will follow post-launch.
          </>
        ),
      },
    ],
  },
  {
    heading: 'Privacy + data',
    items: [
      {
        q: 'Where is my data stored?',
        a: (
          <>
            All project data — saber configs, custom presets, sound-font library —
            lives in your browser&rsquo;s IndexedDB on the machine you&rsquo;re
            using. There is no server. There is no account. There is no telemetry.
            Clearing your browser storage clears your work.
          </>
        ),
      },
      {
        q: 'How do I back up my designs?',
        a: (
          <>
            Export a saber as a JSON file from the editor, or share a Kyber Glyph
            URL. Either one round-trips perfectly — drop the JSON back in later or
            open the URL on a different machine and you pick up exactly where you
            left off.
          </>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="01 / COMMON QUESTIONS"
        title="FAQ"
        subtitle="If your question isn't here, open an issue on GitHub — we'll fold the answer back into this page."
      />

      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 md:px-8 space-y-14">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2
                className="font-cinematic text-[11px] tracking-[0.24em] uppercase mb-6 pb-3 border-b border-border-subtle"
                style={{ color: 'rgb(var(--accent) / 0.8)' }}
              >
                {section.heading}
              </h2>
              <dl className="space-y-8">
                {section.items.map((item) => (
                  <div key={item.q}>
                    <dt className="font-cinematic text-base tracking-[0.08em] text-text-primary mb-3 leading-snug">
                      {item.q}
                    </dt>
                    <dd className="text-[15px] text-text-secondary leading-relaxed">
                      {item.a}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border-subtle py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm text-text-muted mb-5">
            Didn&rsquo;t find what you were looking for?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://github.com/kenkoller/KyberStation/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hum inline-flex items-center justify-center min-w-[200px] px-6 py-2.5 rounded-[2px] font-cinematic text-xs tracking-[0.22em] uppercase transition-colors"
              style={{
                background: 'rgb(var(--accent) / 0.10)',
                border: '1px solid rgb(var(--accent) / 0.45)',
                color: 'rgb(var(--accent))',
              }}
            >
              Open an issue
            </a>
            <Link
              href="/docs"
              className="btn-hum inline-flex items-center justify-center min-w-[200px] px-6 py-2.5 rounded-[2px] border border-border-light text-text-secondary hover:text-text-primary font-cinematic text-xs tracking-[0.22em] uppercase transition-colors hover:bg-bg-surface"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
