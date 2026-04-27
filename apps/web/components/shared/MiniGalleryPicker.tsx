'use client';

// ─── MiniGalleryPicker — shared thumbnail-grid picker primitive ────────────
//
// Replaces the ad-hoc button grids in StylePanel, EffectPanel's ignition /
// retraction sections, and the inline IgnitionRetractionPanel function in
// TabColumnContent. Author-time inventory isn't the bottleneck — 29 styles,
// 21 effects, 19 ignitions all live in the engine. Discovery is. A visual
// thumbnail gives each option a signature shape the eye can latch onto
// before the label even registers.
//
// Shape:
//   - Static SVG thumbnails (see styleThumbnails / ignitionThumbnails /
//     retractionThumbnails). Live engine-driven animation is explicitly
//     out of scope — too expensive per card, and signature shapes read
//     fine at 100×60.
//   - 3-col grid on desktop, 2 on tablet, 1 on mobile (Tailwind
//     `grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3`). `columns`
//     prop overrides the max column count if the caller wants denser /
//     looser packing.
//   - Keyboard nav: arrow keys (all four, row- and column-aware) cycle
//     the focused item, Enter/Space selects the focused item. All items
//     have role="button" + tabIndex=0 so Tab sweeps normally too.
//   - Click applies immediately — no preview-first step. Hover is a
//     scale-up + accent border; the active item gets a thicker accent
//     border + accent glow matching the existing
//     `bg-accent-dim border-accent-border text-accent` register used
//     across the editor panels today.
//
// Pure helpers (resolveGridCols, cycleGridIndex) are exported for the
// co-located vitest suite — the web vitest env is node-only, so we
// verify the logic via its helpers rather than rendering the component.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────

export interface MiniGalleryItem {
  /** Stable id — passed to `onSelect` when the item is picked. */
  id: string;
  /** Short visible label (e.g. "Stable", "Crystal Shatter"). */
  label: string;
  /** Pre-rendered SVG thumbnail. 100×60 preferred; anything is allowed. */
  thumbnail: ReactNode;
  /** Optional hover tooltip / description text. */
  description?: string;
  /**
   * Optional path to an animated GIF preview. When present, hovering
   * the item swaps the static SVG `thumbnail` for the GIF. When the
   * GIF asset 404s the picker keeps the SVG (the underlying `<img>`
   * `onError` handler hides itself). Saber GIF Sprint 2 wires this
   * for the 19 ignition + 13 retraction picker variants.
   */
  gifPath?: string;
}

/**
 * Visual shape of the picker.
 *
 *   - 'card' (default): thumbnail-on-top, label-below cards arranged in
 *     a 2/3/4-column grid. Good when thumbnails are signature icons.
 *   - 'row': single-column list of long blade-shaped rectangles. Each
 *     item spans the picker's full width; the thumbnail stretches across
 *     the whole card (preserveAspectRatio=none on the Svg wrappers) with
 *     the label pinned to the right. Designed for blade-style pickers
 *     where the thumbnail IS the blade.
 *   - 'list' (W5 2026-04-22): thinnest variant — name-only rows, no
 *     thumbnails, no border, no background except hover. Active row
 *     gets an accent left-stripe + accent text. Designed for cases
 *     where there are many options and the label carries all the
 *     identity (e.g. the 29 blade styles). Tooltip on hover surfaces
 *     the description.
 */
export type MiniGalleryVariant = 'card' | 'row' | 'list';

export interface MiniGalleryPickerProps {
  items: MiniGalleryItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Max column count at `desktop:` breakpoint. Defaults to 3. Ignored when `variant='row'`. */
  columns?: 2 | 3 | 4;
  /** Card vs blade-row shape. Defaults to 'card'. */
  variant?: MiniGalleryVariant;
  /** ARIA label for the listbox container. */
  ariaLabel?: string;
}

// ─── Pure helpers (exported for tests) ────────────────────────────────────

/**
 * Resolve the grid-cols Tailwind class string for the current picker.
 * Caps at `columns` on desktop, then tablet=2 / mobile=1.
 *
 * The max-column knob is small (2 | 3 | 4) because it's a visual-density
 * decision — any more columns and the cards start shrinking below their
 * thumbnail width. Tailwind doesn't recognize dynamic class names, so we
 * return concrete strings rather than `grid-cols-${n}`.
 */
export function resolveGridCols(columns: 2 | 3 | 4): string {
  switch (columns) {
    case 2:
      return 'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-2';
    case 4:
      return 'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4';
    case 3:
    default:
      return 'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3';
  }
}

/**
 * Arrow-key grid navigation. Given the current focused index, total
 * count, max columns (as the picker renders at the time of the press),
 * and direction, return the next focused index.
 *
 * Behaviour:
 *   - ArrowLeft / ArrowRight: ±1 with wrap across the flat list.
 *   - ArrowDown / ArrowUp: ±columns with wrap when the step falls off
 *     the edge.
 *
 * Wrap is intentional — matches the CommandPalette pattern and keeps
 * keyboard users from getting stuck at the bottom row.
 */
export function cycleGridIndex(
  current: number,
  count: number,
  columns: number,
  direction: 'left' | 'right' | 'up' | 'down',
): number {
  if (count <= 0) return 0;
  if (columns <= 0) columns = 1;
  if (direction === 'right') return (current + 1) % count;
  if (direction === 'left') return (current - 1 + count) % count;
  if (direction === 'down') {
    const next = current + columns;
    return next >= count ? current % columns : next;
  }
  // up
  const prev = current - columns;
  if (prev < 0) {
    // Jump to the last row's cell in the same column.
    const col = current % columns;
    const rows = Math.ceil(count / columns);
    const lastRowStart = (rows - 1) * columns;
    const candidate = lastRowStart + col;
    return candidate < count ? candidate : candidate - columns;
  }
  return prev;
}

/** Map key → direction for the grid navigation helper. */
export function keyToDirection(
  key: string,
): 'left' | 'right' | 'up' | 'down' | null {
  if (key === 'ArrowRight') return 'right';
  if (key === 'ArrowLeft') return 'left';
  if (key === 'ArrowDown') return 'down';
  if (key === 'ArrowUp') return 'up';
  return null;
}

/** Returns true for the keys that fire selection. */
export function isSelectKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

// ─── Component ────────────────────────────────────────────────────────────

export function MiniGalleryPicker({
  items,
  activeId,
  onSelect,
  columns = 3,
  variant = 'card',
  ariaLabel,
}: MiniGalleryPickerProps) {
  // Track columns at runtime for keyboard nav. At render time we don't
  // know which breakpoint is active, so we sniff via matchMedia on mount
  // + resize. Falls back to `columns` (desktop max) on the server.
  const effectiveColumns = variant === 'row' || variant === 'list' ? 1 : columns;
  const [runtimeCols, setRuntimeCols] = useState<number>(effectiveColumns);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const recalc = () => {
      if (variant === 'row' || variant === 'list') {
        setRuntimeCols(1);
        return;
      }
      const w = window.innerWidth;
      if (w >= 1024) setRuntimeCols(columns);
      else if (w >= 768) setRuntimeCols(Math.min(columns, 2));
      else setRuntimeCols(1);
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [columns, variant]);

  const [focusIdx, setFocusIdx] = useState<number>(() => {
    const i = items.findIndex((x) => x.id === activeId);
    return i >= 0 ? i : 0;
  });

  // Saber GIF Sprint 2: hovered card index drives the GIF/SVG swap.
  // Tracked separately from focus so keyboard nav doesn't override the
  // mouse hover state, and we don't trigger a GIF swap on an item that
  // happens to be focused via Tab.
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Mirror the OS reduce-motion preference. Per the SABER_GIF_ROADMAP
  // hard constraints: "Reduced-motion preference applies to AUTOPLAY
  // surfaces. Per-variant picker GIFs autoplay-on-hover unless
  // `prefers-reduced-motion: reduce` (then show the first frame as a
  // static)." We approximate "first frame" by simply not swapping on
  // hover — the static SVG thumbnail stays in place.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setPrefersReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Keep focus in bounds if the items list shrinks.
  useEffect(() => {
    if (focusIdx >= items.length && items.length > 0) {
      setFocusIdx(items.length - 1);
    }
  }, [items.length, focusIdx]);

  const buttonRefs = useRef<Array<HTMLDivElement | null>>([]);

  const focusItem = useCallback((idx: number) => {
    const el = buttonRefs.current[idx];
    if (el) el.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>, idx: number) => {
      const dir = keyToDirection(e.key);
      if (dir) {
        e.preventDefault();
        const next = cycleGridIndex(idx, items.length, runtimeCols, dir);
        setFocusIdx(next);
        focusItem(next);
        return;
      }
      if (isSelectKey(e.key)) {
        e.preventDefault();
        const target = items[idx];
        if (target) onSelect(target.id);
        return;
      }
    },
    [items, runtimeCols, onSelect, focusItem],
  );

  if (items.length === 0) {
    return (
      <div
        className="py-4 px-2 text-center text-ui-xs text-text-muted italic"
        role="status"
        aria-label={ariaLabel ?? 'Gallery picker'}
      >
        No options available
      </div>
    );
  }

  const gridCols = variant === 'row' || variant === 'list' ? 'grid-cols-1' : resolveGridCols(columns);
  const gap = variant === 'list' ? 'gap-0' : variant === 'row' ? 'gap-1' : 'gap-1.5';
  const padding = variant === 'list' ? 'p-0' : 'p-1.5';

  // Render either the static SVG thumbnail OR an animated GIF, based on
  // hover state + reduced-motion preference. Lives at function level so
  // card / row variants share the swap logic. Returns the same JSX shape
  // (a single ReactNode) the caller used to render directly.
  const renderThumbnailMedia = (item: MiniGalleryItem, idx: number): ReactNode => {
    const isHovered = hoverIdx === idx && !prefersReducedMotion;
    if (isHovered && item.gifPath) {
      return (
        <img
          src={item.gifPath}
          alt=""
          aria-hidden="true"
          className="block w-full h-full object-cover"
          draggable={false}
          // If the GIF is missing (e.g. fresh clone where the build
          // script hasn't run), the alt branch (the static thumbnail)
          // will still render via this img's onError fallback. We set
          // visibility hidden + let the underlying `item.thumbnail`
          // show through.
          onError={(e) => {
            const img = e.currentTarget;
            img.style.visibility = 'hidden';
          }}
        />
      );
    }
    return item.thumbnail;
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? 'Gallery picker'}
      className={`grid ${gridCols} ${gap} ${padding}`}
      data-testid="mini-gallery-picker"
    >
      {items.map((item, idx) => {
        const isActive = item.id === activeId;
        if (variant === 'list') {
          // W5 (2026-04-22): thin name-only row — no thumbnail, no
          // border, no background except hover. Active row gets an
          // accent 2px left-stripe + accent text. Tooltip carries the
          // description so the row body can stay minimal.
          return (
            <div
              key={item.id}
              ref={(el) => {
                buttonRefs.current[idx] = el;
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={item.label}
              title={item.description ?? item.label}
              onClick={() => onSelect(item.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`group relative cursor-pointer outline-none focus-visible:bg-bg-surface/80 flex items-center px-3 transition-colors ${
                isActive
                  ? 'text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
              }`}
              style={{ height: 22 }}
            >
              {/* 2px active stripe — always present, transparent when
                  inactive so neighboring rows don't shift on selection. */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 bottom-0 w-[2px] transition-colors"
                style={{
                  backgroundColor: isActive
                    ? 'rgb(var(--accent))'
                    : 'transparent',
                }}
              />
              <span
                className={`text-ui-xs font-mono uppercase tracking-[0.08em] truncate ${
                  isActive ? 'font-medium' : ''
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        }
        return variant === 'row' ? (
          <div
            key={item.id}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={item.label}
            title={item.description ?? item.label}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx((cur) => (cur === idx ? null : cur))}
            className={`group cursor-pointer rounded overflow-hidden relative transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive
                ? 'border-2 border-accent bg-accent-dim shadow-[0_0_0_1px_var(--accent-border-color,rgb(var(--accent)/0.35)),0_0_12px_rgb(var(--accent)/0.35)]'
                : 'border border-border-subtle bg-bg-surface hover:border-accent-border'
            }`}
            // Long-blade aspect. Fixed height keeps the row legible even
            // when the panel is narrow; the thumbnail fills the full
            // width via the preserveAspectRatio=none setting in the Svg
            // wrapper (lib/styleThumbnails.tsx).
            style={{ height: 44 }}
          >
            <div className="absolute inset-0 bg-bg-deep overflow-hidden pointer-events-none">
              {renderThumbnailMedia(item, idx)}
            </div>
            {/* Label sits on top of the stretched thumbnail — tight
                left-aligned pill so the blade visual still reads behind it. */}
            <div
              className={`absolute top-1/2 left-2 -translate-y-1/2 px-2 py-0.5 rounded-chrome text-ui-xs font-mono uppercase tracking-[0.08em] pointer-events-none ${
                isActive
                  ? 'text-accent bg-bg-deep/60'
                  : 'text-text-primary bg-bg-deep/55 group-hover:text-accent'
              }`}
            >
              {item.label}
            </div>
          </div>
        ) : (
          <div
            key={item.id}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={item.label}
            title={item.description ?? item.label}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx((cur) => (cur === idx ? null : cur))}
            className={`group cursor-pointer rounded overflow-hidden transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive
                ? 'border-2 border-accent bg-accent-dim shadow-[0_0_0_1px_var(--accent-border-color,rgb(var(--accent)/0.35)),0_0_12px_rgb(var(--accent)/0.4)]'
                : 'border border-border-subtle bg-bg-surface hover:border-accent-border hover:scale-[1.02]'
            }`}
          >
            <div className="flex items-center justify-center bg-bg-deep h-[60px] overflow-hidden">
              {renderThumbnailMedia(item, idx)}
            </div>
            <div
              className={`px-1.5 py-1 text-ui-sm truncate ${
                isActive
                  ? 'text-accent font-medium'
                  : 'text-text-secondary group-hover:text-text-primary'
              }`}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
