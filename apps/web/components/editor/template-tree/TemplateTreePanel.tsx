// ─── TemplateTreePanel ────────────────────────────────────────────────
//
// Phase 5A: Read-only template tree view for imported ProffieOS styles.
// Phase 5D: Inline editing — integer values + Rgb color picker.
// Phase 6:  Style Transformation Tools — Expand, Layerize, Argify, Rotate.
// Phase 7:  Template Insertion Palette — categorized template browser.
//
// Parses the active config's importedRawCode into a TemplateNode AST
// and renders a collapsible tree with color swatches and annotations.
// Edits flow back to the store: tree edit → AST update → serialize →
// bladeStore.updateConfig({ importedRawCode }).
//
// Visibility gate (Phase 5E): only shown when:
//   - The engine is in 'template-eval' render mode, OR
//   - The config has importedRawCode

'use client';

import { useState, useMemo, useCallback } from 'react';
import { parseTemplateString } from '@kyberstation/template-eval';
import type { TemplateNode } from '@kyberstation/template-eval';
import { useBladeStore } from '../../../stores/bladeStore';
import { TemplateTreeNode } from './TemplateTreeNode';
import { TemplateInsertionPalette } from './TemplateInsertionPalette';
import {
  templateNodeToString,
  updateNodeAtPath,
  getNodeAtPath,
  moveChildAtPath,
  insertChildAtPath,
  removeChildAtPath,
  duplicateChildAtPath,
} from '../../../lib/templateSerializer';
import {
  expandTemplate,
  isExpandable,
  layerizeTemplate,
  isLayerizable,
  argifyTemplate,
  isArgifiable,
  rotateTemplate,
  isRotatable,
} from '../../../lib/templateTransformations';

// ─── Node statistics ─

interface TreeStats {
  totalNodes: number;
  maxDepth: number;
  colorNodes: number;
  layerCount: number;
}

function computeStats(node: TemplateNode, depth: number = 0): TreeStats {
  let totalNodes = 1;
  let maxDepth = depth;
  let colorNodes = 0;
  let layerCount = 0;

  if (node.name === 'Rgb' || node.name === 'Rgb16') colorNodes++;
  if (node.name === 'Layers') layerCount = node.args.length;

  for (const child of node.args) {
    const childStats = computeStats(child, depth + 1);
    totalNodes += childStats.totalNodes;
    maxDepth = Math.max(maxDepth, childStats.maxDepth);
    colorNodes += childStats.colorNodes;
    if (childStats.layerCount > layerCount) layerCount = childStats.layerCount;
  }

  return { totalNodes, maxDepth, colorNodes, layerCount };
}

// ─── Parse error display ─

function ParseError({ message, raw }: { message: string; raw: string }) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-status-error">
        <span className="text-base">✕</span>
        <span>Parse error</span>
      </div>
      <p className="text-[11px] text-text-muted">{message}</p>
      <pre className="text-[10px] text-text-muted/60 font-mono bg-bg-deep/40 p-2 rounded overflow-x-auto max-h-32">
        {raw.slice(0, 500)}
        {raw.length > 500 && '...'}
      </pre>
    </div>
  );
}

// ─── Empty state ─

function EmptyState() {
  return (
    <div className="p-4 text-center space-y-2">
      <p className="text-xs text-text-muted">No template loaded</p>
      <p className="text-[11px] text-text-muted/60">
        Import a Fett263 or ProffieOS style in the Output tab to see its template tree here.
      </p>
    </div>
  );
}

// ─── Stats bar ─

function StatsBar({ stats }: { stats: TreeStats }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-text-muted border-b border-border-subtle">
      <span>{stats.totalNodes} nodes</span>
      <span>depth {stats.maxDepth}</span>
      {stats.colorNodes > 0 && <span>{stats.colorNodes} colors</span>}
      {stats.layerCount > 0 && <span>{stats.layerCount} layers</span>}
    </div>
  );
}

// ─── Transformation toolbar ─

interface TransformToolbarProps {
  node: TemplateNode;
  onTransform: (newCode: string) => void;
}

function TransformToolbar({ node, onTransform }: TransformToolbarProps) {
  const canExpand = isExpandable(node);
  const canLayerize = isLayerizable(node);
  const canArgify = isArgifiable(node);
  const canRotate = isRotatable(node);

  const noneApplicable = !canExpand && !canLayerize && !canArgify && !canRotate;
  if (noneApplicable) return null;

  const handleExpand = () => {
    onTransform(templateNodeToString(expandTemplate(node)));
  };

  const handleLayerize = () => {
    onTransform(templateNodeToString(layerizeTemplate(node)));
  };

  const handleArgify = () => {
    const { result } = argifyTemplate(node);
    onTransform(templateNodeToString(result));
  };

  const handleRotate = () => {
    onTransform(templateNodeToString(rotateTemplate(node, 1)));
  };

  return (
    <>
      <span className="text-[10px] text-text-muted mr-1">Transform</span>
      {canExpand && (
        <button
          onClick={handleExpand}
          className="px-2 py-0.5 text-[10px] rounded bg-bg-card/60 hover:bg-accent/20 text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
          title="Expand shorthand (StylePtr, StyleNormalPtr) to full form"
        >
          Expand
        </button>
      )}
      {canLayerize && (
        <button
          onClick={handleLayerize}
          className="px-2 py-0.5 text-[10px] rounded bg-bg-card/60 hover:bg-accent/20 text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
          title="Wrap root in Layers<> for layer editing"
        >
          Layerize
        </button>
      )}
      {canArgify && (
        <button
          onClick={handleArgify}
          className="px-2 py-0.5 text-[10px] rounded bg-bg-card/60 hover:bg-accent/20 text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
          title="Wrap values in IntArg/RgbArg for OLED editing"
        >
          Argify
        </button>
      )}
      {canRotate && (
        <button
          onClick={handleRotate}
          className="px-2 py-0.5 text-[10px] rounded bg-bg-card/60 hover:bg-accent/20 text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
          title="Rotate ColorChange color arguments"
        >
          Rotate
        </button>
      )}
    </>
  );
}

// ─── Main Panel ─

export interface TemplateTreePanelProps {
  /** Override the template string (for testing). When omitted, reads from bladeStore. */
  templateString?: string;
}

export function TemplateTreePanel({ templateString }: TemplateTreePanelProps) {
  // Read importedRawCode from the active config
  const storeRawCode = useBladeStore((s) => s.config.importedRawCode);
  const updateConfig = useBladeStore((s) => s.updateConfig);
  const rawCode = templateString ?? storeRawCode;

  // Phase 7: palette visibility toggle
  const [showPalette, setShowPalette] = useState(false);

  // Parse the template string into an AST
  const parseResult = useMemo(() => {
    if (!rawCode || rawCode.trim().length === 0) {
      return { node: null, error: null };
    }

    try {
      const node = parseTemplateString(rawCode);
      if (!node) {
        return { node: null, error: 'Failed to parse template string' };
      }
      return { node, error: null };
    } catch (err) {
      return {
        node: null,
        error: err instanceof Error ? err.message : 'Unknown parse error',
      };
    }
  }, [rawCode]);

  // Compute stats for the info bar
  const stats = useMemo(() => {
    if (!parseResult.node) return null;
    return computeStats(parseResult.node);
  }, [parseResult.node]);

  // ─── Phase 5D: edit handler ─
  //
  // When a node is edited in the tree (integer value changed, Rgb color
  // picked), this callback:
  //   1. Immutably updates the AST at the given path
  //   2. Serializes the modified AST back to a template string
  //   3. Writes the new string to bladeStore.importedRawCode
  //
  // The store update triggers a re-render → re-parse → tree updates.
  // Only wired when NOT using the templateString prop (prop = read-only
  // testing mode; store = live editing mode).
  const handleNodeChange = useCallback(
    (path: number[], newNode: TemplateNode) => {
      const currentNode = parseResult.node;
      if (!currentNode) return;

      const updatedRoot = updateNodeAtPath(currentNode, path, () => newNode);
      const newCode = templateNodeToString(updatedRoot);

      // Write back to store — triggers re-render → re-parse → tree update
      updateConfig({ importedRawCode: newCode });
    },
    [parseResult.node, updateConfig],
  );

  // ─── Phase 5C: layer operations ─
  //
  // Move, add, remove, and duplicate children within Layers<> nodes.
  // Same flow as Phase 5D edits: AST update → serialize → store write.

  const handleMoveChild = useCallback(
    (parentPath: number[], fromIndex: number, toIndex: number) => {
      const currentNode = parseResult.node;
      if (!currentNode) return;
      const updatedRoot = moveChildAtPath(currentNode, parentPath, fromIndex, toIndex);
      updateConfig({ importedRawCode: templateNodeToString(updatedRoot) });
    },
    [parseResult.node, updateConfig],
  );

  const handleRemoveChild = useCallback(
    (parentPath: number[], childIndex: number) => {
      const currentNode = parseResult.node;
      if (!currentNode) return;
      const updatedRoot = removeChildAtPath(currentNode, parentPath, childIndex);
      updateConfig({ importedRawCode: templateNodeToString(updatedRoot) });
    },
    [parseResult.node, updateConfig],
  );

  const handleDuplicateChild = useCallback(
    (parentPath: number[], childIndex: number) => {
      const currentNode = parseResult.node;
      if (!currentNode) return;
      const updatedRoot = duplicateChildAtPath(currentNode, parentPath, childIndex);
      updateConfig({ importedRawCode: templateNodeToString(updatedRoot) });
    },
    [parseResult.node, updateConfig],
  );

  const handleAddChild = useCallback(
    (parentPath: number[], child: TemplateNode) => {
      const currentNode = parseResult.node;
      if (!currentNode) return;
      // Insert at the end (after all existing children)
      const parent = getNodeAtPath(currentNode, parentPath);
      const insertAt = parent ? parent.args.length : 0;
      const updatedRoot = insertChildAtPath(currentNode, parentPath, insertAt, child);
      updateConfig({ importedRawCode: templateNodeToString(updatedRoot) });
    },
    [parseResult.node, updateConfig],
  );

  // ─── Phase 6: transformation handler ─
  const handleTransform = useCallback(
    (newCode: string) => {
      updateConfig({ importedRawCode: newCode });
    },
    [updateConfig],
  );

  // ─── Phase 7: palette insert handler ─
  //
  // Insert a template from the catalog. If the tree has a root node,
  // inserts as a new child of the root (useful when root is Layers<>).
  // Otherwise replaces the entire template string.
  const handlePaletteInsert = useCallback(
    (insertString: string) => {
      if (!rawCode || !parseResult.node) {
        // No existing tree — set the inserted template as the root
        updateConfig({ importedRawCode: insertString });
        return;
      }

      const currentNode = parseResult.node;

      // If root is Layers<> or InOutTrL<>, insert as a child
      if (currentNode.name === 'Layers' || currentNode.name === 'InOutTrL') {
        try {
          const childNode = parseTemplateString(insertString);
          if (childNode) {
            const insertAt = currentNode.name === 'Layers'
              ? currentNode.args.length
              : 1; // For InOutTrL, insert after the first arg (the Layers body)
            const updatedRoot = insertChildAtPath(currentNode, [], insertAt, childNode);
            updateConfig({ importedRawCode: templateNodeToString(updatedRoot) });
            return;
          }
        } catch {
          // Fall through to replace
        }
      }

      // Fallback: wrap in Layers<existing, new>
      updateConfig({ importedRawCode: `Layers<${rawCode},${insertString}>` });
    },
    [rawCode, parseResult.node, updateConfig],
  );

  // Load an example style — replaces the entire template
  const handleLoadExample = useCallback(
    (exampleString: string) => {
      updateConfig({ importedRawCode: exampleString });
    },
    [updateConfig],
  );

  // Editing is only available when reading from the store (not from prop)
  const isLiveEditable = !templateString && !!storeRawCode;

  // Empty state
  if (!rawCode) {
    return <EmptyState />;
  }

  // Parse error
  if (parseResult.error) {
    return <ParseError message={parseResult.error} raw={rawCode} />;
  }

  // Render tree
  const { node } = parseResult;
  if (!node) return <EmptyState />;

  return (
    <div className="flex flex-col h-full">
      {stats && <StatsBar stats={stats} />}
      {isLiveEditable && node && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border-subtle">
          <TransformToolbar node={node} onTransform={handleTransform} />
          <button
            onClick={() => setShowPalette((p) => !p)}
            className={`ml-auto px-2 py-0.5 text-[10px] rounded border transition-colors ${
              showPalette
                ? 'bg-accent/20 text-accent border-accent/40'
                : 'bg-bg-card/60 hover:bg-accent/20 text-text-muted hover:text-text-primary border-border-subtle'
            }`}
            title="Toggle template insertion palette"
          >
            + Templates
          </button>
        </div>
      )}
      {showPalette && isLiveEditable && (
        <div className="border-b border-border-subtle max-h-[280px] overflow-hidden">
          <TemplateInsertionPalette
            onInsert={handlePaletteInsert}
            onLoadExample={handleLoadExample}
          />
        </div>
      )}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-1"
        role="tree"
        aria-label="ProffieOS template structure"
      >
        <TemplateTreeNode
          node={node}
          path={[]}
          onNodeChange={isLiveEditable ? handleNodeChange : undefined}
          onMoveChild={isLiveEditable ? handleMoveChild : undefined}
          onRemoveChild={isLiveEditable ? handleRemoveChild : undefined}
          onDuplicateChild={isLiveEditable ? handleDuplicateChild : undefined}
          onAddChild={isLiveEditable ? handleAddChild : undefined}
        />
      </div>
    </div>
  );
}
