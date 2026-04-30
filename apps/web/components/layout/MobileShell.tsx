'use client';

// ─── MobileShell — Phase 4.2 sticky-mini-shell rework (2026-04-30) ───────────
//
// Implements the handoff's StickyMiniShell anatomy from
// "Claude Design Mobile handoff/HANDOFF.md":
//
//   STICKY top:
//     1. App header              (44px)   — hamburger + title + ignite
//     2. Mini blade canvas       (64px)   — auto-ignited live preview
//     3. Pixel strip             (36px)   — per-LED color row
//     4. Action bar              (56px)   — 5 icon+letter effect chips + overflow
//     5. Section tabs            (32px)   — COLOR / STYLE / MOTION / FX / HW / ROUTE
//
//   SCROLLING content:
//     - Inspector when on 'my-saber' (default home)
//     - MainContent panel when on a tab section or any drawer-only section
//
//   STICKY bottom:
//     6. Status bar              (36px)   — scrollable horizontal 11-segment strip
//
// Section tabs replace the drawer for shallow editing nav per handoff §3.
// The hamburger drawer remains accessible from the header for non-tab
// sections (my-saber profiles, my-crystal, audio, output, etc.) and as
// a discoverability fallback. Tabs in the strip are highlighted only
// when the active section IS one of the 6 tab sections — otherwise the
// strip stays visible but no tab is selected.
//
// The Phase 4.1 PR #199/#200 chrome (Back-to-Canvas pill, in-editor
// bottom bar) is replaced by section tabs + persistent status bar.
// Section navigation now happens in two predictable ways:
//   - Tap a tab in MobileSectionTabs (always visible)
//   - Tap MENU in the header → drawer opens with full section list
// "Back" is implicit — tap the same tab again or pick MY SABER from the
// drawer to return home.

import { useEffect, useState, useRef, type RefObject } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useUIStore, type SectionId } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { BladeCanvas } from '@/components/editor/BladeCanvas';
import { Inspector } from '@/components/editor/Inspector';
import { MainContent } from '@/components/layout/MainContent';
import { PixelStripPanel } from '@/components/editor/PixelStripPanel';
import { LayerCanvas } from '@/components/editor/VisualizationStack';
import { AccessibilityPanel } from '@/components/editor/AccessibilityPanel';
import { FullscreenPreview, FullscreenButton } from '@/components/editor/FullscreenPreview';
import { PauseButton } from '@/components/layout/PauseButton';
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer';
import { MobileActionBar } from '@/components/layout/mobile/MobileActionBar';
import { MobileSectionTabs } from '@/components/layout/mobile/MobileSectionTabs';
import { MobileStatusBarStrip } from '@/components/layout/mobile/MobileStatusBarStrip';
import { ParameterSheetHost } from '@/components/layout/mobile/ParameterSheetHost';
import { MobileInspectHUD } from '@/components/layout/mobile/MobileInspectHUD';
import { useInspectModeStore } from '@/stores/inspectModeStore';
import { ColorRail } from '@/components/layout/mobile/ColorRail';
import { ColorQuickControls } from '@/components/layout/mobile/QuickControls';
import { playUISound } from '@/lib/uiSounds';

const HOME_SECTION: SectionId = 'my-saber';

interface MobileShellProps {
  showA11yPanel: boolean;
  setShowA11yPanel: (v: boolean) => void;
  engineRef: RefObject<BladeEngine | null>;
  isOn: boolean;
  toggleWithAudio: () => void;
  triggerEffectWithAudio: (type: string) => void;
  releaseEffect: (type: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audio: any;
}

export function MobileShell({
  showA11yPanel,
  setShowA11yPanel,
  engineRef,
  isOn,
  toggleWithAudio,
  triggerEffectWithAudio,
  releaseEffect,
  audio,
}: MobileShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeSection = useUIStore((s) => s.activeSection);

  // 'my-saber' is the home section — its body is the Inspector (Quick
  // Controls). Every other section renders its MainContent panel. The
  // sticky chrome above is identical regardless of section.
  const isHome = activeSection === HOME_SECTION;

  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  // Pixel buffer for the analysis stack (LayerCanvas).
  const pixelBufRef = useRef<Uint8Array | null>(null);
  useEffect(() => {
    pixelBufRef.current = engineRef.current?.getPixels() ?? null;
  }, [engineRef]);
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const isPaused = useUIStore((s) => s.isPaused);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  // ── Phase 4.5 Inspect mode wiring ────────────────────────────────
  const isInspecting = useInspectModeStore((s) => s.isInspecting);
  const inspectZoom = useInspectModeStore((s) => s.zoom);
  const inspectPanX = useInspectModeStore((s) => s.panX);
  const inspectOriginXFraction = useInspectModeStore((s) => s.originXFraction);
  const enterInspect = useInspectModeStore((s) => s.enter);
  const exitInspect = useInspectModeStore((s) => s.exit);
  const setPanX = useInspectModeStore((s) => s.setPanX);

  // 500ms long-press detection on the blade canvas region. Movement
  // beyond a small threshold cancels the press (treats it as the
  // start of a tap-and-drag instead). Pointer-up before the timer
  // also cancels.
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressDownRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const bladeRegionRef = useRef<HTMLDivElement | null>(null);

  function clearLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressDownRef.current = null;
  }

  function onBladePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Don't start a new long-press timer while already inspecting —
    // those pointer events drive the pan instead, handled below.
    if (isInspecting) return;
    longPressDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      const down = longPressDownRef.current;
      if (!down) return;
      const region = bladeRegionRef.current;
      if (!region) return;
      const rect = region.getBoundingClientRect();
      const fraction =
        rect.width > 0 ? Math.max(0, Math.min(1, (down.x - rect.left) / rect.width)) : 0.5;
      enterInspect(fraction);
      longPressDownRef.current = null;
    }, 500);
  }

  function onBladePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (isInspecting) {
      // Pan during inspect — drag updates panX with a clamp so the
      // user can't drag past the visible blade range. Clamp uses the
      // current zoom to compute max useful pan: at zoom Z the blade
      // visually expands by factor Z, so half of (Z - 1) * width is
      // the max one-side pan.
      const region = bladeRegionRef.current;
      if (!region) return;
      const rect = region.getBoundingClientRect();
      const maxPan = ((inspectZoom - 1) * rect.width) / 2;
      // Track delta from the pointer-down point. Without a stored
      // pointer-down, treat this move as a no-op (the pan starts on
      // the next pointer-down).
      const down = longPressDownRef.current;
      if (!down) return;
      const dx = e.clientX - down.x;
      setPanX(Math.max(-maxPan, Math.min(maxPan, dx)));
      return;
    }
    // Not inspecting — cancel long-press if pointer moved beyond a
    // small slop threshold (5 device pixels).
    const down = longPressDownRef.current;
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (dx * dx + dy * dy > 25) clearLongPress();
  }

  function onBladePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (isInspecting) {
      // Pan-end: keep the pan offset where the user released so the
      // visual position persists. Don't clear longPressDownRef yet —
      // the next pointer-down on the canvas during inspect re-anchors
      // the drag delta.
      longPressDownRef.current = null;
      return;
    }
    clearLongPress();
    void e;
  }

  // Pan re-anchor — when the user starts a new drag during inspect,
  // record the new pointer-down so subsequent moves measure delta
  // from it.
  function onBladePointerDownDuringInspect(e: React.PointerEvent<HTMLDivElement>) {
    if (!isInspecting) return;
    longPressDownRef.current = {
      x: e.clientX - inspectPanX,
      y: e.clientY,
      pointerId: e.pointerId,
    };
  }

  // Escape key exits Inspect mode (iPad / external keyboard support).
  useEffect(() => {
    if (!isInspecting) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') exitInspect();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isInspecting, exitInspect]);

  // Cleanup: clear any pending long-press timer on unmount.
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // Neutralize the global MobileTabBar bottom padding from layout.tsx —
  // the editor mobile shell uses its own status bar at the bottom, so
  // the 56px gutter is wasted space here.
  useEffect(() => {
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '0';
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, []);

  // Auto-ignite the blade ~500ms after the engine mounts (carried from
  // Phase 4.1). Without this the mobile editor opens with a retracted
  // blade since the engine starts at extendProgress=0.
  const autoIgnitedRef = useRef(false);
  useEffect(() => {
    if (autoIgnitedRef.current) return;
    if (!engineRef.current) return;
    useBladeStore.getState().setIsOn(false);
    const timer = setTimeout(() => {
      autoIgnitedRef.current = true;
      toggleWithAudio();
    }, 500);
    return () => clearTimeout(timer);
  }, [engineRef, toggleWithAudio]);

  return (
    <div
      className="h-[100dvh] flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden"
      data-inspect-mode={isInspecting || undefined}
      onPointerDown={(e) => {
        // Tap-outside-blade-and-HUD exits Inspect mode. We let the
        // blade region + the HUD intercept events via stopPropagation
        // (HUD) or by being above this listener (blade). Anything
        // else clicks through to here and ends the mode.
        if (!isInspecting) return;
        const target = e.target as HTMLElement;
        // If click came from inside the blade region or the HUD, bail.
        if (bladeRegionRef.current?.contains(target)) return;
        if (target.closest('[data-mobile-inspect-hud]')) return;
        exitInspect();
      }}
    >

      {/* ── 1. Header (44px) ────────────────────────────────────────────
          Hamburger MENU on the left, brand wordmark center, secondary
          chrome (sound, a11y, fullscreen, pause, ignite) on the right.
          Per HANDOFF Q-spec the header is 44px tall; primary buttons
          honor 44×44 touch targets. */}
      <header
        className="flex items-center justify-between px-2 border-b border-border-subtle bg-bg-secondary shrink-0 min-w-0 pt-[env(safe-area-inset-top)]"
        style={{ height: 'var(--header-h)' }}
      >
        {/* Hamburger menu trigger — opens the drawer with all sections. */}
        <button
          ref={hamburgerRef}
          type="button"
          onClick={() => {
            playUISound('tab-switch');
            setDrawerOpen(true);
          }}
          aria-label="Open editor sections menu"
          aria-expanded={drawerOpen}
          aria-haspopup="dialog"
          className="flex items-center gap-1.5 px-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light transition-colors rounded-interactive"
          style={{ minHeight: 'var(--touch-target)', minWidth: 'var(--touch-target)' }}
        >
          <span aria-hidden="true" className="flex flex-col gap-[3px]">
            <span className="block w-4 h-[2px] bg-current" />
            <span className="block w-4 h-[2px] bg-current" />
            <span className="block w-4 h-[2px] bg-current" />
          </span>
          <span className="text-ui-xs font-medium tracking-wider uppercase sr-only sm:not-sr-only">
            Menu
          </span>
        </button>

        <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
          <span className="text-white">KYBER</span>
          <span className="text-accent">STATION</span>
        </h1>

        <div className="flex items-center gap-1 shrink-0">
          {/* Sound mute */}
          <button
            type="button"
            onClick={audio.toggleMute}
            aria-label={audio.muted ? 'Unmute audio' : 'Mute audio'}
            className={[
              'flex items-center justify-center rounded-interactive border transition-colors text-[10px]',
              audio.muted
                ? 'border-border-subtle text-text-muted'
                : 'border-accent-border/40 text-accent bg-accent-dim/30',
            ].join(' ')}
            style={{ minHeight: 32, minWidth: 32 }}
          >
            <span aria-hidden="true">{audio.muted ? 'OFF' : 'ON'}</span>
          </button>

          {/* Accessibility */}
          <button
            type="button"
            onClick={() => setShowA11yPanel(true)}
            aria-label="Accessibility settings"
            className="flex items-center justify-center rounded-interactive border border-border-subtle text-text-muted hover:text-text-primary transition-colors text-ui-xs"
            style={{ minHeight: 32, minWidth: 32 }}
          >
            {'⚙'}
          </button>

          {/* Fullscreen */}
          <FullscreenButton className="flex items-center justify-center text-ui-xs" />

          {/* Pause */}
          <div className="flex items-center justify-center" style={{ minHeight: 32, minWidth: 32 }}>
            <PauseButton />
          </div>

          {/* Ignite — primary action; touch-target sized */}
          <button
            type="button"
            onClick={toggleWithAudio}
            aria-label={isOn ? 'Retract blade' : 'Ignite blade'}
            className={[
              'px-3 rounded-interactive text-ui-xs font-bold uppercase tracking-wider transition-all border',
              isOn
                ? 'bg-red-900/30 border-red-700/50 text-red-400 ignite-btn-on'
                : 'bg-accent-dim border-accent-border text-accent ignite-btn-off',
            ].join(' ')}
            style={{ minHeight: 'var(--touch-target)' }}
          >
            {isOn ? 'Off' : 'On'}
          </button>
        </div>
      </header>

      {/* ── Slide-out Sidebar Drawer ────────────────────────────────── */}
      <MobileSidebarDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          requestAnimationFrame(() => hamburgerRef.current?.focus());
        }}
      />

      {/* ══ STICKY CHROME (top) ══════════════════════════════════════════ */}

      {/* ── 2. Mini Blade Canvas (64px) ────────────────────────────────
          Per HANDOFF §"Q4 BladeCanvas": mini-blade default; long-press
          for Inspect mode (Phase 4.5 deferred). 64px = 1.78px / LED at
          144 LEDs; gestalt + motion remain readable. */}
      <div
        ref={bladeRegionRef}
        className="relative w-full shrink-0 flex items-center justify-center bg-bg-primary border-b border-border-subtle blade-canvas overflow-hidden"
        style={{ height: 'var(--blade-rod-h)', touchAction: 'none' }}
        role="region"
        aria-label="Blade preview"
        data-inspecting={isInspecting || undefined}
        onPointerDown={(e) => {
          if (isInspecting) {
            onBladePointerDownDuringInspect(e);
          } else {
            onBladePointerDown(e);
          }
        }}
        onPointerMove={onBladePointerMove}
        onPointerUp={onBladePointerUp}
        onPointerCancel={onBladePointerUp}
      >
        {/* Inner transform target — Inspect mode applies zoom + pan
            here so the blade visually grows + slides under the
            outer region's overflow:hidden clip. transform-origin
            uses the long-press point so 2.4× / 4× zooms centered on
            the LED the user pointed at. */}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: isInspecting
              ? `translateX(${inspectPanX}px) scale(${inspectZoom})`
              : undefined,
            transformOrigin: isInspecting
              ? `${inspectOriginXFraction * 100}% 50%`
              : undefined,
            transition: 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            willChange: isInspecting ? 'transform' : undefined,
          }}
        >
          <BladeCanvas engineRef={engineRef} vertical={false} compact />
        </div>
        {/* Zoom HUD — only visible during Inspect mode. */}
        {isInspecting && <MobileInspectHUD />}
      </div>

      {/* ── 3. Pixel Strip (36px) ──────────────────────────────────────
          Per-LED color row directly below the mini-blade. Reads the
          same engine pixel buffer as the desktop CanvasLayout. */}
      <div
        className="w-full shrink-0 bg-bg-primary border-b border-border-subtle"
        style={{ height: 'var(--mobile-pixel-strip-h)' }}
        role="region"
        aria-label="Pixel strip"
      >
        <PixelStripPanel engineRef={engineRef} />
      </div>

      {/* ── 4. Action Bar (56px) ───────────────────────────────────────
          5 icon+letter chips: I / C / B / L / S + … overflow.
          Replaces the prior compact 8-chip EffectTriggerBar. */}
      <MobileActionBar
        onToggleIgnite={toggleWithAudio}
        onTriggerEffect={triggerEffectWithAudio}
        onReleaseEffect={releaseEffect}
      />

      {/* ── 5. Section Tabs (32px) ─────────────────────────────────────
          Horizontal scrollable tabs replacing the drawer for shallow
          editing nav. Tab tap swaps the body below. */}
      <MobileSectionTabs />

      {/* ══ SCROLLING BODY ═══════════════════════════════════════════════ */}

      {/* Body — Inspector on home, MainContent on every other section.
          Single scroll region; sticky chrome above + status bar below
          stay anchored. */}
      <div
        id="mobile-section-content"
        className="flex-1 min-h-0 flex flex-col overflow-y-auto"
      >
        {/* The analysis rail (rgb-luma waveform) used to live above the
            body in PR #200's stacked layout. The handoff doesn't include
            it in the sticky shell — it's overhead chrome users only
            occasionally read. We mount it as a scroll-region header so
            it's still reachable but doesn't eat sticky space. */}
        <div
          className="w-full shrink-0 bg-bg-primary border-b border-border-subtle"
          style={{ height: 56 }}
          role="region"
          aria-label="Analysis rail"
        >
          <LayerCanvas
            layerId="rgb-luma"
            pixels={pixelBufRef.current}
            pixelCount={ledCount}
            isPaused={isPaused}
            reducedMotion={reducedMotion}
          />
        </div>

        {isHome ? (
          <Inspector
            className="flex-1 min-h-0 w-full"
            style={{ width: '100%' }}
          />
        ) : (
          <>
            {/* ── Phase 4.3 quick-controls header ───────────────────
                For each editing tab, render the section's color-rail
                (when relevant) + 2-col MiniSlider grid above the deep
                editor panel. Color is the only fully-wired variant
                today; other tabs (style/motion/fx/hardware/routing)
                will get their own QuickControls primitives in the
                follow-up Phase 4.3.x PRs. */}
            {activeSection === 'color' && (
              <>
                <ColorRail />
                <ColorQuickControls />
              </>
            )}
            <MainContent
              className="flex-1 min-h-0"
              style={{ width: '100%' }}
              triggerEffect={triggerEffectWithAudio}
              releaseEffect={releaseEffect}
            />
          </>
        )}
      </div>

      {/* ══ STICKY CHROME (bottom) ═══════════════════════════════════════ */}

      {/* ── 6. Status Bar (36px scrollable) ───────────────────────────
          Per HANDOFF §"Q3": all 11 desktop segments preserved in a
          horizontally scrollable strip with right-edge mask. Pinned
          above the iOS home-indicator gesture area via safe-area
          padding. */}
      <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
        <MobileStatusBarStrip />
      </div>

      {/* Modals + overlays */}
      {showA11yPanel && <AccessibilityPanel onClose={() => setShowA11yPanel(false)} />}
      <FullscreenPreview engineRef={engineRef} onTriggerEffect={triggerEffectWithAudio} />
      {/* ParameterSheetHost — subscribes to parameterSheetStore. Any
          slider's long-press dispatches `open(spec)` to the store; this
          host mounts the ParameterSheet primitive against the active
          spec. Rendered at the shell root so the portal escapes any
          overflow contexts in the body. */}
      <ParameterSheetHost />
    </div>
  );
}
