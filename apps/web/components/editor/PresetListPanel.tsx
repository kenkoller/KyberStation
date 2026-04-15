'use client';
import { useState, useRef, useCallback } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { usePresetListStore, type PresetListEntry } from '@/stores/presetListStore';
import { activatePresetEntry } from '@/hooks/usePresetListSync';

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function sanitizeFontName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 32) || 'font';
}

// ─── Preset List Row ───

function PresetListRow({
  entry,
  index,
  isActive,
  onRemove,
  dragHandlers,
  dropTargetIndex,
  onKeyboardReorder,
  totalCount,
}: {
  entry: PresetListEntry;
  index: number;
  isActive: boolean;
  onRemove: () => void;
  dragHandlers: {
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
  };
  dropTargetIndex: number | null;
  onKeyboardReorder: (fromIndex: number, direction: 'up' | 'down') => void;
  totalCount: number;
}) {
  const updateEntryName = usePresetListStore((s) => s.updateEntryName);
  const updateEntryFont = usePresetListStore((s) => s.updateEntryFont);
  const [editingName, setEditingName] = useState(false);
  const [editingFont, setEditingFont] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const fontRef = useRef<HTMLInputElement>(null);

  const baseHex = rgbToHex(
    entry.config.baseColor.r,
    entry.config.baseColor.g,
    entry.config.baseColor.b,
  );

  const isDropTarget = dropTargetIndex === index;

  return (
    <div
      draggable
      tabIndex={0}
      role="option"
      aria-selected={isActive}
      aria-roledescription="draggable item"
      aria-label={`Preset ${index + 1}: ${entry.presetName}, font ${entry.fontName}, style ${entry.config.style}`}
      onDragStart={(e) => dragHandlers.onDragStart(e, index)}
      onDragOver={(e) => dragHandlers.onDragOver(e, index)}
      onDragEnd={dragHandlers.onDragEnd}
      onKeyDown={(e) => {
        if (e.altKey && e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          onKeyboardReorder(index, 'up');
        } else if (e.altKey && e.key === 'ArrowDown' && index < totalCount - 1) {
          e.preventDefault();
          onKeyboardReorder(index, 'down');
        }
      }}
      onClick={() => activatePresetEntry(entry.id)}
      className={`group relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all ${
        isActive
          ? 'bg-accent-dim/30 border-l-2 border-l-accent border border-accent-border/40'
          : 'border border-border-subtle hover:border-border-light'
      } ${isDropTarget ? 'border-t-2 border-t-accent' : ''}`}
    >
      {/* Position number */}
      <span className="text-ui-sm text-text-muted tabular-nums w-4 text-right shrink-0">
        {index + 1}.
      </span>

      {/* Color swatch */}
      <span
        className="w-3 h-3 rounded-sm shrink-0 border border-white/10"
        style={{ backgroundColor: baseHex }}
        aria-label={`Base color: ${baseHex}`}
      />

      {/* Mini blade strip */}
      <div
        className="w-16 h-3 rounded-sm shrink-0 overflow-hidden"
        style={{
          background: `linear-gradient(90deg, ${baseHex}00 0%, ${baseHex} 15%, ${baseHex} 85%, ${baseHex}00 100%)`,
        }}
        aria-hidden="true"
      />

      {/* Name + font */}
      <div className="flex-1 min-w-0">
        {editingName ? (
          <input
            ref={nameRef}
            defaultValue={entry.presetName}
            autoFocus
            aria-label="Preset name"
            className="w-full bg-bg-deep text-ui-sm text-text-primary px-1 py-0.5 rounded border border-accent-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            onBlur={(e) => {
              updateEntryName(entry.id, e.target.value || entry.presetName);
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setEditingName(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="text-ui-sm text-text-primary truncate cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}
          >
            {entry.presetName}
            {isActive && (
              <span className="ml-1 text-accent text-ui-xs">(editing)</span>
            )}
          </div>
        )}

        {editingFont ? (
          <input
            ref={fontRef}
            defaultValue={entry.fontName}
            autoFocus
            aria-label="Sound font folder name"
            className="w-full bg-bg-deep text-ui-xs text-text-muted font-mono px-1 py-0.5 rounded border border-border-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            onBlur={(e) => {
              const sanitized = sanitizeFontName(e.target.value || entry.fontName);
              updateEntryFont(entry.id, sanitized);
              setEditingFont(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setEditingFont(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="text-ui-xs text-text-muted font-mono truncate cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); setEditingFont(true); }}
          >
            {entry.fontName}/
          </div>
        )}
      </div>

      {/* Style badge */}
      <span className="text-ui-xs text-text-muted shrink-0">{entry.config.style}</span>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label={`Remove preset ${entry.presetName}`}
        className="text-text-muted hover:text-red-400 text-ui-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        title="Remove from list"
      >
        &times;
      </button>

      {/* Drag handle */}
      <span className="text-text-muted/40 cursor-grab text-ui-sm shrink-0 select-none" aria-label="Drag to reorder" role="img">
        &#8801;
      </span>
    </div>
  );
}

// ─── Preset List Panel ───

export function PresetListPanel() {
  const entries = usePresetListStore((s) => s.entries);
  const activeEntryId = usePresetListStore((s) => s.activeEntryId);
  const addEntry = usePresetListStore((s) => s.addEntry);
  const removeEntry = usePresetListStore((s) => s.removeEntry);
  const reorderEntries = usePresetListStore((s) => s.reorderEntries);
  const clearList = usePresetListStore((s) => s.clearList);
  const config = useBladeStore((s) => s.config);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [liveMessage, setLiveMessage] = useState('');

  const handleAddCurrent = useCallback(() => {
    const id = addEntry({
      presetName: config.name ?? 'Custom Style',
      fontName: sanitizeFontName(config.name ?? 'custom'),
      config: { ...config },
    });
    activatePresetEntry(id);
  }, [addEntry, config]);

  const dragHandlers = {
    onDragStart: (e: React.DragEvent, index: number) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== index) {
        setDropTargetIndex(index);
      }
    },
    onDragEnd: () => {
      if (dragIndex !== null && dropTargetIndex !== null && dragIndex !== dropTargetIndex) {
        reorderEntries(dragIndex, dropTargetIndex);
      }
      setDragIndex(null);
      setDropTargetIndex(null);
    },
  };

  const handleKeyboardReorder = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    reorderEntries(fromIndex, toIndex);
    const name = entries[fromIndex]?.presetName ?? 'Preset';
    setLiveMessage(`Moved ${name} to position ${toIndex + 1}`);
  }, [reorderEntries, entries]);

  return (
    <div className="bg-bg-surface rounded-panel border border-border-subtle p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold">
          Saber Preset List
          {entries.length > 0 && (
            <span className="ml-1 text-text-muted">({entries.length})</span>
          )}
        </h4>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAddCurrent}
            aria-label="Add current style as a new preset"
            className="text-ui-xs px-2 py-0.5 rounded border border-accent-border/40 text-accent bg-accent-dim/20 hover:bg-accent-dim/40 transition-colors"
          >
            + Add Current
          </button>
          {entries.length > 0 && (
            <button
              onClick={clearList}
              aria-label="Clear all presets from list"
              className="text-ui-xs px-1.5 py-0.5 rounded border border-border-subtle text-text-muted hover:text-red-400 hover:border-red-400/40 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {entries.length === 0 ? (
        <div className="text-ui-sm text-text-muted text-center py-4 border border-dashed border-border-subtle rounded">
          No presets in list. Add from Gallery or click &quot;+ Add Current&quot;.
        </div>
      ) : (
        <div className="space-y-1" role="listbox" aria-label="Saber presets" aria-roledescription="reorderable list">
          {entries.map((entry, index) => (
            <PresetListRow
              key={entry.id}
              entry={entry}
              index={index}
              isActive={entry.id === activeEntryId}
              onRemove={() => removeEntry(entry.id)}
              dragHandlers={dragHandlers}
              dropTargetIndex={dropTargetIndex}
              onKeyboardReorder={handleKeyboardReorder}
              totalCount={entries.length}
            />
          ))}
        </div>
      )}
      <div aria-live="polite" className="sr-only">{liveMessage}</div>

      {/* Footer hint */}
      {entries.length > 0 && (
        <div className="text-ui-xs text-text-muted mt-2 text-center">
          Drag or Alt+&uarr;/&darr; to reorder &bull; Double-click name or font to edit &bull; Order = saber preset order
        </div>
      )}
    </div>
  );
}
