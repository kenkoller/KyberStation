'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getUISoundEngine, playUISound, type UISoundPreset, type UISoundCategory } from '@/lib/uiSounds';
import {
  getPerformanceTier,
  setPerformanceTier,
  applyPerformanceTier,
  type PerformanceTier,
} from '@/lib/performanceTier';

// ─── Types ───────────────────────────────────────────────────────────────────

type AurebeshMode = 'off' | 'labels' | 'full';

interface LayoutPreset {
  name: string;
  data: string; // JSON blob stored in localStorage
}

const LAYOUT_PRESETS_KEY = 'bladeforge-layout-presets';

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
    display: false,
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

  // ── Aurebesh mode (stubbed — local state until store is wired) ──
  const [aurebeshMode, setAurebeshMode] = useState<AurebeshMode>('off');

  // ── UI Sounds ──
  const soundEngine = typeof window !== 'undefined' ? getUISoundEngine() : null;

  const [soundPreset, setSoundPresetState] = useState<UISoundPreset>('silent');
  const [masterVolume, setMasterVolumeState] = useState(0.4);
  const [categoryVolumes, setCategoryVolumesState] = useState<Record<UISoundCategory, number>>({
    navigation: 0.5,
    interaction: 0.4,
    feedback: 0.6,
    ambient: 0.2,
  });
  const [categoryMuted, setCategoryMutedState] = useState<Record<UISoundCategory, boolean>>({
    navigation: false,
    interaction: false,
    feedback: false,
    ambient: true,
  });

  useEffect(() => {
    if (!isOpen || !soundEngine) return;
    const s = soundEngine.getSettings();
    setSoundPresetState(s.preset);
    setMasterVolumeState(s.masterVolume);
    setCategoryVolumesState({ ...s.categoryVolumes });
    setCategoryMutedState({ ...s.categoryMuted });
  }, [isOpen, soundEngine]);

  const handleSoundPreset = useCallback(
    (preset: UISoundPreset) => {
      setSoundPresetState(preset);
      soundEngine?.setPreset(preset);
      // Re-sync derived state
      if (soundEngine) {
        const s = soundEngine.getSettings();
        setMasterVolumeState(s.masterVolume);
        setCategoryMutedState({ ...s.categoryMuted });
      }
    },
    [soundEngine],
  );

  const handleMasterVolume = useCallback(
    (v: number) => {
      setMasterVolumeState(v);
      soundEngine?.setMasterVolume(v);
    },
    [soundEngine],
  );

  const handleCategoryVolume = useCallback(
    (cat: UISoundCategory, v: number) => {
      setCategoryVolumesState((prev) => ({ ...prev, [cat]: v }));
      soundEngine?.setCategoryVolume(cat, v);
    },
    [soundEngine],
  );

  const handleCategoryMuted = useCallback(
    (cat: UISoundCategory, muted: boolean) => {
      setCategoryMutedState((prev) => ({ ...prev, [cat]: muted }));
      soundEngine?.setCategoryMuted(cat, muted);
    },
    [soundEngine],
  );

  // ── Layout presets ──
  const [layoutPresets, setLayoutPresets] = useState<LayoutPreset[]>([]);
  const [newLayoutName, setNewLayoutName] = useState('');

  const loadLayoutPresets = useCallback(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_PRESETS_KEY);
      setLayoutPresets(raw ? (JSON.parse(raw) as LayoutPreset[]) : []);
    } catch {
      setLayoutPresets([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadLayoutPresets();
  }, [isOpen, loadLayoutPresets]);

  const handleLoadLayoutPreset = useCallback((_preset: LayoutPreset) => {
    // Stub: layout restore will be wired up when layout store supports import
  }, []);

  const handleDeleteLayoutPreset = useCallback(
    (name: string) => {
      const updated = layoutPresets.filter((p) => p.name !== name);
      setLayoutPresets(updated);
      try {
        localStorage.setItem(LAYOUT_PRESETS_KEY, JSON.stringify(updated));
      } catch {
        // Storage full
      }
    },
    [layoutPresets],
  );

  const handleSaveLayoutPreset = useCallback(() => {
    const trimmed = newLayoutName.trim();
    if (!trimmed) return;

    // Stub: capture real layout state when store supports serialization
    const data = JSON.stringify({ stub: true, savedAt: Date.now() });
    const updated = [
      ...layoutPresets.filter((p) => p.name !== trimmed),
      { name: trimmed, data },
    ];
    setLayoutPresets(updated);
    setNewLayoutName('');
    try {
      localStorage.setItem(LAYOUT_PRESETS_KEY, JSON.stringify(updated));
    } catch {
      // Storage full
    }
  }, [newLayoutName, layoutPresets]);

  const handleResetLayout = useCallback(() => {
    // Stub: reset to default layout when store supports it
  }, []);

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

  // ─── Helpers ───

  const SOUND_CATEGORIES: Array<{ id: UISoundCategory; label: string }> = [
    { id: 'navigation', label: 'Navigation' },
    { id: 'interaction', label: 'Interaction' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'ambient', label: 'Ambient' },
  ];

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
            <p className="text-ui-xs text-text-muted mt-0.5">BladeForge configuration</p>
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
                        onChange={() => setAurebeshMode(value)}
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
              <div className="mt-3 space-y-4">
                {/* Preset selector */}
                <div className="space-y-1.5">
                  <label htmlFor="sound-preset" className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
                    Sound Preset
                  </label>
                  <div className="flex gap-2">
                    {(['silent', 'subtle', 'full'] as UISoundPreset[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSoundPreset(p)}
                        className={`flex-1 px-2 py-1.5 rounded border text-ui-xs font-medium capitalize transition-colors ${
                          soundPreset === p
                            ? 'border-accent/60 bg-accent/10 text-accent'
                            : 'border-border-subtle bg-bg-deep/50 text-text-muted hover:border-border-light hover:text-text-secondary'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Master volume */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="sound-master-vol" className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
                      Master Volume
                    </label>
                    <span className="text-ui-xs text-text-muted tabular-nums">
                      {Math.round(masterVolume * 100)}%
                    </span>
                  </div>
                  <input
                    id="sound-master-vol"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={masterVolume}
                    onChange={(e) => handleMasterVolume(Number(e.target.value))}
                    className="w-full"
                    aria-label="Master volume"
                    disabled={soundPreset === 'silent'}
                  />
                </div>

                {/* Per-category controls */}
                <div className="space-y-2">
                  <p className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
                    Categories
                  </p>
                  {SOUND_CATEGORIES.map(({ id: cat, label }) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ToggleSwitch
                          id={`cat-mute-${cat}`}
                          checked={!categoryMuted[cat]}
                          onChange={(v) => handleCategoryMuted(cat, !v)}
                          label={`${label} sounds enabled`}
                        />
                        <span
                          className={`text-ui-sm flex-1 ${
                            categoryMuted[cat] ? 'text-text-muted line-through' : 'text-text-secondary'
                          }`}
                        >
                          {label}
                        </span>
                        <span className="text-ui-xs text-text-muted tabular-nums w-8 text-right">
                          {Math.round(categoryVolumes[cat] * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={categoryVolumes[cat]}
                        onChange={(e) => handleCategoryVolume(cat, Number(e.target.value))}
                        disabled={categoryMuted[cat] || soundPreset === 'silent'}
                        aria-label={`${label} volume`}
                        className="w-full disabled:opacity-40"
                      />
                    </div>
                  ))}
                </div>
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
                {layoutPresets.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-ui-xs font-medium text-text-secondary uppercase tracking-wider">
                      Saved Layouts
                    </p>
                    <div className="space-y-1">
                      {layoutPresets.map((preset) => (
                        <div
                          key={preset.name}
                          className="flex items-center gap-2 px-3 py-2 rounded border border-border-subtle bg-bg-deep/50"
                        >
                          <span className="flex-1 text-ui-sm text-text-secondary truncate">
                            {preset.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLoadLayoutPreset(preset)}
                            className="text-ui-xs text-accent hover:text-text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-accent/10"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLayoutPreset(preset.name)}
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
