const REPO_ISSUES_URL = 'https://github.com/kenkoller/KyberStation/issues';
const FLASH_GUIDE_URL =
  'https://github.com/kenkoller/KyberStation/blob/main/docs/FLASH_GUIDE.md';

/**
 * Beta + flash-safety advisory. Amber `--badge-creative` framing
 * (informative, not destructive). Two equal-weight callouts: the
 * project posture (first public release, hobby project, feedback
 * welcome) and the flash safety story (dfu-util preferred, WebUSB
 * experimental, BACK UP YOUR FIRMWARE).
 */
export function LandingBetaNotice() {
  return (
    <section
      className="relative border-t border-border-subtle py-16 md:py-20"
      aria-labelledby="beta-heading"
    >
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <header className="mb-10 md:mb-12 text-center">
          <div
            className="inline-flex items-center gap-2 font-mono text-xs tracking-widest mb-4 px-3 py-1 tabular-nums"
            style={{
              color: 'rgb(var(--badge-creative))',
              border: '1px solid rgb(var(--badge-creative) / 0.4)',
              borderRadius: 'var(--r-chrome, 2px)',
            }}
          >
            <span aria-hidden="true">▲</span>
            <span>BETA · v1.0</span>
          </div>
          <h2
            id="beta-heading"
            className="font-sans text-2xl md:text-3xl tracking-[0.08em] font-semibold uppercase text-text-primary"
          >
            Notes for first-time users
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {/* Project posture card */}
          <article
            className="relative pt-6 pl-6 pr-6 pb-7 border bg-bg-deep/40"
            style={{
              borderColor: 'rgb(var(--badge-creative) / 0.35)',
              borderRadius: 'var(--r-chrome, 2px)',
            }}
          >
            <h3 className="font-sans text-[13px] tracking-[0.16em] font-semibold uppercase mb-4 text-text-primary">
              First public release
            </h3>
            <p className="font-sans text-[14px] leading-relaxed text-text-secondary mb-4">
              KyberStation is a hobby project — the first public programming
              project from one developer in the saber community. Expect rough
              edges. Things will break.
            </p>
            <p className="font-sans text-[14px] leading-relaxed text-text-secondary">
              Issues and feedback are welcome on{' '}
              <a
                href={REPO_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-text-primary transition-colors"
                style={{ color: 'rgb(var(--accent))' }}
              >
                GitHub
              </a>
              . Outside pull requests aren&apos;t accepted yet — that policy
              gets revisited 30 days post-launch.
            </p>
          </article>

          {/* Flash safety card */}
          <article
            className="relative pt-6 pl-6 pr-6 pb-7 border bg-bg-deep/40"
            style={{
              borderColor: 'rgb(var(--badge-creative) / 0.35)',
              borderRadius: 'var(--r-chrome, 2px)',
            }}
          >
            <h3 className="font-sans text-[13px] tracking-[0.16em] font-semibold uppercase mb-4 text-text-primary">
              Flashing your saber
            </h3>
            <ul className="space-y-3 text-text-secondary text-[14px] leading-relaxed">
              <li className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="font-mono shrink-0 mt-[2px]"
                  style={{ color: 'rgb(var(--badge-creative))' }}
                >
                  ◆
                </span>
                <span>
                  Recommended path:{' '}
                  <code className="font-mono text-[13px] text-text-primary px-1 bg-bg-card/60 rounded-sm">
                    dfu-util
                  </code>{' '}
                  + arduino-cli. Validated end-to-end.
                </span>
              </li>
              <li className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="font-mono shrink-0 mt-[2px]"
                  style={{ color: 'rgb(var(--badge-creative))' }}
                >
                  ▲
                </span>
                <span>
                  Web-based flashing is{' '}
                  <strong className="text-text-primary font-semibold">
                    EXPERIMENTAL
                  </strong>{' '}
                  — works on stock boards, less reliable on vendor-customized
                  ones.
                </span>
              </li>
              <li className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="font-mono shrink-0 mt-[2px]"
                  style={{ color: 'rgb(var(--badge-creative))' }}
                >
                  ✕
                </span>
                <span>
                  <strong className="text-text-primary font-semibold">
                    Always back up your firmware
                  </strong>{' '}
                  before flashing anything new. Turns &ldquo;bricked
                  saber&rdquo; into &ldquo;30-second recovery.&rdquo;
                </span>
              </li>
            </ul>
            <a
              href={FLASH_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center font-mono text-xs tracking-widest hover:text-text-primary transition-colors"
              style={{ color: 'rgb(var(--badge-creative))' }}
            >
              READ THE FLASH GUIDE →
            </a>
          </article>
        </div>

        {/* Hardware Reality callout — full-width below the two cards. The
            in-app deliverability panel says the same thing per-export
            target with per-knob detail; this is the landing-level
            summary so visitors set expectations BEFORE designing. */}
        <article
          className="relative mt-5 md:mt-6 pt-6 pl-6 pr-6 pb-7 border bg-bg-deep/40"
          style={{
            borderColor: 'rgb(var(--badge-creative) / 0.35)',
            borderRadius: 'var(--r-chrome, 2px)',
          }}
        >
          <h3 className="font-sans text-[13px] tracking-[0.16em] font-semibold uppercase mb-4 text-text-primary">
            Hardware reality — what actually transfers to your saber
          </h3>
          <p className="font-sans text-[14px] leading-relaxed text-text-secondary mb-4">
            KyberStation&apos;s editor models more than any single export
            path delivers. The in-app deliverability panel calls out exactly
            what transfers vs what doesn&apos;t for your chassis + export
            path before you click Export. The short version:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-text-secondary text-[14px] leading-relaxed">
            <li className="flex gap-2">
              <span aria-hidden="true" className="font-mono shrink-0 mt-[2px]" style={{ color: 'rgb(var(--status-ok))' }}>
                ✓
              </span>
              <span>
                <strong className="text-text-primary font-semibold">Proffieboard V3 compile + flash</strong> — most knobs transfer (32 of 33 styles have codegen parity; modulation bindings partial). Validated on the (now-retired) non-BT 89sabers V3.9; <strong>not currently reliable on the V3.9-BT</strong> — use Runtime Presets for those.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="font-mono shrink-0 mt-[2px]" style={{ color: 'rgb(var(--status-ok))' }}>
                ✓
              </span>
              <span>
                <strong className="text-text-primary font-semibold">ProffieOS Runtime Presets</strong> — names, fonts, tracks, order always transfer. Custom colors + timing transfer in Phase C (experimental).
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="font-mono shrink-0 mt-[2px]" style={{ color: 'rgb(var(--accent-warm))' }}>
                ⚠
              </span>
              <span>
                <strong className="text-text-primary font-semibold">Xenopixel V3</strong> — real SD-card config, but only 8 of ~25 firmware effects + 12 of ~50 ignitions; clash/lockup/blast don&apos;t transfer (firmware limit, not us).
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="font-mono shrink-0 mt-[2px]" style={{ color: 'rgb(var(--status-info))' }}>
                📋
              </span>
              <span>
                <strong className="text-text-primary font-semibold">CFX / Golden Harvest</strong> — design-reference notes only. KyberStation doesn&apos;t write flashable firmware for these — use the ZIP as a guide for the vendor app.
              </span>
            </li>
          </ul>
          <p className="font-sans text-[13px] leading-relaxed text-text-muted mt-4">
            Vendor chassis (89sabers V3.9-BT, Sabertrio, KR Sabers, etc.) load runtime presets at boot — drop the file on the SD card, reboot, presets appear, no firmware flash required.
          </p>
        </article>
      </div>
    </section>
  );
}
