'use client';

// ─── GalleryDetailModal — preset detail overlay (grid card click target) ──
//
// Opens when a user clicks any card in the GalleryGridView. Shows the same
// metadata + share affordances as the legacy GalleryColumnB hero detail,
// but in a focused center-stage modal with explicit Open / Cancel actions.
//
// Hard contract — DO NOT auto-load preset on card click. The preset only
// loads into bladeStore + routes to /editor on the explicit "Open in
// Workbench" CTA. Closing the modal (Cancel / Escape / outside-click /
// Close button) leaves the editor untouched. This prevents users from
// losing unsaved work to accidental clicks while browsing.
//
// Reuses `useModalDialog` for focus-trap + Escape-to-close + autofocus
// on the primary action (matching the rest of the app's modal idiom).

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Preset } from '@kyberstation/presets';
import type { BladeConfig } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import { encodeConfig, buildShareUrl } from '@/lib/configUrl';
import { playUISound } from '@/lib/uiSounds';
import { useModalDialog } from '@/hooks/useModalDialog';
import { MiniSaber } from '@/components/shared/MiniSaber';
import { EraBadge, FactionBadge } from '@/components/shared/StatusSignal';
import { presetContinuity } from './galleryAB.types';

export interface GalleryDetailModalProps {
  preset: Preset;
  onClose: () => void;
}

export function GalleryDetailModal({
  preset,
  onClose,
}: GalleryDetailModalProps): JSX.Element {
  const router = useRouter();
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );

  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen: true,
    onClose,
  });

  const handleOpenInWorkbench = useCallback(() => {
    loadPreset(preset.config as BladeConfig);
    playUISound('preset-loaded');
    router.push('/editor');
  }, [loadPreset, preset.config, router]);

  const handleShare = useCallback(async () => {
    try {
      const encoded = await encodeConfig(preset.config as BladeConfig);
      const url = buildShareUrl(encoded);
      await navigator.clipboard.writeText(url);
      playUISound('copy');
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [preset.config]);

  const continuity = presetContinuity(preset);
  const isLegends = continuity === 'legends';
  const screenAccurate = preset.screenAccurate ?? true;
  const { r, g, b } = preset.config.baseColor;
  const accentCss = `rgb(${r}, ${g}, ${b})`;
  const titleId = `gallery-detail-title-${preset.id}`;

  return (
    // Overlay backdrop — clicking outside the dialog closes it.
    <div
      role="presentation"
      data-testid="gallery-detail-modal-backdrop"
      onClick={(e) => {
        // Only close when the click was directly on the backdrop, not on
        // a bubbled click from inside the dialog content.
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="gallery-detail-modal"
        data-preset-id={preset.id}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-border-subtle bg-bg-deep shadow-2xl"
      >
        {/* Close (X) button — top-right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail view"
          className="absolute top-3 right-3 z-10 w-8 h-8 inline-flex items-center justify-center rounded-full border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-light bg-bg-deep/80 transition-colors"
          data-testid="gallery-detail-close"
        >
          <span aria-hidden="true">✕</span>
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Hero blade column */}
          <div
            className="relative shrink-0 flex items-center justify-center px-6 py-8"
            style={{ width: 240, minHeight: 480 }}
          >
            {/* Soft accent glow backer */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 50% 60% at center, ${accentCss} 0%, transparent 70%)`,
                opacity: 0.18,
                filter: 'blur(28px)',
              }}
            />
            <MiniSaber
              config={preset.config as BladeConfig}
              hiltId="graflex"
              orientation="vertical"
              bladeLength={420}
              bladeThickness={6}
              hiltLength={88}
              controlledIgnited={true}
              animated={false}
              fps={30}
              ariaLabel={`${preset.name} blade preview`}
            />
          </div>

          {/* Metadata + actions column */}
          <div className="flex-1 min-w-0 px-6 py-8 space-y-5">
            {/* Header — title + character + badges */}
            <header className="space-y-2">
              <h1
                id={titleId}
                className="font-orbitron uppercase text-2xl tracking-[0.10em] text-text-primary leading-tight"
                data-testid="gallery-detail-name"
              >
                {preset.name}
              </h1>
              <p className="text-ui-sm text-text-muted">{preset.character}</p>
              <div
                className="inline-flex items-center gap-3 pt-1 text-ui-xs"
                aria-label="Preset metadata badges"
              >
                <EraBadge era={preset.era} legends={isLegends} size="md">
                  {isLegends ? 'Legends' : eraLabel(preset.era)}
                </EraBadge>
                <FactionBadge faction={preset.affiliation} size="md">
                  {factionLabel(preset.affiliation)}
                </FactionBadge>
                <span
                  className={[
                    'inline-flex items-center gap-1 font-mono uppercase tracking-[0.08em] text-[10px]',
                    screenAccurate ? 'text-accent' : 'text-text-muted',
                  ].join(' ')}
                  title={
                    screenAccurate
                      ? 'On-screen accurate — drawn from film/TV reference'
                      : 'Creative interpretation — not on-screen accurate'
                  }
                >
                  <span aria-hidden="true">{screenAccurate ? '✓' : '✦'}</span>
                  {screenAccurate ? 'Canon-accurate' : 'Creative'}
                </span>
              </div>
            </header>

            {/* Description */}
            {preset.description && (
              <p
                className="text-ui-sm text-text-secondary leading-relaxed max-w-prose"
                data-testid="gallery-detail-description"
              >
                {preset.description}
              </p>
            )}

            {/* Spec grid */}
            <section
              className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-md"
              aria-label="Configuration snapshot"
            >
              <SpecRow label="Style" value={preset.config.style} />
              <SpecRow label="Tier" value={preset.tier} />
              <SpecRow label="Source" value={continuityLabel(continuity)} />
              <SpecRow label="LEDs" value={String(preset.config.ledCount)} />
              <SpecRow label="Ignition" value={preset.config.ignition} />
              <SpecRow label="Retraction" value={preset.config.retraction} />
              <SpecRow
                label="Ignite"
                value={`${preset.config.ignitionMs} ms`}
              />
              <SpecRow
                label="Retract"
                value={`${preset.config.retractionMs} ms`}
              />
              <SpecRow
                label="Shimmer"
                value={`${Math.round(preset.config.shimmer * 100)}%`}
              />
              <SpecRow
                label="Base"
                value={`rgb(${r}, ${g}, ${b})`}
                valueColor={accentCss}
              />
            </section>

            {/* Hilt / topology notes */}
            {(preset.hiltNotes || preset.topologyNotes) && (
              <section className="space-y-2 max-w-prose text-ui-xs text-text-muted">
                {preset.hiltNotes && (
                  <div>
                    <span className="font-mono uppercase tracking-[0.08em] text-text-secondary mr-2">
                      Hilt
                    </span>
                    {preset.hiltNotes}
                  </div>
                )}
                {preset.topologyNotes && (
                  <div>
                    <span className="font-mono uppercase tracking-[0.08em] text-text-secondary mr-2">
                      Topology
                    </span>
                    {preset.topologyNotes}
                  </div>
                )}
              </section>
            )}

            {/* Authorship footer */}
            {(preset.author || preset.version) && (
              <div className="pt-2 border-t border-border-subtle text-ui-xs text-text-muted flex flex-wrap gap-x-4 gap-y-1">
                {preset.author && (
                  <span>
                    <span className="font-mono uppercase tracking-[0.08em] mr-1.5">
                      By
                    </span>
                    {preset.author}
                  </span>
                )}
                {preset.version && (
                  <span>
                    <span className="font-mono uppercase tracking-[0.08em] mr-1.5">
                      Ver
                    </span>
                    {preset.version}
                  </span>
                )}
              </div>
            )}

            {/* Action footer — explicit Open / Cancel + Kyber Code share. */}
            <footer className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleShare}
                className={[
                  'px-3 py-1.5 rounded text-ui-xs font-mono uppercase tracking-[0.08em]',
                  'border transition-colors inline-flex items-center gap-1.5',
                  copyState === 'copied'
                    ? 'border-accent-border/60 text-accent bg-accent-dim/40'
                    : copyState === 'error'
                      ? 'border-red-700/50 text-red-400 bg-red-900/20'
                      : 'border-border-subtle text-text-muted hover:text-text-primary hover:border-border-light',
                ].join(' ')}
                title="Copy a Kyber Code link to this preset"
                aria-label="Copy share link"
              >
                {copyState === 'copied' ? (
                  <>
                    <span aria-hidden="true">✓</span>
                    Copied!
                  </>
                ) : copyState === 'error' ? (
                  <>
                    <span aria-hidden="true">✕</span>
                    Failed
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">⧉</span>
                    Kyber Code
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-ui-xs font-mono uppercase tracking-[0.08em] border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-light transition-colors"
                data-testid="gallery-detail-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenInWorkbench}
                data-autofocus
                className="px-4 py-1.5 rounded text-ui-xs font-mono uppercase tracking-[0.08em] border border-accent-border bg-accent-dim/40 text-accent hover:bg-accent-dim/60 transition-colors inline-flex items-center gap-1.5"
                data-testid="gallery-detail-open"
              >
                <span aria-hidden="true">▸</span>
                Open in Workbench
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers (mirror GalleryColumnB) ────────────────────────────────

function SpecRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5 border-b border-border-subtle/30">
      <span className="font-mono uppercase text-[10px] tracking-[0.10em] text-text-muted">
        {label}
      </span>
      <span
        className="font-mono text-ui-xs text-text-primary tabular-nums truncate"
        style={valueColor ? { color: valueColor } : undefined}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function eraLabel(era: Preset['era']): string {
  switch (era) {
    case 'prequel':
      return 'Prequel';
    case 'original-trilogy':
      return 'OT';
    case 'sequel':
      return 'Sequel';
    case 'animated':
      return 'Animated';
    case 'expanded-universe':
      return 'EU';
  }
}

function factionLabel(f: Preset['affiliation']): string {
  switch (f) {
    case 'jedi':
      return 'Jedi';
    case 'sith':
      return 'Sith';
    case 'neutral':
      return 'Grey';
    case 'other':
      return 'Other';
  }
}

function continuityLabel(c: ReturnType<typeof presetContinuity>): string {
  switch (c) {
    case 'canon':
      return 'Canon';
    case 'legends':
      return 'Legends';
    case 'pop-culture':
      return 'Pop Culture';
    case 'mythology':
      return 'Mythology';
    default:
      return c;
  }
}
