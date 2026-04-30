'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTimelinePlayback } from '@/hooks/useTimelinePlayback';

import { useUIStore } from '@/stores/uiStore';
import type { SectionId } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { useUserPresetStore } from '@/stores/userPresetStore';
import { addToQueueWithToast } from '@/lib/addToQueue';
import { useSurpriseMe } from '@/components/editor/Randomizer';
import { toast } from '@/lib/toastManager';
import { playUISound, getUISoundEngine } from '@/lib/uiSounds';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useThemeApplier } from '@/hooks/useThemeApplier';
import { useAccessibilityApplier } from '@/hooks/useAccessibilityApplier';
import { usePerformanceTier } from '@/hooks/usePerformanceTier';
import { useAurebesh } from '@/hooks/useAurebesh';
import { usePauseSystem } from '@/hooks/usePauseSystem';
import { usePresetListSync } from '@/hooks/usePresetListSync';
import { useHistoryTracking } from '@/hooks/useHistoryTracking';
import { ShareButton } from '@/components/layout/ShareButton';
import { UndoRedoButtons } from '@/components/layout/UndoRedoButtons';
import { HeaderButton } from '@/components/layout/HeaderButton';
// W11: StatusBar retired — all its segments folded into AppPerfStrip.
import { FPSCounter } from '@/components/layout/FPSCounter';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { KeyboardShortcutsModal } from '@/components/layout/KeyboardShortcutsModal';
import { SaberWizard } from '@/components/onboarding/SaberWizard';
import { VisualizationStack } from '@/components/editor/VisualizationStack';
import { PixelDebugOverlay } from '@/components/editor/PixelDebugOverlay';
import { CanvasLayout } from '@/components/editor/CanvasLayout';
// Left-rail overhaul (v0.14.0 PR 2): DesignPanel / AudioPanel / OutputPanel
// no longer mounted here — Sidebar + MainContent route to them via
// `components/layout/MainContent.tsx`. DesignPanel.tsx is still alive
// for the mobile/tablet shells (AppShell) and gets removed in PR 5.
import { EffectComparisonPanel } from '@/components/editor/EffectComparisonPanel';
import { SaberProfileSwitcher } from '@/components/editor/SaberProfileSwitcher';
// W10 (2026-04-22): desktop retired the 4-column TabColumnContent
// layout. DesignPanel owns everything now via ReorderableSections.
import { FullscreenPreview, FullscreenButton } from '@/components/editor/FullscreenPreview';
import { DataTicker } from '@/components/hud/DataTicker';
import { CornerBrackets } from '@/components/hud/CornerBrackets';
import { CanvasSkeleton } from '@/components/shared/Skeleton';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { DeliveryRail } from '@/components/layout/DeliveryRail';
import { ShiftLightRail } from '@/components/layout/ShiftLightRail';
import { AppPerfStrip } from '@/components/layout/AppPerfStrip';
import { RightRail } from '@/components/layout/RightRail';
import { Inspector } from '@/components/editor/Inspector';
import { ResizeHandle } from '@/components/shared/ResizeHandle';
import { REGION_LIMITS } from '@/stores/uiStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { MainContent } from '@/components/layout/MainContent';
import { useCommandPalette, useRegisterCommands } from '@/hooks/useCommandPalette';
import { useCommandStore, type Command } from '@/stores/commandStore';
import { CANVAS_THEMES } from '@/lib/canvasThemes';
import { EXTENDED_LOCATION_THEMES, EXTENDED_FACTION_THEMES } from '@/lib/extendedThemes';
import { useMetaKey } from '@/lib/platform';
import { toggleOrTriggerEffect } from '@/lib/effectToggle';
// W4 (2026-04-22): EffectChip + its SUSTAINED_EFFECT_IDS / activeEffectsStore
// dependencies were extracted to components/editor/EffectChip.tsx so the new
// EffectsPinDropdown can reuse the chip without a circular import.
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── HUD status messages for the data ticker strip ───
// Expanded 2026-04-20 from the original 8-message set per Ken's
// walkthrough feedback — he wanted more varied / more interesting
// chrome text while still reading as saber / ProffieOS-adjacent.
// Mix of: system-status readouts, hardware acknowledgements,
// Proffie-specific technical shorthand, and a few ambient flavor
// lines. Expanding the pool also makes the seamless loop less
// repetitive to the eye (longer content → loop period stretches).
const HUD_TICKER_MESSAGES = [
  'SYSTEMS NOMINAL',
  'BLADE CALIBRATED',
  'KYBER ALIGNED',
  'POWER STABLE',
  'CRYSTAL RESONANT',
  'STYLE ENGINE READY',
  'PROFFIE OS 7.x',
  'LED MATRIX SYNC',
  'NEOPIXEL GAMMA LOCKED',
  'SMOOTHSWING V2',
  'FETT263 COMPAT',
  'MOTION ARMED',
  'FONT LIBRARY LOADED',
  'WS2812B CHANNEL OK',
  'STM32 DFU READY',
  'CARRIER LOCKED',
  'TX · 115200 BAUD',
  'BOOSTER CAP CHARGED',
  'HILT THERMAL OK',
  'GYRO FUSED',
  'ACCELEROMETER ZEROED',
  'I²C BUS ACTIVE',
  'SD PRESET MOUNT',
  'FIRMWARE PINNED',
  'SHIMMER HARMONIC',
  'DIFFUSION KERNEL',
];

// ─── Tab Definitions ───

// OV6 (2026-04-21): 5 → 4 tabs. Gallery → Design → Audio → Output.
// Dynamics was absorbed into Design. See UI_OVERHAUL_v2_PROPOSAL §1.
// W7 (2026-04-22): GALLERY promoted out of the editor tab bar and up
// to a top-level route (/gallery).
// 2026-04-22 (post-W7): Design / Audio / Output were further promoted
// out of the editor tab bar up to the header nav alongside Gallery.
// The editor no longer has any inner tab bar — a single top-level
// [Gallery] [Design] [Audio] [Output] row in the header is the only
// mode switch. `ActiveTab` still includes 'gallery' as a legacy value
// — the deep-link handler in app/editor/page.tsx resolves
// `?tab=gallery` to a full-route redirect rather than a tab switch.

// Canonical digit → tab mapping for the header-level nav lives in
// `TAB_BY_DIGIT` in `useKeyboardShortcuts.ts` now — that's the single
// consumer (⌘1–⌘4). After the header promotion the digits line up with
// the visible 4-link order: ⌘1 → Gallery (route), ⌘2 → Design,
// ⌘3 → Audio, ⌘4 → Output. ⌘5 stays reserved for OV8's STATE-mode
// takeover toggle (proposal §12b.4). No local mirror is needed any
// more because the header links are hand-wired rather than rendered
// from a table.

// Left-rail overhaul (v0.14.0 PR 2): TabContent removed. Section
// routing now lives in `components/layout/MainContent.tsx`, driven by
// `uiStore.activeSection` instead of `activeTab`.

// ─── Effect Chip ──────────────────────────────────────────────────────────
//
// Action-bar chip for a single effect trigger. Subscribes to the
// activeEffectsStore so sustained effects (Lockup et al.) show a
// visible "held" state — accent glow + pulse animation — when the
// effect is currently running. Clicking an active chip releases it
// (parity with the keyboard toggle behavior). One-shot effects
// (Clash / Blast / Stab) never show the held state — they fire once
// and decay naturally in the engine, no tracking needed.

// EffectChip extracted to apps/web/components/editor/EffectChip.tsx
// (W4 2026-04-22) so the EffectsPinDropdown can re-use it.

// ─── Main Component ───

/**
 * WorkbenchLayout — desktop editor layout for KyberStation.
 *
 * Structure (top to bottom):
 *  1. Header bar — logo, 4-link top-level nav (Gallery / Design /
 *     Audio / Output), undo/redo, FPS, share, settings
 *  2. Status bar — live telemetry (profile / conn / theme / build / …)
 *  3. Blade + visualization stack — horizontal blade canvas + analysis
 *  4. Multi-column panel content — fills remaining space, scrollable
 *  5. Effect comparison strips — collapsible
 *  6. PerformanceBar + DeliveryRail + ticker chrome
 *
 * As of 2026-04-22 (post-W7) there is no inner tab bar — Design /
 * Audio / Output live in the header nav alongside Gallery (which is a
 * separate /gallery route). Tab switches flip `activeTab` in uiStore;
 * the multi-column panel region (TabColumnContent) reads the store
 * and renders the appropriate set of panels.
 *
 * Designed for desktop only. AppShell can render this for the desktop breakpoint
 * while keeping mobile/tablet layouts separate.
 */
export function WorkbenchLayout() {
  const { engineRef, toggle, triggerEffect, releaseEffect } = useBladeEngine();
  const audio = useAudioEngine();
  useThemeApplier();
  useAccessibilityApplier();
  usePerformanceTier();
  useAurebesh();
  usePauseSystem();
  usePresetListSync();
  useHistoryTracking();

  // Platform-aware kbd display: Mac shows ⌘K, Windows / Linux shows Ctrl+K.
  // The keyboard event handlers read (e.metaKey || e.ctrlKey) so either
  // physical modifier works regardless of what we display.
  const meta = useMetaKey();
  const kbdFor = (key: string) => `${meta.symbol}${meta.sep}${key}`;

  // Router for ⌘K palette navigation. Gallery is a cross-route
  // destination; everything else routes via `setActiveSection`.
  const router = useRouter();

  // ── Store selectors ──
  // Left-rail overhaul (v0.14.0 PR 2): activeTab + setActiveTab are no
  // longer driven from this layout. activeSection drives the sidebar +
  // MainContent. Mobile/tablet shells still use activeTab; the field
  // remains in uiStore for them.
  const activeSection = useUIStore((s) => s.activeSection);
  const setActiveSection = useUIStore((s) => s.setActiveSection);
  const showEffectComparison = useUIStore((s) => s.showEffectComparison);
  const toggleEffectComparison = useUIStore((s) => s.toggleEffectComparison);
  // Phase 1.5x (2026-04-24): All States behavior reworked. The 9-state
  // stack now replaces the PIXEL STRIP + Expanded Slot regions only;
  // BLADE PREVIEW stays visible. The 2D/3D toggle is also retired —
  // 2D is the only mode going forward.
  const showStateGrid = useUIStore((s) => s.showStateGrid);
  const toggleStateGrid = useUIStore((s) => s.toggleStateGrid);

  // OV11: drag-to-resize slices. Each region has min/max/default in
  // REGION_LIMITS and a dedicated setter that persists to localStorage.
  const analysisRailWidth = useUIStore((s) => s.analysisRailWidth);
  const inspectorWidth = useUIStore((s) => s.inspectorWidth);
  const section2Height = useUIStore((s) => s.section2Height);
  const setAnalysisRailWidth = useUIStore((s) => s.setAnalysisRailWidth);
  const setInspectorWidth = useUIStore((s) => s.setInspectorWidth);
  const setSection2Height = useUIStore((s) => s.setSection2Height);

  // Phase 1.5d: action-bar-local `isOn` moved into CanvasLayout
  // (which now renders the IGNITE/Retract toggle). Still referenced via
  // `useBladeStore.getState()` below for toggleWithAudio's audio trigger.
  const ledCount = useBladeStore((s) => s.config.ledCount);
  // Subscribed for the HUD ticker live entries below. The `setCanvasTheme`
  // setter is separately memoed for the palette's theme commands.
  const canvasTheme = useUIStore((s) => s.canvasTheme);

  // Canvas theme setter — surfaced via the ⌘K command palette. Kept
  // separate from the `canvasTheme` value subscription so the memoized
  // command list doesn't churn every time a theme command runs.
  const setCanvasTheme = useUIStore((s) => s.setCanvasTheme);

  // Pause toggle — surfaced as a TOGGLE palette command. Mirrors the
  // header PauseButton's behaviour (full-pause via the 'full' scope).
  const togglePause = useUIStore((s) => s.togglePause);

  // A11y toggles surfaced via the palette so users can flip them
  // without opening Settings. Both setters write through the
  // accessibility store, which also persists to localStorage and
  // syncs the OS reduced-motion preference for `reducedMotion`.
  const reduceBloom = useAccessibilityStore((s) => s.reduceBloom);
  const setReduceBloom = useAccessibilityStore((s) => s.setReduceBloom);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);
  const setReducedMotion = useAccessibilityStore((s) => s.setReducedMotion);

  // EDIT-group commands — Save Preset (window.prompt for v1, matches
  // SavePresetButton), Add to Queue (uses the same toast pipeline as
  // AddToQueueButton), Surprise Me (delegates to the standalone
  // useSurpriseMe hook, which is what the Inspector + Gallery cards
  // already call).
  const savePreset = useUserPresetStore((s) => s.savePreset);
  const { surprise: surpriseMe } = useSurpriseMe();

  // Build the HUD ticker content by interleaving the static lore pool
  // with live engine / UI readouts. The ticker is ambient decorative
  // chrome, so re-computing on tab / theme change is fine — it just
  // snaps to the new content at the next loop frame. Live entries:
  //   · TAB · <activeTab uppercase>
  //   · THEME · <canvasTheme uppercase>
  //   · LEDS · <ledCount>
  // Pattern: every 4th slot gets a live entry, then trailing live
  // entries flush at the end. Result: live data is spread through the
  // loop rather than clumped in one spot.
  // Phase 1.5r: view-controls JSX shared between CanvasLayout's
  // BLADE PREVIEW PanelHeader (primary) and the absolute fallback
  // overlay (for 3D / StateGrid modes where CanvasLayout isn't
  // mounted). Memoised on the state each button reads.
  const viewControlsNode = useMemo(
    () => (
      <>
        <div className="flex rounded overflow-hidden border border-border-subtle">
          <button
            onClick={() => showStateGrid && toggleStateGrid()}
            className={`px-2 py-0.5 text-ui-xs font-medium font-mono uppercase tracking-[0.08em] transition-colors ${
              !showStateGrid
                ? 'bg-accent-dim text-accent border-r border-accent-border/40'
                : 'bg-transparent text-text-muted hover:text-text-secondary border-r border-border-subtle'
            }`}
            title="Single blade preview"
            aria-pressed={!showStateGrid}
          >
            Single
          </button>
          <button
            onClick={() => !showStateGrid && toggleStateGrid()}
            className={`px-2 py-0.5 text-ui-xs font-medium font-mono uppercase tracking-[0.08em] transition-colors ${
              showStateGrid
                ? 'bg-accent-dim text-accent'
                : 'bg-transparent text-text-muted hover:text-text-secondary'
            }`}
            title={`All 9 blade states · ${kbdFor('5')}`}
            aria-pressed={showStateGrid}
          >
            All States
          </button>
        </div>
        <FullscreenButton className="w-5 h-5" />
      </>
    ),
    [showStateGrid, toggleStateGrid, kbdFor],
  );

  const tickerMessages = useMemo(() => {
    const live = [
      `SECTION · ${activeSection.toUpperCase()}`,
      `THEME · ${canvasTheme.toUpperCase()}`,
      `LEDS · ${ledCount}`,
    ];
    const out: string[] = [];
    let liveIdx = 0;
    for (let i = 0; i < HUD_TICKER_MESSAGES.length; i++) {
      out.push(HUD_TICKER_MESSAGES[i]);
      if ((i + 1) % 4 === 0 && liveIdx < live.length) {
        out.push(live[liveIdx++]);
      }
    }
    while (liveIdx < live.length) out.push(live[liveIdx++]);
    return out;
  }, [activeSection, canvasTheme, ledCount]);

  // ── Pixel buffer for VisualizationStack ──
  // Capture the engine's live Uint8Array once after mount. getPixels() returns
  // the same buffer reference every call (mutated in place each frame), so
  // LayerCanvas draw calls will always read the latest pixel values.
  const pixelBufRef = useRef<Uint8Array | null>(null);
  useEffect(() => {
    pixelBufRef.current = engineRef.current?.getPixels() ?? null;
  }, [engineRef]);

  // ── Audio-wrapped toggle + effects ──
  const toggleWithAudio = useCallback(() => {
    const wasOn = useBladeStore.getState().isOn;
    toggle();
    if (wasOn) {
      audio.playRetraction();
    } else {
      audio.playIgnition();
    }
  }, [toggle, audio]);

  const triggerEffectWithAudio = useCallback(
    (type: string) => {
      triggerEffect(type);
      const audioMap: Record<string, () => void> = {
        clash: audio.playClash,
        blast: audio.playBlast,
        stab: audio.playStab,
        lockup: audio.playLockup,
        lightning: audio.playClash,
        drag: audio.playLockup,
        melt: audio.playLockup,
        force: audio.playSwing,
      };
      audioMap[type]?.();
    },
    [triggerEffect, audio],
  );

  // Shared effect-command dispatcher used by every palette AUDITION row
  // and the action-bar chips. For sustained effects (Lockup, Drag,
  // Melt, Lightning, Force) it toggles — re-triggering from any source
  // while the effect is held releases it. For one-shots (Clash, Blast,
  // Stab, etc.) it just triggers and the engine decays naturally.
  // Runs the audio-aware trigger + the store-aware release through
  // `toggleOrTriggerEffect` in `@/lib/effectToggle`.
  const handleEffectCommand = useCallback(
    (effectType: string) => {
      toggleOrTriggerEffect(effectType, {
        triggerEffect: triggerEffectWithAudio,
        releaseEffect,
      });
    },
    [triggerEffectWithAudio, releaseEffect],
  );

  // ── Combined sound mute toggle — controls font audio + UI sounds ──
  const toggleSoundMute = useCallback(() => {
    audio.toggleMute();
    // Sync UI sound engine: if we're about to unmute, set UI sounds to 'subtle';
    // if muting, set to 'silent'.  audio.muted is the *current* value (pre-toggle).
    const uiEngine = getUISoundEngine();
    if (audio.muted) {
      // Was muted, now unmuting — enable UI sounds
      uiEngine.setPreset('subtle');
    } else {
      // Was unmuted, now muting — silence UI sounds
      uiEngine.setPreset('silent');
    }
  }, [audio]);

  // ── Modal visibility state ──
  // Declared before `handlers` so that `openShortcutsHelp` is in scope
  // when the keyboard-shortcut memo references it.
  const [showSettings, setShowSettings] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const openShortcutsHelp = useCallback(() => setShowShortcutsHelp(true), []);

  // Auto-open the Saber Wizard when entering /editor with `?wizard=1`.
  // The landing page's "Launch Wizard" CTA links to /editor?wizard=1
  // expecting this hook to fire — without it, users land in the editor
  // with no wizard visible. Reads search params once on mount; subsequent
  // navigations within the editor don't re-trigger.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('wizard') === '1') {
      setShowWizard(true);
    }
    // Intentionally empty deps — fire once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ── AnalysisRail expand slot (post-OV11 density pass) ──
  // State lives in `uiStore.expandedAnalysisLayerId`. The rail's ↗
  // button routes through the setter; CanvasLayout's ExpandedAnalysisSlot
  // reads the id directly. Default is `rgb-luma` so the blade /
  // pixel-strip / waveform stack mirrors the pre-overhaul shape on
  // first load.
  const expandedLayerId = useUIStore((s) => s.expandedAnalysisLayerId);
  const setExpandedLayerId = useUIStore((s) => s.setExpandedAnalysisLayerId);

  // ── Keyboard shortcuts + timeline ──
  const handlers = useMemo(
    () => ({
      toggle: toggleWithAudio,
      triggerEffect: triggerEffectWithAudio,
      releaseEffect,
      openHelp: openShortcutsHelp,
    }),
    [toggleWithAudio, triggerEffectWithAudio, releaseEffect, openShortcutsHelp],
  );
  useKeyboardShortcuts(handlers);
  useTimelinePlayback(toggleWithAudio, triggerEffectWithAudio);

  // ── ⌘K command palette ──
  // Arm the global ⌘K listener. Registration below supplies the initial
  // command set; owning panels may register more on mount in later waves.
  useCommandPalette();

  // EDIT-group palette helpers. Each wraps a side-effecting action with
  // a UI sound + the same toast / prompt UX the action-bar buttons use.
  const handleSavePreset = useCallback(() => {
    const current = useBladeStore.getState().config;
    const defaultName =
      (current as Record<string, unknown>).name
        ? String((current as Record<string, unknown>).name)
        : `My Preset ${new Date().toLocaleTimeString()}`;
    const name = window.prompt('Name your preset:', defaultName);
    if (!name || name.trim().length === 0) return;
    savePreset(name.trim(), { ...current });
    toast.success(`Saved "${name.trim()}"`);
  }, [savePreset]);

  const handleAddToQueue = useCallback(() => {
    const current = useBladeStore.getState().config;
    addToQueueWithToast(current);
  }, []);

  const handleSurpriseMe = useCallback(() => {
    playUISound('button-click');
    surpriseMe();
    playUISound('success');
  }, [surpriseMe]);

  const commands = useMemo<Command[]>(() => {
    const goToSection = (section: SectionId) => () => {
      playUISound('tab-switch');
      router.push('/editor');
      setActiveSection(section);
    };
    const out: Command[] = [
      // ── NAVIGATE — left-rail overhaul (v0.14.0) ───────────────────
      // Gallery is a top-level route (/gallery). The remaining entries
      // route via `setActiveSection`. ⌘1–⌘5 in useKeyboardShortcuts.ts
      // mirror these.
      {
        id: 'nav:gallery',
        group: 'NAVIGATE',
        title: 'Go to Gallery',
        kbd: kbdFor('1'),
        icon: '⚒',
        run: () => router.push('/gallery'),
      },
      {
        id: 'nav:blade-style',
        group: 'NAVIGATE',
        title: 'Go to Blade Style',
        kbd: kbdFor('2'),
        icon: '⚒',
        run: goToSection('blade-style'),
      },
      {
        id: 'nav:color',
        group: 'NAVIGATE',
        title: 'Go to Color',
        icon: '⚒',
        run: goToSection('color'),
      },
      {
        id: 'nav:ignition-retraction',
        group: 'NAVIGATE',
        title: 'Go to Ignition & Retraction',
        icon: '⚒',
        run: goToSection('ignition-retraction'),
      },
      {
        id: 'nav:combat-effects',
        group: 'NAVIGATE',
        title: 'Go to Combat Effects',
        icon: '⚒',
        run: goToSection('combat-effects'),
      },
      {
        id: 'nav:layer-compositor',
        group: 'NAVIGATE',
        title: 'Go to Layers',
        icon: '⚒',
        run: goToSection('layer-compositor'),
      },
      {
        id: 'nav:routing',
        group: 'NAVIGATE',
        title: 'Go to Routing',
        icon: '⚒',
        run: goToSection('routing'),
      },
      {
        id: 'nav:motion-simulation',
        group: 'NAVIGATE',
        title: 'Go to Motion Simulation',
        icon: '⚒',
        run: goToSection('motion-simulation'),
      },
      {
        id: 'nav:gesture-controls',
        group: 'NAVIGATE',
        title: 'Go to Gesture Controls',
        icon: '⚒',
        run: goToSection('gesture-controls'),
      },
      {
        id: 'nav:my-saber',
        group: 'NAVIGATE',
        title: 'Go to My Saber',
        subtitle: 'Saber profile manager',
        icon: '⚒',
        run: goToSection('my-saber'),
      },
      {
        id: 'nav:hardware',
        group: 'NAVIGATE',
        title: 'Go to Hardware',
        icon: '⚒',
        run: goToSection('hardware'),
      },
      {
        id: 'nav:my-crystal',
        group: 'NAVIGATE',
        title: 'Go to My Crystal',
        subtitle: 'Saber Card / Kyber Crystal export',
        icon: '⚒',
        run: goToSection('my-crystal'),
      },
      {
        id: 'nav:audio',
        group: 'NAVIGATE',
        title: 'Go to Audio',
        kbd: kbdFor('3'),
        icon: '⚒',
        run: goToSection('audio'),
      },
      {
        id: 'nav:output',
        group: 'NAVIGATE',
        title: 'Go to Output',
        kbd: kbdFor('4'),
        icon: '⚒',
        run: goToSection('output'),
      },
      // ── EDIT — current-config side-effects (save, queue, randomize) ──
      // These actions read the live bladeStore inside their `run` so the
      // palette doesn't need to re-render on every parameter tweak.
      {
        id: 'edit:save-preset',
        group: 'EDIT',
        title: 'Save current as preset',
        subtitle: 'Snapshot current design into My Presets',
        icon: '⭐',
        run: handleSavePreset,
      },
      {
        id: 'edit:add-to-queue',
        group: 'EDIT',
        title: 'Add to queue',
        subtitle: 'Add current design to active saber profile card queue',
        icon: '📌',
        run: handleAddToQueue,
      },
      {
        id: 'edit:surprise-me',
        group: 'EDIT',
        title: 'Surprise me',
        subtitle: 'Randomize the current blade design',
        icon: '✨',
        run: handleSurpriseMe,
      },
      // ── TOGGLE — flip a binary state (pause / a11y) ─────────────────
      // Single label rather than per-state ("Pause animation" / "Resume
      // animation") so the palette stays predictable as state flips.
      {
        id: 'toggle:pause',
        group: 'TOGGLE',
        title: 'Toggle pause',
        subtitle: 'Freeze blade engine + animations',
        kbd: 'Esc',
        icon: '⏸',
        run: () => togglePause('full'),
      },
      {
        id: 'toggle:reduce-bloom',
        group: 'TOGGLE',
        title: reduceBloom ? 'Disable Reduce Bloom' : 'Enable Reduce Bloom',
        subtitle: 'Tone down blade glow + bloom intensity',
        icon: '·',
        run: () => setReduceBloom(!reduceBloom),
      },
      {
        id: 'toggle:reduce-motion',
        group: 'TOGGLE',
        title: reducedMotion ? 'Disable Reduced Motion' : 'Enable Reduced Motion',
        subtitle: 'Honour OS reduced-motion preference',
        icon: '·',
        run: () => setReducedMotion(!reducedMotion),
      },
      // ── AUDITION ──────────────────────────────────────────────────
      {
        id: 'audition:ignite',
        group: 'AUDITION',
        title: 'Ignite / Retract blade',
        subtitle: 'Toggle blade on/off',
        kbd: 'Space',
        icon: '▶',
        run: toggleWithAudio,
      },
      {
        id: 'audition:clash',
        group: 'AUDITION',
        title: 'Trigger Clash',
        kbd: 'C',
        icon: '▶',
        run: () => handleEffectCommand('clash'),
      },
      {
        id: 'audition:blast',
        group: 'AUDITION',
        title: 'Trigger Blast',
        kbd: 'B',
        icon: '▶',
        run: () => handleEffectCommand('blast'),
      },
      {
        id: 'audition:lockup',
        group: 'AUDITION',
        title: 'Hold Lockup',
        kbd: 'L',
        icon: '▶',
        run: () => handleEffectCommand('lockup'),
      },
      {
        id: 'audition:stab',
        group: 'AUDITION',
        title: 'Trigger Stab',
        kbd: 'S',
        icon: '▶',
        run: () => handleEffectCommand('stab'),
      },
      // W4b — 17 effects pruned from the visible action bar and exposed
      // here in the AUDITION palette group. The `kbd` strings mirror
      // EFFECT_SHORTCUTS_BY_CODE in `lib/keyboardShortcuts.ts` exactly;
      // effects without a single-letter hotkey (scatter/ripple/freeze/
      // overcharge/invert) intentionally omit the `kbd` field.
      {
        id: 'audition:lightning',
        group: 'AUDITION',
        title: 'Hold Lightning',
        kbd: 'N',
        icon: '▶',
        run: () => handleEffectCommand('lightning'),
      },
      {
        id: 'audition:drag',
        group: 'AUDITION',
        title: 'Hold Drag',
        kbd: 'D',
        icon: '▶',
        run: () => handleEffectCommand('drag'),
      },
      {
        id: 'audition:melt',
        group: 'AUDITION',
        title: 'Hold Melt',
        kbd: 'M',
        icon: '▶',
        run: () => handleEffectCommand('melt'),
      },
      {
        id: 'audition:force',
        group: 'AUDITION',
        title: 'Trigger Force',
        kbd: 'F',
        icon: '▶',
        run: () => handleEffectCommand('force'),
      },
      {
        id: 'audition:shockwave',
        group: 'AUDITION',
        title: 'Trigger Shockwave',
        kbd: 'W',
        icon: '▶',
        run: () => handleEffectCommand('shockwave'),
      },
      {
        id: 'audition:scatter',
        group: 'AUDITION',
        title: 'Trigger Scatter',
        icon: '▶',
        run: () => handleEffectCommand('scatter'),
      },
      {
        id: 'audition:fragment',
        group: 'AUDITION',
        title: 'Trigger Fragment',
        kbd: 'R',
        icon: '▶',
        run: () => handleEffectCommand('fragment'),
      },
      {
        id: 'audition:ripple',
        group: 'AUDITION',
        title: 'Trigger Ripple',
        icon: '▶',
        run: () => handleEffectCommand('ripple'),
      },
      {
        id: 'audition:freeze',
        group: 'AUDITION',
        title: 'Trigger Freeze',
        icon: '▶',
        run: () => handleEffectCommand('freeze'),
      },
      {
        id: 'audition:overcharge',
        group: 'AUDITION',
        title: 'Trigger Overcharge',
        icon: '▶',
        run: () => handleEffectCommand('overcharge'),
      },
      {
        id: 'audition:bifurcate',
        group: 'AUDITION',
        title: 'Trigger Bifurcate',
        kbd: 'V',
        icon: '▶',
        run: () => handleEffectCommand('bifurcate'),
      },
      {
        id: 'audition:invert',
        group: 'AUDITION',
        title: 'Trigger Invert',
        icon: '▶',
        run: () => handleEffectCommand('invert'),
      },
      {
        id: 'audition:ghostEcho',
        group: 'AUDITION',
        title: 'Trigger Ghost Echo',
        kbd: 'G',
        icon: '▶',
        run: () => handleEffectCommand('ghostEcho'),
      },
      {
        id: 'audition:splinter',
        group: 'AUDITION',
        title: 'Trigger Splinter',
        kbd: 'P',
        icon: '▶',
        run: () => handleEffectCommand('splinter'),
      },
      {
        id: 'audition:coronary',
        group: 'AUDITION',
        title: 'Trigger Coronary',
        kbd: 'E',
        icon: '▶',
        run: () => handleEffectCommand('coronary'),
      },
      {
        id: 'audition:glitchMatrix',
        group: 'AUDITION',
        title: 'Trigger Glitch Matrix',
        kbd: 'X',
        icon: '▶',
        run: () => handleEffectCommand('glitchMatrix'),
      },
      {
        id: 'audition:siphon',
        group: 'AUDITION',
        title: 'Trigger Siphon',
        kbd: 'H',
        icon: '▶',
        run: () => handleEffectCommand('siphon'),
      },
      // ── VIEW ──────────────────────────────────────────────────────
      {
        id: 'view:toggle-fx-compare',
        group: 'VIEW',
        title: 'Toggle FX Comparison strips',
        subtitle: 'Show or hide the reference comparison row',
        icon: '·',
        run: toggleEffectComparison,
      },
      {
        id: 'view:mute-audio',
        group: 'VIEW',
        title: 'Toggle audio mute',
        subtitle: 'Silence font audio + UI sounds',
        icon: '·',
        run: toggleSoundMute,
      },
      {
        id: 'view:settings',
        group: 'VIEW',
        title: 'Open Settings',
        icon: '·',
        run: () => setShowSettings(true),
      },
      {
        id: 'view:help',
        group: 'VIEW',
        title: 'Keyboard shortcuts help',
        kbd: '?',
        icon: '·',
        run: openShortcutsHelp,
      },
      // ── WIZARD ────────────────────────────────────────────────────
      {
        id: 'wizard:open',
        group: 'WIZARD',
        title: 'Open Saber Wizard',
        subtitle: '3-step guided preset — archetype / colour / vibe',
        icon: '✦',
        run: () => setShowWizard(true),
      },
    ];

    // ── THEME ──────────────────────────────────────────────────────
    // Emit commands for the base 9 + extended locations + factions.
    // Surfaces all ~30 themes in the palette — the previous 8-entry
    // cap left two-thirds of the catalog discoverable only through the
    // Settings modal. Palette filtering by typed query keeps the
    // default view scannable; no separate "themes" section needed.
    const themeEntries: Array<{ id: string; label: string }> = [
      ...CANVAS_THEMES.map((t) => ({ id: t.id, label: t.label })),
      ...EXTENDED_LOCATION_THEMES.map((t) => ({ id: t.id, label: t.label })),
      ...EXTENDED_FACTION_THEMES.map((t) => ({ id: t.id, label: t.label })),
    ];
    for (const t of themeEntries) {
      out.push({
        id: `theme:${t.id}`,
        group: 'THEME',
        title: `Theme: ${t.label}`,
        icon: '◆',
        run: () => setCanvasTheme(t.id),
      });
    }

    return out;
  }, [
    setActiveSection,
    toggleWithAudio,
    handleEffectCommand,
    toggleEffectComparison,
    toggleSoundMute,
    openShortcutsHelp,
    setCanvasTheme,
    router,
    kbdFor,
    handleSavePreset,
    handleAddToQueue,
    handleSurpriseMe,
    togglePause,
    reduceBloom,
    setReduceBloom,
    reducedMotion,
    setReducedMotion,
  ]);

  useRegisterCommands(commands);

  // ── Engine ready guard — show CanvasSkeleton until the engine mounts ──
  const [engineReady, setEngineReady] = useState(false);
  useEffect(() => {
    // engineRef is populated by useBladeEngine's first useEffect; wait one
    // microtask to let it run before marking ready.
    const id = requestAnimationFrame(() => setEngineReady(true));
    return () => cancelAnimationFrame(id);
  }, [engineRef]);

  // Phase 1.5h: auto-ignite 500ms after the engine is ready — the
  // workbench "comes alive" with a lit blade on first paint instead
  // of a retracted hilt. Always drives the ignition animation
  // regardless of persisted `isOn` state, because the BladeEngine
  // itself is a fresh instance on each page load (extendProgress
  // starts at 0) and would otherwise show a retracted hilt even
  // when `bladeStore.isOn` was persisted as true. Reset-then-ignite
  // forces both the store + engine into sync.
  const autoIgnitedRef = useRef(false);
  useEffect(() => {
    if (!engineReady || autoIgnitedRef.current) return;
    // Reset immediately so the blade starts from a clean retracted
    // state; ignition animation will then play within the 500ms
    // window from off → on.
    useBladeStore.getState().setIsOn(false);
    const timer = setTimeout(() => {
      autoIgnitedRef.current = true;
      toggleWithAudio();
    }, 500);
    return () => clearTimeout(timer);
  }, [engineReady, toggleWithAudio]);

  // ─── Render ───
  return (
    <div className="h-screen flex flex-col bg-bg-deep text-text-primary font-mono overflow-hidden">
      {/* ════════════════════════════════════════════════════
       * 1. HEADER BAR
       * ════════════════════════════════════════════════════ */}
      <header className="relative flex items-center justify-between px-4 py-1.5 border-b border-border-subtle bg-bg-secondary shrink-0">
        {/* Left cluster: logo + project name.
            Wave 4 trim: the "Universal Saber Style Engine" subtitle and the
            version/profile breadcrumb were removed — StatusBar now owns PROFILE
            + BUILD identity (see W3). */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-none">
            <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
              <span className="text-white">KYBER</span>
              <span className="text-accent">STATION</span>
            </h1>
          </div>

          {/* Header-level nav: removed in left-rail overhaul (v0.14.0
              PR 2). The sidebar (Sidebar.tsx) absorbs Gallery / Design /
              Audio / Output. ⌘K palette NAVIGATE commands route via
              `setActiveSection`. */}

          <UndoRedoButtons />

          <SaberProfileSwitcher />
        </div>

        {/* Right cluster: FPS, controls, ignite.
            Wave 4 trim: the "FX Compare" toggle moved to the ⌘K palette
            (its keybinding + toggle logic remain wired below). */}
        <div className="flex items-center gap-2">
          <ShareButton />

          <FPSCounter />

          {/* PauseButton removed from header (W4 2026-04-22) — it now
              lives in the action bar alongside Ignite/Retract so the
              blade transport controls are co-located. */}

          {/* Audio mute — controls both font audio engine and UI sounds */}
          <HeaderButton
            onClick={toggleSoundMute}
            variant={audio.muted ? 'default' : 'accent'}
            className={audio.muted ? undefined : 'bg-accent-dim/30'}
            title={audio.muted ? 'Unmute all audio (font sounds + UI sounds)' : 'Mute all audio'}
          >
            {audio.muted ? 'Sound OFF' : 'Sound ON'}
          </HeaderButton>

          {/* Docs */}
          <Link
            href="/docs"
            target="_blank"
            className="inline-flex items-center justify-center h-7 px-2 rounded-interactive text-ui-xs font-medium border border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-secondary hidden desktop:inline-flex"
          >
            Docs
          </Link>

          {/* ⌘K Command palette chip — reference `title-strip .cmd-hint`.
              Hidden on tablet; the palette hotkey still works at every
              width via useCommandPalette. */}
          <HeaderButton
            onClick={() => useCommandStore.getState().open()}
            className="hidden desktop:inline-flex gap-1.5 font-mono bg-bg-deep/40 tracking-wider"
            title={`Open command palette (${kbdFor('K')})`}
            aria-label="Open command palette"
          >
            Command <kbd className="font-mono text-text-muted/80">{kbdFor('K')}</kbd>
          </HeaderButton>

          <HeaderButton
            onClick={() => setShowWizard(true)}
            variant="accent"
            title="Launch the guided Saber Wizard — 4 steps to a complete preset"
            aria-label="Open Saber Wizard"
            style={{
              // Subtle crystal-colour glow on hover — the var is set by
              // useCrystalAccent to match the current blade base colour.
              boxShadow: '0 0 8px rgb(var(--crystal-accent, var(--accent)) / 0.25)',
            }}
          >
            <span aria-hidden="true">✦</span>
            <span className="hidden tablet:inline desktop:inline">Wizard</span>
          </HeaderButton>

          <HeaderButton
            onClick={openShortcutsHelp}
            iconOnly
            className="hidden desktop:inline-flex"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            ?
          </HeaderButton>

          <HeaderButton
            onClick={() => setShowSettings(true)}
            iconOnly
            className="hidden desktop:inline-flex"
            title="Settings"
            aria-label="Open settings"
          >
            ⚙
          </HeaderButton>
        </div>
      </header>

      {/* W11 (2026-04-22): StatusBar retired. Every segment it
          carried (PWR / PROFILE / CONN / LEDs / MOD / STOR / THEME /
          PRESET / UTC / BUILD) moved into the consolidated
          AppPerfStrip at the bottom of the app (section 5e).
          Single source of truth for all live-status readouts. */}

      {/* ════════════════════════════════════════════════════
       * 2. BLADE + ANALYSIS STACK — always visible
       *
       * OV5 (2026-04-21): section 2 was restructured from the
       * pre-existing vertical arrangement (section 2 blade + section
       * 2b analysis stack below) to a horizontal flex row:
       *
       *   [AnalysisRail]  [VisualizationToolbar]  [Blade canvas]
       *     ^ line-graph                           ^ pixel-shaped
       *       layers                                 layers + pixel strip +
       *                                              RGB graphs stay with
       *                                              the canvas via
       *                                              CanvasLayout (OV2)
       *
       * Section 2b was eliminated entirely — the 9 line-graph layers
       * (luminance, power-draw, hue, saturation, channel-r/g/b,
       * swing-response, transition-progress) now render in the
       * AnalysisRail on the left, while the pixel-shaped layers
       * (blade, pixel-strip, effect-overlay) stay with the blade
       * preview. storage-budget (scalar) moved to the Delivery
       * rail's STORAGE segment (see section 5c / OV4).
       *
       * Total vertical footprint reclaimed: ~max-h-400px of section
       * 2b is freed for the multi-column panel region (section 4).
       * ════════════════════════════════════════════════════ */}
      <section
        className="shrink-0 bg-bg-primary flex overflow-hidden"
        style={{ height: section2Height }}
        role="region"
        aria-label="Blade visualization"
      >
        {/* W2 swap (2026-04-22): LEFT is now the Inspector, RIGHT is
            the AnalysisRail. The inspector is the heavier edit surface
            and belongs with the rest of the left-hand chrome (header /
            status bar); the waveform rail reads more like a monitoring
            surface and sits across from the hilt tip.

            LEFT — Inspector (always visible post left-rail overhaul).
            Width user-draggable via the handle to its right. */}
        <Inspector
          className="h-full"
          style={{ width: inspectorWidth }}
        />

        {/* OV11 — Inspector ↔ blade resize handle. */}
        <ResizeHandle
          orientation="horizontal"
          value={inspectorWidth}
          min={REGION_LIMITS.inspectorWidth.min}
          max={REGION_LIMITS.inspectorWidth.max}
          defaultValue={REGION_LIMITS.inspectorWidth.default}
          onChange={setInspectorWidth}
          ariaLabel="Resize inspector"
        />

        {/* Blade canvas area — horizontal, fills remaining width.
            OV8: when showStateGrid is on and we're on Design, the
            single blade preview is replaced by the 9-state grid. Other
            tabs always show the single canvas regardless of the toggle
            (STATE mode is a Design-tab concern). */}
        <CornerBrackets className="flex-1 min-w-0" size={16} thickness={1} pulse={true}>
          {/*
            Phase 1.5q: wrapper padding trimmed from `p-1` (4px all sides)
            to `px-1` only. Removes the top + bottom gap so the
            CanvasLayout's left + right `border-x` borders extend the
            full section2 height.

            Phase 1.5t (2026-04-24): horizontal inset dropped too.
            With ResizeHandle now a 0-width wrapper, the canvas column
            butts directly against Inspector / RightRail; keeping
            `px-1` produced a 4px dark stripe (section bg) between the
            Inspector edge and CanvasLayout's `border-l`. Letting the
            CornerBrackets sit flush with the column edges is fine —
            the corner decorations are subtle accent-25% L-shapes and
            read as part of the canvas column boundary.
          */}
          <div className="h-full relative">
            {!engineReady ? (
              <CanvasSkeleton className="h-full" />
            ) : (
              <CanvasLayout
                engineRef={engineRef}
                pixels={pixelBufRef.current}
                pixelCount={ledCount}
                onToggleBlade={toggleWithAudio}
                onTriggerEffect={triggerEffectWithAudio}
                onReleaseEffect={releaseEffect}
                viewControls={viewControlsNode}
              />
            )}
            {/* Pixel debug overlay — CanvasLayout (2D) is the only mode now,
                so this can always be on while the engine is ready. */}
            {engineReady && (
              <PixelDebugOverlay
                getPixelRgb={(index) => {
                  const engine = engineRef.current;
                  if (engine) {
                    const buf = engine.getPixels();
                    const base = index * 3;
                    if (base + 2 < buf.length) {
                      return { r: buf[base], g: buf[base + 1], b: buf[base + 2] };
                    }
                  }
                  return { r: 0, g: 0, b: 0 };
                }}
                vertical={false}
                className="absolute inset-0 z-20"
              />
            )}
          </div>
        </CornerBrackets>

        {/* W2 swap — RIGHT side: blade ↔ AnalysisRail resize handle.
            `invert` because the rail now sits to the right of the
            handle, so dragging right shrinks the rail (= grows the
            blade area). */}
        <ResizeHandle
          orientation="horizontal"
          value={analysisRailWidth}
          min={REGION_LIMITS.analysisRailWidth.min}
          max={REGION_LIMITS.analysisRailWidth.max}
          defaultValue={REGION_LIMITS.analysisRailWidth.default}
          onChange={setAnalysisRailWidth}
          invert
          ariaLabel="Resize analysis rail"
        />

        {/* RIGHT — W6 (2026-04-22): RightRail wraps the STATE tab
            (ex-Inspector, click-to-audition) and ANALYSIS tab (the
            existing rail with RGB + Luma / Power / Hue / etc.). Width
            still clamped via `analysisRailWidth` / REGION_LIMITS. */}
        <RightRail
          pixels={pixelBufRef.current}
          pixelCount={ledCount}
          onExpand={setExpandedLayerId}
          expandedLayerId={expandedLayerId}
          engineRef={engineRef}
          toggleBlade={toggleWithAudio}
          triggerEffect={triggerEffectWithAudio}
          releaseEffect={releaseEffect}
          className="h-full"
          style={{ width: analysisRailWidth }}
        />
      </section>

      {/* OV11 — section 2 ↔ panel-area vertical resize handle.
          Dragging down grows the blade preview; dragging up gives
          the panel area more room. Replaces the previous section-2
          `border-b` (the handle carries the seam). */}
      <ResizeHandle
        orientation="vertical"
        value={section2Height}
        min={REGION_LIMITS.section2Height.min}
        max={REGION_LIMITS.section2Height.max}
        defaultValue={REGION_LIMITS.section2Height.default}
        onChange={setSection2Height}
        ariaLabel="Resize blade preview height"
      />

      {/* ════════════════════════════════════════════════════
       * 2b. PIXEL-SHAPED VISUALIZATION STACK
       *
       * OV5 (2026-04-21): this block was previously the home of all
       * 12 non-blade layers. The 9 line-graph-shaped layers moved to
       * AnalysisRail (above, inside section 2), storage-budget moved
       * to the Delivery rail (section 5c), leaving only pixel-shaped
       * layers (effect-overlay today) that need to align with the
       * blade canvas width. When no pixel-shaped layer is visible —
       * the default — `VisualizationStack` returns null and this
       * container collapses to zero height. Kept as a named region so
       * future pixel-shaped layers register without reintroducing the
       * old heavyweight stack.
       * ════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 overflow-y-auto max-h-[200px] border-b border-border-subtle bg-bg-primary"
        role="region"
        aria-label="Pixel-aligned visualization layers"
      >
        <VisualizationStack
          pixelData={pixelBufRef.current}
          pixelCount={ledCount}
        />
      </div>

      {/* Phase 1.5d (v0.14.0): action bar moved into CanvasLayout's
          BLADE PREVIEW toolbar — IGNITE/Retract + Pause + effect chips
          now sit directly above the blade they control. */}

      {/* 2026-04-22 (post-W7): the internal editor tab bar was retired.
          Design / Audio / Output moved up to the header nav alongside
          Gallery, so a single [Gallery][Design][Audio][Output] row in
          the header is now the only mode switch. `TAB_BY_DIGIT` in
          useKeyboardShortcuts.ts still drives ⌘1–⌘4; palette NAVIGATE
          commands surface the same four destinations. */}

      {/* ════════════════════════════════════════════════════
       * 4. PANEL CONTENT — fills remaining space
       *
       * Left-rail overhaul (v0.14.0): when `useNewLayout` is on, the
       * legacy multi-column TabContent + DesignPanel pills are replaced
       * by a `[Sidebar | MainContent]` split. Sidebar owns navigation
       * (replaces top tabs + DesignPanel pills); MainContent renders the
       * one panel matching the active section. Old TabContent path stays
       * intact for the dual-mount window so the flag can be flipped /
       * unflipped without breakage.
       * ════════════════════════════════════════════════════ */}
      <div
        className="flex-1 min-h-0 flex overflow-hidden bg-bg-deep"
        role="region"
        aria-label="Section navigation and content"
      >
        <Sidebar style={{ width: 280 }} />
        <MainContent
          triggerEffect={triggerEffectWithAudio}
          releaseEffect={releaseEffect}
        />
      </div>

      {/* ════════════════════════════════════════════════════
       * 5. EFFECT COMPARISON STRIPS — collapsible
       * ════════════════════════════════════════════════════ */}
      {showEffectComparison && (
        <section
          className="shrink-0 border-t border-border-subtle"
          role="region"
          aria-label="Effect comparison"
        >
          <EffectComparisonPanel />
        </section>
      )}

      {/* PerformanceBar removed in left-rail overhaul (v0.14.0 PR 2).
          The Inspector's TUNE tab + the new sidebar cover the live-tune
          surfaces it used to expose. ShiftLightRail still imports
          `shiftLedColor` from the file; final deletion is PR 5 scope. */}

      {/* ════════════════════════════════════════════════════
       * 5c. DELIVERY RAIL — persistent 50px bottom bar
       *
       * Added 2026-04-21 in Lane C (OV4). Surfaces PROFILE · STORAGE ·
       * EXPORT · FLASH · CONN on every tab so "ship this" is always one
       * click away regardless of context. EXPORT + FLASH open modal
       * wrappers around the existing CardWriter / FlashPanel panels
       * (see `CardWriterModal.tsx`, `FlashPanelModal.tsx`). STORAGE +
       * CONN are passive readouts; PROFILE is a dropdown sharing
       * `SaberProfileSwitcher` with the header (variant='compact').
       *
       * Gated by neither activeTab nor the `performanceStore.visible`
       * toggle — the rail's ship-now message is universal. It sits
       * between PerformanceBar (5b, tab-gated in OV5) and DataTicker
       * (6) so the header/canvas/panels always see the same footer
       * shape regardless of which tabs or chrome toggles are active.
       * ════════════════════════════════════════════════════ */}
      <DeliveryRail />

      {/* ════════════════════════════════════════════════════
       * 5d. SHIFT-LIGHT RAIL — W3 (2026-04-22) relocation
       *
       * The 32-LED green/amber/red segment bar that formerly sat at
       * the top of the PerformanceBar now lives here, below the
       * Delivery Rail and at half its original height (10px → 5px).
       * Tracks live blade output RMS via the shared `useRmsLevel`
       * hook. NOT an app-performance indicator — that's AppPerfStrip
       * immediately below.
       * ════════════════════════════════════════════════════ */}
      <ShiftLightRail engineRef={engineRef} />

      {/* ════════════════════════════════════════════════════
       * 5e. APP PERF STRIP — W3 app-side FPS + GFX toggle
       *
       * FPS readout + three-tier graphics-quality segmented control
       * (HIGH / MEDIUM / LOW). Hover reveals frame-ms, canvas count,
       * largest canvas, and prioritized hints on what might be
       * slowing things down. GFX choice feeds useAnimationFrame so
       * every RAF in the app honors the cap immediately.
       * ════════════════════════════════════════════════════ */}
      <AppPerfStrip engineRef={engineRef} />

      {/* ════════════════════════════════════════════════════
       * 6. HUD DATA TICKER — ambient bottom chrome
       *
       * Relocated 2026-04-20 from the old top position to the very
       * bottom of the app, swapping places with the StatusBar. Runs
       * at half its previous speed (60s vs 30s) since the user spends
       * most time looking at the blade + panels, not the footer —
       * slower drift reads as "environmental" rather than "breaking
       * news." Pure decorative chrome; no interactive content.
       * ════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 border-t border-border-subtle bg-bg-deep/60 overflow-hidden"
        style={{ height: 18 }}
        aria-hidden="true"
      >
        <DataTicker
          data={tickerMessages}
          speed={60}
          className="h-full flex items-center pointer-events-none"
        />
      </div>

      {/* ════════════════════════════════════════════════════
       * FULLSCREEN PREVIEW — portal-style fixed overlay
       * ════════════════════════════════════════════════════ */}
      <FullscreenPreview engineRef={engineRef} onTriggerEffect={triggerEffectWithAudio} />

      {/* ════════════════════════════════════════════════════
       * SETTINGS MODAL
       * ════════════════════════════════════════════════════ */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <KeyboardShortcutsModal
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
      <SaberWizard open={showWizard} onClose={() => setShowWizard(false)} />

      {/* ════════════════════════════════════════════════════
       * ⌘K COMMAND PALETTE — portal-rendered, opens globally
       * ════════════════════════════════════════════════════ */}
      <CommandPalette />

      {/* AnalysisExpandOverlay removed (2026-04-21 density pass) —
          expanded layers now render inline beneath the pixel strip
          via CanvasLayout's ExpandedAnalysisSlot, sized to the blade
          render extent instead of a full-screen portal. */}
    </div>
  );
}
