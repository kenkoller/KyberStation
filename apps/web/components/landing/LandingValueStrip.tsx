interface ValueCellProps {
  index: string;
  title: string;
  detail: string;
}

function ValueCell({ index, title, detail }: ValueCellProps) {
  return (
    <div
      className="relative pl-4 lg:pl-0 lg:border-l-0 border-l"
      style={{ borderLeftColor: 'rgb(var(--accent) / 0.25)' }}
    >
      <div
        className="font-mono text-xs tracking-widest mb-4 tabular-nums"
        style={{ color: 'rgb(var(--accent))' }}
      >
        {index}
      </div>
      <h2 className="font-sans text-base tracking-[0.12em] font-semibold text-text-primary mb-3 uppercase">
        {title}
      </h2>
      <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
        {detail}
      </p>
    </div>
  );
}

export function LandingValueStrip() {
  return (
    <section className="relative border-t border-border-subtle py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-6 md:px-8 grid lg:grid-cols-3 gap-10 lg:gap-16">
        <ValueCell
          index="01 / DESIGN"
          title="WYSIWYG, not config editing"
          detail="29 blade styles, 21 effects, 19 ignition animations. Click the blade to place spatial effects. Everything round-trips through ProffieOS-compatible C++."
        />
        <ValueCell
          index="02 / SIMULATE"
          title="Motion, audio, and real diffusion"
          detail="Swing, angle, and twist drive the sim. Audio sync pitches the sound font to gesture. Neopixel gamma and WS2812b bias in the preview — not a cartoon."
        />
        <ValueCell
          index="03 / EXPORT"
          title="Compiles clean. Writes the card."
          detail="Generated code drops into Arduino IDE with no edits. One-click SD card write. Share builds as URL seeds, no account required."
        />
      </div>
    </section>
  );
}
