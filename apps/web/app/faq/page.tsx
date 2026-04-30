import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { ScrollReveal } from '@/components/marketing/ScrollReveal';
import { pageMetadata } from '@/lib/marketing/pageMetadata';

export const metadata = pageMetadata({
  title: 'FAQ',
  description:
    'Frequently asked questions about KyberStation — what it is, hardware compatibility, sharing designs, sound fonts, recovery, and offline use.',
  path: '/faq',
});

interface FAQEntry {
  /** Stable slug for deep-linking (e.g. "what-is-kyberstation"). */
  slug: string;
  question: string;
  /** Body content, JSX so we can include links and inline code. */
  answer: React.ReactNode;
}

const FLASH_GUIDE_URL =
  'https://github.com/kenkoller/KyberStation/blob/main/docs/FLASH_GUIDE.md';
const ISSUES_URL = 'https://github.com/kenkoller/KyberStation/issues';

const FAQ: FAQEntry[] = [
  {
    slug: 'what-is-kyberstation',
    question: 'What is KyberStation?',
    answer: (
      <>
        <p>
          KyberStation is a visual editor for designing lightsaber blade
          styles. You arrange colors, ignition animations, and combat
          effects in the browser, preview them on a real-time
          simulator, and export ProffieOS-compatible C++ code that
          drops into your Proffieboard config.
        </p>
        <p>
          Think of it like a DAW for sabers — but for v1.0 we ship the
          design half. The flash half (web-based programming) is
          experimental; the canonical workflow is{' '}
          <code>arduino-cli</code> + <code>dfu-util</code>.
        </p>
      </>
    ),
  },
  {
    slug: 'do-i-need-to-install',
    question: 'Do I need to install anything?',
    answer: (
      <>
        <p>
          To <em>design</em>: no. KyberStation runs in any modern
          desktop browser. You can install it as a PWA from your
          browser&apos;s menu for offline editing.
        </p>
        <p>
          To <em>flash</em> a real saber: yes — you&apos;ll need{' '}
          <code>arduino-cli</code>, the Proffieboard board manager, and
          <code> dfu-util</code>. Full setup is documented in the{' '}
          <a
            href={FLASH_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
          >
            Flash Guide
          </a>
          .
        </p>
      </>
    ),
  },
  {
    slug: 'what-is-a-proffieboard',
    question: "What's a Proffieboard? Do I need one?",
    answer: (
      <>
        <p>
          The{' '}
          <a
            href="https://fredrik.hubbe.net/lightsaber/v6/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
          >
            Proffieboard
          </a>{' '}
          is a hobbyist-favorite STM32-based saber controller designed
          by Fredrik Hübinette. It runs ProffieOS, the open-source
          firmware that interprets the C++ blade-style templates
          KyberStation generates.
        </p>
        <p>
          You don&apos;t need one to use the editor — the visualizer
          and codegen all work without hardware. But the generated
          config only flashes onto Proffieboards (V2 or V3.9).
          KyberStation is unaffiliated with the Proffieboard project;
          we just emit valid templates for it.
        </p>
      </>
    ),
  },
  {
    slug: 'why-is-flashing-experimental',
    question: 'Why is web-based flashing experimental?',
    answer: (
      <>
        <p>
          The browser-based flasher (WebUSB + DFU) works fine on stock
          boards, but vendor-customized Proffieboards (89sabers, KR
          Sabers, Saberbay, Vader&apos;s Vault, etc.) sometimes ship
          with non-standard Option Bytes or custom bootloaders that
          break the WebUSB manifest phase.
        </p>
        <p>
          For v1.0 we kept the WebUSB path behind a 3-checkbox
          disclaimer (responsibility / firmware backup / recovery
          procedure) and recommend <code>dfu-util</code> as the
          reliable path. The{' '}
          <a
            href={FLASH_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
          >
            Flash Guide
          </a>{' '}
          walks through the safe workflow start to finish.
        </p>
      </>
    ),
  },
  {
    slug: 'safari-ios',
    question: 'Can I use this on iOS or Safari?',
    answer: (
      <>
        <p>
          Safari on macOS works for design and codegen. Some bloom
          effects render slightly differently than on Chromium-based
          browsers; that&apos;s tracked as a known issue.
        </p>
        <p>
          On iOS — partially. The editor renders, but Apple&apos;s
          policy disallows USB I/O on iOS browsers, so flashing won&apos;t
          work. Mobile Safari is best used as a read-only preview
          surface or for the Kyber Code share-link receiving end.
        </p>
      </>
    ),
  },
  {
    slug: 'affiliated',
    question:
      'Is this affiliated with ProffieOS, Disney, or saber vendors?',
    answer: (
      <>
        <p>
          No. KyberStation is a fan-made hobby project, unaffiliated
          with Lucasfilm Ltd., The Walt Disney Company, the ProffieOS
          project, the Proffieboard project, or any saber vendor.
        </p>
        <p>
          ProffieOS template reference material is GPL-3.0 and ships as
          an aggregate work under those terms. KyberStation source is
          MIT-licensed. &ldquo;Lightsaber&rdquo; is a registered
          trademark of Lucasfilm Ltd.
        </p>
      </>
    ),
  },
  {
    slug: 'where-does-data-live',
    question: 'Where does my data live?',
    answer: (
      <>
        <p>
          In your browser. KyberStation has no backend, no login, and
          no analytics. Saved presets, profiles, and card queues
          persist in IndexedDB. Layout and theme preferences live in{' '}
          <code>localStorage</code>. Sound fonts you import stay on
          your machine.
        </p>
        <p>
          The only network calls the app makes are static asset loads
          (fonts, scripts, images). Your saber designs are never
          transmitted anywhere unless you explicitly export them or
          share a Kyber Code URL.
        </p>
      </>
    ),
  },
  {
    slug: 'share-design',
    question: 'Can I share my saber design?',
    answer: (
      <>
        <p>
          Yes — every design encodes as a <em>Kyber Code</em>: a short
          base58 fragment that round-trips your full BladeConfig. Click
          the share button in the editor header and the URL pattern{' '}
          <code>?s=&lt;glyph&gt;</code> gets copied to your clipboard.
          Recipients open it and load your exact design.
        </p>
        <p>
          Typical glyphs are ~18&ndash;130 characters. The same payload
          can render as a 3D Kyber Crystal in the My Crystal panel.
        </p>
      </>
    ),
  },
  {
    slug: 'sound-fonts',
    question: 'What sound fonts are supported?',
    answer: (
      <>
        <p>
          KyberStation auto-detects the standard Proffie and CFX font
          folder layouts. Use the file picker in the AUDIO section to
          point the app at your local font library; events get
          recognized across 12 modern Proffie sound categories.
        </p>
        <p>
          The SmoothSwing engine simulates V1 + V2 hum/swing crossfades
          in the browser so you can preview pairs before flashing.
          Brave users may need to enable the{' '}
          <code>file-system-access-api</code> flag at{' '}
          <code>brave://flags/</code> the first time.
        </p>
      </>
    ),
  },
  {
    slug: 'bricked-saber',
    question: 'I bricked my saber, what now?',
    answer: (
      <>
        <p>
          If you took the firmware backup step recommended in the{' '}
          <a
            href={FLASH_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
          >
            Flash Guide
          </a>
          , recovery is a 30-second{' '}
          <code>dfu-util --download backup.bin</code> away. Hold BOOT
          → tap RESET → release BOOT to enter DFU mode, then re-flash.
        </p>
        <p>
          If you didn&apos;t back up first: the recovery path depends
          on your specific board. For most stock boards, re-flashing a
          standard ProffieOS image will recover them. Vendor-customized
          boards may need an ST-Link adapter and STM32CubeProgrammer.
          The Flash Guide&apos;s recovery section covers both paths.
        </p>
      </>
    ),
  },
  {
    slug: 'offline',
    question: 'Can I run this offline?',
    answer: (
      <>
        <p>
          Yes — KyberStation is a PWA. Install it via your browser&apos;s
          menu (&ldquo;Install app&rdquo; / &ldquo;Add to dock&rdquo;)
          and it works offline. The service worker caches the editor
          shell + all engine code; presets and assets are pre-bundled.
        </p>
        <p>
          The codegen + simulator run entirely client-side, so designing
          on a flight with no network is fully supported.
        </p>
      </>
    ),
  },
  {
    slug: 'report-bug',
    question: 'How do I report a bug or request a feature?',
    answer: (
      <>
        <p>
          Open an issue on{' '}
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
          >
            GitHub
          </a>
          . Bug reports, feature requests, and preset requests all use
          dedicated templates.
        </p>
        <p>
          For v1.0 we don&apos;t accept outside pull requests yet —
          that policy gets revisited 30 days post-launch. Issues and
          feedback are very welcome in the meantime.
        </p>
      </>
    ),
  },
  {
    slug: 'is-it-free',
    question: 'Is KyberStation free?',
    answer: (
      <>
        <p>
          Yes. MIT-licensed source, no ads, no paywalls, no telemetry,
          no &ldquo;pro tier.&rdquo; Use it, fork it, mod it; the only
          ask is that you respect the GPL-3.0 boundary on the bundled
          ProffieOS reference material.
        </p>
      </>
    ),
  },
];

export default function FAQPage() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col">
      <MarketingHeader active="faq" />

      <section
        className="relative border-b border-border-subtle py-16 md:py-20"
        aria-labelledby="faq-page-heading"
      >
        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center">
          <ScrollReveal>
            <div
              className="font-mono text-xs tracking-widest mb-4 tabular-nums"
              style={{ color: 'rgb(var(--accent))' }}
            >
              FREQUENTLY / ASKED
            </div>
            <h1
              className="font-cinematic text-3xl md:text-5xl tracking-[0.08em] font-semibold uppercase text-text-primary mb-5"
              id="faq-page-heading"
            >
              FAQ
            </h1>
            <p className="font-sans text-[15px] md:text-base leading-relaxed text-text-secondary max-w-2xl mx-auto">
              Common questions about scope, hardware compatibility,
              sharing, and recovery. Click any question to expand it;
              each entry has a stable URL anchor for deep-linking.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="flex-1 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 md:px-8 space-y-3">
          {FAQ.map((entry) => (
            <details
              key={entry.slug}
              id={entry.slug}
              className="group border bg-bg-deep/40 transition-colors scroll-mt-24"
              style={{
                borderColor: 'rgb(var(--border-subtle))',
                borderRadius: 'var(--r-chrome, 2px)',
              }}
            >
              <summary
                className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-sans text-[15px] md:text-base text-text-primary tracking-[0.02em] hover:text-accent transition-colors"
                aria-label={entry.question}
              >
                <span className="flex-1">{entry.question}</span>
                <span
                  aria-hidden="true"
                  className="font-mono text-lg leading-none shrink-0 text-text-muted group-open:rotate-45 transition-transform"
                >
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 pt-1 space-y-3 font-sans text-[14px] leading-relaxed text-text-secondary">
                {entry.answer}
                <a
                  href={`#${entry.slug}`}
                  className="inline-flex items-center font-mono text-[11px] tracking-widest text-text-muted hover:text-accent transition-colors mt-2"
                >
                  # PERMALINK
                </a>
              </div>
            </details>
          ))}

          <p className="font-sans text-[13px] text-text-muted text-center pt-8">
            Don&apos;t see your question?{' '}
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
            >
              Open an issue on GitHub
            </a>{' '}
            — or jump straight to the{' '}
            <Link
              href="/editor"
              className="underline decoration-dotted underline-offset-2 hover:text-accent transition-colors"
            >
              editor
            </Link>{' '}
            and try it.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
