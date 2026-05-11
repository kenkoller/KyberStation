// ─── TemplateTreeNode ─────────────────────────────────────────────────
//
// Recursive tree node renderer for the ProffieOS template AST.
// Renders template name + color swatch + annotations + collapse toggle.
//
// Phase 5A: Pure read-only rendering.
// Phase 5D: Inline editing — click-to-edit integer values, color picker
//           on Rgb swatches. Edits flow up via onNodeChange callback.

'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import type { TemplateNode } from '@kyberstation/template-eval';
import {
  getParamAnnotation,
  isColorNode,
  isNamedColorNode,
  extractRgbFromNode,
  namedColorToRgb,
} from '../../../lib/templateAnnotations';
import { rgbToHex, hexToRgb } from '../../../lib/templateSerializer';

// ─── Constants ─

/** Default collapsed state for nodes deeper than this. */
const AUTO_COLLAPSE_DEPTH = 4;

/** Icon glyphs for collapse/expand. */
const CHEVRON_DOWN = '▾';
const CHEVRON_RIGHT = '▸';

// ─── Helpers ─

function isIntegerLiteral(name: string): boolean {
  return /^-?\d+$/.test(name);
}

/** Determine the category of a template for subtle color coding. */
function getNodeCategory(name: string): 'color' | 'function' | 'transition' | 'wrapper' | 'style' | 'literal' {
  if (isIntegerLiteral(name)) return 'literal';
  if (isColorNode(name) || isNamedColorNode(name)) return 'color';
  if (name.startsWith('Tr')) return 'transition';
  if (name === 'AlphaL' || name === 'InOutTrL' || name === 'InOutHelperL'
    || name === 'TransitionEffectL' || name === 'MultiTransitionEffectL'
    || name === 'OnSparkL'
    || name.includes('LockupTr') || name.includes('BlastL')
    || name.includes('ClashL') || name.includes('StabL') || name.includes('DragL')
    || name.includes('ResponsiveLockup') || name.includes('ResponsiveBlast')
    || name.includes('ResponsiveClash') || name.includes('ResponsiveStab')
    || name.includes('ResponsiveDrag') || name.includes('ResponsiveMelt')
    || name.includes('ResponsiveLightningBlock')
  ) return 'wrapper';
  if (['Int', 'Scale', 'InvertF', 'Sin', 'Saw', 'Bump', 'SmoothStep',
    'SwingSpeed', 'SwingAcceleration', 'ClashImpactF', 'NoisySoundLevel',
    'SmoothSoundLevel', 'Percentage', 'VolumeLevel', 'ChangeSlowly',
    'ClampF', 'IfOn', 'ModF', 'BendTimePowX', 'Trigger', 'EffectPulseF',
    'Mult', 'Sum', 'Subtract', 'Divide', 'HoldPeakF', 'IsLessThan',
    'IsGreaterThan', 'TimeSinceEffect', 'WavLen', 'WavNum',
    'EffectRandomF', 'EffectPosition', 'IntArg', 'BladeAngle',
  ].includes(name)) return 'function';
  return 'style';
}

/** CSS class suffix per category for subtle color tinting. */
const CATEGORY_CLASSES: Record<ReturnType<typeof getNodeCategory>, string> = {
  color:      'text-emerald-400',
  function:   'text-sky-400',
  transition: 'text-amber-400',
  wrapper:    'text-purple-400',
  style:      'text-text-primary',
  literal:    'text-orange-300',
};

// ─── Color Swatch ─

interface ColorSwatchProps {
  r: number;
  g: number;
  b: number;
  editable?: boolean;
  onClick?: () => void;
}

function ColorSwatch({ r, g, b, editable, onClick }: ColorSwatchProps) {
  return (
    <span
      className={[
        'inline-block w-3 h-3 rounded-sm border border-border-subtle align-middle ml-1.5',
        editable ? 'cursor-pointer hover:ring-1 hover:ring-accent' : '',
      ].join(' ')}
      style={{ backgroundColor: `rgb(${r},${g},${b})` }}
      title={`rgb(${r}, ${g}, ${b})${editable ? ' — click to edit' : ''}`}
      aria-label={`Color: rgb(${r}, ${g}, ${b})${editable ? '. Click to edit.' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    />
  );
}

// ─── Inline Integer Editor ─

interface InlineEditorProps {
  initialValue: string;
  onApply: (value: string) => void;
  onCancel: () => void;
}

function InlineEditor({ initialValue, onApply, onCancel }: InlineEditorProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const isValid = /^-?\d+$/.test(value.trim());

  // Auto-focus + select on mount
  useEffect(() => {
    const el = inputRef.current;
    if (el) { el.focus(); el.select(); }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation(); // prevent global keyboard shortcuts
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isValid) onApply(value.trim());
      else onCancel(); // revert on invalid
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  function handleBlur() {
    if (isValid && value.trim() !== initialValue) {
      onApply(value.trim());
    } else {
      onCancel();
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      className={[
        'w-14 h-5 text-xs font-mono bg-bg-deep px-1 rounded-sm',
        'focus:outline-none focus:ring-1',
        isValid
          ? 'border border-border-subtle focus:ring-accent text-orange-300'
          : 'border border-red-500 focus:ring-red-500 text-red-400',
      ].join(' ')}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      aria-label="Edit integer value"
      aria-invalid={!isValid}
    />
  );
}

// ─── Tree Node ─

export interface TemplateTreeNodeProps {
  node: TemplateNode;
  depth?: number;
  parentName?: string;
  argIndex?: number;
  /** Index path from the AST root, e.g. [1, 2] = root.args[1].args[2]. */
  path?: number[];
  /** Callback when a node is edited. Receives the path and the new node. */
  onNodeChange?: (path: number[], newNode: TemplateNode) => void;
  /** Move a child within a Layers<> node. parentPath + from/to indices. */
  onMoveChild?: (parentPath: number[], fromIndex: number, toIndex: number) => void;
  /** Remove a child from a Layers<> node. */
  onRemoveChild?: (parentPath: number[], childIndex: number) => void;
  /** Duplicate a child in a Layers<> node. */
  onDuplicateChild?: (parentPath: number[], childIndex: number) => void;
  /** Add a new child to a Layers<> node. */
  onAddChild?: (parentPath: number[], child: TemplateNode) => void;
  /** Total sibling count (for move up/down boundary logic). */
  siblingCount?: number;
}

export function TemplateTreeNode({
  node,
  depth = 0,
  parentName,
  argIndex,
  path,
  onNodeChange,
  onMoveChild,
  onRemoveChild,
  onDuplicateChild,
  onAddChild,
  siblingCount,
}: TemplateTreeNodeProps) {
  const hasChildren = node.args.length > 0;
  const isLiteral = isIntegerLiteral(node.name);
  const isEditable = !!onNodeChange;

  // Is this node a Layers<> container? Show layer controls on children.
  const isLayersNode = node.name === 'Layers';
  // Is this node a child of a Layers<> container?
  const isLayerChild = parentName === 'Layers' && argIndex !== undefined;
  const canMoveUp = isLayerChild && argIndex > 0;
  const canMoveDown = isLayerChild && siblingCount !== undefined && argIndex < siblingCount - 1;
  const canRemove = isLayerChild && siblingCount !== undefined && siblingCount > 1;

  // Auto-collapse deep nodes; top-level nodes start expanded
  const [collapsed, setCollapsed] = useState(depth >= AUTO_COLLAPSE_DEPTH);

  // Inline editing state for integer literals
  const [isEditing, setIsEditing] = useState(false);

  // Color input ref for Rgb swatch picker
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Detect color nodes for swatches
  const colorRgb = useMemo(() => {
    if (node.name === 'Rgb' && node.args.length === 3) {
      return extractRgbFromNode(node.args);
    }
    if (isNamedColorNode(node.name) && node.args.length === 0) {
      return namedColorToRgb(node.name);
    }
    return null;
  }, [node.name, node.args]);

  // Get annotation for this arg position from parent
  const annotation = parentName !== undefined && argIndex !== undefined
    ? getParamAnnotation(parentName, argIndex)
    : undefined;

  const category = getNodeCategory(node.name);
  const nameClass = CATEGORY_CLASSES[category];

  // Indent: 16px per depth level
  const paddingLeft = depth * 16 + 4;

  // Can this node's color be edited? Only Rgb<r,g,b> nodes (not named colors).
  const isRgbEditable = isEditable && node.name === 'Rgb' && node.args.length === 3 && colorRgb !== null;

  // ─── Edit handlers ─

  function handleStartEdit() {
    if (!isEditable || !isLiteral) return;
    setIsEditing(true);
  }

  function handleApplyEdit(newValue: string) {
    setIsEditing(false);
    if (newValue === node.name) return; // no change
    onNodeChange?.(path ?? [], { name: newValue, args: [] });
  }

  function handleCancelEdit() {
    setIsEditing(false);
  }

  function handleSwatchClick() {
    colorInputRef.current?.click();
  }

  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rgb = hexToRgb(e.target.value);
    if (!rgb) return;
    onNodeChange?.(path ?? [], {
      name: 'Rgb',
      args: [
        { name: String(rgb.r), args: [] },
        { name: String(rgb.g), args: [] },
        { name: String(rgb.b), args: [] },
      ],
    });
  }

  return (
    <div role="treeitem" aria-expanded={hasChildren ? !collapsed : undefined}>
      <div
        className="flex items-center min-h-[24px] hover:bg-bg-card/40 rounded-sm cursor-default group"
        style={{ paddingLeft }}
      >
        {/* Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-4 h-4 flex items-center justify-center text-text-muted hover:text-text-primary shrink-0 text-xs"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? CHEVRON_RIGHT : CHEVRON_DOWN}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Node name — editable for integer literals */}
        {isLiteral && isEditing ? (
          <InlineEditor
            initialValue={node.name}
            onApply={handleApplyEdit}
            onCancel={handleCancelEdit}
          />
        ) : isLiteral ? (
          <span
            className={[
              'text-xs font-mono',
              nameClass,
              isEditable ? 'cursor-pointer hover:bg-bg-card/60 px-0.5 rounded-sm' : '',
            ].join(' ')}
            onClick={isEditable ? handleStartEdit : undefined}
            title={isEditable ? 'Click to edit' : undefined}
            role={isEditable ? 'button' : undefined}
            aria-label={isEditable ? `Edit value ${node.name}` : undefined}
          >
            {node.name}
          </span>
        ) : (
          <span className={`text-xs font-semibold ${nameClass}`}>
            {node.name}
          </span>
        )}

        {/* Color swatch for Rgb<> and named colors */}
        {colorRgb && (
          <>
            <ColorSwatch
              r={colorRgb.r}
              g={colorRgb.g}
              b={colorRgb.b}
              editable={isRgbEditable}
              onClick={isRgbEditable ? handleSwatchClick : undefined}
            />
            {/* Hidden color input — only for editable Rgb nodes */}
            {isRgbEditable && (
              <input
                ref={colorInputRef}
                type="color"
                className="sr-only"
                value={rgbToHex(colorRgb.r, colorRgb.g, colorRgb.b)}
                onChange={handleColorChange}
                aria-label="Pick color"
                tabIndex={-1}
              />
            )}
          </>
        )}

        {/* Inline arg preview for leaf nodes with few children */}
        {hasChildren && collapsed && node.args.length <= 4 && (
          <span className="text-xs text-text-muted ml-1 font-mono truncate">
            {'<'}
            {node.args.map((a, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {a.name}
              </span>
            ))}
            {'>'}
          </span>
        )}

        {/* Child count badge when collapsed with many children */}
        {hasChildren && collapsed && node.args.length > 4 && (
          <span className="text-[10px] text-text-muted ml-1.5 bg-bg-deep/60 px-1 rounded">
            {node.args.length} args
          </span>
        )}

        {/* Annotation from parent */}
        {annotation && (
          <span className="text-[10px] text-text-muted/60 ml-2 italic truncate">
            {annotation}
          </span>
        )}

        {/* Layer child controls — shown on hover */}
        {isLayerChild && isEditable && (
          <span className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
            {canMoveUp && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveChild?.(path!.slice(0, -1), argIndex!, argIndex! - 1); }}
                className="w-4 h-4 flex items-center justify-center text-[10px] text-text-muted hover:text-text-primary hover:bg-bg-card/60 rounded"
                title="Move layer up"
                aria-label="Move layer up"
              >
                ↑
              </button>
            )}
            {canMoveDown && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveChild?.(path!.slice(0, -1), argIndex!, argIndex! + 1); }}
                className="w-4 h-4 flex items-center justify-center text-[10px] text-text-muted hover:text-text-primary hover:bg-bg-card/60 rounded"
                title="Move layer down"
                aria-label="Move layer down"
              >
                ↓
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicateChild?.(path!.slice(0, -1), argIndex!); }}
              className="w-4 h-4 flex items-center justify-center text-[10px] text-text-muted hover:text-text-primary hover:bg-bg-card/60 rounded"
              title="Duplicate layer"
              aria-label="Duplicate layer"
            >
              ⊕
            </button>
            {canRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveChild?.(path!.slice(0, -1), argIndex!); }}
                className="w-4 h-4 flex items-center justify-center text-[10px] text-status-error/70 hover:text-status-error hover:bg-bg-card/60 rounded"
                title="Remove layer"
                aria-label="Remove layer"
              >
                ×
              </button>
            )}
          </span>
        )}
      </div>

      {/* Recursive children */}
      {hasChildren && !collapsed && (
        <div role="group">
          {node.args.map((child, i) => (
            <TemplateTreeNode
              key={`${child.name}-${i}`}
              node={child}
              depth={depth + 1}
              parentName={node.name}
              argIndex={i}
              path={[...(path ?? []), i]}
              onNodeChange={onNodeChange}
              onMoveChild={onMoveChild}
              onRemoveChild={onRemoveChild}
              onDuplicateChild={onDuplicateChild}
              onAddChild={onAddChild}
              siblingCount={node.args.length}
            />
          ))}
          {/* Add layer button at bottom of Layers<> children */}
          {isLayersNode && isEditable && (
            <div style={{ paddingLeft: (depth + 1) * 16 + 4 }}>
              <button
                onClick={() => onAddChild?.(path ?? [], { name: 'AlphaL', args: [{ name: 'White', args: [] }, { name: 'Int', args: [{ name: '0', args: [] }] }] })}
                className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent py-0.5 px-1 rounded hover:bg-bg-card/40 transition-colors"
                title="Add new layer — inserts AlphaL<White, Int<0>> (transparent overlay)"
                aria-label="Add layer"
              >
                <span className="text-xs">+</span>
                <span>Add layer</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
