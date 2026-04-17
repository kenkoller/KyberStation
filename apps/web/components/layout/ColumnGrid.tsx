'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { DraggablePanel, PANEL_DRAG_TYPE } from './DraggablePanel';
import type { PanelDragPayload } from './DraggablePanel';
import { PANEL_DEFINITIONS } from '@/stores/layoutStore';

// ─── Constants ───

/** Minimum column width in pixels — prevents collapsing columns too small. */
const MIN_COLUMN_WIDTH_PX = 200;

/** Lookup map from panelId → { label, description } for panel header display. */
const PANEL_META: Record<string, { label: string; description?: string }> =
  Object.fromEntries(
    PANEL_DEFINITIONS.map((def) => [def.id, { label: def.label, description: def.description }]),
  );

// ─── Props ───

interface ColumnGridProps {
  /** Identifier for this tab — used as a React key prefix */
  tabId: string;
  /** Number of columns to render (1–4) */
  columnCount: number;
  /** Per-column arrays of panelId strings */
  columns: string[][];
  /** Called when a panel moves to a different column or position */
  onMovePanel: (panelId: string, targetColumn: number, targetIndex: number) => void;
  /** Called when a panel is reordered within its current column */
  onReorderPanel: (column: number, fromIndex: number, toIndex: number) => void;
  /** Called when the user clicks the collapse toggle on a panel header */
  onToggleCollapse: (panelId: string) => void;
  /** Set of panelIds that are currently collapsed */
  collapsedPanels: Set<string>;
  /** Caller-supplied renderer — returns the actual panel content for a given panelId */
  renderPanel: (panelId: string) => React.ReactNode;
  /** Column width ratios (e.g. [1, 1.5, 0.8, 1]). Falls back to equal widths. */
  columnWidths?: number[];
  /** Called when the user finishes dragging a resize handle. */
  onColumnWidthsChange?: (widths: number[]) => void;
}

// ─── Column label map (optional cosmetic label for each column slot) ───

const COLUMN_LABELS: Record<number, string[]> = {
  1: ['Main'],
  2: ['Left', 'Right'],
  3: ['Left', 'Center', 'Right'],
  4: ['A', 'B', 'C', 'D'],
};

// ─── Helpers ───

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Normalise `columns` so it always has exactly `count` arrays. */
function normaliseColumns(columns: string[][], count: number): string[][] {
  const result: string[][] = [];
  for (let i = 0; i < count; i++) {
    result.push(columns[i] ?? []);
  }

  // If count shrank, redistribute orphaned panels into the last column
  if (columns.length > count) {
    const overflow = columns.slice(count).flat();
    result[count - 1] = [...result[count - 1], ...overflow];
  }

  return result;
}

// ─── Column drop zone ───

interface ColumnDropZoneProps {
  columnIndex: number;
  isEmpty: boolean;
  isOver: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, col: number) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>, col: number) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>, col: number) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, col: number) => void;
  children: React.ReactNode;
}

function ColumnDropZone({
  columnIndex,
  isEmpty,
  isOver,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  children,
}: ColumnDropZoneProps) {
  return (
    <div
      onDragOver={(e) => onDragOver(e, columnIndex)}
      onDragEnter={(e) => onDragEnter(e, columnIndex)}
      onDragLeave={(e) => onDragLeave(e, columnIndex)}
      onDrop={(e) => onDrop(e, columnIndex)}
      className={[
        'flex flex-col gap-2 min-h-[48px] rounded-panel transition-all duration-150 p-1',
        isOver
          ? isEmpty
            ? 'ring-1 ring-accent/40 bg-accent/5'
            : 'ring-1 ring-accent/20 bg-accent/[0.02]'
          : isEmpty
          ? 'ring-1 ring-dashed ring-border-subtle/60'
          : '',
      ].join(' ')}
    >
      {isEmpty && isOver && (
        <div
          aria-hidden
          className="flex-1 min-h-[40px] rounded border border-dashed border-accent/40 bg-accent/5 flex items-center justify-center"
        >
          <span className="text-ui-xs text-accent/60 pointer-events-none">Drop here</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Column resize handle ───

interface ColumnResizeHandleProps {
  /** Index of the handle (0 = between col 0 and col 1, etc.) */
  index: number;
  onResizeStart: (index: number, startX: number) => void;
  onResetWidths: () => void;
}

function ColumnResizeHandle({ index, onResizeStart, onResetWidths }: ColumnResizeHandleProps) {
  const [hovered, setHovered] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onResizeStart(index, e.clientX);
    },
    [index, onResizeStart],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onResetWidths();
    },
    [onResetWidths],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize columns ${index + 1} and ${index + 2}`}
      tabIndex={0}
      data-resize-handle=""
      className="relative self-stretch flex items-stretch justify-center select-none"
      style={{ width: 9, cursor: 'col-resize', zIndex: 10 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Visual line — 1px wide, centered in the 9px hit area */}
      <div
        className="w-px self-stretch rounded-full transition-colors duration-100"
        style={{
          // Uses the canonical --accent CSS var (which every theme sets)
          // instead of the old --color-accent alias with a Tailwind-blue
          // fallback — the fallback broke dark/red themes like Mustafar.
          backgroundColor: hovered
            ? 'rgb(var(--accent))'
            : 'rgb(var(--border-subtle, 255 255 255 / 0.08))',
          opacity: hovered ? 0.7 : 0.4,
        }}
      />
    </div>
  );
}

// ─── ColumnGrid ───

export function ColumnGrid({
  tabId,
  columnCount,
  columns,
  onMovePanel,
  onReorderPanel,
  onToggleCollapse,
  collapsedPanels,
  renderPanel,
  columnWidths,
  onColumnWidthsChange,
}: ColumnGridProps) {
  const count = clamp(columnCount, 1, 4);
  const normalisedColumns = normaliseColumns(columns, count);

  // ── Column resize state ──

  const gridRef = useRef<HTMLDivElement>(null);
  /** Live width ratios while dragging — null when not resizing. */
  const [liveWidths, setLiveWidths] = useState<number[] | null>(null);
  const resizeRef = useRef<{
    handleIndex: number;
    startX: number;
    startWidthsPx: number[];
  } | null>(null);

  /**
   * Normalise the incoming columnWidths prop to always have exactly `count`
   * entries. Falls back to equal 1-per-column if not supplied or wrong length.
   */
  const effectiveWidths: number[] =
    liveWidths ??
    (columnWidths && columnWidths.length === count
      ? columnWidths
      : Array.from({ length: count }, () => 1));

  // Keep a ref so the mousemove handler always reads the latest widths
  const effectiveWidthsRef = useRef(effectiveWidths);
  effectiveWidthsRef.current = effectiveWidths;

  const handleResizeStart = useCallback(
    (handleIndex: number, startX: number) => {
      const gridEl = gridRef.current;
      if (!gridEl) return;

      // Measure actual pixel widths of each column child (column wrapper divs)
      const colEls = Array.from(gridEl.children).filter(
        (el) => !(el as HTMLElement).dataset.resizeHandle,
      );
      const startWidthsPx = colEls.map((el) => (el as HTMLElement).getBoundingClientRect().width);

      resizeRef.current = { handleIndex, startX, startWidthsPx };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [],
  );

  const handleResetWidths = useCallback(() => {
    const equal = Array.from({ length: count }, () => 1);
    setLiveWidths(null);
    onColumnWidthsChange?.(equal);
  }, [count, onColumnWidthsChange]);

  // ── Global mousemove / mouseup for resize dragging ──

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const info = resizeRef.current;
      if (!info) return;

      const delta = e.clientX - info.startX;
      const { handleIndex, startWidthsPx } = info;

      // Left column gets wider, right column gets narrower (or vice versa)
      const totalPairPxRaw = startWidthsPx[handleIndex] + startWidthsPx[handleIndex + 1];

      // Clamp so neither column goes below MIN_COLUMN_WIDTH_PX
      const maxLeft = totalPairPxRaw - MIN_COLUMN_WIDTH_PX;
      const newLeftPx = Math.max(MIN_COLUMN_WIDTH_PX, Math.min(maxLeft, startWidthsPx[handleIndex] + delta));
      const newRightPx = totalPairPxRaw - newLeftPx;

      // Convert all columns back to ratios (relative to the total width of
      // the two columns being resized, keeping all other columns unchanged)
      const totalPairPx = startWidthsPx[handleIndex] + startWidthsPx[handleIndex + 1];
      const widths = effectiveWidthsRef.current;
      const totalPairFr =
        (widths[handleIndex] ?? 1) + (widths[handleIndex + 1] ?? 1);

      const nextWidths = [...widths];
      nextWidths[handleIndex] = (newLeftPx / totalPairPx) * totalPairFr;
      nextWidths[handleIndex + 1] = (newRightPx / totalPairPx) * totalPairFr;

      setLiveWidths(nextWidths);
    }

    function onMouseUp() {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Commit the live widths to the store
      setLiveWidths((current) => {
        if (current) {
          onColumnWidthsChange?.(current);
        }
        return null;
      });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onColumnWidthsChange]);

  // Active drag payload — stored in state so all sub-trees can read it
  const [activeDrag, setActiveDrag] = useState<PanelDragPayload | null>(null);
  // Column-level drag-over tracking (for empty column highlight)
  const [columnDragOver, setColumnDragOver] = useState<number | null>(null);
  const colEnterCountRef = useRef<Record<number, number>>({});

  // Reset drag state if columns prop changes while dragging
  useEffect(() => {
    if (activeDrag) {
      setActiveDrag(null);
      setColumnDragOver(null);
      colEnterCountRef.current = {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnCount]);

  // ── Drag lifecycle callbacks ──

  const handleDragStart = useCallback((payload: PanelDragPayload) => {
    setActiveDrag(payload);
  }, []);

  const handleDragEnd = useCallback(() => {
    setActiveDrag(null);
    setColumnDragOver(null);
    colEnterCountRef.current = {};
  }, []);

  // ── Panel-level drop (top / bottom of an existing panel) ──

  const handleDropOnPanel = useCallback(
    (
      payload: PanelDragPayload,
      targetColumn: number,
      targetIndex: number,
      _edge: 'top' | 'bottom'
    ) => {
      const isSameColumn = payload.sourceColumn === targetColumn;

      if (isSameColumn) {
        // Reorder within the same column
        // Adjust index: if moving down past the source, the effective target shifts by -1
        let toIdx = targetIndex;
        if (targetIndex > payload.sourceIndex) toIdx = targetIndex - 1;
        if (toIdx !== payload.sourceIndex) {
          onReorderPanel(targetColumn, payload.sourceIndex, toIdx);
        }
      } else {
        // Cross-column move
        onMovePanel(payload.panelId, targetColumn, targetIndex);
      }

      setActiveDrag(null);
      setColumnDragOver(null);
      colEnterCountRef.current = {};
    },
    [onMovePanel, onReorderPanel]
  );

  // ── Column-level drop (into an empty column or below all panels) ──

  const handleColumnDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, _col: number) => {
    if (!e.dataTransfer.types.includes(PANEL_DRAG_TYPE) && !e.dataTransfer.types.includes('text/plain')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleColumnDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, col: number) => {
    if (!e.dataTransfer.types.includes(PANEL_DRAG_TYPE) && !e.dataTransfer.types.includes('text/plain')) return;
    e.preventDefault();
    colEnterCountRef.current[col] = (colEnterCountRef.current[col] ?? 0) + 1;
    setColumnDragOver(col);
  }, []);

  const handleColumnDragLeave = useCallback((_e: React.DragEvent<HTMLDivElement>, col: number) => {
    colEnterCountRef.current[col] = Math.max(0, (colEnterCountRef.current[col] ?? 1) - 1);
    if (colEnterCountRef.current[col] === 0) {
      setColumnDragOver((prev) => (prev === col ? null : prev));
    }
  }, []);

  const handleColumnDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, col: number) => {
      e.preventDefault();
      colEnterCountRef.current[col] = 0;
      setColumnDragOver(null);

      const raw =
        e.dataTransfer.getData(PANEL_DRAG_TYPE) ||
        e.dataTransfer.getData('text/plain');
      if (!raw) return;

      let payload: PanelDragPayload;
      try {
        payload = JSON.parse(raw) as PanelDragPayload;
      } catch {
        return;
      }

      // Drop onto column background — append to end of that column
      const targetIndex = normalisedColumns[col]?.length ?? 0;
      const isSameColumn = payload.sourceColumn === col;

      if (isSameColumn) {
        // Only reorder if it's not already the last item
        const lastIdx = (normalisedColumns[col]?.length ?? 1) - 1;
        if (payload.sourceIndex !== lastIdx) {
          onReorderPanel(col, payload.sourceIndex, lastIdx);
        }
      } else {
        onMovePanel(payload.panelId, col, targetIndex);
      }

      setActiveDrag(null);
    },
    [normalisedColumns, onMovePanel, onReorderPanel]
  );

  // ── Grid column style ──
  //
  // Build explicit grid-template-columns with fr values from effectiveWidths.
  // Between each pair of column tracks we insert an auto-sized track for the
  // resize handle, so the template looks like:
  //   1.2fr auto 0.8fr auto 1fr auto 1fr
  // The gap between a column and its resize handle is 0 — visual spacing comes
  // from the handle's own padding / width.

  const templateParts: string[] = [];
  for (let i = 0; i < count; i++) {
    templateParts.push(`minmax(${MIN_COLUMN_WIDTH_PX}px, ${effectiveWidths[i] ?? 1}fr)`);
    if (i < count - 1) {
      templateParts.push('auto'); // resize handle track
    }
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: templateParts.join(' '),
    alignItems: 'start',
  };

  const colLabels = COLUMN_LABELS[count] ?? [];

  // Build interleaved children: column, handle, column, handle, ..., column
  const gridChildren: React.ReactNode[] = [];

  normalisedColumns.forEach((panelIds, colIdx) => {
    const isOver = columnDragOver === colIdx;
    const isEmpty = panelIds.length === 0;

    gridChildren.push(
      <div key={`${tabId}-col-${colIdx}`} className="flex flex-col gap-0 min-w-0">
        {/* Column label — only shown when count > 1 */}
        {count > 1 && (
          <div
            className="text-ui-xs text-text-muted/40 uppercase tracking-widest px-1 pb-1 select-none"
            aria-hidden
          >
            {colLabels[colIdx] ?? `Col ${colIdx + 1}`}
          </div>
        )}

        <ColumnDropZone
          columnIndex={colIdx}
          isEmpty={isEmpty}
          isOver={isOver}
          onDragOver={handleColumnDragOver}
          onDragEnter={handleColumnDragEnter}
          onDragLeave={handleColumnDragLeave}
          onDrop={handleColumnDrop}
        >
          {panelIds.map((panelId, panelIdx) => {
            const meta = PANEL_META[panelId];
            return (
              <DraggablePanel
                key={panelId}
                panelId={panelId}
                label={meta?.label ?? panelId}
                description={meta?.description}
                column={colIdx}
                index={panelIdx}
                isCollapsed={collapsedPanels.has(panelId)}
                onToggleCollapse={onToggleCollapse}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDropOnPanel={handleDropOnPanel}
                isDragging={activeDrag?.panelId === panelId}
              >
                {renderPanel(panelId)}
              </DraggablePanel>
            );
          })}
        </ColumnDropZone>
      </div>,
    );

    // Insert a resize handle after every column except the last
    if (colIdx < count - 1) {
      gridChildren.push(
        <ColumnResizeHandle
          key={`${tabId}-resize-${colIdx}`}
          index={colIdx}
          onResizeStart={handleResizeStart}
          onResetWidths={handleResetWidths}
        />,
      );
    }
  });

  return (
    <div ref={gridRef} style={gridStyle} aria-label={`${tabId} panel grid, ${count} columns`}>
      {gridChildren}
    </div>
  );
}
