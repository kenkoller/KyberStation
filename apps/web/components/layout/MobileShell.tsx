'use client';

// ─── MobileShell — Item H mobile overhaul (2026-04-30) ───────────────────────
//
// Vertical-stack mobile shell for <600px viewports. Replaces the legacy
// 4-tab swipe layout (`MergedDesignPanel` + `DesignPanel` + `TabContent`)
// with the same Sidebar + MainContent architecture that desktop and
// tablet use. The Sidebar lives in a slide-out drawer triggered by a
// hamburger button; section content fills the rest of the screen.
//
// Layout (top → bottom):
//   1. Header — hamburger ☰ + title + sound + ignite
//   2. Action bar — IGNITE/RETRACT + 5 effect chips (touch-sized)
//   3. Blade canvas — full-width, ~25vh tall
//   4. Pixel strip — full-width, ~10vh tall
//   5. Inspector (Quick Controls) — full-width, scrollable
//   6. Active-section pill — anchored bottom, indicates current section
//
// Touch targets: every interactive primitive is ≥44×44px per WCAG 2.5.5.
//
// Drawer dismiss-on-section-pick is wired in MobileSidebarDrawer via
// activeSection observation, so the hamburger flow becomes:
//   tap ☰ → drawer opens → tap section → drawer closes + MainContent
//   shows that section. For the home/canvas view, users either tap the
//   "× Canvas" pill (if implemented) or pick "Hardware"/"Color"/etc.
//   to swap the body. The blade canvas + pixel strip + inspector
//   render only on the home view (when `activeSection === 'my-saber'`
//   we still show the canvas above the section content as the
//   primary anchor — see SHOW_CANVAS_FOR_SECTION below).

import { useEffect, useState, useRef, type RefObject } from 'react';
import type { BladeEngine } from '@kyberstation/engine';
import { useUIStore, type SectionId } from '@/stores/uiStore';
import { useBladeStore } from '@/stores/bladeStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { BladeCanvas } from '@/components/editor/BladeCanvas';
import { EffectTriggerBar } from '@/components/editor/EffectTriggerBar';
import { Inspector } from '@/components/editor/Inspector';
import { MainContent } from '@/components/layout/MainContent';
import { PixelStripPanel } from '@/components/editor/PixelStripPanel';
import { LayerCanvas } from '@/components/editor/VisualizationStack';
import { StatusBar } from '@/components/layout/StatusBar';
import { AccessibilityPanel } from '@/components/editor/AccessibilityPanel';
import { FullscreenPreview, FullscreenButton } from '@/components/editor/FullscreenPreview';
import { PauseButton } from '@/components/layout/PauseButton';
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer';
import { playUISound } from '@/lib/uiSounds';

// Sections that render their own self-contained UI in MainContent — the
// blade canvas + pixel strip + Inspector still appear above them as a
// constant anchor so the user never loses the live blade view.
//
// my-saber is the default landing section; "home" mode shows ONLY
// canvas + inspector with no MainContent area, since the Inspector
// already covers the most-common quick-tune flow on mobile.
const HOME_SECTION: SectionId = 'my-saber';

// Compact labels for the in-editor bottom bar's right-side section
// pill. Mirrors the labels Sidebar / MobileSidebarDrawer use so the
// drawer-pick → bottom-bar-display loop is consistent. Kept short
// enough to fit alongside "← Back to Canvas" at 380px viewport.
const SECTION_LABELS: Record<SectionId, string> = {
  'my-saber': 'Saber Profiles',
  'hardware': 'Hardware',
  'blade-style': 'Blade Style',
  'color': 'Color',
  'ignition-retraction': 'Ignition & Retraction',
  'combat-effects': 'Combat Effects',
  'layer-compositor': 'Layers',
  'routing': 'Routing',
  'motion-simulation': 'Motion Sim',
  'gesture-controls': 'Gestures',
  'audio': 'Audio',
  'output': 'Output',
  'my-crystal': 'Saber Card',
};

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
  const setActiveSection = useUIStore((s) => s.setActiveSection);

  // Whether to show the canvas + inspector above MainContent. On the
  // home section (my-saber) we hide the MainContent body entirely and
  // let canvas+inspector own the screen. On other sections, the canvas
  // stays visible as a small constant anchor so users never lose the
  // live blade view while editing color / hardware / etc.
  const isHome = activeSection === HOME_SECTION;

  // Once the drawer is open we want the focus to return to the hamburger
  // when it closes. Track the trigger ref for that.
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  // Pixel buffer for the analysis stack (PixelStripPanel + LayerCanvas).
  // Same Phase pattern WorkbenchLayout uses: getPixels() returns a stable
  // Uint8Array that the engine mutates in place each frame. LayerCanvas
  // reads from it on its own RAF loop.
  const pixelBufRef = useRef<Uint8Array | null>(null);
  useEffect(() => {
    pixelBufRef.current = engineRef.current?.getPixels() ?? null;
  }, [engineRef]);
  const ledCount = useBladeStore((s) => s.config.ledCount);
  const isPaused = useUIStore((s) => s.isPaused);
  const reducedMotion = useAccessibilityStore((s) => s.reducedMotion);

  // Keep the body padding off the global MobileTabBar from layout.tsx —
  // the editor mobile shell uses its own bottom-anchored chrome (the
  // pill nav indicator) so the 56px gutter the bar reserves is wasted
  // space here. We can't unmount it from layout.tsx without affecting
  // /docs and /m, so we add a class to neutralize the global bottom
  // padding for this view only.
  useEffect(() => {
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '0';
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, []);

  // Auto-ignite the blade ~500ms after the engine mounts — same Phase
  // 1.5h pattern WorkbenchLayout uses on desktop. Without this the
  // mobile editor opens with a retracted blade (the engine starts at
  // extendProgress=0 even when bladeStore.isOn is persisted true), so
  // users see a hilt + faint capsule instead of a glowing blade. Reset
  // first to force a clean off→on animation.
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

      {/* ── Mobile Header (h-10 / 40px tall, dense buttons ~30px) ──────
          PR A2 density v2 (per Ken's "header buttons too tall vertically"
          field-test feedback): drops below WCAG 44 floor on individual
          chrome buttons in exchange for a viewport-frugal mobile shell
          that matches DAW + iOS-app density. The Ignite action button
          stays larger (primary) — secondary chrome shrinks. */}
      <header className="flex items-center justify-between px-1.5 h-10 border-b border-border-subtle bg-bg-secondary shrink-0 min-w-0 pt-[env(safe-area-inset-top)]">
        {/* Hamburger menu trigger — visible MENU label for discoverability,
            shrunk to ~30px tall for density. */}
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
          className="min-h-[30px] flex items-center gap-1.5 px-1.5 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light transition-colors rounded-interactive"
        >
          <span aria-hidden="true" className="flex flex-col gap-[2px]">
            <span className="block w-3.5 h-[2px] bg-current" />
            <span className="block w-3.5 h-[2px] bg-current" />
            <span className="block w-3.5 h-[2px] bg-current" />
          </span>
          <span className="text-ui-xs font-medium tracking-wider uppercase">Menu</span>
        </button>

        {/* Title — flex-1 / centered */}
        <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
          <span className="text-white">KYBER</span>
          <span className="text-accent">STATION</span>
        </h1>

        {/* Right cluster — sound, settings, fullscreen, pause, ignite.
            Dense (~30px touch) for the secondary chrome; primary Ignite
            button stays roomier. */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Sound mute */}
          <button
            type="button"
            onClick={audio.toggleMute}
            aria-label={audio.muted ? 'Unmute audio' : 'Mute audio'}
            className={[
              'min-h-[30px] min-w-[30px] flex items-center justify-center rounded-interactive border transition-colors text-[10px]',
              audio.muted
                ? 'border-border-subtle text-text-muted'
                : 'border-accent-border/40 text-accent bg-accent-dim/30',
            ].join(' ')}
          >
            <span aria-hidden="true">{audio.muted ? 'OFF' : 'ON'}</span>
          </button>

          {/* Accessibility */}
          <button
            type="button"
            onClick={() => setShowA11yPanel(true)}
            aria-label="Accessibility settings"
            className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded-interactive border border-border-subtle text-text-muted hover:text-text-primary transition-colors text-ui-xs"
          >
            {'⚙'}
          </button>

          {/* Fullscreen */}
          <FullscreenButton className="min-h-[30px] min-w-[30px] flex items-center justify-center text-ui-xs" />

          {/* Pause — wrapper enforces minimum hit area */}
          <div className="min-h-[30px] min-w-[30px] flex items-center justify-center">
            <PauseButton />
          </div>

          {/* Ignite / Retract — primary action, stays roomier than the
              secondary chrome chips so it visually leads. */}
          <button
            type="button"
            onClick={toggleWithAudio}
            aria-label={isOn ? 'Retract blade' : 'Ignite blade'}
            className={[
              'min-h-[30px] px-2 rounded-interactive text-ui-xs font-bold uppercase tracking-wider transition-all border',
              isOn
                ? 'bg-red-900/30 border-red-700/50 text-red-400 ignite-btn-on'
                : 'bg-accent-dim border-accent-border text-accent ignite-btn-off',
            ].join(' ')}
          >
            {isOn ? 'Off' : 'On'}
          </button>
        </div>
      </header>

      {/* ── Slide-out Sidebar Drawer ─────────────────────────────────── */}
      <MobileSidebarDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          // Return focus to the hamburger after close
          requestAnimationFrame(() => hamburgerRef.current?.focus());
        }}
      />

      {/* ── Main Content Area ────────────────────────────────────────────
          Layout: effect bar + blade canvas are STICKY siblings (shrink-0
          + outside any scroll container). Only the body region (Inspector
          on home, MainContent on drilled) scrolls — so switching sections
          never pushes the blade canvas off-screen. Pre-A1, the entire
          column was `overflow-y-auto` which let tall section content
          scroll the blade out of view, producing the "odd zoom levels"
          UX Ken reported. */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0">

        {/* ── Effect / Action Bar (single row, ~24px tall) ─────────────
            Tightened for mobile (PR A1): wrapper `px-1 py-0.5` keeps
            the chips on a single horizontal row at 375px viewport
            (overflow-x-auto for narrower phones if needed). EffectTriggerBar
            in compact mode strips the kbd letter underneath. */}
        <div className="px-1 py-0.5 shrink-0 border-b border-border-subtle bg-bg-secondary/40 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-fit">
            <EffectTriggerBar onTrigger={triggerEffectWithAudio} compact />
          </div>
        </div>

        {/* ── Blade Canvas — clean preview, ~110px tall ─────────────────
            Per Ken's "blade preview should take less vertical space"
            (PR A2): trimmed from 178px → 110px. Analysis layers that
            used to overlay on top of the canvas now live in their own
            sticky regions BELOW (PixelStripPanel + LayerCanvas), in
            the same order desktop CanvasLayout uses (blade →
            pixel-strip → expanded-analysis). */}
        <div
          className="w-full shrink-0 flex items-center justify-center bg-bg-primary border-b border-border-subtle"
          style={{ height: 'min(15vh, 120px)', minHeight: 96 }}
          role="region"
          aria-label="Blade preview"
        >
          <BladeCanvas engineRef={engineRef} vertical={false} compact />
        </div>

        {/* ── Pixel Strip — per-LED color row, full width ──────────────
            Mirrors desktop CanvasLayout's PixelStripPanel mount; reads
            the same engine pixel buffer. ~36px tall on mobile. */}
        <div
          className="w-full shrink-0 bg-bg-primary border-b border-border-subtle"
          style={{ height: 36 }}
          role="region"
          aria-label="Pixel strip"
        >
          <PixelStripPanel engineRef={engineRef} />
        </div>

        {/* ── Analysis Layer (rgb-luma) — per-LED waveform graph ───────
            Single line-graph layer below the pixel strip, matching
            desktop's ExpandedAnalysisSlot shape (which defaults to
            rgb-luma). ~64px tall on mobile — enough to read the
            waveform without crowding the body area below. */}
        <div
          className="w-full shrink-0 bg-bg-primary border-b border-border-subtle"
          style={{ height: 64 }}
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

        {/* ── Body — Inspector on home, MainContent on drilled.
            Wrapped in `overflow-y-auto` so this region (and only this
            region) scrolls when content exceeds available height. The
            blade canvas + effect bar above stay anchored. */}
        {isHome ? (
          // Home view: Inspector fills the remaining space directly. This
          // is the 80% path — Quick Controls (Surprise Me, color chips,
          // ignition picker, retraction picker, parameter bank) — and the
          // user navigates to deep tuning via the hamburger drawer.
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            <Inspector
              className="flex-1 min-h-0 w-full"
              style={{ width: '100%' }}
            />
          </div>
        ) : (
          // Drilled-into-section view: MainContent renders the section's
          // panel below the canvas anchor. The sidebar drawer is the
          // only way to navigate, and tapping the active-section pill
          // returns to home.
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            <MainContent
              className="flex-1 min-h-0"
              style={{ width: '100%' }}
              triggerEffect={triggerEffectWithAudio}
              releaseEffect={releaseEffect}
            />
          </div>
        )}
      </div>

      {/* ── Bottom-anchored chrome ──────────────────────────────────── */}
      {/* When in a drilled section, show the combined in-editor bottom
          bar — "← Back to Canvas" on the left, "◆ <section>" pill on
          the right (per docs/mobile-design.md §2.2). The whole bar's
          height + safe-area clearance come from the mobile tokens
          installed in PR #1. When on home, fall back to the StatusBar
          slim readout — "Back to Canvas" is meaningless when canvas
          IS the current view. */}
      {!isHome ? (
        <div
          className="shrink-0 flex items-center justify-between gap-1 border-t border-border-subtle bg-bg-deep px-1 pb-[var(--mobile-safe-pb)]"
          style={{ minHeight: 36 }}
          role="region"
          aria-label="Editor navigation"
        >
          <button
            type="button"
            onClick={() => {
              playUISound('tab-switch');
              setActiveSection(HOME_SECTION);
            }}
            aria-label="Return to canvas home view"
            className="flex items-center gap-1 min-h-[30px] px-1.5 text-accent text-ui-xs font-medium tracking-wider uppercase rounded-interactive transition-colors hover:bg-bg-secondary/40"
          >
            <span aria-hidden="true">{'←'}</span>
            <span>Back</span>
          </button>

          <span
            className="flex-1 flex items-center justify-center gap-1.5 px-1 min-h-[30px] text-text-secondary text-ui-xs font-medium tracking-wider uppercase truncate"
            aria-live="polite"
          >
            <span aria-hidden="true" className="text-accent">{'◆'}</span>
            <span className="truncate">{SECTION_LABELS[activeSection]}</span>
          </span>

          {/* Bottom-bar hamburger — second access point for the section
              drawer so users don't have to scroll back to the header
              after editing a long section. */}
          <button
            type="button"
            onClick={() => {
              playUISound('tab-switch');
              setDrawerOpen(true);
            }}
            aria-label="Open editor sections menu"
            aria-haspopup="dialog"
            className="flex items-center gap-1.5 min-h-[30px] px-1.5 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-light transition-colors rounded-interactive"
          >
            <span aria-hidden="true" className="flex flex-col gap-[2px]">
              <span className="block w-3.5 h-[2px] bg-current" />
              <span className="block w-3.5 h-[2px] bg-current" />
              <span className="block w-3.5 h-[2px] bg-current" />
            </span>
            <span className="text-ui-xs font-medium tracking-wider uppercase">Menu</span>
          </button>
        </div>
      ) : (
        <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
          <StatusBar />
        </div>
      )}

      {/* Accessibility Settings Modal */}
      {showA11yPanel && <AccessibilityPanel onClose={() => setShowA11yPanel(false)} />}

      {/* Fullscreen preview overlay */}
      <FullscreenPreview engineRef={engineRef} onTriggerEffect={triggerEffectWithAudio} />
    </div>
  );
}
