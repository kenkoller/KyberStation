'use client';

// ─── GalleryPage — W7 (2026-04-22) ──────────────────────────────────────────
//
// Full-screen Gallery page (route: /gallery). Replaces the legacy
// "GALLERY" tab inside the editor; 2026-04-22 post-W7 the editor's
// internal tab bar was retired entirely and the four tabs — Gallery /
// Design / Audio / Output — were promoted up to a single top-level
// header nav. This page reproduces that same 4-link nav so navigating
// from Gallery to any editor mode is one click.
//
// Layout:
//   - Header (70px) — KyberStation logo + 4-link top-level nav
//     (Gallery / Design / Audio / Output). Non-Gallery links call
//     `useUIStore.setActiveTab` + `router.push('/editor')`.
//   - Body — scrollable grid of thin-row blade cards. Each row is
//     roughly 32px tall, spans the full container width, and shows
//     the preset's baseColor across the strip with the name overlaid
//     on the left (drop shadow). Hover a row and a popover appears
//     above it with a larger vertical preview + era / affiliation
//     metadata. Non-hovered rows stay static.

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_PRESETS } from '@kyberstation/presets';
import type { Preset } from '@kyberstation/presets';
import { useBladeStore } from '@/stores/bladeStore';
import { useRouter } from 'next/navigation';
import type { BladeConfig } from '@kyberstation/engine';
import { MiniSaber } from '@/components/shared/MiniSaber';
import { ShiftLightRail } from '@/components/layout/ShiftLightRail';
import { AppPerfStrip } from '@/components/layout/AppPerfStrip';
import { DataTicker } from '@/components/hud/DataTicker';
import {
  classifyColorFamily,
  classifyStyleFamily,
  type ColorFamily,
  type StyleFamily,
} from '@/lib/galleryFilters';
import { useUIStore, type ActiveTab } from '@/stores/uiStore';
import { playUISound } from '@/lib/uiSounds';

// ─── Filter state ───────────────────────────────────────────────────────────

type EraFilter = Preset['era'] | 'all';
type FactionFilter = Preset['affiliation'] | 'all';
type ColorFilter = ColorFamily | 'all';
type StyleFilter = StyleFamily | 'all';

export function GalleryPage() {
  const [era, setEra] = useState<EraFilter>('all');
  const [faction, setFaction] = useState<FactionFilter>('all');
  const [colorFamily, setColorFamily] = useState<ColorFilter>('all');
  const [styleFamily, setStyleFamily] = useState<StyleFilter>('all');
  const [search, setSearch] = useState('');
  // Shuffle — each click rotates a seed so the sort reshuffles.
  // Independent of filters, so shuffling with filters applied is fine.
  const [shuffleSeed, setShuffleSeed] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const base = ALL_PRESETS.filter((p) => {
      if (era !== 'all' && p.era !== era) return false;
      if (faction !== 'all' && p.affiliation !== faction) return false;
      if (
        colorFamily !== 'all' &&
        classifyColorFamily(p.config.baseColor) !== colorFamily
      ) {
        return false;
      }
      if (
        styleFamily !== 'all' &&
        classifyStyleFamily(p.config.style) !== styleFamily
      ) {
        return false;
      }
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())
        && !p.character.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (shuffleSeed === null) return base;
    // Fisher–Yates with a seeded LCG so the current seed produces the
    // same order across re-renders until the user clicks Shuffle again.
    const out = [...base];
    let seed = shuffleSeed;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }, [era, faction, colorFamily, styleFamily, search, shuffleSeed]);

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden">
      <GalleryHeader />

      <div className="px-6 py-3 border-b border-border-subtle bg-bg-deep/40 shrink-0 flex items-center gap-3 flex-wrap">
        <FilterGroup label="Era" value={era} options={[
          { id: 'all', label: 'All' },
          { id: 'prequel', label: 'Prequel' },
          { id: 'original-trilogy', label: 'OT' },
          { id: 'sequel', label: 'Sequel' },
          { id: 'animated', label: 'Animated' },
          { id: 'expanded-universe', label: 'EU' },
        ]} onChange={(v) => setEra(v as EraFilter)} />

        <span className="w-px h-5 bg-border-subtle" aria-hidden="true" />

        <FilterGroup label="Faction" value={faction} options={[
          { id: 'all', label: 'All' },
          { id: 'jedi', label: 'Jedi' },
          { id: 'sith', label: 'Sith' },
          { id: 'neutral', label: 'Grey' },
          { id: 'other', label: 'Other' },
        ]} onChange={(v) => setFaction(v as FactionFilter)} />

        <span className="w-px h-5 bg-border-subtle" aria-hidden="true" />

        <FilterGroup label="Color" value={colorFamily} options={[
          { id: 'all', label: 'All' },
          { id: 'blue', label: 'Blue' },
          { id: 'green', label: 'Green' },
          { id: 'red', label: 'Red' },
          { id: 'purple', label: 'Purple' },
          { id: 'yellow', label: 'Yellow' },
          { id: 'white', label: 'White' },
          { id: 'other', label: 'Other' },
        ]} onChange={(v) => setColorFamily(v as ColorFilter)} />

        <span className="w-px h-5 bg-border-subtle" aria-hidden="true" />

        <FilterGroup label="Style" value={styleFamily} options={[
          { id: 'all', label: 'All' },
          { id: 'steady', label: 'Steady' },
          { id: 'animated', label: 'Animated' },
          { id: 'particle', label: 'Particle' },
          { id: 'color', label: 'Color' },
          { id: 'hand-painted', label: 'Hand-painted' },
          { id: 'kinetic', label: 'Kinetic' },
        ]} onChange={(v) => setStyleFamily(v as StyleFilter)} />

        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShuffleSeed(Date.now())}
            className={`px-3 py-1 rounded text-ui-xs font-mono uppercase tracking-[0.08em] border transition-colors inline-flex items-center gap-1.5 ${
              shuffleSeed !== null
                ? 'border-accent-border text-accent bg-accent-dim/30'
                : 'border-border-subtle text-text-muted hover:text-text-primary hover:border-border-light'
            }`}
            title={shuffleSeed !== null ? 'Re-shuffle (click again for a new order)' : 'Shuffle presets'}
            aria-pressed={shuffleSeed !== null}
          >
            <span aria-hidden="true">⇅</span>
            Shuffle
          </button>
          {shuffleSeed !== null && (
            <button
              type="button"
              onClick={() => setShuffleSeed(null)}
              className="px-2 py-1 rounded text-ui-xs font-mono uppercase text-text-muted hover:text-text-primary border border-border-subtle hover:border-border-light transition-colors"
              title="Restore default order"
            >
              Reset
            </button>
          )}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presets…"
            className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-ui-xs font-mono w-56 placeholder:text-text-muted/60 focus:border-accent-border outline-none"
          />
          <span className="text-ui-xs font-mono text-text-muted tabular-nums">
            {filtered.length} / {ALL_PRESETS.length}
          </span>
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* W13 (2026-04-22): reverted to portrait cards matching the
            SaberMarqueeArray pattern on the landing page. Each card
            is ~200px wide × ~416px tall with a vertical MiniSaber
            standing tall inside it.

            W13b (2026-04-22): switched from CSS-grid + justify-items-
            center to flex-wrap + justify-center. The grid version made
            every cell equal-width and then centered the 200px card
            inside, so on wide monitors the visual gap between adjacent
            cards ballooned far past the 12px `gap-3` value. With
            flex-wrap, cards stay exactly 200px and the gap between
            them is the literal `gap-3` value (12px) in BOTH axes —
            consistent vertical and horizontal spacing. The row is
            centered as a whole so left/right margins stay balanced as
            the window resizes; the column count adjusts dynamically. */}
        <div className="flex flex-wrap justify-center gap-3 p-4">
          {filtered.map((preset) => (
            <GalleryCard key={preset.id} preset={preset} />
          ))}
        </div>
      </div>

      {/* W12 fix (2026-04-22): Gallery now keeps the editor's
          footer chrome — ShiftLightRail (blade RMS), AppPerfStrip
          (consolidated status + perf + GFX toggle), and the ambient
          DataTicker. Gives the page the same shell as /editor so
          users can flip between modes without losing their
          bearings. */}
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
          <button type="button" onClick={goEditor('audio')} className={headerNavLinkClass(false)}>
            Audio
          </button>
          <button type="button" onClick={goEditor('output')} className={headerNavLinkClass(false)}>
            Output
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

// ─── Filter pill group ──────────────────────────────────────────────────────

interface FilterOption {
  id: string;
  label: string;
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <span className="font-mono uppercase text-ui-xs text-text-muted tracking-[0.1em] mr-1">
        {label}
      </span>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={`px-2 py-1 rounded text-ui-xs font-mono uppercase tracking-[0.08em] border transition-colors ${
              active
                ? 'border-accent-border text-accent bg-accent-dim/30'
                : 'border-border-subtle text-text-muted hover:text-text-primary hover:border-border-light'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Single gallery card ────────────────────────────────────────────────────
//
// W13 (2026-04-22): reverted to the portrait-card shape used by the
// landing page's SaberMarqueeArray. Each card is ~200px wide × ~416px
// tall and contains:
//   - A radial accent glow backer (base-color, blurred)
//   - A vertical MiniSaber (canonical hilt at bottom, blade rising)
//   - Preset name + character subtitle below the saber
//
// Lazy-mount via IntersectionObserver so only in-viewport cards
// actually instantiate a BladeEngine. Static until hovered — on
// hover the specific saber's engine ticks at 30fps so motion-
// reactive styles come to life; non-hovered cards stay frozen.
//
// Card click loads the preset into bladeStore then routes to /editor.
// This matches the existing behavior of SaberMarqueeArray's link
// variant, but here we do a router.push instead of a Link so we can
// load the config into the store before the navigation.

const CARD_WIDTH = 200;
// W13e (2026-04-22): card height bumped 400 → 416 so the subtitle
// row has ~20px of breathing room above the bottom border, matching
// the 20px between the card top and the saber's blade tip. Result is
// a vertically symmetric card with consistent margins on both ends.
const CARD_HEIGHT = 416;

// W13c (2026-04-22): split the card into two fixed-height regions so
// the saber's vertical position is identical across every card,
// regardless of whether the card has a subtitle. SABER_REGION_HEIGHT
// = 332px MiniSaber (bladeLength 260 + hiltLength 72) + 20px top
// breathing room. TEXT_REGION_HEIGHT eats the remainder. Within the
// text region the title is top-anchored, so it lands at the same Y
// in both single-line and two-line variants; the subtitle (when
// present) slides in below without pushing anything.
const SABER_REGION_HEIGHT = 352;
const TEXT_REGION_HEIGHT = CARD_HEIGHT - SABER_REGION_HEIGHT; // 64

/** Extract a subtitle from any parenthetical content in a preset's
 *  display name. Follows the W13b card-label rules:
 *
 *    "Obi-Wan Kenobi"                   → { title: "Obi-Wan Kenobi", subtitle: null }
 *    "Obi-Wan Kenobi (Episode III)"     → { title: "Obi-Wan Kenobi", subtitle: "Episode III" }
 *    "Starkiller (TFU) (Sith)"          → { title: "Starkiller",     subtitle: "TFU — Sith" }
 *
 *  Multiple parenthetical chunks are joined with an em-dash on a
 *  single line (instead of stacking two subtitle rows) so card height
 *  stays consistent across the grid and the 200px width doesn't force
 *  tight line-breaks. No parens → no subtitle row at all (the
 *  outermost card height is fixed at CARD_HEIGHT so missing subtitle
 *  just leaves a bit of breathing room below the title). */
function splitNameSubtitle(name: string): { title: string; subtitle: string | null } {
  const matches = [...name.matchAll(/\(([^)]+)\)/g)];
  if (matches.length === 0) {
    return { title: name, subtitle: null };
  }
  const subtitle = matches.map((m) => m[1].trim()).join(' — ');
  const title = name.replace(/\s*\([^)]+\)/g, '').trim();
  return { title, subtitle };
}

function GalleryCard({ preset }: { preset: Preset }) {
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const loadPreset = useBladeStore((s) => s.loadPreset);

  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const intersecting = entry.isIntersecting;
          setInView(intersecting);
          if (intersecting) setMounted(true);
        }
      },
      { rootMargin: '200px 200px 200px 200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { r, g, b } = preset.config.baseColor;
  const accentCss = `rgb(${r},${g},${b})`;
  const { title, subtitle } = splitNameSubtitle(preset.name);

  const onClick = () => {
    loadPreset(preset.config as BladeConfig);
    router.push('/editor');
  };

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      aria-label={`Load preset: ${preset.name} (${preset.character})`}
      title={preset.description ?? preset.character}
      // W13f (2026-04-22): card background unified with the filter bar
      // — both now use bg-bg-deep/40 so the card chrome reads as part
      // of the same dark surface. Default border uses var(--border-
      // subtle) directly (same token the filter pills use); the
      // previous `rgb(var(--border-subtle))` inline value was double-
      // wrapping an already-complete rgba color and rendering as
      // invalid CSS. Hover still morphs the border to the saber's
      // base color.
      className="relative shrink-0 flex flex-col rounded-lg border bg-bg-deep/40 backdrop-blur-sm overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent text-left cursor-pointer"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderColor: isHovered ? `rgba(${r},${g},${b},0.85)` : 'var(--border-subtle)',
        transition:
          'border-color 800ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 800ms cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isHovered
          ? `inset 0 0 0 1px rgba(${r},${g},${b},0.6), 0 0 48px 2px rgba(${r},${g},${b},0.42)`
          : 'none',
      }}
    >
      {/* Radial base-color glow backer — subtle when idle, intensifies
          on hover. Pure decoration, no interactive content. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 35% 70% at center, ${accentCss} 0%, transparent 65%)`,
          opacity: isHovered ? 0.22 : 0.1,
          filter: 'blur(24px)',
          transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* W13c: fixed-height saber region. `items-end` anchors the
          saber's hilt to the bottom of this region so the hilt-line
          is at the same Y on every card. `pt-5` reserves 20px top
          breathing room (SABER_REGION_HEIGHT accounts for it). */}
      <div
        className="relative shrink-0 flex items-end justify-center w-full pt-5"
        style={{ height: SABER_REGION_HEIGHT }}
      >
        {mounted ? (
          <MiniSaber
            config={preset.config as BladeConfig}
            hiltId="graflex"
            orientation="vertical"
            bladeLength={260}
            bladeThickness={5}
            hiltLength={72}
            controlledIgnited={true}
            // Static until hover — inView alone is NOT enough to animate
            // (unlike the landing marquee where everything animates
            // passively). Hover-only keeps 200+ cards affordable even
            // when the grid is fully in view.
            animated={isHovered}
            fps={30}
          />
        ) : (
          <GalleryCardPlaceholder accentCss={accentCss} />
        )}
        {/* Mark the non-hovered in-view branch as intentionally used so
            the IO subscription isn't dead-code eliminated. `inView`
            drives the mount decision above; this ensures TS also sees
            it read. */}
        {inView && null}
      </div>

      {/* W13c: fixed-height text region. Title is top-anchored within
          the region (pt-3) so its Y position is identical whether or
          not the card has a subtitle. The optional subtitle slides in
          below via natural flow without pushing the title or saber.
          W13d (2026-04-22): bumped pt-2 → pt-3 for a little more
          breathing room between the saber's hilt and the title. */}
      <div
        className="relative shrink-0 text-center px-3 pt-3"
        style={{ height: TEXT_REGION_HEIGHT }}
      >
        <div className="font-cinematic text-ui-sm font-bold tracking-[0.06em] text-text-primary truncate">
          {title.toUpperCase()}
        </div>
        {subtitle && (
          <div className="text-ui-xs text-text-muted font-mono mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </button>
  );
}

/** Minimal placeholder shown before IntersectionObserver fires —
 *  a thin vertical stripe in the preset's base color. Replaced by
 *  the real MiniSaber as soon as the card scrolls into view. */
function GalleryCardPlaceholder({ accentCss }: { accentCss: string }) {
  return (
    <div
      aria-hidden="true"
      className="w-[5px] rounded-sm"
      style={{
        height: 260,
        background: `linear-gradient(to top, ${accentCss} 0%, rgba(255,255,255,0.9) 100%)`,
        boxShadow: `0 0 20px ${accentCss}`,
      }}
    />
  );
}
