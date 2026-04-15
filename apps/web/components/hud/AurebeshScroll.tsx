'use client';

interface AurebeshScrollProps {
  speed?: number;
  side?: 'left' | 'right';
  width?: number;
  className?: string;
}

const AUREBESH_LETTERS =
  'AUREK BESH CRESH DORN ESK FORN GREK HERF ISK JENTH KRILL LETH MERN ' +
  'NERN OREK PETH QHEK RESH SENTH TRILL USK VEV WESK XESH YIRT ZEREK';

/**
 * Vertical scrolling column of Aurebesh letter names.
 * Uses `hud-aurebesh-scroll` keyframe from globals.css.
 */
export function AurebeshScroll({
  speed = 30,
  side = 'right',
  width = 12,
  className = '',
}: AurebeshScrollProps) {
  // Double the text for seamless looping
  const text = `${AUREBESH_LETTERS} ${AUREBESH_LETTERS}`;

  return (
    <div
      className={`pointer-events-none absolute top-0 bottom-0 overflow-hidden ${className}`}
      style={{
        width,
        [side]: 6,
      }}
      aria-hidden="true"
    >
      <div
        className="hud-aurebesh-scroll"
        style={{
          writingMode: side === 'right' ? 'vertical-rl' : 'vertical-lr',
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
          fontSize: 6,
          lineHeight: 1.6,
          letterSpacing: '0.15em',
          color: 'rgba(var(--accent), 0.06)',
          opacity: 'calc(1 * var(--ambient-intensity, 1))',
          animation: `hud-aurebesh-scroll ${speed}s linear infinite`,
        }}
      >
        {text}
      </div>
    </div>
  );
}
