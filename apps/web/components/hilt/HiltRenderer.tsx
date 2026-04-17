'use client';
import { useMemo } from 'react';

import {
  PART_CATALOG,
  getAssembly,
  resolveAssembly,
  type ComposedHilt,
  type HiltAssembly,
  type HiltPart,
  type PartPlacement,
} from '@/lib/hilts';

/**
 * Default stroke colour for detail line-art. Near-white with enough
 * contrast against the metal-body gradient to read clearly at small
 * sizes. Matches docs/HILT_PART_SPEC.md §4.
 */
const DEFAULT_DETAIL_STROKE = '#e4e4e8';
const DEFAULT_DETAIL_STROKE_WIDTH = 1.5;

type HiltOrientation = 'vertical' | 'horizontal';

interface HiltRendererProps {
  /** Assembly id (looked up in the default catalog) OR a pre-composed assembly */
  assemblyId?: string;
  /** Direct assembly override (takes precedence over assemblyId) */
  assembly?: HiltAssembly;
  /** Part catalog override — defaults to the shipped catalog */
  partCatalog?: Record<string, HiltPart>;
  /**
   * Rendered size along the hilt's long axis, in CSS pixels.
   * - vertical: this is the height (hilt is tall)
   * - horizontal: this is the width (hilt is long)
   * The short axis scales to preserve aspect.
   */
  longAxisSize?: number;
  /**
   * Orientation. Vertical = emitter at top (natural SVG), horizontal =
   * emitter at right (90° CW rotation applied inside the SVG viewBox so
   * the outer element's CSS box is correctly sized post-rotation).
   */
  orientation?: HiltOrientation;
  /** Optional accent colour override (applied to all parts' accentFill) */
  accentOverride?: string;
  className?: string;
  /** ARIA label — defaults to assembly.displayName */
  ariaLabel?: string;
}

/**
 * Deterministic gradient id for the metal-body fill. A single instance
 * in the rendered SVG's <defs> serves every part's bodyPath reference.
 */
const METAL_BODY_ID = 'kyber-hilt-metal-body';

/**
 * Renders a composed hilt assembly as a single inline SVG. Each part's
 * bodyPath + optional accentPath + detailPath is rendered in an
 * absolute-positioned `<g>`, stacked according to the composer output.
 */
export function HiltRenderer({
  assemblyId,
  assembly: assemblyProp,
  partCatalog = PART_CATALOG,
  longAxisSize = 96,
  orientation = 'vertical',
  accentOverride,
  className,
  ariaLabel,
}: HiltRendererProps) {
  const composed = useMemo<ComposedHilt | null>(() => {
    const assembly = assemblyProp ?? (assemblyId ? getAssembly(assemblyId) : undefined);
    if (!assembly) return null;
    const { hilt } = resolveAssembly(assembly, partCatalog, 'strict');
    return hilt;
  }, [assemblyId, assemblyProp, partCatalog]);

  if (!composed) {
    return null;
  }

  const { totalWidth, totalHeight, placements } = composed;
  const isHorizontal = orientation === 'horizontal';

  // Short-axis (perpendicular to long axis) size in CSS pixels.
  const shortAxisSize = longAxisSize * (totalWidth / totalHeight);

  // Outer CSS box dimensions — swap when horizontal so layout is correct post-rotation.
  const outerCssWidth = isHorizontal ? longAxisSize : shortAxisSize;
  const outerCssHeight = isHorizontal ? shortAxisSize : longAxisSize;

  // Inner viewBox — swap dimensions when horizontal so rotated content fits.
  const viewBox = isHorizontal
    ? `0 0 ${totalHeight} ${totalWidth}`
    : `0 0 ${totalWidth} ${totalHeight}`;

  // Clockwise 90° rotation matrix — maps (x, y) → (totalHeight - y, x).
  // Keeps content in positive quadrant after rotation: emitter (originally top)
  // ends up at the right side of the horizontal viewBox.
  const contentTransform = isHorizontal
    ? `matrix(0 1 -1 0 ${totalHeight} 0)`
    : undefined;

  const displayName =
    assemblyProp?.displayName
    ?? (assemblyId ? getAssembly(assemblyId)?.displayName : undefined)
    ?? 'Hilt';

  return (
    <svg
      viewBox={viewBox}
      width={outerCssWidth}
      height={outerCssHeight}
      className={className}
      role="img"
      aria-label={ariaLabel ?? `${displayName} hilt`}
    >
      <defs>
        <linearGradient id={METAL_BODY_ID} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3e" />
          <stop offset="60%" stopColor="#26262a" />
          <stop offset="100%" stopColor="#16161a" />
        </linearGradient>
      </defs>
      <g transform={contentTransform}>
        {placements.map((placement, idx) => (
          <PartLayer
            key={`${placement.part.id}-${idx}`}
            placement={placement}
            accentOverride={accentOverride}
          />
        ))}
      </g>
    </svg>
  );
}

interface PartLayerProps {
  placement: PartPlacement;
  accentOverride?: string;
}

function PartLayer({ placement, accentOverride }: PartLayerProps) {
  const { part, y, accentColor } = placement;
  const { svg } = part;
  const accentFill = accentOverride ?? accentColor ?? svg.accentFill;
  const detailStroke = svg.detailStroke ?? DEFAULT_DETAIL_STROKE;

  return (
    <g transform={`translate(0, ${y})`} data-part-id={part.id} data-part-type={part.type}>
      <path d={svg.bodyPath} fill={`url(#${METAL_BODY_ID})`} />
      {svg.accentPath && accentFill ? (
        <path d={svg.accentPath} fill={accentFill} />
      ) : null}
      <path
        d={svg.detailPath}
        fill="none"
        stroke={detailStroke}
        strokeWidth={DEFAULT_DETAIL_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
