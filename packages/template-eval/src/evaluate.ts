// ─── Template Evaluator ───
// Takes a parsed TemplateNode tree and produces a runnable StyleTemplate
// by resolving names through the registry and instantiating classes.

import type { TemplateNode, StyleTemplate } from './types.js';
import { IntegerLiteral } from './BaseStyle.js';
import { getTemplate } from './registry.js';
import { parseTemplateString } from './parser.js';

/**
 * Recursively evaluate a TemplateNode tree into a runnable StyleTemplate.
 *
 * Resolution order:
 * 1. Integer literal nodes (name is a numeric string) → IntegerLiteral
 * 2. Registry lookup by name → instantiate with resolved child args
 * 3. Unknown name → throws with the unresolved template name
 */
export function evaluateTemplate(node: TemplateNode): StyleTemplate {
  if (/^-?\d+$/.test(node.name)) {
    return new IntegerLiteral(parseInt(node.name, 10));
  }

  const resolvedArgs = node.args.map((child) => evaluateTemplate(child));

  const entry = getTemplate(node.name);
  if (!entry) {
    throw new Error(`Unknown template: "${node.name}"`);
  }

  // Registry stores two shapes:
  // - Class constructors (from registerClass): have .prototype, call with `new`
  // - Arrow-function factories (from registerNamedColor): no .prototype, call directly
  if (entry.prototype !== undefined) {
    return new (entry as new (args: StyleTemplate[]) => StyleTemplate)(resolvedArgs);
  }

  return (entry as () => StyleTemplate)();
}

/**
 * Parse and evaluate a ProffieOS C++ template string in one call.
 *
 * @param input e.g. "Layers<Red, AudioFlicker<Blue, White>>"
 * @returns A StyleTemplate ready for run() + getColor() per-LED evaluation
 * @throws Error on parse failure or unknown template name
 */
export function evaluateTemplateString(input: string): StyleTemplate {
  const node = parseTemplateString(input);
  if (!node) {
    throw new Error(`Failed to parse template string: "${input}"`);
  }
  return evaluateTemplate(node);
}
