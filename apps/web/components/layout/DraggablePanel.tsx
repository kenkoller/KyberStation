'use client';
import { useState, useRef, useCallback } from 'react';
import { playUISound } from '@/lib/uiSounds';
import { CornerBrackets } from '@/components/hud/CornerBrackets';

// ─── Drop position within a panel ───

export type DropEdge = 'top' | 'bottom' | null;

// ─── Drag payload type written into dataTransfer ───

export interface PanelDragPayload {
  panelId: string;
  sourceColumn: number;
  sourceIndex: number;
}

export const PANEL_DRAG_TYPE = 'application/x-kyberstation-panel';

// ─── Props ───

interface DraggablePanelProps {
  panelId: string;
  label: string;
  /** Short subtitle describing what this panel does */
  description?: string;
  column: number;
  index: number;
  isCollapsed: boolean;
  onToggleCollapse: (panelId: string) => void;
  onDragStart: (payload: PanelDragPayload) => void;
  onDragEnd: () => void;
  /** Called when another panel is dropped relative to this one */
  onDropOnPanel: (
    payload: PanelDragPayload,
    targetColumn: number,
    targetIndex: number,
    edge: 'top' | 'bottom'
  ) => void;
  isDragging: boolean;
  children: React.ReactNode;
}

// ─── Component ───

export function DraggablePanel({
  panelId,
  label,
  description,
  column,
  index,
  isCollapsed,
  onToggleCollapse,
  onDragStart,
  onDragEnd,
  onDropOnPanel,
  isDragging,
  children,
}: DraggablePanelProps) {
  const [dropEdge, setDropEdge] = useState<DropEdge>(null);
  const dragEnterCountRef = useRef(0);

  // ── Drag handle — only the handle initiates drags ──

  const handleHandleDragStart = useCallback(
    (e: React.DragEvent<HTMLSpanElement>) => {
      const payload: PanelDragPayload = { panelId, sourceColumn: column, sourceIndex: index };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(PANEL_DRAG_TYPE, JSON.stringify(payload));
      // Also write plain text so older browsers / Firefox work
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      onDragStart(payload);
      // Capture the DOM node before the rAF fires — React's SyntheticEvent
      // pools e.currentTarget and nulls it out after the handler returns.
      const target = e.currentTarget;
      // Defer opacity so the drag image is captured first
      requestAnimationFrame(() => {
        const el = target.closest('[data-panel-id]') as HTMLElement | null;
        if (el) el.style.opacity = '0.35';
      });
    },
    [panelId, column, index, onDragStart]
  );

  const handleHandleDragEnd = useCallback(
    (e: React.DragEvent<HTMLSpanElement>) => {
      const el = e.currentTarget.closest('[data-panel-id]') as HTMLElement | null;
      if (el) el.style.opacity = '';
      setDropEdge(null);
      dragEnterCountRef.current = 0;
      onDragEnd();
    },
    [onDragEnd]
  );

  // ── Panel body — receives drops from other panels ──

  const resolveEdge = useCallback(
    (e: React.DragEvent<HTMLDivElement>): DropEdge => {
      const rect = e.currentTarget.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      return relY < rect.height / 2 ? 'top' : 'bottom';
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer.types.includes(PANEL_DRAG_TYPE) && !e.dataTransfer.types.includes('text/plain')) return;
      e.preventDefault();
      e.stopPropagation(); // Prevent column-level handler from also firing
      e.dataTransfer.dropEffect = 'move';
      setDropEdge(resolveEdge(e));
    },
    [resolveEdge]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer.types.includes(PANEL_DRAG_TYPE) && !e.dataTransfer.types.includes('text/plain')) return;
      e.preventDefault();
      e.stopPropagation(); // Prevent column-level enter counter from incrementing
      dragEnterCountRef.current += 1;
      setDropEdge(resolveEdge(e));
    },
    [resolveEdge]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.stopPropagation(); // Keep column-level leave counter in sync
      dragEnterCountRef.current = Math.max(0, dragEnterCountRef.current - 1);
      if (dragEnterCountRef.current === 0) {
        setDropEdge(null);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent column-level drop from double-handling this move
      dragEnterCountRef.current = 0;

      const raw =
        e.dataTransfer.getData(PANEL_DRAG_TYPE) ||
        e.dataTransfer.getData('text/plain');
      if (!raw) {
        setDropEdge(null);
        return;
      }

      let payload: PanelDragPayload;
      try {
        payload = JSON.parse(raw) as PanelDragPayload;
      } catch {
        setDropEdge(null);
        return;
      }

      if (payload.panelId === panelId) {
        setDropEdge(null);
        return;
      }

      const edge = resolveEdge(e) ?? 'bottom';
      // Convert edge to a target index in the column
      // 'top' of this panel  → insert before this panel (index)
      // 'bottom' of this panel → insert after this panel (index + 1)
      const targetIndex = edge === 'top' ? index : index + 1;
      onDropOnPanel(payload, column, targetIndex, edge);
      setDropEdge(null);
    },
    [panelId, column, index, resolveEdge, onDropOnPanel]
  );

  // ── Render ──

  return (
    <div
      data-panel-id={panelId}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'relative rounded-panel border transition-all duration-150 select-none',
        'bg-bg-surface/80 border-border-subtle',
        isDragging ? 'opacity-35' : 'opacity-100',
      ].join(' ')}
    >
      {/* Top drop indicator */}
      <div
        aria-hidden
        className={[
          'absolute inset-x-0 -top-px h-0.5 rounded-full pointer-events-none transition-opacity duration-100',
          'bg-accent shadow-[0_0_6px_1px_rgb(var(--accent)/0.5)]',
          dropEdge === 'top' ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      {/* Panel header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 group/header">
        {/* Drag handle */}
        <span
          draggable
          onDragStart={handleHandleDragStart}
          onDragEnd={handleHandleDragEnd}
          className={[
            'flex items-center justify-center w-4 h-5 shrink-0',
            'cursor-grab active:cursor-grabbing',
            'text-text-muted/30 hover:text-text-muted/70 transition-colors',
          ].join(' ')}
          title="Drag to move panel"
          aria-label={`Drag to move ${label}`}
        >
          {/* 6-dot grip */}
          <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor" aria-hidden>
            <circle cx="2" cy="2"  r="1.2" />
            <circle cx="6" cy="2"  r="1.2" />
            <circle cx="2" cy="7"  r="1.2" />
            <circle cx="6" cy="7"  r="1.2" />
            <circle cx="2" cy="12" r="1.2" />
            <circle cx="6" cy="12" r="1.2" />
          </svg>
        </span>

        {/* Collapse toggle + label */}
        <button
          type="button"
          onClick={() => { playUISound(isCollapsed ? 'panel-open' : 'panel-close'); onToggleCollapse(panelId); }}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${label}`}
          className="flex items-center justify-between flex-1 min-w-0 group"
        >
          <div className="min-w-0">
            <h3 className="text-ui-sm uppercase tracking-wider text-text-muted font-bold truncate">
              {label}
            </h3>
            {description && !isCollapsed && (
              <p className="text-[10px] text-text-muted/50 font-normal mt-0.5 truncate leading-tight">
                {description}
              </p>
            )}
          </div>
          {/* Chevron */}
          <span
            className={[
              'text-ui-sm text-text-muted/60 shrink-0 ml-1 transition-transform duration-200',
              isCollapsed ? '-rotate-90' : '',
            ].join(' ')}
            aria-hidden
          >
            &#9662;
          </span>
        </button>
      </div>

      {/* Collapsible content */}
      <div
        className={[
          'overflow-hidden transition-all duration-200',
          isCollapsed ? 'max-h-0' : 'max-h-[9999px]',
        ].join(' ')}
        aria-hidden={isCollapsed}
      >
        <CornerBrackets className="h-full" size={8} thickness={1} pulse={true}>
          <div className="px-2 pb-2">
            {children}
          </div>
        </CornerBrackets>
      </div>

      {/* Bottom drop indicator */}
      <div
        aria-hidden
        className={[
          'absolute inset-x-0 -bottom-px h-0.5 rounded-full pointer-events-none transition-opacity duration-100',
          'bg-accent shadow-[0_0_6px_1px_rgb(var(--accent)/0.5)]',
          dropEdge === 'bottom' ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </div>
  );
}
