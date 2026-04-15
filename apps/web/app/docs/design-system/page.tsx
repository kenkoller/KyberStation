'use client';

import { useState, useCallback } from 'react';
import {
  ScanSweep,
  CornerBrackets,
  AurebeshScroll,
  DataTicker,
  ConsoleIndicator,
  HoloFlicker,
  CircularGauge,
  SegmentedBar,
} from '@/components/hud';

/* ─── Helpers ─── */

/** Unmount/remount a child to replay a CSS animation. */
function AnimationReplay({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  const [key, setKey] = useState(0);
  const replay = useCallback(() => setKey((k) => k + 1), []);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
        .{className}
      </span>
      <div
        key={key}
        className={`${className} p-4 rounded`}
        style={{
          background: 'rgb(var(--bg-card))',
          border: '1px solid var(--border-light)',
          color: 'rgb(var(--text-primary))',
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="text-ui-base">{label}</span>
      </div>
      <button
        onClick={replay}
        className="btn-hum text-ui-sm self-start px-3 py-1 rounded"
        style={{
          background: 'rgb(var(--bg-surface))',
          border: '1px solid var(--border-light)',
          color: 'rgb(var(--text-secondary))',
          cursor: 'pointer',
        }}
      >
        Replay
      </button>
    </div>
  );
}

/* ─── Section wrapper ─── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2
        className="font-cinematic text-ui-lg"
        style={{ color: 'rgb(var(--text-primary))' }}
      >
        {title}
      </h2>
      {children}
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: 8,
        }}
      />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DesignSystemPage() {
  return (
    <div
      className="min-h-screen p-6 md:p-10 flex flex-col gap-10"
      style={{ background: 'rgb(var(--bg-deep))', maxWidth: 1100, margin: '0 auto' }}
    >
      {/* Header */}
      <header className="flex flex-col gap-2">
        <h1
          className="font-cinematic text-ui-xl"
          style={{ color: 'rgb(var(--text-primary))', fontSize: 'calc(20px * var(--font-scale))' }}
        >
          Design System
        </h1>
        <p className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
          Internal design system reference — not visible to end users
        </p>
      </header>

      {/* ── 1. Material Surfaces ── */}
      <Section title="Material Surfaces">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              ['material-matte', 'Matte'],
              ['material-satin', 'Satin'],
              ['material-gloss', 'Gloss'],
            ] as const
          ).map(([cls, label]) => (
            <div
              key={cls}
              className={`${cls} p-4 flex flex-col gap-1`}
              style={{ width: '100%', minHeight: 120, borderRadius: 6 }}
            >
              <span className="text-ui-base font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                {label}
              </span>
              <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                .{cls}
              </span>
              <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                Surface treatment placeholder text to demonstrate the finish.
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 2. Corner Styles ── */}
      <Section title="Corner Styles">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              ['corner-rounded', 'Rounded'],
              ['corner-angular', 'Angular'],
              ['corner-clipped', 'Clipped'],
            ] as const
          ).map(([cls, label]) => (
            <div
              key={cls}
              className={cls}
              style={{
                width: '100%',
                minHeight: 100,
                background: 'rgb(var(--bg-card))',
                border: '1px solid rgb(var(--accent) / 0.3)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span className="text-ui-base font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                {label}
              </span>
              <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                .{cls}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3. Border Styles ── */}
      <Section title="Border Styles">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              ['border-subtle', 'Subtle'],
              ['border-lined', 'Lined'],
              ['border-glow', 'Glow'],
            ] as const
          ).map(([cls, label]) => (
            <div
              key={cls}
              className={`${cls} corner-rounded`}
              style={{
                width: '100%',
                minHeight: 100,
                background: 'rgb(var(--bg-card))',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span className="text-ui-base font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                {label}
              </span>
              <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                .{cls}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 4. HUD Components ── */}
      <Section title="HUD Components">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ScanSweep */}
          <div className="flex flex-col gap-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              ScanSweep (size=120)
            </span>
            <div
              className="flex items-center justify-center rounded"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid var(--border-subtle)',
                padding: 16,
                minHeight: 160,
              }}
            >
              <ScanSweep size={120} />
            </div>
          </div>

          {/* CornerBrackets */}
          <div className="flex flex-col gap-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              CornerBrackets
            </span>
            <div
              className="flex items-center justify-center rounded"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid var(--border-subtle)',
                padding: 16,
                minHeight: 160,
              }}
            >
              <CornerBrackets>
                <div
                  style={{
                    padding: '20px 24px',
                    color: 'rgb(var(--text-primary))',
                  }}
                  className="text-ui-base"
                >
                  Bracketed panel content
                </div>
              </CornerBrackets>
            </div>
          </div>

          {/* AurebeshScroll */}
          <div className="flex flex-col gap-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              AurebeshScroll
            </span>
            <div
              className="relative rounded"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid var(--border-subtle)',
                height: 200,
                overflow: 'hidden',
              }}
            >
              <AurebeshScroll side="right" />
              <AurebeshScroll side="left" />
              <div
                className="text-ui-sm flex items-center justify-center h-full"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                Scrolling columns on left and right
              </div>
            </div>
          </div>

          {/* DataTicker */}
          <div className="flex flex-col gap-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              DataTicker
            </span>
            <div
              className="rounded"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid var(--border-subtle)',
                padding: '16px 0',
                overflow: 'hidden',
              }}
            >
              <DataTicker />
            </div>
          </div>

          {/* ConsoleIndicator — all 4 variants */}
          <div className="flex flex-col gap-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              ConsoleIndicator (all variants)
            </span>
            <div
              className="rounded flex items-center gap-6 flex-wrap"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid var(--border-subtle)',
                padding: 16,
              }}
            >
              {(
                ['blink', 'breathe', 'alert', 'steady'] as const
              ).map((variant) => (
                <div key={variant} className="flex items-center gap-2">
                  <ConsoleIndicator variant={variant} size={6} />
                  <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                    {variant}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* HoloFlicker */}
          <div className="flex flex-col gap-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              HoloFlicker
            </span>
            <div
              className="rounded flex items-center justify-center"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid var(--border-subtle)',
                padding: 16,
                minHeight: 80,
              }}
            >
              <HoloFlicker frequency={3}>
                <span
                  className="font-cinematic text-ui-base"
                  style={{ color: 'rgb(var(--accent))', letterSpacing: '0.1em' }}
                >
                  Holographic transmission active
                </span>
              </HoloFlicker>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 5. Data Displays ── */}
      <Section title="Data Displays">
        {/* Circular Gauges */}
        <div className="flex flex-col gap-3">
          <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
            CircularGauge
          </span>
          <div
            className="rounded flex items-end justify-center gap-8 flex-wrap"
            style={{
              background: 'rgb(var(--bg-card))',
              border: '1px solid var(--border-subtle)',
              padding: 24,
            }}
          >
            <CircularGauge value={0.25} label="Power" size={80} />
            <CircularGauge value={0.65} label="Memory" size={80} />
            <CircularGauge value={0.90} label="Load" size={80} />
          </div>
        </div>

        {/* Segmented Bars */}
        <div className="flex flex-col gap-3 mt-4">
          <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
            SegmentedBar
          </span>
          <div
            className="rounded flex flex-col gap-4"
            style={{
              background: 'rgb(var(--bg-card))',
              border: '1px solid var(--border-subtle)',
              padding: 20,
            }}
          >
            <SegmentedBar value={0.35} label="Charge" segments={12} />
            <SegmentedBar
              value={0.72}
              label="Temperature"
              segments={12}
              colorStops={[
                [0, '#22c55e'],
                [0.6, '#eab308'],
                [0.85, '#ef4444'],
              ]}
            />
            <SegmentedBar value={0.95} label="Signal" segments={12} />
          </div>
        </div>
      </Section>

      {/* ── 6. Animations ── */}
      <Section title="Animations">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimationReplay className="panel-wipe-enter" label="Panel wipe in" />
          <AnimationReplay className="modal-holo-enter" label="Modal hologram entry" />
          <AnimationReplay className="toast-comm-enter" label="Toast comm incoming" />

          {/* btn-hum */}
          <div className="flex flex-col gap-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              .btn-hum (hover to see glow)
            </span>
            <button
              className="btn-hum text-ui-base px-5 py-2 rounded self-start"
              style={{
                background: 'rgb(var(--bg-surface))',
                border: '1px solid var(--border-light)',
                color: 'rgb(var(--text-primary))',
                cursor: 'pointer',
              }}
            >
              Hover Me
            </button>
          </div>

          {/* dot-matrix */}
          <div className="flex flex-col gap-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              .dot-matrix
            </span>
            <div
              className="rounded p-4"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span className="dot-matrix">system nominal :: blade online</span>
            </div>
          </div>

          {/* dot-matrix-bright */}
          <div className="flex flex-col gap-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
              .dot-matrix-bright
            </span>
            <div
              className="rounded p-4"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span className="dot-matrix-bright">kyber resonance detected</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 7. Typography ── */}
      <Section title="Typography">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
              .font-cinematic
            </span>
            <span
              className="font-cinematic"
              style={{ fontSize: 'calc(16px * var(--font-scale))', color: 'rgb(var(--text-primary))' }}
            >
              BladeForge Universal Saber Style Engine
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
              .font-sw-body
            </span>
            <span
              className="font-sw-body"
              style={{ fontSize: 'calc(14px * var(--font-scale))', color: 'rgb(var(--text-primary))' }}
            >
              A long time ago in a galaxy far, far away...
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
              .sw-header
            </span>
            <span
              className="sw-header"
              style={{ fontSize: 'calc(18px * var(--font-scale))' }}
            >
              The Force Awakens
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
              .sw-sith-text
            </span>
            <span
              className="sw-sith-text"
              style={{ fontSize: 'calc(16px * var(--font-scale))' }}
            >
              Peace is a lie. There is only passion.
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
              .sw-jedi-text
            </span>
            <span
              className="sw-jedi-text"
              style={{ fontSize: 'calc(16px * var(--font-scale))' }}
            >
              There is no emotion, there is peace.
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
              .sw-aurebesh
            </span>
            <span
              className="sw-aurebesh"
              style={{ fontSize: 'calc(14px * var(--font-scale))', color: 'rgb(var(--text-primary))' }}
            >
              Aurebesh letterforms sample text
            </span>
          </div>

          {/* Text scale classes */}
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-ui-sm" style={{ color: 'rgb(var(--text-muted))' }}>
              UI text scale (.text-ui-*)
            </span>
            <div
              className="flex flex-col gap-1 rounded p-4"
              style={{
                background: 'rgb(var(--bg-card))',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span className="text-ui-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                .text-ui-xs - Extra small UI text
              </span>
              <span className="text-ui-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                .text-ui-sm - Small UI text
              </span>
              <span className="text-ui-base" style={{ color: 'rgb(var(--text-secondary))' }}>
                .text-ui-base - Base UI text
              </span>
              <span className="text-ui-md" style={{ color: 'rgb(var(--text-secondary))' }}>
                .text-ui-md - Medium UI text
              </span>
              <span className="text-ui-lg" style={{ color: 'rgb(var(--text-secondary))' }}>
                .text-ui-lg - Large UI text
              </span>
              <span className="text-ui-xl" style={{ color: 'rgb(var(--text-secondary))' }}>
                .text-ui-xl - Extra large UI text
              </span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
