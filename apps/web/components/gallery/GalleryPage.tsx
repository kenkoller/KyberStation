'use client';

// ─── GalleryPage — Phase 4 A/B (2026-04-29) ─────────────────────────────────
//
// Full-screen Gallery page (route: /gallery). Now mounts `GalleryAB` —
// the Sidebar A/B v2 Phase 4 layout — as its body. Column A hosts the
// filter rail + scrollable preset list; Column B renders the selected
// preset's hero detail (large blade preview, metadata, Load + share).
//
// The page itself remains a thin shell: top-level nav header at the
// top, GalleryAB body in the middle, footer chrome (ShiftLightRail,
// AppPerfStrip, DataTicker) at the bottom — same as /editor for visual
// continuity when users flip between modes.
//
// Pre-A/B history: this file used to host its own filter bar + portrait
// card grid. Both moved into GalleryAB / GalleryColumnA / GalleryColumnB
// to land on the same list-→-detail pattern as combat-effects, audio,
// my-saber, and routing.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShiftLightRail } from '@/components/layout/ShiftLightRail';
import { AppPerfStrip } from '@/components/layout/AppPerfStrip';
import { DataTicker } from '@/components/hud/DataTicker';
import { useUIStore, type ActiveTab } from '@/stores/uiStore';
import { playUISound } from '@/lib/uiSounds';
import { GalleryAB } from './GalleryAB';

export function GalleryPage() {
  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden">
      <GalleryHeader />

      {/* GalleryAB owns its own filter rail (Column A header) + body
          split. The min-h-0 on this row is what lets the inner overflow
          scroll regions actually scroll. */}
      <div className="flex-1 min-h-0 flex">
        <GalleryAB />
      </div>

      {/* Footer chrome — same as /editor for visual continuity. */}
      <ShiftLightRail engineRef={{ current: null }} />
      <AppPerfStrip />
      <div
        className="shrink-0 border-t border-border-subtle bg-bg-deep/60 overflow-hidden"
        style={{ height: 12 }}
        aria-hidden="true"
      >
        <DataTicker
          data={GALLERY_TICKER_MESSAGES}
          speed={60}
          className="h-full flex items-center pointer-events-none"
        />
      </div>
    </div>
  );
}

/** Short message pool for the Gallery ticker — same vibe as the
 *  editor's ticker, subset of the messages to match Gallery context. */
const GALLERY_TICKER_MESSAGES = [
  'SYSTEMS NOMINAL',
  'PRESET LIBRARY READY',
  'KYBER ALIGNED',
  'STYLE ENGINE READY',
  'SMOOTHSWING V2',
  'FETT263 COMPAT',
  'FONT LIBRARY LOADED',
  'NEOPIXEL GAMMA LOCKED',
  'BLADE CALIBRATED',
  'PROFFIE OS 7.x',
];

// ─── Header ─────────────────────────────────────────────────────────────────

// Shared styling for the 4 top-level nav links. Kept in sync with the
// equivalent helper in `WorkbenchLayout.tsx` so the two headers read as
// the same bar at the app level.
function headerNavLinkClass(active: boolean): string {
  return [
    'px-3 py-1 rounded font-mono uppercase text-ui-xs tracking-[0.1em] border transition-colors',
    active
      ? 'text-accent bg-accent-dim/30 border-accent-border/60'
      : 'text-text-muted hover:text-text-primary border-transparent hover:border-border-subtle',
  ].join(' ');
}

function GalleryHeader() {
  const router = useRouter();
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  // Helper for the Design / Audio / Output entries: set the target tab
  // in the ui store, then route-push to /editor so the editor mounts
  // with the correct active tab. `playUISound` mirrors the click
  // feedback in WorkbenchLayout's header nav.
  const goEditor = (tab: ActiveTab) => () => {
    playUISound('tab-switch');
    setActiveTab(tab);
    router.push('/editor');
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-bg-secondary/60 border-b border-border-subtle shrink-0">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-orbitron uppercase text-text-primary tracking-[0.18em] text-ui-base">
          KYBER<span className="text-accent">STATION</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Top-level navigation">
          <button type="button" onClick={goEditor('design')} className={headerNavLinkClass(false)}>
            Design
          </button>
          <Link
            href="/gallery"
            className={headerNavLinkClass(true)}
            aria-current="page"
          >
            Gallery
          </Link>
        </nav>
      </div>
      <div className="font-mono uppercase text-ui-xs text-text-muted tracking-[0.12em]">
        Preset Library
      </div>
    </header>
  );
}

