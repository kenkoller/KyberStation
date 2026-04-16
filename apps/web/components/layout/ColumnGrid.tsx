'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { DraggablePanel, PANEL_DRAG_TYPE } from './DraggablePanel';
import type { PanelDragPayload } from './DraggablePanel';

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
        isOver && isEmpty
          ? 'ring-1 ring-accent/40 bg-accent/5'
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
}: ColumnGridProps) {
  const count = clamp(columnCount, 1, 4);
  const normalisedColumns = normaliseColumns(columns, count);

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

  const handleColumnDragLeave = useCallback((_e: React.DragEvent<HTMLDivElement>, _col: number) => {
    // _col unused here; we track via colEnterCountRef with the column index captured at entry
    // We iterate over all columns with pending enter counts to find which one just left.
    // Since DragLeave doesn't reliably tell us the column index when the element is a child,
    // we rely on DragEnter counter keyed by column to decide when to clear the highlight.
    // This handler decrements the global active-column enter count; the column index is not
    // needed because only one column can be "over" at a time.
    if (columnDragOver === null) return;
    const col = columnDragOver;
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

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
    gap: '8px',
    alignItems: 'start',
  };

  const colLabels = COLUMN_LABELS[count] ?? [];

  return (
    <div style={gridStyle} aria-label={`${tabId} panel grid, ${count} columns`}>
      {normalisedColumns.map((panelIds, colIdx) => {
        const isOver = columnDragOver === colIdx;
        const isEmpty = panelIds.length === 0;

        return (
          <div key={`${tabId}-col-${colIdx}`} className="flex flex-col gap-0">
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
              {panelIds.map((panelId, panelIdx) => (
                <DraggablePanel
                  key={panelId}
                  panelId={panelId}
                  label={panelId}
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
              ))}
            </ColumnDropZone>
          </div>
        );
      })}
    </div>
  );
}
