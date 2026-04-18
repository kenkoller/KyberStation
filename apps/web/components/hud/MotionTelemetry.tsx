'use client';

import { CircularGauge } from './CircularGauge';
import { CornerBrackets } from './CornerBrackets';
import { ConsoleIndicator } from './ConsoleIndicator';

interface MotionTelemetryProps {
  swingSpeed: number; // 0-1 normalized
  bladeAngle: number; // -1 to 1 (maps to -90 to 90 degrees)
  twistAngle: number; // -1 to 1 (maps to -180 to 180 degrees)
  className?: string;
}

/**
 * Cockpit instrument cluster for motion simulation data.
 * Displays swing speed, blade angle, and twist angle as circular gauges
 * with custom degree readouts for angle values.
 */
export function MotionTelemetry({
  swingSpeed,
  bladeAngle,
  twistAngle,
  className = '',
}: MotionTelemetryProps) {
  const angleNormalized = (bladeAngle + 1) / 2;
  const twistNormalized = (twistAngle + 1) / 2;
  const angleDegrees = Math.round(bladeAngle * 90);
  const twistDegrees = Math.round(twistAngle * 180);
  const gaugeSize = 56;

  return (
    <CornerBrackets
      className={`pointer-events-auto ${className}`}
      size={10}
    >
      <div
        className="flex flex-col gap-2 p-3"
        role="group"
        aria-label="Motion telemetry"
      >
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <ConsoleIndicator variant="breathe" size={4} />
          <span
            className="dot-matrix"
            style={{
              fontSize: 9,
              color: 'rgb(var(--text-muted))',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Motion Telemetry
          </span>
        </div>

        {/* Gauges row */}
        <div className="flex items-start justify-between gap-1">
          {/* Swing — standard percentage display */}
          <CircularGauge
            value={swingSpeed}
            label="SWING"
            size={gaugeSize}
            unit="%"
          />

          {/* Angle — custom degree display */}
          <div
            className="relative inline-flex flex-col items-center"
            aria-label={`Blade angle: ${angleDegrees} degrees`}
          >
            <CircularGauge
              value={angleNormalized}
              label="ANGLE"
              size={gaugeSize}
              showValue={false}
            />
            <span
              className="absolute"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: Math.max(10, gaugeSize * 0.22),
                color: 'rgb(var(--text-primary))',
                lineHeight: 1,
                top: '42%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {angleDegrees}
              <span
                style={{
                  fontSize: Math.max(10, gaugeSize * 0.22) * 0.6,
                  color: 'rgb(var(--text-muted))',
                  marginLeft: 1,
                }}
              >
                &deg;
              </span>
            </span>
          </div>

          {/* Twist — custom degree display */}
          <div
            className="relative inline-flex flex-col items-center"
            aria-label={`Twist angle: ${twistDegrees} degrees`}
          >
            <CircularGauge
              value={twistNormalized}
              label="TWIST"
              size={gaugeSize}
              showValue={false}
            />
            <span
              className="absolute"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: Math.max(10, gaugeSize * 0.22),
                color: 'rgb(var(--text-primary))',
                lineHeight: 1,
                top: '42%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {twistDegrees}
              <span
                style={{
                  fontSize: Math.max(10, gaugeSize * 0.22) * 0.6,
                  color: 'rgb(var(--text-muted))',
                  marginLeft: 1,
                }}
              >
                &deg;
              </span>
            </span>
          </div>
        </div>
      </div>
    </CornerBrackets>
  );
}
