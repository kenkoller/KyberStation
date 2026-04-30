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
import { BladeCanvas } from '@/components/editor/BladeCanvas';
import { EffectTriggerBar } from '@/components/editor/EffectTriggerBar';
import { Inspector } from '@/components/editor/Inspector';
import { MainContent } from '@/components/layout/MainContent';
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

  return (
    <div className="h-[100dvh] flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">

      {/* ── Mobile Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-2 h-14 border-b border-border-subtle bg-bg-secondary shrink-0 min-w-0 pt-[env(safe-area-inset-top)]">
        {/* Hamburger menu trigger — 44x44 minimum */}
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
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors rounded-interactive"
        >
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
          </span>
        </button>

        {/* Title — flex-1 / centered */}
        <h1 className="font-cinematic text-ui-sm font-bold tracking-[0.15em] select-none">
          <span className="text-white">KYBER</span>
          <span className="text-accent">STATION</span>
        </h1>

        {/* Right cluster — sound, settings, fullscreen, pause, ignite */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Sound mute */}
          <button
            type="button"
            onClick={audio.toggleMute}
            aria-label={audio.muted ? 'Unmute audio' : 'Mute audio'}
            className={[
              'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-interactive border transition-colors text-ui-xs',
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
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-interactive border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
          >
            {'⚙'}
          </button>

          {/* Fullscreen */}
          <FullscreenButton className="min-h-[44px] min-w-[44px] flex items-center justify-center" />

          {/* Pause — wrapper enforces touch-target floor */}
          <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <PauseButton />
          </div>

          {/* Ignite / Retract — primary action */}
          <button
            type="button"
            onClick={toggleWithAudio}
            aria-label={isOn ? 'Retract blade' : 'Ignite blade'}
            className={[
              'min-h-[44px] px-3 rounded-interactive text-ui-xs font-bold uppercase tracking-wider transition-all border',
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

      {/* ── Main Content Area — single scrolling column ──────────────── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">

        {/* ── Effect / Action Bar (touch-sized) ──────────────────────── */}
        <div className="px-2 py-2 shrink-0 border-b border-border-subtle bg-bg-secondary/40 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-fit">
            <EffectTriggerBar onTrigger={triggerEffectWithAudio} />
          </div>
        </div>

        {/* ── Blade Canvas — always visible, ~25vh ───────────────────── */}
        <div
          className="w-full shrink-0 flex items-center justify-center bg-bg-primary border-b border-border-subtle"
          style={{ height: 'min(28vh, 220px)', minHeight: 180 }}
          role="region"
          aria-label="Blade preview"
        >
          <BladeCanvas engineRef={engineRef} vertical={false} compact />
        </div>

        {/* ── Body — Inspector on home, MainContent + Inspector elsewhere */}
        {isHome ? (
          // Home view: Inspector fills the remaining space directly. This
          // is the 80% path — Quick Controls (Surprise Me, color chips,
          // ignition picker, retraction picker, parameter bank) — and the
          // user navigates to deep tuning via the hamburger drawer.
          <div className="flex-1 min-h-0 flex flex-col">
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
          <div className="flex-1 min-h-0 flex flex-col">
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
          className="shrink-0 flex items-center justify-between gap-2 border-t border-border-subtle bg-bg-deep px-2 pb-[var(--mobile-safe-pb)]"
          style={{ minHeight: 'var(--mobile-bottom-bar-h)' }}
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
            className="flex items-center gap-1 min-h-[44px] px-2 text-accent text-ui-xs font-medium tracking-wider uppercase rounded-interactive transition-colors hover:bg-bg-secondary/40"
          >
            <span aria-hidden="true">{'←'}</span>
            <span>Back to Canvas</span>
          </button>

          <span
            className="flex items-center gap-1.5 px-2 min-h-[44px] text-text-secondary text-ui-xs font-medium tracking-wider uppercase"
            aria-live="polite"
          >
            <span aria-hidden="true" className="text-accent">{'◆'}</span>
            <span>{SECTION_LABELS[activeSection]}</span>
          </span>
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
