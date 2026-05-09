// ─── TemplateTreeNode ─────────────────────────────────────────────────
//
// Recursive tree node renderer for the ProffieOS template AST.
// Renders template name + color swatch + annotations + collapse toggle.
// Pure presentational — no engine deps, no store reads.

'use client';

import { useState, useMemo } from 'react';
import type { TemplateNode } from '@kyberstation/template-eval';
import {
  getParamAnnotation,
  isColorNode,
  isNamedColorNode,
  extractRgbFromNode,
  namedColorToRgb,
} from '../../../lib/templateAnnotations';

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
  if (name.endsWith('L') && name !== 'AlphaL' && name.includes('Lockup') || name.includes('Blast')
    || name.includes('Clash') || name.includes('Stab') || name.includes('Drag')
    || name === 'AlphaL' || name === 'InOutTrL' || name === 'InOutHelperL'
    || name === 'TransitionEffectL' || name === 'MultiTransitionEffectL'
    || name === 'OnSparkL') return 'wrapper';
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
}

function ColorSwatch({ r, g, b }: ColorSwatchProps) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-sm border border-border-subtle align-middle ml-1.5"
      style={{ backgroundColor: `rgb(${r},${g},${b})` }}
      title={`rgb(${r}, ${g}, ${b})`}
      aria-label={`Color: rgb(${r}, ${g}, ${b})`}
    />
  );
}

// ─── Tree Node ─

export interface TemplateTreeNodeProps {
  node: TemplateNode;
  depth?: number;
  parentName?: string;
  argIndex?: number;
}

export function TemplateTreeNode({
  node,
  depth = 0,
  parentName,
  argIndex,
}: TemplateTreeNodeProps) {
  const hasChildren = node.args.length > 0;
  const isLiteral = isIntegerLiteral(node.name);

  // Auto-collapse deep nodes; top-level nodes start expanded
  const [collapsed, setCollapsed] = useState(depth >= AUTO_COLLAPSE_DEPTH);

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

        {/* Node name */}
        {isLiteral ? (
          <span className={`text-xs font-mono ${nameClass}`}>
            {node.name}
          </span>
        ) : (
          <span className={`text-xs font-semibold ${nameClass}`}>
            {node.name}
          </span>
        )}

        {/* Color swatch for Rgb<> and named colors */}
        {colorRgb && <ColorSwatch r={colorRgb.r} g={colorRgb.g} b={colorRgb.b} />}

        {/* Inline arg preview for leaf nodes with few children */}
        {hasChildren && collapsed && node.args.length <= 4 && (
          <span className="text-xs text-text-muted ml-1 font-mono truncate">
            {'<'}
            {node.args.map((a, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {isIntegerLiteral(a.name) ? a.name : a.name}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
