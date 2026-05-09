// ─── TemplateTreePanel ────────────────────────────────────────────────
//
// Phase 5A: Read-only template tree view for imported ProffieOS styles.
// Parses the active config's importedRawCode into a TemplateNode AST
// and renders a collapsible tree with color swatches and annotations.
//
// Visibility gate (Phase 5E): only shown when:
//   - The engine is in 'template-eval' render mode, OR
//   - The config has importedRawCode
//
// This panel is read-only in Phase 5A. Inline editing (Phase 5D) and
// layer controls (Phase 5C) will be added in follow-up PRs.

'use client';

import { useMemo } from 'react';
import { parseTemplateString } from '@kyberstation/template-eval';
import type { TemplateNode } from '@kyberstation/template-eval';
import { useBladeStore } from '../../../stores/bladeStore';
import { TemplateTreeNode } from './TemplateTreeNode';

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

// ─── Main Panel ─

export interface TemplateTreePanelProps {
  /** Override the template string (for testing). When omitted, reads from bladeStore. */
  templateString?: string;
}

export function TemplateTreePanel({ templateString }: TemplateTreePanelProps) {
  // Read importedRawCode from the active config
  const storeRawCode = useBladeStore((s) => s.config.importedRawCode);
  const rawCode = templateString ?? storeRawCode;

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
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-1"
        role="tree"
        aria-label="ProffieOS template structure"
      >
        <TemplateTreeNode node={node} />
      </div>
    </div>
  );
}
