'use client';

// ─── ExpressionEditor — v1.1 Core math-formula UI ────────────────────
//
// Small inline editor for authoring expression-driven modulation
// bindings. The engine's peggy parser + tree-walk evaluator are live
// (714 tests); this is the UI that feeds them.
//
// Interaction:
//   - A Slider renders a tiny "fx" button next to its amount readout
//   - Click opens this component as a popover below the slider
//   - User types the expression (e.g. `sin(time * 0.001) * 0.5 + 0.5`)
//   - Live parse status: green ✓ parses, red ✕ with peggy error text
//   - Apply button creates a binding with source: null + expression
//     set, bypassed: false, combinator: 'replace' (expressions drive
//     the full target value by default; user can change combinator
//     afterwards via the binding row)
//   - Escape / click outside closes without saving
//
// Scope: v1.1 Core. v1.0 Preview already ships the BETA label on the
// ROUTING pill so users know to expect rough edges here. The parser
// fixtures (63 accept / 61 reject) cover the grammar comprehensively.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  parseExpression,
  type ExpressionNode,
  type SerializedBinding,
} from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import { useBoardProfile } from '@/hooks/useBoardProfile';
import { canBoardModulate } from '@/lib/boardProfiles';

export interface ExpressionEditorProps {
  /** Target parameter path the expression drives. */
  targetPath: string;
  /** Human-readable param label for the header. */
  targetLabel: string;
  /** Called to dismiss the editor (Escape / outside click / after Apply). */
  onClose: () => void;
  /** Initial expression text to pre-populate — e.g. editing an existing binding. */
  initialSource?: string;
  /** If provided, Apply replaces this binding instead of creating a new one. */
  existingBindingId?: string;
}

interface ParseState {
  readonly kind: 'empty' | 'ok' | 'error';
  readonly ast?: ExpressionNode;
  readonly message?: string;
  readonly location?: { line?: number; column?: number };
}

function parseState(source: string): ParseState {
  const trimmed = source.trim();
  if (trimmed.length === 0) return { kind: 'empty' };
  try {
    const ast = parseExpression(trimmed);
    return { kind: 'ok', ast };
  } catch (err) {
    const e = err as { message?: string; location?: { line?: number; column?: number } };
    return {
      kind: 'error',
      message: e.message ?? 'Parse failed',
      location: e.location,
    };
  }
}

function newBindingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `expr-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

const SAMPLE_EXPRESSIONS = [
  { label: 'Breathing', source: 'sin(time * 0.001) * 0.5 + 0.5' },
  { label: 'Heartbeat', source: 'abs(sin(time * 0.002))' },
  { label: 'Battery dim', source: 'clamp(1 - battery, 0, 0.5)' },
  { label: 'Swing doubled', source: 'clamp(swing * 2, 0, 1)' },
  { label: 'Loud OR fast', source: 'max(sound, swing)' },
];

export function ExpressionEditor({
  targetPath,
  targetLabel,
  onClose,
  initialSource = '',
  existingBindingId,
}: ExpressionEditorProps) {
  const boardId = useBoardProfile().boardId;
  const addBinding = useBladeStore((s) => s.addBinding);
  const updateBinding = useBladeStore((s) => s.updateBinding);
  const [source, setSource] = useState(initialSource);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => parseState(source), [source]);

  // Escape-to-close + click-outside-to-close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    // One-tick delay so the click that opened us doesn't immediately
    // trigger the outside-click listener.
    const id = window.setTimeout(() => {
      window.addEventListener('click', onClick);
    }, 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
      window.clearTimeout(id);
    };
  }, [onClose]);

  // Auto-focus the textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const boardSupports = canBoardModulate(boardId);

  const handleApply = useCallback(() => {
    if (parsed.kind !== 'ok' || !parsed.ast) return;
    if (!boardSupports) return;
    const trimmedSource = source.trim();
    if (existingBindingId) {
      updateBinding(existingBindingId, {
        source: null,
        expression: { source: trimmedSource, ast: parsed.ast },
      });
    } else {
      const binding: SerializedBinding = {
        id: newBindingId(),
        source: null,
        expression: { source: trimmedSource, ast: parsed.ast },
        target: targetPath,
        combinator: 'replace',
        amount: 1.0,
        bypassed: false,
        label: `fx: ${trimmedSource.slice(0, 40)}${trimmedSource.length > 40 ? '…' : ''} → ${targetLabel}`,
      };
      addBinding(binding);
    }
    onClose();
  }, [
    parsed,
    source,
    boardSupports,
    existingBindingId,
    addBinding,
    updateBinding,
    targetPath,
    targetLabel,
    onClose,
  ]);

  const canSave = parsed.kind === 'ok' && boardSupports;

  return (
    <div
      ref={containerRef}
      className="absolute z-50 mt-1 p-3 rounded border border-border-light bg-bg-deep/95 backdrop-blur-sm shadow-xl"
      style={{
        width: 380,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(var(--status-magenta), 0.3)',
      }}
      role="dialog"
      aria-label={`Edit expression for ${targetLabel}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-col gap-0.5">
          <span
            className="font-mono uppercase tracking-wider text-ui-xs"
            style={{ color: 'rgb(var(--status-magenta))' }}
          >
            fx · {targetLabel}
          </span>
          <span className="text-[9px] font-mono uppercase text-text-muted/70">
            {targetPath}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-ui-sm"
          title="Close (Esc)"
          aria-label="Close expression editor"
        >
          ×
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (canSave) handleApply();
          }
        }}
        placeholder="sin(time * 0.001) * 0.5 + 0.5"
        rows={3}
        spellCheck={false}
        className="w-full px-2 py-1.5 font-mono text-ui-sm bg-bg-surface border border-border-subtle rounded focus:outline-none focus:border-accent resize-y"
        style={{ minHeight: 44 }}
        aria-label="Expression source"
        aria-invalid={parsed.kind === 'error'}
      />

      {/* Parse status */}
      <div className="mt-1.5 min-h-[20px] text-ui-xs">
        {parsed.kind === 'empty' && (
          <span className="text-text-muted/70">
            Type an expression. ⌘+Enter to apply.
          </span>
        )}
        {parsed.kind === 'ok' && (
          <span style={{ color: 'rgb(var(--status-ok))' }}>
            ✓ Valid expression
          </span>
        )}
        {parsed.kind === 'error' && (
          <span
            className="block"
            style={{ color: 'rgb(var(--status-error))' }}
          >
            ✕ {parsed.message}
          </span>
        )}
      </div>

      {/* Quick-insert templates */}
      <div className="mt-2 pt-2 border-t border-border-subtle">
        <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted/70 mb-1">
          Starters
        </div>
        <div className="flex flex-wrap gap-1">
          {SAMPLE_EXPRESSIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setSource(s.source)}
              className="px-2 py-0.5 rounded text-[10px] font-mono border border-border-subtle text-text-muted hover:text-accent hover:border-accent transition-colors"
              title={s.source}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted/70">
          vars: swing · angle · twist · sound · battery · time · clash
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded text-ui-xs text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-light transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!canSave}
            className="px-3 py-1 rounded text-ui-xs font-mono uppercase tracking-wider border transition-colors"
            style={{
              color: canSave ? 'rgb(var(--status-magenta))' : 'rgb(var(--text-muted))',
              background: canSave ? 'rgba(var(--status-magenta), 0.1)' : 'transparent',
              borderColor: canSave
                ? 'rgb(var(--status-magenta))'
                : 'rgb(var(--border-subtle))',
              cursor: canSave ? 'pointer' : 'not-allowed',
              opacity: canSave ? 1 : 0.5,
            }}
            title={canSave ? 'Apply expression (⌘+Enter)' : 'Fix errors first'}
          >
            {existingBindingId ? 'Update' : 'Wire'}
          </button>
        </div>
      </div>
    </div>
  );
}
