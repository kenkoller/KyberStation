// ─── Code Emitter ───
// Recursive pretty-printer that converts a StyleNode AST into ProffieOS C++ code.

import type { StyleNode, EmitOptions } from './types.js';

const DEFAULT_INDENT = 2;

// Templates that should receive inline comments when comments mode is on
const COMMENT_MAP: Record<string, string> = {
  BlastL: 'Blast Effect',
  SimpleClashL: 'Clash Effect',
  ResponsiveClashL: 'Clash Effect',
  LockupTrL: 'Lockup Layer',
  AudioFlickerL: 'Audio Flicker',
  InOutTrL: 'Ignition / Retraction',
  Layers: 'Layer Compositor',
  StylePtr: 'Style Definition',
  ResponsiveLightningBlockL: 'Lightning Block',
  TransitionEffectL: 'Transition Effect',
};

// Lockup type comment suffixes
const LOCKUP_COMMENTS: Record<string, string> = {
  'SaberBase::LOCKUP_NORMAL': 'Normal Lockup',
  'SaberBase::LOCKUP_DRAG': 'Drag Lockup',
  'SaberBase::LOCKUP_LIGHTNING_BLOCK': 'Lightning Block Lockup',
  'SaberBase::LOCKUP_MELT': 'Melt Lockup',
};

/**
 * Emit ProffieOS C++ code from a StyleNode AST.
 */
export function emitCode(ast: StyleNode, options?: EmitOptions): string {
  const opts: Required<EmitOptions> = {
    minified: options?.minified ?? false,
    comments: options?.comments ?? false,
    rgbArgWrappers: options?.rgbArgWrappers ?? false,
    indent: options?.indent ?? DEFAULT_INDENT,
  };

  if (opts.minified) {
    return emitMinified(ast);
  }

  return emitPretty(ast, 0, opts);
}

// ─── Minified Emitter ───

function emitMinified(node: StyleNode): string {
  if (node.type === 'raw') {
    return node.name;
  }

  // Bare integer values (no template wrapper)
  if (node.type === 'integer' && node.args.length === 0) {
    return node.name;
  }

  if (node.args.length === 0) {
    // No-arg templates like Rainbow, TrInstant, NoisySoundLevel
    return node.name;
  }

  // StylePtr wraps with ()
  if (node.name === 'StylePtr') {
    const inner = node.args.map((a) => emitMinified(a)).join(',');
    return `StylePtr<${inner}>()`;
  }

  const args = node.args.map((a) => emitMinified(a)).join(',');
  return `${node.name}<${args}>`;
}

// ─── Pretty Emitter ───

function emitPretty(
  node: StyleNode,
  depth: number,
  opts: Required<EmitOptions>,
): string {
  const indentStr = ' '.repeat(depth * opts.indent);
  const childIndent = ' '.repeat((depth + 1) * opts.indent);

  if (node.type === 'raw') {
    return node.name;
  }

  // Bare integer values
  if (node.type === 'integer' && node.args.length === 0) {
    return node.name;
  }

  // No-arg templates (Rainbow, TrInstant, NoisySoundLevel, BatteryLevel, etc.)
  if (node.args.length === 0) {
    return node.name;
  }

  // Decide if this node should be inlined (simple enough)
  if (shouldInline(node)) {
    return emitMinified(node);
  }

  // Build comment string
  let comment = '';
  if (opts.comments) {
    comment = getNodeComment(node);
    if (comment) {
      comment = ` // ${comment}`;
    }
  }

  // StylePtr special case: emit as StylePtr<\n  ...\n>()
  if (node.name === 'StylePtr') {
    const inner = node.args
      .map((a) => `${childIndent}${emitPretty(a, depth + 1, opts)}`)
      .join(',\n');
    return `StylePtr<${comment}\n${inner}\n${indentStr}>()`;
  }

  // Multi-arg template: emit on separate lines
  const args = node.args
    .map((a) => `${childIndent}${emitPretty(a, depth + 1, opts)}`)
    .join(',\n');
  return `${node.name}<${comment}\n${args}\n${indentStr}>`;
}

// ─── Inline Decision ───

function shouldInline(node: StyleNode): boolean {
  // Nodes with no children are always inline
  if (node.args.length === 0) return true;

  // Simple nodes with only leaf children (raw, bare int)
  const allLeaves = node.args.every(
    (a) =>
      (a.type === 'raw' && a.args.length === 0) ||
      (a.type === 'integer' && a.args.length === 0),
  );

  if (allLeaves && node.args.length <= 4) return true;

  // Rgb<r,g,b> is always inline
  if (node.name === 'Rgb' && node.args.length === 3) return true;

  // Int<n> is always inline
  if (node.name === 'Int' && node.args.length === 1) return true;

  // FireConfig is inline
  if (node.name === 'FireConfig') return true;

  // TrFade, TrWipe etc. with single int arg
  if (node.name.startsWith('Tr') && node.args.length === 1) return true;

  // SwingSpeed, Sin with single arg
  if (
    (node.name === 'SwingSpeed' || node.name === 'Sin') &&
    node.args.length === 1
  )
    return true;

  return false;
}

// ─── Comment Resolution ───

function getNodeComment(node: StyleNode): string {
  // Check for lockup type in args
  if (node.name === 'LockupTrL') {
    for (const arg of node.args) {
      if (arg.type === 'raw' && LOCKUP_COMMENTS[arg.name]) {
        return LOCKUP_COMMENTS[arg.name];
      }
    }
  }

  return COMMENT_MAP[node.name] ?? '';
}
