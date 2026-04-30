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
    <div className="h-[100dvh] flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">

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
        className="w-full shrink-0 flex items-center justify-center bg-bg-primary border-b border-border-subtle"
        style={{ height: 'var(--blade-rod-h)' }}
        role="region"
        aria-label="Blade preview"
      >
        <BladeCanvas engineRef={engineRef} vertical={false} compact />
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
