// ─── Fett263 Prop Editor ─────────────────────────────────────────────────
//
// Level 1 Prop File Editor: comprehensive Fett263 #define configurator.
// Renders all ~42 FETT263_* defines as categorized toggle/value rows
// with live dependency validation, conflict warnings, and codegen preview.
//
// Replaces the 14-toggle subset in GestureControlPanel's gesture section
// with the full define catalog from saber_fett263_buttons.h.
//
// Integration: mounted inside GestureControlPanel when propFileId === 'fett263'.
// Writes to bladeStore.config.gestureDefines (string[]).

'use client';

import { useState, useMemo, useCallback } from 'react';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import {
  FETT263_DEFINES_DEDUPED,
  FETT263_CATEGORY_ORDER,
  FETT263_CATEGORY_LABELS,
  validateDefine,
  parseDefineString,
  formatDefineForCodegen,
  isNoBmVariant,
  getNoBmVariant,
  type Fett263DefineCategory,
  type Fett263Define,
  type DefineValidation,
} from '@/lib/fett263Defines';

// ─── Types ──────────────────────────────────────────────────────────────

interface Fett263PropEditorProps {
  /** Current active defines from bladeStore.config.gestureDefines */
  activeDefines: string[];
  /** Callback to update the active defines array */
  onDefinesChange: (defines: string[]) => void;
}

// ─── Value tracking ─────────────────────────────────────────────────────
//
// Numeric defines need their values tracked separately from the boolean
// toggle state. We store values in a Map keyed by define string.

type DefineValues = Map<string, number>;

function extractValues(activeDefines: string[]): DefineValues {
  const values: DefineValues = new Map();
  for (const raw of activeDefines) {
    const { define, value } = parseDefineString(raw);
    if (value !== undefined) {
      values.set(define, value);
    }
  }
  return values;
}

function extractDefineNames(activeDefines: string[]): Set<string> {
  const names = new Set<string>();
  for (const raw of activeDefines) {
    const { define } = parseDefineString(raw);
    names.add(define);
  }
  return names;
}

// ─── Category section ───────────────────────────────────────────────────

interface CategorySectionProps {
  category: Fett263DefineCategory;
  defines: Fett263Define[];
  activeNames: Set<string>;
  values: DefineValues;
  onToggle: (define: string) => void;
  onValueChange: (define: string, value: number) => void;
  validations: Map<string, DefineValidation>;
}

function CategorySection({
  category,
  defines,
  activeNames,
  values,
  onToggle,
  onValueChange,
  validations,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const activeCount = defines.filter((d) => activeNames.has(d.define)).length;

  return (
    <div role="group" aria-labelledby={`fett263-cat-${category}`}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 py-1.5 text-left group"
        aria-expanded={!collapsed}
      >
        <span
          className={`text-[10px] transition-transform ${collapsed ? '' : 'rotate-90'}`}
          aria-hidden="true"
        >
          ▶
        </span>
        <h4
          id={`fett263-cat-${category}`}
          className="text-[11px] text-text-primary uppercase tracking-wider font-semibold flex-1"
        >
          {FETT263_CATEGORY_LABELS[category]}
        </h4>
        {activeCount > 0 && (
          <span className="text-[10px] text-accent font-mono px-1.5 py-0.5 rounded bg-accent/10">
            {activeCount}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="pl-1 space-y-px">
          {defines.map((d) => (
            <DefineRow
              key={d.define}
              entry={d}
              isActive={activeNames.has(d.define)}
              value={values.get(d.define)}
              validation={validations.get(d.define)}
              onToggle={onToggle}
              onValueChange={onValueChange}
              noBmActive={
                getNoBmVariant(d.define)
                  ? activeNames.has(getNoBmVariant(d.define)!)
                  : false
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Define row ─────────────────────────────────────────────────────────

interface DefineRowProps {
  entry: Fett263Define;
  isActive: boolean;
  value?: number;
  validation?: DefineValidation;
  onToggle: (define: string) => void;
  onValueChange: (define: string, value: number) => void;
  noBmActive: boolean;
}

function DefineRow({
  entry,
  isActive,
  value,
  validation,
  onToggle,
  onValueChange,
  noBmActive,
}: DefineRowProps) {
  const hasWarning = validation && !validation.valid;
  const isMissing = validation && validation.missingRequires.length > 0;
  const hasConflict = validation && validation.activeConflicts.length > 0;

  // For _NO_BM variants, show as a sub-option with indent
  const isNoBm = isNoBmVariant(entry.define);

  return (
    <div
      className={`flex items-start gap-2 px-2 py-1.5 rounded transition-colors group ${
        isNoBm ? 'pl-6' : ''
      } ${
        isActive
          ? hasWarning
            ? 'bg-status-error/5'
            : 'bg-accent/5'
          : 'hover:bg-bg-surface'
      }`}
    >
      {/* Toggle */}
      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
        {entry.type === 'boolean' ? (
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => onToggle(entry.define)}
            className="w-3.5 h-3.5 rounded border-border-subtle accent-accent shrink-0 mt-0.5"
          />
        ) : (
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => onToggle(entry.define)}
            className="w-3.5 h-3.5 rounded border-border-subtle accent-accent shrink-0 mt-0.5"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[11px] font-medium ${
                isActive
                  ? hasWarning
                    ? 'text-status-error'
                    : 'text-accent'
                  : 'text-text-secondary'
              }`}
            >
              {entry.label}
            </span>
            {isNoBm && (
              <span className="text-[9px] text-text-muted font-mono px-1 py-0 rounded bg-bg-deep">
                NO BM
              </span>
            )}
            {noBmActive && !isNoBm && (
              <span className="text-[9px] text-amber-400 font-mono px-1 py-0 rounded bg-amber-400/10">
                NO BM active
              </span>
            )}
          </div>
          <p className="text-[10px] text-text-muted leading-tight mt-0.5">
            {entry.description}
          </p>

          {/* Dependency / conflict warnings */}
          {isActive && isMissing && (
            <p className="text-[10px] text-status-error mt-0.5">
              ⚠ Requires:{' '}
              {validation!.missingRequires
                .map((r) => r.replace('FETT263_', ''))
                .join(', ')}
            </p>
          )}
          {isActive && hasConflict && (
            <p className="text-[10px] text-status-error mt-0.5">
              ⚠ Conflicts with:{' '}
              {validation!.activeConflicts
                .map((c) => c.replace('FETT263_', ''))
                .join(', ')}
            </p>
          )}
        </div>
      </label>

      {/* Value input for numeric defines */}
      {entry.type === 'number' && isActive && (
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            value={value ?? entry.defaultValue ?? 0}
            min={entry.min}
            max={entry.max}
            step={entry.step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) {
                onValueChange(entry.define, v);
              }
            }}
            className="w-16 px-1.5 py-0.5 text-[11px] font-mono bg-bg-deep border border-border-subtle rounded text-text-primary text-right focus:outline-none focus:border-accent/40"
          />
          {entry.unit && (
            <span className="text-[9px] text-text-muted">{entry.unit}</span>
          )}
        </div>
      )}

      {/* ProffieOS reference tooltip */}
      {entry.proffieRef && (
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <HelpTooltip text={entry.description} proffie={entry.proffieRef} />
        </div>
      )}
    </div>
  );
}

// ─── Search bar ─────────────────────────────────────────────────────────

function SearchBar({
  query,
  onChange,
}: {
  query: string;
  onChange: (q: string) => void;
}) {
  return (
    <div className="px-1 py-1">
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search defines..."
        className="w-full px-2 py-1 text-[11px] bg-bg-deep/40 border border-border-subtle rounded placeholder:text-text-muted/40 focus:outline-none focus:border-accent/40"
      />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

export function Fett263PropEditor({
  activeDefines,
  onDefinesChange,
}: Fett263PropEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Parse active defines into names + values
  const activeNames = useMemo(() => extractDefineNames(activeDefines), [activeDefines]);
  const values = useMemo(() => extractValues(activeDefines), [activeDefines]);

  // Validate all active defines
  const validations = useMemo(() => {
    const result = new Map<string, DefineValidation>();
    for (const define of activeNames) {
      result.set(define, validateDefine(define, Array.from(activeNames)));
    }
    return result;
  }, [activeNames]);

  // Count total warnings
  const warningCount = useMemo(() => {
    let count = 0;
    for (const v of validations.values()) {
      if (!v.valid) count++;
    }
    return count;
  }, [validations]);

  // Search filter
  const filteredDefines = useMemo(() => {
    if (searchQuery.trim().length < 2) return null;
    const q = searchQuery.toLowerCase();
    return FETT263_DEFINES_DEDUPED.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.define.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  // Toggle a define on/off
  const handleToggle = useCallback(
    (define: string) => {
      const currentNames = extractDefineNames(activeDefines);
      const currentValues = extractValues(activeDefines);

      if (currentNames.has(define)) {
        // Remove it
        currentNames.delete(define);
      } else {
        // Add it
        currentNames.add(define);
      }

      // Rebuild the output array
      const output: string[] = [];
      for (const name of currentNames) {
        const val = currentValues.get(name);
        output.push(formatDefineForCodegen(name, val));
      }
      onDefinesChange(output);
    },
    [activeDefines, onDefinesChange],
  );

  // Change a numeric value
  const handleValueChange = useCallback(
    (define: string, newValue: number) => {
      const currentNames = extractDefineNames(activeDefines);
      const currentValues = extractValues(activeDefines);
      currentValues.set(define, newValue);

      // Rebuild the output array
      const output: string[] = [];
      for (const name of currentNames) {
        const val = currentValues.get(name);
        output.push(formatDefineForCodegen(name, val));
      }
      onDefinesChange(output);
    },
    [activeDefines, onDefinesChange],
  );

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
          Fett263 Prop Defines
          <HelpTooltip
            text="Configure all Fett263 prop file #define options. Each toggle adds a #define to your config.h that changes saber behavior."
          />
        </h3>
        <div className="flex items-center gap-2">
          {warningCount > 0 && (
            <span className="text-[10px] text-status-error font-medium">
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[10px] text-text-muted font-mono">
            {activeNames.size} active
          </span>
        </div>
      </div>

      {/* Search */}
      <SearchBar query={searchQuery} onChange={setSearchQuery} />

      {/* Search results */}
      {filteredDefines !== null ? (
        <div className="space-y-px">
          {filteredDefines.length === 0 ? (
            <p className="text-[10px] text-text-muted text-center py-3">
              No defines match &ldquo;{searchQuery}&rdquo;
            </p>
          ) : (
            filteredDefines.map((d) => (
              <DefineRow
                key={d.define}
                entry={d}
                isActive={activeNames.has(d.define)}
                value={values.get(d.define)}
                validation={validations.get(d.define)}
                onToggle={handleToggle}
                onValueChange={handleValueChange}
                noBmActive={
                  getNoBmVariant(d.define)
                    ? activeNames.has(getNoBmVariant(d.define)!)
                    : false
                }
              />
            ))
          )}
        </div>
      ) : (
        /* Category browser */
        <div className="space-y-1">
          {FETT263_CATEGORY_ORDER.map((cat) => {
            const defines = FETT263_DEFINES_DEDUPED.filter(
              (d) => d.category === cat,
            );
            if (defines.length === 0) return null;
            return (
              <CategorySection
                key={cat}
                category={cat}
                defines={defines}
                activeNames={activeNames}
                values={values}
                onToggle={handleToggle}
                onValueChange={handleValueChange}
                validations={validations}
              />
            );
          })}
        </div>
      )}

      {/* Codegen preview footer */}
      <div
        className="text-[10px] text-text-muted bg-bg-deep/40 rounded p-2 border border-border-subtle font-mono space-y-0.5"
        role="status"
        aria-live="polite"
      >
        <p className="text-text-secondary font-sans text-[10px] mb-1">
          Output preview — these lines appear in your config.h:
        </p>
        {activeDefines.length === 0 ? (
          <p className="text-text-muted italic font-sans">No defines active</p>
        ) : (
          activeDefines.map((d) => (
            <p key={d} className="text-accent/80">
              #define {d}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
