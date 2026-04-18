'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { playUISound } from '@/lib/uiSounds';
import {
  getPerformanceTier,
  setPerformanceTier,
  applyPerformanceTier,
  type PerformanceTier,
} from '@/lib/performanceTier';
import { useAurebesh } from '@/hooks/useAurebesh';
import { type AurebeshMode } from '@/lib/aurebesh';
import { useLayoutStore } from '@/stores/layoutStore';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // ── Section collapse state ──
  const [sections, setSections] = useState({
    performance: true,
    aurebesh: false,
    sounds: false,
    layout: false,
    shortcuts: false,
    display: false,
    feedback: false,
  });

  const toggleSection = useCallback((key: keyof typeof sections) => {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  // ── Performance tier ──
  const [perfTier, setPerfTierState] = useState<PerformanceTier>('medium');
  const [perfIsAuto, setPerfIsAuto] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const { tier, isAutoDetected } = getPerformanceTier();
    setPerfTierState(tier);
    setPerfIsAuto(isAutoDetected);
  }, [isOpen]);

  const handlePerfTierChange = useCallback((tier: PerformanceTier) => {
    setPerfTierState(tier);
    setPerfIsAuto(false);
    setPerformanceTier(tier);
    applyPerformanceTier(tier);
  }, []);

  const handlePerfTierAuto = useCallback(() => {
    setPerformanceTier(null); // clear override
    const { tier } = getPerformanceTier();
    setPerfTierState(tier);
    setPerfIsAuto(true);
    applyPerformanceTier(tier);
  }, []);

  // ── Aurebesh mode — real hook: reads/writes localStorage and applies CSS class to <html> ──
  const { mode: aurebeshMode, setMode: setAurebeshMode } = useAurebesh();

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

  // ── Focus trap ──
  // ── Sound on open/close ──
  useEffect(() => {
    if (isOpen) {
      playUISound('modal-open');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playUISound('modal-close');
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      (previousFocusRef.current as HTMLElement)?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ─── Render ───

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) { playUISound('modal-close'); onClose(); }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="App settings"
    >
      <div className="bg-bg-secondary border border-border-light rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <div>
            <h2 className="text-ui-lg font-semibold text-text-primary tracking-wide">Settings</h2>
            <p className="text-ui-xs text-text-muted mt-0.5">KyberStation configuration</p>
          </div>
          <button
            type="button"
            onClick={() => { playUISound('modal-close'); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors text-lg"
            aria-label="Close settings"
          >
            &times;
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0 divide-y divide-border-subtle">

          {/* ══ Performance Tier ══ */}
          <section className="py-4 first:pt-0">
            <SectionToggle
              label="Performance Tier"
              open={sections.performance}
              onToggle={() => toggleSection('performance')}
            />
            {sections.performance && (
              <div className="mt-3 space-y-3">
                <p className="text-ui-xs text-text-muted">
                  Controls visual complexity. Auto-detects based on your device.
                </p>

                <div className="space-y-2">
                  {(
                    [
                      {
                        value: 'full',
                        label: 'Full',
                        desc: 'All animations, particles, and ambient effects',
                      },
                      {
                        value: 'medium',
                        label: 'Medium',
                        desc: 'Reduced particles and simpler animations',
                      },
                      {
                        value: 'lite',
                        label: 'Lite',
                        desc: 'Minimal animations, static decorations',
                      },
                    ] as Array<{ value: PerformanceTier; label: string; desc: string }>
                  ).map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors ${
                        perfTier === value && !perfIsAuto
                          ? 'border-accent/50 bg-accent/5 text-text-primary'
                          : 'border-border-subtle bg-bg-deep/50 text-text-muted hover:border-border-light hover:text-text-secondary'
                      }`}
                    >
                      <input
                        type="radio"
                        name="perf-tier"
                        value={value}
                        checked={perfTier === value && !perfIsAuto}
                        onChange={() => handlePerfTierChange(value)}
                        className="mt-0.5 accent-[rgb(var(--accent))]"
                      />
                      <div className="min-w-0">
                        <div className="text-ui-sm font-medium">{label}</div>
                        <div className="text-ui-xs text-text-muted mt-0.5">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handlePerfTierAuto}
                  className={`text-ui-xs px-3 py-1.5 rounded border transition-colors ${
                    perfIsAuto
                      ? 'border-accent/40 text-accent bg-accent/5'
                      : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light'
                  }`}
                >
                  {perfIsAuto ? `Auto-detected: ${perfTier}` : 'Reset to auto-detect'}
                </button>
              </div>
            )}
          </section>

          {/* ══ Aurebesh Mode ══ */}
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
              </div>
            )}
          </section>

          {/* ══ UI Sounds ══ */}
          <section className="py-4">
            <SectionToggle
              label="UI Sounds"
              open={sections.sounds}
              onToggle={() => toggleSection('sounds')}
            />
            {sections.sounds && (
              <div className="mt-3">
                <p className="text-ui-sm text-text-muted">
                  UI sound effects are coming in a future update.
                </p>
              </div>
            )}
          </section>

          {/* ══ Layout Management ══ */}
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

          {/* ══ Keyboard Shortcuts ══ */}
          <section className="py-4">
            <SectionToggle
              label="Keyboard Shortcuts"
              open={sections.shortcuts}
              onToggle={() => toggleSection('shortcuts')}
            />
            {sections.shortcuts && (
              <div className="mt-3 space-y-3">
                <p className="text-ui-xs text-text-muted">
                  Keyboard shortcuts for blade simulation and editor controls.
                </p>

                {/* Blade effect shortcuts */}
                <div className="space-y-1.5">
                  <p className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
                    Blade Effects
                  </p>
                  <div className="space-y-1">
                    {([
                      { key: 'Space', action: 'Ignite / Retract' },
                      { key: 'C', action: 'Clash' },
                      { key: 'B', action: 'Blast' },
                      { key: 'S', action: 'Stab' },
                      { key: 'L', action: 'Lockup (toggle)' },
                      { key: 'N', action: 'Lightning (toggle)' },
                      { key: 'D', action: 'Drag (toggle)' },
                      { key: 'M', action: 'Melt (toggle)' },
                      { key: 'F', action: 'Force' },
                      { key: 'W', action: 'Shockwave' },
                    ] as const).map(({ key, action }) => (
                      <div key={key} className="flex items-center justify-between px-3 py-1.5 rounded bg-bg-deep/50 border border-border-subtle">
                        <span className="text-ui-sm text-text-secondary">{action}</span>
                        <kbd className="px-2 py-0.5 rounded bg-bg-surface border border-border-light text-ui-xs text-text-primary font-mono">
                          {key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editor shortcuts */}
                <div className="space-y-1.5">
                  <p className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
                    Editor
                  </p>
                  <div className="space-y-1">
                    {([
                      { key: 'Escape', action: 'Exit fullscreen' },
                      { key: 'O', action: 'Toggle blade orientation' },
                      { key: '\u2318Z', action: 'Undo' },
                      { key: '\u2318\u21E7Z', action: 'Redo' },
                    ] as const).map(({ key, action }) => (
                      <div key={key} className="flex items-center justify-between px-3 py-1.5 rounded bg-bg-deep/50 border border-border-subtle">
                        <span className="text-ui-sm text-text-secondary">{action}</span>
                        <kbd className="px-2 py-0.5 rounded bg-bg-surface border border-border-light text-ui-xs text-text-primary font-mono">
                          {key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ══ Feedback ══ */}
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

          {/* ══ Display ══ */}
          <section className="py-4 last:pb-0">
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
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-3 border-t border-border-subtle flex items-center justify-between">
          <p className="text-ui-xs text-text-muted">
            Settings saved automatically
          </p>
          <button
            type="button"
            onClick={() => { playUISound('modal-close'); onClose(); }}
            className="px-4 py-1.5 rounded border border-border-subtle text-ui-sm font-medium text-text-muted hover:text-text-primary hover:border-border-light transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
