'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { playUISound } from '@/lib/uiSounds';
import { useModalDialog } from '@/hooks/useModalDialog';
import { useAurebesh } from '@/hooks/useAurebesh';
import { type AurebeshMode, type AurebeshVariant } from '@/lib/aurebesh';
import { useLayoutStore } from '@/stores/layoutStore';
import { useAccessibilityStore, type DensityMode } from '@/stores/accessibilityStore';

// ─── Types ───────────────────────────────────────────────────────────────────

const VISUALIZATION_LAYERS = [
  { id: 'blade-body', label: 'Blade Body' },
  { id: 'glow-core', label: 'Glow Core' },
  { id: 'glow-outer', label: 'Glow Outer' },
  { id: 'flicker', label: 'Flicker' },
  { id: 'shimmer', label: 'Shimmer' },
  { id: 'tip-glow', label: 'Tip Glow' },
  { id: 'base-bleed', label: 'Base Bleed' },
  { id: 'clash-flash', label: 'Clash Flash' },
  { id: 'blast-ring', label: 'Blast Ring' },
  { id: 'lockup-pulse', label: 'Lockup Pulse' },
  { id: 'drag-trail', label: 'Drag Trail' },
  { id: 'background', label: 'Background' },
] as const;

type LayerId = (typeof VISUALIZATION_LAYERS)[number]['id'];

const DEFAULT_VISIBLE_LAYERS = new Set<LayerId>([
  'blade-body',
  'glow-core',
  'glow-outer',
  'flicker',
  'shimmer',
  'tip-glow',
  'base-bleed',
]);

// ─── Tab definitions ─────────────────────────────────────────────────────────
//
// v0.14.0 left-rail overhaul: collapse 10 flat sections into 3 grouped tabs.
// Tabs sit directly under the modal header (matches DesignPanel's pill row at
// `apps/web/components/editor/DesignPanel.tsx` ~L130–168). Inside each tab
// body the sections keep their existing `<SectionToggle>` collapsible
// pattern — multiple sections within a tab can stay expanded together so
// short tabs don't feel cramped.

type TabId = 'appearance' | 'behavior' | 'advanced';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'advanced', label: 'Advanced' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionToggle({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-0 py-1.5 text-ui-sm font-semibold text-text-primary uppercase tracking-wider hover:text-accent transition-colors group"
      aria-expanded={open}
    >
      <span>{label}</span>
      <span
        className={`text-text-muted group-hover:text-accent transition-transform duration-150 ${open ? 'rotate-0' : '-rotate-90'}`}
        aria-hidden="true"
      >
        ▾
      </span>
    </button>
  );
}

function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => { playUISound(checked ? 'toggle-off' : 'toggle-on'); onChange(!checked); }}
      className={`relative w-9 h-[18px] rounded-full transition-colors shrink-0 ${
        checked ? 'bg-accent' : 'bg-bg-deep border border-border-subtle'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : ''
        }`}
      />
      <span className="sr-only">{checked ? 'On' : 'Off'}</span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Play the close SFX before propagating, then delegate focus restore
  // to the shared hook.
  const handleClose = useCallback(() => {
    playUISound('modal-close');
    onClose();
  }, [onClose]);

  // Modal a11y: ESC-to-close, Tab focus trap, initial + restore focus.
  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen,
    onClose: handleClose,
  });

  // ── Active tab + per-tab section collapse state ──
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    appearance: null,
    behavior: null,
    advanced: null,
  });

  // Sections inside each tab. Multiple can be expanded simultaneously
  // within a tab (mirrors the previous flat list's behavior).
  const [sections, setSections] = useState({
    // Appearance
    aurebesh: false,
    display: false,
    density: false,
    // Behavior
    effects: false,
    feedback: false,
    // Advanced
    layout: false,
  });

  const toggleSection = useCallback((key: keyof typeof sections) => {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  // Tablist keyboard navigation: ←/→ moves between tabs, wrapping. Tab/
  // Shift-Tab still flows naturally into the active tab body via the
  // hook's focus trap.
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentId: TabId) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const idx = TABS.findIndex((t) => t.id === currentId);
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const nextIdx = (idx + delta + TABS.length) % TABS.length;
      const next = TABS[nextIdx].id;
      setActiveTab(next);
      // Move focus to the newly-selected tab so screen readers announce it.
      tabRefs.current[next]?.focus();
    },
    [],
  );

  // Performance tier surface deleted from Settings per IA audit §6 (the
  // AppPerfStrip already covers HIGH/MED/LOW). The auto-detect "Reset"
  // affordance was deferred to a follow-up that adds a small button on
  // AppPerfStrip itself.

  // ── Row density — §6 North Star. Flips data-density on <html> via
  //    useAccessibilityApplier; no layout shift today (components opt in later). ──
  const density = useAccessibilityStore((s) => s.density);
  const setDensity = useAccessibilityStore((s) => s.setDensity);

  // ── Effect auto-release (demo mode) — when enabled, sustained effects
  //    (Lockup, Drag, Melt, Lightning, Force) automatically release after
  //    N seconds instead of requiring an explicit second press. Default
  //    off so advanced users keep the explicit-toggle default. ──
  const effectAutoRelease = useAccessibilityStore((s) => s.effectAutoRelease);
  const setEffectAutoRelease = useAccessibilityStore((s) => s.setEffectAutoRelease);

  // ── Reduce bloom (v0.14.0 Phase 3) — when on, scales blade halo alpha
  //    to 40% for photosensitive users. Halo stays visible but subdued. ──
  const reduceBloom = useAccessibilityStore((s) => s.reduceBloom);
  const setReduceBloom = useAccessibilityStore((s) => s.setReduceBloom);

  // ── Aurebesh mode + variant — real hook: reads/writes localStorage and applies CSS classes to <html> ──
  const { mode: aurebeshMode, setMode: setAurebeshMode, variant: aurebeshVariant, setVariant: setAurebeshVariant } = useAurebesh();

  // ── Layout presets — wired to layoutStore ──
  const layoutSavedPresets = useLayoutStore((s) => s.savedPresets);
  const layoutSavePreset = useLayoutStore((s) => s.savePreset);
  const layoutLoadPreset = useLayoutStore((s) => s.loadPreset);
  const layoutDeletePreset = useLayoutStore((s) => s.deletePreset);
  const layoutResetToDefaults = useLayoutStore((s) => s.resetToDefaults);

  const [newLayoutName, setNewLayoutName] = useState('');

  const handleLoadLayoutPreset = useCallback(
    (id: string) => {
      layoutLoadPreset(id);
    },
    [layoutLoadPreset],
  );

  const handleDeleteLayoutPreset = useCallback(
    (id: string) => {
      layoutDeletePreset(id);
    },
    [layoutDeletePreset],
  );

  const handleSaveLayoutPreset = useCallback(() => {
    const trimmed = newLayoutName.trim();
    if (!trimmed) return;
    layoutSavePreset(trimmed);
    setNewLayoutName('');
  }, [newLayoutName, layoutSavePreset]);

  const handleResetLayout = useCallback(() => {
    layoutResetToDefaults();
  }, [layoutResetToDefaults]);

  // ── Display ──
  const [showFpsCounter, setShowFpsCounter] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState<Set<LayerId>>(new Set(DEFAULT_VISIBLE_LAYERS));

  const toggleLayer = useCallback((id: LayerId) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Sound on open ──
  useEffect(() => {
    if (isOpen) {
      playUISound('modal-open');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Section renderers ───
  // Each renders a complete `<section>` including its `<SectionToggle>`
  // header and collapsible body. Composed into the tab panels below.

  const renderAurebesh = (): ReactNode => (
    <section className="py-4">
      <SectionToggle
        label="Aurebesh Mode"
        open={sections.aurebesh}
        onToggle={() => toggleSection('aurebesh')}
      />
      {sections.aurebesh && (
        <div className="mt-3 space-y-3">
          <p className="text-ui-xs text-text-muted">
            Render UI text in the Star Wars Aurebesh script.
          </p>

          <div className="space-y-2">
            {(
              [
                { value: 'off', label: 'Off', desc: 'Normal English text throughout' },
                {
                  value: 'labels',
                  label: 'Labels',
                  desc: 'UI labels and section headings in Aurebesh',
                },
                {
                  value: 'full',
                  label: 'Full',
                  desc: 'All interface text rendered in Aurebesh',
                },
              ] as Array<{ value: AurebeshMode; label: string; desc: string }>
            ).map(({ value, label, desc }) => (
              <label
                key={value}
                className={`flex items-start gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors ${
                  aurebeshMode === value
                    ? 'border-accent/50 bg-accent/5 text-text-primary'
                    : 'border-border-subtle bg-bg-deep/50 text-text-muted hover:border-border-light hover:text-text-secondary'
                }`}
              >
                <input
                  type="radio"
                  name="aurebesh-mode"
                  value={value}
                  checked={aurebeshMode === value}
                  onChange={() => { playUISound('toggle-on'); setAurebeshMode(value); }}
                  className="mt-0.5 accent-[rgb(var(--accent))]"
                />
                <div className="min-w-0">
                  <div className="text-ui-sm font-medium">{label}</div>
                  <div className="text-ui-xs text-text-muted mt-0.5">{desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Variant picker — which Aurebesh font-face to render. Always
              available (even when mode === 'off') so the user's preferred
              variant is also picked up by decorative .sw-aurebesh elements. */}
          <div className="pt-3 border-t border-border-subtle/40">
            <label
              htmlFor="aurebesh-variant"
              className="block text-ui-xs text-text-muted mb-1.5"
            >
              Variant
            </label>
            <select
              id="aurebesh-variant"
              value={aurebeshVariant}
              onChange={(e) => {
                playUISound('toggle-on');
                setAurebeshVariant(e.target.value as AurebeshVariant);
              }}
              className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
            >
              <option value="canon">Canon (default)</option>
              <option value="canon-tech">Canon Tech</option>
              <option value="legends">Legends</option>
              <option value="legends-tech">Legends Tech</option>
            </select>
            <p className="text-ui-xs text-text-muted mt-1.5">
              Switches the Aurebesh font-face. Canon is the standard letterforms; Tech variants emphasize numerics and machine-readability; Legends variants use expanded-universe forms.
            </p>
          </div>
        </div>
      )}
    </section>
  );

  const renderDisplay = (): ReactNode => (
    <section className="py-4">
      <SectionToggle
        label="Display"
        open={sections.display}
        onToggle={() => toggleSection('display')}
      />
      {sections.display && (
        <div className="mt-3 space-y-4">
          {/* FPS counter */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ui-sm text-text-secondary">FPS Counter</p>
              <p className="text-ui-xs text-text-muted">Show frame rate in the status bar</p>
            </div>
            <ToggleSwitch
              id="display-fps"
              checked={showFpsCounter}
              onChange={setShowFpsCounter}
              label="FPS counter visibility"
            />
          </div>

          {/* Reduce bloom */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ui-sm text-text-secondary">Reduce Bloom</p>
              <p className="text-ui-xs text-text-muted">Dimmer blade halo for photosensitive viewing (glow scales to 40%)</p>
            </div>
            <ToggleSwitch
              id="display-reduce-bloom"
              checked={reduceBloom}
              onChange={setReduceBloom}
              label="Reduce blade bloom intensity"
            />
          </div>

          {/* Visualization layer defaults */}
          <div className="space-y-2">
            <div>
              <p className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
                Default Visualization Layers
              </p>
              <p className="text-ui-xs text-text-muted mt-0.5">
                Which of the 12 compositing layers are visible when opening the editor
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {VISUALIZATION_LAYERS.map(({ id, label }) => (
                <label
                  key={id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={visibleLayers.has(id)}
                    onChange={() => toggleLayer(id)}
                    className="rounded accent-[rgb(var(--accent))]"
                  />
                  <span
                    className={`text-ui-xs transition-colors ${
                      visibleLayers.has(id)
                        ? 'text-text-secondary group-hover:text-text-primary'
                        : 'text-text-muted'
                    }`}
                  >
                    {label}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  setVisibleLayers(new Set(VISUALIZATION_LAYERS.map((l) => l.id)))
                }
                className="text-ui-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                All on
              </button>
              <span className="text-text-muted text-ui-xs">·</span>
              <button
                type="button"
                onClick={() => setVisibleLayers(new Set())}
                className="text-ui-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                All off
              </button>
              <span className="text-text-muted text-ui-xs">·</span>
              <button
                type="button"
                onClick={() => setVisibleLayers(new Set(DEFAULT_VISIBLE_LAYERS))}
                className="text-ui-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Reset defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderDensity = (): ReactNode => (
    <section className="py-4">
      <SectionToggle
        label="Row density"
        open={sections.density}
        onToggle={() => toggleSection('density')}
      />
      {sections.density && (
        <div className="mt-3 space-y-3">
          <p className="text-ui-xs text-text-muted">
            Controls panel row height across the editor. Default matches
            the current layout exactly — no shift when toggled today, and
            components opt into the new rhythm gradually.
          </p>

          <div className="space-y-2">
            {(
              [
                {
                  value: 'ssl',
                  label: 'SSL (22px)',
                  desc: 'Console-dense. Best for 27"+ displays and power users.',
                },
                {
                  value: 'ableton',
                  label: 'Ableton (26px, default)',
                  desc: 'Matches the shipped row rhythm. Balanced.',
                },
                {
                  value: 'mutable',
                  label: 'Mutable (32px)',
                  desc: 'Airy. Easier to hit on touch or over long sessions.',
                },
              ] as Array<{ value: DensityMode; label: string; desc: string }>
            ).map(({ value, label, desc }) => (
              <label
                key={value}
                className={`flex items-start gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors ${
                  density === value
                    ? 'border-accent/50 bg-accent/5 text-text-primary'
                    : 'border-border-subtle bg-bg-deep/50 text-text-muted hover:border-border-light hover:text-text-secondary'
                }`}
              >
                <input
                  type="radio"
                  name="row-density"
                  value={value}
                  checked={density === value}
                  onChange={() => { playUISound('toggle-on'); setDensity(value); }}
                  className="mt-0.5 accent-[rgb(var(--accent))]"
                />
                <div className="min-w-0">
                  <div className="text-ui-sm font-medium">{label}</div>
                  <div className="text-ui-xs text-text-muted mt-0.5">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );

  const renderEffectAutoRelease = (): ReactNode => (
    <section className="py-4">
      <SectionToggle
        label="Effect auto-release"
        open={sections.effects}
        onToggle={() => toggleSection('effects')}
      />
      {sections.effects && (
        <div className="mt-3 space-y-3">
          <p className="text-ui-xs text-text-muted">
            When enabled, sustained effects (Lockup, Drag, Melt, Lightning,
            Force) automatically release after the configured duration —
            useful for demos / showcases where manual release is awkward.
            Default off; advanced users keep the explicit press-again-to-
            release behavior.
          </p>

          <label
            className={`flex items-start gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors ${
              effectAutoRelease.enabled
                ? 'border-accent/50 bg-accent/5 text-text-primary'
                : 'border-border-subtle bg-bg-deep/50 text-text-muted hover:border-border-light hover:text-text-secondary'
            }`}
          >
            <input
              type="checkbox"
              checked={effectAutoRelease.enabled}
              onChange={(e) => {
                playUISound('toggle-on');
                setEffectAutoRelease({ enabled: e.target.checked });
              }}
              className="mt-0.5 accent-[rgb(var(--accent))]"
            />
            <div className="min-w-0">
              <div className="text-ui-sm font-medium">
                Enable auto-release
              </div>
              <div className="text-ui-xs text-text-muted mt-0.5">
                Sustained effects release automatically after the timeout below.
              </div>
            </div>
          </label>

          <div
            className={`px-3 py-2.5 rounded border transition-colors ${
              effectAutoRelease.enabled
                ? 'border-border-light bg-bg-deep/50'
                : 'border-border-subtle/50 bg-bg-deep/30 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="effect-auto-release-seconds"
                className="text-ui-sm text-text-primary font-medium"
              >
                Release after
              </label>
              <span className="text-ui-sm text-text-secondary font-mono tabular-nums">
                {effectAutoRelease.seconds.toFixed(0)}s
              </span>
            </div>
            <input
              id="effect-auto-release-seconds"
              type="range"
              min={1}
              max={15}
              step={1}
              value={effectAutoRelease.seconds}
              onChange={(e) =>
                setEffectAutoRelease({
                  seconds: parseInt(e.target.value, 10),
                })
              }
              disabled={!effectAutoRelease.enabled}
              className="w-full mt-2 accent-[rgb(var(--accent))]"
              aria-valuetext={`${effectAutoRelease.seconds} seconds`}
            />
            <div className="text-ui-xs text-text-muted mt-1">
              Range: 1–15 seconds. Default: 4s.
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderFeedback = (): ReactNode => (
    <section className="py-4">
      <SectionToggle
        label="Feedback"
        open={sections.feedback}
        onToggle={() => toggleSection('feedback')}
      />
      {sections.feedback && (
        <div className="mt-3 space-y-3">
          <p className="text-ui-xs text-text-muted">
            KyberStation is a hobby project and your feedback shapes what comes next. Every report and suggestion goes to GitHub Issues — no account needed to read, a free GitHub account is required to post.
          </p>

          <div className="space-y-2">
            <a
              href="https://github.com/kenkoller/KyberStation/issues/new?template=bug_report.md&labels=bug"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-3 py-2.5 rounded border border-border-subtle bg-bg-deep/50 text-text-muted hover:border-border-light hover:text-text-secondary transition-colors"
              onClick={() => playUISound('toggle-on')}
            >
              <span className="text-lg leading-none mt-0.5" aria-hidden="true">🐞</span>
              <div className="min-w-0">
                <div className="text-ui-sm font-medium text-text-primary">Report a bug</div>
                <div className="text-ui-xs text-text-muted mt-0.5">Something is broken or behaving unexpectedly</div>
              </div>
            </a>

            <a
              href="https://github.com/kenkoller/KyberStation/issues/new?template=feature_request.md&labels=enhancement"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-3 py-2.5 rounded border border-border-subtle bg-bg-deep/50 text-text-muted hover:border-border-light hover:text-text-secondary transition-colors"
              onClick={() => playUISound('toggle-on')}
            >
              <span className="text-lg leading-none mt-0.5" aria-hidden="true">💡</span>
              <div className="min-w-0">
                <div className="text-ui-sm font-medium text-text-primary">Suggest a feature</div>
                <div className="text-ui-xs text-text-muted mt-0.5">Something new you'd like to see added</div>
              </div>
            </a>

            <a
              href="https://github.com/kenkoller/KyberStation/issues/new?template=style_request.md&labels=style-request"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-3 py-2.5 rounded border border-border-subtle bg-bg-deep/50 text-text-muted hover:border-border-light hover:text-text-secondary transition-colors"
              onClick={() => playUISound('toggle-on')}
            >
              <span className="text-lg leading-none mt-0.5" aria-hidden="true">⚔️</span>
              <div className="min-w-0">
                <div className="text-ui-sm font-medium text-text-primary">Request a blade style or preset</div>
                <div className="text-ui-xs text-text-muted mt-0.5">A new style, effect, ignition, or character preset</div>
              </div>
            </a>

            <a
              href="https://github.com/kenkoller/KyberStation/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-3 py-2.5 rounded border border-border-subtle bg-bg-deep/50 text-text-muted hover:border-border-light hover:text-text-secondary transition-colors"
              onClick={() => playUISound('toggle-on')}
            >
              <span className="text-lg leading-none mt-0.5" aria-hidden="true">💬</span>
              <div className="min-w-0">
                <div className="text-ui-sm font-medium text-text-primary">Ask a question / start a discussion</div>
                <div className="text-ui-xs text-text-muted mt-0.5">For anything that isn't a bug or concrete feature</div>
              </div>
            </a>
          </div>

          <div className="pt-1 flex items-center justify-between border-t border-border-subtle pt-3">
            <a
              href="https://github.com/kenkoller/KyberStation"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui-xs text-text-muted hover:text-accent transition-colors"
            >
              View source on GitHub →
            </a>
            <span className="text-ui-xs text-text-muted">MIT licensed</span>
          </div>
        </div>
      )}
    </section>
  );

  const renderLayout = (): ReactNode => (
    <section className="py-4">
      <SectionToggle
        label="Layout"
        open={sections.layout}
        onToggle={() => toggleSection('layout')}
      />
      {sections.layout && (
        <div className="mt-3 space-y-4">
          {/* Reset */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ui-sm text-text-secondary">Default layout</p>
              <p className="text-ui-xs text-text-muted">Restore sidebar widths and panel positions</p>
            </div>
            <button
              type="button"
              onClick={handleResetLayout}
              className="px-3 py-1.5 rounded border border-border-subtle text-ui-xs font-medium text-text-muted hover:text-text-primary hover:border-border-light transition-colors shrink-0"
            >
              Reset
            </button>
          </div>

          {/* Saved presets */}
          {layoutSavedPresets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
                Saved Layouts
              </p>
              <div className="space-y-1">
                {layoutSavedPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center gap-2 px-3 py-2 rounded border border-border-subtle bg-bg-deep/50"
                  >
                    <span className="flex-1 text-ui-sm text-text-secondary truncate">
                      {preset.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadLayoutPreset(preset.id)}
                      className="text-ui-xs text-accent hover:text-text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-accent/10"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLayoutPreset(preset.id)}
                      className="text-ui-xs text-text-muted hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-red-900/20"
                      aria-label={`Delete layout preset "${preset.name}"`}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save current */}
          <div className="space-y-1.5">
            <p className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
              Save Current Layout
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveLayoutPreset();
                }}
                placeholder="Layout name..."
                maxLength={40}
                className="flex-1 bg-bg-deep border border-border-subtle rounded px-3 py-1.5 text-ui-sm text-text-secondary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
              <button
                type="button"
                onClick={handleSaveLayoutPreset}
                disabled={!newLayoutName.trim()}
                className="px-3 py-1.5 rounded border border-accent/50 bg-accent/10 text-ui-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  // ─── Render ───

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="bg-bg-secondary border border-border-light rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <div>
            <h2 id="settings-modal-title" className="text-ui-lg font-semibold text-text-primary tracking-wide">Settings</h2>
            <p className="text-ui-xs text-text-muted mt-0.5">KyberStation configuration</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors text-lg"
            aria-label="Close settings"
          >
            &times;
          </button>
        </div>

        {/* ── Tabs ── */}
        {/* Pill row matches DesignPanel's group pills (font-mono uppercase
            text-ui-xs tracking-[0.12em], accent active state). ←/→ moves
            between tabs and refocuses the new active tab so screen
            readers announce it. Tab/Shift-Tab continues to flow through
            the dialog naturally via useModalDialog's focus trap. */}
        <div className="px-5 pt-3 pb-3 border-b border-border-subtle shrink-0">
          <div
            role="tablist"
            aria-label="Settings categories"
            data-testid="settings-tablist"
            className="flex items-center gap-1 flex-wrap"
          >
            {TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  role="tab"
                  type="button"
                  id={`settings-tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls={`settings-tabpanel-${tab.id}`}
                  tabIndex={active ? 0 : -1}
                  data-testid={`settings-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                  className={[
                    'px-4 py-2 rounded-lg font-mono uppercase text-ui-xs tracking-[0.12em] border transition-colors',
                    active
                      ? 'text-accent bg-accent-dim/30 border-accent-border/60'
                      : 'text-text-muted hover:text-text-secondary border-border-subtle/60 hover:border-border-light',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable body — one tabpanel per tab ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Appearance: Aurebesh Mode → Display → Row density */}
          <div
            role="tabpanel"
            id="settings-tabpanel-appearance"
            aria-labelledby="settings-tab-appearance"
            data-testid="settings-tabpanel-appearance"
            hidden={activeTab !== 'appearance'}
            className="divide-y divide-border-subtle"
          >
            <div className="first:[&>section]:pt-0">{renderAurebesh()}</div>
            <div>{renderDisplay()}</div>
            <div>{renderDensity()}</div>
          </div>

          {/* Behavior: Effect auto-release → Feedback */}
          <div
            role="tabpanel"
            id="settings-tabpanel-behavior"
            aria-labelledby="settings-tab-behavior"
            data-testid="settings-tabpanel-behavior"
            hidden={activeTab !== 'behavior'}
            className="divide-y divide-border-subtle"
          >
            <div className="first:[&>section]:pt-0">{renderEffectAutoRelease()}</div>
            <div>{renderFeedback()}</div>
          </div>

          {/* Advanced: Layout */}
          <div
            role="tabpanel"
            id="settings-tabpanel-advanced"
            aria-labelledby="settings-tab-advanced"
            data-testid="settings-tabpanel-advanced"
            hidden={activeTab !== 'advanced'}
            className="divide-y divide-border-subtle"
          >
            <div className="first:[&>section]:pt-0">{renderLayout()}</div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-3 border-t border-border-subtle flex items-center justify-between">
          <p className="text-ui-xs text-text-muted">
            Settings saved automatically
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded border border-border-subtle text-ui-sm font-medium text-text-muted hover:text-text-primary hover:border-border-light transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
