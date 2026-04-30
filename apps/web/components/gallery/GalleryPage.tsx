'use client';

// ─── GalleryPage — Phase 4 A/B + Grid View toggle (2026-04-29) ──────────────
//
// Full-screen Gallery page (route: /gallery). Default view is now the
// large card grid (`GalleryGridView`) showing all ~305 presets. Users
// can toggle to the legacy A/B sidebar layout (`GalleryAB`) via the
// `[ Grid | List ]` switch in the header. Their last selection persists
// across sessions via `uiStore.galleryView`.
//
// The page itself remains a thin shell: top-level nav header at the top
// (with Grid/List toggle), the active gallery view in the middle, footer
// chrome at the bottom — same as /editor for visual continuity.
//
// Pre-A/B history: this file used to host its own filter bar + portrait
// card grid. The intermediate Phase 4 A/B layout still ships as the
// "List" view; the new grid view replaces it as default.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShiftLightRail } from '@/components/layout/ShiftLightRail';
import { AppPerfStrip } from '@/components/layout/AppPerfStrip';
import { DataTicker } from '@/components/hud/DataTicker';
import { useUIStore, type ActiveTab, type GalleryView } from '@/stores/uiStore';
import { playUISound } from '@/lib/uiSounds';
import { GalleryAB } from './GalleryAB';
import { GalleryGridView } from './GalleryGridView';

export function GalleryPage() {
  const galleryView = useUIStore((s) => s.galleryView);

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden">
      <GalleryHeader />

      {/* Active gallery view body. Both views own their own filter chrome
          + inner scroll regions. The min-h-0 here is what lets nested
          overflow scroll regions actually scroll. */}
      <div className="flex-1 min-h-0 flex">
        {galleryView === 'grid' ? <GalleryGridView /> : <GalleryAB />}
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
  const galleryView = useUIStore((s) => s.galleryView);
  const setGalleryView = useUIStore((s) => s.setGalleryView);

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
      <div className="flex items-center gap-4">
        <GalleryViewToggle current={galleryView} onChange={setGalleryView} />
        <div className="font-mono uppercase text-ui-xs text-text-muted tracking-[0.12em]">
          Preset Library
        </div>
      </div>
    </header>
  );
}

// ─── View toggle [ Grid | List ] ────────────────────────────────────────────
//
// Two-state segmented control, persisted via uiStore.galleryView.
// Defaults to 'grid' for new users; stays sticky once changed.

function GalleryViewToggle({
  current,
  onChange,
}: {
  current: GalleryView;
  onChange: (v: GalleryView) => void;
}): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Gallery view"
      className="inline-flex items-center rounded border border-border-subtle bg-bg-deep/40 p-0.5"
      data-testid="gallery-view-toggle"
    >
      <ToggleButton
        active={current === 'grid'}
        onClick={() => onChange('grid')}
        label="Grid"
        testId="gallery-view-toggle-grid"
        title="Show all presets as a card grid (default)"
      />
      <ToggleButton
        active={current === 'list'}
        onClick={() => onChange('list')}
        label="List"
        testId="gallery-view-toggle-list"
        title="Show presets as a list with hero detail panel"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  testId,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  testId: string;
  title: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      data-testid={testId}
      className={[
        'px-2.5 py-1 rounded text-ui-xs font-mono uppercase tracking-[0.08em]',
        'transition-colors',
        active
          ? 'text-accent bg-accent-dim/40'
          : 'text-text-muted hover:text-text-primary',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

