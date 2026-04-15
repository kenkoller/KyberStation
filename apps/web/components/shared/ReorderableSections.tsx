'use client';
import { useState, useRef, useCallback, useMemo } from 'react';
import { useUIStore, type ActiveTab } from '@/stores/uiStore';

// ─── Section Definition ───

export interface SectionDef {
  /** Unique ID used for ordering persistence */
  id: string;
  /** Display title in the section header */
  title: string;
  /** Optional tooltip element (e.g., HelpTooltip) */
  tooltip?: React.ReactNode;
  /** Whether section starts expanded (default true) */
  defaultOpen?: boolean;
  /** The section content */
  children: React.ReactNode;
}

interface ReorderableSectionsProps {
  /** Which tab this belongs to — used for persisting order */
  tab: ActiveTab;
  /** Section definitions in their default order */
  sections: SectionDef[];
}

// ─── Component ───

export function ReorderableSections({ tab, sections }: ReorderableSectionsProps) {
  const sectionOrder = useUIStore((s) => s.sectionOrder[tab]);
  const setSectionOrder = useUIStore((s) => s.setSectionOrder);

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  // Compute ordered sections: apply saved order, then append any new sections
  const orderedSections = useMemo(() => {
    if (!sectionOrder || sectionOrder.length === 0) return sections;

    const byId = new Map(sections.map((s) => [s.id, s]));
    const ordered: SectionDef[] = [];

    // Add sections in saved order
    for (const id of sectionOrder) {
      const s = byId.get(id);
      if (s) {
        ordered.push(s);
        byId.delete(id);
      }
    }

    // Append any new sections not in saved order
    for (const s of byId.values()) {
      ordered.push(s);
    }

    return ordered;
  }, [sections, sectionOrder]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // Make the dragged element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      requestAnimationFrame(() => {
        (e.currentTarget as HTMLElement).style.opacity = '0.4';
      });
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDragId(null);
    setDragOverId(null);
    dragCounterRef.current = {};
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '';
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragCounterRef.current[id] = (dragCounterRef.current[id] ?? 0) + 1;
    if (id !== dragId) {
      setDragOverId(id);
    }
  }, [dragId]);

  const handleDragLeave = useCallback((_e: React.DragEvent, id: string) => {
    dragCounterRef.current[id] = (dragCounterRef.current[id] ?? 1) - 1;
    if (dragCounterRef.current[id] <= 0) {
      dragCounterRef.current[id] = 0;
      if (dragOverId === id) {
        setDragOverId(null);
      }
    }
  }, [dragOverId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDragOverId(null);
      return;
    }

    const currentOrder = orderedSections.map((s) => s.id);
    const sourceIdx = currentOrder.indexOf(sourceId);
    const targetIdx = currentOrder.indexOf(targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    // Remove source and insert at target position
    const newOrder = [...currentOrder];
    newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, sourceId);

    setSectionOrder(tab, newOrder);
    setDragOverId(null);
    dragCounterRef.current = {};
  }, [orderedSections, setSectionOrder, tab]);

  // Move section up/down via arrow buttons
  const moveSection = useCallback((id: string, direction: -1 | 1) => {
    const currentOrder = orderedSections.map((s) => s.id);
    const idx = currentOrder.indexOf(id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;

    const newOrder = [...currentOrder];
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    setSectionOrder(tab, newOrder);
  }, [orderedSections, setSectionOrder, tab]);

  return (
    <div className="space-y-3">
      {orderedSections.map((section, i) => (
        <div key={section.id}>
          {i > 0 && <div className="h-px bg-border-subtle mb-3" />}
          <ReorderableSection
            section={section}
            isDragging={dragId === section.id}
            isDragOver={dragOverId === section.id}
            onDragStart={(e) => handleDragStart(e, section.id)}
            onDragEnd={handleDragEnd}
            onDragEnter={(e) => handleDragEnter(e, section.id)}
            onDragLeave={(e) => handleDragLeave(e, section.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, section.id)}
            onMoveUp={i > 0 ? () => moveSection(section.id, -1) : undefined}
            onMoveDown={i < orderedSections.length - 1 ? () => moveSection(section.id, 1) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Individual Section ───

interface ReorderableSectionProps {
  section: SectionDef;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function ReorderableSection({
  section,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
}: ReorderableSectionProps) {
  const [open, setOpen] = useState(section.defaultOpen ?? true);

  return (
    <section
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`transition-all rounded ${
        isDragOver ? 'ring-1 ring-accent/40 bg-accent-dim/10' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-1 mb-1.5 group/header">
        {/* Drag handle */}
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="flex items-center justify-center w-4 h-5 cursor-grab active:cursor-grabbing text-text-muted/30 hover:text-text-muted/60 transition-colors shrink-0 select-none"
          title="Drag to reorder"
          aria-label={`Drag to reorder ${section.title}`}
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
            <circle cx="2" cy="2" r="1.2" />
            <circle cx="6" cy="2" r="1.2" />
            <circle cx="2" cy="7" r="1.2" />
            <circle cx="6" cy="7" r="1.2" />
            <circle cx="2" cy="12" r="1.2" />
            <circle cx="6" cy="12" r="1.2" />
          </svg>
        </span>

        {/* Collapse toggle + title */}
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${section.title}`}
          className="flex items-center justify-between flex-1 group"
        >
          <h3 className="text-ui-sm uppercase tracking-wider text-text-muted font-bold">
            {section.title}
          </h3>
          <span className={`text-ui-sm text-text-muted transition-transform ${open ? '' : '-rotate-90'}`}>
            &#9662;
          </span>
        </button>

        {/* Tooltip */}
        {section.tooltip}

        {/* Arrow buttons (visible on hover) */}
        <div className="flex gap-0 opacity-0 group-hover/header:opacity-100 transition-opacity">
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              className="text-text-muted/30 hover:text-text-muted/70 transition-colors p-0.5"
              aria-label={`Move ${section.title} up`}
              title="Move up"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,6 5,3 8,6" />
              </svg>
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              className="text-text-muted/30 hover:text-text-muted/70 transition-colors p-0.5"
              aria-label={`Move ${section.title} down`}
              title="Move down"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,4 5,7 8,4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {open && section.children}
    </section>
  );
}
